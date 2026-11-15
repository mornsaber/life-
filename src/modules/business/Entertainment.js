/**
 * Music and film of their day: a band, a record label, a film studio.
 *
 *   The band      form one with friends (14+): the music of the day (a brass band and the music
 *                 hall, jazz, skiffle and rock'n'roll, rock, punk, hip hop, dance), gigs that grow
 *                 a following, records on the format of the day (sheet music, 78s, singles and
 *                 LPs, cassettes and CDs, downloads, streams), a chart position, a record deal
 *                 if the labels notice — and the arguments, the split, the reunion tour.
 *   The label     sign acts and put out records. Hits pay; most don't. The payola scandal (1959),
 *                 piracy after Napster (1999), and streaming's slow money from 2008.
 *   The studio    from 1910: make a picture a year — low budget, mid, or a blockbuster (from 1975,
 *                 when Jaws invented the summer). The studio system owned the cinemas until the
 *                 Paramount decision (1948); television emptied them in the 1950s; streamers
 *                 buy films from 2015. Awards for the good ones.
 *
 * state.band = { name, genre, members: [names], following, records: [{ year, title, format, chart }], deal, split }
 * state.label = { name, acts: [{ name, genre, talent }], hits, since }
 * state.studio = { name, films: [{ year, title, budget, gross, award }], since }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName, addHonor } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { addBuzz } from '../life/Fame.js';
import { showResult } from '../life/ResultCards.js';

const local = (state, n) => Math.round(n * priceLevel(state));
const side = (state, salt) => new Random(((state.world?.seed ?? 9) * 31337 + state.character.age * 557 + salt) >>> 0);
const cc = (state) => state.character.countryId ?? 'US';

/** The music of the day. */
export function genreOf(y, c = 'US') {
  if (y < 1900) return 'a brass band and music-hall songs';
  if (y < 1920) return 'ragtime';
  if (y < 1946) return 'swing and jazz';
  if (y < 1955) return c === 'GB' ? 'skiffle' : 'rhythm and blues';
  if (y < 1964) return "rock'n'roll";
  if (y < 1976) return 'rock';
  if (y < 1984) return 'punk and new wave';
  if (y < 1995) return c === 'US' ? 'hip hop' : 'indie and rave';
  if (y < 2010) return 'pop-punk and R&B';
  return 'electronic and indie pop';
}
/** What a record is, by year. */
export function formatOf(y) {
  return y < 1900 ? 'sheet music' : y < 1949 ? 'a 78' : y < 1982 ? 'a single and an LP' : y < 2003 ? 'a cassette and a CD' : y < 2010 ? 'a download' : 'a release on the streaming services';
}
const TITLE = [['Midnight', 'Lonely', 'Electric', 'Golden', 'Broken', 'Summer', 'Northern', 'Velvet', 'Paper', 'Neon'], ['Heart', 'Road', 'Train', 'River', 'Rain', 'Girl', 'Boy', 'Dream', 'Town', 'Sky']];
const title = (rng) => `${rng.pick(TITLE[0])} ${rng.pick(TITLE[1])}`;
const chartWord = (n) => (n <= 1 ? 'Number one' : n <= 10 ? `Top ten (No. ${n})` : n <= 40 ? `No. ${n}` : 'Didn\'t chart');

