/**
 * Real parties. A chamber's seats belong to parties, each with a name, colour, place on the
 * left–right line and a bloc: 'labor' (the left of its day) or 'business' (the right). The blocs
 * still decide how bills are voted (Legislature.js); the parties are who actually sits there.
 *
 *   Systems    'multi'     free elections: several parties, seats by the country's voting system
 *              'dominant'  controlled elections: one party wins, a tolerated opposition sits
 *              'one'       a single party rules (with satellite "allied" parties in some states);
 *                          every other party is banned
 *              'none'      no parties at all: a junta, an absolute monarchy, a colony's council —
 *                          the members sit as non-party appointees, and the parties are banned
 *   Voting     first-past-the-post (and two-round, and the alternative vote) rewards the big
 *              parties; proportional representation shares seats out; mixed systems sit between.
 *
 * Major countries have their real parties through history; everywhere else, the party families of
 * the day (social democrats, conservatives, liberals, communists, greens, nationalists) take the
 * country's own main party names where the packs give them.
 *
 * partySystem(state, cc) → { system, parties: [{ id, name, short, color, pos, bloc, weight, status }] }
 * body.parties = [{ id, seats }]   (largest first)   members carry m.party
 */
import { Random } from '../../core/Random.js';
import { eraYear, PRESENT } from '../world/Eras.js';
import { regimeOf } from '../world/Regimes.js';
import { regionStateAt } from '../world/HistoricalData.js';
import { COUNTRIES } from '../world/Countries.js';
import { STATES } from '../life/States.js';
import { REGIONS } from '../life/Regions.js';
import { PARTY_NAMES, periodParty } from './Parties.js';

/** [id, name, short, colour, position −100…100, bloc, from, until, weight (a typical vote share), opts] */
const P = (id, name, short, color, pos, bloc, from, until, weight, opts = {}) => ({ id, name, short, color, pos, bloc, from, until, weight, ...opts });
const L = 'labor';
const B = 'business';
const NOW = 9999;

