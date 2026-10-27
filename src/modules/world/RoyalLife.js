/**
 * Royal life with choices in it, for a reigning family and a former ruling house alike.
 *
 *   The diary    Once a year, the engagement that defines your year: a state banquet, a
 *                disaster visit, a Commonwealth tour, a charity gala — each with its own
 *                risks (a gaffe, a protest, a triumph).
 *   The family   Relatives near the throne (or the claim) need the head of the house's
 *                consent to marry: give it, refuse it (and lose them), or give it on terms.
 *   The press    A tabloid story about you or the family: ignore it, sue, give an interview,
 *                or leak a better story about someone else.
 *   The estates  The heir's and the monarch's duchies (or a former house's foundation): an
 *                income, and choices about how to run the land.
 *   The heir     A monarch prepares the heir; a well-prepared heir keeps the country's faith
 *                in the monarchy when the time comes.
 *   Gatherings   A former house gathers at its old seat: the family closes ranks, and
 *                monarchists take heart.
 *
 * state.royal.estate = { name, value, mode }; state.royal.heirReady; state.house.gatherings
 */
import { yearlyCount, bumpYearly, currentYear, randomName } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { houseOf, monarchistSupport } from './Houses.js';
import { living, ageOf } from '../people/People.js';

const DUCHIES = { GB: ['the Duchy of Cambria', 'the Duchy of Lancaster'], SE: ['the royal estates of Solliden', 'the Royal Djurgården'], NL: ['the Het Loo estate', 'the Crown estates'], ES: ['the Patrimonio Nacional apartments', 'the Patrimonio Nacional'], JP: ['the Imperial estates', 'the Imperial estates'] };
const DIARY = [
  { id: 'banquet', label: '🍽️ Host a state banquet', pop: [2, 5], stress: 4, risk: 0.15, gaffe: 'Your toast mentioned a war the guests would rather forget.' },
  { id: 'disaster', label: '🌊 Visit a flood-hit town', pop: [4, 8], stress: 8, risk: 0.1, gaffe: 'The photographs made it look like a photo opportunity.' },
  { id: 'tour', label: '✈️ A tour of the realms and allies', pop: [3, 7], stress: 10, risk: 0.2, gaffe: 'Protesters met you at every stop, demanding an apology for the past.' },
  { id: 'gala', label: '🎭 A charity gala for your patronages', pop: [1, 4], stress: 3, risk: 0.08, gaffe: 'A donor at your table turned out to be under investigation.' },
  { id: 'armed', label: '🎖️ Review the armed forces', pop: [2, 4], stress: 3, risk: 0.05, gaffe: 'You mixed up the regiments in the speech.' },
  { id: 'youth', label: '🧑‍🎓 Launch a youth programme in your name', pop: [3, 6], stress: 6, risk: 0.1, gaffe: 'The programme\'s first year was a mess, and the papers noticed.' },
];
const STORIES = ['a lavish holiday on a billionaire\'s yacht', 'a relative\'s business dealings in the Gulf', 'leaked letters to ministers', 'a staff bullying complaint', 'a feud between siblings', 'the cost of a palace renovation'];

const pop = (r, d) => { r.popularity = Math.round(clamp((r.popularity ?? 60) + d, 0, 100)); };
const royalHere = (state) => Boolean(state.royal && (state.royal.working || state.royal.reigning));
/** The family whose marriages the head of the house must approve. */
const nearKin = (state) => living(state).filter((p) => ['sibling', 'child', 'niece', 'nephew', 'grandchild'].includes(p.relation) && ageOf(state, p) >= 20 && ageOf(state, p) <= 45 && !p.consented && !living(state).some((q) => q.spouseOf === p.id));
const headOfHouse = (state) => Boolean(state.royal?.reigning || houseOf(state)?.rank === 'head');

function estateOf(state) {
  const r = state.royal;
  if (!r || !(r.reigning || r.line === 1)) return null;
  const names = DUCHIES[r.crownId] ?? ['the crown estates', 'the crown estates'];
  r.estate ??= { name: r.reigning ? names[1] : names[0], value: r.reigning ? 650e6 : 1000e6, mode: 'steady' };
  return r.estate;
}

