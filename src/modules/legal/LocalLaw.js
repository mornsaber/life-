/**
 * The law's own words, country by country: how a conviction is graded (felony and misdemeanor
 * are American; England has indictable and summary offences, France crimes, délits and
 * contraventions, Germany Verbrechen and Vergehen), and offence names without the American
 * statute references abroad (no "18 U.S.C." in a Paris court; a DUI is drink-driving in Dublin).
 */
import { OFFENSES } from './Offenses.js';
import { PRESENT, yearNow } from '../world/Eras.js';

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
/**
 * The older grades. The common-law world graded felonies and misdemeanours until it abolished
 * the distinction (Canada's Criminal Code 1892, New Zealand 1961, England 1967, Australia's
 * states around 1981, Ireland 1997); Germany's petty offences were Übertretungen until 1975.
 */
const FELONY_UNTIL = { GB: 1967, IE: 1997, AU: 1981, NZ: 1961, CA: 1892 };
const OLD_GRADES = {
  common: { felony: 'Felony', misdemeanor: 'Misdemeanour', infraction: 'Petty offence', civil: 'Civil matter' },
  de: { infraction: 'Übertretung' },
};
/** A conviction's grade in the words of the country that handed it down, in the year it was handed down. */
export function gradeIn(cc, severity, year = PRESENT) {
  const sys = legalSystem(cc);
  if (sys === 'common' && year < (FELONY_UNTIL[cc] ?? 1967)) return OLD_GRADES.common[severity] ?? severity;
  if (sys === 'de' && year < 1975 && OLD_GRADES.de[severity]) return OLD_GRADES.de[severity];
  return GRADES[sys]?.[severity] ?? GRADES.other[severity] ?? severity;
}
/** The calendar year a conviction was handed down (today, for a record with no age). */
export const recordYear = (state, r) => (state.character?.birthYear != null && r.age != null ? state.character.birthYear + r.age : yearNow(state));

const DRINK_DRIVING = ['GB', 'IE', 'AU', 'NZ'];
/** An offence's name in a country's courts: the American statute references stay at home. */
export function offenseNameIn(offenseId, cc, fallback = null, year = PRESENT) {
  const o = OFFENSES[offenseId];
  let name = fallback ?? o?.name ?? offenseId;
  if (cc === 'US') return name;
  if (o?.military) return name.replace(/ \(UCMJ Art\. [^)]*\)/, ' (court-martial)');
  name = name
    .replace(/ \((?:18 U\.S\.C\.[^)]*|NLRB|FLSA[^)]*|RICO|Clean Air[^)]*|Military Selective Service Act)\)/g, '')
    .replace(/^Racketeering$/, 'Participation in a Criminal Organisation')
    .replace(/to Federal Investigators/, 'to Investigators')
    .replace(/Federal /, '');
  // Before the breathalyser laws (Britain 1967) it was being drunk in charge of a motor vehicle.
  if (DRINK_DRIVING.includes(cc) && year < 1967) name = name.replace(/^(Felony )?DUI$/, 'Drunk in Charge of a Motor Vehicle');
  if (DRINK_DRIVING.includes(cc)) name = name.replace(/^Felony DUI$/, 'Aggravated Drink-Driving').replace(/^DUI$/, 'Drink-Driving');
  else name = name.replace(/^Felony DUI$/, 'Aggravated Drunk Driving').replace(/^DUI$/, 'Drunk Driving');
  return name;
}
