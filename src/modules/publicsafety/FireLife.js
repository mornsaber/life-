/**
 * The fire service beyond the ladder.
 *
 *   Stations     Where you work decides your career: a busy downtown engine
 *                company, a truck (ladder) company, the heavy rescue, a quiet
 *                suburban house, the airport crash-fire-rescue station, the
 *                hazmat company, or the wildland-urban interface.
 *   Shifts       24 on / 48 off, 48/96, or a Kelly schedule. Days off are why
 *                so many firefighters run a side business or second job.
 *   Teams        Paramedic firefighter, hazmat, technical rescue (rope,
 *                confined space, trench, swift water), dive rescue, wildland
 *                strike teams (out-of-state deployments, big overtime),
 *                training officer, and the IAFF local.
 *   The work     Most runs are medical; real fires are rarer and decide
 *                careers: a report of people trapped, a mayday, an
 *                extrication, a high-rise, a hazmat leak.
 *   The cost     Smoke, diesel exhaust and contaminated gear: firefighters get
 *                cancer at higher rates. Clean-cab practices and annual
 *                screening help; presumptive-cancer laws cover treatment.
 *   Promotions   Civil-service exams and eligibility lists (CivilService).
 *
 * state.fireLife = { station, shift, teams: {}, runs, fires, saves, injuries, exposure, decon, screening, sideJob, strikeTeams }
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly, yearsInProfession } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { sitExam, listTick, nextExam } from './CivilService.js';

export const FIRE_PROFESSIONS = ['fire', 'airportFire', 'stateFire', 'privateFire'];
export const isFirefighter = (job) => FIRE_PROFESSIONS.includes(job?.professionId);
/** Departments that only run certain stations; everyone else runs the city ones. */
const STATION_SETS = { airportFire: ['airport'], stateFire: ['forest', 'helitack', 'camp', 'airattack'], privateFire: ['airport', 'industrial', 'contractWildland'] };
const STATE_ONLY = [...STATION_SETS.stateFire, 'industrial', 'contractWildland'];
export const stationsFor = (professionId) => STATION_SETS[professionId] ?? Object.keys(STATIONS).filter((id) => !STATE_ONLY.includes(id));
const DEFAULT_STATION = { airportFire: 'airport', stateFire: 'forest', privateFire: 'industrial' };

