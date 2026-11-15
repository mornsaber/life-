/**
 * Marrying into the royal family: meeting a prince or princess, a courtship in the papers, the
 * palace's vetting, and — if it lasts — a royal wedding and a life as a royal consort.
 *
 *   Meeting     where there's a crown (Crown.js): at the events of the Season (HighSociety.js),
 *               through friends, or by sheer chance; likelier the higher your standing. Before
 *               1920 royals married royals and the titled; until 1960 a commoner needed real
 *               standing. Ordinary people from the 1960s on (and more so later).
 *   Courtship   the papers find out; photographers at the door; the palace asks questions — a
 *               criminal record or a scandal can end it. The family's approval matters.
 *   Marriage    the people.propose / people.wed flow as for anyone; on the day, a royal wedding,
 *               and you become a working royal consort: a title, an allowance, engagements,
 *               patronages — everything Crown.js gives a royal life, outside the line of
 *               succession. A divorce ends it.
 *
 * partner.royal = { crownId, rank: 'child'|'grandchild', title }   state.royal.level = 'consort'
 */
import { Random, clamp } from '../../core/Random.js';
import { randomName, hasFelony } from '../../core/State.js';
import { CROWNS, crownOf, ensureCrown, ROYAL_LEVELS } from './Crown.js';
import { partnerOf, byId, clampRel } from '../people/People.js';
import { yearNow } from './Eras.js';
import { addBuzz } from '../life/Fame.js';

// A royal consort: a working royal by marriage, outside the line of succession.
ROYAL_LEVELS.consort ??= { name: 'Royal consort', line: [0, 0], allowance: 600000, desc: 'Married into the royal family: a title, engagements and the papers, but no place in the line.' };

const side = (state, salt) => new Random(((state.world?.seed ?? 8) * 11939 + state.character.age * 389 + salt) >>> 0);
const titled = (state) => Boolean(state.character.peerage || state.noble);
/** Whether the palace would consider you, by the standards of the day. */
export function eligibleCommoner(state) {
  const y = yearNow(state);
  const standing = state.society?.standing ?? 0;
  if (y < 1920) return titled(state);
  if (y < 1960) return titled(state) || standing >= 80;
  return true;
}

function meetingYear(ctx) {
  const { state } = ctx;
  if (state.royal || state.character.age < 20 || state.character.age > 40 || partnerOf(state)) return;
  const crownId = crownOf(state);
  if (!crownId || !CROWNS[crownId] || !eligibleCommoner(state)) return;
  if (state.prompts.some((p) => p.type?.startsWith('royalMarriage.'))) return;
  const rng = side(state, 0xa11);
  const went = (state.society?.attended?.[yearNow(state)] ?? []).length;
  const odds = 0.004 + (state.society?.standing ?? 0) / 2500 + (went ? 0.03 : 0) + (titled(state) ? 0.02 : 0);
  if (!rng.chance(odds)) return;
  const def = CROWNS[crownId];
  // Someone of the gender you're interested in.
  const pref = state.people?.orientation ?? (state.character.gender === 'male' ? 'women' : 'men');
  const gender = pref === 'women' ? 'female' : pref === 'men' ? 'male' : rng.pick(['male', 'female']);
  const name = rng.pick(def.names[gender]);
  const rank = rng.chance(0.4) ? 'child' : 'grandchild';
  const title = def.titles.royal[gender === 'female' ? 1 : 0];
  state.people.royalMeeting = { crownId, gender, name, rank, title, age: clamp(state.character.age + rng.int(-4, 4), 20, 45) };
  ctx.prompt({ type: 'royalMarriage.meet', icon: '👑', title: 'An Introduction', text: `${went ? 'At one of the Season\'s parties' : 'At a friend\'s wedding'}, you were seated next to ${title} ${name}, ${rank === 'child' ? 'the monarch\'s own child' : 'a grandchild of the monarch'}. The conversation went on long after the speeches.`,
    options: [{ id: 'flirt', label: '😊 Ask to see them again' }, { id: 'distance', label: '🙂 Keep it polite', hint: 'Royal life is not for everyone' }] });
}

/** A royal courtship's years: the papers, the palace, the family. */
function courtshipYear(ctx) {
  const { state } = ctx;
  const p = partnerOf(state);
  if (!p?.royal || p.relation === 'spouse' || state.royal) return;
  if (state.prompts.some((x) => x.type?.startsWith('royalMarriage.'))) return;
  const rng = side(state, 0xc0e);
  if (hasFelony(state) || (state.fame?.scandals?.length ?? 0) > 2) {
    p.relationship = clampRel(p.relationship - 40);
    p.relation = 'friend';
    p.formerPartner = true;
    ctx.log(`The palace made its enquiries. ${p.royal.title} ${p.firstName} ended it, by letter.`, '✉️', 'bad');
    return;
  }
  if (!p.royal.pressFound && rng.chance(0.5)) {
    p.royal.pressFound = true;
    addBuzz(state, 15);
    ctx.prompt({ type: 'royalMarriage.press', icon: '📸', title: 'The Papers Have Found Out', text: `"${p.royal.title.toUpperCase()} ${p.firstName.toUpperCase()}'S MYSTERY LOVE": your photograph is on every front page, and there are photographers outside your door.`, data: { personId: p.id },
      options: [{ id: 'dignity', label: '🤐 Say nothing, with dignity' }, { id: 'interview', label: '🎤 Give an interview', hint: 'The palace will not like it' }, { id: 'hide', label: '🏃 Go into hiding for a while' }] });
    return;
  }
  if (!p.royal.familyMet && rng.chance(0.4)) {
    p.royal.familyMet = true;
    ctx.prompt({ type: 'royalMarriage.family', icon: '🏰', title: 'A Weekend at the Castle', text: `You're invited to spend a weekend with ${p.firstName}'s family. Shooting, charades, and the monarch at the head of the table.`, data: { personId: p.id },
      options: [{ id: 'charm', label: '🎩 Mind your manners and charm them' }, { id: 'yourself', label: '😄 Be yourself' }] });
  }
}

