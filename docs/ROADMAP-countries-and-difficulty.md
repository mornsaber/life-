# Roadmap: difficulty levels and other countries

Two features, planned so they can be built in small, shippable steps. Difficulty is self-contained and should come first: it's a few weeks of work and gives the balance tooling the countries work needs later. Countries are a large refactor because the game assumes the United States almost everywhere.

**How US-specific is the code today?**

- 31 files read `REGIONS`/`STATES` directly.
- 347 places in 107 files format money with a literal `$`.
- 17 files reference Social Security.
- Taxes, health insurance, retirement accounts, mortgages, military branches, federal agencies, the courts and business entities all model US law.
- Names come from one US-centric pool (`src/core/State.js`).

---

## Part A — Difficulty

### A1. The setting

- `state.settings.difficulty = { id, knobs, locked }` is chosen on the new-life screen (`newLifeForm` in `src/ui/Components.js`, `engine.newLife` options).
- Add `src/core/Difficulty.js`:
  - `DIFFICULTIES`, the presets.
  - `knob(state, name)`, which returns the multiplier (1 on Normal).
  - `describe(state)` for the UI.
- Migration: `STATE_VERSION` 4 → 5 in `src/core/Migrations.js` sets `normal` on old saves.
- Heirs inherit the setting (`buildHeirState` in `src/modules/people/Legacy.js`).
- Changing it mid-life is allowed only toward easier, and marks the life *assisted*. This matters for the Hall of Fame (task 15).

### A2. Knobs and where they plug in

Every knob is a multiplier read at one call site. Normal = 1.0, so balance on Normal is unchanged.

| Knob | Story | Normal | Hard | Brutal | Hook (file) |
|---|---|---|---|---|---|
| `income` (wages, offers) | 1.15 | 1 | 0.92 | 0.85 | `career/CareerEngine.js` salary, `career/JobMarket` offers, `life/Finances.js` gig |
| `costOfLiving` | 0.85 | 1 | 1.08 | 1.15 | `life/Finances.js` lifestyle floor, `realestate/PropertyMarket.js` rents/prices |
| `credit` (rate spread, approvals) | 0.8 | 1 | 1.2 | 1.4 | `realestate/MortgageSystem.js` `scoreSpread`, `vehicles/Vehicles.js` `autoRate`, card APR |
| `exams` (pass odds offset) | +0.1 | 0 | −0.05 | −0.1 | `credentials/LicensingEngine.js` (exam `difficulty` already exists) |
| `promotion` / `firing` odds | 1.3 / 0.6 | 1 / 1 | 0.85 / 1.3 | 0.7 / 1.6 | `career/CareerEngine.js`, `career/ManagementEngine.js` |
| `bizLuck` (fit spread, demand) | 1.1 | 1 | 0.95 | 0.88 | `business/Business.js` `fit`, `PHASE_DEMAND` |
| `rivals` (aggression) | 0.6 | 1 | 1.3 | 1.6 | `business/Rivals.js` move chance |
| `events` (bad:good ratio) | 0.7 | 1 | 1.25 | 1.5 | `life/LifeEvents.js`, `MoreLifeEvents.js` weights |
| `mortality` / `illness` | 0.7 | 1 | 1.15 | 1.3 | `life/Lifecycle.js` `backgroundMortality`, `health/` onset odds |
| `justice` (detection, sentences) | 0.8 | 1 | 1.15 | 1.3 | `legal/` discovery/evidence, `Judiciary` sentencing |
| `markets` (volatility) | 0.7 | 1 | 1.2 | 1.4 | `investing/Assets.js` returns spread |
| `recessions` (frequency) | 0.7 | 1 | 1.25 | 1.5 | `economy/EconomyEngine.js` phase transitions |
| `startingWealth` (tier weights) | upper+ | as now | low+ | low only | `people/PeopleEngine.js` `generateFamily` |

Rules:

- Knobs must never break invariants: no negative probabilities, and clamps stay in place.
- Where a module already has its own random stream (`sideRng`, NPC lives, investment listings), apply knobs to outcomes, not to the stream. That keeps saves reproducible.

