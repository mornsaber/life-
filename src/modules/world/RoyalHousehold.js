/**
 * The royal household around a born-royal life: the family's titles, the heir
 * as a real person, growing up royal, the armed forces' honorary appointments,
 * the honours a monarch confers, and the Crown's powers when you wear it.
 *
 *   Titles      Your spouse takes a title by marriage (Queen, Princess of Cambria,
 *               Duchess of Albany…); your children and siblings are princes and
 *               princesses (or lords and ladies a generation further out); the
 *               monarch and consort in your family carry theirs. Japan's princesses
 *               leave the Imperial Family when they marry.
 *   The heir    Always a person: you, an older sibling, or — when you reign — your
 *               eldest child by the crown's law (a sibling or a cousin if you have none).
 *   Growing up  A christening, a first balcony, the school question, and at 18 the
 *               choice: the armed forces, university, or a year of charity work.
 *   The forces  Honorary ranks and colonelcies of regiments, rising with age; the
 *               monarch is head of the armed forces. Serving royals start as officers.
 *   Honours     A monarch confers titles and orders: dukedoms on children, the crown's
 *               great order, the personal order, honorary ranks — on family, friends
 *               and the deserving.
 *   Powers      Royal assent, the prerogative of mercy, dissolutions, investitures,
 *               royal warrants and the annual broadcast — and the reserved powers in
 *               a crisis (Crown.js).
 *
 * state.royal.household = { titled: { [personId]: title }, military: [str], rank,
 *   schooled, cameOfAge, conferred: n, heirId }
 */
import { CROWNS, ensureCrown, demise, royalStyledName, monarchName } from './Crown.js';
import { currentYear, yearlyCount, bumpYearly, addHonor } from '../../core/State.js';
import { eminence } from './Honours.js';
import { localUnitName } from './MilitaryLocal.js';
import { clamp } from '../../core/Random.js';
import { seatAppointee } from '../politics/Legislature.js';
import { standingOf } from './Ceremonial.js';
import { ageOf, people, living } from '../people/People.js';
import { enlist, enlistmentEligibility } from '../military/MilitaryEngine.js';
import { defaultMos } from '../military/MOS.js';

const g = (gender) => (gender === 'female' ? 1 : 0);

/** The crowns' great orders and personal orders, and their honorary ranks. */
export const ROYAL_ORDERS = {
  GB: { great: ['Order of the Garter', 'KG', 'LG'], personal: ['Royal Victorian Order', 'GCVO', 'GCVO'], knight: ['Sir', 'Dame'], forces: { army: 'Field Marshal', navy: 'Admiral of the Fleet', air: 'Marshal of the Royal Air Force' }, colonel: ['the Grenadier Guards', 'the Royal Welsh', 'the Rifles', 'the Royal Lancers', 'the Parachute Regiment', 'the Royal Marines', 'the Gurkha Brigade'], commodore: 'the Royal Naval Reserve', airCommodore: 'RAF Coningsby' },
  JP: { great: ['Supreme Order of the Chrysanthemum', '', ''], personal: ['Order of the Rising Sun', '', ''], knight: [null, null], forces: null, colonel: [], commodore: null, airCommodore: null },
  SE: { great: ['Royal Order of the Seraphim', 'RoKavKMO', 'LoKavKMO'], personal: ['Royal Order of the Polar Star', 'KNO', 'KNO'], knight: [null, null], forces: { army: 'General', navy: 'Admiral', air: 'General (Air Force)' }, colonel: ['the Life Guards', 'the Norrland Dragoons', 'the Skaraborg Regiment'], commodore: 'the Swedish Navy', airCommodore: 'the Skaraborg Wing' },
  NL: { great: ['Order of the Netherlands Lion (Grand Cross)', '', ''], personal: ['House Order of Orange', '', ''], knight: [null, null], forces: { army: 'General', navy: 'Admiral', air: 'General (Air Force)' }, colonel: ['the Garderegiment Grenadiers en Jagers', 'the Regiment Huzaren van Boreel', 'the Korps Mariniers'], commodore: 'the Royal Netherlands Navy', airCommodore: 'Volkel Air Base' },
  // Restored thrones (Houses.js) revive their dynastic orders.
  ...Object.fromEntries([['DE', 'Order of the Black Eagle', 'House Order of Hohenzollern'], ['FR', 'Order of the Holy Spirit', 'Order of Saint Michael'], ['IT', 'Supreme Order of the Most Holy Annunciation', 'Order of Saints Maurice and Lazarus'], ['AT', 'Order of the Golden Fleece (Austrian)', 'Order of St Stephen'], ['RU', 'Order of St Andrew the Apostle', 'Order of St Anna'], ['BR', 'Order of Pedro I', 'Order of the Rose'], ['RO', 'Order of Carol I', 'Order of the Crown of Romania']]
    .map(([cc, great, personal]) => [cc, { great: [great, '', ''], personal: [personal, '', ''], knight: [null, null], forces: { army: 'General', navy: 'Admiral', air: 'General (Air Force)' }, colonel: [], commodore: null, airCommodore: null }])),
  ES: { great: ['Order of the Golden Fleece', '', ''], personal: ['Order of Charles III', '', ''], knight: [null, null], forces: { army: 'Capitán General', navy: 'Capitán General de la Armada', air: 'Capitán General del Aire' }, colonel: ['the Regimiento Inmemorial del Rey', 'the Guardia Real', 'the Legión'], commodore: 'the Spanish Navy', airCommodore: 'the Ejército del Aire' },
};

/* ------------------------------------------------------------------ */
/* Titles                                                              */
/* ------------------------------------------------------------------ */

