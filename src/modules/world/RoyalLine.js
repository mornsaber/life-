/**
 * The line of succession, worked out from the royal family itself.
 *
 *   The family    Every royal life carries its house as a tree: the late monarch at the root,
 *                 the reigning monarch and their brothers and sisters, their children and
 *                 grandchildren. You, your parents, brothers, sisters and children are the real
 *                 people of your life; the rest of the house are named relatives who are born,
 *                 grow old, marry and die.
 *   The law      The line is read from the tree by the crown's law, every year:
 *                 equal primogeniture (eldest child first, daughters too: Sweden from 1980, the
 *                   Netherlands 1983, Norway 1990, Belgium 1991, Denmark 2009, Luxembourg 2011,
 *                   Britain for those born after 2011);
 *                 male preference (sons before daughters: Spain, Britain before 2011, Monaco…);
 *                 male line only (no daughters, and none of their children: Japan, Thailand,
 *                   Jordan, Morocco, the Gulf).
 *   Moving       You move only because someone ahead of you is born, dies, renounces their
 *                 rights, or (in Japan) marries out of the imperial family — never at random.
 *
 * state.royal.tree = { nodes: { [id]: { id, name, gender, born, died, parent, personId, you, out, block } },
 *                      rootId, monarchId, seed }
 * A `block` node stands for many relatives at once (the far reaches of a big house).
 * Its own random stream: the rest of the life rolls as it always did.
 */
import { Random } from '../../core/Random.js';
import { currentYear } from '../../core/State.js';
import { CROWNS, ROYAL_LEVELS } from './Crown.js';

/** When equal primogeniture came in: [year of the law, applies to those born from (null: everyone)]. */
const EQUAL_FROM = { SE: [1980, null], NL: [1983, null], NO: [1990, 1990], BE: [1991, 1991], DK: [2009, null], LU: [2011, null], GB: [2015, 2011] };

/** The law in force for a child born in `born`, in year `y`. */
export function lawFor(crownId, born, y) {
  const def = CROWNS[crownId];
  if (!def) return 'malePreference';
  if (def.rule !== 'absolute') return def.rule;
  const eq = EQUAL_FROM[crownId];
  if (!eq) return 'absolute';
  if (y < eq[0]) return 'malePreference';
  return eq[1] != null && born < eq[1] ? 'malePreference' : 'absolute';
}

const trng = (t) => { t.seed = ((t.seed ?? 1) * 1664525 + 1013904223) >>> 0; return new Random(t.seed); };
const nid = (t) => { t.n = (t.n ?? 0) + 1; return `rn${t.n}`; };
const childrenOf = (t, id) => Object.values(t.nodes).filter((n) => n.parent === id);
const alive = (n) => !n.died && !n.out;

/** The order of succession: everyone in line, in order (a block counts for many). */
export function lineOf(state) {
  const r = state.royal;
  const t = r?.tree;
  if (!t?.nodes?.[t.monarchId] && !t?.nodes?.[t.rootId]) return [];
  const y = currentYear(state);
  const out = [];
  const lawOf = (n) => lawFor(r.crownId, n.born ?? y, y);
  const ordered = (id) => childrenOf(t, id).sort((a, b) => {
    const male = (x) => (x.gender === 'male' ? 0 : 1);
    if (lawOf(a) !== 'absolute' || lawOf(b) !== 'absolute') { const d = male(a) - male(b); if (d) return d; }
    return (a.born ?? 0) - (b.born ?? 0) || (a.id < b.id ? -1 : 1);
  });
  // A person and then their descendants, in order (renouncing or marrying out takes the
  // descendants too; under the male line only, a daughter and her children are never in line).
  const visit = (id) => {
    const n = t.nodes[id];
    if (!n || n.out) return;
    const agnaticDaughter = lawOf(n) === 'agnatic' && n.gender === 'female';
    if (id !== t.monarchId && !n.died && !agnaticDaughter) out.push(n);
    if (agnaticDaughter) return;
    for (const k of ordered(id)) visit(k.id);
  };
  // The monarch's own descendants first; then up the family, each ancestor's other branches.
  let from = t.nodes[t.monarchId] ? t.monarchId : t.rootId;
  visit(from);
  let up = t.nodes[from]?.parent;
  while (up && t.nodes[up]) {
    for (const k of ordered(up)) if (k.id !== from) visit(k.id);
    from = up;
    up = t.nodes[up].parent;
  }
  return out;
}
/** Your place in the line (1 = the heir), or null. Blocks count for their size. */
export function placeOf(state, order = lineOf(state)) {
  let n = 0;
  for (const x of order) {
    if (x.you) return n + 1;
    n += x.block ?? 1;
  }
  return null;
}
/** The line as a list for the screen: the first `top`, the people around you, and you. */
export function lineView(state, top = 10) {
  const order = lineOf(state);
  const rows = [];
  let n = 0;
  for (const x of order) {
    const pos = n + 1;
    n += x.block ?? 1;
    rows.push({ pos, to: x.block ? n : pos, node: x });
  }
  const mine = rows.findIndex((x) => x.node.you);
  return rows.filter((x, i) => i < top || (mine >= 0 && Math.abs(i - mine) <= 2));
}

