/**
 * Rivals: the few people whose lives you measure your own against.
 *
 *   Origins    the kid at school who beat you at everything; the coworker who wanted your
 *              promotion; whoever your ex ended up with; the company across the street.
 *   Their life  a career that climbs (or doesn't), money, a family, a little fame — advancing
 *              every year beside yours.
 *   Crossings  the same promotion, the same contract, a reunion, their downfall: each a choice.
 *   Grudge     0–100. It cools with time and grows with every crossing. High enough and it
 *              becomes a feud — gossip, sabotage, a lawsuit. Make peace and a rival can become
 *              a friend.
 *
 * state.rivals = [{ id, name, gender, origin, ageOffset, grudge, rung, field, wealth, fame,
 *                   married, kids, alive, friend, history: [] }]
 */
import { Random } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { partnerOf } from './People.js';
import { rep } from '../life/Reputation.js';
import { hasTech } from '../world/Eras.js';

export const MAX_RIVALS = 4;
const ORIGIN = {
  school: { label: 'School rival', icon: '🏫' },
  work: { label: 'Work rival', icon: '💼' },
  ex: { label: 'Your ex\'s new partner', icon: '💔' },
  business: { label: 'Business rival', icon: '🏪' },
};
const FIELDS = {
  corporate: ['Analyst', 'Associate', 'Manager', 'Director', 'Vice President', 'Chief Executive'],
  law: ['Paralegal', 'Associate', 'Senior Associate', 'Partner', 'Managing Partner', 'Judge'],
  medicine: ['Med Student', 'Resident', 'Attending', 'Department Head', 'Chief of Medicine', 'Hospital CEO'],
  media: ['Intern', 'Reporter', 'Anchor', 'Editor', 'Network Star', 'Media Mogul'],
  business: ['Shopkeeper', 'Owner', 'Regional Chain Owner', 'Founder & CEO', 'Tycoon', 'Billionaire'],
  politics: ['Volunteer', 'Councillor', 'Mayor', 'Legislator', 'Minister', 'Head of Government'],
};
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 52711 + state.character.age * 433 + salt) >>> 0);
const pending = (state, type) => state.prompts.some((p) => p.type === type);

export const rivalsOf = (state) => (state.rivals ?? []).filter((r) => r.alive !== false);
export const originLabel = (r) => ORIGIN[r.origin] ?? ORIGIN.school;
export const rivalTitle = (r) => FIELDS[r.field]?.[Math.min(5, r.rung)] ?? 'Unknown';
export const rivalAge = (state, r) => state.character.age + r.ageOffset;
const fieldFor = (state, origin, rng) => (origin === 'business' ? 'business' : origin === 'work' && state.career.job ? (/law|legal|court/i.test(state.career.job.professionId) ? 'law' : /nurs|medic|doctor|physician|clinic/i.test(state.career.job.professionId) ? 'medicine' : 'corporate') : rng.pick(Object.keys(FIELDS)));

function addRival(ctx, origin, extra = {}) {
  const { state } = ctx;
  if (rivalsOf(state).length >= MAX_RIVALS || rivalsOf(state).some((r) => r.origin === origin)) return null;
  const rng = sideRng(state, 0x1d + origin.length);
  const gender = rng.pick(['male', 'female']);
  const n = randomName(rng, gender);
  const r = {
    id: `riv_${origin}_${state.character.age}`, name: `${n.firstName} ${n.lastName}`, gender, origin,
    ageOffset: rng.int(-2, 2), grudge: rng.int(35, 60), rung: Math.max(0, Math.min(2, (state.career.job?.grade ?? 1) - 2)), field: fieldFor(state, origin, rng),
    wealth: Math.round(rng.int(5, 40) * 1000), fame: 0, married: false, kids: 0, alive: true, friend: false, history: [], ...extra,
  };
  (state.rivals ??= []).push(r);
  ctx.log(`${r.name} has become your ${originLabel(r).label.toLowerCase()}.`, originLabel(r).icon, 'info');
  return r;
}

/** Their year: careers climb, money grows, families form. */
function advance(ctx, r, rng) {
  const { state } = ctx;
  const age = rivalAge(state, r);
  if (age < 18) return;
  if (age > 60 && rng.chance((age - 60) / 400)) {
    r.alive = false;
    return ctx.log(`${r.name}, your old ${originLabel(r).label.toLowerCase()}, died at ${age}. You felt more than you expected.`, '🕯️', 'info');
  }
  if (age >= 22 && age <= 62 && r.rung < 5 && rng.chance(0.12 + r.rung * -0.015)) {
    r.rung += 1;
    r.history.push({ age: state.character.age, text: `became ${rivalTitle(r)}` });
    if (r.rung >= 3 && rng.chance(0.5)) ctx.log(`You heard ${r.name} is now ${rivalTitle(r)}.`, originLabel(r).icon, 'muted');
  }
  r.wealth = Math.round(r.wealth * rng.float(1.02, 1.12) + (r.rung + 1) * 12000);
  if (r.rung >= 4) r.fame = clamp(r.fame + rng.int(0, 4));
  if (!r.married && age >= 24 && rng.chance(0.1)) { r.married = true; r.history.push({ age: state.character.age, text: 'married' }); }
  if (r.married && r.kids < 3 && age <= 44 && rng.chance(0.12)) r.kids += 1;
  // Grudges cool with time — unless it's a feud.
  r.grudge = clamp(r.grudge - (r.grudge >= 80 ? 0 : 2));
}

