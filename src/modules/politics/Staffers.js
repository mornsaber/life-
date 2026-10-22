/**
 * Political staff, both ways round.
 *
 * Your office (as a lawmaker): staff are hired from a shortlist — each with a
 * background, a skill and a salary the office budget pays — and they're people:
 * they get better, get poached by lobbying firms, and now and then land you in
 * the papers. Titles follow the system (a Westminster MP has an office manager
 * and a caseworker, not a legislative director). Peers and bishops in the Lords
 * have no staff budget at all.
 *
 * Your job (as a staffer): you work for a named member, in their office. Their
 * fortunes are yours: if they lose their seat or retire, the office closes and
 * you need another member, a committee — or a lobbying firm.
 *
 * Shortlists come through `staffers.shortlist` (role) → prompt `staffers.hire`.
 */
import { STAFF_ROLES, mySeat, BODY_DEFS, staffPlan } from './Legislature.js';
import { OFFICES } from './Offices.js';
import { LEGISLATURES } from './NationalOffices.js';
import { randomName, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';

const WESTMINSTER = ['GB', 'AU', 'NZ', 'CA', 'IE'];
/** Local titles: a Westminster MP has an office manager and caseworkers, a state legislator a district aide. */
const TITLES = {
  westminster: { chiefOfStaff: 'Office Manager', legislativeDirector: 'Senior Parliamentary Researcher', researcher: 'Parliamentary Researcher', communications: 'Communications Officer', caseworker: 'Constituency Caseworker', parliamentaryAssistant: 'Parliamentary Assistant', scheduler: 'Diary Secretary' },
  parliament: { legislativeDirector: 'Senior Policy Adviser', researcher: 'Policy Adviser', communications: 'Press Officer', caseworker: 'Constituency Officer', scheduler: 'Office Assistant' },
  usState: { legislativeAssistant: 'Legislative Aide', caseworker: 'District Aide' },
};
/** A staff role's title where you sit. */
export const staffTitle = (role, state) => {
  const cc = state.character.countryId ?? 'US';
  const kind = state.legislature?.seat?.bodyId?.split(':')[0] ?? '';
  const sys = WESTMINSTER.includes(cc) ? 'westminster' : cc !== 'US' ? 'parliament' : ['house', 'senate'].includes(kind) ? 'usState' : null;
  return (sys && TITLES[sys][role]) ?? STAFF_ROLES[role]?.title ?? role;
};
/** The office's positions: [{ role, max, filled }]. */
export const positions = (seat) => staffPlan(seat).map(([role, max]) => ({ role, max, filled: (seat?.staff ?? []).filter((s) => s.role === role).length }));

/** Who applies: background shapes skill, loyalty and risk. */
export const BACKGROUNDS = {
  volunteer: { label: 'a campaign volunteer who knocked doors for you', skill: [40, 65], loyalty: 90, risk: 0.01, pay: 0.8 },
  journalist: { label: 'a former political journalist', skill: [60, 85], loyalty: 55, risk: 0.02, pay: 1.1, likes: 'press' },
  lawyer: { label: 'a lawyer who drafted bills for a think tank', skill: [65, 90], loyalty: 60, risk: 0.01, pay: 1.2, likes: 'policy' },
  apparatchik: { label: 'a party staffer with twenty years in the building', skill: [70, 92], loyalty: 50, risk: 0.02, pay: 1.15, likes: 'chief' },
  lobbyist: { label: 'a former lobbyist with a thick contact book', skill: [70, 95], loyalty: 40, risk: 0.07, pay: 1.3 },
  social: { label: 'a social worker who knows every agency', skill: [55, 85], loyalty: 75, risk: 0.01, pay: 0.9, likes: 'constituency' },
  family: { label: 'your own relative', skill: [30, 60], loyalty: 100, risk: 0.12, pay: 1.0, nepotism: true },
};
const BASE_PAY = 55000;

/** An office's staff budget, in people (none for peers). */
export const staffBudget = (seat) => (seat?.peer ? 0 : BODY_DEFS[seat?.bodyId?.split(':')[0]]?.allowance ?? 1);

function shortlist(ctx, role) {
  const { state, rng } = ctx;
  const seat = mySeat(state);
  if (!seat || !STAFF_ROLES[role]) return undefined;
  if (seat.peer) return ctx.toast('Members of the Lords have no staff budget — you\'d pay out of your own pocket.', 'warn');
  if (seat.staff.length >= staffBudget(seat)) return ctx.toast(`Your office budget covers ${staffBudget(seat)} staff.`, 'warn');
  const pos = positions(seat).find((p) => p.role === role);
  if (!pos) return ctx.toast(`Your office has no ${staffTitle(role, state).toLowerCase()} post.`, 'warn');
  if (pos.filled >= pos.max) return ctx.toast(`Your office has ${pos.max} ${staffTitle(role, state).toLowerCase()} post${pos.max === 1 ? '' : 's'}, all filled.`, 'warn');
  if (yearlyCount(state, 'staffers.shortlist') >= 4) return ctx.toast('Four hiring rounds a year.', 'warn');
  bumpYearly(state, 'staffers.shortlist');
  const ids = Object.keys(BACKGROUNDS).filter((b) => b !== 'family' || state.people.list.some((p) => p.alive && ['sibling', 'child', 'cousin'].includes(p.relation)));
  const picks = rng.shuffle(ids).slice(0, 3).map((b) => {
    const B = BACKGROUNDS[b];
    const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
    const fam = B.nepotism ? state.people.list.find((p) => p.alive && ['sibling', 'child', 'cousin'].includes(p.relation)) : null;
    const skill = rng.int(B.skill[0], B.skill[1]) + (B.likes === STAFF_ROLES[role]?.kind || B.likes === role ? 8 : 0);
    return { bg: b, name: fam ? `${fam.firstName} ${fam.lastName}` : `${n.firstName} ${n.lastName}`, skill: Math.min(99, skill), loyalty: B.loyalty, salary: Math.round(BASE_PAY * B.pay * (0.8 + skill / 250) / 1000) * 1000 };
  });
  ctx.prompt({
    type: 'staffers.hire', icon: '🧑‍💼', title: `Hiring: ${staffTitle(role, state)}`,
    text: 'Three people made the shortlist. The office budget pays their salary; you pay for their mistakes.',
    options: [...picks.map((c, i) => ({ id: `c${i}`, label: `${c.name} — ${BACKGROUNDS[c.bg].label}`, hint: `skill ${c.skill} · $${c.salary.toLocaleString()}/yr${BACKGROUNDS[c.bg].nepotism ? ' · nepotism risk' : ''}` })), { id: 'none', label: 'Keep looking' }],
    data: { role, picks },
  });
  return undefined;
}

/** A year in your office: staff grow, leave and occasionally embarrass you. */
function officeYear(ctx) {
  const { state, rng } = ctx;
  const seat = mySeat(state);
  if (!seat?.staff?.length) return;
  for (const p of [...seat.staff]) {
    p.skill = Math.min(99, (p.skill ?? 60) + rng.int(0, 3));
    p.years = (p.years ?? 0) + 1;
    if (p.skill >= 80 && rng.chance(0.06 + (100 - (p.loyalty ?? 60)) / 1000)) {
      seat.staff = seat.staff.filter((x) => x !== p);
      ctx.log(`${p.name}, your ${staffTitle(p.role, state).toLowerCase()}, left for a lobbying firm at twice the salary.`, '🚪', 'warn');
      continue;
    }
    const risk = BACKGROUNDS[p.bg]?.risk ?? 0.02;
    if (rng.chance(risk) && !state.prompts.some((x) => x.type === 'staffers.scandal')) {
      const what = BACKGROUNDS[p.bg]?.nepotism ? 'The papers found out you put a relative on the public payroll.' : rng.pick(['leaked a draft bill to a reporter', 'was caught taking gifts from a lobbyist', 'posted something indefensible online', 'was accused of bullying junior staff']);
      ctx.prompt({ type: 'staffers.scandal', icon: '📰', title: 'Trouble in Your Office', text: BACKGROUNDS[p.bg]?.nepotism ? what : `${p.name} ${what}.`, options: [{ id: 'fire', label: `🚪 Let ${p.name} go` }, { id: 'stand', label: '🛡️ Stand by them', tone: 'danger' }], data: { id: p.id, nepotism: Boolean(BACKGROUNDS[p.bg]?.nepotism) } });
    }
  }
}

/* ------------------------------------------------------------------ */
/* The staffer's boss                                                  */
/* ------------------------------------------------------------------ */

/** The member a staffer works for: a title, a name and a party. */
function newPrincipal(state, rng) {
  const cc = state.character.countryId ?? 'US';
  const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
  const L = LEGISLATURES[cc];
  const title = cc === 'US' ? rng.pick(['State Senator', 'State Representative', 'Assemblymember']) : (OFFICES[L?.lower?.office]?.name ?? 'Member of Parliament');
  return { name: `${n.firstName} ${n.lastName}`, title, caucus: state.politics?.party?.bloc ?? rng.pick(['labor', 'business']), terms: rng.int(1, 4) };
}
const officeName = (p) => (/^Member/.test(p.title) ? `Office of ${p.name}, ${p.title}` : `Office of ${p.title} ${p.name}`);

function attachPrincipal(ctx, job) {
  if (job?.professionId !== 'legislativeStaff') return;
  job.principal = newPrincipal(ctx.state, ctx.rng);
  job.employer.name = officeName(job.principal);
}

function stafferYear(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (job?.professionId !== 'legislativeStaff') return;
  if (!job.principal) return attachPrincipal(ctx, job);
  const p = job.principal;
  p.terms += 1;
  // Your member's fate: re-election losses and retirements close the office.
  const out = rng.chance(0.08) ? 'lost their seat' : p.terms >= 6 && rng.chance(0.15) ? 'retired' : null;
  if (!out || state.prompts.some((x) => x.type === 'staffers.officeClosed')) return;
  ctx.prompt({
    type: 'staffers.officeClosed', icon: '📦', title: 'The Office Closes',
    text: `${p.title} ${p.name} ${out}. The office closes at the end of the term — and staff go with it.`,
    options: [
      { id: 'another', label: '🤝 Join another member\'s office', hint: 'Same job, new boss' },
      { id: 'committee', label: '🗂️ Move to committee staff', hint: 'Nonpartisan, steadier' },
      { id: 'lobby', label: '💼 Leave for a lobbying firm', hint: 'Better pay; a revolving door' },
    ],
  });
}

export const StaffersModule = {
  id: 'staffers',
  order: 61,
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => attachPrincipal(ctx, job ?? ctx.state.career.job));
  },
  onAgeUp(ctx) {
    officeYear(ctx);
    stafferYear(ctx);
  },
  actions: {
    /** arg: role id — a shortlist of three candidates. */
    shortlist,
  },
  resolvers: {
    hire(ctx, data, optionId) {
      const { state } = ctx;
      const seat = mySeat(state);
      const c = data.picks?.[Number(String(optionId).replace('c', ''))];
      if (!seat || !c) return ctx.log('You kept the post open.', '🧑‍💼');
      if (seat.staff.length >= staffBudget(seat)) return ctx.toast('The office budget is spent.', 'warn');
      seat.staff.push({ id: ctx.rng.id('staff_'), role: data.role, name: c.name, skill: c.skill, bg: c.bg, loyalty: c.loyalty, salary: c.salary, years: 0 });
      return ctx.log(`You hired ${c.name}, ${BACKGROUNDS[c.bg].label}, as your ${staffTitle(data.role, state).toLowerCase()} ($${c.salary.toLocaleString()} a year from the office budget).`, '🧑‍💼', 'info');
    },
    scandal(ctx, data, optionId) {
      const { state } = ctx;
      const seat = mySeat(state);
      const o = state.politics?.office;
      const p = seat?.staff.find((x) => x.id === data.id);
      if (optionId === 'fire') {
        if (seat && p) seat.staff = seat.staff.filter((x) => x !== p);
        if (o) o.approval = Math.round(clamp(o.approval - 1, 0, 100));
        return ctx.log(`You let ${p?.name ?? 'them'} go. The story died in two days.`, '🚪', 'info');
      }
      if (o) o.approval = Math.round(clamp(o.approval - (data.nepotism ? 8 : 5), 0, 100));
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 1);
      return ctx.log('You stood by them. The story ran for weeks.', '📰', 'warn');
    },
    officeClosed(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'another') {
        attachPrincipal(ctx, job);
        return ctx.log(`You moved across the corridor: now in the ${job.employer.name}.`, '🤝', 'info');
      }
      if (optionId === 'committee') {
        job.principal = null;
        job.employer.name = 'Committee staff (nonpartisan)';
        return ctx.log('You joined the nonpartisan committee staff: no boss to lose an election, no campaign trail.', '🗂️', 'info');
      }
      ctx.emit('career:resign', { reason: 'Left the Hill for a lobbying firm' });
      ctx.earn(rng.int(20000, 60000), 'Signing bonus, lobbying firm');
      return ctx.log('You went through the revolving door: a lobbying firm hired you for your contacts.', '💼', 'milestone');
    },
  },
};
