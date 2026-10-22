/**
 * Emergency management: the four-phase cycle, for the people who plan for
 * the worst day and run it when it comes.
 *
 *   Hazards       Your area's real hazard profile (floods on the Gulf,
 *                 earthquakes in California, bushfires in Victoria) sets the
 *                 work.
 *   Preparedness  A few actions a year from a limited program: write plans,
 *                 run exercises, train volunteers, stock shelters, test the
 *                 public alert system (and risk a false alarm), go out to the
 *                 community. Readiness decays if you don't keep at it.
 *   Mitigation    Win grants for projects — levees, buyouts, safe rooms,
 *                 fuel breaks, seismic retrofits — that take years to build
 *                 and then make the next disaster of that kind less severe.
 *   Response      When a disaster or major incident hits, you run the
 *                 operations centre through three calls: how far to activate,
 *                 how to protect people (evacuate early, wait, shelter in
 *                 place), and what help to ask for. Readiness, judgement and
 *                 luck decide how it goes.
 *   Recovery      A declared disaster leaves years of reimbursement claims;
 *                 sloppy paperwork gets audited and clawed back.
 *
 * state.careerLife.emergencyMgmt = { professionId, readiness: { plans, exercises, shelters, alerts, partners },
 *   projects: [{ hazard, name, years, left, stateId }], activations: [...], claims: [...], rep }
 * state.mitigation = { stateId: { hazard: age } } — what was built stays built, whatever you do next.
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly, addHonor } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';
import { STATES, DISASTER_LABEL } from '../../life/States.js';
import { stateIdOf } from '../../life/Regions.js';

export const READINESS = {
  plans: { label: 'Plans', icon: '📋' },
  exercises: { label: 'Exercises', icon: '🎯' },
  shelters: { label: 'Shelters & supplies', icon: '🏫' },
  alerts: { label: 'Public alerting', icon: '📢' },
  partners: { label: 'Partners & volunteers', icon: '🤝' },
};

/** Preparedness work: points it costs, what it builds, who can do it. */
export const ACTIONS = {
  plan: { name: 'Update the hazard plan', icon: '📋', cost: 1, fx: { plans: 20 }, desc: 'Evacuation routes, shelter lists, who calls whom.' },
  tabletop: { name: 'Run a tabletop exercise', icon: '🗺️', cost: 1, fx: { exercises: 12, partners: 5 }, desc: 'Department heads around a table, walking through a scenario.' },
  fullScale: { name: 'Run a full-scale exercise', icon: '🎯', cost: 2, fx: { exercises: 25, partners: 10 }, minLevel: 'senior', desc: 'Real crews, real vehicles, volunteer "casualties". Finds the gaps.' },
  volunteers: { name: 'Train volunteers & response teams', icon: '🦺', cost: 1, fx: { partners: 15 }, desc: 'Community response teams, the SES and the Red Cross.' },
  shelters: { name: 'Stock and certify shelters', icon: '🏫', cost: 1, fx: { shelters: 20 }, desc: 'Cots, generators, water, pet space, accessibility.' },
  alerts: { name: 'Test the public alert system', icon: '📢', cost: 1, fx: { alerts: 20 }, desc: 'Sirens, phone alerts, the radio. One wrong button…' },
  outreach: { name: 'Community preparedness drive', icon: '🏘️', cost: 1, fx: { partners: 8, alerts: 6 }, desc: 'Go-bags, school visits, neighbourhood meetings.' },
};
const RANKS = ['trainee', 'officer', 'senior', 'planner', 'volunteerServices', 'controller', 'director', 'deputy', 'commissioner'];
const rankAtLeast = (job, id) => RANKS.indexOf(job.levelId) >= RANKS.indexOf(id);
const LEADS = ['controller', 'director', 'deputy', 'commissioner'];
const EXECS = ['director', 'deputy', 'commissioner'];

/** Mitigation projects by hazard. */
export const PROJECTS = {
  flood: [{ name: 'a levee and floodwall', years: 4 }, { name: 'buyouts of flood-prone homes', years: 3 }],
  hurricane: [{ name: 'hardened hospital power and storm shelters', years: 3 }],
  wildfire: [{ name: 'fuel breaks and defensible space around town', years: 2 }],
  earthquake: [{ name: 'seismic retrofits of schools and bridges', years: 4 }],
  tornado: [{ name: 'community safe rooms', years: 2 }],
  blizzard: [{ name: 'a warming-centre and snow-route network', years: 2 }],
};

