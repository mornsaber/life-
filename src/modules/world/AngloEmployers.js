/**
 * Private employers in the English-speaking world outside the US: Britain, Ireland, Canada,
 * Australia, New Zealand and South Africa, named as they were in the year being played. A Leeds
 * solicitor works for "Hartley & Shaw, Solicitors" (an LLP only from 2000), an accountant for a
 * firm of chartered accountants or Peat, Marwick, Mitchell & Co., a reporter for the Yorkshire
 * Post or Granada; a shop girl for Woolworths or the Co-op, a farm hand on a hill farm in the Dales.
 *
 *   angloEmployer(professionId, cc, city, year, rng, { regionId, profession }) → a name, or null
 *
 * null keeps the profession's own list (the work this table doesn't cover). The US keeps its own
 * lists; nationalised sectors are named by Ownership.js.
 */
import { COUNTRIES } from './Countries.js';

export const ANGLO_ABROAD = ['GB', 'IE', 'CA', 'AU', 'NZ', 'ZA'];

/** Rows: a name, or [name, from, until) — the years it went by that name. */
const live = (y, rows) => rows.filter((r) => typeof r === 'string' || ((r[1] ?? -1e9) <= y && y < (r[2] ?? 1e9))).map((r) => (typeof r === 'string' ? r : r[0]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---- Where in the country ---- */
const GB_TV = {
  // ITV's regional companies, and who held each franchise when.
  london: [['Associated-Rediffusion', 1955, 1964], ['Rediffusion London', 1964, 1968], ['ATV (London weekends)', 1955, 1968], ['Thames Television', 1968, 1993], ['London Weekend Television', 1968, 2004], ['Carlton Television', 1993, 2004], ['ITV London', 2004], ['Channel 4', 1982], ['Sky News', 1989], ['ITN', 1955]],
  midlands: [['ATV', 1956, 1982], ['ABC Television (weekends)', 1956, 1968], ['Central Television', 1982, 2004], ['ITV Central', 2004]],
  northwest: [['Granada Television', 1956, 2004], ['ABC Television (weekends)', 1956, 1968], ['ITV Granada', 2004]],
  yorkshire: [['Granada Television', 1956, 1968], ['ABC Television (weekends)', 1956, 1968], ['Yorkshire Television', 1968, 2004], ['ITV Yorkshire', 2004]],
  northeast: [['Tyne Tees Television', 1959, 2004], ['ITV Tyne Tees', 2004]],
  border: [['Border Television', 1961, 2004], ['ITV Border', 2004]],
  scotland: [['Scottish Television', 1957, 2006], ['STV', 2006]],
  north: [['Grampian Television', 1961, 2006], ['STV North', 2006]],
  wales: [['TWW', 1958, 1968], ['HTV Wales', 1968, 2004], ['ITV Wales', 2004]],
  westwales: [['TWW', 1958, 1968], ['Teledu Cymru', 1962, 1964], ['HTV Wales', 1968, 2004], ['ITV Wales', 2004], ['S4C', 1982]],
  southwest: [['Westward Television', 1961, 1982], ['TSW', 1982, 1993], ['Westcountry Television', 1993, 2004], ['ITV Westcountry', 2004]],
  east: [['Anglia Television', 1959, 2004], ['ITV Anglia', 2004]],
  ni: [['Ulster Television', 1959, 2006], ['UTV', 2006]],
};
const GB_AREA = {
  london: 'london', manchester: 'northwest', birmingham: 'midlands', oxford: 'midlands', cornwall: 'southwest', barnstaple: 'southwest',
  edinburgh: 'scotland', glasgow: 'scotland', oban: 'scotland', fortwilliam: 'north', inverness: 'north', stornoway: 'north',
  cardiff: 'wales', brecon: 'wales', aberystwyth: 'westwales', llandudno: 'westwales', belfast: 'ni', enniskillen: 'ni', omagh: 'ni',
  kendal: 'border', dumfries: 'border', hexham: 'northeast', lincoln: 'east', cambridge: 'east', thetford: 'east', skipton: 'yorkshire',
};
const GB_BBC = { london: 'the BBC (Broadcasting House)', manchester: 'BBC North', birmingham: 'BBC Midlands', edinburgh: 'BBC Scotland', glasgow: 'BBC Scotland', cardiff: 'BBC Wales', belfast: 'BBC Northern Ireland' };
/** BBC local radio, as the stations were renamed. */
const GB_BBC_LOCAL = { london: [['BBC Radio London', 1970, 1988], ['BBC GLR', 1988, 2001], ['BBC London', 2001]], manchester: [['BBC Radio Manchester', 1970, 1988], ['BBC GMR', 1988, 2006], ['BBC Radio Manchester', 2006]],
  birmingham: [['BBC Radio Birmingham', 1970, 1981], ['BBC Radio WM', 1981]], oxford: [['BBC Radio Oxford', 1970]], cornwall: [['BBC Radio Cornwall', 1983]], lincoln: [['BBC Radio Lincolnshire', 1980]], kendal: [['BBC Radio Cumbria', 1973]] };
const GB_RADIO = { london: [['Capital Radio', 1973], ['LBC', 1973]], manchester: [['Piccadilly Radio', 1974]], birmingham: [['BRMB', 1974]], glasgow: [['Radio Clyde', 1973]], edinburgh: [['Radio Forth', 1975]], cardiff: [['CBC (Cardiff Broadcasting)', 1980, 1990]], belfast: [['Downtown Radio', 1976]] };
const GB_PAPERS = {
  london: [['the Evening Standard'], ['the Evening News', 0, 1980], ['The Star', 0, 1960]],
  manchester: [['the Manchester Guardian', 0, 1959], ['the Manchester Evening News'], ['the Daily Dispatch', 1900, 1955], ['the northern office of the Daily Express', 1927]],
  birmingham: [['the Birmingham Post'], ['the Birmingham Mail'], ['the Birmingham Gazette', 0, 1956]],
  edinburgh: [['The Scotsman'], ['the Edinburgh Evening News']],
  glasgow: [['the Glasgow Herald', 0, 1992], ['The Herald', 1992], ['the Daily Record', 1895], ['the Evening Times', 1876]],
  cardiff: [['the Western Mail'], ['the South Wales Echo']],
  belfast: [['the Belfast Telegraph'], ['the News Letter'], ['The Irish News', 1891]],
  cornwall: [['the West Briton'], ['the Western Morning News']], barnstaple: [['the North Devon Journal'], ['the Western Morning News']],
  inverness: [['the Inverness Courier'], ['the Highland News']], fortwilliam: [['the Oban Times']], oban: [['the Oban Times']], stornoway: [['the Stornoway Gazette', 1917]],
  dumfries: [['the Dumfries and Galloway Standard']], kendal: [['the Westmorland Gazette']], lincoln: [['the Lincolnshire Echo', 1893]], oxford: [['the Oxford Mail', 1928], ['the Oxford Times']],
  cambridge: [['the Cambridge Daily News', 0, 1970], ['the Cambridge Evening News', 1970, 2013], ['the Cambridge News', 2013]], aberystwyth: [['the Cambrian News']], enniskillen: [['The Impartial Reporter']],
  hexham: [['the Hexham Courant'], ['The Journal (Newcastle)']], thetford: [['the Eastern Daily Press']], skipton: [['the Craven Herald'], ['the Yorkshire Post']], brecon: [['the Brecon & Radnor Express']],
  llandudno: [['the North Wales Weekly News']], omagh: [['the Tyrone Constitution'], ['the Ulster Herald']],
};
const GB_NATIONALS = [['The Times'], ['the Daily Telegraph'], ['the Daily Mail', 1896], ['the Daily Express', 1900], ['the Daily Mirror', 1903], ['the Daily Herald', 1912, 1964], ['the Daily News', 0, 1930], ['the News Chronicle', 1930, 1960],
  ['the Morning Post', 0, 1937], ['the Financial Times', 1888], ['The Guardian', 1959], ['The Sun', 1964], ['The Observer'], ['the News of the World', 0, 2011], ['the Daily Star', 1978], ['The Independent', 1986], ['Reuters'], ['the Press Association']];

/** A farm in the country round the town. */
const GB_FARMS = {
  london: ['a fruit farm in Kent', 'a market garden in the Lea Valley'], manchester: ['a dairy farm in Cheshire'], birmingham: ['a market garden in the Vale of Evesham', 'a mixed farm in Warwickshire'],
  cornwall: ['a dairy farm in Cornwall', 'a farm on the Roseland'], barnstaple: ['a dairy farm in Devon', 'a hill farm on Exmoor'], edinburgh: ['an arable farm in East Lothian'], glasgow: ['a dairy farm in Ayrshire'],
  fortwilliam: ['a sheep farm in Lochaber', 'a croft in the Highlands'], inverness: ['a croft in the Highlands', 'a farm on the Black Isle'], stornoway: ['a croft on Lewis'], oban: ['a hill farm in Argyll'], dumfries: ['a dairy farm in Galloway'],
  cardiff: ['a farm in the Vale of Glamorgan'], brecon: ['a hill farm in the Brecon Beacons'], aberystwyth: ['a hill farm in mid-Wales'], llandudno: ['a hill farm in Snowdonia'],
  belfast: ['a farm in County Down', 'a farm in County Antrim'], enniskillen: ['a farm in County Fermanagh'], omagh: ['a farm in County Tyrone'],
  kendal: ['a hill farm in the Lake District'], hexham: ['a hill farm in Northumberland'], skipton: ['a hill farm in the Yorkshire Dales'], lincoln: ['an arable farm in Lincolnshire'],
  oxford: ['a mixed farm in Oxfordshire'], cambridge: ['a fen farm in Cambridgeshire'], thetford: ['an arable farm in Norfolk', 'an estate farm in Breckland'],
};
const IE_FARMS = {
  dublin: ['a cattle farm in County Meath', 'a stud farm in County Kildare'], cork: ['a dairy farm in County Cork'], skibbereen: ['a dairy farm in West Cork'], galway: ['a farm in County Galway'], clifden: ['a small farm in Connemara'],
  limerick: ['a dairy farm in the Golden Vale'], waterford: ['a dairy farm in County Waterford'], tralee: ['a dairy farm in County Kerry'], dingle: ['a hill farm on the Dingle peninsula'], athlone: ['a cattle farm in County Westmeath'],
  tullamore: ['a farm in County Offaly'], letterkenny: ['a hill farm in County Donegal'], donegaltown: ['a hill farm in County Donegal'], cavan: ['a small farm in County Cavan'], westportie: ['a small farm in County Mayo'], ballina: ['a small farm in County Mayo'],
};
const IE_PAPERS = {
  cork: [['the Cork Examiner', 0, 1996], ['the Irish Examiner', 1996], ['the Evening Echo', 1892]], galway: [['the Connacht Tribune', 1909]], clifden: [['the Connacht Tribune', 1909]], limerick: [['the Limerick Leader', 1889]],
  waterford: [['the Munster Express']], letterkenny: [['the Donegal Democrat', 1919]], donegaltown: [['the Donegal Democrat', 1919]], tralee: [['The Kerryman', 1904]], dingle: [['The Kerryman', 1904]],
  athlone: [['the Westmeath Independent']], cavan: [['The Anglo-Celt']], westportie: [['the Mayo News', 1892]], ballina: [['the Western People', 1883]], skibbereen: [['The Southern Star', 1889]], tullamore: [['the Offaly Independent']],
};

/** Per province (AU, NZ, CA, ZA). */
const PROV_FARMS = {
  'AU-NSW': ['a sheep station in the Riverina', 'a wheat farm in the central west', 'a dairy farm on the north coast'], 'AU-VIC': ['a wheat farm in the Mallee', 'a dairy farm in Gippsland', 'a fruit block on the Murray'],
  'AU-QLD': ['a cattle station in the Gulf country', 'a cane farm near Bundaberg', 'a sheep station on the Darling Downs'], 'AU-WA': ['a wheat farm in the wheatbelt', 'a cattle station in the Kimberley'],
  'AU-SA': ['a vineyard in the Barossa Valley', 'a wheat farm on the Eyre Peninsula'], 'AU-TAS': ['an apple orchard in the Huon Valley', 'a dairy farm in the north-west'], 'AU-NT': ['a cattle station on the Barkly Tableland'], 'AU-ACT': ['a sheep property near Canberra'],
  'NZ-AUK': ['a dairy farm in Northland', 'an orchard at Kumeu'], 'NZ-WGN': ['a sheep farm in the Wairarapa'], 'NZ-CAN': ['a high-country sheep station', 'a mixed cropping farm on the Canterbury Plains'], 'NZ-WKO': ['a dairy farm in the Waikato'],
  'NZ-OTA': ['a sheep station in Central Otago', 'an orchard near Cromwell'], 'NZ-GIS': ['a sheep and cattle station on the East Coast'], 'NZ-WTC': ['a dairy farm on the West Coast'], 'NZ-STL': ['a sheep farm in Southland'], 'NZ-MWT': ['a sheep farm in the Manawatū'], 'NZ-BOP': ['a dairy farm in the Bay of Plenty'],
  'CA-ON': ['a dairy farm in the Ottawa Valley', 'a mixed farm in Huron County', 'a tobacco farm in Norfolk County'], 'CA-QC': ['a dairy farm in the Eastern Townships', 'a farm on the Gaspé coast'], 'CA-BC': ['an orchard in the Okanagan', 'a cattle ranch in the Cariboo'],
  'CA-AB': ['a cattle ranch in the foothills', 'a wheat farm near Lethbridge'], 'CA-NS': ['an apple orchard in the Annapolis Valley'], 'CA-SK': ['a wheat farm on the prairie'], 'CA-NL': ['a smallholding on the Avalon'],
};
const ZA_FARMS = (prov, y) => ({
  'ZA-GP': [`a maize farm in the ${y < 1994 ? 'Transvaal' : 'Highveld'}`, `a cattle farm in the ${y < 1994 ? 'Transvaal ' : ''}bushveld`], 'ZA-WC': ['a wine farm near Stellenbosch', 'a fruit farm in the Boland', 'a sheep farm in the Karoo'],
  'ZA-KZN': [`a sugar farm in ${y < 1994 ? 'Natal' : 'KwaZulu-Natal'}`, 'a dairy farm in the Natal Midlands'], 'ZA-EC': ['a sheep farm in the Karoo', 'a citrus farm in the Sundays River valley'], 'ZA-FS': [`a maize farm in the ${y < 1995 ? 'Orange Free State' : 'Free State'}`, 'a cattle farm in the eastern Free State'],
})[prov] ?? ['a farm in the platteland'];

/* ---- The tables, by kind of work ---- */
/** Each: (x) → names, where x = { cc, c (city), y, rid (region id), prov, A, B, C (surnames) }. */
const LAW = {
  GB: (x) => [`${x.A} & ${x.B}, Solicitors`, `${x.A}, ${x.B} & Co., Solicitors`, `${x.A} & Son, Solicitors`, ...(x.y >= 2000 ? [`${x.A} ${x.B} LLP`] : []),
    ...(x.rid === 'edinburgh' ? [`${x.A} & ${x.B} W.S.`, 'Dundas & Wilson', 'Shepherd & Wedderburn'] : []), ...(x.rid === 'glasgow' ? ['Maclay Murray & Spens', ...live(x.y, [['McGrigor Donald', 1983, 2005]])] : []),
    ...(x.rid === 'birmingham' ? live(x.y, [['Wragge & Co.', 0, 2014], ['Pinsent & Co.', 0, 1995]]) : []), ...(x.rid === 'manchester' ? live(x.y, [['Addleshaw Sons & Latham', 0, 1997], ['Addleshaw Goddard', 2003]]) : []),
    ...(x.rid === 'london' ? [`a set of barristers' chambers in the Temple`, ...live(x.y, [['Slaughter and May', 1889], ['Freshfields', 0, 2000], ['Freshfields Bruckhaus Deringer', 2000], ['Linklaters & Paines', 1920, 1998], ['Linklaters', 1998],
      ['Allen & Overy', 1930], ['Clifford-Turner', 1900, 1987], ['Coward Chance', 1900, 1987], ['Clifford Chance', 1987], ['Herbert Smith', 1882]])] : [])],
  IE: (x) => [`${x.A} & ${x.B}, Solicitors`, `${x.A} & Co., Solicitors`, `${x.A} & Son, Solicitors`,
    ...(x.rid === 'dublin' ? live(x.y, [['Arthur Cox & Co.', 1920], ['A. & L. Goodbody'], ['William Fry'], ['McCann FitzGerald', 1973], ['Matheson Ormsby Prentice', 1966, 2011], ['Matheson', 2011]]) : [])],
  AU: (x) => [x.y < 1990 ? `${x.A}, ${x.B} & Co., Solicitors` : `${x.A} ${x.B} Lawyers`, `${x.A} & ${x.B}, Barristers and Solicitors`,
    ...(x.rid === 'sydney' ? live(x.y, [['Allen Allen & Hemsley', 0, 2001], ['Allens Arthur Robinson', 2001, 2012], ['Freehill, Hollingdale & Page', 1966, 1992], ['Freehills', 1992, 2012], ['Herbert Smith Freehills', 2012], ['Clayton Utz'], ['Mallesons Stephen Jaques', 1987, 2012], ['King & Wood Mallesons', 2012]]) : []),
    ...(x.rid === 'melbourne' ? live(x.y, [['Arthur Robinson & Co.', 0, 2001], ['Blake & Riggall', 0, 1989], ['Corrs Chambers Westgarth', 1989], ['Minter Ellison', 1987]]) : [])],
  NZ: (x) => [`${x.A} ${x.B}, Barristers and Solicitors`, `${x.A}, ${x.B} & Co., Barristers and Solicitors`,
    ...(x.rid === 'auckland' ? ['Russell McVeagh', ...live(x.y, [['Simpson Grierson', 1980]])] : []), ...(x.rid === 'wellington' ? ['Bell Gully', 'Chapman Tripp'] : [])],
  CA: (x) => (x.prov === 'CA-QC' ? [`${x.A}, ${x.B} & Associés, avocats`, `${x.A} ${x.B}, avocats`, ...(x.rid === 'montreal' ? live(x.y, [['Ogilvy Renault', 0, 2011], ['Stikeman Elliott', 1952]]) : [])]
    : [`${x.A}, ${x.B} & ${x.C}, Barristers & Solicitors`, `${x.A} & ${x.B}, Barristers & Solicitors`, ...(x.y >= 2000 ? [`${x.A} ${x.B} LLP`] : []),
      ...(x.rid === 'toronto' ? live(x.y, [['Osler, Hoskin & Harcourt'], ['Blake, Cassels & Graydon'], ['McCarthy & McCarthy', 0, 1990], ['McCarthy Tétrault', 1990], ['Tory, Tory, DesLauriers & Binnington', 1941, 1996], ['Torys', 1996]]) : []),
      ...(x.rid === 'calgary' ? live(x.y, [['Bennett Jones', 1922]]) : []), ...(x.rid === 'halifax' ? ['McInnes Cooper', ...live(x.y, [['Stewart McKelvey', 1990]])] : []), ...(x.rid === 'vancouver' ? live(x.y, [['Farris & Co.', 1903]]) : [])]),
  ZA: (x) => [`${x.A} & ${x.B}, Attorneys`, `${x.A}, ${x.B} & ${x.C}, Attorneys, Notaries and Conveyancers`, ...(x.y >= 1980 ? [`${x.A} ${x.B} Inc.`] : []),
    ...(x.rid === 'johannesburg' ? live(x.y, [['Webber Wentzel'], ['Bowman Gilfillan'], ['Werksmans', 1960], ['Deneys Reitz', 1925, 2014], ['Edward Nathan & Friedland', 1970, 2006], ['Edward Nathan Sonnenbergs (ENS)', 2006]]) : []),
    ...(x.rid === 'capetown' ? live(x.y, [['Sonnenberg Hoffmann & Galombik', 0, 2006]]) : []), ...(x.rid === 'durban' ? ['Shepstone & Wylie'] : [])],
};

/** The big accountancy firms, as their mergers named them. */
const BIG_ACCOUNTANTS = [['Price Waterhouse & Co.', 0, 1998], ['Cooper Brothers & Co.', 0, 1973], ['Coopers & Lybrand', 1973, 1998], ['PricewaterhouseCoopers', 1998, 2010], ['PwC', 2010],
  ['Deloitte, Plender, Griffiths & Co.', 1905, 1960], ['Deloitte & Co.', 1960, 1990], ['Touche Ross & Co.', 1960, 1990], ['Deloitte & Touche', 1990, 2003], ['Deloitte', 2003],
  ['Peat, Marwick, Mitchell & Co.', 1925, 1987], ['KPMG Peat Marwick', 1987, 1999], ['KPMG', 1999], ['Whinney, Smith & Whinney', 1894, 1965], ['Whinney Murray & Co.', 1965, 1979], ['Ernst & Whinney', 1979, 1989],
  ['Ernst & Young', 1989, 2013], ['EY', 2013], ['Arthur Andersen & Co.', 1957, 2002], ['Grant Thornton', 1986]];
const ACCOUNTANTS = {
  GB: (x) => [`${x.A}, ${x.B} & Co., Chartered Accountants`, `${x.A} & ${x.B}, Chartered Accountants`, `a firm of chartered accountants in ${x.c}`, ...(x.y >= 2000 ? [`${x.A} ${x.B} LLP, Chartered Accountants`] : [])],
  IE: (x) => [`${x.A} & Co., Chartered Accountants`, `a firm of chartered accountants in ${x.c}`, ...live(x.y, [['Craig Gardner & Co.', 0, 1990], ['Stokes Kennedy Crowley', 1972, 1999]])],
  AU: (x) => [`${x.A}, ${x.B} & Co., Chartered Accountants`, `a firm of chartered accountants in ${x.c}`],
  NZ: (x) => [`${x.A} ${x.B}, Chartered Accountants`, `a firm of chartered accountants in ${x.c}`],
  CA: (x) => [x.y < 2013 ? `${x.A} ${x.B}, Chartered Accountants` : `${x.A} ${x.B} LLP, Chartered Professional Accountants`, ...(x.prov === 'CA-QC' ? [`${x.A} ${x.B}, comptables agréés`] : []),
    ...live(x.y, [['Clarkson, Gordon & Co.', 1913, 1989], ['Thorne Riddell', 1958, 1986], ['Peat Marwick Thorne', 1989, 1999]])],
  ZA: (x) => [`${x.A}, ${x.B} & Co., Chartered Accountants (SA)`, `a firm of chartered accountants in ${x.c}`, ...live(x.y, [['Kessel Feinstein', 1950, 1999]])],
};

const BROADCAST = {
  GB: (x) => [...(x.y >= 1922 ? [x.y < 1927 ? 'the British Broadcasting Company' : GB_BBC[x.rid] ?? 'the BBC'] : []), ...live(x.y, GB_BBC_LOCAL[x.rid] ?? []),
    ...live(x.y, GB_TV[GB_AREA[x.rid]] ?? []), ...live(x.y, GB_RADIO[x.rid] ?? [])],
  IE: (x) => [...live(x.y, [['2RN', 1926, 1937], ['Radio Éireann', 1937, 1961], ['Radio Telefís Éireann', 1961, 1995], ['RTÉ', 1995], ['TV3', 1998], ['Today FM', 1997]]), ...(x.rid === 'dublin' ? live(x.y, [['98FM', 1989]]) : [])],
  AU: (x) => [...live(x.y, [['the Australian Broadcasting Commission', 1932, 1983], ['the ABC', 1983]]), ...live(x.y, ({
    sydney: [['2GB', 1926], ['2UE', 1925], ['TCN-9', 1956], ['ATN-7', 1956], ['TEN-10', 1965]], melbourne: [['3AW', 1932], ['GTV-9', 1957], ['HSV-7', 1956], ['ATV-0', 1964]],
    brisbane: [['4BC', 1930], ['QTQ-9', 1959], ['BTQ-7', 1959]], adelaide: [['5DN', 1925], ['NWS-9', 1959]], perth: [['6PR', 1931], ['TVW-7', 1959]] })[x.rid] ?? [])],
  NZ: (x) => [...live(x.y, [['the New Zealand Broadcasting Service', 1936, 1962], ['the New Zealand Broadcasting Corporation', 1962, 1975], ['Television New Zealand', 1975], ['Radio New Zealand', 1975], ['TV3', 1989], ['Radio Hauraki', 1970]])],
  CA: (x) => (x.prov === 'CA-QC' ? live(x.y, [['CKAC', 1922], ['Radio-Canada', 1936], ['Télé-Métropole', 1961, 1990], ['TVA', 1990]]) : [...live(x.y, [['the Canadian Radio Broadcasting Commission', 1932, 1936], ['the CBC', 1936], ['CTV', 1961], ['Global Television', 1974]]),
    ...live(x.y, ({ toronto: [['CFRB', 1927], ['Citytv', 1972]], vancouver: [['CKNW', 1944]], calgary: [['CFCN', 1922]], halifax: [['CHNS', 1926]] })[x.rid] ?? [])]),
  ZA: (x) => [...live(x.y, [['the African Broadcasting Company', 1927, 1936], ['the SABC', 1936], ['M-Net', 1986], ['e.tv', 1998]]), ...(x.rid === 'johannesburg' ? live(x.y, [['Radio 702', 1980]]) : [])],
};
const PRESS = {
  GB: (x) => [...live(x.y, GB_PAPERS[x.rid] ?? []), ...(x.rid === 'london' ? live(x.y, GB_NATIONALS) : x.rid === 'manchester' ? live(x.y, GB_NATIONALS).slice(0, 4) : []),
    ...(GB_PAPERS[x.rid] ? [] : [`the ${x.c} Advertiser`, `the ${x.c} Gazette`])],
  IE: (x) => [...(x.rid === 'dublin' ? live(x.y, [['The Irish Times'], ['the Freeman\'s Journal', 0, 1924], ['the Irish Independent', 1905], ['the Irish Press', 1931, 1995], ['the Evening Herald', 1891], ['the Evening Press', 1954, 1995], ['the Sunday Independent', 1905], ['the Sunday Tribune', 1980, 2011], ['the Sunday Business Post', 1989]])
    : [...live(x.y, IE_PAPERS[x.rid] ?? []), `the ${x.c} Champion`])],
  AU: (x) => [...live(x.y, ({
    sydney: [['The Sydney Morning Herald'], ['The Daily Telegraph', 1879], ['The Sun', 1910, 1988], ['the Daily Mirror', 1941, 1990], ['The Bulletin', 1880, 2008], ['The Australian', 1964], ['The Australian Financial Review', 1951], ['Australian Associated Press', 1935]],
    melbourne: [['The Age'], ['The Argus', 0, 1957], ['The Herald', 0, 1990], ['The Sun News-Pictorial', 1922, 1990], ['the Herald Sun', 1990]], brisbane: [['The Brisbane Courier', 0, 1933], ['The Courier-Mail', 1933], ['The Telegraph', 0, 1988]],
    perth: [['The West Australian'], ['the Daily News', 0, 1990]], adelaide: [['The Advertiser'], ['The Register', 0, 1931], ['The News', 1923, 1992]], canberra: [['The Canberra Times', 1926]], darwin: [['the Northern Territory News', 1952]],
    hobart: [['The Mercury']], launceston: [['The Examiner']], townsville: [['the Townsville Bulletin']], brokenhill: [['the Barrier Miner', 0, 1974], ['the Barrier Daily Truth', 1908]], dubbo: [['the Daily Liberal']], mildura: [['the Sunraysia Daily', 1920]],
    kalgoorlie: [['the Kalgoorlie Miner']], toowoomba: [['The Chronicle']], bundaberg: [['the NewsMail']], waggawagga: [['The Daily Advertiser']], geraldton: [['the Geraldton Guardian']] })[x.rid] ?? [[`the ${x.c} Advertiser`], [`the ${x.c} Times`]])],
  NZ: (x) => [...live(x.y, ({
    auckland: [['The New Zealand Herald'], ['the Auckland Star', 0, 1991], ['the Sunday Star-Times', 1994], ['the New Zealand Press Association']], wellington: [['The Dominion', 1907, 2002], ['The Evening Post', 0, 2002], ['The Dominion Post', 2002]],
    christchurch: [['The Press'], ['The Star']], dunedin: [['the Otago Daily Times'], ['the Evening Star', 0, 1979]], hamilton: [['the Waikato Times']], tauranga: [['the Bay of Plenty Times']], gisborne: [['The Gisborne Herald']], westport: [['the Westport News']],
    invercargill: [['The Southland Times']], gore: [['The Ensign']], whanganui: [['the Wanganui Chronicle']], ashburton: [['the Ashburton Guardian']] })[x.rid] ?? [[`the ${x.c} News`]])],
  CA: (x) => [...live(x.y, ({
    toronto: [['The Globe', 0, 1936], ['The Mail and Empire', 1895, 1936], ['The Globe and Mail', 1936], ['the Toronto Daily Star', 0, 1971], ['the Toronto Star', 1971], ['The Telegram', 0, 1971], ['the Toronto Sun', 1971], ['the National Post', 1998], ['Maclean\'s', 1905], ['The Canadian Press', 1917]],
    ottawa: [['the Ottawa Citizen'], ['the Ottawa Journal', 0, 1980], ['Le Droit', 1913]], montreal: [['The Gazette'], ['the Montreal Star', 0, 1979], ['La Presse'], ['Le Devoir', 1910]], vancouver: [['The Vancouver Sun', 1912], ['The Province']],
    calgary: [['the Calgary Herald']], halifax: [['the Halifax Herald', 0, 1949], ['The Chronicle-Herald', 1949]], moosejaw: [['the Moose Jaw Times-Herald']], whitehorse: [['the Whitehorse Star']], kamloops: [['the Kamloops Daily News']],
    thunderbay: [['the Port Arthur News-Chronicle', 0, 1972], ['The Chronicle-Journal', 1972]], reddeer: [['the Red Deer Advocate']], medicinehat: [['the Medicine Hat News']], princegeorge: [['The Prince George Citizen']], princealbert: [['the Prince Albert Daily Herald']],
    yarmouth: [['The Vanguard']], antigonish: [['The Casket']], ca_stjohns: [['The Evening Telegram']], timmins: [['The Daily Press']], kenora: [['the Kenora Miner and News']], grandeprairie: [['the Daily Herald-Tribune']], swiftcurrent: [['the Swift Current Sun']],
    rimouski: [['Le Progrès-Écho']], gaspe: [['Le Soleil (Quebec City)']], valdor: [["L'Écho abitibien"]] })[x.rid] ?? [[`the ${x.c} Herald`]])],
  ZA: (x) => [...live(x.y, ({
    johannesburg: [['The Star'], ['the Rand Daily Mail', 1902, 1985], ['the Sunday Times', 1906], ['Die Transvaler', 1937, 1983], ['Beeld', 1974], ['The World', 1932, 1977], ['Drum', 1951], ['The Sowetan', 1981], ['the Weekly Mail', 1985, 1995], ['the Mail & Guardian', 1995], ['Business Day', 1985], ['the South African Press Association', 1938]],
    pretoria: [['the Pretoria News'], ['Die Vaderland', 1936, 1988]], capetown: [['the Cape Times'], ['the Cape Argus'], ['Die Burger', 1915]], durban: [['The Natal Mercury'], ['the Natal Daily News'], ['Ilanga', 1903]],
    gqeberha: [['the Eastern Province Herald'], ['the Evening Post', 1947, 2009]], bloemfontein: [['The Friend', 0, 1985], ['Die Volksblad', 1904]], mthatha: [['the Daily Dispatch']], graaffreinet: [['the Graaff-Reinet Advertiser']], ladysmith: [['the Ladysmith Gazette']] })[x.rid] ?? [[`the ${x.c} Herald`]])],
};

const RETAIL = {
  GB: (x) => [...live(x.y, [[`the ${x.c} Co-operative Society`, 0, 2001], ['the Co-op', 2001], ['Woolworths', 1909, 2009], ['Marks & Spencer'], ['Boots'], ['Sainsbury\'s'], ['Tesco', 1931], ['the Home and Colonial Stores', 0, 1961], ['Lipton\'s', 0, 1982], ['Lewis\'s', 0, 1991],
    ['British Home Stores', 1928, 2016], ['C&A', 1922, 2001], ['Littlewoods', 1937, 2005], ['W. H. Smith'], ['Currys'], ['Fine Fare', 1951, 1988], ['Asda', 1965], ['Safeway', 1962, 2005], ['Argos', 1973], ['Somerfield', 1990, 2009], ['Morrisons', 1980], ['Aldi', 1990], ['Lidl', 1994]]),
    ...live(x.y, [[`${x.A}'s, drapers`, 0, 1970], [`${x.A} & Sons, grocers`, 0, 1975], [`${x.A}'s the ironmongers`, 0, 1980], [`${x.A}'s newsagents`]]),
    ...(x.rid === 'london' ? live(x.y, [['Harrods'], ['Selfridges', 1909], ['John Lewis'], ['Debenhams']]) : [])],
  IE: (x) => [...live(x.y, [['Dunnes Stores', 1944], ['Roches Stores', 1901, 2006], ['Woolworths', 1914, 1984], ['Quinnsworth', 1966, 1997], ['Superquinn', 1960, 2014], ['Tesco Ireland', 1997], ['Penneys', 1969], ['H. Williams', 1960, 1987], ['Lidl', 2000], ['Aldi', 1999]]),
    `${x.A}'s, drapers and outfitters`, `${x.A}'s, grocer and publican`, ...(x.rid === 'dublin' ? live(x.y, [['Clerys'], ['Switzers', 0, 1995], ['Arnotts'], ['Brown Thomas']]) : [])],
  AU: (x) => [...live(x.y, [['Woolworths', 1924], ['Coles', 1914], ['Myer', 1900], ['David Jones'], ['Kmart', 1969], ['Target', 1968], ['Big W', 1976], ['Franklins', 1951, 2011], ['Aldi', 2001]]),
    `${x.A}'s General Store`, ...(x.rid === 'sydney' ? live(x.y, [['Grace Bros', 0, 2004], ['Mark Foy\'s', 0, 1980], ['Anthony Hordern & Sons', 0, 1969]]) : [])],
  NZ: (x) => [...live(x.y, [['the Farmers\' Trading Company', 1909], ['Woolworths', 1929], ['McKenzies', 1910, 1980], ['Foodtown', 1958, 2012], ['New World', 1963], ['Countdown', 1981], ['Pak\'nSave', 1985], ['The Warehouse', 1982], ['DEKA', 1988, 2001]]),
    `${x.A}'s, drapers`, ...(x.rid === 'wellington' ? ['Kirkcaldie & Stains'] : x.rid === 'auckland' ? ['Smith & Caughey\'s'] : x.rid === 'christchurch' ? ['Ballantynes'] : [])],
  CA: (x) => [...live(x.y, [['the Hudson\'s Bay Company store'], ['Eaton\'s', 0, 1999], ['Simpson\'s', 0, 1991], ['Dominion Stores', 1919, 1994], ['Loblaws', 1919], ['Canadian Tire', 1922], ['Zellers', 1931, 2013], ['Woolworth\'s', 1910, 1994], ['Kresge\'s', 1929, 1977], ['Sobeys'], ['Shoppers Drug Mart', 1962], ['Walmart Canada', 1994]]),
    `${x.A}'s General Store`, ...(x.prov === 'CA-QC' ? live(x.y, [['Steinberg\'s', 1917, 1992], ['Dupuis Frères', 0, 1978], ['Provigo', 1969]]) : []), ...(x.prov === 'CA-BC' ? live(x.y, [['Woodward\'s', 0, 1993]]) : [])],
  ZA: (x) => [...live(x.y, [['OK Bazaars', 1927, 1997], ['Stuttafords', 0, 2017], ['Woolworths', 1931], ['Pick n Pay', 1967], ['Checkers', 1956], ['Edgars', 1929], ['Shoprite', 1979], ['Ackermans', 1916], ['Spar', 1963]]),
    `${x.A}'s General Dealer`, ...(x.rid === 'capetown' ? live(x.y, [['Garlicks', 0, 1990]]) : []), ...(x.rid === 'johannesburg' ? ['John Orr\'s'] : [])],
};

/** Works and factories (with the towns they were in). */
const FACTORIES = {
  GB: (x) => [...live(x.y, [[`${x.A} & Sons Ltd`], [`${x.A} Brothers (Engineers) Ltd`], [`the ${x.c} Engineering Works`, 0, 1990], [`${x.A} Group plc`, 1981]]), ...live(x.y, ({
    london: [['Ford (Dagenham)', 1931], ['the Hoover factory, Perivale', 1932, 1987], ['EMI (Hayes)', 1931, 1990], ['Tate & Lyle (Silvertown)', 1921]], manchester: [['Metropolitan-Vickers (Trafford Park)', 1919, 1960], ['AEI (Trafford Park)', 1960, 1967], ['Ferranti', 0, 1993], ['Kellogg\'s (Trafford Park)', 1938], ['Avro (Chadderton)', 1910, 1963]],
    birmingham: [['the Austin Motor Company (Longbridge)', 1905, 1952], ['the British Motor Corporation (Longbridge)', 1952, 1968], ['British Leyland (Longbridge)', 1968, 1986], ['Rover Group (Longbridge)', 1986, 2000], ['MG Rover (Longbridge)', 2000, 2005], ['Cadbury Brothers (Bournville)', 1879], ['the Birmingham Small Arms Company', 0, 1973], ['Dunlop (Fort Dunlop)', 1916, 1990], ['Jaguar Land Rover (Castle Bromwich)', 2008]],
    oxford: [['Morris Motors (Cowley)', 1913, 1968], ['British Leyland (Cowley)', 1968, 1986], ['Rover (Cowley)', 1986, 2000], ['BMW (Plant Oxford)', 2001]], glasgow: [['John Brown & Company (Clydebank)', 0, 1968], ['Upper Clyde Shipbuilders', 1968, 1971], ['the North British Locomotive Company', 1903, 1962], ['Singer (Clydebank)', 1884, 1980], ['Yarrow Shipbuilders', 0, 1985]],
    edinburgh: [['Ferranti (Crewe Toll)', 1943, 1993], ['the North British Rubber Company', 0, 1966]], belfast: [['Harland and Wolff'], ['Short Brothers', 1937], ['Gallaher\'s tobacco factory', 0, 2017], ['the York Street Flax Spinning Company', 0, 1960]],
    cardiff: [['Guest Keen & Nettlefolds', 1902, 1980], ['Spillers', 0, 1980]], lincoln: [['Ruston & Hornsby', 1918, 1966], ['Ruston & Hornsby (English Electric)', 1966, 1969]], cambridge: [['Pye', 1896, 1980], ['Marshall of Cambridge', 1909]], kendal: [['K Shoes', 0, 2003], ['Provincial Insurance', 1903, 1994]],
    hexham: [['Egger (Hexham)', 1984]], cornwall: [['Holman Brothers (Camborne)', 0, 1968], ['Compair Holman', 1968, 2003]], barnstaple: [['Shapland & Petter', 0, 1990]] })[x.rid] ?? [])],
  IE: (x) => [`${x.A} & Sons Ltd`, `${x.A} Engineering Ltd`, ...live(x.y, ({
    dublin: [['Guinness (St James\'s Gate)'], ['W. & R. Jacob (biscuits)', 0, 2009], ['Jefferson Smurfit & Sons', 1934], ['Intel Ireland (Leixlip)', 1989], ['Irish Ropes (Newbridge)', 1933, 1990]], cork: [['Ford (the Marina)', 1917, 1984], ['Dunlop (Cork)', 1935, 1983], ['Irish Steel (Haulbowline)', 1939, 2001], ['Apple (Hollyhill)', 1980], ['Murphy\'s Brewery']],
    limerick: [['Ranks (Ireland) Ltd, flour millers', 1930, 1983], ['Dell (Raheen)', 1991, 2009], ['Krups (Limerick)', 1970, 1999]], waterford: [['Waterford Glass', 1947, 2009], ['Waterford Crystal', 2010]], galway: [['Digital Equipment (Galway)', 1971, 1993], ['Boston Scientific (Galway)', 1994], ['Medtronic (Galway)', 1999]] })[x.rid] ?? [])],
  AU: (x) => [`${x.A} & Sons Pty Ltd`, `${x.A} Engineering Pty Ltd`, ...live(x.y, [['BHP', 1915, 2001], ['CSR (Colonial Sugar Refining)'], ['Email Ltd', 1934, 2001]]), ...live(x.y, ({
    melbourne: [['Ford Australia (Geelong)', 1925, 2016], ['Holden (Fishermans Bend)', 1936, 2017], ['Toyota Australia (Altona)', 1994, 2017], ['Carlton & United Breweries', 1907]], sydney: [['Arnott\'s Biscuits'], ['Tooth & Co.', 0, 1983], ['Commonwealth Aircraft Corporation', 1936, 1985]],
    adelaide: [['Holden (Woodville)', 1923, 1965], ['Holden (Elizabeth)', 1958, 2017], ['Chrysler Australia (Tonsley Park)', 1964, 1980], ['Mitsubishi Motors Australia', 1980, 2008]], brisbane: [['Evans Deakin & Co.', 1910, 1990]], hobart: [['Cadbury (Claremont)', 1922], ['the Electrolytic Zinc Company (Risdon)', 1916, 1991]] })[x.rid] ?? [])],
  NZ: (x) => [`${x.A} & Sons Ltd`, `${x.A} Engineering Ltd`, ...live(x.y, [['Fletcher Holdings', 1940, 1981], ['Fletcher Challenge', 1981, 2001], ['Fisher & Paykel', 1934], ['Lion Breweries', 1977], [`the ${x.c} freezing works`, 0, 1995]]), ...live(x.y, ({
    auckland: [['NZ Steel (Glenbrook)', 1968], ['the Auckland Gas Company', 0, 1990]], taupo: [['Tasman Pulp and Paper (Kawerau)', 1955, 2005]], christchurch: [['the Canterbury Frozen Meat Company', 0, 1990]], dunedin: [['Hillside Workshops', 0, 2012], ['Cadbury (Dunedin)', 1930, 2018]],
    invercargill: [['the Tiwai Point aluminium smelter', 1971]] })[x.rid] ?? [])],
  CA: (x) => [`${x.A} Manufacturing Co. Ltd`, x.prov === 'CA-QC' ? `${x.A} et Fils Ltée` : `${x.A} & Sons Ltd`, ...live(x.y, ({
    toronto: [['Massey-Harris', 0, 1953], ['Massey-Ferguson', 1958, 1986], ['de Havilland Canada (Downsview)', 1928], ['Avro Canada (Malton)', 1945, 1962], ['General Motors of Canada (Oshawa)', 1918], ['Northern Electric', 1914, 1976], ['Northern Telecom', 1976, 1999], ['Nortel', 1999, 2009]],
    montreal: [['Canadian Car & Foundry', 1909, 1965], ['Canadair', 1944, 1986], ['Bombardier', 1942], ['Molson\'s Brewery'], ['Dominion Textile', 1905, 1998], ['Northern Electric (Shearer Street)', 1914, 1976]], ottawa: [['E. B. Eddy Company', 0, 1998]],
    halifax: [['the Halifax Shipyards'], ['Moirs Chocolates', 0, 1975]], calgary: [['Burns & Co. (meat packers)', 1890, 1966]], vancouver: [['the Burrard Dry Dock', 0, 1992], ['B.C. Sugar'], ['MacMillan Bloedel', 1960, 1999]], thunderbay: [['Canadian Car & Foundry (Fort William)', 1912, 1965], ['Abitibi (pulp mill)', 1914]] })[x.rid] ?? [])],
  ZA: (x) => [`${x.A} & Sons (Pty) Ltd`, `${x.A} Engineering (Pty) Ltd`, ...live(x.y, [['AECI', 1924], ['SAB (South African Breweries)'], ['Barlow Rand', 1971, 1993]]), ...live(x.y, ({
    pretoria: [['ISCOR (Pretoria Works)', 1934, 1989], ['ISCOR (privatised)', 1989, 2004], ['ArcelorMittal South Africa', 2004]], johannesburg: [['Sasol (Sasolburg)', 1955], ['Dorbyl', 1970, 2010], ['Murray & Roberts', 1902]],
    gqeberha: [['Ford South Africa (Port Elizabeth)', 1923, 1985], ['General Motors South Africa', 1926, 1986], ['Volkswagen South Africa (Uitenhage)', 1951]], durban: [['Toyota South Africa (Prospecton)', 1972], ['Tongaat Hulett (sugar mill)', 1982], ['Dunlop (Durban)', 1935, 2013]], capetown: [['Fry\'s Chocolate', 0, 1980]] })[x.rid] ?? [])],
};

const FARM = {
  GB: (x) => [...(GB_FARMS[x.rid] ?? ['a family farm near ' + x.c]), ...live(x.y, [['the home farm of a country estate', 0, 1950], ['an agricultural contractor', 1960], ['a large arable concern (agribusiness)', 1980]])],
  IE: (x) => [...(IE_FARMS[x.rid] ?? ['a small farm in the county']), ...live(x.y, [['the local creamery co-op', 1900, 1973], ['Kerry Co-operative Creameries', 1974, 1986], ['Avonmore Creameries', 1973, 1997], ['Glanbia', 1997]])],
  AU: (x) => [...(PROV_FARMS[x.prov] ?? ['a farm in the bush']), ...live(x.y, [['the Australian Agricultural Company'], ['S. Kidman & Co.', 1899], ['Elder Smith & Co. (stock and station agents)', 1888, 1981], ['Dalgety (stock and station agents)', 0, 1993]])],
  NZ: (x) => [...(PROV_FARMS[x.prov] ?? ['a sheep farm']), ...live(x.y, [['the local dairy co-operative', 0, 2001], ['Fonterra', 2001], ['a kiwifruit orchard in the Bay of Plenty', 1970]])],
  CA: (x) => [...(PROV_FARMS[x.prov] ?? ['a family farm']), ...live(x.y, x.prov === 'CA-SK' ? [['the Saskatchewan Wheat Pool', 1924, 2007], ['United Grain Growers', 1917, 2001]] : x.prov === 'CA-AB' ? [['the Alberta Wheat Pool', 1923, 1998], ['United Grain Growers', 1917, 2001]] : [])],
  ZA: (x) => [...ZA_FARMS(x.prov, x.y), ...live(x.y, [['the local farmers\' co-operative (koöperasie)'], ...(x.prov === 'ZA-WC' ? [['the KWV (wine co-operative)', 1918]] : [])])],
};

const HOTELS = {
  GB: (x) => [`the Grand Hotel, ${x.c}`, `the Station Hotel, ${x.c}`, `the ${x.A} Arms`, ...live(x.y, [['Trust Houses', 1903, 1970], ['Trust House Forte', 1970, 1991], ['Forte', 1991, 1996], ['Butlin\'s', 1936], ['Pontins', 1946], ['Holiday Inn', 1970], ['Travelodge', 1985], ['Travel Inn', 1987, 2004], ['Premier Inn', 2004],
    ['the railway company\'s hotel', 0, 1948], ['British Transport Hotels', 1948, 1983]]), ...(x.rid === 'london' ? live(x.y, [['the Savoy', 1889], ['the Ritz', 1906], ['the Dorchester', 1931], ['Claridge\'s']]) : []), ...(x.rid === 'edinburgh' ? ['the North British Hotel', 'the Caledonian Hotel'] : [])],
  IE: (x) => [`the ${x.c} Arms Hotel`, `the Imperial Hotel, ${x.c}`, ...live(x.y, [[`the Great Southern Hotel, ${x.c}`, 1900, 2006], ['Jurys Hotels', 1960], ['Butlin\'s Mosney', 1948, 1982]]), ...(x.rid === 'dublin' ? ['the Shelbourne', 'the Gresham'] : [])],
  AU: (x) => [`the Royal Hotel, ${x.c}`, `the Railway Hotel, ${x.c}`, `the Commercial Hotel, ${x.c}`, ...live(x.y, [['Travelodge Australia', 1959, 2000], ['the Hilton', 1974]]),
    ...(x.rid === 'sydney' ? live(x.y, [['the Hotel Australia', 1891, 1971], ['the Wentworth', 1966]]) : []), ...(x.rid === 'melbourne' ? live(x.y, [['the Windsor'], ['the Southern Cross Hotel', 1962, 1995]]) : []), ...(x.rid === 'brisbane' ? live(x.y, [['Lennons Hotel', 1941]]) : [])],
  NZ: (x) => [`the Grand Hotel, ${x.c}`, `the Railway Hotel, ${x.c}`, ...live(x.y, [['Southern Cross Hotels', 1972, 2000], ['the Chateau Tongariro', 1929]]), ...(x.prov === 'NZ-CAN' ? ['the Hermitage (Aoraki)'] : [])],
  CA: (x) => [`the ${x.c} Hotel`, ...live(x.y, [['Canadian Pacific Hotels', 1886, 1999], ['Fairmont Hotels', 1999], ['CN Hotels', 1923, 1988], ['Four Seasons', 1961]]), ...live(x.y, ({
    toronto: [['the Royal York', 1929], ['the King Edward Hotel']], montreal: [['the Ritz-Carlton Montreal', 1912], ['the Queen Elizabeth Hotel', 1958]], ottawa: [['the Château Laurier', 1912]], vancouver: [['the Hotel Vancouver']], calgary: [['the Palliser', 1914]], halifax: [['the Lord Nelson Hotel', 1928], ['the Nova Scotian', 1930]] })[x.rid] ?? [])],
  ZA: (x) => [`the ${x.c} Hotel`, `the Royal Hotel, ${x.c}`, ...live(x.y, [['Southern Sun Hotels', 1969], ['Sun International', 1983], ['Protea Hotels', 1984], ['Holiday Inn', 1970]]),
    ...(x.rid === 'capetown' ? live(x.y, [['the Mount Nelson', 1899]]) : []), ...(x.rid === 'johannesburg' ? live(x.y, [['the Carlton Hotel', 1906, 1964], ['the Carlton Hotel', 1972, 1997]]) : []), ...(x.rid === 'durban' ? ['the Edward Hotel'] : [])],
};

const KITCHENS = {
  GB: (x) => [`the kitchens of the Grand Hotel, ${x.c}`, `a fish and chip shop in ${x.c}`, ...live(x.y, [['a Lyons tea shop', 1894, 1981], ['a Lyons Corner House', 1909, 1977], ['an ABC tea room', 0, 1955], ['the works canteen', 1915, 1990], ['a British Restaurant', 1940, 1947], ['a Wimpy Bar', 1954],
    ['a Berni Inn', 1956, 1995], ['a Little Chef', 1958, 2018], ['PizzaExpress', 1965], [`a curry house in ${x.c}`, 1965], ['a gastropub', 1991], ['Pret A Manger', 1986], ['Wagamama', 1992]])],
  IE: (x) => [`the kitchens of the ${x.c} Arms Hotel`, `a chipper in ${x.c}`, ...live(x.y, [['Bewley\'s Café', 1894], ['Jurys Hotels', 1960], ['Supermac\'s', 1978], ['Eddie Rockets', 1989]])],
  AU: (x) => [`a café in ${x.c}`, `the counter-lunch kitchen of the Royal Hotel, ${x.c}`, ...live(x.y, [['a milk bar', 1932, 2000], [`the ${x.c} RSL club`, 1920], [`a Chinese restaurant in ${x.c}`], ['a Greek café', 1915, 1980], ['McDonald\'s', 1971], ['Hungry Jack\'s', 1971]])],
  NZ: (x) => [`a tearoom in ${x.c}`, `the ${x.c} pie cart`, ...live(x.y, [['a milk bar', 1935, 2000], [`the ${x.c} RSA club`, 1920], ['McDonald\'s', 1976], [`a café in ${x.c}`, 1990]])],
  CA: (x) => [`a lunch counter in ${x.c}`, `a Chinese café in ${x.c}`, ...live(x.y, [['the dining car service of the railway', 0, 1978], ['Tim Hortons', 1964], ['Swiss Chalet', 1954], ['Harvey\'s', 1959]]), ...(x.prov === 'CA-QC' ? [`a casse-croûte in ${x.c}`, `a brasserie in ${x.c}`] : [])],
  ZA: (x) => [`a tearoom in ${x.c}`, `the kitchens of the ${x.c} Hotel`, ...live(x.y, [['Wimpy', 1967], ['the Spur Steak Ranch', 1967], ['Nando\'s', 1987], [`a Portuguese restaurant in ${x.c}`, 1960]])],
};

/** Builders and the building trades. */
const BUILDERS = {
  GB: (x) => [`${x.A} & Sons, Builders`, `${x.A} Brothers (Building Contractors) Ltd`, ...live(x.y, [['John Laing & Son'], ['George Wimpey & Co.', 1880, 2007], ['Taylor Woodrow', 1921, 2007], ['Costain'], ['Sir Robert McAlpine'], ['Bovis'], ['Balfour Beatty', 1909], ['Mowlem', 0, 2006], ['Barratt Developments', 1958], ['Carillion', 1999, 2018]])],
  IE: (x) => [`${x.A} & Sons, Builders`, `${x.A} Construction Ltd`, ...live(x.y, [['John Sisk & Son'], ['P. J. Hegarty & Sons'], ['McInerney Contracting', 1909, 2013], ['G & T Crampton']])],
  AU: (x) => [`${x.A} & Sons, Builders`, `${x.A} Constructions Pty Ltd`, ...live(x.y, [['A. V. Jennings', 1932], ['Leighton Contractors', 1949], ['Concrete Constructions', 1916, 2000], ['Lend Lease', 1958], ['Multiplex', 1962], ['Hooker Corporation', 1928, 1989]])],
  NZ: (x) => [`${x.A} & Sons, Builders`, `${x.A} Construction Ltd`, ...live(x.y, [['Fletcher Construction', 1909], ['Downer & Co.', 1933], ['Hawkins Construction', 1946]])],
  CA: (x) => [`${x.A} Construction Ltd`, x.prov === 'CA-QC' ? `${x.A} et Fils, entrepreneurs` : `${x.A} & Sons, Contractors`, ...live(x.y, [['Poole Construction (PCL)', 1906], ['EllisDon', 1951], ['Dominion Bridge', 1882, 1998], ['Pigott Construction', 1870, 1980]])],
  ZA: (x) => [`${x.A} & Sons, Builders`, `${x.A} Construction (Pty) Ltd`, ...live(x.y, [['Murray & Roberts', 1902], ['LTA', 1889, 2000], ['Group Five', 1974], ['Grinaker', 1964, 2000], ['Basil Read', 1952]])],
};
/** One firm, named for its trade. */
const CRAFT = {
  plumbing: (x) => [`${x.A} & Son, Plumbers`, ...(x.y >= 1950 ? [`${x.A} Plumbing & Heating`] : [`${x.A} & Son, Plumbers and Gasfitters`])],
  hvac: (x) => [`${x.A} Heating & Ventilating Ltd`, `${x.A} & Son, Heating Engineers`],
  carpentry: (x) => [x.cc === 'GB' && ['GB-SCT', 'GB-NIR'].includes(x.prov) ? `${x.A} & Son, Joiners` : `${x.A} & Son, Joiners and Carpenters`, `${x.A} & Sons, Builders`],
  trades: (x) => (x.y >= 1905 ? [`${x.A} Electrical Contractors`, `${x.A} & Sons, Builders`] : [`${x.A} & Sons, Builders`, `${x.A}, Plasterers and Decorators`]),
};

/** Consulting engineers. */
const CONSULTANTS = {
  GB: (x) => [`${x.A} & Partners, Consulting Engineers`, ...live(x.y, [['C. S. Meik & Halcrow', 1923, 1941], ['Sir William Halcrow & Partners', 1941, 1998], ['Halcrow', 1998, 2011], ['Ove Arup & Partners', 1946, 1999], ['Arup', 1999], ['Mott, Hay & Anderson', 1902, 1989], ['Mott MacDonald', 1989],
    ['Rendel, Palmer & Tritton', 1921, 2000], ['Sir Alexander Gibb & Partners', 1922, 1989], ['Freeman Fox & Partners', 1938, 1987], ['W. S. Atkins & Partners', 1938, 1990], ['WS Atkins', 1990]])],
  IE: (x) => [`${x.A} & Partners, Consulting Engineers`, ...live(x.y, [['Nicholas O\'Dwyer & Partners', 1946], ['RPS Consulting Engineers', 1970]])],
  AU: (x) => [`${x.A} & Partners, Consulting Engineers`, ...live(x.y, [['Gutteridge Haskins & Davey', 1928, 2000], ['GHD', 2000], ['Maunsell & Partners', 1955, 2008], ['Cardno', 1945], ['Coffey', 1959]])],
  NZ: (x) => [`${x.A} & Partners, Consulting Engineers`, ...live(x.y, [['Beca Carter Hollings & Ferner', 1960, 1999], ['Beca', 1999], ['Tonkin & Taylor', 1959], ['Holmes Consulting', 1955]])],
  CA: (x) => [x.prov === 'CA-QC' ? `${x.A} ${x.B}, ingénieurs-conseils` : `${x.A} & Associates, Consulting Engineers`, ...live(x.y, [['Surveyer, Nenniger & Chênevert (SNC)', 1946, 1991], ['SNC-Lavalin', 1991], ['H. G. Acres & Co.', 1924, 2000], ['Lavalin', 1972, 1991]])],
  ZA: (x) => [`${x.A} & Partners, Consulting Engineers`, ...live(x.y, [['Ninham Shand', 1936], ['BKS', 1965, 2012], ['Africon', 1950, 2009]])],
};
/** Engineering industries, by discipline. */
const ENG_INDUSTRY = {
  electricalEng: {
    GB: (y) => live(y, [['the British Thomson-Houston Company', 1896, 1959], ['the General Electric Company (GEC)', 1889], ['English Electric', 1918, 1968], ['Marconi', 1897, 2006], ['Ferranti', 0, 1993], ['Plessey', 1917, 1989], ['EMI', 1931], ['AEI', 1928, 1967], ['ARM Holdings', 1990]]),
    AU: (y) => live(y, [['AWA (Amalgamated Wireless Australasia)', 1913], ['Email Ltd', 1934, 2001]]), CA: (y) => live(y, [['Northern Electric', 1914, 1976], ['Northern Telecom', 1976, 1999], ['Nortel', 1999, 2009], ['Canadian General Electric', 1892, 2003]]),
    ZA: (y) => live(y, [['Siemens South Africa'], ['Altech', 1980]]), IE: (y) => live(y, [['Ericsson Ireland (Athlone)', 1957], ['Intel Ireland', 1989]]), NZ: (y) => live(y, [['Fisher & Paykel', 1934]]),
  },
  aerospaceEng: {
    GB: (y) => live(y, [['Vickers', 1911, 1960], ['A. V. Roe & Co. (Avro)', 1910, 1963], ['de Havilland', 1920, 1960], ['the Bristol Aeroplane Company', 1910, 1960], ['Hawker Siddeley', 1935, 1977], ['the British Aircraft Corporation', 1960, 1977], ['British Aerospace', 1977, 1999], ['BAE Systems', 1999],
      ['Rolls-Royce (aero engines)', 1915], ['Westland Aircraft', 1915], ['Short Brothers', 1908], ['Vickers, Sons & Maxim', 1897, 1911]]),
    AU: (y) => live(y, [['the Commonwealth Aircraft Corporation', 1936, 1985], ['Hawker de Havilland', 1960], ['de Havilland Australia', 1927, 1960]]), CA: (y) => live(y, [['Canadian Vickers', 1911, 1944], ['de Havilland Canada', 1928], ['Avro Canada', 1945, 1962], ['Canadair', 1944, 1986], ['Bombardier Aerospace', 1986], ['Pratt & Whitney Canada', 1928]]),
    ZA: (y) => live(y, [['Atlas Aircraft Corporation', 1965, 1992], ['Denel Aviation', 1992]]), NZ: (y) => live(y, [['Air New Zealand Engineering', 1965], ['Safe Air', 1951]]), IE: (y) => live(y, [['Aer Lingus Engineering', 1936], ['Team Aer Lingus', 1990, 1998]]),
  },
  chemicalEng: {
    GB: (y) => live(y, [['Brunner Mond & Co.', 0, 1926], ['Nobel\'s Explosives', 0, 1926], ['ICI', 1926, 2008], ['Courtaulds'], ['Fisons'], ['Glaxo', 1935, 2000], ['GlaxoSmithKline', 2000], ['Shell (Stanlow refinery)', 1949], ['Esso (Fawley refinery)', 1951], ['BP (Grangemouth)', 1954], ['Lever Brothers (Port Sunlight)', 0, 1930], ['Unilever', 1930]]),
    AU: (y) => live(y, [['ICIANZ', 1928, 1971], ['ICI Australia', 1971, 1997], ['Orica', 1997], ['CSR Chemicals']]), CA: (y) => live(y, [['Canadian Industries Ltd (CIL)', 1927, 1988], ['Polymer Corporation (Sarnia)', 1942, 1988], ['Imperial Oil (Sarnia refinery)'], ['Du Pont Canada', 1954]]),
    ZA: (y) => live(y, [['AECI', 1924], ['Sasol', 1950], ['Sentrachem', 1967, 1997]]), IE: (y) => live(y, [['Pfizer (Ringaskiddy)', 1969], ['Nitrigin Éireann Teoranta (NET)', 1961, 1987]]), NZ: (y) => live(y, [['ICI New Zealand', 1950, 1997], ['Methanex (Motunui)', 1993]]),
  },
  petroleumEng: {
    GB: (y) => live(y, [['the Anglo-Persian Oil Company', 1909, 1935], ['the Anglo-Iranian Oil Company', 1935, 1954], ['BP', 1954], ['Shell'], ['the Burmah Oil Company'], ['Enterprise Oil', 1983, 2002], ['Lasmo', 1971, 2001]]),
    AU: (y) => live(y, [['Woodside', 1954], ['Santos', 1954], ['Esso Australia (Bass Strait)', 1965]]), CA: (y) => live(y, [['Imperial Oil'], ['Shell Canada'], ['Gulf Canada', 1969, 1985], ['Dome Petroleum', 1950, 1988], ['Suncor', 1979]]),
    ZA: (y) => live(y, [['Sasol', 1950], ['Soekor', 1965, 1999]]), NZ: (y) => live(y, [['Shell BP Todd (Kapuni)', 1959, 1990]]), IE: (y) => live(y, [['Marathon (Kinsale Head)', 1971], ['Tullow Oil', 1985]]),
  },
  nuclearEng: {
    GB: (y) => live(y, [['English Electric-Babcock', 1955, 1969], ['The Nuclear Power Group', 1960, 1975], ['Rolls-Royce (submarine reactors)', 1959], ['British Energy', 1996, 2009], ['EDF Energy', 2009]]),
    CA: (y) => live(y, [['Ontario Hydro (nuclear division)', 1960, 1999], ['Ontario Power Generation', 1999], ['Cameco', 1988]]), ZA: (y) => live(y, [['Escom (Koeberg)', 1976, 1987], ['Eskom (Koeberg)', 1987]]), AU: (y) => live(y, [['ANSTO (Lucas Heights)', 1987]]),
  },
};

const BANKS = {
  GB: (x) => [...live(x.y, [['Barclays Bank'], ['Lloyds Bank'], ['the London City and Midland Bank', 1898, 1923], ['the Midland Bank', 1923, 1999], ['HSBC', 1999], ['the National Provincial Bank', 0, 1970], ['the Westminster Bank', 1923, 1970], ['Parr\'s Bank', 0, 1918],
    ['National Westminster Bank', 1970], ['Martins Bank', 1928, 1969], ['the Halifax Building Society', 0, 1997], ['the Abbey National', 1944, 2004], ['the Nationwide Building Society', 1987], [`${x.A} & ${x.B}, stockbrokers`]]),
    ...(x.rid === 'london' ? live(x.y, [['Barings', 0, 1995], ['N. M. Rothschild & Sons'], ['J. Henry Schroder & Co.'], ['Hambros', 0, 1998], ['Kleinwort Benson', 1961], ['S. G. Warburg & Co.', 1946, 1995], ['Morgan Grenfell', 1910, 1999], ['Cazenove & Co.'], ['Lloyd\'s of London (a syndicate)']]) : []),
    ...(x.prov === 'GB-SCT' ? live(x.y, [['the Bank of Scotland'], ['the Royal Bank of Scotland'], ['the Clydesdale Bank'], ['the British Linen Bank', 0, 1971], ['the Commercial Bank of Scotland', 0, 1959]]) : []),
    ...(x.prov === 'GB-NIR' ? live(x.y, [['the Ulster Bank'], ['the Northern Bank'], ['the Belfast Banking Company', 0, 1970], ['the Bank of Ireland']]) : [])],
  IE: (x) => [...live(x.y, [['the Bank of Ireland'], ['the Munster & Leinster Bank', 0, 1966], ['the Provincial Bank of Ireland', 0, 1966], ['the Royal Bank of Ireland', 0, 1966], ['the National Bank', 0, 1966], ['Allied Irish Banks', 1966], ['the Ulster Bank'],
    ['the Irish Permanent Building Society', 1884, 1994], ['Anglo Irish Bank', 1964, 2011], ['J. & E. Davy, stockbrokers', 1926]])],
  AU: (x) => [...live(x.y, [['the Bank of New South Wales', 0, 1982], ['Westpac', 1982], ['the Commercial Banking Company of Sydney', 0, 1982], ['the National Bank of Australasia', 0, 1981], ['National Australia Bank', 1981], ['the Bank of Australasia', 0, 1951], ['the Union Bank of Australia', 0, 1951],
    ['the ANZ Bank', 1951], ['the Commonwealth Bank', 1991], ['Hill Samuel Australia', 1969, 1985], ['Macquarie Bank', 1985], ['J. B. Were & Son', 0, 2002], [`${x.A} & ${x.B}, sharebrokers`]])],
  NZ: (x) => [...live(x.y, [['the Bank of New Zealand'], ['the Bank of New South Wales', 0, 1982], ['Westpac', 1982], ['the National Bank of New Zealand', 0, 2012], ['the ANZ', 1951], ['the Auckland Savings Bank', 1847, 1988], ['ASB Bank', 1988], ['Fay, Richwhite & Co.', 1974, 2000], [`${x.A} ${x.B}, sharebrokers`]])],
  CA: (x) => [...live(x.y, [['the Bank of Montreal'], ['the Royal Bank of Canada', 1901], ['the Canadian Bank of Commerce', 0, 1961], ['the Canadian Imperial Bank of Commerce', 1961], ['the Bank of Nova Scotia'], ['the Bank of Toronto', 0, 1955], ['the Dominion Bank', 0, 1955], ['the Toronto-Dominion Bank', 1955],
    ['Wood Gundy', 1905, 1988], ['Dominion Securities', 1901, 1988], ['RBC Dominion Securities', 1988]]), ...(x.prov === 'CA-QC' ? live(x.y, [['la Banque Canadienne Nationale', 1924, 1979], ['la Banque Nationale du Canada', 1979], ['la Caisse populaire Desjardins', 1900]]) : [])],
  ZA: (x) => [...live(x.y, [['the Standard Bank'], ['Barclays Bank DCO', 1925, 1971], ['Barclays National Bank', 1971, 1987], ['First National Bank', 1987], ['the Netherlands Bank of South Africa', 1888, 1971], ['Nedbank', 1971], ['Volkskas', 1934, 1991], ['Trust Bank', 1955, 1977], ['Absa', 1991],
    ['Investec', 1974], ['Rand Merchant Bank', 1977], [`${x.A} & ${x.B}, stockbrokers (JSE)`]])],
};
const INSURERS = {
  GB: (x) => live(x.y, [['the Prudential'], ['the Pearl Assurance'], ['the Refuge Assurance', 0, 1996], ['the Norwich Union', 0, 2009], ['the Royal Insurance', 0, 1996], ['Commercial Union', 0, 1998], ['General Accident', 1885, 1998], ['Aviva', 2002], ['Legal & General'], ['the Standard Life Assurance Company'], ['Scottish Widows'], ['Direct Line', 1985], ['Lloyd\'s of London (a syndicate)']]),
  IE: (x) => live(x.y, [['Irish Life', 1939], ['New Ireland Assurance', 1918], ['Hibernian Insurance', 1908, 2002], ['the PMPA', 1967, 1983], ['Royal Liver Assurance']]),
  AU: (x) => live(x.y, [['the AMP Society'], ['the National Mutual Life Association', 0, 2000], ['the MLC'], ['the NRMA', 1925], ['QBE Insurance', 1973], ['Suncorp', 1996]]),
  NZ: (x) => live(x.y, [['the AMP Society'], ['the South British Insurance Company', 0, 1981], ['the New Zealand Insurance Company', 0, 1990], ['Tower Insurance', 1990], ['AMI Insurance', 1926]]),
  CA: (x) => live(x.y, [['Sun Life Assurance'], ['the Manufacturers Life (Manulife)'], ['the Great-West Life'], ['the Canada Life'], ['the Mutual Life of Canada', 0, 2000], ['the Co-operators', 1945], ...(x.prov === 'CA-QC' ? [['la Laurentienne', 1938, 1999], ['Desjardins Sécurité financière']] : [])]),
  ZA: (x) => live(x.y, [['Old Mutual'], ['Sanlam', 1918], ['Liberty Life', 1957], ['Santam', 1918], ['Momentum', 1966], ['Discovery', 1992]]),
};

/** Hospitals outside the state's own (voluntary, religious and private). */
const HOSPITALS = {
  GB: (x) => [...live(x.y, [[`the ${x.c} Royal Infirmary`, 0, 1948], [`the ${x.c} Cottage Hospital`, 0, 1948], [`a nursing home in ${x.c}`], [`the ${x.c} Nuffield Hospital`, 1957], ['a BUPA hospital', 1979], ['a Spire hospital', 2007]]), ...(x.rid === 'london' ? live(x.y, [['the London Clinic', 1932], ['King Edward VII\'s Hospital']]) : [])],
  IE: (x) => [...live(x.y, [[`the Bon Secours Hospital, ${x.c}`, 1915], [`the Mercy Hospital, ${x.c}`], [`a nursing home in ${x.c}`]]), ...(x.rid === 'dublin' ? live(x.y, [['the Mater Misericordiae Hospital'], ['St Vincent\'s Hospital'], ['the Adelaide Hospital', 0, 1998], ['the Rotunda'], ['the Blackrock Clinic', 1984]]) : [])],
  AU: (x) => [`the ${x.c} Private Hospital`, `St John of God Hospital, ${x.c}`, ...live(x.y, [['Ramsay Health Care', 1964], ['Healthscope', 1985]]), ...(['sydney', 'melbourne'].includes(x.rid) ? ['St Vincent\'s Hospital'] : []), ...(['sydney', 'brisbane'].includes(x.rid) ? ['the Mater Hospital'] : [])],
  NZ: (x) => [`the ${x.c} private hospital`, ...live(x.y, [['the Mercy Hospital', 1900], ['a Southern Cross hospital', 1961]])],
  CA: (x) => [`the ${x.c} General Hospital`, x.prov === 'CA-QC' ? `l'Hôtel-Dieu de ${x.c}` : `St. Joseph's Hospital, ${x.c}`, ...live(x.y, ({ toronto: [['the Toronto General Hospital'], ['St. Michael\'s Hospital'], ['the Hospital for Sick Children']], montreal: [['the Royal Victoria Hospital'], ['the Montreal General Hospital']], vancouver: [['the Vancouver General Hospital'], ['St. Paul\'s Hospital']] })[x.rid] ?? [])],
  ZA: (x) => [`the ${x.c} Nursing Home`, `the mission hospital near ${x.c}`, ...live(x.y, [['Mediclinic', 1983], ['Netcare', 1996], ['Afrox Healthcare', 1983, 2005], ['Life Healthcare', 2005]])],
};
const CHEMISTS = {
  GB: (x) => [`${x.A}'s the chemist`, ...live(x.y, [['Boots the Chemist'], ['Timothy Whites', 0, 1985], ['Superdrug', 1966], ['the Co-op chemist'], ['Lloydspharmacy', 1997]])],
  IE: (x) => [`${x.A}'s Pharmacy`, `the Medical Hall, ${x.c}`, ...live(x.y, [['Hayes, Conyngham & Robinson', 1897], ['Boots', 1996]])],
  AU: (x) => [`${x.A}'s Pharmacy`, `${x.A}'s Chemist`, ...live(x.y, [['Washington H. Soul Pattinson', 1903], ['Amcal', 1983], ['Priceline Pharmacy', 2000], ['Chemist Warehouse', 2000]])],
  NZ: (x) => [`${x.A}'s Pharmacy`, ...live(x.y, [['Unichem', 1960], ['Life Pharmacy', 1998]])],
  CA: (x) => [x.prov === 'CA-QC' ? `Pharmacie ${x.A}` : `${x.A}'s Drug Store`, ...live(x.y, [['Shoppers Drug Mart', 1962], ['Rexall Drug Stores', 1903], ['Tamblyn\'s', 1904, 1990]]), ...(x.prov === 'CA-QC' ? live(x.y, [['Jean Coutu', 1969]]) : []), ...(x.prov === 'CA-BC' ? live(x.y, [['London Drugs', 1945]]) : [])],
  ZA: (x) => [`${x.A}'s Pharmacy`, ...live(x.y, [['Clicks', 1968], ['Dis-Chem', 1978]])],
};
const ESTATE_AGENTS = {
  GB: (x) => [`${x.A} & ${x.B}, Estate Agents`, ...live(x.y, [['Knight Frank & Rutley', 1896, 1995], ['Knight Frank', 1995], ['Savills'], ['Foxtons', 1981], ['Countrywide', 1986]])],
  IE: (x) => [`${x.A} & ${x.B}, Auctioneers and Estate Agents`, ...live(x.y, [['Lisney', 1934], ['Hamilton Osborne King', 1960, 2007], ['Sherry FitzGerald', 1982]])],
  AU: (x) => [`${x.A} & ${x.B} Real Estate`, ...live(x.y, [['L. J. Hooker', 1928], ['Raine & Horne'], ['Ray White', 1902], ['Richardson & Wrench']])],
  NZ: (x) => [`${x.A} Real Estate`, ...live(x.y, [['Harcourts'], ['Barfoot & Thompson', 1923], ['Bayleys', 1973]])],
  CA: (x) => [x.prov === 'CA-QC' ? `Immeubles ${x.A}` : `${x.A} Realty Ltd`, ...live(x.y, [['A. E. LePage', 1913, 1984], ['Royal LePage', 1984], ['Re/Max', 1977]])],
  ZA: (x) => [`${x.A} Estates`, ...live(x.y, [['Seeff', 1964], ['Pam Golding Properties', 1976]])],
};
const UNDERTAKERS = (x) => [`${x.A} & Sons, Funeral Directors`, ...(x.cc === 'GB' ? live(x.y, [['the Co-operative Funeral Service', 0, 2000], ['Co-op Funeralcare', 2000], ['Dignity', 1994]]) : x.cc === 'ZA' ? live(x.y, [['Avbob', 1918]]) : x.cc === 'CA' ? [`${x.A} Funeral Home`] : [])];
const GARAGES = (x) => (x.y < 1920 ? [`${x.A}'s Cycle and Motor Works`, `${x.A} & Son, motor engineers`] : [`${x.A}'s Garage`, `${x.A} Motors`, ...(x.cc === 'GB' ? live(x.y, [['Kwik-Fit', 1971]]) : x.cc === 'CA' ? live(x.y, [['Canadian Tire', 1922]]) : x.cc === 'AU' ? live(x.y, [['Repco', 1930], ['Ultra Tune', 1980]]) : [])]);

/** Which table a profession takes its names from. */
const BY_ID = {
  law: LAW, legalSupport: LAW, accounting: ACCOUNTANTS, retail: RETAIL, manufacturing: FACTORIES, mechanicalEng: FACTORIES, agriculture: FARM,
  hospitality: HOTELS, culinary: KITCHENS, trades: BUILDERS, carpentry: BUILDERS, plumbing: BUILDERS, hvac: BUILDERS, ironworking: BUILDERS,
  engineering: CONSULTANTS, structuralEng: CONSULTANTS, surveying: CONSULTANTS, finance: BANKS, insurance: INSURERS, actuary: INSURERS,
  pharmacy: CHEMISTS, realestate: ESTATE_AGENTS,
};
/** Surnames on the country's modern list that rarely named a firm before the 1960s. */
const ZA_FOUNDERS = ['Botha', 'van der Merwe', 'Pretorius', 'Smith', 'du Toit', 'Steyn', 'Fourie', 'Nel', 'Brown', 'Wilson', 'Taylor', 'Jacobs'];
const RECENT = { GB: ['Khan', 'Patel'], NZ: ['Singh', 'Wang', 'Tuilagi'], CA: ['Singh', 'Gill', 'Lee', 'Wong'], AU: [] };
const HEALTH = /nurs|medic|physician|hospital(?!ity)|imaging|therap|radiolog|respirat|dietit|speechPath/i;

export function angloEmployer(professionId, cc, city, year, rng, { regionId = null, profession = null } = {}) {
  if (!ANGLO_ABROAD.includes(cc)) return null;
  const id = BY_ID[professionId] || ENG_INDUSTRY[professionId] || CRAFT[professionId] || ['journalism', 'funeral', 'automotive'].includes(professionId) || HEALTH.test(professionId) ? professionId : profession?.template ?? professionId;
  const last = COUNTRIES[cc]?.names?.last ?? ['Smith', 'Jones', 'Brown'];
  // (Firms took their founders' names: no Patel & Khan, Solicitors in 1900.)
  const recent = year < 1965 ? RECENT[cc] ?? [] : [];
  // Under segregation and apartheid South Africa's firms were white-owned (and Indian in Natal).
  const founders = cc === 'ZA' && year < 1994 ? [...ZA_FOUNDERS, ...(regionId === 'durban' ? ['Naidoo', 'Pillay'] : [])] : last.filter((n) => !recent.includes(n));
  const [A, B, C] = rng.shuffle(founders).map(cap);
  const x = { cc, c: city || 'the town', y: year, rid: regionId, prov: COUNTRIES[cc]?.cities?.[regionId]?.state ?? null, A, B, C: C ?? A };
  let names;
  if (id === 'journalism') names = [...(PRESS[cc]?.(x) ?? []), ...(BROADCAST[cc]?.(x) ?? [])];
  else if (id === 'funeral') names = UNDERTAKERS(x);
  else if (id === 'automotive') names = GARAGES(x);
  else if (ENG_INDUSTRY[id]) names = [...(ENG_INDUSTRY[id][cc]?.(year) ?? []), ...CONSULTANTS[cc](x).slice(0, 1)];
  else if (CRAFT[id]) names = [...CRAFT[id](x), ...(rng.chance(0.25) ? BUILDERS[cc](x).slice(2).slice(0, 3) : [])];
  else if (BY_ID[id]) names = BY_ID[id][cc]?.(x);
  else if (HEALTH.test(id) && profession?.sector !== 'government') names = HOSPITALS[cc]?.(x);
  return names?.length ? rng.pick(names) : null;
}