export const PARTIES = {
  US: [
    P('dr', 'Democratic-Republican Party', 'Dem-Rep', '#3a7d44', -10, L, 1792, 1828, 0.55),
    P('fed', 'Federalist Party', 'Fed', '#7a1f2b', 40, B, 1792, 1816, 0.4),
    P('nr', 'National Republican Party', 'NR', '#b5651d', 30, B, 1824, 1834, 0.42),
    P('dem', 'Democratic Party', 'Dem', '#2f5fb3', -30, L, 1828, NOW, 0.48),
    P('whig', 'Whig Party', 'Whig', '#e0a526', 30, B, 1834, 1856, 0.46),
    P('kn', 'American Party (Know-Nothings)', 'KN', '#8a6d3b', 60, B, 1854, 1860, 0.1),
    P('rep', 'Republican Party', 'GOP', '#c8322b', 40, B, 1854, NOW, 0.47),
    P('pop', 'People\'s Party (Populists)', 'Pop', '#6b8e23', -40, L, 1891, 1908, 0.06),
    P('soc', 'Socialist Party of America', 'Soc', '#b0123a', -75, L, 1901, 1972, 0.03),
    P('prog', 'Progressive Party (Bull Moose)', 'Prog', '#5a9e6f', -10, L, 1912, 1917, 0.15),
    P('lib', 'Libertarian Party', 'Lib', '#e8b923', 60, B, 1971, NOW, 0.01),
    P('grn', 'Green Party', 'Grn', '#3a9d3a', -70, L, 2001, NOW, 0.005),
  ],
  GB: [
    P('whig', 'Whigs', 'Whig', '#e8a33d', -5, L, 1678, 1859, 0.48),
    P('tory', 'Tories', 'Tory', '#1d4f91', 40, B, 1678, 1834, 0.5),
    P('con', 'Conservative Party', 'Con', '#0087dc', 40, B, 1834, NOW, 0.36),
    P('lib', 'Liberal Party', 'Lib', '#f6a01a', -5, L, 1859, 1988, 0.35),
    P('ipp', 'Irish Parliamentary Party', 'IPP', '#3c9c4a', -15, L, 1882, 1918, 0.1),
    P('lab', 'Labour Party', 'Lab', '#e4003b', -40, L, 1900, NOW, 0.35),
    P('cpgb', 'Communist Party of Great Britain', 'CPGB', '#a50000', -85, L, 1920, 1991, 0.005),
    P('buf', 'British Union of Fascists', 'BUF', '#222222', 90, B, 1932, 1941, 0.005, { banned: [[1940, 1941]] }),
    P('snp', 'Scottish National Party', 'SNP', '#e8e05a', -25, L, 1934, NOW, 0.03),
    P('pc', 'Plaid Cymru', 'PC', '#2a8a4a', -30, L, 1925, NOW, 0.006),
    P('sdp', 'Social Democratic Party', 'SDP', '#6a3d9a', -10, L, 1981, 1988, 0.12),
    P('ld', 'Liberal Democrats', 'LD', '#faa61a', -10, L, 1988, NOW, 0.12),
    P('grn', 'Green Party', 'Grn', '#6ab023', -60, L, 1990, NOW, 0.05),
    P('ukip', 'UK Independence Party', 'UKIP', '#70147a', 70, B, 1993, 2019, 0.08),
    P('ref', 'Reform UK', 'Ref', '#12b6cf', 70, B, 2019, NOW, 0.14),
  ],
  CA: [
    P('ref', 'Reformers', 'Ref', '#d71920', -10, L, 1840, 1867, 0.45),
    P('lib', 'Liberal Party', 'Lib', '#d71920', -15, L, 1867, NOW, 0.38),
    P('cons', 'Conservative Party', 'Con', '#1a4782', 35, B, 1867, 1942, 0.42),
    P('pc', 'Progressive Conservative Party', 'PC', '#1a4782', 30, B, 1942, 2003, 0.36),
    P('cpc', 'Conservative Party', 'CPC', '#1a4782', 40, B, 2003, NOW, 0.35),
    P('ccf', 'Co-operative Commonwealth Federation', 'CCF', '#f37021', -50, L, 1932, 1961, 0.12),
    P('ndp', 'New Democratic Party', 'NDP', '#f37021', -45, L, 1961, NOW, 0.16),
    P('bq', 'Bloc Québécois', 'BQ', '#33b2cc', -20, L, 1991, NOW, 0.07),
    P('refca', 'Reform Party', 'Ref', '#3cb371', 60, B, 1987, 2000, 0.15),
    P('grn', 'Green Party', 'Grn', '#3d9b35', -55, L, 1983, NOW, 0.04),
  ],
  AU: [
    P('prot', 'Protectionist Party', 'Prot', '#7a5c1e', -5, L, 1901, 1909, 0.3),
    P('ft', 'Free Trade Party', 'FT', '#1c4f9c', 30, B, 1901, 1909, 0.3),
    P('alp', 'Australian Labor Party', 'ALP', '#de3533', -35, L, 1901, NOW, 0.36),
    P('libAU', 'Commonwealth Liberal Party', 'Lib', '#1c4f9c', 30, B, 1909, 1917, 0.42),
    P('nat', 'Nationalist Party', 'Nat', '#1c4f9c', 35, B, 1917, 1931, 0.42),
    P('uap', 'United Australia Party', 'UAP', '#1c4f9c', 35, B, 1931, 1945, 0.38),
    P('lnp', 'Liberal Party', 'Lib', '#1c4f9c', 35, B, 1945, NOW, 0.33),
    P('cty', 'Country Party (Nationals)', 'Nat', '#006644', 45, B, 1920, NOW, 0.08),
    P('cpa', 'Communist Party of Australia', 'CPA', '#a50000', -85, L, 1920, 1991, 0.01),
    P('dlp', 'Democratic Labor Party', 'DLP', '#4b6e2f', 30, B, 1955, 1978, 0.07),
    P('dem', 'Australian Democrats', 'Dem', '#ffcc00', 0, L, 1977, 2015, 0.06),
    P('grn', 'Australian Greens', 'Grn', '#10c25b', -60, L, 1992, NOW, 0.11),
    P('on', 'One Nation', 'ON', '#f36c21', 75, B, 1997, NOW, 0.05),
  ],
  NZ: [
    P('libNZ', 'Liberal Party', 'Lib', '#f6a01a', -10, L, 1891, 1928, 0.45),
    P('reform', 'Reform Party', 'Ref', '#1c4f9c', 35, B, 1909, 1936, 0.4),
    P('lab', 'Labour Party', 'Lab', '#d82a20', -35, L, 1916, NOW, 0.38),
    P('nat', 'National Party', 'Nat', '#00529f', 35, B, 1936, NOW, 0.38),
    P('soc', 'Social Credit', 'SC', '#2e8b57', 0, B, 1953, 1985, 0.08),
    P('grn', 'Green Party', 'Grn', '#098137', -60, L, 1990, NOW, 0.08, { pr: 1996 }),
    P('nzf', 'New Zealand First', 'NZF', '#000000', 50, B, 1993, NOW, 0.07),
    P('act', 'ACT New Zealand', 'ACT', '#fdd80f', 60, B, 1994, NOW, 0.07),
    P('tpm', 'Te Pāti Māori', 'TPM', '#b2001a', -50, L, 2004, NOW, 0.03),
  ],
  IE: [
    P('ct', 'Cumann na nGaedheal', 'CnaG', '#5f84c3', 20, B, 1923, 1933, 0.38),
    P('ff', 'Fianna Fáil', 'FF', '#66bb66', 10, B, 1926, NOW, 0.38),
    P('fg', 'Fine Gael', 'FG', '#6699ff', 25, B, 1933, NOW, 0.3),
    P('lab', 'Labour Party', 'Lab', '#cc0000', -35, L, 1922, NOW, 0.1),
    P('sf', 'Sinn Féin', 'SF', '#326760', -40, L, 1905, NOW, 0.12),
    P('grn', 'Green Party', 'Grn', '#99cc33', -50, L, 1981, NOW, 0.04),
  ],
  DE: [
    P('cons', 'German Conservative Party', 'DKP', '#2d2d2d', 60, B, 1876, 1918, 0.15),
    P('nl', 'National Liberal Party', 'NL', '#c9a12b', 20, B, 1867, 1918, 0.15),
    P('zentrum', 'Centre Party (Zentrum)', 'Z', '#2a2a2a', 15, B, 1870, 1933, 0.18),
    P('spd', 'Social Democratic Party (SPD)', 'SPD', '#e3000f', -40, L, 1875, NOW, 0.3, { banned: [[1878, 1890], [1933, 1945]] }),
    P('fvp', 'Progressives (Fortschritt / DDP)', 'DDP', '#e6c229', -5, L, 1861, 1933, 0.1),
    P('kpd', 'Communist Party (KPD)', 'KPD', '#8b0000', -90, L, 1919, 1968, 0.1, { banned: [[1933, 1945], [1956, 1968]] }),
    P('dnvp', 'German National People\'s Party (DNVP)', 'DNVP', '#3f7bc1', 65, B, 1918, 1933, 0.12),
    P('nsdap', 'National Socialist German Workers\' Party', 'NSDAP', '#8b4513', 95, B, 1920, 1945, 0.2),
    P('cdu', 'CDU/CSU', 'Union', '#151518', 30, B, 1945, NOW, 0.3),
    P('fdp', 'Free Democratic Party (FDP)', 'FDP', '#ffed00', 20, B, 1948, NOW, 0.08),
    P('grn', 'Alliance 90/The Greens', 'Grüne', '#1aa037', -45, L, 1980, NOW, 0.11),
    P('linke', 'The Left (Die Linke)', 'Linke', '#be3075', -70, L, 1990, NOW, 0.06),
    P('afd', 'Alternative for Germany (AfD)', 'AfD', '#009ee0', 80, B, 2013, NOW, 0.17),
  ],
  FR: [
    P('legit', 'Legitimists and Orleanists', 'Roy', '#0b3d91', 60, B, 1815, 1880, 0.4),
    P('rep', 'Republicans', 'Rép', '#d4252e', -15, L, 1830, 1901, 0.45),
    P('radical', 'Radical Party', 'Rad', '#f0c800', -10, L, 1901, 1971, 0.2),
    P('sfio', 'Socialist Party (SFIO)', 'SFIO', '#e75480', -45, L, 1905, 1969, 0.2),
    P('pcf', 'French Communist Party', 'PCF', '#cc0000', -85, L, 1920, NOW, 0.15),
    P('fed', 'Republican Federation', 'FR', '#2a52be', 50, B, 1903, 1940, 0.2),
    P('mrp', 'Popular Republican Movement (MRP)', 'MRP', '#7da7d9', 15, B, 1944, 1967, 0.15),
    P('gaull', 'Gaullists (RPF, UNR, RPR, UMP, LR)', 'LR', '#0066cc', 35, B, 1947, NOW, 0.22),
    P('ps', 'Socialist Party (PS)', 'PS', '#e75480', -40, L, 1969, NOW, 0.18),
    P('udf', 'UDF / MoDem', 'Centre', '#ff9900', 5, B, 1978, NOW, 0.1),
    P('ren', 'Renaissance (En Marche)', 'Ren', '#ffeb00', 5, B, 2016, NOW, 0.2),
    P('fn', 'National Front / National Rally', 'RN', '#0d378a', 85, B, 1972, NOW, 0.18),
    P('lfi', 'La France Insoumise', 'LFI', '#cc2443', -70, L, 2016, NOW, 0.12),
    P('eelv', 'The Ecologists', 'Écolo', '#00c000', -50, L, 1984, NOW, 0.05),
  ],
  IT: [
    P('destra', 'Historical Right', 'Destra', '#1f4e9c', 40, B, 1861, 1876, 0.5),
    P('sinistra', 'Historical Left', 'Sinistra', '#c9a12b', -10, L, 1861, 1913, 0.5),
    P('psi', 'Italian Socialist Party', 'PSI', '#e2001a', -50, L, 1892, 1994, 0.15),
    P('ppi', 'Italian People\'s Party', 'PPI', '#5a7fbf', 15, B, 1919, 1926, 0.2),
    P('pnf', 'National Fascist Party', 'PNF', '#111111', 95, B, 1921, 1943, 0.2),
    P('dc', 'Christian Democracy (DC)', 'DC', '#5a7fbf', 20, B, 1943, 1994, 0.38),
    P('pci', 'Italian Communist Party (PCI)', 'PCI', '#c4161c', -75, L, 1921, 1991, 0.27, { banned: [[1926, 1943]] }),
    P('msi', 'Italian Social Movement (MSI)', 'MSI', '#2a2a2a', 85, B, 1946, 1995, 0.05),
    P('fi', 'Forza Italia', 'FI', '#0087dc', 35, B, 1994, NOW, 0.12),
    P('ln', 'Lega', 'Lega', '#008800', 70, B, 1991, NOW, 0.1),
    P('pd', 'Democratic Party (PD)', 'PD', '#ef1c27', -30, L, 2007, NOW, 0.22),
    P('m5s', 'Five Star Movement', 'M5S', '#ffeb3b', -10, L, 2009, NOW, 0.16),
    P('fdi', 'Brothers of Italy', 'FdI', '#03386a', 75, B, 2012, NOW, 0.26),
  ],
  ES: [
    P('cons', 'Conservative Party', 'Cons', '#1c4f9c', 40, B, 1876, 1923, 0.45),
    P('libES', 'Liberal Party', 'Lib', '#f6a01a', -5, L, 1876, 1923, 0.45),
    P('psoe', 'Spanish Socialist Workers\' Party (PSOE)', 'PSOE', '#e1001a', -40, L, 1879, NOW, 0.3, { banned: [[1923, 1930]] }),
    P('ceda', 'CEDA', 'CEDA', '#1f4e9c', 50, B, 1933, 1937, 0.25),
    P('pce', 'Communist Party of Spain', 'PCE', '#c00000', -85, L, 1921, NOW, 0.05),
    P('ucd', 'Union of the Democratic Centre', 'UCD', '#2e8b57', 10, B, 1977, 1983, 0.35),
    P('pp', 'People\'s Party (PP)', 'PP', '#1d84ce', 40, B, 1976, NOW, 0.33),
    P('iu', 'United Left / Sumar', 'IU', '#a40000', -70, L, 1986, NOW, 0.1),
    P('pod', 'Podemos', 'Pod', '#6a2c70', -65, L, 2014, NOW, 0.08),
    P('cs', 'Ciudadanos', 'Cs', '#eb6109', 10, B, 2006, 2023, 0.08),
    P('vox', 'Vox', 'Vox', '#63be21', 85, B, 2013, NOW, 0.12),
    P('erc', 'Catalan and Basque nationalists', 'Nac', '#ffb232', -10, L, 1931, NOW, 0.06),
  ],
  SE: [
    P('hogern', 'Right (Moderates)', 'M', '#52bdec', 40, B, 1904, NOW, 0.2),
    P('liberal', 'Liberals', 'L', '#006ab3', 10, B, 1900, NOW, 0.1),
    P('sap', 'Social Democrats', 'S', '#e8112d', -40, L, 1889, NOW, 0.35),
    P('c', 'Centre Party', 'C', '#009933', 15, B, 1913, NOW, 0.08),
    P('v', 'Left Party', 'V', '#da291c', -70, L, 1917, NOW, 0.07),
    P('kd', 'Christian Democrats', 'KD', '#000077', 40, B, 1964, NOW, 0.05),
    P('mp', 'Green Party', 'MP', '#83cf39', -45, L, 1981, NOW, 0.05),
    P('sd', 'Sweden Democrats', 'SD', '#dddd00', 75, B, 1988, NOW, 0.2),
  ],
  NL: [
    P('arp', 'Christian parties (ARP, KVP, CDA)', 'CDA', '#007b5f', 20, B, 1879, NOW, 0.2),
    P('lib', 'Liberals (VVD)', 'VVD', '#0a2cca', 35, B, 1885, NOW, 0.18),
    P('sdap', 'Labour (SDAP, PvdA, GL-PvdA)', 'PvdA', '#df111a', -35, L, 1894, NOW, 0.2),
    P('d66', 'Democrats 66', 'D66', '#00ae41', -5, L, 1966, NOW, 0.1),
    P('sp', 'Socialist Party', 'SP', '#ee2e22', -65, L, 1972, NOW, 0.06),
    P('pvv', 'Party for Freedom', 'PVV', '#0b2b5b', 80, B, 2006, NOW, 0.16),
    P('bbb', 'Farmer–Citizen Movement', 'BBB', '#95c11f', 40, B, 2019, NOW, 0.06),
  ],
  JP: [
    P('seiyukai', 'Rikken Seiyūkai', 'Seiyūkai', '#7a1f2b', 35, B, 1900, 1940, 0.45),
    P('minseito', 'Rikken Minseitō', 'Minseitō', '#2a52be', 10, L, 1927, 1940, 0.4),
    P('irsa', 'Imperial Rule Assistance Association', 'IRAA', '#555555', 80, B, 1940, 1945, 0.9),
    P('ldp', 'Liberal Democratic Party', 'LDP', '#3ca324', 35, B, 1955, NOW, 0.42),
    P('jsp', 'Japan Socialist Party / SDP', 'JSP', '#e9546b', -45, L, 1945, NOW, 0.2),
    P('jcp', 'Japanese Communist Party', 'JCP', '#db001c', -85, L, 1922, NOW, 0.07, { banned: [[1922, 1945]] }),
    P('komeito', 'Komeito', 'Kōmei', '#f55881', 10, B, 1964, NOW, 0.1),
    P('cdp', 'Constitutional Democratic Party', 'CDP', '#184589', -25, L, 2017, NOW, 0.18),
    P('ishin', 'Japan Innovation Party', 'Ishin', '#6fba2c', 45, B, 2015, NOW, 0.1),
  ],
  IN: [
    P('inc', 'Indian National Congress', 'INC', '#19aaed', -20, L, 1885, NOW, 0.4),
    P('ml', 'All-India Muslim League', 'ML', '#00873e', 30, B, 1906, 1947, 0.2),
    P('bjs', 'Bharatiya Jana Sangh / BJP', 'BJP', '#ff9933', 55, B, 1951, NOW, 0.3),
    P('cpi', 'Communist Party of India (Marxist)', 'CPI(M)', '#cc0d0d', -80, L, 1925, NOW, 0.06),
    P('janata', 'Janata Party / Janata Dal', 'JD', '#2e8b57', -5, L, 1977, NOW, 0.06),
    P('reg', 'Regional parties (DMK, TMC, SP, TDP…)', 'Reg', '#8b0000', -10, L, 1949, NOW, 0.12),
  ],
  MX: [
    P('pri', 'Institutional Revolutionary Party (PRI)', 'PRI', '#008f39', 0, L, 1929, NOW, 0.5),
    P('pan', 'National Action Party (PAN)', 'PAN', '#0049a3', 40, B, 1939, NOW, 0.25),
    P('prd', 'Party of the Democratic Revolution', 'PRD', '#ffcc00', -45, L, 1989, 2024, 0.1),
    P('morena', 'Morena', 'Morena', '#b5261e', -40, L, 2014, NOW, 0.4),
  ],
  BR: [
    P('psd', 'Social Democratic Party (PSD)', 'PSD', '#1c4f9c', 20, B, 1945, 1965, 0.35),
    P('udn', 'National Democratic Union (UDN)', 'UDN', '#4682b4', 45, B, 1945, 1965, 0.25),
    P('ptb', 'Brazilian Labour Party (PTB)', 'PTB', '#d40000', -35, L, 1945, 1965, 0.2),
    P('arena', 'National Renewal Alliance (ARENA)', 'ARENA', '#1c4f9c', 50, B, 1966, 1980, 0.6),
    P('mdb', 'Brazilian Democratic Movement (MDB)', 'MDB', '#3cb371', 5, L, 1966, NOW, 0.2),
    P('pt', 'Workers\' Party (PT)', 'PT', '#cc0000', -45, L, 1980, NOW, 0.18),
    P('psdb', 'Brazilian Social Democracy Party (PSDB)', 'PSDB', '#0080ff', 15, B, 1988, NOW, 0.1),
    P('pl', 'Liberal Party (PL)', 'PL', '#003399', 65, B, 2006, NOW, 0.18),
  ],
  ZA: [
    P('sap', 'South African Party', 'SAP', '#e8a33d', 30, B, 1911, 1934, 0.45),
    P('np', 'National Party', 'NP', '#ff6600', 80, B, 1914, 1997, 0.5),
    P('up', 'United Party / Progressive Federal Party', 'UP', '#1c4f9c', 20, B, 1934, 1989, 0.35),
    P('anc', 'African National Congress', 'ANC', '#009900', -40, L, 1912, NOW, 0.55, { banned: [[1960, 1990]] }),
    P('sacp', 'South African Communist Party', 'SACP', '#cc0000', -85, L, 1921, NOW, 0.01, { banned: [[1950, 1990]] }),
    P('da', 'Democratic Alliance', 'DA', '#005ba6', 25, B, 1989, NOW, 0.22),
    P('eff', 'Economic Freedom Fighters', 'EFF', '#c8102e', -80, L, 2013, NOW, 0.1),
    P('ifp', 'Inkatha Freedom Party', 'IFP', '#ffd700', 30, B, 1975, NOW, 0.04),
  ],
  KR: [
    P('dp', 'Democratic Party (and its forerunners)', 'DP', '#152484', -25, L, 1955, NOW, 0.42),
    P('ppp', 'People Power Party (and its forerunners)', 'PPP', '#e61e2b', 35, B, 1963, NOW, 0.42),
    P('jp', 'Justice Party', 'JP', '#ffcc00', -60, L, 2012, NOW, 0.05),
  ],
  RU: [
    P('kadet', 'Constitutional Democrats (Kadets)', 'Kadets', '#2a52be', 10, B, 1905, 1918, 0.25),
    P('octob', 'Octobrists', 'Oct', '#5b7c99', 40, B, 1905, 1917, 0.2),
    P('sr', 'Socialist Revolutionaries', 'SR', '#cc6600', -55, L, 1902, 1922, 0.3),
    P('bolsh', 'Bolsheviks (RSDLP)', 'Bolsh', '#cc0000', -90, L, 1903, 1918, 0.15),
    P('ur', 'United Russia', 'UR', '#2862b3', 50, B, 2001, NOW, 0.5),
    P('kprf', 'Communist Party of the Russian Federation', 'KPRF', '#cc0000', -80, L, 1993, NOW, 0.15),
    P('ldpr', 'Liberal Democratic Party of Russia', 'LDPR', '#3e6db5', 75, B, 1991, NOW, 0.1),
    P('yabloko', 'Yabloko', 'Yabl', '#32a852', -5, L, 1993, NOW, 0.02),
  ],
};

