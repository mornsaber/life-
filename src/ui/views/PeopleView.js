/**
 * People tab: family, partner, children, friends and exes, dating, and the
 * Legacy card (will, life insurance, 529 plans, estate estimate, lineage).
 */
import { militaryInsignia } from '../Insignia.js';
import { rivalsCard, familyCard } from './CirclesView.js';
import { serviceLabel, rankCodeOf } from '../../modules/people/RelativeService.js';
import { esc, money, button, card, meter, kv, empty, disclosure, select, chip } from '../Components.js';
import {
  living, people, ageOf, partnerOf, spouseOf, livingChildren, RELATION_LABEL, fullName, spouseIncome, estateBalance, estateTax, heirShares, WILL_PLANS, WEDDINGS, ARREARS_HOLD,
} from '../../modules/people/index.js';
import { CIRCLES } from '../../modules/people/Friends.js';
import { STYLES, SCHOOLS, LESSONS, parentingStyle, parentingOf, myMinorChildren } from '../../modules/people/Parenting.js';
import { laterLifeOf, attorneyCandidates, ltcPremium } from '../../modules/people/LaterLife.js';
import { bestFriend, friendGroupsOf, groupsOf } from '../../modules/people/FriendGroups.js';
import { TRAITS, traitOf, closeness, interactEligibility, isRomantic } from '../../modules/people/Bonds.js';
import { nationalityCode, nationalityName } from '../../modules/world/Immigration.js';
import { COUNTRIES, priceLevel } from '../../modules/world/Countries.js';
import { livesAbroad, parentVisaCheck, visitCost, REMITTANCE_FEE } from '../../modules/people/FamilyAbroad.js';
import { contactThen, journey } from '../../modules/world/TravelOfTheDay.js';
import { familyHistory } from '../../modules/people/FamilyInHistory.js';
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
import { petsOf, SPECIES } from '../../modules/people/Pets.js';
import { carrierOf, ivfCost, surrogacyLaw, surrogacyCost, ADOPTION } from '../../modules/people/Fertility.js';
import { toned, personTone } from '../../modules/people/SkinTone.js';
import { familyPrestige, prestigeTier } from '../../modules/people/FamilyLegacy.js';
import { TEMPERAMENTS, epithetOf, standing, memoirEligibility } from '../../modules/people/Remembered.js';
import { flagImg } from '../Flags.js';
import { circlesNow } from '../../modules/life/Reputation.js';
import { hasTech, eraYear, yearNow } from '../../modules/world/Eras.js';

const ICON = { mother: '👩', father: '👨', sibling: '🧑', partner: '💘', fiance: '💍', spouse: '💑', ex: '💔', child: '🧒', friend: '🤝' };
/** A person's face: their relation's icon, or one for their age and gender, in their skin tone. */
function personIcon(state, p) {
  const icon = ICON[p.relation];
  const face = (() => {
    if (icon && !['🧑', '🧒', '👩', '👨'].includes(icon)) return icon;
    const age = ageOf(state, p);
    if (age < 3) return '👶';
    if (age < 13) return p.gender === 'female' ? '👧' : p.gender === 'male' ? '👦' : '🧒';
    if (age >= 65) return p.gender === 'female' ? '👵' : p.gender === 'male' ? '👴' : '🧓';
    return p.gender === 'female' ? '👩' : p.gender === 'male' ? '👨' : icon ?? '🧑';
  })();
  return toned(face, personTone(state, p));
}
/** The person whose panel is open (set by peopleView for the rows it draws). */
const PICKED = { id: null };
const CUSTODY = { you: 'Lives with you', joint: 'Joint custody', ex: 'Lives with your ex' };

