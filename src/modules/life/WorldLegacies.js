/**
 * The world your lives change, part two: the ten things a life can leave in the world for the lives
 * after it (docs/roadmaps/player-editable-world.md). All of it is kept with the world's history
 * (state.era, cloned to an heir), or on what the heir inherits (the farm, the seat, the rivals).
 *
 *   1 Places      a railway halt (1830–1960), a ship (from 1800), a settlement on the frontier or in a
 *                 colony, or a cape on the map for a first explorer: named after you.
 *   2 Institutions a hospital, a college or a newspaper you found: it lives on, growing in standing,
 *                 and the family keeps a seat on its board.
 *   3 Curriculum  as education minister or head of government, what the schools teach (the classics,
 *                 science, a trade, the faith, the nation); as a bishop, the church's rite. Children in
 *                 that country grow up with it.
 *   4 Firsts      a first ascent or a pole is the family's for good (no heir can be "first" again);
 *                 an Olympic world record stands until someone breaks it.
 *   5 Feuds       a bitter rival's family carries the grudge to your heirs.
 *   6 Milestones  bring the gas lamps, the railway, clean water or the electric light to your town
 *                 years early, as mayor or investor.
 *   7 Land        drain, clear, enclose or irrigate the farm: the improved acres pass to the heir.
 *   8 The paper   your newspaper's name and its politics (party, independent).
 *   9 Memorials   the town's war memorial carries the names of its dead, yours and your family's.
 *  10 The seat    name the family seat (Hall, Manor, Court, Grange, Villa, Ranch...).
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow, colonyHere } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { regimeHere } from '../world/Regimes.js';
import { REGIONS } from './Regions.js';
import { ensureCity } from './Cities.js';
import { addBuzz } from './Fame.js';
import { MILESTONES, dueYear } from './TownStory.js';
import { OFFICES } from '../politics/Offices.js';

const era = (state) => (state.era ??= {});
const y0 = (state) => yearNow(state);
const cc = (state) => state.character.countryId ?? 'US';
const surname = (state) => state.character.lastName ?? state.character.firstName;
const by = (state) => `${state.character.firstName} ${state.character.lastName ?? ''}`.trim();
const gen = (state) => state.lineage?.generation ?? 1;
const town = (state) => (REGIONS[state.character.regionId]?.name ?? 'the town').split(',')[0];
const SCALE = (y) => (y < 1914 ? 0.4 : y < 1950 ? 0.6 : 1);
const cost = (state, usd) => Math.round(usd * priceLevel(state) * SCALE(y0(state)) / 100) * 100;
const planned = (state) => regimeHere(state)?.business === 'state';
const rngOf = (state, salt = 0) => new Random(((state.world?.seed ?? 5) * 3266489917 + state.character.age * 29 + salt) >>> 0);
const FRONTIER = ['US', 'CA', 'AU', 'NZ', 'AR', 'BR', 'ZA', 'CL', 'RU'];

/* ---------- 1 Places ---------- */
export const PLACES = {
  halt: { icon: '🚉', label: 'A railway halt named after you', from: 1830, until: 1960, cost: 120000, name: (n) => `${n} Halt` },
  ship: { icon: '🚢', label: 'Launch a ship in your name', from: 1800, cost: 400000, name: (n) => `the SS ${n}`, nameFor: (y, n) => (y < 1850 ? `the ${n}` : `the SS ${n}`) },
  settlement: { icon: '🏕️', label: 'Found a settlement on the frontier', from: 1800, until: 1910, cost: 60000, name: (n) => `${n}ville`, where: (state) => FRONTIER.includes(cc(state)) || Boolean(colonyHere(state)) },
};
export function placeCheck(state, kind) {
  const p = PLACES[kind];
  const y = y0(state);
  if (!p) return 'No such place';
  if (state.character.age < 21) return 'From 21';
  if (planned(state)) return 'Not here';
  if (y < p.from || (p.until && y >= p.until)) return 'Not of its day';
  if (p.where && !p.where(state)) return 'No frontier here';
  if ((era(state).marks ?? []).some((m) => m.kind === `place.${kind}` && m.gen === gen(state))) return 'You have one already';
  if (state.finances.cash < cost(state, p.cost)) return 'Not enough cash';
  return null;
}
function addMark(state, kind, title, extra = {}) {
  const m = { id: `mark_${(era(state).marks?.length ?? 0) + 1}_${state.character.age}_${kind}`, kind, title, regionId: state.character.regionId, cc: cc(state), year: y0(state), by: by(state), gen: gen(state), ...extra };
  (era(state).marks ??= []).push(m);
  return m;
}

