/**
 * Equipment & facilities, wherever you have a say in them: your department
 * (Career tab), your business, your volunteer company or disaster team, and
 * your military unit.
 */
import { esc, button, card, chip, meter, disclosure } from '../Components.js';
import { specialistNote } from '../../modules/equipment/SpecialistCalls.js';
import { FLEET_POLICIES, GROUPS, contextOf, isIssued, recordOf, readiness, annualMoney, available, powers, refurbCost, needOf, expansionCase, modelQuality, fleetQuality, gearSafety, renovationCost, buyoutCost, countOf, upkeepDelta, grantSchemeOf } from '../../modules/equipment/Equipment.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const short = (name) => name.replace(/ \(.*\)$/, '').replace(/^Leased /, '').toLowerCase();

const CREW_SEES = ['police', 'campusPolice', 'airportPolice', 'federalLE', 'borderPatrol', 'fire', 'stateFire', 'arff', 'ems', 'corrections', 'volFire', 'volEms'];
const TITLE = { job: 'Department', business: 'Business', volunteer: 'Company', military: 'Unit' };
const title = (c) => (c.ref.startsWith('team.') ? 'Team' : TITLE[c.kind]);
const MONEY_LABEL = { budget: 'capital budget left this year', funds: 'in the equipment fund', om: 'maintenance funds left this year', cash: 'business cash' };

/** Why this model, in a line: what it's good for and what it costs to keep, against the standard one. */
function modelHint(cat, mid) {
  const m = cat.models[mid];
  const base = Object.values(cat.models)[0];
  const upkeep = m.upkeep - base.upkeep * (m.capacity ?? 1);
  const bits = [qualityLabel(modelQuality(cat, mid))];
  if (m.capacity && m.capacity !== 1) bits.push(m.capacity > 1 ? `counts as ${m.capacity}` : `counts as ${m.capacity} of a standard unit`);
  bits.push(`${m.life}-year life${m.life > base.life ? ` (+${m.life - base.life})` : ''}`);
  bits.push(`${money(m.upkeep)}/yr upkeep${m !== base && Math.abs(upkeep) >= 500 ? ` (${upkeep < 0 ? `saves ${money(-upkeep)}` : `+${money(upkeep)}`} a year)` : ''}`);
  return `${m.why ? `${m.why} · ` : ''}${bits.join(' · ')}`;
}

function footer(state, c) {
  if (c.kind === 'business') return 'Paid from business cash. Worn-out equipment drags down quality and breaks down at the worst time; premises leases come out of cash every year.';
  const issuer = c.parent?.name ?? 'the program';
  if (c.kind === 'volunteer' && c.issued) return c.manager
    ? `Equipment is issued by ${esc(issuer)}, not bought. You get about ${money(annualMoney(state, c))} a year to overhaul what you have and can request new equipment once a year.`
    : c.requester ? `Officers can request replacements; ${esc(issuer)} decides.` : `${esc(issuer)} issues your equipment. Officers request replacements.`;
  if (c.kind === 'volunteer') {
    const scheme = grantSchemeOf(state, c);
    const levy = c.parent ? `${esc(c.parent.name)} pays about ${money(annualMoney(state, c))} a year toward it` : `a district levy of about ${money(annualMoney(state, c))} a year`;
    return c.manager
      ? `The equipment fund is the agency's own funds — the same money that pays for training and any payroll — with ${levy}, plus fund drives, contracts and grants. Next year's payroll and overheads are held back. Used apparatus from career departments stretches it; ${scheme ? `${esc(scheme)} needs a 10% match` : `${esc(c.parent.name)} pays for most new apparatus if you make the case`}. The standard grows with your members and stations.`
      : 'The chief and officers decide what gets bought. Anyone can help with the fund drive.';
  }
  if (c.kind === 'military') return c.manager
    ? `Commanders don't buy equipment — you spend about ${money(annualMoney(state, c))} a year of O&M funds on depot overhauls and request newer models through the fielding process. Equipment readiness is on your evaluation.`
    : c.requester ? 'NCOs and staff can push requests up the chain; the commander decides.' : 'Your commander and the maintainers keep it running. Broken equipment shows up at inspections.';
  if (c.hq) return c.manager
    ? `${esc(c.hq)} buys the fleet centrally: you keep ${esc(c.label)}'s equipment running with about ${money(annualMoney(state, c))} a year of maintenance money, bid to headquarters for new apparatus once a year, and its fleet programme replaces worn units as policy allows.`
    : `${esc(c.hq)} buys the fleet centrally. Station officers bid for replacements; headquarters decides.`;
  return c.manager
    ? `You control the equipment budget (about ${money(annualMoney(state, c))} a year, depending on ${c.sector === 'private' ? 'the company' : 'the government\'s finances'}). Readiness is part of your evaluation.`
    : c.requester ? 'Supervisors can request replacements; whoever holds the budget decides.' : 'Your chiefs and managers decide what gets bought. Old equipment breaks down on the job.';
}

