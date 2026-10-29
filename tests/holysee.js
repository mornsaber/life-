/**
 * Titles that stack and show, the Holy See (Swiss Guard, papal diplomacy, conclaves, the papacy,
 * pontifical honours), and former ruling houses (restoration and abolition referendums).
 *
 *   node tests/holysee.js
 */
import assert from 'node:assert/strict';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { styledName } from '../src/modules/world/Honours.js';
import { fullName } from '../src/modules/people/People.js';
import { getProfession } from '../src/modules/career/JobTrees.js';
import { createEmployer } from '../src/modules/career/Employers.js';
import { hire } from '../src/modules/career/CareerEngine.js';
import { swissGuardCheck } from '../src/modules/career/IntlOrgCareers.js';
import { holySeeOf, isPope } from '../src/modules/world/HolySee.js';
import { servicePassports } from '../src/modules/world/Passports.js';
import { crownOf } from '../src/modules/world/Crown.js';
import { restore } from '../src/modules/world/Houses.js';
import { VIEWS } from '../src/ui/Renderer.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
function life(opts = {}, seed = 5) {
  const engine = new Engine({ store: new Store(memory()), rng: new Random(seed), modules: MODULES });
  const state = engine.newLife({ countryId: 'US', ...opts });
  state.legal.record = [];
  return { engine, state, ctx: engine.context() };
}
const year = (engine, state, n = 1) => {
  for (let i = 0; i < n && state.character.alive; i++) {
    for (let k = 0; k < 12 && state.prompts.length; k++) { const q = state.prompts[0]; engine.resolvePrompt(q.id, (q.options.find((o) => !o.disabled && o.tone !== 'danger') ?? q.options[0]).id); }
    state.prompts = [];
    state.stats.health = 95;
    if (state.health) state.health.conditions = [];
    engine.ageUp();
  }
};
const giveJob = (engine, professionId, levelId) => {
  const ctx = engine.context();
  const profession = getProfession(professionId);
  hire(ctx, { professionId, levelId, employer: createEmployer(engine.rng, engine.state, profession, engine.state.character.regionId) });
  engine.state.prompts = [];
  return engine.state.career.job;
};
const catholic = (state) => { state.community.faith = { traditionId: 'catholic', congregation: 'St Peter', attendance: 'devout', joinedAge: 0, raised: true }; };

