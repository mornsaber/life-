/**
 * Wars, for every playable country and the wider world. A war is not a fixed
 * timer: each year the front moves, the fighting escalates or cools, casualties
 * mount and public support erodes. Low support or a lopsided front brings peace
 * talks; talks can fail; ceasefires can collapse. Some wars are fought on home
 * soil: cities are shelled, the economy crashes, men are mobilized and barred
 * from leaving, and civilians flee abroad as refugees (world/Asylum.js).
 *
 * state.world = {
 *   seed,                       the world's own random stream (so world events don't shift the life's)
 *   wars: { [countryId]: War }, at most one per country
 *   global: [{ id, name, where, intensity, years }],   conflicts beyond the playable countries
 *   history: [{ country, name, operation, startAge, endAge, outcome }],
 * }
 * War = { id, country, name, adversary, operation, kind, intensity 1–4, front −100…100 (+ = winning),
 *         support 0–100, casualties, years, phase 'active'|'talks'|'ceasefire', homeFront 0–1,
 *         draft, mobilized, startAge, ceasefireYears? }
 */
import { Random, clamp } from '../../core/Random.js';
import { enlistmentEligibility, enlist } from '../military/MilitaryEngine.js';
import { COUNTRIES, isCitizen } from './Countries.js';
import { regionsIn, changeRegion, stateIdOf } from '../life/Regions.js';
import { fromPacks } from './packs/index.js';

/* ------------------------------------------------------------------ */
/* Theaters: the wars each country could plausibly fight              */
/* ------------------------------------------------------------------ */

const NATO_EAST = { id: 'natoEast', name: 'a NATO war on the eastern flank after an invasion of the Baltic states', adversary: 'Russia', intensity: 2, home: 0.05, weight: 14, alliance: 'nato' };
const GREAT_POWER = { id: 'major', name: 'a great-power war', adversary: 'a rival bloc', intensity: 3, home: 0.15, weight: 5, alliance: 'all' };
const COALITION_AIR = { id: 'coalitionAir', name: 'a coalition air campaign in the Middle East', adversary: 'an armed movement', intensity: 1, home: 0, weight: 25 };
const PEACEKEEPING = { id: 'peacekeeping', name: 'a UN peacekeeping mission that turned into combat', adversary: 'militias', intensity: 1, home: 0, weight: 18 };
const TAIWAN = { id: 'taiwan', name: 'a war over the Taiwan Strait', adversary: 'China', intensity: 3, home: 0.1, weight: 8, alliance: 'pacific' };

