/**
 * Travel and keeping in touch, of their day.
 *
 *   Getting there  sail until the 1840s (six weeks across the Atlantic, three or four months to
 *                  Australia), steamships (ten days, then six), ocean liners, propeller airliners
 *                  from the late 1940s and jets from 1958. Before 1950 a holiday abroad was for
 *                  the rich, and the far side of the world was a once-in-a-life journey.
 *   Keeping in touch  letters (weeks by sail, days by airmail), the telegraph (the Atlantic cable,
 *                  1866), a transatlantic telephone call (1927: a week's wages for three minutes),
 *                  direct dialling, email (1990s) and video calls (2000s). Before the telephone,
 *                  family abroad you don't write to drift away.
 *   Emigration     before passports and quotas: a steerage ticket to New York (Ellis Island, 1892),
 *                  to Canada, Australia, New Zealand, Argentina or Brazil, with a medical
 *                  inspection at the other end. The Chinese Exclusion Act (1882–1943); America's
 *                  quotas from 1924, generous to the British and Germans, all but closed to
 *                  everyone else; White Australia (1901–73); the "Ten Pound Poms" (1945–82).
 *
 * state.travelDay = { wrote: { [personId]: year }, called: { [personId]: year } }
 */
import { yearNow, PRESENT } from './Eras.js';
import { COUNTRIES } from './Countries.js';
import { CONTINENT, TRAVEL_ERA } from './Travel.js';
import { ERA_ROUTES } from './Migration.js';
import { clampRel } from '../people/People.js';
import { VISIT_ERA } from '../people/FamilyAbroad.js';

const cc = (state) => state.character?.countryId ?? 'US';
const historic = (state) => Boolean(state?.era) && yearNow(state) < PRESENT;
const continentOf = (c) => Object.keys(CONTINENT).find((k) => CONTINENT[k].includes(c)) ?? (['AU', 'NZ'].includes(c) ? 'Asia & Pacific' : 'Elsewhere');
const AUSTRALASIA = ['AU', 'NZ'];
const farApart = (a, b) => (AUSTRALASIA.includes(a) !== AUSTRALASIA.includes(b) ? 'antipodes' : continentOf(a) !== continentOf(b) ? 'ocean' : 'near');

/** How you'd make the journey, and how long it takes, between two countries in a year. */
export function journey(state, from, to) {
  const y = yearNow(state);
  const d = farApart(from, to);
  if (!historic(state) || y >= 1970) return { mode: 'jet', icon: '✈️', time: d === 'near' ? 'a few hours' : 'a day', d };
  if (y >= 1958) return { mode: 'jet', icon: '✈️', time: d === 'near' ? 'a few hours' : d === 'ocean' ? 'a day' : 'two days', d };
  if (d === 'near') return y >= 1840 ? { mode: 'rail', icon: '🚂', time: 'a day or two by train', d } : { mode: 'coach', icon: '🐎', time: 'days by coach and boat', d };
  if (y >= 1948) return { mode: 'airliner', icon: '🛩️', time: d === 'ocean' ? 'a day by propeller airliner, with stops' : 'four days by air', d };
  if (y >= 1870) return { mode: 'liner', icon: '🚢', time: d === 'ocean' ? (y >= 1900 ? 'six days by liner' : 'ten days by steamer') : 'six weeks by steamer', d };
  if (y >= 1840) return { mode: 'steam', icon: '🚢', time: d === 'ocean' ? 'two weeks by steamship' : 'two to three months under sail and steam', d };
  return { mode: 'sail', icon: '⛵', time: d === 'ocean' ? 'six weeks under sail' : 'three or four months under sail', d };
}

/** How much dearer a trip abroad was than today, by year and distance. */
export function travelCostFactor(state, dest) {
  if (!historic(state)) return 1;
  const y = yearNow(state);
  const far = farApart(cc(state), dest) !== 'near';
  if (y >= 1990) return 1;
  if (y >= 1970) return far ? 1.3 : 1.1;
  if (y >= 1950) return far ? 2.2 : 1.3;
  if (y >= 1900) return far ? 3 : 1.5;
  return far ? 4 : 2;
}
/** A holiday that couldn't be had: months at sea each way. */
export function travelBlockThen(state, dest) {
  if (!historic(state)) return null;
  const j = journey(state, cc(state), dest);
  if (j.mode === 'sail' || (j.d === 'antipodes' && ['steam', 'liner'].includes(j.mode) && yearNow(state) < 1900)) return `It's ${j.time} each way: nobody goes for a holiday`;
  return null;
}
/** A visit to family in another country, by year: cost and how you got there. */
export function visitThen(state, p, base) {
  const j = journey(state, cc(state), p.livesIn);
  return { cost: Math.round((base * travelCostFactor(state, p.livesIn)) / 10) * 10, j, blocked: travelBlockThen(state, p.livesIn) };
}

