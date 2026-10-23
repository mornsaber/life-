/**
 * National honours: each country's orders and how a life earns them.
 *
 *  - Military decorations under the country's own names (the Victoria Cross,
 *    the Param Vir Chakra, the Croix de la Valeur militaire…), and none
 *    where a country has no equivalent (no Purple Heart in Britain).
 *  - Orders of merit on a yearly honours list: Britain's Order of the
 *    British Empire up to knighthoods ("Sir", "Dame") and life peerages
 *    (Baron / Baroness, a seat in the House of Lords); the Order of Canada;
 *    the Order of Australia; the Légion d'honneur; the Bundesverdienstkreuz;
 *    Italy's Order of Merit; Japan's Order of the Rising Sun (in old age);
 *    Korea's Order of Civil Merit; India's Padma awards and the Bharat Ratna;
 *    the US Presidential Medal of Freedom.
 *  - Who gets them: eminence from public office, a senior career, flag rank,
 *    a fortune, and the honours already earned. Serious convictions disqualify.
 *
 * state.character.style = { prefix: 'Sir' | 'Dame' | 'Lord' | 'Baroness' | ..., peerage: 'Baron Smith, of Leeds' }
 */
import { addHonor, netWorth, hasFelony } from '../../core/State.js';
import { COUNTRIES, isCitizen } from './Countries.js';
import { OFFICES } from '../politics/Offices.js';
import { REGIONS } from '../life/Regions.js';
import { fromPacks } from './packs/index.js';
import { grantPeerage, peerAddress } from './Peerage.js';
import { royalStyledName, sovereign, CROWNS } from './Crown.js';

/* ------------------------------------------------------------------ */
/* Military decorations                                                */
/* ------------------------------------------------------------------ */