function personRow(state, p) {
  const age = ageOf(state, p);
  const facts = [
    `${RELATION_LABEL[p.relation] ?? p.relation}`,
    p.alive ? `age ${age}` : `died at ${p.diedAge}`,
    p.alive && p.service ? null : p.alive && p.job ? p.job : null,
    p.alive && p.career?.elite ? `🏛️ ${p.career.elite.name}` : null,
    p.career?.awards?.length ? `🏅 ${p.career.awards.length} award${p.career.awards.length > 1 ? 's' : ''}` : null,
    p.veteran?.rank ? `🎖️ veteran (${p.veteran.rank}, ${p.veteran.years} yr)` : null,
    p.dynasticTitle ? `⚜️ ${p.dynasticTitle}` : null,
    p.houseOrder ? `⚜️ ${p.houseOrder}` : null,
    p.alive && p.relation === 'spouse' && p.income ? `${money(p.income)}/yr` : null,
    p.nationality && nationalityCode(p) !== (state.character.countryId ?? 'US') && p.relation !== 'child' ? `from ${nationalityName(p)}` : null,
    p.relation === 'child' && p.citizenships && (p.citizenships.length > 1 || p.citizenships[0] !== (state.character.countryId ?? 'US')) ? `🛂 ${p.citizenships.map((c) => flagImg(c) || c).join('')}${p.oci ? ' + OCI' : ''}` : null,
    p.alive && p.away ? 'moved away' : null,
    p.alive && livesAbroad(state, p) ? `🌍 lives in ${COUNTRIES[p.livesIn]?.name ?? p.livesIn}${state.people.remit?.[p.id] ? ` · you send ${money(state.people.remit[p.id])}/yr` : ''}${p.sponsor ? ` · moving here at your age ${p.sponsor.arrives}` : ''}` : null,
    p.owes ? `owes you ${money(p.owes.amount)}` : null,
    p.relation === 'child' && age < 18 && p.custody ? CUSTODY[p.custody] : null,
    p.relation === 'child' && p.degree ? `college grad` : null,
    p.relation === 'child' && p.kids?.length ? `${p.kids.length} grandchild${p.kids.length > 1 ? 'ren' : ''}` : null,
    p.relation === 'child' && successorOf(state)?.id === p.id ? '📋 your successor' : null,
  ].filter(Boolean).join(' · ');
  const traits = p.alive && p.relation === 'child' && p.traits ? childTraits(state, p) : '';
  const life = p.alive && p.life && age >= 5 ? lifeLine(p, age) : '';
  const on = PICKED.id === p.id;
  return `<li class="person-row ${p.alive ? '' : 'gone'}${on ? ' on' : ''}">
    <span class="person-icon" aria-hidden="true">${p.alive ? personIcon(state, p) : '🕯️'}</span>
    <div class="person-info"><b>${esc(fullName(p))}</b><small>${esc(facts)}</small>${p.alive && p.service ? `<small class="traits">${militaryInsignia(rankCodeOf(p.service), p.service.nation, { branch: p.service.branch })} ${esc(serviceLabel(p.service))}${p.service.deployed ? ' · 🌍 deployed' : ''}</small>` : ''}${life}${traits}${p.alive && age >= 3 ? `<small class="traits">${TRAITS[traitOf(p)].icon} ${TRAITS[traitOf(p)].name} · ${closeness(p.relationship)}</small>` : ''}</div>
    ${p.alive ? meter(p.relationship, { label: 'Relationship', suffix: '' }) : '<span></span>'}
    <div class="person-actions">${p.alive ? button(on ? '✓ Open' : 'Open', 'ui.set', { arg: `person=${on ? '' : p.id}`, variant: on ? 'tiny primary' : 'tiny' }) : ''}</div>
  </li>`;
}

/** The person you picked: everything you can do with them, in one place. */
function personPanel(state, p) {
  const age = ageOf(state, p);
  const sec = (title, html) => (html.replace(/\s/g, '') ? `<h4 class="sub">${title}</h4><div class="action-grid">${html}</div>` : '');
  const time = [
    button('🫶 Time', 'people.spendTime', { arg: p.id, variant: 'small', disabled: Boolean(state.yearly[`people.time.${p.id}`]) }),
    button('🎁 Gift', 'people.gift', { arg: p.id, variant: 'small', disabled: Boolean(state.yearly[`people.gift.${p.id}`]) }),
    age >= 3 ? bondButtons(state, p) : '',
  ].join('');
  const help = [
    ['mother', 'father'].includes(p.relation) && state.character.age >= 16 ? button('💵 Ask for help', 'people.askForMoney', { arg: p.id, variant: 'small', disabled: Boolean(state.yearly['people.ask']) }) : '',
    helpButtons(state, p, age),
  ].join('');
  const raising = p.relation === 'child' ? [
    nurtureButtons(state, p, age),
    age < 18 && ['ex', 'joint'].includes(p.custody) ? button('⚖️ Petition for custody', 'familyCourt.petition', { arg: p.id, variant: 'small', disabled: Boolean(state.yearly[`familyCourt.${p.id}`]), hint: 'Mediation or a judge' }) : '',
  ].join('') : '';
  const us = [
    p.relation === 'partner' ? button('💍 Propose', 'people.propose', { arg: p.id, variant: 'small' }) : '',
    ['partner', 'fiance'].includes(p.relation) ? button('💔 Break up', 'people.breakUp', { arg: p.id, variant: 'small danger' }) : '',
    button('😤 Argue', 'people.argue', { arg: p.id, variant: 'small ghost' }),
  ].join('');
  const memories = p.memories?.length ? disclosure(`mem.${p.id}`, `📸 Memories with ${esc(p.firstName)}`, `<ul class="history">${[...p.memories].reverse().map((m) => `<li><small>age ${m.age}</small> ${esc(m.text)}</li>`).join('')}</ul>`, { count: p.memories.length, open: true }) : '';
  return card(`${esc(fullName(p))}`, `<p class="muted">${esc(RELATION_LABEL[p.relation] ?? p.relation)} · age ${age}${age >= 3 ? ` · ${closeness(p.relationship)}` : ''}</p>
    ${meter(p.relationship, { label: 'Relationship', suffix: '' })}
    ${sec('🫶 Time together', time)}${sec('🤲 Help', help)}${sec('🌍 Far away', abroadButtons(state, p))}${sec('🧒 Raising them', raising)}${sec('💬 You two', us)}${memories}
    <div class="row-end">${button('Close', 'ui.set', { arg: 'person=', variant: 'small ghost' })}</div>`, { icon: personIcon(state, p), accent: 'cyan' });
}

