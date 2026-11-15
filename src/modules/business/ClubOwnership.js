/**
 * Owning a sports club: the squad, the manager, the fans, the ground, the table.
 *
 *   What you can buy   the professional game of your country and its day: football clubs (from
 *                      1888 in England, 1900 elsewhere), with promotion and relegation through
 *                      four divisions; in America, franchises — baseball (1876), hockey (1917),
 *                      football (1920), basketball (1946), soccer (1996) — closed leagues, no
 *                      relegation; Canadian hockey; Indian cricket franchises (2008);
 *                      Australian rugby league (1908).
 *   Prices             club values of their day: small before television money, exploding from
 *                      the 1990s.
 *   The season         your strength (squad and manager) against the league: a table position,
 *                      promotion or relegation (or a title in a closed league), a cup run.
 *   Money              gate receipts from your ground, television money (from the 1960s, huge
 *                      from 1992), sponsors and prize money; wages and the manager to pay.
 *                      From 2011 UEFA's Financial Fair Play punishes big losses.
 *   The ground         own it, expand it, or lease it out to another club — a tenant whose lease
 *                      protects them: you can't sell the stadium from under them.
 *   The fans           happy with winning and cheap tickets; angry with relegation and greed.
 *   Selling            bids come in; or put the club up for sale.
 *
 * state.club = { name, sport, tier, squad, wages, manager: { name, rating, pay }, fans, ticket,
 *                stadium: { owned, capacity, tenant }, value, since, seasons: [...], ffp: [...] }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel, COUNTRIES } from '../world/Countries.js';
import { addBuzz } from '../life/Fame.js';
import { REGIONS } from '../life/Regions.js';
import { showResult } from '../life/ResultCards.js';

const local = (state, n) => Math.round(n * priceLevel(state));
const side = (state, salt) => new Random(((state.world?.seed ?? 5) * 40503 + state.character.age * 3011 + salt) >>> 0);
const cc = (state) => state.character.countryId ?? 'US';

/** The sports a club owner can buy into: where, from when, closed franchise or open pyramid, today's top value. */
export const CLUB_SPORTS = {
  football: { label: 'Football', icon: '⚽', where: (c) => !['US', 'CA', 'IN', 'AU'].includes(c), from: (c) => (c === 'GB' ? 1888 : 1900), franchise: false, top: 3e9, nick: ['City', 'United', 'Athletic', 'Rovers', 'Wanderers', 'Albion'] },
  soccer: { label: 'Soccer (MLS)', icon: '⚽', where: (c) => c === 'US', from: () => 1996, franchise: true, top: 6e8, nick: ['FC', 'SC', 'Galaxy', 'Fire'] },
  baseball: { label: 'Baseball', icon: '⚾', where: (c) => c === 'US', from: () => 1876, franchise: true, top: 2.5e9, nick: ['Pioneers', 'Clippers', 'Grays', 'Barons'] },
  gridiron: { label: 'American football', icon: '🏈', where: (c) => c === 'US', from: () => 1920, franchise: true, top: 5e9, nick: ['Steelmen', 'Mustangs', 'Bulldogs', 'Rangers'] },
  basketball: { label: 'Basketball', icon: '🏀', where: (c) => c === 'US', from: () => 1946, franchise: true, top: 3.5e9, nick: ['Hawks', 'Kings', 'Storm', 'Comets'] },
  hockey: { label: 'Ice hockey', icon: '🏒', where: (c) => ['US', 'CA'].includes(c), from: () => 1917, franchise: true, top: 1e9, nick: ['Blades', 'Huskies', 'Flyers', 'Wolves'] },
  cricket: { label: 'Cricket (franchise)', icon: '🏏', where: (c) => c === 'IN', from: () => 2008, franchise: true, top: 1.2e9, nick: ['Strikers', 'Royals', 'Titans', 'Chargers'] },
  rugbyLeague: { label: 'Rugby league', icon: '🏉', where: (c) => c === 'AU', from: () => 1908, franchise: false, top: 1.5e8, nick: ['Sea Eagles', 'Roosters', 'Rabbitohs', 'Tigers'] },
};
const PLACES = ['Northbridge', 'Ashford', 'Kingsport', 'Riverside', 'Westvale', 'Portmore', 'Eastham', 'Highcliffe', 'Millbrook', 'Stonebridge'];
/** Club values of their day, as a share of today's: before television, a club was a local business. */
const eraValue = (y) => (y < 1950 ? 0.01 : y < 1970 ? 0.025 : y < 1992 ? 0.06 : y < 2005 ? 0.2 : y < 2015 ? 0.5 : 1);
/** Television money: none before the 1960s, a trickle until 1992, then the flood. */
const tvMoney = (y) => (y < 1960 ? 0 : y < 1992 ? 0.04 : y < 2005 ? 0.4 : 1);
/** The divisions of an open pyramid, bottom to top (four); a franchise league has one. */
export function divisionName(state, sport, tier) {
  const y = yearNow(state);
  const c = cc(state);
  if (CLUB_SPORTS[sport]?.franchise) return { soccer: 'Major League Soccer', baseball: y < 1903 ? 'the National League' : 'the Major Leagues', gridiron: y < 1922 ? 'the American Professional Football Association' : 'the NFL', basketball: y < 1949 ? 'the BAA' : 'the NBA', hockey: 'the NHL', cricket: 'the Indian Premier League' }[sport] ?? 'the league';
  if (sport === 'rugbyLeague') return y < 1995 ? 'the New South Wales Rugby League' : 'the NRL';
  if (c === 'GB') return y >= 1992 ? ['League Two', 'League One', 'the Championship', 'the Premier League'][tier] : ['the Fourth Division', 'the Third Division', 'the Second Division', 'the First Division'][tier];
  const top = { ES: y >= 1929 ? 'La Liga' : null, IT: y >= 1929 ? 'Serie A' : null, DE: y >= 1963 ? 'the Bundesliga' : null, FR: y >= 2002 ? 'Ligue 1' : y >= 1932 ? 'Division 1' : null, BR: y >= 1971 ? 'the Brasileirão' : null, NL: y >= 1956 ? 'the Eredivisie' : null, PT: y >= 1934 ? 'the Primeira Liga' : null, AR: 'the Primera División' }[c];
  const country = COUNTRIES[c]?.name ?? 'the country';
  return tier === 3 ? top ?? `${country}'s top division` : `${country}'s ${['fourth', 'third', 'second'][tier]} division`;
}

