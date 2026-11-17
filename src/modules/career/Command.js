/**
 * Command in the uniformed services: how ready you keep your people, the big days you command,
 * and the inquiry after a bad one.
 *
 *   Readiness   a commander (a police inspector or fire station manager and up, an officer of
 *               major's rank and up) spends a little each year on drills, kit, contingency plans
 *               and agreements with neighbouring services. They fade if neglected. When a
 *               command scene starts, each one tips a score (drills: lives; kit: your crews;
 *               plans: the damage; agreements: public trust), and some options only exist
 *               because you prepared for them.
 *   The days    police commanders face nights of disorder (more in the years of riots) and
 *               sieges; officers commanding in a war fight their battalion's battle; fire and
 *               ambulance commanders get major incidents (engines/MajorIncidents.js).
 *   Inquiry     a command scene that goes badly brings an inquiry the next year. Good
 *               preparation is your defence: the findings can clear you, criticise you and
 *               freeze your promotion, or end your career.
 *
 * state.command = { readiness: { training, kit, plans, mutualAid }, inquiry: { age, sceneId, title, tier, flags } | null, reviewed: [key] }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { eraScale } from '../economy/EraEconomy.js';
import { skill } from '../life/Skills.js';
import { SCENE_START, startScene } from './Scenes.js';
import { PROMO_GATES, leaveJob } from './CareerEngine.js';
import { serviceOfJob } from '../publicsafety/Uniformed.js';
import { rankOf, discharge } from '../military/MilitaryEngine.js';
import { warIn } from '../world/War.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 7121) ^ (state.character.age * 337 + 0xc0d)) >>> 0);
const KEYS = ['training', 'kit', 'plans', 'mutualAid'];
const ccOf = (state) => state.character.countryId ?? 'US';

/** The rank number in your military rank code (O-4, OF-3). */
const rankNumber = (svc) => Number(String(rankOf(svc)?.code ?? '').split('-')[1] ?? 0);
/** Are you a commander? 'civil' (police, fire, ambulance), 'military', or null. */
export function commanderKind(state) {
  const svc = state.military?.service;
  if (svc) return svc.track === 'officer' && rankNumber(svc) >= (svc.nation ? 3 : 4) ? 'military' : null;
  const job = state.career?.job;
  const s = serviceOfJob(job);
  return s && s !== 'corrections' && (job.grade ?? 0) >= 6 ? 'civil' : null;
}
export const readinessOf = (state) => (state.command ??= { readiness: { training: 40, kit: 40, plans: 40, mutualAid: 40 }, inquiry: null, reviewed: [] }).readiness;

/** The yearly preparations, by kind of command. */
export const PREPS = {
  training: { civil: { label: '🏋️ Run a major-incident exercise', hint: 'Everyone learns their job before the real day' }, military: { label: '🏋️ Take the battalion on a field exercise', hint: 'Weeks in the field; tired soldiers who know their drills' } },
  kit: { civil: { label: '🧰 Fight for the equipment budget', hint: 'Win and your crews are better protected' }, military: { label: '🧰 Push for the kit your soldiers need', hint: 'Body armour, radios, night sights' } },
  plans: { civil: { label: '🗂️ Write and test the contingency plans', hint: 'The plan you reach for when it happens' }, military: { label: '🗂️ Rehearse the plans with your company commanders', hint: 'Rehearsal of concept: everyone knows the plan' } },
  mutualAid: { civil: { label: '🤝 Sign mutual-aid agreements with the neighbours', hint: 'Help that comes in an hour, not a day' }, military: null },
};

/* ------------------------------------------------------------------ */
/* Readiness shapes the day                                            */
/* ------------------------------------------------------------------ */

const tip = (v) => (v >= 70 ? 1 : v < 25 ? -1 : 0);
SCENE_START.push((ctx, def, sc) => {
  if (!def.id.startsWith('command.')) return;
  const r = readinessOf(ctx.state);
  sc.score.lives += tip(r.training);
  sc.score.crew += tip(r.kit);
  sc.score.city += tip(r.plans);
  sc.score.trust += tip(r.mutualAid);
  const avg = KEYS.reduce((a, k) => a + r[k], 0) / KEYS.length;
  if (avg >= 65) ctx.log('Months of preparation meant everyone knew their job before you said a word.', '📋', 'good');
  else if (avg < 30) ctx.log('Nobody had drilled for this. You could see it in the first ten minutes.', '📋', 'warn');
});

/* ------------------------------------------------------------------ */
/* The big days                                                        */
/* ------------------------------------------------------------------ */

/** Years of riots, when disorder came more often. */
const UNREST = { US: [[1964, 1972], [1992, 1993], [2014, 2016], [2020, 2021]], GB: [[1981, 1986], [2011, 2012], [2024, 2025]], FR: [[1968, 1969], [2005, 2006], [2023, 2024]], NI: [[1969, 1998]] };
const unrestNow = (state) => (UNREST[ccOf(state)] ?? []).some(([a, b]) => yearNow(state) >= a && yearNow(state) < b);

