/**
 * Government regulation of your companies.
 *
 *   antitrust     Regulators watch market share: your locations against
 *                 everyone else's in each city you're in, across every
 *                 company of the same kind you own. Dominate a market and
 *                 they open a case: settle (a consent decree — sell off
 *                 locations), fight it in court (legal fees; lose and the
 *                 company is broken up), or lobby. How hard they look is a
 *                 law the legislature sets (Laws: antitrust).
 *   mergers       Buying a competitor that would give you too much of a
 *                 market is blocked, or approved only if you sell locations.
 *   compliance    Big companies carry a compliance department, and now and
 *                 then a regulator (OSHA, the EPA, consumer protection, a
 *                 licensing board) finds something.
 *
 * state.business.regulation = { cases: { [typeId]: { stage, openedAge, share, fought, fees } }, actions: [{ age, text }] }
 */
import { Random, clamp } from '../../core/Random.js';
import { REGIONS } from '../life/Regions.js';
import { lawValue } from '../politics/Laws.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { locationsByRegion, businessOrg, closeBranch, syncBusinessOrg, npcBusiness, marketRoom } from '../org/Businesses.js';
import { charge } from './TaxBook.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

export const ANTITRUST = {
  lax: { label: 'Lax', share: 0.6, revenue: 50_000_000, chance: 0.12, trialWin: 0.6 },
  standard: { label: 'Standard', share: 0.45, revenue: 20_000_000, chance: 0.25, trialWin: 0.45 },
  aggressive: { label: 'Aggressive', share: 0.35, revenue: 8_000_000, chance: 0.45, trialWin: 0.3 },
};
export const enforcement = (state) => ANTITRUST[lawValue(state, 'antitrust') ?? 'standard'] ?? ANTITRUST.standard;

const owned = (state, typeId) => [state.business?.current, ...(state.business?.holdings ?? [])].filter((b) => b && b.typeId === typeId);
export const ownedTypes = (state) => [...new Set([state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean).map((b) => b.typeId))];

/**
 * Rival locations of a kind in a city: the named competitors (NPC and rival-group companies)
 * plus the many small independents every market has that aren't tracked one by one.
 */
export const fringe = (regionId) => marketRoom(regionId) * 3;
function rivalLocations(state, typeId, regionId, mineOrgIds) {
  return fringe(regionId) + Object.values(state.orgs?.byId ?? {}).filter((o) => o.typeId === `biz:${typeId}` && o.regionId === regionId && !o.closed && o.owner?.kind !== 'player' && !mineOrgIds.has(o.id)).reduce((n, o) => n + (o.business?.scale ?? 1), 0);
}

/**
 * Your position in a kind of business: locations, revenue and share in each city
 * (locations-weighted average across your cities).
 */
export function marketPosition(state, typeId, extra = null) {
  const list = owned(state, typeId);
  const mine = {};
  let revenue = 0;
  for (const b of list) {
    for (const [r, n] of Object.entries(locationsByRegion(state, b))) mine[r] = (mine[r] ?? 0) + n;
    revenue += b.lastYear?.revenue ?? 0;
  }
  if (extra) {
    mine[extra.regionId] = (mine[extra.regionId] ?? 0) + extra.locations;
    revenue += extra.revenue ?? 0;
  }
  const ids = new Set(list.map((b) => b.orgId).filter(Boolean));
  if (extra?.orgId) ids.add(extra.orgId);
  const cities = Object.entries(mine).map(([regionId, n]) => {
    const rivals = rivalLocations(state, typeId, regionId, ids);
    return { regionId, mine: n, rivals, share: n / Math.max(1, n + rivals) };
  }).sort((a, b) => b.share - a.share);
  const locations = cities.reduce((s, c) => s + c.mine, 0);
  const share = locations ? cities.reduce((s, c) => s + c.share * c.mine, 0) / locations : 0;
  return { typeId, share: Math.round(share * 1000) / 1000, revenue, locations, cities, companies: list.length };
}