export function sportsHere(state) {
  const y = yearNow(state);
  return Object.entries(CLUB_SPORTS).filter(([, s]) => s.where(cc(state)) && y >= s.from(cc(state))).map(([id, s]) => ({ id, ...s }));
}
/** What a club costs: a multiple of what it earns (closed franchises, with no relegation to fear, fetch far more). */
export function clubPrice(state, sport, tier) {
  const i = income(state, { sport, tier });
  return Math.max(local(state, 50000), Math.round((i.gate + i.tv + i.sponsor) * (CLUB_SPORTS[sport].franchise ? 8 : 3)));
}
const CAPACITY = [8000, 15000, 30000, 55000];
/**
 * A season's income: the gate (lower divisions charge far less), television money and sponsors.
 * Prize money and tenants come on top.
 */
export function income(state, { sport, tier, capacity = CAPACITY[tier], fans = 55, ticket = 'normal' }) {
  const y = yearNow(state);
  const s = CLUB_SPORTS[sport];
  const price = { low: 0.7, normal: 1, high: 1.4 }[ticket];
  const fill = clamp(0.45 + fans / 120 - (ticket === 'high' ? 0.12 : ticket === 'low' ? -0.08 : 0), 0.2, 1);
  const gate = Math.round(capacity * fill * 19 * local(state, 60) * [0.15, 0.3, 0.6, 1][tier] * price * eraValue(y));
  const tv = Math.round(s.top * [0.0003, 0.001, 0.008, 0.08][tier] * tvMoney(y) * priceLevel(state));
  const sponsor = Math.round(s.top * [0.0002, 0.0008, 0.004, 0.03][tier] * eraValue(y) * priceLevel(state));
  return { gate, tv, sponsor };
}
/** The wage bill a club of this level normally carries: most of what it earns (clubs rarely make much). */
const normalWages = (state, sport, tier) => { const i = income(state, { sport, tier }); return Math.round((i.gate + i.tv + i.sponsor) * 0.88); };

