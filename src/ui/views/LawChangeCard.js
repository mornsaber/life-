/**
 * Chamber tab: "Change a Law" — one place to change the law, whoever you are. A member
 * introduces a bill; a mayor, governor, premier or president sends the legislature their own; a
 * business owner or union officer lobbies. Each law shows what it is now, what the change would
 * make it, and how the vote would go today, party by party.
 */
import { card, button, esc, disclosure } from '../Components.js';
import { LAWS, levelValue, describeValue, proposedValue } from '../../modules/politics/Laws.js';
import { mySeat, myBody, lawHere, chambersFor, projectBill, execLevel, whereFor, legActionsPerYear } from '../../modules/politics/Legislature.js';
import { isOfficer, myUnion } from '../../modules/career/LaborUnions.js';

const LEVEL_NAME = { US: { city: 'City', state: 'State', federal: 'Federal' }, abroad: { city: 'City', state: 'Region', federal: 'National' } };

/** What you can do, and at which levels. */
function roleOf(state) {
  const seat = mySeat(state);
  const body = myBody(state);
  if (seat && body) return { kind: 'member', levels: [body.level], action: 'legislature.sponsor', verb: 'Introduce', left: legActionsPerYear(seat) - (state.yearly['legislature.act'] ?? 0) };
  const lv = execLevel(state.politics?.office?.id);
  if (lv) return { kind: 'executive', levels: [lv], action: 'legislature.executiveBill', verb: 'Send', left: 2 - (state.yearly['legislature.agenda'] ?? 0) };
  const owner = state.business?.current || state.business?.holdings?.length;
  const union = isOfficer(state) && myUnion(state);
  if (owner || union) return { kind: 'lobby', levels: ['city', 'state', 'federal'], action: 'legislature.lobby', verb: 'Lobby', left: 2 - (state.yearly['legislature.lobby'] ?? 0), union: Boolean(union), owner: Boolean(owner) };
  return null;
}

/** The projected outcome as a short hint. */
function outlook(p) {
  if (!p) return '';
  const r = p.rows[0];
  const tally = `${r.yes.toLocaleString()}–${r.no.toLocaleString()}`;
  if (!p.passes) return `Fails ${tally}${p.short ? ` · ${p.short} short` : ''}`;
  if (p.vetoed) return `Passes ${tally}, then vetoed`;
  return `Passes ${tally}`;
}

/** Party by party, for the law you're looking at. */
function whipCount(p) {
  if (!p) return '';
  return p.rows.map((r) => `<p class="fine"><b>${esc(r.name)}</b>: ${r.byParty.filter((x) => x.yes + x.no > 0).map((x) => `${esc(x.short)} ${x.yes}–${x.no}`).join(' · ')}</p>`).join('');
}

export function lawChangeCard(state) {
  const role = roleOf(state);
  if (!state.legislature || !role) return '';
  const cc = state.character.countryId ?? 'US';
  const names = cc === 'US' ? LEVEL_NAME.US : LEVEL_NAME.abroad;
  const sections = role.levels.map((level) => {
    const where = whereFor(state, level);
    if (!chambersFor(level, where).length) return '';
    const rows = Object.entries(LAWS).filter(([id, l]) => l.levels.includes(level) && lawHere(id, level, where)).map(([id, law]) => {
      const cur = levelValue(state, id, level, where);
      const base = cur ?? (law.kind === 'number' ? law.min : cur);
      const opts = ['up', 'down'].map((dir) => {
        const to = proposedValue(id, base, dir);
        if (to === null) return '';
        const p = projectBill(state, level, where, id, dir);
        const arg = role.kind === 'lobby' ? `${id}|${dir}|${level}` : `${id}|${dir}`;
        const label = law.kind === 'flag' ? (to ? `✅ Enact` : `❌ Repeal`) : `${dir === 'up' ? '⬆️' : '⬇️'} ${esc(describeValue(id, to))}`;
        return { html: button(label, role.action, { arg, variant: p?.passes && !p.vetoed ? 'tiny' : 'tiny ghost', hint: outlook(p), disabled: role.left <= 0 }), p };
      }).filter(Boolean);
      const detail = opts.map((o) => whipCount(o.p)).join('');
      return `<li class="report-row"><div>${law.icon} <b>${esc(law.name)}</b> <small class="muted">now ${esc(describeValue(id, cur))}</small><br><small class="muted">${esc(law.effect ?? '')}</small>${detail ? disclosure(`whip-${level}-${id}`, 'How the vote looks', detail) : ''}</div><div class="toggle-row">${opts.map((o) => o.html).join('')}</div></li>`;
    }).join('');
    return rows ? `<h4 class="sub">${names[level]} law</h4><ul class="history">${rows}</ul>` : '';
  }).join('');
  if (!sections) return '';
  const intro = {
    member: 'Introduce a bill: it comes to the floor at the year\'s end, and in a close vote yours decides.',
    executive: 'Send the legislature your own bill: your standing moves votes, but it still has to pass.',
    lobby: `${role.owner ? 'Your companies can fund a campaign ($25k city, $150k regional, $1M national).' : ''} ${role.union ? 'As a union officer you can put the union\'s clout behind pro-labor bills, free.' : ''}`.trim(),
  }[role.kind];
  return card('Change a Law', `<p class="fine">${esc(intro)} ${role.left > 0 ? `${role.left} left this year.` : 'None left this year.'} The hint under each change is how the vote would go today.</p>${sections}`, { icon: '✍️', accent: 'yellow' });
}
