/**
 * Sport, as it was played in its day: the clubs, the governing bodies, the competitions by era,
 * when women could play, the amateur years, and the selections that come at the top.
 * Schema: life/pursuits/registry.js.
 */
const county = (from = 1870) => ({ id: 'county', label: 'county colours', skill: 70, odds: 0.35, from, icon: '🧢' });
const cap = (from, label = 'an international cap') => ({ id: 'cap', label, skill: 86, odds: 0.25, from, icon: '🎽' });
const olympics = (from = 1896, women = 1900, extra = {}) => ({ id: 'olympics', label: 'the Olympic team', skill: 90, odds: 0.3, from, women, olympic: true, icon: '🏅', ...extra });

const COMMONWEALTH = ['GB', 'IE', 'AU', 'NZ', 'ZA', 'IN', 'PK', 'LK', 'BD', 'JM', 'TT', 'BB', 'GY', 'ZW', 'KE', 'AF', 'NP', 'AE'];
const RUGBY = ['GB', 'IE', 'FR', 'AU', 'NZ', 'ZA', 'AR', 'IT', 'FJ', 'WS', 'TO', 'JP', 'GE', 'RO', 'US', 'CA', 'UY', 'NA'];
const BASEBALL = ['US', 'CA', 'JP', 'CU', 'DO', 'VE', 'MX', 'PR', 'KR', 'TW', 'PA', 'NI', 'NL'];
const HOCKEY = ['CA', 'US', 'SE', 'FI', 'RU', 'CZ', 'SK', 'CH', 'DE', 'AT', 'NO', 'LV', 'DK', 'GB', 'BY', 'KZ', 'SU'];
const SNOW = ['CH', 'AT', 'NO', 'SE', 'FI', 'FR', 'IT', 'DE', 'US', 'CA', 'JP', 'SI', 'RU', 'CZ', 'SK', 'PL', 'AD', 'LI', 'NZ', 'AU', 'KR', 'CN'];

