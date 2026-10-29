/**
 * Moving between countries: visas, permanent residence, citizenship,
 * languages, removal, and the passports your children inherit.
 *
 * state.migration = {
 *   birthCountry,
 *   residences: { [country]: { status: 'visa'|'permanent', visa, arrived, expires?, permanentSince?, grace?, leftAt?, removal? } },
 *   languages: { [language]: progress 0–100 },
 *   history: [{ age, from, to, visa }],
 * }
 * state.character.citizenships = ['US', …] once you've lived anywhere but your birth country.
 *
 * Your job, office and home don't come with you (an intra-company transfer
 * keeps the job; a remote private-sector job stays remote). Public-pension
 * records stay with each country and pay out together when you claim.
 */
import { exitBlock } from './Regimes.js';
import { bodyOfJob, joinLocalUnit } from '../org/Bodies.js';
import { COUNTRIES, isCitizen, citizenshipsOf } from './Countries.js';
import {
  IMMIGRATION, VISA_KINDS, EMIGRATION_COST, visaEligibility, residencyOf, residencesOf, birthCountryOf, prYearsLeft, naturalizationYearsLeft,
  speaksLocal, localLanguage, nativeLanguages, LANGUAGE_FLUENT, nationalityCode, ASYLUM, ASYLUM_COST, NON_QUALIFYING_VISAS, freeMovementTo, isEU,
} from './Immigration.js';
import { homeDanger, underMobilization, warIn } from './War.js';
import { spouseOf } from '../people/People.js';
import { REGIONS, regionsIn, changeRegion, countryIdOf, keepsBerth } from '../life/Regions.js';
import { NATIONAL_PROFESSIONS } from '../career/JobTrees.js';
import { setNameCountry, yearlyCount, bumpYearly, canAfford, visibleRecord } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { stampDegrees } from '../education/EducationEngine.js';
import { fromPacks } from './packs/index.js';

export const LANGUAGE_CLASS_COST = 1200;
const EU = ['DE', 'IT'];

export function ensureMigration(state) {
  state.migration ??= { birthCountry: state.character.countryId ?? 'US', residences: {}, languages: {}, history: [] };
  state.character.citizenships ??= [state.migration.birthCountry];
  return state.migration;
}

export { keepsBerth };

/** Why you can't leave the country right now, or null. */
export function departureBlock(state) {
  if (state.character.age < 18) return 'You can move abroad on your own at 18';
  if (state.legal.incarceration) return 'Incarcerated';
  if (state.legal.probationYears > 0) return 'On probation: the court holds your passport';
  // A sealift officer's reserve duty is a few weeks a year: you can live abroad and fly home for it.
  if (state.military.service && !(state.military.service.component === 'reserve' && state.military.service.mos === 'navy.1665')) return 'Finish your military service first';
  if (underMobilization(state)) return 'General mobilization: men 18–60 can\'t leave the country';
  if (state.education.enrolled) return 'Finish or withdraw from school first';
  if (state.judiciary?.seat) return 'Resign from the bench first';
  return exitBlock(state);
}

/** Your routes into a country: as a citizen, a returning resident, or by visa. */
export function routesTo(state, to) {
  const here = countryIdOf(state);
  if (to === here) return [];
  if (isCitizen(state, to)) return [{ kind: 'citizen', ok: true, odds: 1, fee: 0, label: `${COUNTRIES[to].flag} Move home (citizen)` }];
  const res = residencesOf(state)[to];
  if (res?.status === 'permanent' && res.leftAt != null && state.character.age - res.leftAt <= IMMIGRATION[to].prLapse) return [{ kind: 'resident', ok: true, odds: 1, fee: 0, label: '🪪 Return as a permanent resident' }];
  // EU, Common Travel Area and trans-Tasman citizens just move: no visa, the right to live and work.
  const free = freeMovementTo(citizenshipsOf(state), to);
  if (free && !bannedFrom(state, to)) return [{ kind: 'freeMovement', ok: true, odds: 1, fee: 0, label: `🤝 Move freely (${free})`, scheme: free }];
  const banned = bannedFrom(state, to);
  const visas = Object.keys(IMMIGRATION[to].visas).filter((kind) => IMMIGRATION[to].visas[kind]).map((kind) => (banned
    ? { kind, ok: false, reason: `Barred from re-entry until age ${state.migration.bans[to]}`, label: `${VISA_KINDS[kind].icon} ${IMMIGRATION[to].visas[kind].name}` }
    : { kind, ...visaEligibility(state, to, kind), label: `${VISA_KINDS[kind].icon} ${IMMIGRATION[to].visas[kind].name}` }));
  const asylum = asylumRoute(state, to);
  return [...(asylum ? [asylum] : []), ...visas, irregularRoute(state, to)];
}

/**
 * Crossing without papers: a smuggler, a night crossing, a boat. It usually works — and then you
 * live undocumented: cash work only, no benefits, and removal with a re-entry ban if you're caught.
 */
export const SMUGGLER_FEE = { US: 9000, GB: 12000, AU: 15000, NZ: 15000, IE: 10000, CA: 9000, '*': 7000 };
export function irregularRoute(state, to) {
  const banned = bannedFrom(state, to);
  const island = ['AU', 'NZ', 'JP', 'GB', 'IE', 'SG'].includes(to);
  const odds = clamp((island ? 0.45 : 0.7) - (banned ? 0.15 : 0), 0.2, 0.8);
  return { kind: 'irregular', ok: state.character.age >= 16, reason: 'Too young to make the crossing alone', odds, fee: SMUGGLER_FEE[to] ?? SMUGGLER_FEE['*'], illegal: true,
    label: `🌙 Cross without papers (about ${Math.round(odds * 100)}% get through)`, rule: { name: 'irregular crossing' } };
}

