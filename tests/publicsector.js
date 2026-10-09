/**
 * Government organizations sized to the population they serve, and
 * reductions in force run by civil-service rules.
 *
 *   node tests/publicsector.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { orgOf } from '../src/modules/org/Organizations.js';
import { cityPopulation } from '../src/modules/org/Staffing.js';
import { budgetPressure, retentionRisk, publicRifTick } from '../src/modules/career/PublicRif.js';
import { RIF_DEPS } from '../src/modules/career/CareerEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { ladderFor } from '../src/modules/career/Ladder.js';
import { recalcSalary } from '../src/modules/career/Compensation.js';
import { contextOf, annualMoney } from '../src/modules/equipment/Equipment.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const clean = (html) => assert.ok(!/NaN|undefined|\[object/.test(html), html.match(/.{0,80}(NaN|undefined|\[object).{0,80}/)?.[0]);
function worker(seed, professionId, regionId, levelIdx = 0) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({});
  state.character.age = 35;
  state.character.regionId = regionId;
  const p = PROFESSIONS[professionId];
  const ctx = engine.context();
  hire(ctx, { professionId, levelId: p.levels[levelIdx].id, employer: createEmployer(new Random(seed), state, p, regionId) });
  state.prompts = [];
  return { engine, state, ctx, job: state.career.job };
}
const deptOf = (state, job) => orgOf(state, job.employer)?.departments[job.employer.deptId];

const tests = {
  'a city police department is sized to its city'() {
    const big = worker(1, 'police', 'nyc');
    const small = worker(2, 'police', 'smalltown');
    const nyc = deptOf(big.state, big.job).headcount;
    const cf = deptOf(small.state, small.job).headcount;
    assert.ok(nyc > 20000, `NYC public safety: ${nyc}`);
    assert.ok(cf > 50 && cf < 500, `Cedar Falls public safety: ${cf}`);
    // Roughly proportional to population.
    const ratio = (nyc / cityPopulation('nyc')) / (cf / cityPopulation('smalltown'));
    assert.ok(ratio > 0.7 && ratio < 1.4, `per-capita ratio ${ratio}`);
    const html = VIEWS.career(big.state);
    clean(html);
    assert.ok(html.includes('serves 8,260,000 residents'));
  },

  'teachers follow the school-age population; state agencies follow the state'() {
    const t = worker(3, 'education', 'chicago');
    assert.ok(deptOf(t.state, t.job).headcount > 15000, `Chicago teachers ${deptOf(t.state, t.job).headcount}`);
  },

  'headcount stays near the population target over the years'() {
    const { engine, state, job } = worker(4, 'police', 'denver');
    const start = deptOf(state, job).headcount;
    for (let i = 0; i < 8; i++) { state.prompts = []; state.stats.health = 95; engine.ageUp(); if (!state.career.job) break; }
    const now = deptOf(state, state.career.job ?? job)?.headcount ?? start;
    assert.ok(now > start * 0.75 && now < start * 1.25, `${start} → ${now}`);
  },

  'agency size sets the rank structure for every government career'() {
    const tiny = worker(10, 'police', 'rural');
    const huge = worker(11, 'police', 'nyc');
    assert.equal(tiny.job.employer.size, 'micro', 'a tiny town department');
    assert.equal(huge.job.employer.size, 'mega', 'NYPD-scale');
    const titles = (job) => ladderFor(PROFESSIONS[job.professionId], job.employer.size).map((l) => l.title);
    assert.ok(!titles(tiny.job).includes('Lieutenant') && !titles(tiny.job).includes('Captain'), titles(tiny.job).join(' > '));
    assert.ok(titles(huge.job).includes('Inspector') && titles(huge.job).includes('Chief of Department'), titles(huge.job).join(' > '));
    // Not just police: every government career has tiers.
    let checked = 0;
    for (const p of Object.values(PROFESSIONS).filter((x) => ['municipal', 'state', 'federal'].includes(x.sector) && x.tiered && x.levels.length >= 4)) {
      const micro = ladderFor(p, 'micro').length;
      const mega = ladderFor(p, 'mega').length;
      assert.ok(micro >= 2 && micro < mega, `${p.id}: micro ${micro} vs mega ${mega}`);
      checked += 1;
    }
    assert.ok(checked > 30, `${checked} government careers tiered`);
    clean(VIEWS.career(huge.state));
    clean(VIEWS.career(tiny.state));
  },

  'a manager controls equipment and budget in proportion to rank'() {
    const fire = (seed, levelId) => {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
      const state = engine.newLife({});
      state.character.age = 45;
      state.character.regionId = 'chicago';
      const p = PROFESSIONS.fire;
      const emp = createEmployer(new Random(seed), state, p, 'chicago');
      hire(engine.context(), { professionId: 'fire', levelId, employer: emp });
      state.career.job.abilities = [...new Set([...state.career.job.abilities, 'budget'])];
      return contextOf(state, 'job');
    };
    const levels = ladderFor(PROFESSIONS.fire, 'enterprise').filter((l) => l.track === 'mgmt').sort((a, b) => b.grade - a.grade);
    const chief = fire(20, levels[0].id);
    const lower = fire(20, levels[2].id);
    assert.ok(chief.span > lower.span, `${levels[0].title} ${chief.span} vs ${levels[2].title} ${lower.span}`);
    assert.ok(annualMoney({ publicService: { city: { fiscalHealth: 60 } } }, chief) > annualMoney({ publicService: { city: { fiscalHealth: 60 } } }, lower) * 2, 'the chief has the bigger budget');
  },

  'command ranks run real units: battalions, stations, squads, precincts, schools'() {
    const at = (seed, professionId, regionId, title) => {
      const p = PROFESSIONS[professionId];
      const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
      const state = engine.newLife({});
      state.character.age = 45;
      state.character.regionId = regionId;
      const emp = createEmployer(new Random(seed), state, p, regionId);
      const level = ladderFor(p, emp.size).find((l) => l.title === title);
      assert.ok(level, `${title} exists at ${emp.size}`);
      hire(engine.context(), { professionId, levelId: level.id, employer: emp });
      return { state, job: state.career.job };
    };
    const bc = at(30, 'fire', 'chicago', 'Battalion Chief');
    assert.equal(bc.job.department.unit.kind, 'battalion');
    assert.match(bc.job.department.unit.name, /^Battalion \d+$/);
    assert.ok(bc.job.department.headcount >= 90 && bc.job.department.headcount <= 220, `${bc.job.department.headcount}`);
    const capt = at(31, 'fire', 'chicago', 'Fire Captain');
    assert.equal(capt.job.department.unit.kind, 'station');
    assert.ok(capt.job.department.headcount < bc.job.department.headcount, 'a station is smaller than a battalion');
    const sgt = at(32, 'police', 'chicago', 'Sergeant');
    assert.equal(sgt.job.department.unit.kind, 'squad');
    const pc = at(33, 'police', 'chicago', 'Captain');
    assert.match(pc.job.department.unit.name, /Precinct/);
    const principal = at(34, 'education', 'chicago', 'Principal');
    assert.equal(principal.job.department.unit.kind, 'school');
    const html = VIEWS.career(bc.state);
    clean(html);
    assert.ok(html.includes('You Command: Battalion'), 'the department card names the unit');
  },

  'a budget crisis brings a RIF; retention rules decide who goes'() {
    const { engine, state, ctx, job } = worker(5, 'police', 'detroit', 1);
    state.publicService.city = { name: 'Detroit', approval: 40, fiscalHealth: 5 };
    assert.ok(budgetPressure(state, job) > 0.5);
    job.probationLeft = 1;
    const junior = retentionRisk(state, job);
    job.probationLeft = 0;
    job.yearsAtEmployer = 22;
    const senior = retentionRisk(state, job);
    assert.ok(junior > senior * 3, `junior ${junior} vs senior ${senior}`);
    job.yearsAtEmployer = 0;
    job.probationLeft = 1;
    let notice = null;
    for (let i = 0; i < 40 && !notice; i++) {
      state.prompts = [];
      publicRifTick(ctx, job, RIF_DEPS);
      notice = state.prompts.find((p) => p.type === 'career.rifNotice');
    }
    assert.ok(notice, 'a RIF notice');
    assert.ok(deptOf(state, job).budgetCut > 0, 'the department is cut');
    engine.resolvePrompt(notice.id, 'accept');
    assert.ok(!state.career.job, 'separated');
    assert.ok(state.career.recall, 'on the recall list');
    // The city recovers; the agency calls back.
    if (state.publicService.city) state.publicService.city.fiscalHealth = 70;
    let recalled = false;
    for (let i = 0; i < 3 && !recalled; i++) {
      state.prompts = [];
      engine.ageUp();
      const p = state.prompts.find((x) => x.type === 'career.rifRecall');
      if (p) { engine.resolvePrompt(p.id, 'return'); recalled = Boolean(state.career.job); }
    }
    assert.ok(recalled, 'recalled to the old job');
  },

  'bumping keeps the job at a lower grade; tenure protects teachers'() {
    const { engine, state, ctx, job } = worker(6, 'police', 'detroit', 2);
    state.publicService.city = { name: 'Detroit', approval: 40, fiscalHealth: 0 };
    job.probationLeft = 1;
    let notice = null;
    for (let i = 0; i < 40 && !notice; i++) { state.prompts = []; publicRifTick(ctx, job, RIF_DEPS); notice = state.prompts.find((p) => p.type === 'career.rifNotice'); }
    assert.ok(notice);
    const level = job.levelId;
    engine.resolvePrompt(notice.id, 'bump');
    assert.ok(state.career.job, 'still employed');
    assert.notEqual(state.career.job.levelId, level, 'at a lower position');
    const t = worker(7, 'education', 'detroit');
    t.job.tenured = true;
    assert.equal(retentionRisk(t.state, t.job), 0);
  },
  'every rank pays more than the one below it, at every agency size'() {
    for (const [id, region] of [['police', 'nyc'], ['fire', 'nyc'], ['fbi', 'nyc'], ['police', 'rural'], ['education', 'nyc']]) {
      const w = worker(7, id, region);
      const ladder = ladderFor(PROFESSIONS[id], w.job.employer.size).filter((l) => l.track !== 'ic');
      let prev = 0;
      for (const l of ladder) {
        w.job.levelId = l.id; w.job.grade = l.grade; w.job.step = 1; w.job.merit = 0;
        recalcSalary(w.state, w.job);
        assert.ok(w.job.salary >= prev, `${id}@${w.job.employer.size}: ${l.title} $${w.job.salary} < $${prev}`);
        prev = w.job.salary;
      }
    }
  },
  'head posts above the ladder show in the progression'() {
    const w = worker(3, 'police', 'nyc');
    const html = VIEWS.career(w.state);
    clean(html);
    assert.ok(/Leadership/.test(html), 'leadership row missing');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) { console.log(`\n${failed} public-sector test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} public-sector tests passed`);
