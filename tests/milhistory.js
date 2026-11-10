/**
 * Military service by era: decorations that existed then, duties and senior posts already
 * created, peacetime deployments, overseas garrisons and home bases under their names of the day.
 *
 *   node tests/milhistory.js
 */
import assert from 'node:assert/strict';
import { historicMedal, historicDuty, historicTopTitle, historicTheaters, historicOverseas, historicHomeBases, historicNationalTheaters } from '../src/modules/military/MilitaryHistory.js';
import { OVERSEAS } from '../src/modules/military/MilitaryLife.js';
import { BASES } from '../src/modules/life/Regions.js';
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { awardMedal } from '../src/modules/military/MedalEngine.js';
import { warMedalKey, warMedals } from '../src/modules/military/WarMedals.js';
import { academyFor } from '../src/modules/military/Academies.js';
import { setEraYear } from '../src/modules/world/Eras.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

const tests = {
  'American decorations as they stood'() {
    assert.equal(historicMedal(null, 'moh', 'army', 1850).name, 'Certificate of Merit');
    assert.equal(historicMedal(null, 'moh', 'army', 1870), undefined);
    assert.equal(historicMedal(null, 'silverStar', 'army', 1925).name, 'Citation Star');
    assert.equal(historicMedal(null, 'bronzeStar', 'army', 1900), null);
    assert.equal(historicMedal(null, 'purpleHeart', 'army', 1918).name, 'Wound Chevron');
    assert.equal(historicMedal(null, 'expeditionary', 'army', 1970).name, 'Armed Forces Expeditionary Medal');
    assert.equal(historicMedal(null, 'ndsm', 'army', 1985), null);
    assert.equal(historicMedal(null, 'combatAction', 'army', 1968).name, 'Combat Infantryman Badge');
  },
  'British, Commonwealth, German and Japanese awards by year'() {
    assert.match(historicMedal('GB', 'moh', 'army', 1850).name, /Despatches/);
    assert.equal(historicMedal('GB', 'moh', 'army', 1900), undefined);
    assert.equal(historicMedal('GB', 'serviceCross', 'army', 1900).name, 'Distinguished Conduct Medal');
    assert.equal(historicMedal('CA', 'moh', 'army', 1944).borrowed, 'GB', 'Canadians won the British VC');
    assert.equal(historicMedal('DE', 'serviceCross', 'army', 1916).name, 'Iron Cross, 1st Class');
    assert.equal(historicMedal('DE', 'serviceCross', 'army', 1965), null);
    assert.equal(historicMedal('JP', 'moh', 'army', 1905).name, 'Order of the Golden Kite');
  },
  'awarding in 1850 gives the award of the day'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(3), modules: MODULES });
    const state = engine.newLife({ countryId: 'GB', startYear: 1825 });
    state.character.age = 25;
    setEraYear(1850);
    state.military.service = { branch: 'army', nation: 'GB', track: 'officer', grade: 1 };
    const ctx = engine.context();
    awardMedal(ctx, 'moh', { branch: 'army', citation: 'At the Alma.' });
    assert.equal(awardMedal(ctx, 'purpleHeart', { branch: 'army' }), null);
    assert.ok(state.honors.some((h) => /Despatches/.test(h.name)));
    assert.ok(!state.honors.some((h) => /Victoria Cross/.test(h.name)));
    setEraYear(9999);
  },
  'service medals are earned once (stars and clasps after); data wars get their real medals'() {
    const engine = new Engine({ store: new Store(memory()), rng: new Random(4), modules: MODULES });
    const state = engine.newLife({ countryId: 'US', startYear: 1960 });
    state.character.age = 25;
    setEraYear(1985);
    state.military.service = { branch: 'army', track: 'enlisted', grade: 3 };
    const ctx = engine.context();
    for (let i = 0; i < 4; i++) awardMedal(ctx, 'expeditionary', { branch: 'army', citation: `Deployment #${i + 1}.` });
    const afem = state.honors.filter((h) => h.name === 'Armed Forces Expeditionary Medal');
    assert.equal(afem.length, 1, 'one medal');
    assert.equal(afem[0].awards, 4, 'with service stars');
    setEraYear(9999);
    assert.equal(warMedalKey('cow.163'), 'vietnamWar');
    assert.equal(warMedalKey('cow.748'), 'vietnamWar', 'Vietnam Phase 1');
    assert.equal(warMedalKey('cow.211'), 'gulfWar');
    assert.equal(warMedalKey('cow.106'), 'ww1');
    assert.ok(warMedals('cow.211', 'US', true).some((m) => m.name === 'Southwest Asia Service Medal'));
  },
  'officer academies award a bachelor\'s, and only once they granted degrees'() {
    assert.equal(academyFor('FR', false, 2010).degree, 'bachelor');
    assert.equal(academyFor('DE', false, 1990).degree, 'bachelor');
    assert.equal(academyFor('FR', false, 1960).degree, null, 'Saint-Cyr gave no degree in 1960');
    assert.equal(academyFor('AU', false, 1950).degree, null);
    assert.equal(academyFor('IN', false, 1965).degree, null);
    assert.equal(academyFor('CA', false, 1965).degree, 'bachelor');
    assert.equal(academyFor('FR', true, 2010).degree, null, 'graduates get no second degree');
    assert.equal(academyFor('GB', false, 2010).degree, null, 'Sandhurst gives none');
  },
  'duties and senior posts created in their years'() {
    assert.equal(historicDuty('msg', 'marines', 1930), null);
    assert.equal(historicDuty('rotc', 'army', 1900), null);
    assert.equal(historicDuty('joint', 'army', 1920).name, 'War Department General Staff officer');
    assert.equal(historicDuty('academy', 'airforce', 1950), null);
    assert.equal(historicTopTitle('enlisted', 'army', 'Sergeant Major of the Army', 1950), null);
    assert.equal(historicTopTitle('chief', 'army', 'Chief of Staff of the Army', 1880), 'Commanding General of the United States Army');
    assert.equal(historicTopTitle('chairman', 'army', 'Chairman of the Joint Chiefs of Staff', 1930), null);
  },
  'deployments, garrisons and bases of the day'() {
    assert.ok(historicTheaters('naval', 1850).some((t) => /Squadron/.test(t)));
    assert.ok(historicTheaters('ground', 1975).some((t) => /Fulda|DMZ/.test(t)));
    assert.ok(!historicTheaters('ground', 1975).some((t) => /Syria|Iraq/.test(t)));
    assert.ok(historicNationalTheaters('GB', [], 1900).includes('India'));
    assert.deepEqual(historicOverseas('army', OVERSEAS.army, 1880), []);
    assert.ok(historicOverseas('army', OVERSEAS.army, 1925).some(([, b]) => /Tientsin|McKinley/.test(b)));
    assert.ok(historicOverseas('army', OVERSEAS.army, 1980).some(([, b]) => b === 'Caserma Ederle, Vicenza'));
    const army1960 = historicHomeBases('army', BASES.army, 1960).map(([, b]) => b);
    assert.ok(army1960.includes('Fort Hood') && army1960.includes('Fort Benning') && !army1960.includes('Fort Cavazos'));
    const navy1850 = historicHomeBases('navy', BASES.navy, 1850).map(([, b]) => b);
    assert.ok(navy1850.includes('Gosport Navy Yard') && navy1850.includes('Charlestown Navy Yard') && !navy1850.includes('NAS Jacksonville'));
    assert.deepEqual(historicHomeBases('spaceforce', BASES.spaceforce, 1990), []);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (failed) process.exit(1);
