/**
 * Organised crime as a world of its own: the outfits that run a city's rackets, and a life
 * inside one.
 *
 *   Outfits      Every city has two or three: a crime family, a street gang, a cartel cell, a
 *                triad, a yakuza clan, a bratva, an outlaw motorcycle club, a London firm — the
 *                kinds each country really has. Each has a strength, a share of the city's
 *                territory, a boss, its own heat with the police, and rivals.
 *   Ranks        Associate to boss, in the outfit's own words (soldier, capo, underboss; red
 *                pole, dragon head; jefe de plaza, capo). Respect earns promotion; the boss's
 *                trust keeps you alive.
 *   Rackets      Gambling, loan-sharking, protection, fencing, counterfeit goods, drugs, cargo
 *                theft, construction rackets, cyber fraud: each with its income, heat and
 *                violence. You kick up a share; skimming pays until someone counts.
 *   Crew         From capo up, you run a crew: loyal, competent, or neither. Crews insulate you
 *                from the street — and arrested crew members can flip.
 *   Laundering   Dirty money needs a clean front: your own businesses can wash it. Unexplained
 *                wealth is evidence.
 *   Wars         Rival outfits fight over territory: hit back, negotiate, or lie low.
 *   The law     Heat brings a racketeering task force: surveillance, wiretaps, then
 *                indictments. Indicted, you fight it, cooperate (and enter witness protection
 *                with a new name in a new city), or run. The feds may try to flip you first.
 *   The top      A boss sets policy (expand, consolidate, go legit), sits down with rivals and
 *                buys officials.
 *   Leaving      Associates can drift away; members ask permission, retire with respect, or
 *                are marked.
 *
 * state.underworld = { outfits: { [id]: outfit }, me: { outfitId, rank, respect, trust, rackets,
 *   skim, crew, dirty, laundered, made, informant, marked, witsec, history } }
 */
import { clamp, Random } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName, setNameCountry, currentYear } from '../../core/State.js';
import { commitOffense } from './JusticeSystem.js';
import { crimeOf } from './StreetCrime.js';
import { REGIONS, regionsHere, changeRegion } from '../life/Regions.js';
import { leaveJob } from '../career/CareerEngine.js';

/* ------------------------------------------------------------------ */
/* Kinds of outfit                                                     */
/* ------------------------------------------------------------------ */

export const OUTFIT_TYPES = {
  family: { label: 'crime family', icon: '🎩', ranks: ['Associate', 'Soldier', 'Capo', 'Underboss', 'Boss'], made: 'You were made: a soldier of the family, sworn in with a burning saint\'s card in your hands. From today, you can\'t be touched — and you can\'t leave.', name: (rng) => `the ${randomName(rng, 'male').lastName} family` },
  clan: { label: 'clan', icon: '🍋', ranks: ['Picciotto', 'Sgarrista', 'Capo-decina', 'Capo-società', 'Capo-bastone'], made: 'You were sworn into the clan in a ritual of blood and oaths before the old men.', name: (rng) => `the ${randomName(rng, 'male').lastName} clan` },
  gang: { label: 'street gang', icon: '🧢', ranks: ['Prospect', 'Member', 'Shot-caller', 'Second', 'Leader'], made: 'You were jumped in: thirteen seconds of fists, and then embraces. You\'re a member.', name: (rng) => `the ${rng.pick(['Eastside', 'Westside', 'Southside', 'North End', 'Harbor', 'Avenue'])} ${rng.pick(['Kings', 'Bloods', 'Crew', 'Boys', 'Disciples', 'Lords'])}` },
  cartel: { label: 'cartel cell', icon: '🦂', ranks: ['Halcón (lookout)', 'Distributor', 'Jefe de plaza', 'Lieutenant', 'Capo'], made: 'The jefe de plaza put you on the payroll: you belong to the organisation now.', name: (rng) => `the ${rng.pick(['Sierra', 'Pacific', 'Gulf', 'Valley', 'Northern'])} cartel's local cell` },
  triad: { label: 'triad', icon: '🐉', ranks: ['Blue Lantern', '49 (member)', 'Red Pole', 'Incense Master', 'Dragon Head'], made: 'You swore the 36 oaths before the altar and became a 49: a full member of the society.', name: (rng) => `the ${rng.pick(['Wo Shing', 'Sun Yee', 'Luen', 'Hung Mun', 'Kung Lok'])} society` },
  yakuza: { label: 'yakuza clan', icon: '🎴', ranks: ['Junior (shatei)', 'Kobun', 'Wakagashira-hosa', 'Wakagashira', 'Kumichō'], made: 'You shared sake with the oyabun in the sakazuki ceremony: his kobun, for life.', name: (rng) => `the ${rng.pick(['Matsuda', 'Kōzan', 'Inagawa', 'Sakai', 'Ōshima'])}-gumi` },
  bratva: { label: 'bratva', icon: '🐻', ranks: ['Shestyorka', 'Boyevik', 'Brigadier', 'Sovietnik', 'Pakhan'], made: 'The brigadier vouched for you. You\'re a boyevik of the brotherhood now.', name: (rng) => `the ${rng.pick(['Solntsevo', 'Tambov', 'Izmailovo', 'Kazan', 'Uralmash'])} brotherhood` },
  mc: { label: 'motorcycle club', icon: '🏍️', ranks: ['Prospect', 'Patched member', 'Road captain', 'Vice president', 'President'], made: 'After a year of prospecting, the club voted you in. You earned your patch.', name: (rng) => `the ${rng.pick(['Iron', 'Hell\'s', 'Grim', 'Rebel', 'Desert'])} ${rng.pick(['Riders', 'Angels', 'Reapers', 'Outlaws', 'Saints'])} MC` },
  firm: { label: 'firm', icon: '🎲', ranks: ['Runner', 'Member', 'Lieutenant', 'Number two', 'Guv\'nor'], made: 'The guv\'nor took you into the firm: one of his own now.', name: (rng) => `the ${randomName(rng, 'male').lastName} firm` },
};

