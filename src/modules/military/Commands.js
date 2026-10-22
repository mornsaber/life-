/**
 * Senior command: what colonels, generals and admirals actually do.
 *
 * Below colonel, command comes in the unit (MilitaryUnits: company and
 * battalion command). From O-6 up, a career is a sequence of two- to
 * three-year posts, each either a command or a staff job:
 *
 *   O-6   brigade / regiment / wing / destroyer squadron
 *   O-7   deputy commanding general / one-star wing or region
 *   O-8   division / carrier strike group / numbered air force
 *   O-9   corps / numbered fleet / major command
 *   O-10  combatant command (or, via Assignments, service chief / Chairman)
 *
 * A board decides who commands; the rest go to staff (division chief of
 * staff, Joint Staff directorates, the service headquarters). Command is
 * where the career is made or lost: every year brings a decision — a hard
 * training rotation, a misconduct case, deployment orders, a risky operation,
 * budget testimony, a crisis with a rival power, an order you disagree with —
 * and the command's readiness (which follows the defense budget, Budgets)
 * and your choices write your record. An excellent command is what gets the
 * next star; a failed one gets you relieved, and a relieved officer retires.
 *
 * svc.post   = { kind: 'command'|'staff', title, unit, grade, untilAge, readiness, decisions }
 * svc.flagRecord = { excellent, good, poor, relieved, commands }
 */
import { clamp, Random } from '../../core/Random.js';
import { rankOf, branchOf, discharge } from './MilitaryEngine.js';
import { awardMedal } from './MedalEngine.js';
import { serviceLevel, budgetAt } from '../politics/Budgets.js';

const FAMILY = { army: 'ground', guard: 'ground', marines: 'marines', navy: 'naval', coastguard: 'naval', airforce: 'air', spaceforce: 'space' };
export const familyOf = (svc) => FAMILY[svc?.branch] ?? null;
export const SENIOR_GRADE = 5;
const TOUR = { 5: 2, 6: 2, 7: 2, 8: 3, 9: 3 };

const ORD = ['1st', '2nd', '3rd', '4th', '10th', '25th', '82nd', '101st', '3rd', '1st'];
const CCMDS = ['U.S. Central Command', 'U.S. Indo-Pacific Command', 'U.S. European Command', 'U.S. Africa Command', 'U.S. Southern Command', 'U.S. Northern Command'];

