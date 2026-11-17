/**
 * People who remember: the family and friends carry what you did, and bring it up years later.
 *
 *   Good  your graduation photo on your mother's mantelpiece, your speech at your brother's
 *         wedding, the years you minded the grandchildren, your war service told to their kids.
 *   Bad   the years you were inside, the scandal they read about at work, the divorce the
 *         children lived through, the loan you refused, the night you didn't answer, being cut
 *         out of the will, the graduation you missed.
 *
 * Each is a memory on the person (p.memories, shared with Bonds.js and Conversations.js):
 *   { age, text, tone: 'good' | 'bad', kind, raised?, forgiven? }
 * Once a year or so someone brings one up: a fond word (a little closer), or an old wound (a
 * prompt: say sorry, explain, or "not this again"). A wound you apologise for may be forgiven.
 */
import { Random, clamp } from '../../core/Random.js';
import { living, ageOf, byId, clampRel } from './People.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 7717) ^ (state.character.age * 613 + 0x5e1)) >>> 0);
const MAX = 8;
const FAMILY = ['mother', 'father', 'sibling', 'child', 'spouse'];

/** Add a memory to one person (keeps the last MAX, but never drops an unforgiven wound for a fond one). */
export function rememberOn(state, p, kind, tone, text) {
  if (!p) return;
  const list = [...(p.memories ?? []), { age: state.character.age, text, tone, kind }];
  while (list.length > MAX) {
    const i = list.findIndex((m) => m.tone !== 'bad' || m.forgiven);
    list.splice(i >= 0 ? i : 0, 1);
  }
  p.memories = list;
}
/** The family who'd notice (old enough to remember it). */
export const familyWhoSee = (state, relations = FAMILY) => living(state).filter((p) => relations.includes(p.relation) && ageOf(state, p) >= 6);
/** Add a memory to everyone in the family who saw it. */
export function rememberFamily(state, kind, tone, text, relations) {
  for (const p of familyWhoSee(state, relations)) rememberOn(state, p, kind, tone, text);
}

/** What they say, by kind: [fond or wounded line] (P is their first name). */
const LINES = {
  prison: (P) => `${P} brought up the years you were inside. "Do you know what that did to us?"`,
  convicted: (P) => `${P} brought up your conviction at a family dinner. The table went quiet.`,
  scandal: (P) => `${P} brought up the scandal. "I had to hear about it from people at work."`,
  divorce: (P) => `${P} brought up the divorce. "Nobody ever asked how we felt about it."`,
  cutOut: (P) => `${P} brought up the will. "You made it very clear what I was worth to you."`,
  favoured: (P) => `${P} brought up the will. "We all know who your favourite is."`,
  missed: (P) => `${P} brought up the day you didn't come. "There was an empty chair with your name on it."`,
  refused: (P) => `${P} brought up the time they asked you for help. "When I needed you, you said no."`,
  noShow: (P) => `${P} brought up the night you didn't pick up. "I needed you that night."`,
  moved: (P) => `${P} brought up when you moved away. "The phone hardly rang after that."`,
  graduated: (P) => `${P} still has your graduation photo on the mantelpiece, and points it out to every visitor.`,
  married: (P) => `${P} brought up your wedding again: the speeches, the weather, the uncle who danced.`,
  served: (P) => `${P} told their own children about your service. You heard them get the details wrong, proudly.`,
  childcare: (P) => `${P} brought up the years you minded the children. "I couldn't have gone back to work without you."`,
  business: (P) => `${P} told someone at a party that you built a business from nothing. They said it like it was theirs to boast about.`,
};

