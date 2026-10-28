/**
 * Runs the test files in parallel and reports each one's time.
 *
 *   node tests/run.js            every file (the long fuzzers too)
 *   node tests/run.js --fast     skip the long fuzzers and simulations (for every push)
 *   node tests/run.js --long     only the long ones (for the scheduled run)
 *   node tests/run.js a b        just these files (names without .js)
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** Fuzzers and long simulations: minutes each. */
export const LONG = ['abroad', 'milfuzz', 'milabroad', 'bizfuzz', 'orgfuzz', 'simulate', 'balance', 'clicker', 'content', 'countries', 'packs', 'nations'];
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const named = args.filter((a) => !a.startsWith('--'));
const all = readdirSync(here).filter((f) => f.endsWith('.js') && f !== 'run.js').map((f) => f.slice(0, -3)).sort();
const files = named.length ? named : all.filter((f) => (flags.has('--fast') ? !LONG.includes(f) : flags.has('--long') ? LONG.includes(f) : true));
const jobs = Math.max(1, Math.min(files.length, cpus().length));

function run(name) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [join(here, `${name}.js`)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ name, code, ms: Date.now() - t0, out }));
  });
}

const queue = [...files];
const results = [];
await Promise.all(Array.from({ length: jobs }, async () => {
  while (queue.length) {
    const r = await run(queue.shift());
    results.push(r);
    const last = r.out.trim().split('\n').at(-1) ?? '';
    console.log(`${r.code ? '✘' : '✔'} ${r.name.padEnd(16)} ${(r.ms / 1000).toFixed(1).padStart(6)}s  ${r.code ? '' : last.slice(0, 90)}`);
  }
}));
const failed = results.filter((r) => r.code);
for (const r of failed) console.log(`\n── ${r.name} ──\n${r.out.trim().split('\n').slice(-25).join('\n')}`);
console.log(`\n${failed.length ? '✘' : '✔'} ${results.length - failed.length}/${results.length} test files passed`);
process.exit(failed.length ? 1 : 0);