### A3. Challenge modifiers (pairs with task 15)

These are optional toggles on top of a preset, each a small rule:

- **Ironman:** one autosave and no reloading.
- **Rags to riches:** low-wealth family and no inheritance.
- **No degree:** college enrollment blocked.
- **Self-made:** no family gifts or loans.
- **Dynasty:** win condition of 5 generations.
- **Hardcore health:** no healthcare safety nets.

Each one lives in `Difficulty.js`. Modules check it with `challenge(state, id)`.

### A4. UI

- **New-life screen:** preset chips with a one-line description each, a "Customize" disclosure showing the knobs, and challenge toggles.
- **During play:** a status chip in the top bar ("Hard"). A settings panel shows the knobs read-only, plus the "make it easier" option.
- **Obituary and tombstone:** show the difficulty, for score comparisons.

### A5. Balance and tests

- `tests/balance.js` takes `--difficulty`:
  - **Normal:** keeps today's real-world bands exactly. This is the regression guard.
  - **Story / Hard / Brutal:** get shifted bands, e.g. Hard median income 0.85–0.95× of Normal and homeownership by 45 lower by 5–15 points.
- `tests/simulate.js` and the fuzzers run one pass per preset.
- Add a `tests/difficulty.js` suite:
  - Knobs default to 1.
  - The migration sets Normal.
  - Heirs inherit the setting.
  - A Brutal life is measurably harder than a Story life over 30 simulated lives.

### A6. Order of work

1. `Difficulty.js` and the migration.
2. The new-life UI.
3. Wire the knobs one module at a time. Each step ships with Normal unchanged, which the balance check proves.
4. Challenge modifiers.
5. Hall of Fame scoring with a difficulty multiplier (task 15).

---

## Part B — Other countries

### B0. Decisions to make first

1. **Units of money.** *Recommended:* keep all simulation math in **real US dollars at purchasing-power parity**. Each country gets `currency { code, symbol, perUnit }` used only for display and for cross-border moves. Every existing constant stays valid and balance stays meaningful. The alternative (native currencies everywhere) means re-tuning thousands of constants.
2. **Which country first.** *Recommended:* **Canada** or the **UK**. English-language, good open data, and systems close enough to share most code while still forcing every abstraction (single-payer health, different pensions, provinces/nations, no state income tax in the UK).
3. **Country of birth vs. moving abroad.** Ship "born in country X" first. Emigration (Phase B6) needs visas, credential recognition and cross-border tax, so it comes later.

### B1. Phase 0 — groundwork (no behavior change; the game stays US-only)

1. **Country registry** (`src/modules/world/Countries.js`), each country carrying:
   - `id`, `name`, `currency`, `languages`.
   - `namePools`, by gender and by origin mix.
   - `subdivisions` (states / provinces / regions) and `regions` (cities). Today's `States.js` and `Regions.js` become the US entry.
   - System ids: `tax`, `health`, `pension`, `education`, `legal`, `military`, `housingFinance`, `business`.
   - `wageLevel`, `priceLevel`, `lifeTable`, `minimumWage`, `retirementAge`, `drivingSide`, `terms` (a vocabulary map, below).
2. **`state.character.countryId`** defaults to `'US'`, with a migration. Every `REGIONS[...]` / `STATES[...]` access in the 31 files goes through accessors: `regionOf(state)`, `subdivisionOf(state)`, `regionsOf(countryId)`.
3. **Money formatting.** Replace the 347 literal `$` sites with `fmt.money(state, amount)` from one helper. Mechanical, but touches 107 files, so do it module by module, each followed by the full test run.
4. **Vocabulary.** User-facing US terms go through `term(state, key)`:
   - Finance: IRS, 401(k), IRA, Social Security, Medicare, Medicaid, FHA, SBA, LLC/S-corp, GI Bill.
   - Government and law: county, state trooper, felony/misdemeanor, DMV.
   - Education: high school, college.

   Start with the keys the UI shows most.
