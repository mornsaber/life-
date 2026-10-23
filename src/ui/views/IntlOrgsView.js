/**
 * International organisations on the Career tab: the recruitment competitions, your duty
 * station and appointed term, and the Order of Malta.
 */
import { esc, button, card, kv } from '../Components.js';
import { COMPETITIONS, competitionCheck, maltaJoinCheck, maltaGradeName, MALTA_OFFICES } from '../../modules/world/IntlOrgs.js';
import { INTL_ORG_PROFESSIONS, HARDSHIP } from '../../modules/career/IntlOrgCareers.js';
import { postingOf } from '../../modules/world/Posting.js';

export function intlOrgsCard(state) {
  if (state.character.age < 18) return '';
  const job = state.career.job;
  const intl = job && INTL_ORG_PROFESSIONS[job.professionId];
  const p = postingOf(state);
  const comps = state.intlOrgs?.competitions ?? {};
  const compRows = Object.entries(COMPETITIONS).map(([id, c]) => {
    const s = comps[id];
    const check = competitionCheck(state, id);
    if (!s?.passed && !check.ok && /citizens only|and under|From 21/.test(check.reason)) return '';
    return `<li class="fund-row"><span>${c.icon} <b>${esc(c.name)}</b> <small>${esc(c.desc)}${s?.passed ? ' · ✅ passed' : s?.sittings ? ` · ${s.sittings} sitting${s.sittings > 1 ? 's' : ''}` : ''}</small>${!s?.passed && !check.ok ? `<small class="why">${esc(check.reason)}</small>` : ''}</span>
      ${s?.passed ? '' : button('📝 Sit it', 'intlOrgs.sit', { arg: id, variant: 'tiny', disabled: !check.ok, hint: check.ok ? `~${Math.round(check.odds * 100)}%` : '' })}</li>`;
  }).join('');
  const m = state.malta;
  const join = maltaJoinCheck(state);
  const malta = m?.grade
    ? `${kv([['Grade', esc(maltaGradeName(state))], m.office ? ['Office', esc(MALTA_OFFICES[m.office])] : null, ['Member since', `age ${m.since}`]].filter(Boolean))}
      <div class="action-grid">${button('⛪ Lourdes pilgrimage', 'intlOrgs.pilgrimage', { hint: 'Once a year' })}${['magistral', 'honour'].includes(m.grade) ? button('🙏 Promise of Obedience', 'intlOrgs.obedience', { hint: 'After 3 years' }) : ''}${m.grade === 'obedience' ? button('✠ Take solemn vows (Knight of Justice)', 'intlOrgs.profess', { hint: 'Poverty, chastity, obedience' }) : ''}${button('🚪 Resign from the Order', 'intlOrgs.leaveMalta', { variant: 'danger' })}</div>`
    : join.reason === 'Practising Catholics only' ? '' : `<p class="muted">A lay religious order of knighthood and a sovereign entity in international law, serving the sick and the poor in 120 countries.</p><div class="action-grid">${button('✠ Seek admission', 'intlOrgs.joinMalta', { disabled: !join.ok, hint: join.ok ? `~${Math.round(join.odds * 100)}% · $3,000 passage fee` : join.reason })}</div>`;
  const duty = intl ? `<p>🌐 ${esc(job.title)} · ${esc(job.employer.name)}${p?.kind === 'intl' ? ` · stationed in <b>${esc(p.place)}</b> until age ${p.until}${HARDSHIP.includes(p.place) ? ' (hardship post)' : ''}` : ''}${job.intlTerm ? ` · term ends at ${job.intlTerm}` : ''}</p><p class="fine">Your pay is exempt from national income tax${(state.character.citizenships ?? []).includes('US') && job.professionId !== 'euInstitutions' ? ' (but not US tax: Americans pay it wherever they work)' : ''}. Staff rotate between duty stations every few years.</p>` : '';
  if (!compRows && !malta && !duty) return '';
  return card('International Organisations', `${duty}${compRows ? `<p class="fine">Recruitment competitions (the UN's Young Professionals exam, EPSO, the World Bank's YPP) are with the civil service exams on the Public Service tab. Senior posts — Secretary-General, Commissioner, NATO's Secretary General — are offered to former leaders.</p>` : ''}${malta ? `<h4 class="sub">✠ Sovereign Military Order of Malta</h4>${malta}` : ''}`, { icon: '🌐' });
}
