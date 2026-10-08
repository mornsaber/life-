/**
 * Medicine on screen: pre-med and medical school (School tab), residency
 * and practice (Career tab).
 */
import { esc, button, card, chip, kv, meter } from '../Components.js';
import { SPECIALTIES, PRACTICES, TRAINING_LEVELS, isDoctor, practiceMultiplier } from '../../modules/career/Medicine.js';
import { MCAT, ROTATIONS, PREMED_CAP, mcatEligibility, step1Odds } from '../../modules/medicine/MedicalLife.js';

/** Pre-med checklist, or progress through medical school. */
export function medTrainingCard(state) {
  const m = state.medicine;
  if (!m) return '';
  const e = state.education.enrolled;
  if (['md', 'mdphd'].includes(e?.programId) && m.school) {
    const s = m.school;
    const year = Math.floor(e.progress) + 1;
    const steps = [
      ['M1–M2 classroom', year > 2 || s.step1 === 'pass'],
      [`Step 1 ${s.step1 === 'pass' ? '✓' : s.step1 === 'fail' ? '(retake)' : ''}`, s.step1 === 'pass'],
      ...(e.programId === 'mdphd' ? [[`Ph.D. research ${s.phdYears ?? 0}/4`, (s.phdYears ?? 0) >= 4]] : []),
      [`Clerkships ${s.rotations}/${ROTATIONS}`, s.rotations >= ROTATIONS],
      [`Step 2 CK ${s.step2 ?? ''}`, s.step2 != null],
      ['Match', false],
    ];
    return card('Medical School', `<div class="chip-row">${steps.map(([label, done]) => chip(`${done ? '✅' : '⬜'} ${esc(label)}`, done ? 'good' : '')).join(' ')}</div>
      ${kv([
        ['Year', `M${Math.min(4, year)}`],
        ['Clerkship honors', `${s.honors} of ${s.rotations}`],
        ['Applying into', s.interest ? `${SPECIALTIES[s.interest].icon} ${esc(SPECIALTIES[s.interest].name)}` : 'Undecided'],
        ['Research', `${s.pubs} publication${s.pubs === 1 ? '' : 's'}`],
        s.aways ? ['Away rotations', String(s.aways)] : null,
        s.step1 !== 'pass' ? ['Step 1 odds now', `≈${Math.round(step1Odds(state, true) * 100)}% with dedicated study`] : null,
      ])}
      <div class="action-grid">
        ${button('🔬 Research project', 'medLife.research', { variant: 'small', disabled: Boolean(state.yearly['medLife.research']), hint: 'Publications help competitive specialties' })}
        ${s.step1 === 'pass' && s.rotations < ROTATIONS ? button('📖 Gun for honors', 'medLife.studyClerkship', { variant: 'small', disabled: Boolean(state.yearly['medLife.clerkship']), hint: 'Better clerkship grades' }) : ''}
      </div>
      <p class="fine">Program directors read your Step 2 CK score, clerkship honors, research and letters from away rotations in your specialty.</p>`, { icon: '🩺', accent: 'cyan' });
  }
  // Pre-med: college students and graduates thinking about medicine.
  const p = m.premed ?? { clinical: 0, research: 0, shadow: 0 };
  const interested = m.mcat || p.clinical || p.research || p.shadow || state.education.degrees.some((d) => ['biology', 'chemistry', 'nursing', 'kinesiology'].includes(d.major)) || ['biology', 'chemistry'].includes(e?.major);
  if (!interested || state.education.degrees.some((d) => d.programId === 'md') || state.character.age < 18) return '';
  const check = mcatEligibility(state);
  const expired = m.mcat && state.character.age - (m.mcatAge ?? 0) > MCAT.validYears;
  return card('Pre-Med', `${kv([
    ['MCAT', m.mcat ? `${m.mcat}${expired ? ' (expired)' : ''} <small>· average applicant ≈506, matriculant ≈512</small>` : 'Not taken'],
    ['Clinical experience', `${p.clinical}/${PREMED_CAP.clinical}`],
    ['Research', `${p.research}/${PREMED_CAP.research}`],
    ['Shadowing', `${p.shadow}/${PREMED_CAP.shadow}`],
  ])}
    <div class="action-grid">
      ${button('📝 MCAT with a prep course', 'medLife.takeMcat', { arg: 'prep', variant: 'small', disabled: !check.ok, hint: check.ok ? `$${(MCAT.cost + MCAT.prepCost).toLocaleString()}` : check.reason })}
      ${button('📝 MCAT cold', 'medLife.takeMcat', { arg: 'cold', variant: 'small', disabled: !check.ok, hint: check.ok ? `$${MCAT.cost}` : check.reason })}
      ${button('🚑 Clinical hours', 'medLife.premed', { arg: 'clinical', variant: 'small', disabled: Boolean(state.yearly['medLife.premed']) })}
      ${button('🔬 Lab research', 'medLife.premed', { arg: 'research', variant: 'small', disabled: Boolean(state.yearly['medLife.premed']) })}
      ${button('👀 Shadow a doctor', 'medLife.premed', { arg: 'shadow', variant: 'small', disabled: Boolean(state.yearly['medLife.premed']) })}
    </div>
    <p class="fine">Medical schools require the MCAT (valid three years) and expect clinical experience. About four in ten applicants get in.</p>`, { icon: '🧪' });
}

