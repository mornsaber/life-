/**
 * Labor unions as organizations.
 *
 * Every union local in your state is a real organization with members,
 * density (the share of its industry it represents), a treasury and a strike
 * fund, militancy, elected leadership and political clout. Together these
 * make its power, and power is what it wins: bigger contract settlements,
 * strikes that end in victory, organizing drives that succeed, endorsements
 * that move votes and bills that pass.
 *
 * You can rise through your own union: member → shop steward → vice
 * president → president. Officers organize new shops, mobilize the
 * membership, build the strike fund, endorse candidates and lobby the
 * legislature; at contract time they sit at the bargaining table.
 *
 * Unions also organize the businesses you own: a unionized business has a
 * real contract with the local, renegotiated every three years — and a
 * strike that shuts it down if talks fail.
 *
 * state.unions = { seed, byId: { [id]: union }, seeded: { [stateId]: true }, mine: { unionId, role, since, standing, candidacy } | null }
 * union = { id, name, stateId, professions, strike, members, density, treasury, strikeFund, militancy, clout, duesRate,
 *           president: { name, age, years, skill, player? }, vp, secretary, stewards, shops, lastSettlement,
 *           electionIn, history: [{ age, icon, text }], onStrike }
 */
import { Random, clamp } from '../../core/Random.js';
import { randomName, yearlyCount, bumpYearly } from '../../core/State.js';
import { PROFESSION_LIST } from './JobTrees.js';
import { STATES } from '../life/States.js';
import { REGIONS } from '../life/Regions.js';
import { BUSINESS_TYPES } from '../business/BusinessTypes.js';
import { lawValue } from '../politics/Laws.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const POP = { small: 0.35, medium: 0.6, large: 1, enterprise: 1.7 };
const AVG_WAGE = 58000;

export const UNION_ROLES = {
  member: { title: 'Member', rank: 0 },
  steward: { title: 'Shop Steward', rank: 1 },
  officer: { title: 'Vice President', rank: 2 },
  president: { title: 'President', rank: 3 },
};
/** Officer actions per year. */
export const UNION_ACTIONS = 3;
export const DUES_LEVELS = {
  low: { label: 'Low dues (1.0%)', rate: 0.010 },
  standard: { label: 'Standard dues (1.3%)', rate: 0.013 },
  high: { label: 'High dues (1.8%) — build the strike fund', rate: 0.018 },
};

/* ------------------------------------------------------------------ */
/* Catalog and records                                                 */
/* ------------------------------------------------------------------ */

