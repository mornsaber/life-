/**
 * History, loosely: the twentieth century happens around you, but not on rails. Each event
 * has a window (the Great War between 1912 and 1917, the Depression between 1927 and 1932);
 * within it the year drifts, some events can fail to happen, and what follows depends on what
 * did. No fascist Germany, no Second World War; a Soviet Union that never falls stays.
 *
 *   wars          the world wars, Spain, Korea, Vietnam and Afghanistan, fought through
 *                 world/War.js: the draft, the home front, mobilisation, casualties
 *   economy       the Depression, the oil shock, the dot-com bust, the 2008 crash, a pandemic
 *   regimes       revolutions and dictators (Eras.js PERIODS), which decide what you may do
 *   colonies      foreign rule (Eras.js COLONIES), the movement for independence, and the day
 *                 it comes: sometimes by negotiation, sometimes after a war
 *
 * A life started today has all of this behind it: nothing here runs for it.
 */
import { Random, clamp } from '../../core/Random.js';
import { addHonor } from '../../core/State.js';
import { COUNTRIES } from './Countries.js';
import { declareWarWith, endWarNow, warIn } from './War.js';
import { setEraLayer, setReformLayer } from './Regimes.js';
import { leaveJob } from '../career/CareerEngine.js';
import { LEGISLATURES } from '../politics/NationalOffices.js';
import { OFFICES } from '../politics/Offices.js';
import { commitOffense } from '../legal/JusticeSystem.js';
import { setAvailabilityFilter, getProfession } from '../career/JobTrees.js';
import { eraHidden } from './Eras.js';
import { setSegregationHook } from '../education/EducationEngine.js';
import { abolish } from './Houses.js';
import { CROWNS } from './Crown.js';
import { priceLevel } from './Countries.js';
import { AUTOMATED_BY, leavingAge, setEraYear } from './Eras.js';
import { PRESENT, PERIOD_THRONES, PERIOD_THRONE_YEARS, EVENT_THRONES, REPUBLIC_GAPS, republicGap, periodThrone, yearNow, eraLayer, COLONIES, colonyStage, colonyHere, stageEnd, rulerAdj, rulerName, RULER_CAPITAL, addEraWorkRule } from './Eras.js';
import { stateIdOf, REGIONS } from '../life/Regions.js';
import { skinToneOf } from '../people/SkinTone.js';
import { regimeHere } from './Regimes.js';
import { periodCountryName } from './Eras.js';

const cname = (cc) => COUNTRIES[cc]?.name ?? cc;
const hereOf = (state) => state.character.countryId ?? 'US';
const sideRng = (state, salt) => new Random((((state.world?.seed ?? 1) * 40503 + yearNow(state) * 7919 + salt) >>> 0));
const hap = (s, id) => Boolean(s.era?.events?.[id]);
const over = (s, id) => s.era?.events?.[id]?.ended != null;
const news = (ctx, headline, icon, tier = 'world', weight = 6) => ctx.emit('news:story', { tier, headline, weight, icon });
const only = (list) => list.filter((cc) => COUNTRIES[cc]);

/** The countries of a side, plus the colonies their rulers send to fight. */
function withEmpires(state, sides) {
  const out = new Set(only(sides));
  for (const cc of Object.keys(COLONIES)) {
    const st = colonyStage(state, cc);
    if (st && out.has(st.ruler) && COUNTRIES[cc]) out.add(cc);
  }
  return [...out];
}

function joinWar(ctx, cc, t) {
  if (warIn(ctx.state, cc)) return;
  const st = colonyStage(ctx.state, cc);
  const name = st && !t.own ? `${t.name} (as part of ${rulerName(st.ruler)}'s war)` : t.name;
  declareWarWith(ctx, cc, { scripted: true, ...t, name, home: t.homes?.[cc] ?? 0, intensity: t.intensities?.[cc] ?? t.intensity });
}
function endAll(ctx, id, outcomeOf) {
  for (const [cc, w] of Object.entries(ctx.state.world?.wars ?? {})) if (w.id === id) endWarNow(ctx, cc, outcomeOf(cc));
}

function recession(ctx, causeId, years, text) {
  const e = ctx.state.economy;
  if (!e) return;
  e.phase = 'recession';
  e.phaseYears = -years;
  e.cause = { id: causeId, since: ctx.state.character.age };
  ctx.log(text, '📉', 'warn');
}
function expropriate(ctx, who) {
  const f = ctx.state.finances;
  if (!f || f.cash < 50_000) return;
  const lost = Math.round(f.cash * 0.85);
  f.cash -= lost;
  ctx.log(`${who} seized private fortunes. You lost $${lost.toLocaleString()} — nearly everything.`, '🚩', 'bad');
}
const hereIs = (ctx, ...cc) => cc.includes(hereOf(ctx.state));
/** Your job is in this wave's way. */
function exposed(ctx, wave, text) {
  const job = ctx.state.career?.job;
  if (job && AUTOMATED_BY(job.professionId).includes(wave)) ctx.log(text, '⚠️', 'warn');
}
/** A throne of the period falls (the Kaiser, the Tsar): the house becomes a former ruling house. */
function fallThrone(ctx, cc, headline) {
  const r = ctx.state.world?.restored?.[cc];
  if (!r?.period) return;
  news(ctx, headline, '👑', 'world', 8);
  abolish(ctx, cc);
}

/* ------------------------------------------------------------------ */
/* Jim Crow: segregation in the American South until the Civil Rights Act */
/* ------------------------------------------------------------------ */

export const JIM_CROW = ['AL', 'AR', 'FL', 'GA', 'LA', 'MS', 'NC', 'SC', 'TN', 'TX', 'VA', 'OK', 'KY'];
const SEGREGATED_WORK = ['police', 'sheriff', 'statePolice', 'fire', 'stateFire', 'courts', 'prosecution', 'legislativeStaff', 'aviation', 'flightAttendant', 'finance', 'corporate', 'airTrafficControl'];
const inUS = (state) => (state.character.countryId ?? 'US') === 'US';
/** Segregation applies to you: a Black American in the South before the Civil Rights Act. */
export const jimCrowHere = (state) => Boolean(state.era) && yearNow(state) < PRESENT && inUS(state) && !hap(state, 'civilRights')
  && JIM_CROW.includes(stateIdOf(state)) && skinToneOf(state) >= 4;
/** A Black American anywhere before the Civil Rights Act: the movement is yours to join. */
const beforeCivilRights = (state) => Boolean(state.era) && yearNow(state) < PRESENT && inUS(state) && !hap(state, 'civilRights') && skinToneOf(state) >= 4 && yearNow(state) >= 1950;
setSegregationHook((state, uni) => segregatedFrom(state, uni));
setAvailabilityFilter((state, p) => !eraHidden(state, p));
addEraWorkRule((state, profession) => (jimCrowHere(state) && SEGREGATED_WORK.includes(profession?.id) ? 'Closed to Black applicants under Jim Crow' : null));
/** A university in a segregated state turns you away. */
export const segregatedFrom = (state, uni) => (jimCrowHere(state) && uni?.country === 'US' && uni.type !== 'online' && JIM_CROW.includes(stateOfRegion(uni.region)) ? 'Segregated: the state\'s universities turn away Black students (study out of state)' : null);
const stateOfRegion = (regionId) => REGIONS[regionId]?.state ?? null;

function civilRightsPrompt(ctx) {
  const { state } = ctx;
  if (!beforeCivilRights(state) || state.character.age < 16 || state.legal?.incarceration) return;
  const cr = (state.era.civilRights ??= { pressure: 0 });
  if (cr.asked != null && yearNow(state) - cr.asked < 3) return;
  if (!sideRng(state, 0xc1).chance(0.4)) return;
  cr.asked = yearNow(state);
  ctx.prompt({ type: 'history.civilRights', icon: '✊🏿', title: 'The Movement', text: 'The civil rights movement is organising: bus boycotts, lunch-counter sit-ins, voter registration drives, marches. Marchers are being beaten and jailed, and some are killed.', options: [
    { id: 'march', label: '✊ March', hint: 'The front line; the police will be waiting' },
    { id: 'register', label: '🗳️ Register voters door to door', hint: 'Quiet, dangerous work' },
    { id: 'support', label: '🤝 Support it: money, meals, a ride to the march', hint: 'From the second line' },
    { id: 'out', label: '🏠 Keep your family safe', hint: 'No one blames you' },
  ], data: {} });
}

/* ------------------------------------------------------------------ */
/* The timeline                                                        */
/* ------------------------------------------------------------------ */

const WW1_ALLIES = ['GB', 'FR', 'RU', 'IT', 'JP', 'BE', 'RO', 'PT', 'GR', 'CA', 'AU', 'NZ'];
const WW1_CENTRAL = ['DE', 'AT', 'TR'];
const WW2_ALLIES = ['GB', 'FR', 'RU', 'CN', 'PL', 'NL', 'BE', 'NO', 'GR', 'DK', 'CA', 'AU', 'NZ'];

