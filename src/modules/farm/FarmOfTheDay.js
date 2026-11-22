/**
 * Farming of its day. Farm.js runs the fields, herd and markets; this layer puts the farm in its
 * century.
 *
 *   Tenure      who holds the land: most farmers before 1900 rented from a landlord (cash rent,
 *               or half the crop as a sharecropper in the American South after 1865); in Ireland,
 *               Japan, India and Mexico land reform turned tenants into owners; in the Soviet Union
 *               (1929-33), Eastern Europe (1949-60), China (1955-58) and Vietnam the farms went
 *               into collectives, and came back out (China 1979, the rest after 1990).
 *   Prices      the great agricultural depression (cheap American grain, 1873-96), the slump after
 *               the First World War, the Depression (1930-33); and the war booms, when every acre
 *               was ploughed.
 *   Disasters   the potato blight in Ireland (1845-49), the Finnish and Swedish famines of the
 *               1860s, India 1876-78 and Bengal 1943, the Soviet famine (1932-33), China's
 *               (1959-61); the Dust Bowl on the Great Plains (1931-39).
 *   Horses to tractors  a team of horses and a threshing gang until the tractor came (the US
 *               from about 1920, Europe after 1945, Asia later); the farm's children did the work
 *               of hands before schooling was compulsory.
 *
 * state.farmDay = { tenure, collective, seen: { [eventId]: year }, tractor, lastShock }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { REGIONS } from '../life/Regions.js';
import { ageOf } from '../people/People.js';
import { priceLevel } from '../world/Countries.js';
import { leaseRent } from './Farm.js';

const cc = (state) => state.character.countryId ?? 'US';
const stateOf = (state) => REGIONS[state.character.regionId]?.state ?? null;
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 61027 + state.character.age * 337 + salt) >>> 0);
const farming = (state) => Boolean(state.farm?.acres || state.farm?.leased);

const SOUTH = ['AL', 'MS', 'GA', 'LA', 'SC', 'NC', 'AR', 'TN'];
const PLAINS = ['KS', 'OK', 'TX', 'CO', 'NM', 'NE'];

/** Price shocks: [from, until, factor, countries (null: everywhere), text]. */
export const SHOCKS = [
  [1873, 1896, 0.78, ['GB', 'IE', 'FR', 'DE', 'NL', 'BE', 'DK', 'SE', 'IT'], 'Cheap grain from the American prairies and Russia has broken prices: the great agricultural depression.'],
  [1915, 1920, 1.3, null, 'The war wants every bushel: prices are high and every field is ploughed.'],
  [1920, 1923, 0.75, ['US', 'CA', 'AU', 'AR', 'GB'], 'The wartime boom has collapsed: prices fell by half in a year, and the bank wants its loan back.'],
  [1930, 1934, 0.6, null, 'The Depression: crops are worth less than the cost of harvesting them.'],
  [1940, 1948, 1.3, null, 'The war again, and food is rationed: whatever you grow sells.'],
];
export const shockAt = (state, y = yearNow(state)) => SHOCKS.find(([a, b, , where]) => y >= a && y < b && (!where || where.includes(cc(state)))) ?? null;

/** Famines: [id, from, until, countries, yield factor, text]. */
export const FAMINES = [
  ['blight', 1845, 1850, ['IE'], 0.3, 'The potato blight: the plants blackened in the field overnight, and the stores rotted in the pits.'],
  ['nordic', 1866, 1869, ['FI', 'SE'], 0.4, 'Frost in summer and rain at harvest: the hungry years. People are eating bark bread.'],
  ['india1876', 1876, 1879, ['IN'], 0.35, 'The monsoon failed. Grain went out on the railway to the ports while the villages starved.'],
  ['soviet', 1932, 1934, ['RU', 'UA', 'KZ'], 0.35, 'The grain was requisitioned to the last sack. The famine came in the winter.'],
  ['bengal', 1943, 1944, ['IN', 'BD'], 0.5, 'Famine in Bengal: rice prices quadrupled, and the war took what was left.'],
  ['china1959', 1959, 1962, ['CN'], 0.4, 'The Great Leap Forward: false harvest reports, grain taken for the cities, and then famine.'],
];
export const famineAt = (state, y = yearNow(state)) => FAMINES.find(([, a, b, where]) => y >= a && y < b && where.includes(cc(state))) ?? null;
export const dustBowl = (state, y = yearNow(state)) => cc(state) === 'US' && y >= 1931 && y < 1940 && PLAINS.includes(stateOf(state));