/** A family member's title, from your place in the family. Null for none. */
export function familyTitle(state, p) {
  const r = state.royal;
  if (!r || !p.alive) return p.title ?? null;
  // A title the sovereign granted is the holder's for life.
  if (p.granted) return p.granted;
  const def = CROWNS[r.crownId];
  const crown = state.world?.crowns?.[r.crownId];
  if (!def || !crown) return null;
  const stepped = r.steppedBack && !r.reigning;
  if (p.royal === 'monarch' && !crown.monarch.you && crown.monarch.name === p.firstName) return def.titles.monarch[g(p.gender)];
  if (p.relation === 'spouse') {
    if (r.crownId === 'JP' && state.character.gender === 'female') return null;
    if (r.reigning) return p.gender === 'female' ? def.titles.monarch[1] : def.titles.royal[0];
    if (stepped) return null;
    if (r.line === 1 && p.gender === 'female') return def.titles.heir[1];
    const duke = state.character.style?.peerage;
    if (duke && p.gender === 'female') return duke.replace(/^Duke/, 'Duchess');
    if (r.level === 'distant') return p.gender === 'female' ? def.titles.distant[1] : null;
    return p.gender === 'female' ? def.titles.royal[1] : null;
  }
  if (p.relation === 'child') {
    if (stepped) return null;
    // Japan: a princess who marries leaves the Imperial Family.
    if (r.crownId === 'JP' && state.character.gender === 'female' && !r.reigning) return null;
    const royalGen = r.reigning || ['heir', 'child'].includes(r.level);
    // A royal duke stays a prince: "Prince Henry, Duke of Kendal" (the dukedom rides in p.titles).
    if (royalGen) return def.titles.royal[g(p.gender)];
    if (r.level === 'grandchild') return def.titles.distant[g(p.gender)];
    return null;
  }
  if (p.relation === 'sibling') {
    if (p.royal === 'heir') return def.titles.heir[g(p.gender)];
    if (['heir', 'child'].includes(r.level) || r.reigning) return def.titles.royal[g(p.gender)];
    return r.level === 'grandchild' ? def.titles.royal[g(p.gender)] : null;
  }
  if ((p.relation === 'mother' || p.relation === 'father') && ['heir', 'child'].includes(r.level)) {
    const monarchParent = people(state).find((x) => x.royal === 'monarch');
    if (monarchParent && monarchParent.id !== p.id) return p.gender === 'female' ? def.titles.monarch[1] : def.titles.royal[0];
  }
  return p.title ?? null;
}

function syncTitles(ctx) {
  const { state } = ctx;
  const h = household(state);
  const r = state.royal;
  // Japan: an imperial princess who marries a commoner leaves the Imperial Family.
  if (r.crownId === 'JP' && state.character.gender === 'female' && !r.reigning && !r.steppedBack && living(state).some((p) => p.relation === 'spouse')) {
    Object.assign(r, { working: false, steppedBack: true });
    state.character.style = { ...(state.character.style ?? {}), prefix: null };
    ctx.log('On your marriage you left the Imperial Family, as the Imperial Household Law requires: no title, a one-off payment, and a private life.', '💍', 'milestone');
    ctx.earn(1400000, 'Imperial Household lump sum on leaving the family');
  }
  for (const p of people(state)) {
    if (!p.alive) continue;
    // A working royal's spouse with no title by marriage (a princess's husband) may be given one.
    if (p.relation === 'spouse' && !r.reigning && r.working && !r.steppedBack && !p.granted && !p.grantAsked && !familyTitle(state, p)) {
      p.grantAsked = true;
      const t = ctx.rng.chance(0.5) ? grantableTitle(r.crownId, p, ctx.rng) : null;
      if (t) {
        p.granted = t;
        ctx.log(`${monarchName(state, r.crownId)} gave ${p.firstName} a title on your marriage: ${t}.`, '👑', 'honor');
      }
    }
    const t = familyTitle(state, p);
    if (t === (p.title ?? null)) continue;
    const had = p.title;
    p.title = t ?? undefined;
    if (!t) delete p.title;
    h.titled[p.id] = t ?? null;
    if (t && p.relation === 'spouse') ctx.log(`On your marriage ${p.firstName} became ${/ of /.test(t) ? `${t}` : `${t} ${p.firstName}`}.`, '💍', 'milestone');
    else if (t && p.relation === 'child' && !had && ageOf(state, p) <= 1) ctx.log(`Your child was styled ${t} ${p.firstName} from birth.`, '👶', 'info');
    else if (!t && had && p.relation === 'spouse' && state.royal.crownId === 'JP') ctx.log(`${p.firstName} keeps no imperial title.`, '💍');
  }
}

/* ------------------------------------------------------------------ */
/* The heir                                                            */
/* ------------------------------------------------------------------ */

/** The heir among the living, by the crown's law: eldest first (sons first in Spain; sons only in Japan). */
function heirAmong(rule, list) {
  const byAge = [...list].sort((a, b) => b.ageOffset - a.ageOffset);
  if (rule === 'agnatic') return byAge.find((p) => p.gender === 'male') ?? null;
  if (rule === 'malePreference') return byAge.find((p) => p.gender === 'male') ?? byAge[0] ?? null;
  return byAge[0] ?? null;
}

