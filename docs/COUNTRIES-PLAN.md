# Foreign countries: the build map

This turns Part B of `ROADMAP-countries-and-difficulty.md` into a file-by-file plan, and records what Phase 1 ships.

## Which countries, in what order

"Already in the game" means the countries the game already sends you to or draws people from:

| Country | Where it already appears | Priority |
|---|---|---|
| United Kingdom | Space Force/USAF posting (RAF Fylingdales), FSO posts, NATO | **Phase 1, playable** |
| Canada | FSO post (Ottawa), spouse nationality | **Phase 1, playable** |
| Germany | Army and Air Force postings (Grafenwöhr, Stuttgart, Ramstein), CIA station (Berlin), spouse nationality | **Phase 1, playable** |
| Japan | Navy, Marine and Air Force postings (Yokosuka, Okinawa, Iwakuni, Kadena, Yokota), FSO post (Tokyo) | **Phase 1, playable** |
| South Korea | Army, Marine and Air Force postings (Camp Humphreys, Osan, Mujuk), spouse nationality | Phase 2 (conscription) |
| Italy | Navy and Army postings (Naples, Vicenza, Aviano) | Phase 2 |
| Mexico | FSO post, spouse nationality | Phase 3 (informal economy) |
| Philippines, India | Special-operations deployments, spouse nationality | Phase 3 |
| Bahrain, Qatar, Djibouti, Guam | Postings only | Not planned as playable |

Phase 1 is the four rich, English-playable systems. Each one exercises a different variant of every system:

- Canada: provinces, two-level tax, public pension plus a flat old-age pension.
- The UK: nations, a single national income tax, a flat state pension, the NHS.
- Germany: Länder with no income tax of their own, contribution-based social insurance, and the points pension.
- Japan: a flat local resident tax, the national health insurance co-pay, a two-tier pension.

## Design decisions

1. **One money unit.** All simulation math stays in US dollars at purchasing-power parity, so every constant and the balance tests stay valid.
   - Each country has `currency { code, symbol, perUsd }` used only for display.
   - Countries also carry wage and price levels through their regions' `market` and `col` factors, so a UK salary is lower in PPP terms than the same US job, as it is in reality.
2. **Born in a country first.** You choose a country on the new-life screen. Moving between countries (visas, residency, credential recognition) is Phase 4.
3. **The US never changes.**
   - Foreign provinces and cities are added to `STATES` and `REGIONS` as **non-enumerable** entries.
   - `REGIONS[id]` lookups work everywhere. Every existing `Object.keys/values/entries(REGIONS)` (random picks, move lists, transfers) still sees only US places.
   - Seeds, saves and every US test stay identical.
   - Code that must list places for a foreign life asks `regionsIn(countryId)`.
4. **Systems are chosen by country**, through `countryOf(state)` and the country's `systems`, not by scattering `if (country === …)` checks.
5. **Display-level localisation for Phase 1.**
   - The renderer converts every `$` amount in player-facing text to the local currency.
   - It swaps a short list of US terms (Social Security, 401(k), IRS, Medicaid/Medicare, GPA wording) for national ones.
   - It works on text only, never on attributes or button arguments, so actions are untouched.
   - Phase 2 moves these into the modules.

## Everything that has to change, by system

Status: ✅ Phase 1 (this change) · 🔜 Phase 2 · ⏳ later.

### Identity and setup
- ✅ `src/modules/world/Countries.js`: the registry.
  - Each entry has its currency, languages, capital, name pools, provinces, cities, minimum wage, pension, health and tax parameters, and what is closed to non-citizens.
- ✅ `state.character.countryId` (absent = `US`, so no save migration is needed) and `countryOf(state)`.
- ✅ The new-life screen gets a country picker, and `engine.newLife({ countryId })` places the character in one of that country's cities.
- ✅ Name pools per country, for the character, family and NPCs.
- 🔜 Ethnic and immigrant mix per country, and nationality on NPCs.

### Places
- ✅ Provinces, nations, Länder and prefectures in `STATES`, each with `country`, income-tax brackets, property and sales/VAT rates, minimum wage, cannabis law, DUI rules and disasters.
- ✅ Cities in `REGIONS` with `country`, cost of living, wage level, transit and size.
- ✅ The Move tab and job transfers list only places in your country.
- ⏳ Moving abroad: visas, residency, citizenship (Phase 4).

