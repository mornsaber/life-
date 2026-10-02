/**
 * Interactive hiring: application screening (requirements, civil-service
 * exam rank, criminal background), a two-question scenario interview, an
 * offer (private-sector salary negotiation, or a higher starting step in the
 * public sector) and — for cleared positions — the SF-86 security
 * investigation, where honesty is a real choice.
 */
import { prestige, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { getProfession } from './JobTrees.js';
import { levelById } from './Ladder.js';
import { salaryBreakdown } from './PayGrades.js';
import { createEmployer, resolveDutyStation } from './Employers.js';
import { applicationEligibility, bestEntryLevel, backgroundCheck, levelCheck, hire } from './CareerEngine.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { examStatus, adjudicate, backgroundIssues, CLEARANCES } from '../publicservice/PublicServiceEngine.js';
import { educationFields, schoolPrestige } from '../education/Catalog.js';
import { networkBonus } from '../campus/Network.js';

export const APPLICATIONS_PER_YEAR = 3;

/** `stat` gives +1 bonus when the candidate has 60+ in that stat. */
export const QUESTIONS = [
  // Generic
  { id: 'weakness', field: 'any', text: '"What would you say is your greatest weakness?"', options: [
    { id: 'a', label: '"I work too hard." 😏', score: 0 },
    { id: 'b', label: 'A real weakness and how you\'re fixing it', score: 3, stat: 'smarts' },
    { id: 'c', label: '"Honestly? Mornings."', score: 1, stat: 'looks' },
  ] },
  { id: 'conflict', field: 'any', text: '"Tell me about a conflict with a coworker."', options: [
    { id: 'a', label: 'Explain how you de-escalated and compromised', score: 3 },
    { id: 'b', label: 'Blame the coworker entirely', score: 0 },
    { id: 'c', label: '"I don\'t really have conflicts."', score: 1 },
  ] },
  { id: 'fiveyears', field: 'any', text: '"Where do you see yourself in five years?"', options: [
    { id: 'a', label: '"Growing here into a leadership role."', score: 3 },
    { id: 'b', label: '"In your chair." 😎', score: 1, stat: 'looks' },
    { id: 'c', label: '"No idea, honestly."', score: 0 },
  ] },
  { id: 'whyus', field: 'any', text: '"Why do you want to work here?"', options: [
    { id: 'a', label: 'Cite their recent projects and mission', score: 3, stat: 'smarts' },
    { id: 'b', label: '"I need the money."', score: 1 },
    { id: 'c', label: 'Ramble about a company you confused them with', score: 0 },
  ] },
  // Service
  { id: 'angrycustomer', field: 'service', text: 'A customer is screaming about a return without a receipt. What do you do?', options: [
    { id: 'a', label: 'Stay calm, offer store credit, loop in a manager', score: 3 },
    { id: 'b', label: 'Quote the policy and refuse', score: 1 },
    { id: 'c', label: 'Yell back', score: 0 },
  ] },
  { id: 'rush', field: 'service', text: 'Saturday rush, two coworkers called out. How do you handle it?', options: [
    { id: 'a', label: 'Triage, cover stations, keep the line moving', score: 3, stat: 'fitness' },
    { id: 'b', label: 'Do your own station only', score: 1 },
    { id: 'c', label: 'Take a long break to avoid the chaos', score: 0 },
  ] },
  // Trades
  { id: 'liveWire', field: 'trades', text: 'You find a junction box still live that was marked "de-energized."', options: [
    { id: 'a', label: 'Stop work, lock-out/tag-out, report it', score: 3 },
    { id: 'b', label: 'Work it hot carefully to stay on schedule', score: 0 },
    { id: 'c', label: 'Flip the breaker yourself and keep going', score: 1 },
  ] },
  { id: 'blueprint', field: 'trades', text: 'The blueprint and site conditions don\'t match. Your move?', options: [
    { id: 'a', label: 'Raise an RFI with the engineer before proceeding', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Improvise and document later', score: 1 },
    { id: 'c', label: 'Ignore the plans', score: 0 },
  ] },
  // Tech
  { id: 'proddown', field: 'tech', text: 'Production is down at 2 AM and you\'re on call.', options: [
    { id: 'a', label: 'Roll back, restore service, then root-cause', score: 3 },
    { id: 'b', label: 'Hot-patch directly in production', score: 1 },
    { id: 'c', label: 'Silence the pager', score: 0 },
  ] },
  { id: 'whiteboard', field: 'tech', text: 'Whiteboard: reverse a linked list.', options: [
    { id: 'a', label: 'Talk through edge cases, write clean O(n) code', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Write something that mostly works', score: 1 },
    { id: 'c', label: 'Ask if you can use ChatGPT', score: 0 },
  ] },
  // Corporate / finance
  { id: 'deck', field: 'corporate', text: 'Your VP wants a strategy deck by 9 AM. It\'s 6 PM.', options: [
    { id: 'a', label: 'Scope a crisp 5-slide answer and deliver early', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Pull an all-nighter on 40 slides', score: 2 },
    { id: 'c', label: 'Ask for an extension', score: 0 },
  ] },
  { id: 'kpi', field: 'corporate', text: 'Q3 revenue dropped 12%. Walk us through it.', options: [
    { id: 'a', label: 'Decompose by segment and propose levers', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Blame macroeconomics', score: 1 },
    { id: 'c', label: '"Numbers aren\'t my thing."', score: 0 },
  ] },
  { id: 'dcf', field: 'finance', text: '"Walk me through a DCF."', options: [
    { id: 'a', label: 'Project FCF, discount at WACC, add terminal value', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Vaguely mention "multiples"', score: 1 },
    { id: 'c', label: '"Is that a crypto?"', score: 0 },
  ] },
  { id: 'hours', field: 'finance', text: '"Are you okay working 90-hour weeks?"', options: [
    { id: 'a', label: '"Absolutely — I thrive under pressure."', score: 3 },
    { id: 'b', label: '"I value work-life balance."', score: 1 },
    { id: 'c', label: 'Laugh nervously', score: 0 },
  ] },
  // Medical
  { id: 'code', field: 'medical', text: 'A patient codes during your night shift.', options: [
    { id: 'a', label: 'Call the code, start ACLS, assign roles', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Page the attending and wait', score: 1 },
    { id: 'c', label: 'Freeze', score: 0 },
  ] },
  { id: 'error', field: 'medical', text: 'You realize you made a dosing error that harmed no one.', options: [
    { id: 'a', label: 'Disclose it and file an incident report', score: 3 },
    { id: 'b', label: 'Quietly fix it', score: 1 },
    { id: 'c', label: 'Blame the nurse', score: 0 },
  ] },
  // Law
  { id: 'privilege', field: 'law', text: 'A client admits to you they lied in a deposition.', options: [
    { id: 'a', label: 'Advise them to correct the record, per ethics rules', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Pretend you didn\'t hear it', score: 0 },
    { id: 'c', label: 'Withdraw immediately without advice', score: 1 },
  ] },
  { id: 'billable', field: 'law', text: '"How do you feel about a 2,200-hour billable target?"', options: [
    { id: 'a', label: '"I\'m ready, and I\'m efficient."', score: 3 },
    { id: 'b', label: '"Is that negotiable?"', score: 1 },
    { id: 'c', label: '"What\'s billable?"', score: 0 },
  ] },
  // Education
  { id: 'classroom', field: 'education', text: 'A student disrupts every lesson. Approach?', options: [
    { id: 'a', label: 'Private talk, find the root cause, involve parents', score: 3 },
    { id: 'b', label: 'Send them to the office every time', score: 1 },
    { id: 'c', label: 'Publicly embarrass them', score: 0 },
  ] },
  { id: 'lesson', field: 'education', text: 'Half the class failed the unit test.', options: [
    { id: 'a', label: 'Reteach with a new approach and reassess', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Curve the grades and move on', score: 1 },
    { id: 'c', label: '"Their problem."', score: 0 },
  ] },
  // Public safety
  { id: 'useforce', field: 'publicSafety', text: 'Scenario: an agitated, unarmed man refuses commands in a parking lot.', options: [
    { id: 'a', label: 'Create distance, de-escalate, request backup', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Go hands-on immediately', score: 0 },
    { id: 'c', label: 'Walk away', score: 1 },
  ] },
  // Government
  { id: 'donorPermit', field: 'government', text: '"A council member asks you to fast-track a permit for a major donor. What do you do?"', options: [
    { id: 'a', label: 'Process it in normal order and document the request', score: 3 },
    { id: 'b', label: 'Quietly move it up the pile', score: 0 },
    { id: 'c', label: 'Ask your supervisor how to handle it', score: 2 },
  ] },
  { id: 'angryResident', field: 'government', text: '"Explain an unpopular new regulation to a room of angry residents."', options: [
    { id: 'a', label: 'Lay out the why, the tradeoffs and how to give feedback', score: 3, stat: 'smarts' },
    { id: 'b', label: 'Read the regulation aloud', score: 1 },
    { id: 'c', label: '"Take it up with your representative."', score: 0 },
  ] },
  { id: 'cpat', field: 'publicSafety', text: 'Physical ability test: 75-lb stair climb with a hose pack.', options: [
    { id: 'a', label: 'Steady pace, controlled breathing', score: 3, stat: 'fitness' },
    { id: 'b', label: 'Sprint the first flights', score: 1 },
    { id: 'c', label: 'Skip the warm-up', score: 0 },
  ] },
];


const QUESTION_FIELD = {
  retail: 'service', culinary: 'service', realestate: 'service', trades: 'trades', trucking: 'trades', aviation: 'trades', engineering: 'trades', publicWorks: 'trades',
  tech: 'tech', intelligence: 'tech', corporate: 'corporate', finance: 'finance', accounting: 'finance', medical: 'medical', nursing: 'medical',
  law: 'law', legalSupport: 'law', education: 'education', police: 'publicSafety', fire: 'publicSafety', ems: 'publicSafety', parkService: 'publicSafety',
  municipalAdmin: 'government', planning: 'government', regulatory: 'government', oig: 'government', foreignService: 'government',
};

function pickQuestions(rng, professionId) {
  const field = QUESTION_FIELD[professionId] ?? 'any';
  const fieldPool = rng.shuffle(QUESTIONS.filter((q) => q.field === field));
  const generic = rng.shuffle(QUESTIONS.filter((q) => q.field === 'any'));
  return [fieldPool[0] ?? generic[1], generic[0]].map((q) => q.id);
}

function questionPrompt(ctx, data) {
  const level = levelById(getProfession(data.professionId), data.levelId);
  const question = QUESTIONS.find((q) => q.id === data.questions[data.step]);
  ctx.prompt({
    type: 'career.interview',
    icon: '🤝',
    title: `Interview — ${level.title} [G${level.grade}]`,
    text: `${data.employer.name} · Question ${data.step + 1}/${data.questions.length}\n${question.text}`,
    options: ctx.rng.shuffle(question.options).map((o) => ({ id: o.id, label: o.label })),
    data,
  });
}

/** Everything about the candidate beyond the interview answers. */
export function candidateBonus(state, profession) {
  let bonus = 0;
  const veteran = state.military.history.length > 0 || state.military.service?.component === 'reserve';
  if (veteran) bonus += profession.sector === 'private' ? 0.04 : 0.08;
  if (profession.id === 'fire' && state.emergency.fire) bonus += 0.1;
  if (profession.id === 'police' && state.emergency.police) bonus += 0.1;
  if ((profession.id === 'parkService' || profession.id === 'ems') && state.emergency.sar) bonus += 0.06;
  if (['ems', 'nursing', 'fire'].includes(profession.id) && state.emergency.ambulance) bonus += 0.08;
  if (['fire', 'forester', 'parkService'].includes(profession.id) && state.emergency.wildland) bonus += 0.08;
  if (['parkService', 'gameWarden'].includes(profession.id) && state.emergency.auxiliary) bonus += 0.04;
  if (educationFields(state).has(profession.id)) bonus += 0.08;
  bonus += schoolPrestige(state) * 0.03;
  bonus += networkBonus(state, profession);
  bonus += Math.min(0.12, (profession.valued ?? []).filter((c) => hasCredential(state, c)).length * 0.04);
  bonus += Math.min(0.08, prestige(state) / 800);
  if (profession.exam) {
    const exam = examStatus(state, profession.exam);
    bonus += clamp((exam.rankedScore - 75) / 100, -0.05, 0.2);
  }
  // Teen part-time work counts as experience for a first real job.
  if (!state.career.history.length) bonus += Math.min(0.08, (state.k12?.jobYears ?? 0) * 0.02);
  bonus -= backgroundCheck(state, profession).penalty ?? 0;
  return bonus;
}

export function hireChance(state, profession, level, score, maxScore) {
  const base = 0.22 + (score / maxScore) * 0.45;
  const stats = (state.stats.smarts - 50) / 250 + (state.stats.looks - 50) / 500;
  const seniority = Math.max(0, level.grade - profession.levels[0].grade) * 0.04;
  const market = (state.economy.unemployment - 0.045) * 2; // slack labor markets are brutal
  return clamp(base + stats + candidateBonus(state, profession) - seniority - market, 0.05, 0.95);
}

function offerSalary(state, profession, level, employer, step, merit) {
  return salaryBreakdown({ grade: level.grade, step, merit, payMultiplier: profession.payMultiplier, sector: profession.sector, size: employer.size, regionId: state.character.regionId, posting: null, exec: level.abilities.includes('exec') }).total;
}

function offerPrompt(ctx, data) {
  const { state } = ctx;
  const profession = getProfession(data.professionId);
  const level = levelById(profession, data.levelId);
  const salary = offerSalary(state, profession, level, data.employer, data.step, data.merit);
  const isPublic = profession.sector !== 'private';
  ctx.prompt({
    type: 'career.negotiate',
    icon: '💰',
    title: 'Job Offer!',
    text: `${data.employer.name} offers you ${level.title} [G${level.grade}, step ${data.step}] at $${salary.toLocaleString()}/yr.` +
      (profession.dutyStation ? '\nDuty station: a remote park with government housing provided.' : '') +
      (state.career.job ? `\nAccepting means resigning as ${state.career.job.title}.` : ''),
    options: isPublic
      ? [
          { id: 'accept', label: '✅ Accept the offer' },
          { id: 'step', label: '📈 Request a higher step (superior qualifications)', hint: 'Pay is set by law — steps are negotiable' },
          { id: 'decline', label: '❌ Decline' },
        ]
      : [
          { id: 'accept', label: '✅ Accept the offer' },
          { id: 'modest', label: '💬 Counter at +8%', hint: 'Usually fine' },
          { id: 'bold', label: '🎲 Counter at +20%', hint: 'They may walk' },
          { id: 'decline', label: '❌ Decline' },
        ],
    data,
  });
}

/** Final step: cleared positions go through an SF-86 investigation first. */
function finalizeHire(ctx, data) {
  const { state } = ctx;
  const profession = getProfession(data.professionId);
  const level = levelById(profession, data.levelId);
  const needed = levelCheck(state, level).clearanceNeeded;
  if (needed) {
    const issues = backgroundIssues(state).filter((i) => !i.hidden);
    ctx.prompt({
      type: 'career.clearance',
      icon: CLEARANCES[needed].icon,
      title: `SF-86: ${CLEARANCES[needed].name} Investigation`,
      text: `Your offer is contingent on a ${CLEARANCES[needed].name} clearance${CLEARANCES[needed].polygraph ? ', including a polygraph' : ''}.\n` +
        (issues.length ? `Your background includes: ${issues.map((i) => i.label).join('; ')}.` : 'Your background is clean.'),
      options: [
        { id: 'disclose', label: '📝 Disclose everything truthfully', hint: issues.length ? 'Candor mitigates issues' : 'Nothing to hide' },
        { id: 'omit', label: '🙈 Leave the problems off the form', hint: issues.length ? 'Lying on an SF-86 is a federal crime' : 'Nothing to hide', tone: issues.length ? 'danger' : undefined },
      ],
      data: { ...data, clearance: needed },
    });
    return;
  }
  hire(ctx, { professionId: data.professionId, levelId: data.levelId, employer: data.employer, step: data.step, merit: data.merit });
}

export const InterviewSystem = {
  actions: {
    apply(ctx, professionId) {
      const { state, rng } = ctx;
      const check = applicationEligibility(state, professionId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (yearlyCount(state, 'career.apply') >= APPLICATIONS_PER_YEAR) return ctx.toast(`Max ${APPLICATIONS_PER_YEAR} applications per year.`, 'warn');
      bumpYearly(state, 'career.apply');

      const profession = getProfession(professionId);
      const employer = createEmployer(rng, state, profession, resolveDutyStation(rng, profession, state.character.regionId) ?? state.character.regionId);
      const level = bestEntryLevel(state, profession, employer.size) ?? check.level;
      const priorYears = state.career.history.filter((h) => h.professionId === professionId).reduce((s, h) => s + h.endAge - h.startAge, 0);

      questionPrompt(ctx, {
        professionId,
        levelId: level.id,
        employer,
        step: 1 + Math.min(4, Math.floor(priorYears / 2)),
        merit: 0,
        questions: pickQuestions(rng, professionId),
        step: 0,
        score: 0,
      });
    },
  },

  resolvers: {
    interview(ctx, data, optionId) {
      const { state, rng } = ctx;
      const question = QUESTIONS.find((q) => q.id === data.questions[data.step]);
      const option = question.options.find((o) => o.id === optionId);
      let score = option.score;
      if (option.stat && state.stats[option.stat] >= 60) score += 1;
      const next = { ...data, step: data.step + 1, score: data.score + Math.min(3, score) };
      if (next.step < next.questions.length) return questionPrompt(ctx, next);

      const profession = getProfession(data.professionId);
      const level = levelById(profession, data.levelId);
      if (!rng.chance(hireChance(state, profession, level, next.score, next.questions.length * 3))) {
        ctx.log(`${data.employer.name} passed on you for ${level.title}.`, '📭', 'bad');
        ctx.toast('Application rejected', 'bad');
        ctx.stat('happiness', -3);
        return;
      }
      offerPrompt(ctx, next);
    },

    negotiate(ctx, data, optionId) {
      const { rng } = ctx;
      const bonus = data.score * 0.04;
      if (optionId === 'accept') return finalizeHire(ctx, data);
      if (optionId === 'decline') {
        ctx.log(`You turned down the offer from ${data.employer.name}.`, '🙅');
        return;
      }
      if (optionId === 'step') {
        if (rng.chance(0.35 + bonus)) {
          const steps = rng.int(2, 4);
          ctx.log(`HR approved a superior-qualifications appointment: starting at step ${data.step + steps}.`, '📈', 'good');
          return finalizeHire(ctx, { ...data, step: Math.min(10, data.step + steps) });
        }
        ctx.log('HR declined the higher step. You took the standard offer.', '📄');
        return finalizeHire(ctx, data);
      }
      if (optionId === 'modest') {
        if (rng.chance(0.5 + bonus)) {
          ctx.log('They met your counter-offer.', '💬');
          return finalizeHire(ctx, { ...data, merit: 0.08 });
        }
        ctx.log('They held firm on the original number. You took it.', '💬');
        return finalizeHire(ctx, data);
      }
      if (rng.chance(0.2 + bonus)) {
        ctx.log('Bold move — they agreed to +20%!', '💬');
        return finalizeHire(ctx, { ...data, merit: 0.2 });
      }
      if (rng.chance(0.35)) {
        ctx.log(`${data.employer.name} rescinded the offer after your counter.`, '💥', 'bad');
        ctx.toast('Offer rescinded!', 'bad');
        ctx.stat('happiness', -6);
        return;
      }
      ctx.log('They split the difference at +4%.', '💬');
      return finalizeHire(ctx, { ...data, merit: 0.04 });
    },

    clearance(ctx, data, optionId) {
      const { state, rng } = ctx;
      const result = adjudicate(state, data.clearance, optionId === 'disclose', rng);
      const name = CLEARANCES[data.clearance].name;
      if (result.caught) {
        ctx.log(`${result.reason}. Your offer was rescinded and the case was referred for prosecution.`, '🕵️', 'bad');
        ctx.toast('Caught lying on your SF-86', 'bad');
        ctx.emit('legal:offense', { offenseId: 'falseStatement', context: 'SF-86 omission', caught: true });
        return;
      }
      if (!result.granted) {
        ctx.log(`Your ${name} clearance was denied (${result.reason}). The offer was withdrawn.`, '🚫', 'bad');
        ctx.toast('Clearance denied', 'bad');
        return;
      }
      ctx.emit('clearance:grant', { level: data.clearance, concealed: result.concealed });
      hire(ctx, { professionId: data.professionId, levelId: data.levelId, employer: data.employer, step: data.step, merit: data.merit });
    },
  },
};
