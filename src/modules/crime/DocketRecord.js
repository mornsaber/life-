/**
 * The docket's history: every case you closed, from the docket itself or from the year's big
 * decision (a matter, a ruling, a hard case). Kept apart from Docket.js so the law and court
 * modules can write to it without importing the docket.
 *
 * state.docket = { open: [], closed: [{ role, title, result, note, age }], record: { result: n }, seq }
 */
export const docketOf = (state) => (state.docket ??= { open: [], closed: [], record: {}, seq: 0 });

export function recordCase(state, { role, title, result, note = '' }) {
  const d = docketOf(state);
  d.record[result] = (d.record[result] ?? 0) + 1;
  d.closed.push({ role, title, result, note, age: state.character.age });
  if (d.closed.length > 40) d.closed.splice(0, d.closed.length - 40);
}

/** A case's one-line name from its facts: the first clause, trimmed. */
export const gist = (text = '') => {
  const first = text.split(/(?<=[.:;])\s/)[0].replace(/[.:;]$/, '');
  return first.length > 70 ? `${first.slice(0, 67).replace(/\s\S*$/, '')}…` : first;
};
