/**
 * High society: the rich and the titled, their calendar, their clubs and their toys.
 *
 *   Getting in     a fortune (or a title) brings the invitations. Old money — a title, a seat,
 *                  inherited wealth — starts higher; new money is snubbed, more so before the
 *                  1960s.
 *   The calendar   the events of the day where you live: the London Season and presentation
 *                  at court (until 1958), Royal Ascot, Henley, Cowes, Glyndebourne (1934);
 *                  Mrs Astor's ball (until 1908) and a summer in Newport; the Kentucky Derby,
 *                  the Met Gala (1948); the Cannes festival (1946), the Monaco Grand Prix
 *                  (1929), the Arc; St Moritz, Davos (1971), the Venice Biennale; and charity
 *                  galas everywhere. Each costs money and raises your standing — or doesn't.
 *   Clubs          the gentlemen's clubs of London and New York, where a single blackball
 *                  keeps you out; women's clubs where the men's were closed to them.
 *   Toys           a yacht, a private jet (from the 1960s), racehorses (and the big race),
 *                  an art collection bought at auction.
 *   Giving         a foundation in your name, a hospital wing.
 *   The papers     gossip columns: a rival, a snub, a story about you.
 *
 * state.society = { standing, oldMoney, attended: { [year]: [ids] }, clubs: [ids], yacht, jet,
 *                   horses, art, foundation, rival }
 */
import { Random, clamp } from '../../core/Random.js';
import { netWorth, yearlyCount, bumpYearly, randomName, addHonor } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { addBuzz } from './Fame.js';
import { rep } from './Reputation.js';
import { showResult } from './ResultCards.js';

const local = (state, n) => Math.round(n * priceLevel(state));
const cc = (state) => state.character.countryId ?? 'US';
const side = (state, salt) => new Random(((state.world?.seed ?? 6) * 22091 + state.character.age * 4999 + salt) >>> 0);
const female = (state) => state.character.gender === 'female';

