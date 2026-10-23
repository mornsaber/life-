/**
 * War, and what comes after service.
 *
 *   In a war       Time in grade halves and boards promote faster; casualties leave gaps that
 *                  are filled by acting rank (paid at the higher grade, confirmed if you hold it
 *                  well); heroism in a fight can bring a battlefield promotion.
 *   At the peace   Acting ranks revert. Those who joined for the war are demobilized — or stay
 *                  in a shrinking peacetime force, often back at their permanent rank. Wartime
 *                  promotions are the first to go in the drawdown.
 *   Five stars     General of the Army, Fleet Admiral, Field Marshal: only a four-star leading a
 *                  major war, and only for a long one. Five-star officers never retire.
 *   Brevet         An exceptional soldier can retire a grade above the one they held (an
 *                  honorary "tombstone" promotion: the title, not the pay).
 *   The reserve    Leaving the regulars doesn't end the obligation: the US Military Service
 *                  Obligation runs eight years from enlistment (the Individual Ready Reserve);
 *                  in Germany, Israel, Korea, Singapore, Switzerland, Finland, Russia and others
 *                  soldiers and officers pass to the reserve until an age limit, and in a war
 *                  they are called back.
 *
 * svc.wartime, svc.warPromotions, svc.acting = { substantive, since }, svc.warEnlisted, svc.fiveStar
 * state.military.liability = { nation, branch, track, specialty, rankTitle, untilAge, name } | null
 */
import { clamp } from '../../core/Random.js';
import { rankOf, rankTitles, branchOf, enlist, discharge } from './MilitaryEngine.js';
import { warIn } from '../world/War.js';
import { addHonor } from '../../core/State.js';

/** Five-star titles by theatre; some forces have their own marshals. */
const FIVE_STAR = {
  ground: 'Field Marshal', naval: 'Admiral of the Fleet', air: 'Marshal of the Air Force',
  US: { army: 'General of the Army', navy: 'Fleet Admiral', airforce: 'General of the Air Force', marines: 'General of the Army', spaceforce: 'General of the Space Force', coastguard: 'Fleet Admiral' },
  FR: { army: 'Maréchal de France', navy: 'Amiral de France', airforce: 'Maréchal de France' },
  RU: { army: 'Marshal of the Russian Federation', navy: 'Admiral of the Fleet', airforce: 'Marshal of the Russian Federation' },
  IN: { army: 'Field Marshal', navy: 'Admiral of the Fleet', airforce: 'Marshal of the Indian Air Force' },
};
export function fiveStarTitle(svc) {
  const nation = FIVE_STAR[svc.nation ?? 'US'];
  return nation?.[svc.branch] ?? FIVE_STAR[branchOf(svc)?.theater ?? 'ground'] ?? 'Field Marshal';
}

/**
 * Reserve liability after leaving the regulars. `years` from enlistment (US MSO) or leaving;
 * `age` until a set age (by track); `retirees`: whether retirement also passes you to the reserve.
 */
export const LIABILITY = {
  US: { years: 8, from: 'joined', name: 'Individual Ready Reserve' },
  GB: { years: 6, from: 'left', name: 'Regular Reserve' },
  CA: { years: 5, from: 'left', name: 'Supplementary Reserve' },
  AU: { years: 5, from: 'left', name: 'Standby Reserve' },
  FR: { years: 5, from: 'left', name: 'réserve de disponibilité' },
  IT: { years: 5, from: 'left', name: 'riserva' },
  DE: { age: { enlisted: 45, officer: 65 }, retirees: true, name: 'Reserve (Reservistendienst)' },
  IL: { age: { enlisted: 40, officer: 45 }, retirees: true, name: 'reserves (miluim)' },
  KR: { years: 8, from: 'left', retirees: true, name: 'Reserve Forces (예비군)' },
  SG: { age: { enlisted: 40, officer: 50 }, retirees: true, name: 'Operationally Ready National Servicemen (NSmen)' },
  CH: { age: { enlisted: 36, officer: 50 }, retirees: true, name: 'militia reserve' },
  FI: { age: { enlisted: 50, officer: 60 }, retirees: true, name: 'reserve' },
  SE: { age: { enlisted: 47, officer: 60 }, retirees: true, name: 'reserve (krigsplacering)' },
  NO: { age: { enlisted: 44, officer: 55 }, retirees: true, name: 'reserve' },
  RU: { age: { enlisted: 50, officer: 60 }, retirees: true, name: 'reserve (zapas)' },
  UA: { age: { enlisted: 60, officer: 60 }, retirees: true, name: 'reserve' },
  TW: { years: 8, from: 'left', retirees: true, name: 'reserve' },
  GR: { age: { enlisted: 45, officer: 60 }, retirees: true, name: 'reserve' },
  TR: { age: { enlisted: 41, officer: 60 }, retirees: true, name: 'reserve (yedek)' },
  CN: { age: { enlisted: 35, officer: 55 }, retirees: true, name: 'reserve' },
  VN: { age: { enlisted: 45, officer: 60 }, retirees: true, name: 'reserve' },
  KP: { age: { enlisted: 60, officer: 60 }, retirees: true, name: 'Worker-Peasant Red Guards' },
  IR: { age: { enlisted: 50, officer: 60 }, retirees: true, name: 'reserve' },
  EG: { years: 9, from: 'left', retirees: true, name: 'reserve' },
  PL: { age: { enlisted: 55, officer: 63 }, retirees: true, name: 'passive reserve' },
};