/** Ruling parties of one-party states: [countries, from, until, name, short, colour, allied (parties that share the list)]. */
const RULING = [
  [['RU', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'EE', 'LV', 'LT'], 1918, 1992, 'Communist Party of the Soviet Union', 'CPSU', '#cc0000'],
  [['CN'], 1928, 1949, 'Kuomintang (Nationalist Party)', 'KMT', '#000095'],
  [['CN'], 1949, NOW, 'Chinese Communist Party', 'CCP', '#de2910', [['Eight democratic parties (the United Front)', 'UF', '#e8a33d', 0.3]]],
  [['TW'], 1949, 1987, 'Kuomintang', 'KMT', '#000095'],
  [['VN'], 1954, NOW, 'Communist Party of Vietnam', 'CPV', '#da251d'],
  [['KP'], 1948, NOW, 'Workers\' Party of Korea', 'WPK', '#c4161c', [['Korean Social Democratic Party and the Chondoist Chongu Party', 'Allied', '#e8a33d', 0.1]]],
  [['CU'], 1961, NOW, 'Communist Party of Cuba', 'PCC', '#cf142b'],
  [['LA'], 1975, NOW, 'Lao People\'s Revolutionary Party', 'LPRP', '#ce1126'],
  [['DE', 'AT'], 1933, 1946, 'National Socialist German Workers\' Party', 'NSDAP', '#8b4513'],
  [['IT'], 1926, 1944, 'National Fascist Party', 'PNF', '#111111'],
  [['ES'], 1939, 1977, 'FET y de las JONS (the National Movement)', 'Movimiento', '#2a2a2a'],
  [['PT'], 1933, 1974, 'National Union', 'UN', '#0b5394'],
  [['TR'], 1925, 1946, 'Republican People\'s Party', 'CHP', '#ed1c24'],
  [['PL'], 1948, 1990, 'Polish United Workers\' Party', 'PZPR', '#cc0000', [['United People\'s Party and Democratic Party', 'ZSL/SD', '#2e8b57', 0.35]]],
  [['CZ', 'SK'], 1948, 1990, 'Communist Party of Czechoslovakia', 'KSČ', '#cc0000', [['National Front parties', 'NF', '#2e8b57', 0.2]]],
  [['HU'], 1949, 1990, 'Hungarian Socialist Workers\' Party', 'MSZMP', '#cc0000'],
  [['RO'], 1947, 1990, 'Romanian Communist Party', 'PCR', '#cc0000'],
  [['BG'], 1946, 1990, 'Bulgarian Communist Party', 'BKP', '#cc0000', [['Bulgarian Agrarian National Union', 'BZNS', '#ff9900', 0.25]]],
  [['AL'], 1946, 1991, 'Party of Labour of Albania', 'PPSh', '#cc0000'],
  [['RS', 'HR', 'SI', 'BA', 'ME', 'MK'], 1945, 1990, 'League of Communists of Yugoslavia', 'SKJ', '#cc0000'],
  [['MN'], 1924, 1990, 'Mongolian People\'s Revolutionary Party', 'MPRP', '#cc0000'],
  [['KH'], 1975, 1979, 'Communist Party of Kampuchea', 'CPK', '#7a0000'],
  [['IQ'], 1968, 2003, 'Arab Socialist Ba\'ath Party', 'Ba\'ath', '#007a3d'],
  [['SY'], 1963, 2024, 'Arab Socialist Ba\'ath Party', 'Ba\'ath', '#007a3d'],
  [['EG'], 1953, 1977, 'Arab Socialist Union', 'ASU', '#ce1126'],
];
/** East Germany: the SED and the bloc parties of the National Front. */
const GDR = ['Socialist Unity Party (SED)', 'SED', '#d40000', [['Bloc parties (CDU, LDPD, NDPD, DBD) and mass organisations', 'Bloc', '#e8a33d', 0.55]]];