/**
 * id: { at (our history), window [from, to], lasts (years, rolled), odds (that it happens at
 * all), needs (state → bool), start(ctx, rec, rng), end(ctx, rec, rng), tick(ctx, rec, rng) }
 */
export const EVENTS = {
  /* ---------------- The nineteenth century ---------------- */
  napoleonicWars: {
    at: 1803, window: [1800, 1805], lasts: [9, 12],
    start(ctx) {
      const t = { id: 'napoleonicWars', name: 'the Napoleonic Wars', operation: 'the Napoleonic Wars', intensity: 4, homes: { ES: 0.5, PT: 0.4, AT: 0.4, DE: 0.4, RU: 0.3, IT: 0.3, PL: 0.4 } };
      joinWar(ctx, 'FR', { ...t, adversary: 'the coalitions of Europe' });
      for (const cc of only(['GB', 'AT', 'RU', 'DE', 'ES', 'PT', 'SE', 'NL'])) joinWar(ctx, cc, { ...t, adversary: 'Napoleon\'s France' });
      news(ctx, 'Napoleon\'s armies march across Europe', '⚔️', 'world', 9);
    },
    end(ctx, rec, rng) {
      rec.outcome = rng.chance(0.85) ? 'coalition' : 'france';
      endAll(ctx, 'napoleonicWars', (cc) => ((cc === 'FR') === (rec.outcome === 'france') ? 'ended in victory' : 'ended in defeat'));
      news(ctx, rec.outcome === 'coalition' ? 'Napoleon defeated at Waterloo; exiled to St Helena' : 'Napoleon dictates the peace of Europe', '🕊️', 'world', 10);
    },
  },
  napoleonFalls: { at: 1814, window: [1812, 1816], needs: (s) => hap(s, 'napoleonicWars') && s.era.events.napoleonicWars.outcome !== 'france', start(ctx) { if (hereIs(ctx, 'FR')) ctx.log('The Emperor has abdicated. A Bourbon king is back on the throne of France.', '👑', 'milestone'); } },
  latinIndependence: { at: 1810, window: [1808, 1812], start(ctx) { news(ctx, 'Revolt against Spain spreads across the Americas', '✊', 'world', 8); } },
  war1812: {
    at: 1812, window: [1811, 1813], lasts: [2, 3], odds: 0.85,
    start(ctx) { joinWar(ctx, 'US', { id: 'war1812', name: 'the War of 1812', adversary: 'Britain', operation: 'the War of 1812', intensity: 2, homes: { US: 0.15, CA: 0.3 } }); joinWar(ctx, 'CA', { id: 'war1812', name: 'the War of 1812', adversary: 'the United States', operation: 'the War of 1812', intensity: 2, homes: { CA: 0.3 } }); news(ctx, 'War between America and Britain', '⚔️'); },
    end(ctx) { endAll(ctx, 'war1812', () => 'ended in a peace that changed nothing'); },
  },
  cholera: {
    at: 1832, window: [1830, 1834], lasts: [2, 3],
    start(ctx) { news(ctx, 'Cholera arrives: thousands dead in the cities', '🦠', 'world', 8); ctx.log('Cholera is in the city. Nobody knows how it spreads; the rich are leaving for the country.', '🦠', 'warn'); },
    tick(ctx, rec, rng) { if (rng.chance(0.2)) { ctx.stat('health', -rng.int(10, 25)); ctx.log('You caught the cholera and lived. Many on your street didn\'t.', '🤒', 'bad'); } },
  },
  abolitionUK: { at: 1833, window: [1831, 1836], start(ctx) { news(ctx, 'Parliament abolishes slavery across the British Empire', '⛓️', 'world', 8); } },
  opiumWar: {
    at: 1839, window: [1838, 1841], lasts: [2, 4],
    start(ctx) { joinWar(ctx, 'CN', { id: 'opiumWar', name: 'the Opium War', adversary: 'Britain', operation: 'the Opium War', intensity: 2, homes: { CN: 0.3 }, own: true }); joinWar(ctx, 'GB', { id: 'opiumWar', name: 'the Opium War', adversary: 'Qing China', operation: 'the First Opium War', intensity: 1 }); news(ctx, 'Britain goes to war with China over opium', '⚔️'); },
    end(ctx) { endAll(ctx, 'opiumWar', (cc) => (cc === 'CN' ? 'ended in defeat and an unequal treaty' : 'ended in victory')); },
  },
  irishFamine: {
    at: 1845, window: [1845, 1846], lasts: [4, 5],
    start(ctx) { news(ctx, 'The potato blight: famine in Ireland', '🥔', 'world', 8); if (hereIs(ctx, 'IE')) ctx.log('The potatoes have rotted in the ground. There is famine, and the landlords are still shipping grain to England.', '🥔', 'bad'); },
    tick(ctx, rec, rng) { if (hereIs(ctx, 'IE') && rng.chance(0.3)) { ctx.stat('health', -rng.int(8, 20)); ctx.log(['Hunger and fever went through the family this winter.', 'Half the townland has gone to America on the coffin ships.'][yearNow(ctx.state) % 2], '🥔', 'bad'); } },
  },
  mexicanAmericanWar: {
    at: 1846, window: [1845, 1847], lasts: [2, 2], odds: 0.9,
    start(ctx) { joinWar(ctx, 'US', { id: 'mexicanAmericanWar', name: 'the Mexican–American War', adversary: 'Mexico', operation: 'the Mexican War', intensity: 2 }); joinWar(ctx, 'MX', { id: 'mexicanAmericanWar', name: 'the Mexican–American War', adversary: 'the United States', operation: 'the war with the United States', intensity: 3, homes: { MX: 0.4 } }); news(ctx, 'War between the United States and Mexico', '⚔️'); },
    end(ctx) { endAll(ctx, 'mexicanAmericanWar', (cc) => (cc === 'MX' ? 'ended in defeat and the loss of half the country' : 'ended in victory')); },
  },
  revolutions1848: { at: 1848, window: [1847, 1849], start(ctx) { news(ctx, 'Revolution sweeps Europe: barricades in Paris, Vienna, Berlin', '🔥', 'world', 9); if (hereIs(ctx, 'FR', 'DE', 'AT', 'IT', 'HU')) ctx.log('There are barricades in the streets. The king has fled; everyone is talking about a constitution.', '🔥', 'milestone'); } },
  secondEmpire: { at: 1852, window: [1851, 1853], needs: (s) => hap(s, 'revolutions1848'), start(ctx) { if (hereIs(ctx, 'FR')) ctx.log('Napoleon\'s nephew has made himself Emperor of the French.', '👑', 'milestone'); } },
  taiping: {
    at: 1850, window: [1849, 1852], lasts: [12, 14],
    start(ctx) { joinWar(ctx, 'CN', { id: 'taiping', name: 'the Taiping Rebellion', adversary: 'the Taiping Heavenly Kingdom', operation: 'the Taiping Rebellion', intensity: 4, homes: { CN: 0.6 }, internal: true, own: true }); news(ctx, 'A rebel "Heavenly Kingdom" rises in southern China', '🔥'); },
    end(ctx) { endAll(ctx, 'taiping', () => 'ended with the rebellion crushed, and twenty million dead'); },
  },
  crimeanWar: {
    at: 1853, window: [1852, 1854], lasts: [2, 3],
    start(ctx) {
      const t = { id: 'crimeanWar', name: 'the Crimean War', operation: 'the Crimean War', intensity: 3 };
      joinWar(ctx, 'RU', { ...t, adversary: 'Britain, France and the Ottomans', homes: { RU: 0.2 } });
      for (const cc of only(['GB', 'FR', 'TR', 'IT'])) joinWar(ctx, cc, { ...t, adversary: 'Russia' });
      news(ctx, 'War in the Crimea', '⚔️', 'world', 8);
    },
    end(ctx) { endAll(ctx, 'crimeanWar', (cc) => (cc === 'RU' ? 'ended in defeat' : 'ended in victory')); },
  },
  indianRebellion: {
    at: 1857, window: [1856, 1858], lasts: [1, 2],
    start(ctx) { joinWar(ctx, 'IN', { id: 'indianRebellion', name: 'the Rebellion of 1857', adversary: 'the Company\'s army', operation: 'the Rebellion', intensity: 3, homes: { IN: 0.5 }, internal: true, own: true }); news(ctx, 'Rebellion against the East India Company in India', '🔥', 'world', 8); },
    end(ctx) { endAll(ctx, 'indianRebellion', () => 'ended with the rising crushed and the Company abolished'); },
  },
  italianUnification: { at: 1861, window: [1859, 1866], start(ctx) { news(ctx, 'A Kingdom of Italy is proclaimed', '🇮🇹', 'world', 8); if (hereIs(ctx, 'IT')) ctx.log('Garibaldi\'s redshirts and the King of Sardinia have made Italy one kingdom.', '🇮🇹', 'milestone'); } },
  serfdomEnds: { at: 1861, window: [1855, 1865], start(ctx) { news(ctx, 'The Tsar frees Russia\'s serfs', '⛓️', 'world', 7); if (hereIs(ctx, 'RU', 'UA')) ctx.log('The serfs are free. Free, and owing the landlord for the land they farm.', '⛓️', 'milestone'); } },
  usCivilWar: {
    at: 1861, window: [1859, 1863], lasts: [4, 5],
    start(ctx) {
      joinWar(ctx, 'US', { id: 'usCivilWar', name: 'the Civil War', adversary: 'the Confederacy', operation: 'the Civil War', intensity: 4, homes: { US: 0.45 }, internal: true, own: true });
      const w = warIn(ctx.state, 'US');
      if (w?.id === 'usCivilWar') w.draft = true;
      news(ctx, 'Civil war: the Southern states secede', '⚔️', 'world', 10);
    },
    end(ctx, rec, rng) {
      rec.outcome = rng.chance(0.85) ? 'union' : 'confederacy';
      endAll(ctx, 'usCivilWar', () => (rec.outcome === 'union' ? 'ended with the Union restored and slavery abolished' : 'ended with the South gone its own way'));
      news(ctx, rec.outcome === 'union' ? 'The Confederacy surrenders; slavery is abolished' : 'The South wins its independence', '🕊️', 'world', 10);
      if (hereIs(ctx, 'US')) ctx.log(rec.outcome === 'union' ? 'The war is over. Four million people who were enslaved are free.' : 'The war is over, and the country is two countries now.', '🕊️', 'milestone');
    },
  },
  meiji: { at: 1868, window: [1866, 1870], start(ctx) { news(ctx, 'Japan\'s shogun falls; the Emperor Meiji opens the country', '🎌', 'world', 8); if (hereIs(ctx, 'JP')) ctx.log('The Shōgun has fallen. The Emperor rules now, and everything is changing: railways, Western clothes, a conscript army.', '🎌', 'milestone'); } },
  francoPrussianWar: {
    at: 1870, window: [1869, 1871], lasts: [1, 1],
    start(ctx) { joinWar(ctx, 'FR', { id: 'francoPrussianWar', name: 'the Franco-Prussian War', adversary: 'Prussia', operation: 'the war with Prussia', intensity: 3, homes: { FR: 0.4 } }); joinWar(ctx, 'DE', { id: 'francoPrussianWar', name: 'the Franco-Prussian War', adversary: 'France', operation: 'the war with France', intensity: 3 }); news(ctx, 'France and Prussia at war', '⚔️', 'world', 8); },
    end(ctx) { endAll(ctx, 'francoPrussianWar', (cc) => (cc === 'FR' ? 'ended in defeat and the loss of Alsace-Lorraine' : 'ended in victory')); if (hereIs(ctx, 'FR')) ctx.log('The Emperor has been captured at Sedan. France is a republic again.', '🏛️', 'milestone'); },
  },
  germanUnification: { at: 1871, window: [1866, 1872], start(ctx) { news(ctx, 'The German Empire is proclaimed at Versailles', '🦅', 'world', 8); if (hereIs(ctx, 'DE')) ctx.log('The King of Prussia is German Emperor now. There is one Germany.', '🦅', 'milestone'); } },
  longDepression: { at: 1873, window: [1873, 1874], lasts: [6, 8], start(ctx) { news(ctx, 'Panic: banks fail from Vienna to New York', '📉', 'world', 8); recession(ctx, 'financial', 4, '📉 The Panic of 1873: banks have failed and the railways are bankrupt. The Long Depression has begun.'); } },
  scrambleForAfrica: { at: 1884, window: [1883, 1886], start(ctx) { news(ctx, 'The powers carve up Africa at Berlin', '🗺️', 'world', 8); } },
  brazilRepublic: { at: 1889, window: [1886, 1891], start(ctx) { fallThrone(ctx, 'BR', 'The Emperor of Brazil is deposed; a republic is proclaimed'); } },
  spanishAmericanWar: {
    at: 1898, window: [1897, 1899], lasts: [1, 1], odds: 0.9,
    start(ctx) { joinWar(ctx, 'US', { id: 'spanishAmericanWar', name: 'the Spanish–American War', adversary: 'Spain', operation: 'the war with Spain', intensity: 2 }); joinWar(ctx, 'ES', { id: 'spanishAmericanWar', name: 'the Spanish–American War', adversary: 'the United States', operation: 'the disaster of \'98', intensity: 2 }); news(ctx, 'Remember the Maine! America at war with Spain', '⚔️'); },
    end(ctx) { endAll(ctx, 'spanishAmericanWar', (cc) => (cc === 'ES' ? 'ended in defeat and the loss of the last colonies' : 'ended in victory')); },
  },
  boerWar: {
    at: 1899, window: [1898, 1900], lasts: [2, 3],
    start(ctx) { joinWar(ctx, 'ZA', { id: 'boerWar', name: 'the Boer War', adversary: 'the British Empire', operation: 'the war against the British', intensity: 3, homes: { ZA: 0.6 }, own: true }); for (const cc of only(['GB', 'CA', 'AU', 'NZ'])) joinWar(ctx, cc, { id: 'boerWar', name: 'the Boer War', adversary: 'the Boer republics', operation: 'the South African War', intensity: 2 }); news(ctx, 'War with the Boers in South Africa', '⚔️'); },
    end(ctx) { endAll(ctx, 'boerWar', (cc) => (cc === 'ZA' ? 'ended in defeat; the Boer republics annexed' : 'ended in victory')); },
  },
  russoJapaneseWar: {
    at: 1904, window: [1903, 1905], lasts: [1, 2],
    start(ctx) { joinWar(ctx, 'RU', { id: 'russoJapaneseWar', name: 'the Russo-Japanese War', adversary: 'Japan', operation: 'the war with Japan', intensity: 3 }); joinWar(ctx, 'JP', { id: 'russoJapaneseWar', name: 'the Russo-Japanese War', adversary: 'Russia', operation: 'the war with Russia', intensity: 3 }); news(ctx, 'Japan attacks the Russian fleet at Port Arthur', '⚔️', 'world', 8); },
    end(ctx) { endAll(ctx, 'russoJapaneseWar', (cc) => (cc === 'RU' ? 'ended in a humiliating defeat' : 'ended in victory')); },
  },
  ottomanEnd: { at: 1922, window: [1918, 1924], needs: (s) => over(s, 'ww1') || yearNow(s) >= 1923, start(ctx) { news(ctx, 'The Ottoman sultanate is abolished; a Turkish republic rises', '🌙', 'world', 8); if (hereIs(ctx, 'TR')) ctx.log('The Sultan is gone. The Republic of Turkey is proclaimed, and Atatürk is remaking everything.', '🌙', 'milestone'); } },
  xinhai: { at: 1911, window: [1908, 1913], start(ctx) { news(ctx, 'Revolution in China: the last emperor abdicates', '🏯'); if (hereIs(ctx, 'CN')) ctx.log('The Qing dynasty fell. China is a republic now — in name, at least; the warlords have other ideas.', '🏯', 'milestone'); } },
  ww1: {
    at: 1914, window: [1912, 1917], lasts: [3, 5],
    start(ctx, rec, rng) {
      const s = ctx.state;
      const allies = withEmpires(s, WW1_ALLIES);
      const central = withEmpires(s, WW1_CENTRAL);
      const homes = { FR: 0.4, BE: 0.6, RU: 0.3, DE: 0.1, AT: 0.25, IT: 0.2, RO: 0.35, TR: 0.15, GR: 0.1 };
      for (const cc of allies) joinWar(ctx, cc, { id: 'ww1', name: 'the Great War', adversary: 'the Central Powers', operation: 'the Great War', intensity: 4, homes, intensities: { CA: 3, AU: 3, NZ: 3, JP: 1, PT: 2, GR: 2 } });
      for (const cc of central) joinWar(ctx, cc, { id: 'ww1', name: 'the Great War', adversary: 'the Allies', operation: 'the Great War', intensity: 4, homes });
      rec.usJoins = rec.year + rng.int(2, 3);
      news(ctx, 'War in Europe: the great powers mobilise', '⚔️', 'world', 9);
    },
    tick(ctx, rec) { if (yearNow(ctx.state) === rec.usJoins) joinWar(ctx, 'US', { id: 'ww1', name: 'the Great War', adversary: 'the Central Powers', operation: 'the American Expeditionary Forces', intensity: 3 }); },
    end(ctx, rec, rng) {
      rec.outcome = rng.chance(0.85) ? 'allies' : 'central';
      const won = (cc) => (WW1_CENTRAL.includes(cc) ? rec.outcome === 'central' : rec.outcome === 'allies');
      endAll(ctx, 'ww1', (cc) => (won(cc) ? 'ended in victory and an armistice' : 'ended in defeat and a harsh peace'));
      if (rec.outcome === 'allies') { fallThrone(ctx, 'DE', 'The Kaiser abdicates; Germany is a republic'); fallThrone(ctx, 'AT', 'The Habsburg Emperor gives up the throne'); }
      news(ctx, rec.outcome === 'allies' ? 'Armistice: the guns fall silent on the Western Front' : 'The Central Powers dictate the peace', '🕊️', 'world', 9);
    },
  },
  spanishFlu: {
    at: 1918, window: [1917, 1920], lasts: [2, 2], needs: (s) => hap(s, 'ww1'),
    start(ctx) { news(ctx, 'Influenza pandemic sweeps the world', '🦠', 'world', 8); ctx.log('A new influenza is killing the young and the healthy. Schools and theatres are closing; masks are everywhere.', '🦠', 'warn'); },
    tick(ctx, rec, rng) {
      if (rng.chance(0.25)) { ctx.stat('health', -rng.int(8, 18)); ctx.log(['You caught the flu and spent three weeks in bed. You were luckier than many.', 'The flu went through your street. You survived it.'][yearNow(ctx.state) % 2], '🤒', 'bad'); }
    },
    end(ctx) { ctx.log('The influenza burned itself out. Tens of millions died worldwide.', '🕯️', 'info'); },
  },
  russianRevolution: {
    at: 1917, window: [1915, 1920], needs: (s) => hap(s, 'ww1') || yearNow(s) >= 1918,
    start(ctx) {
      news(ctx, 'Revolution in Russia: the Tsar is overthrown; the Bolsheviks take power', '🚩', 'world', 9);
      fallThrone(ctx, 'RU', 'The Tsar abdicates');
      if (hereIs(ctx, 'RU', 'UA')) { ctx.log('The Tsar is gone. The Bolsheviks have taken power, and civil war has followed.', '🚩', 'milestone'); expropriate(ctx, 'The Bolsheviks'); }
    },
  },
  fascismIT: { at: 1922, window: [1920, 1925], odds: 0.9, start(ctx) { news(ctx, 'Mussolini\'s Blackshirts march on Rome', '⚫'); if (hereIs(ctx, 'IT')) ctx.log('Mussolini is in power. The Blackshirts are on every street corner.', '⚫', 'warn'); } },
  depression: {
    at: 1929, window: [1927, 1932], lasts: [6, 10],
    start(ctx) { news(ctx, 'Wall Street crashes; banks fail across the world', '📉', 'world', 9); recession(ctx, 'financial', 5, '📉 The stock market crashed and the banks followed. The Great Depression has begun: breadlines, shuttered factories, families on the road.'); },
    end(ctx) { ctx.log('The Depression is lifting at last.', '🌱', 'info'); },
  },
  fascismDE: { at: 1933, window: [1930, 1935], odds: 0.85, needs: (s) => hap(s, 'depression'), start(ctx) { news(ctx, 'Hitler becomes Chancellor of Germany', '⚫', 'world', 8); if (hereIs(ctx, 'DE', 'AT')) ctx.log('The Nazis have taken power. Opponents are being arrested; Jewish families are being driven out of their jobs, and many are leaving while they can.', '⚫', 'bad'); } },
  militarismJP: { at: 1932, window: [1930, 1937], odds: 0.85, start(ctx) { news(ctx, 'Japan\'s army seizes Manchuria; the generals rule in Tokyo', '🎌'); } },
  spanishCivilWar: {
    at: 1936, window: [1933, 1939], odds: 0.85, lasts: [2, 4],
    start(ctx) { joinWar(ctx, 'ES', { id: 'spanishCivilWar', name: 'the Spanish Civil War', adversary: 'the Nationalists', operation: 'the Civil War', intensity: 3, homes: { ES: 0.8 }, internal: true, own: true }); news(ctx, 'Civil war in Spain', '🇪🇸'); },
    end(ctx) { endAll(ctx, 'spanishCivilWar', () => 'ended with Franco in power'); },
  },
  ww2: {
    at: 1939, window: [1936, 1942], lasts: [4, 7],
    needs: (s) => hap(s, 'fascismDE') || hap(s, 'militarismJP') || hap(s, 'fascismIT'),
    start(ctx, rec, rng) {
      const s = ctx.state;
      const axis = only([...(hap(s, 'fascismDE') ? ['DE', 'AT'] : []), ...(hap(s, 'fascismIT') ? ['IT'] : []), ...(hap(s, 'militarismJP') ? ['JP'] : [])]);
      rec.axis = axis;
      const allies = withEmpires(s, WW2_ALLIES.filter((cc) => !axis.includes(cc)));
      const homes = { PL: 0.8, RU: 0.5, CN: 0.6, FR: 0.5, NL: 0.6, BE: 0.6, NO: 0.4, GR: 0.5, DK: 0.3, DE: 0.4, AT: 0.3, JP: 0.3, IT: 0.35, GB: 0.2, PH: 0.5, ID: 0.4, MY: 0.4, SG: 0.5, MM: 0.4 };
      for (const cc of axis) joinWar(ctx, cc, { id: 'ww2', name: 'the Second World War', adversary: 'the Allies', operation: 'the Second World War', intensity: 4, homes });
      for (const cc of allies) joinWar(ctx, cc, { id: 'ww2', name: 'the Second World War', adversary: 'the Axis', operation: 'the Second World War', intensity: 4, homes, intensities: { CA: 3, AU: 3, NZ: 3 } });
      rec.usJoins = rec.year + rng.int(0, 2);
      news(ctx, 'The world is at war again', '⚔️', 'world', 10);
    },
    tick(ctx, rec) { if (yearNow(ctx.state) === rec.usJoins) { joinWar(ctx, 'US', { id: 'ww2', name: 'the Second World War', adversary: 'the Axis', operation: 'the Second World War', intensity: 4, homes: { PH: 0.5 } }); news(ctx, 'America enters the war', '🇺🇸', 'world', 8); } },
    end(ctx, rec, rng) {
      rec.axisWon = rng.chance(0.12);
      endAll(ctx, 'ww2', (cc) => ((rec.axis ?? []).includes(cc) === rec.axisWon ? 'ended in victory' : 'ended in defeat and occupation'));
      news(ctx, rec.axisWon ? 'The Allies sue for peace; the Axis redraws the map' : 'Victory: the war is over', '🕊️', 'world', 10);
      if (rec.axisWon) ctx.log('The war ended the other way. Europe and Asia are ruled from Berlin and Tokyo now.', '⚫', 'bad');
    },
  },
  prc: { at: 1949, window: [1945, 1951], needs: (s) => yearNow(s) >= 1945, start(ctx) { news(ctx, 'Mao proclaims the People\'s Republic of China', '🚩', 'world', 8); if (hereIs(ctx, 'CN')) { ctx.log('The Communists have won the civil war. Landlords and businesses are being taken over.', '🚩', 'milestone'); expropriate(ctx, 'The new government'); } } },
  coldWar: { at: 1947, window: [1945, 1949], needs: (s) => over(s, 'ww2') && !s.era.events.ww2.axisWon && hap(s, 'russianRevolution'), start(ctx) { news(ctx, 'An Iron Curtain has descended across Europe', '🧱', 'world', 7); fallThrone(ctx, 'RO', 'Romania\'s king forced to abdicate by the communists'); } },
  italyRepublic: { at: 1946, window: [1945, 1948], odds: 0.6, needs: (s) => over(s, 'ww2') && Boolean(s.world?.restored?.IT?.period), start(ctx) { fallThrone(ctx, 'IT', 'Italy votes to become a republic'); } },
  apartheid: { at: 1948, window: [1946, 1950], odds: 0.9, start(ctx) { if (hereIs(ctx, 'ZA')) ctx.log('The National Party has won and brought in apartheid: separate areas, separate schools, separate lives, and votes for white South Africans only.', '🚫', 'bad'); news(ctx, 'South Africa\'s new government brings in apartheid', '🚫'); } },
  koreanWar: {
    at: 1950, window: [1949, 1953], odds: 0.8, lasts: [2, 4], needs: (s) => hap(s, 'coldWar'),
    start(ctx) {
      joinWar(ctx, 'KR', { id: 'koreanWar', name: 'the Korean War', adversary: 'the North and China', operation: 'the Korean War', intensity: 4, homes: { KR: 0.8 }, own: true });
      for (const cc of only(['US', 'GB', 'AU', 'CA', 'TR', 'PH', 'NZ'])) joinWar(ctx, cc, { id: 'koreanWar', name: 'the Korean War', adversary: 'North Korea and China', operation: 'the UN Command in Korea', intensity: cc === 'US' ? 3 : 2 });
      news(ctx, 'War in Korea', '⚔️', 'world', 8);
    },
    end(ctx) { endAll(ctx, 'koreanWar', () => 'ended in an armistice along the old border'); },
  },
  vietnamWar: {
    at: 1965, window: [1961, 1967], odds: 0.85, lasts: [8, 11], needs: (s) => hap(s, 'coldWar'),
    start(ctx) {
      joinWar(ctx, 'VN', { id: 'vietnamWar', name: 'the Vietnam War', adversary: 'the North Vietnamese and the Viet Cong', operation: 'the war', intensity: 4, homes: { VN: 0.8 }, internal: true, own: true });
      for (const cc of only(['US', 'AU', 'KR', 'NZ'])) joinWar(ctx, cc, { id: 'vietnamWar', name: 'the Vietnam War', adversary: 'North Vietnam', operation: 'the war in Vietnam', intensity: cc === 'US' ? 3 : 2 });
      const us = warIn(ctx.state, 'US');
      if (us?.id === 'vietnamWar') us.draft = true;
      news(ctx, 'Troops pour into Vietnam', '🚁', 'world', 8);
    },
    end(ctx) { endAll(ctx, 'vietnamWar', (cc) => (cc === 'VN' ? 'ended with the North taking Saigon' : 'ended in withdrawal')); },
  },
  oilShock: { at: 1973, window: [1971, 1976], start(ctx) { news(ctx, 'Oil embargo: queues at every petrol station', '🛢️', 'world', 7); recession(ctx, 'oil', 1, '🛢️ An oil embargo has quadrupled the price of oil. Queues at the pumps; prices rising every month.'); } },
  carnationRevolution: { at: 1974, window: [1972, 1976], start(ctx) { news(ctx, 'Carnation Revolution: Portugal\'s dictatorship falls without a shot', '🌺'); if (hereIs(ctx, 'PT')) { ctx.log('Soldiers with carnations in their rifles ended the dictatorship. Portugal will be a democracy.', '🌺', 'milestone'); ctx.stat('happiness', 5); } } },
  francoDies: { at: 1975, window: [1973, 1977], needs: (s) => over(s, 'spanishCivilWar'), start(ctx) { news(ctx, 'Franco is dead; Spain turns to democracy', '🇪🇸'); if (hereIs(ctx, 'ES')) { ctx.log('Franco is dead. A king and a constitution will take Spain back to democracy.', '🗳️', 'milestone'); ctx.stat('happiness', 4); } } },
  reformOpening: { at: 1978, window: [1975, 1982], needs: (s) => hap(s, 'prc'), start(ctx) { news(ctx, 'China opens to the world: "to get rich is glorious"', '🏭'); if (hereIs(ctx, 'CN')) ctx.log('Mao is gone. The new leaders are letting people farm for themselves and start businesses.', '🏭', 'milestone'); } },
  iranRevolution: { at: 1979, window: [1976, 1981], odds: 0.85, start(ctx) { news(ctx, 'The Shah flees; Iran becomes an Islamic republic', '🕌', 'world', 8); if (hereIs(ctx, 'IR')) ctx.log('The Shah has fled. The new Islamic Republic has brought in religious law: veils, no alcohol, no dissent.', '🕌', 'milestone'); } },
  koreaDemocracy: { at: 1987, window: [1984, 1990], needs: (s) => yearNow(s) >= 1960, start(ctx) { if (hereIs(ctx, 'KR')) { ctx.log('Students and workers filled the streets until the generals gave in: free elections at last.', '🗳️', 'milestone'); ctx.stat('happiness', 4); } } },
  taiwanDemocracy: { at: 1987, window: [1984, 1991], needs: (s) => yearNow(s) >= 1960, start(ctx) { if (hereIs(ctx, 'TW')) { ctx.log('Martial law is over. Taiwan is becoming a democracy.', '🗳️', 'milestone'); ctx.stat('happiness', 4); } } },
  sovietCollapse: {
    at: 1991, window: [1987, 1994], odds: 0.92, needs: (s) => hap(s, 'russianRevolution') && !s.era?.events?.ww2?.axisWon,
    start(ctx) {
      news(ctx, 'The Berlin Wall falls; the Soviet Union breaks apart', '🧱', 'world', 10);
      if (hereIs(ctx, 'RU', 'PL', 'RO')) { ctx.log('The communist state has collapsed. Shops are empty, savings are worthless, and anything seems possible.', '🧱', 'milestone'); recession(ctx, 'financial', 3, '📉 The planned economy has collapsed. Prices have gone through the roof.'); }
    },
  },
  apartheidEnds: { at: 1994, window: [1988, 1996], needs: (s) => hap(s, 'apartheid'), start(ctx) { news(ctx, 'Mandela is free; South Africa votes as one nation', '🗳️', 'world', 9); if (hereIs(ctx, 'ZA')) { ctx.log('Apartheid is over. Everyone queued together to vote, for hours, and nobody minded.', '🗳️', 'milestone'); ctx.stat('happiness', 6); } } },
  dotcom: { at: 2000, window: [1999, 2002], start(ctx) { news(ctx, 'The dot-com bubble bursts', '💻'); recession(ctx, 'tech', 1, '💻 The dot-com bubble has burst. Start-ups are folding by the hundred.'); } },
  afghanistan: { at: 2001, window: [2000, 2003], odds: 0.9, start(ctx) { for (const cc of only(['US', 'GB', 'CA', 'AU'])) declareWarWith(ctx, cc, { id: 'afghanistan', name: 'the war in Afghanistan', adversary: 'the Taliban and al-Qaeda', intensity: cc === 'US' ? 2 : 1, home: 0 }); news(ctx, 'Attacks on America; war in Afghanistan', '🏙️', 'world', 10); } },
  gfc: { at: 2008, window: [2006, 2010], start(ctx) { news(ctx, 'Banks collapse: the worst crash since the Depression', '🏦', 'world', 9); recession(ctx, 'financial', 1, '🏦 The banks have collapsed. The worst crash since the Depression.'); } },
  brownVBoard: { at: 1954, window: [1952, 1956], start(ctx) { news(ctx, 'Supreme Court: segregated schools are unconstitutional', '⚖️', 'national', 8); if (jimCrowHere(ctx.state)) ctx.log('The Supreme Court has ruled school segregation unconstitutional. The state government says it will never comply.', '⚖️', 'milestone'); } },
  civilRights: {
    at: 1964, window: [1961, 1967], boost: (s) => (s.era.civilRights?.pressure ?? 0) * 0.04,
    start(ctx) {
      const s = ctx.state;
      const was = inUS(s) && JIM_CROW.includes(stateIdOf(s)) && skinToneOf(s) >= 4;
      news(ctx, 'Civil Rights Act signed: segregation is outlawed', '⚖️', 'national', 10);
      if (was) { ctx.log('The Civil Rights Act is law, and the Voting Rights Act is coming. The "Whites Only" signs are coming down. Nobody pretends that changes everything.', '⚖️', 'milestone'); ctx.stat('happiness', 6); }
      if (s.era.civilRights?.marched) ctx.log('You were there, on the bridges and in the jails. This is partly yours.', '✊🏿', 'good');
    },
  },
  /* ---------------- Loose futures: after today, nothing is certain ---------------- */
  aiWave: {
    future: true, at: 2029, window: [2027, 2033],
    start(ctx) {
      news(ctx, 'AI now does work that took whole offices of people', '🤖', 'world', 9);
      ctx.log('🤖 AI systems can now do much of the work of clerks, paralegals, translators, junior coders and copywriters. Some jobs are going; new ones are appearing.', '🤖', 'milestone');
      exposed(ctx, 'aiWave', 'Your line of work is one of the first the AI systems are taking over. Colleagues are being let go.');
    },
  },
  selfDriving: {
    future: true, at: 2034, window: [2030, 2040], odds: 0.8, needs: (s) => hap(s, 'aiWave'),
    start(ctx) { news(ctx, 'Robotaxis and driverless trucks take over the roads', '🚗', 'world', 8); ctx.log('Driverless cars and lorries are everywhere now. Taxi ranks are empty; truck stops are closing.', '🚗', 'info'); exposed(ctx, 'selfDriving', 'Driverless vehicles are coming for your job. The company is "transitioning the fleet".'); },
  },
  humanoidRobots: {
    future: true, at: 2041, window: [2036, 2048], odds: 0.65, needs: (s) => hap(s, 'aiWave'),
    start(ctx) { news(ctx, 'Humanoid robots go on sale; factories and warehouses switch over', '🦾', 'world', 8); ctx.log('General-purpose robots are working in warehouses, kitchens and care homes.', '🦾', 'info'); exposed(ctx, 'humanoidRobots', 'Robots are doing your job on the next shift over. The writing is on the wall.'); },
  },
  ubi: {
    future: true, at: 2040, window: [2034, 2050], odds: 0.5, needs: (s) => hap(s, 'aiWave'),
    start(ctx, rec, rng) {
      rec.countries = only(['FI', 'NO', 'SE', 'DK', 'NL', 'DE', 'CA', 'NZ', 'IE', 'GB', 'US', 'AU', 'KR', 'JP', 'CH', 'BE', 'AT', 'FR', 'ES', 'SG']).filter((cc) => rng.chance(cc === 'US' ? 0.3 : 0.45));
      if (!rec.countries.length) rec.countries = ['FI'];
      news(ctx, `${rec.countries.length} countries bring in a universal basic income`, '💶', 'world', 8);
      if (rec.countries.includes(hereOf(ctx.state))) ctx.log('Parliament has passed a universal basic income: every adult gets a monthly payment, job or no job.', '💶', 'milestone');
    },
    tick(ctx, rec) {
      const s = ctx.state;
      // Vowed to poverty: it goes to the order.
      if (s.community?.religious && !s.community.religious.left) return;
      if (s.character.age >= 18 && (rec.countries ?? []).includes(hereOf(s))) ctx.earn(Math.round(12000 * priceLevel(s) / 100) * 100, 'Universal basic income');
    },
  },
  carbonTax: {
    future: true, at: 2032, window: [2028, 2042], odds: 0.6,
    start(ctx, rec, rng) {
      rec.countries = only(['GB', 'DE', 'FR', 'SE', 'NO', 'DK', 'NL', 'CA', 'NZ', 'IE', 'ES', 'IT', 'AT', 'BE', 'FI', 'CH', 'JP', 'KR', 'AU', 'US']).filter((cc) => rng.chance(cc === 'US' ? 0.3 : 0.6));
      news(ctx, 'A carbon tax comes in across much of the rich world', '🏭');
      if ((rec.countries ?? []).includes(hereOf(ctx.state))) ctx.log('A carbon tax has come in: petrol, gas heating and flights all cost more.', '🏭', 'warn');
    },
    tick(ctx, rec) {
      const s = ctx.state;
      if (s.character.age < 18 || !(rec.countries ?? []).includes(hereOf(s))) return;
      if ((s.vehicles?.owned ?? []).length || (s.housing?.properties ?? []).length) ctx.spend(Math.round(900 * priceLevel(s) / 50) * 50, 'Carbon tax', { allowDebt: true });
    },
  },
  longevity: { future: true, at: 2040, window: [2034, 2050], odds: 0.6, start(ctx) { news(ctx, 'New drugs slow the diseases of old age', '💊', 'world', 8); ctx.log('Doctors have new drugs that slow heart disease, dementia and the rest of what ageing brings. People are living longer.', '💊', 'info'); } },
  agingTherapy: { future: true, at: 2058, window: [2050, 2070], odds: 0.35, needs: (s) => hap(s, 'longevity'), start(ctx) { news(ctx, 'Therapies that reverse ageing reach the clinic', '🧬', 'world', 9); ctx.log('Therapies that reverse parts of ageing are in the clinics. Eighty is the new sixty — for those who can afford it.', '🧬', 'milestone'); } },
  climateTipping: { future: true, at: 2042, window: [2035, 2055], odds: 0.7, start(ctx) { news(ctx, 'Scientists: a climate tipping point has been crossed', '🌡️', 'world', 9); ctx.log('The ice sheets are going faster than anyone predicted. Storms, fires and floods will get worse every year now.', '🌡️', 'warn'); } },
  spaceIndustry: { future: true, at: 2033, window: [2029, 2040], odds: 0.75, start(ctx) { news(ctx, 'Commercial space stations open as launch costs collapse', '🚀', 'world', 7); } },
  marsLanding: { future: true, at: 2040, window: [2034, 2052], odds: 0.55, needs: (s) => hap(s, 'spaceIndustry'), start(ctx) { news(ctx, 'Humans walk on Mars', '🔴', 'world', 10); ctx.log('You watched the first people walk on Mars, live, with half the world.', '🔴', 'milestone'); } },
  pandemic2: {
    future: true, at: 2045, window: [2035, 2065], odds: 0.5,
    start(ctx) {
      const s = ctx.state;
      news(ctx, 'A new pandemic: borders close again', '🦠', 'world', 10);
      recession(ctx, 'pandemic', 0, '🦠 A new virus is spreading. The lockdowns are back.');
      (s.world ??= {}).pandemic = { active: true, since: s.character.age, name: 'a new respiratory virus' };
    },
  },
  blocTension: { future: true, at: 2029, window: [2027, 2034], odds: 0.6, start(ctx) { news(ctx, 'A new Cold War: the blocs harden', '🧊', 'world', 8); ctx.log('The great powers are arming again: sanctions, blocs, a race for chips and missiles. Wars everywhere feel closer.', '🧊', 'warn'); } },
  greatPowerWar: {
    future: true, at: 2042, window: [2035, 2060], odds: 0.2, lasts: [2, 5], needs: (s) => hap(s, 'blocTension') && !hap(s, 'detente'),
    start(ctx) {
      const homes = { TW: 0.8, JP: 0.3, KR: 0.3, PH: 0.4, CN: 0.3, US: 0.05, AU: 0.05 };
      for (const cc of only(['US', 'JP', 'KR', 'TW', 'AU', 'PH', 'GB', 'CA', 'NZ'])) joinWar(ctx, cc, { id: 'greatPowerWar', name: 'the Pacific War', adversary: 'China', operation: 'the Pacific War', intensity: 4, homes });
      joinWar(ctx, 'CN', { id: 'greatPowerWar', name: 'the Pacific War', adversary: 'the United States and its allies', operation: 'the Pacific War', intensity: 4, homes });
      news(ctx, 'War in the Pacific', '⚔️', 'world', 10);
    },
    end(ctx) { endAll(ctx, 'greatPowerWar', () => 'ended in an exhausted armistice'); news(ctx, 'Armistice in the Pacific', '🕊️', 'world', 9); },
  },
  detente: { future: true, at: 2050, window: [2040, 2062], odds: 0.6, needs: (s) => hap(s, 'blocTension'), start(ctx) { news(ctx, 'The blocs sign a grand bargain; the new Cold War thaws', '🤝', 'world', 8); } },
  fusionPower: { future: true, at: 2055, window: [2045, 2070], odds: 0.4, start(ctx) { news(ctx, 'The first fusion power stations switch on; oil prices collapse', '⚛️', 'world', 9); exposed(ctx, 'fusionPower', 'Cheap fusion power is ending the oil business. The rigs are being decommissioned.'); } },
  covid: {
    at: 2020, window: [2018, 2022],
    start(ctx) {
      const s = ctx.state;
      news(ctx, 'A new coronavirus: the world locks down', '🦠', 'world', 10);
      recession(ctx, 'pandemic', 0, '🦠 A new coronavirus is spreading. Lockdowns have closed shops, restaurants and borders.');
      (s.world ??= {}).pandemic = { active: true, since: s.character.age, name: 'a novel coronavirus' };
    },
  },
};

