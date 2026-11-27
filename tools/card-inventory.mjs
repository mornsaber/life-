// Inventory of what each tab shows in a period life: card titles and button labels, by view,
// across lives at several ages in early years. For reading by eye: modern things that the text
// scan can't know are modern (a fast-food job, AP classes, an Access to HE diploma) stand out.
//
//   node tools/card-inventory.mjs [CC:year ...] [--terms]   (default GB:1850 US:1890 FR:1900 DE:1925 JP:1930 IN:1950)
//   --terms   flag only labels matching the modern-terms list below (for audit-all)
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { yearNow, periodText } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const TERMS = process.argv.includes('--terms');
const CELLS = (args.length ? args : ['GB:1850', 'US:1890', 'FR:1900', 'DE:1925', 'JP:1930', 'IN:1950']).map((c) => { const [cc, y] = c.split(':'); return [cc, Number(y)]; });
/** [pattern, first year it fits] for labels: things a label alone gives away. */
export const MODERN_LABELS = [
  [/fast[- ]food|drive[- ]thru/i, 1955], [/pet sitt|dog walk/i, 1965], [/babysit/i, 1945], [/\bAP\b|Advanced Placement|dual[- ]enrol/i, 1955], [/\bGED\b|Access to HE/i, 1942],
  [/A-levels?\b/i, 1951], [/O-levels?\b/i, 1951], [/\bSAT\b|\bACT\b/, 1926], [/online|internet|e-?mail|website|app\b|streaming|podcast|social media|influencer|viral/i, 1995],
  [/credit score|FICO/i, 1989], [/credit card/i, 1958], [/401\(k\)|\bIRA\b|\bRoth\b/i, 1974], [/index fund|ETF\b/i, 1976], [/crypto|bitcoin|NFT/i, 2009], [/smartphone|mobile phone|cell ?phone/i, 1985],
  [/television|\bTV\b/i, 1936], [/radio\b/i, 1910], [/video game|console|gaming/i, 1972], [/gym\b|fitness class|yoga class|pilates/i, 1950], [/therapy session|therapist/i, 1920],
  [/dating app|speed dating|online dating/i, 1995], [/IVF|surrogacy/i, 1978], [/plastic surgery|botox|cosmetic surgery/i, 1950], [/rehab\b/i, 1950], [/lottery ticket/i, 1960],
  [/supermarket|grocery bagger/i, 1935], [/airline|flight to|fly to|by air/i, 1920], [/car\b|driving test|driver'?s licen[cs]e|learner'?s permit/i, 1903], [/motorway|freeway|interstate/i, 1956],
  [/HVAC/i, 1955], [/CNC|computer|software|coding|cyber/i, 1960], [/air conditioning/i, 1950], [/vaccin/i, 1800], [/contracepti|the pill/i, 1960], [/no-fault divorce/i, 1969],
  [/hedge fund/i, 1949], [/private equity/i, 1970], [/startup|venture capital/i, 1970], [/IPO\b/i, 1920], [/summer camp/i, 1910], [/lifeguard/i, 1915], [/day ?care|nursery school/i, 1900], [/Big Brother/i, 1904],
];

const out = new Map(); // view -> Map(label -> cells)
const add = (view, label, where) => { if (!out.has(view)) out.set(view, new Map()); const m = out.get(view); if (!m.has(label)) m.set(label, new Set()); m.get(label).add(where); };
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&#39;|&quot;/g, ' ').replace(/\s+/g, ' ').trim();

for (const [cc, born] of CELLS) {
  for (const [gender, seed] of [['male', 1], ['female', 2]]) {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(seed * 97 + born), modules: MODULES });
    const state = engine.newLife({ countryId: cc, startYear: born, gender });
    for (let age = 1; age <= 52 && state.character.alive !== false; age++) {
      engine.autoResolve(); state.prompts = []; state.stats.health = Math.max(state.stats.health, 70);
      engine.ageUp();
      if (![10, 15, 18, 25, 35, 50].includes(state.character.age)) continue;
      const where = `${cc} ${yearNow(state)} age ${state.character.age}`;
      for (const [id, view] of Object.entries(VIEWS)) {
        let html = '';
        try { html = periodText(view(state, {}) ?? ''); } catch { continue; }
        for (const m of html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)) add(id, `▣ ${strip(m[1]).slice(0, 70)}`, where);
        for (const m of html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)) { const t = strip(m[1]).slice(0, 70); if (t && t.length > 2) add(id, `• ${t}`, where); }
        for (const m of html.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/g)) { const t = strip(m[1]).slice(0, 60); if (t) add(id, `◦ ${t}`, where); }
      }
    }
  }
}
let flags = 0;
for (const [view, labels] of [...out].sort()) {
  const rows = [...labels].filter(([label, cells]) => {
    if (!TERMS) return true;
    const year = Math.min(...[...cells].map((w) => Number(w.split(' ')[1])));
    // The inventions race (researching the motor car before it exists) and locked options explaining why are meant to be there.
    if (/yrs? · smarts|~\d+ yrs?\b|🔒|^• Locked/.test(label)) return false;
    return MODERN_LABELS.some(([re, from]) => re.test(label) && year < from);
  });
  if (!rows.length) continue;
  console.log(`\n## ${view}`);
  for (const [label, cells] of rows) { flags += TERMS ? 1 : 0; console.log(`  ${label}   [${[...cells].slice(0, 2).join('; ')}${cells.size > 2 ? ` +${cells.size - 2}` : ''}]`); }
}
if (TERMS) { console.log(`\n${flags} flags.`); if (process.argv.includes('--strict') && flags) process.exit(1); }
