/**
 * What you could do this year: a few suggestions drawn from where your life is, each pointing
 * at the tab where you'd do it. And a handful of plain tips for new players, by stage of life.
 * Pure reads: views call these.
 */
import { netWorth } from '../../core/State.js';
import { ASPIRATIONS, WORK_ON } from './Aspirations.js';

const hasCred = (state, id) => Boolean(state.credentials?.held?.[id]);
const partnered = (state) => (state.people?.list ?? []).some((p) => p.alive && ['partner', 'spouse', 'fiance'].includes(p.relation));
const ownsHome = (state) => (state.housing?.properties ?? []).some((p) => p.use === 'primary');
const invested = (state) => Object.keys(state.stocks?.positions ?? {}).length > 0 || (state.retirement?.dc ?? 0) > 0;

/** Up to `max` suggestions: { icon, text, tab, why }. */
export function nextSteps(state, max = 4) {
  const c = state.character;
  if (!c.alive || state.prompts?.length) return [];
  const age = c.age;
  const s = state.stats;
  const cash = state.finances?.cash ?? 0;
  const job = state.career?.job;
  const enrolled = state.education?.enrolled;
  const jailed = Boolean(state.legal?.incarceration);
  const out = [];
  const add = (icon, text, tab, why) => out.push({ icon, text, tab, why });

  if (jailed) {
    add('📚', 'Study or work inside to shorten the road back', 'legal', 'Programmes count at parole hearings');
    return out.slice(0, max);
  }
  // Urgent first.
  if (s.health < 35) add('🩺', 'See a doctor: your health is low', 'health', `Health ${s.health}`);
  if (s.stress >= 75) add('🧘', 'Cut back: you\'re burning out', 'activities', `Stress ${s.stress}`);
  if (cash < 0 || (state.finances?.loans ?? 0) > Math.max(20000, (job?.salary ?? 0))) add('💳', 'Get your debts under control', 'money', cash < 0 ? 'You\'re overdrawn' : 'Debt is outrunning your income');
  if (s.happiness < 30) add('🎈', 'Do something you enjoy', 'activities', `Happiness ${s.happiness}`);

  // By stage of life.
  if (age >= 5 && age < 18) add('📖', 'Keep your grades up', 'school', 'Good grades open university and better jobs');
  if (age >= 15 && age < 30 && !hasCred(state, 'learnerPermit') && !hasCred(state, 'driverLicense')) add('🚦', 'Get a learner\'s permit, then a driving licence', 'licenses', 'Many jobs need one');
  if (age >= 17 && age < 30 && !enrolled && !(state.education?.degrees ?? []).some((d) => ['associate', 'bachelor', 'master', 'doctorate', 'professional'].includes(d.type)) && !job) add('🎓', 'Apply to university or a trade school', 'school', 'Degrees and trades lift lifetime pay');
  if (age >= 16 && !job && !enrolled && age < 67) add('💼', 'Look for a job', 'career', 'Income, experience and a career ladder');
  if (job && (job.performance ?? 50) < 40) add('📈', 'Work harder: your performance is slipping', 'career', `Performance ${Math.round(job.performance ?? 0)}`);
  if (age >= 18 && age < 50 && !partnered(state)) add('💞', 'Meet someone', 'people', 'Dating, friends and family live on the People tab');
  if (age >= 22 && job && !invested(state) && cash > 10000) add('📊', 'Put some savings to work', 'money', 'Retirement accounts and investments compound');
  if (age >= 25 && !ownsHome(state) && cash > 40000) add('🏠', 'Look at buying a home', 'home', 'You could afford a deposit');
  if (age >= 62 && job) add('🌅', 'Think about retiring', 'career', 'Pensions and benefits start around now');
  if (age >= 40 && !(state.health?.lastCheckup >= age - 2)) add('🩻', 'Book a check-up', 'health', 'Screenings catch things early');
  if (s.fitness < 35 && age >= 12 && age < 80) add('🏃', 'Get moving', 'health', `Fitness ${s.fitness}`);
  if (netWorth(state) > 1_000_000 && !state.business?.current && age < 65) add('🏪', 'Start or buy a business', 'business', 'You have the capital');

  // Your aspirations: the one furthest from done.
  const aims = (state.aspirations?.active ?? []).filter((x) => ASPIRATIONS[x.id]).map((x) => ({ x, p: ASPIRATIONS[x.id].progress(state) })).sort((a, b) => a.p - b.p);
  if (aims.length) { const d = ASPIRATIONS[aims[0].x.id]; out.splice(Math.min(1, out.length), 0, { icon: d.icon, text: `Work toward: ${d.name}`, tab: WORK_ON[aims[0].x.id] ?? 'life', why: `${Math.round(aims[0].p * 100)}% there · ${d.desc}` }); }

  // Unique tabs, in order.
  const seen = new Set();
  return out.filter((x) => !seen.has(x.text) && seen.add(x.text)).slice(0, max);
}

/** A few plain tips for someone new, by stage of life. */
export function tipsFor(state) {
  const age = state.character.age;
  const t = [
    ['⏩', 'Press the green <b>Age</b> button (or Space) to live the next year. Decisions pop up as they happen.'],
    ['🗂️', 'The buttons along the bottom are where you act: <b>Occupation</b> for school and work, <b>Assets</b> for money and home, <b>Relationships</b> for the people in your life, <b>Activities</b> for pastimes, health, travel and the law. The row at the top keeps your goals, honours, achievements and the news of the world.'],
  ];
  if (age < 16) t.push(['🎒', 'Childhood is short: grades, friends and hobbies now shape what you can do later.']);
  else if (age < 25) t.push(['🎓', 'Your late teens decide a lot: a degree, a trade, or a first job. Each has its own path.']);
  else t.push(['💼', 'Most years pass on their own. Act when you want to change something: a new job, a home, a move abroad.']);
  t.push(['🗓️', 'After each birthday, <b>The Year in Review</b> shows what changed. Your full story is below it, newest year first.']);
  return t;
}
