/**
 * The living cast: the people around you have careers of their own, in the same professions,
 * ladders and vocation packs as yours (career/Vocations.js).
 *
 *   Work        a profession that exists in their year and place and is open to them (a
 *               woman can't be a constable in 1900; nobody is a software developer in 1920),
 *               fitted to their schooling, with the commoner trades commoner.
 *   Climbing    years in the rung, then promotion: their title is the ladder's, of its day.
 *   The packs   now and then a posting (abroad: they live there for its years), an award, a
 *               complaint (most come to nothing; some end the job), an elite post.
 *   Footsteps   a child may follow a parent into the trade.
 *   Rivals      a work rival climbs your own ladder; when they take an elite post you were in
 *               line for, it's theirs, and it won't be offered to you.
 *
 * person.career = { professionId, levelId, years, inField, awards: [id], postings: [{ id, until, place }],
 *   elite: { id, name, until } | null, record: [{ age, outcome }], packId }
 * person.job stays the display title (other modules read it).
 */
import { clamp } from '../../core/Random.js';
import { PROFESSION_LIST, getProfession } from '../career/JobTrees.js';
import { nextLevels } from '../career/Ladder.js';
import { eraWorkBlock, yearNow, periodTitle } from '../world/Eras.js';
import { workBlock } from '../world/Regimes.js';
import { crownOf } from '../world/Crown.js';
import { COUNTRIES } from '../world/Countries.js';
import { packFor, VOCATIONS, vocationOf } from '../career/vocations/registry.js';

/** Schooling a profession expects, as a rank: 0 none … 5 professional or doctorate. */
const PROGRAM_RANK = { md: 5, jd: 5, dds: 5, od: 5, dc: 5, psyd: 5, phd: 5, paMaster: 4, mot: 4, slpMaster: 4 };
const LEVEL_RANK = { highschool: 1, associate: 2, bachelor: 3, master: 4 };
export const EDU_RANK = { none: 0, highschool: 1, trade: 2, associate: 2, bachelor: 3, master: 4, professional: 5, doctorate: 5 };
const needOf = (p) => (p.entry?.education?.program ? PROGRAM_RANK[p.entry.education.program] ?? 4 : LEVEL_RANK[p.entry?.education?.level] ?? 0);

/** How common each kind of work is: most people work in shops, factories, fields, offices, schools and hospitals. */
const COMMON = {
  retail: 6, culinary: 4, hospitality: 3, manufacturing: 5, millWork: 4, agriculture: 5, plantation: 2, trades: 3, carpentry: 2, plumbing: 2, automotive: 2, welding: 1.5,
  trucking: 3, logistics: 3, docks: 2, coalMining: 2.5, domesticService: 4, typingPool: 2, switchboard: 1.5, corporate: 4, sales: 3, accounting: 2, finance: 1.5,
  education: 4, nursing: 4, caregiving: 3, childcare: 2, police: 1.5, fire: 1, postal: 1.5, railroad: 1.5, steamRailway: 1.5, transit: 1, construction: 2, tech: 2.5,
  marketing: 1.5, humanResources: 1, realestate: 1, insurance: 1, engineering: 1.5, law: 1, legalSupport: 1, medical: 0.8, pharmacy: 0.5, socialWork: 1, cosmetology: 1.5,
  fishing: 1, milkRound: 1, travellingSales: 1, coachman: 1.5, blacksmith: 1, clergy: 0.6, library: 0.5, municipalAdmin: 1, journalism: 0.6,
};
/** Rare posts a relative is seldom in (one of a few hundred people, or a world body). */
const RARE = new Set(['swissGuard', 'romanCuria', 'holySeeDiplomacy', 'vaticanGendarmerie', 'moc', 'jesuits', 'spaceIndustry', 'gurkhaContingent', 'maltaDiplomacy', 'maltaRelief',
  'privateMilitary', 'caseOfficer', 'sigint', 'intelligence', 'nato', 'intlJustice', 'intlFinance', 'euInstitutions', 'unSecretariat', 'unAgencies', 'icrc', 'usss', 'airTrafficControl', 'meteorology', 'nuclearEng', 'aiOps']);

/** Work most women did before the 1960s: in service, the mills, shops, offices, schools and wards. */
const WOMENS_WORK = new Set(['domesticService', 'millWork', 'retail', 'typingPool', 'switchboard', 'telegraph', 'education', 'nursing', 'childcare', 'caregiving', 'culinary', 'hospitality', 'cosmetology', 'library', 'agriculture', 'manufacturing', 'socialWork', 'clergy', 'legalSupport']);
const POOL_CACHE = new Map();
/** The work open to someone of this sex and schooling in this year and place (cached per year and place). */
function poolFor(state, gender, rank) {
  const y = yearNow(state);
  const key = `${y}:${state.character.countryId ?? 'US'}:${state.character.regionId}:${gender}:${rank}`;
  if (POOL_CACHE.has(key)) return POOL_CACHE.get(key);
  if (POOL_CACHE.size > 400) POOL_CACHE.clear();
  // Their sex, not yours, decides what was open to them.
  const as = { ...state, character: { ...state.character, gender } };
  const pool = [];
  for (const p of PROFESSION_LIST) {
    if (p.templateOnly || p.church && rank < 1) continue;
    const need = needOf(p);
    if (need > rank || need < rank - 2) continue;
    let blocked = null;
    try { blocked = eraWorkBlock(as, p) || workBlock(as, p); } catch { blocked = 'error'; }
    if (blocked) continue;
    let w = RARE.has(p.id) ? 0.03 : COMMON[p.id] ?? 0.5;
    // Before the 1960s most women's work was a narrow list; the rest was rare (but not unknown).
    if (gender === 'female' && y < 1965) w *= WOMENS_WORK.has(p.id) ? 1.6 : y < 1920 ? 0.06 : y < 1945 ? 0.15 : 0.3;
    pool.push([p, w * (need === rank ? 1.6 : 1)]);
  }
  POOL_CACHE.set(key, pool);
  return pool;
}