/** Command titles and units, by service family and officer grade (5 = O-6 … 9 = O-10). */
export const COMMAND_POSTS = {
  ground: {
    5: { title: 'Brigade Commander', unit: (r) => `${r.pick(ORD)} Brigade Combat Team, ${r.pick(ORD)} Infantry Division`, size: '4,500 soldiers' },
    6: { title: 'Deputy Commanding General (Maneuver)', unit: (r) => `${r.pick(ORD)} Infantry Division`, size: '15,000 soldiers' },
    7: { title: 'Commanding General', unit: (r) => `${r.pick(['1st Cavalry', '82nd Airborne', '101st Airborne', '3rd Infantry', '10th Mountain', '25th Infantry', '1st Armored'])} Division`, size: '15,000 soldiers' },
    8: { title: 'Corps Commander', unit: (r) => `${r.pick(['I', 'III', 'V', 'XVIII Airborne'])} Corps`, size: '45,000 soldiers' },
    9: { title: 'Combatant Commander', unit: (r) => r.pick(CCMDS), size: 'every U.S. force in the region' },
  },
  marines: {
    5: { title: 'Regimental Commander', unit: (r) => `${r.pick(['1st', '2nd', '5th', '6th', '7th'])} Marine Regiment`, size: '3,500 Marines' },
    6: { title: 'Assistant Division Commander', unit: (r) => `${r.pick(['1st', '2nd', '3rd'])} Marine Division`, size: '20,000 Marines' },
    7: { title: 'Commanding General', unit: (r) => `${r.pick(['1st', '2nd', '3rd'])} Marine Division`, size: '20,000 Marines' },
    8: { title: 'Commanding General', unit: (r) => `${r.pick(['I', 'II', 'III'])} Marine Expeditionary Force`, size: '45,000 Marines and sailors' },
    9: { title: 'Combatant Commander', unit: (r) => r.pick(CCMDS), size: 'every U.S. force in the region' },
  },
  naval: {
    5: { title: 'Commodore', unit: (r) => `Destroyer Squadron ${r.int(1, 60)}`, size: 'six warships' },
    6: { title: 'Commander', unit: (r) => `Navy Region ${r.pick(['Southwest', 'Northwest', 'Mid-Atlantic', 'Hawaii', 'Japan'])}`, size: 'a fleet concentration area' },
    7: { title: 'Commander', unit: (r) => `Carrier Strike Group ${r.int(1, 12)}`, size: 'a carrier, its air wing and escorts' },
    8: { title: 'Commander', unit: (r) => `U.S. ${r.pick(['Second', 'Third', 'Fifth', 'Sixth', 'Seventh'])} Fleet`, size: 'a numbered fleet' },
    9: { title: 'Combatant Commander', unit: (r) => r.pick(CCMDS), size: 'every U.S. force in the region' },
  },
  air: {
    5: { title: 'Wing Commander', unit: (r) => `${r.pick(['4th', '20th', '388th', '1st', '366th', '437th'])} ${r.pick(['Fighter', 'Airlift', 'Bomb'])} Wing`, size: '5,000 airmen' },
    6: { title: 'Commander', unit: (r) => `${r.pick(['Air Force Life Cycle Management Center (deputy)', '57th Wing', 'Air Force Global Strike Command (deputy)'])}`, size: 'a one-star command' },
    7: { title: 'Commander', unit: (r) => `${r.pick(['Eighth', 'Ninth', 'Twelfth', 'Fifteenth'])} Air Force`, size: 'a numbered air force' },
    8: { title: 'Commander', unit: (r) => r.pick(['Air Combat Command (deputy)', 'Pacific Air Forces', 'U.S. Air Forces in Europe']), size: 'a major command' },
    9: { title: 'Combatant Commander', unit: (r) => r.pick([...CCMDS, 'U.S. Strategic Command', 'U.S. Transportation Command']), size: 'a combatant command' },
  },
  space: {
    5: { title: 'Delta Commander', unit: (r) => `Space Delta ${r.int(2, 9)}`, size: '800 guardians' },
    6: { title: 'Commander', unit: () => 'Space Base Delta (one-star)', size: 'a one-star command' },
    7: { title: 'Commander', unit: () => 'Space Operations Command (deputy)', size: 'a field command' },
    8: { title: 'Commander', unit: () => 'Space Operations Command', size: 'the field command' },
    9: { title: 'Commander', unit: () => 'U.S. Space Command', size: 'a combatant command' },
  },
};
const STAFF_POSTS = {
  5: ['Division Chief of Staff', 'Chief, Joint Staff Division (J-5)', 'Branch Chief, Service Headquarters', 'Senior Fellow, a war college'],
  6: ['Deputy Director for Operations, Joint Staff (J-3)', 'Deputy Commander (Support), a two-star command', 'Director of Plans, a combatant command'],
  7: ['Director for Strategic Plans and Policy, Joint Staff (J-5)', 'Deputy Chief of Staff, service headquarters', 'Chief of Staff, a combatant command'],
  8: ['Director, Joint Staff', 'Vice Chief of Staff of the service', 'Deputy Commander, a combatant command'],
  9: ['Vice Chief of Staff of the service', 'Vice Chairman of the Joint Chiefs of Staff'],
};

/* ------------------------------------------------------------------ */
/* Decisions                                                           */
/* ------------------------------------------------------------------ */

/**
 * A command's year: tier 'brigade' (O-6), 'flag' (O-7/O-8), 'senior' (O-9/O-10). Each option:
 * readiness Δ, eval Δ, and a gamble (good: chance to come off, then win/lose effects).
 */
