/**
 * Elder care. Parents past 65 gradually need help — first with errands and
 * bills, then with bathing, meals and safety (often dementia). Someone has to
 * provide it: you, a sibling, a paid aide, assisted living or a nursing home.
 *
 * Who pays: the parent's Social Security first, then their savings (which
 * shrinks your inheritance), then you. A nursing home bills the resident, not
 * the family: once their savings are gone, Medicaid covers it. Without a power of attorney signed while they could
 * still sign it, you need a court guardianship to manage their money.
 *
 * state.elderCare = {
 *   cases: { [personId]: { level: 'help'|'full', dementia, arrangement, since } }
 *   poa: [personId]            durable power of attorney on file
 *   guardianship: [personId]   court-appointed (after incapacity)
 *   caregiverYears             years you've been a hands-on caregiver
 * }
 * state.people.parentAssets    parents' savings (set when care first starts)
 */
import { bumpYearly, yearlyCount } from '../../core/State.js';
import { living, ageOf, byId, clampRel } from './People.js';
import { personDies } from './PeopleEngine.js';

/** Annual cost (today's dollars, Genworth/CareScout 2024 medians) and your time. */
export const ARRANGEMENTS = {
  self: { label: 'Care for them yourself', icon: '🫶', cost: { help: 4000, full: 9000 }, load: { help: 1, full: 2.5 }, stress: { help: 2, full: 6 }, desc: 'Unpaid — you shop, cook, drive and manage meds.' },
  moveIn: { label: 'Move them in with you', icon: '🏠', cost: { help: 3000, full: 7000 }, load: { help: 0.75, full: 2 }, stress: { help: 2, full: 5 }, desc: 'Cheaper, closer — and no escape.', needsHome: true },
  sibling: { label: 'A sibling takes the lead', icon: '🧑‍🤝‍🧑', cost: { help: 3000, full: 6000 }, load: { help: 0, full: 0 }, stress: { help: 0, full: 2 }, desc: 'You chip in money; they carry the load.' },
  aide: { label: 'Hire an in-home aide', icon: '🧑‍⚕️', cost: { help: 35000, full: 75000 }, load: { help: 0.25, full: 0.5 }, stress: { help: 1, full: 3 }, desc: 'Part-time for help; around-the-clock shifts for full care.' },
  assisted: { label: 'Assisted living', icon: '🏡', cost: { help: 64000, full: 64000 }, load: { help: 0.25, full: 0.25 }, stress: { help: 0, full: 0 }, desc: 'Apartment, meals and help with daily tasks.', helpOnly: true },
  nursing: { label: 'Nursing home', icon: '🏥', cost: { help: 105000, full: 105000 }, load: { help: 0.25, full: 0.25 }, stress: { help: 1, full: 2 }, desc: '24-hour skilled care. Medicaid pays once their savings are gone.', fullOnly: true, medicaid: true },
};

const PARENT_ASSETS = { low: [0, 20000], middle: [60000, 400000], upper: [800000, 3000000] };
const PARENT_INCOME = 20000;
export const POA_COST = 600;
export const GUARDIANSHIP_COST = 8000;
const RESPITE_COST = 3000;

export const careCases = (state) => Object.entries(state.elderCare?.cases ?? {}).map(([id, c]) => ({ person: byId(state, id), ...c })).filter((c) => c.person?.alive);

/** Arrangements open for a case. */
export function arrangementOptions(state, level) {
  const siblings = living(state).some((p) => p.relation === 'sibling' && ageOf(state, p) >= 25);
  const housed = !state.housing.withParents && Boolean(state.housing.rental || state.housing.properties.length);
  return Object.entries(ARRANGEMENTS).filter(([id, a]) => !(a.helpOnly && level === 'full') && !(a.fullOnly && level === 'help') && (id !== 'sibling' || siblings) && (!a.needsHome || housed) && !state.legal.incarceration).map(([id]) => id);
}

/** Can you manage this parent's money? */
export const hasAuthority = (state, id) => state.elderCare.poa.includes(id) || state.elderCare.guardianship.includes(id);

/** What this year of care costs you after their income and savings. */
export function careBill(state, c) {
  const a = ARRANGEMENTS[c.arrangement];
  const total = a.cost[c.level];
  if (c.arrangement === 'sibling') return { total, parentPays: 0, medicaid: 0, you: total };
  const assets = state.people.parentAssets ?? 0;
  const income = Math.min(total, PARENT_INCOME);
  // Nursing homes bill the resident, not the family: their income and savings, then Medicaid.
  if (a.medicaid) {
    const fromSavings = Math.min(assets, total - income);
    const medicaid = total - income - fromSavings;
    return { total, parentPays: income + fromSavings, fromSavings, medicaid, you: 0 };
  }
  // A competent parent pays their own way; an incapacitated one only through a POA or guardian.
  const canDraw = c.level === 'help' && !c.dementia ? true : hasAuthority(state, c.personId);
  const fromSavings = canDraw ? Math.min(assets, total - income) : 0;
  return { total, parentPays: income + fromSavings, fromSavings, medicaid: 0, you: Math.max(0, total - income - fromSavings) };
}

