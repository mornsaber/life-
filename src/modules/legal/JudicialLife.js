/**
 * Life on the bench: what a judge does besides rule (the rulings themselves are on the docket,
 * Legal → Cases).
 *
 *   Backlog      Cases waiting for a hearing. It grows every year; a long one costs approval
 *                (justice delayed) and, at retention, votes. Weekends in chambers and good clerks
 *                bring it down.
 *   Clerks       Law clerks research and draft. Better clerks write better opinions and keep the
 *                backlog moving — and go on to careers of their own that reflect on you.
 *   Opinions     A considered opinion can be cited for decades: reputation, and the attention of
 *                whoever fills the next court up.
 *   Courts       Trial judges can start a drug, veterans' or mental-health court: fewer people
 *                back in front of you, a public that notices.
 *   The bench    Teaching, judicial conferences, committee seats, sitting by designation on a
 *                higher court — and a book when you've earned one.
 *   Events       Threats, ethics complaints, gifts you must refuse, the high-profile trial, the
 *                shares you forgot you owned, the hung jury.
 *
 * state.judiciary.life = { backlog, clerks, opinions: [{ name, age, landmark }], courts: [], committee, designations, taught, book, complaints }
 */
import { clamp, Random } from '../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../core/State.js';
import { priceLevel } from '../world/Countries.js';

export const lifeOf = (state) => (state.judiciary.life ??= { backlog: 30, clerks: 0, opinions: [], courts: [], committee: false, designations: 0, taught: 0, book: false, complaints: 0 });
const seatOf = (state) => state.judiciary?.seat ?? null;
const bump = (state, { rep = 0, approval = 0 }) => {
  const seat = seatOf(state);
  if (!seat) return;
  seat.reputation = Math.round(clamp(seat.reputation + taper(seat.reputation, rep), 0, 100));
  seat.approval = Math.round(clamp(seat.approval + approval, 0, 100));
};
/** Reputation is hard to build at the top: gains shrink as it rises (losses don't). */
export const taper = (rep, gain) => (gain > 0 ? gain * Math.max(0.15, 1 - rep / 110) : gain);
const surname = (rng) => randomName(rng, rng.chance(0.5) ? 'male' : 'female').lastName;
const caseName = (rng, criminal) => (criminal ? `${rng.pick(['State', 'People', 'United States', 'Commonwealth'])} v. ${surname(rng)}` : rng.chance(0.2) ? `In re ${surname(rng)}` : `${surname(rng)} v. ${surname(rng)}`);

/** Problem-solving courts a trial judge can found. */
export const SPECIAL_COURTS = {
  drug: { name: 'Drug Court', icon: '💊', text: 'Treatment, weekly check-ins and sanctions instead of a cell.' },
  veterans: { name: 'Veterans Treatment Court', icon: '🎖️', text: 'Veteran mentors, VA care, and a judge who knows the difference between a crime and a breakdown.' },
  mental: { name: 'Mental Health Court', icon: '🧠', text: 'Treatment plans for defendants whose crimes came out of untreated illness.' },
  dv: { name: 'Domestic Violence Court', icon: '🏠', text: 'One judge for the criminal case, the protective order and the custody fight.' },
};

/** What a judge can do this year: { id, label, hint, ok, reason }. */
export function judgeActions(state, tier) {
  const L = lifeOf(state);
  const once = (id) => Boolean(yearlyCount(state, `judge.${id}`));
  const trial = tier === 'trial';
  const yrs = state.character.age - (seatOf(state)?.since ?? state.character.age);
  return [
    { id: 'opinion', label: '✍️ Write a major opinion', hint: 'Reputation; a landmark if the reasoning holds', done: once('opinion') },
    { id: 'backlog', label: '📚 Clear the backlog', hint: 'Weekends in chambers: approval up, stress up', done: once('backlog') },
    { id: 'clerks', label: L.clerks >= 2 ? '🧑‍🎓 Pick this year\'s clerks' : '🧑‍🎓 Hire law clerks', hint: 'Better opinions, a faster docket', done: once('clerks') },
    { id: 'teach', label: '🏫 Teach a law-school course', hint: 'A stipend, students, reputation', done: once('teach') },
    { id: 'conference', label: '🎤 Speak at a judicial conference', hint: L.committee ? 'You sit on a committee' : 'A path onto a committee', done: once('conference') },
    trial ? { id: 'specialCourt', label: '🌱 Start a problem-solving court', hint: `${L.courts.length}/${Object.keys(SPECIAL_COURTS).length} running`, done: once('specialCourt') || L.courts.length >= Object.keys(SPECIAL_COURTS).length } : null,
    { id: 'mentor', label: '🤝 Mentor a new judge', hint: 'Less stress, more meaning', done: once('mentor') },
    yrs >= 10 && !L.book ? { id: 'book', label: '📖 Write a book about the law', hint: 'Ten years on the bench earns an audience', done: once('book') } : null,
  ].filter(Boolean);
}

