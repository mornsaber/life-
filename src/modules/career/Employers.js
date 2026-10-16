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
import { STATES } from '../life/States.js';
import { attachOrg, orgOf } from '../org/Organizations.js';
import { cityPopulation } from '../org/Staffing.js';
import { GOV_SECTORS } from './Ladder.js';
import { rightToWork } from './LaborUnions.js';
import { lawValue } from '../politics/Laws.js';
import { unionLaw } from './BargainingUnits.js';
import { regionsInState } from '../life/Regions.js';
import { localUnionName } from '../world/CountryLaw.js';
import { PENSION_PLANS, localPlanId } from '../retirement/PensionPlans.js';
import { isNationalService } from '../world/LocalAgencies.js';


export const cityName = (regionId) => (REGIONS[regionId] ?? REGIONS.midcity).name.split(',')[0];

export const stateNameOf = (regionId) => STATES[(REGIONS[regionId] ?? REGIONS.midcity).state].name;

/** Where a job with a duty station puts you (null = where you already live). */
export function resolveDutyStation(rng, profession, regionId) {
  const stateId = (REGIONS[regionId] ?? REGIONS.midcity).state;
  const inState = regionsInState(stateId);
  if (profession.dutyStation === 'statewide') return rng.pick(inState).id;
  if (profession.dutyStation === 'stateRural') return (inState.find((r) => r.type === 'Rural') ?? rng.pick(inState)).id;
  return profession.dutyStation ?? null;
}

/** Local government size from the city's population (not a hand-picked label). */
export function citySize(regionId) {
  const pop = cityPopulation(regionId);
  return pop < 60000 ? 'small' : pop < 400000 ? 'medium' : pop < 1500000 ? 'large' : 'enterprise';
}

/** A government department's size bucket from how many people it actually employs. */
export function governmentTier(state, employer, profession) {
  if (!GOV_SECTORS.includes(profession.sector) || ['college', 'university', 'nationalLab', 'research', 'courts'].includes(profession.id)) return null;
  const n = orgOf(state, employer)?.departments?.[employer.deptId]?.headcount;
  if (!n) return null;
  return n < 40 ? 'micro' : n < 300 ? 'small' : n < 2500 ? 'medium' : n < 8000 ? 'large' : n < 15000 ? 'enterprise' : 'mega';
}

/** Countries whose police (the "statePolice" career) is one national force. */
export const NATIONAL_POLICE = ['NZ', 'IE', 'SG', 'IL', 'PS', 'FR', 'ES', 'NL', 'SE', 'KR', 'KE', 'NG', 'ID', 'PH'];

/** Is this employer part of a single national body (a national police force or service, a federal or national agency)? */
export function nationalBody(state, employer, profession) {
  if (!GOV_SECTORS.includes(profession.sector)) return false;
  const cc = state.character?.countryId ?? 'US';
  if (employer.national || orgOf(state, employer)?.national) return true;
  if (isNationalService(cc, profession.id)) return true;
  if (profession.id === 'statePolice' && NATIONAL_POLICE.includes(cc)) return true;
  // National agencies abroad (gb_fbi → the NCA) and US federal agencies.
  return Boolean(profession.country) || profession.sector === 'federal';
}

