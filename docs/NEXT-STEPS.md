# Next steps

What to build after the crime rework (`docs/CRIME-REWORK-PLAN.md`) and the health roadmap (`docs/HEALTH-ROADMAP.md`). The phases are ordered by value for effort. Each is sized for a session or two, and the items within a phase are independent.

## Phase A: harden what was just built

| Item | Why |
|---|---|
| **Balance pass on crime and health.** Run 200 lives per country through the simulation and record how many people are victimised, recruited, addicted, killed in confrontations or diagnosed. Tune against real rates: UK lifetime burglary, US homicide, smoking prevalence, dementia by 85. | The new yearly rolls were set by hand; a few could be far off in some countries. |
| **Clicker coverage.** Add the Cases, Crime and Underworld tabs and the new Health cards to the clicker suite, then run it once (it is slow, so as a scheduled job). | Every new button should be pressed by a test at least once. |
| **Save migration notes.** Old saves pick up cases (`ensureCases`), lifestyle and crime state lazily. Add a migration test that loads a pre-crime save and ages it ten years. | Proves that loading an old save can't crash. |
| **Text scan.** Add the new log lines to the fuzz text scan (NaN, undefined, US-only words abroad, wrong currency symbols). | The crime text mixes £ and $ in a few places. |

## Phase B: crime, part 2 (from the crime plan)

| Item | Ties into |
|---|---|
| **Jobs: scout, plan, execute, fence.** Targets per city (jewellery store, armoured-car route, warehouse, payroll system, container at the port). Scouting reveals security; a plan picks an approach, gear and crew; execution is 2–4 prompts with complications; goods are fenced. Discipline skills (stealth, lockwork, driving, tech, con, violence) replace per-crime skill. | `StreetCrime`, `Cases` (evidence left behind), `Drugs` (fences, launderers) |
| **Crews as real people.** Crew drawn from friends, prison contacts and outfit members, each with loyalty, skill, nerve and a flip risk when arrested. | People, `Cases.cooperate`, Underworld crews |
| **Interrogation.** When you're arrested: stay silent, talk, lawyer up or cooperate, with the evidence on screen. | `JusticeSystem.charge`, `Cases` |
| **Heat by agency.** Split heat into local, national and international. Patterns (same method, same area) build it faster; moving away or changing method cools it. | `Cases.agency`, Fame (news coverage) |
| **Police players work cases.** A detective player gets the NPC side of the same case objects: evidence to gather, suspects to interview, warrants to request. A prosecutor decides charges from the evidence list. | `crime/CaseWork`, police and prosecution careers |
| **Prison and re-entry.** Prison gangs (join for protection or stay out), contraband economies, and release: parole conditions, a criminal record in job applications, re-entry programmes, relapse into crime or out of it. | `legal/Prison`, Underworld prison year, JobMarket |
| **Victims sue.** Victims (and the player as a victim) bring civil claims; the criminal conviction is evidence. | `legal/CivilCourts` |
| **Crime by country, deeper.** A `CRIME_LOCAL` table: motorbike theft (VN/ID), express kidnapping, romance and cyber scams (NG/PH/IN), piracy (SO), wildlife poaching (KE/ZA), art theft (IT/FR). Add it to the country coverage check. | `CrimeWorld`, country packs |

## Phase C: health, part 2

| Item | Ties into |
|---|---|
| **H6. Clinical careers share the world.** Clinicians treat cases drawn from the player's condition list; the player's own doctor is a named NPC at a real hospital organisation; public-health careers run screening and vaccination programmes. | Clinical careers, `org/` |
| **H7. Epidemics.** Seasonal flu severity, a pandemic event (lockdowns, vaccines, frontline risk and trauma, economic shock), and outbreaks in prisons and care homes. | World events, Economy, careers |
| **Sexual and reproductive health.** Contraception, pregnancy complications, IVF costs by country (Fertility exists), menopause, and STIs other than HIV. | People, `FertilityModule` |
| **Disability in daily life.** Mobility aids, accessible housing, carers' allowances, and disability discrimination claims. | Housing, `WorkplaceClaims`, SSDI |
| **Mental health crises.** Psychiatric admission (voluntary and involuntary), crisis teams, and the link between untreated illness, homelessness and prison. | `MentalHealth`, Housing, Legal |

## Phase D: life systems that would benefit most from the same treatment

| System | The move |
|---|---|
| **Education** | Make school a place with people in it: named teachers, bullying (both sides), exclusion, special educational needs, and the school-to-prison pipeline linking to youth court. |
| **People** | Family as a system: divorce and custody fights in family court, child protection investigations (the CPS career's other side), elder abuse, and inheritance disputes. |
| **Money** | Debt as pressure: loan sharks (crime), payday loans, gambling debts collected by outfits, and financial abuse. |
| **Housing** | Homelessness in depth: shelters, rough sleeping, the health and crime risks, and the routes out. |

## Phase E: engineering

- Split `HealthEngine.js` (now over 800 lines) into conditions, acute care, billing and module files.
- Give each module that rolls yearly ambient events its own side random stream (crime and health now do), so that adding a module never shifts the dice other modules' tests depend on. Write a small shared helper for it.
- Add a `--seedcheck` mode to the test runner that runs the quick suite under three seeds, to catch tests that pass by luck.
