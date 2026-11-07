/**
 * The wider family over the generations: falling out, getting together, and what the name
 * has come to mean.
 *
 *   Feuds      a sibling or grown child falls out with you — over money lent, who looks after
 *              a parent, or an old slight. It lasts until someone mends it.
 *   Reunions   every few years the family gathers: host it, turn up, or stay away.
 *   The firm   a family business that has passed down the line carries the founder's name —
 *              and by the third generation, heirs who'd rather sell.
 *   Dynasty    a score for the family name across every generation played: money, honours,
 *              fame and how long the line has run.
 *
 * state.family = { feuds: [{ personId, cause, since }], lastReunion }
 */
import { Random } from '../../core/Random.js';
import { living, ageOf, byId, clampRel } from './People.js';
import { rep } from '../life/Reputation.js';

const CAUSES = {
  money: 'a loan that was never paid back',
  care: 'who should look after your ageing parent',
  slight: 'something said at a wedding years ago',
  inheritance: 'how your parents\' things were divided',
};
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 33391 + state.character.age * 271 + salt) >>> 0);
const pending = (state, type) => state.prompts.some((p) => p.type === type);
const kin = (state) => living(state).filter((p) => ['sibling', 'child'].includes(p.relation) && ageOf(state, p) >= 18);

export const feudsOf = (state) => (state.family?.feuds ?? []).filter((f) => byId(state, f.personId)?.alive);
export const inFeud = (state, personId) => feudsOf(state).some((f) => f.personId === personId);

/** A family's standing across the generations (0–100). */
export function dynastyScore(state) {
  const anc = state.lineage?.ancestors ?? [];
  const wealth = anc.reduce((s, a) => s + Math.max(0, a.netWorth ?? 0), 0);
  const honours = anc.reduce((s, a) => s + (a.honours?.length ?? 0), 0) + (state.honors?.length ?? 0);
  const gens = state.lineage?.generation ?? 1;
  const money = wealth > 0 ? Math.log10(wealth) * 6 : 0;
  return Math.round(Math.min(100, money + honours * 4 + (gens - 1) * 8 + (state.fame?.score ?? 0) / 5));
}
export const dynastyLabel = (score) => (score >= 80 ? 'A great dynasty' : score >= 60 ? 'A prominent family' : score >= 40 ? 'A known name locally' : score >= 20 ? 'A respectable family' : 'Ordinary folk');

function startFeud(ctx, person, cause) {
  const { state } = ctx;
  const f = (state.family ??= { feuds: [], lastReunion: null });
  if (inFeud(state, person.id)) return;
  f.feuds.push({ personId: person.id, cause, since: state.character.age });
  person.relationship = clampRel(person.relationship - 25);
  rep(ctx, 'family', -6, `Fell out with ${person.firstName}`);
  ctx.log(`You and ${person.firstName} fell out over ${CAUSES[cause]}. You're not speaking.`, '🧊', 'bad');
}

export function familyTick(ctx) {
  const { state } = ctx;
  if (state.character.age < 20) return;
  const rng = sideRng(state, 0x7a);
  const family = kin(state);
  // Feuds: rarer with people you're close to.
  const strained = family.filter((p) => !inFeud(state, p.id) && p.relationship < 45);
  if (strained.length && rng.chance(0.08)) startFeud(ctx, rng.pick(strained), rng.pick(Object.keys(CAUSES)));
  // A feud that drags on wears everyone down.
  for (const f of feudsOf(state)) {
    const p = byId(state, f.personId);
    p.relationship = clampRel(p.relationship - 2);
    if (state.character.age - f.since >= 8 && rng.chance(0.1)) {
      state.family.feuds = state.family.feuds.filter((x) => x !== f);
      p.relationship = clampRel(p.relationship + 15);
      ctx.log(`After ${state.character.age - f.since} years, ${p.firstName} called. Neither of you mentioned the feud.`, '📞', 'good');
    }
  }
  // Reunions: every few years, if there's a family to gather.
  const fam = state.family ?? {};
  if (family.length >= 2 && (fam.lastReunion == null || state.character.age - fam.lastReunion >= 5) && rng.chance(0.3) && !pending(state, 'familyFeuds.reunion')) {
    (state.family ??= { feuds: [], lastReunion: null }).lastReunion = state.character.age;
    ctx.prompt({
      type: 'familyFeuds.reunion', icon: '🎉', title: 'A Family Reunion',
      text: `The ${state.character.lastName}s are getting together this summer${feudsOf(state).length ? ' — and not everyone is speaking' : ''}.`,
      options: [
        { id: 'host', label: '🏡 Host it', hint: '≈$3,000' },
        { id: 'go', label: '🚗 Go' },
        { id: 'skip', label: '🙅 Make an excuse' },
      ],
      data: {},
    });
  }
  // The family firm, generations on: the heirs want their money out.
  const biz = state.business?.current;
  if (biz && (biz.familyGens ?? 1) >= 3 && rng.chance(0.12) && !pending(state, 'familyFeuds.firm')) {
    ctx.prompt({
      type: 'familyFeuds.firm', icon: '🏛️', title: 'The Family Firm',
      text: `${biz.name} has been in the ${biz.founderFamily ?? state.character.lastName} family for ${biz.familyGens} generations. Your cousins, who own a slice and don't work there, want to sell.`,
      options: [
        { id: 'buyout', label: '💰 Buy them out', hint: '≈10% of the value' },
        { id: 'refuse', label: '🚫 Refuse to sell', hint: 'They won\'t forget' },
        { id: 'sell', label: '🤝 Sell the company' },
      ],
      data: {},
    });
  }
}

