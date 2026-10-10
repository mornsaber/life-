/**
 * Lives outside the United States, in all nine other countries, and moves
 * between them. Each country's tax, contributions, health coverage and public
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
import { PROFESSIONS, professionsFor, PROFESSION_LIST } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire, applicationEligibility } from '../src/modules/career/CareerEngine.js';
import { REGIONS, regionsIn, changeRegion } from '../src/modules/life/Regions.js';
import { STATES } from '../src/modules/life/States.js';
import { COUNTRIES, countryOf, nationalIncomeTax, socialContributions, nationalPension, localizeHtml } from '../src/modules/world/Countries.js';
import { coverage } from '../src/modules/health/Insurance.js';
import { annualTuition } from '../src/modules/education/EducationEngine.js';
import { localizeTerms } from '../src/modules/world/Countries.js';
import { enlistmentEligibility, rankOf, branchOf } from '../src/modules/military/MilitaryEngine.js';
import { nationalBases } from '../src/modules/world/NationalForces.js';
import { runEligibility } from '../src/modules/politics/Campaigns.js';
import { officeOrderFor } from '../src/modules/politics/NationalOffices.js';
import { OFFICES } from '../src/modules/politics/Offices.js';
import { socialSecurityEstimate } from '../src/modules/retirement/RetirementEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { residencyOf, visaEligibility, prYearsLeft, naturalizationYearsLeft, speaks, recognitionRoute, heirCitizenships } from '../src/modules/world/Immigration.js';
import { arrive, routesTo } from '../src/modules/world/Migration.js';
import { citizenshipsOf, isCitizen } from '../src/modules/world/Countries.js';
import { hasCredential, transferStatus } from '../src/modules/credentials/LicensingEngine.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';

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
      assert.match(runEligibility(state, 'governor').reason, /U\.S\. office/);
      assert.doesNotMatch(runEligibility(state, 'cityCouncil').reason ?? '', /U\.S\. office/);
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
  'national government careers: each country\'s own agencies, for its own citizens'() {
    for (const [id, agency, name] of [['GB', 'gb_fbi', 'National Crime Agency'], ['CA', 'ca_fbi', 'Royal Canadian Mounted Police'], ['IN', 'in_fbi', 'Central Bureau of Investigation'], ['DE', 'de_fbi', 'Bundeskriminalamt (BKA)']]) {
      const t = born(id, 4, 30);
      t.state.career.history.push({ professionId: 'retail', startAge: 22, endAge: 29, peakGrade: 3 });
      const board = professionsFor(t.state);
      assert.ok(board.some((p) => p.id === agency), `${id} lists ${agency}`);
      assert.ok(!board.some((p) => p.id === 'fbi'), 'no FBI abroad');
      assert.equal(PROFESSIONS[agency].name, name);
      assert.doesNotMatch(applicationEligibility(t.state, agency).reason ?? '', /citizens|another country/);
    }
    // Another country's agency is closed; the US board is exactly as before.
    assert.match(applicationEligibility(born('CA').state, 'gb_fbi').reason, /another country/);
    assert.equal(professionsFor(born('US').state), PROFESSION_LIST);
    assert.equal(PROFESSIONS.ca_fbi.levels.find((l) => l.id === 'agent').title, 'Constable');
  },
  'parliamentary politics: provincial and national seats, then party leadership'() {
    const t = born('GB', 2, 35);
    t.state.character.regionId = 'edinburgh';
    const ladder = officeOrderFor('GB', 'GB-SCT', []);
    assert.ok(ladder.includes('gb_msp') && ladder.includes('gb_mp') && ladder.includes('gb_pm') && !ladder.includes('gb_ms'));
    assert.ok(runEligibility(t.state, 'gb_mp').ok, runEligibility(t.state, 'gb_mp').reason);
    assert.ok(runEligibility(t.state, 'gb_msp').ok, 'Scots can stand for Holyrood');
    assert.match(runEligibility(t.state, 'gb_pm').reason, /hold Member of Parliament/);
    t.state.politics.office = { id: 'gb_mp', termYearsLeft: 5, terms: 1, approval: 60, startAge: 35, fullTime: true };
    assert.ok(runEligibility(t.state, 'gb_pm').ok, 'an MP can stand for party leader');
    assert.match(runEligibility(t.state, 'usSenator').reason, /U\.S\. office/);
    // Directly elected presidents elsewhere, with their age floors.
    const k = born('KR', 2, 39);
    assert.match(runEligibility(k.state, 'kr_president').reason, /40/);
    assert.equal(OFFICES.mx_presidente.termLimit, 1);
    // The US ladder and OFFICES iteration are untouched.
    assert.ok(!Object.keys(OFFICES).some((id) => OFFICES[id].country));
  },
  'schools and licenses: local fees, names and qualifications'() {
    const uk = born('GB', 2, 18);
    uk.state.character.regionId = 'manchester';
    assert.equal(annualTuition('bachelor', 'state', uk.state), Math.round(14000 * 1), 'English fees');
    uk.state.character.regionId = 'edinburgh';
    assert.equal(annualTuition('bachelor', 'state', uk.state), 0, 'free for Scottish students');
    assert.ok(annualTuition('bachelor', 'state', born('DE').state) < 1000, 'German semester fees only');
    assert.ok(annualTuition('bachelor', 'state', born('US').state) > 9000, 'US unchanged');
    const gb = countryOf(uk.state);
    assert.equal(localizeTerms('State Bar License', gb), 'Solicitor qualification (SQE)');
    assert.equal(localizeTerms('a high-school diploma or a GED', gb), 'a A-levels or a Access to HE Diploma');
    assert.equal(localizeTerms('Ivy Crest University', gb), 'Oxbridge');
    assert.equal(localizeTerms("Driver's License (Class D)", countryOf(born('DE').state)), 'Führerschein Klasse B');
  },
  'UK student loans: 9% of income over the threshold, written off at 61'() {
    const t = employed('GB');
    t.state.finances.loans = 40000;
    t.state.finances.cash = 50000;
    year(t);
    const paid = t.state.finances.lastYear.loanPayment;
    const expected = Math.round(0.09 * (t.state.finances.lastYear.gross - 36760));
    assert.ok(Math.abs(paid - Math.max(0, expected)) <= 1, `paid ${paid}, expected ${expected}`);
    t.state.character.age = 61;
    year(t);
    assert.equal(t.state.finances.loans, 0);
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
  'moving abroad: visa routes, the move itself, and what stays behind'() {
    const t = employed('US', 21);
    const { state, engine } = t;
    state.finances.cash = 60000;
    state.character.age = 30;
    // Routes: no spouse visa without a spouse; the H-1B-style lottery odds are low; degree needed for skilled work.
    const ca = routesTo(state, 'CA');
    assert.ok(ca.find((r) => r.kind === 'work').ok);
    assert.equal(ca.find((r) => r.kind === 'family').ok, false);
    assert.ok(!routesTo(state, 'US').length, 'no routes to where you live');
    // Force approval and move.
    state.stats.smarts = 90;
    let moved = false;
    for (let i = 0; i < 8 && !moved; i++) {
      engine.dispatch('migration.emigrate', 'CA:work');
      moved = state.character.countryId === 'CA';
      if (!moved) state.yearly = {};
    }
    assert.ok(moved, 'a 70% visa comes through within a few tries');
    assert.equal(REGIONS[state.character.regionId].country, 'CA');
    assert.deepEqual(citizenshipsOf(state), ['US'], 'still only American');
    const res = residencyOf(state);
    assert.equal(res.status, 'visa');
    assert.equal(res.visa, 'work');
    assert.equal(state.career.job, null, 'left the job behind');
    assert.ok(state.migration.history.length === 1);
    // Can't hold Canadian public jobs or national office, can run for nothing local as a non-citizen.
    assert.equal(runEligibility(state, 'ca_mp').ok, false);
    assert.equal(runEligibility(state, 'mayor').ok, false);
    for (const view of Object.values(VIEWS)) assert.equal(typeof view(state), 'string');
  },
  'visa conditions: a work visa without a job lapses and you are sent home'() {
    const t = born('US', 22, 30);
    const { state, ctx, engine } = t;
    arrive(ctx, 'GB', { visa: 'work' });
    assert.equal(state.character.countryId, 'GB');
    assert.ok(residencyOf(state));
    state.prompts = [];
    engine.ageUp();
    assert.ok(residencyOf(state)?.grace != null || state.career.job, 'a year to find work');
    if (!state.career.job) {
      state.prompts = [];
      engine.ageUp();
      assert.equal(state.character.countryId, undefined, 'removed to the US');
      assert.equal(REGIONS[state.character.regionId].country ?? 'US', 'US');
    }
  },
  'permanent residence, then citizenship (with language and dual-nationality rules)'() {
    const t = employed('US', 23);
    const { state, ctx, engine } = t;
    const job = state.career.job;
    arrive(ctx, 'DE', { visa: 'work' });
    // Hire locally so the visa holds.
    hire(ctx, { professionId: 'corporate', levelId: 'srAnalyst', employer: createEmployer(new Random(2), state, PROFESSIONS.corporate, state.character.regionId) });
    assert.ok(job);
    state.character.age += 4;
    assert.equal(prYearsLeft(state), 0);
    state.finances.cash = 50000;
    for (let i = 0; i < 6 && residencyOf(state).status !== 'permanent'; i++) { state.yearly = {}; engine.dispatch('migration.applyPR'); }
    assert.equal(residencyOf(state).status, 'permanent');
    state.character.age += 1;
    assert.equal(naturalizationYearsLeft(state), 0);
    state.migration.languages.German = 0;
    assert.equal(speaks(state, 'German'), false);
    engine.dispatch('migration.naturalize');
    assert.ok(!isCitizen(state, 'DE'), 'German needed for the test');
    state.migration.languages.German = 100;
    state.stats.smarts = 100;
    for (let i = 0; i < 6 && !isCitizen(state, 'DE'); i++) { state.yearly = {}; engine.dispatch('migration.naturalize'); }
    assert.deepEqual(citizenshipsOf(state).sort(), ['DE', 'US'], 'Germany allows dual citizenship since 2024');
    assert.equal(residencyOf(state), null);
    // Japan: naturalizing means giving up the others.
    const j = born('US', 24, 30);
    arrive(j.ctx, 'JP', { visa: 'work' });
    j.state.character.age += 5;
    j.state.migration.languages.Japanese = 100;
    j.state.stats.smarts = 100;
    j.state.finances.cash = 10000;
    for (let i = 0; i < 6 && !isCitizen(j.state, 'JP'); i++) { j.state.yearly = {}; j.engine.dispatch('migration.naturalize'); }
    assert.deepEqual(citizenshipsOf(j.state), ['JP']);
  },
  'licenses must be recognized across borders'() {
    const t = born('US', 25, 30);
    const { state, ctx, engine } = t;
    engine.dispatch; // eslint quiet
    const home = REGIONS[state.character.regionId].state;
    state.credentials.held.driverLicense = { earnedAge: 16, renewedAge: 16, status: 'active', states: [home] };
    state.credentials.held.rn = { earnedAge: 24, renewedAge: 24, status: 'active', states: [home] };
    assert.ok(hasCredential(state, 'driverLicense'));
    arrive(ctx, 'DE', { visa: 'work' });
    assert.equal(hasCredential(state, 'driverLicense'), false, 'a US licence isn\'t valid once you live in Germany');
    assert.equal(transferStatus(state, 'driverLicense').method, 'exchange');
    const rn = transferStatus(state, 'rn');
    assert.equal(rn.method, 'foreignExam');
    assert.ok(rn.blocked, 'nursing needs German');
    assert.equal(recognitionRoute('barLicense', ['US'], 'JP').method, 'requalify');
    assert.equal(recognitionRoute('medicalLicense', ['IT'], 'DE').method, 'mutual');
    state.finances.cash = 5000;
    engine.dispatch('credentials.transfer', 'driverLicense');
    assert.ok(hasCredential(state, 'driverLicense'), 'swapped without a test');
    // Home again: the original still works.
    arrive(ctx, 'US', {});
    assert.ok(hasCredential(state, 'rn'), 'valid again at home');
  },
  'pensions from every country you worked in'() {
    const t = born('US', 26, 30);
    const { state, ctx } = t;
    state.retirement.ssEarnings = Array(12).fill(60000);
    arrive(ctx, 'CA', { visa: 'work' });
    assert.deepEqual(state.retirement.ssEarnings, []);
    assert.equal(state.retirement.records.US.length, 12);
    state.retirement.ssEarnings = Array(20).fill(60000);
    state.character.age = 67;
    const total = socialSecurityEstimate(state, 67);
    const caOnly = (() => { const r = state.retirement.records; state.retirement.records = {}; const v = socialSecurityEstimate(state, 67); state.retirement.records = r; return v; })();
    assert.ok(total > caOnly + 5000, `US years still pay (${total} vs ${caOnly})`);
    // Short record + a totalization agreement: pro-rata; no agreement: nothing.
    state.retirement.records = { US: Array(4).fill(60000) };
    const withAgreement = socialSecurityEstimate(state, 67) - caOnly;
    assert.ok(withAgreement > 0 && withAgreement < 10000, `US–Canada agreement pays a share (${withAgreement})`);
    // Mexico: the US–Mexico agreement isn't in force, so four US years there earn nothing.
    const mx = born('US', 30, 30);
    mx.state.retirement.ssEarnings = Array(4).fill(60000);
    arrive(mx.ctx, 'MX', { visa: 'work' });
    mx.state.retirement.ssEarnings = Array(20).fill(20000);
    const mxOnly = (() => { const r = mx.state.retirement.records; mx.state.retirement.records = {}; const v = socialSecurityEstimate(mx.state, 67); mx.state.retirement.records = r; return v; })();
    assert.equal(socialSecurityEstimate(mx.state, 67), mxOnly);
  },
  'felony conviction ends a visa; heirs inherit passports'() {
    const t = born('US', 27, 30);
    const { state, ctx, engine } = t;
    arrive(ctx, 'GB', { visa: 'work' });
    hire(ctx, { professionId: 'corporate', levelId: 'srAnalyst', employer: createEmployer(new Random(2), state, PROFESSIONS.corporate, state.character.regionId) });
    ctx.emit('legal:convicted', { ctx, offenseId: 'fraud', severity: 'felony', name: 'Fraud' });
    assert.ok(residencyOf(state).removal);
    engine.ageUp();
    assert.equal(state.character.countryId, undefined, 'removed after the conviction');
    // A child born in Canada to an American: both passports (birthright); born in Japan: only American.
    const parent = born('US', 28, 40);
    arrive(parent.ctx, 'CA', { visa: 'work' });
    const kid = { id: 'k', nationality: 'CA', otherParentId: null };
    assert.deepEqual(heirCitizenships(parent.state, kid).citizenships.sort(), ['CA', 'US']);
    const jp = born('US', 29, 40);
    arrive(jp.ctx, 'JP', { visa: 'work' });
    assert.deepEqual(heirCitizenships(jp.state, { id: 'k', nationality: 'JP' }).citizenships, ['US']);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} country test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} country tests passed`);
