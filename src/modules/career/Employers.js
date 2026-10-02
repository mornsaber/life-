/**
 * Employer generation: size, benefits package, union presence and the
 * annual training & education budget that pays for sponsored credentials
 * and tuition assistance.
 *
 * Public employers' budgets float with their government's finances: a city's
 * fiscal health or federal political stability (owned by the public-service
 * module, read here).
 */
import { REGIONS } from '../life/Regions.js';
import { EMPLOYER_SIZES } from './PayGrades.js';

const MUNICIPAL_SIZE_BY_REGION = { rural: 'small', smalltown: 'small', midcity: 'medium', sunbelt: 'large', chicago: 'enterprise', dc: 'large', nyc: 'enterprise', sf: 'enterprise' };

export const cityName = (regionId) => (REGIONS[regionId] ?? REGIONS.midcity).name.split(',')[0];

function pickSize(rng, profession, regionId) {
  if (profession.sector === 'municipal') return MUNICIPAL_SIZE_BY_REGION[regionId] ?? 'medium';
  if (profession.sector === 'federal') return rng.pick(['large', 'enterprise']);
  const entries = Object.entries(profession.sizes ?? { medium: 1 });
  return rng.weighted(entries, ([, w]) => w)[0];
}

function defaultBenefits(rng, profession, size, union) {
  const o = profession.benefits ?? {};
  switch (profession.sector) {
    case 'federal':
      return { health: true, pension: o.pension ?? 'fers', match: 0.05, dcPlan: 'TSP', tuition: 4000, housing: Boolean(o.housing), ssCovered: true };
    case 'municipal':
      return { health: true, pension: o.pension ?? 'municipal', match: o.match ?? 0, dcPlan: '457(b)', tuition: 2000, housing: false, ssCovered: o.ssCovered ?? true };
    case 'state':
      return { health: true, pension: o.pension ?? 'municipal', match: o.match ?? 0, dcPlan: o.dcPlan ?? '403(b)', tuition: 1500, housing: false, ssCovered: true };
    default: {
      const pension = union && o.unionPension ? o.unionPension : size === 'enterprise' && rng.chance(0.15) ? 'corporate' : null;
      return {
        health: size !== 'small' || rng.chance(0.5),
        pension,
        match: { small: 0.02, medium: 0.04, large: 0.05, enterprise: 0.06 }[size],
        dcPlan: '401(k)',
        tuition: { small: 0, medium: 2500, large: 5250, enterprise: 10000 }[size],
        housing: false,
        ssCovered: true,
      };
    }
  }
}

/** Training budget multiplier from the employer's government finances. */
export function publicBudgetFactor(state, sector) {
  if (sector === 'federal') {
    const fed = state.publicService.federal;
    return fed.shutdown ? 0.3 : 0.5 + fed.stability / 100;
  }
  if (sector === 'municipal' || sector === 'state') {
    const city = state.publicService.city;
    return city ? 0.5 + city.fiscalHealth / 100 : 1;
  }
  return 1;
}

export function createEmployer(rng, state, profession, regionId) {
  const size = pickSize(rng, profession, regionId);
  const unionDef = profession.union;
  const union = unionDef && rng.chance(unionDef.chance)
    ? { name: unionDef.name, strike: unionDef.strike, duesRate: 0.013, contractYearsLeft: rng.int(1, 3) }
    : null;
  let name;
  if (profession.employerName) name = profession.employerName(cityName(regionId), rng);
  else name = rng.pick(profession.employers);
  const benefits = defaultBenefits(rng, profession, size, union);
  const annual = Math.round(EMPLOYER_SIZES[size].budget * (profession.sector === 'private' ? 1 : 1.3) * publicBudgetFactor(state, profession.sector));
  return {
    id: rng.id('emp_'),
    name,
    cityName: profession.sector === 'municipal' || profession.sector === 'state' ? cityName(regionId) : null,
    size,
    sector: profession.sector,
    union,
    benefits,
    budget: { annual, left: annual },
    remote: Boolean(profession.remote),
  };
}

export function resetBudget(state, employer, sector) {
  const base = EMPLOYER_SIZES[employer.size].budget * (sector === 'private' ? 1 : 1.3);
  employer.budget.annual = Math.round(base * publicBudgetFactor(state, sector));
  employer.budget.left = employer.budget.annual;
}

export function benefitsSummary(benefits) {
  const parts = [];
  parts.push(benefits.health ? '🩺 Health insurance' : '🚫 No health plan');
  if (benefits.pension) parts.push(`🏦 Pension`);
  if (benefits.match > 0) parts.push(`💼 ${benefits.dcPlan} ${Math.round(benefits.match * 100)}% match`);
  else if (benefits.dcPlan) parts.push(`💼 ${benefits.dcPlan}`);
  if (benefits.tuition) parts.push(`🎓 $${benefits.tuition.toLocaleString()}/yr tuition`);
  if (benefits.housing) parts.push('🏡 Housing provided');
  if (!benefits.ssCovered) parts.push('⚠️ No Social Security');
  return parts;
}
