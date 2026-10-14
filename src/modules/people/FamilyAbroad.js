/**
 * Family in another country. When you move abroad, your parents, siblings and
 * grown children stay behind (your spouse and young children come with you).
 * You can visit, send money home (remittances, with the transfer fees), set up
 * a regular transfer, answer their calls for help, or sponsor a parent to come
 * and live with you — each country's parent visa is its own ordeal.
 *
 * person.livesIn = countryId          (absent: they live near you)
 * state.people.remit = { [personId]: annual }
 */
import { COUNTRIES, isCitizen, priceLevel } from '../world/Countries.js';
import { residencyOf } from '../world/Immigration.js';
import { clampRel } from './People.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { fromPacks } from '../world/packs/index.js';

/** Fees on sending money abroad (World Bank average ≈ 6%). */
export const REMITTANCE_FEE = 0.06;
export const VISIT_COST = 2200;

/**
 * Bringing a parent to live with you (2025).
 *   needs: 'citizen' | 'resident'   odds: approval   wait: years before they arrive   fee: PPP   minIncome
 */
export const PARENT_VISAS = {
  US: { name: 'IR-5 immigrant visa for a parent', needs: 'citizen', minAge: 21, odds: 0.9, wait: 1, fee: 1800 },
  CA: { name: 'Parents and Grandparents Program (lottery)', needs: 'resident', odds: 0.3, wait: 2, fee: 1100, minIncome: 45000 },
  AU: { name: 'Contributory Parent visa (subclass 143)', needs: 'resident', odds: 0.85, wait: 3, fee: 34000 },
  GB: { name: 'Adult Dependent Relative visa', needs: 'resident', odds: 0.05, wait: 1, fee: 3400 },
  DE: { name: 'Family reunification for a dependent parent', needs: 'resident', odds: 0.1, wait: 1, fee: 110 },
  FR: { name: 'Visa ascendant à charge', needs: 'citizen', odds: 0.35, wait: 1, fee: 100 },
  IT: { name: 'Ricongiungimento familiare (genitore a carico)', needs: 'resident', odds: 0.3, wait: 1, fee: 200 },
  JP: { name: 'Designated Activities (elderly parent)', needs: 'resident', odds: 0.1, wait: 1, fee: 60 },
  KR: { name: 'F-1 visit-and-join visa for a parent', needs: 'resident', odds: 0.4, wait: 1, fee: 90 },
  MX: { name: 'Family unity residence', needs: 'resident', odds: 0.85, wait: 1, fee: 450 },
  PH: { name: 'Temporary visitor visa extension (parents)', needs: 'resident', odds: 0.5, wait: 0, fee: 300 },
  IN: { name: 'Entry (X) visa for a parent', needs: 'resident', odds: 0.6, wait: 0, fee: 150 },
};
fromPacks(PARENT_VISAS, 'PARENT_VISAS');

const here = (state) => state.character.countryId ?? 'US';
const STAYS = ['mother', 'father', 'sibling'];
export const livesAbroad = (state, p) => Boolean(p.livesIn && p.livesIn !== here(state));
export const familyAbroad = (state) => (state.people?.list ?? []).filter((p) => p.alive && livesAbroad(state, p));

/** When you move countries: who stays behind, and who you're now close to again. */
export function familyOnMove(state, from, to) {
  for (const p of state.people?.list ?? []) {
    if (!p.alive) continue;
    if (p.livesIn === to) {
      delete p.livesIn;
      continue;
    }
    const grownChild = p.relation === 'child' && state.character.age + p.ageOffset >= 18;
    if (!p.livesIn && (STAYS.includes(p.relation) || grownChild)) p.livesIn = from;
  }
}

