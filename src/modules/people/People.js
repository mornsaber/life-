/**
 * People in your life. Every person lives in state.people.list:
 *
 *   { id, firstName, lastName, gender, relation, ageOffset, relationship 0–100,
 *     alive, diedAge?, income, sector, nationality, wealth?, custody?, since? }
 *
 * `ageOffset` is the person's age minus yours, so ages never need updating.
 * relation: mother · father · sibling · partner · fiance · spouse · ex · child · friend
 *
 * Pure helpers only (no module imports) so finances, retirement and housing
 * can read family data without import cycles.
 */

export const RELATION_LABEL = {
  mother: 'Mother', father: 'Father', sibling: 'Sibling', partner: 'Partner', fiance: 'Fiancé(e)',
  spouse: 'Spouse', ex: 'Ex-spouse', child: 'Child', friend: 'Friend', guardian: 'Guardian',
};

export const ageOf = (state, p) => state.character.age + p.ageOffset;
export const people = (state) => state.people?.list ?? [];
export const living = (state) => people(state).filter((p) => p.alive);
export const byId = (state, id) => people(state).find((p) => p.id === id) ?? null;
export const spouseOf = (state) => living(state).find((p) => p.relation === 'spouse') ?? null;
export const partnerOf = (state) => living(state).find((p) => ['partner', 'fiance', 'spouse'].includes(p.relation)) ?? null;
export const childrenOf = (state) => people(state).filter((p) => p.relation === 'child');
export const livingChildren = (state) => childrenOf(state).filter((p) => p.alive);
export const minorChildren = (state) => livingChildren(state).filter((c) => ageOf(state, c) < 18);
export const parentsOf = (state) => people(state).filter((p) => p.relation === 'mother' || p.relation === 'father');
export const isMarried = (state) => Boolean(spouseOf(state));
export const clampRel = (x) => Math.max(0, Math.min(100, Math.round(x)));

/** Household income a spouse brings in this year (salary or, after 65, retirement income). */
export function spouseIncome(state) {
  const s = spouseOf(state);
  return s ? s.income ?? 0 : 0;
}

/** A spouse's own Social Security benefit (annual), estimated from their earnings. */
export const spouseSocialSecurity = (person) => Math.round(Math.min(45000, (person.careerIncome ?? person.income ?? 0) * 0.4));

/** Spousal benefit: up to half of the higher earner's benefit (only while married or a qualifying ex/widow). */
export function spousalBenefit(state) {
  const s = spouseOf(state);
  return s ? Math.round(spouseSocialSecurity(s) * 0.5) : 0;
}

export const fullName = (p) => `${p.firstName} ${p.lastName}`;
