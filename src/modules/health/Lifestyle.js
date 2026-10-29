/**
 * Lifestyle: what you do every day, and what it does to your odds.
 *
 *   smoking    never / current / former, with pack-years. Teenagers are offered their first
 *              cigarette or vape; quitting is hard (cold turkey, nicotine replacement, or a
 *              prescription), and the risk falls slowly after you stop.
 *   drinking   none / social / heavy.
 *   diet       poor / average / good.
 *   exercise   none / some / active (a gym membership costs money).
 *   bmi        drifts with diet, exercise and age.
 *   injecting  someone who injects drugs (crime/Drugs.js) — hepatitis C and HIV.
 *
 * lifestyleRisk(state, conditionId) multiplies every condition's yearly onset chance
 * (HealthEngine), and the Health tab shows the profile so changing a habit feels worth it.
 *
 * state.health.lifestyle = { smoking, packYears, quitAge, drinking, diet, exercise, bmi, injecting }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, isIncarcerated } from '../../core/State.js';
import { priceLevel } from '../world/Countries.js';

export const LEVELS = {
  drinking: { none: '🚱 Don\'t drink', social: '🍷 Socially', heavy: '🍺 Heavily' },
  diet: { poor: '🍟 Poor', average: '🥪 Average', good: '🥗 Good' },
  exercise: { none: '🛋️ None', some: '🚶 Some', active: '🏋️ Active' },
};
const COST = { smoking: 2800, heavy: 2500, social: 600, active: 600 };

export function lifestyleOf(state) {
  const h = state.health;
  if (!h) return null;
  h.lifestyle ??= { smoking: 'never', packYears: 0, quitAge: null, drinking: state.character.age >= 18 ? 'social' : 'none', diet: 'average', exercise: 'some', bmi: 23, injecting: false };
  return h.lifestyle;
}
export const bmiLabel = (bmi) => (bmi >= 35 ? 'Severely obese' : bmi >= 30 ? 'Obese' : bmi >= 25 ? 'Overweight' : bmi >= 18.5 ? 'Healthy weight' : 'Underweight');

/** How much more (or less) likely each condition is, given how you live. */
export function lifestyleRisk(state, id) {
  const l = state.health?.lifestyle;
  if (!l) return 1;
  let m = 1;
  const yearsQuit = l.quitAge != null ? state.character.age - l.quitAge : 0;
  const smoke = l.smoking === 'current' ? 1 : l.smoking === 'former' ? Math.max(0.15, 1 - yearsQuit / 15) : 0;
  const py = Math.min(2, l.packYears / 20);
  if (smoke) m *= 1 + smoke * py * ({ copd: 25, cancer: 1.5, heartDisease: 1.2, stroke: 1, hypertension: 0.3, kidneyDisease: 0.3, asthma: 0.5 }[id] ?? 0);
  if (l.drinking === 'heavy') m *= { liverDisease: 15, alcohol: 4, hypertension: 1.4, cancer: 1.2, depression: 1.3, stroke: 1.3, dementia: 1.3 }[id] ?? 1;
  if (l.drinking === 'none') m *= { alcohol: 0.2, liverDisease: 0.5 }[id] ?? 1;
  const fat = l.bmi >= 35 ? 2 : l.bmi >= 30 ? 1 : l.bmi >= 27 ? 0.4 : 0;
  if (fat) m *= 1 + fat * ({ diabetes: 2.5, hypertension: 1.2, heartDisease: 0.6, kidneyDisease: 0.6, arthritis: 0.6, stroke: 0.4, cancer: 0.15 }[id] ?? 0);
  if (l.exercise === 'active') m *= { heartDisease: 0.7, diabetes: 0.6, depression: 0.7, dementia: 0.8, hypertension: 0.8, anxiety: 0.85, stroke: 0.8 }[id] ?? 1;
  if (l.exercise === 'none') m *= { heartDisease: 1.25, diabetes: 1.25, depression: 1.2, dementia: 1.1 }[id] ?? 1;
  if (l.diet === 'good') m *= { heartDisease: 0.85, diabetes: 0.8, hypertension: 0.85, stroke: 0.9 }[id] ?? 1;
  if (l.diet === 'poor') m *= { heartDisease: 1.2, diabetes: 1.3, hypertension: 1.2 }[id] ?? 1;
  if (l.injecting) m *= { hepatitisC: 40, hiv: 12 }[id] ?? 1;
  if (isIncarcerated(state)) m *= { hepatitisC: 5, hiv: 3 }[id] ?? 1;
  return m;
}

