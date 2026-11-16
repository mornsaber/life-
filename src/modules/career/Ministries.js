/**
 * Life in a government department (the `ministry` career and each country's own civil service:
 * the Home Civil Service, the IAS, Kasumigaseki, the Bundesverwaltung…).
 *
 *   Your minister   a politician over the department, named, who comes and goes in reshuffles.
 *                   Their trust in you moves your record and your chances.
 *   Private office  a spell as private secretary to the minister: long days at their elbow, and
 *                   a faster rise afterwards.
 *   Spending review every few years the department bids for its budget: ask big, ask what's
 *                   realistic, or offer savings. The settlement colours the next years.
 *   Machinery of government  departments are merged, split and renamed when governments change.
 *   Hearings        senior officials are called before a parliamentary committee (Congress, in
 *                   the US) to answer for the department: candid, defensive, or blame the last lot.
 *   Postings        the IAS moves its officers every few years (a new district, a new city);
 *                   France's and Japan's rotate them between ministries.
 *   Revolving door  leaving a senior post, a firm the department dealt with wants you: take it,
 *                   wait out the cooling-off period first, or decline (Japan: amakudari).
 *
 * job.ministry = { minister: { name, since, trust }, budget, lastReview, privateOffice: { until } | null, postedAge }
 */
import { clamp, Random } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { showResult } from '../life/ResultCards.js';
import { regionsHere, REGIONS } from '../life/Regions.js';
import { yearNow } from '../world/Eras.js';
import { getProfession } from './JobTrees.js';
import { nextLevels } from './Ladder.js';
import { hire, levelCheck } from './CareerEngine.js';
import { createEmployer } from './Employers.js';
import { addReputation } from './Reputation.js';

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 2851 + state.character.age * 311 + 0x3b1) >>> 0);
export const isMinistry = (job) => Boolean(job && (job.professionId === 'ministry' || getProfession(job.professionId)?.template === 'ministry'));
const cc = (state) => state.character.countryId ?? 'US';

/** What the political head of a department is called. */
export function ministerTitle(state) {
  const c = cc(state);
  if (c === 'US') return 'Secretary';
  if (c === 'GB') return yearNow(state) >= 1900 ? 'Secretary of State' : 'Minister';
  if (c === 'IN') return 'Union Minister';
  if (c === 'JP' || c === 'KR' || c === 'CN') return 'Minister';
  return 'Minister';
}
/** A committee hearing, as the country holds them. */
const hearingName = (state) => ({ US: 'a congressional hearing', GB: 'a select committee', CA: 'a parliamentary committee', AU: 'Senate Estimates', IN: 'the Public Accounts Committee', IE: 'the Public Accounts Committee' }[cc(state)] ?? 'a parliamentary committee');
const reviewName = (state) => ({ GB: 'the Spending Review', US: 'the budget request to OMB', CA: 'the budget cycle', AU: 'the Budget round', FR: 'the loi de finances round', DE: 'the Haushalt negotiations', JP: 'the budget request (gaisan yōkyū)' }[cc(state)] ?? 'the budget round');
const coolingOff = (state) => ({ GB: 'ACOBA asks you to wait two years before lobbying your old department', US: 'ethics rules bar you from lobbying your old agency for two years', JP: 'an amakudari post at a public corporation, arranged by the ministry', FR: 'the ethics commission must clear the move (pantouflage)' }[cc(state)] ?? 'a cooling-off period applies');

