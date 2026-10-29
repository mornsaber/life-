/**
 * Runs the test files in parallel. Prints only failures and a one-line summary.
 *
 *   node tests/run.js              every file (the long fuzzers too)
 *   node tests/run.js --fast       skip the long fuzzers and simulations (for every push)
 *   node tests/run.js --long       only the long ones (for the scheduled run)
 *   node tests/run.js --changed    only the tests that reach files changed since HEAD
 *                                  (--changed=<ref> to compare with another commit)
 *   node tests/run.js a b          just these files (names without .js)
 *   --verbose                      also one line per passing file, with its time
 *   --list                         print the selected files and stop
 *
 * Saves are skipped (LIFE_SKIP_SAVES) except in the files that reload a life.
 * Files run slowest-first, using the timings of the last run (tests/.timings.json).
 */
import { spawn, execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
/** Fuzzers and long simulations: minutes each. */
export const LONG = ['abroad', 'milfuzz', 'milabroad', 'bizfuzz', 'orgfuzz', 'simulate', 'balance', 'clicker', 'content', 'countries', 'packs', 'nations', 'business', 'engines'];
/** Files that save and reload a life: they need real saves. */
const NEEDS_SAVES = ['clicker', 'countries', 'holysee', 'orgfuzz', 'saves', 'scenarios', 'simulate'];
/** Files nearly everything imports: a change to one of them runs every fast test. */
const HUBS = ['src/core/Engine.js', 'src/core/State.js', 'src/core/Random.js', 'src/modules/registry.js', 'src/ui/Renderer.js', 'src/ui/Components.js'];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')).map((a) => a.split('=')[0]));
const flagValue = (f) => args.find((a) => a.startsWith(`${f}=`))?.split('=')[1];
const named = args.filter((a) => !a.startsWith('--'));
const all = readdirSync(here).filter((f) => f.endsWith('.js') && !['run.js', 'usTerms.js'].includes(f) && !f.startsWith('_')).map((f) => f.slice(0, -3)).sort();

/* ---- --changed: which tests reach the changed files ---- */
const importsOf = (file) => {
  try {
    const src = readFileSync(join(root, file), 'utf8');
    return [...src.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)].map((m) => relative(root, resolve(dirname(join(root, file)), m[1])));
  } catch { return []; }
};
function changedTests() {
  const ref = flagValue('--changed') ?? 'HEAD';
  const out = execSync(`git diff --name-only ${ref} -- . && git ls-files --others --exclude-standard`, { cwd: root }).toString();
  const changed = [...new Set(out.split('\n').filter((f) => f.endsWith('.js')))];
  if (changed.some((f) => HUBS.includes(f))) return all.filter((f) => !LONG.includes(f));
  // Who imports whom, across src/.
  const importers = {};
  const walk = (dir) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (p.endsWith('.js')) for (const i of importsOf(p)) (importers[i] ??= []).push(p);
    }
  };
  walk('src');
  const direct = Object.fromEntries(all.map((t) => [t, new Set(importsOf(`tests/${t}.js`))]));
  const picked = new Set(changed.filter((f) => f.startsWith('tests/')).map((f) => f.slice(6, -3)).filter((t) => all.includes(t)));
  for (const f of changed.filter((x) => x.startsWith('src/'))) {
    // Climb from the changed file through its importers (not the hubs) to files the tests import by name.
    let frontier = [f];
    const seen = new Set(frontier);
    for (let depth = 0; depth < 3 && frontier.length; depth++) {
      const hits = all.filter((t) => frontier.some((x) => direct[t].has(x)));
      hits.forEach((t) => picked.add(t));
      if (hits.length && depth > 0) break;
      frontier = frontier.flatMap((x) => importers[x] ?? []).filter((x) => !HUBS.includes(x) && !seen.has(x) && seen.add(x));
    }
  }
  // Long fuzzers only when named; the career audit catches most wiring slips.
  const fast = [...picked].filter((t) => !LONG.includes(t));
  return fast.length || changed.length ? [...new Set([...fast, 'careers'])].filter((t) => all.includes(t)) : [];
}

const files = named.length ? named
  : flags.has('--changed') ? changedTests()
    : all.filter((f) => (flags.has('--fast') ? !LONG.includes(f) : flags.has('--long') ? LONG.includes(f) : true));
