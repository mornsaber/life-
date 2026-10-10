/**
 * Lives born outside the United States: Canada, the United Kingdom, Germany
 * and Japan. Each country's tax, contributions, health coverage and public
 * pension follow its own rules; US-only paths are closed; money shows in the
 * local currency; and US lives are exactly as before.
 *
 *   node tests/countries.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire, applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { REGIONS, regionsIn, changeRegion } from '../src/modules/life/Regions.js';
import { STATES } from '../src/modules/life/States.js';
import { COUNTRIES, countryOf, nationalIncomeTax, socialContributions, nationalPension, localizeHtml } from '../src/modules/world/Countries.js';
import { coverage } from '../src/modules/health/Insurance.js';
import { enlistmentEligibility, rankOf, branchOf } from '../src/modules/military/MilitaryEngine.js';
import { nationalBases } from '../src/modules/world/NationalForces.js';
import { runEligibility } from '../src/modules/politics/Campaigns.js';
import { socialSecurityEstimate } from '../src/modules/retirement/RetirementEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const FOREIGN = ['CA', 'GB', 'DE', 'JP', 'KR', 'IT', 'MX', 'PH', 'IN'];

function born(countryId, seed = 3, age = 35) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId });
  state.character.age = age;
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
  return { engine, state, ctx: engine.context() };
}
function employed(countryId, seed = 3) {
  const t = born(countryId, seed);
  hire(t.ctx, { professionId: 'corporate', levelId: 'srAnalyst', employer: createEmployer(new Random(2), t.state, PROFESSIONS.corporate, t.state.character.regionId) });
  t.state.prompts = [];
  return t;
}
const year = (t) => { t.engine.ageUp(); t.state.prompts = []; };

const tests = {
  'born abroad: a city, names and provinces of that country'() {
    for (const id of FOREIGN) {
      const { state } = born(id);
      const c = COUNTRIES[id];
      assert.equal(state.character.countryId, id);
      assert.equal(REGIONS[state.character.regionId].country, id, 'a city in the country');
      assert.equal(STATES[REGIONS[state.character.regionId].state].country, id, 'and its province');
      assert.ok(c.names.last.includes(state.character.lastName), `${id} surname ${state.character.lastName}`);
      const parent = state.people.list.find((p) => p.relation === 'parent');
      if (parent) assert.ok(c.names.last.includes(parent.lastName));
    }
  },
  'US lives are unchanged: no country field, US cities only in every list'() {
    const { state } = born('US');
    assert.equal(state.character.countryId, undefined);
    assert.equal(Object.keys(REGIONS).length, 35);
    assert.ok(Object.keys(REGIONS).every((id) => !REGIONS[id].country));
    assert.equal(regionsIn('US').length, 35);
  },
  'national income tax: UK bands and the allowance taper, Scotland\'s own bands'() {
    const gb = COUNTRIES.GB;
    // £50,000 salary ≈ $73,529 PPP: 20% on £37,430 = £7,486.
    assert.ok(Math.abs(nationalIncomeTax(gb, 50000 / 0.68) * 0.68 - 7486) < 30);
    // £125,140+: the allowance is gone.
    const high = nationalIncomeTax(gb, 150000 / 0.68) * 0.68;
    assert.ok(Math.abs(high - (37700 * 0.2 + (125140 - 50270) * 0.4 + (150000 - 125140) * 0.45 + 12570 * 0.4)) < 600, `£${Math.round(high)}`);
    assert.equal(nationalIncomeTax(gb, 60000, STATES['GB-SCT']), 0, 'Scotland taxes through its own bands');
    // National Insurance: 8% between £12,570 and £50,270.
    assert.ok(Math.abs(socialContributions(gb, 40000 / 0.68) * 0.68 - (40000 - 12570) * 0.08) < 20);
  },
  'a year of work abroad: national tax, contributions, no US tax credits'() {
    for (const id of FOREIGN) {
      const t = employed(id);
      year(t);
      const ly = t.state.finances.lastYear;
      if (t.state.career.job?.informal) continue;
      assert.ok(ly.contributions > 0, `${id} contributions`);
      assert.ok(ly.federalTax >= ly.contributions, `${id} income tax on top of contributions`);
      assert.equal(ly.kidsCredit, 0);
      assert.equal(ly.itemized, null);
      const rate = ly.tax / ly.gross;
      if (!t.state.career.job?.informal) assert.ok(rate > 0.03 && rate < 0.45, `${id} effective rate ${(rate * 100).toFixed(1)}%`);
    }
  },
  'informal jobs: cash pay, untaxed, no contributions or pension credit'() {
    let informal = 0;
    for (let seed = 1; seed <= 30 && !informal; seed++) {
      const t = born('IN', seed);
      hire(t.ctx, { professionId: 'retail', levelId: PROFESSIONS.retail.levels[0].id, employer: createEmployer(new Random(seed), t.state, PROFESSIONS.retail, t.state.character.regionId) });
      t.state.prompts = [];
      if (!t.state.career.job?.informal) continue;
      informal += 1;
      const before = t.state.retirement.ssEarnings.length;
      year(t);
      const ly = t.state.finances.lastYear;
      assert.ok(ly.gross > 0);
      assert.equal(ly.contributions, 0, 'no contributions');
      assert.equal(t.state.retirement.ssEarnings.length, before, 'no pension credit');
    }
    assert.ok(informal, 'most retail jobs in India are informal');
    // The US never rolls for informality.
    const us = employed('US');
    assert.ok(!us.state.career.job.informal);
  },
  'universal health coverage: no premiums'() {
    for (const id of FOREIGN) {
      const t = employed(id);
      const plan = coverage(t.state);
      assert.equal(plan.id, 'national');
      assert.equal(plan.premium, 0);
      assert.ok(Number.isFinite(plan.oopMax) && plan.oopMax <= 6000);
    }
  },
  'the national pension replaces Social Security'() {
    const avg = (c) => [...Array(40)].map(() => 55000);
    // UK: 35+ qualifying years → the full flat pension (£11,973).
    assert.equal(Math.round(nationalPension(COUNTRIES.GB, avg() ) * 0.68 / 100), Math.round(11973 / 100));
    assert.equal(nationalPension(COUNTRIES.GB, [50000, 50000]), 0, 'under 10 years: nothing');
    // Germany: 40 years at the average wage → 40 points.
    const de = COUNTRIES.DE;
    assert.equal(nationalPension(de, [...Array(40)].map(() => de.pension.average)), Math.round(40 * de.pension.pointValue));
    // Canada and Japan pay something reasonable for a full career.
    for (const id of ['CA', 'JP']) {
      const p = nationalPension(COUNTRIES[id], avg());
      assert.ok(p > 12000 && p < 40000, `${id} pension ${p}`);
    }
    const t = employed('GB');
    t.state.retirement.ssEarnings = avg();
    t.state.character.age = 66;
    assert.ok(socialSecurityEstimate(t.state) > 15000);
    t.engine.dispatch('retirement.claimSocialSecurity');
    assert.ok(t.state.retirement.socialSecurity?.annual > 15000, 'claimed at 66');
    const log = t.state.log.flatMap((b) => b.entries).map((e) => e.text).join(' ');
    assert.match(log, /State Pension/);
  },
  'US-only paths are closed abroad; local life is open'() {
    for (const id of FOREIGN) {
      const { state } = born(id, 9, 24);
      assert.match(applicationEligibility(state, 'fbi').reason ?? '', /U\.S\. citizenship/);
      assert.doesNotMatch(applicationEligibility(state, 'police').reason ?? '', /citizenship/);
      assert.ok(!enlistmentEligibility(state, 'coastguard', 'enlisted', 'active').ok, 'no US Coast Guard abroad');
      assert.match(runEligibility(state, 'governor').reason, /local office/);
      assert.doesNotMatch(runEligibility(state, 'cityCouncil').reason ?? '', /local office/);
      assert.ok(!state.military.sss?.registered || state.character.age < 18, 'no Selective Service');
    }
  },
  'national armed forces: enlist in your own country\'s branches, with its ranks and bases'() {
    for (const [id, title] of [['CA', 'Canadian Army'], ['GB', 'British Army'], ['DE', 'Heer'], ['JP', 'Ground Self-Defense'], ['IN', 'Indian Army']]) {
      const t = born(id, 5, 20);
      Object.assign(t.state.stats, { health: 90, fitness: 80, smarts: 70 });
      assert.ok(enlistmentEligibility(t.state, 'army', 'enlisted', 'active').ok, enlistmentEligibility(t.state, 'army', 'enlisted', 'active').reason);
      t.engine.dispatch('military.enlist', 'army:enlisted:active');
      const p = t.state.prompts.find((x) => x.type === 'military.chooseSpecialty');
      assert.ok(p, `${id} specialty prompt`);
      assert.ok(p.title.includes(title.split(' ')[0]), p.title);
      t.engine.rng.chance = () => true;
      t.engine.resolvePrompt(p.id, p.options.find((o) => !o.disabled).id);
      const svc = t.state.military.service;
      assert.equal(svc.nation, id);
      assert.ok(branchOf(svc).name.includes(title), branchOf(svc).name);
      assert.ok(nationalBases(id, 'army').length, 'bases at home');
      assert.ok(rankOf(svc).title, 'a national rank');
    }
    // No national force has a US-only branch.
    assert.ok(!enlistmentEligibility(born('DE', 5, 20).state, 'coastguard', 'enlisted', 'active').ok);
  },
  'South Korea: every man serves; Mexico: the SMN lottery and the cartilla'() {
    const t = born('KR', 8, 18);
    t.state.character.gender = 'male';
    Object.assign(t.state.stats, { health: 95, fitness: 80 });
    let served = false;
    for (let i = 0; i < 6 && !served; i++) {
      t.state.prompts = [];
      t.engine.ageUp();
      const notice = t.state.prompts.find((p) => p.type === 'conscription.korea');
      t.state.prompts = t.state.prompts.filter((p) => p === notice);
      if (notice) t.engine.resolvePrompt(notice.id, notice.options.some((o) => o.id === 'army') ? 'army' : notice.options[0].id);
      served = t.state.military.conscription?.status === 'served';
    }
    assert.ok(served, `status ${t.state.military.conscription?.status}`);
    const h = t.state.military.history.at(-1);
    if (h) assert.equal(h.nation, 'KR');
    const m = born('MX', 3, 17);
    m.state.character.gender = 'male';
    m.state.prompts = [];
    m.engine.ageUp();
    const smn = m.state.prompts.find((p) => p.type === 'conscription.mexico');
    assert.ok(smn, 'SMN at 18');
    m.engine.resolvePrompt(smn.id, 'register');
    assert.ok(m.state.military.cartilla);
  },
  'moves stay inside the country'() {
    const t = born('CA');
    const here = t.state.character.regionId;
    assert.equal(changeRegion(t.ctx, 'chicago', 'Test.'), false, 'not to the US');
    const other = regionsIn('CA').find((r) => r.id !== here);
    assert.equal(changeRegion(t.ctx, other.id, 'Test.'), true);
    assert.equal(t.state.character.regionId, other.id);
  },
  'screens show local money and words'() {
    for (const id of FOREIGN) {
      const t = employed(id);
      year(t);
      const c = countryOf(t.state);
      const html = localizeHtml(VIEWS.money(t.state) + VIEWS.career(t.state) + VIEWS.life(t.state), c);
      const text = html.replace(/<[^>]+>/g, ' ');
      assert.ok(text.includes(c.currency.symbol), `${id} shows ${c.currency.symbol}`);
      assert.ok(!/\$\d/.test(text.replace(/[A-Z]{1,2}\$\d/g, '')), `${id}: no US-dollar amounts left: ${text.match(/.{20}\$\d.{20}/)?.[0]}`);
      assert.ok(!/undefined|NaN|\[object/.test(text));
    }
  },
  'full lives play out in every country and saves round-trip'() {
    for (const id of FOREIGN) {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(11), modules: MODULES });
      let state = engine.newLife({ countryId: id });
      const pick = new Random(5);
      for (let i = 0; i < 90 && state.character.alive; i++) {
        for (let g = 0; g < 30 && state.prompts.length; g++) {
          const p = state.prompts[0];
          const o = p.options.filter((x) => !x.disabled);
          engine.resolvePrompt(p.id, (o.length ? pick.pick(o) : p.options[0]).id);
        }
        engine.ageUp();
        state = engine.state;
      }
      assert.equal(state.character.countryId, id);
      assert.equal(REGIONS[state.character.regionId].country, id, 'never left the country');
      for (const view of Object.values(VIEWS)) assert.equal(typeof view(state), 'string');
      const restored = new Store(engine.store.storage).load();
      assert.deepEqual(restored, state);
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} country test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} country tests passed`);