export const THEATERS = {
  US: [
    { id: 'airCampaign', name: 'an air campaign against a rogue state\'s weapons program', adversary: 'a rogue state', intensity: 1, home: 0, weight: 30 },
    { id: 'intervention', name: 'an intervention in a collapsing state', adversary: 'insurgents', intensity: 1, home: 0, weight: 22 },
    { id: 'regional', name: 'a regional ground war', adversary: 'a regional power', intensity: 2, home: 0, weight: 18 },
    { ...TAIWAN, home: 0.03, weight: 10 },
    { ...NATO_EAST, home: 0, weight: 8 },
    { ...GREAT_POWER, home: 0.08 },
  ],
  CA: [COALITION_AIR, PEACEKEEPING, { ...NATO_EAST, home: 0 }, GREAT_POWER],
  GB: [COALITION_AIR, PEACEKEEPING, NATO_EAST, { id: 'gulf', name: 'a naval war in the Gulf', adversary: 'Iran', intensity: 2, home: 0, weight: 10 }, GREAT_POWER],
  FR: [{ id: 'sahel', name: 'a counter-insurgency in the Sahel', adversary: 'jihadist groups', intensity: 1, home: 0.02, weight: 28 }, COALITION_AIR, NATO_EAST, GREAT_POWER],
  DE: [PEACEKEEPING, { ...NATO_EAST, weight: 20, home: 0.08 }, GREAT_POWER],
  IT: [{ id: 'mediterranean', name: 'a Mediterranean stabilization mission in Libya', adversary: 'militias', intensity: 1, home: 0, weight: 25 }, PEACEKEEPING, NATO_EAST, GREAT_POWER],
  JP: [{ id: 'eastChinaSea', name: 'a clash over the Senkaku Islands', adversary: 'China', intensity: 2, home: 0.1, weight: 20 }, { ...TAIWAN, home: 0.3, weight: 12 }, { id: 'northKorea', name: 'North Korean missile strikes', adversary: 'North Korea', intensity: 2, home: 0.35, weight: 8 }],
  KR: [{ id: 'borderClash', name: 'artillery duels along the DMZ', adversary: 'North Korea', intensity: 2, home: 0.3, weight: 30 }, { id: 'koreanWar', name: 'a second Korean War', adversary: 'North Korea', intensity: 4, home: 0.85, weight: 10 }, { ...TAIWAN, home: 0.1 }],
  PH: [{ id: 'southChinaSea', name: 'a naval war in the South China Sea', adversary: 'China', intensity: 2, home: 0.2, weight: 22 }, { id: 'mindanao', name: 'an insurgency in Mindanao', adversary: 'insurgents', intensity: 1, home: 0.25, weight: 25, internal: true }, { ...TAIWAN, home: 0.25 }],
  IN: [{ id: 'loc', name: 'a war along the Line of Control', adversary: 'Pakistan', intensity: 2, home: 0.3, weight: 30 }, { id: 'himalaya', name: 'a Himalayan border war', adversary: 'China', intensity: 2, home: 0.15, weight: 18 }, { id: 'subcontinent', name: 'a full-scale war on the subcontinent', adversary: 'Pakistan', intensity: 4, home: 0.6, weight: 4 }],
  MX: [{ id: 'cartelWar', name: 'a war against the cartels', adversary: 'cartels', intensity: 1, home: 0.35, weight: 40, internal: true }],
  AU: [COALITION_AIR, { id: 'pacific', name: 'a Pacific coalition deployment', adversary: 'a hostile navy', intensity: 1, home: 0, weight: 20 }, { ...TAIWAN, home: 0.05 }],
};
fromPacks(THEATERS, 'THEATERS');

/** How often each country goes to war (per year). */
const START_CHANCE = { US: 0.03, KR: 0.012, IN: 0.02, PH: 0.018, MX: 0.012, JP: 0.008, GB: 0.015, FR: 0.016, AU: 0.01, CA: 0.008, DE: 0.007, IT: 0.008 };
fromPacks(START_CHANCE, 'WAR_START_CHANCE');
/** Conflicts elsewhere in the world: news, oil prices, refugees, and sometimes your country joins in. */
const GLOBAL_CONFLICTS = [
  { id: 'sudan', name: 'the civil war in Sudan', where: 'Sudan' },
  { id: 'sahel', name: 'the war in the Sahel', where: 'the Sahel' },
  { id: 'middleEast', name: 'a regional war in the Middle East', where: 'the Middle East', oil: true },
  { id: 'caucasus', name: 'a war in the Caucasus', where: 'the Caucasus' },
  { id: 'myanmar', name: 'the civil war in Myanmar', where: 'Myanmar' },
  { id: 'horn', name: 'a war in the Horn of Africa', where: 'the Horn of Africa' },
  { id: 'eastEurope', name: 'a war in Eastern Europe', where: 'Eastern Europe', oil: true },
];

export const WAR_START_CHANCE = START_CHANCE.US;
export const DRAFT_AGES = [18, 25];
export const DRAFT_LOTTERY = 0.12;
/** Men of military age can't leave a country under general mobilization. */
export const MOBILIZATION_AGES = [18, 60];

const CODENAMES = ['Iron', 'Silent', 'Northern', 'Desert', 'Steel', 'Resolute', 'Eagle', 'Crimson', 'Atlantic', 'Granite'];
const CODEWORDS = ['Shield', 'Dawn', 'Spear', 'Guardian', 'Lance', 'Harbor', 'Thunder', 'Sentinel', 'Horizon', 'Anvil'];