function newMinister(state, rng) {
  const g = rng.pick(['male', 'female']);
  const n = randomName(rng, g);
  return { name: `${n.firstName} ${n.lastName}`, gender: g, since: state.character.age, trust: rng.int(40, 60) };
}
const POLICY = ['Business', 'Trade', 'Industry', 'Energy', 'Skills', 'Innovation', 'Communities', 'Local Government', 'Work', 'Pensions', 'Health', 'Social Care', 'Education', 'Culture', 'Transport', 'Science', 'Enterprise', 'Employment'];
function newDepartmentName(state, rng) {
  const [a, b] = rng.shuffle([...POLICY]).slice(0, 2);
  return cc(state) === 'GB' ? `Department for ${a} and ${b}` : cc(state) === 'US' ? `U.S. Department of ${a} and ${b}` : `Ministry of ${a} and ${b}`;
}
const trust = (job, n) => { job.ministry.minister.trust = Math.round(clamp(job.ministry.minister.trust + n, 0, 100)); };
const perf = (job, n) => { job.performance = Math.round(clamp((job.performance ?? 55) + n, 0, 100)); };

function year(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  if (!isMinistry(job)) return;
  const rng = sideRng(state);
  const m = (job.ministry ??= { minister: newMinister(state, rng), budget: 55, lastReview: state.character.age, privateOffice: null, postedAge: state.character.age });
  const grade = job.grade ?? 1;
  // The minister's trust shows in your record.
  if (grade >= 5) perf(job, Math.round((m.minister.trust - 50) / 20));
  // Reshuffles.
  if (rng.chance(0.18)) {
    m.minister = newMinister(state, rng);
    ctx.log(`Reshuffle: ${m.minister.name} is your department's new ${ministerTitle(state)}. Everything you'd agreed with the last one is open again.`, '🔄', 'info');
  }
  // Private office ends with a step up.
  if (m.privateOffice && state.character.age >= m.privateOffice.until) {
    m.privateOffice = null;
    const next = nextLevels(getProfession(job.professionId), job.employer.size, job.levelId).find((l) => !l.appointed);
    if (next) job.nextInLine = { levelId: next.id, age: state.character.age };
    addReputation(state, job.professionId, 6);
    ctx.log('Your time in the private office ended. Everyone who matters knows your name now, and you are first in line for the next post.', '🗝️', 'good');
  } else if (m.privateOffice) {
    ctx.stat('stress', 5);
    trust(job, 3);
  }
  // Machinery of government.
  if (rng.chance(0.05)) {
    const name = newDepartmentName(state, rng);
    const old = job.employer.name;
    job.employer.name = name;
    m.minister = newMinister(state, rng);
    ctx.log(`Machinery of government: ${old} was broken up, and your part of it went into the new ${name}. New letterhead, new minister, the same work.`, '🏛️', 'info');
  }
  // Postings: the IAS moves its officers; France and Japan rotate theirs between ministries.
  if (state.character.age - (m.postedAge ?? state.character.age) >= 3) {
    m.postedAge = state.character.age;
    if (cc(state) === 'IN' && grade <= 6) {
      const to = rng.pick(regionsHere(state).filter((r) => r.id !== state.character.regionId));
      if (to) {
        ctx.emit('region:relocate', { regionId: to.id, reason: 'Transferred to a new posting.' });
        job.employer.city = to.name.split(',')[0];
        return ctx.log(`Transfer orders: you've been posted to ${to.name}. The family packed again.`, '🧳', 'info');
      }
    }
    if (['FR', 'JP', 'KR', 'SG'].includes(cc(state))) {
      const ministry = rng.pick(getProfession(job.professionId)?.employers ?? [job.employer.name]);
      if (ministry && ministry !== job.employer.name) { job.employer.name = ministry; ctx.log(`Rotation: you moved to ${ministry}, as the service moves its high-flyers every few years.`, '🔁', 'info'); }
    }
  }
  // Spending review.
  if (grade >= 6 && state.character.age - m.lastReview >= 3 && !state.prompts.some((p) => p.type === 'ministries.review')) {
    m.lastReview = state.character.age;
    return ctx.prompt({ type: 'ministries.review', icon: '💷', title: 'The Budget Round', text: `It's ${reviewName(state)}. Your part of the department has to bid for the next three years' money, and the finance ministry has made clear it wants cuts.`,
      options: [
        { id: 'big', label: `📈 Bid big for new programmes (${Math.round(reviewOdds(job, 'big') * 100)}%)`, hint: 'Win, and you run something new; lose, and the minister looks weak' },
        { id: 'real', label: `📊 Bid for what you need (${Math.round(reviewOdds(job, 'real') * 100)}%)` },
        { id: 'save', label: '✂️ Offer savings up front', hint: 'The finance ministry loves you; your teams do not' },
      ], data: {} });
  }
  // Private office offer.
  if (grade >= 4 && grade <= 6 && !m.privateOffice && (job.performance ?? 55) >= 65 && rng.chance(0.07) && !state.prompts.some((p) => p.type === 'ministries.privateOffice')) {
    return ctx.prompt({ type: 'ministries.privateOffice', icon: '🗝️', title: 'Private Office', text: `${m.minister.name}'s private office needs a new private secretary: two years at the ${ministerTitle(state)}'s elbow, handling the papers, the diary and the crises.`,
      options: [
        { id: 'yes', label: '🗝️ Take it', hint: 'Exhausting, and the fastest way up' },
        { id: 'no', label: '🙅 Stay in policy work' },
      ], data: {} });
  }
  // Hearings.
  if (grade >= 8 && rng.chance(0.12) && !state.prompts.some((p) => p.type === 'ministries.hearing')) {
    ctx.prompt({ type: 'ministries.hearing', icon: '🎙️', title: 'Called to Give Evidence', text: `You've been called before ${hearingName(state)} to answer for an overspend and a programme that's running late. ${yearNow(state) >= 1960 ? 'The cameras will be on.' : 'The press gallery will be full.'}`,
      options: [
        { id: 'candid', label: `🗣️ Be candid about what went wrong (${Math.round(hearingOdds(state, job, 'candid') * 100)}%)` },
        { id: 'defend', label: `🛡️ Defend the department line by line (${Math.round(hearingOdds(state, job, 'defend') * 100)}%)` },
        { id: 'blame', label: '👉 Blame decisions taken before your time', hint: 'Safe today; ministers notice who gets blamed' },
      ], data: {} });
  }
}

