/**
 * Trades and service work: the year comes as jobs. Each year the shop has
 * a board of named jobs — a 1920s rewire, a slab leak, a walk-in cooler
 * down on a Friday night, a storm deployment — and you take up to three,
 * by the book or as a cash side job. Your skill against the job's
 * difficulty decides whether it's done right, comes back as a warranty
 * call, or goes wrong. Apprentices log hours toward the journeyman exam.
 * With a master's licence, your field's businesses (Career tab) let you
 * open your own shop.
 *
 *   electricians · plumbers · HVAC · welders · auto technicians · lineworkers · ironworkers ·
 *   transit maintenance
 *
 * state.careerLife.tradeWork = { professionId, offers: [...], taken: [{ idx, how }], done, callbacks, sideCash, hours, rep }
 */
import { clamp } from '../../../core/Random.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';

/** A job on the board: difficulty (check), bonus share of salary, injury risk, cash value as a side job (0: none). */
const J = (name, icon, diff, o = {}) => ({ name, icon, diff, pay: 0.03, injury: 0.02, cash: 2500, ...o });
const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });
export const MAX_JOBS = 3;
const APPRENTICE = ['apprentice', 'helper', 'lube'];

export const TRADE_CAREERS = {
  trades: {
    label: 'The Job Board', icon: '⚡', weights: { smarts: 2, fitness: 1 }, hours: 8000, licence: 'journeyman electrician\'s exam',
    jobs: [
      J('Rewire a 1920s bungalow (knob and tube)', '🏚️', 55, { pay: 0.05, cash: 6000 }),
      J('200-amp panel upgrade', '🔌', 40, { cash: 2500 }),
      J('EV charger install', '🚗', 30, { pay: 0.02, cash: 1200 }),
      J('Restaurant kitchen circuits', '🍳', 50, { pay: 0.04, cash: 4000 }),
      J('Service call: half the house is dead', '🔦', 45, { pay: 0.02, cash: 600 }),
      J('Solar tie-in', '☀️', 55, { pay: 0.04, cash: 3500, injury: 0.04 }),
      J('Hospital wing rough-in', '🏥', 60, { pay: 0.06, cash: 0, injury: 0.03 }),
    ],
    deck: [
      D('shock', '⚡', 'The Hot Wire', 'The homeowner swears the breaker is off. Your tester is in the truck.', [
        { id: 'test', label: '🧪 Walk back and test it', text: 'It was the wrong breaker. You\'d have been shocked.', rep: 2 },
        { id: 'trust', label: '✋ Trust them', text: 'You got lucky.', injury: 0.3 },
      ]),
      D('code', '📜', 'Not to Code', 'The last electrician left aluminium wiring spliced to copper behind every outlet.', [
        { id: 'fix', label: '🔧 Quote the full fix', text: 'They paid for it. A fire that never happened.', perf: 3, rep: 4 },
        { id: 'ignore', label: '🙈 Do only what you were hired for', text: 'You finished early.', risk: { chance: 0.15, text: 'The house had a fire six months later. Your name was on the last permit.', perf: -10, rep: -12 } },
      ]),
    ],
  },
  plumbing: {
    label: 'The Job Board', icon: '🚰', weights: { fitness: 2, smarts: 1 }, hours: 8000, licence: 'journeyman plumber\'s exam',
    jobs: [
      J('Slab leak under a kitchen', '💧', 55, { pay: 0.04, cash: 4500 }),
      J('Water heater replacement', '🔥', 30, { pay: 0.02, cash: 1400 }),
      J('Sewer line camera and repair', '📹', 50, { pay: 0.04, cash: 5000, injury: 0.03 }),
      J('Bathroom remodel rough-in', '🛁', 40, { pay: 0.03, cash: 3500 }),
      J('Burst pipe at 2 a.m.', '🚨', 45, { pay: 0.03, cash: 900 }),
      J('Commercial backflow testing', '🧪', 35, { pay: 0.02, cash: 800 }),
      J('Hotel boiler retrofit', '🏨', 60, { pay: 0.06, cash: 0 }),
    ],
    deck: [
      D('gas', '💨', 'The Smell of Gas', 'You smell gas in a basement where a family is cooking dinner upstairs.', [
        { id: 'evac', label: '🚪 Get everyone out and call the gas company', text: 'A cracked fitting. Nobody hurt.', perf: 3, rep: 4 },
        { id: 'find', label: '🔍 Find the leak yourself first', check: 45, text: 'Found and fixed in ten minutes.', perf: 2, fail: { text: 'A flash fire singed your arm.', injury: 0.6 } },
      ]),
    ],
  },
  hvac: {
    label: 'The Job Board', icon: '❄️', weights: { smarts: 2, fitness: 1 }, hours: 4000, licence: 'HVAC certification',
    jobs: [
      J('Walk-in cooler down on a Friday night', '🧊', 50, { pay: 0.04, cash: 1800 }),
      J('Heat pump install', '♨️', 40, { pay: 0.03, cash: 4000 }),
      J('No heat in January, elderly couple', '🥶', 35, { pay: 0.02, cash: 500 }),
      J('Office rooftop units', '🏢', 55, { pay: 0.05, cash: 0, injury: 0.04 }),
      J('Ductwork for a new addition', '🌀', 35, { pay: 0.03, cash: 3000 }),
      J('Supermarket refrigeration rack', '🛒', 60, { pay: 0.06, cash: 0 }),
    ],
    deck: [
      D('upsell', '💰', 'The Upsell', 'The company pays a spiff for every new system you sell. This one just needs a $40 capacitor.', [
        { id: 'honest', label: '🔧 Replace the capacitor', text: 'A $40 fix and a customer for life.', rep: 6 },
        { id: 'sell', label: '💵 Tell them the system is shot', tone: 'danger', text: 'A $9,000 sale.', money: 600, moneyLabel: 'Sales spiff', offense: 'wireFraud', offenseContext: 'selling unnecessary repairs', discovery: 0.1 },
      ]),
    ],
  },
  welding: {
    label: 'The Job Board', icon: '🔥', weights: { fitness: 2, smarts: 1 }, hours: 2000, licence: 'AWS certification',
    jobs: [
      J('Pipeline tie-in, X-rayed welds', '🛢️', 60, { pay: 0.06, cash: 0, injury: 0.03 }),
      J('Farm equipment repair', '🚜', 30, { pay: 0.02, cash: 1200 }),
      J('Structural steel on a parking deck', '🏗️', 50, { pay: 0.04, cash: 0, injury: 0.04 }),
      J('Custom trailer build', '🚚', 40, { pay: 0.03, cash: 3500 }),
      J('Stainless food-plant piping', '🥛', 55, { pay: 0.05, cash: 0 }),
      J('Ornamental gate', '🚪', 35, { pay: 0.02, cash: 2200 }),
    ],
    deck: [
      D('xray', '🩻', 'The X-Ray', 'An inspector\'s X-ray shows porosity in a weld you were proud of.', [
        { id: 'cut', label: '✂️ Cut it out and redo it', text: 'It passed the second time.', rep: 3 },
        { id: 'argue', label: '🗣️ Argue the reading', text: 'You lost the argument and the inspector\'s goodwill.', rep: -3 },
      ]),
    ],
  },
  automotive: {
    label: 'The Job Board', icon: '🔧', weights: { smarts: 2, fitness: 1 }, hours: 4000, licence: 'ASE exams',
    jobs: [
      J('Intermittent electrical gremlin', '🔌', 55, { pay: 0.04, cash: 600 }),
      J('Timing belt on an interference engine', '⚙️', 45, { pay: 0.03, cash: 900 }),
      J('Diesel injector job', '🛻', 50, { pay: 0.04, cash: 1500 }),
      J('Brake job, all four corners', '🛑', 25, { pay: 0.02, cash: 500 }),
      J('Hybrid battery replacement', '🔋', 50, { pay: 0.04, cash: 0 }),
      J('Classic car restoration', '🏎️', 60, { pay: 0.03, cash: 8000 }),
    ],
    deck: [
      D('flatrate', '⏱️', 'Flat Rate', 'The book pays 2 hours. It\'ll take you 5 to do it right.', [
        { id: 'right', label: '🔧 Do it right', text: 'You lost money on the job. The car won\'t be back.', perf: -1, rep: 4 },
        { id: 'fast', label: '⚡ Cut corners to beat the clock', text: 'You beat the book.', perf: 2, risk: { chance: 0.25, text: 'It came back on a tow truck.', rep: -6, perf: -3 } },
      ]),
    ],
  },
  lineworker: {
    label: 'Your Work Orders', icon: '⚡', weights: { fitness: 3, smarts: 1 }, hours: 7000, licence: 'journeyman lineman card',
    jobs: [
      J('Ice-storm restoration, three states away', '🧊', 55, { pay: 0.12, cash: 0, injury: 0.06 }),
      J('Hurricane deployment', '🌀', 60, { pay: 0.15, cash: 0, injury: 0.07 }),
      J('Substation maintenance', '🏭', 45, { pay: 0.03, cash: 0, injury: 0.03 }),
      J('New subdivision underground', '🏘️', 35, { pay: 0.03, cash: 0 }),
      J('Hot-stick work on energised lines', '⚡', 60, { pay: 0.06, cash: 0, injury: 0.06 }),
    ],
    deck: [
      D('energized', '⚡', 'Is It Dead?', 'The crew is behind. The foreman says the line is de-energised but the grounds aren\'t on yet.', [
        { id: 'ground', label: '🔗 Ground it first', text: 'Ten minutes. Back-feed from a generator would have killed you.', rep: 4 },
        { id: 'go', label: '🧗 Go up now', text: 'You finished early.', risk: { chance: 0.08, text: 'A back-fed line. You took a jolt and fell from the bucket.', injury: 1, trauma: 10 } },
      ]),
    ],
  },
  ironworking: {
    label: 'The Hall Board', icon: '🏗️', weights: { fitness: 3, smarts: 1 }, hours: 6000, licence: 'journeyman ironworker card',
    jobs: [
      J('Topping out a 40-storey tower', '🏙️', 60, { pay: 0.08, cash: 0, injury: 0.06 }),
      J('Bridge girder erection over a river', '🌉', 60, { pay: 0.07, cash: 0, injury: 0.06 }),
      J('Rebar on a hospital foundation', '🧱', 35, { pay: 0.03, cash: 0, injury: 0.03 }),
      J('Stadium roof trusses', '🏟️', 55, { pay: 0.06, cash: 0, injury: 0.05 }),
      J('Ornamental stair and railings', '🌀', 40, { pay: 0.02, cash: 2800 }),
      J('Steel-frame barn for a farmer', '🛖', 30, { pay: 0.02, cash: 4500, injury: 0.03 }),
    ],
    deck: [
      D('tieoff', '🪢', 'Tie Off or Move Fast', 'Connecting a beam sixty storeys up. Clipping in at every move slows the crane, and the foreman is counting picks.', [
        { id: 'tie', label: '🪢 Stay tied off', text: 'Fewer picks, nobody hurt. The foreman grumbled and then quietly backed you.', rep: 3 },
        { id: 'free', label: '🧗 Walk the beam free', text: 'You made the schedule.', perf: 2, risk: { chance: 0.05, text: 'A gust took you off the iron. The net and a broken pelvis.', injury: 1, trauma: 12 } },
      ]),
      D('hall', '📋', 'The Hall Calls You Out', 'The union hall has a long job four hours away — or you wait for one near home that may not come.', [
        { id: 'travel', label: '🚗 Take the out-of-town job', text: 'Months in motels, good money and the hours to your next card.', money: 6000, moneyLabel: 'Per diem', stress: 4 },
        { id: 'wait', label: '🏠 Wait for a local call', text: 'Three weeks on the bench, then a decent local job.', perf: -1 },
      ]),
    ],
  },
  transitMaintenance: {
    label: 'The Depot Board', icon: '🛠️', weights: { smarts: 2, fitness: 1 }, hours: 4000, licence: 'ASE certification',
    jobs: [
      J('Overhaul an articulated bus engine', '🚌', 45, { pay: 0.03, cash: 0 }),
      J('Rail car door fault that strands trains', '🚇', 55, { pay: 0.04, cash: 0 }),
      J('Overnight track-switch inspection', '🔦', 50, { pay: 0.05, cash: 0, injury: 0.04 }),
      J('Electric bus battery swap', '🔋', 50, { pay: 0.04, cash: 0 }),
      J('Snow-storm emergency shift', '❄️', 40, { pay: 0.06, cash: 0, injury: 0.03 }),
      J('Rebuilding a heritage streetcar', '🚋', 60, { pay: 0.03, cash: 0 }),
    ],
    deck: [
      D('pullout', '⏰', 'Morning Pull-Out', 'Twelve buses short for the 5 a.m. pull-out. One has a brake warning you haven\'t traced yet.', [
        { id: 'hold', label: '🛑 Hold it out of service', text: 'Riders waited an extra ten minutes on one route. The brakes were failing.', rep: 4, perf: 1 },
        { id: 'send', label: '🚌 Clear it for service', text: 'Every route ran on time.', perf: 2, risk: { chance: 0.15, text: 'The bus lost its brakes on a downhill. Nobody was killed; the investigation found your sign-off.', perf: -8, rep: -8, trauma: 8 } },
      ]),
      D('derail', '🚃', 'The Derailment Board', 'A train derailed at low speed in the yard. The board wants to know whether the maintenance records were right.', [
        { id: 'truth', label: '📋 Tell them exactly what was skipped', text: 'Budgets had cut inspections; your testimony got the money restored.', rep: 5, perf: -1 },
        { id: 'cover', label: '🤐 Say the records speak for themselves', text: 'The board blamed "track geometry".', perf: 1, risk: { chance: 0.3, text: 'A colleague told the truth. You were disciplined for the gaps in your testimony.', perf: -6, rep: -6 } },
      ]),
    ],
  },
};

