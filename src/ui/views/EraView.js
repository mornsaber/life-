/**
 * The World in 19xx: for lives started in the past — how your country is governed, who
 * rules it, the history this world has had so far (and what went differently), and what
 * hasn't been invented yet.
 */
import { esc, card, kv } from '../Components.js';
import { regimeHere } from '../../modules/world/Regimes.js';
import { warHere } from '../../modules/world/War.js';
import { PRESENT, yearNow, colonyHere, rulerName, TECH, hasTech, eraFlag } from '../../modules/world/Eras.js';
import { EVENTS, jimCrowHere } from '../../modules/world/History.js';
import { COUNTRIES } from '../../modules/world/Countries.js';

export const EVENT_LABELS = {
  napoleonicWars: 'the Napoleonic Wars', napoleonFalls: 'Napoleon falls', latinIndependence: 'the Americas rise against Spain', war1812: 'the War of 1812', cholera: 'the cholera',
  abolitionUK: 'slavery abolished in the British Empire', opiumWar: 'the Opium War', irishFamine: 'the Irish Famine', mexicanAmericanWar: 'the Mexican–American War',
  revolutions1848: 'the revolutions of 1848', secondEmpire: 'the Second Empire', taiping: 'the Taiping Rebellion', crimeanWar: 'the Crimean War', indianRebellion: 'the Rebellion of 1857',
  italianUnification: 'Italy unified', serfdomEnds: 'the serfs freed', usCivilWar: 'the American Civil War', meiji: 'the Meiji Restoration', francoPrussianWar: 'the Franco-Prussian War',
  germanUnification: 'Germany unified', longDepression: 'the Long Depression', scrambleForAfrica: 'the scramble for Africa', brazilRepublic: 'Brazil a republic',
  spanishAmericanWar: 'the Spanish–American War', boerWar: 'the Boer War', russoJapaneseWar: 'the Russo-Japanese War', ottomanEnd: 'the end of the Ottoman Empire',
  xinhai: 'China\'s last emperor falls', ww1: 'the Great War', spanishFlu: 'the influenza pandemic', russianRevolution: 'the Russian Revolution',
  fascismIT: 'Mussolini takes power', depression: 'the Great Depression', fascismDE: 'the Nazis take power in Germany', militarismJP: 'Japan\'s generals take over',
  spanishCivilWar: 'the Spanish Civil War', ww2: 'the Second World War', prc: 'the People\'s Republic of China', coldWar: 'the Cold War begins',
  apartheid: 'apartheid in South Africa', koreanWar: 'the Korean War', vietnamWar: 'the Vietnam War', oilShock: 'the oil shock',
  carnationRevolution: 'Portugal\'s Carnation Revolution', francoDies: 'Franco dies; Spain turns democratic', reformOpening: 'China opens up',
  iranRevolution: 'the Iranian Revolution', koreaDemocracy: 'democracy in South Korea', taiwanDemocracy: 'martial law ends in Taiwan',
  sovietCollapse: 'the Soviet Union falls', apartheidEnds: 'apartheid ends', dotcom: 'the dot-com crash', afghanistan: 'the war in Afghanistan',
  gfc: 'the financial crash', covid: 'the coronavirus pandemic', aiWave: 'the AI wave', selfDriving: 'robotaxis and driverless trucks', humanoidRobots: 'humanoid robots',
  ubi: 'universal basic income', carbonTax: 'the carbon tax', longevity: 'drugs that slow ageing', agingTherapy: 'therapies that reverse ageing', climateTipping: 'a climate tipping point',
  spaceIndustry: 'the commercial space industry', marsLanding: 'humans on Mars', pandemic2: 'a second pandemic', blocTension: 'the new Cold War', greatPowerWar: 'the Pacific War',
  detente: 'the grand bargain', fusionPower: 'fusion power', brownVBoard: 'Brown v. Board: school segregation struck down', civilRights: 'the Civil Rights Act',
};
const TECH_LABELS = { railway: 'railways', photography: 'photography', telegraph: 'the telegraph', telephone: 'the telephone', electricLight: 'electric light', automobile: 'motor cars', radio: 'radio', tv: 'television', creditCards: 'credit cards', personalComputer: 'personal computers', mobilePhone: 'mobile phones', internet: 'the internet', onlineDating: 'online dating', socialMedia: 'social media', streaming: 'streaming', smartphone: 'smartphones', crypto: 'crypto', gigApps: 'gig apps' };