export const reviewOdds = (job, kind) => clamp((kind === 'big' ? 0.3 : 0.6) + ((job.performance ?? 55) - 55) / 150 + ((job.ministry?.minister.trust ?? 50) - 50) / 150, 0.1, 0.9);
export const hearingOdds = (state, job, kind) => clamp((kind === 'candid' ? 0.45 : 0.5) + ((job.performance ?? 55) - 55) / 150 + (state.stats.smarts - 50) / 300, 0.1, 0.9);

/** Leaving a senior post: the revolving door. */
function revolvingDoor(ctx, job, reason) {
  const { state } = ctx;
  if (!isMinistry(job) || (job.grade ?? 0) < 7 || /Dismissed|fired|died|prison|Retired|new opportunity|Transfer/i.test(reason ?? '') || state.character.age >= 70) return;
  const firm = `${new Random(state.character.age * 7 + 3).pick(['Consolidated', 'Meridian', 'Atlas', 'Northern', 'Allied'])} ${['Holdings', 'Group', 'Partners', 'Advisory'][state.character.age % 4]}`;
  ctx.prompt({ type: 'ministries.door', icon: '🚪', title: 'The Revolving Door', text: `${firm}, which did a great deal of business with your old department, wants you as a senior adviser on a salary three times what you were paid. ${coolingOff(state).replace(/^./, (c) => c.toUpperCase())}.`,
    options: [
      { id: 'take', label: `💼 Join ${firm}`, hint: 'The papers may notice' },
      { id: 'wait', label: '⏳ Wait out the cooling-off period first' },
      { id: 'no', label: '🙅 Decline' },
    ], data: { firm, grade: job.grade } });
}

