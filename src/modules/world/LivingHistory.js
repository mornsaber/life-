/**
 * Living through history: the home front, the epidemic outside the door, the great disasters
 * on their dates, and the crossing when you emigrate.
 *
 *   Home front   tied to the war your country is actually fighting (state.world.wars — the
 *                timeline can run differently): Zeppelin raids and munitions work in the Great
 *                War, Liberty bonds; evacuation, the Blitz, the Home Guard, war work, victory
 *                gardens, the black market and the Volkssturm in the Second; fallout shelters
 *                in the Cuban missile years.
 *   Epidemics    when one reaches you (health/PeriodHealth.js EPIDEMICS): flee to the country,
 *                shut the door, nurse the sick, buy a patent remedy (before the drug laws),
 *                wear a mask (1918, 2020), get the vaccine once there is one. Each changes your
 *                odds of catching it (periodHealth.guard).
 *   Disasters    the great ones on their dates and where they struck: the Irish Famine, the
 *                Chicago fire, Galveston, San Francisco, Messina, Kantō, the Dust Bowl, the
 *                Bengal famine, the Great Smog, Tangshan.
 *   The crossing emigrating before the airliner: six weeks under sail, ten days by steamer,
 *                steerage or cabin, and the arrival hall of the day (Castle Garden, Ellis Island,
 *                Angel Island, Pier 21, Grosse Île).
 *
 * state.lived = [{ id, year, text, icon }]   — what you lived through, for the Life tab
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow } from './Eras.js';
import { warIn } from './War.js';
import { epidemicsNow } from '../health/PeriodHealth.js';
import { REGIONS } from '../life/Regions.js';
import { CONTINENT } from './Travel.js';
import { COUNTRIES, priceLevel } from './Countries.js';
import { arrive } from './Migration.js';
import { addHonor } from '../../core/State.js';
import { rep } from '../life/Reputation.js';

const cc = (state) => state.character.countryId ?? 'US';
const side = (state, salt) => new Random(((state.world?.seed ?? 3) * 1597334677 + yearNow(state) * 7919 + salt) >>> 0);
const livedOf = (state) => (state.lived ??= []);
const seen = (state, id) => livedOf(state).some((l) => l.id === id);
const inWar = (state, id) => warIn(state, cc(state))?.id === id && warIn(state, cc(state))?.phase !== 'ceasefire';
const regionState = (state) => REGIONS[state.character.regionId]?.state ?? null;
const age = (state) => state.character.age;
const female = (state) => state.character.gender === 'female';
const inServices = (state) => Boolean(state.military?.service);
const youngKids = (state) => (state.people?.list ?? []).filter((p) => p.alive && p.relation === 'child' && (p.age ?? 99) < 14);
const P = (state, n) => Math.round(n * priceLevel(state));

/**
 * The episodes: when they can happen, and what each choice does.
 * effect: { log, icon, tone, stats: { stat: n }, cost, earn, risk: [chance, text, stats], guard }
 */
