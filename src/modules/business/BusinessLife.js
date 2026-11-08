/**
 * Business life: what running the place feels like from year to year.
 *
 *   sectors    every business type belongs to an industry (food, retail, trades,
 *              professional, health, transport, tech, personal), and each
 *              industry has its own events — a food critic, a holiday rush, a
 *              public-works bid, a marquee client pitch, a flu-season surge.
 *   rating     a star rating (customers or clients) from quality and
 *              reputation, with a few reviews each year.
 *   awards     local and industry awards when the business earns them, plus
 *              one-time milestones (first profitable year, $1M revenue, ten
 *              employees, ten years in business).
 *   goals      a goal for the year — pick one of three. Hit it for a boost to
 *              reputation and morale; streaks of hit goals pay more.
 *
 * biz.rating, biz.reviews [{ stars, text, by }], biz.awards [{ age, title, icon }],
 * biz.milestones { id: age }, biz.goal { id, target, base, setAge }, biz.goalChoices,
 * biz.goalStreak, biz.goalsMet.
 */
import { clamp } from '../../core/Random.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { money, bump, cityOf, stars } from './EventKit.js';
import { deck } from '../content/decks.js';

/** Industry events (content/packs/business-events.js). */
export const SECTOR_EVENTS = deck('business.sector');



/* ------------------------------------------------------------------ */
/* Sectors                                                             */
/* ------------------------------------------------------------------ */

const SECTOR_TYPES = {
  food: ['boardingHouse', 'dairyRound', 'foodTruck', 'restaurant', 'catering'],
  retail: ['generalStore', 'tailorShop', 'coalMerchant', 'retail', 'pharmacyStore', 'opticalShop'],
  trades: ['smithy', 'gristMill', 'electrical', 'plumbing', 'hvacContractor', 'constructionCo', 'demolitionCo', 'homeBuilder', 'roofing', 'solarInstaller', 'landscaping', 'excavation', 'craneRental', 'fireProtection', 'pestControl', 'autoShop', 'towing', 'machineShop', 'homeInspection'],
  professional: ['lawFirm', 'cpaFirm', 'brokerage', 'propertyMgmt', 'consulting', 'engineeringFirm', 'insuranceAgency', 'architecturePractice', 'surveyFirm', 'marketingAgency', 'staffingAgency', 'translationAgency', 'piAgency', 'bailBondsAgency', 'medicalBilling', 'answeringService', 'developer'],
  health: ['practice', 'dentalPractice', 'vetClinic', 'homeHealth', 'counselingPractice', 'ptClinic', 'chiroClinic', 'nutritionPractice', 'homeCareAgency', 'ambulanceService'],
  transport: ['liveryStable', 'iceHouse', 'trucking', 'courier', 'charterOperator', 'warehouse3pl', 'nemt', 'busCharter', 'movingCompany', 'wasteHauling', 'tourBoat', 'fishingBoat'],
  tech: ['printShop', 'photoStudio', 'techStartup', 'softwareShop', 'indieGameStudio', 'designStudio', 'itSecurityFirm', 'productionCompany', 'recordingStudio'],
  personal: ['salon', 'gym', 'personalTraining', 'cleaning', 'tutoring', 'privateTutoring', 'testPrep', 'privateSchool', 'daycare', 'funeralHome', 'kennel', 'shootingRange', 'flightSchool', 'cdlSchool', 'securityCompany', 'privatePoliceAgency', 'privateFireService'],
};
const SECTOR_OF = Object.fromEntries(Object.entries(SECTOR_TYPES).flatMap(([s, ids]) => ids.map((id) => [id, s])));
export const SECTORS = {
  food: { name: 'Food & drink', icon: '🍽️', people: 'diners', noun: 'place to eat' },
  retail: { name: 'Retail', icon: '🛍️', people: 'shoppers', noun: 'shop' },
  trades: { name: 'Trades & construction', icon: '🛠️', people: 'clients', noun: 'contractor' },
  professional: { name: 'Professional services', icon: '💼', people: 'clients', noun: 'firm' },
  health: { name: 'Health care', icon: '🩺', people: 'patients', noun: 'practice' },
  transport: { name: 'Transport & logistics', icon: '🚚', people: 'customers', noun: 'operator' },
  tech: { name: 'Tech & creative', icon: '💻', people: 'users', noun: 'studio' },
  personal: { name: 'Personal & community services', icon: '🤝', people: 'customers', noun: 'local business' },
  general: { name: 'Business', icon: '🏪', people: 'customers', noun: 'business' },
};
export const sectorOf = (typeId) => SECTOR_OF[typeId] ?? (BUSINESS_TYPES[typeId]?.inspection === 'health' ? 'food' : 'general');

