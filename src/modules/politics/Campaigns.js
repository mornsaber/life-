/**
 * Who may run, and the odds: eligibility for every office, the projected vote share
 * (Elections has the model; party leaderships and parliaments choose their own way),
 * and which endorsements you can earn. The campaign itself is on the trail
 * (CampaignTrail).
 */
import { prestige, isOnActiveDuty, isIncarcerated } from '../../core/State.js';
import { regimeOf } from '../world/Regimes.js';
import { clamp } from '../../core/Random.js';
import { residencyYears, stateOf } from '../life/Regions.js';
import { hasCredential, checkRequirements } from '../credentials/LicensingEngine.js';
import { yearsInProfession } from '../../core/State.js';
import { OFFICES } from './Offices.js';
import { isAbroad, US_ONLY, LOCAL_OFFICES, isCitizen } from '../world/Countries.js';
import { partyBonus } from './Parties.js';
import { generalShare, scandalDrag } from './Elections.js';
import { stateIdOf } from '../life/Regions.js';

export function runEligibility(state, officeId) {
  const office = OFFICES[officeId];
  const p = state.politics;
  if (!office) return { ok: false, reason: 'Unknown office' };
  const here = state.character.countryId ?? 'US';
  if (office.country ? office.country !== here : here !== 'US' && !LOCAL_OFFICES.includes(officeId)) return { ok: false, reason: office.country ? 'An office in another country' : US_ONLY.office };
  if (office.country && !isCitizen(state, office.country)) return { ok: false, reason: 'Citizens only' };
  // Elections are for citizens (EU citizens may stand in local elections anywhere in the EU).
  const euLocal = LOCAL_OFFICES.includes(officeId) && ['DE', 'IT'].includes(here) && ['DE', 'IT'].some((c) => isCitizen(state, c));
  if (!office.country && !isCitizen(state, here) && !euLocal) return { ok: false, reason: here === 'US' ? 'U.S. citizens only' : 'Citizens only' };
  if (office.provinces && !office.provinces.includes(stateIdOf(state))) return { ok: false, reason: 'Not in your part of the country' };
  // China: offices go to Party cadres the Organization Department puts forward.
  if (here === 'CN') {
    const cpc = state.cpc;
    const member = cpc?.status === 'member';
    if (officeId === 'cn_premier' && (!member || cpc.rank < 8)) return { ok: false, reason: 'Chosen from the Politburo Standing Committee' };
    if (officeId === 'mayor' && (!member || cpc.rank < 3)) return { ok: false, reason: 'Mayors are appointed through the Party: county Party secretary or higher' };
    if (officeId === 'cn_deputy' && !member && (p.recognition ?? 0) < 60) return { ok: false, reason: 'Nominated by the Party (or, for a well-known figure, a minor party)' };
  }
  // Other one-party states and the countries without elections.
  const regime = regimeOf(here);
  if (here !== 'CN' && regime.party && (state.cpc?.status !== 'member' || (state.cpc.rank ?? 0) < 1)) return { ok: false, reason: 'Candidates are chosen by the Party: rise as a cadre first' };
  if (regime.elections === 'none' && here !== 'CN') return { ok: false, reason: 'There are no elections here: posts are appointed' };
  // Members of the House of Lords can't sit in the Commons.
  if (officeId === 'gb_mp' && state.character.style?.peerage) return { ok: false, reason: 'Peers can\'t sit in the Commons' };
  if (office.requires && !office.requires.includes(p.office?.id)) return { ok: false, reason: office.leader ? `Party leaders come from the house: hold ${office.requires.map((id) => OFFICES[id].name).join(' or ')} first` : `Elected by local officials: hold ${office.requires.map((id) => OFFICES[id].name).join(' or ')} first` };
  if (office.runningMate) return { ok: false, reason: 'Chosen as a running mate by the presidential nominee' };
  if (office.selection === 'appointed') return { ok: false, reason: `Appointed by ${office.chosenBy}` };
  if (office.naturalBorn && (state.migration?.naturalized ?? []).includes(here)) return { ok: false, reason: 'Natural-born citizens only' };
  // A head of state is chosen from people of real standing: a past high office, or a household name.
  if (office.stature && experienceLevel(state) < office.stature && (p.recognition ?? 0) < 75) return { ok: false, reason: `Needs national standing: past high office or name recognition 75+` };
  if (p.campaign) return { ok: false, reason: 'Already campaigning' };
  if (p.office?.id === officeId) return { ok: false, reason: 'You hold this office' };
  if (office.appointedBy) return { ok: false, reason: `Hired by ${office.appointedBy}, not elected` };
  if (state.character.age < office.minAge) return { ok: false, reason: `Must be ${office.minAge}+` };
  if (residencyYears(state) < office.residency) return { ok: false, reason: `${office.residency} yr residency in ${stateOf(state).name}` };
  if (isIncarcerated(state)) return { ok: false, reason: 'Incarcerated' };
  if (isOnActiveDuty(state)) return { ok: false, reason: 'Active duty can\'t run (Hatch Act)' };
  if (state.career.job?.sector === 'federal') return { ok: false, reason: 'Federal employees can\'t run (Hatch Act)' };
  if (office.req) {
    const check = checkRequirements(state, office.req);
    if (!check.ok) return { ok: false, reason: `Needs ${check.missing.join(', ')}` };
  }
  if (office.judicial) {
    if (!hasCredential(state, 'barLicense')) return { ok: false, reason: 'Needs a bar license' };
    if (yearsInProfession(state, ['law', 'prosecution', 'publicDefender', 'courts']) < 7) return { ok: false, reason: '7 yrs legal practice' };
  }
  const termsHere = p.history.filter((h) => h.officeId === officeId).reduce((s, h) => s + h.terms, 0);
  if (office.termLimit && termsHere >= office.termLimit) return { ok: false, reason: 'Term-limited' };
  return { ok: true };
}