export const DECISIONS = {
  brigade: [
    { id: 'rotation', title: 'The Training Rotation', text: 'Your unit has a month at a combat training center. How hard do you push it?', options: [
      { id: 'hard', label: '🔥 Train at the edge: night live-fire, full tempo', readiness: 12, eval: 4, risk: 0.25, fail: { readiness: -6, eval: -8, text: 'A soldier died in a night live-fire accident. The investigation is on your desk.' } },
      { id: 'steady', label: '📋 A demanding but safe plan', readiness: 6, eval: 2 },
      { id: 'fix', label: '🔧 Use it to fix your maintenance problems', readiness: 4, eval: 1 },
    ] },
    { id: 'misconduct', title: 'A Case in the Ranks', text: 'A sexual-assault report implicates a popular senior leader in your command.', options: [
      { id: 'open', label: '⚖️ Refer it for full investigation, publicly', readiness: -2, eval: 4 },
      { id: 'quiet', label: '🤫 Handle it inside the chain of command', readiness: 0, eval: 0, risk: 0.35, fail: { eval: -20, scandal: true, text: 'It leaked. The story says you protected him.' } },
    ] },
    { id: 'orders', title: 'Deployment Orders', text: 'Higher headquarters asks which brigade is ready to go first.', options: [
      { id: 'volunteer', label: '🙋 Volunteer your unit', readiness: 0, eval: 6, deploy: true, needs: 60, fail: { eval: -8, casualties: true, text: 'Your unit wasn\'t ready. You brought soldiers home in flag-draped coffins.' } },
      { id: 'honest', label: '📊 Report your readiness honestly', readiness: 0, eval: 2 },
    ] },
    { id: 'retention', title: 'People Are Leaving', text: 'Your best captains and sergeants are getting out. Families are worn down.', options: [
      { id: 'families', label: '🏡 Protect time at home: fewer field exercises', readiness: -4, eval: 3 },
      { id: 'mission', label: '🎯 Mission first', readiness: 3, eval: -1 },
    ] },
  ],
  flag: [
    { id: 'exercise', title: 'A Multinational Exercise', text: 'You lead a major exercise with allies. The press and three ambassadors are watching.', options: [
      { id: 'bold', label: '⚡ Run an ambitious, complex scenario', readiness: 8, eval: 6, risk: 0.3, fail: { eval: -6, text: 'Two aircraft collided in the exercise. Everyone survived; your plan didn\'t.' } },
      { id: 'safe', label: '🤝 A well-rehearsed showcase', readiness: 3, eval: 3 },
    ] },
    { id: 'subordinate', title: 'A Failing Commander', text: 'One of your brigade commanders has a toxic command climate and a string of accidents.', options: [
      { id: 'relieve', label: '🚪 Relieve them', readiness: 5, eval: 3 },
      { id: 'mentor', label: '🧭 Mentor them through it', readiness: 0, eval: 0, risk: 0.45, fail: { readiness: -10, eval: -8, text: 'Another accident. The inspector general asks why you didn\'t act.' } },
    ] },
    { id: 'budget', title: 'Budget Testimony', text: 'You testify on the defense budget. Your service wants you to toe the line; you think the force is short.', options: [
      { id: 'candid', label: '🎤 Say the force needs more money', readiness: 0, eval: -2, budget: 0.03 },
      { id: 'line', label: '📄 Support the President\'s budget', readiness: 0, eval: 3 },
    ] },
    { id: 'raid', title: 'An Operation for Your Approval', text: 'Your staff brings you a raid on a high-value target: real intelligence, real risk.', options: [
      { id: 'approve', label: '✅ Approve it', readiness: 0, eval: 0, risk: 0.35, win: { eval: 10, medal: true, text: 'The raid succeeded without losses. The Secretary called you personally.' }, fail: { eval: -10, casualties: true, text: 'The helicopters took fire on the objective. You lost good people.' } },
      { id: 'refine', label: '🧪 Send it back for more intelligence', readiness: 0, eval: 1 },
    ] },
  ],
  senior: [
    { id: 'crisis', title: 'A Crisis with a Rival Power', text: 'A rival\'s forces are massing near an ally\'s border. Washington asks for your options.', options: [
      { id: 'show', label: '⚓ Recommend a show of force', readiness: 2, eval: 4, risk: 0.3, fail: { eval: -6, escalate: true, text: 'The rival matched your move. Tensions spiraled for months.' } },
      { id: 'deter', label: '🛡️ Quiet reinforcement and diplomacy', readiness: 1, eval: 5 },
      { id: 'restraint', label: '🕊️ Recommend restraint', readiness: 0, eval: -2 },
    ] },
    { id: 'order', title: 'An Order You Disagree With', text: 'The civilian leadership orders a withdrawal you believe will cost lives.', options: [
      { id: 'comply', label: '🫡 Comply and execute it well', readiness: 0, eval: 3 },
      { id: 'private', label: '🗣️ Object privately, then comply', readiness: 0, eval: 1 },
      { id: 'resign', label: '📜 Resign in protest', readiness: 0, eval: 0, resign: true },
    ] },
    { id: 'posture', title: 'The Posture Review', text: 'You can ask for more forces in your theater — or offer some up.', options: [
      { id: 'more', label: '➕ Ask for more forces', readiness: 4, eval: 1, budget: 0.02 },
      { id: 'give', label: '➖ Release forces to other theaters', readiness: -3, eval: 4 },
    ] },
    { id: 'ally', title: 'An Ally Asks for Help', text: 'A partner nation hit by an earthquake asks for military help.', options: [
      { id: 'send', label: '🚁 Send ships and helicopters at once', readiness: -2, eval: 6 },
      { id: 'wait', label: '⏳ Wait for the State Department', readiness: 0, eval: -2 },
    ] },
  ],
};
const tierOf = (grade) => (grade <= 5 ? 'brigade' : grade <= 7 ? 'flag' : 'senior');

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

