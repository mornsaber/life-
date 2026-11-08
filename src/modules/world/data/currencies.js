/**
 * Currencies before today's: each country's earlier money, oldest first, as
 * [until year, ISO code, symbol, name, units per one unit of today's currency].
 *
 * Changeover years are the ISO 4217 withdrawal dates (list three, via datasets/currency-codes);
 * rates are the official conversion rates (the euro's irrevocably fixed rates, and each
 * redenomination's own ratio). Amounts are today's value, shown in the old unit. Only the currencies
 * that a fixed rate links to today's are listed (no hyperinflations or splits): before them, the
 * earliest listed money is shown.
 */
export const CURRENCY_HISTORY = {
  FR: [[1960, 'FRF', '₣', 'old franc', 655.957], [2002, 'FRF', '₣', 'French franc', 6.55957]],
  DE: [[1924, 'DEM', 'ℳ', 'mark', 19.5583], [1948, 'RM', 'ℛℳ', 'Reichsmark', 19.5583], [2002, 'DEM', 'DM ', 'Deutsche Mark', 1.95583]],
  IT: [[2002, 'ITL', '₤', 'lira', 1936.27]],
  ES: [[2002, 'ESP', '₧', 'peseta', 166.386]],
  NL: [[2002, 'NLG', 'ƒ', 'guilder', 2.20371]],
  BE: [[2002, 'BEF', 'BEF ', 'Belgian franc', 40.3399]],
  LU: [[2002, 'LUF', 'LUF ', 'Luxembourg franc', 40.3399]],
  AT: [[1938, 'ATS', 'S ', 'schilling', 13.7603], [1945, 'RM', 'ℛℳ', 'Reichsmark', 13.7603], [2002, 'ATS', 'S ', 'schilling', 13.7603]],
  PT: [[2002, 'PTE', 'Esc ', 'escudo', 200.482]],
  IE: [[1928, 'GBP', '£', 'pound sterling', 0.787564], [2002, 'IEP', 'IR£', 'Irish pound', 0.787564]],
  FI: [[2002, 'FIM', 'mk ', 'markka', 5.94573]],
  GR: [[2002, 'GRD', '₯', 'drachma', 340.75]],
  CY: [[2008, 'CYP', 'C£', 'Cyprus pound', 0.585274]],
  MT: [[1972, 'MTP', 'M£', 'Maltese pound', 0.4293], [2008, 'MTL', 'Lm ', 'Maltese lira', 0.4293]],
  EE: [[2011, 'EEK', 'kr ', 'kroon', 15.6466]],
  LV: [[2014, 'LVL', 'Ls ', 'lats', 0.702804]],
  LT: [[2015, 'LTL', 'Lt ', 'litas', 3.4528]],
  MX: [[1993, 'MXP', '$', 'old peso', 1000]],
  TR: [[2005, 'TRL', 'TL ', 'old lira', 1000000]],
  PL: [[1995, 'PLZ', 'zł ', 'old złoty', 10000]],
  RO: [[2005, 'ROL', 'lei ', 'old leu', 10000]],
  IL: [[1980, 'ILP', 'I£', 'Israeli pound', 10000], [1985, 'ILR', 'IS ', 'old shekel', 1000]],
  GH: [[2007, 'GHC', '₵', 'old cedi', 10000]],
  AF: [[2002, 'AFA', 'Af ', 'old afghani', 1000]],
  KR: [[1962, 'KRH', '₩', 'hwan', 10]],
  ZA: [[1961, 'ZAP', '£', 'South African pound', 0.5]],
  AU: [[1966, 'AUP', '£', 'Australian pound', 0.5]],
  NZ: [[1967, 'NZP', '£', 'New Zealand pound', 0.5]],
  JM: [[1969, 'JMP', '£', 'Jamaican pound', 0.5]],
  NG: [[1973, 'NGP', '£', 'Nigerian pound', 0.5]],
  GM: [[1971, 'GMP', '£', 'Gambian pound', 0.2]],
  MW: [[1971, 'MWP', '£', 'Malawian pound', 0.5]],
  SK: [[2009, 'SKK', 'Sk ', 'Slovak koruna', 30.126]],
  ME: [[2002, 'DEM', 'DM ', 'Deutsche Mark', 1.95583]],
  XK: [[2002, 'DEM', 'DM ', 'Deutsche Mark', 1.95583]],
};
