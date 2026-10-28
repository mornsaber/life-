# System roadmaps

One roadmap per system: what it does today, where it is thin, and what to build next. Each roadmap
has three horizons:

- **Next**: small, high value; a session or less.
- **Later**: medium; needs design or touches other systems.
- **Someday**: large or speculative.

Systems are grouped the way the code is (`src/modules/<folder>`). `docs/NEXT-EXPANSIONS.md` holds
the cross-cutting phases already finished.

---

## 1. Life core: ageing, stats, events, activities (`life/`)

**Today.** Six stats, yearly ageing and mortality, hundreds of life events with follow-ups, six
once-a-year activities, regions and rural life, achievements, and a yearly housekeeping pass.

**Gaps.**
- Activities are one-click stat buttons with no skills that grow.
- No hobbies, pets or bucket list.
- Events rarely remember earlier choices beyond one follow-up.

**Next**
- Hobbies and skills: instrument, sport, cooking, art, chess, coding, gardening. Levels, practice
  time, competitions, side income, and links into the music, sport and content-creation careers.
- Pets: adopt, vet bills, happiness, ageing and death, and who keeps the pet after a divorce.

**Later**
- A bucket list and life goals scored at death, and shown in the Hall of Fame.
- An event memory: long-running threads such as a feud, a debt or a secret that resurface years
  later.

**Someday**
- A daily-life schedule (hours for work, family, sleep and hobbies) that replaces some
  once-a-year buttons.

## 2. Money: finances, taxes, credit, bankruptcy (`life/Finances`, `Taxes`, `CreditCards`, `Bankruptcy`)

**Today.**
- Lifestyle spending, US and national tax systems, credit cards and scores, and student loans.
- Chapter 7 and Chapter 13 bankruptcy, now with its debt limit.

**Gaps.**
- Bankruptcy is slightly above the real rate: 18–19% of adults file, against 10–15% in reality.
- Card and medical debt pile up for low-income lives without warning.
- No budgeting choices.

**Next**
- Tune the balance harness: a debt-management plan or settlement offer before filing; medical
  charity care and payment plans; spending that cuts back faster under card debt.
- A simple budget: frugal, normal or lavish, with the trade-offs shown.

**Later**
- Payday loans and buy-now-pay-later as risky options.
- Financial literacy as a learned skill.

**Someday**
- Household finances shared with a partner: joint accounts, prenups, financial abuse.

## 3. Economy (`economy/`)

**Today.**
- Business cycles, black swans, inflation, rates and market returns.
- Feeds jobs, property, budgets and pensions.

**Gaps.** You only react to it; there are no choices.

**Next**
- Recession choices: retrain, relocate, take a pay cut, or buy assets cheap. A downturn card
  explains what is happening.

