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
import { yearlyCount, bumpYearly, hasFelony, randomName, setNameCountry } from '../../core/State.js';
import { enlist } from '../military/MilitaryEngine.js';
import { arrive, ensureMigration } from './Migration.js';
import { citizenshipsOf, isCitizen } from './Countries.js';
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
    return ctx.log('You passed out of training as a Police Constable of the Gurkha Contingent: guarding the Istana, riot control, the most sensitive security jobs in Singapore. You live in the Contingent\'s cantonment at Mount Vernon.', '🗡️', 'milestone');
  }
  const cc = where === 'IN' ? 'IN' : 'GB';
  arrive(ctx, cc, { visa: 'military', reason: cc === 'GB' ? 'You flew to Britain for recruit training at Catterick.' : 'You reported to the Gorkha Training Centre.' });
  if (!enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry' })) return undefined;
  const svc = state.military.service;
  Object.assign(svc, { gurkha: cc, contractYearsLeft: cc === 'GB' ? 15 : 17 });
  f.gurkha = cc;
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

/** Legion and Gurkha: what the military card offers. */
export function foreignForcesOptions(state) {
  const out = [];
  if (!state.military.service && state.character.gender === 'male' && state.character.age >= 17 && state.character.age <= 39) out.push({ id: 'legion', check: legionCheck(state) });
  if (isCitizen(state, 'NP') && state.character.age >= 17 && state.character.age <= 21 && !state.military.service && !state.foreignForces?.gurkha) out.push({ id: 'gurkha', check: gurkhaCheck(state) });
  return out;
}
