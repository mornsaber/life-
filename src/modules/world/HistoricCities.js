/**
 * Cities that historical and breakaway states were built around, added to today's countries so a
 * life can begin in them: St John's (the Dominion of Newfoundland), Lhasa (Tibet), Changchun
 * (Manchukuo's Hsinking), Hyderabad and Gangtok and Srinagar (princely states), Turin, Florence and
 * Parma (the Italian states before 1861), Hanover and Kiel, Hargeisa (Somaliland), Tiraspol
 * (Transnistria), Sukhumi (Abkhazia), Kyrenia (Northern Cyprus), Stepanakert (Artsakh), Donetsk and
 * Simferopol. The states themselves are in HistoricalData.js REGION_STATES.
 *
 * A new province copies a sibling's taxes and laws ({ like, name }); a town is priced from its
 * province (RuralTowns.js ruralCities).
 */
const T = (name, icon, state, town, o = {}) => ({ name, icon, state, population: [town, town], ...o });
const BIG = { type: 'Mid-size city' };

export const HISTORIC_PROVINCES = {
  CA: { 'CA-NL': { like: 'CA-NS', name: 'Newfoundland and Labrador' } },
  CN: { 'CN-XZ': { like: 'CN-SC', name: 'Tibet (Xizang)' }, 'CN-JL': { like: 'CN-LN', name: 'Jilin' } },
  IN: { 'IN-TG': { like: 'IN-KA', name: 'Telangana' }, 'IN-SK': { like: 'IN-WB', name: 'Sikkim' }, 'IN-JK': { like: 'IN-UP', name: 'Jammu and Kashmir' } },
  IT: { 'IT-21': { like: 'IT-25', name: 'Piedmont' }, 'IT-52': { like: 'IT-62', name: 'Tuscany' }, 'IT-45': { like: 'IT-25', name: 'Emilia-Romagna' } },
  DE: { 'DE-NI': { like: 'DE-NW', name: 'Lower Saxony' }, 'DE-SH': { like: 'DE-HH', name: 'Schleswig-Holstein' } },
  SO: { 'SO-SL': { like: 'SO-PL', name: 'Somaliland' } },
  MD: { 'MD-TR': { like: 'MD-01', name: 'Transnistria (the left bank of the Dniester)' } },
  GE: { 'GE-AB': { like: 'GE-02', name: 'Abkhazia' } },
  CY: { 'CY-04': { like: 'CY-01', name: 'Kyrenia District' } },
  AZ: { 'AZ-NK': { like: 'AZ-02', name: 'Nagorno-Karabakh' } },
  PG: { 'PG-NSB': { like: 'PG-WHM', name: 'the Autonomous Region of Bougainville' } },
  UA: { 'UA-14': { like: 'UA-12', name: 'Donetsk Oblast' }, 'UA-43': { like: 'UA-51', name: 'Crimea' } },
};

export const HISTORIC_TOWNS = {
  CA: { ca_stjohns: T('St. John\'s, Newfoundland', '🐟', 'CA-NL', 110000, BIG) },
  CN: { lhasa: T('Lhasa, Tibet', '🏔️', 'CN-XZ', 870000, BIG), changchun: T('Changchun (Hsinking), Jilin', '🏭', 'CN-JL', 4000000, BIG) },
  IN: { hyderabad: T('Hyderabad', '🕌', 'IN-TG', 7000000, BIG), gangtok: T('Gangtok, Sikkim', '🏔️', 'IN-SK', 100000), srinagar: T('Srinagar, Kashmir', '🛶', 'IN-JK', 1200000, BIG), mysuru: T('Mysore (Mysuru)', '🏰', 'IN-KA', 900000, BIG) },
  IT: { turin: T('Turin (Torino)', '🚗', 'IT-21', 850000, BIG), florence: T('Florence (Firenze)', '🎨', 'IT-52', 370000, BIG), parma: T('Parma', '🧀', 'IT-45', 200000, BIG), modena: T('Modena', '🏎️', 'IT-45', 185000, BIG) },
  DE: { hanover: T('Hanover (Hannover)', '🐴', 'DE-NI', 540000, BIG), kiel: T('Kiel', '⚓', 'DE-SH', 250000, BIG) },
  SO: { hargeisa: T('Hargeisa, Somaliland', '🐪', 'SO-SL', 1200000, BIG), berbera: T('Berbera, Somaliland', '⚓', 'SO-SL', 250000) },
  MD: { tiraspol: T('Tiraspol, Transnistria', '🏭', 'MD-TR', 130000, BIG) },
  GE: { sukhumi: T('Sukhumi, Abkhazia', '🌴', 'GE-AB', 65000) },
  CY: { kyrenia: T('Kyrenia (Girne)', '⛵', 'CY-04', 33000), famagusta: T('Famagusta (Gazimağusa)', '🏰', 'CY-04', 40000) },
  AZ: { stepanakert: T('Stepanakert (Khankendi), Karabakh', '⛰️', 'AZ-NK', 55000) },
  PG: { arawa: T('Arawa, Bougainville', '⛏️', 'PG-NSB', 40000), buka: T('Buka, Bougainville', '🏝️', 'PG-NSB', 20000) },
  UA: { donetsk: T('Donetsk', '⛏️', 'UA-14', 900000, BIG), simferopol: T('Simferopol, Crimea', '🏖️', 'UA-43', 340000, BIG), sevastopol: T('Sevastopol, Crimea', '⚓', 'UA-43', 450000, BIG) },
};