/** Would regulators look? 0–100. */
export function exposure(state, pos) {
  const t = enforcement(state);
  if (!pos.locations) return 0;
  const s = pos.share / t.share;
  const r = Math.min(1, pos.revenue / t.revenue);
  return Math.round(clamp(s * r * 100, 0, 100));
}

/** Merger review before you buy a competitor. Returns { ok, divest, reason }. */
export function mergerReview(state, o) {
  const typeId = o.business?.typeId;
  if (!typeId) return { ok: true, divest: 0 };
  const t = enforcement(state);
  const pos = marketPosition(state, typeId, { regionId: o.regionId, locations: o.business.scale ?? 1, orgId: o.id, revenue: 0 });
  const city = pos.cities.find((c) => c.regionId === o.regionId);
  const big = pos.revenue >= t.revenue * 0.5;
  if (!city || !big || city.share < t.share) return { ok: true, divest: 0, share: city?.share ?? 0 };
  if (city.share >= t.share + 0.2) return { ok: false, reason: `Regulators would block it: ${Math.round(city.share * 100)}% of the ${REGIONS[o.regionId]?.name.split(',')[0] ?? 'local'} market.`, share: city.share };
  // Approved on condition you sell enough locations to get back under the line.
  const total = city.mine + city.rivals;
  const divest = Math.max(1, Math.ceil(city.mine - t.share * total));
  return { ok: true, divest, share: city.share, reason: `Approved on condition you sell ${divest} location${divest === 1 ? '' : 's'} in ${REGIONS[o.regionId]?.name.split(',')[0]}.` };
}

/**
 * Sell `count` locations in a city to a competitor: branches close and reopen under a
 * buyer. Your other companies of that kind in the city go first if one is small enough.
 * Returns proceeds (to the company).
 */
export function divestIn(ctx, typeId, regionId, count, deps) {
  const { state } = ctx;
  let left = count;
  let proceeds = 0;
  // Whole companies: held ones in that city, smallest first.
  for (const h of owned(state, typeId).filter((b) => b !== state.business.current && b.regionId === regionId).sort((a, b) => (a.scale ?? 1) - (b.scale ?? 1))) {
    if (left <= 0 || (h.scale ?? 1) > left) continue;
    left -= h.scale ?? 1;
    const price = Math.round((h.valuation ?? 0) * 0.85);
    deps.sellHolding(ctx, h, price, 'Divested (antitrust)');
    proceeds += price;
  }
  // Then branches of whichever company has the most there.
  const biz = owned(state, typeId).sort((a, b) => (locationsByRegion(state, b)[regionId] ?? 0) - (locationsByRegion(state, a)[regionId] ?? 0))[0];
  const org = biz && businessOrg(state, biz);
  let closed = 0;
  if (org) {
    const branches = org.branches.filter((b) => (org.departments[b.deptId]?.regionId ?? b.regionId) === regionId);
    for (const b of branches) {
      if (left <= 0 || biz.scale <= 1) break;
      if (!closeBranch(state, biz, b.deptId)) continue;
      const per = Math.round(((biz.valuation ?? 0) / Math.max(1, biz.scale)) * 0.85);
      biz.staff.headcount = Math.max(biz.family.length + 1, Math.round(biz.staff.headcount * (biz.scale - 1) / biz.scale));
      biz.scale -= 1;
      biz.cash += per;
      proceeds += per;
      left -= 1;
      closed += 1;
    }
    if (closed) {
      syncBusinessOrg(state, biz);
      // The buyer runs them as a competitor.
      const buyer = npcBusiness(state, typeId, regionId, { reputation: clamp(biz.reputation, 35, 75) });
      buyer.business.scale = closed;
      buyer.business.staff = Math.round(BUSINESS_TYPES[typeId].staff * closed);
      buyer.business.tickedAge = state.character.age;
    }
  }
  return { proceeds, sold: count - left };
}

function record(state, text) {
  const reg = (state.business.regulation ??= { cases: {}, actions: [] });
  reg.actions = [...(reg.actions ?? []).slice(-9), { age: state.character.age, text }];
}

