/**
 * Keeping long games light: the save grows with every year of world history, organisation
 * minutes and local ballot results. Once a decade, trim the oldest entries of lists that only
 * ever look back a few years. (The yearly log already folds old years into summaries.)
 *
 * A new generation starts from a fresh world, so a dynasty's save stays about the size of one life.
 */
const CAPS = { world: 50, org: 40, union: 40, local: 60 };
const trim = (list, n) => (Array.isArray(list) && list.length > n ? list.splice(0, list.length - n).length : 0);

export function prune(state) {
  let dropped = 0;
  dropped += trim(state.world?.history, CAPS.world);
  for (const o of Object.values(state.orgs?.byId ?? {})) dropped += trim(o?.history, CAPS.org);
  for (const u of Object.values(state.unions?.byId ?? {})) dropped += trim(u?.history, CAPS.union);
  for (const place of Object.values(state.civic?.local ?? {})) dropped += trim(place?.history, CAPS.local);
  return dropped;
}

export const HousekeepingModule = {
  id: 'housekeeping',
  order: 999,
  onAgeUp(ctx) {
    if (ctx.state.character.age % 10 === 0) prune(ctx.state);
  },
};