/* ------------------------------------------------------------------ */
/* Colonies: the movement and the day of independence                 */
/* ------------------------------------------------------------------ */

function colonyYear(ctx, cc) {
  const { state } = ctx;
  const st = colonyStage(state, cc);
  if (!st) return;
  const rec = (state.era.colonies[cc] ??= { done: [], pressure: 0 });
  const y = yearNow(state);
  const end = stageEnd(state, st);
  const rng = sideRng(state, cc.charCodeAt(0) * 31 + cc.charCodeAt(1));
  const mine = hereOf(state) === cc;
  // A war of independence starts a few years before the end.
  if (st.war && typeof st.until === 'number' && !rec.war?.[st.index] && y >= end - 5 && rng.chance(0.4)) {
    (rec.war ??= {})[st.index] = y;
    declareWarWith(ctx, cc, { id: `independence.${cc}`, name: 'the war of independence', adversary: `the ${rulerAdj(st.ruler)} army`, intensity: 2, home: 0.5, internal: true, scripted: true, operation: 'the independence war' });
    if (!mine) news(ctx, `Rising against ${rulerAdj(st.ruler)} rule in ${cname(cc)}`, '✊');
  }
  let due = false;
  if (typeof st.until === 'number') {
    const pressure = rec.pressure ?? 0;
    if (y >= end + 3) due = true;
    else if (y >= end - 4) due = rng.chance(clamp(0.2 + pressure * 0.06 + (y - end + 4) * 0.05, 0, 0.9));
  } else due = hap(state, st.until);
  if (!due) return;
  rec.done.push(st.index);
  rec.since = y;
  if (warIn(state, cc)?.id === `independence.${cc}`) endWarNow(ctx, cc, 'ended in independence');
  const next = colonyStage(state, cc);
  if (mine) {
    if (next) ctx.log(`${rulerName(st.ruler)}'s rule is over. ${cname(cc)} is now ${next.name}, ruled from ${RULER_CAPITAL[next.ruler] ?? 'abroad'}.`, '🏳️', 'milestone');
    else independence(ctx, cc, st, rec, rng);
  } else if (!next && !st.noMovement) news(ctx, `${cname(cc)} wins its independence`, '🏳️', 'world', 5);
}