/* ---------- 2 + 8 Institutions (and the paper) ---------- */
export const INSTITUTIONS = {
  hospital: { icon: '🏥', label: 'Found a hospital', from: 1800, cost: 2000000, name: (n, y) => (y < 1900 ? `the ${n} Infirmary` : `the ${n} Hospital`) },
  college: { icon: '🎓', label: 'Found a college', from: 1800, cost: 3000000, name: (n) => `${n} College` },
  newspaper: { icon: '📰', label: 'Found a newspaper', from: 1800, cost: 500000, name: (n, y, t) => `the ${t} ${rngPick(['Courier', 'Gazette', 'Herald', 'Chronicle', 'Advertiser', 'Times'], n)}` },
};
const rngPick = (arr, seed) => arr[[...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0) % arr.length];
export const PAPER_LINES = { independent: 'Independent', left: 'Radical / Labour', right: 'Conservative', liberal: 'Liberal' };
export const institutionsHere = (state) => (state.era?.institutions ?? []).filter((i) => i.cc === cc(state));
export function institutionCheck(state, kind) {
  const k = INSTITUTIONS[kind];
  if (!k) return 'No such institution';
  if (state.character.age < 25) return 'From 25';
  if (planned(state)) return 'Private foundations are not allowed here';
  if (kind === 'newspaper' && regimeHere(state)?.press === 'state') return 'The press belongs to the state here';
  if ((state.era?.institutions ?? []).some((i) => i.kind === kind && i.regionId === state.character.regionId)) return `${town(state)} already has one of yours`;
  if (state.finances.cash < cost(state, k.cost)) return 'Not enough cash';
  return null;
}

/* ---------- 3 Curriculum and rite ---------- */
export const CURRICULA = {
  classics: { label: '🏛️ The classics', note: 'Latin, Greek, the great books', fx: { smarts: 1 } },
  science: { label: '🔬 Science and mathematics', note: 'Laboratories in every school', fx: { smarts: 2 } },
  trade: { label: '🔧 A trade for every child', note: 'Workshops and apprenticeships', fx: { fitness: 1 } },
  faith: { label: '⛪ Faith and morals', note: 'Religious instruction every day', fx: { happiness: 1 } },
  nation: { label: '🏳️ The nation\'s history', note: 'Flag, anthem, heroes', fx: { happiness: 1 } },
};
export const RITES = { traditional: '🕯️ Keep the old rite', vernacular: '🗣️ The service in the people\'s language', simple: '🪵 A plainer, simpler worship' };
export function canSetCurriculum(state) {
  const m = state.politics?.ministry;
  if (m?.dept === 'education' && m.rank === 'cabinet') return true;
  const o = state.politics?.office;
  return Boolean(o && (OFFICES[o.id]?.level ?? 0) >= 6);
}
export const isBishop = (state) => /bishop|archbishop|cardinal|patriarch|metropolitan|pope/i.test(state.career?.job?.title ?? '') && /clergy|jesuit|holySee/i.test(state.career?.job?.professionId ?? '');

/* ---------- 4 Firsts and records ---------- */
export const firstsOf = (state) => state.era?.firsts ?? [];
export const familyFirst = (state, id) => firstsOf(state).find((f) => f.id === id) ?? null;
export const recordsOf = (state) => state.era?.records ?? [];

/* ---------- 7 Land ---------- */
export const IMPROVEMENTS = {
  enclose: { icon: '🌿', label: 'Hedge and enclose the fields', from: 1800, until: 1880, per: 8, gain: 0.08, where: ['GB', 'IE'] },
  clear: { icon: '🪓', label: 'Clear the woodland and scrub', from: 1800, until: 1950, per: 30, gain: 0.12 },
  drain: { icon: '🕳️', label: (y) => (y >= 1850 ? 'Lay tile drains in the wet fields' : 'Dig drainage ditches'), from: 1800, per: 25, gain: 0.1 },
  irrigate: { icon: '💧', label: (y) => (y >= 1950 ? 'Put in centre-pivot irrigation' : 'Dig irrigation channels'), from: 1850, per: 60, gain: 0.18 },
  terrace: { icon: '⛰️', label: 'Terrace the hillsides', from: 1800, until: 1950, per: 40, gain: 0.1 },
};
export const improvementLabel = (k, y) => (typeof IMPROVEMENTS[k].label === 'function' ? IMPROVEMENTS[k].label(y) : IMPROVEMENTS[k].label);
export function improvementsNow(state) {
  const f = state.farm;
  const y = y0(state);
  if (!f?.acres) return [];
  return Object.entries(IMPROVEMENTS).filter(([id, k]) => y >= k.from && !(k.until && y >= k.until) && (!k.where || k.where.includes(cc(state))) && !(f.improvements ?? []).some((x) => x.id === id))
    .map(([id, k]) => ({ id, icon: k.icon, label: improvementLabel(id, y), cost: cost(state, k.per * f.acres * 4) }));
}