function bigDay(ctx, kind, rng) {
  const { state } = ctx;
  if (state.scene || state.prompts.some((p) => p.type === 'scenes.step')) return;
  if (kind === 'military') {
    const svc = state.military.service;
    const war = warIn(state, svc.nation ?? 'US');
    if (war && war.phase !== 'ceasefire' && rng.chance(0.3)) startScene(ctx, 'command.battle', { severity: 3 });
    return;
  }
  if (serviceOfJob(state.career.job) !== 'police') return;
  if (rng.chance(unrestNow(state) ? 0.12 : 0.03)) return void startScene(ctx, 'command.disorder', { severity: unrestNow(state) ? 3 : 2 });
  if (rng.chance(0.025)) startScene(ctx, 'command.siege', { severity: 2 });
}

/* ------------------------------------------------------------------ */
/* The inquiry                                                         */
/* ------------------------------------------------------------------ */

const inquiryName = (state, military) => (military ? (ccOf(state) === 'GB' ? 'the Service Inquiry' : ccOf(state) === 'US' ? 'the investigation' : 'the board of inquiry') : yearNow(state) >= 1990 ? 'the independent inquiry' : 'the inquiry');

/** A command scene that went badly is noted for an inquiry next year. */
function noteInquiry(state) {
  const c = state.command;
  const done = (state.careerLife?.scenes ?? []).find((s) => s.id.startsWith('command.') && ['bad', 'mixed'].includes(s.tier) && s.age >= state.character.age - 1 && !c.reviewed.includes(`${s.age}:${s.id}`));
  if (!done || c.inquiry) return;
  c.reviewed.push(`${done.age}:${done.id}`);
  c.reviewed.splice(0, Math.max(0, c.reviewed.length - 10));
  if (done.tier === 'mixed' && sideRng(state).chance(0.6)) return;
  c.inquiry = { age: state.character.age + 1, sceneId: done.id, title: done.title, tier: done.tier };
}

/** The findings: your preparation is your defence. */
export function inquiryVerdict(state, inq, roll) {
  const r = readinessOf(state);
  const avg = KEYS.reduce((a, k) => a + r[k], 0) / KEYS.length;
  const score = avg + (inq.tier === 'mixed' ? 20 : 0) + roll;
  return score >= 60 ? 'cleared' : score >= 35 ? 'criticised' : 'removed';
}

function holdInquiry(ctx, rng) {
  const { state } = ctx;
  const inq = state.command?.inquiry;
  if (!inq || state.character.age < inq.age || state.prompts.some((p) => p.type === 'command.inquiry')) return;
  const military = Boolean(state.military?.service);
  const name = inquiryName(state, military);
  const verdict = inquiryVerdict(state, inq, rng.int(-15, 15));
  inq.verdict = verdict;
  const finding = { cleared: 'found systemic failings, but none of them yours: your preparations and decisions were reasonable', criticised: 'criticised your command decisions and recommended you not be promoted for now', removed: `found your command of ${inq.title.toLowerCase()} seriously deficient and recommended you be ${military ? 'relieved of command' : 'removed from command'}` }[verdict];
  ctx.prompt({
    type: 'command.inquiry',
    icon: '🔍',
    title: `The Findings: ${inq.title}`,
    text: `${name.charAt(0).toUpperCase()}${name.slice(1)} into ${inq.title.toLowerCase()} has reported. It ${finding}.`,
    options: [
      { id: 'accept', label: '📜 Accept the findings', hint: verdict === 'cleared' ? 'And the lessons' : 'And what follows' },
      ...(verdict !== 'cleared' ? [{ id: 'contest', label: `⚖️ Contest them (${Math.round(contestOdds(state) * 100)}%)`, hint: 'Lawyers, and a long fight in public' }] : []),
      ...(verdict !== 'cleared' ? [{ id: 'resign', label: '🚪 Resign with your pension', hint: 'Leave on your own terms' }] : []),
    ],
    data: { verdict },
  });
}
const contestOdds = (state) => clamp(0.25 + (skill(state, 'leadership') ?? 0) / 300, 0.25, 0.55);

