/**
 * UN peacekeeping: blue helmets from any contributing country. A serving soldier volunteers
 * for a mission; a tour is a year in the mission area under UN command, in a blue beret.
 *
 *   Missions    UNIFIL (Lebanon), UNMISS (South Sudan), MONUSCO (DR Congo), MINUSCA (Central
 *               African Republic), UNFICYP (Cyprus), UNDOF (the Golan), MINURSO (Western Sahara),
 *               UNMOGIP (Kashmir). Some are quiet; some lose peacekeepers every year.
 *   A tour      The UN reimburses your government and pays a mission allowance; the tour
 *               ends with the mission's UN Medal (a numeral for each further tour). Once a
 *               tour a crisis asks what the mandate allows: protecting civilians, or holding
 *               the line you were told to hold.
 *   The fallen  The Dag Hammarskjöld Medal, awarded posthumously.
 *   A career    Three tours and a field-grade rank make you a UN staff officer; a general may
 *               be offered command of a mission as Force Commander.
 *
 * state.military.service.un = { mission, until, tours, staff, forceCommander }
 */
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { postAbroad, endPosting, postingOf } from '../world/Posting.js';
import { COUNTRIES } from '../world/Countries.js';

export const MISSIONS = {
  unifil: { name: 'UNIFIL', full: 'the UN Interim Force in Lebanon', country: 'Lebanon', place: 'Naqoura', risk: 0.006, flashpoint: 'Rockets fly over the Blue Line; a patrol is surrounded by an angry crowd.' },
  unmiss: { name: 'UNMISS', full: 'the UN Mission in South Sudan', country: 'South Sudan', place: 'Juba', risk: 0.012, flashpoint: 'Thousands of displaced people run for the gates of your Protection of Civilians site, with gunmen behind them.' },
  monusco: { name: 'MONUSCO', full: 'the UN Organization Stabilization Mission in the DR Congo', country: 'DR Congo', place: 'Goma', risk: 0.018, flashpoint: 'An armed group is massing outside a village your company is meant to protect.' },
  minusca: { name: 'MINUSCA', full: 'the UN Multidimensional Integrated Stabilization Mission in the Central African Republic', country: 'Central African Republic', place: 'Bangui', risk: 0.02, flashpoint: 'Militia fighters ambush a humanitarian convoy you are escorting.' },
  unficyp: { name: 'UNFICYP', full: 'the UN Peacekeeping Force in Cyprus', country: 'Cyprus', place: 'Nicosia', risk: 0.0005, flashpoint: 'Farmers from both sides argue over a field in the buffer zone.' },
  undof: { name: 'UNDOF', full: 'the UN Disengagement Observer Force on the Golan', country: 'Syria', place: 'Camp Faouar', risk: 0.004, flashpoint: 'Gunmen take over an observation post near yours.' },
  minurso: { name: 'MINURSO', full: 'the UN Mission for the Referendum in Western Sahara', country: 'Morocco', place: 'Laayoune', risk: 0.001, flashpoint: 'A team site reports shots fired near the berm.' },
  unmogip: { name: 'UNMOGIP', full: 'the UN Military Observer Group in India and Pakistan', country: 'Pakistan', place: 'Islamabad', risk: 0.001, flashpoint: 'A ceasefire violation on the Line of Control needs investigating.' },
};
const ALLOWANCE = 18000;

const un = (svc) => (svc.un ??= { mission: null, until: null, tours: 0 });

export function volunteerCheck(state) {
  const svc = state.military?.service;
  if (!svc || svc.component !== 'active') return { ok: false, reason: 'Serving soldiers on active duty only' };
  if (svc.cadet || svc.training) return { ok: false, reason: 'Finish training first' };
  if ((svc.yearsOfService ?? 0) < 2) return { ok: false, reason: 'Two years\' service first' };
  if (svc.un?.mission) return { ok: false, reason: 'Already on a mission' };
  if (postingOf(state)) return { ok: false, reason: 'Already deployed' };
  if (svc.wartime) return { ok: false, reason: 'Not while your country is at war' };
  if (svc.legion || svc.gurkha) return { ok: false, reason: 'Your force sends its own contingents' };
  if (yearlyCount(state, 'peacekeeping.volunteer')) return { ok: false, reason: 'Once a year' };
  return { ok: true };
}

/** Missions you can go to: not in your own country. */
export const missionsFor = (state) => Object.entries(MISSIONS).filter(([, m]) => m.country !== COUNTRIES[state.character.countryId ?? 'US']?.name);

