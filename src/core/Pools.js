/**
 * Event-pool helper shared by every content pool. pickFresh() avoids events
 * seen recently in the same pool so long lives stop repeating themselves;
 * the memory is a short id list per pool under state.flags.recent.
 */
export function pickFresh(rng, state, poolKey, pool, { memory = Math.ceil(pool.length * 0.6), idOf = (e) => e.id ?? e.text ?? e.title } = {}) {
  if (!pool.length) return null;
  const recent = ((state.flags.recent ??= {})[poolKey] ??= []);
  const fresh = pool.filter((e) => !recent.includes(idOf(e)));
  const event = rng.pick(fresh.length ? fresh : pool);
  recent.push(idOf(event));
  while (recent.length > Math.min(memory, pool.length - 1)) recent.shift();
  return event;
}

/** Eligible events by age window (minAge/maxAge) and optional `when(state)` predicate. */
export function eligible(pool, state) {
  const age = state.character.age;
  return pool.filter((e) => age >= (e.minAge ?? 0) && age <= (e.maxAge ?? 200) && (!e.when || e.when(state)));
}
