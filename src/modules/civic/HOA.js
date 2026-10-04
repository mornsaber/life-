/**
 * Homeowners' associations. Condos and luxury homes always have one; many
 * newer single-family subdivisions do too. Members pay dues, get fined for
 * breaking the covenants (CC&Rs), can run for the board — and can fight the
 * board when it overreaches. Unpaid fines become a lien and, eventually, a
 * lawsuit.
 *
 * state.civic.hoa = { propertyId, name, dues, board, president, boardYears,
 *                     fines, violations, fights, lawsuit }
 */
const HOA_NAMES = ['Willow Creek', 'Stonebridge Commons', 'Heritage Oaks', 'Lakeshore Villas', 'Maple Glen', 'The Reserve at Fox Run', 'Harbor Pointe', 'Sunset Ridge'];

export const VIOLATIONS = [
  { id: 'lawn', text: 'Your lawn is "more than 4 inches tall" per Section 7.2(b).', fix: 150 },
  { id: 'paint', text: 'Your front door color is not on the approved palette.', fix: 400 },
  { id: 'trash', text: 'Your trash cans were visible from the street on a non-collection day.', fix: 0 },
  { id: 'fence', text: 'Your new fence was installed without Architectural Review Committee approval.', fix: 2500 },
  { id: 'parking', text: 'A work truck was parked in your driveway overnight.', fix: 0 },
  { id: 'decor', text: 'Your holiday decorations stayed up past the January 15 deadline.', fix: 0 },
  { id: 'mailbox', text: 'Your mailbox post is the wrong shade of black.', fix: 180 },
  { id: 'flag', text: 'Your flag is larger than the 3×5 limit.', fix: 60 },
];

export const MONTHLY_FINE = [100, 250];
/** Fines past this become a lien on the home; past twice this, the HOA sues. */
export const LIEN_AT = 2500;

/** Does this home come with an HOA? (Decided once per property.) */
export function hoaFor(rng, property, typeHoa) {
  if (property.hoaChecked) return typeHoa > 0 || property.hoaDues > 0;
  property.hoaChecked = true;
  const inHoa = typeHoa > 0 || (['starter', 'family'].includes(property.type) && rng.chance(0.45));
  if (inHoa && !typeHoa) property.hoaDues = rng.pick([600, 900, 1200, 1800]);
  property.hoaName ??= inHoa ? `${rng.pick(HOA_NAMES)} HOA` : null;
  return inHoa;
}

export function newHoa(property, typeHoa) {
  return { propertyId: property.id, name: property.hoaName, dues: property.hoaDues ?? typeHoa, board: false, president: false, boardYears: 0, fines: 0, violations: 0, fights: 0, lawsuit: false };
}

/** Odds of winning a board seat at the annual meeting. */
export function boardOdds(state, neighborsRel) {
  return Math.max(0.1, Math.min(0.85, 0.3 + (neighborsRel - 50) / 120 + (state.stats.smarts - 50) / 300 + (state.civic.hoa.fights ? -0.1 : 0)));
}