export function buyOptions(state) {
  return sportsHere(state).flatMap((s) => (s.franchise ? [3] : [0, 1, 2, 3]).map((tier) => ({ sport: s.id, tier, label: `${s.icon} ${s.franchise ? `A ${s.label.toLowerCase()} franchise` : `A club in ${divisionName(state, s.id, tier)}`}`, price: clubPrice(state, s.id, tier) })));
}

function buy(ctx, arg) {
  const { state, rng } = ctx;
  if (state.club) return ctx.toast('You already own a club', 'warn');
  if (state.character.age < 21) return ctx.toast('21+', 'warn');
  const [sport, t] = String(arg).split(':');
  const opt = buyOptions(state).find((o) => o.sport === sport && o.tier === Number(t));
  if (!opt) return ctx.toast('Not here, not now', 'warn');
  if ((state.finances?.cash ?? 0) < opt.price) return ctx.toast(`Needs $${opt.price.toLocaleString()}`, 'warn');
  ctx.spend(opt.price, 'Bought a club');
  const s = CLUB_SPORTS[sport];
  const town = (REGIONS[state.character.regionId]?.name ?? rng.pick(PLACES)).split(',')[0];
  const m = randomName(rng, 'male');
  state.club = {
    name: `${town} ${rng.pick(s.nick)}`, sport, tier: opt.tier, squad: rng.int(40, 60), wages: normalWages(state, sport, opt.tier),
    manager: { name: `${m.firstName} ${m.lastName}`, rating: rng.int(40, 65) }, fans: 55, ticket: 'normal',
    stadium: { owned: rng.chance(0.6), capacity: CAPACITY[opt.tier], tenant: null },
    value: opt.price, since: yearNow(state), seasons: [], losses: [],
  };
  addBuzz(state, 8);
  return ctx.log(`You bought ${state.club.name} for $${opt.price.toLocaleString()}. ${state.club.stadium.owned ? 'The ground came with it.' : 'They rent their ground.'}`, s.icon, 'milestone');
}

