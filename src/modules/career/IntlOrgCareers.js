/**
 * Careers in international organisations. You apply from anywhere; the job
 * moves you to a duty station abroad (world/IntlOrgs.js), and staff rotate
 * between stations every few years.
 *
 * Real-world rules worth knowing:
 *   - The UN Secretariat recruits juniors through the Young Professionals
 *     Programme (32 and under, a degree, a competitive exam). Others join at
 *     P-3 and above with years of relevant experience. The grades run
 *     P-2 to P-5, D-1 and D-2, then Assistant Secretary-General.
 *     Under-Secretaries-General and the Secretary-General are appointed
 *     (world/IntlOrgs.js offers them).
 *   - The EU institutions hire their permanent officials (AD grades) through
 *     EPSO open competitions. Only EU citizens may apply, and a few per cent
 *     of candidates pass. Commissioners are nominated by their governments.
 *   - NATO's International Staff is open only to citizens of NATO members.
 *   - The World Bank and IMF run their own Young Professionals Programs.
 *     Their grades run GE to GJ, then Vice President.
 *   - The ICRC sends delegates to conflict zones. The Order of Malta's
 *     relief agency, Malteser International, works in disasters and wars.
 *   - Salaries in most of these organisations are exempt from national
 *     income tax; the organisations levy an internal staff assessment
 *     instead. US citizens at the UN still pay US tax.
 */
import { L } from './Ladder.js';
import { citizenshipsOf } from '../world/Countries.js';
import careersPack, { EU_MEMBERS, NATO_MEMBERS, citizenOfAny, intlExperience, isCatholic, ordainedPriest, passed, served, swissGuardCheck, yearsIn } from '../content/packs/careers-intl-orgs.js';
export { EU_MEMBERS, NATO_MEMBERS, citizenOfAny, intlExperience, isCatholic, ordainedPriest, passed, served, swissGuardCheck, yearsIn };


export const P5 = ['US', 'GB', 'FR', 'CN', 'RU'];



/**
 * Where each employer is based: [place, country]; `field` lists the hardship
 * duty stations staff rotate through.
 */
