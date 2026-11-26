/**
 * What you could do this year: a few suggestions drawn from where your life is, each pointing
 * at the tab where you'd do it. And a handful of plain tips for new players, by stage of life.
 * Pure reads: views call these.
 */
import { credentialExists } from '../world/Eras.js';
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
  if (age >= 15 && age < 30 && credentialExists(state, 'driverLicense') && !hasCred(state, 'learnerPermit') && !hasCred(state, 'driverLicense')) add('🚦', 'Get a learner\'s permit, then a driving licence', 'licenses', 'Many jobs need one');
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

/**
 * What now? Help after the year's big moments: a new partner, an engagement, a wedding, a baby on
 * the way or born, a loss, a break-up, a lost job, a diagnosis. Each comes with a few concrete next
 * steps, each a button (ui.go to a tab, or straight to the person). Drawn from the Year in Review.
 */
export function eventHelp(state) {
  const y = state.lastYear;
  const c = state.character;
  if (!y || y.age !== c.age || !c.alive || state.prompts?.length) return [];
  const yr = c.birthYear != null ? c.birthYear + c.age : 9999;
  const person = (id) => (state.people?.list ?? []).find((p) => p.id === id);
  const open = (id, text) => ({ text, action: 'ui.go', arg: `people|person=${id}` });
  const tab = (t, text) => ({ text, action: 'ui.go', arg: t });
  const out = [];
  for (const e of y.people ?? []) {
    const p = person(e.pid);
    const n = p?.firstName ?? 'them';
    if (e.kind === 'met' && p?.alive) out.push({ icon: '💞', title: `You're seeing ${n}`, why: 'New relationships grow with time together; neglect cools them.', steps: [open(p.id, `Spend time with ${n}`), tab('activities', 'Plan an outing together'), open(p.id, 'Later: move in or propose')] });
    if (e.kind === 'engaged' && p?.alive) out.push({ icon: '💍', title: `Engaged to ${n}`, why: 'Weddings cost money; a modest one is fine.', steps: [open(p.id, 'Set a date and plan the wedding'), tab('money', 'Check what you can spend')] });
    if (e.kind === 'married' && p?.alive) out.push({ icon: '💒', title: `Married to ${n}`, why: 'Marriage joins your money, your home and, often, your plans for children.', steps: [tab('home', 'Find a home together'), tab('money', 'Look at your money as a household'), open(p.id, 'Talk about children')] });
    if (e.kind === 'born' && p?.alive) out.push({ icon: '👶', title: `${n} is here`, why: yr < 1900 ? 'A new baby needs feeding, warmth and a careful eye on fevers.' : 'Babies are expensive and tiring: time, money and sleep all take a hit.', steps: [open(p.id, `Spend time with ${n}`), tab('career', yr < 1970 ? 'Think about work and home' : 'Look at leave and hours at work'), tab('money', yr < 1930 ? 'Put a little by for the child' : 'Start saving for the child')] });
    if (e.kind === 'died') out.push({ icon: '🕯️', title: `Grieving ${n}`, why: 'Grief weighs on happiness and health for a while.', steps: [tab('activities', 'Take time for yourself'), tab('people', 'Lean on family and friends'), ...(['spouse', 'parent'].includes(e.rel) ? [tab('money', 'See to the estate and money')] : [])] });
    if (e.kind === 'split') out.push({ icon: '💔', title: `After ${n}`, why: e.wasSpouse ? 'A divorce divides money and, if there are children, time with them.' : 'Break-ups hurt for a year or two.', steps: [tab('activities', 'Look after yourself'), ...(e.wasSpouse ? [tab('money', 'Check your finances after the split')] : []), tab('people', 'See friends')] });
  }
  if (y.expecting) {
    const care = yr < 1920 ? 'Arrange a midwife' : yr < 1950 ? 'See the doctor about the birth' : 'Book antenatal care';
    out.push({ icon: '🤰', title: 'A baby on the way', why: 'You have the months before the birth to get ready.', steps: [tab('health', care), tab('home', 'Make room at home'), tab('money', 'Budget for the baby')] });
  }
  if (y.job?.kind === 'warn' && !state.career?.job && c.age < 65) out.push({ icon: '📦', title: 'Out of work', why: 'Every year without pay eats into savings; your skills fade too.', steps: [tab('career', 'Look for a new job'), tab('money', yr < 1935 ? 'Stretch your savings' : 'See what help you can get'), tab('school', 'Retrain or study')] });
  for (const id of (y.newConditions ?? []).slice(0, 1)) out.push({ icon: '🩺', title: 'A new diagnosis', why: 'Treatment early usually goes better.', steps: [tab('health', 'See your treatment options'), tab('activities', 'Rest and cut stress')] });
  return out.slice(0, 3);
}