/** A short list of what's raising or cutting your risk, for the Health tab. */
export function riskProfile(state) {
  const l = lifestyleOf(state);
  if (!l) return [];
  const out = [];
  if (l.smoking === 'current') out.push(['bad', `🚬 Smoking (${l.packYears} pack-years): lung disease, cancer, heart disease and stroke`]);
  else if (l.smoking === 'former') out.push(['mid', `🚭 Quit at ${l.quitAge}: the extra risk is fading`]);
  if (l.drinking === 'heavy') out.push(['bad', '🍺 Heavy drinking: liver disease, alcoholism, stroke, depression']);
  if (l.bmi >= 30) out.push(['bad', `⚖️ BMI ${l.bmi.toFixed(1)} (${bmiLabel(l.bmi).toLowerCase()}): diabetes, blood pressure, heart and joints`]);
  else if (l.bmi >= 25) out.push(['mid', `⚖️ BMI ${l.bmi.toFixed(1)} (overweight)`]);
  if (l.exercise === 'active') out.push(['good', '🏋️ Regular exercise: heart, diabetes, mood and memory']);
  if (l.exercise === 'none') out.push(['mid', '🛋️ No exercise']);
  if (l.diet === 'good') out.push(['good', '🥗 Good diet']);
  if (l.diet === 'poor') out.push(['mid', '🍟 Poor diet']);
  if (l.injecting) out.push(['bad', '💉 Injecting drugs: hepatitis C, HIV, overdose']);
  return out;
}

/** Yearly: habits cost money, shift weight and fitness, and teenagers get offered a cigarette. */
export function lifestyleTick(ctx) {
  const { state, rng } = ctx;
  const l = lifestyleOf(state);
  if (!l) return;
  const age = state.character.age;
  const pl = priceLevel(state);
  if (age === 18 && l.drinking === 'none' && !l.choseNone) l.drinking = 'social';
  if (l.smoking === 'current') {
    l.packYears += 1;
    ctx.stat('fitness', -1);
    if (age >= 18 && !isIncarcerated(state)) ctx.spend(Math.round(COST.smoking * pl), 'Cigarettes', { allowDebt: true });
  }
  if (l.drinking !== 'none' && age >= 18 && !isIncarcerated(state)) ctx.spend(Math.round(COST[l.drinking] * pl), 'Drinks', { allowDebt: true });
  if (l.drinking === 'heavy') ctx.stat('health', -1);
  if (l.exercise === 'active') { ctx.stat('fitness', 2); ctx.stat('stress', -2); if (age >= 18) ctx.spend(Math.round(COST.active * pl), 'Gym membership', { allowDebt: true }); }
  if (l.exercise === 'none') ctx.stat('fitness', -1);
  // Weight: diet and exercise, and the slow middle-aged creep.
  if (age >= 16) {
    const drift = { poor: 0.45, average: 0, good: -0.25 }[l.diet] + { none: 0.3, some: 0, active: -0.4 }[l.exercise] + (age >= 25 && age < 60 ? 0.12 : age >= 70 ? -0.1 : 0) + rng.float(-0.3, 0.3);
    l.bmi = Math.round(clamp(l.bmi + drift, 17, 48) * 10) / 10;
  } else l.bmi = Math.round(clamp(l.bmi + rng.float(-0.4, 0.4), 15, 30) * 10) / 10;
  // The first cigarette.
  if (age >= 13 && age < 18 && l.smoking === 'never' && !yearlyCount(state, 'health.firstCig') && rng.chance(0.08)) {
    bumpYearly(state, 'health.firstCig');
    ctx.prompt({
      type: 'health.firstCig', icon: '🚬', title: 'Behind the Bike Sheds',
      text: 'Some older kids are passing round a vape — and a pack of cigarettes. "Go on. Everyone does."',
      options: [{ id: 'try', label: '🚬 Try it', tone: 'danger', hint: 'Nicotine is very easy to start' }, { id: 'no', label: '🙅 No thanks' }],
    });
  }
}

