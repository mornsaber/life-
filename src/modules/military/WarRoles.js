/**
 * What you can do about a war, depending on who you are — and what a war asks of people who
 * once served.
 *
 *   The leader     (head of government at war) commit more forces, open talks, fund the war
 *                  effort, order mobilization, address the nation
 *   A legislator   vote the war's funding up or down
 *   A general      (a flag officer in a war) set the campaign: an offensive, a defensive
 *                  line, or a deep raid
 *   A soldier      volunteer for the front line
 *   Veterans       when their country goes to war, those who served are asked back: retirees
 *                  by recall, others to re-enlist at their old rank, with a bonus
 *   Retirees       benefits for life: commissary and exchange savings, cheap health cover,
 *                  Space-A flights, base privileges (US), discounts and services elsewhere
 *   Contracts      former officers and NCOs get offers from abroad: training missions for Gulf
 *                  states (legal, with approval), a commission in an African army, or a
 *                  private army in someone else's civil war — mercenarism, where that's a crime
 *
 * Every lever moves the front a little, or public support; none decides a war alone.
 *
 * state.military.contract = { kind, country, until, pay, title } (a foreign contract)
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { warIn, warContribution } from '../world/War.js';
import { leads } from '../world/Houses.js';
import { COUNTRIES } from '../world/Countries.js';
import { enlist, rankOf, retiredFrom, recallMaxAge } from './MilitaryEngine.js';
import { battlefieldPromotion } from './Wartime.js';

const home = (state) => state.character.countryId ?? 'US';
const liveWar = (state, cc) => { const w = warIn(state, cc); return w && w.phase !== 'ceasefire' ? w : null; };
const svcWar = (state) => { const svc = state.military?.service; return svc ? liveWar(state, svc.nation ?? 'US') : null; };
const nudge = (war, front, support = 0) => {
  war.front = clamp(Math.round((war.front + front) * 10) / 10, -100, 100);
  war.support = clamp(Math.round(war.support + support), 0, 100);
};

/** Which war levers are yours this year: { leader, legislator, general, soldier }. */
export function warRoles(state) {
  const cc = home(state);
  const war = liveWar(state, cc);
  const svc = state.military?.service;
  const sw = svcWar(state);
  const office = state.politics?.office;
  return {
    war,
    leader: Boolean(war && leads(state, cc)),
    legislator: Boolean(war && office && !leads(state, cc) && (state.legislature?.seat || /mp$|senator|rep$|usRep|usSenator|deputy/i.test(office.id))),
    general: Boolean(sw && svc.track === 'officer' && svc.grade >= 6),
    soldier: Boolean(sw && svc.component === 'active' && !(svc.track === 'officer' && svc.grade >= 6)),
    svcWar: sw,
  };
}

/* ------------------------------------------------------------------ */
/* Veterans asked back; retirees' benefits; contracts abroad           */
/* ------------------------------------------------------------------ */

/** The last time you served, for the call-back. */
const lastService = (state) => state.military?.history?.filter((h) => !['dishonorable', 'bcd', 'oth', 'kia'].includes(h.discharge)).at(-1) ?? null;

function callBackYear(ctx) {
  const { state, rng } = ctx;
  const cc = home(state);
  const war = liveWar(state, cc);
  const h = lastService(state);
  if (!war || !h || state.military.service || war.intensity < 2 || (h.nation ?? 'US') !== cc) return;
  const age = state.character.age;
  const retired = h.discharge === 'retired';
  const maxAge = recallMaxAge(state, cc);
  if (age >= (retired ? maxAge : Math.max(45, maxAge - 15)) || state.stats.health < 50 || state.legal?.incarceration) return;
  const asked = (state.military.warAsked ??= {});
  if (asked[war.id ?? war.operation] || state.prompts.some((p) => p.type === 'warRoles.callBack') || !rng.chance(0.6)) return;
  asked[war.id ?? war.operation] = age;
  const bonus = retired ? 0 : Math.round((h.track === 'officer' ? 30000 : 20000) * (war.intensity >= 3 ? 1.5 : 1) / 1000) * 1000;
  ctx.prompt({
    type: 'warRoles.callBack', icon: '📨', title: 'Your Country Is Asking',
    text: retired
      ? `${war.operation} is short of experienced leaders. Your old branch asks retired ${h.rankTitle}s under ${maxAge} to volunteer for recall${maxAge > 65 ? ' — for staffs, depots, training schools and home defence' : ''}.`
      : `${war.operation} needs trained soldiers. Former service members can re-enlist at their old rank (${h.rankTitle})${bonus ? ` with a $${bonus.toLocaleString()} bonus` : ''}.`,
    options: [{ id: 'serve', label: '🪖 Go back' }, { id: 'decline', label: '🙅 Not this time' }],
    data: { bonus, retired },
  });
}