/** Highest office level held so far (experience). */
export function experienceLevel(state) {
  const levels = state.politics.history.map((h) => OFFICES[h.officeId].level);
  if (state.politics.office) levels.push(OFFICES[state.politics.office.id].level);
  return Math.max(0, ...levels);
}

export const scandalPenalty = (state) => scandalDrag(state);

/** Estimated vote share (before election-night noise). */
export function voteShare(state, officeId, campaign, { incumbent = false } = {}) {
  const office = OFFICES[officeId];
  const p = state.politics;
  // Prime ministers, premiers and first ministers: a party leadership contest among colleagues,
  // won on seniority, standing in the house and popularity, not on money.
  if (office.leader && !incumbent) {
    const post = { majority: 0.08, presiding: 0.05, whip: 0.04, chair: 0.03 }[state.legislature?.seat?.post] ?? 0;
    const lead = 0.4 + Math.min(0.12, p.recognition * 0.0015) + Math.min(0.12, ((p.office?.terms ?? 1) - 1) * 0.04) + ((p.office?.approval ?? 50) - 50) / 250
      + post + (campaign?.endorsements.length ?? 0) * 0.015 + Math.min(0.04, prestige(state) / 2000) - scandalPenalty(state) + partyBonus(state) * 1.5;
    return clamp(lead, 0.05, 0.8);
  }
  // Chosen by parliament or a convention: the governing majority's candidate, if your party holds it.
  if (office.selection === 'parliament') {
    const nat = Object.values(state.legislature?.bodies ?? {}).find((b) => b.level === 'federal');
    const mine = state.civic?.party?.bloc;
    const majority = nat ? (nat.labor * 2 > nat.seats ? 'labor' : 'business') : null;
    const share = 0.3 + Math.min(0.15, p.recognition * 0.002) + Math.max(0, experienceLevel(state) - 3) * 0.04 + (mine && mine === majority ? 0.1 : mine ? -0.05 : 0) + partyBonus(state) * 1.5 + Math.min(0.04, prestige(state) / 2000) - scandalPenalty(state);
    return clamp(share, 0.05, 0.8);
  }
  // Everything else: the voters, the issues and the other candidate (Elections).
  return generalShare(state, officeId, campaign, { incumbent }).share;
}

export function endorsementEligible(state, id) {
  const job = state.career.job;
  const hist = state.career.history;
  switch (id) {
    case 'labor': return Boolean(job?.unionMember) || state.politics.laborVotes > 1;
    case 'veterans': return state.military.history.length > 0 || Boolean(state.military.service);
    case 'lawEnforcement': return ['police', 'fire', 'statePolice', 'corrections', 'ems', 'sheriff', 'jail', 'privatePolice', 'federalPrisons', 'probation', 'dispatch'].some((p) => job?.professionId === p || hist.some((h) => h.professionId === p)) || Object.values(state.emergency).some((m) => m && m.serviceName);
    case 'party': return state.politics.recognition >= 25 || ['organizer', 'officer'].includes(state.civic?.party?.role);
    case 'editorial': return state.stats.smarts >= 60;
    case 'bar': return hasCredential(state, 'barLicense');
    case 'parents': return ['officer', 'president'].includes(state.civic?.pta?.role) || state.politics.history.some((h) => h.officeId === 'schoolBoard') || state.politics.office?.id === 'schoolBoard';
    case 'activists': return (state.civic?.activism?.influence ?? 0) >= 30;
    default: return false;
  }
}

/** Appointed offices (city manager): apply, and the council decides. */
export function appointmentEligibility(state, officeId) {
  const office = OFFICES[officeId];
  if (!office?.appointedBy) return { ok: false, reason: 'Not an appointed office' };
  if ((state.character.countryId ?? 'US') !== 'US' && !LOCAL_OFFICES.includes(officeId)) return { ok: false, reason: US_ONLY.office };
  if (state.politics.office?.id === officeId) return { ok: false, reason: 'You hold this office' };
  if (office.cabinet) return { ok: false, reason: 'Nominated by the President, confirmed by the Senate' };
  if (state.character.age < office.minAge) return { ok: false, reason: `Must be ${office.minAge}+` };
  if (isIncarcerated(state)) return { ok: false, reason: 'Incarcerated' };
  if (office.req) {
    const check = checkRequirements(state, office.req);
    if (!check.ok) return { ok: false, reason: `Needs ${check.missing.join(', ')}` };
  }
  return { ok: true };
}