export const JudgeActions = {
  /** arg: the action id. */
  bench(ctx, act) {
    const { state, rng } = ctx;
    const seat = seatOf(state);
    if (!seat) return ctx.toast('Judges only', 'warn');
    const L = lifeOf(state);
    const key = `judge.${act}`;
    if (yearlyCount(state, key)) return ctx.toast('Once a year', 'warn');
    const skill = (state.stats.smarts - 50) / 100 + L.clerks * 0.06 + seat.reputation / 400;
    switch (act) {
      case 'opinion': {
        bumpYearly(state, key);
        ctx.stat('stress', 4);
        const name = caseName(rng, rng.chance(0.5));
        const landmark = rng.chance(clamp(0.1 + skill * 0.5, 0.05, 0.6));
        L.opinions.push({ name, age: state.character.age, landmark });
        if (landmark) {
          bump(state, { rep: 5, approval: 1 });
          ctx.stat('happiness', 6);
          return ctx.log(`Your opinion in ${name} was cited across the country and taught in law schools within a year.`, '✍️', 'good');
        }
        bump(state, { rep: 1 });
        return ctx.log(`You wrote the opinion in ${name}: careful, sound, cited a handful of times.`, '✍️', 'info');
      }
      case 'backlog': {
        bumpYearly(state, key);
        const cut = Math.round(10 + rng.int(5, 15) + L.clerks * 4);
        L.backlog = Math.max(0, L.backlog - cut);
        ctx.stat('stress', 7);
        ctx.stat('health', -1);
        bump(state, { approval: 3 });
        return ctx.log(`Weekends and evenings in chambers: you cleared ${cut} cases off the backlog.`, '📚', 'good');
      }
      case 'clerks': {
        bumpYearly(state, key);
        const top = rng.chance(clamp(0.3 + seat.reputation / 200, 0.2, 0.85));
        L.clerks = Math.min(3, Math.max(L.clerks, 1) + (top ? 1 : 0));
        return ctx.log(top ? 'You hired clerks from the top of their class: law-review editors who could write before they arrived.' : 'You hired solid clerks from the local law school. They will learn on the job.', '🧑‍🎓', 'info');
      }
      case 'teach': {
        bumpYearly(state, key);
        L.taught += 1;
        ctx.earn(Math.round(12000 * priceLevel(state)), 'Law-school teaching stipend', { wage: true });
        if (L.taught % 2) bump(state, { rep: 1 });
        ctx.stat('stress', 2);
        ctx.stat('happiness', 2);
        return ctx.log(`You taught ${rng.pick(['Evidence', 'Trial Advocacy', 'Federal Courts', 'Sentencing Law', 'Judicial Process'])} to a room of second-years.`, '🏫', 'info');
      }
      case 'conference': {
        bumpYearly(state, key);
        bump(state, { rep: rng.chance(0.5) ? 1 : 0 });
        if (!L.committee && rng.chance(clamp(0.15 + seat.reputation / 300, 0.1, 0.5))) {
          L.committee = true;
          bump(state, { rep: 3 });
          return ctx.log(`After your talk, the Chief Justice asked you to join the ${rng.pick(['Committee on Criminal Rules', 'Committee on Codes of Conduct', 'Committee on Court Administration', 'Committee on Judicial Security'])}.`, '🏛️', 'milestone');
        }
        return ctx.log('You spoke on a panel about sentencing and stayed late arguing with colleagues over drinks.', '🎤', 'info');
      }
      case 'specialCourt': {
        const next = Object.keys(SPECIAL_COURTS).find((k) => !L.courts.includes(k));
        if (!next) return ctx.toast('All running', 'warn');
        bumpYearly(state, key);
        L.courts.push(next);
        ctx.stat('stress', 4);
        bump(state, { approval: 3, rep: 2 });
        return ctx.log(`You founded the county's ${SPECIAL_COURTS[next].name}. ${SPECIAL_COURTS[next].text}`, SPECIAL_COURTS[next].icon, 'milestone');
      }
      case 'mentor': {
        bumpYearly(state, key);
        ctx.stat('happiness', 3);
        ctx.stat('stress', -2);
        return ctx.log('You took a newly appointed judge to lunch every month and talked them through their first jury trial.', '🤝', 'info');
      }
      case 'book': {
        bumpYearly(state, key);
        L.book = true;
        const advance = Math.round(rng.int(20, 120) * 1000 * priceLevel(state));
        ctx.earn(advance, 'Book advance');
        bump(state, { rep: 3 });
        return ctx.log(`Your book, ${rng.pick(['Equal Justice', 'From the Bench', 'The Reasonable Doubt', 'Order in the Court', 'What the Law Asks'])}, was published: a review in the papers, an advance of $${advance.toLocaleString()}.`, '📖', 'milestone');
      }
      default:
        return undefined;
    }
  },
};

