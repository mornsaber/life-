/**
 * Companies that live and die (career/CompanyLife.js): health and shares, takeovers, mergers,
 * reorganizations and collapses that land on you, head office, and equity that vests.
 *
 *   node tests/companylife.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { professionsFor } from '../src/modules/career/JobTrees.js';
import { applicationEligibility, promotionStatus } from '../src/modules/career/CareerEngine.js';
import { corpOf, isCorporate, grantEquity, equityValue, CompanyLifeModule } from '../src/modules/career/CompanyLife.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const solve = (engine, state) => { for (let g = 0; g < 30 && state.prompts.length; g++) { const p = state.prompts[0]; engine.resolvePrompt(p.id, (p.options.find((o) => !o.disabled) ?? p.options[0]).id); if (state.prompts[0] === p) state.prompts.shift(); } };
/** A private-sector worker at a big company. */
function corporate(seed = 3, cc = 'US') {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  for (let i = 0; i < 24; i++) { state.prompts = []; state.stats.health = 90; engine.ageUp(); }
  state.prompts = [];
  Object.assign(state.stats, { smarts: 85, health: 90 });
  state.education.degrees.push({ type: 'bachelor', programId: 'bachelor', major: 'business', year: 22 });
  const open = professionsFor(state).filter((p) => applicationEligibility(state, p.id).ok && p.sector === 'private');
  for (const p of open.slice(0, 10)) { engine.dispatch('career.apply', p.id); solve(engine, state); if (isCorporate(state.career.job)) break; }
  const job = state.career.job;
  if (job) { job.employer.size = 'enterprise'; job.grade = Math.max(job.grade ?? 1, 5); job.salary = Math.max(job.salary ?? 0, 90000); }
  return { engine, state, ctx: engine.context(), job };
}

const tests = {
  'a company of its own: health, a share price, head office in the biggest city'() {
    const { state, job } = corporate();
    assert.ok(isCorporate(job), 'a corporate job');
    const org = state.orgs.byId[job.employer.orgId];
    delete (org ?? job.employer).corp; // made big after hiring: start its company over
    const c = corpOf(state, job);
    assert.ok(c.health >= 0 && c.health <= 100);
    assert.equal(c.hq, 'nyc', 'head office in the biggest city');
    assert.equal(corpOf(state, job), c, 'the same company each time');
  },
  'shares vest a quarter a year, and leaving forfeits the rest'() {
    const { engine, state, job } = corporate(5);
    const c = corpOf(state, job);
    c.listed = true; c.young = false;
    job.equity = null;
    grantEquity(state, job);
    assert.equal(job.equity.kind, 'shares');
    const before = equityValue(state, job).unvested;
    assert.ok(before > 0, 'a grant');
    c.lastEvent = state.character.age; // no events this year
    state.prompts = [];
    const ledger = () => (state.finances.ledger?.income ?? []).filter((x) => x.source === 'Shares vested' || x.reason === 'Shares vested').length;
    let vested = 0;
    for (let i = 0; i < 2 && state.career.job === job; i++) { CompanyLifeModule.onAgeUp(engine.context()); vested += ledger(); }
    assert.ok(job.equity.grants.every((g) => g.vested > 0), 'vesting');
    assert.ok(vested > 0 || equityValue(state, job).unvested < before, 'paid out as it vests');
  },
  'a takeover lands on you: package, a rung down, or fight for the seat'() {
    let seen = 0;
    for (const option of ['package', 'down', 'fight']) {
      for (let seed = 1; seed <= 40 && seen < 3; seed++) {
        const { engine, state, job } = corporate(seed);
        if (!job) continue;
        const c = corpOf(state, job);
        c.health = 40; c.lastEvent = -99; job.grade = 6;
        state.prompts = [];
        for (let y = 0; y < 30 && !state.prompts.some((p) => p.type === 'companyLife.overlap'); y++) { c.lastEvent = -99; CompanyLifeModule.onAgeUp(engine.context()); if (state.career.job !== job) break; state.prompts = state.prompts.filter((p) => p.type === 'companyLife.overlap'); }
        const p = state.prompts.find((x) => x.type === 'companyLife.overlap');
        if (!p) continue;
        engine.resolvePrompt(p.id, option);
        if (option === 'package') assert.equal(state.career.job, null, 'took the package');
        seen += 1;
        break;
      }
    }
    assert.equal(seen, 3, 'each answer to a takeover');
  },
  'collapse takes the job and the shares'() {
    let collapsed = 0;
    for (let seed = 1; seed <= 20 && !collapsed; seed++) {
      const { engine, state, job } = corporate(seed);
      if (!job) continue;
      const c = corpOf(state, job);
      for (let y = 0; y < 15 && state.career.job === job; y++) { c.health = 5; c.lastEvent = -99; state.prompts = []; CompanyLifeModule.onAgeUp(engine.context()); if (c.history.some((h) => h.kind === 'collapsed')) { collapsed += 1; break; } }
      if (collapsed) assert.equal(c.share, 0);
    }
    assert.ok(collapsed, 'a company collapses from the edge');
  },
  'the top posts are at head office: transfer there to compete'() {
    const { engine, state, job } = corporate(7, 'US');
    const c = corpOf(state, job);
    c.hq = state.character.regionId === 'nyc' ? 'chicago' : 'nyc';
    job.grade = 6;
    const gate = promotionStatus(state);
    // If the next rung is senior, it's gated on head office.
    if (gate.gated) assert.match(gate.reason, /head office/);
    state.prompts = [];
    engine.dispatch('companyLife.headOffice');
    assert.equal(state.character.regionId, c.hq, 'moved to head office');
    assert.match(VIEWS.career(state), /you work here/);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