/** Back into uniform at your old rank. */
function returnToService(ctx, h, { bonus = 0, recalled = false } = {}) {
  const { state } = ctx;
  if (!enlist(ctx, { branch: h.branch, track: h.track, component: 'active', specialty: h.specialty, mos: h.mos, cleared: true })) return false;
  const svc = state.military.service;
  Object.assign(svc, { grade: h.grade ?? 0, yearsOfService: h.yearsOfService ?? 0, priorYears: h.yearsOfService ?? 0, contractYearsLeft: 2, yearsInGrade: 0, cadet: false, ...(recalled ? { recalled: true } : { warReturn: true }) });
  if (recalled) for (const p of state.retirement?.pensions ?? []) if (p.id === 'military') p.suspended = true;
  if (bonus) ctx.earn(bonus, 'Wartime re-enlistment bonus', { wage: true });
  ctx.log(`You went back into uniform as a ${rankOf(svc).title} for the duration.${bonus ? ` A $${bonus.toLocaleString()} bonus came with it.` : ''}`, '🪖', 'milestone');
  return true;
}

/** Retired from the forces: what it's worth every year. */
function retireeYear(ctx) {
  const { state } = ctx;
  const h = retiredFrom(state);
  if (!h || state.military.service) return;
  const us = !h.nation;
  // Commissary and exchange (US); Forces discounts elsewhere: real money saved.
  const saved = us ? 1800 : 600;
  state.finances.cash += saved;
  // Cheap health cover for retirees (TRICARE; elsewhere, veterans' health services).
  if (us && state.character.age < 65) state.finances.cash += 2500;
  state.military.retireeYears = (state.military.retireeYears ?? 0) + 1;
  if (state.military.retireeYears === 1) ctx.log(us ? 'Retiree benefits: the commissary and exchange, TRICARE for the family, the base golf course, and Space-A flights.' : 'Veterans\' benefits: Forces discounts, a veterans\' card and help from the service charities.', '🎖️', 'good');
}

const CONTRACTS = [
  { id: 'gulf', icon: '🏜️', kind: 'training', countries: ['AE', 'SA', 'QA'], legal: true, pay: [180000, 320000], risk: 0.02, text: (c) => `${c}'s armed forces want a retired American officer to stand up a new training command: a villa, a driver and a tax-free salary.`, title: 'Senior Adviser' },
  { id: 'africa', icon: '🌍', kind: 'commission', countries: ['SO', 'NG', 'ML', 'CF', 'MZ'], legal: true, pay: [120000, 220000], risk: 0.06, text: (c) => `The government of ${c} offers you a colonel's commission in its army to command its special-forces school.`, title: 'Colonel (contract)' },
  { id: 'pmc', icon: '💰', kind: 'mercenary', countries: ['LY', 'SD', 'CF', 'ML', 'YE'], legal: false, pay: [250000, 500000], risk: 0.15, text: (c) => `A private military company wants you to lead a unit fighting for one side of the civil war in ${c}. No questions asked; cash in a Dubai account.`, title: 'Team Leader (private army)' },
  { id: 'legion', icon: '🇺🇦', kind: 'volunteer', countries: ['UA'], legal: true, pay: [20000, 40000], risk: 0.12, text: () => 'Ukraine\'s International Legion is recruiting experienced foreign volunteers.', title: 'Legion volunteer' },
];

