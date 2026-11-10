/**
 * People you measure yourself against and what they all think of you: reputation by
 * circle (Life tab), rivals, family feuds and the dynasty (People tab).
 */
import { esc, money, button, card, chip, meter, kv } from '../Components.js';
import { CIRCLES, reputationOf, circlesNow } from '../../modules/life/Reputation.js';
import { rivalsOf, originLabel, rivalTitle, rivalAge } from '../../modules/people/Rivals.js';
import { feudsOf, dynastyScore, dynastyLabel } from '../../modules/people/FamilyFeuds.js';
import { byId } from '../../modules/people/People.js';
import { TIERS, latestPage } from '../../modules/life/News.js';
import { cityOf } from '../../modules/life/Cities.js';
import { REGIONS } from '../../modules/life/Regions.js';

const tone = (v) => (v >= 65 ? 'good' : v >= 40 ? 'mid' : 'bad');

export function reputationCard(state) {
  if (state.character.age < 12) return '';
  const r = reputationOf(state);
  const rows = circlesNow(state).filter(([id]) => id !== 'underworld' || state.underworld?.me || r.underworld !== 30).map(([id, c]) => meter(r[id], { label: `${c.icon} ${c.label}`, tone: tone(r[id]) })).join('');
  const recent = (r.history ?? []).slice(-3).reverse().map((h) => `<li><small>age ${h.age}</small> ${CIRCLES[h.circle].icon} ${esc(h.why)} <b class="${h.delta >= 0 ? 'pos' : 'neg'}">${h.delta >= 0 ? '+' : ''}${h.delta}</b></li>`).join('');
  return card('Reputation', `${rows}${recent ? `<ul class="history">${recent}</ul>` : ''}<p class="fine">What people think of you depends on which people. A good name at work helps you get hired; neighbours vote for people they think well of; scandals spread further the more famous you are.</p>`, { icon: '🪞', summary: `Work ${r.work} · Local ${r.neighbourhood}` });
}

export function rivalsCard(state) {
  const list = rivalsOf(state);
  if (!list.length) return '';
  const rows = list.map((r) => `<li class="region-row"><span>${originLabel(r).icon} <b>${esc(r.name)}</b> <small>${esc(originLabel(r).label)} · ${rivalAge(state, r)}</small></span>
    <small>${esc(rivalTitle(r))} · ${money(r.wealth)}${r.married ? ` · married${r.kids ? `, ${r.kids} kid${r.kids === 1 ? '' : 's'}` : ''}` : ''}</small>
    ${r.friend ? chip('Friends now', 'good') : `${chip(r.grudge >= 80 ? 'Feud' : `Grudge ${r.grudge}`, r.grudge >= 80 ? 'bad' : r.grudge >= 50 ? 'warn' : '')} ${button('🕊️ Reach out', 'rivals.reconcile', { arg: r.id, variant: 'tiny' })}`}</li>`).join('');
  return card('Rivals', `<ul class="history">${rows}</ul><p class="fine">The people whose lives you measure yours against. Their careers climb beside yours; every crossing adds to the grudge, and time takes it away.</p>`, { icon: '⚔️', summary: `${list.length}` });
}

export function familyCard(state) {
  const feuds = feudsOf(state);
  const score = dynastyScore(state);
  const gens = state.lineage?.generation ?? 1;
  if (!feuds.length && gens < 2 && score < 20) return '';
  const rows = feuds.map((f) => { const p = byId(state, f.personId); return `<li class="region-row"><span>🧊 <b>${esc(p.firstName)}</b> <small>since age ${f.since}</small></span>${button('🕊️ Try to mend it', 'familyFeuds.mend', { arg: p.id, variant: 'tiny' })}</li>`; }).join('');
  return card(`The ${esc(state.character.lastName)} Family`, `${kv([['Dynasty', `${score}/100 · ${dynastyLabel(score)}`], ['Generations played', String(gens)]])}${rows ? `<h4 class="sub">Not speaking</h4><ul class="history">${rows}</ul>` : ''}`, { icon: '🏛️' });
}

/** This year's front page (Life tab). */
export function frontPageCard(state) {
  const page = latestPage(state);
  if (!page?.stories?.length) return '';
  const sections = Object.entries(TIERS).map(([id, t]) => {
    const s = page.stories.filter((x) => x.tier === id);
    return s.length ? `<h4 class="sub">${t.icon} ${t.label}</h4><ul class="history">${s.map((x) => `<li>${x.icon} ${x.you ? '<b>' : ''}${esc(x.headline)}${x.you ? '</b>' : ''}</li>`).join('')}</ul>` : '';
  }).join('');
  return card(`Front Page · ${page.year}`, sections, { icon: '📰', summary: esc(page.stories[0].headline) });
}

/** Where you live, and how it's changing (Move tab). */
export function cityCard(state) {
  const c = cityOf(state);
  const name = REGIONS[state.character.regionId]?.name ?? 'Your city';
  const t = c.trend ?? [];
  const arrow = (k) => { if (t.length < 2) return ''; const d = t.at(-1)[k] - t[Math.max(0, t.length - 5)][k]; return d > 2 ? ' ↑' : d < -2 ? ' ↓' : ' →'; };
  return card(`Your City: ${esc(name)}`, `${meter(c.jobs, { label: `💼 Jobs${arrow('jobs')}`, tone: c.jobs >= 55 ? 'good' : c.jobs >= 40 ? 'mid' : 'bad' })}${meter(c.crime, { label: `🚨 Crime${arrow('crime')}`, tone: c.crime <= 35 ? 'good' : c.crime <= 60 ? 'mid' : 'bad' })}${meter(c.mood, { label: '🙂 Mood', tone: c.mood >= 55 ? 'good' : c.mood >= 40 ? 'mid' : 'bad' })}
    ${kv([['House prices', `index ${c.prices}${arrow('prices')}`], ['Population', `index ${c.pop} (100 when you arrived)`]])}
    <p class="fine">Cities change with the economy, disasters — and you: businesses you grow add jobs, a force you lead cuts crime, rental empires push up prices. A strong job market helps you get hired; high crime makes you likelier to be a victim.</p>`, { icon: '🏙️', summary: `Jobs ${c.jobs} · Crime ${c.crime}` });
}