const here = (state) => state.character.countryId ?? 'US';
/** The war the country you live in is fighting (null at peace). */
export const warIn = (state, countryId) => state.world?.wars?.[countryId] ?? null;
export const warHere = (state) => warIn(state, here(state));
export const atWar = (state) => Boolean(warHere(state) && warHere(state).phase !== 'ceasefire');
/** Multiplier on deployments and mobilizations (1 at peace). */
export const warFactor = (state) => (atWar(state) ? 1 + 0.5 * Math.min(3, warHere(state).intensity) : 1);
/** Extra odds of seeing combat on a deployment. */
export const combatFactor = (state) => (atWar(state) ? 1 + 0.15 * Math.min(3, warHere(state).intensity) : 1);
/** The war your own armed forces are fighting (by the nation you serve, wherever you live). */
export const serviceWar = (state, svc) => {
  const w = warIn(state, svc?.nation ?? 'US');
  return w && w.phase !== 'ceasefire' ? w : null;
};
export const serviceWarFactor = (state, svc) => (serviceWar(state, svc) ? 1 + 0.5 * Math.min(3, serviceWar(state, svc).intensity) : 1);
export const serviceCombatFactor = (state, svc) => (serviceWar(state, svc) ? 1 + 0.15 * Math.min(3, serviceWar(state, svc).intensity) : 1);
/** What one fight you were in did to the front: small, but it adds up across a unit's war. */
export function warContribution(state, svc, success) {
  const w = serviceWar(state, svc);
  if (!w) return null;
  w.front = Math.max(-100, Math.min(100, w.front + (success ? 1.5 : -1)));
  w.playerFights = (w.playerFights ?? 0) + 1;
  return w;
}
/** Danger to civilians where you live (0 at peace). */
export const homeDanger = (state) => (atWar(state) ? warHere(state).homeFront * (0.5 + warHere(state).intensity / 8) : 0);
/** General mobilization: men 18–60 are called up and can't leave. */
export const underMobilization = (state) => Boolean(atWar(state) && warHere(state).mobilized && state.character.gender === 'male'
  && state.character.age >= MOBILIZATION_AGES[0] && state.character.age <= MOBILIZATION_AGES[1] && isCitizen(state, here(state)));

export const PHASE_LABEL = { active: 'Active fighting', talks: 'Peace talks', ceasefire: 'Ceasefire' };
export const INTENSITY_LABEL = ['', 'Limited', 'Sustained', 'Major', 'Total war'];

/** How the war is going, in words. */
export function frontLabel(front) {
  if (front >= 60) return 'Decisively winning';
  if (front >= 25) return 'Gaining ground';
  if (front > -25) return 'Stalemate';
  if (front > -60) return 'Losing ground';
  return 'Near collapse';
}

const worldRng = (state) => new Random(((state.world.seed ?? 1) * 2654435761 + state.character.age * 97 + (state.character.birthYear ?? 0)) >>> 0);
const govName = (cc) => (cc === 'US' ? 'The United States' : COUNTRIES[cc]?.name ?? cc);

/* ------------------------------------------------------------------ */
/* A war's life                                                        */
/* ------------------------------------------------------------------ */

function startWar(ctx, cc, rng, theater = null) {
  const { state } = ctx;
  const list = THEATERS[cc] ?? [];
  const t = theater ?? rng.weighted(list);
  if (!t) return null;
  const war = {
    id: t.id, country: cc, name: t.name, adversary: t.adversary, kind: t.internal ? 'internal' : 'interstate',
    operation: `Operation ${rng.pick(CODENAMES)} ${rng.pick(CODEWORDS)}`,
    intensity: t.intensity, front: rng.int(-10, 15), support: rng.int(55, 80), casualties: 0, years: 0,
    phase: 'active', homeFront: t.home ?? 0, draft: false, mobilized: false, startAge: state.character.age,
  };
  state.world.wars[cc] = war;
  if (cc === here(state)) {
    ctx.log(`📰 ${govName(cc)} went to war: ${war.name} (${war.operation}).${war.homeFront >= 0.3 ? ' The fighting reached home.' : ''}`, '⚔️', 'milestone');
    ctx.emit('world:war', { war });
  } else if (isCitizen(state, cc)) ctx.log(`📰 Back home, ${COUNTRIES[cc]?.name ?? cc} went to war: ${war.name}.`, '⚔️', 'warn');
  return war;
}

