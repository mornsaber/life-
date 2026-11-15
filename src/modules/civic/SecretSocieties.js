/**
 * Secret societies: the lodge, the senior society, the dining club, the camp in the redwoods.
 *
 *   Freemasons     lodges from 1717 almost everywhere. You ask a member to propose you; three
 *                  degrees (Entered Apprentice, Fellowcraft, Master Mason) and higher ones after
 *                  (the Royal Arch, the 33rd degree). Men only in the mainstream lodges. Banned
 *                  under the Nazis, Mussolini, Franco and the Communists — membership there is
 *                  dangerous — and forbidden to Catholics by their Church.
 *   Propaganda Due the Italian lodge of the powerful (from 1945), exposed in 1981 with a list of
 *                  ministers, generals and bankers.
 *   Student        Skull and Bones and the senior societies of the American elite colleges
 *   societies      (from 1832; women from 1991); the Cambridge Apostles (1820), whose 1930s
 *                  members included Soviet spies; Oxford's Bullingdon (1780), wealth and
 *                  smashed restaurants.
 *   The Grove      the Bohemian Grove (1872): two weeks in the California redwoods for powerful
 *                  men, by invitation only.
 *   The Carbonari  revolutionary secret society in Italy (to 1831): oaths, plots, arrests.
 *
 *   Membership     contacts (your standing at work), help in business and politics, and the
 *                  risk of exposure.
 *
 * state.secretSocieties = { [id]: { since, degree, exposed } }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, netWorth } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { universityOf } from '../education/Universities.js';
import { rep } from '../life/Reputation.js';
import { addBuzz, scandal } from '../life/Fame.js';
import { leaveJob } from '../career/CareerEngine.js';

const local = (state, n) => Math.round(n * priceLevel(state));
const cc = (state) => state.character.countryId ?? 'US';
const side = (state, salt) => new Random(((state.world?.seed ?? 10) * 45989 + state.character.age * 1213 + salt) >>> 0);
const male = (state) => state.character.gender !== 'female';
const uni = (state) => (state.education?.enrolled?.universityId ? universityOf(state.education.enrolled.universityId) : null);
const catholic = (state) => /catholic/i.test(state.community?.faith?.traditionId ?? '');

/** Where Freemasonry was banned, and when. */
const MASONS_BANNED = { DE: [1935, 1945], AT: [1938, 1945], IT: [1925, 1943], ES: [1939, 1975], PT: [1935, 1974], RU: [1922, 1991], PL: [1938, 1989], HU: [1920, 1989], CZ: [1948, 1989], RO: [1948, 1989], BG: [1940, 1989], CN: [1949, 9999], KP: [1948, 9999], CU: [1959, 9999], IR: [1979, 9999], SA: [0, 9999] };
export const masonsBanned = (c, y) => { const b = MASONS_BANNED[c]; return Boolean(b) && y >= b[0] && y < b[1]; };
const MASON_DEGREES = ['Entered Apprentice', 'Fellowcraft', 'Master Mason', 'Royal Arch Mason', 'Knight Templar', '33rd degree'];

