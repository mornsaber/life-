/**
 * Running a research lab — and what your institution lets you do.
 *
 *   Institutions  R1 research universities support big labs and Ph.D.
 *                 students; R2 doctoral universities smaller ones; teaching
 *                 colleges only undergraduate researchers; community
 *                 colleges no lab at all. Research institutes and national
 *                 labs run on postdocs and staff scientists (no Ph.D.
 *                 programs). Academic physicians run modest labs.
 *   The lab       A startup package when you're hired, then grants. You hire
 *                 Ph.D. students (recruited at admissions weekend), postdocs,
 *                 master's students, technicians, staff scientists and
 *                 undergraduates. Everyone costs money every year; everyone
 *                 has skill and morale; together they publish (with you as
 *                 senior author). Students defend and go on to postdocs,
 *                 faculty jobs or industry; postdocs move on after a few
 *                 years. Run out of money and people have to go.
 *   Running it    Lab culture, mentoring, letting people go, buying out a
 *                 course with grant money, thesis committees — and the
 *                 events of lab life: burnout, offers, poaching, broken
 *                 equipment, a breakthrough, and the student whose data
 *                 looks too good.
 *   Awards        Best-paper awards, Sloan and Packard fellowships, the
 *                 Presidential Early Career Award, teaching and mentoring
 *                 awards, honorary doctorates, the National Medal of
 *                 Science, the Breakthrough Prize, the Wolf Prize and the
 *                 Pulitzer Prize in History.
 *
 * state.lab = { active, funds, members: [...], alumni: [...], culture, tier, startedAge, buyout }
 */
import { clamp } from '../../core/Random.js';
import { randomName, addHonor, yearlyCount, bumpYearly } from '../../core/State.js';

export const TIERS = {
  r1: { name: 'R1 research university', icon: '🏛️', maxLab: 14, roles: ['phd', 'postdoc', 'masters', 'tech', 'staff', 'undergrad'], startup: 900000, teaching: 2, desc: 'Big labs, Ph.D. students, light teaching.' },
  r2: { name: 'R2 doctoral university', icon: '🎓', maxLab: 7, roles: ['phd', 'masters', 'postdoc', 'tech', 'undergrad'], startup: 350000, teaching: 4, desc: 'Smaller labs; Ph.D. and master\'s students.' },
  teaching: { name: 'Teaching college', icon: '🏫', maxLab: 3, roles: ['undergrad'], startup: 60000, teaching: 6, desc: 'Undergraduate researchers only; teaching comes first.' },
  cc: { name: 'Community college', icon: '🏫', maxLab: 0, roles: [], startup: 0, teaching: 10, desc: 'A teaching job: no research lab.' },
  institute: { name: 'Research institute', icon: '🔬', maxLab: 16, roles: ['postdoc', 'tech', 'staff', 'undergrad'], startup: 1500000, teaching: 0, desc: 'No teaching and no students; postdocs and staff scientists.' },
  natlab: { name: 'National laboratory', icon: '⚛️', maxLab: 12, roles: ['postdoc', 'tech', 'staff'], startup: 0, program: 600000, teaching: 0, desc: 'Steady DOE program funding; no students.' },
  medical: { name: 'Academic medical center', icon: '🏥', maxLab: 6, roles: ['phd', 'postdoc', 'tech', 'undergrad'], startup: 400000, teaching: 0, desc: 'A physician-scientist\'s lab between clinics.' },
};

export const ROLES = {
  phd: { name: 'Ph.D. student', icon: '🎓', cost: 55000, output: 0.33, desc: 'Stipend and tuition; five or six years to train.' },
  postdoc: { name: 'Postdoc', icon: '🧪', cost: 72000, output: 0.6, desc: 'Experienced and productive; moves on in a few years.' },
  masters: { name: 'Master\'s student', icon: '📘', cost: 30000, output: 0.18, desc: 'Two years, a thesis, a paper if you\'re lucky.' },
  tech: { name: 'Lab technician', icon: '🧫', cost: 55000, output: 0.15, desc: 'Keeps the lab running; makes everyone else faster.' },
  staff: { name: 'Staff scientist', icon: '👩‍🔬', cost: 98000, output: 0.5, desc: 'A permanent senior researcher.' },
  undergrad: { name: 'Undergraduate researcher', icon: '🎒', cost: 4000, output: 0.04, desc: 'Cheap, eager, occasionally brilliant.' },
};

