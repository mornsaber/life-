/**
 * Weirdness audit: play thousands of lives across countries and centuries, and flag the
 * contradictions a player would notice — a mother eleven years older than you, a spouse who is
 * dead, a credit card in 1931, "undefined" in the life story, a view that throws.
 *
 *   node tools/weirdness.mjs [lives=400] [seed=1] [--json=out.json]
 *
 * Prints each check that fired, how often, and a few examples (seed, country, year, age, detail).
 * Exit code 1 when anything fired, so it can run in CI as a long test.
 */
import { Engine } from '../src/core/Engine.js';
import { Store, STAT_KEYS, ERA_DROPPED } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { yearNow } from '../src/modules/world/Eras.js';
import { PROFESSION_LIST } from '../src/modules/career/JobTrees.js';
import { WEDDINGS, WILL_PLANS } from '../src/modules/people/index.js';
import { living, partnerOf, spouseOf, ageOf } from '../src/modules/people/People.js';
import { marriageBlock } from '../src/modules/legal/Rights.js';
import { writeFileSync } from 'node:fs';
import { COUNTRIES as COUNTRY_DEFS, localizeHtml } from '../src/modules/world/Countries.js';
import { periodCurrency, periodText } from '../src/modules/world/Eras.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const LIVES = Number(args[0] ?? 400);
const SEED = Number(args[1] ?? 1);
const JSON_OUT = process.argv.find((a) => a.startsWith('--json='))?.split('=')[1];
/** --life=N replays only that life (same seed), to reproduce a finding. */
const ONLY = process.argv.find((a) => a.startsWith('--life='))?.split('=')[1];
export let lastState = null;
const COUNTRIES = ['US', 'GB', 'FR', 'DE', 'IT', 'ZA', 'IN', 'JP', 'AU', 'CA', 'BR', 'MX', 'IE', 'ES', 'NG', 'RU'];
const BAD_TEXT = /\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|\$-\d|Infinity/;

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const findings = new Map();
let where = {};
function flag(id, detail) {
  const f = findings.get(id) ?? { count: 0, lives: new Set(), examples: [] };
  f.count += 1;
  f.lives.add(where.life);
  if (f.examples.length < 4) f.examples.push({ ...where, detail: String(detail).slice(0, 240) });
  findings.set(id, f);
}
const strip = (html) => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

