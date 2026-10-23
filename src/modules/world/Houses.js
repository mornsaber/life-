/**
 * Former ruling houses, and the monarchy as a question a country can reopen.
 *
 *   Houses       The dynasties that lost their thrones and kept their claims: Hohenzollern
 *                (Germany, 1918), Orléans (France, 1848), Savoy (Italy, 1946), Habsburg-Lorraine
 *                (Austria, 1918 — where using the title is still against the law), Romanov
 *                (Russia, 1917), Orléans-Braganza (Brazil, 1889) and the royal house of Romania
 *                (1947). The head of a house is a pretender: no state, but a court of sorts, a
 *                following, and dynastic orders to confer (a fons honorum).
 *   Restoration  Monarchists campaign; when support runs high enough, or a head of government
 *                calls one, the country votes. A yes brings the throne back — to the head of the
 *                house, who may be you.
 *   Abolition    A head of government in a monarchy can put a republic to the people. If it
 *                passes, the royal family becomes a former ruling house.
 *   Orders       Noble and royal birth opens the Order of Malta's Honour and Devotion grades
 *                (IntlOrgs.js) and the dynastic Sacred Military Constantinian Order of St George.
 *
 * state.house = { cc, name, surname, rank: 'head'|'heir'|'cadet', holderId, renounced, conferred, campaigns }
 * state.world.monarchists = { [cc]: support % }; state.world.restored = { [cc]: { year, house } }
 */
