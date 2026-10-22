/**
 * Career-tab sections for the career engines (shift & incident, caseload,
 * book of business, projects, seasons, audience). Read-only: they never
 * create records.
 */
import '../../modules/career/engines/MoreCareers.js';
import { esc, button, chip, disclosure, meter } from '../Components.js';
import { shiftView, postEligibility } from '../../modules/career/engines/ShiftIncident.js';
import { caseView, FOCUS, scaleOf } from '../../modules/career/engines/Caseload.js';
import { bookView } from '../../modules/career/engines/ClientBook.js';
import { projectView, APPROACH } from '../../modules/career/engines/Projects.js';
import { investigationView, TECHNIQUES, techniqueEligibility } from '../../modules/career/engines/Investigations.js';
import { routeView, lineEligibility, qualEligibility } from '../../modules/career/engines/Routes.js';
import { diplomacyView, CONES } from '../../modules/career/engines/Diplomacy.js';
import { classroomView, APPROACHES as TEACH, NEEDS } from '../../modules/career/engines/Classroom.js';
import { officeView, BUCKETS } from '../../modules/career/engines/OfficePolitics.js';
import { dealsView, STAGES, KINDS } from '../../modules/career/engines/Deals.js';
import { tradeView, takeEligibility, MAX_JOBS } from '../../modules/career/engines/TradeJobs.js';
import { ROLES } from '../../modules/career/engines/MajorIncidents.js';
import { emView, READINESS, ACTIONS, PROJECTS, actionEligibility, grantEligibility, mitigatedHere } from '../../modules/career/engines/EmergencyMgmt.js';
import { seasonView } from '../../modules/career/engines/Seasons.js';
import { audienceView, PACE, fansLabel } from '../../modules/career/engines/Audience.js';

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

function bookSection(state) {
  const v = bookView(state);
  if (!v) return '';
  const { cfg, rec, k } = v;
  const y = state.yearly ?? {};
  const actions = [
    button('🎯 Prospect for new clients', 'clientBook.prospect', { variant: 'small', disabled: Boolean(y['clientBook.prospect']), hint: 'Networking, referrals and cold calls' }),
    button('☕ Look after your clients', 'clientBook.nurture', { variant: 'small', disabled: Boolean(y['clientBook.nurture']), hint: 'Everyone\'s loyalty goes up' }),
    button('📈 Raise your rates 10%', 'clientBook.raise', { variant: 'small', disabled: Boolean(y['clientBook.raise']), hint: 'More from everyone; loyalty dips' }),
  ].join('');
  const clients = (rec?.clients ?? []).slice().sort((a, b) => b.value - a.value).slice(0, 8).map((c) => `<li class="report-row"><div><b>${esc(c.name)}</b> <small class="muted">${esc(c.kind)} · $${(c.value * k).toLocaleString()}/yr</small></div><small class="${c.loyalty < 40 ? 'neg' : ''}">loyalty ${c.loyalty}%</small></li>`).join('');
  const n = (rec?.clients.length ?? 0) * k;
  const stats = rec ? `<p>${chip(`${cfg.icon} ${n} ${esc(cfg.noun)}s`)} ${chip(`💵 $${Math.round(rec.revenue).toLocaleString()} a year`, 'good')} ${chip(`➕ ${rec.won * k} won · ➖ ${rec.lost * k} lost`)}</p>${meter(rec.rep, { label: 'Reputation' })}` : '<p class="fine">Your book starts with your first year.</p>';
  return disclosure('engine.book', `${cfg.icon} ${esc(cfg.label)}`, `${stats}<div class="toggle-row">${actions}</div>${clients ? `<h4 class="sub">Biggest ${esc(cfg.noun)}s${k > 1 ? ` (each stands for ${k})` : ''}</h4><ul class="history">${clients}</ul>` : ''}<p class="fine">A full book is about ${cfg.capacity} ${esc(cfg.noun)}s and pays well on top of your base; over that and loyalty slips.</p>`, { count: rec ? `${n} ${cfg.noun}s` : null });
}