const R = (...c) => c.map((x) => (Array.isArray(x) ? x : [x, 1]));
/** By country: US medal id → local name (or { branch: name }), optional ribbon; null: no equivalent. */
const MEDALS = {
  GB: {
    moh: { name: 'Victoria Cross', ribbon: R('#8b0a1d') }, serviceCross: { name: 'Conspicuous Gallantry Cross', ribbon: R('#fff', '#8b0a1d', '#fff') },
    dsm: { name: 'Distinguished Service Order', ribbon: R('#8b0a1d', '#002868', '#8b0a1d') }, silverStar: { name: { army: 'Military Cross', marines: 'Military Cross', navy: 'Distinguished Service Cross', airforce: 'Distinguished Flying Cross' }, ribbon: R('#fff', '#5b2a86', '#fff') },
    legionOfMerit: { name: 'Officer of the Order of the British Empire (Military)' }, bronzeStar: { name: 'Mention in Despatches' }, purpleHeart: null,
    msm: { name: 'Meritorious Service Medal' }, commendation: { name: 'King\'s Commendation for Valuable Service' }, achievement: { name: 'Commander\'s Commendation' },
    combatAction: null, goodConduct: { name: 'Long Service and Good Conduct Medal' }, humanitarian: { name: 'Humanitarian Medal' }, expeditionary: { name: 'Operational Service Medal' }, ndsm: null,
  },
  CA: {
    moh: { name: 'Victoria Cross (Canada)', ribbon: R('#8b0a1d') }, serviceCross: { name: 'Star of Military Valour' }, silverStar: { name: 'Medal of Military Valour' },
    dsm: { name: 'Meritorious Service Cross (Military)' }, legionOfMerit: { name: 'Officer of the Order of Military Merit' }, bronzeStar: { name: 'Mention in Dispatches' },
    purpleHeart: { name: 'Sacrifice Medal' }, msm: { name: 'Meritorious Service Medal (Military)' }, commendation: { name: 'Chief of the Defence Staff Commendation' }, achievement: { name: 'Commander\'s Commendation' },
    combatAction: { name: 'General Campaign Star' }, goodConduct: { name: 'Canadian Forces\' Decoration' }, humanitarian: { name: 'Special Service Medal (Humanitarian)' }, expeditionary: { name: 'Operational Service Medal' }, ndsm: null,
  },
  AU: {
    moh: { name: 'Victoria Cross for Australia', ribbon: R('#8b0a1d') }, serviceCross: { name: 'Star of Gallantry' }, silverStar: { name: 'Medal for Gallantry' },
    dsm: { name: 'Distinguished Service Cross' }, legionOfMerit: { name: 'Conspicuous Service Cross' }, bronzeStar: { name: 'Commendation for Gallantry' }, purpleHeart: null,
    msm: { name: 'Conspicuous Service Medal' }, commendation: { name: 'Chief of the Defence Force Commendation' }, achievement: { name: 'Commander\'s Commendation' },
    combatAction: { name: 'Infantry Combat Badge' }, goodConduct: { name: 'Defence Long Service Medal' }, humanitarian: { name: 'Humanitarian Overseas Service Medal' }, expeditionary: { name: 'Australian Active Service Medal' }, ndsm: { name: 'Australian Defence Medal' },
  },
  DE: {
    moh: { name: 'Ehrenkreuz der Bundeswehr für Tapferkeit', ribbon: R('#000', '#dd0000', '#ffce00') }, serviceCross: { name: 'Ehrenkreuz der Bundeswehr in Gold (mit rotem Rand)' }, silverStar: { name: 'Ehrenkreuz der Bundeswehr in Silber' },
    dsm: { name: 'Verdienstkreuz 1. Klasse des Verdienstordens' }, legionOfMerit: { name: 'Ehrenkreuz der Bundeswehr in Gold' }, bronzeStar: { name: 'Ehrenkreuz der Bundeswehr in Bronze' }, purpleHeart: { name: 'Gefechtsmedaille' },
    msm: { name: 'Ehrenmedaille der Bundeswehr' }, commendation: { name: 'Förmliche Anerkennung' }, achievement: { name: 'Förmliche Anerkennung (Bataillon)' },
    combatAction: { name: 'Einsatzmedaille Gefecht' }, goodConduct: { name: 'Treuedienst-Ehrenzeichen' }, humanitarian: { name: 'Einsatzmedaille Fluthilfe' }, expeditionary: { name: 'Einsatzmedaille der Bundeswehr' }, ndsm: null,
  },
  FR: {
    moh: { name: 'Légion d\'honneur (à titre militaire, pour fait de guerre)', ribbon: R('#c8102e') }, serviceCross: { name: 'Médaille militaire', ribbon: R('#ffd100', '#1f6f43', '#ffd100') }, silverStar: { name: 'Croix de la Valeur militaire avec palme' },
    dsm: { name: 'Commandeur de l\'Ordre national du Mérite' }, legionOfMerit: { name: 'Officier de l\'Ordre national du Mérite' }, bronzeStar: { name: 'Croix de la Valeur militaire' }, purpleHeart: { name: 'Médaille des blessés de guerre' },
    msm: { name: 'Médaille de la Défense nationale (échelon or)' }, commendation: { name: 'Témoignage de satisfaction' }, achievement: { name: 'Lettre de félicitations' },
    combatAction: { name: 'Croix du combattant' }, goodConduct: { name: 'Médaille de la Défense nationale (échelon bronze)' }, humanitarian: { name: 'Médaille de la reconnaissance de la Nation' }, expeditionary: { name: 'Médaille d\'outre-mer' }, ndsm: null,
  },
  IT: {
    moh: { name: 'Medaglia d\'oro al valor militare', ribbon: R('#1f5fbf') }, serviceCross: { name: 'Medaglia d\'argento al valor militare' }, silverStar: { name: 'Medaglia di bronzo al valor militare' },
    dsm: { name: 'Ordine militare d\'Italia' }, legionOfMerit: { name: 'Croce d\'oro al merito dell\'Esercito' }, bronzeStar: { name: 'Croce al merito di guerra' }, purpleHeart: { name: 'Distintivo d\'onore per feriti in servizio' },
    msm: { name: 'Medaglia mauriziana' }, commendation: { name: 'Encomio solenne' }, achievement: { name: 'Elogio' },
    combatAction: { name: 'Croce commemorativa per le missioni di pace' }, goodConduct: { name: 'Croce per anzianità di servizio' }, humanitarian: { name: 'Medaglia di benemerenza per interventi umanitari' }, expeditionary: { name: 'Medaglia NATO' }, ndsm: null,
  },
  JP: {
    moh: { name: 'Special Certificate of Commendation (Tokubetsu Shōshi)' }, serviceCross: { name: '1st Class Certificate of Commendation' }, silverStar: { name: 'Defense Merit Badge (Distinguished)' },
    dsm: { name: 'Order of the Rising Sun, Gold Rays' }, legionOfMerit: { name: 'Order of the Sacred Treasure' }, bronzeStar: { name: 'Defense Merit Badge' }, purpleHeart: null,
    msm: { name: 'Defense Merit Badge, 1st class' }, commendation: { name: 'Certificate of Commendation (Shōshi)' }, achievement: { name: 'Letter of Appreciation' },
    combatAction: null, goodConduct: { name: 'Service Excellence Badge' }, humanitarian: { name: 'Disaster Relief Dispatch Badge' }, expeditionary: { name: 'International Peace Cooperation Badge' }, ndsm: null,
  },
  KR: {
    moh: { name: 'Order of Military Merit, Taeguk Class' }, serviceCross: { name: 'Order of Military Merit, Eulji Class' }, silverStar: { name: 'Order of Military Merit, Chungmu Class' },
    dsm: { name: 'Order of National Security Merit, Tongil Medal' }, legionOfMerit: { name: 'Order of National Security Merit, Cheonsu Medal' }, bronzeStar: { name: 'Order of Military Merit, Hwarang Class' }, purpleHeart: { name: 'Wound Badge' },
    msm: { name: 'Order of National Security Merit, Samil Medal' }, commendation: { name: 'Minister of National Defense Commendation' }, achievement: { name: 'Chief of Staff Commendation' },
    combatAction: { name: 'Combat Badge' }, goodConduct: { name: 'Long Service Medal' }, humanitarian: { name: 'Peacekeeping Medal' }, expeditionary: { name: 'Overseas Service Medal' }, ndsm: null,
  },
  MX: {
    moh: { name: 'Condecoración al Valor Heroico' }, serviceCross: { name: 'Condecoración al Mérito Militar (1a clase)' }, silverStar: { name: 'Condecoración al Mérito Militar (2a clase)' },
    dsm: { name: 'Condecoración al Mérito Técnico Militar' }, legionOfMerit: { name: 'Condecoración al Mérito Docente Militar' }, bronzeStar: { name: 'Mención honorífica' }, purpleHeart: { name: 'Condecoración por Heridas en Actos del Servicio' },
    msm: { name: 'Condecoración de Perseverancia' }, commendation: { name: 'Mención honorífica' }, achievement: { name: 'Felicitación' },
    combatAction: null, goodConduct: { name: 'Condecoración de Perseverancia' }, humanitarian: { name: 'Condecoración al Mérito por el Plan DN-III' }, expeditionary: null, ndsm: null,
  },
  PH: {
    moh: { name: 'Medal of Valor', ribbon: R('#1f5fbf') }, serviceCross: { name: 'Distinguished Conduct Star' }, silverStar: { name: 'Gold Cross Medal' },
    dsm: { name: 'Distinguished Service Star' }, legionOfMerit: { name: 'Outstanding Achievement Medal' }, bronzeStar: { name: 'Bronze Cross Medal' }, purpleHeart: { name: 'Wounded Personnel Medal' },
    msm: { name: 'Military Merit Medal' }, commendation: { name: 'Military Commendation Medal' }, achievement: { name: 'Military Civic Action Medal' },
    combatAction: { name: 'Combat Commander\'s Badge' }, goodConduct: { name: 'Long Service Medal' }, humanitarian: { name: 'Disaster Relief and Rehabilitation Operations Ribbon' }, expeditionary: { name: 'Overseas Service Medal' }, ndsm: null,
  },
  IN: {
    moh: { name: 'Param Vir Chakra', ribbon: R('#5b2a86') }, serviceCross: { name: 'Maha Vir Chakra' }, silverStar: { name: 'Vir Chakra' },
    dsm: { name: 'Param Vishisht Seva Medal' }, legionOfMerit: { name: 'Ati Vishisht Seva Medal' }, bronzeStar: { name: 'Sena Medal (Gallantry)' }, purpleHeart: { name: 'Wound Medal' },
    msm: { name: 'Vishisht Seva Medal' }, commendation: { name: 'Chief of the Army Staff Commendation Card' }, achievement: { name: 'GOC-in-C Commendation Card' },
    combatAction: { name: 'Operation Parakram Medal' }, goodConduct: { name: 'Long Service and Good Conduct Medal' }, humanitarian: { name: 'Videsh Seva Medal' }, expeditionary: { name: 'Samanya Seva Medal' }, ndsm: { name: 'Sainya Seva Medal' },
  },
};
fromPacks(MEDALS, 'MEDALS');
/** A US medal as `nation` awards it: { name, ribbon? }, null (no equivalent), or undefined (US). */
export function localMedal(nation, medalId, branch) {
  if (!nation || nation === 'US') return undefined;
  const m = MEDALS[nation]?.[medalId];
  if (m === null) return null;
  if (!m) return { name: 'Service medal' };
  const name = typeof m.name === 'string' ? m.name : m.name[branch] ?? Object.values(m.name)[0];
  return { name, ribbon: m.ribbon };
}