/* ------------------------------------------------------------------ */
/* Building the house                                                  */
/* ------------------------------------------------------------------ */

const add = (t, o) => { const id = o.id ?? nid(t); t.nodes[id] = { id, died: null, ...o }; return t.nodes[id]; };
const name = (rng, def, gender, t = null) => {
  const pool = def.names?.[gender] ?? ['Royal'];
  const used = new Set(t ? Object.values(t.nodes).filter((n) => !n.died).map((n) => n.name) : []);
  const free = pool.filter((x) => !used.has(x));
  return rng.pick(free.length ? free : pool);
};

/**
 * The house around a royal life, shaped so you start where your level puts you: the heir; one of
 * the monarch's younger children; a grandchild a few places down; or a distant cousin far down.
 */
export function buildTree(state, seed = 1) {
  const r = state.royal;
  const def = CROWNS[r.crownId];
  const crown = state.world?.crowns?.[r.crownId];
  if (!def || !crown) return null;
  const t = { nodes: {}, seed: (seed ^ 0x51ccee) >>> 0 };
  const rng = trng(t);
  const y = currentYear(state);
  const myBorn = y - state.character.age;
  const people = state.people?.list ?? [];
  const royalParent = people.find((p) => ['monarch', 'royalChild', 'distant'].includes(p.royal)) ?? people.find((p) => p.relation === 'father' || p.relation === 'mother');
  const pAge = (p) => (p ? state.character.age + (p.ageOffset ?? 30) : 30);
  const you = { id: 'you', name: state.character.firstName, gender: state.character.gender, born: myBorn, you: true };
  const peopleKids = (parentId, rel) => (state.people?.list ?? []).filter((p) => p.relation === rel && p.alive !== false).map((p) => add(t, { id: `p_${p.id}`, name: p.firstName, gender: p.gender, born: y - (state.character.age + (p.ageOffset ?? 0)), parent: parentId, personId: p.id }));
  const npcKids = (parentId, n, born0) => Array.from({ length: n }, (_, i) => { const g = rng.chance(0.5) ? 'male' : 'female'; return add(t, { name: name(rng, def, g, t), gender: g, born: born0 + i * rng.int(2, 4), parent: parentId }); });
  // The reigning monarch at the start (or the one before you, if you reign).
  const level = r.reigning ? 'reigning' : r.level ?? 'child';
  if (level === 'reigning') {
    const root = add(t, { name: name(rng, def, 'male'), gender: 'male', born: myBorn - 30, died: myBorn + 20 });
    t.rootId = root.id;
    add(t, { ...you, parent: root.id });
    t.monarchId = 'you';
    peopleKids('you', 'child');
    npcKids(root.id, rng.int(1, 2), myBorn + 2);
  } else if (level === 'heir' || level === 'child') {
    if (level === 'heir' && state.character.age === 0 && state.people?.list) {
      const law = lawFor(r.crownId, myBorn, y);
      const me = state.character.gender;
      const outranks = (p) => p.relation === 'sibling' && (p.ageOffset ?? 0) >= 0 && (law === 'absolute' || (law === 'malePreference' && (p.gender === 'male' || me === 'female')) || (law === 'agnatic' && p.gender === 'male'));
      state.people.list = state.people.list.filter((p) => !outranks(p));
    }
    const root = add(t, { name: name(rng, def, 'male'), gender: 'male', born: myBorn - 60, died: myBorn - 2 });
    t.rootId = root.id;
    const mGender = crown.monarch?.gender ?? royalParent?.gender ?? 'male';
    const monarch = add(t, { name: crown.monarch?.name ?? royalParent?.firstName ?? name(rng, def, mGender), gender: mGender, born: y - (crown.monarch?.age ?? pAge(royalParent)), parent: root.id, personId: royalParent?.royal === 'monarch' ? royalParent.id : undefined });
    t.monarchId = monarch.id;
    add(t, { ...you, parent: monarch.id });
    if (level === 'child' && state.people?.list) {
      const law = lawFor(r.crownId, myBorn, y);
      const me = state.character.gender;
      const outranks = (p) => p.relation === 'sibling' && (p.ageOffset ?? 0) > 0 && (law === 'absolute' || (law === 'malePreference' && (p.gender === 'male' || me === 'female')) || (law === 'agnatic' && p.gender === 'male'));
      if (!state.people.list.some(outranks)) {
        const g = law === 'absolute' ? (rng.chance(0.5) ? 'male' : 'female') : 'male';
        const heir = { id: `per_heir_${t.seed % 100000}`, firstName: name(rng, def, g, t), lastName: state.character.lastName, gender: g, relation: 'sibling', ageOffset: rng.int(2, 7), relationship: rng.int(55, 85), alive: true, income: 0, royal: 'heir' };
        state.people.list.push(heir);
        r.household ??= {};
        r.household.heirMade = true;
        r.household.heirId = heir.id;
      } else {
        r.household ??= {};
        r.household.heirMade = true;
      }
    }
    peopleKids(monarch.id, 'sibling');
    peopleKids('you', 'child');
    // The monarch's brothers and sisters, and theirs.
    for (const sib of npcKids(root.id, rng.int(1, 3), monarch.born + 2)) npcKids(sib.id, rng.int(0, 3), sib.born + 26);
  } else if (level === 'grandchild') {
    const root = add(t, { name: name(rng, def, 'male'), gender: 'male', born: myBorn - 85, died: myBorn - 25 });
    t.rootId = root.id;
    const monarch = add(t, { name: crown.monarch?.name ?? name(rng, def, 'female'), gender: crown.monarch?.gender ?? 'female', born: y - (crown.monarch?.age ?? 70), parent: root.id });
    t.monarchId = monarch.id;
    // Your royal parent and their brothers and sisters: the older ones (and their children) ahead of you.
    const target = r.line ?? rng.int(...ROYAL_LEVELS.grandchild.line);
    const parentNode = add(t, { name: royalParent?.firstName ?? name(rng, def, 'male'), gender: royalParent?.gender ?? 'male', born: y - pAge(royalParent), parent: monarch.id, personId: royalParent?.id });
    let ahead = 0;
    let born = parentNode.born - 3;
    while (ahead + 1 + 0 < target - 1 && born > monarch.born + 18) {
      const g = def.rule === 'agnatic' ? 'male' : rng.chance(0.5) ? 'male' : 'female';
      const elder = add(t, { name: name(rng, def, g), gender: g, born, parent: monarch.id });
      const kids = Math.min(3, Math.max(0, target - 2 - ahead - 1));
      npcKids(elder.id, kids, elder.born + 27);
      ahead += 1 + kids;
      born -= rng.int(2, 4);
    }
    add(t, { ...you, parent: parentNode.id });
    peopleKids(parentNode.id, 'sibling');
    peopleKids('you', 'child');
    npcKids(monarch.id, rng.int(0, 2), parentNode.born + 3);
  } else {
    // A distant royal: the main line at the top, many cousins between, your branch at the end.
    const root = add(t, { name: name(rng, def, 'male'), gender: 'male', born: myBorn - 110, died: myBorn - 50 });
    t.rootId = root.id;
    const king = add(t, { name: name(rng, def, 'male'), gender: 'male', born: myBorn - 80, died: myBorn - 10, parent: root.id });
    const monarch = add(t, { name: crown.monarch?.name ?? name(rng, def, 'female'), gender: crown.monarch?.gender ?? 'female', born: y - (crown.monarch?.age ?? 70), parent: king.id });
    t.monarchId = monarch.id;
    for (const c of npcKids(monarch.id, rng.int(2, 3), monarch.born + 25)) npcKids(c.id, rng.int(1, 3), c.born + 28);
    const target = r.line ?? rng.int(...ROYAL_LEVELS.distant.line);
    const shown = lineOfCount(t, state, r.crownId);
    add(t, { name: 'the rest of the royal family', gender: 'male', born: myBorn - 78, parent: root.id, block: Math.max(1, target - 1 - shown) });
    const branch = add(t, { name: name(rng, def, 'male'), gender: 'male', born: myBorn - 75, died: myBorn - 5, parent: root.id });
    const parentNode = add(t, { name: royalParent?.firstName ?? name(rng, def, 'male'), gender: royalParent?.gender ?? 'male', born: y - pAge(royalParent), parent: branch.id, personId: royalParent?.id });
    add(t, { ...you, parent: parentNode.id });
    peopleKids(parentNode.id, 'sibling');
    peopleKids('you', 'child');
  }
  // The block's children sit under it for the walk; make sure it isn't the monarch.
  return t;
}
function lineOfCount(t, state, crownId) {
  const tmp = { ...state, royal: { ...state.royal, crownId, tree: t } };
  return lineOf(tmp).reduce((s, x) => s + (x.block ?? 1), 0);
}

