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
import { postAbroad } from '../world/Posting.js';
import careersPack, { LOCAL_FIRMS, contractorBackground, contractorGate } from '../content/packs/careers-contractors.js';
export { LOCAL_FIRMS, contractorBackground, contractorGate };




/* The careers themselves (CONTRACTOR_PROFESSIONS) live in content/packs/careers-contractors.js. */


/** Where the contracts are: [what, the country you'd live in for the rotation]. */
const ASSIGNMENTS = [
  ['a protective detail for diplomats in Baghdad', 'Iraq'], ['embassy security in Kabul', 'Afghanistan'], ['a convoy-escort contract in Somalia', 'Somalia'], ['training police recruits in Jordan', 'Jordan'],
  ['guarding an oil field in Kurdistan', 'Iraq'], ['anti-piracy security on cargo ships off Yemen', null], ['training a partner army\'s special forces in Eastern Europe', 'Poland'], ['executive protection for a mining company in the Sahel', 'Mali'],
  ['guarding a mine in the eastern Congo', 'DR Congo'], ['security for an aid convoy in South Sudan', 'South Sudan'],
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
    const p = careersPack.careers.privateMilitary;
    const war = atWar(state) ? 1.5 : 1;
    const b = contractorBackground(state);
    if (rng.chance(p.hazard.death * war * (job.levelId === 'trainer' ? 0.3 : 1))) {
      ctx.log(`${p.hazard.cause}.`, '🕯️', 'death');
      ctx.die('Killed on a security contract overseas');
      return;
    }
    // The rotation takes you there: you live in the country for the months away.
    const [what, country] = rng.pick(ASSIGNMENTS);
    if (country && !state.character.posting) postAbroad(ctx, { place: what.replace(/^.* (in|off) /, ''), country, kind: 'deployment', years: 1 });
    ctx.log(`Rotation: ${what}.`, p.icon, 'muted');
    // The darker market: a foreign armed group offering a fortune for someone who can fight.
    if ((b.sof || b.combatYears >= 6) && rng.chance(0.05) && !state.prompts.some((q) => q.type === 'contractors.mercenary')) {
      ctx.prompt({
        type: 'contractors.mercenary', icon: '💰', title: 'An Offer Off the Books',
        text: 'A middleman offers $250,000 for six months fighting for a foreign armed group in a civil war. Not security work: combat. Most countries make it a crime to fight as a mercenary.',
        options: [{ id: 'decline', label: '🙅 Walk away' }, { id: 'accept', label: '💰 Take the money', tone: 'danger' }],
        data: {},
      });
    }
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
    mercenary(ctx, data, optionId) {
      const { rng } = ctx;
      if (optionId !== 'accept') return ctx.log('You walked away. Some money isn\'t worth it.', '🙅', 'good');
      if (rng.chance(0.06)) {
        ctx.log('Six months into someone else\'s war, your unit was overrun.', '🕯️', 'death');
        return ctx.die('Killed fighting as a mercenary');
      }
      ctx.earn(250000, 'Mercenary contract (off the books)', { informal: true });
      ctx.stat('stress', 20);
      ctx.emit('health:trauma', { amount: 30, source: 'combat' });
      ctx.emit('legal:offense', { offenseId: 'mercenarism', context: 'fighting as a mercenary in a foreign war', discovery: 0.35, evidence: 0.7 });
      return ctx.log('You came back with $250,000 in cash and things you don\'t talk about.', '💰', 'warn');
    },
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
        ctx.log(`${(ctx.state.character.countryId ?? 'US') === 'US' ? 'A congressional' : 'A parliamentary'} inquiry into contractor conduct named your detail.`, '🏛️', 'bad');
        ctx.emit('career:adjust', { performance: -10, boss: -6 });
      }
    },
  },
};
