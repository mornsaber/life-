/**
 * ⚖️ Legal → 🗂️ Cases, 🕶️ Crime and 🕴️ Underworld.
 */
import { esc, button, card, chip, kv, meter, disclosure, empty, select } from '../Components.js';
import { RISKY_ACTIONS, CRIME_GROUPS, TASK_FORCE_HEAT, OFFENSES, SEVERITY_LABEL } from '../../modules/legal/index.js';
import { EVIDENCE, stageOf, STAGE_LABEL, caseRef } from '../../modules/crime/Cases.js';
import { docketRole, ROLE_LABEL, resolutions, workActions, workedThisYear } from '../../modules/crime/Docket.js';
import { PRODUCTS, LABS, BUYS, priceHere, canImport, kg } from '../../modules/crime/Drugs.js';
import { JUVENILE_CRIMES } from '../../modules/crime/Gangs.js';
import { corruptionHere, drugLawHere, gunsHere, crimeLevelHere } from '../../modules/crime/CrimeWorld.js';
import { underworldCard } from './UnderworldView.js';
import { meOf } from '../../modules/legal/Underworld.js';
import { partnerOf } from '../../modules/people/People.js';

const pct = (n) => `${Math.round(n * 100)}%`;
const level = (n) => (n >= 0.7 ? 'very high' : n >= 0.5 ? 'high' : n >= 0.3 ? 'moderate' : 'low');

/* ------------------------------------------------------------------ */
/* Cases                                                               */
/* ------------------------------------------------------------------ */

function caseCard(state, inv, ref = inv.id) {
  const o = OFFENSES[inv.offenseId];
  const stage = stageOf(inv);
  const items = (inv.items ?? []).map((i) => `<li>${EVIDENCE[i.kind]?.icon ?? '•'} ${esc(EVIDENCE[i.kind]?.label ?? i.kind)}${i.kind === 'alibi' ? '' : ` <small class="muted">${pct(i.strength)}</small>`}</li>`).join('');
  const destroyable = (inv.items ?? []).some((i) => EVIDENCE[i.kind]?.destroyable);
  const witness = (inv.items ?? []).some((i) => EVIDENCE[i.kind]?.intimidate);
  const done = (what) => Boolean(inv.id && state.yearly[`case.${inv.id}.${what}`]);
  const corrupt = corruptionHere(state) >= 0.3 || state.legal.crime?.cop;
  const actions = [
    button('🗑️ Destroy evidence', 'crime.destroyEvidence', { arg: ref, variant: 'small danger', disabled: !destroyable || done('destroy'), hint: destroyable ? 'Obstruction if you\'re seen' : 'Nothing you can reach' }),
    button('🤝 Ask for an alibi', 'crime.alibi', { arg: ref, variant: 'small', disabled: done('alibi') || Boolean(inv.alibi), hint: inv.alibi ? `${inv.alibi} will vouch for you` : 'Someone close to you' }),
    button('👔 Lawyer up', 'crime.lawyerUp', { arg: ref, variant: 'small', disabled: Boolean(inv.lawyer), hint: inv.lawyer ? 'Retained' : 'A retainer now' }),
    button('🤫 Lean on a witness', 'crime.intimidate', { arg: ref, variant: 'small danger', disabled: !witness || done('intimidate'), hint: 'Witness intimidation is a felony' }),
    corrupt ? button('💰 Make it go away', 'crime.fixCase', { arg: ref, variant: 'small danger', disabled: done('fix'), hint: `Corruption here: ${level(corruptionHere(state))}` }) : '',
    button('🐀 Cooperate', 'crime.cooperate', { arg: ref, variant: 'small', hint: 'Give them someone bigger' }),
  ].join('');
  return `<div class="case-file">
    <h4>${o?.icon ?? '🗂️'} ${esc(o?.name ?? inv.offenseId)} ${chip(SEVERITY_LABEL[o?.severity] ?? '', o?.severity === 'felony' ? 'bad' : 'warn')} ${chip(STAGE_LABEL[stage], stage === 'warrant' ? 'bad' : stage === 'suspect' ? 'warn' : '')}</h4>
    ${kv([['Investigating', esc(inv.agency ?? 'the police')], ['Lead', esc(inv.lead ?? '—')], inv.context ? ['About', esc(inv.context)] : null, ['Statute', inv.yearsLeft >= 50 ? 'No limit' : `${inv.yearsLeft} yr left`]])}
    ${meter(inv.evidence * 100, { label: '⚖️ Evidence', tone: inv.evidence >= 0.75 ? 'bad' : inv.evidence >= 0.5 ? 'mid' : 'good' })}
    ${meter(inv.discovery * 100, { max: 90, label: '🎯 How close they are', tone: stage === 'warrant' ? 'bad' : stage === 'suspect' ? 'mid' : 'good' })}
    <ul class="plain">${items}</ul>
    <div class="action-grid">${actions}</div>
  </div>`;
}