/** Systems where the big parties win nearly every seat (first-past-the-post, two-round, alternative vote). */
const MAJORITARIAN = ['US', 'GB', 'CA', 'IN', 'AU', 'FR', 'NG', 'KE', 'GH', 'PK', 'BD', 'MY', 'SG', 'JM', 'TT', 'BS', 'BB', 'ZM', 'ZW', 'MW', 'UG', 'TZ', 'BW'];
const MIXED = ['JP', 'KR', 'MX', 'RU', 'HU', 'IT', 'TW', 'PH', 'TH', 'LT'];
/** Proportional with a threshold: parties under it win nothing. */
const THRESHOLD = { DE: 0.05, NZ: 0.05, SE: 0.04, TR: 0.07, PL: 0.05, RU: 0.05, ES: 0.03, IL: 0.0325, AT: 0.04 };
export function votingSystem(cc, y) {
  if (cc === 'NZ') return y >= 1996 ? 'mmp' : 'fptp';
  if (cc === 'FR') return y >= 1958 || y < 1945 ? 'fptp' : 'pr';
  if (cc === 'IT') return y >= 1994 ? 'mixed' : 'pr';
  if (cc === 'JP') return y >= 1996 ? 'mixed' : 'pr';
  if (MAJORITARIAN.includes(cc)) return 'fptp';
  if (MIXED.includes(cc)) return 'mixed';
  if (cc === 'DE') return 'mmp';
  return 'pr';
}
const EXPONENT = { fptp: 2.2, mixed: 1.4, mmp: 1, pr: 1 };