import { addHonor, currentYear, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { CROWNS, ensureCrown, crownOf, monarchName } from './Crown.js';
import { OFFICES } from '../politics/Offices.js';
import { COUNTRIES } from './Countries.js';
import { living } from '../people/People.js';

export const FORMER_HOUSES = {
  DE: { name: 'Hohenzollern', surname: 'von Preußen', head: ['Prince of Prussia', 'Princess of Prussia'], style: ['Prince', 'Princess'], fell: 1918, how: 'the November Revolution', order: 'Order of the Black Eagle', support: 4, legal: 'Since 1919 a noble title is only part of the surname ("Prinz von Preußen").' },
  FR: { name: 'Orléans', surname: 'd\'Orléans', head: ['Count of Paris', 'Countess of Paris'], style: ['Prince', 'Princess'], fell: 1848, how: 'the February Revolution', order: 'Order of Saint Michael', support: 3, legal: 'The Republic recognises no titles; courtesy keeps them alive.' },
  IT: { name: 'Savoy', surname: 'di Savoia', head: ['Duke of Savoy', 'Duchess of Savoy'], style: ['Prince', 'Princess'], fell: 1946, how: 'the 1946 institutional referendum', order: 'Order of Saints Maurice and Lazarus', support: 8, legal: 'The Constitution recognises no titles of nobility.' },
  AT: { name: 'Habsburg-Lorraine', surname: 'Habsburg-Lothringen', head: ['Head of the House of Habsburg', 'Head of the House of Habsburg'], style: ['Archduke', 'Archduchess'], fell: 1918, how: 'the collapse of the Empire', order: 'Order of the Golden Fleece', support: 3, banned: true, legal: 'Austria abolished nobility in 1919: using the title at home is an offence (a fine).' },
  RU: { name: 'Romanov', surname: 'Romanov', head: ['Head of the Imperial House of Russia', 'Head of the Imperial House of Russia'], style: ['Grand Duke', 'Grand Duchess'], fell: 1917, how: 'the Revolution', order: 'Order of St Andrew the Apostle', support: 10, legal: 'The state recognises no titles; the Church and the émigrés do.' },
  BR: { name: 'Orléans-Braganza', surname: 'de Orléans e Bragança', head: ['Head of the Imperial House of Brazil', 'Head of the Imperial House of Brazil'], style: ['Prince', 'Princess'], fell: 1889, how: 'the coup that made the Republic', order: 'Order of the Rose', support: 7, legal: 'The Republic recognises no titles. (The 1993 plebiscite gave the monarchy 13%.)' },
  RO: { name: 'Romania', surname: 'of Romania', head: ['Custodian of the Crown', 'Custodian of the Crown'], style: ['Prince', 'Princess'], fell: 1947, how: 'the communist takeover', order: 'Order of the Crown of Romania', support: 22, legal: 'The family lives in the Elisabeta Palace, and is received by the state with courtesy.' },
};
const g = (state) => (state.character.gender === 'female' ? 1 : 0);
const RESTORE_THRESHOLD = 35;

export const houseOf = (state) => (state.house && !state.house.renounced ? state.house : null);
export const monarchistSupport = (state, cc) => (state.world?.monarchists?.[cc] ?? FORMER_HOUSES[cc]?.support ?? 0);

/** Are you the head of government (or state) of a country? */
export function leads(state, cc) {
  const o = state.politics?.office;
  const def = o && OFFICES[o.id];
  if (!def || (def.country ?? 'US') !== cc) return false;
  return Boolean(def.headOfState || (def.leader && (def.level ?? 0) >= 5) || /_pm$|president$/.test(o.id));
}

/** The courtesy style of a member of the house: "Prince", "Archduchess", "Grand Duke". */
export function houseStyle(state) {
  const h = houseOf(state);
  if (!h) return null;
  return FORMER_HOUSES[h.cc]?.style?.[g(state)] ?? CROWNS[h.crownId]?.titles?.royal?.[g(state)] ?? null;
}

/** "Prince Georg von Preußen, Prince of Prussia" for a head; "Archduchess Maria Habsburg-Lothringen" for the rest. */
export function houseStyledName(state) {
  const h = houseOf(state);
  if (!h || state.royal) return null;
  const c = state.character;
  const def = FORMER_HOUSES[h.cc];
  const style = houseStyle(state);
  const base = `${style ? `${style} ` : ''}${c.firstName} ${c.lastName}`;
  return h.rank === 'head' ? `${base}, ${h.headTitle ?? def?.head?.[g(state)] ?? `Head of the House of ${h.name}`}` : base;
}

/** Born into a former ruling house (the start screen). */
function bornIntoHouse(state, rng) {
  const cc = state.character.countryId;
  const def = FORMER_HOUSES[cc];
  if (!def) return;
  const place = state.flags.houseStart;
  const parents = (state.people?.list ?? []).filter((p) => p.relation === 'father' || p.relation === 'mother');
  const holder = parents.find((p) => p.relation === 'father') ?? parents[0];
  state.house = { cc, name: def.name, surname: def.surname, rank: place === 'cadet' ? 'cadet' : 'heir', holderId: place === 'cadet' ? null : holder?.id ?? null, conferred: 0, campaigns: 0 };
  state.character.lastName = def.surname;
  for (const p of state.people?.list ?? []) if (['father', 'mother', 'sibling'].includes(p.relation)) p.lastName = def.surname;
  if (holder) {
    holder.title = def.style[holder.gender === 'female' ? 1 : 0];
    if (place !== 'cadet') holder.titles = [def.head[holder.gender === 'female' ? 1 : 0]];
  }
  const other = parents.find((p) => p !== holder);
  if (other?.gender === 'female') other.title = def.style[1];
  for (const s of (state.people?.list ?? []).filter((p) => p.relation === 'sibling')) s.title = def.style[s.gender === 'female' ? 1 : 0];
  state.character.style = { ...(state.character.style ?? {}), prefix: def.style[g(state)] };
  if (state.people) state.people.wealth = rng.chance(0.6) ? 'upper' : 'middle';
}

/* ------------------------------------------------------------------ */
/* Referendums                                                         */
/* ------------------------------------------------------------------ */

/** The throne comes back. The head of the house reigns — you, if it's yours. */
export function restore(ctx, cc) {
  const { state, rng } = ctx;
  const def = FORMER_HOUSES[cc];
  state.world.restored ??= {};
  state.world.restored[cc] = { year: currentYear(state), house: def.name };
  if (state.world.republics?.[cc]) delete state.world.republics[cc];
  delete state.world.crowns?.[cc];
  const c = ensureCrown(state, cc);
  c.house = def.name;
  c.since = currentYear(state);
  c.crowned = false;
  const h = houseOf(state);
  const age = state.character.age;
  if (h && h.cc === cc) {
    const level = h.rank === 'head' ? 'heir' : h.rank === 'heir' ? 'heir' : 'grandchild';
    state.royal = { crownId: cc, level, working: true, reigning: h.rank === 'head', line: h.rank === 'head' ? 0 : h.rank === 'heir' ? 1 : rng.int(3, 9), popularity: 60, patronages: [], since: age };
    if (h.rank === 'head') {
      c.monarch = { name: state.character.firstName, gender: state.character.gender, age, number: 1, you: true };
      c.heir = { name: 'your eldest child', gender: 'male', age: Math.max(0, age - 28), relation: 'child' };
      state.royal.regnal = 1;
      state.character.style = { ...(state.character.style ?? {}), prefix: CROWNS[cc].titles.monarch[g(state)] };
    } else {
      const holder = state.people?.list.find((p) => p.id === h.holderId && p.alive !== false);
      if (holder) c.monarch = { name: holder.firstName, gender: holder.gender, age: Math.max(40, age + 28), number: 1 };
      if (h.rank === 'heir') c.heir = { name: state.character.firstName, gender: state.character.gender, age, relation: 'you', you: true };
      if (holder) holder.royal = 'monarch';
      state.character.style = { ...(state.character.style ?? {}), prefix: CROWNS[cc].titles.royal[g(state)] };
    }
    h.restored = true;
    ctx.log(h.rank === 'head'
      ? `The monarchy is restored. ${def.fell} is undone: you are proclaimed ${monarchName(state, cc)}, and move into ${CROWNS[cc].palace}.`
      : `The monarchy is restored: your family reigns again, and you are a ${CROWNS[cc].titles.royal[g(state)].toLowerCase()} of a reigning house${h.rank === 'heir' ? ' — and heir to the throne' : ''}.`, '👑', 'milestone');
    ctx.stat('happiness', 15);
    return;
  }
  ctx.log(`The monarchy is restored: the House of ${def.name} returns to ${CROWNS[cc].palace}. ${monarchName(state, cc)} is head of state.`, '👑', 'milestone');
}

/** The crown goes: a republic. A reigning family becomes a former ruling house. */
export function abolish(ctx, cc) {
  const { state } = ctx;
  const crownId = crownOf(state, cc);
  state.world.republics ??= {};
  state.world.republics[cc] = { year: currentYear(state) };
  if (state.world.restored?.[cc]) delete state.world.restored[cc];
  const r = state.royal;
  if (r && r.crownId === crownId && (crownId === cc || CROWNS[crownId]?.realms?.[0] === cc)) {
    const c = state.world.crowns?.[crownId];
    const def = CROWNS[crownId];
    const head = r.reigning;
    state.house = { cc, name: c?.house?.replace(/^the /, '') ?? state.character.lastName, surname: state.character.lastName, rank: head ? 'head' : r.line === 1 ? 'heir' : 'cadet', holderId: null, conferred: 0, campaigns: 0, crownId, headTitle: `Head of the House of ${c?.house?.replace(/^the /, '') ?? state.character.lastName}`, deposed: currentYear(state) };
    state.character.formerRoyal = { crownId, level: r.level, year: currentYear(state), age: state.character.age, reigned: head, regnal: head ? monarchName(state, crownId) : null, deposed: true };
    state.royal = null;
    state.character.style = { ...(state.character.style ?? {}), prefix: def.titles.royal[g(state)], peerage: null };
    if (state.character.peerage?.kind === 'royal') delete state.character.peerage;
    (state.world.monarchists ??= {})[cc] = 30;
    ctx.log(head ? 'The republic is proclaimed. You leave the palace as a private citizen — still, to your supporters, the rightful sovereign: head of a former ruling house.' : 'The republic is proclaimed. Your family is a former ruling house now: a claim, a following, no throne.', '🏛️', 'milestone');
    ctx.stat('happiness', -10);
    return;
  }
  ctx.log(`The republic is proclaimed: the monarchy in ${COUNTRIES[cc]?.name ?? cc} is abolished.`, '🏛️', 'milestone');
}

function referendumPrompt(ctx, cc, kind, called = false) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'houses.referendum')) return;
  const def = FORMER_HOUSES[cc];
  ctx.prompt({
    type: 'houses.referendum', icon: '🗳️', title: kind === 'restore' ? 'A Referendum on the Monarchy' : 'A Republic Referendum',
    text: kind === 'restore'
      ? `${called ? 'Your government has called' : 'Monarchists gathered enough signatures for'} a referendum: should ${COUNTRIES[cc]?.name ?? cc} restore the monarchy under the House of ${def.name}? Polls put support near ${Math.round(monarchistSupport(state, cc))}%.`
      : `${called ? 'Your government has called' : 'The country votes in'} a referendum: should ${COUNTRIES[cc]?.name ?? cc} abolish the monarchy and become a republic?`,
    options: [
      { id: 'campaignYes', label: kind === 'restore' ? '👑 Campaign for the crown' : '🏛️ Campaign for a republic' },
      { id: 'campaignNo', label: kind === 'restore' ? '🏛️ Campaign to keep the republic' : '👑 Campaign for the crown' },
      { id: 'vote', label: '🗳️ Just vote' },
    ],
    data: { cc, kind, called },
  });
}

