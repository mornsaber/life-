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
import { setEraLayer } from './Regimes.js';
import { PRESENT, yearNow, eraLayer, COLONIES, colonyStage, colonyHere, stageEnd, rulerAdj, rulerName, RULER_CAPITAL } from './Eras.js';

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
  coldWar: { at: 1947, window: [1945, 1949], needs: (s) => over(s, 'ww2') && !s.era.events.ww2.axisWon && hap(s, 'russianRevolution'), start(ctx) { news(ctx, 'An Iron Curtain has descended across Europe', '🧱', 'world', 7); } },
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
  if (rec.loyal) { ctx.stat('stress', 6); ctx.log(`People remember you served the ${rulerAdj(st.ruler)} administration. Not everyone has forgiven it.`, '👀', 'warn'); }
  if (st.partition && rng.chance(0.35)) {
    ctx.emit('health:trauma', { amount: 14, source: 'partition' });
    ctx.log('Partition tore the country in two. Mobs, burning trains, whole families walking for weeks. You will never talk about what you saw.', '🔥', 'bad');
  }
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

export const sync = (state) => setEraLayer(eraLayer(state));

export const HistoryModule = {
  id: 'history',
  order: 0.9,

  init(state) {
    state.era ??= { start: state.character.birthYear ?? PRESENT, events: {}, colonies: {} };
    state.era.events ??= {};
    state.era.colonies ??= {};
    if (!state.era.seeded) seedPast(state);
    sync(state);
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.era) HistoryModule.init(state);
    const y = yearNow(state);
    if (state.era.start >= PRESENT) return;
    const rng = sideRng(state, 0x415);
    const era = state.era;
    for (const [id, ev] of Object.entries(EVENTS)) {
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
      const fire = y >= to || rng.chance(1 / Math.max(1, to - y + 1));
      if (!fire) continue;
      const r = (era.events[id] = { year: y, ...(ev.lasts ? { lasts: rng.int(...ev.lasts) } : {}) });
      ev.start?.(ctx, r, rng);
    }
    for (const cc of Object.keys(COLONIES)) colonyYear(ctx, cc);
    sync(state);
    movementPrompt(ctx);
  },

  resolvers: {
    movement(ctx, data, optionId) {
      const { state, rng } = ctx;
      const rec = (state.era.colonies[data.cc] ??= { done: [], pressure: 0 });
      switch (optionId) {
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
