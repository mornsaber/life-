/**
 * Official residences: where the state (or the Crown, or an international organisation) houses
 * the people at its top. Living in one means no rent and no mortgage; your own home waits.
 *
 *   The Crown          the sovereign at the palace; working royals and the heir in a royal
 *                      residence; a minor royal with a private income lives privately
 *   Heads of state     the White House, the Élysée, Rashtrapati Bhavan, Áras an Uachtaráin
 *   and government     Number 10, the Kantei, The Lodge, Premier House, 24 Sussex
 *   Vice-regal         Government House (Rideau Hall in Canada)
 *   Governors          the governor's mansion (US states)
 *   Ministers          a grace-and-favour house for a few great offices (Chevening, Dorneywood)
 *   Intl organisations the Secretary-General's residence (Sutton Place for the UN)
 *   The Church         the Apostolic Palace (the Pope), a bishop's house
 *
 * Pure helpers: HousingEngine reads officialResidence() for your housing status.
 */
import { CROWNS } from './Crown.js';
import { OFFICES } from '../politics/Offices.js';

const NAMED = {
  president: 'the White House', vicePresident: 'Number One Observatory Circle', governor: 'the Governor\'s Mansion',
  gb_pm: 'Number 10 Downing Street (and Chequers at weekends)', ca_pm: 'Rideau Cottage', au_pm: 'The Lodge, Canberra', nz_pm: 'Premier House, Wellington',
  in_pm: '7 Lok Kalyan Marg', jp_pm: 'the Sōri Kōtei (Prime Minister\'s residence)', de_kanzler: 'the Chancellery apartment', fr_president: 'the Élysée Palace',
  kr_president: 'the presidential residence at Yongsan', mx_presidente: 'the Palacio Nacional', ph_president: 'Malacañang Palace', it_presidente: 'the Quirinal Palace',
  in_president: 'Rashtrapati Bhavan', ie_president: 'Áras an Uachtaráin', il_president: 'Beit HaNassi', sg_president: 'the Istana',
  ca_gg: 'Rideau Hall', au_gg: 'Government House, Canberra (Yarralumla)', nz_gg: 'Government House, Wellington', au_governor: 'Government House',
  gb_firstMinister: 'the First Minister\'s official residence (Bute House)', cn_president: 'Zhongnanhai', es_presidente: 'the Moncloa Palace',
};

/** Where you live officially, if anywhere: { name, by } (by: who provides it). */
export function officialResidence(state) {
  const r = state.royal;
  if (r && !r.abdicated) {
    const palace = CROWNS[r.crownId]?.palace ?? 'the royal palace';
    if (r.reigning) return { name: palace, by: 'the Crown', icon: '🏰' };
    if (r.line === 1 || (r.working && !r.steppedBack)) return { name: r.line === 1 ? `the heir's residence near ${palace}` : `apartments at ${palace}`, by: 'the Crown', icon: '🏰' };
  }
  if (state.holySee?.pope) return { name: 'the Apostolic Palace (and Castel Gandolfo in summer)', by: 'the Holy See', icon: '⛪' };
  const o = state.politics?.office;
  if (o) {
    const def = OFFICES[o.id];
    const named = NAMED[o.id];
    if (named) return { name: named, by: 'the state', icon: '🏛️' };
    if (def?.headOfState || def?.ceremonial) return { name: 'the presidential residence', by: 'the state', icon: '🏛️' };
    if (def?.leader && (def.level ?? 0) >= 5) return { name: 'the head of government\'s official residence', by: 'the state', icon: '🏛️' };
  }
  const m = state.politics?.ministry;
  if (m?.residence) return { name: m.residence, by: 'the state', icon: '🏛️' };
  const job = state.career?.job;
  if (job && /Secretary[- ]General|Director-General|President of the (European Commission|World Bank)|Managing Director of the IMF/.test(job.title ?? '')) return { name: `the ${job.title.replace(/^the /, '')}'s official residence`, by: job.employer?.name ?? 'the organisation', icon: '🌐' };
  if (job && /Ambassador|Nuncio|High Commissioner/.test(job.title ?? '') && (job.posting || job.political)) return { name: `the ${/Nuncio/.test(job.title) ? 'Apostolic Nunciature' : /High Commissioner/.test(job.title) ? 'High Commissioner\'s residence' : 'Ambassador\'s residence'}${job.posting?.city ? ` in ${job.posting.city}` : ''}`, by: 'the foreign ministry', icon: '🏛️' };
  if (job && ['bishop', 'archbishop', 'cardinal'].includes(job.levelId) && /Clergy/.test(job.professionId ?? '')) return { name: job.levelId === 'bishop' ? 'the bishop\'s house' : 'the archbishop\'s palace', by: 'the diocese', icon: '⛪' };
  return null;
}