function independence(ctx, cc, st, rec, rng) {
  const { state } = ctx;
  ctx.log(`🏳️ Independence! ${rulerName(st.ruler)}'s flag came down at midnight and ${cname(cc)}'s went up. You are a citizen of a free country.`, '🏳️', 'milestone');
  news(ctx, `${cname(cc)} is independent`, '🏳️', 'national', 10);
  ctx.stat('happiness', rec.joined ? 10 : 5);
  if (rec.joined) {
    addHonor(state, { id: `independence.${cc}`, source: 'civil', country: cc, name: `${cname(cc)} Independence Medal`, icon: '🏅', prestige: 3, precedence: 60, citation: `For service in the struggle for the independence of ${cname(cc)}.` });
    ctx.log('You were there from the start. The new government gave the veterans of the movement a medal, and some of them jobs.', '🏅', 'honor');
  }
  // The colonial service is wound up: compensation for loss of career (as the British paid it).
  const job = state.career?.job;
  if (job?.professionId === 'colonialService') {
    const comp = Math.round((job.salary ?? 40000) * 1.5 / 100) * 100;
    leaveJob(ctx, 'The colonial service was wound up at independence');
    ctx.earn(comp, 'Compensation for loss of career');
    ctx.log(`The colonial service was wound up. You were paid $${comp.toLocaleString()} for loss of career.`, '🏛️', 'warn');
  }
  // The leader of the movement leads the country.
  const office = LEGISLATURES[cc]?.execOffice;
  if (rec.leader && office && OFFICES[office] && !state.legal?.incarceration && state.character.age >= 25) {
    ctx.emit('politics:take', { officeId: office, appointed: true });
    ctx.log(`You were sworn in as the first ${OFFICES[office].name.replace(/^(?:the )?/i, '')} of independent ${cname(cc)}.`, '🏛️', 'milestone');
    addHonor(state, { id: `founder.${cc}`, source: 'civil', country: cc, name: `Father of the Nation`.replace('Father', state.character.gender === 'female' ? 'Mother' : 'Father'), icon: '🏛️', prestige: 8, precedence: 5, citation: `For leading ${cname(cc)} to independence.` });
  }
  if (rec.loyal) { ctx.stat('stress', 6); ctx.log(`People remember you served the ${rulerAdj(st.ruler)} administration. Not everyone has forgiven it.`, '👀', 'warn'); }
  if (st.partition && rng.chance(0.35)) {
    ctx.emit('health:trauma', { amount: 14, source: 'partition' });
    ctx.log('Partition tore the country in two. Mobs, burning trains, whole families walking for weeks. You will never talk about what you saw.', '🔥', 'bad');
  }
}

