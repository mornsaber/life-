# Crime rework plan

A complete rework of crime, and moving all of it under the ⚖️ Legal section.

## Where crime is today

| Piece | File | What it does | Problem |
|---|---|---|---|
| Risky Business | `legal/Misconduct.js` (`RISKY_ACTIONS`), `legal/StreetCrime.js` | 33 one-click crimes in 6 groups on **Life → Activities**. One click = one dice roll for money, plus heat and a per-crime skill counter | Button-mashing with no planning, targets, crew or choices. It sits in Activities, far from its consequences |
| Heat | `StreetCrime.js` | One number from 0 to 100; above 70 a task force builds cases | It doesn't say *who* is looking or *why*. The same heat applies in every country |
| Investigations | `JusticeSystem.js` (`commitOffense`) | Each offence opens a hidden investigation with a yearly `discovery` chance until the statute of limitations runs out | Invisible: arrest arrives from nowhere, with nothing to play against |
| Organised crime | `legal/Underworld.js`, `UnderworldView.js` | Outfits per city, ranks, rackets, crew, laundering, wars, RICO and witness protection | Rich, but bolted on: street crime doesn't feed into it, and its dirty money is separate from street crime's earnings |
| Crimes from other systems | `ILLEGAL_CHOICES` in `legal/index.js` | Fraud, bribery, desertion and others committed in other systems' prompts | Each fires `legal:offense` with a made-up discovery chance; no evidence trail |
| Courts, prison, clemency | `JusticeSystem`, `Prison`, `Clemency`, `CourtsAbroad`, `Judiciary` | Plea or trial, sentencing, prison life, sealing records, pardons | Solid; keep. It needs better input: real evidence and cooperation |
| Offences | `Offenses.js` (88) | Name, severity, fine, sentence, escalation | No murder, kidnapping or manslaughter; mostly US-flavoured |

## Goals

1. **Crime is a game you play, not a button.** You scout a target, plan it, pick a crew, choose an approach, then fence and launder the proceeds, and live with what you left behind.
2. **The law is visible.** Cases against you are on screen: who is investigating, what they have, how close they are. You can play against them.
3. **One criminal world.** Street crime, rackets, white-collar fraud and political corruption share the same evidence, dirty money, contacts and reputation.
4. **Every country is different.** Different crimes, policing, corruption, gun laws, drug laws and punishments, and every country gets them (through the pack tables).
5. **Consequences reach people.** Victims, witnesses, family, a crew that can flip, and guilt.
6. **Everything lives under ⚖️ Legal.**

## The new Legal section

The Legal section gets sub-tabs, like Work and Service already have:

