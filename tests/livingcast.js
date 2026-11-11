/**
 * The living cast (people/NpcCareers.js): relatives work in professions of their day and place,
 * climb ladders, keep house in the years most women did, follow a parent into the trade, and a
 * work rival can take the elite post you were in line for.
 *
 *   node tests/livingcast.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { eraWorkBlock } from '../src/modules/world/Eras.js';
import { pickProfession, startCareer, careerYear } from '../src/modules/people/NpcCareers.js';
import { VOCATIONS, vocationOf } from '../src/modules/career/Vocations.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (opts, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ gender: 'male', ...opts });
  return { engine, state, ctx: engine.context() };
};
const workers = (state) => state.people.list.filter((p) => p.alive && p.career && p.job);

const tests = {
  'relatives work in professions of their day: nobody codes in 1890'() {
    let n = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { state } = life({ countryId: 'GB', startYear: 1890 }, seed);
      for (const p of workers(state)) {
        n++;
        const as = { ...state, character: { ...state.character, gender: p.gender } };
        assert.equal(eraWorkBlock(as, getProfession(p.career.professionId)), null, `${p.relation} ${p.job} (${p.career.professionId}) in 1890`);
        assert.doesNotMatch(p.job, /software|data|cyber|developer|IT /i);
      }
    }
    assert.ok(n >= 6, `${n} working relatives`);
  },
  'most women keep house in 1900; most work in 2010'() {
    const share = (year) => {
      let women = 0, working = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const { state } = life({ countryId: 'US', startYear: year }, seed);
        for (const p of state.people.list.filter((x) => x.gender === 'female' && x.relation === 'mother')) { women++; if (p.job) working++; }
      }
      return working / women;
    };
    const early = share(1900), late = share(2010);
    assert.ok(early < 0.5, `1900: ${early}`);
    assert.ok(late > early + 0.2, `2010: ${late} vs 1900: ${early}`);
  },
  'careers climb and the packs reach relatives'() {
    let promoted = 0, honoured = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { state, ctx } = life({ countryId: 'US', startYear: 1960 }, seed);
      const rng = new Random(seed + 100);
      const p = { firstName: 'Test', gender: 'female', relation: 'sibling', traits: { smarts: 70 } };
      startCareer(rng, state, p, getProfession('nursing'), { levelIdx: 1, age: 30 });
      const from = p.career.levelId;
      for (let i = 0; i < 30; i++) careerYear(ctx, rng, p);
      if (p.career?.levelId !== from) promoted++;
      if (p.career?.awards.length || p.career?.elite || p.career?.postings.length) honoured++;
    }
    assert.ok(promoted >= 4, `${promoted}/6 promoted`);
    assert.ok(honoured >= 2, `${honoured}/6 had a posting, award or post`);
  },
  'a child can follow a parent into the trade'() {
    const { state } = life({ countryId: 'US', startYear: 1980 });
    const rng = new Random(9);
    const child = { gender: 'male', relation: 'child' };
    assert.equal(pickProfession(rng, state, child, 'bachelor', { prefer: 'engineering' })?.id, 'engineering');
    assert.notEqual(pickProfession(rng, state, child, 'none', { prefer: 'medical' })?.id, 'medical', 'not without the schooling');
  },
  'a work rival can take the elite post you were in line for'() {
    const { state, ctx } = life({ countryId: 'GB', startYear: 1950 });
    state.character.age = 50;
    const p = getProfession('medical');
    hire(ctx, { professionId: 'medical', levelId: 'renowned', employer: createEmployer(ctx.rng, state, p, state.character.regionId) });
    const pack = VOCATIONS.medicine;
    const odds = pack.eliteOdds;
    pack.eliteOdds = 1;
    try {
      const rng = new Random(4);
      const rival = { name: 'Dr Rival', firstName: 'Rival', gender: 'female' };
      startCareer(rng, state, rival, p, { levelIdx: 6, age: 52 });
      rival.career.inField = 30;
      rival.career.awards = ['teacher', 'facp'];
      for (let i = 0; i < 20 && !rival.career.elite; i++) careerYear(ctx, rng, rival, { rival: true });
      assert.ok(rival.career.elite, 'the rival got a post');
      assert.ok(vocationOf(state, pack).history.includes(`elite.${rival.career.elite.id}`), 'and it is no longer yours to be offered');
    } finally { pack.eliteOdds = odds; }
  },
  'the People tab shows it all'() {
    const { engine, state } = life({ countryId: 'US', startYear: 1950 });
    for (let i = 0; i < 25; i++) { state.prompts = []; engine.ageUp(); }
    const html = VIEWS.people(state, {});
    assert.doesNotMatch(html, /undefined|NaN/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
