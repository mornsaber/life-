/**
 * Player preferences, kept apart from saves (they apply to every life):
 * theme, auto-resolving routine decisions and the debug undo button.
 */
const KEY = 'lifesim.settings';
export const DEFAULTS = { theme: 'auto', autoResolve: false, debugUndo: false };

export function loadSettings(storage = globalThis.localStorage) {
  try {
    return { ...DEFAULTS, ...JSON.parse(storage?.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

/** Resolve 'auto' against the OS preference and apply it to <html data-theme>. */
export function applyTheme(theme, doc = globalThis.document) {
  if (!doc) return;
  const prefersLight = globalThis.matchMedia?.('(prefers-color-scheme: light)').matches;
  const resolved = theme === 'auto' ? (prefersLight ? 'light' : 'dark') : theme;
  doc.documentElement.dataset.theme = resolved;
  doc.querySelector('meta[name="color-scheme"]')?.setAttribute('content', resolved);
}
