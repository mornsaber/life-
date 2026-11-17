/**
 * A colony's own forces: in a territory ruled from abroad, the army you join is the colony's,
 * raised locally under the ruler's officers, not the national army it became at independence.
 *
 *   British India     the East India Company's armies, the Presidency armies (to 1895), the
 *                     Indian Army (the "British Indian Army"), with the Royal Indian Marine and
 *                     later the Royal Indian Navy and the Indian Air Force: sepoys, naiks and
 *                     havildars; the Viceroy's commissioned officers (jemadar, subedar)
 *   British Africa    the King's African Rifles (East Africa), the (Royal) West African Frontier
 *                     Force (West Africa): askaris, colour sergeants and effendis
 *   French empire     the tirailleurs (sénégalais, algériens, tunisiens, marocains, indochinois,
 *                     malgaches): caporal, sergent, adjudant under French officers
 *   Others            the KNIL (Dutch East Indies), the Force Publique (Belgian Congo), the
 *                     Schutztruppe (German Africa, to 1918), the ascari of the Regio Corpo
 *                     Truppe Coloniali (Italian Africa), the Regulares (Spanish Morocco), the
 *                     Philippine Scouts (American Philippines), the Portuguese colonial army
 *
 * A colony has an army, and seldom anything else (India's navy and air force are the exceptions).
 * Officers are the ruler's: titles and insignia follow the ruling country (Ui Insignia.js).
 * The hooks are set into world/Eras.js (periodBranch, periodRank) so the military engine names
 * things right without knowing about colonies.
 */
import { colonyStage, getEraState, yearNow, setColonialHooks } from './Eras.js';

const NON_COLONIAL = ['RU', 'TR', 'AT', 'SE', 'CN', 'DK'];
/** The colony's ruler in the year, for a colony actually ruled from abroad (not a home province). */
export function colonialRuler(state, cc) {
  if (!state?.era || !cc) return null;
  const st = colonyStage(state, cc);
  if (!st?.ruler || st.ruler === cc || NON_COLONIAL.includes(st.ruler)) return null;
  return st.ruler;
}

const EAST_AFRICA = ['KE', 'UG', 'TZ', 'MW', 'ZM', 'SO'];
const WEST_AFRICA = ['NG', 'GH', 'SL', 'GM'];
const FR_WEST = ['SN', 'ML', 'CI', 'GN', 'BF', 'NE', 'BJ', 'MR', 'TG', 'CM', 'TD', 'CF', 'CG', 'GA', 'DJ', 'KM'];
const INDOCHINA = ['VN', 'LA', 'KH'];
const BRITISH_INDIA = ['IN', 'PK', 'BD', 'MM'];

