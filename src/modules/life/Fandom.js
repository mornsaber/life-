/**
 * Following a club for life: your town's team, picked up as a child (or chosen), and the seasons
 * that come with it: promotion, relegation, a cup run, the final, the long years in between.
 *
 *   The sport   by country and date: football in Britain and Europe (the Football League from
 *               1888) and South America; baseball in America (from 1876) and Japan (from 1936);
 *               Australian rules (from 1897); rugby in New Zealand, South Africa and Wales; cricket
 *               in India, Pakistan and the West Indies.
 *   A season    each year a finish (title, top half, bottom half), and in a league with divisions,
 *               promotion and relegation; a cup run, sometimes all the way. Joy and despair in
 *               proportion to how long you have followed them. No league in the war years.
 *   Going       a season ticket (or a seat now and then) keeps you close; the children follow
 *               the club you follow.
 *
 * state.fandom = { club, sport, since, division, seasons: [{ year, text, icon }], ticket, titles, cups }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { priceLevel } from '../world/Countries.js';
import { REGIONS } from './Regions.js';

const cc = (state) => state.character.countryId ?? 'US';
/** [countries, sport, from, divisions?, names] */
const SPORTS = [
  [['GB', 'IE'], 'football', 1888, 4, ['United', 'City', 'Town', 'Rovers', 'Athletic', 'Wanderers', 'Albion', 'County']],
  [['DE', 'AT', 'CH'], 'football', 1903, 3, ['FC', 'SV', 'Borussia', 'Eintracht', 'Fortuna']],
  [['FR', 'BE'], 'football', 1932, 2, ['Olympique', 'Racing Club', 'Stade', 'AS']],
  [['IT'], 'football', 1898, 3, ['AC', 'Sporting', 'Calcio']],
  [['ES', 'PT'], 'football', 1929, 2, ['Real', 'Atlético', 'Deportivo', 'Sporting']],
  [['NL', 'DK', 'SE', 'NO', 'PL', 'CZ', 'HU', 'RU', 'TR', 'GR'], 'football', 1910, 2, ['FC', 'Sporting', 'Dynamo', 'Spartak']],
  [['BR', 'AR', 'UY', 'CL', 'MX', 'CO'], 'football', 1902, 2, ['Atlético', 'Racing', 'Club', 'Sport Club']],
  [['NG', 'GH', 'KE', 'EG', 'MA', 'CM', 'SN'], 'football', 1955, 1, ['United', 'Stars', 'Rangers', 'Sporting']],
  [['US'], 'baseball', 1876, 1, ['Nationals', 'Pioneers', 'Grays', 'Stars', 'Blues']],
  [['JP', 'KR', 'TW'], 'baseball', 1936, 1, ['Tigers', 'Giants', 'Swallows', 'Carp']],
  [['AU'], 'Australian rules', 1897, 1, ['Football Club']],
  [['NZ', 'ZA', 'FJ'], 'rugby', 1892, 1, ['RFC']],
  [['IN', 'PK', 'LK', 'BD', 'JM', 'TT'], 'cricket', 1930, 1, ['Cricket Club']],
];
export function sportHere(state, y = yearNow(state)) {
  const s = SPORTS.find(([where]) => where.includes(cc(state)));
  if (!s || y < s[2]) return null;
  return { sport: s[1], divisions: s[3], names: s[4] };
}
const town = (state) => REGIONS[state.character.regionId]?.name?.split(',')[0] ?? 'Town';
const war = (state, y) => (y >= 1915 && y <= 1918 && ['GB', 'FR', 'DE', 'IT', 'AT', 'BE', 'RU'].includes(cc(state))) || (y >= 1940 && y <= 1945 && ['GB', 'FR', 'DE', 'IT', 'NL', 'BE', 'PL', 'RU', 'JP'].includes(cc(state)));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 15731 + state.character.age * 2741 + salt) >>> 0);

function clubName(state, s, rng) {
  const t = town(state);
  const n = rng.pick(s.names);
  return ['FC', 'SV', 'AC', 'AS', 'Real', 'Atlético', 'Olympique', 'Racing Club', 'Stade', 'Borussia', 'Eintracht', 'Fortuna', 'Dynamo', 'Spartak', 'Deportivo', 'Racing', 'Club', 'Sport Club', 'Sporting', 'Calcio'].includes(n) && !['GB', 'IE', 'US', 'NG', 'GH', 'KE'].includes(cc(state)) ? `${n} ${t}` : `${t} ${n}`;
}

