/**
 * Crime by country: how corrupt the police and courts are, how violent the streets are, what
 * the drug laws are, how easy it is to get a gun, and which agencies investigate.
 *
 * Every country gets an answer: the tables below cover the countries with something distinctive
 * to say, and the rest fall back deliberately on the kind of regime they have (a fragile state is
 * more corrupt and more violent than a stable democracy).
 */
import { regimeOf } from '../world/Regimes.js';
import { REGIONS } from '../life/Regions.js';

/** 0 (clean) – 1 (everything is for sale): roughly the inverse of the corruption-perceptions index. */
export const CORRUPTION = {
  DK: 0.1, FI: 0.12, NZ: 0.13, NO: 0.15, SG: 0.17, SE: 0.18, CH: 0.18, NL: 0.21, LU: 0.22, DE: 0.22, IE: 0.23, EE: 0.24, AU: 0.25, CA: 0.26,
  BE: 0.27, JP: 0.27, GB: 0.29, AT: 0.29, FR: 0.31, US: 0.31, BT: 0.32, AE: 0.32, TW: 0.33, CL: 0.34, IL: 0.37, KR: 0.37, PT: 0.39, LT: 0.39,
  ES: 0.4, LV: 0.41, QA: 0.42, CY: 0.44, IT: 0.44, PL: 0.45, CR: 0.45, MT: 0.46, SA: 0.48, MY: 0.5, GR: 0.51, RO: 0.54, KW: 0.54, JO: 0.54,
  JM: 0.56, OM: 0.57, GH: 0.57, BH: 0.58, CN: 0.58, VN: 0.59, ZA: 0.59, IN: 0.61, CO: 0.61, MA: 0.62, AR: 0.63, BR: 0.64, TH: 0.64, UA: 0.64,
  TR: 0.66, ID: 0.66, PH: 0.66, PA: 0.65, LK: 0.66, PE: 0.67, KE: 0.69, MX: 0.69, EG: 0.7, PK: 0.71, NP: 0.65, NG: 0.75, RU: 0.74, BD: 0.76,
  LB: 0.76, IR: 0.76, IQ: 0.77, KH: 0.78, MM: 0.8, AF: 0.8, LY: 0.82, KP: 0.83, HT: 0.83, VE: 0.87, SY: 0.88, YE: 0.88, SO: 0.89, SS: 0.9,
};

/** 0 (very safe) – 1 (very violent): homicide and robbery rates, roughly. */
export const CRIME_LEVEL = {
  JP: 0.05, SG: 0.05, QA: 0.06, AE: 0.07, CH: 0.08, NO: 0.09, LU: 0.1, DK: 0.1, KR: 0.1, TW: 0.1, AT: 0.1, IT: 0.14, ES: 0.14, DE: 0.15, NL: 0.15,
  PT: 0.15, IE: 0.16, FI: 0.16, NZ: 0.18, AU: 0.18, CN: 0.12, GB: 0.22, FR: 0.24, CA: 0.24, SE: 0.25, BE: 0.24, IL: 0.28, IN: 0.32, PH: 0.45,
  US: 0.45, RU: 0.42, TR: 0.3, AR: 0.45, CL: 0.4, CR: 0.5, PA: 0.5, PE: 0.5, KE: 0.55, NG: 0.7, MX: 0.75, CO: 0.72, BR: 0.75, BS: 0.6,
  ZA: 0.85, JM: 0.85, HT: 0.85, VE: 0.9, SO: 0.85, SS: 0.85, YE: 0.8, SY: 0.8, LY: 0.75, AF: 0.75, CD: 0.8, CF: 0.8, IQ: 0.7,
};

/**
 * Drug laws.
 *   possession   'crime' | 'decriminalised' (an administrative fine, PT) | 'tolerated' (cannabis, NL)
 *   cannabis     'crime' | 'tolerated' | 'legal' (licensed shops, CA/UY/DE)
 *   mult         sentence multiplier for supply offences
 *   death        trafficking is a capital crime
 */
