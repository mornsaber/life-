/**
 * Who chooses the Crown's representatives — and when it's you.
 *
 *   Governor-General (Canada, Australia, New Zealand): the monarch appoints on
 *     the Prime Minister's advice.
 *   State Governor (Australia): the monarch appoints on the state Premier's advice.
 *   Lieutenant Governor (Canada): the Governor General appoints on the federal
 *     Prime Minister's advice — a provincial premier is only consulted.
 *
 * Every post has a holder with a term. When a term ends and you hold the advising
 * office, the shortlist comes to you; otherwise someone is chosen and it's news.
 * A premier or prime minister can also advise that a governor be recalled.
 *
 * state.world.viceRegal = { [key]: { postId, name, background, since, until, you } }
 *   key: 'au_gg', 'au_governor:AU-NSW', 'ca_lg:CA-ON'…
 */
import { OFFICES } from './Offices.js';
import { stateIdOf } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { currentYear, randomName } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { crownOf, sovereign } from '../world/Crown.js';

/** Each post, who advises on it, and whether there's one per state or province. */
export const VICE_REGAL = {
  ca_gg: { country: 'CA', adviser: 'ca_pm' },
  au_gg: { country: 'AU', adviser: 'au_pm' },
  nz_gg: { country: 'NZ', adviser: 'nz_pm' },
  au_governor: { country: 'AU', adviser: 'au_premier', perState: true },
  ca_lg: { country: 'CA', adviser: 'ca_pm', perState: true, consulted: 'ca_premier' },
};
export const CANDIDATES = [
  { id: 'judge', label: 'a retired chief justice', approval: 2 },
  { id: 'general', label: 'a former chief of the defence force', approval: 1 },
  { id: 'scientist', label: 'a scientist and university chancellor', approval: 2 },
  { id: 'leader', label: 'an Indigenous community leader', approval: 3 },
  { id: 'athlete', label: 'a much-loved former sports captain', approval: 1 },
  { id: 'crony', label: 'a former minister from your own party', approval: -6, partisan: true },
];

const keyFor = (postId, stateId) => (VICE_REGAL[postId].perState ? `${postId}:${stateId}` : postId);
const placeName = (postId, stateId) => (VICE_REGAL[postId].perState ? STATES[stateId]?.name ?? stateId : null);

/** The posts that touch your life: your country's, and your state's. */
function postsHere(state) {
  const cc = state.character.countryId ?? 'US';
  const st = stateIdOf(state);
  return Object.entries(VICE_REGAL).filter(([, v]) => v.country === cc).map(([postId, v]) => ({ postId, key: keyFor(postId, st), stateId: v.perState ? st : null }));
}

export function holderOf(state, key) {
  return state.world?.viceRegal?.[key] ?? null;
}

/** Who advises on a post: your office, if you hold the right one. */
export const youAdvise = (state, postId) => state.politics?.office?.id === VICE_REGAL[postId]?.adviser;

function appoint(ctx, post, { name, background, you = false }) {
  const { state, rng } = ctx;
  const year = currentYear(state);
  state.world.viceRegal[post.key] = { postId: post.postId, name, background, since: year, until: year + rng.int(4, 6), you };
}

