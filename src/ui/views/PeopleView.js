/**
 * People tab: family, partner, children, friends and exes, dating, and the
 * Legacy card (will, life insurance, 529 plans, estate estimate, lineage).
 */
import { esc, money, button, card, meter, kv, empty } from '../Components.js';
import {
  living, people, ageOf, partnerOf, spouseOf, livingChildren, RELATION_LABEL, fullName, spouseIncome, estateBalance, estateTax, heirShares, WILL_PLANS, WEDDINGS, ARREARS_HOLD,
} from '../../modules/people/index.js';
import { CIRCLES } from '../../modules/people/Friends.js';
import { TRUSTS, TRUST_COSTS, exclusionFor, giftRecipients } from '../../modules/people/EstatePlanning.js';
import { probateAssets, designatedPayees, PROBATE_RATE } from '../../modules/people/Legacy.js';

/** Trusts, beneficiaries and lifetime gifts. */
function planSection(state) {
  const plan = state.people.plan;
  if (!plan) return '';
  const probate = Math.round(probateAssets(state) * PROBATE_RATE);
  const trusts = Object.entries(TRUSTS).map(([id, t]) => button(`${t.icon} ${t.label}`, 'estate.trust', { arg: id, variant: plan[id] ? 'small on' : 'small', hint: plan[id] ? (id === 'ilit' ? 'In place (irrevocable)' : 'In place · tap to dissolve') : `${money(TRUST_COSTS[id])} · ${t.desc}` })).join('');
  const kids = livingChildren(state);
  const options = [['none', 'Nobody (my estate)'], ...(kids.length > 1 ? [['children', 'My children equally']] : []), ...living(state).filter((p) => ['spouse', 'child', 'ex', 'sibling', 'mother', 'father'].includes(p.relation)).map((p) => [p.id, `${fullName(p)} (${RELATION_LABEL[p.relation]})`])];
  const current = plan.beneficiary ?? 'none';
  const payees = designatedPayees(state);
  const exTrap = payees.some((p) => /ex-spouse/.test(p.label));
  const ex = exclusionFor(state);
  const gifts = giftRecipients(state).map((p) => {
    const given = plan.giftedThisYear[p.id] ?? 0;
    return `<li class="fund-row"><span>🎁 ${esc(p.firstName)} <small>${RELATION_LABEL[p.relation]} · given ${money(plan.gifts[p.id] ?? 0)} so far${given ? ` · ${money(given)} this year` : ''}</small></span>
      ${[5000, ex, 50000].map((a) => button(`+${money(a)}`, 'estate.gift', { arg: `${p.id}:${a}`, variant: 'tiny', disabled: state.finances.cash < a })).join('')}</li>`;
  }).join('');
  return `<h4 class="sub">Estate plan</h4>
    ${kv([
      ['Probate if you died today', probate ? `<span class="neg">≈${money(probate)}</span> in court and attorney fees` : 'None — your trust holds everything'],
      ['401(k) & IRA beneficiary', `${payees.length ? payees.map((p) => esc(p.label)).join(', ') : 'Your estate (probate, faster forced withdrawals)'}${exTrap ? ' <span class="neg">— your ex still collects the 401(k)</span>' : ''}`],
      plan.exemptionUsed ? ['Lifetime exemption used', money(plan.exemptionUsed)] : null,
    ])}
    <div class="toggle-row">${trusts}</div>
    <h4 class="sub">Retirement-account beneficiary</h4>
    <div class="toggle-row chips-row">${options.map(([id, label]) => button(esc(label), 'estate.beneficiary', { arg: id, variant: current === id ? 'tiny on' : 'tiny' })).join('')}</div>
    ${gifts ? `<h4 class="sub">Lifetime gifts (${money(ex)} per person per year is tax-free)</h4><ul class="history">${gifts}</ul>` : ''}`;
}
import { careCases, careBill, arrangementOptions, hasAuthority, ARRANGEMENTS, POA_COST, GUARDIANSHIP_COST } from '../../modules/people/ElderCare.js';