export const EPISODES = [
  // ---------------- The Great War ----------------
  { id: 'zeppelins', icon: '🎈', title: 'Zeppelins Over the City', when: (s, y) => cc(s) === 'GB' && inWar(s, 'ww1') && y >= 1915 && y <= 1918,
    text: 'The airships come on moonless nights. The maroons go off; the bombs fall where they fall.',
    options: [
      { id: 'tube', label: '🚇 Shelter in the Underground', effect: { log: 'You spent the raids on a Tube platform with half the street, singing to keep the children calm.', icon: '🚇', stats: { stress: 3 } } },
      { id: 'roof', label: '👀 Go up on the roof to watch', effect: { log: 'You watched a Zeppelin burn and fall over the city, the whole sky orange.', icon: '🔥', stats: { happiness: 2 }, risk: [0.08, 'Shrapnel from the guns came down on the roof. You were cut badly.', { health: -12 }] } },
    ] },
  { id: 'munitions', icon: '💣', title: 'Munitions Work', when: (s, y) => ['GB', 'FR', 'DE'].includes(cc(s)) && inWar(s, 'ww1') && y >= 1915 && female(s) && age(s) >= 16 && age(s) <= 45,
    text: 'The shell factories want women: good wages, long shifts, and TNT that turns the skin yellow.',
    options: [
      { id: 'work', label: '🏭 Take the job', effect: { log: 'You filled shells for two years. The money was the best you had ever earned; the girls called you a canary.', icon: '🏭', earn: 900, stats: { health: -4, happiness: 3 } } },
      { id: 'no', label: '🏠 Stay at home', effect: { log: 'You stayed home and knitted for the troops.', icon: '🧶' } },
    ] },
  { id: 'libertyBonds', icon: '🗽', title: 'Liberty Bonds', when: (s, y) => cc(s) === 'US' && inWar(s, 'ww1') && y >= 1917 && y <= 1918 && age(s) >= 18,
    text: 'Four-Minute Men speak at the picture house; the neighbours check whose window has the bond sticker.',
    options: [
      { id: 'buy', label: '💵 Buy bonds', effect: { log: 'You bought Liberty Bonds. The sticker went in the window.', icon: '🗽', cost: 200 } },
      { id: 'no', label: '🙅 Don\'t', effect: { log: 'You didn\'t buy bonds. Someone painted "SLACKER" on your fence.', icon: '🖌️', stats: { happiness: -4 } } },
    ] },
  // ---------------- The Second World War ----------------
  { id: 'evacuation', icon: '🧳', title: 'Evacuation', when: (s, y) => cc(s) === 'GB' && inWar(s, 'ww2') && y >= 1939 && y <= 1940 && (age(s) >= 3 && age(s) <= 14 || youngKids(s).length > 0),
    text: (s) => (age(s) <= 14 ? 'A label on your coat, a gas mask in a box, and a train to the country with the rest of the school.' : 'The schools are sending the children to the country, away from the bombers. Will yours go?'),
    options: [
      { id: 'go', label: '🚂 Go to the country', effect: { log: 'Months with strangers in a village that smelled of cows. Some were kind; some just wanted the allowance.', icon: '🚂', stats: { happiness: -6, health: 2 } } },
      { id: 'stay', label: '🏙️ Stay in the city', effect: { log: 'You stayed in the city when so many went. The Blitz was still to come.', icon: '🏙️', stats: { stress: 3 } } },
    ] },
  { id: 'blitz', icon: '💥', title: 'The Blitz', when: (s, y) => cc(s) === 'GB' && inWar(s, 'ww2') && y >= 1940 && y <= 1941,
    text: 'The sirens go every night. Fifty-seven nights in a row for London; Coventry, Liverpool, Glasgow too.',
    options: [
      { id: 'anderson', label: '🏚️ The Anderson shelter in the garden', effect: { log: 'Night after night in the damp Anderson shelter. The house next door took a direct hit.', icon: '🏚️', stats: { stress: 5 }, risk: [0.04, 'A near miss buried the shelter. You were dug out at dawn.', { health: -10 }] } },
      { id: 'tube', label: '🚇 The Underground', effect: { log: 'You slept on the Tube platform with a thousand others. The trains ran over your feet at five.', icon: '🚇', stats: { stress: 3 } } },
      { id: 'bed', label: '🛏️ Stay in bed — what will be, will be', effect: { log: 'You stayed in bed through the raids. Most nights it was fine.', icon: '🛏️', risk: [0.1, 'The house was bombed out around you. You lost nearly everything you owned.', { health: -15, happiness: -10 }, 3000] } },
    ] },
  { id: 'homeGuard', icon: '🪖', title: 'The Home Guard', when: (s, y) => cc(s) === 'GB' && inWar(s, 'ww2') && y >= 1940 && y <= 1944 && !female(s) && age(s) >= 17 && age(s) <= 65 && !inServices(s),
    text: 'Local Defence Volunteers, a broom handle for a rifle at first. Or an armband and a whistle as an air-raid warden.',
    options: [
      { id: 'guard', label: '🪖 Join the Home Guard', effect: { log: 'You drilled on Sundays and guarded the gasworks at night. The invasion never came.', icon: '🪖', stats: { fitness: 2 } } },
      { id: 'warden', label: '📯 Become an ARP warden', effect: { log: 'You walked the blackout as an air-raid warden and dug people out of the rubble after the raids.', icon: '📯', stats: { stress: 6 }, risk: [0.05, 'You went into a burning house for a child and brought her out. The King awarded you the George Medal.', { happiness: 10 }, 0, { honour: 'George Medal' }] } },
      { id: 'no', label: '🙅 Neither', effect: { log: 'You kept your head down.', icon: '🙅' } },
    ] },
  { id: 'warWork', icon: '🔧', title: 'War Work', when: (s, y) => ['GB', 'US', 'CA', 'AU'].includes(cc(s)) && inWar(s, 'ww2') && y >= 1941 && female(s) && age(s) >= 18 && age(s) <= 50,
    text: (s) => (cc(s) === 'GB' ? 'Unmarried women 20–30 are being called up. Munitions, the Land Army or the services?' : 'The factories are hiring women by the thousand: rivets, welding, aircraft.'),
    options: [
      { id: 'factory', label: '🏭 The factory floor', effect: { log: 'You riveted bombers for three years. When the men came home you were let go.', icon: '🏭', earn: 1500, stats: { happiness: 4 } } },
      { id: 'land', label: '🌾 The Land Army', effect: { log: 'You worked a farm in the Land Army: up at five, mud to the knees, strong as a horse by the end.', icon: '🌾', earn: 500, stats: { fitness: 4 } }, if: (s) => cc(s) === 'GB' },
      { id: 'no', label: '🏠 Keep the home going', effect: { log: 'You kept the house running on rations and ingenuity.', icon: '🏠' } },
    ] },
  { id: 'victoryGarden', icon: '🥕', title: 'Dig for Victory', when: (s, y) => ['US', 'GB', 'CA', 'AU', 'NZ'].includes(cc(s)) && inWar(s, 'ww2') && y >= 1941 && age(s) >= 10,
    text: (s) => (cc(s) === 'US' ? 'Victory gardens in every backyard, and war bonds at the bank.' : '"Dig for Victory": the lawns and the parks are turned over to cabbages.'),
    options: [
      { id: 'dig', label: '🥕 Dig the garden up', effect: { log: 'You grew potatoes, beans and cabbages where the lawn had been.', icon: '🥕', stats: { health: 2, happiness: 2 } } },
      { id: 'bonds', label: '💵 Buy war bonds', effect: { log: 'You bought war bonds, a stamp at a time.', icon: '💵', cost: 150 } },
    ] },
  { id: 'blackMarket', icon: '🕶️', title: 'Under the Counter', when: (s, y) => ['GB', 'FR', 'DE', 'NL', 'BE', 'IT'].includes(cc(s)) && (inWar(s, 'ww2') || (y >= 1945 && y <= 1948)) && y >= 1941 && y <= 1948 && age(s) >= 16,
    text: 'Nylons, butter, petrol, cigarettes — the spiv in the pub can get anything, for a price.',
    options: [
      { id: 'buy', label: '🧈 Buy under the counter', effect: { log: 'Real butter, for once. You didn\'t ask where it came from.', icon: '🧈', cost: 60, stats: { happiness: 3 } } },
      { id: 'sell', label: '💼 Do a bit of dealing yourself', effect: { log: 'You moved a few crates of this and that. Good money.', icon: '💼', earn: 800, risk: [0.15, 'The police raided the lock-up. You were fined and named in the local paper.', { happiness: -6 }, 400] } },
      { id: 'no', label: '📕 Stick to the ration book', effect: { log: 'You stuck to the ration book. Fair shares for all.', icon: '📕' } },
    ] },
  { id: 'germanBombing', icon: '🔥', title: 'The Bombing', when: (s, y) => ['DE', 'JP'].includes(cc(s)) && inWar(s, 'ww2') && y >= (cc(s) === 'JP' ? 1944 : 1942),
    text: 'The bombers come by night and by day now. Whole districts burn.',
    options: [
      { id: 'cellar', label: '🕳️ The cellar', effect: { log: 'You spent the raids in the cellar, listening to the city burn overhead.', icon: '🕳️', stats: { stress: 8 }, risk: [0.08, 'The building collapsed onto the cellar. You were dug out two days later.', { health: -18 }] } },
      { id: 'leave', label: '🚶 Leave for the countryside', effect: { log: 'You left the city for a relative\'s farm. The flat you left was gone by spring.', icon: '🚶', stats: { happiness: -4 } } },
    ] },
  { id: 'volkssturm', icon: '🪖', title: 'The Volkssturm', when: (s, y) => cc(s) === 'DE' && inWar(s, 'ww2') && y >= 1944 && !female(s) && age(s) >= 16 && age(s) <= 60 && !inServices(s),
    text: 'Every man from sixteen to sixty: an armband, a Panzerfaust, and orders to hold the street.',
    options: [
      { id: 'serve', label: '🪖 Report', effect: { log: 'Old men and boys with anti-tank rockets. You surrendered to the first Allied patrol you saw.', icon: '🏳️', stats: { stress: 10 }, risk: [0.15, 'You were wounded in the last fighting.', { health: -20 }] } },
      { id: 'hide', label: '🏚️ Hide until it\'s over', effect: { log: 'You hid in a cellar. Deserters were being hanged from lampposts; nobody came for you.', icon: '🏚️', stats: { stress: 12 } } },
    ] },
  // ---------------- The Cold War ----------------
  { id: 'falloutShelter', icon: '☢️', title: 'The Fallout Shelter', when: (s, y) => cc(s) === 'US' && y >= 1961 && y <= 1963 && age(s) >= 25,
    text: 'The President says every family should have one. The missiles are ninety miles from Florida.',
    options: [
      { id: 'build', label: '🏗️ Build one in the backyard', effect: { log: 'You built a shelter in the backyard and stocked it with canned peaches. It became a wine cellar.', icon: '☢️', cost: 2500 } },
      { id: 'no', label: '🙄 Take your chances', effect: { log: 'You decided that if it came to that, you\'d rather not be around.', icon: '🙄' } },
    ] },
];

