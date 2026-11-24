/**
 * Protection: one account of who keeps you safe and what you do about it, for anyone worth
 * guarding — a head of government, a royal, a star, a fortune.
 *
 *   Cover      the state's (a protection detail for heads of government and the sovereign;
 *              officers for ministers and royals near the throne), your own (a private team, your
 *              bodyguards on the staff), and the hardware (an armoured car, a secured home), times
 *              your posture: low profile, standard, or a ring of steel. 0–95.
 *   Threat     how much danger your name draws: fame, office, the crown, money; kidnapping where
 *              and when it was an industry (Italy in the 1970s, Colombia in the 1990s, Mexico now).
 *   Incidents  kidnap attempts (with a ransom to decide on), extortion letters, and for icons an
 *              attack. Office (politics/OfficeLife.js) and the crown (world/CourtLife.js) keep their
 *              own threats, and read cover from here.
 *   Options    posture, a private team (three tiers), an armoured car (from 1930), securing the
 *              house, vetting the household, and turning down state protection.
 *
 * state.protection = { posture, firm, armoured, secureHome, vetted, declined, kidnaps, seed }
 */
import { Random, clamp } from '../../core/Random.js';
import { netWorth } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { fameScore } from './Fame.js';
import { bodyguards } from './Property.js';
import { protectionOf as officeProtection, detailHere } from '../politics/OfficeLife.js';
import { stateProtected, PROTECTION_COST } from '../world/CourtLife.js';
import { OFFICES } from '../politics/Offices.js';

const pr = (state) => (state.protection ??= { posture: 'standard', firm: 0 });
const cc = (state) => state.character?.countryId ?? 'US';

export const POSTURES = {
  low: { label: '🧢 Low profile', note: 'Fewer officers, more freedom: happier, less safe', cover: 0.6, happy: 1, stress: 0 },
  standard: { label: '🛡️ Standard', note: 'What your advisers recommend', cover: 1, happy: 0, stress: 0 },
  heavy: { label: '🧱 A ring of steel', note: 'Safer; no privacy, no spontaneity', cover: 1.25, happy: -2, stress: 1 },
};
/** Private protection, by tier: [cover, yearly cost today in US dollars]. */
export const FIRMS = [null, { cover: 15, cost: 40000 }, { cover: 30, cost: 140000 }, { cover: 45, cost: 450000 }];
/** What a private team was called in its day. */
export function firmName(tier, y) {
  if (!tier) return 'None';
  if (y < 1900) return ['', 'a watchman at the door', 'private detectives on retainer', 'an agency\'s men round the clock'][tier];
  if (y < 1960) return ['', 'a private detective on call', 'two plain-clothes guards', 'a security agency\'s team'][tier];
  return ['', 'a driver-bodyguard', 'a close-protection team', 'a security company: a team, cars and a control room'][tier];
}
export const ARMOUR_FROM = 1930;
const ARMOUR_COST = 180000;
const SECURE_COST = 120000;
const secureName = (y) => (y < 1950 ? 'walls, dogs and a night watchman' : y < 1980 ? 'alarms, floodlights and a gatehouse' : 'CCTV, a safe room and a gatehouse');

/** Kidnapping as an industry: [country, from, until, multiplier]. */
const KIDNAP = [['IT', 1970, 1992, 3], ['CO', 1980, 2010, 4], ['MX', 1990, 9999, 3], ['BR', 1985, 2006, 2.5], ['VE', 2000, 9999, 3], ['NG', 2005, 9999, 3], ['PH', 1990, 9999, 2], ['LB', 1982, 1992, 3], ['AR', 1970, 1982, 2.5], ['US', 1920, 1940, 1.5], ['HT', 2005, 9999, 3], ['EC', 2000, 9999, 2], ['IQ', 2004, 2012, 4]];
export const kidnapFactor = (country, y) => KIDNAP.find(([c, a, b]) => c === country && y >= a && y < b)?.[3] ?? 1;

