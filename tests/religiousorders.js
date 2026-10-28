/**
 * Religious orders (Jesuits, Opus Dei, Missionaries of Charity), the sovereign's guards and the
 * Spanish Legion.
 *
 *   node tests/religiousorders.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { enlist } from '../src/modules/military/MilitaryEngine.js';
import { layoffRisk } from '../src/modules/career/CareerEngine.js';
import { JOB_FIELDS } from '../src/modules/career/JobTrees.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
  state.legal.record = [];
  state.character.age = 22;
  state.prompts = [];
  state.people.list = state.people.list.filter((p) => p.relation !== 'spouse');
  return { engine, state, ctx: engine.context() };
}
const catholic = (state) => { state.community.faith = { traditionId: 'catholic', congregation: 'St Mary\'s', attendance: 'devout', devoutYears: 3, joinedAge: 0, raised: true }; };
const always = (engine, fn) => { const c = engine.rng.chance; engine.rng.chance = () => true; try { return fn(); } finally { engine.rng.chance = c; } };
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) {
      const q = state.prompts[0];
      const pick = q.options.find((o) => ['profess', 'school', 'dying', 'work'].includes(o.id)) ?? q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0];
      engine.resolvePrompt(q.id, pick.id);
    }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
};

const tests = {
  'a Jesuit goes from novice to priest to final vows, housed and fed'() {
    const { engine, state } = life({ gender: 'male' }, 3);
    catholic(state);
    always(engine, () => engine.dispatch('religiousOrders.enter', 'jesuits'));
    const r = state.community.religious;
    assert.equal(r?.stage, 'novice');
    assert.match(VIEWS.community(state, {}), /Society of Jesus/);
    year(engine, state, 15);
    assert.equal(state.community.religious.vows, 'final');
    assert.equal(state.community.orders?.grade, 'priest');
    assert.equal(state.community.orders?.diocese, 'Society of Jesus');
    assert.ok(state.community.religious.apostolate, 'a mission');
  },
  'a Jesuit\'s career is the Society: novice to priest to provincial, unpaid, never laid off'() {
    const { engine, state } = life({ gender: 'male' }, 5);
    catholic(state);
    state.career.job = null;
    const c = engine.rng.chance; engine.rng.chance = () => true; engine.dispatch('religiousOrders.enter', 'jesuits'); engine.rng.chance = c;
    assert.equal(state.career.job?.professionId, 'jesuits');
    assert.equal(state.career.job.levelId, 'novice');
    assert.equal(state.career.job.salary, 0);
    assert.equal(layoffRisk({ ...state, economy: { ...state.economy, phase: 'recession' } }, state.career.job), 0);
    year(engine, state, 15);
    assert.equal(state.career.job?.professionId, 'jesuits', 'still a Jesuit, not diocesan clergy');
    assert.ok(['professed', 'rector', 'provincial', 'general'].includes(state.career.job.levelId), state.career.job.levelId);
    assert.ok(!state.career.history.some((h) => /Laid off/.test(h.reason ?? '')));
  },
  'diocesan priests and curates are never laid off; seminarians of big faiths rarely'() {
    const { state } = life({}, 6);
    const job = (professionId, levelId) => ({ professionId, levelId, abilities: [], sector: 'private', performance: 60, yearsAtEmployer: 3 });
    const rec = { ...state, economy: { ...state.economy, phase: 'recession' } };
    assert.equal(layoffRisk(rec, job('catholicClergy', 'vicar')), 0);
    assert.equal(layoffRisk(rec, job('anglicanClergy', 'curate')), 0);
    rec.community = { faith: { traditionId: 'baptist' } };
    assert.ok(layoffRisk(rec, job('clergy', 'seminarian')) < 0.01);
    assert.ok(JOB_FIELDS.holySee.ids.includes('catholicClergy') && JOB_FIELDS.holySee.ids.includes('jesuits'), 'one Faith & the Church field');
  },
  'a Missionary of Charity takes final vows and gives everything away'() {
    const { engine, state } = life({ gender: 'female' }, 4);
    catholic(state);
    state.finances.cash = 5000;
    always(engine, () => engine.dispatch('religiousOrders.enter', 'moc'));
    year(engine, state, 11);
    assert.equal(state.community.religious.vows, 'final');
    assert.ok(state.finances.cash <= 0 || state.finances.cash < 5000);
  },
  'Opus Dei numeraries keep their jobs; men cannot join the sisters'() {
    const { engine, state } = life({ gender: 'male' }, 5);
    catholic(state);
    state.prompts = [];
    engine.dispatch('religiousOrders.enter', 'moc');
    assert.ok(!state.community.religious);
    always(engine, () => engine.dispatch('religiousOrders.enter', 'opusDei:numerary'));
    assert.equal(state.community.religious.kind, 'numerary');
    engine.dispatch('religiousOrders.leave');
    assert.ok(state.community.religious.left);
  },
  'a British soldier volunteers for the Household Division; a Spanish one for the Legion'() {
    for (const [cc, action, key] of [['GB', 'royalGuards.apply', 'royalGuard'], ['ES', 'royalGuards.tercio', 'spanishLegion']]) {
      const { engine, state, ctx } = life({ countryId: cc, gender: 'male' }, 6);
      state.stats.fitness = 80;
      enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' });
      state.military.service.yearsOfService = 2;
      state.prompts = [];
      always(engine, () => engine.dispatch(action));
      assert.ok(state.military.service[key], `${cc} ${key}`);
      assert.match(VIEWS.military(state, {}), /Guards and the Legion/);
      year(engine, state, 2);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} religious orders test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} religious orders tests passed`);