export function casesView(state) {
  const list = state.legal.investigations ?? [];
  const body = list.length
    ? `<p class="muted">What the police have on you — and what you can still do about it. Every counter-move is once a year per case, and most of them are crimes too.</p>${list.map((inv, i) => caseCard(state, inv, caseRef(inv, i))).join('<hr>')}`
    : empty('No open cases. As far as you know.');
  const role = docketRole(state);
  const against = card(role ? 'Cases Against You' : 'Open Cases', body, { icon: '🗂️', accent: list.length ? 'red' : '' });
  // At work in the justice system, your own docket comes first (unless you're the one under investigation).
  const docket = docketCard(state, role);
  return list.length ? `${against}${docket}` : `${docket}${against}`;
}

/* ------------------------------------------------------------------ */
/* Your docket (police, prosecutors, defenders, lawyers, judges)       */
/* ------------------------------------------------------------------ */

const RESULT = { win: ['🏆', 'Won', 'good'], loss: ['😞', 'Lost', 'bad'], settle: ['🤝', 'Plea / settled', ''], lapsed: ['⏳', 'Went cold / lapsed', 'warn'], ruled: ['⚖️', 'Ruled', 'good'], reversed: ['↩️', 'Reversed on appeal', 'bad'] };
const STRENGTH_LABEL = { police: '🧾 Evidence', prosecutor: '⚖️ Strength of your case', defender: '🛡️ Your client\'s position', lawyer: '📂 Your position' };
const ROLE_NOUN = { police: 'investigation', prosecutor: 'prosecution', defender: 'client', lawyer: 'matter', judge: 'case' };

function docketCase(state, c) {
  const left = c.due - state.character.age;
  const work = workActions(c).map((w) => button(w.label, 'crime.docket', { arg: `${c.id}:${w.id}`, variant: 'small', disabled: workedThisYear(state, c, w.id), hint: workedThisYear(state, c, w.id) ? 'Done this year' : w.hint })).join('');
  const resolve = resolutions(c).map((r) => button(r.label, 'crime.docket', { arg: `${c.id}:${r.id}`, variant: 'small', hint: r.hint ?? '' })).join('');
  return `<div class="case-file">
    <h4>${esc(c.title)} ${chip(left <= 0 ? '⏳ Must be resolved this year' : `${left} yr left`, left <= 0 ? 'bad' : left === 1 ? 'warn' : '')} ${c.prep ? chip(`📎 Worked ×${c.prep}`) : ''} ${c.careful ? chip('📖 Briefs read', 'good') : ''}</h4>
    <p>${esc(c.text)}</p>
    ${c.suspect && c.role === 'police' ? `<p class="fine">Suspect: ${esc(c.suspect)}</p>` : ''}
    ${STRENGTH_LABEL[c.role] ? meter(c.strength * 100, { label: STRENGTH_LABEL[c.role], tone: c.strength >= 0.6 ? 'good' : c.strength >= 0.35 ? 'mid' : 'bad' }) : ''}
    <div class="action-grid">${work}${resolve}</div>
  </div>`;
}

