/**
 * Housing at international duty stations; instant university decisions; and the military in
 * war and after: fast and battlefield promotions, acting rank, the peace's drawdown and
 * demobilization, five-star rank, brevet promotion, and the reserve liability with recall.
 *
 *   node tests/wartime.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { housingStatus } from '../src/modules/realestate/HousingEngine.js';
import { postedHousing } from '../src/modules/world/Posting.js';
import { enlist, rankOf, timeInGradeRequired, discharge, rankTitles } from '../src/modules/military/MilitaryEngine.js';
import { declareWar } from '../src/modules/world/War.js';
import { battlefieldPromotion, fiveStarTitle } from '../src/modules/military/Wartime.js';
import { mustRetire } from '../src/modules/military/Separation.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1, pick = null) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) {
      const q = state.prompts[0];
      engine.resolvePrompt(q.id, (pick?.(q) ?? q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id);
    }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
};
const always = (rng, fn) => { const c = rng.chance; rng.chance = () => true; try { return fn(); } finally { rng.chance = c; } };
const soldier = (seed = 3, track = 'enlisted') => {
  const t = life({ gender: 'male' }, seed);
  year(t.engine, t.state, 20);
  t.state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 }, { type: 'bachelor', programId: 'bachelor', major: 'history', schoolId: 'state', gpa: 3.5, year: 22 });
  t.state.stats.fitness = 90;
  enlist(t.ctx, { branch: 'army', track, component: 'active', specialty: 'infantry' });
  const svc = t.state.military.service;
  if (svc) { svc.cadet = false; svc.training = null; svc.isNew = false; }
  t.state.prompts = [];
  return t;
};

const tests = {
  'an international posting: the home lease goes, the duty-station flat is subsidised, a field post is housed'() {
    const { engine, state, ctx } = life({}, 5);
    year(engine, state, 26);
    state.finances.cash = 50000;
    const p = getProfession('unAgencies');
    const employer = createEmployer(engine.rng, state, p, state.character.regionId);
    employer.name = 'World Food Programme';
    hire(ctx, { professionId: 'unAgencies', levelId: p.levels[0].id, employer });
    assert.equal(postedHousing(state), 'local');
    assert.equal(state.housing.rental?.regionId, 'rome', 'a flat in Rome');
    assert.equal(state.housing.withParents, false);
    assert.equal(housingStatus(state), 'renting');
    // On to a field post: housed in the compound, the Rome lease ends.
    state.character.posting.place = 'Juba';
    assert.equal(postedHousing(state), 'provided');
    assert.equal(housingStatus(state), 'employerProvided');
    // The posting ends with the job: back home, in a place of your own.
    state.character.posting.place = 'Rome';
    state.prompts = [];
    engine.dispatch('career.quit');
    if (!state.career.job) {
      assert.equal(state.character.posting, null);
      assert.ok(!state.housing.rental?.posted, 'the duty-station lease ended');
    }
  },
  'international staff aren\'t laid off by the business cycle'() {
    const { engine, state, ctx } = life({}, 3);
    year(engine, state, 26);
    const p = getProfession('unSecretariat');
    hire(ctx, { professionId: 'unSecretariat', levelId: p.levels[1].id, employer: createEmployer(engine.rng, state, p, state.character.regionId) });
    state.economy.phase = 'recession';
    let laidOff = 0;
    for (let i = 0; i < 8 && state.career.job; i++) { year(engine, state, 1, (q) => (q.type === 'intlOrgs.rotation' ? q.options[0] : null)); if (!state.career.job && /reduction in force/.test(state.career.history.at(-1)?.reason ?? '')) laidOff += 1; }
    assert.equal(laidOff, 0);
  },
  'in a war: promotions come twice as fast; a hero can be promoted on the battlefield'() {
    const { state, ctx } = soldier(3);
    const svc = state.military.service;
    const peace = timeInGradeRequired({ ...svc, grade: 3 });
    svc.wartime = true;
    assert.ok(timeInGradeRequired({ ...svc, grade: 3 }) < peace || peace === 1);
    declareWar(ctx, 'US');
    const before = svc.grade;
    always(ctx.rng, () => battlefieldPromotion(ctx, svc, 95));
    assert.equal(svc.grade, before + 1);
    assert.equal(svc.warPromotions, 1);
  },
  'acting rank in the war, and the peace takes it back; wartime soldiers are demobilized'() {
    const { engine, state, ctx } = soldier(4);
    declareWar(ctx, 'US');
    const svc = state.military.service;
    svc.eval = 90;
    svc.grade = 2;
    const mod = MODULES.find((m) => m.id === 'wartime');
    always(ctx.rng, () => mod.onAgeUp(ctx));
    assert.ok(svc.wartime && svc.warEnlisted, 'joined for the war');
    assert.ok(svc.acting, 'acting rank');
    assert.match(rankOf(svc).title, /^Acting /);
    delete state.world.wars.US;
    state.prompts = [];
    mod.onAgeUp(ctx);
    assert.ok(!svc.acting);
    assert.equal(svc.grade, 2, 'back to the substantive rank');
    const q = state.prompts.find((p) => p.type === 'wartime.demob');
    assert.ok(q, 'demobilization');
    engine.resolvePrompt(q.id, 'demob');
    assert.equal(state.military.service, null);
    assert.ok(state.military.liability, 'into the Individual Ready Reserve');
  },
  'five stars for the commander of a major war — and no retirement'() {
    const { state, ctx } = soldier(5, 'officer');
    const svc = state.military.service;
    svc.grade = rankTitles(svc).length - 1;
    svc.topPost = { id: 'cjcs', yearsLeft: 2 };
    const war = declareWar(ctx, 'US');
    Object.assign(war, { intensity: 3, years: 3 });
    svc.wartime = true;
    always(ctx.rng, () => MODULES.find((m) => m.id === 'wartime').onAgeUp(ctx));
    assert.ok(svc.fiveStar);
    assert.equal(rankOf(svc).title, fiveStarTitle(svc));
    assert.equal(rankOf(svc).title, 'General of the Army');
    state.character.age = 80;
    assert.equal(mustRetire(state, svc), false);
  },
  'a decorated soldier retires by brevet a grade up'() {
    const { state, ctx } = soldier(6);
    const svc = state.military.service;
    svc.grade = 6;
    svc.combatTours = 4;
    svc.eval = 95;
    svc.wounds = 1;
    state.honors.push({ id: 'ss1', source: 'military', name: 'Silver Star', valor: true }, { id: 'ss2', source: 'military', name: 'Distinguished Service Cross', valor: true });
    always(ctx.rng, () => discharge(ctx, 'retired', 'Retired.'));
    assert.equal(state.military.history.at(-1).brevet, rankTitles({ ...svc, grade: 7 })[7]);
  },
  'officer cadets abroad go through their academy: Saint-Cyr takes three years and gives a master\'s'() {
    const { engine, state, ctx } = life({ countryId: 'FR', gender: 'male' }, 12);
    year(engine, state, 18);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
    state.stats.fitness = 85;
    state.stats.smarts = 85;
    enlist(ctx, { branch: 'army', track: 'officer', component: 'active', specialty: 'infantry' });
    const svc = state.military.service;
    assert.match(svc?.academy?.name ?? '', /Saint-Cyr/);
    assert.equal(svc.academy.yearsLeft, 3);
    year(engine, state, 3);
    assert.ok(!state.military.service?.academy, 'graduated');
    assert.ok(state.education.degrees.some((d) => d.type === 'master' && /Saint-Cyr/.test(d.academy ?? '')));
  },
  'after captivity: a book offer, and the past coming back'() {
    const { engine, state, ctx } = life({}, 13);
    year(engine, state, 30);
    state.military.exPow = { years: 2, since: state.character.age - 3 };
    state.prompts = [];
    always(ctx.rng, () => MODULES.find((m) => m.id === 'wartime').onAgeUp(ctx));
    assert.ok(state.prompts.some((p) => p.type === 'wartime.powBook'));
  },
  'abroad the reserve runs to an age limit, and a war calls you back'() {
    const { engine, state, ctx } = life({ countryId: 'DE', gender: 'male' }, 7);
    year(engine, state, 25);
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
    state.stats.fitness = 90;
    enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' });
    assert.ok(state.military.service);
    discharge(ctx, 'honorable', 'End of contract.');
    assert.equal(state.military.liability?.untilAge, 45);
    declareWar(ctx, 'DE');
    state.prompts = [];
    always(ctx.rng, () => MODULES.find((m) => m.id === 'wartime').onAgeUp(ctx));
    const q = state.prompts.find((p) => p.type === 'wartime.recall');
    assert.ok(q, 'recall orders');
    engine.resolvePrompt(q.id, 'report');
    assert.ok(state.military.service, 'back in uniform');
    assert.ok(state.military.service.warEnlisted);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} wartime test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} wartime tests passed`);
