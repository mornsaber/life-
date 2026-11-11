/**
 * Games of the mind and pastimes, with their titles and the eras they belong to.
 * Schema: life/pursuits/registry.js.
 */
export const MINDS = {
  chess: {
    label: 'Chess', icon: '♟️', kind: 'mind', cost: 100, stat: 'smarts', minAge: 6,
    tiers: ['Beginner', 'Club player', 'County player', 'Candidate master', 'Master', 'Grandmaster'],
    club: { names: ['the {town} Chess Club', 'the {town} Chess Circle', 'the chess room at the {town} Institute'], fee: 20 },
    body: [[1904, 'the British Chess Federation', ['GB']], [1924, 'FIDE', '*'], [1939, 'the US Chess Federation', ['US']]],
    events: [
      [1800, ['a game at the coffee house', 'a club match', 'a county match by correspondence', 'a national tournament', 'a match against a master']],
      [1924, ['the club ladder', 'a weekend congress', 'the county championship', 'the national championship', 'an international tournament']],
      [1948, ['the club ladder', 'a weekend open', 'the national championship', 'a zonal tournament', 'the Candidates tournament']],
    ],
    honours: [{ id: 'olympiad', label: 'your country\'s Chess Olympiad team', skill: 86, odds: 0.3, from: 1927, icon: '♟️' }, { id: 'gm', label: 'the grandmaster title', skill: 95, odds: 0.25, from: 1950, icon: '👑', honor: { name: 'FIDE Grandmaster' } }],
    pro: ['contentCreator', 'partTime', 2010],
  },
  bridge: {
    label: 'Bridge', icon: '🃏', kind: 'mind', cost: 60, stat: 'smarts', minAge: 12, from: 1904,
    tiers: ['Kitchen bridge', 'Club player', 'County player', 'Master', 'Life master', 'International'],
    club: { names: ['the {town} Bridge Club', 'the card room at the {town} Club'], fee: 25 },
    body: [[1937, 'the English Bridge Union', ['GB']], [1937, 'the American Contract Bridge League', ['US']], [1958, 'the World Bridge Federation', '*']],
    events: [
      [1904, ['a rubber after dinner', 'a club duplicate', 'a county pairs', 'the national championships', 'the Bermuda Bowl']],
    ],
  },
  draughts: {
    label: 'Draughts', icon: '⚫', kind: 'mind', cost: 20, stat: 'smarts', minAge: 6, until: 1960,
    club: { names: ['the {town} Draughts Club'], fee: 10 },
    events: [[1800, ['a game at the pub', 'a club match', 'a county match', 'the national championship', 'a match for the world title']]],
  },
  debating: {
    label: 'Debating', icon: '🗣️', kind: 'mind', cost: 50, stat: 'smarts', minAge: 13,
    club: { names: ['the {town} Debating Society', 'the {town} Mutual Improvement Society', 'the {town} Speakers\' Club'], fee: 15 },
    events: [[1800, ['a debate in class', 'a society motion', 'a regional debating competition', 'the national schools final', 'the world championship']]],
  },
  amateurRadio: {
    label: 'Amateur radio', icon: '📻', kind: 'mind', cost: 600, stat: 'smarts', minAge: 12, from: 1912,
    tiers: ['Listener', 'Licensed ham', 'Club operator', 'DX hunter', 'Contest winner', 'Legend of the bands'],
    club: { names: ['the {town} Amateur Radio Society', 'the {town} Radio Club'], fee: 20 },
    body: [[1913, 'the Radio Society of Great Britain', ['GB']], [1914, 'the American Radio Relay League', ['US']], [1925, 'the International Amateur Radio Union', '*']],
    events: [[1912, ['a contact across the county', 'a contact across the ocean', 'a field day', 'a national contest', 'a world DX contest']]],
  },
  birdwatching: {
    label: 'Birdwatching', icon: '🐦', kind: 'mind', cost: 300, stat: 'smarts', minAge: 7,
    tiers: ['Garden birds', 'Weekend birder', 'Society member', 'County recorder', 'Rarity finder', 'Leading naturalist'],
    club: { names: ['the {town} Natural History Society', 'the {town} Bird Club'], fee: 15 },
    body: [[1889, 'the Society for the Protection of Birds', ['GB']], [1905, 'the National Audubon Society', ['US']]],
    events: [[1800, ['a list of the garden birds', 'a society field trip', 'a county bird report', 'a national rarity', 'a paper in a learned journal']]],
  },
  modelRailways: {
    label: 'Model railways', icon: '🚂', kind: 'craft', cost: 500, stat: 'smarts', minAge: 8, from: 1900,
    club: { names: ['the {town} Model Railway Club'], fee: 25 },
    events: [[1900, ['a layout in the attic', 'a club open day', 'a regional exhibition', 'a national exhibition', 'a layout in a magazine']]],
  },
  coding: {
    label: 'Coding', icon: '💻', kind: 'mind', cost: 600, stat: 'smarts', minAge: 9, from: 1978,
    tiers: ['Tinkerer', 'Hobbyist', 'Contributor', 'Hackathon winner', 'Respected maintainer', 'Famous for a project'],
    events: [
      [1978, ['a program typed in from a magazine', 'a game for the home computer', 'a program sold by mail order', 'a hit on the bulletin boards', 'a game published by a software house']],
      [2000, ['a script for yourself', 'an open-source contribution', 'a hackathon', 'an app with real users', 'a project the world uses']],
    ],
    pro: ['tech', null, 1980],
  },
  videoGames: {
    label: 'Video games', icon: '🎮', kind: 'mind', cost: 400, stat: 'smarts', minAge: 6, from: 1977,
    tiers: ['Casual', 'Regular', 'Ranked', 'Top-ranked', 'Semi-pro', 'Esports pro'],
    events: [
      [1977, ['a high score at the arcade', 'the top of the arcade\'s table', 'a regional high-score contest', 'a national championship', 'a world-record score in a magazine']],
      [2000, ['a night online', 'a ranked ladder', 'a regional tournament', 'a national league', 'an international esports final']],
    ],
    pro: ['contentCreator', 'partTime', 2008],
  },
};
