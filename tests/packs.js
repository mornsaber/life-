/**
 * Country packs: each pack country (world/packs/) gets a full set of tables,
 * and lives played there don't leak the base country's names (an Irish garda
 * isn't a Police Constable; a New Zealander doesn't draw the Age Pension).
 *
 * Every local career is tried, every screen rendered (with the country's
 * display swaps applied) and the life story, prompts and screens scanned for
 * the base country's words and for broken text.
 *
 *   node tests/packs.js [livesPerCountry=6] [seed=1]
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { PACKS } from '../src/modules/world/packs/index.js';
import { COUNTRIES, localizeHtml, localizeTerms, FOREIGN_CITIES } from '../src/modules/world/Countries.js';
import { professionsFor, PROFESSIONS } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { FORCES } from '../src/modules/world/NationalForces.js';
import { LEGISLATURES, NATIONAL_OFFICES } from '../src/modules/politics/NationalOffices.js';
import { IMMIGRATION, WORKING_HOLIDAY, recognitionRoute, totalizes } from '../src/modules/world/Immigration.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { localMedal } from '../src/modules/world/Honours.js';
import { SERVICES } from '../src/modules/emergency/EmergencyEngine.js';
import { setCurrentCountry } from '../src/core/Locale.js';

const PER = Number(process.argv[2] ?? 6);
const SEED = Number(process.argv[3] ?? 1);
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const BAD_TEXT = /undefined|NaN|\[object |\bnull\b|Infinity/;
/** Words that belong to each pack's base country, not to the pack's. */
const MX_WORDS = /CDMX|Guardia Nacional|SEDENA|\bcartilla\b|Infonavit|\bIMSS\b|ISSSTE|\bSAT\b|\bpesos?\b|Morena|\bPAN\b|MX\$|Fiscalía|Cruz Roja|Servicio Militar Nacional|Policía|Bomberos|Secretaría|Licencia/;
const PH_WORDS = /(?<!(from|war in) (the )?)Philippin|Filipin|\bPNP\b|\bBFP\b|[Bb]arangay|\bSSS\b|PhilHealth|Pag-IBIG|Bilibid|BJMP|Manila|Malacañang|₱|\bpesos?\b|UPCAT|Lupon|Cebu|Davao|\bPMA\b|Tagalog|\bLTO\b|Lakas|4Ps|PSLINK/;
const GB_WORDS = /\bBritish\b|United Kingdom|\bNHS\b|HMRC|Crown Prosecution|House of Commons|Police Constable|Chief Constable|Sandhurst|Royal Navy|Royal Air Force|\bRAF\b|Metropolitan Police|Police Scotland|Royal Mail|Jobcentre|MI5|MI6|\bSir\b|\bDame\b|\bMBE\b|\bOBE\b|\bLord\b|Baroness|£|Westminster|Council Tax|\bGP\b|Universal Credit/;
const LEAKS = {
  SG: GB_WORDS,
  IL: GB_WORDS,
  PS: MX_WORDS,
  NG: PH_WORDS,
  KE: PH_WORDS,
  ID: PH_WORDS,
  ZA: /Australia(?!n Defence and Strategic)|Centrelink|\bATO\b|Medicare|Commonwealth|Age Pension|State Revenue|NSW|Queensland|Sydney|Melbourne|Canberra|Kapooka|Duntroon|\bRAAF\b|\bHMAS\b|Triple Zero|\bA\$|[Ss]uperannuation/,
  CN: /(?<!from (South )?)Korea(?!n)|(?<!from South )Korean|₩|Seoul|Busan|Gyeong|Sobang|National Assembly|Hangul|\bROK\b|Chuseok|Suneung|Hakwon|hagwon/,
  NZ: /Australia(?!n Defence and Strategic)|Centrelink|\bATO\b|Medicare|Commonwealth|Age Pension|State Revenue|\bPremier\b|NSW|Queensland|Sydney|Melbourne|Canberra|Kapooka|Duntroon|\bRAAF\b|\bHMAS\b|Triple Zero|\bA\$/,
  ES: /\bParis\b|Gendarmerie|Saint-Cyr|Légion|Marine nationale|Armée de|Police nationale|Police municipale|Mairie|SAMU|Sapeurs|Parquet|DGFiP|Assurance Maladie|CNAV|Agirc|URSSAF|baccalauréat|lycée|Lycée|Commissariat|Brigade|Légion d'honneur|\bpréfet/,
  NL: /Bundes(?!liga)|Polizei|Feuerwehr|Finanzamt|Abitur|Staatsanwalt|Landtag|Bundestag|Schöffe|\bJVA\b|Kanzler|Rettungsdienst|Leitstelle|Erbschaftsteuer|SCHUFA|Pflichtverteidiger/,
  SE: /Bundes(?!liga)|Polizei|Feuerwehr|Finanzamt|Abitur|Staatsanwalt|Landtag|Bundestag|Schöffe|\bJVA\b|Kanzler|Rettungsdienst|Leitstelle|Erbschaftsteuer|SCHUFA|Pflichtverteidiger/,
  BR: /CDMX|Guardia Nacional|SEDENA|\bcartilla\b|Infonavit|\bIMSS\b|ISSSTE|\bSAT\b|\bpesos?\b|Morena|\bPAN\b|MX\$|Fiscalía|Cruz Roja Mexicana|Servicio Militar Nacional/,
  IE: /\bBritish\b|(?<!from the )United Kingdom|\bNHS\b|HMRC|Crown Prosecution|House of Commons|Police Constable|Chief Constable|Sandhurst|Royal Navy|Royal Air Force|\bRAF\b|Metropolitan Police|Police Scotland|A-levels|Royal Mail|Jobcentre|MI5|MI6|\bSir\b|\bDame\b|\bMBE\b|\bOBE\b|\bLord\b|Baroness|£|Westminster/,
};

