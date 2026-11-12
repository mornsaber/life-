/**
 * Real parties (politics/PartySystem.js): chambers seat parties by the country's voting system;
 * one-party states seat the Party and its allies with every other party banned; juntas and
 * absolute monarchs seat no parties; you join a real party, or a banned one underground.
 *
 *   node tests/parties.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { partySystem, partyInfo, governingParties, allocateSeats } from '../src/modules/politics/PartySystem.js';
import { partyName, myPartyName } from '../src/modules/politics/Parties.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { hemicycle } from '../src/ui/views/PartyVisuals.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const life = (cc, year = null, seed = 1) => {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: cc, ...(year ? { startYear: year - 40 } : {}) });
  state.character.age = 40;
  state.prompts = [];
  engine.ageUp();
  state.prompts = [];
  return { engine, state };
};
const national = (state) => Object.values(state.legislature?.bodies ?? {}).find((b) => b.level === 'federal');
const clean = (html) => { const i = html.search(/NaN|undefined|\[object/); assert.ok(i < 0, i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 70)); };

const tests = {
  'the Commons seats Britain\'s parties, the big two winning most under first-past-the-post'() {
    const { state } = life('GB', 2020);
    const b = national(state);
    assert.ok(b, 'a parliament');
    const ids = b.parties.map((p) => p.id);
    assert.ok(ids.includes('con') && ids.includes('lab'), ids.join());
    const big = b.parties.filter((p) => ['con', 'lab'].includes(p.id)).reduce((s, p) => s + p.seats, 0);
    assert.ok(big / b.seats > 0.75, `${big}/${b.seats}`);
    assert.equal(b.parties.reduce((s, p) => s + p.seats, 0), b.seats, 'every seat filled');
    assert.ok(b.members.every((m) => m.party), 'members have parties');
    assert.ok(governingParties(b).length >= 1);
  },
  'proportional representation shares seats out'() {
    const { state } = life('NL', 2020);
    const b = national(state);
    assert.ok(b.parties.length >= 5, b.parties.map((p) => p.id).join());
  },
  'Nazi Germany: one party, the others banned'() {
    const { state } = life('DE', 1938);
    const sys = partySystem('DE');
    assert.equal(sys.system, 'one');
    assert.match(sys.parties[0].name, /National Socialist/);
    assert.ok(sys.parties.some((p) => p.id === 'spd' && p.status === 'banned'));
    const b = national(state);
    if (b) assert.ok(b.parties[0].id === 'ruling' && b.parties[0].seats > b.seats * 0.8);
    assert.match(partyName(state, 'labor'), /National Socialist/, 'no phantom second party');
  },
  'China: the Communist Party and the United Front, nothing else'() {
    const { state } = life('CN');
    const sys = partySystem('CN');
    assert.equal(sys.system, 'one');
    assert.ok(sys.parties.every((p) => ['ruling', 'allied'].includes(p.status)), sys.parties.map((p) => `${p.name}:${p.status}`).join());
    const html = VIEWS.politics(state, {});
    clean(html);
  },
  'no parties under a junta or an absolute monarchy'() {
    const body = { level: 'federal', where: 'SA', seats: 150, labor: 70 };
    allocateSeats(body);
    if (body.system === 'none') assert.deepEqual(body.parties.map((p) => p.id), ['nonparty']);
    assert.match(partyInfo(body, 'nonparty').name, /Appointed|Independents|Non-Party/);
  },
  'join a real party; join a banned one underground'() {
    const { engine, state } = life('GB', 2020);
    engine.dispatch('party.join', 'ld');
    assert.equal(state.civic.party.partyId, 'ld');
    assert.equal(state.civic.party.bloc, 'labor');
    assert.equal(myPartyName(state), 'Liberal Democrats');
    const de = life('DE', 1960).state;
    const eng = life('DE', 1960);
    eng.engine.dispatch('party.join', 'kpd');
    assert.equal(eng.state.civic.party.underground, true, 'the KPD was banned in 1956');
    void de;
  },
  'the hemicycle draws every seat in party colours'() {
    const { state } = life('GB', 2020);
    const b = national(state);
    const svg = hemicycle(b);
    assert.equal((svg.match(/<circle/g) ?? []).length, b.seats);
    const html = VIEWS.politics(state, {});
    clean(html);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