const config = (job) => TRADE_CAREERS[engineKey(job)];
const fresh = () => ({ offers: [], taken: [], done: 0, callbacks: 0, sideCash: 0, hours: 0 });
const isApprentice = (job) => APPRENTICE.includes(job?.levelId);

function board(rng, cfg, rec) {
  rec.offers = rng.shuffle(cfg.jobs).slice(0, 4).map((j) => ({ ...j }));
  rec.taken = [];
}

export function tradeView(state) {
  const job = state.career.job;
  const cfg = config(job);
  if (!cfg) return null;
  const rec = peekLife(state, 'tradeWork');
  return { cfg, rec: rec?.professionId === job.professionId ? rec : null, apprentice: isApprentice(job) };
}

/** Can you take this job, and how? */
export function takeEligibility(state, idx, how) {
  const job = state.career.job;
  const rec = peekLife(state, 'tradeWork');
  const j = rec?.offers?.[idx];
  if (!j) return { ok: false, reason: 'Not on the board' };
  if (rec.taken.some((t) => t.idx === idx)) return { ok: false, reason: 'Already taken' };
  if (rec.taken.length >= MAX_JOBS) return { ok: false, reason: `${MAX_JOBS} big jobs a year` };
  if (how === 'cash') {
    if (!j.cash) return { ok: false, reason: 'Not a side job' };
    if (isApprentice(job)) return { ok: false, reason: 'Apprentices can\'t take side work' };
  }
  return { ok: true };
}

