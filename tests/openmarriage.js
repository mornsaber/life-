/**
 * Open marriages, their affairs, and the law: adultery as a crime and divorce on grounds.
 *
 *   node tests/openmarriage.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { OpenMarriageModule, openWith, acceptOdds, markFault } from '../src/modules/people/OpenMarriage.js';
import { divorce } from '../src/modules/people/PeopleEngine.js';
import { statuteIn } from '../src/modules/politics/StatuteBook.js';
import { enact } from '../src/modules/politics/Laws.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const married = (year = 2020, cc = 'US', seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - 35 });
  state.character.age = 35;
  state.prompts = [];
  const spouse = { id: 'sp1', firstName: 'Sam', lastName: 'Lee', gender: 'female', relation: 'spouse', ageOffset: 0, relationship: 75, spark: 60, alive: true, income: 40000, careerIncome: 40000, since: 28, trait: 'adventurous' };
  state.people.list.push(spouse);
  return { engine, state, ctx: engine.context(), spouse };
};

const tests = {
  'the times decide how likely a yes is'() {
    const now = married(2020);
    const then = married(1900);
    assert.ok(acceptOdds(now.state, now.spouse) > acceptOdds(then.state, then.spouse) * 3);
  },
  'asking: a yes opens it, and nothing is cheating while open'() {
    let opened = null;
    for (let seed = 1; seed < 40 && !opened; seed++) {
      const m = married(2020, 'US', seed);
      m.state.world.seed = seed;
      OpenMarriageModule.actions.propose(m.ctx);
      if (openWith(m.state, m.spouse)) opened = m;
    }
    assert.ok(opened, 'someone said yes');
    const { engine, state, spouse } = opened;
    // A temptation resolved into seeing someone: no secret affair.
    state.prompts = [];
    engine.context().prompt({ type: 'bonds.temptation', title: 't', text: 't', data: { personId: spouse.id }, options: [{ id: 'no', label: 'n' }, { id: 'affair', label: 'a' }] });
    engine.resolvePrompt(state.prompts[0].id, 'affair');
    assert.equal(state.people.affair ?? null, null);
    OpenMarriageModule.actions.close(engine.context());
    assert.equal(openWith(state, spouse), false);
  },
  'a refusal costs closeness'() {
    for (let seed = 1; seed < 40; seed++) {
      const m = married(1950, 'GB', seed);
      m.state.world.seed = seed;
      const before = m.spouse.relationship;
      OpenMarriageModule.actions.propose(m.ctx);
      if (!openWith(m.state, m.spouse)) { assert.ok(m.spouse.relationship < before); return; }
    }
    assert.fail('nobody refused in 1950');
  },
  'adultery and no-fault divorce follow history, and bills change them'() {
    assert.equal(statuteIn(married(1960, 'IT').state, 'adultery'), true);
    assert.equal(statuteIn(married(1980, 'IT').state, 'adultery'), false);
    assert.equal(statuteIn(married(1960, 'GB').state, 'noFaultDivorce'), false);
    assert.equal(statuteIn(married(1975, 'GB').state, 'noFaultDivorce'), true);
    const m = married(1960, 'GB');
    enact(m.state, { level: 'federal', where: 'GB', lawId: 'noFaultDivorce', value: true, age: 35 });
    assert.equal(statuteIn(m.state, 'noFaultDivorce'), true);
  },
  'before no-fault divorce, the one who strayed loses more'() {
    const split = (who) => {
      const m = married(1960, 'GB');
      m.state.finances.cash = 100000;
      m.state.people.prenup = false;
      if (who) markFault(m.state, who);
      divorce(m.ctx, m.spouse);
      return m.state.finances.cash;
    };
    const you = split('you');
    const them = split('them');
    assert.ok(them > you + 20000, `${them} vs ${you}`);
    // After no-fault divorce, fault doesn't matter.
    const after = (who) => { const m = married(1990, 'GB'); m.state.finances.cash = 100000; if (who) markFault(m.state, who); divorce(m.ctx, m.spouse); return m.state.finances.cash; };
    assert.equal(after('you'), after('them'));
  },
  'a year with an open marriage runs clean'() {
    const m = married(2020);
    m.state.people.open = { partnerId: m.spouse.id, since: 33, theirs: null, jealousy: 0 };
    for (let i = 0; i < 20; i++) { m.state.prompts = []; m.state.character.age += 1; OpenMarriageModule.onAgeUp(m.ctx); for (const p of m.state.prompts.filter((x) => x.type.startsWith('openMarriage.'))) m.engine.resolvePrompt(p.id, p.options[0].id); }
    assert.ok(Number.isFinite(m.state.finances.cash));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