/* ------------------------------------------------------------------ */
/* Industry events                                                     */
/* ------------------------------------------------------------------ */


/** The industry events that can happen to this business. */
export const sectorEventsFor = (biz) => {
  const sector = sectorOf(biz.typeId);
  return SECTOR_EVENTS.filter((e) => e.sectors.includes(sector) && (!e.minStaff || (biz.staff?.headcount ?? 0) >= e.minStaff));
};

/* ------------------------------------------------------------------ */
/* Rating and reviews                                                  */
/* ------------------------------------------------------------------ */

/** Stars, 1.0–5.0, from quality (60%) and reputation (40%). */
export const starRating = (biz) => Math.round((1 + 4 * clamp(((biz.quality ?? 50) * 0.6 + (biz.reputation ?? 50) * 0.4) / 100, 0, 1)) * 10) / 10;
export { stars };
export const ratingLabel = (biz) => (['professional', 'trades'].includes(sectorOf(biz.typeId)) ? 'Client rating' : sectorOf(biz.typeId) === 'health' ? 'Patient rating' : 'Customer rating');

const REVIEW_LINES = {
  food: { 5: ['Best meal in town, hands down.', 'The staff remembered my name. I\'ll be back every week.', 'Worth every penny.'], 4: ['Really good food, a bit of a wait.', 'Solid and friendly. The dessert stole the show.'], 3: ['Fine. Nothing special.', 'Good some nights, off others.'], 2: ['Cold food and a long wait.', 'Used to be better.'], 1: ['Never again.', 'Found a hair in my soup.'] },
  retail: { 5: ['Great selection and people who actually know the products.', 'My favourite shop in town.'], 4: ['Good prices, helpful staff.', 'Usually has what I need.'], 3: ['It\'s OK. Prices are a bit high.', 'Hit and miss on stock.'], 2: ['Nobody to help when I needed it.', 'Messy and overpriced.'], 1: ['Rude at the register. Never again.', 'They wouldn\'t take a return.'] },
  trades: { 5: ['On time, on budget, spotless when they left.', 'Fixed what two others couldn\'t.'], 4: ['Good work, fair price.', 'A little late, but excellent quality.'], 3: ['Did the job. Communication could be better.', 'Fine, but pricey.'], 2: ['Took three visits to get it right.', 'Left a mess.'], 1: ['Still waiting for them to come back.', 'Overcharged and under-delivered.'] },
  professional: { 5: ['Sharp, responsive, worth the fees.', 'They treat our problems like their own.'], 4: ['Very capable team.', 'Good advice, occasionally slow to reply.'], 3: ['Competent. Expensive.', 'Fine for routine work.'], 2: ['Missed a deadline that mattered.', 'Billing surprises.'], 1: ['We\'re taking our business elsewhere.', 'Unprofessional from start to finish.'] },
  health: { 5: ['They actually listened. I feel so much better.', 'Kind, thorough and quick to get me in.'], 4: ['Great care, long waits.', 'Lovely staff.'], 3: ['Rushed appointments.', 'Fine, nothing memorable.'], 2: ['Billing was a nightmare.', 'Waited an hour past my appointment.'], 1: ['Felt dismissed.', 'Would not go back.'] },
  transport: { 5: ['Always on time, never a scratch.', 'Our go-to. Rock solid.'], 4: ['Reliable and fairly priced.', 'Good service, a bit pricey.'], 3: ['Usually fine.', 'Late a few times.'], 2: ['Lost a package.', 'Hard to reach dispatch.'], 1: ['Damaged our shipment and blamed us.', 'Unreliable.'] },
  tech: { 5: ['Beautifully made. Can\'t imagine working without it.', 'Brilliant team, brilliant work.'], 4: ['Really good, a few rough edges.', 'Solid and getting better.'], 3: ['Does the job.', 'Buggy at times.'], 2: ['Support takes forever.', 'Crashes more than it should.'], 1: ['Lost our data.', 'Avoid.'] },
  personal: { 5: ['Absolutely love this place.', 'Friendly, professional, the best around.'], 4: ['Great experience overall.', 'Lovely people, a little pricey.'], 3: ['It\'s fine.', 'Depends who you get.'], 2: ['Not what I was promised.', 'Disorganised.'], 1: ['Terrible experience.', 'Rude and careless.'] },
};
REVIEW_LINES.general = REVIEW_LINES.personal;
const REVIEWERS = ['a regular', 'a first-time customer', 'a local guide', 'a neighbour', 'a repeat client', 'a visitor from out of town'];

