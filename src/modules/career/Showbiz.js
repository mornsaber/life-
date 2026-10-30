/**
 * The entertainment industry around an acting or music career (Audience.js is the fan base).
 *
 *   Agent        sign with a boutique agency or a major one (if they'll have you): better
 *                offers, for 10% of what you earn.
 *   Offers       each year a role or a record: a TV series, a studio film, an indie lead, a play —
 *                or an album with the label's push or on your own. It goes in your credits
 *                with how it did: box office, ratings or chart position.
 *   Typecasting  three of the same genre in a row and that's all you're offered.
 *   Awards       good work in serious projects brings nominations; a campaign helps; wins are
 *                honours and fame.
 *
 * state.showbiz = { credits: [{ year, title, kind, genre, result }], agent, typecast, noms, wins }
 */
import { Random, clamp } from '../../core/Random.js';
import { addHonor, currentYear } from '../../core/State.js';
import { priceLevel } from '../world/Countries.js';

const GENRES = ['drama', 'comedy', 'action', 'thriller', 'romance', 'horror', 'sci-fi'];
const TITLES = [['The', 'A', 'Last', 'Before the', 'After the', 'Inside the'], ['Harbour', 'Silence', 'Long Night', 'Northern Line', 'Garden', 'Verdict', 'Heist', 'Storm', 'Summer']];
export const ROLES = {
  series: { label: '📺 A TV series regular', pay: 120000, prestige: 0.3, check: 45 },
  studio: { label: '🎬 A supporting part in a studio film', pay: 250000, prestige: 0.2, check: 60 },
  indie: { label: '🎥 The lead in an indie film', pay: 25000, prestige: 0.9, check: 50 },
  stage: { label: '🎭 A play in the West End / on Broadway', pay: 40000, prestige: 0.8, check: 45 },
};
export const RECORDS = {
  label: { label: '💿 An album with the label\'s full push', pay: 150000, prestige: 0.3, check: 55 },
  indie: { label: '🎸 An album on your own terms', pay: 30000, prestige: 0.8, check: 45 },
  tour: { label: '🚌 A world tour', pay: 300000, prestige: 0.1, check: 50 },
};
const AWARDS = { acting: { US: 'an Academy Award', GB: 'a BAFTA', FR: 'a César', default: 'the national film award' }, music: { US: 'a Grammy', GB: 'a Brit Award', default: 'the national music award' } };
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 63689 + state.character.age * 467 + 0x5b2) >>> 0);
const kindOf = (state) => ({ acting: 'acting', music: 'music' }[state.career.job?.professionId] ?? null);
const award = (state, k) => AWARDS[k][state.character.countryId ?? 'US'] ?? AWARDS[k].default;
const SB = (state) => (state.showbiz ??= { credits: [], agent: null, typecast: null, noms: 0, wins: 0 });
export const showbizOf = (state) => state.showbiz ?? { credits: [], agent: null, typecast: null, noms: 0, wins: 0 };
export const showbizKind = kindOf;

export function showbizTick(main) {
  const { state } = main;
  const k = kindOf(state);
  if (!k || state.career.job.levelId === 'extra') return;
  const S = SB(state);
  const rng = sideRng(state);
  const genre = rng.pick(GENRES);
  const typecast = S.typecast;
  const menu = k === 'acting' ? ROLES : RECORDS;
  const options = Object.entries(menu).filter(([id]) => !typecast || k === 'music' || id !== 'indie' || S.agent?.tier === 'major').map(([id, r]) => ({ id, label: r.label, hint: `≈$${Math.round(r.pay * priceLevel(state) * (S.agent ? 1.3 : 1)).toLocaleString()}` }));
  options.push({ id: 'pass', label: '🛋️ Turn everything down this year' });
  main.prompt({ type: 'showbiz.offer', icon: k === 'acting' ? '🎬' : '🎤', title: S.agent ? 'Your Agent Calls' : 'This Year\'s Auditions', text: k === 'acting' ? `What's on the table this year${typecast ? ` — mostly ${typecast} parts; you've been typecast` : ''}. The genre: ${genre}.` : 'The label wants to know what\'s next.', data: { genre }, options });
}

