/**
 * Achievements, challenges and the Hall of Fame.
 *
 * Achievements unlock once per life as you reach them (checked every year)
 * and are also kept across lives as an all-time trophy cabinet. A challenge
 * is a goal chosen at birth (a self-made million, a public-service career
 * to the top, a clean record to 70...) that is won or lost during the life.
 * When a life ends it goes into the Hall of Fame, scored on achievements,
 * fortune and standing.
 *
 * state.achievements = { [id]: ageUnlocked }
 * state.challenge    = { id, status: 'active' | 'won' | 'failed', at?, reason? } | null
 * storage: lifesim.hallOfFame = [entry], lifesim.trophies = { [id]: { first, count } }
 */
import { netWorth, prestige, criminalRecord, fullName, currentYear } from '../../core/State.js';
import { OFFICES } from '../politics/Offices.js';
import { COUNTRIES } from '../world/Countries.js';

const GOV = ['municipal', 'state', 'federal', 'public'];
const POINTS = { bronze: 10, silver: 25, gold: 50 };

/* ------------------------------------------------------------------ */
/* What a life has done                                                */
/* ------------------------------------------------------------------ */

const jobsOf = (s) => [...(s.career?.history ?? []), s.career?.job].filter(Boolean);
const peakGrade = (s) => jobsOf(s).reduce((m, j) => Math.max(m, j.peakGrade ?? j.grade ?? 0), 0);
/** Ran a whole organization (not just a department). */
const headedOrg = (s, gov = false) => jobsOf(s).some((j) => (j.headOf ? !j.headOf.deptId : j.headed === 'org') && (!gov || GOV.includes(j.sector)));
const tours = (s) => [...(s.military?.history ?? []), s.military?.service].filter(Boolean);
const flagRank = (t) => (t.track === 'officer' || t.track === undefined) && ((t.grade ?? Number(/-(\d+)$/.exec(t.rankCode ?? '')?.[1] ?? 0) - 1) >= 6) && (t.track === 'officer' || /^O/.test(t.rankCode ?? ''));
const officesHeld = (s) => [...(s.politics?.history ?? []).map((h) => h.officeId), s.politics?.office?.id].filter(Boolean);
const topOfficeLevel = (s) => officesHeld(s).reduce((m, id) => Math.max(m, OFFICES[id]?.level ?? 0), 0);
const saves = (s) => [...Object.entries(s.emergency ?? {}).filter(([k, m]) => k !== 'history' && m?.saves).map(([, m]) => m.saves), ...(s.emergency?.history ?? []).map((h) => h.saves ?? 0)].reduce((a, b) => a + b, 0);
const businesses = (s) => [s.business?.current, ...(s.business?.holdings ?? [])].filter(Boolean);
const people = (s) => s.people?.list ?? [];
const countriesLived = (s) => new Set([s.migration?.birthCountry ?? s.character.countryId ?? 'US', ...(s.migration?.history ?? []).map((h) => h.to), s.character.countryId ?? 'US'].filter(Boolean));
const degree = (s, ...types) => (s.education?.degrees ?? []).some((d) => types.includes(d.type));
const activeCredentials = (s) => Object.values(s.credentials?.held ?? {}).filter((h) => h.status === 'active').length;
const honors = (s) => s.honors ?? [];

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export const ACHIEVEMENTS = {
  // Growing up
  graduate: { name: 'Graduate', icon: '🎓', tier: 'bronze', desc: 'Earn a bachelor\'s degree.', test: (s) => degree(s, 'bachelor', 'master', 'doctorate', 'professional') },
  doctor: { name: 'Doctorate', icon: '📜', tier: 'silver', desc: 'Earn a PhD or a professional doctorate (MD, JD...).', test: (s) => degree(s, 'doctorate', 'professional') },
  licensed: { name: 'Fully Licensed', icon: '🪪', tier: 'silver', desc: 'Hold 10 active licenses and certifications at once.', test: (s) => activeCredentials(s) >= 10 },
  // Work
  firstJob: { name: 'First Paycheck', icon: '💵', tier: 'bronze', desc: 'Get your first full-time job.', test: (s) => jobsOf(s).length > 0 },
  manager: { name: 'The Boss', icon: '🧑‍💼', tier: 'bronze', desc: 'Supervise a team.', test: (s) => Boolean(s.career?.job?.department) || jobsOf(s).some((j) => (j.peakGrade ?? 0) >= 6) },
  executive: { name: 'Top Floor', icon: '🏙️', tier: 'silver', desc: 'Reach grade 9 or higher in a career.', test: (s) => peakGrade(s) >= 9 },
  agencyHead: { name: 'Head of the Agency', icon: '🏛️', tier: 'gold', desc: 'Run a whole government agency or service.', test: (s) => headedOrg(s, true) },
  lifer: { name: 'Lifer', icon: '⌛', tier: 'silver', desc: '25 years with one employer.', test: (s) => (s.career?.job?.yearsAtEmployer ?? 0) >= 25 || jobsOf(s).some((j) => (j.endAge ?? 0) - (j.startAge ?? 0) >= 25) },
  // Money
  homeowner: { name: 'Homeowner', icon: '🏡', tier: 'bronze', desc: 'Own a home.', test: (s) => (s.housing?.properties ?? []).length > 0 },
  landlord: { name: 'Landlord', icon: '🏘️', tier: 'silver', desc: 'Own five properties.', test: (s) => (s.housing?.properties ?? []).length >= 5 },
  millionaire: { name: 'Millionaire', icon: '💰', tier: 'silver', desc: 'Reach a $1M net worth.', test: (s) => netWorth(s) >= 1e6 },
  decamillionaire: { name: 'Eight Figures', icon: '💎', tier: 'gold', desc: 'Reach a $10M net worth.', test: (s) => netWorth(s) >= 1e7 },
  billionaire: { name: 'Billionaire', icon: '🚀', tier: 'gold', desc: 'Reach a $1B net worth.', test: (s) => netWorth(s) >= 1e9 },
  founder: { name: 'Founder', icon: '🏪', tier: 'bronze', desc: 'Start a business.', test: (s) => businesses(s).length > 0 || (s.business?.history ?? []).length > 0 },
  tycoon: { name: 'Tycoon', icon: '🏭', tier: 'gold', desc: 'Own a business worth $50M.', test: (s) => businesses(s).some((b) => (b.valuation ?? 0) >= 5e7) },
  debtFree: { name: 'Debt Free', icon: '🧾', tier: 'bronze', desc: 'Pay off a mortgage.', test: (s) => (s.housing?.properties ?? []).some((p) => p.mortgage && p.mortgage.balance <= 0) || (s.housing?.paidOff ?? 0) > 0 },
  // Service
  enlisted: { name: 'Served', icon: '🎖️', tier: 'bronze', desc: 'Serve in the armed forces.', test: (s) => tours(s).length > 0 },
  combatVet: { name: 'Combat Veteran', icon: '🪖', tier: 'silver', desc: 'Complete a combat tour.', test: (s) => tours(s).some((t) => (t.combatTours ?? 0) > 0) },
  general: { name: 'Flag Rank', icon: '⭐', tier: 'gold', desc: 'Reach general or admiral.', test: (s) => tours(s).some(flagRank) },
  lifesaver: { name: 'Lifesaver', icon: '🚑', tier: 'silver', desc: 'Make 25 saves as a first responder.', test: (s) => saves(s) >= 25 },
  moh: { name: 'Above and Beyond', icon: '🏅', tier: 'gold', desc: 'Receive your country\'s highest award for valour.', test: (s) => honors(s).some((h) => h.id === 'moh' || h.highest) },
  decorated: { name: 'Decorated', icon: '🎗️', tier: 'silver', desc: 'Receive five honours.', test: (s) => honors(s).length >= 5 },
  knighted: { name: 'Arise', icon: '⚔️', tier: 'gold', desc: 'Be knighted (Sir or Dame).', test: (s) => ['Sir', 'Dame'].includes(s.character.style?.prefix) || Boolean(s.character.style?.peerage) },
  peer: { name: 'Ennobled', icon: '👑', tier: 'gold', desc: 'Be made a life peer.', test: (s) => Boolean(s.character.style?.peerage) },
  // Public life
  elected: { name: 'Elected', icon: '🗳️', tier: 'bronze', desc: 'Win an election.', test: (s) => officesHeld(s).length > 0 },
  lawmaker: { name: 'Lawmaker', icon: '📜', tier: 'silver', desc: 'Pass a bill you sponsored.', test: (s) => (s.laws?.enacted ?? []).some((e) => e.sponsor === 'you') },
  leader: { name: 'Head of Government', icon: '🏛️', tier: 'gold', desc: 'Become president, prime minister or the equivalent.', test: (s) => topOfficeLevel(s) >= 5 },
  judge: { name: 'Your Honor', icon: '⚖️', tier: 'silver', desc: 'Take a seat on the bench.', test: (s) => Boolean(s.judiciary?.seat) || officesHeld(s).includes('judge') },
  // Family and life
  married: { name: 'Tied the Knot', icon: '💍', tier: 'bronze', desc: 'Get married.', test: (s) => people(s).some((p) => p.relation === 'spouse' || p.relation === 'exSpouse' || p.wasSpouse) },
  bigFamily: { name: 'Full House', icon: '👨‍👩‍👧‍👦', tier: 'silver', desc: 'Raise four children.', test: (s) => people(s).filter((p) => p.relation === 'child').length >= 4 },
  grandparent: { name: 'Grandparent', icon: '👴', tier: 'silver', desc: 'Have a grandchild.', test: (s) => people(s).some((p) => p.relation === 'grandchild') },
  expat: { name: 'Expat', icon: '✈️', tier: 'bronze', desc: 'Move to another country.', test: (s) => (s.migration?.history ?? []).length > 0 },
  citizenOfTheWorld: { name: 'Citizen of the World', icon: '🌍', tier: 'silver', desc: 'Hold three citizenships.', test: (s) => (s.character.citizenships ?? []).length >= 3 },
  ninety: { name: 'Nonagenarian', icon: '🎂', tier: 'silver', desc: 'Live to 90.', test: (s) => s.character.age >= 90 },
  centenarian: { name: 'Centenarian', icon: '💯', tier: 'gold', desc: 'Live to 100.', test: (s) => s.character.age >= 100 },
  // The other side of the law
  rapSheet: { name: 'Rap Sheet', icon: '🚔', tier: 'bronze', desc: 'Get convicted of a crime.', test: (s) => (s.legal?.record ?? []).some((r) => ['misdemeanor', 'felony'].includes(r.severity)) },
  pardoned: { name: 'Clean Slate', icon: '🕊️', tier: 'silver', desc: 'Have a conviction sealed or pardoned.', test: (s) => (s.legal?.record ?? []).some((r) => (r.sealed && !r.spent) || r.pardoned) },
};

