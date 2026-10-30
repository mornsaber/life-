/**
 * Running the place. At the top of a hospital, a school (or a school district), a police force
 * or a university, the job is the institution itself:
 *
 *   Budget      each year: hold the line, invest in staff, cut costs, or lobby for more money.
 *               Recessions squeeze public budgets.
 *   Staffing    how many of the posts are filled; cuts empty them, investment fills them.
 *   Quality     the outcomes people care about (patients, exam results, crime solved, research).
 *   Inspection  every three years, an inspector's rating (Outstanding · Good · Requires
 *               improvement · Inadequate); two Inadequates and you're out.
 *   League      each year, a rank among the region's institutions, in the papers.
 *   Scandals    the avoidable death, the cheating ring, the misconduct case: an open inquiry,
 *               a cover-up, or a scapegoat.
 *
 * state.institution = { kind, name, since, budget, staffing, quality, morale, rank, ratings: [], inadequate, coverUp }
 */
import { Random, clamp } from '../../core/Random.js';

export const KINDS = {
  hospital: { label: 'Hospital', icon: '🏥', quality: 'Patient outcomes', inspector: { US: 'the Joint Commission', GB: 'the Care Quality Commission' }, scandal: [
    ['A patient died on a corridor trolley after waiting fourteen hours in A&E.', 'death'], ['Managers were caught moving patients on paper to meet a waiting-time target.', 'targets'], ['A surgeon with a high complication rate kept operating after complaints.', 'surgeon'],
  ] },
  school: { label: 'School', icon: '🏫', quality: 'Exam results', inspector: { US: 'the state education department', GB: 'Ofsted', FR: 'the rectorat inspectors' }, scandal: [
    ['Teachers were found coaching pupils during exams.', 'cheating'], ['A bullying case ended with a pupil in hospital, and the family says the school ignored months of warnings.', 'bullying'], ['A teacher\'s affair with a pupil was reported to you a year ago and nothing was done.', 'safeguarding'],
  ] },
  police: { label: 'Police Force', icon: '🚔', quality: 'Crimes solved', inspector: { US: 'the state attorney general\'s office', GB: 'HM Inspectorate of Constabulary' }, scandal: [
    ['Officers were caught downgrading crimes to improve the figures.', 'figures'], ['A video shows officers beating a handcuffed man.', 'force'], ['A detective has been selling information to a drugs gang.', 'corruption'],
  ] },
  university: { label: 'University', icon: '🎓', quality: 'Research and teaching', inspector: { US: 'the accreditor', GB: 'the Office for Students' }, scandal: [
    ['A star professor\'s data turns out to be fabricated.', 'fraud'], ['Students occupy the admin building over fees and you.', 'protest'], ['Admissions took bribes from wealthy parents.', 'admissions'],
  ] },
};
const RATINGS = ['Inadequate', 'Requires improvement', 'Good', 'Outstanding'];

/** Is this job the head of an institution, and of which kind? */
export function institutionKind(job) {
  if (!job) return null;
  const { professionId: p, levelId: l } = job;
  if ((p === 'medical' && l === 'chief') || (p === 'nursing' && l === 'cno')) return 'hospital';
  if (p === 'education' && /^(principal|superintendent)/.test(l)) return 'school';
  if ((p === 'police' && /^chief/.test(l)) || (p === 'statePolice' && /^superintendent/.test(l))) return 'police';
  if (p === 'college' && ['provost', 'dean'].includes(l)) return 'university';
  if (job.headOf && !job.headOf.deptId && /hospital/i.test(job.employer?.name ?? '')) return 'hospital';
  return null;
}
export const institutionOf = (state) => (state.institution && state.institution.kind === institutionKind(state.career.job) ? state.institution : null);
const inspectorOf = (state, kind) => KINDS[kind].inspector[state.character.countryId ?? 'US'] ?? 'the national inspectorate';
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 92143 + state.character.age * 613 + 0x1e5) >>> 0);