/** The remedy: enough locations sold in the most concentrated cities to get under the line (a break-up goes deeper). */
function remedy(ctx, typeId, depth, deps) {
  const { state } = ctx;
  const t = enforcement(state);
  const pos = marketPosition(state, typeId);
  let proceeds = 0;
  let sold = 0;
  for (const c of pos.cities.filter((x) => x.share >= t.share * 0.9)) {
    const total = c.mine + c.rivals;
    const target = depth === 'breakup' ? Math.ceil(c.mine / 2) : Math.max(1, Math.ceil(c.mine - (t.share - 0.05) * total));
    const r = divestIn(ctx, typeId, c.regionId, Math.min(target, c.mine - (c.regionId === (businessOrg(state, owned(state, typeId)[0])?.regionId) ? 1 : 0)), deps);
    proceeds += r.proceeds;
    sold += r.sold;
  }
  return { proceeds, sold };
}

/** Once a year: the regulators' look at everything you own. */
export function regulationYear(ctx, deps) {
  const { state } = ctx;
  const reg = (state.business.regulation ??= { cases: {}, actions: [] });
  // Its own random stream, so regulators don't reshuffle the rest of the business world.
  reg.seed = ((reg.seed ?? (state.orgs?.seed ?? 5) ^ 0x7e9) * 1664525 + 1013904223) >>> 0;
  const rng = new Random(reg.seed);
  const t = enforcement(state);
  // Conditions on mergers you closed: the promised sales.
  for (const p of reg.pending ?? []) {
    const r = divestIn(ctx, p.typeId, p.regionId, p.count, deps);
    if (r.sold) ctx.log(`As the merger approval required, you sold ${r.sold} ${BUSINESS_TYPES[p.typeId].name.toLowerCase()} location${r.sold === 1 ? '' : 's'} (${money(r.proceeds)}).`, '⚖️');
  }
  reg.pending = [];
  for (const typeId of ownedTypes(state)) {
    const pos = marketPosition(state, typeId);
    const kase = reg.cases[typeId];
    const type = BUSINESS_TYPES[typeId];
    const lead = owned(state, typeId).sort((a, b) => (b.lastYear?.revenue ?? 0) - (a.lastYear?.revenue ?? 0))[0];
    const handsOff = !lead || lead !== state.business.current || lead.autopilot || !['operator', 'executive'].includes(lead.role);
    if (kase) {
      if (kase.stage === 'trial') {
        // The court rules a year after you chose to fight.
        const fees = Math.round(clamp(pos.revenue * 0.004, 250_000, 15_000_000));
        if (lead) charge(lead, fees);
        if (rng.chance(t.trialWin + (state.stats.smarts - 50) / 500 + (lead?.structure?.divisions?.includes('compliance') ? 0.1 : 0))) {
          ctx.log(`The court ruled for you: regulators lost their case over your ${type.name.toLowerCase()} business (legal fees ${money(fees)}).`, '⚖️', 'good');
          record(state, `Won the antitrust trial (${type.name})`);
        } else {
          const r = remedy(ctx, typeId, 'breakup', deps);
          const fine = Math.round(pos.revenue * 0.02);
          if (lead) charge(lead, fine);
          ctx.log(`The court ordered your ${type.name.toLowerCase()} business broken up: ${r.sold} location${r.sold === 1 ? '' : 's'} sold to competitors (${money(r.proceeds)}) and a ${money(fine)} penalty.`, '🔨', 'bad');
          record(state, `Broken up by court order (${type.name}): ${r.sold} locations sold`);
        }
        delete reg.cases[typeId];
      }
      continue;
    }
    // A new case when you dominate a market.
    if (pos.share >= t.share && pos.revenue >= t.revenue && pos.locations >= 3 && rng.chance(t.chance)) {
      reg.cases[typeId] = { stage: 'investigation', openedAge: state.character.age, share: pos.share };
      const where = REGIONS[pos.cities[0]?.regionId]?.name.split(',')[0] ?? 'your markets';
      const text = `Antitrust regulators opened an investigation into your ${type.name.toLowerCase()} business: ${Math.round(pos.share * 100)}% of its markets (${Math.round(pos.cities[0].share * 100)}% in ${where}).`;
      if (handsOff) {
        ctx.log(`${text} Your managers negotiated a consent decree.`, '⚖️', 'warn');
        settle(ctx, typeId, deps);
      } else {
        ctx.prompt({
          type: 'business.antitrust', icon: '⚖️', title: 'Antitrust Investigation', text,
          options: [
            { id: 'settle', label: '🤝 Settle: a consent decree', hint: 'Sell some locations' },
            { id: 'fight', label: '⚔️ Fight it in court', hint: `${Math.round(t.trialWin * 100)}% to win · lose = break-up` },
            { id: 'lobby', label: '💼 Lobby to have it dropped', hint: `${money(Math.round(clamp(pos.revenue * 0.003, 100_000, 5_000_000)))}` },
          ],
          data: { typeId },
        });
      }
    }
  }
  // Compliance for big companies, and the odd regulatory finding.
  for (const b of [state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean)) {
    const rev = b.lastYear?.revenue ?? 0;
    if (rev < 10_000_000) continue;
    const level = lawValue(state, 'antitrust') === 'aggressive' ? 0.004 : 0.0025;
    charge(b, Math.round(rev * level));
    if (rng.chance((0.06 + Math.max(0, 60 - (b.quality ?? 60)) / 400) * (b.structure?.divisions?.includes('compliance') ? 0.5 : 1))) {
      const agency = rng.pick(['OSHA', 'the EPA', 'the state attorney general', 'the Department of Labor', 'consumer-protection regulators', 'the state licensing board']);
      const fine = Math.round(rev * rng.float(0.002, 0.012));
      charge(b, fine);
      b.reputation = Math.max(0, (b.reputation ?? 50) - 3);
      ctx.log(`${b.name}: ${agency} found violations — ${money(fine)} in fines and a consent order.`, '📋', 'warn');
      record(state, `${b.name}: ${money(fine)} fine from ${agency}`);
    }
  }
}