export const SOCIETIES = {
  masons: { name: 'the Freemasons', icon: '📐', from: 1717, eligible: (s) => s.character.age >= 21 && male(s), why: 'Men over 21: a member proposes you' },
  p2: { name: 'Propaganda Due (P2)', icon: '🕯️', from: 1945, until: 1981, eligible: (s) => cc(s) === 'IT' && s.character.age >= 30 && (s.politics?.office || netWorth(s) >= local(s, 5e6) || (s.career.job?.grade ?? 0) >= 8), invite: true, why: 'For the powerful in Italy, by invitation' },
  bones: { name: (s) => (/Yale/.test(uni(s)?.name ?? '') ? 'Skull and Bones' : `${uni(s)?.name ?? 'the college'}'s oldest senior society`), icon: '💀', from: 1832, eligible: (s) => cc(s) === 'US' && uni(s)?.type === 'elite' && (male(s) || yearNow(s) >= 1991) && s.stats.smarts >= 70, invite: true, why: 'Tapped in your junior year at an elite college' },
  apostles: { name: 'the Cambridge Apostles', icon: '📜', from: 1820, eligible: (s) => uni(s)?.id === 'cambridge' && s.stats.smarts >= 85 && (male(s) || yearNow(s) >= 1970), invite: true, why: 'The cleverest at Cambridge, elected by the members' },
  bullingdon: { name: 'the Bullingdon Club', icon: '🍾', from: 1780, eligible: (s) => uni(s)?.id === 'oxford' && male(s) && netWorth(s) >= local(s, 2e5), invite: true, why: 'Rich young men at Oxford' },
  grove: { name: 'the Bohemian Grove', icon: '🌲', from: 1872, eligible: (s) => cc(s) === 'US' && male(s) && s.character.age >= 40 && (s.politics?.office || netWorth(s) >= local(s, 5e7)), invite: true, why: 'Powerful men, by invitation, in the California redwoods' },
  carbonari: { name: 'the Carbonari', icon: '🔥', from: 1800, until: 1832, eligible: (s) => cc(s) === 'IT' && s.character.age >= 18, why: 'Italian revolutionaries, by oath' },
};
const nameOf = (state, s) => (typeof s.name === 'function' ? s.name(state) : s.name);
export const memberOf = (state) => state.secretSocieties ?? {};

export function societiesOpen(state) {
  const y = yearNow(state);
  return Object.entries(SOCIETIES).filter(([, s]) => y >= s.from && !(s.until <= y)).map(([id, s]) => ({ id, ...s, name: nameOf(state, s), ok: s.eligible(state), member: Boolean(memberOf(state)[id]) }));
}

/** Ask to join (the Freemasons, the Carbonari); the others invite you. */
function petition(ctx, id) {
  const { state } = ctx;
  const s = SOCIETIES[id];
  if (!s || s.invite) return ctx.toast('By invitation only', 'warn');
  if (memberOf(state)[id]) return ctx.toast('Already a member', 'warn');
  if (!s.eligible(state)) return ctx.toast(s.why, 'warn');
  if (yearlyCount(state, `secret.${id}`)) return ctx.toast('Wait a year', 'warn');
  bumpYearly(state, `secret.${id}`);
  const rng = side(state, 0x51);
  if (!rng.chance(0.6 + (state.society?.standing ?? 40) / 300)) return ctx.log(`The lodge's committee met. Your proposal was not carried, this time.`, '⚫', 'warn');
  join(ctx, id);
  return undefined;
}
function join(ctx, id) {
  const { state } = ctx;
  const s = SOCIETIES[id];
  (state.secretSocieties ??= {})[id] = { since: state.character.age, degree: 0, exposed: false };
  ctx.spend(local(state, id === 'masons' ? 400 : id === 'grove' ? 25000 : 1000), `${nameOf(state, s)}: dues`, { allowDebt: true });
  rep(ctx, 'work', 4, 'new connections');
  const y = yearNow(state);
  if (id === 'masons' && masonsBanned(cc(state), y)) ctx.log('Freemasonry is banned here. You were initiated in a back room, and told never to speak of it.', '🤫', 'warn');
  if (id === 'masons' && catholic(state)) ctx.log('Your Church forbids Catholics to be Freemasons. Your priest must never know.', '⛪', 'warn');
  const text = {
    masons: 'Blindfolded, a slipper on one foot, a noose at your neck: you were initiated an Entered Apprentice.',
    p2: 'You were given a membership card and told the list was secret. Ministers, generals and bankers were on it.',
    bones: 'On Tap Night a senior knocked on your door: "Skull and Bones: accept or reject?" You spent Thursday nights in the Tomb.',
    apostles: 'You read your first paper to the Apostles on a Saturday night, sitting on the hearthrug, as the tradition is.',
    bullingdon: 'Tailcoats, champagne, and the first dinner. The restaurant asked for a deposit.',
    grove: 'Two weeks in the redwoods: the Cremation of Care, lakeside talks, and men who run the country in shorts.',
    carbonari: 'You swore the oath of the Carbonari by candlelight. Liberty, and death to traitors.',
  }[id];
  return ctx.log(text, s.icon, 'milestone');
}

