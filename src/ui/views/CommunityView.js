/**
 * Community tab: your faith and congregation, giving, ministry, volunteering
 * and mentoring.
 */
import { esc, money, button, card, kv, chip } from '../Components.js';
import { TRADITIONS, ATTENDANCE, GIVING_LEVELS, VOLUNTEER_ORGS } from '../../modules/community/Community.js';
import { clergyEligibility } from '../../modules/community/Religions.js';

function faithCard(state) {
  const c = state.community;
  const f = c.faith;
  const age = state.character.age;
  const raisedIn = c.upbringing ? TRADITIONS[c.upbringing].name : 'no religion';
  if (!f) {
    const former = c.former.at(-1);
    return card('Faith', `<p class="muted">You don't belong to a congregation. Raised in ${esc(raisedIn)}${former ? `; you left ${esc(TRADITIONS[former.traditionId].name)} at ${former.leftAge}` : ''}.</p>`, { icon: '🕊️' });
  }
  const t = TRADITIONS[f.traditionId];
  const elig = clergyEligibility(state);
  return card(f.congregation, `
    ${kv([
      ['Tradition', `${t.icon} ${esc(t.name)}${t.fundamentalist ? ` ${chip('high-control', 'bad')}` : ''}`],
      ['Member since', f.raised ? 'birth' : `age ${f.joinedAge}`],
      ['Attendance', `${ATTENDANCE[f.attendance].icon} ${ATTENDANCE[f.attendance].label}${f.attendance === 'devout' ? ` · ${f.devoutYears} yr` : ''}`],
      f.role ? ['Lay role', esc(f.role)] : null,
      ['Giving', c.giving ? `${c.giving}% of income${c.givenThisYear ? ` · ${money(c.givenThisYear)} this year` : ''}` : 'None'],
      ['Ordination', elig.ok ? 'Eligible — apply under Career → Ministry' : `<span class="why">${esc(elig.reason)}</span>`],
    ])}
    ${t.schism ? `<p class="fine">Tensions over ${esc(t.schism.issue)} could split this ${t.house.toLowerCase()}.</p>` : ''}
    ${t.fundamentalist ? '<p class="fine">Leaving a high-control group usually means being shunned by the congregation and by family who stay.</p>' : ''}
    <h4 class="sub">Attendance</h4><div class="toggle-row">${Object.entries(ATTENDANCE).map(([id, a]) => button(`${a.icon} ${a.label}`, 'community.attendance', { arg: id, variant: f.attendance === id ? 'small on' : 'small', hint: a.desc })).join('')}</div>
    <h4 class="sub">Giving</h4><div class="toggle-row">${GIVING_LEVELS.map((n) => button(n ? `${n}%${n === 10 ? ' (tithe)' : ''}` : 'None', 'community.give', { arg: String(n), variant: c.giving === n ? 'tiny on' : 'tiny' })).join('')}</div>
    <div class="toggle-row">
      ${f.role ? button('Step down', 'community.stepDown', { variant: 'small ghost' }) : ''}
      ${button('🚪 Leave', 'community.leave', { variant: 'small danger', disabled: age < 16 })}
    </div>`, { icon: t.icon, accent: 'yellow' });
}

function joinCard(state) {
  const c = state.community;
  const age = state.character.age;
  const groups = {};
  for (const [id, t] of Object.entries(TRADITIONS)) (groups[t.group] ??= []).push([id, t]);
  const disabled = age < 16 || Boolean(state.yearly['community.join']);
  return card(c.faith ? 'Convert' : 'Find a Congregation', `
    ${age < 16 ? '<p class="muted">You can choose your own faith at 16.</p>' : ''}
    ${Object.entries(groups).map(([g, list]) => `<h4 class="sub">${esc(g)}</h4><div class="toggle-row">${list.map(([id, t]) => button(`${t.icon} ${t.name}`, 'community.join', { arg: id, variant: c.faith?.traditionId === id ? 'tiny on' : 'tiny', disabled: disabled || c.faith?.traditionId === id })).join('')}</div>`).join('')}`, { icon: '🙏' });
}

function serviceCard(state) {
  const c = state.community;
  const age = state.character.age;
  const orgs = Object.entries(VOLUNTEER_ORGS).map(([id, o]) => {
    const on = c.volunteering.includes(id);
    return button(`${o.icon} ${o.name}`, 'community.volunteer', { arg: id, variant: on ? 'small on' : 'small', disabled: !on && (age < o.minAge || c.volunteering.length >= 2), hint: `${o.desc}${age < o.minAge ? ` (${o.minAge}+)` : ''}` });
  }).join('');
  return card('Volunteering & Mentoring', `
    ${kv([
      ['Years of service', String(c.volunteerYears)],
      ['Mentoring', c.mentoring ? `🌱 ${esc(c.mentoring.mentee)} since age ${c.mentoring.since}` : 'None'],
    ])}
    <h4 class="sub">Volunteer (up to two)</h4><div class="toggle-row">${orgs}</div>
    <h4 class="sub">Mentoring</h4><div class="toggle-row">${button(c.mentoring ? 'End the match' : '🌱 Become a Big Brother / Big Sister', 'community.mentor', { variant: c.mentoring ? 'small ghost' : 'small', disabled: !c.mentoring && age < 21, hint: '21+ · background check' })}</div>
    <p class="fine">Service counts toward a pardon, earns the President's Volunteer Service Award after five years, and is a good place to make friends.</p>`, { icon: '🤲', accent: 'green' });
}

export function communityView(state) {
  if (!state.community) return '';
  return `${faithCard(state)}${serviceCard(state)}${joinCard(state)}`;
}
