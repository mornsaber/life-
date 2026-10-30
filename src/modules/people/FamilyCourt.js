/**
 * Family courts: the fights families take to a judge.
 *
 *   Custody      after a divorce, a parent with less time can petition for more: a lawyer, a
 *                guardian ad litem's report, and a judge who looks at your home, your job, your
 *                record and how the child is doing. Mediation is cheaper and kinder.
 *   Adoption     before an adoption goes through, a social worker's home study.
 *   Wills        when a sibling contests your parents' will: fight it, settle, or let it go.
 *
 * child.custodyPetitions, state.people.expecting.homeStudy
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, hasFelony, isIncarcerated } from '../../core/State.js';
import { minorChildren, living, byId } from './People.js';
import { priceLevel } from '../world/Countries.js';
import { housingStatus } from '../realestate/HousingEngine.js';

const local = (state, n) => Math.round(n * priceLevel(state));
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 27449 + state.character.age * 571 + 0xfc7) >>> 0);
const CUSTODY = ['ex', 'joint', 'you'];

/** How a judge sees you as a parent, 0–1. */
export function parentStanding(state, child) {
  let s = 0.45 + ((child.relationship ?? 60) - 60) / 150;
  if (state.career.job) s += 0.08;
  if (['owner', 'renting'].includes(housingStatus(state))) s += 0.07;
  if (hasFelony(state)) s -= 0.25;
  if (isIncarcerated(state)) s -= 0.6;
  if (state.health?.conditions?.some((c) => !c.remission && ['alcohol', 'opioids', 'stimulants'].includes(c.id))) s -= 0.2;
  return clamp(s, 0.02, 0.9);
}

export function familyCourtTick(main) {
  const { state } = main;
  const p = state.people;
  if (!p) return;
  const rng = sideRng(state);
  // A home study for an adoption on its way.
  if (p.expecting?.adopted && !p.expecting.homeStudy && !state.prompts.some((x) => x.type === 'familyCourt.homeStudy')) {
    p.expecting.homeStudy = 'pending';
    main.prompt({ type: 'familyCourt.homeStudy', icon: '🏡', title: 'The Home Study', text: 'A social worker will visit three times, interview you, check references and your finances, and write a report for the court.', data: {}, options: [
      { id: 'prepare', label: '🧹 Prepare thoroughly: childproof, paperwork, references', hint: `≈$${local(state, 1500).toLocaleString()}` },
      { id: 'natural', label: '🙂 Be yourselves' },
    ] });
  }
}

