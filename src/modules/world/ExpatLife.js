/**
 * Living abroad as a life, not a visa: the years after you land somewhere new.
 *
 *  - Belonging: culture shock in the first year, then a slow climb. Speaking the
 *    language and making local friends speeds it; an expat bubble is easier but
 *    keeps you a visitor.
 *  - Homesickness: early on, the pull of home — fly back, call, or tough it out.
 *  - A local partner: someone from here, whose life is rooted here.
 *  - Where to settle: after a few years, the question — stay for good, go home
 *    (with or without them), or keep your options open. Coming home after a long
 *    time away has its own reverse culture shock.
 *
 * state.migration.expat = { cc, since, belonging, circle, settled, askedAt, returnedAt, yearsAway }
 */
import { COUNTRIES, isCitizen } from './Countries.js';
import { birthCountryOf, speaksLocal, localLanguage, LANGUAGE_FLUENT } from './Immigration.js';
import { arrive, departureBlock, ensureMigration } from './Migration.js';
import { countryIdOf } from '../life/Regions.js';
import { partnerOf } from '../people/People.js';
import { makePerson, divorce } from '../people/PeopleEngine.js';

const CIRCLES = {
  expat: { label: '🍻 The expat crowd', hint: 'Easy friends, English everywhere, a bubble', belonging: 2, happy: 3 },
  local: { label: '🏘️ Go local', hint: 'Harder at first; belonging comes faster', belonging: 8, happy: 0 },
  exchange: { label: '🗣️ Language exchange', hint: 'Swap lessons with locals; learn faster', belonging: 5, happy: 1, lang: 12 },
};
export const SETTLE_AFTER = 3;
const FLIGHT_HOME = 1400;

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const pending = (state, type) => state.prompts.some((p) => p.type === type);
/** Living outside your birth country as an adult. */
export const livingAbroad = (state) => state.character.age >= 18 && countryIdOf(state) !== birthCountryOf(state);
export const expatOf = (state) => state.migration?.expat ?? null;
const yearsHere = (state, e) => state.character.age - e.since;

function arrived(ctx, cc) {
  const { state } = ctx;
  const m = ensureMigration(state);
  const prev = m.expat;
  m.expat = { cc, since: state.character.age, belonging: speaksLocal(state, cc) ? 40 : 15, circle: null, settled: false, askedAt: null, returnedAt: null, yearsAway: (prev?.yearsAway ?? 0) };
}

function circlePrompt(ctx, e) {
  const name = COUNTRIES[e.cc].name;
  ctx.prompt({
    type: 'expatLife.circle', icon: '🧳', title: `New in ${name}`,
    text: `The first months in ${name} are a blur of paperwork and supermarket labels you can't read. Who do you spend your evenings with?`,
    options: Object.entries(CIRCLES).map(([id, c]) => ({ id, label: c.label, hint: c.hint })),
    data: { cc: e.cc },
  });
}

function homesick(ctx, e) {
  const home = COUNTRIES[birthCountryOf(ctx.state)];
  ctx.prompt({
    type: 'expatLife.homesick', icon: '🏠', title: 'Homesick',
    text: `A song, a smell, a photo from ${home.name} — and suddenly you miss home badly.`,
    options: [
      { id: 'visit', label: `✈️ Fly home for a visit`, hint: `≈$${FLIGHT_HOME.toLocaleString()}` },
      { id: 'call', label: '📱 Long calls with family' },
      { id: 'tough', label: '💪 Tough it out', hint: 'It passes — or it doesn\'t' },
    ],
    data: {},
  });
}

function meetLocal(ctx, e) {
  const { state, rng } = ctx;
  const pool = COUNTRIES[e.cc].names;
  const o = state.people.orientation;
  const gender = o === 'men' ? 'male' : o === 'women' ? 'female' : o === 'everyone' ? rng.pick(['male', 'female']) : state.character.gender === 'male' ? 'female' : 'male';
  const named = pool ? { firstName: rng.pick(pool[gender] ?? pool.male), lastName: rng.pick(pool.last) } : {};
  const person = makePerson(ctx, { relation: 'candidate', gender, age: Math.max(18, state.character.age + rng.int(-5, 5)), relationship: rng.int(40, 65), nationality: e.cc, ...named });
  ctx.prompt({
    type: 'expatLife.meet', icon: '💘', title: 'Someone From Here',
    text: `${person.firstName}, ${state.character.age + person.ageOffset}, grew up in ${COUNTRIES[e.cc].name} and offers to show you the places tourists never find.${speaksLocal(state, e.cc) ? '' : ` Their English is better than your ${localLanguage(e.cc)}.`}`,
    options: [
      { id: 'date', label: '💬 Say yes' },
      { id: 'pass', label: '🙂 Not now' },
    ],
    data: { person },
  });
}