export const RoyalMarriageResolvers = {
  meet(ctx, _d, optionId) {
    const { state, rng } = ctx;
    const m = state.people.royalMeeting;
    delete state.people.royalMeeting;
    if (!m || optionId !== 'flirt') return ctx.log('A pleasant dinner, and nothing more. Probably for the best.', '🙂');
    if (!rng.chance(0.5)) return ctx.log(`${m.title} ${m.name}'s private secretary returned your letter with a polite note.`, '✉️', 'warn');
    const n = randomName(rng, m.gender);
    const person = { id: rng.id('per_'), firstName: m.name, lastName: n.lastName, gender: m.gender, relation: 'partner', ageOffset: m.age - state.character.age, relationship: 60, spark: 75, alive: true, income: 0, careerIncome: 0, since: state.character.age, royal: { crownId: m.crownId, rank: m.rank, title: m.title } };
    state.people.list.push(person);
    ctx.stat('happiness', 10);
    return ctx.log(`You're seeing ${m.title} ${m.name}. Quietly, for now.`, '👑', 'milestone');
  },
  press(ctx, data, optionId) {
    const { state } = ctx;
    const p = byId(state, data.personId);
    if (!p) return;
    if (optionId === 'interview') { p.relationship = clampRel(p.relationship - 15); addBuzz(state, 10); return ctx.log('The interview ran over four pages. The palace was furious; so was your royal.', '🎤', 'bad'); }
    if (optionId === 'hide') { ctx.stat('stress', 6); p.relationship = clampRel(p.relationship + 3); return ctx.log('You disappeared to the country for a month. The story moved on.', '🏃', 'info'); }
    p.relationship = clampRel(p.relationship + 6);
    return ctx.log('You said nothing at all. The palace noticed, approvingly.', '🤐', 'good');
  },
  family(ctx, data, optionId) {
    const { state, rng } = ctx;
    const p = byId(state, data.personId);
    if (!p) return;
    const ok = rng.chance(optionId === 'charm' ? 0.7 : 0.5);
    p.royal.approved = ok;
    p.relationship = clampRel(p.relationship + (ok ? 8 : -6));
    return ctx.log(ok ? 'The monarch laughed at your joke at dinner. You\'ll be asked back.' : 'You used the wrong fork, the wrong title and the wrong word about hunting. Frosty.', '🏰', ok ? 'good' : 'warn');
  },
};

export const RoyalMarriageModule = {
  id: 'royalMarriage',
  order: 33.6,
  setup(engine) {
    // The wedding: you become a royal consort.
    engine.bus.on('people:married', ({ ctx, personId }) => {
      const { state, rng } = ctx;
      const p = byId(state, personId);
      if (!p?.royal || state.royal) return;
      ensureCrown(state, p.royal.crownId);
      const def = CROWNS[p.royal.crownId];
      state.royal = { crownId: p.royal.crownId, level: 'consort', line: null, working: true, popularity: p.royal.approved ? 65 : 50, reigning: false, patronages: [], since: state.character.age, consort: p.id };
      if (def.dukedoms?.length && !state.character.style?.peerage) state.character.style = { ...(state.character.style ?? {}), peerage: `${state.character.gender === 'female' ? 'Duchess' : 'Duke'} of ${rng.pick(def.dukedoms)}` };
      addBuzz(state, 25);
      ctx.log(`A royal wedding: ${rng.pick(['the abbey', 'the cathedral', 'the palace chapel'])}, a carriage, a balcony and a public holiday. You married ${p.royal.title} ${p.firstName} and became a member of the royal family.`, '💒', 'milestone');
    });
  },
  onAgeUp(ctx) {
    if (!ctx.state.character.alive || !ctx.state.people) return;
    meetingYear(ctx);
    courtshipYear(ctx);
    // A divorce ends royal life by marriage.
    const r = ctx.state.royal;
    if (r?.level === 'consort') {
      const spouse = byId(ctx.state, r.consort);
      if (!spouse || spouse.relation !== 'spouse') {
        ctx.state.royal = null;
        if (ctx.state.character.style) ctx.state.character.style = { ...ctx.state.character.style, peerage: null, prefix: null };
        ctx.log(spouse?.alive === false ? 'Widowed, you stepped back from royal life.' : 'After the divorce you are no longer a member of the royal family.', '🚪', 'info');
      }
    }
  },
  resolvers: RoyalMarriageResolvers,
};
