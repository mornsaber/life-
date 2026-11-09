# Historical data: sources and licences

The tables in this folder are built from open datasets by `tools/data/build_history_data.py`
(except `currencies.js`, which is compiled by hand from the sources named in it). Each file's
header names its source. Please keep these credits with the data.

| File | What | Source | Licence / terms |
|---|---|---|---|
| `regimes.js` | Form of government of each country, every year 1800–2024 (parliamentarism, presidentialism, absolute monarchy, military rule, …), with democracy and monarchy flags | Anckar, C. & Fredriksson, C. (2019). "Classifying political regimes 1800–2016: a typology and a new dataset." *European Political Science* 18, 84–96. Via the [democracyData](https://github.com/xmarquez/democracyData) R package | Free for research and non-commercial use with citation |
| `states.js` | Independent states and the years they existed, 1816–2017 (Bavaria and the Two Sicilies to their unification, Czechoslovakia, Yugoslavia, the GDR, the Boer republics, …) | Gleditsch, K. S. & Ward, M. D. (1999). "A revised list of independent states since the Congress of Vienna." *International Interactions* 25(4). Via [peacesciencer](https://github.com/svmiller/peacesciencer) | Free with citation |
| `wars.js` | Inter-state and civil wars 1816–2007: dates, sides, battle deaths, outcome | Correlates of War Project, Inter-State and Intra-State War Data v4.0 (Sarkees & Wayman 2010). Via peacesciencer; war names from [jenna-jordan/correlates-of-war](https://github.com/jenna-jordan/correlates-of-war) | Free with citation |
| `demography.js` | GDP per head, population and life expectancy, every five years 1800–2020 | Maddison Project Database 2020 (Bolt, J. & van Zanden, J. L.); life expectancy from Riley (2005), Clio Infra (2015) and UN WPP (2019). Both via [Our World in Data](https://github.com/owid/owid-datasets) | CC BY 4.0 |
| `names.js` | The 60 most popular US baby names of each sex in each decade, 1880s–2010s | US Social Security Administration. Via the [babynames](https://github.com/hadley/babynames) R package | Public domain |
| `oldNames.js` | Older first names by country (born before about 1950) and the commonest US surnames of the 1880–1940 censuses | Compiled by hand from the common names of 19th- and early-20th-century parish, civil and census records | Public facts |
| `currencies.js` | Each country's currencies before today's, with changeover years and conversion rates | ISO 4217 list three (historic codes), via [datasets/currency-codes](https://github.com/datasets/currency-codes) (ODC PDDL); the euro's fixed conversion rates (Council Regulation (EC) 2866/98 and later); national redenomination ratios | Public facts |

Where the data and the game's own hand-written history disagree, the hand-written history
(world/Eras.js periods and timelines, world/History.js events) wins: the data fills the years and
places it doesn't describe.

Not yet sourced: invention dates (world/Eras.js `TECH`) are still a hand-made list, since the
datasets for them (Wikidata, Our World in Data's technology adoption series) could not be reached
from the build environment.
