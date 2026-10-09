/**
 * Business fuzz: owners of every kind of business taking random actions for
 * decades — hiring, expanding, restructuring, listing, merging, unionizing,
 * holding companies — with the books checked every year and every screen
 * rendered.
 *
 *   node tests/bizfuzz.js [lives]
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { BUSINESS_TYPES, ENTITIES } from '../src/modules/business/BusinessTypes.js';
import { acquisitionTargets } from '../src/modules/business/Conglomerate.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const LIVES = Number(process.argv[2] ?? 30);
const TYPES = Object.keys(BUSINESS_TYPES);
const bad = (html) => html.match(/.{0,80}(NaN|undefined|\[object|Infinity).{0,80}/)?.[0];

function check(state, where) {
  for (const b of [state.business.current, ...(state.business.holdings ?? [])].filter(Boolean)) {
    const tag = `${where} ${b.name} (${b.typeId})`;
    for (const k of ['cash', 'valuation', 'assets', 'quality', 'reputation', 'basis']) assert.ok(Number.isFinite(b[k] ?? 0), `${tag}: ${k}=${b[k]}`);
    assert.ok(b.valuation >= 0, `${tag}: valuation ${b.valuation}`);
    assert.ok(b.ownerPct > 0 && b.ownerPct <= 1, `${tag}: stake ${b.ownerPct}`);
    assert.ok(Number.isInteger(b.scale) && b.scale >= 1, `${tag}: scale ${b.scale}`);
    assert.ok(Number.isInteger(b.staff.headcount) && b.staff.headcount >= 0, `${tag}: headcount ${b.staff.headcount}`);
    assert.ok(b.staff.morale >= 0 && b.staff.morale <= 100, `${tag}: morale`);
    assert.ok(Number.isFinite(b.staff.costPremium) && b.staff.costPremium < 3, `${tag}: cost premium ${b.staff.costPremium}`);
    const inv = (b.investors ?? []).reduce((s, i) => s + (i.pct ?? 0), 0);
    assert.ok(inv <= 1.0001, `${tag}: investors own ${inv}`);
    if (b.lastYear) for (const [k, v] of Object.entries(b.lastYear)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${tag}: lastYear.${k}=${v}`);
    if (b.public) assert.ok(b.entity === 'ccorp' || BUSINESS_TYPES[b.typeId].startup, `${tag}: public but ${b.entity}`);
  }
  assert.ok(Number.isFinite(state.finances.cash), `${where}: cash ${state.finances.cash}`);
  for (const id of ['business', 'career', 'politics', 'money']) {
    const html = VIEWS[id]?.(state) ?? '';
    const hit = bad(html);
    assert.ok(!hit, `${where}: ${id} view: ${hit}`);
  }
}

const stats = { lives: 0, years: 0, actions: 0, public: 0, unionized: 0, cases: 0, holdings: 0, restructured: 0, spinoffs: 0 };
for (let i = 0; i < LIVES; i++) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(9000 + i), modules: MODULES });
  engine.toast = () => {};
  const state = engine.newLife({});
  const r = new Random(500 + i);
  state.character.age = 30;
  Object.assign(state.stats, { smarts: r.int(40, 95), health: 95, looks: 60 });
  state.finances.cash = r.pick([300_000, 2_000_000, 20_000_000]);
  state.housing.credit.score = 760;
  const typeId = TYPES[i % TYPES.length];
  const t = BUSINESS_TYPES[typeId];
  for (const c of t.credentials) state.credentials.held[c] = { earnedAge: 25, renewedAge: 29, status: 'active' };
  state.career.history.push({ professionId: t.professions?.[0] ?? 'corporate', title: 'Pro', levelId: 'x', employerName: 'Prior', sector: 'private', peakGrade: 5, startAge: 18, endAge: 29, reason: 'Left' });
  state.prompts = [];
  engine.dispatch('business.start', `${typeId}:${r.pick(['cash', 'sba'])}:${t.startup ? 'ccorp' : r.pick(Object.keys(ENTITIES))}`);
  stats.lives += 1;
  const act = (id, arg) => {
    if (state.prompts.length) return;
    stats.actions += 1;
    try { engine.dispatch(id, arg); } catch (e) { throw new Error(`life ${i} (${typeId}) age ${state.character.age}: ${id}(${arg}) threw: ${e.stack}`); }
  };
  for (let y = 0; y < 40 && state.character.alive; y++) {
    const biz = state.business.current;
    if (biz) {
      const moves = [
        () => act('business.hire', '1'), () => act('business.expand', r.pick(['cash', 'sba'])), () => act('business.setPlan', r.pick(['steady', 'aggressive', 'harvest'])),
        () => act('business.handOff'), () => act('business.takePost', r.pick(['ceo', 'president', 'chair'])), () => act('business.setFocus', r.pick(['growth', 'efficiency', 'quality', 'people', 'brand'])),
        () => act('business.setDesign', r.pick(['functional', 'regional', 'lean'])), () => act('business.toggleDivision', r.pick(['bizdev', 'rnd', 'compliance', 'people', 'procurement'])),
        () => act('business.spinOff', r.pick(['denver', 'chicago', 'miami', 'atlanta', 'phoenix', 'seattle'])), () => act('business.convert', 'ccorp'), () => act('business.goPublic'),
        () => act('business.sellShares'), () => act('business.buyback'), () => act('business.takePrivate'), () => act('business.sellStake', '0.25'),
        () => act('business.capitalIn', `${biz.id}:100000`), () => act('business.capitalOut', `${biz.id}:max`), () => act('business.buyBack', `${biz.id}:0.1:you`),
        () => act('business.formConglomerate'), () => act('business.makePassive'), () => act('business.setPay', r.pick(['modest', 'market', 'top'])),
        () => act('business.appointDirector', r.pick(['operator', 'finance', 'marketing', 'people', 'governance'])), () => act('business.buyPremises', r.pick(['cash', 'loan'])),
        () => act('business.toggleAutopilot'), () => act('business.setWorkforce', r.pick(['direct', 'mixed', 'contracted'])), () => act('business.certifyCrew', r.pick(['hazmatEndorsement', 'cdlA', 'schoolBusEndorsement'])),
        () => act('legislature.lobby', `${r.pick(['minWage', 'smallBizCredit', 'antitrust'])}|${r.pick(['up', 'down'])}|${r.pick(['city', 'state', 'federal'])}`),
      ];
      for (let k = r.int(1, 4); k > 0; k--) r.pick(moves)();
      if (r.chance(0.1)) biz.staff.unionRisk = 100;
    }
    if (state.business.conglomerate && r.chance(0.3)) {
      const targets = acquisitionTargets(state);
      if (targets.length) act('business.acquireCompany', r.pick(targets).id);
      if ((state.business.holdings ?? []).length && r.chance(0.3)) act('business.focus', r.pick(state.business.holdings).id);
    }
    if (!biz && !state.business.holdings?.length && r.chance(0.3)) act('business.start', `${r.pick(TYPES)}:cash:llc`);
    state.stats.health = Math.max(state.stats.health, 70);
    try { engine.ageUp(); } catch (e) { throw new Error(`life ${i} (${typeId}) age ${state.character.age}: ageUp threw: ${e.stack}`); }
    for (let j = 0; j < 12 && state.prompts.length; j++) {
      const p = state.prompts[0];
      const opt = r.pick(p.options.filter((o) => !o.disabled));
      try { engine.resolvePrompt(p.id, opt.id); } catch (e) { throw new Error(`life ${i} age ${state.character.age}: ${p.type}/${opt.id} threw: ${e.stack}`); }
    }
    stats.years += 1;
    check(state, `life ${i} (${typeId}) age ${state.character.age}`);
    const all = [state.business.current, ...(state.business.holdings ?? [])].filter(Boolean);
    if (all.some((b) => b.public)) stats.public += 1;
    if (all.some((b) => b.staff.unionized)) stats.unionized += 1;
    if (Object.keys(state.business.regulation?.cases ?? {}).length) stats.cases += 1;
    if (all.some((b) => b.structure && b.structure.design !== 'functional')) stats.restructured += 1;
    stats.holdings = Math.max(stats.holdings, (state.business.holdings ?? []).length);
  }
}
console.log(`✔ Business fuzz passed — ${stats.lives} owners, ${stats.years} years, ${stats.actions} actions`);
console.log(`  years with: a public company ${stats.public} · a union ${stats.unionized} · an antitrust case ${stats.cases} · a restructured company ${stats.restructured} · most holdings ${stats.holdings}`);
