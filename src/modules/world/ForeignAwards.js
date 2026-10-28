/**
 * Honours from abroad. States decorate foreigners who served alongside them or did them
 * a good turn, at a grade that matches the recipient's standing:
 *
 *   Diplomats    an ambassador leaving a post is often decorated by the host state
 *   Officials    senior international civil servants, by the states their work touched
 *   Leaders      heads of state and government, ministers, on state visits
 *   Royals       working royals and monarchs, on state visits (a Grand Cross, or the collar)
 *   Commanders   generals and admirals, by allies they fought or trained beside
 *   Benefactors  great philanthropists and business leaders, by the countries they invested in
 *
 * Foreign awards are honorary: no title, no "Sir", no letters after your name at home.
 *
 * Beyond the states: the Sovereign Order of Malta's Order pro Merito Melitensi (for its staff,
 * benefactors and friends, and to heads of state on a state visit), NATO's Meritorious Service
 * Medal, the Charlemagne Prize for services to European unity, and the Nobel Peace Prize.
 */
import { ORDERS, tierName, eminence } from './Honours.js';
import { addHonor, netWorth } from '../../core/State.js';
import { COUNTRIES, citizenshipsOf } from './Countries.js';
import { countryIdOfName } from './Posting.js';
import { OFFICES } from '../politics/Offices.js';
import { INTL_ORG_PROFESSIONS, EU_MEMBERS, NATO_MEMBERS, DUTY_STATIONS } from '../career/IntlOrgCareers.js';

const home = (state) => state.character.countryId ?? 'US';
const has = (state, id) => state.honors.some((h) => h.id === id);
const ALLIES = { US: ['GB', 'CA', 'AU', 'FR', 'DE', 'JP', 'KR', 'IT', 'PL', 'NL'], GB: ['US', 'CA', 'AU', 'NZ', 'FR', 'NL', 'NO', 'DK'], FR: ['DE', 'BE', 'IT', 'ES', 'US', 'GB', 'SN', 'CI'], '*': ['US', 'GB', 'FR', 'DE', 'JP', 'IT', 'ES', 'NL', 'SE', 'NO', 'KR', 'BR', 'IN'] };
const PRO_MERITO = ['Cross pro Merito Melitensi', 'Officer\'s Cross pro Merito Melitensi', 'Commander\'s Cross pro Merito Melitensi', 'Grand Cross pro Merito Melitensi', 'Collar pro Merito Melitensi'];

/** Who might decorate you this year, and why: [{ cc, why, weight }]. */
function suitors(state) {
  const out = [];
  const job = state.career.job;
  const office = state.politics?.office;
  const def = office ? OFFICES[office.id] : null;
  const allies = (ALLIES[home(state)] ?? ALLIES['*']).filter((c) => c !== home(state));
  // An ambassador's host country.
  if (job?.posting?.country && (job.grade ?? 0) >= 8) {
    const cc = countryIdOfName(job.posting.country);
    if (cc) out.push({ cc, why: `your years as ${job.title} in ${job.posting.country}`, weight: 3 });
  }
  // International civil servants: the states their organisation serves.
  if (job && INTL_ORG_PROFESSIONS[job.professionId] && (job.grade ?? 0) >= 8) {
    const st = DUTY_STATIONS[job.employer?.name];
    for (const [, country] of [st?.hq, ...(st?.field ?? [])].filter(Boolean)) {
      const cc = countryIdOfName(country);
      if (cc && cc !== home(state)) out.push({ cc, why: `your work with the ${job.employer.name}`, weight: 1 });
    }
  }
  // Heads of state and government, ministers: state visits.
  if (def && (def.level ?? 0) >= 4 && (def.executive || def.headOfState || /cabinet|minister/i.test(office.id))) for (const cc of allies) out.push({ cc, why: 'a state visit', weight: (def.level ?? 0) >= 5 ? 2 : 1 });
  if (state.royal?.reigning || (state.royal?.working && state.royal.line != null && state.royal.line <= 3)) for (const cc of allies) out.push({ cc, why: 'a state visit', weight: 2 });
  // Generals and admirals: allies they served beside.
  const svc = state.military?.service;
  if (svc?.track === 'officer' && svc.grade >= 6) for (const cc of allies.slice(0, 5)) out.push({ cc, why: 'service alongside its forces', weight: 1 });
  // Great benefactors.
  if (netWorth(state) >= 5e8) for (const cc of allies.slice(0, 4)) out.push({ cc, why: 'your investment and philanthropy in the country', weight: 1 });
  return out.filter((s) => ORDERS[s.cc]?.tiers?.length && !citizenshipsOf(state).includes(s.cc));
}

