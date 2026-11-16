/**
 * Career story: the second layer of career play (CareerPlay.js), the parts of a working life that
 * run over years and have names in them.
 *
 *   Signature project  one at a time, matched to the line of work (a new unit for the hospital, a
 *                      landmark case, a long investigation, the account of the decade). It moves
 *                      each year with your plan and record; push it once a year (odds shown).
 *                      Finished on time it makes your name; past its deadline it fails, publicly.
 *   Mentor             someone senior from your organization's chart (your manager or supervisor).
 *                      Ask for advice; once you're close, ask them to put in a word. They retire.
 *   Rival              a peer at your level, also from the chart. They gain ground every year and
 *                      may be promoted over you; outshine them, make peace, or undercut them.
 *   Crisis cards       every few years, the job's own emergency, with the odds of each way through
 *                      shown on the card.
 *
 * state.career.project = { kind, name, icon, skill, startAge, years, progress, employer }
 * job.mentor = { id, name, title, bond, since }; job.rival = { id, name, title, standing, mood }
 */
import { clamp, Random } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { skill as skillOf, practise } from '../life/Skills.js';
import { showResult } from '../life/ResultCards.js';
import { familyOf, planOf } from './CareerPlay.js';
import { chainOfCommand } from '../org/Organizations.js';
import { yearNow } from '../world/Eras.js';

/** The job's family for projects and crises: computing work only once there were computers to run. */
export const storyKind = (state, job) => { const k = familyOf(job); return k === 'tech' && yearNow(state) < 1960 ? 'general' : k; };

/* ------------------------------------------------------------------ */
/* Signature projects                                                  */
/* ------------------------------------------------------------------ */

export const PROJECTS = {
  medical: { name: 'A new unit for the hospital', icon: '🏥', skill: 'medicine', years: 3, done: 'The new unit opened with your name on the plaque by the door.' },
  legal: { name: 'A landmark case', icon: '⚖️', skill: 'law', years: 3, done: 'You won the case. Law students will read it for years.' },
  police: { name: 'A long investigation', icon: '🕵️', skill: 'investigation', years: 3, done: 'Dawn raids, a dozen arrests, and the case held up in court.' },
  fire: { name: 'A new station and crew', icon: '🚒', skill: 'leadership', years: 3, done: 'The new station opened, and the crew you trained runs it.' },
  teaching: { name: 'A programme that changes the school', icon: '🏫', skill: 'teaching', years: 3, done: 'Your programme is how the school does things now.' },
  tech: { name: 'A new system, built from scratch', icon: '🛠️', skill: 'coding', years: 2, done: 'The new system went live and stayed up. People use it every day.' },
  business: { name: 'The account of the decade', icon: '📈', skill: 'sales', years: 2, done: 'The account signed for ten years. The board knows your name.' },
  trades: { name: 'The biggest job of your career', icon: '🏗️', skill: 'carpentry', years: 2, done: 'The job came in on time and on budget. People drive past it to look.' },
  arts: { name: 'Your masterwork', icon: '🎨', skill: 'writing', years: 4, done: 'Your masterwork was finished, and it was good. The notices said so.' },
  general: { name: 'A project with your name on it', icon: '📌', skill: 'leadership', years: 2, done: 'The project landed. Everyone knows who ran it.' },
};
const PLAN_PACE = { coast: -10, steady: 0, grind: 12, network: 2, learn: 4 };

export const projectOf = (state) => state.career?.project ?? null;
/** Why you can't take one on now, or null. */
export function cantStartProject(state) {
  const job = state.career?.job;
  if (!job) return 'You need a job';
  if (projectOf(state)) return 'One at a time';
  if ((job.yearsInLevel ?? 0) < 1 && state.character.age - (job.startAge ?? state.character.age) < 1) return 'Settle in first (a year in the job)';
  if ((job.performance ?? 55) < 50) return 'Nobody hands a big project to someone struggling (performance 50+)';
  return null;
}
/** The odds of a push going well. */
export function pushOdds(state) {
  const job = state.career?.job;
  const p = projectOf(state);
  if (!job || !p) return 0;
  return clamp(0.4 + skillOf(state, p.skill) / 170 + ((job.performance ?? 55) - 55) / 220 - (job.burnout ?? 0) / 350, 0.15, 0.9);
}