### Money and taxes
- ✅ Display currency conversion.
- ✅ National income tax brackets in place of the US federal brackets:
  - Canada: federal plus provincial.
  - UK: personal allowance and bands (Scotland's own bands).
  - Germany: the Grundtarif, approximated in bands, plus the solidarity surcharge only above the threshold.
  - Japan: national tax plus a flat 10% resident tax as the "provincial" layer.
- ✅ Social contributions on wages (the US has none at year end today):
  - Canada: CPP + EI.
  - UK: National Insurance.
  - Germany: pension, health, unemployment and care insurance, employee share.
  - Japan: pension, health and employment insurance.
- ✅ No US child tax credit or SALT itemising abroad. Child benefit is paid as cash instead (Canada CCB, UK Child Benefit, German Kindergeld, Japan child allowance).
- 🔜 VAT/GST in living costs, council tax, capital-gains rules per country, corporate and entity types (Ltd, GmbH, KK), inheritance tax per country.

### Health
- ✅ A `national` coverage plan for every Phase 1 country:
  - No premiums (contributions are in payroll), a small or no deductible, and a low out-of-pocket cap.
  - Japan: 30% co-pay with a monthly cap.
  - No medical debt spiral.
- 🔜 Waiting lists in single-payer systems, private top-up insurance, and national disability benefits in place of SSDI.

### Retirement
- ✅ The national pension replaces Social Security, by formula:
  - Canada: CPP (25% of average earnings up to the YMPE) plus OAS.
  - UK: the flat new State Pension with 35 qualifying years.
  - Germany: pension points (Entgeltpunkte) × the current value.
  - Japan: the basic pension plus the earnings-related employees' pension.
- ✅ Claiming ages per country.
- 🔜 Tax-advantaged accounts renamed and capped per country: RRSP/TFSA, ISA/workplace pension, Riester, iDeCo/NISA. Phase 1 only relabels the 401(k) and IRA screens.

### Work
- ✅ Private, municipal and provincial/state careers carry over.
- ✅ US federal careers are closed abroad ("U.S. federal jobs require U.S. citizenship"): FBI, DEA, USPS, the intelligence community, the Foreign Service, federal agencies.
- 🔜 National equivalents as data on the existing job trees: RCMP, Bundespolizei, National Police Agency, Royal Mail, HMRC, and so on.
- 🔜 Licensing bodies per country (bar, medical, nursing, trades), and apprenticeship tracks (Germany).

### Military and service
- ✅ The US armed forces, Selective Service, US volunteer national service (AmeriCorps, Peace Corps) and US federal disaster teams are closed to non-citizens, with a reason shown.
- 🔜 National forces on the existing military engine: the Canadian Armed Forces, the British Armed Forces, the Bundeswehr and the Japan Self-Defense Forces. Each needs branches, ranks, pay and deployments; Phase 3 adds South Korea's conscription.

### Politics and law
- ✅ Local office (council, mayor) stays open. US state and federal offices are closed abroad.
- 🔜 Parliamentary offices per country, and referendums in place of ballot measures.
- ✅ No death penalty in any Phase 1 country. Cannabis and DUI rules come from the province.
- 🔜 Offense lists and sentencing per country, jury vs. bench trials, divorce and inheritance law (forced heirship ⏳).

### Education
- ✅ The existing programs carry over (degree names are similar enough to play).
- 🔜 School stages and exams (GCSE/A-levels, Abitur, provincial diplomas), and university fees per country (UK fees and income-contingent loans, German no-fee public universities, Japanese entrance exams).

### Housing and credit
- ✅ The existing mortgage engine runs, priced in PPP dollars.
- 🔜 Variable/short-fixed mortgages and stress tests, stamp duty and land transfer tax, and credit registries in place of FICO.

## Phase 1 acceptance

- `tests/countries.js` plays full lives in each Phase 1 country, with random choices, and checks that:
  - nothing throws and every screen renders without leaked text;
  - local currency shows;
  - taxes, contributions and pensions follow the country's formula;
  - no US federal job, US military branch or US state or federal office is open;
  - saves round-trip.
- Every existing suite, the simulation and the US balance bands pass unchanged.
