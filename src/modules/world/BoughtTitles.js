/**
 * Baronetcies, and titles that change hands for money: real ones, and fakes.
 *
 *   Baronetcies   a hereditary title below the peerage: Sir John Smith, Bt, his wife Lady Smith.
 *                 Conferred on the Prime Minister's advice on rich men who had served a party or
 *                 the nation (to 1964), and openly sold in 1916–22, when Lloyd George's honours
 *                 brokers asked about £40,000; selling them was made a crime in 1925. It passes to
 *                 the eldest son, and dies out without one.
 *   Real, for sale
 *     Lord of the Manor   a manorial lordship, sold at auction since the 1920s: a curiosity with a
 *                         little history, not a peerage ("John Smith, Lord of the Manor of Ashby",
 *                         never "Lord Smith"). It can be sold on.
 *     Scottish feudal barony  "Baron of Glenbuckie": with an estate until 2004, a dignity alone since,
 *                         sold either way; the Lord Lyon may grant arms and a baron's chapeau.
 *     Papal count     a Catholic benefactor's title from the Holy See, to 1968.
 *   Fakes            a square foot of Scotland that makes you a "Laird" (from 1996), "Lord" bought
 *                    from a website by deed poll (from 2000), a count of a self-proclaimed
 *                    principality on a sea fort (from 1975), a "baronial" scroll from a title mill.
 *                    Use one in public and someone, sooner or later, looks it up.
 *
 * state.character.baronetcy = { number, since, how } · state.boughtTitles = [{ id, kind, place, paid, value, year, used }]
 */
import { Random } from '../../core/Random.js';
import { yearNow } from './Eras.js';
import { priceLevel } from './Countries.js';

const cc = (state) => state.character.countryId ?? 'US';
const local = (state, n) => Math.round(n * priceLevel(state));
const fem = (state) => state.character.gender === 'female';
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 19937 + state.character.age * 613 + salt) >>> 0);
const MANORS = ['Ashby Parva', 'Little Wenlock', 'Stoke Mandeville', 'Kings Ripton', 'Nether Wallop', 'Upton Snodsbury', 'Long Itchington', 'Great Snoring', 'Toller Porcorum', 'Much Hadham'];
const BARONIES = ['Glenbuckie', 'Kilbride', 'Ardgowan', 'Balquhidder', 'Inverkeithing', 'Strathgarry', 'Dunlappie', 'Craigievar'];

