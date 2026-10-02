/**
 * Interactive hiring: a two-question, scenario-based interview followed by a
 * salary negotiation. Each answer scores 0–3; the total, the candidate's
 * stats and their service record (veterans, volunteer responders, medals)
 * drive the hiring roll.
 */
import { prestige, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp, round } from '../../core/Random.js';
import { getProfession } from './JobTrees.js';
import { applicationEligibility, companyFor, hire } from './CareerEngine.js';

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
  { id: 'cpat', field: 'publicSafety', text: 'Physical ability test: 75-lb stair climb with a hose pack.', options: [
    { id: 'a', label: 'Steady pace, controlled breathing', score: 3, stat: 'fitness' },
    { id: 'b', label: 'Sprint the first flights', score: 1 },
    { id: 'c', label: 'Skip the warm-up', score: 0 },
  ] },
];

function pickQuestions(rng, field) {
  const fieldPool = rng.shuffle(QUESTIONS.filter((q) => q.field === field));
  const generic = rng.shuffle(QUESTIONS.filter((q) => q.field === 'any'));
  return [fieldPool[0] ?? generic[1], generic[0]].map((q) => q.id);
}

function questionPrompt(ctx, data) {
  const profession = getProfession(data.professionId);
  const question = QUESTIONS.find((q) => q.id === data.questions[data.step]);
  ctx.prompt({
    type: 'career.interview',
    icon: '🤝',
    title: `Interview — ${profession.tiers[data.tier].title}`,
    text: `${data.company} · Question ${data.step + 1}/${data.questions.length}\n${question.text}`,
    options: ctx.rng.shuffle(question.options).map((o) => ({ id: o.id, label: o.label })),
    data,
  });
}

/** Bonuses for veterans, volunteer responders and decorated candidates. */
export function serviceRecordBonus(state, profession) {
  let bonus = 0;
  const veteran = state.military.history.length > 0 || state.military.service?.component === 'reserve';
  if (veteran) bonus += profession.field === 'publicSafety' ? 0.1 : 0.05;
  if (profession.id === 'fire' && state.emergency.fire) bonus += 0.12;
  if (profession.id === 'police' && state.emergency.police) bonus += 0.12;
  if (profession.field === 'publicSafety' && state.emergency.sar) bonus += 0.05;
  bonus += Math.min(0.1, prestige(state) / 600);
  return bonus;
}

export function hireChance(state, profession, tier, score, maxScore) {
  const base = 0.2 + (score / maxScore) * 0.5;
  const stats = (state.stats.smarts - 50) / 250 + (state.stats.looks - 50) / 400;
  return clamp(base + stats + serviceRecordBonus(state, profession) - tier * 0.06, 0.05, 0.95);
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
      // Returning to a field you've climbed before: re-enter one tier below your peak.
      const prior = state.career.history.filter((h) => h.professionId === professionId);
      const tier = prior.length ? Math.max(0, Math.max(...prior.map((h) => h.peakTier)) - 1) : 0;

      questionPrompt(ctx, {
        professionId,
        tier,
        company: companyFor(rng, profession),
        questions: pickQuestions(rng, profession.field),
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
      const tier = profession.tiers[data.tier];
      const chance = hireChance(state, profession, data.tier, next.score, next.questions.length * 3);
      if (!rng.chance(chance)) {
        ctx.log(`${data.company} passed on you for ${tier.title}.`, '📭', 'bad');
        ctx.toast('Application rejected', 'bad');
        ctx.stat('happiness', -3);
        return;
      }

      const offer = round(tier.salary * rng.float(0.94, 1.04), 500);
      ctx.prompt({
        type: 'career.negotiate',
        icon: '💰',
        title: 'Job Offer!',
        text: `${data.company} offers you the ${tier.title} role at $${offer.toLocaleString()}/yr.` +
          (state.career.job ? `\nAccepting means resigning as ${state.career.job.title}.` : ''),
        options: [
          { id: 'accept', label: '✅ Accept the offer' },
          { id: 'modest', label: '💬 Counter at +8%', hint: 'Usually fine' },
          { id: 'bold', label: '🎲 Counter at +20%', hint: 'They may walk' },
          { id: 'decline', label: '❌ Decline' },
        ],
        data: { ...next, offer },
      });
    },

    negotiate(ctx, data, optionId) {
      const { rng } = ctx;
      const scoreBonus = data.score * 0.04;
      const accept = (salary, note) => {
        if (note) ctx.log(note, '💬');
        hire(ctx, { professionId: data.professionId, tier: data.tier, salary, company: data.company });
      };

      if (optionId === 'accept') return accept(data.offer);
      if (optionId === 'decline') {
        ctx.log(`You turned down the offer from ${data.company}.`, '🙅');
        return;
      }
      if (optionId === 'modest') {
        if (rng.chance(0.5 + scoreBonus)) return accept(round(data.offer * 1.08, 500), 'They met your counter-offer.');
        return accept(data.offer, 'They held firm on the original number. You took it.');
      }
      // bold
      if (rng.chance(0.2 + scoreBonus)) return accept(round(data.offer * 1.2, 500), 'Bold move — they agreed to +20%!');
      if (rng.chance(0.35)) {
        ctx.log(`${data.company} rescinded the offer after your counter.`, '💥', 'bad');
        ctx.toast('Offer rescinded!', 'bad');
        ctx.stat('happiness', -6);
        return;
      }
      return accept(round(data.offer * 1.04, 500), 'They split the difference at +4%.');
    },
  },
};