function syncHeir(ctx) {
  const { state, rng } = ctx;
  const r = state.royal;
  const def = CROWNS[r.crownId];
  const crown = ensureCrown(state, r.crownId);
  const h = household(state);
  // A monarch's child is never an only child of the throne: a "child of the monarch" has an older sibling who is heir.
  if (r.level === 'child' && !h.heirMade && !r.reigning && r.line !== 1) {
    h.heirMade = true;
    const sib = heirAmong(def.rule, living(state).filter((p) => p.relation === 'sibling' && p.ageOffset > 0));
    const heir = sib ?? (() => {
      const gender = def.rule === 'agnatic' ? 'male' : rng.chance(0.5) ? 'male' : 'female';
      const p = { id: rng.id('per_'), firstName: rng.pick(def.names[gender]), lastName: state.character.lastName, gender, relation: 'sibling', ageOffset: rng.int(2, 9), relationship: rng.int(50, 85), alive: true, income: 0 };
      state.people.list.push(p);
      return p;
    })();
    heir.royal = 'heir';
    h.heirId = heir.id;
  }
  if (r.reigning) {
    const kids = living(state).filter((p) => p.relation === 'child');
    const sibs = living(state).filter((p) => p.relation === 'sibling');
    const heir = heirAmong(def.rule, kids) ?? heirAmong(def.rule, sibs);
    if (heir) {
      crown.heir = { name: heir.firstName, gender: heir.gender, age: Math.max(0, ageOf(state, heir)), relation: heir.relation === 'child' ? (heir.gender === 'female' ? 'daughter' : 'son') : heir.gender === 'female' ? 'sister' : 'brother', personId: heir.id };
      for (const p of people(state)) if (p.royal === 'heir' && p.id !== heir.id) delete p.royal;
      heir.royal = 'heir';
    } else if (!crown.heir?.cousin) {
      crown.heir = { name: rng.pick(def.names.male), gender: 'male', age: Math.max(18, state.character.age - rng.int(-5, 15)), relation: 'cousin', cousin: true };
    }
    return;
  }
  const heirP = h.heirId ? people(state).find((p) => p.id === h.heirId) : null;
  if (heirP?.alive && heirP.royal === 'heir' && crown.heir?.personId !== heirP.id && !crown.heir?.you) {
    crown.heir = { name: heirP.firstName, gender: heirP.gender, age: ageOf(state, heirP), relation: heirP.gender === 'female' ? 'daughter' : 'son', personId: heirP.id };
  }
  if (heirP && !heirP.alive && heirP.royal === 'heir') {
    // The heir died: you move up.
    delete heirP.royal;
    if (r.line > 1) r.line -= 1;
    if (r.line === 1) {
      crown.heir = { name: state.character.firstName, gender: state.character.gender, age: state.character.age, relation: 'you', you: true };
      ctx.log(`With ${heirP.firstName}'s death you are heir to the throne.`, '👑', 'milestone');
    }
  }
  if (crown.heir?.personId) {
    const p = people(state).find((x) => x.id === crown.heir.personId);
    if (p) crown.heir.age = Math.max(0, ageOf(state, p));
  }
}

/** The monarch in your family dies with the family: the Crown and the family tree agree. */
function syncMonarchParent(ctx) {
  const { state } = ctx;
  const r = state.royal;
  const crown = state.world.crowns[r.crownId];
  const parent = people(state).find((p) => p.royal === 'monarch');
  if (!parent) return;
  if (!parent.alive && crown.monarch.name === parent.firstName && !crown.monarch.you) {
    delete parent.royal;
    demise(ctx, r.crownId, 'died');
    syncNewMonarch(state);
  } else if (parent.alive && crown.monarch.name !== parent.firstName) {
    // The Crown passed on (death in the reign roll): the parent is gone too.
    parent.alive = false;
    parent.diedAge = ageOf(state, parent);
    delete parent.royal;
    syncNewMonarch(state);
  }
}
/** A sibling who was heir now reigns. */
function syncNewMonarch(state) {
  const crown = state.world.crowns[state.royal.crownId];
  const sib = people(state).find((p) => p.royal === 'heir' && p.alive && p.firstName === crown.monarch.name);
  if (sib) sib.royal = 'monarch';
}

/* ------------------------------------------------------------------ */
/* The armed forces                                                    */
/* ------------------------------------------------------------------ */

const HONORARY = [
  [21, ['Captain', 'Lieutenant', 'Flight Lieutenant']],
  [30, ['Lieutenant Colonel', 'Commander', 'Wing Commander']],
  [40, ['Colonel', 'Captain (Navy)', 'Group Captain']],
  [50, ['Major General', 'Rear Admiral', 'Air Vice-Marshal']],
  [60, ['General', 'Admiral', 'Air Chief Marshal']],
];
function militaryYear(ctx) {
  const { state, rng } = ctx;
  const r = state.royal;
  const o = ROYAL_ORDERS[r.crownId];
  const h = household(state);
  if (!o?.forces || !(r.working || r.reigning) || r.line == null || (r.line > 12 && !r.reigning)) return;
  const age = state.character.age;
  // Colonelcies and commodore-in-chief posts, a few in a lifetime.
  if (age >= 21 && h.military.length < (r.reigning ? 8 : r.line <= 4 ? 5 : 2) && rng.chance(r.reigning ? 0.5 : 0.15)) {
    const pool = [...o.colonel.map((c) => `Colonel-in-Chief of ${c}`), o.commodore && `Commodore-in-Chief of ${o.commodore}`, o.airCommodore && `Honorary Air Commodore of ${o.airCommodore}`].filter((x) => x && !h.military.includes(x));
    const post = rng.pick(pool);
    if (post) {
      h.military.push(post);
      ctx.log(`You were appointed ${post}.`, '🎖️', 'honor');
    }
  }
  // Honorary rank, rising with age (the heir and the monarch's children reach the top).
  const step = [...HONORARY].reverse().find(([a]) => age >= a);
  if (step && !r.reigning) {
    const cap = r.line <= 4 ? 4 : 2;
    const idx = Math.min(HONORARY.indexOf(step), cap);
    const branch = h.branch ?? (h.branch = rng.pick([0, 0, 1, 2]));
    const rank = `Honorary ${HONORARY[idx][1][branch]}`;
    if (h.rank !== rank) {
      h.rank = rank;
      ctx.log(`You were promoted to the honorary rank of ${HONORARY[idx][1][branch]}.`, '🎖️', 'honor');
    }
  }
  if (r.reigning && !h.supreme) {
    h.supreme = true;
    h.rank = `Head of the Armed Forces · ${o.forces.army}, ${o.forces.navy} and ${o.forces.air}`;
    ctx.log(`As sovereign you became head of the armed forces: ${o.forces.army}, ${o.forces.navy} and ${o.forces.air}.`, '🎖️', 'honor');
  }
}

