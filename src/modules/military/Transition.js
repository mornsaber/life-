/**
 * Leaving the military: the Transition Assistance Program, DoD SkillBridge
 * internships, veteran hiring fairs, unemployment compensation for
 * ex-servicemembers (UCX), VA health care and the readjustment to civilian
 * life.
 *
 *   TAP          In your last year you pick a track: employment (a hiring
 *                edge for three years), education (Yellow Ribbon: the GI
 *                Bill covers more tuition) or entrepreneurship (Boots to
 *                Business: a grant if you start a business within five years).
 *   SkillBridge  Spend your last months interning with a civilian employer;
 *                when you separate, they offer you the job.
 *   Hiring fairs For three years after separation, unemployed veterans get
 *                offers in the civilian field their military job maps to.
 *   UCX          A year of unemployment pay if you separate without a job.
 *
 * state.military.transition = { track, separatedAge, ucxPaid, grantPaid, readjusted }
 * svc.tapDone, svc.skillBridge = { professionId, employerName }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { getProfession } from '../career/JobTrees.js';
import { hire, bestEntryLevel, applicationEligibility, levelCheck } from '../career/CareerEngine.js';
import { createEmployer } from '../career/Employers.js';
import { MOS } from './MOS.js';

export const TRACKS = {
  employment: { name: 'Employment', icon: '💼', desc: 'Résumé writing, interview prep and translating your military experience. A hiring edge for three years.' },
  education: { name: 'Higher education', icon: '🎓', desc: 'GI Bill counseling and a Yellow Ribbon school: the GI Bill covers more of your tuition.' },
  entrepreneurship: { name: 'Entrepreneurship (Boots to Business)', icon: '🚀', desc: 'SBA training and a veteran small-business grant if you start a business within five years.' },
};
export const FAIR_YEARS = 3;
export const UCX = 12000;
export const VET_GRANT = 15000;
export const YELLOW_RIBBON = 15000;

const HONORABLE = ['honorable', 'general', 'medical', 'retired'];
const BY_SPECIALTY = { infantry: 'police', medic: 'ems', engineer: 'trades', aviation: 'aviation', intel: 'intelligence', cyber: 'cybersecurity', logistics: 'logistics', legal: 'legalSupport', medical: 'medical', chaplain: 'clergy' };

const nearSeparation = (svc) => svc.component === 'active' && (svc.contractYearsLeft <= 1 || svc.yearsOfService >= 19);
const tr = (state) => (state.military.transition ??= {});

/** The civilian field your military job leads to. */
export function civilianField(state, h = state.military.service ?? state.military.history.at(-1)) {
  const m = h?.mos && MOS[h.mos];
  const id = m?.civilian ?? BY_SPECIALTY[h?.specialty];
  try { return id && getProfession(id) ? id : null; } catch { return null; }
}

/** A hiring edge from TAP's employment track. */
export function transitionHiringBonus(state) {
  const t = state.military.transition;
  return t?.track === 'employment' && t.separatedAge != null && state.character.age - t.separatedAge <= FAIR_YEARS ? 0.1 : 0;
}

/** Extra GI Bill coverage at a Yellow Ribbon school. */
export const yellowRibbon = (state) => (state.military.transition?.track === 'education' ? YELLOW_RIBBON : 0);

/** During service: TAP in your final year. */
export function transitionTick(ctx, svc) {
  if (!nearSeparation(svc) || svc.tapDone || ctx.state.prompts.some((p) => p.type === 'military.tap')) return;
  ctx.prompt({
    type: 'military.tap',
    icon: '🧭',
    title: 'Transition Assistance Program',
    text: 'Your separation date is getting close. TAP is mandatory. Which track will you take?\nYou can also apply for a SkillBridge internship with a civilian employer for your last months in uniform.',
    options: Object.entries(TRACKS).map(([id, t]) => ({ id, label: `${t.icon} ${t.name}`, hint: t.desc })),
  });
}

export function skillBridgeEligibility(state, professionId) {
  const svc = state.military.service;
  if (!svc) return { ok: false, reason: 'Not serving' };
  if (!nearSeparation(svc)) return { ok: false, reason: 'In your last year of service' };
  if (svc.skillBridge) return { ok: false, reason: `Already interning (${getProfession(svc.skillBridge.professionId).name})` };
  if (yearlyCount(state, 'military.skillBridge')) return { ok: false, reason: 'One application a year' };
  // Would you qualify for the job if you were a civilian?
  const civ = applicationEligibility({ ...state, military: { ...state.military, service: null } }, professionId);
  return civ.ok ? { ok: true } : civ;
}

export function applySkillBridge(ctx, professionId) {
  const { state, rng } = ctx;
  const check = skillBridgeEligibility(state, professionId);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, 'military.skillBridge');
  const svc = state.military.service;
  const profession = getProfession(professionId);
  if (!rng.chance(clamp(0.6 + (svc.eval - 60) / 100, 0.2, 0.95))) return ctx.log('Your commander needed you through your last day and denied the SkillBridge request.', '🧭', 'warn');
  const employer = createEmployer(rng, state, profession, state.character.regionId);
  svc.skillBridge = { professionId, employerName: employer.name };
  ctx.log(`Your SkillBridge internship was approved: your last months in uniform are with ${employer.name}, learning the ${profession.name.toLowerCase()} trade on the military's dime.`, '🧭', 'good');
}

