/**
 * Nobility as it was lived, country by country (the titles and their law: Peerage.js, NobilityLaw.js).
 *
 *   Prussia & Austria  the sons of the house were officers: a Guards or cavalry regiment, the family
 *                      tradition (to 1918). In 1945 the land reform in the Soviet zone took every
 *                      estate over 100 hectares east of the Elbe: the family went west with nothing.
 *   Russia             after 1917, the émigrés: Paris, Berlin, Belgrade; Nansen passports (1922),
 *                      the cathedral on the rue Daru, princes driving taxis and princesses sewing.
 *   Japan              the kazoku's children at the Gakushūin (the Peers' School); dukes and marquesses
 *                      sat in the House of Peers by right, counts, viscounts and barons by election.
 *   Spain              a grandee may keep his hat on before the King; the court, the military orders,
 *                      the Real Maestranza.
 *   Brazil             the Emperor's titles could be had for a generous gift to his causes (1822–89).
 *   Rome               after 1870, the "black nobility" kept their doors shut to the Kingdom, loyal
 *                      to the Pope.
 *   Hungary & Poland   land reform in 1945; in Hungary in 1951, "class aliens" deported from Budapest
 *                      to the countryside.
 */
import { Random } from '../../core/Random.js';
import { yearNow } from './Eras.js';
import { estateOf, titleCountry } from './Nobility.js';
import { grantPeerage, peerTitle, nobilityLaw } from './Peerage.js';
import { eraScale } from '../economy/EraEconomy.js';
import { enlist } from '../military/MilitaryEngine.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 3307) ^ (state.character.age * 571 + 0x5ab)) >>> 0);
const once = (state, id) => { const w = (state.nobleWays ??= {}); if (w[id]) return false; w[id] = true; return true; };

function nobleYear(ctx, rng) {
  const { state } = ctx;
  const n = state.noble;
  const c = state.character;
  const y = yearNow(state);
  const cc = n?.cc ?? c.peerage?.cc;
  const here = c.countryId ?? 'US';
  const male = c.gender === 'male';
  if (!n && !c.peerage) return;

  // Prussia and Austria: the regiment.
  if (['DE', 'AT', 'HU'].includes(cc) && y < 1918 && male && c.age === 18 && !state.military.service && once(state, 'regiment')) {
    ctx.prompt({
      type: 'nobleWays.regiment', icon: '🎖️', title: 'The Regiment',
      text: `Every ${n?.heir ? 'heir' : 'son'} of the family has served in ${cc === 'DE' ? 'the Garde-Kürassiere' : 'a cavalry regiment of the Emperor\'s army'}. Your father has written to the colonel.`,
      options: [{ id: 'serve', label: '🐎 Take the commission', hint: 'As your father did' }, { id: 'refuse', label: '📚 Refuse: university instead', hint: 'He will not forgive it easily' }],
    });
  }
  // 1945: the estates east of the Elbe.
  if (cc === 'DE' && y >= 1945 && y <= 1946 && n && estateOf(state)?.owner !== null && once(state, 'bodenreform')) {
    const east = rng.chance(0.55);
    if (east) {
      const e = estateOf(state);
      e.value = 0; e.owner = null;
      ctx.log('The Soviet land reform took every estate over a hundred hectares. The family left the house at night with a handcart and walked west; the house became a school, then a ruin.', '🏚️', 'bad');
      ctx.stat('happiness', -15);
    }
  }
  // Russian émigrés.
  if (cc === 'RU' && y >= 1918 && here !== 'RU') {
    if (y >= 1922 && once(state, 'nansen')) ctx.log('You were issued a Nansen passport: stateless, with the League of Nations\' stamp instead of a country.', '🛂', 'info');
    if (rng.chance(0.12)) ctx.log(rng.pick([
      'At the cathedral on the rue Daru, the old families still stand where they stood in Petersburg.',
      'A prince you knew in the Corps des Pages drives a taxi now; he still bows when he opens the door.',
      'Your mother sold the last of the pearls this winter, one by one, to a jeweller in the rue de la Paix.',
      'An émigré newspaper says the Bolsheviks will fall within the year. It said so last year, too.',
    ]), '🕯️', 'info');
  }
  // The kazoku.
  if (cc === 'JP' && y < 1947) {
    if (c.age === 6 && once(state, 'gakushuin')) ctx.log('You started at the Gakushūin, the Peers\' School, in a uniform cut like a naval cadet\'s, among the children of princes.', '🏫', 'info');
    if (c.peerage && y >= 1890 && c.age >= 25 && once(state, 'peers')) {
      const byRight = ['duke', 'marquess'].includes(c.peerage.rank);
      c.peerage.seat = byRight || rng.chance(0.4);
      ctx.log(byRight ? 'At twenty-five you took your seat in the House of Peers, by right of rank.' : c.peerage.seat ? 'Your fellow peers of your rank elected you to the House of Peers.' : 'Your fellow peers of your rank chose others for the House of Peers this time.', '🏛️', 'info');
    }
  }
  // Spain: the grandees at court.
  if (cc === 'ES' && c.peerage?.rank === 'duke' && nobilityLaw('ES', y).status === 'recognised' && once(state, 'cubrirse')) {
    ctx.log('Presented at court as a Grandee of Spain, you put your hat back on before the King: the oldest privilege of your rank.', '🎩', 'milestone');
  }
  // The black nobility of Rome.
  if (cc === 'IT' && y >= 1870 && y < 1929 && /Roma|Rome/i.test(String(c.regionId ?? '')) && once(state, 'black')) {
    ctx.log('Since 1870 the family\'s palazzo has kept its great doors half shut, in mourning for the Pope\'s lost kingdom: you do not go to the King\'s court.', '⚫', 'info');
  }
  // Hungary, 1951.
  if (cc === 'HU' && y === 1951 && here === 'HU' && once(state, 'kitelepites')) {
    ctx.log('At dawn the ÁVH came with a list: "class aliens" deported from Budapest to a village on the plain, a room in a peasant\'s house, field work. Your title was the crime.', '🚚', 'bad');
    ctx.stat('happiness', -12);
    ctx.stat('stress', 15);
  }
}

