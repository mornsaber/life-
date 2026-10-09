/**
 * Growth plans: once a business is big enough to have managers, you set a
 * strategy and they carry it out every year — opening locations, staffing,
 * marketing, growing the fleet, hiring ahead of revenue — and send you one
 * report instead of a stack of decisions.
 *
 *   steady      Grow from profits: expand when the business is profitable,
 *               well run and has cash to spare; keep a cash cushion.
 *   aggressive  Grow fast: borrow (SBA, equipment loans) to expand, spend on
 *               marketing, hire ahead of demand. Bigger upside, real risk.
 *   harvest     Stop growing and pay you: no expansion, lean marketing,
 *               every spare dollar distributed.
 *
 * biz.plan = { strategy, sinceAge, lastReport: [lines] }
 */
import { clamp } from '../../core/Random.js';
import { DUTIES } from '../career/ManagementEngine.js';
import { typeOf, staffFactor, annualPayment } from './Business.js';
import { OPERATIONS, capacity, contracted, EQUIPMENT_LOAN } from './Operations.js';
import { SBA, MARKETING } from './BusinessTypes.js';
import { forecast } from './Advisor.js';
import { INITIATIVES, initiativeCost, accountEligibility, signAccount } from './Initiatives.js';

export const STRATEGIES = {
  off: { name: 'You decide', icon: '🧑‍💼', desc: 'Nothing happens unless you do it.' },
  steady: { name: 'Steady growth', icon: '📈', desc: 'Management expands from profits when the business is healthy, keeps a cash cushion and staffs to demand.' },
  aggressive: { name: 'Aggressive growth', icon: '🚀', desc: 'Borrow to expand, market hard and hire ahead of demand. Faster growth, more debt, more risk.' },
  harvest: { name: 'Harvest', icon: '💰', desc: 'No more growth: lean marketing, and every spare dollar paid out to you.' },
};

/** A business has managers to delegate to once it has eight people or two locations — or a general manager already runs it. */
export const canDelegate = (biz) => biz.staff.headcount >= 8 || biz.scale >= 2 || biz.role !== 'operator' || (typeOf(biz).startup && biz.staff.headcount >= 5);

const money = (x) => `$${Math.round(x).toLocaleString()}`;

