/**
 * Alternate-breakup audit: lives in the Soviet bloc, Yugoslavia and Czechoslovakia played through
 * worlds where the breakups came early, late or never, flagging text that contradicts its world:
 * "post-Soviet" while the Soviet Union stands, the euro in a Soviet republic, "Yugoslavia" after
 * it broke up, the GDR outliving its Wall.
 *
 *   node tools/breakup-audit.mjs [livesPerCase=6]
 */
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { yearNow, periodCountryName, periodCurrency } from '../src/modules/world/Eras.js';
import { regimeHere } from '../src/modules/world/Regimes.js';
import { COUNTRIES } from '../src/modules/world/Countries.js';

const N = Number(process.argv[2] ?? 6);
const ONLY_PLACE = process.argv[3] ?? null;
const ONLY_WORLD = process.argv[4] ?? null;
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const PLACES = [['EE', 'tallinn'], ['UA', null], ['LT', null], ['HR', null], ['SI', null], ['CZ', null], ['SK', null], ['PL', null], ['DE', 'leipzig']];
/** Each world: which breakups happen, and when (null: never). */
const WORLDS = {
  never: { sovietCollapse: null, yugoslaviaBreakup: null, velvetDivorce: null },
  late: { sovietCollapse: 2001, yugoslaviaBreakup: 2003, velvetDivorce: 2006 },
  early: { sovietCollapse: 1986, yugoslaviaBreakup: 1988, velvetDivorce: 1990 },
};
const findings = new Map();
const flag = (id, ex) => { const f = findings.get(id) ?? { n: 0, ex: [] }; f.n += 1; if (f.ex.length < 4) f.ex.push(ex); findings.set(id, f); };
const gone = (s, id, y) => { const r = s.era.events[id]; return r != null && y >= r.year; };

const SOVIET_PAST = /\bpost-Soviet\b|\bformer Soviet\b|Soviet Union (?:has )?(?:collapsed|broke|fell)|after the Soviet collapse/i;
const YUGO_PAST = /\bformer Yugoslavia\b|Yugoslavia (?:has )?(?:broken up|broke apart|is gone)/i;

for (const [wname, world] of Object.entries(WORLDS)) {
  if (ONLY_WORLD && wname !== ONLY_WORLD) continue;
  for (const [cc, region] of PLACES) {
    if (ONLY_PLACE && cc !== ONLY_PLACE) continue;
    for (let i = 0; i < N; i++) {
      const engine = new Engine({ store: new Store(memory()), rng: new Random(1000 + i), modules: MODULES });
      const s = engine.newLife({ countryId: cc, startYear: 1965 + i * 2, gender: i % 2 ? 'male' : 'female' });
      if (region) s.character.regionId = region;
      for (const [id, y] of Object.entries(world)) {
        if (y == null) (s.era.skipped ??= []).push(id);
        (s.era.rolled ??= {})[id] = true;
      }
      engine.hydrate(s);
      let seen = 0;
      while (s.character.alive !== false && s.character.age < 50) {
        // This world's dates: fire the breakup exactly then.
        for (const [id, y] of Object.entries(world)) if (y != null && yearNow(s) + 1 === y && !s.era.events[id]) s.era.events[id] = { year: y };
        for (let g = 0; g < 40 && s.prompts.length; g++) { const p = s.prompts[0]; const o = p.options.filter((x) => !x.disabled); engine.resolvePrompt(p.id, (o.find((x) => x.tone !== 'danger') ?? o[0] ?? p.options[0]).id); }
        s.prompts = []; s.stats.health = Math.max(s.stats.health, 60);
        engine.ageUp();
        const y = yearNow(s);
        const where = `${wname} ${cc} ${y} age ${s.character.age}`;
        const texts = (s.log ?? []).flatMap((b) => (b.entries ?? []).map((e) => e.text)).slice(seen);
        seen += texts.length;
        const sov = gone(s, 'sovietCollapse', y);
        const yug = gone(s, 'yugoslaviaBreakup', y);
        for (const t of texts) {
          if (!sov && y >= 1985 && SOVIET_PAST.test(t)) flag('post-Soviet talk while the Soviet Union stands', `${where}: ${t.slice(0, 140)}`);
          if (!yug && ['HR', 'SI'].includes(cc) && YUGO_PAST.test(t)) flag('Yugoslavia gone in text while it stands', `${where}: ${t.slice(0, 140)}`);
          if (!sov && ['EE', 'LT', 'UA'].includes(cc) && /\beuros?\b|€/.test(t)) flag('the euro in a Soviet republic', `${where}: ${t.slice(0, 140)}`);
        }
        const name = periodCountryName(s, cc, COUNTRIES[cc].name);
        if (['EE', 'LT', 'UA'].includes(cc) && s.character.countryId === cc && y >= 1923) {
          if (sov && /Soviet/.test(name)) flag('Soviet name after the collapse', `${where}: ${name}`);
          if (!sov && y >= 1945 && !/Soviet/.test(name)) flag('independent name while Soviet', `${where}: ${name}`);
          const cur = periodCurrency(cc, COUNTRIES[cc].currency)?.name ?? '';
          if (!sov && y >= 1961 && !/ruble|rouble/i.test(cur)) flag('not the ruble in a Soviet republic', `${where}: ${cur}`);
        }
        if (['HR', 'SI'].includes(cc) && s.character.countryId === cc && y >= 1946) {
          if (!yug && !/Yugoslav/.test(name + regimeHere(s).name)) flag('no Yugoslavia while it stands', `${where}: ${name} / ${regimeHere(s).name}`);
          if (yug && /^Yugoslavia$/.test(name)) flag('Yugoslavia name after the breakup', `${where}: ${name}`);
        }
        if (cc === 'DE' && s.character.regionId === 'leipzig' && (s.character.countryId ?? 'US') === 'DE' && y >= 1950) {
          const gdr = /German Democratic Republic/.test(regimeHere(s).name ?? '');
          if (!sov && !gdr && y < 2100) flag('Leipzig out of the GDR while the Wall stands', `${where}: ${regimeHere(s).name}`);
          if (sov && y >= s.era.events.sovietCollapse.year && gdr) flag('the GDR outlives the Wall', `${where}`);
        }
      }
    }
  }
}
if (!findings.size) console.log('✔ no contradictions');
for (const [id, f] of findings) { console.log(`✘ ${id}: ${f.n}`); for (const e of f.ex) console.log(`    ${e}`); }
process.exitCode = findings.size ? 1 : 0;
