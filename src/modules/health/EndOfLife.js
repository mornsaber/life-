/**
 * The last years: long-term care, hospice, and saying what you want.
 *
 *   Long-term care   Advanced dementia (and other conditions marked `care`) means you can no
 *                    longer live alone. A family member can care for you (it costs them), you
 *                    can pay for care at home, or move into a care home. Who pays depends on the
 *                    country: Medicaid only after your savings are spent down (US), a means test
 *                    (UK), long-term care insurance (Germany, Japan, Korea, the Netherlands), or
 *                    tax-funded care (the Nordics).
 *   Hospice          A terminal illness offers the choice to stop aggressive treatment: comfort,
 *                    pain relief, time with the people you love.
 *   Advance directive  Written once: what you want if you can't say. It spares your family the
 *                    decision, and the hospice prompt respects it.
 *
 * state.health.care = { kind: 'family' | 'home' | 'facility', since, carerId }
 */
import { activeConditions, CONDITIONS } from './Conditions.js';
import { priceLevel } from '../world/Countries.js';
import { fromPacks } from '../world/packs/index.js';

/** Who pays for long-term care: share covered, and how. */
export const LONG_TERM_CARE = {
  US: { cover: 0, means: 2000, name: 'Medicaid (after spending down your savings)' },
  GB: { cover: 0, means: 23250, name: 'council-funded care (means-tested)' },
  DE: { cover: 0.5, name: 'Pflegeversicherung (long-term care insurance)' },
  JP: { cover: 0.9, name: 'long-term care insurance (kaigo hoken)' },
  KR: { cover: 0.8, name: 'long-term care insurance' },
  NL: { cover: 0.85, name: 'the Wlz (long-term care act)' },
  SE: { cover: 0.9, name: 'municipal elder care' }, NO: { cover: 0.9, name: 'municipal elder care' }, DK: { cover: 0.9, name: 'municipal elder care' }, FI: { cover: 0.85, name: 'municipal elder care' },
  FR: { cover: 0.4, name: 'the APA allowance' }, AU: { cover: 0.6, name: 'government-subsidised aged care' }, CA: { cover: 0.6, name: 'provincial long-term care' },
  NZ: { cover: 0, means: 250000, name: 'the residential care subsidy (means-tested)' }, IE: { cover: 0.6, name: 'the Fair Deal scheme' },
};
fromPacks(LONG_TERM_CARE, 'LONG_TERM_CARE');
const FALLBACK_CARE = { cover: 0, family: true, name: 'family' };
export const careSystemHere = (state) => LONG_TERM_CARE[state.character.countryId ?? 'US'] ?? FALLBACK_CARE;

const CARE_COST = { family: 3000, home: 35000, facility: 90000 };
export const CARE_LABEL = { family: '👪 Cared for by family', home: '🏠 Paid carers at home', facility: '🏥 A care home' };

/** What a year of this kind of care costs you, after what the state pays. */
export function careCost(state, kind) {
  const sys = careSystemHere(state);
  const full = Math.round(CARE_COST[kind] * priceLevel(state));
  if (kind === 'family') return full;
  if (sys.means != null) return state.finances.cash > sys.means * priceLevel(state) ? full : Math.round(full * 0.1);
  return Math.round(full * (1 - (sys.cover ?? 0)));
}

const needsCare = (state) => activeConditions(state).find((c) => CONDITIONS[c.id].care && c.severity >= 55);
const terminal = (state) => activeConditions(state).find((c) => !c.hospice && CONDITIONS[c.id].mortality >= 0.04 && c.severity >= 85 && CONDITIONS[c.id].kind === 'chronic');
const carers = (state) => (state.people?.list ?? []).filter((p) => p.alive && ['spouse', 'partner', 'child'].includes(p.relation) && (p.relationship ?? 50) >= 40);