function endWar(ctx, cc, outcome) {
  const { state } = ctx;
  const war = state.world.wars[cc];
  delete state.world.wars[cc];
  state.world.history.push({ country: cc, name: war.name, operation: war.operation, startAge: war.startAge, endAge: state.character.age, outcome, casualties: war.casualties });
  if (cc !== here(state)) {
    if (isCitizen(state, cc)) ctx.log(`📰 The war back home in ${COUNTRIES[cc]?.name ?? cc} is over: it ${outcome}.`, '🕊️', 'good');
    return;
  }
  ctx.log(`📰 ${war.operation} ${outcome} after ${war.years} year${war.years === 1 ? '' : 's'} and ${war.casualties.toLocaleString()} military dead.${war.draft ? ' The draft ended with it.' : ''}${war.mobilized ? ' Mobilization was lifted.' : ''}`, '🕊️', 'milestone');
  ctx.stat('happiness', outcome.includes('defeat') ? -4 : 4);
  ctx.emit('world:peace', { war, outcome });
}

/** One year of a war: the front, escalation, casualties, support, and the road to peace. */
function warYear(ctx, cc, war, rng) {
  const mine = cc === here(ctx.state);
  war.years += 1;
  const log = (text, icon = '⚔️', kind) => mine && ctx.log(text, icon, kind);

  if (war.phase === 'ceasefire') {
    war.ceasefireYears = (war.ceasefireYears ?? 0) + 1;
    if (rng.chance(0.15)) {
      war.phase = 'active';
      war.intensity = Math.max(1, war.intensity - 1);
      log(`📰 The ceasefire collapsed. ${war.operation} is back on.`, '💥', 'bad');
    } else if (war.ceasefireYears >= 2) return endWar(ctx, cc, war.front > 20 ? 'ended in a peace treaty on favorable terms' : war.front < -20 ? 'ended in a treaty that gave up ground' : 'ended in a treaty along the ceasefire line');
    return;
  }

  // The front moves: momentum, morale and luck.
  const swing = 10 + war.intensity * 4;
  // (`|| 0` turns -0 into 0, so a saved game reloads identically.)
  war.front = clamp(Math.round(war.front + rng.int(-swing, swing) + (war.support - 50) / 8), -100, 100) || 0;

  // Escalation and de-escalation.
  const escalate = 0.1 + (war.front < -30 ? 0.12 : 0) + (war.years === 1 ? 0.05 : 0);
  if (war.intensity < 4 && rng.chance(escalate)) {
    war.intensity += 1;
    if (war.homeFront > 0 && war.kind === 'interstate') war.homeFront = clamp(war.homeFront + rng.float(0.05, 0.2), 0, 1);
    log(`📰 The war escalated: ${rng.pick(['new fronts opened', 'the adversary called up its reserves', 'missiles struck military bases', 'the air war widened', 'allies were drawn in'])}. ${INTENSITY_LABEL[war.intensity]} war now.`, '🔥', 'warn');
  } else if (war.intensity > 1 && (war.support < 35 || rng.chance(0.08))) {
    war.intensity -= 1;
    log('📰 The fighting cooled: both sides dug in and the front went quiet.', '🌫️');
  }

  // Manpower: the largest wars bring a draft or general mobilization.
  if (!war.draft && war.intensity >= 3 && (war.front < 0 || rng.chance(0.35))) {
    war.draft = true;
    log(cc === 'US' ? '📰 Congress reinstated the draft: men 18–25 face the Selective Service lottery.' : '📰 The government called up conscripts and reservists.', '📨', 'warn');
  }
  if (!war.mobilized && war.homeFront >= 0.4 && war.intensity >= 3) {
    war.mobilized = true;
    log('📰 General mobilization: men 18–60 are barred from leaving the country.', '🚫', 'bad');
  }

  // Casualties and the mood at home.
  const dead = Math.round(war.intensity ** 2 * rng.int(150, 900) * (war.kind === 'internal' ? 0.6 : 1));
  war.casualties += dead;
  const rally = war.years <= 1 ? 6 : 0;
  war.support = clamp(Math.round(war.support + rally - war.intensity * 3 - war.years * 1.5 - (war.front < -25 ? 6 : 0) + (war.front > 25 ? 4 : 0) + rng.int(-4, 4) + (war.homeFront >= 0.4 ? 8 : 0)), 0, 100);

  // Decisive outcomes.
  if (war.front >= 85) return endWar(ctx, cc, war.kind === 'internal' ? 'ended with the insurgency broken' : 'ended in a clear victory');
  if (war.front <= -85) return endWar(ctx, cc, war.kind === 'internal' ? 'ended in a deal that left armed groups in control of territory' : 'ended in defeat and lost territory');

  // The road to peace.
  if (war.phase === 'talks') {
    if (rng.chance(0.55)) {
      war.phase = 'ceasefire';
      war.ceasefireYears = 0;
      log('📰 A ceasefire took hold. The guns fell silent along the front.', '🕊️', 'good');
    } else {
      war.phase = 'active';
      log('📰 Peace talks broke down. The fighting resumed.', '💥', 'warn');
    }
    return;
  }
  const talkChance = (war.support < 30 ? 0.35 : 0.05) + (Math.abs(war.front) > 55 ? 0.2 : 0) + Math.min(0.3, war.years * 0.04);
  if (rng.chance(talkChance)) {
    war.phase = 'talks';
    log(`📰 ${war.support < 30 ? 'With support collapsing at home, ' : ''}negotiators met to talk about a ceasefire.`, '🤝');
    return;
  }
  if (mine && rng.chance(0.5)) {
    const news = war.front > 25 ? ['the army broke through and retook a string of towns', 'the enemy\'s supply lines collapsed', 'a surprise offensive drove the front forward']
      : war.front < -25 ? ['the front gave way and units fell back', 'a major base was overrun', 'casualty lists filled the morning papers']
        : ['the front hasn\'t moved in months', 'another offensive bogged down in mud and mines', 'both sides traded drone strikes along a frozen line'];
    ctx.log(`📰 ${war.operation}: ${rng.pick(news)}.`, '⚔️');
  }
}