/* ------------------------------------------------------------------ */
/* Yearly                                                              */
/* ------------------------------------------------------------------ */

function needsTick(ctx) {
  const { state, rng } = ctx;
  const ec = state.elderCare;
  for (const parent of living(state).filter((p) => ['mother', 'father'].includes(p.relation))) {
    const age = ageOf(state, parent);
    if (age < 65) continue;
    const c = ec.cases[parent.id];
    const onset = age < 75 ? 0.03 : age < 85 ? 0.08 : 0.16;
    if (!c && rng.chance(onset)) {
      state.people.parentAssets ??= rng.int(...(PARENT_ASSETS[state.people.wealth] ?? PARENT_ASSETS.low));
      ec.cases[parent.id] = { personId: parent.id, level: 'help', dementia: false, arrangement: null, since: state.character.age };
      raise(ctx, parent, 'help', `${parent.firstName} (${age}) can't keep up anymore — missed bills, a fender-bender, an empty fridge. They need help.`);
    } else if (c?.level === 'help' && rng.chance(age < 85 ? 0.12 : 0.2)) {
      c.level = 'full';
      c.dementia = rng.chance(0.45);
      // Assisted living can't provide full-time care; they have to move.
      if (ARRANGEMENTS[c.arrangement]?.helpOnly) c.arrangement = null;
      raise(ctx, parent, 'full', c.dementia ? `${parent.firstName} was diagnosed with dementia and can't safely live alone.` : `After a bad fall, ${parent.firstName} needs help bathing, dressing and eating.`);
    }
  }
}

function raise(ctx, parent, level, text) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'elderCare.arrange' && p.data.personId === parent.id)) return;
  const c = state.elderCare.cases[parent.id];
  const options = arrangementOptions(state, level).map((id) => {
    const a = ARRANGEMENTS[id];
    const bill = careBill(state, { ...c, arrangement: id, level });
    return { id, label: `${a.icon} ${a.label}`, hint: `${a.desc} You pay ≈$${bill.you.toLocaleString()}/yr${a.load[level] >= 1 ? ' · big time commitment' : ''}` };
  });
  if (!options.length) {
    // You can't help (prison): the state places them.
    c.arrangement = level === 'full' ? 'nursing' : 'aide';
    ctx.log(`${text} You couldn't be there; they were placed in care.`, '🏥', 'warn');
    return;
  }
  ctx.prompt({ type: 'elderCare.arrange', icon: '👵', title: level === 'full' ? 'Full-Time Care Needed' : 'A Parent Needs Help', text, options, data: { personId: parent.id } });
}

function careTick(ctx) {
  const { state, rng } = ctx;
  const ec = state.elderCare;
  for (const [id, c] of Object.entries(ec.cases)) {
    const parent = byId(state, id);
    if (!parent?.alive) {
      delete ec.cases[id];
      continue;
    }
    if (!c.arrangement) continue;
    const a = ARRANGEMENTS[c.arrangement];
    const bill = careBill(state, c);
    if (bill.fromSavings) state.people.parentAssets = Math.max(0, state.people.parentAssets - bill.fromSavings);
    if (bill.you) ctx.spend(bill.you, `Elder care — ${parent.firstName}`, { allowDebt: true });
    if (bill.medicaid > 0 && !c.onMedicaid) {
      c.onMedicaid = true;
      ctx.log(`${parent.firstName}'s savings ran out; Medicaid now pays for the nursing home.`, '🏥');
    }
    // Hands-on caregiving: closer bond, real strain.
    if (a.stress[c.level]) ctx.stat('stress', a.stress[c.level]);
    if (['self', 'moveIn'].includes(c.arrangement)) {
      ec.caregiverYears += 1;
      parent.relationship = clampRel(parent.relationship + 3);
      ctx.stat('happiness', c.level === 'full' ? -3 : -1);
      if (ec.caregiverYears >= 3 && c.level === 'full') ctx.stat('health', -1);
      if (state.stats.stress >= 75 && rng.chance(0.4)) ctx.log(`Caring for ${parent.firstName} is wearing you down. Respite care or help from family might save you.`, '🥵', 'warn');
    }
    if (c.arrangement === 'sibling') {
      const sib = living(state).find((p) => p.relation === 'sibling');
      if (sib) sib.relationship = clampRel(sib.relationship - 2);
    }
    // Frailty and dementia shorten life.
    if (c.level === 'full' && rng.chance(c.dementia ? 0.12 : 0.1)) personDies(ctx, parent, c.dementia ? "Alzheimer's disease" : 'complications of frailty');
  }
}

