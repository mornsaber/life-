/**
 * International sport: playing for your country, the Olympics and the World Cups, and running
 * sport afterwards.
 *
 *   The national team   A professional good enough is called up: caps, the captaincy, and
 *                       the tournaments — the Summer Olympics (2028 Los Angeles, 2032
 *                       Brisbane), the football World Cup, the rugby and cricket World Cups.
 *                       An Olympic medal is an honour that stays on your record.
 *   Doping              The offer comes; most refuse. A positive test is a four-year ban, and
 *                       medals won while doping are taken back.
 *   Running sport       Former internationals sit on the national federation's board and may
 *                       become its president; Olympians and federation presidents can be
 *                       co-opted into the International Olympic Committee, and football
 *                       presidents elected to the FIFA Council. Members vote on who hosts the
 *                       Games or the World Cup — and bid committees bring gifts. Long IOC
 *                       service earns the Olympic Order.
 *
 * state.sport = { discipline, caps, captain, olympics: [], cups: [], doped, banUntil, federation, ioc, fifa }
 */
import { addHonor, currentYear, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { leaveJob } from './CareerEngine.js';
import { COUNTRIES } from '../world/Countries.js';

export const DISCIPLINES = {
  football: { label: '⚽ Football', cup: { name: 'FIFA World Cup', every: 2 }, olympic: false, strong: { BR: 1.5, AR: 1.5, FR: 1.5, DE: 1.3, ES: 1.4, GB: 1.2, IT: 1.2, NL: 1.2, PT: 1.2, MX: 0.8, US: 0.8, JP: 0.7, KR: 0.7 } },
  athletics: { label: '🏃 Athletics', olympic: true, strong: { US: 1.6, KE: 1.5, JM: 1.5, ET: 1.3, GB: 1.0, CN: 0.9, JP: 0.8, AU: 0.9, FR: 0.8, DE: 0.8 } },
  swimming: { label: '🏊 Swimming', olympic: true, strong: { US: 1.8, AU: 1.6, CN: 1.2, GB: 1.1, CA: 1.0, JP: 0.9, FR: 0.9, IT: 0.9, NL: 0.8 } },
  rowing: { label: '🚣 Rowing', olympic: true, strong: { GB: 1.5, NZ: 1.4, NL: 1.3, AU: 1.2, DE: 1.2, US: 1.0, IE: 1.0, CN: 0.9 } },
  cycling: { label: '🚴 Cycling', olympic: true, strong: { GB: 1.4, NL: 1.5, FR: 1.2, AU: 1.1, DE: 1.1, IT: 1.0, NZ: 0.9, US: 0.8 } },
  basketball: { label: '🏀 Basketball', cup: { name: 'FIBA Basketball World Cup', every: 3 }, olympic: true, strong: { US: 2.0, FR: 1.0, ES: 1.0, AU: 0.9, DE: 0.9 } },
  rugby: { label: '🏉 Rugby union', cup: { name: 'Rugby World Cup', every: 3 }, olympic: false, strong: { NZ: 1.6, ZA: 1.6, IE: 1.3, FR: 1.3, GB: 1.2, AU: 1.1, AR: 0.9, JP: 0.6 } },
  cricket: { label: '🏏 Cricket', cup: { name: 'ICC Cricket World Cup', every: 3 }, olympic: false, strong: { IN: 1.6, AU: 1.6, GB: 1.2, NZ: 1.1, ZA: 1.1, PK: 1.0 } },
};
const HOSTS = { 2028: 'Los Angeles', 2032: 'Brisbane' };
const ACTIVE = ['minor', 'pro', 'starter', 'allStar'];
const LEVEL_BASE = { minor: 45, pro: 60, starter: 72, allStar: 85 };

const sp = (state) => (state.sport ??= { discipline: null, caps: 0, captain: false, olympics: [], cups: [], doped: false, banUntil: null, federation: null, ioc: null, fifa: null });
const here = (state) => state.character.countryId ?? 'US';
export const activeAthlete = (state) => state.career.job?.professionId === 'athletics' && ACTIVE.includes(state.career.job.levelId);
export const olympian = (state) => (state.sport?.olympics ?? []).length > 0;
export const international = (state) => (state.sport?.caps ?? 0) >= 10 || olympian(state);

function pickDiscipline(state, rng) {
  const cc = here(state);
  const weights = Object.entries(DISCIPLINES).map(([id, d]) => [id, (d.strong[cc] ?? 0.4) + (id === 'football' ? 1 : 0)]);
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [id, w] of weights) { r -= w; if (r <= 0) return id; }
  return 'football';
}