function startProject(ctx) {
  const { state } = ctx;
  const why = cantStartProject(state);
  if (why) return ctx.toast(why, 'warn');
  const job = state.career.job;
  const kind = storyKind(state, job);
  const def = PROJECTS[kind] ?? PROJECTS.general;
  state.career.project = { kind, name: def.name, icon: def.icon, skill: def.skill, startAge: state.character.age, years: def.years, progress: 0, employer: job.employer?.name ?? null };
  ctx.log(`You took on ${def.name.toLowerCase()}: ${def.years} years to get it done.`, def.icon, 'good');
}

function pushProject(ctx) {
  const { state, rng } = ctx;
  const p = projectOf(state);
  if (!p) return ctx.toast('No project under way.', 'warn');
  if (yearlyCount(state, 'careerStory.push')) return ctx.toast('You pushed it already this year.', 'warn');
  bumpYearly(state, 'careerStory.push');
  const ok = rng.chance(pushOdds(state));
  p.progress = clamp(p.progress + (ok ? 22 : 6), 0, 100);
  ctx.stat('stress', ok ? 3 : 6);
  practise(state, p.skill, ok ? 4 : 2);
  ctx.log(ok ? `Late nights on ${p.name.toLowerCase()} paid off: a big step forward.` : `You pushed on ${p.name.toLowerCase()}, and it barely moved.`, p.icon, ok ? 'good' : 'warn');
  finishIfDone(ctx);
}

function dropProject(ctx, why) {
  const { state } = ctx;
  const p = projectOf(state);
  if (!p) return;
  state.career.project = null;
  if (why) ctx.log(why, p.icon, 'warn');
}

function finishIfDone(ctx) {
  const { state } = ctx;
  const p = projectOf(state);
  const job = state.career.job;
  if (!p || !job || p.progress < 100) return;
  job.performance = Math.round(clamp((job.performance ?? 55) + 15, 0, 100));
  job.boss = Math.round(clamp((job.boss ?? 50) + 10, 0, 100));
  job.coworkers = Math.round(clamp((job.coworkers ?? 55) + 5, 0, 100));
  ctx.stat('happiness', 6);
  (state.career.projectsDone ??= []).push({ name: p.name, age: state.character.age, employer: p.employer });
  state.career.project = null;
  const def = PROJECTS[p.kind] ?? PROJECTS.general;
  ctx.log(def.done, p.icon, 'milestone');
  showResult(ctx, { icon: p.icon, title: 'Signature project', big: p.name, sub: def.done, tone: 'good', popup: true });
}

function projectYear(ctx, rng) {
  const { state } = ctx;
  const p = projectOf(state);
  const job = state.career.job;
  if (!p) return;
  if (!job) return dropProject(ctx, `Without the job, ${p.name.toLowerCase()} went to someone else.`);
  const pace = 18 + (PLAN_PACE[planOf(state)] ?? 0) + Math.round(((job.performance ?? 55) - 55) / 5) + rng.int(-5, 8);
  p.progress = clamp(p.progress + pace, 0, 100);
  if (p.progress < 100 && rng.chance(0.15)) {
    p.progress = clamp(p.progress - 10, 0, 100);
    ctx.log(rng.pick(['The budget for your project was cut, and you had to start part of it again.', 'Someone senior changed their mind about your project. Months lost.', 'A key person on your project left. You rebuilt the team.']), p.icon, 'warn');
  }
  finishIfDone(ctx);
  if (projectOf(state) && state.character.age - p.startAge >= p.years + 1) {
    job.performance = Math.round(clamp((job.performance ?? 55) - 10, 0, 100));
    job.boss = Math.round(clamp((job.boss ?? 50) - 8, 0, 100));
    ctx.stat('happiness', -4);
    dropProject(ctx, `${p.name} ran out of time at ${p.progress}% and was shelved. Everyone knew whose it was.`);
  }
}