/* ------------------------------------------------------------------ */
/* Growing up royal                                                    */
/* ------------------------------------------------------------------ */

function childhood(ctx) {
  const { state, rng } = ctx;
  const r = state.royal;
  const def = CROWNS[r.crownId];
  const h = household(state);
  const age = state.character.age;
  if (r.level === 'distant') return;
  if (age === 1 && !h.christened) {
    h.christened = true;
    ctx.log(`Your christening at ${def.palace}: crowds outside, godparents from three royal houses.`, '👶', 'milestone');
  }
  if (age === 4) ctx.log('Your first appearance on the palace balcony. The crowd roared; you waved at the planes.', '🎈', 'good');
  if (age === 12 && !h.schooled && !state.prompts.some((p) => p.type === 'royalHousehold.school')) {
    ctx.prompt({ type: 'royalHousehold.school', icon: '🏫', title: 'Where to Send You', text: 'The family must decide your schooling: tradition, or a little normality?', options: [
      { id: 'boarding', label: '🏰 A strict boarding school in the Highlands', hint: 'Character building' },
      { id: 'day', label: '🏫 A day school in the capital', hint: 'Home at night, cameras at the gate' },
      { id: 'abroad', label: '✈️ An international school abroad', hint: 'Out of the papers' },
    ] });
  }
  if (age === 18 && !h.cameOfAge && !state.prompts.some((p) => p.type === 'royalHousehold.comingOfAge')) {
    ctx.prompt({ type: 'royalHousehold.comingOfAge', icon: '🎂', title: 'Coming of Age', text: `You turn eighteen: ${r.line === 1 ? 'the heir must be seen to serve' : 'the family expects you to do something useful'}. What next?`, options: [
      { id: 'forces', label: '🎖️ Join the armed forces as an officer cadet', hint: 'A royal tradition' },
      { id: 'university', label: '🎓 University first', hint: 'The papers will follow you to lectures' },
      { id: 'charity', label: '🌍 A gap year of charity work abroad' },
    ] });
  }
}

/* ------------------------------------------------------------------ */
/* The monarch's powers                                                */
/* ------------------------------------------------------------------ */

const BILLS = ['a bill to abolish the upper house\'s veto', 'a bill to extend the government\'s emergency powers', 'a bill to cut the royal grant', 'a bill to disestablish the national church', 'a bill on assisted dying', 'a bill to curb the press', 'a bill to lower the voting age'];
function powersYear(ctx) {
  const { state, rng } = ctx;
  const r = state.royal;
  if (!r.reigning || state.prompts.some((p) => p.type.startsWith('royalHousehold.'))) return;
  const roll = rng.float(0, 1);
  if (roll < 0.25) {
    const bill = rng.pick(BILLS);
    ctx.prompt({ type: 'royalHousehold.assent', icon: '📜', title: 'Royal Assent', text: `Parliament has passed ${bill}. It needs your assent to become law. No sovereign has refused assent in centuries.`, options: [
      { id: 'assent', label: '✍️ Grant assent', hint: 'The constitutional thing' },
      { id: 'counsel', label: '🗣️ Assent — after warning the prime minister in private' },
      { id: 'refuse', label: '🚫 Refuse assent', tone: 'danger', hint: 'A constitutional crisis' },
    ], data: { bill } });
  } else if (roll < 0.4) {
    ctx.prompt({ type: 'royalHousehold.mercy', icon: '🕊️', title: 'The Prerogative of Mercy', text: `A petition for mercy reaches you: ${rng.pick(['a soldier jailed for a battlefield killing', 'a pensioner who helped her dying husband end his life', 'a protester given an exemplary sentence', 'a man wrongly convicted thirty years ago'])}. The minister advises ${rng.chance(0.5) ? 'clemency' : 'no clemency'}.`, options: [
      { id: 'pardon', label: '🕊️ Grant a royal pardon' },
      { id: 'advice', label: '📋 Follow the minister\'s advice' },
    ] });
  } else if (roll < 0.5) {
    ctx.prompt({ type: 'royalHousehold.dissolve', icon: '🗳️', title: 'A Request to Dissolve', text: 'The prime minister asks you to dissolve parliament for a snap election, two years early, while the polls are good.', options: [
      { id: 'grant', label: '✅ Grant the dissolution' },
      { id: 'refuse', label: '🚫 Refuse — another government is possible', tone: 'danger' },
    ] });
  } else if (roll < 0.62) {
    ctx.prompt({ type: 'royalHousehold.broadcast', icon: '📺', title: 'The Annual Broadcast', text: 'Your broadcast to the nation goes out at the turn of the year. What do you speak about?', options: [
      { id: 'service', label: '🤝 Service and duty' },
      { id: 'family', label: '👨‍👩‍👧 Your family\'s year, frankly' },
      { id: 'climate', label: '🌍 The planet', hint: 'Some will call it political' },
      { id: 'unity', label: '🕊️ Unity after a divisive year' },
    ] });
  }
}