/* ------------------------------------------------------------------ */
/* The band                                                            */
/* ------------------------------------------------------------------ */
function formBand(ctx) {
  const { state, rng } = ctx;
  if (state.band && !state.band.split) return ctx.toast('You already have a band', 'warn');
  if (state.character.age < 14) return ctx.toast('14+', 'warn');
  const y = yearNow(state);
  const members = [0, 1, 2].map(() => randomName(rng, rng.pick(['male', 'female'])).firstName);
  const name = rng.pick(['The', '']) + ` ${rng.pick(['Velvet', 'Midnight', 'Northern', 'Electric', 'Silver', 'Wild', 'Paper', 'Lucky'])} ${rng.pick(['Kings', 'Dogs', 'Sound', 'Rebels', 'Hearts', 'Society', 'Ghosts', 'Boys', 'Girls'])}`.trim();
  state.band = { name: name.trim(), genre: genreOf(y, cc(state)), members, following: 50, records: [], deal: null, split: false, since: y };
  return ctx.log(`You formed ${state.band.name} with ${members.join(', ')}: ${state.band.genre}, in ${y < 1950 ? 'the back room of a pub' : 'a garage'}.`, '🎸', 'milestone');
}
function gig(ctx) {
  const { state, rng } = ctx;
  const b = state.band;
  if (!b || b.split) return ctx.toast('No band', 'warn');
  if (yearlyCount(state, 'band.gig') >= 2) return ctx.toast('Twice a year', 'warn');
  bumpYearly(state, 'band.gig');
  const crowd = Math.round(b.following * rng.float(0.05, 0.25) + rng.int(10, 60));
  const gain = Math.round(crowd * (0.4 + state.stats.looks / 200 + state.stats.smarts / 400) * rng.float(0.6, 1.6));
  b.following += gain;
  ctx.earn(local(state, crowd * 2), `${b.name}: the door money`);
  ctx.stat('happiness', 4);
  return ctx.log(`${b.name} played to ${crowd.toLocaleString()} people${crowd > 200 ? ' — and they knew the words' : ''}. ${gain.toLocaleString()} new fans.`, '🎤', 'good');
}
function record(ctx) {
  const { state, rng } = ctx;
  const b = state.band;
  if (!b || b.split) return ctx.toast('No band', 'warn');
  if (yearlyCount(state, 'band.record')) return ctx.toast('One record a year', 'warn');
  bumpYearly(state, 'band.record');
  const y = yearNow(state);
  const cost = local(state, b.deal ? 0 : 2000);
  if (cost) ctx.spend(cost, `${b.name}: studio time`, { allowDebt: true });
  const push = b.deal ? 2.2 : 1;
  const score = Math.log10(Math.max(10, b.following)) * 18 * push + rng.int(-25, 25);
  const pos = clamp(Math.round(120 - score), 1, 100);
  const t = title(rng);
  b.records.push({ year: y, title: t, format: formatOf(y), chart: pos });
  b.following = Math.round(b.following * (pos <= 10 ? 2 : pos <= 40 ? 1.3 : 1.05));
  const pay = Math.round(local(state, pos <= 1 ? 400000 : pos <= 10 ? 120000 : pos <= 40 ? 25000 : 1500) * (b.deal ? 0.4 : 1) * (y < 1950 ? 0.3 : 1));
  ctx.earn(pay, `${b.name}: "${t}" royalties`);
  if (pos <= 10) addBuzz(state, pos <= 1 ? 25 : 10);
  showResult(ctx, { icon: '🎵', title: `"${t}" — ${b.name}`, big: chartWord(pos), sub: formatOf(y), tone: pos <= 40 ? 'good' : 'info', popup: pos <= 10 });
  return ctx.log(`${b.name} put out "${t}" as ${formatOf(y)}. ${chartWord(pos)}.`, '💿', pos <= 10 ? 'milestone' : pos <= 40 ? 'good' : 'info');
}
function bandYear(ctx) {
  const { state } = ctx;
  const b = state.band;
  if (!b || b.split) return;
  const rng = side(state, 0xba);
  b.following = Math.round(b.following * 0.92);
  if (state.prompts.some((p) => p.type?.startsWith('entertainment.'))) return;
  if (!b.deal && b.following > 5000 && rng.chance(0.3)) {
    ctx.prompt({ type: 'entertainment.deal', icon: '✍️', title: 'A Record Deal', text: `A man from a record company was at your last gig. He wants to sign ${b.name}: an advance, and the label's push behind every record — for most of the money.`,
      options: [{ id: 'sign', label: '✍️ Sign', hint: `About $${local(state, 50000).toLocaleString()} advance` }, { id: 'indie', label: '🎸 Stay independent' }] });
  } else if (rng.chance(0.08)) {
    ctx.prompt({ type: 'entertainment.fight', icon: '💥', title: 'Creative Differences', text: `${rng.pick(b.members)} wants to go in a different direction. Rehearsals have turned into shouting.`,
      options: [{ id: 'compromise', label: '🤝 Find a middle way' }, { id: 'fire', label: '🚪 Replace them' }, { id: 'split', label: '💔 Call it a day' }] });
  }
}