/** Residency and practice for physicians. */
export function medPracticeCard(state) {
  const job = state.career.job;
  const m = state.medicine;
  if (!isDoctor(job) || !m) return '';
  const training = TRAINING_LEVELS.includes(job.levelId) || m.fellowshipYearsLeft > 0;
  const burn = meter(m.burnout ?? 0, { max: 100, label: 'Burnout', suffix: '/100', tone: (m.burnout ?? 0) >= 70 ? 'bad' : (m.burnout ?? 0) >= 45 ? 'mid' : 'good' });
  if (training) {
    const licensed = state.credentials.held.medicalLicense?.status === 'active';
    return card('Residency', `${kv([
      ['Specialty', m.specialty ? `${SPECIALTIES[m.specialty].icon} ${esc(SPECIALTIES[m.specialty].name)}` : 'Matching…'],
      m.fellowshipYearsLeft > 0 ? ['Fellowship', `${m.fellowshipYearsLeft} yr left`] : null,
      ['Step 3', m.step3 ? 'Passed' : 'Intern year'],
    ])}${burn}
      <div class="action-grid">${button('🌙 Moonlight', 'medLife.moonlight', { variant: 'small', disabled: !licensed || Boolean(state.yearly['medLife.moonlight']), hint: licensed ? 'Extra shifts for extra pay' : 'Needs your medical license' })}</div>
      <p class="fine">Residents work up to 80 hours a week. Burnout raises the odds of mistakes.</p>`, { icon: '🏥' });
  }
  const p = PRACTICES[m.practice];
  const others = Object.entries(PRACTICES).filter(([id]) => id !== m.practice);
  const canMove = m.practice && state.character.age - (m.practiceAge ?? 0) >= 3;
  return card('Your Practice', `${kv([
    ['Setting', p ? `${p.icon} ${esc(p.name)}${m.partner ? ' · partner' : ''}${m.partTime ? ' · part-time' : ''}` : 'Choosing…'],
    ['Pay vs. employed', `×${practiceMultiplier(state).toFixed(2)}`],
    m.facultyRank ? ['Faculty rank', esc(m.facultyRank)] : null,
    m.mocAge ? ['Board recertification', `due at ${m.mocAge + 10}`] : null,
  ])}${burn}
    <div class="action-grid">
      ${p ? button(m.partTime ? '⏩ Return to full-time' : '🕐 Go part-time', 'medLife.partTime', { variant: 'small', hint: m.partTime ? 'Full pay' : '70% pay, less burnout' }) : ''}
      ${p ? others.map(([id, o]) => button(`${o.icon} ${o.name}`, 'medLife.changePractice', { arg: id, variant: 'small', disabled: !canMove, hint: canMove ? `Pay ×${o.partnerPay ? `${o.pay}→${o.partnerPay}` : o.pay}` : 'After three years in your setting' })).join('') : ''}
    </div>`, { icon: '🩺' });
}
