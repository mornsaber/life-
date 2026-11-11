/**
 * Music, art, writing and the crafts, as they were in their day. Schema: life/pursuits/registry.js.
 */
export const ARTS = {
  guitar: {
    label: 'Guitar', icon: '🎸', kind: 'music', cost: 400, stat: 'smarts', minAge: 7,
    events: [
      [1800, ['a song in the parlour', 'a turn at the music hall\'s amateur night', 'a regional eisteddfod', 'a concert in the assembly rooms', 'a recital in the capital']],
      [1950, ['a skiffle night', 'a dance-hall booking', 'a regional battle of the bands', 'a support slot on a package tour', 'a headline set on national radio']],
      [1970, ['an open-mic night', 'a battle of the bands', 'a regional music festival slot', 'a support slot for a touring act', 'a headline set at a national festival']],
    ],
    club: { names: ['the {town} Folk Club', 'the {town} Guitar Society'], fee: 30 },
    pro: ['music', 'session', 1800],
  },
  piano: {
    label: 'Piano', icon: '🎹', kind: 'music', cost: 700, stat: 'smarts', minAge: 5,
    tiers: ['Beginner', 'Grade 3', 'Grade 6', 'Grade 8', 'Diploma', 'Concert pianist'],
    events: [
      [1800, ['a piece after Sunday dinner', 'a recital at the vicarage', 'the county music festival', 'a concert in the assembly rooms', 'a debut in the capital']],
      [1950, ['a school concert', 'a local competitive festival', 'a regional young musician round', 'a national competition', 'an international piano competition']],
    ],
    body: [[1889, 'the Associated Board of the Royal Schools of Music', ['GB', 'IE', 'AU', 'NZ', 'ZA', 'IN', 'SG', 'MY', 'HK']]],
    pro: ['music', 'session', 1800],
  },
  violin: {
    label: 'Violin', icon: '🎻', kind: 'music', cost: 600, stat: 'smarts', minAge: 5,
    tiers: ['Beginner', 'Grade 3', 'Grade 6', 'Grade 8', 'Diploma', 'Soloist'],
    club: { names: ['the {town} Orchestral Society', 'the {town} Youth Orchestra', 'the {town} Fiddle Club'], fee: 40 },
    events: [[1800, ['a tune at a ceilidh', 'the town orchestra', 'the county youth orchestra', 'the national youth orchestra', 'a concerto with a professional orchestra']]],
    pro: ['music', 'session', 1800],
  },
  singing: {
    label: 'Singing', icon: '🎤', kind: 'music', cost: 300, stat: 'looks', minAge: 6,
    club: { names: ['the {town} Choral Society', 'the {town} Male Voice Choir', 'St Mary\'s choir', 'the {town} Gilbert & Sullivan Society'], fee: 30 },
    events: [
      [1800, ['the church choir', 'a solo at the chapel anniversary', 'a regional eisteddfod', 'a music-hall turn', 'a part with a touring opera company']],
      [1960, ['a karaoke night', 'a choir concert', 'a regional singing competition', 'a televised talent show', 'a record deal showcase']],
    ],
    pro: ['music', 'session', 1800],
  },
  painting: {
    label: 'Painting', icon: '🎨', kind: 'art', cost: 350, stat: 'smarts', minAge: 5,
    club: { names: ['the {town} Art Society', 'the {town} Sketching Club'], fee: 30 },
    events: [
      [1800, ['the village show', 'the art society\'s exhibition', 'a provincial academy\'s exhibition', 'the Summer Exhibition', 'a one-man show in the capital']],
      [1950, ['the village show', 'a café exhibition', 'a juried regional exhibition', 'a gallery\'s group show', 'a solo show in the capital']],
    ],
    pro: ['design', 'designer', 1900],
  },
  photography: {
    label: 'Photography', icon: '📷', kind: 'art', cost: 900, stat: 'smarts', minAge: 10, from: 1855,
    club: { names: ['the {town} Camera Club', 'the {town} Photographic Society'], fee: 40 },
    body: [[1853, 'the Photographic Society', ['GB']], [1894, 'the Royal Photographic Society', ['GB']]],
    events: [
      [1855, ['a portrait of the family', 'the camera club\'s print night', 'a photographic society exhibition', 'a salon in the capital', 'plates in an illustrated weekly']],
      [1950, ['the village show', 'a camera-club competition', 'a regional salon', 'a national photography award', 'a magazine commission']],
    ],
    pro: ['design', 'designer', 1900],
  },
  writing: {
    label: 'Writing', icon: '✍️', kind: 'art', cost: 50, stat: 'smarts', minAge: 8,
    events: [
      [1800, ['a poem in the parish magazine', 'a story in a weekly paper', 'a serial in a monthly', 'a publisher\'s reader', 'a three-volume novel']],
      [1950, ['a library short-story contest', 'a literary magazine', 'a national short-story prize', 'an agent\'s slush pile', 'a publishing deal']],
    ],
    club: { names: ['the {town} Writers\' Circle', 'the {town} Literary Society'], fee: 20 },
    pro: ['contentCreator', 'partTime', 2005],
  },
  cooking: {
    label: 'Cooking', icon: '🍳', kind: 'art', cost: 500, stat: 'smarts', minAge: 10,
    events: [
      [1800, ['Sunday dinner', 'the village show\'s baking', 'the county show', 'a dinner for the squire\'s guests', 'a book of your receipts in print']],
      [1960, ['a dinner party', 'the village show\'s baking', 'a regional cookery competition', 'a televised cooking contest', 'a cookbook deal']],
    ],
    pro: ['culinary', 'partie', 1800],
  },
  theatre: {
    label: 'Amateur dramatics', icon: '🎭', kind: 'art', cost: 150, stat: 'looks', minAge: 7,
    tiers: ['Walk-on', 'Chorus', 'Supporting role', 'Leading role', 'Directing', 'Celebrated'],
    club: { names: ['the {town} Players', 'the {town} Amateur Dramatic Society', 'the {town} Little Theatre'], fee: 30 },
    events: [[1800, ['a part in the Christmas play', 'the society\'s spring production', 'a drama festival', 'a lead in the town\'s big production', 'a transfer to a professional stage']]],
    pro: ['acting', null, 1800],
  },
  dance: {
    label: 'Dancing', icon: '💃', kind: 'art', cost: 400, stat: 'fitness', minAge: 5,
    club: { names: ['the {town} School of Dance', 'the {town} Ballroom Club', 'the {town} Scottish Country Dance Society'], fee: 60 },
    events: [
      [1800, ['an assembly ball', 'a country-dance evening', 'a county dance', 'a hunt ball', 'a ball at court']],
      [1920, ['a dance at the palais', 'a club medal test', 'a regional championship', 'the national championships', 'the Blackpool festival']],
    ],
  },
  gardening: {
    label: 'Gardening', icon: '🌻', kind: 'craft', cost: 150, stat: 'fitness', minAge: 8,
    tiers: ['Pot plants', 'Allotment holder', 'Keen gardener', 'Show grower', 'Champion grower', 'Garden opened to the public'],
    club: { names: ['the {town} Horticultural Society', 'the {town} Allotment Society'], fee: 15 },
    events: [[1800, ['the garden', 'the village show', 'the county flower show', 'a national flower show', 'a gold medal at a great flower show']]],
  },
  needlework: {
    label: 'Needlework', icon: '🧵', kind: 'craft', cost: 100, stat: 'smarts', minAge: 7,
    tiers: ['Beginner', 'Sampler', 'Accomplished', 'Show winner', 'Master craftswoman', 'Exhibited'],
    club: { names: ['the {town} Embroiderers\' Guild', 'the {town} Quilting Bee', 'the {town} Women\'s Institute'], fee: 15 },
    events: [[1800, ['a sampler', 'the church bazaar', 'the county show', 'a national exhibition', 'a piece bought by a museum']]],
  },
  woodwork: {
    label: 'Woodwork', icon: '🪚', kind: 'craft', cost: 300, stat: 'smarts', minAge: 9,
    club: { names: ['the {town} Woodworkers\' Guild', 'the {town} Men\'s Shed'], fee: 20 },
    events: [[1800, ['a stool for the kitchen', 'the village show', 'a craft fair', 'a national exhibition', 'a commission for a cathedral']]],
  },
};
