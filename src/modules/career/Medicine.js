/**
 * Medicine as a career: the residency Match by specialty, fellowships, and
 * malpractice.
 *
 *  - The Match: new M.D.s rank a specialty and match (or don't) based on
 *    their board scores (smarts), med-school prestige, and how competitive
 *    the field is. Unmatched applicants scramble into an open spot (SOAP) or
 *    take a research year and re-apply. The specialty sets residency length
 *    and, once you're an attending, your pay.
 *  - Fellowships: after residency, subspecialty training (cardiology, GI,
 *    surgical oncology, pain…) at fellow's pay, for a higher attending salary.
 *  - Malpractice: each specialty carries its own claim risk. Claims you
 *    settle or lose stay on your record for ten years, raise your premium,
 *    and three paid claims bring a medical-board review. Large hospital
 *    systems cover their doctors' premiums; smaller employers pass them on.
 *
 * state.medicine = { specialty, fellowship, fellowshipYearsLeft, research, claims: [{ age, paid }] }
 */
import { clamp } from '../../core/Random.js';
import { stateIdOf } from '../life/Regions.js';
import { SCHOOLS } from '../education/Catalog.js';
import { recalcSalary } from './Compensation.js';

/** years: residency length · pay: attending multiplier · comp: competitiveness (0–1) · claims: yearly claim odds · premium: base yearly premium */
export const SPECIALTIES = {
  familyMedicine: { name: 'Family Medicine', icon: '👪', years: 3, pay: 1.0, comp: 0.1, claims: 0.05, premium: 12000 },
  pediatrics: { name: 'Pediatrics', icon: '🧸', years: 3, pay: 0.95, comp: 0.15, claims: 0.035, premium: 11000 },
  internalMedicine: { name: 'Internal Medicine', icon: '🫀', years: 3, pay: 1.05, comp: 0.2, claims: 0.06, premium: 14000 },
  psychiatry: { name: 'Psychiatry', icon: '🧠', years: 4, pay: 1.1, comp: 0.3, claims: 0.03, premium: 9000 },
  neurology: { name: 'Neurology', icon: '⚡', years: 4, pay: 1.12, comp: 0.3, claims: 0.06, premium: 16000 },
  pathology: { name: 'Pathology', icon: '🔬', years: 4, pay: 1.15, comp: 0.2, claims: 0.03, premium: 9000 },
  emergencyMedicine: { name: 'Emergency Medicine', icon: '🚑', years: 3, pay: 1.25, comp: 0.35, claims: 0.09, premium: 25000 },
  obgyn: { name: 'Obstetrics & Gynecology', icon: '🤰', years: 4, pay: 1.3, comp: 0.45, claims: 0.13, premium: 60000 },
  generalSurgery: { name: 'General Surgery', icon: '🔪', years: 5, pay: 1.45, comp: 0.5, claims: 0.14, premium: 50000 },
  anesthesiology: { name: 'Anesthesiology', icon: '💉', years: 4, pay: 1.6, comp: 0.5, claims: 0.06, premium: 20000 },
  radiology: { name: 'Diagnostic Radiology', icon: '🩻', years: 5, pay: 1.7, comp: 0.55, claims: 0.07, premium: 22000 },
  dermatology: { name: 'Dermatology', icon: '🧴', years: 4, pay: 1.7, comp: 0.85, claims: 0.035, premium: 12000 },
  orthopedics: { name: 'Orthopedic Surgery', icon: '🦴', years: 5, pay: 2.0, comp: 0.8, claims: 0.12, premium: 55000 },
  neurosurgery: { name: 'Neurosurgery', icon: '🧠', years: 7, pay: 2.3, comp: 0.9, claims: 0.19, premium: 90000 },
};
/** Open spots in the scramble (SOAP) for the unmatched. */
const SOAP = ['familyMedicine', 'internalMedicine', 'pediatrics', 'psychiatry'];