function projectSection(state) {
  const v = projectView(state);
  if (!v) return '';
  const { cfg, rec } = v;
  const approach = rec?.approach ?? 'careful';
  const buttons = Object.entries(APPROACH).map(([id, a]) => button(`${a.icon} ${a.name}`, 'projectWork.approach', { arg: id, variant: id === approach ? 'small on' : id === 'corners' ? 'small danger' : 'small', disabled: id === approach || Boolean(state.yearly['projectWork.approach']), hint: a.desc })).join('');
  const p = rec?.project;
  const now = p ? `<p><b>${esc(p.name.replace(/^./, (c) => c.toUpperCase()))}</b></p>${meter(p.progress, { label: 'Progress' })}${meter(p.quality, { label: 'Quality' })}` : '<p class="fine">Your next project starts with the new year.</p>';
  const port = (rec?.portfolio ?? []).map((x) => `<li class="report-row"><div><b>${esc(x.name.replace(/^./, (c) => c.toUpperCase()))}</b> <small class="muted">age ${x.age}</small></div><small class="${x.outcome === 'trouble' ? 'neg' : ''}">${{ acclaimed: '🏆 acclaimed', delivered: '✅ delivered', trouble: '⚠️ trouble' }[x.outcome]}</small></li>`).join('');
  return disclosure('engine.projects', `${cfg.icon} ${esc(cfg.label)}`, `${now}<h4 class="sub">How you work</h4><div class="toggle-row">${buttons}</div>${port ? `<h4 class="sub">Portfolio</h4><ul class="history">${port}</ul>` : ''}${rec ? meter(rec.rep, { label: 'Reputation' }) : ''}`, { count: p ? `${p.progress}% done` : null });
}

function seasonSection(state) {
  const v = seasonView(state);
  if (!v) return '';
  const { cfg, rec } = v;
  const planId = rec?.plan ?? Object.keys(cfg.plans)[0];
  const buttons = Object.entries(cfg.plans).map(([id, p]) => button(`${p.icon} ${p.name}`, 'seasonWork.plan', { arg: id, variant: id === planId ? 'small on' : 'small', disabled: id === planId || Boolean(state.yearly['seasonWork.plan']), hint: p.desc })).join('');
  const past = (rec?.seasons ?? []).slice(0, 6).map((x) => `<li class="report-row"><div><b>Age ${x.age}</b> <small class="muted">${esc(cfg.plans[x.plan]?.name ?? '')}</small></div><small class="${x.tier >= cfg.tiers.length - 2 ? 'neg' : ''}">${esc(x.result)}${x.pay ? ` · $${x.pay.toLocaleString()}` : ''}</small></li>`).join('');
  const best = rec?.best ? `<p>${chip(`🌟 Best: ${esc(rec.best.result)} (age ${rec.best.age})`, 'good')}</p>` : '<p class="fine">Your first season is still ahead.</p>';
  return disclosure('engine.season', `${cfg.icon} ${esc(cfg.label)}`, `${best}<h4 class="sub">Next season</h4><div class="toggle-row">${buttons}</div>${past ? `<h4 class="sub">Past seasons</h4><ul class="history">${past}</ul>` : ''}${rec ? meter(rec.rep, { label: 'Reputation' }) : ''}<p class="fine">Plan the season once a year. Skill, weather, markets and luck decide the result, which pays on top of your base.</p>`, { count: cfg.plans[planId]?.name });
}