/**
 * Ways out of living undocumented — all of them hard. A country's regularisation for long
 * residence and work (Spain's arraigo after three years, Italy's and France's after five), a rare
 * amnesty, or marriage to a citizen (in the US, only after leaving and a waiver of the ten-year bar).
 */
export const REGULARIZE = {
  ES: { years: 3, odds: 0.45, name: 'arraigo social (settled residence)' }, IT: { years: 5, odds: 0.3, name: 'regolarizzazione' }, FR: { years: 5, odds: 0.3, name: 'admission exceptionnelle au séjour' },
  GB: { years: 20, odds: 0.5, name: 'leave to remain on long residence (20 years)' }, IE: { years: 8, odds: 0.4, name: 'the undocumented regularisation scheme' }, BR: { years: 4, odds: 0.5, name: 'autorização de residência' },
  MX: { years: 4, odds: 0.45, name: 'regularización migratoria' }, US: { years: 10, odds: 0.12, name: 'cancellation of removal (10 years, exceptional hardship)' },
  '*': { years: 10, odds: 0.15, name: 'regularisation on humanitarian grounds' },
};
export function regularizeOptions(state) {
  const res = residencyOf(state);
  if (res?.status !== 'undocumented') return [];
  const here = countryIdOf(state);
  const age = state.character.age;
  const years = age - (res.overstaySince ?? res.arrived ?? age);
  const rule = REGULARIZE[here] ?? REGULARIZE['*'];
  const spouse = spouseOf(state);
  const citizenSpouse = spouse && nationalityCode(spouse) === here;
  const used = (res.attempts ?? 0) >= 3;
  return [
    { id: 'residence', label: `🏠 Apply for ${rule.name}`, ok: years >= rule.years && !used, reason: used ? 'You\'ve used up your chances' : `Needs ${rule.years} years here (you have ${years})`, odds: rule.odds * (state.career.job ? 1.2 : 0.8), fee: 4000 },
    { id: 'marriage', label: '💍 Apply through your marriage to a citizen', ok: Boolean(citizenSpouse) && !used, reason: citizenSpouse ? 'You\'ve used up your chances' : 'Needs a spouse who is a citizen here', odds: here === 'US' ? 0.25 : 0.55, fee: 6000 },
    ...(res.amnesty ? [{ id: 'amnesty', label: '📜 Apply under the amnesty', ok: true, odds: 0.75, fee: 1500 }] : []),
  ];
}

/** Fleeing a war: claim asylum on arrival (only while the danger at home is real). */
export function asylumRoute(state, to) {
  const danger = homeDanger(state);
  if (danger < 0.15) return null;
  const law = ASYLUM[to];
  if (!law) return null;
  const war = warIn(state, countryIdOf(state));
  const eu = isEU(to);
  const temporary = Boolean(law.temporary && eu && war.intensity >= 3 && war.homeFront >= 0.4);
  const odds = temporary ? 1 : Math.min(0.95, Math.max(law.odds, law.humanitarian ?? 0) + danger * 0.5);
  const label = temporary ? `🆘 ${law.temporary}` : `🆘 ${law.name}`;
  if (state.character.age < 16) return { kind: 'asylum', ok: false, reason: 'Minors flee with their families', label, odds, fee: 0 };
  return { kind: 'asylum', ok: true, odds, fee: 0, temporary, label, rule: { name: temporary ? law.temporary : law.name } };
}