/* ------------------------------------------------------------------ */
/* The war at home: economy, danger, the draft                         */
/* ------------------------------------------------------------------ */

function warEconomy(ctx, war) {
  const e = ctx.state.economy;
  if (!e || war.phase === 'ceasefire') return;
  e.inflation = Math.round((e.inflation + 0.004 * war.intensity) * 1000) / 1000;
  if (e.returns?.sectors?.energy != null) e.returns.sectors.energy = Math.round((e.returns.sectors.energy + 0.05 * war.intensity) * 1000) / 1000;
  // Fighting at home wrecks the economy.
  if (war.homeFront >= 0.3 && war.intensity >= 2) {
    if (e.phase !== 'recession') {
      e.phase = 'recession';
      e.phaseYears = 0;
      ctx.log('📉 The war has thrown the economy into recession: factories bombed, ports closed, investors fleeing.', '📉', 'bad');
    }
    e.unemployment = Math.min(0.2, Math.round((e.unemployment + 0.02 * war.homeFront) * 1000) / 1000);
    e.returns.index = Math.round((e.returns.index - 0.08 * war.homeFront * war.intensity) * 1000) / 1000;
  }
}

/** Danger where you live: strikes, blackouts, and the choice to stay or go. */
function homeFrontYear(ctx, war, rng) {
  const { state } = ctx;
  const danger = homeDanger(state);
  if (danger <= 0) return;
  ctx.stat('stress', Math.round(4 + danger * 8));
  ctx.stat('happiness', -Math.round(2 + danger * 6));
  if (rng.chance(danger * 0.6)) {
    const hit = rng.pick([
      ['Missiles hit an apartment block across the street. You spent the night in the subway.', 'health', -3],
      ['An air raid caught you outside. Shrapnel cut your arm.', 'health', -10],
      ['Strikes on the power grid meant weeks of blackouts through the winter.', 'health', -2],
      ['Shelling damaged your building. The windows are boarded up.', 'property', 0.15],
      ['A drone strike destroyed the factory down the road. Half the street lost their jobs.', 'stress', 6],
    ]);
    ctx.log(hit[0], '💥', 'bad');
    if (hit[1] === 'property') {
      const home = state.housing.properties.find((p) => p.use === 'primary');
      if (home) home.value = Math.round(home.value * (1 - hit[2]));
    } else ctx.stat(hit[1], hit[2]);
  }
  if (state.character.age >= 16 && !state.prompts.some((p) => p.type === 'world.homeFront') && rng.chance(0.35 + danger * 0.4) && !state.world.homeFrontAsked?.[state.character.age]) {
    (state.world.homeFrontAsked ??= {})[state.character.age] = true;
    const mobilized = underMobilization(state);
    ctx.prompt({
      type: 'world.homeFront', icon: '🏚️', title: 'War on Your Doorstep',
      text: `${war.operation}: the fighting is close. Sirens most nights${war.mobilized ? '; men of military age can\'t leave the country' : ''}.`,
      options: [
        { id: 'stay', label: '🏠 Stay and carry on', hint: 'Keep your job and home' },
        { id: 'defence', label: '🦺 Volunteer for civil defence', hint: 'Shelters, rubble, first aid' },
        { id: 'relocate', label: '🚚 Move somewhere safer in the country', hint: 'Away from the front' },
        { id: 'flee', label: '✈️ Flee abroad and claim asylum', hint: mobilized ? 'Barred: you\'re of military age' : 'Move tab: asylum routes', disabled: mobilized },
      ],
      data: {},
    });
  }
}

