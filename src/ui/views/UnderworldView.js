/**
 * The Underworld card (Activities tab): your city's outfits, and your life inside one.
 */
import { esc, money, button, card, kv, chip, meter, select, disclosure } from '../Components.js';
import { OUTFIT_TYPES, RACKETS, SKIM, POLICIES, meOf, outfitsHere, rankTitle, approachCheck } from '../../modules/legal/Underworld.js';

export function underworldCard(state) {
  if (state.character.age < 16 || !state.underworld) return '';
  const outfits = outfitsHere(state);
  const me = meOf(state);
  const mine = me ? state.underworld.outfits[me.outfitId] : null;
  const rows = outfits.map((o) => {
    const t = OUTFIT_TYPES[o.type];
    const enemy = o.war ? state.underworld.outfits[o.war]?.name : null;
    return `<li class="fund-row"><span>${t.icon} <b>${esc(o.name)}</b> <small>a ${esc(t.label)} · ${o.territory}% of the city · run by ${esc(o.boss)}${enemy ? ` · <span class="neg">at war with ${esc(enemy)}</span>` : ''}${o.task ? ' · <span class="neg">under federal investigation</span>' : ''}</small></span>${me ? '' : (() => { const c = approachCheck(state, o.id); return button('Get close', 'underworld.approach', { arg: o.id, variant: 'tiny danger', disabled: !c.ok, hint: c.ok ? `~${Math.round(c.odds * 100)}%` : c.reason }); })()}</li>`;
  }).join('');
  const city = outfits.length ? `<h4 class="sub">In your city</h4><ul class="funds">${rows}</ul>` : '<p class="fine">Nobody runs anything here that you know of — yet.</p>';
  if (!me || !mine) return card('The Underworld', `${city}<p class="fine">Outfits take people with a name on the street or a record. Once you're in, leaving isn't simple.</p>`, { icon: '🕴️', accent: 'red' });

  const t = OUTFIT_TYPES[mine.type];
  if (me.witsec) return card('Witness Protection', `<p>You testified against ${esc(mine.name)}. You live under a name the marshals gave you; ${esc(mine.name)} would still like to find you.</p>`, { icon: '🪪', accent: 'red' });
  const status = me.left ? (me.marked ? '<span class="neg">Out — and marked</span>' : 'Out, in peace') : `${esc(rankTitle(mine, me.rank))}${me.made ? ' (sworn)' : ''}`;
  const rackets = Object.entries(RACKETS).filter(([, r]) => me.rank >= Math.max(1, r.rank)).map(([id, r]) => button(`${r.icon} ${r.label}`, 'underworld.racket', { arg: id, variant: me.rackets.includes(id) ? 'tiny on' : 'tiny', hint: `${money(r.income[0])}–${money(r.income[1])} · heat ${r.heat}` })).join('');
  const crew = me.crew.length ? `<ul class="history">${me.crew.map((c) => `<li>${esc(c.name)} <small>loyalty ${c.loyalty} · skill ${c.skill}${c.arrested ? ' · arrested' : ''}${c.flipped ? ' · <span class="neg">cooperating</span>' : ''}</small></li>`).join('')}</ul>` : '<p class="fine">No crew yet.</p>';
  const body = `${kv([
    ['Outfit', `${t.icon} ${esc(mine.name)}${mine.war ? ` ${chip('at war', 'bad')}` : ''}${mine.task ? ` ${chip('task force', 'bad')}` : ''}`],
    ['Your place', status],
    ['Taken', money(me.earned ?? 0)],
    me.dirty ? ['Dirty money', `${money(me.dirty)} unexplained${me.laundered ? ` · ${money(me.laundered)} laundered` : ''}`] : null,
    me.informant && !me.left ? ['Secret', '<span class="neg">You\'re informing for the feds</span>'] : null,
  ].filter(Boolean))}
    ${meter(me.respect, { label: '🎖️ Respect' })}${meter(me.trust, { label: '🤝 The boss\'s trust', tone: me.trust < 30 ? 'bad' : me.trust < 50 ? 'mid' : 'good' })}
    ${me.left ? '' : `${me.rank >= 1 ? disclosure('uw.rackets', `💼 Rackets (${me.rackets.length}/${me.rank + 1})`, `<div class="toggle-row">${rackets}</div>`) : '<p class="fine">Associates run errands; members run rackets.</p>'}
    ${me.rank >= 1 && me.rank < 4 ? `<div class="enroll-form" data-collect-root>${select('skim', Object.entries(SKIM).map(([v, l]) => ({ value: v, label: l })), { value: String(me.skim ?? 0) })}${button('Set', 'underworld.skim', { variant: 'small', collect: true })}</div>` : ''}
    ${me.rank >= 2 ? disclosure('uw.crew', `🤝 Your crew (${me.crew.length})`, `${crew}${button('Recruit', 'underworld.recruit', { variant: 'small' })}`) : ''}
    ${me.rank >= 4 ? `<h4 class="sub">Running the outfit</h4><div class="toggle-row">${Object.entries(POLICIES).map(([id, p]) => button(p.label, 'underworld.policy', { arg: id, variant: mine.policy === id ? 'small on' : 'small', hint: p.desc })).join('')}</div>` : ''}
    <div class="action-grid">
      ${button('🧺 Launder through your business', 'underworld.launder', { variant: 'small', disabled: !me.dirty || !state.business?.current, hint: state.business?.current ? 'Once a year' : 'Needs a business of your own' })}
      ${me.rank >= 3 ? button('💼 Pay off an official', 'underworld.corrupt', { variant: 'small', hint: '$100,000 · heat down' }) : ''}
      ${mine.war && me.rank >= 2 ? button('🍝 Call a sit-down', 'underworld.sitDown', { variant: 'small' }) : ''}
      ${me.informant ? '' : button('🐀 Go to the feds', 'underworld.inform', { variant: 'small danger' })}
      ${button('🚪 Walk away', 'underworld.leave', { variant: 'small danger', hint: me.rank ? 'They may not let you' : 'Associates can drift away' })}
    </div>`}`;
  return card('The Underworld', `${body}${city}`, { icon: '🕴️', accent: 'red' });
}
