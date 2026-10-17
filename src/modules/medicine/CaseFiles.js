/**
 * Case files: the patient in front of you, as a puzzle you can solve.
 *
 * A clinician (physician, resident, PA or nurse practitioner) gets a case
 * most years: a presentation written the way it walks in, and three possible
 * diagnoses. Read the clues and pick — the right call saves the patient,
 * builds your reputation and your record; the wrong one can hurt someone
 * (and bring a malpractice claim). Ordering more tests always gets you
 * there, but slower and with less credit. A sharp mind (smarts) sometimes
 * gives you a gut feeling about the answer.
 *
 * Cases come from your specialty: an emergency physician sees strokes and
 * aortic dissections, a pediatrician intussusception and croup, an
 * ophthalmologist the red eye that's really glaucoma.
 *
 * state.medicine.cases = { solved, missed, saved, tested, streak, best, seen: [ids] }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, addHonor } from '../../core/State.js';
import { TRAINING_LEVELS } from '../career/Medicine.js';

/** groups: which clinicians see it · critical: getting it right saves a life · rare: a "zebra" worth a case report */
export const CASES = [
  { id: 'stemi', groups: ['any', 'emergency', 'cardio'], icon: '🫀', critical: true, text: 'A 58-year-old man with crushing chest pressure spreading to his left arm and jaw. He\'s sweating and nauseous. The ECG shows ST elevation in leads II, III and aVF.', answer: 'A heart attack (inferior STEMI) — to the cath lab', wrong: ['Acid reflux', 'A panic attack'] },
  { id: 'appendicitis', groups: ['any', 'emergency', 'surgery', 'peds'], icon: '🩻', critical: true, text: 'A 19-year-old whose pain began around her navel and moved to the lower right of her abdomen. Fever, no appetite, and it hurts most when you press and let go.', answer: 'Acute appendicitis', wrong: ['Gastroenteritis', 'A kidney stone'] },
  { id: 'stroke', groups: ['any', 'emergency', 'neuro'], icon: '🧠', critical: true, text: 'A 72-year-old woman with sudden weakness down her right side, a drooping face and slurred speech that began forty minutes ago.', answer: 'A stroke — scan now and treat the clot', wrong: ['Bell\'s palsy', 'A migraine aura'] },
  { id: 'dka', groups: ['any', 'peds', 'emergency'], icon: '🩸', critical: true, text: 'A 16-year-old with weeks of thirst, getting up all night to pee and losing weight — now vomiting, breathing deep and fast, with fruity-smelling breath.', answer: 'Diabetic ketoacidosis', wrong: ['A stomach bug', 'Anxiety'] },
  { id: 'ectopic', groups: ['obgyn', 'emergency', 'any'], icon: '🤰', critical: true, text: 'A 26-year-old with a missed period, sudden one-sided pelvic pain and dizziness. Her pregnancy test is positive, but the ultrasound shows nothing in the uterus.', answer: 'A ruptured ectopic pregnancy', wrong: ['An ovarian cyst', 'A urinary tract infection'] },
  { id: 'pe', groups: ['any', 'emergency'], icon: '🫁', critical: true, text: 'A 34-year-old on the pill, just off a 14-hour flight: sudden breathlessness, a racing heart, sharp pain when she breathes in, and a swollen left calf.', answer: 'A pulmonary embolism', wrong: ['Pneumonia', 'A pulled chest muscle'] },
  { id: 'meningitis', groups: ['any', 'emergency', 'peds', 'neuro'], icon: '🦠', critical: true, text: 'A college freshman with a fever, a stiff neck, a pounding headache, pain from bright light, and a purple rash that doesn\'t fade when you press a glass on it.', answer: 'Bacterial meningitis — antibiotics immediately', wrong: ['A migraine', 'The flu'] },
  { id: 'anaphylaxis', groups: ['any', 'emergency', 'peds'], icon: '🥜', critical: true, text: 'Minutes after a restaurant meal: hives, swollen lips, wheezing, and a blood pressure that keeps falling.', answer: 'Anaphylaxis — epinephrine now', wrong: ['An asthma attack', 'Food poisoning'] },
  { id: 'lyme', groups: ['any', 'derm', 'peds'], icon: '🦟', text: 'A hiker back from a camping trip with fever, aching joints and a spreading red rash on his thigh that looks like a bull\'s-eye.', answer: 'Lyme disease', wrong: ['Ringworm', 'A spider bite'] },
  { id: 'hypothyroid', groups: ['any'], icon: '🦋', text: 'Exhausted, always cold, gaining weight, constipated, with dry skin and the outer third of her eyebrows thinning.', answer: 'An underactive thyroid', wrong: ['Depression', 'Just getting older'] },
  { id: 'melanoma', groups: ['derm', 'any', 'plastics'], icon: '🔎', critical: true, text: 'A mole on his back that\'s lopsided, with ragged edges, three different colours, 8 mm across — and his wife says it\'s grown.', answer: 'Possible melanoma — biopsy it', wrong: ['A harmless mole', 'A seborrheic keratosis'] },
  { id: 'preeclampsia', groups: ['obgyn', 'any'], icon: '🤰', critical: true, text: 'Thirty-four weeks pregnant, blood pressure 165/110, a headache that won\'t quit, seeing spots, and protein in her urine.', answer: 'Preeclampsia', wrong: ['Normal pregnancy swelling', 'A tension headache'] },
  { id: 'intussusception', groups: ['peds'], icon: '🧸', critical: true, text: 'A one-year-old with bouts of screaming and pulling up his legs, vomiting, and a stool that looks like red currant jelly.', answer: 'Intussusception', wrong: ['Colic', 'Teething'] },
  { id: 'pyloric', groups: ['peds', 'surgery'], icon: '🍼', text: 'A four-week-old firstborn boy who projectile-vomits after every feed and is hungry again straight away. You feel an olive-sized lump in his belly.', answer: 'Pyloric stenosis', wrong: ['Reflux', 'A milk allergy'] },
  { id: 'croup', groups: ['peds', 'ent'], icon: '🦭', text: 'A two-year-old with a barking, seal-like cough that\'s worse at night and a harsh noise every time she breathes in.', answer: 'Croup', wrong: ['Asthma', 'An ear infection'] },
  { id: 'kawasaki', groups: ['peds'], icon: '🍓', critical: true, rare: true, text: 'A three-year-old with five days of fever, red eyes without discharge, cracked red lips, a strawberry tongue and swollen, red hands.', answer: 'Kawasaki disease', wrong: ['A viral rash', 'Hand, foot and mouth disease'] },
  { id: 'gallbladder', groups: ['surgery', 'any', 'emergency'], icon: '🍟', text: 'A 45-year-old with pain under her right ribs after fatty meals, spreading to her right shoulder, and a fever. She stops breathing in when you press there.', answer: 'An inflamed gallbladder (cholecystitis)', wrong: ['Heartburn', 'A pulled muscle'] },
  { id: 'dissection', groups: ['emergency', 'surgery', 'cardio', 'radiology'], icon: '⚡', critical: true, rare: true, text: 'A tall, lanky 30-year-old with sudden tearing chest pain that goes straight through to his back. His blood pressure is different in each arm.', answer: 'An aortic dissection', wrong: ['A heart attack', 'A muscle strain'] },
  { id: 'mania', groups: ['psych'], icon: '🎢', text: 'He hasn\'t slept in four days and isn\'t tired, talks without stopping, and spent his savings on a business idea that "can\'t lose".', answer: 'A manic episode (bipolar disorder)', wrong: ['ADHD', 'Too much coffee'] },
  { id: 'suicideRisk', groups: ['psych', 'any'], icon: '🕯️', critical: true, text: 'She\'s lost interest in everything, sleeps all day, gave away her guitar last week and told friends goodbye "just in case".', answer: 'Severe depression with suicide risk — ask directly and keep her safe', wrong: ['Just a rough patch', 'Work burnout'] },
  { id: 'withdrawal', groups: ['psych', 'any', 'surgery'], icon: '🍺', critical: true, text: 'Two days after admission for a broken hip, your patient is shaking, drenched in sweat, seeing bugs on the wall, with a racing heart.', answer: 'Alcohol withdrawal (delirium tremens)', wrong: ['Hospital confusion in an older patient', 'Low blood sugar'] },
  { id: 'gbs', groups: ['neuro', 'pmr'], icon: '🦵', critical: true, rare: true, text: 'A week after a stomach bug, tingling and weakness started in her feet and is climbing up her legs. Her reflexes are gone.', answer: 'Guillain–Barré syndrome', wrong: ['A pinched nerve', 'Anxiety'] },
  { id: 'ms', groups: ['neuro', 'radiology', 'eye'], icon: '🧬', text: 'A 28-year-old who had blurred vision and a painful eye last year that cleared up, and now numbness down one side. The MRI shows bright spots in the brain\'s white matter.', answer: 'Multiple sclerosis', wrong: ['Migraines', 'Stress'] },
  { id: 'sah', groups: ['emergency', 'neuro', 'radiology'], icon: '💥', critical: true, text: 'Lifting weights, he felt a sudden "worst headache of my life", then vomited. Now his neck is stiff.', answer: 'A brain bleed (subarachnoid hemorrhage)', wrong: ['A migraine', 'A tension headache'] },
  { id: 'pneumothorax', groups: ['emergency', 'radiology', 'any'], icon: '🎈', critical: true, text: 'A tall, thin 20-year-old with sudden sharp chest pain and breathlessness. One side of his chest is silent through your stethoscope.', answer: 'A collapsed lung (pneumothorax)', wrong: ['Asthma', 'A heart attack'] },
  { id: 'torsion', groups: ['urology', 'surgery', 'peds', 'emergency'], icon: '⏱️', critical: true, text: 'A 14-year-old woke with sudden severe pain in one testicle and nausea. The testicle sits high and sideways.', answer: 'Testicular torsion — surgery within hours', wrong: ['Epididymitis', 'A hernia'] },
  { id: 'celiac', groups: ['any'], icon: '🍞', text: 'Bloating, diarrhea, iron-deficiency anemia that iron pills don\'t fix, and an itchy blistering rash on her elbows.', answer: 'Celiac disease', wrong: ['Irritable bowel syndrome', 'Lactose intolerance'] },
  { id: 'co', groups: ['emergency', 'any'], icon: '🏠', critical: true, text: 'A whole family with headaches, dizziness and nausea on a cold winter morning. The dog has been sleepy too, and they all feel better outside.', answer: 'Carbon monoxide poisoning', wrong: ['The flu', 'Food poisoning'] },
  { id: 'sepsis', groups: ['any', 'emergency'], icon: '🌡️', critical: true, text: 'An 80-year-old with a urinary infection is newly confused, feverish, her heart racing, blood pressure 82/50.', answer: 'Sepsis — fluids and antibiotics now', wrong: ['Worsening dementia', 'Mild dehydration'] },
  { id: 'shingles', groups: ['derm', 'any'], icon: '🎗️', text: 'Two days of burning pain in a strip on one side of her chest, and now a band of blisters in exactly that strip.', answer: 'Shingles', wrong: ['A heart problem', 'Poison ivy'] },
  { id: 'compartment', groups: ['surgery', 'emergency', 'ortho'], icon: '🦴', critical: true, text: 'After a tight cast for a broken shin: pain far worse than it should be, much worse when you stretch his toes, and a calf that feels rock-hard.', answer: 'Compartment syndrome — release the pressure', wrong: ['Normal fracture pain', 'A blood clot'] },
  { id: 'abruption', groups: ['obgyn', 'emergency'], icon: '🚗', critical: true, text: 'Thirty weeks pregnant, after a car crash: a painful, board-hard belly, dark bleeding, and the baby\'s heart rate is dropping.', answer: 'Placental abruption', wrong: ['Braxton Hicks contractions', 'A bruised abdomen'] },
  { id: 'nodule', groups: ['radiology', 'any', 'radOnc'], icon: '🩻', critical: true, text: 'A chest X-ray on a long-time smoker shows a coin-shaped shadow in the lung that wasn\'t there two years ago.', answer: 'A suspicious nodule — work it up for cancer', wrong: ['An old scar', 'An X-ray artifact'] },
  { id: 'mh', groups: ['anesthesia', 'surgery'], icon: '🔥', critical: true, rare: true, text: 'Minutes after anesthesia begins, the patient\'s jaw locks tight, carbon dioxide is soaring and the temperature keeps climbing.', answer: 'Malignant hyperthermia — give dantrolene', wrong: ['Anesthesia too light', 'Sepsis'] },
  { id: 'glaucoma', groups: ['eye', 'emergency'], icon: '👁️', critical: true, text: 'In a dark cinema: a painful red eye, halos around lights, blurred vision and vomiting. The pupil is half-dilated and the eye feels hard.', answer: 'Acute angle-closure glaucoma', wrong: ['Pink eye', 'A migraine'] },
  { id: 'epiglottitis', groups: ['ent', 'emergency', 'peds'], icon: '🗣️', critical: true, rare: true, text: 'An unvaccinated child sitting bolt upright, leaning forward, drooling, with a muffled voice and a high fever.', answer: 'Epiglottitis — secure the airway', wrong: ['Strep throat', 'Croup'] },
  { id: 'cauda', groups: ['pmr', 'neuro', 'surgery', 'ortho'], icon: '🪑', critical: true, text: 'Back pain for weeks, but now numbness between his legs, weakness in both legs and he can\'t pee.', answer: 'Cauda equina syndrome — emergency surgery', wrong: ['A simple back strain', 'A urinary infection'] },
  { id: 'kidneyStone', groups: ['urology', 'emergency', 'any'], icon: '🪨', text: 'Waves of severe pain in his flank that move toward his groin. He can\'t sit still, and there\'s blood in his urine.', answer: 'A kidney stone', wrong: ['Appendicitis', 'A pulled back muscle'] },
];

