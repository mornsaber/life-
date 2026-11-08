/**
 * Your coat of arms, and how your life changes it.
 *
 * The shield is the family's: tinctures, a division, an ordinary and a charge, drawn from the
 * surname, so parents, children and heirs share it. Around it, the achievement grows with the
 * life you lead:
 *   helm        an esquire's steel helm in profile; a knight's open visor; a peer's silver
 *               barred helm; a royal's gold one. Clergy bear an ecclesiastical hat instead
 *               (black for a priest, green with tassels for a bishop, red for a cardinal), and a
 *               pope the tiara and crossed keys.
 *   coronet     a peer's or titled noble's coronet of rank (baron to duke); the crown for royals
 *   circlet     the highest order of chivalry, in its ribbon's colours, around the shield
 *               (the Garter's blue garter and motto, a Grand Cross's circlet)
 *   badges      lesser orders and the highest gallantry awards, hung below the shield
 *   supporters  for peers, Knights and Dames Grand Cross, royals and heads of government
 *   behind      crossed swords for a general, anchors for an admiral, wings for an air marshal,
 *               batons for a field marshal
 *   motto       the family's, on a scroll
 * Everything is read from the life; nothing is stored.
 */
import { RANKS } from './Peerage.js';

export const TINCTURES = {
  or: { name: 'Or', hex: '#e2b52f', metal: true }, argent: { name: 'Argent', hex: '#f1f1ee', metal: true },
  gules: { name: 'Gules', hex: '#c0242f' }, azure: { name: 'Azure', hex: '#2456a6' }, vert: { name: 'Vert', hex: '#1f7a3e' },
  sable: { name: 'Sable', hex: '#26262b' }, purpure: { name: 'Purpure', hex: '#6d3d93' },
};
const METALS = ['or', 'argent'];
const COLOURS = ['gules', 'azure', 'vert', 'sable', 'purpure'];
export const DIVISIONS = { plain: '', perPale: 'per pale', perFess: 'per fess', perBend: 'per bend', quarterly: 'quarterly', perChevron: 'per chevron' };
export const ORDINARIES = { none: '', fess: 'a fess', pale: 'a pale', bend: 'a bend', chevron: 'a chevron', cross: 'a cross', saltire: 'a saltire', chief: 'a chief' };
/** Charges: a glyph and its blazon name (singular, plural). */
export const CHARGES = {
  mullet: ['★', 'mullet', 'mullets'], estoile: ['✶', 'estoile', 'estoiles'], crescent: ['☾', 'crescent', 'crescents'], fleur: ['⚜', 'fleur-de-lis', 'fleurs-de-lis'],
  rose: ['✿', 'rose', 'roses'], tower: ['♜', 'tower', 'towers'], horse: ['♞', 'horse', 'horses'], cross: ['✠', 'cross formée', 'crosses formée'],
  anchor: ['⚓', 'anchor', 'anchors'], sun: ['☀', 'sun in splendour', 'suns in splendour'], heart: ['♥', 'heart', 'hearts'], lion: ['♌', 'lion', 'lions'], key: ['⚷', 'key', 'keys'],
};
const MOTTOES = ['Fortis et fidelis', 'Semper paratus', 'Virtute et labore', 'Per ardua', 'Fide et fortitudine', 'Nil desperandum', 'Spero meliora', 'Labor omnia vincit', 'Veritas vincit',
  'Audaces fortuna juvat', 'Lux in tenebris', 'Constantia et fide', 'Dum spiro spero', 'Honor et virtus', 'Ad astra', 'Pro patria', 'Ex unitate vires', 'Festina lente'];
const SUPPORTERS = { lion: 'lions', horse: 'horses', tower: 'griffins', key: 'stags', anchor: 'sea-horses', default: 'lions' };

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
const pick = (h, list, salt) => list[(h >>> salt) % list.length];