/* ------------------------------------------------------------------ */
/* A year in the house                                                 */
/* ------------------------------------------------------------------ */

/** Your family as nodes: births, deaths, marriages out, from the people of your life. */
function syncPeople(state) {
  const t = state.royal.tree;
  const y = currentYear(state);
  const people = state.people?.list ?? [];
  const nodeOf = (p) => t.nodes[`p_${p.id}`] ?? Object.values(t.nodes).find((n) => n.personId === p.id);
  const youNode = t.nodes.you;
  if (youNode) { youNode.name = state.character.firstName; youNode.gender = state.character.gender; }
  const parentNode = youNode?.parent;
  for (const p of people) {
    const rel = p.relation;
    if (!['sibling', 'child', 'grandchild', 'mother', 'father'].includes(rel)) continue;
    let n = nodeOf(p);
    if (!n && (rel === 'sibling' || rel === 'child' || rel === 'grandchild')) {
      const parent = rel === 'sibling' ? parentNode : rel === 'child' ? 'you' : childrenOf(t, 'you').sort((a, b) => a.born - b.born)[0]?.id;
      if (!parent || p.alive === false) continue;
      n = add(t, { id: `p_${p.id}`, name: p.firstName, gender: p.gender, born: y - (state.character.age + (p.ageOffset ?? 0)), parent, personId: p.id });
    }
    if (n && p.alive === false && !n.died) n.died = y;
  }
}

