/**
 * Passports by kind: the ordinary passport of every country you're a citizen
 * of, and — while your work calls for it — an official (service) passport or a
 * diplomatic passport from the country you serve.
 *
 *   Diplomatic  diplomats and intelligence officers under official cover, heads of
 *               state and government, ministers, the Crown's representatives, the
 *               monarch's family on royal duties
 *   Official    other public servants and officers travelling for the state:
 *               national legislators, officials posted or seconded abroad, the
 *               armed forces on overseas service, senior national civil servants
 *
 * Official passports are surrendered when the job ends; diplomatic ones too. A
 * diplomatic passport smooths travel (no visa queues) but is not immunity: that
 * comes with accreditation at a post.
 */
import { COUNTRIES, citizenshipsOf } from './Countries.js';
import { OFFICES } from '../politics/Offices.js';
import { wasForeignMinister } from '../politics/Ministers.js';

const nationalOffice = (o) => o && (OFFICES[o.id]?.level ?? 0) >= 4 && OFFICES[o.id]?.statewide !== false;

/** The special passports you hold now: [{ kind, country, why }]. */
export function servicePassports(state) {
  const cc = state.character.countryId ?? 'US';
  const job = state.career.job;
  const o = state.politics?.office;
  const r = state.royal;
  const svc = state.military?.service;
  const out = [];
  const add = (kind, country, why) => { if (!out.some((p) => p.kind === kind && p.country === country)) out.push({ kind, country, why }); };
  // International civil servants travel on their organisation's laissez-passer; the Order of Malta issues its own passports.
  const LP = { unSecretariat: 'UN', unAgencies: 'UN', intlJustice: 'UN', euInstitutions: 'EU', intlFinance: 'UN' };
  if (job && LP[job.professionId]) add('laissezPasser', LP[job.professionId], `staff of the ${LP[job.professionId] === 'EU' ? 'European Union' : 'United Nations system'}`);
  const m = state.malta;
  if ((m?.office) || (job?.professionId === 'maltaDiplomacy' && job.abilities?.includes('diplomatic'))) add('diplomatic', 'SMOM', m?.office === 'grandMaster' ? 'the Prince and Grand Master' : m?.office ? 'the Sovereign Council' : 'an ambassador of the Order');
  // The Holy See: the Pope, cardinals in the Curia, its diplomats and senior officials travel on Vatican diplomatic passports.
  const hs = state.holySee;
  if (hs?.pope || (hs?.cardinal && ['romanCuria', 'holySeeDiplomacy'].includes(job?.professionId)) || (job?.professionId === 'holySeeDiplomacy' && job.abilities?.includes('diplomatic')) || (job?.professionId === 'romanCuria' && (job.grade ?? 0) >= 7)) add('diplomatic', 'HS', hs?.pope ? 'the Supreme Pontiff' : job?.professionId === 'holySeeDiplomacy' ? 'the Holy See\'s diplomatic service' : 'the Roman Curia');
  const intlJob = job && (LP[job.professionId] || ['nato', 'icrc', 'maltaRelief', 'maltaDiplomacy', 'holySeeDiplomacy', 'romanCuria', 'swissGuard', 'vaticanGendarmerie'].includes(job.professionId));
  if (job && !intlJob && (job.professionId === 'foreignService' || job.abilities?.includes('diplomatic') || job.posting?.immunity)) add('diplomatic', job.posting?.from ?? cc, job.posting?.immunity ? `accredited at ${job.posting.city}` : 'diplomatic service');
  if (o && (OFFICES[o.id]?.level ?? 0) >= 5) add('diplomatic', OFFICES[o.id].country ?? cc, OFFICES[o.id].name);
  if (o && /cabinet|_gg$|_lg$|au_governor/.test(o.id)) add('diplomatic', OFFICES[o.id].country ?? cc, OFFICES[o.id].name);
  if (r && (r.reigning || (r.working && r.line != null && r.line <= 4))) add('diplomatic', cc, r.reigning ? 'the sovereign' : 'royal duties');
  // For life: former heads of state and government, former foreign ministers, a former monarch, an emeritus pope.
  for (const h of state.politics?.history ?? []) {
    const def = OFFICES[h.officeId];
    if (def && ((def.level ?? 0) >= 5 && (def.leader || def.headOfState || def.ceremonial || h.officeId === 'president' || h.officeId === 'vicePresident'))) add('diplomatic', def.country ?? cc, `former ${def.name} (for life)`);
  }
  if (wasForeignMinister(state)) add('diplomatic', cc, 'a foreign minister, past or present');
  if (r?.abdicated || state.character.formerRoyal?.reigned) add('diplomatic', r?.crownId ?? cc, 'a former sovereign (for life)');
  if (hs?.emeritus) add('diplomatic', 'HS', 'Pope Emeritus');
  if (state.overseasPost) add('diplomatic', cc, state.overseasPost.title);
  if (!out.some((p) => p.kind === 'diplomatic' && !['SMOM', 'HS'].includes(p.country))) {
    if (o && nationalOffice(o) && (OFFICES[o.id]?.kind === 'legislative' || o.id.startsWith('us'))) add('official', OFFICES[o.id].country ?? cc, OFFICES[o.id].name);
    if ((job?.posting && !intlJob) || state.character.posting?.kind === 'secondment' || state.character.posting?.kind === 'mission') add('official', cc, job?.posting ? `posted to ${job.posting.city}` : 'secondment abroad');
    if (svc && (state.character.posting || svc.overseas || svc.deployed)) add('official', svc.nation ?? cc, 'overseas service with the armed forces');
    if (job && ['federal', 'national'].includes(job.sector) && (job.grade ?? 0) >= 9) add('official', cc, 'senior national public service');
  }
  return out;
}

