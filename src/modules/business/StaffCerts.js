/**
 * Licenses and certifications your employees hold.
 *
 * Contracts that need a credential (hazmat endorsements, a CDL, school-bus
 * endorsements, paramedics, wildland firefighters) are staffed by certified
 * employees — the owner doesn't have to hold it. You pay to certify a crew;
 * turnover erodes it each year, and management recertifies on its own.
 *
 * Named employees carry their own credentials (from their career) and show
 * them on the positions chart.
 *
 * biz.certs = { [credentialId]: holders }
 */
import { credentialName, CREDENTIALS } from '../credentials/CredentialRegistry.js';
import { OPERATIONS, capacity } from './Operations.js';
import { charge } from './TaxBook.js';

const money = (x) => `$${Math.round(x).toLocaleString()}`;

/** Credentials this kind of business's contracts can ask for. */
export function endorsementsFor(typeId) {
  const o = OPERATIONS[typeId];
  return [...new Set((o?.clients ?? []).map((c) => c[3]?.needs).filter(Boolean))];
}

/** What certifying one employee costs (training, exam, time off the road). */
export const certCost = (id) => Math.round(Math.max(800, (CREDENTIALS[id]?.cost ?? 1000) * 1.4 + 600));

/** Crew members who'd need the credential: everyone doing the work. */
export const crewSize = (biz) => {
  const o = OPERATIONS[biz.typeId];
  return o ? Math.max(1, capacity(biz).units * o.crew) : Math.max(1, biz.staff.headcount);
};

/**
 * First look: an established business (or one whose owner holds the credential and trained the
 * crew) starts certified; a brand-new one starts without.
 */
export function ensureCerts(biz, ownerHolds = () => false) {
  if (biz.certs) return biz.certs;
  biz.certs = {};
  for (const id of endorsementsFor(biz.typeId)) biz.certs[id] = (biz.years ?? 0) >= 2 || ownerHolds(id) ? crewSize(biz) : 0;
  return biz.certs;
}

/** Enough certified people to staff a contract of `units`. */
export function certifiedFor(biz, id, units = 1) {
  const per = OPERATIONS[biz.typeId]?.crew ?? 1;
  return (ensureCerts(biz)[id] ?? 0) >= Math.max(1, units * per);
}

/** Certify the whole crew for a credential. */
export function certifyCrew(ctx, biz, id) {
  if (!endorsementsFor(biz.typeId).includes(id)) return;
  ensureCerts(biz);
  const need = Math.max(0, crewSize(biz) - (biz.certs[id] ?? 0));
  if (!need) return ctx.toast('Your whole crew already holds it.', 'info');
  const cost = need * certCost(id);
  if (biz.cash < cost) return ctx.toast(`Certifying ${need} people costs ${money(cost)}.`, 'warn');
  charge(biz, cost);
  biz.certs[id] = (biz.certs[id] ?? 0) + need;
  ctx.log(`${biz.name} put ${need} ${need === 1 ? 'person' : 'people'} through ${credentialName(id)} training (${money(cost)}).`, CREDENTIALS[id]?.icon ?? '📜', 'good');
}

/** The year: turnover takes certified people with it; management keeps the crew certified. */
export function certsYear(ctx, biz) {
  if (!OPERATIONS[biz.typeId]) return;
  ensureCerts(biz);
  const crew = crewSize(biz);
  for (const id of Object.keys(biz.certs)) {
    biz.certs[id] = Math.min(crew, Math.floor(biz.certs[id] * 0.9));
    // Contracts that need it keep it topped up; a hands-off business's managers do it themselves.
    const inUse = (biz.ops?.contracts ?? []).some((c) => c.needs === id);
    if ((inUse || biz.autopilot) && biz.certs[id] < crew && biz.certs[id] > 0) {
      const top = crew - biz.certs[id];
      if (biz.cash > top * certCost(id) * 2) {
        charge(biz, top * certCost(id));
        biz.certs[id] = crew;
      }
    }
  }
}

/** Credentials a named employee holds: what their rung of their career requires. */
export function personCreds(p, getProfession, levelById) {
  const prof = p.professionId && getProfession(p.professionId);
  const level = prof && p.levelId ? levelById(prof, p.levelId) : null;
  return [...new Set([...(level?.req?.credentials ?? []), ...(p.creds ?? [])])].filter((id) => id !== 'driverLicense').map((id) => credentialName(id));
}
