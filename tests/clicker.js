/**
 * Monkey test: plays lives by pressing random *enabled buttons the UI
 * actually shows* (with random choices in any dropdowns beside them),
 * answering prompts at random, and aging up. Every action that throws,
 * every view that fails to render, and every bit of player-facing text
 * that leaks "undefined", "NaN", "[object Object]" or "Infinity" is a bug.
 *
 *   node tests/clicker.js [lives=40] [seed=1] [clicksPerYear=6]
 */
import { Engine } from '../src/core/Engine.js';
import { Store, fixMoneySigns } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { promptModal } from '../src/ui/Components.js';

const LIVES = Number(process.argv[2] ?? 40);
const SEED = Number(process.argv[3] ?? 1);
const CLICKS = Number(process.argv[4] ?? 6);

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const engine = new Engine({ store: new Store(memory()), rng: new Random(SEED), modules: MODULES });
const monkey = new Random(SEED + 7);
const BAD = /\bundefined\b|\bNaN\b|\[object |\bInfinity\b|\$-\d|-\$-/;
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (html) => unesc(fixMoneySigns(html).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '));

const bugs = new Map();
function bug(kind, detail, context) {
  const key = `${kind}: ${detail}`.slice(0, 220);
  if (!bugs.has(key)) bugs.set(key, { count: 0, context });
  bugs.get(key).count += 1;
}

let lastAction = 'start';
engine.bus.on('toast', ({ text }) => { if (BAD.test(text)) bug('toast', text, lastAction); });

/** Enabled buttons in a view, with the arg a click would send. */
function buttons(html) {
  const out = [];
  const re = /<button class="btn[^"]*" data-action="([^"]+)"((?: data-arg="[^"]*")?)((?: data-collect)?)((?: disabled)?)/g;
  let m;
  while ((m = re.exec(html))) {
    const [, action, argAttr, collect, disabled] = m;
    if (disabled || action.startsWith('ui.') || action.startsWith('engine.')) continue;
    let arg = argAttr ? unesc(argAttr.slice(11, -1)) : undefined;
    if (collect) {
      const root = html.lastIndexOf('data-collect-root', m.index);
      if (root !== -1) {
        const chunk = html.slice(root, m.index);
        const parts = [];
        const field = /<(select|input)[^>]*data-part[^>]*>([\s\S]*?<\/select>)?/g;
        let f;
        while ((f = field.exec(chunk))) {
          if (f[1] === 'select') {
            const values = [...(f[2] ?? '').matchAll(/<option[^>]*value="([^"]*)"(?![^>]*disabled)/g)].map((x) => unesc(x[1]));
            parts.push(values.length ? monkey.pick(values) : '');
          } else {
            const v = f[0].match(/value="([^"]*)"/);
            const type = f[0].match(/type="([^"]*)"/)?.[1];
            parts.push(type === 'number' ? String(monkey.int(0, 50000)) : v ? unesc(v[1]) : 'x');
          }
        }
        if (parts.length) arg = parts.join(':');
      }
    }
    out.push({ action, arg });
  }
  return out;
}

function renderAll(state) {
  const all = [];
  for (const [tab, view] of Object.entries(VIEWS)) {
    let html;
    try {
      html = view(state);
    } catch (e) {
      bug('render', `${tab}: ${e.message}`, `${lastAction}\n${e.stack.split('\n').slice(1, 4).join('\n')}`);
      continue;
    }
    const text = strip(html);
    const hit = text.match(new RegExp(`.{0,60}(${BAD.source}).{0,60}`));
    if (hit) bug('view', `${tab}: ${hit[0].trim()}`, lastAction);
    all.push(html);
  }
  for (const p of state.prompts) {
    try {
      const text = strip(promptModal(p, 1));
      const hit = text.match(new RegExp(`.{0,60}(${BAD.source}).{0,60}`));
      if (hit) bug('prompt', `${p.type}: ${hit[0].trim()}`, lastAction);
    } catch (e) {
      bug('prompt-render', `${p.type}: ${e.message}`, lastAction);
    }
  }
  return all;
}

function scanLog(state, seen) {
  const entries = state.log.flatMap((b) => b.entries);
  for (const e of entries.slice(seen)) if (BAD.test(fixMoneySigns(e.text))) bug('log', e.text.slice(0, 160), lastAction);
  return entries.length;
}

function answerPrompts(state) {
  for (let guard = 0; state.prompts.length && guard < 40; guard++) {
    const p = state.prompts[0];
    const options = p.options.filter((o) => !o.disabled);
    if (!options.length) { bug('prompt', `${p.type}: no enabled option`, lastAction); state.prompts.shift(); continue; }
    const o = monkey.pick(options);
    lastAction = `resolve ${p.type}:${o.id}`;
    try { engine.resolvePrompt(p.id, o.id); } catch (e) { bug('resolve', `${p.type}:${o.id}: ${e.message}`, e.stack.split('\n').slice(1, 4).join('\n')); state.prompts.shift(); }
  }
}

let years = 0;
let clicks = 0;
for (let life = 0; life < LIVES; life++) {
  let state = engine.newLife({});
  let seen = 0;
  while (state.character.alive && state.character.age < 105) {
    const views = renderAll(state);
    for (let c = 0; c < CLICKS; c++) {
      answerPrompts(state);
      const pool = buttons(views[monkey.int(0, views.length - 1)] ?? '');
      if (!pool.length) continue;
      const { action, arg } = monkey.pick(pool);
      lastAction = `${action}(${arg ?? ''}) at ${state.character.age}`;
      clicks += 1;
      try { engine.dispatch(action, arg); } catch (e) { bug('action', `${action}(${arg ?? ''}): ${e.message}`, e.stack.split('\n').slice(1, 4).join('\n')); }
      seen = scanLog(state, seen);
    }
    answerPrompts(state);
    lastAction = `ageUp ${state.character.age}`;
    try { engine.ageUp(); } catch (e) { bug('ageUp', e.message, e.stack.split('\n').slice(1, 5).join('\n')); break; }
    answerPrompts(state);
    seen = scanLog(state, seen);
    state = engine.state;
    years += 1;
  }
  try {
    const restored = new Store(engine.store.storage).load();
    if (JSON.stringify(restored) !== JSON.stringify(engine.state)) bug('save', 'round-trip differs', lastAction);
  } catch (e) { bug('save', e.message, lastAction); }
}

console.log(`Played ${LIVES} lives, ${years} years, ${clicks} clicks.`);
if (!bugs.size) {
  console.log('✔ No bugs found');
} else {
  console.log(`✘ ${bugs.size} distinct problems:`);
  for (const [k, v] of [...bugs].sort((a, b) => b[1].count - a[1].count)) console.log(`  [${v.count}×] ${k}\n      ↳ ${String(v.context).replace(/\n/g, '\n        ')}`);
  process.exit(1);
}
