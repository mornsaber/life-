/**
 * Mental-health care with real trade-offs. Depression, anxiety and PTSD get
 * a care plan instead of an on/off switch:
 *
 *   therapy     slower, durable; cost depends on whether your therapist takes
 *               your insurance; fit matters; rural areas have waitlists
 *   medication  faster relief with side effects; benzodiazepines lose their
 *               effect and cause withdrawal; stopping cold turkey risks relapse
 *   both        works best
 *
 * Severe, untreated episodes can become a crisis, with the 988 Suicide &
 * Crisis Lifeline as the first option.
 *
 * condition.care = { therapy, meds, fit, inNetwork, medYears, waitlist, taper }
 * (condition.treated stays in sync so the rest of the health model works.)
 */
import { clamp } from '../../core/Random.js';
import { isIncarcerated } from '../../core/State.js';
import { CONDITIONS, activeConditions, getCondition } from './Conditions.js';
import { medicalBill } from './HealthEngine.js';
import { coverageId } from './Insurance.js';
import { regionOf } from '../life/Regions.js';
import { closeFriends } from '../people/Friends.js';
import { partnerOf, clampRel } from '../people/People.js';

export const MENTAL = ['depression', 'anxiety', 'ptsd'];

export const THERAPIES = {
  talk: { name: 'Talk therapy', icon: '🛋️', boost: 1, desc: 'Weekly sessions with a counselor.' },
  cbt: { name: 'Cognitive behavioral therapy (CBT)', icon: '🧠', boost: 1.3, desc: 'Structured, skills-based, well studied for depression and anxiety.' },
  trauma: { name: 'Trauma-focused therapy (EMDR / CPT)', icon: '🌀', boost: 1.6, ptsd: true, desc: 'The first-line treatment for PTSD.' },
  group: { name: 'Support group', icon: '👥', boost: 0.6, cheap: true, desc: 'Free or nearly free; peers who get it.' },
};

export const MEDS = {
  ssri: { name: 'SSRI (sertraline, escitalopram)', icon: '💊', relief: 4, cost: 400, sideEffects: 'weight gain, emotional blunting, lower libido', desc: 'First-line antidepressant. Takes weeks to work.' },
  snri: { name: 'SNRI (venlafaxine, duloxetine)', icon: '💊', relief: 4, cost: 600, sideEffects: 'nausea, blood pressure, rough withdrawal', desc: 'Also helps chronic pain.' },
  benzo: { name: 'Benzodiazepine (alprazolam)', icon: '💤', relief: 7, cost: 300, anxietyOnly: true, tolerance: true, sideEffects: 'dependence, tolerance, withdrawal', desc: 'Calms anxiety fast — and stops working over time.' },
  prazosin: { name: 'Prazosin', icon: '🌙', relief: 3, cost: 300, ptsdOnly: true, sideEffects: 'dizziness', desc: 'Quiets PTSD nightmares.' },
};

const SESSIONS = 40;
const COPAY = 40;
const CASH_RATE = 160;

export const careOf = (c) => c.care ?? null;
export const isMental = (c) => MENTAL.includes(c?.id);

/** Yearly out-of-pocket for a care plan (before insurance on in-network visits). */
export function therapyCost(state, care) {
  if (!care?.therapy || care.waitlist) return 0;
  if (THERAPIES[care.therapy].cheap) return 200;
  const plan = coverageId(state);
  if (plan === 'none') return SESSIONS * CASH_RATE;
  return care.inNetwork ? SESSIONS * COPAY : SESSIONS * CASH_RATE;
}

function sync(c) {
  const care = careOf(c);
  if (!care) return;
  c.treated = Boolean((care.therapy && !care.waitlist) || care.meds);
}

function startTherapy(ctx, c, type, { referral = false } = {}) {
  const { state, rng } = ctx;
  const rural = ['Rural', 'Small town'].includes(regionOf(state).type);
  const plan = coverageId(state);
  c.care ??= { therapy: null, meds: null, fit: 1, inNetwork: true, medYears: 0 };
  c.care.therapy = type;
  c.care.fit = rng.float(0.6, 1.25);
  // Most therapists don't take insurance; Medicaid patients wait longest.
  c.care.inNetwork = plan === 'medicaid' ? true : rng.chance(0.45);
  c.care.waitlist = !referral && !THERAPIES[type].cheap && rng.chance(rural ? 0.6 : plan === 'medicaid' ? 0.45 : 0.15);
  sync(c);
  return c.care;
}