/** How good you are this year (0–100). */
export function rating(state) {
  const job = state.career.job;
  const s = state.sport;
  const age = state.character.age;
  const base = LEVEL_BASE[job?.levelId] ?? 40;
  const agePenalty = Math.max(0, age - 30) * 3 + Math.max(0, 21 - age) * 2;
  return Math.round(clamp(base + (state.stats.fitness - 75) / 2 - agePenalty + (s?.doped ? 8 : 0), 0, 100));
}

function medal(ctx, { place, event, year, discipline }) {
  const { state } = ctx;
  const name = { 1: 'Olympic gold medal', 2: 'Olympic silver medal', 3: 'Olympic bronze medal' }[place];
  addHonor(state, { id: `sport.olympic.${year}.${place}`, source: 'sport', name, icon: { 1: '🥇', 2: '🥈', 3: '🥉' }[place], prestige: { 1: 30, 2: 20, 3: 14 }[place], precedence: 12, citation: `${DISCIPLINES[discipline].label.replace(/^\S+ /, '')}, ${event}.`, sport: true, year });
}

function athleteYear(ctx) {
  const { state, rng } = ctx;
  const s = sp(state);
  const job = state.career.job;
  s.discipline ??= pickDiscipline(state, rng);
  const d = DISCIPLINES[s.discipline];
  const cc = here(state);
  const strength = d.strong[cc] ?? 0.4;
  const r = rating(state);
  const year = currentYear(state);
  // Doping: caught out later as often as not.
  if (s.doped && rng.chance(0.18)) return banned(ctx);
  // The call-up.
  const inSquad = r >= 62 && rng.chance(clamp((r - 55) / 40, 0.05, 0.9));
  if (inSquad) {
    const first = !s.caps;
    s.caps += rng.int(3, 10);
    if (first) ctx.log(`You were called up to the ${COUNTRIES[cc]?.name ?? cc} national team. Your first cap, and the anthem with your family in the stands.`, '🎽', 'milestone');
    if (!s.captain && s.caps >= 50 && r >= 75 && rng.chance(0.3)) { s.captain = true; ctx.log('The coach made you captain of your country.', '©️', 'milestone'); }
  }
  // The tournaments.
  if (inSquad && d.olympic && year % 4 === 0) {
    const city = HOSTS[year] ?? 'the Summer Games';
    const event = `${HOSTS[year] ? `${city} ` : ''}${year}`;
    const p = clamp((r - 66) / 100 * strength, 0, 0.45);
    const roll = rng.next();
    const place = roll < p * 0.35 ? 1 : roll < p * 0.7 ? 2 : roll < p ? 3 : 0;
    s.olympics.push({ year, city, place, doped: s.doped });
    if (place) {
      medal(ctx, { place, event, year, discipline: s.discipline });
      ctx.emit('fame:buzz', { amount: place === 1 ? 20 : 12 });
      ctx.stat('happiness', 12);
      ctx.log(`${{ 1: 'GOLD', 2: 'Silver', 3: 'Bronze' }[place]} at the Olympic Games in ${city}. ${place === 1 ? 'Your anthem, your flag, and a crowd on its feet.' : 'An Olympic medal: nobody can take that away.'}`, { 1: '🥇', 2: '🥈', 3: '🥉' }[place], 'milestone');
      if (place === 1) job.performance = Math.min(100, (job.performance ?? 60) + 10);
    } else ctx.log(`You competed at the Olympic Games in ${city}: an Olympian for life, if not a medallist.`, '🏟️', 'good');
  }
  if (inSquad && d.cup && year % 4 === d.cup.every) {
    const won = rng.chance(clamp((strength - 0.6) * 0.12 + (r - 70) / 400, 0.01, 0.25));
    s.cups.push({ year, name: d.cup.name, won });
    if (won) {
      addHonor(state, { id: `sport.cup.${year}`, source: 'sport', name: `${d.cup.name} winner`, icon: '🏆', prestige: 25, precedence: 12, citation: `${d.cup.name} ${year}, with ${COUNTRIES[cc]?.name ?? cc}.`, sport: true, year });
      ctx.log(`You won the ${d.cup.name}. Open-top bus, a million people, and a trophy you'll see in your dreams.`, '🏆', 'milestone');
    } else ctx.log(`You played at the ${d.cup.name} ${year}. ${rng.pick(['Out in the group stage.', 'A quarter-final, lost on the last kick.', 'A semi-final: so close.'])}`, '🏟️', 'info');
  }
  // The offer.
  if (!s.doped && r < 80 && r >= 55 && rng.chance(0.04) && !state.prompts.some((p) => p.type === 'sport.doping')) {
    ctx.prompt({ type: 'sport.doping', icon: '💉', title: 'An Offer', text: 'A doctor your training partner swears by has something "undetectable". It would take a second off your times — or put you on the next level.', options: [
      { id: 'refuse', label: '🙅 Refuse' },
      { id: 'take', label: '💉 Take it', tone: 'danger', hint: 'Better results; a positive test is a four-year ban' },
    ] });
  }
}

