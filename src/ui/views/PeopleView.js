/**
 * People tab: family, partner, children, friends and exes, dating, and the
 * Legacy card (will, life insurance, 529 plans, estate estimate, lineage).
 */
import { esc, money, button, card, meter, kv, empty } from '../Components.js';
import {
  living, people, ageOf, partnerOf, spouseOf, livingChildren, RELATION_LABEL, fullName, spouseIncome, estateBalance, estateTax, heirShares, WILL_PLANS, WEDDINGS, ARREARS_HOLD,
} from '../../modules/people/index.js';
import { CIRCLES } from '../../modules/people/Friends.js';
import { EDU_LABEL, homeLabel, canHouse, vacancies } from '../../modules/people/NpcLives.js';
import { TRUSTS, TRUST_COSTS, exclusionFor, giftRecipients } from '../../modules/people/EstatePlanning.js';
import { probateAssets, designatedPayees, PROBATE_RATE, plannedSuccession } from '../../modules/people/Legacy.js';
import {
  NURTURE, readiness, readinessLabel, successorOf, ownsBusiness, allBusinesses, ordinal, READY, SUCCESSION_COST, SUCCESSION_CHANGE_COST, SUCCESSION_DISCOUNT,
} from '../../modules/people/Dynasty.js';

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
    p.relation === 'child' && p.kids?.length ? `${p.kids.length} grandchild${p.kids.length > 1 ? 'ren' : ''}` : null,
    p.relation === 'child' && successorOf(state)?.id === p.id ? '📋 your successor' : null,
  ].filter(Boolean).join(' · ');
  const traits = p.alive && p.relation === 'child' && p.traits ? childTraits(state, p) : '';
  const life = p.alive && p.life && age >= 5 ? lifeLine(p, age) : '';
  const actions = !p.alive ? '' : [
    button('🫶 Time', 'people.spendTime', { arg: p.id, variant: 'tiny', disabled: Boolean(state.yearly[`people.time.${p.id}`]) }),
    button('🎁 Gift', 'people.gift', { arg: p.id, variant: 'tiny', disabled: Boolean(state.yearly[`people.gift.${p.id}`]) }),
    ['mother', 'father'].includes(p.relation) && state.character.age >= 16 ? button('💵 Ask for help', 'people.askForMoney', { arg: p.id, variant: 'tiny', disabled: Boolean(state.yearly['people.ask']) }) : '',
    p.relation === 'partner' ? button('💍 Propose', 'people.propose', { arg: p.id, variant: 'tiny' }) : '',
    ['partner', 'fiance'].includes(p.relation) ? button('💔 Break up', 'people.breakUp', { arg: p.id, variant: 'tiny danger' }) : '',
    p.relation === 'child' ? nurtureButtons(state, p, age) : '',
    helpButtons(state, p, age),
    button('😤 Argue', 'people.argue', { arg: p.id, variant: 'tiny ghost' }),
  ].join('');
  return `<li class="person-row ${p.alive ? '' : 'gone'}">
    <span class="person-icon" aria-hidden="true">${p.alive ? ICON[p.relation] ?? '🙂' : '🕯️'}</span>
    <div class="person-info"><b>${esc(fullName(p))}</b><small>${esc(facts)}</small>${life}${traits}</div>
    ${p.alive ? meter(p.relationship, { label: 'Relationship', suffix: '' }) : '<span></span>'}
    <div class="person-actions">${actions}</div>
  </li>`;
}

/** School, work, home and money for someone in your life. */
function lifeLine(p, age) {
  const l = p.life;
  const school = l.studying ? `studying for a ${EDU_LABEL[l.studying.degree].toLowerCase()} (done at ${l.studying.until})` : age < 18 ? (age < 14 ? 'in school' : 'in high school') : EDU_LABEL[l.edu];
  const work = p.job ? `${l.employer ? `at ${l.employer}` : ''}${p.income ? ` · ${money(p.income)}/yr` : ''}` : age >= 18 && !l.studying && !p.retired && age < 65 ? 'looking for work' : p.retired ? 'retired' : '';
  const bits = [`🎓 ${school}`, work ? `💼 ${work.replace(/^ · /, '')}` : null, homeLabel(p) ? `🏠 ${homeLabel(p)}` : null, age >= 22 && l.netWorth ? `💰 ${money(l.netWorth)}` : null, l.car && age >= 17 ? `🚗 ${l.car}` : null].filter(Boolean);
  return `<small class="traits">${esc(bits.join(' · '))}</small>`;
}

