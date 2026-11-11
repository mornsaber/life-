/**
 * Property and inheritance (realestate/Title.js, people/Succession.js, world/SuccessionLaw.js):
 * joint title and survivorship, houses left to someone in kind, the family home shared among
 * heirs, the children's reserved share, Islamic shares, primogeniture, coverture, and your
 * parents' house coming to you.
 *
 *   node tests/inheritance.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { settleEstate, buildHeirState, heirShares, estateBalance } from '../src/modules/people/Legacy.js';
import { successionLaw, lawfulShares } from '../src/modules/world/SuccessionLaw.js';
import { parentsEstate } from '../src/modules/people/Succession.js';
import { titleOf, undercoverture } from '../src/modules/realestate/Title.js';
import { periodHomeName } from '../src/modules/realestate/HomesOfTheDay.js';
import { periodRentName } from '../src/modules/world/Eras.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts = {}, seed = 3) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ gender: 'male', ...opts });
  state.character.age = 50;
  state.prompts = [];
  return { engine, state, ctx: engine.context() };
};
let n = 0;
const person = (state, relation, extra = {}) => {
  const p = { id: `per_t${++n}`, firstName: `${relation}${n}`, lastName: 'Test', gender: 'female', relation, ageOffset: relation === 'child' ? -25 : 0, relationship: 70, alive: true, income: 0, ...extra };
  state.people.list.push(p);
  return p;
};
const house = (state, extra = {}) => {
  const p = { id: `prop_t${++n}`, type: 'family', typeName: 'Family Home', regionId: state.character.regionId, value: 500000, valueAdj: 1, purchasePrice: 300000, purchaseAge: 30, condition: 70, use: 'primary', mortgage: null, heloc: null, tenants: [], insured: true, floodInsured: false, ...extra };
  state.housing.properties.push(p);
  return p;
};

const tests = {
  'joint title passes to your spouse outside the estate'() {
    const { engine, state } = life();
    const wife = person(state, 'spouse');
    const h = house(state);
    state.finances.cash = 400;
    engine.dispatch('title.joint', h.id);
    assert.equal(titleOf(h).form, 'joint');
    assert.equal(estateBalance(state).assets, 0, 'the house is not in the estate');
    wife.alive = false;
    assert.ok(estateBalance(state).assets >= 500000, 'with the spouse gone, it is');
  },
  'a house left to one child goes to them in kind, and counts against their share'() {
    const { engine, state, ctx } = life();
    const a = person(state, 'child', { gender: 'female' });
    const b = person(state, 'child', { gender: 'male' });
    const h = house(state, { use: 'rental' });
    state.finances.cash = 100000;
    engine.dispatch('title.leave', `${h.id}:${a.id}`);
    state.character.alive = false;
    const legacy = settleEstate(state);
    const gift = legacy.bequests.find((x) => x.propertyId === h.id);
    assert.equal(gift.to, a.id);
    assert.equal(gift.amount, 500000);
    const heir = buildHeirState(new Random(1), state, a.id);
    assert.ok(heir.housing.properties.some((p) => p.type === 'family' && titleOf(p).how === 'inherited'), 'the house is hers');
    assert.ok(heir.finances.cash < 100000, `her cash ${heir.finances.cash} is her share of the rest`);
  },
  'the family home is shared with the other heirs: buy them out, keep it together, or sell'() {
    const { state } = life();
    person(state, 'child');
    const k2 = person(state, 'child');
    house(state);
    state.finances.cash = 300000;
    state.character.alive = false;
    const heir = buildHeirState(new Random(2), state, k2.id);
    const fh = heir.succession?.familyHome;
    assert.ok(fh, 'a family home to settle');
    assert.ok(fh.share > 0.4 && fh.share < 0.6, `share ${fh.share}`);
    assert.equal(fh.others.length, 1);
  },
  'civil law: the children\'s reserve beats a will that leaves everything to the spouse'() {
    const { state } = life({ countryId: 'FR' });
    const spouse = person(state, 'spouse');
    const kids = [person(state, 'child'), person(state, 'child')];
    state.people.will = { plan: 'spouse' };
    const shares = heirShares(state);
    const toKids = shares.filter((s) => kids.some((k) => k.id === s.to)).reduce((a, s) => a + s.share, 0);
    assert.ok(Math.abs(toKids - 2 / 3) < 1e-6, `children get ${toKids}`);
    assert.ok(shares.some((s) => s.to === spouse.id));
    assert.ok(Math.abs(shares.reduce((a, s) => a + s.share, 0) - 1) < 1e-6);
  },
  'Islamic shares: a widow an eighth, a son twice a daughter'() {
    const { state } = life({ countryId: 'SA' });
    const shares = lawfulShares(state, { spouse: 'w', spouseGender: 'female', children: [{ id: 's', gender: 'male' }, { id: 'd', gender: 'female' }] });
    const of = (id) => shares.find((x) => x.to === id).share;
    assert.ok(Math.abs(of('w') - 1 / 8) < 1e-9);
    assert.ok(Math.abs(of('s') - 2 * of('d')) < 1e-9);
    assert.equal(successionLaw(state).family, 'islamic');
  },
  'the law of its day: entail in England, coverture, and socialist law'() {
    const gb = life({ countryId: 'GB', startYear: 1850 }).state;
    gb.character.age = 30;
    assert.ok(successionLaw(gb).primogeniture);
    assert.ok(successionLaw(gb).coverture);
    const modern = life({ countryId: 'GB' }).state;
    assert.ok(!successionLaw(modern).primogeniture && !successionLaw(modern).coverture);
    const wife = life({ countryId: 'GB', startYear: 1840, gender: 'female' }).state;
    wife.character.age = 35;
    person(wife, 'spouse', { gender: 'male' });
    assert.ok(undercoverture(wife), 'a wife in 1875');
    const ussr = life({ countryId: 'RU', startYear: 1930 }).state;
    assert.equal(successionLaw(ussr).family, 'socialist');
  },
  'your parents\' house comes to you and your siblings'() {
    let got = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { state, ctx } = life({}, seed);
      state.people.wealth = 'middle';
      state.people.list.filter((p) => p.relation === 'sibling').forEach((p) => { p.alive = false; });
      person(state, 'sibling');
      parentsEstate(ctx, 50000);
      if (state.succession.parentsHome) {
        got++;
        assert.ok([0.5, 1].some((x) => Math.abs(titleOf(state.succession.parentsHome.property).share - x) < 0.01), 'half, or all if a will cut the other out');
        assert.ok(state.prompts.some((p) => p.type === 'succession.parentsHome'));
      }
    }
    assert.ok(got >= 4, `${got}/12 inherited a house`);
  },
  'primogeniture: the eldest son takes the landed estate'() {
    const { state, ctx } = life({ countryId: 'GB', startYear: 1830 });
    state.character.age = 40;
    state.people.wealth = 'upper';
    state.people.list.filter((p) => p.relation === 'sibling').forEach((p) => { p.alive = false; });
    const sister = person(state, 'sibling', { gender: 'female', ageOffset: 3 });
    parentsEstate(ctx, 100000);
    assert.ok(state.finances.cash >= 79000, `cash ${state.finances.cash}`);
    assert.ok(state.log.at(-1).entries.some((e) => /eldest son|entail/.test(e.text)), 'the law is said');
    assert.ok(sister.alive);
  },
  'homes by their names, and the Home tab'() {
    const gb = life({ countryId: 'GB', startYear: 1860 }).state;
    gb.character.age = 20;
    assert.match(periodHomeName(gb, 'starter', 'Starter Home'), /Back-to-back/);
    const us = life({ countryId: 'US', startYear: 1900 }).state;
    us.character.age = 25;
    assert.equal(periodHomeName(us, 'starter', 'Starter Home'), 'Bungalow');
    const council = life({ countryId: 'GB', startYear: 1930 }).state;
    council.character.age = 25;
    assert.match(periodRentName(council, 'subsidized', 'Subsidized'), /council/i);
    const { state } = life();
    person(state, 'spouse');
    house(state);
    const html = VIEWS.home(state, {});
    assert.match(html, /Title &amp; Inheritance|Title & Inheritance/);
    assert.doesNotMatch(html, /undefined|NaN/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