/** What a country's underworld looks like. */
const COUNTRY_OUTFITS = {
  US: ['family', 'gang', 'cartel', 'mc'], CA: ['family', 'mc', 'gang'], MX: ['cartel', 'gang'], CO: ['cartel', 'gang'], BR: ['gang', 'cartel'],
  GB: ['firm', 'gang'], IE: ['firm', 'gang'], IT: ['clan', 'family'], JP: ['yakuza'], CN: ['triad'], HK: ['triad'], TW: ['triad'], SG: ['triad', 'gang'], MY: ['triad', 'gang'],
  RU: ['bratva'], UA: ['bratva', 'gang'], AU: ['mc', 'gang', 'triad'], NZ: ['mc', 'gang'], DE: ['mc', 'clan', 'bratva'], NL: ['mc', 'gang'], FR: ['gang', 'clan'], ES: ['clan', 'gang'],
};

export const RACKETS = {
  fencing: { label: 'Fencing stolen goods', icon: '📦', income: [15000, 45000], heat: 3, violence: 0.01, rank: 0, offense: 'receivingStolen' },
  numbers: { label: 'Gambling and the numbers', icon: '🎲', income: [20000, 60000], heat: 4, violence: 0.02, rank: 1, offense: 'illegalGambling' },
  loans: { label: 'Loan-sharking', icon: '🦈', income: [25000, 70000], heat: 5, violence: 0.05, rank: 1, offense: 'extortion' },
  counterfeit: { label: 'Counterfeit goods', icon: '👜', income: [20000, 80000], heat: 4, violence: 0.01, rank: 1, offense: 'counterfeitGoods' },
  protection: { label: 'Protection', icon: '🛡️', income: [30000, 90000], heat: 7, violence: 0.06, rank: 1, offense: 'extortion' },
  cyber: { label: 'Online fraud', icon: '💻', income: [40000, 150000], heat: 5, violence: 0, rank: 1, offense: 'wireFraud' },
  cargo: { label: 'Cargo theft at the docks', icon: '🚢', income: [50000, 160000], heat: 8, violence: 0.03, rank: 2, offense: 'grandTheft' },
  drugs: { label: 'Drug distribution', icon: '💊', income: [60000, 220000], heat: 12, violence: 0.1, rank: 2, offense: 'drugDistribution' },
  construction: { label: 'Construction rackets', icon: '🏗️', income: [100000, 300000], heat: 8, violence: 0.03, rank: 3, offense: 'racketeering' },
};

export const SKIM = { 0: 'Kick up every cent', 10: 'Skim a little', 25: 'Skim a lot' };
export const POLICIES = {
  consolidate: { label: '🧱 Consolidate', desc: 'Steady income, fewer wars.' },
  expand: { label: '🗺️ Expand', desc: 'More territory and income; wars and heat follow.' },
  legit: { label: '🏢 Go legitimate', desc: 'Move money into real businesses; income and heat fall.' },
};
const TRIBUTE = 0.3;
const MAX_CREW = [0, 0, 6, 10, 15];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const uw = (state) => (state.underworld ??= { outfits: {}, me: null });
export const meOf = (state) => state.underworld?.me ?? null;
const here = (state) => state.character.regionId;
const cityName = (regionId) => REGIONS[regionId]?.name?.split(',')[0] ?? 'the city';
export const rankTitle = (o, rank) => OUTFIT_TYPES[o.type].ranks[clamp(rank, 0, 4)];

/** The outfits in your city (created the first time anyone looks). */
export function outfitsHere(state, rng) {
  const u = uw(state);
  const regionId = here(state);
  let list = Object.values(u.outfits).filter((o) => o.regionId === regionId && !o.dissolved);
  if (list.length || !rng) return list;
  const cc = state.character.countryId ?? 'US';
  const types = COUNTRY_OUTFITS[cc] ?? ['gang', 'family'];
  const n = Math.min(3, Math.max(2, types.length));
  setNameCountry(cc);
  let left = 100;
  for (let i = 0; i < n; i++) {
    const type = types[i % types.length];
    const share = i === n - 1 ? left : rng.int(15, Math.max(16, left - 15 * (n - i - 1)));
    left -= share;
    const id = `uw${Object.keys(u.outfits).length + 1}`;
    u.outfits[id] = { id, regionId, type, name: OUTFIT_TYPES[type].name(rng), strength: rng.int(20, 80), territory: share, heat: rng.int(0, 30), boss: `${randomName(rng, 'male').firstName} ${randomName(rng, 'male').lastName}`, war: null, task: null, policy: 'consolidate' };
  }
  setNameCountry(state.character.countryId ?? 'US');
  list = Object.values(u.outfits).filter((o) => o.regionId === regionId);
  return list;
}
const outfitOf = (state) => { const me = meOf(state); return me ? state.underworld.outfits[me.outfitId] : null; };

