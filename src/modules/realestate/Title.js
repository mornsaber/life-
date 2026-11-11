/**
 * Title: how you hold a property, and who it goes to.
 *
 *   sole     yours alone; it passes by your will (or the law) when you die.
 *   joint    held with your spouse as joint tenants: it passes to whichever of you lives
 *            longer, outside the will and probate (survivorship).
 *   common   a share of it (tenancy in common), as when you and your siblings inherit the
 *            family home: your share passes by your will; a sale splits the proceeds.
 *   leaveTo  a specific bequest: this house to this person, ahead of the will's shares.
 *
 * Under coverture (world/SuccessionLaw.js) a married woman's property is held in her husband's
 * name: she can't put it in joint names, sell it alone, or leave it by her own will.
 *
 * property.title = { form, share, with, leaveTo, coOwners: [{ name, share }], since, how }
 */
import { successionLaw } from '../world/SuccessionLaw.js';
import { spouseOf, byId, fullName, living } from '../people/People.js';

export const titleOf = (p) => p?.title ?? { form: 'sole', share: 1 };
export const shareOf = (p) => titleOf(p).share ?? 1;
/** Held jointly with a spouse who is still alive (passes to them, not through the estate). */
export const passesBySurvivorship = (state, p) => (titleOf(p).form === 'joint' && Boolean(byId(state, titleOf(p).with)?.alive)) || undercoverture(state);
/** A married woman before the married women's property acts: her property is her husband's to hold. */
export const undercoverture = (state) => state.character?.gender === 'female' && Boolean(spouseOf(state)) && successionLaw(state).coverture;

/** People you can leave a property to. */
export const legatees = (state) => living(state).filter((p) => ['child', 'spouse', 'sibling', 'grandchild', 'mother', 'father'].includes(p.relation));

/** How the title reads, for the Home tab. */
export function titleLabel(state, p) {
  const t = titleOf(p);
  if (undercoverture(state)) return 'In your husband\'s name (coverture: a wife\'s property is her husband\'s to hold)';
  const leave = t.leaveTo ? byId(state, t.leaveTo) : null;
  const base = t.form === 'joint' ? `Joint, with ${byId(state, t.with)?.firstName ?? 'your spouse'} (passes to the survivor)`
    : t.form === 'common' ? `Your share: ${Math.round((t.share ?? 1) * 100)}%${t.coOwners?.length ? ` · with ${t.coOwners.map((o) => o.name).join(', ')}` : ''}`
      : 'In your name alone';
  return `${base}${leave?.alive ? ` · left to ${leave.firstName}` : ''}`;
}

export const TitleActions = {
  /** arg: propertyId — put a home in joint names with your spouse (or back into yours alone). */
  joint(ctx, id) {
    const { state } = ctx;
    const p = state.housing.properties.find((x) => x.id === id);
    const spouse = spouseOf(state);
    if (!p || !spouse) return ctx.toast('You need a spouse to hold it jointly.', 'warn');
    if (undercoverture(state)) return ctx.toast('A married woman cannot hold property in her own right here yet.', 'warn');
    const t = titleOf(p);
    if (t.form === 'common') return ctx.toast('You only own a share of this one.', 'warn');
    if (t.form === 'joint') { p.title = { ...t, form: 'sole', with: null }; return ctx.log(`Your ${p.typeName.toLowerCase()} is back in your name alone.`, '📜', 'info'); }
    if (!ctx.spend(400, 'Conveyancing: joint title', { credit: true })) return ctx.toast('The conveyancer charges $400.', 'warn');
    p.title = { ...t, form: 'joint', with: spouse.id, leaveTo: null };
    ctx.log(`You put your ${p.typeName.toLowerCase()} in joint names with ${spouse.firstName}: whoever lives longer keeps it.`, '📜', 'good');
  },
  /** arg: `${propertyId}:${personId}` (personId empty to clear) — leave this property to someone. */
  leave(ctx, arg) {
    const { state } = ctx;
    const [id, who] = String(arg).split(':');
    const p = state.housing.properties.find((x) => x.id === id);
    if (!p) return;
    if (undercoverture(state)) return ctx.toast('Your husband holds it: it isn\'t yours to leave.', 'warn');
    if (titleOf(p).form === 'joint') return ctx.toast('Held jointly, it goes to your spouse whatever the will says.', 'warn');
    const person = who ? byId(state, who) : null;
    p.title = { ...titleOf(p), leaveTo: person?.alive ? person.id : null };
    ctx.log(person ? `Your will now leaves your ${p.typeName.toLowerCase()} to ${fullName(person)}.` : `Your ${p.typeName.toLowerCase()} goes with the rest of the estate.`, '📜', 'info');
  },
};
