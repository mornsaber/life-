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
import { charge } from './TaxBook.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { regionOf } from '../life/Regions.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;
const bump = (obj, key, d) => {
  obj[key] = Math.round(clamp((obj[key] ?? 50) + d, 0, 100));
};
const revenueOf = (b) => Math.max(40000, b.lastYear?.revenue ?? 0);
/** A one-off sale outside the usual books (a catering job, a contract, a rush). */
const windfall = (b, pct) => {
  const amount = Math.round(revenueOf(b) * pct);
  b.cash += amount;
  return amount;
};
const cost = (b, pct, floor = 1000) => {
  const amount = Math.max(floor, Math.round(revenueOf(b) * pct));
  charge(b, amount);
  return amount;
};
/** Your own touch: smarts and the business's quality, plus luck. */
const roll = (ctx, b, bar = 60) => ctx.state.stats.smarts * 0.4 + (b.quality ?? 50) * 0.6 + ctx.rng.int(-20, 20) >= bar;
const cityOf = (state) => regionOf(state).name.split(/[,–]/)[0].trim();

/* ------------------------------------------------------------------ */
/* Sectors                                                             */
/* ------------------------------------------------------------------ */

const SECTOR_TYPES = {
  food: ['foodTruck', 'restaurant', 'catering'],
  retail: ['retail', 'pharmacyStore', 'opticalShop'],
  trades: ['electrical', 'plumbing', 'hvacContractor', 'constructionCo', 'demolitionCo', 'homeBuilder', 'roofing', 'solarInstaller', 'landscaping', 'excavation', 'craneRental', 'fireProtection', 'pestControl', 'autoShop', 'towing', 'machineShop', 'homeInspection'],
  professional: ['lawFirm', 'cpaFirm', 'brokerage', 'propertyMgmt', 'consulting', 'engineeringFirm', 'insuranceAgency', 'architecturePractice', 'surveyFirm', 'marketingAgency', 'staffingAgency', 'translationAgency', 'piAgency', 'bailBondsAgency', 'medicalBilling', 'answeringService', 'developer'],
  health: ['practice', 'dentalPractice', 'vetClinic', 'homeHealth', 'counselingPractice', 'ptClinic', 'chiroClinic', 'nutritionPractice', 'homeCareAgency', 'ambulanceService'],
  transport: ['trucking', 'courier', 'charterOperator', 'warehouse3pl', 'nemt', 'busCharter', 'movingCompany', 'wasteHauling', 'tourBoat', 'fishingBoat'],
  tech: ['techStartup', 'softwareShop', 'indieGameStudio', 'designStudio', 'itSecurityFirm', 'productionCompany', 'recordingStudio'],
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

/**
 * Same shape as BUSINESS_EVENTS, plus `sectors` (who gets it), `auto` (what a
 * hired manager picks on autopilot) and `owner` (a big moment that comes to
 * you whenever you run the business yourself, autopilot or not).
 */
export const SECTOR_EVENTS = [
  // Food & drink
  { id: 'critic', owner: true, sectors: ['food'], auto: 'normal', title: 'A Food Critic Walks In', text: 'The city\'s best-known restaurant critic just sat down — you\'re sure of it.', options: [
    { id: 'chef', label: '👨‍🍳 Cook their meal yourself', apply: (ctx, b) => { if (roll(ctx, b, 62)) { bump(b, 'reputation', 12); return `A rave review. "${['The best meal I\'ve had this year', 'Worth crossing town for', 'A quiet triumph'][ctx.rng.int(0, 2)]}." Bookings jumped.`; } bump(b, 'reputation', -6); return 'Nerves got the better of you. The review was polite and lukewarm.'; } },
    { id: 'comp', label: '🍾 Send out something extra', apply: (ctx, b) => { cost(b, 0.002, 200); bump(b, 'reputation', 4); return 'The review mentioned the warm welcome — and the free dessert.'; } },
    { id: 'normal', label: '🙂 Treat them like any guest', apply: (ctx, b) => { const d = Math.round((b.quality - 50) / 4); bump(b, 'reputation', d); return d >= 0 ? 'An honest, fair review — they liked it.' : 'An honest review. It stung.'; } },
  ] },
  { id: 'viral', owner: true, sectors: ['food'], auto: 'ride', title: 'One of Your Dishes Went Viral', text: 'A video of your signature dish has millions of views. There\'s a line out the door.', options: [
    { id: 'lean', label: '🔥 Lean in: extra shifts and a viral menu', apply: (ctx, b) => { const g = windfall(b, 0.08); bump(b.staff, 'morale', -5); bump(b, 'reputation', 5); return `You rode the wave: ${money(g)} in extra sales. The kitchen is exhausted.`; } },
    { id: 'ride', label: '😌 Enjoy it, change nothing', apply: (ctx, b) => { bump(b, 'reputation', 4); windfall(b, 0.02); return 'The rush faded, but some of the new faces became regulars.'; } },
  ] },
  { id: 'kitchenFire', sectors: ['food'], auto: 'close', title: 'Grease Fire in the Kitchen', text: 'A small fire scorched the line. Nobody\'s hurt, but the hood needs repair.', options: [
    { id: 'close', label: '🔧 Close for repairs', apply: (ctx, b) => { const c = cost(b, 0.02); return `Closed a week for ${money(c)} in repairs. The kitchen is safer than ever.`; } },
    { id: 'push', label: '🍳 Patch it and keep serving', apply: (ctx, b) => { if (ctx.rng.chance(0.3)) { const c = cost(b, 0.05); bump(b, 'reputation', -8); return `It flared up again during dinner service. ${money(c)} in damage and the fire marshal's attention.`; } return 'The patch held. You got lucky.'; } },
  ] },
  { id: 'wedding', owner: true, sectors: ['food'], auto: 'accept', title: 'A Big Wedding Booking', text: 'A couple wants you to cater their 200-guest wedding.', options: [
    { id: 'accept', label: '💍 Take it on', apply: (ctx, b) => { if (roll(ctx, b, 50)) { const g = windfall(b, 0.04); bump(b, 'reputation', 4); return `The wedding was flawless: ${money(g)} and three referrals.`; } const g = windfall(b, 0.02); bump(b, 'reputation', -3); return `The cake arrived late and the bride cried — for the wrong reasons. Still ${money(g)}.`; } },
    { id: 'decline', label: '🙅 Too much for us', apply: () => 'You passed. Saturday night stayed calm.' },
  ] },
  // Retail
  { id: 'holidayRush', sectors: ['retail'], auto: 'safe', title: 'Holiday Season Buying', text: 'Your suppliers want holiday orders now. How much stock do you take on?', options: [
    { id: 'big', label: '📦 Stock up big', apply: (ctx, b) => { const c = cost(b, 0.04); const good = ctx.state.economy?.phase !== 'recession' && ctx.rng.chance(0.6); if (good) { const g = windfall(b, 0.1); return `Shelves emptied by December: ${money(g)} in sales on ${money(c)} of extra stock.`; } const g = windfall(b, 0.02); return `A soft season. You marked it down and recovered ${money(g)} of ${money(c)}.`; } },
    { id: 'safe', label: '🧮 Order the usual', apply: (ctx, b) => { windfall(b, 0.02); return 'A steady season. No surprises.'; } },
  ] },
  { id: 'shoplifting', sectors: ['retail'], auto: 'cameras', title: 'A Shoplifting Ring', text: 'Inventory doesn\'t add up. Someone is walking out with stock every week.', options: [
    { id: 'guard', label: '💂 Hire a guard', apply: (ctx, b) => { const c = cost(b, 0.01); return `A guard at the door (${money(c)}) — the losses stopped.`; } },
    { id: 'cameras', label: '📹 Cameras and a police report', apply: (ctx, b) => { const c = cost(b, 0.004, 500); return ctx.rng.chance(0.6) ? `For ${money(c)} in cameras, police caught the ring on tape.` : `The cameras (${money(c)}) helped a little. The losses slowed.`; } },
    { id: 'ignore', label: '🙈 Write it off', apply: (ctx, b) => { const c = cost(b, 0.015); return `You wrote off ${money(c)} in missing stock.`; } },
  ] },
  { id: 'influencer', owner: true, sectors: ['retail', 'personal', 'food'], auto: 'decline', title: 'An Influencer Wants a Deal', text: 'A local influencer offers a sponsored post for a fee.', options: [
    { id: 'pay', label: '📸 Pay for the post', apply: (ctx, b) => { const c = cost(b, 0.01, 1500); if (ctx.rng.chance(0.55)) { bump(b, 'reputation', 7); windfall(b, 0.025); return `The post landed: new customers all month (it cost ${money(c)}).`; } return `The post got likes, not customers. ${money(c)} gone.`; } },
    { id: 'decline', label: '🙅 No thanks', apply: () => 'You passed. Word of mouth will do.' },
  ] },
  { id: 'popUp', owner: true, sectors: ['retail'], auto: 'skip', title: 'A Pop-Up Shop Offer', text: 'A busy mall offers a three-month pop-up space at a discount.', options: [
    { id: 'go', label: '🏬 Open the pop-up', apply: (ctx, b) => { const c = cost(b, 0.03); if (roll(ctx, b, 55)) { const g = windfall(b, 0.07); bump(b, 'reputation', 3); return `The pop-up made ${money(g)} on ${money(c)} — and introduced you to a new crowd.`; } return `Foot traffic was thin. The pop-up cost ${money(c)} and taught you a lesson.`; } },
    { id: 'skip', label: '🏠 Stay put', apply: () => 'You stayed focused on the main store.' },
  ] },
  // Trades & construction
  { id: 'publicBid', owner: true, sectors: ['trades'], auto: 'fair', title: 'Bid on a Big Public Job', text: 'A school district is taking bids for a large job right in your wheelhouse.', options: [
    { id: 'low', label: '📉 Bid low to win', apply: (ctx, b) => { const g = windfall(b, 0.1); bump(b, 'quality', -3); bump(b.staff, 'morale', -4); return `You won it at a thin margin: ${money(g)} in work, and a crew stretched thin.`; } },
    { id: 'fair', label: '📋 Bid a fair price', apply: (ctx, b) => { if (ctx.rng.chance(0.25 + (b.reputation ?? 50) / 200)) { const g = windfall(b, 0.12); bump(b, 'reputation', 4); return `Your reputation carried the bid: ${money(g)} of good work.`; } return 'A cheaper bidder won. You\'ll get the next one.'; } },
    { id: 'skip', label: '🙅 Not worth the paperwork', apply: () => 'You skipped it. Public jobs pay slow anyway.' },
  ] },
  { id: 'siteInjury', sectors: ['trades', 'transport'], auto: 'support', title: 'Someone Got Hurt on the Job', text: 'One of your crew was injured on site. They\'ll be out for weeks.', minStaff: 2, options: [
    { id: 'support', label: '🤝 Full pay while they recover', apply: (ctx, b) => { const c = cost(b, 0.006, 3000); bump(b.staff, 'morale', 7); return `You covered their pay (${money(c)}) on top of workers' comp. The crew noticed.`; } },
    { id: 'comp', label: '📄 Workers\' comp only', apply: (ctx, b) => { bump(b.staff, 'morale', -4); if (ctx.rng.chance(0.15)) { const c = cost(b, 0.03); return `Their lawyer found a safety lapse. ${money(c)} settlement.`; } return 'Workers\' comp covered it. The crew was quiet about it.'; } },
  ] },
  { id: 'stormRush', sectors: ['trades'], auto: 'temps', title: 'Storm Season Rush', text: 'A big storm tore through town. The phones won\'t stop ringing.', options: [
    { id: 'overtime', label: '⏱️ Everyone on overtime', apply: (ctx, b) => { const g = windfall(b, 0.09); bump(b.staff, 'morale', -6); return `Weeks of overtime: ${money(g)} in emergency jobs. Your crew is beat.`; } },
    { id: 'temps', label: '👷 Bring in temporary help', apply: (ctx, b) => { const c = cost(b, 0.03); const g = windfall(b, 0.08); return `Temps (${money(c)}) helped you take ${money(g)} of storm work.`; } },
    { id: 'normal', label: '📅 Keep the normal schedule', apply: (ctx, b) => { bump(b, 'reputation', -2); return 'You worked through the list at your normal pace. Some callers went elsewhere.'; } },
  ] },
  { id: 'coverUp', sectors: ['trades'], auto: 'wait', title: 'The Inspector Is Late', text: 'The inspection is a week behind. The client wants you to close up the walls anyway.', options: [
    { id: 'wait', label: '⏳ Wait for the inspection', apply: (ctx, b) => { const c = cost(b, 0.004, 800); bump(b, 'reputation', 2); return `The delay cost ${money(c)}. The inspector signed off without a note.`; } },
    { id: 'close', label: '🧱 Close it up', apply: (ctx, b) => { if (ctx.rng.chance(0.25)) { const c = cost(b, 0.02); bump(b, 'reputation', -6); return `The inspector made you tear it all out: ${money(c)} and an angry client.`; } return 'Nobody ever opened that wall. This time.'; } },
  ] },
  // Professional services
  { id: 'pitch', owner: true, sectors: ['professional', 'tech'], auto: 'deck', title: 'Pitch for a Marquee Client', text: 'A household-name company is choosing a new firm. You\'re on the shortlist.', options: [
    { id: 'allIn', label: '🌙 All-nighters: a custom pitch', apply: (ctx, b) => { ctx.stat('stress', 6); if (roll(ctx, b, 64)) { const g = windfall(b, 0.12); bump(b, 'reputation', 8); return `You won them: ${money(g)} this year and a logo every prospect recognises.`; } return 'You came second. The feedback was glowing, the contract went elsewhere.'; } },
    { id: 'deck', label: '📑 Send the standard deck', apply: (ctx, b) => { if (ctx.rng.chance(0.2)) { const g = windfall(b, 0.08); return `Somehow it worked: ${money(g)} in new work.`; } return 'They went with a firm that tried harder.'; } },
    { id: 'pass', label: '🙅 Pass', apply: () => 'You stayed with the clients you have.' },
  ] },
  { id: 'rainmaker', owner: true, sectors: ['professional', 'health'], auto: 'no', title: 'A Star Wants to Join', text: 'A well-known name in your field wants to join — and bring their clients.', minStaff: 2, options: [
    { id: 'hire', label: '🌟 Bring them in', apply: (ctx, b) => { b.staff.costPremium = Math.round(((b.staff.costPremium ?? 0) + 0.03) * 100) / 100; const g = windfall(b, 0.06); bump(b.staff, 'productivity', 4); bump(b, 'reputation', 4); return `They joined with ${money(g)} of business. They're not cheap.`; } },
    { id: 'no', label: '🙅 Keep the culture we have', apply: (ctx, b) => { bump(b.staff, 'morale', 3); return 'You passed. The team took it as a vote of confidence.'; } },
  ] },
  { id: 'unpaid', sectors: ['professional', 'trades'], auto: 'half', title: 'A Client Won\'t Pay', text: 'A big client is ninety days late on a large invoice and has stopped answering.', options: [
    { id: 'sue', label: '⚖️ Sue for it', apply: (ctx, b) => { const c = cost(b, 0.005, 2500); if (ctx.rng.chance(0.65)) { const g = windfall(b, 0.025); return `You won and collected ${money(g)} (after ${money(c)} in fees).`; } return `They folded before you could collect. ${money(c)} in fees for nothing.`; } },
    { id: 'half', label: '🤝 Settle for half', apply: (ctx, b) => { const g = windfall(b, 0.012); return `They paid ${money(g)} to make it go away.`; } },
    { id: 'writeOff', label: '🗑️ Write it off', apply: (ctx, b) => { const c = cost(b, 0.02); return `You wrote off ${money(c)}. Deposits up front from now on.`; } },
  ] },
  { id: 'conflict', sectors: ['professional'], auto: 'disclose', title: 'A Conflict of Interest', text: 'Two of your clients are about to go head to head.', options: [
    { id: 'disclose', label: '📨 Disclose to both', apply: (ctx, b) => { bump(b, 'reputation', 3); if (ctx.rng.chance(0.5)) { const c = cost(b, 0.02); return `One client left (${money(c)} in lost work), but your name is clean.`; } return 'Both agreed to stay with a firewall between the teams.'; } },
    { id: 'quiet', label: '🤫 Say nothing', apply: (ctx, b) => { if (ctx.rng.chance(0.35)) { bump(b, 'reputation', -12); const c = cost(b, 0.04); return `It came out. Both clients left and ${money(c)} of work walked with them.`; } return 'Nobody noticed. You slept badly anyway.'; } },
  ] },
  // Health care
  { id: 'fluSurge', sectors: ['health'], auto: 'hours', title: 'Flu Season Surge', text: 'The waiting room is full by eight every morning.', options: [
    { id: 'hours', label: '🌙 Extend hours', apply: (ctx, b) => { const g = windfall(b, 0.06); bump(b.staff, 'morale', -5); return `Longer hours brought in ${money(g)}. Everyone is tired.`; } },
    { id: 'refer', label: '↪️ Refer the overflow', apply: (ctx, b) => { bump(b.staff, 'morale', 2); return 'You sent the overflow to urgent care. The team kept its evenings.'; } },
  ] },
  { id: 'insurerCut', sectors: ['health'], auto: 'accept', title: 'An Insurer Cuts Its Rates', text: 'Your biggest insurer is cutting what it pays you by 8%.', options: [
    { id: 'accept', label: '🖊️ Accept the new rates', apply: (ctx, b) => { const c = cost(b, 0.025); return `You signed. ${money(c)} less this year.`; } },
    { id: 'negotiate', label: '🤝 Negotiate hard', apply: (ctx, b) => { if (roll(ctx, b, 62)) return 'You held your rates — your outcomes data was too good to lose.'; const c = cost(b, 0.03); return `They wouldn't budge, and the delay cost ${money(c)}.`; } },
    { id: 'drop', label: '🚪 Leave their network', apply: (ctx, b) => { bump(b, 'reputation', -4); bump(b, 'quality', 2); const c = cost(b, 0.04); return `Some patients followed you; many didn't. ${money(c)} in lost visits.`; } },
  ] },
  { id: 'newEquipment', sectors: ['health', 'trades', 'tech'], auto: 'lease', title: 'New Equipment Pitch', text: 'A vendor is showing off equipment that would put you ahead of the pack.', options: [
    { id: 'buy', label: '💳 Buy it', apply: (ctx, b) => { const c = Math.max(5000, Math.round(revenueOf(b) * 0.04)); charge(b, c, 'capex'); bump(b, 'quality', 7); return `You bought it for ${money(c)}. The work got better overnight.`; } },
    { id: 'lease', label: '📝 Lease it', apply: (ctx, b) => { const c = cost(b, 0.015); bump(b, 'quality', 3); return `You leased it (${money(c)} this year).`; } },
    { id: 'skip', label: '🙅 What we have works', apply: () => 'You passed on the upgrade.' },
  ] },
  { id: 'thankYou', sectors: ['health', 'personal'], auto: 'party', title: 'A Grateful Family', text: 'A family you helped sent a heartfelt letter and a donation to say thank you.', options: [
    { id: 'party', label: '🎉 Treat the team', apply: (ctx, b) => { bump(b.staff, 'morale', 6); ctx.stat('happiness', 3); return 'You read the letter aloud at a team lunch. A few people teared up.'; } },
    { id: 'fund', label: '🧰 Put it toward equipment', apply: (ctx, b) => { bump(b, 'quality', 3); ctx.stat('happiness', 2); return 'The donation bought something you\'d wanted for years.'; } },
  ] },
  // Transport & logistics
  { id: 'fuelSpike', sectors: ['transport'], auto: 'surcharge', title: 'Fuel Prices Spike', text: 'Diesel jumped 30% in a month.', options: [
    { id: 'surcharge', label: '⛽ Add a fuel surcharge', apply: (ctx, b) => { bump(b, 'reputation', -3); return 'Customers grumbled but paid.'; } },
    { id: 'hedge', label: '📈 Lock in a fuel contract', apply: (ctx, b) => { const c = cost(b, 0.015); return `You locked in prices (${money(c)} premium). Rivals paid more.`; } },
    { id: 'absorb', label: '🧾 Absorb it', apply: (ctx, b) => { const c = cost(b, 0.035); bump(b, 'reputation', 3); return `You ate ${money(c)} in fuel. Customers stayed loyal.`; } },
  ] },
  { id: 'rushLoad', sectors: ['transport'], auto: 'rent', title: 'Breakdown on a Rush Job', text: 'A vehicle broke down with a time-critical load aboard.', options: [
    { id: 'rent', label: '🚚 Rent a replacement now', apply: (ctx, b) => { const c = cost(b, 0.006, 1500); bump(b, 'reputation', 4); return `A rental (${money(c)}) got it there on time. The customer will remember.`; } },
    { id: 'late', label: '⏰ Deliver it late', apply: (ctx, b) => { bump(b, 'reputation', -6); return 'It arrived a day late. The customer is shopping around.'; } },
  ] },
  { id: 'dedicated', owner: true, sectors: ['transport'], auto: 'accept', title: 'A Dedicated Route Contract', text: 'A regional distributor wants you on a dedicated route for a year.', options: [
    { id: 'accept', label: '✍️ Sign it', apply: (ctx, b) => { const g = windfall(b, 0.09); bump(b.staff, 'morale', -3); return `Steady work: ${money(g)} this year.`; } },
    { id: 'decline', label: '🙅 Keep our flexibility', apply: () => 'You kept your trucks free for better-paying spot work.' },
  ] },
  { id: 'safetyAudit', sectors: ['transport'], auto: 'prep', title: 'A Safety Audit', text: 'Regulators scheduled a safety audit of your fleet and records.', options: [
    { id: 'prep', label: '🗂️ Prepare properly', apply: (ctx, b) => { const c = cost(b, 0.008, 1000); bump(b, 'reputation', 2); return `You spent ${money(c)} getting the logs in order. A clean audit.`; } },
    { id: 'wing', label: '🤞 Wing it', apply: (ctx, b) => { if (ctx.rng.chance((100 - (b.quality ?? 50)) / 130)) { const c = Math.max(2500, Math.round(revenueOf(b) * 0.02)); b.cash -= c; bump(b, 'reputation', -5); return `They found gaps: ${money(c)} in fines.`; } return 'The auditor left satisfied.'; } },
  ] },
  // Tech & creative
  { id: 'outage', sectors: ['tech'], auto: 'allHands', title: 'A Major Outage', text: 'Everything went down at the worst possible moment.', options: [
    { id: 'allHands', label: '🧑‍💻 All hands until it\'s fixed', apply: (ctx, b) => { bump(b.staff, 'morale', -5); bump(b, 'reputation', 2); return 'Back up in four hours. Nobody slept.'; } },
    { id: 'postmortem', label: '📝 Publish an honest postmortem', apply: (ctx, b) => { const good = (b.quality ?? 50) >= 50; bump(b, 'reputation', good ? 5 : -2); return good ? 'Your candour won fans: "This is how it should be done."' : 'The postmortem showed how fragile things were.'; } },
    { id: 'quiet', label: '🤐 Say as little as possible', apply: (ctx, b) => { bump(b, 'reputation', -7); return 'Silence made it worse. Users found out from social media.'; } },
  ] },
  { id: 'sideProject', owner: true, sectors: ['tech'], auto: 'shelve', title: 'A Side Project Takes Off', text: 'Something your team built for fun is getting real attention.', options: [
    { id: 'invest', label: '🚀 Put people on it', apply: (ctx, b) => { const c = cost(b, 0.02, 5000); if (ctx.rng.chance(0.45)) { const g = windfall(b, 0.08); bump(b, 'reputation', 6); if (b.arr) b.arr = Math.round(b.arr * 1.08); return `It became a real product line: ${money(g)} on a ${money(c)} bet.`; } return `It fizzled after the launch spike. ${money(c)} spent learning something.`; } },
    { id: 'shelve', label: '🗄️ Shelve it', apply: (ctx, b) => { bump(b.staff, 'morale', -2); return 'You shelved it. The team was a little sad.'; } },
  ] },
  { id: 'bigTechPoach', sectors: ['tech'], auto: 'grants', title: 'Big Tech Is Recruiting Your Team', text: 'Two of your best engineers have offers at double the pay.', minStaff: 3, options: [
    { id: 'grants', label: '🎁 Retention grants', apply: (ctx, b) => { b.staff.costPremium = Math.round(((b.staff.costPremium ?? 0) + 0.03) * 100) / 100; bump(b.staff, 'morale', 5); return 'They stayed — for a price.'; } },
    { id: 'mission', label: '💬 Sell them on the mission', apply: (ctx, b) => { if (roll(ctx, b, 58)) { bump(b.staff, 'morale', 4); return 'They turned the offers down. "We want to build this."'; } bump(b.staff, 'productivity', -7); return 'One left. Then the other.'; } },
  ] },
  { id: 'keynote', owner: true, sectors: ['tech', 'professional'], auto: 'decline', title: 'Invited to Give a Keynote', text: 'A big industry conference wants you on the main stage.', options: [
    { id: 'speak', label: '🎤 Take the stage', apply: (ctx, b) => { if (ctx.state.stats.smarts * 0.5 + (ctx.state.stats.looks ?? 50) * 0.3 + ctx.rng.int(-20, 20) >= 50) { bump(b, 'reputation', 7); ctx.stat('happiness', 4); return 'A standing ovation. Leads poured in for months.'; } ctx.stat('stress', 4); return 'You blanked on a slide. Polite applause.'; } },
    { id: 'decline', label: '🙅 Not my thing', apply: () => 'You sent a colleague instead.' },
  ] },
  // Personal & community services
  { id: 'membership', sectors: ['personal', 'food'], auto: 'no', title: 'Regulars Want a Membership', text: 'Your regulars keep asking for a membership or loyalty plan.', options: [
    { id: 'launch', label: '💳 Launch one', apply: (ctx, b) => { const c = cost(b, 0.008, 1500); const g = windfall(b, 0.05); bump(b, 'reputation', 3); return `Members signed up: ${money(g)} up front (setup cost ${money(c)}).`; } },
    { id: 'no', label: '🙅 Keep it simple', apply: () => 'You kept pay-as-you-go.' },
  ] },
  { id: 'celebrity', owner: true, sectors: ['personal', 'food', 'health'], auto: 'normal', title: 'A Local Celebrity Walks In', text: 'Someone half the town would recognise just booked with you.', options: [
    { id: 'vip', label: '⭐ The VIP treatment', apply: (ctx, b) => { cost(b, 0.002, 500); if (ctx.rng.chance(0.6)) { bump(b, 'reputation', 9); return 'They posted about you. The phone hasn\'t stopped ringing.'; } bump(b, 'reputation', 2); return 'They were gracious, and quiet about it.'; } },
    { id: 'normal', label: '🙂 Same as everyone', apply: (ctx, b) => { bump(b, 'reputation', 3); return 'They loved being treated like a regular.'; } },
  ] },
  { id: 'sponsor', sectors: ['personal', 'retail', 'trades', 'food', 'general'], auto: 'decline', title: 'Sponsor the Youth Team', text: 'The local youth league needs a sponsor for new uniforms.', options: [
    { id: 'sponsor', label: '⚽ Sponsor them', apply: (ctx, b) => { const c = cost(b, 0.004, 1500); bump(b, 'reputation', 5); ctx.stat('happiness', 2); return `Your name is on forty jerseys (${money(c)}). Parents noticed.`; } },
    { id: 'decline', label: '🙅 Not this year', apply: () => 'You passed this year.' },
  ] },
  { id: 'scathing', sectors: ['personal', 'food', 'retail', 'health'], auto: 'kind', title: 'A Scathing Online Review', text: 'A one-star review calls your business "the worst in town". It\'s getting attention.', options: [
    { id: 'kind', label: '💬 Respond kindly and fix it', apply: (ctx, b) => { bump(b, 'reputation', 3); return 'Your reply was gracious. They updated the review to three stars.'; } },
    { id: 'argue', label: '😤 Set the record straight', apply: (ctx, b) => { bump(b, 'reputation', -6); return 'The argument went viral — not in a good way.'; } },
    { id: 'ignore', label: '🙈 Ignore it', apply: (ctx, b) => { bump(b, 'reputation', -2); return 'It sank down the page eventually.'; } },
  ] },
  // Anyone
  { id: 'festival', sectors: ['food', 'retail', 'personal', 'general', 'trades'], auto: 'skip', title: 'The Town Festival', text: 'The town festival is taking booths for the weekend.', options: [
    { id: 'booth', label: '🎪 Run a booth', apply: (ctx, b) => { const c = cost(b, 0.003, 800); bump(b, 'reputation', 4); const g = ctx.rng.chance(0.5) ? windfall(b, 0.01) : 0; return `A fun weekend${g ? ` and ${money(g)} in sales` : ''} (booth: ${money(c)}).`; } },
    { id: 'skip', label: '🙅 Skip it', apply: () => 'You enjoyed the festival as a visitor.' },
  ] },
];

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
export const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
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