export const DUTY_STATIONS = {
  'United Nations Secretariat (New York)': { hq: ['New York', 'United States'], field: [['Geneva', 'Switzerland'], ['Vienna', 'Austria'], ['Nairobi', 'Kenya'], ['Bangkok', 'Thailand'], ['Beirut', 'Lebanon'], ['Addis Ababa', 'Ethiopia']] },
  'United Nations Office at Geneva': { hq: ['Geneva', 'Switzerland'], field: [['New York', 'United States'], ['Vienna', 'Austria'], ['Nairobi', 'Kenya']] },
  'UN peace operations (Department of Peace Operations)': { hq: ['New York', 'United States'], field: [['Juba', 'South Sudan'], ['Bangui', 'Central African Republic'], ['Goma', 'DR Congo'], ['Bamako', 'Mali'], ['Naqoura', 'Lebanon'], ['Pristina', 'Kosovo']] },
  'UNICEF': { hq: ['New York', 'United States'], field: [['Nairobi', 'Kenya'], ['Dakar', 'Senegal'], ['Kabul', 'Afghanistan'], ['Port-au-Prince', 'Haiti'], ['Amman', 'Jordan']] },
  'UNHCR (the UN Refugee Agency)': { hq: ['Geneva', 'Switzerland'], field: [['Amman', 'Jordan'], ['Kakuma', 'Kenya'], ['Cox\'s Bazar', 'Bangladesh'], ['Gaziantep', 'Turkey'], ['Kyiv', 'Ukraine']] },
  'World Food Programme': { hq: ['Rome', 'Italy'], field: [['Juba', 'South Sudan'], ['Sana\'a', 'Yemen'], ['Mogadishu', 'Somalia'], ['Damascus', 'Syria']] },
  'World Health Organization': { hq: ['Geneva', 'Switzerland'], field: [['Brazzaville', 'Republic of the Congo'], ['Manila', 'Philippines'], ['Cairo', 'Egypt'], ['New Delhi', 'India']] },
  'UNDP': { hq: ['New York', 'United States'], field: [['Addis Ababa', 'Ethiopia'], ['Dhaka', 'Bangladesh'], ['Bogotá', 'Colombia'], ['Istanbul', 'Turkey']] },
  'UNESCO': { hq: ['Paris', 'France'], field: [['Bangkok', 'Thailand'], ['Nairobi', 'Kenya'], ['Montevideo', 'Uruguay']] },
  'Food and Agriculture Organization': { hq: ['Rome', 'Italy'], field: [['Accra', 'Ghana'], ['Bangkok', 'Thailand'], ['Santiago', 'Chile']] },
  'International Labour Organization': { hq: ['Geneva', 'Switzerland'], field: [['Bangkok', 'Thailand'], ['Abidjan', 'Ivory Coast'], ['Lima', 'Peru']] },
  'International Atomic Energy Agency': { hq: ['Vienna', 'Austria'], field: [['Tokyo', 'Japan']] },
  'European Commission': { hq: ['Brussels', 'Belgium'], field: [['Luxembourg', 'Luxembourg']] },
  'European External Action Service': { hq: ['Brussels', 'Belgium'], field: [['Washington, D.C.', 'United States'], ['Nairobi', 'Kenya'], ['Kyiv', 'Ukraine'], ['Beijing', 'China'], ['Brasília', 'Brazil']] },
  'European Parliament (Secretariat)': { hq: ['Brussels', 'Belgium'], field: [['Strasbourg', 'France']] },
  'Council of the European Union (General Secretariat)': { hq: ['Brussels', 'Belgium'] },
  'European Central Bank': { hq: ['Frankfurt', 'Germany'] },
  'Court of Justice of the European Union': { hq: ['Luxembourg', 'Luxembourg'] },
  'NATO Headquarters (International Staff)': { hq: ['Brussels', 'Belgium'], field: [['Mons', 'Belgium'], ['Naples', 'Italy'], ['Brunssum', 'Netherlands']] },
  'NATO Communications and Information Agency': { hq: ['The Hague', 'Netherlands'], field: [['Mons', 'Belgium']] },
  'World Bank Group': { hq: ['Washington, D.C.', 'United States'], field: [['Nairobi', 'Kenya'], ['New Delhi', 'India'], ['Jakarta', 'Indonesia'], ['Dakar', 'Senegal']] },
  'International Monetary Fund': { hq: ['Washington, D.C.', 'United States'] },
  'International Criminal Court': { hq: ['The Hague', 'Netherlands'], field: [['Bangui', 'Central African Republic'], ['Kampala', 'Uganda']] },
  'International Court of Justice': { hq: ['The Hague', 'Netherlands'] },
  'International Committee of the Red Cross': { hq: ['Geneva', 'Switzerland'], field: [['Kyiv', 'Ukraine'], ['Gaza', 'Palestine'], ['Maiduguri', 'Nigeria'], ['Kabul', 'Afghanistan'], ['Goma', 'DR Congo'], ['Aleppo', 'Syria']] },
  'Malteser International': { hq: ['Cologne', 'Germany'], field: [['Erbil', 'Iraq'], ['Juba', 'South Sudan'], ['Yangon', 'Myanmar'], ['Port-au-Prince', 'Haiti'], ['Lviv', 'Ukraine']] },
  'Pontifical Swiss Guard': { hq: ['Vatican City', 'Vatican City'] },
  'Gendarmerie Corps of Vatican City State': { hq: ['Vatican City', 'Vatican City'] },
  'Roman Curia': { hq: ['Vatican City', 'Vatican City'] },
  'Secretariat of State — Diplomatic Service of the Holy See': { hq: ['Vatican City', 'Vatican City'], field: [['Washington, D.C.', 'United States'], ['Paris', 'France'], ['Berlin', 'Germany'], ['Madrid', 'Spain'], ['Manila', 'Philippines'], ['Nairobi', 'Kenya'], ['Brasília', 'Brazil'], ['New Delhi', 'India'], ['Kyiv', 'Ukraine'], ['Beirut', 'Lebanon'], ['Geneva', 'Switzerland'], ['Canberra', 'Australia'], ['Ottawa', 'Canada'], ['Mexico City', 'Mexico'], ['Kinshasa', 'DR Congo'], ['Damascus', 'Syria'], ['Jerusalem', 'Israel'], ['Seoul', 'South Korea']] },
  'Grand Magistry of the Sovereign Order of Malta': { hq: ['Rome', 'Italy'], field: [['Vienna', 'Austria'], ['Paris', 'France'], ['Brussels', 'Belgium'], ['New York', 'United States'], ['Valletta', 'Malta'], ['Nairobi', 'Kenya'], ['Beirut', 'Lebanon']] },
};

/** Field stations where staff face real danger (a yearly chance of an incident). */
export const HARDSHIP = ['Juba', 'Bangui', 'Goma', 'Bamako', 'Kabul', 'Sana\'a', 'Mogadishu', 'Damascus', 'Aleppo', 'Gaza', 'Maiduguri', 'Port-au-Prince', 'Erbil', 'Kyiv', 'Lviv', 'Yangon', 'Kakuma', 'Naqoura'];

/* The careers themselves (INTL_ORG_PROFESSIONS) live in content/packs/careers-intl-orgs.js. */

export const INTL_ORG_IDS = Object.keys(careersPack.careers);