/** The events of the social calendar: where, when, what it costs (today's money), what it does. */
export const SOCIAL_EVENTS = {
  presentation: { label: 'Presentation at court', icon: '👑', where: ['GB'], from: 1800, until: 1958, cost: 15000, standing: 12, oldOnly: true, when: (s) => female(s) && s.character.age >= 17 && s.character.age <= 19, text: 'In white, with ostrich feathers, a curtsey to the sovereign: you are "out".' },
  season: { label: 'The London Season', icon: '🎩', where: ['GB'], from: 1800, until: 9999, cost: 40000, standing: 6, text: (y) => (y < 1958 ? 'Balls every night from May to July, and the mothers counting eligible sons.' : 'Ascot, Henley, Wimbledon, the Chelsea Flower Show: the summer Season.') },
  ascot: { label: 'Royal Ascot', icon: '🏇', where: ['GB'], from: 1800, until: 9999, cost: 8000, standing: 4, text: 'Morning dress, the Royal Enclosure, and a flutter on the Gold Cup.' },
  henley: { label: 'Henley Royal Regatta', icon: '🚣', where: ['GB'], from: 1839, until: 9999, cost: 3000, standing: 2, text: 'Blazers, Pimm\'s and the Grand Challenge Cup.' },
  cowes: { label: 'Cowes Week', icon: '⛵', where: ['GB'], from: 1826, until: 9999, cost: 12000, standing: 3, needs: 'yacht', text: 'Racing yachts off the Isle of Wight, and dinner at the Royal Yacht Squadron.' },
  glyndebourne: { label: 'Glyndebourne', icon: '🎼', where: ['GB'], from: 1934, until: 9999, cost: 2500, standing: 2, text: 'Opera in the country, black tie and a picnic on the lawn in the interval.' },
  astorBall: { label: 'Mrs Astor\'s ball', icon: '💃', where: ['US'], from: 1872, until: 1908, cost: 30000, standing: 12, oldOnly: true, text: 'The Four Hundred: everyone who matters in New York, and only them.' },
  newport: { label: 'A summer at Newport', icon: '🏰', where: ['US'], from: 1850, until: 9999, cost: 150000, standing: 6, text: (y) => (y < 1940 ? 'A "cottage" of seventy rooms, tennis at the Casino, balls on the lawn.' : 'Newport in summer: the old houses, the regattas, the old names.') },
  derby: { label: 'The Kentucky Derby', icon: '🌹', where: ['US'], from: 1875, until: 9999, cost: 10000, standing: 3, text: 'Hats, juleps, and Millionaires Row.' },
  metGala: { label: 'The Met Gala', icon: '👗', where: ['US'], from: 1948, until: 9999, cost: 50000, standing: 7, text: (y) => (y < 1995 ? 'The Costume Institute\'s benefit: a society dinner at the Metropolitan Museum.' : 'The red carpet at the Met: the most photographed party of the year.') },
  cannes: { label: 'The Cannes festival', icon: '🎬', where: ['FR', 'GB', 'US', 'IT', 'DE', 'ES'], from: 1946, until: 9999, cost: 40000, standing: 4, text: 'The Croisette, the yachts, the parties after the premieres.' },
  monaco: { label: 'The Monaco Grand Prix', icon: '🏎️', where: ['FR', 'GB', 'IT', 'DE', 'US', 'MC', 'CH', 'ES'], from: 1929, until: 9999, cost: 60000, standing: 5, text: 'Watching the race from a yacht in the harbour.' },
  arc: { label: 'The Prix de l\'Arc de Triomphe', icon: '🐎', where: ['FR'], from: 1920, until: 9999, cost: 8000, standing: 3, text: 'Longchamp in October: the richest race in Europe.' },
  stMoritz: { label: 'A winter in St Moritz', icon: '⛷️', where: null, from: 1864, until: 9999, cost: 60000, standing: 4, text: (y) => (y < 1930 ? 'The Cresta Run, the Kulm Hotel, and the English milords on toboggans.' : 'Skiing, the polo on the frozen lake, and Badrutt\'s Palace.') },
  davos: { label: 'Davos', icon: '🏔️', where: null, from: 1971, until: 9999, cost: 80000, standing: 4, minWorth: 1e8, text: 'The World Economic Forum: presidents and chief executives in snow boots.' },
  biennale: { label: 'The Venice Biennale', icon: '🖼️', where: null, from: 1895, until: 9999, every: 2, cost: 25000, standing: 3, text: 'Art, palazzi and parties along the Grand Canal.' },
  gala: { label: 'A charity gala', icon: '🥂', where: null, from: 1850, until: 9999, cost: 20000, standing: 3, text: 'A table at the charity ball: speeches, an auction, and photographs for the society pages.' },
};
/** Clubs: [where, from, who may join (until women were admitted)]. */
export const CLUBS = {
  whites: { label: 'White\'s', icon: '🎩', where: 'GB', from: 1693, menOnly: true, bar: 75, text: 'The oldest club in St James\'s: Tories, dukes and a betting book.' },
  athenaeum: { label: 'The Athenaeum', icon: '📚', where: 'GB', from: 1824, womenFrom: 2002, bar: 55, text: 'Bishops, judges and scientists, and a library to sleep in.' },
  reform: { label: 'The Reform Club', icon: '⚖️', where: 'GB', from: 1836, womenFrom: 1981, bar: 50, text: 'Founded for the Reformers of 1832; Phileas Fogg set out from here.' },
  uwc: { label: 'The University Women\'s Club', icon: '🎓', where: 'GB', from: 1886, womenOnly: true, bar: 35, text: 'A club of their own, in Mayfair, for women with degrees.' },
  knickerbocker: { label: 'The Knickerbocker Club', icon: '🗽', where: 'US', from: 1871, menOnly: true, bar: 75, text: 'Old New York, and very old money.' },
  union: { label: 'The Union Club', icon: '🏛️', where: 'US', from: 1836, womenFrom: 1990, bar: 60, text: 'The oldest club in New York.' },
  cosmopolitan: { label: 'The Cosmopolitan Club', icon: '🌹', where: 'US', from: 1909, womenOnly: true, bar: 40, text: 'New York\'s club for women in the arts and public life.' },
};
/** Toys of their day. */
export const LUXURIES = {
  yacht: { label: (y) => (y < 1880 ? 'A sailing yacht' : y < 1980 ? 'A motor yacht' : 'A superyacht'), icon: '🛥️', from: 1800, price: 12e6, upkeep: 0.1, standing: 6 },
  jet: { label: () => 'A private jet', icon: '🛩️', from: 1963, price: 25e6, upkeep: 0.08, standing: 5 },
  horse: { label: () => 'A racehorse', icon: '🐎', from: 1800, price: 500000, upkeep: 0.15, standing: 2 },
  art: { label: () => 'A painting at auction', icon: '🖼️', from: 1800, price: 3e6, upkeep: 0.005, standing: 2 },
};

