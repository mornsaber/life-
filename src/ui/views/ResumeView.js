/**
 * The résumé (curriculum vitae): a brief, one-page account of the life's working record, built
 * from what actually happened — jobs and employers with their years, service, education,
 * licences, languages, skills and honours — headed as the country would head it.
 */
import { esc, card, empty } from '../Components.js';
import { styledName } from '../../modules/world/Honours.js';
import { getProfession } from '../../modules/career/JobTrees.js';
import { periodTitle, yearNow } from '../../modules/world/Eras.js';
import { degreeLabel } from '../../modules/education/Catalog.js';
import { CREDENTIALS } from '../../modules/credentials/CredentialRegistry.js';
import { fluentForeign } from '../../modules/world/Languages.js';
import { SKILLS, skillsOf } from '../../modules/life/Skills.js';
import { rankOf, branchOf } from '../../modules/military/MilitaryEngine.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { COUNTRIES } from '../../modules/world/Countries.js';

const born = (state) => state.character.birthYear ?? yearNow(state) - state.character.age;
const yr = (state, age) => born(state) + age;
const span = (state, a, b) => (b == null ? `${yr(state, a)} – present` : yr(state, a) === yr(state, b) ? String(yr(state, a)) : `${yr(state, a)} – ${yr(state, b)}`);
const WHY = { promoted: null, resigned: 'moved on', laidOff: 'position eliminated', fired: 'dismissed', retired: 'retired' };
export const resumeHeading = (cc) => (['US', 'CA'].includes(cc) ? 'Résumé' : ['DE', 'AT', 'CH'].includes(cc) ? 'Lebenslauf (Curriculum Vitae)' : 'Curriculum Vitae');

/** Promotions (and any step down) within a job, oldest first: "1962 Patrolman → 1968 Sergeant ▲". */
function ladderSteps(state, x) {
  const r = (x.rungs ?? []).filter((s, i, a) => i === 0 || s.title !== a[i - 1].title);
  if (r.length < 2) return '';
  const g = state.character.gender;
  const rows = r.map((s) => `<li><small>${yr(state, s.age)} · ${s.kind === 'up' ? '▲ Promoted to ' : s.kind === 'down' ? '▼ Reduced to ' : 'Joined as '}<b>${esc(periodTitle(s.title, g))}</b></small></li>`).join('');
  return `<ul class="cv-rungs" style="margin:.15rem 0 0 1rem;padding:0;list-style:none">${rows}</ul>`;
}

/** Promotions in the services, oldest first: "1941 · ▲ Promoted to Corporal". */
function rankSteps(state, ranks) {
  const r = (ranks ?? []).filter((s, i, a) => i === 0 || s.title !== a[i - 1].title);
  if (r.length < 2) return '';
  return `<ul class="cv-rungs" style="margin:.15rem 0 0 1rem;padding:0;list-style:none">${r.map((s, i) => `<li><small>${yr(state, s.age)} · ${i === 0 ? 'Joined as ' : '▲ Promoted to '}<b>${esc(s.title)}</b></small></li>`).join('')}</ul>`;
}

/** Jobs, newest first, consecutive stints at the same employer in the same field folded together. */
function jobs(state) {
  const g = state.character.gender;
  const past = (state.career?.history ?? []).map((h) => ({ title: periodTitle(h.title ?? getProfession(h.professionId)?.levels?.[0]?.title ?? 'Employee', g), employer: h.employerName, field: getProfession(h.professionId)?.name, from: h.startAge, to: h.endAge, rungs: h.rungs, why: h.fired ? 'dismissed' : WHY[h.reason] ?? (typeof h.reason === 'string' && h.reason.length <= 40 ? h.reason.replace(/\.$/, '').toLowerCase() : null), pid: h.professionId }));
  const j = state.career?.job;
  const now = j ? [{ title: periodTitle(j.title, g), employer: j.employer?.name, field: getProfession(j.professionId)?.name, from: j.startAge ?? state.character.age, to: null, pid: j.professionId, rungs: j.rungs, current: true }] : [];
  const all = [...past, ...now].filter((x) => x.from != null).sort((a, b) => (b.to ?? 999) - (a.to ?? 999) || b.from - a.from);
  const out = [];
  for (const x of all) {
    const prev = out.at(-1);
    // A promotion with the same employer: one entry, the latest title, the earlier one noted.
    if (prev && prev.employer && prev.employer === x.employer && prev.pid === x.pid && Math.abs(prev.from - (x.to ?? 999)) <= 1) { prev.from = x.from; prev.rungs = [...(x.rungs ?? [{ title: x.title, age: x.from, kind: 'start' }]), ...(prev.rungs ?? [])]; if (x.title !== prev.title) (prev.earlier ??= []).push(x.title); continue; }
    out.push({ ...x });
  }
  return out;
}