export const CULTURES = {
  supportive: { name: 'Supportive', icon: '🫶', output: 1.0, morale: 4, desc: 'People stay, grow and recommend your lab.' },
  demanding: { name: 'Demanding', icon: '🔥', output: 1.25, morale: -6, desc: 'More papers; more burnout and departures.' },
  handsOff: { name: 'Hands-off', icon: '🪁', output: 0.85, morale: 0, desc: 'Independence for them, writing time for you.' },
};

const LAB_LEVELS = {
  university: ['assistant', 'associate', 'professor', 'distinguished', 'chair', 'dean'],
  college: ['assistant', 'associate', 'professor', 'endowed', 'university', 'chair', 'dean'],
  research: ['pi', 'director', 'fellow'],
  nationalLab: ['group', 'division', 'distinguished', 'senior'],
  medical: ['attending', 'senior', 'renowned', 'head', 'chief'],
};

/** What kind of institution your job is at. */
export function tierOf(state, job = state.career.job) {
  if (!job) return null;
  switch (job.professionId) {
    case 'university': return ['large', 'enterprise'].includes(job.employer.size) ? 'r1' : 'r2';
    case 'college': return { large: 'r1', enterprise: 'r1', medium: 'r2' }[job.employer.size] ?? 'teaching';
    case 'communityCollege': return 'cc';
    case 'research': return 'institute';
    case 'nationalLab': return 'natlab';
    case 'medical': return state.medicine?.practice === 'academic' ? 'medical' : null;
    default: return null;
  }
}

export function canRunLab(state, job = state.career.job) {
  const tier = tierOf(state, job);
  if (!tier || !TIERS[tier].maxLab) return { ok: false, reason: tier ? TIERS[tier].desc : 'Faculty and principal investigators run labs' };
  if (!LAB_LEVELS[job.professionId]?.includes(job.levelId)) return { ok: false, reason: 'Principal investigators only (assistant professor, PI, group leader…)' };
  return { ok: true, tier };
}

const lab = (state) => state.lab;
const annualCost = (l) => l.members.reduce((sum, m) => sum + (m.ta ? 0 : ROLES[m.role].cost), 0);

/* ------------------------------------------------------------------ */
/* Founding, hiring and letting go                                     */
/* ------------------------------------------------------------------ */

function newMember(rng, role, quality = 0) {
  const gender = rng.pick(['male', 'female']);
  const n = randomName(rng, gender);
  return { id: rng.id('lm_'), name: `${n.firstName} ${n.lastName}`, gender, role, skill: Math.round(clamp(rng.int(45, 80) + quality, 20, 99)), morale: rng.int(60, 80), years: 0, papers: 0 };
}