/** The year as a member: degrees, connections, the risk of it all coming out. */
function societyYear(ctx) {
  const { state } = ctx;
  const m = state.secretSocieties;
  const y = yearNow(state);
  const rng = side(state, 0x5ec);
  // Invitations, for those who are noticed.
  if (!state.prompts.some((p) => p.type?.startsWith('secretSocieties.'))) {
    const inv = Object.entries(SOCIETIES).find(([id, s]) => s.invite && y >= s.from && !(s.until <= y) && !m?.[id] && s.eligible(state) && !state.flags?.[`secretRefused.${id}`]);
    if (inv && rng.chance(0.3)) {
      const [id, s] = inv;
      return void ctx.prompt({ type: 'secretSocieties.invite', icon: s.icon, title: 'An Invitation', text: `A quiet word, and an envelope: you are invited to join ${nameOf(state, s)}.`, data: { id },
        options: [{ id: 'accept', label: '🤝 Accept' }, { id: 'decline', label: '🙅 Decline' }] });
    }
  }
  if (!m) return;
  for (const [id, rec] of Object.entries(m)) {
    if (id === 'masons' && rec.degree < MASON_DEGREES.length - 1 && rng.chance(rec.degree < 2 ? 0.7 : 0.15)) {
      rec.degree += 1;
      ctx.log(`You were raised to ${MASON_DEGREES[rec.degree]} in your lodge.`, '📐', 'good');
    }
    rep(ctx, 'work', 1, 'friends in the lodge');
    // The secret comes out.
    if (rec.exposed) continue;
    if (id === 'p2' && y === 1981) {
      rec.exposed = true;
      scandal(ctx, 3, 'your name on the P2 list');
      ctx.log('The police raided Licio Gelli\'s villa and found the P2 list. Your name is on it, with 961 others. The government fell.', '📋', 'bad');
    } else if (id === 'masons' && masonsBanned(cc(state), y) && rng.chance(0.15)) {
      rec.exposed = true;
      ctx.stat('stress', 15);
      ctx.log('The secret police found the lodge\'s membership book. You were questioned for three days and lost your job.', '🚨', 'bad');
      if (state.career?.job) leaveJob(ctx, 'Dismissed as a Freemason', { fired: true });
    } else if (id === 'bullingdon' && rng.chance(0.2)) {
      rec.exposed = true;
      addBuzz(state, 6);
      ctx.log('The Bullingdon dinner ended with a smashed restaurant and a photograph that will follow you for the rest of your life.', '📸', 'warn');
    } else if (id === 'apostles' && y >= 1930 && y <= 1955 && rng.chance(0.05)) {
      rec.exposed = true;
      ctx.log('MI5 interviewed you about your old friends from the Apostles. Some of them were working for Moscow.', '🕵️', 'warn');
    } else if (id === 'carbonari' && rng.chance(0.15)) {
      rec.exposed = true;
      ctx.stat('health', -6);
      ctx.log('The Austrian police broke up your cell of the Carbonari. You fled across the mountains.', '🔥', 'bad');
    }
  }
}

export const SecretSocietiesResolvers = {
  invite(ctx, data, optionId) {
    const { state } = ctx;
    if (optionId === 'accept') return join(ctx, data.id);
    (state.flags ??= {})[`secretRefused.${data.id}`] = true;
    return ctx.log('You declined. They will not ask again.', '🙅', 'info');
  },
};

export const SecretSocietiesModule = {
  id: 'secretSocieties',
  order: 37,
  onAgeUp(ctx) { if (ctx.state.character.alive) societyYear(ctx); },
  actions: {
    petition,
    leave(ctx, id) {
      const m = ctx.state.secretSocieties;
      if (!m?.[id]) return ctx.toast('Not a member', 'warn');
      delete m[id];
      return ctx.log(`You resigned from ${nameOf(ctx.state, SOCIETIES[id])}.`, '🚪', 'info');
    },
  },
  resolvers: SecretSocietiesResolvers,
};
export const masonDegree = (state) => MASON_DEGREES[memberOf(state).masons?.degree ?? 0];
export const clampDegree = (n) => clamp(n, 0, MASON_DEGREES.length - 1);