/** The season: where you finished, what came in and went out. */
function season(ctx) {
  const { state } = ctx;
  const c = state.club;
  if (!c) return;
  const rng = side(state, 0xc1b);
  const y = yearNow(state);
  const s = CLUB_SPORTS[c.sport];
  // The squad follows the wage bill (and decays a little each year).
  const norm = normalWages(state, c.sport, c.tier) || 1;
  const target = clamp(50 + 22 * Math.log2(Math.max(0.05, c.wages / norm)), 5, 99);
  c.squad = clamp(Math.round(c.squad + (target - c.squad) * 0.35 + rng.int(-4, 4)), 1, 99);
  const strength = c.squad * 0.65 + c.manager.rating * 0.35 + rng.int(-10, 10);
  const teams = s.franchise ? 30 : 20;
  let pos = 1;
  for (let i = 1; i < teams; i++) if (50 + rng.float(-1, 1) * 18 > strength) pos += 1;
  const div = divisionName(state, c.sport, c.tier);
  let note = '';
  if (s.franchise) {
    if (pos === 1 || (pos <= 4 && rng.chance(0.25))) { note = 'champions'; pos = 1; }
    else if (pos <= 12) note = 'playoffs';
  } else if (pos <= 3 && c.tier < 3) { note = 'promoted'; c.tier += 1; }
  else if (pos === 1) note = 'champions';
  else if (pos >= teams - 2 && c.tier > 0) { note = 'relegated'; c.tier -= 1; }
  const cup = !s.franchise && strength > 60 && rng.chance(0.08);
  // Money: the gate, television, sponsors, prize money — against wages and the manager.
  const inc = income(state, { sport: c.sport, tier: c.tier, capacity: c.stadium.capacity, fans: c.fans, ticket: c.ticket });
  const gate = inc.gate;
  const tv = inc.tv;
  const sponsor = Math.round(inc.sponsor * (note === 'champions' ? 1.5 : 1));
  const prize = note === 'champions' || cup ? Math.round(clubPrice(state, c.sport, c.tier) * 0.05) : 0;
  const tenant = c.stadium.tenant ? c.stadium.tenant.rent : 0;
  // The ground: upkeep if you own it, rent if you don't.
  const ground = Math.round(c.stadium.capacity * local(state, c.stadium.owned ? 15 : 45) * eraValue(y));
  const managerPay = Math.round(c.wages * 0.06);
  const revenue = gate + tv + sponsor + prize + tenant;
  const costs = c.wages + managerPay + ground;
  const net = revenue - costs;
  if (net >= 0) ctx.earn(net, `${c.name}: profit`); else ctx.spend(-net, `${c.name}: losses`, { allowDebt: true });
  // Fans and value.
  c.fans = clamp(c.fans + (note === 'champions' ? 20 : note === 'promoted' ? 15 : note === 'relegated' ? -25 : pos <= teams / 4 ? 6 : pos >= teams * 0.75 ? -8 : 0) + (c.ticket === 'high' ? -6 : c.ticket === 'low' ? 4 : 0) + (cup ? 10 : 0), 0, 100);
  c.value = Math.round(clubPrice(state, c.sport, c.tier) * (0.8 + c.squad / 200 + c.fans / 300) * (c.stadium.owned ? 1.15 : 1));
  c.seasons = [...c.seasons.slice(-9), { year: y, pos, of: teams, div, note, cup, net }];
  c.losses = [...(c.losses ?? []).slice(-2), net];
  if (note === 'champions' || cup) addBuzz(state, note === 'champions' ? 10 : 5);
  showResult(ctx, { icon: s.icon, title: `${c.name}, ${y}`, big: ordinal(pos), sub: `${div}${note ? ` · ${note}` : ''}${cup ? ' · cup winners' : ''}`, tone: ['champions', 'promoted'].includes(note) || cup ? 'good' : note === 'relegated' ? 'bad' : 'info', popup: Boolean(note && note !== 'playoffs') || cup });
  ctx.log(`${c.name} finished ${ordinal(pos)} of ${teams} in ${div}${note === 'promoted' ? ' — promoted!' : note === 'relegated' ? ' — relegated.' : note === 'champions' ? ' — champions!' : note === 'playoffs' ? ', and made the playoffs' : ''}${cup ? ' And they won the cup.' : ''} The club ${net >= 0 ? `made $${net.toLocaleString()}` : `lost $${(-net).toLocaleString()}`}.`, s.icon, note === 'champions' || note === 'promoted' || cup ? 'milestone' : note === 'relegated' ? 'bad' : 'info');
  // Financial Fair Play (European football, from 2011): three years of big losses.
  if (!s.franchise && y >= 2011 && c.tier === 3 && c.losses.length === 3 && c.losses.reduce((a, b) => a + b, 0) < -clubPrice(state, c.sport, c.tier) * 0.1 && rng.chance(0.5)) {
    ctx.spend(Math.round(clubPrice(state, c.sport, c.tier) * 0.02), 'Financial Fair Play fine', { allowDebt: true });
    c.fans = clamp(c.fans - 10, 0, 100);
    ctx.log(`UEFA fined ${c.name} for breaking Financial Fair Play and banned them from Europe for a season.`, '⚖️', 'bad');
  }
  if (state.prompts.some((p) => p.type?.startsWith('clubOwnership.'))) return;
  if (c.fans < 20) {
    ctx.prompt({ type: 'clubOwnership.protest', icon: '📣', title: 'The Fans Turn', text: `Banners reading "${state.character.lastName.toUpperCase()} OUT" hang from the stand at ${c.name}.`,
      options: [{ id: 'listen', label: '🎟️ Cut ticket prices and meet the supporters' }, { id: 'ignore', label: '🙉 Ignore them' }, { id: 'sell', label: '🤝 Sell up' }] });
  } else if (rng.chance(0.08)) {
    const bid = Math.round(c.value * rng.float(1.05, 1.5));
    ctx.prompt({ type: 'clubOwnership.bid', icon: '💰', title: 'A Takeover Bid', text: `A ${rng.pick(['private equity firm', 'sovereign wealth fund', 'tech billionaire', 'consortium of local businessmen'])} offers $${bid.toLocaleString()} for ${c.name}.`, data: { bid },
      options: [{ id: 'accept', label: '🤝 Accept' }, { id: 'refuse', label: '🙅 Not for sale' }] });
  } else if (c.stadium.owned && !c.stadium.tenant && rng.chance(0.06)) {
    const rent = Math.round(c.stadium.capacity * local(state, 25) * eraValue(y));
    ctx.prompt({ type: 'clubOwnership.tenant', icon: '🏟️', title: 'A Tenant for the Ground', text: `${rng.pick(PLACES)} ${rng.pick(['Ladies FC', 'RFC', 'Rugby League', 'Reserves'])} want to lease your ground for their home games: $${rent.toLocaleString()} a year for five years. While they're tenants, you can't sell the stadium from under them.`, data: { rent },
      options: [{ id: 'lease', label: '✍️ Sign the lease' }, { id: 'no', label: '🙅 Keep it to yourselves' }] });
  }
  if (c.stadium.tenant) {
    c.stadium.tenant.years -= 1;
    if (c.stadium.tenant.years <= 0) { ctx.log(`${c.stadium.tenant.name}'s lease at your ground ended.`, '🏟️'); c.stadium.tenant = null; }
  }
}
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;

