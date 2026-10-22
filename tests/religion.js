/**
 * Religion by place: upbringing follows each country's religious mix, local church names
 * (the Church of England, the Church of Sweden), and Anglican holy orders through a diocese.
 *
 *   node tests/religion.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { upbringing, traditionName, RELIGION_MIX, TRADITIONS } from '../src/modules/community/Religions.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { BODIES } from '../src/modules/org/Bodies.js';
import { orgTypesFor } from '../src/modules/org/OrgTypes.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const share = (cc, ids, n = 3000) => {
  const rng = new Random(7);
  let hit = 0;
  for (let i = 0; i < n; i++) if (ids.includes(upbringing(rng, cc) ?? 'none')) hit += 1;
  return hit / n;
};

const tests = {
  'upbringing follows the country: Anglicans in England, Catholics in Ireland and Mexico, Muslims in Indonesia'() {
    assert.ok(share('GB', ['anglican']) > 0.15, 'Church of England is the largest church');
    assert.ok(share('IE', ['catholic', 'tradCatholic']) > 0.6);
    assert.ok(share('MX', ['catholic', 'tradCatholic']) > 0.6);
    assert.ok(share('ID', ['sunni']) > 0.75);
    assert.ok(share('IN', ['hindu']) > 0.7);
    assert.ok(share('JP', ['shinto', 'buddhist', 'none']) > 0.8);
    assert.ok(share('SE', ['none', 'lutheran']) > 0.7);
    assert.ok(share('US', ['anglican']) < 0.05, 'few Episcopalians');
  },
  'every mix names real traditions'() {
    for (const [cc, mix] of Object.entries(RELIGION_MIX)) for (const id of Object.keys(mix)) assert.ok(id === 'none' || TRADITIONS[id], `${cc}: ${id}`);
  },
  'local names: the Church of England, the Episcopal Church, the Church of Sweden'() {
    assert.equal(traditionName('anglican', 'GB'), 'Church of England');
    assert.equal(traditionName('anglican', 'US'), 'Episcopal Church');
    assert.equal(traditionName('lutheran', 'SE'), 'Church of Sweden');
    assert.equal(traditionName('catholic', 'GB'), TRADITIONS.catholic.name);
  },
  'Anglican holy orders: through a diocese, women ordained, clergy may marry'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
    const state = engine.newLife({ countryId: 'GB', gender: 'female' });
    state.character.age = 30;
    state.community.faith = { traditionId: 'anglican', joinedAge: 0, raised: true, attendance: 'regular', role: null, devoutYears: 0, congregation: 'St Mary\'s Parish Church' };
    state.people.list.push({ id: 'sp', relation: 'spouse', alive: true, name: 'Sam' });
    const p = getProfession('anglicanClergy');
    assert.ok(p.eligible(state).ok, p.eligible(state).reason);
    assert.equal(getProfession('clergy').eligible(state).ok, false, 'not the generic ministry');
    assert.equal(getProfession('catholicClergy').eligible(state).ok, false);
    assert.match(p.employerName('Leeds'), /Diocese of Leeds/);
    assert.equal(BODIES.anglican.unitName('GB', 'Kent', 'enterprise'), 'Diocese of Canterbury');
    assert.ok(orgTypesFor('anglicanClergy').includes('anglicanDiocese'));
    assert.ok(VIEWS.community(state).includes('Church of England'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} religion test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} religion tests passed`);
