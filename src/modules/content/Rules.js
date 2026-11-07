/**
 * The rule language content packs are written in: conditions and effects as plain data,
 * turned into the event shape the game already plays (LifeEvents.js).
 *
 * Conditions (`when`), all must hold:
 *   age: [min, max]            country: ['GB', 'IE'] | { not: ['US'] }
 *   job: true|false | { field: /regex/ or 'text', profession: 'id', minGrade: n }
 *   partner, married, kids, minorKids, homeowner, student, business: true|false
 *   cash: [min, max]           stat: { smarts: [min, max] }      skill: { cooking: min }
 *   rep: { work: [min, max] }  flag: 'name' | { name: value }     noFlag: 'name'
 *   economy: 'recession' | ['peak', 'expansion']                  free: false (allowed in prison)
 *   test: (state) => boolean   — the escape hatch, for JS packs only
 *
 * Effects (an object; every key optional), applied in order:
 *   stat: { happiness: 3 }     earn: n | [min, max] (+ source)    spend: n (+ reason)
 *   cash: n (a gift, untaxed)  job: { performance: d, salary: pct }
 *   rep: { work: d }           skill: { cooking: d }              flag: { name: value }
 *   relation: { partner: d, kids: d, parents: d, siblings: d }
 *   injury: 'conditionId' | { id, severity }                      offense: { id, discovery, evidence, context }
 *   plant: { id, years }       news: { headline, tier, weight }   log: 'text' (or [variants])
 *   run: (ctx) => text         — the escape hatch
 *
 * Options may branch: { check: { skill|stat: id, difficulty } | { chance: p }, pass: effect, fail: effect }.
 * Text anywhere may be an array of variants; one is chosen each time.
 */
import { isIncarcerated } from '../../core/State.js';
import { rep } from '../life/Reputation.js';
import { practise, skill as skillOf } from '../life/Skills.js';
import { partnerOf, spouseOf, livingChildren, minorChildren, parentsOf, living, clampRel } from '../people/People.js';

const inRange = (v, r) => !r || (v >= (r[0] ?? -Infinity) && v <= (r[1] ?? Infinity));
const pickText = (rng, t) => (Array.isArray(t) ? (rng ? rng.pick(t) : t[0]) : t);
const matches = (pattern, value) => (pattern instanceof RegExp ? pattern.test(value ?? '') : String(value ?? '').toLowerCase().includes(String(pattern).toLowerCase()));

/** Does the state meet the conditions? */
export function test(state, when = {}) {
  const c = state.character;
  if (when.free !== false && isIncarcerated(state)) return false;
  if (!inRange(c.age, when.age)) return false;
  const cc = c.countryId ?? 'US';
  if (when.country && (Array.isArray(when.country) ? !when.country.includes(cc) : when.country.not?.includes(cc))) return false;
  const job = state.career?.job;
  if (when.job === true && !job) return false;
  if (when.job === false && job) return false;
  if (when.job && typeof when.job === 'object') {
    if (!job) return false;
    if (when.job.field && !matches(when.job.field, job.professionId)) return false;
    if (when.job.profession && job.professionId !== when.job.profession) return false;
    if (when.job.minGrade && (job.grade ?? 0) < when.job.minGrade) return false;
  }
  const flags = {
    partner: Boolean(partnerOf(state)), married: Boolean(spouseOf(state)), kids: livingChildren(state).length > 0, minorKids: minorChildren(state).length > 0,
    homeowner: (state.housing?.properties ?? []).some((p) => p.use === 'primary'), student: Boolean(state.education?.enrolled), business: Boolean(state.business?.current),
  };
  for (const [k, v] of Object.entries(flags)) if (when[k] !== undefined && when[k] !== v) return false;
  if (!inRange(state.finances?.cash ?? 0, when.cash)) return false;
  for (const [k, r] of Object.entries(when.stat ?? {})) if (!inRange(state.stats[k] ?? 0, r)) return false;
  for (const [k, min] of Object.entries(when.skill ?? {})) if (skillOf(state, k) < min) return false;
  for (const [k, r] of Object.entries(when.rep ?? {})) if (!inRange(state.reputation?.[k] ?? 50, r)) return false;
  if (when.flag) {
    const want = typeof when.flag === 'string' ? { [when.flag]: true } : when.flag;
    for (const [k, v] of Object.entries(want)) if ((state.flags?.[k] ?? false) !== v) return false;
  }
  if (when.noFlag && state.flags?.[when.noFlag]) return false;
  if (when.economy && ![].concat(when.economy).includes(state.economy?.phase)) return false;
  if (when.test && !when.test(state)) return false;
  return true;
}

