/**
 * Fame after death: what the papers say, what becomes of a name, and what the heirs get from it.
 *
 *   The obituary  placed by fame: the front page for an icon, a column for the famous, a paragraph
 *                 for the known, a notice in the local paper for everyone else.
 *   Afterwards    each famous ancestor's reputation moves on: a biography, a film of the life (from
 *                 1915), a forgotten talent rediscovered, or a slow fade from memory.
 *   The heirs     the family name is a fame source of its own (halving each generation); the
 *                 estate's works earn royalties while they are in copyright (28 years before the
 *                 Berne Convention of 1886, life + 50 after it, life + 70 in the EU from 1995 and the
 *                 US from 1998); an icon's image is licensed by the estate (the US from 1985).
 *
 * The record rides on the ancestor (lineage.ancestors[i].fameAfter = { peak, reach, works, prizes,
 * scandals, persona, rep, events: [] }).
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { fameScore, registerFameSource, addBuzz } from './Fame.js';
import { reachOf } from './FameOfTheDay.js';

const EU = ['FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 'IE', 'PT', 'GR', 'PL', 'GB'];

/** What a life leaves for the record (Legacy.js puts it on the ancestor). */
export function fameAfterRecord(old) {
  const peak = Math.max(old.fame?.peak ?? 0, fameScore(old));
  if (peak < 20) return null;
  const good = (old.works?.list ?? []).filter((w) => w.verdict === 'acclaimed' || w.verdict === 'a masterpiece');
  return {
    peak: Math.round(peak), reach: reachOf(old, peak), died: yearNow(old), cc: old.character.countryId ?? 'US',
    works: (old.works?.list ?? []).length, acclaimed: good.length, titles: good.slice(-3).map((w) => w.title),
    prizes: [...(old.works?.prizes ?? [])], scandals: (old.fame?.scandals ?? []).length, persona: old.fame?.persona ?? null,
    rep: Math.round(peak), events: [],
  };
}

/** Where the obituary ran. */
export function obituaryPlacement(state) {
  const score = Math.max(state.fame?.peak ?? 0, fameScore(state));
  const y = yearNow(state);
  const media = y >= 1950 ? ' and on the evening news' : y >= 1925 ? ' and on the wireless' : '';
  if (score >= 70) return `The front page of every paper${media}, with tributes from around the world`;
  if (score >= 45) return `A full column in the national papers${media}`;
  if (score >= 20) return 'A paragraph in the national papers';
  return 'A notice in the local paper';
}

/** How long the works stay in copyright, for a death in `died` in country `cc`, as of `y`. */
export function copyrightUntil(died, cc, y) {
  if (y < 1886) return died + 28;
  if ((EU.includes(cc) && y >= 1995) || (cc === 'US' && y >= 1998)) return died + 70;
  return died + 50;
}

const famous = (state) => (state.lineage?.ancestors ?? []).map((a, i) => ({ a, i })).filter(({ a }) => a.fameAfter);

/** The family name: each famous ancestor's standing, halving each generation back. */
export function familyNameFame(state) {
  const gen = state.lineage?.generation ?? 1;
  return Math.min(30, famous(state).reduce((sum, { a }) => sum + (a.fameAfter.rep * 0.3) / 2 ** Math.max(0, gen - 1 - (a.generation ?? 1)), 0));
}
registerFameSource((state, add) => { const v = familyNameFame(state); if (v >= 1) add('family', 'The family name', v); });

const rngOf = (state) => new Random(((state.world?.seed ?? 11) * 2246822519 + state.character.age * 61 + 0x2f1) >>> 0);

export const FameAfterModule = {
  id: 'fameAfter',
  order: 96.3,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive || state.character.age < 18) return;
    const y = yearNow(state);
    const rng = rngOf(state);
    for (const { a } of famous(state)) {
      const f = a.fameAfter;
      const since = y - (f.died ?? a.died ?? y);
      // Royalties while the works are in copyright; image rights for an icon.
      if (f.acclaimed && y <= copyrightUntil(f.died ?? a.died, f.cc, y)) ctx.earn(Math.round((800 + f.acclaimed * 1500 + f.prizes.length * 2000) * priceLevel(state) * (f.rep / 60)), `Royalties: ${a.name}'s work`, {});
      if (f.peak >= 70 && f.cc === 'US' && y >= 1985) ctx.earn(Math.round(20000 * priceLevel(state) * (f.rep / 70)), `Licensing ${a.name}'s name and image`, {});
      // Reputation moves on.
      if (since < 3 || rng.chance(0.75)) continue;
      if (!f.events.includes('biography') && f.rep >= 40 && rng.chance(0.25)) {
        f.events.push('biography'); f.rep = Math.min(100, f.rep + 6); addBuzz(state, 3);
        ctx.log(`A new biography of ${a.name} came out. The reviewers argued about it; you were asked for an interview.`, '📘', 'info');
      } else if (!f.events.includes('film') && y >= 1915 && f.rep >= 55 && rng.chance(0.2)) {
        f.events.push('film'); f.rep = Math.min(100, f.rep + 10); addBuzz(state, 6);
        ctx.earn(Math.round(40000 * priceLevel(state)), `Film rights: the life of ${a.name}`, {});
        ctx.log(`A film of ${a.name}'s life opened ${y >= 1960 ? 'in cinemas everywhere' : 'at the picture houses'}. The actor looked nothing like ${a.gender === 'female' ? 'her' : 'him'}.`, '🎬', 'good');
      } else if (!f.events.includes('rediscovered') && f.works >= 2 && since >= 20 && f.rep < 45 && rng.chance(0.2)) {
        f.events.push('rediscovered'); f.rep = Math.min(100, f.rep + 25); addBuzz(state, 5);
        ctx.log(`Critics have rediscovered ${a.name}: an exhibition, reissues, and talk of a neglected master.`, '🔎', 'good');
      } else if (f.scandals >= 3 && !f.events.includes('reassessed') && since >= 25 && rng.chance(0.2)) {
        f.events.push('reassessed'); f.rep = Math.max(0, f.rep - 15);
        ctx.log(`A new generation has looked again at ${a.name}, and does not like everything it found.`, '🧐', 'warn');
      } else if (since >= 30) {
        f.rep = Math.max(0, f.rep - 3);
      }
    }
  },
};
