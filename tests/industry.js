/**
 * The industry model: industries rise and fall from what is known, what is in the ground and who
 * makes it cheaper; crises come from credit and trade; governments answer with laws.
 *
 *   node tests/industry.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { ensureIndustry, catchUp, industryShare, industryHere, worldAt, IX, namedCrashes, crisisHere, jobsHealth, techKnown } from '../src/modules/industry/IndustryEngine.js';
import { statuteIn } from '../src/modules/politics/StatuteBook.js';
import { stateShare } from '../src/modules/world/Ownership.js';
import { enact, levelValue } from '../src/modules/politics/Laws.js';
import { organisedVote } from '../src/modules/industry/Sync.js';
import { setEraYear } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const bare = (cc, seed = 1) => { setEraYear(2025); const s = { character: { countryId: cc }, world: { seed }, era: {} }; ensureIndustry(s); return s; };
const run = (state, to) => { for (let y = state.industry.year + 1; y <= to; y++) catchUp(state, y); return state; };
const life = (cc, startYear, seed = 3, economy) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, startYear, ...(economy ? { economy } : {}) });
  return { engine, state };
};

const tests = {
  'inventions come from research, in their order'() {
    const w = worldAt(0, 2025);
    const k = w.known;
    for (const [a, b] of [['steel', 'container'], ['oilRefining', 'offshore'], ['semis', 'robotics'], ['semis', 'solar'], ['aviation', 'jet']]) assert.ok(k[a] < k[b], `${a} before ${b}`);
    assert.ok(k.steel > 1840 && k.steel < 1880, `steel ${k.steel}`);
    assert.ok(k.semis > 1935 && k.semis < 1970, `semis ${k.semis}`);
  },
  'whaling dies when oil and the electric light come'() {
    const s = run(bare('US'), 1840);
    const before = industryShare(s, 'whaling');
    run(s, 1920);
    assert.ok(industryShare(s, 'whaling') < before / 5, `${before} → ${industryShare(s, 'whaling')}`);
  },
  'North Sea oil needs offshore drilling'() {
    const s = run(bare('GB'), 1950);
    assert.ok(!industryHere(s, 'oilGas'), 'no British oil in 1950');
    run(s, 1995);
    assert.ok(industryHere(s, 'oilGas'), 'British oil once drilling offshore is known');
  },
  'the textile trade moves to where labour is cheap'() {
    const w = worldAt(0, 2000);
    const sh = (cc) => w.c[cc].share[IX.textiles];
    assert.ok(sh('BD') + sh('IN') + sh('VN') > 10 * sh('GB'), 'Asia makes the cloth by 2000');
    const s = run(bare('GB'), 1900);
    const then = industryShare(s, 'textiles');
    run(s, 2000);
    assert.ok(industryShare(s, 'textiles') < then / 2, 'Lancashire is a fraction of what it was');
  },
  'machines take dockers\' jobs once the container comes'() {
    const s = run(bare('GB'), 2000);
    const c = s.industry.c.GB;
    assert.ok(c.jobs[IX.shipping] < c.out[IX.shipping] * 0.6, 'fewer jobs than the trade would once have needed');
  },
  'the world names its own crashes, the same in every life of a variant'() {
    const a = namedCrashes(bare('GB', 2));
    const b = namedCrashes(bare('FR', 4));
    assert.deepEqual(a, b);
    if (a.depression) assert.ok(a.depression >= 1900);
    if (a.gfc) assert.ok(a.gfc >= a.depression + 50);
  },
  'a life\'s laws come from its own world: deposit insurance after a panic, not on a date'() {
    const { state } = life('US', 1900);
    // History's date (1934) does not apply; the model either passed it or not.
    const passed = (state.laws.enacted ?? []).some((r) => r.lawId === 'depositInsurance' && r.value === true);
    assert.equal(statuteIn(state, 'depositInsurance', 'US'), passed);
    // A bill in this world sets it.
    enact(state, { level: 'federal', where: null, lawId: 'depositInsurance', value: true, sponsor: 'you', age: 30 });
    assert.equal(statuteIn(state, 'depositInsurance', 'US'), true);
  },
  'on history\'s dates instead, the dates rule'() {
    const { state } = life('US', 1950, 3, 'historical');
    assert.equal(statuteIn(state, 'depositInsurance', 'US'), true);
    assert.equal(stateShare(state, 'rail', 'GB', 1960), 1);
  },
  'nationalisation is this world\'s: none unless a government passed it'() {
    const { state } = life('GB', 1960);
    const passed = (state.laws.enacted ?? []).some((r) => r.lawId === 'ownership_coal' && r.value === true);
    if (!passed) assert.equal(stateShare(state, 'coal', 'GB'), 0);
    enact(state, { level: 'federal', where: 'GB', lawId: 'ownership_coal', value: true, sponsor: 'you', age: 30 });
    assert.equal(stateShare(state, 'coal', 'GB'), 1);
  },
  'tariffs are a law you can change, and the model reads them'() {
    const { state } = life('DE', 1890);
    enact(state, { level: 'federal', where: 'DE', lawId: 'tariff', value: 'protective', sponsor: 'you', age: 30 });
    assert.equal(levelValue(state, 'tariff', 'federal', 'DE'), 'protective');
  },
  'a crisis becomes the economy\'s recession'() {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { engine, state } = life('GB', 1900, seed);
      for (let i = 0; i < 40 && state.character.alive; i++) {
        state.prompts = []; state.stats.health = 100; engine.ageUp();
        const c = crisisHere(state);
        if (c && c.year === state.industry.year) { assert.equal(state.economy.phase, 'recession'); return; }
      }
    }
    assert.fail('no crisis in 200 years of lives');
  },
  'a planned economy owns its industry, and selling it is a law'() {
    const { state } = life('PL', 1960);
    assert.equal(stateShare(state, 'industry', 'PL'), 1);
  },
  'welfare comes from governments, not dates: in force only where a government here passed it'() {
    for (const seed of [1, 2, 3]) {
      const { state } = life('GB', 1960, seed);
      const book = state.laws?.nations?.GB ?? {};
      for (const id of ['statePension', 'nationalInsurance', 'incomeTax', 'sicknessInsurance']) assert.equal(statuteIn(state, id, 'GB'), book[id] === true, `${id} #${seed}`);
    }
    // An absolute monarchy's state does not hand out sickness insurance; a planned economy does.
    const ru = life('RU', 1960, 2).state;
    assert.ok(statuteIn(ru, 'statePension', 'RU'), 'the Soviet pension');
    const hist = life('GB', 1960, 1, 'historical').state;
    assert.ok(statuteIn(hist, 'statePension', 'GB') && statuteIn(hist, 'incomeTax', 'GB'), 'history\'s dates');
  },
  'mining seats vote labour where unions are lawful'() {
    const { state } = life('GB', 1950, 2);
    state.laws.nations.GB.tradeUnionsLegal = true;
    const lean = organisedVote(state, { national: true });
    assert.ok(lean > 0, `national ${lean}`);
    state.laws.nations.GB.tradeUnionsLegal = false;
    assert.equal(organisedVote(state, { national: true }), 0, 'no union vote without lawful unions');
  },
  'the save stays small'() {
    const { state } = life('GB', 1900);
    assert.ok(JSON.stringify(state.industry).length < 6000, `${JSON.stringify(state.industry).length} bytes`);
    assert.ok(typeof jobsHealth(state, 'coal') === 'number');
    assert.ok(techKnown(state, 'steam'));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`); }
}
process.exit(failed ? 1 : 0);
