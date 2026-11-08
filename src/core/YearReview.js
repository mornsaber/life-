/**
 * The year in review: what changed between one birthday and the next, so the player sees the
 * year at a glance instead of reading the whole log. The engine takes a snapshot before a year
 * and stores the review after it (state.lastYear); the Life tab shows it.
 *
 * state.lastYear = { age, stats: { health: +3, ... }, cash, worth, job: { kind, text } | null,
 *                    people: [{ icon, text }], health: [{ icon, text } | { icon, verb, condition }],
 *                    highlights: [{ icon, text, kind }] }
 */
import { STAT_KEYS, netWorth } from './State.js';

const NOTABLE = 3; // stat changes smaller than this are noise

export function snapshot(state) {
  const job = state.career?.job;
  return {
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, state.stats[k] ?? 0])),
    cash: Math.round(state.finances?.cash ?? 0),
    worth: netWorth(state),
    job: job ? { professionId: job.professionId, levelId: job.levelId, title: job.title, employer: job.employer?.name, salary: job.salary } : null,
    people: Object.fromEntries((state.people?.list ?? []).map((p) => [p.id, { alive: p.alive, relation: p.relation }])),
    conditions: (state.health?.conditions ?? []).filter((c) => c.diagnosed && !c.remission).map((c) => c.id),
    jailed: Boolean(state.legal?.incarceration),
  };
}

const name = (p) => p.firstName ?? 'Someone';
const RELATION_WORD = { spouse: 'spouse', partner: 'partner', fiance: 'fiancé(e)', child: 'child', parent: 'parent', sibling: 'sibling', grandparent: 'grandparent', grandchild: 'grandchild' };

export function review(before, state) {
  const after = snapshot(state);
  const stats = {};
  for (const k of STAT_KEYS) { const d = after.stats[k] - before.stats[k]; if (Math.abs(d) >= NOTABLE) stats[k] = d; }

  // Work.
  let job = null;
  const a = after.job; const b = before.job;
  if (a && !b) job = { kind: 'good', text: `Started as ${a.title}${a.employer ? ` at ${a.employer}` : ''}` };
  else if (!a && b) job = { kind: 'warn', text: `Left ${b.title}${b.employer ? ` at ${b.employer}` : ''}` };
  else if (a && b && (a.professionId !== b.professionId || a.employer !== b.employer)) job = { kind: 'info', text: `Moved to ${a.title}${a.employer ? ` at ${a.employer}` : ''}` };
  else if (a && b && a.levelId !== b.levelId) job = { kind: 'good', text: `Promoted to ${a.title}` };
  else if (a && b && b.salary && a.salary > b.salary * 1.02) job = { kind: 'good', text: `A raise: pay up ${Math.round((a.salary / b.salary - 1) * 100)}%` };

  // People: arrivals, departures, partners.
  const people = [];
  for (const p of state.people?.list ?? []) {
    const was = before.people[p.id];
    const rel = RELATION_WORD[p.relation];
    if (!was && p.alive && p.relation === 'child') people.push({ icon: '👶', text: `${name(p)} was born` });
    else if (!was && p.alive && ['partner', 'spouse'].includes(p.relation)) people.push({ icon: '💞', text: `You met ${name(p)}` });
    else if (was?.alive && !p.alive && rel) people.push({ icon: '🕯️', text: `Your ${rel} ${name(p)} died` });
    else if (was && was.relation !== 'spouse' && p.relation === 'spouse' && p.alive) people.push({ icon: '💍', text: `You married ${name(p)}` });
    else if (was && ['spouse', 'partner', 'fiance'].includes(was.relation) && ['ex', 'friend'].includes(p.relation)) people.push({ icon: '💔', text: `You and ${name(p)} split up` });
  }

  // Health: new diagnoses and recoveries.
  const health = [];
  for (const id of after.conditions) if (!before.conditions.includes(id)) health.push({ icon: '🩺', verb: 'Diagnosed', condition: id });
  for (const id of before.conditions) if (!after.conditions.includes(id)) health.push({ icon: '🌤️', verb: 'Recovered', condition: id });
  if (after.jailed && !before.jailed) health.push({ icon: '🔒', text: 'Behind bars' });
  if (!after.jailed && before.jailed) health.push({ icon: '🚪', text: 'Released' });

  // The year's headline moments from the log, best first.
  const rank = { death: 0, milestone: 1, bad: 2, good: 3, warn: 4 };
  const year = state.log.at(-1)?.age === state.character.age ? state.log.at(-1).entries : [];
  // Things that happened to you come before the news around you (a city's credit rating, a relative's move).
  const personal = (e) => e.kind === 'death' || e.kind === 'milestone' || /\b(you|your|you're|you've)\b/i.test(e.text);
  const ranked = year.filter((e) => rank[e.kind] != null).map((e) => ({ e, score: rank[e.kind] + (personal(e) ? 0 : 10) })).sort((x, y) => x.score - y.score);
  const mine = ranked.filter((r) => r.score < 10);
  const highlights = (mine.length ? mine : ranked).slice(0, 4).map(({ e }) => ({ icon: e.icon, text: e.text, kind: e.kind }));

  // Where the money went, and where it came from (Finances keeps the year's flows).
  const f = state.finances ?? {};
  const top = (items) => {
    const by = {};
    for (const { reason, amount } of items) if (amount > 0) { const k = String(reason ?? 'Other').replace(/\s*[—(].*$/, ''); by[k] = (by[k] ?? 0) + amount; }
    const best = Object.entries(by).sort((x, y) => y[1] - x[1])[0];
    return best ? { label: best[0], amount: Math.round(best[1]) } : null;
  };
  const ly = f.lastYear ?? {};
  const spent = top([...(f.lastLedger?.expenses ?? []), { reason: 'Taxes', amount: ly.tax ?? 0 }, { reason: 'Living costs', amount: ly.living ?? 0 }, { reason: 'Health insurance', amount: ly.insurance ?? 0 }, { reason: 'Loan payments', amount: ly.loanPayment ?? 0 }]);
  const earned = top(f.lastLedger?.income ?? []);

  return { age: state.character.age, spent, earned, stats, cash: after.cash - before.cash, worth: after.worth - before.worth, job, people: people.slice(0, 4), health: health.slice(0, 3), highlights, entries: year.length };
}