export function eraCard(state) {
  const era = state.era;
  if (!era) return '';
  const future = Object.entries(era.events ?? {}).filter(([id, e]) => EVENTS[id]?.future && !e.past);
  if (yearNow(state) > PRESENT + 1 || era.start >= PRESENT) return future.length ? futureCard(state, future) : '';
  const y = yearNow(state);
  const cc = state.character.countryId ?? 'US';
  const r = regimeHere(state);
  const col = colonyHere(state);
  const war = warHere(state);
  const rows = [
    ['Your country', `${eraFlag(state, cc, COUNTRIES)} ${esc(r.name ?? (r.kind === 'democracy' ? 'a democracy' : r.kind))}`],
    ...(col ? [['Ruled by', `${esc(rulerName(col.ruler))} — through ${esc(col.leader ?? 'the Governor')}${col.noMovement ? '' : '. A movement for independence is growing'}`]] : []),
    ...(war ? [['At war', esc(war.name)]] : []),
    ...(jimCrowHere(state) ? [['Jim Crow', 'Segregated schools, buses and lunch counters; poll taxes and literacy tests keep Black voters off the rolls; many jobs and the state universities are closed to you']] : []),
  ];
  const seen = Object.entries(era.events ?? {}).filter(([id]) => EVENT_LABELS[id]).sort((a, b) => a[1].year - b[1].year);
  const line = ([id, e]) => `<li>${e.year}${e.ended && e.ended !== e.year ? `–${e.ended}` : e.lasts && !e.ended ? '–' : ''} · ${esc(EVENT_LABELS[id])}${e.axisWon ? ' (the Axis won)' : ''}${e.outcome === 'central' ? ' (the Central Powers won)' : ''}${e.past ? '' : ' 🕰️'}</li>`;
  const recent = seen.filter(([, e]) => !e.past).slice(-8);
  const skipped = (era.skipped ?? []).filter((id) => EVENT_LABELS[id] && EVENTS[id].window[1] < y);
  const coming = Object.entries(TECH).filter(([id]) => !hasTech(state, id)).sort((a, b) => a[1] - b[1]).slice(0, 4);
  return card(`The World in ${y}`, `${kv(rows)}
    ${recent.length ? `<p class="fine">In your lifetime:</p><ul class="job-board">${recent.map(line).join('')}</ul>` : `<p class="fine">History is on its way: ${esc(Object.entries(EVENTS).filter(([id, ev]) => !era.events[id] && ev.window[0] > y - 1).slice(0, 3).map(([id]) => EVENT_LABELS[id]).join(', ') || 'the present')}.</p>`}
    ${skipped.length ? `<p class="fine">🔀 This world went differently: ${esc(skipped.map((id) => EVENT_LABELS[id]).join(', '))} never happened.</p>` : ''}
    ${coming.length ? `<p class="fine">Not invented yet: ${esc(coming.map(([id, yr]) => `${TECH_LABELS[id]} (about ${yr})`).join(', '))}. Money is in today's dollars.</p>` : ''}`, { icon: '🕰️' });
}

/** After today: what this world's future has brought so far. */
function futureCard(state, happened) {
  const y = yearNow(state);
  const rows = happened.sort((a, b) => a[1].year - b[1].year).slice(-10).map(([id, e]) => `<li>${e.year}${e.ended && e.ended !== e.year ? `–${e.ended}` : ''} · ${esc(EVENT_LABELS[id] ?? id)}</li>`).join('');
  const skipped = (state.era.skipped ?? []).filter((id) => EVENTS[id]?.future && EVENTS[id].window[1] < y).map((id) => EVENT_LABELS[id] ?? id);
  return card(`The World in ${y}`, `<p class="fine">What the future has brought so far:</p><ul class="job-board">${rows}</ul>${skipped.length ? `<p class="fine">🔀 It never came to pass: ${esc(skipped.join(', '))}.</p>` : ''}`, { icon: '🔭' });
}

