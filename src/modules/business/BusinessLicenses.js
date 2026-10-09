/**
 * Licenses a business needs to operate, separate from the owner's own
 * professional credentials (a master plumber's license lets *you* plumb; a
 * state contractor's license lets *the company* bid jobs).
 *
 * Every business holds a general business license; most types need one or
 * more industry licenses to open. Optional licenses unlock revenue: a liquor
 * license, government-contractor registration, Medicare certification,
 * accreditation. Licenses renew on a schedule (paid from the business
 * account), can be suspended after failed inspections or board complaints,
 * and a business operating without a required license is fined and, if it
 * doesn't fix it, shut down.
 *
 * Fields:
 *   types        business types it applies to ('*' = all)
 *   required     needed to open and operate (otherwise optional)
 *   fee          to obtain; renewal  { years, fee }
 *   processing   years before an application is granted (0 = at once)
 *   needs        { experience: yrs in the type's careers, ownerCredentials: anyOf, cleanRecord, minYears: business age }
 *   effect       { revenue: ×, demand: ×, reputation: +, quality: + } while active
 *   chance       approval odds (quota licenses — liquor, limited-entry permits)
 *
 * biz.licenses = { [id]: { status: 'active'|'pending'|'suspended'|'lapsed', since, renewAge, readyAge?, until? } }
 */
import { clamp } from '../../core/Random.js';
import { hasFelony } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { credentialName } from '../credentials/CredentialRegistry.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { charge } from './TaxBook.js';