/** Move your life to another country. */
export function arrive(ctx, to, { visa = null, reason = '', keepJob = false } = {}) {
  const { state } = ctx;
  const m = ensureMigration(state);
  const from = countryIdOf(state);
  // Qualifications keep the country that granted them.
  stampDegrees(state);
  const age = state.character.age;
  // Public-pension records stay with the country that kept them.
  const r = state.retirement;
  r.records ??= {};
  if (r.ssEarnings.length) r.records[from] = [...(r.records[from] ?? []), ...r.ssEarnings];
  r.ssEarnings = r.records[to] ?? [];
  delete r.records[to];
  // A permanent residence left behind lapses after a while away.
  if (m.residences[from]) m.residences[from].leftAt = age;
  (m.lastRegion ??= {})[from] = state.character.regionId;
  const job = state.career.job;
  const national = job && (NATIONAL_PROFESSIONS[job.professionId] || job.sector === 'federal');
  const seafarer = keepsBerth(job);
  const stays = job && ((!national && job.sector === 'private' && (keepJob || job.remote)) || seafarer);
  if (job && !stays) ctx.emit('career:resign', { reason: `Moved to ${COUNTRIES[to].name}` });

  if (to === 'US') delete state.character.countryId;
  else state.character.countryId = to;
  setNameCountry(to);
  ctx.emit('migration:moved', { from, to });

  if (!isCitizen(state, to)) {
    const old = m.residences[to];
    if (old?.status === 'permanent' && old.leftAt != null && age - old.leftAt <= IMMIGRATION[to].prLapse) {
      // Coming back: the years away don't count toward citizenship.
      old.qualifyingSince = (old.qualifyingSince ?? old.arrived) + (age - old.leftAt);
      delete old.leftAt;
    }
    else if (visa === 'irregular') {
      m.residences[to] = { status: 'undocumented', visa: 'irregular', arrived: age, overstaySince: age, from, irregular: true };
    } else if (visa === 'asylum' || visa === 'temporary') {
      const law = ASYLUM[to];
      m.residences[to] = visa === 'temporary'
        ? { status: 'refugee', visa, arrived: age, grantedAt: age, from, temporary: true }
        : { status: 'asylum', visa, arrived: age, qualifyingSince: null, from, decisionAt: age + law.decision, workFrom: age + law.workAfter, odds: asylumRoute(state, to)?.odds ?? law.odds };
    } else {
      // Free movement: the right to live and work, without a visa to run out.
      const rule = visa === 'freeMovement' ? { permanent: true } : IMMIGRATION[to].visas[visa] ?? {};
      if (visa === 'workingHoliday') m.whvUsed = [...(m.whvUsed ?? []), to];
      m.residences[to] = { status: rule.permanent ? 'permanent' : 'visa', visa, ...(visa === 'freeMovement' ? { scheme: freeMovementTo(citizenshipsOf(state), to) } : {}), arrived: age, qualifyingSince: NON_QUALIFYING_VISAS.includes(visa) ? null : age, ...(rule.years ? { expires: age + rule.years } : {}), ...(rule.permanent ? { permanentSince: age } : {}) };
    }
  }
  m.history.push({ age, from, to, visa });
  // Back to where you lived before, or the country's biggest city.
  const city = REGIONS[m.lastRegion?.[to]] ?? regionsIn(to)[0];
  changeRegion(ctx, city.id, reason || `You landed in ${COUNTRIES[to].name} ${COUNTRIES[to].flag}.`, { voluntary: true, crossBorder: true });
  const res = m.residences[to];
  if (res?.status === 'asylum') ctx.log(`You claimed asylum at the border: ${ASYLUM[to].name}. You'll live in reception housing until a decision${ASYLUM[to].workAfter ? `, and can't work for the first ${ASYLUM[to].workAfter === 1 ? 'year' : `${ASYLUM[to].workAfter} years`}` : ''}.`, '🆘', 'warn');
  else if (res?.temporary) ctx.log(`You were granted ${ASYLUM[to].temporary} at the border: the right to live, work and study here while the war lasts.`, '🆘', 'good');
  else if (res?.status === 'visa' && res.visa === 'student') ctx.log(`Your ${IMMIGRATION[to].visas.student.name} depends on studying here: enroll at a school this year (School tab).`, '🎓', 'warn');
  else if (res?.status === 'visa' && res.visa === 'work' && !stays) ctx.log(`Your ${IMMIGRATION[to].visas.work.name} needs a sponsoring employer: find a job here within the year (Jobs tab).`, '💼', 'warn');
  if (stays && job.employer) job.employer.stateId = REGIONS[state.character.regionId]?.state ?? job.employer.stateId;
  // A unit of an international body (a diocese of the Catholic Church): you serve in the local unit here.
  if (stays && bodyOfJob(job)) joinLocalUnit(ctx);
  // A multinational's staff work in its office in the country they're in.
  if (stays && !seafarer && !bodyOfJob(job) && !job.remote) job.employer.division = to === job.employer.homeCountry ? null : `${COUNTRIES[to].name} office`;
  if (stays && !bodyOfJob(job)) job.employer.homeCountry ??= from;
  if (seafarer) ctx.log(`You kept your berth with ${job.employer.name}: you'll fly out from ${COUNTRIES[to].name} to join each ship, and home again on leave.`, '🚢', 'good');
  else if (stays && bodyOfJob(job)) { /* logged by joinLocalUnit */ } else if (stays) ctx.log(`${job.employer.name} kept you on${job.remote ? ' remotely' : ' at its office here'}.`, '💼', 'good');
  if (!speaksLocal(state, to)) ctx.log(`You don't speak ${localLanguage(to)} yet. Living here, you'll pick it up — classes speed it up.`, '🗣️', 'info');
  ctx.stat('stress', 8);
}

/** Re-entry bans after an overstay ends in removal (years). */
const OVERSTAY_BAN = { US: 10, GB: 10, AU: 3, CA: 1, JP: 5, KR: 5, DE: 5, FR: 5, IT: 5, MX: 1, PH: 5, IN: 5 };
fromPacks(OVERSTAY_BAN, 'OVERSTAY_BAN');
export const bannedFrom = (state, cc) => (state.migration?.bans?.[cc] ?? 0) > state.character.age;

/** A visa ran out: leave, or stay on without status. */
function lapsed(ctx, res, why) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'migration.lapsed')) return;
  ctx.prompt({
    type: 'migration.lapsed', icon: '🛂', title: 'Your Visa Has Run Out',
    text: `${why} You have to leave ${COUNTRIES[countryIdOf(state)].name} — or stay without papers.`,
    options: [
      { id: 'leave', label: '✈️ Leave on time', hint: 'Your record stays clean for future visas' },
      { id: 'overstay', label: '🤫 Stay on without status', hint: 'No legal work, no benefits, deportation and a re-entry ban if caught', illegal: 'overstaying a visa' },
    ],
    data: {},
  });
}

