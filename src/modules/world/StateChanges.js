/**
 * The map can change: new states form and old ones dissolve.
 *
 *   Secession    a nation inside a state votes to leave (Scotland, Wales, Quebec, Catalonia, Flanders,
 *                Iraqi Kurdistan, Republika Srpska) and becomes a state of its own two years later:
 *                its own name, flag, rulers and (sometimes) money on every city in it.
 *   Transfer     a province joins another country (Northern Ireland to Ireland).
 *   Union        a country dissolves into another (Korea reunified, Moldova into Romania): its cities
 *                fly the other's flag, use its money and obey its government; its people are the other's
 *                citizens, and it leaves the UN.
 *   Reintegration a breakaway state ends (Cyprus reunified, Transnistria back to Moldova).
 *
 * Each can be put to a referendum by a head of government (politics/Referendums.js); after the present
 * they also happen on their own, now and then. The map is redrawn through the city-state layer
 * (HistoricalData.js regionStateAt), so everything that reads a city's state follows.
 *
 * state.world.stateChanges = [{ id, kind, year, ... }]
 */
import { setDynamicRegions, setDissolved, setNewStates } from './NewStates.js';
import { setFormed } from './Habitation.js';
import { COUNTRIES, FOREIGN_CITIES } from './Countries.js';
import { yearNow, PRESENT } from './Eras.js';

/** Nations that might leave: the province, what the state would be called, who would lead it, its flag. */
export const SECESSIONS = {
  'GB-SCT': { code: 'XS', cc: 'GB', name: 'Scotland', state: 'the Republic of Scotland', leader: 'the First Minister of Scotland', flag: 'scotland', support: 0.45, from: 1970, of: 'the United Kingdom' },
  'GB-WLS': { code: 'XW', cc: 'GB', name: 'Wales', state: 'Wales (Cymru), an independent country', leader: 'the First Minister of Wales', flag: 'wales', support: 0.3, from: 1999, of: 'the United Kingdom' },
  'CA-QC': { code: 'XQ', cc: 'CA', name: 'Quebec', state: 'the sovereign State of Quebec', leader: 'the Premier of Quebec', flag: 'quebec', support: 0.42, from: 1976, of: 'Canada' },
  'ES-CT': { code: 'XC', cc: 'ES', name: 'Catalonia', state: 'the Catalan Republic', leader: 'the President of the Generalitat', flag: 'catalonia', support: 0.44, from: 1980, of: 'Spain', currency: ['EUR', '€', 'euro', 1, null] },
  'BE-VAN': { code: 'XF', cc: 'BE', name: 'Flanders', state: 'the Republic of Flanders', leader: 'the Minister-President of Flanders', flag: 'flanders', support: 0.3, from: 1993, of: 'Belgium' },
  'IQ-AR': { code: 'XD', cc: 'IQ', name: 'Kurdistan', state: 'the Republic of Kurdistan', leader: 'the President of Kurdistan', flag: 'kurdistan', support: 0.6, from: 1992, of: 'Iraq' },
  'PG-NSB': { cc: 'PG', name: 'Bougainville', state: 'the Republic of Bougainville', leader: 'the President of Bougainville', flag: 'bougainville', support: 0.6, from: 2001, of: 'Papua New Guinea' },
  'BA-SRP': { code: 'XR', cc: 'BA', name: 'Republika Srpska', state: 'Republika Srpska, an independent state', leader: 'the President of Republika Srpska', flag: 'srpska', support: 0.5, from: 1996, of: 'Bosnia and Herzegovina' },
};
/** A province that might join another country. */
export const TRANSFERS = {
  'GB-NIR': { cc: 'GB', to: 'IE', name: 'Northern Ireland', state: 'Ireland (the six counties, reunited)', leader: 'the Taoiseach', flag: 'IE', currency: ['EUR', '€', 'euro', 1.15, null], support: 0.42, from: 1998 },
};
/** Countries that might merge into another. */
export const UNIONS = {
  KP: { into: 'KR', name: 'Korea, reunified', leader: 'the President of Korea', flag: 'KR', currency: ['KRW', '₩', 'won', null, null], support: 0.5, from: 1991 },
  BH: { into: 'SA', name: 'the Gulf Union (Bahrain, in union with Saudi Arabia)', leader: 'the King of Saudi Arabia', flag: 'SA', currency: ['SAR', '﷼', 'Saudi riyal', 10, null], support: 0.3, from: 2011 },
  MD: { into: 'RO', name: 'Romania (the former Republic of Moldova)', leader: 'the President of Romania', flag: 'RO', currency: ['RON', 'lei ', 'leu', null, null], support: 0.35, from: 1991 },
};
/** Breakaway states that might end, their cities handed back. */
export const REINTEGRATIONS = {
  northCyprus: { cc: 'CY', cities: ['kyrenia', 'famagusta'], name: 'Cyprus, reunified', support: 0.45, from: 1983 },
  transnistria: { cc: 'MD', cities: ['tiraspol'], name: 'Moldova, whole again', support: 0.3, from: 1992 },
  somaliland: { cc: 'SO', cities: ['hargeisa', 'berbera'], name: 'Somalia reunited with Somaliland', support: 0.2, from: 1995 },
};
/** States that exist in fact, recognised by the world: their own country from then on. */
export const RECOGNITIONS = {
  somaliland: { cc: 'SO', cities: ['hargeisa', 'berbera'], name: 'the Republic of Somaliland (recognised)', leader: 'the President of Somaliland', flag: 'somaliland', support: 0.4, from: 1995, label: 'Somaliland recognised as a state' },
  sahrawi: { cc: 'EH', name: 'the Sahrawi Arab Democratic Republic', leader: 'the President of the SADR', support: 0.35, from: 1976, label: 'the Sahrawi Republic independent', whole: true },
};