export const BUSINESS_LICENSES = {
  businessLicense: { name: 'General Business License', icon: '📃', types: '*', required: true, fee: 150, renewal: { years: 1, fee: 100 }, desc: 'City/county license every business needs, plus a sales-tax permit where it applies.' },
  // Construction and trades
  contractorLicense: { name: "State Contractor's License", icon: '🏗️', types: ['electrical', 'plumbing', 'hvacContractor', 'constructionCo', 'homeBuilder', 'demolitionCo', 'roofing', 'excavation'], required: true, fee: 1500, renewal: { years: 2, fee: 600 }, needs: { experience: 4 }, desc: 'Lets the company bid and pull permits. Requires a qualifying individual with four years in the trade, a bond and liability insurance.' },
  // Food and drink
  foodPermit: { name: 'Food Service Permit', icon: '🧾', types: ['foodTruck', 'restaurant', 'catering'], required: true, fee: 900, renewal: { years: 1, fee: 600 }, desc: 'Health-department permit; failed inspections can suspend it.' },
  liquorLicense: { name: 'Liquor License', icon: '🍷', types: ['restaurant', 'catering'], required: false, fee: 25000, renewal: { years: 1, fee: 1500 }, processing: 1, chance: 0.6, needs: { cleanRecord: true }, effect: { revenue: 1.14 }, desc: 'Beer, wine and spirits: higher checks. Licenses are capped by quota, so approval isn\'t guaranteed; a felony disqualifies you.' },
  // Personal services
  salonLicense: { name: 'Salon Establishment License', icon: '💈', types: ['salon'], required: true, fee: 250, renewal: { years: 2, fee: 150 }, desc: 'State cosmetology board license for the shop itself.' },
  // Security and investigations
  securityAgencyLicense: { name: 'Private Security Agency License', icon: '🛡️', types: ['securityCompany'], required: true, fee: 2500, renewal: { years: 2, fee: 1200 }, needs: { experience: 3, cleanRecord: true }, desc: 'Agency license with a qualified manager, a bond and insurance; background checks for the principals.' },
  piAgencyLicense: { name: 'Private Investigation Agency License', icon: '🕵️', types: ['piAgency'], required: true, fee: 1200, renewal: { years: 2, fee: 600 }, needs: { cleanRecord: true }, desc: 'Agency license (on top of your own PI license).' },
  // Health care
  homeHealthLicense: { name: 'Home Health Agency License', icon: '🏠', types: ['homeHealth'], required: true, fee: 8000, renewal: { years: 1, fee: 2500 }, desc: 'State licensure survey before you can see patients (done as part of opening).' },
  medicareCertification: { name: 'Medicare Certification', icon: '🏥', types: ['homeHealth', 'ptClinic', 'practice', 'ambulanceService'], required: false, fee: 6000, renewal: { years: 3, fee: 3000 }, processing: 1, needs: { minYears: 1 }, effect: { demand: 1.18 }, desc: 'Bill Medicare: a much bigger patient base, after an accreditation survey.' },
  pharmacyPermit: { name: 'Pharmacy Permit & DEA Registration', icon: '💊', types: ['pharmacyStore'], required: true, fee: 1400, renewal: { years: 2, fee: 1000 }, needs: { cleanRecord: true }, desc: 'Board of Pharmacy permit plus DEA registration to dispense controlled substances.' },
  ptClinicLicense: { name: 'Outpatient Clinic Registration', icon: '🦵', types: ['ptClinic', 'counselingPractice'], required: true, fee: 500, renewal: { years: 2, fee: 300 }, desc: 'State facility registration.' },
  // Professional firms
  cpaFirmPermit: { name: 'CPA Firm Permit & Peer Review', icon: '🧮', types: ['cpaFirm'], required: true, fee: 600, renewal: { years: 3, fee: 2500 }, desc: 'Firm registration with the state board; attest work needs peer review.' },
  brokerageLicense: { name: 'Real Estate Brokerage License', icon: '🏘️', types: ['brokerage'], required: true, fee: 400, renewal: { years: 2, fee: 300 }, desc: 'The firm\'s license, held through its designated broker.' },
  insuranceAgencyLicense: { name: 'Insurance Agency License', icon: '📄', types: ['insuranceAgency'], required: true, fee: 300, renewal: { years: 2, fee: 200 }, desc: 'Entity license and carrier appointments.' },
  // Transportation
  usdotAuthority: { name: 'USDOT Number & Operating Authority', icon: '🚛', types: ['trucking', 'courier', 'towing', 'busCharter', 'movingCompany', 'wasteHauling'], required: true, fee: 600, renewal: { years: 2, fee: 300 }, desc: 'Federal registration and for-hire authority, with required liability insurance.' },
  part135: { name: 'FAA Part 135 Air Carrier Certificate', icon: '🛩️', types: ['charterOperator'], required: true, fee: 40000, renewal: { years: 2, fee: 5000 }, needs: { experience: 5 }, desc: 'Air carrier certificate: manuals, check airmen and FAA certification — completed before you fly paying passengers.' },
  // Marine
  fishingPermit: { name: 'Commercial Fishing Permit', icon: '🎣', types: ['fishingBoat'], required: true, fee: 1500, renewal: { years: 1, fee: 800 }, desc: 'Vessel and fishery permits.' },
  limitedEntryPermit: { name: 'Limited-Entry Fishery Permit', icon: '🦀', types: ['fishingBoat'], required: false, fee: 120000, renewal: { years: 1, fee: 1500 }, chance: 0.5, effect: { revenue: 1.3 }, desc: 'Access to a closed, lucrative fishery (crab, halibut). Permits rarely come up for sale.' },
  // Education
  schoolRegistration: { name: 'State Private School Registration', icon: '🏫', types: ['privateSchool'], required: true, fee: 2000, renewal: { years: 1, fee: 500 }, desc: 'Registration, fire and health inspections, and teacher background checks.' },
  accreditation: { name: 'Accreditation', icon: '🎓', types: ['privateSchool', 'tutoring', 'testPrep', 'daycare'], required: false, fee: 18000, renewal: { years: 5, fee: 8000 }, processing: 1, needs: { minYears: 2 }, effect: { demand: 1.12, reputation: 6 }, desc: 'A recognized accreditor\'s seal: parents pay more and stay longer.' },
  // Auto
  repairFacility: { name: 'Automotive Repair Facility Registration', icon: '🔧', types: ['autoShop'], required: true, fee: 250, renewal: { years: 1, fee: 200 }, desc: 'State registration for repair shops.' },
  inspectionStation: { name: 'State Inspection Station', icon: '✅', types: ['autoShop'], required: false, fee: 3000, renewal: { years: 2, fee: 500 }, effect: { demand: 1.08 }, desc: 'Do state safety/emissions inspections: steady walk-in work.' },
  // Care, funeral, design and staffing
  childcareLicense: { name: 'Child Care Center License', icon: '🧸', types: ['daycare'], required: true, fee: 1500, renewal: { years: 1, fee: 400 }, needs: { cleanRecord: true }, desc: 'State licensing: staff ratios, background checks, fire and health inspections.' },
  funeralEstablishment: { name: 'Funeral Establishment License', icon: '⚱️', types: ['funeralHome'], required: true, fee: 1000, renewal: { years: 1, fee: 500 }, desc: 'The funeral home itself is licensed and inspected, with a licensed funeral director in charge.' },
  homeCareLicense: { name: 'Home Care Agency License', icon: '🤲', types: ['homeCareAgency'], required: true, fee: 2500, renewal: { years: 2, fee: 1000 }, needs: { cleanRecord: true }, desc: 'State license for non-medical home care, with caregiver background checks.' },
  architectureFirmRegistration: { name: 'Architecture Firm Registration', icon: '🏛️', types: ['architecturePractice'], required: true, fee: 400, renewal: { years: 2, fee: 300 }, desc: 'Firms offering architecture are registered with the state board under a licensed architect.' },
  employmentAgencyLicense: { name: 'Employment Agency License & Surety Bond', icon: '🧑‍💼', types: ['staffingAgency'], required: true, fee: 1000, renewal: { years: 1, fee: 400 }, desc: 'Staffing firms are licensed and bonded in most states.' },
  // Fleet, field-service and other career-born businesses
  ambulanceLicense: { name: 'State EMS Agency License', icon: '🚑', types: ['ambulanceService'], required: true, fee: 5000, renewal: { years: 1, fee: 1500 }, needs: { cleanRecord: true }, desc: 'The state EMS office licenses the service and inspects every ambulance.' },
  nemtPermit: { name: 'NEMT Provider Enrollment', icon: '♿', types: ['nemt'], required: true, fee: 800, renewal: { years: 2, fee: 400 }, desc: 'Medicaid provider enrollment and vehicle inspections for wheelchair vans.' },
  part141: { name: 'FAA Part 141 Pilot School Certificate', icon: '🛩️', types: ['flightSchool'], required: false, fee: 15000, renewal: { years: 2, fee: 2000 }, processing: 1, needs: { minYears: 1 }, effect: { revenue: 1.15 }, desc: 'An approved syllabus: veterans can use the GI Bill, and colleges can partner with you.' },
  trainingProvider: { name: 'FMCSA Training Provider Registry', icon: '🚛', types: ['cdlSchool'], required: true, fee: 500, renewal: { years: 2, fee: 200 }, desc: 'Entry-level driver training must come from a registered provider.' },
  uscgInspection: { name: 'USCG Certificate of Inspection', icon: '⛴️', types: ['tourBoat'], required: true, fee: 3000, renewal: { years: 1, fee: 1500 }, desc: 'Passenger vessels are inspected every year by the Coast Guard.' },
  pestLicense: { name: 'Commercial Pesticide Applicator Business License', icon: '🐜', types: ['pestControl'], required: true, fee: 400, renewal: { years: 1, fee: 250 }, desc: 'State agriculture department license for the company.' },
  fireProtectionLicense: { name: 'Fire Protection Contractor License', icon: '🧯', types: ['fireProtection'], required: true, fee: 800, renewal: { years: 2, fee: 400 }, desc: 'The state fire marshal licenses companies that inspect and service fire systems.' },
  bailAgencyLicense: { name: 'Bail Bond Agency License', icon: '🔓', types: ['bailBondsAgency'], required: true, fee: 1500, renewal: { years: 1, fee: 600 }, needs: { cleanRecord: true }, desc: 'Agency license, surety appointment and a qualifying bond.' },
  kennelPermit: { name: 'Kennel Permit', icon: '🐕', types: ['kennel'], required: true, fee: 300, renewal: { years: 1, fee: 150 }, desc: 'County animal-facility permit and inspections.' },
  rangePermit: { name: 'Range Safety Certification & Zoning Permit', icon: '🎯', types: ['shootingRange'], required: true, fee: 5000, renewal: { years: 2, fee: 1500 }, needs: { cleanRecord: true }, desc: 'Baffles, ventilation, lead abatement and a zoning variance.' },
  // Selling to the government
  govContractor: { name: 'Government Contractor Registration (SAM)', icon: '🏛️', types: ['securityCompany', 'privateFireService', 'constructionCo', 'demolitionCo', 'engineeringFirm', 'consulting', 'softwareShop', 'cleaning', 'courier', 'electrical', 'plumbing', 'hvacContractor', 'itSecurityFirm', 'staffingAgency', 'marketingAgency', 'machineShop', 'architecturePractice', 'warehouse3pl', 'ambulanceService', 'nemt', 'excavation', 'wasteHauling', 'landscaping', 'busCharter', 'fireProtection', 'pestControl', 'medicalBilling'], required: false, fee: 2500, renewal: { years: 1, fee: 500 }, processing: 1, needs: { minYears: 1, cleanRecord: true }, effect: { demand: 1.1 }, desc: 'Register to bid on public contracts: steady work in any economy — but no felonies.' },
};