/* ------------------------------------------------------------------ */
/* Honours the monarch confers                                         */
/* ------------------------------------------------------------------ */

/**
 * A title the sovereign can grant someone in the family who has none: an earldom in Britain
 * (as for a princess's husband), a duchy in Sweden and Spain, a Dutch prince's or princess's
 * title by royal decree. Japan's peerage was abolished in 1947: nothing to grant.
 */
const EARLDOMS = { GB: ['Snowdon', 'Ulster', 'Forfar', 'Inverness', 'Merioneth', 'Dumbarton', 'St Andrews'] };
export function grantableTitle(crownId, p, rng) {
  const def = CROWNS[crownId];
  const female = p.gender === 'female';
  if (crownId === 'JP' || !def) return null;
  if (crownId === 'NL') return `${female ? 'Princess' : 'Prince'} of Orange-Nassau`;
  if (crownId === 'GB') return `${female ? 'Countess' : 'Earl'} of ${rng.pick(EARLDOMS.GB)}`;
  return def.dukedoms.length ? `${female ? 'Duchess' : 'Duke'} of ${rng.pick(def.dukedoms)}` : null;
}

/** Noble titles the crown still creates, lowest first: Britain's peerage and Spain's títulos del Reino. */
export const PEERAGE_GRANTS = {
  GB: { ranks: [['Baron', 'Baroness'], ['Viscount', 'Viscountess'], ['Earl', 'Countess'], ['Marquess', 'Marchioness']], surname: 2, of: 'of', places: ['Ashby', 'Kendal', 'Wroxham', 'Malvern', 'Hexham', 'Alnwick', 'Tavistock', 'Lyndhurst', 'Ripon', 'Ludlow'], life: true },
  ES: { ranks: [['Barón', 'Baronesa'], ['Vizconde', 'Vizcondesa'], ['Conde', 'Condesa'], ['Marqués', 'Marquesa'], ['Duque', 'Duquesa']], surname: 0, of: 'de', places: ['Almenara', 'Villaverde', 'Peñafiel', 'Torrelaguna', 'Aracena', 'Belmonte', 'Valdeflores'], life: false },
};
/** The royal family itself: they get royal titles and dukedoms, not peerages. */
const ROYAL_KIN = ['spouse', 'child', 'grandchild', 'sibling', 'niece', 'nephew', 'mother', 'father'];

/** The next title a person would get: a first peerage, or the step up from the one they hold. */
export function nextPeerage(crownId, p) {
  const g0 = PEERAGE_GRANTS[crownId];
  if (!g0) return null;
  const idx = p.peerage ? p.peerage.idx + 1 : 0;
  if (idx >= g0.ranks.length) return null;
  return { idx, rank: g0.ranks[idx][p.gender === 'female' ? 1 : 0] };
}

/** Who you can honour, and with what. */
export function conferOptions(state) {
  const r = state.royal;
  if (!r?.reigning) return [];
  const o = ROYAL_ORDERS[r.crownId];
  const def = CROWNS[r.crownId];
  const out = [];
  for (const p of living(state)) {
    const age = ageOf(state, p);
    if (age < 18) continue;
    const has = p.honours ?? [];
    if (p.relation === 'child' && !p.dukedom && def.dukedoms.length) out.push({ person: p, id: 'dukedom', label: `👑 Create ${p.firstName} a royal ${p.gender === 'female' ? 'duchess' : 'duke'}` });
    else if (!p.title && !p.granted && r.crownId !== 'JP' && ['spouse', 'child', 'grandchild', 'sibling', 'niece', 'nephew', 'mother', 'father'].includes(p.relation)) out.push({ person: p, id: 'title', label: `👑 Grant ${p.firstName} a title` });
    if (['child', 'spouse', 'sibling', 'friend', 'bestFriend', 'mother', 'father'].includes(p.relation) && !has.includes('great')) out.push({ person: p, id: 'great', label: `🎗️ Appoint ${p.firstName} to the ${o.great[0]}` });
    if (['friend', 'bestFriend', 'coworker', 'mentor'].includes(p.relation) && !has.includes('personal')) out.push({ person: p, id: 'personal', label: `⭐ Appoint ${p.firstName} to the ${o.personal[0]}${o.knight[0] ? ` (a knighthood)` : ''}` });
    if (['friend', 'bestFriend', 'sibling', 'child'].includes(p.relation) && !has.includes('honoraryRank') && o.colonel.length) out.push({ person: p, id: 'honoraryRank', label: `🎖️ Make ${p.firstName} Honorary Colonel of ${o.colonel[0]}` });
    // A peerage for anyone outside the royal family; a step up for a peer already made.
    const next = !ROYAL_KIN.includes(p.relation) && !p.peerage?.life && nextPeerage(r.crownId, p);
    if (next) out.push({ person: p, id: 'peerage', label: p.peerage ? `🎩 Raise ${p.firstName} to ${next.rank}` : `🎩 Create ${p.firstName} a hereditary ${next.rank}` });
    if (!ROYAL_KIN.includes(p.relation) && !p.peerage && PEERAGE_GRANTS[r.crownId]?.life) out.push({ person: p, id: 'lifePeerage', label: `🏛️ Make ${p.firstName} a life peer (a seat in the Lords)` });
  }
  // Titles and dukedoms first: they're the rarest gifts.
  const rank = (o) => (['dukedom', 'title'].includes(o.id) ? 0 : ['peerage', 'lifePeerage'].includes(o.id) ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b));
}

