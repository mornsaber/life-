/**
 * Health and medicine of their day: what killed people, and what could be done about it, in the
 * year and place being played.
 *
 *   Treatments    anaesthesia (1846), antisepsis (1867), insulin (1922), antibiotics (1944),
 *                 streptomycin (1947), the polio vaccine (1955), dialysis, chemotherapy, HIV drugs
 *                 (1996), the hepatitis C cure (2014). Reaching poorer countries years later.
 *   Conditions    yours are deadlier before their treatment exists (diabetes before insulin,
 *                 HIV before 1996, kidney failure before dialysis); "treated" isn't safe either
 *                 before modern medicine (surgery before antisepsis, pneumonia before penicillin).
 *   Diseases      of the period: cholera, typhoid, tuberculosis, smallpox, diphtheria, scarlet
 *                 fever, measles, whooping cough, polio, malaria, syphilis. Vaccines once they
 *                 exist, for you and your children.
 *   Epidemics     on their dates: the cholera waves, the Russian flu (1889), the Spanish flu
 *                 (1918–20), the polio summers, the Asian and Hong Kong flus, COVID-19.
 *   Childbirth    a mother's risk by era: one birth in 120 killed its mother in 1900.
 *   Relatives     die at the rates of their day too: one child in five before five in 1880.
 *
 * Everything rolls on its own seed (state.periodHealth.seed), so the rest of a life is unchanged.
 * state.periodHealth = { seed, vaccinated: { [disease]: age }, had: { [disease]: age }, kidsVaccinated: { [personId]: [disease] } }
 */
