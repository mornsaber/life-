/**
 * Private military and security contractors: protective details for
 * diplomats and executives in war zones, static security at bases and
 * embassies, and training contracts for foreign militaries and police.
 *
 * Real-world rules worth knowing:
 *   - Firms hire veterans (combat arms or special operations above all) and
 *     experienced police; nobody walks in off the street.
 *   - Pay is high because the work is dangerous and far from home: rotations
 *     run months abroad, and contractors have died in every recent war.
 *   - Former special operators command the best contracts and day rates.
 *   - Contracts end when the government's needs change; the work is cyclical
 *     with wars.
 */
import { L } from './Ladder.js';
import { yearsInProfession } from '../../core/State.js';
import { atWar } from '../world/War.js';

const COMBAT = ['infantry', 'medic', 'engineer'];

/** Veterans with combat-arms time, former operators, or experienced police. */
export function contractorBackground(state) {
  const honorable = state.military.history.filter((h) => !['dishonorable', 'bcd', 'oth'].includes(h.discharge));
  const sof = honorable.some((h) => h.sof);
  const combatYears = honorable.filter((h) => COMBAT.includes(h.specialty)).reduce((s, h) => s + h.yearsOfService - (h.priorYears ?? 0), 0);
  const anyYears = honorable.reduce((s, h) => s + h.yearsOfService - (h.priorYears ?? 0), 0);
  const lawYears = yearsInProfession(state, ['police', 'sheriff', 'statePolice', 'fbi', 'usms', 'usss', 'dea', 'atf', 'borderPatrol']);
  return { sof, combatYears, anyYears, lawYears };
}

function contractorGate(state) {
  const b = contractorBackground(state);
  if (b.sof || b.combatYears >= 4 || b.anyYears >= 8 || b.lawYears >= 5) return { ok: true };
  return { ok: false, reason: 'Hires veterans with 4+ years in combat arms (or 8+ in any role), former special operators, or 5+ years in law enforcement' };
}

export const CONTRACTOR_PROFESSIONS = {
  privateMilitary: {
    id: 'privateMilitary', name: 'Private Military & Security Contracting', icon: '🪖', sector: 'private', payMultiplier: 1.75, minAge: 21, sizes: { medium: 2, large: 2, enterprise: 1 }, background: 'strict', promotionOdds: 0.5,
    employers: ['Triton Global Security', 'Blackridge Defense Services', 'Sentinel Protective Group', 'Aegis Training Solutions'],
    eligible: contractorGate,
    valued: ['emt', 'paramedic', 'execProtection', 'languageProficiency'],
    rotation: { label: 'on rotation overseas', away: 0.55 },
    hazard: { injury: 0.06, death: 0.003, cause: 'Killed when a protective-detail convoy was ambushed' },
    levels: [
      L('static', 'Static Security Contractor', 4, { years: 2 }),
      L('psd', 'Protective Security Specialist', 6),
      L('trainer', 'Training Contract Instructor', 6, { track: 'ic', entry: true }),
      L('medic', 'Detail Medic', 6, { track: 'ic', req: { credentials: ['paramedic'] } }),
      L('teamLead', 'Protective Detail Team Leader', 7, { track: 'mgmt', abilities: ['supervise'], reports: 8 }),
      L('detailLead', 'Detail Leader', 8, { track: 'mgmt', abilities: ['supervise', 'hire'], reports: 40 }),
      L('programManager', 'Program Manager', 9, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'hire', 'budget', 'delegate'], reports: 300 }),
      L('vpOps', 'Vice President of Operations', 10, { track: 'mgmt', minSize: 'enterprise', abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec'], reports: 2000 }),
    ],
  },
};

const ASSIGNMENTS = [
  'a protective detail for diplomats in Baghdad', 'embassy security in Kabul', 'a convoy-escort contract in Somalia', 'training police recruits in Jordan',
  'guarding an oil field in Kurdistan', 'anti-piracy security on cargo ships off Yemen', 'training a partner army\'s special forces in Eastern Europe', 'executive protection for a mining company in the Sahel',
];

