/**
 * Route & logbook careers: the work is logged — miles, flight hours, sea
 * days, stops — and schedules go by seniority. Each year you bid a line
 * (a route, a run, a trip pattern) your years can hold; earn
 * qualifications (endorsements, type ratings, a purser's seat) that open
 * better lines and pay; pass the periodic check ride; and keep the safety
 * record clean for the awards that come with a million miles.
 *
 *   trucking · warehouse & logistics · flight attendants · charter & cargo
 *   flying · merchant marine · paratransit · school buses · letter carriers
 *
 * state.careerLife.routeWork = { professionId, line, logged, quals: { id: age }, safeYears, incidents, checkDue, milestones: [], rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill } from './Kit.js';

/** A bid line: seniority (years) to hold it, pay differential, stress, time away (happiness), crash risk ×, volume ×, needs a qualification. */
const Ln = (name, icon, desc, o = {}) => ({ name, icon, desc, years: 0, pay: 1, stress: 3, away: 0, risk: 1, rate: 1, ...o });
/** A qualification: cost, years on the job first, pay bump. */
const Q = (name, icon, desc, o = {}) => ({ name, icon, desc, cost: 0, years: 0, pay: 0, ...o });
const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

export const ROUTE_CAREERS = {
  trucking: {
    label: 'Your Logbook', icon: '🚛', unit: 'miles', volume: [80000, 125000], weights: { smarts: 1, fitness: 1, health: 1 }, checkEvery: 2, checkName: 'DOT medical & roadside inspection record',
    lines: {
      regional: Ln('Regional', '🗺️', 'Out Monday, home Friday.', { away: 2 }),
      otr: Ln('Over the road', '🛣️', 'Three weeks out, a few days home. Best miles.', { pay: 1.12, away: 6, rate: 1.2, stress: 4 }),
      local: Ln('Local / dedicated', '🏠', 'Home every night. Fewer miles, more docks.', { years: 2, pay: 0.95, rate: 0.6, stress: 2 }),
      tanker: Ln('Tanker & hazmat', '☣️', 'Fuel and chemicals. Top pay, no mistakes allowed.', { years: 2, pay: 1.2, risk: 1.4, stress: 5, away: 3, needs: 'hazmat' }),
      heavy: Ln('Heavy haul & oversize', '🏗️', 'Escorts, permits and loads the size of a house.', { years: 4, pay: 1.25, risk: 1.2, stress: 5, away: 4, needs: 'heavy' }),
    },
    quals: {
      hazmat: Q('Hazmat & tanker endorsements', '☣️', 'Background check, a written test and a lot of respect.', { cost: 300, pay: 0.04 }),
      doubles: Q('Doubles & triples', '🚚', 'Pull more trailers, earn more per mile.', { cost: 150, pay: 0.03 }),
      heavy: Q('Oversize & heavy-haul training', '🏗️', 'Rigging, routing and escort coordination.', { cost: 2500, years: 3, pay: 0.05 }),
      trainer: Q('Driver trainer', '🎓', 'Ride with new drivers for a cut of their miles.', { years: 3, pay: 0.05 }),
    },
    milestones: [[1000000, { id: 'trucking.million', name: 'Million-Mile Safe Driver Award', icon: '🏅' }]], safeAt: true,
    deck: [
      D('hours', '⏱️', 'The Clock', 'You\'re out of hours forty miles from the delivery. Dispatch says "just make it."', [
        { id: 'stop', label: '🅿️ Park and take your ten-hour break', text: 'The load was late. Dispatch was annoyed; the law was on your side.', perf: -1 },
        { id: 'run', label: '🌙 Run it', tone: 'danger', text: 'Delivered on time.', perf: 2, risk: { chance: 0.25, text: 'A DOT inspection caught your logbook. A fine and an out-of-service order.', perf: -6, cost: 1500, costLabel: 'Hours-of-service fine' } },
      ]),
      D('ice', '🧊', 'Black Ice on the Pass', 'The chain law is up, the pass is glazed and you\'re heavy.', [
        { id: 'chain', label: '⛓️ Chain up and crawl', check: 40, text: 'Two hours late and in one piece.', perf: 1, fail: { text: 'You slid into the guardrail. Nobody hurt; the trailer is.', perf: -5, stress: 6 } },
        { id: 'wait', label: '☕ Wait it out at the truck stop', text: 'The plows came by dawn.', perf: 0 },
      ]),
      D('scale', '⚖️', 'Overweight', 'The shipper loaded you 3,000 pounds over.', [
        { id: 'refuse', label: '🙅 Make them reload it', text: 'An hour lost and a legal load.', rep: 3 },
        { id: 'go', label: '🚛 Skip the scale', tone: 'danger', text: 'You got around the scale house.', risk: { chance: 0.3, text: 'A portable scale caught you. A big fine.', cost: 2200, costLabel: 'Overweight fine' } },
      ]),
    ],
  },
  logistics: {
    label: 'On the Floor', icon: '📦', unit: 'units moved', volume: [180000, 320000], weights: { fitness: 2, smarts: 1 }, checkEvery: 3, checkName: 'equipment recertification',
    lines: {
      picking: Ln('Picking', '🛒', 'Rates, scanners and twelve miles a shift.', { stress: 4 }),
      nights: Ln('Night shift', '🌙', 'Shift differential and a quieter floor.', { pay: 1.08, stress: 4 }),
      shipping: Ln('Shipping & receiving dock', '🚚', 'Trailers in, trailers out.', { years: 1, stress: 3 }),
      equipment: Ln('Reach truck & order picker', '🏗️', 'Thirty feet up, all day.', { years: 1, pay: 1.06, risk: 1.3, needs: 'forklift' }),
      inventory: Ln('Inventory control', '📋', 'Cycle counts and finding what\'s lost.', { years: 3, pay: 1.04, stress: 2, rate: 0.5 }),
    },
    quals: {
      forklift: Q('Powered-industrial-truck certification', '🏗️', 'Forklifts, reach trucks and order pickers.', { cost: 0, pay: 0.03 }),
      lead: Q('Process-assistant training', '📣', 'Run a section of the floor.', { years: 2, pay: 0.05 }),
      lean: Q('Lean / Six Sigma yellow belt', '📈', 'Fix processes; get noticed.', { cost: 400, years: 1, pay: 0.03 }),
    },
    milestones: [],
    deck: [
      D('rate', '⏱️', 'Off Rate', 'The system flagged you for time off task — you were helping a coworker who got hurt.', [
        { id: 'explain', label: '🗣️ Explain to the manager', check: 40, text: 'The flag was cleared.', perf: 1, fail: { text: 'A write-up anyway.', perf: -3 } },
        { id: 'union', label: '✊ Talk to coworkers about organising', text: 'Quiet conversations in the break room.', rep: 3, risk: { chance: 0.2, text: 'Management noticed. Your schedule got a lot worse.', stress: 6 } },
      ]),
      D('peak', '🎄', 'Peak Season', 'Mandatory overtime: sixty hours a week until January.', [
        { id: 'work', label: '💪 Work it', text: 'A big December paycheck and sore everything.', money: 3000, moneyLabel: 'Peak overtime', stress: 6, injury: 0.08 },
      ]),
    ],
  },
  flightAttendant: {
    label: 'Your Trips', icon: '✈️', unit: 'block hours', volume: [700, 950], weights: { looks: 1, happiness: 2 }, checkEvery: 1, checkName: 'annual recurrent training',
    lines: {
      reserve: Ln('Reserve', '📟', 'On call. Holidays, red-eyes and wherever they send you.', { stress: 5, pay: 0.95, away: 4 }),
      domestic: Ln('Domestic line', '🛫', 'Turns and overnights you chose.', { years: 2, stress: 3, away: 3 }),
      international: Ln('International', '🌍', 'Long-haul with layovers in Rome and Tokyo.', { years: 6, pay: 1.12, stress: 3, away: 5, needs: 'language' }),
      purser: Ln('Lead / purser', '🎖️', 'Run the cabin and the crew.', { years: 4, pay: 1.1, stress: 4, away: 4, needs: 'purser' }),
    },
    quals: {
      language: Q('Language-qualified', '🗣️', 'A speaker\'s premium and the international trips that need you.', { years: 1, pay: 0.04 }),
      purser: Q('Purser training', '🎖️', 'Lead the cabin.', { years: 3, pay: 0.05 }),
      instructor: Q('Inflight instructor', '🎓', 'Teach new-hire classes.', { years: 6, pay: 0.04 }),
    },
    milestones: [[10000, { id: 'fa.10k', name: '10,000 Block Hours Pin', icon: '📌' }]],
    deck: [
      D('unruly', '😤', 'The Unruly Passenger', 'A drunk passenger is shoving people in row 23 at 35,000 feet.', [
        { id: 'deescalate', label: '🗣️ Talk him down', check: 50, text: 'He sat down and slept it off. Applause.', perf: 4, rep: 4, fail: { text: 'He swung at you. Crew and passengers restrained him; you have a black eye.', injury: 0.5, trauma: 4 } },
        { id: 'restrain', label: '🔗 Restrain him with the crew', text: 'Flex cuffs and a police meeting at the gate.', perf: 2 },
      ]),
      D('medical', '🩺', '"Is There a Doctor on Board?"', 'A passenger collapses mid-Atlantic.', [
        { id: 'help', label: '❤️ Run the AED and the medical kit', check: 40, text: 'A nurse on board helped. He woke up before the diversion.', perf: 5, commend: 0.4, fail: { text: 'You diverted to Gander. He didn\'t make it.', trauma: 6 } },
      ]),
      D('commute', '🧳', 'The Commute', 'You live 800 miles from your base and the morning flight is full.', [
        { id: 'early', label: '🌙 Fly in the night before', text: 'A crash pad and a bad night\'s sleep.', cost: 120, costLabel: 'Crash pad night', stress: 2 },
        { id: 'risk', label: '🎲 Try the morning standby', text: 'You made it — barely.', risk: { chance: 0.3, text: 'You missed your trip. A disciplinary point.', perf: -5 } },
      ]),
    ],
  },
  charterAviation: {
    label: 'Your Logbook', icon: '🛩️', unit: 'flight hours', volume: [450, 800], weights: { smarts: 2, health: 1 }, checkEvery: 1, checkName: 'Part 135 check ride',
    lines: {
      cargo: Ln('Night cargo', '📦', 'Old twins, bad weather, empty skies.', { stress: 5, risk: 1.4 }),
      charter: Ln('On-demand charter', '🛩️', 'Executives and sports teams, on two hours\' notice.', { years: 1, pay: 1.05, away: 3 }),
      medevac: Ln('Air ambulance', '🚑', 'Short runways, sick patients, every hour of the night.', { years: 2, pay: 1.08, risk: 1.2, stress: 5 }),
      corporate: Ln('Corporate flight department', '💼', 'One company\'s jet. Good pay, predictable.', { years: 4, pay: 1.18, stress: 2, needs: 'typeRating' }),
    },
    quals: {
      typeRating: Q('Jet type rating', '✈️', 'Weeks in a simulator for a jet type.', { cost: 25000, years: 2, pay: 0.08 }),
      cfi: Q('Check airman', '🎓', 'Give the check rides instead of taking them.', { years: 5, pay: 0.05 }),
      mountain: Q('Mountain & short-field endorsement', '⛰️', 'Airports most pilots won\'t try.', { cost: 1500, pay: 0.03 }),
    },
    milestones: [[10000, { id: 'charter.10k', name: '10,000 Hours Without an Accident', icon: '🏅' }]], safeAt: true,
    deck: [
      D('pressure', '🌩️', 'The CEO Wants to Go', 'Thunderstorms at the destination. The CEO wants to leave now.', [
        { id: 'delay', label: '⏳ Delay two hours', text: 'He fumed, then thanked you when the line cleared.', rep: 3 },
        { id: 'go', label: '🛫 Go', check: 55, text: 'You threaded the cells and he made his meeting.', perf: 3, fail: { text: 'Severe turbulence. Two passengers hurt. An FAA inquiry.', perf: -8, trauma: 6 } },
      ]),
    ],
  },
  merchantMarine: {
    label: 'Your Sea Time', icon: '⚓', unit: 'sea days', volume: [150, 220], weights: { smarts: 2, fitness: 1 }, checkEvery: 2, checkName: 'STCW refresher & sea-service review',
    lines: {
      coastal: Ln('Coastwise & tugs', '🚢', 'Two weeks on, two off.', { away: 3, stress: 3 }),
      container: Ln('Deep-sea container ships', '🌊', 'Four months on, ports you\'ll see for six hours.', { years: 1, pay: 1.1, away: 7, stress: 4 }),
      tanker: Ln('Tankers', '🛢️', 'The best pay at sea, the strictest ships.', { years: 2, pay: 1.18, away: 7, stress: 5, risk: 1.3, needs: 'tankerman' }),
      offshore: Ln('Offshore supply & DP vessels', '🛠️', 'Rigs and wind farms. Precision ship-handling.', { years: 3, pay: 1.15, away: 5, needs: 'dp' }),
    },
    quals: {
      tankerman: Q('Tanker endorsement', '🛢️', 'Cargo transfer and firefighting courses.', { cost: 3000, pay: 0.05 }),
      dp: Q('Dynamic positioning certificate', '🎯', 'Holding a ship still in heavy seas.', { cost: 6000, years: 2, pay: 0.06 }),
      upgrade: Q('License upgrade', '📈', 'Sea time and exams toward the next grade.', { cost: 4000, years: 3, pay: 0.08 }),
    },
    milestones: [[1000, { id: 'mm.1000', name: 'A Thousand Days at Sea', icon: '⚓' }]],
    deck: [
      D('pirates', '🏴‍☠️', 'High-Risk Waters', 'Your ship is routed through the Gulf of Aden.', [
        { id: 'drill', label: '🛡️ Drill the citadel plan with the crew', text: 'Two skiffs approached and turned away from the razor wire.', perf: 3, stress: 4 },
      ]),
      D('overboard', '🌊', 'Man Overboard', 'A cadet goes over the side at night.', [
        { id: 'turn', label: '🔄 Williamson turn and launch the boat', check: 50, text: 'You found him in twenty minutes, alive.', perf: 6, commend: 0.5, fail: { text: 'The search went on for a day. He was never found.', trauma: 12 } },
      ]),
    ],
  },
  paratransit: {
    label: 'Your Runs', icon: '🚐', unit: 'riders', volume: [3500, 6000], weights: { happiness: 2, smarts: 1 }, checkEvery: 2, checkName: 'passenger-assistance recertification',
    lines: {
      dialysis: Ln('Dialysis & medical runs', '🩸', 'The same riders three times a week.', { stress: 3 }),
      ada: Ln('ADA paratransit', '♿', 'Door-to-door for riders who can\'t take the bus.', { stress: 3 }),
      nemt: Ln('Stretcher & non-emergency medical', '🛏️', 'Discharges and nursing homes.', { years: 2, pay: 1.06, stress: 4, needs: 'stretcher' }),
    },
    quals: {
      stretcher: Q('Stretcher-van certification', '🛏️', 'Lifting and patient transfer.', { cost: 200, pay: 0.04 }),
      cdl: Q('CDL with passenger endorsement', '🚌', 'Bigger buses and better pay.', { cost: 1500, pay: 0.05 }),
    },
    milestones: [],
    deck: [
      D('rider', '💐', 'Mrs. Alvarez', 'Your regular rider of six years is back from the hospital, weaker. Her family hasn\'t visited.', [
        { id: 'care', label: '🤝 Check on her and tell her social worker', text: 'Home-care hours were added. She sends you a card every Christmas now.', rep: 5, happiness: 4 },
        { id: 'job', label: '🚐 Just do the run', text: 'You dropped her off on time.' },
      ]),
    ],
  },
  schoolBus: {
    label: 'Your Route', icon: '🚌', unit: 'student rides', volume: [25000, 45000], weights: { happiness: 2, smarts: 1 }, checkEvery: 2, checkName: 'school-bus recertification',
    lines: {
      regular: Ln('Regular route', '🚌', 'Mornings and afternoons, the same kids for years.', { stress: 3 }),
      special: Ln('Special-education route', '♿', 'Fewer kids, more care. A route aide and a lift.', { years: 1, pay: 1.06, stress: 3, needs: 'specialNeeds' }),
      trips: Ln('Field trips & athletics', '🏈', 'Extra hours on weekends and evenings.', { years: 2, pay: 1.1, stress: 2 }),
    },
    quals: {
      specialNeeds: Q('Special-needs transport training', '♿', 'Lifts, car seats and behaviour plans.', { cost: 0, pay: 0.03 }),
      trainer: Q('Driver trainer', '🎓', 'Train new drivers in the summer.', { years: 3, pay: 0.04 }),
    },
    milestones: [], safeAt: true,
    deck: [
      D('fight', '👊', 'A Fight on the Bus', 'Two eighth-graders are fighting in the back while you\'re on the highway.', [
        { id: 'pull', label: '🛑 Pull over safely and stop it', text: 'You separated them and wrote them up.', perf: 2 },
        { id: 'radio', label: '📻 Radio the school and keep driving', text: 'The principal met the bus.', perf: 1 },
      ]),
      D('stop', '🚸', 'The Stop-Arm Runner', 'A car blows past your stop arm as a kindergartner steps off.', [
        { id: 'grab', label: '🖐️ Lay on the horn and wave her back', check: 35, text: 'She jumped back in time. The camera got the plate.', perf: 5, commend: 0.5, fail: { text: 'A near miss that will stay with you.', trauma: 6 } },
      ]),
    ],
  },
  postal: {
    label: 'Your Route', icon: '📬', unit: 'deliveries', volume: [180000, 260000], weights: { fitness: 2, happiness: 1 }, checkEvery: 3, checkName: 'route inspection',
    lines: {
      floater: Ln('Floater / no bid route', '🔀', 'A different route every day.', { stress: 4 }),
      mounted: Ln('Mounted route', '🚐', 'Curbside boxes from the truck.', { years: 2, stress: 2 }),
      walking: Ln('Park-and-loop route', '🚶', 'Miles on foot, rain or shine.', { years: 2, stress: 3, rate: 0.9 }),
      rural: Ln('Rural route', '🌾', 'Your own vehicle, long roads, an allowance for gas.', { years: 3, pay: 1.05, stress: 2 }),
    },
    quals: {
      vehicle: Q('Vehicle certification', '🚐', 'The new electric trucks.', { pay: 0.02 }),
      steward: Q('Union steward', '✊', 'Represent your station in grievances.', { years: 3, pay: 0 }),
    },
    milestones: [[1500000, { id: 'postal.safe', name: 'Million Mile Club (Safe Driver)', icon: '🏅' }]], safeAt: true,
    deck: [
      D('check', '👵', 'Mail Piling Up', 'An elderly customer hasn\'t picked up her mail in three days.', [
        { id: 'call', label: '📞 Call it in for a wellness check', text: 'She\'d fallen. Paramedics said you saved her life.', perf: 5, commend: 0.6, honor: { id: 'postal.hero', name: 'Postal Carrier Hero Award', icon: '🦸' } },
        { id: 'next', label: '📬 Leave a note and move on', text: 'You left a note.' },
      ]),
    ],
  },
};

