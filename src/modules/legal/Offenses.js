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
 *   violent:    can never be sealed or expunged
 *   noSeal:     excluded from record sealing (DUI in most states)
 *   capital:    a death-penalty-eligible offense in states that have it
 *   drug:       'supply' | 'trafficking' — scaled by the country's drug laws (crime/CrimeWorld.js)
 *   sexual:     a sexual offence (never player-committed); registry: the offender is put on a sex-offender register
 */
export const OFFENSES = {
  payrollTaxEvasion: { name: 'Failure to Pay Over Payroll Taxes', icon: '💸', severity: 'felony', fine: [10000, 100000], prison: [0, 3], probation: 2, federal: true },
  wageTheft: { name: 'Wage Theft (FLSA Overtime Violations)', icon: '⏱️', severity: 'misdemeanor', fine: [5000, 50000], probation: 1 },
  vandalism: { name: 'Vandalism', icon: '🎨', severity: 'misdemeanor', fine: [300, 2000], probation: 1 },
  burglary: { name: 'Residential Burglary', icon: '🏚️', severity: 'felony', fine: [1000, 10000], prison: [1, 4], probation: 2 },
  autoTheft: { name: 'Motor Vehicle Theft', icon: '🚙', severity: 'felony', fine: [1000, 8000], prison: [1, 3], probation: 2 },
  wireFraud: { name: 'Wire Fraud', icon: '📧', severity: 'felony', fine: [5000, 50000], prison: [1, 5], probation: 3, federal: true },
  insuranceFraud: { name: 'Insurance Fraud', icon: '🩼', severity: 'felony', fine: [5000, 30000], prison: [0, 3], probation: 3 },
  drugDistribution: { name: 'Drug Distribution', icon: '💰', severity: 'felony', fine: [5000, 50000], prison: [2, 8], probation: 3 },
  armedRobbery: { name: 'Armed Robbery', icon: '🔫', severity: 'felony', fine: [2000, 15000], prison: [3, 10], probation: 3, violent: true },
  felonyMurder: { name: 'Felony Murder', icon: '⚰️', severity: 'felony', fine: [0, 0], prison: [25, 40], probation: 0, violent: true, capital: true },
  escape: { name: 'Escape from Custody', icon: '🏃', severity: 'felony', fine: [0, 0], prison: [1, 5], probation: 1 },
  desertion: { name: 'Desertion (UCMJ Art. 85)', icon: '🏃', severity: 'felony', fine: [0, 0], prison: [1, 3], probation: 1, federal: true },
  // Court-martial convictions (UCMJ): federal records, prosecuted by the military (court: 'court-martial').
  ucmjAwol: { name: 'Absence Without Leave (UCMJ Art. 86)', icon: '🚪', severity: 'misdemeanor', fine: [0, 0], prison: [0, 1], federal: true, military: true },
  ucmjDisobey: { name: 'Failure to Obey an Order (UCMJ Art. 92)', icon: '🙅', severity: 'misdemeanor', fine: [0, 0], prison: [0, 1], federal: true, military: true },
  ucmjMaltreatment: { name: 'Maltreatment of a Subordinate (UCMJ Art. 93)', icon: '😤', severity: 'misdemeanor', fine: [0, 0], prison: [0, 1], federal: true, military: true },
  ucmjFalseStatement: { name: 'False Official Statement (UCMJ Art. 107)', icon: '📝', severity: 'felony', fine: [0, 0], prison: [0, 3], federal: true, military: true },
  ucmjDrugs: { name: 'Wrongful Use of a Controlled Substance (UCMJ Art. 112a)', icon: '💊', severity: 'misdemeanor', fine: [0, 0], prison: [0, 2], federal: true, military: true },
  ucmjDui: { name: 'Drunken Operation of a Vehicle (UCMJ Art. 113)', icon: '🍺', severity: 'misdemeanor', fine: [0, 0], prison: [0, 1], federal: true, military: true, noSeal: true },
  ucmjLarceny: { name: 'Larceny of Military Property (UCMJ Art. 121)', icon: '📦', severity: 'felony', fine: [0, 0], prison: [1, 5], federal: true, military: true },
  ucmjAssault: { name: 'Aggravated Assault (UCMJ Art. 128)', icon: '👊', severity: 'felony', fine: [0, 0], prison: [1, 4], federal: true, military: true, violent: true },
  ucmjFraternization: { name: 'Fraternization (UCMJ Art. 134)', icon: '💑', severity: 'misdemeanor', fine: [0, 0], prison: [0, 1], federal: true, military: true },
  trespass: { name: 'Criminal Trespass', icon: '🚧', severity: 'infraction', fine: [100, 500] },
  disorderly: { name: 'Disorderly Conduct / Failure to Disperse', icon: '📢', severity: 'misdemeanor', fine: [200, 1000], probation: 1 },
  serviceRefusal: { name: 'Refusing military service (Military Service Act)', icon: '🏃', severity: 'felony', fine: [0, 0], prison: [1, 2], probation: 1 },
  mercenarism: { name: 'Mercenary activity / foreign enlistment', icon: '💰', severity: 'felony', fine: [10000, 50000], prison: [2, 7], probation: 2 },
  draftEvasion: { name: 'Draft Evasion (Military Selective Service Act)', icon: '🏃', severity: 'felony', fine: [5000, 10000], prison: [1, 3], probation: 2, federal: true },
  underageDrinking: { name: 'Minor in Possession of Alcohol', icon: '🍻', severity: 'infraction', fine: [200, 600] },
  speeding: { name: 'Speeding', icon: '🚨', severity: 'infraction', fine: [150, 450] },
  reckless: { name: 'Reckless Driving', icon: '🚗', severity: 'misdemeanor', fine: [500, 2000], probation: 1 },
  dui: { name: 'DUI', icon: '🍺', severity: 'misdemeanor', fine: [1500, 5000], probation: 2, escalate: { after: 2, to: 'felonyDui' }, noSeal: true },
  felonyDui: { name: 'Felony DUI', icon: '🍺', severity: 'felony', fine: [5000, 15000], prison: [1, 4], probation: 3, noSeal: true },
  unlicensed: { name: 'Driving Without a License', icon: '🪪', severity: 'misdemeanor', fine: [300, 1000] },
  shoplifting: { name: 'Shoplifting', icon: '🛒', severity: 'misdemeanor', fine: [200, 1000], probation: 1, escalate: { after: 2, to: 'grandTheft' } },
  grandTheft: { name: 'Grand Theft', icon: '💰', severity: 'felony', fine: [2000, 10000], prison: [1, 3], probation: 2 },
  assault: { name: 'Assault', icon: '👊', severity: 'misdemeanor', fine: [500, 2500], probation: 2, violent: true },
  drugPossession: { name: 'Drug Possession', icon: '💊', severity: 'misdemeanor', fine: [500, 2500], probation: 2 },
  taxEvasion: { name: 'Tax Evasion', icon: '🧾', severity: 'felony', fine: [20000, 100000], prison: [1, 3], probation: 2, federal: true },
  expenseFraud: { name: 'Expense Fraud', icon: '🧾', severity: 'misdemeanor', fine: [2000, 10000], probation: 1, jobRelated: true },
  embezzlement: { name: 'Embezzlement', icon: '💼', severity: 'felony', fine: [10000, 50000], prison: [2, 6], probation: 3, jobRelated: true },
  kickback: { name: 'Procurement Kickbacks', icon: '🤝', severity: 'felony', fine: [10000, 40000], prison: [1, 4], probation: 2, jobRelated: true },
  bribery: { name: 'Bribery of a Public Official', icon: '💵', severity: 'felony', fine: [10000, 60000], prison: [2, 7], probation: 3, jobRelated: true, federal: true },
  falsifiedInspection: { name: 'Falsifying Inspection Records', icon: '🏚️', severity: 'felony', fine: [5000, 25000], prison: [1, 3], probation: 2, jobRelated: true },
  securitiesFraud: { name: 'Securities Fraud', icon: '🪙', severity: 'felony', fine: [25000, 150000], prison: [1, 4], probation: 3, federal: true },
  insiderTrading: { name: 'Insider Trading', icon: '📈', severity: 'felony', fine: [50000, 250000], prison: [1, 5], probation: 2, jobRelated: true, federal: true },
  accountingFraud: { name: 'Accounting Fraud (False Financial Statements)', icon: '📊', severity: 'felony', fine: [50000, 300000], prison: [3, 12], probation: 3, jobRelated: true, federal: true },
  sanctionsEvasion: { name: 'Sanctions Evasion', icon: '🚢', severity: 'felony', fine: [50000, 400000], prison: [2, 10], probation: 3, jobRelated: true, federal: true },
  ponziScheme: { name: 'Investment Fraud (Ponzi Scheme)', icon: '🔺', severity: 'felony', fine: [50000, 500000], prison: [5, 20], probation: 3, jobRelated: true, federal: true },
  healthcareFraud: { name: 'Health Care Fraud (False Claims)', icon: '🧾', severity: 'felony', fine: [20000, 120000], prison: [0, 3], probation: 3, jobRelated: true, federal: true },
  prescriptionFraud: { name: 'Prescription Fraud', icon: '💊', severity: 'felony', fine: [20000, 80000], prison: [2, 6], probation: 3, jobRelated: true, federal: true },
  excessiveForce: { name: 'Deprivation of Rights Under Color of Law', icon: '🚔', severity: 'felony', fine: [5000, 20000], prison: [1, 4], probation: 2, jobRelated: true, federal: true, violent: true },
  falseStatement: { name: 'False Statements to Federal Investigators', icon: '🕵️', severity: 'felony', fine: [5000, 25000], prison: [0, 2], probation: 2, federal: true },
  espionage: { name: 'Espionage (18 U.S.C. § 794)', icon: '🕵️', severity: 'felony', fine: [0, 0], prison: [15, 40], probation: 0, jobRelated: true, federal: true, noSeal: true },
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
  // Street and organized crime
  // Crimes only in closed states (world/Regimes.js).
  antiState: { name: 'Anti-state activity', icon: '👁️', severity: 'felony', fine: [0, 0], prison: [5, 15], probation: 0, noSeal: true, political: true },
  illegalWorship: { name: 'Illegal religious activity', icon: '✝️', severity: 'felony', fine: [0, 0], prison: [3, 12], probation: 0, noSeal: true, political: true },
  foreignMedia: { name: 'Possessing reactionary foreign media', icon: '💾', severity: 'felony', fine: [0, 0], prison: [2, 10], probation: 0, noSeal: true, political: true },
  illegalBorder: { name: 'Illegal border crossing (attempted defection)', icon: '🌊', severity: 'felony', fine: [0, 0], prison: [5, 15], probation: 0, noSeal: true, political: true },
  pettyTheft: { name: 'Petty Theft', icon: '👛', severity: 'misdemeanor', fine: [200, 1000], probation: 1, escalate: { after: 3, to: 'grandTheft' } },
  mailTheft: { name: 'Theft of Mail (18 U.S.C. § 1708)', icon: '📦', severity: 'felony', fine: [1000, 5000], prison: [0, 2], probation: 2, federal: true },
  streetRacing: { name: 'Illegal Street Racing', icon: '🏁', severity: 'misdemeanor', fine: [500, 2500], probation: 1 },
  poaching: { name: 'Poaching', icon: '🦌', severity: 'misdemeanor', fine: [1000, 10000], probation: 1 },
  forgery: { name: 'Forgery (Fake IDs)', icon: '🪪', severity: 'felony', fine: [1000, 5000], prison: [0, 2], probation: 2 },
  receivingStolen: { name: 'Receiving Stolen Property', icon: '📦', severity: 'felony', fine: [1000, 10000], prison: [0, 3], probation: 2 },
  identityTheft: { name: 'Aggravated Identity Theft', icon: '🪪', severity: 'felony', fine: [5000, 25000], prison: [2, 5], probation: 3, federal: true },
  counterfeiting: { name: 'Counterfeiting U.S. Currency', icon: '💵', severity: 'felony', fine: [5000, 25000], prison: [2, 8], probation: 3, federal: true },
  counterfeitGoods: { name: 'Trafficking in Counterfeit Goods', icon: '👜', severity: 'felony', fine: [5000, 50000], prison: [0, 3], probation: 2, federal: true },
  computerIntrusion: { name: 'Computer Fraud & Abuse (Ransomware)', icon: '💻', severity: 'felony', fine: [10000, 100000], prison: [2, 10], probation: 3, federal: true },
  moneyLaundering: { name: 'Money Laundering', icon: '🧺', severity: 'felony', fine: [10000, 250000], prison: [2, 10], probation: 3, federal: true },
  illegalGambling: { name: 'Illegal Gambling Business', icon: '🎲', severity: 'misdemeanor', fine: [2000, 20000], probation: 2, escalate: { after: 1, to: 'racketeering' } },
  extortion: { name: 'Extortion & Loansharking', icon: '🦈', severity: 'felony', fine: [5000, 50000], prison: [3, 10], probation: 3, violent: true },
  drugManufacturing: { name: 'Manufacturing a Controlled Substance', icon: '🌱', severity: 'felony', fine: [5000, 50000], prison: [2, 10], probation: 3 },
  gunTrafficking: { name: 'Firearms Trafficking', icon: '🔫', severity: 'felony', fine: [10000, 100000], prison: [3, 15], probation: 3, federal: true },
  racketeering: { name: 'Racketeering (RICO)', icon: '🕴️', severity: 'felony', fine: [25000, 250000], prison: [5, 20], probation: 3, federal: true },
  carjacking: { name: 'Carjacking', icon: '🚘', severity: 'felony', fine: [5000, 20000], prison: [5, 15], probation: 3, federal: true, violent: true },
  bankRobbery: { name: 'Bank Robbery', icon: '🏦', severity: 'felony', fine: [10000, 50000], prison: [5, 20], probation: 3, federal: true, violent: true },
  // Violence (crime/Violence.js): never a casual button — these come out of confrontations, jobs gone wrong and outfit orders.
  robbery: { name: 'Robbery (Street Mugging)', icon: '🥷', severity: 'felony', fine: [1000, 5000], prison: [2, 7], probation: 3, violent: true },
  aggravatedAssault: { name: 'Aggravated Assault (Deadly Weapon)', icon: '🔪', severity: 'felony', fine: [2000, 10000], prison: [2, 8], probation: 3, violent: true },
  manslaughter: { name: 'Voluntary Manslaughter', icon: '⚰️', severity: 'felony', fine: [0, 0], prison: [5, 15], probation: 3, violent: true },
  murder: { name: 'Second-Degree Murder', icon: '⚰️', severity: 'felony', fine: [0, 0], prison: [15, 30], probation: 0, violent: true },
  firstDegreeMurder: { name: 'First-Degree Murder', icon: '⚰️', severity: 'felony', fine: [0, 0], prison: [25, 50], probation: 0, violent: true, capital: true },
  kidnapping: { name: 'Kidnapping for Ransom', icon: '🚐', severity: 'felony', fine: [0, 0], prison: [10, 30], probation: 3, violent: true, federal: true },
  witnessIntimidation: { name: 'Witness Intimidation', icon: '🤫', severity: 'felony', fine: [2000, 10000], prison: [1, 5], probation: 2, violent: true },
  obstruction: { name: 'Obstruction of Justice (Destroying Evidence)', icon: '🗑️', severity: 'felony', fine: [2000, 15000], prison: [0, 3], probation: 2 },
  weaponPossession: { name: 'Unlawful Possession of a Firearm', icon: '🔫', severity: 'felony', fine: [1000, 5000], prison: [1, 5], probation: 2 },
  knifeCrime: { name: 'Possession of a Bladed Article', icon: '🔪', severity: 'misdemeanor', fine: [300, 1500], probation: 1 },
  // Juvenile crimes (crime/Juvenile.js): heard in juvenile court below 18.
  joyriding: { name: 'Taking a Vehicle Without Consent (Joyriding)', icon: '🚗', severity: 'misdemeanor', fine: [300, 1500], probation: 1, escalate: { after: 2, to: 'autoTheft' } },
  truancy: { name: 'Habitual Truancy (Status Offence)', icon: '🎒', severity: 'infraction', fine: [50, 250] },
  // The drug trade (crime/Drugs.js). `drug`: the supply tier, scaled by the country's drug laws.
  possessionWithIntent: { name: 'Possession with Intent to Supply', icon: '💊', severity: 'felony', fine: [2000, 15000], prison: [1, 5], probation: 3, drug: 'supply' },
  drugTrafficking: { name: 'Drug Trafficking (Weight)', icon: '🧱', severity: 'felony', fine: [25000, 250000], prison: [10, 25], probation: 3, federal: true, drug: 'trafficking' },
  drugImportation: { name: 'Importation of a Controlled Drug', icon: '🚢', severity: 'felony', fine: [50000, 500000], prison: [12, 30], probation: 3, federal: true, drug: 'trafficking' },
  drugInducedHomicide: { name: 'Drug-Induced Homicide (Supplying a Fatal Dose)', icon: '⚰️', severity: 'felony', fine: [0, 0], prison: [8, 20], probation: 3, drug: 'supply' },
  // Corruption (crime/Corruption.js).
  briberyOfficer: { name: 'Bribing a Police Officer', icon: '💵', severity: 'felony', fine: [2000, 15000], prison: [1, 4], probation: 2 },
  judicialBribery: { name: 'Bribery of a Judicial Officer', icon: '⚖️', severity: 'felony', fine: [20000, 100000], prison: [3, 10], probation: 3, federal: true },
  policeCorruption: { name: 'Misconduct in Public Office (Taking Payoffs)', icon: '🚔', severity: 'felony', fine: [10000, 50000], prison: [2, 8], probation: 3, jobRelated: true },
  // Sexual offences. Never something the player can choose to do: they exist so the justice system, victims
  // and the careers that handle them (police, prosecutors, defenders, judges, social workers) can deal with them.
  sexualAssault: { name: 'Sexual Assault', icon: '⚠️', severity: 'felony', fine: [0, 0], prison: [4, 15], probation: 5, violent: true, sexual: true, registry: true, noSeal: true },
  rape: { name: 'Rape', icon: '⚠️', severity: 'felony', fine: [0, 0], prison: [8, 25], probation: 5, violent: true, sexual: true, registry: true, noSeal: true },
  childSexualAbuse: { name: 'Sexual Abuse of a Child', icon: '⚠️', severity: 'felony', fine: [0, 0], prison: [10, 30], probation: 10, violent: true, sexual: true, registry: true, noSeal: true },
  domesticAbuse: { name: 'Domestic Abuse (Coercive Control and Assault)', icon: '⚠️', severity: 'felony', fine: [1000, 5000], prison: [1, 5], probation: 3, violent: true },
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

/** A crime's name for warnings ("securities fraud"). */
export const offenseName = (id) => (OFFENSES[id]?.name ?? 'a crime').toLowerCase();
