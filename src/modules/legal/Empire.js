/**
 * The empire: from underboss up, the city becomes a map. Built on the outfit life in
 * Underworld.js (rackets, crews, laundering, task forces, witness protection).
 *
 *   Districts  six neighbourhoods, each held by an outfit with a grip of 0–100, an income
 *              and its own heat. What your outfit holds pays you (dirty) every year — and
 *              draws the police.
 *   Moves      one a year: push into a district, dig in where you hold, or pull out.
 *   Pushback   rivals contest what you hold: fight, cut a deal, or give ground.
 *   Going legit with enough laundered money and a clean business, a boss can walk away —
 *              the rarest ending of all.
 *
 * state.underworld.me.empire = { districts: [{ name, owner, grip, income, heat }], legitAge }
 */
import { Random } from '../../core/Random.js';
import { meOf, outfitsHere } from './Underworld.js';
import { commitOffense } from './JusticeSystem.js';
import { REGIONS } from '../life/Regions.js';
import { priceLevel } from '../world/Countries.js';

const DISTRICTS = ['the Docks', 'Downtown', 'the North Side', 'the Old Quarter', 'the Market', 'the Industrial Park'];
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 98299 + state.character.age * 547 + salt) >>> 0);
const pending = (state, type) => state.prompts.some((p) => p.type === type);

/** Underbosses and bosses see the map. */
export const runsEmpire = (state) => { const me = meOf(state); return Boolean(me && !me.left && !me.witsec && me.rank >= 3); };
export const empireOf = (state) => meOf(state)?.empire ?? null;
export const heldBy = (e, outfitId) => (e?.districts ?? []).filter((d) => d.owner === outfitId);

function ensure(ctx) {
  const { state } = ctx;
  const me = meOf(state);
  if (me.empire) return me.empire;
  const rng = sideRng(state, 0x4e);
  const outfits = outfitsHere(state);
  // Carve the city up the way the outfits' territory shares say.
  const owners = outfits.flatMap((o) => Array.from({ length: Math.max(1, Math.round((o.territory ?? 33) / 100 * DISTRICTS.length)) }, () => o.id));
  me.empire = {
    districts: DISTRICTS.map((name, i) => ({ name, owner: owners[i] ?? rng.pick(outfits).id, grip: rng.int(40, 80), income: Math.round(rng.int(60, 200) * 1000 * priceLevel(state)), heat: rng.int(5, 30) })),
    legitAge: null,
  };
  return me.empire;
}

/** Keep the outfits' territory shares in step with the map. */
function syncTerritory(state, e) {
  for (const o of outfitsHere(state)) o.territory = Math.round((heldBy(e, o.id).length / e.districts.length) * 100);
}

export function empireTick(ctx) {
  const { state } = ctx;
  if (!runsEmpire(state)) return;
  const me = meOf(state);
  const e = ensure(ctx);
  const rng = sideRng(state, 0x3a);
  const mine = heldBy(e, me.outfitId);
  // What your districts pay: the boss takes the most.
  const take = mine.reduce((s, d) => s + d.income * (d.grip / 100), 0) * (me.rank >= 4 ? 0.35 : 0.15);
  if (take > 0) me.dirty = (me.dirty ?? 0) + Math.round(take);
  for (const d of e.districts) {
    d.heat = clamp(d.heat + (d.owner === me.outfitId ? 4 : 1) - 3);
    d.grip = clamp(d.grip + (d.owner === me.outfitId ? 1 : 0));
  }
  // A district too hot draws a task force raid.
  const hot = mine.find((d) => d.heat >= 70);
  if (hot && rng.chance(0.3)) {
    hot.grip = clamp(hot.grip - 25);
    hot.heat = 30;
    commitOffense(ctx, { offenseId: 'racketeering', context: `the raids in ${hot.name}`, discovery: 0.15, evidence: 0.4 });
    ctx.log(`A task force raided your operations in ${hot.name}. Arrests, seizures, and your name in the warrants.`, '🚔', 'bad');
  }
  // Rivals push into what you hold.
  const weak = mine.filter((d) => d.grip < 60);
  if (weak.length && rng.chance(0.3) && !pending(state, 'empire.pushback')) {
    const d = rng.pick(weak);
    const rival = outfitsHere(state).find((o) => o.id !== me.outfitId);
    if (rival) {
      ctx.prompt({
        type: 'empire.pushback', icon: '🔥', title: `Trouble in ${d.name}`,
        text: `${rival.name} is moving in on ${d.name}: their people are on your corners, and one of your crew got a beating.`,
        options: [
          { id: 'fight', label: '⚔️ Hit back', hint: 'Violent; holds the district if you win', tone: 'danger' },
          { id: 'deal', label: '🤝 Sit down and split the take' },
          { id: 'cede', label: '🏳️ Give them the district' },
        ],
        data: { district: d.name, rivalId: rival.id },
      });
    }
  }
  syncTerritory(state, e);
}

