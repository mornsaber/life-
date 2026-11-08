/**
 * The people who shape a life, beyond partners and parents (Bonds, Rivals and NpcLives cover
 * those): mentors, old flames, and brothers and sisters whose lives take turns.
 *
 *   mentor     early in a career, someone senior takes you under their wing: each year you
 *              learn the job faster and do it better; one day they ask a favour; one day they
 *              retire. Later, you mentor someone yourself.
 *   old flame  years after it ended, an ex gets in touch. Coffee, a rekindled romance if
 *              you're both free, a temptation if you're not.
 *   siblings   a brother's business takes off, a sister loses everything, a row over the
 *              will, a wedding where you make the speech.
 *
 * state.mentor = { name, title, since, rel } | null   state.mentee = { name, since } | null
 * state.relLife = { flameAsked, sibAsked }
 */
import { Random, clamp } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { rep } from '../life/Reputation.js';
import { practise } from '../life/Skills.js';
import { living, partnerOf, spouseOf, byId, clampRel, ageOf, parentsOf } from './People.js';

const sideRng = (state, salt) => new Random((((state.world?.seed ?? 1) * 104729 + state.character.age * 389 + salt) >>> 0));
const life = (state) => (state.relLife ??= {});
const JOB_SKILLS = ['leadership', 'negotiation', 'publicSpeaking', 'writing', 'research', 'persuasion'];

function mentorYear(ctx) {
  const { state } = ctx;
  const job = state.career?.job;
  const age = state.character.age;
  const m = state.mentor;
  if (m) {
    if (!job) return;
    m.rel = clamp((m.rel ?? 60) + 1, 0, 100);
    job.performance = Math.round(clamp((job.performance ?? 50) + 2, 0, 100));
    practise(state, JOB_SKILLS[age % JOB_SKILLS.length], 3);
    const years = age - m.since;
    const rng = sideRng(state, 0x3e7);
    if (years >= 3 && !m.favour && rng.chance(0.2)) {
      m.favour = true;
      return void ctx.prompt({ type: 'relationships.favour', icon: '🤝', title: `${m.name} Asks a Favour`, text: `${m.name}, who has looked out for you for ${years} years, made a mistake that could end their career. They want you to back their version of what happened.`, options: [
        { id: 'back', label: '🤝 Back them', hint: 'Loyalty, and a lie' },
        { id: 'truth', label: '⚖️ Tell the truth', hint: 'Right, and the end of the friendship' },
      ], data: {} });
    }
    if (years >= 6 && rng.chance(0.18)) {
      ctx.log(`${m.name} retired. At the leaving do they said you were the best they'd ever trained.`, '🎓', 'good');
      state.mentor = null;
    }
    return;
  }
  // You mentor someone yourself, once you're senior.
  if (job && !state.mentee && age >= 42 && (job.grade ?? 0) >= 5 && sideRng(state, 0x3e8).chance(0.12)) {
    const n = randomName(sideRng(state, 0x3e9), age % 2 ? 'female' : 'male');
    state.mentee = { name: `${n.firstName} ${n.lastName}`, since: age };
    ctx.stat('happiness', 3);
    rep(ctx, 'work', 3, 'mentoring');
    return void ctx.log(`You've taken ${n.firstName} ${n.lastName}, a bright new starter, under your wing. They remind you of yourself.`, '🌱', 'good');
  }
  if (!job || state.relLife?.mentorAsked || age < 21 || age > 34 || (job.grade ?? 0) > 4) return;
  const rng = sideRng(state, 0x3ea);
  if (!rng.chance(0.15)) return;
  life(state).mentorAsked = true;
  const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
  ctx.prompt({ type: 'relationships.mentor', icon: '🧭', title: 'A Mentor', text: `${n.firstName} ${n.lastName}, one of the most respected people at ${job.employer?.name ?? 'work'}, has noticed you. "Come and see me on Fridays. I'll show you how it really works."`, options: [
    { id: 'yes', label: '🧭 Gladly', hint: 'Learn faster; owe them' },
    { id: 'no', label: '🙂 Politely, no', hint: 'Make your own way' },
  ], data: { name: `${n.firstName} ${n.lastName}` } });
}

function flameYear(ctx) {
  const { state } = ctx;
  const age = state.character.age;
  const L = life(state);
  if (age < 28 || (L.flameAsked != null && age - L.flameAsked < 8)) return;
  const exes = living(state).filter((p) => (p.relation === 'ex' || (p.relation === 'friend' && p.formerPartner)) && age - (p.endedAge ?? p.since ?? age) >= 6);
  if (!exes.length || !sideRng(state, 0xf1a).chance(0.08)) return;
  const ex = exes[age % exes.length];
  L.flameAsked = age;
  const taken = Boolean(partnerOf(state));
  ctx.prompt({ type: 'relationships.flame', icon: '🕯️', title: 'An Old Flame', text: `Out of nowhere, a message from ${ex.firstName}. "I was thinking about you. It's been years. Coffee?"${taken ? ` You're with ${partnerOf(state).firstName} now.` : ''}`, options: [
    { id: 'coffee', label: '☕ Coffee, as friends' },
    ...(taken ? [{ id: 'affair', label: '🔥 More than coffee', tone: 'danger', hint: 'Affairs come out' }] : [{ id: 'rekindle', label: '💞 See if there\'s still something' }]),
    { id: 'no', label: '🙅 Leave the past where it is' },
  ], data: { id: ex.id } });
}