/* ------------------------------------------------------------------ the checks */
function checkState(state) {
  const c = state.character;
  const age = c.age;
  const y = yearNow(state);
  for (const k of STAT_KEYS) { const v = state.stats[k]; if (!Number.isFinite(v) || v < 0 || v > 100) flag('stat out of range', `${k}=${v}`); }
  if (!Number.isFinite(state.finances.cash)) flag('cash not a number', `${state.finances.cash} after: ${(state.log.at(-1)?.entries ?? []).map((e) => e.text).join(' | ')}`);
  if (c.alive && age > 122) flag('impossibly old', `age ${age}`);
  const people = state.people?.list ?? [];
  for (const p of people) {
    const a = ageOf(state, p);
    if (!Number.isFinite(a)) { flag('person age not a number', `${p.relation} ${p.firstName}`); continue; }
    if (p.alive && a > 112) flag('relative impossibly old', `${p.relation} ${p.firstName} aged ${a}`);
    if (p.alive && a < 0 && p.relation !== 'child') flag('person not yet born', `${p.relation} ${p.firstName} aged ${a}`);
    if (['mother', 'father'].includes(p.relation) && a - age < 13) flag('parent too young', `${p.relation} is ${a - age} years older`);
    if (p.relation === 'mother' && a - age > 55 && !p.adoptive) flag('mother too old at your birth', `${a - age} at your birth`);
    if (p.relation === 'child' && !p.adopted && !p.stepchild && age - a < 13) flag('parent too young at child\'s birth', `you were ${age - a}`);
    if (p.relation === 'child' && age - a > 75 && !p.adopted) flag('parent too old at child\'s birth', `you were ${age - a}`);
    if (['spouse', 'fiance', 'partner'].includes(p.relation) && a < 16) flag('partner under 16', `${p.relation} aged ${a}`);
    if (p.relation === 'child') for (const k of p.kids ?? []) {
      const parentAgeThen = k.bornAge + p.ageOffset;
      if (parentAgeThen < 14) flag('grandchild born to a child', `${p.firstName} was ${parentAgeThen}`);
      if (k.bornAge > age) flag('grandchild born in the future', `bornAge ${k.bornAge} > ${age}`);
    }
    for (const field of ['firstName', 'relationship']) if (p[field] === undefined || (field === 'relationship' && !Number.isFinite(p.relationship))) flag('person missing field', `${p.relation}.${field}`);
  }
  const spouses = people.filter((p) => p.relation === 'spouse' && p.alive);
  if (spouses.length > 1) flag('more than one spouse', spouses.map((p) => p.firstName).join(', '));
  const partners = people.filter((p) => ['partner', 'fiance'].includes(p.relation) && p.alive);
  if (partners.length > 1 && !state.people.open) flag('more than one partner', partners.length);
  if (spouses.length && age < 16) flag('married under 16', `age ${age}`);
  const job = state.career?.job;
  if (job) {
    if (!Number.isFinite(job.salary) || job.salary < 0) flag('salary not a number or negative', job.salary);
    if (age < 10) flag('working under 10', `${job.title} at ${age}`);
    if (state.legal?.incarceration && !job.prison && !/prison|inmate/i.test(job.title ?? '')) flag('outside job while in prison', job.title);
    if (state.retirement?.retired && !job.partTime && !job.bridge) flag('retired but employed', job.title);
    if (BAD_TEXT.test(`${job.title} ${job.employer?.name ?? ''}`)) flag('bad text in job', `${job.title} @ ${job.employer?.name}`);
  }
  for (const d of state.education?.degrees ?? []) {
    if (d.type !== 'highschool' && d.year != null && d.year < 15) flag('degree before 15', `${d.type} at ${d.year}`);
  }
  if (state.military?.service && (age < 15 || age > 70)) flag('in the forces at an odd age', `age ${age}`);
  if (y < 1950 && (state.finances?.cards ?? state.credit?.cards ?? []).length) flag('credit card before 1950', y);
  for (const s of spouses) if (marriageBlock(state, s) && (s.since ?? 0) >= age - 1 && /colour line/.test(marriageBlock(state, s))) flag('married across a race-law ban', `${y} ${state.character.countryId ?? 'US'}`);
  if (c.gender === 'female' && state.people?.expecting && age > 55 && !state.people.expecting.surrogate && !state.people.expecting.adoption) flag('pregnant over 55', `age ${age}`);
}

/** Words that can't appear before their year: [pattern, first year]. Checked in the story, prompts and titles. */
const ANACHRONISMS = [
  [/\bsmart ?phones?\b|\biPhone/i, 2007], [/\bUber\b|\brideshare\b|\bride-share\b/i, 2010], [/\bAirbnb\b/i, 2008],
  [/\bonline\b|\bwebsites?\b|\bthe internet\b|\bweb page/i, 1993], [/\be-?mails?\b/i, 1985], [/\bsocial media\b|\bFacebook\b/i, 2004],
  [/\bTwitter\b|\btweet(s|ed)?\b/i, 2006], [/\bInstagram\b|\bselfies?\b|\bhashtags?\b/i, 2010], [/\binfluencers?\b/i, 2008], [/\bTikTok\b/i, 2017],
  [/\bYouTube\b|\bpodcasts?\b/i, 2005], [/\bGoogle(d)?\b/i, 1998], [/\bbitcoin|\bcrypto(currency)?\b/i, 2009], [/\btext(ed)? (message|you|them|him|her)\b|\btexting\b/i, 1995],
  [/\bmobile phone|\bcell ?phone/i, 1985], [/\blaptops?\b/i, 1985], [/\bvideo ?games?\b/i, 1972], [/\btelevision\b|\bTV\b|\btelly\b/, 1938],
  [/\bradio (show|station|broadcast|interview)/i, 1922], [/\bmovies?\b|\bthe pictures\b/i, 1910], [/\bairports?\b|\bairlines?\b|\bflew (to|home|back|out)\b/i, 1920],
  [/\bhelicopters?\b/i, 1944], [/\bjet(liner|s| plane| engine)\b/i, 1952], [/\bcredit cards?\b/i, 1950], [/\bATMs?\b|\bcash machine/i, 1969],
  [/\bsupermarkets?\b/i, 1930], [/\bmotorway|\bfreeway|\bthe interstate\b/i, 1940], [/\btelephone(d)?\b|\bphoned\b|\bon the phone\b/i, 1880],
  [/\bphotograph|\bphotos?\b/i, 1840], [/\bDNA\b/, 1953], [/\bZoom call|\bCOVID\b/, 2020], [/\bNetflix\b|\bstreaming\b/i, 2007],
  [/\bWi-?Fi\b/i, 1999], [/\bMRI\b|\bCT scans?\b/, 1977], [/\bIVF\b/, 1978], [/\bdrones?\b/i, 2001], [/\bGPS\b/, 1995], [/\bCCTV\b/, 1970],
  [/\bpenicillin\b|\bantibiotics?\b/i, 1942], [/\bX-rays?\b/i, 1896], [/\bdating apps?\b|\bapps?\b(?! for)/i, 2009], [/\bspreadsheets?\b/i, 1979],
];
function anachronism(state, text, where) {
  const y = yearNow(state);
  if (y >= 2025 || !text) return;
  for (const [re, from] of ANACHRONISMS) {
    if (y >= from) continue;
    const shown = periodText(String(text));
    const m = shown.match(re);
    // Explanations of what doesn't exist yet ("from 1960", "not until") are fine.
    if (m && !/\b(from|until|yet|not invented|before)\b/i.test(shown)) { flag(`anachronism: "${m[0].toLowerCase()}" before ${from}`, `${where}: ${String(text).slice(0, 180)}`); return; }
  }
}