const LAW = (o) => ({ possession: 'crime', cannabis: 'crime', mult: 1, death: false, ...o });
export const DRUG_LAW = {
  PT: LAW({ possession: 'decriminalised', mult: 0.7, note: 'Personal possession is an administrative matter: a dissuasion commission, not a court.' }),
  NL: LAW({ cannabis: 'tolerated', mult: 0.7, note: 'Coffee shops sell cannabis openly; supplying them is still a crime ("the back door problem").' }),
  CA: LAW({ cannabis: 'legal', note: 'Cannabis is legal and sold in licensed stores; everything else is not.' }),
  DE: LAW({ cannabis: 'legal', mult: 0.8, note: 'Adults may grow cannabis and join a cannabis club; selling it is still a crime.' }),
  CH: LAW({ mult: 0.7, note: 'Supervised heroin prescription and consumption rooms: harm reduction first.' }),
  US: LAW({ mult: 1.4, note: 'Mandatory minimums for weight: five and ten years for federal trafficking.' }),
  PH: LAW({ mult: 1.6, note: 'The "war on drugs": thousands of suspects killed by police and vigilantes.' }),
  JP: LAW({ mult: 1.3, note: 'Even small amounts of cannabis bring arrest, deportation for foreigners, and disgrace.' }),
  KR: LAW({ mult: 1.3 }),
  SG: LAW({ mult: 2, death: true, note: 'Trafficking above set weights carries a mandatory death sentence.' }),
  MY: LAW({ mult: 1.8, death: true }),
  ID: LAW({ mult: 1.8, death: true, note: 'Foreign traffickers have been executed by firing squad.' }),
  CN: LAW({ mult: 1.8, death: true }),
  VN: LAW({ mult: 1.8, death: true }),
  TH: LAW({ cannabis: 'legal', mult: 1.5, death: true, note: 'Cannabis shops on every street; methamphetamine trafficking can still mean death.' }),
  SA: LAW({ mult: 2, death: true }),
  IR: LAW({ mult: 2, death: true }),
  KW: LAW({ mult: 1.8, death: true }),
  AE: LAW({ mult: 1.8, death: true }),
  QA: LAW({ mult: 1.8, death: true }),
  BN: LAW({ mult: 1.8, death: true }),
  KP: LAW({ mult: 2, death: true }),
  UY: LAW({ cannabis: 'legal' }),
  MX: LAW({ possession: 'decriminalised', note: 'Small amounts are not prosecuted; the cartels are another matter.' }),
  CO: LAW({ possession: 'decriminalised' }),
};
const DRUG_FALLBACK = { democracy: LAW({}), hybrid: LAW({ mult: 1.2 }), authoritarian: LAW({ mult: 1.4 }), oneParty: LAW({ mult: 1.6, death: true }), theocracy: LAW({ mult: 2, death: true }), absoluteMonarchy: LAW({ mult: 1.8, death: true }), totalitarian: LAW({ mult: 2, death: true }), junta: LAW({ mult: 1.4 }), fragile: LAW({ mult: 0.8 }), transitional: LAW({ mult: 1.2 }) };

/** How easy it is to get a gun outside the law: 'easy' (plentiful, cheap), 'market' (a black market), 'hard'. */
export const GUNS = {
  US: 'easy', BR: 'easy', MX: 'easy', ZA: 'easy', JM: 'easy', CO: 'easy', VE: 'easy', HT: 'easy', SO: 'easy', YE: 'easy', AF: 'easy', IQ: 'easy', LY: 'easy', SY: 'easy', SS: 'easy',
  GB: 'hard', JP: 'hard', SG: 'hard', KR: 'hard', AU: 'hard', NZ: 'hard', CN: 'hard', TW: 'hard', HK: 'hard', IE: 'hard', NL: 'hard',
};