/** US-only posts that no country abroad should show. */
const US_POSTS = /Special Agent|Behavioral Analysis|\bFS-\d|BORTAC|\bTSO\b|Federal (Air Marshal|Security Director)|Sheriff|\bTrooper\b|Postmaster|Letter Carrier|Presidential Protective/;

const problems = new Map();
const flag = (msg, where) => { if (!problems.has(msg)) problems.set(msg, where); };
const scan = (cc, text, where, seen) => {
  if (!text || seen.has(text)) return;
  seen.add(text);
  const bad = text.match(BAD_TEXT);
  if (bad) flag(`${cc} broken text: "…${text.slice(Math.max(0, bad.index - 100), bad.index + 60)}"`, where);
  const us = text.match(US_POSTS);
  if (us) flag(`${cc} US-only post "${us[0]}": "…${text.slice(Math.max(0, us.index - 80), us.index + 60)}"`, where);
  const m = LEAKS[cc] && text.match(LEAKS[cc]);
  if (m) flag(`${cc} base-country word "${m[0]}": "…${text.slice(Math.max(0, m.index - 80), m.index + 60)}"`, where);
};
const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');

/* Tables: every pack country is fully wired. */
for (const p of PACKS) {
  const cc = p.id;
  const c = COUNTRIES[cc];
  assert.ok(c, `${cc} is playable`);
  assert.ok(Object.keys(c.cities).every((id) => FOREIGN_CITIES[id]?.country === cc), `${cc} cities registered`);
  assert.ok(FORCES[cc]?.branches?.army, `${cc} has forces`);
  for (const [, list] of Object.entries(FORCES[cc].bases)) for (const [regionId] of list) assert.equal(FOREIGN_CITIES[regionId]?.country, cc, `${cc} base in ${regionId}`);
  const L = LEGISLATURES[cc];
  assert.ok(L?.lower && NATIONAL_OFFICES[L.lower.office]?.country === cc, `${cc} parliament`);
  assert.ok(NATIONAL_OFFICES[L.execOffice], `${cc} head of government`);
  assert.ok(IMMIGRATION[cc]?.visas?.work && IMMIGRATION[cc].visas.workingHoliday === WORKING_HOLIDAY[cc], `${cc} visas`);
  for (const other of Object.keys(WORKING_HOLIDAY[cc]?.partners ?? {})) if (WORKING_HOLIDAY[other]) assert.ok(WORKING_HOLIDAY[other].partners[cc], `${other} takes ${cc} working holidaymakers`);
  for (const other of p.agreements ?? []) assert.ok(totalizes(cc, other), `${cc}–${other} pension agreement`);
}
assert.notEqual(IMMIGRATION.GB.visas.workingHoliday, IMMIGRATION.IE.visas.workingHoliday, 'a pack doesn\'t overwrite its base\'s scheme');
assert.equal(recognitionRoute('driverLicense', ['AU'], 'NZ').method, 'exchange');
assert.equal(recognitionRoute('driverLicense', ['NZ'], 'AU').method, 'exchange');
assert.equal(recognitionRoute('rn', ['DE'], 'IE').method, 'mutual', 'Ireland is in the EU');
assert.equal(localMedal('IE', 'purpleHeart'), null);
// Volunteer services rank the local way abroad.
setCurrentCountry('IE');
assert.equal(SERVICES.fire.ranks[1].title, 'Retained Firefighter');
setCurrentCountry('GB');
assert.equal(SERVICES.police.ranks[1].title, 'Special Constable');
setCurrentCountry('US');
assert.equal(SERVICES.fire.ranks[6].title, 'Volunteer Fire Chief');