function confer(ctx, arg) {
  const { state, rng } = ctx;
  const r = state.royal;
  if (!r?.reigning) return ctx.toast('Only the sovereign confers honours.', 'warn');
  if (yearlyCount(state, 'royalHousehold.confer') >= 3) return ctx.toast('Three honours a year from the sovereign\'s own hand.', 'warn');
  const o = ROYAL_ORDERS[r.crownId];
  const def = CROWNS[r.crownId];
  const h = household(state);
  if (arg === 'public') {
    bumpYearly(state, 'royalHousehold.confer');
    const who = rng.pick(['a nurse who ran a hospice for forty years', 'a veteran who raised millions for wounded soldiers', 'the national football captain', 'a scientist behind a new vaccine', 'a lifeboat coxswain', 'a retired prime minister', 'a novelist loved by three generations']);
    r.popularity = Math.min(100, r.popularity + 1);
    h.conferred = (h.conferred ?? 0) + 1;
    return ctx.log(`You appointed ${who} to the ${rng.chance(0.3) ? o.great[0] : o.personal[0]}.`, '🎗️', 'honor');
  }
  const [id, kind] = String(arg).split('|');
  const opt = conferOptions(state).find((x) => x.person.id === id && x.id === kind);
  if (!opt) return ctx.toast('That honour isn\'t yours to give them.', 'warn');
  bumpYearly(state, 'royalHousehold.confer');
  const p = opt.person;
  p.honours = [...(p.honours ?? []), kind];
  h.conferred = (h.conferred ?? 0) + 1;
  if (kind === 'dukedom') {
    const place = rng.pick(def.dukedoms);
    p.dukedom = `${p.gender === 'female' ? 'Duchess' : 'Duke'} of ${place}`;
    p.titles = [...(p.titles ?? []).filter((t) => t !== p.dukedom), p.dukedom];
    return ctx.log(`You created ${p.firstName} ${p.dukedom}.`, '👑', 'honor');
  }
  if (kind === 'title') {
    const t = p.relation === 'spouse' && p.gender === 'male' && r.crownId === 'GB' ? 'Prince' : grantableTitle(r.crownId, p, rng);
    if (!t) return undefined;
    p.granted = t;
    p.title = t;
    return ctx.log(`By letters patent you made ${p.firstName} ${/ of /.test(t) ? t : `${t} ${p.firstName}`}.`, '👑', 'honor');
  }
  if (kind === 'great') return ctx.log(`You appointed ${p.firstName} to the ${o.great[0]}${o.great[1] ? ` (${p.gender === 'female' ? o.great[2] : o.great[1]})` : ''}.`, '🎗️', 'honor');
  if (kind === 'personal') {
    const knight = o.knight[g(p.gender)];
    if (knight && !p.title) p.title = knight;
    if (['friend', 'bestFriend'].includes(p.relation)) { r.popularity = Math.max(0, r.popularity - 1); p.relationship = clamp((p.relationship ?? 60) + 10, 0, 100); }
    return ctx.log(`You appointed ${p.firstName} to the ${o.personal[0]}${knight ? ` — now ${knight} ${p.firstName}` : ''}. The papers noticed it was a friend.`, '⭐', 'honor');
  }
  if (kind === 'honoraryRank') return ctx.log(`You made ${p.firstName} Honorary Colonel of ${o.colonel[0]}.`, '🎖️', 'honor');
  if (kind === 'peerage' || kind === 'lifePeerage') {
    const g0 = PEERAGE_GRANTS[r.crownId];
    const life = kind === 'lifePeerage';
    const next = life ? { idx: 0, rank: g0.ranks[0][p.gender === 'female' ? 1 : 0] } : nextPeerage(r.crownId, p);
    if (!next) return undefined;
    // Barons and viscounts take the family name in Britain; the rest a place.
    const place = p.peerage?.place ?? rng.pick(g0.places);
    const title = next.idx < g0.surname || life ? `${next.rank} ${p.lastName}` : `${next.rank} ${g0.of} ${place}`;
    p.titles = [...(p.titles ?? []).filter((t) => t !== p.peerage?.title), title];
    p.peerage = { idx: next.idx, title, place, life, seat: life || undefined };
    // A life peer takes a real seat in the Lords: a named member who owes you a favour.
    if (life) seatAppointee(state, `upper_${r.crownId}`, r.crownId, p, { rng, title: `${title} (${p.firstName} ${p.lastName})` });
    p.relationship = clamp((p.relationship ?? 60) + 8, 0, 100);
    // Ennobling your own circle is noticed.
    if (['friend', 'bestFriend', 'partner', 'coworker'].includes(p.relation)) r.popularity = Math.max(0, r.popularity - 2);
    return ctx.log(life
      ? `On your sign manual ${p.firstName} ${p.lastName} was created a life peer, ${title}, and took a seat in the House of Lords.`
      : `By letters patent you created ${p.firstName} ${p.lastName} ${title}${next.idx ? '' : ', a hereditary title that will pass to their heir'}.`, '🎩', 'honor');
  }
  return undefined;
}

/* ------------------------------------------------------------------ */

export const household = (state) => {
  state.royal.household ??= { titled: {}, military: [], rank: null };
  return state.royal.household;
};

