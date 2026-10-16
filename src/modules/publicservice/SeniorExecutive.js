/**
 * The Senior Executive Service: the federal government's career executives,
 * between the GS-15s and the political appointees.
 *
 *   Who runs what  The top rungs of federal careers are executive posts:
 *                  a Special Agent in Charge, a regional director, a deputy
 *                  administrator. Getting one takes SES certification from
 *                  OPM's Qualifications Review Board, not just a promotion.
 *                  (The Foreign Service, the intelligence agencies and the
 *                  Postal Service run equivalents: the Senior Foreign
 *                  Service, the Senior Intelligence Service, the PCES.)
 *   Getting in     Two routes. The SES Candidate Development Program: a
 *                  competitive two-year program of developmental details,
 *                  executive courses and a mentor; graduates go to the QRB
 *                  and can be appointed without competing again. Or apply to
 *                  an SES vacancy directly with written Executive Core
 *                  Qualification narratives (Leading Change, Leading People,
 *                  Results Driven, Business Acumen, Building Coalitions),
 *                  get picked by the agency, then pass the QRB.
 *                  Experts who don't want to manage can go Senior Level /
 *                  Senior Technical (SL/ST): executive pay, no executive duties.
 *   Being one      A one-year probation (fail it and you fall back to GS-15).
 *                  Pay is a single band, no locality, set by your appraisal;
 *                  top ratings bring performance awards, and after three
 *                  years Presidential Rank Awards. You can be reassigned
 *                  anywhere on short notice. New administrations bring new
 *                  political bosses.
 *   The very top   Ambassadors, inspectors general and U.S. Marshals are
 *                  nominated by the President and confirmed by the Senate.
 *
 * Abroad the same mechanics run under each country's own senior civil service (Britain's
 * Senior Civil Service, Australia's APS SES, France's emplois de direction, the
 * Philippines' Career Executive Service…): its development programme, its selection
 * board, its pay band and the grade you fall back to. There are no Presidential Rank
 * Awards, Senate confirmations or SL/ST posts outside the US.
 *
 * state.ses = { stage: null|'cdp'|'certified'|'member', cdpYears, cdpDetails[], type: 'career'|'slst',
 *   since, probationUntil, pay, rating, awards, apps, lastTransitionYear }
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly, yearsInProfession, currentYear, criminalRecord } from '../../core/State.js';
import { getProfession, PROFESSIONS } from '../career/JobTrees.js';
import { levelById } from '../career/Ladder.js';
import { hasCredential, grantCredential } from '../credentials/LicensingEngine.js';
import { recalcSalary } from '../career/Compensation.js';
import { promote, demote, leaveJob } from '../career/CareerEngine.js';

/** SES pay band (no locality pay): minimum and the certified-appraisal-system cap. */
export const SES_PAY = { min: 150000, max: 225000 };
export const CDP_YEARS = 2;

const KINDS = {
  ses: { name: 'Senior Executive Service', short: 'SES' },
  sfs: { name: 'Senior Foreign Service', short: 'SFS' },
  sis: { name: 'Senior Intelligence Service', short: 'SIS' },
  pces: { name: 'Postal Career Executive Service', short: 'PCES' },
  pas: { name: 'Presidential appointment (Senate-confirmed)', short: 'PAS' },
};

/**
 * Each country's senior civil service: name, short name, development programme, the board that
 * certifies or selects, the qualities it assesses, the grade you fall back to, and the pay band.
 */