/** Which kinds of cases each specialty sees. */
const SPECIALTY_GROUPS = {
  familyMedicine: ['any', 'peds', 'psych', 'derm', 'obgyn'],
  pediatrics: ['peds', 'any'],
  internalMedicine: ['any', 'cardio'],
  psychiatry: ['psych'],
  neurology: ['neuro'],
  pathology: ['any', 'radiology'],
  emergencyMedicine: ['emergency', 'any'],
  obgyn: ['obgyn'],
  generalSurgery: ['surgery', 'emergency'],
  anesthesiology: ['anesthesia', 'surgery'],
  radiology: ['radiology'],
  dermatology: ['derm', 'plastics'],
  orthopedics: ['ortho', 'surgery'],
  neurosurgery: ['neuro', 'surgery'],
  pmr: ['pmr', 'neuro'],
  ophthalmology: ['eye'],
  ent: ['ent', 'peds'],
  urology: ['urology', 'surgery'],
  plastics: ['plastics', 'surgery', 'derm'],
  radOnc: ['radOnc', 'radiology'],
};
const CLINICIANS = ['medical', 'physicianAssistant'];

/** Is this job one that diagnoses patients? */
export function seesPatients(job) {
  if (!job) return false;
  if (CLINICIANS.includes(job.professionId)) return true;
  return job.professionId === 'nursing' && job.levelId === 'np';
}