function draftCheck(ctx, war, rng) {
  const { state } = ctx;
  const age = state.character.age;
  const ages = war.mobilized ? MOBILIZATION_AGES : DRAFT_AGES;
  if (state.character.gender !== 'male' || age < ages[0] || age > ages[1]) return;
  if (!isCitizen(state, here(state))) return;
  if (state.military.service || state.legal.incarceration || state.prompts.some((p) => p.type === 'world.draft')) return;
  if (state.world.deferredAge === age) return;
  if (!rng.chance(war.mobilized ? 0.3 : DRAFT_LOTTERY)) return;
  const enrolled = Boolean(state.education.enrolled);
  const us = here(state) === 'US';
  ctx.prompt({
    type: 'world.draft', icon: '📨', title: us ? 'Order to Report for Induction' : 'Mobilization Order',
    text: us
      ? `Your number came up in the Selective Service lottery. You are ordered to report for induction into the U.S. Army for the duration of ${war.operation}.`
      : `You've been called up for ${war.operation}. Report to the recruitment office within ten days.`,
    options: [
      { id: 'report', label: us ? '🪖 Report for induction' : '🪖 Report for duty' },
      enrolled && !war.mobilized ? { id: 'defer', label: '🎓 Request a student deferment', hint: 'One school year at a time' } : null,
      { id: 'objector', label: '🕊️ File as a conscientious objector', hint: 'If approved: alternative civilian service' },
      { id: 'evade', label: '🏃 Don\'t show up', hint: 'A serious crime', tone: 'danger' },
    ].filter(Boolean),
  });
}

