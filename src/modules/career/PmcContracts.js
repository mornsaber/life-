/**
 * The private military contract market: what contracting actually is — a string of contracts,
 * each a rotation somewhere dangerous at a day rate, won on your record and your reputation.
 *
 *   The market    three contracts a year: wherever there's a war (convoys, base security),
 *                 plus the standing work — embassy details, anti-piracy on merchant ships,
 *                 training foreign armies, executive protection in dangerous cities
 *   Roles         a team member, or (with the reputation) the team leader at a higher rate
 *   The rotation  90 to 270 days away: danger pay at the day rate on top of the firm's
 *                 retainer, a chance of being hurt, reputation that brings better contracts
 *   The firm      taking a contract puts you on a firm's books (the Contracting career);
 *                 reputation moves you up its ladder — specialist, team leader, detail
 *                 leader, program manager. A year without a contract and the firm may let you go
 *
 * state.pmc = { rep, contract: { id, title, place, kind, days, rate, risk, lead } | null, done: [{ title, place, age }] }
 */
import { Random } from '../../core/Random.js';
import { contractorBackground } from './Contractors.js';
import { getProfession } from './JobTrees.js';
import { hire } from './CareerEngine.js';
import { createEmployer } from './Employers.js';
import { COUNTRIES } from '../world/Countries.js';

const KINDS = {
  static: { label: 'Static security', icon: '🏢', rate: 120, risk: 0.02 },
  convoy: { label: 'Convoy security', icon: '🚙', rate: 260, risk: 0.08 },
  psd: { label: 'Protective detail', icon: '🕶️', rate: 320, risk: 0.06 },
  training: { label: 'Training mission', icon: '🎯', rate: 180, risk: 0.02 },
  maritime: { label: 'Maritime security', icon: '🚢', rate: 210, risk: 0.03 },
  demining: { label: 'Mine clearance security', icon: '💣', rate: 230, risk: 0.07 },
};
const STANDING = [
  { kind: 'psd', title: 'Embassy protective detail', place: 'IQ' },
  { kind: 'maritime', title: 'Anti-piracy team, Gulf of Aden transits', place: 'SO' },
  { kind: 'training', title: 'Training contract for a partner army', place: 'NG' },
  { kind: 'psd', title: 'Executive protection for an oil company', place: 'NG' },
  { kind: 'static', title: 'Oil-field security', place: 'IQ' },
  { kind: 'psd', title: 'Kidnap-risk executive detail', place: 'MX' },
  { kind: 'training', title: 'Police training mission', place: 'HT' },
  { kind: 'static', title: 'Mine-site security', place: 'CD' },
  { kind: 'maritime', title: 'Red Sea convoy escort', place: 'YE' },
  { kind: 'demining', title: 'Security for a demining charity', place: 'UA' },
];
/** Contractor ladder by reputation. */
const LADDER = [['static', 0], ['psd', 25], ['teamLead', 45], ['detailLead', 80], ['programManager', 130]];

const pmc = (state) => (state.pmc ??= { rep: 0, contract: null, done: [] });
const inFirm = (state) => state.career?.job?.professionId === 'privateMilitary';

/** Who the firms will take, and why not. */
export function pmcEligibility(state) {
  if (state.military?.service) return { ok: false, reason: 'Leave the service first' };
  if (state.character.age < 21 || state.character.age > 62) return { ok: false, reason: 'Firms hire 21 to 62' };
  if (state.legal?.incarceration) return { ok: false, reason: 'In custody' };
  const b = contractorBackground(state);
  if (b.sof || b.combatYears >= 4 || b.anyYears >= 8 || b.lawYears >= 5) return { ok: true, background: b };
  return { ok: false, reason: 'Firms hire veterans (4+ years in combat arms or 8+ in any role), former special operators, or police with 5+ years' };
}

/** This year's contracts: the wars first, then standing work. */
export function pmcOffers(state) {
  const rng = new Random(((state.world?.seed ?? 7) * 7919 + state.character.age * 131) >>> 0);
  const out = [];
  for (const [cc, w] of Object.entries(state.world?.wars ?? {})) {
    if (w.phase === 'ceasefire' || out.length >= 2) continue;
    out.push({ kind: rng.pick(['convoy', 'static', 'psd']), title: `${rng.pick(['Logistics convoy security', 'Forward base security', 'Reconstruction agency detail'])} — ${w.operation ?? 'the war'}`, place: cc, war: true });
  }
  for (const s of rng.shuffle([...STANDING])) { if (out.length >= 3) break; out.push({ ...s }); }
  const rep = pmc(state).rep;
  const b = contractorBackground(state);
  return out.map((o, i) => {
    const k = KINDS[o.kind];
    const days = rng.pick([90, 180, 270]);
    const lead = rep >= 45 && rng.chance(0.5);
    const rate = Math.round(k.rate * (o.war ? 1.5 : 1) * (b.sof ? 1.4 : 1) * (lead ? 1.4 : 1) * (1 + rep / 300));
    return { id: `c${state.character.age}_${i}`, ...o, label: k.label, icon: k.icon, days, rate, risk: k.risk * (o.war ? 1.6 : 1), lead };
  });
}