| Tab | Contents |
|---|---|
| ⚖️ **Status** | Today's Legal view: status, record, probation, court dates, Second Chances, the Bench, Civil Court |
| 🗂️ **Cases** | Investigations against you (new): agency, lead investigator, stage, evidence held, statute clock; your lawyer and options |
| 🕶️ **Crime** | The criminal life: scouted targets, planned jobs, crew, contacts, dirty money, heat by agency, skills |
| 🕴️ **Underworld** | Outfit membership, rackets and wars (today's Underworld card, expanded) |
| 🔒 **Prison** | Shown only while inside: today's Life Inside / Death Row card |

The Risky Business card leaves **Life → Activities**. Reckless personal choices (speeding, drunk driving, bar fights, drugs, affairs) move to Crime → *Reckless* with the rest. Activities keeps a one-line pointer to the new location.

## The rework, system by system

### 1. Evidence and visible cases (replaces the hidden discovery roll)

Every offence leaves **evidence items**, and investigations are built from them:

```
evidence: { kind: 'cctv'|'dna'|'prints'|'witness'|'digital'|'financial'|'goods'|'accomplice'|'informant'|'confession',
            strength 0–1, decay/yr, holder: 'police'|'unknown', destroyable, about: caseId }
case:     { id, offenseIds, agency, investigator (named NPC), stage: 'lead'|'suspect'|'warrant'|'arrest',
            evidence[], progress, statuteLeft, jurisdiction }
```

- **Progress:** each year a case advances by its evidence strength times the agency's resources (city size, budget and corruption, from Regimes and Budgets). It also advances with heat and through new evidence: a pawned item, a talkative crew member, a bank alert.
- **Counterplay:**
  - destroy or launder evidence: burn the car, wipe the phone, lose the goods;
  - an alibi, from a friend or partner (who may refuse or crack);
  - stay silent and get a lawyer early;
  - leave the jurisdiction, or flee the country (extradition varies by country);
  - intimidate or bribe a witness (a new offence, and new evidence if it fails);
  - turn informant on others.
- **Back-compatibility:** the 20+ callers of `legal:offense` keep the same signature. Their `discovery` and `evidence` numbers are converted into starting evidence items, so no other system has to change.
- **Arrest in stages:** case stage `warrant` gives a prompt to surrender, run or hide. Arrest itself gives a choice: comply, run (a new offence) or resist (violent; can escalate).

### 2. Heat by agency and pattern

Heat splits into **local police**, **state/regional**, **national** (FBI, NCA, AFP, BKA, localized) and **international** (Interpol, abroad), plus **outfit heat** with rivals.

- Heat comes from *patterns* (the same method in the same area, a big score, violence, news coverage through the Fame system), not just volume.
- Laying low, moving, or changing your method cools it.
- The task force becomes a real national case with a named lead and wiretaps, sharing the Underworld's racketeering machinery.

### 3. Jobs: scout, plan, execute, fence

The property, robbery, fraud and cyber crimes become **jobs**; petty and reckless crimes stay one-click.

- **Targets** are generated per city: a jewellery store, an armoured-car route, a warehouse, a wealthy mark, a company's payroll system, a container at the port. Each has a take, security level, guards, cameras and alarm response time (the city's police size), plus witnesses.
- **Scouting** (an action, costs time): reveals the security, the best window and the guard rota. Scouting badly leaves a witness.
- **Planning:** pick an approach (*quiet*, *quick*, *con*, *force*), gear (bought on the black market) and crew roles (driver, lookout, safecracker, hacker, inside man).
- **Execution:** a short chain of 2–4 prompts with complications (an alarm, a guard, a crew mistake, a hostage risk). Choices change take, evidence left and violence.
- **Aftermath:** goods must be **fenced** (the fence takes 40–70%, can be a police informant, and can be robbed). Cash is **dirty money** (§5).
- **Skills** are per *discipline*, not per crime: stealth, lockwork, driving, tech, con, violence, planning. Practice raises them, and crew members bring theirs.

### 4. Crew, contacts and reputation

