/**
 * Reserve component: one weekend a month plus two weeks of annual training,
 * served alongside a civilian career or school. Reservists can be mobilized
 * (involuntarily or by volunteering), at which point they deploy exactly like
 * active-duty members and their civilian job is protected (USERRA in the US; each
 * country's reservist-protection law elsewhere).
 */
import { unitTick } from '../org/MilitaryUnits.js';
import { sofTick } from './SpecialOps.js';
import { serviceLifeTick } from './MilitaryLife.js';
import { schoolTick } from './Schools.js';
import { clamp } from '../../core/Random.js';
import { BRANCHES, ranksOf, rankOf, specialtyName, exposureOf, flightHoursOf, completeTraining, finishOfficerAcademy, entrySchool, monthlyBasePay, annualActivePay, updateEvaluation, tryPromotion, branchOf } from './MilitaryEngine.js';
import { annualReview } from './MedalEngine.js';
import { serviceWar, serviceWarFactor } from '../world/War.js';
import { combatTempo } from '../world/NationalForces.js';
import { runDeployment, openContractReview } from './ActiveDuty.js';
import { upOrOut, mustRetire } from './Separation.js';

/** 48 drill periods (each a day's pay) + 15 days annual training ≈ 2.1 months of base pay. */
export const DRILL_PAY_MONTHS = 2.1;

/** A reserve year, by kind of force. */
const DRILL_FLAVOR = {
  ground: [
    'Weekend drills: weapons qualification and land navigation.',
    'Annual training: two weeks of field exercises at a regional training area.',
    'Drill weekend: vehicle and equipment maintenance, briefings, and a loaded march.',
    'Annual training: a joint exercise alongside the regulars.',
    'A weekend on the ranges, then a night exercise in the rain.',
  ],
  naval: [
    'Drill nights at the reserve unit, then a weekend at sea in a patrol vessel.',
    'Annual training: two weeks aboard a frigate, standing watches with the regulars.',
    'Damage-control and firefighting training in the ship simulator.',
    'Harbour-protection exercise: boarding drills and night patrols.',
    'Two weeks in a fleet headquarters, planning an exercise on the charts.',
  ],
  air: [
    'Drill weekends with your squadron: aircraft maintenance and readiness checks.',
    'Annual training: two weeks at an air base, supporting a major exercise.',
    'A weekend of force-protection and airfield-damage-repair training.',
    'Two weeks on an exercise abroad, working alongside allied air forces.',
  ],
};
const theaterOf = (svc) => (['navy', 'coastguard', 'noaa'].includes(svc.branch) ? 'naval' : ['airforce', 'spaceforce'].includes(svc.branch) ? 'air' : 'ground');

/** What a Strategic Sealift Officer's reserve year looks like. */
const SEALIFT_DRILLS = [
  'Sealift drill: a week aboard a Ready Reserve ship, testing her break-out from reduced operating status.',
  'Annual training at a fleet headquarters, planning a convoy across a contested ocean.',
  'Naval Cooperation and Guidance for Shipping course: how merchant ships sail under navy protection.',
  'Two weeks with Military Sealift Command, standing watches on a fleet oiler.',
];

export function reserveTick(ctx, svc) {
  const { rng } = ctx;
  const branch = branchOf(svc);

  if (svc.isNew) {
    svc.isNew = false;
    ctx.log(`You completed ${entrySchool(svc)} and ${specialtyName(svc)} school, then reported to your reserve unit.`, '🎖️', 'military');
    finishOfficerAcademy(ctx, svc);
    completeTraining(ctx, svc);
    ctx.stat('fitness', rng.int(5, 10));
  }

  svc.yearsOfService += 1;
  svc.yearsInGrade += 1;
  svc.contractYearsLeft -= 1;
  updateEvaluation(ctx, svc);
  svc.eval = Math.round(clamp(svc.eval + unitTick(ctx, svc, ranksOf(svc)), 0, 100));
  sofTick(ctx, svc);
  serviceLifeTick(ctx, svc);
  schoolTick(ctx, svc);

  const exposure = exposureOf(svc);
  // General mobilization calls up nearly every reservist.
  // In peacetime, reservists are called up for standing operations — often in the US, rarely in most other countries.
  const peaceTempo = !serviceWar(ctx.state, svc) && svc.nation ? combatTempo(svc.nation) : 1;
  const mobilizeChance = (serviceWar(ctx.state, svc)?.mobilized ? 0.7 : 0) + 0.08 * exposure * peaceTempo * serviceWarFactor(ctx.state, svc) ** 1.5 + (svc.deploymentRequested ? 0.6 : 0);
  if (rng.chance(clamp(mobilizeChance, 0, 0.9))) {
    ctx.earn(annualActivePay(svc), `Mobilized pay — ${rankOf(svc).code}`, { wage: true });
    if (svc.mos === 'navy.1665') ctx.log(rng.pick(['Mobilized as a Strategic Sealift Officer: orders to an MSC ship loading tanks and ammunition for the theatre.', 'Your sealift orders came: chief mate of a Ready Reserve roll-on/roll-off ship, activated in five days.', 'You traded your merchant company\'s uniform for the Navy\'s and joined a convoy staff.']), '⚓', 'military');
    runDeployment(ctx, svc, { mobilized: true });
  } else {
    ctx.earn(monthlyBasePay(svc) * DRILL_PAY_MONTHS, `Reserve drill pay — ${rankOf(svc).code}`, { wage: true });
    if (flightHoursOf(svc)) ctx.emit('logbook:add', { hours: flightHoursOf(svc) });
    ctx.log(`${rng.pick(svc.mos === 'navy.1665' ? SEALIFT_DRILLS : DRILL_FLAVOR[theaterOf(svc)])} Evaluation: ${svc.eval}/100.`, branch.icon, 'military');
    ctx.stat('fitness', 1);
  }

  annualReview(ctx, svc);
  tryPromotion(ctx, svc);
  if (upOrOut(ctx, svc)) return;
  if (svc.contractYearsLeft <= 0 || mustRetire(ctx.state, svc)) openContractReview(ctx, svc);
}