function audienceSection(state) {
  const v = audienceView(state);
  if (!v) return '';
  const { cfg, rec } = v;
  const y = state.yearly ?? {};
  const pace = rec?.pace ?? 'steady';
  const paces = Object.entries(PACE).map(([id, p]) => button(`${p.icon} ${p.name}`, 'audience.pace', { arg: id, variant: id === pace ? 'small on' : 'small', disabled: id === pace || Boolean(y['audience.pace']), hint: p.desc })).join('');
  const releases = Object.entries(cfg.releases).map(([id, r]) => button(`${r.icon} ${r.name}`, 'audience.release', { arg: id, variant: 'small', disabled: Boolean(y['audience.release']), hint: `${r.desc}${r.cost ? ` · $${r.cost.toLocaleString()}` : ''}` })).join('');
  const past = (rec?.releases ?? []).slice(0, 6).map((x) => `<li class="report-row"><div><b>${esc(x.name.replace(/^./, (c) => c.toUpperCase()))}</b> <small class="muted">age ${x.age}</small></div><small class="${x.reception === 'controversy' || x.reception === 'flop' ? 'neg' : ''}">${{ hit: '🚀 hit', 'well received': '👍 well received', flop: '😶 flop', controversy: '🔥 controversy' }[x.reception]}</small></li>`).join('');
  const stats = rec ? `<p>${chip(`${cfg.icon} ${fansLabel(rec.fans)} ${esc(cfg.noun)}`, 'good')} ${chip(`📈 peak ${fansLabel(rec.peak)}`)} ${rec.income ? chip(`💵 $${rec.income.toLocaleString()} last year`, 'good') : ''}</p>${meter(rec.rep, { label: 'Reputation' })}${meter(rec.burnout, { label: 'Burnout' })}` : '<p class="fine">Your audience starts with your first year.</p>';
  return disclosure('engine.audience', `${cfg.icon} ${esc(cfg.label)}`, `${stats}<h4 class="sub">Your pace</h4><div class="toggle-row">${paces}</div><h4 class="sub">This year's big release</h4><div class="toggle-row">${releases}</div>${past ? `<h4 class="sub">Past releases</h4><ul class="history">${past}</ul>` : ''}<p class="fine">${cfg.perFan ? `Sponsors, streams and appearances pay by the size of your following. ` : ''}Burnout past 85 forces a break.</p>`, { count: rec ? `${fansLabel(rec.fans)} ${cfg.noun}` : null });
}

function investigationSection(state) {
  const v = investigationView(state);
  if (!v) return '';
  const { cfg, rec, working } = v;
  if (!working) return disclosure('engine.investigations', `${cfg.icon} ${esc(cfg.label)}`, '<p class="fine">Cases come once you finish training.</p>');
  const tech = rec?.technique ?? 'surveillance';
  const buttons = Object.entries(TECHNIQUES).map(([id, t]) => { const ok = techniqueEligibility(state, id); return button(`${t.icon} ${t.name}`, 'investigations.technique', { arg: id, variant: id === tech ? 'small on' : id === 'undercover' ? 'small danger' : 'small', disabled: id === tech || !ok.ok, hint: ok.ok ? t.desc : ok.reason }); }).join('');
  const c = rec?.case;
  const now = c ? `<p><b>${esc(c.target.replace(/^./, (x) => x.toUpperCase()))}</b> <small class="muted">${esc(c.kind)} · year ${c.years}</small></p>${meter(Math.min(100, c.evidence), { label: 'Evidence' })}${meter(Math.min(100, c.heat * 2), { label: 'Exposure' })}${button('🚨 Take it down now', 'investigations.takedown', { variant: 'small', disabled: c.evidence < 40, hint: c.evidence < 40 ? 'Not enough for a prosecutor yet' : 'Arrest now — weaker evidence, likelier acquittals' })}` : '<p class="fine">A new case opens with the new year.</p>';
  const closed = (rec?.closed ?? []).slice(0, 6).map((x) => `<li class="report-row"><div><b>${esc(x.target.replace(/^./, (y) => y.toUpperCase()))}</b> <small class="muted">${esc(x.kind)} · age ${x.age}</small></div><small class="${['acquitted', 'blown'].includes(x.outcome) ? 'neg' : ''}">${{ landmark: '🏆 landmark', convicted: '⚖️ convicted', acquitted: '❌ acquitted', blown: '💨 blown' }[x.outcome]}</small></li>`).join('');
  const stats = rec ? `<p>${chip(`🚔 ${rec.arrests} arrests`)} ${chip(`⚖️ ${rec.convictions} convicted`, 'good')}</p>` : '';
  return disclosure('engine.investigations', `${cfg.icon} ${esc(cfg.label)}`, `${stats}${now}<h4 class="sub">Technique</h4><div class="toggle-row">${buttons}</div>${closed ? `<h4 class="sub">Closed cases</h4><ul class="history">${closed}</ul>` : ''}<p class="fine">Evidence builds each year; exposure lets the target find out. Take it down early and juries may acquit.</p>`, { count: c ? `${Math.min(100, c.evidence)}% evidence` : null });
}