/** The verdict's consequences. */
function applyVerdict(ctx, verdict) {
  const { state } = ctx;
  const job = state.career?.job;
  const svc = state.military?.service;
  if (verdict === 'cleared') return ctx.log('Cleared. You read the recommendations twice and put them into practice.', '📜', 'good');
  if (verdict === 'criticised') {
    if (job) { job.performance = clamp((job.performance ?? 55) - 15, 0, 100); job.commandFreeze = state.character.age + 3; }
    if (svc) { svc.eval = clamp((svc.eval ?? 60) - 20, 0, 100); svc.commandFreeze = state.character.age + 3; }
    return ctx.log('Criticised in the findings. No promotion for a while; the report follows you.', '📜', 'warn');
  }
  if (svc) {
    svc.eval = clamp((svc.eval ?? 60) - 40, 0, 100);
    svc.commandFreeze = state.character.age + 5;
    return ctx.log('You were relieved of command. A staff job, and a career that has reached its ceiling.', '📜', 'bad');
  }
  leaveJob(ctx, 'Removed from command after an inquiry', { fired: true });
}

// A criticised commander isn't promoted for a while.
PROMO_GATES.push((state, job) => ((job.commandFreeze ?? 0) > state.character.age ? `The inquiry's findings: no promotion until age ${job.commandFreeze}` : null));

export const CommandModule = {
  id: 'command',
  // After the year's scenes (30.8): a finished scene is on the record.
  order: 30.9,
  onAgeUp(ctx) {
    const { state } = ctx;
    const kind = commanderKind(state);
    const rng = sideRng(state);
    if (state.command) {
      // Readiness fades without attention.
      const r = state.command.readiness;
      for (const k of KEYS) r[k] = Math.round(r[k] - (r[k] - 30) * 0.15);
      noteInquiry(state);
      holdInquiry(ctx, rng);
    }
    // Military boards read your reports: a frozen career's reports stay middling.
    const svc = state.military?.service;
    if (svc && (svc.commandFreeze ?? 0) > state.character.age) svc.eval = Math.min(svc.eval ?? 50, 50);
    if (kind) {
      readinessOf(state);
      bigDay(ctx, kind, rng);
    }
  },
  actions: {
    /** Spend the year's preparation on one thing. arg: training | kit | plans | mutualAid */
    prepare(ctx, key) {
      const { state, rng } = ctx;
      const kind = commanderKind(state);
      if (!kind || !KEYS.includes(key) || !PREPS[key][kind]) return;
      if (yearlyCount(state, 'command.prepare')) return ctx.toast('One big preparation a year.', 'warn');
      bumpYearly(state, 'command.prepare');
      const r = readinessOf(state);
      if (key === 'kit') {
        const job = state.career?.job;
        const odds = clamp(0.4 + ((job?.boss ?? 50) - 50) / 100 + (skill(state, 'leadership') ?? 0) / 300, 0.2, 0.85);
        if (!rng.chance(odds)) return ctx.log('The budget request was turned down. Maybe next year.', '🧰', 'warn');
        r.kit = clamp(r.kit + 25, 0, 100);
        return ctx.log(`You won the money: ${kind === 'military' ? 'better armour and radios for the battalion' : 'new protective kit and equipment for your crews'}.`, '🧰', 'good');
      }
      if (key === 'training') {
        r.training = clamp(r.training + 22, 0, 100);
        ctx.stat('stress', 3);
        if (state.career?.job && kind === 'civil') ctx.spend(Math.round(4000 * eraScale(state, 'wage')), 'Major-incident exercise (overtime)', { credit: true });
        return ctx.log(kind === 'military' ? 'Three weeks in the field. The battalion came back tired and sharp.' : 'A full-scale exercise with the other services: the mistakes were made on a training day.', '🏋️', 'good');
      }
      if (key === 'plans') {
        r.plans = clamp(r.plans + 20, 0, 100);
        return ctx.log('The plans are written, tested and in every vehicle.', '🗂️', 'good');
      }
      r.mutualAid = clamp(r.mutualAid + 25, 0, 100);
      ctx.log('You signed mutual-aid agreements with the neighbouring services.', '🤝', 'good');
    },
  },
  resolvers: {
    inquiry(ctx, data, optionId) {
      const { state, rng } = ctx;
      const inq = state.command?.inquiry;
      if (!inq) return;
      state.command.inquiry = null;
      if (optionId === 'resign') {
        if (state.military?.service) return discharge(ctx, 'honorable', 'You resigned your commission rather than serve on under the findings.');
        leaveJob(ctx, 'Resigned after an inquiry');
        return ctx.log('You resigned rather than serve on under the findings.', '🚪', 'info');
      }
      if (optionId === 'contest') {
        ctx.spend(Math.round(25000 * eraScale(state, 'wage')), 'Lawyers: contesting an inquiry', { credit: true });
        ctx.stat('stress', 10);
        if (rng.chance(contestOdds(state))) {
          const better = data.verdict === 'removed' ? 'criticised' : 'cleared';
          ctx.log('Your challenge succeeded: the findings were softened on review.', '⚖️', 'good');
          return applyVerdict(ctx, better);
        }
        ctx.log('Your challenge failed, publicly.', '⚖️', 'bad');
      }
      applyVerdict(ctx, data.verdict);
    },
  },
};