/** A foreign state's order, at a grade matching your standing (one award per country, raised later if earned). */
export function awardForeign(ctx, s) {
  const { state } = ctx;
  const tiers = ORDERS[s.cc].tiers.filter((t) => !t.peer && !t.knighthood);
  if (!tiers.length) return false;
  const e = eminence(state) + (state.royal?.reigning ? 300 : state.royal ? 120 : 0);
  let idx = tiers.findLastIndex((t) => e >= t.min * 0.9);
  if (idx < 0) idx = 0;
  const prior = state.honors.find((h) => h.source === 'foreign' && h.country === s.cc && h.foreignTier != null);
  if (prior && prior.foreignTier >= idx) return false;
  const t = tiers[idx];
  const name = `${tierName(t, state.character.gender)}`;
  if (prior) state.honors = state.honors.filter((h) => h !== prior);
  addHonor(state, { id: `foreign.${s.cc}`, source: 'foreign', from: COUNTRIES[s.cc].name, country: s.cc, foreignTier: idx, order: ORDERS[s.cc].order === null ? null : t.order ?? ORDERS[s.cc].order ?? `${COUNTRIES[s.cc].name} order of merit`, name: `${name} (${COUNTRIES[s.cc].name}, honorary)`, icon: '🎖️', ribbon: t.ribbon, precedence: 8, prestige: Math.round(t.min / 4), citation: `Conferred by ${COUNTRIES[s.cc].name} for ${s.why}.` });
  ctx.log(`${COUNTRIES[s.cc].flag} ${COUNTRIES[s.cc].name} ${prior ? 'raised you' : 'decorated you'}: ${name}, for ${s.why}. An honorary award — no title at home, but the insignia is yours.`, '🎖️', 'honor');
  ctx.stat('happiness', 4);
  return true;
}

/** The Order of Malta's merit order: for its staff and benefactors, Catholic notables, and visiting heads of state. */
function proMerito(ctx) {
  const { state, rng } = ctx;
  const held = state.honors.find((h) => h.id === 'smom.proMerito');
  const level = held?.level ?? -1;
  const job = state.career.job;
  const office = state.politics?.office;
  const head = office && (OFFICES[office.id]?.headOfState || ((OFFICES[office.id]?.level ?? 0) >= 5 && OFFICES[office.id]?.leader));
  const catholic = ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);
  let target = -1;
  if (head || state.royal?.reigning) target = 4;
  else if (['maltaRelief', 'maltaDiplomacy'].includes(job?.professionId) && (job.yearsAtEmployer ?? 0) >= 3) target = Math.min(3, Math.floor((job.grade ?? 4) / 2.5));
  else if (catholic && eminence(state) >= 120) target = eminence(state) >= 260 ? 3 : 2;
  else if (job?.professionId === 'foreignService' && (job.grade ?? 0) >= 9) target = 2;
  if (target <= level || !rng.chance(head ? 0.15 : 0.08)) return false;
  if (held) state.honors = state.honors.filter((h) => h !== held);
  addHonor(state, { id: 'smom.proMerito', source: 'foreign', order: 'Order pro Merito Melitensi', from: 'the Sovereign Military Order of Malta', level: target, name: `${PRO_MERITO[target]} (Order of Malta)`, icon: '✠', precedence: 8, prestige: 6 + target * 4, citation: 'Conferred by the Grand Master of the Sovereign Military Order of Malta.' });
  ctx.log(`The Grand Master of the Order of Malta conferred the ${PRO_MERITO[target]} on you.`, '✠', 'honor');
  return true;
}