function placeName(cc) { return COUNTRIES[cc]?.name ?? cc; }

/** Put the contractor on a firm's books at the level their reputation earns. */
function sign(ctx, levelId) {
  const { state } = ctx;
  const profession = getProfession('privateMilitary');
  const employer = inFirm(state) ? state.career.job.employer : createEmployer(ctx.rng, state, profession, state.character.regionId);
  if (state.career?.job && !inFirm(state)) ctx.emit('career:resign', { reason: 'Left to go contracting' });
  hire(ctx, { professionId: 'privateMilitary', levelId, employer });
}
const levelFor = (rep) => [...LADDER].reverse().find(([, r]) => rep >= r)[0];

export const PmcContractsModule = {
  id: 'pmcContracts',
  order: 52.5,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const p = state.pmc;
    if (!p || !state.character.alive) return;
    const c = p.contract;
    if (c) {
      p.contract = null;
      const pay = c.rate * c.days;
      ctx.earn(pay, `Contract day rate — ${c.title}`, { wage: true });
      p.rep = Math.round(p.rep + (c.days / 30) * (c.lead ? 1.6 : 1) * (c.war ? 1.3 : 1));
      p.done = [...p.done.slice(-9), { title: c.title, place: c.place, age: state.character.age }];
      ctx.stat('stress', Math.round(c.days / 30));
      if (rng.chance(c.risk)) {
        ctx.stat('health', -rng.int(8, 20));
        ctx.stat('happiness', -6);
        ctx.log(rng.pick([`An IED caught the second vehicle on your ${c.title.toLowerCase()} in ${placeName(c.place)}. You were medevaced with shrapnel wounds.`, `A rocket hit the compound in ${placeName(c.place)}. You came home with a concussion and a piece of the wall in your leg.`]), '🩸', 'bad');
      } else ctx.log(`${c.icon} You finished ${c.days} days on ${c.title.toLowerCase()} in ${placeName(c.place)}: $${pay.toLocaleString()} at $${c.rate.toLocaleString()} a day${c.lead ? ', as team leader' : ''}.`, c.icon, 'good');
      // Reputation moves you up the firm.
      if (inFirm(state)) {
        const want = levelFor(p.rep);
        const order = LADDER.map(([id]) => id);
        if (order.indexOf(want) > order.indexOf(state.career.job.levelId)) {
          sign(ctx, want);
          ctx.log(`Your record got you promoted: ${state.career.job.title}.`, '⬆️', 'good');
        }
      }
      return;
    }
    // A year on the bench: the firm may let you go.
    if (inFirm(state) && rng.chance(0.3)) ctx.emit('career:resign', { reason: 'Between contracts, the firm took you off its books' });
  },
  actions: {
    /** Take a contract. arg: offer id. */
    take(ctx, id) {
      const { state } = ctx;
      const ok = pmcEligibility(state);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      const p = pmc(state);
      if (p.contract) return ctx.toast('You are already on a contract', 'warn');
      const offer = pmcOffers(state).find((o) => o.id === id);
      if (!offer) return ctx.toast('That contract has gone', 'warn');
      const want = levelFor(p.rep + (ok.background.sof ? 30 : 0));
      if (!inFirm(state)) sign(ctx, want === 'static' && (ok.background.sof || ok.background.lawYears >= 5) ? 'psd' : want);
      p.contract = offer;
      return ctx.log(`${offer.icon} You signed for ${offer.days} days: ${offer.title}, ${placeName(offer.place)}, at $${offer.rate.toLocaleString()} a day${offer.lead ? ' as team leader' : ''}.`, offer.icon, 'milestone');
    },
  },
};

export const PMC_KINDS = KINDS;
export const pmcRisk = (o) => (o.risk >= 0.08 ? 'High' : o.risk >= 0.05 ? 'Elevated' : 'Moderate');