export const STATIONS = {
  engine: { name: 'Downtown engine company', icon: '🚒', runs: 1.3, fires: 1.4, risk: 1.1, desc: 'The busiest house in the city: medical calls all day, working fires every week.' },
  truck: { name: 'Truck (ladder) company', icon: '🪜', runs: 1.0, fires: 1.3, risk: 1.3, desc: 'Forcible entry, search, ventilation and the aerial ladder.' },
  rescue: { name: 'Heavy rescue company', icon: '🧗', runs: 0.8, fires: 1.0, risk: 1.4, years: 4, desc: 'The city\'s best: extrications, collapses, rope and water rescues.' },
  suburban: { name: 'Suburban station', icon: '🏡', runs: 0.6, fires: 0.5, risk: 0.7, desc: 'Lift assists, alarms and the occasional kitchen fire. Lots of training.' },
  airport: { name: 'Airport crash-fire-rescue', icon: '✈️', runs: 0.3, fires: 0.2, risk: 0.6, years: 2, desc: 'Foam trucks at the runway: quiet for years, then everything at once.' },
  hazmat: { name: 'Hazmat company', icon: '☣️', runs: 0.7, fires: 0.6, risk: 1.0, cred: 'hazmatOps', desc: 'Chemical leaks, tanker rollovers and suspicious powders.' },
  wildland: { name: 'Wildland-urban interface station', icon: '🌲', runs: 0.7, fires: 0.9, risk: 1.0, desc: 'Brush trucks and a fire season that gets longer every year.' },
  // State fire agency (CAL FIRE-style): wildland protection of state responsibility lands.
  forest: { name: 'Forest fire station (engine crew)', icon: '🚒', runs: 0.35, fires: 1.6, risk: 1.1, desc: 'A Type 3 engine in the hills: initial attack all summer, medical aids and wrecks in winter.' },
  helitack: { name: 'Helitack base', icon: '🚁', runs: 0.2, fires: 1.8, risk: 1.4, years: 2, cred: 'wildlandFF1', desc: 'Fly to new starts and cut line before they grow — rappel in where trucks can\'t go.' },
  camp: { name: 'Conservation camp (hand crews)', icon: '🪓', runs: 0.15, fires: 1.5, risk: 1.2, years: 3, desc: 'Lead hand crews cutting line on the big fires; fuels projects the rest of the year.' },
  // Private fire contractors: plant brigades and fire-season crews (airports above).
  industrial: { name: 'Industrial fire brigade (refinery/plant)', icon: '🏭', runs: 0.25, fires: 0.6, risk: 1.0, cred: 'hazmatOps', desc: 'Tank fires, process upsets and confined-space rescues at a refinery or chemical plant.' },
  contractWildland: { name: 'Contract wildland crew', icon: '🔥', runs: 0.15, fires: 1.4, risk: 1.2, desc: 'Private engines and crews hired by the agencies for fire season — paid by the day.' },
  airattack: { name: 'Air attack base', icon: '✈️', runs: 0.1, fires: 1.2, risk: 0.8, years: 8, cred: 'ics300', desc: 'Circle the fire in the air-attack plane and direct tankers and helicopters.' },
};

export const SHIFTS = {
  '24-48': { name: '24 on / 48 off', icon: '🔁', desc: 'Ten shifts a month.' },
  '48-96': { name: '48 on / 96 off', icon: '🔂', desc: 'Two days on, four off — fewer commutes, longer tours.' },
  kelly: { name: 'Kelly schedule', icon: '📅', desc: '24/48 with an extra day off every few weeks.' },
  season: { name: 'Fire season: 72 on / 24 off', icon: '🔥', desc: 'Wildland crews live at the station all summer, then get the winter off.' },
};

export const TEAMS = {
  medic: { name: 'Paramedic firefighter', icon: '💉', cred: 'paramedic', pay: 7000, desc: 'Run the medical calls at the paramedic level: a steady stipend.' },
  hazmat: { name: 'Hazmat team', icon: '☣️', cred: 'hazmatOps', years: 3, pay: 3000, exposure: 1, desc: 'Level A suits, decon lines, air monitoring.' },
  techRescue: { name: 'Technical rescue team', icon: '🧗', years: 3, fitness: 60, pay: 3000, risk: 0.4, desc: 'Rope, confined space, trench and swift-water rescue.' },
  dive: { name: 'Dive rescue team', icon: '🤿', years: 3, fitness: 65, pay: 3000, risk: 0.4, desc: 'Black-water recoveries and the occasional miracle.' },
  strike: { name: 'Wildland strike team', icon: '🔥', years: 2, fitness: 55, exposure: 1, desc: 'Deploy for two weeks at a time to big fires across the West — at overtime rates.' },
  training: { name: 'Training officer', icon: '🎓', cred: 'fireOfficer1', years: 6, pay: 2000, desc: 'Run the drill ground and the recruit academy.' },
  union: { name: 'IAFF local officer', icon: '✊', years: 5, desc: 'Contract negotiations, grievances and the fight for staffing.' },
};
export const MAX_TEAMS = 2;

const fl = (state) => state.fireLife;