function docketCard(state, role) {
  const d = state.docket;
  if (!role && !d?.closed?.length) return '';
  const open = (d?.open ?? []).filter((c) => c.role === role);
  const rec = Object.entries(d?.record ?? {}).filter(([, n]) => n).map(([k, n]) => chip(`${RESULT[k]?.[0] ?? '•'} ${RESULT[k]?.[1] ?? k}: ${n}`, RESULT[k]?.[2] ?? '')).join(' ');
  const seat = role === 'judge' ? state.judiciary.seat : null;
  const lawRec = ['lawyer', 'defender', 'prosecutor'].includes(role) && state.law ? kv([['Reputation', `${Math.round(state.law.reputation ?? 30)}/100`], ['Wins · losses · settled', `${state.law.wins ?? 0} · ${state.law.losses ?? 0} · ${state.law.settled ?? 0}`]]) : '';
  const judgeRec = seat ? kv([['Rulings', seat.rulings], ['Reversed on appeal', seat.reversals], ['Reputation', `${seat.reputation}/100`], ['Public approval', `${seat.approval}%`]]) : '';
  const past = (d?.closed ?? []).slice().reverse().map((x) => `<li>${RESULT[x.result]?.[0] ?? '•'} <b>${esc(x.title)}</b> <small class="muted">age ${x.age}${x.note ? ` · ${esc(x.note)}` : ''}</small></li>`).join('');
  const body = `${role ? `<p class="muted">Your ${ROLE_NOUN[role]}s stay open until you close them. Work each one once a year; resolve it when you're ready — but a case left too long resolves without you.</p>` : '<p class="muted">You no longer carry cases.</p>'}
    ${rec ? `<p>${rec}</p>` : ''}${lawRec}${judgeRec}
    ${open.length ? open.map((c) => docketCase(state, c)).join('<hr>') : role ? empty('Nothing on your desk right now. New cases arrive each year.') : ''}
    ${past ? disclosure('docket.past', `📚 Past cases (${(d.closed ?? []).length})`, `<ul class="plain">${past}</ul>`) : ''}`;
  return card(role ? `Your Docket — ${ROLE_LABEL[role]}` : 'Your Docket', body, { icon: { police: '🚓', prosecutor: '⚖️', defender: '🛡️', lawyer: '💼', judge: '🧑‍⚖️' }[role] ?? '📚', accent: open.some((c) => c.due <= state.character.age) ? 'red' : 'cyan' });
}

/* ------------------------------------------------------------------ */
/* Crime                                                               */
/* ------------------------------------------------------------------ */

function streetCard(state) {
  const c = state.legal.crime;
  if (!c || !(c.heat || c.earned || c.rep || c.guilt)) return '';
  const heat = c.heat ?? 0;
  return card('On the Street', `${meter(heat, { max: 100, label: '🚨 Heat', suffix: '/100', tone: heat >= TASK_FORCE_HEAT ? 'bad' : heat >= 35 ? 'mid' : 'good' })}
    ${meter(c.rep ?? 0, { max: 100, label: '🗣️ Street reputation', suffix: '/100', tone: 'mid' })}
    ${c.guilt ? meter(c.guilt, { max: 100, label: '🌑 Guilt', suffix: '/100', tone: c.guilt >= 50 ? 'bad' : 'mid' }) : ''}
    ${kv([['Criminal earnings', `$${Math.round(c.earned ?? 0).toLocaleString()}`], ['Dirty money (unlaundered)', `$${Math.round(c.dirty ?? 0).toLocaleString()}`], ['Carrying', c.armed ? (c.armed === 'gun' ? '🔫 A gun' : '🔪 A knife') : 'Nothing'], c.cop ? ['On your payroll', esc(c.cop.name)] : null, c.youthGang ? ['Running with', esc(c.youthGang.name)] : null])}
    <p class="fine">Heat makes arrests likelier and old cases surface; above ${TASK_FORCE_HEAT} a task force builds cases. It fades each year — faster if you lay low. Dirty money you can't explain draws the tax authority.</p>
    <div class="action-grid">${button('🙈 Lay low this year', 'legal.layLow', { variant: 'small', disabled: c.layingLow || !heat, hint: 'Heat falls ~70% instead of ~40%' })}${c.guilt ? button('🕯️ Make amends', 'crime.amends', { variant: 'small', disabled: Boolean(state.yearly['crime.amends']) }) : ''}${c.youthGang ? button('🚶 Leave the crew', 'crime.leaveYouthGang', { variant: 'small' }) : ''}${c.straightSince == null ? button('🌅 Go straight', 'crime.goStraight', { variant: 'small', hint: 'Cut your ties; old convictions fade' }) : ''}</div>
    ${c.straightSince != null ? `<p class="pos">🌅 Going straight since age ${c.straightSince}${state.character.age - c.straightSince >= 5 ? ' — reformed: employers weigh your past half as much' : ` (${5 - (state.character.age - c.straightSince)} more clean year${5 - (state.character.age - c.straightSince) === 1 ? '' : 's'} to be seen as reformed)`}.</p>` : ''}`, { icon: '🕶️' });
}

function crimesCard(state) {
  const age = state.character.age;
  const partnered = (state.people?.list ?? []).some((p) => p.alive && ['spouse', 'partner', 'fiance'].includes(p.relation));
  const crimeButton = (r) => {
    const why = r.needs?.(state);
    return button(`${r.icon} ${r.label}`, `legal.${r.id}`, { variant: 'danger', disabled: age < r.minAge || Boolean(state.yearly[`risky.${r.id}`]) || (r.needsPartner && !partnered) || Boolean(why), hint: why ?? (age < r.minAge ? `Age ${r.minAge}+` : r.desc) });
  };
  const youth = age < 18 ? `<h4 class="sub">🧒 Growing up wrong</h4><div class="action-grid">${JUVENILE_CRIMES.map((r) => button(`${r.icon} ${r.label}`, `crime.${r.id}`, { variant: 'danger', disabled: age < r.minAge || Boolean(state.yearly[`risky.${r.id}`]), hint: age < r.minAge ? `Age ${r.minAge}+` : r.desc })).join('')}</div><p class="fine">Under 18 you go to the youth court: diversion for a first offence, juvenile probation, or youth detention. Most of it is sealed at 18.</p>` : '';
  const groups = Object.entries(CRIME_GROUPS).map(([gid, g]) => {
    const list = RISKY_ACTIONS.filter((r) => (r.group ?? 'personal') === gid);
    if (!list.length) return '';
    const body = `<div class="action-grid">${list.map(crimeButton).join('')}</div>`;
    return gid === 'personal' ? `<h4 class="sub">${g.icon} ${g.label}</h4>${body}` : disclosure(`crime.${gid}`, `${g.icon} ${g.label}`, body, { count: list.length });
  }).join('');
  const kidnapHere = ['MX', 'VE', 'BR', 'CO', 'NG', 'ZA', 'PH', 'HT', 'GT', 'PE', 'EC', 'IN', 'PK'].includes(state.character.countryId);
  const armed = state.legal.crime?.armed;
  const violence = disclosure('crime.violence', '🩸 Violence', `<div class="action-grid">
    ${button('🥷 Mug someone', 'crime.mug', { variant: 'danger', disabled: age < 13 || Boolean(state.yearly['risky.mug']), hint: armed ? 'Armed robbery' : 'Robbery' })}
    ${kidnapHere ? button('🚐 Express kidnapping', 'crime.kidnap', { variant: 'danger', disabled: age < 18 || !armed || Boolean(state.yearly['risky.kidnap']), hint: armed ? 'ATM to ATM until the accounts are empty' : 'You would need a weapon' }) : ''}
    ${button('🔪 Carry a knife', 'crime.arm', { arg: 'knife', variant: 'small', disabled: age < 14 || armed === 'knife' })}
    ${button('🔫 Buy a gun', 'crime.arm', { arg: 'gun', variant: 'small danger', disabled: age < 14 || armed === 'gun', hint: `Guns here: ${{ easy: 'easy to get', market: 'a black market', hard: 'very hard to get' }[gunsHere(state)]}` })}
    ${armed ? button('🗑️ Get rid of it', 'crime.arm', { arg: 'none', variant: 'small' }) : ''}
  </div>${(() => {
    const partner = partnerOf(state);
    const abuse = state.legal.crime?.abuse;
    if (!partner && !abuse?.incidents) return '';
    return `<h4 class="sub">🥀 At home</h4><div class="action-grid">
      ${partner ? button(`📱 Control ${esc(partner.firstName)}`, 'crime.abusePartner', { arg: 'control', variant: 'danger', disabled: age < 16 || Boolean(state.yearly['risky.abuse.control']), hint: 'Their phone, their friends, their money' }) : ''}
      ${partner ? button(`✋ Hit ${esc(partner.firstName)}`, 'crime.abusePartner', { arg: 'assault', variant: 'danger', disabled: age < 16 || Boolean(state.yearly['risky.abuse.assault']), hint: 'Domestic assault' }) : ''}
      ${abuse?.incidents ? button('🪑 Join a perpetrator programme', 'crime.abuseProgramme', { variant: 'small', disabled: Boolean(state.yearly['crime.abuseProgramme']), hint: 'Accountability, and a way to stop' }) : ''}
    </div><p class="fine">Abuse escalates, and it never pays: partners leave and report, children carry it, and courts issue protective orders.${abuse?.incidents ? ` Incidents with ${esc(partner?.firstName ?? 'your partner')}: ${abuse.incidents}.` : ''}</p>`;
  })()}<p class="fine">Carrying a weapon changes every confrontation: some people back down, some get hurt, and some die. Killing is never a choice on this screen — it is what happens when a choice goes wrong.</p>`);
  return card('Crime', `<p class="muted">Every one of these can follow you: records, suspended licences, denied clearances, people you hurt. Streets here: ${level(crimeLevelHere(state))} crime, ${level(corruptionHere(state))} corruption.</p>${youth}${groups}${violence}`, { icon: '😈', accent: 'red' });
}

function drugsCard(state) {
  if (state.character.age < 14) return '';
  const d = state.legal.crime?.drugs;
  const law = drugLawHere(state);
  const products = Object.entries(PRODUCTS).map(([id, p]) => ({ value: id, label: `${p.icon} ${p.label} — $${priceHere(state, id).toLocaleString()}/kg wholesale, $${priceHere(state, id, 'retail').toLocaleString()} street` }));
  const sizes = Object.entries(BUYS).map(([id, b]) => ({ value: id, label: `${b.label}${b.rep ? ` (rep ${b.rep}+)` : ''}` }));
  const has = d && d.stash > 0.05;
  const status = d && (has || d.lab || d.runners || d.shipment) ? kv([
    ['Stash', has ? `${kg(d.stash)} kg ${PRODUCTS[d.product].label.toLowerCase()} · ${Math.round(d.purity * 100)}% pure${d.laced ? ' · ☠️ laced with fentanyl' : ''}` : 'Empty'],
    d.lab ? ['Production', `${LABS[d.lab].icon} ${LABS[d.lab].label}`] : null,
    ['Runners', d.runners || 'None'],
    ['Territory', `${Math.round(d.territory)}% of the local market`],
    d.shipment ? ['Shipment', `🚢 ${d.shipment.weight} kg ${PRODUCTS[d.shipment.product].label.toLowerCase()} on the water`] : null,
    ['Lifetime sales', `$${Math.round(d.sold).toLocaleString()}`],
  ]) : '<p class="muted">You\'re not in the trade.</p>';
  const y = (k) => Boolean(state.yearly[k]);
  const source = `<h4 class="sub">1 · Source</h4><div class="toggle-row" data-collect-root>${select('product', products)}${select('size', sizes)}${button('🤝 Buy from a connect', 'crime.drugBuy', { variant: 'small danger', collect: true })}</div>
    <div class="action-grid">${Object.entries(LABS).map(([id, l]) => button(`${l.icon} ${l.label}`, 'crime.drugLab', { arg: id, variant: 'small danger', disabled: Boolean(d?.lab) || state.character.age < 18, hint: `${PRODUCTS[l.product].label}, $${l.cost.toLocaleString()}` })).join('')}${d?.lab ? button('🧽 Shut the lab', 'crime.closeLab', { variant: 'small' }) : ''}
    ${Object.keys(PRODUCTS).filter((id) => id !== 'cannabis').map((id) => button(`🚢 Import ${PRODUCTS[id].label.toLowerCase()}`, 'crime.drugImport', { arg: id, variant: 'small danger', disabled: !canImport(state) || Boolean(d?.shipment), hint: canImport(state) ? '100 kg in a container' : 'Needs an outfit or 60+ rep' })).join('')}</div>`;
  const process = `<h4 class="sub">2 · Process</h4><div class="action-grid">${button('⚖️ Cut it', 'crime.drugCut', { arg: 'cut', variant: 'small danger', disabled: !has || y('drug.cut'), hint: '+50% weight, lower purity' })}${button('☠️ Stretch it with fentanyl', 'crime.drugCut', { arg: 'fentanyl', variant: 'small danger', disabled: !has || y('drug.cut') || !['heroin', 'cocaine'].includes(d?.product), hint: 'Double the weight. People will die.' })}</div>`;
  const runnerOpts = [1, 2, 4, 6, 10].map((n) => button(`🧢 ${n} runner${n === 1 ? '' : 's'}`, 'crime.drugRunners', { arg: n, variant: 'tiny', disabled: y('drug.runners') || d?.runners === n })).join('');
  const distribute = `<h4 class="sub">3 · Distribute</h4><div class="action-grid">${button('✋ Sell hand to hand', 'crime.drugSell', { arg: 'street', variant: 'small danger', disabled: !has || y('drug.sell.street'), hint: 'Retail money, retail risk' })}${button('📦 Sell weight to dealers', 'crime.drugSell', { arg: 'weight', variant: 'small danger', disabled: !has || y('drug.sell.weight'), hint: 'Less money, less risk, more informants' })}</div>
    <div class="action-grid">${runnerOpts}${d?.runners ? button('Pull them off', 'crime.drugRunners', { arg: 0, variant: 'tiny' }) : ''}</div>
    ${d && (has || d.lab || d.runners) ? `<div class="action-grid">${button('🚽 Get out of the trade', 'crime.drugQuit', { variant: 'small' })}</div>` : ''}`;
  return card('The Drug Trade', `${status}${disclosure('crime.drugs.chain', '🔗 The supply chain', `${source}${process}${distribute}`, { open: Boolean(has) })}
    <p class="fine">${law.note ? `${esc(law.note)} ` : ''}Caught with up to a kilo: possession with intent; up to ten: distribution; more: trafficking${law.death ? ' — a capital crime here' : ''}. Runners sell all year and some of them talk. Every customer who overdoses was someone's child.</p>`, { icon: '💊', accent: 'red' });
}