/* ------------------------------------------------------------------ */
/* Keeping in touch                                                    */
/* ------------------------------------------------------------------ */
/** How you keep in touch with family abroad, this year: { letter, telegraph, phone, video, letterTime, callCost }. */
export function contactThen(state, to) {
  const y = historic(state) ? yearNow(state) : PRESENT;
  const far = farApart(cc(state), to ?? 'GB') !== 'near';
  return {
    letterTime: y >= 1990 ? 'days' : y >= 1935 ? 'a week by airmail' : y >= 1870 ? (far ? 'two or three weeks' : 'a few days') : y >= 1840 ? (far ? 'a month' : 'a week') : (far ? 'two months or more' : 'a week or two'),
    telegraph: y >= (far ? 1866 : 1850),
    phone: y >= (far ? 1927 : 1900),
    callCost: y >= 1995 ? 2 : y >= 1975 ? 40 : y >= 1956 ? 120 : 600,
    email: y >= 1995,
    video: y >= 2005,
  };
}

/* ------------------------------------------------------------------ */
/* Emigration routes of their day                                      */
/* ------------------------------------------------------------------ */
const EUROPEANS = [...CONTINENT.Europe, 'GB', 'IE', 'IS', 'HU', 'CZ', 'SK', 'SI', 'HR', 'RS', 'BG', 'AL', 'BY'];
const NW_EUROPE = ['GB', 'IE', 'DE', 'NL', 'BE', 'SE', 'NO', 'DK', 'FR', 'CH', 'FI', 'IS', 'LU', 'AT'];
const ASIANS = [...CONTINENT['Asia & Pacific'].filter((c) => !AUSTRALASIA.includes(c)), ...CONTINENT['Middle East']];
/** The cost of a third-class (steerage) passage, in today's money. */
const passage = (y, far) => Math.round((y < 1850 ? 1800 : y < 1914 ? 1000 : y < 1950 ? 1400 : 1800) * (far ? 2 : 1));

/** A steerage passage where the door was open: a route for the Move tab, or null for today's rules. */
export function eraRoute(state, to) {
  if (!historic(state)) return null;
  const y = yearNow(state);
  if (y >= 1965) return null;
  const from = cc(state);
  const far = farApart(from, to) === 'antipodes';
  const european = EUROPEANS.includes(from) || ['US', 'CA', 'AU', 'NZ', 'AR'].includes(from);
  const fee = passage(y, far);
  const route = (label, odds, name, extra = {}) => ({ kind: 'passage', ok: true, odds, fee: extra.fee ?? fee, label, rule: { name }, ...extra });
  const closed = (reason) => ({ kind: 'passage', ok: false, odds: 0, fee, reason, label: '🚢 Steerage passage', rule: { name: 'Steerage passage' } });
  if (to === 'US') {
    if (from === 'CN' && y >= 1882 && y < 1943) return closed('The Chinese Exclusion Act bars Chinese immigrants');
    if (ASIANS.includes(from) && y >= 1917) return closed('The Asiatic Barred Zone: no immigrants from Asia');
    if (y < 1924) return route(`🚢 Steerage to New York${y >= 1892 ? ' (Ellis Island)' : ''}`, 0.97, y >= 1892 ? 'Ellis Island inspection' : 'Castle Garden landing');
    return NW_EUROPE.includes(from) ? route('🚢 A quota visa and a liner berth', 0.8, 'Quota immigrant visa (Immigration Act of 1924)') : route('🚢 A quota visa (a tiny quota)', 0.08, 'Quota immigrant visa (Immigration Act of 1924)');
  }
  if (to === 'CA') {
    if (from === 'CN' && y >= 1923 && y < 1947) return closed('The Chinese Immigration Act bars Chinese immigrants');
    if (from === 'CN' && y >= 1885) return route('🚢 Passage to Vancouver (and the head tax)', 0.9, 'Chinese head tax', { fee: fee + 4000 });
    if (y < 1930 && european) return route('🚢 Steerage to Quebec or Halifax', 0.95, 'Landing at Pier 21');
    return null;
  }
  if (AUSTRALASIA.includes(to)) {
    const britons = ['GB', 'IE'].includes(from);
    if (britons && y >= 1945) return route('🚢 Assisted passage: £10 (a "Ten Pound Pom")', 0.9, 'Assisted Passage Scheme', { fee: 300 });
    if (!european && y >= 1901) return closed('The White Australia policy: the dictation test turns you away');
    if (y < 1901 || britons || european) return route(`${y < 1850 ? '⛵' : '🚢'} Passage to ${to === 'AU' ? 'Sydney' : 'Wellington'}`, 0.95, britons && y < 1901 ? 'Assisted emigrant passage' : 'Steerage passage');
  }
  if (['AR', 'BR', 'UY', 'CL'].includes(to) && y < 1930 && european) return route(`🚢 Steerage to ${to === 'BR' ? 'Santos' : to === 'AR' ? 'Buenos Aires' : 'Montevideo'}`, 0.95, 'Emigrant landing');
  return null;
}

