/**
 * Officer academies abroad: real cadet years before the commission.
 *
 *   Sandhurst (UK)      44 weeks for every officer cadet, graduates included; the Sovereign's
 *                       Parade and the Sword of Honour for the best cadet
 *   Saint-Cyr (FR)      three years, and a master's degree
 *   IMA / NDA (IN)      the National Defence Academy (three years, a degree) then the Indian
 *                       Military Academy; graduates go straight to the IMA
 *   Duntroon (AU)       ADFA's degree, then the Royal Military College
 *   Defense Academy (JP), Korea Military Academy, Accademia di Modena (IT),
 *   Academia General Militar (ES), the PLA's academies (CN): four-year degrees
 *
 * svc.academy = { name, yearsLeft, degree, best }
 */
import { clamp } from '../../core/Random.js';
import { addHonor } from '../../core/State.js';

/** [academy, years for a school-leaver, years for a graduate, degree awarded, best cadet's prize]. */
export const ACADEMIES = {
  GB: ['the Royal Military Academy Sandhurst', 1, 1, null, 'the Sword of Honour'],
  FR: ['the École spéciale militaire de Saint-Cyr', 3, 1, 'master', 'the major de promotion'],
  IN: ['the National Defence Academy and the Indian Military Academy', 4, 1, 'bachelor', 'the Sword of Honour'],
  AU: ['ADFA and the Royal Military College, Duntroon', 4, 2, 'bachelor', 'the Sword of Honour'],
  JP: ['the National Defense Academy of Japan', 4, 1, 'bachelor', 'the Director\'s Award'],
  KR: ['the Korea Military Academy', 4, 1, 'bachelor', 'the Presidential Award'],
  IT: ['the Accademia Militare di Modena', 3, 1, 'bachelor', 'the Sciabola d\'onore'],
  ES: ['the Academia General Militar, Zaragoza', 5, 2, 'bachelor', 'the Despacho de número uno'],
  CN: ['a PLA military academy', 4, 1, 'bachelor', 'the academy\'s first-class merit'],
  DE: ['the Offizierschule des Heeres and a Bundeswehr university', 4, 1, 'master', 'the Ehrensäbel'],
  CA: ['the Royal Military College of Canada', 4, 1, 'bachelor', 'the Sword of Honour'],
  PK: ['the Pakistan Military Academy, Kakul', 2, 1, null, 'the Sword of Honour'],
  NG: ['the Nigerian Defence Academy', 4, 1, 'bachelor', 'the Sword of Honour'],
};

/** The academy for a new officer cadet in a nation's forces (null where none is modelled). */
export function academyFor(nation, graduate) {
  const a = ACADEMIES[nation];
  if (!a) return null;
  return { name: a[0], yearsLeft: graduate ? a[2] : a[1], degree: graduate ? null : a[3], prize: a[4], score: 0 };
}

const EVENTS = [
  'Exercise on the training area: four days in the rain, leading a section through the night.',
  'Academic term: military history, international affairs, and an essay on leadership.',
  'The drill square at dawn, every morning, until the colour sergeant was satisfied.',
  'Adventurous training: a fortnight climbing and sailing with your platoon.',
  'A command task gone wrong in front of the directing staff. You learned more from it than from any lecture.',
];

/** One year as a cadet (returns true while the academy continues). */
export function academyYear(ctx, svc) {
  const { state, rng } = ctx;
  const a = svc.academy;
  if (!a || a.yearsLeft <= 0) return false;
  a.yearsLeft -= 1;
  a.score += (state.stats.smarts - 50) / 10 + (state.stats.fitness - 50) / 10 + rng.int(-4, 6);
  ctx.stat('fitness', rng.int(2, 5));
  ctx.stat('stress', 6);
  ctx.earn(4000, 'Officer cadet pay');
  if (a.yearsLeft > 0) {
    ctx.log(`A year at ${a.name}. ${rng.pick(EVENTS)}`, '🎓', 'military');
    return true;
  }
  // Graduation.
  if (a.degree) {
    state.education.degrees.push({ type: a.degree, programId: a.degree, major: 'militaryScience', schoolId: 'academy', gpa: clamp(2.6 + a.score / 40, 2.0, 4.0), year: state.character.age, academy: a.name });
    ctx.log(`You graduated from ${a.name} with a ${a.degree}'s degree.`, '🎓', 'good');
  }
  if (a.score >= 18 && rng.chance(0.25)) {
    addHonor(state, { id: `mil.academyPrize.${a.name}`, source: 'military', name: `${a.prize[0].toUpperCase()}${a.prize.slice(1)}`, icon: '⚔️', prestige: 6, precedence: 30, citation: `Best cadet of the year at ${a.name}.` });
    ctx.log(`At the passing-out parade you were named the best cadet of your intake: ${a.prize}.`, '⚔️', 'honor');
  }
  return false;
}