function contractYear(ctx) {
  const { state, rng } = ctx;
  const c = state.military.contract;
  const age = state.character.age;
  if (c) {
    if (age >= c.until) {
      state.military.contract = null;
      if (c.kind === 'commission') for (const p of state.retirement?.pensions ?? []) if (p.id === 'military') p.suspended = false;
      return ctx.log(`Your contract in ${COUNTRIES[c.country]?.name ?? c.country} ended. You came home with money and stories you mostly don't tell.`, c.icon ?? '✈️', 'info');
    }
    ctx.earn(c.pay, `Contract abroad — ${c.title}`, { wage: true });
    ctx.stat('stress', c.kind === 'mercenary' ? 10 : 4);
    if (rng.chance(c.risk)) {
      if (rng.chance(0.25)) return ctx.die(`killed in ${COUNTRIES[c.country]?.name ?? c.country} while on contract`);
      ctx.stat('health', -rng.int(10, 30));
      ctx.log(`You were wounded in ${COUNTRIES[c.country]?.name ?? c.country}.`, '🩹', 'bad');
    }
    return undefined;
  }
  const h = lastService(state);
  if (!h || state.military.service || state.career?.job || age < 28 || age > 62 || state.legal?.incarceration) return undefined;
  const senior = (h.track === 'officer' && (h.grade ?? 0) >= 3) || (h.track === 'enlisted' && (h.grade ?? 0) >= 5);
  if (!senior || state.prompts.some((p) => p.type === 'warRoles.contract') || !rng.chance((h.combatTours ?? 0) > 0 ? 0.12 : 0.05)) return undefined;
  const pool = CONTRACTS.filter((x) => x.id !== 'gulf' || (h.track === 'officer' && (h.grade ?? 0) >= 4));
  const offer = rng.pick(pool);
  const country = rng.pick(offer.countries);
  const pay = Math.round(rng.int(...offer.pay) / 1000) * 1000;
  return ctx.prompt({
    type: 'warRoles.contract', icon: offer.icon, title: 'An Offer from Abroad',
    text: `${offer.text(COUNTRIES[country]?.name ?? country)} $${pay.toLocaleString()} a year for two years.${!offer.legal ? ' Fighting for pay in another country\'s war is mercenarism — a crime in many countries.' : retiredFrom(state) && !h.nation ? ' Retired officers need the service\'s and the State Department\'s approval to work for a foreign government, or the retired pay stops.' : ''}`,
    options: [{ id: 'accept', label: '✍️ Sign the contract', tone: offer.legal ? undefined : 'danger' }, { id: 'decline', label: '🙅 Decline' }],
    data: { id: offer.id, country, pay },
  });
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const once = (ctx, key) => {
  if (yearlyCount(ctx.state, key)) { ctx.toast('Once a year', 'warn'); return false; }
  bumpYearly(ctx.state, key);
  return true;
};
const charm = (state) => (state.stats.smarts + state.stats.looks + state.stats.happiness) / 3;

export const WarRolesModule = {
  id: 'warRoles',
  order: 21.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive || !state.military) return;
    callBackYear(ctx);
    retireeYear(ctx);
    contractYear(ctx);
  },
  actions: {
    /** The leader: arg = surge | negotiate | fund | mobilize | address. */
    lead(ctx, arg) {
      const { state, rng } = ctx;
      const r = warRoles(state);
      if (!r.leader) return ctx.toast('The head of government at war', 'warn');
      if (!once(ctx, `warRoles.lead.${arg}`)) return undefined;
      const war = r.war;
      if (arg === 'surge') {
        nudge(war, rng.int(4, 14), -6);
        if (war.intensity < 4 && rng.chance(0.5)) war.intensity += 1;
        war.casualties += rng.int(300, 2000);
        return ctx.log(`You ordered a surge: more brigades, more aircraft. The front moved — and so did the casualty lists. Support: ${war.support}%.`, '⚔️', 'warn');
      }
      if (arg === 'negotiate') {
        if (war.phase === 'active' && rng.chance(clamp(0.25 + Math.max(0, -war.front) / 200 + (war.support < 40 ? 0.15 : 0), 0.1, 0.8))) {
          war.phase = 'talks';
          return ctx.log('Your envoys got both sides to the table. Peace talks begin.', '🕊️', 'milestone');
        }
        nudge(war, 0, -2);
        return ctx.log('The other side rejected your offer of talks. Hawks at home called it weakness.', '🕊️', 'warn');
      }
      if (arg === 'fund') {
        nudge(war, rng.int(3, 8), -3);
        if (state.economy) state.economy.inflation = Math.round((state.economy.inflation + 0.004) * 1000) / 1000;
        return ctx.log('An emergency war budget: ammunition, drones and air defence. The deficit grew.', '💵', 'info');
      }
      if (arg === 'mobilize') {
        if (war.intensity < 2) return ctx.toast('Only in a sustained war', 'warn');
        if (!war.draft) war.draft = true; else war.mobilized = true;
        nudge(war, 6, -8);
        return ctx.log(war.mobilized ? 'You declared general mobilization.' : 'You brought back the draft.', '📨', 'warn');
      }
      const gain = Math.round(2 + (charm(state) - 50) / 10 + rng.int(-2, 4));
      nudge(war, 0, gain);
      return ctx.log(gain > 0 ? `Your address to the nation landed: support rose to ${war.support}%.` : `Your address fell flat. Support: ${war.support}%.`, '🎙️', gain > 0 ? 'good' : 'warn');
    },
    /** A legislator: vote the war's funding. arg = for | against. */
    vote(ctx, arg) {
      const { state } = ctx;
      const r = warRoles(state);
      if (!r.legislator) return ctx.toast('A legislator in a country at war', 'warn');
      if (!once(ctx, 'warRoles.vote')) return undefined;
      if (arg === 'for') nudge(r.war, 2, 0); else nudge(r.war, -1, 0);
      const o = state.politics.office;
      const popular = (arg === 'for') === (r.war.support >= 50);
      o.approval = clamp((o.approval ?? 50) + (popular ? 3 : -3), 0, 100);
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 2);
      return ctx.log(`You voted ${arg === 'for' ? 'for' : 'against'} the war funding. ${popular ? 'Most of your voters agreed.' : 'Your voters were split, and angry.'}`, '🗳️', 'info');
    },
    /** A general: the campaign this year. arg = offensive | defensive | raid. */
    campaign(ctx, arg) {
      const { state, rng } = ctx;
      const r = warRoles(state);
      if (!r.general) return ctx.toast('A general or admiral in a war', 'warn');
      if (!once(ctx, 'warRoles.campaign')) return undefined;
      const svc = state.military.service;
      const skill = (state.stats.smarts - 50) / 5 + ((svc.eval ?? 60) - 60) / 10;
      const war = r.svcWar;
      let move;
      if (arg === 'offensive') move = rng.int(-10, 16) + skill;
      else if (arg === 'raid') move = rng.chance(0.45 + skill / 50) ? rng.int(10, 18) : -rng.int(4, 10);
      else move = rng.int(-3, 6) + skill / 2;
      nudge(war, move, move > 5 ? 3 : move < -3 ? -4 : 0);
      svc.eval = clamp((svc.eval ?? 60) + Math.sign(move) * 4, 0, 100);
      if (arg === 'offensive') war.casualties += rng.int(500, 3000);
      return ctx.log(`${{ offensive: 'Your offensive', defensive: 'Your defensive line', raid: 'Your deep raid' }[arg]} ${move > 5 ? 'broke through: the front moved your way' : move < -3 ? 'went badly: the enemy gained ground' : 'held the line'}. Front ${war.front > 0 ? '+' : ''}${Math.round(war.front)}.`, '🗺️', move > 0 ? 'good' : 'warn');
    },
    /** A soldier: volunteer for the front line. */
    front(ctx) {
      const { state, rng } = ctx;
      const r = warRoles(state);
      if (!r.soldier) return ctx.toast('Serving in a war', 'warn');
      if (!once(ctx, 'warRoles.front')) return undefined;
      const svc = state.military.service;
      if (rng.chance(0.02)) return ctx.die('killed in action at the front');
      if (rng.chance(0.15)) { ctx.stat('health', -rng.int(8, 25)); ctx.log('You were wounded at the front.', '🩹', 'bad'); }
      const ok = rng.chance(clamp(0.4 + (state.stats.fitness - 50) / 120, 0.2, 0.8));
      warContribution(state, svc, ok);
      svc.combatTours = (svc.combatTours ?? 0) + 1;
      ctx.stat('stress', 8);
      if (ok) battlefieldPromotion(ctx, svc, 60 + state.stats.fitness / 3);
      return ctx.log(ok ? 'Your unit took and held its objective.' : 'Your unit was thrown back with losses.', '⚔️', ok ? 'good' : 'warn');
    },
  },
  resolvers: {
    callBack(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'serve') return ctx.log('You stayed home. Some old comrades went.', '🏠', 'info');
      const h = lastService(state);
      if (h) returnToService(ctx, h, { bonus: data.bonus, recalled: data.retired });
      return undefined;
    },
    contract(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'accept') return ctx.log('You turned the offer down.', '🙅', 'info');
      const offer = CONTRACTS.find((x) => x.id === data.id);
      state.military.contract = { kind: offer.kind, country: data.country, until: state.character.age + 2, pay: data.pay, title: offer.title, risk: offer.risk, icon: offer.icon };
      ctx.log(`You signed on: ${offer.title} in ${COUNTRIES[data.country]?.name ?? data.country}.`, offer.icon, 'milestone');
      if (!offer.legal) ctx.emit('legal:offense', { offenseId: 'mercenarism', context: `fighting for pay in ${COUNTRIES[data.country]?.name ?? data.country}`, discovery: 0.25, evidence: 0.6 });
      // A US retiree working for a foreign government without approval loses the retired pay.
      if (offer.kind === 'commission' && retiredFrom(state) && !retiredFrom(state).nation) for (const p of state.retirement?.pensions ?? []) if (p.id === 'military') p.suspended = true;
      return undefined;
    },
  },
};
