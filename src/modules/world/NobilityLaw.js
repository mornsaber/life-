/**
 * Titles and the law of their day (Peerage.NOBILITY_LAW): what happens to a titled family when
 * the country changes, and who the monarchs of the day ennobled.
 *
 *   Revolutions   Russia 1917: titles abolished, the estate seized; flee abroad or stay and hide.
 *                 Japan and Hungary 1947: titles gone, the land reformed away.
 *   Republics     Germany 1919: the title becomes part of the surname ("Graf" in your passport);
 *                 Austria 1919: using any title, even "von", is an offence; Portugal 1910,
 *                 Italy 1948, France 1870: courtesy titles only. Spain abolished them in 1931 and
 *                 Franco restored them in 1948.
 *   Seats         the houses of nobles of their day: Prussia's Herrenhaus, Japan's House of Peers,
 *                 Hungary's House of Magnates, Portugal's Chamber of Peers.
 *   Ennoblement   the Kaiser's "von", the Tsar's barons, the Meiji peerage for statesmen and
 *                 generals, the Emperor of Brazil's coffee barons (for life), the King of the
 *                 Belgians' barons today: for the eminent (and in Brazil, the rich).
 *
 * state.noble.law = the status last seen; state.character.peerage.law likewise for a created title.
 */
import { Random } from '../../core/Random.js';
import { yearNow } from './Eras.js';
import { NOBILITY, nobilityLaw, nobleHouse, grantPeerage, peerTitle, rankLabel } from './Peerage.js';
import { eminence } from './Honours.js';
import { netWorth } from '../../core/State.js';
import { eraScale } from '../economy/EraEconomy.js';
import { arrive } from './Migration.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 4271) ^ (state.character.age * 199 + 0x7a3)) >>> 0);
/** The country whose titles these are. */
const titleCc = (state) => state.character.peerage?.cc ?? state.noble?.cc ?? null;

/** A titled family meets a change in the law. */
function lawChanges(ctx) {
  const { state } = ctx;
  const cc = titleCc(state);
  if (!cc || cc === 'GB' || (state.character.peerage?.kind === 'royal')) return;
  const law = nobilityLaw(cc, yearNow(state));
  const holder = state.noble ?? state.character.peerage;
  const was = holder.law ?? 'recognised';
  if (was === law.status) return;
  holder.law = law.status;
  if (state.noble && state.character.peerage) state.character.peerage.law = law.status;
  const c = state.character;
  if (law.note) ctx.log(law.note, law.status === 'recognised' ? '👑' : '📜', law.status === 'recognised' ? 'good' : 'warn');
  if (law.status === 'recognised') {
    // Restored (Spain 1948): the style comes back.
    if (c.peerage) c.style = { ...(c.style ?? {}), prefix: rankLabel(c.peerage.rank, c.gender, cc) };
    return;
  }
  // No more seats in a house of nobles.
  if (c.peerage) c.peerage.seat = false;
  if (law.status === 'banned' || law.status === 'abolished') {
    c.style = { ...(c.style ?? {}), prefix: null };
    for (const p of state.people?.list ?? []) if (p.title && NOBILITY[cc] && Object.values(NOBILITY[cc].ranks).flat().some((r) => p.title.startsWith(r))) p.formerTitle = p.title, delete p.title;
  }
  const estate = state.noble?.estate;
  if (law.status === 'abolished' && estate && estate.owner !== null) {
    const kept = cc === 'RU' ? 0 : 0.3;
    const lost = Math.round(estate.value * (1 - kept));
    estate.value = Math.round(estate.value * kept);
    if (!kept) estate.owner = null;
    ctx.log(kept ? `Land reform took most of the estate: about ${Math.round((1 - kept) * 100)}% of it is gone.` : `The estate was seized: the house, the land, everything (worth about $${lost.toLocaleString()}).`, '🏚️', 'bad');
    ctx.stat('happiness', -15);
    if (cc === 'RU' && c.age >= 14 && c.countryId === 'RU') {
      ctx.prompt({
        type: 'nobilityLaw.revolution', icon: '🚂', title: 'The Revolution',
        text: 'Former nobles are being arrested. Some families are leaving for Paris, Berlin and Constantinople with what they can carry; others burn their papers and stay.',
        options: [
          { id: 'flee', label: '🧳 Flee abroad', hint: 'Paris: émigré life, with a title and no money' },
          { id: 'stay', label: '🔥 Burn the papers and stay', hint: 'A new name, and a long silence' },
        ],
      });
    }
  }
}