/** A year living without status: formal employers check papers; immigration may catch up with you. */
function undocumentedYear(ctx, res) {
  const { state, rng } = ctx;
  const here = countryIdOf(state);
  const job = state.career.job;
  // Formal employers run right-to-work checks; cash-in-hand work doesn't ask.
  if (job && !job.informal && rng.chance(0.5)) {
    ctx.emit('career:resign', { reason: 'Failed a right-to-work check', fired: true });
    ctx.log('Your employer ran a right-to-work check and let you go.', '🛂', 'bad');
  }
  ctx.stat('stress', 6);
  const caught = rng.chance(0.08 + (state.legal.record.some((r) => r.age === state.character.age) ? 0.6 : 0));
  if (!caught) return;
  const years = state.character.age - (res.overstaySince ?? state.character.age);
  const ban = years >= 1 ? OVERSTAY_BAN[here] ?? 5 : Math.ceil((OVERSTAY_BAN[here] ?? 5) / 3);
  ensureMigration(state).bans = { ...(state.migration.bans ?? {}), [here]: state.character.age + ban };
  removal(ctx, `Immigration enforcement caught up with you after ${years || 'less than a'} year${years === 1 ? '' : 's'} without status. You're barred from returning for ${ban} years.`);
}

/** Sent back to a country whose passport you hold. */
function removal(ctx, why) {
  const { state } = ctx;
  const here = countryIdOf(state);
  const home = citizenshipsOf(state).includes(birthCountryOf(state)) ? birthCountryOf(state) : citizenshipsOf(state)[0];
  delete state.migration.residences[here];
  ctx.log(`${why} ${why.startsWith('You left') ? `You went back to ${COUNTRIES[home].name}.` : `You were removed from ${COUNTRIES[here].name} and sent back to ${COUNTRIES[home].name}.`}`, '🛂', why.startsWith('You left') ? 'info' : 'bad');
  ctx.stat('happiness', -15);
  ctx.stat('stress', 12);
  arrive(ctx, home, { reason: 'Removed by immigration authorities.' });
}

function finishEmigration(ctx, to, kind) {
  if (kind === 'asylum') {
    // You flee with what you can carry.
    ctx.spend(ASYLUM_COST, `Escape to ${COUNTRIES[to].name}`, { allowDebt: true });
    ctx.stat('happiness', -10);
    ctx.stat('stress', 10);
    const route = asylumRoute(ctx.state, to);
    arrive(ctx, to, { visa: route?.temporary ? 'temporary' : 'asylum' });
    return ctx.toast(`Fled to ${COUNTRIES[to].name}`, 'warn');
  }
  if (!ctx.spend(EMIGRATION_COST, `Move to ${COUNTRIES[to].name}`, { credit: true })) return ctx.toast(`An international move costs $${EMIGRATION_COST.toLocaleString()}.`, 'warn');
  arrive(ctx, to, { visa: ['citizen', 'resident'].includes(kind) ? null : kind, keepJob: kind === 'transfer' });
  ctx.toast(`Moved to ${COUNTRIES[to].name}`, 'good');
}

function stillQualifies(state, res) {
  const here = countryIdOf(state);
  if (['work', 'transfer'].includes(res.visa)) return Boolean(state.career.job);
  if (res.visa === 'student') return Boolean(state.education.enrolled);
  if (res.visa === 'nomad') return Boolean(state.career.job?.remote) || Boolean(state.business?.current);
  if (res.visa === 'workingHoliday') return true;
  if (res.visa === 'family') return nationalityCode(state.people.list.find((p) => p.alive && p.relation === 'spouse')) === here;
  return true;
}

/** A year waiting on an asylum claim: support, then a decision, an appeal, or toleration. */
function asylumYear(ctx, res) {
  const { state, rng } = ctx;
  const here = countryIdOf(state);
  const law = ASYLUM[here];
  const age = state.character.age;
  if (law.support && !state.career.job) ctx.earn(law.support, 'Asylum support allowance');
  ctx.stat('stress', 3);
  if (age < res.decisionAt || state.prompts.some((p) => p.type === 'migration.asylumRefused')) return;
  const stillDangerous = (warIn(state, res.from)?.homeFront ?? 0) >= 0.3 && warIn(state, res.from)?.phase !== 'ceasefire';
  const odds = res.appealed ? res.odds * 0.5 : stillDangerous ? res.odds : res.odds * 0.4;
  if (rng.chance(odds)) return grantProtection(ctx, res, law);
  if (!res.appealed) {
    ctx.prompt({
      type: 'migration.asylumRefused', icon: '📭', title: 'Asylum Claim Refused',
      text: `The ${law.name} was refused. You have the right to appeal.`,
      options: [
        { id: 'appeal', label: '⚖️ Appeal with a legal aid lawyer', hint: 'Another year or two of waiting' },
        { id: 'leave', label: `✈️ Go back to ${COUNTRIES[res.from]?.name ?? 'your country'}`, hint: stillDangerous ? 'The war is still on' : 'The fighting has stopped' },
      ],
      data: {},
    });
    return;
  }
  if (stillDangerous) {
    // Nobody is sent back into a war (non-refoulement): you stay, tolerated, and may work.
    if (!res.tolerated) ctx.log('Your appeal failed, but no one can be sent back into a war zone. You were given a tolerated stay and permission to work.', '⏳', 'warn');
    res.tolerated = true;
    res.workFrom = Math.min(res.workFrom, age);
    res.decisionAt = age + 2;
    res.appealed = false;
    res.odds = Math.max(res.odds, law.humanitarian ?? 0.3);
    return;
  }
  removal(ctx, 'Your asylum appeal failed.');
}

