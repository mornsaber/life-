/**
 * Police and fire rank insignia by country (ui/Insignia.js jobInsignia).
 *
 *   node tests/serviceinsignia.js
 */
import assert from 'node:assert/strict';
import { jobInsignia } from '../src/ui/Insignia.js';
import { getProfession, NATIONAL_PROFESSIONS } from '../src/modules/career/JobTrees.js';

const ins = (cc, pid, id) => jobInsignia({ professionId: pid, levelId: id }, getProfession(pid), cc) ?? '';

const tests = {
  'bugles are American: British, French, German and Japanese firefighters wear their own'() {
    assert.match(ins('US', 'fire', 'captain'), /path|rect|svg/);
    const usCaptain = ins('US', 'fire', 'captain');
    for (const cc of ['GB', 'FR', 'DE', 'JP']) assert.notEqual(ins(cc, 'fire', 'captain'), usCaptain, `${cc} fire captain`);
    assert.match(ins('GB', 'fire', 'captain'), /✲/, 'a British watch manager wears impellers');
    assert.match(ins('GB', 'fire', 'chief'), /path/, 'a chief fire officer has a wreath');
    assert.match(ins('DE', 'fire', 'firefighter'), /#c0392b/, 'a Brandmeister\'s red star');
  },
  'British police: a superintendent wears a crown, a chief constable crossed tipstaves and a crown'() {
    assert.match(ins('GB', 'police', 'deputyChief'), /♛/);
    assert.doesNotMatch(ins('GB', 'police', 'deputyChief'), /✦/);
    assert.match(ins('GB', 'police', 'chief_cmd1'), /♛.*✦/);
    assert.match(ins('GB', 'police', 'chief'), /path.*|♛/);
    assert.match(ins('GB', 'police', 'chief'), /♛/);
  },
  'German police: blue, then silver, then gold stars by career track'() {
    assert.match(ins('DE', 'statePolice', 'sergeant'), /#5b8def/);
    assert.match(ins('DE', 'statePolice', 'captain'), /#c9ced6/);
    assert.match(ins('DE', 'statePolice', 'major'), /#d4a017/);
    assert.match(ins('DE', 'statePolice', 'detLieutenant'), /#d4a017/, 'a Kriminalrat is in the senior track');
  },
  'a French detective captain wears a captain\'s galons; Brazil\'s Civil Police wear none'() {
    assert.equal(ins('FR', 'statePolice', 'detSergeant'), ins('FR', 'statePolice', 'captain'));
    assert.equal(ins('BR', 'statePolice', 'detLieutenant'), '');
    assert.notEqual(ins('BR', 'statePolice', 'captain'), '');
  },
  'national forces on agency ladders wear rank: the RCMP, the Gendarmerie, the Carabinieri, the CRPF'() {
    const nat = (id, title) => { const p = NATIONAL_PROFESSIONS[id]; const l = p.levels.find((x) => x.title === title); assert.ok(l, `${id}: ${title}`); return jobInsignia({ professionId: id, levelId: l.id }, p, p.country) ?? ''; };
    assert.notEqual(nat('ca_fbi', 'Corporal'), '', 'an RCMP corporal');
    assert.notEqual(nat('fr_usms', 'Capitaine'), '');
    assert.notEqual(nat('it_usms', 'Maresciallo'), '');
    assert.notEqual(nat('in_usms', 'Commander'), '');
    assert.equal(nat('fr_usms', 'Fugitive Task Force Officer'), '', 'specialist rungs carry no extra rank');
    assert.notEqual(nat('it_fbi', 'Ispettore'), nat('it_fbi', 'Commissario'), 'an Ispettore is not a Commissario');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`  ✔ ${name}`); } catch (e) { failed += 1; console.log(`  ✘ ${name}\n    ${e.stack.split('\n').slice(0, 6).join('\n    ')}`); }
}
if (failed) process.exit(1);