/** Ways to spend time with someone (three a year each). */
function bondButtons(state, p) {
  const e = interactEligibility(state, p);
  const opt = (label, arg, hint = '') => button(label, 'bonds.interact', { arg: `${p.id}:${arg}`, variant: 'tiny', disabled: !e.ok, hint: e.ok ? hint : e.reason });
  return [
    button('🎳 Hang out', 'bonds.hangOut', { arg: p.id, variant: 'tiny', disabled: !e.ok, hint: e.ok ? `Pick something they'd love` : e.reason }),
    opt('💬 Talk', 'talk'),
    opt('😂 Joke around', 'joke'),
    opt('🌟 Compliment', 'compliment'),
    state.character.age >= 10 ? opt('🧭 Ask for advice', 'advice', 'Less stress') : '',
    p.relationship < 50 ? opt('🙏 Apologize', 'apologize', 'Mend things') : '',
  ].join('');
}

/** School, work, home and money for someone in your life. */
function lifeLine(p, age) {
  const l = p.life;
  const school = l.studying ? `studying for a ${EDU_LABEL[l.studying.degree].toLowerCase()} (done at ${l.studying.until})` : age < 18 ? (age < 14 ? 'in school' : 'in high school') : EDU_LABEL[l.edu];
  const work = p.job ? `${l.employer ? `at ${l.employer}` : ''}${p.income ? ` · ${money(p.income)}/yr` : ''}` : p.homemaker ? (eraYear() < 1970 ? 'keeps house' : 'stays at home') : age >= 18 && !l.studying && !p.retired && age < 65 ? 'looking for work' : p.retired ? 'retired' : '';
  const bits = [`🎓 ${school}`, work ? `💼 ${work.replace(/^ · /, '')}` : null, homeLabel(p) ? `🏠 ${homeLabel(p)}` : null, age >= 22 && l.netWorth ? `💰 ${money(l.netWorth)}` : null, l.car && age >= 17 ? `${eraYear() >= 1905 ? '🚗' : '🐎'} ${l.car}` : null].filter(Boolean);
  return `<small class="traits">${esc(bits.join(' · '))}</small>`;
}

/** Family in another country: visit, send money, sponsor a parent. */
function abroadButtons(state, p) {
  if (!p.alive || !livesAbroad(state, p)) return '';
  const regular = state.people.remit?.[p.id];
  const visa = ['mother', 'father'].includes(p.relation) ? parentVisaCheck(state, p) : null;
  return [
    button(`${journey(state, state.character.countryId ?? 'US', p.livesIn).icon} Visit`, 'familyAbroad.visit', { arg: p.id, variant: 'tiny', hint: money(visitCost(state, p)), disabled: Boolean(state.yearly[`family.visit.${p.id}`]) }),
    button('✉️ Write', 'travelDay.write', { arg: p.id, variant: 'tiny ghost', hint: contactThen(state, p.livesIn).letterTime, disabled: state.travelDay?.wrote?.[p.id] === yearNow(state) }),
    contactThen(state, p.livesIn).phone ? button(contactThen(state, p.livesIn).video ? '📹 Video call' : '📞 Call', 'travelDay.call', { arg: p.id, variant: 'tiny ghost', hint: money(contactThen(state, p.livesIn).callCost), disabled: state.travelDay?.called?.[p.id] === yearNow(state) }) : '',
    button('💸 Send $1,000', 'familyAbroad.send', { arg: `${p.id}:1000`, variant: 'tiny', hint: `+${Math.round(REMITTANCE_FEE * 100)}% fees` }),
    button(regular ? '⏹️ Stop monthly transfer' : '🔁 Send $3,000/yr', 'familyAbroad.regular', { arg: `${p.id}:${regular ? 0 : 3000}`, variant: 'tiny ghost' }),
    visa ? button('🛂 Sponsor to live here', 'familyAbroad.sponsor', { arg: p.id, variant: 'tiny', hint: visa.ok ? `${Math.round(visa.odds * 100)}% · ${money(visa.fee)}` : visa.reason, disabled: !visa.ok }) : '',
  ].join('');
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
  const groups = circlesNow(state).map(([id, c]) => {
    const list = friends.filter((f) => (f.circle ?? 'neighborhood') === id);
    return list.length ? disclosure(`friends.${id}`, `${c.icon} ${esc(c.label)}`, `<ul class="people">${list.map((p) => personRow(state, p)).join('')}</ul>`, { count: list.length, open: list.length <= 2 }) : '';
  }).join('');
  const close = friends.filter((f) => f.relationship >= 50).length;
  const note = state.character.age >= 25 && !close ? '<p class="why">No close friends — loneliness takes a toll on happiness and health.</p>' : '';
  const best = bestFriend(state);
  const F = friendGroupsOf(state);
  const candidates = friends.filter((f) => f.relationship >= 65 && f.id !== best?.id && !f.formerPartner);
  const bestRow = `<p>${best ? `🫂 Best friend: <b>${esc(best.firstName)}</b> <small class="muted">since age ${F.since}${F.fallenOut != null ? ' · not speaking' : ''}</small>` : '<span class="muted">No best friend yet.</span>'}</p>${candidates.length ? `<div class="toggle-row">${candidates.slice(0, 4).map((f) => button(`🫂 ${esc(f.firstName)}`, 'friendGroups.best', { arg: f.id, variant: 'tiny', hint: best ? 'Make them your best friend instead' : 'Make them your best friend' })).join('')}</div>` : ''}`;
  const circles = groupsOf(state).map((g) => `${CIRCLES[g.circle]?.icon ?? '👥'} ${esc(CIRCLES[g.circle]?.label ?? g.circle)} (${g.list.length})`).join(' · ');
  return card('Friends', `${note}${bestRow}${circles ? `<p class="fine">Friend groups: ${circles}</p>` : ''}<div class="toggle-row">${button('🤝 Make a new friend', 'people.makeFriend', { variant: 'small', disabled: Boolean(state.yearly['people.friend']) })}</div>${groups}
    <p class="fine">Spending time with a friend who moved away means a trip (≈$400) or a video call.</p>`, { icon: '🤝' });
}