const SENIOR_SERVICES = {
  GB: { name: 'Senior Civil Service', short: 'SCS', programme: 'Future Leaders Scheme', board: 'a Civil Service Commission panel', quals: 'Success Profiles', fallback: 'Grade 6', pay: [95000, 200000] },
  IE: { name: 'Senior Public Service', short: 'SPS', programme: 'Senior Public Service Leadership Development Programme', board: 'the Top Level Appointments Committee', quals: 'the senior leadership competencies', fallback: 'Principal Officer', pay: [120000, 220000] },
  AU: { name: 'Senior Executive Service (APS)', short: 'SES', programme: 'SES Band 1 Leadership Program', board: 'an APS Commissioner-endorsed selection panel', quals: 'the SES Leadership Capability Framework', fallback: 'EL2', pay: [200000, 350000] },
  NZ: { name: 'Public Service senior leadership', short: 'senior leader', programme: 'Leadership Development Centre programme', board: 'the Public Service Commission', quals: 'the Leadership Success Profile', fallback: 'manager grade', pay: [180000, 300000] },
  CA: { name: 'Executive Group (EX)', short: 'EX', programme: 'Accelerated Executive Development Program', board: 'the Public Service Commission', quals: 'the Key Leadership Competencies', fallback: 'your pre-executive level', pay: [130000, 220000] },
  DE: { name: 'Höherer Dienst — B-Besoldung', short: 'B', programme: 'Führungskolleg Speyer', board: "the ministry's personnel committee", quals: 'the leadership assessment', fallback: 'A16', pay: [110000, 180000] },
  FR: { name: 'Haute fonction publique (emplois de direction)', short: 'emploi de direction', programme: 'cycle supérieur de management (INSP)', board: 'the DIESE (délégation interministérielle à l\'encadrement supérieur)', quals: 'the senior management assessment', fallback: 'your corps grade', pay: [100000, 180000] },
  IT: { name: 'Dirigenza pubblica', short: 'dirigente', programme: 'SNA dirigenti course', board: 'the Dipartimento della Funzione Pubblica', quals: 'the dirigenza competencies', fallback: 'funzionario', pay: [100000, 200000] },
  ES: { name: 'Alta dirección pública', short: 'subdirector general', programme: 'INAP executive programme', board: 'the ministry', quals: 'the directive competencies', fallback: 'your cuerpo\'s level 30', pay: [80000, 130000] },
  NL: { name: 'Algemene Bestuursdienst (ABD)', short: 'ABD', programme: 'ABD Kandidatenprogramma', board: 'Bureau ABD', quals: 'the ABD leadership profile', fallback: 'schaal 15', pay: [110000, 200000] },
  SE: { name: 'Senior civil service (myndighetschefer)', short: 'chef', programme: 'Government Offices leadership programme', board: 'the Government Offices', quals: 'the leadership profile', fallback: 'your previous post', pay: [100000, 180000] },
  JP: { name: 'Senior officials (shitei-shoku)', short: 'senior official', programme: 'National Personnel Authority executive seminar', board: 'the Cabinet Bureau of Personnel Affairs', quals: 'the senior official criteria', fallback: 'division director (kachō) grade', pay: [130000, 220000] },
  KR: { name: 'Senior Civil Service (Gowi Gongmuwondan)', short: 'SCS', programme: 'Senior Civil Service candidate course', board: 'the Ministry of Personnel Management', quals: 'the competency assessment', fallback: 'grade 3', pay: [110000, 180000] },
  IN: { name: 'Senior Administrative Grade (Joint Secretary)', short: 'JS', programme: 'Mid-Career Training Programme (LBSNAA)', board: 'the Appointments Committee of the Cabinet', quals: 'the empanelment review', fallback: 'Director', pay: [60000, 110000] },
  MX: { name: 'Servicio Profesional de Carrera (dirección general)', short: 'SPC', programme: 'SPC certification', board: 'the Secretaría Anticorrupción y Buen Gobierno', quals: 'the managerial capacities', fallback: 'director de área', pay: [70000, 130000] },
  BR: { name: 'Cargos de direção (CCE)', short: 'CCE', programme: 'ENAP leadership course', board: 'the ministry', quals: 'the leadership profile', fallback: 'your career grade', pay: [90000, 160000] },
  PH: { name: 'Career Executive Service (CES)', short: 'CES', programme: 'Career Executive Service Development Program', board: 'the Career Executive Service Board', quals: 'the CES eligibility examination', fallback: 'Division Chief', pay: [60000, 110000] },
  '*': { name: 'Senior Civil Service', short: 'SCS', programme: 'senior leadership programme', board: 'the civil service commission', quals: 'the senior leadership criteria', fallback: 'your previous grade', pay: [100000, 180000] },
};
const abroad = (state) => (state?.character?.countryId ?? 'US') !== 'US';
/**
 * The executive corps you'd join: the US SES (or the SFS, SIS, PCES) at home,
 * the country's senior civil service abroad.
 */
export function corpsFor(state, professionId) {
  if (abroad(state)) {
    const c = SENIOR_SERVICES[state.character.countryId] ?? SENIOR_SERVICES['*'];
    return { ...c, us: false, payMin: c.pay[0], payMax: c.pay[1] };
  }
  const k = corpsOf(professionId);
  return { name: k.name, short: k.short, programme: 'SES Candidate Development Program', board: 'OPM\'s Qualifications Review Board', quals: 'Executive Core Qualifications (ECQs)', fallback: 'GS-15', us: true, payMin: SES_PAY.min, payMax: SES_PAY.max };
}

