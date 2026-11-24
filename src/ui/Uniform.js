/**
 * The uniform, the badges of rank held over a life, and the qualification badges earned.
 *
 *   uniformCard        a drawn figure in the uniform of the service and the day: scarlet before
 *                      khaki in Britain, Union blue then olive drab in America, the Kaiser's blue
 *                      then field grey, camouflage from the 1980s; a shako, a spiked helmet or a
 *                      kepi, a peaked cap, a beret; a skirt in a women's corps; the badge of rank on
 *                      the sleeve or shoulder, the ribbons and the qualification badges on the breast.
 *   insigniaHistoryCard  every rank held, with its badge as it was worn then, and the year.
 *   qualBadges         wings, the parachutist's badge, tabs: each from the year it was first awarded.
 */
import { esc, card } from './Components.js';
import { militaryInsignia, jobInsignia } from './Insignia.js';
import { rankOf, branchOf } from '../modules/military/MilitaryEngine.js';
import { QUALS } from '../modules/military/Schools.js';
import { yearNow, setEraYear, periodTitle } from '../modules/world/Eras.js';
import { getProfession } from '../modules/career/JobTrees.js';
import { womensService } from '../modules/military/WomensServices.js';

const born = (state) => state.character.birthYear ?? yearNow(state) - state.character.age;
const GOLD = '#d4a017';
const SILVER = '#c9ced6';

/* ------------------------------------------------------------------ */
/* Qualification badges                                                 */
/* ------------------------------------------------------------------ */

/** When each badge was first awarded (American dates; others near enough), and how it's drawn. */
const QUAL_BADGES = {
  airborne: { from: 1941, glyph: '🪂', label: 'Parachutist wings' },
  jumpmaster: { from: 1949, glyph: '🪂', label: 'Senior parachutist wings', star: true },
  airAssault: { from: 1974, glyph: '🚁', label: 'Air Assault badge' },
  rangerSchool: { from: 1950, tab: 'RANGER', label: 'Ranger tab' },
  pathfinder: { from: 1964, glyph: '🧭', label: 'Pathfinder badge' },
  freefall: { from: 1994, glyph: '🪂', label: 'Freefall parachutist badge', star: true },
  combatDiver: { from: 1964, glyph: '🤿', label: 'Combat diver badge' },
  expertBadge: { from: 1944, glyph: '🎯', label: 'Expert badge' },
};
const tab = (text, color = '#1f1f1f', fill = '#e2b52f') => `<svg class="insignia-svg" viewBox="0 0 64 18" width="64" height="18"><rect x="1" y="1" width="62" height="16" rx="3" fill="${color}"/><text x="32" y="13" font-size="10" font-weight="700" text-anchor="middle" fill="${fill}">${esc(text)}</text></svg>`;
const glyphBadge = (glyph, star = false) => `<svg class="insignia-svg" viewBox="0 0 40 22" width="40" height="22"><path d="M2 12 Q10 4 20 9 Q30 4 38 12 Q30 10 20 14 Q10 10 2 12 Z" fill="${SILVER}"/><text x="20" y="15" font-size="11" text-anchor="middle">${glyph}</text>${star ? `<text x="20" y="6" font-size="6" text-anchor="middle" fill="${GOLD}">★</text>` : ''}</svg>`;

