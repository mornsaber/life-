/**
 * Uniformed services abroad: service words (world/ServiceTerms.js), promotion by country
 * (publicsafety/CivilService.js), Brazil's two police forces, unarmed patrol, volunteer fire
 * brigades in Germany's towns, and Paris's army fire brigade.
 *
 *   node tests/servicesabroad.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire, promotionStatus, applicationEligibility, PROMO_GATES } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { localizeHtml, COUNTRIES } from '../src/modules/world/Countries.js';
import { systemOf, nextExam, sitExam, listTick } from '../src/modules/publicsafety/CivilService.js';
import { unarmedPatrol } from '../src/modules/publicsafety/PoliceLife.js';
import { localAgency } from '../src/modules/world/LocalAgencies.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function officer(countryId, professionId, levelId, { regionId = null, years = 24 } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(8), modules: MODULES });
  const state = engine.newLife({ countryId, startYear: 1980 });
  for (let i = 0; i < years; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  if (regionId) state.character.regionId = regionId;
  Object.assign(state.stats, { smarts: 95, health: 90 });
  const ctx = engine.context();
  if (professionId) {
    const profession = getProfession(professionId);
    hire(ctx, { professionId, levelId, employer: createEmployer(new Random(8), state, profession, state.character.regionId) });
    state.prompts = [];
  }
  return { engine, state, ctx, job: state.career.job };
}
const say = (cc, text) => localizeHtml(`<p>${text}</p>`, COUNTRIES[cc]).replace(/<\/?p>/g, '');
/** What the promotion gates say about a rank (credentials and time in rank aside). */
const gateOf = (state, levelId) => { const job = state.career.job; const level = getProfession(job.professionId).levels.find((l) => l.id === levelId); return PROMO_GATES.map((g) => g(state, job, level)).filter(Boolean).join(' · '); };

