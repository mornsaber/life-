/**
 * Business events, as decks the business module plays (business/BusinessEngine.js):
 *   business.general   any business (minStaff, notStartup and duty — the delegated duty
 *                      a manager handles for you — restrict them)
 *   business.sector    events for one kind of business (`sectors`), with `auto` (what a hired
 *                      manager picks on autopilot) and `owner` (a big moment that comes to you
 *                      whenever you run the business yourself)
 * Each option's apply(ctx, business) does its work with the event kit and returns the log line.
 */
import { money, bump, revenueOf, windfall, cost, roll, stars, charge } from '../../business/EventKit.js';

const general = [
  { id: 'bigClient', title: 'A Big Contract', text: 'A large client wants to sign a contract that would stretch your capacity to the limit.', options: [
    { id: 'accept', label: '✍️ Sign it', apply: (ctx, b) => { b.cash += Math.round((b.lastYear?.revenue ?? 50000) * 0.12); bump(b, 'quality', -5); bump(b.staff, 'morale', -6); return 'You signed. The money is great; the team is exhausted.'; } },
    { id: 'decline', label: '🙅 Stay the size you are', apply: (ctx, b) => { bump(b.staff, 'morale', 3); return 'You passed. The team appreciated it.'; } },
  ] },
  { id: 'poached', title: 'Poaching Attempt', text: 'A competitor offered your best employee a raise to jump ship.', minStaff: 2, options: [
    { id: 'match', label: '💵 Match the offer', apply: (ctx, b) => { b.staff.costPremium = Math.round((b.staff.costPremium + 0.02) * 100) / 100; bump(b.staff, 'morale', 4); return 'You matched it. Your best person stayed.'; } },
    { id: 'let', label: '👋 Let them go', apply: (ctx, b) => { bump(b.staff, 'productivity', -8); bump(b, 'quality', -4); return 'They left — and took a couple of clients.'; } },
  ] },
  { id: 'lawsuit', title: 'Served With a Lawsuit', text: 'A customer is suing over an injury on your premises.', options: [
    { id: 'settle', label: '🤝 Settle', apply: (ctx, b) => { const c = ctx.rng.int(15000, 60000); charge(b, c); return `You settled for ${money(c)}.`; } },
    { id: 'fight', label: '⚖️ Fight it in court', apply: (ctx, b) => { if (ctx.rng.chance(0.6)) { charge(b, 20000); return 'You won, after $20,000 in legal fees.'; } const c = ctx.rng.int(60000, 200000); charge(b, c); bump(b, 'reputation', -6); return `You lost: a ${money(c)} judgment, and it made the local news.`; } },
  ] },
  { id: 'competitor', title: 'New Competition', text: 'A well-funded competitor opened nearby.', options: [
    { id: 'price', label: '🏷️ Cut prices', apply: (ctx, b) => { charge(b, (b.lastYear?.revenue ?? 50000) * 0.05); bump(b, 'reputation', 3); return 'You cut prices and kept your customers — at a cost.'; } },
    { id: 'quality', label: '✨ Out-serve them', apply: (ctx, b) => { if (ctx.state.stats.smarts + ctx.rng.int(-20, 20) > 60) { bump(b, 'quality', 6); return 'You doubled down on quality and customers noticed.'; } bump(b, 'reputation', -4); return 'You tried to out-serve them. They outspent you.'; } },
    { id: 'ignore', label: '🙈 Ignore them', apply: (ctx, b) => { bump(b, 'reputation', -6); return 'You ignored them. Some regulars drifted away.'; } },
  ] },
  { id: 'supplier', title: 'Supplier Price Hike', text: 'Your main supplier raised prices 15%.', notStartup: true, options: [
    { id: 'absorb', label: '🧾 Absorb it', apply: (ctx, b) => { charge(b, (b.lastYear?.cogs ?? 20000) * 0.15); return 'You absorbed the increase.'; } },
    { id: 'switch', label: '🔄 Find a cheaper supplier', apply: (ctx, b) => { bump(b, 'quality', -5); return 'The new supplier is cheaper — and worse.'; } },
    { id: 'raise', label: '📈 Raise your prices', apply: (ctx, b) => { bump(b, 'reputation', -3); return 'You passed it on to customers. Some grumbled.'; } },
  ] },
  { id: 'hiring', title: 'Hiring Decision', text: 'You have one open position and three finalists.', minStaff: 3, duty: 'hiring', options: [
    { id: 'veteran', label: '🧓 The seasoned pro who wants top dollar', apply: (ctx, b) => { bump(b.staff, 'productivity', 5); b.staff.costPremium = Math.round((b.staff.costPremium + 0.01) * 100) / 100; return 'You hired the seasoned pro.'; } },
    { id: 'promising', label: '🌱 The promising new grad', apply: (ctx, b) => { bump(b.staff, 'productivity', 2); bump(b.staff, 'morale', 2); return 'You took a chance on the new grad.'; } },
    { id: 'friend', label: '👔 A friend who needs a job', apply: (ctx, b) => { bump(b.staff, 'productivity', -4); ctx.stat('happiness', 2); return 'You hired your friend. It\'s… fine.'; } },
  ] },
  { id: 'underperformer', title: 'Underperformer', text: 'One of your people has missed every target this year.', minStaff: 3, duty: 'reviews', options: [
    { id: 'coach', label: '🧑‍🏫 Coach them', apply: (ctx, b) => { if (ctx.state.stats.smarts + ctx.rng.int(-15, 15) >= 50) { bump(b.staff, 'productivity', 4); return 'Your coaching turned them around.'; } ctx.stat('stress', 4); return 'Hours of coaching went nowhere.'; } },
    { id: 'fire', label: '🚪 Let them go', apply: (ctx, b) => { bump(b.staff, 'productivity', 4); bump(b.staff, 'morale', -6); b.staff.unionRisk = Math.min(100, b.staff.unionRisk + 6); return 'You let them go. The team is rattled.'; } },
  ] },
];

const sector = [
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

export default { id: 'business-events', version: 1, decks: { 'business.general': general, 'business.sector': sector } };