function banned(ctx) {
  const { state } = ctx;
  const s = state.sport;
  s.doped = false;
  s.banUntil = state.character.age + 4;
  // Medals won while doping are taken back.
  const stripped = new Set(s.olympics.filter((o) => o.doped && o.place).map((o) => o.year));
  s.olympics = s.olympics.map((o) => (o.doped ? { ...o, place: 0, stripped: Boolean(o.place) } : o));
  state.honors = (state.honors ?? []).filter((h) => !(h.sport && stripped.has(h.year) && /Olympic/.test(h.name)));
  if (state.career.job?.professionId === 'athletics') leaveJob(ctx, 'Banned for doping', { fired: true });
  ctx.stat('happiness', -20);
  ctx.emit('fame:scandal', { severity: 12, headline: 'a positive doping test and a four-year ban' });
  return ctx.log(`A positive test. The anti-doping agency banned you for four years${stripped.size ? ', and the IOC took back your Olympic medals' : ''}. The headlines wrote themselves.`, '💉', 'bad');
}

/** Running sport: federation, IOC, FIFA. Host-city votes and the gifts that come with them. */
function officialYear(ctx) {
  const { state, rng } = ctx;
  const s = state.sport;
  if (!s) return;
  if (s.federation === 'board' && rng.chance(0.12)) { s.federation = 'president'; ctx.log(`You were elected President of your national ${DISCIPLINES[s.discipline]?.label.replace(/^\S+ /, '').toLowerCase() ?? 'sports'} federation.`, '🏅', 'milestone'); }
  if (s.ioc) {
    const years = state.character.age - s.ioc.since;
    if (state.character.age >= 70) { s.ioc.honorary = true; s.ioc.retired = state.character.age; ctx.log('At 70 you retired from the IOC as an honorary member.', '🏅', 'info'); s.ioc = null; return; }
    if (years === 8) addHonor(state, { id: 'sport.olympicOrder', source: 'sport', name: 'Olympic Order', icon: '🏅', prestige: 15, precedence: 14, citation: 'For service to the Olympic Movement.' });
  }
  if ((s.ioc || s.fifa) && rng.chance(0.25) && !state.prompts.some((p) => p.type === 'sport.hostVote')) {
    const body = s.fifa && (!s.ioc || rng.chance(0.5)) ? 'fifa' : 'ioc';
    const cities = rng.shuffle(body === 'fifa' ? ['Morocco, Spain and Portugal', 'Saudi Arabia', 'Australia and New Zealand', 'Egypt', 'Chile, Argentina and Uruguay'] : ['Doha', 'Istanbul', 'Madrid', 'Ahmedabad', 'Budapest', 'Jakarta', 'Santiago']).slice(0, 3);
    ctx.prompt({ type: 'sport.hostVote', icon: '🗳️', title: body === 'fifa' ? 'The World Cup Vote' : 'The Host City Vote', text: `The vote on the ${body === 'fifa' ? 'World Cup' : 'Olympic Games'} is coming. The ${cities[1]} bid has made it known that its "friends" will be well looked after.`, options: [
      { id: 'a', label: `🗳️ Vote for ${cities[0]}`, hint: 'The best technical bid' },
      { id: 'b', label: `🎁 Vote for ${cities[1]} and accept their hospitality`, tone: 'danger' },
      { id: 'c', label: `🗳️ Vote for ${cities[2]}` },
    ], data: { body, cities } });
  }
}