/* ------------------------------------------------------------------ */
/* In a war                                                            */
/* ------------------------------------------------------------------ */

const warFor = (state, svc) => {
  const w = warIn(state, svc?.nation ?? 'US');
  return w && w.phase !== 'ceasefire' ? w : null;
};
const ACTING_TOP = { enlisted: 6, officer: 4, warrant: 3 };
const FIELD_TOP = { enlisted: 5, officer: 3, warrant: 2 };

/** A field promotion for heroism (called from a won fight). */
export function battlefieldPromotion(ctx, svc, valor) {
  const { state, rng } = ctx;
  if (!svc || !warFor(state, svc) || svc.conscript) return false;
  if (svc.grade >= (FIELD_TOP[svc.track] ?? 0) || svc.grade >= rankTitles(svc).length - 1) return false;
  if (!rng.chance(clamp(0.05 + Math.max(0, valor - 60) / 120, 0, 0.35))) return false;
  if (svc.acting) delete svc.acting;
  svc.grade += 1;
  svc.yearsInGrade = 0;
  svc.warPromotions = (svc.warPromotions ?? 0) + 1;
  const rank = rankOf(svc);
  ctx.log(`Your commander promoted you on the spot: ${rank.title}, a battlefield promotion. The new rank was pinned on in the field.`, '⭐', 'good');
  ctx.toast(`Battlefield promotion: ${rank.title}`, 'good');
  ctx.stat('happiness', 8);
  return true;
}

function actingYear(ctx, svc) {
  const { state, rng } = ctx;
  const age = state.character.age;
  if (svc.acting) {
    // Held well for two years: confirmed in the rank.
    if (age - svc.acting.since >= 2 && svc.eval >= 70 && rng.chance(0.5)) {
      delete svc.acting;
      svc.warPromotions = (svc.warPromotions ?? 0) + 1;
      ctx.log(`You were confirmed in the rank of ${rankOf(svc).title}.`, '⬆️', 'good');
    }
    return;
  }
  if (svc.grade >= (ACTING_TOP[svc.track] ?? 0) || svc.eval < 60 || svc.conscript || !rng.chance(0.14)) return;
  svc.acting = { substantive: svc.grade, since: age };
  svc.grade += 1;
  ctx.log(`Casualties left a gap in the chain of command. You were made acting ${rankTitles(svc)[svc.grade]}: the job, the pay, and none of the security.`, '⬆️', 'military');
}

function fiveStarYear(ctx, svc, war) {
  const { state, rng } = ctx;
  if (svc.fiveStar || svc.track !== 'officer' || svc.grade < rankTitles(svc).length - 1) return;
  if (war.intensity < 3 || war.years < 2 || war.fiveStar) return;
  if (!(svc.topPost || svc.post?.kind === 'command')) return;
  if (!rng.chance(0.2 + Math.max(0, war.front) / 400)) return;
  svc.fiveStar = true;
  war.fiveStar = true;
  addHonor(state, { id: 'mil.fiveStar', source: 'military', name: `Promoted ${fiveStarTitle(svc)}`, icon: '⭐', prestige: 40, precedence: 2, citation: `For the direction of ${war.operation}.` });
  ctx.log(`For leading ${war.operation}, the head of state promoted you to ${fiveStarTitle(svc)}: five stars, a rank created for the greatest wars. You will never retire: a five-star officer stays on the active list for life.`, '⭐', 'milestone');
  ctx.stat('happiness', 15);
}

