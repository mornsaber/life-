// Every era and country audit in one run: organisational units by year, rank badges against their
// titles, American words abroad, and the anachronism scan across many lives. Prints each tool's
// summary line, and exits non-zero if any audit run with --strict fails.
//
//   node tools/audit-all.mjs [--quick]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const quick = process.argv.includes('--quick');
const AUDITS = [
  ['Organisational units by year', 'orgunits.mjs', ['--strict']],
  ['Rank badges against titles', 'insignia-audit.mjs', []],
  ['Degree gates before 1900', 'degree-gates.mjs', ['--strict']],
  ['American words abroad', 'foreign-terms.mjs', quick ? ['GB:1960', 'DE:1990', 'IN:1990', '--strict'] : ['--strict']],
  ...(quick ? [] : [['Anachronisms across many lives', 'weirdness.mjs', []]]),
];
let failed = 0;
for (const [name, file, args] of AUDITS) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(here, file), ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const lines = (r.stdout ?? '').trim().split('\n');
  const summary = lines.filter((l) => /flags\.|jobs looked at|lives|issues/.test(l)).slice(-2).join(' · ') || lines.at(-1) || '';
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✔' : '✘'} ${name} (${((Date.now() - t0) / 1000).toFixed(0)}s): ${summary}`);
  if (!ok) console.log(lines.slice(0, 12).map((l) => `    ${l}`).join('\n'));
}
process.exit(failed ? 1 : 0);