/* ------------------------------------------------------------------ */
/* Challenges                                                          */
/* ------------------------------------------------------------------ */

/** Each: won(state) → true when achieved; lost(state) → a reason once it can no longer be won. */
export const CHALLENGES = {
  selfMade: { name: 'Self-Made', icon: '💰', desc: 'Reach a $1M net worth by age 50.', won: (s) => netWorth(s) >= 1e6, lost: (s) => (s.character.age > 50 ? 'Turned 51 short of a million' : null) },
  publicServant: { name: 'Public Servant', icon: '🏛️', desc: 'Rise to head a government agency or service.', won: (s) => headedOrg(s, true), lost: () => null },
  cleanHands: { name: 'Clean Hands', icon: '🕊️', desc: 'Reach 70 without a criminal conviction.', won: (s) => s.character.age >= 70, lost: (s) => ((s.legal?.record ?? []).some((r) => ['misdemeanor', 'felony'].includes(r.severity)) ? 'Convicted of a crime' : null) },
  globetrotter: { name: 'Globetrotter', icon: '🌍', desc: 'Live in four different countries.', won: (s) => countriesLived(s).size >= 4, lost: () => null },
  statesman: { name: 'Statesman', icon: '🗳️', desc: 'Become head of government or state.', won: (s) => topOfficeLevel(s) >= 5, lost: () => null },
  warHero: { name: 'War Hero', icon: '🎖️', desc: 'Serve a combat tour and earn five honours.', won: (s) => tours(s).some((t) => (t.combatTours ?? 0) > 0) && honors(s).length >= 5, lost: () => null },
  dynasty: { name: 'Dynasty', icon: '👑', desc: 'Raise three children and live to meet a grandchild.', won: (s) => people(s).filter((p) => p.relation === 'child').length >= 3 && people(s).some((p) => p.relation === 'grandchild'), lost: () => null },
  centenarian: { name: 'Century', icon: '💯', desc: 'Live to 100.', won: (s) => s.character.age >= 100, lost: () => null },
};

