/**
 * Career-tab sections for the career engines (shift & incident, caseload,
 * book of business, projects, seasons, audience). Read-only: they never
 * create records.
 */
import { esc, button, chip, disclosure, meter } from '../Components.js';
import { shiftView, postEligibility } from '../../modules/career/engines/ShiftIncident.js';
import { caseView, FOCUS, scaleOf } from '../../modules/career/engines/Caseload.js';

function shiftSection(state) {
  const v = shiftView(state);
  if (!v) return '';
  const { cfg, rec, postId } = v;
  const posts = Object.entries(cfg.posts).map(([id, p]) => {
    const ok = postEligibility(state, id);
    return button(`${p.icon} ${p.name}`, 'shiftWork.post', { arg: id, variant: id === postId ? 'small on' : 'small', disabled: id === postId || !ok.ok, hint: ok.ok ? `${p.desc}${p.pay > 1 ? ` · +${Math.round((p.pay - 1) * 100)}% pay` : ''}` : ok.reason });
  }).join('');
  const stats = rec ? `<p>${chip(`${cfg.icon} ${rec.handled.toLocaleString()} ${esc(cfg.unit)}`)} ${chip(`📜 ${rec.commendations} commendation${rec.commendations === 1 ? '' : 's'}`, rec.commendations ? 'good' : '')} ${rec.complaints ? chip(`📄 ${rec.complaints} open complaint${rec.complaints === 1 ? '' : 's'}`, 'warn') : ''}</p>${meter(rec.rep, { label: 'Reputation' })}` : '<p class="fine">Your first year on the job is still ahead.</p>';
  return disclosure('engine.shift', `${cfg.icon} ${esc(cfg.label)}`, `${stats}<h4 class="sub">Your post</h4><div class="toggle-row">${posts}</div><p class="fine">Bid for a different post once a year. Each post has its own pace, danger and pay; the calls you remember come to you as decisions.</p>`, { count: cfg.posts[postId]?.name });
}

function caseSection(state) {
  const v = caseView(state);
  if (!v) return '';
  const { cfg, rec } = v;
  const k = scaleOf(cfg);
  const focus = rec?.focus ?? 'balanced';
  const buttons = Object.entries(FOCUS).map(([id, f]) => button(`${f.icon} ${f.name}`, 'caseload.focus', { arg: id, variant: id === focus ? 'small on' : 'small', disabled: id === focus || Boolean(state.yearly['caseload.focus']), hint: f.desc })).join('');
  const cases = (rec?.cases ?? []).slice(0, 8).map((c) => `<li class="report-row"><div><b>${esc(c.name)}</b> <small class="muted">${esc(c.kind)} · ${'●'.repeat(c.difficulty)}${'○'.repeat(3 - c.difficulty)}</small></div><small>${esc(cfg.stages[Math.min(c.stage, cfg.stages.length - 1)])}</small></li>`).join('');
  const open = (rec?.cases.length ?? 0) * k;
  const stats = rec ? `<p>${chip(`📂 ${open} open`, open > cfg.cap ? 'warn' : '')} ${chip(`✅ ${rec.good * k} closed well`, 'good')} ${rec.bad ? chip(`❌ ${rec.bad * k} badly`, 'warn') : ''}</p>${meter(rec.rep, { label: 'Reputation' })}` : '';
  return disclosure('engine.cases', `${cfg.icon} ${esc(cfg.label)}`, `${stats}<h4 class="sub">How you work</h4><div class="toggle-row">${buttons}</div>${cases ? `<h4 class="sub">Open ${esc(cfg.noun)}s${k > 1 ? ` (a sample: each stands for ${k})` : ''}</h4><ul class="history">${cases}</ul>` : ''}<p class="fine">A standard caseload is about ${cfg.cap}. Go over it and the stress shows; rush and some ${esc(cfg.noun)}s go wrong.</p>`, { count: rec ? `${open} open` : null });
}

/** Every engine that applies to the job you hold. */
export function engineSections(state) {
  if (!state.career.job) return '';
  return [shiftSection(state), caseSection(state)].join('');
}