/** Raising your children: an approach, schools, lessons, and how each of them is doing. */
function parentingCard(state) {
  const kids = myMinorChildren(state);
  if (!kids.length) return '';
  const style = parentingStyle(state);
  const styles = Object.entries(STYLES).map(([id, st]) => button(st.label, 'parenting.style', { arg: id, variant: state.parentingStyle?.id === id ? 'tiny on' : 'tiny', hint: st.desc })).join('');
  const rows = kids.map((c) => {
    const p = parentingOf(c);
    const age = ageOf(state, c);
    const schools = age >= 5 ? Object.entries(SCHOOLS).map(([id, sc]) => button(sc.label, 'parenting.school', { arg: `${c.id}:${id}`, variant: p.school === id ? 'tiny on' : 'tiny', disabled: p.school === id || Boolean(state.yearly[`parenting.school.${c.id}`]), hint: sc.fee ? `${money(Math.round(sc.fee * priceLevel(state)))}/yr` : 'Free' })).join('') : '';
    const lessons = age >= 4 ? Object.entries(LESSONS).map(([id, l]) => button(l.label, 'parenting.lessons', { arg: `${c.id}:${id}`, variant: p.lessons.includes(id) ? 'tiny on' : 'tiny', hint: `${money(Math.round(l.fee * priceLevel(state)))}/yr` })).join('') : '';
    return `<li><b>${esc(c.firstName)}</b> (${age})${p.school ? ` · ${esc(SCHOOLS[p.school].label.replace(/^\S+\s/, ''))}` : ''}${p.therapy ? ' · 🧠 in therapy' : ''}
      ${meter(p.wellbeing, { label: '🌤️ Wellbeing', tone: p.wellbeing >= 60 ? 'good' : p.wellbeing >= 40 ? 'mid' : 'bad' })}
      ${schools ? `<div class="toggle-row">${schools}</div>` : ''}${lessons ? `<div class="toggle-row">${lessons}</div>` : ''}
      ${p.wellbeing < 50 && !p.therapy ? button('🧠 Find a therapist', 'parenting.therapy', { arg: c.id, variant: 'tiny' }) : ''}</li>`;
  }).join('');
  return card('Parenting', `<p class="muted">Your approach: <b>${style ? esc(style.label) : 'not chosen yet'}</b>. It shapes how close you stay and how well they cope.</p><div class="toggle-row">${styles}</div><ul class="history">${rows}</ul>`, { icon: '👪' });
}