function stopMeds(ctx, c, { taper }) {
  const care = careOf(c);
  if (!care?.meds) return;
  const med = MEDS[care.meds];
  const dependent = med.tolerance && care.medYears >= 2;
  if (taper) {
    care.taper = true;
    ctx.log(`You and your psychiatrist started tapering off ${med.name.split(' (')[0]}.`, '📉');
    return;
  }
  care.meds = null;
  care.medYears = 0;
  sync(c);
  if (dependent) {
    ctx.stat('stress', 15);
    ctx.stat('health', -3);
    ctx.log('You stopped the benzodiazepine cold turkey. The withdrawal — shaking, panic, sleeplessness — was brutal.', '⚠️', 'bad');
  }
  if (c.severity >= 40 && ctx.rng.chance(0.5)) {
    c.severity = Math.min(100, c.severity + 15);
    ctx.log(`Without a taper, your ${CONDITIONS[c.id].name.toLowerCase()} came roaring back.`, '🌧️', 'bad');
  }
}

function careTick(ctx) {
  const { state, rng } = ctx;
  for (const c of activeConditions(state).filter(isMental)) {
    // The generic treat toggle (and kids/prisoners being "simply treated") means a default plan.
    if (c.treated && !c.care) {
      c.care = { therapy: 'talk', meds: c.id === 'ptsd' ? null : 'ssri', fit: 1, inNetwork: true, medYears: 0 };
    }
    if (!c.treated && c.care && !c.care.waitlist) c.care = null;
    const care = careOf(c);
    if (!care) continue;
    if (care.waitlist) {
      care.waitlist = false;
      ctx.log(`A spot opened up with a therapist. You started ${THERAPIES[care.therapy].name.toLowerCase()}.`, THERAPIES[care.therapy].icon);
      sync(c);
      continue;
    }
    // Therapy: gradual, depends on fit and modality.
    if (care.therapy) {
      const t = THERAPIES[care.therapy];
      const boost = t.boost * (t.ptsd && c.id === 'ptsd' ? 1.2 : !t.ptsd && c.id === 'ptsd' ? 0.7 : 1) * care.fit;
      c.severity = Math.round(clamp(c.severity - rng.float(1, 4) * boost, 0, 100));
      if (care.fit < 0.8 && rng.chance(0.3)) ctx.log('Therapy isn\'t clicking. Some people try three therapists before one fits.', '🛋️', 'warn');
      const cost = therapyCost(state, care);
      if (cost) {
        if (care.inNetwork && coverageId(state) !== 'none' && !t.cheap) medicalBill(ctx, cost, `${t.name} (${SESSIONS} sessions)`, c);
        else ctx.spend(cost, `${t.name} (out of network)`, { allowDebt: true });
      }
    }
    // Medication: faster relief, side effects, tolerance.
    if (care.meds) {
      const m = MEDS[care.meds];
      care.medYears += 1;
      const relief = m.tolerance && care.medYears > 2 ? 0 : m.relief;
      c.severity = Math.round(clamp(c.severity - relief * rng.float(0.5, 1), 0, 100));
      medicalBill(ctx, m.cost, m.name.split(' (')[0], c);
      if (!m.tolerance) {
        ctx.stat('fitness', -1);
        const partner = partnerOf(state);
        if (partner && rng.chance(0.3)) partner.relationship = clampRel(partner.relationship - 3);
      } else if (care.medYears === 3) ctx.log('The benzodiazepine barely works anymore, but skipping a dose makes everything worse.', '💤', 'warn');
      if (care.taper) {
        care.meds = null;
        care.medYears = 0;
        care.taper = false;
        ctx.log(`You finished tapering off ${m.name.split(' (')[0]}.`, '📉', 'good');
      }
    }
    sync(c);
  }
}

function crisisTick(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 13 || state.prompts.some((p) => p.type === 'mental.crisis')) return;
  const c = activeConditions(state).filter((x) => ['depression', 'ptsd'].includes(x.id) && x.severity >= 70).sort((a, b) => b.severity - a.severity)[0];
  if (!c || !rng.chance(c.treated ? 0.06 : 0.2)) return;
  const friends = closeFriends(state).length || partnerOf(state);
  ctx.prompt({
    type: 'mental.crisis', icon: '🆘', title: 'A Very Dark Night',
    text: `Your ${CONDITIONS[c.id].name.toLowerCase()} is at its worst. You don't feel safe with your own thoughts tonight.\n(In real life: call or text 988, the Suicide & Crisis Lifeline, any time.)`,
    options: [
      { id: 'call988', label: '☎️ Call or text 988', hint: 'Free, 24/7; a counselor and a safety plan' },
      { id: 'er', label: '🏥 Go to the emergency room', hint: 'Safe, expensive; you might be admitted' },
      { id: 'friend', label: friends ? '📱 Call someone close' : '📱 Text an old friend' },
      { id: 'alone', label: '🌑 Try to ride it out alone' },
    ],
    data: { id: c.id },
  });
}