export const ElderCare = {
  id: 'elderCare',
  order: 15,

  init(state) {
    state.elderCare ??= { cases: {}, poa: [], guardianship: [], caregiverYears: 0 };
  },

  onAgeUp(ctx) {
    if (!ctx.state.people || !ctx.state.character.alive) return;
    careTick(ctx);
    needsTick(ctx);
  },

  actions: {
    /** arg: "personId:arrangement" */
    arrange(ctx, arg) {
      const { state } = ctx;
      const [id, arrangement] = String(arg).split(':');
      const c = state.elderCare.cases[id];
      const parent = byId(state, id);
      if (!c || !parent?.alive || !arrangementOptions(state, c.level).includes(arrangement)) return;
      if (yearlyCount(state, `elderCare.arrange.${id}`)) return ctx.toast('You already changed their care this year.', 'warn');
      if (!placeIn(ctx, c, parent, arrangement)) return;
      bumpYearly(state, `elderCare.arrange.${id}`);
    },
    /** Durable power of attorney, while the parent can still sign. */
    poa(ctx, id) {
      const { state } = ctx;
      const parent = byId(state, id);
      if (!parent?.alive || !['mother', 'father'].includes(parent.relation) || hasAuthority(state, id)) return;
      const c = state.elderCare.cases[id];
      if (c?.dementia) return ctx.toast(`${parent.firstName} can no longer legally sign — you'd need a court guardianship.`, 'warn');
      if (parent.relationship < 40) return ctx.toast(`${parent.firstName} doesn't trust you with their affairs.`, 'warn');
      if (!ctx.spend(POA_COST, 'Power of attorney', { credit: true })) return ctx.toast(`An elder-law attorney charges $${POA_COST}.`, 'warn');
      state.elderCare.poa.push(id);
      ctx.log(`${parent.firstName} signed a durable power of attorney naming you. You can manage their finances and medical decisions if they can't.`, '📜', 'good');
    },
    guardianship(ctx, id) {
      const { state } = ctx;
      const parent = byId(state, id);
      const c = state.elderCare.cases[id];
      if (!parent?.alive || !c?.dementia || hasAuthority(state, id)) return;
      if (!ctx.spend(GUARDIANSHIP_COST, 'Guardianship petition', { credit: true })) return ctx.toast(`A guardianship case costs about $${GUARDIANSHIP_COST.toLocaleString()} in court and attorney fees.`, 'warn');
      state.elderCare.guardianship.push(id);
      ctx.log(`After months in probate court, a judge appointed you ${parent.firstName}'s guardian.`, '⚖️');
    },
    respite(ctx) {
      const { state } = ctx;
      if (!careCases(state).some((c) => ['self', 'moveIn'].includes(c.arrangement))) return;
      if (yearlyCount(state, 'elderCare.respite')) return ctx.toast('Already booked respite care this year.', 'warn');
      if (!ctx.spend(RESPITE_COST, 'Respite care', { credit: true })) return ctx.toast(`Respite care costs $${RESPITE_COST.toLocaleString()}.`, 'warn');
      bumpYearly(state, 'elderCare.respite');
      ctx.stat('stress', -15);
      ctx.stat('happiness', 3);
      ctx.log('A respite stay gave you two weeks to sleep, see friends and breathe.', '🌤️', 'good');
    },
  },

  resolvers: {
    arrange(ctx, data, optionId) {
      const { state } = ctx;
      const c = state.elderCare.cases[data.personId];
      const parent = byId(state, data.personId);
      if (!c || !parent?.alive) return;
      if (!placeIn(ctx, c, parent, optionId)) placeIn(ctx, c, parent, c.level === 'full' ? 'nursing' : 'aide', true);
    },
  },
};

/** Move a parent into an arrangement. Facilities for an incapacitated parent need legal authority. */
function placeIn(ctx, c, parent, arrangement, forced = false) {
  const { state, rng } = ctx;
  const a = ARRANGEMENTS[arrangement];
  if (arrangement === 'sibling') {
    const sib = living(state).filter((p) => p.relation === 'sibling').sort((x, y) => y.relationship - x.relationship)[0];
    if (!sib || !rng.chance(0.3 + sib.relationship / 150)) {
      if (sib) sib.relationship = clampRel(sib.relationship - 10);
      ctx.log(`${sib?.firstName ?? 'Your sibling'} said they can't take it on.`, '🙅', 'warn');
      return false;
    }
    sib.relationship = clampRel(sib.relationship - 5);
  }
  if (['assisted', 'nursing'].includes(arrangement) && c.dementia && !hasAuthority(state, c.personId) && !forced) {
    ctx.spend(GUARDIANSHIP_COST, 'Guardianship petition', { allowDebt: true });
    state.elderCare.guardianship.push(c.personId);
    ctx.log(`With no power of attorney, you had to go to court to become ${parent.firstName}'s guardian before you could move them ($${GUARDIANSHIP_COST.toLocaleString()}).`, '⚖️', 'warn');
  }
  c.arrangement = arrangement;
  if (['assisted', 'nursing'].includes(arrangement)) parent.relationship = clampRel(parent.relationship - 4);
  ctx.log(`${parent.firstName}: ${a.label.toLowerCase()}.`, a.icon);
  return true;
}