- **Crew** are real NPCs, drawn from people you know, prison contacts and outfit members. Each has loyalty, skill and nerve, and a *flip risk* if arrested (lower for loyal or outfit members, higher if they're facing big time).
- **Contacts** unlock through reputation:
  - a fence, a forger (fake IDs and passports, tied to Passports and Immigration), a fixer, a gun dealer;
  - a corrupt cop or clerk, more available where Regimes corruption is high;
  - a money launderer and a crooked lawyer.
- **Street reputation** (criminal-world respect) opens bigger jobs and outfit recruitment. It's separate from Fame, though notoriety feeds Fame.
- **Turf:** working on an outfit's territory without paying tribute brings an outfit response (warning, tax, violence). This is where street crime meets the Underworld.

### 5. One dirty-money economy

- All criminal proceeds go to `state.crime.dirty`, not straight into cash, merging the Underworld's dirty and laundered balances.
- **Spending dirty money** is evidence: big purchases, a house or a car raise financial evidence and invite the tax authority, through Taxes.
- **Laundering routes:**
  - a cash business you own (the Business system; already partly in the Underworld);
  - casinos, structuring deposits, crypto, real estate;
  - a professional launderer contact (fee, and an informant risk).
- Unexplained-wealth cases come from the tax agency, which differs by country.

### 6. Crime by country

New country-keyed tables, inherited through the pack system so every country gets an entry:

| Table | Example |
|---|---|
| `CRIME_LOCAL` | Which crimes exist and how common: catalytic converters (US/UK), motorbike theft (VN/ID), express kidnapping (MX/VE), romance and cyber scams (NG/PH/IN), piracy (SO), wildlife poaching (KE/ZA), art theft (IT/FR), drug trafficking routes |
| `POLICING` | Clearance rate, police corruption (from Regimes), surveillance level (CCTV density in GB/CN), forensic capacity |
| `WEAPONS` | Gun availability: US easy, JP/GB hard, so armed crime changes |
| `DRUG_LAW` | From decriminalized (PT) to the death penalty (SG/SA) |
| `PUNISHMENT` | Already partly in `JUSTICE`: sentencing scale, juries, plea bargaining (US yes, much of Europe limited), extradition treaties |

Add these to the coverage check (country-keyed tables must have an entry or a deliberate fallback).

### 7. Missing offences and violence

- Add **manslaughter**, **murder** (degrees by country), **kidnapping**, **extortion**, **witness intimidation**, **arson with injury**, **human smuggling** and **money laundering** (as an offence).
- A violent job that goes wrong can hurt or kill a victim or crew member (health, guilt, a murder or manslaughter case).
- Murder is never a casual button. It only comes out of a job, an outfit order or a confrontation, so it stays a consequence, not a mini-game.

### 8. The justice pipeline (improve, don't replace)

- **Interrogation:** stay silent, talk (risk of confessing), lawyer up, or cooperate (offer names).
- **Bail:** a bail hearing (set by risk, record and the country's rules); skipping bail makes you a fugitive (the existing `legal.fugitive`).
- **Plea bargaining:** the strength of the evidence on screen drives the offer. Cooperation deals ("give us your crew or your boss") feed the Underworld's flip and witness-protection machinery.
- **Trial:** jurors (where juries exist) see the evidence list. Your lawyer's quality and the prosecutor's caseload (the existing prosecution career) matter.
- **Sentencing:** country guidelines, priors and cooperation credit. Prison ties into outfits: prison gangs, protection and recruitment.

### 9. People and consequences

- **Victims** are NPCs. Robbing someone you know is possible and remembered. Victims can sue (Civil Courts).
- A **guilt / conscience** stat changes happiness and mental health. Some crimes raise it, and making amends lowers it.
- **Family:** a partner may leave, kids are affected, and parents react. Juvenile crime goes to a juvenile court with sealed records (Clemency exists).
- **Shared world:** detectives on your case are real NPCs in the police organisations. A player who is a police officer can be assigned NPC cases, using the same case objects in reverse.

### 10. Crimes from other systems

`ILLEGAL_CHOICES` (fraud, bribery, prescription fraud, desertion and so on) create **evidence items** in the same system: a whistleblower, an audit trail, a journalist, an informant. White-collar cases appear in **Cases** with the right agency (SEC, the tax authority, the anti-corruption commission).

## Phases

| Phase | Scope | Risk |
|---|---|---|
| **0. Move** | Legal sub-tabs (Status, Cases placeholder, Crime, Underworld, Prison). Move Risky Business and the Underworld card; pointer in Activities; update the clicker and view tests | Low |
| **1. Evidence and cases** | Evidence items, visible cases, staged arrests, counterplay actions. `legal:offense` stays compatible | Medium: central to the legal system; needs a save migration for open investigations |
| **2. Jobs** | Targets, scouting, planning, execution prompts and fencing for property, robbery and fraud/cyber; discipline skills replace per-crime skill | Medium |
| **3. Dirty money and contacts** | One dirty-money balance (merged with the Underworld), laundering routes, unexplained wealth; contacts, black market and street reputation | Medium: touches Business, Taxes and the Underworld |
| **4. Crew and cooperation** | NPC crews, flip risk, interrogation, bail, cooperation deals | Medium |
| **5. Countries** | `CRIME_LOCAL`, `POLICING`, `WEAPONS`, `DRUG_LAW`; pack inheritance; coverage check | Low–medium: mostly data |
| **6. Violence and people** | New offences (manslaughter, murder, kidnapping, extortion, intimidation), victims, guilt, family, juvenile court, shared-world detectives | Medium: needs careful tone |
| **7. Balance** | Crime economy caps vs legal careers; crime fuzz test (in the slow, nightly set) plus per-phase quick tests | Low |

Each phase ships on its own and keeps old saves loading: `state.legal.crime` heat and skill migrate to agency heat and discipline skills, and open investigations migrate to cases with converted evidence.

## Testing

- **Per phase:** a quick test file (`tests/crime*.js`) covering the new behaviour, plus `node tests/run.js --changed`.
- **New crime fuzz (slow, nightly):** criminal lives in 10 countries, checking:
  - cases always resolve or expire;
  - dirty money never goes negative or leaks into clean cash;
  - no crashes in the views;
  - no base-country words in crime text abroad.
- **Coverage check:** the new country tables are filled for every country.

## Decisions needed before Phase 6

1. **How dark?** Murder and kidnapping as consequences only (proposed), or as deliberate acts too?
2. **How punishing?** Should a well-planned career criminal be able to retire rich, or should the odds catch up with nearly everyone?
3. **Drugs:** keep dealing abstract (a racket with income and heat), or model a supply chain (grow/import → cut → distribute)?