/** The family's shield, from the surname: the same for everyone who bears the name. */
export function familyShield(lastName = 'Smith') {
  const h = hash(String(lastName).toLowerCase());
  const metalField = h % 2 === 0;
  const field = metalField ? pick(h, METALS, 3) : pick(h, COLOURS, 3);
  const second = metalField ? pick(h, COLOURS, 7) : pick(h, METALS, 7);
  const division = pick(h, Object.keys(DIVISIONS), 11);
  const ordinary = division === 'quarterly' ? 'none' : pick(h, Object.keys(ORDINARIES), 14);
  const charge = pick(h, Object.keys(CHARGES), 18);
  let count = [1, 1, 2, 3, 3][(h >>> 22) % 5];
  // Charges set around an ordinary come in twos or threes (three around a chevron).
  if (!['none', 'chief'].includes(ordinary)) count = ordinary === 'chevron' ? 3 : Math.max(2, count);
  // Rule of tincture: metal on colour, colour on metal — the ordinary and the charges take the other kind.
  return { field, second, division, ordinary, charge, count, motto: pick(h, MOTTOES, 25) };
}

const honorsOf = (s) => s.honors ?? [];
const firstColour = (ribbon, fallback) => (Array.isArray(ribbon) && ribbon[0] ? (Array.isArray(ribbon[0]) ? ribbon[0][0] : ribbon[0]) : fallback);
const GRAND = /Garter|Thistle|Grand Cross|Grand Officer|Grand Cordon|Grand Collar|Großkreuz|Grand-Croix|Gran Cruz|Knight Grand|Dame Grand/i;
const COMMANDER = /Knight Commander|Dame Commander|Knight Companion|Lady Companion|Commandeur|Commander of the|Komtur/i;
const VALOUR = /Victoria Cross|Medal of Honor|George Cross|Param Vir Chakra|Cross of Valour/i;
/** Your peak military grade, branch and track. */
function peakMilitary(s) {
  const tours = [...(s.military?.history ?? []), s.military?.service].filter(Boolean);
  let best = null;
  for (const t of tours) if (t.track === 'officer' && (!best || (t.grade ?? 0) > (best.grade ?? 0))) best = t;
  return best;
}
const HEAD_OF_GOVERNMENT = /president|_pm$|primeMinister|premier|chancellor/i;