export const MinistriesModule = {
  id: 'ministries',
  order: 30.6,
  setup(engine) {
    engine.bus.on('career:separated', ({ ctx, job, reason }) => { if (ctx && job) revolvingDoor(ctx, job, reason); });
  },
  onAgeUp(ctx) { year(ctx); },
  resolvers: {
    review(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!isMinistry(job)) return;
      const m = job.ministry;
      if (optionId === 'save') {
        m.budget = Math.round(clamp(m.budget - 10, 0, 100)); trust(job, 4); job.coworkers = Math.round(clamp((job.coworkers ?? 55) - 6, 0, 100));
        return ctx.log('You offered savings up front. The finance ministry was delighted; your teams less so.', '✂️', 'info');
      }
      if (rng.chance(reviewOdds(job, optionId))) {
        m.budget = Math.round(clamp(m.budget + (optionId === 'big' ? 20 : 8), 0, 100)); perf(job, optionId === 'big' ? 10 : 4); trust(job, optionId === 'big' ? 10 : 4);
        if (optionId === 'big') addReputation(state, job.professionId, 5);
        return ctx.log(optionId === 'big' ? 'You won the money for a new programme, and you\'ll be the one to run it.' : 'You got what you needed. In this climate, a win.', '💷', 'good');
      }
      m.budget = Math.round(clamp(m.budget - (optionId === 'big' ? 15 : 8), 0, 100)); perf(job, optionId === 'big' ? -6 : -2); trust(job, optionId === 'big' ? -10 : -3);
      ctx.log(optionId === 'big' ? 'The bid failed, publicly. The minister was not pleased to read about it.' : 'The settlement came in under what you asked for. Something will have to give.', '💷', 'warn');
    },
    privateOffice(ctx, data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isMinistry(job) || optionId !== 'yes') return;
      job.ministry.privateOffice = { until: state.character.age + 2 };
      trust(job, 10);
      ctx.log(`You became private secretary to ${job.ministry.minister.name}.`, '🗝️', 'good');
    },
    hearing(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!isMinistry(job)) return;
      if (optionId === 'blame') { trust(job, -6); return ctx.log('You blamed decisions taken before your time. The committee let it go; the minister who took some of them did not.', '👉', 'info'); }
      if (rng.chance(hearingOdds(state, job, optionId))) {
        perf(job, 6); trust(job, optionId === 'defend' ? 6 : 2); addReputation(state, job.professionId, optionId === 'candid' ? 6 : 3);
        return ctx.log(optionId === 'candid' ? 'Your candour disarmed the committee. The report called you "refreshingly frank".' : 'You defended the department line by line, and the committee ran out of questions.', '🎙️', 'good');
      }
      perf(job, -6); trust(job, -8);
      ctx.log(optionId === 'candid' ? 'Your frankness became the headline, and the minister had to answer for it.' : `The committee took your defence apart${yearNow(state) >= 1960 ? ' on live television' : ', and every paper reported it'}.`, '🎙️', 'bad');
    },
    door(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId === 'no') return ctx.log('You declined. Public service was the point.', '🙅', 'good');
      if (optionId === 'wait') { ctx.stat('happiness', 2); return ctx.log('You waited out the cooling-off period. The offer was still there, smaller.', '⏳', 'info'); }
      if (state.career.job) return;
      const corp = getProfession('corporate');
      const level = corp.levels.find((l) => l.id === ((data.grade ?? 7) >= 9 ? 'vp' : 'director'));
      if (!level || !levelCheck(state, level).ok) return;
      const employer = createEmployer(ctx.rng, state, corp, state.character.regionId);
      employer.name = data.firm;
      employer.size = 'large';
      const job = hire(ctx, { professionId: 'corporate', levelId: level.id, employer });
      if (job) {
        job.salary = Math.round((job.salary ?? 0) * 1.6);
        ctx.log(`You joined ${data.firm} as ${level.title}. A newspaper ran a piece about the revolving door, with your photograph.`, '💼', 'info');
        showResult(ctx, { icon: '🚪', title: 'Through the revolving door', big: data.firm, sub: level.title, tone: 'info', popup: false });
      }
    },
  },
};
