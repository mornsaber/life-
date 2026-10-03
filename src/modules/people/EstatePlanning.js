/**
 * Estate planning while you're alive: trusts, retirement-account
 * beneficiaries and lifetime gifts. Settlement itself lives in Legacy.js.
 *
 * state.people.plan = { trust, ilit, minorsTrust, beneficiary, exemptionUsed, gifts: { [personId]: balance }, giftedThisYear: { [personId]: amount } }
 * state.finances.trustPayouts = [{ age, amount, label }]   (heirs: staged inheritance)
 */
import { living, byId, isMarried, clampRel } from './People.js';

/** 2025 annual gift-tax exclusion, per recipient (doubles with spousal gift-splitting). */
export const ANNUAL_EXCLUSION = 19000;
export const TRUST_COSTS = { trust: 2500, ilit: 5000, minorsTrust: 3500 };
export const TRUSTS = {
  trust: { label: 'Revocable living trust', icon: '🏛️', desc: 'Your home, savings and investments skip probate (≈3% saved) and stay private.' },
  ilit: { label: 'Irrevocable life-insurance trust', icon: '🛡️', desc: 'Life insurance proceeds no longer count toward estate tax.' },
  minorsTrust: { label: "Trust for your children's inheritance", icon: '🧒', desc: 'Heirs under 25 get a third now, a third at 25, the rest at 30 — no court guardianship.' },
};
const GIFT_GROWTH = 0.03;

export const estatePlan = (state) => state.people?.plan;
export const exclusionFor = (state) => ANNUAL_EXCLUSION * (isMarried(state) ? 2 : 1);
/** People you can give to: children, siblings, parents, grandkids-in-law… (anyone in the family list). */
export const giftRecipients = (state) => living(state).filter((p) => ['child', 'sibling', 'mother', 'father'].includes(p.relation));

export const EstatePlanning = {
  id: 'estate',
  order: 16,

  init(state) {
    if (!state.people) return;
    state.people.plan ??= { trust: false, ilit: false, minorsTrust: false, beneficiary: null, exemptionUsed: 0, gifts: {}, giftedThisYear: {} };
  },

  onAgeUp(ctx) {
    const { state } = ctx;
    const plan = estatePlan(state);
    if (plan) {
      plan.giftedThisYear = {};
      // Money you gave grows in the recipient's hands (shown on the Legacy card; theirs when you pass).
      for (const id of Object.keys(plan.gifts)) {
        if (!byId(state, id)?.alive) delete plan.gifts[id];
        else plan.gifts[id] = Math.round(plan.gifts[id] * (1 + GIFT_GROWTH));
      }
    }
    // Staged inheritance from a parent's trust (or a guardianship released at 18).
    const due = (state.finances.trustPayouts ?? []).filter((p) => p.age <= state.character.age);
    for (const p of due) {
      state.finances.cash += p.amount;
      ctx.log(`${p.label}: $${p.amount.toLocaleString()}.`, '🏛️', 'good');
    }
    if (due.length) state.finances.trustPayouts = state.finances.trustPayouts.filter((p) => p.age > state.character.age);
  },

  actions: {
    /** arg: trust | ilit | minorsTrust — toggles (dissolving an irrevocable trust is not allowed). */
    trust(ctx, kind) {
      const plan = estatePlan(ctx.state);
      if (!plan || !TRUSTS[kind]) return;
      if (ctx.state.character.age < 18) return ctx.toast('18+ only.', 'warn');
      if (plan[kind]) {
        if (kind === 'ilit') return ctx.toast('An irrevocable trust can\'t be undone.', 'warn');
        plan[kind] = false;
        return ctx.log(`You dissolved your ${TRUSTS[kind].label.toLowerCase()}.`, TRUSTS[kind].icon);
      }
      if (!ctx.spend(TRUST_COSTS[kind], `Estate attorney — ${TRUSTS[kind].label}`, { credit: true })) return ctx.toast(`An estate attorney charges $${TRUST_COSTS[kind].toLocaleString()}.`, 'warn');
      plan[kind] = true;
      ctx.log(`An estate attorney set up your ${TRUSTS[kind].label.toLowerCase()}.`, TRUSTS[kind].icon, 'good');
    },
    /** arg: a person id, 'children', or 'none' — who your 401(k) and IRAs go to. */
    beneficiary(ctx, who) {
      const { state } = ctx;
      const plan = estatePlan(state);
      if (!plan) return;
      if (who === 'none') plan.beneficiary = null;
      else if (who === 'children' || byId(state, who)?.alive) plan.beneficiary = who;
      else return;
      ctx.toast(plan.beneficiary ? 'Beneficiary designation updated.' : 'Beneficiary removed — accounts will pass through your estate.', 'info');
    },
    /** arg: "personId:amount" */
    gift(ctx, arg) {
      const { state } = ctx;
      const plan = estatePlan(state);
      const [id, raw] = String(arg).split(':');
      const amount = Math.round(Number(raw));
      const person = byId(state, id);
      if (!plan || !person?.alive || !(amount > 0) || !giftRecipients(state).includes(person)) return;
      if (state.finances.cash < amount) return ctx.toast('Gifts come out of cash, not credit.', 'warn');
      ctx.spend(amount, `Gift to ${person.firstName}`);
      plan.gifts[id] = (plan.gifts[id] ?? 0) + amount;
      const before = plan.giftedThisYear[id] ?? 0;
      plan.giftedThisYear[id] = before + amount;
      const over = Math.max(0, plan.giftedThisYear[id] - Math.max(before, exclusionFor(state)));
      person.relationship = clampRel(person.relationship + Math.min(10, Math.round(amount / 5000)));
      if (over > 0) {
        plan.exemptionUsed += over;
        ctx.log(`You gave ${person.firstName} $${amount.toLocaleString()}. $${over.toLocaleString()} is over the annual exclusion: you filed a gift-tax return (Form 709), and it comes off your lifetime estate-tax exemption.`, '🎁', 'warn');
      } else ctx.log(`You gave ${person.firstName} $${amount.toLocaleString()} — under the annual exclusion, no gift tax.`, '🎁', 'good');
    },
  },
};