/* ------------------------------------------------------------------ */
/* Yearly                                                              */
/* ------------------------------------------------------------------ */

const EVENTS = [
  { id: 'threat', title: 'A Threat', text: 'A defendant you sentenced wrote from prison: he knows where you live. The marshals take it seriously.', options: [{ id: 'protect', label: '🛡️ Accept a protective detail and a home alarm' }, { id: 'ignore', label: '🤷 Carry on as normal', hint: 'Most threats are just words' }] },
  { id: 'gift', title: 'A Gift', text: 'A lawyer who appears before you sent a case of very good wine "to thank you for your service".', options: [{ id: 'return', label: '📦 Send it back with a polite note' }, { id: 'keep', label: '🍷 Keep it', tone: 'danger', hint: 'A judicial-ethics problem' }] },
  { id: 'stock', title: 'A Conflict', text: 'Halfway through a big commercial case, you realize you own shares in one of the parties.', options: [{ id: 'recuse', label: '🙋 Disclose it and recuse' }, { id: 'sell', label: '📉 Sell the shares quietly and carry on', tone: 'danger', hint: 'If it comes out…' }] },
  { id: 'highProfile', title: 'The Trial Everyone Is Watching', text: 'You drew the case of the year: a celebrity defendant, satellite trucks outside, and a jury pool that has already made up its mind.', options: [{ id: 'tight', label: '🔒 Sequester the jury and gag the lawyers', hint: 'Fair, slow, thankless' }, { id: 'cameras', label: '📺 Allow cameras in the courtroom', hint: 'Fame — and the circus' }, { id: 'recuse', label: '🙅 Find a reason to recuse' }] },
  { id: 'hung', title: 'A Hung Jury', text: 'After four days the jury says it can\'t agree. The foreman looks exhausted.', options: [{ id: 'allen', label: '📜 Send them back with the "dynamite" charge' }, { id: 'mistrial', label: '⚖️ Declare a mistrial' }] },
  { id: 'complaint', title: 'An Ethics Complaint', text: 'A losing litigant filed a complaint with the judicial conduct board accusing you of bias.', options: [{ id: 'respond', label: '📝 Respond in full, with the transcript' }, { id: 'counsel', label: '👔 Hire counsel to respond for you', hint: 'Costs money' }] },
  { id: 'designation', title: 'Sitting by Designation', text: 'The appeals court is short of judges and asked you to sit on a panel for a term.', options: [{ id: 'sit', label: '🏛️ Accept', hint: 'A look at the next court up' }, { id: 'decline', label: '🙅 Decline: your own docket is full' }] },
  { id: 'clerkStar', title: 'A Former Clerk', text: 'One of your former clerks was just appointed to a judgeship of their own, and thanked you in their swearing-in speech.', options: [{ id: 'attend', label: '🎉 Go to the swearing-in' }] },
];

/** Yearly: the backlog grows, special courts graduate people, and something happens. */
export function judgeLifeTick(ctx) {
  const { state } = ctx;
  const seat = seatOf(state);
  if (!seat) return;
  const L = lifeOf(state);
  // Its own dice, so the bench's life never shifts the rest of the year's rolls.
  L.seed = ((L.seed ?? 11) * 1664525 + 1013904223) >>> 0;
  const rng = new Random(L.seed);
  L.backlog = Math.max(0, L.backlog + rng.int(8, 18) - L.clerks * 3);
  if (L.backlog > 60) {
    bump(state, { approval: -2 });
    if (rng.chance(0.3)) ctx.log(`Your backlog passed ${L.backlog} cases. A newspaper ran the numbers: "Justice Delayed".`, '🗞️', 'warn');
  }
  for (const k of L.courts) {
    if (rng.chance(0.5)) {
      ctx.stat('happiness', 2);
      bump(state, { approval: 1 });
      ctx.log(`${SPECIAL_COURTS[k].icon} ${rng.int(6, 25)} people graduated from your ${SPECIAL_COURTS[k].name} this year. One brought her mother to the ceremony.`, SPECIAL_COURTS[k].icon, 'good');
    }
  }
  // A good clerk eventually makes you look good.
  const pool = EVENTS.filter((e) => (e.id !== 'clerkStar' || L.clerks >= 2) && (e.id !== 'designation' || L.designations < 3));
  if (!state.prompts.some((p) => p.type === 'judiciary.life') && rng.chance(0.55)) {
    const e = rng.pick(pool);
    ctx.prompt({ type: 'judiciary.life', icon: '🧑‍⚖️', title: e.title, text: e.text, options: e.options, data: { id: e.id, seed: rng.int(1, 1e9) } });
  }
}