export const SportModule = {
  id: 'sport',
  order: 31.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive) return;
    if (activeAthlete(state)) athleteYear(ctx);
    officialYear(ctx);
  },
  actions: {
    /** Choose your sport (before your first cap). */
    discipline(ctx, id) {
      const s = sp(ctx.state);
      if (!DISCIPLINES[id]) return ctx.toast('Unknown sport', 'warn');
      if (s.caps) return ctx.toast('You\'re capped in your sport now', 'warn');
      s.discipline = id;
      return ctx.log(`You committed to ${DISCIPLINES[id].label.replace(/^\S+ /, '').toLowerCase()}.`, '🏟️', 'info');
    },
    /** Join your national federation's board (former internationals). */
    federation(ctx) {
      const { state, rng } = ctx;
      const s = sp(state);
      if (s.federation) return ctx.toast('Already on the board', 'warn');
      if (!international(state)) return ctx.toast('Former internationals and Olympians', 'warn');
      if (activeAthlete(state)) return ctx.toast('After you retire from competition', 'warn');
      if (yearlyCount(state, 'sport.federation')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'sport.federation');
      if (!rng.chance(0.5)) return ctx.log('The federation\'s members elected someone else to the board this time.', '🏅', 'info');
      s.federation = 'board';
      return ctx.log('You were elected to your national federation\'s board: selection policy, coaching budgets and arguing with the sports ministry.', '🏅', 'good');
    },
    /** Seek co-option into the IOC (Olympians, federation presidents). */
    ioc(ctx) {
      const { state, rng } = ctx;
      const s = sp(state);
      if (s.ioc) return ctx.toast('Already a member', 'warn');
      if (!olympian(state) && s.federation !== 'president') return ctx.toast('Olympians and federation presidents', 'warn');
      if (state.character.age >= 70 || s.banUntil) return ctx.toast(s.banUntil ? 'Not after a doping ban' : 'Members retire at 70', 'warn');
      if (yearlyCount(state, 'sport.ioc')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'sport.ioc');
      const medals = s.olympics.filter((o) => o.place).length;
      if (!rng.chance(clamp(0.12 + medals * 0.08 + (s.federation === 'president' ? 0.15 : 0), 0.05, 0.6))) return ctx.log('The IOC Session co-opted other candidates this year.', '🏅', 'info');
      s.ioc = { since: state.character.age };
      return ctx.log('You were elected a member of the International Olympic Committee: Lausanne, the Sessions, and a seat in the Olympic family.', '🏅', 'milestone');
    },
    /** Stand for the FIFA Council (football federation presidents). */
    fifa(ctx) {
      const { state, rng } = ctx;
      const s = sp(state);
      if (s.fifa) return ctx.toast('Already on the Council', 'warn');
      if (s.discipline !== 'football' || s.federation !== 'president') return ctx.toast('Presidents of a football federation', 'warn');
      if (yearlyCount(state, 'sport.fifa')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'sport.fifa');
      if (!rng.chance(0.35)) return ctx.log('Your confederation\'s congress elected someone else to the FIFA Council.', '⚽', 'info');
      s.fifa = { since: state.character.age };
      return ctx.log('Your confederation elected you to the FIFA Council in Zurich.', '⚽', 'milestone');
    },
  },
  resolvers: {
    doping(ctx, data, optionId) {
      if (optionId !== 'take') return ctx.log('You said no, and changed training partners.', '🙅', 'good');
      sp(ctx.state).doped = true;
      return ctx.log('You started the programme. Your times dropped, and so did your sleep.', '💉', 'warn');
    },
    hostVote(ctx, data, optionId) {
      const { state, rng } = ctx;
      const city = data.cities[{ a: 0, b: 1, c: 2 }[optionId]];
      if (optionId !== 'b') return ctx.log(`You voted for ${city}.`, '🗳️', 'info');
      ctx.earn(rng.int(20, 120) * 1000, 'Bid committee "consultancy"');
      ctx.log(`You voted for ${city}. A "consultancy" fee arrived for a relative, and first-class tickets for the whole family.`, '🎁', 'warn');
      if (rng.chance(0.3)) {
        const s = state.sport;
        if (data.body === 'ioc') s.ioc = null; else s.fifa = null;
        ctx.log(`An ethics investigation found out. You were expelled from the ${data.body === 'ioc' ? 'IOC' : 'FIFA Council'}.`, '⚖️', 'bad');
        ctx.emit('legal:offense', { offenseId: 'publicCorruption', context: 'the host-city vote', caught: true, evidence: 0.7 });
      }
      return undefined;
    },
  },
};
