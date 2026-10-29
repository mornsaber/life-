/**
 * The Crown's representatives overseas: governors of the British Overseas Territories,
 * lieutenant governors of the Crown Dependencies, governors-general of the realms — and the
 * Danish and Dutch kingdoms' equivalents. Historically half of these went to royals
 * (Prince Arthur in Canada, the Duke of Gloucester in Australia), the island governorships
 * to retired generals and admirals, and the territories to senior diplomats.
 *
 *   Who is asked   a working royal (not the heir or sovereign); a retired general or admiral
 *                  of that country's forces; a senior diplomat. Offers come every few years
 *   The post       a term of four or five years at Government House, a plumed hat, the style
 *                  "His/Her Excellency", the reserved powers (rarely used), hurricanes, a
 *                  constitutional crisis or two. A good term ends with a knighthood (a royal
 *                  gets the Grand Cross)
 *
 * state.overseasPost = { id, title, place, residence, since, until, standing }
 * state.overseasPast = [{ id, title, from, to }]
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, addHonor } from '../../core/State.js';

/** Posts by the crown that fills them. kind: royal | military | diplomat — who it usually goes to. */
export const POSTS = {
  gibraltar: { crown: 'GB', title: 'Governor and Commander-in-Chief of Gibraltar', place: 'Gibraltar', residence: 'The Convent, Gibraltar', kinds: ['military'], storms: false },
  jersey: { crown: 'GB', title: 'Lieutenant Governor of Jersey', place: 'Jersey', residence: 'Government House, St Saviour', kinds: ['military', 'diplomat'], storms: false },
  guernsey: { crown: 'GB', title: 'Lieutenant Governor of Guernsey', place: 'Guernsey', residence: 'Government House, St Peter Port', kinds: ['military', 'diplomat'], storms: false },
  isleOfMan: { crown: 'GB', title: 'Lieutenant Governor of the Isle of Man', place: 'the Isle of Man', residence: 'Government House, Onchan', kinds: ['military', 'diplomat'], storms: false },
  bermuda: { crown: 'GB', title: 'Governor of Bermuda', place: 'Bermuda', residence: 'Government House, Hamilton', kinds: ['diplomat', 'royal'], storms: true },
  falklands: { crown: 'GB', title: 'Governor of the Falkland Islands', place: 'the Falkland Islands', residence: 'Government House, Stanley', kinds: ['diplomat', 'military'], storms: false },
  cayman: { crown: 'GB', title: 'Governor of the Cayman Islands', place: 'the Cayman Islands', residence: 'Government House, Grand Cayman', kinds: ['diplomat'], storms: true },
  bvi: { crown: 'GB', title: 'Governor of the British Virgin Islands', place: 'the British Virgin Islands', residence: 'Government House, Road Town', kinds: ['diplomat'], storms: true },
  tci: { crown: 'GB', title: 'Governor of the Turks and Caicos Islands', place: 'the Turks and Caicos Islands', residence: 'Waterloo, Grand Turk', kinds: ['diplomat'], storms: true },
  stHelena: { crown: 'GB', title: 'Governor of St Helena, Ascension and Tristan da Cunha', place: 'St Helena', residence: 'Plantation House, St Helena', kinds: ['diplomat'], storms: false },
  canada: { crown: 'GB', title: 'Governor General of Canada', place: 'Canada', residence: 'Rideau Hall, Ottawa', kinds: ['royal'], storms: false },
  australia: { crown: 'GB', title: 'Governor-General of Australia', place: 'Australia', residence: 'Government House, Canberra (Yarralumla)', kinds: ['royal'], storms: false },
  newZealand: { crown: 'GB', title: 'Governor-General of New Zealand', place: 'New Zealand', residence: 'Government House, Wellington', kinds: ['royal'], storms: false },
  greenland: { crown: 'DK', title: 'High Commissioner of Greenland (Rigsombudsmand)', place: 'Greenland', residence: 'the High Commissioner\'s residence, Nuuk', kinds: ['diplomat', 'royal'], storms: false },
  faroes: { crown: 'DK', title: 'High Commissioner of the Faroe Islands', place: 'the Faroe Islands', residence: 'the High Commissioner\'s residence, Tórshavn', kinds: ['diplomat'], storms: false },
  aruba: { crown: 'NL', title: 'Governor of Aruba', place: 'Aruba', residence: 'the Governor\'s residence, Oranjestad', kinds: ['royal', 'diplomat'], storms: true },
  curacao: { crown: 'NL', title: 'Governor of Curaçao', place: 'Curaçao', residence: 'Fort Amsterdam, Willemstad', kinds: ['royal', 'diplomat'], storms: true },
};