export const LifestyleResolvers = {
  firstCig(ctx, _data, optionId) {
    const { state, rng } = ctx;
    if (optionId !== 'try') return ctx.log('You said no. Someone called you boring. You were fine with that.', '🙅', 'info');
    if (rng.chance(0.5)) {
      lifestyleOf(state).smoking = 'current';
      return ctx.log('One became a few a day, then a pack a week. You\'re a smoker now.', '🚬', 'warn');
    }
    ctx.log('You coughed until your eyes watered and never touched one again.', '😵', 'info');
  },
};

export const LifestyleActions = {
  smoke(ctx) {
    const l = lifestyleOf(ctx.state);
    if (ctx.state.character.age < 13) return ctx.toast('Too young', 'warn');
    if (l.smoking === 'current') return;
    l.smoking = 'current';
    ctx.log(l.quitAge != null ? 'You started smoking again. Just the one, at first.' : 'You started smoking.', '🚬', 'warn');
  },
  /** arg: 'cold' | 'nrt' | 'rx' */
  quitSmoking(ctx, method = 'cold') {
    const { state, rng } = ctx;
    const l = lifestyleOf(state);
    if (l.smoking !== 'current') return ctx.toast('You don\'t smoke', 'warn');
    if (yearlyCount(state, 'health.quit')) return ctx.toast('You already tried to quit this year', 'warn');
    bumpYearly(state, 'health.quit');
    const m = { cold: { odds: 0.07, cost: 0, how: 'cold turkey' }, nrt: { odds: 0.16, cost: 300, how: 'with patches and gum' }, rx: { odds: 0.25, cost: 600, how: 'with a prescription and counselling' } }[method] ?? { odds: 0.07, cost: 0, how: 'cold turkey' };
    if (m.cost) ctx.spend(Math.round(m.cost * priceLevel(state)), 'Stop-smoking treatment', { allowDebt: true });
    const odds = clamp(m.odds + (l.attempts ?? 0) * 0.03, 0.05, 0.45);
    l.attempts = (l.attempts ?? 0) + 1;
    if (rng.chance(odds)) {
      l.smoking = 'former';
      l.quitAge = state.character.age;
      ctx.stat('happiness', 3);
      return ctx.log(`You quit smoking ${m.how}. The cravings lasted months; you didn't give in.`, '🚭', 'good');
    }
    ctx.stat('stress', 4);
    ctx.log(`You tried to quit ${m.how}. You lasted ${rng.int(3, 40)} days. Most people need several attempts.`, '🚬', 'bad');
  },
  /** arg: 'drinking:level' | 'diet:level' | 'exercise:level' */
  habit(ctx, arg) {
    const { state } = ctx;
    const [key, level] = String(arg ?? '').split(':');
    if (!LEVELS[key]?.[level]) return;
    if (key === 'drinking' && level !== 'none' && state.character.age < 16) return ctx.toast('Too young', 'warn');
    const l = lifestyleOf(state);
    if (l[key] === level) return;
    l[key] = level;
    if (key === 'drinking' && level === 'none') l.choseNone = true;
    ctx.log({ drinking: { none: 'You stopped drinking.', social: 'You drink socially.', heavy: 'You started drinking heavily.' }, diet: { poor: 'You live on takeaways and snacks.', average: 'You eat like most people do.', good: 'You started cooking properly: vegetables, less sugar.' }, exercise: { none: 'You stopped exercising.', some: 'You walk and get out at weekends.', active: 'You joined a gym and actually go.' } }[key][level], LEVELS[key][level].split(' ')[0], 'info');
  },
};