/* ------------------------------------------------------------------ */
/* Orders of merit                                                     */
/* ------------------------------------------------------------------ */

/**
 * Each country's orders, lowest first: { name, min (eminence), prefix?, peer?, ribbon }.
 * minAge: Japan honours people late in life.
 */
export const ORDERS = {
  US: { minAge: 30, tiers: [
    { id: 'citizens', name: 'Presidential Citizens Medal', min: 130, ribbon: R('#002868', '#fff', '#c8102e') },
    { id: 'freedom', name: 'Presidential Medal of Freedom', min: 230, ribbon: R('#002868', '#fff', '#002868') },
  ] },
  GB: { minAge: 30, tiers: [
    { id: 'mbe', name: 'Member of the Order of the British Empire (MBE)', post: 'MBE', min: 35, ribbon: R('#e0559a', '#9ea3a9', '#e0559a') },
    { id: 'obe', name: 'Officer of the Order of the British Empire (OBE)', post: 'OBE', min: 70, ribbon: R('#e0559a', '#9ea3a9', '#e0559a') },
    { id: 'cbe', name: 'Commander of the Order of the British Empire (CBE)', post: 'CBE', min: 110, ribbon: R('#e0559a', '#9ea3a9', '#e0559a') },
    { id: 'knight', name: { male: 'Knight Bachelor', female: 'Dame Commander of the Order of the British Empire (DBE)' }, prefix: { male: 'Sir', female: 'Dame' }, post: { male: '', female: 'DBE' }, min: 165, ribbon: R('#c8102e', '#ffd100', '#c8102e') },
    { id: 'peer', name: { male: 'Life peer (Baron)', female: 'Life peer (Baroness)' }, prefix: { male: 'Lord', female: 'Baroness' }, min: 240, peer: true, ribbon: R('#8b0a1d', '#fff', '#8b0a1d') },
  ] },
  CA: { minAge: 30, tiers: [
    { id: 'cm', name: 'Member of the Order of Canada (CM)', post: 'CM', min: 70, ribbon: R('#c8102e', '#fff', '#c8102e') },
    { id: 'oc', name: 'Officer of the Order of Canada (OC)', post: 'OC', min: 120, ribbon: R('#c8102e', '#fff', '#c8102e') },
    { id: 'cc', name: 'Companion of the Order of Canada (CC)', post: 'CC', min: 190, ribbon: R('#c8102e', '#fff', '#c8102e') },
  ] },
  AU: { minAge: 30, tiers: [
    { id: 'oam', name: 'Medal of the Order of Australia (OAM)', post: 'OAM', min: 35, ribbon: R('#1f5fbf', '#ffd100', '#1f5fbf') },
    { id: 'am', name: 'Member of the Order of Australia (AM)', post: 'AM', min: 70, ribbon: R('#1f5fbf', '#ffd100', '#1f5fbf') },
    { id: 'ao', name: 'Officer of the Order of Australia (AO)', post: 'AO', min: 120, ribbon: R('#1f5fbf', '#ffd100', '#1f5fbf') },
    { id: 'ac', name: 'Companion of the Order of Australia (AC)', post: 'AC', min: 190, ribbon: R('#1f5fbf', '#ffd100', '#1f5fbf') },
    // Only while the government of the day allows them (1976–86, 2014–15 in real life).
    { id: 'ak', name: { male: 'Knight of the Order of Australia (AK)', female: 'Dame of the Order of Australia (AD)' }, post: { male: 'AK', female: 'AD' }, prefix: { male: 'Sir', female: 'Dame' }, knighthood: true, min: 240, ribbon: R('#ffd100', '#1f5fbf', '#ffd100') },
  ] },
  FR: { minAge: 30, tiers: [
    { id: 'onm', name: 'Chevalier de l\'Ordre national du Mérite', min: 40, ribbon: R('#1f5fbf') },
    { id: 'lhc', name: 'Chevalier de la Légion d\'honneur', min: 75, ribbon: R('#c8102e') },
    { id: 'lho', name: 'Officier de la Légion d\'honneur', min: 120, ribbon: R('#c8102e') },
    { id: 'lhcd', name: 'Commandeur de la Légion d\'honneur', min: 170, ribbon: R('#c8102e') },
    { id: 'lhgo', name: 'Grand officier de la Légion d\'honneur', min: 225, ribbon: R('#c8102e') },
    { id: 'lhgc', name: 'Grand-croix de la Légion d\'honneur', min: 285, ribbon: R('#c8102e') },
  ] },
  DE: { minAge: 30, tiers: [
    { id: 'vm', name: 'Verdienstmedaille des Verdienstordens', min: 35, ribbon: R('#dd0000', '#ffce00', '#000') },
    { id: 'bvk', name: 'Bundesverdienstkreuz am Bande', min: 70, ribbon: R('#dd0000', '#ffce00', '#000') },
    { id: 'bvk1', name: 'Bundesverdienstkreuz 1. Klasse', min: 115, ribbon: R('#dd0000', '#ffce00', '#000') },
    { id: 'gvk', name: 'Großes Verdienstkreuz', min: 165, ribbon: R('#dd0000', '#ffce00', '#000') },
    { id: 'gvks', name: 'Großes Verdienstkreuz mit Stern', min: 220, ribbon: R('#dd0000', '#ffce00', '#000') },
    { id: 'grk', name: 'Großkreuz des Verdienstordens', min: 285, ribbon: R('#dd0000', '#ffce00', '#000') },
  ] },
  IT: { minAge: 30, tiers: [
    { id: 'cav', name: 'Cavaliere dell\'Ordine al merito della Repubblica', prefix: 'Cav.', min: 35, ribbon: R('#1f6f43', '#c8102e', '#1f6f43') },
    { id: 'uff', name: 'Ufficiale dell\'Ordine al merito della Repubblica', prefix: 'Uff.', min: 70, ribbon: R('#1f6f43', '#c8102e', '#1f6f43') },
    { id: 'comm', name: 'Commendatore dell\'Ordine al merito della Repubblica', prefix: 'Comm.', min: 115, ribbon: R('#1f6f43', '#c8102e', '#1f6f43') },
    { id: 'gu', name: 'Grande Ufficiale dell\'Ordine al merito della Repubblica', prefix: 'Grand\'Uff.', min: 170, ribbon: R('#1f6f43', '#c8102e', '#1f6f43') },
    { id: 'gc', name: 'Cavaliere di Gran Croce', min: 235, ribbon: R('#1f6f43', '#c8102e', '#1f6f43') },
  ] },
  JP: { minAge: 65, tiers: [
    { id: 'rs6', name: 'Order of the Rising Sun, Silver Rays', min: 40, ribbon: R('#fff', '#c8102e', '#fff') },
    { id: 'rs4', name: 'Order of the Rising Sun, Gold Rays with Rosette', min: 90, ribbon: R('#fff', '#c8102e', '#fff') },
    { id: 'rs3', name: 'Order of the Rising Sun, Gold Rays with Neck Ribbon', min: 140, ribbon: R('#fff', '#c8102e', '#fff') },
    { id: 'rs2', name: 'Order of the Rising Sun, Gold and Silver Star', min: 190, ribbon: R('#fff', '#c8102e', '#fff') },
    { id: 'rs1', name: 'Grand Cordon of the Order of the Rising Sun', min: 250, ribbon: R('#fff', '#c8102e', '#fff') },
  ] },
  KR: { minAge: 35, tiers: [
    { id: 'seongnyu', name: 'Order of Civil Merit, Seongnyu Medal', min: 35, ribbon: R('#1f5fbf', '#fff', '#c8102e') },
    { id: 'mongnyeon', name: 'Order of Civil Merit, Mongnyeon Medal', min: 70, ribbon: R('#1f5fbf', '#fff', '#c8102e') },
    { id: 'dongbaek', name: 'Order of Civil Merit, Dongbaek Medal', min: 115, ribbon: R('#1f5fbf', '#fff', '#c8102e') },
    { id: 'moran', name: 'Order of Civil Merit, Moran Medal', min: 170, ribbon: R('#1f5fbf', '#fff', '#c8102e') },
    { id: 'mugunghwa', name: 'Order of Civil Merit, Mugunghwa Medal', min: 240, ribbon: R('#1f5fbf', '#fff', '#c8102e') },
  ] },
  IN: { minAge: 35, tiers: [
    { id: 'padmashri', name: 'Padma Shri', min: 70, ribbon: R('#ff9933', '#fff', '#138808') },
    { id: 'padmabhushan', name: 'Padma Bhushan', min: 140, ribbon: R('#ff9933', '#fff', '#138808') },
    { id: 'padmavibhushan', name: 'Padma Vibhushan', min: 210, ribbon: R('#ff9933', '#fff', '#138808') },
    { id: 'bharatratna', name: 'Bharat Ratna', min: 320, ribbon: R('#fff') },
  ] },
  PH: { minAge: 35, tiers: [
    { id: 'merit', name: 'Presidential Medal of Merit', min: 80, ribbon: R('#1f5fbf', '#fff', '#c8102e') },
    { id: 'lakandula', name: 'Order of Lakandula (Grand Cross)', min: 200, ribbon: R('#1f5fbf', '#ffd100', '#c8102e') },
  ] },
  MX: { minAge: 40, tiers: [
    { id: 'premio', name: 'Premio Nacional de Ciencias y Artes', min: 130, ribbon: R('#1f6f43', '#fff', '#c8102e') },
    { id: 'belisario', name: 'Medalla Belisario Domínguez', min: 260, ribbon: R('#1f6f43', '#fff', '#c8102e') },
  ] },
};
fromPacks(ORDERS, 'ORDERS');
// Pack tiers without an id get one from their place in the ladder: "already held" and promotions match on it.
for (const o of Object.values(ORDERS)) for (const [i, t] of (o?.tiers ?? []).entries()) if (!t.id) t.id = `t${i}`;
// New Zealand's knighthoods come and go with the government too (abolished 2000, restored 2009).
for (const t of ORDERS.NZ?.tiers ?? []) if (t.id === 'knzm') t.knighthood = true;