/** How likely a woman of this year was to keep house rather than work for pay. */
export function homemakerOdds(state) {
  const y = yearNow(state);
  return y < 1920 ? 0.7 : y < 1950 ? 0.6 : y < 1970 ? 0.45 : y < 1990 ? 0.2 : 0.08;
}
/** A profession for someone, or null; `prefer` (a parent's trade) wins when it's open to them. */
export function pickProfession(rng, state, person, edu, { prefer = null } = {}) {
  const rank = EDU_RANK[edu] ?? 0;
  const pool = poolFor(state, person.gender ?? 'male', rank);
  if (prefer) { const hit = pool.find(([p]) => p.id === prefer); if (hit) return hit[0]; }
  if (!pool.length) return null;
  return rng.weighted(pool, ([, w]) => w)[0];
}

const ladderOf = (p) => p.levels.filter((l) => !l.appointed);
/** Pay by rung, in today's money like the rest of the people list. */
export function npcPay(profession, level, rng = null) {
  const base = 26000 * 1.19 ** Math.max(0, (level?.grade ?? 1) - 1) * (profession.payMultiplier ?? 1);
  return Math.round(base * (rng ? rng.float(0.85, 1.15) : 1));
}

/** Start someone in a profession at a rung (by index on its ladder, or by age). */
export function startCareer(rng, state, person, profession, { age = null, levelIdx = null } = {}) {
  const ladder = ladderOf(profession);
  const idx = levelIdx ?? clamp(Math.floor(((age ?? 25) - 22) / 6 + rng.float(-0.6, 0.6)), 0, Math.max(0, ladder.length - 3));
  const level = ladder[clamp(idx, 0, ladder.length - 1)];
  person.career = { professionId: profession.id, levelId: level.id, years: 0, inField: Math.max(0, (age ?? 25) - 22), awards: [], postings: [], elite: null, record: [], packId: packFor(state, profession.id)?.id ?? null };
  person.job = periodTitle(level.title);
  person.sector = profession.sector === 'private' ? 'private' : 'public';
  person.careerIncome = npcPay(profession, level, rng);
  return person.career;
}

/** The person's title now (the ladder's, in the words of the year). */
export const careerTitle = (person) => {
  const c = person.career;
  if (!c) return person.job ?? null;
  const p = getProfession(c.professionId);
  const l = p?.levels.find((x) => x.id === c.levelId);
  return l ? periodTitle(l.title) : person.job ?? null;
};

/** Does a pack item apply to this person (their profession, your year and country)? */
function npcApplies(state, item, professionId) {
  const y = yearNow(state);
  if (item.from && y < item.from) return false;
  if (item.until && y >= item.until) return false;
  if (item.countries && !item.countries.includes(state.character.countryId ?? 'US')) return false;
  if (item.realm && crownOf(state) !== 'GB') return false;
  if (item.professions && !item.professions.includes(professionId)) return false;
  // Items that read your own career (`traits`, `when`) can't be judged for someone else: skip them.
  if (item.traits || item.when) return false;
  return true;
}
/** A name that reads your state is read as it would be for them: in your year and country. */
const nameFor = (state, item, person) => {
  if (typeof item.name !== 'function') return item.name;
  try { return item.name({ ...state, career: { ...state.career, job: { professionId: person.career.professionId, levelId: person.career.levelId } } }); } catch { return null; }
};

/**
 * A year of someone's career. `say` logs it when they're close to you; returns true if the job ended.
 * `rng` is the people's own stream (people/NpcLives.js), so their lives never reshuffle yours.
 */