function sell(ctx, price) {
  const { state } = ctx;
  const c = state.club;
  if (!c) return;
  if (c.stadium.tenant && c.stadium.owned) {
    // The ground is leased: a buyer takes the club, the stadium stays with you until the lease ends.
    ctx.earn(Math.round((price ?? c.value) / 1.15), `Sold ${c.name} (the leased ground stays with you)`);
    state.club = null;
    return ctx.log(`You sold ${c.name}. The ground is leased to a tenant club, so it couldn't go with the sale.`, '🤝', 'milestone');
  }
  ctx.earn(price ?? c.value, `Sold ${c.name}`);
  state.club = null;
  return ctx.log(`You sold ${c.name} for $${(price ?? c.value).toLocaleString()}.`, '🤝', 'milestone');
}

export const ClubOwnershipResolvers = {
  protest(ctx, _d, optionId) {
    const c = ctx.state.club;
    if (!c) return undefined;
    if (optionId === 'sell') return sell(ctx);
    if (optionId === 'listen') { c.ticket = 'low'; c.fans = clamp(c.fans + 15, 0, 100); return ctx.log('You cut ticket prices and sat down with the supporters\' trust. The banners came down.', '🎟️', 'good'); }
    c.fans = clamp(c.fans - 5, 0, 100);
    return ctx.log('You ignored the protests. They got louder.', '🙉', 'warn');
  },
  bid(ctx, data, optionId) {
    if (optionId === 'accept') return sell(ctx, data.bid);
    return ctx.log(`You turned the bid down. ${ctx.state.club?.name ?? 'The club'} is not for sale.`, '🙅', 'info');
  },
  tenant(ctx, data, optionId) {
    const c = ctx.state.club;
    if (!c || optionId !== 'lease') return ctx.log('You kept the ground to yourselves.', '🏟️');
    c.stadium.tenant = { name: 'the tenant club', rent: data.rent, years: 5 };
    return ctx.log(`You leased the ground: $${data.rent.toLocaleString()} a year for five years.`, '🏟️', 'good');
  },
};

