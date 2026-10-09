/**
 * Equipment & facilities, wherever you have a say in them: your department
 * (Career tab), your business, your volunteer company or disaster team, and
 * your military unit.
 */
import { esc, button, card, chip, meter, disclosure } from '../Components.js';
import { GROUPS, contextOf, isIssued, recordOf, readiness, annualMoney, available, powers, refurbCost } from '../../modules/equipment/Equipment.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const short = (name) => name.replace(/ \(.*\)$/, '').replace(/^Leased /, '').toLowerCase();

const CREW_SEES = ['police', 'campusPolice', 'airportPolice', 'federalLE', 'borderPatrol', 'fire', 'stateFire', 'arff', 'ems', 'corrections', 'volFire', 'volEms'];
const TITLE = { job: 'Department', business: 'Business', volunteer: 'Company', military: 'Unit' };
const title = (c) => (c.ref.startsWith('team.') ? 'Team' : TITLE[c.kind]);
const MONEY_LABEL = { budget: 'capital budget left this year', funds: 'in the equipment fund', om: 'maintenance funds left this year', cash: 'business cash' };

function footer(state, c) {
  if (c.kind === 'business') return 'Paid from business cash. Worn-out equipment drags down quality and breaks down at the worst time; premises leases come out of cash every year.';
  if (c.kind === 'volunteer' && c.issued) return c.manager
    ? `Equipment is issued by the program, not bought. You get about ${money(annualMoney(state, c))} a year to overhaul what you have and can request new equipment once a year.`
    : c.requester ? 'Team leaders can request replacements; the program decides.' : 'The program issues your equipment. Leaders request replacements.';
  if (c.kind === 'volunteer') return c.manager
    ? `You run the equipment fund (a district levy of about ${money(annualMoney(state, c))} a year, plus whatever you raise). Used apparatus from career departments stretches it; federal grants need a 10% match.`
    : 'The chief and officers decide what gets bought. Anyone can help with the fund drive.';
  if (c.kind === 'military') return c.manager
    ? `Commanders don't buy equipment — you spend about ${money(annualMoney(state, c))} a year of O&M funds on depot overhauls and request newer models through the fielding process. Equipment readiness is on your evaluation.`
    : c.requester ? 'NCOs and staff can push requests up the chain; the commander decides.' : 'Your commander and the maintainers keep it running. Broken equipment shows up at inspections.';
  return c.manager
    ? `You control the equipment budget (about ${money(annualMoney(state, c))} a year, depending on ${c.sector === 'private' ? 'the company' : 'the government\'s finances'}). Readiness is part of your evaluation.`
    : c.requester ? 'Supervisors can request replacements; whoever holds the budget decides.' : 'Your chiefs and managers decide what gets bought. Old equipment breaks down on the job.';
}