const EVENTS = [
  { title: 'Rules of Engagement', text: 'A car is speeding toward your convoy and ignoring hand signals.', options: [
    { id: 'warn', label: '🚨 Fire a warning flare and swerve', risk: 0.3, text: 'The driver stopped. A frightened family, lost.', record: 0 },
    { id: 'fire', label: '🔫 Fire into the engine block', risk: 0.1, text: 'The car stopped. The investigation cleared you, barely.', record: 0.25 },
  ] },
  { title: 'The Contract Bonus', text: 'Your firm offers a $40,000 bonus to extend another rotation.', options: [
    { id: 'extend', label: '💵 Extend', risk: 0.25, cash: 40000, text: 'Another four months downrange.', stress: 8 },
    { id: 'home', label: '🏠 Go home on schedule', risk: 0, text: 'Your family met you at the airport.', happiness: 6 },
  ] },
  { title: 'A Partner Force', text: 'The recruits you train are deserting with their rifles. Your program manager wants the numbers to look good.', options: [
    { id: 'report', label: '📋 Report it straight', risk: 0, text: 'Honest reporting cost the firm a renewal, and earned you respect.', performance: -4 },
    { id: 'fudge', label: '📊 Make the numbers look good', risk: 0, text: 'The contract was renewed.', record: 0.15, performance: 4 },
  ] },
];

/** The yearly side of contracting: rotations abroad, the danger, and the occasional hard call. */
export const ContractorModule = {
  id: 'contractors',
  order: 30.96,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (job?.professionId !== 'privateMilitary' || !job.paidThisYear || state.legal.incarceration) return;
    const p = CONTRACTOR_PROFESSIONS.privateMilitary;
    const war = atWar(state) ? 1.5 : 1;
    const b = contractorBackground(state);
    if (rng.chance(p.hazard.death * war * (job.levelId === 'trainer' ? 0.3 : 1))) {
      ctx.log(`${p.hazard.cause}.`, '🕯️', 'death');
      ctx.die('Killed on a security contract overseas');
      return;
    }
    ctx.log(`Rotation: ${rng.pick(ASSIGNMENTS)}.`, p.icon, 'muted');
    ctx.stat('stress', 6);
    // Former operators command premium day rates.
    if (b.sof) ctx.earn(Math.round(job.salary * 0.15), 'Special operations day-rate premium', { wage: true });
    if (rng.chance(p.hazard.injury * war)) {
      ctx.stat('health', -rng.int(8, 22));
      ctx.emit('health:injury', { conditionId: rng.pick(['backInjury', 'tbi', 'hearingLoss']), severity: rng.int(20, 55) });
      ctx.log('You were wounded on a detail and medevaced home for surgery.', '🩸', 'bad');
    }
    if (rng.chance(0.4)) {
      const e = rng.pick(EVENTS);
      ctx.prompt({ type: 'contractors.event', icon: p.icon, title: e.title, text: e.text, options: e.options.map((o) => ({ id: o.id, label: o.label })), data: { title: e.title } });
    }
  },

  resolvers: {
    event(ctx, data, optionId) {
      const { rng } = ctx;
      const o = EVENTS.find((e) => e.title === data.title)?.options.find((x) => x.id === optionId);
      if (!o) return;
      if (o.cash) ctx.earn(o.cash, 'Contract extension bonus', { wage: true });
      if (o.stress) ctx.stat('stress', o.stress);
      if (o.happiness) ctx.stat('happiness', o.happiness);
      if (o.performance) ctx.emit('career:adjust', { performance: o.performance });
      if (o.risk && rng.chance(o.risk * 0.3)) {
        ctx.stat('health', -rng.int(5, 15));
        ctx.log('It went bad for a moment, and you took a hit.', '🩸', 'bad');
      }
      ctx.log(o.text, '🪖');
      if (o.record && rng.chance(o.record)) {
        ctx.log('A congressional inquiry into contractor conduct named your detail.', '🏛️', 'bad');
        ctx.emit('career:adjust', { performance: -10, boss: -6 });
      }
    },
  },
};