/** The great disasters, on their dates and where they struck. */
export const DISASTERS = [
  { id: 'irishFamine', years: [1845, 1849], where: (s) => cc(s) === 'IE', icon: '🥔', title: 'The Great Hunger', text: 'The potatoes rot in the ground, black and stinking, year after year.',
    options: [
      { id: 'emigrate', label: '🚢 Take ship for America', effect: { log: 'You sold what you had for a passage to America.', icon: '🚢', emigrate: 'US' } },
      { id: 'soup', label: '🥣 The soup kitchen and the public works', effect: { log: 'Breaking stones on the relief works for a bowl of soup. Half the townland was gone by the end.', icon: '🥣', stats: { health: -15, happiness: -12 }, risk: [0.12, 'The famine fever took you.', null, 0, { die: 'famine fever' }] } },
    ] },
  { id: 'chicagoFire', years: [1871, 1871], where: (s) => s.character.regionId === 'chicago', icon: '🔥', title: 'The Great Chicago Fire', text: 'A barn on DeKoven Street, a dry October wind, and the city is burning.',
    options: [
      { id: 'flee', label: '🏃 Run for the lake', effect: { log: 'You stood in Lake Michigan up to your neck while the city burned behind you.', icon: '🔥', stats: { happiness: -6 }, risk: [0.5, 'Your home burned to the ground.', { happiness: -8 }, 4000] } },
      { id: 'save', label: '🪣 Try to save the house', effect: { log: 'Buckets and wet blankets against a firestorm.', icon: '🪣', risk: [0.35, 'The fire came over the roof. You barely got out, burned.', { health: -18 }, 4000] } },
    ] },
  { id: 'galveston', years: [1900, 1900], where: (s) => s.character.regionId === 'houston', icon: '🌀', title: 'The Galveston Hurricane', text: 'The Gulf rises over the island in a night. Six thousand drown.',
    options: [
      { id: 'inland', label: '🚂 Get inland', effect: { log: 'You got out on the last train across the causeway.', icon: '🚂' } },
      { id: 'ride', label: '🏠 Ride it out', effect: { log: 'You rode it out on the roof of a house that floated.', icon: '🌊', stats: { stress: 12 }, risk: [0.2, 'You were swept away in the surge.', null, 0, { die: 'drowned in the Galveston hurricane' }] } },
    ] },
  { id: 'sfQuake', years: [1906, 1906], where: (s) => s.character.regionId === 'sf', icon: '🌉', title: 'The Great Earthquake', text: 'At 5:12 in the morning the ground rolls like the sea; then the city burns for three days.',
    options: [
      { id: 'park', label: '⛺ The tent camps in Golden Gate Park', effect: { log: 'You lived in a relief tent in the park for a year while the city was rebuilt.', icon: '⛺', stats: { happiness: -6 }, risk: [0.5, 'Your home was lost to the fire.', null, 3500] } },
      { id: 'help', label: '🧱 Dig people out', effect: { log: 'You dug in the rubble with your hands until the soldiers moved everyone back from the fire.', icon: '🧱', stats: { stress: 8, happiness: 3 } } },
    ] },
  { id: 'messina', years: [1908, 1908], where: (s) => cc(s) === 'IT' && side(s, 3).chance(0.3), icon: '🏚️', title: 'The Messina Earthquake', text: 'Messina and Reggio flattened in thirty seconds, then the sea came in.',
    options: [{ id: 'survive', label: '🙏 Survive it', effect: { log: 'You survived the earthquake that killed most of Messina.', icon: '🏚️', stats: { happiness: -12, stress: 10 }, risk: [0.2, 'You lost everything.', null, 2500] } }] },
  { id: 'kanto', years: [1923, 1923], where: (s) => cc(s) === 'JP' && ['tokyo', 'yokohama', 'yokosuka'].includes(s.character.regionId), icon: '🔥', title: 'The Great Kantō Earthquake', text: 'Noon on the first of September: the lunch fires are lit when the city shakes apart.',
    options: [{ id: 'survive', label: '🏃 Run from the fires', effect: { log: 'You ran from the firestorm and lived; a hundred thousand didn\'t.', icon: '🔥', stats: { happiness: -10, stress: 10 }, risk: [0.15, 'Burned in the fires.', { health: -20 }] } }] },
  { id: 'dustBowl', years: [1932, 1936], where: (s) => cc(s) === 'US' && ['KS', 'OK', 'TX', 'CO', 'NM', 'NE'].includes(regionState(s)), icon: '🌪️', title: 'The Dust Bowl', text: 'Black blizzards: dust so thick you light the lamps at noon, and the topsoil blowing to the Atlantic.',
    options: [
      { id: 'stay', label: '🌾 Stay and hold on', effect: { log: 'You stayed, wet sheets over the windows, and coughed through the dirty thirties.', icon: '🌪️', stats: { health: -8, happiness: -8 } } },
      { id: 'west', label: '🚗 Load the truck for California', effect: { log: 'You loaded everything onto the truck and drove Route 66 west. In California they called you an Okie.', icon: '🚗', stats: { happiness: -4 } } },
    ] },
  { id: 'bengalFamine', years: [1943, 1944], where: (s) => cc(s) === 'IN' && side(s, 5).chance(0.35), icon: '🍚', title: 'The Bengal Famine', text: 'Rice for the army and the cities, and none in the villages. Three million will die.',
    options: [{ id: 'survive', label: '🙏 Get through it', effect: { log: 'You lived through the famine of \'43. Many of your neighbours did not.', icon: '🍚', stats: { health: -14, happiness: -15 }, risk: [0.08, 'Hunger took you.', null, 0, { die: 'starvation' }] } }] },
  { id: 'greatSmog', years: [1952, 1952], where: (s) => cc(s) === 'GB' && (s.character.regionId === 'london' || side(s, 7).chance(0.15)), icon: '🌫️', title: 'The Great Smog', text: 'Five days in December when you can\'t see your own feet. The bus conductors walk ahead with torches.',
    options: [
      { id: 'in', label: '🏠 Stay indoors', effect: { log: 'You stayed in with the windows shut while the smog killed four thousand people in a week.', icon: '🌫️', stats: { health: -3 } } },
      { id: 'out', label: '🚶 Go to work anyway', effect: { log: 'You walked to work through the smog with a scarf over your mouth.', icon: '🚶', stats: { health: -8 }, risk: [0.03, 'The smog finished your lungs.', null, 0, { die: 'the Great Smog' }] } },
    ] },
  { id: 'tangshan', years: [1976, 1976], where: (s) => cc(s) === 'CN' && side(s, 9).chance(0.1), icon: '🏚️', title: 'The Tangshan Earthquake', text: 'At 3:42 in the morning a city of a million falls down.',
    options: [{ id: 'survive', label: '🙏 Survive', effect: { log: 'You were pulled from the ruins of Tangshan after a day and a night.', icon: '🏚️', stats: { health: -15, happiness: -12 } } }] },
];

