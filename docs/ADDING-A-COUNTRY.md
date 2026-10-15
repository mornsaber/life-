# Adding a country

A new country is one file: a **country pack** in `src/modules/world/packs/`.
New Zealand (`NZ.js`), Ireland (`IE.js`), Spain (`ES.js`), the Netherlands (`NL.js`), Sweden (`SE.js`) and Brazil (`BR.js`) are complete examples.

## 1. Pick a base country

Each pack names a playable country it is `basedOn`. Most of the game's
per-country tables (about 70, covering courts, unions, mortgages, police
ranks, medals and more) call `fromPacks(TABLE, 'KEY')` straight after they
are defined. If your pack gives no entry for `KEY`, it gets the base
country's entry, so the game stays playable from the first line.

Choose the country whose institutions are closest to yours:

| New country | Good base |
|---|---|
| Commonwealth, Westminster parliament, state/provincial police | `AU`, `CA` |
| Common law, national police, county councils | `GB` |
| EU civil-law country | `FR`, `DE`, `IT` |
| Presidential republic, informal economy | `MX`, `PH` |

Inheriting is a starting point, not the finish. Anything that names a
place, an institution or a person must be overridden. The pack test fails
when the base country's words leak into a life played in yours.

## 2. Write the pack

```js
export const XX = {
  id: 'XX',
  basedOn: 'GB',
  groups: ['EU', 'COMMON_LAW', 'RICH_SYSTEMS'],   // lists in Immigration.js the country belongs to
  agreements: ['US', 'GB'],                       // social-security (pension) agreements
  licenceExchange: ['GB', 'FR'],                  // driving licences swapped without a test, both ways
  peers: ['GB'],                                  // professions recognised with only an assessment, both ways
  country: { … },                                 // the Countries.js entry (below)
  offices: { xx_mp: { … }, xx_pm: { … } },        // elected offices (NationalOffices.js shape)
  communities: { … },                             // extra name pools for Diaspora.js
  tables: { KEY: value, OTHER_KEY: (base) => ({ ...base, tweak: 1 }) },
};
```

Then add it to `PACKS` in `packs/index.js`.

A pack must be **plain data**: it imports nothing from the game. Packs are
read while the game's modules are still loading, so an import would create a
circular dependency.

### `country`

This has the same shape as the entries in `Countries.js`: name, flag,
demonym, capital, currency, languages, retirement age, taxes and
contributions, pension, health cover, child benefit, display `terms`, name
pools, provinces, cities, hometowns and province populations.

- **Money.** Convert local amounts to US dollars at OECD PPP, and put the
  year and source in a comment.
- **City ids.** These must be unique across the whole game. Check them
  against `FOREIGN_CITIES` and `REGIONS`.
- **Taxes.** `brackets` are bands on income above the `allowance`. You can
  model a tax credit as an allowance (the Irish pack does this).
- **`terms`.** These swap US words in displayed text for local ones. They
  also need to swap the *base* country's words that the shared code still
  prints. For example, the Irish pack maps `HMRC` to `Revenue` and `NHS` to
  `HSE`.

### `tables`

Each value is either the entry itself or a function of the base entry. Set
a value to `null` to say "this country has none". For example,
`ORDERS: null` means Ireland gives no state honours, and
`caseOfficer: null` means there is no foreign intelligence agency.

These tables almost always need your own entry:

| Key | File | What it is |
|---|---|---|
| `LOCAL_AGENCIES` | LocalAgencies.js | state and local careers: police, fire, ambulance, schools, council, prosecutors (names, employers, ranks) |
| `AGENCIES` | NationalAgencies.js | national careers: federal police, border, intelligence, foreign service |
| `FORCES` | NationalForces.js | armed forces: branches, ranks, bases (your city ids), overseas postings |
| `LEGISLATURES` | NationalOffices.js | parliament: chambers, seats, the offices that sit in them, head of government |
| `IMMIGRATION`, `WORKING_HOLIDAY`, `ASYLUM` | Immigration.js | visas, permanent residence, citizenship |
| `EDUCATION` | Education.js | fees, school names, school-leaving exam, licence names |
| `MEDALS`, `ORDERS` | Honours.js | military decorations and the honours list |
| `MIL_SPECIAL`, `SOF`, `MIL_UNITS`, `ACADEMY_NAMES`, `VETTING`, `MILITARY_JUSTICE` | MilitaryLocal.js | military life in local terms |
| `UNIONS`, `PARTY_NAMES`, `HEALTH_SYSTEMS`, `DIASPORA`, `THEATERS` | various | unions, parties, waiting lists, immigrant names, wars |
| `VOLUNTEER_SERVICES`, `VOLUNTEER_RANKS`, `VOLUNTEER_PARENTS` | CountryLaw.js | volunteer emergency services: local names, rank ladders, and the national or state service a unit belongs to (who funds and equips it, its grant scheme, whether members are paid on call) |

For the full list, run
`grep -rn "fromPacks" src --include=*.js | grep -v packs/`. The key is the
second argument of each call.

### Two-way and group lists

Some data appears in other countries' lists as well as your own. The pack
fields below fill those lists, so you never edit another country's file:

| Field | What it does |
|---|---|
| `groups` | Adds the country to `EU`, `COMMON_LAW`, `STRICT_CLINICAL` or `RICH_SYSTEMS` in Immigration.js |
| `licenceExchange`, `peers` | Adds the country to each partner's list, both ways |
| `agreements` | Adds pension-agreement pairs |
| `freeMovement` | Countries whose citizens move in without a visa (beyond the EU, which `groups: ['EU']` covers), both ways |
| `WORKING_HOLIDAY.partners` | The partner countries' schemes accept your young people at the same age limit |

## 3. Test

```sh
node tests/packs.js 20 7      # every pack: tables wired, every local career, 40 lives scanned
node tests/countries.js       # add your id to FOREIGN at the top to run the country suite on it
node tests/milabroad.js       # military careers in every country's forces
```

`tests/packs.js` plays lives in each pack country. It hires into every local
career, renders every screen through the country's display swaps, and scans
the life story, prompts and screens for:

- broken text
- US-only posts
- the base country's own words

Give your country an entry in `LEAKS` in that file: a pattern of your base country's tell-tale words.