const isEM = (job) => engineKey(job) === 'emergencyManagement';
const fresh = () => ({ readiness: { plans: 35, exercises: 25, shelters: 35, alerts: 40, partners: 30 }, projects: [], activations: [], claims: [] });
/** Mitigation finished where you live now. */
export const mitigatedHere = (state) => state.mitigation?.[stateIdOf(state)] ?? {};
const avg = (r) => Math.round(Object.values(r).reduce((a, b) => a + b, 0) / Object.keys(r).length);
export const pointsFor = (job) => 3 + (rankAtLeast(job, 'senior') ? 1 : 0) + (rankAtLeast(job, 'controller') ? 1 : 0);

/** The hazards of where you live, most likely first. */
export function hazardsOf(state) {
  const d = STATES[stateIdOf(state)]?.disasters ?? {};
  return Object.entries(d).sort((a, b) => b[1] - a[1]).map(([type, p]) => ({ type, p, ...(DISASTER_LABEL[type] ?? { name: type, icon: '⚠️' }) }));
}

export function emView(state) {
  const job = state.career.job;
  if (!isEM(job)) return null;
  const rec = peekLife(state, 'emergencyMgmt');
  return { rec: rec?.professionId === job.professionId ? rec : null, hazards: hazardsOf(state), points: pointsFor(job), used: yearlyCount(state, 'emergencyMgmt.points') };
}

export function actionEligibility(state, id) {
  const job = state.career.job;
  const a = ACTIONS[id];
  if (!isEM(job) || !a) return { ok: false, reason: 'Not available' };
  if (a.minLevel && !rankAtLeast(job, a.minLevel)) return { ok: false, reason: 'Senior officers run full-scale exercises' };
  if (yearlyCount(state, `emergencyMgmt.${id}`)) return { ok: false, reason: 'Done this year' };
  if (yearlyCount(state, 'emergencyMgmt.points') + a.cost > pointsFor(job)) return { ok: false, reason: 'No program time left this year' };
  return { ok: true };
}

export function grantEligibility(state, hazard) {
  const job = state.career.job;
  const rec = peekLife(state, 'emergencyMgmt');
  if (!isEM(job)) return { ok: false, reason: 'Not available' };
  if (!rankAtLeast(job, 'senior')) return { ok: false, reason: 'Senior officers and planners write grant applications' };
  if (!PROJECTS[hazard]) return { ok: false, reason: 'No project for that hazard' };
  if (mitigatedHere(state)[hazard]) return { ok: false, reason: 'Already mitigated here' };
  if (rec?.projects?.some((p) => p.hazard === hazard)) return { ok: false, reason: 'A project is under way' };
  if (yearlyCount(state, 'emergencyMgmt.grant')) return { ok: false, reason: 'One application a year' };
  return { ok: true };
}

function record(state, entry) {
  state.majorIncidents ??= [];
  state.majorIncidents = [{ age: state.character.age, ...entry }, ...state.majorIncidents].slice(0, 20);
}

/* ------------------------------------------------------------------ */
/* Response: the operations centre                                     */
/* ------------------------------------------------------------------ */

const MAN_MADE = ['derailment', 'explosion', 'collapse', 'pileup', 'shooting', 'crush'];

/** A disaster or major incident hits: open the operations centre. */
export function activate(ctx, incident) {
  const { state } = ctx;
  const job = state.career.job;
  if (!isEM(job) || state.prompts.some((p) => p.type.startsWith('emergencyMgmt.') && p.type !== 'emergencyMgmt.event')) return;
  lifeOf(state, 'emergencyMgmt', job.professionId, fresh());
  const data = { name: incident.name, kind: incident.kind, severity: incident.severity ?? 2, mutualAid: Boolean(incident.mutualAid) };
  const lead = LEADS.includes(job.levelId);
  ctx.prompt({
    type: 'emergencyMgmt.level', icon: '🖥️', title: `Operations Centre: ${incident.name.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())}`,
    text: `${incident.text ?? `${incident.name} is hitting the area.`}${data.mutualAid ? ' Your neighbours have asked for help running their operations centre.' : ''}\n${lead ? 'It\'s your call how far to activate.' : 'Your director asks what you recommend.'}`,
    options: [
      { id: 'monitor', label: '👀 Monitoring only', hint: 'Cheap and quiet — if it stays small' },
      { id: 'partial', label: '🟠 Partial activation', hint: 'Key agencies in the room' },
      { id: 'full', label: '🔴 Full activation', hint: 'Every agency, every seat, around the clock' },
    ],
    data,
  });
}