export function viceRegalYear(ctx) {
  const { state, rng } = ctx;
  if (!crownOf(state)) return;
  state.world ??= {};
  state.world.viceRegal ??= {};
  const year = currentYear(state);
  for (const post of postsHere(state)) {
    if (!OFFICES[post.postId]) continue;
    const h = holderOf(state, post.key);
    // You hold it yourself: your term runs through Politics.
    if (state.politics?.office?.id === post.postId) {
      state.world.viceRegal[post.key] = { postId: post.postId, name: `${state.character.firstName} ${state.character.lastName}`, background: 'you', since: h?.since ?? year, until: year + 5, you: true };
      continue;
    }
    if (!h) {
      const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
      state.world.viceRegal[post.key] = { postId: post.postId, name: `${n.firstName} ${n.lastName}`, background: rng.pick(CANDIDATES.filter((c) => !c.partisan)).label, since: year - rng.int(0, 4), until: year + rng.int(1, 5) };
      continue;
    }
    if (year < h.until || state.prompts.some((p) => p.type === 'viceRegal.advise')) continue;
    const title = OFFICES[post.postId].name;
    const where = placeName(post.postId, post.stateId);
    if (youAdvise(state, post.postId)) {
      const picks = rng.shuffle([...CANDIDATES]).slice(0, 3);
      const shortlist = picks.map((c) => { const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female'); return { ...c, name: `${n.firstName} ${n.lastName}` }; });
      ctx.prompt({
        type: 'viceRegal.advise', icon: OFFICES[post.postId].icon, title: `A New ${title}`,
        text: `${h.name}'s term as ${title}${where ? ` of ${where}` : ''} is ending. By convention ${sovereign(state, state.character.countryId)} appoints whoever you recommend. Your office has a shortlist.`,
        options: [
          ...shortlist.map((c, i) => ({ id: `pick${i}`, label: `👤 ${c.name} — ${c.label}`, hint: c.partisan ? 'Loyal — and the press will say so' : '' })),
          { id: 'extend', label: `⏳ Ask ${h.name} to stay on two more years` },
        ],
        data: { key: post.key, postId: post.postId, stateId: post.stateId, shortlist },
      });
      continue;
    }
    const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
    const bg = rng.pick(CANDIDATES.filter((c) => !c.partisan)).label;
    appoint(ctx, post, { name: `${n.firstName} ${n.lastName}`, background: bg });
    ctx.log(`${n.firstName} ${n.lastName}, ${bg}, was appointed ${title}${where ? ` of ${where}` : ''}.`, OFFICES[post.postId].icon, 'muted');
  }
}

export const ViceRegalModule = {
  id: 'viceRegal',
  order: 33.7,
  onAgeUp(ctx) {
    if (ctx.state.character.alive) viceRegalYear(ctx);
  },
  actions: {
    /** Advise the Crown to recall the governor (arg: post key). A rare and costly step. */
    recall(ctx, key) {
      const { state } = ctx;
      const h = holderOf(state, key);
      if (!h || h.you || !youAdvise(state, h.postId)) return ctx.toast('Only the adviser on that post can ask for a recall.', 'warn');
      const o = state.politics.office;
      o.approval = Math.round(clamp(o.approval - 10, 0, 100));
      h.until = currentYear(state);
      ctx.log(`You advised ${sovereign(state, state.character.countryId)} to recall ${h.name} as ${OFFICES[h.postId].name}. It was done — and it looked like you had something to hide.`, '📜', 'warn');
      return undefined;
    },
  },
  resolvers: {
    advise(ctx, data, optionId) {
      const { state } = ctx;
      const o = state.politics.office;
      const post = { key: data.key, postId: data.postId };
      const h = holderOf(state, data.key);
      if (optionId === 'extend' && h) {
        h.until += 2;
        return ctx.log(`${h.name} agreed to stay on as ${OFFICES[data.postId].name} for two more years.`, OFFICES[data.postId].icon, 'info');
      }
      const c = data.shortlist[Number(String(optionId).replace('pick', ''))];
      if (!c) return undefined;
      appoint(ctx, post, { name: c.name, background: c.label });
      if (o) o.approval = Math.round(clamp(o.approval + c.approval, 0, 100));
      return ctx.log(`On your advice ${sovereign(state, state.character.countryId)} appointed ${c.name}, ${c.label}, ${OFFICES[data.postId].name}${placeName(data.postId, data.stateId) ? ` of ${placeName(data.postId, data.stateId)}` : ''}.${c.partisan ? ' The opposition called it jobs for the boys.' : ''}`, OFFICES[data.postId].icon, c.partisan ? 'warn' : 'good');
    },
  },
};