export const NobleWaysModule = {
  id: 'nobleWays',
  order: 33.8,
  onAgeUp(ctx) { nobleYear(ctx, sideRng(ctx.state)); },
  actions: {
    /** Imperial Brazil: a generous gift to the Emperor's causes, and a barony (for life). */
    buyBarony(ctx) {
      const { state } = ctx;
      const c = state.character;
      const y = yearNow(state);
      if ((c.countryId ?? 'US') !== 'BR' || y < 1822 || y >= 1889) return ctx.toast('Only in Imperial Brazil (1822–89)', 'warn');
      if (c.peerage) return ctx.toast('You already hold a title', 'warn');
      const cost = Math.round(300000 * eraScale(state, 'wage'));
      if (!ctx.spend(cost, 'A gift to the Emperor\'s charities and the Santa Casa', { credit: false })) return ctx.toast(`It takes about $${cost.toLocaleString()}`, 'warn');
      grantPeerage(ctx, { rank: 'baron', place: c.lastName, kind: 'life', seat: false });
      c.peerage.cc = 'BR';
      ctx.log(`After a handsome gift to the Emperor's causes, you were created ${peerTitle('baron', c.lastName, c.gender, c.lastName, 'BR')}: a coffee baron, for life.`, '☕', 'honor');
    },
  },
  resolvers: {
    regiment(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId === 'serve') {
        enlist(ctx, { branch: 'army', track: 'officer', component: 'active', specialty: 'cavalry' });
        return ctx.log('You took the commission. The uniform fitted as if it had been waiting for you.', '🎖️', 'milestone');
      }
      if (state.noble) state.noble.standing = Math.max(0, (state.noble.standing ?? 55) - 8);
      return ctx.log('You refused the regiment. Your father did not speak to you for a year.', '📚', 'warn');
    },
  },
};