/* ------------------------------------------------------------------ */
/* The record label                                                    */
/* ------------------------------------------------------------------ */
function startLabel(ctx) {
  const { state, rng } = ctx;
  if (state.label) return ctx.toast('You already have a label', 'warn');
  if (yearNow(state) < 1900) return ctx.toast('No record industry yet', 'warn');
  const cost = local(state, 250000);
  if ((state.finances?.cash ?? 0) < cost) return ctx.toast(`Needs $${cost.toLocaleString()}`, 'warn');
  ctx.spend(cost, 'Starting a record label');
  state.label = { name: `${rng.pick(['Blue', 'Red', 'Golden', 'Factory', 'Island', 'Harbour', 'Mercury'])} ${rng.pick(['Records', 'Recordings', 'Sound', 'Music'])}`, acts: [], hits: 0, since: yearNow(state) };
  return ctx.log(`You founded ${state.label.name}.`, '💿', 'milestone');
}
function signAct(ctx) {
  const { state, rng } = ctx;
  const l = state.label;
  if (!l) return ctx.toast('No label', 'warn');
  if (l.acts.length >= 8) return ctx.toast('A full roster', 'warn');
  const cost = local(state, 40000);
  if ((state.finances?.cash ?? 0) < cost) return ctx.toast(`An advance costs $${cost.toLocaleString()}`, 'warn');
  ctx.spend(cost, 'An advance');
  const act = { name: `${rng.pick(['The', 'DJ', 'Little', 'Big', ''])} ${randomName(rng, rng.pick(['male', 'female'])).firstName} ${rng.pick(['& the Strangers', 'Experience', '', 'Band', 'Collective'])}`.replace(/\s+/g, ' ').trim(), genre: genreOf(yearNow(state), cc(state)), talent: rng.int(20, 95) };
  l.acts.push(act);
  return ctx.log(`${l.name} signed ${act.name} (${act.genre}).`, '✍️', 'info');
}
function labelYear(ctx) {
  const { state } = ctx;
  const l = state.label;
  if (!l) return;
  const rng = side(state, 0x1ab);
  const y = yearNow(state);
  // The money in records, by era: sheet music and 78s small; the LP and CD boom; piracy; streams.
  const era = y < 1950 ? 0.3 : y < 1999 ? 1 : y < 2008 ? 0.55 : 0.7;
  let net = -local(state, 60000);
  for (const a of l.acts) {
    const hit = rng.chance(a.talent / 400);
    const flop = rng.next();
    net += hit ? local(state, 2e6) * era : local(state, 20000) * flop * era;
    if (hit) { l.hits += 1; ctx.log(`${a.name} had a hit on ${l.name}.`, '🎵', 'good'); }
  }
  if (net >= 0) ctx.earn(Math.round(net), `${l.name}: the year`); else ctx.spend(Math.round(-net), `${l.name}: the year`, { allowDebt: true });
  if (y === 1959 && cc(state) === 'US' && l.acts.length && rng.chance(0.4)) ctx.log('The payola hearings: Congress wants to know who paid disc jockeys to play your records.', '📻', 'warn');
  if (y === 1999 && l.acts.length) ctx.log('Napster: your catalogue is on every student\'s computer, for free.', '💻', 'bad');
}

