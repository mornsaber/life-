/**
 * Holidays abroad, on your own passports. Whether you can go, and how easily, depends on:
 *
 *   Your passports   the strongest one you hold for that trip (dual citizens pick); official
 *                    and diplomatic passports are for duty travel, never for holidays
 *   The destination  open (most of the world), fortress (rich countries: easy for strong
 *                    passports, a consulate visa and a real chance of refusal for weak ones),
 *                    strict (a visa for everyone), or closed (North Korea: Russian and
 *                    Chinese group tours only)
 *   Free movement    the EU/Schengen area, the UK–Ireland Common Travel Area, Australia–New
 *                    Zealand, ASEAN, ECOWAS, the Gulf states, Mercosur
 *   Bans             the US travel ban; states that refuse Israeli passports; personal
 *                    sanctions (no entry to the West); criminal records (Canada refuses even
 *                    a misdemeanour; the US, Australia, New Zealand and Japan a felony)
 *   Leaving          North Korea doesn't let you out; a travel ban keeps you home; an asylum
 *                    seeker or undocumented migrant who leaves can't come back
 *   Danger           war zones and failed states carry a "do not travel" advisory: robbery,
 *                    kidnap; some states detain Western visitors as bargaining chips
 *   Sanctions        a Russian or Iranian holiday is dearer (no direct flights, cards dead
 *                    abroad: carry cash)
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, criminalRecord, hasFelony } from '../../core/State.js';
import { COUNTRIES, FOREIGN_CITIES, citizenshipsOf } from './Countries.js';
import { residencesOf, residencyOf, birthCountryOf } from './Immigration.js';
import { EU_MEMBERS } from '../career/IntlOrgCareers.js';
import { regimeOf, exitBlock, sanctionsOn } from './Regimes.js';
import { warIn } from './War.js';

export const CONTINENT = {
  Europe: ['GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'AT', 'BA', 'BE', 'CH', 'CY', 'DK', 'EE', 'LT', 'LV', 'MT', 'NO', 'PL', 'RO', 'RU', 'TR', 'UA', 'XK', 'GR', 'PT', 'FI', 'LU'],
  Americas: ['US', 'CA', 'MX', 'BR', 'AR', 'CO', 'CR', 'GT', 'HT', 'PE', 'VE', 'PA', 'JM', 'BS', 'CL'],
  'Asia & Pacific': ['JP', 'KR', 'KP', 'CN', 'TW', 'IN', 'PK', 'PH', 'SG', 'ID', 'MY', 'TH', 'VN', 'KH', 'MM', 'BN', 'AU', 'NZ', 'PG', 'SB', 'VU', 'BD', 'LK', 'BT', 'TO', 'MH'],
  'Middle East': ['IL', 'PS', 'AE', 'SA', 'QA', 'KW', 'BH', 'JO', 'LB', 'SY', 'IQ', 'IR', 'YE', 'EG', 'AF', 'OM'],
  Africa: ['NG', 'KE', 'ZA', 'MA', 'GH', 'SN', 'CI', 'ET', 'DJ', 'GM', 'GW', 'LY', 'ML', 'MW', 'MZ', 'NE', 'SD', 'SO', 'SS', 'TD', 'CD', 'CF', 'LR'],
};
const continentOf = (cc) => Object.keys(CONTINENT).find((k) => CONTINENT[k].includes(cc)) ?? 'Elsewhere';

const SCHENGEN = [...EU_MEMBERS, 'CH', 'NO', 'IS', 'LI'];
const BLOCS = [SCHENGEN, ['GB', 'IE'], ['AU', 'NZ'], ['ID', 'MY', 'TH', 'VN', 'KH', 'PH', 'SG', 'BN', 'MM', 'LA'], ['NG', 'GH', 'SN', 'CI', 'GM', 'GW', 'ML', 'NE', 'BF', 'TG', 'BJ', 'SL', 'LR'], ['SA', 'KW', 'QA', 'AE', 'BH', 'OM'], ['BR', 'AR', 'CO', 'PE', 'UY', 'PY', 'CL', 'BO']];
const sameBloc = (a, b) => BLOCS.some((bl) => bl.includes(a) && bl.includes(b));

/** Passport strength: 3 strong, 2 good, 1 weak, 0 among the world's weakest. */
const STRONG = [...SCHENGEN, 'US', 'CA', 'GB', 'AU', 'NZ', 'JP', 'KR', 'SG', 'AE'];
const GOOD = ['IL', 'TW', 'MY', 'BR', 'AR', 'MX', 'CO', 'PE', 'CR', 'GT', 'BN', 'QA', 'KW', 'BH', 'UA', 'XK', 'BA', 'VU', 'SB'];
const WEAKEST = ['KP', 'AF', 'SY', 'IQ', 'PK', 'YE', 'SO', 'LY', 'PS', 'SS', 'SD'];
export const passportPower = (cc) => (STRONG.includes(cc) ? 3 : GOOD.includes(cc) ? 2 : WEAKEST.includes(cc) ? 0 : 1);