/** Collectivisation: [countries, from, until]. */
const COLLECTIVE = [[['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ'], 1929, 1991], [['LT', 'LV', 'EE', 'MD'], 1947, 1991], [['DD', 'CZ', 'HU', 'RO', 'BG', 'AL'], 1952, 1990], [['CN'], 1956, 1979], [['VN'], 1958, 1988], [['KP'], 1954, 9999], [['CU'], 1963, 9999]];
export const collectiveAt = (state, y = yearNow(state)) => COLLECTIVE.find(([where, a, b]) => where.includes(cc(state)) && y >= a && y < b) ?? null;

/** Land reforms that made tenants owners: [country, year, text]. */
const REFORMS = [['IE', 1903, 'The Land Act: the state lends you the price of your farm, to repay over sixty-eight years. The landlord sells; the land is yours.'], ['JP', 1947, 'The land reform: landlords must sell to their tenants at a price set before the war, now worth almost nothing. The fields you rented are yours.'], ['IN', 1951, 'The zamindari system is abolished: the land you tilled is registered in your name.'], ['KR', 1950, 'Land reform: tenants buy the land they work, paying in rice over five years.'], ['TW', 1953, 'Land to the tiller: landlords are bought out with shares in state companies, and the tenants own the land.'], ['MX', 1934, 'The land reform reaches you: the hacienda is broken up and the village is given an ejido.']];

/** Who holds the land, in a sentence. */
export function tenureOf(state, y = yearNow(state)) {
  if (collectiveAt(state, y)) return { id: 'collective', label: y < 1960 && ['RU', 'UA', 'BY', 'KZ'].includes(cc(state)) ? 'a kolkhoz (collective farm)' : 'the collective farm' };
  const f = state.farm;
  if (!f) return null;
  if (!f.acres && f.leased) {
    if (cc(state) === 'US' && SOUTH.includes(stateOf(state)) && y >= 1866 && y < 1950 && f.leased <= 60) return { id: 'sharecrop', label: 'a sharecropper: half the crop goes to the landowner' };
    return { id: 'tenant', label: y < 1920 ? 'a tenant farmer, paying rent to the landlord at Michaelmas' : 'a tenant farmer' };
  }
  return { id: 'owner', label: y < 1900 ? 'a freeholder, owning your own land' : 'an owner-occupier' };
}

/** How the farm's work gets done this year. */
export const machineryWord = (y, country = 'US') => {
  const t = tractorFrom(country);
  return y < t ? 'a team of horses and implements' : y < t + 30 ? 'a tractor and implements' : 'a line of machinery';
};
export const tractorFrom = (country) => ({ US: 1920, CA: 1925, AU: 1930, NZ: 1930, AR: 1935, GB: 1940, IE: 1950, FR: 1948, DE: 1948, NL: 1948, BE: 1948, DK: 1948, SE: 1945, NO: 1950, IT: 1955, ES: 1960, JP: 1958, RU: 1930, KR: 1970, IN: 1968, CN: 1975, BR: 1960, MX: 1960 }[country] ?? 1965);