export const societyOf = (state) => state.society ?? null;
const titled = (state) => Boolean(state.character.peerage || state.noble || state.royal);
/** Whether society knows you exist: a fortune, or a title. */
export function inSociety(state) {
  if (state.character.age < 17) return false;
  return titled(state) || netWorth(state) >= local(state, 10e6) || Boolean(state.society);
}
function ensure(state) {
  if (state.society) return state.society;
  const old = titled(state) || (state.inheritance?.received ?? 0) > local(state, 5e6);
  state.society = { standing: old ? 60 : 30, oldMoney: old, attended: {}, clubs: [], yacht: 0, jet: 0, horses: 0, art: [], foundation: null, rival: null };
  return state.society;
}

export function eventsNow(state) {
  const y = yearNow(state);
  const worth = netWorth(state);
  return Object.entries(SOCIAL_EVENTS).filter(([, e]) => y >= e.from && y < e.until && (!e.where || e.where.includes(cc(state))) && (!e.every || y % e.every === 1) && (!e.when || e.when(state)) && (!e.minWorth || worth >= local(state, e.minWorth)))
    .map(([id, e]) => ({ id, ...e, cost: local(state, e.cost), text: typeof e.text === 'function' ? e.text(y) : e.text }));
}
export function clubsNow(state) {
  const y = yearNow(state);
  return Object.entries(CLUBS).filter(([, c]) => c.where === cc(state) && y >= c.from).map(([id, c]) => {
    const closed = female(state) ? (c.menOnly || (c.womenFrom && y < c.womenFrom)) : c.womenOnly;
    return { id, ...c, closed: Boolean(closed) };
  });
}

function attend(ctx, id) {
  const { state } = ctx;
  if (!inSociety(state)) return ctx.toast('Nobody has invited you', 'warn');
  const s = ensure(state);
  const e = eventsNow(state).find((x) => x.id === id);
  if (!e) return ctx.toast('Not this year', 'warn');
  const y = yearNow(state);
  const done = (s.attended[y] ??= []);
  if (done.includes(id)) return ctx.toast('Already been this year', 'warn');
  if (e.needs === 'yacht' && !s.yacht) return ctx.toast('You need a yacht for that', 'warn');
  if (e.oldOnly && !s.oldMoney && s.standing < 70) return ctx.toast('Not for new money — not yet', 'warn');
  if ((state.finances?.cash ?? 0) < e.cost) return ctx.toast(`Needs $${e.cost.toLocaleString()}`, 'warn');
  done.push(id);
  ctx.spend(e.cost, e.label);
  const rng = side(state, 0x5c + done.length);
  // New money is looked down on — more so before the 1960s.
  const snub = !s.oldMoney && rng.chance(y < 1960 ? 0.3 : 0.12);
  s.standing = clamp(s.standing + (snub ? Math.ceil(e.standing / 3) : e.standing), 0, 100);
  ctx.stat('happiness', 3);
  ctx.log(`${e.label}. ${e.text}${snub ? ' A duchess looked straight through you: new money.' : ''}`, e.icon, snub ? 'warn' : 'good');
  if (rng.chance(0.2)) { rep(ctx, 'work', 3, 'contacts made in society'); ctx.log('You met someone useful there: a banker, a minister, a board chairman.', '🤝', 'good'); }
  if (rng.chance(0.08)) { addBuzz(state, 5); ctx.log('Your photograph was in the society pages the next morning.', '📸', 'info'); }
  return undefined;
}

