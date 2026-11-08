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
 * Who bears arms at all, and how you get them, depends on the country (AUTHORITIES): royals,
 * peers and titled nobles inherit theirs; anyone else applies — a grant from a heraldic
 * authority (the College of Arms, Canada's Heraldic Authority, Ireland's Chief Herald) for
 * those who qualify, registration where anyone may (Belgium, South Africa, Spain), burgher arms
 * recorded in a roll (Germany, the Low Countries, the Nordics, Central Europe), or simply
 * assumed where no authority exists. Japan has no shields: every family has its kamon.
 * Arms once granted pass to your heirs; bishops, cardinals and popes bear arms by their office.
 *
 * state.arms = { granted: { age, authority, how }, pending: { age, authority } } (only for those who applied)
 */
import { RANKS } from './Peerage.js';
import { repIn } from '../life/Reputation.js';
import { priceLevel } from './Countries.js';

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

/* ------------------------------------------------------------------ */
/* Who grants arms, where                                              */
/* ------------------------------------------------------------------ */

const isOfficer = (s) => [...(s.military?.history ?? []), s.military?.service].some((t) => t && t.track === 'officer');
const degree = (s) => (s.education?.degrees ?? []).some((d) => ['bachelor', 'master', 'doctorate', 'professional'].includes(d.type));
const peakGrade = (s) => [...(s.career?.history ?? []), s.career?.job].filter(Boolean).reduce((m, j) => Math.max(m, j.peakGrade ?? j.grade ?? 0), 0);
const anyOffice = (s) => Boolean(s.politics?.office) || (s.politics?.history ?? []).length > 0;
const anyOrder = (s) => (s.honors ?? []).some((h) => h.order || h.prefix || /Order|Medal of Freedom|Cross/.test(h.name ?? ''));
/** The College of Arms' test: "eminence" — honours, a commission, public office, or a degree and real professional standing. */
function eminent(s) {
  if (anyOrder(s)) return 'your honours';
  if (isOfficer(s)) return 'your commission as an officer';
  if (anyOffice(s)) return 'public office';
  if (degree(s) && peakGrade(s) >= 6) return 'a degree and professional standing';
  return null;
}
/** Canada's test: a contribution to your community. */
function contributed(s) {
  return eminent(s) ?? (repIn(s, 'neighbourhood') >= 65 ? 'your standing in the community' : (s.civic?.volunteerYears ?? 0) >= 5 ? 'years of volunteering' : null);
}
const COLLEGE = { authority: 'the College of Arms', how: 'grant', cost: 9500, years: 1, test: eminent, bar: 'The heralds grant arms to people of standing: an honour, a commission, public office, or a degree with a senior career.' };
const BURGHER = (roll) => ({ authority: roll, how: 'roll', cost: 180, years: 0, test: () => 'citizens may adopt arms of their own', bar: 'Anyone may adopt arms and record them in the roll.' });
export const AUTHORITIES = {
  GB: COLLEGE, AU: COLLEGE, NZ: COLLEGE, JM: COLLEGE, BS: COLLEGE, PG: COLLEGE, SB: COLLEGE, TO: COLLEGE, BZ: COLLEGE,
  CA: { authority: 'the Canadian Heraldic Authority', how: 'grant', cost: 1500, years: 1, test: contributed, bar: 'Canadians who have contributed to their community may petition the Chief Herald of Canada.' },
  IE: { authority: 'the Chief Herald of Ireland', how: 'grant', cost: 4000, years: 1, test: (s) => eminent(s) ?? (degree(s) ? 'your standing' : null), bar: 'The Chief Herald grants arms to people of Irish birth or descent with some standing.' },
  ZA: { authority: 'the Bureau of Heraldry', how: 'register', cost: 120, years: 0, test: () => 'anyone may register arms', bar: 'Anyone may register arms with the Bureau of Heraldry.' },
  BE: { authority: 'the heraldic council', how: 'register', cost: 400, years: 0, test: () => 'any citizen may have arms registered', bar: 'The Flemish and Walloon heraldic councils register arms for private citizens.' },
  ES: { authority: 'the Cronista Rey de Armas', how: 'register', cost: 900, years: 0, test: () => 'any citizen may have arms certified', bar: 'The king of arms certifies arms for private families.' },
  ...Object.fromEntries(['DE', 'AT', 'CH', 'NL', 'LU', 'DK', 'NO', 'SE', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'EE', 'LV', 'LT', 'SI', 'HR'].map((cc) => [cc, BURGHER({ DE: 'the Deutsche Wappenrolle', AT: 'the Austrian heraldic roll', CH: 'the cantonal armorial', NL: 'the Centraal Bureau voor Genealogie', SE: 'the Swedish heraldic roll', DK: 'the Danish heraldic roll', NO: 'the Norwegian heraldic roll', FI: 'the Finnish heraldic roll', PL: 'the Polish heraldic roll' }[cc] ?? 'the national heraldic roll')])),
  JP: { authority: null, how: 'mon', cost: 0, years: 0, test: () => 'every family has its kamon', bar: 'Japanese families bear a kamon — a family crest — rather than a shield.' },
};
const ASSUME = { authority: null, how: 'assume', cost: 0, years: 0, test: () => 'no authority regulates arms here', bar: 'No heraldic authority here: you may adopt arms of your own.' };
export const authorityFor = (cc) => AUTHORITIES[cc] ?? ASSUME;