/** The relatives the game doesn't play: they grow old, have children, marry, die. */
function liveHouse(state) {
  const t = state.royal.tree;
  const rng = trng(t);
  const y = currentYear(state);
  for (const n of Object.values(t.nodes)) {
    if (n.you || n.died || n.block) continue;
    const age = y - (n.born ?? y);
    if (age < 0) continue;
    // Your brothers and sisters (real people in your life) live and die there; here they have children.
    if (n.personId || n.id === t.monarchId) {
      if (n.personId && n.parent !== 'you' && age >= 26 && age <= 42 && !n.out && childrenOf(t, n.id).length < 3 && rng.chance(0.12)) {
        const g = rng.chance(0.5) ? 'male' : 'female';
        add(t, { name: name(rng, CROWNS[state.royal.crownId] ?? {}, g, t), gender: g, born: y, parent: n.id });
      }
      continue;
    }
    const q = age < 50 ? 0.002 : age < 65 ? 0.01 : age < 75 ? 0.03 : age < 85 ? 0.08 : 0.2;
    if (rng.chance(q)) { n.died = y; continue; }
    // Japan: a princess who marries a commoner leaves the Imperial Family.
    if (state.royal.crownId === 'JP' && n.gender === 'female' && !n.out && age >= 24 && age <= 36 && rng.chance(0.12)) { n.out = 'married out of the Imperial Family'; continue; }
    if (age >= 25 && age <= 42 && !n.out && childrenOf(t, n.id).length < 3 && rng.chance(0.1)) {
      const g = rng.chance(0.5) ? 'male' : 'female';
      add(t, { name: name(rng, CROWNS[state.royal.crownId] ?? {}, g, t), gender: g, born: y, parent: n.id });
    }
  }
  // A big house's far reaches change slowly: a few births, a few deaths.
  for (const b of Object.values(t.nodes).filter((x) => x.block)) b.block = Math.max(1, b.block + rng.int(-1, 1));
}