function joinClub(ctx, id) {
  const { state } = ctx;
  if (!inSociety(state)) return ctx.toast('You need someone to propose you', 'warn');
  const s = ensure(state);
  const c = clubsNow(state).find((x) => x.id === id);
  if (!c) return ctx.toast('Not here', 'warn');
  if (c.closed) return ctx.toast(female(state) ? 'Members are men only' : 'Members are women only', 'warn');
  if (s.clubs.includes(id)) return ctx.toast('Already a member', 'warn');
  if (yearlyCount(state, `society.club.${id}`)) return ctx.toast('Wait a year before trying again', 'warn');
  bumpYearly(state, `society.club.${id}`);
  const rng = side(state, 0xc1);
  const odds = clamp(0.2 + (s.standing - c.bar) / 60 + (s.oldMoney ? 0.15 : 0), 0.03, 0.95);
  if (!rng.chance(odds)) {
    s.standing = clamp(s.standing - 3, 0, 100);
    return ctx.log(`You were put up for ${c.label} and blackballed. One black ball in the box is enough.`, '⚫', 'bad');
  }
  ctx.spend(local(state, 6000), `${c.label}: entrance fee`);
  s.clubs.push(id);
  s.standing = clamp(s.standing + 6, 0, 100);
  rep(ctx, 'work', 4, 'club membership');
  return ctx.log(`You were elected to ${c.label}. ${c.text}`, c.icon, 'good');
}

function buy(ctx, kind) {
  const { state, rng } = ctx;
  const l = LUXURIES[kind];
  const y = yearNow(state);
  if (!l || y < l.from) return ctx.toast('Not in this day', 'warn');
  const s = ensure(state);
  const price = local(state, l.price * (kind === 'art' ? rng.float(0.3, 3) : 1));
  if ((state.finances?.cash ?? 0) < price) return ctx.toast(`Needs $${price.toLocaleString()}`, 'warn');
  ctx.spend(price, l.label(y));
  if (kind === 'art') s.art.push({ name: `${rng.pick(['A landscape', 'A portrait', 'A still life', 'An abstract'])} by ${rng.pick(['a Dutch master', 'an Impressionist', 'a Victorian painter', 'a modern master', 'an old master'])}`, paid: price, value: price, year: y });
  else if (kind === 'horse') s.horses += 1;
  else s[kind] += 1;
  s.standing = clamp(s.standing + l.standing, 0, 100);
  return ctx.log(`You bought ${l.label(y).toLowerCase()} for $${price.toLocaleString()}.`, l.icon, 'milestone');
}

function foundation(ctx) {
  const { state, rng } = ctx;
  const s = ensure(state);
  const amount = Math.round(Math.max(0, state.finances.cash) * 0.2);
  if (amount < local(state, 1e6)) return ctx.toast('A foundation needs $1m+', 'warn');
  ctx.spend(amount, 'Endowing your foundation');
  const name = `the ${state.character.lastName} Foundation`;
  s.foundation = { name, endowment: (s.foundation?.endowment ?? 0) + amount };
  s.standing = clamp(s.standing + 8, 0, 100);
  rep(ctx, 'neighbourhood', 8, 'philanthropy');
  const wing = amount >= local(state, 20e6);
  if (wing) addHonor(state, { id: `society.wing.${yearNow(state)}`, source: 'civil', name: `The ${state.character.lastName} Wing`, icon: '🏥', prestige: 15, precedence: 50, citation: `A hospital wing named for your gift of $${amount.toLocaleString()}.` });
  return ctx.log(`You put $${amount.toLocaleString()} into ${name}.${wing ? ` The ${rng.pick(['children\'s hospital', 'city hospital', 'cancer centre'])} named its new wing after you.` : ''}`, '🎗️', 'milestone');
}

