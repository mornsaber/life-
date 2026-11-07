# Content packs plan

Goal: adding the next 100 careers, events, businesses or countries is mostly writing data,
not code, and every addition is checked automatically.

## Where we are

| Content | Count | How it's defined today | Pack support |
|---|---|---|---|
| Countries | ~110 | `packs/*.js` and `nation(spec)`, inheriting tables from a base country | ✅ done (`fromPacks`, ~70 tables) |
| Careers (professions) | 174 | JS objects across ~60 files in `career/` (JobTrees, JusticeCareers…). 76 contain functions (`employerName`, `eligible`, custom hooks) | ❌ |
| Life events | ~80 + many in-module | `LifeEvents.js` / `MoreLifeEvents.js` arrays with `when(state)` and `effect(ctx)` functions; another few hundred one-off prompts inside modules | ❌ |
| Businesses | ~60 types | `BusinessTypes.js` objects (mostly data) | partial (per-country tables via `fromPacks`) |
| Credentials | ~150 | `CredentialRegistry.js` objects (mostly data) | partial |
| Crimes/offences | ~100 | `Offenses.js` (data) | partial |
| Honours, ranks, insignia | many | per-country tables | ✅ via country packs |

The code is about 120k lines across 455 module files. What slows new content today:
1. A career means touching 3–6 files: the profession, the ladder, units, insignia, skills map, and engine hooks.
2. Events mix data (text, odds) with code (conditions, effects), so you can't validate them without running them.
3. Nothing lists everything a pack must provide, so gaps show up as leaks in the abroad sweep.

## Design

### Pack kinds
A **pack** is one file that adds or changes content of one or more kinds:

```js
export default {
  id: 'maritime-expansion',
  version: 1,
  requires: ['base'],            // other packs it builds on
  careers:   { harbourPilot: {...}, ... },
  events:    [ {...}, ... ],
  businesses:{ ferryCompany: {...} },
  credentials:{ ... },
  countries: [ ... ],            // today's country packs, unchanged
  text:      { 'en': {...} },    // optional: strings, for rotation and later translation
};
```

The registry merges every pack at load time into the existing tables (`PROFESSIONS`,
`LIFE_EVENTS`, `BUSINESS_TYPES`, `CREDENTIALS`), so the rest of the game doesn't change.

### Careers as data
A career pack entry, with no code:

```js
harbourPilot: {
  name: 'Harbour Pilot', icon: '⚓', sector: 'private', field: 'maritime',
  entry: { education: 'highschool', credentials: ['mariner'], minAge: 23, experience: { fields: ['maritime'], years: 5 } },
  employers: { US: ['{city} Bar Pilots Association'], GB: ['{city} Harbour Authority'], '*': ['{city} Port Authority'] },
  countries: { only: null, except: ['ML', 'NE'] },     // landlocked
  engine: 'shift',                                     // an existing career engine: shift, caseload, book, projects, season, audience, route, quote
  skills: ['piloting', 'leadership'],
  physical: true,
  ladder: [
    ['apprentice', 'Apprentice Pilot', 4, { years: 2 }],
    ['pilot', 'Harbour Pilot', 6, { entry: true }],
    ['senior', 'Senior Pilot', 7],
    ['chief', 'Chief Pilot', 8, { track: 'mgmt', abilities: ['supervise', 'hire'] }],
  ],
  events: ['pilot.fogboarding', 'pilot.nearMiss'],     // event ids from the events section
}
```

- Employer names use templates (`{city}`, `{country}`, `{province}`) per country with a `'*'` fallback, which retires most of today's `employerName` functions.
- `countries.only` / `except` replaces the scattered lists such as `US_ONLY_PROFESSIONS`.
- `engine` picks one of the existing career engines, so a new career is playable without new code.
- **Escape hatch:** a pack in a `.js` file may still supply a `hooks` object with functions for the few careers that truly need logic (the 76 with functions today). Only JSON packs are code-free.

### Events as data, using a small rule language
Conditions and effects become plain objects that the engine interprets:

```js
{
  id: 'pilot.fogboarding', icon: '🌫️', title: 'Boarding in Fog',
  when: { job: { field: 'maritime' }, age: [23, 70], chance: 0.08 },
  text: ['The ladder swings in the swell, slick with spray.', 'Visibility is 50 metres and the ship won\'t slow down.'],
  options: [
    { id: 'board', label: 'Board anyway', check: { skill: 'athletics', difficulty: 50 },
      pass: { stat: { happiness: 3 }, job: { performance: 5 }, log: 'You made it aboard.' },
      fail: { stat: { health: -20 }, log: 'You fell between ladder and hull.', injury: 'fracture' } },
    { id: 'wait', label: 'Wait for the fog to lift', effect: { job: { performance: -3 }, rep: { work: -2 } } },
  ],
  followUp: { id: 'pilot.inquiry', years: 1, if: 'fail' },
}
```

- **Conditions:** age, country, job, field or grade, money, stats, skills, reputation, relations (has partner or kids), flags, city stats, economy phase, chance.
- **Effects:** stats, money (earn, spend), job (performance, pay), reputation, relationships, skills, flags, conditions or injuries, logs, news stories, follow-ups.
- **Checks:** skill checks and stat checks, with pass and fail branches.
- Text can be an array, so phrasing rotates; this is the hook for later writing-quality work.
- The interpreter is one module (`core/Rules.js`) with a schema, so every event can be validated without playing it.

### Validation (`tests/packs.js`, extended)
For every pack:
- **Schema:** required fields, known enum values (sector, engine, skill ids, credential ids, event ids).
- **References:** every id it points to exists, and nothing collides with another pack.
- **Coverage:** each career has an employer name in every country it's open in, or a `'*'` fallback.
- **Smoke test:** an automated life plays each career for 10 years, and each event fires at least once under its conditions, with every option resolved; the views must render cleanly.
- **Abroad scan:** no US leftovers in pack text for non-US countries.

### Migration path (no big bang)
1. Build `core/Rules.js`, the pack loader and the validator. New content only.
2. Move the **data-only** content first: credentials, offences and business types (they are already data, so the move is mechanical).
3. Move **life events** (`LifeEvents.js`, `MoreLifeEvents.js`) to the rule language: about 80 events, a batch at a time, with seeded results compared before and after.
4. Move careers without functions (98 of 174), then the rest with `hooks`.
5. Move in-module one-off prompts only when a module is next touched.

Each step keeps the fast suite green and the abroad sweep clean.

### What it buys
- A new career: one entry of about 30 lines, instead of 3–6 files.
- A new event: one entry, validated before it's ever played.
- Writing improvements (rotated phrasing, tone) in one place.
- Optional later: players load their own packs from a file, and translations.

## Decisions
1. **Format:** JS pack files of plain data, with an optional `hooks` object for logic only where it's needed.
2. **First:** life events, moved to the rule language.
3. **Player mods:** not now. The packs are for adding our own content faster, and the door stays open.
4. **Migration:** everything: events, careers, then the in-module one-off prompts. Done in batches, each checked against seeded before/after runs, with the fast suite and the abroad sweep kept green.