function yearOf(ctx) {
  const { state, rng } = ctx;
  const r = state.royal;
  const age = state.character.age;
  // The estates: the heir's and the monarch's private income.
  const est = estateOf(state);
  if (est && age >= 18) {
    const yieldRate = { steady: 0.035, green: 0.025, develop: 0.05 }[est.mode];
    est.value = Math.round(est.value * (1 + rng.float(-0.02, 0.05)));
    ctx.earn(Math.round(est.value * yieldRate * 0.3), `${est.name[0].toUpperCase()}${est.name.slice(1)} (net income)`);
    if (est.mode === 'develop' && rng.chance(0.15)) { pop(r, -3); ctx.log(`Villagers protested a housing development on ${est.name}'s land.`, '🏗️', 'warn'); }
    if (est.mode === 'green' && rng.chance(0.2)) { pop(r, 2); ctx.log(`Rewilding on ${est.name} brought back beavers and good headlines.`, '🌳', 'good'); }
  }
  if (state.prompts.some((p) => p.type?.startsWith('royalLife.'))) return;
  // One defining engagement a year.
  if (royalHere(state) && age >= 18 && !yearlyCount(state, 'royalLife.diary')) {
    const picks = rng.shuffle([...DIARY]).slice(0, 3);
    ctx.prompt({ type: 'royalLife.diary', icon: '📅', title: 'The Year\'s Diary', text: 'The private secretary lays out the year. One engagement will define it: which?', options: picks.map((d) => ({ id: d.id, label: d.label })) });
    return;
  }
  // A relative asks consent to marry.
  if (headOfHouse(state) && rng.chance(0.12)) {
    const kin = rng.pick(nearKin(state));
    if (kin) {
      const partner = randomName(rng, kin.gender === 'female' ? 'male' : 'female');
      const unsuitable = rng.chance(0.35);
      ctx.prompt({ type: 'royalLife.consent', icon: '💍', title: 'A Request for Consent', text: `${kin.firstName} wants to marry ${partner.firstName} ${partner.lastName}, ${unsuitable ? rng.pick(['a divorcee with a colourful past', 'a reality-television star', 'the child of a sanctioned oligarch', 'a Catholic (the old law still frowns)']) : rng.pick(['a doctor they met at university', 'a minor aristocrat', 'a charity director', 'an army officer'])}. As head of the house, your consent keeps them in the line.`, options: [
        { id: 'yes', label: '💍 Give your consent gladly' },
        { id: 'terms', label: '📜 Consent, on terms (a quiet wedding, no titles for the spouse)' },
        { id: 'no', label: '🚫 Refuse', tone: 'danger', hint: 'They may marry anyway, and leave the line' },
      ], data: { kin: kin.id, partner: `${partner.firstName} ${partner.lastName}`, unsuitable } });
      return;
    }
  }
  // The papers.
  if ((royalHere(state) || houseOf(state)) && rng.chance(0.15)) {
    ctx.prompt({ type: 'royalLife.press', icon: '📰', title: 'The Front Pages', text: `A tabloid splashes a story about ${rng.pick(STORIES)}. The palace press office wants a decision.`, options: [
      { id: 'ignore', label: '🤐 Never complain, never explain' },
      { id: 'sue', label: '⚖️ Sue for invasion of privacy', hint: 'Costly; could win big' },
      { id: 'interview', label: '🎙️ Give a television interview', hint: 'High risk, high reward', tone: 'danger' },
      { id: 'leak', label: '🗞️ Leak a better story about a relative', hint: 'The family won\'t forgive it' },
    ] });
  }
}