/* ------------------------------------------------------------------ */
/* Hall of Fame (kept in storage across lives)                         */
/* ------------------------------------------------------------------ */

const HOF_KEY = 'lifesim.hallOfFame';
const TROPHY_KEY = 'lifesim.trophies';
let store = null;
const read = (key, fallback) => store?.read?.(key) ?? fallback;
const write = (key, value) => store?.write?.(key, value);

export const hallOfFame = () => read(HOF_KEY, []);
export const trophies = () => read(TROPHY_KEY, {});

export const achievementPoints = (s) => Object.keys(s.achievements ?? {}).reduce((n, id) => n + (POINTS[ACHIEVEMENTS[id]?.tier] ?? 0), 0);
/** A life's score: achievements, fortune (capped) and standing. */
export function lifeScore(s) {
  const wealth = Math.min(400, Math.max(0, Math.round(netWorth(s) / 25000)));
  return achievementPoints(s) + wealth + Math.min(300, prestige(s)) + (s.challenge?.status === 'won' ? 100 : 0);
}

function enshrine(state) {
  const c = state.character;
  const peak = jobsOf(state).sort((a, b) => (b.peakGrade ?? 0) - (a.peakGrade ?? 0))[0];
  const entry = {
    name: fullName(state), countryId: c.countryId ?? 'US', born: c.birthYear, died: currentYear(state), age: c.age, cause: c.causeOfDeath ?? '—',
    netWorth: Math.round(netWorth(state)), peak: peak?.title ?? null, achievements: Object.keys(state.achievements ?? {}).length,
    challenge: state.challenge ? { id: state.challenge.id, status: state.challenge.status } : null, score: lifeScore(state),
  };
  const list = [...hallOfFame(), entry].sort((a, b) => b.score - a.score).slice(0, 100);
  write(HOF_KEY, list);
  return list.indexOf(entry) + 1;
}