export const FamilyFeudsModule = {
  id: 'familyFeuds',
  order: 9.75,
  onAgeUp: familyTick,

  actions: {
    /** arg: person id — try to end a feud. */
    mend(ctx, personId) {
      const { state } = ctx;
      const f = feudsOf(state).find((x) => x.personId === personId);
      const p = byId(state, personId);
      if (!f || !p) return;
      if (state.yearly[`feud.mend.${personId}`]) return ctx.toast('You already tried this year.', 'warn');
      state.yearly[`feud.mend.${personId}`] = 1;
      if (sideRng(state, personId.length).chance(0.25 + p.relationship / 150)) {
        state.family.feuds = state.family.feuds.filter((x) => x !== f);
        p.relationship = clampRel(p.relationship + 20);
        rep(ctx, 'family', 6);
        ctx.stat('happiness', 6);
        return ctx.log(`You and ${p.firstName} made up. It took one of you going first.`, '🕊️', 'good');
      }
      ctx.log(`${p.firstName} didn't pick up.`, '📵', 'warn');
    },
  },

  resolvers: {
    reunion(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const family = kin(state);
      if (optionId === 'skip') { rep(ctx, 'family', -4, 'Skipped the family reunion'); return ctx.log('You skipped the reunion. You heard all about it anyway.', '🙅', 'muted'); }
      if (optionId === 'host') { ctx.spend(3000, 'Hosting the family reunion', { credit: true }); rep(ctx, 'family', 8); }
      for (const p of family) p.relationship = clampRel(p.relationship + (optionId === 'host' ? 6 : 3));
      ctx.stat('happiness', 5);
      // A reunion can mend a feud — or reopen one.
      const f = feudsOf(state)[0];
      if (f && rng.chance(0.35)) {
        state.family.feuds = state.family.feuds.filter((x) => x !== f);
        return ctx.log(`At the reunion, you and ${byId(state, f.personId).firstName} finally talked. The feud is over.`, '🎉', 'good');
      }
      ctx.log(optionId === 'host' ? 'You hosted the reunion: three generations in the garden and too much food.' : 'You went to the reunion. Mostly good.', '🎉', 'good');
    },
    firm(ctx, _data, optionId) {
      const { state } = ctx;
      const biz = state.business?.current;
      if (!biz) return;
      if (optionId === 'buyout') {
        ctx.spend(Math.round((biz.valuation ?? 0) * 0.1), 'Buying out the cousins', { allowDebt: true });
        return ctx.log(`You bought out the cousins. ${biz.name} stays in the family.`, '💰', 'good');
      }
      if (optionId === 'refuse') {
        rep(ctx, 'family', -10, 'Refused to sell the family firm');
        const sib = kin(state).find((p) => p.relation === 'sibling');
        if (sib) startFeud(ctx, sib, 'inheritance');
        return ctx.log('You refused to sell. The cousins took it badly.', '🚫', 'warn');
      }
      biz.familyGens = 0;
      ctx.log(`You agreed to sell ${biz.name}. List it in the Business tab.`, '🤝', 'info');
    },
  },
};
