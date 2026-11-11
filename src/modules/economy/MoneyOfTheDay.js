/**
 * Money of its day: inflation, crashes and hyperinflations as they came, by country and decade.
 * The economy (economy/EconomyEngine.js) runs its own cycle; in a life lived in the past this sets
 * the year's inflation and interest rates to those of the time and place, brings the crashes that
 * hit where you live, and the hyperinflations that wiped out savings (and debts) — the Weimar
 * mark, Hungary's pengő, Zimbabwe's dollar.
 *
 *   Inflation      a decade's typical rate for your part of the world (gold-standard calm before
 *                  1914, war inflation, the 1970s), with the year's own wobble; rates follow.
 *   Crashes        the regional ones the world history doesn't already tell (world/History.js has
 *                  1873, 1929, 1973, 2000 and 2008): the panics of 1837, 1857, 1893 and 1907, the
 *                  Nordic banking crisis, Japan's bubble, the Asian and Russian crises, Argentina's
 *                  corralito, the euro crisis.
 *   Hyperinflation prices doubling by the week: you choose what to do with your savings, and at
 *                  the end, money held in the old currency is all but worthless — and so are debts.
 *
 * state.moneyDay = { seed, done: { [id]: year }, hyper: { id, choice } }
 * Its own random stream, so the rest of the year rolls as it always did.
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow, PRESENT, priceIndex } from '../world/Eras.js';
import { demographyAt } from '../world/HistoricalData.js';

const cc = (state) => state.character?.countryId ?? 'US';

/* ---------------------------------------------------------------- inflation by place and decade */