function routeSection(state) {
  const v = routeView(state);
  if (!v) return '';
  const { cfg, rec } = v;
  const lineId = rec?.line ?? Object.keys(cfg.lines)[0];
  const lines = Object.entries(cfg.lines).map(([id, l]) => { const ok = lineEligibility(state, id); return button(`${l.icon} ${l.name}`, 'routeWork.line', { arg: id, variant: id === lineId ? 'small on' : 'small', disabled: id === lineId || !ok.ok, hint: ok.ok ? `${l.desc}${l.pay > 1 ? ` · +${Math.round((l.pay - 1) * 100)}% pay` : ''}` : ok.reason }); }).join('');
  const quals = Object.entries(cfg.quals).map(([id, q]) => { const has = Boolean(rec?.quals?.[id]); const ok = qualEligibility(state, id); return button(`${q.icon} ${has ? '✓ ' : ''}${q.name}`, 'routeWork.qualify', { arg: id, variant: has ? 'small on' : 'small', disabled: has || !ok.ok, hint: has ? 'Qualified' : ok.ok ? `${q.desc}${q.cost ? ` · $${q.cost.toLocaleString()}` : ''}${q.pay ? ` · +${Math.round(q.pay * 100)}% pay` : ''}` : ok.reason }); }).join('');
  const stats = rec ? `<p>${chip(`${cfg.icon} ${rec.logged.toLocaleString()} ${esc(cfg.unit)} logged`)} ${chip(`🛡️ ${rec.safeYears} safe year${rec.safeYears === 1 ? '' : 's'}`, rec.safeYears >= 3 ? 'good' : '')} ${rec.incidents ? chip(`⚠️ ${rec.incidents} incident${rec.incidents === 1 ? '' : 's'}`, 'warn') : ''}</p>${meter(rec.rep, { label: 'Reputation' })}${rec.checkDue ? `<p class="fine">Next ${esc(cfg.checkName)} at age ${rec.checkDue}.</p>` : ''}` : '<p class="fine">Your logbook opens with your first year.</p>';
  return disclosure('engine.route', `${cfg.icon} ${esc(cfg.label)}`, `${stats}<h4 class="sub">Your line (bid by seniority)</h4><div class="toggle-row">${lines}</div><h4 class="sub">Qualifications</h4><div class="toggle-row">${quals}</div><p class="fine">One bid and one course a year. Qualifications open better lines and add pay.</p>`, { count: cfg.lines[lineId]?.name });
}

const cap = (t) => t.replace(/^./, (c) => c.toUpperCase());