function siblingYear(ctx) {
  const { state } = ctx;
  const age = state.character.age;
  const L = life(state);
  if (age < 22 || (L.sibAsked != null && age - L.sibAsked < 4)) return;
  const sibs = living(state).filter((p) => p.relation === 'sibling' && ageOf(state, p) >= 20);
  if (!sibs.length) return;
  const rng = sideRng(state, 0x51b);
  if (!rng.chance(0.18)) return;
  const s = sibs[age % sibs.length];
  L.sibAsked = age;
  const brother = s.gender === 'male' ? 'brother' : 'sister';
  const parentsGone = parentsOf(state).length && parentsOf(state).every((p) => !p.alive);
  const kinds = ['rich', 'broke', 'wedding', ...(parentsGone ? ['will'] : [])];
  const kind = kinds[(age + s.firstName.length) % kinds.length];
  const T = {
    rich: { title: `${s.firstName}'s Big Break`, text: `Your ${brother} ${s.firstName}'s little business has taken off. They want you to put money in before it goes big.`, options: [{ id: 'invest', label: '💵 Invest $20,000', hint: 'Family, and a gamble' }, { id: 'cheer', label: '🥂 Cheer them on, keep your money' }] },
    broke: { title: `${s.firstName} in Trouble`, text: `Your ${brother} ${s.firstName} has lost their job and their flat, and is too proud to ask. Their partner rang you instead.`, options: [{ id: 'help', label: '🏠 Take them in and help them back up', hint: '$6,000 and your spare room' }, { id: 'money', label: '💵 Send some money', hint: '$2,000' }, { id: 'no', label: '🙅 They made their choices' }] },
    wedding: { title: `${s.firstName}'s Wedding`, text: `Your ${brother} ${s.firstName} is getting married and wants you to give the speech.`, options: [{ id: 'speech', label: '🎤 Give the speech of your life', hint: 'Public speaking' }, { id: 'short', label: '🥂 Keep it short and sweet' }] },
    will: { title: 'The Will', text: `Your parents' will has caused a row with your ${brother} ${s.firstName}: the house, the money, who looked after them at the end.`, options: [{ id: 'give', label: '🤝 Let them have what they want', hint: 'Money for peace' }, { id: 'fight', label: '⚖️ Fight for your share', hint: 'You might never speak again' }, { id: 'talk', label: '🗣️ Sit down and talk it through', hint: 'Persuasion' }] },
  }[kind];
  ctx.prompt({ type: 'relationships.sibling', icon: '👫', title: T.title, text: T.text, options: T.options, data: { id: s.id, kind } });
}