/** Who the state sends, if anyone: { cover, agency } or null. */
export function stateCover(state) {
  if (pr(state).declined) return null;
  const o = officeProtection(state);
  if (o?.tier === 'detail') return { cover: 60, agency: o.agency };
  const r = state.royal;
  if (r && stateProtected(r)) {
    const y = yearNow(state);
    const agency = cc(state) === 'GB' ? (y >= 1883 ? 'the Metropolitan Police\'s royal protection officers' : 'the Household Cavalry and the palace police') : y < 1918 ? 'the palace guard' : detailHere(state);
    return { cover: r.reigning ? 65 : 45, agency };
  }
  if (o?.tier === 'officers') return { cover: 35, agency: o.agency };
  if (state.holySee?.pope) return { cover: 70, agency: 'the Swiss Guard and the Vatican Gendarmerie' };
  return null;
}

/** All your cover, 0–95, with its parts. */
export function coverOf(state) {
  const p = pr(state);
  const parts = [];
  const s = stateCover(state);
  if (s) parts.push(['State protection', s.cover]);
  const firm = FIRMS[p.firm ?? 0];
  if (firm) parts.push(['Your own team', firm.cover]);
  if (state.royal?.protection === 'private' && !stateProtected(state.royal)) parts.push(['Private protection officers', 40]);
  const bg = Math.min(3, bodyguards(state));
  if (bg) parts.push(['Bodyguards on the staff', bg * 8]);
  if (p.armoured) parts.push(['An armoured car', 10]);
  if (p.secureHome) parts.push(['A secured house', 10]);
  if (p.vetted) parts.push(['A vetted household', 5]);
  const raw = parts.reduce((a, [, v]) => a + v, 0);
  return { cover: Math.round(clamp(raw * (POSTURES[p.posture ?? 'standard']?.cover ?? 1), 0, 95)), parts };
}

/** How much danger your name draws (0–100), and how much of it is kidnap risk. */
export function threatOf(state) {
  const y = yearNow(state);
  const worth = netWorth(state);
  const money = worth >= 1e9 ? 55 : worth >= 1e8 ? 40 : worth >= 2e7 ? 25 : worth >= 5e6 ? 12 : 0;
  const level = OFFICES[state.politics?.office?.id]?.level ?? 0;
  const r = state.royal;
  const royal = r ? (r.reigning ? 60 : r.line != null && r.line <= 3 ? 45 : 25) : 0;
  // The anarchists' decades: kings, empresses and presidents shot and bombed (1878–1914).
  const anarchy = y >= 1878 && y <= 1914 && (r?.reigning || level >= 5) ? 15 : 0;
  const base = Math.max(fameScore(state) * 0.8, money, level * 10, royal) + anarchy;
  const kidnap = clamp(Math.max(money, fameScore(state) * 0.5, royal * 0.5) * kidnapFactor(cc(state), y), 0, 100);
  return { threat: Math.round(clamp(base, 0, 100)), kidnap: Math.round(kidnap) };
}

/** Is there anything to protect? (For the card.) */
export const worthGuarding = (state) => state.character.age >= 16 && (threatOf(state).threat >= 12 || coverOf(state).cover > 0);

const rngOf = (state) => { const p = pr(state); p.seed = ((p.seed ?? ((state.world?.seed ?? 5) * 2246822519) >>> 0) * 1664525 + 1013904223) >>> 0; return new Random(p.seed); };