function protectPrompt(ctx, data) {
  const manMade = MAN_MADE.includes(data.kind);
  ctx.prompt({
    type: 'emergencyMgmt.protect', icon: '📢', title: 'Protecting the Public',
    text: manMade ? 'The scene is chaotic, rumours are spreading and families are looking for each other.' : `The forecast for ${data.name} is uncertain. Ordering people out costs money and credibility if it misses; waiting costs lives if it doesn't.`,
    options: manMade
      ? [{ id: 'early', label: '🧭 Open a family reunification centre and push out public updates', hint: 'Information and order' }, { id: 'shelter', label: '🏠 Order the nearby area to shelter in place', hint: 'Keep people away' }, { id: 'wait', label: '⏳ Let the incident commander handle the public', hint: 'Stay in your lane' }]
      : [{ id: 'early', label: '🚗 Order an evacuation now', hint: 'Early, while roads are open' }, { id: 'wait', label: '⏳ Wait for a firmer forecast', hint: 'A gamble' }, { id: 'shelter', label: '🏠 Tell people to shelter in place', hint: 'For when leaving is worse' }],
    data,
  });
}

function resourcesPrompt(ctx, data) {
  const job = ctx.state.career.job;
  ctx.prompt({
    type: 'emergencyMgmt.resources', icon: '📦', title: 'Resources',
    text: 'Requests are piling up: generators, water, shelter staff, search teams. What do you ask for?',
    options: [
      { id: 'local', label: '🏘️ Manage with local resources', hint: 'No outside strings' },
      { id: 'mutual', label: '🤝 Call in mutual aid from neighbouring areas', hint: 'Fast, limited' },
      { id: 'declare', label: EXECS.includes(job?.levelId) ? '🏛️ Request a disaster declaration and outside help' : '🏛️ Urge your director to request a disaster declaration', hint: 'Big help — and years of paperwork' },
    ],
    data,
  });
}