export const FamilyCourtResolvers = {
  homeStudy(ctx, data, optionId) {
    const { state, rng } = ctx;
    const e = state.people.expecting;
    if (!e?.adopted) return;
    if (optionId === 'prepare') ctx.spend(local(state, 1500), 'Home study preparation');
    if (hasFelony(state) && rng.chance(0.7)) { state.people.expecting = null; return ctx.log('The home study report noted your criminal record. The court did not approve the adoption.', '📋', 'bad'); }
    if (rng.chance(optionId === 'prepare' ? 0.92 : 0.75)) { e.homeStudy = 'approved'; return ctx.log('The home study was approved. The social worker wrote that the child would be "safe and loved".', '📋', 'good'); }
    e.homeStudy = 'approved';
    e.due = (e.due ?? state.character.age) + 1;
    ctx.log('The home study asked for changes and a second visit. The adoption is delayed a year.', '📋', 'warn');
  },
  custody(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = byId(state, data.childId);
    if (!c || !c.alive) return;
    const ex = byId(state, c.otherParentId);
    const idx = CUSTODY.indexOf(c.custody ?? 'ex');
    if (optionId === 'mediate') {
      ctx.spend(local(state, 1500), 'Family mediation');
      if (rng.chance(0.55 + (ex ? (ex.relationship ?? 30) / 300 : 0))) { c.custody = idx < 1 ? 'joint' : c.custody; if (ex) ex.relationship = Math.min(100, (ex.relationship ?? 30) + 6); return ctx.log(`Mediation worked: you and ${ex?.firstName ?? 'your ex'} agreed a new parenting plan.`, '🤝', 'good'); }
      return ctx.log('Mediation broke down after two sessions.', '🤝', 'warn');
    }
    ctx.spend(local(state, 12000), 'Custody lawyer', { allowDebt: true });
    ctx.stat('stress', 10);
    if (ex) ex.relationship = Math.max(0, (ex.relationship ?? 30) - 15);
    const won = rng.chance(parentStanding(state, c));
    if (won && idx < 2) { c.custody = CUSTODY[idx + 1]; return ctx.log(`After the guardian ad litem's report, the judge ruled in your favour: ${c.firstName}'s custody is now ${c.custody === 'you' ? 'with you' : 'shared'}.`, '⚖️', 'good'); }
    c.relationship = Math.max(0, c.relationship - 4);
    ctx.log(`The judge left the arrangement as it was. ${c.firstName} had to talk to a stranger about which parent they loved more.`, '⚖️', 'bad');
  },
  will(ctx, data, optionId) {
    const { state, rng } = ctx;
    const sib = byId(state, data.siblingId);
    if (optionId === 'fight') {
      ctx.spend(Math.round(data.share * 0.15), 'Probate litigation', { allowDebt: true });
      if (sib) sib.relationship = Math.max(0, (sib.relationship ?? 50) - 30);
      if (rng.chance(0.6)) return ctx.log(`The court upheld the will. ${sib?.firstName ?? 'Your sibling'} hasn't spoken to you since.`, '⚖️', 'warn');
      ctx.spend(Math.round(data.share * 0.4), 'Estate share lost on appeal', { allowDebt: true });
      return ctx.log(`The court found your parent had been unduly influenced. You lost a large part of your share — and your ${sib ? sib.firstName : 'sibling'}.`, '⚖️', 'bad');
    }
    if (optionId === 'settle') { ctx.spend(Math.round(data.share * 0.2), `Settlement with ${sib?.firstName ?? 'your sibling'}`, { allowDebt: true }); if (sib) sib.relationship = Math.max(0, (sib.relationship ?? 50) - 5); return ctx.log('You settled out of court. It wasn\'t fair. It was over.', '🤝', 'info'); }
    ctx.spend(Math.round(data.share * 0.5), `Half your share to ${sib?.firstName ?? 'your sibling'}`, { allowDebt: true });
    if (sib) sib.relationship = Math.min(100, (sib.relationship ?? 50) + 10);
    ctx.log(`You gave ${sib?.firstName ?? 'your sibling'} half your share to keep the peace.`, '🕊️', 'info');
  },
};

export const FamilyCourtActions = {
  /** Petition for more time with a child (arg: childId). */
  petition(ctx, childId) {
    const { state } = ctx;
    const c = minorChildren(state).find((k) => k.id === childId);
    if (!c || !['ex', 'joint'].includes(c.custody)) return ctx.toast('Only for a child who lives mostly with their other parent', 'warn');
    if (yearlyCount(state, `familyCourt.${childId}`)) return ctx.toast('One petition a year', 'warn');
    bumpYearly(state, `familyCourt.${childId}`);
    ctx.prompt({ type: 'familyCourt.custody', icon: '⚖️', title: `Custody of ${c.firstName}`, text: `You want more time with ${c.firstName}. A judge will weigh your home, your work, your record and how ${c.firstName} is doing. (How a court sees you: ${Math.round(parentStanding(state, c) * 100)}%.)`, data: { childId }, options: [
      { id: 'mediate', label: '🤝 Try mediation first', hint: `≈$${Math.round(1500 * priceLevel(state)).toLocaleString()} · kinder, joint at best` },
      { id: 'court', label: '⚖️ File a petition with a lawyer', hint: `≈$${Math.round(12000 * priceLevel(state)).toLocaleString()} · it will get ugly` },
    ] });
  },
};

export const FamilyCourtModule = {
  id: 'familyCourt',
  order: 9.7,
  setup(engine) {
    engine.bus.on('people:estateShare', ({ ctx, share }) => {
      const sib = living(ctx.state).filter((x) => x.relation === 'sibling').sort((a, b) => (a.relationship ?? 50) - (b.relationship ?? 50))[0];
      if (!sib || !sideRng(ctx.state).chance((sib.relationship ?? 50) < 40 ? 0.45 : 0.12)) return;
      ctx.prompt({ type: 'familyCourt.will', icon: '📜', title: 'The Will Is Contested', text: `${sib.firstName} is challenging your parents' will, saying you pressured them in their last years.`, data: { siblingId: sib.id, share }, options: [
        { id: 'fight', label: '⚖️ Defend it in court', hint: 'Lawyers cost a share of the estate' },
        { id: 'settle', label: '🤝 Settle quietly', hint: 'Give up a fifth' },
        { id: 'concede', label: '🕊️ Give them half to keep the family together' },
      ] });
    });
  },
  onAgeUp: familyCourtTick,
  actions: FamilyCourtActions,
  resolvers: FamilyCourtResolvers,
};
