/**
 * The people next door. Every home comes with a few neighbors who have
 * lives of their own — babies, divorces, new jobs, moving trucks — and who
 * throw block parties, borrow your ladder, play music at 2 a.m., and
 * sometimes show up when you need help. Good neighbors make a place feel
 * like home (and can become friends); feuds wear on you.
 *
 * state.civic.neighbors = [{ id, name, icon, trait, rel, household, since }]
 * state.civic.neighborsAt = home key the list belongs to
 */
import { clamp } from '../../core/Random.js';
import { randomName } from '../../core/State.js';

export const TRAITS = {
  friendly: { label: 'Friendly', icon: '😊', mood: 6 },
  nosy: { label: 'Nosy', icon: '👀', mood: -2 },
  loud: { label: 'Loud', icon: '🔊', mood: -4 },
  handy: { label: 'Handy', icon: '🧰', mood: 3 },
  private: { label: 'Keeps to themselves', icon: '🚪', mood: 0 },
  elderly: { label: 'Retired', icon: '👵', mood: 2 },
  partier: { label: 'Party people', icon: '🎉', mood: -1 },
  feuding: { label: 'Prickly', icon: '😠', mood: -6 },
};
const HOUSEHOLDS = ['a young couple', 'a family with two kids', 'a retired couple', 'a single dad and his teenager', 'three roommates', 'a nurse who works nights', 'newlyweds', 'a widow and her dog', 'a big multigenerational family'];

/** Where you live now, for deciding when the neighbors change. */
export function homeKey(state, housing) {
  if (state.legal.incarceration) return null;
  if (housing === 'owner') return `own:${state.housing.properties.find((p) => p.use === 'primary' && p.regionId === state.character.regionId)?.id}`;
  if (housing === 'renting') return `rent:${state.character.regionId}:${state.housing.rental?.tier}`;
  if (housing === 'military') return `base:${state.character.regionId}`;
  if (housing === 'parents') return `parents:${state.character.regionId}`;
  return null;
}

export function makeNeighbor(rng) {
  const trait = rng.pick(Object.keys(TRAITS));
  const { firstName, lastName } = randomName(rng, rng.pick(['male', 'female']));
  return { id: rng.id('nb_'), name: `the ${lastName}s`, contact: firstName, icon: TRAITS[trait].icon, trait, rel: rng.int(35, 60), household: rng.pick(HOUSEHOLDS) };
}

export const avgRel = (list) => (list.length ? list.reduce((s, n) => s + n.rel, 0) / list.length : 50);
export const bumpRel = (n, d) => { n.rel = Math.round(clamp(n.rel + d, 0, 100)); };

/** Neighbors' own life events — things that happen to them, not you. */
export const LIFE_EVENTS = [
  { text: (n) => `${n.name} had a baby. You dropped off a casserole.`, rel: 4 },
  { text: (n) => `${n.contact} from ${n.name} lost their job. The car didn't move for weeks.`, rel: 0 },
  { text: (n) => `${n.name} put in a pool. Suddenly everyone on the street is their friend.`, rel: 2 },
  { text: (n) => `${n.name}'s oldest graduated; the party spilled onto your lawn.`, rel: -1 },
  { text: (n) => `${n.name} are getting divorced. The arguments carry through the walls.`, rel: -2 },
  { text: (n) => `${n.contact} from ${n.name} beat cancer. The whole street came out to cheer the last chemo.`, rel: 5 },
  { text: (n) => `${n.name} adopted a very loud dog.`, rel: -3 },
  { text: (n) => `${n.name} got a new truck and won't stop talking about it.`, rel: 1 },
  { text: (n) => `${n.name}'s house was broken into while they were on vacation.`, rel: 0, safety: true },
];

/** Interactive neighbor situations. */
export const SITUATIONS = [
  { id: 'party', title: '🎉 Block Party', text: (n) => `${n.name} are organizing a block party and asked you to bring something.`, options: [
    { id: 'go', label: '🍔 Go and bring burgers', rel: 8, happy: 4, cost: 60, text: 'You met half the street. Great night.' },
    { id: 'skip', label: '🛋️ Stay in', rel: -3, text: 'You heard it through the window.' },
  ] },
  { id: 'noise', title: '🔊 2 a.m. Music', text: (n) => `${n.name} are blasting music at 2 a.m. on a work night — again.`, options: [
    { id: 'knock', label: '🚪 Knock and ask nicely', rel: 2, check: 0.65, text: 'They apologized and turned it down.', failText: 'They laughed and turned it up.' },
    { id: 'police', label: '📞 Call in a noise complaint', rel: -12, text: 'The police came. They know it was you.' },
    { id: 'earplugs', label: '😴 Earplugs', stress: 3, text: 'You lost some sleep.' },
  ] },
  { id: 'tree', title: '🌳 The Tree Dispute', text: (n) => `A branch from ${n.name}'s oak is hanging over your roof. ${n.contact} says it's your problem.`, options: [
    { id: 'split', label: '🤝 Offer to split the arborist', rel: 6, cost: 400, text: 'You split the bill. Fences make good neighbors; so does splitting the bill.' },
    { id: 'pay', label: '💵 Just pay for it yourself', rel: 2, cost: 800, text: 'You paid. Problem solved.' },
    { id: 'small', label: '⚖️ Threaten small claims', rel: -18, check: 0.5, refund: 800, text: 'They paid up — and stopped waving.', failText: 'The judge said it was a shared issue. Now you\'re enemies.' },
  ] },
  { id: 'borrow', title: '🪜 Can I Borrow…', text: (n) => `${n.contact} from ${n.name} wants to borrow your ladder. They never returned the hedge trimmer.`, options: [
    { id: 'lend', label: '🪜 Lend it', rel: 4, text: 'They brought it back with a six-pack.' },
    { id: 'no', label: '🙅 Make an excuse', rel: -4, text: 'They know.' },
  ] },
  { id: 'emergency', title: '🚑 Help Next Door', text: (n) => `You hear ${n.contact} from ${n.name} shouting for help — someone collapsed in the yard.`, options: [
    { id: 'help', label: '🏃 Run over and help', rel: 15, happy: 5, text: 'You called 911 and kept them calm until the ambulance came. They\'ll never forget it.' },
    { id: 'call', label: '📞 Call 911 from your porch', rel: 3, text: 'Help came. You stayed out of the way.' },
  ] },
  { id: 'package', title: '📦 Porch Pirate', text: (n) => `${n.name}'s doorbell camera caught someone stealing your packages. They want to start a street group chat about it.`, options: [
    { id: 'join', label: '📱 Join the chat', rel: 5, stress: 2, text: 'The chat is 90% lost cats and 10% conspiracy theories. But you know everyone now.' },
    { id: 'pass', label: '🙅 Pass', text: 'You got a lockbox instead.' },
  ] },
  { id: 'fence', title: '🚧 The Property Line', text: (n) => `${n.name} had a survey done. They say your driveway is six inches over the line.`, options: [
    { id: 'survey', label: '📐 Get your own survey', cost: 600, check: 0.55, rel: -4, text: 'Your survey says the line is fine. They grumbled and dropped it.', failText: 'Your survey agreed with theirs. You moved the edging.' },
    { id: 'concede', label: '🤝 Let it go', rel: 6, happy: -2, text: 'You let them have it. Six inches isn\'t worth a war.' },
  ] },
];