/**
 * What a war's end does to the map, by the war (world/War.js theatres) and how it ended. A conquest
 * puts cities under the victor: its flag, its rulers, its money; a whole country conquered is gone.
 */
export const WAR_MAP = {
  koreanWar: { victory: { union: 'KP' }, defeat: { id: 'southKorea', ccs: ['KR'], into: 'KP', name: 'South Korea under the North\'s occupation', leader: 'the Workers\' Party of Korea', kind: 'authoritarian', flag: 'KP', currency: ['KPW', '₩', 'North Korean won', 7, null] } },
  loc: { defeat: { id: 'kashmir', cities: ['srinagar'], name: 'Pakistani-held Kashmir', leader: 'the Pakistani administration in Muzaffarabad', kind: 'authoritarian', flag: 'PK', currency: ['PKR', 'Rs ', 'Pakistani rupee', 3.4, null] } },
  natoEast: { defeat: { id: 'baltics', ccs: ['EE', 'LV', 'LT'], into: 'RU', name: 'the Russian-occupied Baltic states', leader: 'the Russian-installed administration', kind: 'authoritarian', flag: 'RU', currency: ['RUB', '₽', 'Russian ruble', 90, null] } },
  taiwan: { defeat: { id: 'taiwan', ccs: ['TW'], into: 'CN', name: 'Taiwan under the People\'s Republic', leader: 'the Chinese Communist Party', kind: 'authoritarian', flag: 'CN', currency: ['CNY', '¥', 'renminbi', 0.23, null] } },
  mindanao: { rebels: { id: 'bangsamoro', cities: ['davao', 'mati', 'samal'], name: 'the rebel-held zone of Mindanao (the Bangsamoro fighters\' territory)', leader: 'the rebel command', kind: 'authoritarian', flag: null } },
};
const OUTCOME = (o) => (/clear victory|insurgency broken/.test(o) ? 'victory' : /defeat and lost territory/.test(o) ? 'defeat' : /armed groups in control/.test(o) ? 'rebels' : null);

const citiesOf = (cc, province) => Object.values(FOREIGN_CITIES).filter((c) => c.country === cc && (!province || c.state === province)).map((c) => c.id);
const changes = (state) => ((state.world ??= {}).stateChanges ??= []);