/** One crossing a year at most, chosen by what your lives have in common. */
function crossing(ctx, rng) {
  const { state } = ctx;
  if (pending(state, 'rivals.cross')) return;
  const rivals = rivalsOf(state).filter((r) => !r.friend && rivalAge(state, r) >= 16);
  if (!rivals.length || !rng.chance(0.28)) return;
  const r = rng.pick(rivals);
  const kinds = [];
  if (state.career.job && r.origin === 'work') kinds.push('promotion');
  if (state.business?.current && r.origin === 'business') kinds.push('contract');
  if (state.character.age % 10 === 0 && state.character.age >= 20) kinds.push('reunion');
  if (r.rung >= 2) kinds.push('downfall');
  if (r.grudge >= 80) kinds.push('feud');
  kinds.push('brag');
  const kind = rng.pick(kinds);
  const T = {
    promotion: { title: 'The Same Promotion', text: `You and ${r.name} are both up for the next step at work. Only one of you will get it.`, options: [{ id: 'work', label: '💪 Outwork them', hint: 'Long hours' }, { id: 'sabotage', label: '🗡️ Quietly undermine them', hint: 'Risky', tone: 'danger' }, { id: 'yield', label: '🤝 Let them have it' }] },
    contract: { title: 'Head to Head', text: `${r.name}'s company is bidding against yours for a big contract.`, options: [{ id: 'undercut', label: '💸 Undercut their price' }, { id: 'partner', label: '🤝 Propose a joint bid' }, { id: 'yield', label: '🙄 Let them have it' }] },
    reunion: { title: 'The Reunion', text: `Your ${state.character.age - 18}-year reunion. ${r.name} is there, ${rivalTitle(r).toLowerCase() === 'unknown' ? 'looking well' : `now ${rivalTitle(r)}`}.`, options: [{ id: 'brag', label: '🏆 Make sure they hear how well you\'re doing' }, { id: 'warm', label: '🍷 Bury the hatchet over a drink' }, { id: 'skip', label: '🚪 Leave early' }] },
    downfall: { title: `${r.name} in Trouble`, text: `${r.name} is caught up in a scandal. People are asking you what you know.`, options: [{ id: 'exploit', label: '📰 Tell everyone what you know', tone: 'danger' }, { id: 'help', label: '🫱 Quietly help them through it' }, { id: 'quiet', label: '🤐 Stay out of it' }] },
    feud: { title: 'The Feud', text: `${r.name} has been spreading stories about you.`, options: [{ id: 'sue', label: '⚖️ Sue for defamation', hint: '≈$25,000' }, { id: 'hitback', label: '🗣️ Hit back in kind', tone: 'danger' }, { id: 'peace', label: '🕊️ Offer to make peace' }] },
    brag: { title: 'Keeping Up', text: `${r.name} ${hasTech(state, 'socialMedia') ? 'posted about' : 'won\'t stop talking about'} their ${r.married ? 'family holiday' : hasTech(state, 'automobile') ? 'new car' : 'new carriage'}. It got to you more than it should have.`, options: [{ id: 'match', label: '🛍️ Splurge to keep up', hint: '≈$5,000' }, { id: 'shrug', label: '🧘 Let it go' }] },
  }[kind];
  ctx.prompt({ type: 'rivals.cross', icon: originLabel(r).icon, ...T, data: { id: r.id, kind } });
}