/** id: { label, icon, from, until, where (null: anyone), price (today's money), real, resale, style(state, place) } */
export const TITLE_MARKET = {
  manor: { label: 'A lordship of the manor', icon: '📜', from: 1925, where: null, price: 15000, real: true, resale: true, style: (s, place) => `${fem(s) ? 'Lady' : 'Lord'} of the Manor of ${place}`, places: MANORS, text: 'The auctioneer read out the manor\'s history back to the Domesday Book, and you raised your paddle.' },
  feudal: { label: 'A Scottish feudal barony', icon: '🏴', from: 1800, where: null, price: 90000, withLand: 900000, real: true, resale: true, style: (s, place) => `${fem(s) ? 'Baroness' : 'Baron'} of ${place}`, places: BARONIES, text: (y) => (y < 2004 ? 'You bought the barony with its estate: a house, a glen, and the right to a seat by the fire at the clan gathering.' : 'You bought the barony: since 2004 a dignity without land, but a real one, on the Register of the Great Seal.') },
  papal: { label: 'A papal countship (for a benefactor)', icon: '⛪', from: 1830, until: 1968, where: ['IT', 'IE', 'ES', 'FR', 'BE', 'US', 'GB', 'DE', 'AT', 'PL', 'PT', 'MX', 'BR', 'AR'], price: 600000, real: true, resale: false, prefix: (s) => (fem(s) ? 'Countess' : 'Count'), text: 'A generous gift to a Catholic charity, a letter from the Secretariat of State, and a brief creating you a papal count.' },
  laird: { label: 'A souvenir plot that makes you a "Laird"', icon: '🌱', from: 1996, where: null, price: 60, fake: true, prefix: () => 'Laird', text: 'A certificate, a map, and one square foot of Highland bog with your name on a stake.' },
  webLord: { label: '"Lord" or "Lady" from a website, by deed poll', icon: '💻', from: 2000, where: null, price: 250, fake: true, prefix: (s) => (fem(s) ? 'Lady' : 'Lord'), text: 'A parchment-effect certificate came in a tube. Your bank refused to change your cards.' },
  micronation: { label: 'A countship of a self-proclaimed principality', icon: '🏝️', from: 1975, where: null, price: 2000, fake: true, prefix: (s) => (fem(s) ? 'Countess' : 'Count'), text: 'A scroll from a "principality" on a wartime sea fort. No country on earth recognises it.' },
  titleMill: { label: 'A "baronial" title from a title broker', icon: '🎭', from: 1880, where: null, price: 8000, fake: true, prefix: (s) => (fem(s) ? 'Baroness' : 'Baron'), text: 'A gilded patent, a coat of arms nobody granted, and a broker who no longer answers letters.' },
};
export const titlesOf = (state) => state.boughtTitles ?? [];
export function marketNow(state, y = yearNow(state)) {
  return Object.entries(TITLE_MARKET).filter(([, t]) => y >= t.from && !(t.until <= y) && (!t.where || t.where.includes(cc(state)))).map(([id, t]) => ({ id, ...t, cost: local(state, t.withLand && y < 2004 ? t.withLand : t.price) }));
}
/** The title you choose to be known by (a bought prefix you use), or null. */
export const usedPrefix = (state) => {
  const t = titlesOf(state).find((x) => x.used && TITLE_MARKET[x.kind]?.prefix);
  return t ? TITLE_MARKET[t.kind].prefix(state) : null;
};
/** Designations after the name: "Lord of the Manor of Ashby Parva", "Baron of Glenbuckie". */
export const designations = (state) => titlesOf(state).filter((x) => TITLE_MARKET[x.kind]?.style).map((x) => TITLE_MARKET[x.kind].style(state, x.place));
export const baronetLetters = (state) => (state.character.baronetcy ? 'Bt' : null);
/**
 * Sir or Dame, but never over a higher style: a peer stays Lord, a royal keeps theirs (a peer who is
 * also a baronet or a knight shows it in the letters after the name, not in front).
 */
export function knightStyle(s, female) {
  const c = s.character;
  if (c.peerage || s.royal || (c.style?.prefix && !/^(Sir|Dame)$/.test(c.style.prefix))) return false;
  c.style = { ...(c.style ?? {}), prefix: female ? 'Dame' : 'Sir' };
  return true;
}
/** A bought title you use, unless a real title outranks it (then it stays in the drawer). */
export const outrankedBy = (state) => (state.character.peerage ? 'your peerage' : state.royal ? 'your royal style' : /^(Sir|Dame)$/.test(state.character.style?.prefix ?? '') ? (state.character.baronetcy ? 'your baronetcy' : 'your knighthood') : state.character.style?.prefix ? 'your title' : null);

/** A baronetcy: Sir/Dame (the rare baronetess), and the letters Bt. */
export function createBaronetcy(ctx, how) {
  const { state } = ctx;
  if (state.character.baronetcy || state.character.peerage || state.royal) return false;
  state.character.baronetcy = { number: 1, since: yearNow(state), how };
  knightStyle(state, fem(state));
  return true;
}