/** In early eras most children left school at fourteen (twelve before the 1880s) to work. */
function leaveSchoolPrompt(ctx) {
  const { state } = ctx;
  const k = state.k12;
  const at = leavingAge(state);
  if (!at || !k || k.dropout || k.done || k.leaveAsked || state.character.age !== at) return;
  k.leaveAsked = true;
  const poor = state.people?.wealth === 'low';
  ctx.prompt({ type: 'history.leaveSchool', icon: '🏭', title: 'Leaving School', text: `You're ${at}. Most children your age are leaving school for work${poor ? ', and your family needs the wages' : ''}. Staying on means more years of no pay.`, options: [
    { id: 'leave', label: '🏭 Leave school and start work', hint: poor ? 'The family needs it' : 'Like nearly everyone' },
    { id: 'stay', label: '📚 Stay on at school', hint: poor ? 'A sacrifice for your family' : 'For a better job later' },
  ], data: {} });
}

function movementPrompt(ctx) {
  const { state } = ctx;
  const st = colonyHere(state);
  if (!st || st.noMovement || state.character.age < 16 || state.legal?.incarceration) return;
  const rec = (state.era.colonies[hereOf(state)] ??= { done: [], pressure: 0 });
  if (rec.asked != null && yearNow(state) - rec.asked < 4) return;
  if (!sideRng(state, 0x30c).chance(0.35)) return;
  rec.asked = yearNow(state);
  const ruler = rulerAdj(st.ruler);
  const job = state.career?.job;
  ctx.prompt({ type: 'history.movement', icon: '✊', title: 'The Independence Movement', text: `The movement to end ${ruler} rule over ${cname(hereOf(state))} is growing: meetings at night, strikes, boycotts of ${ruler} goods. Some go to prison for it.`, options: [
    ...(rec.joined && state.character.age >= 21 ? [{ id: 'lead', label: '📣 Lead it', hint: 'Speeches, strategy, prison likely — and if it wins, the country', tone: 'danger' }] : []),
    { id: 'join', label: '✊ Join the movement', hint: 'Marches, organising, maybe prison' },
    { id: 'quiet', label: '🤫 Support it quietly', hint: 'Money and a spare room' },
    ...(job ? [{ id: 'loyal', label: `🏛️ Serve the ${ruler} administration loyally`, hint: 'Safe and well paid — for now' }] : []),
    { id: 'out', label: '🙈 Keep your head down' },
  ], data: { cc: hereOf(state) } });
}