/** Rebuild the redrawn map from the life's record of changes. */
export function applyChanges(state) {
  const dyn = {};
  const gone = {};
  const row = (ids, r) => { for (const id of ids) (dyn[id] ??= []).push(r); };
  for (const c of changes(state)) {
    if (c.kind === 'secession') { const s = SECESSIONS[c.province]; row(citiesOf(s.cc, c.province), { from: c.year, to: null, name: s.state, leader: s.leader, kind: 'democracy', flag: s.flag, currency: s.currency ?? null }); }
    if (c.kind === 'transfer') { const s = TRANSFERS[c.province]; row(citiesOf(s.cc, c.province), { from: c.year, to: null, name: s.state, leader: s.leader, kind: 'democracy', flag: s.flag, currency: s.currency ?? null }); }
    if (c.kind === 'union') { const u = UNIONS[c.cc]; gone[c.cc] = { year: c.year, into: u.into }; row(citiesOf(c.cc), { from: c.year, to: null, name: u.name, leader: u.leader, kind: 'democracy', flag: u.flag, currency: u.currency ?? null }); }
    if (c.kind === 'conquest') {
      const w = Object.values(WAR_MAP).flatMap((m) => Object.values(m)).find((x) => x.id === c.key);
      if (w) {
        row(w.cities ?? w.ccs.flatMap((cc) => citiesOf(cc)), { from: c.year, to: null, name: w.name, leader: w.leader, kind: w.kind, flag: w.flag, currency: w.currency ?? null });
        for (const cc of w.ccs ?? []) gone[cc] = { year: c.year, into: w.into };
      }
    }
    if (c.kind === 'recognition') {
      const r = RECOGNITIONS[c.id.split(':')[1]];
      if (r.cities) row(r.cities, { from: c.year, to: null, name: r.name, leader: r.leader, kind: 'democracy', flag: r.flag, currency: null });
    }
    if (c.kind === 'reintegration') { const r = REINTEGRATIONS[c.id.split(':')[1]]; row(r.cities, { from: c.year, to: null, clear: true }); }
  }
  setDynamicRegions(dyn);
  setDissolved(gone);
  // The new states are countries of their own from the day they form (packs/sketches/Latent.js).
  const formed = {};
  for (const c of changes(state)) if (c.kind === 'secession' && SECESSIONS[c.province].code) formed[SECESSIONS[c.province].code] = c.year;
  setFormed(formed);
  const indep = { ...(state.world?.independent ?? {}) };
  for (const [code, year] of Object.entries(formed)) indep[code] = { year, of: Object.values(SECESSIONS).find((s) => s.code === code).cc };
  setNewStates(indep);
}
/** The new state's city for one of its parent's (the same place, under the new flag), else its capital. */
export function newStateCity(code, parentCity) {
  const own = Object.values(FOREIGN_CITIES).filter((c) => c.country === code);
  return own.find((c) => c.id === `${code.toLowerCase()}_${parentCity}`)?.id ?? own[0]?.id ?? null;
}

const done = (state, id) => changes(state).some((c) => c.id === id);
/** Record a change (taking effect in `year`, the year of the vote plus the transition). */
export function redraw(ctx, change) {
  const { state } = ctx;
  if (done(state, change.id)) return false;
  changes(state).push(change);
  applyChanges(state);
  return true;
}
export const secedeProvince = (ctx, province, delay = 2) => redraw(ctx, { id: `secession:${province}`, kind: 'secession', province, year: yearNow(ctx.state) + delay });
export const transferProvince = (ctx, province, delay = 2) => redraw(ctx, { id: `transfer:${province}`, kind: 'transfer', province, year: yearNow(ctx.state) + delay });
export const mergeCountry = (ctx, cc, delay = 1) => redraw(ctx, { id: `union:${cc}`, kind: 'union', cc, year: yearNow(ctx.state) + delay });
/** The world recognises a state: Somaliland's cities under their own flag; Western Sahara free of Morocco. */
export function recognise(ctx, id, delay = 1) {
  const r = RECOGNITIONS[id];
  const year = yearNow(ctx.state) + delay;
  if (!redraw(ctx, { id: `recognition:${id}`, kind: 'recognition', year })) return false;
  if (r.whole) {
    // The ruler's stage ends, and the country is its own (world/NewStates.js).
    const rec = ((ctx.state.era ??= {}).colonies ??= {})[r.cc] ??= { done: [], pressure: 0 };
    rec.done = [...new Set([...(rec.done ?? []), 0, 1, 2, 3])];
    (ctx.state.world.independent ??= {})[r.cc] = { year, of: null };
    const w = (ctx.state.world.reforms ??= {});
    w[r.cc] = { kind: 'democracy', name: r.name, leader: r.leader, elections: 'free', press: 'free' };
    applyChanges(ctx.state);
  }
  return true;
}
export const reintegrate = (ctx, id, delay = 1) => redraw(ctx, { id: `reintegration:${id}`, kind: 'reintegration', year: yearNow(ctx.state) + delay });

