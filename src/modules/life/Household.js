/**
 * The household economy: where the year's living money went, what was on the table, and what a
 * family did in a hard year.
 *
 *   The budget   the year's living spending (Finances.js) split as a household of its day spent
 *                it: in 1850 a working family spent over half on food and much of the rest on
 *                fuel, light and clothes; by 2000 food was an eighth. Richer households spend a
 *                smaller share on food (Engel's law); poorer countries a bigger one. Servants'
 *                wages come from the Property module.
 *   The table    what you ate, from the food money per head: bread, tea and potatoes; meat on
 *                Sundays; a good table; a cook and a dinner party. Before modern nutrition a
 *                poor diet costs health, worst for children.
 *   Hard years   when money runs out (the bare minimum and nothing over), a family of its day
 *                pawned the good coat, took in a lodger, sent the eldest out to work, cut back
 *                on food, asked the parish for relief or went to the moneylender.
 *
 * state.household = { year, total, lines: { food, fuel, clothes, drink, other, staff }, table, perHead, hard }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { countryWageFactor, eraScale } from '../economy/EraEconomy.js';
import { ageOf } from '../people/People.js';
import { staffWages } from './Property.js';

/** The shares of a middling household's spending (outside rent) by year: food, fuel & light, clothes, drink & tobacco. */
const SHARES = [
  [1800, { food: 0.62, fuel: 0.1, clothes: 0.12, drink: 0.08 }],
  [1850, { food: 0.58, fuel: 0.09, clothes: 0.12, drink: 0.08 }],
  [1900, { food: 0.5, fuel: 0.08, clothes: 0.12, drink: 0.07 }],
  [1930, { food: 0.42, fuel: 0.07, clothes: 0.11, drink: 0.06 }],
  [1950, { food: 0.36, fuel: 0.06, clothes: 0.1, drink: 0.06 }],
  [1975, { food: 0.24, fuel: 0.06, clothes: 0.08, drink: 0.05 }],
  [2000, { food: 0.15, fuel: 0.05, clothes: 0.05, drink: 0.04 }],
  [2030, { food: 0.12, fuel: 0.05, clothes: 0.04, drink: 0.03 }],
];
export function sharesAt(y) {
  let i = SHARES.findIndex(([yr]) => yr > y);
  if (i === -1) return { ...SHARES.at(-1)[1] };
  if (i === 0) return { ...SHARES[0][1] };
  const [y0, a] = SHARES[i - 1];
  const [y1, b] = SHARES[i];
  const t = (y - y0) / (y1 - y0);
  return Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * t]));
}

/** The table, by food money per head against the bare minimum. */
export const TABLES = [
  { at: 0, id: 'bare', label: (y) => (y < 1900 ? 'Bread, tea and potatoes; meat rarely' : y < 1960 ? 'Bread and dripping, and not always enough' : 'Cheap food, and skipped meals'), health: -2 },
  { at: 1.2, id: 'plain', label: (y) => (y < 1920 ? 'Plain food, and meat on Sundays' : 'Plain food, enough of it'), health: 0 },
  { at: 2.2, id: 'good', label: (y) => (y < 1920 ? 'A good table: meat most days, puddings, fruit in season' : 'A good table'), health: 1 },
  { at: 5, id: 'rich', label: (y) => (y < 1940 ? 'A cook, several courses and dinner parties' : 'Fine dining, and dinner parties'), health: 0 },
];
const tableOf = (ratio) => TABLES.reduce((t, x) => (ratio >= x.at ? x : t), TABLES[0]);

const kidsAtHome = (state) => (state.people?.list ?? []).filter((p) => p.alive && p.relation === 'child' && ageOf(state, p) >= 0 && ageOf(state, p) < 16 && !p.livesIn);
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 9719 + state.character.age * 4447 + salt) >>> 0);

export function householdTick(ctx) {
  const { state } = ctx;
  const f = state.finances;
  const living = f.lastYear?.living ?? 0;
  if (state.character.age < 18 || !living) return;
  const y = yearNow(state);
  const married = Boolean(f.lastYear?.married);
  const heads = 1 + (married ? 1 : 0) + kidsAtHome(state).length * 0.6;
  const s = sharesAt(y);
  // Engel: poorer places spend more of it on food, the rich less.
  const poor = Math.max(0.6, Math.min(1.6, 1 / Math.max(0.3, countryWageFactor(state)) ** 0.25));
  // The bare minimum for a household this size, as Finances.js reckons it.
  const floor = 6000 * eraScale(state, 'living') * countryWageFactor(state) ** 0.7 * heads;
  const richness = living / Math.max(1, floor);
  const foodShare = Math.min(0.75, s.food * poor * (richness > 3 ? 0.7 : richness > 1.5 ? 0.9 : 1.05));
  const lines = {
    food: Math.round(living * foodShare),
    fuel: Math.round(living * s.fuel),
    clothes: Math.round(living * s.clothes),
    drink: Math.round(living * s.drink),
  };
  lines.other = Math.max(0, living - lines.food - lines.fuel - lines.clothes - lines.drink);
  const staff = staffWages(state);
  if (staff) lines.staff = staff;
  const perHead = lines.food / heads;
  const table = tableOf(richness);
  const hh = (state.household ??= {});
  Object.assign(hh, { year: y, total: living + staff, lines, perHead: Math.round(perHead), table: table.id, heads: Math.round(heads * 10) / 10 });
  // Before vitamins and school dinners, a poor table showed in your health and the children's.
  // A small nudge only: PeriodHealth already carries the era's mortality, poor diet included.
  if (table.health && y < 1950 && y % 3 === 0) ctx.stat('health', Math.sign(table.health));
  // The moneylender's due.
  if (hh.lender && hh.lender.at < state.character.age) { ctx.spend(hh.lender.due, 'Repaying the moneylender', { allowDebt: true }); delete hh.lender; }

  // A hard year: nothing over the bare minimum, and the cash gone.
  const hard = f.cash < 0 && (y < 1965 || countryWageFactor(state) < 0.35);
  if (hard) hh.hard = y;
  if (hard && !state.prompts.some((p) => p.type === 'household.hard') && sideRng(state, 0x4a).chance(0.6)) hardYear(ctx, y);
}