export function endOfLifeTick(ctx) {
  const { state } = ctx;
  const h = state.health;
  if (!h) return;
  // Long-term care.
  const c = needsCare(state);
  if (c && !h.care && !state.prompts.some((p) => p.type === 'health.care')) {
    const family = carers(state)[0];
    const sys = careSystemHere(state);
    ctx.prompt({
      type: 'health.care', icon: '🫶', title: 'You Can\'t Live Alone Any More',
      text: `Your ${CONDITIONS[c.id].name.toLowerCase()} has reached the point where you need someone with you. Here, care is paid for by ${sys.name}.`,
      options: [
        family ? { id: 'family', label: `👪 ${family.firstName} will look after you`, hint: 'Hard on them; cheap for you' } : null,
        { id: 'home', label: `🏠 Carers at home (≈$${careCost(state, 'home').toLocaleString()}/yr)` },
        { id: 'facility', label: `🏥 Move into a care home (≈$${careCost(state, 'facility').toLocaleString()}/yr)` },
      ].filter(Boolean),
      data: { carerId: family?.id ?? null },
    });
  }
  if (h.care) {
    const cost = careCost(state, h.care.kind);
    if (cost) ctx.spend(cost, CARE_LABEL[h.care.kind].slice(3), { allowDebt: true });
    if (h.care.kind === 'family') {
      const p = (state.people?.list ?? []).find((x) => x.id === h.care.carerId && x.alive);
      if (p) p.relationship = Math.max(0, (p.relationship ?? 60) - 3);
      else h.care = null;
    }
    if (h.care?.kind === 'facility') ctx.stat('happiness', -3);
  }
  // A terminal illness.
  const t = terminal(state);
  if (t && !state.prompts.some((p) => p.type === 'health.hospice')) {
    ctx.prompt({
      type: 'health.hospice', icon: '🕊️', title: 'What Matters Now',
      text: `Your doctors say the ${CONDITIONS[t.id].name.toLowerCase()} is now terminal. More treatment might buy a little time, with a lot of hospital. Hospice care would focus on comfort, and on the time you have.${h.directive ? ' Your advance directive says you\'d want comfort first.' : ''}`,
      options: [
        { id: 'hospice', label: '🕊️ Hospice care', hint: 'Comfort, pain relief, time with family' },
        { id: 'fight', label: '💪 Keep fighting', hint: 'Treatment continues; a small chance it works' },
      ],
      data: { conditionId: t.id },
    });
  }
}

export const EndOfLifeResolvers = {
  care(ctx, data, optionId) {
    const { state } = ctx;
    state.health.care = { kind: optionId, since: state.character.age, carerId: optionId === 'family' ? data.carerId : null };
    const p = (state.people?.list ?? []).find((x) => x.id === data.carerId);
    ctx.log(optionId === 'family' ? `${p?.firstName ?? 'Your family'} moved in to look after you. Some days you know them; some days you don't.` : optionId === 'home' ? 'Carers come in the morning and the evening. You stay in your own home.' : 'You moved into a care home. The staff are kind; it isn\'t home.', '🫶', 'info');
  },
  hospice(ctx, data, optionId) {
    const { state } = ctx;
    const c = activeConditions(state).find((x) => x.id === data.conditionId);
    if (!c) return;
    if (optionId === 'hospice') {
      c.hospice = true;
      c.treated = false;
      ctx.stat('stress', -20);
      ctx.stat('happiness', 8);
      for (const p of (state.people?.list ?? []).filter((x) => x.alive && ['spouse', 'partner', 'child', 'sibling'].includes(x.relation))) p.relationship = Math.min(100, (p.relationship ?? 60) + 8);
      return ctx.log('You chose hospice. The pain is managed; the people you love come every day. You said the things you needed to say.', '🕊️', 'milestone');
    }
    c.hospice = true;
    ctx.log('You chose to keep fighting. More scans, another round. Your family is with you either way.', '💪', 'info');
  },
};

export const EndOfLifeActions = {
  directive(ctx) {
    const { state } = ctx;
    if (state.character.age < 18) return ctx.toast('18+', 'warn');
    if (state.health.directive) return ctx.toast('You already have one', 'warn');
    state.health.directive = true;
    ctx.log('You wrote an advance directive and named who decides if you can\'t. Your family was relieved you had.', '📝', 'good');
  },
};