export function boughtTitlesTick(ctx) {
  const { state } = ctx;
  if (state.character.age < 21) return;
  const y = yearNow(state);
  const rng = sideRng(state, 0xb7);
  // The Prime Minister's list: a baronetcy for the rich and the politically useful (Britain, to 1964).
  if (['GB', 'IE'].includes(cc(state)) && y < 1965 && !(cc(state) === 'IE' && y >= 1922) && !state.character.baronetcy && !state.character.peerage && !state.royal && !state.prompts.some((p) => p.type === 'boughtTitles.baronetcy')) {
    const rich = (state.finances.cash ?? 0) > local(state, 3e6) || (state.business?.current?.valuation ?? 0) > local(state, 10e6);
    const useful = (state.politics?.recognition ?? 0) >= 40 || Boolean(state.politics?.office);
    if (rich && useful && rng.chance(0.05)) {
      ctx.prompt({ type: 'boughtTitles.baronetcy', icon: '🛡️', title: 'A Baronetcy', text: 'A letter from Downing Street: the Prime Minister proposes to submit your name to the King for a baronetcy, for public and political services.', options: [{ id: 'accept', label: '🛡️ Accept: Sir, and Bt, and the title to your son' }, { id: 'decline', label: '🙅 Decline it' }], data: { how: 'conferred' } });
    }
  }
  // The honours brokers of 1916–22.
  if (cc(state) === 'GB' && y >= 1916 && y <= 1922 && !state.character.baronetcy && !state.character.peerage && (state.finances.cash ?? 0) > local(state, 2.5e6) && rng.chance(0.08) && !state.prompts.some((p) => p.type === 'boughtTitles.broker')) {
    ctx.prompt({ type: 'boughtTitles.broker', icon: '🎩', title: 'A Man From the Whips\' Office', text: 'A smooth man at your club says a knighthood can be had for £10,000, a baronetcy for £40,000, paid to the party fund. No receipt, of course.', options: [{ id: 'knight', label: '🗡️ A knighthood', hint: `≈${local(state, 600000).toLocaleString()}` }, { id: 'baronet', label: '🛡️ A baronetcy', hint: `≈${local(state, 2400000).toLocaleString()}` }, { id: 'no', label: '🙅 Show him the door' }], data: {} });
  }
  // Fakes in use: someone looks them up.
  for (const t of titlesOf(state)) {
    const def = TITLE_MARKET[t.kind];
    if (def?.fake && t.used && rng.chance(0.12)) {
      t.used = false;
      t.exposed = y;
      ctx.stat('happiness', -6);
      if (state.society) state.society.standing = Math.max(0, (state.society.standing ?? 30) - 8);
      ctx.emit('news:story', { tier: 'local', headline: `"${def.prefix(state)}" ${state.character.lastName}'s title is a novelty certificate`, weight: 3, icon: '🎭', you: true });
      ctx.log(`A journalist looked up your title. The piece was headlined with your name in quotation marks, and you stopped using it.`, '🎭', 'bad');
    }
    if (def?.resale) t.value = Math.round((t.value ?? t.paid) * (1 + rng.float(-0.02, 0.06)));
  }
}