5. **Name pools per country** replace the single `FIRST_NAMES` / `LAST_NAMES` in `src/core/State.js`, with an immigrant-origin mix per country.

**Exit criterion:** the US plays identically. All tests, fuzzers and the balance check pass unchanged.

### B2. Phase 1 — the systems behind interfaces

Each system becomes a strategy object picked by the country's system id. The US implementation moves out unchanged first; new countries add implementations. Listed in dependency order:

1. **Taxes** (`life/Finances.js`, `life/Taxes.js`, `business/Business.js`):
   - Income tax brackets, national plus sub-national.
   - Social contributions in place of FICA/SE tax.
   - Capital gains, VAT/GST in place of sales tax, property tax or council tax.
   - Corporate tax and entity types (Ltd, GmbH, sole trader, partnership) and their pass-through rules.
   - Deductions and credits (child benefit in place of the CTC), plus the estate or inheritance tax that `people/Legacy.js` uses.
2. **Pensions and retirement** (`retirement/`):
   - A state pension formula in place of Social Security (UK flat-rate, Canada CPP/OAS, Germany points).
   - Tax-advantaged accounts in place of 401(k)/IRA/529 (RRSP/TFSA/RESP, UK workplace pension/ISA, Australian superannuation).
   - Retirement and claiming ages, and spousal rules.
3. **Health care** (`health/`, `medicine/`, `SSDI`):
   - Single-payer and multi-payer models in place of employer insurance, Medicaid and Medicare.
   - Waiting lists as the cost in single-payer systems.
   - Medical debt and medical bankruptcy turned off where they don't exist.
   - Disability benefits in place of SSDI.