/** The equipment card for one owner ('job' | 'business' | 'military' | 'vol.<serviceId>' | 'team.<id|sdf>'), or '' when it doesn't apply. */
const qualityLabel = (q) => (q >= 1.08 ? 'premium' : q >= 1.02 ? 'above standard' : q >= 0.97 ? 'standard' : q >= 0.92 ? 'budget' : 'poor');

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
    const needed = needOf(cat, c);
    const special = specialistNote(state, c, cid);
    // Specialist kit stays on the list even where the standard doesn't call for it: you may still want one.
    if (!needed && !units.length && !(special && c.manager)) return '';
    const worn = units.filter((u) => u.age > (cat.models[u.model]?.life ?? 10)).length;
    const avg = units.length ? Math.round(units.reduce((s, u) => s + u.age, 0) / units.length) : 0;
    const leases = cat.facility ? units.filter((u) => cat.models[u.model]?.rent && !u.owned).map((u) => `lease ${money(u.rent ?? cat.models[u.model].rent)}/yr, ${u.termLeft ?? '?'} yr left`).join(' · ') : '';
    const renovating = units.filter((u) => u.renovating).length;
    const mix = Object.entries(units.reduce((acc, u) => ({ ...acc, [u.model]: (acc[u.model] ?? 0) + 1 }), {})).map(([mid, n]) => `${n} × ${esc(cat.models[mid]?.name ?? mid)}${units.some((u) => u.model === mid && u.leased) ? ' (some leased)' : ''}${units.some((u) => u.model === mid && u.used) ? ' (some bought used)' : ''}`).join(' · ');
    const incoming = d.pending.filter((p) => p.catId === cid).length;
    let buttons = '';
    if (c.manager) {
      buttons = Object.entries(cat.models).map(([mid, m]) => {
        if (can.requisition) return m.build || m.rent ? '' : button(c.kind === 'military' ? `📨 Request fielding: ${esc(m.name)}` : `📨 Ask ${esc(c.hq ?? c.parent?.name ?? 'headquarters')} for: ${esc(m.name)}`, 'deptEquip.requisition', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: Boolean(y[`equip.requisition.${ref}`]), hint: 'One bid a year · arrives next year if approved' });
        if (m.build) {
          if (!can.build) return '';
          const how = c.kind === 'business' ? 'Loan' : c.kind === 'volunteer' ? 'Fund drive' : 'Bond';
          return button(`🏗️ ${how}: build ${short(m.name)} (${money(m.cost)})`, 'deptEquip.build', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: Boolean(d.bond) || Boolean(y[`equip.bond.${ref}`]), hint: d.bond ? 'A project is already underway' : 'Needs approval; opens in ~2 years' });
        }
        if (m.rent) return button(`📝 Lease ${short(m.name)} (${money(m.rent)}/yr)`, 'deptEquip.buy', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: m.rent > pool });
        const leaseCost = Math.round((m.cost / m.life) * 1.3);
        return [
          button(`🆕 ${esc(m.name)} ${money(m.cost)}`, 'deptEquip.buy', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: m.cost > pool, hint: modelHint(cat, mid) }),
          m.usedCost && can.used ? button(`♻️ Used ${money(m.usedCost)}`, 'deptEquip.buy', { arg: a(`${cid}:${mid}:used`), variant: 'tiny', disabled: m.usedCost > pool, hint: 'Already partway through its life' }) : '',
          m.lease && can.lease ? button(`📝 Lease ${money(leaseCost)}/yr`, 'deptEquip.buy', { arg: a(`${cid}:${mid}:lease`), variant: 'tiny', disabled: leaseCost > pool, hint: 'Paid every year; returned at end of life' }) : '',
          can.fundraise && (!m.usedCost || m.cost >= 100000) ? button(grantSchemeOf(state, c) ? '📄 Apply for a grant' : `📄 Ask ${esc(c.parent?.name ?? 'the parent service')}`, 'deptEquip.grant', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: Boolean(y[`equip.grant.${ref}`]) || d.budget < m.cost * 0.1, hint: `${esc(grantSchemeOf(state, c) ?? 'Capital request')} · 10% local match: ${money(m.cost * 0.1)} · one round a year` }) : '',
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
        const gap = Math.ceil(needed - countOf(cat, units));
        if (gap > 1) buttons += button(`➕ Add ${gap} to standard`, 'deptEquip.bulk', { arg: a(`${cid}:${bulkId}:short`), variant: 'tiny', hint: money(gap * bulkM.cost) });
      }
      if (cat.facility && can.build) {
        const owned = units.filter((u) => !cat.models[u.model]?.rent && !u.renovating).sort((p, q) => q.age - p.age)[0];
        const lease = units.filter((u) => cat.models[u.model]?.rent && !u.owned).sort((p, q) => (q.rent ?? 0) - (p.rent ?? 0))[0];
        if (owned) buttons += button(`🔨 Renovate the oldest (${money(renovationCost(cat.models[owned.model]))})`, 'deptEquip.renovate', { arg: a(cid), variant: 'tiny', disabled: Boolean(d.bond) || Boolean(y[`equip.bond.${ref}`]), hint: `${owned.age} years old · a year of disruption, decades more life` });
        if (lease) {
          buttons += button('🤝 Renegotiate the lease', 'deptEquip.renegotiate', { arg: a(cid), variant: 'tiny', disabled: Boolean(y[`equip.renegotiate.${ref}`]), hint: `${money(lease.rent ?? cat.models[lease.model].rent)}/yr · ${lease.termLeft ?? '?'} yr left on the term` });
          buttons += button(`🏠 Buy the building (${money(buyoutCost(lease, cat.models[lease.model]))})`, 'deptEquip.buyout', { arg: a(cid), variant: 'tiny', disabled: buyoutCost(lease, cat.models[lease.model]) > pool, hint: 'No more rent' });
        }
      }
      if (units.some((u) => !u.leased)) buttons += button(cat.facility ? '🚪 Close / end a lease' : isIssued(c) ? '📦 Turn in the oldest' : '🏷️ Retire & sell the oldest', 'deptEquip.retire', { arg: a(cid), variant: 'tiny' });
    } else if (c.requester && c.hq) {
      const [mid, m] = Object.entries(cat.models).find(([, x]) => !x.build && !x.rent) ?? [];
      buttons = m ? button(`📨 Ask ${esc(c.hq)} for: ${esc(m.name)}`, 'deptEquip.requisition', { arg: a(`${cid}:${mid}`), variant: 'tiny', disabled: Boolean(y[`equip.requisition.${ref}`]), hint: 'One bid a year · arrives next year if approved' }) : '';
    } else if (c.requester && !can.requisition) {
      buttons = button('📋 Request a replacement', 'deptEquip.request', { arg: a(cid), variant: 'tiny', disabled: Boolean(y[`equip.request.${ref}`]) });
    }
    const have = countOf(cat, units);
    const tone = have < needed || worn > needed / 3 ? 'warn' : 'good';
    return disclosure(`equip.${ref}.${cid}`, `${cat.icon} ${esc(cat.name)}`, `${special ? `<p class="fine">🎯 Used for: ${esc(special.use)}${special.served || special.missed ? ` · specialist calls: ${special.served} handled${special.missed ? `, <span class="neg">${special.missed} waited on mutual aid</span>` : ''}` : ''}</p>` : ''}<p class="fine">${mix || 'None'}${units.length ? ` · average age ${avg} yr` : ''}${worn ? ` · <span class="neg">${worn} past service life</span>` : ''}${incoming ? ` · ${incoming} being fielded` : ''}${leases ? ` · ${leases}` : ''}${renovating ? ' · 🔨 under renovation' : ''}</p>${buttons ? `<div class="toggle-row">${buttons}</div>` : ''}`, { count: `${Math.round(have * 10) / 10}/${needed}${worn ? ` · ${worn} worn` : ''}`, tone });
  }).join('');
  const q = fleetQuality(state, c);
  const staff = c.staff ? `<p class="fine">👥 ${c.staff.total.toLocaleString()} staff${c.staff.label ? `: ${c.staff.operational.toLocaleString()} ${esc(c.staff.label.toLowerCase())} · ${c.staff.civilian.toLocaleString()} ${esc(c.staff.other.split(' (')[0].toLowerCase())}` : ''}. The standard fleet follows headcount.</p>` : '';
  const chips = c.manager || c.kind === 'volunteer'
    ? `<p>${c.kind === 'job' && (c.span ?? 1) < 1 ? chip(`🧭 Your command: ~${Math.round((c.span ?? 1) * 100)}% of the department's fleet`) : ''} ${chip(`💰 ${money(c.money === 'cash' ? pool : d.budget)} ${MONEY_LABEL[c.money]}`)} ${d.reserve ? chip(`🏦 ${money(d.reserve)} reserve`) : ''} ${d.bond ? chip('🏗️ Building under construction', 'good') : ''}</p>`
    : '';
  const actions = [
    c.manager && can.buy ? button(d.auto ? '🤖 Staff manage equipment: ON' : '🤖 Let staff manage equipment', 'deptEquip.autoManage', { arg: a(''), variant: d.auto ? 'small on' : 'small', hint: 'Each year they replace what\'s worn and fill shortfalls within the money available' }) : '',
    c.manager && can.buy ? button('🔁 Replace everything worn', 'deptEquip.replaceAll', { arg: a(''), variant: 'small', hint: 'Every category at once, as far as the money goes' }) : '',
    c.manager && can.bank ? button('🏦 Bank unspent money for a big purchase', 'deptEquip.bank', { arg: a(''), variant: 'small', disabled: !d.budget || Boolean(y[`equip.bank.${ref}`]), hint: 'Otherwise it goes back at year-end' }) : '',
    c.kind === 'job' && c.manager ? (() => { const e = expansionCase(state, c); return button(`📈 Propose expanding the department${(c.growth ?? 1) > 1 ? ` (now ${Math.round((c.growth ?? 1) * 100)}% of standard size)` : ''}`, 'deptEquip.expand', { arg: a(''), variant: 'small', disabled: !e.ok, hint: e.ok ? `≈${Math.round(e.odds * 100)}% leadership says yes · bigger fleet, budget and staff` : e.reason }); })() : '',
    c.fleetHead && c.manager ? Object.entries(FLEET_POLICIES).map(([id, p]) => button(p.label, 'deptEquip.fleetPolicy', { arg: a(id), variant: (c.fleetHead.fleetPolicy ?? 'schedule') === id ? 'small on' : 'small', hint: `Headquarters fleet policy for every station: ${p.hint}` })).join('') : '',
    can.fundraise ? button('🥞 Run a fund drive', 'deptEquip.fundraise', { arg: a(''), variant: 'small', disabled: Boolean(y[`equip.fund.${ref}`]), hint: 'Pancake breakfasts, boot drives, raffles' }) : '',
  ].join('');
  return card(`${title(c)} ${g.name}`, `${meter(r, { max: 100, label: c.kind === 'military' ? 'Equipment readiness' : 'Readiness', suffix: '%', tone: r >= 75 ? 'good' : r >= 55 ? 'mid' : 'bad' })}
    ${staff}${c.kind === 'volunteer' && c.org ? `<p class="fine">${c.parent ? `🏛️ Part of ${esc(c.parent.name)} · ` : ''}Standard for ${Object.keys(c.org.people ?? {}).length + 1} members and ${c.org.district?.stations ?? 1} station${(c.org.district?.stations ?? 1) > 1 ? 's' : ''}.</p>` : ''}<p>${chip(`⭐ Fleet quality: ${qualityLabel(q)}`, q >= 1.04 ? 'good' : q < 0.95 ? 'warn' : '')}${(() => { const u = c.kind === 'military' || isIssued(c) ? 0 : upkeepDelta(c, d); return Math.abs(u) >= 1000 ? ` ${chip(u < 0 ? `⛽ Running costs ${money(-u)}/yr below standard` : `⛽ Running costs ${money(u)}/yr above standard`, u < 0 ? 'good' : 'warn')}` : ''; })()} ${c.kind === 'job' ? chip(`🦺 Injury risk ×${gearSafety(state).toFixed(2)}`, gearSafety(state) > 1.05 ? 'warn' : 'good') : ''}</p>
    ${chips}${actions ? `<div class="action-grid">${actions}</div>` : ''}
    ${rows}
    <p class="fine">${footer(state, c)}</p>`, { icon: '🛠️' });
}
