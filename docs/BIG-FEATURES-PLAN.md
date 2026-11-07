# Big features plan

Ten large additions, built in four batches. Each item notes what already exists so it
extends rather than duplicates, the state it adds, the modules and screens it touches, and
how it is tested. Every batch ends with the fast suite, a fuzz run and the abroad sweep.

Order: **A** people (3, 4, 5) → **B** world (1, 2) → **C** gameplay (6, 7, 8) → **D** big systems (9, 10).

---

## Batch A — People

### 3. Rival lives
**Exists:** NPCs with jobs, homes and net worth (`people/NpcLives.js`); friends, exes, coworkers.
**Build:** 2–4 named *rivals* picked from people who matter: a school rival, an ex's new partner,
a coworker passed over for your promotion, a business competitor. Each has a running life
(career rung, wealth, fame, family) that advances yearly alongside yours.
- **Crossings:** competing for the same promotion, contract, election or partner; a rival's
  company bids against yours; reunion one-upmanship; a rival's downfall you can help or exploit.
- **Arc:** grudge 0–100. It cools with time or reconciliation, and can flip to friendship or into a feud
  (sabotage, lawsuits, gossip that hits your reputation from item 5).
- **State:** `state.rivals = [{ personId, origin, grudge, life: {...}, history: [] }]`
- **Module:** `people/Rivals.js` (order after NpcLives). **UI:** a "Rivals" card on People.
- **Tests:** a rival appears from each origin; a crossing resolves both ways; a feud escalates and ends.