export const SPORTS = {
  running: {
    label: 'Running', icon: '🏃', kind: 'sport', cost: 250, stat: 'fitness', minAge: 8, women: 1922,
    tiers: ['Jogger', 'Fun runner', 'Club runner', 'County runner', 'National-class', 'International'],
    club: { names: ['{town} Harriers', '{town} Athletic Club', '{town} Road Runners', '{town} Striders'], fee: 60 },
    body: [[1866, 'the Amateur Athletic Club', ['GB']], [1880, 'the Amateur Athletic Association', ['GB']], [1888, 'the Amateur Athletic Union', ['US']], [1912, 'the IAAF', '*'], [1912, 'the Amateur Athletic Association', ['GB']], [1979, 'The Athletics Congress', ['US']], [1992, 'USA Track & Field', ['US']], [1991, 'UK Athletics', ['GB']]],
    events: [
      [1800, ['a race at the village fête', 'a wager race on the turnpike', 'a pedestrianism match for a purse', 'a six-day go-as-you-please at the Agricultural Hall', 'a match against the champion pedestrian']],
      [1880, ['the club handicap', 'a club cross-country', 'the county sports', 'the national championships', 'an international match']],
      [1896, ['the club handicap', 'a club cross-country', 'the county championships', 'the national championships', 'the Olympic trials']],
      [1970, ['a fun run', 'a club 10K', 'the county championships', 'the national championships', 'a major city marathon']],
      [1982, ['a parkrun-style 5K', 'a club 10K', 'the county championships', 'the national championships', 'a Diamond League-style meet']],
    ],
    honours: [county(1880), cap(1890, 'a vest for your country'), olympics(1896, 1928)],
    amateurUntil: 1982,
    pro: ['athletics', 'pro', 1982],
  },
  football: {
    label: 'Football', icon: '⚽', kind: 'sport', cost: 300, stat: 'fitness', minAge: 5, women: 1895, womenBan: [1921, 1971, ['GB', 'IE']],
    tiers: ['Kickabout', 'Sunday league', 'Club side', 'County side', 'Semi-professional', 'International'],
    club: { names: ['{town} Football Club', '{town} Athletic', '{town} Rovers', '{town} Wanderers', '{town} United'], fee: 80 },
    body: [[1863, 'the Football Association', ['GB']], [1904, 'FIFA', '*'], [1904, 'the Football Association', ['GB']], [1913, 'the United States Football Association', ['US']], [1974, 'the US Soccer Federation', ['US']]],
    events: [
      [1800, ['a Shrovetide match through the town', 'a match on the common', 'a parish-against-parish match', 'a match against the public-school old boys', 'a match before a great crowd']],
      [1871, ['a kickabout on the rec', 'a league fixture', 'a county cup tie', 'an FA Cup tie', 'an international']],
      [1950, ['a Sunday-league fixture', 'a league fixture', 'the county cup', 'a non-league cup run', 'an international']],
    ],
    honours: [county(1880), cap(1872)],
    pro: ['athletics', 'pro', 1885],
  },
  tennis: {
    label: 'Tennis', icon: '🎾', kind: 'sport', cost: 600, stat: 'fitness', minAge: 6, from: 1874, women: 1884,
    club: { names: ['{town} Lawn Tennis Club', '{town} Tennis Club'], fee: 150 },
    body: [[1888, 'the Lawn Tennis Association', ['GB']], [1881, 'the US National Lawn Tennis Association', ['US']], [1913, 'the International Lawn Tennis Federation', '*'], [1913, 'the Lawn Tennis Association', ['GB']]],
    events: [
      [1874, ['a garden-party knock-up', 'the club tournament', 'the county championships', 'a national championship', 'Wimbledon']],
      [1968, ['a club social', 'the club championship', 'a county tournament', 'a satellite tournament', 'a Grand Slam qualifier']],
    ],
    honours: [county(1895), cap(1900, 'a Davis Cup tie'), olympics(1896, 1900, { until: 1925 }), olympics(1988, 1988)],
    amateurUntil: 1968,
    pro: ['athletics', 'pro', 1927],
  },
  boxing: {
    label: 'Boxing', icon: '🥊', kind: 'sport', cost: 500, stat: 'fitness', minAge: 10, risk: 0.08, women: 1996,
    tiers: ['Novice', 'Amateur', 'Club boxer', 'Regional champion', 'Prizefighter', 'Contender'],
    club: { names: ['{town} Amateur Boxing Club', 'the {town} Boys\' Club', '{town} Police Boxing Club'], fee: 40 },
    body: [[1880, 'the Amateur Boxing Association', ['GB']], [1888, 'the Amateur Athletic Union', ['US']], [1929, 'the British Boxing Board of Control', ['GB']], [1946, 'AIBA', '*'], [1946, 'the Amateur Boxing Association', ['GB']]],
    events: [
      [1800, ['a set-to behind the inn', 'a booth fight at the fair', 'a bare-knuckle prize fight', 'a fight for a purse of a hundred guineas', 'a championship of England under the London rules']],
      [1867, ['a sparring session', 'a club show', 'the regional championships', 'the national championships', 'a title fight']],
    ],
    honours: [cap(1900, 'a vest for your country'), olympics(1904, 2012)],
    pro: ['athletics', 'pro', 1800],
  },
  climbing: {
    label: 'Climbing', icon: '🧗', kind: 'sport', cost: 700, stat: 'fitness', minAge: 8, risk: 0.04, from: 1857,
    tiers: ['Scrambler', 'Hill walker', 'Club climber', 'Rock climber', 'Alpinist', 'Mountaineer'],
    club: { names: ['the {town} Mountaineering Club', 'the {town} Climbing Club'], fee: 70 },
    body: [[1857, 'the Alpine Club', '*'], [1932, 'the UIAA', '*']],
    events: [
      [1857, ['a scramble on the local crags', 'a club meet in the hills', 'a new route on the crag', 'an Alpine season', 'a first ascent in the greater ranges']],
      [1985, ['a bouldering session', 'a club meet', 'a regional bouldering competition', 'a national championship', 'an expedition to an 8,000-metre peak']],
    ],
    honours: [olympics(2020, 2020)],
    pro: ['athletics', 'minor', 1990],
  },
  cricket: {
    label: 'Cricket', icon: '🏏', kind: 'sport', cost: 450, stat: 'fitness', minAge: 7, places: COMMONWEALTH, women: 1890,
    tiers: ['Backyard', 'Village side', 'Club cricketer', 'County second XI', 'County player', 'Test cricketer'],
    club: { names: ['{town} Cricket Club', '{town} Cricket & Athletic Club'], fee: 100 },
    body: [[1787, 'the Marylebone Cricket Club', '*'], [1909, 'the Imperial Cricket Conference', '*'], [1965, 'the International Cricket Conference', '*'], [1989, 'the International Cricket Council', '*']],
    events: [
      [1800, ['a game on the village green', 'a village match', 'a gentlemen-against-players match', 'a county match', 'a match at Lord\'s']],
      [1877, ['a game in the nets', 'a league match', 'a county second XI match', 'a county championship match', 'a Test match']],
      [1975, ['a game in the nets', 'a league match', 'a county second XI match', 'a one-day cup final', 'a World Cup match']],
    ],
    honours: [cap(1877, 'a Test cap')],
    amateurUntil: 1963,
    pro: ['athletics', 'pro', 1846],
  },
  rugby: {
    label: 'Rugby', icon: '🏉', kind: 'sport', cost: 350, stat: 'fitness', minAge: 7, from: 1845, places: RUGBY, risk: 0.06, women: 1983,
    club: { names: ['{town} Rugby Football Club', '{town} RFC', '{town} Old Boys'], fee: 90 },
    body: [[1871, 'the Rugby Football Union', ['GB']], [1886, 'the International Rugby Football Board', '*'], [1998, 'the International Rugby Board', '*'], [2014, 'World Rugby', '*']],
    events: [
      [1845, ['a scrum on the school field', 'a club fixture', 'a county match', 'a trial for the national side', 'an international']],
      [1987, ['a touch-rugby evening', 'a club fixture', 'a county match', 'a professional trial', 'a World Cup match']],
    ],
    honours: [county(1880), cap(1871), olympics(2016, 2016)],
    amateurUntil: 1995,
    pro: ['athletics', 'pro', 1995],
  },
  golf: {
    label: 'Golf', icon: '⛳', kind: 'sport', cost: 1200, stat: 'fitness', minAge: 8, women: 1893,
    tiers: ['Hacker', 'High handicap', 'Club golfer', 'Single figures', 'Scratch golfer', 'Tour player'],
    club: { names: ['{town} Golf Club', 'the {town} Golf Links', '{town} Country Club'], fee: 900 },
    body: [[1754, 'the Royal and Ancient Golf Club', '*'], [1894, 'the United States Golf Association', ['US']]],
    events: [
      [1800, ['a round on the links', 'the club medal', 'the county championship', 'the Amateur Championship', 'the Open Championship']],
      [1934, ['a round with friends', 'the club medal', 'the county championship', 'the national amateur', 'a major']],
    ],
    honours: [county(1890), cap(1922, 'a Walker Cup place'), olympics(2016, 2016)],
    pro: ['athletics', 'pro', 1860],
  },
  rowing: {
    label: 'Rowing', icon: '🚣', kind: 'sport', cost: 700, stat: 'fitness', minAge: 12, women: 1919,
    tiers: ['Novice', 'Novice crew', 'Club oarsman', 'Regatta winner', 'National squad', 'Olympic oarsman'],
    club: { names: ['{town} Rowing Club', '{town} Amateur Rowing Club', '{town} Boat Club'], fee: 200 },
    body: [[1882, 'the Amateur Rowing Association', ['GB']], [1872, 'the National Association of Amateur Oarsmen', ['US']], [1892, 'FISA', '*']],
    events: [
      [1800, ['an outing on the river', 'a bumps race', 'a regional regatta', 'Henley Royal Regatta', 'the Diamond Sculls']],
      [1950, ['a learn-to-row outing', 'a club regatta', 'a regional regatta', 'the national championships', 'the world championships']],
    ],
    honours: [cap(1900, 'the national squad'), olympics(1900, 1976)],
    amateurUntil: 3000,
  },
  cycling: {
    label: 'Cycling', icon: '🚴', kind: 'sport', cost: 800, stat: 'fitness', minAge: 8, from: 1885, risk: 0.04, women: 1890,
    tiers: ['Pootler', 'Club rider', 'Time triallist', 'Category rider', 'Domestic pro', 'Grand Tour rider'],
    club: { names: ['{town} Cycling Club', '{town} Wheelers', '{town} Road Club'], fee: 50 },
    body: [[1878, 'the Bicycle Union', ['GB']], [1900, 'the Union Cycliste Internationale', '*'], [1959, 'the British Cycling Federation', ['GB']]],
    events: [
      [1885, ['a club run', 'a club 25-mile time trial', 'a road race', 'the national championships', 'a great stage race']],
      [1903, ['a club run', 'a club 25-mile time trial', 'a regional road race', 'the national championships', 'the Tour de France']],
    ],
    honours: [cap(1900, 'the national team'), olympics(1896, 1984)],
    pro: ['athletics', 'pro', 1890],
  },
  swimming: {
    label: 'Swimming', icon: '🏊', kind: 'sport', cost: 200, stat: 'fitness', minAge: 5, women: 1900,
    club: { names: ['{town} Swimming Club', '{town} Amateur Swimming Club'], fee: 60 },
    body: [[1886, 'the Amateur Swimming Association', ['GB']], [1908, 'FINA', '*']],
    events: [
      [1800, ['a swim in the river', 'a club gala', 'the county gala', 'the national championships', 'a Channel swim']],
      [1908, ['a lesson at the baths', 'a club gala', 'the county championships', 'the national championships', 'an international meet']],
    ],
    honours: [county(1890), olympics(1896, 1912)],
    amateurUntil: 1988,
  },
  baseball: {
    label: 'Baseball', icon: '⚾', kind: 'sport', cost: 350, stat: 'fitness', minAge: 6, from: 1845, places: BASEBALL, women: 1943,
    tiers: ['Sandlot', 'Little League', 'High school team', 'College ball', 'Minor leagues', 'Major-league prospect'],
    club: { names: ['the {town} Nine', '{town} Base Ball Club', 'the {town} Little League'], fee: 80 },
    body: [[1858, 'the National Association of Base Ball Players', ['US']], [1876, 'the National League', ['US']], [1903, 'Major League Baseball', ['US']], [1936, 'the Japanese Baseball League', ['JP']]],
    events: [
      [1845, ['a game in the vacant lot', 'a club match', 'a county championship', 'a tour of the town nines', 'a game before ten thousand']],
      [1939, ['a sandlot game', 'a Little League game', 'the state playoffs', 'the College World Series', 'a minor-league call-up']],
    ],
    honours: [olympics(1992, 3000, { until: 2009 })],
    pro: ['athletics', 'pro', 1869],
  },
  basketball: {
    label: 'Basketball', icon: '🏀', kind: 'sport', cost: 200, stat: 'fitness', minAge: 6, from: 1892, women: 1893,
    club: { names: ['the {town} YMCA team', '{town} Basketball Club'], fee: 60 },
    body: [[1932, 'FIBA', '*'], [1946, 'the Basketball Association of America', ['US']], [1949, 'the NBA', ['US']]],
    events: [[1892, ['pick-up at the Y', 'a league game', 'the state championship', 'a college tournament', 'a professional tryout']]],
    honours: [olympics(1936, 1976)],
    pro: ['athletics', 'pro', 1898],
  },
  iceHockey: {
    label: 'Ice hockey', icon: '🏒', kind: 'sport', cost: 900, stat: 'fitness', minAge: 6, from: 1875, places: HOCKEY, risk: 0.05, women: 1990,
    club: { names: ['the {town} Hockey Club', 'the {town} Juniors'], fee: 250 },
    body: [[1908, 'the International Ice Hockey Federation', '*'], [1917, 'the National Hockey League', ['US', 'CA']]],
    events: [[1875, ['shinny on the pond', 'a league game', 'the provincial playoffs', 'a national junior final', 'a professional tryout']]],
    honours: [olympics(1920, 1998, { winter: true })],
    pro: ['athletics', 'pro', 1904],
  },
  skiing: {
    label: 'Skiing', icon: '⛷️', kind: 'sport', cost: 1500, stat: 'fitness', minAge: 5, from: 1880, places: SNOW, risk: 0.04,
    club: { names: ['the {town} Ski Club', 'the {town} Ski & Snowboard Club'], fee: 200 },
    body: [[1924, 'the International Ski Federation', '*']],
    events: [[1880, ['a day on the nursery slopes', 'a club race', 'a regional slalom', 'the national championships', 'a World Cup downhill']]],
    honours: [olympics(1936, 1936, { winter: true })],
  },
  fencing: {
    label: 'Fencing', icon: '🤺', kind: 'sport', cost: 600, stat: 'fitness', minAge: 9, women: 1900,
    club: { names: ['the {town} Salle', 'the {town} Fencing Club'], fee: 120 },
    body: [[1913, 'the Fédération Internationale d\'Escrime', '*']],
    events: [[1800, ['a bout at the salle', 'a club competition', 'a regional open', 'the national championships', 'a world championship']]],
    honours: [olympics(1896, 1924)],
    amateurUntil: 3000,
  },
  horseRiding: {
    label: 'Riding', icon: '🏇', kind: 'sport', cost: 2500, stat: 'fitness', minAge: 5, risk: 0.05,
    tiers: ['Pony rider', 'Hacking out', 'Pony Club rider', 'Eventer', 'County show winner', 'Olympic rider'],
    club: { names: ['the {town} Hunt', 'the {town} Pony Club', 'the {town} Riding Club'], fee: 400 },
    body: [[1921, 'the Fédération Équestre Internationale', '*']],
    events: [[1800, ['a ride out', 'a gymkhana', 'the county show', 'a three-day event', 'an international horse show']]],
    honours: [olympics(1912, 1952)],
  },
  sailing: {
    label: 'Sailing', icon: '⛵', kind: 'sport', cost: 1800, stat: 'fitness', minAge: 8,
    club: { names: ['the {town} Sailing Club', 'the Royal {town} Yacht Club', 'the {town} Yacht Club'], fee: 600 },
    body: [[1907, 'the International Yacht Racing Union', '*'], [1996, 'the International Sailing Federation', '*']],
    events: [[1800, ['a sail round the bay', 'a club race', 'a regatta', 'the national championship', 'an ocean race']]],
    honours: [olympics(1900, 1900)],
  },
  motorRacing: {
    label: 'Motor racing', icon: '🏎️', kind: 'sport', cost: 8000, stat: 'fitness', minAge: 12, from: 1902, risk: 0.07,
    tiers: ['Karter', 'Club racer', 'National racer', 'Formula racer', 'Works driver', 'Grand Prix driver'],
    club: { names: ['the {town} Motor Club', 'the {town} Kart Club'], fee: 300 },
    body: [[1904, 'the AIACR', '*'], [1946, 'the FIA', '*']],
    events: [
      [1902, ['a hill climb', 'a club sprint', 'a race at the circuit', 'a national Grand Prix', 'a great road race']],
      [1960, ['a karting meet', 'a club race', 'a national championship round', 'a Formula 3 race', 'a Grand Prix']],
    ],
    pro: ['athletics', 'pro', 1920],
  },
  martialArts: {
    label: 'Martial arts', icon: '🥋', kind: 'sport', cost: 400, stat: 'fitness', minAge: 6, from: 1882,
    tiers: ['White belt', 'Coloured belt', 'Brown belt', 'Black belt', 'Senior dan grade', 'Master'],
    club: { names: ['the {town} Judo Club', 'the {town} Dojo', '{town} Karate Club'], fee: 80 },
    body: [[1882, 'the Kodokan', ['JP']], [1951, 'the International Judo Federation', '*']],
    events: [[1882, ['a grading', 'a club randori', 'a regional tournament', 'the national championships', 'a world championship']]],
    honours: [olympics(1964, 1992)],
  },
  surfing: {
    label: 'Surfing', icon: '🏄', kind: 'sport', cost: 600, stat: 'fitness', minAge: 8, from: 1958, places: ['US', 'AU', 'BR', 'ZA', 'PT', 'FR', 'NZ', 'ID', 'PE', 'MX', 'CR', 'GB', 'IE', 'JP', 'ES', 'MA'],
    club: { names: ['the {town} Boardriders', 'the {town} Surf Life Saving Club'], fee: 50 },
    body: [[1964, 'the International Surfing Association', '*']],
    events: [[1958, ['a session at the beach break', 'a club comp', 'a regional contest', 'the national titles', 'a world tour event']]],
    honours: [olympics(2020, 2020)],
  },
  skateboarding: {
    label: 'Skateboarding', icon: '🛹', kind: 'sport', cost: 200, stat: 'fitness', minAge: 7, from: 1965, risk: 0.05,
    events: [[1965, ['the car park', 'a local jam', 'a regional contest', 'a national contest', 'the X Games']]],
    honours: [olympics(2020, 2020)],
  },
};