const seeded = (state, svc) => new Random(((state.world?.seed ?? 1) * 6971 + state.character.age * 37 + svc.grade * 101) >>> 0);

/** Odds a board picks you for command at your grade: your eval and your record. */
export function commandOdds(svc) {
  const rec = svc.flagRecord ?? {};
  return clamp(0.25 + (svc.eval - 80) / 60 + (rec.excellent ?? 0) * 0.12 - (rec.poor ?? 0) * 0.15 + (svc.joint ? 0.05 : 0) - (svc.reprimand ? 0.3 : 0), 0.05, 0.85);
}

function newPost(ctx, svc) {
  const { state } = ctx;
  const r = seeded(state, svc);
  const family = familyOf(svc);
  const def = COMMAND_POSTS[family]?.[svc.grade];
  const select = def && r.chance(commandOdds(svc)) && !svc.nation;
  const until = state.character.age + (TOUR[svc.grade] ?? 2);
  if (select) {
    const unit = def.unit(r);
    ctx.prompt({
      type: 'militaryCommands.offer', icon: '🎖️', title: 'Selected for Command',
      text: `The board selected you to command: ${def.title}, ${unit} (${def.size}). A ${TOUR[svc.grade] ?? 2}-year tour. Command is where careers are made — and ended.`,
      options: [{ id: 'accept', label: `🎖️ Take command of ${unit}` }, { id: 'staff', label: '🗂️ Decline: a staff job instead' }],
      data: { title: def.title, unit, until },
    });
  } else {
    svc.post = { kind: 'staff', title: r.pick(STAFF_POSTS[svc.grade] ?? STAFF_POSTS[5]), unit: svc.nation ? 'Defence headquarters' : 'Headquarters', grade: svc.grade, untilAge: until, decisions: 0 };
    ctx.log(`New assignment: ${svc.post.title}.`, '🗂️', 'military');
  }
}