function checkYearText(state) {
  const block = state.log.at(-1);
  for (const e of block?.entries ?? []) if (BAD_TEXT.test(e.text ?? '')) flag('bad text in life story', e.text);
  for (const e of block?.entries ?? []) anachronism(state, e.text, 'life story');
  for (const p of state.prompts ?? []) { anachronism(state, `${p.title} — ${p.text}`, `prompt ${p.type}`); for (const o of p.options ?? []) anachronism(state, o.label, `option in ${p.type}`); }
  const job = state.career?.job;
  if (job) anachronism(state, `${job.title} @ ${job.employer?.name ?? ''}`, 'your job');
  for (const p of state.people?.list ?? []) if (p.alive && p.job?.title) anachronism(state, p.job.title, `${p.relation}'s job`);
  for (const p of state.prompts ?? []) {
    if (BAD_TEXT.test(`${p.title} ${p.text}`)) flag('bad text in a prompt', `${p.type}: ${p.title} — ${p.text}`);
    for (const o of p.options ?? []) if (BAD_TEXT.test(`${o.label} ${o.hint ?? ''}`)) flag('bad text in a prompt option', `${p.type}: ${o.label} ${o.hint ?? ''}`);
    if (!(p.options ?? []).some((o) => !o.disabled)) flag('prompt with no choice', p.type);
  }
}

const VIEW_IDS = Object.keys(VIEWS);
function checkViews(state) {
  for (const id of VIEW_IDS) {
    let html;
    try { html = VIEWS[id](state, {}); } catch (e) { flag(`view throws: ${id}`, process.env.STACK ? e.stack.split('\n').slice(0, 4).join(' | ') : e.message); continue; }
    const text = strip(html);
    const m = text.match(BAD_TEXT);
    if (m) flag(`bad text in view: ${id}`, text.slice(Math.max(0, m.index - 80), m.index + 60));
    // Money in the wrong currency: after localising, no dollar amounts should be left where the money isn't dollars.
    const cc = state.character.countryId ?? 'US';
    const country = COUNTRY_DEFS[cc];
    if (country && cc !== 'US') {
      const cur = periodCurrency(cc, country.currency);
      const shown = strip(localizeHtml(html, country));
      if (cur?.symbol && !cur.symbol.includes('$')) {
        const d = shown.match(/(?<![A-Za-z])\$\s?\d/);
        // Figures given in (2011) US dollars on purpose are fine.
        if (d && !/dollars/.test(shown.slice(d.index, d.index + 60))) flag(`dollars left in a non-dollar country: ${id}`, `${cc} ${cur.symbol}: ${shown.slice(Math.max(0, d.index - 80), d.index + 40)}`);
      }
      const us = shown.match(/US[^\s$A-Za-z]\d/);
      if (us && !cur?.symbol?.includes('$')) flag(`"US" before a local currency sign: ${id}`, shown.slice(Math.max(0, us.index - 60), us.index + 30));
    }
  }
}