const cc = (state) => state.character.countryId ?? 'US';
/** Who you are to the Crown, for these posts: 'royal' | 'military' | 'diplomat' | null, and which crown. */
export function candidacy(state) {
  const age = state.character.age;
  if (state.overseasPost || age < 35 || age > 72 || state.legal?.incarceration) return null;
  const r = state.royal;
  if (r && !r.abdicated && !r.reigning && r.line !== 1 && (r.working || (r.line ?? 99) <= 12)) return { kind: 'royal', crown: r.crownId };
  if (!state.military?.service && (state.military?.history ?? []).some((h) => h.track === 'officer' && (h.grade ?? 0) >= 7 && ['GB', 'DK', 'NL'].includes(h.nation))) {
    const h = state.military.history.find((x) => x.track === 'officer' && (x.grade ?? 0) >= 7 && ['GB', 'DK', 'NL'].includes(x.nation));
    return { kind: 'military', crown: h.nation };
  }
  const job = state.career?.job;
  if (['GB', 'DK', 'NL'].includes(cc(state)) && job && (/foreignService$/.test(job.professionId ?? '') || job.professionId === 'foreignService') && (job.grade ?? 0) >= 7) return { kind: 'diplomat', crown: cc(state) };
  return null;
}
export const postsFor = (c) => (c ? Object.entries(POSTS).filter(([, p]) => p.crown === c.crown && p.kinds.includes(c.kind)).map(([id]) => id) : []);

function take(ctx, id) {
  const { state } = ctx;
  const p = POSTS[id];
  if (state.career?.job) ctx.emit('career:resign', { reason: `Appointed ${p.title}` });
  const term = id === 'gibraltar' || /Lieutenant Governor/.test(p.title) ? 5 : 4;
  state.overseasPost = { id, title: p.title, place: p.place, residence: p.residence, since: state.character.age, until: state.character.age + term, standing: 60 };
  ctx.log(`You were sworn in as ${p.title}: ${p.residence}, a plumed hat, and the style "Excellency".`, '🏛️', 'milestone');
  ctx.stat('happiness', 8);
}

function endPost(ctx, why) {
  const { state } = ctx;
  const o = state.overseasPost;
  if (!o) return;
  (state.overseasPast ??= []).push({ id: o.id, title: o.title, from: o.since, to: state.character.age });
  state.overseasPost = null;
  ctx.log(`${why} You left ${o.place} after ${state.character.age - o.since} years.`, '🏛️', 'info');
  if (o.standing >= 55 && why.startsWith('Your term')) {
    const royal = Boolean(state.royal);
    const order = POSTS[o.id].crown === 'GB' ? (royal ? 'Knight Grand Cross of the Royal Victorian Order (GCVO)' : 'Knight Commander of the Order of St Michael and St George (KCMG)') : POSTS[o.id].crown === 'DK' ? 'Commander of the Order of the Dannebrog' : 'Commander of the Order of Orange-Nassau';
    addHonor(state, { id: `overseas.${o.id}`, source: 'civil', name: order, icon: '🎖️', precedence: royal ? 3 : 5, prestige: royal ? 20 : 25, order: true, grade: 2, citation: `For services as ${o.title}.` });
    ctx.log(`For your service in ${o.place}: ${order}.`, '🎖️', 'honor');
  }
}

