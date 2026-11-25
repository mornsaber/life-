/**
 * Works & Words: your novels, canvases and compositions, the prizes they won, and your platform.
 */
import { esc, button, card, money } from '../Components.js';
import { kindsNow, worksFame, PRIZES } from '../../modules/life/Works.js';
import { tvHere, radioHere } from '../../modules/life/FameOfTheDay.js';
import { fameScore } from '../../modules/life/Fame.js';
import { PERSONAS, teamLabel, teamCost, pressLawOdds } from '../../modules/life/FameUse.js';

export function worksCard(state) {
  if (state.character.age < 16) return '';
  const r = state.works ?? { list: [], prizes: [], oratory: 0 };
  const done = Boolean(state.yearly?.['works.create']);
  const make = kindsNow(state).map((k) => button(`${k.icon} ${k.label}`, 'works.create', { arg: k.id, variant: 'small', disabled: done, hint: done ? 'One major work a year' : `${r.practice?.[k.id] ?? 0} before` })).join('');
  const list = r.list.slice(-6).reverse().map((x) => `<li>${esc(x.title)} <small class="muted">${x.year} · ${x.kind} · ${esc(x.verdict)}</small></li>`).join('');
  const prizes = r.prizes.map((id) => PRIZES.find((p) => p.id === id)?.name).filter(Boolean);
  const speak = button(tvHere(state) ? '📺 Preach and speak (a ministry, a tour)' : radioHere(state) ? '📻 Preach and speak (radio, halls)' : '🎤 Preach and speak (revival meetings, lectures)', 'works.speak', { variant: 'small', disabled: Boolean(state.yearly?.['works.speak']) });
  return card('Works & Words', `${list ? `<ul class="history">${list}</ul>` : '<p class="muted">Nothing published, shown or performed yet.</p>'}
    ${prizes.length ? `<p>🏅 ${prizes.map(esc).join(' · ')}</p>` : ''}
    <div class="action-grid">${make}${speak}</div>
    <p class="fine">Each work is judged by its day; practice makes the next one better. A body of acclaimed work makes a name${r.oratory ? `; your following as a speaker: ${r.oratory}/100` : ''}.</p>`, { icon: '🖋️', summary: worksFame(state) ? `fame +${worksFame(state)}` : '' });
}

/** Using your name: persona, the team, causes and candidates, your foundation, your rival. */
export function fameUseCard(state) {
  const score = fameScore(state);
  const f = state.fame;
  if (!f || score < 15) return '';
  const personas = Object.entries(PERSONAS).map(([id, p]) => button(p.label, 'fameUse.persona', { arg: id, variant: f.persona === id ? 'primary' : 'small', hint: p.note })).join('');
  const team = ['publicist', 'manager'].map((id) => button(`${f.team?.[id] ? '✅' : '💼'} ${teamLabel(state, id)}`, 'fameUse.hire', { arg: id, variant: 'small', hint: `${f.team?.[id] ? 'Let go' : 'Hire'} · ${money(teamCost(state, id))} a year` })).join('');
  const lent = Boolean(state.yearly?.['fameUse.lend']);
  const lend = [
    state.civic?.activism?.cause ? button('📣 Lend your name to your cause', 'fameUse.lend', { arg: 'cause', variant: 'small', disabled: lent || score < 20 }) : '',
    button('🗳️ Campaign for your side', 'fameUse.lend', { arg: 'candidate', variant: 'small', disabled: lent || score < 20 }),
    f.foundation ? '' : button('🤲 Endow a foundation in your name', 'fameUse.foundation', { variant: 'small' }),
  ].join('');
  const notes = [
    f.foundation ? `🤲 ${esc(f.foundation.name)} (since age ${f.foundation.since})` : '',
    f.rival ? `⚔️ Rival: ${esc(f.rival.name)}${f.rival.allied ? ' (now a collaborator)' : ''}` : '',
    f.fadedAt ? '🕰️ The has-been years' : '',
    `⚖️ Against the papers here: ${Math.round(pressLawOdds(state, 'libel') * 100)}% (libel), ${Math.round(pressLawOdds(state, 'privacy') * 100)}% (privacy)`,
  ].filter(Boolean).map((x) => `<li>${x}</li>`).join('');
  return card('Using Your Name', `<p class="fine">Your public image</p><div class="action-grid">${personas}</div>
    <p class="fine">Your team</p><div class="action-grid">${team}</div>
    <div class="action-grid">${lend}</div><ul class="history">${notes}</ul>`, { icon: '🎭', summary: f.persona ? PERSONAS[f.persona].label : '' });
}
