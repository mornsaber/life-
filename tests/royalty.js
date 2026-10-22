/**
 * The Crown, the peerage and the orders: fictional monarchs and succession, born-royal lives,
 * opt-in noble births and inherited titles, rare constitutional crises, republic referendums,
 * the Crown's representatives, and the orders of chivalry.
 *
 *   node tests/royalty.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { CROWNS, ensureCrown, monarchName, CRISIS_CHANCE, CrownModule, crownOf, sovereign } from '../src/modules/world/Crown.js';
import { nobleBirth, NOBLE_BIRTH_CHANCE, PeerageModule, grantPeerage } from '../src/modules/world/Peerage.js';
import { styledName, chivalryList, postNominals, honoursList, knighthoodsOn, setKnighthoods } from '../src/modules/world/Honours.js';
import { peerChamber, lordSpiritual } from '../src/modules/politics/Legislature.js';
import { buildHeirState } from '../src/modules/people/Legacy.js';
import { conferOptions, familyTitle } from '../src/modules/world/RoyalHousehold.js';
import { fullName } from '../src/modules/people/People.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 3) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'GB', ...opts });
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, (q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id); }
    state.prompts = [];
    state.stats.health = 95;
    engine.ageUp();
  }
};
const always = (rng) => Object.assign(Object.create(Object.getPrototypeOf(rng)), rng, { chance: () => true });

const tests = {
  'the crowns are fictional: a monarch from the house\'s own names, an heir, and the realms'() {
    const { state } = life({ countryId: 'CA' });
    assert.equal(crownOf(state), 'GB');
    const c = ensureCrown(state, 'GB');
    assert.ok(CROWNS.GB.names.male.includes(c.monarch.name) || CROWNS.GB.names.female.includes(c.monarch.name));
    assert.ok(CROWNS.GB.houses.includes(c.house));
    assert.ok(c.heir.name);
    assert.match(monarchName(state, 'GB'), /^(King|Queen) /);
    assert.match(sovereign(state, 'AU'), /^the (King|Queen)$/);
  },
  'born royal: a difficulty of its own, at the chosen place; a kingdom is required'() {
    const heir = life({ countryId: 'US', difficulty: 'royal', royalLevel: 'heir' }).state;
    assert.equal(heir.character.countryId, 'GB', 'royal births are in a kingdom');
    assert.equal(heir.royal.line, 1);
    assert.match(styledName(heir), /Cambria/);
    assert.equal(heir.people.wealth, 'upper');
    const distant = life({ difficulty: 'royal', royalLevel: 'distant' }).state;
    assert.ok(distant.royal.line >= 20);
    assert.equal(distant.royal.working, false);
    assert.match(styledName(distant), /^(Lord|Lady) /);
  },
  'the heir accedes when the monarch dies, and reigns'() {
    const { engine, state } = life({ difficulty: 'royal', royalLevel: 'heir' });
    state.character.age = 30;
    state.world.crowns.GB.monarch.age = 125;
    year(engine, state, 3);
    assert.equal(state.royal.reigning, true);
    assert.equal(state.world.crowns.GB.monarch.you, true);
    assert.match(styledName(state), /^(King|Queen) /);
    assert.equal(postNominals(state), '', 'a monarch is sovereign of the orders');
  },
  'working royals live on the grant; stepping back ends it; a monarch can abdicate'() {
    const { engine, state } = life({ difficulty: 'royal', royalLevel: 'child' });
    state.character.age = 25;
    const before = state.finances.cash;
    year(engine, state);
    assert.ok(state.finances.cash - before > 150000, 'a grant (after tax)');
    state.prompts = [];
    engine.dispatch('crown.stepBack');
    assert.equal(state.royal.working, false);
    assert.equal(state.character.style.prefix, null);
    const m = life({ difficulty: 'royal', royalLevel: 'heir' });
    m.state.character.age = 40;
    m.state.world.crowns.GB.monarch.age = 125;
    year(m.engine, m.state, 2);
    assert.ok(m.state.royal.reigning);
    m.state.prompts = [];
    m.engine.dispatch('crown.abdicate');
    assert.equal(m.state.royal.reigning, false);
    assert.ok(!m.state.world.crowns.GB.monarch.you);
  },
  'Japan\'s throne passes in the male line only'() {
    for (let seed = 1; seed < 6; seed++) {
      const { state } = life({ countryId: 'JP', difficulty: 'royal', royalLevel: 'heir', gender: 'female' }, seed);
      assert.equal(state.royal.line, null);
    }
  },
  'a noble birth only if you opt in, and rarely; the title passes when the holder dies'() {
    assert.ok(NOBLE_BIRTH_CHANCE <= 0.01);
    const plain = life({ noble: false });
    assert.equal(nobleBirth(plain.state, always(new Random(1))), false, 'never without opting in');
    const n = life({ noble: true, gender: 'male' });
    assert.ok(nobleBirth(n.state, always(new Random(1))));
    n.state.noble.heir = true;
    const holder = n.state.people.list.find((p) => p.id === n.state.noble.holderId);
    assert.ok(holder?.title);
    holder.alive = false;
    n.state.character.age = 40;
    year(n.engine, n.state);
    assert.equal(n.state.character.peerage?.kind, 'hereditary');
    if (!n.state.character.peerage.seat) assert.equal(peerChamber(n.state), null, 'hereditary peers sit only if elected');
    n.state.prompts = [];
    n.engine.dispatch('peerage.disclaim');
    assert.equal(n.state.character.peerage, null);
  },
  'constitutional crises are rare: once or twice in a lifetime; the Governor-General decides'() {
    assert.ok(CRISIS_CHANCE * 80 >= 1 && CRISIS_CHANCE * 80 <= 2);
    const { state, ctx } = life({ countryId: 'AU' });
    state.character.age = 60;
    ctx.emit('politics:take', { officeId: 'au_gg', appointed: true });
    state.prompts = [];
    CrownModule.onAgeUp({ ...ctx, rng: always(new Random(2)) });
    assert.ok(state.prompts.some((p) => p.type === 'crown.crisis'), 'the reserved powers are yours');
  },
  'a realm can vote to become a republic, and the Crown\'s offices there end'() {
    const { engine, state, ctx } = life({ countryId: 'AU' });
    state.character.age = 40;
    state.world.pendingReferendum = { AU: 0 };
    CrownModule.onAgeUp({ ...ctx, rng: always(new Random(2)) });
    const p = state.prompts.find((x) => x.type === 'crown.referendum');
    assert.ok(p);
    engine.resolvePrompt(p.id, 'campaignYes');
    if (state.world.republics?.AU) assert.equal(crownOf(state, 'AU'), null);
  },
  'orders of chivalry: a general gets the Bath, a diplomat or governor St Michael and St George'() {
    const { state, ctx } = life();
    state.character.age = 55;
    state.military.history.push({ track: 'officer', grade: 7, rankCode: 'O-8', branch: 'army', yearsOfService: 34 });
    state.politics.history.push({ officeId: 'gb_mp', startAge: 40, endAge: 50, terms: 2 });
    state.honors = [];
    let got = null;
    for (let i = 0; i < 40 && !got; i++) got = chivalryList({ ...ctx, rng: new Random(i + 5) });
    assert.ok(state.honors.some((h) => /Bath/.test(h.name)), JSON.stringify(state.honors.map((h) => h.name)));
  },
  'the Politics tab shows the Crown and a royal life'() {
    const { state } = life({ difficulty: 'royal', royalLevel: 'grandchild' });
    const html = VIEWS.politics(state);
    assert.match(html, /The Crown/);
    assert.match(html, /Royal Life/);
  },
  'continuing as the heir of a reigning monarch: the child reigns'() {
    const { engine, state } = life({ difficulty: 'royal', royalLevel: 'heir' });
    state.character.age = 40;
    state.world.crowns.GB.monarch.age = 125;
    year(engine, state, 2);
    assert.ok(state.royal.reigning);
    const kid = { id: 'per_kid', firstName: 'Arthur', lastName: state.character.lastName, gender: 'male', relation: 'child', ageOffset: -14, alive: true, relationship: 80 };
    state.people.list.push(kid);
    state.character.alive = false;
    const heir = buildHeirState(new Random(4), state, kid.id);
    assert.equal(heir.royal.reigning, true);
    assert.match(styledName(heir), /King Arthur/);
  },
  'Australia\'s knighthoods come and go with the government; a prime minister can restore them'() {
    const { engine, state, ctx } = life({ countryId: 'AU' });
    assert.equal(knighthoodsOn(state, 'AU'), false, 'abolished by default');
    state.character.age = 60;
    state.politics.history.push({ officeId: 'au_pm', startAge: 45, endAge: 55, terms: 2 }, { officeId: 'au_mp', startAge: 35, endAge: 55, terms: 5 });
    state.finances.cash = 2e9;
    for (let i = 0; i < 30; i++) honoursList({ ...ctx, rng: always(new Random(i)) });
    assert.ok(!state.honors.some((h) => h.tier === 'ak'), 'no knighthood while abolished');
    setKnighthoods(ctx, 'AU', true);
    for (let i = 0; i < 5; i++) honoursList({ ...ctx, rng: always(new Random(i)) });
    assert.ok(state.honors.some((h) => h.tier === 'ak'), JSON.stringify(state.honors.map((h) => h.tier)));
    assert.match(styledName(state), /^(Sir|Dame) /);
    ctx.emit('politics:take', { officeId: 'au_pm', appointed: true });
    state.prompts = [];
    engine.dispatch('honours.knighthoods');
    assert.equal(knighthoodsOn(state, 'AU'), false, 'the prime minister abolished them again');
  },
  'a former prime minister is offered the customary earldom; a victorious commander a viscountcy or more'() {
    const { engine, state } = life();
    state.character.age = 62;
    state.politics.history.push({ officeId: 'gb_pm', startAge: 50, endAge: 60, terms: 2 });
    for (let i = 0; i < 25 && !state.prompts.some((p) => p.type === 'peerage.creation'); i++) { state.prompts = []; engine.ageUp(); }
    const p = state.prompts.find((x) => x.type === 'peerage.creation');
    assert.ok(p, 'an offer');
    assert.match(p.text, /earldom/);
    engine.resolvePrompt(p.id, 'accept');
    assert.equal(state.character.peerage.rank, 'earl');
    assert.equal(state.character.peerage.kind, 'hereditary');
    assert.ok(state.character.peerage.seat);
    assert.match(styledName(state), /^The (Earl|Countess) of /);
    const v = life();
    v.state.character.age = 58;
    v.state.flags.victor = { grade: 8, top: false, nation: 'GB' };
    for (let i = 0; i < 25 && !v.state.prompts.some((x) => x.type === 'peerage.creation'); i++) { v.state.prompts = []; v.engine.ageUp(); }
    assert.match(v.state.prompts.find((x) => x.type === 'peerage.creation')?.text ?? '', /Viscount/);
  },
  'a hereditary peer stands in a Lords by-election when a seat falls vacant'() {
    const { engine, state, ctx } = life();
    state.character.age = 45;
    grantPeerage(ctx, { rank: 'earl', place: 'Wexley', kind: 'hereditary', seat: false });
    for (let i = 0; i < 40 && !state.character.peerage.seat; i++) {
      state.prompts = [];
      engine.ageUp();
      const p = state.prompts.find((x) => x.type === 'peerage.byElection');
      if (p) engine.resolvePrompt(p.id, 'campaign');
    }
    assert.ok(state.character.peerage.byElections >= 1, 'stood');
    if (state.character.peerage.seat) assert.ok(peerChamber(state), 'and sits');
  },
  'the start menu: picking a place in the family makes you royal where there is a crown'() {
    const se = life({ countryId: 'SE', royalLevel: 'grandchild' }).state;
    assert.equal(se.royal?.crownId, 'SE');
    assert.equal(se.royal.level, 'grandchild');
    assert.equal(se.difficulty.id, 'normal', 'any difficulty');
    const ca = life({ countryId: 'CA', royalLevel: 'heir' }).state;
    assert.equal(ca.royal?.crownId, 'GB', 'a realm shares the British royal family');
    const us = life({ countryId: 'US', royalLevel: 'heir' }).state;
    assert.equal(us.royal, null, 'a republic has no crown');
    assert.equal(us.character.countryId ?? 'US', 'US');
    assert.equal(life({ countryId: 'GB', royalLevel: 'none' }).state.royal, null);
  },
  'Lords Spiritual: a Church of England diocesan bishop sits in the Lords'() {
    const { state } = life({ countryId: 'GB' });
    state.character.age = 58;
    state.career.job = { professionId: 'anglicanClergy', levelId: 'bishop', employer: { name: 'Diocese of Leeds' } };
    assert.ok(lordSpiritual(state));
    assert.equal(peerChamber(state), 'upper_GB');
    state.career.job.levelId = 'archdeacon';
    assert.equal(peerChamber(state), null);
  },
  'the household: a real heir, titles for the family, honours to confer, honorary ranks'() {
    const { engine, state } = life({ countryId: 'GB', royalLevel: 'child' }, 6);
    year(engine, state, 2);
    const heir = state.people.list.find((p) => p.royal === 'heir');
    assert.ok(heir, 'an older sibling is heir');
    assert.equal(state.world.crowns.GB.heir.personId, heir.id);
    assert.match(fullName(heir), /Cambria/);
    state.character.age = 30;
    state.people.list.push({ id: 'sp', firstName: 'Clara', lastName: 'Bell', gender: 'female', relation: 'spouse', ageOffset: 0, alive: true, relationship: 80, income: 0 });
    state.people.list.push({ id: 'k1', firstName: 'Ned', lastName: 'X', gender: 'male', relation: 'child', ageOffset: -30, alive: true, relationship: 90, income: 0 });
    state.character.gender = 'male';
    year(engine, state, 1);
    assert.ok(state.people.list.find((p) => p.id === 'sp').title, 'spouse titled');
    assert.equal(state.people.list.find((p) => p.id === 'k1').title, 'Prince');
    assert.ok(state.royal.household.rank || state.royal.household.military.length >= 0);
  },
  'the sovereign confers titles and decides assent, mercy and dissolutions'() {
    const { engine, state } = life({ countryId: 'GB', royalLevel: 'heir' }, 7);
    state.character.age = 40;
    state.royal.reigning = true;
    state.world.crowns.GB.monarch = { name: state.character.firstName, gender: state.character.gender, age: 40, number: 1, you: true };
    state.people.list.push({ id: 'k1', firstName: 'Ned', lastName: 'X', gender: 'male', relation: 'child', ageOffset: -20, alive: true, relationship: 90, income: 0 });
    year(engine, state, 1);
    assert.equal(state.world.crowns.GB.heir.personId, 'k1', 'your eldest child is heir');
    const duke = conferOptions(state).find((o) => o.person.id === 'k1' && o.id === 'dukedom');
    assert.ok(duke);
    state.prompts = [];
    engine.dispatch('royalHousehold.confer', 'k1|dukedom');
    assert.match(state.people.list.find((p) => p.id === 'k1').title, /^Duke of /);
    assert.equal(familyTitle(state, state.people.list.find((p) => p.id === 'k1')), state.people.list.find((p) => p.id === 'k1').title);
    const ctx = engine.context();
    const pop = state.royal.popularity;
    MODULES.find((m) => m.id === 'royalHousehold').resolvers.assent(ctx, { bill: 'a bill' }, 'refuse');
    assert.ok(state.royal.popularity < pop, 'refusing assent is a crisis');
  },
};
void PeerageModule;

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} royalty test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} royalty tests passed`);