/* ------------------------------------------------------------------ */
/* The module                                                          */
/* ------------------------------------------------------------------ */

/** What our history says had already happened before a life starting in `start`. */
function seedPast(state) {
  const era = state.era;
  for (const [id, ev] of Object.entries(EVENTS)) {
    if (era.events[id] || ev.window[1] >= era.start) continue;
    const lasts = ev.lasts ? Math.round((ev.lasts[0] + ev.lasts[1]) / 2) : null;
    const rec = (era.events[id] = { year: ev.at, past: true });
    if (lasts != null) { rec.lasts = lasts; if (ev.at + lasts < era.start) rec.ended = ev.at + lasts; else rec.resume = true; }
  }
  for (const [cc, stages] of Object.entries(COLONIES)) {
    const rec = (era.colonies[cc] ??= { done: [], pressure: 0 });
    stages.forEach((st, i) => { if (stageEnd(state, st) < era.start && !rec.done.includes(i)) rec.done.push(i); });
  }
  era.seeded = true;
}

export const sync = (state) => { setEraLayer(eraLayer(state)); setReformLayer(state.world?.reforms ?? {}); setEraYear(yearNow(state)); };

/** Trades that die out take their workers with them: the pit closes, the docks containerise. */
const TRADE_DIES = {
  blacksmith: 'Nobody needs a smith now that the horses are gone. The forge went cold.',
  telegraph: 'The telegraph office closed: everyone telephones now.',
  coachman: 'The motor car has put the coaches out of business.',
  whaling: 'Kerosene killed the whaling trade. The ship was sold for scrap.',
  coalMining: 'The pit closed. The whole valley was laid off in a single morning.',
  millWork: 'The mill shut for good: the work had gone abroad.',
  domesticService: 'The household let its staff go. Nobody keeps servants any more.',
  typingPool: 'The typing pool was closed: everyone types their own letters on computers now.',
  switchboard: 'The exchange went automatic. The operators were let go.',
  docks: 'The containers came: one crane does the work of a hundred dockers. You were laid off.',
  milkRound: 'The dairy ended the round: everyone buys milk at the supermarket now.',
  steamRailway: 'Steam was withdrawn. The diesels need fewer hands, and yours weren\'t among them.',
  travellingSales: 'The firm stopped selling door to door.',
  lamplighter: 'The street lamps went electric. Lamplighting is over.',
};
function tradeEnds(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  if (!job) return;
  const p = getProfession(job.professionId);
  if (!p?.untilYear || yearNow(state) < p.untilYear) return;
  if (!sideRng(state, 0x7d).chance(0.35)) return;
  leaveJob(ctx, 'The trade died out');
  ctx.log(TRADE_DIES[p.id] ?? 'Your line of work has disappeared.', '🏚️', 'bad');
}