/** from: specialties that feed it · years · pay: replaces the specialty multiplier once complete */
export const FELLOWSHIPS = {
  cardiology: { name: 'Cardiology', from: ['internalMedicine'], years: 3, pay: 1.75, comp: 0.6, claims: 0.08, premium: 30000 },
  gastroenterology: { name: 'Gastroenterology', from: ['internalMedicine'], years: 3, pay: 1.7, comp: 0.6, claims: 0.07, premium: 22000 },
  hemOnc: { name: 'Hematology–Oncology', from: ['internalMedicine'], years: 3, pay: 1.5, comp: 0.45, claims: 0.05, premium: 18000 },
  pulmCrit: { name: 'Pulmonary & Critical Care', from: ['internalMedicine', 'emergencyMedicine', 'anesthesiology'], years: 3, pay: 1.45, comp: 0.4, claims: 0.07, premium: 20000 },
  sportsMed: { name: 'Sports Medicine', from: ['familyMedicine', 'orthopedics', 'emergencyMedicine'], years: 1, pay: 1.15, comp: 0.3 },
  geriatrics: { name: 'Geriatrics', from: ['familyMedicine', 'internalMedicine'], years: 1, pay: 1.05, comp: 0.05 },
  childPsych: { name: 'Child & Adolescent Psychiatry', from: ['psychiatry'], years: 2, pay: 1.2, comp: 0.2 },
  picu: { name: 'Pediatric Critical Care', from: ['pediatrics'], years: 3, pay: 1.2, comp: 0.3 },
  surgOnc: { name: 'Surgical Oncology', from: ['generalSurgery'], years: 2, pay: 1.7, comp: 0.5 },
  vascular: { name: 'Vascular Surgery', from: ['generalSurgery'], years: 2, pay: 1.8, comp: 0.5 },
  pain: { name: 'Pain Medicine', from: ['anesthesiology', 'neurology'], years: 1, pay: 1.8, comp: 0.4 },
  interventional: { name: 'Interventional Radiology', from: ['radiology'], years: 1, pay: 1.9, comp: 0.5 },
  mohs: { name: 'Mohs Surgery', from: ['dermatology'], years: 1, pay: 2.0, comp: 0.7 },
  spine: { name: 'Spine Surgery', from: ['orthopedics', 'neurosurgery'], years: 1, pay: 2.3, comp: 0.6 },
};

export const FELLOW_PAY = 0.45;
export const CLAIM_MEMORY = 10;
export const BOARD_REVIEW_AT = 3;
/** Malpractice climate by state (tort reform caps vs. high-verdict venues). */
const STATE_PREMIUM = { NY: 1.6, IL: 1.5, FL: 1.5, DC: 1.3, CA: 0.9, TX: 0.8, CO: 0.8, MT: 0.7, IA: 0.7, OH: 0.9, WA: 0.9 };

export const TRAINING_LEVELS = ['resident', 'chiefResident'];
export const isDoctor = (job) => job?.professionId === 'medical';

export function matchOdds(state, specialtyId) {
  const s = SPECIALTIES[specialtyId];
  const md = state.education.degrees.find((d) => d.programId === 'md');
  const prestige = SCHOOLS[md?.schoolId]?.prestige ?? 1;
  const r = state.medicine?.schoolRecord;
  // Program directors read Step 2 scores, clerkship honors, research and letters from away rotations in the specialty.
  const application = r?.step2
    ? (r.step2 - 245) / 45 + r.honors * 0.025 + Math.min(0.1, (r.pubs ?? 0) * 0.02) + (r.interest === specialtyId ? 0.03 + (r.aways ?? 0) * 0.04 : 0)
    : (state.stats.smarts - 70) / 60;
  const score = application + (prestige - 1) * 0.04 + (state.medicine?.research ? 0.1 : 0);
  return clamp(0.95 - s.comp * 0.85 + score, 0.05, 0.97);
}

/** Where an attending practices: pay multiplier, burnout per year, and what it means. */
export const PRACTICES = {
  employed: { name: 'Hospital-employed', icon: '🏥', pay: 1.0, burnout: 4, desc: 'A salary, a schedule and an EHR inbox that never empties.' },
  private: { name: 'Private practice', icon: '🩺', pay: 0.9, partnerPay: 1.2, burnout: 5, desc: 'Lower pay as an associate; a partnership buy-in after three years, then a share of the profits.' },
  academic: { name: 'Academic medicine', icon: '🎓', pay: 0.82, burnout: 3, desc: 'Less money; teaching residents, research and a faculty title.' },
  locums: { name: 'Locum tenens', icon: '🧳', pay: 1.15, burnout: 2, desc: 'Fill-in contracts around the country: high pay, no benefits, a lot of hotels.' },
};
export const PART_TIME_PAY = 0.7;

/** Pay multiplier from practice setting, partnership and part-time hours. */
export function practiceMultiplier(state) {
  const m = state.medicine;
  const p = PRACTICES[m?.practice];
  if (!p) return 1;
  return (m.partner && p.partnerPay ? p.partnerPay : p.pay) * (m.partTime ? PART_TIME_PAY : 1);
}

export function fellowshipOdds(state, id) {
  const f = FELLOWSHIPS[id];
  const perf = (state.career.job?.performance ?? 50) - 50;
  return clamp(0.9 - f.comp * 0.7 + perf / 150 + (state.stats.smarts - 70) / 100, 0.05, 0.95);
}

export const paidClaims = (state) => (state.medicine?.claims ?? []).filter((c) => c.paid && state.character.age - c.age < CLAIM_MEMORY).length;