/** What a head of government here could put to the people. */
export function changeQuestions(state) {
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  const out = [];
  for (const [p, s] of Object.entries(SECESSIONS)) if (s.cc === cc && y >= s.from && !done(state, `secession:${p}`)) out.push({ q: `secession:${p}`, label: `🏳️ Independence for ${s.name}`, support: s.support });
  for (const [p, s] of Object.entries(TRANSFERS)) if (s.cc === cc && y >= s.from && !done(state, `transfer:${p}`)) out.push({ q: `transfer:${p}`, label: `🤝 ${s.name} to join ${COUNTRIES[s.to].name}`, support: s.support });
  for (const [from, u] of Object.entries(UNIONS)) if ((cc === from || cc === u.into) && y >= u.from && !done(state, `union:${from}`)) out.push({ q: `union:${from}`, label: `🤝 Union: ${COUNTRIES[from].name} into ${COUNTRIES[u.into].name}`, support: u.support });
  for (const [id, r] of Object.entries(RECOGNITIONS)) if (r.cc === cc && y >= r.from && !done(state, `recognition:${id}`) && !done(state, `reintegration:${id}`)) out.push({ q: `recognition:${id}`, label: `🏳️ ${r.label}`, support: r.support });
  for (const [id, r] of Object.entries(REINTEGRATIONS)) if (r.cc === cc && y >= r.from && !done(state, `reintegration:${id}`)) out.push({ q: `reintegration:${id}`, label: `🕊️ ${r.name}`, support: r.support });
  return out;
}
/** Carry out a question that passed. */
export function enact(ctx, q) {
  const [kind, key] = q.split(':');
  if (kind === 'secession') return secedeProvince(ctx, key) && `${SECESSIONS[key].name} will leave ${SECESSIONS[key].of}: independence in two years.`;
  if (kind === 'transfer') return transferProvince(ctx, key) && `${TRANSFERS[key].name} will join ${COUNTRIES[TRANSFERS[key].to].name}.`;
  if (kind === 'union') return mergeCountry(ctx, key) && `${COUNTRIES[key].name} will join ${COUNTRIES[UNIONS[key].into].name}.`;
  if (kind === 'reintegration') return reintegrate(ctx, key) && `${REINTEGRATIONS[key].name}.`;
  if (kind === 'recognition') return recognise(ctx, key) && `${RECOGNITIONS[key].label}.`;
  return null;
}
export const changeTitle = (q) => {
  const [kind, key] = q.split(':');
  return kind === 'secession' ? `${SECESSIONS[key].name}'s independence` : kind === 'transfer' ? `${TRANSFERS[key].name} joining ${COUNTRIES[TRANSFERS[key].to].name}` : kind === 'union' ? `union with ${COUNTRIES[UNIONS[key].into].name}` : kind === 'recognition' ? RECOGNITIONS[key].label : `${REINTEGRATIONS[key].name}`;
};

