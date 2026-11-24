/**
 * Departments, divisions, units and agencies go by the names of their day: no Human Resources in
 * 1900, no Bundesministerium in the Kaiserreich, Madras before Chennai.
 *
 *   node tests/orgunits.js
 */
import assert from 'node:assert/strict';
import { periodText, setEraYear } from '../src/modules/world/Eras.js';
import { cityName } from '../src/modules/career/Employers.js';

const at = (year, text) => { setEraYear(year); try { return periodText(text); } finally { setEraYear(null); } };

const tests = {
  'management-speak becomes the department of the day'() {
    assert.equal(at(1905, 'Human Resources'), 'Staff Office');
    assert.equal(at(1950, 'Human Resources'), 'Personnel Department');
    assert.equal(at(1960, 'Information Technology'), 'Data Processing');
    assert.equal(at(1925, 'Production & Logistics'), 'Production & Shipping');
    assert.equal(at(1880, 'Finance & Controllership'), 'Counting House');
    assert.equal(at(2020, 'Human Resources'), 'Human Resources');
  },
  'units that did not exist yet'() {
    assert.equal(at(1935, 'FBI Cyber Division'), 'FBI Technical Services Division');
    assert.equal(at(1925, 'Nuclear Physics Group'), 'Atomic Physics Group');
    assert.equal(at(1930, 'DNA Unit'), 'Serology Section');
    assert.equal(at(1905, '6th-grade team'), '6th Grade');
  },
  'agencies under their old names'() {
    assert.equal(at(1950, 'U.S. Postal Service'), 'Post Office Department');
    assert.equal(at(1950, 'Department of Veterans Affairs'), 'Veterans Administration');
    assert.equal(at(1890, 'Bundesministerium der Finanzen'), 'Reichsamt der Finanzen');
    assert.equal(at(1930, 'Bundesministerium der Finanzen'), 'Reichsministerium der Finanzen');
    assert.equal(at(1925, 'Department for Work and Pensions'), 'Ministry of Labour');
    assert.equal(at(1930, 'Japan Meteorological Agency'), 'Central Meteorological Observatory');
    assert.equal(at(1975, 'Foreign, Commonwealth & Development Office'), 'Foreign and Commonwealth Office');
    assert.equal(at(1925, 'CPS — Kendal'), 'Prosecuting Solicitor — Kendal');
  },
  'places under their old names'() {
    assert.equal(at(1920, 'Chennai Public Library'), 'Madras Public Library');
    assert.equal(at(1930, 'Seoul Water Department'), 'Keijō Water Department');
    assert.equal(at(1925, 'Yangon Central Library'), 'Rangoon Central Library');
    assert.equal(at(2000, 'Chennai Public Library'), 'Chennai Public Library');
  },
  'city services are named for the city, not the metro area'() {
    assert.equal(cityName('sf'), 'San Francisco');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`); }
}
if (failed) process.exit(1);