const config = (job) => ROUTE_CAREERS[job?.professionId];
const fresh = (cfg) => ({ line: Object.keys(cfg.lines)[0], logged: 0, quals: {}, safeYears: 0, incidents: 0, checkDue: null, milestones: [] });

export function routeView(state) {
  const job = state.career.job;
  const cfg = config(job);
  if (!cfg) return null;
  const rec = peekLife(state, 'routeWork');
  return { cfg, rec: rec?.professionId === job.professionId ? rec : null };
}

const held = (state, cfg, id) => Boolean(peekLife(state, 'routeWork')?.quals?.[id]);

export function lineEligibility(state, id) {
  const job = state.career.job;
  const cfg = config(job);
  const l = cfg?.lines[id];
  if (!l) return { ok: false, reason: 'Not a line here' };
  if ((job.yearsAtEmployer ?? 0) < l.years) return { ok: false, reason: `Needs ${l.years} year${l.years > 1 ? 's' : ''} of seniority` };
  if (l.needs && !held(state, cfg, l.needs)) return { ok: false, reason: `Needs ${cfg.quals[l.needs].name.toLowerCase()}` };
  if (yearlyCount(state, 'routeWork.line')) return { ok: false, reason: 'One bid a year' };
  return { ok: true };
}

export function qualEligibility(state, id) {
  const job = state.career.job;
  const cfg = config(job);
  const q = cfg?.quals[id];
  if (!q) return { ok: false, reason: 'Not offered' };
  if (held(state, cfg, id)) return { ok: false, reason: 'Already qualified' };
  if ((job.yearsAtEmployer ?? 0) < q.years) return { ok: false, reason: `${q.years} year${q.years > 1 ? 's' : ''} on the job first` };
  if (yearlyCount(state, 'routeWork.qual')) return { ok: false, reason: 'One course a year' };
  if (q.cost && state.finances.cash < q.cost) return { ok: false, reason: `Costs $${q.cost.toLocaleString()}` };
  return { ok: true };
}

