/**
 * Politics under colonial rule and in the SARs: councils by date, who may stand, nominations,
 * seats, the Chief Minister, and colonial parties that were legal unless banned.
 *
 *   node tests/colonypolitics.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { polityHere, standCheck } from '../src/modules/politics/ColonialPolitics.js';
import { partySystem } from '../src/modules/politics/PartySystem.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, born, years = 35) => {
  for (let seed = 1; seed < 12; seed++) {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
    const state = engine.newLife({ countryId: cc, startYear: born });
    for (let i = 0; i < years && state.character.alive; i++) { engine.autoResolve(); state.prompts = []; state.stats.health = 100; engine.ageUp(); }
    engine.autoResolve(); state.prompts = [];
    if (state.character.alive && state.character.countryId === cc) return { engine, state };
  }
  throw new Error(`no living ${cc} life`);
};

const tests = {
  'the councils follow the dates'() {
    const at = (cc, born, years) => polityHere(life(cc, born, years).state);
    const hk = at('HK', 1920, 30); // 1950
    assert.equal(hk.council, 'Legislative Council'); assert.equal(hk.vote, 'none'); assert.equal(hk.municipal, 'Urban Council');
    const sg = at('SG', 1920, 36); // 1956
    assert.equal(sg.leader, 'Chief Minister'); assert.equal(sg.vote, 'universal');
    const ke = at('KE', 1900, 30); // 1930
    assert.equal(ke.vote, 'settlers');
  },
  'a Kenyan African cannot stand for the settlers\' council'() {
    const { state } = life('KE', 1900, 30);
    if (!state.character.citizenships?.includes('GB')) assert.match(standCheck(state, 'council'), /Only British/);
  },
  'standing for the Urban Council, and winning or losing at the poll'() {
    const { engine, state } = life('HK', 1930, 30); // 1960
    state.finances.cash = 500000;
    engine.dispatch('colonyPolitics.stand', 'municipal');
    assert.ok(state.colonyPolitics.candidacy, JSON.stringify(state.log.at(-1)));
    engine.ageUp(); engine.autoResolve();
    assert.ok(!state.colonyPolitics.candidacy);
    assert.ok(state.colonyPolitics.seats.municipal || state.colonyPolitics.recognition > 0);
    assert.match(VIEWS.campaign(state, {}), /Councils and Elections/);
  },
  'accepting a nomination seats you, and Council business follows'() {
    const { engine, state } = life('HK', 1920, 40); // 1960
    state.prompts.push({ id: 'n1', type: 'colonyPolitics.nominate', options: [{ id: 'accept' }, { id: 'decline' }] });
    engine.resolvePrompt('n1', 'accept');
    assert.equal(state.colonyPolitics.seats.council?.how, 'nominated');
    engine.dispatch('colonyPolitics.question');
    engine.dispatch('colonyPolitics.debate');
    const p = state.prompts.find((x) => x.type === 'colonyPolitics.debate');
    assert.ok(p); engine.resolvePrompt(p.id, 'local');
    assert.match(VIEWS.politics(state, {}), /Ask a question in Council/);
  },
  'colonial parties are legal unless banned'() {
    life('IN', 1898, 30); // 1928: the era regime is a colony
    const legal = Object.fromEntries(partySystem('IN', 1928).parties.map((p) => [p.id, p.status]));
    assert.equal(legal.inc, 'legal');
    life('IN', 1903, 30); // 1933: Congress banned in the Civil Disobedience
    assert.equal(Object.fromEntries(partySystem('IN', 1933).parties.map((p) => [p.id, p.status])).inc, 'banned');
    assert.ok(!partySystem('IN', 1950).parties.some((p) => /\(Marxist\)/.test(p.name)), 'no CPI(M) before 1964');
  },
  'Hong Kong\'s chamber has its own parties'() {
    const names = partySystem('HK', 2010).parties.map((p) => p.name).join(' ');
    assert.match(names, /DAB/); assert.doesNotMatch(names, /National Front|Green Party/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`); }
}
process.exit(failed ? 1 : 0);