/**
 * Knighthoods in the realms' own orders are a political choice: Australia's are off unless a
 * government restores them; New Zealand's are on unless one abolishes them. Knights already
 * made keep their titles either way. state.world.knighthoods[cc] = true|false
 */
export const KNIGHTHOODS_DEFAULT = { AU: false, NZ: true };
export const knighthoodsOn = (state, cc) => state.world?.knighthoods?.[cc] ?? KNIGHTHOODS_DEFAULT[cc] ?? true;
export function setKnighthoods(ctx, cc, on, who = 'The government') {
  const { state } = ctx;
  state.world ??= {};
  state.world.knighthoods ??= {};
  if (knighthoodsOn(state, cc) === on) return false;
  state.world.knighthoods[cc] = on;
  if ((state.character.countryId ?? 'US') === cc) ctx.log(`${who} ${on ? 'restored knighthoods and damehoods' : 'abolished new knighthoods and damehoods'} in the national order${on ? '.' : '; existing knights keep their titles.'}`, on ? '⚔️' : '📜', 'info');
  return true;
}
function knighthoodPolicyYear(ctx) {
  const { state, rng } = ctx;
  const cc = state.character.countryId ?? 'US';
  if (!(cc in KNIGHTHOODS_DEFAULT) || /^(au|nz)_pm$/.test(state.politics?.office?.id ?? '')) return;
  if (rng.chance(knighthoodsOn(state, cc) ? 0.02 : 0.012)) setKnighthoods(ctx, cc, !knighthoodsOn(state, cc));
}

