/**
 * Higher education extras on screen: AP credit and acceleration, combined
 * degrees, early decision, campus jobs, fellowships (School tab); adjunct
 * teaching and publishing (Career tab).
 */
import { esc, button, card, chip, kv, optionRow, disclosure, money } from '../Components.js';
import { MAJORS, SCHOOLS, PROGRAMS } from '../../modules/education/Catalog.js';
import {
  CAMPUS_JOBS, FELLOWSHIPS, ADJUNCT_PAY, MAX_AP_CREDIT, apEligibility, overloadEligibility, fourPlusOneEligibility, mphEligibility, edEligibility, campusJobEligibility, adjunctEligibility,
} from '../../modules/academia/HigherEd.js';
import { VENUES, submitEligibility, acceptOdds, writingCapacity, expectation, recentOutput } from '../../modules/academia/Publishing.js';

const btn = (label, action, check, opts = {}) => button(label, action, { variant: 'small', disabled: !check.ok, hint: check.ok ? opts.hint : check.reason, arg: opts.arg });

/** High-school AP credit; college acceleration, combined degrees, jobs and honors. */
export function higherEdCard(state) {
  const h = state.higherEd;
  if (!h) return '';
  const e = state.education.enrolled;
  const k = state.k12;
  const parts = [];
  // High school.
  if (k && !k.done && state.character.age >= 14) {
    const ap = apEligibility(state);
    parts.push(`<p class="muted">College credit earned: <b>${(state.education.apCredit ?? 0).toFixed(1)}</b> of ${MAX_AP_CREDIT} year.</p>
      <div class="action-grid">${btn('🎯 Take AP classes', 'higherEd.apCourses', ap, { arg: 'ap', hint: 'Exams in May; credit for 4s and 5s' })}${btn('🏫 Dual-enroll at the community college', 'higherEd.apCourses', ap, { arg: 'dual', hint: 'College credit now' })}</div>`);
  }
  // Applying to college.
  const firstTimer = state.character.age >= 17 && !e && !state.education.degrees.some((d) => ['bachelor', 'associate'].includes(d.type));
  if (firstTimer && state.education.degrees.some((d) => d.type === 'highschool')) {
    const major = Object.keys(MAJORS).find((m) => MAJORS[m].levels.includes('bachelor'));
    const ed = ['elite', 'private', 'state'].map((sc) => btn(`💌 Early Decision: ${SCHOOLS[sc].name}`, 'higherEd.earlyDecision', edEligibility(state, sc), { arg: `bachelor:${sc}:${major}`, hint: 'Binding; better odds' })).join('');
    parts.push(`<h4 class="sub">Applying to college</h4><div class="action-grid">${ed}${h.bsmdTried ? '' : button('🩺 Apply to a BS/MD program', 'higherEd.applyBsmd', { arg: 'state', variant: 'small', hint: '7 years, guaranteed medical school seat — very selective' })}</div>`);
  }
  // In college.
  if (e) {
    const p = PROGRAMS[e.programId];
    const rows = [];
    const ov = overloadEligibility(state);
    if (ov.ok || e.overload) rows.push(button(e.overload ? '📚 Back to a normal load' : '⏩ Overload to graduate early', 'higherEd.overload', { variant: 'small', hint: e.overload ? '' : '+¼ year of progress a year; stressful' }));
    const fp = fourPlusOneEligibility(state);
    if (e.programId === 'bachelor' && !e.fourPlusOne) rows.push(btn('🎓 4+1 bachelor\'s/master\'s', 'higherEd.fourPlusOne', fp, { hint: 'One extra year for a master\'s' }));
    if (e.programId === 'md') rows.push(btn('🏥 Add an MPH year', 'higherEd.addMph', mphEligibility(state), { hint: 'Graduate MD/MPH' }));
    if (e.programId === 'bachelor' && !h.thesis) rows.push(button('📜 Write an honors thesis', 'higherEd.thesis', { variant: 'small', hint: 'Seniors with a 3.3+' }));
    if (['bachelor', 'master'].includes(p.type) || e.programId === 'bachelor') rows.push(button(`📝 Take the GRE${h.gre ? ` (best ${h.gre})` : ''}`, 'higherEd.gre', { variant: 'small', hint: 'For graduate school' }));
    const extras = (e.extraGrants ?? []).map((id) => chip(`+ ${PROGRAMS[id]?.name ?? id}`, 'good')).join(' ');
    parts.push(`<h4 class="sub">Your program</h4>${extras ? `<div class="chip-row">${extras}</div>` : ''}${e.assistantship ? `<p class="fine">${chip('🧑‍🏫 Graduate assistantship', 'good')} Tuition waived, plus a stipend.</p>` : ''}<div class="action-grid">${rows.join('')}</div>`);
    if (['bachelor', 'associate'].includes(p.type)) {
      const jobs = Object.entries(CAMPUS_JOBS).map(([id, j]) => {
        const c = campusJobEligibility(state, id);
        const mine = h.campusJob === id;
        return optionRow({ icon: j.icon, title: esc(j.name), sub: `${esc(j.desc)}${j.pay ? ` · ${money(j.pay)}/yr` : ''}`, meta: mine ? 'Your job' : c.ok ? '' : esc(c.reason), tone: mine ? 'good' : c.ok ? '' : 'warn', locked: !c.ok && !mine, action: mine ? button('Quit', 'higherEd.campusJob', { arg: 'quit', variant: 'small' }) : button('Take it', 'higherEd.campusJob', { arg: id, variant: 'small', disabled: !c.ok }) });
      }).join('');
      parts.push(disclosure('higherEd.jobs', 'Campus jobs', `<ul class="job-board">${jobs}</ul>`, { count: h.campusJob ? CAMPUS_JOBS[h.campusJob].name : 'none' }));
    }
    if (e.programId === 'bachelor' && e.totalYears - e.progress <= 1) {
      const fs = Object.entries(FELLOWSHIPS).map(([id, f]) => button(`${f.icon} ${f.name}`, 'higherEd.fellowship', { arg: id, variant: 'small', disabled: Boolean(state.yearly[`higherEd.fellowship.${id}`]) || e.gpa < f.minGpa, hint: e.gpa < f.minGpa ? `Needs a ${f.minGpa} GPA` : f.desc })).join('');
      parts.push(`<h4 class="sub">Senior-year fellowships</h4><div class="action-grid">${fs}</div>`);
    }
  }
  const record = [
    h.ugResearch ? `${h.ugResearch} yr undergraduate research` : null,
    h.letters ? `${h.letters} strong letter${h.letters > 1 ? 's' : ''}` : null,
    h.thesis ? 'honors thesis' : null,
    h.gre ? `GRE ${h.gre}` : null,
    ...Object.keys(h.fellowships ?? {}).map((id) => FELLOWSHIPS[id].name),
  ].filter(Boolean);
  if (!parts.length && !record.length) return '';
  return card('Get Ahead', `${record.length ? `<p class="fine">For your applications: ${record.map(esc).join(' · ')}</p>` : ''}${parts.join('')}`, { icon: '🚀' });
}

