/**
 * Living somewhere small. Rural towns and remote places get:
 *
 *   Fewer jobs   The staples (farms, shops, schools, the clinic, trades,
 *                trucking, police and fire, the post office, the prison
 *                outside town) always hire. Other careers hire locally only
 *                some years, and big-city careers (airlines, banks,
 *                universities, intelligence) never do.
 *   Commuting    Towns within a realistic drive of a city (COMMUTES) can
 *                take city work by commuting; everywhere else, the work is
 *                what's in town. Remote-capable jobs work from anywhere.
 *                Commuting costs fuel, time and patience every year.
 *   Distance     A serious emergency is a long way from a hospital
 *                (HealthEngine asks ruralRisk).
 *   Community    The show or county fair, neighbours who need a hand, the
 *                road cut off, the last shop closing, and grown children
 *                leaving for the city.
 */
import { REGIONS } from './Regions.js';
import { cityName } from '../career/Employers.js';
import { ageOf } from '../people/People.js';
import { PROFESSIONS } from '../career/JobTrees.js';
import { workModeOf } from '../career/JobMarket.js';
import { priceLevel } from '../world/Countries.js';

/** null (a city), 'town' (a small town) or 'remote' (rural). */
export function remoteness(state) {
  const r = REGIONS[state?.character?.regionId];
  if (!r) return null;
  if (r.type === 'Rural' || r.id === 'rural') return 'remote';
  if (r.size === 'small' || r.type === 'Small town' || r.id === 'smalltown') return 'town';
  return null;
}
export const isRural = (state) => Boolean(remoteness(state));
/**
 * Small places within a realistic daily commute of a city: [city, minutes each way].
 * Everywhere else, the work is what's in town.
 */
export const COMMUTES = {
  // US
  clarksville: ['nashville', 50], ogden: ['saltlake', 40], stafford: ['dc', 60],
  // Germany, Italy, Japan, Korea, Mexico, New Zealand
  fulda: ['frankfurt', 60], garmisch: ['munich', 75], rieti: ['rome', 75], benevento: ['naples', 60],
  yame: ['fukuoka', 60], gapyeong: ['seoul', 60], gyeongju: ['pohang', 35], tequila: ['guadalajara', 60], ashburton: ['christchurch', 60],
  // Netherlands, Sweden
  delfzijl: ['groningen', 35], boxmeer: ['nijmegen', 35], winterswijk: ['nijmegen', 60], middelharnis: ['rotterdam', 40],
  osthammar: ['uppsala', 60], ystad: ['malmo', 45], simrishamn: ['malmo', 60], vadstena: ['linkoping', 45],
  // Israel, Palestine, China
  zikhron: ['haifa', 35], nazareth: ['haifa', 40], birzeit: ['ramallah', 20], dura: ['hebron', 15], qabatiya: ['nablus', 40], wuzhen: ['hangzhou', 60], anji: ['hangzhou', 60],
  // Nigeria, Kenya, South Africa, Indonesia
  epe: ['lagos', 75], badagry: ['lagos', 75], kwali: ['abuja', 60], wudil: ['kano', 45], nsukka: ['enugu', 60],
  limuru: ['nairobi', 45], thika: ['nairobi', 50], naivasha: ['nakuru', 60], molo: ['nakuru', 60], ahero: ['kisumu', 30], moiben: ['eldoret', 40],
  cullinan: ['pretoria', 40], ubud: ['denpasar', 60],
};

/** The city you could commute to from here, if any: { ...region, minutes }. */
export function nearestCity(state) {
  const c = COMMUTES[state.character.regionId];
  const r = c && REGIONS[c[0]];
  return r ? { ...r, minutes: c[1] } : null;
}

