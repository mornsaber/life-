/**
 * Achievements tab: this life's unlocks and challenge, the all-time trophy
 * cabinet and the Hall of Fame of past lives.
 */
import { esc, card, chip, kv, money, disclosure } from '../Components.js';
import { ACHIEVEMENTS, CHALLENGES, hallOfFame, trophies, achievementPoints, lifeScore, countryFlag } from '../../modules/life/Achievements.js';

const TIER = { bronze: '🥉', silver: '🥈', gold: '🥇' };

function challengeCard(state) {
  const ch = state.challenge;
  const def = ch && CHALLENGES[ch.id];
  if (!def) return card('Challenge', '<p class="muted">No challenge this life. Pick one when you start a new life.</p>', { icon: '🎯' });
  const status = ch.status === 'won' ? chip(`🏆 Won at ${ch.at}`, 'green') : ch.status === 'failed' ? chip(`💔 Failed${ch.reason ? ` — ${esc(ch.reason)}` : ''}`, 'bad') : chip('In progress', 'warn');
  return card(`Challenge: ${esc(def.name)}`, `<p>${def.icon} ${esc(def.desc)}</p><p>${status}</p>`, { icon: '🎯', accent: ch.status === 'won' ? 'green' : 'yellow' });
}

function achievementsCard(state) {
  const mine = state.achievements ?? {};
  const all = trophies();
  const rows = Object.entries(ACHIEVEMENTS).map(([id, a]) => {
    const got = mine[id] != null;
    const ever = all[id];
    return `<li class="${got ? '' : 'muted'}">${got ? a.icon : '🔒'} <b>${esc(a.name)}</b> ${TIER[a.tier]} <small>${esc(a.desc)}${got ? ` · age ${mine[id]}` : ever ? ` · earned in ${ever.count} past life${ever.count === 1 ? '' : 'ves'}` : ''}</small></li>`;
  });
  const count = Object.keys(mine).length;
  return card(`Achievements · ${count}/${Object.keys(ACHIEVEMENTS).length}`, `${kv([['This life', `${count} unlocked · ${achievementPoints(state)} points`], ['All-time', `${Object.keys(all).length} of ${Object.keys(ACHIEVEMENTS).length} ever unlocked`], ['Life score so far', String(lifeScore(state))]])}
    <ul class="history">${rows.join('')}</ul>`, { icon: '🏆', accent: 'yellow' });
}

function hallCard() {
  const list = hallOfFame();
  if (!list.length) return card('Hall of Fame', '<p class="muted">Finished lives are enshrined here, ranked by their score.</p>', { icon: '🏛️' });
  const rows = list.slice(0, 25).map((e, i) => `<li><b>#${i + 1}</b> ${countryFlag(e.countryId)} <b>${esc(e.name)}</b> <small>(${e.born}–${e.died}, age ${e.age}) · ${e.peak ? `${esc(e.peak)} · ` : ''}${money(e.netWorth)} · ${e.achievements} achievements${e.challenge ? ` · ${CHALLENGES[e.challenge.id]?.icon ?? '🎯'} ${e.challenge.status === 'won' ? 'challenge won' : 'challenge failed'}` : ''}</small> ${chip(`⭐ ${e.score}`)}</li>`).join('');
  return card(`Hall of Fame · ${list.length} li${list.length === 1 ? 'fe' : 'ves'}`, `<ol class="history">${rows}</ol>${list.length > 25 ? '<p class="fine">Top 25 shown.</p>' : ''}`, { icon: '🏛️' });
}

export function achievementsView(state) {
  return `${challengeCard(state)}${achievementsCard(state)}${hallCard()}`;
}