function settle(ctx, typeId, deps) {
  const { state } = ctx;
  const r = remedy(ctx, typeId, 'decree', deps);
  delete state.business.regulation.cases[typeId];
  ctx.log(`Consent decree: you sold ${r.sold} ${BUSINESS_TYPES[typeId].name.toLowerCase()} location${r.sold === 1 ? '' : 's'} to competitors (${money(r.proceeds)}).`, '🤝', 'warn');
  record(state, `Consent decree (${BUSINESS_TYPES[typeId].name}): ${r.sold} locations sold`);
}

export function antitrustResolver(deps) {
  return (ctx, data, optionId) => {
    const { state, rng } = ctx;
    const reg = state.business.regulation;
    if (!reg?.cases?.[data.typeId]) return;
    if (optionId === 'settle') return settle(ctx, data.typeId, deps);
    const pos = marketPosition(state, data.typeId);
    if (optionId === 'lobby') {
      const cost = Math.round(clamp(pos.revenue * 0.003, 100_000, 5_000_000));
      if (!ctx.spend(cost, 'Antitrust lobbying', { credit: true })) return settle(ctx, data.typeId, deps);
      if (rng.chance(lawValue(state, 'antitrust') === 'aggressive' ? 0.25 : 0.5)) {
        delete reg.cases[data.typeId];
        record(state, `Lobbied an antitrust case away (${BUSINESS_TYPES[data.typeId].name})`);
        return ctx.log(`After ${money(cost)} in lobbying, regulators quietly closed the investigation.`, '💼', 'good');
      }
      ctx.log(`Lobbying didn't stop it (${money(cost)} spent). The case goes to court.`, '💼', 'warn');
    }
    reg.cases[data.typeId].stage = 'trial';
    reg.cases[data.typeId].fought = true;
    ctx.log('You lawyered up to fight the regulators in court. The trial comes next year.', '⚔️');
    return undefined;
  };
}

export { money as regMoney };
