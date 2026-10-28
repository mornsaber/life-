/**
 * Guarding a crown, and the Spanish Legion in depth.
 *
 *   Royal guards   A soldier of a monarchy's army can volunteer for the sovereign's guard: the
 *                  Household Division in Britain (Trooping the Colour, the Changing of the
 *                  Guard), the Guardia Real in Spain, the Royal Life Guards in Denmark, the
 *                  Livgardet in Sweden, His Majesty the King's Guard in Norway, the Garde
 *                  Royale in Morocco, the Royal Guard in Jordan, the King's Guard in Thailand,
 *                  and the Royal Guard Regiment in Saudi Arabia. Selection wants height,
 *                  bearing and a clean record. Where coups happen, the guard is the palace's
 *                  last line, and its loyalty is noticed.
 *   The Spanish    The Tercio: Spaniards and Ibero-American volunteers alike. Postings to
 *   Legion         Ceuta, Melilla, Almería and Ronda; Holy Week in Málaga carrying the Cristo
 *                  de la Buena Muerte; Lebanon with UNIFIL. A Spanish soldier can ask to
 *                  transfer in.
 *
 * state.military.service.royalGuard = cc · state.military.service.spanishLegion = true
 */
import { yearlyCount, bumpYearly, addHonor } from '../../core/State.js';
import { clamp } from '../../core/Random.js';

export const ROYAL_GUARDS = {
  GB: { name: 'the Household Division', unit: ['Grenadier Guards', 'Coldstream Guards', 'Scots Guards', 'Irish Guards', 'Welsh Guards', 'Household Cavalry'], ceremony: 'Trooping the Colour on Horse Guards Parade', palace: 'Buckingham Palace and Windsor Castle', icon: '💂' },
  ES: { name: 'the Guardia Real', unit: ['Guardia Real'], ceremony: 'the Fiesta Nacional parade on 12 October', palace: 'the Palacio Real and the Zarzuela', icon: '🛡️' },
  DK: { name: 'Den Kongelige Livgarde', unit: ['Royal Life Guards'], ceremony: 'the daily march from Rosenborg to Amalienborg', palace: 'Amalienborg', icon: '💂' },
  SE: { name: 'Livgardet', unit: ['Life Guards'], ceremony: 'the Changing of the Guard at the Royal Palace', palace: 'the Stockholm Palace', icon: '💂' },
  NO: { name: 'Hans Majestet Kongens Garde', unit: ['His Majesty the King\'s Guard'], ceremony: 'the Guard\'s drill display at the Edinburgh Military Tattoo', palace: 'the Royal Palace in Oslo', icon: '💂' },
  NL: { name: 'the Garderegiment Fuseliers Prinses Irene', unit: ['Garderegiment Grenadiers en Jagers', 'Garderegiment Fuseliers Prinses Irene'], ceremony: 'Prinsjesdag in The Hague', palace: 'Noordeinde Palace', icon: '🛡️' },
  BE: { name: 'the Royal Escort', unit: ['Royal Escort'], ceremony: 'the National Day parade on 21 July', palace: 'the Royal Palace of Brussels', icon: '🛡️' },
  MA: { name: 'the Garde Royale', unit: ['Garde Royale'], ceremony: 'the Throne Day ceremony of allegiance', palace: 'the royal palaces of Rabat and Fez', icon: '🛡️', coupProne: true },
  JO: { name: 'the Royal Guard', unit: ['Royal Guards Brigade'], ceremony: 'Independence Day on 25 May', palace: 'the Raghadan and Al-Husseiniya palaces', icon: '🛡️', coupProne: true },
  TH: { name: 'the King\'s Guard', unit: ['King\'s Own Bodyguard', '1st Infantry Regiment, King\'s Own Bodyguard'], ceremony: 'the Trooping of the Colours at the Royal Plaza', palace: 'the Grand Palace', icon: '🛡️', coupProne: true },
  SA: { name: 'the Royal Guard Regiment', unit: ['Royal Guard Regiment'], ceremony: 'the National Day parade', palace: 'the royal palaces of Riyadh and Jeddah', icon: '🛡️', coupProne: true },
  JP: null,
};