/** Wars far away: news, oil, refugees, and coalitions that pull your country in. */
function globalYear(ctx, rng) {
  const { state } = ctx;
  const w = state.world;
  for (const g of [...w.global]) {
    g.years += 1;
    if (rng.chance(0.15 + g.years * 0.03)) {
      w.global = w.global.filter((x) => x !== g);
      if (rng.chance(0.4)) ctx.log(`📰 A ceasefire ended ${g.name}.`, '🕊️');
      continue;
    }
    if (g.oil && state.economy) state.economy.inflation = Math.round((state.economy.inflation + 0.006) * 1000) / 1000;
  }
  if (w.global.length < 3 && rng.chance(0.06)) {
    const c = rng.pick(GLOBAL_CONFLICTS.filter((x) => !w.global.some((g) => g.id === x.id)));
    if (c) {
      w.global.push({ ...c, intensity: rng.int(1, 3), years: 0 });
      ctx.log(`📰 War broke out: ${c.name}.${c.oil ? ' Oil prices spiked.' : ''}`, '🌍', 'info');
    }
  }
}

/** Refugees from a war abroad arriving where you live. */
function refugeeArrivals(ctx, rng) {
  const { state } = ctx;
  if (state.character.age < 16 || state.prompts.some((p) => p.type === 'world.refugees')) return;
  const sources = [
    ...state.world.global.filter((g) => g.intensity >= 2).map((g) => g.where),
    ...Object.values(state.world.wars).filter((x) => x.country !== here(state) && x.homeFront >= 0.3 && x.phase !== 'ceasefire').map((x) => COUNTRIES[x.country]?.name ?? x.country),
  ];
  if (!sources.length || !rng.chance(0.12)) return;
  const picked = rng.pick(sources);
  const from = /^(Philippines|United States|United Kingdom|Netherlands)$/.test(picked) ? `the ${picked}` : picked;
  ctx.prompt({
    type: 'world.refugees', icon: '🧳', title: 'Refugees Arrive',
    text: `Families fleeing the war in ${from} are arriving in your city with what they could carry.`,
    options: [
      { id: 'volunteer', label: '🤝 Volunteer at the reception center', hint: 'A few weekends' },
      { id: 'sponsor', label: '🏡 Sponsor a family', hint: 'About $12,000 for their first year' },
      { id: 'donate', label: '💵 Donate', hint: '$500' },
      { id: 'ignore', label: '🤷 Not your problem' },
    ],
    data: { from },
  });
}