function decision(ctx, svc) {
  const { state, rng } = ctx;
  const pool = DECISIONS[tierOf(svc.grade)];
  const d = rng.pick(pool);
  ctx.prompt({
    type: 'militaryCommands.decision', icon: '🗺️', title: d.title,
    text: `${svc.post.title}, ${svc.post.unit} · readiness ${svc.post.readiness}%\n${d.text}`,
    options: d.options.map((o) => ({ id: o.id, label: o.label, tone: o.risk >= 0.35 ? 'danger' : undefined })),
    data: { tier: tierOf(svc.grade), id: d.id },
  });
  void state;
}

/** The end of a tour: a record, maybe a medal, and the next post. */
function endTour(ctx, svc) {
  const p = svc.post;
  const rec = (svc.flagRecord ??= { excellent: 0, good: 0, poor: 0, relieved: false, commands: [] });
  if (p.kind === 'command') {
    const grade = p.readiness >= 75 && svc.eval >= 80 ? 'excellent' : p.readiness >= 50 ? 'good' : 'poor';
    rec[grade] += 1;
    rec.commands = [...rec.commands.slice(-5), { title: `${p.title}, ${p.unit}`, result: grade, age: ctx.state.character.age }];
    if (grade !== 'poor') awardMedal(ctx, svc.grade >= 6 ? 'dsm' : 'legionOfMerit', { branch: svc.branch, citation: `For exceptionally ${grade === 'excellent' ? 'distinguished' : 'meritorious'} service as ${p.title}, ${p.unit}.` });
    ctx.log(`You relinquished command of ${p.unit}. ${grade === 'excellent' ? 'An excellent command: the kind boards remember.' : grade === 'good' ? 'A solid command.' : 'A troubled command. It will follow you.'}`, '🏳️', grade === 'poor' ? 'warn' : 'good');
  }
  svc.post = null;
}

function relieve(ctx, svc, why) {
  const p = svc.post;
  svc.flagRecord ??= { excellent: 0, good: 0, poor: 0, relieved: false, commands: [] };
  svc.flagRecord.relieved = true;
  svc.reprimand = true;
  ctx.log(`You were relieved of command of ${p.unit}: ${why}`, '🚪', 'bad');
  ctx.stat('happiness', -12);
  svc.post = null;
  if (svc.yearsOfService >= 20) discharge(ctx, 'retired', `Retired after being relieved of command of ${p.unit}.`);
}

/** Yearly for colonels, generals and admirals on active duty. */
export function seniorYear(ctx) {
  const { state, rng } = ctx;
  const svc = state.military.service;
  if (!svc || svc.component !== 'active' || svc.track !== 'officer' || svc.grade < SENIOR_GRADE || svc.topPost || svc.commissioning || svc.assignment) return;
  if (!familyOf(svc)) return;
  if (state.prompts.some((p) => p.type.startsWith('militaryCommands.'))) return;
  // A promotion (or a new grade) ends the old post.
  if (svc.post && (svc.post.grade !== svc.grade || state.character.age >= svc.post.untilAge)) endTour(ctx, svc);
  if (!svc.post) return newPost(ctx, svc);
  const p = svc.post;
  if (p.kind === 'command') {
    // Readiness follows the defense budget and drifts back toward it.
    const funding = serviceLevel(state, 'national', 'defense');
    p.readiness = Math.round(clamp(p.readiness + (55 + (funding - 1) * 80 - p.readiness) * 0.2 + rng.int(-4, 4), 0, 100));
    if (p.readiness < 25 && rng.chance(0.5)) return relieve(ctx, svc, 'readiness collapsed on your watch.');
    decision(ctx, svc);
    svc.eval = Math.round(clamp(svc.eval + (p.readiness - 55) / 15, 0, 100));
  } else if (rng.chance(0.35)) {
    ctx.log(rng.pick([`As ${p.title} you briefed the Secretary on a plan you'd worked on for a year.`, `Your staff work on ${p.title.includes('Plans') ? 'the war plan' : 'the budget'} went all the way up.`, 'A staff year: long days, good work, and a better sense of how the building works.']), '🗂️', 'military');
    svc.eval = Math.round(clamp(svc.eval + 1, 0, 100));
  }
}