/* ------------------------------------------------------------------ */
/* Mentor and rival                                                    */
/* ------------------------------------------------------------------ */

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 6007 + state.character.age * 271 + 0xc5) >>> 0);
const someone = (rng, title) => { const g = rng.pick(['male', 'female']); const n = randomName(rng, g); return { id: null, name: `${n.firstName} ${n.lastName}`, gender: g, title }; };
const firstName = (p) => p?.name?.split(' ')[0] ?? 'They';

/** People from the org chart: a senior to learn from, a peer to compete with. */
function castFromChart(state, job) {
  let chain = null;
  try { chain = chainOfCommand(state, job); } catch { chain = null; }
  const senior = chain?.manager ?? chain?.supervisor ?? null;
  const peer = (chain?.coworkers ?? []).find((c) => c && c.id !== senior?.id) ?? null;
  return { senior, peer, org: chain?.org ?? null };
}
const stillThere = (org, who) => !who?.id || !org || Boolean(org.people?.[who.id]);

function peopleYear(ctx, rng) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job || state.character.age < 18) return;
  const { senior, peer, org } = castFromChart(state, job);
  // A mentor: someone senior takes an interest.
  if (!job.mentor && rng.chance(0.45)) {
    const who = senior ?? someone(rng, 'a senior colleague');
    job.mentor = { id: who.id ?? null, name: who.name, title: who.title || 'a senior colleague', gender: who.gender, bond: rng.int(40, 60), since: state.character.age };
    ctx.log(`${who.name}, ${job.mentor.title.toLowerCase()}, has taken an interest in your work. A mentor, if you want one.`, '🧭', 'good');
  } else if (job.mentor) {
    const m = job.mentor;
    m.bond = Math.round(clamp(m.bond - 2, 0, 100));
    if (m.bond >= 70) job.boss = Math.round(clamp((job.boss ?? 50) + 2, 0, 100));
    if (!stillThere(org, m) || rng.chance(0.06)) {
      job.performance = Math.round(clamp((job.performance ?? 55) + 2, 0, 100));
      ctx.log(`${m.name} ${stillThere(org, m) ? 'retired' : 'moved on'}. Their parting advice stays with you.`, '🧭', 'info');
      job.mentor = null;
    }
  }
  // A rival: a peer going for the same rung.
  if (!job.rival && rng.chance(0.35) && (peer || rng.chance(0.5))) {
    const who = peer ?? someone(rng, 'a colleague at your level');
    job.rival = { id: who.id ?? null, name: who.name, title: who.title || job.title, gender: who.gender, standing: rng.int(50, 68), mood: 'rival', since: state.character.age };
    ctx.log(`${who.name} is going for the same promotion you are. The office has noticed.`, '🥊', 'warn');
  } else if (job.rival) {
    const r = job.rival;
    r.standing = Math.round(clamp(r.standing + rng.int(1, 5), 0, 100));
    if (!stillThere(org, r)) { ctx.log(`${r.name} left the organization.`, '🥊', 'info'); job.rival = null; return; }
    if (r.mood === 'ally') { job.coworkers = Math.round(clamp((job.coworkers ?? 55) + 2, 0, 100)); return; }
    if (r.standing > (job.performance ?? 55) + 8 && rng.chance(0.2)) {
      ctx.stat('happiness', -5);
      job.boss = Math.round(clamp((job.boss ?? 50) - 3, 0, 100));
      ctx.log(`${r.name} was promoted over you. You'll be reporting to them in all but name.`, '🥊', 'bad');
      job.rival = null;
    } else if ((job.performance ?? 55) > r.standing + 15 && rng.chance(0.15)) {
      ctx.stat('happiness', 3);
      ctx.log(`${r.name} left for another job. Nobody doubts why.`, '🥊', 'good');
      job.rival = null;
    }
  }
}