/** Your own old age: who acts for you, and your wishes. */
function laterLifeCard(state) {
  if (state.character.age < 40) return '';
  const L = laterLifeOf(state);
  const att = L.poa === 'professional' ? 'A solicitor' : L.poa ? (living(state).find((p) => p.id === L.poa)?.firstName ?? '—') : null;
  const picks = att ? '' : attorneyCandidates(state).slice(0, 4).map((p) => button(`📜 ${esc(p.firstName)}`, 'laterLife.poa', { arg: p.id, variant: 'tiny', hint: 'Power of attorney' })).join('') + button('📜 A solicitor', 'laterLife.poa', { arg: 'professional', variant: 'tiny', hint: 'Impartial; costs more' });
  return card('Later Life', `${kv([
    ['Power of attorney', att ? esc(att) : '<span class="neg">None — a court decides if you lose capacity</span>'],
    ['Advance directive', state.health?.directive ? 'Written' : 'Not yet'],
    ['Funeral plan', L.funeral ? 'Paid for' : 'None'],
    ['Driving', L.keys ? 'Given up' : 'Still driving'],
    ['Long-term-care insurance', L.ltc ? `${money(L.ltc.premium)}/yr since ${L.ltc.since}` : 'None'],
  ])}<div class="toggle-row">${picks}${state.health?.directive ? '' : button('📝 Write an advance directive', 'health.directive', { variant: 'tiny' })}${L.funeral ? '' : button('🕊️ Prepay your funeral', 'laterLife.funeral', { variant: 'tiny' })}${button(L.ltc ? '📄 Cancel care insurance' : '📄 Buy long-term-care insurance', 'laterLife.ltc', { variant: 'tiny', hint: L.ltc ? 'Premiums are lost' : `${money(ltcPremium(state))}/yr · pays 70% of care` })}</div>
  <p class="fine">Care at home or a care home is decided when you need it, on the Health tab.</p>`, { icon: '🌇' });
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
      ${bill ? `<small>· ${money(bill.total + (bill.publicShare ?? 0))}/yr${bill.publicShare ? ` (public care pays ${money(bill.publicShare)})` : ''}: they pay ${money(bill.parentPays)}${bill.medicaid ? `, ${state.character.countryId ? 'social assistance' : 'Medicaid'} ${money(bill.medicaid)}` : ''}, you pay ${money(bill.you)}</small>` : ''} ${authority}
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
  } else body = `<p>💘 Dating <b>${esc(partner.firstName)}</b> since age ${partner.since}${partner.livingTogether ? ' · living together' : ''}.</p>`;
  if (partner && isRomantic(partner)) {
    const adults = age >= 18 && ageOf(state, partner) >= 18;
    body += `${meter(partner.spark ?? 70, { label: '✨ Spark', suffix: '', tone: (partner.spark ?? 70) < 30 ? 'bad' : (partner.spark ?? 70) < 55 ? 'mid' : 'good' })}
      <p class="fine">${TRAITS[traitOf(partner)].icon} ${esc(partner.firstName)} is ${TRAITS[traitOf(partner)].name.toLowerCase()}. Sparks fade every year — more with stress and little kids — unless you look after them.</p>
      <div class="toggle-row">
        ${button('💞 Date night', 'bonds.dateNight', { arg: partner.id, variant: 'small', disabled: (state.yearly[`romance.date.${partner.id}`] ?? 0) >= 2 })}
        ${button('💗 Romantic gesture', 'bonds.gesture', { arg: partner.id, variant: 'small', disabled: Boolean(state.yearly[`romance.gesture.${partner.id}`]) })}
        ${!partner.saidLove ? button('❤️ Say "I love you"', 'bonds.loveYou', { arg: partner.id, variant: 'small', hint: 'Are they ready?' }) : ''}
        ${['partner', 'fiance'].includes(partner.relation) && !partner.livingTogether && adults ? button('🗝️ Move in together', 'bonds.moveIn', { arg: partner.id, variant: 'small' }) : ''}
        ${adults ? button('🌙 Spend the night', 'bonds.intimacy', { arg: partner.id, variant: 'small', disabled: Boolean(state.yearly[`romance.night.${partner.id}`]) }) : ''}
      </div>`;
  }
  const family = partner && ['spouse', 'fiance', 'partner'].includes(partner.relation)
    ? `<div class="toggle-row">${button(p.expecting ? '🤰 Baby on the way' : '👶 Try for a baby', 'people.tryForBaby', { variant: 'small', disabled: Boolean(p.expecting) || Boolean(state.yearly['people.baby']) })}</div>` : '';
  return card('Love Life', `${body}${family}
    ${familyPlanning(state)}
    ${age >= 18 ? `<div class="toggle-row">${button('🌃 Go out on the town', 'bonds.goOut', { variant: 'small', disabled: Boolean(state.yearly['bonds.goOut']), hint: partner ? 'Careful…' : 'Meet someone new' })}</div>` : ''}
    <h4 class="sub">Interested in</h4><div class="toggle-row chips-row">${prefs}</div>`, { icon: '💘', accent: 'pink' });
}