function foundLab(ctx, tier) {
  const { state } = ctx;
  const t = TIERS[tier];
  const old = lab(state);
  if (old?.active) {
    // Moving: the lab comes with you, minus anyone the new place can't take.
    const leaving = old.members.filter((m) => !t.roles.includes(m.role));
    old.members = old.members.filter((m) => t.roles.includes(m.role)).slice(0, t.maxLab);
    old.funds += t.startup;
    old.tier = tier;
    ctx.log(`You moved your lab${leaving.length ? `; ${leaving.length} member${leaving.length > 1 ? 's' : ''} couldn't come along` : ''}. New startup package: $${t.startup.toLocaleString()}.`, '🚚', 'milestone');
    return;
  }
  state.lab = { active: true, funds: t.startup, members: [], alumni: old?.alumni ?? [], culture: 'supportive', tier, startedAge: state.character.age, buyout: false };
  ctx.log(t.startup ? `You opened your own lab with a $${t.startup.toLocaleString()} startup package. Empty benches, new equipment, and the smell of fresh paint.` : 'You took over a research group with steady program funding.', '🔬', 'milestone');
}

function closeLab(ctx, why) {
  const { state } = ctx;
  const l = lab(state);
  if (!l?.active) return;
  for (const m of l.members) l.alumni.push({ name: m.name, role: m.role, outcome: m.role === 'phd' ? 'moved to another lab' : 'found another job', age: state.character.age });
  l.active = false;
  l.members = [];
  l.funds = 0;
  ctx.log(`${why} Your lab closed; its people scattered to other groups.`, '📦', 'warn');
}

export function hireEligibility(state, role) {
  const job = state.career.job;
  const check = canRunLab(state, job);
  if (!check.ok) return check;
  const l = lab(state);
  const t = TIERS[check.tier];
  if (!l?.active) return { ok: false, reason: 'No lab yet' };
  if (!t.roles.includes(role)) return { ok: false, reason: role === 'phd' ? `${t.name}s have no Ph.D. program` : `Not offered at your ${t.name}` };
  if (l.members.length >= t.maxLab) return { ok: false, reason: `Your institution has space for ${t.maxLab}` };
  if (l.funds < ROLES[role].cost) return { ok: false, reason: `Needs $${ROLES[role].cost.toLocaleString()} a year in lab funds` };
  if (yearlyCount(state, `lab.hire.${role}`) >= (role === 'undergrad' ? 3 : 2)) return { ok: false, reason: 'Hiring season is over' };
  if (role === 'phd' && state.prompts.some((p) => p.type === 'lab.recruit')) return { ok: false, reason: 'Admissions weekend is under way' };
  return { ok: true };
}

/** Reputation: how attractive your lab is to applicants. */
export const labReputation = (state) => (state.science?.hIndex ?? 0) + (lab(state)?.alumni ?? []).filter((a) => a.outcome === 'a faculty job').length * 4 + (state.science?.topPapers ?? 0) * 3;

function hire(ctx, role) {
  const { state, rng } = ctx;
  const check = hireEligibility(state, role);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  bumpYearly(state, `lab.hire.${role}`);
  const rep = labReputation(state);
  const tierBoost = { r1: 6, institute: 6, natlab: 4, medical: 3, r2: 0, teaching: -6 }[lab(state).tier] ?? 0;
  if (role === 'phd') {
    // Admissions weekend: three students who rotated through your lab.
    const candidates = [0, 1, 2].map(() => newMember(rng, 'phd', rep / 6 + tierBoost));
    candidates[0].trait = 'brilliant but prickly';
    candidates[0].skill = Math.min(99, candidates[0].skill + 10);
    candidates[0].morale -= 15;
    candidates[1].trait = 'steady and kind';
    candidates[1].morale += 10;
    candidates[2].trait = 'came with an NSF fellowship';
    candidates[2].fellowship = 3;
    ctx.prompt({
      type: 'lab.recruit',
      icon: '🎓',
      title: 'Admissions Weekend',
      text: 'Three first-year students finished rotations in your lab and want to join. You have funding for one.',
      options: [...candidates.map((c, i) => ({ id: String(i), label: `${c.name}: ${c.trait}`, hint: `skill ${c.skill}${c.fellowship ? ' · fellowship pays 3 years' : ''}` })), { id: 'none', label: '🙅 Don\'t take a student this year' }],
      data: { candidates },
    });
    return;
  }
  const m = newMember(rng, role, rep / 8 + tierBoost);
  lab(state).members.push(m);
  ctx.log(`You hired ${m.name} as a ${ROLES[role].name.toLowerCase()} (skill ${m.skill}).`, ROLES[role].icon, 'good');
}

/* ------------------------------------------------------------------ */
/* The year in the lab                                                 */
/* ------------------------------------------------------------------ */

const OUTCOMES = { phd: [['a postdoc', 0.4], ['industry', 0.4], ['a faculty job', 0.2]], postdoc: [['a faculty job', 0.3], ['industry', 0.5], ['another postdoc', 0.2]], masters: [['industry', 0.7], ['a Ph.D. program', 0.3]] };

function pickOutcome(rng, role, rep) {
  const table = OUTCOMES[role] ?? [['another job', 1]];
  const faculty = Math.min(0.25, rep / 200);
  return rng.weighted(table.map(([o, w]) => [o, o === 'a faculty job' ? w + faculty : w]), ([, w]) => w)[0];
}

function labTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const l = lab(state);
  const check = canRunLab(state, job);
  // Starting, moving or closing.
  if (check.ok && (!l?.active || l.tier !== check.tier)) foundLab(ctx, check.tier);
  if (!check.ok) {
    if (l?.active) closeLab(ctx, job ? 'You left principal-investigator work.' : 'You left your position.');
    return;
  }
  const L = lab(state);
  const t = TIERS[L.tier];
  const s = state.science;
  // Money in: grants and program funding.
  if (s.grant) L.funds += s.grant.amount;
  if (t.program) L.funds += t.program;
  // Money out: salaries. Short? Bridge funding once, then layoffs (Ph.D. students move to TA lines).
  for (const m of L.members) if (m.fellowship > 0) m.fellowship -= 1;
  let cost = L.members.reduce((sum, m) => sum + (m.fellowship > 0 || m.ta ? 0 : ROLES[m.role].cost), 0);
  if (cost > L.funds && !L.bridged && ['r1', 'r2', 'medical'].includes(L.tier)) {
    L.bridged = true;
    L.funds += Math.round(cost * 0.5);
    ctx.log('Your department gave you a year of bridge funding to keep the lab afloat between grants.', '🌉', 'warn');
  }
  while (cost > L.funds && L.members.some((m) => !m.ta)) {
    const cut = [...L.members].filter((m) => !m.ta).sort((a, b) => (a.role === 'phd') - (b.role === 'phd') || ROLES[b.role].cost - ROLES[a.role].cost)[0];
    if (cut.role === 'phd' && ['r1', 'r2', 'medical'].includes(L.tier)) {
      cut.ta = true;
      ctx.log(`${cut.name} had to teach sections to pay their stipend — less time for research.`, '🧑‍🏫', 'warn');
    } else {
      L.members = L.members.filter((m) => m !== cut);
      L.alumni.push({ name: cut.name, role: cut.role, outcome: 'laid off', age: state.character.age });
      ctx.log(`Out of money: you had to let ${cut.name} (${ROLES[cut.role].name.toLowerCase()}) go.`, '📉', 'bad');
    }
    cost = L.members.reduce((sum, m) => sum + (m.fellowship > 0 || m.ta ? 0 : ROLES[m.role].cost), 0);
  }
  L.funds = Math.max(0, L.funds - cost);
  // Work and papers.
  const c = CULTURES[L.culture];
  const techs = L.members.filter((m) => m.role === 'tech').length;
  let papers = 0;
  for (const m of L.members) {
    m.years += 1;
    m.morale = Math.round(clamp(m.morale + c.morale + rng.int(-6, 6) - (m.ta ? 3 : 0), 0, 100));
    m.skill = Math.min(99, m.skill + (m.role === 'phd' || m.role === 'masters' || m.role === 'undergrad' ? rng.int(2, 6) : 1));
    const ramp = m.role === 'phd' && m.years <= 1 ? 0.3 : 1;
    const p = ROLES[m.role].output * (m.skill / 70) * (0.5 + m.morale / 140) * c.output * ramp * (1 + Math.min(0.3, techs * 0.1)) * (m.ta ? 0.6 : 1);
    if (rng.chance(clamp(p, 0, 0.95))) {
      m.papers += 1;
      papers += 1;
      if (m.skill >= 85 && rng.chance(0.08)) {
        s.topPapers = (s.topPapers ?? 0) + 1;
        s.citations = (s.citations ?? 0) + rng.int(100, 300);
        ctx.log(`${m.name}'s project became a paper in a top journal — your lab's biggest result yet.`, '🌟', 'milestone');
        if (rng.chance(0.3)) award(ctx, 'bestPaper');
      }
    }
  }
  if (papers) {
    s.papers += papers;
    s.citations = (s.citations ?? 0) + papers * rng.int(5, 15);
    ctx.log(`Your lab published ${papers} paper${papers > 1 ? 's' : ''} this year.`, '🔬', 'good');
  }
  // Comings and goings.
  for (const m of [...L.members]) {
    let leave = null;
    if (m.role === 'phd' && ((m.years >= 5 && m.papers >= 2) || (m.years >= 6 && m.papers >= 1) || m.years >= 7)) leave = 'defended';
    else if (m.role === 'masters' && m.years >= 2) leave = 'graduated';
    else if (m.role === 'postdoc' && m.years >= rng.int(2, 4)) leave = 'moved on';
    else if (m.role === 'undergrad' && m.years >= 2) leave = 'graduated';
    else if (m.morale < 25 && rng.chance(0.4)) leave = 'quit';
    else if (m.role === 'phd' && rng.chance(0.03)) leave = 'quit';
    if (!leave) continue;
    L.members = L.members.filter((x) => x !== m);
    const outcome = leave === 'quit' ? (m.role === 'phd' ? 'left the program' : 'quit') : m.role === 'undergrad' ? rng.pick(['a Ph.D. program', 'medical school', 'industry']) : pickOutcome(rng, m.role, labReputation(state));
    L.alumni.push({ name: m.name, role: m.role, outcome, age: state.character.age });
    if (leave === 'defended') {
      s.students = (s.students ?? 0) + 1;
      ctx.log(`${m.name} defended their dissertation — your ${ordinal(s.students)} Ph.D. student — and left for ${outcome}.`, '🎓', 'good');
      ctx.stat('happiness', 4);
    } else if (leave === 'quit') ctx.log(`${m.name} ${m.role === 'phd' ? 'left the Ph.D. program' : 'quit your lab'}.${m.morale < 25 ? ' They were miserable.' : ''}`, '🚪', 'warn');
    else if (m.role !== 'undergrad') ctx.log(`${m.name} (${ROLES[m.role].name.toLowerCase()}) left for ${outcome}.`, ROLES[m.role].icon);
  }
  if (L.alumni.length > 60) L.alumni = L.alumni.slice(-60);
  // Lab life.
  if (L.members.length && rng.chance(0.3)) labEvent(ctx, L);
  L.buyout = false;
}

