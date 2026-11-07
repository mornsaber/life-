/**
 * Random life events — the things that happen between the big decisions:
 * childhood dilemmas, campus moments, lottery tickets, lawsuits, accidents,
 * viral fame, windfalls and scams. Pure content: every effect goes through
 * existing systems (money, stats, legal offenses, health injuries, credit).
 *
 * An event either happens (`run`) or asks (`options`, each with `resolve`).
 * Events are picked with pickFresh, so a long life rarely sees repeats.
 */
import { pickFresh, eligible } from '../../core/Pools.js';
import { priceLevel } from '../world/Countries.js';
import { downPaymentAssistance } from './MoreLifeEvents.js';
import { PACK_EVENTS, PACK_FOLLOW_UPS } from '../content/index.js';


/** An event's icon: its own, or the emoji its first choice starts with. */
const iconOf = (e) => e.icon ?? e.options?.[0]?.label.match(/^\p{Extended_Pictographic}\uFE0F?/u)?.[0] ?? '🎲';

/** Every event that can come up at random (follow-ups only come when planted). */
export const LIFE_EVENTS = PACK_EVENTS;
const byId = (id) => LIFE_EVENTS.find((e) => e.id === id) ?? PACK_FOLLOW_UPS[id];

/** How often something happens: kids and young adults have eventful years. */
const yearlyChance = (age) => (age < 6 ? 0 : age < 18 ? 0.35 : age < 30 ? 0.4 : age < 65 ? 0.3 : 0.25);

/**
 * Life events are written in US prices. Abroad, scale what they cost and pay (and the
 * dollar figures in their text) to local price levels.
 */
function local(ctx) {
  const k = priceLevel(ctx.state);
  if (k === 1) return { c: ctx, text: (t) => t };
  const c = Object.create(ctx);
  c.spend = (amount, ...rest) => ctx.spend(Math.round(amount * k), ...rest);
  c.earn = (amount, ...rest) => ctx.earn(Math.round(amount * k), ...rest);
  // Other modules price their own consequences.
  c.emit = (event, payload) => ctx.emit(event, payload);
  const round = (n) => (n < 1000 ? Math.round(n / 10) * 10 : n < 10000 ? Math.round(n / 100) * 100 : Math.round(n / 1000) * 1000);
  const text = (t) => (typeof t === 'string' ? t.replace(/\$([\d,]+)/g, (m, d) => `$${round(Number(d.replace(/,/g, '')) * k).toLocaleString('en-US')}`) : t);
  return { c, text };
}

export const LifeEvents = {
  id: 'lifeEvents',
  order: 7,

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    downPaymentAssistance(ctx);
    // A choice from years ago comes back.
    const due = (state.eventSeeds ?? []).find((s) => s.dueAge <= state.character.age);
    let event = null;
    if (due) {
      state.eventSeeds = state.eventSeeds.filter((s) => s !== due);
      event = PACK_FOLLOW_UPS[due.id] ?? null;
    }
    if (!event) {
      if (!rng.chance(yearlyChance(state.character.age))) return;
      event = pickFresh(rng, state, 'life', eligible(LIFE_EVENTS, state));
    }
    if (!event) return;
    if (event.run) {
      const { c, text: localText } = local(ctx);
      const [icon, rawText, kind] = event.run(c);
      const text = localText(rawText);
      if (text) ctx.log(text, icon, kind);
      return;
    }
    ctx.prompt({
      type: 'lifeEvents.event',
      icon: iconOf(event),
      title: event.title,
      text: local(ctx).text(Array.isArray(event.text) ? rng.pick(event.text) : event.text),
      options: event.options.map((o) => ({ id: o.id, label: local(ctx).text(o.label), tone: o.tone })),
      data: { eventId: event.id },
    });
  },

  resolvers: {
    event(ctx, data, optionId) {
      const event = byId(data.eventId);
      const option = event?.options.find((o) => o.id === optionId);
      if (!option) return;
      const { c, text: localText } = local(ctx);
      const text = localText(option.resolve(c));
      if (text) ctx.log(`${event.title}: ${text}`, iconOf(event));
    },
  },
};