/* Lives. */
let careers = 0;
function life(cc, seed) {
  const rng = new Random(seed * 7919);
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, gender: rng.pick(['male', 'female']) });
  const ctx = engine.context();
  const seen = new Set();
  const country = COUNTRIES[cc];
  const tryDo = (fn, where) => { try { fn(); } catch (e) { flag(`threw: ${e.message.split('\n')[0]}`, `${where}\n${e.stack.split('\n').slice(1, 4).join('\n')}`); } };
  const solve = () => { for (let g = 0; g < 15 && state.prompts.length; g++) { const pr = state.prompts[0]; const opts = pr.options.filter((o) => !o.disabled && o.id !== 'cancel'); engine.resolvePrompt(pr.id, rng.pick(opts.length ? opts : pr.options).id); } };
  const render = (where) => tryDo(() => {
    // (The move screen lists every other country, base included.)
    for (const [name, view] of Object.entries(VIEWS).filter(([n]) => n !== 'move')) {
      const text = strip(localizeHtml(view(state, {}), country));
      for (const chunk of text.split(/(?<=[.!?])\s|\s{2,}/)) scan(cc, chunk, `${where} ${name} view`, seen);
    }
  }, `render ${where}`);
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
        if (job) scan(cc, `${job.title} at ${job.employer.name}`, `${cc} hire ${prof.id}`, seen);
      }, `hire ${cc} ${prof.id}`);
    }
    if (age % 7 === 0 && age >= 18) render(`${cc} @${age} seed ${seed}`);
    tryDo(() => { state.prompts = []; engine.ageUp(); }, `ageUp ${cc} @${age} seed ${seed}`);
    for (const p of state.prompts) scan(cc, localizeTerms([p.title, p.text, ...p.options.map((o) => `${o.label} ${o.hint ?? ''}`)].join(' | '), country), `${cc} prompt ${p.type} @${age}`, seen);
    tryDo(solve, `solve ${cc} @${age}`);
    for (const block of state.log.slice(-2)) for (const e of block.entries ?? []) if (typeof e?.text === 'string') scan(cc, localizeTerms(e.text, country), `${cc} log @${state.character.age} seed ${seed}`, seen);
  }
  render(`${cc} end seed ${seed}`);
}

/* Every local career, once, with its titles and employer. */
for (const p of PACKS) {
  const cc = p.id;
  const engine = new Engine({ store: new Store(memory()), rng: new Random(5), modules: MODULES });
  const state = engine.newLife({ countryId: cc });
  state.character.age = 30;
  for (const prof of professionsFor(state).filter((x) => x.sector !== 'private')) {
    const seen = new Set();
    const employer = createEmployer(new Random(3), state, PROFESSIONS[prof.id] ?? prof, state.character.regionId);
    for (const l of (PROFESSIONS[prof.id] ?? prof).levels) scan(cc, localizeTerms(`${l.title} at ${employer.name}`, COUNTRIES[cc]), `${cc} ladder ${prof.id}.${l.id}`, seen);
  }
}

for (const p of PACKS) for (let i = 0; i < PER; i++) life(p.id, SEED * 100 + i);
if (problems.size) {
  for (const [msg, where] of problems) console.log(`  ✘ ${msg}\n      ${String(where).split('\n').join('\n      ')}`);
  console.log(`\n${problems.size} distinct problem(s)`);
  process.exit(1);
}
console.log(`✔ Country packs passed — ${PACKS.map((p) => p.id).join(', ')}: tables wired, ${PER * PACKS.length} lives, ${careers} careers, no base-country leaks`);