/** Odds for each move with the people at work. */
export function peopleOdds(state, move) {
  const job = state.career?.job;
  if (!job) return 0;
  const r = job.rival;
  if (move === 'outshine') return clamp(0.45 + ((job.performance ?? 55) - (r?.standing ?? 55)) / 120 - (job.burnout ?? 0) / 400, 0.15, 0.9);
  if (move === 'peace') return clamp(0.25 + ((job.coworkers ?? 55) - 50) / 120 + skillOf(state, 'persuasion') / 300, 0.1, 0.8);
  if (move === 'undercut') return clamp(0.4 + skillOf(state, 'persuasion') / 400, 0.2, 0.6);
  return 1;
}

function peopleMove(ctx, move) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job) return ctx.toast('You don\'t have a job.', 'warn');
  const key = `careerStory.${move}`;
  if (yearlyCount(state, key)) return ctx.toast('Once a year.', 'warn');
  const m = job.mentor;
  const r = job.rival;
  if (move === 'advice') {
    if (!m) return ctx.toast('You don\'t have a mentor.', 'warn');
    bumpYearly(state, key);
    m.bond = Math.round(clamp(m.bond + 8, 0, 100));
    job.performance = Math.round(clamp((job.performance ?? 55) + 3, 0, 100));
    practise(state, 'leadership', 2);
    return ctx.log(`Coffee with ${m.name}: ${rng.pick(['pick your battles', 'make your boss look good, and they\'ll make you look good', 'write everything down', 'say yes to the hard jobs, early', 'never surprise the people above you'])}. Good advice.`, '🧭', 'good');
  }
  if (move === 'sponsor') {
    if (!m) return ctx.toast('You don\'t have a mentor.', 'warn');
    if (m.bond < 70) return ctx.toast(`You're not close enough to ${firstName(m)} yet to ask that (bond 70+).`, 'warn');
    bumpYearly(state, key);
    m.bond = Math.round(clamp(m.bond - 12, 0, 100));
    job.boss = Math.round(clamp((job.boss ?? 50) + 8, 0, 100));
    return ctx.log(`${m.name} put in a word for you where it counts.`, '🧭', 'good');
  }
  if (!r) return ctx.toast('You don\'t have a rival.', 'warn');
  if (r.mood === 'ally') return ctx.toast(`${firstName(r)} is on your side now.`, 'info');
  bumpYearly(state, key);
  const ok = rng.chance(peopleOdds(state, move));
  if (move === 'outshine') {
    if (ok) { job.performance = Math.round(clamp((job.performance ?? 55) + 5, 0, 100)); r.standing = Math.round(clamp(r.standing - 6, 0, 100)); return ctx.log(`You beat ${r.name}'s numbers this quarter, and the right people saw it.`, '🥊', 'good'); }
    ctx.stat('stress', 4); r.standing = Math.round(clamp(r.standing + 4, 0, 100));
    return ctx.log(`You went all out to outshine ${r.name}. They had a better quarter anyway.`, '🥊', 'warn');
  }
  if (move === 'peace') {
    if (ok) { r.mood = 'ally'; job.coworkers = Math.round(clamp((job.coworkers ?? 55) + 5, 0, 100)); return ctx.log(`A long lunch with ${r.name}, and you agreed there's room for both of you. An ally now.`, '🤝', 'good'); }
    ctx.stat('happiness', -1); r.standing = Math.round(clamp(r.standing + 2, 0, 100));
    return ctx.log(`${r.name} took your olive branch as weakness.`, '🥊', 'warn');
  }
  if (move === 'undercut') {
    if (ok) { r.standing = Math.round(clamp(r.standing - 15, 0, 100)); job.coworkers = Math.round(clamp((job.coworkers ?? 55) - 4, 0, 100)); return ctx.log(`A word here, a raised eyebrow there: ${r.name}'s star is falling. Not your finest hour.`, '🗡️', 'warn'); }
    job.boss = Math.round(clamp((job.boss ?? 50) - 8, 0, 100)); job.coworkers = Math.round(clamp((job.coworkers ?? 55) - 8, 0, 100));
    return ctx.log(`What you said about ${r.name} got back to the boss. It went badly for you.`, '🗡️', 'bad');
  }
}

/* ------------------------------------------------------------------ */
/* Crisis cards                                                        */
/* ------------------------------------------------------------------ */

