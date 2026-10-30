/**
 * Lives abroad, scanned for US leftovers: every foreign country, random careers,
 * every screen rendered through the country's display swaps, plus prompts and
 * the life story, checked for US-only institutions, programs and words.
 *
 *   node tests/abroad.js [livesPerCountry=4] [seed=1]
 */
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { COUNTRIES, localizeHtml } from '../src/modules/world/Countries.js';
import { professionsFor, PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { VIEWS, Renderer } from '../src/ui/Renderer.js';
import { tombstone } from '../src/ui/Components.js';
import { makePerson } from '../src/modules/people/PeopleEngine.js';
import { usLeftovers } from './usTerms.js';

const PER = Number(process.argv[2] ?? 4);
const SEED = Number(process.argv[3] ?? 1);
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };


const problems = new Map();
const flag = (msg, where) => { if (!problems.has(msg)) problems.set(msg, where); };
const scan = (cc, text, where, seen, also = null) => {
  if (!text || seen.has(text)) return;
  seen.add(text);
  // A life that emigrated reads its new country's words too ("GT @28": living in Guatemala),
  // and the year it moved, the old country's (`also`).
  const here = also ?? /^([A-Z]{2}) @/.exec(where ?? '')?.[1];
  const there = here && here !== cc ? new Set(usLeftovers(here, text).map((m) => m.slice(3))) : null;
  for (const msg of usLeftovers(cc, text)) if (!there || there.has(msg.slice(3))) flag(msg, where);
};
/** Text as the screen shows it: through the country's money and word swaps. */
const shown = (text, country) => localizeHtml(`<p>${text}</p>`, country).slice(3, -4);
const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');

let careers = 0;
function life(cc, seed) {
  const rng = new Random(seed * 7919);
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, gender: rng.pick(['male', 'female']) });
  const ctx = engine.context();
  const seen = new Set();
  // Scanned against the country you live in now (a life can emigrate along the way).
  const here = () => state.character.countryId ?? cc;
  const countryNow = () => COUNTRIES[here()];
  const tryDo = (fn, where) => { try { fn(); } catch (e) { flag(`threw: ${e.message.split('\n')[0]}`, `${where}\n${e.stack.split('\n').slice(1, 4).join('\n')}`); } };
  const solve = () => { for (let g = 0; g < 15 && state.prompts.length; g++) { const pr = state.prompts[0]; const opts = pr.options.filter((o) => !o.disabled && o.id !== 'cancel'); engine.resolvePrompt(pr.id, rng.pick(opts.length ? opts : pr.options).id); } };
  const render = (where) => tryDo(() => {
    // (The move screen lists every other country, base included.)
    for (const [name, view] of Object.entries(VIEWS).filter(([n]) => n !== 'move')) {
      const text = strip(localizeHtml(view(state, {}), countryNow()));
      for (const chunk of text.split(/(?<=[.!?])\s|\s{2,}/)) scan(here(), chunk, `${where} ${name} view`, seen);
    }
  }, `render ${where}`);
  let lastCountry = here();
  while (state.character.alive && state.character.age < 70) {
    const age = state.character.age;
    if (age === 22 && state.character.alive) {
      state.education.degrees.push({ type: 'highschool', programId: 'highschool', major: null, year: 18 }, { type: 'bachelor', programId: 'bachelor', major: rng.pick(['business', 'criminalJustice', 'nursing', 'education']), year: 22 });
      const jobs = professionsFor(state).filter((p) => p.sector !== 'private' || rng.chance(0.1));
      const prof = PROFESSIONS[rng.pick(jobs).id] ?? rng.pick(jobs);
      tryDo(() => {
        const employer = createEmployer(rng, state, prof, state.character.regionId);
        const level = prof.levels.find((l) => l.entry) ?? prof.levels[0];
        if (hire(ctx, { professionId: prof.id, levelId: level.id, employer })) careers += 1;
        const job = state.career.job;
        if (job) scan(here(), `${job.title} at ${job.employer.name}`, `${cc} hire ${prof.id}`, seen);
      }, `hire ${cc} ${prof.id}`);
    }
    // The newer systems: a hobby practised every year, a child to raise, a power of attorney.
    if (age === 16) tryDo(() => engine.dispatch('hobbies.take', rng.pick(['guitar', 'running', 'painting', 'chess'])), `hobby ${cc}`);
    if (age >= 16) tryDo(() => { for (const id of Object.keys(state.hobbies ?? {})) { engine.dispatch('hobbies.practise', id); engine.dispatch('hobbies.compete', id); } }, `hobby ${cc} @${age}`);
    if (age === 30) tryDo(() => { state.people.list.push(makePerson(ctx, { relation: 'child', age: 1, relationship: 80, custody: 'you' })); engine.dispatch('parenting.style', 'authoritative'); }, `child ${cc}`);
    if (age === 60) tryDo(() => engine.dispatch('laterLife.poa', 'professional'), `poa ${cc}`);
    if (age % 7 === 0 && age >= 18) render(`${cc} @${age} seed ${seed}`);
    tryDo(() => { state.prompts = []; engine.ageUp(); }, `ageUp ${cc} @${age} seed ${seed}`);
    for (const p of state.prompts) scan(here(), shown([p.title, p.text, ...p.options.map((o) => `${o.label} ${o.hint ?? ''}`)].join(' | '), countryNow()), `${cc} prompt ${p.type} @${age}`, seen);
    tryDo(solve, `solve ${cc} @${age}`);
    // Each year's log is checked against the country it was written in (last year's, if you've just moved).
    const blocks = state.log.slice(-2);
    blocks.forEach((block, i) => {
      const where = i === blocks.length - 1 ? here() : lastCountry;
      const moved = i === blocks.length - 1 && lastCountry && lastCountry !== where ? lastCountry : null;
      for (const e of block.entries ?? []) if (typeof e?.text === 'string') scan(where, shown(e.text, COUNTRIES[where]), `${cc} log @${state.character.age} seed ${seed}`, seen, moved);
    });
    lastCountry = here();
  }
  render(`${cc} end seed ${seed}`);
  // The death screen: as if this life ended now (with a spell in the army, so the service is named).
  tryDo(() => {
    if (!state.military.history.length) state.military.history.push({ branch: 'army', nation: here(), track: 'enlisted', rankCode: 'E-4', rankTitle: 'Corporal', yearsOfService: 4, discharge: 'honorable' });
    state.character.causeOfDeath ??= 'old age';
    const html = tombstone(Renderer.prototype.obituary.call({ ui: {} }, state));
    for (const chunk of strip(localizeHtml(html, countryNow())).split(/(?<=[.!?])\s|\s{2,}/)) scan(here(), chunk, `${cc} death screen seed ${seed}`, seen);
  }, `death screen ${cc}`);
}


const countries = ONLY ?? Object.keys(COUNTRIES).filter((cc) => cc !== 'US');
for (const cc of countries) for (let i = 0; i < PER; i++) life(cc, SEED * 100 + i);
if (problems.size) {
  for (const [msg, where] of problems) console.log(`  ✘ ${msg}\n      ${String(where).split('\n').join('\n      ')}`);
  console.log(`\n${problems.size} distinct problem(s)`);
  process.exit(1);
}
console.log(`✔ Lives abroad passed — ${countries.length} countries, ${PER * countries.length} lives, ${careers} careers, no US leftovers`);
