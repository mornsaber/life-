/**
 * The law's own words, country by country: how a conviction is graded (felony and misdemeanor
 * are American; England has indictable and summary offences, France crimes, délits and
 * contraventions, Germany Verbrechen and Vergehen), and offence names without the American
 * statute references abroad (no "18 U.S.C." in a Paris court; a DUI is drink-driving in Dublin).
 */
import { OFFENSES } from './Offenses.js';

const GRADES = {
  us: { felony: 'Felony', misdemeanor: 'Misdemeanor', infraction: 'Infraction', civil: 'Civil violation' },
  common: { felony: 'Indictable offence', misdemeanor: 'Summary offence', infraction: 'Fixed penalty', civil: 'Civil matter' },
  fr: { felony: 'Crime', misdemeanor: 'Délit', infraction: 'Contravention', civil: 'Affaire civile' },
  de: { felony: 'Verbrechen', misdemeanor: 'Vergehen', infraction: 'Ordnungswidrigkeit', civil: 'Zivilsache' },
  it: { felony: 'Delitto grave', misdemeanor: 'Delitto', infraction: 'Contravvenzione', civil: 'Causa civile' },
  es: { felony: 'Delito grave', misdemeanor: 'Delito menos grave', infraction: 'Delito leve', civil: 'Asunto civil' },
  nl: { felony: 'Misdrijf (zwaar)', misdemeanor: 'Misdrijf', infraction: 'Overtreding', civil: 'Civiele zaak' },
  pt: { felony: 'Crime grave', misdemeanor: 'Crime', infraction: 'Contraordenação', civil: 'Processo cível' },
  other: { felony: 'Serious crime', misdemeanor: 'Offence', infraction: 'Minor offence', civil: 'Civil matter' },
};
const SYSTEM = {
  US: 'us', GB: 'common', IE: 'common', AU: 'common', NZ: 'common', CA: 'common', JM: 'common', BS: 'common', SG: 'common', IN: 'common', PK: 'common', BD: 'common', KE: 'common', NG: 'common', ZA: 'common', MT: 'common', CY: 'common', PG: 'common', SB: 'common', GH: 'common', LK: 'common', MY: 'common',
  FR: 'fr', BE: 'fr', LU: 'fr', MA: 'fr', SN: 'fr', CI: 'fr', HT: 'fr', LB: 'fr',
  DE: 'de', AT: 'de', CH: 'de',
  IT: 'it',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', CL: 'es', VE: 'es', CR: 'es', GT: 'es', PA: 'es',
  NL: 'nl',
  PT: 'pt', BR: 'pt',
};
export const legalSystem = (cc) => SYSTEM[cc] ?? 'other';
/** A conviction's grade in the words of the country that handed it down. */
export const gradeIn = (cc, severity) => GRADES[legalSystem(cc)]?.[severity] ?? GRADES.other[severity] ?? severity;

const DRINK_DRIVING = ['GB', 'IE', 'AU', 'NZ'];
/** An offence's name in a country's courts: the American statute references stay at home. */
export function offenseNameIn(offenseId, cc, fallback = null) {
  const o = OFFENSES[offenseId];
  let name = fallback ?? o?.name ?? offenseId;
  if (cc === 'US') return name;
  if (o?.military) return name.replace(/ \(UCMJ Art\. [^)]*\)/, ' (court-martial)');
  name = name
    .replace(/ \((?:18 U\.S\.C\.[^)]*|NLRB|FLSA[^)]*|RICO|Clean Air[^)]*|Military Selective Service Act)\)/g, '')
    .replace(/^Racketeering$/, 'Participation in a Criminal Organisation')
    .replace(/to Federal Investigators/, 'to Investigators')
    .replace(/Federal /, '');
  if (DRINK_DRIVING.includes(cc)) name = name.replace(/^Felony DUI$/, 'Aggravated Drink-Driving').replace(/^DUI$/, 'Drink-Driving');
  else name = name.replace(/^Felony DUI$/, 'Aggravated Drunk Driving').replace(/^DUI$/, 'Drunk Driving');
  return name;
}