export const ShowbizResolvers = {
  offer(ctx, data, optionId) {
    const { state, rng } = ctx;
    const k = kindOf(state);
    if (!k || optionId === 'pass') return optionId === 'pass' && ctx.log('You turned everything down and spent the year at home.', '🛋️', 'info');
    const S = SB(state);
    const r = (k === 'acting' ? ROLES : RECORDS)[optionId];
    const skill = (k === 'acting' ? state.stats.looks * 0.5 + state.stats.smarts * 0.5 : state.stats.smarts * 0.6 + state.stats.looks * 0.4) + (S.agent ? 8 : 0) + Math.min(20, (state.fame?.score ?? 0) / 4);
    const got = rng.chance(clamp((skill - r.check + 50) / 100, 0.15, 0.9));
    if (!got) return ctx.log(rng.pick(['You didn\'t get it. "They went another way."', 'Down to the last two — and the other one got it.', 'The project fell apart before it started.']), '📭', 'warn');
    const pay = Math.round(r.pay * priceLevel(state) * (S.agent ? 1.3 : 1) * rng.float(0.7, 1.3));
    ctx.earn(pay, k === 'acting' ? 'Role fee' : 'Advance and royalties', { selfEmployed: true });
    if (S.agent) ctx.spend(Math.round(pay * 0.1), 'Agent\'s 10%');
    const quality = rng.float(0, 1) + (skill - 60) / 100;
    const title = k === 'acting' ? `"${rng.pick(TITLES[0])} ${rng.pick(TITLES[1])}"` : `"${rng.pick(TITLES[1])}"`;
    const result = optionId === 'studio' ? `$${Math.round(rng.int(20, 900) * (0.5 + quality))}M at the box office` : optionId === 'series' ? `${rng.int(1, 5)} season${quality > 0.6 ? 's' : ''}, ${quality > 0.7 ? 'a critics\' favourite' : 'solid ratings'}` : optionId === 'label' ? `No. ${Math.max(1, Math.round(60 - quality * 55))} in the charts` : optionId === 'tour' ? `${rng.int(40, 120)} dates, ${quality > 0.6 ? 'sold out' : 'half-full arenas'}` : quality > 0.7 ? 'raves from the critics' : quality > 0.4 ? 'good reviews' : 'mixed reviews';
    S.credits = [...S.credits, { year: currentYear(state), title, kind: optionId, genre: data.genre, result }].slice(-20);
    ctx.emit('fame:buzz', { amount: Math.round(2 + quality * 4) });
    ctx.log(`${title} (${data.genre}): ${result}.`, k === 'acting' ? '🎬' : '💿', quality > 0.6 ? 'good' : 'info');
    // Typecasting: three in a row of the same genre.
    const last3 = S.credits.slice(-3);
    if (k === 'acting' && last3.length === 3 && last3.every((c) => c.genre === last3[0].genre)) { S.typecast = last3[0].genre; ctx.log(`Three ${S.typecast} roles in a row: casting directors only see you one way now.`, '🎭', 'warn'); }
    else if (S.typecast && data.genre !== S.typecast) S.typecast = null;
    // Awards season.
    if (quality * r.prestige > 0.45 && rng.chance(0.6)) {
      S.noms += 1;
      ctx.prompt({ type: 'showbiz.awards', icon: '🏆', title: 'Nominated', text: `You've been nominated for ${award(state, k)} for ${title}.`, data: { title, k }, options: [
        { id: 'campaign', label: '📣 Run an awards campaign', hint: `≈$${Math.round(80000 * priceLevel(state)).toLocaleString()} of screenings and dinners` },
        { id: 'humble', label: '🙂 Let the work speak' },
      ] });
    }
  },
  awards(ctx, data, optionId) {
    const { state, rng } = ctx;
    const S = SB(state);
    if (optionId === 'campaign') ctx.spend(Math.round(80000 * priceLevel(state)), 'Awards campaign', { allowDebt: true });
    if (rng.chance(optionId === 'campaign' ? 0.35 : 0.22)) {
      S.wins += 1;
      addHonor(state, { id: `showbiz.${currentYear(state)}`, source: 'showbiz', name: award(state, data.k).replace(/^an? /, '').replace(/^the /, '').replace(/^./, (c) => c.toUpperCase()), icon: '🏆', prestige: 12, citation: `For ${data.title}.` });
      ctx.emit('fame:buzz', { amount: 15 });
      ctx.stat('happiness', 12);
      return ctx.log(`You won ${award(state, data.k)} for ${data.title}. Your speech went viral.`, '🏆', 'milestone');
    }
    ctx.log(`You lost to someone you secretly thought deserved it. You clapped anyway.`, '👏', 'info');
  },
};

export const ShowbizActions = {
  agent(ctx) {
    const { state } = ctx;
    const S = SB(state);
    if (!kindOf(state)) return ctx.toast('For actors and musicians', 'warn');
    if (S.agent) { S.agent = null; return ctx.log('You parted ways with your agent.', '📇', 'info'); }
    const tier = (state.fame?.score ?? 0) >= 45 || S.wins ? 'major' : 'boutique';
    S.agent = { tier, since: state.character.age };
    ctx.log(`You signed with ${tier === 'major' ? 'one of the big agencies' : 'a small boutique agency'}. They take 10%.`, '📇', 'good');
  },
};

export const ShowbizModule = { id: 'showbiz', order: 31.8, onAgeUp: showbizTick, actions: ShowbizActions, resolvers: ShowbizResolvers };