const W = (id, label, skill, edge, pass, fail) => ({ id, label, skill, edge, pass, fail });
/** Each crisis has three ways through: bold (high stakes), careful, and handing it up the line. */
export const CRISES = {
  medical: { icon: '🚑', title: 'A Mass-Casualty Night', text: 'A bus crash: fourteen injured, and the ward is short-staffed. Everyone looks at you.', ways: [
    W('lead', '🩺 Take charge of triage', 'medicine', -0.05, { perf: 12, boss: 6, log: 'Every patient you triaged lived. The chief said so in front of everyone.' }, { perf: -8, stress: 10, log: 'In the chaos a patient was missed. The review found it wasn\'t only your fault, but it was partly.' }),
    W('steady', '📋 Follow the protocol to the letter', 'firstAid', 0.15, { perf: 6, log: 'By the book, all night. It held.' }, { perf: -3, stress: 6, log: 'The protocol couldn\'t keep up, and neither could you.' }),
    W('call', '🏃 Send for the consultant', null, 0, { perf: -2, log: 'The consultant came in and ran it. You held the clipboard.' }, null) ] },
  legal: { icon: '⚖️', title: 'Your Witness Recants', text: 'The morning of the trial, your key witness tells you they won\'t testify.', ways: [
    W('pivot', '🔄 Rebuild the case overnight', 'law', -0.05, { perf: 12, boss: 6, log: 'You rebuilt the case overnight and won. People still talk about it.' }, { perf: -8, stress: 8, log: 'The new argument fell apart under cross-examination.' }),
    W('delay', '🗓️ Ask for an adjournment', 'negotiation', 0.15, { perf: 4, log: 'The judge gave you three weeks. You used them well.' }, { perf: -4, boss: -3, log: 'Adjournment refused. You went in short-handed and lost.' }),
    W('settle', '🤝 Settle, and live to fight another day', null, 0, { perf: -2, log: 'You settled on poor terms. The client was disappointed.' }, null) ] },
  police: { icon: '🚨', title: 'A Standoff', text: 'A man has barricaded himself in a shop with the owner. You\'re first on scene.', ways: [
    W('talk', '🗣️ Talk him out', 'persuasion', -0.05, { perf: 12, boss: 6, log: 'Two hours of talking through the door, and he walked out with his hands up. Nobody hurt.' }, { perf: -6, stress: 12, log: 'The talking failed; the specialists went in. The owner was hurt.' }),
    W('contain', '🚧 Hold the perimeter and wait', 'investigation', 0.15, { perf: 5, log: 'You held the scene until the negotiators arrived. Textbook.' }, { perf: -3, stress: 6, log: 'The perimeter leaked: a reporter got through and it was in the papers.' }),
    W('wait', '📣 Send for help and stand back', null, 0, { perf: -2, log: 'You waited for the specialists. Nobody faulted you; nobody praised you.' }, null) ] },
  fire: { icon: '🔥', title: 'A Warehouse Fire', text: 'A warehouse well alight, and a night watchman unaccounted for.', ways: [
    W('search', '🧑‍🚒 Go in for the watchman', 'athletics', -0.08, { perf: 14, boss: 6, log: 'You found him in the smoke and carried him out. A commendation followed.' }, { perf: -4, health: -8, stress: 10, log: 'The roof came in. You got out burned, and without him.' }),
    W('defend', '🧯 Fight it from outside', 'firstAid', 0.15, { perf: 5, log: 'You held the fire to the one building. The watchman turned up at home, asleep.' }, { perf: -3, stress: 6, log: 'It spread to the next building before you held it.' }),
    W('wait', '🫡 Wait for the officer in charge', null, 0, { perf: -2, log: 'You waited for orders. The officer in charge took it from there.' }, null) ] },
  teaching: { icon: '📋', title: 'The Inspectors Are Coming', text: 'An inspection, announced on Friday, for Monday. Your classes will be watched.', ways: [
    W('show', '🌟 Teach your best lesson ever', 'teaching', -0.05, { perf: 12, boss: 5, log: 'The inspector wrote "outstanding" about your lesson. The head framed it, nearly.' }, { perf: -6, stress: 8, log: 'Too ambitious: the lesson fell apart in front of the inspector.' }),
    W('safe', '📝 A safe, tidy lesson', 'writing', 0.15, { perf: 5, log: 'A solid lesson, a solid report.' }, { perf: -2, log: 'Safe, tidy and forgettable, said the report.' }),
    W('sick', '🤒 Call in sick', null, 0, { perf: -4, boss: -3, log: 'You missed the inspection. Everyone knew why.' }, null) ] },
  tech: { icon: '🧯', title: 'Down at 2 a.m.', text: 'Everything is down, the customers are noticing, and you\'re on call.', ways: [
    W('fix', '⌨️ Fix it live', 'coding', -0.05, { perf: 12, boss: 6, log: 'Back up in forty minutes, and you wrote the post-mortem everyone now copies.' }, { perf: -6, stress: 8, log: 'Your fix made it worse. Six hours down.' }),
    W('rollback', '⏪ Roll back and investigate', 'data', 0.15, { perf: 6, log: 'Rolled back, cause found by breakfast. Calm work.' }, { perf: -3, stress: 6, log: 'The rollback failed too. A long night.' }),
    W('escalate', '📟 Page the senior engineer', null, 0, { perf: -2, log: 'The senior engineer fixed it. You learned something, at least.' }, null) ] },
  business: { icon: '📉', title: 'The Client Threatens to Walk', text: 'Your biggest client is unhappy and has a meeting with a competitor on Thursday.', ways: [
    W('win', '🧳 Go to them in person and win them back', 'negotiation', -0.05, { perf: 12, boss: 6, earn: 0.05, log: 'You went to see them, listened, and came back with a bigger contract.' }, { perf: -8, stress: 8, log: 'They walked anyway, and you were the face of it.' }),
    W('discount', '🏷️ Offer a discount', 'sales', 0.15, { perf: 4, log: 'The discount kept them. The margin will hurt, but they stayed.' }, { perf: -4, log: 'They took the discount and left a year later.' }),
    W('boss', '📣 Hand it to your boss', null, 0, { perf: -2, log: 'Your boss handled it. Your boss will remember that you didn\'t.' }, null) ] },
  trades: { icon: '⚠️', title: 'Something\'s Wrong on Site', text: 'You find a structural problem the plans missed, and the client wants it finished by Friday.', ways: [
    W('fix', '🔧 Stop and put it right', 'carpentry', 0.0, { perf: 10, boss: 4, log: 'You stopped the job and put it right. The inspector shook your hand.' }, { perf: -4, stress: 6, log: 'Putting it right took twice as long as you said. The client was furious.' }),
    W('patch', '🩹 Patch it and flag it', 'mechanics', 0.15, { perf: 4, log: 'You patched it and wrote it up. It held.' }, { perf: -6, stress: 6, log: 'The patch failed at the inspection.' }),
    W('ignore', '🙈 Say nothing and finish', null, 0, { perf: -1, stress: 4, log: 'You finished on time and said nothing. You think about it sometimes.' }, null) ] },
  arts: { icon: '🗞️', title: 'A Savage Review', text: 'A famous critic has torn your latest work apart in print.', ways: [
    W('reply', '✍️ Answer them in print', 'writing', -0.05, { perf: 10, log: 'Your reply was wittier than the review. Everyone read both.' }, { perf: -6, log: 'Your reply made you look thin-skinned.' }),
    W('work', '🎨 Say nothing and make the next thing', 'design', 0.15, { perf: 5, happiness: 3, log: 'You made the next thing, and it was better.' }, { happiness: -3, log: 'The review stuck. The next thing was harder to make.' }),
    W('hide', '🛋️ Lie low for a while', null, 0, { perf: -2, log: 'You lay low. It blew over, mostly.' }, null) ] },
  general: { icon: '⚠️', title: 'A Crisis at Work', text: 'Something has gone badly wrong, it\'s your area, and everyone is waiting to see what you do.', ways: [
    W('lead', '🧭 Take charge', 'leadership', -0.05, { perf: 10, boss: 5, log: 'You took charge and sorted it out. People noticed.' }, { perf: -6, stress: 8, log: 'You took charge, and it went wrong with your name on it.' }),
    W('careful', '📋 Do it carefully, by the rules', 'data', 0.15, { perf: 4, log: 'Careful work, a careful outcome.' }, { perf: -3, log: 'Careful wasn\'t fast enough.' }),
    W('up', '📣 Pass it up the line', null, 0, { perf: -2, log: 'You passed it up. Someone else sorted it.' }, null) ] },
};