/** Can you get close to an outfit? */
export function approachCheck(state, outfitId) {
  const c = state.character;
  if (c.age < 16) return { ok: false, reason: '16+' };
  if (meOf(state)) return { ok: false, reason: 'Already with an outfit' };
  if (state.underworld?.witsec) return { ok: false, reason: 'You testified: no outfit will have you' };
  if (state.legal.incarceration) return { ok: false, reason: 'Inside, the gangs find you' };
  const o = state.underworld?.outfits?.[outfitId];
  if (!o) return { ok: false, reason: 'Unknown outfit' };
  const crime = state.legal.crime;
  const street = crime ? Object.values(crime.skill ?? {}).reduce((a, b) => a + b, 0) : 0;
  const record = (state.legal.record ?? []).some((r) => r.severity !== 'infraction');
  const family = state.underworld?.family?.outfitId === outfitId;
  if (!street && !record && !family) return { ok: false, reason: 'They don\'t know you: build a name on the street first' };
  if (yearlyCount(state, 'underworld.approach')) return { ok: false, reason: 'Once a year' };
  return { ok: true, odds: clamp(0.35 + street * 0.05 + (record ? 0.15 : 0) + (family ? 0.4 : 0), 0.2, 0.95) };
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

/** The city's underworld moves on: strength, heat, wars and task forces. */
function worldYear(ctx) {
  const { state, rng } = ctx;
  const list = Object.values(state.underworld?.outfits ?? {}).filter((o) => !o.dissolved);
  for (const o of list) {
    o.heat = Math.round(clamp(o.heat * 0.85 + (o.policy === 'expand' ? 8 : o.policy === 'legit' ? -4 : 2) + (o.war ? 10 : 0), 0, 100));
    o.strength = Math.round(clamp(o.strength + rng.int(-4, 4) + (o.policy === 'expand' ? 2 : 0), 5, 100));
    // A task force opens on a hot outfit and works its way to indictments.
    if (!o.task && o.heat >= 55 && rng.chance(0.25)) o.task = { stage: 0, since: state.character.age };
    else if (o.task && rng.chance(0.5)) o.task.stage += 1;
  }
  // Wars break out between neighbours.
  const byCity = {};
  for (const o of list) (byCity[o.regionId] ??= []).push(o);
  for (const outfits of Object.values(byCity)) {
    if (outfits.length < 2 || outfits.some((o) => o.war) || !rng.chance(outfits.some((o) => o.policy === 'expand') ? 0.3 : 0.08)) continue;
    const [a, b] = rng.shuffle([...outfits]).slice(0, 2);
    a.war = b.id; b.war = a.id;
    if (meOf(state) && [a.id, b.id].includes(meOf(state).outfitId)) ctx.log(`War: ${a.name} and ${b.name} are fighting over ${cityName(a.regionId)}'s corners.`, '🔥', 'bad');
  }
  // Wars end with territory changing hands.
  for (const o of list) {
    if (!o.war || !rng.chance(0.4)) continue;
    const r = state.underworld.outfits[o.war];
    if (!r) { o.war = null; continue; }
    const winner = rng.chance(o.strength / (o.strength + r.strength)) ? o : r;
    const loser = winner === o ? r : o;
    const moved = Math.min(loser.territory, rng.int(5, 15));
    winner.territory += moved; loser.territory -= moved;
    loser.strength = Math.max(5, loser.strength - rng.int(5, 12));
    o.war = null; r.war = null;
    if (meOf(state) && [o.id, r.id].includes(meOf(state).outfitId)) ctx.log(`The war ended: ${winner.name} took ${moved}% of ${cityName(o.regionId)} from ${loser.name}.`, '🏳️', winner.id === meOf(state).outfitId ? 'good' : 'bad');
  }
}

/** Your year inside an outfit. */
function myYear(ctx) {
  const { state, rng } = ctx;
  const me = meOf(state);
  const o = outfitOf(state);
  if (!me || !o) return;
  const t = OUTFIT_TYPES[o.type];
  const inside = Boolean(state.legal.incarceration);
  // Marked men don't sleep well.
  if (me.marked && !inside && rng.chance(me.witsec ? 0.02 : 0.15)) {
    if (rng.chance(0.35)) { ctx.log(`${o.name} found you.`, '🔫', 'bad'); return ctx.die('Murdered by organised crime'); }
    ctx.log('A car slowed outside your house, then drove on. You moved the kids to their grandparents\'.', '🚗', 'bad');
    ctx.stat('stress', 12);
  }
  if (me.left || me.witsec) return;
  // Far from the outfit's city, you're out of the day-to-day.
  if (o.regionId !== here(state) && !state.legal.incarceration) {
    if (!me.away) { me.away = true; ctx.log(`You're a long way from ${cityName(o.regionId)} now: ${o.name} carries on without you.`, OUTFIT_TYPES[o.type].icon, 'info'); }
    return;
  }
  me.away = false;
  // In prison: silence earns respect.
  if (inside) {
    me.respect = Math.min(100, me.respect + 4);
    if (rng.chance(0.3)) ctx.log(`${o.name} looked after your family while you were inside. Your silence is noticed.`, t.icon, 'info');
    return;
  }
  const crime = crimeOf(state);
  // Associates do errands; members run rackets.
  let income = 0;
  if (me.rank === 0) {
    income = rng.int(8000, 25000);
    me.respect = Math.min(100, me.respect + rng.int(2, 6));
    crime.heat = clamp(crime.heat + 4, 0, 100);
    if (!state.prompts.some((p) => p.type === 'underworld.job') && rng.chance(0.7)) jobPrompt(ctx, o);
  } else {
    const crewBoost = 1 + Math.min(0.5, me.crew.filter((c) => !c.arrested).length * 0.05);
    for (const id of me.rackets) {
      const r = RACKETS[id];
      income += Math.round(rng.int(...r.income) * (0.5 + o.territory / 100) * crewBoost);
      crime.heat = clamp(crime.heat + r.heat * (me.crew.length ? 0.5 : 1), 0, 100);
      o.heat = clamp(o.heat + r.heat / 3, 0, 100);
      if (rng.chance(r.violence * (o.war ? 3 : 1))) violence(ctx, me, o, r);
      // A loose case: insulated by your crew, but never safe.
      if (rng.chance(0.06 * (me.crew.length ? 0.5 : 1))) commitOffense(ctx, { offenseId: r.offense, context: `${r.label.toLowerCase()} for ${o.name}`, discovery: 0.2, evidence: 0.5 });
    }
  }
  // Tribute up the chain; skimming keeps more until someone counts.
  const kick = me.rank >= 4 ? 0 : TRIBUTE * (1 - (me.skim ?? 0) / 100);
  const yours = Math.round(income * (1 - kick));
  if (me.rank < 4 && me.skim && rng.chance(me.skim / 100)) {
    me.trust = Math.max(0, me.trust - rng.int(10, 25));
    ctx.log(`Someone counted. ${o.boss} knows the envelopes have been light.`, '💰', 'bad');
    if (me.trust < 20) return discipline(ctx, me, o);
  } else me.trust = Math.min(100, me.trust + 3);
  // The boss collects from everyone below.
  const tribute = me.rank >= 4 ? Math.round(o.strength * rng.int(2000, 4000)) : 0;
  const total = yours + tribute;
  if (total > 0) {
    ctx.earn(total, 'Undisclosed income');
    crime.earned += total;
    me.dirty += total;
    me.earned = (me.earned ?? 0) + total;
  }
  // Crew members: some get arrested; the arrested may talk.
  for (const c of me.crew) {
    if (!c.arrested && rng.chance(0.08 + crime.heat / 1000)) { c.arrested = true; ctx.log(`${c.name} from your crew was arrested.`, '🚔', 'warn'); }
    else if (c.arrested && !c.flipped && rng.chance(0.25 - c.loyalty / 500)) {
      c.flipped = true;
      ctx.log(`${c.name} is cooperating with prosecutors.`, '🐀', 'bad');
      commitOffense(ctx, { offenseId: 'racketeering', context: `${c.name}'s testimony about ${o.name}`, discovery: 0.5, evidence: 0.7 });
    }
  }
  me.crew = me.crew.filter((c) => !(c.arrested && c.flipped && rng.chance(0.5)));
  // Unexplained wealth is evidence.
  if (me.dirty > 250000 && rng.chance(0.15)) commitOffense(ctx, { offenseId: 'moneyLaundering', context: 'unexplained wealth', discovery: 0.25, evidence: 0.6 });
  // Promotion: respect, the boss's trust, and a vacancy.
  me.respect = Math.round(clamp(me.respect + (income > 0 ? 3 : 0), 0, 100));
  if (me.rank < 3 && me.respect >= [30, 50, 70][me.rank] && me.trust >= 50 && rng.chance(0.35)) promote(ctx, me, o);
  else if (me.rank === 3 && me.respect >= 85 && rng.chance(0.15)) succession(ctx, me, o, 'The boss stepped back');
  // The war comes to you.
  if (o.war && !state.prompts.some((p) => p.type === 'underworld.war') && rng.chance(0.6)) warPrompt(ctx, o);
  // The task force, and the offer to flip.
  if (o.task) taskForce(ctx, me, o);
}

function violence(ctx, me, o, r) {
  const { rng } = ctx;
  if (rng.chance(0.25)) {
    ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
    ctx.log(`A ${r.label.toLowerCase()} collection went bad. You were hurt.`, '🩸', 'bad');
  } else ctx.log(`A ${r.label.toLowerCase()} collection turned violent.`, '👊', 'warn');
  commitOffense(ctx, { offenseId: 'assault', context: `enforcing for ${o.name}`, discovery: 0.25, evidence: 0.5 });
}

function promote(ctx, me, o) {
  me.rank += 1;
  me.respect = Math.max(0, me.respect - 15);
  const t = OUTFIT_TYPES[o.type];
  if (me.rank === 1 && !me.made) { me.made = true; ctx.log(t.made, t.icon, 'milestone'); }
  else ctx.log(`You were raised to ${rankTitle(o, me.rank)} of ${o.name}.`, t.icon, 'milestone');
  (me.history ??= []).push({ age: ctx.state.character.age, rank: rankTitle(o, me.rank) });
}

function succession(ctx, me, o, why) {
  const { rng } = ctx;
  const won = rng.chance(clamp(0.3 + (me.respect - 70) / 100 + me.crew.length * 0.02, 0.15, 0.8));
  if (!won) { me.respect -= 10; return ctx.log(`${why}, and the outfit chose someone else. You kissed the new boss's ring.`, '👑', 'warn'); }
  me.rank = 4;
  o.boss = `${ctx.state.character.firstName} ${ctx.state.character.lastName}`;
  (me.history ??= []).push({ age: ctx.state.character.age, rank: rankTitle(o, 4) });
  return ctx.log(`${why}. You are the ${rankTitle(o, 4)} of ${o.name} now.`, '👑', 'milestone');
}

function discipline(ctx, me, o) {
  const { rng, state } = ctx;
  if (rng.chance(0.3)) { ctx.log(`${o.boss} decided you were a thief. They came for you at night.`, '🔫', 'bad'); return ctx.die('Murdered by organised crime'); }
  me.rank = Math.max(0, me.rank - 1);
  me.rackets = me.rackets.filter((id) => RACKETS[id].rank <= me.rank);
  ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(30, 60) });
  state.stats.health = Math.max(5, state.stats.health - 20);
  return ctx.log(`You were beaten and broken down to ${rankTitle(o, me.rank)}. A lesson.`, '🩸', 'bad');
}

