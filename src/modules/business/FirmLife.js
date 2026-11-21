/**
 * A firm's life beyond the books (business/Business.js keeps the accounts):
 *
 *   Partners      a named partner who puts in money or know-how for a share, has views on where
 *                 the firm should go, and can be bought out, or falls out and sues.
 *   Succession    in your sixties: hand the firm to a son or daughter, sell it to the staff (the
 *                 foreman before the 1970s, an employee trust later), or keep going.
 *   Short of cash before the bank lends small firms (America's SBA from 1953, Britain's clearing
 *                 banks from the 1960s): discounting bills with a merchant house, the
 *                 moneylender, a supplier's credit, or closing.
 *   Failure       in each country's words: the London Gazette's list of bankrupts, la faillite,
 *                 Konkurs, receivership.
 *   Trade         exporting: a wider market, and the blockades, tariff walls (1930–33) and lost
 *                 imperial markets (1947–65) that come with it.
 *   Know-how      a rival copies your product or poaches your best hand: sue (on a patent, or for
 *                 breach of confidence), match the offer, or let them go.
 *   A master      after an apprenticeship and years as a journeyman, setting up on your own.
 *
 * biz.partner = { name, pct, mood, since }   biz.exporting = { since }   biz.periodLoan = { balance, rate }
 */
import { Random } from '../../core/Random.js';
import { randomName } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { currentBusiness, valuation, startEligibility } from './Business.js';
import { exitBusiness } from './BusinessEngine.js';
import { card, button, esc, money } from '../../ui/Components.js';

const cc = (state) => state.character.countryId ?? 'US';
const frng = (state) => new Random((((state.world?.seed ?? 1) * 5381) ^ (state.character.age * 613 + 0x2c9)) >>> 0);
const GOODS = ['machineShop', 'gristMill', 'fishingBoat', 'techStartup', 'softwareShop', 'indieGameStudio', 'coalMerchant', 'tailorShop', 'printShop', 'recordingStudio', 'productionCompany', 'smithy', 'iceHouse'];
const EMPIRE = { GB: [1947, 1965], FR: [1954, 1962], NL: [1949, 1962], BE: [1960, 1962], PT: [1974, 1976] };
const value = (biz) => { try { return Math.max(0, valuation(biz)); } catch { return 0; } };

/** When small firms could borrow from a bank. */
const bankLends = (state) => yearNow(state) >= (cc(state) === 'US' ? 1953 : 1965);

/** How a failed firm ends, in the country's words and era. */
export function failureLine(state, biz) {
  const y = yearNow(state);
  const c = cc(state);
  if (['GB', 'IE', 'AU', 'NZ', 'CA', 'IN'].includes(c) && y < 1986) return `Your name appeared in the Gazette among the bankrupts, and the official receiver sold ${biz.name}'s stock and fittings at auction.`;
  if (c === 'FR' || c === 'BE') return `The tribunal de commerce declared ${biz.name} in faillite; ${y < 1967 ? 'a bankrupt lost his vote and his seat on any council' : 'an administrateur judiciaire took the books'}.`;
  if (c === 'DE' || c === 'AT') return `The court opened Konkurs proceedings: a Konkursverwalter sold what ${biz.name} had to pay the creditors a few pfennigs in the mark.`;
  if (c === 'JP') return `${biz.name} went under; the creditors met in your shop and divided what was left.`;
  if (c === 'US' && y < 1898) return `${biz.name} failed; with no federal bankruptcy law, your creditors chased you state by state.`;
  return null;
}

