/**
 * Marrying into the royal family; rival funds; club sponsors.
 *
 *   node tests/royalmarriage.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { RoyalMarriageModule, eligibleCommoner } from '../src/modules/world/RoyalMarriage.js';
import { styledName } from '../src/modules/world/Honours.js';
import { HedgeFundModule } from '../src/modules/investing/HedgeFund.js';
import { ClubOwnershipModule } from '../src/modules/business/ClubOwnership.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc = 'GB', year = 2000, age = 28, seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear: year - age, gender: 'female' });
  state.character.age = age;
  state.character.gender = 'female';
  state.prompts = [];
  state.people.list = state.people.list.filter((p) => !['partner', 'spouse', 'fiance'].includes(p.relation));
  return { engine, state, ctx: engine.context() };
};

const tests = {
  'who the palace would consider, by the standards of the day'() {
    assert.equal(eligibleCommoner(life('GB', 1900).state), false);
    assert.equal(eligibleCommoner(life('GB', 1990).state), true);
  },
  'meeting, courting and marrying a royal makes you a royal consort'() {
    let m = null;
    for (let seed = 1; seed < 400 && !m; seed++) {
      const t = life('GB', 2000, 28, seed);
      t.state.society = { standing: 90, oldMoney: false, attended: { 2000: ['season'] }, clubs: [], yacht: 0, jet: 0, horses: 0, art: [] };
      t.state.world.seed = seed;
      RoyalMarriageModule.onAgeUp(t.ctx);
      const p = t.state.prompts.find((x) => x.type === 'royalMarriage.meet');
      if (!p) continue;
      t.engine.resolvePrompt(p.id, 'flirt');
      if (t.state.people.list.some((x) => x.royal)) m = t;
    }
    assert.ok(m, 'met and courted a royal');
    const royal = m.state.people.list.find((x) => x.royal);
    royal.relation = 'spouse';
    m.ctx.emit('people:married', { personId: royal.id });
    assert.equal(m.state.royal?.level, 'consort');
    assert.match(styledName(m.state), /Princess|Duchess/);
    // A divorce ends it.
    royal.relation = 'ex';
    RoyalMarriageModule.onAgeUp(m.ctx);
    assert.equal(m.state.royal, null);
  },
  'rival funds run their own years'() {
    const m = life('US', 2010, 40);
    m.state.stats.smarts = 90;
    m.state.finances.cash = 5e6;
    HedgeFundModule.actions.launch(m.ctx);
    assert.equal(m.state.fund.rivals.length, 3);
    m.state.character.age += 1;
    HedgeFundModule.onAgeUp(m.ctx);
    if (m.state.fund) assert.ok(m.state.fund.rivals.every((r) => Number.isFinite(r.ret)));
  },
  'a shirt sponsor pays, a betting firm pays more and the fans mind; none before the late 1970s'() {
    const m = life('GB', 2010, 45);
    m.state.finances.cash = 1e11;
    ClubOwnershipModule.actions.buy(m.ctx, 'football:2');
    const fans = m.state.club.fans;
    ClubOwnershipModule.actions.sponsor(m.ctx, 'betting');
    assert.ok(m.state.club.deal.perYear > 0);
    assert.ok(m.state.club.fans < fans);
    const old = life('GB', 1960, 45);
    old.state.finances.cash = 1e11;
    ClubOwnershipModule.actions.buy(old.ctx, 'football:2');
    ClubOwnershipModule.actions.sponsor(old.ctx, 'local');
    assert.equal(old.state.club.deal ?? null, null);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