/* ---------- 6 Milestones early ---------- */
export function earlyMilestones(state) {
  const regionId = state.character.regionId;
  if (!REGIONS[regionId]) return [];
  const seen = state.world?.townStory?.[regionId] ?? {};
  const y = y0(state);
  const pull = state.politics?.office && /mayor|provost|burgomaster/i.test(OFFICES[state.politics.office.id]?.name ?? '');
  return MILESTONES.filter((m) => ['gas', 'railway', 'water', 'electric', 'trams'].includes(m.id) && !seen[m.id] && !(m.needs && !seen[m.needs]))
    .map((m) => ({ m, due: dueYear(m, regionId, cc(state)) }))
    .filter(({ due, m }) => due != null && due > y && due - y <= 15 && y >= ({ gas: 1812, railway: 1830, water: 1850, electric: 1882, trams: 1870 })[m.id])
    .map(({ m, due }) => ({ id: m.id, icon: m.icon, due, cost: cost(state, (pull ? 0.5 : 1) * ({ gas: 150000, railway: 900000, water: 600000, electric: 500000, trams: 300000 })[m.id]) }));
}

/* ---------- 10 The seat ---------- */
export function seatNames(state) {
  const n = surname(state);
  const c = cc(state);
  const y = y0(state);
  if (['US', 'AR', 'BR', 'AU', 'CA'].includes(c) && y < 1950) return [`the ${n} Ranch`, `${n} Place`, `the ${n} Homestead`];
  if (['FR'].includes(c)) return [`Château ${n}`, `le Domaine ${n}`, `la Maison ${n}`];
  if (['DE', 'AT'].includes(c)) return [`Schloss ${n}`, `Gut ${n}`, `Haus ${n}`];
  if (['IT'].includes(c)) return [`Villa ${n}`, `Palazzo ${n}`, `Casa ${n}`];
  if (['ES', 'MX', 'CL', 'PE', 'CO'].includes(c)) return [`la Hacienda ${n}`, `la Casa ${n}`, `la Quinta ${n}`];
  return [`${n} Hall`, `${n} Manor`, `${n} Court`, `${n} Grange`, `${n} House`];
}

/* ---------- 5 Feuds: what the heirs inherit (Legacy.js) ---------- */
export function inheritedRivals(old) {
  return (old.rivals ?? []).filter((r) => r.alive !== false && !r.friend && (r.grudge ?? 0) >= 60).slice(0, 2).map((r) => {
    const last = r.name.split(' ').slice(-1)[0];
    return { id: `riv_family_${r.id}`, name: `the ${last} family`, gender: r.gender, origin: 'family', ageOffset: 0, grudge: Math.round(r.grudge * 0.6), rung: r.rung ?? 1, field: r.field ?? 'business', wealth: r.wealth ?? 20000, fame: 0, married: true, kids: 2, alive: true, friend: false, history: [`Your ${old.character.gender === 'female' ? 'mother' : 'father'}'s feud with ${r.name}`] };
  });
}

/* ---------- 9 Memorials ---------- */
const WAR_DEATH = /killed in action|died of wounds|lost at sea|missing in action|fell at|lost with the/i;
export const memorialsHere = (state) => (state.era?.memorials ?? []).filter((m) => m.regionId === state.character.regionId);
function memorialise(state, name, cause, rel) {
  const list = (era(state).memorials ??= []);
  if (list.some((m) => m.name === name && m.cause === cause)) return;
  list.push({ regionId: state.character.regionId, name, cause, year: y0(state), rel });
}