/** Every passport: ordinary ones first. */
export function passportsOf(state) {
  return [...citizenshipsOf(state).map((c) => ({ kind: 'ordinary', country: c })), ...servicePassports(state)];
}

export const PASSPORT_LABEL = { ordinary: 'Passport', official: 'Official passport', diplomatic: 'Diplomatic passport', laissezPasser: 'Laissez-passer' };
export const PASSPORT_ICON = { ordinary: '🛂', official: '📘', diplomatic: '📕', laissezPasser: '🇺🇳' };
/** Issuers that aren't countries. */
export const ISSUERS = { UN: { flag: '🇺🇳', demonym: 'United Nations' }, EU: { flag: '🇪🇺', demonym: 'European Union' }, SMOM: { flag: '✠', demonym: 'Order of Malta' }, HS: { flag: '🇻🇦', demonym: 'Holy See' } };

export const PassportsModule = {
  id: 'passports',
  order: 90,
  onAgeUp(ctx) {
    const { state } = ctx;
    const now = servicePassports(state).map((p) => `${p.kind}:${p.country}`);
    const before = state.character.servicePassports ?? [];
    for (const k of now.filter((x) => !before.includes(x))) {
      const [kind, c] = k.split(':');
      ctx.log(`You were issued ${/^[AEIOU]/.test(COUNTRIES[c]?.demonym ?? ISSUERS[c]?.demonym ?? '') ? 'an' : 'a'} ${COUNTRIES[c]?.demonym ?? ISSUERS[c]?.demonym ?? ''} ${PASSPORT_LABEL[kind].toLowerCase()}.`.replace('  ', ' '), PASSPORT_ICON[kind], 'info');
    }
    for (const k of before.filter((x) => !now.includes(x))) {
      const [kind] = k.split(':');
      ctx.log(`You handed back your ${PASSPORT_LABEL[kind].toLowerCase()}.`, PASSPORT_ICON[kind], 'muted');
    }
    state.character.servicePassports = now;
  },
};
