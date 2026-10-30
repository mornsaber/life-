/**
 * Raising children: the decisions, year after year.
 *
 *   Style        how you parent (warm and firm, strict, easy-going, gentle). It shapes how close
 *                you stay, how well they cope, and how a teenager hears "no".
 *   School       at five: the local state school, a private school, a faith school, or
 *                homeschooling. Fees are yearly; what they get from it builds their smarts.
 *   Lessons      sport, music, tutoring: money and evenings, and real progress.
 *   Wellbeing    0–100 for each child. Low wellbeing shows up as anxiety or depression — and
 *                in the teenage years, as trouble: drinking, a suspension, a call from the police.
 *   Eighteen     what they turned out like is written down.
 *
 * child.parenting = { school, lessons: [], wellbeing, therapy }   state.parentingStyle = { id, since }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { minorChildren, livingChildren, ageOf, byId } from './People.js';
import { ensureTraits } from './Dynasty.js';
import { priceLevel } from '../world/Countries.js';

export const STYLES = {
  authoritative: { label: '🤝 Warm and firm', desc: 'Clear rules, explained; lots of warmth.', wellbeing: 3, rel: 2, trouble: 0.7 },
  strict: { label: '📏 Strict', desc: 'Rules are rules.', wellbeing: -1, rel: -2, trouble: 0.9, smarts: 1 },
  permissive: { label: '🛋️ Easy-going', desc: 'Friend first, parent second.', wellbeing: 1, rel: 3, trouble: 1.4 },
  gentle: { label: '🌱 Gentle', desc: 'Feelings first; consequences talked through.', wellbeing: 4, rel: 3, trouble: 1 },
};

export const SCHOOLS = {
  public: { label: '🏫 The local state school', fee: 0, smarts: 1 },
  private: { label: '🎩 A private school', fee: 18000, smarts: 3, wellbeing: 1 },
  faith: { label: '⛪ A faith school', fee: 4000, smarts: 2 },
  home: { label: '🏡 Homeschool them', fee: 1500, smarts: 2, wellbeing: -1, rel: 2, load: true },
};

export const LESSONS = {
  sport: { label: '⚽ Sport', fee: 1200, trait: 'athletics', gain: [2, 5], wellbeing: 2 },
  music: { label: '🎻 Music lessons', fee: 1800, trait: 'smarts', gain: [1, 3], wellbeing: 2 },
  tutoring: { label: '📐 Tutoring', fee: 2500, trait: 'smarts', gain: [2, 5], wellbeing: -1 },
};

const local = (state, n) => Math.round(n * priceLevel(state));
const mine = (state) => minorChildren(state).filter((c) => c.custody !== 'ex');
const pOf = (c) => (c.parenting ??= { school: null, lessons: [], wellbeing: 65 });
export const parentingStyle = (state) => STYLES[state.parentingStyle?.id] ?? null;
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 40503 + state.character.age * 211 + 0x9a7) >>> 0);

export function parentingTick(main) {
  const { state } = main;
  const kids = mine(state);
  if (!kids.length) return;
  const ctx = { ...main, rng: sideRng(state) };
  const { rng } = ctx;
  const style = parentingStyle(state) ?? STYLES.authoritative;
  let fees = 0;
  for (const c of kids) {
    const age = ageOf(state, c);
    const p = pOf(c);
    const t = ensureTraits(rng, state, c);
    if (age === 5 && !p.school) schoolPrompt(ctx, c);
    const school = SCHOOLS[p.school];
    if (school && age >= 5) {
      fees += local(state, school.fee);
      t.smarts = Math.round(clamp(t.smarts + (school.smarts ?? 0) * rng.float(0.4, 1) + (style.smarts ?? 0) * 0.5, 0, 100));
      if (school.load) ctx.stat('stress', 3);
    }
    for (const id of p.lessons) {
      const l = LESSONS[id];
      fees += local(state, l.fee);
      t[l.trait] = Math.round(clamp((t[l.trait] ?? 50) + rng.int(...l.gain), 0, 100));
      p.wellbeing += l.wellbeing;
    }
    p.wellbeing = Math.round(clamp(p.wellbeing + style.wellbeing + (school?.wellbeing ?? 0) + rng.int(-6, 5) - (p.lessons.length >= 3 ? 4 : 0) + (p.therapy ? 6 : 0), 0, 100));
    c.relationship = Math.round(clamp(c.relationship + style.rel * 0.5 + (school?.rel ?? 0), 0, 100));
    if (p.therapy) { fees += local(state, 2400); if (p.wellbeing >= 60) { p.therapy = false; main.log(`${c.firstName} finished therapy, doing much better.`, '🌤️', 'good'); } }
    if (age >= 8 && p.wellbeing < 40 && !p.therapy && rng.chance(0.5)) mindPrompt(ctx, c);
    else if (age >= 13 && rng.chance(clamp((0.12 + (60 - p.wellbeing) / 200) * style.trouble, 0.04, 0.5))) troublePrompt(ctx, c, style);
    if (age === 17) { p.outcome = p.wellbeing >= 65 ? 'thriving' : p.wellbeing < 38 ? 'troubled' : 'ok'; }
    if (age === 17) main.log(`${c.firstName} is nearly grown: ${p.wellbeing >= 70 ? 'confident and kind' : p.wellbeing >= 45 ? 'finding their way' : 'struggling, but still talking to you'}, ${t.smarts >= 70 ? 'top of the class' : t.smarts >= 50 ? 'doing fine at school' : 'never one for school'}.`, '🎓', 'info');
  }
  if (fees) main.spend(fees, 'School fees, lessons and therapy for the children', { allowDebt: true });
}

function schoolPrompt(ctx, c) {
  ctx.prompt({ type: 'parenting.schoolChoice', icon: '🎒', title: `${c.firstName} Starts School`, text: `${c.firstName} is five. Where will they go?`, data: { childId: c.id }, options: Object.entries(SCHOOLS).map(([id, s]) => ({ id, label: s.label, hint: s.fee ? `$${local(ctx.state, s.fee).toLocaleString()}/yr` : 'Free' })) });
}

function mindPrompt(ctx, c) {
  ctx.prompt({ type: 'parenting.mind', icon: '🌧️', title: `${c.firstName} Isn't Okay`, text: `${c.firstName} has stopped sleeping, stopped seeing friends, and cries over small things. The school counsellor called.`, data: { childId: c.id }, options: [
    { id: 'therapy', label: '🧠 Find a child therapist', hint: `$${local(ctx.state, 2400).toLocaleString()}/yr, waiting lists` },
    { id: 'time', label: '🫶 Clear your diary and spend time with them', hint: 'Stress for you' },
    { id: 'wait', label: '⏳ It\'s a phase', hint: 'Sometimes it is' },
  ] });
}

const TROUBLE = [
  { id: 'drinking', text: (n) => `${n} came home drunk at 2 a.m. and was sick in the hall.` },
  { id: 'suspended', text: (n) => `${n} was suspended for fighting.` },
  { id: 'police', text: (n) => `The police brought ${n} home after a group of teenagers was caught shoplifting.` },
  { id: 'vaping', text: (n) => `You found vapes — and something stronger — in ${n}'s bag.` },
  { id: 'online', text: (n) => `${n} has been talking to someone online, much older, who asked for photos.` },
];

function troublePrompt(ctx, c, style) {
  const e = ctx.rng.pick(TROUBLE);
  ctx.prompt({ type: 'parenting.trouble', icon: '🚨', title: 'Teenage Trouble', text: `${e.text(c.firstName)}\nYour style: ${style.label}.`, data: { childId: c.id, kind: e.id }, options: [
    { id: 'talk', label: '🗣️ Sit down and talk it through' },
    { id: 'ground', label: '🔒 Grounded. Phone confiscated.' },
    { id: 'professional', label: e.id === 'online' ? '🚓 Report it to the police and the platform' : '🧑‍⚕️ Get them help (counsellor, youth worker)' },
    { id: 'let', label: '🤷 Let it go — you were young once' },
  ] });
}

/** Grown children: how you raised them shows up for the rest of your life. */
export function adultChildrenTick(main) {
  const { state } = main;
  const rng = new Random(((state.world?.seed ?? 1) * 86243 + state.character.age * 307 + 0xad7) >>> 0);
  for (const c of livingChildren(state).filter((k) => ageOf(state, k) >= 18 && k.parenting?.outcome)) {
    const out = c.parenting.outcome;
    const age = ageOf(state, c);
    // Closeness drifts toward how they were raised.
    c.relationship = Math.round(clamp(c.relationship + (out === 'thriving' ? 1 : out === 'troubled' ? -1 : 0), 0, 100));
    if (out === 'thriving' && c.relationship >= 60 && rng.chance(state.character.age >= 65 ? 0.4 : 0.15)) {
      main.stat('happiness', 3);
      main.log(rng.pick([`${c.firstName} came for Sunday lunch, as they do most weeks.`, `${c.firstName} rang just to talk.`, `${c.firstName} took you away for a weekend.`]), '🫶', 'good');
      if (state.character.age >= 70 && state.finances.cash < 5000 && rng.chance(0.5)) { const gift = Math.round(rng.int(2000, 8000) * priceLevel(state)); main.earn(gift, `Help from ${c.firstName}`); main.log(`${c.firstName} quietly paid some of your bills.`, '💝', 'good'); }
    }
    if (out === 'troubled' && age <= 40 && !state.prompts.some((x) => x.type === 'parenting.grownTrouble') && rng.chance(0.18)) {
      const kind = rng.pick(['money', 'arrest', 'addiction']);
      const text = { money: `${c.firstName} needs money again — rent, they say, or a debt to someone you'd rather not meet.`, arrest: `${c.firstName} rang from a police station at 3 a.m.`, addiction: `${c.firstName} is using again. Their partner called you, crying.` }[kind];
      main.prompt({ type: 'parenting.grownTrouble', icon: '📞', title: `${c.firstName}, Again`, text, data: { childId: c.id, kind }, options: [
        { id: 'help', label: kind === 'arrest' ? '⚖️ Pay for a lawyer' : kind === 'addiction' ? '🏥 Pay for rehab' : '💵 Send the money', hint: `$${Math.round({ money: 2000, arrest: 5000, addiction: 12000 }[kind] * priceLevel(state)).toLocaleString()}` },
        { id: 'tough', label: '🧱 Tough love: no money, but you\'re there if they want help' },
        { id: 'cut', label: '🚪 Cut contact', hint: 'For your own sake' },
      ] });
    }
  }
}