/** The equipment card for one owner ('job' | 'business' | 'military' | 'vol.<serviceId>' | 'team.<id|sdf>'), or '' when it doesn't apply. */
export function equipmentCard(state, ref) {
  const c = contextOf(state, ref);
  if (!c) return '';
  // Rank and file see the fleet they ride in; elsewhere equipment is management's business.
  if (c.kind === 'job' && !c.manager && !c.requester && !CREW_SEES.includes(c.group)) return '';
  const d = recordOf(state, c, { peek: true });
  const g = GROUPS[c.group];
  const r = readiness(state, c);
  const can = powers(c);
  const pool = available(c, d);
  const y = state.yearly ?? {};
  const a = (rest) => `${ref}|${rest}`;
  const rows = Object.entries(g.categories).map(([cid, cat]) => {
    const units = d.units[cid] ?? [];
    const needed = cat.need[c.size] ?? 0;
    if (!needed && !units.length) return '';
    const worn = units.filter((u) => u.age > (cat.models[u.model]?.life ?? 10)).length;
    const avg = units.length ? Math.round(units.reduce((s, u) => s + u.age, 0) / units.length) : 0;
    const mix = Object.entries(units.reduce((acc, u) => ({ ...acc, [u.model]: (acc[u.model] ?? 0) + 1 }), {})).map(([mid, n]) => `${n} × ${esc(cat.models[mid]?.name ?? mid)}${units.some((u) => u.model === mid && u.leased) ? ' (some leased)' : ''}${units.some((u) => u.model === mid && u.used) ? ' (some bought used)' : ''}`).join(' · ');
    const incoming = d.pending.filter((p) => p.catId === cid).length;
    let buttons = '';
    if (c.manager) {
      buttons = Object.entries(cat.models).map(([mid, m]) => {
        if (can.requisition) return m.build || m.rent ? '' : button(`📨 Request fielding: ${esc(m.name)}`, 'deptEquip.requisition', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: Boolean(y[`equip.requisition.${ref}`]), hint: 'One request a year · arrives next year if approved' });
        if (m.build) {
          if (!can.build) return '';
          const how = c.kind === 'business' ? 'Loan' : c.kind === 'volunteer' ? 'Fund drive' : 'Bond';
          return button(`🏗️ ${how}: build ${short(m.name)} (${money(m.cost)})`, 'deptEquip.build', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: Boolean(d.bond) || Boolean(y[`equip.bond.${ref}`]), hint: d.bond ? 'A project is already underway' : 'Needs approval; opens in ~2 years' });
        }
        if (m.rent) return button(`📝 Lease ${short(m.name)} (${money(m.rent)}/yr)`, 'deptEquip.buy', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: m.rent > pool });
        const leaseCost = Math.round((m.cost / m.life) * 1.3);
        return [
          button(`🆕 ${esc(m.name)} ${money(m.cost)}`, 'deptEquip.buy', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: m.cost > pool, hint: `${m.life}-year service life · ${money(m.upkeep)}/yr upkeep` }),
          m.usedCost && can.used ? button(`♻️ Used ${money(m.usedCost)}`, 'deptEquip.buy', { arg: a(`${cid}:${mid}:used`), variant: 'tiny', disabled: m.usedCost > pool, hint: 'Already partway through its life' }) : '',
          m.lease && can.lease ? button(`📝 Lease ${money(leaseCost)}/yr`, 'deptEquip.buy', { arg: a(`${cid}:${mid}:lease`), variant: 'tiny', disabled: leaseCost > pool, hint: 'Paid every year; returned at end of life' }) : '',
          can.fundraise && !m.usedCost ? button('📄 Apply for a grant', 'deptEquip.grant', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: Boolean(y[`equip.grant.${ref}`]) || d.budget < m.cost * 0.1, hint: `10% match: ${money(m.cost * 0.1)}` }) : '',
        ].join('');
      }).join('');
      const fixable = units.filter((u) => !u.leased && (isIssued(c) || cat.models[u.model]?.refurb || cat.models[u.model]?.remount));
      if (fixable.length) {
        const oldest = fixable.sort((p, q) => q.age - p.age)[0];
        const m = cat.models[oldest.model];
        const label = isIssued(c) ? '🔧 Depot overhaul the oldest' : m.remount ? '🔧 Remount the oldest' : '🔧 Refurbish the oldest';
        buttons += button(`${label} (${money(refurbCost(c, m))})`, 'deptEquip.refurb', { arg: a(cid), variant: 'tiny', disabled: refurbCost(c, m) > pool });
      }
      // Bulk: the whole category in one click.
      const [bulkId, bulkM] = Object.entries(cat.models).find(([, m]) => !m.build && !m.rent) ?? [];
      if (bulkM && can.buy) {
        if (worn > 1) buttons += button(`🔁 Replace all ${worn} worn`, 'deptEquip.bulk', { arg: a(`${cid}:${bulkId}:worn`), variant: 'tiny', hint: `${money(worn * bulkM.cost)} for new ${short(bulkM.name)}s (as many as you can afford)` });
        if (needed - units.length > 1) buttons += button(`➕ Add ${needed - units.length} to standard`, 'deptEquip.bulk', { arg: a(`${cid}:${bulkId}:short`), variant: 'tiny', hint: money((needed - units.length) * bulkM.cost) });
      }
      if (units.some((u) => !u.leased)) buttons += button(cat.facility ? '🚪 Close / end a lease' : isIssued(c) ? '📦 Turn in the oldest' : '🏷️ Retire & sell the oldest', 'deptEquip.retire', { arg: a(cid), variant: 'tiny' });
    } else if (c.requester && !can.requisition) {
      buttons = button('📋 Request a replacement', 'deptEquip.request', { arg: a(cid), variant: 'tiny', disabled: Boolean(y[`equip.request.${ref}`]) });
    }
    const tone = units.length < needed || worn > needed / 3 ? 'warn' : 'good';
    return disclosure(`equip.${ref}.${cid}`, `${cat.icon} ${esc(cat.name)}`, `<p class="fine">${mix || 'None'}${units.length ? ` · average age ${avg} yr` : ''}${worn ? ` · <span class="neg">${worn} past service life</span>` : ''}${incoming ? ` · ${incoming} being fielded` : ''}</p>${buttons ? `<div class="toggle-row">${buttons}</div>` : ''}`, { count: `${units.length}/${needed}${worn ? ` · ${worn} worn` : ''}`, tone });
  }).join('');
  const chips = c.manager || c.kind === 'volunteer'
    ? `<p>${chip(`💰 ${money(c.money === 'cash' ? pool : d.budget)} ${MONEY_LABEL[c.money]}`)} ${d.reserve ? chip(`🏦 ${money(d.reserve)} reserve`) : ''} ${d.bond ? chip('🏗️ Building under construction', 'good') : ''}</p>`
    : '';
  const actions = [
    c.manager && can.buy ? button(d.auto ? '🤖 Staff manage equipment: ON' : '🤖 Let staff manage equipment', 'deptEquip.autoManage', { arg: a(''), variant: d.auto ? 'small on' : 'small', hint: 'Each year they replace what\'s worn and fill shortfalls within the money available' }) : '',
    c.manager && can.buy ? button('🔁 Replace everything worn', 'deptEquip.replaceAll', { arg: a(''), variant: 'small', hint: 'Every category at once, as far as the money goes' }) : '',
    c.manager && can.bank ? button('🏦 Bank unspent money for a big purchase', 'deptEquip.bank', { arg: a(''), variant: 'small', disabled: !d.budget || Boolean(y[`equip.bank.${ref}`]), hint: 'Otherwise it goes back at year-end' }) : '',
    can.fundraise ? button('🥞 Run a fund drive', 'deptEquip.fundraise', { arg: a(''), variant: 'small', disabled: Boolean(y[`equip.fund.${ref}`]), hint: 'Pancake breakfasts, boot drives, raffles' }) : '',
  ].join('');
  return card(`${title(c)} ${g.name}`, `${meter(r, { max: 100, label: c.kind === 'military' ? 'Equipment readiness' : 'Readiness', suffix: '%', tone: r >= 75 ? 'good' : r >= 55 ? 'mid' : 'bad' })}
    ${chips}${actions ? `<div class="action-grid">${actions}</div>` : ''}
    ${rows}
    <p class="fine">${footer(state, c)}</p>`, { icon: '🛠️' });
}
