/**
 * Campus sub-panel (School tab): housing, Greek life, clubs, student
 * government, sports, parties, internships and return offers, mentors,
 * ROTC / academies, scholarships, probation and study abroad.
 */
import { esc, money, button, card, chip, kv, select } from '../Components.js';
import { CLUBS, ROOM_AND_BOARD, ROTC_BRANCHES, ACADEMIES, onCampus, internshipEligibility, internshipChance, rotcEligibility } from '../../modules/campus/index.js';
import { BRANCHES } from '../../modules/military/MilitaryEngine.js';
import { PROFESSION_LIST } from '../../modules/career/JobTrees.js';
import { SCHOOLS } from '../../modules/education/Catalog.js';

export function campusView(state) {
  const c = state.campus;
  const e = state.education.enrolled;
  if (!c) return '';
  const age = state.character.age;
  if (!e) {
    const extras = [
      c.mentors.length ? `<h4 class="sub">Mentors</h4><ul class="history">${c.mentors.map((m) => `<li>🧑‍🏫 <b>${esc(m.name)}</b> · ${esc(m.employerName)}</li>`).join('')}</ul>` : '',
    ].join('');
    return extras ? card('Campus & Network', extras, { icon: '🎒' }) : '';
  }
  const residential = onCampus(state);
  const academy = c.academy ? ACADEMIES[c.academy] : null;
  const scholarships = c.scholarships.map((s) => `<li>🏅 <b>${esc(s.name)}</b> — ${s.full ? 'full tuition' : `${money(s.annual)}/yr`}${s.minGpa ? ` <small>(keep ${s.minGpa.toFixed(1)} GPA)</small>` : ''}</li>`).join('');

  const status = kv([
    ['Housing', c.housing === 'dorm' ? `${academy ? 'Barracks' : 'Dorm'}${ROOM_AND_BOARD[e.schoolId] ? ` · ${money(ROOM_AND_BOARD[e.schoolId])}/yr room & board` : ''}` : 'Off campus'],
    ['Standing', c.probation ? '<span class="neg">Academic probation</span>' : c.conduct ? `<span class="neg">Disciplinary record (${c.conduct})</span>` : 'Good standing'],
    c.honors ? ['Honors College', 'Yes'] : null,
    c.greek ? ['Greek life', `${esc(c.greek.name)}${c.greek.officer ? ' · chapter president' : ''}`] : null,
    c.sport ? ['Varsity', `${esc(c.sport.name)}${c.sport.scholarship ? ' (scholarship)' : ''}`] : null,
    c.studentGov ? ['Student government', c.studentGov === 'president' ? 'Student body president' : 'Senator'] : null,
    c.rotc ? ['ROTC', `${BRANCHES[c.rotc.branch].name} · year ${c.rotc.years}${c.rotc.contracted ? ' · contracted' : ''}`] : null,
    academy ? ['Academy', academy.name] : null,
    ['Résumé', `${c.resume} pts`],
  ]);

  const life = residential ? `<div class="toggle-row">
      ${c.housing === 'dorm' ? (academy ? '' : button('📦 Move off campus', 'campus.moveOffCampus', { variant: 'small' })) : button('🛏️ Move into the dorms', 'campus.moveIntoDorm', { variant: 'small' })}
      ${academy ? '' : c.greek ? button('🏛️ Deactivate', 'campus.leaveGreek', { variant: 'small' }) : button('🏛️ Rush Greek life', 'campus.rush', { variant: 'small', disabled: Boolean(state.yearly['campus.rush']), hint: `$1,500/yr dues · network · −GPA` })}
      ${c.sport ? button('🏟️ Quit the team', 'campus.quitTeam', { variant: 'small' }) : button('🏟️ Try out for varsity', 'campus.tryOut', { variant: 'small', disabled: Boolean(state.yearly['campus.tryout']), hint: 'Fitness 60+; 80+ for scholarships' })}
    </div>` : '<p class="fine">Commuter / online students skip dorms, Greek life and varsity sports.</p>';

  const clubs = Object.entries(CLUBS).map(([id, cl]) => button(`${cl.icon} ${cl.name}`, 'campus.club', { arg: id, variant: c.clubs.includes(id) ? 'tiny on' : 'tiny' })).join('');

  const fields = PROFESSION_LIST.filter((p) => p.minAge <= 21);
  const intern = internshipEligibility(state, 'tech');
  const internForm = `<div class="toggle-row" data-collect-root>
      ${select('profession', fields.map((p) => ({ value: p.id, label: `${p.icon} ${p.name} (${Math.round(internshipChance(state, p.id) * 100)}%)` })), { label: 'Field' })}
      ${button('📨 Apply for a summer internship', 'campus.applyInternship', { variant: 'small', collect: true, disabled: !intern.ok, hint: intern.ok ? 'Mentors and return offers' : intern.reason })}
    </div>`;
  const offers = c.offers.map((o) => `<li>📨 <b>${esc(o.employer.name)}</b> — return offer, honored at graduation</li>`).join('');
  const mentors = c.mentors.map((m) => `<li>🧑‍🏫 <b>${esc(m.name)}</b> · ${esc(m.employerName)}</li>`).join('');

  const rotc = !c.rotc && !academy && e.programId === 'bachelor' ? `<div class="toggle-row">${ROTC_BRANCHES.map((b) => {
    const ok = rotcEligibility(state, b);
    return button(`${BRANCHES[b].icon} ${BRANCHES[b].name} ROTC`, 'campus.joinRotc', { arg: b, variant: 'small', disabled: !ok.ok, hint: ok.ok ? 'Scholarship chance; commission at graduation' : ok.reason });
  }).join('')}</div>` : c.rotc ? `<div class="toggle-row">${button('🚪 Quit ROTC', 'campus.quitRotc', { variant: 'small danger', hint: c.rotc.contracted ? 'You will repay the scholarship' : 'No obligation yet' })}</div>` : '';

  return card(`Campus Life${SCHOOLS[e.schoolId] ? ` · ${esc(SCHOOLS[e.schoolId].name)}` : ''}`, `
    ${status}
    ${scholarships ? `<h4 class="sub">Scholarships</h4><ul class="history">${scholarships}</ul>` : ''}
    ${life}
    <h4 class="sub">Clubs (up to 2)</h4><div class="toggle-row">${clubs}</div>
    <div class="toggle-row">
      ${button('🗳️ Run for student government', 'campus.runForStudentGov', { variant: 'small', disabled: Boolean(state.yearly['campus.election']) || c.studentGov === 'president' || e.schoolId === 'online', hint: c.studentGov === 'senator' ? 'Run for president' : 'Senate seat' })}
      ${button('🎉 Party', 'campus.party', { variant: 'small', disabled: Boolean(state.yearly['campus.party']), hint: '+Happiness, −GPA; underage citations' })}
      ${button('✈️ Study abroad', 'campus.studyAbroad', { variant: 'small', disabled: Boolean(e.abroad) || e.yearsAttended < 1 || e.schoolId === 'online' || Boolean(academy), hint: '$9,000 · language and résumé' })}
      ${button('🤫 Buy an essay', 'campus.cheat', { variant: 'small danger', disabled: Boolean(state.yearly['campus.cheat']), hint: 'Plagiarism: failing grade or expulsion' })}
    </div>
    <h4 class="sub">Internships</h4>${internForm}
    ${offers ? `<ul class="history">${offers}</ul>` : ''}
    ${mentors ? `<h4 class="sub">Mentors</h4><ul class="history">${mentors}</ul>` : ''}
    ${rotc ? `<h4 class="sub">Officer programs</h4>${rotc}` : ''}
    ${academy ? `<p class="fine">${chip('Cadet', 'good')} You'll commission at graduation and owe 5 years of active duty. Leaving after year 2 means repaying the cost of your education.</p>` : ''}`, { icon: '🎒', accent: 'cyan' });
}