function bringUp(ctx, rng) {
  const { state } = ctx;
  const age = state.character.age;
  const cands = living(state).flatMap((p) => (p.memories ?? []).map((m, i) => ({ p, m, i })))
    .filter(({ p, m }) => age - m.age >= 3 && !m.forgiven && (m.raised == null || age - m.raised >= 5) && ageOf(state, p) >= 12);
  if (!cands.length) return;
  // Grudges come up more between people who don't get on; fond memories between those who do.
  const pick = rng.weighted(cands, ({ p, m }) => (m.tone === 'bad' ? 1 + (100 - (p.relationship ?? 60)) / 25 : 1 + (p.relationship ?? 60) / 50));
  if (!pick) return;
  const { p, m, i } = pick;
  m.raised = age;
  const line = (LINES[m.kind] ?? null)?.(p.firstName);
  if (m.tone !== 'bad') {
    p.relationship = clampRel(p.relationship + 3);
    ctx.stat('happiness', 2);
    return ctx.log(line ?? `${p.firstName} brought up something from years ago: "${m.text}"`, '📸', 'good');
  }
  ctx.prompt({
    type: 'grudges.raised', icon: '🗯️', title: `${p.firstName} Remembers`,
    text: `${line ?? `${p.firstName} brought up something from years ago: ${m.text}`} (That was ${age - m.age} years ago.)`,
    options: [
      { id: 'sorry', label: '🙏 Say you\'re sorry', hint: 'Properly, this time' },
      { id: 'explain', label: '🗣️ Explain what happened', hint: 'Your side of it' },
      { id: 'enough', label: '🙄 "Not this again"', hint: 'It was years ago' },
    ],
    data: { personId: p.id, index: i },
  });
}

export const GrudgesModule = {
  id: 'grudges',
  order: 34.6,
  setup(engine) {
    const on = (ev, fn) => engine.bus.on(ev, (payload) => { if (payload?.ctx) fn(payload.ctx.state, payload); });
    on('legal:incarcerated', (state, { years, juvenile }) => rememberFamily(state, 'prison', 'bad', `You went to ${juvenile ? 'juvenile detention' : 'prison'}${years ? ` for ${years} year${years === 1 ? '' : 's'}` : ''}.`));
    on('legal:convicted', (state, { severity, name }) => { if (severity === 'felony') rememberFamily(state, 'convicted', 'bad', `You were convicted of ${String(name ?? 'a crime').toLowerCase()}.`); });
    on('fame:scandal', (state, { severity, headline }) => { if ((severity ?? 0) >= 7) rememberFamily(state, 'scandal', 'bad', `The papers were full of ${headline ?? 'your scandal'}.`, ['mother', 'father', 'sibling', 'child']); });
    on('education:graduated', (state, { degree }) => { if (degree && degree.type !== 'highschool') rememberFamily(state, 'graduated', 'good', 'You graduated.', ['mother', 'father']); });
    on('people:married', (state) => rememberFamily(state, 'married', 'good', 'Your wedding day.', ['mother', 'father', 'sibling']));
    on('military:discharged', (state, payload) => { if (!/dishonou?rable|bad/i.test(String(payload?.type ?? ''))) rememberFamily(state, 'served', 'good', 'You served your country.', ['child']); });
    on('business:sold', (state) => rememberFamily(state, 'business', 'good', 'You built a business and sold it.', ['mother', 'father', 'child', 'sibling']));
    on('region:relocate', (state) => { if (state.character.age >= 18 && state.character.age <= 50) rememberFamily(state, 'moved', 'bad', 'You moved far away.', ['mother']); });
  },
  onAgeUp(ctx) {
    const rng = sideRng(ctx.state);
    if (ctx.state.character.age >= 16 && rng.chance(0.3)) bringUp(ctx, rng);
  },
  resolvers: {
    raised(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = byId(state, data.personId);
      const m = p?.memories?.[data.index];
      if (!p || !m) return;
      if (optionId === 'sorry') {
        if (rng.chance(clamp(0.35 + (p.relationship ?? 50) / 200, 0.3, 0.85))) {
          m.forgiven = true;
          p.relationship = clampRel(p.relationship + 10);
          return ctx.log(`${p.firstName} was quiet for a long time. Then: "Thank you for saying it." It was over.`, '🙏', 'good');
        }
        p.relationship = clampRel(p.relationship + 3);
        return ctx.log(`${p.firstName} heard you out. "It doesn't change what happened." But something eased.`, '🙏', 'info');
      }
      if (optionId === 'explain') {
        if (rng.chance(0.5)) { p.relationship = clampRel(p.relationship + 2); return ctx.log(`${p.firstName} hadn't known your side of it. They listened.`, '🗣️', 'info'); }
        p.relationship = clampRel(p.relationship - 4);
        return ctx.log(`${p.firstName} heard excuses. "You always have a reason."`, '🗣️', 'warn');
      }
      p.relationship = clampRel(p.relationship - 8);
      ctx.log(`"Not this again." ${p.firstName} got up and left the room.`, '🙄', 'bad');
    },
  },
};