/** Apply an effect; returns the text to log (if any). */
export function apply(ctx, effect = {}) {
  const { state, rng } = ctx;
  for (const [k, v] of Object.entries(effect.stat ?? {})) ctx.stat(k, v);
  if (effect.earn != null) ctx.earn(Array.isArray(effect.earn) ? rng.int(effect.earn[0], effect.earn[1]) : effect.earn, effect.source ?? 'Windfall');
  if (effect.spend != null) ctx.spend(Array.isArray(effect.spend) ? rng.int(effect.spend[0], effect.spend[1]) : effect.spend, effect.reason ?? 'Expense', { credit: true });
  if (effect.cash != null) state.finances.cash += Array.isArray(effect.cash) ? rng.int(effect.cash[0], effect.cash[1]) : effect.cash;
  const job = state.career?.job;
  if (job && effect.job) {
    if (effect.job.performance) job.performance = Math.max(0, Math.min(100, (job.performance ?? 50) + effect.job.performance));
    if (effect.job.salary) job.salary = Math.round(job.salary * (1 + effect.job.salary));
  }
  for (const [k, d] of Object.entries(effect.rep ?? {})) rep(ctx, k, d, effect.why ?? '');
  for (const [k, d] of Object.entries(effect.skill ?? {})) practise(state, k, d);
  for (const [k, v] of Object.entries(effect.flag ?? {})) (state.flags ??= {})[k] = v;
  const rel = effect.relation ?? {};
  const bump = (p, d) => { if (p) p.relationship = clampRel(p.relationship + d); };
  if (rel.partner) bump(partnerOf(state), rel.partner);
  if (rel.kids) livingChildren(state).forEach((p) => bump(p, rel.kids));
  if (rel.parents) parentsOf(state).filter((p) => p.alive).forEach((p) => bump(p, rel.parents));
  if (rel.siblings) living(state).filter((p) => p.relation === 'sibling').forEach((p) => bump(p, rel.siblings));
  if (effect.injury) { const i = typeof effect.injury === 'string' ? { id: effect.injury } : effect.injury; ctx.emit('health:injury', { conditionId: i.id, severity: i.severity ?? 30 }); }
  if (effect.offense) ctx.emit('legal:offense', { offenseId: effect.offense.id, context: effect.offense.context ?? '', discovery: effect.offense.discovery ?? 0.2, evidence: effect.offense.evidence ?? 0.6 });
  if (effect.plant) state.eventSeeds = [...(state.eventSeeds ?? []), { id: effect.plant.id, dueAge: state.character.age + effect.plant.years }];
  if (effect.news) ctx.emit('news:story', { tier: effect.news.tier ?? 'local', headline: effect.news.headline, weight: effect.news.weight ?? 3, icon: effect.news.icon ?? '📰', you: true });
  const ran = effect.run ? effect.run(ctx) : '';
  return [pickText(rng, effect.log), ran].filter(Boolean).join(' ');
}

/** Odds a check succeeds. */
export function checkChance(state, check) {
  if (check.chance != null) return check.chance;
  const d = check.difficulty ?? 50;
  if (check.skill) return Math.max(0.05, Math.min(0.95, 0.5 + (skillOf(state, check.skill) - d) / 80));
  if (check.stat) return Math.max(0.05, Math.min(0.95, 0.5 + ((state.stats[check.stat] ?? 50) - d) / 100));
  return 0.5;
}

/** Turn a pack event into the shape LifeEvents plays. */
export function compileEvent(def) {
  const resolver = (o) => (ctx) => {
    // Shared effects first, then the branch a check picks.
    const { id: _id, label: _label, tone: _tone, check, pass, fail, ...base } = o.effect ?? o;
    const shared = apply(ctx, base);
    if (!check) return shared;
    const branch = ctx.rng.chance(checkChance(ctx.state, check)) ? apply(ctx, pass ?? {}) : apply(ctx, fail ?? {});
    return [shared, branch].filter(Boolean).join(' ');
  };
  const ev = {
    id: def.id, title: def.title, icon: def.icon, followUp: def.followUp ?? false, pack: true,
    minAge: def.when?.age?.[0], maxAge: def.when?.age?.[1],
    when: (state) => test(state, def.when),
    text: def.text,
    weight: def.weight,
  };
  if (def.run) {
    // A log-only event: [icon, text, kind].
    ev.run = (ctx) => [def.icon ?? '•', apply(ctx, def.run), def.kind ?? 'info'];
  } else {
    ev.options = def.options.map((o) => ({ id: o.id, label: o.label, tone: o.tone, resolve: resolver(o) }));
  }
  return ev;
}

/** Problems with a pack event's definition (empty when valid). */
export function validateEvent(def, { ids = new Set() } = {}) {
  const p = [];
  if (!def.id) p.push('missing id');
  if (ids.has(def.id)) p.push(`duplicate id ${def.id}`);
  if (!def.title && !def.run) p.push(`${def.id}: missing title`);
  if (!def.run && !(def.options?.length >= 1)) p.push(`${def.id}: needs options or run`);
  if (def.run && def.options) p.push(`${def.id}: run and options are exclusive`);
  for (const o of def.options ?? []) {
    if (!o.id || !o.label) p.push(`${def.id}: option missing id or label`);
    if (o.check && (!o.pass || !o.fail)) p.push(`${def.id}.${o.id}: a check needs pass and fail`);
  }
  const KNOWN = ['age', 'country', 'job', 'partner', 'married', 'kids', 'minorKids', 'homeowner', 'student', 'business', 'cash', 'stat', 'skill', 'rep', 'flag', 'noFlag', 'economy', 'free', 'test'];
  for (const k of Object.keys(def.when ?? {})) if (!KNOWN.includes(k)) p.push(`${def.id}: unknown condition ${k}`);
  return p;
}