function writeReviews(rng, biz) {
  const lines = REVIEW_LINES[sectorOf(biz.typeId)];
  const out = [];
  for (let i = 0; i < 3; i++) {
    const s = Math.round(clamp(biz.rating + rng.float(-1.3, 1.3), 1, 5));
    const fresh = lines[s].filter((t) => !out.some((r) => r.text === t));
    if (!fresh.length) continue;
    out.push({ stars: s, text: rng.pick(fresh), by: rng.pick(REVIEWERS.filter((w) => !out.some((r) => r.by === w))) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Awards and milestones                                               */
/* ------------------------------------------------------------------ */

export const MILESTONES = [
  { id: 'firstProfit', icon: '🎉', title: 'First profitable year', test: (b) => (b.lastYear?.netIncome ?? 0) > 0 },
  { id: 'rev1m', icon: '💵', title: '$1 million in revenue', test: (b) => (b.lastYear?.revenue ?? 0) >= 1e6 },
  { id: 'rev10m', icon: '💰', title: '$10 million in revenue', test: (b) => (b.lastYear?.revenue ?? 0) >= 1e7 },
  { id: 'rev100m', icon: '🏦', title: '$100 million in revenue', test: (b) => (b.lastYear?.revenue ?? 0) >= 1e8 },
  { id: 'rev1b', icon: '🏛️', title: '$1 billion in revenue', test: (b) => (b.lastYear?.revenue ?? 0) >= 1e9 },
  { id: 'staff10', icon: '👥', title: 'Ten employees', test: (b) => (b.staff?.headcount ?? 0) >= 10 },
  { id: 'staff100', icon: '🏢', title: 'A hundred employees', test: (b) => (b.staff?.headcount ?? 0) >= 100 },
  { id: 'staff1000', icon: '🌆', title: 'A thousand employees', test: (b) => (b.staff?.headcount ?? 0) >= 1000 },
  { id: 'loc5', icon: '📍', title: 'Five locations', test: (b) => (b.scale ?? 1) >= 5 },
  { id: 'loc25', icon: '🗺️', title: 'Twenty-five locations', test: (b) => (b.scale ?? 1) >= 25 },
  { id: 'yr5', icon: '🕯️', title: 'Five years in business', test: (b) => (b.years ?? 0) >= 5 },
  { id: 'yr10', icon: '🎂', title: 'Ten years in business', test: (b) => (b.years ?? 0) >= 10 },
  { id: 'yr25', icon: '🥈', title: 'Twenty-five years in business', test: (b) => (b.years ?? 0) >= 25 },
  { id: 'fiveStars', icon: '🌟', title: 'A five-star rating', test: (b) => (b.rating ?? 0) >= 4.8 },
];

/** At most one award a year: the most prestigious one the business qualifies for. */
function awardFor(ctx, biz, growth) {
  const { state, rng } = ctx;
  const sector = SECTORS[sectorOf(biz.typeId)];
  const city = cityOf(state);
  const ly = biz.lastYear ?? {};
  const options = [
    { ok: growth >= 0.3 && (ly.revenue ?? 0) >= 2e6, chance: 0.5, icon: '🚀', title: 'Named to a national fastest-growing companies list' },
    { ok: (biz.staff?.headcount ?? 0) >= 10 && (biz.staff?.morale ?? 0) >= 80, chance: 0.35, icon: '💙', title: `Best Places to Work in ${city}` },
    { ok: biz.rating >= 4.5, chance: 0.35, icon: '🏆', title: `Best ${sector.noun} in ${city} (readers' poll)` },
    { ok: (biz.years ?? 0) >= 5 && (ly.netIncome ?? 0) > 0 && biz.rating >= 4, chance: 0.12, icon: '🎖️', title: `${city} Small Business of the Year` },
    { ok: biz.rating >= 4.2 && (biz.years ?? 0) >= 2, chance: 0.15, icon: '🥇', title: `${sector.name} industry award for excellence` },
  ];
  return options.find((o) => o.ok && rng.chance(o.chance)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Yearly goals                                                        */
/* ------------------------------------------------------------------ */

export const GOALS = {
  growth: { icon: '📈', label: (g) => `Grow revenue ${Math.round(g.target * 100)}%`, target: (b) => (b.years <= 2 ? 0.2 : 0.08), met: (b, g) => (b.lastYear?.revenue ?? 0) >= (g.base.revenue ?? 0) * (1 + g.target) },
  profit: { icon: '💵', label: (g) => (g.base.netIncome > 0 ? `Grow profit to ${money(g.target)}` : 'Turn a profit'), target: (b) => ((b.lastYear?.netIncome ?? 0) > 0 ? Math.round(b.lastYear.netIncome * 1.15) : 1), met: (b, g) => (b.lastYear?.netIncome ?? 0) >= g.target },
  rating: { icon: '⭐', label: (g) => `Reach a ${g.target.toFixed(1)}★ rating`, target: (b) => Math.min(5, Math.round(((b.rating ?? starRating(b)) + 0.3) * 10) / 10), met: (b, g) => (b.rating ?? 0) >= g.target },
  morale: { icon: '😊', label: (g) => `Team morale ${g.target}+`, target: (b) => Math.min(95, Math.max(65, (b.staff?.morale ?? 50) + 8)), met: (b, g) => (b.staff?.morale ?? 0) >= g.target, needsStaff: true },
  debt: { icon: '🧾', label: () => 'Pay down a quarter of your debt', target: (b) => Math.round(debtOf(b) * 0.75), met: (b, g) => debtOf(b) <= g.target, needsDebt: true },
  cash: { icon: '🏦', label: (g) => `Build a ${money(g.target)} cash reserve`, target: (b) => Math.max(10000, Math.round((b.lastYear?.revenue ?? 100000) * 0.1 / 1000) * 1000), met: (b, g) => (b.cash ?? 0) >= g.target },
};
const debtOf = (b) => (b.debts?.sba?.balance ?? 0) + (b.debts?.loc ?? 0) + (b.debts?.payables ?? 0);

function goalChoices(rng, biz) {
  const ids = Object.keys(GOALS).filter((id) => (!GOALS[id].needsStaff || (biz.staff?.headcount ?? 0) >= 3) && (!GOALS[id].needsDebt || debtOf(biz) > 5000) && !(id === 'cash' && (biz.cash ?? 0) >= GOALS.cash.target(biz)));
  return rng.shuffle ? rng.shuffle([...ids]).slice(0, 3) : ids.sort(() => rng.float(-1, 1)).slice(0, 3);
}

export function setGoal(state, biz, id) {
  const g = GOALS[id];
  if (!g) return null;
  biz.goal = { id, target: g.target(biz), base: { revenue: biz.lastYear?.revenue ?? 0, netIncome: biz.lastYear?.netIncome ?? 0 }, setAge: state.character.age };
  return biz.goal;
}
export const goalLabel = (biz) => (biz.goal ? `${GOALS[biz.goal.id].icon} ${GOALS[biz.goal.id].label(biz.goal)}` : '');

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

export function businessLifeYear(ctx, biz) {
  const { state, rng } = ctx;
  if (!biz || !biz.lastYear) return;
  const age = state.character.age;
  if (biz.lifeAge === age) return;
  biz.lifeAge = age;
  const prevRevenue = biz.lifeRevenue ?? null;
  biz.lifeRevenue = biz.lastYear.revenue;
  biz.rating = starRating(biz);
  biz.reviews = writeReviews(rng, biz);
  const mine = state.business.current === biz;

  // Last year's goal.
  if (biz.goal && biz.goal.setAge < age && mine) {
    const g = GOALS[biz.goal.id];
    if (g?.met(biz, biz.goal)) {
      biz.goalStreak = (biz.goalStreak ?? 0) + 1;
      biz.goalsMet = (biz.goalsMet ?? 0) + 1;
      const boost = Math.min(3, biz.goalStreak);
      bump(biz, 'reputation', 2 + boost);
      if (biz.staff) bump(biz.staff, 'morale', 3 + boost);
      ctx.stat('happiness', 3);
      ctx.log(`${biz.name} hit its goal: ${g.label(biz.goal)}${biz.goalStreak > 1 ? ` — ${biz.goalStreak} years running` : ''}. The team celebrated.`, '🎯', 'good');
    } else if (g) {
      biz.goalStreak = 0;
      ctx.log(`${biz.name} missed its goal (${g.label(biz.goal)}). Next year.`, '🎯');
    }
    biz.goal = null;
  }
  if (mine) {
    biz.goalChoices = goalChoices(rng, biz);
    // A sensible default; you can pick another before the year runs.
    if (!biz.goal && biz.goalChoices.length) setGoal(state, biz, biz.goalChoices[0]);
  }

  // Milestones, once each.
  biz.milestones ??= {};
  const reached = MILESTONES.filter((m) => biz.milestones[m.id] == null && m.test(biz));
  for (const m of reached) biz.milestones[m.id] = age;
  if (reached.length) ctx.log(`${biz.name} milestone${reached.length > 1 ? 's' : ''}: ${reached.map((m) => `${m.icon} ${m.title}`).join(', ')}.`, reached[0].icon, 'milestone');

  // An award.
  const growth = prevRevenue ? biz.lastYear.revenue / prevRevenue - 1 : 0;
  const award = awardFor(ctx, biz, growth);
  if (award) {
    (biz.awards ??= []).push({ age, title: award.title, icon: award.icon });
    if (biz.awards.length > 30) biz.awards.shift();
    bump(biz, 'reputation', 4);
    if (mine) ctx.stat('happiness', 4);
    ctx.log(`${biz.name}: ${award.title}!`, award.icon, 'milestone');
  }
}

export const BusinessLifeModule = {
  id: 'businessLife',
  order: 32,

  onAgeUp(ctx) {
    const b = ctx.state.business;
    if (!b) return;
    for (const biz of [b.current, ...(b.holdings ?? [])].filter(Boolean)) businessLifeYear(ctx, biz);
  },

  actions: {
    /** Choose this year's goal (one of the offered three). */
    goal(ctx, id) {
      const biz = ctx.state.business?.current;
      if (!biz || !(biz.goalChoices ?? []).includes(id)) return;
      setGoal(ctx.state, biz, id);
      ctx.toast(`Goal: ${GOALS[id].label(biz.goal)}`, 'info');
    },
  },
};