function jobPrompt(ctx, o) {
  ctx.prompt({ type: 'underworld.job', icon: OUTFIT_TYPES[o.type].icon, title: 'A Job for the Outfit', text: `${o.boss}'s people need something done: ${ctx.rng.pick(['a truck to disappear from a depot', 'a debt collected from a restaurant owner', 'a package driven across town, no questions', 'a witness reminded to forget'])}.`, options: [
    { id: 'do', label: '✅ Do it', hint: 'Respect; risk' },
    { id: 'refuse', label: '🙅 Find an excuse' },
  ] });
}

function warPrompt(ctx, o) {
  const rival = ctx.state.underworld.outfits[o.war];
  ctx.prompt({ type: 'underworld.war', icon: '🔥', title: 'The War Comes to You', text: `${rival?.name ?? 'A rival outfit'} hit one of your spots last night. Your people are waiting to hear what you'll do.`, options: [
    { id: 'hit', label: '🔫 Hit back', tone: 'danger', hint: 'Respect; real danger' },
    { id: 'talk', label: '🤝 Reach out for a sit-down', hint: meOf(ctx.state).rank >= 2 ? '' : 'Capos and above' },
    { id: 'low', label: '🫥 Lie low' },
  ] });
}

function taskForce(ctx, me, o) {
  const { state, rng } = ctx;
  const stage = o.task.stage;
  if (stage === 1 && !o.task.wire) { o.task.wire = true; ctx.log(`Rumours that the feds have a wire on ${o.name}. Everyone is talking in parks and saunas.`, '🎧', 'warn'); }
  // Before indictments, the feds may try to flip you.
  if (stage >= 1 && !me.informant && !o.task.approached && rng.chance(0.3)) {
    o.task.approached = true;
    ctx.prompt({ type: 'underworld.flip', icon: '🕵️', title: 'Two Agents at Your Door', text: `Federal agents know about your role in ${o.name}. They say they can help you — if you help them. Nobody ever has to know.`, options: [
      { id: 'flip', label: '🐀 Become an informant', tone: 'danger', hint: 'Protection from the case; death if discovered' },
      { id: 'refuse', label: '🤐 Say nothing and call your lawyer' },
    ] });
    return;
  }
  if (stage >= 3) {
    // Indictments: the case sweeps up members; leaders are its target.
    const exposure = clamp(0.25 + me.rank * 0.12 - me.crew.length * 0.02 - (me.informant ? 1 : 0), 0, 0.85);
    o.task = null;
    o.heat = Math.round(o.heat * 0.4);
    o.strength = Math.max(5, o.strength - rng.int(10, 25));
    ctx.log(`Dawn raids: a racketeering indictment named dozens of members of ${o.name}.`, '🚨', 'bad');
    if (!rng.chance(exposure)) return void (me.informant ? ctx.log('Your name wasn\'t on the indictment. Your handler made sure of it.', '🐀', 'warn') : ctx.log('Your name wasn\'t on it. This time.', '😮‍💨', 'good'));
    ctx.prompt({ type: 'underworld.indicted', icon: '⚖️', title: 'Indicted', text: `You're named in a racketeering indictment against ${o.name}. Prosecutors are offering a deal for testimony.`, options: [
      { id: 'fight', label: '⚖️ Fight it in court', hint: 'Omertà' },
      { id: 'cooperate', label: '🐀 Cooperate and testify', tone: 'danger', hint: 'Witness protection; a new life' },
      { id: 'run', label: '🏃 Run', tone: 'danger' },
    ] });
  }
}

