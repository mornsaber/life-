/**
 * Who may own or run a business on the side, as configuration rather than
 * special cases in the UI.
 *
 * A rule: { canOwn, canOperate, requiresResignation, restricted: [businessTypeIds], note }
 *   canOwn       may hold an ownership stake while in this role
 *   canOperate   may run it day to day (otherwise a manager must)
 *   restricted   business types this role may not own at all (conflicts of interest)
 *
 * Rules come from the employment sector, then the profession, then your
 * situation (judges, active-duty service, full-time elected office).
 */
import { getProfession } from '../career/JobTrees.js';
import { OFFICES } from '../politics/Offices.js';

const POLICE_CONFLICTS = ['securityCompany', 'piAgency'];

export const SECTOR_RULES = {
  private: { canOwn: true, canOperate: false, note: 'Your employer has you full-time: a manager runs the business while you work.' },
  municipal: { canOwn: true, canOperate: false, note: 'Public employees may own a business but not run it on the clock.' },
  state: { canOwn: true, canOperate: false, note: 'State ethics rules: outside businesses must not conflict with your duties.' },
  federal: { canOwn: true, canOperate: false, note: 'Federal ethics rules: outside activity needs approval and can\'t touch your agency\'s work.' },
};

export const PROFESSION_RULES = {
  police: { restricted: POLICE_CONFLICTS },
  sheriff: { restricted: POLICE_CONFLICTS },
  statePolice: { restricted: POLICE_CONFLICTS },
  transitPolice: { restricted: POLICE_CONFLICTS },
  privatePolice: { restricted: ['securityCompany'] },
  fbi: { restricted: POLICE_CONFLICTS },
  dea: { restricted: POLICE_CONFLICTS },
  atf: { restricted: POLICE_CONFLICTS },
  usms: { restricted: POLICE_CONFLICTS },
  usss: { restricted: POLICE_CONFLICTS },
  prosecution: { restricted: ['lawFirm', 'piAgency'], note: 'Prosecutors can\'t run a private practice.' },
  publicDefender: { restricted: ['lawFirm'], note: 'Public defenders can\'t take private clients.' },
  courts: { restricted: ['lawFirm'] },
  regulatory: { restricted: ['brokerage', 'insuranceAgency', 'cpaFirm', 'consulting'], note: 'Regulators may not own businesses in industries they oversee.' },
  revenue: { restricted: ['cpaFirm', 'consulting'], note: 'Tax agents can\'t prepare returns on the side.' },
  oig: { restricted: ['piAgency', 'consulting'] },
  intelligence: { restricted: ['consulting', 'softwareShop', 'piAgency'], note: 'Cleared employees need agency approval for outside business — conflicts are refused.' },
  foreignService: { canOwn: true, restricted: ['consulting'], note: 'Diplomats may not do business in their host country.' },
  catholicClergy: { canOwn: false, note: 'Your diocese expects you to serve, not run a business.' },
  benefitsClaims: { restricted: ['consulting'] },
};

/** Situational overrides (who you are right now, beyond your job). */
function situationRules(state) {
  const out = [];
  if (state.judiciary?.seat) out.push({ canOperate: false, restricted: ['lawFirm', 'piAgency', 'consulting'], note: 'Judges may hold passive investments only.' });
  if (state.military?.service?.component === 'active') out.push({ canOperate: false, note: 'Active-duty service members can\'t run a business day to day.' });
  const office = state.politics?.office && OFFICES[state.politics.office.id];
  if (office?.fullTime) out.push({ canOperate: false, note: 'Full-time officials put businesses in the hands of managers.' });
  return out;
}

/**
 * The combined rule for owning (and running) `typeId` right now:
 * { canOwn, canOperate, restricted, reason } — reason explains a refusal.
 */
export function ownershipRules(state, typeId = null) {
  const job = state.career?.job;
  const profession = job && getProfession(job.professionId);
  const layers = [
    job ? SECTOR_RULES[job.sector] ?? SECTOR_RULES.private : { canOwn: true, canOperate: true },
    profession ? { ...PROFESSION_RULES[profession.id], ...profession.businessRules } : {},
    ...situationRules(state),
  ];
  const rule = { canOwn: true, canOperate: true, restricted: [], notes: [] };
  for (const l of layers) {
    if (l.canOwn === false) rule.canOwn = false;
    if (l.canOperate === false) rule.canOperate = false;
    if (l.restricted) rule.restricted.push(...l.restricted);
    if (l.note) rule.notes.push(l.note);
  }
  let reason = null;
  if (!rule.canOwn) reason = rule.notes.at(-1) ?? 'Your position doesn\'t allow owning a business';
  else if (typeId && rule.restricted.includes(typeId)) reason = `Conflict of interest: ${profession?.name ?? 'your position'} can't own this kind of business${rule.notes.length ? ` — ${rule.notes.at(-1)}` : ''}`;
  return { ...rule, ok: !reason, reason };
}
