/**
 * Organisation charts: a civilian workplace (head → departments → your ranks) and a
 * military unit (battalion → companies → your platoon → squads), with you marked.
 *
 *   node tests/orgchart.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { workplaceChart, unitChart } from '../src/modules/org/OrgChart.js';
import { ladderFor } from '../src/modules/career/Ladder.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const flat = (n) => [n, ...(n.children ?? []).flatMap(flat)];
const life = (cc = 'US') => { const engine = new Engine({ store: new Store(memory()), rng: new Random(2), modules: MODULES }); const state = engine.newLife({ countryId: cc }); state.prompts = []; return { engine, state }; };

const tests = {
  'a police officer sees the city, the department, the force and their own rung'() {
    const { engine, state } = life();
    state.character.age = 30;
    const ctx = engine.context();
    const p = getProfession('police');
    hire(ctx, { professionId: 'police', levelId: 'officer', employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
    state.prompts = []; engine.ageUp();
    const chart = workplaceChart(state, state.career.job);
    const all = flat(chart);
    assert.ok(all.filter((n) => n.you).length === 1, 'you, once');
    assert.ok(all.some((n) => /Chief of Police/.test(n.title)));
    assert.equal(chart.title, 'Answers to', 'the authority above the organisation');
    assert.ok(chart.children[0].children.length >= 2, 'other departments shown');
    assert.match(VIEWS.career(state), /org-chart/);
  },
  'charts work for jobs everywhere they can be held'() {
    for (const [cc, pid] of [['GB', 'police'], ['US', 'tech'], ['DE', 'nursing'], ['US', 'fbi']]) {
      const { engine, state } = life(cc);
      state.character.age = 35;
      const ctx = engine.context();
      const p = getProfession(pid) ?? getProfession('tech');
      hire(ctx, { professionId: p.id, levelId: p.levels[1]?.id ?? p.levels[0].id, employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
      if (!state.career.job) continue;
      const chart = workplaceChart(state, state.career.job);
      assert.ok(chart && flat(chart).some((n) => n.you), `${cc} ${pid}`);
    }
  },
  'a chief executive by its era name (Managing Director) heads the firm; a firm\'s trading name is not a unit'() {
    const path = (n, acc = []) => (n.you ? [...acc, n] : (n.children ?? []).map((c) => path(c, [...acc, n])).find(Boolean));
    for (const [cc, pid] of [['TW', 'corporate'], ['GB', 'corporate'], ['TW', 'engineering'], ['US', 'finance']]) for (let seed = 1; seed < 8; seed++) {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
      const state = engine.newLife({ countryId: cc }); state.prompts = []; state.character.age = 55;
      const ctx = engine.context();
      const p = getProfession(pid);
      const emp = createEmployer(ctx.rng, state, p, state.character.regionId);
      const ladder = ladderFor(p, emp.size);
      const top = ladder.reduce((x, l) => (l.grade >= x.grade ? l : x));
      hire(ctx, { professionId: pid, levelId: top.id, employer: emp });
      if (!state.career.job) continue;
      const chart = workplaceChart(state, state.career.job);
      const up = path(chart) ?? [];
      const where = `${cc} ${pid} ${seed} ${state.career.job.title}`;
      if (/Managing Director|Chief Executive|Senior Partner/.test(state.career.job.title)) assert.ok(up.length <= 2, `${where}: heads the firm, not ${up.map((n) => n.title).join(' > ')}`);
      assert.ok(!flat(chart).some((n) => n.kind === 'unit' && n.title === state.career.job.employer.name), `${where}: trading name as a unit`);
    }
  },
  'a soldier sees battalion, companies, platoon and squad'() {
    const { engine, state } = life();
    state.character.age = 20;
    Object.assign(state.stats, { smarts: 85, fitness: 85, health: 95 });
    state.education.degrees.push({ type: 'highschool', programId: 'highschool', year: 18 });
    engine.dispatch('military.enlist', 'army:enlisted:active');
    const sp = state.prompts.find((x) => x.type === 'military.chooseSpecialty');
    if (sp) engine.resolvePrompt(sp.id, sp.options.find((o) => !o.disabled).id);
    for (let i = 0; i < 2; i++) { state.prompts = []; engine.ageUp(); }
    const chart = unitChart(state, state.military.service);
    assert.ok(chart, 'unit chart');
    const all = flat(chart);
    assert.ok(all.some((n) => n.you), 'you are in it');
    assert.ok(all.some((n) => /squad/.test(n.title)));
    assert.match(VIEWS.military(state), /Unit organisation chart/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.message}`); }
}
if (failed) { console.log(`✘ ${failed} org chart test(s) failed`); process.exit(1); }
console.log(`✔ All ${Object.keys(tests).length} org chart tests passed`);