export const TradeWorkModule = {
  id: 'tradeWork',
  order: 31.45,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || !job.paidThisYear || state.legal.incarceration) return;
    const rec = lifeOf(state, 'tradeWork', job.professionId, fresh());
    if (!rec.offers.length) board(rng, cfg, rec);
    const sk = skill(state, cfg.weights);
    // No jobs picked: the shop sends you on its usual work.
    const work = rec.taken.length ? rec.taken : [{ idx: rng.int(0, rec.offers.length - 1), how: 'book', assigned: true }];
    for (const t of work) {
      const j = rec.offers[t.idx];
      if (!j) continue;
      const roll = sk + rng.int(-20, 20) - j.diff;
      if (j.injury && rng.chance(j.injury)) applyFx(ctx, rec, { text: `You were hurt on the ${j.name.toLowerCase()} job.`, injury: 1, stress: 4 }, '🩹');
      if (roll >= 0) {
        rec.done += 1;
        if (t.how === 'cash') {
          rec.sideCash += j.cash;
          ctx.earn(j.cash, `Side job: ${j.name}`, { informal: true });
          ctx.log(`${j.icon} Side job done right: ${j.name.toLowerCase()} — $${j.cash.toLocaleString()} cash.`, j.icon, 'good');
          if (rng.chance(0.06)) ctx.emit('legal:offense', { offenseId: 'taxEvasion', context: 'unreported cash side jobs', discovery: 0.5, evidence: 0.5 });
        } else {
          const bonus = t.assigned ? 0 : Math.round(job.salary * j.pay / 100) * 100;
          if (bonus) ctx.earn(bonus, `Job bonus: ${j.name}`, { wage: true });
          applyFx(ctx, rec, { text: `${j.icon} ${j.name}: done right${bonus ? ` — a $${bonus.toLocaleString()} bonus` : ''}.`, perf: t.assigned ? 1 : 3, rep: 3 }, j.icon);
        }
      } else if (roll > -15) {
        rec.callbacks += 1;
        applyFx(ctx, rec, { text: `${j.icon} The ${j.name.toLowerCase()} came back as a warranty call. Unpaid hours putting it right.`, perf: -2, rep: -3, stress: 3 }, '🔁');
      } else {
        applyFx(ctx, rec, { text: `${j.icon} The ${j.name.toLowerCase()} went badly wrong: the customer wants it redone by someone else${t.how === 'cash' ? ', and you can\'t exactly call your insurer' : ''}.`, perf: -6, rep: -8, stress: 5, ...(t.how === 'cash' ? { cost: Math.round(j.cash * 0.6), costLabel: 'Refunding a botched side job' } : {}) }, '❌');
      }
    }
    if (isApprentice(job)) {
      rec.hours += 2000 + work.length * 150;
      if (rec.hours >= cfg.hours && !rec.hoursDone) {
        rec.hoursDone = true;
        ctx.log(`Your apprenticeship hours are complete: ${rec.hours.toLocaleString()} hours. You're ready for the ${cfg.licence}.`, '🎓', 'milestone');
      }
    }
    rec.rep = Math.round(clamp(rec.rep + (job.performance - 55) / 15, 0, 100));
    board(rng, cfg, rec);
    if (cfg.deck.length && rng.chance(0.5) && !state.prompts.some((p) => p.type === 'tradeWork.event')) {
      const d = rng.pick(cfg.deck);
      ctx.prompt({ type: 'tradeWork.event', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id, professionId: engineKey(job) } });
    }
  },
  actions: {
    /** arg: 'index:book|cash' */
    take(ctx, arg) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      if (!cfg) return;
      const [i, how = 'book'] = String(arg).split(':');
      const idx = Number(i);
      const ok = takeEligibility(state, idx, how);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      const rec = lifeOf(state, 'tradeWork', job.professionId, fresh());
      rec.taken.push({ idx, how });
      const j = rec.offers[idx];
      ctx.log(how === 'cash' ? `You agreed to do the ${j.name.toLowerCase()} on a weekend, for cash.` : `You took the ${j.name.toLowerCase()} job.`, j.icon);
      return undefined;
    },
  },
  resolvers: {
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = TRADE_CAREERS[data.professionId];
      const d = cfg?.deck.find((x) => x.id === data.deckId);
      if (!d || !job) return;
      resolveOption(ctx, lifeOf(ctx.state, 'tradeWork', job.professionId, fresh()), d.options.find((o) => o.id === optionId), d.icon, cfg.weights);
    },
  },
};

/** The first board appears with the job, not a year later. */
export function seedBoard(ctx) {
  const job = ctx.state.career.job;
  const cfg = config(job);
  if (!cfg) return;
  const rec = lifeOf(ctx.state, 'tradeWork', job.professionId, fresh());
  if (!rec.offers.length) board(ctx.rng, cfg, rec);
}
TradeWorkModule.setup = (engine) => engine.bus.on('career:hired', ({ ctx }) => seedBoard(ctx));
