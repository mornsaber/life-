/**
 * Your first life: a short checklist on the story page that ticks off as you find your way
 * round (kept in Settings, so it's once per player, not per life), and the life story you can
 * share when a life ends.
 */
import { card, esc, button } from './Components.js';

/** The steps, and the clicks that complete them. */
export const STEPS = [
  { id: 'age', icon: '▶', text: 'Age up a year', why: 'The big button at the bottom: a year passes and things happen', match: (a) => a === 'engine.ageUp' },
  { id: 'choice', icon: '🤔', text: 'Answer a choice', why: 'Life asks you things. There\'s rarely a wrong answer', match: (a) => a === 'engine.resolve' },
  { id: 'people', icon: '👪', text: 'Visit your family', why: 'Relationships: spend time, ask for help, fall out', match: (a, arg) => a === 'ui.menu' && arg === 'relationships' },
  { id: 'activities', icon: '🎯', text: 'Try an activity', why: 'Activities: hobbies, the gym, the library, mischief', match: (a, arg) => a === 'ui.menu' && arg === 'activities' },
  { id: 'work', icon: '💼', text: 'Look at school or work', why: 'Your grades now, your career later', match: (a, arg) => a === 'ui.menu' && arg === 'occupation' },
  { id: 'money', icon: '💵', text: 'Check your money and things', why: 'Assets: cash, home, car, investments', match: (a, arg) => a === 'ui.menu' && arg === 'assets' },
];

/** Settings after this click, or null if it changes nothing. */
export function markStep(settings, action, arg) {
  const done = settings.firstLife ?? [];
  const step = STEPS.find((s) => !done.includes(s.id) && s.match(action, arg));
  return step ? { ...settings, firstLife: [...done, step.id] } : null;
}
export const firstLifeDone = (settings) => STEPS.every((s) => (settings.firstLife ?? []).includes(s.id));

/** The checklist, while there's something left on it (and tips are on). */
export function firstLifeCard(state, settings) {
  if (settings.tips === false || firstLifeDone(settings) || state.character.age > 40) return '';
  const done = settings.firstLife ?? [];
  const rows = STEPS.map((s) => `<li class="${done.includes(s.id) ? 'done' : ''}"><span aria-hidden="true">${done.includes(s.id) ? '✅' : s.icon}</span> <b>${esc(s.text)}</b> <small class="muted">${esc(s.why)}</small></li>`).join('');
  return card(`Your First Life (${done.length}/${STEPS.length})`, `<ul class="tips first-life">${rows}</ul><div class="row-end">${button('Skip the tour', 'ui.hideTips', { variant: 'small ghost' })}</div>`, { icon: '🧭', accent: 'blue', fold: false });
}

const plain = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

/** A life in a few lines of plain text, for sharing: the stone, the facts, the milestones. */
export function lifeStoryText(state, obit) {
  const lines = [`${plain(obit.name)} (${obit.born}–${obit.died}), aged ${obit.age}`];
  if (obit.headline) lines.push(plain(obit.headline));
  if (obit.cause) lines.push(plain(obit.cause));
  for (const d of obit.distinctions ?? []) lines.push(`• ${plain(d)}`);
  const facts = (obit.facts ?? []).filter((f) => Array.isArray(f) && plain(f[1]) && !/^(0|\$0)\b/.test(plain(f[1])) && !/^Difficulty/.test(plain(f[0]))).slice(0, 6).map(([k, v]) => `${plain(k)}: ${plain(v)}`);
  if (facts.length) lines.push('', ...facts);
  const milestones = state.log.flatMap((y) => y.entries.filter((e) => e.kind === 'milestone' && !/^📰/.test(e.text ?? '')).map((e) => `Age ${y.age}: ${plain(e.text)}`));
  // Up to ten milestones, spread across the life.
  const step = Math.max(1, Math.ceil(milestones.length / 10));
  const picked = milestones.filter((_, i) => i % step === 0).slice(0, 10);
  if (picked.length) lines.push('', 'A life in moments:', ...picked);
  // Your life in the news: up to six years, spread across the life.
  const thread = state.news?.thread ?? [];
  if (thread.length >= 3) {
    const every = Math.max(1, Math.ceil(thread.length / 6));
    lines.push('', 'A life in the news:', ...thread.filter((_, i) => i % every === 0).slice(0, 6).map((x) => `${x.year}: ${plain(x.text)}`));
  }
  if (obit.epitaph) lines.push('', `“${plain(obit.epitaph)}”`);
  return lines.join('\n');
}