export function fandomTick(ctx) {
  const { state } = ctx;
  const y = yearNow(state);
  const s = sportHere(state, y);
  // Picked up as a child: the town's team, or your father's.
  if (!state.fandom && s && state.character.age >= 7 && state.character.age <= 12) {
    const rng = sideRng(state, 0xfa);
    if (!rng.chance(0.6)) return;
    state.fandom = { club: clubName(state, s, rng), sport: s.sport, since: y, division: s.divisions > 1 ? rng.int(1, s.divisions) : 1, seasons: [], titles: 0, cups: 0 };
    return ctx.log(`Someone took you to see ${state.fandom.club} play. That was that: you were theirs for life.`, '🏟️', 'milestone');
  }
  const f = state.fandom;
  if (!f) return;
  if (war(state, y)) { if (!f.warNoted || f.warNoted < y - 3) { f.warNoted = y; ctx.log(`No ${f.sport === 'football' ? 'league' : 'season'} this year: the players are in uniform.`, '🪖', 'info'); } return; }
  const rng = sideRng(state, 0x5ea + y);
  const years = y - f.since;
  const weight = Math.min(3, 1 + years / 15);
  const divisions = sportHere(state, y)?.divisions ?? 1;
  const roll = rng.float(0, 1);
  let text = null; let icon = '🏟️'; let mood = 0;
  if (roll < 0.07 && f.division === 1) { f.titles++; text = `${f.club} won the ${f.sport === 'baseball' ? 'pennant' : f.sport === 'football' ? 'league' : 'premiership'}${f.titles === 1 ? ' for the first time in your lifetime' : ''}. You were there when they lifted it.`; icon = '🏆'; mood = 10; }
  else if (roll < 0.14 && divisions > 1 && f.division > 1) { f.division--; text = `Promotion! ${f.club} go up to the ${['', 'first division', 'second division', 'third division'][f.division] ?? 'next division'}.`; icon = '📈'; mood = 7; }
  else if (roll > 0.9 && divisions > 1 && f.division < divisions) { f.division++; text = `Relegation. ${f.club} went down on the last day of the season, and grown men cried on the terraces.`; icon = '📉'; mood = -6; }
  else if (roll > 0.85 && roll <= 0.9) {
    const won = rng.chance(0.45);
    if (won) f.cups++;
    text = won ? `${f.club} won the cup final. The whole town was out to see the open-top bus.` : `${f.club} reached the cup final and lost it in the last minute. You still can't talk about it.`;
    icon = won ? '🏆' : '💔'; mood = won ? 8 : -4;
  }
  if (text) {
    ctx.stat('happiness', Math.round(mood * weight / 2));
    ctx.log(text, icon, mood > 0 ? 'good' : 'warn');
    f.seasons.push({ year: y, text, icon });
    if (f.seasons.length > 12) f.seasons.shift();
    if (mood > 6) ctx.emit('news:story', { tier: 'local', headline: text.split('.')[0], weight: 3, icon });
  }
  if (f.ticket) {
    if (!ctx.spend(Math.round(300 * priceLevel(state)), 'Season ticket')) { f.ticket = false; ctx.log('You gave up the season ticket. Money was too tight.', '🎟️', 'warn'); }
    else ctx.stat('happiness', 2);
  }
}

export const FandomModule = {
  id: 'fandom',
  order: 13.6,
  onAgeUp: fandomTick,
  actions: {
    follow(ctx) {
      const { state } = ctx;
      const s = sportHere(state);
      if (!s) return ctx.toast('No league here in this day', 'warn');
      if (state.fandom) return ctx.toast(`You already follow ${state.fandom.club}`, 'info');
      const rng = sideRng(state, 0xf0);
      state.fandom = { club: clubName(state, s, rng), sport: s.sport, since: yearNow(state), division: s.divisions > 1 ? rng.int(1, s.divisions) : 1, seasons: [], titles: 0, cups: 0 };
      ctx.log(`You started following ${state.fandom.club}.`, '🏟️', 'good');
    },
    ticket(ctx) {
      const f = ctx.state.fandom;
      if (!f) return;
      f.ticket = !f.ticket;
      ctx.log(f.ticket ? `A season ticket for ${f.club}: the same seat, the same faces, every home game.` : 'You gave up the season ticket.', '🎟️', 'info');
    },
  },
};
export const fandomOf = (state) => state.fandom ?? null;