export const ParentingResolvers = {
  grownTrouble(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = byId(state, data.childId);
    if (!c) return;
    if (optionId === 'help') {
      ctx.spend(Math.round({ money: 2000, arrest: 5000, addiction: 12000 }[data.kind] * priceLevel(state)), `Helping ${c.firstName}`, { allowDebt: true });
      c.relationship = clamp(c.relationship + 6, 0, 100);
      if (data.kind === 'addiction' && rng.chance(0.4)) { c.parenting.outcome = 'ok'; return ctx.log(`Rehab worked this time. ${c.firstName} has been clean for a year.`, '🌱', 'good'); }
      return ctx.log(`You helped ${c.firstName}. Again.`, '💵', 'info');
    }
    if (optionId === 'tough') { ctx.stat('stress', 5); if (rng.chance(0.25)) { c.parenting.outcome = 'ok'; return ctx.log(`${c.firstName} was furious — and then, a year later, got help on their own.`, '🌱', 'good'); } return ctx.log(`You held the line with ${c.firstName}. It was the hardest thing you've done.`, '🧱', 'info'); }
    c.relationship = Math.min(c.relationship, 10);
    ctx.stat('stress', -4);
    ctx.log(`You stopped answering ${c.firstName}'s calls.`, '🚪', 'warn');
  },
  schoolChoice(ctx, data, optionId) {
    const c = byId(ctx.state, data.childId);
    if (!c || !SCHOOLS[optionId]) return;
    pOf(c).school = optionId;
    ctx.log(`${c.firstName} started at ${SCHOOLS[optionId].label.replace(/^\S+\s/, '').replace(/^A /, 'a ').replace(/^The /, 'the ')}.`, '🎒', 'milestone');
  },
  mind(ctx, data, optionId) {
    const c = byId(ctx.state, data.childId);
    if (!c) return;
    const p = pOf(c);
    if (optionId === 'therapy') { p.therapy = true; return ctx.log(`${c.firstName} started seeing a therapist every week.`, '🧠', 'info'); }
    if (optionId === 'time') { p.wellbeing = Math.min(100, p.wellbeing + 12); c.relationship = Math.min(100, c.relationship + 6); ctx.stat('stress', 6); return ctx.log(`You took ${c.firstName} camping, then to every football match. Slowly they started talking.`, '🫶', 'good'); }
    p.wellbeing = Math.max(0, p.wellbeing - 5);
    ctx.log(`You hoped it was a phase. ${c.firstName} went quieter.`, '⏳', 'warn');
  },
  trouble(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = byId(state, data.childId);
    if (!c) return;
    const p = pOf(c);
    const style = state.parentingStyle?.id ?? 'authoritative';
    const fit = { talk: ['authoritative', 'gentle', 'permissive'], ground: ['strict', 'authoritative'], professional: ['authoritative', 'gentle', 'strict'], let: ['permissive'] }[optionId] ?? [];
    const works = rng.chance((fit.includes(style) ? 0.7 : 0.45) + (data.kind === 'online' && optionId === 'professional' ? 0.25 : 0));
    p.wellbeing = Math.round(clamp(p.wellbeing + (works ? 6 : -4), 0, 100));
    c.relationship = Math.round(clamp(c.relationship + (optionId === 'ground' ? -5 : optionId === 'let' ? 2 : 3) + (works ? 3 : -3), 0, 100));
    if (optionId === 'professional') ctx.spend(local(state, 500), 'Youth counselling', { allowDebt: true });
    if (optionId === 'let' && ['police', 'online'].includes(data.kind) && rng.chance(0.5)) { c.youthRecord = true; return ctx.log(`You let it go. It happened again, and ${c.firstName} ended up in youth court.`, '⚖️', 'bad'); }
    ctx.log(works ? `It worked: ${c.firstName} ${rng.pick(['apologised, unprompted, a week later', 'hasn\'t done it again', 'told you more than they meant to'])}.` : `${c.firstName} slammed the door. It didn't land.`, works ? '🫶' : '🚪', works ? 'good' : 'warn');
  },
};

