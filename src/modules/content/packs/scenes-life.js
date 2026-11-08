/**
 * Scenes from a life at home (played by career/Scenes.js; no job needed). The four scores
 * mean something different here: lives = love, crew = the children and family, city = money
 * and the home, trust = trust.
 *
 *   marriage.crisis   a marriage drifting apart: the distance, the conversation, what happens
 *                     next (counselling, a separation, the affair that comes out)
 */
import { spouseOf, clampRel } from '../../people/People.js';
import { divorce } from '../../people/PeopleEngine.js';

const drifting = (s) => {
  const sp = spouseOf(s);
  return Boolean(sp) && s.character.age - (sp.since ?? s.character.age) >= 4 && ((sp.relationship ?? 60) < 52 || (sp.spark ?? 60) < 35);
};

const crisis = {
  id: 'marriage.crisis', title: 'Drifting Apart', icon: '💔', chance: 0.4, weight: 4, trauma: 2, noJob: true, inquiry: false, honorChance: 0, circle: 'family', stepTitles: true,
  for: (s) => drifting(s),
  data: (s) => ({ name: spouseOf(s)?.firstName ?? 'your spouse' }),
  start: 'distance',
  steps: {
    distance: { title: 'The Distance', icon: '🛋️', text: 'You and {name} have become polite strangers: separate screens in the evening, conversations about bins and school runs. Tonight {name} goes to bed without saying goodnight.', options: [
      { id: 'talk', label: '🗣️ Go upstairs and talk, now', score: { lives: 1, trust: 1 }, next: 'talk' },
      { id: 'leave', label: '🤐 Leave it. It\'s just a phase', score: { lives: -1 }, next: 'complication' },
    ] },
    talk: { title: 'The Conversation', icon: '🕯️', text: '{name} says they\'ve been lonely for years, inside the marriage.', options: [
      { id: 'listen', label: '👂 Listen, without defending yourself', check: { skills: ['caregiving', 'persuasion'], bar: 45 },
        pass: { text: 'You listened for an hour. Then {name} took your hand.', score: { lives: 2, trust: 2 } }, fail: { text: 'You defended yourself after all. It turned into the old argument.', score: { trust: -1 } }, next: 'choice' },
      { id: 'blame', label: '😤 Point out what they\'ve done too', score: { lives: -1, trust: -1 }, next: 'choice' },
    ] },
    choice: { title: 'What Now', icon: '🧭', text: 'You both know something has to change.', options: [
      { id: 'counsel', label: '🛋️ Marriage counselling', score: { lives: 2, city: -1, trust: 1 } },
      { id: 'trip', label: '✈️ A trip, just the two of you', score: { lives: 1, city: -1 } },
      { id: 'separate', label: '🚪 A trial separation', score: { lives: -2, crew: -2 }, flag: 'separated' },
    ] },
  },
  complications: {
    affair: { title: 'The Messages', icon: '📱', text: 'You see a message on {name}\'s screen that wasn\'t meant for you.', options: [
      { id: 'confront', label: '💢 Confront them', score: { trust: -2 }, next: 'choice' },
      { id: 'forgive', label: '🤍 Try to understand why', check: { skills: ['caregiving'], bar: 55 }, pass: { text: '{name} cried and ended it. It will take years to trust again.', score: { lives: 1, trust: -1 } }, fail: { text: 'You couldn\'t. Every time they picked up the phone, you wondered.', score: { trust: -3 } }, next: 'choice' },
    ] },
    kids: { title: 'The Children Notice', icon: '🧒', text: 'Your youngest asks if you and {name} are getting divorced.', options: [
      { id: 'honest', label: '🫂 "We\'re working on things"', score: { crew: 1, trust: 1 }, next: 'choice' },
      { id: 'deny', label: '🙂 "Of course not, silly"', score: { crew: -1 }, next: 'choice' },
    ] },
  },
  outcome: (sc, tier, s) => {
    const sp = spouseOf(s);
    if (!sp) return null;
    const delta = { outstanding: 30, good: 18, mixed: 0, bad: -20 }[tier];
    if (sc.flags.includes('separated') && tier !== 'outstanding') return { text: `The separation from ${sp.firstName} became permanent.`, effects: (ctx) => divorce(ctx, sp) };
    return {
      text: { outstanding: `You and ${sp.firstName} found each other again. People say your marriage is the one they'd want.`, good: `You and ${sp.firstName} came through it, closer than before.`, mixed: `You and ${sp.firstName} are still together, for now.`, bad: `Something broke between you and ${sp.firstName} that won't mend.` }[tier],
      effects: () => { sp.relationship = clampRel(sp.relationship + delta); if (sp.spark != null) sp.spark = clampRel(sp.spark + delta); },
    };
  },
  tiers: { outstanding: '', good: '', mixed: '', bad: '' },
};

export const LIFE_SCENES = [crisis];