/** A number in [0, 1) fixed by the life, the year and the question (the life's dice stay untouched). */
function roll(state, y, salt) {
  let h = (y * 2654435761) ^ ((state.character.birthYear ?? 0) * 40503);
  for (const ch of `${state.character.firstName}${state.character.lastName}${salt}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
/** The year-by-year odds of each change happening on its own, after the present. */
const DRIFT = 0.003;

/** A war's end redraws the map (WAR_MAP). */
function warEnded(ctx, war, outcome) {
  const how = OUTCOME(outcome ?? '');
  const m = WAR_MAP[war?.id]?.[how];
  if (!m) return;
  const { state } = ctx;
  if (m.union) { mergeCountry(ctx, m.union, 0); return; }
  if (!redraw(ctx, { id: `conquest:${m.id}`, kind: 'conquest', key: m.id, year: yearNow(state), announced: true })) return;
  const here = state.character.regionId;
  const cc = state.character.countryId ?? 'US';
  const mine = (m.cities ?? []).includes(here) || (m.ccs ?? []).includes(cc);
  if (mine) ctx.log(`🏴 The war is lost, and your home with it: you live in ${m.name} now.`, '🏴', 'bad');
  ctx.emit?.('news:story', { tier: mine ? 'national' : 'world', headline: `The map changes: ${m.name}`, weight: 9, icon: '🗺️' });
}

export const StateChangesModule = {
  id: 'stateChanges',
  order: 34.5,
  init(state) { applyChanges(state); },
  setup(engine) { engine.bus.on('world:peace', ({ ctx, war, outcome }) => { if (ctx) warEnded(ctx, war, outcome); }); },
  onAgeUp(ctx) {
    const { state } = ctx;
    const y = yearNow(state);
    const cc = state.character.countryId ?? 'US';
    const here = state.character.regionId;
    // The day it happens.
    for (const c of changes(state)) {
      if (c.year !== y || c.announced || c.kind === 'conquest') continue;
      c.announced = true;
      const rk = c.id.split(':')[1];
      const mine = c.kind === 'union' ? c.cc === cc : c.kind === 'recognition' ? (RECOGNITIONS[rk].cities ? RECOGNITIONS[rk].cities.includes(here) : RECOGNITIONS[rk].cc === cc) : c.kind === 'reintegration' ? REINTEGRATIONS[c.id.split(':')[1]].cities.includes(here) : FOREIGN_CITIES[here]?.state === c.province && cc === (SECESSIONS[c.province] ?? TRANSFERS[c.province]).cc;
      const title = c.kind === 'secession' ? `${SECESSIONS[c.province].name} is independent` : c.kind === 'transfer' ? `${TRANSFERS[c.province].name} joins ${COUNTRIES[TRANSFERS[c.province].to].name}` : c.kind === 'union' ? `${COUNTRIES[c.cc].name} joins ${COUNTRIES[UNIONS[c.cc].into].name}` : c.kind === 'recognition' ? RECOGNITIONS[rk].label : REINTEGRATIONS[c.id.split(':')[1]].name;
      ctx.emit?.('news:story', { tier: mine ? 'national' : 'world', headline: title, weight: 9, icon: '🗺️' });
      if (!mine) continue;
      if (c.kind === 'secession') {
        const s = SECESSIONS[c.province];
        // Its people are its citizens now (keeping the old passport too, as most new states allowed).
        if (s.code) {
          const city = newStateCity(s.code, here);
          if (city) { state.character.countryId = s.code; state.character.regionId = city; }
          const cit = (state.character.citizenships ??= [cc]);
          if (!cit.includes(s.code)) cit.unshift(s.code);
        }
        ctx.log(`🏳️ Independence Day: you live in ${s.state} now, and you're one of its citizens: a new passport, a new flag on the public buildings, a new seat at the UN. You can keep your ${COUNTRIES[s.cc].demonym ?? 'old'} passport too.`, '🏳️', 'milestone');
      }
      else if (c.kind === 'transfer') { ctx.log(`🤝 ${TRANSFERS[c.province].name} has joined ${COUNTRIES[TRANSFERS[c.province].to].name}. You're entitled to its citizenship, and most people take it.`, '🤝', 'milestone'); const cit = (state.character.citizenships ??= [cc]); if (!cit.includes(TRANSFERS[c.province].to)) cit.push(TRANSFERS[c.province].to); }
      else if (c.kind === 'union') { const into = UNIONS[c.cc].into; ctx.log(`🗺️ ${COUNTRIES[c.cc].name} has ceased to exist as a state: it is part of ${COUNTRIES[into].name} now. You are a citizen of ${COUNTRIES[into].name}.`, '🗺️', 'milestone'); const cit = (state.character.citizenships ??= [cc]); if (!cit.includes(into)) cit.push(into); }
      else if (c.kind === 'recognition') ctx.log(`🏳️ ${RECOGNITIONS[rk].label}: embassies open, and your passport is good for the world now.`, '🏳️', 'milestone');
      else ctx.log(`🕊️ ${REINTEGRATIONS[c.id.split(':')[1]].name}: the checkpoints come down.`, '🕊️', 'milestone');
    }
    // After the present, the map moves on its own now and then.
    if (y <= PRESENT) return;
    const pick = (id, ok) => !done(state, id) && ok && roll(state, y, id) < DRIFT;
    for (const [p, s] of Object.entries(SECESSIONS)) if (pick(`secession:${p}`, s.support >= 0.4)) secedeProvince(ctx, p);
    for (const p of Object.keys(TRANSFERS)) if (pick(`transfer:${p}`, true)) transferProvince(ctx, p);
    for (const from of Object.keys(UNIONS)) if (pick(`union:${from}`, true)) mergeCountry(ctx, from);
    for (const id of Object.keys(REINTEGRATIONS)) if (pick(`reintegration:${id}`, true) && !done(state, `recognition:${id}`)) reintegrate(ctx, id);
    for (const id of Object.keys(RECOGNITIONS)) if (pick(`recognition:${id}`, true) && !done(state, `reintegration:${id}`)) recognise(ctx, id);
  },
};