const nationOf = (state, svc) => svc?.nation ?? state.character.countryId ?? 'US';

/** Can you volunteer for your sovereign's guard? */
export function guardCheck(state) {
  const svc = state.military.service;
  if (!svc) return { ok: false, reason: 'Serving soldiers only' };
  const cc = nationOf(state, svc);
  const g = ROYAL_GUARDS[cc];
  if (!g) return { ok: false, reason: 'Only in a monarchy' };
  if (svc.branch !== 'army') return { ok: false, reason: 'The army' };
  if (svc.royalGuard) return { ok: false, reason: 'Already in the guard' };
  if (svc.foreignTroop && cc !== 'ES') return { ok: false, reason: 'Citizens only' };
  if ((svc.yearsOfService ?? 0) < 1) return { ok: false, reason: 'A year\'s service first' };
  if ((svc.njp ?? []).length || svc.courtsMartial?.length || svc.reprimand) return { ok: false, reason: 'A clean disciplinary record' };
  if (state.stats.fitness < 60) return { ok: false, reason: 'Fitness and bearing (60+)' };
  if (yearlyCount(state, 'royalGuards.apply')) return { ok: false, reason: 'Once a year' };
  return { ok: true, odds: clamp(0.3 + (state.stats.fitness - 60) / 120 + (state.stats.looks - 50) / 300, 0.15, 0.75), guard: g, cc };
}

/** Spanish soldiers (and foreign volunteers in Spain) can ask for the Legion. */
export function tercioCheck(state) {
  const svc = state.military.service;
  if (!svc || nationOf(state, svc) !== 'ES') return { ok: false, reason: 'Spanish Army soldiers' };
  if (svc.branch !== 'army') return { ok: false, reason: 'The army' };
  if (svc.spanishLegion) return { ok: false, reason: 'Already a legionario' };
  if (state.stats.fitness < 55) return { ok: false, reason: 'Fitness (55+)' };
  if (yearlyCount(state, 'royalGuards.tercio')) return { ok: false, reason: 'Once a year' };
  return { ok: true, odds: clamp(0.4 + (state.stats.fitness - 55) / 120, 0.2, 0.85) };
}

const TERCIOS = [['Ceuta', 'Tercio Duque de Alba, 2.º de la Legión'], ['Melilla', 'Tercio Gran Capitán, 1.º de la Legión'], ['Ronda', 'Tercio Alejandro Farnesio, 4.º de la Legión'], ['Almería', 'Tercio Don Juan de Austria, 3.º de la Legión']];

function guardYear(ctx) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  if (!svc?.royalGuard) return;
  const g = ROYAL_GUARDS[svc.royalGuard];
  if (!g) return;
  svc.guardYears = (svc.guardYears ?? 0) + 1;
  svc.evaluation = Math.min(100, (svc.evaluation ?? 60) + 1);
  if (rng.chance(0.5)) ctx.log(rng.pick([
    `You marched in ${g.ceremony}. Not a man moved in the heat.`,
    `Guard duty at ${g.palace}: two hours on, four off, and the tourists' cameras.`,
    `A state visit: you lined the route as the carriages went by.`,
    `The sovereign stopped to speak to your company after a parade.`,
  ]), g.icon, 'good');
  // Years of close service to the sovereign are noticed.
  if (svc.guardYears === 6 && ['GB'].includes(svc.royalGuard)) {
    addHonor(state, { id: 'guards.rvm', source: 'military', name: 'Royal Victorian Medal (Silver)', post: 'RVM', icon: '🎖️', prestige: 4, precedence: 40, citation: 'For personal service to the Sovereign in the Household Division.', country: 'GB', ribbon: [['#1f3f8f', 1], ['#c8102e', 1], ['#ffffff', 1], ['#c8102e', 1], ['#1f3f8f', 1]] });
    ctx.log('The King gave you the Royal Victorian Medal for personal service.', '🎖️', 'honor');
  } else if (svc.guardYears === 6) {
    ctx.log(`After six years in ${g.name}, the palace sent a signed photograph and a letter of thanks.`, '✉️', 'honor');
  }
  // Where coups happen, the palace's guard is watched — and trusted.
  if (g.coupProne && state.world?.juntas?.[svc.royalGuard]) {
    ctx.log(`The generals took power. ${g.name[0].toUpperCase()}${g.name.slice(1)} held the palace gates, and nobody asked you to open them.`, '🛡️', 'warn');
  }
}