export function farmDayTick(ctx) {
  const { state } = ctx;
  const y = yearNow(state);
  const fd = (state.farmDay ??= { seen: {} });
  const f = state.farm;
  const rng = sideRng(state, 0xfa7);
  // Collectivisation reaches the farm.
  const col = collectiveAt(state, y);
  if (col && farming(state) && !fd.collective && !state.prompts.some((p) => p.type === 'farmDay.collective')) {
    const big = (f.acres ?? 0) > 100 || (f.herd?.head ?? 0) > 20;
    return ctx.prompt({
      type: 'farmDay.collective', icon: '🚩', title: 'The Collective',
      text: `The party has come to the village: every farm is to join the collective, its land, its horses and its cattle.${big ? ' A farm your size marks you as a kulak, a class enemy.' : ''}`,
      options: [
        { id: 'join', label: '✍️ Sign over the farm and join' },
        { id: 'slaughter', label: '🐄 Kill the livestock rather than hand it over', hint: 'Meat this winter; the authorities will notice' },
        { id: 'resist', label: '✊ Refuse', hint: big ? 'Deportation, or worse' : 'Arrest' },
      ],
      data: { big },
    });
  }
  // On the collective: labour-days, and a private plot.
  if (fd.collective) {
    if (!col) {
      fd.collective = false;
      return ctx.log(y >= 1979 && cc(state) === 'CN' ? 'The household responsibility system: the collective\'s land is divided among the families again. You work your own fields and sell what is over the quota.' : 'The collective farm has been broken up. You were given a share certificate and a strip of land, and a tractor nobody can repair.', '🌾', 'milestone');
    }
    const pay = Math.round(9000 * priceLevel(state) * rng.float(0.6, 1.2));
    ctx.earn(pay, 'Labour-days on the collective farm', { wage: true });
    const fam = famineAt(state, y);
    if (fam && !fd.seen[fam[0]]) { fd.seen[fam[0]] = y; ctx.stat('health', -15); ctx.log(fam[5], '🥀', 'bad'); }
    return;
  }
  // Famine: the year's crop fails, and hunger follows, farm or no farm.
  const fam = famineAt(state, y);
  if (fam && (farming(state) || /rural|town/i.test(REGIONS[state.character.regionId]?.type ?? ''))) {
    const first = !fd.seen[fam[0]];
    fd.seen[fam[0]] ??= y;
    if (first) ctx.log(fam[5], '🥀', 'bad');
    ctx.stat('health', state.finances.cash > 2000 ? -3 : -10);
    if (farming(state) && f.lastYear?.revenue) ctx.spend(Math.round(f.lastYear.revenue * (1 - fam[4])), 'The failed harvest', { allowDebt: true });
    if (fam[0] === 'blight' && first) ctx.log('A million will die and a million more will leave. The emigrant ships sail from every port in Ireland.', '🚢', 'bad');
  }
  if (!farming(state)) return;
  // The Dust Bowl.
  if (dustBowl(state, y)) {
    if (!fd.seen.dust) { fd.seen.dust = y; ctx.log('A black blizzard: the topsoil of the Plains rose into the sky and came down on Chicago. The fields are drifts of dust.', '🌪️', 'bad'); }
    if (f.lastYear?.revenue) ctx.spend(Math.round(f.lastYear.revenue * 0.45), 'Dust storms', { allowDebt: true });
    ctx.stat('health', -2);
  }
  // Price shocks and war booms.
  const shock = shockAt(state, y);
  if (shock && f.lastYear?.revenue) {
    const delta = Math.round(f.lastYear.revenue * (shock[2] - 1));
    if (delta > 0) ctx.earn(delta, 'Farm prices of the day'); else ctx.spend(-delta, 'Farm prices of the day', { allowDebt: true });
    if (fd.lastShock !== shock[0]) { fd.lastShock = shock[0]; ctx.log(shock[4], shock[2] > 1 ? '📈' : '📉', shock[2] > 1 ? 'good' : 'bad'); }
  }
  // Sharecropping: the landowner's half (less the rent Farm.js already charged).
  const t = tenureOf(state, y);
  if (t) fd.tenure = t.id;
  if (t?.id === 'sharecrop' && f.lastYear?.revenue) ctx.spend(Math.max(0, Math.round(f.lastYear.revenue * 0.5 - f.leased * (leaseRent(state) ?? 0))), 'The landowner\'s half of the crop', { allowDebt: true });
  // Land reform: tenants become owners.
  const reform = REFORMS.find(([c, yr]) => c === cc(state) && y === yr);
  if (reform && f.leased && !fd.seen[`reform${reform[1]}`]) {
    fd.seen[`reform${reform[1]}`] = y;
    f.acres = (f.acres ?? 0) + f.leased;
    f.valuePerAcre ||= 1000;
    f.leased = 0;
    ctx.stat('happiness', 10);
    ctx.log(reform[2], '📜', 'milestone');
  }
  // Children on the farm before schooling was compulsory (and in poor countries long after).
  const kids = (state.people?.list ?? []).filter((p) => p.alive && p.relation === 'child' && ageOf(state, p) >= 8 && ageOf(state, p) < 15);
  if (kids.length && (y < 1920 || ['IN', 'CN', 'BD', 'PK', 'NG', 'ET', 'KE', 'VN'].includes(cc(state)) && y < 1990)) {
    ctx.earn(Math.round(1500 * priceLevel(state) * kids.length * rng.float(0.8, 1.2)), 'The children\'s work on the farm', { informal: true });
    if (!fd.seen.kids) { fd.seen.kids = y; ctx.log(`${kids.map((k) => k.firstName).join(' and ')} ${kids.length > 1 ? 'are' : 'is'} out in the fields with you now: stone-picking, minding the cows, bringing in the harvest. School can wait until winter.`, '👧', 'info'); }
  }
  // The tractor comes.
  const tf = tractorFrom(cc(state));
  if (!f.machinery && !fd.tractor && y >= tf && y < tf + 25 && rng.chance(0.25) && !state.prompts.some((p) => p.type === 'farmDay.tractor')) {
    ctx.prompt({
      type: 'farmDay.tractor', icon: '🚜', title: 'A Tractor?',
      text: 'The neighbours are selling their horses and buying tractors. One machine does the work of a team and two men, and never needs feeding when it stands idle.',
      options: [{ id: 'buy', label: '🚜 Buy a tractor and sell the horses' }, { id: 'keep', label: '🐴 Keep the horses' }],
      data: {},
    });
  }
}

