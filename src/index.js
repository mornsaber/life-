/**
 * Application entry point: builds the engine with every domain module,
 * restores the saved life, and routes all DOM input to the engine through a
 * single delegated click handler plus keyboard shortcuts.
 *
 *   Space / Enter  → Age up
 *   1–9            → Choose an option in the open decision
 */
import { Engine } from './core/Engine.js';
import { Store } from './core/State.js';
import { Random } from './core/Random.js';
import { MODULES } from './modules/registry.js';
import { Renderer } from './ui/Renderer.js';

const store = new Store();
const engine = new Engine({ store, rng: new Random(), modules: MODULES });
const renderer = new Renderer({
  root: document.getElementById('app'),
  toastRoot: document.getElementById('toasts'),
  engine,
});

engine.bus.on('change', (state) => renderer.render(state));
engine.bus.on('toast', ({ text, kind }) => renderer.toast(text, kind));
engine.bus.on('ageUp', () => window.scrollTo({ top: 0 }));

function startNewLife(form) {
  const data = new FormData(form);
  const gender = data.get('gender');
  engine.newLife({
    firstName: data.get('firstName'),
    lastName: data.get('lastName'),
    gender: gender === 'random' ? undefined : gender,
  });
}

function handleAction(el) {
  const action = el.dataset.action;
  const arg = el.dataset.arg;
  switch (action) {
    case 'ui.tab':
      return renderer.setTab(arg);
    case 'engine.ageUp':
      return engine.ageUp();
    case 'engine.resolve':
      return engine.resolvePrompt(el.dataset.prompt, el.dataset.option);
    case 'engine.newLife':
      return startNewLife(el.closest('form'));
    case 'engine.abandon':
      if (arg === 'skipConfirm' || window.confirm('Abandon this life and start over? This cannot be undone.')) engine.abandonLife();
      return undefined;
    default:
      return engine.dispatch(action, arg);
  }
}

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  event.preventDefault();
  try {
    handleAction(el);
  } catch (err) {
    console.error(err);
    renderer.toast(`Something went wrong: ${err.message}`, 'bad');
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'new-life-form') return;
  event.preventDefault();
  startNewLife(event.target);
});

document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const state = engine.state;
  if (!state?.character.alive) return;

  const prompt = state.prompts[0];
  if (prompt && /^[1-9]$/.test(event.key)) {
    const option = prompt.options[Number(event.key) - 1];
    if (option && !option.disabled) engine.resolvePrompt(prompt.id, option.id);
    event.preventDefault();
    return;
  }
  if ((event.key === ' ' || event.key === 'Enter') && tag !== 'BUTTON') {
    event.preventDefault();
    engine.ageUp();
  }
});

if (!engine.boot()) renderer.render(null);