/** Who investigates: national police, drugs, tax. */
export const AGENCIES = {
  US: { national: 'the FBI', drugs: 'the DEA', tax: 'IRS Criminal Investigation', anticorruption: 'the FBI Public Corruption Unit' },
  GB: { national: 'the National Crime Agency', drugs: 'the National Crime Agency', tax: 'HMRC Fraud Investigation Service', anticorruption: 'the Serious Fraud Office' },
  AU: { national: 'the Australian Federal Police', drugs: 'the AFP', tax: 'the ATO', anticorruption: 'the National Anti-Corruption Commission' },
  CA: { national: 'the RCMP', drugs: 'the RCMP', tax: 'the CRA Criminal Investigations Program', anticorruption: 'the RCMP Sensitive Investigations' },
  DE: { national: 'the BKA', drugs: 'the BKA and customs (Zollfahndung)', tax: 'the Steuerfahndung', anticorruption: 'the state prosecutors (Schwerpunktstaatsanwaltschaft)' },
  FR: { national: 'the Police judiciaire', drugs: 'OFAST', tax: 'the DGFiP', anticorruption: 'the Parquet national financier' },
  IT: { national: 'the DIA (Direzione Investigativa Antimafia)', drugs: 'the Guardia di Finanza', tax: 'the Guardia di Finanza', anticorruption: 'ANAC' },
  JP: { national: 'the National Police Agency', drugs: 'the Narcotics Control Department', tax: 'the National Tax Agency', anticorruption: 'the Tokyo Special Investigation Department' },
  KR: { national: 'the Supreme Prosecutors\' Office', drugs: 'the narcotics prosecutors', tax: 'the National Tax Service', anticorruption: 'the CIO' },
  MX: { national: 'the FGR', drugs: 'the FGR and the army', tax: 'the SAT', anticorruption: 'the FGR anti-corruption prosecutor' },
  PH: { national: 'the NBI', drugs: 'the PDEA', tax: 'the BIR', anticorruption: 'the Ombudsman' },
  IN: { national: 'the CBI', drugs: 'the Narcotics Control Bureau', tax: 'the Enforcement Directorate', anticorruption: 'the CBI' },
  ID: { national: 'Bareskrim Polri', drugs: 'the BNN', tax: 'the DJP', anticorruption: 'the KPK' },
  BR: { national: 'the Polícia Federal', drugs: 'the Polícia Federal', tax: 'the Receita Federal', anticorruption: 'the Polícia Federal' },
  NL: { national: 'the National Police (Landelijke Eenheid)', drugs: 'the National Police', tax: 'FIOD', anticorruption: 'the Rijksrecherche' },
  SG: { national: 'the CID', drugs: 'the Central Narcotics Bureau', tax: 'IRAS', anticorruption: 'the CPIB' },
  CN: { national: 'the Ministry of Public Security', drugs: 'the Narcotics Control Bureau', tax: 'the State Taxation Administration', anticorruption: 'the Central Commission for Discipline Inspection' },
  RU: { national: 'the Investigative Committee', drugs: 'the MVD', tax: 'the FNS', anticorruption: 'the FSB' },
};

const kindOf = (cc) => regimeOf(cc ?? 'US').kind;
const FALLBACK_CORRUPTION = { democracy: 0.35, hybrid: 0.6, authoritarian: 0.7, oneParty: 0.6, theocracy: 0.72, absoluteMonarchy: 0.5, totalitarian: 0.83, junta: 0.75, fragile: 0.85, transitional: 0.8 };
const FALLBACK_CRIME = { democracy: 0.3, hybrid: 0.4, authoritarian: 0.35, oneParty: 0.15, theocracy: 0.3, absoluteMonarchy: 0.12, totalitarian: 0.15, junta: 0.5, fragile: 0.8, transitional: 0.7 };

export const corruptionOf = (cc) => CORRUPTION[cc] ?? FALLBACK_CORRUPTION[kindOf(cc)] ?? 0.4;
export const corruptionHere = (state) => corruptionOf(state.character.countryId ?? 'US');
export const drugLawOf = (cc) => DRUG_LAW[cc] ?? DRUG_FALLBACK[kindOf(cc)] ?? LAW({});
export const drugLawHere = (state) => drugLawOf(state.character.countryId ?? 'US');
export const gunsHere = (state) => GUNS[state.character.countryId ?? 'US'] ?? (kindOf(state.character.countryId) === 'fragile' ? 'easy' : 'market');

/** How dangerous your streets are: the country's level, worse in a big city or a poor one. */
export function crimeLevelHere(state) {
  const cc = state.character.countryId ?? 'US';
  const base = CRIME_LEVEL[cc] ?? FALLBACK_CRIME[kindOf(cc)] ?? 0.3;
  const r = REGIONS[state.character.regionId];
  const city = r?.type && /metro|city|capital|urban/i.test(r.type) ? 1.2 : r?.type && /rural|town/i.test(r.type) ? 0.7 : 1;
  return Math.min(1, base * city);
}

/** The agency on a case. */
export function agencyFor(state, offense, offenseId) {
  const cc = state.character.countryId ?? 'US';
  const a = AGENCIES[cc] ?? { national: 'the national police', drugs: 'the national drug squad', tax: 'the tax authority', anticorruption: 'the anti-corruption commission' };
  const city = REGIONS[state.character.regionId]?.name?.split(',')[0] ?? 'local';
  if (/tax|payroll/i.test(offenseId)) return a.tax;
  if (/bribery|publicCorruption|kickback|campaign/i.test(offenseId)) return a.anticorruption;
  if (/drugTrafficking|drugImport/.test(offenseId)) return a.drugs;
  if (offense?.federal || /racketeering|kidnapping|moneyLaundering/.test(offenseId)) return a.national;
  if (/murder|manslaughter|Murder/.test(offenseId)) return `the ${city} homicide squad`;
  if (offense?.sexual) return `the ${city} sexual offences unit`;
  if (/drug/i.test(offenseId)) return `the ${city} narcotics squad`;
  return `the ${city} police`;
}
