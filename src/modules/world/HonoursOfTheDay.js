/**
 * Honours of their day: which honours a life could actually receive, by year and by where it is
 * lived (Honours.js holds today's orders; this decides which apply).
 *
 *   Britain     Knights Bachelor and peerages always; the Order of the British Empire (MBE,
 *               OBE, CBE, DBE) only from 1917; women knighted only from 1917 (as Dames) and
 *               in the Lords only from 1958; peerages hereditary until the Life Peerages Act
 *               (1958) and life peerages from 1965; baronetcies until 1964. Orders of
 *               chivalry by their founding: the Bath (civil division 1847), St Michael and
 *               St George (1818), the Royal Victorian Order (1896), the Order of Merit (1902).
 *   Dominions   British honours until each turned to its own:
 *               Canada    titles ended by the Nickle Resolution (1919) — except under Bennett
 *                         (1933–35) — non-titular awards again in the war (1943–46), then
 *                         nothing until the Order of Canada (1967; Officers and Members 1972).
 *               Australia British honours until the federal government stopped asking
 *                         (1975 the Order of Australia; the states kept British honours going
 *                         until the Queen stopped accepting their advice in 1992).
 *               New Zealand British honours until the New Zealand Order of Merit (1996).
 *               South Africa British honours until Hertzog ended them (1925); its own
 *                         national orders from 2002.
 *               Ireland   British honours until the Free State (1922); none since.
 *               India     British honours, with the Star of India (1861) and the Indian Empire
 *                         (1878), until 1947; the Padma awards and Bharat Ratna from 1954.
 *   Colonies    the ruling power's honours.
 *   Elsewhere   each order from its founding: Rising Sun (1875), Légion d'honneur (1802),
 *               Ordre national du Mérite (1963), Prussia's Red Eagle until 1918 and the
 *               Bundesverdienstkreuz from 1951, the Crown of Italy (1868–1946) and the Italian
 *               Republic's order from 1952, Korea's Civil Merit (1963), the US Medal of Freedom
 *               (1963) and Citizens Medal (1969), Mexico's national prize (1945) and the
 *               Belisario Domínguez medal (1953), the Philippines' Lakandula (2003).
 */
import { ORDERS, CHIVALRY } from './Honours.js';
import { yearNow, colonyHere } from './Eras.js';

const R = (...c) => c.map((x) => (Array.isArray(x) ? x : [x, 1]));

/** How each dominion got its honours: [from, until, mode]. 'british' with titles, 'britishNoTitles', 'dual', 'national', 'none'. */
export const DOMINION_HONOURS = {
  CA: [[0, 1919, 'british'], [1919, 1933, 'none'], [1933, 1936, 'british'], [1936, 1943, 'none'], [1943, 1947, 'britishNoTitles'], [1947, 1967, 'none'], [1967, 9999, 'national']],
  AU: [[0, 1975, 'british'], [1975, 1992, 'dual'], [1992, 9999, 'national']],
  NZ: [[0, 1996, 'british'], [1996, 9999, 'national']],
  ZA: [[0, 1925, 'british'], [1925, 2002, 'none'], [2002, 9999, 'national']],
  IE: [[0, 1922, 'british'], [1922, 9999, 'national']],
  IN: [[0, 1947, 'british'], [1947, 1954, 'none'], [1954, 9999, 'national']],
};
export const dominionMode = (cc, y) => (DOMINION_HONOURS[cc] ?? []).find(([a, b]) => y >= a && y < b)?.[2] ?? null;

/** Grades founded after their order: [country][tier] = year. */
const TIER_FROM = {
  US: { freedom: 1963, citizens: 1969 },
  CA: { cc: 1967, oc: 1972, cm: 1972 },
  AU: { ak: 1976 },
  FR: { onm: 1963 },
  MX: { premio: 1945, belisario: 1953 },
  PH: { merit: 1946, lakandula: 2003 },
};
/** Whole orders, from their founding. */
const ORDER_FROM = { DE: 1951, IT: 1952, JP: 1875, KR: 1963, IN: 1954, NZ: 1996, ZA: 2002, CA: 1967, AU: 1975, IE: 9999 };

