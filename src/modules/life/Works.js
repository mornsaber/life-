/**
 * Paths to fame: works of art and letters, the pulpit and the platform, and the feats of science
 * and exploration (career/Feats.js) counted as fame.
 *
 *   Works      a novel, poems, a painting, a composition, a play (a screenplay from 1915): each
 *              judged by its day (panned, noticed, acclaimed, a masterpiece), earning a little or a
 *              lot, and getting better with practice. A body of work makes a name.
 *   Prizes     of their day and place: the Prix de Rome (France, 1803–1968, the young), the
 *              Royal Academy (Britain, from 1768), the Goncourt (1903), the Pulitzer (America,
 *              1918), the Nobel Prize in Literature (1901, a lifetime's work), the Booker (1969).
 *   Oratory    preaching and speaking: a revival meeting, a radio sermon, a television ministry, a
 *              speaking tour; a following of your own.
 *
 * state.works = { list: [{ year, kind, title, verdict, q }], practice: { kind: n }, prizes: [id], oratory }
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { registerFameSource, addBuzz } from './Fame.js';
import { radioHere, tvHere } from './FameOfTheDay.js';

export const KINDS = {
  novel: { icon: '📖', label: 'Write a novel', noun: 'novel', from: 1800, titles: ['The Long Winter', 'A House by the River', 'The Inheritance', 'Daughters of the Plain', 'The Last Summer', 'Iron and Salt', 'The Quiet Hour', 'A Stranger in Town'] },
  poems: { icon: '🪶', label: 'Publish a book of poems', noun: 'collection of poems', from: 1800, titles: ['Songs of the Valley', 'Night Pieces', 'The Orchard', 'Elegies', 'Field and Shore'] },
  painting: { icon: '🎨', label: 'Paint a major canvas', noun: 'painting', from: 1800, titles: ['The Harvest', 'Portrait of My Mother', 'Evening on the Quay', 'The Storm', 'Bathers', 'The Red Room'] },
  composition: { icon: '🎼', label: 'Compose a symphony or song cycle', noun: 'composition', from: 1800, titles: ['Symphony in D', 'Variations on a Folk Song', 'Requiem', 'The Seasons', 'Nocturnes'] },
  play: { icon: '🎭', label: 'Write a play', noun: 'play', from: 1800, titles: ['The Visitors', 'A Respectable Family', 'Three Sisters-in-Law', 'The Bridge', 'Midsummer Accounts'] },
  screenplay: { icon: '🎬', label: 'Write a screenplay', noun: 'screenplay', from: 1915, titles: ['Night Train', 'The Big Sky', 'Second Chances', 'The Long Road Home'] },
};
const VERDICTS = [['panned', 0, '😬'], ['noticed', 5, '📰'], ['acclaimed', 14, '🌟'], ['a masterpiece', 28, '🏆']];

/** Prizes of their day: [id, name, kinds, where (null: anywhere), from, until, minAge/maxAge, bar]. */
export const PRIZES = [
  { id: 'prixDeRome', name: 'the Prix de Rome', kinds: ['painting', 'composition'], where: ['FR'], from: 1803, until: 1968, maxAge: 30, bar: 14 },
  { id: 'ra', name: 'election to the Royal Academy (RA)', kinds: ['painting'], where: ['GB'], from: 1768, bar: 14, honour: true },
  { id: 'goncourt', name: 'the Prix Goncourt', kinds: ['novel'], where: ['FR'], from: 1903, bar: 14 },
  { id: 'pulitzer', name: 'the Pulitzer Prize', kinds: ['novel', 'play', 'composition'], where: ['US'], from: 1918, bar: 14 },
  { id: 'booker', name: 'the Booker Prize', kinds: ['novel'], where: ['GB', 'IE', 'AU', 'NZ', 'CA', 'IN', 'ZA', 'NG'], from: 1969, bar: 14 },
  { id: 'academyAward', name: 'the Academy Award for Best Screenplay', kinds: ['screenplay'], where: null, from: 1929, bar: 14 },
  { id: 'nobelLit', name: 'the Nobel Prize in Literature', kinds: ['novel', 'poems', 'play'], where: null, from: 1901, minAge: 45, bar: 28, body: 3, honour: true },
];

const w = (state) => (state.works ??= { list: [], practice: {}, prizes: [], oratory: 0 });
const cc = (state) => state.character.countryId ?? 'US';

export function kindsNow(state) {
  const y = yearNow(state);
  return Object.entries(KINDS).filter(([, k]) => y >= k.from).map(([id, k]) => ({ id, ...k }));
}

/** The fame a body of work brings: the best three works count. */
export function worksFame(state) {
  const best = (state.works?.list ?? []).map((x) => VERDICTS.find(([v]) => v === x.verdict)?.[1] ?? 0).sort((a, b) => b - a).slice(0, 3);
  return best.reduce((a, b) => a + b, 0) + (state.works?.prizes?.length ?? 0) * 8;
}

