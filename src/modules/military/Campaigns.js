/**
 * The campaigns of history's wars: where a deployment actually went. In a war of history
 * (world/History.js), your tour is a real campaign for your country, your branch and the year:
 * the Somme or Gallipoli, the Battle of Britain or the Atlantic convoys, Kohima, Tarawa, the
 * Chosin Reservoir, Khe Sanh, San Carlos, Helmand. Each is remembered on your record, and the
 * Commonwealth's campaign stars (Atlantic, Africa, Burma, Italy, France and Germany, Pacific, Air
 * Crew Europe) are awarded once each; Americans count battle stars on the campaign medal.
 *
 * svc.campaigns = [{ id, name, year, war }]
 */
import { addHonor } from '../../core/State.js';
import { yearNow } from '../world/Eras.js';

const CW = ['GB', 'CA', 'AU', 'NZ', 'IN', 'ZA', 'IE'];
const ALL = '*';
const R = (...s) => s.map((x) => (Array.isArray(x) ? x : [x, 1]));

/** { id, name, from, until, nations, branches, text, star? } by war (id, or a name pattern for later wars). */
export const CAMPAIGNS = {
  boerWar: [
    { id: 'ladysmith', name: 'the relief of Ladysmith', from: 1899, until: 1901, nations: CW, branches: ['army'], text: 'Weeks of attacks across the Tugela, and at last the relief of the besieged town.' },
    { id: 'guerrilla', name: 'the guerrilla war on the veldt', from: 1900, until: 1903, nations: CW, branches: ['army'], text: 'Columns chasing Boer commandos across the veldt; blockhouses, and the camps.' },
  ],
  ww1: [
    { id: 'gallipoli', name: 'Gallipoli', from: 1915, until: 1916, nations: ['GB', 'AU', 'NZ', 'FR', 'IN', 'TR'], branches: ['army', 'navy', 'marines'], text: 'The landings at the cove, the cliffs above, and eight months clinging to the slopes.' },
    { id: 'somme', name: 'the Somme', from: 1916, until: 1917, nations: ['GB', 'CA', 'AU', 'NZ', 'ZA', 'IN', 'IE', 'FR', 'DE'], branches: ['army'], text: 'The whistles at dawn on the first of July, and the long months after.' },
    { id: 'verdun', name: 'Verdun', from: 1916, until: 1917, nations: ['FR', 'DE'], branches: ['army'], text: 'Ten months of shellfire on the heights around the fortress.' },
    { id: 'vimy', name: 'Vimy Ridge', from: 1917, until: 1918, nations: ['CA'], branches: ['army'], text: 'The four Canadian divisions together for the first time, and the ridge taken.' },
    { id: 'passchendaele', name: 'Passchendaele', from: 1917, until: 1918, nations: ['GB', 'CA', 'AU', 'NZ', 'DE'], branches: ['army'], text: 'Mud to the waist, duckboards, and a ridge measured in yards.' },
    { id: 'ypres', name: 'the Ypres salient', from: 1914, until: 1919, nations: ['GB', 'CA', 'IN', 'FR', 'DE', 'IE'], branches: ['army'], text: 'The salient: gas, shelling, and the Menin Gate road.' },
    { id: 'isonzo', name: 'the Isonzo front', from: 1915, until: 1918, nations: ['IT', 'AT'], branches: ['army'], text: 'Twelve battles on the river and the mountains above it.' },
    { id: 'eastern1', name: 'the Eastern Front', from: 1914, until: 1918, nations: ['RU', 'DE', 'AT'], branches: ['army'], text: 'Vast distances, shortages of everything, and winter.' },
    { id: 'mesopotamia', name: 'Mesopotamia', from: 1915, until: 1919, nations: ['GB', 'IN'], branches: ['army'], text: 'Heat, disease and the long advance up the Tigris.' },
    { id: 'argonne', name: 'the Meuse–Argonne', from: 1918, until: 1919, nations: ['US'], branches: ['army', 'marines'], text: 'The American Expeditionary Forces\' great offensive in the forest.' },
    { id: 'jutland', name: 'the Battle of Jutland', from: 1916, until: 1917, nations: ['GB', 'DE', 'AU'], branches: ['navy'], text: 'The fleets met in the North Sea; ships blew up and the line held.' },
    { id: 'uboat1', name: 'the U-boat war', from: 1915, until: 1919, nations: ['GB', 'US', 'CA', 'DE', 'FR', 'IT'], branches: ['navy'], text: 'Convoys, depth charges, and ships going down at night.' },
    { id: 'air1', name: 'the air war over the Western Front', from: 1915, until: 1919, nations: ['GB', 'FR', 'DE', 'US', 'CA', 'AU', 'IT'], branches: ['airforce'], text: 'Fabric and wire, no parachutes, and a life expectancy counted in weeks.' },
  ],
  ww2: [
    { id: 'dunkirk', name: 'the Fall of France and Dunkirk', from: 1940, until: 1941, nations: ['GB', 'FR', 'PL'], branches: ['army'], text: 'The retreat to the beaches, and the little ships.' },
    { id: 'britain', name: 'the Battle of Britain', from: 1940, until: 1941, nations: ['GB', 'CA', 'NZ', 'AU', 'PL', 'DE'], branches: ['airforce'], text: 'Scrambles from the grass at dawn, five sorties a day, and empty places at dinner.', star: 'Air Crew Europe Star' },
    { id: 'atlantic', name: 'the Battle of the Atlantic', from: 1939, until: 1946, nations: ['GB', 'CA', 'US', 'NZ', 'AU', 'DE', 'NO'], branches: ['navy', 'coastguard'], text: 'Convoy escort in the North Atlantic: storms, ice, and the U-boat packs.', star: 'Atlantic Star' },
    { id: 'alamein', name: 'North Africa and El Alamein', from: 1940, until: 1944, nations: ['GB', 'AU', 'NZ', 'IN', 'ZA', 'FR', 'IT', 'DE', 'US'], branches: ['army'], text: 'Sand in everything, the Afrika Korps, and the barrage at El Alamein.', star: 'Africa Star' },
    { id: 'bomber', name: 'the bomber offensive over Germany', from: 1940, until: 1946, nations: ['GB', 'CA', 'AU', 'NZ', 'US'], branches: ['airforce'], text: 'Night after night over the Ruhr. Thirty operations was a tour, and most crews didn\'t finish one.', star: 'Air Crew Europe Star' },
    { id: 'eastern2', name: 'the Eastern Front', from: 1941, until: 1946, nations: ['RU', 'DE', 'IT', 'RO', 'HU', 'FI', 'UA', 'BY'], branches: ['army', 'airforce'], text: 'The largest war ever fought: Moscow, Stalingrad, Kursk, and the long road west or back.' },
    { id: 'italy', name: 'Sicily and Italy', from: 1943, until: 1946, nations: ['GB', 'US', 'CA', 'NZ', 'IN', 'ZA', 'FR', 'PL', 'DE'], branches: ['army'], text: 'Up the mountainous spine of Italy, river by river; Monte Cassino.', star: 'Italy Star' },
    { id: 'normandy', name: 'D-Day and Normandy', from: 1944, until: 1945, nations: ['GB', 'US', 'CA', 'FR', 'PL', 'DE', 'AU', 'NZ'], branches: ['army', 'navy', 'marines', 'airforce'], text: 'The landings on the sixth of June, and the bocage after.', star: 'France and Germany Star' },
    { id: 'germany', name: 'the advance into Germany', from: 1944, until: 1946, nations: ['GB', 'US', 'CA', 'FR', 'PL'], branches: ['army'], text: 'Arnhem, the Bulge, the Rhine, and the camps you found on the way.', star: 'France and Germany Star' },
    { id: 'burma', name: 'Burma: Kohima and Imphal', from: 1942, until: 1946, nations: ['GB', 'IN', 'AU', 'US', 'JP'], branches: ['army', 'airforce'], text: 'Jungle, monsoon, and the tennis court at Kohima.', star: 'Burma Star' },
    { id: 'kokoda', name: 'the Kokoda Track', from: 1942, until: 1943, nations: ['AU', 'JP'], branches: ['army'], text: 'Mud, malaria and the ridges of New Guinea.', star: 'Pacific Star' },
    { id: 'pearl', name: 'Pearl Harbor and the Pacific fleet', from: 1941, until: 1943, nations: ['US'], branches: ['navy'], text: 'The Sunday morning attack, and the carriers that were out at sea.' },
    { id: 'midway', name: 'Midway and the carrier war', from: 1942, until: 1946, nations: ['US', 'JP'], branches: ['navy', 'airforce', 'marines'], text: 'Carriers hunting carriers across the Pacific.', star: 'Pacific Star' },
    { id: 'guadalcanal', name: 'Guadalcanal', from: 1942, until: 1944, nations: ['US', 'AU', 'NZ', 'JP'], branches: ['marines', 'army', 'navy'], text: 'Henderson Field, the night sea battles, and the jungle.', star: 'Pacific Star' },
    { id: 'tarawa', name: 'Tarawa', from: 1943, until: 1944, nations: ['US', 'JP'], branches: ['marines'], text: 'Seventy-six hours on a coral atoll, and the reef that stopped the landing craft.' },
    { id: 'okinawa', name: 'Iwo Jima and Okinawa', from: 1945, until: 1946, nations: ['US', 'JP', 'GB'], branches: ['marines', 'army', 'navy'], text: 'The last great island battles; kamikazes off the beaches.', star: 'Pacific Star' },
    { id: 'china', name: 'the war in China', from: 1937, until: 1946, nations: ['JP', 'CN'], branches: ['army'], text: 'Eight years across China\'s cities and countryside.' },
  ],
  koreanWar: [
    { id: 'pusan', name: 'the Pusan Perimeter', from: 1950, until: 1951, nations: ['KR', 'US'], branches: ['army', 'marines'], text: 'The last corner of the peninsula, held.' },
    { id: 'chosin', name: 'the Chosin Reservoir', from: 1950, until: 1951, nations: ['US', 'GB'], branches: ['marines', 'army'], text: 'Thirty below, surrounded, and the fighting withdrawal to the sea.' },
    { id: 'imjin', name: 'the Imjin River', from: 1951, until: 1952, nations: ['GB', 'BE'], branches: ['army'], text: 'Three days holding the river line against a whole army.' },
    { id: 'kapyong', name: 'Kapyong', from: 1951, until: 1952, nations: ['AU', 'CA', 'NZ'], branches: ['army'], text: 'The valley held, and a US Presidential Unit Citation.' },
    { id: 'line', name: 'the stalemate on the 38th parallel', from: 1951, until: 1954, nations: ALL, branches: ['army', 'marines'], text: 'Trenches and hills with numbers for names.' },
    { id: 'migalley', name: 'MiG Alley', from: 1950, until: 1954, nations: ['US', 'AU', 'GB'], branches: ['airforce', 'navy'], text: 'Jets over the Yalu: the first jet-against-jet war.' },
  ],
  vietnamWar: [
    { id: 'iadrang', name: 'the Ia Drang', from: 1965, until: 1966, nations: ['US'], branches: ['army'], text: 'Helicopters into the valley, and a fight at the landing zones.' },
    { id: 'longtan', name: 'Long Tan', from: 1966, until: 1967, nations: ['AU', 'NZ'], branches: ['army'], text: 'A company in a rubber plantation in the monsoon rain.' },
    { id: 'khesanh', name: 'Khe Sanh and the Tet Offensive', from: 1968, until: 1969, nations: ['US', 'AU', 'KR'], branches: ['marines', 'army'], text: 'The siege in the hills, and the cities ablaze at Tet.' },
    { id: 'delta', name: 'the riverine war in the Mekong Delta', from: 1966, until: 1972, nations: ['US'], branches: ['navy', 'coastguard'], text: 'Patrol boats in the brown water, ambushes from the banks.' },
    { id: 'rolling', name: 'the air war over the North', from: 1965, until: 1973, nations: ['US'], branches: ['airforce', 'navy', 'marines'], text: 'Rolling Thunder: the flak, the missiles, and the Hanoi Hilton for those who went down.' },
    { id: 'vnground', name: 'the war in the south', from: 1962, until: 1976, nations: ALL, branches: ['army', 'marines'], text: 'Patrols, ambushes, and a war without a front line.' },
  ],
  // Later wars, matched on the war's name.
  '/Falklands/': [
    { id: 'sancarlos', name: 'San Carlos and the advance on Stanley', from: 1982, until: 1983, nations: ['GB'], branches: ['army', 'marines', 'navy'], text: 'Bomb Alley, the yomp across East Falkland, and Goose Green.' },
    { id: 'malvinas', name: 'the defence of the Malvinas', from: 1982, until: 1983, nations: ['AR'], branches: ['army', 'airforce', 'navy'], text: 'Conscripts on the cold hills; the pilots who flew low over the ships.' },
  ],
  '/Gulf War|Kuwait/': [
    { id: 'desertstorm', name: 'Desert Storm', from: 1990, until: 1992, nations: ['US', 'GB', 'FR', 'SA', 'CA', 'AU', 'IT', 'KW', 'EG'], branches: ['army', 'marines', 'airforce', 'navy'], text: 'Five weeks of air war and a hundred hours on the ground.' },
  ],
  '/Iraq/': [
    { id: 'iraq', name: 'the invasion and occupation of Iraq', from: 2003, until: 2012, nations: ['US', 'GB', 'AU', 'PL'], branches: ['army', 'marines', 'airforce', 'navy'], text: 'Baghdad in three weeks, then years of roadside bombs. Fallujah, Basra, Ramadi.' },
  ],
  '/Afghan/': [
    { id: 'helmand', name: 'Helmand and Kandahar', from: 2001, until: 2022, nations: ['US', 'GB', 'CA', 'AU', 'DE', 'NL', 'DK', 'NZ', 'FR', 'IT'], branches: ['army', 'marines', 'airforce'], text: 'Patrol bases, IEDs and the green zone.' },
  ],
};