export const EmpireModule = {
  id: 'empire',
  order: 80.5,
  onAgeUp: empireTick,

  actions: {
    /** arg: 'district name|push|dig|pull' — one move a year. */
    move(ctx, arg) {
      const { state } = ctx;
      if (!runsEmpire(state)) return;
      const [name, kind] = String(arg).split('|');
      const e = ensure(ctx);
      const d = e.districts.find((x) => x.name === name);
      const me = meOf(state);
      if (!d) return;
      if (state.yearly['empire.move']) return ctx.toast('One move a year.', 'warn');
      state.yearly['empire.move'] = 1;
      const rng = sideRng(state, name.length * 13 + kind.length);
      if (kind === 'push' && d.owner !== me.outfitId) {
        d.heat = clamp(d.heat + 15);
        if (rng.chance(0.45 + (me.rank >= 4 ? 0.1 : 0) - d.grip / 300)) {
          d.owner = me.outfitId; d.grip = 45;
          ctx.log(`Your people took ${d.name}. The corners are yours now.`, '🗺️', 'milestone');
        } else { d.grip = clamp(d.grip + 5); ctx.log(`The push into ${d.name} failed. They were ready for you.`, '🗺️', 'bad'); }
        commitOffense(ctx, { offenseId: 'assault', context: `the fight for ${d.name}`, discovery: 0.1, evidence: 0.3 });
      } else if (kind === 'dig' && d.owner === me.outfitId) {
        d.grip = clamp(d.grip + 20);
        d.heat = clamp(d.heat - 10);
        ctx.log(`You dug in across ${d.name}: paid-off cops, loyal shopkeepers, quieter corners.`, '🧱', 'good');
      } else if (kind === 'pull' && d.owner === me.outfitId) {
        d.owner = (outfitsHere(state).find((o) => o.id !== me.outfitId) ?? { id: d.owner }).id;
        d.grip = 50;
        ctx.log(`You pulled out of ${d.name}. Less money, less heat.`, '🚪', 'info');
      }
      syncTerritory(state, e);
    },
    /** A boss with clean money and a clean business walks away. */
    goLegit(ctx) {
      const { state } = ctx;
      const me = meOf(state);
      if (!runsEmpire(state) || me.rank < 4) return ctx.toast('Only the boss can take the family legit.', 'warn');
      if ((me.laundered ?? 0) < 1_000_000 || !state.business?.current) return ctx.toast('You need a clean business and $1M+ laundered first.', 'warn');
      const rng = sideRng(state, 0x1e);
      if (!rng.chance(0.55)) {
        me.trust = Math.max(0, (me.trust ?? 50) - 30);
        return ctx.log('You told the family you were going legit. Nobody believed you could, and some took it as weakness.', '🎩', 'bad');
      }
      me.empire.legitAge = state.character.age;
      me.left = true;
      ctx.emit('news:story', { tier: 'local', headline: `${state.character.firstName} ${state.character.lastName}: businessman`, weight: 4, icon: '🎩', you: true });
      ctx.log(`You walked away from the life. ${state.business.current.name} is all you are now — on paper, and maybe even for real.`, '🎩', 'milestone');
    },
  },

  resolvers: {
    pushback(ctx, data, optionId) {
      const { state, rng } = ctx;
      const e = empireOf(state);
      const d = e?.districts.find((x) => x.name === data.district);
      if (!d) return;
      if (optionId === 'fight') {
        commitOffense(ctx, { offenseId: 'assault', context: `the war over ${d.name}`, discovery: 0.12, evidence: 0.35 });
        d.heat = clamp(d.heat + 20);
        if (rng.chance(0.55)) { d.grip = clamp(d.grip + 25); return ctx.log(`You hit back hard. ${d.name} stays yours.`, '⚔️', 'warn'); }
        d.owner = data.rivalId; d.grip = 50;
        return ctx.log(`You lost the war for ${d.name}.`, '⚔️', 'bad');
      }
      if (optionId === 'deal') { d.income = Math.round(d.income * 0.6); d.grip = clamp(d.grip + 10); return ctx.log(`You split ${d.name}'s take with them. Peace, for now.`, '🤝', 'info'); }
      d.owner = data.rivalId; d.grip = 55;
      syncTerritory(state, e);
      ctx.log(`You gave up ${d.name} without a fight.`, '🏳️', 'warn');
    },
  },
};