/** The crown's heir and monarch as the line says. */
function syncCrown(state, order) {
  const r = state.royal;
  const t = r.tree;
  const c = state.world?.crowns?.[r.crownId];
  if (!c) return;
  const y = currentYear(state);
  const first = order[0];
  if (first && !first.block) {
    const person = first.personId ? (state.people?.list ?? []).find((p) => p.id === first.personId) : null;
    c.heir = { name: first.name, gender: first.gender, age: Math.max(0, y - (first.born ?? y)), relation: first.you ? 'you' : person?.relation ?? 'cousin', nodeId: first.id, ...(person ? { personId: person.id } : {}), ...(first.you ? { you: true } : {}) };
  }
  const m = t.nodes[t.monarchId];
  if (m && !m.you && !m.died) { c.monarch.name = m.name; c.monarch.gender = m.gender; c.monarch.age = Math.max(c.monarch.age ?? 0, y - (m.born ?? y)); }
}

/** After a demise (Crown.demise): the heir is now the monarch. */
export function treeDemise(state, heirNodeId) {
  const t = state.royal?.tree;
  if (!t) return;
  const old = t.nodes[t.monarchId];
  if (old && !old.died && !old.you) old.died = currentYear(state);
  if (old?.you) old.out = 'abdicated';
  if (heirNodeId && t.nodes[heirNodeId]) t.monarchId = heirNodeId;
}
/** You took the throne. */
export function treeAccede(state) {
  const t = state.royal?.tree;
  if (!t?.nodes?.you) return;
  const old = t.nodes[t.monarchId];
  if (old && !old.you && !old.died) old.died = currentYear(state);
  t.monarchId = 'you';
}
/** You renounced your rights (and your descendants'). */
export function treeRenounce(state) {
  const t = state.royal?.tree;
  if (t?.nodes?.you) t.nodes.you.out = 'renounced';
}

/** Rebuild the line: who's who this year, your place, the heir. */
export function refreshLine(state) {
  const r = state.royal;
  if (!r?.tree) return;
  // Reigning, whatever the tree last saw (an accession it missed): you are the monarch.
  if (r.reigning && r.tree.monarchId !== 'you' && r.tree.nodes.you) treeAccede(state);
  syncPeople(state);
  const order = lineOf(state);
  if (!r.reigning) r.line = placeOf(state, order);
  syncCrown(state, order);
}

export const RoyalLineModule = {
  id: 'royalLine',
  order: 33.55,
  init(state) {
    const r = state.royal;
    if (!r?.crownId || r.tree || !state.world?.crowns?.[r.crownId] || r.formerRoyal) return;
    r.tree = buildTree(state, (state.world?.seed ?? 7) + r.crownId.charCodeAt(0));
    if (r.tree) refreshLine(state);
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const r = state.royal;
    if (!r?.tree || !state.character.alive) return;
    const before = r.line;
    liveHouse(state);
    refreshLine(state);
    if (r.reigning || before == null || r.line == null || before === r.line) return;
    if (r.line === 1) ctx.log(`You are now first in line to the throne: heir to the ${CROWNS[r.crownId].titles.monarch[0] === 'King' ? 'throne' : 'crown'}.`, '👑', 'milestone');
    else if (r.line < before) ctx.log(`You moved up the line of succession to ${r.line}${ord(r.line)}.`, '👑', 'info');
    else ctx.log(`A birth in the family moved you down the line of succession to ${r.line}${ord(r.line)}.`, '👶', 'info');
  },
};
const ord = (n) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