export const ClubOwnershipModule = {
  id: 'clubOwnership',
  order: 41.5,
  onAgeUp(ctx) { if (ctx.state.character.alive) season(ctx); },
  actions: {
    buy,
    sell: (ctx) => sell(ctx),
    wages(ctx, dir) {
      const c = ctx.state.club;
      if (!c) return undefined;
      c.wages = Math.max(1000, Math.round(c.wages * (dir === 'up' ? 1.25 : 0.8)));
      return ctx.log(`${dir === 'up' ? 'You raised' : 'You cut'} the wage budget at ${c.name} to $${c.wages.toLocaleString()} a year.`, '💷', 'info');
    },
    sign(ctx) {
      const { state, rng } = ctx;
      const c = state.club;
      if (!c) return undefined;
      if (yearlyCount(state, 'club.sign')) return ctx.toast('One big signing a year', 'warn');
      const fee = Math.round(c.wages * 0.4);
      if ((state.finances?.cash ?? 0) < fee) return ctx.toast(`A star costs $${fee.toLocaleString()}`, 'warn');
      bumpYearly(state, 'club.sign');
      ctx.spend(fee, 'Transfer fee');
      c.squad = clamp(c.squad + rng.int(4, 10), 0, 99);
      c.fans = clamp(c.fans + 6, 0, 100);
      return ctx.log(`${c.name} signed a star for $${fee.toLocaleString()}. Season tickets sold out by lunchtime.`, '✍️', 'good');
    },
    sellStar(ctx) {
      const { state, rng } = ctx;
      const c = state.club;
      if (!c) return undefined;
      if (yearlyCount(state, 'club.sellStar')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'club.sellStar');
      const fee = Math.round(c.wages * rng.float(0.2, 0.5));
      ctx.earn(fee, 'Transfer fee received');
      c.squad = clamp(c.squad - rng.int(4, 9), 1, 99);
      c.fans = clamp(c.fans - 6, 0, 100);
      return ctx.log(`You sold ${c.name}'s best player for $${fee.toLocaleString()}. The fans won't forget it.`, '💸', 'warn');
    },
    manager(ctx) {
      const { state, rng } = ctx;
      const c = state.club;
      if (!c) return undefined;
      if (yearlyCount(state, 'club.manager')) return ctx.toast('Once a season', 'warn');
      bumpYearly(state, 'club.manager');
      const old = c.manager.name;
      const m = randomName(rng, 'male');
      c.manager = { name: `${m.firstName} ${m.lastName}`, rating: clamp(rng.int(35, 80) + Math.round(Math.log2(Math.max(1, c.wages / (normalWages(state, c.sport, c.tier) || 1))) * 6), 10, 95) };
      ctx.spend(Math.round(c.wages * 0.05), 'Compensation for the sacked manager', { allowDebt: true });
      return ctx.log(`You sacked ${old}. ${c.manager.name} is the new ${CLUB_SPORTS[c.sport].franchise ? 'head coach' : 'manager'}.`, '🧑‍💼', 'info');
    },
    ticket(ctx, level) {
      const c = ctx.state.club;
      if (!c || !['low', 'normal', 'high'].includes(level)) return undefined;
      c.ticket = level;
      return ctx.log(`Ticket prices at ${c.name}: ${level}.`, '🎟️', 'info');
    },
    expand(ctx) {
      const { state } = ctx;
      const c = state.club;
      if (!c) return undefined;
      if (!c.stadium.owned) {
        const cost = Math.round(c.stadium.capacity * local(state, 2500) * eraValue(yearNow(state)) * 4);
        if ((state.finances?.cash ?? 0) < cost) return ctx.toast(`Buying the ground costs $${cost.toLocaleString()}`, 'warn');
        ctx.spend(cost, 'Bought the stadium');
        c.stadium.owned = true;
        return ctx.log(`You bought ${c.name}'s ground from its landlord.`, '🏟️', 'good');
      }
      const add = Math.round(c.stadium.capacity * 0.3);
      const cost = Math.round(add * local(state, 6000) * eraValue(yearNow(state)) * 4);
      if ((state.finances?.cash ?? 0) < cost) return ctx.toast(`Expanding costs $${cost.toLocaleString()}`, 'warn');
      ctx.spend(cost, 'Stadium expansion');
      c.stadium.capacity += add;
      return ctx.log(`A new stand: ${c.name}'s ground now holds ${c.stadium.capacity.toLocaleString()}.`, '🏗️', 'good');
    },
  },
  resolvers: ClubOwnershipResolvers,
};