function diplomacySection(state) {
  const v = diplomacyView(state);
  if (!v) return '';
  const { rec, posting } = v;
  const job = state.career.job;
  const cones = Object.entries(CONES).map(([id, c]) => button(`${c.icon} ${c.name}`, 'diplomacy.cone', { arg: id, variant: rec?.cone === id ? 'small on' : 'small', disabled: !rec?.cone || rec.cone === id || rec.coneChanged || (job.yearsAtEmployer ?? 0) < 5 || Boolean(state.yearly['diplomacy.cone']), hint: rec?.coneChanged ? 'You\'ve changed cones once' : (job.yearsAtEmployer ?? 0) < 5 ? 'Cone changes after five years' : c.desc })).join('');
  const work = rec ? (rec.cone === 'consular' ? `${chip(`🛂 ${rec.visas.toLocaleString()} visa interviews`)} ${chip(`🆘 ${rec.citizens} citizens helped`)}` : chip(`📨 ${rec.cables} cables`)) : '';
  const where = posting ? `<p>${chip(`🌐 ${esc(posting.city)}, ${esc(posting.country)}`)}${posting.hardship ? ` ${chip(`+${Math.round(posting.hardship * 100)}% hardship`, 'warn')}` : ''}${posting.danger ? ` ${chip(`+${Math.round(posting.danger * 100)}% danger`, 'warn')}` : ''}</p>` : '<p class="fine">A tour at headquarters.</p>';
  return disclosure('engine.diplomacy', '🌐 Your Post', `${where}${rec?.cone ? `<p>${CONES[rec.cone].icon} <b>${esc(CONES[rec.cone].name)} cone</b> ${work}</p>` : '<p class="fine">You choose a cone with your first year at post.</p>'}${rec?.evacuations ? `<p>${chip(`🚁 ${rec.evacuations} evacuation${rec.evacuations === 1 ? '' : 's'}`, 'warn')}</p>` : ''}${rec ? meter(rec.rep, { label: 'Reputation' }) : ''}<h4 class="sub">Cone</h4><div class="toggle-row">${cones}</div><p class="fine">Tours last three years and you live at post. Hardship and danger posts pay more and count at promotion boards; senior officers with a strong record can be nominated ambassador.</p>`, { count: posting?.city ?? 'HQ' });
}