function grantProtection(ctx, res, law) {
  const { state } = ctx;
  const age = state.character.age;
  const humanitarian = law.humanitarian && law.humanitarian > law.odds;
  Object.assign(res, { status: law.prYears === 0 ? 'permanent' : 'refugee', grantedAt: age, qualifyingSince: res.qualifyingSince ?? age, ...(law.prYears === 0 ? { permanentSince: age } : {}) });
  delete res.decisionAt;
  delete res.tolerated;
  ctx.stat('happiness', 15);
  ctx.stat('stress', -8);
  ctx.log(humanitarian
    ? `You were allowed to stay on humanitarian grounds. ${law.prYears ? `Permanent residence in ${law.prYears} years.` : ''}`
    : `You were recognized as a refugee.${law.prYears === 0 ? ' Permanent residence came with it.' : law.prYears ? ` Permanent residence in ${law.prYears} year${law.prYears === 1 ? '' : 's'}.` : ''}`, '🛡️', 'milestone');
}

/** Dual nationality: Japan, Korea and India make dual nationals pick one by 22. */
function dualChoice(ctx) {
  const { state } = ctx;
  const list = citizenshipsOf(state);
  const strict = list.find((c) => !IMMIGRATION[c].dualOut);
  if (!strict || list.length < 2 || state.migration?.dualChosen) return;
  // Spain's dual-nationality treaties: Ibero-Americans (and Andorrans, Filipinos, Portuguese, Equatoguineans) keep both.
  const SPAIN_DUAL = ['MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ', 'PH', 'PT', 'AD', 'BR'];
  if (list.includes('ES') && list.every((c) => c === 'ES' || SPAIN_DUAL.includes(c))) return;
  ctx.prompt({
    type: 'migration.dual',
    icon: '🛂',
    title: 'Choose Your Nationality',
    text: `${COUNTRIES[strict].name} doesn't allow dual nationality for adults. By 22 you have to choose.`,
    options: list.map((c) => ({ id: c, label: `${COUNTRIES[c].flag} Keep ${COUNTRIES[c].demonym} nationality`, hint: c === strict ? `Give up the others` : `Give up ${COUNTRIES[strict].demonym} nationality` })),
    data: { strict },
  });
}

