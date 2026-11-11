/**
 * Schooling of its day: how long children stayed at school, whether they went at all, and who
 * got to university, by country and year.
 *
 *   Leaving age   the law and the custom: ten in Britain before compulsory schooling, fourteen
 *                 until 1947, fifteen until 1972; thirteen in France until 1936; fourteen in
 *                 Germany's Volksschule into the 1960s; six years in Japan before 1907.
 *   Never at school  in the nineteenth century, and in poor countries long after, many children
 *                 never went: you grow up unable to read. Evening classes can still teach you.
 *   School fees   before free schooling (France 1881, Britain 1891), the family paid its pennies.
 *   The exam at 11  Britain's eleven-plus (1944–76), the Gymnasium at ten in Germany and Austria,
 *                 France's lycée entrance before 1959: pass, and the academic school leads to
 *                 university; fail, and school ends at the leaving age.
 *   University    open to women from their dates (Zurich 1867, London 1878, Germany 1908…); before
 *                 the Second World War, for the well-off and a handful of scholarship winners.
 *
 * state.schooling = { seed, unschooled, literate, track, examTaken, feesPaid }
 * Its own random stream: the rest of the year rolls as it always did.
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT, setLeavingAge, setUniversityGate } from '../world/Eras.js';
import { demographyAt } from '../world/HistoricalData.js';
import { ADMISSION_HOOKS } from './EducationEngine.js';

const cc = (state) => state.character?.countryId ?? 'US';

/** [until year, leaving age] by country; after the last row school runs to 16–18 (no early leaving). */
const LEAVING = {
  GB: [[1880, 10], [1893, 11], [1899, 12], [1918, 13], [1947, 14], [1972, 15]], IE: [[1892, 10], [1926, 12], [1972, 14]],
  US: [[1890, 12], [1918, 13], [1940, 14]], CA: [[1890, 12], [1920, 14], [1950, 15]], AU: [[1880, 12], [1940, 14], [1964, 15]], NZ: [[1877, 12], [1944, 14]],
  FR: [[1882, 11], [1936, 13], [1959, 14], [1967, 15]], BE: [[1914, 12], [1983, 14]], NL: [[1901, 11], [1969, 14]],
  DE: [[1919, 14], [1969, 15]], AT: [[1869, 12], [1962, 14]], CH: [[1874, 12], [1960, 15]], IT: [[1877, 9], [1923, 10], [1962, 14]], ES: [[1909, 9], [1964, 12], [1970, 14]], PT: [[1956, 10], [1964, 12], [1986, 14]],
  SE: [[1842, 9], [1962, 14]], NO: [[1889, 13], [1969, 14]], DK: [[1972, 14]], FI: [[1921, 11], [1970, 14]], JP: [[1907, 10], [1947, 12]], KR: [[1953, 12], [1985, 15]],
  RU: [[1930, 11], [1958, 14]], PL: [[1919, 11], [1966, 14]], CN: [[1949, 10], [1986, 12]], IN: [[1950, 10], [2009, 12]], BR: [[1934, 10], [1971, 11], [1996, 14]],
  MX: [[1934, 10], [1993, 12]], AR: [[1884, 10], [1968, 12]], ZA: [[1950, 12], [1996, 15]], TR: [[1924, 10], [1997, 11]], EG: [[1950, 10], [1981, 12]],
};
/** When elementary school stopped charging fees. */
const FREE_FROM = { GB: 1891, IE: 1892, US: 1870, FR: 1881, DE: 1888, AT: 1869, IT: 1877, NL: 1901, SE: 1842, JP: 1900, RU: 1918, ES: 1857, BE: 1914, CH: 1874, CA: 1871, AU: 1872, NZ: 1877 };
/** When universities first admitted women to degrees there. */
const WOMEN_UNI = { CH: 1867, US: 1837, GB: 1878, IE: 1880, FR: 1880, NL: 1871, SE: 1873, DK: 1875, FI: 1870, NO: 1882, IT: 1876, BE: 1880, CA: 1875, AU: 1880, NZ: 1877, IN: 1883, BR: 1879, AR: 1885, AT: 1897, DE: 1908, ES: 1910, PT: 1911, RU: 1905, JP: 1913, CN: 1920, TR: 1914, KR: 1945, EG: 1929, MX: 1910, ZA: 1880, GR: 1890, PL: 1894, HU: 1895, CZ: 1897 };
/** Selective schooling at 10–11: [from, until, age, academic school, the rest]. */
const TRACKS = {
  GB: [1944, 1976, 11, 'grammar school', 'secondary modern'], IE: [1900, 1967, 12, 'secondary school (fee-paying)', 'national school to fourteen'],
  DE: [1800, PRESENT, 10, 'Gymnasium', 'Hauptschule'], AT: [1800, PRESENT, 10, 'Gymnasium', 'Hauptschule'], CH: [1800, PRESENT, 12, 'Gymnasium', 'Sekundarschule'],
  FR: [1800, 1959, 11, 'lycée', 'école primaire supérieure'], NL: [1800, PRESENT, 12, 'gymnasium (VWO)', 'vocational school (VMBO)'], BE: [1800, 1970, 12, 'athénée', 'école moyenne'],
  IT: [1859, 1963, 11, 'ginnasio', 'avviamento professionale'], JP: [1886, 1947, 12, 'middle school (chūgakkō)', 'higher elementary school'], SE: [1800, 1962, 11, 'läroverk', 'folkskola'],
};