/** Fertility treatment, surrogacy and adoption (Fertility.js). */
function familyPlanning(state) {
  const p = state.people;
  const age = state.character.age;
  if (age < 21) return '';
  const f = p.fertility ?? {};
  const busy = Boolean(p.expecting) || Boolean(f.surrogacy);
  const carrier = carrierOf(state);
  const ivf = ivfCost(state);
  const ivfHint = (extra = 0) => (ivf.amount + extra ? `${money(ivf.amount + extra)} · ${ivf.why}` : 'Publicly funded');
  const law = surrogacyLaw(state);
  const status = p.expecting?.dueAge && p.expecting.dueAge > age ? `<p class="fine">${p.expecting.adopted ? `🏠 Adoption under way: your child comes home at ${p.expecting.dueAge}.` : `🤰 Due when you're ${p.expecting.dueAge}.`}</p>`
    : f.surrogacy ? '<p class="fine">🤝 Surrogacy under way: matching and the embryo transfer.</p>' : '';
  const treatments = carrier ? `
      ${(f.tryingYears ?? 0) >= 1 && !f.workup ? button('🩺 Fertility workup', 'fertility.workup', { variant: 'small', hint: `${f.tryingYears} yr trying` }) : ''}
      ${button('🧫 IVF cycle', 'fertility.ivf', { arg: 'own', variant: 'small', disabled: busy || Boolean(state.yearly['fertility.ivf']), hint: ivfHint() })}
      ${f.frozen?.eggs ? button(`❄️ IVF with eggs frozen at ${f.frozen.age}`, 'fertility.ivf', { arg: 'frozen', variant: 'small', disabled: busy || Boolean(state.yearly['fertility.ivf']), hint: `${f.frozen.eggs} left` }) : ''}
      ${button('🧬 IVF with donor eggs', 'fertility.ivf', { arg: 'donor', variant: 'small', disabled: busy || Boolean(state.yearly['fertility.ivf']), hint: ivfHint(15000) })}` : '';
  return disclosure('family-planning', '👪 Fertility, surrogacy & adoption', `
    ${status}
    ${f.workup ? `<p class="fine">🩺 Workup: ${esc(f.workup.route)}.</p>` : ''}
    <div class="toggle-row">${treatments}
      ${state.character.gender === 'female' && age >= 25 && age <= 40 && !f.frozen ? button('❄️ Freeze your eggs', 'fertility.freezeEggs', { variant: 'small' }) : ''}
      ${law !== 'banned' ? button('🤝 Surrogacy', 'fertility.surrogacy', { variant: 'small', disabled: busy, hint: `${law === 'commercial' ? 'Commercial' : 'Altruistic only'} · ~${money(surrogacyCost(state))}` }) : ''}
    </div>
    <div class="toggle-row">${Object.entries(ADOPTION).map(([id, r]) => button(`🏠 Adopt: ${r.label.toLowerCase()}`, 'fertility.adopt', { arg: id, variant: 'small', disabled: busy || age < (id === 'foster' ? 21 : 25), hint: `${r.wait[0] === r.wait[1] ? r.wait[0] : `${r.wait[0]}–${r.wait[1]}`} yr wait` })).join('')}</div>
    ${law === 'banned' ? '<p class="fine">Surrogacy is illegal here.</p>' : ''}`);
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
      [`${state.character.countryId ? 'Inheritance tax' : 'Estate tax'} if you died today`, tax.total ? `${money(tax.total)}${tax.name ? ` (${esc(tax.name)})` : ''}` : state.character.countryId && !tax.name ? 'None (no inheritance tax here)' : 'None (under the exemption)'],
      ['Will', p.will ? WILL_PLANS[p.will.plan].label : '<span class="neg">None — state intestacy law decides</span>'],
      ['Would go to', shares.map((s) => `${esc(s.label)} ${Math.round(s.share * 100)}%`).join(', ')],
      ['Life insurance on you', policy('self', li.self)],
      spouse ? ['Life insurance on your spouse', policy('spouse', li.spouse)] : null,
      p.arrears ? ['Child-support arrears', `<span class="neg">${money(p.arrears)}</span>${p.arrears >= ARREARS_HOLD ? ' · licenses suspended' : ''}`] : null,
      p.alimony ? ['Alimony', `${money(p.alimony.annual)}/yr ${p.alimony.pay ? 'paid' : 'received'} until ${p.alimony.untilAge}`] : null,
    ])}
    ${disclosure('legacy.tools', '🧰 Will, life insurance & estate plan', `<h4 class="sub">Will</h4><div class="toggle-row">${Object.entries(WILL_PLANS).map(([id, w]) => button(`${w.icon} ${w.label}`, 'people.writeWill', { arg: id, variant: p.will?.plan === id ? 'small on' : 'small', hint: p.will ? '$300 to update' : '$1,500 attorney' })).join('')}</div>
    <h4 class="sub">Term life insurance</h4><div class="toggle-row">
      ${amounts.map((a) => button(`🛡️ ${money(a)} on you`, 'people.lifeInsurance', { arg: `self:${a}`, variant: li.self?.benefit === a ? 'small on' : 'small' })).join('')}
      ${spouse ? amounts.slice(0, 2).map((a) => button(`🛡️ ${money(a)} on ${esc(spouse.firstName)}`, 'people.lifeInsurance', { arg: `spouse:${a}`, variant: li.spouse?.benefit === a ? 'small on' : 'small' })).join('') : ''}
      ${li.self ? button('Cancel your policy', 'people.lifeInsurance', { arg: 'self:0', variant: 'small ghost' }) : ''}
    </div>
    ${planSection(state)}`)}
    ${fundRows ? `<h4 class="sub">College savings</h4><ul class="history">${fundRows}</ul>` : ''}
    ${p.arrears ? `<div class="toggle-row">${button('⚖️ Pay support arrears', 'people.payArrears', { variant: 'small', disabled: state.finances.cash <= 0 })}</div>` : ''}
    <p class="fine">Estates pay the funeral, then debts, then probate, then estate tax (federal over ${money(13990000)}; NY, IL, WA and D.C. have their own), then heirs. Life insurance goes straight to your beneficiaries. When you die, you can continue the story as one of your children.</p>`, { icon: '📜', accent: 'yellow' });
}

/** The family's standing, its heirlooms and its seat (people/FamilyLegacy.js). */
function familyLegacyCard(state) {
  const d = state.dynasty;
  const prestige = familyPrestige(state);
  const [, tier, icon] = prestigeTier(prestige);
  const looms = (d?.heirlooms ?? []).map((h) => `<li class="fund-row"><span>${h.icon} <b>${esc(h.name[0].toUpperCase() + h.name.slice(1))}</b><br><small class="muted">since ${h.since}, ${esc(h.story)}${h.value >= 100 ? ` · worth about ${money(h.value)}` : ''}</small></span>${h.value >= 100 ? button('Sell', 'familyLegacy.sellHeirloom', { arg: h.id, variant: 'tiny ghost', hint: 'Your relatives will mind' }) : ''}</li>`).join('');
  if (!looms && !d?.seat && prestige < 15) return '';
  return card('Family Legacy', `<p>${icon} The ${esc(state.character.lastName)}s are <b>${esc(tier)}</b> <small class="muted">(standing ${prestige}/100, built by every generation: honours, fortunes, titles, businesses, heirlooms, a seat)</small>.</p>
    ${d?.seat ? `<p>🏡 The family seat: <b>${esc(d.seat.name)}</b>, since ${d.seat.since}.</p>` : '<p class="fine">A home you keep for fifteen years becomes the family seat.</p>'}
    ${looms ? `<h4 class="sub">Heirlooms</h4><ul class="funds">${looms}</ul>` : '<p class="fine">Heirlooms come down from those before you: medals, rings, the things with stories.</p>'}`, { icon: '🏰' });
}

function lineage(state) {
  const l = state.lineage;
  if (!l?.ancestors?.length) return '';
  const gens = l.ancestors.map((a) => {
    const kids = a.children?.length ? `<div class="tree-kids">${a.children.map((k) => `<span class="${k.heir ? 'tree-heir' : ''}">${k.heir ? '⬇️ ' : ''}${esc(k.name)}${k.alive ? '' : ' 🕯️'}</span>`).join(' · ')}</div>` : '';
    const facts = [a.career ? `💼 ${esc(a.career)}` : null, a.military ? `${a.rank ? militaryInsignia(a.rank.code, a.rank.nation, { branch: a.rank.branch }) : '🎖️'} ${esc(a.military)}` : null, a.education ? `🎓 ${esc(a.education)}` : null, a.honours?.length ? `🏅 ${esc(a.honours.join(', '))}` : null, a.businesses?.length ? `🏪 ${esc(a.businesses.join(', '))}` : null].filter(Boolean);
    const named = (a.namedAfter ?? []).map((n) => `${n.removed ? '<s>' : ''}${esc(n.name)}${n.removed ? `</s> <small>(removed ${n.removed})</small>` : ''}`).join(', ');
    facts.push(...[a.temperament ? `${a.temperament.map((t) => TEMPERAMENTS[t]?.icon ?? '').join('')} ${esc(a.temperament.map((t) => TEMPERAMENTS[t]?.label ?? t).join(', '))}` : null, named ? `🪧 ${named}` : null, a.memoir ? `📖 “${esc(a.memoir)}”` : null, a.funeral ? `⚱️ ${esc(a.funeral)}` : null].filter(Boolean));
    return `<li class="tree-gen"><div class="tree-head"><b>${esc(a.styled ?? a.name)}</b>${a.epithet ? ` <i>${esc(a.epithet)}</i>` : ''}${a.spouse ? ` <small>⚭ ${esc(a.spouse)}</small>` : ''}</div>
      <small class="muted">Generation ${a.generation} · ${a.born}–${a.died} (${a.age}) · ${esc(a.cause ?? '')} · left ${money(a.netWorth)}</small>
      ${facts.length ? `<div class="tree-facts"><small>${facts.join('<br>')}</small></div>` : ''}${kids}</li>`;
  }).join('');
  return card(`Family Tree · Generation ${l.generation}`, `<ol class="family-tree">${gens}<li class="tree-gen tree-you"><div class="tree-head"><b>${esc(state.character.firstName)} ${esc(state.character.lastName)}</b> <small>(you)</small></div></ol><p class="fine">The ${esc(state.character.lastName)} family since ${l.founderYear ?? '—'}. ⬇️ marks the child who carried the line on.</p>`, { icon: '🌳' });
}

/** How you'll be remembered: temperament, epithet so far, memoirs, things named after you. */
function rememberedCard(state) {
  const r = state.remembered ?? {};
  const t = r.temperament ?? [];
  const m = memoirEligibility(state);
  const named = (r.namedAfter ?? []).map((n) => `<li>🪧 ${esc(n.name)} <small class="muted">${esc(n.place ?? '')} · ${n.year}</small></li>`).join('');
  return card('How You\'ll Be Remembered', `${kv([
    ['Temperament', t.length ? t.map((id) => chip(`${TEMPERAMENTS[id].icon} ${TEMPERAMENTS[id].label}`)).join(' ') : '—'],
    ['If you died today', `${esc(state.character.firstName)} <i>${esc(epithetOf(state))}</i>`],
    ['Standing', `${standing(state)}/100`],
    ['Memoirs', r.memoir ? `“${esc(r.memoir.title)}” (${r.memoir.year}) · ${r.memoir.sold.toLocaleString()} copies` : 'Unwritten'],
  ])}
    ${named ? `<h4 class="sub">Named after you</h4><ul class="history">${named}</ul>` : ''}
    ${r.memoir ? '' : `<div class="action-grid">${button('📖 Write your memoirs', 'remembered.memoir', { arg: 'honest', variant: 'small', disabled: !m.ok, hint: m.ok ? 'Tell it straight' : m.reason })}${button('🗡️ A tell-all', 'remembered.memoir', { arg: 'tell', variant: 'small danger', disabled: !m.ok, hint: m.ok ? 'Sells better; someone in the family won\'t forgive you' : m.reason })}</div>`}
    <p class="fine">Streets, schools, scholarships, statues and airports are named after the famous, the powerful and the generous, each in its day. Your temperament may pass to the next generation.</p>`, { icon: '🕯️' });
}

/** Pets: who lives with you, and getting another. */
function petsCard(state) {
  const list = petsOf(state);
  const rows = list.map((p) => {
    const s = SPECIES[p.species];
    return `<li class="fund-row"><span><b>${s.icon} ${esc(p.name)}</b> <small>${esc(p.breed)} · age ${p.age} · bond ${p.bond}${p.adopted ? ' · rescue' : ''}</small></span>${button('Play', 'pets.play', { arg: p.id, variant: 'tiny', disabled: Boolean(state.yearly[`pets.play.${p.id}`]) })}${button('Rehome', 'pets.rehome', { arg: p.id, variant: 'tiny ghost' })}</li>`;
  }).join('');
  const opts = Object.entries(SPECIES).map(([id, s]) => ({ value: id, label: `${s.icon} ${s.label} — shelter ~$${s.adopt.toLocaleString()}, breeder ~$${s.buy.toLocaleString()}, ~$${s.cost.toLocaleString()}/yr${s.rural ? ' (needs land)' : ''}` }));
  const get = `<div class="enroll-form" data-collect-root>${select('sp', opts)}${select('how', [{ value: 'adopt', label: '🏠 From a shelter' }, { value: 'buy', label: '🏷️ From a breeder' }])}${button('🐾 Bring one home', 'pets.get', { variant: 'small', collect: true })}</div>`;
  const past = (state.petsPast ?? []).slice(-4).map((p) => `${SPECIES[p.species]?.icon ?? ''} ${esc(p.name)} (${p.age})`).join(' · ');
  return card('Pets', `${list.length ? `<ul class="funds">${rows}</ul>` : '<p class="muted">No animals at home.</p>'}
    ${get}
    ${past ? `<p class="fine">Remembered: ${past}</p>` : ''}`, { icon: '🐾' });
}

/** What your family lived through: call-ups, emigrations, revolutions, grandparents' stories. */
function familyHistoryCard(state) {
  const ev = familyHistory(state);
  if (!ev.length) return '';
  return card('Your Family in History', `<ul class="history">${[...ev].reverse().slice(0, 12).map((e) => `<li>${e.icon} <b>${e.year}</b> ${esc(e.text)}</li>`).join('')}</ul>`, { icon: '📜', summary: `${ev.length}` });
}

export function peopleView(state, ui = {}) {
  if (!state.people) return '';
  const all = people(state);
  const picked = all.find((p) => p.id === ui.person && p.alive);
  PICKED.id = picked?.id ?? null;
  const by = (...rel) => all.filter((p) => rel.includes(p.relation) && ageOf(state, p) >= 0);
  const family = by('mother', 'father', 'sibling');
  const kids = by('child');
  return `${picked ? personPanel(state, picked) : ''}${romance(state)}${familyHistoryCard(state)}
    ${group('Partner', '💑', by('partner', 'fiance', 'spouse').filter((p) => p.alive), state)}
    ${group('Children', '🧒', kids, state, kids.length ? '' : '')}
    ${parentingCard(state)}
    ${group('Family', '🏡', family, state)}
    ${elderCareCard(state)}
    ${laterLifeCard(state)}
    ${petsCard(state)}
    ${friendsCard(state, by('friend').filter((p) => p.alive))}
    ${group('Exes', '💔', by('ex'), state)}
    ${dynastyCard(state)}
    ${legacyCard(state)}
    ${rivalsCard(state)}${familyCard(state)}${familyLegacyCard(state)}${rememberedCard(state)}${lineage(state)}
    ${nameCard(state)}
    ${!living(state).length ? card('People', empty('Everyone you knew is gone.'), { icon: '🕯️' }) : ''}`;
}

/** Your name, any former names, and the deed poll. */
function nameCard(state) {
  const c = state.character;
  if (c.age < 18 && !c.formerNames?.length) return '';
  return card('Your Name', `${kv([
    ['Name', esc(`${c.firstName} ${c.lastName}`)],
    c.birthName ? ['Born', esc(`${c.birthName.firstName} ${c.birthName.lastName}`)] : null,
    c.formerNames?.length ? ['Former names', esc(c.formerNames.join(' · '))] : null,
  ].filter(Boolean))}
  ${c.age >= 18 && !state.royal ? `<div class="action-grid">${button('🪪 Change your name by deed poll', 'names.change', { hint: 'About $200 · once a year' })}</div>` : ''}`, { icon: '🪪' });
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