/** Can you sponsor this parent to live with you, and what are the odds? */
export function parentVisaCheck(state, p) {
  const rule = PARENT_VISAS[here(state)];
  if (!rule) return { ok: false, reason: 'No parent visa here' };
  if (!['mother', 'father'].includes(p.relation)) return { ok: false, reason: 'Parents only' };
  if (!livesAbroad(state, p)) return { ok: false, reason: 'Already lives near you' };
  if (p.sponsor) return { ok: false, reason: `Arrives at your age ${p.sponsor.arrives}` };
  const citizen = isCitizen(state, here(state));
  const resident = citizen || residencyOf(state)?.status === 'permanent';
  if (rule.needs === 'citizen' && !citizen) return { ok: false, reason: 'Citizens only' };
  if (!resident) return { ok: false, reason: 'Citizens and permanent residents only' };
  if (rule.minAge && state.character.age < rule.minAge) return { ok: false, reason: `Age ${rule.minAge}+` };
  if (rule.minIncome && (state.finances.lastYear?.gross ?? 0) < rule.minIncome) return { ok: false, reason: `Needs $${rule.minIncome.toLocaleString()}/yr income` };
  if (yearlyCount(state, 'family.sponsor')) return { ok: false, reason: 'One application a year' };
  return { ok: true, odds: rule.odds, fee: rule.fee, rule };
}

function sendMoney(ctx, p, amount, reason) {
  const fee = Math.round(amount * REMITTANCE_FEE);
  if (!ctx.spend(amount + fee, reason, { credit: true })) return false;
  // Money goes further where prices are lower.
  const reach = Math.min(3, 1 / Math.max(0.2, priceLevel({ character: { countryId: p.livesIn === 'US' ? undefined : p.livesIn } })));
  p.relationship = clampRel(p.relationship + Math.min(12, Math.round(amount * reach / 600)));
  if (p.life) p.life.netWorth = Math.round((p.life.netWorth ?? 0) + amount);
  return true;
}

function familyRequest(ctx) {
  const { state, rng } = ctx;
  if (state.character.age < 21 || (state.finances.lastYear?.gross ?? 0) < 20000 || state.prompts.some((x) => x.type === 'familyAbroad.request')) return;
  const away = familyAbroad(state).filter((p) => ['mother', 'father', 'sibling'].includes(p.relation));
  if (!away.length || !rng.chance(0.12)) return;
  const p = rng.pick(away);
  const need = rng.pick([
    ['needs an operation the public hospital can\'t schedule for a year', 6000],
    ['lost a job and is behind on rent', 3000],
    ['wants help with a niece\'s school fees', 2500],
    ['had the roof collapse in a storm', 5000],
  ]);
  const amount = Math.round(need[1] * Math.max(0.3, priceLevel({ character: { countryId: p.livesIn === 'US' ? undefined : p.livesIn } })) / 100) * 100;
  ctx.prompt({
    type: 'familyAbroad.request', icon: '📞', title: 'A Call From Home',
    text: `Your ${p.relation === 'sibling' ? (p.gender === 'female' ? 'sister' : 'brother') : p.relation} ${p.firstName} in ${COUNTRIES[p.livesIn]?.name ?? 'the old country'} ${need[0]}.`,
    options: [
      { id: 'send', label: `💸 Send $${amount.toLocaleString()}`, hint: `+${Math.round(REMITTANCE_FEE * 100)}% transfer fees` },
      { id: 'some', label: `💵 Send what you can ($${Math.round(amount / 3).toLocaleString()})` },
      { id: 'no', label: '😔 You can\'t right now' },
    ],
    data: { id: p.id, amount },
  });
}