/** Testify: witness protection, a new name in a new city; the outfit marks you. */
function witsec(ctx) {
  const { state, rng } = ctx;
  const me = meOf(state);
  const o = outfitOf(state);
  me.witsec = true;
  me.marked = true;
  me.informant = true;
  state.underworld.witsec = true;
  if (state.career.job) leaveJob(ctx, 'Entered witness protection');
  const others = regionsHere(state).filter((r) => r.id !== state.character.regionId);
  const old = `${state.character.firstName} ${state.character.lastName}`;
  setNameCountry(state.character.countryId ?? 'US');
  const alias = randomName(rng, state.character.gender);
  state.character.lastName = alias.lastName;
  if (others.length) changeRegion(ctx, rng.pick(others).id, 'The marshals moved you at night.');
  if (o) { o.strength = Math.max(5, o.strength - rng.int(15, 30)); o.heat = Math.max(0, o.heat - 20); }
  ctx.log(`You testified against ${o?.name ?? 'the outfit'}. ${old} no longer exists: you're ${state.character.firstName} ${alias.lastName} now, in a city where nobody knows you, with a new history the marshals wrote.`, '🪪', 'milestone');
}

/** The other side of the law: police, agents and prosecutors build cases against the city's outfits — or go on the pad. */
const LAW_JOBS = ['police', 'statePolice', 'sheriff', 'fbi', 'dea', 'atf', 'prosecution', 'investigator'];
function lawYear(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job || !LAW_JOBS.includes(job.professionId) || meOf(state)?.outfitId && !meOf(state).left) return;
  const targets = outfitsHere(state).filter((o) => !o.dissolved);
  if (!targets.length || state.prompts.some((p) => p.type === 'underworld.case') || !rng.chance(0.3)) return;
  const o = rng.pick(targets);
  ctx.prompt({ type: 'underworld.case', icon: '🗂️', title: `The ${o.name} Case`, text: `Your unit has a lead on ${o.name}: a ${OUTFIT_TYPES[o.type].label} that runs ${o.territory}% of the city's rackets. Someone from their side has also let you know an envelope is available if the lead goes nowhere.`, options: [
    { id: 'build', label: '🧩 Build the case', hint: 'Wiretaps, informants, years of work' },
    { id: 'pad', label: '💵 Take the envelope', tone: 'danger', hint: 'Money; a corruption case if caught' },
    { id: 'pass', label: '📁 Hand it to another unit' },
  ], data: { outfitId: o.id } });
}