export const WorldLegaciesModule = {
  id: 'worldLegacies',
  order: 96.8,
  setup(engine) {
    engine.bus.on('death', (state) => { if (WAR_DEATH.test(state.character.causeOfDeath ?? '')) memorialise(state, by(state), state.character.causeOfDeath, 'self'); });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive) return;
    const y = y0(state);
    // 9: the family's war dead go on the town memorial.
    for (const p of state.people?.list ?? []) if (p.alive === false && WAR_DEATH.test(p.causeOfDeath ?? '') && !p.memorial) { p.memorial = true; memorialise(state, `${p.firstName} ${p.lastName ?? ''}`.trim(), p.causeOfDeath, p.relation); ctx.log(`${p.firstName}'s name was carved on the war memorial in ${town(state)}.`, '🪦', 'info'); }
    // 2: the family's institutions grow and pay their trustees.
    for (const i of state.era?.institutions ?? []) {
      if (i.lastYear === y) continue;
      i.lastYear = y;
      i.rep = clamp((i.rep ?? 30) + rngOf(state, i.founded).int(-1, 3), 0, 100);
      if (i.cc === cc(state) && state.character.age >= 21 && i.board !== false) ctx.earn(Math.round(cost(state, 4000) * (1 + i.rep / 50)), `Trustee of ${i.name}`, {});
    }
    // 3: children grow up with the curriculum of the day.
    const cur = state.era?.curriculum?.[cc(state)];
    if (cur && state.character.age >= 6 && state.character.age <= 17) for (const [k, v] of Object.entries(CURRICULA[cur.emphasis]?.fx ?? {})) ctx.stat(k, v);
    // 4: records stand until broken.
    const sp = state.sport;
    for (const o of sp?.olympics ?? []) {
      if (o.place !== 1 || o.recordChecked) continue;
      o.recordChecked = true;
      if (!o.doped && rngOf(state, o.year).chance(0.35)) {
        (era(state).records ??= []).push({ discipline: sp.discipline ?? 'athletics', by: by(state), year: o.year, gen: gen(state) });
        ctx.log(`Your winning time at ${o.city ?? 'the Games'} was a new world record.`, '⏱️', 'milestone');
      }
    }
    for (const r of state.era?.records ?? []) if (!r.broken && y - r.year >= 3 && rngOf(state, r.year * 7).chance(0.08)) { r.broken = y; if (r.gen !== gen(state)) ctx.log(`${r.by}'s world record from ${r.year} has finally been broken.`, '⏱️', 'info'); }
    // 4: a first is the family's (Feats.js).
    for (const e of state.feats?.expeditions ?? []) if (e.first && !familyFirst(state, e.id)) {
      (era(state).firsts ??= []).push({ id: e.id, by: by(state), year: e.year, gen: gen(state) });
      addMark(state, 'place.cape', `Cape ${surname(state)}`);
    }
  },
  actions: {
    place(ctx, kind) {
      const { state } = ctx;
      const why = placeCheck(state, kind);
      if (why) return ctx.toast(why, 'warn');
      const p = PLACES[kind];
      const y = y0(state);
      ctx.spend(cost(state, p.cost), p.label, { credit: false });
      const title = p.nameFor ? p.nameFor(y, surname(state)) : p.name(surname(state));
      addMark(state, `place.${kind}`, title);
      addBuzz(state, 3);
      return ctx.log(kind === 'ship' ? `${title} slid down the slipway to cheers.` : kind === 'halt' ? `The trains now stop at ${title}.` : `${title} was laid out: a store, a church, and lots for sale.`, p.icon, 'milestone');
    },
    found(ctx, kind) {
      const { state } = ctx;
      const why = institutionCheck(state, kind);
      if (why) return ctx.toast(why, 'warn');
      const k = INSTITUTIONS[kind];
      const y = y0(state);
      ctx.spend(cost(state, k.cost), k.label, { credit: false });
      const i = { id: `inst_${kind}_${y}`, kind, name: k.name(surname(state), y, town(state)), regionId: state.character.regionId, cc: cc(state), founded: y, by: by(state), gen: gen(state), rep: 30, politics: kind === 'newspaper' ? 'independent' : undefined };
      (era(state).institutions ??= []).push(i);
      const c = ensureCity(state, state.character.regionId);
      if (kind === 'hospital') c.mood = Math.min(100, (c.mood ?? 50) + 3);
      if (kind === 'college') c.jobs = Math.min(100, (c.jobs ?? 50) + 3);
      addBuzz(state, 5);
      return ctx.log(`${i.name[0].toUpperCase()}${i.name.slice(1)} opened its doors. The family will sit on its board for as long as it stands.`, k.icon, 'milestone');
    },
    /** arg: 'instId|line' */
    paperLine(ctx, arg) {
      const [id, line] = String(arg).split('|');
      const i = (ctx.state.era?.institutions ?? []).find((x) => x.id === id && x.kind === 'newspaper');
      if (!i || !PAPER_LINES[line]) return undefined;
      i.politics = line;
      if (line !== 'independent' && ctx.state.politics) ctx.state.politics.recognition = Math.min(100, (ctx.state.politics.recognition ?? 0) + 3);
      return ctx.log(`${i.name[0].toUpperCase()}${i.name.slice(1)} is now ${line === 'independent' ? 'an independent paper' : `a ${PAPER_LINES[line]} paper`}.`, '📰', 'info');
    },
    renamePaper(ctx, id) {
      const { state } = ctx;
      const i = (state.era?.institutions ?? []).find((x) => x.id === id && x.kind === 'newspaper');
      if (!i) return undefined;
      const opts = ['Courier', 'Gazette', 'Herald', 'Chronicle', 'Advertiser', 'Times', 'Mercury', 'Post', 'Clarion', 'Sentinel'];
      const cur = opts.findIndex((o) => i.name.endsWith(o));
      i.name = `the ${town(state)} ${opts[(cur + 1) % opts.length]}`;
      return ctx.log(`The masthead now reads ${i.name}.`, '📰', 'info');
    },
    curriculum(ctx, id) {
      const { state } = ctx;
      if (!canSetCurriculum(state)) return ctx.toast('As education minister or head of government', 'warn');
      if (!CURRICULA[id]) return undefined;
      (era(state).curriculum ??= {})[cc(state)] = { emphasis: id, year: y0(state), by: by(state) };
      return ctx.log(`The schools will teach ${CURRICULA[id].label.slice(3).toLowerCase()}: ${CURRICULA[id].note.toLowerCase()}. A generation will grow up with it.`, '🏫', 'good');
    },
    rite(ctx, id) {
      const { state } = ctx;
      if (!isBishop(state)) return ctx.toast('As a bishop', 'warn');
      if (!RITES[id]) return undefined;
      (era(state).rites ??= {})[cc(state)] = { rite: id, year: y0(state), by: by(state) };
      return ctx.log(`${RITES[id].slice(3)}: your ruling is read in every parish.`, '⛪', 'good');
    },
    bring(ctx, id) {
      const { state } = ctx;
      const opt = earlyMilestones(state).find((o) => o.id === id);
      if (!opt) return ctx.toast('Not possible here now', 'warn');
      if (!ctx.spend(opt.cost, 'Bringing it to town early', { credit: false })) return ctx.toast('Not enough cash', 'warn');
      const m = MILESTONES.find((x) => x.id === id);
      const regionId = state.character.regionId;
      state.world.townStory ??= {};
      (state.world.townStory[regionId] ??= {})[id] = { year: y0(state), yours: true, brought: true };
      const c = ensureCity(state, regionId);
      for (const [k, v] of Object.entries(m.fx ?? {})) c[k] = Math.max(0, Math.min(k === 'pop' || k === 'prices' ? 400 : 100, Math.round((c[k] ?? 50) + v)));
      addMark(state, 'milestone', `${m.id === 'railway' ? 'the railway' : m.id === 'gas' ? 'gas lighting' : m.id === 'water' ? 'clean water' : m.id === 'trams' ? 'the trams' : 'electric light'} in ${town(state)}, ${opt.due - y0(state)} years early`);
      addBuzz(state, 3);
      return ctx.log(`${m.text(town(state), false, cc(state))} It came ${opt.due - y0(state)} years sooner than it would have, because of you.`, m.icon, 'milestone');
    },
    improve(ctx, id) {
      const { state } = ctx;
      const opt = improvementsNow(state).find((o) => o.id === id);
      if (!opt) return ctx.toast('Not possible here now', 'warn');
      if (!ctx.spend(opt.cost, opt.label, { credit: false })) return ctx.toast('Not enough cash', 'warn');
      const f = state.farm;
      (f.improvements ??= []).push({ id, year: y0(state), by: by(state) });
      f.valuePerAcre = Math.round((f.valuePerAcre ?? 0) * (1 + IMPROVEMENTS[id].gain));
      return ctx.log(`${opt.label}: the land is better for it, and will be for your children.`, opt.icon, 'good');
    },
    nameSeat(ctx, name) {
      const { state } = ctx;
      const seat = state.dynasty?.seat;
      if (!seat) return ctx.toast('No family seat yet', 'warn');
      if (!seatNames(state).includes(name)) return undefined;
      seat.name = name;
      seat.named = true;
      return ctx.log(`The house is ${name} now; the name is carved over the gate.`, '🏰', 'good');
    },
  },
};
