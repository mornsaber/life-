/**
 * Letters from home (and from family who went abroad). Writing is in TravelOfTheDay.js; this is
 * what comes back.
 *
 *   Replies      family you keep up with write back: the news from their side of the water,
 *                in the words of their day (and later, by phone, email, a video call).
 *   Late news    a death abroad reaches you as it would have: a black-edged letter weeks after
 *                the funeral, a telegram, a phone call in the night.
 *   Passage      a brother or sister asks for the fare to come and join you (chain migration):
 *                send it and they come; refuse and they may never forgive you.
 *
 * state.letters = { box: [{ year, from, icon, text }] }
 */
import { Random } from '../../core/Random.js';
import { COUNTRIES } from '../world/Countries.js';
import { yearNow } from '../world/Eras.js';
import { contactThen } from '../world/TravelOfTheDay.js';

const BOX = 20;
const here = (state) => state.character.countryId ?? 'US';
const abroad = (state) => (state.people?.list ?? []).filter((p) => p.alive && p.livesIn && p.livesIn !== here(state) && ['mother', 'father', 'sibling', 'child', 'grandparent', 'cousin'].includes(p.relation));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 70001 + state.character.age * 1291 + salt) >>> 0);
const relWord = (p) => (p.relation === 'sibling' ? (p.gender === 'female' ? 'sister' : 'brother') : p.relation === 'child' ? (p.gender === 'female' ? 'daughter' : 'son') : p.relation);
const place = (p) => COUNTRIES[p.livesIn]?.name ?? 'the old country';

/** How word travels this year: letter, telegram, phone, email. */
export function medium(state, to) {
  const c = contactThen(state, to);
  const y = yearNow(state);
  return y >= 2005 ? 'video' : c.email ? 'email' : y >= 1975 && c.phone ? 'phone' : 'letter';
}

/** What a reply says: ordinary news, in its time. */
function news(state, p, rng) {
  const y = yearNow(state);
  const old = y < 1920;
  const pool = [
    `the ${old ? 'harvest' : 'factory'} ${rng.chance(0.5) ? 'was good this year' : 'has been poor, and money is tight'}`,
    `${p.gender === 'female' ? 'she' : 'he'} has been ${rng.chance(0.5) ? 'poorly but is mending' : 'well, and busy'}`,
    `prices in ${place(p)} have gone up again`,
    `there is talk of ${old ? 'a new railway line' : 'an election'} and nobody speaks of anything else`,
    `old neighbours ask after you, and want to know if it's true what they say about ${COUNTRIES[here(state)]?.name ?? 'where you are'}`,
    `${p.gender === 'female' ? 'she' : 'he'} is courting${rng.chance(0.4) ? ', and you are not to tell anyone yet' : ''}`,
    `the church ${old ? 'has a new minister' : 'is half empty these days'}`,
    `a photograph is enclosed${y < 1880 ? ' — a little stiff, from the studio in town' : ''}`,
  ];
  return rng.pick(pool);
}

function file(state, entry) {
  const L = (state.letters ??= { box: [] });
  L.box.push(entry);
  if (L.box.length > BOX) L.box.shift();
}