/** Thrones without a history event of their own rise and fall on their dates: Napoleon III in 1852, the Ottoman sultanate in 1922, Spain's republics. */
function thronesOnTheirDates(ctx) {
  const { state } = ctx;
  const y = yearNow(state);
  state.world ??= {};
  for (const [cc, reigns] of Object.entries(PERIOD_THRONE_YEARS)) {
    if (!CROWNS[cc]) continue;
    const r = state.world.restored?.[cc];
    if (!EVENT_THRONES.includes(cc) && r?.period && reigns.some(([, until]) => until === y)) {
      news(ctx, `The monarchy falls in ${COUNTRIES[cc]?.name ?? cc}`, '👑', 'world', 6);
      abolish(ctx, cc);
    } else if (!r && reigns.some(([from]) => from === y && from > state.era.start)) {
      (state.world.restored ??= {})[cc] = { year: y, house: CROWNS[cc].houses[0], period: true };
      if (state.world.republics?.[cc]) delete state.world.republics[cc];
      news(ctx, `A monarchy is proclaimed in ${COUNTRIES[cc]?.name ?? cc}`, '👑', 'world', 6);
    }
  }
  for (const [cc, gaps] of Object.entries(REPUBLIC_GAPS)) {
    if (gaps.some(([from]) => from === y) && !state.world.republics?.[cc]) { news(ctx, `${COUNTRIES[cc]?.name ?? cc} becomes a republic`, '🏛️', 'world', 6); abolish(ctx, cc); }
    if (gaps.some(([, until]) => until === y) && state.world.republics?.[cc]) {
      delete state.world.republics[cc];
      delete state.world.crowns?.[cc];
      news(ctx, `The monarchy is restored in ${COUNTRIES[cc]?.name ?? cc}`, '👑', 'world', 6);
    }
  }
}