import { clamp, Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';

const RICH = new Set(['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'NL', 'BE', 'LU', 'CH', 'AT', 'DK', 'SE', 'NO', 'FI', 'IS', 'IT', 'ES', 'JP', 'SG', 'IL']);
const MIDDLE = new Set(['PT', 'GR', 'CZ', 'PL', 'HU', 'RU', 'UA', 'AR', 'UY', 'CL', 'KR', 'TW', 'MX', 'BR', 'ZA', 'TR', 'CN', 'CR', 'PA', 'CU', 'MY', 'TH', 'LB', 'IR', 'MT', 'CY', 'EE', 'LV', 'LT', 'RO', 'BG', 'HR', 'RS', 'SI', 'SK', 'AE', 'KW', 'QA', 'BH', 'SA', 'OM', 'BN']);
const cc = (state) => state.character?.countryId ?? 'US';

/** How many years behind the rich world medicine arrives here (shrinking as the century goes on). */
export function medicineLag(state, country = cc(state)) {
  const y = yearNow(state);
  const base = RICH.has(country) ? 0 : MIDDLE.has(country) ? 10 : 22;
  return Math.round(base * clamp((2035 - y) / 150, 0.15, 1));
}

/** [id, name, year it was in general use in the rich world]. */
export const TREATMENTS = {
  vaccination: ['Smallpox vaccination', 1800],
  anaesthesia: ['Anaesthesia', 1846],
  antisepsis: ['Antiseptic surgery', 1870],
  sanitation: ['Clean water and sewers', 1890],
  xray: ['X-rays', 1897],
  diphtheriaVaccine: ['Diphtheria vaccine', 1925],
  insulin: ['Insulin', 1923],
  bloodBank: ['Blood transfusion', 1938],
  antibiotics: ['Antibiotics (penicillin)', 1944],
  streptomycin: ['A cure for tuberculosis', 1948],
  whoopingVaccine: ['Whooping cough vaccine', 1948],
  chemotherapy: ['Chemotherapy', 1955],
  polioVaccine: ['Polio vaccine', 1956],
  dialysis: ['Kidney dialysis', 1965],
  measlesVaccine: ['Measles vaccine', 1964],
  cardiacCare: ['Coronary care and bypass surgery', 1970],
  ct: ['CT scans', 1977],
  statins: ['Statins', 1988],
  haart: ['HIV drugs that work', 1996],
  hepCCure: ['A cure for hepatitis C', 2014],
};
/** Is a treatment in general use here, this year? */
export function available(state, id) {
  const t = TREATMENTS[id];
  if (!t) return true;
  return yearNow(state) >= t[1] + medicineLag(state);
}

/**
 * How much deadlier a condition was before its own treatment (multiplies its yearly risk). Only
 * the ones a single cure changed: the general toll of the past (heart disease, cancer) is already
 * in the era's death rates (world/Eras.js longevityFactor).
 */
const CONDITION_ERA = {
  diabetes: (s) => (available(s, 'insulin') ? 1 : 3.5),
  kidneyDisease: (s) => (available(s, 'dialysis') ? 1 : 3),
  hiv: (s) => (available(s, 'haart') ? 1 : 4),
  hepatitisC: (s) => (available(s, 'hepCCure') ? 1 : 1.5),
  tuberculosis: (s) => (available(s, 'streptomycin') ? 0.15 : 1),
  syphilis: (s) => (available(s, 'antibiotics') ? 0.1 : 1),
};
export const conditionEraFactor = (state, id) => (state?.era || yearNow(state) < PRESENT ? CONDITION_ERA[id]?.(state) ?? 1 : 1);

/** The chance that even treatment fails, for an acute illness or injury, in its day. */
export function treatedAcuteDeath(state, id) {
  const pre = (t) => !available(state, t);
  switch (id) {
    case 'appendicitis': return pre('antisepsis') ? 0.3 : pre('antibiotics') ? 0.06 : 0;
    case 'pneumonia': return pre('antibiotics') ? 0.15 : 0;
    case 'stabWound': case 'gunshotWound': return pre('antisepsis') ? 0.25 : pre('bloodBank') ? 0.1 : 0;
    case 'brokenBone': return pre('antisepsis') ? 0.02 : 0;
    case 'flu': return pre('antibiotics') ? 0.004 : 0;
    case 'carAccident': return pre('bloodBank') ? 0.06 : 0;
    default: return 0;
  }
}

/**
 * The diseases of the period: who catches them (yearly odds by age), how many die (before and
 * after treatment), the vaccine and the years and places they belong to. `chronic` becomes a
 * condition (people/health: tuberculosis, syphilis, polio's paralysis).
 */
export const DISEASES = {
  cholera: { name: 'Cholera', icon: '💧', until: 'sanitation', odds: (a) => 0.004, cfr: 0.45, treatedCfr: 0.3 },
  typhoid: { name: 'Typhoid fever', icon: '🌡️', until: 'sanitation', odds: (a) => (a < 40 ? 0.008 : 0.004), cfr: 0.12 },
  tuberculosis: { name: 'Tuberculosis (consumption)', icon: '🫁', untilTreat: 'streptomycin', odds: (a) => (a >= 15 && a < 45 ? 0.006 : 0.002), chronic: 'tuberculosis', toNow: 2.5 },
  smallpox: { name: 'Smallpox', icon: '🔴', vaccine: 'vaccination', end: 1977, odds: (a) => (a < 15 ? 0.006 : 0.002), cfr: 0.3 },
  diphtheria: { name: 'Diphtheria', icon: '🫁', vaccine: 'diphtheriaVaccine', odds: (a) => (a < 12 ? 0.015 : 0.001), cfr: 0.15, treatedCfr: 0.08 },
  scarletFever: { name: 'Scarlet fever', icon: '🔴', untilTreat: 'antibiotics', odds: (a) => (a < 12 ? 0.012 : 0.0005), cfr: 0.12 },
  measles: { name: 'Measles', icon: '🔴', vaccine: 'measlesVaccine', odds: (a) => (a < 10 ? 0.05 : 0.002), cfr: 0.015, treatedCfr: 0.004 },
  whoopingCough: { name: 'Whooping cough', icon: '😮‍💨', vaccine: 'whoopingVaccine', odds: (a) => (a < 6 ? 0.04 : 0.001), cfr: 0.04, treatedCfr: 0.01 },
  polio: { name: 'Polio', icon: '🦽', vaccine: 'polioVaccine', from: 1890, odds: (a) => (a < 15 ? 0.002 : 0.0004), cfr: 0.08, chronic: 'polioParalysis', chronicOdds: 0.25 },
  malaria: { name: 'Malaria', icon: '🦟', places: ['IN', 'NG', 'KE', 'GH', 'CD', 'MW', 'MZ', 'SN', 'ML', 'NE', 'TD', 'CF', 'SD', 'SS', 'ET', 'SO', 'ID', 'MM', 'TH', 'VN', 'KH', 'PH', 'PG', 'SB', 'VU', 'BR', 'CO', 'VE', 'PE', 'HT', 'GM', 'GW', 'LR', 'CI', 'BD', 'PK', 'AF', 'YE'], toNow: 1, odds: (a) => (a < 5 ? 0.06 : 0.02), cfr: 0.06, treatedCfr: 0.01 },
  syphilis: { name: 'Syphilis', icon: '🟤', untilTreat: 'antibiotics', adultsOnly: true, odds: (a) => (a >= 18 && a < 50 ? 0.002 : 0), chronic: 'syphilis' },
};
/** Is a disease still a threat here this year (and how much: cleaner water cuts it, a vaccine ends it)? */
export function threat(state, d) {
  const y = yearNow(state);
  if (d.from && y < d.from) return 0;
  if (d.end && y >= d.end) return 0;
  if (d.places && !d.places.includes(cc(state))) return 0;
  if (d.until && available(state, d.until)) return 0.05;
  // Curable now: far rarer where the cure reached everyone, still common where it didn't.
  if (d.untilTreat && available(state, d.untilTreat)) return RICH.has(cc(state)) ? 0.03 : d.toNow ? 0.3 : 0.15;
  return 1;
}

/**
 * The epidemics on their dates: [first year, last year, countries or '*'], how many catch it,
 * and how many die by age.
 */
export const EPIDEMICS = [
  { id: 'cholera1832', name: 'the cholera', years: [1831, 1833], where: '*', attack: 0.02, cfr: () => 0.45 },
  { id: 'cholera1849', name: 'the cholera', years: [1848, 1850], where: '*', attack: 0.02, cfr: () => 0.45 },
  { id: 'cholera1866', name: 'the cholera', years: [1866, 1867], where: '*', attack: 0.015, cfr: () => 0.4 },
  { id: 'russianFlu', name: 'the Russian flu', years: [1889, 1890], where: '*', attack: 0.3, cfr: (a) => (a > 60 ? 0.02 : 0.002) },
  { id: 'plague', name: 'the plague', years: [1896, 1910], where: ['IN', 'CN', 'HK'], attack: 0.006, cfr: () => 0.6 },
  { id: 'spanishFlu', name: 'the Spanish flu', years: [1918, 1919], where: '*', attack: 0.3, cfr: (a) => (a >= 18 && a < 40 ? 0.03 : a < 5 || a > 65 ? 0.02 : 0.012) },
  { id: 'polio1916', name: 'the polio epidemic', years: [1916, 1916], where: ['US'], attack: 0.003, cfr: (a) => (a < 10 ? 0.2 : 0.05), chronic: 'polioParalysis' },
  { id: 'polio1952', name: 'the polio summer', years: [1949, 1954], where: ['US', 'CA', 'GB', 'AU', 'NZ', 'DK', 'SE'], attack: 0.0015, cfr: (a) => (a < 15 ? 0.06 : 0.1), chronic: 'polioParalysis' },
  { id: 'asianFlu', name: 'the Asian flu', years: [1957, 1958], where: '*', attack: 0.2, cfr: (a) => (a > 65 ? 0.006 : 0.0005) },
  { id: 'hkFlu', name: 'the Hong Kong flu', years: [1968, 1969], where: '*', attack: 0.15, cfr: (a) => (a > 65 ? 0.005 : 0.0004) },
  { id: 'covid', name: 'COVID-19', years: [2020, 2022], where: '*', attack: 0.3, cfr: (a) => (a >= 80 ? 0.08 : a >= 70 ? 0.03 : a >= 60 ? 0.01 : a >= 40 ? 0.002 : 0.0002) },
];
export const epidemicsNow = (state) => EPIDEMICS.filter((e) => { const y = yearNow(state); return y >= e.years[0] && y <= e.years[1] && (e.where === '*' || e.where.includes(cc(state))); });

/** A child's yearly chance of dying, by age and year, in the rich world (then the lag for here). */
export function childMortality(state, age) {
  const y = yearNow(state) - medicineLag(state);
  const infant = y < 1870 ? 0.2 : y < 1900 ? 0.16 : y < 1920 ? 0.11 : y < 1940 ? 0.06 : y < 1960 ? 0.03 : y < 1980 ? 0.016 : y < 2000 ? 0.008 : 0.005;
  if (age < 1) return infant;
  if (age < 5) return infant * 0.22;
  return y < 1900 ? 0.006 : y < 1940 ? 0.003 : y < 1970 ? 0.0008 : 0.0003;
}
/** A mother's risk of dying in childbirth, by year (then the lag for here). */
export function maternalRisk(state) {
  const y = yearNow(state) - medicineLag(state);
  return y < 1880 ? 0.009 : y < 1937 ? 0.006 : y < 1950 ? 0.003 : y < 1970 ? 0.0006 : y < 1990 ? 0.0002 : 0.00015;
}
/** What a child who died young most likely died of, in their day. */
export function childCause(state, age, rng) {
  const y = yearNow(state) - medicineLag(state);
  const pool = y < 1950 ? (age < 1 ? ['diarrhoea and fever', 'a fever', 'convulsions', 'whooping cough', 'being born too early'] : ['diphtheria', 'scarlet fever', 'measles', 'whooping cough', 'a fever', ...(y >= 1890 ? ['polio'] : [])])
    : age < 1 ? ['being born too early', 'an infection'] : ['an accident', 'an infection', 'cancer'];
  return rng.pick(pool);
}
export const childbirthCause = (state) => (available(state, 'antibiotics') ? 'complications of childbirth' : 'childbed fever after the birth');

/** Its own stream, so the rest of the life rolls as it always did. */
export function periodRng(state) {
  state.periodHealth ??= { vaccinated: {}, had: {}, kidsVaccinated: {} };
  const s = state.periodHealth;
  s.seed = ((s.seed ?? (((state.world?.seed ?? 1) * 40503) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(s.seed);
}

/** The vaccines you can have now (and haven't). */
export const vaccinesOpen = (state) => Object.entries(DISEASES).filter(([id, d]) => d.vaccine && available(state, d.vaccine) && threat(state, d) > 0 && !state.periodHealth?.vaccinated?.[id]).map(([id, d]) => ({ id, name: d.name, treatment: TREATMENTS[d.vaccine][0] }));

/** A year of the diseases of the day, for you. */
function yourYear(ctx, rng) {
  const { state } = ctx;
  const age = state.character.age;
  const ph = state.periodHealth;
  // Vaccines in general use: most children get them; adults when they ask.
  for (const [id, d] of Object.entries(DISEASES)) if (d.vaccine && age < 6 && available(state, d.vaccine) && !ph.vaccinated[id] && rng.chance(0.85)) ph.vaccinated[id] = age;
  for (const [id, d] of Object.entries(DISEASES)) {
    const t = threat(state, d);
    if (!t || ph.vaccinated[id] != null || ph.had[id] != null && !d.chronic) continue;
    if (d.adultsOnly && age < 18) continue;
    if (!rng.chance(d.odds(age) * t)) continue;
    ph.had[id] = age;
    if (d.chronic && !d.cfr) {
      ctx.emit('health:addCondition', { id: d.chronic, severity: rng.int(30, 60) });
      return ctx.log(`You have ${d.name.toLowerCase()}.${!available(state, d.untilTreat ?? 'antibiotics') ? ' There is no cure yet: rest, good food and hope.' : ' It can be treated now.'}`, d.icon, 'bad');
    }
    // You're the life being lived: a child's diseases spare you more often than they did others (but not always).
    const cfr = (d.treatedCfr != null && available(state, 'antibiotics') ? d.treatedCfr : d.cfr) * (age < 15 ? 0.5 : age > 65 ? 1.4 : 1) * (state.stats.health < 40 ? 1.5 : state.stats.health > 75 ? 0.7 : 1);
    if (rng.chance(cfr)) return void ctx.die(d.name);
    // Children mostly bounce back; adults take longer.
    ctx.stat('health', -(age < 15 ? rng.int(2, 6) : rng.int(5, 12)));
    if (d.chronic && rng.chance(d.chronicOdds ?? 0.3)) ctx.emit('health:addCondition', { id: d.chronic, severity: rng.int(30, 60) });
    return ctx.log(`You caught ${d.name.toLowerCase()} and pulled through.`, d.icon, 'warn');
  }
  // The epidemic of the year.
  for (const e of epidemicsNow(state)) {
    if (ph.had[e.id] != null || !rng.chance(e.attack)) continue;
    ph.had[e.id] = age;
    if (rng.chance(e.cfr(age) * (state.stats.health < 40 ? 1.6 : 1))) return void ctx.die(e.name.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase()));
    ctx.stat('health', -(age < 15 ? rng.int(2, 5) : rng.int(4, 10)));
    if (e.chronic && rng.chance(0.25)) ctx.emit('health:addCondition', { id: e.chronic, severity: rng.int(30, 60) });
    return ctx.log(`You caught ${e.name} and came through it.`, '🤒', 'warn');
  }
}

/** The epidemic reaches the family: some of them die of it. */
function familyEpidemics(ctx, rng, people, personDies) {
  const { state } = ctx;
  for (const e of epidemicsNow(state)) {
    for (const p of people) {
      if (!p.alive || (p.had ?? {})[e.id] != null) continue;
      if (!rng.chance(e.attack)) continue;
      (p.had ??= {})[e.id] = true;
      const age = state.character.age + p.ageOffset;
      if (age >= 0 && rng.chance(e.cfr(age))) personDies(ctx, p, e.name.replace(/^the /, ''));
    }
  }
}

export const PeriodHealthModule = {
  id: 'periodHealth',
  order: 42.5,

  init(state) { state.periodHealth ??= { vaccinated: {}, had: {}, kidsVaccinated: {} }; },

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive || yearNow(state) >= PRESENT + 1) return;
    const rng = periodRng(state);
    yourYear(ctx, rng);
    if (state.people?.list) familyEpidemics(ctx, rng, state.people.list, (c, person, cause) => c.emit('people:dies', { person, cause }));
  },

  actions: {
    /** arg: disease id — have the vaccine yourself. */
    vaccinate(ctx, id) {
      const { state } = ctx;
      const open = vaccinesOpen(state).find((v) => v.id === id);
      if (!open) return ctx.toast('Not available.', 'warn');
      if (!ctx.spend(40, `${open.treatment}`, { credit: true })) return ctx.toast('It costs $40.', 'warn');
      state.periodHealth.vaccinated[id] = state.character.age;
      ctx.log(`You had the ${open.treatment.toLowerCase()}.`, '💉', 'good');
    },
  },
};