export const MentalHealth = {
  id: 'mental',
  order: 43,

  onAgeUp(ctx) {
    if (!ctx.state.health) return;
    careTick(ctx);
    crisisTick(ctx);
  },

  actions: {
    /** arg: "conditionId:therapyType|none" */
    therapy(ctx, arg) {
      const { state } = ctx;
      const [id, type] = String(arg).split(':');
      const c = getCondition(state, id);
      if (!isMental(c) || c.remission || !c.diagnosed) return;
      if (type === 'none') {
        if (c.care) c.care.therapy = null;
        sync(c);
        if (c.care && !c.care.meds) c.care = null;
        return ctx.log(`You stopped going to therapy for ${CONDITIONS[id].name.toLowerCase()}.`, '🛋️');
      }
      const t = THERAPIES[type];
      if (!t) return;
      if (isIncarcerated(state) && type !== 'group') return ctx.toast('Prison offers group programs only.', 'warn');
      const care = startTherapy(ctx, c, type);
      ctx.log(care.waitlist ? `Every therapist near you has a waitlist. You'll start ${t.name.toLowerCase()} next year.` : `You started ${t.name.toLowerCase()}${care.inNetwork ? '' : ' with a therapist who doesn\'t take insurance'}.`, t.icon);
    },
    /** arg: "conditionId:medType|stop|taper" */
    meds(ctx, arg) {
      const { state } = ctx;
      const [id, type] = String(arg).split(':');
      const c = getCondition(state, id);
      if (!isMental(c) || c.remission || !c.diagnosed) return;
      if (type === 'stop' || type === 'taper') return stopMeds(ctx, c, { taper: type === 'taper' });
      const m = MEDS[type];
      if (!m) return;
      if (m.anxietyOnly && id !== 'anxiety') return ctx.toast('That\'s prescribed for anxiety.', 'warn');
      if (m.ptsdOnly && id !== 'ptsd') return ctx.toast('That\'s prescribed for PTSD.', 'warn');
      c.care ??= { therapy: null, meds: null, fit: 1, inNetwork: true, medYears: 0 };
      if (c.care.meds && c.care.meds !== type) stopMeds(ctx, c, { taper: false });
      c.care.meds = type;
      c.care.medYears = 0;
      c.care.taper = false;
      sync(c);
      ctx.log(`A psychiatrist prescribed ${m.name}. Possible side effects: ${m.sideEffects}.`, m.icon);
    },
    switchTherapist(ctx, id) {
      const c = getCondition(ctx.state, id);
      if (!c?.care?.therapy) return;
      startTherapy(ctx, c, c.care.therapy);
      ctx.log('You found a new therapist.', '🛋️');
    },
  },

  resolvers: {
    crisis(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = getCondition(state, data.id);
      if (!c) return;
      if (optionId === 'call988') {
        ctx.stat('stress', -10);
        c.severity = Math.max(0, c.severity - 8);
        if (!c.care?.therapy) startTherapy(ctx, c, c.id === 'ptsd' ? 'trauma' : 'cbt', { referral: true });
        return ctx.log('A 988 counselor stayed on the line, helped you make a safety plan and connected you with care.', '☎️', 'good');
      }
      if (optionId === 'er') {
        medicalBill(ctx, 3500, 'Emergency psychiatric evaluation', c);
        c.severity = Math.max(0, c.severity - 12);
        if (rng.chance(0.5)) {
          medicalBill(ctx, 18000, 'Inpatient psychiatric stay', c);
          if (state.career.job) ctx.emit('career:adjust', { performance: -5 });
          ctx.log('You were admitted to the psychiatric unit for a week. It was hard — and it helped.', '🏥', 'warn');
        } else ctx.log('The ER kept you overnight, adjusted your plan and sent you home with follow-up appointments.', '🏥');
        if (!c.care?.therapy) startTherapy(ctx, c, 'cbt', { referral: true });
        return;
      }
      if (optionId === 'friend') {
        const friend = closeFriends(state)[0] ?? partnerOf(state);
        if (friend) {
          friend.relationship = clampRel(friend.relationship + 10);
          ctx.stat('stress', -8);
          return ctx.log(`${friend.firstName} came over and stayed until morning. The next day, you made an appointment.`, '🫶', 'good');
        }
        ctx.stat('stress', 4);
        return ctx.log('Nobody answered. You made it through the night, barely.', '📱', 'warn');
      }
      c.severity = Math.min(100, c.severity + 6);
      ctx.stat('happiness', -6);
      ctx.log('You white-knuckled it through the night alone. You don\'t have to do that next time — 988 is always there.', '🌑', 'bad');
    },
  },
};
