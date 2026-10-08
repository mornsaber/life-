/** The research lab on the Career tab: institution limits, money, people, culture. */
import { esc, button, card, chip, kv, money, optionRow, disclosure } from '../Components.js';
import { TIERS, ROLES, CULTURES, tierOf, canRunLab, hireEligibility, labReputation } from '../../modules/academia/Lab.js';

export function labCard(state) {
  const job = state.career.job;
  const tier = tierOf(state, job);
  if (!tier) return '';
  const t = TIERS[tier];
  const check = canRunLab(state, job);
  const banner = `<p class="muted">${t.icon} <b>${esc(t.name)}</b> — ${esc(t.desc)} ${t.maxLab ? `Lab space for ${t.maxLab}. ` : ''}${t.teaching ? `Teaching load: ${t.teaching} course${t.teaching > 1 ? 's' : ''} a year.` : ''}</p>`;
  const l = state.lab;
  if (!check.ok || !l?.active) return card('Research Lab', `${banner}<p class="fine">${esc(check.ok ? 'Your lab opens with your next year on the job.' : check.reason)}</p>`, { icon: '🔬' });
  const cost = l.members.reduce((sum, m) => sum + (m.fellowship > 0 || m.ta ? 0 : ROLES[m.role].cost), 0);
  const grant = state.science?.grant;
  const runway = cost ? Math.floor((l.funds + (grant?.amount ?? 0) * Math.min(grant?.yearsLeft ?? 0, 5) + (t.program ?? 0) * 5) / cost) : null;
  const people = l.members.map((m) => optionRow({
    icon: ROLES[m.role].icon,
    title: esc(m.name),
    sub: `${esc(ROLES[m.role].name)} · year ${m.years + 1} · ${m.papers} paper${m.papers === 1 ? '' : 's'}${m.ta ? ' · teaching to pay their way' : ''}${m.fellowship > 0 ? ' · fellowship-funded' : ''}${m.trait ? ` · ${esc(m.trait)}` : ''}`,
    meta: `skill ${m.skill} · morale ${m.morale}`,
    tone: m.morale < 35 ? 'warn' : 'good',
    action: `${button('Mentor', 'lab.mentor', { arg: m.id, variant: 'small', disabled: (state.yearly['lab.mentor'] ?? 0) >= 2 })}${button('Let go', 'lab.letGo', { arg: m.id, variant: 'small' })}`,
  })).join('');
  const hires = Object.entries(ROLES).map(([id, r]) => {
    const c = hireEligibility(state, id);
    return button(`${r.icon} ${id === 'phd' ? 'Recruit a Ph.D. student' : `Hire ${/^[aeiou]/i.test(r.name) ? 'an' : 'a'} ${r.name.toLowerCase()}`}`, 'lab.hire', { arg: id, variant: 'small', disabled: !c.ok, hint: c.ok ? `${money(r.cost)}/yr · ${r.desc}` : c.reason });
  }).join('');
  const cultures = Object.entries(CULTURES).map(([id, c]) => button(`${c.icon} ${c.name}`, 'lab.culture', { arg: id, variant: l.culture === id ? 'small on' : 'small', hint: c.desc })).join('');
  const outcomes = {};
  for (const a of l.alumni) outcomes[a.outcome] = (outcomes[a.outcome] ?? 0) + 1;
  const alumni = Object.entries(outcomes).sort((a, b) => b[1] - a[1]).map(([o, n]) => chip(`${n} → ${esc(o)}`)).join(' ');
  return card('Research Lab', `${banner}
    ${kv([
      ['Lab funds', `${money(l.funds)}${grant ? ` · +${money(grant.amount)}/yr from ${esc(grant.agency)}` : ''}${t.program ? ` · +${money(t.program)}/yr program funding` : ''}`],
      ['Payroll', `${money(cost)}/yr${runway != null ? ` · about ${runway} year${runway === 1 ? '' : 's'} of runway` : ''}`],
      ['People', `${l.members.length} of ${t.maxLab}`],
      ['Reputation', String(Math.round(labReputation(state)))],
    ])}
    ${l.members.length ? `<ul class="job-board">${people}</ul>` : '<p class="muted">An empty lab. Hire someone.</p>'}
    ${disclosure('lab.hire', 'Hire', `<div class="action-grid">${hires}</div>`, { count: `${t.roles.length} roles here` })}
    <h4 class="sub">Lab culture</h4><div class="toggle-row">${cultures}</div>
    <div class="action-grid">
      ${button('📚 Buy out a course', 'lab.buyout', { variant: 'small', disabled: !t.teaching || l.buyout || l.funds < 25000, hint: t.teaching ? '$25,000 of lab funds for one more submission this year' : 'No teaching here' })}
      ${button('🎓 Serve on thesis committees', 'lab.committee', { variant: 'small', disabled: Boolean(state.yearly['lab.committee']) })}
    </div>
    ${alumni ? `<p class="fine">Alumni: ${alumni}</p>` : ''}
    <p class="fine">Your people publish with you as senior author. Ph.D. students defend after about five years; postdocs move on after two to four. Grants pay the bills — when they run out, people have to go.</p>`, { icon: '🔬', accent: 'cyan' });
}