/** Executive rungs of federal careers, and which executive corps they belong to. */
export const SES_LEVELS = {
  regulatory: { deputy: 'ses', administrator: 'pas' },
  foreignService: { fs1: 'sfs', dcm: 'sfs', ambassador: 'pas' },
  oig: { aig: 'ses', ig: 'pas' },
  intelligence: { nio: 'sis', deputyDirector: 'sis' },
  caseOfficer: { cos: 'sis', divisionChief: 'sis' },
  sigint: { technicalDirector: 'sis', director: 'sis' },
  tsa: { fsd: 'ses' },
  federalPrisons: { regional: 'ses' },
  postal: { district: 'pces' },
  fbi: { sac: 'ses' },
  dea: { sac: 'ses' },
  atf: { sac: 'ses' },
  usss: { sac: 'ses' },
  usms: { sac: 'ses', usMarshal: 'pas' },
  benefitsClaims: { regional: 'ses' },
  borderPatrol: { chiefPatrol: 'ses' },
  meteorology: { regional: 'ses' },
};

// Gate the executive rungs: they need certification, and presidential posts are appointed.
for (const [pid, levels] of Object.entries(SES_LEVELS)) {
  const p = PROFESSIONS[pid];
  if (!p) continue;
  for (const [lid, kind] of Object.entries(levels)) {
    const i = p.levels.findIndex((l) => l.id === lid);
    if (i < 0) continue;
    // A new level object: national agencies abroad built from this ladder share the old one,
    // and the US Senior Executive Service doesn't apply to them.
    const level = { ...p.levels[i], ses: kind, req: { ...(p.levels[i].req ?? {}), credentials: [...new Set([...(p.levels[i].req?.credentials ?? []), 'sesCert'])] } };
    if (kind === 'pas') {
      level.appointed = true;
      level.appointedBy = 'the President, with Senate confirmation';
    }
    p.levels[i] = level;
  }
}

export const sesKindOf = (job) => (job ? SES_LEVELS[job.professionId]?.[job.levelId] ?? null : null);
const corpsOf = (professionId) => {
  const kinds = Object.values(SES_LEVELS[professionId] ?? {}).filter((k) => k !== 'pas');
  return KINDS[kinds[0] ?? 'ses'];
};
export const corpsName = (professionId, state) => (state ? corpsFor(state, professionId).name : corpsOf(professionId).name);
/** A national agency abroad keeps the US career's executive rungs under its own id (gb_fbi → fbi). */
const sesMap = (professionId) => SES_LEVELS[professionId] ?? SES_LEVELS[String(professionId).split('_').slice(1).join('_')];
const isFederal = (job) => Boolean(job) && PROFESSIONS[job.professionId]?.sector === 'federal';

/** Years supervising in federal service (current job included). */
function supervisoryYears(state) {
  const past = state.career.history.filter((h) => civilService(state, h.professionId) && levelById(PROFESSIONS[h.professionId], h.levelId)?.abilities?.includes('supervise'))
    .reduce((s, h) => s + (h.endAge - h.startAge), 0);
  const job = state.career.job;
  return past + (job && civilService(state, job.professionId) && job.abilities.includes('supervise') ? job.yearsInLevel ?? 0 : 0);
}
/**
 * Years in the civil service. Abroad that's the national careers (non-enumerable ids like gb_fbi,
 * so they're read through the career history, not a list of professions) and, in unitary states,
 * the national government's own agencies (probation, prisons, revenue).
 */
const civilService = (state, id) => {
  const p = PROFESSIONS[id];
  return p?.sector === 'federal' || (abroad(state) && p?.sector === 'state');
};
const federalYears = (state) => {
  const ids = [...new Set([...state.career.history.map((h) => h.professionId), state.career.job?.professionId].filter((id) => id && civilService(state, id)))];
  return ids.length ? yearsInProfession(state, ids) : 0;
};

/** Who can try for the SES (and what's missing). */
export function sesReadiness(state) {
  const job = state.career.job;
  const checks = [
    [abroad(state) ? 'A national civil-service job' : 'A federal job', isFederal(job)],
    [abroad(state) ? 'A senior grade (G7+)' : 'GS-14/15 equivalent (G7+)', (job?.grade ?? 0) >= 7],
    [abroad(state) ? '6+ years in the civil service' : '6+ years of federal service', federalYears(state) >= 6],
    ['2+ years supervising', supervisoryYears(state) >= 2],
    ['A strong record (70+)', (job?.performance ?? 0) >= 70],
  ];
  return { ok: checks.every(([, ok]) => ok), checks };
}

/** Senior Level / Senior Technical: experts at the top of a specialist track. */
export function slstReadiness(state) {
  const job = state.career.job;
  const doctorate = state.education.degrees.some((d) => ['doctorate', 'professional'].includes(d.type));
  const checks = [
    ['A federal job', isFederal(job)],
    ['A specialist (non-management) track at G7+', (job?.grade ?? 0) >= 7 && job?.track !== 'mgmt'],
    ['A doctorate, or 12+ years in the field', doctorate || yearsInProfession(state, [job?.professionId]) >= 12],
    ['An outstanding record (80+)', (job?.performance ?? 0) >= 80],
  ];
  return { ok: checks.every(([, ok]) => ok), checks };
}