function hardYear(ctx, y) {
  const { state } = ctx;
  const kids = kidsAtHome(state).filter((p) => ageOf(state, p) >= 10);
  // Children out to work before the school-leaving laws were kept (or where they still aren't).
  const childWork = kids.length && (y < 1918 || countryWageFactor(state) < 0.3);
  const relief = y < 1948 ? (state.character.countryId === 'GB' ? 'Ask the parish for relief' : 'Ask the church or the town for relief') : 'Apply for public assistance';
  ctx.prompt({
    type: 'household.hard', icon: '🥖', title: 'A Hard Year',
    text: 'The money ran out before the year did. Something has to give.',
    options: [
      { id: 'pawn', label: y < 1960 ? '🏷️ Pawn the good coat and the clock' : '🏷️ Sell things you can spare', hint: 'A little cash; you may not see them again' },
      { id: 'lodger', label: '🛏️ Take in a lodger', hint: 'Rent coming in; a stranger at the table' },
      ...(childWork ? [{ id: 'children', label: `👦 Send ${kids[0].firstName} out to work`, hint: 'A wage; the end of school' }] : []),
      { id: 'cut', label: '🍞 Cut back on food', hint: 'Hungry, and it shows' },
      { id: 'relief', label: `🏛️ ${relief}`, hint: y < 1948 ? 'Shame, questions, and the workhouse if it gets worse' : 'Forms, a caseworker, a little money' },
      { id: 'lender', label: y < 1960 ? '💰 Go to the moneylender' : '💰 Borrow from a payday lender', hint: 'Cash now; ruinous interest' },
    ],
    data: { kid: childWork ? kids[0].id : null },
  });
}

export const HouseholdModule = {
  id: 'household',
  order: 90.5,
  onYearEnd: householdTick,
  resolvers: {
    hard(ctx, data, optionId) {
      const { state } = ctx;
      const y = yearNow(state);
      const n = (base) => Math.round(base * Math.max(0.3, countryWageFactor(state)));
      if (optionId === 'pawn') { ctx.earn(n(400), 'Pawned belongings', { informal: true }); ctx.stat('happiness', -3); return ctx.log(y < 1960 ? 'The pawnbroker gave you a ticket for your good coat and the mantel clock. You meant to redeem them by Easter.' : 'You sold what you could spare.', '🏷️', 'warn'); }
      if (optionId === 'lodger') { ctx.earn(n(1500), 'A lodger\'s rent', { informal: true }); ctx.stat('happiness', -2); (state.household ??= {}).lodger = y; return ctx.log('A lodger took the back room. He paid on Fridays and sang in the evenings.', '🛏️', 'info'); }
      if (optionId === 'children') {
        const kid = state.people?.list?.find((p) => p.id === data.kid);
        ctx.earn(n(1200), 'A child\'s wages', { informal: true });
        ctx.stat('happiness', -4);
        if (kid) { kid.leftSchool = state.character.age; kid.relationship = Math.max(0, (kid.relationship ?? 60) - 4); }
        return ctx.log(`${kid?.firstName ?? 'The eldest'} left school and went out to work. The wage came home every Saturday.`, '👦', 'warn');
      }
      if (optionId === 'cut') { ctx.stat('health', -4); ctx.stat('happiness', -3); return ctx.log('Smaller portions, and you went without so the children did not.', '🍞', 'bad'); }
      if (optionId === 'relief') {
        ctx.earn(n(900), y < 1948 ? 'Poor relief' : 'Public assistance');
        ctx.stat('happiness', y < 1948 ? -6 : -2);
        return ctx.log(y < 1948 ? 'The relieving officer asked a great many questions, looked in your cupboards, and gave you a little. Everyone in the street knew by night.' : 'A caseworker took your details. A little help came.', '🏛️', 'warn');
      }
      ctx.earn(n(1200), 'Borrowed from the moneylender', { informal: true });
      (state.household ??= {}).lender = { due: n(1900), at: state.character.age };
      ctx.stat('stress', 6);
      ctx.log('The moneylender counted out the notes and wrote your name in a little book. The interest would be weekly.', '💰', 'bad');
    },
  },
};

export const householdOf = (state) => state.household ?? null;
export const tableLabel = (state) => { const h = state.household; const t = TABLES.find((x) => x.id === h?.table); return t ? t.label(h.year) : null; };
