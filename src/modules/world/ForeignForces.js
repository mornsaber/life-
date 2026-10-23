/**
 * Serving another country's flag, by tradition.
 *
 *   The French Foreign Legion   Men of any nationality, 17½ to 39, who make their way to a
 *                  recruiting post in France. Three weeks of selection at Aubagne (about one in
 *                  eight is taken), then a five-year contract under a declared identity — a new
 *                  name — until the Legion "regularises" you. After three years a legionnaire may
 *                  apply to become French; one wounded in battle can claim citizenship at once
 *                  ("Français par le sang versé"). Legionnaires live in barracks.
 *   The Gurkhas    Young Nepali men sit the British Army's selection in Pokhara: the doko race
 *                  (25 kg up a hill in under 48 minutes), exams and interviews. A couple of
 *                  hundred of thousands of applicants join the British Army's Brigade of Gurkhas
 *                  (riflemen, with the right to settle in Britain after four years) or the
 *                  Singapore Police Force's Gurkha Contingent (barracks at Mount Vernon,
 *                  service to 45, then home to Nepal). India's Gorkha Rifles recruit too.
 *
 * state.foreignForces = { legion: { realFirst, realLast, declared, since, citizen }, gurkha: 'GB'|'SG'|'IN'|null, gurkhaTries }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, hasFelony, randomName, setNameCountry, addHonor } from '../../core/State.js';
import { enlist } from '../military/MilitaryEngine.js';
import { arrive, ensureMigration } from './Migration.js';
import { postAbroad } from './Posting.js';
import { citizenshipsOf, isCitizen, COUNTRIES } from './Countries.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire, leaveJob } from '../career/CareerEngine.js';

const ff = (state) => (state.foreignForces ??= { legion: null, gurkha: null, gurkhaTries: 0 });
const here = (state) => state.character.countryId ?? 'US';
export const legionnaire = (state) => Boolean(state.military.service?.legion);
const GURKHA_RETIRE = 45;

/** Can you go to France and sign up? */
export function legionCheck(state) {
  const c = state.character;
  if (c.gender !== 'male') return { ok: false, reason: 'The Legion takes men only' };
  if (c.age < 17 || c.age > 39) return { ok: false, reason: 'Volunteers are 17½ to 39' };
  if (state.military.service) return { ok: false, reason: 'Already serving' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (hasFelony(state) && state.legal.record.some((r) => r.severity === 'felony' && /murder|terror|traffick/i.test(r.name ?? ''))) return { ok: false, reason: 'Interpol checks rule out serious crimes' };
  if (state.stats.health < 50) return { ok: false, reason: 'Fails the medical' };
  if (yearlyCount(state, 'foreignForces.legion')) return { ok: false, reason: 'Once a year' };
  return { ok: true, odds: clamp(0.1 + (state.stats.fitness - 50) / 150 + (state.stats.smarts - 50) / 600 + (state.stats.happiness < 40 ? 0.03 : 0), 0.04, 0.45) };
}

/** Pokhara: the British Gurkha selection (Nepali men, 17½–21). */
export function gurkhaCheck(state) {
  const c = state.character;
  if (!isCitizen(state, 'NP')) return { ok: false, reason: 'Nepali citizens only' };
  if (c.age < 17 || c.age > 21) return { ok: false, reason: 'Candidates are 17½ to 21' };
  if (state.military.service || ff(state).gurkha) return { ok: false, reason: 'Already serving' };
  if (here(state) !== 'NP') return { ok: false, reason: 'Selection is held in Pokhara' };
  if (yearlyCount(state, 'foreignForces.gurkha')) return { ok: false, reason: 'Once a year, in the recruiting season' };
  if (state.stats.health < 50) return { ok: false, reason: 'Fails the medical' };
  return { ok: true, odds: clamp(0.03 + Math.max(0, state.stats.fitness - 55) / 90 + (state.stats.smarts - 50) / 500, 0.01, 0.4) };
}

/** Spain's armed forces take citizens of Spanish-speaking countries ("tropa extranjera"), 18–29. */
export const IBERO = ['MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'].filter((cc) => COUNTRIES[cc]);
export function spainCheck(state) {
  const c = state.character;
  if (!citizenshipsOf(state).some((x) => IBERO.includes(x))) return { ok: false, reason: 'Citizens of Spanish-speaking countries' };
  if (isCitizen(state, 'ES')) return { ok: false, reason: 'Spaniards join directly' };
  if (c.age < 18 || c.age > 29) return { ok: false, reason: 'Ages 18 to 29' };
  if (state.military.service) return { ok: false, reason: 'Already serving' };
  if (hasFelony(state)) return { ok: false, reason: 'A clean record' };
  if (yearlyCount(state, 'foreignForces.spain')) return { ok: false, reason: 'Once a year' };
  return { ok: true, odds: clamp(0.35 + (state.stats.fitness - 50) / 150, 0.15, 0.75) };
}

/** A Catholic priest lent to a mission diocese abroad for a few years (Fidei donum). */
export function missionCheck(state) {
  const job = state.career.job;
  if (job?.professionId !== 'catholicClergy' || (job.grade ?? 0) < 3) return { ok: false, reason: 'Ordained Catholic priests' };
  if (state.character.posting) return { ok: false, reason: 'Already abroad' };
  if (yearlyCount(state, 'foreignForces.mission')) return { ok: false, reason: 'Once a year' };
  return { ok: true };
}
const MISSIONS = [['Juba', 'South Sudan'], ['Kinshasa', 'DR Congo'], ['Manaus', 'Brazil'], ['Port Moresby', 'Papua New Guinea'], ['Lima', 'Peru'], ['Nairobi', 'Kenya'], ['Dhaka', 'Bangladesh'], ['Port-au-Prince', 'Haiti']];

/* ------------------------------------------------------------------ */
/* Joining                                                             */
/* ------------------------------------------------------------------ */

function joinLegion(ctx) {
  const { state, rng } = ctx;
  const c = state.character;
  if (here(state) !== 'FR') arrive(ctx, 'FR', { visa: 'military', reason: 'You signed on at the Legion\'s recruiting post in Aubagne.' });
  if (!enlist(ctx, { branch: 'marines', track: 'enlisted', component: 'active', specialty: 'infantry' })) return;
  const svc = state.military.service;
  Object.assign(svc, { legion: true, contractYearsLeft: 5 });
  // A declared identity: a new name for the first years.
  setNameCountry('FR');
  const alias = randomName(rng, 'male');
  setNameCountry(here(state));
  ff(state).legion = { realFirst: c.firstName, realLast: c.lastName, declared: true, since: c.age };
  c.firstName = rng.chance(0.5) ? c.firstName : alias.firstName;
  c.lastName = alias.lastName;
  ctx.log(`After three weeks of tests at Aubagne you were taken. You signed a five-year contract and handed in your passport. From today you are Légionnaire ${c.firstName} ${c.lastName} — your declared identity. Basic training at the 4e régiment étranger, Castelnaudary, then the képi blanc.`, '🎖️', 'milestone');
}

function joinGurkhas(ctx, where) {
  const { state, rng } = ctx;
  const f = ff(state);
  if (where === 'SG') {
    arrive(ctx, 'SG', { visa: 'gurkha', reason: 'You flew to Singapore to join the Gurkha Contingent at Mount Vernon Camp.' });
    // Gurkhas in Singapore don't settle: the years don't count toward residence.
    const res = state.migration.residences.SG;
    if (res) res.qualifyingSince = null;
    const p = getProfession('gurkhaContingent');
    f.gurkha = 'SG';
    const employer = createEmployer(rng, state, p, state.character.regionId);
    employer.name = p.employers[0];
    const job = hire(ctx, { professionId: 'gurkhaContingent', levelId: 'constable', employer });
    if (job) job.employer.benefits = { ...(job.employer.benefits ?? {}), housing: true };
    if ((state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse')) ctx.log('Your family moved into the Contingent\'s cantonment at Mount Vernon: Nepali shops, a Hindu temple, and children who grow up speaking Singlish.', '👨‍👩‍👧', 'good');
    return ctx.log('You passed out of training as a Police Constable of the Gurkha Contingent: guarding the Istana, riot control, the most sensitive security jobs in Singapore. You live in the Contingent\'s cantonment at Mount Vernon.', '🗡️', 'milestone');
  }
  const cc = where === 'IN' ? 'IN' : 'GB';
  arrive(ctx, cc, { visa: 'military', reason: cc === 'GB' ? 'You flew to Britain for recruit training at Catterick.' : 'You reported to the Gorkha Training Centre.' });
  if (!enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' })) return undefined;
  const svc = state.military.service;
  Object.assign(svc, { gurkha: cc, contractYearsLeft: cc === 'GB' ? 15 : 17 });
  f.gurkha = cc;
  // Since 2009 a British Gurkha's family can live with them in the UK.
  const family = (state.people?.list ?? []).filter((p) => p.alive !== false && ['spouse', 'child'].includes(p.relation));
  if (cc === 'GB' && family.length) ctx.log(`Your ${family.some((p) => p.relation === 'spouse') ? 'spouse' : 'children'} joined you in Britain on dependants' visas — something earlier generations of Gurkhas were never allowed.`, '👨‍👩‍👧', 'good');
  return ctx.log(cc === 'GB'
    ? 'You passed out of the Gurkha training company at Catterick as a Rifleman of the Brigade of Gurkhas, kukri at your belt: "Better to die than be a coward."'
    : 'You were sworn in as a Rifleman of the Indian Army\'s Gorkha Rifles.', '🗡️', 'milestone');
}

/* ------------------------------------------------------------------ */
/* Years of service                                                    */
/* ------------------------------------------------------------------ */

function legionYear(ctx) {
  const { state } = ctx;
  const svc = state.military.service;
  const l = state.foreignForces?.legion;
  if (!svc?.legion || !l) return;
  const years = state.character.age - l.since;
  // Regularised: the command's permission to marry, and family quarters.
  const married = (state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse');
  if (!l.declared && married && !l.marriagePermitted) {
    l.marriagePermitted = true;
    ctx.log('Your colonel granted permission to marry. The Legion found you family quarters near the regiment.', '💒', 'good');
  }
  // Married under a declared identity: the Legion doesn't recognise it, and a legionnaire needs permission.
  if (l.declared && !l.marriageNoted && (state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse')) {
    l.marriageNoted = true;
    svc.disciplinary = (svc.disciplinary ?? 0) + 1;
    svc.eval = Math.max(0, (svc.eval ?? 60) - 10);
    ctx.log('You married without the Legion\'s permission, under a name that isn\'t yours. The marriage isn\'t recognised on your papers, and your captain gave you thirty days\' arrest.', '⛓️', 'bad');
  }
  // Wounded in battle: French by the blood shed.
  if ((svc.wounds ?? 0) > 0 && !l.citizen && !isCitizen(state, 'FR')) {
    l.citizen = 'sang';
    state.character.citizenships = [...new Set([...citizenshipsOf(state), 'FR'])];
    delete ensureMigration(state).residences.FR;
    ctx.log('Wounded in action, you claimed the right of "Français par le sang versé": French by the blood shed, without the usual wait.', '🇫🇷', 'milestone');
  }
  // Three years in, regularised: a legionnaire may ask to become French.
  if (years >= 3 && !l.declared && !l.citizen && !l.asked && !isCitizen(state, 'FR')) {
    l.asked = true;
    ctx.prompt({
      type: 'foreignForces.legionCitizen', icon: '🇫🇷', title: 'Becoming French',
      text: 'With three years\' service and your situation regularised, you can apply for French nationality through the Legion.',
      options: [{ id: 'apply', label: '🇫🇷 Apply' }, { id: 'no', label: '🙅 Not now' }],
      data: {},
    });
  }
  if (years >= 1 && l.declared && !state.prompts.some((p) => p.type === 'foreignForces.regularise')) {
    ctx.prompt({
      type: 'foreignForces.regularise', icon: '📜', title: 'Régularisation',
      text: `After a year under your declared identity, the Legion offers to regularise your situation militaire: your real name back on your papers (${l.realFirst} ${l.realLast}). Until then you can't marry, open a bank account in your own name, or apply to be French.`,
      options: [{ id: 'yes', label: '📜 Take my real name back' }, { id: 'no', label: '🎭 Stay as I am' }],
      data: {},
    });
  }
}

/** Ibero-American volunteers in Spain's forces can ask for Spanish nationality after two years. */
function spainYear(ctx) {
  const { state } = ctx;
  const svc = state.military.service;
  if (svc?.foreignTroop !== 'ES' || isCitizen(state, 'ES') || svc.yearsOfService - (svc.priorYears ?? 0) < 2 || svc.nationalityAsked) return;
  svc.nationalityAsked = true;
  state.character.citizenships = [...new Set([...citizenshipsOf(state), 'ES'])];
  delete ensureMigration(state).residences.ES;
  ctx.log('Two years in uniform: as an Ibero-American serving Spain, you were granted Spanish nationality (keeping your own).', '🇪🇸', 'milestone');
}

function gurkhaYear(ctx) {
  const { state } = ctx;
  const f = state.foreignForces;
  if (f?.gurkha !== 'SG') return;
  const job = state.career.job;
  if (job?.professionId !== 'gurkhaContingent') return;
  if (state.character.age >= GURKHA_RETIRE) {
    const years = job.yearsAtEmployer ?? 0;
    leaveJob(ctx, 'Retired from the Gurkha Contingent at 45');
    ctx.emit('retirement:addPension', { pension: { id: 'gurkhaSG', label: 'Gurkha Contingent pension', annual: Math.round(Math.max(3000, (job.salary ?? 30000) * 0.02 * years)), startAge: state.character.age, source: 'employer', cola: 0.02 } });
    f.gurkha = null;
    arrive(ctx, 'NP', { reason: 'Gurkhas leave Singapore when their service ends: you flew home to Nepal with your family.' });
    ctx.log('You retired from the Gurkha Contingent at 45 with a pension, and went home to Nepal, as every Gurkha of the Contingent must.', '🗡️', 'milestone');
  }
}

/** Leaving the Legion or the British Gurkhas: the right to stay. */
function separated(ctx, svc, type) {
  const { state } = ctx;
  const f = state.foreignForces;
  if (!f) return;
  const years = svc.yearsOfService - (svc.priorYears ?? 0);
  if (svc.legion) {
    // Long service: the Legion's medal, and a place at its veterans' home if you want one.
    if (years >= 15 || (svc.wounds ?? 0) > 0) {
      addHonor(state, { id: 'legion.dnGold', source: 'military', name: 'Médaille de la Défense nationale (échelon or)', icon: '🎖️', prestige: 5, precedence: 32, citation: `For ${years} years in the Légion étrangère.` });
      ctx.prompt({
        type: 'foreignForces.puyloubier', icon: '🍇', title: 'Puyloubier',
        text: 'The Legion looks after its own. Its veterans\' home at Puyloubier, under Mont Sainte-Victoire, has a room for you: a vineyard to work, a pottery, and men who understand.',
        options: [{ id: 'yes', label: '🍇 Retire to Puyloubier', hint: 'Housed and fed by the Legion' }, { id: 'no', label: '🏠 Make my own way' }],
        data: {},
      });
    }
    if (f.legion?.declared) { state.character.firstName = f.legion.realFirst; state.character.lastName = f.legion.realLast; }
    f.legion = f.legion ? { ...f.legion, declared: false, served: years } : null;
    const res = state.migration?.residences?.FR;
    if (res && !isCitizen(state, 'FR') && ['honorable', 'retired', 'medical'].includes(type) && years >= 3) {
      Object.assign(res, { status: 'permanent', permanentSince: state.character.age, visa: 'resident' });
      ctx.log('Your service earned you a ten-year carte de résident: France is yours to stay in.', '🪪', 'good');
    }
  }
  // The service record says where you served, and what it earned.
  const h = state.military.history.at(-1);
  if (h && svc.gurkha) h.gurkha = svc.gurkha;
  if (h && svc.legion) h.legion = true;
  if (svc.gurkha === 'GB') {
    f.gurkha = null;
    // The Armed Forces Pension Scheme: an immediate pension from 18 years (Gurkhas' long engagements), preserved otherwise.
    if (years >= 18 && ['honorable', 'retired', 'medical'].includes(type) && !state.retirement.pensions.some((p) => p.id === 'gurkhaGB')) {
      ctx.emit('retirement:addPension', { pension: { id: 'gurkhaGB', label: 'Gurkha pension (Armed Forces Pension Scheme)', annual: Math.round(Math.max(6000, years * 650)), startAge: state.character.age, source: 'military', cola: 0.02 } });
      if (h) h.gurkhaPension = true;
    }
    const res = state.migration?.residences?.GB;
    if (res && !isCitizen(state, 'GB') && years >= 4 && ['honorable', 'retired', 'medical'].includes(type)) {
      Object.assign(res, { status: 'permanent', permanentSince: state.character.age, visa: 'settlement', qualifyingSince: res.qualifyingSince ?? state.character.age });
      if (h) h.settlement = true;
      ctx.log('As a former Gurkha with four years\' service, you were granted settlement (indefinite leave to remain) in Britain.', '🪪', 'good');
    }
  }
  if (svc.gurkha === 'IN') f.gurkha = null;
}

export const ForeignForcesModule = {
  id: 'foreignForces',
  order: 20.6,
  setup(engine) {
    engine.bus.on('military:discharged', ({ ctx, svc, type }) => { if (type !== 'kia') separated(ctx, svc, type); });
  },
  onAgeUp(ctx) {
    legionYear(ctx);
    gurkhaYear(ctx);
    spainYear(ctx);
  },
  actions: {
    /** Make your way to France and join the Foreign Legion. */
    legion(ctx) {
      const { state, rng } = ctx;
      const check = legionCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'foreignForces.legion');
      if (here(state) !== 'FR' && !ctx.spend(600, 'Travel to the Legion recruiting post', { credit: true })) return ctx.toast('You can\'t afford the trip to France.', 'warn');
      if (state.career.job) leaveJob(ctx, 'Left to join the Foreign Legion');
      if (!rng.chance(check.odds)) {
        ctx.stat('fitness', 1);
        return ctx.log(`Three weeks at Aubagne: medicals, the Luc Léger run, psychotechnical tests, the "gestapo" interview. You weren't taken.${here(state) !== 'FR' ? ' You went home.' : ''}`, '🎖️', 'bad');
      }
      return joinLegion(ctx);
    },
    /** Join Spain's armed forces as a foreign volunteer (citizens of Spanish-speaking countries). */
    spain(ctx) {
      const { state, rng } = ctx;
      const check = spainCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'foreignForces.spain');
      if (here(state) !== 'ES' && !ctx.spend(900, 'Travel to Spain', { credit: true })) return ctx.toast('You can\'t afford the trip to Spain.', 'warn');
      if (!rng.chance(check.odds)) return ctx.log('You sat the Spanish armed forces\' tests for foreign volunteers and didn\'t make the list this year.', '🇪🇸', 'bad');
      if (state.career.job) leaveJob(ctx, 'Left to join the Spanish armed forces');
      if (here(state) !== 'ES') arrive(ctx, 'ES', { visa: 'military', reason: 'You moved to Spain to join the armed forces as a foreign volunteer.' });
      const legion = rng.chance(0.4);
      if (!enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' })) return undefined;
      Object.assign(state.military.service, { foreignTroop: 'ES', spanishLegion: legion, contractYearsLeft: 3 });
      return ctx.log(legion ? 'You joined the Spanish Legion — the Tercio, "novios de la muerte" — as a foreign volunteer.' : 'You enlisted in the Spanish Army as a foreign volunteer (tropa extranjera).', '🇪🇸', 'milestone');
    },
    /** A former Gurkha back in the hills: village welfare work with the Gurkha Welfare Trust. */
    welfare(ctx) {
      const { state, rng } = ctx;
      if (!gurkhaVeteran(state) || here(state) !== 'NP') return ctx.toast('Former Gurkhas back in Nepal', 'warn');
      if (yearlyCount(state, 'foreignForces.welfare')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'foreignForces.welfare');
      const f = ff(state);
      f.welfareYears = (f.welfareYears ?? 0) + 1;
      ctx.stat('happiness', 6);
      if (f.welfareYears === 5) ctx.log('The village asked you to sit on the council of elders: a former Gurkha\'s word carries weight in the hills.', '🏔️', 'honor');
      return ctx.log(rng.pick(['You helped the Gurkha Welfare Trust build a water scheme for your village.', 'You visited old soldiers\' widows with their welfare pensions.', 'You organised a school roof repair with the Trust\'s engineers.', 'You coached the village boys for the doko race.']), '🗡️', 'good');
    },
    /** A priest's three years in a mission diocese. */
    mission(ctx) {
      const { state, rng } = ctx;
      const check = missionCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'foreignForces.mission');
      const picks = rng.shuffle([...MISSIONS]).slice(0, 3);
      return ctx.prompt({
        type: 'foreignForces.mission', icon: '⛪', title: 'Fidei Donum',
        text: 'Your bishop will lend you to a diocese short of priests for three years. Where?',
        options: [...picks.map(([p, c]) => ({ id: p, label: `⛪ ${p}, ${c}` })), { id: 'stay', label: '🏠 Stay with my parish' }],
        data: {},
      });
    },
    /** Sit the Gurkha selection in Pokhara. */
    gurkha(ctx) {
      const { state, rng } = ctx;
      const check = gurkhaCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'foreignForces.gurkha');
      ff(state).gurkhaTries += 1;
      ctx.stat('stress', 6);
      if (rng.chance(check.odds)) {
        return ctx.prompt({
          type: 'foreignForces.gurkhaChoice', icon: '🗡️', title: 'Selected',
          text: 'You finished the doko race with minutes to spare and came through the exams and interviews: one of a few hundred chosen from thousands. The top recruits choose their service.',
          // Britain opened Gurkha selection to women; Singapore's Contingent and India's Gorkha Rifles take men.
          options: [
            { id: 'GB', label: '🇬🇧 The British Army — Brigade of Gurkhas', hint: 'Settle in Britain after four years' },
            ...(state.character.gender === 'female' ? [] : [{ id: 'SG', label: '🇸🇬 The Singapore Police Gurkha Contingent', hint: 'Service to 45, then home' }]),
          ],
          data: {},
        });
      }
      if (state.character.gender !== 'female' && rng.chance(0.35)) {
        return ctx.prompt({
          type: 'foreignForces.gurkhaChoice', icon: '🗡️', title: 'The Gorkha Rifles',
          text: 'The British selection didn\'t take you, but the Indian Army\'s Gorkha Rifles will.',
          options: [{ id: 'IN', label: '🇮🇳 Join the Gorkha Rifles' }, { id: 'no', label: '🏠 Try the British selection again next year' }],
          data: {},
        });
      }
      return ctx.log('The doko race and the exams in Pokhara: you weren\'t among the few hundred selected this year.', '🗡️', 'bad');
    },
  },
  resolvers: {
    puyloubier(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'yes') return ctx.log('You left the Legion to make your own way.', '🏠');
      ff(state).puyloubier = true;
      if (state.housing) { state.housing.rental = null; state.housing.withParents = false; }
      return ctx.log('You retired to the Institution des Invalides de la Légion étrangère at Puyloubier: wine from the Legion\'s own vines, and the képi blanc on the wall.', '🍇', 'milestone');
    },
    mission(ctx, data, optionId) {
      if (optionId === 'stay') return ctx.log('You stayed with your parish.', '⛪');
      const [place, country] = MISSIONS.find(([p]) => p === optionId) ?? MISSIONS[0];
      postAbroad(ctx, { place, country, kind: 'mission', years: 3 });
      ctx.stat('happiness', 6);
      return ctx.log(`Your bishop lent you to the diocese of ${place} as a Fidei donum priest for three years: baptisms by the hundred, a parish the size of a county, and a motorbike.`, '⛪', 'milestone');
    },
    gurkhaChoice(ctx, data, optionId) {
      if (optionId === 'no') return ctx.log('You went home to train for next year.', '🏠');
      return joinGurkhas(ctx, optionId);
    },
    legionCitizen(ctx, data, optionId) {
      const { state, rng } = ctx;
      const l = state.foreignForces?.legion;
      if (!l || optionId !== 'apply') return undefined;
      if (!rng.chance(0.85)) return ctx.log('Your application for French nationality was turned down this time.', '🇫🇷', 'bad');
      l.citizen = 'service';
      state.character.citizenships = [...new Set([...citizenshipsOf(state), 'FR'])];
      delete ensureMigration(state).residences.FR;
      return ctx.log('You became French: Legio Patria Nostra, and now France too.', '🇫🇷', 'milestone');
    },
    regularise(ctx, data, optionId) {
      const { state } = ctx;
      const l = state.foreignForces?.legion;
      if (!l || optionId !== 'yes') return ctx.log('You stayed under your declared identity.', '🎭');
      state.character.firstName = l.realFirst;
      state.character.lastName = l.realLast;
      l.declared = false;
      return ctx.log(`Your situation was regularised: you're ${l.realFirst} ${l.realLast} again on the Legion's books. After three years' service you can apply to be French.`, '📜', 'good');
    },
  },
};

export const gurkhaVeteran = (state) => state.military.history.some((h) => h.gurkha) || Boolean(state.retirement?.pensions?.some((p) => p.id === 'gurkhaSG'));

/** Legion and Gurkha: what the military card offers. */
export function foreignForcesOptions(state) {
  const out = [];
  if (!state.military.service && state.character.gender === 'male' && state.character.age >= 17 && state.character.age <= 39) out.push({ id: 'legion', check: legionCheck(state) });
  if (citizenshipsOf(state).some((x) => IBERO.includes(x)) && !isCitizen(state, 'ES') && state.character.age >= 18 && state.character.age <= 29 && !state.military.service) out.push({ id: 'spain', check: spainCheck(state) });
  if (state.career.job?.professionId === 'catholicClergy') out.push({ id: 'mission', check: missionCheck(state) });
  if (gurkhaVeteran(state) && here(state) === 'NP') out.push({ id: 'welfare', check: yearlyCount(state, 'foreignForces.welfare') ? { ok: false, reason: 'Once a year' } : { ok: true } });
  if (isCitizen(state, 'NP') && state.character.age >= 17 && state.character.age <= 21 && !state.military.service && !state.foreignForces?.gurkha) out.push({ id: 'gurkha', check: gurkhaCheck(state) });
  return out;
}
