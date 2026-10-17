/**
 * Signature moments: events only one kind of job has. A dentist's terrified
 * patient, an air traffic controller's two planes on one runway, an actuary's
 * model that says the pension fund is broke, a lineworker in an ice storm, a
 * journalist's leaked document. Same shape as WORKPLACE_EVENTS; when you work
 * in one of these careers, your own moments come up before the generic ones.
 *
 * Options: text, perf, boss, coworkers, money, stats, check (a stat that must
 * clear the bar for the good outcome), risky { chance, text, perf, boss, money,
 * injury, offense }.
 */
const is = (...ids) => (s) => ids.includes(s.career.job?.professionId);
const M = (id, professions, title, text, options) => ({ id: `moment.${id}`, signature: true, when: is(...professions), title, text, options });

export const PROFESSION_MOMENTS = [
  /* ---------------- Health & care ---------------- */
  M('dental.phobic', ['dentistry', 'dentalHygiene'], 'A Terrified Patient', 'A grown man is gripping the chair and shaking. He hasn\'t seen a dentist in fifteen years because of a childhood experience.', [
    { id: 'slow', label: '🫶 Go slowly: explain every step, let him raise a hand to stop', text: 'It took twice as long. He booked his next cleaning on the way out — and brought his wife.', perf: 4, stats: { happiness: 5 } },
    { id: 'sedate', label: '💉 Offer sedation', text: 'He slept through it. Efficient, if not exactly a breakthrough.', perf: 2 },
  ]),
  M('dental.upsell', ['dentistry'], 'The Production Target', 'The practice owner wants more crowns this quarter and hints that "borderline" teeth count.', [
    { id: 'honest', label: '🦷 Only recommend what\'s needed', text: 'Your numbers were average. Your patients trust you completely.', perf: -2, boss: -4, stats: { happiness: 3 } },
    { id: 'upsell', label: '💰 Recommend crowns on every borderline tooth', text: 'Production up 30%. The bonus was nice.', money: 9000, boss: 5, risky: { chance: 0.15, text: 'A patient got a second opinion and filed a complaint with the dental board.', perf: -10, offense: 'healthcareFraud' } },
  ]),
  M('vet.euthanasia', ['veterinary'], 'Saying Goodbye', 'A family brings in their 15-year-old dog. The kids want you to "fix him." He\'s in pain and his kidneys are failing.', [
    { id: 'gentle', label: '🕯️ Talk them through it gently', text: 'You explained, they cried, and you sat on the floor with the dog at the end. The family sent a card a month later.', perf: 3, stats: { happiness: -2, stress: 4 } },
    { id: 'treat', label: '💊 Offer aggressive treatment', text: 'Three more weeks, mostly in the hospital. The bill was enormous.', money: 2000, stats: { stress: 3 } },
  ]),
  M('vet.exotic', ['veterinary'], 'Something Unusual', 'Someone carries in a cardboard box. Inside: an injured red-tailed hawk they found by the highway.', [
    { id: 'treat', label: '🦅 Stabilize it and call wildlife rehab', text: 'You splinted the wing. Six weeks later the rehab center sent a video of it flying free.', perf: 3, coworkers: 4, stats: { happiness: 6 } },
    { id: 'refer', label: '📞 Refer them straight to wildlife rehab', text: 'The rehab center took it from there.', perf: 1 },
  ]),
  M('pt.plateau', ['physicalTherapy', 'occupationalTherapy'], 'The Plateau', 'A stroke patient you\'ve worked with for months has stopped improving and wants to quit therapy.', [
    { id: 'goal', label: '🎯 Set a goal that matters to her: holding her grandson', text: 'Two months later she held him for a photo. She framed it for your clinic wall.', perf: 5, stats: { happiness: 6 }, check: 'smarts' },
    { id: 'discharge', label: '📋 Discharge her to a home program', text: 'She went home with a sheet of exercises. You hope she does them.', perf: 1 },
  ]),
  M('slp.firstWord', ['speechPathology'], 'First Words', 'A four-year-old who\'s never spoken has been working with you for a year. Today he points at the bubbles.', [
    { id: 'wait', label: '🫧 Wait, and let him find the word', text: '"Bub." His mother started crying. So did you.', perf: 5, stats: { happiness: 10 } },
  ]),
  M('diet.fad', ['dietitian'], 'The Fad Diet', 'A client arrives convinced that an influencer\'s "carnivore cleanse" will cure her diabetes.', [
    { id: 'meet', label: '🤝 Meet her halfway with a plan she\'ll actually follow', text: 'Her blood sugar came down. She still eats a lot of steak.', perf: 4, check: 'smarts' },
    { id: 'lecture', label: '📚 Walk her through the evidence', text: 'She nodded politely and cancelled her follow-up.', perf: -1 },
  ]),
  M('optometry.tumor', ['optometry'], 'Something Behind the Eye', 'A routine eye exam: the patient just wants new glasses, but the optic disc looks swollen.', [
    { id: 'refer', label: '🚨 Send him for urgent imaging today', text: 'The MRI found a brain tumor — early, and operable. He came back a year later to say thank you.', perf: 6, stats: { happiness: 6 } },
    { id: 'recheck', label: '🗓️ Schedule a recheck in a few months', text: 'At the recheck, it was worse.', perf: -6, stats: { stress: 6 } },
  ]),
  M('chiro.claims', ['chiropractic'], 'The Miracle Claim', 'A patient asks if adjustments can cure her son\'s asthma. Another chiropractor in town advertises exactly that.', [
    { id: 'honest', label: '🙅 Tell her it can\'t, and send her to a pediatrician', text: 'She was disappointed. Her son\'s doctor thanked you.', perf: 2, stats: { happiness: 2 } },
    { id: 'sell', label: '💵 Sell her a 20-visit package', text: 'Easy money.', money: 3000, risky: { chance: 0.2, text: 'The licensing board fined you for false health claims.', perf: -8, money: -5000 } },
  ]),
  M('pharm.forgery', ['pharmacy'], 'A Suspicious Prescription', 'A customer hands over an oxycodone prescription. The prescriber number doesn\'t match the format, and the handwriting looks shaky.', [
    { id: 'verify', label: '📞 Call the prescriber to verify', text: 'The doctor\'s office had never heard of the patient. Police picked up a forger working three pharmacies.', perf: 5, boss: 3 },
    { id: 'fill', label: '💊 Fill it — the line is long', text: 'You filled it and moved on.', risky: { chance: 0.4, text: 'It was forged. Drug-enforcement investigators came asking how it got past you.', perf: -10, boss: -6 } },
  ]),
  M('care.lonely', ['caregiving'], 'The Lonely Client', 'The elderly man you care for has no visitors. Today he asks if you\'ll stay an extra hour, unpaid, to finish a chess game.', [
    { id: 'stay', label: '♟️ Stay and finish the game', text: 'He won, and laughed for the first time in weeks.', stats: { happiness: 6 }, coworkers: 2 },
    { id: 'go', label: '🚪 Head to your next client', text: 'You left on time. He waved from the window.', perf: 1 },
  ]),
  M('imaging.incidental', ['imaging'], 'The Incidental Finding', 'Scanning an ankle, you notice something on the edge of the image that shouldn\'t be there.', [
    { id: 'flag', label: '🚩 Flag it for the radiologist', text: 'It was an early bone tumor. The radiologist made sure your name was on the thank-you.', perf: 5 },
    { id: 'ignore', label: '🤷 Stay in your lane', text: 'Not your job to read the films.', risky: { chance: 0.3, text: 'Months later the patient came back, sicker. The review asked why nobody flagged it.', perf: -6 } },
  ]),
  M('rt.code', ['respiratoryTherapy'], 'The Airway', 'In the ICU, a patient\'s oxygen is crashing and the breathing tube looks displaced. The physician is two floors away.', [
    { id: 'act', label: '🫁 Bag the patient and call the code', text: 'You kept him oxygenated until the team arrived. The intensivist asked for you by name the next week.', perf: 6, check: 'smarts' },
    { id: 'wait', label: '📞 Page the doctor and wait', text: 'The doctor got there in four minutes. Long minutes.', perf: 0, stats: { stress: 6 } },
  ]),
  /* ---------------- Travel & transport ---------------- */
  M('atc.runway', ['airTrafficControl'], 'Two Planes, One Runway', 'A departing jet is rolling when you see another aircraft crossing the far end of the runway without clearance.', [
    { id: 'abort', label: '🛑 "Cancel takeoff clearance!"', text: 'The jet stopped with room to spare. The safety board called it a textbook save.', perf: 8, stats: { stress: 10 }, check: 'smarts' },
    { id: 'expedite', label: '📻 Tell the crossing plane to expedite', text: 'It cleared with seconds to spare. You didn\'t sleep that night.', perf: -2, stats: { stress: 14 } },
  ]),
  M('atc.storm', ['airTrafficControl'], 'Thunderstorm Line', 'A line of storms just shut half your arrival routes. Forty planes are holding, some low on fuel.', [
    { id: 'prioritize', label: '⛽ Sort them by fuel and bring the low ones in first', text: 'Every plane landed safely. Your supervisor bought you dinner.', perf: 6, stats: { stress: 8 }, check: 'smarts' },
    { id: 'divert', label: '↪️ Divert half to other airports', text: 'Safe, if unpopular with a lot of passengers.', perf: 2, stats: { stress: 4 } },
  ]),
  M('fa.medical', ['flightAttendant'], 'Is There a Doctor on Board?', 'Somewhere over the ocean, a passenger collapses in the aisle. No doctor answers the call.', [
    { id: 'aed', label: '❤️ Grab the AED and start CPR', text: 'The AED shocked once. He was talking by the time you landed. The airline gave you an award.', perf: 8, stats: { stress: 8 } },
    { id: 'divert', label: '✈️ Ask the captain to divert', text: 'You landed early. Paramedics took over.', perf: 3 },
  ]),
  M('fa.unruly', ['flightAttendant', 'cruise'], 'The Unruly Passenger', 'A drunk passenger is shouting at the people around him and refuses to sit down.', [
    { id: 'calm', label: '🧘 Calm him down', text: 'You crouched, talked quietly, and he fell asleep ten minutes later.', perf: 4, check: 'smarts' },
    { id: 'restrain', label: '🔗 Restrain him with help from passengers', text: 'He was met by police at the gate.', perf: 2, risky: { chance: 0.1, text: 'You wrenched your shoulder in the struggle.', injury: true } },
  ]),
  M('cruise.overboard', ['cruise'], 'Man Overboard', 'At 2 a.m. a passenger reports seeing someone fall from deck 9.', [
    { id: 'alarm', label: '🚨 Sound the alarm and throw a life ring', text: 'The ship turned around. A rescue boat pulled him out of the water alive.', perf: 7, stats: { stress: 8 } },
  ]),
  M('rail.signal', ['railroad', 'transit'], 'The Signal', 'The signal ahead shows clear, but you can see track workers near the rails around the bend.', [
    { id: 'slow', label: '🐢 Slow to a crawl and lay on the horn', text: 'They hadn\'t been told about your train. Dispatch got an earful — from you.', perf: 5 },
    { id: 'trust', label: '🚦 Trust the signal', text: 'They scrambled clear with feet to spare.', perf: -3, stats: { stress: 12 } },
  ]),
  M('paratransit.rider', ['paratransit'], 'The Regular', 'Your favorite rider, a retired teacher who uses a wheelchair, missed her pickup. She always calls when she\'ll be late.', [
    { id: 'check', label: '🚪 Knock and check on her', text: 'She\'d fallen and couldn\'t reach the phone. You called an ambulance and waited with her.', perf: 5, stats: { happiness: 4 } },
    { id: 'go', label: '📋 Mark a no-show and move on', text: 'You kept to schedule.', risky: { chance: 0.5, text: 'She\'d fallen. A neighbor found her the next day.', perf: -4, stats: { happiness: -8 } } },
  ]),
  M('marine.storm', ['merchantMarine'], 'Heavy Weather', 'A storm is building and containers on deck are straining against their lashings.', [
    { id: 'secure', label: '⛓️ Lead a team to re-lash them', text: 'Soaked and freezing, you got every container secured.', perf: 6, check: 'fitness', risky: { chance: 0.15, text: 'A wave knocked you into a railing.', injury: true } },
    { id: 'course', label: '🧭 Recommend changing course', text: 'The captain turned into the swell. A day late, nothing lost.', perf: 3 },
  ]),
  M('charter.weather', ['charterAviation'], 'The Client Is in a Hurry', 'A wealthy client insists you fly into a mountain airport tonight, in weather below your personal minimums.', [
    { id: 'no', label: '🙅 Refuse and fly in the morning', text: 'He was furious. In the morning he tipped you $2,000.', perf: 3, money: 2000 },
    { id: 'go', label: '🛩️ Fly it', text: 'You landed in sideways rain.', money: 3000, risky: { chance: 0.15, text: 'You ran off the end of the runway. The aviation authority pulled your licence pending review.', perf: -12, injury: true } },
  ]),
  /* ---------------- Safety, security & corrections ---------------- */
  M('tsa.bag', ['tsa'], 'Something in the Bag', 'An X-ray shows an odd shape in a carry-on: wires and a dense block.', [
    { id: 'stop', label: '🛑 Stop the line and call the bomb squad', text: 'A tangle of chargers wrapped around a block of cheese. Your supervisor said you did exactly right.', perf: 4 },
    { id: 'wave', label: '👋 It\'s probably electronics', text: 'It was. This time.', risky: { chance: 0.2, text: 'A covert test team planted it. You failed the test.', perf: -8 } },
  ]),
  M('pi.cheat', ['privateInvestigator'], 'The Photos', 'You\'ve got photos proving your client\'s husband is cheating — and you realize the client plans to use them for revenge, not divorce.', [
    { id: 'deliver', label: '📸 Deliver them; that\'s the job', text: 'You delivered the file and cashed the check.', money: 3000 },
    { id: 'warn', label: '⚠️ Deliver them with a referral to a divorce lawyer and a counselor', text: 'She took the referral. The divorce was ugly but legal.', perf: 3, stats: { happiness: 2 } },
  ]),
  M('pi.trespass', ['privateInvestigator'], 'The Gated Community', 'The subject of your insurance-fraud case lives behind a gate. A neighbor\'s back fence would give you a clear shot of him carrying lumber.', [
    { id: 'public', label: '🚗 Wait on the public road', text: 'Three days of waiting. You got him on the fourth, loading a truck.', perf: 4, money: 2000 },
    { id: 'fence', label: '🧗 Hop the fence', text: 'Great photos.', money: 2500, risky: { chance: 0.25, text: 'The neighbor called the police.', offense: 'trespass' } },
  ]),
  M('bail.skip', ['bailBonds'], 'The Skip', 'A client skipped court on a $50,000 bond. You have 90 days to find him or pay up.', [
    { id: 'hunt', label: '🔎 Work his family and social media', text: 'His cousin\'s Instagram gave him away. You brought him in on day 40.', money: 5000, check: 'smarts' },
    { id: 'pay', label: '💸 Write off the bond', text: 'An expensive lesson in who you bond out.', money: -8000 },
  ]),
  M('security.tailgate', ['privateSecurity'], 'The Tailgater', 'A well-dressed man without a badge slips in behind an employee and heads for the elevators.', [
    { id: 'stop', label: '✋ Stop him and check credentials', text: 'He was a "penetration tester" hired by the company. Your report made the executive summary.', perf: 5 },
    { id: 'let', label: '🙂 He looks like he belongs', text: 'You let it go.', risky: { chance: 0.4, text: 'He was a thief. Laptops vanished from the fourth floor.', perf: -8, boss: -6 } },
  ]),
  M('probation.relapse', ['probation'], 'One Dirty Test', 'A client who\'s been clean for a year and just got a good job tests positive.', [
    { id: 'treatment', label: '🩺 Increase treatment and testing instead of violating', text: 'He went back to meetings and stayed clean. He sends you a card every new year now.', perf: 3, stats: { happiness: 4 } },
    { id: 'violate', label: '📝 File a violation', text: 'He spent 30 days in jail and lost the job.', perf: 1, stats: { happiness: -3 } },
  ]),
  M('prison.contraband', ['privatePrisons', 'federalPrisons', 'corrections', 'jail'], 'The Package', 'An inmate\'s cousin offers you $2,000 to carry a "harmless" package in.', [
    { id: 'report', label: '🚫 Report the offer', text: 'Internal affairs set up a sting and broke up a smuggling ring.', perf: 6, boss: 4 },
    { id: 'carry', label: '📦 Carry it in', text: 'Easy money, once.', money: 2000, risky: { chance: 0.35, text: 'It was drugs. You were arrested at the gate.', offense: 'contraband' } },
  ]),
  M('forensics.mismatch', ['forensics'], 'The Mismatch', 'Detectives are certain they have their man. Your fingerprint analysis says the print isn\'t his.', [
    { id: 'report', label: '🔬 Report exactly what you found', text: 'Two months later the real offender was caught. The detectives grumbled; the DA thanked you.', perf: 5 },
    { id: 'inconclusive', label: '🤐 Call it "inconclusive"', text: 'The detectives were happy.', risky: { chance: 0.3, text: 'An audit found you\'d buried an exclusion. The lab pulled you from casework.', perf: -12, offense: 'falsifiedRecords' } },
  ]),
  M('warden.poacher', ['gameWarden'], 'Spotlights at Night', 'Headlights sweep a field at 2 a.m. — a classic poaching setup. You\'re alone and backup is an hour away.', [
    { id: 'plates', label: '📷 Get the plates and wait for backup', text: 'You caught them at the processor the next morning with three illegal deer.', perf: 5 },
    { id: 'confront', label: '🔦 Approach the truck', text: 'Two men with rifles, startled.', perf: 4, check: 'fitness', risky: { chance: 0.15, text: 'One of them shoved you into a ditch before fleeing.', injury: true } },
  ]),
  M('privateFire.contract', ['privateFire'], 'Not Our Client', 'A wildfire is approaching two houses: the one your company is paid to protect, and an uninsured neighbor\'s.', [
    { id: 'both', label: '🚒 Protect both', text: 'Both houses stood. Your company grumbled about the foam; the neighbor\'s kids drew you a picture.', perf: 2, boss: -3, stats: { happiness: 6 } },
    { id: 'client', label: '📜 Protect only the client', text: 'You saved the client\'s house and watched the neighbor\'s burn.', perf: 3, stats: { happiness: -6 } },
  ]),
  /* ---------------- Trades & field work ---------------- */
  M('weld.inspection', ['welding', 'ironworking'], 'The Weld Inspector', 'An inspector flags one of your welds on a bridge girder. You\'re sure it\'s fine, and redoing it means a day lost.', [
    { id: 'redo', label: '🔥 Grind it out and redo it', text: 'Passed. The foreman noticed you didn\'t argue.', perf: 3, boss: 3 },
    { id: 'argue', label: '🗣️ Argue for an ultrasonic test', text: 'The test came back clean. You were right.', perf: 2, check: 'smarts' },
  ]),
  M('iron.height', ['ironworking', 'craneOperator'], 'The Wind Picks Up', 'Thirty stories up, the wind is gusting past the safe limit. The superintendent wants the last beam set before quitting time.', [
    { id: 'stop', label: '🛑 Call it for the day', text: 'The beam went up the next morning in calm air.', perf: 2, boss: -2 },
    { id: 'set', label: '🏗️ Set the beam', text: 'It swung, but you got it in.', perf: 4, boss: 3, risky: { chance: 0.15, text: 'The load swung into the steel and you were thrown against your harness.', injury: true, perf: -4 } },
  ]),
  M('auto.upsell', ['automotive'], 'The Little Old Lady', 'An elderly customer brings in her car for an oil change. Your service writer wants you to "find" $1,500 of repairs.', [
    { id: 'honest', label: '🔧 Tell her what it actually needs', text: 'Oil change and a wiper blade. She brought her whole church group to your shop.', perf: 3, boss: -3, stats: { happiness: 3 } },
    { id: 'pad', label: '💵 Write it up big', text: 'A great ticket.', money: 400, risky: { chance: 0.2, text: 'Her grandson, a mechanic, checked the work and called the consumer protection office.', perf: -8 } },
  ]),
  M('line.storm', ['lineworker'], 'The Ice Storm', 'An ice storm took out power to 80,000 homes. You\'re on day four of sixteen-hour shifts.', [
    { id: 'keep', label: '⚡ Keep going until the lights are back', text: 'You restored a hospital and a nursing home. Neighbors brought the crew hot soup.', perf: 6, money: 6000, stats: { stress: 12, health: -3 } },
    { id: 'rest', label: '😴 Take your mandatory rest', text: 'You slept twelve hours and came back sharper.', perf: 2 },
  ]),
  M('hvac.carbon', ['hvac'], 'The Cracked Heat Exchanger', 'On a routine furnace check, your meter shows carbon monoxide near the vents. The family has a newborn.', [
    { id: 'shut', label: '🚨 Shut it down and get them out', text: 'A cracked heat exchanger. They called you an angel; your boss sold them a new furnace.', perf: 6, money: 500 },
    { id: 'patch', label: '🩹 Patch it and recommend a replacement', text: 'You patched it and left a quote.', risky: { chance: 0.25, text: 'The patch failed. The family ended up in the ER with CO poisoning.', perf: -12 } },
  ]),
  M('oil.blowout', ['oilGas'], 'Kick on the Rig', 'Pressure on the well is spiking — a kick. The driller hesitates.', [
    { id: 'shutIn', label: '🛑 Hit the blowout preventer', text: 'The well was shut in safely. A week of downtime, and every one of you went home.', perf: 6, boss: 2 },
    { id: 'drill', label: '⛏️ Let the driller handle it', text: 'He handled it. Barely.', stats: { stress: 10 } },
  ]),
  M('fishing.weather', ['fishing'], 'One More Haul', 'The catch has been thin all week. The forecast says a gale arrives in six hours; the skipper wants one more set.', [
    { id: 'set', label: '🎣 Make the set', text: 'Full nets, and you made port with an hour to spare.', money: 4000, risky: { chance: 0.2, text: 'The gale hit early. You were thrown across the deck hauling gear.', injury: true } },
    { id: 'run', label: '⚓ Argue to head in', text: 'The skipper grumbled. The gale was worse than forecast.', perf: 1 },
  ]),
  M('farm.drought', ['agriculture'], 'Drought Year', 'No rain for two months. You can buy expensive feed to keep the herd, or sell half now at rock-bottom prices.', [
    { id: 'feed', label: '🌾 Buy feed and hold on', text: 'The rains came in September. You kept your best stock.', money: -6000, perf: 3 },
    { id: 'sell', label: '🐄 Sell half the herd', text: 'It hurt to watch the trailers leave.', money: 5000, stats: { happiness: -4 } },
  ]),
  M('crane.load', ['craneOperator'], 'The Mislabeled Load', 'The rigger says the load is 8 tons. Your load moment indicator says 11 — right at your limit.', [
    { id: 'stop', label: '✋ Refuse until it\'s reweighed', text: 'It was 11.4 tons. You probably saved your crane and somebody\'s life.', perf: 6 },
    { id: 'lift', label: '🏗️ Lift it carefully', text: 'The boom groaned.', risky: { chance: 0.25, text: 'The crane tipped. Nobody died, but you\'ll be in depositions for years.', perf: -15 } },
  ]),
  M('solar.roof', ['renewableEnergy'], 'The Rotten Roof', 'Halfway through a solar install, you find the roof decking is rotten. The customer wants you to finish anyway.', [
    { id: 'stop', label: '🛑 Stop until it\'s repaired', text: 'The roofer replaced the decking; your panels went on solid. Five-star review.', perf: 4 },
    { id: 'finish', label: '🔩 Finish the install', text: 'Done on schedule.', money: 300, risky: { chance: 0.25, text: 'The first big storm pulled panels and roof off together.', perf: -8 } },
  ]),
  M('water.contamination', ['waterUtility'], 'The Test Result', 'A routine water test shows bacteria in one neighborhood\'s supply. Your manager wants to retest before telling anyone.', [
    { id: 'notice', label: '📢 Push for a boil-water notice now', text: 'The notice went out. The retest confirmed it. No one got sick.', perf: 5, boss: -2 },
    { id: 'retest', label: '🧪 Wait for the retest', text: 'Twenty-four hours.', risky: { chance: 0.35, text: 'Dozens of residents got sick before the retest came back. Regulators investigated.', perf: -10 } },
  ]),
  M('mfg.line', ['manufacturing'], 'Stop the Line', 'You spot a defect on parts coming off the line. Stopping the line costs $10,000 an hour.', [
    { id: 'stop', label: '🛑 Pull the cord', text: 'A bad batch of steel. You saved a recall; the plant manager shook your hand.', perf: 6 },
    { id: 'flag', label: '📝 Flag it for quality to review later', text: 'Quality reviewed it at the end of the shift.', risky: { chance: 0.3, text: 'Ten thousand bad parts shipped. The customer sent them all back.', perf: -6 } },
  ]),
  M('survey.line', ['surveying'], 'The Fence Line', 'Your survey shows the neighbor\'s new garage is four feet over your client\'s property line. Both families are watching you.', [
    { id: 'exact', label: '📐 Mark it exactly where it is', text: 'Lawyers got involved. Your survey held up in court.', perf: 4 },
    { id: 'fudge', label: '🤝 "Round" the line to keep the peace', text: 'Everyone shook hands.', risky: { chance: 0.25, text: 'A later survey found your error. Your license was put on probation.', perf: -10 } },
  ]),
  /* ---------------- Business, money & government ---------------- */
  M('actuary.pension', ['actuary'], 'The Model Says No', 'Your pension model shows the fund is far more underfunded than the board believes. The client wants "more optimistic" assumptions.', [
    { id: 'sign', label: '✍️ Sign only what you believe', text: 'The board raised contributions. Years later, your report is why the pensions still get paid.', perf: 4, boss: -3 },
    { id: 'bend', label: '📈 Use the rosier assumptions', text: 'The client was delighted.', money: 5000, risky: { chance: 0.2, text: 'Regulators found the assumptions indefensible. Your credential was suspended.', perf: -12 } },
  ]),
  M('accounting.cfo', ['accounting'], 'The CFO\'s Request', 'The CFO asks you to book next quarter\'s revenue early so the company makes its numbers.', [
    { id: 'refuse', label: '🙅 Refuse, and document it', text: 'He was cold for months. When the auditors came, you were the one with clean hands.', perf: 2, boss: -6 },
    { id: 'book', label: '📒 Book it', text: 'The quarter looked great.', money: 4000, risky: { chance: 0.25, text: 'The auditors caught it. You were named in the securities regulator\'s complaint.', offense: 'securitiesFraud' } },
  ]),
  M('revenue.audit', ['revenue'], 'The Audit', 'A small-business owner you\'re auditing clearly made honest mistakes — and owes $40,000 she can\'t pay.', [
    { id: 'plan', label: '🤝 Set up a payment plan and waive the penalties', text: 'She kept her shop open and has filed perfectly ever since.', perf: 2, stats: { happiness: 3 } },
    { id: 'full', label: '📋 Assess the full penalties', text: 'By the book.', perf: 3, stats: { happiness: -2 } },
  ]),
  M('benefits.claim', ['benefitsClaims'], 'The Borderline Claim', 'A veteran\'s disability claim is missing one document. Denying it is quick; tracking down the record takes days.', [
    { id: 'track', label: '🔎 Track down the record', text: 'You found it in a warehouse database. He got his benefits — and back pay.', perf: 3, stats: { happiness: 5 } },
    { id: 'deny', label: '📭 Deny it; he can appeal', text: 'Your numbers looked great this month.', perf: 2 },
  ]),
  M('sales.quota', ['sales'], 'The Last Day of the Quarter', 'You\'re $50,000 short of quota. A client will sign today if you promise a feature that doesn\'t exist yet.', [
    { id: 'promise', label: '🤞 Promise it', text: 'Signed. Quota hit, accelerator unlocked.', money: 8000, risky: { chance: 0.3, text: 'The client cancelled when the feature never shipped, and your manager clawed back the commission.', money: -8000, perf: -6 } },
    { id: 'honest', label: '🙅 Sell what exists', text: 'You missed quota by a hair. The client signed next quarter anyway.', perf: -2, boss: -2 },
  ]),
  M('hr.complaint', ['humanResources'], 'The Star\'s Complaint', 'Three employees have complained about the company\'s top salesman. Leadership asks you to "handle it quietly."', [
    { id: 'investigate', label: '🔍 Run a real investigation', text: 'The complaints were substantiated. He was let go, and two more people came forward to thank you.', perf: 4, boss: -4 },
    { id: 'bury', label: '🤐 Have a quiet word and close the file', text: 'Leadership was relieved.', risky: { chance: 0.3, text: 'One of the employees sued and your file became Exhibit A.', perf: -10 } },
  ]),
  M('pm.tenant', ['propertyManagement', 'realestate'], 'The Tenant Who Can\'t Pay', 'A tenant who\'s paid on time for six years lost her job and is two months behind. The owner wants her evicted.', [
    { id: 'plan', label: '🤝 Negotiate a payment plan with the owner', text: 'She caught up within the year and is still your best tenant.', perf: 3, stats: { happiness: 4 } },
    { id: 'evict', label: '📋 File the eviction', text: 'The unit was re-let in a month at higher rent.', money: 500, stats: { happiness: -4 } },
  ]),
  M('re.bidding', ['realestate'], 'The Bidding War', 'Your buyers love a house, and a rival offer just came in. They ask what they should do.', [
    { id: 'advise', label: '🧮 Talk them through what they can really afford', text: 'They capped their offer and lost the house — then found a better one a month later.', perf: 3, stats: { happiness: 3 } },
    { id: 'push', label: '🔥 Tell them to waive the inspection and go high', text: 'They won! Your commission was bigger, too.', money: 3000, risky: { chance: 0.25, text: 'The foundation was cracked. They blamed you, loudly, online.', perf: -6 } },
  ]),
  M('nonprofit.donor', ['nonprofit'], 'The Big Donor', 'A donor offers $500,000 — if the program is renamed after him and you drop the families he calls "undeserving."', [
    { id: 'decline', label: '🙅 Turn the money down', text: 'The board backed you. A smaller donor heard the story and gave $100,000.', perf: 3, money: 0, stats: { happiness: 5 } },
    { id: 'accept', label: '💰 Take it', text: 'The program grew. Some families were turned away.', perf: 5, stats: { happiness: -4 } },
  ]),
  M('inspector.bribe', ['councilInspector'], 'An Envelope', 'A developer slides an envelope across the table and asks you to "overlook" a missing fire exit.', [
    { id: 'refuse', label: '🚫 Refuse and write up the violation', text: 'The fire exit got built. The developer complained to the council; the council backed you.', perf: 5 },
    { id: 'take', label: '✉️ Take it', text: '$5,000 in cash.', money: 5000, risky: { chance: 0.3, text: 'It was a sting by the inspector general.', offense: 'bribery' } },
  ]),
  M('legal.deadline', ['legalSupport'], 'The Filing Deadline', 'It\'s 11:40 p.m. The court\'s e-filing system just crashed, and the brief is due at midnight.', [
    { id: 'drive', label: '🚗 Drive to the courthouse drop box', text: 'Stamped at 11:58. The partner sent you a bottle of champagne.', perf: 6, stats: { stress: 8 } },
    { id: 'motion', label: '📄 Document the outage and file at 12:05', text: 'The judge accepted it with the outage screenshots.', perf: 3, check: 'smarts' },
  ]),
  /* ---------------- Arts, media & tech ---------------- */
  M('journalism.leak', ['journalism'], 'The Leaked Document', 'A source gives you a document showing a city official took kickbacks. It could be real, or a setup.', [
    { id: 'verify', label: '🔍 Spend weeks verifying it', text: 'It was real. Your story ran on the front page, and the official resigned.', perf: 8, stats: { stress: 6 }, check: 'smarts' },
    { id: 'publish', label: '📰 Publish fast before a rival does', text: 'You beat everyone to it.', perf: 4, risky: { chance: 0.3, text: 'The document was forged. Your paper ran a correction, and you were pulled off the beat.', perf: -12 } },
  ]),
  M('journalism.source', ['journalism'], 'Protect Your Source', 'Prosecutors subpoena you to name the source of your last story.', [
    { id: 'refuse', label: '🤐 Refuse to name them', text: 'You spent two nights in jail for contempt — and became a hero of the press.', perf: 6, stats: { stress: 10 } },
    { id: 'name', label: '🗣️ Give up the name', text: 'No jail. No more sources, either.', perf: -8 },
  ]),
  M('acting.audition', ['acting'], 'The Callback', 'A casting director loved your audition, but wants you to lose twenty pounds in a month for the role.', [
    { id: 'crash', label: '🏃 Crash diet and train', text: 'You got the part. You were miserable for a month.', money: 15000, check: 'fitness', stats: { health: -5, stress: 6 } },
    { id: 'pass', label: '🙅 Pass on it', text: 'You passed. Your agent sighed.', stats: { happiness: 2 } },
  ]),
  M('music.label', ['music'], 'The Record Deal', 'A label offers a big advance — for your master recordings and 85% of royalties for ten years.', [
    { id: 'sign', label: '✍️ Sign', text: 'A $40,000 advance and a real marketing budget.', money: 40000, stats: { happiness: 4 } },
    { id: 'indie', label: '🎸 Stay independent', text: 'You kept your masters and toured in a van. The fans who found you stayed.', stats: { happiness: 5 } },
  ]),
  M('design.spec', ['design'], 'Free Work', 'A big brand wants you to "pitch" a full campaign for free, with the chance of a contract.', [
    { id: 'pitch', label: '🎨 Do the spec work', text: 'You won it! A six-month contract.', money: 12000, check: 'smarts', stats: { stress: 6 } },
    { id: 'decline', label: '🙅 Decline unpaid work', text: 'They hired someone who said yes.', stats: { happiness: 1 } },
  ]),
  M('creator.sponsor', ['contentCreator'], 'The Sponsor', 'A sketchy supplement company offers $10,000 for a video saying their pills "melt fat."', [
    { id: 'decline', label: '🙅 Turn it down and tell your audience why', text: 'That video got your most views ever.', perf: 5, stats: { happiness: 3 } },
    { id: 'take', label: '💰 Take the money', text: 'The check cleared.', money: 10000, risky: { chance: 0.3, text: 'Your audience turned on you when the company was sued. You lost a third of your subscribers.', perf: -10 } },
  ]),
  M('game.crunch', ['gameDevelopment'], 'Crunch', 'Launch is in six weeks. The studio wants mandatory 70-hour weeks "just this once" — for the third game in a row.', [
    { id: 'crunch', label: '☕ Crunch', text: 'It shipped on time to great reviews. You don\'t remember the summer.', perf: 6, stats: { stress: 14, health: -4 } },
    { id: 'boundary', label: '🙅 Work your normal hours', text: 'Your lead was annoyed. You kept your sanity.', perf: -2, boss: -3, stats: { happiness: 3 } },
  ]),
  M('meteorology.storm', ['meteorology'], 'The Call', 'Your models disagree about whether a storm will become a tornado outbreak tomorrow. Issuing a warning means closing schools.', [
    { id: 'warn', label: '🌪️ Issue the warning', text: 'Seven tornadoes touched down. Everyone was where they should be.', perf: 6, check: 'smarts' },
    { id: 'watch', label: '👀 Issue a watch and wait', text: 'The storms fizzled. This time.', perf: 0, risky: { chance: 0.3, text: 'Tornadoes touched down with little warning. The review asked why.', perf: -10 } },
  ]),
  M('interpreter.mistake', ['interpreter'], 'Lost in Translation', 'In a hospital, a doctor uses an idiom that would terrify the patient if translated literally.', [
    { id: 'meaning', label: '💬 Interpret the meaning, not the words', text: 'The patient relaxed. The doctor never knew how close it came.', perf: 4, check: 'smarts' },
    { id: 'literal', label: '📖 Translate it word for word', text: 'The patient panicked; you spent ten minutes untangling it.', perf: -2 },
  ]),
  M('funeral.family', ['funeral'], 'The Family Feud', 'At a viewing, two siblings start shouting about the will over their father\'s casket.', [
    { id: 'separate', label: '🕊️ Quietly separate them', text: 'You walked one sibling outside for a coffee. The service went on in peace.', perf: 4, check: 'smarts' },
    { id: 'wait', label: '🤐 Let it run its course', text: 'Twenty minutes of shouting. Everyone left exhausted.', perf: -2 },
  ]),
  M('cosmetology.disaster', ['cosmetology'], 'The Bleach Disaster', 'A walk-in wants platinum blonde in one sitting. Her hair is already damaged from box dye.', [
    { id: 'honest', label: '✋ Talk her into doing it in stages', text: 'She came back three times. Gorgeous, healthy hair — and a loyal client.', perf: 4 },
    { id: 'do', label: '💇 Give her what she wants', text: 'It worked… mostly.', money: 200, risky: { chance: 0.35, text: 'Her hair broke off in chunks. She posted the video.', perf: -6 } },
  ]),
];