/** When the country you live in changes its name or its form of government, you hear of it. */
function governmentChange(ctx) {
  const { state } = ctx;
  const cc = state.character.countryId ?? 'US';
  const r = regimeHere(state);
  const name = periodCountryName(state, cc, COUNTRIES[cc]?.name ?? cc);
  const sig = `${cc}|${r.kind}|${r.name ?? ''}|${name}`;
  const prev = state.era.govSig;
  state.era.govSig = sig;
  if (!prev || prev === sig || prev.split('|')[0] !== cc) return;
  const [, kind, rname, pname] = prev.split('|');
  const what = r.name ?? GOVERNMENT_FORM[r.kind] ?? r.kind;
  if (pname !== name) ctx.log(`🏛️ ${pname[0].toUpperCase()}${pname.slice(1)} is now ${name}.${rname !== (r.name ?? '') || kind !== r.kind ? ` ${what[0].toUpperCase()}${what.slice(1)}.` : ''}`, '🏛️', 'milestone');
  else ctx.log(`🏛️ The government has changed: ${name} is now ${what}.`, '🏛️', 'milestone');
}
const GOVERNMENT_FORM = { democracy: 'a democracy', monarchy: 'a monarchy', absoluteMonarchy: 'an absolute monarchy', oneParty: 'a one-party state', junta: 'ruled by a junta', militarist: 'ruled by its generals', theocracy: 'a theocracy', colony: 'a colony', authoritarian: 'an authoritarian state', totalitarian: 'a totalitarian dictatorship', dictatorship: 'a dictatorship', hybrid: 'half free', fragile: 'a fragile state', transitional: 'in transition', apartheid: 'an apartheid state' };

export const HistoryModule = {
  id: 'history',
  order: 0.9,

  init(state) {
    state.era ??= { start: state.character.birthYear ?? PRESENT, events: {}, colonies: {} };
    state.era.events ??= {};
    state.era.colonies ??= {};
    if (!state.era.seeded) {
      seedPast(state);
      // Before the Civil War, a Black American family in the game lives free, in the North.
      if (state.era.start < 1865 && inUS(state) && JIM_CROW.includes(stateIdOf(state)) && skinToneOf(state) >= 4) {
        state.character.regionId = ['philadelphia', 'nyc', 'boston'][state.era.start % 3];
        state.era.freeNorth = true;
      }
      // Thrones that still stood when this life began reign until history takes them.
      for (const cc of Object.keys(PERIOD_THRONES)) {
        if (!periodThrone(cc, state.era.start) || !CROWNS[cc]) continue;
        state.world ??= {};
        (state.world.restored ??= {})[cc] ??= { year: state.era.start, house: CROWNS[cc].houses[0], period: true };
      }
      // Today's monarchies that were republics when this life began (Spain in the 1930s).
      for (const cc of Object.keys(REPUBLIC_GAPS)) if (republicGap(cc, state.era.start)) (state.world.republics ??= {})[cc] = { year: state.era.start, period: true };
    }
    sync(state);
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.era) HistoryModule.init(state);
    if (state.era.freeNorth && state.character.age === 1) ctx.log('Your family are free Black Americans in the North. In the Southern states, nearly four million people are held in slavery.', '⛓️', 'info');
    const y = yearNow(state);
    const presentLife = state.era.start >= PRESENT;
    tradeEnds(ctx);
    const rng = sideRng(state, 0x415);
    const era = state.era;
    for (const [id, ev] of Object.entries(EVENTS)) {
      if (presentLife && !ev.future) continue;
      const rec = era.events[id];
      if (rec) {
        if (rec.ended != null || rec.skipped) continue;
        // Still going when this life began (a 1970 start is born into Vietnam): pick it up.
        if (rec.resume) { delete rec.resume; ev.start?.(ctx, rec, rng); }
        ev.tick?.(ctx, rec, rng);
        if (rec.lasts != null && y >= rec.year + rec.lasts) { rec.ended = y; ev.end?.(ctx, rec, rng); }
        continue;
      }
      const [from, to] = ev.window;
      if (y < from || (era.skipped ?? []).includes(id)) continue;
      if (ev.needs && !ev.needs(state)) {
        if (y > to + 6) (era.skipped ??= []).push(id); // the moment passed
        continue;
      }
      if (ev.odds != null && !(era.rolled ??= {})[id]) {
        era.rolled[id] = true;
        if (!rng.chance(ev.odds)) { (era.skipped ??= []).push(id); continue; }
      }
      // Years skipped past the whole window (an heir picked up decades on, a jump in age): it happened while you weren't looking.
      if (y > to + 2) {
        const lasts = ev.lasts ? Math.round((ev.lasts[0] + ev.lasts[1]) / 2) : null;
        era.events[id] = { year: Math.min(ev.at, to), past: true, quiet: true, ...(lasts != null ? { lasts, ended: Math.min(ev.at, to) + lasts } : {}) };
        continue;
      }
      const fire = y >= to || rng.chance(Math.min(1, 1 / Math.max(1, to - y + 1) + (ev.boost?.(state) ?? 0)));
      if (!fire) continue;
      const r = (era.events[id] = { year: y, ...(ev.lasts ? { lasts: rng.int(...ev.lasts) } : {}) });
      ev.start?.(ctx, r, rng);
    }
    setEraYear(yearNow(state));
    if (presentLife) return void setReformLayer(state.world?.reforms ?? {});
    leaveSchoolPrompt(ctx);
    for (const cc of Object.keys(COLONIES)) colonyYear(ctx, cc);
    thronesOnTheirDates(ctx);
    sync(state);
    governmentChange(ctx);
    movementPrompt(ctx);
    civilRightsPrompt(ctx);
    if (state.character.age === 6 && jimCrowHere(state)) ctx.log('You started at a segregated school: hand-me-down books from the white school and a building the county never repairs.', '🏫', 'info');
  },

  resolvers: {
    leaveSchool(ctx, _data, optionId) {
      const { state } = ctx;
      const k = state.k12;
      if (!k) return;
      if (optionId === 'leave') {
        k.dropout = true;
        k.leftEarly = true;
        k.activities = [];
        return void ctx.log(`You left school at ${state.character.age}, as most children did, and started work.`, '🏭', 'info');
      }
      if (state.people?.wealth === 'low') { ctx.stat('stress', 4); for (const p of state.people.list.filter((x) => ['mother', 'father'].includes(x.relation))) p.relationship = Math.max(0, p.relationship - 4); }
      ctx.log('You stayed on at school. Not many of your friends did.', '📚', 'good');
    },
    civilRights(ctx, data, optionId) {
      const { state, rng } = ctx;
      const cr = (state.era.civilRights ??= { pressure: 0 });
      if (optionId === 'march' || optionId === 'register') {
        cr.marched = true;
        cr.pressure += optionId === 'march' ? 2 : 1;
        if (rng.chance(optionId === 'march' ? 0.35 : 0.2)) {
          ctx.stat('stress', 10);
          if (rng.chance(0.4)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(15, 35) });
          ctx.log(optionId === 'march' ? 'The police met the march with dogs, clubs and fire hoses. You spent two nights in jail.' : 'Night riders shot at the house where you were staying. You kept knocking on doors.', '🚨', 'bad');
        } else ctx.log(optionId === 'march' ? 'You marched, arms linked, singing. The world was watching on television.' : 'You walked the back roads registering voters. Forty new names this summer.', '✊🏿', 'good');
        ctx.stat('happiness', 3);
      } else if (optionId === 'support') { cr.pressure += 1; ctx.log('You fed marchers, drove carpools during the boycott and put money in the plate.', '🤝', 'good'); }
      else ctx.log('You kept your head down and your family safe.', '🏠');
    },
    movement(ctx, data, optionId) {
      const { state, rng } = ctx;
      const rec = (state.era.colonies[data.cc] ??= { done: [], pressure: 0 });
      switch (optionId) {
        case 'lead':
          rec.joined = true;
          rec.leader = true;
          rec.pressure = (rec.pressure ?? 0) + 4;
          ctx.stat('stress', 8);
          if (rng.chance(0.4)) {
            ctx.log('You were arrested for sedition. Your speech from the dock was printed in every paper in the country.', '⛓️', 'bad');
            commitOffense(ctx, { offenseId: 'antiState', caught: true, evidence: 0.85, context: 'leading the independence movement' });
          } else ctx.log('You lead the movement now: the speeches, the strikes, the talks with the Governor. The crowds chant your name.', '📣', 'milestone');
          break;
        case 'join':
          rec.joined = true;
          rec.pressure = (rec.pressure ?? 0) + 2;
          ctx.stat('happiness', 3);
          if (rng.chance(0.3)) {
            ctx.stat('stress', 10);
            ctx.stat('happiness', -6);
            ctx.log('You were arrested at a march and held for three months without trial. It made you more determined, not less.', '⛓️', 'bad');
          } else ctx.log('You joined the movement: leaflets, meetings, a strike that shut the port for a week.', '✊', 'good');
          break;
        case 'quiet':
          rec.pressure = (rec.pressure ?? 0) + 1;
          if (state.finances) state.finances.cash = Math.max(0, state.finances.cash - 200);
          ctx.log('You gave money and once hid a wanted organiser in your back room for a week.', '🤫');
          break;
        case 'loyal':
          rec.loyal = true;
          if (state.career?.job) state.career.job.performance = Math.round(clamp((state.career.job.performance ?? 50) + 6, 0, 100));
          ctx.log('You kept serving the administration. The pay is good; the looks from neighbours aren\'t.', '🏛️');
          break;
        default: ctx.log('You kept your head down and hoped it would all work out.', '🙈');
      }
    },
  },
};