let CATALOG = null;
/** Every union named by a career, with the professions it represents. */
export function unionCatalog() {
  if (CATALOG) return CATALOG;
  const by = {};
  for (const p of PROFESSION_LIST) {
    const u = p.union;
    if (!u) continue;
    const c = (by[u.name] ??= { name: u.name, strike: u.strike, professions: [], chance: 0 });
    c.professions.push(p.id);
    c.chance = Math.max(c.chance, u.chance);
  }
  CATALOG = by;
  return by;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const unionId = (name, stateId) => `${slug(name)}@${stateId}`;

export function unionRng(state) {
  state.unions ??= { seed: 7, byId: {}, seeded: {}, mine: null };
  state.unions.seed = ((state.unions.seed ?? 7) * 1103515245 + 12345) >>> 0;
  return new Random(state.unions.seed);
}

const personName = (rng) => {
  const n = randomName(rng, rng.pick(['male', 'female']));
  return `${n.firstName} ${n.lastName}`;
};

const homeState = (state) => (REGIONS[state.character.regionId] ?? REGIONS.midcity).state;
export const rightToWork = (state, stateId = homeState(state)) => Boolean(lawValue(state, 'rightToWork', stateId) ?? STATES[stateId]?.rightToWork);

function newUnion(state, rng, def, stateId) {
  const rtw = rightToWork(state, stateId);
  const density = clamp(def.chance * (rtw ? 0.5 : 1) * rng.float(0.7, 1.1), 0.02, 0.95);
  const members = Math.max(150, Math.round(rng.int(700, 7000) * (POP[STATES[stateId]?.population] ?? 0.6) * (0.4 + def.chance) * Math.sqrt(def.professions.length || 1)));
  return {
    id: unionId(def.name, stateId),
    name: def.name,
    stateId,
    professions: def.professions ?? [],
    strike: def.strike !== false,
    members,
    density: Math.round(density * 100) / 100,
    treasury: Math.round(members * rng.int(120, 400)),
    strikeFund: Math.round(members * rng.int(50, 600)),
    militancy: rng.int(25, 70),
    clout: rng.int(5, 35),
    duesRate: 0.013,
    president: { name: personName(rng), age: rng.int(42, 64), years: rng.int(1, 14), skill: rng.int(40, 85) },
    vp: personName(rng),
    secretary: personName(rng),
    stewards: Math.max(2, Math.round(members / 60)),
    shops: Math.max(1, Math.round(members / rng.int(80, 400))),
    lastSettlement: null,
    electionIn: rng.int(1, 3),
    history: [],
    onStrike: null,
  };
}

/** Seed the labor movement of a state: every union a career there can belong to. */
export function seedUnions(state, stateId = homeState(state)) {
  const u = (state.unions ??= { seed: 7, byId: {}, seeded: {}, mine: null });
  u.seeded ??= {};
  if (u.seeded[stateId]) return;
  const rng = unionRng(state);
  for (const def of Object.values(unionCatalog())) {
    const id = unionId(def.name, stateId);
    if (!u.byId[id]) u.byId[id] = newUnion(state, rng, def, stateId);
  }
  u.seeded[stateId] = true;
}

/** The union record behind an employer's bargaining unit (made on first sight). */
export function unionFor(state, employerUnion, stateId = homeState(state)) {
  if (!employerUnion) return null;
  state.unions ??= { seed: 7, byId: {}, seeded: {}, mine: null };
  const id = employerUnion.unionId ?? unionId(employerUnion.name, employerUnion.stateId ?? stateId);
  let rec = state.unions.byId[id];
  if (!rec) {
    const def = unionCatalog()[employerUnion.name] ?? { name: employerUnion.name, strike: employerUnion.strike, professions: [], chance: 0.4 };
    rec = state.unions.byId[id] = newUnion(state, unionRng(state), def, employerUnion.stateId ?? stateId);
  }
  employerUnion.unionId = id;
  return rec;
}

/** Read-only lookup for views. */
export const unionById = (state, id) => (id ? state.unions?.byId?.[id] ?? null : null);
export const unionsInState = (state, stateId = homeState(state)) => Object.values(state.unions?.byId ?? {}).filter((x) => x.stateId === stateId).sort((a, b) => b.members - a.members);

/** What a union can win: density, strike fund per member, militancy, leadership and political clout. */
export function unionPower(u) {
  if (!u) return 0;
  const fund = Math.min(20, (u.strikeFund / Math.max(1, u.members * 400)) * 20);
  const lead = ((u.president?.skill ?? 50) - 50) * 0.2;
  return Math.round(clamp(u.density * 50 + fund + u.militancy * 0.15 + lead + u.clout * 0.1, 0, 100));
}

/** Extra raise points a union's power wins at the table. */
export const powerBonus = (u) => Math.round(unionPower(u) / 30);
export const strikeWinChance = (u) => clamp(0.3 + unionPower(u) / 180, 0.25, 0.9);

function remember(u, age, icon, text) {
  u.history = [...(u.history ?? []).slice(-7), { age, icon, text }];
}

export const presidentPay = (u) => Math.round(clamp(u.members * 7, 50000, 240000) / 1000) * 1000;
export const officerPay = (u) => Math.round(presidentPay(u) * 0.4 / 1000) * 1000;
export const STEWARD_STIPEND = 1200;
const ROLE_PAY = { member: () => 0, steward: () => STEWARD_STIPEND, officer: officerPay, president: presidentPay };

/* ------------------------------------------------------------------ */
/* Your membership                                                     */
/* ------------------------------------------------------------------ */

export const myUnion = (state) => unionById(state, state.unions?.mine?.unionId);
export const myRole = (state) => state.unions?.mine?.role ?? null;
export const isOfficer = (state) => ['officer', 'president'].includes(myRole(state));

/** Keep your membership in step with your job. */
export function syncMembership(ctx) {
  const { state } = ctx;
  state.unions ??= { seed: 7, byId: {}, seeded: {}, mine: null };
  const job = state.career.job;
  const eu = job?.employer?.union;
  const mine = state.unions.mine;
  if (job?.unionMember && eu) {
    const u = unionFor(state, eu);
    if (!mine || mine.unionId !== u.id) {
      if (mine && mine.role !== 'member') ctx.log(`You gave up your post in ${unionById(state, mine.unionId)?.name ?? 'your old union'} when you changed jobs.`, '✊');
      state.unions.mine = { unionId: u.id, role: 'member', since: state.character.age, standing: 40, candidacy: null };
    }
    return state.unions.mine;
  }
  if (mine) {
    const u = myUnion(state);
    if (mine.role !== 'member') {
      ctx.log(`Leaving the bargaining unit ended your term as ${UNION_ROLES[mine.role].title} of ${u?.name ?? 'the union'}.`, '✊');
      if (u && mine.role === 'president') u.president = { name: u.vp, age: 50, years: 0, skill: 60 };
    }
    state.unions.mine = null;
  }
  return null;
}

function roleCheck(ctx, needOfficer = true) {
  const { state } = ctx;
  const mine = state.unions?.mine;
  const u = myUnion(state);
  if (!mine || !u) { ctx.toast('You aren\'t a union member.', 'warn'); return null; }
  if (needOfficer && !isOfficer(state)) { ctx.toast('Only union officers can do that.', 'warn'); return null; }
  if (needOfficer && yearlyCount(state, 'unions.act') >= UNION_ACTIONS) { ctx.toast(`${UNION_ACTIONS} union actions a year — next year.`, 'warn'); return null; }
  return { mine, u };
}
const bumpStanding = (mine, d) => { mine.standing = Math.round(clamp(mine.standing + d, 0, 100)); };

/** Who would win a union election: you against the incumbent slate. */
export function electionOdds(state, role) {
  const mine = state.unions?.mine;
  const u = myUnion(state);
  if (!mine || !u) return 0;
  const incumbent = role === 'president' ? (u.president?.skill ?? 60) : 55;
  return clamp(0.2 + (mine.standing - 50) / 120 + (state.stats.smarts - 50) / 400 + (state.stats.looks - 50) / 600 - (incumbent - 55) / 200 + (UNION_ROLES[mine.role].rank >= UNION_ROLES[role].rank - 1 ? 0.12 : -0.2), 0.03, 0.9);
}

export function runEligibility(state, role) {
  const mine = state.unions?.mine;
  if (!mine) return { ok: false, reason: 'Members only' };
  if (mine.candidacy) return { ok: false, reason: 'Already running' };
  if (UNION_ROLES[mine.role].rank >= UNION_ROLES[role].rank) return { ok: false, reason: 'You already hold it' };
  if (role === 'steward') return state.character.age - mine.since >= 1 ? { ok: true } : { ok: false, reason: 'A year as a member first' };
  if (role === 'officer') return mine.standing >= 50 || mine.role === 'steward' ? { ok: true } : { ok: false, reason: 'Steward or standing 50+' };
  if (role === 'president') return mine.standing >= 65 || mine.role === 'officer' ? { ok: true } : { ok: false, reason: 'Officer or standing 65+' };
  return { ok: false, reason: 'Unknown post' };
}

function resolveElection(ctx, u, rng) {
  const { state } = ctx;
  const mine = state.unions.mine;
  const age = state.character.age;
  u.electionIn = 3;
  // You, if you're running.
  if (mine?.unionId === u.id && mine.candidacy) {
    const role = mine.candidacy;
    mine.candidacy = null;
    const won = rng.chance(electionOdds(state, role));
    if (won) {
      mine.role = role;
      bumpStanding(mine, 5);
      if (role === 'president') {
        remember(u, age, '🗳️', `${state.character.firstName} ${state.character.lastName} unseated ${u.president.name} as president.`);
        u.president = { name: `${state.character.firstName} ${state.character.lastName}`, age, years: 0, skill: clamp(Math.round((state.stats.smarts + state.stats.looks) / 2), 30, 95), player: true };
      }
      ctx.log(`You won the ${u.name} election: you're now ${UNION_ROLES[role].title}.`, '✊', 'milestone');
      ctx.stat('happiness', 6);
    } else {
      bumpStanding(mine, -4);
      ctx.log(`You lost the ${u.name} election for ${UNION_ROLES[role].title.toLowerCase()}.`, '🗳️', 'warn');
    }
    return;
  }
  // An incumbent president of yours runs again on the record.
  if (mine?.unionId === u.id && mine.role === 'president') {
    const ok = rng.chance(clamp(0.45 + mine.standing / 150, 0.3, 0.95));
    if (!ok) {
      mine.role = 'member';
      bumpStanding(mine, -10);
      u.president = { name: personName(rng), age: rng.int(40, 60), years: 0, skill: rng.int(45, 85) };
      remember(u, age, '🗳️', `A reform slate unseated the president; ${u.president.name} took over.`);
      ctx.log(`The membership voted you out as president of ${u.name}.`, '🗳️', 'bad');
    } else ctx.log(`${u.name} re-elected you president.`, '✊', 'good');
    return;
  }
  if (u.president?.player) return;
  // NPC elections: incumbents usually win; old ones retire.
  if (u.president.age >= 68 || rng.chance(0.25)) {
    const old = u.president.name;
    u.president = { name: u.vp, age: rng.int(40, 60), years: 0, skill: rng.int(40, 88) };
    u.vp = personName(rng);
    remember(u, age, '🗳️', `${old} stepped down; ${u.president.name} was elected president.`);
  }
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

function npcYear(ctx, u, rng) {
  const { state } = ctx;
  const age = state.character.age;
  const phase = state.economy?.phase;
  const rtw = rightToWork(state, u.stateId);
  // Membership: the economy, the law, and whether the union delivers.
  const drift = (phase === 'recession' ? -0.03 : phase === 'expansion' ? 0.01 : 0) + (rtw ? -0.012 : 0.004) + (unionPower(u) - 45) / 3000 + rng.float(-0.02, 0.02);
  u.members = Math.max(100, Math.round(u.members * (1 + drift)));
  u.density = Math.round(clamp(u.density * (1 + drift * 0.8), 0.01, 0.97) * 1000) / 1000;
  // Dues: the local keeps about a quarter; a fifth of that goes to the strike fund.
  const dues = Math.round(u.members * AVG_WAGE * u.duesRate * 0.25 * (rtw ? 0.85 : 1));
  u.treasury = Math.round(u.treasury + dues * 0.8 - u.members * 9 - (u.president?.player ? 0 : presidentPay(u)));
  u.strikeFund = Math.round(u.strikeFund * 1.02 + dues * 0.2);
  if (u.treasury < 0) { u.strikeFund += u.treasury; u.treasury = 0; }
  u.strikeFund = Math.max(0, u.strikeFund);
  u.militancy = Math.round(clamp(u.militancy + (55 - u.militancy) * 0.1 + rng.int(-4, 4) + (state.economy?.inflation > 0.035 ? 3 : 0), 0, 100));
  u.clout = Math.round(clamp(u.clout * 0.95 + u.density * 6 + rng.int(-1, 2), 0, 100));
  if (!u.president.player) u.president.age += 1;
  u.president.years += 1;
  u.stewards = Math.max(2, Math.round(u.members / 60));
  u.lastSettlement = Math.max(1, Math.round((state.economy?.inflation ?? 0.025) * 100) + powerBonus(u) + rng.int(-1, 1));
  u.onStrike = null;
  // Strikes elsewhere in the local.
  if (u.strike && rng.chance(0.03 + u.militancy / 1500)) {
    const weeks = rng.int(1, 9);
    const won = rng.chance(strikeWinChance(u));
    u.strikeFund = Math.max(0, u.strikeFund - Math.round(u.members * 0.1 * weeks * 350));
    u.onStrike = { weeks, won };
    if (won) { u.militancy = Math.min(100, u.militancy + 5); u.members = Math.round(u.members * 1.02); }
    remember(u, age, '✊', `Struck a ${u.professions.length ? 'major employer' : 'shop'} for ${weeks} weeks — ${won ? `won ${u.lastSettlement + 2}%` : 'settled for less'}.`);
  } else if (rng.chance(0.15)) {
    // Organizing: a new shop votes the union in.
    const gain = Math.round(u.members * rng.float(0.01, 0.04));
    u.members += gain;
    u.shops += 1;
    remember(u, age, '📈', `Organized a new shop (+${gain} members).`);
  }
  u.electionIn = (u.electionIn ?? 3) - 1;
  if (u.electionIn <= 0) resolveElection(ctx, u, rng);
}

/** Your year in the union: stipend for your post, standing, the officer's chair. */
function myYear(ctx) {
  const { state } = ctx;
  const mine = state.unions.mine;
  const u = myUnion(state);
  if (!mine || !u) return;
  const pay = ROLE_PAY[mine.role](u);
  if (pay) {
    ctx.earn(pay, `${u.name} — ${UNION_ROLES[mine.role].title}`, { wage: true });
    if (mine.role === 'president' && u.treasury >= pay) u.treasury -= pay;
  }
  if (mine.role !== 'member') ctx.stat('stress', mine.role === 'president' ? 5 : 2);
  // Standing slowly follows how the union is doing.
  bumpStanding(mine, (unionPower(u) - 45) / 15 + (mine.role === 'steward' ? 2 : 0));
}

/* ------------------------------------------------------------------ */
/* Contracts at your employer (called from the employee tick)          */
/* ------------------------------------------------------------------ */

/** Offer the bargaining committee brings back, raised by the union's power. */
export function contractOffer(state, u, rng) {
  return Math.max(1, Math.round((state.economy?.inflation ?? 0.025) * 100)) + rng.int(0, 2) + powerBonus(u);
}

/** As an officer you sit at the table yourself. */
export function bargainingPrompt(ctx, job, u, offer) {
  ctx.prompt({
    type: 'unions.bargain',
    icon: '🤝',
    title: `${u.name}: At the Table`,
    text: `The contract with ${job.employer.name} is up. Management's last offer is ${offer}% over three years. The union's power is ${unionPower(u)}/100 (strike fund ${money(u.strikeFund)}).`,
    options: [
      { id: 'settle', label: `🤝 Settle at ${offer}%` },
      { id: 'push', label: `💪 Push for ${offer + 2}%`, hint: 'Management may dig in' },
      { id: 'max', label: `✊ Demand ${offer + 5}%`, hint: u.strike ? 'Likely strike' : 'Arbitration' },
    ],
    data: { offer },
  });
}

/* ------------------------------------------------------------------ */
/* Unions in your businesses                                           */
/* ------------------------------------------------------------------ */

/** The union that organizes a business's workers: one representing its industry, or a general workers' union. */
export function businessUnion(state, biz) {
  const stateId = (REGIONS[biz.regionId ?? state.character.regionId] ?? REGIONS.midcity).state;
  if (biz.union?.unionId && state.unions?.byId?.[biz.union.unionId]) return state.unions.byId[biz.union.unionId];
  const profs = BUSINESS_TYPES[biz.typeId]?.professions ?? [];
  const def = Object.values(unionCatalog()).find((c) => c.professions.some((p) => profs.includes(p))) ?? { name: 'Workers United (SEIU)', strike: true, professions: [], chance: 0.3 };
  const u = unionFor(state, { name: def.name, strike: def.strike, stateId }, stateId);
  biz.union = { unionId: u.id, contractYearsLeft: biz.union?.contractYearsLeft ?? 3, lastRaise: biz.union?.lastRaise ?? null, grievances: 0 };
  return u;
}

/** What the local will ask for at contract time (percent). */
export const unionDemand = (state, u) => Math.max(2, Math.round((state.economy?.inflation ?? 0.025) * 100) + 1 + Math.round(unionPower(u) / 25));

/** A raise above inflation becomes a lasting labor-cost premium. */
function settle(biz, state, pct) {
  const real = Math.max(0.3, pct - Math.round((state.economy?.inflation ?? 0.025) * 100)) / 100;
  biz.staff.costPremium = Math.round((biz.staff.costPremium + real * 0.6) * 1000) / 1000;
  biz.union.lastRaise = pct;
  biz.union.contractYearsLeft = 3;
}

function strikeAt(ctx, biz, u, weeks, why) {
  biz.strike = { weeks };
  u.onStrike = { weeks, employer: biz.name };
  u.strikeFund = Math.max(0, u.strikeFund - Math.round(biz.staff.headcount * weeks * 400));
  biz.staff.morale = Math.max(0, biz.staff.morale - 10);
  remember(u, ctx.state.character.age, '✊', `Struck ${biz.name} for ${weeks} weeks${why ? ` (${why})` : ''}.`);
  ctx.log(`${u.name} struck ${biz.name}: ${weeks} weeks of picket lines. Expect a hit to next year's revenue.`, '✊', 'bad');
}

/**
 * The year for a unionized business: grievances, and every third year a new contract.
 * `decide`: true when the owner gets the call; otherwise management settles.
 */
export function businessUnionYear(ctx, biz, { decide = false } = {}) {
  const { state } = ctx;
  if (!biz.staff?.unionized) {
    if (biz.union) delete biz.union;
    return;
  }
  const rng = unionRng(state);
  const u = businessUnion(state, biz);
  if (biz.staff.morale < 45 && rng.chance(0.3)) {
    const cost = Math.round(Math.max(1, biz.staff.headcount) * rng.int(120, 400));
    biz.cash -= cost;
    biz.union.grievances = (biz.union.grievances ?? 0) + 1;
    ctx.log(`${biz.name}: the union won a grievance arbitration (${money(cost)} in back pay).`, '⚖️', 'warn');
  }
  biz.union.contractYearsLeft -= 1;
  if (biz.union.contractYearsLeft > 0) return;
  const demand = unionDemand(state, u);
  if (decide) {
    ctx.prompt({
      type: 'unions.bizContract',
      icon: '📜',
      title: `${biz.name}: Union Contract`,
      text: `The contract with ${u.name} is up. The union wants ${demand}% over three years. Its power: ${unionPower(u)}/100 · strike fund ${money(u.strikeFund)}.`,
      options: [
        { id: 'accept', label: `🤝 Agree to ${demand}%`, hint: 'Labor peace' },
        { id: 'counter', label: `📉 Counter at ${Math.max(1, demand - 2)}%`, hint: 'Smarts check · strike risk' },
        { id: 'lockout', label: '🔒 Lock them out', hint: 'Shut down until they fold' },
      ],
      data: { id: biz.id, demand },
    });
    return;
  }
  // Management bargains: usually a deal a point under the ask; sometimes a strike.
  if (u.strike && rng.chance(unionPower(u) / 400)) strikeAt(ctx, biz, u, rng.int(1, 5), 'talks broke down');
  settle(biz, state, Math.max(1, demand - 1));
  ctx.log(`${biz.name}'s managers signed a new ${u.name} contract (+${biz.union.lastRaise}% over three years).`, '📜');
}

function bizById(state, id) {
  return [state.business?.current, ...(state.business?.holdings ?? [])].find((b) => b?.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const LaborUnions = {
  id: 'unions',
  order: 30.4,

  init(state) {
    state.unions ??= { seed: ((state.orgs?.seed ?? 7) ^ 0x5eed) >>> 0, byId: {}, seeded: {}, mine: null };
    state.unions.seeded ??= {};
  },

  setup(engine) {
    engine.bus.on('career:hired', ({ ctx }) => {
      if (ctx.state.character.age >= 16) seedUnions(ctx.state);
      const eu = ctx.state.career.job?.employer?.union;
      if (eu) unionFor(ctx.state, eu);
      syncMembership(ctx);
    });
    engine.bus.on('career:separated', ({ ctx }) => syncMembership(ctx));
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (state.character.age < 16) return;
    seedUnions(state);
    syncMembership(ctx);
    const rng = unionRng(state);
    const home = homeState(state);
    for (const u of Object.values(state.unions.byId)) if (u.stateId === home || u.id === state.unions.mine?.unionId) npcYear(ctx, u, rng);
    myYear(ctx);
  },

  actions: {
    join(ctx) {
      ctx.emit('career:joinUnion', {});
    },
    /** Run for a union post at the next election (stewards are chosen at once). */
    run(ctx, role) {
      const { state } = ctx;
      const check = runEligibility(state, role);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      const u = myUnion(state);
      const mine = state.unions.mine;
      if (role === 'steward') {
        mine.role = 'steward';
        bumpStanding(mine, 4);
        const job = state.career.job;
        if (job) job.coworkers = Math.min(100, job.coworkers + 6);
        return ctx.log(`Your coworkers chose you as their shop steward in ${u.name}.`, '🦺', 'good');
      }
      mine.candidacy = role;
      ctx.log(`You're running for ${UNION_ROLES[role].title.toLowerCase()} of ${u.name}. The election is in ${u.electionIn} year${u.electionIn === 1 ? '' : 's'}.`, '🗳️');
      return undefined;
    },
    stepDown(ctx) {
      const { state } = ctx;
      const mine = state.unions?.mine;
      if (!mine || mine.role === 'member') return;
      const u = myUnion(state);
      if (mine.role === 'president') u.president = { name: u.vp, age: 50, years: 0, skill: 60 };
      ctx.log(`You stepped down as ${UNION_ROLES[mine.role].title} of ${u.name}.`, '✊');
      mine.role = 'member';
    },
    /** Organize a non-union shop in the industry. */
    organize(ctx) {
      const r = roleCheck(ctx);
      if (!r) return;
      const { state } = ctx;
      const { u, mine } = r;
      const cost = Math.round(clamp(u.members * 6, 15000, 250000));
      if (u.treasury < cost) return ctx.toast(`An organizing campaign costs ${money(cost)} — the treasury has ${money(u.treasury)}.`, 'warn');
      bumpYearly(state, 'unions.act');
      u.treasury -= cost;
      const rng = unionRng(state);
      const odds = clamp(0.3 + unionPower(u) / 250 + u.militancy / 400 + (state.stats.smarts - 50) / 400 - (rightToWork(state, u.stateId) ? 0.12 : 0) + (lawValue(state, 'cardCheck', u.stateId) ? 0.15 : 0), 0.1, 0.85);
      if (rng.chance(odds)) {
        const gain = Math.round(u.members * rng.float(0.04, 0.1));
        u.members += gain;
        u.shops += 1;
        u.density = Math.round(clamp(u.density + rng.float(0.01, 0.03), 0, 0.97) * 1000) / 1000;
        bumpStanding(mine, 6);
        remember(u, state.character.age, '📈', `Organized a new shop under ${state.character.firstName} ${state.character.lastName} (+${gain} members).`);
        ctx.log(`Your organizing drive won: ${gain} new members of ${u.name}.`, '✊', 'good');
      } else {
        bumpStanding(mine, -2);
        ctx.log(`The organizing drive lost the election after the employer's anti-union campaign (${money(cost)} spent).`, '📉', 'warn');
      }
    },
    /** Rallies, solidarity actions, contract campaigns. */
    mobilize(ctx) {
      const r = roleCheck(ctx);
      if (!r) return;
      bumpYearly(ctx.state, 'unions.act');
      r.u.militancy = Math.min(100, r.u.militancy + 10);
      bumpStanding(r.mine, 3);
      ctx.stat('stress', 3);
      ctx.log(`You led a ${r.u.name} rally. The membership is fired up (militancy ${r.u.militancy}).`, '📣', 'good');
    },
    /** Move money from the general fund into the strike fund. */
    strikeFund(ctx) {
      const r = roleCheck(ctx);
      if (!r) return;
      const amount = Math.round(r.u.treasury * 0.3);
      if (amount < 1000) return ctx.toast('The general fund is too thin.', 'warn');
      bumpYearly(ctx.state, 'unions.act');
      r.u.treasury -= amount;
      r.u.strikeFund += amount;
      ctx.log(`${r.u.name} moved ${money(amount)} into the strike fund (${money(r.u.strikeFund)}).`, '🏦');
    },
    /** President: set the dues rate. */
    dues(ctx, level) {
      const { state } = ctx;
      if (myRole(state) !== 'president' || !DUES_LEVELS[level]) return;
      const u = myUnion(state);
      const before = u.duesRate;
      u.duesRate = DUES_LEVELS[level].rate;
      if (u.duesRate > before) bumpStanding(state.unions.mine, -4);
      if (u.duesRate < before) bumpStanding(state.unions.mine, 3);
      const eu = state.career.job?.employer?.union;
      if (eu) eu.duesRate = u.duesRate;
      ctx.log(`${u.name} set dues at ${(u.duesRate * 100).toFixed(1)}% of pay.`, '💵');
    },
    /** Endorse: your own campaign (with the union's PAC money), or the union's slate. */
    endorse(ctx) {
      const r = roleCheck(ctx);
      if (!r) return;
      const { state } = ctx;
      const { u } = r;
      bumpYearly(state, 'unions.act');
      const c = state.politics?.campaign;
      if (c && myRole(state) === 'president') {
        if (!c.endorsements.includes('labor')) c.endorsements.push('labor');
        const pac = Math.round(Math.min(u.treasury * 0.15, 2_000_000));
        u.treasury -= pac;
        c.funds += pac;
        c.laborPower = unionPower(u);
        ctx.log(`${u.name} endorsed your campaign and its PAC put in ${money(pac)}. Members will knock doors for you.`, '✊', 'good');
        return;
      }
      u.clout = Math.min(100, u.clout + 8);
      state.politics.laborVotes = (state.politics.laborVotes ?? 0) + 1;
      ctx.log(`${u.name} endorsed a slate of pro-labor candidates (clout ${u.clout}).`, '🗳️');
    },
    /** President: help yourself to the treasury. */
    embezzle(ctx) {
      const { state } = ctx;
      if (myRole(state) !== 'president') return;
      const u = myUnion(state);
      const take = Math.round(u.treasury * 0.1);
      if (take < 5000) return ctx.toast('Not enough in the treasury to skim unnoticed.', 'warn');
      u.treasury -= take;
      ctx.earn(take, 'Undisclosed income');
      ctx.emit('legal:offense', { offenseId: 'embezzlement', context: `skimming the ${u.name} treasury`, discovery: 0.3, evidence: 0.85 });
      ctx.log(`You skimmed ${money(take)} from ${u.name}'s treasury through padded expenses.`, '💼', 'warn');
    },
  },

  resolvers: {
    /** Your committee's move at the table. */
    bargain(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const u = myUnion(state);
      if (!job || !u) return;
      const mine = state.unions.mine;
      const ask = optionId === 'settle' ? data.offer : optionId === 'push' ? data.offer + 2 : data.offer + 5;
      // Management's resistance falls with the union's power.
      const accept = optionId === 'settle' ? 1 : clamp((optionId === 'push' ? 0.45 : 0.15) + unionPower(u) / 200 + (state.stats.smarts - 50) / 300, 0.05, 0.95);
      if (rng.chance(accept)) {
        ctx.emit('career:raise', { pct: ask });
        u.lastSettlement = ask;
        bumpStanding(mine, optionId === 'settle' ? 1 : optionId === 'push' ? 5 : 9);
        remember(u, state.character.age, '📜', `Won a ${ask}% contract at ${job.employer.name}.`);
        ctx.log(`${job.employer.name} agreed: a ${ask}% contract for ${u.name}.`, '📜', 'good');
        return;
      }
      if (u.strike) {
        ctx.log('Management walked away from the table. The membership authorized a strike.', '✊', 'warn');
        ctx.prompt({
          type: 'career.strike', icon: '✊', title: 'On Strike!',
          text: `${u.name} walked out at ${job.employer.name}. As a union leader you're on the line.`,
          options: [{ id: 'picket', label: '✊ Lead the picket line' }, { id: 'cross', label: '🚶 Cross it', hint: 'Ends your union career', tone: 'danger' }],
          data: { offer: ask - 1 },
        });
      } else {
        const award = Math.max(1, data.offer + rng.int(0, 3));
        ctx.emit('career:raise', { pct: award });
        u.lastSettlement = award;
        ctx.log(`Talks failed; the arbitrator awarded ${award}%.`, '⚖️');
      }
    },
    bizContract(ctx, data, optionId) {
      const { state, rng } = ctx;
      const biz = bizById(state, data.id);
      if (!biz?.staff?.unionized) return;
      const u = businessUnion(state, biz);
      if (optionId === 'accept') {
        settle(biz, state, data.demand);
        biz.staff.morale = Math.min(100, biz.staff.morale + 6);
        return ctx.log(`You signed a ${data.demand}% contract with ${u.name}. Labor peace at ${biz.name}.`, '🤝', 'good');
      }
      if (optionId === 'counter') {
        const won = state.stats.smarts + rng.int(-20, 20) - unionPower(u) / 4 >= 40;
        if (won) {
          settle(biz, state, Math.max(1, data.demand - 2));
          return ctx.log(`The union took your counter: ${biz.union.lastRaise}% over three years.`, '📉', 'good');
        }
        if (u.strike && rng.chance(0.3 + unionPower(u) / 200)) strikeAt(ctx, biz, u, rng.int(2, 8), 'your counteroffer');
        settle(biz, state, data.demand);
        return ctx.log(`You ended up at ${data.demand}% anyway.`, '📜', 'warn');
      }
      // Lockout: weeks without revenue; a weak union folds, a strong one outlasts you.
      const weeks = rng.int(3, 10);
      strikeAt(ctx, biz, u, weeks, 'lockout');
      if (rng.chance(1 - unionPower(u) / 100)) {
        settle(biz, state, Math.max(1, data.demand - 4));
        u.militancy = Math.max(0, u.militancy - 10);
        ctx.log(`The locked-out workers came back at ${biz.union.lastRaise}%.`, '🔒', 'warn');
      } else {
        settle(biz, state, data.demand + 1);
        ctx.log(`The union outlasted the lockout and won ${biz.union.lastRaise}%.`, '✊', 'bad');
      }
      biz.staff.morale = Math.max(0, biz.staff.morale - 15);
      biz.reputation = Math.max(0, biz.reputation - 4);
      return undefined;
    },
  },
};