const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;

const EVENTS = [
  { id: 'burnout', icon: '🌧️', title: 'A Student Is Struggling', text: (m) => `${m.name} has stopped coming to lab meeting. A labmate quietly tells you they're not okay.`, options: [{ id: 'talk', label: '🫂 Talk privately and adjust their workload' }, { id: 'push', label: '📅 Remind them about deadlines' }] },
  { id: 'offer', icon: '💼', title: 'An Offer', text: (m) => `${m.name} has an offer from a big tech company at three times their current pay — and asks what you think.`, options: [{ id: 'blessing', label: '🙌 Give them your blessing' }, { id: 'counter', label: '💵 Find money to keep them', hint: '$20,000 from lab funds' }] },
  { id: 'equipment', icon: '🛠️', title: 'Equipment Failure', text: () => 'The lab\'s most important instrument died. A replacement costs $120,000.', options: [{ id: 'buy', label: '💳 Buy a new one from lab funds' }, { id: 'share', label: '🤝 Borrow time on a colleague\'s', hint: 'Slower year' }] },
  { id: 'collab', icon: '🌐', title: 'A Collaboration', text: () => 'A famous lab overseas proposes a joint project — your methods, their samples.', options: [{ id: 'yes', label: '🤝 Say yes' }, { id: 'no', label: '🙅 Stay focused' }] },
  { id: 'fraud', icon: '🔍', title: 'Too Good to Be True', text: (m) => `${m.name}'s new results are spectacular, and the error bars are suspiciously small.`, options: [{ id: 'audit', label: '🔍 Ask to see the raw data' }, { id: 'trust', label: '🚀 Trust them and submit' }] },
  { id: 'poach', icon: '🎣', title: 'Poaching', text: (m) => `A rival professor is trying to lure ${m.name} into their lab.`, options: [{ id: 'fight', label: '💬 Make the case for staying' }, { id: 'let', label: '🤷 Let them choose' }] },
];