/** The year's plan. `deps` carries the engine's expansion helpers (avoids an import cycle). */
export function runPlan(ctx, biz, { expandBusiness, maxScale, expansionCost }) {
  const { state, rng } = ctx;
  const plan = biz.plan;
  if (!plan || plan.strategy === 'off' || !canDelegate(biz)) return;
  const type = typeOf(biz);
  const ly = biz.lastYear ?? {};
  const did = [];
  const aggressive = plan.strategy === 'aggressive';

  // Managers take routine calls; a big staff gets managers for every duty.
  biz.autopilot = true;
  if (biz.staff.headcount >= 20) for (const d of Object.keys(DUTIES)) biz.staff.delegation[d] = true;
  // Every change is checked against next year's forecast: management only does what pays.
  const profit = (changes) => forecast(state, biz, changes).netIncome;

  if (plan.strategy === 'harvest') {
    biz.marketing = Math.min(biz.marketing, 1);
    biz.drawPct = 1;
    did.push('kept marketing lean and paid out the profits');
  } else {
    biz.drawPct = aggressive ? 0 : Math.min(biz.drawPct, 0.5);
    // Marketing: the most profitable level (aggressive plans buy reach if it costs little).
    const levels = Object.keys(MARKETING).map(Number).map((m) => ({ m, p: profit({ biz: { marketing: m } }) }));
    const best = levels.reduce((a, b) => (b.p > a.p ? b : a));
    const reach = aggressive ? levels.filter((x) => x.m > best.m && x.p >= best.p - Math.abs(best.p) * 0.05 - 5000).at(-1) ?? best : best;
    if (reach.m !== biz.marketing) {
      biz.marketing = reach.m;
      did.push(`set marketing to level ${reach.m}`);
    }
    if (type.startup) {
      // Hire ahead of revenue while it's growing and there's runway.
      const runway = biz.cash / Math.max(1, (ly.payroll ?? 0) * 0.5);
      if ((biz.growth ?? 0) > (aggressive ? 0.1 : 0.25) && runway > (aggressive ? 0.5 : 1)) {
        const add = Math.max(1, Math.round(biz.staff.headcount * (aggressive ? 0.3 : 0.15)));
        biz.staff.headcount = Math.min(400, biz.staff.headcount + add);
        did.push(`hired ${add}`);
      } else if ((biz.growth ?? 0) < -0.1 && biz.staff.headcount > 5) {
        const cut = Math.max(1, Math.round(biz.staff.headcount * 0.15));
        biz.staff.headcount -= cut;
        biz.staff.morale = Math.max(0, biz.staff.morale - 6);
        did.push(`trimmed ${cut} jobs as growth stalled`);
      }
    } else {
      // Staffing: the headcount the forecast says earns the most.
      if (!OPERATIONS[biz.typeId] && type.staff) {
        const h = biz.staff.headcount;
        // Within 85–115% of a normal crew: lean, not skeleton.
        const normal = Math.round(type.staff * biz.scale) + biz.family.length;
        const lo = Math.max(1, Math.round(normal * 0.85));
        const hi = Math.round(normal * 1.15);
        const options = [...new Set([h, Math.round(h * 0.95), Math.round(h * 1.05), normal].map((n) => clamp(n, lo, hi)).filter((n) => n >= 1 && n <= 400))];
        const best = options.map((n) => ({ n, p: profit({ staff: { headcount: n } }) })).reduce((a, b) => (b.p > a.p ? b : a));
        if (best.n !== h && best.p - profit({}) > 5000) {
          biz.staff.headcount = best.n;
          if (best.n < h) biz.staff.morale = Math.max(0, biz.staff.morale - 3);
          did.push(best.n > h ? `hired ${best.n - h}` : `cut ${h - best.n} position${h - best.n > 1 ? 's' : ''}`);
        }
      }
      fleetPlan(ctx, biz, aggressive, did);
      // Expansion: profitable, well run, and the money's there (or borrowable, if aggressive).
      const healthy = (ly.netIncome ?? 0) > 0 && biz.quality >= (aggressive ? 50 : 58) && biz.years >= 2 && biz.scale < maxScale(state, biz);
      const cost = expansionCost(biz);
      // Another location has to pay for itself: within 6 years (10 on an aggressive plan).
      const gain = healthy ? profit({ biz: { scale: biz.scale + 1 }, staff: { headcount: Math.round(biz.staff.headcount * (biz.scale + 1) / biz.scale) } }) - profit({}) : 0;
      if (healthy && gain > 0 && cost / gain <= (aggressive ? 10 : 6)) {
        const cushion = Math.max(25000, (ly.revenue ?? 0) * 0.1);
        let r = null;
        if (biz.cash >= cost + cushion) r = expandBusiness(ctx, biz, 'cash');
        else if (aggressive && biz.cash >= cost * SBA.downPayment + cushion / 2 && state.housing.credit.score >= SBA.minScore && (biz.debts.sba?.balance ?? 0) < (ly.revenue ?? 0) * 0.8) r = expandBusiness(ctx, biz, 'sba');
        if (r?.ok) did.push(`opened location #${biz.scale}${r.cost ? ` (${money(r.cost)})` : ''}`);
      }
    }
  }
  if (!type.startup) leversPlan(ctx, biz, profit, plan.strategy, did);
  // Keep a cash cushion: draw on the credit line rather than bounce payroll.
  if (biz.cash < 0 && state.housing.credit.score >= 600 && !type.startup && (biz.debts.loc ?? 0) < Math.max(50000, (ly.revenue ?? 0) * 0.4)) {
    const need = -biz.cash + 10000;
    biz.debts.loc = (biz.debts.loc ?? 0) + need;
    biz.cash += need;
    did.push(`drew ${money(need)} on the credit line to cover a shortfall`);
  }
  plan.lastReport = did;
  const ceo = rng.pick(['Your CEO', 'Your general manager', 'The management team']);
  ctx.log(`📋 ${biz.name} — ${STRATEGIES[plan.strategy].name.toLowerCase()} plan: ${did.length ? `${ceo} ${did.join('; ')}.` : 'nothing needed doing this year.'}`, type.icon, 'finance');
}