/** Prison gangs: the local outfit runs the tier, and offers protection. */
function prisonYear(ctx) {
  const { state, rng } = ctx;
  if (!state.legal.incarceration || meOf(state) || state.character.age < 18 || state.prompts.some((p) => p.type === 'underworld.prison') || !rng.chance(0.25)) return;
  const o = rng.pick(outfitsHere(state, rng));
  if (!o) return;
  ctx.prompt({ type: 'underworld.prison', icon: '⛓️', title: 'Who Runs the Tier', text: `Men from ${o.name} run your tier. They offer protection — and expect loyalty, inside and out.`, options: [
    { id: 'join', label: '🤝 Accept their protection', tone: 'danger', hint: 'You\'re one of theirs now' },
    { id: 'alone', label: '🧍 Do your own time', hint: 'Risky' },
  ], data: { outfitId: o.id } });
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const UnderworldModule = {
  id: 'underworld',
  order: 61.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive || state.character.age < 16) return;
    // The city's underworld runs on its own stream, so it doesn't reshuffle the rest of a life.
    const rng = new Random(((state.world?.seed ?? 1) * 6007 + currentYear(state) * 389 + 0x0c) >>> 0);
    const side = { ...ctx, rng };
    outfitsHere(state, rng);
    worldYear(side);
    myYear(ctx);
    lawYear(ctx);
    prisonYear(ctx);
  },
  actions: {
    /** Get close to an outfit in your city (arg: outfit id). */
    approach(ctx, outfitId) {
      const { state, rng } = ctx;
      outfitsHere(state, rng);
      const check = approachCheck(state, outfitId);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'underworld.approach');
      const o = state.underworld.outfits[outfitId];
      if (!rng.chance(check.odds)) return ctx.log(`You hung around ${o.name}'s places for months. They never let you in.`, OUTFIT_TYPES[o.type].icon, 'info');
      state.underworld.me = { outfitId, rank: 0, respect: 10, trust: 50, rackets: [], skim: 0, crew: [], dirty: 0, made: false, joinedAge: state.character.age, history: [] };
      return ctx.log(`${o.name} took you on as a ${rankTitle(o, 0).toLowerCase()}. You run errands, keep your mouth shut, and wait to be noticed.`, OUTFIT_TYPES[o.type].icon, 'milestone');
    },
    /** Take on a racket (members and up). */
    racket(ctx, id) {
      const { state } = ctx;
      const me = meOf(state);
      const o = outfitOf(state);
      const r = RACKETS[id];
      if (!me || !o || !r || me.witsec || me.left) return ctx.toast('Not available', 'warn');
      if (me.rank < Math.max(1, r.rank)) return ctx.toast(`${rankTitle(o, Math.max(1, r.rank))} and up`, 'warn');
      if (me.rackets.includes(id)) { me.rackets = me.rackets.filter((x) => x !== id); return ctx.log(`You handed ${r.label.toLowerCase()} to someone else.`, r.icon, 'info'); }
      if (me.rackets.length >= me.rank + 1) return ctx.toast(`${me.rank + 1} rackets at your rank`, 'warn');
      me.rackets.push(id);
      return ctx.log(`You took over ${r.label.toLowerCase()} for ${o.name}.`, r.icon, 'info');
    },
    /** How much of the take you kick up. */
    skim(ctx, pct) {
      const me = meOf(ctx.state);
      if (!me || !(String(pct) in SKIM)) return undefined;
      me.skim = Number(pct);
      return ctx.toast(SKIM[pct], 'info');
    },
    /** Recruit someone for your crew (capo and up). */
    recruit(ctx) {
      const { state, rng } = ctx;
      const me = meOf(state);
      const o = outfitOf(state);
      if (!me || !o || me.rank < 2) return ctx.toast('Capos and up run crews', 'warn');
      if (me.crew.length >= MAX_CREW[me.rank]) return ctx.toast('Your crew is full', 'warn');
      if (yearlyCount(state, 'underworld.recruit') >= 2) return ctx.toast('Twice a year', 'warn');
      bumpYearly(state, 'underworld.recruit');
      const n = randomName(rng, rng.chance(0.85) ? 'male' : 'female');
      me.crew.push({ name: `${n.firstName} ${n.lastName}`, loyalty: rng.int(30, 90), skill: rng.int(30, 90) });
      return ctx.log(`${n.firstName} ${n.lastName} joined your crew.`, '🤝', 'info');
    },
    /** Wash dirty money through your own business. */
    launder(ctx) {
      const { state, rng } = ctx;
      const me = meOf(state);
      const biz = state.business?.current;
      if (!me?.dirty) return ctx.toast('No dirty money', 'warn');
      if (!biz) return ctx.toast('You need a business of your own to wash it through', 'warn');
      if (yearlyCount(state, 'underworld.launder')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'underworld.launder');
      const amount = Math.min(me.dirty, Math.max(50000, Math.round((biz.lastYear?.revenue ?? 200000) * 0.3)));
      me.dirty -= amount;
      me.laundered = (me.laundered ?? 0) + amount;
      if (rng.chance(0.08)) commitOffense(ctx, { offenseId: 'moneyLaundering', context: `washing money through ${biz.name}`, discovery: 0.35, evidence: 0.6 });
      return ctx.log(`You ran $${amount.toLocaleString()} through ${biz.name}'s books: clean money, on paper.`, '🧺', 'info');
    },
    /** The boss's policy (boss only). */
    policy(ctx, id) {
      const me = meOf(ctx.state);
      const o = outfitOf(ctx.state);
      if (!me || !o || me.rank < 4 || !POLICIES[id]) return ctx.toast('The boss decides', 'warn');
      o.policy = id;
      return ctx.log(`${o.name} will ${id === 'legit' ? 'move into legitimate business' : id === 'expand' ? 'push into new territory' : 'consolidate what it has'}.`, '👑', 'info');
    },
    /** Pay an official to look away (boss and underboss). */
    corrupt(ctx) {
      const { state, rng } = ctx;
      const me = meOf(state);
      const o = outfitOf(state);
      if (!me || !o || me.rank < 3) return ctx.toast('Underbosses and bosses', 'warn');
      if (yearlyCount(state, 'underworld.corrupt')) return ctx.toast('Once a year', 'warn');
      if (!ctx.spend(100000, 'An envelope for a city official')) return ctx.toast('$100,000 in cash needed', 'warn');
      bumpYearly(state, 'underworld.corrupt');
      o.heat = Math.max(0, o.heat - 25);
      if (o.task && rng.chance(0.3)) { o.task = null; ctx.log('A detective was reassigned and a case went cold.', '🗂️', 'good'); }
      if (rng.chance(0.15)) commitOffense(ctx, { offenseId: 'bribery', context: 'paying a city official for protection', discovery: 0.4, evidence: 0.6 });
      return ctx.log('A friend in city hall will look the other way.', '💼', 'info');
    },
    /** A sit-down with a rival to end a war (capo and up). */
    sitDown(ctx) {
      const { state, rng } = ctx;
      const me = meOf(state);
      const o = outfitOf(state);
      if (!me || !o?.war || me.rank < 2) return ctx.toast('Capos and up, during a war', 'warn');
      if (yearlyCount(state, 'underworld.sitDown')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'underworld.sitDown');
      const rival = state.underworld.outfits[o.war];
      if (!rng.chance(clamp(0.3 + me.respect / 200 + me.rank * 0.05, 0.2, 0.85))) return ctx.log(`${rival?.name ?? 'The rivals'} didn't come to the table.`, '🍝', 'warn');
      o.war = null; if (rival) rival.war = null;
      me.respect = Math.min(100, me.respect + 8);
      return ctx.log(`Over dinner in a back room, you and ${rival?.name ?? 'the rivals'} divided the city again. The war is over.`, '🍝', 'good');
    },
    /** Ask to leave, or walk away. */
    leave(ctx) {
      const { state, rng } = ctx;
      const me = meOf(state);
      const o = outfitOf(state);
      if (!me || !o || me.left || me.witsec) return ctx.toast('Not with an outfit', 'warn');
      me.left = state.character.age;
      if (me.rank === 0) return ctx.log(`You stopped coming round ${o.name}'s places. Associates drift away all the time.`, '🚪', 'info');
      if (me.respect >= 60 && state.character.age >= 50 && rng.chance(0.7)) return ctx.log(`${o.boss} gave you his blessing to step back. You keep your silence; they keep their distance.`, '🕊️', 'good');
      me.marked = true;
      return ctx.log(`Nobody walks away from ${o.name}. You know they'll be looking for you.`, '🎯', 'bad');
    },
    /** Go to the feds yourself. */
    inform(ctx) {
      const me = meOf(ctx.state);
      if (!me || me.informant) return ctx.toast('Not available', 'warn');
      me.informant = true;
      return ctx.log('You called the FBI field office from a pay phone. You have a handler now, and a code name.', '🐀', 'warn');
    },
  },
  resolvers: {
    job(ctx, data, optionId) {
      const { state, rng } = ctx;
      const me = meOf(state);
      if (!me) return undefined;
      if (optionId === 'refuse') { me.trust = Math.max(0, me.trust - 8); return ctx.log('They noticed you weren\'t available.', '🫥', 'warn'); }
      me.respect = Math.min(100, me.respect + 8);
      me.trust = Math.min(100, me.trust + 5);
      if (rng.chance(0.15)) return commitOffense(ctx, { offenseId: rng.pick(['grandTheft', 'extortion', 'assault']), context: 'a job for the outfit', caught: true, evidence: 0.6 });
      return ctx.log('It was done. Nobody said thank you; the envelope said it for them.', '✉️', 'good');
    },
    war(ctx, data, optionId) {
      const { state, rng } = ctx;
      const me = meOf(state);
      if (!me) return undefined;
      if (optionId === 'low') { me.respect = Math.max(0, me.respect - 6); return ctx.log('You stayed home. Some called it wisdom.', '🫥', 'info'); }
      if (optionId === 'talk') return UnderworldModule.actions.sitDown(ctx);
      me.respect = Math.min(100, me.respect + 12);
      crimeOf(state).heat = clamp(crimeOf(state).heat + 20, 0, 100);
      if (rng.chance(0.12)) { ctx.log('You were shot in the retaliation.', '🔫', 'bad'); if (rng.chance(0.4)) return ctx.die('Killed in a gang war'); state.stats.health = Math.max(5, state.stats.health - 35); }
      commitOffense(ctx, { offenseId: rng.chance(0.3) ? 'felonyMurder' : 'assault', context: 'a gang war reprisal', discovery: 0.35, evidence: 0.55 });
      return ctx.log('You hit back. The street knows your name now.', '🔥', 'warn');
    },
    case(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = state.underworld?.outfits?.[data.outfitId];
      const job = state.career.job;
      if (!o || !job) return undefined;
      if (optionId === 'pass') return ctx.log(`You passed the ${o.name} lead to organised crime. They thanked you and buried it.`, '📁', 'info');
      if (optionId === 'pad') {
        const take = rng.int(10, 40) * 1000;
        ctx.earn(take, 'Undisclosed income');
        o.heat = Math.max(0, o.heat - 15);
        commitOffense(ctx, { offenseId: job.professionId === 'prosecution' ? 'publicCorruption' : 'bribery', context: `taking money from ${o.name}`, discovery: 0.3, evidence: 0.6 });
        return ctx.log(`You took $${take.toLocaleString()} and the lead went nowhere. You're on ${o.name}'s pad now.`, '💵', 'warn');
      }
      o.heat = Math.min(100, o.heat + 20);
      o.task ??= { stage: 0, since: state.character.age };
      o.task.stage += 1;
      job.performance = Math.min(100, (job.performance ?? 60) + 5);
      if (o.task.stage >= 3) {
        o.strength = Math.max(5, o.strength - rng.int(15, 30));
        o.task = null;
        return ctx.log(`Your case against ${o.name} ended in dawn raids and a racketeering indictment. The commissioner shook your hand at the press conference.`, '🚨', 'milestone');
      }
      return ctx.log(`You built the ${o.name} case another step: ${['surveillance', 'a wiretap order', 'an informant inside'][Math.min(2, o.task.stage - 1)]}.`, '🧩', 'good');
    },
    prison(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = state.underworld?.outfits?.[data.outfitId];
      if (!o) return undefined;
      if (optionId === 'join') {
        state.underworld.me = { outfitId: o.id, rank: 0, respect: 15, trust: 50, rackets: [], skim: 0, crew: [], dirty: 0, made: false, joinedAge: state.character.age, history: [], fromPrison: true };
        return ctx.log(`You did your time under ${o.name}'s protection. When you get out, they'll remember you.`, '🤝', 'warn');
      }
      if (rng.chance(0.35)) { ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) }); return ctx.log('You were jumped in the yard for turning them down. You survived it.', '🩸', 'bad'); }
      return ctx.log('You kept your head down and did your own time. They left you alone.', '🧍', 'info');
    },
    flip(ctx, data, optionId) {
      const me = meOf(ctx.state);
      if (!me) return undefined;
      if (optionId !== 'flip') return ctx.log('You said nothing. Your lawyer said you did the right thing.', '🤐', 'info');
      me.informant = true;
      return ctx.log('You signed a cooperation agreement in a hotel room. You have a handler now.', '🐀', 'warn');
    },
    indicted(ctx, data, optionId) {
      const { state, rng } = ctx;
      const me = meOf(state);
      const o = outfitOf(state);
      if (!me || !o) return undefined;
      if (optionId === 'cooperate') return witsec(ctx);
      if (optionId === 'run') {
        const others = regionsHere(state).filter((r) => r.id !== state.character.regionId);
        if (others.length) changeRegion(ctx, rng.pick(others).id, 'You left with a bag of cash and a borrowed car.');
        me.left = state.character.age;
        commitOffense(ctx, { offenseId: 'racketeering', context: `a federal warrant in the ${o.name} case`, discovery: 0.5, evidence: 0.75 });
        return ctx.log('You ran. You\'re a fugitive now.', '🏃', 'bad');
      }
      me.respect = Math.min(100, me.respect + 10);
      return commitOffense(ctx, { offenseId: 'racketeering', context: `the ${o.name} racketeering case`, caught: true, evidence: clamp(0.55 + me.rank * 0.05, 0.4, 0.85) });
    },
  },
};
