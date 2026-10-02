/**
 * Offense catalog.
 *
 *   severity:   'infraction' (ticket) | 'misdemeanor' | 'felony' | 'civil'
 *   fine:       [min, max] dollars
 *   probation:  years of probation on conviction
 *   prison:     [min, max] years (felonies; repeat misdemeanors may get jail)
 *   jobRelated: committed through your job — conviction ends it
 *   federal:    prosecuted by your home country even if committed abroad
 *               (diplomatic immunity only shields you from the *host* country)
 *   escalate:   { after: n, to: offenseId } repeat offenders get charged harder
 */
export const OFFENSES = {
  trespass: { name: 'Criminal Trespass', icon: '🚧', severity: 'infraction', fine: [100, 500] },
  underageDrinking: { name: 'Minor in Possession of Alcohol', icon: '🍻', severity: 'infraction', fine: [200, 600] },
  speeding: { name: 'Speeding', icon: '🚨', severity: 'infraction', fine: [150, 450] },
  reckless: { name: 'Reckless Driving', icon: '🚗', severity: 'misdemeanor', fine: [500, 2000], probation: 1 },
  dui: { name: 'DUI', icon: '🍺', severity: 'misdemeanor', fine: [1500, 5000], probation: 2, escalate: { after: 2, to: 'felonyDui' } },
  felonyDui: { name: 'Felony DUI', icon: '🍺', severity: 'felony', fine: [5000, 15000], prison: [1, 4], probation: 3 },
  unlicensed: { name: 'Driving Without a License', icon: '🪪', severity: 'misdemeanor', fine: [300, 1000] },
  shoplifting: { name: 'Shoplifting', icon: '🛒', severity: 'misdemeanor', fine: [200, 1000], probation: 1, escalate: { after: 2, to: 'grandTheft' } },
  grandTheft: { name: 'Grand Theft', icon: '💰', severity: 'felony', fine: [2000, 10000], prison: [1, 3], probation: 2 },
  assault: { name: 'Assault', icon: '👊', severity: 'misdemeanor', fine: [500, 2500], probation: 2 },
  drugPossession: { name: 'Drug Possession', icon: '💊', severity: 'misdemeanor', fine: [500, 2500], probation: 2 },
  taxEvasion: { name: 'Tax Evasion', icon: '🧾', severity: 'felony', fine: [20000, 100000], prison: [1, 3], probation: 2, federal: true },
  expenseFraud: { name: 'Expense Fraud', icon: '🧾', severity: 'misdemeanor', fine: [2000, 10000], probation: 1, jobRelated: true },
  embezzlement: { name: 'Embezzlement', icon: '💼', severity: 'felony', fine: [10000, 50000], prison: [2, 6], probation: 3, jobRelated: true },
  kickback: { name: 'Procurement Kickbacks', icon: '🤝', severity: 'felony', fine: [10000, 40000], prison: [1, 4], probation: 2, jobRelated: true },
  bribery: { name: 'Bribery of a Public Official', icon: '💵', severity: 'felony', fine: [10000, 60000], prison: [2, 7], probation: 3, jobRelated: true, federal: true },
  falsifiedInspection: { name: 'Falsifying Inspection Records', icon: '🏚️', severity: 'felony', fine: [5000, 25000], prison: [1, 3], probation: 2, jobRelated: true },
  securitiesFraud: { name: 'Securities Fraud', icon: '🪙', severity: 'felony', fine: [25000, 150000], prison: [1, 4], probation: 3, federal: true },
  insiderTrading: { name: 'Insider Trading', icon: '📈', severity: 'felony', fine: [50000, 250000], prison: [1, 5], probation: 2, jobRelated: true, federal: true },
  prescriptionFraud: { name: 'Prescription Fraud', icon: '💊', severity: 'felony', fine: [20000, 80000], prison: [2, 6], probation: 3, jobRelated: true, federal: true },
  excessiveForce: { name: 'Deprivation of Rights Under Color of Law', icon: '🚔', severity: 'felony', fine: [5000, 20000], prison: [1, 4], probation: 2, jobRelated: true, federal: true },
  falseStatement: { name: 'False Statements to Federal Investigators', icon: '🕵️', severity: 'felony', fine: [5000, 25000], prison: [0, 2], probation: 2, federal: true },
  leak: { name: 'Unauthorized Disclosure of Classified Information', icon: '📰', severity: 'felony', fine: [10000, 50000], prison: [3, 10], probation: 3, jobRelated: true, federal: true },
  visaFraud: { name: 'Visa Fraud Conspiracy', icon: '🛂', severity: 'felony', fine: [20000, 80000], prison: [3, 8], probation: 3, jobRelated: true, federal: true },
  smuggling: { name: 'Smuggling via Diplomatic Pouch', icon: '🎒', severity: 'felony', fine: [10000, 50000], prison: [2, 6], probation: 2, jobRelated: true, federal: true },
  mortgageFraud: { name: 'Mortgage Fraud', icon: '🏦', severity: 'felony', fine: [10000, 50000], prison: [1, 4], probation: 3, federal: true },
  arson: { name: 'Arson & Insurance Fraud', icon: '🔥', severity: 'felony', fine: [10000, 50000], prison: [2, 8], probation: 3 },
  contraband: { name: 'Smuggling Contraband into a Prison', icon: '📦', severity: 'felony', fine: [5000, 20000], prison: [1, 5], probation: 2, jobRelated: true },
  falsifiedRecords: { name: 'Falsifying Official Records', icon: '📝', severity: 'misdemeanor', fine: [2000, 8000], probation: 2, jobRelated: true },
  prosecutorialMisconduct: { name: 'Prosecutorial Misconduct (Brady Violation)', icon: '⚖️', severity: 'misdemeanor', fine: [5000, 20000], probation: 1, jobRelated: true },
  campaignFinance: { name: 'Campaign Finance Fraud (Straw Donors)', icon: '🗳️', severity: 'felony', fine: [20000, 100000], prison: [1, 3], probation: 2, federal: true },
  publicCorruption: { name: 'Honest-Services Fraud (Selling Official Acts)', icon: '💼', severity: 'felony', fine: [50000, 250000], prison: [3, 10], probation: 3, jobRelated: true, federal: true },
  illegalLobbying: { name: 'Illegal Lobbying Contact (Revolving Door)', icon: '🚪', severity: 'misdemeanor', fine: [10000, 50000], probation: 1 },
  unfairLaborPractice: { name: 'Unfair Labor Practice (NLRB)', icon: '⚖️', severity: 'civil', fine: [10000, 60000] },
};

export const SEVERITY_LABEL = { infraction: 'Infraction', misdemeanor: 'Misdemeanor', felony: 'Felony', civil: 'Civil violation' };

/** Defense options in court: cost and how much they cut the conviction odds. */
export const DEFENSE = {
  plead: { label: '🙇 Plead guilty for a reduced sentence', cost: 0, factor: null },
  publicDefender: { label: '🧑‍⚖️ Go to trial with a public defender', cost: 0, factor: 0.85 },
  privateAttorney: { label: '👔 Hire a private defense attorney', cost: 15000, factor: 0.65 },
  topFirm: { label: '🏛️ Retain a top white-collar defense firm', cost: 75000, factor: 0.45 },
  self: { label: '⚖️ Represent yourself (you\'re a lawyer)', cost: 0, factor: 0.7 },
};