function corruptionCard(state) {
  const c = state.legal.crime;
  if (!c || !(c.heat || c.drugs?.stash || c.cop)) return '';
  const corrupt = corruptionHere(state);
  return card('Friends in Uniform', `<p class="muted">Corruption here is ${level(corrupt)}: ${corrupt >= 0.5 ? 'police and court clerks are routinely paid off.' : corrupt >= 0.3 ? 'some officers can be bought — and some are watching for people who try.' : 'trying to bribe an officer is the fastest way to a second charge.'}</p>
    ${c.cop ? kv([['On the payroll', esc(c.cop.name)], ['Retainer', `$${c.cop.fee.toLocaleString()}/yr`]]) : ''}
    <div class="action-grid">${c.cop ? button('✂️ Stop paying', 'crime.dropCop', { variant: 'small' }) : button('🚔 Put a detective on the payroll', 'crime.payrollCop', { variant: 'small danger', disabled: Boolean(state.yearly['crime.payroll']), hint: 'Warnings before raids; slower cases' })}</div>`, { icon: '💵' });
}

export function crimeView(state) {
  return `${streetCard(state)}${crimesCard(state)}${drugsCard(state)}${corruptionCard(state)}`;
}

export function underworldView(state) {
  const card0 = underworldCard(state);
  return card0 || card('The Underworld', empty(meOf(state) ? '' : 'No outfit knows your name yet. Build a reputation on the street first.'), { icon: '🕴️' });
}