/* ---- Britain by year ---- */
const MALE_ONLY = { male: true };
export function britishLadder(y, { titles = true } = {}) {
  const gb = ORDERS.GB.tiers;
  const get = (id) => gb.find((t) => t.id === id);
  const tiers = [];
  if (y >= 1917) tiers.push(get('mbe'), get('obe'), get('cbe'));
  if (titles) {
    tiers.push(y >= 1917 ? get('knight') : { ...get('knight'), name: 'Knight Bachelor', post: '', order: null, only: MALE_ONLY });
    if (y < 1965) tiers.push({ id: 'baronet', name: 'Baronet', prefix: { male: 'Sir', female: 'Dame' }, post: 'Bt', order: null, min: 200, hereditary: true, only: MALE_ONLY, ribbon: R('#e36b0a', '#1f3f8f', '#e36b0a') });
    tiers.push(y < 1958
      ? { id: 'peerH', name: { male: 'A peerage (Baron)', female: 'A peerage (Baroness)' }, prefix: { male: 'Lord', female: 'Baroness' }, min: 240, peer: true, hereditary: true, order: null, only: MALE_ONLY, ribbon: get('peer').ribbon }
      : get('peer'));
  }
  return { minAge: 30, order: 'Order of the British Empire', tiers };
}

/* ---- Other countries before today's orders ---- */
const PRUSSIA = { minAge: 30, order: 'Order of the Red Eagle', tiers: [
  { id: 'crown4', name: 'Order of the Crown, 4th Class', order: 'Order of the Crown', min: 35, ribbon: R('#1f5fbf') },
  { id: 're4', name: 'Order of the Red Eagle, 4th Class', min: 70, ribbon: R('#fff', '#e8772e', '#fff', '#e8772e', '#fff') },
  { id: 're3', name: 'Order of the Red Eagle, 3rd Class', min: 115, ribbon: R('#fff', '#e8772e', '#fff', '#e8772e', '#fff') },
  { id: 're2', name: 'Order of the Red Eagle, 2nd Class', min: 165, ribbon: R('#fff', '#e8772e', '#fff', '#e8772e', '#fff') },
  { id: 're1', name: 'Order of the Red Eagle, 1st Class', min: 220, ribbon: R('#fff', '#e8772e', '#fff', '#e8772e', '#fff') },
  { id: 'blackEagle', name: 'Order of the Black Eagle', order: 'Order of the Black Eagle', min: 285, ribbon: R('#f28c28') },
] };
const italianRoyal = (y) => {
  const crown = y >= 1868;
  const order = crown ? 'Order of the Crown of Italy' : 'Order of Saints Maurice and Lazarus';
  return { minAge: 30, order, tiers: ORDERS.IT.tiers.map((t) => ({
    ...t, id: `${crown ? 'ci' : 'sml'}_${t.id}`,
    name: t.name.replace('dell\'Ordine al merito della Repubblica', crown ? 'dell\'Ordine della Corona d\'Italia' : 'dell\'Ordine dei Santi Maurizio e Lazzaro'),
    ribbon: crown ? R('#c8102e', '#fff', '#c8102e') : R('#1f6f43'),
  })) };
};

/** A country's own honours in a year (not counting what its people got from an empire). null: none. */
function ownOrders(cc, y) {
  if (cc === 'GB') return britishLadder(y);
  if (cc === 'DE') return y < 1918 ? PRUSSIA : y < ORDER_FROM.DE ? null : ORDERS.DE;
  if (cc === 'IT') return y < 1946 ? italianRoyal(y) : y < ORDER_FROM.IT ? null : ORDERS.IT;
  const base = ORDERS[cc];
  if (!base?.tiers?.length || y < (ORDER_FROM[cc] ?? 0)) return null;
  const from = TIER_FROM[cc] ?? {};
  const tiers = base.tiers.filter((t) => !(from[t.id] > y));
  return tiers.length ? { ...base, tiers } : null;
}

/**
 * The honours a country's people received in a year: { via, ladder } — via is the country whose
 * honours they are (GB for a dominion before its own). For honours lists, patronage and foreign awards.
 */
export function ordersAt(cc, y) {
  const mode = dominionMode(cc, y);
  if (mode === 'british' || mode === 'britishNoTitles') return { via: 'GB', ladder: britishLadder(y, { titles: mode === 'british' }) };
  if (mode === 'none') return null;
  const own = ownOrders(cc, y);
  return own ? { via: cc, ladder: own } : null;
}