/** Fleets and crews: buy (or finance) equipment when contracts fill the capacity; sell what's idle in a harvest. */
function fleetPlan(ctx, biz, aggressive, did) {
  const o = OPERATIONS[biz.typeId];
  if (!o || !biz.ops) return;
  const cap = capacity(biz);
  const busy = contracted(biz);
  const offered = (biz.ops.offers ?? []).reduce((s, k) => s + k.units, 0);
  if (o.unit) {
    const short = Math.min(aggressive ? 4 : 2, Math.max(0, busy + Math.round(offered / 2) - cap.units));
    let bought = 0;
    for (let i = 0; i < short && biz.ops.units.length < 60; i++) {
      const price = o.unit.usedCost ?? o.unit.newCost;
      if (biz.cash >= price * 1.5) {
        biz.cash -= price;
        biz.ops.units.push({ id: ctx.rng.id('u_'), age: ctx.rng.int(4, Math.max(5, Math.floor(o.unit.life * 0.6))), used: true });
        biz.assets += Math.round(price * 0.8);
        bought += 1;
      } else if (aggressive && biz.cash >= o.unit.newCost * EQUIPMENT_LOAN.down && ctx.state.housing.credit.score >= 600) {
        const down = Math.round(o.unit.newCost * EQUIPMENT_LOAN.down);
        biz.cash -= down;
        const balance = (biz.ops.loan?.balance ?? 0) + o.unit.newCost - down;
        biz.ops.loan = { balance, rate: EQUIPMENT_LOAN.rate, annual: annualPayment(balance, EQUIPMENT_LOAN.rate, EQUIPMENT_LOAN.years) };
        biz.ops.units.push({ id: ctx.rng.id('u_'), age: 0, used: false });
        bought += 1;
      }
    }
    if (bought) did.push(`added ${bought} ${o.unit.name}${bought > 1 ? 's' : ''} to the fleet`);
  }
  // Crews follow the work: a driver for every truck, or a crew for every signed post.
  const needPeople = o.unit ? biz.ops.units.length * o.crew : Math.ceil(Math.max(busy, 1) * o.crew);
  const add = clamp(needPeople - biz.staff.headcount, 0, aggressive ? 20 : 8);
  if (add) {
    biz.staff.headcount += add;
    did.push(`hired ${add} ${o.crewName ?? 'crew'}${add > 1 ? 's' : ''}`);
  }
}

/** Initiatives that pay back within two years go on, ones that cost money come off; key accounts get signed. */
function leversPlan(ctx, biz, profit, strategy, did) {
  const age = ctx.state.character.age;
  const base = profit({});
  const cushion = Math.max(25000, (biz.lastYear?.revenue ?? 0) * 0.1);
  biz.initiatives ??= {};
  for (const id of Object.keys(INITIATIVES)) {
    const on = biz.initiatives[id] != null;
    const toggled = { ...biz.initiatives };
    if (on) delete toggled[id];
    else toggled[id] = age;
    const gain = profit({ biz: { initiatives: toggled } }) - base;
    const cost = initiativeCost(biz, id);
    if (!on && gain > 0 && cost <= gain * (strategy === 'harvest' ? 1 : 2) && biz.cash >= cost + cushion) {
      biz.cash -= cost;
      biz.initiatives[id] = age;
      did.push(`launched a ${INITIATIVES[id].name.toLowerCase()}`);
    } else if (on && gain > 2000) {
      delete biz.initiatives[id];
      did.push(`ended the ${INITIATIVES[id].name.toLowerCase()}`);
    }
  }
  for (const offer of [...(biz.accountOffers ?? [])]) {
    if (accountEligibility(biz, offer).ok) {
      signAccount(biz, offer);
      did.push(`signed ${offer.client.toLowerCase()} as a key account`);
    }
  }
}