function settlePrompt(ctx, e) {
  const { state } = ctx;
  const home = birthCountryOf(state);
  const partner = partnerOf(state);
  const local = partner && partner.nationality === e.cc;
  const canGoHome = isCitizen(state, home) && !departureBlock(state);
  e.askedAt = state.character.age;
  ctx.prompt({
    type: 'expatLife.settle', icon: '🧭', title: 'Where Is Home Now?',
    text: `You've lived in ${COUNTRIES[e.cc].name} for ${yearsHere(state, e)} years. ${e.belonging >= 60 ? 'It feels like yours now.' : 'Some days it still feels borrowed.'}${local ? ` ${partner.firstName}'s whole life is here.` : ''}`,
    options: [
      { id: 'stay', label: `${COUNTRIES[e.cc].flag} Stay for good`, hint: 'Put down roots' },
      ...(canGoHome ? [{ id: 'home', label: `${COUNTRIES[home].flag} Go home`, hint: local ? `Ask ${partner.firstName} to come with you` : 'Back to where you started' }] : []),
      { id: 'open', label: '🤷 Keep your options open' },
    ],
    data: { cc: e.cc },
  });
}

export const ExpatLifeModule = {
  id: 'expatLife',
  order: 43.2,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (state.character.age < 18 || state.legal?.incarceration) return;
    const m = state.migration;
    const cc = countryIdOf(state);
    // Home again after years away: everything changed, and so did you.
    if (!livingAbroad(state)) {
      const e = m?.expat;
      if (e && e.returnedAt == null && e.cc !== cc) {
        e.returnedAt = state.character.age;
        const away = yearsHere(state, e);
        e.yearsAway += away;
        if (away >= 5) {
          ctx.stat('happiness', -4);
          ctx.log(`Coming home after ${away} years abroad was stranger than leaving: prices, slang and friends had all moved on without you.`, '🔁', 'info');
        }
      }
      return;
    }
    const e = m?.expat;
    if (!e || e.cc !== cc || e.returnedAt != null) {
      arrived(ctx, cc);
      ctx.stat('stress', 4);
      ctx.log(`Culture shock in ${COUNTRIES[cc].name}: ${speaksLocal(state, cc) ? 'you speak the language, but not the unwritten rules' : 'menus, forms and jokes all go over your head'}.`, '🧳', 'info');
      return circlePrompt(ctx, m.expat);
    }
    // A year further in.
    const c = CIRCLES[e.circle] ?? CIRCLES.expat;
    const speaks = speaksLocal(state, cc);
    if (e.circle === 'local' && !speaks) ctx.stat('stress', 2);
    if (c.lang && !speaks) {
      const lang = localLanguage(cc);
      m.languages[lang] = Math.min(LANGUAGE_FLUENT, (m.languages[lang] ?? 0) + c.lang);
    }
    const cap = e.circle === 'expat' && !speaks ? 55 : 100;
    e.belonging = Math.min(cap, clamp(e.belonging + c.belonging + (speaks ? 6 : 0) + (partnerOf(state)?.nationality === cc ? 4 : 0)));
    if (c.happy) ctx.stat('happiness', c.happy);
    if (e.belonging >= 70 && !e.felt) {
      e.felt = true;
      ctx.log(`Somewhere along the way ${COUNTRIES[cc].name} stopped feeling foreign. You give directions now instead of asking for them.`, '🏡', 'good');
    }

    if (e.belonging < 40 && yearsHere(state, e) <= 4 && rng.chance(0.3) && !pending(state, 'expatLife.homesick')) homesick(ctx, e);
    if (!partnerOf(state) && state.character.age <= 55 && state.people && rng.chance(0.06 + e.belonging / 800) && !pending(state, 'expatLife.meet')) meetLocal(ctx, e);
    if (!e.settled && yearsHere(state, e) >= SETTLE_AFTER && (e.askedAt == null || state.character.age - e.askedAt >= 5) && !pending(state, 'expatLife.settle')) settlePrompt(ctx, e);
  },

  actions: {
    /** Change the people you spend time with abroad. */
    circle(ctx, id) {
      const e = expatOf(ctx.state);
      if (!e || !CIRCLES[id] || !livingAbroad(ctx.state)) return;
      e.circle = id;
      ctx.toast(`You'll spend more time with ${id === 'expat' ? 'other expats' : id === 'local' ? 'locals' : 'your language partners'}.`);
    },
  },

  resolvers: {
    circle(ctx, data, optionId) {
      const e = expatOf(ctx.state);
      if (!e || !CIRCLES[optionId]) return;
      e.circle = optionId;
      ctx.log(optionId === 'expat' ? 'You found the expat bars and the people who missed home as much as you.'
        : optionId === 'local' ? 'You signed up for a local sports club and said yes to every invitation.'
          : 'You started a weekly language exchange: their English for your mistakes.', CIRCLES[optionId].label.split(' ')[0]);
    },
    homesick(ctx, _data, optionId) {
      const e = expatOf(ctx.state);
      if (!e) return;
      if (optionId === 'visit') {
        if (!ctx.spend(FLIGHT_HOME, 'Flight home', { credit: true })) return ctx.toast('You couldn\'t afford the flight.', 'warn');
        ctx.stat('happiness', 8);
        e.belonging = clamp(e.belonging - 2);
        return ctx.log('Two weeks at home: your old room, your mother\'s cooking, and a strange relief at flying back.', '✈️', 'good');
      }
      if (optionId === 'call') {
        ctx.stat('happiness', 3);
        return ctx.log('You called home every Sunday. It helped, mostly.', '📱');
      }
      if (ctx.rng.chance(0.5)) {
        e.belonging = clamp(e.belonging + 6);
        ctx.log('You pushed through the homesickness, and came out the other side more at home here.', '💪', 'good');
      } else {
        ctx.stat('happiness', -6);
        ctx.stat('stress', 4);
        ctx.log('The homesickness didn\'t pass. A grey season.', '🌧️', 'warn');
      }
    },
    meet(ctx, data, optionId) {
      const { state } = ctx;
      const person = data.person ? { ...data.person } : null;
      if (optionId !== 'date' || !person || partnerOf(state)) return;
      person.relation = 'partner';
      person.since = state.character.age;
      delete person.compatibility;
      state.people.list.push(person);
      const e = expatOf(state);
      if (e) e.belonging = clamp(e.belonging + 8);
      ctx.stat('happiness', 8);
      ctx.log(`You started dating ${person.firstName}, who is showing you a ${COUNTRIES[person.nationality]?.name ?? 'country'} the guidebooks miss.`, '💘', 'good');
    },
    settle(ctx, data, optionId) {
      const { state, rng } = ctx;
      const e = expatOf(state);
      if (!e || e.cc !== countryIdOf(state)) return;
      if (optionId === 'stay') {
        e.settled = true;
        e.belonging = clamp(e.belonging + 15);
        ctx.stat('happiness', 4);
        return ctx.log(`You decided ${COUNTRIES[e.cc].name} is home now. ${speaksLocal(state, e.cc) ? '' : `Time to get serious about ${localLanguage(e.cc)}.`}`.trim(), '🏡', 'milestone');
      }
      if (optionId === 'open') return ctx.log('You decided not to decide. Another year, then.', '🤷');
      const home = birthCountryOf(state);
      if (!isCitizen(state, home) || departureBlock(state)) return ctx.toast('You can\'t leave right now.', 'warn');
      const partner = partnerOf(state);
      if (partner && partner.nationality === e.cc) {
        if (rng.chance(Math.min(0.9, partner.relationship / 110))) {
          ctx.log(`${partner.firstName} agreed to leave ${COUNTRIES[e.cc].name} for you — a huge thing to give up.`, '💞', 'good');
          partner.relationship = Math.max(0, partner.relationship - 5);
        } else {
          if (partner.relation === 'spouse') divorce(ctx, partner);
          else partner.relation = 'ex';
          ctx.stat('happiness', -12);
          ctx.log(`${partner.firstName} wouldn't leave ${COUNTRIES[e.cc].name}. You went home alone.`, '💔', 'bad');
        }
      }
      arrive(ctx, home, { reason: `After ${yearsHere(state, e)} years in ${COUNTRIES[e.cc].name}, you moved home.` });
    },
  },
};