export const tierName = (t, gender) => (typeof t.name === 'string' ? t.name : t.name[gender === 'female' ? 'female' : 'male']);
export const tierPrefix = (t, gender) => (typeof t.prefix === 'object' ? t.prefix[gender === 'female' ? 'female' : 'male'] : t.prefix ?? null);

/**
 * How eminent a life is: public office, a senior career, flag rank, a
 * fortune, and the honours already earned (orders excluded).
 */
export function eminence(state) {
  const p = state.politics ?? {};
  const offices = [...(p.history ?? []).map((h) => OFFICES[h.officeId]), p.office ? OFFICES[p.office.id] : null].filter(Boolean);
  const topOffice = offices.reduce((m, o) => Math.max(m, (o.level ?? 0) * 28 + (o.leader ? (o.level >= 5 ? 110 : o.level >= 4 ? 60 : 0) : 0)), 0);
  const jobs = [...(state.career.history ?? []).map((h) => ({ grade: h.peakGrade ?? 0, sector: h.sector })), state.career.job ? { grade: state.career.job.peakGrade ?? state.career.job.grade, sector: state.career.job.sector, head: state.career.job.headOf } : null].filter(Boolean);
  const topJob = jobs.reduce((m, j) => Math.max(m, j.grade >= 7 ? (j.grade - 6) * 22 * (j.sector && j.sector !== 'private' ? 1.25 : 1) + (j.head ? 30 : 0) : 0), 0);
  const mil = [state.military.service, ...(state.military.history ?? [])].filter(Boolean)
    .reduce((m, s) => Math.max(m, s.track === 'officer' && (s.grade ?? Number(s.rankCode?.match(/\d+/)?.[0] ?? 0) - 1) >= 6 ? 50 + 25 * ((s.grade ?? Number(s.rankCode?.match(/\d+/)?.[0] ?? 0) - 1) - 6) : 0), 0);
  const prestige = Math.min(160, state.honors.filter((h) => h.source !== 'order').reduce((s, h) => s + (h.prestige ?? 0), 0) * 0.6);
  const worth = netWorth(state);
  const wealth = worth >= 1e9 ? 110 : worth >= 1e8 ? 70 : worth >= 1e7 ? 35 : worth >= 1e6 ? 10 : 0;
  return Math.round(topOffice + topJob + mil + prestige + wealth);
}

/** The orders you already hold in this country, by tier id. */
const heldTiers = (state, cc) => state.honors.filter((h) => h.source === 'order' && h.country === cc).map((h) => h.tier);