function labEvent(ctx, L) {
  const { rng } = ctx;
  const e = rng.pick(EVENTS);
  const m = rng.pick(L.members);
  if (ctx.state.prompts.some((p) => p.type === 'lab.event')) return;
  ctx.prompt({ type: 'lab.event', icon: e.icon, title: e.title, text: e.text(m), options: e.options, data: { eventId: e.id, memberId: m.id } });
}

/* ------------------------------------------------------------------ */
/* Awards                                                              */
/* ------------------------------------------------------------------ */

export const AWARDS = {
  bestPaper: { name: 'Best Paper Award', icon: '📄', prestige: 3, repeat: true, citation: 'For the year\'s best paper at your field\'s top venue.' },
  sloan: { name: 'Sloan Research Fellowship', icon: '🌱', prestige: 8, cash: 75000, citation: 'Awarded to early-career scientists of outstanding promise.' },
  packard: { name: 'Packard Fellowship', icon: '🚀', prestige: 14, cash: 175000, citation: '$875,000 over five years to pursue risky ideas.' },
  pecase: { name: 'Presidential Early Career Award for Scientists and Engineers', icon: '🇺🇸', prestige: 12, citation: 'The U.S. government\'s highest honor for early-career researchers.' },
  teaching: { name: 'Distinguished Teaching Award', icon: '🍎', prestige: 5, citation: 'Voted by students and colleagues.' },
  mentoring: { name: 'Graduate Mentoring Award', icon: '🫶', prestige: 6, citation: 'For training a generation of scientists.' },
  honorary: { name: 'Honorary Doctorate', icon: '🎓', prestige: 8, repeat: true, citation: 'Conferred at commencement by another university.' },
  medalOfScience: { name: 'National Medal of Science', icon: '🏅', prestige: 40, citation: 'Presented by the President at the White House.' },
  breakthrough: { name: 'Breakthrough Prize', icon: '💫', prestige: 45, cash: 3000000, citation: 'Science\'s richest prize: $3 million.' },
  wolf: { name: 'Wolf Prize', icon: '🐺', prestige: 30, cash: 100000, citation: 'Often a prelude to Stockholm.' },
  pulitzer: { name: 'Pulitzer Prize in History', icon: '📖', prestige: 35, cash: 15000, citation: 'For a distinguished book on American history.' },
};