const ICON = { mother: '👩', father: '👨', sibling: '🧑', partner: '💘', fiance: '💍', spouse: '💑', ex: '💔', child: '🧒', friend: '🤝' };
const CUSTODY = { you: 'Lives with you', joint: 'Joint custody', ex: 'Lives with your ex' };

function personRow(state, p) {
  const age = ageOf(state, p);
  const facts = [
    `${RELATION_LABEL[p.relation] ?? p.relation}`,
    p.alive ? `age ${age}` : `died at ${p.diedAge}`,
    p.alive && p.job ? p.job : null,
    p.alive && p.relation === 'spouse' && p.income ? `${money(p.income)}/yr` : null,
    p.nationality && p.nationality !== 'US' ? `from ${p.nationality}` : null,
    p.alive && p.away ? 'moved away' : null,
    p.owes ? `owes you ${money(p.owes.amount)}` : null,
    p.relation === 'child' && age < 18 && p.custody ? CUSTODY[p.custody] : null,
    p.relation === 'child' && p.degree ? `college grad` : null,
  ].filter(Boolean).join(' · ');
  const actions = !p.alive ? '' : [
    button('🫶 Time', 'people.spendTime', { arg: p.id, variant: 'tiny', disabled: Boolean(state.yearly[`people.time.${p.id}`]) }),
    button('🎁 Gift', 'people.gift', { arg: p.id, variant: 'tiny', disabled: Boolean(state.yearly[`people.gift.${p.id}`]) }),
    ['mother', 'father'].includes(p.relation) && state.character.age >= 16 ? button('💵 Ask for help', 'people.askForMoney', { arg: p.id, variant: 'tiny', disabled: Boolean(state.yearly['people.ask']) }) : '',
    p.relation === 'partner' ? button('💍 Propose', 'people.propose', { arg: p.id, variant: 'tiny' }) : '',
    ['partner', 'fiance'].includes(p.relation) ? button('💔 Break up', 'people.breakUp', { arg: p.id, variant: 'tiny danger' }) : '',
    button('😤 Argue', 'people.argue', { arg: p.id, variant: 'tiny ghost' }),
  ].join('');
  return `<li class="person-row ${p.alive ? '' : 'gone'}">
    <span class="person-icon" aria-hidden="true">${p.alive ? ICON[p.relation] ?? '🙂' : '🕯️'}</span>
    <div class="person-info"><b>${esc(fullName(p))}</b><small>${esc(facts)}</small></div>
    ${p.alive ? meter(p.relationship, { label: 'Relationship', suffix: '' }) : '<span></span>'}
    <div class="person-actions">${actions}</div>
  </li>`;
}

function group(title, icon, list, state, note = '') {
  if (!list.length && !note) return '';
  return card(title, `${note}${list.length ? `<ul class="people">${list.map((p) => personRow(state, p)).join('')}</ul>` : ''}`, { icon });
}

/** Friends grouped by where you met them. */
function friendsCard(state, friends) {
  const groups = Object.entries(CIRCLES).map(([id, c]) => {
    const list = friends.filter((f) => (f.circle ?? 'neighborhood') === id);
    return list.length ? `<h4 class="sub">${c.icon} ${esc(c.label)}</h4><ul class="people">${list.map((p) => personRow(state, p)).join('')}</ul>` : '';
  }).join('');
  const close = friends.filter((f) => f.relationship >= 50).length;
  const note = state.character.age >= 25 && !close ? '<p class="why">No close friends — loneliness takes a toll on happiness and health.</p>' : '';
  return card('Friends', `${note}<div class="toggle-row">${button('🤝 Make a new friend', 'people.makeFriend', { variant: 'small', disabled: Boolean(state.yearly['people.friend']) })}</div>${groups}
    <p class="fine">Spending time with a friend who moved away means a trip (≈$400) or a video call.</p>`, { icon: '🤝' });
}

