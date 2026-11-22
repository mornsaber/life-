/**
 * Towns that change. Every place has a history that arrives on its own clock: the railway,
 * gaslight, sewers and clean water, the mill, the trams, electric light, the picture house,
 * slum clearance and the estates, the bypass and the suburbs, the mill closing, the shopping
 * centre out of town, the high street emptying, the old warehouses turned into flats.
 *
 *   Dates        each milestone has a base year; a country's lag (LAG) and the size of the place
 *                push it later (the countryside got the railway and electric light last), and a
 *                little jitter by town keeps neighbours apart.
 *   Effects      jobs, crime, prices, population and mood in Cities.js; the neighbourhood trend.
 *   Your time    a place you arrive in already has its past (kept, not replayed); what happens
 *                while you live there is in the log and the local paper.
 *
 * state.world.townStory[regionId] = { [milestoneId]: { year, yours } }
 */
import { REGIONS } from './Regions.js';
import { ensureCity } from './Cities.js';
import { yearNow } from '../world/Eras.js';
import { regimeHere } from '../world/Regimes.js';

/** Years behind Britain that each country's towns got the new things (roughly, from industrialisation). */
export const LAG = {
  GB: 0, BE: 3, US: 5, FR: 8, DE: 8, NL: 8, CH: 8, IE: 5, SE: 15, DK: 15, NO: 18, AT: 12, CZ: 15, IT: 18, ES: 22, CA: 8, AU: 12, NZ: 15,
  HU: 22, PL: 25, RU: 28, JP: 25, PT: 28, GR: 30, FI: 22, AR: 25, UY: 25, CL: 30, ZA: 30, IL: 35,
  KR: 45, TW: 45, BR: 40, MX: 40, TR: 40, IR: 50, EG: 45, IN: 50, CN: 55, PH: 50, TH: 50, MY: 45, SG: 35, HK: 35, ID: 55, VN: 60, NG: 60, KE: 60, PK: 55, BD: 60,
};
const lagOf = (cc) => LAG[cc] ?? 50;
/** Modern things spread faster: later milestones close part of the gap. */
const lagFor = (cc, m) => Math.round(lagOf(cc) * (m.base >= 1950 ? 0.5 : m.base >= 1900 ? 0.75 : 1));

const SIZE = (r) => (/metro|capital|major/i.test(r?.type ?? '') ? 'city' : /rural|remote|village/i.test(r?.type ?? '') ? 'rural' : /town/i.test(r?.type ?? '') ? 'town' : 'city');
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0); };

/**
 * base: the year in Britain's cities; late: extra years for a town / the countryside (null: never there).
 * fx: changes to the city (jobs, crime, prices, pop, mood) and the neighbourhood trend.
 * needs: another milestone first. socialist: a different story under a planned economy.
 */
export const MILESTONES = [
  { id: 'gas', base: 1820, late: { town: 20, rural: null }, icon: '🏮', text: (n) => `Gas lamps were lit along the main streets of ${n}. People walked out after dark to look at them.`, fx: { mood: 4, crime: -3 } },
  { id: 'railway', base: 1842, late: { town: 8, rural: 25 }, icon: '🚂', text: (n, _s, cc) => `The railway reached ${n}. The coaches stopped running, coal got cheaper, and the ${cc === 'GB' ? 'London' : 'city'} papers came the same day.`, fx: { jobs: 6, pop: 5, prices: 4 } },
  { id: 'mill', base: 1835, late: { town: 10, rural: null }, icon: '🏭', text: (n) => `A great mill opened in ${n}: four storeys, a chimney you could see for miles, and work for a thousand hands.`, fx: { jobs: 12, pop: 10, crime: 3, mood: -1 }, industrial: true },
  { id: 'water', base: 1870, late: { town: 12, rural: 40 }, icon: '🚰', text: (n) => `${n} got sewers and clean piped water. The cholera did not come back.`, fx: { mood: 5, pop: 2 }, health: 3 },
  { id: 'trams', base: 1882, late: { town: 15, rural: null }, icon: '🚋', text: (n) => `Horse trams began running in ${n}. Workers could live further from the works.`, fx: { jobs: 2, prices: 2 } },
  { id: 'electric', base: 1906, late: { town: 12, rural: 30 }, icon: '💡', text: (n) => `Electric light came to ${n}: the streets first, then the better houses, then everyone's.`, fx: { mood: 4, jobs: 2 } },
  { id: 'cinema', base: 1910, late: { town: 5, rural: 25 }, icon: '🎞️', text: (n) => `A picture house opened in ${n}. Queues went round the block on a Saturday.`, fx: { mood: 3 } },
  { id: 'clearance', base: 1955, late: { town: 5, rural: null }, icon: '🏗️', text: (n, s, cc) => (s ? `The old streets of ${n} came down for the new housing blocks: prefabricated, identical, with hot water and a bath in every flat.` : cc === 'US' ? `Urban renewal came to ${n}: whole blocks were bulldozed, and the families who lived there were moved into housing projects or left to find their own way.` : `The council cleared the old terraces of ${n}. Families who had lived side by side for generations were rehoused in new estates and tower blocks across town.`), fx: { mood: -3, crime: 2, prices: -2 } },
  { id: 'bypass', base: 1962, late: { town: 5, rural: 15 }, icon: '🛣️', text: (n, _s, cc) => `${cc === 'US' ? 'The interstate' : 'A motorway and a ring road'} came to ${n}. The suburbs spread out along them.`, fx: { pop: 4, prices: 4, jobs: 2 }, notSocialist: true },
  { id: 'closure', base: 1978, late: { town: 2, rural: null }, icon: '🔒', needs: 'mill', text: (n, s) => (s ? `After the old system fell, the great works of ${n} closed within a year. A whole town was out of work at once.` : `The mill in ${n} closed. The chimney came down on a Sunday morning while people watched in silence.`), fx: { jobs: -16, pop: -8, crime: 8, mood: -12, prices: -8 }, trend: -0.4 },
  { id: 'mall', base: 1980, late: { town: 5, rural: 15 }, icon: '🛍️', text: (n, _s, cc) => `A ${cc === 'US' ? 'mall' : 'shopping centre'} opened on the edge of ${n}, with free parking. The shops in the middle started to struggle.`, fx: { jobs: 3, mood: 1 }, notSocialist: true },
  { id: 'regeneration', base: 1997, late: { town: 10, rural: null }, icon: '☕', text: (n) => `The old warehouses of ${n} became flats and coffee shops. Rents went up; some old neighbours moved out.`, fx: { prices: 14, crime: -4, mood: 3 }, trend: 0.4, city: true },
  { id: 'highStreet', base: 2008, late: { town: 0, rural: 5 }, icon: '🏚️', text: (n, _s, cc) => (cc === 'US' ? `Half the storefronts on Main Street in ${n} are empty now: dollar stores, pawn shops and For Lease signs.` : `Half the shop fronts on the high street of ${n} are empty now: charity shops, betting shops and To Let signs.`), fx: { jobs: -3, mood: -4 } },
  { id: 'techHub', base: 2012, late: { town: null, rural: null }, icon: '💻', text: (n) => `${n} has become a place where software companies open offices. Wages and rents both jumped.`, fx: { jobs: 8, prices: 10 }, city: true },
];