const BLOCS = {
  US: ['US'], GB: ['GB', 'IE', 'AU', 'NZ', 'CA', 'MT', 'CY'],
  westEU: ['FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'AT', 'CH', 'DK', 'SE', 'NO', 'FI', 'IS', 'GR', 'AD', 'MC', 'SM', 'LI'],
  JP: ['JP', 'KR', 'TW', 'SG', 'HK'],
  latin: ['MX', 'AR', 'BR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'UY', 'PY', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'DO', 'CU', 'HT'],
  eastBloc: ['RU', 'UA', 'BY', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'AL', 'EE', 'LV', 'LT', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'XK', 'MN', 'CN', 'VN', 'LA', 'KP'],
};
const blocOf = (c) => Object.entries(BLOCS).find(([, list]) => list.includes(c))?.[0] ?? 'other';
/** Typical yearly inflation by decade (1800s … 2020s), from long-run CPI series (rounded). */
const DECADES = {
  //       1800   1810   1820   1830  1840   1850  1860  1870   1880   1890   1900   1910  1920   1930   1940  1950   1960   1970  1980  1990   2000   2010   2020
  US: [0.01, 0.01, -0.02, 0, -0.01, 0.01, 0.05, -0.03, -0.01, -0.01, 0.015, 0.06, -0.01, -0.02, 0.055, 0.02, 0.025, 0.075, 0.05, 0.03, 0.025, 0.018, 0.04],
  GB: [0.02, 0.01, -0.03, 0, -0.01, 0.01, 0.01, -0.01, -0.01, 0, 0.01, 0.08, -0.03, 0, 0.05, 0.04, 0.04, 0.13, 0.06, 0.03, 0.02, 0.022, 0.05],
  westEU: [0.02, 0.02, -0.02, 0, 0, 0.01, 0.01, 0, 0, 0, 0.01, 0.12, 0.05, -0.01, 0.2, 0.04, 0.04, 0.1, 0.06, 0.03, 0.02, 0.012, 0.045],
  JP: [0.01, 0.01, 0, 0.02, 0.02, 0.03, 0.08, 0.02, 0, 0.02, 0.03, 0.08, -0.02, 0.01, 0.6, 0.04, 0.055, 0.09, 0.025, 0.008, -0.003, 0.005, 0.02],
  latin: [0.02, 0.03, 0.02, 0.02, 0.02, 0.02, 0.03, 0.02, 0.03, 0.05, 0.03, 0.05, 0.02, 0.03, 0.08, 0.15, 0.25, 0.4, 0.8, 0.2, 0.07, 0.06, 0.07],
  eastBloc: [0.02, 0.02, 0, 0, 0, 0.01, 0.02, 0.01, 0.01, 0.01, 0.02, 0.2, 0.06, 0.02, 0.15, 0.02, 0.01, 0.02, 0.05, 0.4, 0.07, 0.04, 0.08],
  other: [0.02, 0.02, 0, 0, 0, 0.01, 0.02, 0.01, 0.01, 0.01, 0.02, 0.06, 0.01, 0, 0.08, 0.05, 0.06, 0.12, 0.12, 0.12, 0.06, 0.05, 0.06],
};
/** The typical inflation of a year where you live (before the year's own wobble). */
export function decadeInflation(state, country = cc(state)) {
  const y = yearNow(state);
  const row = DECADES[blocOf(country)];
  return row[clamp(Math.floor((y - 1800) / 10), 0, row.length - 1)];
}

/* ---------------------------------------------------------------- crashes and hyperinflations */

/** Crashes the world history doesn't tell, where they hit: [year, places, cause, years of recession, what happened]. */
export const CRASHES = [
  { id: 'panic1837', year: 1837, where: ['US', 'GB'], cause: 'financial', years: 4, text: 'The Panic of 1837: banks have stopped paying out in gold, and hundreds have failed.' },
  { id: 'panic1857', year: 1857, where: ['US', 'GB', 'DE', 'FR'], cause: 'financial', years: 1, text: 'The Panic of 1857: a railway bank failed, and the panic crossed the Atlantic by telegraph.' },
  { id: 'baringCrisis', year: 1890, where: ['AR', 'GB', 'UY'], cause: 'financial', years: 2, text: 'The Baring crisis: Argentina defaulted, and a great London bank nearly fell with it.' },
  { id: 'panic1893', year: 1893, where: ['US', 'AU', 'NZ'], cause: 'financial', years: 3, text: 'The Panic of 1893: railways and banks are failing; the queues outside the banks go round the block.' },
  { id: 'panic1907', year: 1907, where: ['US', 'MX'], cause: 'financial', years: 1, text: 'The Panic of 1907: a run on the trust companies; J. P. Morgan locked the bankers in his library until they saved the system.' },
  { id: 'depression1920', year: 1920, where: ['US', 'GB', 'CA', 'AU'], cause: 'financial', years: 1, text: 'The post-war slump: prices are falling fast and factories are laying men off.' },
  { id: 'japanBubble', year: 1991, where: ['JP'], cause: 'financial', years: 3, text: 'Japan\'s bubble has burst: land and shares are worth a fraction of last year\'s prices. A lost decade begins.' },
  { id: 'nordicBanks', year: 1991, where: ['SE', 'FI', 'NO'], cause: 'financial', years: 2, text: 'The Nordic banking crisis: banks that lent too freely are failing, and the state is taking them over.' },
  { id: 'tequila', year: 1994, where: ['MX', 'AR'], cause: 'financial', years: 1, text: 'The peso crisis: the peso has lost half its value overnight.' },
  { id: 'asian1997', year: 1997, where: ['TH', 'ID', 'KR', 'MY', 'PH', 'SG', 'HK'], cause: 'financial', years: 1, text: 'The Asian financial crisis: the baht fell, and the currencies of half of Asia fell after it.' },
  { id: 'russia1998', year: 1998, where: ['RU', 'UA', 'BY', 'KZ', 'MD'], cause: 'financial', years: 1, text: 'Russia has defaulted on its debts; the rouble has collapsed and the banks are closed.' },
  { id: 'corralito', year: 2001, where: ['AR', 'UY'], cause: 'financial', years: 2, text: 'The corralito: bank accounts are frozen, the peso is cut loose from the dollar, and presidents come and go in a fortnight.' },
  { id: 'euroCrisis', year: 2010, where: ['GR', 'PT', 'IE', 'ES', 'IT', 'CY'], cause: 'financial', years: 3, text: 'The euro crisis: the government can\'t borrow; austerity — cuts to pay, pensions and jobs — is the price of a bailout.' },
];

/** Hyperinflations: years of it, the currency and how it went. */
export const HYPERS = [
  { id: 'austria1921', years: [1921, 1922], where: ['AT'], money: 'krone', text: 'Prices doubled and doubled again; Vienna\'s savings are gone.' },
  { id: 'weimar', years: [1922, 1923], where: ['DE'], money: 'Papiermark', text: 'A loaf of bread costs 200 billion marks. Workers are paid twice a day and run to the shops.' },
  { id: 'poland1923', years: [1923, 1923], where: ['PL'], money: 'Polish mark', text: 'The Polish mark is worth less than the paper it is printed on.' },
  { id: 'greece1944', years: [1943, 1944], where: ['GR'], money: 'drachma', text: 'Under occupation, the drachma has collapsed: notes of 100 billion drachmas buy a few eggs.' },
  { id: 'hungary1946', years: [1945, 1946], where: ['HU'], money: 'pengő', text: 'The worst inflation the world has ever seen: prices double every fifteen hours. Notes for a hundred quintillion pengő.' },
  { id: 'china1948', years: [1947, 1949], where: ['CN', 'TW'], money: 'gold yuan', text: 'The Nationalist currency is collapsing; people carry banknotes in sacks.' },
  { id: 'bolivia1985', years: [1984, 1985], where: ['BO'], money: 'peso boliviano', text: 'Inflation is over 20,000 percent; a stack of notes outweighs what it buys.' },
  { id: 'nicaragua1988', years: [1987, 1990], where: ['NI'], money: 'córdoba', text: 'War and blockade: prices are rising by the hour.' },
  { id: 'peru1990', years: [1988, 1990], where: ['PE'], money: 'inti', text: 'The inti is collapsing; prices rise 7,000 percent in a year.' },
  { id: 'argentina1989', years: [1989, 1990], where: ['AR'], money: 'austral', text: 'Hyperinflation: shops change their prices twice a day; supermarkets are being looted.' },
  { id: 'brazil1990', years: [1989, 1994], where: ['BR'], money: 'cruzado', text: 'Prices rise every day; a new currency every few years, until the real.' },
  { id: 'russia1992', years: [1992, 1993], where: ['RU', 'UA', 'BY', 'KZ', 'AM', 'GE', 'AZ', 'KG', 'TJ', 'TM', 'UZ', 'MD'], money: 'rouble', text: 'Prices freed overnight: a lifetime\'s savings now buys a pair of shoes.' },
  { id: 'yugoslavia1993', years: [1992, 1994], where: ['RS', 'ME', 'MK', 'BA'], money: 'Yugoslav dinar', text: 'Under sanctions, the dinar is worthless: the price of bread doubles before lunch.' },
  { id: 'zaire1993', years: [1991, 1994], where: ['CD'], money: 'zaïre', text: 'Soldiers paid in worthless notes riot; the zaïre is redenominated and falls again.' },
  { id: 'angola1996', years: [1995, 1996], where: ['AO'], money: 'kwanza', text: 'The kwanza has collapsed after years of war.' },
  { id: 'zimbabwe2008', years: [2007, 2008], where: ['ZW'], money: 'Zimbabwe dollar', text: 'A 100-trillion-dollar note buys a bus ticket. In the end the country gives up its money for the US dollar.' },
  { id: 'venezuela2018', years: [2016, 2019], where: ['VE'], money: 'bolívar', text: 'Prices double every few weeks; the shelves are empty and millions are leaving.' },
];

/** The year's hyperinflation where you live, or null. */
export const hyperHere = (state) => HYPERS.find((h) => { const y = yearNow(state); return h.where.includes(cc(state)) && y >= h.years[0] && y <= h.years[1]; }) ?? null;

function moneyRng(state) {
  state.moneyDay ??= { done: {} };
  const s = state.moneyDay;
  s.seed = ((s.seed ?? (((state.world?.seed ?? 1) * 7919) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(s.seed);
}

/** How rich the place is now against today, in real terms (GDP per head): about how far a wage went. */
export function livingStandard(state, country = cc(state)) {
  const then = demographyAt(country, yearNow(state))?.gdp;
  const now = demographyAt(country, 2018)?.gdp;
  return then && now ? clamp(then / now, 0.02, 2) : 1;
}

/**
 * What things cost in a year. A thing's real price follows how rich the place was (`livingStandard`)
 * by its own elasticity: bread and milk cost about what they do now, a house or a newspaper far less,
 * a car somewhat less (but more of a wage), a television when it was new several times today's price.
 * Calibrated on US prices of 1930 and 1950 (a loaf 9¢, a Model A $500, a house $4,800, a wage $1,400).
 */
export const BASKET = [
  { id: 'bread', label: 'A loaf of bread', icon: '🍞', today: 3.5, e: 0.45 },
  { id: 'milk', label: 'A pint of milk', icon: '🥛', today: 1, e: 0.05 },
  { id: 'paper', label: 'A newspaper', icon: '📰', today: 2.5, e: 0.8 },
  { id: 'cinema', label: 'A cinema ticket', icon: '🎞️', today: 12, e: 0.55, from: 1910 },
  { id: 'car', label: 'A new family car', icon: '🚗', today: 30000, e: 0.7, from: 1910 },
  { id: 'tv', label: 'A television', icon: '📺', today: 500, e: -1.7, from: 1948 },
  { id: 'house', label: 'An ordinary house', icon: '🏠', today: 350000, e: 0.85 },
  { id: 'wage', label: 'A working man\'s year\'s wages', icon: '💼', today: 45000, e: 0.55 },
];
/** A thing's price in the year: in today's money (real buying power) and in US dollars of the day. */
export function priceThen(state, item) {
  const y = yearNow(state);
  if (item.from && y < item.from) return null;
  const real = item.today * livingStandard(state) ** item.e;
  return { real: Math.round(real), ofTheDay: real * priceIndex(y) };
}

/* ---------------------------------------------------------------- the year */

function crashYear(ctx, rng) {
  const { state } = ctx;
  const e = state.economy;
  const y = yearNow(state);
  const md = state.moneyDay;
  for (const c of CRASHES) {
    if (md.done[c.id] != null || y !== c.year || !c.where.includes(cc(state))) continue;
    md.done[c.id] = y;
    e.phase = 'recession';
    e.phaseYears = -c.years + 1;
    e.cause = { id: c.cause, since: state.character.age };
    ctx.log(`📉 ${c.text}`, '📉', 'warn');
    ctx.emit('news:story', { tier: 'national', headline: c.text.split(':')[0], weight: 6, icon: '📉' });
  }
}

function hyperYear(ctx, rng) {
  const { state } = ctx;
  const h = hyperHere(state);
  const md = state.moneyDay;
  const e = state.economy;
  if (!h) return;
  e.periodInflation = 50 + rng.float(0, 500);
  e.inflation = 0.2;
  e.interestRate = 0.16;
  const y = yearNow(state);
  // The first year of it: what to do with what you've saved.
  if (y === h.years[0] && md.done[h.id] == null && state.character.age >= 18) {
    md.done[h.id] = y;
    md.hyper = { id: h.id, choice: null };
    ctx.prompt({ type: 'moneyDay.hyper', icon: '🔥', title: 'Hyperinflation', text: `${h.text} Your savings are in the ${h.money}.`, data: { id: h.id }, options: [
      { id: 'foreign', label: '💵 Into dollars, gold or anything foreign', hint: 'Black market rates; often illegal; keeps most of it' },
      { id: 'goods', label: '📦 Spend it now: goods, tools, anything that keeps', hint: 'Keeps about half its worth' },
      { id: 'hold', label: '🏦 Leave it in the bank and wait', hint: 'It can\'t go on for ever' },
    ] });
  } else if (md.done[h.id] == null) md.done[h.id] = y;
  // The last year: what's left of money held in the old currency, and of debts in it.
  if (y === h.years[1]) {
    const keep = { foreign: 0.75, goods: 0.5, hold: 0.03 }[md.hyper?.id === h.id ? md.hyper.choice ?? 'hold' : 'hold'];
    const f = state.finances;
    if (f.cash > 500) {
      const lost = Math.round(f.cash * (1 - keep));
      f.cash -= lost;
      ctx.log(keep < 0.1 ? `🔥 The ${h.money} is worthless. A lifetime's savings — $${lost.toLocaleString()} of buying power — is gone.` : `🔥 The ${h.money} is finished. What you kept out of it held: you lost $${lost.toLocaleString()}, not everything.`, '🔥', 'bad');
      ctx.stat('happiness', keep < 0.1 ? -15 : -5);
      ctx.stat('stress', 10);
    }
    // Debts in the old money were wiped out with it: a mortgage paid off with a week's wages.
    let wiped = 0;
    for (const p of state.housing?.properties ?? []) if (p.mortgage?.balance > 0) { wiped += p.mortgage.balance * 0.97; p.mortgage.balance = Math.round(p.mortgage.balance * 0.03); }
    if (f.loans > 0) { wiped += f.loans * 0.97; f.loans = Math.round(f.loans * 0.03); }
    if (wiped > 1000) ctx.log(`Your debts went with it: $${Math.round(wiped).toLocaleString()} owed in the old money is now worth almost nothing.`, '🧾', 'good');
    ctx.emit('news:story', { tier: 'national', headline: `A new currency replaces the worthless ${h.money}`, weight: 7, icon: '💱' });
    md.hyper = null;
  }
}

export const MoneyOfTheDayModule = {
  id: 'moneyDay',
  order: 1.05,
  init(state) { state.moneyDay ??= { done: {} }; },
  onAgeUp(ctx) {
    const { state } = ctx;
    const e = state.economy;
    if (!e || !state.era || yearNow(state) >= PRESENT) return;
    const rng = moneyRng(state);
    // The year's inflation is the time and place's, give or take; interest rates follow it.
    const before = e.inflation;
    const base = decadeInflation(state);
    // The true figure is kept for the record; the systems that index to it (unions, pensions,
    // real returns, mortgage rates) see it capped, so a 1980s Latin American 80% doesn't break them.
    e.periodInflation = Math.round(clamp(base * rng.float(0.7, 1.3) + rng.float(-0.012, 0.012) + (e.phase === 'recession' ? -0.01 : e.phase === 'peak' ? 0.01 : 0), -0.06, 3) * 1000) / 1000;
    e.inflation = Math.min(0.2, e.periodInflation);
    e.interestRate = Math.round(clamp(Math.max(0.01, e.inflation) + rng.float(0.005, 0.03), 0.0025, 0.16) * 10000) / 10000;
    e.cpi = Math.round((e.cpi / (1 + before)) * (1 + e.inflation) * 10000) / 10000;
    crashYear(ctx, rng);
    hyperYear(ctx, rng);
    const last = e.history?.at(-1);
    if (last) last.inflation = e.inflation;
  },
  resolvers: {
    hyper(ctx, data, optionId) {
      const md = ctx.state.moneyDay;
      md.hyper = { id: data.id, choice: optionId };
      if (optionId === 'foreign') { ctx.stat('stress', 4); ctx.log('You changed what you could into dollars and gold on the black market.', '💵', 'info'); }
      else if (optionId === 'goods') ctx.log('You spent every note the day you got it: tools, cloth, tins, anything that would keep.', '📦', 'info');
      else ctx.log('You left your savings where they were.', '🏦', 'warn');
    },
  },
};