/** The yearly honours list: at most one new order a year. */
export function honoursList(ctx) {
  const { state, rng } = ctx;
  const cc = state.character.countryId ?? 'US';
  const orders = ORDERS[cc];
  if (!orders || state.character.age < orders.minAge || hasFelony(state) || state.legal.incarceration) return null;
  // The monarch is the fount of honours, not a recipient; royals get the monarch's personal orders.
  if (state.royal && (state.royal.reigning || state.royal.working)) return null;
  const score = eminence(state);
  // A foreigner who has made a mark here can be given an honorary award — no title, no prefix, once.
  if (!isCitizen(state, cc)) {
    const t = orders.tiers[Math.min(1, orders.tiers.length - 1)];
    if (heldTiers(state, cc).length || score < t.min + 30 || !rng.chance(0.12)) return null;
    const name = `${tierName(t, state.character.gender)} (honorary)`;
    addHonor(state, { id: `order.${cc}.${t.id}.hon`, source: 'order', country: cc, tier: t.id, name, icon: '🎗️', ribbon: t.ribbon, precedence: 6, prestige: t.min / 3, citation: 'An honorary award to a foreign national, for services to the country.' });
    ctx.log(`You were made an honorary ${name.replace(' (honorary)', '')} — the country's thanks to a foreigner who made a difference here.`, '🎗️', 'honor');
    return t;
  }
  // Appointed at the highest grade your standing earns, above any you already hold.
  const held = heldTiers(state, cc);
  const top = Math.max(-1, ...held.map((id) => orders.tiers.findIndex((x) => x.id === id)));
  // Knighthoods in the order only while the government allows them.
  const open = (t) => !t.knighthood || knighthoodsOn(state, cc);
  const next = [...orders.tiers].reverse().find((t, i) => open(t) && orders.tiers.length - 1 - i > top && score >= t.min && (!t.peer || orders.tiers.length - 1 - i === top + 1 || !orders.tiers.slice(top + 1).some((x) => !x.peer && score >= x.min)));
  if (!next || !rng.chance(0.3)) return null;
  // Only the very top of public life sits in the Lords.
  if (next.peer && !(state.politics?.history ?? []).concat(state.politics?.office ? [state.politics.office] : []).some((h) => (OFFICES[h.officeId ?? h.id]?.level ?? 0) >= 4) && score < next.min + 60) return null;
  return award(ctx, cc, next);
}

/**
 * What a grade of an order means in hand. Grades differ in insignia (a medal, a badge on a
 * ribbon, a neck badge, a breast star, a sash), in who invests you (a regional ceremony for
 * the lower grades, the head of state for the higher), in the ribbon's trim, in post-nominal
 * letters, and in standing. A promotion within an order replaces the lower grade.
 */
const INSIGNIA = ['a medal on a ribbon', 'a badge on a ribbon', 'a badge worn at the neck', 'a breast star and a neck badge', 'a sash, a breast star and the collar of the order'];
const GRADE_ICONS = ['🏅', '🎖️', '🎗️', '✴️', '🌟'];
const INVESTITURE = {
  GB: ['by the Lord-Lieutenant of your county', 'at an investiture at {palace}', 'by {sovereign} at {palace}'],
  CA: ['at Rideau Hall', 'by the Governor General at Rideau Hall', 'by the Governor General at Rideau Hall'],
  AU: ['by the state Governor', 'by the Governor-General at Government House', 'by the Governor-General at Government House'],
  default: ['at a regional ceremony', 'at a ceremony in the capital', 'by the head of state'],
};
export function gradeInfo(cc, t, tiers = ORDERS[cc]?.tiers ?? [t]) {
  const idx = Math.max(0, tiers.findIndex((x) => x.id === t.id));
  const level = tiers.length > 1 ? idx / (tiers.length - 1) : 1;
  const insignia = INSIGNIA[Math.min(4, Math.round(level * (tiers.length >= 4 ? 4 : 3)))];
  const inv = (INVESTITURE[cc] ?? INVESTITURE.default)[level < 0.34 ? 0 : level < 0.75 ? 1 : 2];
  return { idx, level, insignia, investiture: inv, icon: t.peer ? '👑' : GRADE_ICONS[Math.min(4, Math.round(level * 4))] };
}
/** The trim that sets higher grades apart on the ribbon bar: gold edges, then a rosette. */
const gradeRibbon = (t, level) => (level >= 0.5 && t.ribbon ? [['#d4af37', 0.18], ...t.ribbon, ['#d4af37', 0.18]] : t.ribbon);
const tierPost = (t, gender) => (typeof t.post === 'object' ? t.post[gender === 'female' ? 'female' : 'male'] : t.post ?? null);

/** What you're being honoured for, in the words of the honours list. */
function servicesTo(state) {
  const p = state.politics ?? {};
  if (p.office || (p.history ?? []).length) return 'public life';
  if ([state.military.service, ...(state.military.history ?? [])].some((s) => s?.track === 'officer' && (s.grade ?? 0) >= 5)) return 'the armed forces';
  const job = state.career.job ?? state.career.history?.at(-1);
  const field = { medicine: 'medicine', nursing: 'health care', law: 'law', prosecution: 'justice', academia: 'education', education: 'education', research: 'science', police: 'policing', fire: 'the fire and rescue service', ems: 'emergency care' }[job?.professionId];
  if (field) return field;
  if (netWorth(state) >= 1e7) return 'business and philanthropy';
  return 'the community';
}