const RANKS = {
  // The top of a sepoy's ladder is the Viceroy's commission: jemadar, subedar, subedar-major.
  sepoy: { enlisted: ['Sepoy', 'Lance Naik', 'Naik', 'Havildar', 'Havildar-Major', 'Jemadar (VCO)', 'Subedar (VCO)', 'Subedar-Major (VCO)', 'Honorary Captain'], warrant: ['Jemadar', 'Subedar', 'Subedar-Major'] },
  gurkha: { enlisted: ['Rifleman', 'Lance Naik', 'Naik', 'Havildar', 'Havildar-Major', 'Jemadar (VCO)', 'Subedar (VCO)', 'Subedar-Major (VCO)', 'Honorary Captain'], warrant: ['Jemadar', 'Subedar', 'Subedar-Major'] },
  askari: { enlisted: ['Askari', 'Lance Corporal', 'Corporal', 'Sergeant', 'Colour Sergeant', 'Company Sergeant-Major', 'Regimental Sergeant-Major'], warrant: ['Effendi', 'Effendi (Senior)', 'Effendi (Senior)'] },
  tirailleur: { enlisted: ['Tirailleur de 2e classe', 'Tirailleur de 1re classe', 'Caporal', 'Caporal-chef', 'Sergent', 'Sergent-chef', 'Adjudant', 'Adjudant-chef'], warrant: ['Sous-lieutenant indigène', 'Lieutenant indigène', 'Lieutenant indigène'] },
  knil: { enlisted: ['Soldaat', 'Soldaat der 1e klasse', 'Korporaal', 'Sergeant', 'Sergeant-majoor', 'Adjudant-onderofficier'], warrant: ['Adjudant', 'Adjudant', 'Adjudant'] },
  forcePublique: { enlisted: ['Soldat', 'Soldat de 1re classe', 'Caporal', 'Sergent', 'Premier sergent', 'Sergent-major', 'Adjudant'], warrant: ['Adjudant', 'Adjudant', 'Adjudant'] },
  schutztruppe: { enlisted: ['Askari', 'Gefreiter', 'Ombascha (Corporal)', 'Schausch (Sergeant)', 'Betschausch (Sergeant-Major)'], warrant: ['Effendi', 'Effendi', 'Effendi'] },
  ascari: { enlisted: ['Ascari', 'Muntaz', 'Buluk-basci', 'Sciumbasci', 'Sciumbasci capo'], warrant: ['Sciumbasci capo', 'Sciumbasci capo', 'Sciumbasci capo'] },
  regulares: { enlisted: ['Soldado regular', 'Cabo', 'Sargento', 'Sargento primero', 'Brigada'], warrant: ['Alférez indígena', 'Alférez indígena', 'Alférez indígena'] },
  scouts: { enlisted: ['Private', 'Private First Class', 'Corporal', 'Sergeant', 'Staff Sergeant', 'First Sergeant', 'Master Sergeant'], warrant: ['Warrant Officer', 'Warrant Officer', 'Warrant Officer'] },
  portuguese: { enlisted: ['Soldado', 'Primeiro-cabo', 'Furriel', 'Segundo-sargento', 'Primeiro-sargento', 'Sargento-ajudante'], warrant: ['Sargento-chefe', 'Sargento-mor', 'Sargento-mor'] },
};
/** The ruler's officer ranks (company officers to generals). */
const OFFICERS = {
  GB: ['Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant-Colonel', 'Colonel', 'Brigadier', 'Major-General', 'Lieutenant-General', 'General'],
  FR: ['Sous-lieutenant', 'Lieutenant', 'Capitaine', 'Commandant', 'Lieutenant-colonel', 'Colonel', 'Général de brigade', 'Général de division', 'Général de corps d\'armée', 'Général d\'armée'],
  NL: ['Tweede luitenant', 'Eerste luitenant', 'Kapitein', 'Majoor', 'Luitenant-kolonel', 'Kolonel', 'Generaal-majoor', 'Luitenant-generaal', 'Luitenant-generaal', 'Generaal'],
  BE: ['Sous-lieutenant', 'Lieutenant', 'Capitaine', 'Capitaine-commandant', 'Major', 'Lieutenant-colonel', 'Colonel', 'Général-major', 'Lieutenant-général', 'Lieutenant-général'],
  DE: ['Leutnant', 'Oberleutnant', 'Hauptmann', 'Major', 'Oberstleutnant', 'Oberst', 'Generalmajor', 'Generalleutnant', 'General', 'Generaloberst'],
  IT: ['Sottotenente', 'Tenente', 'Capitano', 'Maggiore', 'Tenente colonnello', 'Colonnello', 'Generale di brigata', 'Generale di divisione', 'Generale di corpo d\'armata', 'Generale d\'armata'],
  ES: ['Alférez', 'Teniente', 'Capitán', 'Comandante', 'Teniente coronel', 'Coronel', 'General de brigada', 'General de división', 'Teniente general', 'Capitán general'],
  PT: ['Alferes', 'Tenente', 'Capitão', 'Major', 'Tenente-coronel', 'Coronel', 'Brigadeiro', 'General', 'General', 'Marechal'],
  US: ['Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier General', 'Major General', 'Lieutenant General', 'General'],
};