/** The peace: acting ranks revert, wartime soldiers go home, and the drawdown cuts back the war's promotions. */
function peace(ctx, svc) {
  const { state, rng } = ctx;
  if (svc.acting) {
    svc.grade = svc.acting.substantive;
    delete svc.acting;
    ctx.log(`With the war over, your acting rank lapsed: you're a ${rankOf(svc).title} again.`, '⬇️', 'warn');
  }
  const promoted = svc.warPromotions ?? 0;
  svc.warPromotions = 0;
  if (svc.warEnlisted && svc.component === 'active' && !svc.fiveStar) {
    ctx.prompt({
      type: 'wartime.demob', icon: '🕊️', title: 'Demobilization',
      text: `The war is over and the forces are shrinking fast. You joined for the duration.${promoted ? ` You rose ${promoted} grade${promoted > 1 ? 's' : ''} in the war — the peacetime ${branchOf(svc).name} won't keep many wartime ranks.` : ''}`,
      options: [
        { id: 'demob', label: '🏠 Take your discharge', hint: 'Home, honorably, at your wartime rank' },
        { id: 'stay', label: '🎖️ Stay in the regulars', hint: promoted ? 'Likely back to your permanent rank' : 'A peacetime career' },
      ],
      data: { promoted },
    });
    return;
  }
  // Regulars promoted fast in the war: the drawdown hands some of it back.
  if (promoted && !svc.fiveStar && rng.chance(0.35)) {
    svc.grade = Math.max(0, svc.grade - 1);
    svc.yearsInGrade = 0;
    ctx.log(`The post-war reduction in force returned you to your permanent grade: ${rankOf(svc).title}.`, '⬇️', 'bad');
    ctx.stat('happiness', -6);
  }
}

/* ------------------------------------------------------------------ */
/* The reserve after service                                           */
/* ------------------------------------------------------------------ */

function startLiability(ctx, svc, type) {
  const { state } = ctx;
  const nation = svc.nation ?? 'US';
  const rule = LIABILITY[nation];
  if (!rule || !['honorable', 'general', 'retired'].includes(type)) return;
  if (type === 'retired' && !rule.retirees) return;
  const age = state.character.age;
  const track = svc.track === 'enlisted' ? 'enlisted' : 'officer';
  const untilAge = rule.age ? rule.age[track] : rule.from === 'joined' ? svc.joinedAge - (svc.priorYears ?? 0) + rule.years : age + rule.years;
  if (untilAge <= age) return;
  const rank = rankOf(svc);
  state.military.liability = { nation, branch: svc.branch, track: svc.track, specialty: svc.specialty, rankTitle: rank.title, untilAge, name: rule.name };
  ctx.log(`${type === 'retired' ? 'Retired from the regulars, you' : 'You'} passed to the ${rule.name} as a ${rank.title}: no drills${rule.age ? ', but liable to be called up' : ', but you can be recalled'} until ${untilAge}.`, '📋', 'military');
}