/** Aging parents: care arrangements, who pays, and legal authority. */
function elderCareCard(state) {
  const parents = living(state).filter((p) => ['mother', 'father'].includes(p.relation) && ageOf(state, p) >= 60);
  if (!parents.length || state.character.age < 18 || !state.elderCare) return '';
  const cases = careCases(state);
  const rows = parents.map((p) => {
    const c = cases.find((x) => x.personId === p.id);
    const authority = state.elderCare.poa.includes(p.id) ? '📜 POA on file' : state.elderCare.guardianship.includes(p.id) ? '⚖️ You are guardian' : '';
    const legal = hasAuthority(state, p.id) ? '' : c?.dementia
      ? button('⚖️ Petition for guardianship', 'elderCare.guardianship', { arg: p.id, variant: 'tiny', hint: money(GUARDIANSHIP_COST) })
      : button('📜 Power of attorney', 'elderCare.poa', { arg: p.id, variant: 'tiny', hint: `${money(POA_COST)} · while they can still sign` });
    if (!c) return `<li><b>${esc(p.firstName)}</b> (${ageOf(state, p)}) — living independently. ${authority} ${legal}</li>`;
    const bill = c.arrangement ? careBill(state, c) : null;
    const opts = arrangementOptions(state, c.level).map((id) => button(`${ARRANGEMENTS[id].icon} ${ARRANGEMENTS[id].label}`, 'elderCare.arrange', { arg: `${p.id}:${id}`, variant: c.arrangement === id ? 'tiny on' : 'tiny', disabled: Boolean(state.yearly[`elderCare.arrange.${p.id}`]) })).join('');
    return `<li><b>${esc(p.firstName)}</b> (${ageOf(state, p)}) — ${c.level === 'full' ? (c.dementia ? 'dementia, full-time care' : 'full-time care') : 'needs help with daily life'}
      ${bill ? `<small>· ${money(bill.total)}/yr: they pay ${money(bill.parentPays)}${bill.medicaid ? `, Medicaid ${money(bill.medicaid)}` : ''}, you pay ${money(bill.you)}</small>` : ''} ${authority}
      <div class="toggle-row">${opts}${legal}</div></li>`;
  }).join('');
  const hands = cases.some((c) => ['self', 'moveIn'].includes(c.arrangement));
  return card('Aging Parents', `<ul class="history">${rows}</ul>
    ${state.people.parentAssets != null ? `<p class="fine">Your parents' savings: ${money(state.people.parentAssets)} — care is paid from it before you, and what's left is your inheritance.</p>` : ''}
    ${hands ? `<div class="toggle-row">${button('🌤️ Book respite care', 'elderCare.respite', { variant: 'small', disabled: Boolean(state.yearly['elderCare.respite']), hint: '$3,000 · −15 stress' })}</div>` : ''}
    <p class="fine">Sign a power of attorney while a parent can still sign it — after a dementia diagnosis you need a court guardianship to manage their money or move them.</p>`, { icon: '👵', accent: 'yellow' });
}