function tercioYear(ctx) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  if (!svc?.spanishLegion) return;
  svc.tercio ??= rng.pick(TERCIOS);
  const [place, name] = svc.tercio;
  const r = rng.next();
  if (r < 0.25) {
    ctx.log('Holy Week in Málaga: shirt open at the neck, sleeves rolled, you carried the Cristo de la Buena Muerte through the streets and sang "El Novio de la Muerte" with ten thousand people watching.', '✝️', 'good');
    ctx.stat('happiness', 4);
  } else if (r < 0.4) {
    ctx.log(`Six months in Lebanon with UNIFIL: patrols along the Blue Line from Marjayoun.`, '🇺🇳', 'info');
    svc.deployments = (svc.deployments ?? 0) + 1;
  } else if (r < 0.6) {
    ctx.log(`Another year with the ${name} in ${place}: the goat mascot, the quick march at 160 paces a minute, the Legion's creed.`, '🇪🇸', 'info');
  }
}

export const RoyalGuardsModule = {
  id: 'royalGuards',
  order: 20.7,
  onAgeUp(ctx) {
    guardYear(ctx);
    tercioYear(ctx);
  },
  actions: {
    /** Volunteer for the sovereign's guard. */
    apply(ctx) {
      const { state, rng } = ctx;
      const check = guardCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'royalGuards.apply');
      if (!rng.chance(check.odds)) return ctx.log(`You weren't selected for ${check.guard.name} this year.`, check.guard.icon, 'bad');
      const svc = state.military.service;
      svc.royalGuard = check.cc;
      svc.guardUnit = rng.pick(check.guard.unit);
      return ctx.log(`You were selected for ${check.guard.name}: the ${svc.guardUnit}. ${check.guard.palace[0].toUpperCase()}${check.guard.palace.slice(1)} are yours to guard.`, check.guard.icon, 'milestone');
    },
    /** Leave the guard for ordinary soldiering. */
    leaveGuard(ctx) {
      const svc = ctx.state.military.service;
      if (!svc?.royalGuard) return ctx.toast('Not in the guard', 'warn');
      svc.royalGuard = null;
      return ctx.log('You went back to ordinary soldiering.', '🪖', 'info');
    },
    /** A Spanish soldier asks for the Legion. */
    tercio(ctx) {
      const { state, rng } = ctx;
      const check = tercioCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'royalGuards.tercio');
      if (!rng.chance(check.odds)) return ctx.log('Your transfer to the Legion wasn\'t approved this year.', '🇪🇸', 'bad');
      const svc = state.military.service;
      svc.spanishLegion = true;
      svc.tercio = rng.pick(TERCIOS);
      return ctx.log(`You transferred to the Spanish Legion: the ${svc.tercio[1]} in ${svc.tercio[0]}. "Novios de la muerte."`, '🇪🇸', 'milestone');
    },
  },
};

/** What the service view offers. */
export function royalGuardOptions(state) {
  const svc = state.military.service;
  if (!svc) return [];
  const out = [];
  const cc = nationOf(state, svc);
  if (ROYAL_GUARDS[cc] && svc.branch === 'army') out.push({ id: 'guard', guard: ROYAL_GUARDS[cc], check: svc.royalGuard ? { ok: false, reason: 'Serving' } : guardCheck(state), serving: Boolean(svc.royalGuard) });
  if (cc === 'ES' && svc.branch === 'army') out.push({ id: 'tercio', check: svc.spanishLegion ? { ok: false, reason: 'Serving' } : tercioCheck(state), serving: Boolean(svc.spanishLegion), tercio: svc.tercio });
  return out;
}