function resolveVote(ctx, { cc, kind, called }, optionId) {
  const { state, rng } = ctx;
  const push = { campaignYes: 0.03, campaignNo: -0.03 }[optionId] ?? 0;
  const lead = leads(state, cc) && called ? 0.06 : 0;
  const yes = kind === 'restore'
    ? clamp(monarchistSupport(state, cc) / 100 + rng.float(-0.06, 0.1) + push + lead, 0.02, 0.9)
    : clamp(0.32 + rng.float(-0.08, 0.12) + push + lead - (state.royal?.reigning ? (state.royal.popularity - 50) / 400 : 0), 0.1, 0.85);
  if (optionId !== 'vote') ctx.stat('stress', 3);
  if (yes > 0.5) {
    ctx.log(`The referendum passed with ${Math.round(yes * 100)}%.`, '🗳️', 'milestone');
    return kind === 'restore' ? restore(ctx, cc) : abolish(ctx, cc);
  }
  if (kind === 'restore') (state.world.monarchists ??= {})[cc] = Math.max(0, monarchistSupport(state, cc) - 8);
  if (called && leads(state, cc) && state.politics) state.politics.approval = Math.max(0, (state.politics.approval ?? 50) - 8);
  return ctx.log(`The referendum failed: ${Math.round(yes * 100)}% voted yes.`, '🗳️', 'info');
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

function houseYear(ctx) {
  const { state, rng } = ctx;
  const h = houseOf(state);
  if (!h) return;
  const def = FORMER_HOUSES[h.cc];
  const age = state.character.age;
  // The claim passes when the head of the house dies.
  if (h.rank === 'heir' && h.holderId) {
    const holder = state.people?.list.find((p) => p.id === h.holderId);
    if (!holder || holder.alive === false) {
      h.rank = 'head';
      h.holderId = null;
      ctx.log(`Your father's death made you head of the House of ${h.name}${def ? `: ${def.head[g(state)]}` : ''}. Monarchists call you by a regnal name; the state calls you by your surname.`, '👑', 'milestone');
    }
  }
  // The house's own order, at 18.
  if (age === 18 && def?.order && !state.honors.some((x) => x.id === 'house.order')) {
    addHonor(state, { id: 'house.order', source: 'foreign', from: `the House of ${h.name}`, name: `${state.character.gender === 'female' ? (h.rank === 'cadet' ? 'Dame' : 'Dame Grand Cross') : (h.rank === 'cadet' ? 'Knight' : 'Knight Grand Cross')} of the ${def.order} (dynastic)`, icon: '⚜️', prestige: 6, precedence: 12, citation: 'Conferred by the head of the house on coming of age.' });
  }
  // A family trust, where there's still money.
  if (age >= 18 && state.people?.wealth === 'upper') ctx.earn(h.rank === 'cadet' ? 15000 : 40000, `House of ${h.name} family trust`);
  // Austria: the 1919 law still applies to using the title at home.
  if (def?.banned && state.character.countryId === h.cc && age >= 18 && rng.chance(0.03)) {
    ctx.spend(rng.int(100, 1500), 'Fine under the Nobility Abolition Act', { allowDebt: true });
    ctx.log('Someone reported you for using your title on an invitation. Under the 1919 law, a fine.', '⚖️', 'warn');
  }
}

function monarchistYear(ctx) {
  const { state, rng } = ctx;
  const w = (state.world.monarchists ??= {});
  for (const cc of Object.keys(FORMER_HOUSES)) {
    if (state.world.restored?.[cc]) continue;
    const base = FORMER_HOUSES[cc].support;
    w[cc] = Math.round(clamp((w[cc] ?? base) + (base - (w[cc] ?? base)) * 0.08 + rng.float(-1, 1), 0, 80) * 10) / 10;
  }
  const cc = state.character.countryId;
  if (FORMER_HOUSES[cc] && !state.world.restored?.[cc] && monarchistSupport(state, cc) >= RESTORE_THRESHOLD && rng.chance(0.15)) {
    if (state.character.age >= 18) referendumPrompt(ctx, cc, 'restore');
    else resolveVote(ctx, { cc, kind: 'restore', called: false }, 'vote');
  }
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

const catholic = (state) => ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);
export const nobleBorn = (state) => Boolean(houseOf(state) || state.royal || state.character.formerRoyal || state.noble || state.character.peerage);

export const HousesModule = {
  id: 'houses',
  order: 33.6,
  init(state, rng) {
    if (state.flags?.houseStart && !state.house && rng) bornIntoHouse(state, rng);
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (state.flags?.houseStart && !state.house) bornIntoHouse(state, rng);
    houseYear(ctx);
    monarchistYear(ctx);
  },
  actions: {
    /** Rally the monarchists: speeches, a newspaper, a march on the anniversary. */
    campaign(ctx) {
      const { state, rng } = ctx;
      const h = houseOf(state);
      if (!h || h.rank === 'cadet' || state.world.restored?.[h.cc] || state.character.age < 18) return ctx.toast('The head of the house (or the heir) leads the cause.', 'warn');
      if (yearlyCount(state, 'houses.campaign')) return ctx.toast('Once a year', 'warn');
      if (!ctx.spend(25000, 'Monarchist campaign', { credit: true })) return ctx.toast('The campaign needs $25,000.', 'warn');
      bumpYearly(state, 'houses.campaign');
      h.campaigns = (h.campaigns ?? 0) + 1;
      const w = (state.world.monarchists ??= {});
      const gain = rng.float(0.5, 3) + Math.max(0, (state.stats.looks - 60) / 40);
      w[h.cc] = Math.round(clamp(monarchistSupport(state, h.cc) + gain, 0, 80) * 10) / 10;
      ctx.stat('stress', 4);
      return ctx.log(`You toured the provinces for the monarchist cause. Support for a restoration: ${w[h.cc]}%.`, '📣', 'good');
    },
    /** Confer the house's dynastic order on a supporter. */
    confer(ctx) {
      const { state } = ctx;
      const h = houseOf(state);
      if (h?.rank !== 'head') return ctx.toast('Only the head of the house confers its orders.', 'warn');
      if (yearlyCount(state, 'houses.confer')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'houses.confer');
      h.conferred = (h.conferred ?? 0) + 1;
      (state.world.monarchists ??= {})[h.cc] = Math.min(80, monarchistSupport(state, h.cc) + 0.5);
      return ctx.log(`You invested a loyal supporter in the ${FORMER_HOUSES[h.cc]?.order ?? `order of the House of ${h.name}`}. They will hear no word against you.`, '⚜️', 'good');
    },
    /** Give up the claim for yourself and your heirs. */
    renounce(ctx) {
      const { state } = ctx;
      const h = houseOf(state);
      if (!h) return undefined;
      h.renounced = true;
      state.character.style = { ...(state.character.style ?? {}), prefix: null };
      return ctx.log(`You renounced your rights in the House of ${h.name}, for yourself and your descendants.`, '📜', 'milestone');
    },
    /** Put the monarchy to the people, as head of government. */
    callRestoration(ctx) {
      const { state } = ctx;
      const cc = state.character.countryId;
      if (!FORMER_HOUSES[cc] || state.world.restored?.[cc] || !leads(state, cc)) return ctx.toast('A head of government in a country with a former ruling house can call it.', 'warn');
      if (yearlyCount(state, 'houses.referendum')) return ctx.toast('One referendum a year', 'warn');
      bumpYearly(state, 'houses.referendum');
      return referendumPrompt(ctx, cc, 'restore', true);
    },
    callRepublic(ctx) {
      const { state } = ctx;
      const cc = state.character.countryId;
      if (!crownOf(state, cc) || !leads(state, cc)) return ctx.toast('A head of government in a monarchy can call it.', 'warn');
      if (yearlyCount(state, 'houses.referendum')) return ctx.toast('One referendum a year', 'warn');
      bumpYearly(state, 'houses.referendum');
      return referendumPrompt(ctx, cc, 'republic', true);
    },
    /** The Sacred Military Constantinian Order of St George: Catholic and (for the Justice grade) noble. */
    constantinian(ctx) {
      const { state, rng } = ctx;
      if (!catholic(state)) return ctx.toast('Catholics only', 'warn');
      if (state.honors.some((x) => x.id === 'house.constantinian')) return ctx.toast('Already a member', 'warn');
      if (state.character.age < 21 || yearlyCount(state, 'houses.constantinian')) return ctx.toast('From 21; one application a year', 'warn');
      bumpYearly(state, 'houses.constantinian');
      if (!ctx.spend(2500, 'Constantinian Order passage fee', { credit: true })) return ctx.toast('The passage fee is $2,500.', 'warn');
      const noble = nobleBorn(state);
      if (!rng.chance(noble ? 0.8 : 0.3)) return ctx.log('The Order\'s delegation did not admit you this year.', '⚜️', 'bad');
      const name = `${noble ? (state.character.gender === 'female' ? 'Dame of Justice' : 'Knight of Justice') : (state.character.gender === 'female' ? 'Dame of Merit' : 'Knight of Merit')} of the Sacred Military Constantinian Order of St George`;
      addHonor(state, { id: 'house.constantinian', source: 'foreign', from: 'the Royal House of Bourbon-Two Sicilies', name, icon: '⚜️', prestige: noble ? 8 : 5, precedence: 11, citation: noble ? 'Admitted in the noble class, on proofs of nobility.' : 'Admitted for merit.' });
      return ctx.log(`You were invested as a ${name}.`, '⚜️', 'honor');
    },
  },
  resolvers: {
    referendum(ctx, data, optionId) {
      return resolveVote(ctx, data, optionId);
    },
  },
};

/** Living members of the family who carry the house's style. */
export const houseFamily = (state) => living(state).filter((p) => ['father', 'mother', 'sibling', 'child'].includes(p.relation) && p.title);
