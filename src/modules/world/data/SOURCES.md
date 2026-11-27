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

## Hand-entered date tables

These tables were entered by hand from general historical knowledge, not from a dataset, and
have not been checked line by line against primary sources. Each was cross-checked once for
consistency with the commonly cited dates; treat any single year as accurate to within a year
or two, and correct it here and in the code if a better source disagrees.

| Where | What | Notes |
|---|---|---|
| `data/warFixes.js` | Corrections to the Correlates of War record: names wars are known by, outcomes the record leaves open or gets wrong (1965 Indo-Pakistani war a stalemate; Mexico, Turkey and Vietnam winning their wars), India's part in Sri Lanka 1987–90 | Each correction carries a one-line reason |
| `content/packs/careers-intl-orgs.js` | UN admissions (the 1955 package, Japan 1956, the two Germanys 1973, the Koreas 1991, Switzerland 2002, China's seat 1971), IMF/World Bank membership (Poland 1946–50 and from 1986, Czechoslovakia to 1954 and from 1990, the PRC 1980), GATT contracting parties and WTO accessions (China 2001, Russia 2012) | Recruitment gates only; small states default to their independence year |
| `org/Staffing.js` | Staff of international bodies, and how the big ones grew (`KNOWN_STAFF`, `STAFF_SERIES`) | Rounded; recent figures from the bodies' own reports as remembered |
| `world/ChildLabour.js` | Minimum ages for mill and mine work by country and year (Britain's Factory Acts 1833–1918 and Mines Act 1842, Prussia 1839, France 1841/1874, Spain 1873, the US FLSA 1938, Japan 1916, India 1881/1891/1922) | The first law of each kind and its main amendments |
| `world/Eras.js` `DRUG_PROHIBITION` | When the drug trade became a crime (Harrison Act 1914, Dangerous Drugs Act 1920, Canada's Opium Act 1908, …) | National laws; earlier local bans not counted |
| `people/Fertility.js` `ADOPTION_LAW` | When legal adoption came (Massachusetts 1851, England and Wales 1926, Ireland 1952, …) | The first general adoption statute |
| `community/FaithOfTheDay.js` | When traditions began (Pentecostalism 1906, the Global Methodist Church 2022) and when migrants' faiths arrived in Western countries (mostly after 1950) | Arrival years are the start of settled communities, not the first individuals |
| `life/LeisureOfTheDay.js` `TV_FROM` | When most homes had a television, by country | Mass ownership, not the first broadcasts |
| `education/K12.js`, `education/SchoolingOfTheDay.js` | Children's part-time jobs by year, night-school certificates by country (the GED 1942), indenture lengths | |
| `career/PlaceSize.js` | The smallest country (people) each career needs | Judgement, tuned so Pitcairn has the shop and the school but no law firms |
| `world/Eras.js` `OPTION_FROM` | When specialist units and postings began (SWAT 1968, hostage negotiators 1972, offshore platforms 1947, …) | Matched on the option's name |