function outcome(ctx, data) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const rec = lifeOf(state, 'emergencyMgmt', job.professionId, fresh());
  const sev = data.severity;
  const manMade = MAN_MADE.includes(data.kind);
  const r = rec.readiness;
  let score = avg(r) * 0.5 + skill(state, { smarts: 2, happiness: 1 }) * 0.2 + rng.int(-15, 15);
  score += { monitor: sev >= 2 ? -15 : 4, partial: sev === 3 ? -4 : 5, full: sev >= 2 ? 8 : -4 }[data.level] ?? 0;
  score += { early: manMade ? 6 : sev >= 2 ? 10 : -6, wait: manMade ? -4 : rng.chance(0.5) ? 2 : -14, shelter: manMade ? 5 : ['wildfire', 'hurricane', 'flood'].includes(data.kind) ? -10 : 2 }[data.protect] ?? 0;
  score += { local: sev === 3 ? -8 : 2, mutual: 5, declare: sev >= 2 ? 8 : -3 }[data.resources] ?? 0;
  score += (r.shelters - 50) / 10 + (r.alerts - 50) / 12;
  const tier = score >= 62 ? 'exemplary' : score >= 45 ? 'good' : score >= 30 ? 'troubled' : 'failure';
  const label = data.name;
  const fx = {
    exemplary: { text: `The response to ${label} is already being studied: warnings went out early, shelters opened on time, and the agencies worked as one.`, perf: 12, rep: 12, happiness: 6, trauma: 4 },
    good: { text: `${label.replace(/^./, (c) => c.toUpperCase())} was handled well. The after-action report found gaps, not failures.`, perf: 6, rep: 5, trauma: 4 },
    troubled: { text: `The response to ${label} was slow in places: a shelter opened late and some warnings reached people after the water did. The after-action report is hard reading.`, perf: -5, rep: -6, trauma: 6, stress: 6 },
    failure: { text: `The response to ${label} broke down. People were hurt who shouldn't have been, and the press wants to know why the operations centre didn't see it coming.`, perf: -12, rep: -14, trauma: 12, stress: 10 },
  }[tier];
  applyFx(ctx, rec, fx, '🖥️');
  if (tier === 'exemplary' && !state.honors.some((h) => h.id === `em.award.${state.character.age}`)) {
    addHonor(state, { id: `em.award.${state.character.age}`, source: 'civil', name: `Emergency Management Award — ${label.replace(/^the /, '')}`, icon: '🚨', prestige: 5, precedence: 52, citation: `For leading the response to ${label}.` });
    ctx.log('You were recognised for leading the response.', '🚨', 'honor');
  }
  // Overtime for the activation.
  const ot = Math.round(job.salary * ({ monitor: 0, partial: 0.03, full: 0.06 }[data.level] ?? 0) * sev / 100) * 100;
  if (ot > 0) ctx.earn(ot, 'Activation overtime', { wage: true });
  // A declaration brings outside money — and years of paperwork.
  if (data.resources === 'declare' && sev >= 2 && !data.mutualAid) {
    const amount = sev * rng.int(5, 40) * 1e6;
    rec.claims.push({ name: label, amount, reimbursed: 0, paperwork: 50, age: state.character.age });
    ctx.log(`A disaster declaration was granted for ${label}. ${(amount / 1e6).toFixed(0)} million in recovery costs can be reimbursed — if the paperwork holds up.`, '🏛️', 'good');
  }
  rec.activations = [{ age: state.character.age, name: label, level: data.level, protect: data.protect, resources: data.resources, tier, mutualAid: data.mutualAid }, ...rec.activations].slice(0, 12);
  record(state, { name: label, kind: data.kind, role: 'coordination', outcome: tier, mutualAid: data.mutualAid });
  // Bad days need someone to blame.
  if (['troubled', 'failure'].includes(tier) && EXECS.includes(job.levelId)) {
    ctx.prompt({ type: 'emergencyMgmt.blame', icon: '🎤', title: 'The Press Conference', text: 'The cameras are waiting and the elected officials want someone else to blame.', options: [{ id: 'own', label: '🙋 Take responsibility and promise fixes' }, { id: 'weather', label: '🌧️ Blame the forecast' }, { id: 'resign', label: '🚪 Resign' }], data: { tier } });
  }
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

const DECK = [
  { id: 'cut', icon: '✂️', title: 'Budget Cuts', text: 'Council wants to cut your program by a third. "Nothing has happened in years."', options: [
    { id: 'fight', label: '📊 Present the hazard data and fight it', check: 50, text: 'The cut was halved. A councilmember called your presentation "terrifying, in a useful way."', perf: 4, rep: 4, fail: { text: 'The cut went through. Fewer exercises next year.', perf: -2 } },
    { id: 'accept', label: '🤷 Absorb it', text: 'You absorbed it. Readiness will slip.', perf: 1 },
  ] },
  { id: 'pets', icon: '🐕', title: 'Pets in Shelters', text: 'After the last storm, people refused to evacuate without their pets. The shelters don\'t allow animals.', options: [
    { id: 'change', label: '🐾 Build pet-friendly shelter plans with animal services', text: 'Next time, more people left — with their dogs.', rep: 6, perf: 3 },
    { id: 'rules', label: '📋 Keep the rules', text: 'The rules stayed.', rep: -2 },
  ] },
  { id: 'false', icon: '📱', title: 'The Wrong Button', text: 'During a routine test, a staffer is about to send a live emergency alert by mistake. You catch it on the screen.', options: [
    { id: 'stop', label: '🛑 Stop it and fix the interface', text: 'A two-step confirmation went in the next day. Nobody outside the room ever knew.', rep: 4 },
    { id: 'late', label: '😬 Too late — correct it fast', check: 40, text: 'A correction went out in three minutes. Embarrassing, survivable.', rep: -2, fail: { text: 'The correction took forty minutes. Panic, car crashes and a national news story.', rep: -14, perf: -10, stress: 10 } },
  ] },
  { id: 'vendor', icon: '💼', title: 'The Vendor', text: 'A generator supplier offers you a "consulting retainer" while you\'re writing the specs for a big contract.', options: [
    { id: 'no', label: '🙅 Decline and report it', text: 'The procurement office thanked you.', rep: 4 },
    { id: 'yes', label: '💵 Take it', tone: 'danger', text: 'A nice retainer.', money: 12000, moneyLabel: 'Consulting retainer', offense: 'kickback', offenseContext: 'taking a vendor\'s money while writing contract specs', discovery: 0.3 },
  ] },
  { id: 'heat', icon: '🌡️', title: 'The Heat Wave', text: 'A week of extreme heat. Elderly people living alone are the ones who die.', options: [
    { id: 'centres', label: '🏫 Open cooling centres and send volunteers door to door', text: 'Your teams checked on 3,000 people. Several were found just in time.', perf: 5, rep: 6 },
    { id: 'advice', label: '📢 Issue heat advice', text: 'The advice went out. The coroner\'s count went up.', perf: -1 },
  ] },
];