export const MigrationModule = {
  id: 'migration',
  order: 42,

  init(state) {
    // Lives born abroad before nationalities were tracked: the people around you are locals.
    if (!state.migration && state.character.countryId) for (const p of state.people?.list ?? []) if (p.nationality === 'US') p.nationality = state.character.countryId;
  },

  setup(engine) {
    // A felony conviction starts removal proceedings for anyone who isn't a citizen.
    engine.bus.on('legal:convicted', ({ ctx, severity }) => {
      const res = residencyOf(ctx.state);
      if (!res || severity !== 'felony' || res.removal) return;
      res.removal = true;
      ctx.log(`Immigration authorities opened removal proceedings: a felony conviction ends your right to live in ${COUNTRIES[countryIdOf(ctx.state)].name}.`, '🛂', 'bad');
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const m = state.migration;
    if (!m) return;
    const age = state.character.age;
    const here = countryIdOf(state);

    // Immersion: living somewhere teaches you the language.
    const lang = localLanguage(here);
    if (age >= 4 && !speaksLocal(state, here)) {
      const before = m.languages[lang] ?? 0;
      m.languages[lang] = Math.min(LANGUAGE_FLUENT, before + Math.round(10 + state.stats.smarts / 8));
      if (m.languages[lang] >= LANGUAGE_FLUENT) ctx.log(`You're fluent in ${lang} now.`, '🗣️', 'good');
    }

    // Permanent residence elsewhere lapses after too long away.
    for (const [cc, rec] of Object.entries(m.residences)) {
      if (cc === here || rec.leftAt == null || rec.status !== 'permanent') continue;
      if (age - rec.leftAt > IMMIGRATION[cc].prLapse) {
        delete m.residences[cc];
        ctx.log(`Your ${IMMIGRATION[cc].pr?.name ?? 'permanent residence'} in ${COUNTRIES[cc].name} lapsed: you've been away too long.`, '🛂', 'warn');
      }
    }

    if (age >= 22 && !state.prompts.some((p) => p.type === 'migration.dual')) dualChoice(ctx);

    const res = residencyOf(state);
    if (!res) return;
    if (res.removal && !state.legal.incarceration) return removal(ctx, 'After your conviction, a judge ordered your removal.');
    if (res.status === 'asylum') return asylumYear(ctx, res);
    if (res.status === 'undocumented') {
      // Now and then a government declares an amnesty for people already living here.
      if (!res.amnesty && rng.chance(['ES', 'IT', 'BR', 'MX', 'IE'].includes(here) ? 0.03 : 0.008)) {
        res.amnesty = true;
        ctx.log(`${COUNTRIES[here].name} announced a one-time amnesty for undocumented residents. You can apply (Move tab) — if you dare to come forward.`, '📜', 'good');
      }
      return undocumentedYear(ctx, res);
    }
    if (res.temporary && !warIn(state, res.from) && !res.endNotified) {
      res.endNotified = true;
      ctx.log(`The war in ${COUNTRIES[res.from].name} is over. Your temporary protection continues for now; you can go home or apply to stay.`, '🕊️', 'info');
    }
    const law = IMMIGRATION[here];
    if (res.status === 'visa') {
      if (law.surcharge) ctx.spend(law.surcharge, 'Immigration Health Surcharge', { allowDebt: true });
      if (res.visa === 'student' && state.education.enrolled) res.studied = true;
      let ok = stillQualifies(state, res);
      // Graduates get a few years of work rights to find a job.
      if (!ok && res.visa === 'student' && res.studied && law.visas.student.postStudy) {
        Object.assign(res, { visa: 'work', expires: age + law.visas.student.postStudy, postStudy: true, qualifyingSince: res.qualifyingSince ?? age });
        delete res.grace;
        ctx.log(`Your student visa became a ${law.visas.student.postStudy}-year post-study work permit.`, '🎓', 'good');
        ok = true;
      }
      const expiredOnce = res.expires != null && age >= res.expires && law.visas[res.visa]?.once;
      if (ok && !expiredOnce) delete res.grace;
      else if (!ok && res.grace == null) {
        res.grace = age + (age - res.arrived <= 1 ? 2 : 1);
        const need = { work: 'a job', transfer: 'a job', student: 'a school enrollment', family: 'your marriage to a citizen' }[res.visa] ?? 'its conditions';
        ctx.log(`Your ${law.visas[res.visa]?.name ?? 'visa'} depends on ${need}. Sort it out within a year or you'll have to leave.`, '🛂', 'warn');
      } else if (!ok && age >= res.grace) return lapsed(ctx, res, 'Your visa lapsed.');
      if (ok && expiredOnce) {
        // Working holidays (and Japan's nomad visa) aren't renewed: switch to another visa or go.
        if (res.grace == null) {
          res.grace = age + 1;
          ctx.log(`Your ${law.visas[res.visa].name} has run out. Switch to another visa within a year or you'll have to leave.`, '🎒', 'warn');
        } else if (age >= res.grace) return lapsed(ctx, res, 'Your visa ran out.');
      } else if (ok && res.expires != null && age >= res.expires) {
        const rule = law.visas[res.visa];
        res.expires = age + (rule?.years ?? 2);
        ctx.spend(rule?.fee ?? 0, 'Visa renewal', { allowDebt: true });
        ctx.log(`You renewed your ${rule?.name ?? 'visa'}.`, '🛂');
      }
      if (prYearsLeft(state) === 0 && !res.prNotified) {
        res.prNotified = true;
        ctx.log(`You qualify to apply for ${law.pr.name} (Move tab).`, '🪪', 'good');
      }
    }
    if (naturalizationYearsLeft(state) === 0 && !res.natNotified) {
      res.natNotified = true;
      ctx.log(`You've lived here long enough to apply for ${COUNTRIES[here].demonym} citizenship (Move tab).`, '🛂', 'good');
    }
  },

  actions: {
    /** arg: 'CC:route' (route: a visa kind, 'citizen' or 'resident'). */
    emigrate(ctx, arg) {
      const { state, rng } = ctx;
      const [to, kind] = String(arg).split(':');
      if (!COUNTRIES[to] || to === countryIdOf(state)) return;
      const block = departureBlock(state);
      if (block) return ctx.toast(block, 'warn');
      const route = routesTo(state, to).find((r) => r.kind === kind);
      if (!route?.ok) return ctx.toast(route?.reason ?? 'Not eligible', 'warn');
      if (kind !== 'asylum' && !canAfford(state, EMIGRATION_COST + route.fee)) return ctx.toast(`You need $${(EMIGRATION_COST + route.fee).toLocaleString()} for the move and the application.`, 'warn');
      ensureMigration(state);
      if (kind === 'irregular') {
        if (yearlyCount(state, `migration.apply.${to}`)) return ctx.toast('One crossing attempt a year.', 'warn');
        bumpYearly(state, `migration.apply.${to}`);
        ctx.spend(route.fee, 'Paid a smuggler', { credit: true });
        if (!rng.chance(route.odds)) {
          const ban = Math.ceil((OVERSTAY_BAN[to] ?? 5) / 2);
          state.migration.bans = { ...(state.migration.bans ?? {}), [to]: state.character.age + ban };
          ctx.stat('health', -rng.int(3, 15));
          ctx.stat('happiness', -10);
          ctx.log(`You were caught trying to cross into ${COUNTRIES[to].name} without papers, held for weeks and sent back. You're barred from entering for ${ban} years, and the smuggler kept the money.`, '🚨', 'bad');
          return ctx.toast('Caught at the border', 'bad');
        }
        ctx.log(`After a frightening journey you crossed into ${COUNTRIES[to].name} without papers. Officially, you're not here: cash work, no benefits, and always looking over your shoulder.`, '🌙', 'warn');
      }
      if (!['citizen', 'resident', 'asylum', 'freeMovement', 'irregular'].includes(kind)) {
        if (yearlyCount(state, `migration.apply.${to}`)) return ctx.toast(`One application to ${COUNTRIES[to].name} a year.`, 'warn');
        bumpYearly(state, `migration.apply.${to}`);
        ctx.spend(route.fee, `${route.rule.name} application`, { credit: true });
        if (!rng.chance(route.odds)) {
          ctx.stat('happiness', -4);
          ctx.log(`Your ${route.rule.name} application was refused${to === 'US' && kind === 'work' ? ' (not picked in the H-1B lottery)' : ''}. You can try again next year.`, '🛂', 'bad');
          return ctx.toast('Visa refused', 'bad');
        }
        ctx.log(`Approved: ${route.rule.name}.`, '🛂', 'good');
      }
      const home = state.housing.properties.find((p) => p.use === 'primary');
      if (home && kind === 'asylum') {
        ctx.emit('housing:leavingPrimary', { decision: 'vacant' });
        ctx.log(`You left your home in ${REGIONS[home.regionId]?.name ?? 'town'} behind, locked up and empty.`, '🏚️', 'bad');
      } else if (home) {
        ctx.prompt({
          type: 'migration.home',
          icon: '🏡',
          title: 'What About Your Home?',
          text: `You own your home in ${REGIONS[home.regionId]?.name ?? 'town'} (worth ~$${Math.round(home.value).toLocaleString()}).`,
          options: [
            { id: 'sell', label: '🪧 Sell it before you go', hint: 'Agent commission + closing costs' },
            { id: 'rent', label: '🔑 Keep it and rent it out', hint: 'Landlord from abroad' },
            { id: 'vacant', label: '🚪 Keep it empty', hint: 'Pay the carrying costs' },
          ],
          data: { to, kind },
        });
        return;
      }
      finishEmigration(ctx, to, kind);
    },

    /** Switch status without leaving (marrying a citizen, finding a sponsor). */
    adjust(ctx, kind) {
      const { state, rng } = ctx;
      const here = countryIdOf(state);
      const res = residencyOf(state);
      if (!res || res.status !== 'visa' || res.visa === kind) return;
      const elig = visaEligibility(state, here, kind);
      if (!elig.ok) return ctx.toast(elig.reason, 'warn');
      if (['work', 'transfer'].includes(kind) && !state.career.job) return ctx.toast('Find a sponsoring job first.', 'warn');
      if (yearlyCount(state, 'migration.adjust')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'migration.adjust');
      ctx.spend(elig.fee, `${elig.rule.name} application`, { credit: true });
      if (!rng.chance(elig.odds)) return ctx.log(`Your application to switch to a ${elig.rule.name} was refused.`, '🛂', 'bad');
      Object.assign(res, { visa: kind, ...(elig.rule.years ? { expires: state.character.age + elig.rule.years } : {}) });
      if (res.qualifyingSince == null && !NON_QUALIFYING_VISAS.includes(kind)) res.qualifyingSince = state.character.age;
      delete res.grace;
      if (elig.rule.permanent) Object.assign(res, { status: 'permanent', permanentSince: state.character.age });
      ctx.log(`Approved: you're now here on a ${elig.rule.name}${elig.rule.permanent ? ' — as a permanent resident' : ''}.`, '🛂', 'good');
    },

    /** arg: 'residence' | 'marriage' | 'amnesty' — try to get legal status. */
    regularize(ctx, id) {
      const { state, rng } = ctx;
      const res = residencyOf(state);
      const opt = regularizeOptions(state).find((o) => o.id === id);
      if (!res || !opt) return;
      if (!opt.ok) return ctx.toast(opt.reason, 'warn');
      if (yearlyCount(state, 'migration.regularize')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'migration.regularize');
      ctx.spend(opt.fee, 'Immigration lawyer and application', { credit: true });
      res.attempts = (res.attempts ?? 0) + 1;
      if (id === 'amnesty') delete res.amnesty;
      const here = countryIdOf(state);
      if (rng.chance(opt.odds)) {
        Object.assign(res, { status: 'visa', visa: id === 'marriage' ? 'family' : 'work', regularized: true, qualifyingSince: state.character.age, expires: state.character.age + 2 });
        delete res.overstaySince;
        ctx.stat('happiness', 15);
        ctx.stat('stress', -10);
        return ctx.log(`Approved. After years in the shadows you have legal status in ${COUNTRIES[here].name}: the right to live and work here, renewable, and a road to permanent residence.`, '🪪', 'milestone');
      }
      // Coming forward has a price: some refusals end in a removal order.
      if (rng.chance(0.25)) {
        const ban = OVERSTAY_BAN[here] ?? 5;
        state.migration.bans = { ...(state.migration.bans ?? {}), [here]: state.character.age + ban };
        return removal(ctx, `Your application was refused, and having come forward, you were ordered removed. You're barred from returning for ${ban} years.`);
      }
      ctx.stat('happiness', -6);
      return ctx.log(`Refused. ${res.attempts >= 3 ? 'That was your last real chance.' : 'Your lawyer says you can try again — the odds don\'t get better.'}`, '🛂', 'bad');
    },

    applyPR(ctx) {
      const { state, rng } = ctx;
      const here = countryIdOf(state);
      const res = residencyOf(state);
      const law = { ...IMMIGRATION[here], pr: IMMIGRATION[here].pr ?? { name: 'permanent residence', fee: 0 } };
      if (prYearsLeft(state) !== 0) return ctx.toast('Not eligible yet.', 'warn');
      if (yearlyCount(state, 'migration.pr')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'migration.pr');
      ctx.spend(law.pr.fee, `${law.pr.name} application`, { credit: true });
      const odds = clamp(0.88 - visibleRecord(state).filter((r) => r.severity !== 'infraction').length * 0.15, 0.1, 0.95);
      if (!rng.chance(odds)) return ctx.log(`Your ${law.pr.name} application was refused. You can reapply next year.`, '🛂', 'bad');
      Object.assign(res, { status: 'permanent', permanentSince: state.character.age });
      delete res.expires;
      delete res.grace;
      ctx.stat('happiness', 8);
      ctx.log(`You were granted ${law.pr.name}. ${COUNTRIES[here].name} is home now, for as long as you like.`, '🪪', 'milestone');
    },

    naturalize(ctx) {
      const { state, rng } = ctx;
      const here = countryIdOf(state);
      const law = IMMIGRATION[here];
      if (naturalizationYearsLeft(state) !== 0) return ctx.toast('Not eligible yet.', 'warn');
      if (!speaksLocal(state, here)) return ctx.toast(`Needs working ${localLanguage(here)}.`, 'warn');
      if (visibleRecord(state).some((r) => r.severity === 'felony')) return ctx.toast('A felony record bars naturalization.', 'warn');
      if (yearlyCount(state, 'migration.nat')) return ctx.toast('One application a year.', 'warn');
      bumpYearly(state, 'migration.nat');
      ctx.spend(law.nat.fee, 'Naturalization application', { credit: true });
      if (!rng.chance(clamp(0.6 + state.stats.smarts / 250, 0.6, 0.97))) return ctx.log('You failed the citizenship test. You can try again next year.', '📝', 'bad');
      const before = citizenshipsOf(state);
      // Some countries make you give up your old passport; some take theirs back when you take another.
      const lost = law.dualIn === false ? before : before.filter((c) => !IMMIGRATION[c].dualOut);
      state.character.citizenships = [...before.filter((c) => !lost.includes(c)), here];
      state.migration.naturalized = [...(state.migration.naturalized ?? []), here];
      delete state.migration.residences[here];
      ctx.stat('happiness', 12);
      ctx.log(`You took the oath and became a ${COUNTRIES[here].demonym} citizen. ${COUNTRIES[here].flag}${lost.length ? ` You gave up your ${lost.map((c) => COUNTRIES[c].demonym).join(' and ')} citizenship.` : ''}`, '🛂', 'milestone');
    },

    renounce(ctx, cc) {
      const { state } = ctx;
      const list = citizenshipsOf(state);
      if (!list.includes(cc) || list.length < 2) return ctx.toast('You can\'t become stateless.', 'warn');
      if (cc === countryIdOf(state)) return ctx.toast('Not while you live there.', 'warn');
      ensureMigration(state);
      ctx.spend(cc === 'US' ? 2350 : 300, 'Renunciation of citizenship', { credit: true });
      state.character.citizenships = list.filter((c) => c !== cc);
      ctx.log(`You renounced your ${COUNTRIES[cc].demonym} citizenship.`, '🛂', 'warn');
    },

    /** A year of language classes. */
    study(ctx, language) {
      const { state } = ctx;
      const m = ensureMigration(state);
      if (!language || nativeLanguages(m.birthCountry).includes(language) || (m.languages[language] ?? 0) >= LANGUAGE_FLUENT) return;
      if (yearlyCount(state, 'migration.study')) return ctx.toast('One course a year.', 'warn');
      if (!ctx.spend(LANGUAGE_CLASS_COST, `${language} classes`)) return ctx.toast(`Classes cost $${LANGUAGE_CLASS_COST.toLocaleString()}.`, 'warn');
      bumpYearly(state, 'migration.study');
      m.languages[language] = Math.min(LANGUAGE_FLUENT, (m.languages[language] ?? 0) + Math.round(15 + state.stats.smarts / 6));
      ctx.log(m.languages[language] >= LANGUAGE_FLUENT ? `You finished your ${language} course — fluent at last.` : `You took a year of ${language} classes (${m.languages[language]}% of the way to fluency).`, '🗣️', m.languages[language] >= LANGUAGE_FLUENT ? 'good' : 'info');
    },
  },

  resolvers: {
    home(ctx, data, optionId) {
      ctx.emit('housing:leavingPrimary', { decision: optionId });
      finishEmigration(ctx, data.to, data.kind);
    },
    lapsed(ctx, _data, optionId) {
      const { state } = ctx;
      const res = residencyOf(state);
      if (!res) return;
      if (optionId === 'overstay') {
        Object.assign(res, { status: 'undocumented', overstaySince: state.character.age });
        delete res.grace;
        delete res.expires;
        return ctx.log('You stayed on after your visa ran out. Officially, you are no longer here.', '🤫', 'warn');
      }
      removal(ctx, 'You left before your visa ran out.');
    },
    asylumRefused(ctx, _data, optionId) {
      const { state } = ctx;
      const res = residencyOf(state);
      if (!res) return;
      if (optionId === 'appeal') {
        res.appealed = true;
        res.decisionAt = state.character.age + 1;
        return ctx.log('You appealed. Legal aid took the case.', '⚖️');
      }
      ctx.log('You decided to go home.', '✈️');
      arrive(ctx, res.from, { reason: 'You went home after your asylum claim was refused.' });
    },
    dual(ctx, data, keep) {
      const { state } = ctx;
      const m = ensureMigration(state);
      m.dualChosen = true;
      const list = citizenshipsOf(state);
      const lost = keep === data.strict ? list.filter((c) => c !== keep) : [data.strict];
      state.character.citizenships = list.filter((c) => !lost.includes(c));
      ctx.log(`You kept your ${COUNTRIES[keep].demonym} nationality and gave up ${lost.map((c) => COUNTRIES[c].demonym).join(' and ')}.`, '🛂', 'milestone');
      // Living somewhere you're no longer a citizen of: you stay as a permanent resident.
      const here = countryIdOf(state);
      if (!state.character.citizenships.includes(here)) m.residences[here] = { status: 'permanent', visa: 'family', arrived: 0, permanentSince: state.character.age };
    },
  },
};