/** Whether you bear arms, and why. */
export function bearsArms(state) {
  const cc = state.character.countryId ?? 'US';
  if (state.royal) return { yes: true, why: 'the royal house' };
  if (state.character.peerage) return { yes: true, why: 'your peerage' };
  if (state.noble) return { yes: true, why: 'a titled family' };
  if (state.arms?.granted) return { yes: true, why: state.arms.granted.inherited ? 'arms inherited from your parent' : `${state.arms.granted.how === 'assume' ? 'arms you adopted' : `arms ${state.arms.granted.how === 'grant' ? 'granted by' : 'recorded with'} ${state.arms.granted.authority}`}` };
  if (state.holySee?.pope || state.holySee?.cardinal || state.community?.orders?.grade === 'bishop') return { yes: true, why: 'your office in the Church' };
  if (authorityFor(cc).how === 'mon') return { yes: true, why: 'the family kamon' };
  return { yes: false, why: null };
}

/** What applying would take, here and now. */
export function applicationFor(state) {
  const cc = state.character.countryId ?? 'US';
  const a = authorityFor(cc);
  const reason = a.test(state);
  return { ...a, cost: Math.round(a.cost * priceLevel(state)), ok: Boolean(reason) && state.character.age >= 18, reason, pending: state.arms?.pending ?? null };
}

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
const DECORATION = /Cross|Star|Order|Medal for Gallantry|Military Medal|Conspicuous|Distinguished/i;
const CAMPAIGN = /Service Medal|Campaign|Expedition|Commendation|Achievement|Good Conduct|Jubilee|Coronation|Long Service|Defence|Defense Service|Operational Service/i;
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
  const circlet = grand ? { name: grand.baseName ?? grand.name, colour: firstColour(grand.ribbon, '#1f3f8f'), motto: /Garter/.test(grand.name) ? 'HONI SOIT QUI MAL Y PENSE' : String(typeof grand.order === 'string' ? grand.order : grand.name).replace(/\s*\([^)]*\)/g, '').toUpperCase().slice(0, 34) } : null;
  if (circlet) legend.push(`🎗️ The circlet of the ${circlet.name.replace(/\s*\([^)]*\)/g, '')}.`);
  const badges = [];
  for (const h of honors) {
    if (h === grand || badges.length >= 3) continue;
    if (VALOUR.test(h.name)) badges.push({ name: h.name, colour: firstColour(h.ribbon, '#8b0a1d'), valour: true });
    else if (orders.includes(h)) badges.push({ name: h.name, colour: firstColour(h.ribbon, '#6b4fa0') });
    // Decorations may hang below the shield whatever your rank; campaign and service medals don't.
    else if (h.source === 'military' && DECORATION.test(h.name) && !CAMPAIGN.test(h.name)) badges.push({ name: h.name, colour: firstColour(h.ribbon, '#5b2a86') });
  }
  if (badges.length) legend.push(`🏅 Hung below the shield: ${badges.map((b) => b.name.replace(/\s*\([^)]*\)/g, '')).join('; ')}.`);

  // Supporters.
  const ledCountry = HEAD_OF_GOVERNMENT.test(state.politics?.office?.id ?? '') || (state.politics?.history ?? []).some((h) => HEAD_OF_GOVERNMENT.test(h.officeId ?? ''));
  const mil = peakMilitary(state);
  const fieldMarshal = (mil?.grade ?? 0) >= 9;
  const offices = [state.politics?.office?.id, ...(state.politics?.history ?? []).map((h) => h.officeId)].filter(Boolean);
  const governorGeneral = offices.some((id) => /_gg$/.test(id));
  const viceRegal = governorGeneral || offices.some((id) => /_lg$|_governor$/.test(id));
  if (governorGeneral) badges.unshift({ name: 'The vice-regal badge', colour: '#1f2b6f', viceRegal: true });
  badges.splice(3);
  const supporters = royal || peer || noble || grand || ledCountry || fieldMarshal || viceRegal ? SUPPORTERS[shield.charge] ?? SUPPORTERS.default : null;
  if (supporters) legend.push(`🦁 Supporters (${supporters}): ${royal ? 'royalty' : peer || noble ? 'a peer\'s right' : grand ? 'a Grand Cross' : viceRegal ? `you served as the Crown's representative${governorGeneral ? ', and the vice-regal badge hangs below' : ''}` : ledCountry ? 'you led a government' : 'a field marshal'}.`);

  // Behind the shield: senior command.
  let behind = null;
  if (mil && (mil.grade ?? 0) >= 6) {
    behind = fieldMarshal ? 'batons' : mil.branch === 'navy' || mil.branch === 'coastguard' ? 'anchors' : mil.branch === 'airforce' ? 'wings' : 'swords';
    legend.push(`${{ batons: '🎖️ Crossed batons', anchors: '⚓ Crossed anchors', wings: '🪽 Wings', swords: '⚔️ Crossed swords' }[behind]} behind the shield: ${fieldMarshal ? 'a five-star rank' : 'flag rank'}.`);
  }

  const cc = c.countryId ?? 'US';
  const mon = authorityFor(cc).how === 'mon' && !hat;
  const bears = bearsArms(state);
  if (bears.yes) legend.unshift(`🛡️ You bear arms by ${bears.why}.`);
  if (mon) legend.unshift(royal ? '🌼 The chrysanthemum: the imperial crest.' : '⭕ The family kamon, in place of a shield.');
  if (legend.length === 1) legend.push('What you do with your life — titles, orders, decorations, high command, vice-regal office, the Church — will add to them.');
  // Continental nobles wear their own coronets of rank (a count's nine pearls, not an earl's leaves).
  const continental = Boolean(coronet && !royal && cc !== 'GB' && !['IE', 'AU', 'NZ', 'CA'].includes(cc));
  return { ...shield, female, coronet, continental, helm, hat, circlet, badges, supporters, behind, legend, mon, imperial: mon && Boolean(royal), armigerous: bears.yes, blazon: mon ? 'A kamon' : blazonOf(shield) };
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

/* ------------------------------------------------------------------ */
/* Applying for arms                                                   */
/* ------------------------------------------------------------------ */

export const HeraldryModule = {
  id: 'heraldry',
  order: 97,

  onAgeUp(ctx) {
    const { state } = ctx;
    const p = state.arms?.pending;
    if (!p || state.character.age - p.age < 1) return;
    state.arms.granted = { age: state.character.age, authority: p.authority, how: 'grant' };
    state.arms.pending = null;
    ctx.log(`Letters patent from ${p.authority}: arms are granted to you and your descendants. ${familyShield(state.character.lastName).motto}.`, '🛡️', 'milestone');
  },

  actions: {
    /** Apply for (or register, or adopt) arms. */
    apply(ctx) {
      const { state } = ctx;
      if (bearsArms(state).yes) return ctx.toast('You already bear arms.', 'info');
      const app = applicationFor(state);
      if (app.pending) return ctx.toast(`Your petition is with ${app.pending.authority}.`, 'info');
      if (!app.ok) return ctx.toast(state.character.age < 18 ? 'Arms are granted to adults.' : app.bar, 'warn');
      if (app.cost && !ctx.spend(app.cost, app.how === 'grant' ? 'Fees for a grant of arms' : 'Registering arms', { credit: true })) return ctx.toast('You can\'t afford the fees.', 'warn');
      state.arms ??= {};
      if (app.how === 'grant') {
        state.arms.pending = { age: state.character.age, authority: app.authority };
        return ctx.log(`You petitioned ${app.authority} for a grant of arms, on the strength of ${app.reason}. The heralds will design them with you; letters patent take about a year.`, '📜', 'info');
      }
      state.arms.granted = { age: state.character.age, authority: app.authority, how: app.how };
      return ctx.log(app.how === 'assume' ? 'With no heraldic authority to ask, you adopted arms of your own and had them painted.' : `Your arms were recorded with ${app.authority}.`, '🛡️', 'good');
    },
  },
};