export function casePool(state, job = state.career.job) {
  const groups = job?.professionId === 'medical' ? SPECIALTY_GROUPS[state.medicine?.specialty] ?? ['any'] : ['any', 'emergency'];
  const pool = CASES.filter((c) => c.groups.some((g) => groups.includes(g)));
  return pool.length >= 3 ? pool : CASES.filter((c) => c.groups.includes('any'));
}

export const casesOf = (state) => (state.medicine.cases ??= { solved: 0, missed: 0, saved: 0, tested: 0, streak: 0, best: 0, seen: [] });

/** Offer this year's case. */
export function casePrompt(ctx) {
  const { state, rng } = ctx;
  if (state.prompts.some((p) => p.type === 'caseFiles.case')) return null;
  const c = casesOf(state);
  const pool = casePool(state);
  const fresh = pool.filter((x) => !c.seen.includes(x.id));
  const pick = rng.pick(fresh.length ? fresh : pool);
  c.seen = [...c.seen.filter((id) => id !== pick.id), pick.id].slice(-20);
  const choices = rng.shuffle([pick.answer, ...pick.wrong]);
  // A sharp mind sometimes just knows.
  const hunch = state.stats.smarts + rng.int(-25, 15) >= 85;
  const options = choices.map((label, i) => ({ id: `dx${i}`, label: `🩺 ${label}`, hint: hunch && label === pick.answer ? 'Your gut says this one' : '' }));
  options.push({ id: 'tests', label: '🧪 Order more tests first', hint: 'Always gets there — slower, less credit' });
  return ctx.prompt({
    type: 'caseFiles.case', icon: pick.icon, title: pick.rare ? 'A Puzzling Case' : 'Your Patient',
    text: `${pick.text}\n\nWhat's going on?`,
    options,
    data: { caseId: pick.id, choices },
  });
}