export function careerYear(ctx, rng, person, { say = () => {}, rival = false } = {}) {
  const { state } = ctx;
  const c = person.career;
  const profession = getProfession(c.professionId);
  if (!profession) { person.career = null; return false; }
  c.years += 1;
  c.inField += 1;
  const level = profession.levels.find((l) => l.id === c.levelId) ?? ladderOf(profession)[0];
  const name = person.firstName ?? person.name;
  // A posting ends: they come home.
  for (const p of c.postings) if (!p.done && p.until <= c.inField) {
    p.done = true;
    if (p.place && person.livesIn === p.place) delete person.livesIn;
    say(`${name} came home from ${p.place ? COUNTRIES[p.place]?.name ?? 'abroad' : 'a posting'}.`, '🧳', 'info');
  }
  if (c.elite && c.elite.until <= state.character.age) c.elite = null;
  // Promotion: after the rung's years, a fair chance a year (brighter people a little better).
  const smarts = person.traits?.smarts ?? 55;
  const next = nextLevels(profession, 'large', c.levelId).filter((l) => !l.appointed);
  if (next.length && c.years >= (level.years ?? 2) && rng.chance(clamp(0.28 + (smarts - 55) / 250 - (level.grade >= 7 ? 0.08 : 0), 0.08, 0.5))) {
    const to = rng.pick(next);
    c.levelId = to.id;
    c.years = 0;
    person.job = periodTitle(to.title);
    person.careerIncome = Math.max(person.careerIncome ?? 0, npcPay(profession, to, rng));
    say(`${name} was promoted to ${person.job}.`, '📈', 'good');
  } else person.careerIncome = Math.round((person.careerIncome ?? npcPay(profession, level)) * rng.float(1.0, 1.035));
  const pack = c.packId ? VOCATIONS[c.packId] : null;
  if (!pack) return false;
  const grade = (profession.levels.find((l) => l.id === c.levelId) ?? level).grade;
  // Discipline: rare, and most cases come to nothing.
  if (rng.chance((pack.complaintOdds ?? 0.015) * 0.5)) {
    const roll = rng.next();
    const outcome = roll < 0.65 ? 'none' : roll < 0.9 ? 'warning' : 'dismissed';
    c.record.push({ age: state.character.age, outcome });
    if (outcome === 'dismissed') {
      say(`${name} lost their job as ${person.job} after a disciplinary hearing.`, '⚖️', 'bad');
      person.job = null;
      person.career = { ...c, lostAt: state.character.age };
      return true;
    }
    if (outcome === 'warning') say(`${name} was given a formal warning at work.`, '⚖️', 'warn');
  }
  // A posting (abroad, they live there for its years).
  if (!person.livesIn && !c.postings.some((p) => !p.done) && rng.chance((pack.postingOdds ?? 0.08) * 0.35)) {
    const open = (pack.postings ?? []).filter((p) => npcApplies(state, p, c.professionId) && grade >= (p.minGrade ?? 0));
    if (open.length) {
      const p = rng.pick(open);
      const places = (p.places ?? []).filter((x) => COUNTRIES[x] && x !== (state.character.countryId ?? 'US'));
      const place = places.length ? rng.pick(places) : null;
      c.postings.push({ id: p.id, until: c.inField + (p.years ?? 1), place });
      if (place) person.livesIn = place;
      const label = String(nameFor(state, p, person) ?? 'a posting').replace(/^(A|An|The) /, (m) => m.toLowerCase());
      say(`${name} left for ${label}${place ? ` in ${COUNTRIES[place].name}` : ''}.`, p.icon ?? '🧳', 'info');
    }
  }
  // An award, by record.
  for (const a of pack.awards ?? []) {
    if (c.awards.includes(a.id) || !npcApplies(state, a, c.professionId) || a.posting || a.course || a.awards) continue;
    if (grade < (a.minGrade ?? 0) || c.inField < (a.minYears ?? 0)) continue;
    if (!rng.chance((a.chance ?? 0.05) * 0.35)) continue;
    c.awards.push(a.id);
    const label = nameFor(state, a, person);
    if (label) say(`${name} was awarded ${label.replace(/^(A|An) /, (m) => m.toLowerCase())}.`, a.icon ?? '🏅', 'good');
    break;
  }
  // An elite post: theirs, and if you were in line for it, no longer yours.
  if (!c.elite && rng.chance((pack.eliteOdds ?? 0.05) * (rival ? 0.6 : 0.25))) {
    const open = (pack.elite ?? []).filter((e) => npcApplies(state, e, c.professionId) && grade >= (e.minGrade ?? 0) && c.inField >= (e.minYears ?? 0) && c.awards.length >= (e.minAwards ?? 0));
    if (open.length) {
      const e = rng.pick(open);
      const label = nameFor(state, e, person) ?? 'a senior post';
      c.elite = { id: e.id, name: label, until: state.character.age + (e.years ?? 6) };
      const you = state.career?.job && packFor(state)?.id === pack.id;
      if (rival && you) {
        const v = vocationOf(state, pack);
        if (!v.history.includes(`elite.${e.id}`)) v.history.push(`elite.${e.id}`);
        ctx.log(`${person.name ?? name}, your rival, became ${label}. It was the post you had your eye on.`, '😤', 'warn');
      } else say(`${name} became ${label}.`, e.icon ?? '🏛️', 'good');
    }
  }
  return false;
}

/** People who had only a title (older saves, or the old list of modern jobs): a real profession for their day. */
export function migrateJob(rng, state, person, age, edu) {
  if (person.career || !person.job || person.service || /family business|^Owner, |part-time/.test(person.job)) return;
  const p = pickProfession(rng, state, person, edu);
  if (p) startCareer(rng, state, person, p, { age });
}