/** The year this milestone comes to this place (null: it never does). */
export function dueYear(m, regionId, cc) {
  const r = REGIONS[regionId];
  const size = SIZE(r);
  const late = size === 'city' ? 0 : m.late?.[size];
  if (late == null) return null;
  if (m.city && size !== 'city') return null;
  // Not every place had a mill or became a tech hub; the hash decides which did.
  if (m.industrial && hash(`${regionId}:mill`) % 3 === 0) return null;
  if (m.id === 'techHub' && hash(`${regionId}:tech`) % 3 !== 0) return null;
  const jitter = (hash(`${regionId}:${m.id}`) % 11) - 5;
  // The works closed later where the planned economy kept them open, then all at once after 1990.
  if (m.id === 'closure' && SOCIALIST_PAST.includes(cc)) return 1991 + (hash(regionId) % 4);
  return m.base + lagFor(cc, m) + late + jitter;
}
const SOCIALIST_PAST = ['RU', 'PL', 'CZ', 'HU', 'RO', 'BG', 'UA', 'BY', 'DD', 'SK', 'LT', 'LV', 'EE', 'AL'];
const socialistNow = (state) => ['totalitarian', 'oneParty'].includes(regimeHere(state).kind) && regimeHere(state).business === 'state';

/** The place's history so far, oldest first: [{ id, year, icon, text, yours }]. */
export function townHistory(state, regionId = state.character.regionId) {
  const seen = state.world?.townStory?.[regionId] ?? {};
  const name = REGIONS[regionId]?.name?.split(',')[0] ?? 'the town';
  return MILESTONES.filter((m) => seen[m.id]).map((m) => ({ id: m.id, year: seen[m.id].year, icon: m.icon, text: m.text(name, seen[m.id].socialist, state.character.countryId ?? 'US'), yours: seen[m.id].yours })).sort((a, b) => a.year - b.year);
}

export function townTick(ctx) {
  const { state } = ctx;
  const regionId = state.character.regionId;
  if (!regionId || !REGIONS[regionId]) return;
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  state.world.townStory ??= {};
  const first = !state.world.townStory[regionId];
  const seen = (state.world.townStory[regionId] ??= {});
  const name = REGIONS[regionId].name.split(',')[0];
  const socialist = socialistNow(state);
  for (const m of MILESTONES) {
    if (seen[m.id]) continue;
    if (m.needs && !seen[m.needs]) continue;
    if (m.notSocialist && socialist) continue;
    const due = dueYear(m, regionId, cc);
    if (due == null || due > y) continue;
    // A place you arrive in already has its past.
    if (first || due < y - 1) { seen[m.id] = { year: due, yours: false, socialist }; continue; }
    seen[m.id] = { year: y, yours: true, socialist };
    const c = ensureCity(state, regionId);
    for (const [k, v] of Object.entries(m.fx ?? {})) c[k] = Math.max(k === 'prices' ? 30 : 0, Math.min(k === 'pop' ? 300 : k === 'prices' ? 400 : 100, Math.round((c[k] ?? 50) + v)));
    if (m.trend && state.neighbourhood?.[regionId]) state.neighbourhood[regionId].trend = Math.max(-1, Math.min(1, (state.neighbourhood[regionId].trend ?? 0) + m.trend));
    if (m.health) ctx.stat('health', m.health);
    ctx.stat('happiness', (m.fx?.mood ?? 0) > 0 ? 1 : (m.fx?.mood ?? 0) < -5 ? -3 : 0);
    ctx.log(m.text(name, socialist, cc), m.icon, (m.fx?.jobs ?? 0) < -5 ? 'bad' : 'info');
    ctx.emit('news:story', { tier: 'local', headline: m.text(name, socialist, cc).split('.')[0], weight: 4, icon: m.icon });
  }
}

export const TownStoryModule = {
  id: 'townStory',
  order: 44.6,
  onAgeUp(ctx) {
    townTick(ctx);
  },
};