4. **Education** (`education/`, `campus/`, `academia/`, `K12`):
   - School stages and exams (GCSE/A-level, Abitur, provincial diplomas).
   - University admission and fees, plus student loans (UK income-contingent, Canada provincial).
   - Apprenticeship tracks (Germany's dual system).
   - Degree names mapped to the existing degree ranks so careers keep working.
5. **Credentials and careers** (`credentials/`, `career/`):
   - The job trees mostly carry over.
   - Licensing bodies and exams are per country: bar, medical, nursing, engineering, trades, commercial driving.
   - Public-sector employers need country org templates. Federal agencies (FBI, ATF, USPS, SSA, VA…) become national equivalents (RCMP, Royal Mail, HMRC…), and police and fire structures become national or provincial.
6. **Military** (`military/`):
   - Branches, ranks and pay per country.
   - Conscription where it exists (South Korea, Israel, Switzerland).
   - Veterans' benefits in place of the VA and GI Bill.
   - Deployments drawn from the country's real commitments.
   - The clearance system becomes the national vetting system.
7. **Law and courts** (`legal/`, `civic/`, `politics/`):
   - Offense lists and sentencing ranges.
   - No death penalty in most countries.
   - Judge vs. jury trials, bail, record sealing, pardons.
   - Divorce, custody and child-support formulas.
   - Inheritance rules (forced heirship in France, Spain…).
   - Elected offices: parliamentary systems; referenda in place of ballot measures.
8. **Housing and credit** (`realestate/`, `life/CreditCards.js`):
   - Mortgage products: variable or short fixed terms and stress tests in place of the 30-year fixed, FHA and VA.
   - Credit scoring: some countries have none, use a positive registry instead.
   - Stamp duty or land transfer tax, rent controls, and tenant law in place of US eviction rules.
9. **Business** (`business/`): entity types, VAT registration thresholds, payroll taxes, licenses (`BusinessLicenses.js` gets per-country license sets), small-business lending (the SBA counterpart) and franchise disclosure rules.
10. **Economy and world** (`economy/`, `world/`): a business cycle and interest-rate path per country. Exchange rates come in only with B6.
11. **People and society** (`people/`): family norms, marriage law, fertility and life tables, and religion mix (`community/Religions.js`).
12. **Disasters** (`life/Disasters.js`): hazard tables per subdivision. The US model already does this per state.

### B3. Phase 2 — the first new country

1. **Data entry:**
   - Provinces and nations, and cities with cost-of-living factors and market types (feeding `MARKET_ROOM`).
   - Tax brackets, pension rules and health system parameters.
   - Licenses and public employers.
2. Implement the country's system strategies from B2.
3. **Balance:** add country bands to `tests/balance.js` from national statistics (median income by field, homeownership by 45, debt levels, life expectancy, college completion). Every metric that passes for the US must pass for the new country.
4. **New-life screen:** a country picker. The default stays the US.
5. **Tests:**
   - A `tests/countries.js` suite: a life in each country, a tax snapshot against a hand-computed return, pension at retirement, and a health-system path.
   - The fuzzers and simulation run per country.

### B4. Phase 3 — more English-speaking countries

UK, Canada, Australia, Ireland and New Zealand share the most structure with the first new country. Each is mostly data plus small strategy variants.

### B5. Phase 4 — continental Europe and East Asia

Germany, France, the Netherlands, Japan and South Korea. This adds:

- Language as a career gate (a `language` skill per language).
- Apprenticeships.
- Conscription.
- Employment law with strong job protection, which changes firing odds.
- Translated name pools and UI terms. Full UI translation is a separate project (i18n) and not required to play.

### B6. Phase 5 — moving between countries

- **Visas:** work, student, family, investor and retiree, each with eligibility, quotas and lottery odds.
- **Permanent residency and citizenship:** years of residence, tests, dual-citizenship rules. This connects to the existing foreign-national spouse and clearance hooks in `people/PeopleEngine.js`.
- **Credential recognition:** degrees and licenses partly carry over. Professionals must requalify (bar transfer exams, foreign medical graduate pathways).
- **Money across borders:**
  - Converting assets at exchange rates.
  - Tax residency and double-taxation treaties.
  - Exit taxes.
  - Foreign accounts.
  - Pension totalization agreements.
- **Property and businesses left behind:** managed remotely, using the same machinery as today's region moves.
- **Children born abroad:** citizenship by birth or descent, which matters for heirs in `Legacy.js`.

### B7. Phase 6 — middle- and lower-income economies

Mexico, Brazil, India, the Philippines, Nigeria. This needs:

- An informal-economy layer: cash work, no payroll records, and thin safety nets.
- Remittances from relatives abroad, which connects to NPC lives.
- Different wage distributions and housing markets (self-built housing).
- Different education access.

The PPP-dollar decision from B0 keeps the math consistent.

### Cross-cutting rules for every phase

- **The US never regresses.** Every step ships with the full suite, fuzzers, simulation and the US balance bands passing unchanged.
- **Saves stay compatible.** Each phase bumps `STATE_VERSION` with a migration and a test for an old save.
- **Data is cited.** Each country's tax, pension and benefit constants carry a source and the year in a comment, like the existing ones (e.g. the 2025 gift exclusion in `EstatePlanning.js`).
- **Random streams.** New country systems that add randomness use side streams (like `sideRng` and the NPC-lives stream), so they don't reshuffle existing outcomes or seed-dependent tests.

### Suggested sequence

| Step | What | Depends on |
|---|---|---|
| 1 | A1–A4: difficulty presets, knobs, UI | — |
| 2 | A5: difficulty balance and tests | 1 |
| 3 | B0 decisions, B1 groundwork (registry, accessors, money formatter, vocabulary, names) | — |
| 4 | B2 strategies for taxes and pensions (US extracted) | 3 |
| 5 | B2 strategies for health, education, housing, business | 4 |
| 6 | B2 strategies for credentials/careers, military, law, politics | 5 |
| 7 | B3: first new country (Canada or UK) | 6 |
| 8 | Challenge modifiers and Hall of Fame (A3, task 15) | 2 |
| 9 | B4: remaining English-speaking countries | 7 |
| 10 | B6: moving between countries | 7 |
| 11 | B5, B7: further countries | 9–10 |