/** Responses to an epidemic, in the means of the day. guard: × the odds of catching it. */
export function epidemicOptions(state, e) {
  const y = yearNow(state);
  const o = [];
  if (y < 1950) o.push({ id: 'flee', label: '🚂 Leave for the country until it passes', guard: 0.35, cost: 400, hint: 'If you can afford it' });
  o.push({ id: 'shut', label: '🚪 Shut the door and keep the children in', guard: 0.6, stats: { happiness: -3 } });
  if (e.id === 'spanishFlu' || e.id === 'covid') o.push({ id: 'mask', label: '😷 Mask up and keep apart', guard: 0.7 });
  if (e.id === 'covid' && y >= 2021) o.push({ id: 'vaccine', label: '💉 Get vaccinated', guard: 0.4 });
  const quacksUntil = cc(state) === 'US' ? 1938 : 1968;
  if (y < quacksUntil) o.push({ id: 'quack', label: '🧴 A bottle of patent remedy', guard: 1, cost: 15, hint: 'Guaranteed by the man selling it' });
  o.push({ id: 'nurse', label: '🤲 Nurse the sick', guard: 1.8, stats: { happiness: 3 }, hint: 'The neighbours will remember' });
  o.push({ id: 'carry', label: '🤷 Carry on as usual', guard: 1 });
  return o;
}