/** Where this (ended) life ranks in the Hall of Fame. */
export const hallRank = (state) => state.hallOfFame?.rank ?? null;

/* ------------------------------------------------------------------ */
/* The yearly check                                                    */
/* ------------------------------------------------------------------ */

function check(ctx) {
  const { state } = ctx;
  state.achievements ??= {};
  const unlocked = [];
  for (const [id, a] of Object.entries(ACHIEVEMENTS)) {
    if (state.achievements[id] != null) continue;
    let ok = false;
    try { ok = a.test(state); } catch { ok = false; }
    if (!ok) continue;
    state.achievements[id] = state.character.age;
    unlocked.push(a);
    const all = trophies();
    all[id] = { first: all[id]?.first ?? fullName(state), count: (all[id]?.count ?? 0) + 1 };
    write(TROPHY_KEY, all);
  }
  for (const a of unlocked) {
    ctx.log(`Achievement unlocked: ${a.icon} ${a.name} — ${a.desc}`, '🏆', 'milestone');
    ctx.toast(`🏆 ${a.name}`, 'honor');
  }
  const ch = state.challenge;
  const def = ch && CHALLENGES[ch.id];
  if (def && ch.status === 'active') {
    if (def.won(state)) {
      Object.assign(ch, { status: 'won', at: state.character.age });
      ctx.log(`Challenge complete: ${def.icon} ${def.name}!`, '🏆', 'milestone');
      ctx.toast(`🏆 Challenge won: ${def.name}`, 'honor');
    } else {
      const reason = def.lost(state);
      if (reason) {
        Object.assign(ch, { status: 'failed', at: state.character.age, reason });
        ctx.log(`Challenge failed: ${def.name} — ${reason}.`, '💔', 'bad');
      }
    }
  }
}

export const AchievementsModule = {
  id: 'achievements',
  order: 99,

  init(state) {
    state.achievements ??= {};
    state.challenge ??= null;
    if (state.challenge && !CHALLENGES[state.challenge.id]) state.challenge = null;
  },

  setup(engine) {
    store = engine.store;
    engine.bus.on('life:ended', ({ ctx }) => {
      const { state } = ctx;
      check(ctx);
      if (state.challenge?.status === 'active') Object.assign(state.challenge, { status: 'failed', at: state.character.age, reason: 'Ran out of life' });
      if (!state.hallOfFame) state.hallOfFame = { rank: enshrine(state), score: lifeScore(state) };
    });
  },

  onYearEnd(ctx) {
    if (ctx.state.character.alive) check(ctx);
  },
};

export const countryFlag = (cc) => COUNTRIES[cc]?.flag ?? '🇺🇸';
