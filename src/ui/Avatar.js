/**
 * The player's avatar, dressed for the life: the job's own emoji (a police officer, a firefighter,
 * a doctor, a pilot), a crown for royalty, a helmet or medals in uniform, chains in prison, a top
 * hat or a bonnet for a well-off life before the 1920s, a diamond for a great fortune — all in
 * the player's skin tone.
 */
import { toned, skinToneOf } from '../modules/people/SkinTone.js';
import { yearNow } from '../modules/world/Eras.js';
import { netWorth } from '../core/State.js';
import { isPope } from '../modules/world/HolySee.js';

const ZWJ = '‍';
const SIGN = { female: `${ZWJ}♀️`, male: `${ZWJ}♂️` };
/** "Person + object" jobs (👩‍⚕️, 👨‍🚒) and jobs with their own figure (👮, 💂, 🕵️, 👷, 🤵). */
const OBJECT = (o) => ({ object: o });
const FIGURE = (f) => ({ figure: f });
const JOBS = [
  [/police|sheriff|trooper|constab|gendarm|marshal|border|transitPolice|airportPolice|corrections|jail|prison|warden/i, FIGURE('👮')],
  [/fire/i, OBJECT('🚒')],
  [/detective|intel|privateInvestigator|espionage|spy|fbi|cia/i, FIGURE('🕵️')],
  [/guard|royalGuard|security/i, FIGURE('💂')],
  [/ems|paramedic|nurs|medical|physician|surgeon|dental|pharm|clinic|health|doctor|midwife|veterin/i, OBJECT('⚕️')],
  [/judge|judiciary|court/i, OBJECT('⚖️')],
  [/education|teach|professor|academ|school|tutor/i, OBJECT('🏫')],
  [/space/i, OBJECT('🚀')],
  [/aviation|pilot|flight|airline/i, OBJECT('✈️')],
  [/tech|software|cyber|data|aiOps|computer|gameDev/i, OBJECT('💻')],
  [/chef|culinary|cook|restaurant|catering|bak/i, OBJECT('🍳')],
  [/farm|ranch|agri|fish|forest/i, OBJECT('🌾')],
  [/coalMining|mining|construction|builder|roof|demolition|docks|lamplighter/i, FIGURE('👷')],
  [/mill|factory|machine|steel|manufactur|foundry/i, OBJECT('🏭')],
  [/electric|plumb|mechanic|trade|carpent|hvac|blacksmith|railway|steamRailway|auto|weld/i, OBJECT('🔧')],
  [/science|lab|research|chemist|physic/i, OBJECT('🔬')],
  [/music|singer|band/i, OBJECT('🎤')],
  [/acting|art|design|photo|film/i, OBJECT('🎨')],
  [/domesticService|butler|valet|housekeep/i, FIGURE('🤵')],
  [/corporate|finance|account|law|legal|sales|insurance|realestate|office|typing|clerk|consult|bank|admin|civil|diplomat|foreignService|politic|journalism|switchboard|telegraph/i, OBJECT('💼')],
];

const person = (gender) => (gender === 'female' ? '👩' : gender === 'male' ? '👨' : '🧑');
const withSign = (figure, gender) => `${figure}${SIGN[gender] ?? ''}`;

/** The base figure: a child, an elder, a royal, or the job's own emoji. */
function figureFor(state) {
  const c = state.character;
  const g = c.gender;
  if (c.age < 3) return '👶';
  if (c.age < 13) return g === 'female' ? '👧' : '👦';
  if (state.royal) return g === 'female' ? '👸' : '🤴';
  if (state.military?.service?.branch === 'royalGuard' || /guard/i.test(state.career?.job?.title ?? '') && state.military?.service) return withSign('💂', g);
  const job = state.career?.job;
  const key = `${job?.professionId ?? ''} ${job?.title ?? ''}`;
  const hit = job ? JOBS.find(([re]) => re.test(key))?.[1] : null;
  if (hit?.figure) return withSign(hit.figure, g);
  if (hit?.object) return `${person(g)}${ZWJ}${hit.object}`;
  if (c.age >= 65) return g === 'female' ? '👵' : '👴';
  return person(g);
}

/** Small badges at the corners: a hat (top) and a status (bottom). */
function badgesFor(state) {
  const c = state.character;
  const y = yearNow(state);
  const worth = c.age >= 18 ? netWorth(state) : 0;
  const svc = state.military?.service;
  let top = '';
  let bottom = '';
  if (state.royal?.reigning || (state.royal && state.royal.level === 'monarch')) top = '👑';
  else if (isPope(state)) top = '⛪';
  else if (svc && svc.component === 'active') top = svc.track === 'officer' && svc.grade >= 6 ? '⭐' : '🪖';
  else if (c.age >= 16 && y < 1920 && (worth >= 300000 || state.character.peerage || state.house)) top = c.gender === 'female' ? '👒' : '🎩';
  else if (c.age >= 16 && y < 1950 && c.gender === 'female' && worth >= 1000000) top = '👒';
  if (state.legal?.incarceration) bottom = '⛓️';
  else if (svc && (svc.combatTours ?? 0) > 0) bottom = '🎖️';
  else if (worth >= 10000000) bottom = '💎';
  else if (state.character.peerage) bottom = '⚜️';
  return { top, bottom };
}

/** The avatar's HTML. */
export function avatarHtml(state) {
  const figure = toned(figureFor(state), skinToneOf(state));
  const { top, bottom } = badgesFor(state);
  return `<div class="avatar" title="${state.career?.job?.title ?? ''}"><span class="avatar-figure">${figure}</span>${top ? `<span class="avatar-hat" aria-hidden="true">${top}</span>` : ''}${bottom ? `<span class="avatar-badge" aria-hidden="true">${bottom}</span>` : ''}</div>`;
}