/** Badges earned in every spell of service: [{ label, svg, year }], each only once it existed. */
export function qualBadges(state) {
  const tours = [state.military?.service, ...(state.military?.history ?? [])].filter(Boolean);
  const y0 = born(state);
  const out = [];
  const seen = new Set();
  for (const t of tours) {
    for (const [id, age] of Object.entries(t.schools ?? {})) {
      const b = QUAL_BADGES[id];
      const year = y0 + age;
      if (!b || seen.has(id) || year < b.from) continue;
      seen.add(id);
      out.push({ label: QUALS[id]?.badge ?? b.label, svg: b.tab ? tab(b.tab) : glyphBadge(b.glyph, b.star), year });
    }
    // Wings for those who flew: pilots' from 1913, aircrews' from the 1940s.
    if (t.specialty === 'aviation' && !seen.has('wings')) {
      const year = y0 + (t.startAge ?? t.joinedAge ?? 18);
      if (year >= (t.track === 'officer' ? 1913 : 1942)) { seen.add('wings'); out.push({ label: t.track === 'officer' ? (t.branch === 'navy' ? 'Naval aviator wings' : 'Pilot wings') : 'Aircrew wings', svg: glyphBadge('✈️'), year }); }
    }
    // A combat infantryman's badge (from 1943), for infantry who served in combat.
    if (t.specialty === 'infantry' && (t.combatTours ?? 0) > 0 && !seen.has('cib') && !t.nation) {
      const year = Math.max(1943, y0 + (t.startAge ?? t.joinedAge ?? 18));
      if (year <= yearNow(state)) { seen.add('cib'); out.push({ label: 'Combat Infantryman Badge', svg: `<svg class="insignia-svg" viewBox="0 0 44 20" width="44" height="20"><rect x="2" y="5" width="40" height="9" rx="2" fill="#2456a6"/><path d="M8 10 H36" stroke="${SILVER}" stroke-width="2"/><path d="M4 16 Q22 22 40 16" fill="none" stroke="${SILVER}" stroke-width="1.5"/></svg>`, year }); }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Badges of rank held                                                  */
/* ------------------------------------------------------------------ */

/** Every rank held, in uniform or a uniformed civilian service: [{ year, title, badge, where }], oldest first. */
export function ranksHeld(state) {
  const y0 = born(state);
  const now = yearNow(state);
  const rows = [];
  const tours = [...(state.military?.history ?? []), ...(state.military?.service ? [state.military.service] : [])];
  try {
    for (const t of tours) {
      const where = (() => { try { return branchOf(t).name; } catch { return t.branch; } })();
      const list = t.ranks?.length ? t.ranks : t === state.military.service ? [{ title: rankOf(t).title, age: t.joinedAge ?? state.character.age, code: rankOf(t).code, branch: t.branch, nation: t.nation }] : t.rankCode ? [{ title: t.rankTitle, age: t.endAge, code: t.rankCode, branch: t.branch, nation: t.nation }] : [];
      for (const r of list) {
        const year = y0 + r.age;
        setEraYear(year);
        rows.push({ year, title: r.title, badge: r.code ? militaryInsignia(r.code, r.nation ?? t.nation ?? null, { branch: r.branch ?? t.branch, title: r.title }) : '', where });
      }
    }
    const jobs = [...(state.career?.history ?? []), ...(state.career?.job ? [state.career.job] : [])];
    for (const j of jobs) {
      const profession = getProfession(j.professionId);
      for (const r of j.rungs ?? []) {
        if (!r.levelId) continue;
        const year = y0 + r.age;
        setEraYear(year);
        const badge = jobInsignia({ ...j, levelId: r.levelId }, profession, state.character.countryId ?? 'US');
        if (badge) rows.push({ year, title: periodTitle(r.title, state.character.gender), badge, where: j.employerName ?? j.employer?.name ?? profession?.name ?? '' });
      }
    }
  } finally { setEraYear(now); }
  return rows.sort((a, b) => a.year - b.year);
}

export function insigniaHistoryCard(state) {
  const rows = ranksHeld(state);
  const quals = qualBadges(state);
  if (!rows.length && !quals.length) return '';
  const list = rows.map((r) => `<li class="region-row"><span>${r.badge || '<span class="muted">—</span>'} <b>${esc(r.title)}</b></span><small>${r.year} · ${esc(r.where)}</small></li>`).join('');
  const q = quals.map((b) => `<li class="region-row"><span>${b.svg} ${esc(b.label)}</span><small>${b.year}</small></li>`).join('');
  return card('Badges of Rank', `${list ? `<ul class="history">${list}</ul>` : ''}${q ? `<h4 class="sub">Qualification badges</h4><ul class="history">${q}</ul>` : ''}<p class="fine">Each badge as it was worn in its year.</p>`, { icon: '🎖️', summary: rows.length ? esc(rows.at(-1).title) : '' });
}

/* ------------------------------------------------------------------ */
/* The uniform                                                           */
/* ------------------------------------------------------------------ */

/** The cloth of the service in the year. */
function cloth(cc, branch, y, civil) {
  if (civil === 'police') return { coat: '#1d2540', legs: '#1d2540' };
  if (civil === 'fire') return { coat: '#1b2233', legs: '#1b2233' };
  if (['navy', 'coastguard'].includes(branch)) return y < 1857 ? { coat: '#2a3550', legs: '#e8e4d8' } : { coat: '#1d2b4f', legs: '#1d2b4f' };
  // The first airmen wore their army's khaki (the RFC, and the RAF to 1920); the Luftwaffe its blue-grey.
  if (branch === 'airforce' && y < 1920) return { coat: '#8a7a4a', legs: '#8a7a4a' };
  if (branch === 'airforce' && cc === 'DE' && y < 1956) return { coat: '#5c6a7a', legs: '#5c6a7a' };
  if (branch === 'airforce' && cc === 'RU') return { coat: y < 1992 ? '#3f4f6b' : '#2f3f5b', legs: '#2f3f5b' };
  if (branch === 'airforce') return y < 1947 && cc === 'US' ? { coat: '#6b6b3a', legs: '#6b6b3a' } : cc === 'US' ? { coat: '#2f4d7a', legs: '#2f4d7a' } : { coat: '#5b6f8f', legs: '#5b6f8f' };
  const camo = y >= 1985;
  if (cc === 'GB' || ['AU', 'NZ', 'CA', 'IN'].includes(cc)) return y < 1902 ? { coat: '#b3202a', legs: '#1d1d2b' } : camo ? { coat: '#6b7a4f', legs: '#6b7a4f', camo: true } : { coat: '#8a7a4a', legs: '#8a7a4a' };
  if (cc === 'DE') return y < 1910 ? { coat: '#2a3a5e', legs: '#1d1d22' } : y < 1956 ? { coat: '#6b6f5e', legs: '#6b6f5e' } : camo ? { coat: '#5f6b4f', legs: '#5f6b4f', camo: true } : { coat: '#5f6355', legs: '#5f6355' };
  if (cc === 'FR') return y < 1915 ? { coat: '#2a3a66', legs: '#b3202a' } : y < 1945 ? { coat: '#7b8aa3', legs: '#7b8aa3' } : camo ? { coat: '#6b7a4f', legs: '#6b7a4f', camo: true } : { coat: '#7a7a4a', legs: '#7a7a4a' };
  if (cc === 'RU') return { coat: y < 1917 ? '#3f4a3a' : '#5b6340', legs: '#3a3f35', camo: camo && y >= 1990 };
  if (cc === 'JP') return { coat: y < 1945 ? '#7a6a3a' : '#5f6b4f', legs: y < 1945 ? '#7a6a3a' : '#5f6b4f' };
  // America and the rest: Union blue, then olive drab, then camouflage.
  return y < 1902 ? { coat: '#22335e', legs: '#5b7fb0' } : camo ? { coat: '#6b7a4f', legs: '#6b7a4f', camo: true } : { coat: '#5e5e36', legs: '#5e5e36' };
}
/** The headdress of the day. */
function headdress(cc, branch, y, officer, civil) {
  const cap = (crown, band, peak = '#1d1d1d') => `<path d="M42 30 Q60 18 78 30 Z" fill="${crown}"/><rect x="42" y="29" width="36" height="5" fill="${band}"/><path d="M44 34 Q60 40 74 34 Z" fill="${peak}"/>`;
  if (civil === 'police') return cc === 'GB' && !officer ? `<path d="M46 34 Q46 10 60 8 Q74 10 74 34 Z" fill="#1d2540"/><circle cx="60" cy="9" r="2.4" fill="${SILVER}"/><text x="60" y="27" font-size="8" text-anchor="middle" fill="${SILVER}">✶</text>` : cap('#1d2540', '#1d2540');
  if (civil === 'fire') return `<path d="M40 34 Q42 14 60 12 Q78 14 80 34 Z" fill="${y < 1960 ? GOLD : '#c0242f'}"/><path d="M60 12 V30" stroke="#7a5a10" stroke-width="2"/>`;
  if (['navy', 'coastguard'].includes(branch)) return officer || y < 1880 ? cap('#1d2b4f', GOLD) : `<ellipse cx="60" cy="28" rx="17" ry="6" fill="#f4f1ea"/><rect x="43" y="28" width="34" height="5" fill="#1d1d1d"/>`;
  if (y < 1870) return `<rect x="47" y="8" width="26" height="26" rx="2" fill="#1d1d22"/><rect x="47" y="30" width="26" height="4" fill="${GOLD}"/><circle cx="60" cy="18" r="3" fill="${GOLD}"/>`;
  if (y < 1902 && cc === 'DE') return `<path d="M44 34 Q44 16 60 14 Q76 16 76 34 Z" fill="#1d1d1d"/><path d="M60 14 L60 4" stroke="${GOLD}" stroke-width="3"/><circle cx="60" cy="24" r="4" fill="${GOLD}"/>`;
  if (y < 1902 && ['FR', 'US'].includes(cc)) return `<path d="M46 34 L48 14 Q60 10 72 14 L74 34 Z" fill="${cc === 'FR' ? '#b3202a' : '#22335e'}"/><rect x="45" y="31" width="30" height="4" fill="#1d1d1d"/>`;
  if (y >= 1980 && !officer) return `<path d="M42 30 Q56 18 76 26 Q70 32 42 32 Z" fill="${cc === 'GB' ? '#2f2f5f' : '#1d1d1d'}"/>`;
  return cap(y < 1945 ? '#6b6b3a' : '#4f5a3a', officer ? GOLD : '#3a3a2a');
}

export function uniformSvg(state) {
  const svc = state.military?.service ?? null;
  const last = svc ?? (state.military?.history ?? []).at(-1) ?? null;
  const job = state.career?.job;
  const pid = job ? getProfession(job.professionId)?.template ?? job.professionId : null;
  const civil = !last && pid ? (/police|sheriff|trooper|warden|marshal|corrections|jail/i.test(pid) ? 'police' : /fire/i.test(pid) ? 'fire' : null) : null;
  if (!last && !civil) return '';
  const y = yearNow(state);
  const cc = last?.nation ?? (last ? 'US' : state.character.countryId ?? 'US');
  const branch = last?.branch ?? null;
  const officer = last ? last.track !== 'enlisted' : ['mgmt'].includes(job?.track);
  const female = state.character.gender === 'female';
  const c = cloth(cc, branch, y, civil);
  const skirt = female && y < 1980;
  // The badge of rank: on the sleeve for those below officer, on the shoulder for officers.
  let badge = '';
  try {
    badge = last ? (svc ? militaryInsignia(rankOf(svc).code, svc.nation ?? null, { branch: svc.branch, title: rankOf(svc).title }) : militaryInsignia(last.rankCode, last.nation ?? null, { branch: last.branch, title: last.rankTitle })) : jobInsignia(job, getProfession(job.professionId), state.character.countryId ?? 'US');
  } catch { badge = ''; }
  const place = officer ? 'translate(73 44) scale(0.42)' : 'translate(80 66) scale(0.5)';
  // Ribbons on the left breast, three to a row.
  const ribbons = (state.honors ?? []).filter((h) => h.ribbon).slice(0, 9).map((h, i) => {
    const stripes = Array.isArray(h.ribbon) ? h.ribbon.map((s) => (Array.isArray(s) ? s[0] : s)) : ['#8b0a1d'];
    const x = 63 + (i % 3) * 7; const yy = 58 - Math.floor(i / 3) * 4;
    return stripes.map((col, k) => `<rect x="${x + (k * 6) / stripes.length}" y="${yy}" width="${6 / stripes.length}" height="3" fill="${col}"/>`).join('');
  }).join('');
  const quals = qualBadges(state).length ? `<path d="M62 50 Q70 46 78 50 Q70 49 62 50 Z" fill="${SILVER}"/>` : '';
  const camo = c.camo ? [[48, 52, 6], [66, 70, 5], [54, 86, 7], [72, 92, 5], [50, 120, 6], [68, 130, 5]].map(([x, yy, r]) => `<circle cx="${x}" cy="${yy}" r="${r}" fill="#3f4a2f" opacity=".7"/>`).join('') : '';
  const legs = skirt ? `<path d="M44 104 L76 104 L80 134 L40 134 Z" fill="${c.coat}"/><rect x="47" y="134" width="8" height="18" fill="#d9c2a3"/><rect x="65" y="134" width="8" height="18" fill="#d9c2a3"/>` : `<rect x="45" y="104" width="13" height="48" fill="${c.legs}"/><rect x="62" y="104" width="13" height="48" fill="${c.legs}"/>`;
  return `<svg class="uniform-svg" viewBox="0 0 120 160" width="150" height="200" role="img" aria-label="Uniform">
    ${legs}<rect x="44" y="152" width="14" height="6" rx="2" fill="#1d1d1d"/><rect x="62" y="152" width="14" height="6" rx="2" fill="#1d1d1d"/>
    <path d="M40 46 Q60 38 80 46 L82 106 L38 106 Z" fill="${c.coat}"/>${camo}
    <rect x="28" y="48" width="12" height="44" rx="5" fill="${c.coat}"/><rect x="80" y="48" width="12" height="44" rx="5" fill="${c.coat}"/>
    <circle cx="34" cy="96" r="5" fill="#e8c39e"/><circle cx="86" cy="96" r="5" fill="#e8c39e"/>
    ${[60, 70, 80, 90].map((yy) => `<circle cx="60" cy="${yy}" r="1.4" fill="${GOLD}"/>`).join('')}
    <rect x="54" y="36" width="12" height="8" fill="#e8c39e"/><circle cx="60" cy="30" r="11" fill="#e8c39e"/>
    <g transform="translate(0 -9)">${headdress(cc, branch, y, officer, civil)}</g>
    ${ribbons}${quals}
    ${badge ? `<g transform="${place}">${badge}</g>` : ''}
  </svg>`;
}

export function uniformCard(state) {
  const svg = uniformSvg(state);
  if (!svg) return '';
  const svc = state.military?.service ?? (state.military?.history ?? []).at(-1);
  let caption = '';
  try { caption = svc ? `${state.military.service ? rankOf(svc).title : svc.rankTitle}, ${branchOf(svc).name}` : state.career?.job?.title ?? ''; } catch { caption = ''; }
  const corps = svc?.female ? womensService(svc.nation ?? 'US', svc.branch, yearNow(state)) : null;
  return card('Uniform', `<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">${svg}<div><b>${esc(caption)}</b><p class="fine">${state.military?.service ? 'As you wear it now' : 'As you last wore it'}, in the pattern of ${yearNow(state)}${corps ? ` (${esc(corps.name)})` : ''}.</p></div></div>`, { icon: '🪖' });
}