**Later**
- Regional economies (a factory town's plant closes) and sector shocks that hit specific careers.

**Someday**
- Country economies that diverge (a currency crisis in one country) and affect remittances and
  expats.

## 4. People, family and relationships (`people/`)

**Today.** Partners, romance, children, friends with circles, elder care, NPC lives, dynasty
traits, estate planning, legacy and continue-as-child, and a family tree with ancestors' careers.

**Gaps.** Little IVF, surrogacy or twins; grown children's milestones are thin; blended
families are basic.

**Next**
- Fertility: trying, IVF, surrogacy, adoption waits, twins.
- Grown children's big moments as events you take part in: weddings, grandchildren, crises.

**Later**
- Blended families: step-children, custody schedules, co-parenting conflict.
- In-laws as people with their own lives.

**Someday**
- Play a family across branches: switch to a sibling's line, not only your children.

## 5. Health (`health/`)

**Today.** Conditions with care plans, mental health, health systems by country, insurance, SSDI,
and VA ratings.

**Gaps.** Lifestyle choices are shallow: diet, smoking and quitting, alcohol, cosmetic surgery,
tattoos.

**Next**
- Habits: smoking, drinking and diet as ongoing states with quitting attempts, relapses and
  long-term risk.

**Later**
- Cosmetic procedures, tattoos and fitness programmes.
- Genetic risk inherited down the family tree.

**Someday**
- Pandemics that touch the whole world (careers, schools, travel).

## 6. Education (`education/`, `campus/`)

**Today.** K-12 school types, named universities with real admissions, campus life, ROTC,
internships, professional schools, and national school paths abroad.

**Gaps.** Little teaching-side interaction with your own schooling (classes, grades, clubs) after
high school; adult education is thin.

**Next**
- Clubs and leadership in college: student government, newspaper, varsity sport. These feed
  careers and the sport system.

**Later**
- Adult learning: night school, online degrees, apprenticeships at 40, and study for the love of
  it in retirement.

**Someday**
- Studying abroad in depth: semester exchanges, Erasmus, foreign degrees' recognition at home.

## 7. Careers: framework and engines (`career/`, `career/engines/`)

**Today.**
- 164 careers, nearly all on yearly engines: shifts, caseloads, clients, projects, seasons,
  audiences, routes, diplomacy, trades, and the new missions engine.
- Organisations with units, vacancies and supervision; unions; pay grades; job markets.

**Gaps.**
- Some engines' decks are small, so they repeat over a long career.
- Office relationships (a mentor, a rival, a boss) are generic.

**Next**
- Double the decks of the smallest engines.
- Make the missions engine's longer storylines available to more careers: a case for
  prosecutors, a programme for consultants.

**Later**
- Named colleagues: a mentor who helps you up, a rival who blocks you, a boss who changes.

**Someday**
- Career moments with consequences for the whole organisation, such as a merger you lead or a
  scandal you blow the whistle on.

## 8. Business (`business/`, `org/Businesses`)

**Today.**
- Businesses as organisations, with types, staff, assets, capital and regulation.
- Holding companies, conglomerates, boards, franchising and rivals.

**Gaps.**
- Marketing and product choices are abstract.
- Business failure is mostly financial, not personal.

**Next**
- Product and marketing decisions with clear trade-offs (a launch, a recall, a viral moment).

**Later**
- A founder's personal toll: burnout, a partner who leaves, a cofounder dispute.
- Laundering-front risk for underworld-linked businesses (see §17).

**Someday**
- An international business: subsidiaries abroad, transfer pricing, sanctions exposure.

## 9. Housing and property (`realestate/`)

**Today.** Renting, buying, mortgages, landlording, construction, maintenance and a property
market by city.

**Gaps.** Neighbourhood character and moving within a city are thin.

**Next**
- Neighbourhoods within a city (school catchments, crime, commute) that feed schools, crime and
  happiness.

**Later**
- Housing crises: rent control, evictions, gentrification as local politics.

**Someday**
- Property development at scale, as a business line.

## 10. Military (`military/`)

**Today.**
- Every branch at home and abroad, with schools, special operations, assignments and command.
- Wars, peacekeeping, foreign legions, Gurkhas and royal guards.
- Transition to civilian life, and retirement with the retired list and recall.

**Gaps.**
- Families' side of service (deployment strain, moves) is light.
- Military retirees' second careers are generic.

**Next**
- Family under deployment: a spouse's job lost to a move, children changing schools, homecoming.
- Retiree second careers (defence contractors, JROTC instructors) through the recall and veteran
  systems.

**Later**
- Joint and allied postings: NATO headquarters, exchange officers, a combined command.

**Someday**
- Military history as memory: unit reunions, battlefield returns, memoirs.

## 11. Policing, fire, EMS and emergency services (`publicsafety/`, `ems/`, `emergency/`, `service/`)

**Today.**
- Police, fire and EMS lives, and volunteer agencies that grow.
- Disaster teams, national service and veteran posts.

**Gaps.**
- Cross-agency major incidents happen, but long investigations end to end are rare.
- Police aren't yet tied to the organised-crime world, apart from the new case prompts.

**Next**
- Police organised-crime units that target the city's outfits as a running investigation
  (see §17).

**Later**
- Police accountability: body cameras, civilian oversight, consent decrees as politics.

**Someday**
- Regional emergency mutual aid across countries (Canadian firefighters in Australia).

## 12. Justice and the courts (`legal/`, `law/`)

**Today.**
- Charges, staged felony cases, prisons, clemency and civil courts.
- Courts abroad and judicial careers.
- Street crime and, now, organised crime.

**Gaps.**
- Appeals are short.
- Life after prison (parole conditions, reentry jobs) is thin.

**Next**
- Reentry: parole conditions, halfway houses, ban-the-box jobs, expungement paths.

**Later**
- Wrongful convictions and innocence projects; long appeals that can take years.

**Someday**
- Juries in depth when you serve on one: deliberations and holdouts.

## 13. Politics and government (`politics/`, `publicservice/`, `org/Government`)

**Today.**
- Elections at every level and legislatures with bills.
- Budgets and public services, executives, statecraft (capital, legacy, scandals, challenges,
  impeachment), appointees and party states.

**Gaps.**
- Foreign policy for heads of government is thin.
- Coalition-building in parliaments is simple.

**Next**
- Coalition governments: negotiating with partners, confidence votes, collapses.

**Later**
- Foreign policy for leaders: summits, treaties, sanctions you impose, wars you decide.

**Someday**
- Long-run national outcomes (debt, growth, approval) that a legacy is judged against.

## 14. Countries, migration and travel (`world/` country packs, `Migration`, `Immigration`, `Travel`)

**Today.**
- 94 playable countries with their own laws, agencies, forces, schools and pensions.
- Migration, visas, citizenship, refugees and travel by passport.

**Gaps.** The less-developed packs reuse base-country tables; diasporas are thin.

**Next**
- Deepen the ten most-played packs with local careers and events (the scans in `packs.js` show
  the gaps).

**Later**
- Diaspora communities: remittance networks, hometown associations, return migration.

**Someday**
- Country histories that change in play (independence, unions, collapses).

## 15. Royalty, nobility and honours (`world/Crown`, `Houses`, `Nobility`, `Peerage`, `Honours`, `RoyalLife`, `Sovereign`, `StJohn`)

**Today.** Born royal, the sovereign's powers and diary, estates, consent, houses and
restorations, the monarchy question, peerages, orders of chivalry and the Order of St John.

**Gaps.** Royal marriages between houses and the royal press as a running relationship.

**Next**
- Dynastic marriages: matchmaking between houses, alliances, the cost of marrying for love.

**Later**
- The royal press as a relationship: friendly papers, hostile papers, a press secretary.

**Someday**
- Abdication crises and regencies played out over several years.

## 16. Faith and the Church (`community/`, `world/HolySee`)

**Today.**
- Congregations and holy orders, plus clergy careers with congregations of their own.
- Religious orders (Jesuits, Opus Dei, Missionaries of Charity).
- The Holy See, the papacy and the Vatican's guards.

**Gaps.** Other faiths' institutions (rabbinate, ulema, sangha) are less detailed than the
Catholic Church.

**Next**
- Equivalent depth for other faiths' clergy: ordination paths, institutions, schisms.

**Later**
- Interfaith work and religious freedom abroad as events.

**Someday**
- Founding a movement or a new congregation.

## 17. Organised crime (`legal/Underworld`)

**Today.**
- Outfits by country (family, clan, gang, cartel, triad, yakuza, bratva, motorcycle club, firm).
- Ranks, rackets, tribute and skimming, crews, laundering and wars.
- Task forces, informants and witness protection.
- Bosses' policy and corruption; prison gangs; police cases against outfits.
- A family connection for heirs.

**Gaps.**
- International trafficking routes.
- A rival's leadership as named people.
- Running a front business as a proper business.

**Next**
- Named rival bosses and underbosses who rise, fall, and remember you.
- A front business: a restaurant or car wash that is a real business and launders money.

**Later**
- International routes: ports, borders and partner outfits abroad, connected to the shipping and
  migration systems.
- Police organised-crime units running the other side of the same outfits (see §11).

**Someday**
- Politics captured by organised crime: bought councillors and mayors, and the reckoning.

## 18. International organisations and diplomacy (`world/IntlOrgs`, `career/IntlOrgCareers`, `engines/Missions`, `engines/Diplomacy`)

**Today.**
- UN, EU, NATO, World Bank/IMF, international courts, ICRC and Malta organisations, with
  rotation and top appointments.
- The new missions engine (cases, programmes, field files); the Foreign Service with cones and
  posts.

**Gaps.** Organisation-wide crises (a UN funding cut, a NATO enlargement) aren't events yet.

**Next**
- Organisation-wide events that touch every member's career: budget cuts, scandals, reforms.

**Later**
- Multilateral negotiation as a playable set piece: a climate summit, a treaty.

**Someday**
- A world of states that respond to what international officials do.

## 19. Sport and fame (`career/Sport`, `engines/Audience`)

**Today.** National teams, Olympics and World Cups, doping, federations, the IOC and FIFA Council;
audiences for creators and performers.

**Gaps.** Fame isn't one score shared across careers; sport is only professional.

**Next**
- A shared fame score: paparazzi, endorsements, stalkers, and scandals that carry over into
  politics and business.

**Later**
- Amateur and youth sport feeding the national teams.
- Coaching careers that build champions.

**Someday**
- Club ownership as a business.

## 20. Vehicles, transport and transit (`vehicles/`, `transit/`, `career/Transport`)

**Today.**
- Cars, boats and planes; licences; transit careers and boards.
- Routes and logbooks for transport work.

**Gaps.** Commuting choice affects little; accidents are generic.

**Next**
- Commute choices (car, transit, bike) that feed health, money and stress.

**Later**
- Collector vehicles and restoration as a hobby (see §1).

**Someday**
- Autonomous vehicles changing driving careers over a long game.

## 21. Farming (`farm/`)

**Today.** Crops, livestock, land, seasons and markets.

**Gaps.** Weather and disasters hit farms less than they should; succession to children is thin.

**Next**
- Farm succession: handing the land on, and family disputes over the farm.

**Later**
- Climate risk: droughts and floods tied to the disaster system.

**Someday**
- Agricultural cooperatives and politics (subsidies, trade deals).

## 22. Retirement and pensions (`retirement/`)

**Today.** Social Security and national pensions, defined-benefit plans, DC accounts, military
retired pay with recall suspension, and retiring abroad.

**Gaps.** Little to do once retired.

**Next**
- Retirement life: travel plans, volunteering, encore careers, moving near grandchildren.

**Later**
- Care homes and assisted living as choices with costs.

**Someday**
- Long-term care insurance and the family's role, tied to elder care.

## 23. Civic life (`civic/`)

**Today.** Activism, HOAs, neighbours, local ballot measures and transit boards.

**Gaps.** Civic groups (Rotary, PTA, unions-as-community) are thin outside the HOA.

**Next**
- Civic clubs with leadership roles and community projects.

**Later**
- Local journalism: a town paper you write for or own.

**Someday**
- A town that changes visibly over decades from what its people do.

## 24. Disasters and war (`life/Disasters`, `world/War`, `world/Coups`)

**Today.**
- Yearly disaster rolls by state with responses from other systems.
- Wars with mobilisation and refugees; coups and juntas.

**Gaps.**
- You make no personal choices in a disaster.
- Disasters are US-state based.

**Next**
- Disaster choices: evacuate or stay, insurance claims (denied, underinsured, flood excluded),
  rebuild or sell, aid.

**Later**
- Country-level disaster tables abroad (typhoons, earthquakes, monsoon floods).

**Someday**
- Climate change raising the odds over a long game.

## 25. UI and the app (`ui/`)

**Today.** Grouped tabs, cards, disclosures and forms, phone layouts, and a PWA.

**Gaps.**
- Long tabs (Career and Money) still scroll a lot.
- There is no search across your life.

**Next**
- A "what changed this year" summary at the top of the log.
- Pinned cards per tab.

**Later**
- Search across the log, people and honours.

**Someday**
- A timeline view of the whole life and the family line.

## 26. Engineering: tests, saves and performance

**Today.**
- `tests/run.js` runs the suite in parallel: fast tests on every push, the long ones nightly.
- Saves plateau near 300 KB, and a year takes about 8 ms.

**Gaps.**
- The balance harness has one metric out of band (bankruptcy).
- Some tests check things loosely, only "if the job is still held".

**Next**
- Bring bankruptcy back into its band.
- Tighten loose tests with fixed seeds.

**Later**
- Snapshot tests for key views.
- A save-migration test for every schema change.

**Someday**
- A replay recorder for bug reports: the seed plus the actions taken.