function romance(state) {
  const p = state.people;
  const partner = partnerOf(state);
  const age = state.character.age;
  const pref = p.orientation ?? (state.character.gender === 'male' ? 'women' : 'men');
  const prefs = ['men', 'women', 'everyone'].map((o) => button(o === 'men' ? 'Men' : o === 'women' ? 'Women' : 'Everyone', 'people.setOrientation', { arg: o, variant: pref === o ? 'tiny on' : 'tiny' })).join('');
  let body = '';
  if (!partner) {
    body = `<p class="muted">${age < 16 ? 'Dating starts at 16.' : 'You are single.'}</p>
      <div class="toggle-row">${button('💘 Go on some dates', 'people.date', { variant: 'small', disabled: age < 16 || Boolean(state.yearly['people.date']) })}</div>`;
  } else if (partner.relation === 'fiance') {
    body = `<p>💍 Engaged to <b>${esc(partner.firstName)}</b>.</p>
      <div class="toggle-row">${Object.entries(WEDDINGS).map(([id, w]) => button(`${w.icon} ${w.label}`, 'people.wed', { arg: id, variant: 'small', hint: money(w.cost) })).join('')}
      ${button(p.prenup ? '📝 Prenup signed' : '📝 Sign a prenup', 'people.togglePrenup', { variant: p.prenup ? 'small on' : 'small', hint: 'Protects your assets in a divorce' })}</div>`;
  } else if (partner.relation === 'spouse') {
    body = `<p>💑 Married to <b>${esc(partner.firstName)}</b> for ${age - (partner.since ?? age)} years · household income ${money((state.career.job?.salary ?? 0) + spouseIncome(state))}/yr · filing jointly${p.prenup ? ' · prenup' : ''}.</p>
      <div class="toggle-row">${button('💔 File for divorce', 'people.fileForDivorce', { variant: 'small danger', hint: 'Splits marital property; custody and support' })}</div>`;
  } else body = `<p>💘 Dating <b>${esc(partner.firstName)}</b> since age ${partner.since}.</p>`;
  const family = partner && ['spouse', 'fiance', 'partner'].includes(partner.relation)
    ? `<div class="toggle-row">${button(p.expecting ? '🤰 Baby on the way' : '👶 Try for a baby', 'people.tryForBaby', { variant: 'small', disabled: Boolean(p.expecting) || Boolean(state.yearly['people.baby']) })}</div>` : '';
  return card('Love Life', `${body}${family}
    ${age >= 25 ? `<div class="toggle-row">${button('🏠 Adopt a child', 'people.adopt', { variant: 'small', disabled: Boolean(p.expecting), hint: '$25,000 · 25+' })}</div>` : ''}
    <h4 class="sub">Interested in</h4><div class="toggle-row chips-row">${prefs}</div>`, { icon: '💘', accent: 'pink' });
}

function legacyCard(state) {
  const p = state.people;
  if (state.character.age < 18) return '';
  const { assets, debts } = estateBalance(state);
  const net = Math.max(0, assets - debts);
  const tax = estateTax(state, net);
  const shares = heirShares(state);
  const kids = livingChildren(state);
  const li = p.lifeInsurance;
  const spouse = spouseOf(state);
  const policy = (who, pol) => (pol ? `${money(pol.benefit)} (premium ${money(pol.premium)}/yr, until you're ${pol.endsAge})` : 'None');
  const amounts = [250000, 500000, 1000000];
  const fundRows = kids.map((k) => `<li class="fund-row"><span>🎓 ${esc(k.firstName)}'s 529 · <b>${money(p.fund529[k.id] ?? 0)}</b></span>
      ${[1000, 5000].map((a) => button(`+${money(a)}`, 'people.contribute529', { arg: `${k.id}:${a}`, variant: 'tiny', disabled: state.finances.cash < a })).join('')}</li>`).join('');
  return card('Legacy', `
    ${kv([
      ['Estate today', `${money(net)} net (${money(assets)} assets, ${money(debts)} debts)`],
      ['Estate tax if you died today', tax.total ? money(tax.total) : 'None (under the exemption)'],
      ['Will', p.will ? WILL_PLANS[p.will.plan].label : '<span class="neg">None — state intestacy law decides</span>'],
      ['Would go to', shares.map((s) => `${esc(s.label)} ${Math.round(s.share * 100)}%`).join(', ')],
      ['Life insurance on you', policy('self', li.self)],
      spouse ? ['Life insurance on your spouse', policy('spouse', li.spouse)] : null,
      p.arrears ? ['Child-support arrears', `<span class="neg">${money(p.arrears)}</span>${p.arrears >= ARREARS_HOLD ? ' · licenses suspended' : ''}`] : null,
      p.alimony ? ['Alimony', `${money(p.alimony.annual)}/yr ${p.alimony.pay ? 'paid' : 'received'} until ${p.alimony.untilAge}`] : null,
    ])}
    <h4 class="sub">Will</h4><div class="toggle-row">${Object.entries(WILL_PLANS).map(([id, w]) => button(`${w.icon} ${w.label}`, 'people.writeWill', { arg: id, variant: p.will?.plan === id ? 'small on' : 'small', hint: p.will ? '$300 to update' : '$1,500 attorney' })).join('')}</div>
    <h4 class="sub">Term life insurance</h4><div class="toggle-row">
      ${amounts.map((a) => button(`🛡️ ${money(a)} on you`, 'people.lifeInsurance', { arg: `self:${a}`, variant: li.self?.benefit === a ? 'small on' : 'small' })).join('')}
      ${spouse ? amounts.slice(0, 2).map((a) => button(`🛡️ ${money(a)} on ${esc(spouse.firstName)}`, 'people.lifeInsurance', { arg: `spouse:${a}`, variant: li.spouse?.benefit === a ? 'small on' : 'small' })).join('') : ''}
      ${li.self ? button('Cancel your policy', 'people.lifeInsurance', { arg: 'self:0', variant: 'small ghost' }) : ''}
    </div>
    ${planSection(state)}
    ${fundRows ? `<h4 class="sub">College savings</h4><ul class="history">${fundRows}</ul>` : ''}
    ${p.arrears ? `<div class="toggle-row">${button('⚖️ Pay support arrears', 'people.payArrears', { variant: 'small', disabled: state.finances.cash <= 0 })}</div>` : ''}
    <p class="fine">Estates pay the funeral, then debts, then probate, then estate tax (federal over ${money(13990000)}; NY, IL, WA and D.C. have their own), then heirs. Life insurance goes straight to your beneficiaries. When you die, you can continue the story as one of your children.</p>`, { icon: '📜', accent: 'yellow' });
}