export function award(ctx, cc, t, order = ORDERS[cc]?.tiers ?? []) {
  const { state } = ctx;
  const gender = state.character.gender;
  const name = tierName(t, gender);
  const g = gradeInfo(cc, t, order);
  g.investiture = g.investiture.replace('{sovereign}', sovereign(state, cc) ?? 'the head of state').replace(/\{palace\}/g, CROWNS[cc]?.palace ?? 'the palace');
  // A promotion within the order: the new grade replaces the old one (other orders are kept).
  const rank = (h) => order.findIndex((x) => x.id === h.tier);
  const lower = state.honors.filter((h) => h.source === 'order' && h.country === cc && rank(h) >= 0 && rank(h) < g.idx && !order[rank(h)]?.peer);
  const promotedFrom = lower.length ? lower.at(-1).name : null;
  if (lower.length) state.honors = state.honors.filter((h) => !lower.includes(h));
  const post = tierPost(t, gender);
  addHonor(state, { id: `order.${cc}.${t.id}`, source: 'order', country: cc, tier: t.id, name, post, insignia: g.insignia, icon: g.icon, ribbon: gradeRibbon(t, g.level), device: g.level >= 0.99 && order.length >= 3 && !t.peer ? '✦' : null, precedence: 5 - g.level, prestige: Math.round(t.min / 2), citation: `For services to ${servicesTo(state)}. Invested ${g.investiture}; ${g.insignia}${post ? `; the letters ${post} after your name` : ''}.` });
  const prefix = tierPrefix(t, gender);
  if (t.peer) {
    // A life barony: a seat in the Lords for life (Peerage.js). A hereditary peer keeps the higher title.
    const city = REGIONS[state.character.regionId]?.name?.split(',')[0] ?? COUNTRIES[cc]?.capital ?? 'London';
    if (!state.character.peerage) grantPeerage(ctx, { rank: 'baron', place: city, kind: 'life', seat: true });
    else state.character.peerage.seat = true;
  } else if (prefix && !state.character.peerage && !state.royal) state.character.style = { ...(state.character.style ?? {}), prefix };
  // Standing that comes with it: a higher grade opens more doors.
  if (state.politics) state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + Math.round(3 + g.level * 9));
  ctx.log(t.peer
    ? `You were created a life peer: ${state.character.style.peerage}. You took your seat in the House of Lords.`
    : `${promotedFrom ? `You were promoted within the order, from ${promotedFrom} to ${name}` : `You were appointed ${name}`}, invested ${g.investiture}.${prefix && ['Sir', 'Dame'].includes(prefix) && !state.royal && !state.character.peerage ? ` You are now ${styledName(state)}.` : post ? ` You may now write ${post} after your name.` : ''}`, g.icon, 'honor');
  ctx.stat('happiness', Math.round(4 + g.level * 8));
  return t;
}

/** Post-nominal letters from the orders you hold (highest grade of each order). */
export function postNominals(state) {
  // A monarch is sovereign of the orders, and doesn't use their letters.
  if (state.royal?.reigning) return '';
  return state.honors.filter((h) => h.source === 'order' && h.post).map((h) => h.post).filter((x, i, a) => a.indexOf(x) === i).join(', ');
}

/** Your name with any title an honour gave you: Sir John Smith, Lord Smith, Cav. Maria Rossi. */
export function styledName(state) {
  const c = state.character;
  const s = c.style;
  // Royalty by title and first name; peers by their title; then knights, dames and courtesy styles.
  const royal = royalStyledName(state);
  if (royal) return royal;
  if (c.peerage) return peerAddress(state);
  if (!s?.prefix) return `${c.firstName} ${c.lastName}`;
  if (s.prefix === 'Lord' || s.prefix === 'Baroness') return `${s.prefix} ${c.lastName}`;
  if (s.prefix === 'The Hon.') return `The Hon. ${c.firstName} ${c.lastName}`;
  return `${s.prefix} ${c.firstName} ${c.lastName}`;
}

/* ------------------------------------------------------------------ */
/* Orders of chivalry                                                  */
/* ------------------------------------------------------------------ */

const isFlagOfficer = (state) => [state.military.service, ...(state.military.history ?? [])].some((s) => s?.track === 'officer' && ((s.grade ?? Number(s.rankCode?.match(/\d+/)?.[0] ?? 0) - 1) >= 6));
const seniorPublicServant = (state) => [state.career.job, ...(state.career.history ?? [])].some((j) => j && j.sector && j.sector !== 'private' && (j.peakGrade ?? j.grade ?? 0) >= 9);
const heldOffice = (state, re) => [...(state.politics?.history ?? []).map((h) => h.officeId), state.politics?.office?.id].some((id) => id && re.test(id));
const diplomat = (state) => [state.career.job, ...(state.career.history ?? [])].some((j) => /foreignService/.test(j?.professionId ?? ''));
const K = (t) => ({ ...t, prefix: { male: 'Sir', female: 'Dame' } });
/**
 * Orders beyond the order of merit, each with its own ladder and who it's for. Several can be held
 * at once. `gift`: in the monarch's personal gift (no government advice).
 */