/** The colony's force this year: { army, navy?, airforce?, ranks, officers, ruler } or null. */
export function colonialForce(state, cc = state?.character?.countryId ?? 'US') {
  const ruler = colonialRuler(state, cc);
  if (!ruler) return null;
  const y = yearNow(state);
  const f = { ruler, officers: OFFICERS[ruler] ?? OFFICERS.GB, ranks: RANKS.sepoy, navy: null, airforce: null };
  if (ruler === 'GB' && BRITISH_INDIA.includes(cc) && !(cc === 'MM' && y >= 1937)) {
    f.army = y < 1858 ? 'the East India Company\'s Army' : y < 1895 ? `the ${cc === 'IN' ? 'Bengal' : 'Bombay'} Army` : 'the Indian Army';
    f.navy = y < 1934 ? 'the Royal Indian Marine' : 'the Royal Indian Navy';
    f.airforce = y >= 1932 ? (y < 1945 ? 'the Indian Air Force' : 'the Royal Indian Air Force') : null;
  } else if (ruler === 'GB' && cc === 'MM') { f.army = 'the Burma Rifles'; f.ranks = RANKS.sepoy; }
  else if (ruler === 'GB' && EAST_AFRICA.includes(cc)) { f.army = y >= 1902 ? 'the King\'s African Rifles' : 'the East African Rifles'; f.ranks = RANKS.askari; }
  else if (ruler === 'GB' && WEST_AFRICA.includes(cc)) { f.army = y >= 1928 ? 'the Royal West African Frontier Force' : y >= 1900 ? 'the West African Frontier Force' : `the ${cc === 'NG' ? 'Lagos Hausa Force' : 'Gold Coast Constabulary'}`; f.ranks = RANKS.askari; }
  else if (ruler === 'GB' && cc === 'SD') { f.army = y >= 1925 ? 'the Sudan Defence Force' : 'the Egyptian Army in the Sudan'; f.ranks = RANKS.askari; }
  else if (ruler === 'GB' && cc === 'MY') { f.army = y >= 1933 ? 'the Malay Regiment' : 'the Malay States Guides'; f.ranks = RANKS.scouts; f.officers = OFFICERS.GB; }
  else if (ruler === 'GB') { f.army = `the ${shortName(cc)} Defence Force`; f.ranks = { enlisted: ['Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Colour Sergeant', 'Company Sergeant-Major', 'Regimental Sergeant-Major'], warrant: ['Warrant Officer', 'Warrant Officer', 'Warrant Officer'] }; }
  else if (ruler === 'FR') {
    f.army = cc === 'DZ' ? 'the Tirailleurs algériens' : cc === 'TN' ? 'the Tirailleurs tunisiens' : cc === 'MA' ? 'the Tirailleurs marocains' : INDOCHINA.includes(cc) ? 'the Tirailleurs indochinois' : cc === 'MG' ? 'the Tirailleurs malgaches' : FR_WEST.includes(cc) ? 'the Tirailleurs sénégalais' : 'the Troupes coloniales';
    f.ranks = RANKS.tirailleur;
  } else if (ruler === 'NL') { f.army = cc === 'ID' ? 'the KNIL (Royal Netherlands East Indies Army)' : 'the Troepenmacht in Suriname'; f.ranks = RANKS.knil; }
  else if (ruler === 'BE') { f.army = 'the Force Publique'; f.ranks = RANKS.forcePublique; }
  else if (ruler === 'DE') { f.army = 'the Schutztruppe'; f.ranks = RANKS.schutztruppe; }
  else if (ruler === 'IT') { f.army = 'the Regio Corpo Truppe Coloniali'; f.ranks = RANKS.ascari; }
  else if (ruler === 'ES') { f.army = cc === 'MA' ? 'the Fuerzas Regulares Indígenas' : 'the Tropas Nómadas'; f.ranks = RANKS.regulares; }
  else if (ruler === 'US') { f.army = cc === 'PH' && y >= 1935 ? 'the Philippine Commonwealth Army' : 'the Philippine Scouts'; f.ranks = RANKS.scouts; }
  else if (ruler === 'PT') { f.army = 'the Portuguese Colonial Army'; f.ranks = RANKS.portuguese; }
  else if (ruler === 'JP') { f.army = 'the Imperial Japanese Army'; f.ranks = { enlisted: ['Nitōhei (Private 2nd class)', 'Ittōhei (Private 1st class)', 'Jōtōhei (Superior Private)', 'Heichō (Lance Corporal)', 'Gochō (Corporal)', 'Gunsō (Sergeant)', 'Sōchō (Sergeant-Major)'], warrant: ['Jun\'i (Warrant Officer)', 'Jun\'i', 'Jun\'i'] }; f.officers = ['Shōi', 'Chūi', 'Tai-i', 'Shōsa', 'Chūsa', 'Taisa', 'Shōshō', 'Chūjō', 'Taishō', 'Gensui']; }
  else { f.army = `the ${shortName(cc)} colonial forces`; }
  f.branches = ['army', ...(f.navy ? ['navy'] : []), ...(f.airforce ? ['airforce'] : [])];
  return f;
}
const shortName = (cc) => ({ HK: 'Hong Kong', SG: 'Straits Settlements', LK: 'Ceylon', CY: 'Cyprus', MT: 'Malta', JM: 'Jamaica', TT: 'Trinidad', BB: 'Barbados', BS: 'Bahamas', BZ: 'British Honduras', GY: 'British Guiana', FJ: 'Fiji', ZW: 'Southern Rhodesia', BW: 'Bechuanaland', AE: 'Trucial Oman', BH: 'Bahrain', ZA: 'Cape Colony' }[cc] ?? cc);

/** The branch's name in a colony (Eras periodBranch hook). */
function branchName(nation, branch) {
  const state = getEraState();
  const f = state && colonialForce(state, nation);
  if (!f) return null;
  return branch === 'army' ? f.army.replace(/^the /, '') : branch === 'navy' && f.navy ? f.navy.replace(/^the /, '') : branch === 'airforce' && f.airforce ? f.airforce.replace(/^the /, '') : null;
}
/** A rank's title in a colony's force (Eras periodRank hook). Gurkhas keep their own enlisted names. */
function rankName(nation, branch, track, index) {
  const state = getEraState();
  const f = state && colonialForce(state, nation);
  if (!f || branch !== 'army') return null;
  const gurkha = state.military?.service?.gurkha;
  const r = gurkha ? RANKS.gurkha : f.ranks;
  if (track === 'enlisted') return r.enlisted[Math.min(index, r.enlisted.length - 1)];
  if (track === 'warrant') return r.warrant[Math.min(index, r.warrant.length - 1)];
  if (track === 'officer') return f.officers[Math.min(index, f.officers.length - 1)];
  return null;
}
setColonialHooks({ branch: branchName, rank: rankName });

/** Whether a branch exists in a colony (army only, mostly). */
export function colonialBranchBlock(state, branch) {
  const f = colonialForce(state);
  if (!f || f.branches.includes(branch)) return null;
  return `${shortName(state.character.countryId)} has only ${f.army}${f.navy ? ` and ${f.navy}` : ''}: the ${branch === 'navy' ? 'navy' : branch === 'airforce' ? 'air force' : 'service'} is the ${f.ruler === 'GB' ? 'British' : f.ruler === 'FR' ? 'French' : 'ruling country\'s'} own`;
}