function lineage(state) {
  const l = state.lineage;
  if (!l?.ancestors?.length) return '';
  return card(`Family Line · Generation ${l.generation}`, `<ul class="history">${l.ancestors.map((a) => `<li>🕯️ <b>${esc(a.name)}</b> <small>${a.born}–${a.died} · ${esc(a.cause ?? '')} · left ${money(a.netWorth)}</small></li>`).join('')}</ul>`, { icon: '🌳' });
}

export function peopleView(state) {
  if (!state.people) return '';
  const all = people(state);
  const by = (...rel) => all.filter((p) => rel.includes(p.relation) && ageOf(state, p) >= 0);
  const family = by('mother', 'father', 'sibling');
  const kids = by('child');
  return `${romance(state)}
    ${group('Partner', '💑', by('partner', 'fiance', 'spouse').filter((p) => p.alive), state)}
    ${group('Children', '🧒', kids, state, kids.length ? '' : '')}
    ${group('Family', '🏡', family, state)}
    ${elderCareCard(state)}
    ${friendsCard(state, by('friend').filter((p) => p.alive))}
    ${group('Exes', '💔', by('ex'), state)}
    ${legacyCard(state)}
    ${lineage(state)}
    ${!living(state).length ? card('People', empty('Everyone you knew is gone.'), { icon: '🕯️' }) : ''}`;
}

/** Tombstone extra: continue as one of your children. */
export function heirChoices(state) {
  const kids = livingChildren(state);
  if (!kids.length) return '';
  const legacy = state.legacy;
  const amountFor = (id) => (legacy ? legacy.bequests.filter((b) => b.to === id).reduce((s, b) => s + b.amount, 0) + legacy.insurance.filter((b) => b.to === id).reduce((s, b) => s + b.amount, 0) : 0);
  return `<div class="heirs"><h3>Continue the family story</h3>
    ${kids.map((k) => button(`▶ Play as ${esc(k.firstName)} (age ${ageOf(state, k)})`, 'engine.continueAs', { arg: k.id, variant: 'primary', hint: `Inherits ${money(amountFor(k.id))}${state.people.fund529[k.id] ? ` + ${money(state.people.fund529[k.id])} 529` : ''}` })).join('')}
  </div>`;
}