function liabilityYear(ctx) {
  const { state, rng } = ctx;
  const l = state.military.liability;
  if (!l || state.military.service) return;
  const age = state.character.age;
  if (age >= l.untilAge) {
    state.military.liability = null;
    return ctx.log(`Your reserve liability ended: you were discharged from the ${l.name} — finally a civilian, for good.`, '📋', 'info');
  }
  const war = warIn(state, l.nation);
  const home = (state.character.countryId ?? 'US') === l.nation;
  if (war && war.phase !== 'ceasefire' && home && !state.prompts.some((p) => p.type === 'wartime.recall') && rng.chance(clamp(0.1 * war.intensity + (war.mobilized ? 0.3 : 0), 0, 0.9))) {
    ctx.prompt({
      type: 'wartime.recall', icon: '📨', title: 'Recalled to the Colours',
      text: `${war.operation} needs every trained hand. Your recall orders arrived: report as a ${l.rankTitle} within thirty days.`,
      options: [
        { id: 'report', label: '🪖 Report for duty' },
        { id: 'exempt', label: '📄 Apply for a hardship exemption', hint: 'Dependants, a vital job, health' },
        { id: 'ignore', label: '🙈 Ignore the orders', tone: 'danger', hint: 'A crime in wartime' },
      ],
      data: { war: war.operation },
    });
  } else if (!war && home && l.name !== 'Individual Ready Reserve' && rng.chance(0.25)) {
    ctx.log(rng.pick([`Two weeks of ${l.name} training: old kit, new faces, the same ranges.`, `Your ${l.name} muster: an eye test, a fitness check and a talk about mobilization plans.`, 'A reserve refresher exercise took a week of your leave.']), '🪖');
    ctx.stat('stress', 2);
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const WartimeModule = {
  id: 'wartime',
  // After the military's year (promotions, deployments).
  order: 20.5,
  setup(engine) {
    engine.bus.on('military:discharged', ({ ctx, type, svc }) => {
      if (type === 'kia') return;
      brevet(ctx, svc, type);
      startLiability(ctx, svc, type);
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const svc = state.military.service;
    if (svc) {
      const war = warFor(state, svc);
      if (war) {
        if (!svc.wartime) {
          svc.wartime = true;
          if (svc.joinedAge >= war.startAge - 1 && (svc.yearsOfService - (svc.priorYears ?? 0)) <= war.years + 1) svc.warEnlisted = true;
        }
        actingYear(ctx, svc);
        fiveStarYear(ctx, svc, war);
      } else if (svc.wartime) {
        svc.wartime = false;
        peace(ctx, svc);
      }
    }
    liabilityYear(ctx);
  },
  resolvers: {
    demob(ctx, data, optionId) {
      const { state, rng } = ctx;
      const svc = state.military.service;
      if (!svc) return;
      svc.warEnlisted = false;
      if (optionId === 'demob') return discharge(ctx, 'honorable', 'Demobilized at the end of the war.');
      if (data.promoted && rng.chance(0.7)) {
        svc.grade = Math.max(0, svc.grade - Math.min(2, data.promoted));
        svc.yearsInGrade = 0;
        return ctx.log(`You stayed in — at your permanent rank: ${rankOf(svc).title}. The wartime stripes went back in the drawer.`, '⬇️', 'warn');
      }
      return ctx.log('You stayed in the regulars, rank intact: the board judged you worth keeping.', '🎖️', 'good');
    },
    recall(ctx, data, optionId) {
      const { state, rng } = ctx;
      const l = state.military.liability;
      if (!l) return undefined;
      if (optionId === 'exempt') {
        if (rng.chance(0.4)) return ctx.log('Your exemption was granted. You stay home — for now.', '📄', 'good');
        ctx.log('Your exemption was refused. You reported as ordered.', '📄', 'warn');
      } else if (optionId === 'ignore') {
        ctx.emit('legal:offense', { offenseId: 'draftEvasion', context: 'ignoring recall orders in wartime', discovery: 0.6, evidence: 0.8 });
        return ctx.log('You ignored your recall orders. The military police have your address.', '🙈', 'bad');
      }
      if (state.career.job) ctx.emit('career:militaryLeave', { reason: `recall to the ${branchOf({ branch: l.branch, nation: l.nation === 'US' ? undefined : l.nation }).name}` });
      if (!enlist(ctx, { branch: l.branch, track: l.track, component: 'active', specialty: l.specialty })) return undefined;
      const svc = state.military.service;
      if (svc) Object.assign(svc, { warEnlisted: true, wartime: true, recalled: true, contractYearsLeft: 99 });
      state.military.liability = { ...l, recalled: true };
      return ctx.log(`You reported for duty: recalled from the ${l.name} for ${data.war}.`, '🪖', 'milestone');
    },
  },
};

/** Exceptional service: retired a grade up, by brevet (the honour, not the pay). */
function brevet(ctx, svc, type) {
  const { state, rng } = ctx;
  if (type !== 'retired' || svc.fiveStar) return;
  const valour = state.honors.filter((h) => h.source === 'military' && (h.valor || /Cross|Medal of Honor|Silver Star|Victoria|Valour|Valor/.test(h.name))).length;
  const score = valour * 2 + (svc.combatTours ?? 0) + (svc.eval >= 90 ? 2 : 0) + (svc.wounds ?? 0);
  if (score < 5 || svc.grade >= rankTitles(svc).length - 1 || !rng.chance(clamp(0.2 + score * 0.05, 0, 0.7))) return;
  const title = rankTitles(svc)[svc.grade + 1];
  const h = state.military.history.at(-1);
  if (h) h.brevet = title;
  ctx.log(`For exceptional service you were advanced on the retired list to the honorary rank of ${title} (brevet). The pay stays at your old grade; the title is yours.`, '🎖️', 'honor');
}
