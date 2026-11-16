/**
 * After the deal (business/FounderExits.js): staying on inside the buyer for an earn-out, walking
 * early, and a listed founder's activist shareholders.
 *
 *   node tests/founderexits.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES } from '../src/modules/business/BusinessTypes.js';
import { exitBusiness } from '../src/modules/business/BusinessEngine.js';
import { FounderExitsModule } from '../src/modules/business/FounderExits.js';
import { leaveJob } from '../src/modules/career/CareerEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function owner(typeId = 'consulting') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
  const s = engine.newLife({ countryId: 'US' });
  const t = BUSINESS_TYPES[typeId];
  s.character.age = 40;
  Object.assign(s.stats, { smarts: 80, health: 90 });
  s.finances.cash = 2_000_000;
  s.housing.credit.score = 750;
  for (const c of t.credentials) s.credentials.held[c] = { earnedAge: 25, renewedAge: 30, status: 'active' };
  if (!t.startup) s.career.history.push({ professionId: t.professions[0], title: 'Experienced hand', levelId: 'x', employerName: 'Prior employer', sector: 'private', peakGrade: 3, startAge: 25, endAge: 39, reason: 'Left' });
  engine.dispatch('business.start', `${typeId}:cash:${t.startup ? 'ccorp' : 'llc'}`);
  s.prompts = [];
  const biz = s.business.current;
  assert.ok(biz, 'a business');
  return { engine, s, ctx: engine.context(), biz };
}
const texts = (s) => s.log.flatMap((y) => y.entries.map((e) => e.text));

const tests = {
  'a buyer asks you to stay on; you run it inside them, and the earn-out pays at the end'() {
    const { engine, s, ctx } = owner();
    exitBusiness(ctx, 20_000_000, 'Sold to Atlas Group', { buyer: 'Atlas Group' });
    const p = s.prompts.find((x) => x.type === 'founderExits.stay');
    assert.ok(p, 'an offer to stay');
    engine.resolvePrompt(p.id, 'stay');
    const job = s.career.job;
    assert.ok(job, 'hired');
    assert.equal(job.employer.name, 'Atlas Group');
    assert.match(job.title, /^President, /);
    assert.ok(job.earnOut?.bonus > 0);
    assert.match(VIEWS.career(s), /Earn-out/);
    job.performance = 90;
    const cash = s.finances.cash;
    s.character.age = job.earnOut.until;
    FounderExitsModule.onAgeUp(ctx);
    assert.equal(job.earnOut, undefined);
    assert.ok(texts(s).some((t) => /earn-out paid/.test(t)));
    assert.ok(s.finances.cash > cash);
  },
  'leaving early forfeits the earn-out; small sales get no offer'() {
    const { engine, s, ctx } = owner();
    exitBusiness(ctx, 20_000_000, 'Sold', { buyer: 'a private equity firm' });
    const p = s.prompts.find((x) => x.type === 'founderExits.stay');
    assert.ok(p && !/^a /.test(p.title), 'the buyer has a name');
    engine.resolvePrompt(p.id, 'stay');
    leaveJob(ctx, 'Resigned');
    assert.ok(texts(s).some((t) => /forfeited/.test(t)));
    const small = owner();
    exitBusiness(small.ctx, 200_000, 'Sold', { buyer: 'Local Buyer' });
    assert.ok(!small.s.prompts.some((x) => x.type === 'founderExits.stay'));
  },
  'a listed founder with a small stake meets an activist: losing the vote sells the company'() {
    const { engine, s, ctx, biz } = owner();
    biz.public = { since: 40, ipoPrice: 1e8 };
    biz.ownerPct = 0.2;
    biz.valuation = 1e8;
    biz.lastYear = { netIncome: -1, revenue: 1e8 };
    let p = null;
    for (let i = 0; i < 200 && !p; i++) { s.world.seed = (s.world.seed ?? 1) + 1; FounderExitsModule.onAgeUp(ctx); p = s.prompts.find((x) => x.type === 'founderExits.activist'); if (!p) delete biz.activist; }
    assert.ok(p, 'an activist arrives');
    engine.resolvePrompt(p.id, 'sell');
    assert.equal(s.business.current, null, 'sold');
    assert.ok(s.business.history.at(-1).proceeds > 0);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
