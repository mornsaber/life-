/**
 * A criminal record belongs to the country that convicted you; other countries see it only by
 * the real rules — EU sharing, the Five Eyes for serious crimes, Interpol for crimes that
 * travel — and the border asks about everything. Grades and names in each country's own words.
 *
 *   node tests/recordabroad.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store, addRecord, hasFelony, criminalRecord, visibleRecord } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { seenIn } from '../src/modules/legal/RecordAbroad.js';
import { gradeIn, offenseNameIn } from '../src/modules/legal/LocalLaw.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc = 'US') => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(1), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  state.character.age = 35;
  return { engine, state };
};
const convict = (state, offenseId, severity, country, age = 25) => addRecord(state, { offenseId, name: offenseId, severity, age, country, sentence: '' });
const moveTo = (state, cc) => { state.character.countryId = cc; };

const tests = {
  'a conviction is stamped with the country that handed it down'() {
    const { state } = life('DE');
    const r = addRecord(state, { offenseId: 'burglary', name: 'x', severity: 'felony', age: 30 });
    assert.equal(r.country, 'DE');
  },
  'at home it counts; abroad, a burglary does not follow you to France'() {
    const { state } = life('US');
    convict(state, 'burglary', 'felony', 'US');
    assert.ok(hasFelony(state));
    moveTo(state, 'FR');
    assert.ok(!hasFelony(state), 'a French employer doesn\'t see it');
    assert.ok(hasFelony(state, { purpose: 'border' }), 'but the visa application asks');
  },
  'serious convictions travel between the Five Eyes'() {
    const { state } = life('US');
    convict(state, 'burglary', 'felony', 'US');
    moveTo(state, 'GB');
    assert.ok(hasFelony(state));
  },
  'the EU shares records among its members'() {
    const { state } = life('DE');
    convict(state, 'shoplifting', 'misdemeanor', 'DE');
    moveTo(state, 'FR');
    assert.equal(criminalRecord(state).length, 1);
    moveTo(state, 'JP');
    assert.equal(criminalRecord(state).length, 0);
  },
  'violent and sexual crimes travel everywhere (Interpol)'() {
    const { state } = life('BR');
    convict(state, 'armedRobbery', 'felony', 'BR');
    moveTo(state, 'JP');
    assert.ok(hasFelony(state));
  },
  'political crimes and crimes of their day never count abroad'() {
    const { state } = life('KP');
    convict(state, 'antiState', 'felony', 'KP');
    convict(state, 'illegalWorship', 'felony', 'KP');
    moveTo(state, 'KR');
    assert.equal(visibleRecord(state).length, 0);
    assert.equal(visibleRecord(state, { purpose: 'border' }).length, 0);
    const { state: s2 } = life('GB');
    convict(s2, 'grossIndecency', 'felony', 'GB');
    moveTo(s2, 'CA');
    assert.ok(!hasFelony(s2));
  },
  'what isn\'t a crime here doesn\'t count here'() {
    const { state } = life('US');
    convict(state, 'drugPossession', 'misdemeanor', 'US');
    assert.ok(!seenIn(state, state.legal.record[0], 'PT', 'border'), 'Portugal decriminalised possession');
  },
  'tickets stay where they were; minor convictions fall off the border form after ten years'() {
    const { state } = life('US');
    convict(state, 'speeding', 'infraction', 'US');
    convict(state, 'shoplifting', 'misdemeanor', 'US', 20);
    moveTo(state, 'CA');
    assert.equal(visibleRecord(state, { purpose: 'border' }).length, 0, 'a speeding ticket and a fifteen-year-old shoplifting');
  },
  'each country\'s own words'() {
    assert.equal(gradeIn('US', 'felony'), 'Felony');
    assert.equal(gradeIn('GB', 'misdemeanor'), 'Summary offence');
    assert.equal(gradeIn('FR', 'misdemeanor'), 'Délit');
    assert.equal(gradeIn('DE', 'felony'), 'Verbrechen');
    assert.equal(offenseNameIn('dui', 'GB'), 'Drink-Driving');
    assert.equal(offenseNameIn('mailTheft', 'FR'), 'Theft of Mail');
    assert.equal(offenseNameIn('mailTheft', 'US'), 'Theft of Mail (18 U.S.C. § 1708)');
  },
  'the record view says where each conviction is from and whether it counts here'() {
    const { state } = life('US');
    convict(state, 'burglary', 'felony', 'US');
    moveTo(state, 'FR');
    const h = VIEWS.legal(state, {});
    assert.match(h, /Not on your record here/);
    assert.match(h, /Felony/, 'graded as the US court graded it');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
}
if (failed) process.exit(1);