export const FarmOfTheDayModule = {
  id: 'farmDay',
  order: 47.5,
  setup(engine) {
    engine.bus.on('farmDay:tractor', ({ ctx }) => {
      const a = engine.actions.get('farm.build');
      const before = ctx.state.farm?.machinery;
      if (a) a(ctx, 'machinery');
      if (!before && !ctx.state.farm?.machinery) ctx.log('You couldn\'t raise the price of a tractor this year.', '🚜', 'warn');
    });
  },
  onAgeUp(ctx) {
    if (ctx.state.character.age >= 16) farmDayTick(ctx);
  },
  resolvers: {
    collective(ctx, data, optionId) {
      const { state, rng } = ctx;
      const f = state.farm;
      const fd = (state.farmDay ??= { seen: {} });
      const herd = f?.herd?.head ?? 0;
      const take = () => { if (f) { f.acres = 0; f.leased = 0; f.loan = null; f.machinery = null; if (f.herd) f.herd.head = 0; } fd.collective = true; };
      if (optionId === 'join') { take(); ctx.stat('happiness', -8); return ctx.log('You signed. Your horses went to the collective stable, and you went out to work its fields for labour-days.', '✍️', 'warn'); }
      if (optionId === 'slaughter') {
        take();
        ctx.earn(Math.round(herd * 1500 * priceLevel(state)), 'Meat from the slaughtered herd', { informal: true });
        ctx.stat('happiness', -5);
        return ctx.log('You killed the cattle and salted the meat. Half the village did the same; the collective started with empty byres.', '🐄', 'warn');
      }
      take();
      ctx.stat('stress', 20);
      if (data.big || rng.chance(0.4)) {
        ctx.stat('health', -25);
        ctx.stat('happiness', -20);
        return ctx.log('They came for you at night: dekulakised. Your family was put on a cattle train to a special settlement in the north, with what you could carry.', '🚂', 'bad');
      }
      ctx.log('You were arrested, held for a month and released. The farm went into the collective anyway.', '🚔', 'bad');
    },
    tractor(ctx, _data, optionId) {
      const { state } = ctx;
      const fd = (state.farmDay ??= { seen: {} });
      fd.tractor = yearNow(state);
      if (optionId === 'keep') return ctx.log('You kept the horses. They know the way home.', '🐴', 'info');
      ctx.emit('farmDay:tractor', {});
    },
  },
};