export const RoyalLifeModule = {
  id: 'royalLife',
  order: 33.8,
  onAgeUp(engineCtx) {
    const { state } = engineCtx;
    if (!state.character.alive || !(state.royal || houseOf(state))) return;
    // A side stream: royal life doesn't reshuffle the rest of the life.
    const rng = new Random(((state.world?.seed ?? 1) * 1597334677 + currentYear(state) * 211 + 0x7a1) >>> 0);
    yearOf({ ...engineCtx, rng });
  },
  actions: {
    /** Run the estate (arg: steady | green | develop). */
    estate(ctx, mode) {
      const est = estateOf(ctx.state);
      if (!est) return ctx.toast('The estates belong to the monarch and the heir.', 'warn');
      if (!['steady', 'green', 'develop'].includes(mode)) return undefined;
      est.mode = mode;
      return ctx.log({ steady: `${est.name} carries on as it always has: farms, forests, rents.`, green: `You set ${est.name} on a greener course: rewilding, solar, lower rents for tenant farmers. Less income, more goodwill.`, develop: `You approved development on ${est.name}: new towns and offices. More income — and objections.` }[mode], '🏰', 'info');
    },
    /** A monarch prepares the heir: briefings, shared engagements, the red boxes. */
    mentorHeir(ctx) {
      const { state } = ctx;
      const r = state.royal;
      if (!r?.reigning) return ctx.toast('Only the monarch prepares the heir.', 'warn');
      if (yearlyCount(state, 'royalLife.mentor')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'royalLife.mentor');
      r.heirReady = Math.min(100, (r.heirReady ?? 30) + 15);
      return ctx.log(`You took the heir through the red boxes, the weekly audience and a state visit. Readiness ${r.heirReady}/100.`, '🎓', 'good');
    },
    /** Gather the house at its old seat (a former house) or at the summer palace (a reigning one). */
    gathering(ctx) {
      const { state } = ctx;
      const h = houseOf(state);
      if (!headOfHouse(state) && !h) return ctx.toast('The head of the house calls the family together.', 'warn');
      if (yearlyCount(state, 'royalLife.gathering')) return ctx.toast('Once a year', 'warn');
      if (!ctx.spend(state.royal ? 0 : 40000, 'Family gathering at the old seat', { credit: true })) return ctx.toast('You can\'t afford it this year.', 'warn');
      bumpYearly(state, 'royalLife.gathering');
      for (const p of living(state).filter((x) => ['sibling', 'child', 'grandchild', 'niece', 'nephew', 'mother', 'father'].includes(x.relation))) p.relationship = clamp((p.relationship ?? 60) + 6, 0, 100);
      if (h && !state.royal) (state.world.monarchists ??= {})[h.cc] = Math.min(80, monarchistSupport(state, h.cc) + 0.5);
      return ctx.log(state.royal ? 'The whole family gathered at the summer palace: picnics, a church service, a photograph for the papers.' : `The House gathered at the old seat for the anniversary: cousins from five countries, a Mass, and a dinner where the old titles were used.`, '🏰', 'good');
    },
  },
  resolvers: {
    diary(ctx, data, optionId) {
      const { state, rng } = ctx;
      bumpYearly(state, 'royalLife.diary');
      const r = state.royal;
      const d = DIARY.find((x) => x.id === optionId);
      if (!r || !d) return undefined;
      ctx.stat('stress', d.stress);
      if (rng.chance(d.risk)) { pop(r, -rng.int(2, 6)); return ctx.log(`${d.label.slice(3)}: ${d.gaffe}`, '📰', 'warn'); }
      pop(r, rng.int(d.pop[0], d.pop[1]));
      return ctx.log(`${d.label.slice(3)}: it went well, and the country noticed. Popularity ${r.popularity}%.`, '👑', 'good');
    },
    consent(ctx, data, optionId) {
      const { state, rng } = ctx;
      const kin = state.people.list.find((p) => p.id === data.kin);
      if (!kin) return undefined;
      kin.consented = true;
      if (optionId === 'no') {
        kin.relationship = clamp((kin.relationship ?? 60) - 25, 0, 100);
        if (rng.chance(0.5)) {
          kin.excluded = true;
          if (state.royal) pop(state.royal, data.unsuitable ? 2 : -4);
          return ctx.log(`${kin.firstName} married ${data.partner} anyway, gave up their place in the succession, and moved abroad. The family is split.`, '💔', 'bad');
        }
        return ctx.log(`${kin.firstName} broke it off. They have barely spoken to you since.`, '💔', 'warn');
      }
      if (state.royal) pop(state.royal, data.unsuitable ? (optionId === 'terms' ? 0 : -3) : 2);
      kin.relationship = clamp((kin.relationship ?? 60) + (optionId === 'yes' ? 10 : 2), 0, 100);
      return ctx.log(optionId === 'yes' ? `You gave ${kin.firstName} your blessing. The wedding filled the cathedral.` : `You consented — a quiet wedding, and no title for ${data.partner}. ${kin.firstName} accepted, through gritted teeth.`, '💍', 'good');
    },
    press(ctx, data, optionId) {
      const { state, rng } = ctx;
      const r = state.royal;
      const p = (d) => { if (r) pop(r, d); else { const h = houseOf(state); if (h) (state.world.monarchists ??= {})[h.cc] = clamp(monarchistSupport(state, h.cc) + d / 4, 0, 80); } };
      if (optionId === 'ignore') { p(-1); return ctx.log('You said nothing. The story ran for three days, then died.', '🤐', 'info'); }
      if (optionId === 'sue') {
        if (!ctx.spend(400000, 'Legal fees (privacy claim)', { allowDebt: true })) return undefined;
        if (rng.chance(0.55)) { p(3); ctx.earn(250000, 'Privacy damages'); return ctx.log('You won: damages, an apology on page two, and a warning to the rest of Fleet Street.', '⚖️', 'good'); }
        p(-4);
        return ctx.log('You lost, and the trial put every detail of the story on the record.', '⚖️', 'bad');
      }
      if (optionId === 'interview') {
        const good = rng.chance(0.45 + (state.stats.looks - 50) / 300);
        p(good ? rng.int(6, 12) : -rng.int(8, 15));
        return ctx.log(good ? 'Ninety minutes of candour: the country saw a human being. Your numbers soared.' : 'The interview was a disaster: evasive, defensive, and quoted for decades.', '🎙️', good ? 'good' : 'bad');
      }
      for (const x of living(state).filter((y) => ['sibling', 'child', 'mother', 'father'].includes(y.relation))) x.relationship = clamp((x.relationship ?? 60) - 10, 0, 100);
      p(2);
      return ctx.log('A story about a cousin\'s finances knocked yours off the front page. The family knows who leaked it.', '🗞️', 'warn');
    },
  },
};

/** For the house card: the estate and the heir. */
export const royalEstate = estateOf;
export const DUCHY_MODES = { steady: 'Run as it is', green: 'Greener (less income, more goodwill)', develop: 'Develop the land (more income, objections)' };