/** Everything on your achievement of arms, and why. */
export function armsOf(state) {
  const c = state.character;
  const shield = familyShield(c.lastName);
  const legend = [];
  const female = c.gender === 'female';
  const royal = state.royal;
  const peer = c.peerage;
  const noble = state.noble && !state.noble.heir ? state.noble : null;
  const honors = honorsOf(state);
  const orders = honors.filter((h) => h.order || h.prefix || GRAND.test(h.name) || COMMANDER.test(h.name));
  const knighted = Boolean(c.style?.prefix && /^(Sir|Dame)$/.test(c.style.prefix)) || orders.some((h) => h.prefix);
  const clergy = state.community?.orders && !state.community.orders.laicized ? state.community.orders.grade : null;
  const pope = Boolean(state.holySee?.pope);
  const cardinal = Boolean(state.holySee?.cardinal) || (state.career?.job?.professionId === 'catholicClergy' && state.career.job.levelId === 'cardinal');

  // The crown or coronet.
  let coronet = null;
  if (royal) { coronet = royal.reigning ? 'sovereign' : royal.line === 1 ? 'heir' : 'royal'; legend.push(royal.reigning ? '👑 The crown: you reign.' : '👑 A royal coronet: a member of the royal house.'); }
  else if (peer || noble) {
    coronet = (peer ?? noble).rank;
    legend.push(`🎩 The coronet of ${/^[aeiou]/i.test(RANKS[coronet]?.male ?? '') ? 'an' : 'a'} ${RANKS[coronet]?.[female ? 'female' : 'male'] ?? 'peer'}${peer?.kind === 'life' ? ' (a life peerage)' : ''}.`);
  }

  // The helm, or the hat for clergy.
  let helm = 'esquire';
  let hat = null;
  if (pope) { hat = 'tiara'; helm = null; legend.push('🗝️ The papal tiara and the crossed keys of Peter.'); }
  else if (cardinal) { hat = 'cardinal'; helm = null; legend.push('🎓 A cardinal\'s red hat, with fifteen tassels a side.'); }
  else if (clergy === 'bishop') { hat = 'bishop'; helm = null; legend.push('🎓 A bishop\'s green hat with six tassels a side.'); }
  else if (clergy === 'priest' || clergy === 'deacon' || clergy === 'minister') { hat = 'priest'; helm = null; legend.push('🎓 A priest\'s black hat in place of a helm.'); }
  else if (royal) helm = 'royal';
  else if (peer || noble) helm = 'peer';
  else if (knighted) { helm = 'knight'; legend.push(`⚔️ A knight's helm, visor open: ${female ? 'Dame' : 'Sir'} ${c.firstName}.`); }

  // Orders: the highest becomes the circlet; the rest hang below as badges.
  const grand = orders.find((h) => /Garter/.test(h.name)) ?? orders.find((h) => GRAND.test(h.name));
  const circlet = grand ? { name: grand.baseName ?? grand.name, colour: firstColour(grand.ribbon, '#1f3f8f'), motto: /Garter/.test(grand.name) ? 'HONI SOIT QUI MAL Y PENSE' : (grand.order ?? grand.name).replace(/\s*\([^)]*\)/g, '').toUpperCase().slice(0, 34) } : null;
  if (circlet) legend.push(`🎗️ The circlet of the ${circlet.name.replace(/\s*\([^)]*\)/g, '')}.`);
  const badges = [];
  for (const h of honors) {
    if (h === grand || badges.length >= 3) continue;
    if (VALOUR.test(h.name)) badges.push({ name: h.name, colour: firstColour(h.ribbon, '#8b0a1d'), valour: true });
    else if (orders.includes(h)) badges.push({ name: h.name, colour: firstColour(h.ribbon, '#6b4fa0') });
  }
  if (badges.length) legend.push(`🏅 Hung below the shield: ${badges.map((b) => b.name.replace(/\s*\([^)]*\)/g, '')).join('; ')}.`);

  // Supporters.
  const ledCountry = HEAD_OF_GOVERNMENT.test(state.politics?.office?.id ?? '') || (state.politics?.history ?? []).some((h) => HEAD_OF_GOVERNMENT.test(h.officeId ?? ''));
  const mil = peakMilitary(state);
  const fieldMarshal = (mil?.grade ?? 0) >= 9;
  const supporters = royal || peer || noble || grand || ledCountry || fieldMarshal ? SUPPORTERS[shield.charge] ?? SUPPORTERS.default : null;
  if (supporters) legend.push(`🦁 Supporters (${supporters}): ${royal ? 'royalty' : peer || noble ? 'a peer\'s right' : grand ? 'a Grand Cross' : ledCountry ? 'you led a government' : 'a field marshal'}.`);

  // Behind the shield: senior command.
  let behind = null;
  if (mil && (mil.grade ?? 0) >= 6) {
    behind = fieldMarshal ? 'batons' : mil.branch === 'navy' || mil.branch === 'coastguard' ? 'anchors' : mil.branch === 'airforce' ? 'wings' : 'swords';
    legend.push(`${{ batons: '🎖️ Crossed batons', anchors: '⚓ Crossed anchors', wings: '🪽 Wings', swords: '⚔️ Crossed swords' }[behind]} behind the shield: ${fieldMarshal ? 'a five-star rank' : 'flag rank'}.`);
  }

  if (!legend.length) legend.push('🛡️ The family\'s arms. What you do with your life — titles, orders, high command, the Church — will add to them.');
  return { ...shield, female, coronet, helm, hat, circlet, badges, supporters, behind, legend, blazon: blazonOf(shield) };
}

/** The shield in words: "Azure, a fess Or between three mullets Or"; "Per pale Or and Gules, a bend counterchanged". */
export function blazonOf(s) {
  const T = (t) => TINCTURES[t].name;
  const [, one, many] = CHARGES[s.charge];
  const charges = s.count === 1 ? `${/^[aeiou]/.test(one) ? 'an' : 'a'} ${one}` : `${['', '', 'two', 'three'][s.count]} ${many}`;
  if (s.division !== 'plain') {
    const field = `${DIVISIONS[s.division][0].toUpperCase()}${DIVISIONS[s.division].slice(1)} ${T(s.field)} and ${T(s.second)}`;
    return `${field}, ${s.ordinary === 'none' ? charges : `${ORDINARIES[s.ordinary]} between ${charges}`}, all counterchanged`;
  }
  if (s.ordinary === 'none') return `${T(s.field)}, ${charges} ${T(s.second)}`;
  if (s.ordinary === 'chief') return `${T(s.field)}, on a chief ${T(s.second)} ${charges} ${T(s.field)}`;
  return `${T(s.field)}, ${ORDINARIES[s.ordinary]} between ${charges} ${T(s.second)}`;
}