if (flags.has('--list')) { console.log(files.join(' ')); process.exit(0); }
if (!files.length) { console.log('No tests reach the changed files.'); process.exit(0); }

const timingsFile = join(here, '.timings.json');
const timings = (() => { try { return existsSync(timingsFile) ? JSON.parse(readFileSync(timingsFile, 'utf8')) : {}; } catch { return {}; } })();
const jobs = Math.max(1, Math.min(files.length, cpus().length));

function run(name) {
  return new Promise((done) => {
    const t0 = Date.now();
    const env = { ...process.env, ...(NEEDS_SAVES.includes(name) ? {} : { LIFE_SKIP_SAVES: '1' }) };
    const child = spawn(process.execPath, [join(here, `${name}.js`)], { stdio: ['ignore', 'pipe', 'pipe'], env });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => done({ name, code, ms: Date.now() - t0, out }));
  });
}

/** Several files in one process (tests/_batch.js): the game loads once per batch. */
function runBatch(names) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [join(here, '_batch.js'), `--saves=${NEEDS_SAVES.join(',')}`, ...names], { stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    let err = '';
    child.stdout.on('data', (d) => { buf += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', () => {
      const got = buf.split('\n').filter((l) => l.startsWith('{')).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      // A batch that died mid-way: the files it never reported count as failed (and are retried alone).
      for (const n of names) if (!got.some((g) => g.name === n)) got.push({ name: n, code: 1, ms: 0, out: err || 'batch process died' });
      done(got);
    });
  });
}

const t0 = Date.now();
let retried = 0;
const results = [];
const report = (r) => {
  results.push(r);
  timings[r.name] = r.ms;
  if (flags.has('--verbose') || r.code) console.log(`${r.code ? '✘' : '✔'} ${r.name.padEnd(16)} ${(r.ms / 1000).toFixed(1).padStart(6)}s`);
};
const ordered = [...files].sort((a, b) => (timings[b] ?? 1000) - (timings[a] ?? 1000));
if (flags.has('--isolated')) {
  const queue = [...ordered];
  await Promise.all(Array.from({ length: jobs }, async () => { while (queue.length) report(await run(queue.shift())); }));
} else {
  // Balance the files across one batch per core, slowest first.
  const batches = Array.from({ length: jobs }, () => ({ ms: 0, names: [] }));
  for (const f of ordered) { const b = batches.reduce((x, y) => (y.ms < x.ms ? y : x)); b.names.push(f); b.ms += timings[f] ?? 1000; }
  const queue = [...batches];
  const firstPass = [];
  await Promise.all(Array.from({ length: jobs }, async () => { while (queue.length) { const b = queue.shift(); firstPass.push(...await runBatch(b.names)); } }));
  // Anything that failed alongside other files is re-run on its own before it's called a failure.
  const retry = firstPass.filter((r) => r.code);
  for (const r of firstPass.filter((x) => !x.code)) report(r);
  const rq = retry.map((r) => r.name);
  retried = rq.length;
  await Promise.all(Array.from({ length: Math.min(jobs, rq.length) }, async () => { while (rq.length) report(await run(rq.shift())); }));
}
try { writeFileSync(timingsFile, JSON.stringify(timings)); } catch { /* read-only checkout */ }
const failed = results.filter((r) => r.code);
// Failures: only the failing checks and their first stack line.
for (const r of failed) {
  const lines = r.out.trim().split('\n');
  const keep = lines.filter((l, i) => /✘|Error|assert/i.test(l) || /✘|Error/.test(lines[i - 1] ?? '')).slice(0, 20);
  console.log(`\n── ${r.name} ──\n${(keep.length ? keep : lines.slice(-12)).join('\n')}`);
}
const slowest = [...results].sort((a, b) => b.ms - a.ms)[0];
console.log(`${failed.length ? '✘' : '✔'} ${results.length - failed.length}/${results.length} passed in ${((Date.now() - t0) / 1000).toFixed(1)}s${retried ? `, ${retried} re-run alone` : ''}${slowest ? ` (slowest ${slowest.name} ${(slowest.ms / 1000).toFixed(1)}s)` : ''}`);
process.exit(failed.length ? 1 : 0);
