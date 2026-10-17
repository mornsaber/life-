/**
 * The law on screen: pre-law and law school (School tab), practice (Career tab).
 */
import { esc, button, card, kv, chip, meter } from '../Components.js';
import { LSAT, AREAS, HOURS, isLawyer, areaOf, lsatEligibility, partnerOdds, matterPool } from '../../modules/law/LegalPractice.js';
import { lawSystem } from '../../modules/world/ProfessionStandards.js';

const LAW_SCHOOL = ['jd', 'jdmba'];

/** Pre-law (the LSAT) or progress through law school. */
export function lawTrainingCard(state) {
  const l = state.law ?? {};
  const e = state.education.enrolled;
  if (LAW_SCHOOL.includes(e?.programId)) {
    const s = l.school ?? {};
    const year = Math.floor(e.progress) + 1;
    return card('Law School', `${kv([
      ['Year', `${year}L`],
      ['Class rank', s.rank != null ? `top ${Math.max(1, 100 - s.rank)}%` : 'After 1L exams'],
      ['Law review', s.lawReview ? '✅ Member' : '—'],
      ['Summer job', { biglaw: '🏙️ Big firm', midsize: '🏢 Regional firm', public: '🕊️ Public interest' }[s.oci] ?? (year >= 2 ? 'Interviewing' : 'After 1L')],
      ['Moot court', s.moot ? '✅' : '—'],
    ])}
      <div class="action-grid">
        ${year === 1 ? button('📚 Live in the library', 'lawLife.study', { variant: 'small', disabled: Boolean(state.yearly['lawLife.study']), hint: 'Better 1L grades · stressful' }) : ''}
        ${button('🎤 Moot court', 'lawLife.moot', { variant: 'small', disabled: Boolean(s.moot), hint: 'Courtroom skills for later' })}
      </div>
      <p class="fine">1L grades set your class rank; the top tenth makes law review. Firms hire next year's associates from their 2L summer programs.</p>`, { icon: '⚖️', accent: 'cyan' });
  }
  const interested = l.lsat || ['politicalScience', 'history', 'philosophy', 'english', 'criminalJustice', 'economics'].includes(e?.major) || state.education.degrees.some((d) => ['politicalScience', 'history', 'philosophy', 'english', 'criminalJustice'].includes(d.major));
  if (!interested || state.character.age < 18 || state.education.degrees.some((d) => LAW_SCHOOL.includes(d.programId))) return '';
  const check = lsatEligibility(state);
  if (!check.ok && check.reason?.startsWith('Law is an undergraduate')) return '';
  const expired = l.lsat && state.character.age - (l.lsatAge ?? 0) > LSAT.validYears;
  return card('Pre-Law', `${kv([['LSAT', l.lsat ? `${l.lsat}${expired ? ' (expired)' : ''} <small>· median admit ≈155–160, top schools 170+</small>` : 'Not taken']])}
    <div class="action-grid">
      ${button('📝 LSAT with a prep course', 'lawLife.lsat', { arg: 'prep', variant: 'small', disabled: !check.ok, hint: check.ok ? `$${(LSAT.cost + LSAT.prepCost).toLocaleString()}` : check.reason })}
      ${button('📝 LSAT cold', 'lawLife.lsat', { arg: 'cold', variant: 'small', disabled: !check.ok, hint: check.ok ? `$${LSAT.cost}` : check.reason })}
    </div>
    <p class="fine">Law schools require the LSAT (good for five years); your score matters more than your major.</p>`, { icon: '📜' });
}

/** A lawyer's practice: area, record, book of business and the levers. */
export function lawPracticeCard(state) {
  const job = state.career.job;
  if (!isLawyer(job) || !state.law) return '';
  const l = state.law;
  const area = areaOf(state);
  const a = AREAS[area];
  const sys = lawSystem(state.character.countryId);
  const firmLawyer = job.professionId === 'law';
  const senior = firmLawyer && !['clerk', 'associate'].includes(job.levelId);
  return card('Your Practice', `${kv([
    ['Practice', area === 'prosecution' ? '🏛️ Prosecution' : a ? `${a.icon} ${esc(a.name)}${l.chambers ? ` · ${esc(sys.advocate)} in ${esc(sys.chambers)}` : ''}` : 'Choosing…'],
    ['Record', `🏆 ${l.wins} won · 🤝 ${l.settled} settled · 😞 ${l.losses} lost`],
    firmLawyer ? ['Book of business', `$${Math.round(l.book ?? 0).toLocaleString()} a year`] : null,
    firmLawyer ? ['Billable target', HOURS[l.hours]?.label ?? '—'] : null,
    l.silk ? ['Rank', `🎗️ ${esc(sys.silk)}`] : null,
    firmLawyer && job.levelId === 'senior' && !l.partnerVote ? ['Partnership odds today', `≈${Math.round(partnerOdds(state) * 100)}%`] : null,
    job.counseledOut != null ? ['Status', chip('Passed over — time to move on', 'warn')] : null,
    ['Matters you see', `${matterPool(state).length} kinds of case in your field`],
  ])}
    ${meter(l.reputation ?? 30, { label: '⭐ Reputation' })}${meter(l.burnout ?? 0, { label: '🕯️ Burnout', tone: (l.burnout ?? 0) >= 70 ? 'bad' : 'mid' })}
    ${firmLawyer ? `<h4 class="sub">Billable hours</h4><div class="toggle-row chips-row">${Object.entries(HOURS).map(([h, x]) => button(x.label, 'lawLife.hours', { arg: h, variant: Number(h) === l.hours ? 'tiny on' : 'tiny', hint: x.bonus ? `+${Math.round(x.bonus * 100)}% bonus at big firms` : 'Saner life' })).join('')}</div>` : ''}
    <div class="action-grid">
      ${senior ? button('🌧️ Make rain', 'lawLife.rainmake', { variant: 'small', disabled: Boolean(state.yearly['lawLife.rainmake']), hint: 'Win new clients' }) : ''}
      ${button('🕊️ Take a pro bono case', 'lawLife.proBono', { variant: 'small', disabled: Boolean(state.yearly['lawLife.proBono']), hint: 'Reputation · happiness' })}
    </div>
    <p class="fine">Most years a matter lands on your desk. Read the facts: strong cases are worth trying, weak ones are worth settling — and a prosecutor's best call is sometimes not to charge.${sys.silk ? ` After fifteen years, the best advocates can apply for ${esc(sys.silk)}.` : ''}</p>`, { icon: '⚖️', accent: 'cyan' });
}