export const EmergencyMgmtModule = {
  id: 'emergencyMgmt',
  order: 31.35,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!isEM(job) || state.legal.incarceration) return;
    const rec = lifeOf(state, 'emergencyMgmt', job.professionId, fresh());
    // Plans age, staff turn over, supplies expire.
    for (const k of Object.keys(rec.readiness)) rec.readiness[k] = Math.round(clamp(rec.readiness[k] - rng.int(3, 7), 0, 100));
    // Mitigation projects get built.
    for (const p of rec.projects) p.left -= 1;
    for (const p of rec.projects.filter((x) => x.left <= 0)) {
      state.mitigation ??= {};
      state.mitigation[p.stateId] ??= {};
      state.mitigation[p.stateId][p.hazard] = state.character.age;
      applyFx(ctx, rec, { text: `${p.name.replace(/^./, (c) => c.toUpperCase())} is finished. The next ${p.hazard} will hit a better-prepared place.`, perf: 6, rep: 6, happiness: 5 }, '🏗️');
    }
    rec.projects = rec.projects.filter((x) => x.left > 0);
    // Recovery claims: reimbursements, and audits of sloppy files.
    for (const c of rec.claims) {
      c.reimbursed = Math.min(c.amount, c.reimbursed + c.amount * (0.15 + c.paperwork / 300));
      c.paperwork = Math.max(0, c.paperwork - 10);
      if (c.paperwork < 30 && rng.chance(0.3)) {
        const back = Math.round(c.amount * 0.08);
        c.reimbursed = Math.max(0, c.reimbursed - back);
        c.audited = true;
        applyFx(ctx, rec, { text: `An audit of the ${c.name} recovery claims found missing documentation: ${(back / 1e6).toFixed(1)} million clawed back.`, perf: -6, rep: -6 }, '🧾');
      }
    }
    const closed = rec.claims.filter((c) => c.reimbursed >= c.amount || state.character.age - c.age >= 7);
    for (const c of closed) ctx.log(`The ${c.name} recovery claims are closed: ${(c.reimbursed / 1e6).toFixed(0)} of ${(c.amount / 1e6).toFixed(0)} million recovered.`, '📁', c.reimbursed >= c.amount * 0.9 ? 'good' : undefined);
    rec.claims = rec.claims.filter((c) => !closed.includes(c));
    rec.rep = Math.round(clamp(rec.rep + (avg(rec.readiness) - 45) / 15, 0, 100));
    // A quiet year still has its moments.
    if (!state.prompts.some((p) => p.type.startsWith('emergencyMgmt.')) && rng.chance(0.55)) {
      const d = rng.pick(DECK);
      ctx.prompt({ type: 'emergencyMgmt.event', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id } });
    }
  },
  actions: {
    /** arg: an ACTIONS id */
    prepare(ctx, id) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const ok = actionEligibility(state, id);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      const a = ACTIONS[id];
      bumpYearly(state, `emergencyMgmt.${id}`);
      for (let i = 0; i < a.cost; i++) bumpYearly(state, 'emergencyMgmt.points');
      const rec = lifeOf(state, 'emergencyMgmt', job.professionId, fresh());
      for (const [k, v] of Object.entries(a.fx)) rec.readiness[k] = Math.min(100, rec.readiness[k] + v);
      ctx.stat('stress', 1);
      let note = a.desc;
      if (id === 'fullScale' && rng.chance(0.6)) { rec.readiness.plans = Math.min(100, rec.readiness.plans + 8); note = 'The exercise found a gap: the radios of two agencies couldn\'t talk to each other. Fixed now.'; }
      if (id === 'alerts' && rng.chance(0.06)) { rec.readiness.alerts = Math.max(0, rec.readiness.alerts - 25); applyFx(ctx, rec, { text: 'The test went out to every phone in the county as a real alert. You spent the afternoon apologising on the radio.', rep: -8, perf: -4 }, '📱'); return undefined; }
      if (id === 'volunteers' && Object.entries(state.emergency ?? {}).some(([k, m]) => k !== 'history' && m && !m.onLeave)) note = 'You trained alongside your own volunteer unit. They gave you a hard time and a cup of tea.';
      ctx.log(`${a.icon} ${a.name}. ${note}`, a.icon);
      return undefined;
    },
    /** arg: hazard — apply for a mitigation grant. */
    grant(ctx, hazard) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const ok = grantEligibility(state, hazard);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      bumpYearly(state, 'emergencyMgmt.grant');
      const rec = lifeOf(state, 'emergencyMgmt', job.professionId, fresh());
      const p = rng.pick(PROJECTS[hazard]);
      if (rng.chance(clamp(0.25 + rec.readiness.plans / 200 + skill(state, { smarts: 3 }) / 300 + (job.levelId === 'planner' ? 0.1 : 0), 0.1, 0.85))) {
        rec.projects.push({ hazard, name: p.name, years: p.years, left: p.years, stateId: stateIdOf(state) });
        applyFx(ctx, rec, { text: `Your mitigation grant was funded: ${p.name}, ${p.years} years to build.`, perf: 5, rep: 4 }, '💰');
      } else ctx.log(`Your grant application for ${p.name} wasn't funded this round. The reviewers wanted a stronger plan.`, '📝', 'warn');
      return undefined;
    },
    /** Push the recovery paperwork through. */
    paperwork(ctx) {
      const { state } = ctx;
      const job = state.career.job;
      const rec = peekLife(state, 'emergencyMgmt');
      if (!isEM(job) || !rec?.claims?.length) return ctx.toast('No open recovery claims', 'warn');
      if (yearlyCount(state, 'emergencyMgmt.paperwork')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'emergencyMgmt.paperwork');
      for (const c of rec.claims) c.paperwork = Math.min(100, c.paperwork + 35);
      ctx.stat('stress', 3);
      ctx.log('You spent weeks on project worksheets, receipts and site photos. The claims are airtight.', '📁');
      return undefined;
    },
  },
  resolvers: {
    level(ctx, data, optionId) { protectPrompt(ctx, { ...data, level: optionId }); },
    protect(ctx, data, optionId) { resourcesPrompt(ctx, { ...data, protect: optionId }); },
    resources(ctx, data, optionId) { if (isEM(ctx.state.career.job)) outcome(ctx, { ...data, resources: optionId }); },
    blame(ctx, data, optionId) {
      const { state, rng } = ctx;
      const rec = peekLife(state, 'emergencyMgmt');
      if (optionId === 'own') applyFx(ctx, rec, { text: 'You took responsibility and published the fixes. Some people respected it. The mayor did not.', rep: 6, perf: -2 }, '🙋');
      else if (optionId === 'weather') applyFx(ctx, rec, { text: 'You blamed the forecast. The forecasters published their warnings, with timestamps.', rep: -8 }, '🌧️');
      else applyFx(ctx, rec, { text: 'You resigned. The report was kinder to you once you were gone.', fired: 'Resigned after the disaster response' }, '🚪');
      if (optionId === 'own' && data.tier === 'failure' && rng.chance(0.3)) applyFx(ctx, rec, { text: 'It wasn\'t enough. You were replaced.', fired: 'Replaced after a failed disaster response' }, '🚪');
    },
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const d = DECK.find((x) => x.id === data.deckId);
      if (!d || !isEM(job)) return;
      resolveOption(ctx, lifeOf(ctx.state, 'emergencyMgmt', job.professionId, fresh()), d.options.find((o) => o.id === optionId), d.icon, { smarts: 2, happiness: 1 });
    },
  },
};

/** Finished mitigation softens the next disaster of that kind (called by life/Disasters.js). */
export const mitigates = (state, type) => Boolean(mitigatedHere(state)[type]);