function record(state, id, text, icon) { livedOf(state).push({ id, year: yearNow(state), text, icon }); }

function applyEffect(ctx, id, ef) {
  const { state, rng } = ctx;
  if (ef.cost) ctx.spend(P(state, ef.cost), ef.log.slice(0, 40), { allowDebt: true });
  if (ef.earn) ctx.earn(P(state, ef.earn), 'War work');
  for (const [k, v] of Object.entries(ef.stats ?? {})) ctx.stat(k, v);
  ctx.log(ef.log, ef.icon ?? '•', ef.tone ?? 'info');
  record(state, id, ef.log, ef.icon);
  if (ef.emigrate) arrive(ctx, ef.emigrate, { reason: 'Emigrated' });
  if (ef.risk && rng.chance(ef.risk[0])) {
    const [, text, stats, loss, extra] = ef.risk;
    if (extra?.die) { ctx.log(text, '🕯️', 'bad'); return void ctx.die(extra.die); }
    for (const [k, v] of Object.entries(stats ?? {})) ctx.stat(k, v);
    if (loss) ctx.spend(P(state, loss), 'Lost in the disaster', { allowDebt: false });
    if (extra?.honour) addHonor(state, { id: `lived.${id}`, source: 'civil', name: extra.honour, icon: '🎖️', prestige: 30, precedence: 30, citation: text });
    ctx.log(text, extra?.honour ? '🎖️' : '⚠️', extra?.honour ? 'milestone' : 'bad');
  }
}