/** Adjunct teaching on the side, for anyone with a graduate degree. */
export function adjunctCard(state) {
  const check = adjunctEligibility(state);
  if (!state.education.degrees.some((d) => ['master', 'doctorate', 'professional'].includes(d.type))) return '';
  const rate = state.education.degrees.some((d) => d.type === 'doctorate') ? ADJUNCT_PAY.doctorate : ADJUNCT_PAY.masters;
  const h = state.higherEd;
  return card('Adjunct Teaching', `<p class="muted">Teach a course or three on the side at ${money(rate)} per course: no benefits, no office, real teaching experience.${h?.adjunctCourses ? ` You've taught ${h.adjunctCourses} course${h.adjunctCourses > 1 ? 's' : ''}.` : ''}</p>
    <div class="action-grid">${[1, 2, 3].map((n) => btn(`🧑‍🏫 ${n} course${n > 1 ? 's' : ''}`, 'higherEd.adjunct', check, { arg: String(n), hint: money(rate * n) })).join('')}</div>`, { icon: '🧑‍🏫' });
}

/** Publishing: submissions, the review pipeline and publish-or-perish standing. */
export function publishingCard(state) {
  const cap = writingCapacity(state);
  const s = state.science;
  if (!cap || !s) return '';
  const expected = expectation(state);
  const out = recentOutput(state);
  const pipeline = (s.pipeline ?? []).map((p) => `<li>${VENUES[p.venue].icon} ${esc(VENUES[p.venue].name)} <small>· decision at ${p.dueAge}</small></li>`).join('');
  const venues = Object.entries(VENUES).map(([id, v]) => {
    const c = submitEligibility(state, id);
    return optionRow({ icon: v.icon, title: esc(v.name), sub: esc(v.desc), meta: c.ok ? `≈${Math.round(acceptOdds(state, id) * 100)}% acceptance` : esc(c.reason), tone: v.predatory ? 'warn' : c.ok ? 'good' : 'warn', locked: !c.ok, action: button('Submit', 'publishing.submit', { arg: id, variant: 'small', disabled: !c.ok }) });
  }).join('');
  const standing = expected ? (out >= expected ? chip(`✅ ${out}/${expected} papers in 3 yrs`, 'good') : out < expected / 2 ? chip(`⚠️ ${out}/${expected} papers in 3 yrs — publish or perish`, 'bad') : chip(`${out}/${expected} papers in 3 yrs`, '')) : '';
  return card('Publishing', `${kv([
    ['Record', `${s.papers} papers${s.topPapers ? ` · ${s.topPapers} in top journals` : ''}${s.books ? ` · ${s.books} book${s.books > 1 ? 's' : ''}` : ''}${s.predatory ? ` · ${s.predatory} predatory` : ''}`],
    s.reviews ? ['Peer reviews done', String(s.reviews)] : null,
    s.editorial ? ['Editorial', s.editorial === 'chief' ? 'Editor-in-chief' : 'Editorial board'] : null,
  ])}${standing ? `<div class="chip-row">${standing}</div>` : ''}
    ${pipeline ? `<h4 class="sub">Under review</h4><ul class="history">${pipeline}</ul>` : ''}
    ${disclosure('publishing.venues', 'Submit a manuscript', `<ul class="job-board">${venues}</ul>`, { count: `${cap - (state.yearly['publishing.submit'] ?? 0)} left this year` })}
    <p class="fine">Your job expects output over a rolling three years. Fall short and raises stop; contract researchers who keep falling short aren't renewed.</p>`, { icon: '📚' });
}