/** Risk profile: the fellowship's if you have one, else the specialty's. */
function riskOf(state) {
  const m = state.medicine;
  const f = m?.fellowship && !m.fellowshipYearsLeft ? FELLOWSHIPS[m.fellowship] : null;
  const s = SPECIALTIES[m?.specialty] ?? SPECIALTIES.internalMedicine;
  return { claims: f?.claims ?? s.claims, premium: f?.premium ?? s.premium };
}

/** Yearly premium for an attending: specialty × state climate × claims history. */
export function malpracticePremium(state) {
  const { premium } = riskOf(state);
  return Math.round(premium * (STATE_PREMIUM[stateIdOf(state)] ?? 1) * (1 + 0.5 * paidClaims(state)) / 100) * 100;
}

/** Large hospital systems self-insure their physicians. */
export const employerCoversPremium = (job) => ['large', 'enterprise'].includes(job.employer.size);

/** Pay multiplier for a physician's job right now. */
export function physicianPayAdjust(state, job) {
  const m = state.medicine;
  if (!m?.specialty || TRAINING_LEVELS.includes(job.levelId)) return 1;
  if (m.fellowshipYearsLeft > 0) return FELLOW_PAY;
  if (m.fellowship) return FELLOWSHIPS[m.fellowship].pay * practiceMultiplier(state);
  return SPECIALTIES[m.specialty].pay * practiceMultiplier(state);
}

export function applyPhysicianPay(state, job) {
  if (!isDoctor(job)) return;
  job.payAdjust = physicianPayAdjust(state, job);
  job.residencyYears = state.medicine?.specialty ? Math.max(1, SPECIALTIES[state.medicine.specialty].years - 1) : null;
  recalcSalary(state, job);
}

function matchPrompt(ctx, { rematch = false } = {}) {
  const { state } = ctx;
  ctx.prompt({
    type: 'medicine.match', icon: '🩺', title: rematch ? 'The Match, Again' : 'Match Day',
    text: `${rematch ? 'After your research year, you re-entered the Match.' : 'You submitted your rank list to the National Resident Matching Program.'} Which specialty did you rank first?\nRates reflect your board scores and medical school.`,
    options: Object.entries(SPECIALTIES).map(([id, s]) => ({ id, label: `${s.icon} ${s.name}`, hint: `${Math.round(matchOdds(state, id) * 100)}% match odds · ${s.years}-yr residency · pay ×${s.pay}` })),
  });
}

function startFellowshipPrompt(ctx) {
  const { state } = ctx;
  const options = Object.entries(FELLOWSHIPS).filter(([, f]) => f.from.includes(state.medicine.specialty)).map(([id, f]) => ({ id, label: `🎓 ${f.name}`, hint: `${f.years} yr at fellow pay · then ×${f.pay} · ${Math.round(fellowshipOdds(state, id) * 100)}% odds` }));
  if (!options.length) return;
  ctx.prompt({
    type: 'medicine.fellowship', icon: '🎓', title: 'Fellowship?',
    text: `You're finishing ${SPECIALTIES[state.medicine.specialty].name} residency. Subspecialty training means more years at a trainee's salary — and a bigger paycheck after.`,
    options: [...options, { id: 'none', label: '🏥 Go straight into practice' }],
  });
}

function claimTick(ctx, job) {
  const { state, rng } = ctx;
  const { claims } = riskOf(state);
  const burnout = (state.medicine.burnout ?? 0) >= 70 ? 1.3 : 1;
  if (!rng.chance(claims * (job.performance < 40 ? 1.5 : 1) * burnout * (state.medicine.partTime ? 0.7 : 1)) || state.prompts.some((p) => p.type === 'medicine.claim')) return;
  const what = rng.pick(['a missed diagnosis', 'a surgical complication', 'a delayed diagnosis of cancer', 'a medication error', 'a birth injury', 'a wrong-site procedure']);
  ctx.prompt({
    type: 'medicine.claim', icon: '⚖️', title: 'Malpractice Claim',
    text: `A former patient is suing you over ${what}. Your insurer's lawyers want your decision.`,
    options: [
      { id: 'settle', label: '🤝 Consent to settle', hint: 'Paid claim on your record; premiums rise' },
      { id: 'fight', label: '⚖️ Fight it at trial', hint: 'Most doctors win at trial — losing is worse' },
    ],
    data: { what },
  });
}