export const RelationshipsModule = {
  id: 'relationships',
  order: 7.7,
  onAgeUp(ctx) {
    if (ctx.state.legal?.incarceration || ctx.state.character.age < 18) return;
    mentorYear(ctx);
    flameYear(ctx);
    siblingYear(ctx);
  },
  resolvers: {
    mentor(ctx, data, optionId) {
      if (optionId !== 'yes') return void ctx.log('You thanked them and made your own way.', '🙂');
      ctx.state.mentor = { name: data.name, since: ctx.state.character.age, rel: 60 };
      ctx.log(`${data.name} is your mentor now. Every Friday, an hour that's worth a month.`, '🧭', 'good');
    },
    favour(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const m = state.mentor;
      if (!m) return;
      if (optionId === 'back') {
        if (rng.chance(0.3)) { if (state.career.job) state.career.job.warnings = (state.career.job.warnings ?? 0) + 1; rep(ctx, 'work', -6, 'covering for a mentor'); ctx.log(`It came out that ${m.name}'s story wasn't true, and that you'd backed it.`, '⚠️', 'bad'); }
        else { m.rel = 100; ctx.log(`You backed ${m.name}. They will never forget it, and neither will you.`, '🤝'); }
      } else { ctx.log(`You told the truth. ${m.name} lost their job, and never spoke to you again.`, '⚖️', 'warn'); rep(ctx, 'work', 3, 'integrity'); state.mentor = null; }
    },
    flame(ctx, data, optionId) {
      const { state, rng } = ctx;
      const ex = byId(state, data.id);
      if (!ex) return;
      if (optionId === 'coffee') { ex.relationship = clampRel(ex.relationship + 15); ctx.stat('happiness', 3); return void ctx.log(`Coffee with ${ex.firstName} turned into three hours. You're friends now, which is more than you expected.`, '☕', 'good'); }
      if (optionId === 'rekindle') {
        if (rng.chance(0.55)) { ex.relation = 'partner'; ex.since = state.character.age; ex.relationship = clampRel(ex.relationship + 25); ctx.stat('happiness', 8); return void ctx.log(`It was still there. You and ${ex.firstName} are together again.`, '💞', 'good'); }
        return void ctx.log(`It wasn't there any more. You parted kindly this time.`, '🍂');
      }
      if (optionId === 'affair') {
        const p = partnerOf(state);
        ctx.stat('happiness', 4);
        if (p && rng.chance(0.45)) { p.relationship = clampRel(p.relationship - 35); if (p.spark != null) p.spark = Math.max(0, p.spark - 30); ctx.stat('happiness', -10); return void ctx.log(`${p.firstName} found the messages from ${ex.firstName}.`, '💔', 'bad'); }
        return void ctx.log(`You and ${ex.firstName} met in hotel rooms for a few months, and then it stopped. Nobody found out. You know.`, '🔥', 'warn');
      }
      ctx.log(`You didn't reply to ${ex.firstName}.`, '🙅');
    },
    sibling(ctx, data, optionId) {
      const { state, rng } = ctx;
      const s = byId(state, data.id);
      if (!s) return;
      const rel = (d) => { s.relationship = clampRel(s.relationship + d); };
      switch (`${data.kind}.${optionId}`) {
        case 'rich.invest':
          if (!ctx.spend(20000, `Investing in ${s.firstName}'s business`, { credit: true })) return void ctx.toast('You don\'t have $20,000.', 'warn');
          rel(10);
          if (rng.chance(0.4)) { ctx.earn(rng.int(60, 200) * 1000, `${s.firstName}'s business paid out`); ctx.log(`${s.firstName}'s business sold to a big company. Your stake paid off handsomely.`, '🚀', 'good'); }
          else ctx.log(`${s.firstName}'s business went under in the end. You lost the money, and kept your ${s.gender === 'male' ? 'brother' : 'sister'}.`, '📉', 'warn');
          break;
        case 'rich.cheer': rel(2); ctx.log(`You cheered ${s.firstName} on from the sidelines.`, '🥂'); break;
        case 'broke.help': ctx.spend(6000, `Helping ${s.firstName}`, { allowDebt: true }); rel(20); ctx.stat('stress', 4); ctx.log(`${s.firstName} lived in your spare room for eight months and got back on their feet. They haven't forgotten.`, '🏠', 'good'); break;
        case 'broke.money': ctx.spend(2000, `Money for ${s.firstName}`, { allowDebt: true }); rel(8); ctx.log(`You sent ${s.firstName} some money. It helped, a bit.`, '💵'); break;
        case 'broke.no': rel(-20); ctx.log(`You didn't help ${s.firstName}. Christmas was quiet that year.`, '🙅', 'warn'); break;
        case 'wedding.speech': practise(state, 'publicSpeaking', 4); if (rng.chance(0.65)) { rel(10); ctx.stat('happiness', 5); ctx.log(`Your speech at ${s.firstName}'s wedding had the whole room crying, then laughing.`, '🎤', 'good'); } else { rel(-2); ctx.log(`Your speech at ${s.firstName}'s wedding went on too long, and you told the story you'd promised not to.`, '😬', 'warn'); } break;
        case 'wedding.short': rel(4); ctx.log(`A short, sweet speech at ${s.firstName}'s wedding. Everyone was grateful.`, '🥂'); break;
        case 'will.give': ctx.spend(Math.min(25000, Math.max(0, Math.round((state.finances.cash ?? 0) * 0.1))), `Settling with ${s.firstName}`, { allowDebt: false }); rel(10); ctx.log(`You let ${s.firstName} have what they wanted. Peace cost something; it was worth it.`, '🤝'); break;
        case 'will.fight': rel(-35); rep(ctx, 'family', -5, 'fighting over the will'); if (rng.chance(0.5)) ctx.earn(rng.int(10, 40) * 1000, 'Your share of the estate'); ctx.log(`You fought ${s.firstName} over the will. The lawyers did well. You and ${s.firstName} don't speak.`, '⚖️', 'bad'); break;
        case 'will.talk': if (rng.chance(0.5 + (state.stats.smarts - 50) / 200)) { rel(12); ctx.log(`You and ${s.firstName} sat at the kitchen table until two in the morning and sorted it out, mostly by talking about your parents.`, '🗣️', 'good'); } else { rel(-15); ctx.log(`The talk turned into the row it was always going to be.`, '💢', 'bad'); } break;
        default: break;
      }
    },
  },
};