function endTour(ctx, svc) {
  const { state, rng } = ctx;
  const u = un(svc);
  const m = MISSIONS[u.mission];
  u.tours += 1;
  const id = `un.${u.mission}`;
  const held = state.honors.find((h) => h.id === id);
  if (held) {
    held.tours = (held.tours ?? 1) + 1;
    held.name = `UN Medal (${m.name}) with numeral ${held.tours}`;
  } else addHonor(state, { id, source: 'military', name: `UN Medal (${m.name})`, icon: '🇺🇳', ribbon: ['#4b92db', '#ffffff', '#4b92db'], precedence: 30, prestige: 4, citation: `Service with ${m.full}.` });
  ctx.earn(ALLOWANCE, `UN mission allowance — ${m.name}`, { wage: true });
  ctx.log(`Your tour with ${m.name} ended. The Force Commander pinned the UN Medal on your blue beret.`, '🇺🇳', 'honor');
  svc.eval = Math.min(100, (svc.eval ?? 60) + 3);
  u.mission = null;
  u.until = null;
  if (postingOf(state)?.kind === 'mission') endPosting(ctx, 'Your UN tour ended. You flew home.');
  // A career in the blue: staff officers, and generals offered a mission's command.
  if (!u.staff && u.tours >= 3 && svc.track === 'officer' && (svc.grade ?? 0) >= 3) {
    u.staff = true;
    ctx.log('With three tours behind you, the UN Department of Peace Operations asked for you as a staff officer at a mission headquarters.', '🇺🇳', 'good');
  }
  if (!u.forceCommander && svc.track === 'officer' && (svc.grade ?? 0) >= 7 && u.tours >= 2 && rng.chance(0.25)) {
    u.forceCommander = rng.pick(Object.keys(MISSIONS));
    ctx.log(`The Secretary-General appointed you Force Commander of ${MISSIONS[u.forceCommander].full}: every blue helmet in the mission answers to you.`, '🇺🇳', 'milestone');
    addHonor(state, { id: 'un.forceCommander', source: 'military', name: `Force Commander, ${MISSIONS[u.forceCommander].name}`, icon: '🇺🇳', precedence: 12, prestige: 18, citation: 'Appointed by the UN Secretary-General.' });
  }
}

export const PeacekeepingModule = {
  id: 'peacekeeping',
  order: 31.5,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const svc = state.military?.service;
    const u = svc?.un;
    if (!u?.mission || !state.character.alive) return;
    const m = MISSIONS[u.mission];
    // The danger of the mission area.
    if (rng.chance(m.risk)) {
      addHonor(state, { id: 'un.hammarskjold', source: 'military', name: 'Dag Hammarskjöld Medal', icon: '🕊️', precedence: 5, prestige: 25, posthumous: true, citation: `Killed in the service of peace with ${m.full}.` });
      ctx.log(`You were killed in an attack on a ${m.name} patrol. The UN Security Council stood for a minute's silence; the Dag Hammarskjöld Medal was given to your family.`, '🕊️', 'bad');
      return ctx.die(`Killed serving with ${m.name}`);
    }
    if (state.character.age >= u.until) return endTour(ctx, svc);
    return undefined;
  },
  actions: {
    /** Volunteer for a UN mission (arg: mission id). */
    volunteer(ctx, missionId) {
      const { state, rng } = ctx;
      const check = volunteerCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const m = MISSIONS[missionId] ?? MISSIONS[rng.pick(Object.keys(MISSIONS))];
      const id = MISSIONS[missionId] ? missionId : Object.keys(MISSIONS).find((k) => MISSIONS[k] === m);
      bumpYearly(state, 'peacekeeping.volunteer');
      const svc = state.military.service;
      Object.assign(un(svc), { mission: id, until: state.character.age + 1 });
      postAbroad(ctx, { place: m.place, kind: 'mission', years: 1, country: m.country });
      ctx.log(`You volunteered for ${m.full}. You flew out to ${m.place} with your country's contingent, in a blue beret.`, '🇺🇳', 'milestone');
      // The tour's test: what the mandate lets you do.
      ctx.prompt({ type: 'peacekeeping.crisis', icon: '🇺🇳', title: `${m.name}: The Mandate`, text: m.flashpoint, options: [
        { id: 'protect', label: '🛡️ Protect the civilians, whatever it takes', hint: 'Robust: lives saved, and risk', tone: 'danger' },
        { id: 'mandate', label: '📋 Hold your position and report', hint: 'By the book' },
        { id: 'negotiate', label: '🤝 Talk to the commanders on the ground', hint: 'Your nerve and your words' },
      ], data: { mission: id } });
      return undefined;
    },
  },
  resolvers: {
    crisis(ctx, data, optionId) {
      const { state, rng } = ctx;
      const svc = state.military?.service;
      if (!svc) return undefined;
      const m = MISSIONS[data.mission];
      if (optionId === 'protect') {
        if (rng.chance(0.25)) { ctx.stat('health', -rng.int(10, 30)); svc.wounds = (svc.wounds ?? 0) + 1; ctx.log(`You held the gate at ${m.place} under fire. You were wounded, and hundreds of people lived.`, '🛡️', 'honor'); } else ctx.log('You pushed your section forward and the gunmen backed off. Nobody died that day.', '🛡️', 'good');
        svc.eval = Math.min(100, (svc.eval ?? 60) + 6);
        if (rng.chance(0.35)) addHonor(state, { id: `un.commendation.${data.mission}`, source: 'military', name: `Force Commander's Commendation (${m.name})`, icon: '🎖️', precedence: 25, prestige: 6, valor: true, citation: 'For protecting civilians under fire.' });
        return undefined;
      }
      if (optionId === 'negotiate') {
        const good = rng.chance(0.4 + (state.stats.smarts - 50) / 200);
        ctx.stat('stress', 6);
        return ctx.log(good ? 'An hour of tea and patience with a militia commander, and the guns stayed silent.' : 'The talks went nowhere; you pulled back as the shooting started.', '🤝', good ? 'good' : 'warn');
      }
      ctx.stat('stress', 8);
      return ctx.log(rng.chance(0.5) ? 'You held your position and reported. The UN inquiry later said the mandate allowed more.' : 'You held your position and reported. It was the right call; the situation calmed.', '📋', 'info');
    },
  },
};