function classroomSection(state) {
  const v = classroomView(state);
  if (!v) return '';
  const { rec } = v;
  const y = state.yearly ?? {};
  const approach = rec?.approach ?? 'engaging';
  const buttons = Object.entries(TEACH).map(([id, a]) => button(`${a.icon} ${a.name}`, 'classroom.approach', { arg: id, variant: id === approach ? 'small on' : 'small', disabled: id === approach || Boolean(y['classroom.approach']), hint: a.desc })).join('');
  const kids = (rec?.klass?.students ?? []).map((s) => `<li class="report-row"><div><b>${esc(s.name)}</b> <small class="muted">${NEEDS[s.need].icon} ${esc(NEEDS[s.need].label)}${s.tutored ? ' · tutored' : ''}</small></div><div>${button('✏️ Tutor', 'classroom.tutor', { arg: s.id, variant: 'tiny', disabled: s.tutored || Boolean(y['classroom.tutor']), hint: 'After school, twice a week' })} <small class="${s.score < 60 ? 'neg' : ''}">${s.score}</small></div></li>`).join('');
  const last = rec?.years?.[0];
  const stats = last ? `<p>${chip(`📝 Last spring: ${last.pass}% proficient`, last.pass >= 80 ? 'good' : last.pass < 45 ? 'warn' : '')} ${rec.alumni.length ? chip(`💌 ${rec.alumni.length} students who loved your class`) : ''}</p>` : '<p class="fine">Your first class starts in the fall.</p>';
  return disclosure('engine.classroom', '🍎 Your Class', `${stats}<h4 class="sub">How you teach</h4><div class="toggle-row">${buttons}</div>${kids ? `<h4 class="sub">This year's class (a sample)</h4><ul class="history">${kids}</ul>` : ''}<p class="fine">Proficient means 60 or above on the spring test. Tutor one student a year.</p>`, { count: last ? `${last.pass}% proficient` : null });
}

function officeSection(state) {
  const v = officeView(state);
  if (!v) return '';
  const { rec } = v;
  const y = state.yearly ?? {};
  const actions = [
    button('🎤 Network & volunteer for visible work', 'office.network', { variant: 'small', disabled: Boolean(y['office.network']), hint: 'Visibility, and maybe a mentor' }),
    button('☕ Time with your mentor', 'office.mentor', { variant: 'small', disabled: !rec?.mentor || Boolean(y['office.mentor']), hint: rec?.mentor ? 'Strengthen your sponsor' : 'Find a mentor first' }),
    button('🤝 Make peace with your rival', 'office.rival', { arg: 'ally', variant: 'small', disabled: !rec || Boolean(y['office.rival']), hint: 'Split the credit' }),
    button('🗡️ Undermine your rival', 'office.rival', { arg: 'undermine', variant: 'small danger', disabled: !rec || Boolean(y['office.rival']), hint: 'Risky' }),
  ].join('');
  const ratings = (rec?.ratings ?? []).slice(0, 6).map((r) => chip(`${BUCKETS[r.bucket].icon} ${r.age}`, r.bucket === 'top' ? 'good' : r.bucket === 'bottom' ? 'warn' : '')).join(' ');
  const people = rec ? `<p>${rec.mentor ? chip(`🧭 Mentor: ${esc(rec.mentor.name)}, ${esc(rec.mentor.title)}`, 'good') : chip('🧭 No mentor yet')} ${chip(`😼 Rival: ${esc(rec.rival.name)}`, rec.rival.threat >= 60 ? 'warn' : '')}</p>${meter(rec.visibility, { label: 'Visibility' })}${rec.mentor ? meter(rec.mentor.bond, { label: 'Sponsorship' }) : ''}${meter(rec.rival.threat, { label: 'Rival threat' })}` : '<p class="fine">Your first calibration is at year end.</p>';
  return disclosure('engine.office', '🏢 Office Politics', `${people}${ratings ? `<h4 class="sub">Calibration history</h4><p>${ratings}</p>` : ''}<div class="toggle-row">${actions}</div><p class="fine">Year-end ratings come from the work, your sponsor, your visibility — and what your rival says. Two bottom ratings in a row and you're out.</p>`, { count: rec?.ratings?.[0] ? BUCKETS[rec.ratings[0].bucket].label.split(' —')[0] : null });
}

function dealsSection(state) {
  const v = dealsView(state);
  if (!v) return '';
  const { rec } = v;
  const y = state.yearly ?? {};
  const pipe = (rec?.pipeline ?? []).map((d) => `<li class="report-row"><div><b>${esc(cap(d.name))}</b> <small class="muted">${KINDS[d.kind].icon} $${d.size.toLocaleString()}M · ${esc(STAGES[Math.min(d.stage, 4)])}</small></div>${button('🌙 All-nighters', 'deals.push', { arg: d.id, variant: 'tiny', disabled: (y['deals.push'] ?? 0) >= 2 || d.stage >= 4, hint: 'Faster, but your health pays' })}</li>`).join('');
  const closed = (rec?.closed ?? []).slice(0, 5).map((c) => `<li class="report-row"><div><b>${esc(cap(c.name))}</b> <small class="muted">age ${c.age}</small></div><small>$${(c.fee / 1e6).toFixed(1)}M fees</small></li>`).join('');
  const stats = rec ? `<p>${chip(`💼 ${rec.closed.length} closed`, 'good')} ${chip(`💀 ${rec.dead} died`)} ${chip(`💰 $${(rec.fees / 1e6).toFixed(1)}M lifetime fees`)}</p>` : '<p class="fine">Your pipeline fills with your first year.</p>';
  return disclosure('engine.deals', '💼 Your Deals', `${stats}${button('📑 Pitch for a new mandate', 'deals.pitch', { variant: 'small', disabled: Boolean(y['deals.pitch']), hint: 'Three weeks on a pitch book' })}${pipe ? `<h4 class="sub">Pipeline</h4><ul class="history">${pipe}</ul>` : ''}${closed ? `<h4 class="sub">Closed</h4><ul class="history">${closed}</ul>` : ''}<p class="fine">Pitch → Mandate → Diligence → Signing → Closed. Fees fill the bonus pool at year end.</p>`, { count: rec ? `${rec.pipeline.length} live` : null });
}

function tradeSection(state) {
  const v = tradeView(state);
  if (!v) return '';
  const { cfg, rec, apprentice } = v;
  const taken = rec?.taken ?? [];
  const jobs = (rec?.offers ?? []).map((j, i) => {
    const mine = taken.find((t) => t.idx === i);
    const book = takeEligibility(state, i, 'book');
    const cash = takeEligibility(state, i, 'cash');
    const buttons = mine ? chip(mine.how === 'cash' ? '💵 Side job' : '✅ Taken', 'good') : `${button('✅ Take it', 'tradeWork.take', { arg: `${i}:book`, variant: 'tiny', disabled: !book.ok, hint: book.ok ? `+${Math.round(j.pay * 100)}% of salary if done right` : book.reason })}${j.cash ? button('💵 Cash side job', 'tradeWork.take', { arg: `${i}:cash`, variant: 'tiny danger', disabled: !cash.ok, hint: cash.ok ? `$${j.cash.toLocaleString()} off the books` : cash.reason }) : ''}`;
    return `<li class="report-row"><div><b>${j.icon} ${esc(j.name)}</b> <small class="muted">${'●'.repeat(Math.max(1, Math.round(j.diff / 20)))} difficulty${j.injury >= 0.05 ? ' · dangerous' : ''}</small></div><div>${buttons}</div></li>`;
  }).join('');
  const stats = rec ? `<p>${chip(`✅ ${rec.done} jobs done right`, 'good')} ${rec.callbacks ? chip(`🔁 ${rec.callbacks} warranty calls`, 'warn') : ''} ${rec.sideCash ? chip(`💵 $${rec.sideCash.toLocaleString()} in side jobs`) : ''}</p>${meter(rec.rep, { label: 'Reputation' })}` : '';
  const hours = apprentice ? meter(Math.min(100, Math.round((rec?.hours ?? 0) / cfg.hours * 100)), { label: `Apprenticeship hours: ${(rec?.hours ?? 0).toLocaleString()} of ${cfg.hours.toLocaleString()}` }) : '';
  return disclosure('engine.trade', `${cfg.icon} ${esc(cfg.label)}`, `${stats}${hours}${jobs ? `<h4 class="sub">This year's board — take up to ${MAX_JOBS}</h4><ul class="history">${jobs}</ul>` : ''}<p class="fine">Jobs you take pay a bonus when done right and come back as unpaid warranty calls when not. Cash side jobs pay more and aren't on the books. Pick nothing and the shop sends you on its usual work.${apprentice ? ` Your hours count toward the ${esc(cfg.licence)}.` : ' With a master\'s licence, your field\'s businesses (below) let you open your own shop.'}</p>`, { count: `${taken.length}/${MAX_JOBS} taken` });
}

function incidentsSection(state) {
  const list = state.majorIncidents ?? [];
  if (!list.length) return '';
  const rows = list.slice(0, 8).map((x) => `<li class="report-row"><div><b>${esc(x.name.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase()))}</b> <small class="muted">age ${x.age}${x.mutualAid ? ' · mutual aid' : ''}</small></div><small>${esc(ROLES[x.role]?.label ?? 'Neighbour')} · ${esc(x.outcome)}</small></li>`).join('');
  return disclosure('engine.incidents', '🚨 Major Incidents You Worked', `<ul class="history">${rows}</ul><p class="fine">Disasters and major incidents pull in every agency — and you, in whatever part your job gives you.</p>`, { count: list.length });
}

function emSection(state) {
  const v = emView(state);
  if (!v) return '';
  const { rec, hazards, points, used } = v;
  const done = mitigatedHere(state);
  const haz = hazards.length ? hazards.map((h) => chip(`${h.icon} ${esc(h.name)} ${Math.round(h.p * 100)}%/yr${done[h.type] ? ' · mitigated' : ''}`, done[h.type] ? 'good' : h.p >= 0.08 ? 'warn' : '')).join(' ') : chip('No major natural hazards on record');
  const r = rec?.readiness;
  const meters = r ? Object.entries(READINESS).map(([k, x]) => meter(r[k], { label: `${x.icon} ${x.label}` })).join('') : '<p class="fine">Readiness is assessed with your first year.</p>';
  const actions = Object.entries(ACTIONS).map(([id, a]) => { const ok = actionEligibility(state, id); return button(`${a.icon} ${a.name}${a.cost > 1 ? ` (${a.cost})` : ''}`, 'emergencyMgmt.prepare', { arg: id, variant: 'small', disabled: !ok.ok, hint: ok.ok ? a.desc : ok.reason }); }).join('');
  const grants = hazards.filter((h) => PROJECTS[h.type]).map((h) => { const ok = grantEligibility(state, h.type); return button(`💰 ${esc(h.name)} mitigation grant`, 'emergencyMgmt.grant', { arg: h.type, variant: 'small', disabled: !ok.ok, hint: ok.ok ? PROJECTS[h.type].map((p) => p.name).join(' or ') : ok.reason }); }).join('');
  const projects = (rec?.projects ?? []).map((p) => `<li class="report-row"><div><b>🏗️ ${esc(p.name.replace(/^./, (c) => c.toUpperCase()))}</b> <small class="muted">${esc(p.hazard)}</small></div><small>${p.left} year${p.left === 1 ? '' : 's'} to go</small></li>`).join('');
  const claims = (rec?.claims ?? []).map((c) => `<li class="report-row"><div><b>📁 ${esc(c.name.replace(/^the /, '').replace(/^./, (x) => x.toUpperCase()))}</b> <small class="muted">paperwork ${c.paperwork}%</small></div><small class="${c.paperwork < 30 ? 'neg' : ''}">${(c.reimbursed / 1e6).toFixed(0)} of ${(c.amount / 1e6).toFixed(0)}M recovered</small></li>`).join('');
  const acts = (rec?.activations ?? []).slice(0, 5).map((a) => `<li class="report-row"><div><b>${esc(a.name.replace(/^the /, '').replace(/^./, (x) => x.toUpperCase()))}</b> <small class="muted">age ${a.age} · ${esc(a.level)} activation${a.mutualAid ? ' · mutual aid' : ''}</small></div><small class="${['troubled', 'failure'].includes(a.tier) ? 'neg' : ''}">${{ exemplary: '🏆 exemplary', good: '✅ good', troubled: '⚠️ troubled', failure: '❌ failure' }[a.tier]}</small></li>`).join('');
  return disclosure('engine.em', '🚨 Your Emergency Management Office', `<h4 class="sub">Your area's hazards</h4><p>${haz}</p><h4 class="sub">Readiness</h4>${meters}<h4 class="sub">Preparedness — ${Math.max(0, points - used)} of ${points} program actions left this year</h4><div class="toggle-row">${actions}</div><h4 class="sub">Mitigation</h4><div class="toggle-row">${grants || '<span class="fine">No mitigation projects for these hazards.</span>'}</div>${projects ? `<ul class="history">${projects}</ul>` : ''}${claims ? `<h4 class="sub">Recovery claims</h4><ul class="history">${claims}</ul>${button('📁 Push the recovery paperwork', 'emergencyMgmt.paperwork', { variant: 'small', disabled: Boolean(state.yearly['emergencyMgmt.paperwork']), hint: 'Keeps the auditors away' })}` : ''}${acts ? `<h4 class="sub">Activations</h4><ul class="history">${acts}</ul>` : ''}<p class="fine">Readiness slips every year you don't work at it, and it decides how the next disaster goes. Finished mitigation projects make the next disaster of that kind less severe where you live.</p>`, { count: r ? `readiness ${Math.round(Object.values(r).reduce((a, b) => a + b, 0) / 5)}%` : null });
}

/** Every engine that applies to the job you hold. */
export function engineSections(state) {
  if (!state.career.job) return '';
  return [emSection(state), diplomacySection(state), classroomSection(state), officeSection(state), dealsSection(state), shiftSection(state), investigationSection(state), caseSection(state), bookSection(state), projectSection(state), seasonSection(state), audienceSection(state), routeSection(state), tradeSection(state), incidentsSection(state)].join('');
}