const tests = {
  'American police words become the local thing abroad, and stay American at home'() {
    assert.equal(say('GB', 'Hold the perimeter and wait for SWAT'), 'Hold the perimeter and wait for armed police');
    assert.match(say('DE', 'The K-9 unit tracked him'), /Diensthundestaffel/);
    assert.match(say('FR', 'Downtown precinct'), /City-centre station/);
    assert.match(say('IE', 'You graduated from the police academy'), /Garda College/);
    assert.match(say('IT', 'The grand jury declined to indict'), /Prosecutors declined to charge/);
    assert.equal(localizeHtml('<p>wait for SWAT</p>', COUNTRIES.US), '<p>wait for SWAT</p>');
    // A British army trooper keeps his rank.
    assert.match(say('GB', 'Trooper Smith'), /Trooper Smith/);
  },
  'each country promotes its own way'() {
    const kinds = Object.fromEntries([['US', 'police'], ['GB', 'police'], ['JP', 'statePolice'], ['FR', 'statePolice'], ['DE', 'statePolice'], ['IN', 'statePolice']].map(([cc, id]) => {
      const { state, job } = officer(cc, id, id === 'police' ? 'officer' : 'trooper', { years: 22 });
      return [cc, systemOf(job, state).kind];
    }));
    assert.deepEqual(kinds, { US: 'list', GB: 'qualify', JP: 'rankExam', FR: 'concours', DE: 'track', IN: 'committee' });
  },
  'Britain: pass the sergeants\' exam, then a board; no inspectors\' exam until you\'re a sergeant'() {
    const { state, ctx, job } = officer('GB', 'police', 'officer');
    const next = nextExam(job, state);
    assert.equal(next.id, 'sergeant');
    job.yearsInLevel = 5; job.performance = 90;
    assert.match(gateOf(state, 'sergeant'), /sergeants' exam/);
    state.police ??= { area: 'downtown', shift: 'days', unit: null, bureau: null, calls: 0, arrests: 0, uof: 0, complaints: 0, commendations: 0, ois: 0, injuries: 0, brady: false, details: 0 };
    assert.match(VIEWS.career(state), /sergeants(&#39;|') exam/);
    for (let i = 0; i < 6 && job.qualified?.sergeant == null; i++) { state.yearly = {}; sitExam(ctx, { prep: true }); }
    assert.ok(job.qualified?.sergeant != null, 'qualified');
    assert.equal(nextExam(job, state), null, 'waiting for a board, not testing for inspector');
    assert.ok(!/sergeants' exam/.test(gateOf(state, 'sergeant')));
  },
  'Japan: a hard exam at every rank'() {
    const { state, ctx, job } = officer('JP', 'statePolice', 'trooper');
    const lvl = nextExam(job, state);
    assert.ok(lvl, 'an exam');
    job.yearsInLevel = 10; job.performance = 95;
    assert.match(gateOf(state, lvl.id), /promotion exam/);
    const r = sitExam(ctx, {});
    assert.ok(r && 'pass' in r);
  },
  'France: win a place in the concours, a year at the school, then the rank'() {
    const { state, ctx, job } = officer('FR', 'statePolice', 'trooper');
    job.yearsAtEmployer = 5; job.performance = 90;
    for (let i = 0; i < 8 && !job.schooling; i++) { state.yearly = {}; sitExam(ctx, { prep: true }); }
    assert.ok(job.schooling, 'a place at the school');
    const target = job.schooling.levelId;
    state.character.age = job.schooling.until;
    listTick(ctx);
    assert.equal(job.levelId, target, 'promoted on finishing');
  },
  'Germany: the next track needs four years and good appraisals first'() {
    const { state, ctx, job } = officer('DE', 'statePolice', 'trooper');
    job.yearsAtEmployer = 1;
    assert.equal(sitExam(ctx, {}), null, 'not yet eligible');
    assert.ok(!job.schooling);
  },
  'India: the promotion committee goes by seniority'() {
    const { state, job } = officer('IN', 'statePolice', 'trooper');
    job.yearsInLevel = 4; job.performance = 95;
    assert.match(gateOf(state, 'senior'), /seniority/);
  },
  'Brazil: a Military Police soldier isn\'t promoted into the Civil Police'() {
    const { state, job } = officer('BR', 'statePolice', 'trooper');
    job.yearsInLevel = 10; job.performance = 95;
    const ic = (promotionStatus(state).all ?? []).filter((l) => l.track === 'ic');
    assert.ok(ic.every((l) => /Polícia Civil|separate force/.test(l.blocked ?? '')) || !ic.length);
  },
  'Britain, Ireland and New Zealand patrol unarmed'() {
    assert.ok(unarmedPatrol(officer('GB', 'police', 'officer', { years: 22 }).state));
    assert.ok(!unarmedPatrol(officer('US', 'police', 'officer', { years: 22 }).state));
  },
  'Germany\'s towns have volunteer brigades; the career service is in the cities'() {
    const town = officer('DE', null, null, { regionId: 'passau', years: 22 });
    assert.match(applicationEligibility(town.state, 'fire').reason ?? '', /volunteers/);
    const city = officer('DE', null, null, { regionId: 'berlin', years: 22 });
    assert.ok(!/volunteers/.test(applicationEligibility(city.state, 'fire').reason ?? ''));
  },
  'Paris\'s fire brigade is an army unit, Marseille\'s a navy one'() {
    const fire = localAgency('FR', 'fire');
    assert.match(fire.employer('Paris'), /Armée de terre/);
    assert.match(fire.employer('Marseille'), /Marine nationale/);
    assert.match(fire.employer('Lyon'), /SDIS/);
  },
  'conscription of its day: British National Service, French service militaire, none in Britain after 1960'() {
    const callUp = (countryId, startYear) => {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
      const state = engine.newLife({ countryId, startYear, gender: 'male' });
      for (let i = 0; i < 18 && state.character.alive; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
      return state.prompts.find((p) => p.type.startsWith('conscription.'));
    };
    assert.match(callUp('GB', 1932)?.title ?? '', /National Service/);
    assert.match(callUp('FR', 1960)?.title ?? '', /Service militaire/);
    assert.match(callUp('DE', 1965)?.options.map((o) => o.label).join(' ') ?? '', /Zivildienst/);
    assert.equal(callUp('GB', 1980), undefined, 'no call-up after 1960');
    assert.equal(callUp('IL', 1920), undefined, 'no Israeli call-up before the state');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