function service(state) {
  const rows = (state.military?.history ?? []).map((h) => ({ rank: h.rankTitle, branch: h.branch, from: h.startAge, to: h.endAge, why: h.discharge, ranks: h.ranks }));
  const s = state.military?.service;
  if (s) rows.unshift({ rank: rankOf(s).title, branch: s.branch, from: s.joinedAge ?? state.character.age, to: null, ranks: [...(s.ranks ?? []), ...(s.ranks?.at(-1)?.title === rankOf(s).title ? [] : [{ title: rankOf(s).title, age: state.character.age }])] });
  return rows.map((r) => ({ ...r, branchName: (() => { try { return branchOf({ branch: r.branch, nation: s?.nation })?.name ?? r.branch; } catch { return r.branch; } })() }));
}

export function resumeView(state) {
  const c = state.character;
  const cc = c.countryId ?? 'US';
  if (c.age < 14) return card(resumeHeading(cc), empty('Too young for a résumé: there is nothing on it yet but school.'), { icon: '📄' });
  const J = jobs(state);
  const S = service(state);
  const degrees = (state.education?.degrees ?? []).filter((d) => d.type !== 'highschool' || !(state.education.degrees.length > 1));
  const licences = Object.entries(state.credentials?.held ?? {}).filter(([id, h]) => h.status === 'active' && CREDENTIALS[id] && !['learnerPermit', 'studentPilot'].includes(id)).map(([id]) => CREDENTIALS[id].name);
  const langs = fluentForeign(state);
  const skills = Object.entries(skillsOf(state)).filter(([id, v]) => SKILLS[id] && v >= 40).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => `${SKILLS[id].label}${v >= 75 ? ' (expert)' : ''}`);
  const honours = (state.honors ?? []).slice(0, 5).map((h) => h.name);
  const years = J.reduce((t, x) => t + ((x.to ?? c.age) - x.from), 0);
  const fields = [...new Set(J.map((x) => x.field).filter(Boolean))];
  const lead = J[0];
  const summary = lead
    ? `${lead.title}${lead.current ? '' : ' (formerly)'} with ${years} year${years === 1 ? '' : 's'} of work${fields.length ? ` in ${fields.slice(0, 2).join(' and ').toLowerCase()}` : ''}${S.length ? ', and service in the armed forces' : ''}.`
    : S.length ? `Served in the armed forces${S[0].to == null ? '' : ` until ${yr(state, S[0].to)}`}.` : 'Looking for a first position.';
  const place = `${REGIONS[c.regionId]?.name ?? ''}${cc !== 'US' ? `, ${COUNTRIES[cc]?.name ?? cc}` : ''}`;
  const section = (title, body) => (body ? `<h4 class="sub" style="border-bottom:1px solid var(--line,#ccc);padding-bottom:2px">${title}</h4>${body}` : '');
  const exp = J.map((x) => { const steps = ladderSteps(state, x); return `<div style="margin:.35rem 0"><div><b>${esc(x.title)}</b>${x.employer ? ` · ${esc(x.employer)}` : ''}</div><small class="muted">${span(state, x.from, x.to)}${!steps && x.earlier?.length ? ` · earlier ${esc(x.earlier.slice(0, 2).join(', '))}` : ''}${x.why ? ` · ${esc(x.why)}` : ''}</small>${steps}</div>`; }).join('');
  const mil = S.map((x) => `<div style="margin:.35rem 0"><div><b>${esc(x.rank ?? 'Service')}</b> · ${esc(x.branchName ?? '')}</div><small class="muted">${span(state, x.from, x.to)}${x.why && x.why !== 'retired' ? ` · ${esc(x.why)} discharge` : x.why === 'retired' ? ' · retired' : ''}</small>${rankSteps(state, x.ranks)}</div>`).join('');
  const edu = degrees.map((d) => `<div style="margin:.25rem 0"><b>${esc(degreeLabel(d))}</b>${d.schoolName ? ` · ${esc(d.schoolName)}` : ''} <small class="muted">${d.year != null ? yr(state, d.year) : ''}${d.honors ? ` · ${esc(d.honors)}` : ''}</small></div>`).join('');
  const list = (xs) => (xs.length ? `<p>${xs.map(esc).join(' · ')}</p>` : '');
  return card(resumeHeading(cc), `
    <div style="text-align:center;margin-bottom:.4rem"><div style="font-size:1.2em;font-weight:700">${esc(styledName(state))}</div><small class="muted">${esc(place)} · born ${born(state)}</small></div>
    <p><i>${esc(summary)}</i></p>
    ${section('Experience', exp || '<p class="muted">No paid work yet.</p>')}
    ${section('Military service', mil)}
    ${section('Education', edu)}
    ${section('Licences and certificates', list(licences))}
    ${section('Languages', list(langs))}
    ${section('Skills', list(skills))}
    ${section('Honours', list(honours))}`, { icon: '📄', summary: lead ? esc(lead.title) : '' });
}