export function lettersTick(ctx) {
  const { state } = ctx;
  if (state.character.age < 10) return;
  const rng = sideRng(state, 0x1e7);
  const y = yearNow(state);
  const wrote = state.travelDay?.wrote ?? {};
  let replies = 0;
  for (const p of abroad(state)) {
    if (replies >= 2) break;
    // Family you write to write back; others now and then.
    const odds = (wrote[p.id] ?? -99) >= y - 1 ? 0.8 : p.relationship >= 60 ? 0.35 : 0.12;
    if (!rng.chance(odds)) continue;
    replies++;
    const how = medium(state, p.livesIn);
    const said = news(state, p, rng);
    const text = how === 'letter' ? `A letter from your ${relWord(p)} ${p.firstName} in ${place(p)}: ${said}.` : how === 'phone' ? `${p.firstName} rang from ${place(p)}: ${said}.` : how === 'email' ? `An email from ${p.firstName} in ${place(p)}: ${said}.` : `A video call with ${p.firstName} in ${place(p)}: ${said}.`;
    file(state, { year: y, from: p.firstName, icon: how === 'letter' ? '✉️' : how === 'phone' ? '📞' : how === 'email' ? '📧' : '📹', text });
    ctx.log(text, how === 'letter' ? '✉️' : '📞', 'info');
    p.relationship = Math.min(100, p.relationship + 1);
    // A sibling or grown child asks for the passage money to come and join you.
    if (y < 1965 && ['sibling', 'child'].includes(p.relation) && (p.age ?? 30) >= 16 && (p.age ?? 30) <= 45 && rng.chance(0.18) && !state.prompts.some((x) => x.type === 'letters.passage')) {
      const fare = Math.round((y < 1850 ? 1800 : y < 1914 ? 1000 : 1400) * 1.5);
      ctx.prompt({
        type: 'letters.passage', icon: '🚢', title: `${p.firstName} Wants to Come`,
        text: `Your ${relWord(p)} ${p.firstName} writes asking for the fare to join you in ${COUNTRIES[here(state)]?.name ?? 'your new country'}. "There is nothing for me here."`,
        options: [
          { id: 'send', label: '🎟️ Send the passage money', hint: `≈$${fare.toLocaleString()}` },
          { id: 'wait', label: '⏳ Ask them to wait a year or two' },
          { id: 'no', label: '✋ Tell them to stay' },
        ],
        data: { id: p.id, fare },
      });
    }
  }
}

export const LettersModule = {
  id: 'letters',
  order: 8.8,
  setup(engine) {
    // A death abroad: the news comes as it would have.
    engine.bus.on('people:died', ({ ctx, person }) => {
      const { state } = ctx;
      if (!person?.livesIn || person.livesIn === here(state) || !['mother', 'father', 'sibling', 'child', 'grandparent'].includes(person.relation)) return;
      const c = contactThen(state, person.livesIn);
      const y = yearNow(state);
      const text = c.phone && y >= 1960 ? `The phone rang in the night: your ${relWord(person)} ${person.firstName} had died in ${place(person)}.`
        : c.telegraph ? `A telegram came from ${place(person)}: your ${relWord(person)} ${person.firstName} was dead. The letter with the details followed ${c.letterTime} later.`
        : `A letter with a black border came from ${place(person)}: your ${relWord(person)} ${person.firstName} had died, and was buried ${c.letterTime} before you knew.`;
      file(state, { year: y, from: person.firstName, icon: '🖤', text });
      ctx.log(text, '🖤', 'bad');
      if (!c.phone || y < 1960) ctx.stat('happiness', -3);
    });
  },
  onAgeUp: lettersTick,
  resolvers: {
    passage(ctx, data, optionId) {
      const { state } = ctx;
      const p = state.people?.list?.find((x) => x.id === data.id);
      if (!p?.alive) return;
      if (optionId === 'send') {
        if (!ctx.spend(data.fare, `Passage money for ${p.firstName}`, { credit: true })) return ctx.log(`You couldn't raise the fare for ${p.firstName}.`, '🚢', 'warn');
        delete p.livesIn;
        p.relationship = Math.min(100, p.relationship + 15);
        ctx.emit('news:story', { tier: 'local', headline: `${p.firstName} ${p.lastName ?? state.character.lastName} arrives`, weight: 1, icon: '🚢' });
        return ctx.log(`${p.firstName} came off the boat thin and tired, and into your arms. ${p.gender === 'female' ? 'She' : 'He'} lives near you now.`, '🚢', 'milestone');
      }
      if (optionId === 'wait') { p.relationship = Math.max(0, p.relationship - 3); return ctx.log(`You asked ${p.firstName} to wait. The next letter was shorter.`, '⏳', 'warn'); }
      p.relationship = Math.max(0, p.relationship - 12);
      ctx.log(`You told ${p.firstName} to stay where ${p.gender === 'female' ? 'she' : 'he'} was. ${p.gender === 'female' ? 'She' : 'He'} did not write for a long time.`, '✋', 'bad');
    },
  },
};

export const lettersOf = (state) => state.letters?.box ?? [];
