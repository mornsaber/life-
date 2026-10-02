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
  core/
    Engine.js        Event bus, module registry, age-up loop, action dispatch, decision queue
    State.js         State shape, LocalStorage persistence, shared selectors/mutators
    Random.js        Seedable PRNG + gameplay helpers
  modules/
    registry.js      The list of modules the engine runs
    career/          JobTrees · CareerEngine · InterviewSystem · WorkplaceActions · index
    military/        MilitaryEngine · ActiveDuty · Reserves · MedalEngine · index
    emergency/       EmergencyEngine · FireVolunteer · PoliceReserves · SearchAndRescue
    education/       EducationEngine (Step 1 preview: degrees for gated careers)
    life/            Lifecycle (aging, stress, death) · Finances (tax, costs, debt) · Activities
  ui/
    Components.js    Pure HTML-string view helpers (stat bars, rank badges, ribbons, modal, tombstone)
    Renderer.js      DOM driver: tabs, toasts, re-render on every change
  index.js           Entry point and the single delegated input handler
```

### Module contract

```js
{
  id: 'career', order: 30,
  setup(engine) {},          // subscribe to bus events
  init(state) {},            // migrate/ensure this module's state slice
  onAgeUp(ctx) {},           // yearly simulation
  onYearEnd(ctx) {},         // runs after every module's onAgeUp
  actions:   { apply(ctx, arg) {} },                 // engine.dispatch('career.apply', 'tech')
  resolvers: { interview(ctx, data, optionId) {} },  // decisions of type 'career.interview'
}
```

`ctx` exposes `state, rng, log, toast, stat, earn, spend, prompt, emit, die`. Each module mutates only its own slice of state. It can read other slices through the selectors in `State.js`, and it reaches other domains through bus events. For example, enlisting on active duty emits `career:resign`. Decisions are stored in state as plain data, so a pending choice survives a page reload.

Each year runs in this order: life → activities → education → military → career → emergency → finances. The military tick runs before career, so a mobilized reservist's civilian job sees that year's deployment (the job is protected under USERRA).

## Systems

- **Career:** 11 professions, each with a 7-tier ladder (Jr. Analyst → CEO, QA Tester → CTO, Medical Resident → Chief of Medicine, Police Recruit → Chief of Police, and more). Some tiers require a specific degree. A yearly performance review (0–100%) weighs smarts or fitness, your relationship with your boss, effort, stress and how many other commitments you carry. Scoring 75% or more triggers an interactive promotion review. Low scores bring warnings and then termination. Hiring is a scenario-based interview followed by a salary negotiation, and veterans, volunteer responders and decorated candidates get a hiring bonus. Pay includes a 401(k) with employer match, and income tax uses progressive brackets.
- **Military:** 5 branches with real rank names (E-1 to E-9, and O-1 to O-10 for officers, which requires a degree). Six specialties set your combat exposure. Active duty and Reserve service both work: you can switch between them, apply to OCS, request a deployment and re-enlist for a bonus. Promotion boards check time in grade and your evaluation, and the general and flag-officer boards are very selective. Combat and garrison decisions decide wounds and valor. The medal engine awards Medal of Honor, Service Crosses, Silver Star, Bronze Star with "V", Purple Heart, commendations and service medals. Medals add prestige and multiply your pension. Retirement pay starts at 20 years of service; for Reserve retirees it starts at age 60.
- **Emergency reserves:** Volunteer Fire, Police Reserves and Search & Rescue each have 7 ranks, plus certification trees (EMT, HazMat, Rope Rescue, K9 Handler with a dog partner, Command College, and others). Each year brings drills, a volume of calls and interactive dispatches. Some choices are locked until you hold the right certification. Services pay you civil awards for valor and lifesaving. These memberships are paused while you're on active duty or deployed.
- **Life:** stats, aging, stress driven by your total time commitments, mortality, cost of living, student loans, credit-card debt and bankruptcy, and yearly activities.

## Roadmap

- **Step 2:** full `/education` (UniversityLife, HousingDorms, Internships that let you skip entry tiers)
- **Step 3:** `/realestate` (PropertyMarket, MortgageSystem, Maintenance)
- **Step 4:** `/relationships` (Dynamics, Interactions)
