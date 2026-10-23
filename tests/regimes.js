/**
 * Regimes, sanctions and travel: North Korea's closed state, the one-party states'
 * ruling parties, the Taliban's edicts, sanctions, and holidays on your passports.
 *
 *   node tests/regimes.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { regimeOf, sanctionsOn, exitBlock, businessBlock, creditBlock, studyBlock, workBlock } from '../src/modules/world/Regimes.js';
import { partyHere, rankTitle } from '../src/modules/politics/CommunistParty.js';
import { entryWith, bestEntry, travelBlock, tripCost } from '../src/modules/world/Travel.js';
import { departureBlock } from '../src/modules/world/Migration.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { OFFICES } from '../src/modules/politics/Offices.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'KP', ...opts });
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
  state.prompts = [];
};
const logText = (state) => state.log.flatMap((y) => y.entries.map((e) => e.text)).join('\n');

const tests = {
  'North Korea: closed borders, no business, no credit, a songbun and an assigned job'() {
    const { engine, state } = life({}, 11);
    year(engine, state, 20);
    assert.ok(['core', 'wavering', 'hostile'].includes(state.regime.songbun));
    assert.match(exitBlock(state), /Defecting/);
    assert.match(departureBlock(state), /Defecting/);
    assert.ok(businessBlock(state));
    assert.ok(creditBlock(state));
    assert.match(studyBlock(state, 'CN'), /study abroad/);
    state.education.enrolled = null;
    state.career.job = null;
    state.military.service = null;
    year(engine, state, 1);
    assert.ok(state.career.job, 'the state assigned a workplace');
    assert.equal(sanctionsOn('KP').level, 3);
    assert.equal(regimeOf('KP').ratings, false);
  },
  'North Korea: no contested elections, no "your side won"'() {
    const { engine, state } = life({}, 3);
    year(engine, state, 40);
    const text = logText(state);
    assert.doesNotMatch(text, /Your side won|credit rating|tax rebate/i);
  },
  'defecting: success makes you a South Korean citizen in Seoul'() {
    const { engine, state } = life({}, 9);
    year(engine, state, 20);
    state.finances.cash = 20000;
    engine.dispatch('regime.defect');
    const p = state.prompts.find((x) => x.type === 'regime.defect');
    assert.ok(p);
    const rng = engine.context().rng;
    const chance = rng.chance;
    rng.chance = () => true;
    engine.resolvePrompt(p.id, 'broker');
    rng.chance = chance;
    assert.equal(state.character.countryId, 'KR');
    assert.ok(state.character.citizenships.includes('KR'));
  },
  'the Workers\' Party and the Communist Party of Vietnam use their own names'() {
    const kp = life({}, 2).state;
    assert.match(partyHere(kp).name, /Workers' Party of Korea/);
    assert.match(rankTitle(kp, 9), /Workers' Party of Korea/);
    const vn = life({ countryId: 'VN' }, 2).state;
    assert.match(partyHere(vn).name, /Vietnam/);
    assert.ok(OFFICES.kp_president && OFFICES.vn_president);
    assert.equal(partyHere(life({ countryId: 'GB' }).state), null);
  },
  'Afghanistan: girls\' schooling ends at twelve; most work is closed to women'() {
    const { engine, state } = life({ countryId: 'AF', gender: 'female' }, 4);
    state.character.gender = 'female';
    year(engine, state, 13);
    assert.ok(state.k12?.dropout || !state.k12, 'secondary school closed');
    assert.ok(workBlock(state, getProfession('retail')));
    assert.equal(workBlock(state, getProfession('nursing') ?? { id: 'nursing' }), null);
    assert.match(studyBlock(state), /barred/);
  },
  'passports decide entry: free movement, ETAs, visas, bans'() {
    assert.equal(entryWith('FR', 'DE').kind, 'free');
    assert.equal(entryWith('GB', 'IE').kind, 'free');
    assert.equal(entryWith('GB', 'US').kind, 'eta');
    assert.equal(entryWith('NG', 'GB').kind, 'visa');
    assert.ok(entryWith('NG', 'GB').refusal > entryWith('BR', 'US').refusal);
    assert.equal(entryWith('IR', 'US').kind, 'barred');
    assert.equal(entryWith('IL', 'MY').kind, 'barred');
    assert.equal(entryWith('US', 'KP').kind, 'barred');
    assert.equal(entryWith('RU', 'KP').kind, 'tour');
    assert.equal(entryWith('GB', 'KP').kind, 'closed');
    assert.equal(entryWith('GB', 'CN').kind, 'evisa');
  },
  'dual citizens travel on the better passport'() {
    const { state } = life({ countryId: 'NG' }, 1);
    state.character.age = 30;
    assert.equal(bestEntry(state, 'GB').kind, 'visa');
    state.character.citizenships = ['NG', 'IE'];
    assert.equal(bestEntry(state, 'GB').kind, 'free');
    assert.equal(bestEntry(state, 'GB').passport, 'IE');
  },
  'North Koreans can\'t take holidays; sanctioned officials can\'t visit the West'() {
    const kp = life({}, 1).state;
    kp.character.age = 30;
    assert.match(travelBlock(kp, 'CN'), /leave/);
    const ru = life({ countryId: 'RU' }, 1).state;
    ru.character.age = 50;
    assert.equal(travelBlock(ru, 'TR'), null);
    ru.regime.sanctioned = { by: 'the EU', travelBan: true };
    assert.match(travelBlock(ru, 'FR'), /sanctions/);
    assert.equal(travelBlock(ru, 'TR'), null);
    assert.ok(tripCost(ru, 'TR', 'standard') > tripCost(life({ countryId: 'RO' }, 1).state, 'TR', 'standard'), 'sanctions detours cost more');
  },
  'a criminal record keeps you out of Canada'() {
    const { state } = life({ countryId: 'GB' }, 1);
    state.character.age = 30;
    assert.equal(travelBlock(state, 'CA'), null);
    state.legal.record = [{ severity: 'misdemeanor', offenseId: 'dui', age: 25 }];
    assert.match(travelBlock(state, 'CA') ?? '', /Canada/);
  },
  'a holiday abroad: pay, travel, log, count the country'() {
    const { engine, state } = life({ countryId: 'GB' }, 8);
    year(engine, state, 25);
    state.finances.cash = 50000;
    engine.dispatch('travel.plan', 'JP');
    const p = state.prompts.find((x) => x.type === 'travel.trip');
    assert.ok(p);
    engine.resolvePrompt(p.id, 'standard');
    assert.ok(state.travel.countries.includes('JP'));
    assert.match(logText(state), /Japan/);
  },
  'views render for regimes and travel'() {
    for (const cc of ['KP', 'CN', 'AF', 'RU', 'SA', 'MM', 'GB']) {
      const { engine, state } = life({ countryId: cc }, 6);
      year(engine, state, 20);
      for (const [k, v] of Object.entries(VIEWS)) v(state, {}), k;
    }
    const { engine, state } = life({}, 6);
    year(engine, state, 20);
    const html = VIEWS.move(state, {});
    assert.match(html, /Life in North Korea/);
    assert.match(html, /Defect/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`ok - ${name}`); } catch (e) { failed++; console.log(`not ok - ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) { console.log(`${failed} failed`); process.exit(1); }