export const FirmLifeModule = {
  id: 'firmLife',
  order: 62.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    const biz = currentBusiness(state);
    if (!biz || !state.character.alive) return;
    const rng = frng(state);
    const y = yearNow(state);
    const age = state.character.age;
    const busy = state.prompts.length > 2;
    // A partner's view of things.
    const p = biz.partner;
    if (p && !busy && rng.chance(0.18)) {
      ctx.prompt({
        type: 'firmLife.partnerRow', icon: '🤝', title: 'Your Partner Disagrees',
        text: `${p.name} wants ${rng.pick(['to open a second shop', 'to cut the staff', 'to take a bigger order on credit', 'to bring in a nephew', 'to raise the prices'])}. You don't.`,
        data: {},
        options: [
          { id: 'give', label: '🤝 Give way', hint: 'Keep the peace' },
          { id: 'firm', label: '✋ Stand firm' },
          { id: 'buy', label: `💰 Buy them out (${money(Math.round(value(biz) * p.pct))})`, disabled: (state.finances.cash ?? 0) < value(biz) * p.pct },
        ],
      });
    }
    if (p && p.mood <= 15) {
      const owed = Math.round(value(biz) * p.pct);
      biz.cash -= owed;
      ctx.log(`${p.name} walked out and sued for their share. The court ordered the partnership wound up and ${money(owed)} paid out of the firm.`, '⚖️', 'bad');
      biz.ownerPct = Math.min(1, (biz.ownerPct ?? 1) + p.pct);
      biz.partner = null;
    }
    // A period loan's interest.
    if (biz.periodLoan?.balance > 0) {
      const interest = Math.round(biz.periodLoan.balance * biz.periodLoan.rate);
      biz.cash -= interest;
      if (biz.cash > biz.periodLoan.balance * 1.5) { biz.cash -= biz.periodLoan.balance; ctx.log(`You paid off the ${biz.periodLoan.kind}.`, '💰', 'good'); biz.periodLoan = null; }
    }
    // Short of cash before the banks lent to small firms.
    if (biz.cash < 0 && !bankLends(state) && !biz.periodLoan && !busy && rng.chance(0.6)) {
      const need = Math.round(-biz.cash * 1.2);
      ctx.prompt({
        type: 'firmLife.cash', icon: '🪙', title: 'The Firm Is Short of Cash',
        text: `${biz.name} owes more than it has: ${money(need)} by quarter day, and no bank will lend to a business your size.`,
        data: { need },
        options: [
          { id: 'bills', label: '📜 Discount your bills with a merchant house', hint: 'Cash now, at a stiff discount' },
          { id: 'lender', label: '💰 The moneylender', hint: 'Ruinous interest', tone: 'danger' },
          { id: 'supplier', label: '🤝 Ask your suppliers for time', hint: 'Ninety days, if they trust you' },
          { id: 'ride', label: '🙏 Ride it out' },
        ],
      });
    }
    // Trade: the markets abroad, and what wars and tariffs do to them.
    if (biz.exporting) {
      const rev = biz.lastYear?.revenue ?? 0;
      const war = state.world?.wars?.[cc(state)];
      const empire = EMPIRE[cc(state)];
      if (war && (war.intensity ?? 0) >= 3) { biz.cash -= Math.round(rev * 0.1); if (rng.chance(0.4)) ctx.log('The war closed the sea lanes: your export orders sat on the quay, then were cancelled.', '⚓', 'bad'); }
      else if (y >= 1930 && y <= 1933) { biz.cash -= Math.round(rev * 0.06); if (rng.chance(0.4)) ctx.log('The tariff walls went up abroad: your foreign orders halved.', '🧱', 'bad'); }
      else if (empire && y >= empire[0] && y <= empire[1] && rng.chance(0.25)) { biz.cash -= Math.round(rev * 0.05); ctx.log('Independence closed the colonial market your firm was built on: the new governments buy elsewhere.', '🗺️', 'warn'); }
      else { biz.cash += Math.round(rev * 0.06); if (rng.chance(0.15)) ctx.log(`A big order from abroad for ${biz.name}.`, '🚢', 'good'); }
    }
    // Know-how: copied or poached.
    if ((biz.years ?? 0) >= 3 && (biz.quality ?? 50) >= 60 && !busy && rng.chance(0.07)) {
      ctx.prompt({
        type: 'firmLife.poached', icon: '🕵️', title: rng.chance(0.5) ? 'A Rival Copies You' : 'Your Best Hand Is Poached',
        text: `A rival is offering your foreman double to bring ${biz.name}'s methods with them.`,
        data: {},
        options: [
          { id: 'sue', label: biz.patent ? '⚖️ Sue on your patent' : y >= 1979 ? '⚖️ Sue for trade secrets' : '⚖️ Sue for breach of confidence', hint: biz.patent ? 'A strong case' : 'Hard to prove' },
          { id: 'match', label: '💵 Match the offer' },
          { id: 'let', label: '🚪 Let them go' },
        ],
      });
    }
    // Succession, from your sixties.
    const kids = (state.people?.list ?? []).filter((x) => x.alive && x.relation === 'child' && age + (x.ageOffset ?? 0) >= 21);
    if (age >= 62 && !busy && (biz.successionAsked == null || age - biz.successionAsked >= 5)) {
      biz.successionAsked = age;
      ctx.prompt({
        type: 'firmLife.succession', icon: '🔑', title: 'Who Takes Over?',
        text: `You're ${age}. ${biz.name} needs someone after you.`,
        data: {},
        options: [
          { id: 'keep', label: '⏳ Not yet' },
          ...(kids.length ? [{ id: 'child', label: `👪 Hand it to ${kids[0].firstName}`, hint: 'Keep it in the family' }] : []),
          { id: 'staff', label: y >= 1974 ? '🧑‍🤝‍🧑 Sell to the staff (an employee trust)' : '🧑‍🤝‍🧑 Sell to the foreman and the men', hint: 'About 70% of its value' },
        ],
      });
    }
  },
  actions: {
    /** Bring in a partner with capital. */
    partner(ctx) {
      const { state } = ctx;
      const biz = currentBusiness(state);
      if (!biz) return ctx.toast('No business.', 'warn');
      if (biz.partner) return ctx.toast('You already have a partner.', 'warn');
      const rng = frng(state);
      const n = randomName(rng, rng.chance(yearNow(state) < 1960 ? 0.1 : 0.4) ? 'female' : 'male');
      const pct = 0.3;
      const stake = Math.max(1000, Math.round(value(biz) * pct || BUSINESS_TYPES[biz.typeId].cost * 0.3));
      biz.cash += stake;
      biz.ownerPct = Math.max(0.1, (biz.ownerPct ?? 1) - pct);
      biz.partner = { name: `${n.firstName} ${n.lastName}`, pct, mood: 60, since: state.character.age };
      ctx.log(`${biz.partner.name} came in as your partner: ${money(stake)} for a ${Math.round(pct * 100)}% share, and opinions about everything.`, '🤝', 'good');
    },
    /** Start selling abroad. */
    exportStart(ctx) {
      const { state } = ctx;
      const biz = currentBusiness(state);
      if (!biz || !GOODS.includes(biz.typeId)) return ctx.toast('Nothing to sell abroad.', 'warn');
      if (biz.exporting) return;
      const cost = Math.round(BUSINESS_TYPES[biz.typeId].cost * 0.15);
      biz.cash -= cost;
      biz.exporting = { since: state.character.age };
      const services = ['softwareShop', 'techStartup', 'indieGameStudio', 'productionCompany', 'recordingStudio'].includes(biz.typeId);
      ctx.log(services ? `${biz.name} signed its first clients abroad: calls across the time zones, contracts in another currency (${money(cost)} to set up).` : `${biz.name} took its first orders from abroad: an agent in the port, shipping crates and letters of credit (${money(cost)} to set up).`, '🚢', 'good');
    },
    /** Set up on your own as a master of your trade. */
    master(ctx) {
      const { state } = ctx;
      const m = masterOption(state);
      if (!m) return ctx.toast('Not yet: you need your trade and some years as a journeyman.', 'warn');
      ctx.emit('firmLife:master', { typeId: m.typeId });
    },
  },
  setup(engine) {
    engine.bus.on('firmLife:master', ({ ctx, typeId }) => {
      const a = engine.actions.get('business.start');
      if (a) { a(ctx, `${typeId}:cash:sole:standard`); if (currentBusiness(ctx.state)) ctx.log('You set up on your own: your name over the door, your own apprentice, and the guild\'s mark on your work.', '🔨', 'milestone'); }
    });
  },
  resolvers: {
    partnerRow(ctx, _data, optionId) {
      const biz = currentBusiness(ctx.state);
      const p = biz?.partner;
      if (!p) return;
      if (optionId === 'give') { p.mood = Math.min(100, p.mood + 8); biz.quality = Math.max(0, (biz.quality ?? 50) - 1); ctx.log(`You gave way to ${p.name}.`, '🤝', 'info'); }
      else if (optionId === 'firm') { p.mood -= 20; ctx.log(`You stood firm. ${p.name} went quiet, and stayed quiet.`, '✋', 'warn'); }
      else {
        const price = Math.round(value(biz) * p.pct);
        if ((ctx.state.finances.cash ?? 0) < price) return ctx.toast('Not enough cash.', 'warn');
        ctx.spend(price, `Bought out ${p.name}`);
        biz.ownerPct = Math.min(1, (biz.ownerPct ?? 0) + p.pct);
        ctx.log(`You bought out ${p.name}. The firm is yours again.`, '💰', 'good');
        biz.partner = null;
      }
    },
    cash(ctx, data, optionId) {
      const { state } = ctx;
      const biz = currentBusiness(state);
      if (!biz) return;
      const need = data?.need ?? 0;
      const rng = frng(state);
      if (optionId === 'bills') { biz.cash += need; biz.periodLoan = { balance: need, rate: 0.12, kind: 'merchant house\'s advance' }; ctx.log(`A merchant house discounted your customers' bills: ${money(need)} now, and twelve per cent for the favour.`, '📜', 'info'); }
      else if (optionId === 'lender') { biz.cash += need; biz.periodLoan = { balance: need, rate: 0.35, kind: 'moneylender\'s loan' }; ctx.log(`The moneylender advanced ${money(need)} at thirty-five per cent.`, '💰', 'warn'); }
      else if (optionId === 'supplier') {
        if (rng.chance((biz.reputation ?? 45) / 100 + 0.2)) { biz.cash += Math.round(need * 0.6); ctx.log('Your suppliers gave you ninety days. You won\'t forget it.', '🤝', 'good'); }
        else { biz.reputation = Math.max(0, (biz.reputation ?? 45) - 6); ctx.log('Your suppliers wanted cash on delivery from now on. Word got round.', '📉', 'bad'); }
      } else ctx.log('You cut back and prayed for a good quarter.', '🙏', 'info');
    },
    poached(ctx, _data, optionId) {
      const { state } = ctx;
      const biz = currentBusiness(state);
      if (!biz) return;
      const rng = frng(state);
      if (optionId === 'sue') {
        const cost = Math.round(BUSINESS_TYPES[biz.typeId].cost * 0.1);
        biz.cash -= cost;
        if (rng.chance(biz.patent ? 0.75 : 0.35)) ctx.log(`You won: the court ordered the rival to stop, with costs. (${money(cost)} in lawyers' fees.)`, '⚖️', 'good');
        else { biz.quality = Math.max(0, (biz.quality ?? 50) - 4); ctx.log(`You lost: the judge said your methods were common knowledge in the trade. (${money(cost)} in fees.)`, '⚖️', 'bad'); }
      } else if (optionId === 'match') { biz.cash -= Math.round(BUSINESS_TYPES[biz.typeId].wage * 0.5); ctx.log('You matched the offer. Your foreman stayed, at a price.', '💵', 'info'); }
      else { biz.quality = Math.max(0, (biz.quality ?? 50) - 6); ctx.log('Your foreman left, and took the way you did things with them.', '🚪', 'bad'); }
    },
    succession(ctx, _data, optionId) {
      const { state } = ctx;
      const biz = currentBusiness(state);
      if (!biz || optionId === 'keep') return;
      const v = value(biz);
      if (optionId === 'child') {
        const kid = (state.people?.list ?? []).find((x) => x.alive && x.relation === 'child' && state.character.age + (x.ageOffset ?? 0) >= 21);
        if (kid) { kid.job = `Owner, ${biz.name}`; kid.income = Math.max(kid.income ?? 0, Math.round((biz.lastYear?.netIncome ?? 0) * 0.8)); }
        ctx.log(`You handed ${biz.name} to ${kid?.firstName ?? 'your child'}. The name over the door stays the same.`, '🔑', 'milestone');
        exitBusiness(ctx, 0, `Handed to ${kid?.firstName ?? 'the family'}`);
      } else {
        ctx.log(`You sold ${biz.name} to the people who work there.`, '🧑‍🤝‍🧑', 'milestone');
        exitBusiness(ctx, Math.round(v * 0.7), 'Sold to the staff');
      }
    },
  },
};