export function stationEligibility(state, id) {
  const st = STATIONS[id];
  const job = state.career.job;
  if (!st || !isFirefighter(job)) return { ok: false, reason: 'Firefighters only' };
  if (!stationsFor(job.professionId).includes(id)) return { ok: false, reason: job.professionId === 'airportFire' ? 'Airport firefighters work the airport' : 'Not one of your department\'s stations' };
  if (st.years && !['airportFire', 'privateFire'].includes(job.professionId) && yearsInProfession(state, FIRE_PROFESSIONS) < st.years) return { ok: false, reason: `${st.years} years on the job first` };
  if (st.cred && !hasCredential(state, st.cred)) return { ok: false, reason: { hazmatOps: 'Needs HazMat Operations', wildlandFF1: 'Needs Wildland Squad Boss (FFT1)', ics300: 'Needs ICS-300' }[st.cred] };
  return { ok: true };
}

export function teamEligibility(state, id) {
  const t = TEAMS[id];
  if (!t || !isFirefighter(state.career.job)) return { ok: false, reason: 'Firefighters only' };
  if (state.career.job.professionId === 'airportFire' && ['strike', 'dive'].includes(id)) return { ok: false, reason: 'Not an airport fire department team' };
  if (state.career.job.professionId === 'stateFire' && ['dive', 'hazmat'].includes(id)) return { ok: false, reason: 'Not a state fire agency team' };
  if (state.career.job.professionId === 'privateFire' && ['dive', 'union', 'training'].includes(id)) return { ok: false, reason: 'Not a team at a fire contractor' };
  if (t.cred && !hasCredential(state, t.cred)) return { ok: false, reason: { paramedic: 'Needs a paramedic certification', hazmatOps: 'Needs HazMat Operations', fireOfficer1: 'Needs Fire Officer I' }[t.cred] };
  if (t.years && yearsInProfession(state, FIRE_PROFESSIONS) < t.years) return { ok: false, reason: `${t.years} years on the job first` };
  if (t.fitness && state.stats.fitness < t.fitness) return { ok: false, reason: `Needs ${t.fitness}+ fitness` };
  if (!fl(state).teams[id] && Object.keys(fl(state).teams).length >= MAX_TEAMS) return { ok: false, reason: `${MAX_TEAMS} teams at most` };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

const CALLS = [
  { id: 'entrapment', icon: '🔥', title: 'Reported Entrapment', text: 'Two-story house, heavy fire on the first floor. A neighbor is screaming that a child sleeps in the back bedroom upstairs.', options: [
    { id: 'search', label: '🧑‍🚒 Go up the interior stairs and search', check: 55, text: 'You found her under the bed, bagged her on your air and came down the ladder. She lived.', perf: 12, save: 1, valor: true, trauma: 8, exposure: 2, fail: { text: 'The stairs gave way under you. Your crew pulled you out with burns; the truck company found the girl.', injury: 1, exposure: 2, trauma: 10 } },
    { id: 'ladder', label: '🪜 Wait for the truck and go in through the window', check: 45, text: 'A ladder to the window, a quick search, and a child in your arms.', perf: 8, save: 1, exposure: 1, fail: { text: 'By the time the ladder was up, the room had flashed over.', trauma: 18, perf: -4 } },
  ] },
  { id: 'mayday', icon: '📢', title: 'Mayday', text: '"Mayday, mayday, mayday" — a firefighter is lost and low on air inside a warehouse. You\'re on the rapid intervention team.', options: [
    { id: 'rit', label: '🧑‍🚒 Go in on his PASS alarm', check: 55, text: 'You found him tangled in wires, swapped his air and dragged him out. He\'s back at work.', perf: 14, save: 1, valor: true, trauma: 10, exposure: 2, fail: { text: 'You reached him too late. The funeral had bagpipes and a thousand firefighters.', trauma: 25 } },
  ] },
  { id: 'extrication', icon: '🚗', title: 'Extrication', text: 'A pickup under a semi trailer. The driver is pinned and conscious.', options: [
    { id: 'tools', label: '🔧 Cut the roof and dash-roll', check: 45, text: 'Twelve minutes from arrival to the helicopter.', perf: 6, save: 1, fail: { text: 'It took forty minutes. He made it, barely.', perf: 0 } },
  ] },
  { id: 'cardiac', icon: '💔', title: 'Cardiac Arrest', text: 'A man collapsed on a basketball court. You\'re first on scene — most calls are medical.', options: [
    { id: 'cpr', label: '❤️ CPR and the AED', check: 40, text: 'One shock, and a pulse. He came by the station with cookies a month later.', perf: 4, save: 1, fail: { text: 'You worked him until the medics took over. He didn\'t make it.', trauma: 2 } },
  ] },
  { id: 'highrise', icon: '🏢', title: 'High-Rise Fire', text: 'Fire on the 14th floor of an apartment tower. Elevators are out.', options: [
    { id: 'stairs', label: '🧗 Hump the hose up the stairs', check: 50, fitness: true, text: 'Fourteen floors with a hose pack. You knocked it down and the tower held.', perf: 8, exposure: 2, fail: { text: 'You were exhausted at the 10th floor. Heat exhaustion — you were the one carried out.', injury: 0.6, exposure: 1 } },
  ] },
  { id: 'hazmat', icon: '☣️', title: 'Tanker Leak', text: 'A tanker rolled on the highway. Something is leaking and the placard is unreadable.', options: [
    { id: 'isolate', label: '🛑 Isolate, deny entry, identify from upwind', text: 'Ammonia. You evacuated half a mile and nobody was hurt.', perf: 6 },
    { id: 'rush', label: '🏃 Go check the driver', check: 50, text: 'You pulled him out, holding your breath. Then you were the patient.', perf: 2, save: 1, injury: 0.5, exposure: 2, fail: { text: 'You were overcome by fumes.', injury: 1, exposure: 2 } },
  ] },
  { id: 'brush', icon: '🌲', title: 'Wind-Driven Brush Fire', text: 'Fifty-mile-an-hour winds are pushing a brush fire toward a subdivision.', options: [
    { id: 'structure', label: '🏠 Structure protection on the fire line', check: 50, text: 'You saved forty homes and lost two.', perf: 8, exposure: 1, fail: { text: 'The fire jumped your line. You had to deploy to a safety zone.', trauma: 10 } },
    { id: 'evac', label: '🚨 Help evacuate instead', text: 'Everyone got out. Eleven homes burned.', perf: 4 },
  ] },
];

const ARFF_CALLS = [
  { id: 'alert2', icon: '🛬', title: 'Alert 2: Landing Gear', text: 'A regional jet with 70 aboard reports a landing-gear indication. You stage your crash trucks along the runway.', options: [
    { id: 'stage', label: '🚒 Stage at the predicted stopping point', check: 45, text: 'The gear held. The jet rolled past your trucks and the passengers applauded you through the windows.', perf: 5, fail: { text: 'The nose gear collapsed. You foamed the sparks before anything caught; everyone walked off.', perf: 8, save: 1 } },
  ] },
  { id: 'crash', icon: '🔥', title: 'Alert 3: Aircraft Down', text: 'A cargo plane overran the runway and is burning in the grass. Two crew are in the cockpit.', options: [
    { id: 'foam', label: '💦 Foam a path and pull the crew', check: 55, text: 'Your crash truck laid foam on the move; your crew cut the crew out. Both lived.', perf: 15, save: 2, valor: true, trauma: 12, exposure: 2, fail: { text: 'The fuel fire beat you to the cockpit.', trauma: 22, exposure: 2 } },
  ] },
  { id: 'fuel', icon: '⛽', title: 'Fuel Spill at the Gate', text: 'A fueling truck dumped 300 gallons of jet fuel under a loaded plane at the gate.', options: [
    { id: 'blanket', label: '🧯 Blanket it with foam and deplane', text: 'No ignition. The flight left two hours late.', perf: 5 },
  ] },
  { id: 'terminal', icon: '❤️', title: 'Cardiac Arrest in the Terminal', text: 'A traveler collapses at Gate B14. ARFF crews are the airport\'s first responders.', options: [
    { id: 'cpr', label: '❤️ CPR and the AED', check: 40, text: 'A pulse before the ambulance arrived. He made his next flight — in a month.', perf: 4, save: 1, fail: { text: 'You worked him the whole way to the ambulance.', trauma: 2 } },
  ] },
];

const WILDLAND_CALLS = [
  { id: 'initialAttack', icon: '🔥', title: 'Initial Attack', text: 'A new start on a grassy slope, three acres and running uphill toward a ridge of houses. You\'re the first engine in.', options: [
    { id: 'anchor', label: '🧑‍🚒 Anchor and flank it with hose lays', check: 45, text: 'You held it at eleven acres. Nobody outside the county will ever hear about it — that\'s the point.', perf: 8, exposure: 1, fail: { text: 'The wind came up and it crowned out of reach. It became a named fire.', perf: -2, exposure: 2 } },
    { id: 'structure', label: '🏠 Go straight to the houses', text: 'Every house saved; the fire grew to 400 acres behind you.', perf: 4, exposure: 1 },
  ] },
  { id: 'burnover', icon: '🌪️', title: 'Burnover', text: 'The wind shifted and the fire is coming up the drainage at your crew. The safety zone is a quarter mile back.', options: [
    { id: 'run', label: '🏃 Get everyone to the safety zone', check: 50, fitness: true, text: 'Everyone made it with a minute to spare. You counted heads twice.', perf: 10, save: 3, valor: true, trauma: 14, exposure: 2, fail: { text: 'You deployed fire shelters in the black. Everyone lived; two firefighters were burned.', trauma: 22, injury: 0.6, exposure: 3 } },
    { id: 'shelter', label: '⛺ Deploy shelters where you are', check: 60, text: 'The front passed over you in ninety roaring seconds. Everyone came out of the shelters alive.', perf: 4, trauma: 20, exposure: 3, fail: { text: 'Not everyone came out. The investigation will take a year.', trauma: 30, injury: 1, exposure: 3 } },
  ] },
  { id: 'spot', icon: '💥', title: 'Spot Fire Across the Line', text: 'Embers landed across your dozer line. A spot fire is growing in unburned fuel.', options: [
    { id: 'hit', label: '🪓 Pull the crew over and catch it', check: 45, fitness: true, text: 'Caught at half an acre. The line held.', perf: 7, exposure: 1, fail: { text: 'It got away and took two more days of line.', perf: -2, exposure: 2 } },
    { id: 'air', label: '🚁 Call for a bucket drop', text: 'A helicopter knocked it down in two drops while your crew lined it.', perf: 5 },
  ] },
  { id: 'evac', icon: '🚗', title: 'Evacuation Gridlock', text: 'The only road out of a canyon is jammed and the fire is a mile away.', options: [
    { id: 'shelterInPlace', label: '🏫 Shelter people at the school and defend it', check: 50, text: 'Three hundred people rode it out in the gym while you held the fire at the parking lot.', perf: 12, save: 5, valor: true, trauma: 10, exposure: 2, fail: { text: 'You held the school, but cars on the road burned. Most got out on foot.', trauma: 18, exposure: 2 } },
    { id: 'escort', label: '🚒 Escort the line of cars out', text: 'Bumper to bumper through smoke, but everyone got out.', perf: 6, save: 2, exposure: 1 },
  ] },
  { id: 'medical', icon: '❤️', title: 'Medical Aid on the Fire Line', text: 'A hand-crew member collapsed with heat stroke on a steep slope.', options: [
    { id: 'cool', label: '🧊 Cool him and call for a hoist', check: 40, text: 'A helicopter short-hauled him out. Full recovery.', perf: 4, save: 1, fail: { text: 'He went into kidney failure but survived after a week in the ICU.', trauma: 4 } },
  ] },
];

function callPrompt(ctx) {
  const { state, rng } = ctx;
  if (state.prompts.some((p) => p.type === 'fireLife.call')) return;
  const st = fl(state).station;
  if ((state.career.job.professionId === 'stateFire' || st === 'contractWildland') && rng.chance(0.8)) {
    const w = rng.pick(WILDLAND_CALLS.filter((c) => c.id !== 'burnover' || rng.chance(0.4)));
    return ctx.prompt({ type: 'fireLife.call', icon: w.icon, title: w.title, text: w.text, options: w.options.map(({ id, label }) => ({ id, label })), data: { callId: w.id } });
  }
  if (st === 'airport' && rng.chance(0.75)) {
    const a = rng.pick(ARFF_CALLS.filter((c) => c.id !== 'crash' || rng.chance(0.25)));
    return ctx.prompt({ type: 'fireLife.call', icon: a.icon, title: a.title, text: a.text, options: a.options.map(({ id, label }) => ({ id, label })), data: { callId: a.id } });
  }
  const pool = CALLS.filter((c) => (c.id !== 'brush' || st === 'wildland' || rng.chance(0.3)) && (c.id !== 'hazmat' || ['hazmat', 'industrial'].includes(st) || rng.chance(0.4)) && (c.id !== 'mayday' || rng.chance(0.4)));
  const c = rng.pick(pool);
  ctx.prompt({ type: 'fireLife.call', icon: c.icon, title: c.title, text: c.text, options: c.options.map(({ id, label }) => ({ id, label })), data: { callId: c.id } });
}

export function fireSkill(state, { fitness = false } = {}) {
  const years = yearsInProfession(state, FIRE_PROFESSIONS);
  const certs = ['ff2', 'emt', 'paramedic', 'hazmatOps', 'driverOperator', 'wildlandFF2', 'wildlandFF1'].filter((c) => hasCredential(state, c)).length;
  return state.stats.smarts * 0.3 + Math.min(25, years * 2.5) + certs * 3 + (fitness ? (state.stats.fitness - 50) * 0.5 : (state.stats.fitness - 50) * 0.15);
}

function apply(ctx, fx) {
  const { state, rng } = ctx;
  const f = fl(state);
  const job = state.career.job;
  if (fx.perf && job) job.performance = Math.round(clamp(job.performance + fx.perf, 0, 100));
  if (fx.save) f.saves += fx.save;
  if (fx.exposure) f.exposure += fx.exposure;
  if (fx.trauma) ctx.emit('health:trauma', { amount: fx.trauma, source: 'firefighting' });
  if (fx.injury && rng.chance(fx.injury)) {
    f.injuries += 1;
    ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
    ctx.stat('health', -rng.int(4, 12));
  }
  if (fx.valor && !state.honors.some((h) => h.id === 'fire.valor')) {
    addHonor(state, { id: 'fire.valor', source: 'civil', name: 'Fire Department Medal of Valor', icon: '🏅', prestige: 15, precedence: 15, citation: 'For heroism at extreme personal risk.', ribbon: [['#b71c1c', 2], ['#c9a227', 2], ['#b71c1c', 2]] });
    ctx.log('The department awarded you the Medal of Valor.', '🏅', 'honor');
  }
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const FireLifeModule = {
  id: 'fireLife',
  order: 30.89,
  init(state) {
    state.fireLife ??= { station: null, shift: '24-48', teams: {}, runs: 0, fires: 0, saves: 0, injuries: 0, exposure: 0, decon: false, screening: false, sideJob: false, strikeTeams: 0 };
  },
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => {
      if (!isFirefighter(job)) return;
      const f = fl(ctx.state);
      f.teams = {};
      if (!f.station || !stationEligibility(ctx.state, f.station).ok) f.station = stationsFor(job.professionId).find((id) => stationEligibility(ctx.state, id).ok) ?? DEFAULT_STATION[job.professionId] ?? 'engine';
      if (job.professionId === 'stateFire') f.shift = 'season';
    });
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const f = fl(state);
    const job = state.career.job;
    // Cancer can show up years later, on the job or not.
    if (f.exposure > 0 && state.character.age >= 40 && rng.chance(clamp(f.exposure * 0.0015 * (f.decon ? 0.6 : 1) * (f.screening ? 0.8 : 1), 0, 0.05))) {
      ctx.emit('health:injury', { conditionId: 'cancer', severity: f.screening ? rng.int(20, 40) : rng.int(40, 70) });
      ctx.log(`You were diagnosed with cancer${f.screening ? ' — caught early by your annual screening' : ''}. Under the state's presumptive-cancer law for firefighters, workers' compensation covers your treatment.`, '🎗️', 'bad');
      f.exposure = Math.round(f.exposure / 2);
    }
    if (!isFirefighter(job) || !job.paidThisYear || state.legal.incarceration) return;
    const st = STATIONS[f.station] ?? STATIONS[DEFAULT_STATION[job.professionId] ?? 'engine'];
    const chiefRank = job.track === 'mgmt' && job.grade >= 7;
    const runs = chiefRank ? rng.int(150, 400) : Math.round(rng.int(1100, 2400) * st.runs);
    const fires = Math.round(rng.int(10, 45) * st.fires * (chiefRank ? 0.8 : 1));
    f.runs += runs;
    f.fires += fires;
    f.exposure += Math.round(fires / 15) + (f.decon ? 0 : 1);
    ctx.log(job.professionId === 'stateFire' ? `Fire season: ${fires} fires, from one-acre starts to a ${rng.int(20, 400)}-thousand-acre complex — and ${runs.toLocaleString()} medical aids and wrecks the rest of the year.` : `${runs.toLocaleString()} runs this year — about 70% medical — and ${fires} working fires.`, st.icon);
    ctx.emit('health:trauma', { amount: Math.round(st.risk * 2), source: 'firefighting' });
    ctx.stat('stress', 2 + Math.round(st.risk * 2));
    // Teams: stipends, deployments, risk.
    for (const id of Object.keys(f.teams)) {
      const t = TEAMS[id];
      if (t.cred && !hasCredential(state, t.cred)) { delete f.teams[id]; continue; }
      if (t.pay) ctx.earn(t.pay, `${t.name} stipend`, { wage: true });
      if (t.exposure) f.exposure += t.exposure;
      if (t.risk && rng.chance(0.03)) apply(ctx, { injury: 1, trauma: 6 });
      if (id === 'strike' && rng.chance(0.7)) {
        const weeks = rng.int(2, 6);
        const ot = Math.round(job.salary / 52 * weeks * rng.float(1.6, 2.2));
        f.strikeTeams += 1;
        ctx.earn(ot, 'Wildland strike team overtime', { wage: true });
        ctx.stat('fitness', 2);
        ctx.log(`Your strike team deployed ${weeks} weeks to ${rng.pick(['a megafire in California', 'Oregon\'s Cascades', 'a complex fire in Idaho', 'the Colorado foothills', 'a Texas grass fire'])}: $${ot.toLocaleString()} in overtime.`, '🔥', 'good');
      }
      if (id === 'union' && rng.chance(0.3)) ctx.log(rng.pick(['Your local won a fourth firefighter on every engine in the new contract.', 'You represented a firefighter at a grievance hearing — and won.', 'Contract talks stalled; the membership packed the council chambers in T-shirts.']), '✊');
    }
    if (f.sideJob) {
      const side = rng.int(12000, 32000);
      ctx.earn(side, 'Side business on days off', { wage: true });
      ctx.stat('stress', 3);
    }
    f.screening = false;
    if (job.performance >= 85 && f.saves >= 3 && !state.honors.some((h) => h.id === 'fire.fty') && rng.chance(0.1)) {
      addHonor(state, { id: 'fire.fty', source: 'civil', name: 'Firefighter of the Year', icon: '⭐', prestige: 8, precedence: 40, citation: 'Named Firefighter of the Year by the department.' });
      ctx.log('You were named Firefighter of the Year.', '⭐', 'honor');
    }
    if (!chiefRank && rng.chance(0.65)) callPrompt(ctx);
    listTick(ctx);
  },
  actions: {
    station(ctx, id) {
      const { state } = ctx;
      const ok = stationEligibility(state, id);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      if (yearlyCount(state, 'fire.station')) return ctx.toast('One transfer a year — bid by seniority', 'warn');
      bumpYearly(state, 'fire.station');
      fl(state).station = id;
      ctx.log(`You bid into the ${STATIONS[id].name.toLowerCase()}. ${STATIONS[id].desc}`, STATIONS[id].icon);
    },
    shift(ctx, id) {
      const { state } = ctx;
      if (!isFirefighter(state.career.job) || !SHIFTS[id]) return;
      if (yearlyCount(state, 'fire.shift')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'fire.shift');
      fl(state).shift = id;
      ctx.log(`Your department moved to ${SHIFTS[id].name}.`, SHIFTS[id].icon);
    },
    team(ctx, id) {
      const { state } = ctx;
      const f = fl(state);
      if (f.teams[id]) { delete f.teams[id]; return ctx.log(`You left the ${TEAMS[id].name.toLowerCase()}.`, TEAMS[id].icon); }
      const ok = teamEligibility(state, id);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      f.teams[id] = state.character.age;
      ctx.log(`You joined the ${TEAMS[id].name.toLowerCase()}. ${TEAMS[id].desc}`, TEAMS[id].icon, 'good');
    },
    sideJob(ctx) {
      const { state } = ctx;
      if (!isFirefighter(state.career.job)) return;
      const f = fl(state);
      f.sideJob = !f.sideJob;
      ctx.log(f.sideJob ? 'You started a side business on your days off — roofing, painting and landscaping with two guys from the station.' : 'You gave up the side business. Your days off are yours again.', '🧰');
    },
    decon(ctx) {
      const { state } = ctx;
      if (!isFirefighter(state.career.job)) return;
      const f = fl(state);
      f.decon = !f.decon;
      ctx.log(f.decon ? 'Clean cab: you wipe down after fires, swap hoods, bag your gear and shower within the hour.' : 'You stopped bothering with decon. Dirty gear is a badge, right?', '🧼');
    },
    screening(ctx) {
      const { state } = ctx;
      if (!isFirefighter(state.career.job)) return;
      if (yearlyCount(state, 'fire.screen')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'fire.screen');
      fl(state).screening = true;
      ctx.log('You had your annual firefighter cancer screening: bloodwork, imaging, a skin check.', '🩺', 'good');
    },
    exam(ctx, prep) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isFirefighter(job) || !nextExam(job)) return;
      if (yearlyCount(state, 'cs.exam')) return ctx.toast('Exams are given once a year', 'warn');
      bumpYearly(state, 'cs.exam');
      if (prep === 'prep') ctx.spend(800, 'Promotional exam prep course', { credit: true });
      sitExam(ctx, { prep: prep === 'prep' });
    },
  },
  resolvers: {
    call(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = [...CALLS, ...ARFF_CALLS, ...WILDLAND_CALLS].find((x) => x.id === data.callId);
      const o = c?.options.find((x) => x.id === optionId);
      if (!o) return;
      const fx = o.check != null && fireSkill(state, { fitness: o.fitness }) + rng.int(-20, 20) < o.check ? o.fail : o;
      ctx.log(fx.text, c.icon, (fx.perf ?? 0) > 0 ? 'good' : (fx.trauma ?? 0) >= 10 ? 'bad' : undefined);
      apply(ctx, fx);
    },
  },
};