/** How a country treats tourists. */
const FORTRESS = [...SCHENGEN, 'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'JP', 'KR', 'SG', 'IL', 'TW'];
const STRICT = ['CN', 'RU', 'IN', 'IR', 'SA', 'PK', 'NG', 'AF', 'IQ', 'SY', 'YE', 'SD', 'SS', 'SO', 'CD', 'CF', 'LY', 'TD', 'DJ', 'ET', 'EG', 'VN', 'MM', 'VE', 'KW', 'BH'];
/** Who may never visit. */
const US_TRAVEL_BAN = ['AF', 'MM', 'TD', 'HT', 'IR', 'LY', 'SO', 'SD', 'YE', 'KP', 'SY'];
const NO_ISRAELIS = ['IR', 'SY', 'LB', 'YE', 'IQ', 'KW', 'LY', 'PK', 'BN', 'MY', 'AF', 'SA'];
const WEST = [...SCHENGEN, 'US', 'CA', 'GB', 'AU', 'NZ', 'JP'];
/** Where Western visitors have been seized as bargaining chips. */
const HOSTAGE_RISK = ['IR', 'RU', 'VE', 'AF', 'KP'];
/** Where you'd go. */
const SIGHTS = { JP: 'the temples of Kyoto', FR: 'Paris and Provence', IT: 'Rome, Florence and the Amalfi coast', ES: 'Barcelona and Andalusia', GB: 'London and the Highlands', US: 'New York and the national parks', TH: 'Bangkok and the islands', MX: 'Oaxaca and the Yucatán', AU: 'Sydney and the Great Barrier Reef', NZ: 'Queenstown and the fjords', CA: 'Banff and Montreal', GR: 'the islands', TR: 'Istanbul and Cappadocia', EG: 'the pyramids and the Nile', MA: 'Marrakech and the Atlas', ZA: 'Cape Town and a safari', KE: 'a safari in the Maasai Mara', IN: 'Rajasthan and Kerala', CN: 'Beijing, Xi\'an and Shanghai', KR: 'Seoul and Jeju', ID: 'Bali', PE: 'Cusco and Machu Picchu', BR: 'Rio and Iguaçu', AR: 'Buenos Aires and Patagonia', AE: 'Dubai', SG: 'Singapore\'s hawker centres', VN: 'Hội An and Hạ Long Bay', KH: 'Angkor Wat', JO: 'Petra and Wadi Rum', CH: 'the Alps', NO: 'the fjords', IS: 'the glaciers', PT: 'Lisbon', HR: 'the Dalmatian coast', IR: 'Isfahan and Shiraz', KP: 'Pyongyang\'s monuments (with two minders)', CR: 'the cloud forests', TZ: 'Zanzibar', PH: 'Palawan', MY: 'Penang and Borneo', MT: 'Valletta', CY: 'the beaches', DE: 'Berlin and Bavaria', NL: 'Amsterdam', IE: 'the west coast' };

export const TRIPS = {
  budget: { label: '🎒 Backpacking', base: 900, stress: [8, 14], happy: [5, 8] },
  standard: { label: '🧳 A proper holiday', base: 2600, stress: [14, 22], happy: [8, 12] },
  luxury: { label: '🥂 Five-star', base: 9000, stress: [20, 30], happy: [12, 18] },
};

const priceOf = (cc) => {
  const cities = Object.values(FOREIGN_CITIES).filter((r) => r.country === cc);
  return cities.length ? cities.reduce((s, r) => s + r.market, 0) / cities.length : 1;
};
const sightsOf = (cc) => SIGHTS[cc] ?? (Object.values(COUNTRIES[cc]?.cities ?? {}).map((c) => c.name).slice(0, 2).join(' and ') || COUNTRIES[cc]?.capital);

/** One passport's entry to a destination: { kind, cost, refusal, note }. kind: free|eta|evisa|visa|tour|barred|closed. */
export function entryWith(passport, dest, state) {
  if (passport === dest) return { kind: 'free', cost: 0, refusal: 0, note: 'your own country' };
  if (dest === 'KP') {
    if (passport === 'US') return { kind: 'barred', note: 'US law forbids Americans to travel to North Korea' };
    if (['RU', 'CN'].includes(passport)) return { kind: 'tour', cost: 600, refusal: 0.1, note: 'state-run group tour only' };
    if (passport === 'KR') return { kind: 'barred', note: 'South Koreans may not visit the North' };
    return { kind: 'closed', note: 'closed to tourists' };
  }
  if (passport === 'IL' && NO_ISRAELIS.includes(dest)) return { kind: 'barred', note: 'doesn\'t admit Israeli passports' };
  if (dest === 'IL' && NO_ISRAELIS.includes(passport) && !['MY', 'BN', 'KW'].includes(passport)) return { kind: 'barred', note: 'Israel doesn\'t admit this passport' };
  if (dest === 'US' && US_TRAVEL_BAN.includes(passport)) return { kind: 'barred', note: 'under the US travel ban' };
  if (sameBloc(passport, dest)) return { kind: 'free', cost: 0, refusal: 0, note: 'free movement' };
  const p = passportPower(passport);
  if (FORTRESS.includes(dest)) {
    if (p === 3) return ['US', 'CA', 'GB', 'AU', 'NZ'].includes(dest) || (SCHENGEN.includes(dest) && !SCHENGEN.includes(passport))
      ? { kind: 'eta', cost: 25, refusal: 0.01, note: { US: 'ESTA', CA: 'eTA', GB: 'ETA', AU: 'ETA', NZ: 'NZeTA' }[dest] ?? 'ETIAS' }
      : { kind: 'free', cost: 0, refusal: 0, note: 'visa-free' };
    if (p === 2) return SCHENGEN.includes(dest) || ['GB', 'IE', 'JP', 'KR', 'SG', 'IL', 'TW'].includes(dest) ? { kind: 'free', cost: 0, refusal: 0.02, note: 'visa-free' } : { kind: 'visa', cost: 185, refusal: 0.15, note: 'consulate visa' };
    return { kind: 'visa', cost: 185, refusal: p === 0 ? 0.6 : 0.35, note: 'consulate visa: bank statements, interview, proof you\'ll go home' };
  }
  if (STRICT.includes(dest)) return { kind: p >= 2 ? 'evisa' : 'visa', cost: p >= 2 ? 80 : 140, refusal: p >= 2 ? 0.05 : p === 1 ? 0.2 : 0.35, note: p >= 2 ? 'e-visa' : 'visa required' };
  if (p >= 2) return { kind: 'free', cost: 0, refusal: 0, note: 'visa-free' };
  return { kind: p === 1 ? 'evisa' : 'visa', cost: p === 1 ? 50 : 120, refusal: p === 1 ? 0.05 : 0.25, note: p === 1 ? 'visa on arrival / e-visa' : 'visa required' };
}

const RANK = { free: 0, eta: 1, evisa: 2, tour: 3, visa: 4, closed: 8, barred: 9 };

/** Your best way into a country: { passport, ...entry } or a block { kind: 'barred'|'closed', note }. */
export function bestEntry(state, dest) {
  // Living there already: residents come and go.
  if (residencesOf(state)[dest] && ['permanent', 'visa', 'refugee'].includes(residencesOf(state)[dest].status)) return { passport: citizenshipsOf(state)[0], kind: 'free', cost: 0, refusal: 0, note: 'you\'re a resident' };
  const all = citizenshipsOf(state).map((p) => ({ passport: p, ...entryWith(p, dest, state) }));
  all.sort((a, b) => RANK[a.kind] - RANK[b.kind] || (a.refusal ?? 1) - (b.refusal ?? 1));
  return all[0];
}

/** Why you can't go there (null: you can). */
export function travelBlock(state, dest) {
  const here = state.character.countryId ?? 'US';
  if (dest === here) return 'You live here';
  if (!COUNTRIES[dest]) return 'Unknown destination';
  if (state.character.age < 18) return 'From 18';
  if (state.legal.incarceration) return 'In custody';
  const out = exitBlock(state);
  if (out) return out;
  const res = residencyOf(state);
  if (res?.status === 'undocumented') return 'Undocumented: if you leave, you can\'t come back';
  if (res?.status === 'asylum') return 'Leaving would abandon your asylum claim';
  if (res?.status === 'refugee' && dest === birthCountryOf(state)) return 'Going back would end your refugee protection';
  if (state.regime?.sanctioned?.travelBan && WEST.includes(dest)) return 'You\'re under a sanctions travel ban there';
  const w = warIn(state, dest);
  if (w && w.phase !== 'ceasefire' && (w.homeFront ?? 0) >= 0.3) return 'At war: no flights in';
  const e = bestEntry(state, dest);
  if (e.kind === 'barred' || e.kind === 'closed') return `${COUNTRIES[dest].name}: ${e.note}`;
  if (dest === 'CA' && criminalRecord(state).length) return 'Canada refuses entry with a criminal record';
  if (['US', 'AU', 'NZ', 'JP'].includes(dest) && hasFelony(state)) return `${COUNTRIES[dest].name} refuses entry with a felony record`;
  return null;
}

/** A trip's price: destination prices, distance, sanctions detours. */
export function tripCost(state, dest, tier) {
  const here = state.character.countryId ?? 'US';
  const distance = continentOf(here) === continentOf(dest) ? 0.65 : 1.15;
  const detour = [here, dest].some((c) => ['RU', 'IR', 'KP', 'SY', 'VE'].includes(c)) ? 1.4 : 1;
  const entry = bestEntry(state, dest);
  return Math.round((TRIPS[tier].base * clamp(0.4 + priceOf(dest) * 0.9, 0.5, 1.6) * distance * detour + (entry.cost ?? 0)) / 10) * 10;
}

/** "Do not travel": active wars and failed states. */
export function advisory(state, dest) {
  const w = warIn(state, dest);
  if (w && w.phase !== 'ceasefire') return 'Do not travel: war';
  const r = regimeOf(dest);
  if (r.kind === 'fragile' || r.kind === 'junta' || ['AF', 'IQ', 'SY'].includes(dest)) return 'Do not travel: kidnap and conflict risk';
  if (HOSTAGE_RISK.includes(dest)) return 'Risk of arbitrary detention for foreigners';
  return null;
}

function ensure(state) {
  state.travel ??= { trips: [], countries: [] };
  return state.travel;
}

export const TravelModule = {
  id: 'travel',
  order: 63,
  init(state) {
    ensure(state);
  },
  actions: {
    /** Plan a holiday: pick the style. */
    plan(ctx, dest) {
      const { state } = ctx;
      const why = travelBlock(state, dest);
      if (why) return ctx.toast(why, 'warn');
      if (yearlyCount(state, 'travel.trip') >= 2) return ctx.toast('Two trips abroad a year is plenty', 'warn');
      const c = COUNTRIES[dest];
      const e = bestEntry(state, dest);
      const warn = advisory(state, dest);
      const pp = COUNTRIES[e.passport];
      ctx.prompt({
        type: 'travel.trip', icon: c.flag, title: `${c.name}`,
        text: `${sightsOf(dest) ? `${sightsOf(dest)[0].toUpperCase()}${sightsOf(dest).slice(1)}. ` : ''}On your ${pp?.demonym ?? ''} passport: ${e.note}${e.refusal ? ` (≈${Math.round(e.refusal * 100)}% refused)` : ''}.${warn ? ` ⚠️ ${warn}.` : ''}`,
        data: { dest },
        options: [...Object.entries(TRIPS).map(([id, t]) => ({ id, label: t.label, hint: `$${tripCost(state, dest, id).toLocaleString()}` })), { id: 'cancel', label: '🏠 Not this year' }],
      });
      return undefined;
    },
  },
  resolvers: {
    trip(ctx, data, optionId) {
      const { state, rng } = ctx;
      const dest = data.dest;
      if (optionId === 'cancel' || !TRIPS[optionId]) return undefined;
      const why = travelBlock(state, dest);
      if (why) return ctx.toast(why, 'warn');
      const c = COUNTRIES[dest];
      const t = TRIPS[optionId];
      const e = bestEntry(state, dest);
      const cost = tripCost(state, dest, optionId);
      if (!ctx.spend(cost, `Holiday: ${c.name}`)) return ctx.toast(`You need $${cost.toLocaleString()}`, 'warn');
      bumpYearly(state, 'travel.trip');
      // The visa can be refused: the fee is gone, and the rest mostly refunded.
      if (e.refusal && rng.chance(e.refusal)) {
        ctx.earn(Math.round((cost - (e.cost ?? 0)) * 0.7), 'Holiday refunds');
        ctx.stat('happiness', -4);
        return ctx.log(`${c.flag} Your ${e.kind === 'tour' ? 'tour permit' : 'visa'} for ${c.name} was refused. You got most of the money back.`, '🛂', 'bad');
      }
      const tr = ensure(state);
      tr.trips.push({ country: dest, age: state.character.age, tier: optionId });
      if (tr.trips.length > 40) tr.trips.shift();
      if (!tr.countries.includes(dest)) tr.countries.push(dest);
      const warn = advisory(state, dest);
      // Danger: robbery and kidnap where the state has failed; hostage diplomacy where it hasn't.
      const western = citizenshipsOf(state).some((x) => WEST.includes(x));
      if (warn?.startsWith('Do not travel') && rng.chance(optionId === 'luxury' ? 0.05 : 0.1)) {
        const ransom = Math.min(Math.max(0, state.finances.cash) * 0.3, 50000);
        ctx.spend(Math.round(ransom), 'Ransom', { allowDebt: true });
        ctx.stat('stress', 30);
        ctx.stat('happiness', -15);
        ctx.stat('health', -6);
        return ctx.log(`${c.flag} You were kidnapped on the road out of ${c.capital} and held for weeks until your family paid.`, '🔒', 'bad');
      }
      if (HOSTAGE_RISK.includes(dest) && western && rng.chance(0.015)) {
        ctx.stat('stress', 35);
        ctx.stat('happiness', -20);
        ctx.stat('health', -8);
        return ctx.log(`${c.flag} You were arrested at the airport in ${c.name} on "espionage" charges and held for months — a bargaining chip — until diplomats negotiated your release.`, '⛓️', 'bad');
      }
      ctx.stat('stress', -rng.int(...t.stress));
      ctx.stat('happiness', rng.int(...t.happy));
      const s = sanctionsOn(dest);
      const note = s && s.level >= 2 ? ' Your bank cards didn\'t work: you carried cash.' : dest === 'KP' ? ' You never left the group, and photographed only what you were told to.' : '';
      const how = { budget: 'with a backpack and hostels', standard: 'for two weeks', luxury: 'in five-star style' }[optionId];
      ctx.log(`${c.flag} You travelled to ${c.name} ${how}: ${sightsOf(dest) || c.capital}.${note}${tr.countries.length % 10 === 0 ? ` That's ${tr.countries.length} countries.` : ''}`, '✈️', 'good');
      return undefined;
    },
  },
};

export { continentOf };