/** Ways to help: a place to live, a down payment, tuition. */
function helpButtons(state, p, age) {
  if (!p.alive || !p.life || p.relation === 'ex') return '';
  const out = [];
  if (canHouse(state, p)) for (const prop of vacancies(state).slice(0, 2)) out.push(button(`🔑 Offer your ${esc(prop.typeName.split(' (')[0].toLowerCase())}`, 'npcLives.offerHome', { arg: `${p.id}:${prop.id}`, variant: 'tiny', hint: 'Family rate: 80% of market rent' }));
  if (['rent', 'parents', 'yourRental'].includes(p.life.home?.kind) && age >= 21 && ['child', 'sibling', 'mother', 'father', 'friend'].includes(p.relation)) out.push(button('🏡 Help with a down payment', 'npcLives.helpBuy', { arg: p.id, variant: 'tiny', hint: '≈10% of a home' }));
  if (p.life.studying) out.push(button('🎓 Pay tuition', 'npcLives.payTuition', { arg: p.id, variant: 'tiny', disabled: Boolean(state.yearly[`npc.tuition.${p.id}`]) }));
  return out.join('');
}

/** A child's smarts, athletics and (with a family business) how ready they are to take it over. */
function childTraits(state, p) {
  const t = p.traits;
  const r = readiness(p);
  const biz = ownsBusiness(state) && ageOf(state, p) >= 10 ? ` · 🏪 ${readinessLabel(r)} (${r})` : '';
  return `<small class="traits">🧠 ${t.smarts} · ⚽ ${t.athletics} · 💼 ${t.business}${biz}</small>`;
}

function nurtureButtons(state, p, age) {
  const done = Boolean(state.yearly[`dynasty.nurture.${p.id}`]);
  return Object.entries(NURTURE)
    .filter(([, n]) => age >= n.ages[0] && age <= n.ages[1] && (!n.needsBusiness || ownsBusiness(state)))
    .map(([id, n]) => button(`${n.icon} ${n.label}`, 'dynasty.nurture', { arg: `${p.id}:${id}`, variant: 'tiny', disabled: done, hint: `${n.cost ? money(n.cost) : 'Free'} · ${n.desc}` })).join('');
}