/** Work that every small place has. */
const STAPLES = new Set([
  'agriculture', 'retail', 'culinary', 'hospitality', 'education', 'nursing', 'travelNursing', 'caregiving', 'childcare', 'medical', 'physicianAssistant', 'pharmacy',
  'trucking', 'logistics', 'trades', 'plumbing', 'hvac', 'welding', 'automotive', 'carpentry', 'lineworker', 'fishing', 'realestate', 'insurance', 'funeral',
  'police', 'sheriff', 'statePolice', 'fire', 'ems', 'privateEms', 'stateFire', 'corrections', 'jail', 'federalPrisons', 'privatePrisons', 'borderPatrol', 'parkService', 'gameWarden', 'forester',
  'postal', 'clergy', 'catholicClergy', 'anglicanClergy', 'schoolBus', 'library', 'waterUtility', 'publicWorks', 'municipalAdmin', 'councilInspector', 'emergencyManagement', 'contentCreator',
]);
/** Careers that only exist in cities. */
const CITY_ONLY = new Set([
  'aviation', 'charterAviation', 'flightAttendant', 'airportPolice', 'airportFire', 'tsa', 'airTrafficControl', 'transit', 'transitMaintenance', 'transitPolice', 'universityPolice',
  'university', 'nationalLab', 'research', 'intelligence', 'caseOfficer', 'sigint', 'foreignService', 'fbi', 'dea', 'atf', 'usss', 'usms', 'regulatory', 'oig', 'legislativeStaff',
  'finance', 'tech', 'dataScience', 'cybersecurity', 'gameDevelopment', 'acting', 'athletics', 'cruise', 'merchantMarine', 'actuary', 'marketing', 'corporate', 'law', 'prosecution', 'publicDefender', 'courts',
]);