function pickSize(rng, profession, regionId) {
  if (profession.stateAgency) return STATES[(REGIONS[regionId] ?? REGIONS.midcity).state].population;
  if (profession.sector === 'municipal') return citySize(regionId);
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
      return { health: true, pension: o.pension ?? 'stateGov', match: o.match ?? 0, dcPlan: o.dcPlan ?? '457(b)', tuition: 3000, housing: false, ssCovered: o.ssCovered ?? true };
    default: {
      const pension = union && o.unionPension ? o.unionPension : size === 'enterprise' && rng.chance(0.15) ? 'corporate' : null;
      // About half of small businesses offer no retirement plan at all.
      const offersPlan = size === 'small' ? rng.chance(0.5) : size === 'medium' ? rng.chance(0.85) : true;
      return {
        health: size !== 'small' || rng.chance(0.5),
        pension,
        match: offersPlan ? { small: 0.02, medium: 0.035, large: 0.045, enterprise: 0.05 }[size] : 0,
        dcPlan: offersPlan ? '401(k)' : null,
        tuition: { small: 0, medium: 2500, large: 5250, enterprise: 10000 }[size],
        housing: Boolean(o.housing),
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
  if (sector === 'municipal') {
    const city = state.publicService.city;
    return city ? 0.5 + city.fiscalHealth / 100 : 1;
  }
  return 1;
}

export function createEmployer(rng, state, profession, regionId) {
  const size = pickSize(rng, profession, regionId);
  // Abroad, the country's own union for that kind of work (or none where it's barred).
  const cc = REGIONS[regionId]?.country;
  const localName = profession.union ? localUnionName(cc, profession.union.name) : null;
  const unionDef = localName ? { ...profession.union, name: localName } : null;
  // Right-to-work states have roughly half the union density.
  const rtw = rightToWork(state, REGIONS[regionId]?.state ?? 'IL');
  // Government workplaces unionize only where the state lets public employees bargain.
  const publicOk = profession.sector === 'private' || profession.sector === 'federal' || lawValue(state, 'publicBargaining', REGIONS[regionId]?.state ?? 'IL') !== false;
  // Country (and state) labour law: barred, a staff association, or a union that may or may not strike.
  const law = unionDef ? unionLaw(cc, profession, { publicBargaining: publicOk }) : null;
  const union = unionDef && !law.banned && rng.chance(unionDef.chance * (rtw ? 0.5 : 1) * (law.association ? 1.2 : 1))
    ? { name: law.name ?? unionDef.name, strike: law.strike, ...(law.association ? { association: true } : {}), duesRate: law.association ? 0.008 : 0.013, agencyFee: !rtw && !law.association, contractYearsLeft: rng.int(1, 3) }
    : null;
  let name;
  if (profession.employerName) name = profession.employerName(cityName(regionId), rng, stateNameOf(regionId), REGIONS[regionId]?.state);
  else name = rng.pick(profession.employers);
  // A service the government has merged hires under its new name.
  const merged = state.world?.serviceMergers?.[regionId]?.[profession.id]?.name;
  if (merged) name = merged;
  const benefits = defaultBenefits(rng, profession, size, union);
  // Abroad, public servants join the country's own scheme (or none: a defined-contribution pot).
  if (cc && cc !== 'US' && benefits.pension) {
    benefits.pension = localPlanId(cc, benefits.pension);
    if (benefits.pension && PENSION_PLANS[benefits.pension]?.ssCovered === false) benefits.ssCovered = false;
    // No defined-benefit plan: the employer pays into your pot instead (super, KiwiSaver, the NPS, ISSSTE).
    if (!benefits.pension) benefits.match = Math.max(benefits.match ?? 0, { AU: 0.154, NZ: 0.03, IN: 0.14, MX: 0.065 }[cc] ?? 0);
  }
  const annual = Math.round(EMPLOYER_SIZES[size].budget * (profession.sector === 'private' ? 1 : 1.3) * publicBudgetFactor(state, profession.sector));
  const employer = {
    id: rng.id('emp_'),
    name,
    cityName: profession.sector === 'municipal' ? cityName(regionId) : null,
    // Where the job is (units are named after it: the Nashville Field Office, the Leeds Division).
    city: cityName(regionId),
    stateId: (REGIONS[regionId] ?? REGIONS.midcity).state,
    size,
    sector: profession.sector,
    union,
    benefits,
    budget: { annual, left: annual },
    remote: Boolean(profession.remote),
  };
  // Every employer is a department of a persistent organization.
  attachOrg(state, employer, profession, regionId);
  if (merged && cc && cc !== 'US') employer.division = `${cityName(regionId)} ${profession.id === 'police' ? 'Division' : 'Area'}`;
  // A national service (FENZ, the PNP): you work for the nation's body, posted to your area.
  const body = orgOf(state, employer);
  if (body?.national) {
    employer.national = true;
    // (Where the employer is already the unit — "Busan Fire Headquarters" — that's the division.)
    if (!employer.division && body.name === employer.name) employer.division = `${cityName(regionId)} ${profession.id === 'police' ? 'District' : profession.id === 'ems' ? 'Ambulance Station' : 'District'}`;
  }
  // Government agencies: their size — and so their rank structure — follows the department's real headcount.
  const tier = governmentTier(state, employer, profession);
  if (tier) {
    employer.size = tier;
    employer.agencyStaff = orgOf(state, employer)?.departments?.[employer.deptId]?.headcount ?? null;
  }
  // A national force or agency has the whole national rank structure, wherever you're posted
  // (your posting's headcount still sizes the unit you command).
  if (nationalBody(state, employer, profession)) employer.size = 'mega';
  return employer;
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