/** A monarch of the day ennobles the eminent (or, in Imperial Brazil, the rich). */
function ennoblement(ctx, rng) {
  const { state } = ctx;
  const c = state.character;
  const cc = c.countryId ?? 'US';
  if (['GB', 'ES'].includes(cc) || !NOBILITY[cc] || c.peerage || state.royal) return;
  if (!(c.citizenships ?? [cc]).includes(cc) || state.prompts.some((p) => p.type === 'nobilityLaw.creation')) return;
  const law = nobilityLaw(cc, yearNow(state));
  if (law.status !== 'recognised' || !law.creating) return;
  const offered = (state.peerageOffers ??= {});
  if (offered[`n_${cc}`]) return;
  const e = eminence(state);
  const rich = cc === 'BR' && netWorth(state) >= 1.5e6 * eraScale(state, 'wage');
  if (!(e >= 260 || rich) || !rng.chance(0.06)) return;
  offered[`n_${cc}`] = true;
  const rank = e >= 400 ? 'earl' : e >= 330 ? 'viscount' : 'baron';
  const title = peerTitle(rank, c.lastName, c.gender, c.lastName, cc);
  const why = rich && e < 260 ? 'your fortune and your gifts to the Emperor\'s causes' : 'your services to the nation';
  ctx.prompt({
    type: 'nobilityLaw.creation', icon: '⚜️', title: 'Ennobled',
    text: `For ${why}, the sovereign offers to raise you to the nobility: ${title}.${NOBILITY[cc].lifeOnly ? ' The title is for your lifetime: Brazilian titles are not inherited.' : ' Your heirs will carry it after you.'}${nobleHouse(cc, yearNow(state)) ? ` It brings a seat in ${nobleHouse(cc, yearNow(state))}.` : ''}`,
    options: [
      { id: 'accept', label: `⚜️ Accept: ${title}` },
      { id: 'decline', label: '🙅 Decline with thanks', hint: 'Some reformers did' },
    ],
    data: { rank, cc },
  });
}

export const NobilityLawModule = {
  id: 'nobilityLaw',
  order: 33.7,
  onAgeUp(ctx) {
    lawChanges(ctx);
    ennoblement(ctx, sideRng(ctx.state));
  },
  resolvers: {
    creation(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'accept') return ctx.log('You declined the title.', '🙅');
      const c = state.character;
      const seat = Boolean(nobleHouse(data.cc, yearNow(state)));
      grantPeerage(ctx, { rank: data.rank, place: c.lastName, kind: NOBILITY[data.cc]?.lifeOnly ? 'life' : 'hereditary', seat });
      c.peerage.cc = data.cc;
      c.peerage.law = 'recognised';
      ctx.stat('happiness', 8);
      ctx.log(`You were ennobled: ${c.style.peerage}.${seat ? ` You take your seat in ${nobleHouse(data.cc, yearNow(state))}.` : ''}`, '⚜️', 'honor');
    },
    revolution(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId === 'flee') {
        try { arrive(ctx, 'FR', { reason: 'You fled the revolution with what you could carry.' }); } catch { /* the border closed */ }
        ctx.stat('stress', 10);
        return ctx.log('You got out through Finland with a suitcase and your mother\'s pearls. In Paris, princes drive taxis.', '🧳', 'warn');
      }
      if (state.noble) state.noble.hidden = true;
      ctx.stat('stress', 15);
      ctx.log('You burned the family papers in the stove and became a citizen like any other. You never spoke of it.', '🔥', 'warn');
    },
  },
};