const key = (id) => PROFESSIONS[id]?.template ?? id;
/** A stable yes/no for "is this career hiring around here this year". */
function hiringThisYear(state, id, odds) {
  const year = (state.character.birthYear ?? 0) + state.character.age;
  let h = 2166136261;
  for (const c of `${state.character.regionId}|${id}|${year}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return (h % 1000) / 1000 < odds;
}

/**
 * Can you get this job living where you do? { ok, commute?: { to, regionId, minutes }, reason? }
 * Cities: always. Small places: staples locally, the rest some years, city careers by commuting
 * from a small town (never from a remote one).
 */
export function ruralHiring(state, professionId) {
  const where = remoteness(state);
  if (!where) return { ok: true };
  const id = key(professionId);
  const p = PROFESSIONS[professionId];
  if (STAPLES.has(id) || p?.dutyStation) return { ok: true };
  if (p?.remote) return { ok: true, note: 'Works remotely from here' };
  const town = cityName(state.character.regionId);
  const city = nearestCity(state);
  const local = !CITY_ONLY.has(id) && hiringThisYear(state, id, where === 'town' ? 0.35 : 0.25);
  if (local) return { ok: true, note: `Hiring in ${town} this year` };
  // Within reach of a city: city careers by commuting, and the rest only if the city happens to be hiring.
  if (city && (CITY_ONLY.has(id) || hiringThisYear(state, `${id}@city`, 0.4))) return { ok: true, commute: { to: city.name, regionId: city.id, minutes: city.minutes } };
  return { ok: false, reason: CITY_ONLY.has(id) ? `No ${p?.name ?? 'such'} jobs out here — you'd have to move to a city` : `Nobody's hiring within reach of ${town} this year` };
}

/** How far you drive to work each way (0 if you work where you live or from home). */
export function commuteOf(state, job = state.career.job) {
  const where = remoteness(state);
  if (!where || !job?.employer) return 0;
  if (job.employer.city === cityName(state.character.regionId)) return 0;
  if (job.employer.stateId && job.employer.stateId !== REGIONS[state.character.regionId]?.state) return 0;
  const mode = workModeOf(job);
  if (mode === 'remote') return 0;
  // To the city you can commute to; a job anywhere else in the province is a long drive.
  const near = nearestCity(state);
  const mins = near && job.employer.city === cityName(near.id) ? near.minutes : where === 'remote' ? 120 : 90;
  return Math.round(mins * (mode === 'hybrid' ? 0.5 : 1));
}

/** Extra risk of a serious emergency far from a hospital (0 in a city). */
export const ruralRisk = (state) => ({ town: 0.12, remote: 0.3 }[remoteness(state)] ?? 0);

const WILDLIFE = { AU: ['🦘', 'a kangaroo'], NZ: ['🐑', 'a flock of sheep'], SE: ['🫎', 'a moose'], CA: ['🫎', 'a moose'], KE: ['🦓', 'a zebra'], ZA: ['🐒', 'a troop of baboons'], IN: ['🐄', 'a cow'], ID: ['🐃', 'a water buffalo'] };

const DECK = [
  { id: 'show', icon: '🎡', title: 'The Show Is On', text: 'The county fair — the agricultural show, the summer festival — is the biggest weekend of the year here.', options: [
    { id: 'enter', label: '🏆 Enter something (baking, livestock, the tractor pull)' }, { id: 'go', label: '🎠 Just go and enjoy it' }, { id: 'skip', label: '🏠 Stay home' },
  ] },
  { id: 'neighbour', icon: '🤝', title: 'A Neighbour in Trouble', text: 'A neighbour broke a leg in the middle of harvest, and there\'s nobody else to bring it in.', options: [
    { id: 'help', label: '🚜 Give up your weekends to help' }, { id: 'meal', label: '🍲 Organise meals for the family' }, { id: 'no', label: '🙅 You\'ve got your own problems' },
  ] },
  { id: 'cutoff', icon: '🚧', title: 'Cut Off', text: 'Floodwater (or snow, or a landslide) has closed the only road out of town. It could be days.', options: [
    { id: 'wait', label: '🥫 Stock up and wait it out' }, { id: 'drive', label: '🚙 Try the back road', tone: 'danger' },
  ] },
  { id: 'closing', icon: '🏚️', title: 'The Last One in Town', text: 'The last bank branch (or grocery, or doctor\'s clinic) in town is closing. The next one is forty minutes away.', options: [
    { id: 'fight', label: '📣 Start a petition and pack the meeting' }, { id: 'shrug', label: '🚗 Drive further, like everyone else' },
  ] },
  { id: 'internet', icon: '📶', title: 'The Internet Barely Works', text: 'Video calls freeze, homework won\'t upload, and the provider says your street isn\'t "commercially viable."', options: [
    { id: 'satellite', label: '🛰️ Pay for satellite internet', hint: 'About $600 a year' }, { id: 'live', label: '📻 Live with it' },
  ] },
  { id: 'gossip', icon: '🗣️', title: 'Everybody Knows', text: 'Something you did last month is now the main topic at the café, the pub and the church hall.', options: [
    { id: 'laugh', label: '😄 Laugh it off' }, { id: 'confront', label: '😠 Find out who started it' },
  ] },
  { id: 'wildlife', icon: '🦌', title: 'At Dusk', text: 'Driving home at dusk, something big leaps onto the road in front of you.', options: [
    { id: 'brake', label: '🛑 Brake hard' }, { id: 'swerve', label: '↪️ Swerve', tone: 'danger' },
  ] },
];

export const RuralLifeModule = {
  id: 'rural',
  order: 22.7,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const where = remoteness(state);
    if (!where || state.legal?.incarceration || state.character.posting) return;
    const age = state.character.age;
    // The feel of a small place: tight-knit for settled adults, dull for the young.
    if (age >= 16 && age <= 27 && rng.chance(0.3)) { ctx.stat('happiness', -2); if (rng.chance(0.3)) ctx.log(`Not much happens in ${cityName(state.character.regionId)} on a Saturday night.`, '🌾'); }
    else if (age >= 30 && rng.chance(0.4)) ctx.stat('happiness', 1);
    // The commute.
    const job = state.career.job;
    const mins = commuteOf(state, job);
    if (mins) {
      const cost = Math.round(mins * 70 * priceLevel(state) / 10) * 10;
      // Fuel and wear come out of your pay; when money's that tight, the stress shows instead of a debt.
      if (!ctx.spend(cost, `Commuting to ${job.employer.city} (${mins} min each way)`)) { ctx.spend(Math.max(0, state.finances.cash), `Commuting to ${job.employer.city}`); ctx.stat('stress', 4); }
      ctx.stat('stress', Math.round(mins / 20));
      ctx.stat('happiness', -Math.round(mins / 30));
      if (rng.chance(0.25)) ctx.log(`Another year of ${mins} minutes each way to ${job.employer.city}. You know every pothole.`, '🚗');
    }
    // Grown children head for the city.
    for (const p of state.people?.list ?? []) {
      if (p.relation !== 'child' || !p.alive || p.movedAway) continue;
      const theirAge = ageOf(state, p);
      if (theirAge >= 19 && theirAge <= 26 && rng.chance(0.2)) {
        const city = nearestCity(state);
        p.movedAway = city?.name ?? 'the city';
        p.relationship = Math.max(0, (p.relationship ?? 60) - 3);
        ctx.log(`${p.firstName} moved to ${p.movedAway} for work. They're home for the holidays — most years.`, '🧳');
      }
    }
    if (age >= 10 && rng.chance(0.35) && !state.prompts.some((x) => x.type === 'rural.moment')) {
      const d = rng.pick(DECK);
      const [icon, animal] = WILDLIFE[state.character.countryId ?? 'US'] ?? ['🦌', 'a deer'];
      ctx.prompt({ type: 'rural.moment', icon: d.id === 'wildlife' ? icon : d.icon, title: d.title, text: d.id === 'wildlife' ? `Driving home at dusk, ${animal} leaps onto the road in front of you.` : d.text, options: d.options, data: { id: d.id } });
    }
  },
  resolvers: {
    moment(ctx, data, optionId) {
      const { rng } = ctx;
      switch (`${data.id}.${optionId}`) {
        case 'show.enter': if (rng.chance(0.3)) { ctx.stat('happiness', 8); ctx.log('You won a blue ribbon. It\'s going on the fridge, then the wall.', '🏆', 'good'); } else { ctx.stat('happiness', 3); ctx.log('No ribbon this year, but the judges were complimentary. Mostly.', '🎡'); } break;
        case 'show.go': ctx.stat('happiness', 5); ctx.log('Fairy floss, sheepdog trials, and everyone you know in one place.', '🎠', 'good'); break;
        case 'neighbour.help': ctx.stat('happiness', 6); ctx.stat('stress', 3); ctx.log('You brought the harvest in together. Next year, they\'ll be at your gate first.', '🚜', 'good'); break;
        case 'neighbour.meal': ctx.stat('happiness', 4); ctx.log('The whole street took turns. That\'s how it works out here.', '🍲', 'good'); break;
        case 'neighbour.no': ctx.stat('happiness', -2); ctx.log('Word got around that you didn\'t help.', '🗣️'); break;
        case 'cutoff.wait': ctx.stat('stress', 2); ctx.log('Four days of board games and tinned food. The road reopened on Friday.', '🥫'); break;
        case 'cutoff.drive': if (rng.chance(0.3)) { ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(15, 35) }); ctx.spend(2500, 'Vehicle recovery and repairs', { credit: true }); ctx.log('The back road was worse. A tow truck and a doctor later, you made it out.', '🚙', 'bad'); } else ctx.log('Mud to the axles, but you made it through.', '🚙'); break;
        case 'closing.fight': if (rng.chance(0.3)) { ctx.stat('happiness', 8); ctx.log('Your campaign worked: a community co-op took it over.', '📣', 'good'); } else { ctx.stat('happiness', -2); ctx.log('It closed anyway. At least you tried.', '📣'); } break;
        case 'closing.shrug': ctx.stat('stress', 1); ctx.log('One more errand that takes half a day now.', '🚗'); break;
        case 'internet.satellite': if (!ctx.spend(600, 'Satellite internet', { credit: true })) return void ctx.log('You couldn\'t afford satellite internet this year.', '📶'); ctx.stat('happiness', 3); ctx.log('Video calls that don\'t freeze. Luxury.', '🛰️', 'good'); break;
        case 'internet.live': ctx.stat('stress', 1); ctx.log('You drive to the library car park to upload anything big.', '📻'); break;
        case 'gossip.laugh': ctx.stat('happiness', 1); ctx.log('By next week they\'d moved on to someone else.', '😄'); break;
        case 'gossip.confront': ctx.stat('stress', 3); ctx.log('You found out. Now you have a feud. Small towns are long-memoried.', '😠'); break;
        case 'wildlife.brake': if (rng.chance(0.4)) { ctx.spend(1800, 'Car repairs', { credit: true }); ctx.log('You couldn\'t quite stop. A dented bonnet and a shaken driver.', '🚗', 'warn'); } else ctx.log('You stopped with a metre to spare. It looked at you and wandered off.', '😮‍💨'); break;
        case 'wildlife.swerve': if (rng.chance(0.35)) { ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 45) }); ctx.spend(4000, 'Car repairs', { credit: true }); ctx.log('You went into the ditch. The car and your back both need work.', '🚑', 'bad'); } else ctx.log('A wild swerve, two wheels on the gravel, and you were fine.', '😮‍💨'); break;
        default: break;
      }
    },
  },
};