/* ------------------------------------------------------------------ the player */
function play(engine, rng, state) {
  const act = (id, arg) => { try { engine.dispatch(id, arg); } catch (e) { flag(`action throws: ${id}`, e.message); } };
  const age = state.character.age;
  if (age >= 16 && !state.career.job && rng.chance(0.5)) act('career.apply', rng.pick(PROFESSION_LIST).id);
  const partner = partnerOf(state);
  if (!partner && age >= 17 && rng.chance(0.3)) act('people.date');
  if (partner?.relation === 'partner' && rng.chance(0.3)) act('people.propose', partner.id);
  if (partner?.relation === 'fiance' && rng.chance(0.5)) act('people.wed', rng.pick(Object.keys(WEDDINGS)));
  if (partner && age < 45 && rng.chance(0.25)) act('people.tryForBaby');
  if (spouseOf(state) && rng.chance(0.01)) act('people.fileForDivorce');
  if (age >= 50 && rng.chance(0.05)) act('people.writeWill', rng.pick(Object.keys(WILL_PLANS)));
  const folks = living(state).filter((p) => ageOf(state, p) >= 0);
  if (folks.length && rng.chance(0.3)) act(`people.${rng.pick(['spendTime', 'gift', 'argue'])}`, rng.pick(folks).id);
}
function resolvePrompts(engine, rng, state) {
  for (let guard = 0; state.prompts.length && state.character.alive && guard < 40; guard++) {
    const p = state.prompts[0];
    const options = p.options.filter((o) => !o.disabled);
    if (!options.length) { state.prompts.shift(); continue; }
    try { engine.resolvePrompt(p.id, rng.pick(options).id); } catch (e) { flag(`prompt throws: ${p.type}`, e.message); state.prompts.shift(); }
  }
}

const started = Date.now();
let years = 0;
for (let life = 0; life < LIVES; life++) {
  if (ONLY != null && life !== Number(ONLY)) continue;
  const seed = SEED * 100003 + life;
  const rng = new Random(seed);
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed + 7), modules: MODULES });
  const countryId = COUNTRIES[life % COUNTRIES.length];
  const startYear = 1820 + Math.floor(rng.float(0, 1) * 200);
  let state;
  try { state = engine.newLife({ countryId, startYear, gender: rng.chance(0.5) ? 'female' : 'male' }); } catch (e) { where = { life, seed, countryId, year: startYear, age: 0 }; flag('newLife throws', e.message); continue; }
  state.world.seed = seed;
  for (let i = 0; i < 110 && state.character.alive; i++) {
    where = { life, seed, countryId, year: yearNow(state), age: state.character.age };
    play(engine, rng, state);
    try { engine.ageUp(); } catch (e) { flag('ageUp throws', e.stack.split('\n').slice(0, 3).join(' | ')); break; }
    years += 1;
    where = { life, seed, countryId, year: yearNow(state), age: state.character.age };
    checkYearText(state);
    resolvePrompts(engine, rng, state);
    checkState(state);
    if (state.character.age % 15 === 0) checkViews(state);
  }
  if (!state.character.alive) checkViews(state);
  lastState = state;
  if ((life + 1) % 50 === 0) process.stderr.write(`  ${life + 1}/${LIVES} lives, ${findings.size} kinds of weirdness so far (${Math.round((Date.now() - started) / 1000)}s)\n`);
}

const sorted = [...findings.entries()].sort((a, b) => b[1].lives.size - a[1].lives.size);
console.log(`\nWeirdness audit: ${LIVES} lives, ${years} years, ${Math.round((Date.now() - started) / 1000)}s`);
if (!sorted.length) console.log('✔ Nothing weird found.');
for (const [id, f] of sorted) {
  console.log(`\n✘ ${id}: ${f.count} times in ${f.lives.size} lives`);
  for (const e of f.examples) console.log(`    seed ${e.seed} ${e.countryId} ${e.year} age ${e.age}: ${e.detail}`);
}
// Lines State.addLog kept out of period lives as too modern: not failures (the safety net held), but
// each one points at content that should be dated at its source.
if (ERA_DROPPED.length) {
  const by = new Map();
  for (const d of ERA_DROPPED) { const k = d.text.replace(/[\d$,.]+/g, '#').slice(0, 90); by.set(k, (by.get(k) ?? 0) + 1); }
  console.log(`\nℹ ${ERA_DROPPED.length} too-modern lines held back (first 500 kept); most common:`);
  for (const [k, n] of [...by].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`    ${n}× ${k}`);
}
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(sorted.map(([id, f]) => ({ id, count: f.count, lives: f.lives.size, examples: f.examples })), null, 2));
process.exit(sorted.length ? 1 : 0);
