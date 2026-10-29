/**
 * Runs several test files in one process so the game's modules load once (tests/run.js).
 * Each file's output is collected separately; a file that exits non-zero or throws is
 * reported as failed (run.js then re-runs it on its own, in case another file leaked state).
 *
 *   node tests/_batch.js a b c   → one JSON line per file: { name, code, ms, out }
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const names = args.filter((a) => !a.startsWith('--'));
/** Files that reload a life keep real saves. */
const needsSaves = new Set((args.find((a) => a.startsWith('--saves='))?.slice(8) ?? '').split(',').filter(Boolean));
const emit = process.stdout.write.bind(process.stdout);
const realExit = process.exit;
const realArgv = process.argv;
class Exit { constructor(code) { this.code = code; } }

for (const name of names) {
  let out = '';
  const capture = (...a) => { out += `${a.map((x) => (typeof x === 'string' ? x : String(x))).join(' ')}\n`; };
  const saved = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  Object.assign(console, { log: capture, error: capture, warn: capture, info: capture });
  process.exit = (code = 0) => { throw new Exit(code); };
  process.argv = [realArgv[0], join(here, `${name}.js`)];
  process.exitCode = undefined;
  process.env.LIFE_SKIP_SAVES = needsSaves.has(name) ? '0' : '1';
  const t0 = Date.now();
  let code = 0;
  try {
    await import(pathToFileURL(join(here, `${name}.js`)).href);
    code = process.exitCode ?? 0;
  } catch (e) {
    code = e instanceof Exit ? e.code : 1;
    if (!(e instanceof Exit)) out += `${e?.stack ?? e}\n`;
  }
  Object.assign(console, saved);
  process.exit = realExit;
  process.exitCode = undefined;
  emit(`${JSON.stringify({ name, code, ms: Date.now() - t0, out })}\n`);
}
process.argv = realArgv;
realExit(0);