registerFameSource((state, add) => {
  add('works', 'Your work', worksFame(state));
  if (state.works?.oratory) add('oratory', 'Your preaching and speeches', state.works.oratory * 0.6);
  const f = state.feats;
  if (f) add('feats', 'Your discoveries and expeditions', (f.discoveries?.length ?? 0) * 14 + (f.expeditions ?? []).filter((e) => e.success).reduce((a, e) => a + (e.first ? 30 : 8), 0) + (f.built?.length ?? 0) * 6);
});

function prizeFor(state, work) {
  const y = yearNow(state);
  const score = VERDICTS.find(([v]) => v === work.verdict)?.[1] ?? 0;
  const body = (state.works.list ?? []).filter((x) => (VERDICTS.find(([v]) => v === x.verdict)?.[1] ?? 0) >= 14).length;
  return PRIZES.find((p) => p.kinds.includes(work.kind) && (!p.where || p.where.includes(cc(state))) && y >= p.from && !(p.until && y >= p.until)
    && !(p.maxAge && state.character.age > p.maxAge) && !(p.minAge && state.character.age < p.minAge) && score >= p.bar && (!p.body || body >= p.body) && !state.works.prizes.includes(p.id));
}

export const WorksModule = {
  id: 'works',
  order: 96.2,
  actions: {
    /** Make a work: arg = kind. Once a year. */
    create(ctx, kind) {
      const { state, rng } = ctx;
      const k = KINDS[kind];
      if (!k || yearNow(state) < k.from) return ctx.toast('Not of its day', 'warn');
      if (state.character.age < 16) return ctx.toast('From 16', 'warn');
      if (yearlyCount(state, 'works.create')) return ctx.toast('One major work a year', 'warn');
      bumpYearly(state, 'works.create');
      const r = w(state);
      const practice = r.practice[kind] ?? 0;
      const q = clamp(state.stats.smarts * 0.45 + (state.stats.happiness - 50) * 0.1 + Math.min(30, practice * 6) + rng.int(-25, 25), 0, 100);
      const verdict = q >= 88 ? 'a masterpiece' : q >= 68 ? 'acclaimed' : q >= 45 ? 'noticed' : 'panned';
      const title = rng.pick(k.titles);
      const work = { year: yearNow(state), kind, title, verdict, q: Math.round(q) };
      r.list.push(work);
      if (r.list.length > 30) r.list.shift();
      r.practice[kind] = practice + 1;
      ctx.stat('stress', 4);
      const [, fame, icon] = VERDICTS.find(([v]) => v === verdict);
      const earn = Math.round(({ panned: 300, noticed: 2500, acclaimed: 15000, 'a masterpiece': 60000 }[verdict]) * priceLevel(state));
      if (earn) ctx.earn(earn, `${k.noun[0].toUpperCase()}${k.noun.slice(1)}: ${title}`, { wage: true });
      addBuzz(state, Math.round(fame / 2));
      ctx.log(`Your ${k.noun} "${title}" came out and was ${verdict}.`, icon, fame >= 14 ? 'good' : 'info');
      const prize = prizeFor(state, work);
      if (prize && rng.chance(prize.id === 'nobelLit' ? 0.25 : 0.4)) {
        r.prizes.push(prize.id);
        addBuzz(state, 15);
        addHonor(state, { id: `prize.${prize.id}`, source: 'award', name: prize.name.replace(/^the /, '').replace(/^election to /, ''), icon: '🏅', precedence: 20, prestige: prize.id === 'nobelLit' ? 25 : 8, citation: `For "${title}".` });
        ctx.log(`You won ${prize.name} for "${title}".`, '🏅', 'honor');
      }
      return undefined;
    },
    /** Preach or speak: a following of your own. */
    speak(ctx) {
      const { state, rng } = ctx;
      if (state.character.age < 18) return ctx.toast('From 18', 'warn');
      if (yearlyCount(state, 'works.speak')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'works.speak');
      const r = w(state);
      const medium = tvHere(state) ? 'a television ministry and speaking tour' : radioHere(state) ? 'a radio programme and packed halls' : 'revival meetings and lecture halls';
      const gain = Math.round(clamp((state.stats.looks - 50) / 10 + (state.stats.smarts - 50) / 15 + rng.int(2, 10), 1, 15));
      r.oratory = Math.min(100, (r.oratory ?? 0) + gain);
      ctx.stat('stress', 3);
      addBuzz(state, Math.round(gain / 2));
      return ctx.log(`A year of ${medium}: ${r.oratory >= 60 ? 'crowds come from miles around' : r.oratory >= 25 ? 'a following of your own now' : 'small crowds, growing'}.`, '🎤', 'good');
    },
  },
};
