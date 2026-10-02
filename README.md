# LIFE//SIM

A deep, text-based life simulator inspired by BitLife. It adds 7-tier career ladders, military service with a medal engine, volunteer and reserve emergency services that run alongside your day job, and (coming next) higher education and real estate.

Pure ES modules, zero dependencies, no build step. Every click updates the screen right away, with no added delay.

## Run it

```bash
npm start        # → http://localhost:8080
npm test         # headless: simulates 300 full lives and checks state invariants
```

You need Node 18+ for the dev server and the tests. The browser won't load ES modules over `file://`, so you need some local server; any static server works.

**Controls:** click, or press **Space/Enter** to age up and **1–9** to pick a choice in a decision.

## Architecture

```text
/src
  core/        Engine (bus, modules, guards, prompts) · State (slices, selectors) · Random
  modules/
    registry.js
    life/            Lifecycle · States (taxes, laws, disasters) · Regions (relocation) · Disasters · Finances · Activities
    education/       Catalog (schools, programs, majors) · EducationEngine (admissions, aid, GI Bill)
    credentials/     CredentialRegistry (every license/cert, one place) · LicensingEngine
    career/          JobTrees · Ladder (IC/mgmt tracks, abilities) · PayGrades (G1–G10, steps)
                     Employers (size, benefits, budgets, unions) · Compensation · CareerEngine
                     InterviewSystem · WorkplaceActions · ManagementEngine · ContractingSystem · UnionsAndLabor
    publicservice/   PublicServiceEngine (exams, clearances) · MunicipalGov · StateAgencies · FederalAgencies
    politics/        Offices · Campaigns · PoliticsEngine (elections, terms, appointments, scandals)
    realestate/      HousingEngine · PropertyMarket · MortgageSystem · Maintenance · Landlording
    legal/           Offenses · JusticeSystem (courts, prison, immunity) · Misconduct (temptations, risky acts)
    retirement/      PensionPlans · RetirementEngine (pensions, 401k/TSP, Social Security)
    military/        MilitaryEngine · ActiveDuty · Reserves · MedalEngine
    emergency/       EmergencyEngine · FireVolunteer · PoliceReserves · SearchAndRescue
  ui/          Components · Renderer · views/ (one file per tab)
tests/         scenarios.js (deterministic mechanics) · simulate.js (randomized lives + render every tab)
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
- **Military & emergency reserves:** as in Step 1, now wired into credentials, pensions and the legal system.

## Roadmap

- **Step 4:** `/relationships` (Dynamics, Interactions)