export const BoughtTitlesModule = {
  id: 'boughtTitles',
  order: 96,
  onAgeUp: boughtTitlesTick,
  actions: {
    buy(ctx, kind) {
      const { state } = ctx;
      const t = marketNow(state).find((x) => x.id === kind);
      if (!t) return ctx.toast('Not for sale here, in this day', 'warn');
      if (state.character.age < 18) return ctx.toast('18+', 'warn');
      const owned = (state.boughtTitles ??= []);
      if (owned.some((x) => x.kind === kind)) return ctx.toast('You already have one', 'info');
      if (!ctx.spend(t.cost, t.label)) return ctx.toast(`It costs ${t.cost.toLocaleString()}`, 'warn');
      const place = t.places ? sideRng(state, owned.length + 0x51).pick(t.places) : null;
      owned.push({ id: `bt_${state.character.age}_${owned.length}`, kind, place, paid: t.cost, value: t.real ? t.cost : 0, year: yearNow(state), used: false });
      // A papal count is a real title, used at once.
      if (kind === 'papal') { owned.at(-1).used = true; ctx.log(t.text, t.icon, 'milestone'); return; }
      ctx.log(typeof t.text === 'function' ? t.text(yearNow(state)) : t.text, t.icon, t.fake ? 'info' : 'milestone');
    },
    use(ctx, id) {
      const t = titlesOf(ctx.state).find((x) => x.id === id);
      if (!t || !TITLE_MARKET[t.kind]?.prefix) return;
      for (const x of titlesOf(ctx.state)) if (x !== t) x.used = false;
      t.used = !t.used;
      ctx.log(t.used ? `You started calling yourself ${TITLE_MARKET[t.kind].prefix(ctx.state)} ${ctx.state.character.lastName}.` : 'You went back to your own name.', '🪪', 'info');
    },
    sell(ctx, id) {
      const { state } = ctx;
      const t = titlesOf(state).find((x) => x.id === id);
      if (!t) return;
      state.boughtTitles = titlesOf(state).filter((x) => x !== t);
      const def = TITLE_MARKET[t.kind];
      if (!def.resale) return ctx.log('Nobody would pay for it. You put the certificate in a drawer.', '🗄️', 'muted');
      const price = Math.round((t.value ?? t.paid) * 0.85);
      ctx.earn(price, `Sale of the ${def.style(state, t.place).toLowerCase()}`);
      ctx.log(`You sold the ${def.style(state, t.place)} at auction for ${price.toLocaleString()}.`, '🔨', 'info');
    },
  },
  resolvers: {
    baronetcy(ctx, data, optionId) {
      if (optionId === 'decline') return ctx.log('You declined the baronetcy, and said so to nobody.', '🙅', 'info');
      if (createBaronetcy(ctx, data.how)) ctx.log(`You were created a baronet: Sir ${ctx.state.character.firstName} ${ctx.state.character.lastName}, Bt. The title will go to your eldest son.`, '🛡️', 'honor');
    },
    broker(ctx, _data, optionId) {
      const { state } = ctx;
      if (optionId === 'no') return ctx.log('You showed the man the door. A month later his name was in a scandal.', '🙅', 'info');
      if (optionId === 'knight') {
        if (!ctx.spend(local(state, 600000), 'A donation to the party fund')) return;
        knightStyle(state, fem(state));
        return ctx.log('The knighthood was in the Birthday Honours, "for public services". Everybody knew.', '🗡️', 'honor');
      }
      if (!ctx.spend(local(state, 2400000), 'A donation to the party fund')) return;
      if (createBaronetcy(ctx, 'bought')) ctx.log('You were created a baronet in the next list. The newspapers counted the coal merchants and grocers among the new baronets, and laughed.', '🛡️', 'honor');
    },
  },
};

/** At death: the baronetcy to the eldest son (or it dies out); real bought titles go with the estate. */
export function inheritTitles(old, s, child, eldestSon, kids, addLog) {
  const b = old.character.baronetcy;
  if (b) {
    if (eldestSon?.id === child.id) {
      s.character.baronetcy = { ...b, number: (b.number ?? 1) + 1, since: null };
      knightStyle(s, false);
      addLog(s, `You succeed your ${old.character.gender === 'female' ? 'mother' : 'father'} as the ${ordinal((b.number ?? 1) + 1)} baronet.`, '🛡️', 'milestone');
    } else if (!eldestSon) addLog(s, 'With no son to succeed, the baronetcy died out.', '🛡️', 'info');
  }
  const heir = eldestSon ?? kids[0];
  if (heir?.id === child.id) s.boughtTitles = (old.boughtTitles ?? []).filter((t) => TITLE_MARKET[t.kind]?.resale).map((t) => ({ ...t, used: false }));
}
const ordinal = (n) => `${n}${[, 'st', 'nd', 'rd'][(n % 100 >> 3 ^ 1) && n % 10] || 'th'}`;