/** Licenses a business type deals with. */
export const licensesFor = (typeId) => Object.entries(BUSINESS_LICENSES).filter(([, l]) => l.types === '*' || l.types.includes(typeId)).map(([id]) => id);
export const requiredLicenses = (typeId) => licensesFor(typeId).filter((id) => BUSINESS_LICENSES[id].required);
export const optionalLicenses = (typeId) => licensesFor(typeId).filter((id) => !BUSINESS_LICENSES[id].required);

/** Years in the business type's careers, plus years owning one. */
function experienceYears(state, typeId) {
  const type = BUSINESS_TYPES[typeId];
  const jobs = state.career.history.filter((h) => type.professions.includes(h.professionId)).reduce((s, h) => s + (h.endAge - h.startAge), 0);
  const current = state.career.job && type.professions.includes(state.career.job.professionId) ? state.career.job.yearsAtEmployer ?? 0 : 0;
  const owned = (state.business?.history ?? []).filter((h) => h.typeId === typeId).reduce((s, h) => s + (h.years ?? 0), 0);
  return jobs + current + owned;
}

/** Can this owner get this license for this business type? { ok, reason }. */
export function licenseEligibility(state, licenseId, typeId, biz = null) {
  const l = BUSINESS_LICENSES[licenseId];
  if (!l) return { ok: false, reason: 'Unknown license' };
  const n = l.needs ?? {};
  if (n.experience && experienceYears(state, typeId) < n.experience) return { ok: false, reason: `${l.name}: needs ${n.experience} yrs in the industry` };
  if (n.cleanRecord && hasFelony(state)) return { ok: false, reason: `${l.name}: a felony record disqualifies you` };
  if (n.ownerCredentials && !n.ownerCredentials.some((c) => hasCredential(state, c))) return { ok: false, reason: `${l.name}: needs ${n.ownerCredentials.map(credentialName).join(' or ')}` };
  if (n.minYears && (biz?.years ?? 0) < n.minYears) return { ok: false, reason: `${l.name}: the business needs ${n.minYears}+ yr of operating history` };
  return { ok: true };
}