/* ------------------------------------------------------------------ */
/* Resolvers                                                           */
/* ------------------------------------------------------------------ */

export const MilitaryCommandsModule = {
  id: 'militaryCommands',
  order: 20.6,
  onAgeUp(ctx) {
    seniorYear(ctx);
  },
  resolvers: {
    offer(ctx, data, optionId) {
      const svc = ctx.state.military.service;
      if (!svc) return;
      if (optionId === 'accept') {
        svc.post = { kind: 'command', title: data.title, unit: data.unit, grade: svc.grade, untilAge: data.until, readiness: 55, decisions: 0 };
        ctx.log(`You took command of ${data.unit} as ${data.title}.`, '🎖️', 'milestone');
        ctx.stat('happiness', 8);
      } else {
        svc.post = { kind: 'staff', title: (STAFF_POSTS[svc.grade] ?? STAFF_POSTS[5])[0], unit: 'Headquarters', grade: svc.grade, untilAge: data.until, decisions: 0 };
        ctx.log(`You turned down command for ${svc.post.title}. Boards will notice.`, '🗂️', 'warn');
      }
    },
    decision(ctx, data, optionId) {
      const { state, rng } = ctx;
      const svc = state.military.service;
      const p = svc?.post;
      const d = DECISIONS[data.tier]?.find((x) => x.id === data.id);
      const o = d?.options.find((x) => x.id === optionId);
      if (!p || p.kind !== 'command' || !o) return;
      p.decisions += 1;
      let readiness = o.readiness ?? 0;
      let evalDelta = o.eval ?? 0;
      let text = null;
      let fx = null;
      if (o.needs != null) fx = p.readiness >= o.needs ? null : o.fail;
      else if (o.risk && rng.chance(o.risk)) fx = o.fail;
      else if (o.win && rng.chance(0.65)) fx = o.win;
      if (fx) {
        readiness += fx.readiness ?? 0;
        evalDelta += fx.eval ?? 0;
        text = fx.text;
        if (fx.casualties) { ctx.stat('stress', 12); ctx.stat('happiness', -8); }
        if (fx.medal) awardMedal(ctx, 'dsm', { branch: svc.branch, citation: `For a successful operation as ${p.title}, ${p.unit}.` });
        if (fx.scandal) { svc.reprimand = true; if (rng.chance(0.5)) { ctx.log(text, '📰', 'bad'); return relieve(ctx, svc, 'a scandal you were accused of covering up.'); } }
      }
      if (o.budget) {
        const b = budgetAt(state, 'national');
        if (b && rng.chance(0.5)) b.funding.defense = Math.round(clamp((b.funding.defense ?? 1) * (1 + o.budget), 0.6, 1.4) * 1000) / 1000;
      }
      if (o.deploy) svc.deployedThisYear = true;
      p.readiness = Math.round(clamp(p.readiness + readiness, 0, 100));
      svc.eval = Math.round(clamp(svc.eval + evalDelta, 0, 100));
      if (o.resign) {
        ctx.log('You submitted your resignation in protest. It made the front page; history will judge.', '📜', 'milestone');
        return discharge(ctx, svc.yearsOfService >= 20 ? 'retired' : 'honorable', 'Resigned in protest of an order.');
      }
      ctx.log(`${d.title}: ${o.label.replace(/^\S+\s/, '')}.${text ? ` ${text}` : ''} Readiness ${p.readiness}%.`, '🗺️', fx === o.fail ? 'warn' : undefined);
    },
  },
};

/** For views. */
export const postLabel = (svc) => (svc?.post ? `${svc.post.title}${svc.post.unit ? `, ${svc.post.unit}` : ''}` : null);
export const rankLabel = (svc) => `${rankOf(svc).title} · ${branchOf(svc).name}`;