export const MedicineModule = {
  id: 'medicine',
  order: 30.7,

  init(state) {
    state.medicine ??= { specialty: null, fellowship: null, fellowshipYearsLeft: 0, research: false, claims: [] };
  },

  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => {
      if (!isDoctor(job)) return;
      if (!ctx.state.medicine.specialty && job.levelId === 'resident') matchPrompt(ctx);
      else applyPhysicianPay(ctx.state, job);
    });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career.job;
    const m = state.medicine;
    if (!isDoctor(job) || !job.paidThisYear) return;
    if (m.research) {
      m.research = false;
      return matchPrompt(ctx, { rematch: true });
    }
    // Fellowship years.
    if (m.fellowshipYearsLeft > 0) {
      m.fellowshipYearsLeft -= 1;
      if (!m.fellowshipYearsLeft) {
        ctx.log(`You finished your ${FELLOWSHIPS[m.fellowship].name} fellowship.`, '🎓', 'milestone');
        applyPhysicianPay(state, job);
      }
      return;
    }
    // Finishing residency: the fellowship decision.
    if (job.levelId === 'chiefResident' && !m.fellowship && !m.fellowshipAsked) {
      m.fellowshipAsked = true;
      startFellowshipPrompt(ctx);
    }
    if (TRAINING_LEVELS.includes(job.levelId)) return;
    // Attendings: premiums and claims.
    applyPhysicianPay(state, job);
    if (!employerCoversPremium(job)) ctx.spend(malpracticePremium(state), 'Malpractice insurance premium', { allowDebt: true });
    claimTick(ctx, job);
  },

  resolvers: {
    match(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const s = SPECIALTIES[optionId];
      const job = state.career.job;
      if (!s || !isDoctor(job)) return;
      if (rng.chance(matchOdds(state, optionId))) {
        state.medicine.specialty = optionId;
        ctx.log(`Match Day: you matched into ${s.name}! ${s.years} years of residency ahead.`, s.icon, 'milestone');
        ctx.stat('happiness', 8);
        applyPhysicianPay(state, job);
        return;
      }
      ctx.prompt({
        type: 'medicine.soap', icon: '📭', title: 'You Didn\'t Match',
        text: `No ${s.name} program matched you. The scramble (SOAP) has open positions this week — or you can do a year of research and re-apply.`,
        options: [
          ...SOAP.filter((id) => id !== optionId).map((id) => ({ id, label: `${SPECIALTIES[id].icon} Scramble into ${SPECIALTIES[id].name}` })),
          { id: 'research', label: '🔬 Research year, then re-apply', hint: 'Better odds next time; a year lost' },
        ],
      });
      ctx.stat('happiness', -10);
    },

    soap(ctx, _data, optionId) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isDoctor(job)) return;
      if (optionId === 'research') {
        state.medicine.research = true;
        job.yearsInLevel = -1;
        return ctx.log('You took a research year in a lab, collecting publications for next year\'s application.', '🔬');
      }
      state.medicine.specialty = optionId;
      ctx.log(`You scrambled into a ${SPECIALTIES[optionId].name} residency.`, SPECIALTIES[optionId].icon, 'good');
      applyPhysicianPay(state, job);
    },

    fellowship(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const f = FELLOWSHIPS[optionId];
      if (!f) return ctx.log('You skipped fellowship and went into practice.', '🏥');
      if (!rng.chance(fellowshipOdds(state, optionId))) return ctx.log(`You didn't match into a ${f.name} fellowship. Straight into practice, then.`, '📭', 'warn');
      state.medicine.fellowship = optionId;
      state.medicine.fellowshipYearsLeft = f.years;
      ctx.log(`You matched into a ${f.name} fellowship: ${f.years} more year${f.years > 1 ? 's' : ''} of training.`, '🎓', 'milestone');
    },

    claim(ctx, data, optionId) {
      const { state, rng } = ctx;
      const m = state.medicine;
      ctx.stat('stress', 10);
      let paid = optionId === 'settle';
      if (optionId === 'fight') {
        const win = rng.chance(0.75 + ((state.career.job?.performance ?? 50) - 50) / 300);
        paid = !win;
        ctx.log(win ? `The jury found in your favor on ${data.what}. Two years of your life, but your record is clean.` : `The jury found against you over ${data.what} — a large verdict, paid by your insurer, and on your record.`, '⚖️', win ? 'good' : 'bad');
        if (!win) ctx.stat('happiness', -8);
      } else ctx.log(`Your insurer settled the claim over ${data.what}. It goes on your record.`, '🤝', 'warn');
      m.claims.push({ age: state.character.age, paid });
      if (paid && paidClaims(state) >= BOARD_REVIEW_AT) {
        ctx.log(`With ${paidClaims(state)} paid claims in ten years, the state medical board suspended your license for a year pending review.`, '🏛️', 'bad');
        ctx.emit('credential:suspend', { ids: ['medicalLicense'], years: 1, reason: 'Medical board review of malpractice history' });
      }
    },
  },
};
