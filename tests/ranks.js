/**
 * Ranks of their day, and ranks that move with the years: the Tsar's navy, the Kaiser's army,
 * India before the Agniveers, Canada before unification, a Patrolman who becomes a Police Officer.
 *
 *   node tests/ranks.js
 */
import assert from 'node:assert/strict';
import { setEraYear, periodTitle, branchFrom } from '../src/modules/world/Eras.js';
import { rankOf } from '../src/modules/military/MilitaryEngine.js';
import { applyLevel, refreshPeriodTitle } from '../src/modules/career/CareerEngine.js';
import '../src/modules/registry.js';

const rank = (year, nation, branch, track, grade) => { setEraYear(year); try { return rankOf({ nation, branch, track, grade }).title; } finally { setEraYear(null); } };
const title = (year, t) => { setEraYear(year); try { return periodTitle(t); } finally { setEraYear(null); } };

const tests = {
  'military ranks of their day'() {
    assert.equal(rank(1940, undefined, 'army', 'enlisted', 0), 'Private', 'no PV1 before 1968');
    assert.equal(rank(1990, undefined, 'army', 'enlisted', 0), 'Private (PV1)');
    assert.equal(rank(1850, undefined, 'navy', 'enlisted', 0), 'Landsman');
    assert.equal(rank(1960, undefined, 'airforce', 'enlisted', 1), 'Airman Third Class');
    assert.equal(rank(1960, undefined, 'airforce', 'enlisted', 3), 'Airman First Class');
    assert.equal(rank(1970, undefined, 'airforce', 'enlisted', 3), 'Sergeant');
    assert.equal(rank(1990, undefined, 'airforce', 'enlisted', 3), 'Senior Airman');
    assert.equal(rank(1900, 'GB', 'army', 'enlisted', 6), 'Regimental Sergeant Major (Warrant Officer)', 'no WO classes before 1915');
    assert.equal(rank(1918, 'GB', 'airforce', 'officer', 2), 'Captain', 'the RAF used army ranks until 1919');
    assert.equal(rank(1900, 'DE', 'army', 'enlisted', 0), 'Musketier');
    assert.equal(rank(1940, 'DE', 'airforce', 'officer', 8), 'General der Flieger');
    assert.equal(rank(1900, 'RU', 'navy', 'officer', 0), 'Michman');
    assert.equal(rank(1940, 'JP', 'army', 'enlisted', 4), 'Gochō (Corporal)');
    assert.equal(rank(2000, 'IN', 'army', 'enlisted', 0), 'Sepoy', 'no Agniveers before 2022');
    assert.equal(rank(1960, 'IN', 'army', 'enlisted', 4), 'Jemadar');
    assert.equal(rank(1950, 'CA', 'navy', 'enlisted', 0), 'Ordinary Seaman');
    assert.equal(rank(1830, 'FR', 'army', 'officer', 6), 'Maréchal de camp');
    assert.equal(rank(1810, 'FR', 'army', 'officer', 6), 'Général de brigade', 'maréchal de camp only 1814–1848');
    assert.equal(branchFrom('JP', 'airforce'), 1954);
  },
  'civilian ranks of their day'() {
    assert.equal(title(1950, 'Correctional Officer'), 'Prison Guard');
    assert.equal(title(1960, 'Border Patrol Agent'), 'Patrol Inspector');
    assert.equal(title(1880, 'Detention Officer'), 'Jailer');
    assert.equal(title(1950, 'Senior Patrol Officer'), 'Senior Patrolman');
    assert.equal(title(2020, 'Correctional Officer'), 'Correctional Officer');
  },
  'a title changes as the years pass'() {
    const job = {};
    setEraYear(1960);
    applyLevel(job, { id: 'officer', title: 'Police Officer', track: 'ic', grade: 1, abilities: [] });
    assert.equal(job.title, 'Patrolman');
    setEraYear(1980);
    refreshPeriodTitle(job);
    assert.equal(job.title, 'Police Officer');
    // A title another system set (a posting) is left alone.
    job.title = 'Detective (Homicide)';
    setEraYear(1960);
    refreshPeriodTitle(job);
    assert.equal(job.title, 'Detective (Homicide)');
    setEraYear(null);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