/** The year: upkeep, the big race, the art market, the gossip columns, standing fading if you stay away. */
function societyYear(ctx) {
  const { state } = ctx;
  const s = state.society;
  if (!s) return;
  const y = yearNow(state);
  const rng = side(state, 0x50c);
  const upkeep = local(state, s.yacht * LUXURIES.yacht.price * LUXURIES.yacht.upkeep + s.jet * LUXURIES.jet.price * LUXURIES.jet.upkeep + s.horses * LUXURIES.horse.price * LUXURIES.horse.upkeep);
  if (upkeep > 0) ctx.spend(upkeep, 'Crew, hangar and stables', { allowDebt: true });
  if (s.horses > 0 && rng.chance(0.15 + s.horses * 0.03)) {
    const race = cc(state) === 'GB' ? 'the Derby' : cc(state) === 'FR' ? 'the Arc' : cc(state) === 'US' ? 'the Kentucky Derby' : 'the big race';
    const purse = local(state, 1500000);
    ctx.earn(purse, `${race}: winner's purse`);
    s.standing = clamp(s.standing + 8, 0, 100);
    addBuzz(state, 6);
    ctx.log(`Your horse won ${race}. You led it into the winner's enclosure to the cheers of the crowd.`, '🏆', 'milestone');
    showResult(ctx, { icon: '🏆', title: race.replace(/^./, (x) => x.toUpperCase()), big: 'Winner', sub: `$${purse.toLocaleString()} purse`, tone: 'good' });
  }
  for (const a of s.art) a.value = Math.round(a.value * (1 + rng.float(-0.08, 0.14)));
  const went = (s.attended[y - 1] ?? []).length;
  if (!went) s.standing = clamp(s.standing - 3, 0, 100);
  for (const k of Object.keys(s.attended)) if (Number(k) < y - 2) delete s.attended[k];
  if (s.foundation) ctx.log(`${s.foundation.name} gave its grants for the year.`, '🎗️', 'info');
  if (!state.prompts.some((p) => p.type?.startsWith('highSociety.')) && rng.chance(0.12)) {
    const n = s.rival ?? (() => { const r = randomName(rng, rng.pick(['male', 'female'])); return `${r.firstName} ${r.lastName}`; })();
    s.rival = n;
    ctx.prompt({ type: 'highSociety.gossip', icon: '📰', title: 'The Gossip Columns', text: `${y < 1920 ? 'The society column' : 'A gossip columnist'} prints a sly item: ${n} says your ${rng.pick(['parties are vulgar', 'money is very new', 'paintings are fakes', 'yacht is smaller than it looks'])}.`,
      options: [{ id: 'rise', label: '😌 Rise above it' }, { id: 'retort', label: '🗡️ A cutting reply, in print' }, { id: 'outdo', label: '🎉 Throw a bigger party', hint: 'Expensive' }] });
  }
}

export const HighSocietyResolvers = {
  gossip(ctx, _d, optionId) {
    const { state, rng } = ctx;
    const s = ensure(state);
    if (optionId === 'rise') { s.standing = clamp(s.standing + 2, 0, 100); return ctx.log('You said nothing. People noticed that too.', '😌', 'good'); }
    if (optionId === 'retort') { const won = rng.chance(0.5); s.standing = clamp(s.standing + (won ? 4 : -4), 0, 100); return ctx.log(won ? 'Your reply was quoted at every dinner table for a month.' : 'Your reply made you look petty.', '🗡️', won ? 'good' : 'warn'); }
    ctx.spend(local(state, 300000), 'A party to end all parties', { allowDebt: true });
    s.standing = clamp(s.standing + 6, 0, 100);
    addBuzz(state, 4);
    return ctx.log('You threw the party of the year. Your rival was not invited.', '🎉', 'good');
  },
};

export const HighSocietyModule = {
  id: 'highSociety',
  order: 36,
  onAgeUp(ctx) { if (ctx.state.character.alive) societyYear(ctx); },
  actions: { attend, joinClub, buy, foundation, sellArt(ctx) {
    const { state } = ctx;
    const s = state.society;
    const a = s?.art?.shift();
    if (!a) return ctx.toast('No art to sell', 'warn');
    ctx.earn(a.value, `Sold ${a.name}`);
    return ctx.log(`${a.name} sold at auction for $${a.value.toLocaleString()} (you paid $${a.paid.toLocaleString()}).`, '🔨', a.value >= a.paid ? 'good' : 'warn');
  } },
  resolvers: HighSocietyResolvers,
};