/** British-family campaign stars and their ribbons. */
const STARS = {
  'Atlantic Star': R('#1f3f8f', '#ffffff', '#2e7d32'),
  'Africa Star': R('#f5d68f', ['#d0021b', 1], '#1f3f8f', '#4a90e2', '#f5d68f'),
  'Burma Star': R('#1f3f8f', '#d0021b', ['#f5a623', 2], '#d0021b', '#1f3f8f'),
  'Italy Star': R('#d0021b', '#ffffff', '#2e7d32', '#ffffff', '#d0021b'),
  'France and Germany Star': R('#1f3f8f', '#ffffff', '#d0021b', '#ffffff', '#1f3f8f'),
  'Pacific Star': R('#2e7d32', '#f5a623', '#1f3f8f', '#f5a623', '#2e7d32'),
  'Air Crew Europe Star': R('#4a90e2', '#000000', '#f5a623', '#000000', '#4a90e2'),
};

const branchKey = (b) => (b === 'coastguard' ? 'coastguard' : b === 'spaceforce' ? 'airforce' : b);

/** The campaigns open to you in this war, this year. */
export function campaignsFor(state, svc, war) {
  if (!war) return [];
  const y = yearNow(state);
  const nation = svc.nation ?? 'US';
  const b = branchKey(svc.branch);
  const list = CAMPAIGNS[war.id] ?? Object.entries(CAMPAIGNS).find(([k]) => k.startsWith('/') && new RegExp(k.slice(1, -1)).test(war.name ?? ''))?.[1] ?? [];
  const fits = (c) => y >= c.from && y < c.until && (c.nations === ALL || c.nations.includes(nation));
  const own = list.filter((c) => fits(c) && (c.branches.includes(b) || (b === 'marines' && c.branches.includes('army')) || (b === 'coastguard' && c.branches.includes('navy'))));
  return own.length ? own : list.filter((c) => fits(c) && c.branches.includes('army') && b === 'army');
}

/** Record a campaign (called from a deployment): the battle honour, and a star where one was awarded. */
export function joinCampaign(ctx, svc, war, campaign) {
  const { state } = ctx;
  svc.campaigns ??= [];
  const first = !svc.campaigns.some((c) => c.id === campaign.id);
  svc.campaigns.push({ id: campaign.id, name: campaign.name, year: yearNow(state), war: war.id });
  if (first) ctx.log(campaign.text, '🎖️', 'info');
  const nation = svc.nation ?? 'US';
  if (campaign.star && (CW.includes(nation) || svc.colonial?.ruler === 'GB') && !state.honors.some((h) => h.name === campaign.star)) {
    addHonor(state, { id: `campaign.${campaign.id}`, source: 'military', name: campaign.star, icon: '⭐', prestige: 3, precedence: 60, citation: `For service in ${campaign.name}.`, ribbon: STARS[campaign.star] });
    ctx.log(`You were awarded the ${campaign.star}.`, '⭐', 'honor');
  }
}

/** Battle stars on an American campaign medal: one per campaign served in. */
export const battleStars = (svc) => new Set((svc?.campaigns ?? []).map((c) => c.id)).size;
