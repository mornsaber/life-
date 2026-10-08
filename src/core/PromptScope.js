/**
 * Prompts that belong to a position — your job, your military service or
 * your elected office — stop making sense once that position ends. Each such
 * prompt is stamped with the position it was raised for; when you are fired,
 * removed, discharged or voted out, it is dropped instead of lingering (and
 * acting on whatever job you hold next).
 *
 * A prompt raised while you held no such position (an interview, an
 * enlistment form, a campaign debate) is never dropped.
 */

const JOB_TYPES = new Set([
  'career.cbaVote', 'career.chooseTrack', 'career.laborDispute', 'career.mgmtHiring', 'career.mgmtLeave', 'career.mgmtReview', 'career.mgmtScheduling',
  'career.organizingDrive', 'career.outsidePromotion', 'career.promotionReview', 'career.relocationOffer', 'career.strike', 'career.vendor', 'career.wildcat', 'career.workEvent',
  'federal.event', 'federal.posting', 'federal.policy', 'municipal.budget', 'stateAgencies.event', 'municipal.event', 'justiceJobs.event', 'transport.event', 'transport.recall',
  'intel.cover', 'intel.event', 'intel.station', 'contractors.event', 'healthScience.grant', 'healthScience.scooped', 'jobMarket.rto', 'claims.incident',
  'publicservice.oralAssessment', 'orgs.postOffer', 'health.duty', 'health.disabling', 'academia.dossier', 'publishing.review', 'publishing.editor',
  'medicine.claim', 'medicine.fellowship', 'medLife.residencyEvent', 'medLife.practice', 'medLife.partner', 'medLife.buyout', 'medLife.burnout', 'medLife.moc', 'medLife.pillMill', 'medLife.patientEvent',
]);
const SERVICE_TYPES = new Set([
  'military.branchDetail', 'military.brs', 'military.combat', 'military.commandOffer', 'military.contractEnd', 'military.courtMartial', 'military.dutyEvent', 'military.dutySelection',
  'military.leaveService', 'military.njpOffer', 'military.overseasOrders', 'military.schoolSeat', 'military.selectionPhase', 'military.sofMission', 'military.topPost', 'military.tap',
  'service.guardMission', 'service.governorActivation',
]);
const OFFICE_TYPES = new Set(['politics.decision', 'politics.bribe', 'politics.reelection', 'politics.appoint', 'politics.donorFavor', 'politics.disaster']);

/** Which position each kind of prompt belongs to, and how to identify it. */
const SCOPES = {
  job: {
    types: JOB_TYPES,
    key: (s) => {
      const j = s.career?.job;
      return j ? `${j.employer.id}${j.headOf ? `@${j.headOf.orgId}/${j.headOf.deptId ?? ''}` : ''}` : null;
    },
    what: 'job',
  },
  service: { types: SERVICE_TYPES, key: (s) => (s.military?.service ? `${s.military.service.branch}:${s.military.service.joinedAge}` : null), what: 'service' },
  office: { types: OFFICE_TYPES, key: (s) => (s.politics?.office ? `${s.politics.office.id}:${s.politics.office.startAge}` : null), what: 'office' },
};

export const scopeOfType = (type) => Object.keys(SCOPES).find((k) => SCOPES[k].types.has(type)) ?? null;

/** Stamp a new prompt with the position it belongs to (if any). */
export function stampPrompt(state, prompt) {
  const scope = scopeOfType(prompt.type);
  if (!scope) return;
  const key = SCOPES[scope].key(state);
  if (key) prompt.scope = { [scope]: key };
}

/** True when the position the prompt was raised for no longer exists. */
export function isStale(state, prompt) {
  if (!prompt.scope) return false;
  return Object.entries(prompt.scope).some(([scope, key]) => SCOPES[scope] && SCOPES[scope].key(state) !== key);
}

/** Drop stale prompts. Returns the dropped prompts. */
export function pruneStalePrompts(state) {
  const stale = state.prompts.filter((p) => isStale(state, p));
  if (stale.length) state.prompts = state.prompts.filter((p) => !stale.includes(p));
  return stale;
}