/** Fees to open: every required license. */
export const openingLicenseFees = (typeId) => requiredLicenses(typeId).reduce((s, id) => s + BUSINESS_LICENSES[id].fee, 0);

/** The first required license this owner can't get, as a start-eligibility reason (or null). */
export function openingLicenseBlock(state, typeId) {
  for (const id of requiredLicenses(typeId)) {
    const e = licenseEligibility(state, id, typeId);
    if (!e.ok) return e.reason;
  }
  return null;
}

/** Grant a business its licenses at opening (processing ones start pending). */
export function grantOpeningLicenses(state, biz) {
  biz.licenses ??= {};
  for (const id of requiredLicenses(biz.typeId)) {
    const l = BUSINESS_LICENSES[id];
    biz.licenses[id] = l.processing
      ? { status: 'pending', since: state.character.age, readyAge: state.character.age + l.processing, renewAge: state.character.age + l.processing + l.renewal.years }
      : { status: 'active', since: state.character.age, renewAge: state.character.age + l.renewal.years };
  }
}

/** Existing businesses (old saves, purchases) come with their licenses. */
export function grandfatherLicenses(state, biz) {
  biz.licenses ??= {};
  for (const id of requiredLicenses(biz.typeId)) biz.licenses[id] ??= { status: 'active', since: state.character.age, renewAge: state.character.age + BUSINESS_LICENSES[id].renewal.years };
}

export const licenseActive = (biz, id) => biz.licenses?.[id]?.status === 'active';

/** Required licenses that aren't active (pending ones still block revenue they gate). */
export const missingLicenses = (biz) => requiredLicenses(biz.typeId).filter((id) => !licenseActive(biz, id));

/**
 * Revenue/demand multipliers from licenses: optional ones add; a required
 * license that's pending means you're mostly not open yet; suspended or
 * lapsed ones shut most of the business.
 */
export function licenseEffects(biz) {
  let revenue = 1;
  let demand = 1;
  for (const [id, rec] of Object.entries(biz.licenses ?? {})) {
    const l = BUSINESS_LICENSES[id];
    if (!l) continue;
    if (l.required) {
      if (rec.status === 'pending') revenue *= 0.35;
      else if (rec.status === 'suspended') revenue *= 0.5;
      else if (rec.status === 'lapsed') revenue *= 0.2;
    } else if (rec.status === 'active') {
      revenue *= l.effect?.revenue ?? 1;
      demand *= l.effect?.demand ?? 1;
    }
  }
  return { revenue, demand };
}

/**
 * Yearly: pending applications decide, renewals are paid from the business
 * account (lapsing if it can't pay), suspensions end, and operating without
 * a required license brings fines and then closure. Returns
 * { shutDown: reason | null }.
 */
