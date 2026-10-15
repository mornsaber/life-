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
import { inheritanceTax } from '../src/modules/world/CountryLaw.js';
import { DIASPORA, COMMUNITY_NAMES } from '../src/modules/world/Diaspora.js';
import { randomName, setNameCountry } from '../src/core/State.js';
import { programEligibility } from '../src/modules/service/NationalService.js';
import { declareWar, warHere, homeDanger, underMobilization } from '../src/modules/world/War.js';
import { departureBlock, bannedFrom } from '../src/modules/world/Migration.js';
import { unitName } from '../src/modules/publicsafety/PoliceLife.js';
import { assignmentName, dutyFor } from '../src/modules/military/Assignments.js';
import { schoolName } from '../src/modules/military/Schools.js';
import { pipelineFor } from '../src/modules/military/SpecialOpsCatalog.js';
import { billetTitle } from '../src/modules/org/MilitaryUnits.js';
import { summaryPunishment } from '../src/modules/world/MilitaryLocal.js';
import { upOrOut, mandatoryRetirementAge } from '../src/modules/military/Separation.js';
import { serviceWar, serviceWarFactor } from '../src/modules/world/War.js';
import { honoursList, eminence, styledName, localMedal } from '../src/modules/world/Honours.js';
import { examStatus } from '../src/modules/publicservice/PublicServiceEngine.js';
import { ExpatModule, gapYearCheck } from '../src/modules/world/Expat.js';
import { newbornCitizenships, childDualChoices } from '../src/modules/world/Nationality.js';
import { partyName, ballotSwing } from '../src/modules/politics/Parties.js';
import { familyAbroad, parentVisaCheck } from '../src/modules/people/FamilyAbroad.js';
import { coverageId, coverage as planOf } from '../src/modules/health/Insurance.js';
import { addCondition } from '../src/modules/health/HealthEngine.js';
import { levySurcharge } from '../src/modules/health/HealthSystems.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const FOREIGN = ['CA', 'GB', 'DE', 'JP', 'KR', 'IT', 'MX', 'PH', 'IN', 'AU', 'FR', 'NZ', 'IE', 'ES', 'NL', 'SE', 'BR'];

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
      // Local names, or the names of the country's immigrant communities.
      const local = new Set([...c.names.last, ...DIASPORA[id].from.flatMap(([src]) => (COMMUNITY_NAMES[src] ?? COUNTRIES[src]?.names ?? { last: [] }).last)]);
      assert.ok(local.has(state.character.lastName), `${id} surname ${state.character.lastName}`);
      const parent = state.people.list.find((p) => p.relation === 'parent');
      if (parent) assert.ok(local.has(parent.lastName));
    }
    // Over many people, most names are local and some come from immigrant communities.
    setNameCountry('DE');
    const rng = new Random(4);
    let foreign = 0;
    for (let i = 0; i < 400; i++) if (!COUNTRIES.DE.names.last.includes(randomName(rng, 'male').lastName)) foreign += 1;
    assert.ok(foreign > 40 && foreign < 160, `about a quarter of names in Germany have immigrant roots (${foreign}/400)`);
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
  'health systems: NHS waiting lists, going private, private cover, the Medicare Levy Surcharge'() {
    const t = born('GB', 26, 55);
    const { state, ctx, engine } = t;
    state.finances.cash = 50000;
    const c = addCondition(ctx, 'backInjury', { severity: 50 });
    assert.equal(c.treated, false, 'on the waiting list');
    assert.ok(c.waitUntil > state.character.age);
    engine.dispatch('health.goPrivate', 'backInjury');
    assert.ok(c.treated && c.waitUntil == null, 'paid to go private');
    // Private medical insurance skips the queue for the next one.
    engine.dispatch('health.togglePrivateCover');
    assert.ok(planOf(state).premium > 0, 'pays a premium');
    const h = addCondition(ctx, 'arthritis', { severity: 40, diagnosed: true });
    assert.ok(h.treated, 'no wait with private cover');
    // Korea's silson insurance cuts the 25% co-payment.
    const k = born('KR', 27, 40);
    const before = planOf(k.state).coinsurance;
    k.engine.dispatch('health.togglePrivateCover');
    assert.ok(planOf(k.state).coinsurance < before);
    // Australia: a high earner without private hospital cover pays the surcharge.
    const a = born('AU', 28, 40);
    a.state.finances.lastYear = { gross: 150000 };
    assert.ok(levySurcharge(a.state) > 0);
    a.engine.dispatch('health.togglePrivateCover');
    assert.equal(levySurcharge(a.state), 0);
  },
  'retiring abroad: private cover on a retiree visa, a frozen UK pension in Canada'() {
    const t = born('GB', 24, 66);
    const { state, ctx, engine } = t;
    state.retirement.ssEarnings = Array(35).fill(40000);
    arrive(ctx, 'IT', { visa: 'retiree' });
    assert.equal(coverageId(state), 'expat', 'Italy\'s elective residence visa needs private insurance');
    // Retire to Canada instead: the UK State Pension stops rising.
    const c = born('GB', 25, 66);
    c.state.retirement.ssEarnings = Array(35).fill(40000);
    c.state.character.citizenships = ['GB', 'CA'];
    arrive(c.ctx, 'CA', {});
    c.state.prompts = [];
    c.engine.dispatch('retirement.claimSocialSecurity');
    const ss = c.state.retirement.socialSecurity;
    assert.ok(ss && ss.ukShare > 0.5, 'most of it is the UK pension (Canada adds its OAS)');
    c.state.economy.inflation = 0.03;
    for (let i = 0; i < 3; i++) { c.state.prompts = []; c.engine.ageUp(); }
    assert.ok((c.state.retirement.socialSecurity.colaFactor ?? 1) < 1.04, 'the UK part is frozen (full indexing would be about 9%)');
  },
  'huge employers can force a relocation: move with the job (even abroad) or take the package'() {
    for (const choice of ['move', 'leave']) {
      const e = employed('US', choice === 'move' ? 31 : 32);
      Object.assign(e.state.career.job, { yearsAtEmployer: 6, remote: false });
      e.state.career.job.employer.size = 'mega';
      e.state.character.age = 40;
      const chance = e.engine.rng.chance;
      e.engine.rng.chance = () => true;
      e.state.prompts = [];
      ExpatModule.onAgeUp(e.engine.context());
      e.engine.rng.chance = chance;
      const p = e.state.prompts.find((x) => x.type === 'expat.relocation');
      assert.ok(p, 'a relocation');
      e.engine.resolvePrompt(p.id, choice);
      if (choice === 'move') {
        assert.ok(e.state.career.job, 'kept the job');
        assert.equal(e.state.character.regionId, p.data.regionId);
        assert.equal((e.state.character.countryId ?? 'US'), p.data.to);
      } else assert.equal(e.state.career.job, null, 'left with the package');
    }
  },
  'family abroad: they stay behind, you send money and visit, and can sponsor a parent'() {
    const t = born('IN', 23, 30);
    const { state, ctx, engine } = t;
    state.finances.cash = 100000;
    const mother = state.people.list.find((p) => p.relation === 'mother' && p.alive);
    assert.ok(mother, 'has a mother');
    arrive(ctx, 'US', { visa: 'work' });
    assert.equal(mother.livesIn, 'IN', 'parents stay behind');
    assert.ok(familyAbroad(state).includes(mother));
    const rel = mother.relationship;
    engine.dispatch('familyAbroad.send', `${mother.id}:1000`);
    assert.ok(mother.relationship > rel, 'money home helps');
    assert.equal(parentVisaCheck(state, mother).ok, false, 'the US parent visa needs citizenship');
    state.character.citizenships = ['IN', 'US'];
    assert.ok(parentVisaCheck(state, mother).ok);
    engine.rng.chance = () => true;
    engine.dispatch('familyAbroad.sponsor', mother.id);
    assert.ok(mother.sponsor, 'approved, arriving later');
    // Moving home: family are local again.
    arrive(ctx, 'IN', {});
    assert.equal(mother.livesIn, undefined);
  },
  'parties and national elections: real party names, ballots, canvassing, compulsory voting'() {
    const t = born('AU', 21, 30);
    const { state, engine } = t;
    assert.equal(partyName(state, 'labor'), 'Australian Labor Party');
    engine.dispatch('party.join', 'business');
    assert.equal(state.civic.party.bloc, 'business');
    // Campaign seasons come every other year; find one.
    let ballot = null;
    for (let i = 0; i < 4 && !ballot; i++) { state.prompts = []; engine.ageUp(); ballot = state.prompts.find((p) => p.type === 'party.ballot'); }
    assert.ok(ballot, 'a national election ballot');
    const cash = state.finances.cash;
    engine.resolvePrompt(ballot.id, 'skip');
    assert.ok(state.finances.cash < cash, 'fined for not voting in Australia');
    const body = state.legislature.bodies[ballot.data.bodyId];
    state.civic.ballots[body.id] = { choice: 'business', canvassed: true };
    assert.ok(ballotSwing(state, body) < 0, 'canvassing for the business bloc');
    state.prompts = [];
    engine.ageUp();
    assert.ok(state.civic.votes?.length, 'the result is recorded');
    // Non-citizens don't get a ballot.
    const m = born('GB', 22, 30);
    arrive(m.ctx, 'DE', { visa: 'work' });
    for (let i = 0; i < 4; i++) { m.state.prompts = []; m.engine.ageUp(); assert.ok(!m.state.prompts.some((p) => p.type === 'party.ballot')); }
  },
  'children born abroad: registration deadlines, one generation by descent, choosing at 22'() {
    // A Japanese mother in the US: the baby is American by birth, Japanese only if registered in time.
    const t = born('JP', 17, 30);
    arrive(t.ctx, 'US', { visa: 'work' });
    t.state.people.expecting = { due: true };
    const baby = { id: 'kid1', firstName: 'Ken', relation: 'child', nationality: 'US', ageOffset: -30, alive: true };
    let r = newbornCitizenships(t.state, baby);
    assert.deepEqual(r.citizenships, ['US']);
    assert.deepEqual(r.register, ['JP'], 'Japan needs the birth registered');
    // A Canadian by descent (born in the US to a Canadian parent) can't pass it on to a child born abroad.
    const c = born('US', 18, 30);
    c.state.character.citizenships = ['US', 'CA'];
    c.state.migration = { birthCountry: 'US', residences: {}, languages: {}, history: [] };
    r = newbornCitizenships(c.state, { ...baby, nationality: 'US' });
    assert.ok(r.lost.includes('CA'), 'first-generation limit');
    // An American abroad passes it on automatically.
    const a = born('US', 19, 30);
    arrive(a.ctx, 'DE', { visa: 'work' });
    r = newbornCitizenships(a.state, { ...baby, nationality: 'DE' });
    assert.ok(r.citizenships.includes('US') && !r.citizenships.includes('DE'), 'no German birthright without a settled parent');
    // A Korean-American child living in the US chooses at 22 and keeps the US passport.
    const k = born('US', 20, 50);
    k.state.people.list.push({ id: 'kid2', firstName: 'Min', relation: 'child', ageOffset: -28, alive: true, citizenships: ['US', 'KR'] });
    childDualChoices(k.ctx);
    assert.deepEqual(k.state.people.list.find((p) => p.id === 'kid2').citizenships, ['US']);
  },
  'working holidays, nomad visas, overseas assignments, gap years, US tax abroad'() {
    // A 24-year-old American can work a year in Australia, but not past 30 and only once.
    const y = born('US', 12, 24);
    y.state.finances.cash = 10000;
    const whv = routesTo(y.state, 'AU').find((r) => r.kind === 'workingHoliday');
    assert.ok(whv?.ok, whv?.reason);
    assert.equal(routesTo(y.state, 'GB').find((r) => r.kind === 'workingHoliday')?.ok ?? false, false, 'no UK youth mobility for Americans');
    y.state.prompts = [];
    const chance = y.engine.rng.chance;
    y.engine.rng.chance = () => true;
    y.engine.dispatch('migration.emigrate', 'AU:workingHoliday');
    y.engine.rng.chance = chance;
    assert.equal(y.state.character.countryId, 'AU');
    assert.equal(routesTo(born('US', 13, 31).state, 'AU').find((r) => r.kind === 'workingHoliday').ok, false, 'too old');
    // After two years the visa runs out: switch or leave.
    for (let i = 0; i < 4 && y.state.character.countryId === 'AU'; i++) {
      y.state.prompts = [];
      y.engine.ageUp();
      const lapse = y.state.prompts.find((p) => p.type === 'migration.lapsed');
      if (lapse) y.engine.resolvePrompt(lapse.id, 'leave');
    }
    assert.equal(y.state.character.countryId, undefined, 'went home when the working holiday ended');
    // Gap years are for young people between things.
    const g = born('GB', 14, 18);
    g.state.finances.cash = 10000;
    assert.ok(gapYearCheck(g.state).ok);
    g.engine.dispatch('expat.gapYear', 'travel');
    assert.equal(gapYearCheck(g.state).ok, false, 'once');
    // An overseas assignment keeps the job, pays an allowance and houses you.
    const e = employed('US', 15);
    Object.assign(e.state.career.job, { yearsAtEmployer: 3, grade: 5 });
    e.state.career.job.employer.size = 'enterprise';
    e.state.career.job.remote = false;
    e.state.character.age = 35;
    const chance2 = e.engine.rng.chance;
    e.engine.rng.chance = () => true;
    e.state.prompts = [];
    ExpatModule.onAgeUp(e.engine.context());
    e.engine.rng.chance = chance2;
    const offer = e.state.prompts.find((p) => p.type === 'expat.offer');
    assert.ok(offer, 'offered an assignment');
    e.engine.resolvePrompt(offer.id, 'accept');
    assert.equal(e.state.character.countryId, offer.data.to);
    assert.ok(e.state.career.job, 'kept the job');
    assert.ok(e.state.migration.assignment);
    // US citizens abroad file US returns; the exclusion and foreign tax credits cover them where tax is as high as at home.
    const rich = born('US', 16, 45);
    arrive(rich.ctx, 'PH', { visa: 'retiree' });
    rich.state.finances.ledger.income.push({ amount: 600000, reason: 'Salary', wage: true });
    rich.state.prompts = [];
    rich.engine.ageUp();
    assert.ok(!rich.state.finances.lastYear.usAbroadTax, 'Philippine tax credits cover the US bill');
  },
  'war at home: mobilization, asylum abroad, refugee status'() {
    // A second Korean War: the front reaches the cities.
    const t = born('KR', 7, 30);
    const { state, ctx, engine } = t;
    state.character.gender = 'female';
    const war = declareWar(ctx, 'KR', 'koreanWar');
    assert.equal(warHere(state), war);
    assert.ok(homeDanger(state) >= 0.3, 'civilians in danger');
    // Germany grants temporary protection at the border; the UK runs an ordinary claim.
    const de = routesTo(state, 'DE').find((r) => r.kind === 'asylum');
    assert.ok(de?.ok && de.temporary, 'EU temporary protection');
    const gb = routesTo(state, 'GB').find((r) => r.kind === 'asylum');
    assert.ok(gb?.ok && !gb.temporary && gb.odds > 0.6, 'a strong claim for someone fleeing a war');
    // Men of military age can't leave once mobilization is declared.
    war.mobilized = true;
    const man = born('KR', 8, 30);
    man.state.character.gender = 'male';
    man.state.world.wars.KR = war;
    assert.ok(underMobilization(man.state));
    assert.ok(/mobilization/.test(departureBlock(man.state)));
    // Flee to the UK: reception housing, no work at first, then a decision.
    state.prompts = [];
    engine.dispatch('migration.emigrate', 'GB:asylum');
    assert.equal(state.character.countryId, 'GB');
    const res = residencyOf(state);
    assert.equal(res.status, 'asylum');
    assert.equal(applicationEligibility(state, 'retail').ok, false, 'no work while the claim is new');
    engine.rng.chance = () => true;
    for (let y = 0; y < 2 && residencyOf(state)?.status === 'asylum'; y++) { state.prompts = []; engine.ageUp(); }
    assert.equal(residencyOf(state)?.status, 'refugee', 'recognized as a refugee');
    assert.ok(prYearsLeft(state) > 0, 'settlement after five years');
  },
  'police: detective chains of command, forces by area, protection is a unit of the force'() {
    setNameCountry('GB');
    const ranks = PROFESSIONS.police.levels.map((l) => l.title);
    for (const t of ['Detective Constable', 'Detective Sergeant', 'Detective Inspector', 'Detective Chief Inspector']) assert.ok(ranks.includes(t), t);
    assert.equal(PROFESSIONS.police.employerName('Truro, Cornwall', null, 'England', 'GB-ENG'), 'Devon and Cornwall Police');
    assert.equal(PROFESSIONS.police.employerName('Glasgow', null, 'Scotland', 'GB-SCT'), 'Police Scotland');
    assert.equal(PROFESSIONS.gb_usss, undefined, 'RaSP is not an agency');
    setNameCountry('US');
    assert.ok(PROFESSIONS.police.levels.some((l) => l.id === 'detSergeant' && l.abilities.includes('supervise')));
    const t = born('GB', 30, 32);
    t.state.career.job = { professionId: 'police', levelId: 'officer', grade: 4, employer: { name: 'Metropolitan Police Service', size: 'mega' } };
    assert.equal(unitName(t.state, 'protection'), 'Royalty and Specialist Protection (RaSP)');
    assert.equal(unitName(t.state, 'swat'), 'Armed Response (firearms officer)');
    t.state.career.job.employer = { name: 'Devon and Cornwall Police', size: 'large' };
    assert.equal(unitName(t.state, 'protection'), 'Protection Team');
  },
  'foreign forces: their own special duty, courses, special forces, units, discipline, careers and wars'() {
    const t = born('GB', 9, 20);
    t.state.stats.fitness = 85;
    t.state.stats.health = 90;
    t.engine.dispatch('military.enlist', 'army:enlisted:active');
    const pick = t.state.prompts.find((p) => p.type === 'military.chooseSpecialty');
    if (pick) t.engine.resolvePrompt(pick.id, pick.options[0].id);
    t.state.prompts = [];
    const svc = t.state.military.service;
    assert.equal(svc.nation, 'GB');
    assert.equal(assignmentName(svc, 'drill'), 'Section Commander, Army Training Centre');
    assert.equal(dutyFor(svc, 'msg'), null, 'no Marine Security Guards');
    assert.equal(schoolName(svc, 'pme2'), 'Section Commanders\' Battle Course');
    assert.equal(schoolName(svc, 'opme2'), 'Advanced Command and Staff Course (Shrivenham)');
    assert.equal(pipelineFor(svc, 'ranger').unitName, '22 Special Air Service Regiment');
    assert.equal(pipelineFor(svc, 'greenBeret'), null);
    assert.match(rankOf(svc).code, /^OR-/);
    assert.equal(billetTitle(svc, 'firstSergeant'), 'Company Sergeant Major');
    assert.match(summaryPunishment('GB'), /summary hearing/);
    // No up-or-out: passed over twice, a British captain stays.
    Object.assign(svc, { track: 'officer', grade: 2, passovers: 3, yearsOfService: 8 });
    assert.equal(upOrOut(t.ctx, svc), false);
    assert.equal(mandatoryRetirementAge({ ...svc, grade: 3 }), 55);
    // A war at home sends the British Army to it.
    declareWar(t.ctx, 'GB');
    assert.ok(serviceWar(t.state, svc));
    assert.ok(serviceWarFactor(t.state, svc) > 1);
  },
  'honours: national orders, knighthoods and peerages; national military decorations'() {
    // A British cabinet minister and former chief executive, honoured over the years.
    const t = born('GB', 12, 55);
    t.state.character.gender = 'male';
    t.state.politics.history.push({ officeId: 'gb_mp', startAge: 40, endAge: 50, terms: 2 }, { officeId: 'gb_pm', startAge: 50, endAge: 54, terms: 1 });
    const seen = new Set();
    const chance = t.engine.rng.chance;
    t.engine.rng.chance = () => true;
    for (let i = 0; i < 6; i++) { const got = honoursList(t.engine.context()); if (got) seen.add(got.id); }
    t.engine.rng.chance = chance;
    assert.ok(eminence(t.state) >= 240, `eminence ${eminence(t.state)}`);
    assert.ok(seen.has('knight') && seen.has('peer'), [...seen].join(','));
    assert.equal(styledName(t.state), `Lord ${t.state.character.lastName}`);
    assert.match(t.state.character.style.peerage, /^Baron /);
    // Ordinary lives aren't on the list.
    const o = born('GB', 13, 50);
    assert.equal(honoursList(o.engine.context()), null);
    // Military decorations under national names; no Purple Heart in Britain.
    assert.equal(localMedal('GB', 'moh', 'army').name, 'Victoria Cross');
    assert.equal(localMedal('GB', 'purpleHeart', 'army'), null);
    assert.equal(localMedal('IN', 'moh', 'army').name, 'Param Vir Chakra');
    assert.equal(localMedal('GB', 'silverStar', 'airforce').name, 'Distinguished Flying Cross');
  },
  'each country has only the agencies it really runs, with local ranks'() {
    const has = (cc, id) => professionsFor(born(cc).state).some((p) => p.id === id);
    assert.equal(has('JP', 'police'), false, 'no municipal police in Japan');
    assert.ok(has('JP', 'statePolice'), 'prefectural police');
    assert.equal(has('GB', 'statePolice'), false, 'no state police in the UK');
    assert.equal(has('DE', 'police'), false, 'German police are Land police');
    assert.equal(has('AU', 'police'), false);
    assert.equal(has('PH', 'statePolice'), false, 'the PNP is the only police');
    assert.ok(has('FR', 'police') && has('FR', 'statePolice'), 'police municipale and police nationale');
    assert.equal(has('GB', 'jail'), false, 'no county jails abroad');
    const jp = born('JP');
    assert.equal(PROFESSIONS.statePolice.levels.find((l) => l.id === 'trooper').title, 'Junsa (Police Officer)');
    const emp = createEmployer(new Random(1), jp.state, PROFESSIONS.statePolice, jp.state.character.regionId);
    assert.ok(/Prefectural Police|Metropolitan Police/.test(emp.name), emp.name);
    const ph = born('PH');
    ph.state.character.citizenships = ['US'];
    assert.equal(applicationEligibility(ph.state, 'police').ok, false, 'the PNP hires citizens');
    // Provincial police only where a province runs one.
    const ca = born('CA');
    const onProvince = (regionId) => { ca.state.character.regionId = regionId; return professionsFor(ca.state).some((p) => p.id === 'statePolice'); };
    assert.equal(onProvince(regionsIn('CA').find((r) => r.state === 'CA-AB').id), false, 'the RCMP polices Alberta');
    assert.ok(onProvince(regionsIn('CA').find((r) => r.state === 'CA-ON').id), 'the OPP');
    born('US');
    assert.equal(PROFESSIONS.statePolice.levels.find((l) => l.id === 'trooper').title, 'State Trooper', 'US titles back for a US life');
  },
  'citizenship gates on national service; UK citizenship six years after arrival'() {
    const t = born('US', 22, 30);
    const { state, ctx } = t;
    state.stats.health = 90;
    state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    assert.ok(programEligibility(state, 'peaceCorps', 'education').ok, 'citizens can volunteer overseas');
    arrive(ctx, 'GB', { visa: 'work' });
    assert.equal(programEligibility(state, 'americorps', 'state').ok, false, 'no AmeriCorps in the UK');
    assert.equal(programEligibility(state, 'peaceCorps', 'education').ok, false, 'VSO is for British citizens');
    const res = residencyOf(state);
    Object.assign(res, { status: 'permanent', permanentSince: 35, arrived: 30 });
    state.character.age = 35;
    assert.equal(naturalizationYearsLeft(state), 1, 'five years to settlement, then one more');
    state.character.age = 36;
    assert.equal(naturalizationYearsLeft(state), 0);
    const fr = born('FR', 23, 30);
    fr.state.stats.health = 90;
    fr.state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
    assert.ok(programEligibility(fr.state, 'americorps', 'state').ok, 'Service Civique');
    assert.equal(programEligibility(fr.state, 'americorps', 'vista').ok, false);
    assert.ok(localizeHtml('<p>Peace Corps</p>', COUNTRIES.FR).includes('France Volontaires'));
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
      // Newcomers get until the end of their second year.
      state.prompts = [];
      engine.ageUp();
      assert.equal(state.character.countryId, 'GB', 'still within the newcomer grace period');
      state.prompts = [];
      engine.ageUp();
      const lapse = state.prompts.find((p) => p.type === 'migration.lapsed');
      assert.ok(lapse, 'told the visa has lapsed');
      engine.resolvePrompt(lapse.id, 'leave');
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
  'immigration: settled status first, country-bound exams, overstays and bans, degrees keep their origin, harder recognition'() {
    // Korea: five years' residence AND permanent residence; a student's years don't count.
    const k = born('US', 20, 30);
    arrive(k.ctx, 'KR', { visa: 'student' });
    const kres = residencyOf(k.state);
    assert.equal(kres.qualifyingSince ?? null, null, 'study years are not qualifying residence');
    k.state.character.age += 6;
    assert.equal(naturalizationYearsLeft(k.state), null, 'no citizenship without permanent residence');
    // Civil-service exams belong to the country that set them.
    const e = born('US', 22, 30);
    e.state.publicService.exams.general = { age: e.state.character.age, score: 95, country: 'US' };
    assert.ok(examStatus(e.state, 'general').passed);
    arrive(e.ctx, 'GB', { visa: 'work' });
    assert.equal(examStatus(e.state, 'general').taken, false, 'a US exam means nothing in Whitehall');
    // A lapsed visa: stay on without status, get caught, get banned.
    const o = born('US', 25, 30);
    arrive(o.ctx, 'GB', { visa: 'work' });
    o.state.prompts = [];
    for (let i = 0; i < 3 && !o.state.prompts.some((p) => p.type === 'migration.lapsed'); i++) { o.state.prompts = []; o.engine.ageUp(); }
    const lapse = o.state.prompts.find((p) => p.type === 'migration.lapsed');
    assert.ok(lapse, 'the visa ran out without a job');
    assert.ok(lapse.options.find((x) => x.id === 'overstay').illegal, 'overstaying is flagged');
    o.engine.resolvePrompt(lapse.id, 'overstay');
    assert.equal(residencyOf(o.state).status, 'undocumented');
    const chance = o.engine.rng.chance;
    o.engine.rng.chance = () => true;
    for (let i = 0; i < 3 && o.state.character.countryId === 'GB'; i++) { o.state.prompts = []; o.engine.ageUp(); }
    o.engine.rng.chance = chance;
    assert.equal(o.state.character.countryId, undefined, 'deported');
    assert.ok(bannedFrom(o.state, 'GB'), 'barred from returning');
    assert.equal(routesTo(o.state, 'GB').some((r) => r.ok), false, 'no visa while banned');
    // Degrees keep the country and university they came from.
    const d = born('GB', 22, 24);
    d.state.education.degrees.push({ type: 'bachelor', major: 'history', age: 21 });
    d.state.prompts = [];
    d.engine.ageUp();
    assert.equal(d.state.education.degrees.at(-1).country, 'GB');
    arrive(d.ctx, 'US', {});
    assert.equal(d.state.education.degrees.at(-1).country, 'GB', 'still a British degree');
    // Recognition: police training never transfers; doctors from outside a peer system retrain in two stages.
    assert.equal(recognitionRoute('post', ['US'], 'GB').method, 'notRecognized');
    const md = recognitionRoute('medicalLicense', ['IN'], 'US');
    assert.equal(md.method, 'retrain');
    assert.equal(md.stages, 2);
    assert.equal(recognitionRoute('medicalLicense', ['GB'], 'AU').method, 'peerAssessment');
    assert.ok(recognitionRoute('rn', ['PH'], 'GB').difficulty > recognitionRoute('rn', ['JP'], 'GB').difficulty, 'unfamiliar systems face harder assessment');
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
  'Australia and France: tax, super, the Legion, senators, inheritance'() {
    // Australia: A$100,000 → A$20,788 income tax (2025–26) plus the 2% Medicare levy.
    const au = COUNTRIES.AU;
    const auTax = nationalIncomeTax(au, Math.round(100000 / 1.45));
    assert.ok(Math.abs(auTax - Math.round(20788 / 1.45)) < 150, `AU tax ${auTax}`);
    assert.ok(Math.abs(socialContributions(au, Math.round(100000 / 1.45)) - Math.round(2000 / 1.45)) < 30, 'Medicare levy');
    // France: €50,000 single → about €7,000 income tax (one part, before the 10% expense allowance).
    const frTax = nationalIncomeTax(COUNTRIES.FR, Math.round(50000 / 0.71));
    assert.ok(frTax > Math.round(6500 / 0.71) && frTax < Math.round(8500 / 0.71), `FR tax ${frTax}`);
    // Super: the employer adds 12% of wages.
    const t = employed('AU', 31);
    const before = t.state.retirement.dc;
    t.engine.ageUp();
    assert.ok(t.state.retirement.dc - before >= Math.round(t.state.career.job.salary * 0.12) - 1, 'super guarantee paid');
    // The Foreign Legion takes a non-French resident; the army doesn't.
    const f = born('US', 32, 24);
    arrive(f.ctx, 'FR', { visa: 'work' });
    f.state.stats.fitness = 80;
    f.state.stats.health = 90;
    assert.equal(enlistmentEligibility(f.state, 'army', 'enlisted', 'active').ok, false);
    assert.ok(enlistmentEligibility(f.state, 'marines', 'enlisted', 'active').ok, 'Légion étrangère');
    // French senators are chosen by local officials.
    const s2 = born('FR', 33, 40);
    assert.match(runEligibility(s2.state, 'fr_senateur').reason, /local officials/);
    // French inheritance tax per child above €100,000; Australia has none.
    assert.ok(inheritanceTax('FR', 1000000, 2) > 0);
    assert.equal(inheritanceTax('AU', 5000000, 2), 0);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} country test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} country tests passed`);
