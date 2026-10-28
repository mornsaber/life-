# Next expansions

A plan for what to build next, in the order that gives the most for the effort. Each
phase is sized to fit one working session (a commit or two). Within a phase, the items
are independent and can be picked off one at a time.

## Phase 1 — Finish what's half-built (small, high value) ✅ done

Built: academies abroad (`military/Academies.js`), life after captivity, the constitution
question and revolutions for restored thrones, synods / Jubilees / named conclave rivals /
Pope Emeritus life, and family life for Gurkhas and legionnaires.

1. **Military academies abroad as real cadet years.** Sandhurst (44 weeks), Saint-Cyr
   (3 years), the Indian Military Academy, Duntroon, the Defence Academy of Japan: entry
   exams, a cadet year or years with their own events, and a commission at the end.
   Today a non-graduate officer abroad gets one generic academy year.
2. **Prisoner-of-war aftermath.** Captivity already ends with commendation or an inquiry;
   add the long tail: PTSD flare-ups, a book deal or speaking circuit, a veterans' group.
3. **Restored monarchies, fully.** A restored throne currently reuses the generic crown:
   give each its realm offices (a governor-general doesn't exist in Italy), its own
   honours list for the honours system, and a constitution question (absolute or
   constitutional) put to parliament.
4. **Papal life depth.** Synods, the Jubilee year, a papal conclave the player votes in
   as a cardinal with named rivals, and the Pope Emeritus's life at Mater Ecclesiae.
5. **Gurkha and Legion family life.** Family accompaniment (Gurkha families came to the
   UK only after 2009), Legion marriage permission, and the children's citizenship.

## Phase 2 — The world reacts (medium) ✅ done

Built: coups and juntas (`world/Coups.js`: regimes change in play, parliaments suspended,
sanctions, counter-coups, leading a junta and handing power back), sanctions that reach
diplomats, businesses and traders, monarchy polling and republic referendums in every realm,
and UN peacekeeping tours (`military/Peacekeeping.js`).

6. **Coups and juntas.** In fragile states (and under military regimes) a coup can put
   generals in power; a senior officer can join, oppose or lead one. Ties into
   `Regimes.js` and the head-of-state career.
7. **Sanctions and embargoes that bite careers.** International-organisation and
   diplomatic careers, exports, travel bans on officials of sanctioned regimes.
8. **Elections in the Holy See's shadow and the monarchy question at large.** Polling
   for a monarchy/republic in every crown realm, not only on a demise.
9. **Peacekeeping as a career track.** UN blue helmets from any contributing country:
   rotations, the UN medal per mission, and the Dag Hammarskjöld Medal for the fallen.

## Phase 3 — New careers abroad (medium–large) ✅ done

Built: the Catholic religious orders (`community/ReligiousOrders.js`: the Jesuits' long formation
to final vows and the priesthood, Opus Dei numeraries and supernumeraries, the Missionaries of
Charity), the sovereign's guards in eleven monarchies and the Spanish Legion's tercios
(`military/RoyalGuards.js`), international sport (`career/Sport.js`: caps, the Olympics and World
Cups with medals as honours, doping bans, federations, the IOC and FIFA Council), the merchant
navy (`career/Seafaring.js`) and foreign correspondents (`career/Correspondent.js`). Portugal has
no foreign legion (its forces take nationals only), so it isn't modelled as one.

10. **Spanish and Portuguese foreign legions in depth**, the Moroccan and Jordanian
    royal guards, and the Vatican's foreign missionary orders (Jesuits, Opus Dei,
    Missionaries of Charity).
11. **International sport.** National teams, Olympic selection, FIFA/IOC careers,
    sports diplomacy; the Olympic medal as an honour.
12. **Merchant navy and flags of convenience.** Filipino and Indian seafarers on
    foreign-flagged ships, piracy, and maritime law.
13. **International journalism.** Foreign correspondents posted to war zones, press
    freedom (and arrests) by regime, the Pulitzer and its national equivalents.

## Phase 4 — Systems that touch everything (large) ✅ done

Built: the family tree records each ancestor's career high point, service, schooling, honours,
partner and children (marking who carried the line on) and draws it on the People tab; a
`life/Housekeeping.js` pass trims old world, organisation, union and local-ballot history once a
decade (a long life plateaus near 300 KB, and each generation starts a fresh world); and
`tests/run.js` runs the suite in parallel, with `--fast` on every push and `--long` (the fuzzers
and simulations) nightly in `.github/workflows/tests.yml`.

14. **Family trees across generations.** The tree card shows one life; make it a real
    dynasty record that survives "continue as child" for every family, not only titled
    ones, with ancestors' careers and honours.
15. **Save-file size and performance.** Long dynastic games grow the save; prune old
    logs and organisations, and profile the yearly tick.
16. **A full-suite smoke run in CI.** The suite is long; split it into fast checks
    for every push and the long fuzzers on a schedule.

## How to work through it

- One phase item per commit, with its own test file or additions to an existing one.
- `npm test` runs the fast suite; `npm run test:all` runs everything.
- Run the affected test files plus `tests/abroad.js` for anything touching countries,
  and `tests/milfuzz.js` / `tests/milabroad.js` for anything military.
- New countries go through `docs/ADDING-A-COUNTRY.md` and `tests/packs.js`.
