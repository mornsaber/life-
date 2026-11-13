/**
 * What a crime is before you commit it: what it pays, how likely you are to be caught on the
 * spot or later, what you'd be charged with here (in this country's words), the sentence, and
 * whether a conviction would follow you abroad. Read by the Crime tab's planner.
 *
 * Street crimes carry their numbers in CRIMES[].run; the older reckless choices are listed here.
 */
import { OFFENSES } from './Offenses.js';
import { offenseNameIn, gradeIn } from './LocalLaw.js';
import { FIVE_EYES, SHARING_FROM, euMemberIn, conductIsCrime } from './RecordAbroad.js';
import { yearNow, PRESENT } from '../world/Eras.js';

/** Charge, take and odds for the actions that don't carry a `run`. caught: on the spot; later: found out afterwards. */
const PLANS = {
  speed: { offenseId: 'speeding', caught: 0.35 },
  driveDrunk: { offenseId: 'dui', caught: 0.32, harm: 'A crash in about one drive in twelve' },
  shoplift: { offenseId: 'shoplifting', money: [40, 300], caught: 0.3 },
  barFight: { offenseId: 'assault', caught: 0.35, harm: 'You may get hurt' },
  drugs: { offenseId: 'drugPossession', caught: 0.1, harm: 'Security clearances ask about the last seven years' },
  taxCheat: { offenseId: 'taxEvasion', later: 0.12, note: 'A lighter tax bill this year' },
  vandalism: { offenseId: 'vandalism', caught: 0.25 },
  affair: { offenseId: null, caught: 0.4, note: 'Not a crime: the risk is your partner finding out' },
  scam: { offenseId: 'wireFraud', money: [3000, 25000], caught: 0.05, later: 0.25 },
  insuranceFraud: { offenseId: 'insuranceFraud', money: [5000, 30000], caught: 0.1, later: 0.2 },
  burglary: { offenseId: 'burglary', money: [500, 8000], caught: 0.25, later: 0.12 },
  carTheft: { offenseId: 'autoTheft', money: [1000, 6000], caught: 0.3, later: 0.1 },
  dealDrugs: { offenseId: 'drugDistribution', money: [5000, 40000], caught: 0.2, later: 0.2 },
  armedRobbery: { offenseId: 'armedRobbery', money: [300, 5000], caught: 0.45, later: 0.3, harm: 'About one robbery in thirty ends with someone dead: felony murder' },
  streetRace: { offenseId: 'streetRacing', money: [1000, 8000], caught: 0.15, harm: 'A crash in about one race in ten' },
  torchCar: { offenseId: 'arson', note: 'The insurer pays out what the car was worth', caught: 0.25 },
  launder: { offenseId: 'moneyLaundering', later: 0.2, note: 'Old cases go cold; the dirty money comes out clean' },
  bankRobbery: { offenseId: 'bankRobbery', money: [3000, 40000], caught: 0.55 },
};

const raw = (r) => {
  if (r.run) return { offenseId: r.run.offenseId, money: r.run.money, caught: r.run.caughtNow, later: r.run.discovery };
  return PLANS[r.id] ?? { offenseId: null };
};

/** Whether a conviction for this offence would follow you abroad, in a few words (by the rules of the year). */
export function followsAbroad(offenseId, cc, y = PRESENT) {
  const o = OFFENSES[offenseId];
  if (!o || ['infraction', 'civil'].includes(o.severity)) return 'No — it stays where it was';
  const visa = y >= SHARING_FROM.border ? 'only on visa forms' : 'not at all — records don\'t cross borders yet';
  if (o.political) return 'No — no free country counts a political conviction';
  if (y >= SHARING_FROM.interpol && (o.violent || o.sexual || o.registry || o.capital || o.drug === 'trafficking')) return 'Everywhere — the kind of crime that travels';
  const parts = [];
  if (y >= SHARING_FROM.eu && euMemberIn(cc, y)) parts.push(y >= 1993 ? 'across the EU' : 'across the Community');
  if (y >= SHARING_FROM.fiveEyes && FIVE_EYES.includes(cc) && o.severity === 'felony') parts.push('to the US, UK, Canada, Australia and New Zealand');
  return parts.length ? `To employers ${parts.join(' and ')}; elsewhere ${visa}` : `Abroad, ${visa}`;
}

/** A crime's one-line description in the words of its day. */
const DESC_OF_DAY = { bankRobbery: (y) => (y < 1934 ? 'Sheriffs, posses and Pinkerton detectives hunt bank robbers' : null) };
export const crimeDesc = (state, r) => DESC_OF_DAY[r.id]?.(yearNow(state)) ?? r.desc;

/** The plan for a crime the player can pick: odds already adjusted for heat and skill. */
export function crimePlan(state, r) {
  const p = raw(r);
  const cc = state.character.countryId ?? 'US';
  const c = state.legal.crime ?? { heat: 0, skill: {} };
  const skill = Math.min(5, c.skill?.[r.id] ?? 0);
  const heatF = 1 + (c.heat ?? 0) / 200;
  const caught = p.caught == null ? 0 : Math.min(0.95, Math.max(0.01, p.caught * heatF * (1 - skill * 0.06)));
  const later = p.later ? Math.min(0.9, p.later * (1 + (c.heat ?? 0) / 150)) : 0;
  const money = p.money ? p.money.map((n) => Math.round(n * (1 + skill * 0.1))) : null;
  const o = p.offenseId ? OFFENSES[p.offenseId] : null;
  const legalHere = !p.offenseId || conductIsCrime(cc, p.offenseId, yearNow(state));
  const charge = o ? {
    id: p.offenseId,
    name: offenseNameIn(p.offenseId, cc, null, yearNow(state)),
    grade: gradeIn(cc, o.severity, yearNow(state)),
    severity: o.severity,
    sentence: o.capital ? 'Life, or death where the law allows it' : o.prison ? `${o.prison[0]}–${o.prison[1]} years in prison${o.probation ? `, or ${o.probation} year${o.probation === 1 ? '' : 's'} probation for a first offence` : ''}` : o.fine ? `A fine of $${o.fine[0].toLocaleString()}–$${o.fine[1].toLocaleString()}${o.probation ? ` and ${o.probation} year${o.probation === 1 ? '' : 's'} probation` : ''}` : 'A fine',
    abroad: followsAbroad(p.offenseId, cc, yearNow(state)),
    legalHere,
  } : null;
  return { caught, later, money, skill, charge, harm: p.harm ?? null, note: p.note ?? null };
}