function prompt(ctx, kind, ep, text) {
  ctx.prompt({ type: `livingHistory.${kind}`, icon: ep.icon, title: ep.title, text, data: { id: ep.id }, options: ep.options.filter((o) => !o.if || o.if(ctx.state)).map((o) => ({ id: o.id, label: o.label, ...(o.hint ? { hint: o.hint } : {}) })) });
}

function tick(ctx) {
  const { state } = ctx;
  if (!state.era && yearNow(state) >= 2026) return;
  const y = yearNow(state);
  if (state.prompts.some((p) => p.type?.startsWith('livingHistory.'))) return;
  const ep = EPISODES.find((e) => !seen(state, e.id) && e.when(state, y));
  if (ep) return prompt(ctx, 'episode', ep, typeof ep.text === 'function' ? ep.text(state) : ep.text);
  const d = DISASTERS.find((e) => !seen(state, e.id) && y >= e.years[0] && y <= e.years[1] && e.where(state));
  if (d) return prompt(ctx, 'disaster', d, d.text);
  const ph = state.periodHealth;
  const e = epidemicsNow(state).find((x) => !seen(state, `epi.${x.id}`));
  if (e && ph) {
    ctx.prompt({ type: 'livingHistory.epidemic', icon: '🦠', title: `${e.name.replace(/^./, (c) => c.toUpperCase())} Is Here`, text: `${e.name.replace(/^./, (c) => c.toUpperCase())} has reached ${(REGIONS[state.character.regionId]?.name ?? 'your town').split(',')[0]}. What do you do?`, data: { id: e.id }, options: epidemicOptions(state, e).map(({ id, label, hint }) => ({ id, label, ...(hint ? { hint } : {}) })) });
  }
}