const tests = {
  'titles stack and show: a royal duke stays a prince; a grandchild\'s parents are titled; a duke\'s children have courtesy styles'() {
    const gc = life({ countryId: 'GB', royalLevel: 'grandchild', gender: 'male' }, 4);
    const father = gc.state.people.list.find((p) => p.relation === 'father');
    assert.match(fullName(father), /^Prince .+, Duke of /);
    assert.match(fullName(gc.state.people.list.find((p) => p.relation === 'mother')), /Duchess of /);
    const ch = life({ countryId: 'GB', royalLevel: 'child', gender: 'female' }, 4);
    year(ch.engine, ch.state, 30);
    assert.match(styledName(ch.state), /^Princess \S+, Duchess of /);
    const html = VIEWS.politics(ch.state, {});
    assert.match(html, /Royal title/);
    assert.doesNotMatch(html, /Your Peerage/, 'a royal dukedom is part of the royal card');
    const duke = life({ countryId: 'GB', nobleRank: 'duke', nobleHeir: 'heir', gender: 'male' }, 4);
    assert.ok(duke.state.noble.courtesyTitle, 'the heir uses a lesser title');
    assert.match(styledName(duke.state), /, Marquess of /);
    const holder = duke.state.people.list.find((p) => p.id === duke.state.noble.holderId);
    assert.match(fullName(holder), /Duke of .+, Marquess of .+, Earl of /);
  },
  'the Swiss Guard: Swiss Catholic men 19–30 with army training; the oath, the Benemerenti, the marriage rule'() {
    const { engine, state } = life({ countryId: 'CH', gender: 'male' }, 6);
    year(engine, state, 20);
    catholic(state);
    state.character.citizenships = ['CH'];
    Object.assign(state.military, { conscription: null, service: null, history: [] });
    assert.equal(swissGuardCheck(state).ok, false, 'basic training first');
    state.military.conscription = { status: 'served' };
    state.people.list = state.people.list.filter((p) => p.relation !== 'spouse');
    assert.equal(swissGuardCheck(state).ok, true, swissGuardCheck(state).reason);
    const job = giveJob(engine, 'swissGuard', 'halberdier');
    assert.equal(job.employer.name, 'Pontifical Swiss Guard');
    assert.equal(state.character.posting?.place, 'Vatican City');
    year(engine, state, 4);
    assert.equal(state.career.job?.professionId, 'swissGuard', 'still serving');
    assert.ok(state.honors.some((h) => h.id === 'holySee.benemerenti'), 'Benemerenti after three years');
  },
  'a priest goes to the Academy and becomes a nuncio: "His Excellency", a Vatican diplomatic passport'() {
    const { engine, state } = life({ countryId: 'IT', gender: 'male' }, 7);
    year(engine, state, 30);
    catholic(state);
    state.people.list = state.people.list.filter((p) => p.relation !== 'spouse');
    state.career.history.push({ professionId: 'catholicClergy', peakGrade: 3, startAge: 25, endAge: 30 });
    const ok = getProfession('holySeeDiplomacy').eligible(state);
    assert.ok(ok.ok, ok.reason);
    const job = giveJob(engine, 'holySeeDiplomacy', 'nuncio');
    assert.ok(job);
    assert.match(styledName(state), /^His Excellency Archbishop /);
    assert.ok(servicePassports(state).some((p) => p.country === 'HS' && p.kind === 'diplomatic'));
  },
  'a conclave: a cardinal elector chooses a name and reigns as pope; renunciation makes a Pope Emeritus'() {
    const { engine, state } = life({ countryId: 'IT', gender: 'male' }, 8);
    year(engine, state, 62);
    catholic(state);
    state.people.list = state.people.list.filter((p) => p.relation !== 'spouse');
    giveJob(engine, 'catholicClergy', 'cardinal');
    state.prompts = [];
    holySeeOf(state).pope.born = 1800;
    engine.ageUp();
    assert.ok(state.career.job, 'still a cardinal');
    const q = state.prompts.find((p) => p.type === 'holySee.conclave');
    assert.ok(q, 'the see is vacant and the cardinals meet');
    const chance = engine.rng.chance.bind(engine.rng);
    engine.rng.chance = () => true;
    engine.resolvePrompt(q.id, 'candidate');
    engine.rng.chance = chance;
    const n = state.prompts.find((p) => p.type === 'holySee.name');
    engine.resolvePrompt(n.id, n.options[0].id);
    assert.ok(isPope(state));
    assert.match(styledName(state), /^His Holiness Pope /);
    assert.ok(holySeeOf(state).pope.you);
    state.prompts = [];
    engine.dispatch('holySee.encyclical');
    engine.dispatch('holySee.journey');
    engine.dispatch('holySee.synod');
    assert.ok(state.holySee.lastSynod != null, 'a synod');
    assert.match(VIEWS.career(state, {}), /Apostolic Palace/);
    engine.dispatch('holySee.renounce');
    assert.ok(!isPope(state));
    assert.match(styledName(state), /Pope Emeritus/);
    assert.ok(!holySeeOf(state).pope.you, 'a successor was elected');
  },
  'pontifical honours reach distinguished lay Catholics'() {
    const { engine, state } = life({ countryId: 'IE' }, 9);
    year(engine, state, 50);
    catholic(state);
    state.finances.cash = 5e8;
    state.malta = { grade: 'magistral', since: 40 };
    for (let i = 0; i < 40 && !state.honors.some((h) => /^holySee\./.test(h.id)); i++) { year(engine, state, 1); catholic(state); state.stats.health = 95; }
    assert.ok(state.honors.some((h) => /^holySee\.(gregory|sylvester|proEcclesia)/.test(h.id)), state.honors.map((h) => h.id).join(','));
  },
  'born into a former ruling house: the claim passes; a referendum restores the throne to you'() {
    const { engine, state, ctx } = life({ countryId: 'IT', housePlace: 'heir', gender: 'male' }, 3);
    assert.equal(state.house?.name, 'Savoy');
    assert.equal(state.character.lastName, 'di Savoia');
    assert.match(styledName(state), /^Prince /);
    year(engine, state, 25);
    const holder = state.people.list.find((p) => p.id === state.house.holderId);
    if (holder) holder.alive = false;
    year(engine, state, 1);
    assert.equal(state.house.rank, 'head');
    assert.match(styledName(state), /Duke of Savoy$/);
    assert.match(VIEWS.politics(state, {}), /The House of Savoy/);
    state.world.monarchists.IT = 30;
    state.finances.cash = 1e6;
    state.prompts = [];
    engine.dispatch('houses.campaign');
    assert.ok(state.world.monarchists.IT > 30);
    assert.equal(crownOf(state, 'IT'), null, 'a republic until the vote');
    restore(ctx, 'IT');
    assert.equal(crownOf(state, 'IT'), 'IT');
    assert.ok(state.royal?.reigning);
    const k = state.prompts.find((p) => p.type === 'houses.constitution');
    assert.ok(k, 'the constitution question');
    engine.resolvePrompt(k.id, 'constitutional');
    assert.ok(!state.royal.executive);
    assert.match(styledName(state), /^King /);
    year(engine, state, 1);
    assert.ok(state.royal?.reigning, 'the reign carries on');
  },
  'a prime minister puts a republic to the people; a reigning family becomes a former ruling house'() {
    const { engine, state, ctx } = life({ countryId: 'SE', royalLevel: 'heir', gender: 'female' }, 2);
    year(engine, state, 20);
    assert.ok(state.royal);
    state.prompts = [];
    // The vote (forced): the crown goes.
    const chance = engine.rng.chance.bind(engine.rng);
    ctx.rng.float = () => 0.5;
    const mod = MODULES.find((m) => m.id === 'houses');
    mod.resolvers.referendum(ctx, { cc: 'SE', kind: 'republic', called: true }, 'campaignYes');
    engine.rng.chance = chance;
    assert.equal(crownOf(state, 'SE'), null);
    assert.equal(state.royal, null);
    assert.ok(state.house, 'a former ruling house');
    assert.equal(state.house.rank, 'heir');
    assert.match(styledName(state), /^Princess /);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 4).join('\n    ')}`); }
}
if (failed) { console.log(`\n✘ ${failed} Holy See / houses test(s) failed`); process.exit(1); }
console.log(`\n✔ All ${Object.keys(tests).length} Holy See / houses tests passed`);