export const OverseasPostsModule = {
  id: 'overseasPosts',
  order: 34.4,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.character.alive) return;
    const o = state.overseasPost;
    if (o) {
      ctx.earn(state.royal ? 0 : 140000, `${o.title} (salary)`, { wage: true });
      o.standing = Math.round(clamp(o.standing + rng.int(-4, 3), 0, 100));
      const p = POSTS[o.id];
      if (p.storms && rng.chance(0.18) && !state.prompts.some((x) => x.type === 'overseasPosts.storm')) {
        ctx.prompt({ type: 'overseasPosts.storm', icon: '🌀', title: 'A Hurricane', text: `A category 4 hurricane is bearing down on ${o.place}.`, options: [{ id: 'stay', label: '🏛️ Stay and lead the response from Government House' }, { id: 'navy', label: '⚓ Call in the Royal Navy\'s patrol ship and the aid budget' }, { id: 'leave', label: '✈️ Fly out "for consultations"' }] });
      } else if (rng.chance(0.08) && !state.prompts.some((x) => x.type === 'overseasPosts.crisis')) {
        ctx.prompt({ type: 'overseasPosts.crisis', icon: '⚖️', title: 'A Constitutional Crisis', text: `A corruption inquiry has implicated ${o.place}'s premier and half the cabinet. London asks whether you will use the reserved powers.`, options: [{ id: 'suspend', label: '📜 Suspend the government and rule directly', hint: 'Lawful, rare, explosive' }, { id: 'advise', label: '🤝 Persuade the premier to resign' }, { id: 'nothing', label: '🙈 Leave it to the courts' }] });
      }
      if (state.character.age >= o.until) {
        if (o.standing >= 70 && rng.chance(0.4)) { o.until += 2; ctx.log(`Your term as ${o.title} was extended by two years.`, '✍️', 'good'); } else endPost(ctx, 'Your term ended.');
      }
      return;
    }
    const c = candidacy(state);
    if (!c || state.prompts.some((x) => x.type === 'overseasPosts.offer') || !rng.chance(c.kind === 'royal' ? 0.07 : 0.1)) return;
    const ids = rng.shuffle(postsFor(c)).slice(0, 2);
    if (!ids.length) return;
    ctx.prompt({
      type: 'overseasPosts.offer', icon: '🏛️', title: c.kind === 'royal' ? 'The Crown Overseas' : 'A Call from the Palace',
      text: c.kind === 'royal' ? 'The government suggests a member of the royal family represent the Crown overseas for a term.' : `${c.kind === 'military' ? 'A retired senior officer' : 'A senior diplomat'} is wanted to represent the Crown overseas.`,
      options: [...ids.map((id) => ({ id, label: `🏛️ ${POSTS[id].title}`, hint: POSTS[id].residence })), { id: 'no', label: '🙅 Decline' }],
    });
  },
  actions: {
    /** Public duties: investitures, a national day, a school visit. */
    duties(ctx) {
      const { state, rng } = ctx;
      const o = state.overseasPost;
      if (!o) return ctx.toast('Only in post', 'warn');
      if (yearlyCount(state, 'overseasPosts.duties')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'overseasPosts.duties');
      o.standing = Math.min(100, o.standing + rng.int(4, 9));
      if (state.royal) state.royal.popularity = Math.min(100, (state.royal.popularity ?? 60) + 2);
      return ctx.log(rng.pick([`You held an investiture at ${o.residence} and visited every school in ${o.place}.`, `You took the salute at the national day parade in ${o.place}, in the plumed hat.`, `You opened a new hospital wing and hosted a garden party for two thousand.`]), '🎩', 'good');
    },
    resignPost(ctx) {
      if (!ctx.state.overseasPost) return ctx.toast('Not in post', 'warn');
      return endPost(ctx, 'You resigned your post early.');
    },
  },
  resolvers: {
    offer(ctx, _data, optionId) {
      if (!POSTS[optionId]) return ctx.log('You declined the appointment.', '🙅', 'info');
      take(ctx, optionId);
      return undefined;
    },
    storm(ctx, _data, optionId) {
      const o = ctx.state.overseasPost;
      if (!o) return undefined;
      if (optionId === 'leave') { o.standing = Math.max(0, o.standing - 30); return endPost(ctx, 'The islanders never forgave you for flying out before the storm. London recalled you.'); }
      o.standing = Math.min(100, o.standing + (optionId === 'stay' ? 12 : 8));
      return ctx.log(optionId === 'stay' ? `You rode out the hurricane in Government House and were on the radio every hour. ${o.place} will remember.` : `The patrol ship and the aid flights arrived within a day. The rebuilding began.`, '🌀', 'good');
    },
    crisis(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const o = state.overseasPost;
      if (!o) return undefined;
      if (optionId === 'suspend') {
        if (rng.chance(0.6)) { o.standing = Math.min(100, o.standing + 10); return ctx.log(`You suspended the government of ${o.place} and ruled directly for two years. The inquiry's recommendations were carried out; elections followed.`, '📜', 'milestone'); }
        o.standing = Math.max(0, o.standing - 25);
        return ctx.log(`Your suspension of the government caused uproar: protests outside Government House and angry questions at the UN.`, '📜', 'bad');
      }
      if (optionId === 'advise') { o.standing = Math.min(100, o.standing + 5); return ctx.log('A quiet word at Government House: the premier resigned "for family reasons".', '🤝', 'good'); }
      o.standing = Math.max(0, o.standing - 5);
      return ctx.log('You left it to the courts. The case dragged on for years.', '⚖️', 'info');
    },
  },
};
