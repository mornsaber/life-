# Roadmap: fame

The next large addition. Fame exists today as one score drawn from everything that makes a name
(life/Fame.js), with endorsements, paparazzi, talk shows, a memoir, stalkers, tabloid scandals,
cancellation and comebacks (life/Celebrity.js), an entertainment career (career/Showbiz.js, Audience),
protection (life/Protection.js) and honours from your town (life/Marks.js). What it lacks is fame **of its
day and place**, fame as **something you build and spend**, and fame that **outlives you**. This roadmap
fills those gaps in five phases.

## Where it stands

| Exists | Missing |
|---|---|
| One score (0–100), six tiers, buzz that fades | How fame was made in each era (the pulpit and the press in 1850, radio in 1930, television in 1960, the internet now) |
| Sources: following, sport, office, crown, fortune, honours, infamy | Fame in arts, science, letters, exploration, crime, scandal as their own paths |
| Endorsements, talk shows, memoir, paparazzi, stalkers | Period equivalents: the lecture circuit, the cartes de visite, the newsreel, the fan magazine |
| Scandal, cancellation, comeback | Libel law and the press of each country; rivals and feuds |
| Protection, a street and a statue | A reputation after death: obituaries, biographies, a place in the history the heirs read |

## Phase 1 — Fame of its day (foundation)

- **Media by era and country**: a `MEDIA` table (penny press 1830s, illustrated papers 1840s, photography and
  cartes de visite 1860s, cinema newsreels 1910s, radio 1920s, television 1950s by country, tabloids,
  cable 1980s, the web 1995, social media 2006, streaming 2015). Fame's reach is capped by the media of the
  day: a famous name in 1850 is national at most, in 2020 global.
- **Reach**: local, national, international, global, alongside the score. Tiers read by reach
  ("known throughout the province" in 1840, "a household name" in 1960).
- **Period moments** replacing modern ones before their day: the lecture tour for the talk show, the
  serialised memoir, the portrait sitting for the photo shoot, the society column for the paparazzi.
- Audit: no influencer deals before 2006, no talk shows before television in that country.

## Phase 2 — Paths to fame

Each a source with its own ladder of recognition:

- **Arts and letters**: a novel, a painting, a symphony; reviews, prizes of their day (the Prix de Rome,
  the Nobel from 1901, the Booker from 1969); a body of work that grows.
- **Science and invention**: tie the inventions race and academia to public fame; lectures at the Royal
  Institution; the Nobel.
- **Exploration and feats**: expeditions (poles, peaks, flights), with dates the history engine respects.
- **Sport**: champions of their day (the professional era by sport), records that stand.
- **Notoriety**: crime, scandal and revolution as fame with a sign (feared, hated, romanticised).
- **Faith and oratory**: preachers, revivalists, agitators.

## Phase 3 — Using fame

- **An image**: a public persona chosen and kept (the family man, the rebel, the philanthropist); acting
  against it costs credibility.
- **Spending fame**: on a cause (moves Activism), a candidate (endorsements in elections), a product
  (with the brand's risk), a charity (Marks: a foundation in your name).
- **The entourage**: a publicist, a manager, a press agent of their day (Property's staff: perks and leaks).
- **Rivals and feuds**: a rival name in your field; public feuds that sell papers and can turn.
- **The law of the press by country**: libel (Britain's strict law, America's after 1964), privacy, a
  censored press under autocracy (fame that only the state grants).

## Phase 4 — The cost

- **Privacy**: posture with Protection; a family dragged into it (children of the famous; Remembered).
- **Pressure**: health and addiction risks of the spotlight (MentalHealth), the career that ends.
- **Fading**: has-been years, the reunion tour, the nostalgia circuit, the second act.

## Phase 5 — Fame after death

- **The obituary**: written from the life (the log, honours, scandals), front page or a paragraph by tier.
- **Reputation over time**: rediscovered, forgotten, reassessed; a biography, a film of your life.
- **For the heirs**: the family name opens and closes doors (Dynasty reputation); the estate earns from
  your work (royalties, image rights); the town's statue may come down in a later era.

## Order and tests

1 → 2 → 3, with 4 woven through, and 5 last (it builds on the epilogue and the dynasty). Each phase
ships with an era audit across 1830, 1880, 1930, 1960, 2000 and 2020 in four countries (no medium before
its day), and a test of the score's sources and reach.

## Built

- **Phase 1** — life/FameOfTheDay.js: media by year and country (radio and television dates per country),
  reach capped by the media of the day, tier lines, brands, scandals, the chat show (lecture tour,
  wireless, late-night show) and the intrusions (gossip columns, press photographers, paparazzi).
- **Phase 2** — life/Works.js: novels, poems, paintings, compositions, plays, screenplays (from 1915),
  judged by their day; prizes of their day and place (Prix de Rome, RA, Goncourt, Pulitzer, Booker,
  Academy Award, Nobel); oratory; discoveries and expeditions counted as fame (`registerFameSource`).
- **Phases 3 and 4** — life/FameUse.js: persona, publicist (press agent before 1950) and manager, lending
  your name to a cause or a side, a foundation, rivals and feuds, children in the papers, fading and a
  second act; press law by country and era (British libel, America after 1964, French privacy from 1970,
  state presses) in the court odds.
- **Phase 5** — life/FameAfter.js: the obituary's placement, reputation after death (a biography, a
  film, rediscovered, reassessed, forgotten), the family name as a fame source, royalties while in
  copyright (28 years before 1886, life + 50, life + 70 in the EU from 1995 and the US from 1998),
  image licensing for an icon's estate in the US from 1985.