/** The lowest executive rung you could be appointed to in your career (null if none). */
export function sesLevelFor(job) {
  const p = getProfession(job?.professionId);
  const map = sesMap(job?.professionId);
  if (!p || !map) return null;
  return p.levels.filter((l) => map[l.id] && map[l.id] !== 'pas' && l.grade >= job.grade).sort((a, b) => a.grade - b.grade)[0] ?? null;
}

const ses = (state) => state.ses;

/** SES pay: one national band, set by appraisals rather than steps. */
function applySesPay(state, job) {
  const s = ses(state);
  if (!job || job.headOf || !s.pay) return;
  job.payAdjust = 1;
  recalcSalary(state, job);
  job.payAdjust = s.pay / Math.max(1, job.salary);
  recalcSalary(state, job);
}

function becomeExecutive(ctx, type, how) {
  const { state } = ctx;
  const job = state.career.job;
  const s = ses(state);
  if (!hasCredential(state, 'sesCert') && type === 'career') grantCredential(ctx, 'sesCert', { silent: true });
  const level = type === 'career' ? sesLevelFor(job) : null;
  const placed = level && (level.id === job.levelId || promote(ctx, level.id));
  s.prevTitle = placed ? null : job.title;
  const C = corpsFor(state, job.professionId);
  Object.assign(s, { stage: 'member', type, since: state.character.age, probationUntil: state.character.age + 1, pay: clamp(Math.round(Math.max(C.payMin, job.salary * 1.05) / 100) * 100, C.payMin, C.payMax), rating: null });
  // Agencies without an executive rung in your line still have executive deputy and director posts.
  if (!placed && type === 'career') job.title = `${job.title} (${C.short})`;
  if (type === 'slst') job.title = /PhD|research|scien/i.test(job.title) ? 'Senior Technical Scientist (ST)' : `Senior Level ${job.title} (SL)`;
  applySesPay(state, job);
  ctx.log(`${how} You are now a member of the ${type === 'slst' ? 'Senior Level / Senior Technical service' : C.name}: ${job.title}, ${'$'}${job.salary.toLocaleString()} a year. A one-year probationary period starts now.`, '🏛️', 'milestone');
  ctx.toast(`🏛️ ${type === 'slst' ? 'SL/ST' : C.short}`, 'good');
  ctx.stat('happiness', 10);
}