/** The trade you could set up in as a master, or null. */
export function masterOption(state) {
  if (yearNow(state) >= 1970 || state.business?.current || state.character.age < 21) return null;
  const hist = state.career.history ?? [];
  const job = state.career.job;
  const years = (id) => hist.filter((h) => h.professionId === id).reduce((s, h) => s + ((h.endAge ?? 0) - (h.startAge ?? 0)), 0) + (job?.professionId === id ? job.yearsAtEmployer ?? 0 : 0);
  const indentured = state.credentials?.held?.indentures?.status === 'active';
  for (const [typeId, t] of Object.entries(BUSINESS_TYPES)) {
    const id = (t.professions ?? []).find((pid) => years(pid) >= (indentured ? 3 : 7));
    if (!id) continue;
    if (!startEligibility(state, typeId, 'cash', 'standard').ok) continue;
    return { typeId, professionId: id, name: t.name };
  }
  return null;
}

/** The firm's partners, trade and succession, on the Business tab. */
export function firmCard(state, biz) {
  if (!biz) return '';
  const p = biz.partner;
  const lines = [
    p ? `<p>🤝 Partner: <b>${esc(p.name)}</b> (${Math.round(p.pct * 100)}%), ${p.mood >= 60 ? 'content' : p.mood >= 35 ? 'restless' : 'at daggers drawn'}.</p>` : '',
    biz.exporting ? '<p>🚢 Selling abroad.</p>' : '',
    biz.periodLoan ? `<p>📜 Owing ${money(biz.periodLoan.balance)} on the ${esc(biz.periodLoan.kind)} at ${Math.round(biz.periodLoan.rate * 100)}%.</p>` : '',
  ].join('');
  const buttons = [
    !p ? button('🤝 Take a partner', 'firmLife.partner', { variant: 'small', hint: 'Capital for a 30% share' }) : '',
    GOODS.includes(biz.typeId) && !biz.exporting ? button('🚢 Sell abroad', 'firmLife.exportStart', { variant: 'small' }) : '',
  ].join('');
  if (!lines && !buttons) return '';
  return card('Partners & Trade', `${lines}<div class="row-end">${buttons}</div>`, { icon: '🤝' });
}

/** Setting up as a master, on the Business tab before you own a firm. */
export function masterCard(state) {
  const m = masterOption(state);
  if (!m) return '';
  return card('Set Up as a Master', `<p>Years at your trade have earned you the right to work on your own account: a ${esc(m.name.toLowerCase())} of your own.</p><div class="row-end">${button('🔨 Set up on your own', 'firmLife.master', { variant: 'small primary' })}</div>`, { icon: '🔨' });
}