export function institutionTick(main) {
  const { state } = main;
  const job = state.career.job;
  const kind = institutionKind(job);
  if (!kind) { if (state.institution) state.institution = null; return; }
  let I = state.institution;
  if (!I || I.kind !== kind || I.name !== job.employer.name) {
    I = state.institution = { kind, name: job.employer.name, since: state.character.age, budget: 0, staffing: 82, quality: 55, morale: 60, rank: null, ratings: [], inadequate: 0, coverUp: null };
    main.log(`You now run ${job.employer.name}. The budget, the staff, the results and the inspectors are yours.`, KINDS[kind].icon, 'milestone');
  }
  const rng = sideRng(state);
  const recession = state.economy?.phase === 'recession';
  // The year: staffing and morale drive quality; the budget drives staffing.
  if (recession) I.budget -= 1;
  I.staffing = Math.round(clamp(I.staffing + I.budget * 2 + rng.int(-3, 2), 40, 100));
  I.quality = Math.round(clamp(I.quality + (I.staffing - 80) / 6 + (I.morale - 55) / 12 + rng.int(-4, 4), 5, 98));
  I.morale = Math.round(clamp(I.morale + (I.staffing - 80) / 8 + rng.int(-3, 3), 10, 95));
  // League table.
  const field = 40;
  I.rank = clamp(Math.round(field - (I.quality / 100) * field + rng.int(-4, 4)), 1, field);
  main.log(`${job.employer.name} was ${I.rank === 1 ? 'top of' : `ranked ${I.rank} of ${field} in`} the regional league table this year.`, I.rank <= 5 ? '🏆' : I.rank >= 35 ? '📉' : '📊', I.rank <= 5 ? 'good' : I.rank >= 35 ? 'warn' : 'info');
  main.emit('career:adjust', { performance: Math.round((I.quality - 55) / 6) });
  // A buried scandal surfaces.
  if (I.coverUp && rng.chance(0.35)) {
    I.coverUp = null;
    main.log('The cover-up came out. Your board, the press and the regulator all asked the same question: what did you know?', '📰', 'bad');
    main.emit('fame:scandal', { severity: 9, headline: `a cover-up at ${job.employer.name}` });
    if (rng.chance(0.6)) return main.emit('career:resign', { reason: 'Forced out over a cover-up', fired: true });
  }
  // Inspection every third year.
  if ((state.character.age - I.since) % 3 === 2) {
    const score = (I.quality * 0.7 + I.staffing * 0.3) / 100 + rng.float(-0.12, 0.12);
    const r = score >= 0.78 ? 3 : score >= 0.6 ? 2 : score >= 0.45 ? 1 : 0;
    I.ratings.push({ age: state.character.age, rating: RATINGS[r] });
    I.inadequate = r === 0 ? I.inadequate + 1 : 0;
    main.log(`Inspection by ${inspectorOf(state, kind)}: ${RATINGS[r]}.`, r >= 2 ? '✅' : '⚠️', r >= 2 ? 'good' : 'bad');
    main.emit('career:adjust', { performance: [-15, -6, 4, 10][r] });
    if (r === 3) main.emit('fame:buzz', { amount: 2 });
    if (I.inadequate >= 2) return main.emit('career:resign', { reason: 'Removed after two Inadequate inspections', fired: true });
  }
  // The budget decision.
  const ctx = { ...main, rng };
  ctx.prompt({ type: 'institutions.budget', icon: KINDS[kind].icon, title: `The ${KINDS[kind].label}'s Budget`, text: `Staffing ${I.staffing}% · ${KINDS[kind].quality} ${I.quality}/100 · morale ${I.morale}/100${recession ? ' · the recession has cut your funding' : ''}.`, data: {}, options: [
    { id: 'hold', label: '⚖️ Hold the line' },
    { id: 'invest', label: '👩‍⚕️ Invest in staff', hint: 'Better next year; a deficit now' },
    { id: 'cut', label: '✂️ Cut costs', hint: 'Balanced books; unhappy staff' },
    { id: 'lobby', label: '🏛️ Lobby for more money', hint: 'Sometimes it works' },
  ] });
  // A scandal.
  if (rng.chance(0.18)) {
    const [text, id] = rng.pick(KINDS[kind].scandal);
    ctx.prompt({ type: 'institutions.scandal', icon: '📰', title: 'On Your Watch', text, data: { id }, options: [
      { id: 'inquiry', label: '🔍 Commission an independent inquiry and publish it', hint: 'Painful now; trusted later' },
      { id: 'scapegoat', label: '👉 Suspend the people directly responsible', hint: 'Fast; staff will remember' },
      { id: 'bury', label: '🤐 Handle it quietly', hint: 'If it comes out, it\'s about you', tone: 'danger' },
    ] });
  }
}

export const InstitutionResolvers = {
  budget(ctx, data, optionId) {
    const I = ctx.state.institution;
    if (!I) return;
    if (optionId === 'invest') { I.budget = Math.min(3, I.budget + 1); I.morale = Math.min(95, I.morale + 4); return ctx.log('You hired: more staff on the rota next year, and a deficit the finance director warned you about.', '👩‍⚕️', 'info'); }
    if (optionId === 'cut') { I.budget = Math.max(-3, I.budget - 1); I.morale = Math.max(10, I.morale - 8); ctx.emit('career:adjust', { boss: 5 }); return ctx.log('You froze hiring and cut the overtime budget. The board was pleased; the staff room wasn\'t.', '✂️', 'info'); }
    if (optionId === 'lobby') { if (ctx.rng.chance(0.35)) { I.budget = Math.min(3, I.budget + 1); return ctx.log('Your lobbying paid off: extra funding from the ministry.', '🏛️', 'good'); } return ctx.log('Ministers listened politely. No money.', '🏛️', 'warn'); }
    I.budget = Math.round(I.budget * 0.5);
    ctx.log('You held the budget steady.', '⚖️', 'info');
  },
  scandal(ctx, data, optionId) {
    const I = ctx.state.institution;
    if (!I) return;
    if (optionId === 'inquiry') { I.quality = Math.min(98, I.quality + 4); ctx.emit('career:adjust', { performance: -4, boss: -4 }); ctx.emit('fame:buzz', { amount: 2 }); return ctx.log('The inquiry\'s report was damning — and you published every word. Trust began to rebuild.', '🔍', 'info'); }
    if (optionId === 'scapegoat') { I.morale = Math.max(10, I.morale - 10); return ctx.log('You suspended the staff involved. The story moved on; the staff didn\'t.', '👉', 'warn'); }
    I.coverUp = { id: data.id, age: ctx.state.character.age };
    ctx.log('You handled it quietly. For now.', '🤐', 'warn');
  },
};

export const InstitutionsModule = { id: 'institutions', order: 31.6, onAgeUp: institutionTick, resolvers: InstitutionResolvers };