/** The crossing, for an emigrant before the airliner. */
export function crossingOf(from, to, y) {
  const cont = (c) => Object.entries(CONTINENT).find(([, ids]) => ids.includes(c))?.[0] ?? null;
  if (y >= 1958 || cont(from) === cont(to)) return null;
  const sail = y < 1870;
  const arrival = to === 'US' ? (cont(from) === 'Asia & Pacific' && y >= 1910 && y <= 1940 ? 'Angel Island' : y >= 1892 && y <= 1924 ? 'Ellis Island' : y >= 1855 && y < 1892 ? 'Castle Garden' : 'the docks')
    : to === 'CA' ? (y >= 1928 ? 'Pier 21 in Halifax' : y >= 1832 && y <= 1937 ? 'the quarantine station at Grosse Île' : 'Quebec')
      : to === 'AU' ? 'Station Pier' : to === 'AR' ? (y >= 1911 ? 'the Hotel de Inmigrantes in Buenos Aires' : 'Buenos Aires') : 'the quay';
  return { sail, weeks: sail ? 6 : 1.5, arrival };
}
function onMoved(ctx, { from, to }) {
  const { state, rng } = ctx;
  const y = yearNow(state);
  const c = crossingOf(from, to, y);
  if (!c) return;
  const steerage = (state.finances?.cash ?? 0) < P(state, 3000);
  const text = `${c.sail ? `Six weeks under sail` : 'Ten days by steamer'} ${steerage ? 'in steerage, two hundred to a hold' : 'in a cabin'}, from ${COUNTRIES[from]?.name ?? from} to ${COUNTRIES[to]?.name ?? to}. You landed at ${c.arrival}${c.arrival === 'Ellis Island' ? ', where a doctor chalked letters on the coats of the ones they would send back' : ''}.`;
  ctx.log(text, c.sail ? '⛵' : '🚢', 'milestone');
  record(state, `crossing.${y}`, text, '🚢');
  if (steerage && c.sail && rng.chance(y >= 1846 && y <= 1849 ? 0.2 : 0.06)) {
    ctx.stat('health', -15);
    ctx.log('Ship fever broke out below decks. You arrived thin and shaking, and some didn\'t arrive at all.', '🤒', 'bad');
  }
}

export const LivingHistoryResolvers = {
  episode(ctx, data, optionId) { const ep = EPISODES.find((e) => e.id === data.id); const o = ep?.options.find((x) => x.id === optionId); if (o) applyEffect(ctx, ep.id, o.effect); },
  disaster(ctx, data, optionId) { const ep = DISASTERS.find((e) => e.id === data.id); const o = ep?.options.find((x) => x.id === optionId); if (o) applyEffect(ctx, ep.id, o.effect); },
  epidemic(ctx, data, optionId) {
    const { state } = ctx;
    const e = epidemicsNow(state).find((x) => x.id === data.id) ?? { id: data.id, name: 'the epidemic' };
    const o = epidemicOptions(state, e).find((x) => x.id === optionId);
    if (!o) return;
    ((state.periodHealth ??= {}).guard ??= {})[e.id] = o.guard;
    if (o.cost) ctx.spend(P(state, o.cost), o.id === 'quack' ? 'A patent remedy' : 'Leaving town', { allowDebt: true });
    for (const [k, v] of Object.entries(o.stats ?? {})) ctx.stat(k, v);
    const text = {
      flee: `You left town until ${e.name} passed.`, shut: 'You barred the door and kept everyone inside.', mask: 'You masked up and kept your distance.',
      vaccine: 'You rolled up your sleeve.', quack: 'You bought a bottle of the remedy. It was mostly alcohol.', nurse: 'You went house to house nursing the sick.', carry: 'You carried on as if nothing had changed.',
    }[o.id];
    ctx.log(text, '🦠', 'info');
    record(state, `epi.${e.id}`, text, '🦠');
    if (o.id === 'nurse') rep(ctx, 'neighbourhood', 8, 'nursing the sick');
  },
};

export const LivingHistoryModule = {
  id: 'livingHistory',
  order: 33,
  setup(engine) {
    engine.bus.on('migration:moved', ({ ctx, from, to }) => onMoved(ctx, { from, to }));
  },
  onAgeUp: tick,
  resolvers: LivingHistoryResolvers,
};
export const livedThrough = (state) => livedOf(state);