export const ProtectionModule = {
  id: 'protection',
  order: 96.5,
  init(state) { pr(state); },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive || state.character.age < 16) return;
    const p = pr(state);
    const y = yearNow(state);
    const rng = rngOf(state);
    // A star's security team (Fame) is your private team now.
    if (state.fame?.security) { p.firm = Math.max(p.firm ?? 0, 2); state.fame.security = false; }
    // The bills.
    const firm = FIRMS[p.firm ?? 0];
    if (firm && !ctx.spend(Math.round(firm.cost * priceLevel(state) * (y < 1950 ? 0.4 : 1)), `Private protection (${firmName(p.firm, y)})`, { credit: false })) {
      p.firm = 0;
      ctx.log('You could no longer pay for your protection. The team left.', '🛡️', 'warn');
    }
    if (p.armoured) ctx.spend(Math.round(12000 * priceLevel(state)), 'Armoured car: upkeep and a trained driver', { allowDebt: true });
    const post = POSTURES[p.posture ?? 'standard'];
    if (post.happy) ctx.stat('happiness', post.happy);
    if (post.stress) ctx.stat('stress', post.stress);
    const { cover } = coverOf(state);
    const { threat, kidnap } = threatOf(state);
    // Kidnap: an attempt, then whether your cover stops it.
    if (kidnap >= 15 && !state.prompts.some((x) => x.type === 'protection.kidnap') && rng.chance(kidnap / 2500)) {
      if (rng.chance(cover / 100)) {
        ctx.stat('stress', 4);
        return ctx.log(rng.pick(['Your driver spotted the same van three days running and changed the route. The police later arrested a gang who had been watching you.', 'Men tried to stop your car at a junction. Your team rammed through and were gone in seconds.', 'An informer told the police of a plan to take you. Your security had already changed everything.']), '🛡️', 'warn');
      }
      const ransom = Math.max(50000, Math.round(Math.min(netWorth(state) * 0.12, 2e7) / 1000) * 1000);
      p.kidnaps = (p.kidnaps ?? 0) + 1;
      ctx.stat('stress', 30);
      ctx.stat('health', -rng.int(5, 15));
      return ctx.prompt({
        type: 'protection.kidnap', icon: '⛓️', title: 'Kidnapped',
        text: `You were taken on your way ${rng.pick(['home', 'to work', 'from a dinner'])} and held for weeks in a room with no window. Your captors want ${ransom.toLocaleString()}.`,
        data: { ransom },
        options: [
          { id: 'pay', label: '💰 Pay the ransom', hint: ransom.toLocaleString() },
          ...(y >= 1975 ? [{ id: 'negotiate', label: '🤝 A kidnap-and-ransom negotiator', hint: 'Slower; usually far less' }] : []),
          { id: 'refuse', label: '🙅 Refuse to pay (the police way)', tone: 'danger', hint: 'A rescue, or worse' },
        ],
      });
    }
    // Extortion: a letter, a threat, a price.
    if (threat >= 30 && rng.chance(0.04)) {
      ctx.stat('stress', cover >= 30 ? 1 : 4);
      ctx.log(cover >= 30 ? 'An extortion letter came, threatening your family. Your security handed it to the police; nothing came of it.' : 'An extortion letter came, threatening your family unless you paid. You lay awake for weeks.', '✉️', 'warn');
    }
    // An icon's fan with a gun: not office, not the crown (those keep their own), just fame.
    if (fameScore(state) >= 70 && !state.politics?.office && !state.royal && rng.chance(0.0025)) {
      if (rng.chance(cover / 100 + 0.3)) {
        ctx.stat('stress', 12);
        return ctx.log('A man with a gun waited outside your building. Your protection team saw him first.', '🛡️', 'bad');
      }
      if (rng.chance(0.4)) { ctx.log('A deranged fan shot you outside your home.', '🕯️', 'death'); return ctx.die('Shot by an obsessed fan'); }
      ctx.stat('health', -rng.int(15, 35));
      ctx.log('An obsessed fan attacked you outside your home. You survived the surgery.', '🚑', 'bad');
    }
    return undefined;
  },
  actions: {
    /** Your posture: low | standard | heavy. */
    posture(ctx, arg) {
      if (!POSTURES[arg]) return undefined;
      pr(ctx.state).posture = arg;
      return ctx.log(`Your security posture: ${POSTURES[arg].label.slice(3)}.`, '🛡️', 'info');
    },
    /** Hire (or let go of) a private team: tier 0–3. */
    firm(ctx, arg) {
      const { state } = ctx;
      const tier = clamp(Number(arg) || 0, 0, 3);
      const p = pr(state);
      if (tier && state.finances.cash < Math.round(FIRMS[tier].cost * priceLevel(state) * (yearNow(state) < 1950 ? 0.4 : 1))) return ctx.toast('You\'d need a year\'s fees in hand.', 'warn');
      p.firm = tier;
      return ctx.log(tier ? `You took on ${firmName(tier, yearNow(state))}.` : 'You let your protection team go.', '🛡️', 'info');
    },
    armour(ctx) {
      const { state } = ctx;
      const p = pr(state);
      if (yearNow(state) < ARMOUR_FROM) return ctx.toast('Armoured cars come later.', 'warn');
      if (p.armoured) return undefined;
      if (!ctx.spend(Math.round(ARMOUR_COST * priceLevel(state)), 'An armoured car', { credit: false })) return ctx.toast('Not enough cash.', 'warn');
      p.armoured = true;
      return ctx.log('An armoured car, with a driver trained to get you out of an ambush.', '🚙', 'good');
    },
    secureHome(ctx) {
      const { state } = ctx;
      const p = pr(state);
      if (p.secureHome) return undefined;
      if (!ctx.spend(Math.round(SECURE_COST * priceLevel(state) * (yearNow(state) < 1950 ? 0.4 : 1)), 'Securing the house', { credit: false })) return ctx.toast('Not enough cash.', 'warn');
      p.secureHome = true;
      return ctx.log(`The house is secured: ${secureName(yearNow(state))}.`, '🏰', 'good');
    },
    /** Background checks on everyone who works for you. */
    vet(ctx) {
      const { state } = ctx;
      const p = pr(state);
      if (p.vetted) return undefined;
      if (!ctx.spend(Math.round(15000 * priceLevel(state)), 'Background checks on the household', { credit: false })) return ctx.toast('Not enough cash.', 'warn');
      p.vetted = true;
      for (const s of state.property?.staff ?? []) s.loyalty = Math.min(100, (s.loyalty ?? 65) + 5);
      return ctx.log('Everyone who works for you has been checked. One driver turned out to have a second name.', '🔍', 'info');
    },
    /** Turn down (or accept again) the state's protection. */
    decline(ctx) {
      const { state } = ctx;
      const p = pr(state);
      p.declined = !p.declined;
      return ctx.log(p.declined ? 'You told the government you would do without its protection officers.' : 'You accepted the state\'s protection again.', '🛡️', p.declined ? 'warn' : 'info');
    },
  },
  resolvers: {
    kidnap(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'pay') {
        ctx.spend(data.ransom, 'Ransom', { allowDebt: true });
        return ctx.log('The ransom was paid, and you were left blindfolded by a roadside at dawn.', '⛓️', 'bad');
      }
      if (optionId === 'negotiate') {
        const paid = Math.round(data.ransom * rng.float(0.15, 0.45));
        ctx.spend(paid + 40000, 'Ransom and the negotiator\'s fee', { allowDebt: true });
        ctx.stat('stress', 10);
        return ctx.log(`Weeks of calls, proofs of life and silences. They settled for ${paid.toLocaleString()}. You came home thinner, and changed.`, '🤝', 'warn');
      }
      if (rng.chance(0.12)) { ctx.log('The rescue went wrong.', '🕯️', 'death'); return ctx.die('Killed by kidnappers'); }
      ctx.stat('health', -rng.int(5, 20));
      return ctx.log(rng.chance(0.6) ? 'Police special forces stormed the farmhouse where you were held. You were free in ninety seconds.' : 'Your captors gave up and let you go. The police never found them.', '🚓', 'warn');
    },
  },
};

export const PROTECTION_FACTS = { ARMOUR_COST, SECURE_COST, secureName, PROTECTION_COST };