export function resolveJudgeLife(ctx, data, optionId) {
  const { state } = ctx;
  const seat = seatOf(state);
  if (!seat) return;
  const L = lifeOf(state);
  const rng = new Random(data.seed ?? 1);
  const say = (text, icon, kind) => ctx.log(text, icon, kind);
  switch (`${data.id}.${optionId}`) {
    case 'threat.protect': ctx.stat('stress', 3); return say('Deputy marshals walked you to your car for six months. Nothing happened, which is the point.', '🛡️', 'info');
    case 'threat.ignore':
      if (rng.chance(0.12)) { ctx.stat('stress', 15); ctx.emit('health:trauma', { amount: 12, source: 'threat' }); return say('Someone threw a brick through your front window at 2 a.m. The police found the man\'s brother.', '🧱', 'bad'); }
      return say('Nothing came of it. You checked the mirror more often for a while.', '🪞', 'muted');
    case 'gift.return': bump(state, { rep: 1 }); return say('You sent it back. The lawyer\'s note of apology was very prompt.', '📦', 'good');
    case 'gift.keep':
      if (rng.chance(0.3)) { L.complaints += 1; bump(state, { rep: -8, approval: -6 }); return say('The conduct board found out about the wine. A public reprimand: "the appearance of impropriety".', '📛', 'bad'); }
      return say('You kept it. It was very good wine.', '🍷', 'warn');
    case 'stock.recuse': bump(state, { rep: 2 }); return say('You disclosed the shares and stepped aside. The case went to a colleague.', '🙋', 'good');
    case 'stock.sell':
      if (rng.chance(0.35)) { L.complaints += 1; bump(state, { rep: -10, approval: -8 }); seat.reversals += 1; return say('A reporter matched your financial disclosure to the docket. The judgment was vacated, and the conduct board censured you.', '📰', 'bad'); }
      return say('You sold the shares and finished the case. Nobody ever noticed.', '📉', 'warn');
    case 'highProfile.tight': bump(state, { rep: 5 }); ctx.stat('stress', 8); return say('Six weeks of trial with no leaks and a verdict the appeals court never touched. Lawyers still describe your courtroom as "a model".', '🔒', 'good');
    case 'highProfile.cameras':
      ctx.emit('fame:buzz', { amount: 12 });
      if (rng.chance(0.4)) { bump(state, { rep: -5, approval: 3 }); return say('The trial became a nightly show. You were on the front of the tabloids; the bar was not impressed.', '📺', 'warn'); }
      bump(state, { rep: 2, approval: 5 }); return say('The country watched you run a calm, fair trial. Strangers recognize you in the supermarket.', '📺', 'good');
    case 'highProfile.recuse': return say('You found a reason to step aside. A colleague got the circus.', '🙅', 'muted');
    case 'hung.allen':
      if (rng.chance(0.25)) { seat.reversals += 1; bump(state, { rep: -3 }); return say('The jury came back with a verdict in an hour — and the appeals court said your charge was coercive.', '↩️', 'bad'); }
      bump(state, { rep: 1 }); return say('The jury reached a verdict the next morning.', '📜', 'info');
    case 'hung.mistrial': bump(state, { approval: -1 }); return say('You declared a mistrial. The prosecutor will try again in the spring.', '⚖️', 'info');
    case 'complaint.respond':
      if (rng.chance(0.85)) return say('The board dismissed the complaint as "a disagreement with the ruling, not misconduct".', '📝', 'good');
      L.complaints += 1; bump(state, { rep: -4 }); return say('The board issued a private admonition about your tone from the bench.', '📝', 'warn');
    case 'complaint.counsel': ctx.spend(Math.round(6000 * priceLevel(state)), 'Counsel before the judicial conduct board', { allowDebt: true }); return say('Your lawyer\'s response was twelve pages long. The complaint was dismissed.', '👔', 'good');
    case 'designation.sit': L.designations += 1; bump(state, { rep: 4 }); ctx.stat('stress', 3); return say('You sat on an appeals panel for a term and wrote two of its opinions. The circuit\'s judges noticed.', '🏛️', 'good');
    case 'designation.decline': return say('You stayed with your own docket.', '🙅', 'muted');
    case 'clerkStar.attend': bump(state, { rep: 2 }); ctx.stat('happiness', 5); return say('You held the Bible at the swearing-in. Your former clerk cried; so did you, a little.', '🎉', 'good');
    default: return undefined;
  }
}
