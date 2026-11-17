/**
 * What a life in uniform costs, as one arc (police, fire, ambulance, prisons, the forces).
 *
 *   Wear          each year adds noise, smoke and lifting by service and era (firefighters
 *                 before breathing apparatus took the worst of the smoke). Past a point it turns
 *                 into hearing loss, a bad back, heart disease, and for firefighters, cancer.
 *   Presumption   where the law presumes a firefighter's cancer comes from the job (the US from
 *                 the 2000s, Canada, Australia from 2011), it's an occupational disease: covered,
 *                 with compensation. Veterans exposed to Agent Orange (Vietnam) or burn pits
 *                 (Iraq, Afghanistan) get the same once their laws pass (1991, 2022).
 *   Light duty    a desk post while you recover (HealthEngine's fitness board offers it); then
 *                 back to full duty, or the board again.
 *   The fallen    colleagues are killed on duty: the funeral, the trauma, what you do with it.
 *                 And sometimes it's you: a line-of-duty death, a name on the memorial, and a
 *                 survivor's pension for your family.
 *   Home          years of trauma and shift work strain a marriage.
 *
 * state.wear = { years, noise, smoke, lifting, flags: { agentOrange?, burnPits? }, fallen }
 */
import { Random, clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { eraScale } from '../economy/EraEconomy.js';
import { CONDITIONS } from '../health/Conditions.js';
import { spouseOf, living } from '../people/People.js';
import { randomName } from '../../core/State.js';
import { uniformedRole } from './Uniformed.js';
import { refreshVaRating } from '../health/HealthEngine.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 4241) ^ (state.character.age * 613 + 0x5e7)) >>> 0);
const ccOf = (state) => state.character.countryId ?? 'US';
const has = (state, id) => (state.health?.conditions ?? []).some((c) => c.id === id && !c.cured);

/** Yearly exposure by service: [noise, smoke, lifting]. */
function exposure(state, role) {
  const y = yearNow(state);
  if (role === 'fire') return [3, y < 1975 ? 10 : y < 2005 ? 6 : 3, 5];
  if (role === 'police') return [2, 0, 2];
  if (role === 'ems') return [1, 0, 6];
  if (role === 'corrections') return [1, 0, 2];
  if (role === 'military') return [6, 1, 4];
  return [0, 0, 0];
}

/** When a firefighter's cancer was presumed to be from the job. */
const FIRE_PRESUMPTION = { US: 2005, CA: 2003, AU: 2011, NZ: 2021 };
/** Veterans' exposure laws: { flag: { countries, from, until (service years), law } }. */
const EXPOSURES = {
  agentOrange: { countries: ['US', 'AU', 'NZ', 'KR'], from: 1962, until: 1976, law: 1991, name: 'Agent Orange', conditions: ['cancer', 'diabetes', 'heartDisease'] },
  burnPits: { countries: ['US', 'GB', 'AU', 'CA'], from: 2001, until: 2022, law: 2022, name: 'burn pits', conditions: ['cancer', 'copd', 'asthma'] },
};

export const wearOf = (state) => (state.wear ??= { years: 0, noise: 0, smoke: 0, lifting: 0, flags: {}, fallen: 0 });

/** One year of exposure, and what it turns into. */
function wearYear(ctx, role, rng) {
  const { state } = ctx;
  const w = wearOf(state);
  const [noise, smoke, lifting] = exposure(state, role);
  w.years += 1;
  w.noise += noise;
  w.smoke += smoke;
  w.lifting += lifting;
  // Veterans' exposures, by where and when you served.
  if (role === 'military') {
    const y = yearNow(state);
    for (const [flag, e] of Object.entries(EXPOSURES)) if (!w.flags[flag] && e.countries.includes(ccOf(state)) && y >= e.from && y < e.until && rng.chance(0.25)) w.flags[flag] = y;
  }
  const military = role === 'military';
  const onset = (id, chance, text) => {
    if (has(state, id) || !CONDITIONS[id] || !rng.chance(chance)) return false;
    ctx.emit('health:injury', { conditionId: id, severity: rng.int(25, 50), serviceConnected: military });
    ctx.log(text, CONDITIONS[id].icon ?? '🩺', 'warn');
    return true;
  };
  onset('hearingLoss', Math.max(0, w.noise - 30) / 1500, role === 'fire' ? 'Years of sirens and air horns: your hearing isn\'t what it was.' : military ? 'The ranges and the engines took their toll: tinnitus, and a hearing test you failed.' : 'Your hearing has started to go: years of sirens and the firing range.');
  onset('backInjury', Math.max(0, w.lifting - 25) / 1500, role === 'ems' ? 'Thousands of patients lifted down stairs: your back has given out.' : 'Years of kit, lifting and falls: your back is never quite right now.');
  if (role === 'fire' && state.character.age >= 40) onset('heartDisease', 0.003 + w.years * 0.0002, 'A cardiac warning at the station gym. The heart is what kills most firefighters on duty.');
  if (role === 'fire' && w.smoke >= 50) onset('cancer', 0.002 + (w.smoke - 50) / 25000, 'A cancer diagnosis. The doctor asked how many years you\'d been breathing smoke.');
}

/** A cancer (or exposure illness) that began in uniform: does the law presume it came from the job? */
function presumption(ctx) {
  const { state } = ctx;
  const w = wearOf(state);
  const y = yearNow(state);
  for (const c of state.health?.conditions ?? []) {
    if (c.cured || c.presumed) continue;
    // Firefighters' cancer.
    if (c.id === 'cancer' && w.smoke >= 40 && y >= (FIRE_PRESUMPTION[ccOf(state)] ?? 9999)) {
      c.presumed = true;
      const award = Math.round(90000 * eraScale(state, 'wage'));
      ctx.earn(award, 'Workers\' compensation: presumptive firefighter cancer', { retained: true });
      ctx.log('The presumptive cancer law covers you: your cancer is treated as an occupational disease. Compensation, and the treatment paid for.', '⚖️', 'good');
      continue;
    }
    // Veterans' exposures, once their laws pass.
    for (const [flag, e] of Object.entries(EXPOSURES)) {
      if (!w.flags[flag] || y < e.law || !e.conditions.includes(c.id)) continue;
      c.presumed = true;
      c.serviceConnected = true;
      ctx.log(`Your ${CONDITIONS[c.id]?.name.toLowerCase() ?? 'illness'} is now presumed to come from ${e.name} exposure: service-connected, with a disability rating.`, '⚖️', 'good');
      refreshVaRating(ctx, { announce: true });
    }
  }
}

/** Light duty: back to full duty if you've recovered, otherwise the board again. */
function lightDutyYear(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  const ld = job?.lightDuty;
  if (!ld) return;
  const c = (state.health?.conditions ?? []).find((x) => x.id === ld.conditionId);
  const better = !c || c.cured || c.remission || (c.severity ?? 0) < 40;
  if (better) {
    job.lightDuty = null;
    return ctx.log('The doctor signed you fit. You\'re back on full duty.', '💪', 'good');
  }
  if (state.character.age >= ld.until) {
    job.lightDuty = null;
    ctx.log('Your light-duty posting ran out and you\'re still not fit for full duty. The board will see you again.', '🗂️', 'warn');
  }
}

/** A colleague killed on duty. */
const FALLEN_ODDS = { police: 0.012, fire: 0.01, ems: 0.005, corrections: 0.004, military: 0.01 };
const HOW = {
  police: ['shot at a traffic stop', 'killed by a car at a roadside collision', 'stabbed answering a domestic call'],
  fire: ['killed when a roof collapsed', 'lost in a flashover', 'died of a heart attack at a fire'],
  ems: ['killed when the ambulance was hit at a junction', 'attacked on a call'],
  corrections: ['attacked on the wing'],
  military: ['killed in a training accident', 'killed in a vehicle rollover on exercise'],
};
function fallenYear(ctx, role, rng) {
  const { state } = ctx;
  if (yearlyCount(state, 'wear.fallen') || state.prompts.some((p) => p.type === 'serviceWear.funeral') || !rng.chance(FALLEN_ODDS[role] ?? 0)) return;
  bumpYearly(state, 'wear.fallen');
  const name = randomName(rng, rng.pick(['male', 'female']));
  const who = `${name.firstName} ${name.lastName}`;
  wearOf(state).fallen += 1;
  ctx.emit('health:trauma', { amount: 10, source: 'colleague killed' });
  ctx.prompt({
    type: 'serviceWear.funeral',
    icon: '🕯️',
    title: 'One of Your Own',
    text: `${who}, who you worked alongside, was ${rng.pick(HOW[role] ?? HOW.police)}. The funeral is on Thursday: the dress uniforms, the long procession.`,
    options: [
      { id: 'speak', label: '🎤 Speak at the funeral', hint: 'Hard to do; it helps, after' },
      { id: 'family', label: '🤝 Look after the family', hint: 'The fund-raiser, the school runs, the visits' },
      { id: 'work', label: '🦺 Go straight back to work', hint: 'Keep busy. It catches up with you' },
    ],
    data: { who },
  });
}

/** Line-of-duty death: yours. */
const DUTY_DEATH = { police: 0.0006, fire: 0.0007, ems: 0.0003, corrections: 0.0002, military: 0.0005 };
function dutyDeath(ctx, role, rng) {
  const { state } = ctx;
  const job = state.career?.job;
  if (job?.lightDuty || !rng.chance((DUTY_DEATH[role] ?? 0) * (state.police?.unit === 'swat' ? 3 : 1))) return false;
  const how = rng.pick(HOW[role] ?? HOW.police).replace(/^killed /, '').replace(/^died of /, 'of ');
  const memorial = role === 'fire' ? 'the firefighters\' memorial' : role === 'military' ? 'the armed forces memorial' : role === 'ems' ? 'the ambulance service memorial' : 'the police memorial';
  addHonor(state, { id: 'lineOfDuty', source: 'civil', name: `Named on ${memorial}`, icon: '🕯️', prestige: 10, precedence: 1, citation: 'Died in the line of duty.' });
  // A survivor's pension for a spouse, and schooling for the children.
  const spouse = spouseOf(state);
  const pay = job?.salary ?? 0;
  if (spouse && pay) {
    spouse.income = Math.round((spouse.income ?? 0) + pay * 0.75);
    spouse.survivorPension = Math.round(pay * 0.75);
  }
  const kids = living(state).filter((p) => p.relation === 'child' && (p.ageOffset ?? 0) + state.character.age < 23);
  for (const k of kids) k.educationBenefit = true;
  ctx.log(`You were killed in the line of duty: ${how}. Your name was added to ${memorial}.${spouse && pay ? ` ${spouse.firstName} receives a survivor's pension.` : ''}${kids.length ? ' Your children\'s education will be paid for.' : ''}`, '🕯️', 'death');
  ctx.die('Killed in the line of duty');
  return true;
}

/** Trauma and shifts at home. */
function homeYear(ctx, rng) {
  const { state } = ctx;
  const spouse = spouseOf(state);
  if (!spouse || (state.health?.trauma ?? 0) < 45 || yearlyCount(state, 'wear.home') || !rng.chance(0.25)) return;
  bumpYearly(state, 'wear.home');
  spouse.relationship = clamp((spouse.relationship ?? 60) - 4, 0, 100);
  ctx.prompt({
    type: 'serviceWear.home',
    icon: '🏠',
    title: 'You\'ve Changed',
    text: `${spouse.firstName} says you've changed: the nightmares, the silences, the missed birthdays on shift. "I don't know where you go."`,
    options: [
      { id: 'counsel', label: '🛋️ See a counsellor, together', hint: 'It costs, and it helps' },
      { id: 'peer', label: '🫂 Talk to someone who\'s been there', hint: 'Peer support: free, and they understand' },
      { id: 'fine', label: '🙂 "I\'m fine"', hint: 'You aren\'t, and they know it' },
    ],
    data: { personId: spouse.id },
  });
}

