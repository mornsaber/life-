# Audit: a life in Bessarabia under the Russian Empire (1840–1876)

A female life born 1840 in Chișinău (Kishinev), Moldova as the game models it, played year by year with every
screen rendered as the browser shows it (period renames and local money applied). Each finding notes where
else in the game the same fault applies, and whether it is fixed.

## Fixed (game-wide)

| # | Seen in Bessarabia | The general fault | Fix |
|---|---|---|---|
| 1 | "the Russian Empire (Bessarabia), ruled from **Moscow**" | Empires had one capital for all time | `rulerCapital(cc, year)`: St Petersburg to 1918, Constantinople to 1923, Kyoto before 1869, Peking/Nanking, Rio, Melbourne, Karachi, Turin/Florence, Auckland, Philadelphia |
| 2 | "The movement to end Russian rule over **the Russian Empire (Bessarabia)**" in 1856 | The movement text used the regime's name, and every ruled land had a movement from 1800 | The land's own name (`landName`), and movements only from their decade (`movementFrom`, default 1850 where there was no war of independence; Bessarabia 1905) |
| 3 | "🇲🇩 **Moldova Army**", "Moldovan Army Reserve" in 1862 | A province of a land empire got an army of its own | `serviceCountryOf`: provinces of the Russian, Austrian, Ottoman, Hungarian, German, Romanian, Serbian, Chinese and Ethiopian states enlist in the empire's forces, as its subjects |
| 4 | Prices in today's Moldovan **leu** in 1862 | A province used its modern currency | `moneyRulerOf`: a province uses its empire's money of the day (roubles to 1918, lei under Romania) |
| 5 | Ukraine "ruled from Moscow" in 1850 (the Soviet stage, back-dated) | One stage covered two centuries | A Russian-Empire stage to 1918, then Soviet Ukraine from 1922 |
| 6 | A woman offered **law, medicine, architecture** in 1862 | No general rule on when women were admitted to the professions | `womenAdmitted`: law, medicine, police, fire, engineering, architecture, diplomacy and the bench, by country and year (a province follows its ruler) |
| 7 | **Run for Office**: School Board, Mayor, Parliament, Prime Minister of Moldova, all locked | Republic offices shown where nobody was elected | Where a regime holds no elections, one card: officials are appointed |
| 8 | The **Chamber** tab: "Parliament, 101 seats … signed into law" | A ruled land showed its modern legislature | A colony or province has no chamber of its own |
| 9 | **Credit 654 Fair**, 300–850 gauge, in 1862 | The credit-score card ignored its own date | Shown only where credit scores exist (1989 on) |
| 10 | **Masonic lodge** to join in Tsarist Kishinev | No bans by country | Banned in Russia 1822–1905 and the USSR, Austria 1795–1918, under Mussolini, Hitler, Franco, Salazar, communist Eastern Europe, China, Iran |
| 11 | **Votes for women** as a cause in 1862 Russia | One start date (1848) everywhere | Per-country start (Russia 1905, France 1876, Germany 1890…) |
| 12 | **Neighbourhood watch** "with a phone tree" in 1862; neighbours' 2 a.m. music, arborists, small claims, hedge trimmers, 911, doorbell cameras | Neighbour situations had no dates | Each situation has a `from` year; the watch from 1972 |
| 13 | **The Penny Post** ("a penny, anywhere in the country") in Bessarabia | A British reform shown everywhere | Britain and Ireland only |
| 14 | A wedding party with a **bachelorette weekend** in 1859 | Modern custom | Before 1980: the journey, an outfit and a present |
| 15 | **A Hard Year** prompt every single year | No cooldown | At most once in three years (the lean years still hurt) |
| 16 | **Chișinău** under the Tsars; a **Chișinău Stock Exchange** in 1862 | Romanian names in every period | Kishinev, Beltsy, Kagul under Russia and the Soviets; the St Petersburg Exchange (1918–40: Bucharest) |

## Open (noted, not yet fixed)

| Seen | Applies to | Suggested fix |
|---|---|---|
| "the **Moldova Military Academy**" in the university guide | Every pack country before it had forces (academies are generated from today's state) | Academies follow `serviceCountryOf` (the empire's schools) |
| Passport "**Moldovan**" in 1862 | Any province or colony | A "subject of the Russian Empire" line from the colony stage |
| "**income tax** ₽0" lines, "Health insurance", "Pre-tax retirement" in 1862 | Money screen abroad before income taxes (Russia had none until 1916) | Hide tax lines before a country's first income tax |
| Vocational apprenticeships: **Electrician, Welder, Motor mechanic, CNC**, "Needs a school-leaving certificate" | Every pre-1900 life | Trades of their day (smith, wheelwright, cooper) and no certificate before 1945 |
| **CNC Machinist** as a factory entry rung | Manufacturing ladder abroad before 1950 | A period title (machine hand) |
| "**civil-service exam**", "Deputy Commissioner", "Region Government" on public jobs | Public careers in autocracies before 1900 | Patronage and the Table of Ranks instead of exams |
| **Kishinev FC** among boards to sit on, 1862 | Football clubs everywhere before their country's game | Club founding years by country |
| "The Kishinev Chronicle (**the party paper**)" | Newspapers under autocracies before parties | "the official gazette" where parties were banned |
| **Refugees from the war in Qing China** arriving in Kishinev | Refugee events from any war in the world | Only wars on the same continent or a neighbour |
| "History is on its way: the **Irish Famine, the Mexican–American War**" | The Year card everywhere | Regional history first (the Crimean War, the Treaty of Paris, the Russo-Turkish war) |
| "Not invented yet: … **prom**" | The Year card everywhere | Only inventions, and customs where they belong |
| "**Westside Boys**" gang approaching a teenager in 1856 | Gang names abroad and in the 1800s | Period and local names, or none before organised gangs |
| A Scottish feudal barony for sale | Titles for sale shown to everyone | Fine, but rarer abroad |

## How to re-run

    node tools/life-dump.mjs MD 4 1840 out.txt

Every screen at ages 0, 12, 22, 35 and 50, every prompt and the whole life story, rendered through `periodText` and `localizeHtml` as the browser does. Any country and birth year works.
