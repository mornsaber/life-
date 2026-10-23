/**
 * International organisations on the Career tab: the recruitment competitions, your duty
 * station and appointed term, and the Order of Malta.
 */
import { esc, button, card, kv } from '../Components.js';
import { COMPETITIONS, competitionCheck, maltaJoinCheck, maltaGradeName, MALTA_OFFICES } from '../../modules/world/IntlOrgs.js';
import { INTL_ORG_PROFESSIONS } from '../../modules/career/IntlOrgCareers.js';
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
  const tours = intl ? (job.stations ?? []) : [];
  const current = tours.at(-1);
  const since = current?.from ?? state.character.age;
  const duty = intl ? `<p>🌐 ${esc(job.title)} · ${esc(job.employer.name)}${job.intlTerm ? ` · term ends at ${job.intlTerm}` : ''}</p>
    ${kv([
      ['Duty station', current ? `<b>${esc(current.place)}</b>, ${esc(current.country)}${current.hardship ? ' ⚠️ hardship post' : ''}${p?.kind === 'intl' ? '' : ' (your own country)'}` : '—'],
      ['Tour', job.stationUntil ? `since ${since} · ends at ${job.stationUntil}` : '—'],
      ['Next post', 'Chosen in the mobility exercise when the tour ends — or ask for a move'],
    ])}
    ${tours.length > 1 ? `<h4 class="sub">Your tours</h4><ul class="history">${tours.slice(0, -1).reverse().map((t) => `<li>${t.hardship ? '⚠️' : '🌐'} ${esc(t.place)}, ${esc(t.country)} <small class="muted">age ${t.from}–${t.to ?? '?'}</small></li>`).join('')}</ul>` : ''}
    <div class="action-grid">${button('🔁 Request a reassignment', 'intlOrgs.requestMove', { disabled: state.character.age - since < 2 || Boolean(state.yearly['intlOrgs.requestMove']), hint: state.character.age - since < 2 ? 'After two years in post' : 'HR offers you posts' })}</div>
    <p class="fine">Your pay is exempt from national income tax${(state.character.citizenships ?? []).includes('US') && job.professionId !== 'euInstitutions' ? ' (but not US tax: Americans pay it wherever they work)' : ''}. Staff rotate between headquarters and the field every few years; hardship posts pay danger money and count for promotion.</p>` : '';
  if (!compRows && !malta && !duty) return '';
  return card('International Organisations', `${duty}${compRows ? `<p class="fine">Recruitment competitions (the UN's Young Professionals exam, EPSO, the World Bank's YPP) are with the civil service exams on the Public Service tab. Senior posts — Secretary-General, Commissioner, NATO's Secretary General — are offered to former leaders.</p>` : ''}${malta ? `<h4 class="sub">✠ Sovereign Military Order of Malta</h4>${malta}` : ''}`, { icon: '🌐' });
}
