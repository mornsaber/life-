/**
 * International organisations and the Order of Malta: competitions, duty stations,
 * tax-exempt pay, top appointments, Malta membership and vows, and the passports.
 *
 *   node tests/intlorgs.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { applicationEligibility, hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession, JOB_FIELDS, professionsFor } from '../src/modules/career/JobTrees.js';
import { INTL_ORG_IDS } from '../src/modules/career/IntlOrgCareers.js';
import { servicePassports } from '../src/modules/world/Passports.js';
import { styledName } from '../src/modules/world/Honours.js';
import { OFFICES } from '../src/modules/politics/Offices.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { foreignAwardsYear } from '../src/modules/world/ForeignAwards.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'IE', ...opts });
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
  state.prompts = [];
};
const graduate = (state, type = 'master') => {
  state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'internationalRelations', schoolId: 'state', gpa: 3.6, year: 22 });
  if (type === 'master') state.education.degrees.push({ type: 'master', programId: 'master', major: 'economics', schoolId: 'elite', gpa: 3.8, year: 24 });
};
const always = (rng) => Object.assign(Object.create(Object.getPrototypeOf(rng)), rng, { chance: () => true });

const tests = {
  'the careers exist everywhere, on their own job-board field'() {
    assert.deepEqual([...JOB_FIELDS.intl.ids, ...JOB_FIELDS.holySee.ids].sort(), [...INTL_ORG_IDS].sort());
    for (const cc of ['US', 'IE', 'KE', 'CH', 'MT', 'ET']) {
      const { state } = life({ countryId: cc });
      const ids = professionsFor(state).map((p) => p.id);
      for (const id of INTL_ORG_IDS) assert.ok(ids.includes(id), `${id} in ${cc}`);
    }
  },
  'EU institutions: EU citizens who passed EPSO; the job moves you to Brussels with tax-free pay'() {
    const { engine, state } = life({}, 7);
    year(engine, state, 25);
    graduate(state);
    state.stats.smarts = 80;
    assert.match(applicationEligibility(state, 'euInstitutions').reason, /EPSO/);
    const rng0 = engine.context().rng;
    const chance0 = rng0.chance;
    rng0.chance = () => true;
    engine.dispatch('intlOrgs.sit', 'epso');
    rng0.chance = chance0;
    assert.ok(state.intlOrgs.competitions.epso.passed);
    const ctx = engine.context();
    const employer = createEmployer(ctx.rng, state, getProfession('euInstitutions'), state.character.regionId);
    employer.name = 'European Commission';
    hire(ctx, { professionId: 'euInstitutions', levelId: 'ad5', employer });
    assert.equal(state.character.posting?.place, 'Brussels');
    assert.equal(state.character.posting.countryId, 'BE');
    year(engine, state, 1);
    const salary = state.finances.ledger.income.find((i) => /^Salary — /.test(i.source));
    assert.ok(!salary || salary.taxFree > 0, 'EU pay is mostly exempt from national tax');
    assert.ok(servicePassports(state).some((p) => p.kind === 'laissezPasser' && p.country === 'EU'));
    const americans = life({ countryId: 'US' }, 8).state;
    americans.character.age = 30;
    graduate(americans);
    americans.intlOrgs.competitions.epso = { passed: true };
    assert.match(applicationEligibility(americans, 'euInstitutions').reason, /EU citizens/);
  },
  'NATO is for citizens of members; the UN takes lateral hires with experience'() {
    const { state } = life({ countryId: 'CH' }, 9);
    state.character.age = 35;
    graduate(state);
    assert.match(applicationEligibility(state, 'nato').reason, /NATO/);
    assert.match(applicationEligibility(state, 'unSecretariat').reason, /experience/);
    state.career.history.push({ professionId: 'foreignService', startAge: 25, endAge: 34 });
    assert.equal(applicationEligibility(state, 'unSecretariat').ok, true);
  },
  'a former head of government is offered a top post and serves a term'() {
    const { engine, state } = life({ countryId: 'NO' }, 11);
    year(engine, state, 50);
    state.politics.history = [{ officeId: Object.keys(OFFICES).find((id) => OFFICES[id].country === 'NO' && OFFICES[id].leader && OFFICES[id].level >= 5) ?? 'no_pm', startAge: 40, endAge: 48, reason: 'Resigned' }];
    const ctx = engine.context();
    MODULES.find((m) => m.id === 'intlOrgs').resolvers.appointment({ ...ctx, rng: always(ctx.rng) }, { post: 'natoSG', employer: 'NATO Headquarters (International Staff)' }, 'accept');
    assert.equal(state.career.job?.professionId, 'nato');
    assert.match(state.career.job.title, /Secretary General/);
    assert.ok(state.career.job.intlTerm > state.character.age);
    year(engine, state, 10);
    assert.notEqual(state.career.job?.title, 'Secretary General of NATO', 'the term ends');
  },
  'the Order of Malta: Catholics join, profess vows as Fra, and can be elected Grand Master'() {
    const { engine, state } = life({ countryId: 'MT' }, 12);
    year(engine, state, 30);
    state.community.faith = { traditionId: 'catholic', attendance: 'devout', joinedAge: 0 };
    for (const p of state.people.list) if (['spouse', 'fiance', 'partner'].includes(p.relation)) p.relation = 'ex';
    state.character.gender = 'male';
    state.finances.cash = 50000;
    const ctx = engine.context();
    const chance0 = ctx.rng.chance;
    ctx.rng.chance = () => true;
    engine.dispatch('intlOrgs.joinMalta');
    ctx.rng.chance = chance0;
    assert.ok(state.malta?.grade);
    state.malta.since -= 5;
    engine.dispatch('intlOrgs.obedience');
    assert.equal(state.malta.grade, 'obedience');
    state.malta.obedienceAt -= 3;
    engine.dispatch('intlOrgs.profess');
    assert.equal(state.malta.grade, 'justice');
    assert.match(styledName(state), /^Fra /);
    state.character.age = Math.max(state.character.age, 55);
    Object.assign(state.malta, { since: state.character.age - 20, office: 'council', officeSince: state.character.age });
    const c2 = engine.context();
    MODULES.find((m) => m.id === 'intlOrgs').onAgeUp({ ...c2, rng: always(c2.rng), spend: c2.spend, log: c2.log, stat: c2.stat, earn: c2.earn, prompt: c2.prompt });
    assert.equal(state.malta.office, 'grandMaster');
    assert.match(styledName(state), /Most Eminent Highness Fra/);
    assert.ok(servicePassports(state).some((p) => p.country === 'SMOM' && p.kind === 'diplomatic'));
    assert.ok(VIEWS.career(state, {}).includes('Order of Malta'));
  },
  'MEPs are elected in EU member states'() {
    assert.ok(OFFICES.ie_mep && OFFICES.mt_mep && OFFICES.de_mep);
    assert.ok(!OFFICES.ch_mep && !OFFICES.us_mep);
  },
  'foreign states decorate ambassadors, leaders and generals; the Order of Malta its friends'() {
    const { engine, state } = life({ countryId: 'GB' }, 41);
    state.character.age = 50;
    const ctx = engine.context();
    const lucky = { ...ctx, rng: always(ctx.rng), log: ctx.log, stat: ctx.stat, earn: ctx.earn };
    state.politics.office = { id: 'gb_pm', approval: 60, startAge: 45, terms: 1 };
    foreignAwardsYear(lucky);
    const foreign = state.honors.filter((h) => h.source === 'foreign' && h.country);
    assert.ok(foreign.length, 'a foreign order');
    assert.match(foreign[0].name, /honorary/);
    assert.ok(state.honors.some((h) => h.id === 'smom.proMerito' && /Collar/.test(h.name)), 'a head of government gets the Collar pro Merito Melitensi');
    assert.ok(!/^Sir /.test(styledName(state)) || state.honors.some((h) => h.source === 'order' && h.country === 'GB'), 'no title from a foreign award');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 5).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} intl-org test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} intl-org tests passed`);