const inWindow = (r, y) => y >= r.from && y < r.until;
const bannedThen = (r, y) => (r.banned ?? []).some(([a, b]) => y >= a && y < b);

/** The parties of the day by family, for countries without their own list. */
function familyParties(cc, y) {
  // The main parties of the day where the history has them; today's names only for recent years.
  const today = y >= PRESENT - 35 ? PARTY_NAMES[cc] ?? {} : {};
  const names = { labor: periodParty(cc, 'labor') ?? today.labor, business: periodParty(cc, 'business') ?? today.business };
  const out = [];
  if (y >= 1890) out.push(P('left', names.labor ?? (y < 1920 ? 'Radical Party' : 'Social Democratic Party'), 'SD', '#e3000f', -35, L, 0, NOW, 0.32));
  else out.push(P('left', names.labor ?? 'Liberal Party', 'Lib', '#e8a33d', -10, L, 0, NOW, 0.45));
  out.push(P('right', names.business ?? 'Conservative Party', 'Con', '#1c4f9c', 35, B, 0, NOW, y >= 1890 ? 0.32 : 0.45));
  if (y >= 1890 && !/liberal/i.test(`${names.labor} ${names.business}`)) out.push(P('lib', 'Liberal Party', 'Lib', '#f6a01a', 10, B, 0, NOW, 0.1));
  if (y >= 1920 && y < 1992) out.push(P('comm', 'Communist Party', 'Comm', '#b00000', -85, L, 0, NOW, 0.07));
  if (y >= 1980) out.push(P('grn', 'Green Party', 'Grn', '#3a9d3a', -55, L, 0, NOW, 0.06));
  if (y >= 1990) out.push(P('nat', 'National Front', 'Nat', '#24324a', 75, B, 0, NOW, 0.08));
  return out;
}