export const RoyalHouseholdModule = {
  id: 'royalHousehold',
  // After the Crown (33.5) has run the reign and the royal's year.
  order: 33.6,
  onAgeUp(ctx) {
    const { state } = ctx;
    const r = state.royal;
    if (!r || r.popularity == null || !state.world?.crowns?.[r.crownId]) return;
    syncMonarchParent(ctx);
    syncHeir(ctx);
    syncTitles(ctx);
    childhood(ctx);
    militaryYear(ctx);
    powersYear(ctx);
  },
  actions: {
    /** arg: 'personId|kind' or 'public'. */
    confer,
    investiture(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!r?.reigning && !(r?.working && r.line != null && r.line <= 4 && state.character.age >= 25)) return ctx.toast('Investitures are held by the sovereign and senior royals.', 'warn');
      if (yearlyCount(state, 'royalHousehold.investiture') >= 2) return ctx.toast('Two investitures a year.', 'warn');
      bumpYearly(state, 'royalHousehold.investiture');
      r.popularity = Math.min(100, r.popularity + 1);
      ctx.stat('stress', 2);
      ctx.log(`You held an investiture: ${ctx.rng.int(60, 110)} people knighted, decorated or appointed to orders, each with a word from you.`, '⚔️', 'good');
      return undefined;
    },
    warrant(ctx) {
      const { state, rng } = ctx;
      const r = state.royal;
      if (!r?.reigning && !(r?.working && r.line === 1)) return ctx.toast('Royal warrants come from the sovereign (and the heir).', 'warn');
      if (yearlyCount(state, 'royalHousehold.warrant')) return ctx.toast('One warrant a year.', 'warn');
      bumpYearly(state, 'royalHousehold.warrant');
      const firm = rng.pick(['a family marmalade maker', 'a saddler', 'a tea merchant', 'a shoemaker', 'a gin distillery', 'a florist', 'a tweed mill']);
      ctx.log(`You granted a royal warrant to ${firm}: "By Appointment" on every jar and box.`, '🏷️', 'good');
      return undefined;
    },
    serve(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!r || state.character.age < 18 || state.character.age > 30) return ctx.toast('Royals serve between 18 and 30.', 'warn');
      return joinForces(ctx);
    },
  },
  resolvers: {
    school(ctx, data, optionId) {
      const { state } = ctx;
      household(state).schooled = optionId;
      const r = state.royal;
      if (optionId === 'boarding') { ctx.stat('fitness', 4); ctx.stat('happiness', -3); r.popularity = Math.min(100, r.popularity + 2); }
      if (optionId === 'day') { ctx.stat('happiness', 3); }
      if (optionId === 'abroad') { ctx.stat('smarts', 3); r.popularity = Math.max(0, r.popularity - 2); }
      ctx.log({ boarding: 'Off to boarding school: cold showers, cross-country runs and no special treatment (much).', day: 'A day school in the capital: protection officers at the back of every class.', abroad: 'An international school abroad, where nobody much cared who you were.' }[optionId] ?? '', '🏫', 'info');
    },
    comingOfAge(ctx, data, optionId) {
      const { state } = ctx;
      household(state).cameOfAge = optionId;
      const r = state.royal;
      if (optionId === 'forces') return joinForces(ctx);
      if (optionId === 'university') { r.popularity = Math.min(100, r.popularity + 1); return ctx.log('You chose university first. The press agreed to leave you alone — mostly.', '🎓', 'info'); }
      r.popularity = Math.min(100, r.popularity + 3);
      ctx.stat('happiness', 4);
      return ctx.log('A year building schools abroad. The photographs did you no harm at all.', '🌍', 'good');
    },
    assent(ctx, data, optionId) {
      const { state, rng } = ctx;
      const r = state.royal;
      // A ruling monarch's veto is policy, not a constitutional crisis.
      if (optionId === 'refuse' && r.executive) {
        r.popularity = Math.max(0, r.popularity - 4);
        r.unrest = Math.min(100, (r.unrest ?? 0) + 6);
        return ctx.log(`You vetoed ${data.bill}. It's within your powers now; the opposition calls it tyranny.`, '⚖️', 'warn');
      }
      if (optionId === 'refuse') {
        r.popularity = Math.max(0, r.popularity - 20);
        state.world.crises = [...(state.world.crises ?? []).slice(-5), { year: currentYear(state), cc: r.crownId, id: 'assent', choice: 'refuse', you: true }];
        if (rng.chance(0.25)) for (const cc of CROWNS[r.crownId].realms) (state.world.pendingReferendum ??= {})[cc] = currentYear(state) + 1;
        return ctx.log(`You refused assent to ${data.bill}. Parliament is in uproar; the government talks of ending the monarchy's role altogether.`, '⚖️', 'bad');
      }
      if (optionId === 'counsel') return ctx.log(`You assented to ${data.bill} — and told the prime minister exactly what you thought of it.`, '📜', 'info');
      return ctx.log(`You gave royal assent to ${data.bill}.`, '📜', 'info');
    },
    mercy(ctx, data, optionId) {
      const r = ctx.state.royal;
      const d = optionId === 'pardon' ? (ctx.rng.chance(0.6) ? 3 : -4) : 0;
      r.popularity = Math.round(clamp(r.popularity + d, 0, 100));
      ctx.log(optionId === 'pardon' ? `You granted a royal pardon. ${d > 0 ? 'The public cheered.' : 'The government was furious.'}` : 'You followed the minister\'s advice.', '🕊️', d < 0 ? 'warn' : 'info');
    },
    dissolve(ctx, data, optionId) {
      const r = ctx.state.royal;
      if (optionId === 'refuse') {
        const good = ctx.rng.chance(0.35);
        r.popularity = Math.round(clamp(r.popularity + (good ? 4 : -12), 0, 100));
        return ctx.log(`You refused the dissolution. ${good ? 'Another leader formed a government; history may thank you.' : 'The prime minister resigned in protest and the papers accused you of meddling.'}`, '⚖️', good ? 'good' : 'warn');
      }
      return ctx.log('You granted the dissolution: an election in five weeks.', '🗳️', 'info');
    },
    broadcast(ctx, data, optionId) {
      const r = ctx.state.royal;
      const d = { service: 2, family: ctx.rng.chance(0.5) ? 5 : -3, climate: ctx.rng.chance(0.5) ? 4 : -4, unity: 3 }[optionId] ?? 0;
      r.popularity = Math.round(clamp(r.popularity + d, 0, 100));
      ctx.log(`Your broadcast on ${{ service: 'service and duty', family: 'your family\'s year', climate: 'the planet', unity: 'unity' }[optionId]} was watched by millions. Popularity ${r.popularity}%.`, '📺', d >= 0 ? 'good' : 'warn');
    },
  },
};