/** The family line, the family businesses and who carries them on. */
function dynastyCard(state) {
  if (state.character.age < 18) return '';
  const kids = livingChildren(state);
  const bizzes = allBusinesses(state);
  const gen = state.lineage?.generation ?? 1;
  if (!kids.length && !bizzes.length && gen === 1) return '';
  const successor = successorOf(state);
  const planned = plannedSuccession(state);
  const plan = state.people.plan;
  const grandkids = kids.reduce((n, c) => n + (c.kids?.length ?? 0), 0);
  const heritage = bizzes.filter((b) => b.heritage).map((b) => `${esc(b.name)}: ${ordinal(b.heritage.generation)}-generation family business, since ${b.heritage.since}`);
  const rows = kv([
    ['Generation', `${ordinal(gen)} of the ${esc(state.character.lastName)} family${state.lineage?.founderYear ? ` (since ${state.lineage.founderYear})` : ''}`],
    ['Children', kids.length ? `${kids.length}${grandkids ? ` · ${grandkids} grandchild${grandkids > 1 ? 'ren' : ''}` : ''}` : '<span class="neg">None — when you die, your story ends</span>'],
    heritage.length ? ['Heritage', heritage.join('<br>')] : null,
    bizzes.length ? ['Successor', successor ? `${esc(fullName(successor))} · ${readinessLabel(readiness(successor))}` : '<span class="neg">None named — the business goes through probate to whichever heir you continue as</span>'] : null,
    planned ? ['Under the plan', `${money(planned.equity)} passes outside probate, taxed as ${money(planned.equity * (1 - SUCCESSION_DISCOUNT))}`] : null,
  ]);
  const choose = bizzes.length && kids.length ? `<h4 class="sub">Succession plan</h4>
    <div class="toggle-row chips-row">${kids.map((k) => button(`📋 ${esc(k.firstName)} (${ageOf(state, k)}) · ${readiness(k)}`, 'dynasty.succession', { arg: k.id, variant: successor?.id === k.id ? 'tiny on' : 'tiny', hint: plan?.successionDrafted ? money(SUCCESSION_CHANGE_COST) : money(SUCCESSION_COST) })).join('')}
    ${successor ? button('Set the plan aside', 'dynasty.succession', { arg: 'none', variant: 'tiny ghost' }) : ''}</div>` : '';
  const tips = [
    bizzes.length && !kids.length ? 'With no children, there is no one to hand the business to — it is sold off in your estate.' : null,
    bizzes.length && kids.length && !kids.some((k) => readiness(k) >= READY) ? 'Hire grown children into the business (Business tab) or bring younger ones along each year: an heir who knows the business takes over smoothly and starts with experience.' : null,
    'Children close to you lift your happiness each year, look after you in old age, and give you grandchildren — who become your heir\'s own family when you pass the story on.',
  ].filter(Boolean).map((t) => `<p class="fine">${t}</p>`).join('');
  return card('Dynasty', `${rows}${choose}${tips}`, { icon: '🏰', accent: 'yellow' });
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
  return card(`Family Line · Generation ${l.generation}`, `<ul class="history">${l.ancestors.map((a) => `<li>🕯️ <b>${esc(a.name)}</b> <small>${a.born}–${a.died} · ${esc(a.cause ?? '')} · left ${money(a.netWorth)}${a.businesses?.length ? ` · 🏪 ${esc(a.businesses.join(', '))}` : ''}</small></li>`).join('')}</ul>`, { icon: '🌳' });
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
    ${dynastyCard(state)}
    ${legacyCard(state)}
    ${lineage(state)}
    ${!living(state).length ? card('People', empty('Everyone you knew is gone.'), { icon: '🕯️' }) : ''}`;
}

/** Tombstone extra: continue as one of your children. */
export function heirChoices(state) {
  const kids = livingChildren(state);
  if (!kids.length) return '';
  const legacy = state.legacy;
  const amountFor = (id) => (legacy ? legacy.bequests.filter((b) => b.to === id && !b.inKind).reduce((s, b) => s + b.amount, 0) + legacy.insurance.filter((b) => b.to === id).reduce((s, b) => s + b.amount, 0) : 0);
  const bizzes = allBusinesses(state);
  const successorId = legacy?.succession?.to ?? null;
  const takesOver = (k) => bizzes.length && (!successorId || successorId === k.id) ? ` · 🏪 takes over ${bizzes.length > 1 ? `${bizzes.length} businesses` : esc(bizzes[0].name)}${readiness(k) >= READY ? ' (trained)' : ''}` : k.business ? ` · 🏪 owns ${esc(k.business.name)}` : '';
  const extras = (k) => [k.traits ? `🧠 ${k.traits.smarts}` : null, k.kids?.length ? `${k.kids.length} kid${k.kids.length > 1 ? 's' : ''} of their own` : null].filter(Boolean).join(' · ');
  return `<div class="heirs"><h3>Continue the family story</h3>
    ${kids.map((k) => button(`▶ Play as ${esc(k.firstName)} (age ${ageOf(state, k)})`, 'engine.continueAs', { arg: k.id, variant: 'primary', hint: `Inherits ${money(amountFor(k.id))}${state.people.fund529[k.id] ? ` + ${money(state.people.fund529[k.id])} 529` : ''}${takesOver(k)}${extras(k) ? ` · ${extras(k)}` : ''}` })).join('')}
  </div>`;
}

