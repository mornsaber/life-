/**
 * Fame of its day: the media that carried a name, how far it could carry it, and the forms fame
 * took in each era (the lecture tour before the talk show, the gossip column before the paparazzi,
 * a patent medicine before a sportswear deal).
 *
 *   Media     the penny press (1830s), illustrated papers (1842), photographs and cartes de visite
 *             (1860), the newsreel (1910), radio (from about 1922), television (by country, 1948 in
 *             America to 1976 in South Africa), the web (1995), social media (2006), streaming (2007).
 *   Reach     local, national, international or global: the widest the media of the day allowed
 *             (no one was a global celebrity in 1850; Jenny Lind and Dickens were international).
 */
import { yearNow } from '../world/Eras.js';

/** Television's arrival, by country (regular broadcasts to most homes in reach). */
const TV_FROM = { US: 1948, GB: 1950, CA: 1952, FR: 1955, DE: 1953, NL: 1951, JP: 1953, IT: 1954, RU: 1955, MX: 1950, BR: 1950, AR: 1951, AU: 1956, SE: 1956, ES: 1956, IE: 1961, IN: 1965, CN: 1965, NZ: 1960, KR: 1961, ZA: 1976, NG: 1959, EG: 1960 };
const RADIO_FROM = { US: 1920, GB: 1922, FR: 1922, DE: 1923, CA: 1922, AU: 1923, JP: 1925, RU: 1924, IN: 1927, default: 1926 };
const cc = (state) => state.character?.countryId ?? 'US';
export const tvHere = (state) => yearNow(state) >= (TV_FROM[cc(state)] ?? 1960);
export const radioHere = (state) => yearNow(state) >= (RADIO_FROM[cc(state)] ?? RADIO_FROM.default);

/** The media that carry a name this year, newest last. */
export function mediaNow(state) {
  const y = yearNow(state);
  return [
    ['press', y >= 1800, '📰 the newspapers'],
    ['illustrated', y >= 1842, '🖼️ the illustrated papers'],
    ['photo', y >= 1860, '📷 photographs'],
    ['newsreel', y >= 1910, '🎞️ the newsreels'],
    ['radio', radioHere(state), '📻 radio'],
    ['tv', tvHere(state), '📺 television'],
    ['web', y >= 1995, '🌐 the web'],
    ['social', y >= 2006, '📱 social media'],
  ].filter(([, ok]) => ok).map(([id, , label]) => ({ id, label }));
}

export const REACH = ['local', 'national', 'international', 'global'];
/** How far your name travels: fame, capped by what the media of the day could carry. */
export function reachOf(state, score) {
  const has = (id) => mediaNow(state).some((m) => m.id === id);
  const cap = has('tv') || has('web') ? 3 : has('newsreel') || has('radio') ? 2 : has('illustrated') ? 2 : 1;
  const want = score >= 70 ? 3 : score >= 45 ? 2 : score >= 20 ? 1 : 0;
  return REACH[Math.min(cap, want)];
}
export const REACH_LABEL = { local: 'known in your town', national: 'known across the country', international: 'known abroad', global: 'known around the world' };

/** The line when you reach a new tier, in the words of the day. */
export function tierLine(state, tier) {
  const y = yearNow(state);
  const lines = y < 1900
    ? [null, 'People in town began to know your face.', 'Your name is in the newspapers.', 'You are famous: strangers point you out in the street.', 'You are celebrated: your portrait sells in the print shops.', 'You are one of the most famous people of the age.']
    : y < 1950
      ? [null, 'People in town began to know your face.', 'Your name is in the papers.', 'You are famous: you are recognised on the train.', 'You are a star: your face is on magazine covers.', 'You are an icon: the newsreels follow you everywhere.']
      : y < 2008
        ? [null, 'People in town started to recognise you.', 'Strangers know your name now.', 'You are famous: you can\'t buy groceries without someone asking for an autograph.', 'You are a star: your name sells magazines.', 'You are an icon: one of the most recognised people alive.']
        : [null, 'People in town started to recognise you.', 'Strangers know your name now.', 'You are famous: you can\'t buy groceries without a selfie.', 'You are a star: your name sells magazines.', 'You are an icon: one of the most recognised people alive.'];
  return lines[tier];
}

/** Who wants your face on their goods, by the year (soap and patent medicine before cola and trainers). */
const BRANDS = [
  ['a soap maker', 1830], ['a patent-medicine company', 1830, 1940], ['a cocoa and chocolate firm', 1850], ['a tobacco company (cigarette cards)', 1880, 1980],
  ['a bicycle maker', 1885], ['a motor car company', 1905], ['a soft-drink brand', 1900], ['a cosmetics line', 1910], ['an airline', 1930], ['a bank', 1950],
  ['a fast-food chain', 1955], ['a sportswear giant', 1975], ['a luxury watchmaker', 1920], ['a phone maker', 1995], ['a crypto exchange', 2015],
];
export const brandsNow = (y) => BRANDS.filter(([, from, until]) => y >= from && !(until && y >= until)).map(([b]) => b);

/** What the papers can have on you, by the year. */
const SCANDALS = [
  ['an old friend sold the story of your youth to the papers', 8, 1830], ['your debts were the talk of the town', 9, 1830], ['letters you wrote to a lover were published', 10, 1830],
  ['photographs from a party you\'d rather forget', 7, 1890], ['your tax affairs made the front page', 12, 1920], ['an ex wrote a tell-all', 11, 1950],
  ['an old video of you surfaced', 10, 1985], ['a leaked group chat', 9, 2010],
];
export const scandalsNow = (y) => SCANDALS.filter(([, , from]) => y >= from).map(([h, s]) => [h, s]);

/** The chat show of the day. */
export function showOfTheDay(state) {
  if (tvHere(state)) return { title: 'A Late-Night Show', text: 'A late-night talk show wants you on the couch next week.', go: '😄 Go on and be charming', win: 'You killed it: the clip was everywhere the next morning.' };
  if (radioHere(state)) return { title: 'On the Wireless', text: 'The wireless wants you for an interview on its evening programme.', go: '🎙️ Go on the air', win: 'Half the country heard you, and the letters poured in.' };
  return { title: 'A Lecture Tour', text: 'An impresario offers you a lecture tour: a hall in every big town, your name on the posters.', go: '🎩 Take to the platform', win: 'Packed halls every night, and the papers printed your best lines.' };
}

/** The cameras (or the columnists). */
export function intrusionOfTheDay(state) {
  const y = yearNow(state);
  if (y >= 1955) return { title: 'Paparazzi', text: 'Photographers have been camped outside your home all week. Today one followed you into a restaurant.' };
  if (y >= 1900) return { title: 'The Press Photographers', text: 'Press photographers wait at your door every morning, and the papers print whatever they get.' };
  return { title: 'The Gossip Columns', text: 'The gossip columns have your every outing; a reporter bribed your maid for the details.' };
}