/** Awards from international bodies. */
function internationalPrizes(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const pol = [...(state.politics?.history ?? []).map((h) => h.officeId), state.politics?.office?.id].filter((id) => OFFICES[id]);
  const led = pol.some((id) => (OFFICES[id].level ?? 0) >= 5 && (OFFICES[id].leader || OFFICES[id].headOfState));
  const e = eminence(state);
  // NATO's Meritorious Service Medal: for its own staff.
  if (job?.professionId === 'nato' && (job.yearsAtEmployer ?? 0) >= 3 && job.performance >= 70 && !has(state, 'intl.natoMsm') && rng.chance(0.25)) {
    addHonor(state, { id: 'intl.natoMsm', source: 'international', name: 'NATO Meritorious Service Medal', icon: '🛡️', precedence: 7, prestige: 8, citation: 'For exceptional service to the Alliance.' });
    ctx.log('The Secretary General awarded you the NATO Meritorious Service Medal.', '🛡️', 'honor');
  }
  // The Charlemagne Prize: Aachen's prize for work for European unity.
  const european = citizenshipsOf(state).some((c) => EU_MEMBERS.includes(c));
  const euTop = job?.professionId === 'euInstitutions' && job.intlPost;
  if (european && (led || euTop) && e >= 300 && !has(state, 'intl.charlemagne') && rng.chance(0.03)) {
    addHonor(state, { id: 'intl.charlemagne', source: 'international', name: 'International Charlemagne Prize of Aachen', icon: '🏅', precedence: 6, prestige: 25, citation: 'For services to European unity.' });
    ctx.log('The city of Aachen awarded you the International Charlemagne Prize, for services to European unity.', '🏅', 'honor');
  }
  // The Nobel Peace Prize: very rare, for those whose work ended wars or built institutions.
  const peacemaker = led || (job && INTL_ORG_PROFESSIONS[job.professionId] && (job.grade ?? 0) >= 10) || ['icrc', 'unAgencies'].includes(job?.professionId);
  if (peacemaker && e >= 380 && !has(state, 'intl.nobelPeace') && rng.chance(0.004)) {
    addHonor(state, { id: 'intl.nobelPeace', source: 'international', name: 'Nobel Peace Prize', icon: '🕊️', precedence: 4, prestige: 60, citation: 'Awarded by the Norwegian Nobel Committee.' });
    ctx.earn(1000000, 'Nobel Peace Prize');
    ctx.stat('happiness', 20);
    ctx.log('The Norwegian Nobel Committee awarded you the Nobel Peace Prize. You flew to Oslo in December to give the lecture.', '🕊️', 'honor');
  }
  void NATO_MEMBERS;
}

export function foreignAwardsYear(ctx) {
  const { state, rng } = ctx;
  if (!state.character.alive || state.character.age < 25 || state.legal.incarceration || (state.legal.record ?? []).some((r) => r.severity === 'felony' && !r.pardoned)) return;
  const list = suitors(state);
  const total = list.reduce((s, x) => s + x.weight, 0);
  if (total && rng.chance(Math.min(0.35, 0.05 * total))) {
    const pick = rng.weighted(list, (x) => x.weight);
    awardForeign(ctx, pick);
  }
  proMerito(ctx);
  internationalPrizes(ctx);
}

export const ForeignAwardsModule = {
  id: 'foreignAwards',
  order: 62.5,
  onAgeUp(ctx) {
    foreignAwardsYear(ctx);
  },
};