/** What this life can be given this year, in the order tried: [{ via, ladder }]. */
export function honoursSystem(state) {
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  const forGender = (l) => (l ? { ...l, tiers: l.tiers.filter((t) => !t.only || (state.character.gender === 'female' ? t.only.female : t.only.male)) } : l);
  const out = [];
  const mode = dominionMode(cc, y);
  if (mode === 'dual') {
    const own = ownOrders(cc, y);
    if (own) out.push({ via: cc, ladder: own });
    out.push({ via: 'GB', ladder: britishLadder(y) });
  } else if (mode) {
    const o = ordersAt(cc, y);
    if (o) out.push(o);
  } else {
    // A colony: the ruling power's honours.
    const col = colonyHere(state);
    const o = col?.ruler && col.ruler !== cc ? ordersAt(col.ruler, y) : ordersAt(cc, y);
    if (o) out.push(o);
  }
  return out.map((x) => ({ ...x, ladder: forGender(x.ladder) })).filter((x) => x.ladder?.tiers?.length);
}

/** The tiers of a country's honours as a life would see them this year (to settle an offer). */
export function ladderTiers(state, via) {
  return honoursSystem(state).find((x) => x.via === via)?.ladder.tiers ?? ORDERS[via]?.tiers ?? [];
}

/** Britain's orders of chivalry by their founding, for those who received British honours. */
const CHIVALRY_FROM = { bath: 1725, smg: 1818, rvo: 1896, om: 1902, garter: 0, starOfIndia: 1861, indianEmpire: 1878 };
export function chivalryAt(state) {
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  const sys = honoursSystem(state).find((x) => x.via === 'GB');
  if (!sys) return null;
  const titles = sys.ladder.tiers.some((t) => ['knight'].includes(t.id));
  const orders = (CHIVALRY.GB ?? []).filter((o) => y >= (CHIVALRY_FROM[o.id] ?? 0) && !(o.until <= y) && (!o.where || o.where.includes(cc)) && (cc === 'GB' || !o.homeOnly))
    .map((o) => ({
      ...o,
      // Before 1847 the Bath was for the armed forces alone.
      eligible: o.id === 'bath' && y < 1847 ? (s) => o.militaryOnly(s) : o.id === 'smg' && cc !== 'GB' ? (s) => o.eligible(s) || o.overseas(s) : o.eligible,
      tiers: o.tiers.filter((t) => titles || !t.prefix).filter((t) => !(state.character.gender === 'female' && y < 1917 && t.prefix)),
    }))
    .filter((o) => o.tiers.length);
  return orders.length ? orders : null;
}

/** One line for the Honours screen: where this life's honours come from this year. */
const NONE_WHY = {
  CA: (y) => (y < 1967 ? 'Since the Nickle Resolution (1919) Canada asks for no British honours; the Order of Canada comes in 1967.' : null),
  ZA: () => 'South Africa stopped British honours in 1925; its own national orders come in 2002.',
  IE: () => 'The Irish state gives no honours.',
  IN: () => 'India gave up British honours at independence; the Padma awards come in 1954.',
};
export function honoursNote(state) {
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  const sys = honoursSystem(state);
  const name = (via) => (via === 'GB' ? 'the British honours list' : null);
  if (!sys.length) {
    const col = colonyHere(state);
    const britishHere = ordersAt(cc, y)?.via === 'GB' || (col?.ruler === 'GB');
    if (britishHere && state.character.gender === 'female' && y < 1917) return 'The honours list is for men: the Order of the British Empire, the first open to women, comes in 1917.';
    return NONE_WHY[cc]?.(y) ?? 'No honours are being given here this year.';
  }
  const british = sys.find((x) => x.via === 'GB');
  if (british && cc !== 'GB') {
    const mode = dominionMode(cc, y);
    const titles = british.ladder.tiers.some((t) => t.id === 'knight');
    return `${mode === 'dual' ? 'Two lists: your own national order, and still ' : 'Your honours come from '}${name('GB')}${titles ? '' : ' (no titles: no knighthoods or peerages)'}${mode === 'dual' ? `, until ${DOMINION_HONOURS[cc].find(([, , m]) => m === 'dual')[1]}` : ''}.`;
  }
  return null;
}