/* ------------------------------------------------------------------ */
/* The film studio                                                     */
/* ------------------------------------------------------------------ */
const BUDGETS = { low: { label: 'A low-budget picture', cost: 2e6, mult: [0.2, 6] }, mid: { label: 'A mid-budget picture', cost: 30e6, mult: [0.3, 3.5] }, blockbuster: { label: 'A blockbuster', cost: 180e6, mult: [0.2, 5], from: 1975 } };
export const budgetsNow = (state) => Object.entries(BUDGETS).filter(([, b]) => !(b.from > yearNow(state))).map(([id, b]) => ({ id, ...b, cost: local(state, b.cost * eraFilm(yearNow(state))) }));
/** Film money of its day (as a share of today's). */
const eraFilm = (y) => (y < 1930 ? 0.02 : y < 1960 ? 0.06 : y < 1980 ? 0.15 : y < 2000 ? 0.45 : 1);
function startStudio(ctx) {
  const { state, rng } = ctx;
  if (state.studio) return ctx.toast('You already have a studio', 'warn');
  if (yearNow(state) < 1910) return ctx.toast('No film industry yet', 'warn');
  const cost = local(state, 20e6 * eraFilm(yearNow(state)));
  if ((state.finances?.cash ?? 0) < cost) return ctx.toast(`Needs $${cost.toLocaleString()}`, 'warn');
  ctx.spend(cost, 'Founding a film studio');
  state.studio = { name: `${state.character.lastName} ${rng.pick(['Pictures', 'Studios', 'Films', 'Productions'])}`, films: [], since: yearNow(state) };
  return ctx.log(`You founded ${state.studio.name}.${yearNow(state) < 1948 ? ' In the studio system, you own the stars, the lots and the cinemas.' : ''}`, '🎬', 'milestone');
}
function makeFilm(ctx, kind) {
  const { state, rng } = ctx;
  const s = state.studio;
  if (!s) return ctx.toast('No studio', 'warn');
  if (yearlyCount(state, 'studio.film')) return ctx.toast('One picture a year', 'warn');
  const b = budgetsNow(state).find((x) => x.id === kind);
  if (!b) return ctx.toast('Not in this day', 'warn');
  if ((state.finances?.cash ?? 0) < b.cost) return ctx.toast(`Needs $${b.cost.toLocaleString()}`, 'warn');
  bumpYearly(state, 'studio.film');
  ctx.spend(b.cost, `${b.label}`);
  const y = yearNow(state);
  // The 1950s: television emptied the cinemas. From 2015 the streamers pay a floor.
  const tv = y >= 1950 && y < 1965 ? 0.7 : 1;
  const mult = rng.float(...b.mult) * tv * (y < 1948 ? 1.3 : 1);
  const gross = Math.round(b.cost * Math.max(y >= 2015 ? 0.8 : 0, mult));
  ctx.earn(gross, 'Box office');
  const t = `${rng.pick(['The', 'A', 'Return of the', 'Night of the', 'Last'])} ${rng.pick(['Stranger', 'Empire', 'Harbour', 'Detective', 'Monster', 'Heiress', 'Frontier', 'Storm'])}`;
  const award = kind !== 'blockbuster' && rng.chance(0.06) && y >= 1929;
  s.films = [...s.films.slice(-9), { year: y, title: t, budget: kind, gross, award }];
  if (award) addHonor(state, { id: `studio.award.${y}`, source: 'civil', name: `Best Picture: ${t}`, icon: '🏆', prestige: 25, precedence: 40, citation: `${s.name} won Best Picture for ${t}.` });
  if (mult >= 2) addBuzz(state, 8);
  showResult(ctx, { icon: '🎬', title: t, big: `${mult >= 1 ? '+' : ''}${Math.round((mult - 1) * 100)}%`, sub: `Box office $${gross.toLocaleString()}${award ? ' · Best Picture' : ''}`, tone: mult >= 1 ? 'good' : 'bad', popup: mult >= 2 || mult < 0.4 || award });
  return ctx.log(`${s.name} released ${t}. It took $${gross.toLocaleString()} on a $${b.cost.toLocaleString()} budget.${award ? ' And it won Best Picture.' : ''}`, '🎬', mult >= 1 ? 'good' : 'bad');
}
function studioYear(ctx) {
  const { state } = ctx;
  if (state.studio && yearNow(state) === 1948 && cc(state) === 'US') ctx.log('The Supreme Court\'s Paramount decision: the studios must sell their cinemas.', '⚖️', 'warn');
}

export const EntertainmentResolvers = {
  deal(ctx, _d, optionId) {
    const b = ctx.state.band;
    if (!b) return undefined;
    if (optionId === 'sign') { b.deal = { since: yearNow(ctx.state) }; ctx.earn(local(ctx.state, 50000), 'Record deal advance'); return ctx.log(`${b.name} signed a record deal.`, '✍️', 'milestone'); }
    return ctx.log(`${b.name} stayed independent.`, '🎸', 'info');
  },
  fight(ctx, _d, optionId) {
    const b = ctx.state.band;
    if (!b) return undefined;
    if (optionId === 'split') { b.split = true; return ctx.log(`${b.name} split up. The music papers called it the end of an era.`, '💔', 'warn'); }
    if (optionId === 'fire') { b.members[0] = randomName(ctx.rng, ctx.rng.pick(['male', 'female'])).firstName; b.following = Math.round(b.following * 0.85); return ctx.log('You replaced them. Some fans never forgave you.', '🚪', 'warn'); }
    return ctx.log('You found a middle way. The next record sounded like both of you.', '🤝', 'good');
  },
};

export const EntertainmentModule = {
  id: 'entertainment',
  order: 41.7,
  onAgeUp(ctx) { if (!ctx.state.character.alive) return; bandYear(ctx); labelYear(ctx); studioYear(ctx); },
  actions: {
    formBand, gig, record, startLabel, signAct, startStudio, makeFilm,
    reunion(ctx) {
      const { state } = ctx;
      const b = state.band;
      if (!b?.split) return ctx.toast('No split to undo', 'warn');
      if (yearNow(state) - (b.records.at(-1)?.year ?? b.since) < 10) return ctx.toast('Too soon for a reunion', 'warn');
      b.split = false;
      const pay = Math.round(local(state, 300000) * Math.log10(Math.max(10, b.following)) / 4);
      ctx.earn(pay, `${b.name}: the reunion tour`);
      addBuzz(state, 10);
      return ctx.log(`${b.name} reunited for a tour. Older, slower, louder.`, '🎸', 'milestone');
    },
  },
  resolvers: EntertainmentResolvers,
};
