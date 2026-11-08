/**
 * The work of the twentieth century that the twenty-first mostly lost: down the pit, in the mill,
 * below stairs, at the typing pool and the switchboard, on the docks and the milk round. Each
 * opens and closes with its era (`fromYear`/`untilYear`, world/Eras.js): the job board shows
 * them only while they exist, and lives started today never see them.
 */
const OLD = { sector: 'private', sizes: { small: 2, medium: 3, large: 3, enterprise: 2 }, minAge: 14, union: { chance: 0.6, name: 'the union', strike: true }, entry: {} };

const careers = {
  coalMining: {
    ...OLD, id: 'coalMining', name: 'Coal Mining', icon: '⛏️', payMultiplier: 0.9, untilYear: 1995, cyclical: 1.3,
    employers: ['the Colliery Company', 'the National Coal Board', 'Valley Pit No. 3', 'Deep Navigation Colliery'],
    union: { chance: 0.95, name: 'the Mineworkers\' Union', strike: true },
    ladder: [
      ['pitBoy', 'Pit Boy', 1, { years: 2 }],
      ['haulier', 'Haulier', 2],
      ['collier', 'Collier (Face Worker)', 3],
      ['deputy', 'Pit Deputy', 4, { abilities: ['supervise'], reports: 30 }],
      ['overman', 'Overman', 5, { abilities: ['supervise'], reports: 120 }],
      ['manager', 'Colliery Manager', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'hire'], reports: 900 }],
    ],
  },
  millWork: {
    ...OLD, id: 'millWork', name: 'Mill & Factory Work', icon: '🏭', payMultiplier: 0.75, untilYear: 1985, cyclical: 1.2,
    employers: ['Riverside Cotton Mill', 'the Steelworks', 'Albion Spinning Company', 'the Brass Foundry'],
    ladder: [
      ['halfTimer', 'Half-Timer (Apprentice)', 1, { years: 2 }],
      ['operative', 'Mill Operative', 2],
      ['skilled', 'Skilled Hand (Weaver / Moulder)', 3],
      ['overlooker', 'Overlooker', 4, { abilities: ['supervise'], reports: 25 }],
      ['manager', 'Mill Manager', 6, { track: 'mgmt', abilities: ['supervise', 'budget', 'hire'], reports: 400 }],
    ],
  },
  domesticService: {
    ...OLD, id: 'domesticService', name: 'Domestic Service', icon: '🧹', payMultiplier: 0.55, untilYear: 1960, union: null,
    sizes: { small: 4, medium: 2 },
    employers: ['a great house in the country', 'a townhouse in the best square', 'a doctor\'s household', 'a merchant\'s family'],
    ladder: [
      ['scullery', 'Scullery Maid / Hall Boy', 1, { years: 2 }],
      ['housemaid', 'Housemaid / Footman', 2],
      ['lady', 'Lady\'s Maid / Valet', 3],
      ['housekeeper', 'Housekeeper / Butler', 5, { abilities: ['supervise'], reports: 15 }],
    ],
  },
  typingPool: {
    ...OLD, id: 'typingPool', name: 'Typing Pool & Secretarial', icon: '⌨️', payMultiplier: 0.7, fromYear: 1900, untilYear: 1995, minAge: 16, union: null,
    employers: ['the Insurance Office', 'the Ministry', 'Consolidated Shipping', 'the Bank\'s head office'],
    ladder: [
      ['junior', 'Junior Typist', 1, { years: 1 }],
      ['typist', 'Shorthand Typist', 2],
      ['secretary', 'Secretary', 3],
      ['private', 'Private Secretary to the Chairman', 4],
      ['supervisor', 'Typing Pool Supervisor', 4, { abilities: ['supervise'], reports: 30 }],
    ],
  },
  switchboard: {
    ...OLD, id: 'switchboard', name: 'Telephone Exchange', icon: '☎️', payMultiplier: 0.7, fromYear: 1900, untilYear: 1980, minAge: 16,
    employers: ['the Telephone Exchange', 'the Post Office Telephones', 'the Bell Telephone Company'],
    ladder: [
      ['operator', 'Switchboard Operator', 1, { years: 1 }],
      ['senior', 'Senior Operator', 2],
      ['supervisor', 'Exchange Supervisor', 4, { abilities: ['supervise'], reports: 40 }],
    ],
  },
  docks: {
    ...OLD, id: 'docks', name: 'Dock Work', icon: '⚓', payMultiplier: 0.85, untilYear: 1975, minAge: 16, cyclical: 1.3,
    employers: ['the Port Authority', 'the Royal Docks', 'the Harbour Board'],
    union: { chance: 0.9, name: 'the Dockers\' Union', strike: true },
    ladder: [
      ['casual', 'Casual Docker', 1, { years: 2 }],
      ['docker', 'Registered Docker', 2],
      ['ganger', 'Ganger', 3, { abilities: ['supervise'], reports: 12 }],
      ['foreman', 'Dock Foreman', 4, { abilities: ['supervise'], reports: 60 }],
    ],
  },
  milkRound: {
    ...OLD, id: 'milkRound', name: 'The Milk Round', icon: '🥛', payMultiplier: 0.65, untilYear: 1985, minAge: 14, union: null,
    employers: ['the Co-operative Dairy', 'United Dairies', 'Meadowbrook Farm Dairy'],
    ladder: [
      ['boy', 'Milk Boy', 1, { years: 1 }],
      ['roundsman', 'Roundsman', 2],
      ['depot', 'Depot Manager', 4, { abilities: ['supervise'], reports: 20 }],
    ],
  },
  steamRailway: {
    ...OLD, id: 'steamRailway', name: 'The Steam Railway', icon: '🚂', payMultiplier: 0.85, untilYear: 1968, minAge: 15,
    employers: ['the Great Western Railway', 'the Northern Railway Company', 'the State Railways'],
    union: { chance: 0.9, name: 'the Railwaymen\'s Union', strike: true },
    ladder: [
      ['cleaner', 'Engine Cleaner', 1, { years: 2 }],
      ['fireman', 'Fireman (Stoker)', 2, { years: 3 }],
      ['driver', 'Engine Driver', 4],
      ['inspector', 'Locomotive Inspector', 5, { abilities: ['supervise'], reports: 40 }],
    ],
  },
  travellingSales: {
    ...OLD, id: 'travellingSales', name: 'Travelling Salesman', icon: '🧳', payMultiplier: 0.8, untilYear: 1985, minAge: 18, union: null,
    employers: ['the Encyclopaedia Company', 'Fuller Brush', 'the Hoover Company', 'Imperial Sewing Machines'],
    ladder: [
      ['rep', 'Door-to-Door Rep', 1, { years: 1 }],
      ['traveller', 'Commercial Traveller', 2],
      ['area', 'Area Manager', 4, { abilities: ['supervise'], reports: 15 }],
      ['sales', 'Sales Director', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 120 }],
    ],
  },
  lamplighter: {
    ...OLD, id: 'lamplighter', name: 'Lamplighter & Gas Works', icon: '🏮', payMultiplier: 0.6, untilYear: 1935, minAge: 14, union: null,
    employers: ['the Gas Light and Coke Company', 'the Corporation Gas Works'],
    ladder: [
      ['lamplighter', 'Lamplighter', 1, { years: 2 }],
      ['fitter', 'Gas Fitter', 2],
      ['foreman', 'Gas Works Foreman', 4, { abilities: ['supervise'], reports: 30 }],
    ],
  },
};

export default { id: 'careers-period', version: 1, careers };