/** How it went. Returns 'solved' | 'missed' | 'tested'. */
export function resolveCase(ctx, data, optionId) {
  const { state, rng } = ctx;
  const kase = CASES.find((x) => x.id === data.caseId);
  if (!kase) return null;
  const c = casesOf(state);
  const job = state.career.job;
  const bumpPerf = (d) => {
    if (job) job.performance = clamp((job.performance ?? 50) + d, 0, 100);
  };
  if (optionId === 'tests') {
    c.tested += 1;
    bumpPerf(1);
    ctx.stat('stress', 2);
    ctx.log(`The workup came back: ${kase.answer.toLowerCase()}. Careful medicine — slow, but nobody was hurt.`, '🧪');
    return 'tested';
  }
  const picked = data.choices?.[Number(String(optionId).replace('dx', ''))];
  if (picked === kase.answer) {
    c.solved += 1;
    c.streak += 1;
    c.best = Math.max(c.best, c.streak);
    if (kase.critical) c.saved += 1;
    bumpPerf(kase.rare ? 8 : 5);
    ctx.stat('happiness', kase.critical ? 5 : 3);
    if (state.medicine.burnout != null) state.medicine.burnout = Math.max(0, state.medicine.burnout - 3);
    ctx.log(`You called it: ${kase.answer.toLowerCase()}.${kase.critical ? ' Your quick thinking saved a life.' : ''}${c.streak >= 3 ? ` That's ${c.streak} in a row.` : ''}`, kase.icon, 'good');
    if (kase.rare && rng.chance(0.5)) {
      state.science ??= { grant: null, papers: 0, unfunded: 0, scooped: 0 };
      state.science.papers += 1;
      ctx.log('You wrote it up as a case report, and a journal published it.', '📄', 'good');
    }
    if (c.saved === 25 && !state.honors.some((h) => h.id === 'medicine.lifesaver')) {
      addHonor(state, { id: 'medicine.lifesaver', source: 'civil', name: 'Hospital Lifesaver Award', icon: '❤️‍🩹', prestige: 3, precedence: 50, citation: 'Twenty-five patients alive because of your clinical judgment.' });
      ctx.log('The hospital honoured you: twenty-five lives saved by your calls.', '❤️‍🩹', 'honor');
    }
    return 'solved';
  }
  c.missed += 1;
  c.streak = 0;
  bumpPerf(-6);
  ctx.stat('stress', 5);
  ctx.log(`It wasn't ${String(picked ?? 'that').toLowerCase()}. It was ${kase.answer.toLowerCase()}${kase.critical ? ' — and the delay cost the patient dearly' : ''}. You'll never miss it again.`, '😞', 'bad');
  // A missed critical diagnosis by a licensed clinician can bring a claim.
  if (kase.critical && job?.professionId === 'medical' && !TRAINING_LEVELS.includes(job.levelId) && rng.chance(0.3) && !state.prompts.some((p) => p.type === 'medicine.claim')) {
    ctx.prompt({
      type: 'medicine.claim', icon: '⚖️', title: 'Malpractice Claim',
      text: `The family of the patient whose ${kase.answer.split(' —')[0].toLowerCase()} you missed is suing. Your insurer's lawyers want your decision.`,
      options: [
        { id: 'settle', label: '🤝 Consent to settle', hint: 'Paid claim on your record; premiums rise' },
        { id: 'fight', label: '⚖️ Fight it at trial', hint: 'Most doctors win at trial — losing is worse' },
      ],
      data: { what: `a missed diagnosis of ${kase.answer.split(' —')[0].toLowerCase()}` },
    });
  }
  return 'missed';
}

/* ------------------------------------------------------------------ */
/* Things doctors do beyond the day job                                */
/* ------------------------------------------------------------------ */

export function sideEligibility(state, kind) {
  const job = state.career.job;
  if (!seesPatients(job)) return { ok: false, reason: 'For practising clinicians' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (yearlyCount(state, `caseFiles.${kind}`)) return { ok: false, reason: 'Once a year' };
  if (kind === 'media' && ((job.performance ?? 0) < 65 || TRAINING_LEVELS.includes(job.levelId))) return { ok: false, reason: 'Attendings with a strong record' };
  return { ok: true };
}

export const CaseFilesModule = {
  id: 'caseFiles',
  order: 30.9,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!seesPatients(job) || !job.paidThisYear || state.legal.incarceration) return;
    state.medicine ??= { specialty: null, fellowship: null, fellowshipYearsLeft: 0, research: false, claims: [] };
    // Residents before the Match haven't got a specialty yet: no cases in the first weeks (foundation doctors see general cases).
    if (job.professionId === 'medical' && !state.medicine.specialty && !(state.medicine.foundationLeft > 0)) return;
    if (rng.chance(0.6)) casePrompt(ctx);
  },

  actions: {
    /** Volunteer Saturdays at a free clinic. */
    freeClinic(ctx) {
      const { state, rng } = ctx;
      const e = sideEligibility(state, 'freeClinic');
      if (!e.ok) return ctx.toast(e.reason, 'warn');
      bumpYearly(state, 'caseFiles.freeClinic');
      ctx.stat('happiness', 6);
      if (state.medicine?.burnout != null) state.medicine.burnout = Math.max(0, state.medicine.burnout - 6);
      ctx.log(rng.pick([
        'You spent Saturdays at the free clinic: blood pressure checks, insulin refills, and a man who hadn\'t seen a doctor in twenty years.',
        'You volunteered at a street-medicine outreach, treating patients under a highway overpass. It reminded you why you started.',
        'You ran a free sports-physical day for kids whose families couldn\'t afford one.',
      ]), '🤲', 'good');
      if (rng.chance(0.35)) casePrompt(ctx);
    },
    /** Health segments on local TV and a column. */
    media(ctx) {
      const { state, rng } = ctx;
      const e = sideEligibility(state, 'media');
      if (!e.ok) return ctx.toast(e.reason, 'warn');
      bumpYearly(state, 'caseFiles.media');
      const fee = rng.int(8, 40) * 1000;
      ctx.earn(fee, 'Media appearances and a health column');
      ctx.stat('happiness', 3);
      ctx.log(`You became the local news's go-to doctor — flu season, heat waves, the latest diet fad — and wrote a health column ($${fee.toLocaleString()}).`, '📺', 'good');
    },
    /** A few weeks with a humanitarian medical team. */
    mission(ctx) {
      const { state, rng } = ctx;
      const e = sideEligibility(state, 'mission');
      if (!e.ok) return ctx.toast(e.reason, 'warn');
      bumpYearly(state, 'caseFiles.mission');
      const job = state.career.job;
      ctx.spend(Math.round(job.salary / 12), 'A month unpaid on a medical mission', { allowDebt: true });
      ctx.stat('happiness', 9);
      if (state.medicine?.burnout != null) state.medicine.burnout = Math.max(0, state.medicine.burnout - 10);
      const c = casesOf(state);
      const saved = rng.int(2, 6);
      c.saved += saved;
      ctx.log(`A month with a humanitarian medical team ${rng.pick(['after an earthquake', 'in a refugee camp', 'on a hospital ship', 'in a remote mountain clinic'])}. You treated hundreds of patients; at least ${saved} would not have survived without you.`, '🌍', 'good');
    },
  },

  resolvers: {
    case(ctx, data, optionId) {
      resolveCase(ctx, data, optionId);
    },
  },
};