export const CHIVALRY = {
  GB: [
    { id: 'bath', name: 'Order of the Bath', for: 'senior civil servants and flag officers', eligible: (s) => isFlagOfficer(s) || seniorPublicServant(s), tiers: [
      { id: 'bath_cb', name: 'Companion of the Order of the Bath (CB)', post: 'CB', min: 90, ribbon: R('#c8102e') },
      K({ id: 'bath_kcb', name: { male: 'Knight Commander of the Order of the Bath (KCB)', female: 'Dame Commander of the Order of the Bath (DCB)' }, post: { male: 'KCB', female: 'DCB' }, min: 150, ribbon: R('#c8102e') }),
      K({ id: 'bath_gcb', name: 'Knight Grand Cross of the Order of the Bath (GCB)', post: 'GCB', min: 220, ribbon: R('#c8102e') }),
    ] },
    { id: 'smg', name: 'Order of St Michael and St George', for: 'diplomats and the Crown\'s representatives overseas', eligible: (s) => diplomat(s) || heldOffice(s, /_gg$|_lg$|au_governor/), tiers: [
      { id: 'smg_cmg', name: 'Companion of the Order of St Michael and St George (CMG)', post: 'CMG', min: 80, ribbon: R('#1f5fbf', '#c8102e', '#1f5fbf') },
      K({ id: 'smg_kcmg', name: { male: 'Knight Commander of St Michael and St George (KCMG)', female: 'Dame Commander of St Michael and St George (DCMG)' }, post: { male: 'KCMG', female: 'DCMG' }, min: 140, ribbon: R('#1f5fbf', '#c8102e', '#1f5fbf') }),
      K({ id: 'smg_gcmg', name: 'Knight Grand Cross of St Michael and St George (GCMG)', post: 'GCMG', min: 200, ribbon: R('#1f5fbf', '#c8102e', '#1f5fbf') }),
    ] },
    { id: 'rvo', name: 'Royal Victorian Order', gift: true, for: 'personal service to the monarch', eligible: (s) => Boolean(s.royal) || heldOffice(s, /_gg$|_lg$|au_governor|lordLieutenant/), tiers: [
      { id: 'rvo_mvo', name: 'Member of the Royal Victorian Order (MVO)', post: 'MVO', min: 30, ribbon: R('#1f3f8f', '#c8102e', '#fff', '#c8102e', '#1f3f8f') },
      { id: 'rvo_lvo', name: 'Lieutenant of the Royal Victorian Order (LVO)', post: 'LVO', min: 70, ribbon: R('#1f3f8f', '#c8102e', '#fff', '#c8102e', '#1f3f8f') },
      { id: 'rvo_cvo', name: 'Commander of the Royal Victorian Order (CVO)', post: 'CVO', min: 110, ribbon: R('#1f3f8f', '#c8102e', '#fff', '#c8102e', '#1f3f8f') },
      K({ id: 'rvo_kcvo', name: { male: 'Knight Commander of the Royal Victorian Order (KCVO)', female: 'Dame Commander of the Royal Victorian Order (DCVO)' }, post: { male: 'KCVO', female: 'DCVO' }, min: 160, ribbon: R('#1f3f8f', '#c8102e', '#fff', '#c8102e', '#1f3f8f') }),
      K({ id: 'rvo_gcvo', name: 'Knight Grand Cross of the Royal Victorian Order (GCVO)', post: 'GCVO', min: 220, ribbon: R('#1f3f8f', '#c8102e', '#fff', '#c8102e', '#1f3f8f') }),
    ] },
    { id: 'om', name: 'Order of Merit', gift: true, for: 'the greatest achievement in the arts, science and public life (24 members)', eligible: () => true, tiers: [
      { id: 'om', name: 'Order of Merit (OM)', post: 'OM', min: 300, ribbon: R('#1f3f8f', '#c8102e', '#1f3f8f') },
    ] },
    { id: 'garter', name: 'Order of the Garter', gift: true, for: 'former prime ministers, great servants of the Crown and the heir (24 companions)', eligible: (s) => heldOffice(s, /^gb_pm$/) || s.royal?.line === 1 || s.royal?.reigning, tiers: [
      K({ id: 'garter', name: { male: 'Knight Companion of the Order of the Garter (KG)', female: 'Lady Companion of the Order of the Garter (LG)' }, post: { male: 'KG', female: 'LG' }, min: 230, ribbon: R('#1f3f8f') }),
    ] },
  ],
};

/** The yearly chance at an order of chivalry you're eligible for (at most one a year). */
export function chivalryList(ctx, { royalGift = false } = {}) {
  const { state, rng } = ctx;
  const cc = state.character.countryId ?? 'US';
  const orders = CHIVALRY[cc];
  if (!orders || state.character.age < 21 || hasFelony(state) || state.legal.incarceration || state.royal?.reigning) return null;
  const score = eminence(state) + (state.royal ? (state.royal.reigning ? 250 : state.royal.line === 1 ? 160 : 90) : 0);
  for (const o of orders) {
    if (!o.eligible(state) || (royalGift && !o.gift)) continue;
    const held = state.honors.filter((h) => h.source === 'order' && h.country === cc).map((h) => o.tiers.findIndex((t) => t.id === h.tier)).filter((i) => i >= 0);
    const top = Math.max(-1, ...held);
    const next = [...o.tiers].reverse().find((t, i) => o.tiers.length - 1 - i > top && score >= t.min);
    if (!next || (!royalGift && !rng.chance(0.25))) continue;
    const t = award(ctx, cc, next, o.tiers);
    // Knights of these orders are styled Sir or Dame — unless a peer or royal already.
    const prefix = tierPrefix(next, state.character.gender);
    if (prefix && !state.character.peerage && !state.royal) state.character.style = { ...(state.character.style ?? {}), prefix };
    return t;
  }
  return null;
}

export const HonoursModule = {
  id: 'honours',
  order: 96,
  setup(engine) {
    // Royals receive the monarch's personal orders as they come of age (Crown.js).
    engine.bus.on('honours:royal', ({ ctx }) => chivalryList(ctx, { royalGift: true }));
  },
  onYearEnd(ctx) {
    if (!ctx.state.character.alive) return;
    knighthoodPolicyYear(ctx);
    if (!honoursList(ctx)) chivalryList(ctx);
  },
  actions: {
    /** A prime minister of Australia or New Zealand restores (or abolishes) knighthoods. Once a year. */
    knighthoods(ctx) {
      const { state } = ctx;
      const cc = state.character.countryId ?? 'US';
      if (!/^(au|nz)_pm$/.test(state.politics?.office?.id ?? '') || !(cc in KNIGHTHOODS_DEFAULT)) return ctx.toast('Only the prime minister can advise on that.', 'warn');
      if (state.yearly['honours.knighthoods']) return ctx.toast('Once a year.', 'warn');
      state.yearly['honours.knighthoods'] = 1;
      const on = !knighthoodsOn(state, cc);
      setKnighthoods(ctx, cc, on, 'On your advice, the Crown');
      // Bringing knights back is a gift to opponents.
      const o = state.politics.office;
      if (o) o.approval = Math.max(0, o.approval + (on ? -6 : 2));
      return undefined;
    },
  },
};
