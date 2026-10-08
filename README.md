# LIFE//SIM

A deep, text-based life simulator inspired by BitLife: careers on real pay grades, public service and politics, military service with medals, volunteer emergency reserves, education and campus life, housing, health, investing — balanced against real-world data.

Pure ES modules, zero dependencies, no build step. Every click updates the screen right away, with no added delay.

## Run it

```bash
npm start                    # → http://localhost:8080
npm test                     # headless: simulates 300 full lives and checks state invariants
node tests/scenarios.js      # deterministic mechanics
node tests/saves.js          # save slots, export/import, migration of real saves from every past version
node tests/content.js        # event-pool lint (unique ids, pickable options, valid references)
node tests/balance.js 4000   # thousands of plausible lives vs. real-world reference bands (all cores)
```

You need Node 18+ for the dev server and the tests. The browser won't load ES modules over `file://`, so you need some local server; any static server works.

**Controls:** everything is a real button or form field. Keyboard: **Space/Enter** age up · **1–9** pick a decision option · **←/→, Home/End** on the tab bar · **[ ]** previous/next tab · **/** search your life story · **S** saves · **?** shortcuts · **Esc** close a panel (focus stays inside open dialogs and survives re-renders).

**Saves:** multiple slots (💾), export a life as a `.json` file and import it into any slot. Saves from every earlier version are migrated, not wiped.

**Settings (⚙️):** light / dark / follow-the-OS theme, *auto-resolve routine decisions* (only choices with one obviously safe answer — each one is noted in your story), and a debug *undo last year*.

## Architecture

```text
/src
  core/        Engine (bus, modules, guards, prompts, slots, undo) · State (slices, selectors, Store)
               Migrations (save upgrades) · Pools (non-repeating event picks) · Routine · Random
  modules/
    registry.js
    economy/         EconomyEngine (business cycle, markets, inflation, rates)
    life/            Lifecycle · LifeEvents · States (taxes, laws, disasters) · Regions (relocation) · Disasters · Finances · Activities
    investing/       Assets · Brokerage (accounts, IRAs, auto-invest)
    health/          Conditions · Insurance · HealthEngine (PTSD, addiction, disability, VA)
    campus/          UniversityLife · HousingDorms · Internships · Rotc · Network
    education/       Catalog (schools, programs, majors) · EducationEngine (admissions, aid, GI Bill)
    credentials/     CredentialRegistry (every license/cert, one place) · LicensingEngine
    career/          JobTrees · Ladder (IC/mgmt tracks, abilities) · PayGrades (G1–G10, steps)
                     Employers (size, benefits, budgets, unions) · Compensation · CareerEngine
                     InterviewSystem · WorkplaceActions · WorkplaceEvents · ManagementEngine · ContractingSystem · UnionsAndLabor
    publicservice/   PublicServiceEngine (exams, clearances) · MunicipalGov · StateAgencies · FederalAgencies
    org/             Organizations: every employer and every business is one — OrgTypes (departments → careers)
                     Organizations (persistent orgs, named people, chain of command) · Vacancies (seats, openings, contests)
                     Reentry (time away, rehire standing, internal moves) · Supervision (powers over named reports)
                     Government (elected/appointed heads, a player-official's appointments) · Churn (hiring, attrition, boomerangs)
                     Businesses (player and NPC businesses as orgs: owner seat, growth layers, branches, rivals, exits)
                     Executives (department/organization head posts, appointments, executive search)
                     ElectedOffices (sheriff, DA, county chair, city manager run their organizations)
                     MilitaryUnits (units, billets, command boards) · VolunteerOrgs (seats, elected chiefs)
    business/        BusinessTypes (career → business config, sizes) · OwnershipRules (who may own/run what)
                     BusinessLicenses (operating licenses & permits) · Advisor (forecast, profit suggestions)
                     Business (P&L, valuation) · BusinessEngine · OwnerActions (people, policy, deals) · Franchising
    politics/        Offices · Campaigns · PoliticsEngine (elections, terms, appointments, scandals)
    realestate/      HousingEngine · PropertyMarket · MortgageSystem · Maintenance · Landlording
    legal/           Offenses · JusticeSystem (courts, prison, immunity) · Misconduct (temptations, risky acts)
    retirement/      PensionPlans · RetirementEngine (pensions, 401k/TSP, Social Security)
    military/        MilitaryEngine · ActiveDuty · Reserves · MedalEngine · MOS · Separation
                     SpecialOps (selection pipelines) · UCMJ (Article 15s, courts-martial, the brig)
                     MilitaryLife (overseas tours, fitness reports & BTZ, BRS, GI Bill transfer, recall)
    emergency/       EmergencyEngine · FireVolunteer · PoliceReserves · SearchAndRescue · …
    service/         NationalService (AmeriCorps, Peace Corps) · StateForces (Guard state activations,
                     State Defense Forces) · DisasterTeams (FEMA reservists, DMAT) · VeteranPosts (VFW, Legion)
  ui/          Components · Renderer · views/ (one file per tab)
tests/         scenarios · simulate (randomized lives + render every tab) · saves (+ fixtures/ from past versions)
               content (pool lint) · balance (persona lives vs. real-world bands) · business (business outcomes)
               careers (career ↔ credential audit) · orgs (organizations) · businessorgs (businesses as organizations)
               orgfuzz (random lives checking organization invariants) · executives (head posts & executive search)
               military (units, special ops, UCMJ, tours, boards) · service (volunteer orgs, national & state service)
               clearances (cleared pay, recruiters, sponsorship, lapse) · intel (polygraph, cover, stations, ops)
               newcareers (program → credential → job for newer careers)
```

Modules mutate only their own slice; cross-domain effects travel over the bus
(`career:resign`, `budget:charge`, `legal:convicted`, `credential:earned`,
`retirement:addPension`, `region:relocate`, …). The `guard` hook lets a module block
actions (e.g. while incarcerated).

## Systems

- **Careers:** 48 professions across private, municipal, state and federal sectors. Ladders vary in length, fork into specialist and management tracks, and bigger employers expose more levels. Pay uses G1–G10 grades × steps × employer size × regional market/locality × merit. Levels grant abilities (supervise, sign, inspect, arrest, diplomatic…). Sustained low ratings demote before they fire; senior promotions plateau after three pass-overs.
- **Management:** departments with morale/productivity/budget; delegate hiring, reviews and scheduling at an overhead cost; direct staff vs. mixed vs. contractors; vendor renewals.
- **Unions:** join/leave, dues, grievance protection, contract votes, strikes (picket or cross), no-strike arbitration, wildcat sick-outs; as a manager, organizing drives (union-busting can be an unfair labor practice) and labor disputes.
- **Credentials:** one registry (driving/CDL, pilot ratings with a flight logbook, healthcare, fire/police/SAR, bar, CPA, PE, teaching, trades, corporate/internal, government). Employers, agencies and volunteer units pay from annual training budgets; police/fire/EMS/federal/airline academies are employer-funded. Renewals, suspensions (DUI) and revocations (felonies).
- **Education:** certificates, trade diplomas, community college, online/state/private/elite universities, master's/MBA/MPA, law, medicine, PhD. Admissions odds, part-time study, transfer credit, multiple degrees, need-based aid, employer tuition assistance, GI Bill.
- **Public service:** civil-service exams with veterans' preference, SF-86 clearances (honesty matters), city budgets and approval, federal stability and shutdowns, Foreign Service postings with hardship/danger pay and diplomatic immunity, park rangers with rural housing.
- **Legal:** risky behavior, job-specific temptations, delayed investigations, courts with plea/defense choices, probation, prison life, immunity (which never covers crimes against the U.S.).
- **Retirement:** FERS, municipal, police & fire (no Social Security), teachers, union and corporate pensions with vesting and deferred annuities; 401(k)/403(b)/457/TSP with match; Social Security; military retired pay, VA disability, Medal of Honor pension.
- **States:** 11 states and 12 regions with state income tax (none in TX/FL/WA), property and sales tax, right-to-work, cannabis law, DUI penalties, minimum wage and disaster profiles. State-issued licenses are valid only where issued; moving triggers reciprocity (automatic transfer, the Nurse Licensure Compact, bar admission by motion after 5 years, reciprocity exams, or starting over). Public universities charge out-of-state tuition for the first year of residency.
- **Mobility:** moving handles your lease and your home (sell, rent it out, or keep it empty); active duty gets PCS orders every ~3 years with base housing; big employers attach relocations to senior promotions; remote pay is geo-adjusted; state pensions freeze as deferred annuities.
- **State government:** State Police, Corrections, Revenue (catches tax cheats), CPS, Game Warden, Environmental Quality, Forestry, DOT, Courts, District Attorney, Public Defender, Legislative staff and public-university faculty (with tenure). Uses the State Civil Service Exam and the SERS or police & fire pension. Top posts are gubernatorial appointments. The Army National Guard is the state reserve component, activated by the governor for disasters.
- **Politics:** City Council → Mayor / State Rep → State Senate → U.S. House → Governor / U.S. Senate, plus judgeships (by election or appointment). Campaigns run on fundraising, endorsements, canvassing and debates. Primaries, incumbents, term limits, approval, floor votes and executive decisions; legislative salaries and an elected-officials pension. Scandals come from your legal record, and corruption runs through the misconduct system.
- **Disasters:** hurricanes, wildfires, floods, blizzards and earthquakes by state. They damage property (standard policies exclude floods and earthquakes), call out volunteer fire and SAR, activate the Guard, strain city budgets and test governors and mayors.
- **Housing:** parents, renting, owning, employer- or military-provided housing, incarceration, or homelessness, with eviction and voucher safety nets. Regional markets have boom/bust cycles; listings range from condos and fixer-uppers to rural acreage, luxury homes and fourplexes. Credit score runs 300–850. Loans: 30/15-yr fixed, 5/1 ARM, FHA and VA, with DTI and reserves underwriting, PMI, amortization, delinquency leading to foreclosure, refinancing and HELOCs. Also property tax, disaster-priced insurance, HOA fees, repairs (DIY discount for the trades), renovations and flipping, tenants, vacancies and evictions, and an optional property manager. Mortgage fraud and insurance arson are possible crimes.
- **Military & emergency reserves:** as in Step 1, now wired into credentials, pensions, health and the legal system.
- **Military depth:** seven branches including the Space Force; units with a named chain of command and selection boards for command; special operations pipelines (Ranger, Green Beret, SEAL, Pararescue, Raider, Space Force orbital warfare); military justice (Article 15s, courts-martial, punitive discharges, the brig); overseas tours with family and spouse-career effects; fitness reports and below-the-zone promotion; the Blended Retirement System, GI Bill transfer and retiree recall.
- **Service beyond a job:** Guard state activations (disasters, unrest, border missions) and State Defense Forces; AmeriCorps and the Peace Corps (stipends, education awards, federal hiring eligibility); FEMA reservists and DMATs; elected volunteer fire chiefs and squad captains; VFW and American Legion posts; JROTC and Sea Cadets; private military contracting.
- **Economy:** expansion → peak → recession → recovery (a recession about every 10 years) drives stock and bond returns, unemployment, layoffs, interest and mortgage rates, inflation and COLAs, home prices and public budgets. All money is in today's dollars.
- **Investing:** brokerage (index, bonds, T-bills, crypto, sector stocks), Roth and Traditional IRAs, risk profiles, auto-invest that also sells to clear card debt, 0/15/20% long-term capital-gains rates, meme stocks and pump-and-dumps, insider trading disgorged on conviction; 401(k)/TSP fund choice and contribution rate.
- **Health:** chronic, mental-health, addiction and acute conditions that start, get diagnosed (checkups catch silent ones), are treated or not, and drive named causes of death. Coverage by circumstance (employer, TRICARE, parent's plan, Medicare, Medicaid, marketplace, uninsured) with deductibles and out-of-pocket maximums; medical debt → collections → bankruptcy. PTSD from combat, emergency calls and first-responder/CPS work; addiction → DUIs, license suspensions, rehab; fitness-for-duty evaluations; disability insurance, SSDI, disability retirement and VA ratings.
- **Campus:** dorms, Greek life, clubs, student government, varsity sports and scholarships, parties, academic/disciplinary probation, plagiarism and expulsion, honors college, study abroad, internships with mentors and return offers, ROTC and the service academies.
- **Life events:** 200+ events across 35 pools — childhood moments and dilemmas, workplace and agency events, dispatches, combat, campus, and random life (lotteries, lawsuits, viral fame, accidents, scams, inheritances). Pools avoid recent repeats.

## Balance

`tests/balance.js` plays thousands of complete lives with plausible personas (careers weighted by real employment shares) and checks the results against U.S. reference figures: life expectancy, pay at 40 by career, employment, degree attainment, homeownership and first-home age, foreclosure, homelessness, felony and prison rates, bankruptcy, recession frequency, unemployment, retirement age, DB pensions, net worth and millionaire share near retirement, supervision, veterans and PTSD — plus how often story events repeat.

## Roadmap

- **Step 4E–4G (not built yet):** people and relationships, family finances, children and legacy ("continue as your child"); businesses; achievements, Hall of Fame and challenge modes.