### 4. Generational families
**Exists:** children, grandchildren (`Dynasty.js`), heirs and estate (`Legacy.js`), parenting,
inheritance tax, family businesses passed to an heir.
**Build:**
- **Family tree** across lives: every generation played, with spouses, children and grandchildren,
  shown as a collapsible tree (`state.family.lineage` carried into the heir's state).
- **Reunions and feuds:** yearly family events; siblings and cousins fall out over care of a parent,
  money lent, or a will. Feuds persist until mended.
- **Inheritance fights:** a contested will, a disinherited child who sues, a stepfamily's claim
  (builds on `FamilyCourt.js`).
- **Family business through generations:** the founder's name, years in the family and a
  "third generation" risk (heirs who don't want it).
- **Family fortune and name:** a dynasty score (wealth, honours, fame across generations) on the
  Hall of Fame.
- **Modules:** extend `Dynasty.js` and `Legacy.js`; new `people/FamilyFeuds.js`. **UI:** a family tree on People.
- **Tests:** lineage survives three heirs; a contested will settles; the family business passes twice.

### 5. Reputation by circle
**Exists:** one central fame score (`Fame.js`), scandals, celebrity, neighbourhood standing,
professional standing in some careers.
**Build:** separate reputations, 0–100, in five circles: **work**, **neighbourhood**, **online**,
**underworld** and **family**. Events raise or lower specific circles; scandals *spread* from
one circle to others with a chance based on fame and the media.
- **Effects:** work reputation affects hiring and promotion odds; neighbourhood affects elections
  and HOA/council roles; underworld affects outfit trust and rank; family affects care and
  inheritance; online affects audience careers and cancellations.
- **State:** `state.reputation = { work, neighbourhood, online, underworld, family }`
- **Module:** `life/Reputation.js` with a `rep(ctx, circle, delta, why)` helper that other
  modules call. **UI:** a reputation strip on the Life tab.
- **Tests:** each circle moves; a scandal spreads; hiring odds respond.

---

## Batch B — World

### 1. Living cities
**Exists:** regions with cost of living, population size, rural/urban, disasters, local
services, crime levels in places, neighbourhoods, house price index per region.
**Build:** each city gets dynamic stats, `{ population, crime, jobs, prices, mood, politics }`,
that drift yearly and respond to:
- the economy and disasters (already modelled);
- **you**: a business you expand (jobs up), a police force you run (crime down), council
  policies you pass, a property empire (rents and prices);
- migration between cities (people follow jobs and cheap housing).
Effects feed back into job availability, house prices, crime events and election moods.
- **State:** `state.world.cities[regionId]`
- **Module:** `life/Cities.js`. **UI:** a "Your City" card on Home → Move, with a trend line.
- **Tests:** a city's stats move with the economy; a player action shifts them; feedback hits jobs and prices.

### 2. News feed
**Exists:** log lines for economy phases, wars, disasters, elections and scandals, scattered
across modules.
**Build:** a yearly **front page** with three tiers (world, national, local). It collects the year's
big events, which modules raise through a bus event (`news:story`, with tier, headline and weight),
plus generated filler (sports results, celebrity news, local fires). You appear when you're
newsworthy (fame, office, scandal, record wins).
- **Reactions:** famous NPCs and rivals (item 3) react, and some stories become prompts
  (invest after a boom headline, protest after a law).
- **State:** `state.news = [{ year, stories: [...] }]`, trimmed to the last 30 years.
- **Module:** `life/News.js`. **UI:** a "Front Page" card at the top of Story each year.
- **Tests:** each tier fills; your own scandal reaches the front page; the archive stays bounded.

---

## Batch C — Gameplay

### 6. Time budget
**Exists:** yearly action limits scattered across modules (`yearlyCount`), activities, hobbies,
side jobs, overtime and family time.
**Build:** a single **weekly hours budget** (168 hours, minus sleep and your job's hours) split
across **work extra**, **family**, **health**, **learning**, **hobbies** and **side hustles**,
set with sliders. Each bucket gives a steady yearly effect, so yearly clicks become unnecessary:
- overwork raises pay and promotion chances but builds burnout (a new stress track);
- family time builds relationships; health time adds fitness; learning time builds skills (item 7).
- **Burnout:** high hours for years lead to health events, mistakes at work and relationship strain.
- **State:** `state.time = { buckets: {...}, burnout }`
- **Module:** `life/TimeBudget.js`. **UI:** sliders on Life → Activities.
- **Tests:** each bucket moves its stat; burnout rises and recovers; the old action limits keep working.

### 7. Skills
**Exists:** stats (smarts, looks, fitness), credentials, languages, hobby levels and job
performance.
**Build:** about 30 skills, each 0–100: coding, negotiation, leadership, cooking, driving, public
speaking, writing, mechanics, first aid, combat, languages (folded in), finance, sales, design,
music, sport and more. They grow from practice: the job you do, the time budget, courses and hobbies.
- **Uses:** job hiring and performance read relevant skills; events get skill checks (first
  aid saves a life, negotiation wins a raise); skills unlock options in prompts.
- **State:** `state.skills = { [id]: level }`
- **Module:** `life/Skills.js` with `skill(state, id)` and `practise(ctx, id, amount)`; careers
  map professions to skills. **UI:** a Skills card on School.
- **Tests:** practice raises a skill; a skill check changes an outcome; hiring odds respond.

### 8. Health month by month
**Exists:** conditions, genetics, screening, insurance, health systems, mental health,
recovery from addiction and disability benefits.
**Build:**
- **Routine:** diet, exercise and sleep settings (via the time budget) move health monthly,
  showing a 12-month sparkline;
- **Addiction arcs:** use → dependence → crisis → treatment → relapse risk, for alcohol, drugs,
  gambling and gaming (builds on `Recovery.js`);
- **Disability and adapted careers:** lasting injuries or illness limit which jobs you can do,
  with adapted roles, accommodations and retraining.
- **Module:** extend `health/` (`Routine.js`, `Addiction.js`). **UI:** routine controls and the sparkline on Health.
- **Tests:** a poor routine lowers health; an addiction runs its arc; a disability changes job eligibility.

---

## Batch D — Big systems

### 9. Running a country
**Exists:** head of state and government careers, ministers, cabinets, budgets, laws,
legislatures, coalitions, state visits, statecraft (capital, initiatives, scandals,
challenges), elections and coups.
**Build** a **government desk** for the head of government:
- **Budget:** a yearly split across health, education, defence, welfare and infrastructure,
  plus tax rates, the deficit and debt (builds on `Budgets.js`);
- **Approval:** driven by the economy, crises and policy, by demographic group;
- **Crises:** pandemics, wars, market crashes, disasters and strikes, each a multi-step decision;
- **Diplomacy:** alliances, trade deals and sanctions with named countries;
- **Lasting effects:** laws and budgets persist into the world, so your heir lives in the country you shaped.
- **Module:** `politics/GovernmentDesk.js`. **UI:** a "Government" view under Work → Politics.
- **Tests:** a budget changes approval and the services; a crisis resolves; a law outlives your term.

### 10. Crime empire
**Exists:** outfits and underworld membership, ranks, turf, drugs, gangs, corruption,
white-collar crime, laundering through businesses, informants and cases, prison.
**Build** a **boss track** for the head of an outfit:
- **Territory map:** districts of your city with control, income and heat; take, hold or lose them;
- **Rackets:** drugs, gambling, protection and smuggling, each with its own risk and income;
- **Laundering:** through your legal businesses (item 1's cities and your companies);
- **Rival families:** wars, truces and alliances; NPC capos with loyalty;
- **The law:** informants, task forces and RICO-style cases;
- **Endgame:** prison, a violent death, witness protection, or going legitimate.
- **Module:** `crime/Empire.js`. **UI:** an "Empire" view under Legal → Underworld.
- **Tests:** territory changes hands; laundering cleans money; a task force builds a case; going legit works.

---

## Shared rules
- New state is created lazily and read safely by views (views never mutate).
- Side RNG for new yearly ticks so existing seeded tests stay stable.
- Everything is localized: abroad sweep (`tests/abroad.js`) after each batch.
- Old saves load (`tests/saves.js` renders every tab after migration).
- One test file per batch: `tests/people2.js`, `tests/world2.js`, `tests/gameplay.js`, `tests/bigsystems.js`.