function award(ctx, id) {
  const { state } = ctx;
  const a = AWARDS[id];
  if (!a.repeat && state.honors.some((h) => h.id === `research.${id}`)) return;
  addHonor(state, { id: `research.${id}`, source: 'civil', name: a.name, icon: a.icon, prestige: a.prestige, precedence: 32, citation: a.citation });
  if (a.cash) ctx.earn(a.cash, a.name);
  ctx.log(`${a.name}! ${a.citation}`, a.icon, 'honor');
  ctx.stat('happiness', 8);
}

function awardsTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const s = state.science;
  if (!job || !s) return;
  const h = s.hIndex ?? 0;
  const age = state.character.age;
  const early = ['assistant', 'pi', 'group', 'staff', 'attending'].includes(job.levelId) || age < 42;
  const humanist = ['history', 'english'].includes(state.education.degrees.find((d) => d.programId === 'phd')?.major);
  const roll = (p) => rng.chance(p);
  if (early && h >= 6 && roll(0.08)) award(ctx, 'sloan');
  if (early && h >= 8 && roll(0.02)) award(ctx, 'packard');
  if (early && s.grant && h >= 6 && roll(0.025)) award(ctx, 'pecase');
  if ((job.teaching ?? 0) >= 85 && roll(0.08)) award(ctx, 'teaching');
  if ((s.students ?? 0) >= 6 && roll(0.06)) award(ctx, 'mentoring');
  if (h >= 30 && roll(0.04)) award(ctx, 'honorary');
  if (h >= 45 && roll(0.012)) award(ctx, 'medalOfScience');
  if (h >= 55 && ['biology', 'physics', 'mathematics', 'chemistry'].includes(state.education.degrees.find((d) => d.programId === 'phd')?.major) && roll(0.005)) award(ctx, 'breakthrough');
  if (h >= 45 && roll(0.006)) award(ctx, 'wolf');
  if (humanist && (s.books ?? 0) >= 2 && roll(0.012)) award(ctx, 'pulitzer');
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const member = (state, id) => lab(state)?.members.find((m) => m.id === id);