/** Where a body sits: its country. */
export function bodyCountry(body) {
  if (body.level === 'federal') return body.where ?? 'US';
  if (body.level === 'state') return STATES[body.where]?.country ?? 'US';
  return REGIONS[body.where]?.country ?? 'US';
}

/** The party system in a country now (regionId: for divided countries, East or West). */
export function partySystem(cc, y = eraYear(), regionId = null) {
  const r = regimeOf(cc);
  const gdr = regionId && regionStateAt(regionId, y);
  const own = (PARTIES[cc] ?? []).filter((p) => inWindow(p, y));
  const base = own.length >= 2 ? own : familyParties(cc, y);
  const ruling = gdr?.kind === 'eastbloc' && /German Democratic/.test(gdr.name) ? GDR : RULING.find(([ccs, a, b]) => ccs.includes(cc) && y >= a && y < b)?.slice(3);
  const one = r?.party || r?.kind === 'oneParty' || r?.kind === 'totalitarian' || r?.elections === 'sham' || (ruling && r?.elections !== 'free');
  if (one) {
    const [name, short, color, allied = []] = ruling ?? [`${COUNTRIES[cc]?.name ?? cc}'s ruling party`, 'Ruling', '#7a0000'];
    const rulingParty = P('ruling', name, short, color, 0, L, 0, NOW, 1, { status: 'ruling' });
    const sats = allied.map(([n, s, c, w], i) => P(`allied${i}`, n, s, c, 10, B, 0, NOW, w, { status: 'allied' }));
    // Only the country's own real parties are named as banned (no invented ones).
    const banned = own.filter((p) => p.name !== name && p.short !== short).map((p) => ({ ...p, status: 'banned' }));
    return { system: 'one', parties: [rulingParty, ...sats, ...banned] };
  }
  if (r?.elections === 'none') return { system: 'none', parties: own.map((p) => ({ ...p, status: 'banned' })) };
  const parties = base.map((p) => ({ ...p, status: bannedThen(p, y) ? 'banned' : 'legal' }));
  return { system: r?.elections === 'controlled' ? 'dominant' : 'multi', parties };
}