/** The age most children left school this year where you live (null: school runs to the end). */
export function leavingAgeHere(state) {
  const y = yearNow(state);
  if (!state?.era || y >= PRESENT) return null;
  const rows = LEAVING[cc(state)];
  if (rows) return rows.find(([until]) => y < until)?.[1] ?? null;
  // Elsewhere: by how rich the country was.
  const gdp = demographyAt(cc(state), y)?.gdp ?? 3000;
  return y < 1900 ? 10 : gdp < 2500 ? (y < 1990 ? 11 : 12) : y < 1950 ? 12 : y < 1975 ? 14 : null;
}
/** How likely a child here and now was to go to school at all (by year and the country's wealth). */
export function enrolment(state) {
  const y = yearNow(state);
  if (!state?.era || y >= PRESENT) return 1;
  if (FREE_FROM[cc(state)] && y >= FREE_FROM[cc(state)] + 10) return 0.98;
  const gdp = demographyAt(cc(state), y)?.gdp ?? 3000;
  const base = y < 1850 ? 0.35 : y < 1900 ? 0.5 : y < 1950 ? 0.7 : y < 1980 ? 0.85 : 0.95;
  return Math.min(0.99, base * (gdp > 6000 ? 1.4 : gdp > 3000 ? 1.15 : gdp < 1500 ? 0.75 : 1));
}
export const trackHere = (state) => { const t = TRACKS[cc(state)]; const y = yearNow(state); return t && y >= t[0] && y < t[1] ? { age: t[2], academic: t[3], general: t[4] } : null; };
export const womenAtUniversity = (state) => yearNow(state) >= (WOMEN_UNI[cc(state)] ?? 1920);

const schrng = (state) => {
  state.schooling ??= {};
  state.schooling.seed = ((state.schooling.seed ?? (((state.world?.seed ?? 9) * 1597334677) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(state.schooling.seed);
};

// The era's leaving age (world/History.js asks Eras.leavingAge) is now the place's.
setLeavingAge(leavingAgeHere);
// Women at university: by the country's own date, not one date for the world.
setUniversityGate((state) => (state.character.gender === 'female' && !womenAtUniversity(state) ? 'The universities here don\'t admit women yet' : null));
// Before the Second World War, university was for the well-off, scholarship winners and the academic schools.
ADMISSION_HOOKS.push({
  eligibility(state, programId) {
    if (!state.era || yearNow(state) >= 1945 || !['bachelor', 'master', 'phd', 'jd', 'md'].includes(programId)) return null;
    const s = state.schooling ?? {};
    if (s.unschooled && !s.literate) return 'You never learned to read';
    if (s.track === 'general') return 'University takes boys and girls from the academic schools';
    if (state.people?.wealth !== 'upper' && state.stats.smarts < 78) return 'A university place needs money or a scholarship (smarts 78+)';
    return null;
  },
});

export const SchoolingModule = {
  id: 'schooling',
  order: 8.9,
  init(state) { state.schooling ??= {}; },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.era || yearNow(state) >= PRESENT) return;
    const s = state.schooling;
    const age = state.character.age;
    const rng = schrng(state);
    const k = state.k12;
    // Six: school, or none.
    if (age === 6 && s.unschooled == null) {
      s.unschooled = !rng.chance(enrolment(state));
      if (s.unschooled) {
        s.literate = false;
        if (k) { k.dropout = true; k.done = false; }
        ctx.log(state.people?.wealth === 'low' ? 'There was no school for you: your family needed you at home and in the fields.' : 'There was no school near enough to go to.', '🌾', 'warn');
        ctx.stat('smarts', -4);
      } else {
        s.literate = true;
        const free = FREE_FROM[cc(state)];
        if (free && yearNow(state) < free && state.people?.wealth !== 'upper') { s.feesPaid = true; ctx.log('You started school. Your family pays the schoolmaster a few pennies a week.', '🪙', 'info'); }
      }
    }
    // The exam at ten or eleven.
    const t = trackHere(state);
    if (t && age === t.age && !s.examTaken && !s.unschooled && k && !k.done) {
      s.examTaken = age;
      const pass = state.stats.smarts + rng.int(-12, 12) + (state.people?.wealth === 'upper' ? 8 : 0) >= 62;
      s.track = pass ? 'academic' : 'general';
      ctx.log(pass ? `You passed the exam for the ${t.academic}: Latin, mathematics, and a road to university.` : `You didn't pass for the ${t.academic}. It's the ${t.general} for you, and work at the leaving age.`, pass ? '📜' : '📘', pass ? 'milestone' : 'info');
      ctx.stat('happiness', pass ? 4 : -3);
    }
  },
  actions: {
    /** Evening classes: learn to read as an adult. */
    literacy(ctx) {
      const { state } = ctx;
      const s = state.schooling ?? {};
      if (s.literate !== false) return ctx.toast('You can read.', 'info');
      if (state.character.age < 14) return ctx.toast('Classes are for older pupils.', 'warn');
      if (!ctx.spend(150, 'Evening classes', { credit: true })) return ctx.toast('The classes cost $150.', 'warn');
      s.literate = true;
      ctx.stat('smarts', 3);
      ctx.stat('happiness', 4);
      ctx.log('A year of evening classes after work: you can read and write.', '📖', 'milestone');
    },
  },
};