/** The odds of a way through going well (handing it up always "works", at a small cost). */
export function crisisOdds(state, way) {
  const job = state.career?.job;
  if (!way.skill || !job) return 1;
  return clamp(0.35 + way.edge + skillOf(state, way.skill) / 160 + ((job.performance ?? 55) - 55) / 200 - (job.burnout ?? 0) / 400, 0.1, 0.92);
}

function maybeCrisis(ctx, rng) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job || state.character.age < 18 || state.prompts.some((p) => p.type === 'careerStory.crisis')) return;
  const last = state.career.lastCrisis ?? -99;
  if (state.character.age - last < 3 || !rng.chance(0.22)) return;
  const kind = storyKind(state, job);
  const c = CRISES[kind] ?? CRISES.general;
  state.career.lastCrisis = state.character.age;
  ctx.prompt({
    type: 'careerStory.crisis', icon: c.icon, title: c.title, text: c.text,
    options: c.ways.map((w) => ({ id: w.id, label: `${w.label}${w.skill ? ` · ${Math.round(crisisOdds(state, w) * 100)}%` : ''}`, hint: w.skill ? `Uses your ${w.skill.replace(/([A-Z])/g, ' $1').toLowerCase()}` : 'Safe, at a small cost' })),
    data: { kind },
  });
}

