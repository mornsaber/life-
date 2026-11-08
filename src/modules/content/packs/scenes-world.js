/**
 * Scenes of history (played by career/Scenes.js; anyone can be drawn into them, job or not).
 *
 *   resist.occupation   the resistance in an occupied country during the Second World War (or
 *                       a later war fought on home soil): carrying messages, sabotage, hiding
 *                       people the occupiers are hunting. Capture can mean death.
 */
import { warHere } from '../../world/War.js';

const ALLIED_OCCUPIED = ['FR', 'NL', 'BE', 'NO', 'DK', 'PL', 'GR', 'LU', 'CZ', 'PH', 'ID', 'MY', 'SG', 'MM', 'UA', 'EE', 'LV', 'LT', 'CN', 'KR'];
/** Living under occupation: a war at home that reached the streets, in a country on the losing side of the front. */
const occupied = (s) => {
  const w = warHere(s);
  if (!w || w.phase === 'ceasefire' || (w.homeFront ?? 0) < 0.4 || s.character.age < 15) return false;
  return (w.id === 'ww2' && ALLIED_OCCUPIED.includes(s.character.countryId)) || (w.front ?? 0) < -30;
};

const resistance = {
  id: 'resist.occupation', title: 'The Resistance', icon: '📻', chance: 0.4, weight: 3, trauma: 8, noJob: true, inquiry: false, circle: 'neighbourhood',
  honor: 'Resistance Medal', honorChance: 0.9,
  for: (s) => occupied(s),
  data: (s, rng) => ({ name: rng.pick(['Henri', 'Anneke', 'Jakub', 'Ingrid', 'Eleni', 'Marek']) }),
  start: 'approach',
  steps: {
    approach: { title: 'A Knock at Night', icon: '🚪', text: '{name}, a neighbour you thought you knew, is at your door after curfew. "We need someone they won\'t suspect."', options: [
      { id: 'yes', label: '✊ "What do you need?"', next: 'task' },
      { id: 'no', label: '🚪 Close the door', hint: 'Keep your family safe' },
    ] },
    task: { title: 'The Work', icon: '📦', text: 'There\'s a choice of work, and every kind of it is a death sentence if you\'re caught.', options: [
      { id: 'courier', label: '🚲 Carry messages by bicycle through the checkpoints', check: { stats: { smarts: 1 }, skills: ['persuasion'], bar: 45 },
        pass: { text: 'You smiled at the sentry, and the papers in your handlebars went through.', score: { lives: 2 } }, fail: { text: 'They searched your bag. You talked your way out, barely, and they took your name.', score: { crew: -2 }, flag: 'watched' }, next: 'raid' },
      { id: 'sabotage', label: '💥 Blow a railway line before a troop train', tone: 'danger', check: { skills: ['mechanics'], stats: { smarts: 1 }, bar: 55 },
        pass: { text: 'The line went up at two in the morning. No train ran for a week.', score: { city: 3, lives: 1 } }, fail: { text: 'The charge didn\'t fire. The patrol came along the line with dogs.', score: { crew: -3 }, flag: 'watched' }, next: 'raid' },
      { id: 'hide', label: '🏠 Hide a family the occupiers are hunting, in your attic', check: { stats: { smarts: 1 }, bar: 50 },
        pass: { text: 'They lived above your ceiling for two years. Nobody ever knew.', score: { lives: 4 }, flag: 'sheltered' }, fail: { text: 'A neighbour noticed you were buying too much bread.', score: { lives: 1, crew: -2 }, flag: 'watched' }, next: 'raid' },
    ] },
    raid: { title: 'The Raid', icon: '🚨', text: 'Boots on the stairs at dawn. The secret police are searching the building.', options: [
      { id: 'bluff', label: '🎭 Open the door and play the dull, loyal citizen', check: { skills: ['persuasion'], stats: { smarts: 1 }, bar: 50 },
        pass: { text: 'They searched the flat for an hour and left with nothing.', score: { crew: 2 } }, fail: { text: 'They found the wireless set behind the panel.', score: { crew: -4 }, flag: 'captured' } },
      { id: 'run', label: '🏃 Over the rooftops', check: { stats: { fitness: 1 }, bar: 50 },
        pass: { text: 'You were three streets away before they reached the top floor. You lived in safe houses until the end of the war.', score: { crew: 1 } }, fail: { text: 'You fell on the roof tiles and they took you in the yard.', score: { crew: -4 }, flag: 'captured' } },
    ] },
  },
  outcome: (sc, tier, s) => {
    if (!sc.flags.length && sc.step === 'approach') return { text: 'You closed the door on {name}. You never saw them again, and you never stopped wondering.', effects: (ctx) => ctx.stat('happiness', -3) };
    if (sc.flags.includes('captured')) return { text: 'You were taken to the prison on the edge of town.', effects: (ctx) => { if (ctx.rng.chance(0.45)) ctx.die('Executed by the occupiers for resistance work'); else { ctx.emit('health:trauma', { amount: 25, source: 'interrogation' }); ctx.log('They interrogated you for weeks and sent you to a camp. You survived it. Not everyone did.', '⛓️', 'bad'); } } };
    if (sc.flags.includes('sheltered')) return { text: 'The family you hid survived the war. Decades later, their grandchildren came to find you.', effects: (ctx) => { ctx.stat('happiness', 8); } };
    return null;
  },
  tiers: {
    outstanding: 'You did your part in the resistance with {name}, and lived to see the liberation.',
    good: 'You served in the resistance with {name}. After the war you rarely spoke of it.',
    mixed: 'You did what you could with {name}. Some of it worked.',
    bad: 'The network was rolled up. {name} was never seen again.',
  },
};

export const WORLD_SCENES = [resistance];
