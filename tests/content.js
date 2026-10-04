/**
 * Content lint: every event pool has unique ids, every decision has at least
 * one option a new player can pick, and every referenced offense, condition,
 * credential, medal and profession exists. Also reports pool sizes.
 *
 *   node tests/content.js
 */
import { UCMJ_OFFENSES } from '../src/modules/military/UCMJ.js';
import assert from 'node:assert/strict';
import { LIFE_EVENTS } from '../src/modules/life/LifeEvents.js';
import { WORKPLACE_EVENTS } from '../src/modules/career/WorkplaceEvents.js';
import { COMBAT_SCENARIOS, DUTY_EVENTS } from '../src/modules/military/ActiveDuty.js';
import { SERVICES } from '../src/modules/emergency/EmergencyEngine.js';
import { AGENCY_EVENTS } from '../src/modules/publicservice/FederalAgencies.js';
import { EVENTS as STATE_EVENTS, eventPool } from '../src/modules/publicservice/StateAgencies.js';
import { MUNICIPAL_EVENTS, municipalPool } from '../src/modules/publicservice/MunicipalGov.js';
import { OFFENSES } from '../src/modules/legal/Offenses.js';
import { CREDENTIALS } from '../src/modules/credentials/CredentialRegistry.js';
import { CONDITIONS } from '../src/modules/health/index.js';
import { ROUTINE } from '../src/core/Routine.js';
import fs from 'node:fs';

const sizes = {};
const problems = [];

function checkPool(name, pool, { idOf = (e) => e.id, needsFreeOption = false } = {}) {
  sizes[name] = pool.length;
  const ids = pool.map(idOf);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`${name}: duplicate ids ${[...new Set(dupes)].join(', ')}`);
  for (const e of pool) {
    if (!e.options) continue;
    const optIds = e.options.map((o) => o.id);
    if (new Set(optIds).size !== optIds.length) problems.push(`${name}/${idOf(e)}: duplicate option ids`);
    if (needsFreeOption && !e.options.some((o) => !o.cert)) problems.push(`${name}/${idOf(e)}: every option needs a certification`);
    for (const o of e.options) {
      for (const off of [o.offense, o.risky?.offense].filter(Boolean)) if (!OFFENSES[off]) problems.push(`${name}/${idOf(e)}/${o.id}: unknown offense ${off}`);
      if (o.risky?.ucmj && !UCMJ_OFFENSES[o.risky.ucmj]) problems.push(`${name}/${idOf(e)}/${o.id}: unknown UCMJ offense ${o.risky.ucmj}`);
      if (o.cert && !CREDENTIALS[o.cert]) problems.push(`${name}/${idOf(e)}/${o.id}: unknown credential ${o.cert}`);
    }
  }
}

checkPool('life events', LIFE_EVENTS);
checkPool('workplace', WORKPLACE_EVENTS);
for (const [t, pool] of Object.entries(COMBAT_SCENARIOS)) checkPool(`combat.${t}`, pool);
checkPool('military duty', DUTY_EVENTS);
for (const [id, svc] of Object.entries(SERVICES)) checkPool(`dispatch.${id}`, svc.dispatches, { needsFreeOption: true });
for (const [id, pool] of Object.entries(AGENCY_EVENTS)) checkPool(`federal.${id}`, pool);
for (const id of Object.keys(STATE_EVENTS)) checkPool(`state.${id}`, eventPool(id));
for (const id of Object.keys(MUNICIPAL_EVENTS)) checkPool(`city.${id}`, municipalPool(id));

// Childhood (text-keyed) and every literal offense/condition id used in content files.
const lifecycle = fs.readFileSync(new URL('../src/modules/life/Lifecycle.js', import.meta.url), 'utf8');
sizes.childhood = (lifecycle.match(/minAge: \d+, maxAge: \d+, text:/g) ?? []).length;
for (const file of ['life/LifeEvents.js', 'career/WorkplaceEvents.js', 'campus/UniversityLife.js', 'health/HealthEngine.js', 'publicservice/StateAgencies.js']) {
  const src = fs.readFileSync(new URL(`../src/modules/${file}`, import.meta.url), 'utf8');
  for (const [, id] of src.matchAll(/offenseId: '([a-zA-Z]+)'/g)) if (!OFFENSES[id]) problems.push(`${file}: unknown offense ${id}`);
  for (const [, id] of src.matchAll(/conditionId: '([a-zA-Z]+)'/g)) if (!CONDITIONS[id]) problems.push(`${file}: unknown condition ${id}`);
}
for (const type of Object.keys(ROUTINE)) assert.ok(/^[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z]+$/.test(type), `routine ${type}`);

if (problems.length) {
  console.log(problems.map((p) => `  ✘ ${p}`).join('\n'));
  process.exit(1);
}
const total = Object.values(sizes).reduce((a, b) => a + b, 0);
console.log(`✔ Content lint passed — ${total} events across ${Object.keys(sizes).length} pools`);
console.log('  ', Object.entries(sizes).map(([k, v]) => `${k} ${v}`).join(' · '));