export const LabModule = {
  id: 'lab',
  order: 31.35, // after the career and academia ticks, before publishing reviews
  init(state) {
    state.lab ??= null;
  },
  setup(engine) {
    // A new PI opens (or moves) a lab on arrival.
    engine.bus.on('career:hired', ({ ctx }) => {
      const check = canRunLab(ctx.state);
      const l = lab(ctx.state);
      if (check.ok && (!l?.active || l.tier !== check.tier)) foundLab(ctx, check.tier);
    });
  },
  onAgeUp(ctx) {
    if (ctx.state.legal.incarceration) return;
    labTick(ctx);
    if (ctx.state.career.job?.paidThisYear) awardsTick(ctx);
  },
  actions: {
    hire: (ctx, role) => hire(ctx, role),
    letGo(ctx, id) {
      const { state } = ctx;
      const m = member(state, id);
      if (!m) return;
      const l = lab(state);
      l.members = l.members.filter((x) => x !== m);
      l.alumni.push({ name: m.name, role: m.role, outcome: m.role === 'phd' ? 'moved to another lab' : 'let go', age: state.character.age });
      for (const x of l.members) x.morale = Math.max(0, x.morale - 4);
      ctx.log(`You let ${m.name} go. The lab was quiet for a week.`, '🚪', 'warn');
    },
    mentor(ctx, id) {
      const { state } = ctx;
      const m = member(state, id);
      if (!m) return;
      if (yearlyCount(state, 'lab.mentor') >= 2) return ctx.toast('Two mentoring sessions a year', 'warn');
      bumpYearly(state, 'lab.mentor');
      m.skill = Math.min(99, m.skill + 5);
      m.morale = Math.min(100, m.morale + 10);
      ctx.stat('stress', 1);
      ctx.log(`You spent real time with ${m.name}: a project reset, career advice, and a plan.`, '🧭', 'good');
    },
    culture(ctx, id) {
      const l = lab(ctx.state);
      if (!l?.active || !CULTURES[id]) return;
      l.culture = id;
      ctx.log(`You set the tone for your lab: ${CULTURES[id].name.toLowerCase()}. ${CULTURES[id].desc}`, CULTURES[id].icon);
    },
    buyout(ctx) {
      const { state } = ctx;
      const l = lab(state);
      if (!l?.active || !['r1', 'r2', 'teaching', 'medical'].includes(l.tier)) return ctx.toast('Faculty with a teaching load', 'warn');
      if (l.buyout || yearlyCount(state, 'lab.buyout')) return ctx.toast('Once a year', 'warn');
      if (l.funds < 25000) return ctx.toast('Needs $25,000 in lab funds', 'warn');
      bumpYearly(state, 'lab.buyout');
      l.funds -= 25000;
      l.buyout = true;
      ctx.log('You bought out a course with grant money: one less class to teach, one more paper to write.', '📚', 'good');
    },
    committee(ctx) {
      const { state } = ctx;
      if (!lab(state)?.active) return;
      if (yearlyCount(state, 'lab.committee')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'lab.committee');
      ctx.stat('stress', 2);
      if (state.career.job) state.career.job.performance = Math.min(100, state.career.job.performance + 2);
      ctx.log(ctx.rng.pick(['You sat on three dissertation committees and asked the hard question at every defense.', 'You served on a thesis committee in another department and learned something.']), '🎓');
    },
  },
  resolvers: {
    recruit(ctx, data, optionId) {
      const { state } = ctx;
      const l = lab(state);
      const c = data.candidates?.[Number(optionId)];
      if (!l?.active || !c) return ctx.log('You didn\'t take a student this year.', '🙅');
      l.members.push(c);
      ctx.log(`${c.name} joined your lab as a Ph.D. student.`, '🎓', 'good');
    },
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const l = lab(state);
      const m = member(state, data.memberId);
      if (!l?.active) return;
      switch (`${data.eventId}.${optionId}`) {
        case 'burnout.talk': if (m) { m.morale = Math.min(100, m.morale + 20); } ctx.log(`${m?.name ?? 'Your student'} took two weeks off and came back steadier.`, '🫂', 'good'); break;
        case 'burnout.push': if (m) m.morale = Math.max(0, m.morale - 15); ctx.log('The reminder landed badly.', '📅', 'warn'); break;
        case 'offer.blessing': if (m) { l.members = l.members.filter((x) => x !== m); l.alumni.push({ name: m.name, role: m.role, outcome: 'industry', age: state.character.age }); } ctx.log(`${m?.name ?? 'They'} took the job — and still sends you a holiday card.`, '🙌'); break;
        case 'offer.counter': if (l.funds >= 20000 && m) { l.funds -= 20000; m.morale = Math.min(100, m.morale + 10); ctx.log(`You found money to keep ${m.name}.`, '💵', 'good'); } else ctx.log('There was no money to counter with.', '💵', 'warn'); break;
        case 'equipment.buy': l.funds = Math.max(0, l.funds - 120000); ctx.log('The new instrument arrived in six weeks.', '🛠️'); break;
        case 'equipment.share': for (const x of l.members) x.morale = Math.max(0, x.morale - 5); ctx.log('Nights and weekends on a borrowed machine.', '🤝'); break;
        case 'collab.yes': state.science.papers += 1; state.science.citations = (state.science.citations ?? 0) + rng.int(20, 60); ctx.log('The collaboration produced a high-profile joint paper.', '🌐', 'good'); break;
        case 'fraud.audit': if (rng.chance(0.4) && m) { l.members = l.members.filter((x) => x !== m); l.alumni.push({ name: m.name, role: m.role, outcome: 'dismissed for misconduct', age: state.character.age }); ctx.log(`The raw data didn't match. ${m.name} was dismissed — and your lab never published a word of it.`, '🔍', 'warn'); } else ctx.log('The raw data checked out. The results were real.', '🔍', 'good'); break;
        case 'fraud.trust': if (rng.chance(0.35)) { state.academia.fabricated = true; ctx.log('The paper came out. You told yourself the data must be fine.', '🚀', 'warn'); } else { state.science.papers += 1; ctx.log('The paper came out, and the result held up.', '🚀', 'good'); } break;
        case 'poach.fight': if (m) m.morale = Math.min(100, m.morale + 12); ctx.log(`${m?.name ?? 'They'} stayed.`, '💬', 'good'); break;
        case 'poach.let': if (m && rng.chance(0.5)) { l.members = l.members.filter((x) => x !== m); l.alumni.push({ name: m.name, role: m.role, outcome: 'moved to another lab', age: state.character.age }); ctx.log(`${m.name} moved to the rival lab.`, '🎣', 'warn'); } else ctx.log('They decided to stay.', '🤷'); break;
        default: ctx.log('Lab life went on.', '🔬');
      }
    },
  },
};