function joinForces(ctx) {
  const { state } = ctx;
  const branch = 'army';
  const check = enlistmentEligibility(state, branch, 'officer', 'active');
  if (!check.ok) {
    household(state).served = 'blocked';
    return ctx.log(`You wanted to serve, but couldn't: ${check.reason}.`, '🎖️', 'warn');
  }
  // Royals traditionally go to a cavalry or line regiment, or learn to fly.
  const specialty = ['armor', 'infantry', 'aviation', 'logistics'].find((s) => defaultMos(branch, 'officer', s));
  if (!specialty || !enlist(ctx, { branch, track: 'officer', component: 'active', specialty, cleared: true })) {
    household(state).served = 'blocked';
    return ctx.log('You wanted to serve, but the forces couldn\'t find you a place this year.', '🎖️', 'warn');
  }
  state.military.service.royal = true;
  household(state).served = 'serving';
  state.royal.popularity = Math.min(100, state.royal.popularity + 4);
  ctx.log(`${royalStyledName(state) ?? 'You'} began officer training — protection officers in the next bunk.`, '🎖️', 'milestone');
  return undefined;
}

/** For the Royal Life card: the honorary posts and rank. */
export const militaryPosts = (state) => {
  const h = state.royal?.household;
  return h ? { rank: h.rank, posts: h.military ?? [] } : { rank: null, posts: [] };
};

/* ------------------------------------------------------------------ */
/* Honorary ranks for everyone else                                    */
/* ------------------------------------------------------------------ */

/**
 * The armed forces' honorary appointments for people outside them: eminent
 * civilians become Honorary Colonel of a regiment (or Honorary Captain in the
 * navy reserve, Honorary Air Commodore of a station), and retired senior
 * officers become Colonel of their old regiment. Ceremonial — mess dinners,
 * parades, a uniform you may wear — and they count as honours.
 */
export const HonoraryModule = {
  id: 'honoraryRanks',
  order: 33.8,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const age = state.character.age;
    // Appointments run for a term (five years, renewable once); a Colonel of the Regiment serves to 70.
    for (const h of state.honors.filter((x) => x.source === 'honoraryRank' && !state.royal)) {
      h.until ??= h.colonelOf ? 70 : age + 5;
      if (age < h.until) continue;
      // A post held well is renewed; one neglected is not.
      if (!h.colonelOf && !h.renewed && rng.chance(Math.min(0.9, 0.15 + standingOf(state, h.id) / 100))) {
        h.renewed = true;
        h.until = age + 5;
        ctx.log(`Your appointment as ${h.name} was extended for another five years.`, '🎖️', 'good');
      } else {
        state.honors = state.honors.filter((x) => x !== h);
        state.honoraryPast = [...(state.honoraryPast ?? []), h.name];
        ctx.log(`Your term as ${h.name} came to an end. The regiment dined you out.`, '🎖️', 'info');
      }
    }
    if (state.royal || age < 40 || age > 80 || state.legal.incarceration || state.military.service) return;
    const held = state.honors.filter((h) => h.source === 'honoraryRank');
    if (held.length >= 2) return;
    const cc = state.character.countryId ?? 'US';
    const retiredFlag = (state.military.history ?? []).some((h) => h.track === 'officer' && (h.grade ?? 0) >= 6 && (h.nation ?? 'US') === cc);
    const score = eminence(state);
    if (!retiredFlag && score < 140) return;
    if (!rng.chance(retiredFlag ? 0.08 : Math.min(0.06, score / 5000))) return;
    const unit = localUnitName(cc, rng.pick(['army', 'army', 'navy', 'airforce']), rng) ?? rng.pick(['the 1st Cavalry Regiment', 'the 3rd Infantry Regiment', 'a Naval Reserve center', 'an Air National Guard wing']);
    const name = retiredFlag ? `Colonel of the Regiment — ${unit}` : /Flotilla|HMS|HMAS|HMCS|HMNZS|INS|Fregatte|Navy|Naval/.test(unit) ? `Honorary Captain — ${unit}` : /Wing|Squadron|Air/.test(unit) ? `Honorary Air Commodore — ${unit}` : `Honorary Colonel — ${unit}`;
    if ((state.honoraryPast ?? []).includes(name)) return;
    addHonor(state, { id: `honorary.${held.length}.${age}`, source: 'honoraryRank', name, icon: '🎖️', precedence: 7, prestige: 12, until: retiredFlag ? Math.max(age + 5, 70) : age + 5, colonelOf: retiredFlag, citation: retiredFlag ? 'The regiment asked its old officer to be its Colonel: guardian of its traditions, at its parades and its funerals.' : 'For services to the nation: an honorary appointment to the armed forces, with the right to wear the uniform on ceremonial occasions.' });
    ctx.log(`You were appointed ${name}.`, '🎖️', 'honor');
  },
};