export const RivalsModule = {
  id: 'rivals',
  order: 9.7,

  setup(engine) {
    // A new job, a new rival — sometimes.
    engine.bus.on('career:hired', ({ ctx }) => { if (sideRng(ctx.state, 0x77).chance(0.3)) addRival(ctx, 'work'); });
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    const age = state.character.age;
    const rng = sideRng(state, 0x5e);
    if (age === 13 && rng.chance(0.6)) addRival(ctx, 'school');
    if (state.business?.current && rng.chance(0.15)) addRival(ctx, 'business');
    // Your ex moved on — with someone you can't stand.
    const now = partnerOf(state)?.id ?? null;
    const before = state.rivalsMeta?.partner ?? null;
    if (before && !now && rng.chance(0.4)) addRival(ctx, 'ex', { field: rng.pick(Object.keys(FIELDS)), grudge: 65 });
    (state.rivalsMeta ??= {}).partner = now;
    for (const r of rivalsOf(state)) advance(ctx, r, rng);
    if (age >= 14) crossing(ctx, rng);
  },

  actions: {
    /** arg: rival id — an olive branch. */
    reconcile(ctx, id) {
      const { state } = ctx;
      const r = rivalsOf(state).find((x) => x.id === id);
      if (!r || r.friend) return;
      if ((state.yearly[`rivals.reconcile.${id}`] ?? 0) > 0) return ctx.toast('You already reached out this year.', 'warn');
      state.yearly[`rivals.reconcile.${id}`] = 1;
      const rng = sideRng(state, 0x99);
      if (rng.chance((100 - r.grudge) / 110)) {
        r.friend = true;
        r.grudge = 0;
        ctx.stat('happiness', 5);
        return ctx.log(`You and ${r.name} finally talked it out. Rivals no more — maybe even friends.`, '🕊️', 'good');
      }
      r.grudge = clamp(r.grudge + 5);
      ctx.log(`${r.name} wasn't ready to let it go.`, '🧊', 'warn');
    },
  },

  resolvers: {
    cross(ctx, data, optionId) {
      const { state, rng } = ctx;
      const r = rivalsOf(state).find((x) => x.id === data.id);
      if (!r) return;
      const job = state.career.job;
      const win = (p) => rng.chance(p);
      const say = (text, icon, kind) => { r.history.push({ age: state.character.age, text }); ctx.log(text, icon, kind); };
      switch (optionId) {
        case 'work':
          ctx.stat('stress', 6);
          if (win(0.55)) { if (job) job.performance = Math.min(100, (job.performance ?? 50) + 10); r.grudge = clamp(r.grudge + 10); rep(ctx, 'work', 4); return say(`You beat ${r.name} to it. They haven't forgiven you.`, '🏆', 'good'); }
          r.rung = Math.min(5, r.rung + 1);
          return say(`${r.name} got the promotion.`, '😤', 'warn');
        case 'sabotage':
          if (win(0.6)) { r.grudge = clamp(r.grudge + 15); if (job) job.performance = Math.min(100, (job.performance ?? 50) + 6); return say(`Your quiet campaign against ${r.name} worked. You got the nod.`, '🗡️', 'warn'); }
          rep(ctx, 'work', -12, `Caught undermining ${r.name}`);
          r.grudge = clamp(r.grudge + 25);
          return say(`Word got out that you'd been undermining ${r.name}. It cost you.`, '🗡️', 'bad');
        case 'undercut':
          if (state.business?.current) state.business.current.cash -= 15000;
          r.grudge = clamp(r.grudge + 10);
          return say(`You won the contract from ${r.name} — at a thin margin.`, '💸', 'good');
        case 'partner':
          if (win(Math.max(0.15, (100 - r.grudge) / 100))) { r.grudge = clamp(r.grudge - 25); if (state.business?.current) state.business.current.cash += 20000; return say(`You and ${r.name} bid together and won. Strange bedfellows.`, '🤝', 'good'); }
          return say(`${r.name} laughed at the idea of a joint bid, and won it alone.`, '🙄', 'warn');
        case 'brag':
          r.grudge = clamp(r.grudge + 8);
          ctx.stat('happiness', 3);
          return say(`You made sure ${r.name} heard how well you're doing.`, '🏆', 'info');
        case 'warm':
        case 'peace':
        case 'help':
          r.grudge = clamp(r.grudge - (optionId === 'help' ? 40 : 25));
          if (r.grudge <= 15) { r.friend = true; ctx.stat('happiness', 5); return say(`You and ${r.name} made peace. Who would have thought.`, '🕊️', 'good'); }
          if (optionId === 'help') rep(ctx, 'neighbourhood', 3);
          return say(optionId === 'help' ? `You quietly helped ${r.name} through it.` : `You and ${r.name} were almost civil.`, '🫱', 'good');
        case 'exploit':
          r.rung = Math.max(0, r.rung - 1);
          r.grudge = clamp(r.grudge + 30);
          rep(ctx, 'online', -3);
          return say(`What you told people finished ${r.name}'s career, for now.`, '📰', 'warn');
        case 'sue':
          ctx.spend(25000, 'Defamation suit', { allowDebt: true });
          if (win(0.5)) { ctx.earn(40000, 'Defamation damages'); rep(ctx, 'neighbourhood', 5); return say(`You sued ${r.name} for defamation and won.`, '⚖️', 'good'); }
          return say(`Your defamation suit against ${r.name} failed.`, '⚖️', 'bad');
        case 'hitback':
          r.grudge = clamp(r.grudge + 10);
          rep(ctx, 'neighbourhood', -6, `A public feud with ${r.name}`);
          return say(`You and ${r.name} traded insults in public. Nobody came out well.`, '🗣️', 'bad');
        case 'match':
          ctx.spend(5000, 'Keeping up with a rival', { credit: true });
          ctx.stat('happiness', 2);
          return say(`You spent to keep up with ${r.name}.`, '🛍️', 'info');
        default:
          ctx.stat('happiness', 1);
          return say(`You let ${r.name} be.`, '🧘', 'muted');
      }
    },
  },
};