/** Leave the executive ranks, keeping your job at the grade below. */
function fallBack(ctx, reason) {
  const { state } = ctx;
  const job = state.career.job;
  const s = ses(state);
  s.stage = hasCredential(state, 'sesCert') ? 'certified' : null;
  s.pay = null;
  if (job) {
    job.payAdjust = 1;
    if (sesKindOf(job)) demote(ctx, reason);
    else {
      if (s.prevTitle) job.title = s.prevTitle;
      recalcSalary(state, job);
    }
    s.prevTitle = null;
  }
  ctx.log(`You left the executive ranks (${reason}) and returned to a ${corpsFor(state, job?.professionId).fallback}-level position — your fallback right as a career employee.`, '⬇️', 'warn');
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

const DETAILS = [
  { id: 'agency', label: '🏢 A detail to another agency', hint: 'Breadth: how other departments work', ecq: 'Building Coalitions' },
  { id: 'hill', label: '🏛️ A congressional fellowship on the Hill', abroad: '🏛️ A secondment to a minister\'s private office', hint: 'Budget and politics up close', ecq: 'Business Acumen' },
  { id: 'field', label: '🗺️ Acting director of a field office', hint: 'Leading people, results on the line', ecq: 'Leading People' },
  { id: 'change', label: '🔧 Lead a reorganization task force', hint: 'Leading Change', ecq: 'Leading Change' },
];

function cdpTick(ctx) {
  const { state, rng } = ctx;
  const s = ses(state);
  s.cdpYears += 1;
  if (s.cdpYears < CDP_YEARS) {
    const C = corpsFor(state, state.career.job?.professionId);
    ctx.log(C.us ? 'Year one of the SES Candidate Development Program: 360-degree feedback, an executive mentor, and two weeks at the Federal Executive Institute.' : `Year one of the ${C.programme}: 360-degree feedback, an executive mentor and a residential leadership course.`, '🎓');
    if (!state.prompts.some((p) => p.type === 'ses.detail')) ctx.prompt({ type: 'ses.detail', icon: '🧭', title: 'Developmental Assignment', text: `Every ${C.short} candidate does a four-month developmental assignment outside their usual job. Which one?`, options: DETAILS.filter((d) => !s.cdpDetails.includes(d.id)).map(({ id, label, abroad: alt, hint }) => ({ id, label: C.us ? label : alt ?? label, hint })) });
    return;
  }
  const C = corpsFor(state, state.career.job?.professionId);
  // Graduation: the Qualifications Review Board.
  const odds = clamp(0.8 + s.cdpDetails.length * 0.05 + (state.stats.smarts - 60) / 300, 0.6, 0.98);
  if (rng.chance(odds)) {
    s.stage = 'certified';
    grantCredential(ctx, 'sesCert', { silent: true });
    ctx.log(C.us ? 'You graduated from the Candidate Development Program and OPM\'s Qualifications Review Board certified your Executive Core Qualifications. You can now be appointed to the SES without competing again.' : `You completed the ${C.programme}, and ${C.board} assessed you against ${C.quals}: you can now be appointed to the ${C.name} without competing again.`, '🏛️', 'milestone');
  } else {
    s.stage = null;
    ctx.log(C.us ? 'The Qualifications Review Board sent your ECQs back. You finished the program, but you are not certified — you can still apply to SES vacancies directly.' : `${C.board.charAt(0).toUpperCase()}${C.board.slice(1)} didn't sign you off. You finished the programme, but you'll have to compete for ${C.short} posts directly.`, '📝', 'warn');
  }
}

function memberTick(ctx, job) {
  const { state, rng } = ctx;
  const s = ses(state);
  // Probation: the first year decides whether you stay.
  if (s.probationUntil != null && state.character.age >= s.probationUntil) {
    s.probationUntil = null;
    const C0 = corpsFor(state, job.professionId);
    if (job.performance < 50) return fallBack(ctx, `did not complete the ${C0.short} probationary period`);
    ctx.log(`You completed your ${C0.short} probationary period.`, '✅', 'good');
  }
  // The annual appraisal sets pay; top ratings earn awards.
  const rating = job.performance >= 85 ? 'Outstanding' : job.performance >= 70 ? 'Exceeds Fully Successful' : job.performance >= 50 ? 'Fully Successful' : job.performance >= 30 ? 'Minimally Satisfactory' : 'Unsatisfactory';
  s.rating = rating;
  const raise = { Outstanding: 0.05, 'Exceeds Fully Successful': 0.03, 'Fully Successful': 0.015 }[rating] ?? 0;
  const C = corpsFor(state, job.professionId);
  s.pay = clamp(Math.round((s.pay * (1 + raise)) / 100) * 100, C.payMin, C.payMax);
  applySesPay(state, job);
  if (rating === 'Outstanding' || (rating === 'Exceeds Fully Successful' && rng.chance(0.5))) {
    const pct = rating === 'Outstanding' ? rng.float(0.1, 0.2) : rng.float(0.05, 0.1);
    const award = Math.round((s.pay * pct) / 100) * 100;
    ctx.earn(award, `${C.short} performance award`, { wage: true });
    s.awards = (s.awards ?? 0) + 1;
    ctx.log(`Your executive appraisal: ${rating}. A ${Math.round(pct * 100)}% performance award ($${award.toLocaleString()}).`, '📈', 'good');
  } else if (rating === 'Unsatisfactory' || rating === 'Minimally Satisfactory') {
    ctx.log(`Your executive appraisal: ${rating}. Two of those in three years and you're out of the ${C.short}.`, '📉', 'bad');
    s.lowRatings = (s.lowRatings ?? 0) + 1;
    if (s.lowRatings >= 2) return fallBack(ctx, 'removed for performance');
  }
  // Presidential Rank Awards: nominated by the agency, decided by a citizen panel.
  const years = state.character.age - s.since;
  // Presidential Rank Awards are American; elsewhere the honours list does that job.
  if (C.us && (s.type === 'career' || s.type === 'slst')) {
    const has = (id) => state.honors.some((h) => h.id === id);
    if (years >= 3 && job.performance >= 85 && !has('ses.meritorious') && rng.chance(0.12)) {
      const award = Math.round(s.pay * 0.2);
      ctx.earn(award, 'Presidential Rank Award', { wage: true });
      addHonor(state, { id: 'ses.meritorious', source: 'civil', name: 'Presidential Rank Award — Meritorious', icon: '🏅', prestige: 12, precedence: 30, citation: 'For sustained accomplishment as a senior career executive.', ribbon: [['#1a2e5a', 2], ['#c0a050', 1], ['#1a2e5a', 2]] });
      ctx.log(`The President conferred a Meritorious Rank Award on you — about 5% of career executives get one — with $${award.toLocaleString()}.`, '🏅', 'honor');
    } else if (years >= 6 && has('ses.meritorious') && job.performance >= 90 && !has('ses.distinguished') && rng.chance(0.06)) {
      const award = Math.round(s.pay * 0.35);
      ctx.earn(award, 'Presidential Rank Award', { wage: true });
      addHonor(state, { id: 'ses.distinguished', source: 'civil', name: 'Presidential Rank Award — Distinguished', icon: '🎖️', prestige: 25, precedence: 20, citation: 'For sustained extraordinary accomplishment; awarded to no more than 1% of career executives.', ribbon: [['#c0a050', 1], ['#1a2e5a', 3], ['#c0a050', 1]] });
      ctx.log(`You received a Distinguished Rank Award — the highest honor for a career executive — and $${award.toLocaleString()}.`, '🎖️', 'honor');
    }
  }
  const year = currentYear(state);
  // Political appointees leave with the administration that appointed them.
  if (s.type === 'pas' && year % 4 === 1 && s.lastTransitionYear !== year) {
    s.lastTransitionYear = year;
    if (rng.chance(0.7)) {
      demote(ctx, 'a new administration named its own appointee');
      s.type = 'career';
      ctx.log('A new President named your successor. You returned to the career executive ranks.', '🇺🇸', 'warn');
    }
    return;
  }
  if (s.type !== 'career') return;
  // A new administration every four years (career executives are protected for 120 days, then fair game).
  if (year % 4 === 1 && s.lastTransitionYear !== year) {
    s.lastTransitionYear = year;
    if (rng.chance(0.3) && !state.prompts.some((p) => p.type === 'ses.transition')) {
      ctx.prompt({ type: 'ses.transition', icon: C.us ? '🇺🇸' : '🏛️', title: C.us ? 'A New Administration' : 'A New Government', text: C.us ? 'The new political leadership arrived with its own priorities. After the 120-day moratorium, your new boss wants "a fresh team" running your organization.' : 'A new government arrived with its own priorities, and your new minister wants "a fresh team" running your organization.', options: [
        { id: 'adapt', label: '🤝 Brief them, earn their trust', hint: 'Smarts check' },
        { id: 'special', label: '📁 Accept a "special assistant" reassignment', hint: 'Same pay, no portfolio' },
        { id: 'retire', label: '🎖️ Retire', hint: 'If you\'re eligible' },
      ] });
    }
    return;
  }
  // Mobility: executives can be reassigned anywhere on short notice.
  if (years >= 2 && rng.chance(0.1) && !state.prompts.some((p) => p.type === 'ses.reassign')) {
    ctx.prompt({ type: 'ses.reassign', icon: '🧳', title: 'Directed Reassignment', text: C.us ? `Headquarters is reassigning you to lead an office across the country — 15 days' notice, as the SES rules allow. Decline, and you leave the SES.` : `Headquarters is moving you to lead another office, as ${C.short} mobility rules allow. Decline, and you leave the ${C.short}.`, options: [
      { id: 'go', label: '🧳 Go', hint: 'Relocation paid; a hard year at home' },
      { id: 'decline', label: '🙅 Decline', tone: 'danger', hint: `Back to ${C.fallback} — or retire if eligible` },
    ] });
  }
}

/** Presidential nominations for the very top posts. */
function nominationTick(ctx, job) {
  const { state, rng } = ctx;
  if (abroad(state)) return;
  const p = getProfession(job.professionId);
  const idx = p.levels.findIndex((l) => l.id === job.levelId);
  const top = p.levels.find((l, i) => i > idx && l.ses === 'pas');
  if (!top || state.prompts.some((x) => x.type === 'ses.nomination')) return;
  const years = state.character.age - (ses(state).since ?? state.character.age);
  if (years < 3 || job.performance < 80 || !rng.chance(0.1)) return;
  ctx.prompt({ type: 'ses.nomination', icon: '🏛️', title: 'A Presidential Nomination', text: `The White House wants to nominate you as ${top.title}. That means FBI and ethics vetting, financial disclosure, a Senate committee hearing and a floor vote — which can take a year, and can fail.`, options: [
    { id: 'accept', label: '✍️ Accept the nomination' },
    { id: 'decline', label: '🙅 Stay where you are' },
  ], data: { levelId: top.id } });
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const SeniorExecutiveModule = {
  id: 'ses',
  order: 30.87,
  init(state) {
    state.ses ??= { stage: null, cdpYears: 0, cdpDetails: [], type: null, since: null, probationUntil: null, pay: null, rating: null, awards: 0, apps: 0, lastTransitionYear: null };
    // Saves from before the SES existed: someone already in an executive post was, in effect, appointed.
    const job = state.career?.job;
    const kind = sesKindOf(job);
    if (kind && state.credentials?.held && !state.credentials.held.sesCert) {
      state.credentials.held.sesCert = { earnedAge: state.character.age, renewedAge: state.character.age, status: 'active' };
      if (kind !== 'pas' && state.ses.stage !== 'member') Object.assign(state.ses, { stage: 'member', type: 'career', since: state.character.age, pay: clamp(job.salary, SES_PAY.min, SES_PAY.max) });
    }
  },
  setup(engine) {
    // Leaving federal service ends your SES membership (the certification stays with you).
    engine.bus.on('career:separated', ({ ctx }) => {
      const s = ctx.state.ses;
      if (s?.stage === 'member') Object.assign(s, { stage: hasCredential(ctx.state, 'sesCert') ? 'certified' : null, pay: null, probationUntil: null });
      if (s?.stage === 'cdp') Object.assign(s, { stage: null, cdpYears: 0 });
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career.job;
    const s = ses(state);
    if (!job || !isFederal(job) || !job.paidThisYear) return;
    if (s.stage === 'cdp') cdpTick(ctx);
    else if (s.stage === 'member') {
      memberTick(ctx, job);
      if (state.ses.stage === 'member' && state.career.job) nominationTick(ctx, state.career.job);
    } else if (s.stage === 'certified' && sesLevelFor(job) && !state.prompts.some((p) => p.type === 'ses.offer') && ctx.rng.chance(0.4)) {
      const level = sesLevelFor(job);
      ctx.prompt({ type: 'ses.offer', icon: '🏛️', title: 'An Executive Post', text: `As a certified graduate, you can be appointed noncompetitively. Your agency offers you ${level.title}.`, options: [{ id: 'accept', label: `🏛️ Accept: ${level.title}` }, { id: 'decline', label: '🙅 Not yet' }] });
    }
  },
  actions: {
    /** Apply to the SES Candidate Development Program. */
    cdp(ctx) {
      const { state, rng } = ctx;
      const s = ses(state);
      const r = sesReadiness(state);
      if (!r.ok) return ctx.toast(`Not yet: ${r.checks.find(([, ok]) => !ok)[0]}`, 'warn');
      if (s.stage) return ctx.toast(s.stage === 'cdp' ? 'You\'re in the program' : 'Already certified', 'warn');
      if (yearlyCount(state, 'ses.apply')) return ctx.toast('One application a year', 'warn');
      bumpYearly(state, 'ses.apply');
      s.apps += 1;
      const job = state.career.job;
      const C = corpsFor(state, job.professionId);
      const odds = clamp(0.12 + (job.performance - 70) / 120 + (state.stats.smarts - 60) / 300 + Math.min(0.1, supervisoryYears(state) * 0.015), 0.05, 0.5);
      ctx.stat('stress', 4);
      if (rng.chance(odds)) {
        Object.assign(s, { stage: 'cdp', cdpYears: 0, cdpDetails: [] });
        ctx.log(`You were selected for the ${C.programme} — a two-year path to the ${C.name}.`, '🎓', 'milestone');
      } else ctx.log(`The ${C.programme} took ${rng.int(12, 25)} of several hundred applicants. You weren't one of them this year.`, '📨', 'warn');
    },
    /** Apply to an SES vacancy with written ECQ narratives. */
    ecq(ctx) {
      const { state, rng } = ctx;
      const s = ses(state);
      const job = state.career.job;
      const r = sesReadiness(state);
      if (!r.ok) return ctx.toast(`Not yet: ${r.checks.find(([, ok]) => !ok)[0]}`, 'warn');
      if (s.stage === 'member' || s.stage === 'cdp') return;
      if (yearlyCount(state, 'ses.apply')) return ctx.toast('One application a year', 'warn');
      const C = corpsFor(state, job.professionId);
      bumpYearly(state, 'ses.apply');
      s.apps += 1;
      ctx.stat('stress', 6);
      // Certified candidates skip the narratives.
      const certified = hasCredential(state, 'sesCert');
      const narrative = certified ? 1 : clamp((state.stats.smarts + rng.int(-25, 25)) / 100, 0, 1);
      const pick = clamp(0.1 + (job.performance - 70) / 150 + narrative * 0.15 + Math.min(0.08, supervisoryYears(state) * 0.01) + (certified ? 0.1 : 0), 0.04, 0.55);
      if (!rng.chance(pick)) return ctx.log(C.us ? `You spent weekends on ten pages of ECQ narratives. The Executive Resources Board picked someone else${narrative < 0.5 ? ' — your narratives read like a job description, not accomplishments' : ''}.` : `You wrote your statement against ${C.quals} and sat the assessment centre. The panel picked someone else.`, '📨', 'warn');
      if (!certified && !rng.chance(clamp(0.55 + narrative * 0.35, 0.5, 0.9))) return ctx.log(C.us ? 'The agency selected you — but OPM\'s Qualifications Review Board didn\'t certify your ECQs. The job went to the runner-up.' : `The department wanted you, but ${C.board} didn't approve the appointment. The job went to the runner-up.`, '📝', 'bad');
      becomeExecutive(ctx, 'career', C.us ? 'The Executive Resources Board selected you and the Qualifications Review Board certified your ECQs.' : `The selection panel chose you and ${C.board} approved the appointment.`);
    },
    /** Senior Level / Senior Technical: an expert's route. */
    slst(ctx) {
      const { state, rng } = ctx;
      const s = ses(state);
      const r = slstReadiness(state);
      if (abroad(state)) return ctx.toast('Senior Level / Senior Technical posts are a US federal system', 'warn');
      if (!r.ok) return ctx.toast(`Not yet: ${r.checks.find(([, ok]) => !ok)[0]}`, 'warn');
      if (s.stage === 'member') return;
      if (yearlyCount(state, 'ses.apply')) return ctx.toast('One application a year', 'warn');
      bumpYearly(state, 'ses.apply');
      if (rng.chance(0.25 + (state.career.job.performance - 80) / 80)) becomeExecutive(ctx, 'slst', 'A review panel of senior scientists and executives approved your appointment.');
      else ctx.log('The SL/ST position went to an outside expert.', '📨', 'warn');
    },
    /** Step down to GS-15 voluntarily. */
    stepDown(ctx) {
      const s = ses(ctx.state);
      if (s.stage !== 'member') return;
      fallBack(ctx, 'by request');
    },
  },
  resolvers: {
    detail(ctx, _data, optionId) {
      const s = ses(ctx.state);
      const d = DETAILS.find((x) => x.id === optionId);
      if (!d || s.stage !== 'cdp') return;
      s.cdpDetails.push(d.id);
      ctx.stat('smarts', 2);
      ctx.stat('stress', 4);
      ctx.log(`Your developmental assignment: ${d.label.replace(/^\S+ /, '').toLowerCase()}. Good material for your "${d.ecq}" narrative.`, '🧭', 'good');
    },
    offer(ctx, _data, optionId) {
      if (optionId === 'accept' && ses(ctx.state).stage === 'certified') becomeExecutive(ctx, 'career', `You accepted a noncompetitive ${corpsFor(ctx.state, ctx.state.career.job?.professionId).short} appointment.`);
    },
    reassign(ctx, _data, optionId) {
      const { state } = ctx;
      if (optionId === 'go') {
        ctx.stat('happiness', -6);
        ctx.stat('stress', 6);
        if (state.career.job) state.career.job.performance = Math.min(100, state.career.job.performance + 4);
        ctx.log('You took the reassignment and moved across the country. New office, new staff, same pay.', '🧳');
      } else if (state.character.age >= 55 && federalYears(state) >= 20) leaveJob(ctx, 'Retired (declined a directed reassignment)');
      else fallBack(ctx, 'declined a directed reassignment');
    },
    transition(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job) return;
      if (optionId === 'adapt') {
        if (state.stats.smarts + rng.int(-20, 20) > 60) ctx.log('Your briefings won them over. They kept you on — and leaned on you.', '🤝', 'good');
        else { job.performance = Math.max(0, job.performance - 10); ctx.log('They nodded politely and cut you out of the important meetings.', '🧊', 'warn'); }
      } else if (optionId === 'special') {
        job.performance = Math.max(0, job.performance - 5);
        ctx.stat('happiness', -8);
        ctx.log('You became a "senior advisor" with no staff and no portfolio. Your pay didn\'t change.', '📁', 'warn');
      } else if (state.character.age >= 55 && federalYears(state) >= 20) leaveJob(ctx, abroad(state) ? 'Retired (change of government)' : 'Retired (change of administration)');
      else ctx.log('You aren\'t eligible to retire yet. You stayed.', '🎖️');
    },
    nomination(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'accept') return;
      ctx.stat('stress', 10);
      if (criminalRecord(state).length && rng.chance(0.6)) return ctx.log('Vetting turned up old problems. The White House quietly withdrew your nomination.', '📰', 'bad');
      if (!rng.chance(0.7)) return ctx.log('Your nomination stalled in the Senate and expired at the end of the session.', '⏳', 'warn');
      const job = state.career.job;
      const level = levelById(getProfession(job.professionId), data.levelId);
      level.appointed = false;
      try { promote(ctx, data.levelId); } finally { level.appointed = true; }
      ses(state).type = 'pas';
      ctx.log(`The Senate confirmed you. You are the ${level.title}.`, '🏛️', 'milestone');
    },
  },
};