export const ParentingActions = {
  style(ctx, id) {
    const { state } = ctx;
    if (!STYLES[id]) return;
    if (state.parentingStyle && state.character.age - state.parentingStyle.since < 3) return ctx.toast('Give your approach a few years first', 'warn');
    state.parentingStyle = { id, since: state.character.age };
    ctx.log(`You settled on a parenting approach: ${STYLES[id].label.replace(/^\S+\s/, '').toLowerCase()}.`, '👪', 'info');
  },
  /** Arg: `${childId}:${schoolId}` — a move after the first choice. */
  school(ctx, arg) {
    const [cid, sid] = String(arg ?? '').split(':');
    const c = byId(ctx.state, cid);
    if (!c || !SCHOOLS[sid] || ageOf(ctx.state, c) < 5) return;
    if (yearlyCount(ctx.state, `parenting.school.${cid}`)) return ctx.toast('One change a year', 'warn');
    bumpYearly(ctx.state, `parenting.school.${cid}`);
    const p = pOf(c);
    if (p.school && p.school !== sid) p.wellbeing = Math.max(0, p.wellbeing - 6);
    ParentingResolvers.schoolChoice(ctx, { childId: cid }, sid);
  },
  /** Arg: `${childId}:${lessonId}` toggles it. */
  lessons(ctx, arg) {
    const [cid, lid] = String(arg ?? '').split(':');
    const c = byId(ctx.state, cid);
    if (!c || !LESSONS[lid] || ageOf(ctx.state, c) < 4) return;
    const p = pOf(c);
    p.lessons = p.lessons.includes(lid) ? p.lessons.filter((x) => x !== lid) : [...p.lessons, lid];
  },
  therapy(ctx, cid) {
    const c = byId(ctx.state, cid);
    if (!c) return;
    pOf(c).therapy = true;
    ctx.log(`${c.firstName} started seeing a therapist.`, '🧠', 'info');
  },
};

export const ParentingModule = {
  id: 'parenting',
  order: 9.6,
  onAgeUp(ctx) { parentingTick(ctx); adultChildrenTick(ctx); },
  actions: ParentingActions,
  resolvers: ParentingResolvers,
};

export const parentingOf = (c) => c.parenting ?? { school: null, lessons: [], wellbeing: 65 };
export const myMinorChildren = mine;
