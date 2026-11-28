/**
 * One view of the economy for every system: what the industry model says, turned into the
 * numbers each system uses. Everything that hires, fires, sells, prices or strikes reads it here
 * rather than keeping its own idea of how the world is doing.
 *
 *   jobs        hiring odds, layoff risk and a department's growth follow the jobs health of
 *               the industry a profession works in; a job in an industry the country doesn't
 *               have (whaling in Switzerland, oil in 1950 Britain) isn't on the board
 *   recessions  an industrial-decline recession hits the industries that are actually declining
 *   business    your firm's demand follows its trade's industry
 *   shares      each stock sector follows its industries
 *   unions      density and militancy follow the law (lawful or not) and the industry (layoffs,
 *               booms); an unlawful strike is a conspiracy
 *   towns       a town lives by its industry: house prices and the people around you follow it
 */
import { clamp } from '../../core/Random.js';
import { industryOfProfession, jobsHealth, industryHealth, industryHere, emergent, INDUSTRIES, townIndustry, industriesHere, industryName } from './IndustryEngine.js';
import { endowment } from './IndustryData.js';
import { statuteIn } from '../politics/StatuteBook.js';

const cc = (state) => state.character?.countryId ?? 'US';
/** The model has a view of this country (a life whose economy runs itself, and its own country). */
// (A place with no economic data, Pitcairn, the Vatican: the model has nothing to say.)
const viewed = (state) => (state?.industry?.c?.[cc(state)]?.last ?? 0) > 0 && emergent(state);

/** The jobs health of a profession's industry here (−1 … +1; 0 where it has none). */
export function jobOutlook(state, professionId) {
  if (!viewed(state)) return 0;
  const id = industryOfProfession(professionId);
  return id ? jobsHealth(state, id) : 0;
}
/** Layoff risk multiplier: a dying industry sheds its people, a booming one keeps them. */
export const layoffFactor = (state, professionId) => clamp(1 - 1.6 * jobOutlook(state, professionId), 0.4, 3);
/** Extra layoff risk when the industry is closing outright (pits shut, yards close). */
export const closureRisk = (state, professionId) => Math.max(0, -jobOutlook(state, professionId) - 0.5) * 0.25;
/** Hiring odds shift: easier in a growing industry, harder in a shrinking one. */
export const hiringShift = (state, professionId) => clamp(jobOutlook(state, professionId) * 0.12, -0.12, 0.1);
/** A department's growth this year from its industry. */
export const deptGrowth = (state, professionId) => jobOutlook(state, professionId) * 0.06;

/** Jobs only where the industry is (its ground and its know-how): no pits without coal, no whalers without whales. */
export const industryJobFilter = ((state, p) => {
  if (!viewed(state)) return true;
  const id = industryOfProfession(p.id);
  if (!id || !INDUSTRIES[id].resource) return true;
  if (endowment(cc(state), INDUSTRIES[id].resource) <= 0) return false;
  return industryHere(state, id) || INDUSTRIES[id].kind !== 'extract';
});

/** In an industrial-decline recession, the declining industries' jobs are the hardest hit. */
export function declineShock(state, professionId) {
  if (!viewed(state)) return 1;
  const o = jobOutlook(state, professionId);
  return o < -0.25 ? 1.5 + Math.min(1.5, -o * 2) : o > 0.2 ? 0.7 : 1;
}

/** The industry a kind of business trades in. */
export const BUSINESS_INDUSTRY = {
  restaurant: 'tourism', foodTruck: 'tourism', catering: 'tourism', boardingHouse: 'tourism', tourBoat: 'tourism', charterOperator: 'airlines', flightSchool: 'airlines',
  retail: 'retail', generalStore: 'retail', pharmacyStore: 'retail', opticalShop: 'retail', tailorShop: 'textiles', dairyRound: 'farming', iceHouse: 'retail', coalMerchant: 'coal', gristMill: 'farming',
  trucking: 'trucking', courier: 'trucking', movingCompany: 'trucking', warehouse3pl: 'trucking', towing: 'trucking', busCharter: 'trucking', wasteHauling: 'trucking', liveryStable: 'trucking',
  machineShop: 'engineering', engineeringFirm: 'engineering', smithy: 'engineering', craneRental: 'construction',
  electrical: 'construction', plumbing: 'construction', hvacContractor: 'construction', constructionCo: 'construction', demolitionCo: 'construction', homeBuilder: 'construction', developer: 'construction', roofing: 'construction', excavation: 'construction', landscaping: 'construction', solarInstaller: 'renewables',
  techStartup: 'software', softwareShop: 'software', indieGameStudio: 'software', itSecurityFirm: 'software',
  brokerage: 'banking', insuranceAgency: 'banking', cpaFirm: 'banking', medicalBilling: 'banking',
  productionCompany: 'media', recordingStudio: 'media', marketingAgency: 'media', designStudio: 'media', printShop: 'media', photoStudio: 'media',
  fishingBoat: 'fishing',
};
/** Demand multiplier for a business from its trade's industry. */
export function businessDemand(state, typeId) {
  if (!viewed(state)) return 1;
  const id = BUSINESS_INDUSTRY[typeId];
  return id ? clamp(1 + industryHealth(state, id) * 0.25, 0.7, 1.3) : 1;
}

export { sectorTilt } from './IndustryEngine.js';

/** Unions: lawful or not, and what the industry is doing to its members. */
export function unionsLawful(state) {
  if (!state?.industry || !emergent(state)) return true;
  return statuteIn(state, 'tradeUnionsLegal', cc(state));
}
/** Membership drift and militancy from the industries the union organises. */
export function unionPressure(state, professions = []) {
  if (!viewed(state)) return { drift: 0, militancy: 0 };
  const o = professions.length ? professions.reduce((s, p) => s + jobOutlook(state, p), 0) / professions.length : 0;
  // Layoffs make members angry and the union smaller; a boom makes it bigger and bolder.
  return { drift: o * 0.03, militancy: o < -0.2 ? 6 : o > 0.3 ? 2 : 0 };
}

/** A town's trade and how it is doing: { id, name, town, health, jobs }. */
export function townTrade(state, regionId = state.character?.regionId) {
  if (!viewed(state)) return null;
  const id = townIndustry(state, regionId);
  const I = INDUSTRIES[id];
  return { id, name: industryName(state, id), town: I.town, icon: I.icon, health: industryHealth(state, id), jobs: jobsHealth(state, id) };
}
/** House prices drift with the town's trade. */
export const housingDrift = (state, regionId) => { const t = townTrade(state, regionId); return t ? clamp(t.jobs * 0.04, -0.04, 0.03) : 0; };
/** A relative's chance of losing their job from their industry. */
export const npcLayoff = (state, professionId) => (viewed(state) ? Math.max(0, -jobOutlook(state, professionId)) * 0.08 : 0);
/** The country's biggest industries, for the screens. */
export const topIndustries = (state, n = 6) => (viewed(state) ? industriesHere(state, cc(state), n) : []);