/** Split `n` seats by weights (largest remainder). */
function share(n, items) {
  const total = items.reduce((s, x) => s + x.w, 0);
  if (!total || n <= 0) return items.map((x) => ({ id: x.id, seats: 0 }));
  const raw = items.map((x) => ({ id: x.id, q: (n * x.w) / total }));
  const out = raw.map((x) => ({ id: x.id, seats: Math.floor(x.q), r: x.q - Math.floor(x.q) }));
  let left = n - out.reduce((s, x) => s + x.seats, 0);
  for (const x of [...out].sort((a, b) => b.r - a.r)) { if (left <= 0) break; x.seats += 1; left -= 1; }
  return out.map(({ id, seats }) => ({ id, seats }));
}

/**
 * Give a chamber's seats to parties: the left bloc's seats among the left's legal parties and the
 * right's among the right's, by vote share bent by the voting system (and a little mood that
 * shifts at each election). One-party chambers: the Party and its allies; no-party chambers: none.
 */
export function allocateSeats(body, y = eraYear()) {
  const cc = bodyCountry(body);
  const sys = partySystem(cc, y, body.level === 'city' ? body.where : null);
  body.system = sys.system;
  const mood = body.partyMood ?? {};
  if (sys.system === 'none') {
    body.parties = [{ id: 'nonparty', seats: body.seats }];
    return body.parties;
  }
  if (sys.system === 'one') {
    const allied = sys.parties.filter((p) => p.status === 'allied');
    const alliedShare = allied.reduce((s, p) => s + p.weight, 0);
    const indep = Math.round(body.seats * (alliedShare ? 0.03 : 0.08));
    const alliedSeats = Math.round((body.seats - indep) * alliedShare);
    body.parties = [{ id: 'ruling', seats: body.seats - indep - alliedSeats }, ...share(alliedSeats, allied.map((p) => ({ id: p.id, w: p.weight }))), { id: 'nonparty', seats: indep }].filter((x) => x.seats > 0);
    return body.parties;
  }
  const vs = votingSystem(cc, y);
  const exp = body.level === 'city' ? 1.6 : EXPONENT[vs];
  const thresh = THRESHOLD[cc] ?? 0;
  const legal = sys.parties.filter((p) => p.status === 'legal');
  // Under the threshold, a party wins nothing; the voting system bends the rest.
  const side = (bloc) => legal.filter((p) => p.bloc === bloc).map((p) => ({ id: p.id, w: p.weight < thresh ? 0 : (p.weight * (mood[p.id] ?? 1)) ** exp }));
  const left = side(L).filter((x) => x.w > 0);
  const right = side(B).filter((x) => x.w > 0);
  let out;
  if (!left.length && !right.length) out = [{ id: 'nonparty', seats: body.seats }];
  else if (!left.length) out = share(body.seats, right);
  else if (!right.length) out = share(body.seats, left);
  else out = [...share(body.labor, left), ...share(body.seats - body.labor, right)];
  body.parties = out.filter((x) => x.seats > 0).sort((a, b) => b.seats - a.seats);
  return body.parties;
}