export const RouteWorkModule = {
  id: 'routeWork',
  order: 31.8,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || state.legal.incarceration) return;
    const rec = lifeOf(state, 'routeWork', job.professionId, fresh(cfg));
    const line = cfg.lines[rec.line] ?? Object.values(cfg.lines)[0];
    const sk = skill(state, cfg.weights);
    const n = Math.round(rng.int(cfg.volume[0], cfg.volume[1]) * line.rate);
    rec.logged += n;
    ctx.stat('stress', line.stress);
    if (line.away) ctx.stat('happiness', -Math.round(line.away / 2));
    const bump = (line.pay - 1) + Object.keys(rec.quals).reduce((s, id) => s + (cfg.quals[id]?.pay ?? 0), 0);
    if (bump > 0) ctx.earn(Math.round(job.salary * bump / 100) * 100, `${line.name} & qualification pay`, { wage: true });
    // Safety: an incident or another clean year.
    if (rng.chance(clamp(0.06 * line.risk - sk / 2000, 0.01, 0.12))) {
      rec.incidents += 1;
      rec.safeYears = 0;
      applyFx(ctx, rec, { text: `A preventable incident on the ${line.name.toLowerCase()} line went in your file.`, perf: -6, rep: -6, stress: 6, injury: 0.3 }, '⚠️');
    } else rec.safeYears += 1;
    // Check rides and recurrent training.
    rec.checkDue ??= state.character.age + cfg.checkEvery;
    if (state.character.age >= rec.checkDue) {
      rec.checkDue = state.character.age + cfg.checkEvery;
      if (sk + rng.int(-15, 15) >= 35) applyFx(ctx, rec, { text: `You passed your ${cfg.checkName}.`, perf: 2 }, '✅');
      else applyFx(ctx, rec, { text: `You failed your ${cfg.checkName} the first time. Retraining, a retest, and a note in your file.`, perf: -8, stress: 5 }, '❌');
    }
    for (const [at, honor] of cfg.milestones) {
      if (rec.logged >= at && !rec.milestones.includes(honor.id) && (!cfg.safeAt || rec.incidents === 0)) {
        rec.milestones.push(honor.id);
        applyFx(ctx, rec, { text: `${rec.logged.toLocaleString()} ${cfg.unit}${cfg.safeAt ? ' without a preventable incident' : ''}.`, honor, rep: 8, happiness: 5 }, honor.icon);
      }
    }
    rec.rep = Math.round(clamp(rec.rep + (rec.safeYears >= 3 ? 1 : 0) + (job.performance - 55) / 15, 0, 100));
    if (cfg.deck.length && rng.chance(0.55) && !state.prompts.some((x) => x.type === 'routeWork.event')) {
      const d = rng.pick(cfg.deck);
      ctx.prompt({ type: 'routeWork.event', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id, professionId: job.professionId } });
    }
  },
  actions: {
    /** Bid a line. */
    line(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      const ok = lineEligibility(state, id);
      if (!cfg || !ok.ok) return ctx.toast(ok.reason ?? 'Not available', 'warn');
      bumpYearly(state, 'routeWork.line');
      lifeOf(state, 'routeWork', job.professionId, fresh(cfg)).line = id;
      ctx.log(`You bid and held ${cfg.lines[id].name.toLowerCase()}. ${cfg.lines[id].desc}`, cfg.lines[id].icon);
      return undefined;
    },
    /** Earn a qualification. */
    qualify(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      const ok = qualEligibility(state, id);
      if (!cfg || !ok.ok) return ctx.toast(ok.reason ?? 'Not available', 'warn');
      bumpYearly(state, 'routeWork.qual');
      const q = cfg.quals[id];
      if (q.cost) ctx.spend(q.cost, q.name);
      lifeOf(state, 'routeWork', job.professionId, fresh(cfg)).quals[id] = state.character.age;
      ctx.stat('stress', 2);
      ctx.log(`You earned your ${q.name.toLowerCase()}. ${q.desc}`, q.icon, 'good');
      return undefined;
    },
  },
  resolvers: {
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = ROUTE_CAREERS[data.professionId];
      const d = cfg?.deck.find((x) => x.id === data.deckId);
      if (!d || !job) return;
      resolveOption(ctx, lifeOf(ctx.state, 'routeWork', job.professionId, fresh(cfg)), d.options.find((o) => o.id === optionId), d.icon, cfg.weights);
    },
  },
};