function applyFx(ctx, job, fx) {
  for (const [k, key] of [['perf', 'performance'], ['boss', 'boss'], ['coworkers', 'coworkers']]) if (fx[k]) job[key] = Math.round(clamp((job[key] ?? 50) + fx[k], 0, 100));
  for (const s of ['stress', 'health', 'happiness']) if (fx[s]) ctx.stat(s, fx[s]);
  if (fx.earn) ctx.earn(Math.round((job.salary ?? 0) * fx.earn), 'Bonus for saving the account', { wage: true });
}

/* ------------------------------------------------------------------ */
/* The module                                                          */
/* ------------------------------------------------------------------ */

export const CareerStoryModule = {
  id: 'careerStory',
  // After the year's plan (careerPlay 29), before the career engine's review (30).
  order: 29.5,
  setup(engine) {
    engine.bus.on('career:separated', ({ ctx }) => {
      if (ctx && projectOf(ctx.state)) dropProject(ctx, `Leaving the job meant leaving ${projectOf(ctx.state).name.toLowerCase()} to someone else.`);
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.career) return;
    const rng = sideRng(state);
    projectYear(ctx, rng);
    peopleYear(ctx, rng);
    maybeCrisis(ctx, rng);
  },
  actions: {
    startProject(ctx) { startProject(ctx); },
    pushProject(ctx) { pushProject(ctx); },
    people(ctx, move) { peopleMove(ctx, move); },
  },
  resolvers: {
    crisis(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const c = CRISES[data?.kind] ?? CRISES.general;
      const way = c.ways.find((w) => w.id === optionId) ?? c.ways.at(-1);
      if (!job) return;
      const ok = !way.skill || ctx.rng.chance(crisisOdds(ctx.state, way));
      const fx = ok ? way.pass : way.fail;
      applyFx(ctx, job, fx);
      if (way.skill) practise(ctx.state, way.skill, ok ? 5 : 3);
      ctx.log(fx.log, c.icon, ok ? (way.skill ? 'good' : 'info') : 'bad');
      showResult(ctx, { icon: c.icon, title: c.title, big: ok ? (way.skill ? 'It worked' : 'Handled') : 'It went wrong', sub: fx.log, tone: ok ? 'good' : 'bad', popup: false });
    },
  },
};
