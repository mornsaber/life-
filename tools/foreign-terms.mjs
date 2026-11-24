// Audit: American words where they don't belong. Plays a service career in each country (army,
// navy, air force), then reads every tab as the page draws it (period words and the country's own
// terms applied) and the life story, for US branch names, pay grades, the VA, ROTC and the like.
//
//   node tools/foreign-terms.mjs [CC:YEAR ...] [--strict]
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { enlist, discharge } from '../src/modules/military/MilitaryEngine.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { periodText } from '../src/modules/world/Eras.js';
import { sync } from '../src/modules/world/History.js';
import { localizeHtml, countryOf } from '../src/modules/world/Countries.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const US = /U\.S\.|United States|Marine Corps|Army Air Forces|ROTC|West Point|Annapolis|\bE-\d|\bO-\d|GI Bill|VA\b|Veterans Affairs|Navy SEAL/;
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const cells = argv.length ? argv : ['GB:1960', 'DE:1990', 'FR:1990', 'IN:1990', 'JP:1990', 'AU:1960', 'CA:1990', 'BR:1990', 'RU:1990'];
let total = 0;
for (const cell of cells) {
  const [cc, y] = cell.split(':');
  for (const branch of ['army', 'navy', 'airforce']) {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(11), modules: MODULES });
    const state = engine.newLife({ countryId: cc, startYear: Number(y) - 19, gender: 'male' });
    state.character.age = 19; state.prompts = []; sync(state);
    const ctx = engine.context();
    let ok;
    try { ok = enlist(ctx, { branch, track: 'enlisted', component: 'active', specialty: 'infantry', nation: cc === 'US' ? undefined : cc }); } catch (e) { console.log(cell, branch, 'ENLIST ERR', e.message); continue; }
    if (!state.military.service) { console.log(cell, branch, 'not enlisted'); continue; }
    for (let i = 0; i < 6 && state.character.alive; i++) { engine.ageUp(); engine.autoResolve?.(); }
    if (state.military.service) try { discharge(engine.context(), 'honorable', 'term complete'); } catch (e) { console.log('DISCHARGE ERR', e.message); }
    sync(state);
    const hits = new Set();
    for (const tab of ['resume', 'military', 'honors', 'people', 'career', 'life', 'money']) {
      let html = '';
      try { html = localizeHtml(periodText(VIEWS[tab]?.(state, {}) ?? ''), countryOf(state)); } catch (e) { hits.add(`${tab}: RENDER ERR ${e.message}`); continue; }
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      for (const m of text.matchAll(new RegExp(US.source, 'g'))) hits.add(`${tab}: …${text.slice(Math.max(0, m.index - 50), m.index + 50)}…`);
    }
    const log = state.log.flatMap((b) => b.entries.map((e) => localizeHtml(`<p>${e.text}</p>`, countryOf(state)).replace(/<[^>]+>/g, ''))).filter((t) => US.test(t));
    for (const t of log.slice(0, 4)) hits.add(`log: ${t.slice(0, 140)}`);
    // News of other countries' wars and laws is world news, not a mistake.
    for (const h of [...hits]) if (/War breaks out in United States|Civil Rights Act|Holloman/.test(h)) hits.delete(h);
    total += hits.size;
    console.log(`${cell} ${branch} [${state.military.history.at(-1)?.nation ?? '-'}]: ${hits.size ? [...hits].slice(0, 8).join('\n    ') : 'clean'}`);
  }
}

console.log(`\n${total} flags.`);
if (process.argv.includes('--strict') && total) process.exit(1);
