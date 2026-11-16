/**
 * Moving between employers (career/Mobility.js, Reputation.js, JobMarket.js): negotiating an
 * offer, levelling by employer size, garden leave, and a name in the field.
 *
 *   node tests/mobility.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { makeOffer, acceptOffer } from '../src/modules/career/JobMarket.js';
import { openNegotiation, asksFor, MobilityModule } from '../src/modules/career/Mobility.js';
import { reputationOf, reputationYear } from '../src/modules/career/Reputation.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function worker(professionId, levelId, { seed = 3, size = 'medium', cc = 'US' } = {}) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  for (let i = 0; i < 30; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  Object.assign(state.stats, { smarts: 85, health: 90 });
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
  const ctx = engine.context();
  const employer = createEmployer(new Random(seed), state, getProfession(professionId), state.character.regionId);
  employer.size = size;
  hire(ctx, { professionId, levelId, employer });
  state.prompts = [];
  return { engine, state, ctx, job: state.career.job };
}

const tests = {
  'a name in the field grows with strong years and fades when you leave it'() {
    const { state, job } = worker('corporate', 'analyst');
    job.performance = 90;
    for (let i = 0; i < 5; i++) reputationYear(state);
    const built = reputationOf(state);
    assert.ok(built >= 15, `built ${built}`);
    state.career.job = null;
    reputationYear(state);
    assert.ok(reputationOf(state, 'corporate') < built, 'fades out of the field');
  },
  'negotiating: each ask has odds, and a win changes the offer'() {
    let improved = 0;
    let lost = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { engine, state, ctx } = worker('corporate', 'specialist', { seed, size: 'large' });
      const offer = makeOffer(ctx, { headhunter: true });
      const asks = asksFor(state, offer);
      assert.ok(asks.includes('base') && asks.includes('bluff'));
      openNegotiation(ctx, offer);
      const p = state.prompts.find((x) => x.type === 'mobility.negotiate');
      assert.ok(p.options.every((o) => ['take', 'walk'].includes(o.id) || /\d+%/.test(o.label)), 'odds shown');
      engine.resolvePrompt(p.id, seed % 2 ? 'base' : 'bluff');
      const fin = state.prompts.find((x) => x.type === 'mobility.final');
      if (!fin) { lost += 1; continue; }
      if (fin.data.offer.salary > offer.salary) improved += 1;
      engine.resolvePrompt(fin.id, 'take');
      assert.equal(state.career.job.employer.name, offer.employer.name, 'signed');
    }
    assert.ok(improved > 0, 'some asks win');
    assert.ok(lost > 0, 'pushing too hard can lose the offer');
  },
  'titles run bigger at small firms: levelling by size'() {
    let down = 0;
    let up = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const a = worker('corporate', 'specialist', { seed, size: 'small' });
      const o = makeOffer(a.ctx);
      if (o.levelled === 'down') down += 1;
      const b = worker('corporate', 'srAnalyst', { seed, size: 'enterprise' });
      const o2 = makeOffer(b.ctx);
      if (o2.levelled === 'up') up += 1;
    }
    assert.ok(down + up > 0, `levelled down ${down}, up ${up}`);
  },
  'garden leave: senior people leaving for a rival are paid to stay home'() {
    const { state, ctx, job } = worker('corporate', 'director', { cc: 'GB', size: 'large' });
    job.grade = 7;
    const offer = makeOffer(ctx);
    const cash = state.finances.cash;
    acceptOffer(ctx, offer);
    assert.ok((state.finances.ledger?.income ?? []).some((x) => /Garden leave/.test(x.source ?? x.reason ?? '')) || state.finances.cash > cash, 'garden leave pay');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