export const ServiceWearModule = {
  id: 'serviceWear',
  // After the health engine's year (42: it adds trauma by job).
  order: 42.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    const role = uniformedRole(state);
    const rng = sideRng(state);
    if (role) {
      wearYear(ctx, role, rng);
      lightDutyYear(ctx);
      if (dutyDeath(ctx, role, rng)) return;
      fallenYear(ctx, role, rng);
      homeYear(ctx, rng);
    }
    if (state.wear) presumption(ctx);
  },
  resolvers: {
    funeral(ctx, data, optionId) {
      if (optionId === 'speak') {
        ctx.emit('health:trauma', { amount: -6, source: 'grief shared' });
        ctx.stat('stress', 4);
        return ctx.log(`You spoke at ${data.who}'s funeral. Your voice went halfway through; nobody minded.`, '🎤', 'info');
      }
      if (optionId === 'family') {
        ctx.emit('health:trauma', { amount: -4, source: 'looking after a family' });
        ctx.stat('happiness', 3);
        return ctx.log(`You looked after ${data.who}'s family that year: the fund-raiser, the school runs, the visits.`, '🤝', 'good');
      }
      ctx.emit('health:trauma', { amount: 6, source: 'grief held in' });
      ctx.log(`You went straight back to work after ${data.who}'s funeral. It was easier not to think about it. For a while.`, '🦺', 'warn');
    },
    home(ctx, data, optionId) {
      const { state } = ctx;
      const p = spouseOf(state);
      if (!p) return;
      if (optionId === 'counsel') {
        ctx.spend(Math.round(1800 * eraScale(state, 'wage')), 'Couples counselling', { credit: true });
        p.relationship = clamp((p.relationship ?? 60) + 10, 0, 100);
        ctx.emit('health:trauma', { amount: -8, source: 'counselling' });
        return ctx.log(`You and ${p.firstName} saw a counsellor all year. Some of it came out. You're still here, together.`, '🛋️', 'good');
      }
      if (optionId === 'peer') {
        p.relationship = clamp((p.relationship ?? 60) + 5, 0, 100);
        ctx.emit('health:trauma', { amount: -6, source: 'peer support' });
        return ctx.log('You talked to someone who\'d been through it. Then, slowly, you talked at home.', '🫂', 'good');
      }
      p.relationship = clamp((p.relationship ?? 60) - 10, 0, 100);
      ctx.stat('stress', 5);
      ctx.log(`"I'm fine." ${p.firstName} went quiet. The silences got longer.`, '🙂', 'bad');
    },
  },
};