ERA_ROUTES.fn = eraRoute;
TRAVEL_ERA.block = travelBlockThen;
TRAVEL_ERA.cost = travelCostFactor;
VISIT_ERA.fn = (state, p, base) => (historic(state) ? visitThen(state, p, base) : null);

export const TravelOfTheDayModule = {
  id: 'travelDay',
  order: 8.7,
  setup(engine) {
    // The voyage out.
    engine.bus.on('migration:moved', ({ ctx, from, to }) => {
      if (!historic(ctx.state) || yearNow(ctx.state) >= 1958) return;
      const j = journey(ctx.state, from, to);
      if (j.mode === 'rail' || j.mode === 'coach') return;
      ctx.log(`${j.icon} The crossing to ${COUNTRIES[to]?.name ?? to} took ${j.time.replace(/^a day/, 'a day')}${j.mode === 'sail' || j.mode === 'steam' ? ', in a crowded, stinking hold' : ''}.`, j.icon, 'info');
      if ((j.mode === 'sail' || j.mode === 'steam') && ctx.rng.chance(0.2)) { ctx.stat('health', -8); ctx.log('Fever broke out below decks on the voyage. You were lucky to land alive.', '🤒', 'bad'); }
    });
  },
  init(state) { state.travelDay ??= {}; state.travelDay.wrote ??= {}; state.travelDay.called ??= {}; },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!historic(state) || yearNow(state) >= 1975) return;
    const td = state.travelDay;
    const y = yearNow(state);
    // Before cheap calls, family you don't write to drift away.
    for (const p of state.people?.list ?? []) {
      if (!p.alive || !p.livesIn || p.livesIn === cc(state)) continue;
      if ((td.wrote[p.id] ?? -99) >= y - 1 || (td.called[p.id] ?? -99) >= y - 1) continue;
      if (ctx.rng.chance(0.5)) p.relationship = clampRel(p.relationship - 2);
    }
  },
  actions: {
    /** Write a letter home. */
    write(ctx, id) {
      const { state } = ctx;
      const p = state.people.list.find((x) => x.id === id);
      if (!p?.alive || !p.livesIn) return;
      const y = yearNow(state);
      if (state.travelDay.wrote[id] === y) return ctx.toast('You\'ve written this year; the reply is still on its way.', 'info');
      state.travelDay.wrote[id] = y;
      ctx.spend(5, 'Postage', { allowDebt: true });
      p.relationship = clampRel(p.relationship + 4);
      ctx.log(`You wrote a long letter to ${p.firstName}. It will take ${contactThen(state, p.livesIn).letterTime} to arrive.`, '✉️', 'good');
    },
    /** Telephone home (once it's possible). */
    call(ctx, id) {
      const { state } = ctx;
      const p = state.people.list.find((x) => x.id === id);
      if (!p?.alive || !p.livesIn) return;
      const c = contactThen(state, p.livesIn);
      if (!c.phone) return ctx.toast('There\'s no telephone line that far yet.', 'warn');
      const y = yearNow(state);
      if (state.travelDay.called[id] === y) return ctx.toast('You called this year.', 'info');
      if (!ctx.spend(c.callCost, 'International call', { credit: true })) return ctx.toast(`A call costs $${c.callCost}.`, 'warn');
      state.travelDay.called[id] = y;
      p.relationship = clampRel(p.relationship + (c.video ? 6 : 5));
      ctx.log(c.video ? `A video call with ${p.firstName}.` : `You booked a call to ${p.firstName}${c.callCost >= 100 ? ': three crackling minutes, and worth every penny' : ''}.`, '📞', 'good');
    },
  },
};