export const FamilyAbroadModule = {
  id: 'familyAbroad',
  order: 8.6,

  setup(engine) {
    engine.bus.on('migration:moved', ({ ctx, from, to }) => familyOnMove(ctx.state, from, to));
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const p = state.people;
    if (!p) return;
    // Standing transfers home.
    for (const [id, annual] of Object.entries(p.remit ?? {})) {
      const person = p.list.find((x) => x.id === id);
      if (!person?.alive || !livesAbroad(state, person)) {
        delete p.remit[id];
        continue;
      }
      if (!sendMoney(ctx, person, annual, `Remittance to ${person.firstName}`)) {
        delete p.remit[id];
        ctx.log(`You couldn't keep up the money you send ${person.firstName} and stopped the transfer.`, '💸', 'warn');
      }
    }
    // Distance wears on relationships you don't tend.
    for (const person of familyAbroad(state)) if (!state.yearly[`family.visit.${person.id}`] && rng.chance(0.5)) person.relationship = clampRel(person.relationship - 1);
    // Sponsored parents arrive.
    for (const person of p.list) {
      if (person.sponsor && state.character.age >= person.sponsor.arrives) {
        delete person.sponsor;
        delete person.livesIn;
        person.relationship = clampRel(person.relationship + 10);
        ctx.log(`${person.firstName} arrived to live near you. ${COUNTRIES[here(state)].flag}`, '🛬', 'milestone');
        ctx.stat('happiness', 8);
      }
    }
    familyRequest(ctx);
  },

  actions: {
    /** "personId:amount" — a one-off transfer home. */
    send(ctx, arg) {
      const { state } = ctx;
      const [id, raw] = String(arg).split(':');
      const p = state.people.list.find((x) => x.id === id);
      const amount = Number(raw);
      if (!p || !livesAbroad(state, p) || !(amount > 0)) return;
      if (!sendMoney(ctx, p, amount, `Money sent to ${p.firstName}`)) return ctx.toast('Not enough money.', 'warn');
      ctx.log(`You sent $${amount.toLocaleString()} home to ${p.firstName}.`, '💸', 'good');
    },
    /** "personId:annual" — a standing yearly transfer (0 stops it). */
    regular(ctx, arg) {
      const { state } = ctx;
      const [id, raw] = String(arg).split(':');
      const p = state.people.list.find((x) => x.id === id);
      if (!p || !livesAbroad(state, p)) return;
      state.people.remit ??= {};
      const annual = Number(raw);
      if (annual > 0) {
        state.people.remit[id] = annual;
        ctx.log(`You set up a monthly transfer to ${p.firstName}: $${annual.toLocaleString()} a year.`, '💸');
      } else {
        delete state.people.remit[id];
        ctx.log(`You stopped the monthly transfer to ${p.firstName}.`, '💸');
      }
    },
    visit(ctx, id) {
      const { state } = ctx;
      const p = state.people.list.find((x) => x.id === id);
      if (!p || !livesAbroad(state, p)) return;
      if (state.yearly[`family.visit.${id}`]) return ctx.toast('One trip a year.', 'warn');
      if (!ctx.spend(VISIT_COST, `Trip to see ${p.firstName}`, { credit: true })) return ctx.toast(`Flights and a week away: about $${VISIT_COST.toLocaleString()}.`, 'warn');
      state.yearly[`family.visit.${id}`] = 1;
      p.relationship = clampRel(p.relationship + 12);
      ctx.stat('happiness', 5);
      ctx.log(`You flew to ${COUNTRIES[p.livesIn]?.name ?? 'see family'} to spend a week with ${p.firstName}.`, '✈️', 'good');
    },
    sponsor(ctx, id) {
      const { state, rng } = ctx;
      const p = state.people.list.find((x) => x.id === id);
      if (!p) return;
      const check = parentVisaCheck(state, p);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'family.sponsor');
      if (!ctx.spend(check.fee, check.rule.name, { credit: true })) return ctx.toast(`The application costs $${check.fee.toLocaleString()}.`, 'warn');
      if (!rng.chance(check.odds)) return ctx.log(`Your ${check.rule.name} application for ${p.firstName} was refused.`, '📭', 'bad');
      p.sponsor = { arrives: state.character.age + check.rule.wait };
      ctx.log(`Approved: ${check.rule.name}. ${p.firstName} ${check.rule.wait ? `arrives in ${check.rule.wait} year${check.rule.wait > 1 ? 's' : ''}` : 'is on the way'}.`, '🛂', 'good');
      if (!check.rule.wait) {
        delete p.sponsor;
        delete p.livesIn;
      }
    },
  },

  resolvers: {
    request(ctx, data, optionId) {
      const { state } = ctx;
      const p = state.people.list.find((x) => x.id === data.id);
      if (!p) return;
      if (optionId === 'no') {
        p.relationship = clampRel(p.relationship - 6);
        return ctx.log(`You told ${p.firstName} you couldn't help this time.`, '😔');
      }
      const amount = optionId === 'send' ? data.amount : Math.round(data.amount / 3);
      if (!sendMoney(ctx, p, amount, `Money sent to ${p.firstName}`)) return ctx.toast('Not enough money.', 'warn');
      ctx.stat('happiness', 2);
      ctx.log(`You wired $${amount.toLocaleString()} home to ${p.firstName}.`, '💸', 'good');
    },
  },
};