/** Shift the parties' fortunes a little at an election (within each bloc). */
export function electionMood(body) {
  // Its own stream (by chamber and election), so the legislature's other rolls are untouched.
  body.moodSeed = (((body.moodSeed ?? [...String(body.id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17)) * 1664525) + 1013904223) >>> 0;
  const rng = new Random(body.moodSeed);
  const sys = partySystem(bodyCountry(body));
  body.partyMood = Object.fromEntries(sys.parties.map((p) => [p.id, Math.max(0.5, Math.min(1.6, (body.partyMood?.[p.id] ?? 1) * rng.float(0.85, 1.18)))]));
}

/** A party's details by id in a body's country (nonparty: the independents and appointees). */
export function partyInfo(body, id, y = eraYear()) {
  if (id === 'nonparty') return { id, name: body.system === 'one' ? 'Non-Party deputies' : body.system === 'none' ? 'Appointed members (no parties)' : 'Independents', short: 'Ind', color: '#9aa0a6', pos: 0, bloc: B, status: 'legal' };
  const sys = partySystem(bodyCountry(body), y, body.level === 'city' ? body.where : null);
  return sys.parties.find((p) => p.id === id) ?? { id, name: id, short: id, color: '#9aa0a6', pos: 0, bloc: B, status: 'legal' };
}

/** The government side: the largest party and, without a majority, the smallest set of same-bloc partners that makes one. */
export function governingParties(body) {
  const ps = body.parties ?? [];
  if (!ps.length) return [];
  const half = body.seats / 2;
  const lead = ps[0];
  if (lead.seats > half || body.system === 'one') return body.system === 'one' ? ps.filter((p) => p.id !== 'nonparty').map((p) => p.id) : [lead.id];
  const bloc = partyInfo(body, lead.id).bloc;
  const gov = [lead.id];
  let seats = lead.seats;
  for (const p of ps.slice(1)) {
    if (seats > half) break;
    if (partyInfo(body, p.id).bloc === bloc) { gov.push(p.id); seats += p.seats; }
  }
  return gov;
}

/** Members carry a party from their bloc, weighted by seats; leaders and you keep theirs. */
export function assignMemberParties(body) {
  const byBloc = { [L]: [], [B]: [] };
  for (const p of body.parties ?? []) { const info = partyInfo(body, p.id); (byBloc[info.bloc] ??= []).push(p); }
  const pickFor = (m) => {
    const pool = (byBloc[m.caucus] ?? []).length ? byBloc[m.caucus] : body.parties ?? [];
    if (!pool.length) return 'nonparty';
    const total = pool.reduce((s, p) => s + p.seats, 0);
    let h = [...(m.name ?? 'x')].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7) % Math.max(1, total);
    for (const p of pool) { if (h < p.seats) return p.id; h -= p.seats; }
    return pool[0].id;
  };
  const valid = new Set((body.parties ?? []).map((p) => p.id));
  for (const m of [...(body.members ?? []), ...Object.values(body.leaders ?? {}).filter(Boolean)]) {
    if (m.you && m.party && valid.has(m.party)) continue;
    if (!m.party || !valid.has(m.party) || (m.party !== 'nonparty' && partyInfo(body, m.party).bloc !== m.caucus && body.system === 'multi')) m.party = pickFor(m);
  }
}

/** The largest legal party in a bloc where you live (what "the labor party" means here and now). */
export function mainPartyOf(cc, bloc, y = eraYear()) {
  const sys = partySystem(cc, y);
  if (sys.system === 'one') return sys.parties[0];
  return sys.parties.filter((p) => p.bloc === bloc && p.status === 'legal').sort((a, b) => b.weight - a.weight)[0] ?? null;
}

/** Parties you could join where you live: legal ones (and the ruling party). */
export const joinableParties = (cc, y = eraYear()) => partySystem(cc, y).parties.filter((p) => ['legal', 'ruling'].includes(p.status));
export const historicYear = (y) => y < PRESENT;