/** When you separate: a SkillBridge offer, and the clock on veteran benefits starts. */
export function onSeparation(ctx, svc, type) {
  const { state } = ctx;
  if (!HONORABLE.includes(type)) return;
  const t = tr(state);
  t.separatedAge = state.character.age;
  t.ucxPaid = false;
  t.readjusted = false;
  if (svc?.skillBridge) {
    const p = getProfession(svc.skillBridge.professionId);
    ctx.prompt({
      type: 'military.skillBridgeOffer',
      icon: '🤝',
      title: 'SkillBridge Job Offer',
      text: `${svc.skillBridge.employerName} liked your work as an intern and offered you a job in ${p.name.toLowerCase()}.`,
      options: [{ id: 'accept', label: '✅ Accept' }, { id: 'decline', label: '🙅 Look elsewhere' }],
      data: { ...svc.skillBridge },
    });
  }
}

function offerHire(ctx, professionId, employerName) {
  const { state, rng } = ctx;
  const profession = getProfession(professionId);
  if (!applicationEligibility(state, professionId).ok) return ctx.toast('The offer fell through.', 'warn');
  const employer = createEmployer(rng, state, profession, state.character.regionId);
  if (employerName) employer.name = employerName;
  const level = bestEntryLevel(state, profession, employer.size);
  if (!level || !levelCheck(state, level).ok) return ctx.toast('The offer fell through.', 'warn');
  hire(ctx, { professionId, levelId: level.id, employer, step: 2 });
}

/** After service: hiring fairs, UCX, the Boots to Business grant and readjustment. */
export function veteranTick(ctx) {
  const { state, rng } = ctx;
  const t = state.military.transition;
  if (!t || t.separatedAge == null || state.military.service || state.legal.incarceration) return;
  const since = state.character.age - t.separatedAge;
  if (since === 1 && !t.readjusted && !state.prompts.some((p) => p.type === 'military.readjust')) {
    t.readjusted = true;
    ctx.prompt({
      type: 'military.readjust',
      icon: '🏡',
      title: 'Civilian Life',
      text: 'A year out of uniform. Nobody tells you what to do at 0600 anymore. Some days that feels like freedom; some days you miss your unit more than you expected.',
      options: [
        { id: 'vetCenter', label: '🫂 Talk to someone at a Vet Center', hint: 'Free readjustment counseling' },
        { id: 'peers', label: '🍻 Find other veterans (a VFW, a running club, a Discord)', hint: 'Peer support' },
        { id: 'push', label: '💪 Push through on your own' },
      ],
    });
  }
  if (!state.career.job && since <= 1 && !t.ucxPaid) {
    t.ucxPaid = true;
    ctx.earn(UCX, 'Unemployment compensation for ex-servicemembers (UCX)');
  }
  if (!state.career.job && since <= FAIR_YEARS && rng.chance(0.6) && !state.prompts.some((p) => p.type === 'military.hiringFair')) {
    const field = civilianField(state);
    if (field && applicationEligibility(state, field).ok) {
      const p = getProfession(field);
      ctx.prompt({
        type: 'military.hiringFair',
        icon: '🇺🇸',
        title: 'Veteran Hiring Fair',
        text: `At a Hiring Our Heroes job fair, an employer looking for veterans offered you a job in ${p.name.toLowerCase()}, the civilian side of your military job.`,
        options: [{ id: 'accept', label: '✅ Take it' }, { id: 'decline', label: '🙅 Keep looking' }],
        data: { professionId: field },
      });
    }
  }
}

export const TransitionActions = {
  skillBridge: (ctx, professionId) => applySkillBridge(ctx, professionId),
};

export const TransitionResolvers = {
  tap(ctx, _data, optionId) {
    const svc = ctx.state.military.service;
    if (!svc || !TRACKS[optionId]) return;
    svc.tapDone = true;
    tr(ctx.state).track = optionId;
    ctx.log(`You finished TAP on the ${TRACKS[optionId].name.toLowerCase()} track.`, TRACKS[optionId].icon, 'good');
  },
  skillBridgeOffer(ctx, data, optionId) {
    if (optionId === 'accept') offerHire(ctx, data.professionId, data.employerName);
  },
  hiringFair(ctx, data, optionId) {
    if (optionId === 'accept') offerHire(ctx, data.professionId);
  },
  readjust(ctx, _data, optionId) {
    if (optionId === 'vetCenter') {
      ctx.emit('health:trauma', { amount: -10, source: 'therapy' });
      ctx.stat('happiness', 4);
      ctx.log('A counselor at the Vet Center had served too. It helped more than you expected.', '🫂', 'good');
    } else if (optionId === 'peers') {
      ctx.stat('happiness', 6);
      ctx.emit('health:trauma', { amount: -5, source: 'support' });
      ctx.log('You found your people again: other veterans who get it.', '🍻', 'good');
    } else {
      ctx.stat('stress', 5);
      ctx.log('You kept it to yourself and got on with it.', '💪');
    }
  },
};

/** Boots to Business: a grant when a TAP entrepreneur starts a business within five years. */
export function onBusinessStarted(ctx) {
  const t = ctx.state.military.transition;
  if (t?.track !== 'entrepreneurship' || t.grantPaid || t.separatedAge == null || ctx.state.character.age - t.separatedAge > 5) return;
  t.grantPaid = true;
  ctx.earn(VET_GRANT, 'Veteran small-business grant (Boots to Business)');
  ctx.log('Your Boots to Business training paid off: a veteran small-business grant came through.', '🚀', 'good');
}