export function licensesTick(ctx, biz) {
  const { state, rng } = ctx;
  const age = state.character.age;
  biz.licenses ??= {};
  for (const [id, rec] of Object.entries(biz.licenses)) {
    const l = BUSINESS_LICENSES[id];
    if (!l) { delete biz.licenses[id]; continue; }
    if (rec.status === 'pending' && age >= rec.readyAge) {
      if (!l.chance || rng.chance(l.chance)) {
        Object.assign(rec, { status: 'active', since: age, renewAge: age + l.renewal.years });
        ctx.log(`${biz.name}: your ${l.name} was approved.`, l.icon, 'good');
        if (l.effect?.reputation) biz.reputation = Math.round(clamp(biz.reputation + l.effect.reputation, 0, 100));
      } else if (l.required) {
        rec.readyAge = age + 1;
        ctx.log(`${biz.name}: the ${l.name} is still in review.`, l.icon, 'warn');
      } else {
        delete biz.licenses[id];
        ctx.log(`${biz.name}: your ${l.name} application was denied this round (fee refunded in part).`, l.icon, 'warn');
        biz.cash += Math.round(l.fee * 0.5);
      }
    } else if (rec.status === 'suspended' && age >= (rec.until ?? age)) {
      rec.status = 'active';
      ctx.log(`${biz.name}: your ${l.name} was reinstated.`, l.icon, 'good');
    } else if (rec.status === 'active' && age >= rec.renewAge) {
      if (biz.cash >= l.renewal.fee || biz.autopilot !== false) {
        charge(biz, l.renewal.fee);
        rec.renewAge = age + l.renewal.years;
      } else {
        rec.status = 'lapsed';
        ctx.log(`${biz.name}: your ${l.name} lapsed — renew it from the Business tab.`, l.icon, 'bad');
      }
    }
  }
  // Operating without a required license: a fine the first year, closure if it drags on.
  const missing = requiredLicenses(biz.typeId).filter((id) => !biz.licenses[id] || biz.licenses[id].status === 'lapsed');
  if (!missing.length) {
    biz.unlicensedYears = 0;
    return { shutDown: null };
  }
  biz.unlicensedYears = (biz.unlicensedYears ?? 0) + 1;
  const fine = rng.int(2000, 15000);
  biz.cash -= fine;
  const names = missing.map((id) => BUSINESS_LICENSES[id].name).join(', ');
  if (biz.unlicensedYears >= 2) return { shutDown: `Regulators shut ${biz.name} down for operating without a ${names}` };
  ctx.log(`${biz.name} was fined $${fine.toLocaleString()} for operating without a ${names}. Get it renewed or it will be shut down.`, '🚫', 'bad');
  return { shutDown: null };
}

/** A regulator suspends a license (failed inspection, board complaint). */
export function suspendLicense(ctx, biz, id, years, reason) {
  const rec = biz.licenses?.[id];
  if (!rec || rec.status !== 'active') return false;
  Object.assign(rec, { status: 'suspended', until: ctx.state.character.age + years });
  ctx.log(`${biz.name}: your ${BUSINESS_LICENSES[id].name} was suspended for ${years} year${years > 1 ? 's' : ''} (${reason}).`, '⛔', 'bad');
  return true;
}

/** Apply for (or renew a lapsed) license. Returns { ok, reason }. */
export function applyForLicense(ctx, biz, id) {
  const { state } = ctx;
  const l = BUSINESS_LICENSES[id];
  if (!l || !licensesFor(biz.typeId).includes(id)) return { ok: false, reason: 'Not a license this business can hold' };
  const rec = biz.licenses?.[id];
  if (rec && rec.status !== 'lapsed') return { ok: false, reason: rec.status === 'pending' ? 'Application in review' : rec.status === 'suspended' ? 'Suspended — wait it out' : 'Already held' };
  const e = licenseEligibility(state, id, biz.typeId, biz);
  if (!e.ok) return e;
  const fee = rec?.status === 'lapsed' ? l.renewal.fee * 2 : l.fee;
  if (biz.cash < fee) return { ok: false, reason: `Needs $${fee.toLocaleString()} in the business account` };
  charge(biz, fee);
  biz.licenses ??= {};
  const age = state.character.age;
  biz.licenses[id] = (l.processing || l.chance) && rec?.status !== 'lapsed'
    ? { status: 'pending', since: age, readyAge: age + (l.processing || 1), renewAge: age + (l.processing || 1) + l.renewal.years }
    : { status: 'active', since: age, renewAge: age + l.renewal.years };
  return { ok: true, fee, pending: biz.licenses[id].status === 'pending' };
}