export const WarModule = {
  id: 'world',
  order: 19,

  init(state, rng) {
    state.world ??= { war: null, history: [] };
    const w = state.world;
    w.seed ??= rng ? rng.int(1, 2 ** 30) : 1;
    w.wars ??= {};
    w.global ??= [];
    // Older lives kept America's war in `war`.
    if (w.war) {
      w.wars.US ??= { country: 'US', front: 0, support: 60, casualties: 0, years: 0, phase: 'active', homeFront: 0, mobilized: false, kind: 'interstate', adversary: 'the enemy', ...w.war };
      delete w.war;
    }
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    WarModule.init(state, ctx.rng);
    const w = state.world;
    const rng = worldRng(state);
    // Every country's wars go on whether or not you live there.
    for (const cc of Object.keys(THEATERS)) {
      const war = w.wars[cc];
      if (war) warYear(ctx, cc, war, rng);
      else if (state.character.age >= 5 && rng.chance(START_CHANCE[cc] ?? 0.01)) startWar(ctx, cc, rng);
    }
    globalYear(ctx, rng);
    const war = warHere(state);
    if (war && war.phase !== 'ceasefire') {
      warEconomy(ctx, war);
      if (war.intensity >= 2) {
        ctx.stat('happiness', -1);
        ctx.stat('stress', 1);
      }
      homeFrontYear(ctx, war, ctx.rng);
      if (war.draft && state.character.age >= 18) draftCheck(ctx, war, ctx.rng);
    }
    refugeeArrivals(ctx, rng);
  },

  resolvers: {
    draft(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const cc = here(state);
      const us = cc === 'US';
      const war = warHere(state);
      if (optionId === 'defer' && state.education.enrolled) {
        state.world.deferredAge = state.character.age;
        return ctx.log('Your student deferment was granted for this school year.', '🎓', 'good');
      }
      if (optionId === 'objector') {
        if (rng.chance(war?.mobilized ? 0.25 : 0.55)) {
          ctx.stat('stress', 6);
          return ctx.log(us ? 'The draft board classified you 1-O: two years of alternative civilian service at a VA hospital instead of military service.' : 'Your objection was accepted: two years of alternative civilian service in hospitals and civil defence.', '🕊️', 'good');
        }
        ctx.log(us ? 'The draft board rejected your conscientious-objector claim.' : 'The recruitment office rejected your objection.', '📭', 'warn');
      }
      if (optionId === 'evade') {
        ctx.log(us ? 'You didn\'t report for induction. The FBI opened a file.' : 'You didn\'t report. The military police put your name on a wanted list.', '🏃', 'bad');
        ctx.emit('legal:offense', { offenseId: 'draftEvasion', context: 'failing to report for induction', caught: rng.chance(war?.mobilized ? 0.6 : 0.4), evidence: 0.8 });
        return;
      }
      const check = enlistmentEligibility(state, 'army', 'enlisted', 'active');
      if (!check.ok) return ctx.log(`You reported for your induction physical and were found unfit (${check.reason}).`, '🩺');
      const e = state.education.enrolled;
      if (e) {
        state.education.enrolled = null;
        ctx.emit('education:left', { reason: 'drafted', enrollment: e });
      }
      if (enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' })) {
        state.military.service.contractYearsLeft = war?.mobilized ? 3 : 2;
        state.military.service.drafted = true;
        ctx.log(us ? 'You were drafted into the Army for two years.' : `You were mobilized into the ${COUNTRIES[cc]?.name ?? ''} army for the duration.`, '🪖', 'milestone');
      }
    },

    homeFront(ctx, _data, optionId) {
      const { state } = ctx;
      if (optionId === 'defence') {
        ctx.stat('stress', 5);
        ctx.stat('happiness', 4);
        state.world.civilDefence = (state.world.civilDefence ?? 0) + 1;
        return ctx.log('You joined a civil defence unit: digging people out of rubble, running a shelter, carrying the wounded.', '🦺', 'good');
      }
      if (optionId === 'relocate') {
        // Somewhere in another province, away from the fighting.
        const away = regionsIn(here(state)).filter((r) => r.state !== stateIdOf(state));
        if (!away.length) return ctx.log('There was nowhere safer to go.', '🏠', 'warn');
        const to = ctx.rng.pick(away);
        changeRegion(ctx, to.id, `You packed what you could and moved to ${to.name}, away from the front.`, { voluntary: true });
        ctx.stat('stress', -4);
        return;
      }
      if (optionId === 'flee') return ctx.log('You started looking for a way out. Asylum routes are on the Move tab.', '✈️', 'warn');
      ctx.log('You stayed. Life went on between the sirens.', '🏠');
    },

    refugees(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId === 'volunteer') {
        ctx.stat('happiness', 4);
        state.civic && (state.civic.goodwill = (state.civic.goodwill ?? 0) + 2);
        return ctx.log(`You spent weekends at the reception center sorting donations and translating for families from ${data.from}.`, '🤝', 'good');
      }
      if (optionId === 'sponsor') {
        if (!ctx.spend(12000, 'Refugee family sponsorship', { credit: true })) return ctx.toast('Sponsoring a family takes about $12,000.', 'warn');
        ctx.stat('happiness', 8);
        state.world.sponsored = (state.world.sponsored ?? 0) + 1;
        return ctx.log(`You sponsored a family from ${data.from}: an apartment, school places for the kids, and a lot of dinners together.`, '🏡', 'milestone');
      }
      if (optionId === 'donate') {
        ctx.spend(500, 'Donation to refugee aid', { allowDebt: true });
        ctx.stat('happiness', 2);
        return ctx.log('You donated to the refugee appeal.', '💵');
      }
      ctx.log('You watched it on the news.', '📺');
    },
  },
};

/** Start a war in a country now (tests and scripted scenarios). */
export function declareWar(ctx, countryId, theaterId = null) {
  const theater = theaterId ? THEATERS[countryId]?.find((t) => t.id === theaterId) : null;
  WarModule.init(ctx.state, ctx.rng);
  return startWar(ctx, countryId, ctx.rng, theater);
}
