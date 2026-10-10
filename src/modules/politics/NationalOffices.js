/**
 * Elected offices abroad, on the same shape as Offices.js (salaries and
 * campaign costs in PPP dollars, 2025 pay scales). Local office (council,
 * mayor) uses the shared US entries; these cover provincial/regional
 * assemblies and executives, national parliaments and heads of government.
 *
 *   country    where the office exists
 *   provinces  only in these provinces (the UK's devolved parliaments)
 *   requires   an office you must hold to stand (party leaders come from the house)
 *   leader     chosen by the governing party in parliament, not by voters directly
 */

const legislative = { fullTime: true, pension: 'electedOfficials', kind: 'legislative' };
const executive = { fullTime: true, pension: 'electedOfficials', kind: 'executive', executive: true };

export const NATIONAL_OFFICES = {
  // Canada
  ca_mpp: { country: 'CA', name: 'Member of the Provincial Legislature (MPP/MLA)', icon: '🍁', level: 3, term: 4, termLimit: 0, salary: 97000, minAge: 18, residency: 0, cost: 150000, ...legislative },
  ca_premier: { country: 'CA', name: 'Premier', icon: '⭐', level: 4, term: 4, termLimit: 0, salary: 174000, minAge: 18, residency: 0, cost: 400000, requires: ['ca_mpp'], leader: true, ...executive },
  ca_mp: { country: 'CA', name: 'Member of Parliament (House of Commons)', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 175000, minAge: 18, residency: 0, cost: 250000, ...legislative },
  ca_pm: { country: 'CA', name: 'Prime Minister of Canada', icon: '🇨🇦', level: 5, term: 4, termLimit: 0, salary: 350000, minAge: 18, residency: 0, cost: 2000000, requires: ['ca_mp'], leader: true, statewide: true, ...executive },
  // United Kingdom
  gb_msp: { country: 'GB', provinces: ['GB-SCT'], name: 'Member of the Scottish Parliament', icon: '🏴', level: 3, term: 5, termLimit: 0, salary: 106000, minAge: 18, residency: 0, cost: 60000, ...legislative },
  gb_ms: { country: 'GB', provinces: ['GB-WLS'], name: 'Member of the Senedd', icon: '🐉', level: 3, term: 5, termLimit: 0, salary: 106000, minAge: 18, residency: 0, cost: 60000, ...legislative },
  gb_mla: { country: 'GB', provinces: ['GB-NIR'], name: 'Member of the Legislative Assembly (Stormont)', icon: '🏛️', level: 3, term: 5, termLimit: 0, salary: 80000, minAge: 18, residency: 0, cost: 50000, ...legislative },
  gb_firstMinister: { country: 'GB', provinces: ['GB-SCT', 'GB-WLS', 'GB-NIR'], name: 'First Minister', icon: '⭐', level: 4, term: 5, termLimit: 0, salary: 241000, minAge: 18, residency: 0, cost: 200000, requires: ['gb_msp', 'gb_ms', 'gb_mla'], leader: true, ...executive },
  gb_mp: { country: 'GB', name: 'Member of Parliament (House of Commons)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 138000, minAge: 18, residency: 0, cost: 90000, ...legislative },
  gb_pm: { country: 'GB', name: 'Prime Minister of the United Kingdom', icon: '🇬🇧', level: 5, term: 5, termLimit: 0, salary: 253000, minAge: 18, residency: 0, cost: 1500000, requires: ['gb_mp'], leader: true, statewide: true, ...executive },
  // Germany
  de_mdl: { country: 'DE', name: 'Member of the Landtag', icon: '🦅', level: 3, term: 5, termLimit: 0, salary: 147000, minAge: 18, residency: 0, cost: 80000, ...legislative },
  de_ministerpraesident: { country: 'DE', name: 'Ministerpräsident', icon: '⭐', level: 4, term: 5, termLimit: 0, salary: 278000, minAge: 18, residency: 0, cost: 400000, requires: ['de_mdl'], leader: true, ...executive },
  de_mdb: { country: 'DE', name: 'Member of the Bundestag', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 197000, minAge: 18, residency: 0, cost: 150000, ...legislative },
  de_kanzler: { country: 'DE', name: 'Bundeskanzler', icon: '🇩🇪', level: 5, term: 4, termLimit: 0, salary: 500000, minAge: 18, residency: 0, cost: 3000000, requires: ['de_mdb'], leader: true, statewide: true, ...executive },
  // Japan
  jp_prefAssembly: { country: 'JP', name: 'Prefectural Assembly Member', icon: '🗾', level: 3, term: 4, termLimit: 0, salary: 135000, minAge: 25, residency: 0, cost: 150000, ...legislative },
  jp_governor: { country: 'JP', name: 'Prefectural Governor', icon: '⭐', level: 4, term: 4, termLimit: 0, salary: 208000, minAge: 30, residency: 0, cost: 1500000, ...executive },
  jp_hor: { country: 'JP', name: 'Member of the House of Representatives', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 229000, minAge: 25, residency: 0, cost: 400000, ...legislative },
  jp_hoc: { country: 'JP', name: 'Member of the House of Councillors', icon: '🏛️', level: 4, term: 6, termLimit: 0, salary: 229000, minAge: 30, residency: 0, cost: 500000, ...legislative },
  jp_pm: { country: 'JP', name: 'Prime Minister of Japan', icon: '🇯🇵', level: 5, term: 3, termLimit: 0, salary: 417000, minAge: 25, residency: 0, cost: 2000000, requires: ['jp_hor'], leader: true, statewide: true, ...executive },
  // South Korea
  kr_provCouncil: { country: 'KR', name: 'Provincial Council Member', icon: '🇰🇷', level: 3, term: 4, termLimit: 0, salary: 72000, minAge: 18, residency: 0, cost: 120000, ...legislative },
  kr_governor: { country: 'KR', name: 'Governor / Metropolitan Mayor', icon: '⭐', level: 4, term: 4, termLimit: 3, salary: 169000, minAge: 18, residency: 0, cost: 1500000, ...executive },
  kr_assembly: { country: 'KR', name: 'Member of the National Assembly', icon: '🏛️', level: 4, term: 4, termLimit: 0, salary: 189000, minAge: 18, residency: 0, cost: 400000, ...legislative },
  kr_president: { country: 'KR', name: 'President of the Republic of Korea', icon: '🇰🇷', level: 5, term: 5, termLimit: 1, salary: 316000, minAge: 40, residency: 5, cost: 40000000, statewide: true, ...executive },
  // Italy
  it_regional: { country: 'IT', name: 'Regional Councillor', icon: '🇮🇹', level: 3, term: 5, termLimit: 0, salary: 156000, minAge: 18, residency: 0, cost: 120000, ...legislative },
  it_regionPresident: { country: 'IT', name: 'President of the Region', icon: '⭐', level: 4, term: 5, termLimit: 2, salary: 219000, minAge: 18, residency: 0, cost: 1200000, ...executive },
  it_deputato: { country: 'IT', name: 'Deputy (Camera dei Deputati)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 234000, minAge: 25, residency: 0, cost: 250000, ...legislative },
  it_senatore: { country: 'IT', name: 'Senator (Senato della Repubblica)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 234000, minAge: 40, residency: 0, cost: 300000, ...legislative },
  it_pm: { country: 'IT', name: 'President of the Council of Ministers', icon: '🇮🇹', level: 5, term: 5, termLimit: 0, salary: 360000, minAge: 25, residency: 0, cost: 2000000, requires: ['it_deputato', 'it_senatore'], leader: true, statewide: true, ...executive },
  // Mexico
  mx_dipLocal: { country: 'MX', name: 'State Deputy (Diputado local)', icon: '🇲🇽', level: 3, term: 3, termLimit: 4, salary: 95000, minAge: 21, residency: 0, cost: 200000, ...legislative },
  mx_gobernador: { country: 'MX', name: 'Governor (Gobernador)', icon: '⭐', level: 4, term: 6, termLimit: 1, salary: 143000, minAge: 30, residency: 5, cost: 3000000, ...executive },
  mx_dipFederal: { country: 'MX', name: 'Federal Deputy (Cámara de Diputados)', icon: '🏛️', level: 4, term: 3, termLimit: 4, salary: 143000, minAge: 21, residency: 0, cost: 400000, ...legislative },
  mx_senador: { country: 'MX', name: 'Senator (Senado de la República)', icon: '🏛️', level: 4, term: 6, termLimit: 2, salary: 171000, minAge: 25, residency: 0, cost: 1500000, ...legislative },
  mx_presidente: { country: 'MX', name: 'President of Mexico', icon: '🇲🇽', level: 5, term: 6, termLimit: 1, salary: 190000, minAge: 35, residency: 20, cost: 50000000, statewide: true, ...executive },
  // Philippines
  ph_boardMember: { country: 'PH', name: 'Provincial Board Member', icon: '🇵🇭', level: 3, term: 3, termLimit: 3, salary: 41000, minAge: 23, residency: 1, cost: 60000, ...legislative },
  ph_governor: { country: 'PH', name: 'Provincial Governor', icon: '⭐', level: 4, term: 3, termLimit: 3, salary: 77000, minAge: 23, residency: 1, cost: 600000, ...executive },
  ph_representative: { country: 'PH', name: 'District Representative (House)', icon: '🏛️', level: 4, term: 3, termLimit: 3, salary: 164000, minAge: 25, residency: 1, cost: 500000, ...legislative },
  ph_senator: { country: 'PH', name: 'Senator of the Philippines', icon: '🏛️', level: 4, term: 6, termLimit: 2, salary: 164000, minAge: 35, residency: 2, cost: 8000000, statewide: true, ...legislative },
  ph_president: { country: 'PH', name: 'President of the Philippines', icon: '🇵🇭', level: 5, term: 6, termLimit: 1, salary: 236000, minAge: 40, residency: 10, cost: 30000000, statewide: true, ...executive },
  // India
  in_mla: { country: 'IN', name: 'Member of the Legislative Assembly (MLA)', icon: '🇮🇳', level: 3, term: 5, termLimit: 0, salary: 109000, minAge: 25, residency: 0, cost: 300000, ...legislative },
  in_cm: { country: 'IN', name: 'Chief Minister', icon: '⭐', level: 4, term: 5, termLimit: 0, salary: 164000, minAge: 25, residency: 0, cost: 2000000, requires: ['in_mla'], leader: true, ...executive },
  in_mp: { country: 'IN', name: 'Member of Parliament (Lok Sabha)', icon: '🏛️', level: 4, term: 5, termLimit: 0, salary: 136000, minAge: 25, residency: 0, cost: 800000, ...legislative },
  in_pm: { country: 'IN', name: 'Prime Minister of India', icon: '🇮🇳', level: 5, term: 5, termLimit: 0, salary: 150000, minAge: 25, residency: 0, cost: 20000000, requires: ['in_mp'], leader: true, statewide: true, ...executive },
};

/** Local office (shared with the US list) that every country has. */
export const LOCAL_OFFICE_IDS = ['schoolBoard', 'cityCouncil', 'mayor', 'cityManager'];

/** The ladder shown on the Politics tab where you live. */
export function officeOrderFor(countryId, provinceId, usOrder) {
  if (countryId === 'US') return usOrder;
  const national = Object.entries(NATIONAL_OFFICES)
    .filter(([, o]) => o.country === countryId && (!o.provinces || o.provinces.includes(provinceId)))
    .sort((a, b) => a[1].level - b[1].level)
    .map(([id]) => id);
  return [...LOCAL_OFFICE_IDS, ...national];
}
