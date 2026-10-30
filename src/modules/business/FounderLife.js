/**
 * Being a founder (on top of the startup's numbers in BusinessEngine): the human side.
 *
 *   Pivot         two bad years and the product isn't working: pivot (start again with what you
 *                 learned), persevere, or shut it down.
 *   Cofounder     the person you started it with wants out, or wants your job.
 *   Poaching      a big company offers your best engineer three times the salary.
 *   Term sheet    a fund offers a huge valuation — with a 2× liquidation preference and a board
 *                 seat that outvotes you.
 *   Runway        the bank balance divided by the burn: months left, and what you do about it.
 *   Burnout       the hours. They catch up.
 *
 * biz.founder = { cofounder, badYears, prefs, boardControl }
 */
import { Random, clamp } from '../../core/Random.js';
import { BUSINESS_TYPES } from './BusinessTypes.js';
import { closeBusiness, exitBusiness } from './BusinessEngine.js';

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 48611 + state.character.age * 271 + 0xf0d) >>> 0);
const money = (x) => `$${Math.round(x).toLocaleString()}`;
export const isStartup = (biz) => Boolean(biz && BUSINESS_TYPES[biz.typeId]?.startup);

export function founderTick(main) {
  const { state } = main;
  const biz = state.business?.current;
  if (!isStartup(biz)) return;
  const f = (biz.founder ??= { cofounder: true, badYears: 0, prefs: 1, boardControl: false });
  const rng = sideRng(state);
  f.badYears = (biz.growth ?? 0) < 0 ? f.badYears + 1 : 0;
  const prompt = (title, text, kind, options) => main.prompt({ type: 'founder.event', icon: '🚀', title: `${biz.name}: ${title}`, text, data: { kind }, options });
  main.stat('stress', 4);
  if (rng.chance(0.12)) { main.stat('health', -3); main.log('Ninety-hour weeks for another year. Your doctor used the word "burnout".', '🔥', 'warn'); }
  if (f.badYears >= 2) {
    f.badYears = 0;
    return prompt('It Isn\'t Working', 'Two years of shrinking revenue. Your board wants a plan.', 'pivot', [
      { id: 'pivot', label: '🔄 Pivot: rebuild around what customers actually used', hint: 'Revenue halves; a new shot' },
      { id: 'persevere', label: '💪 Persevere: the market will come' },
      { id: 'shutdown', label: '🪦 Shut it down and return what\'s left', hint: 'An honest ending' },
    ]);
  }
  const runway = biz.cash > 0 && biz.lastYear?.netIncome < 0 ? Math.round(biz.cash / (-biz.lastYear.netIncome) * 12) : null;
  if (runway != null && runway < 9) {
    return prompt('Runway', `At this burn, ${biz.name} has about ${runway} months of money left.`, 'runway', [
      { id: 'cut', label: '✂️ Lay off a third of the team', hint: 'Buys a year; the culture breaks a little' },
      { id: 'bridge', label: '🌉 Ask investors for a bridge', hint: biz.investors?.length ? 'Dilutive' : 'You have no investors' , disabled: !biz.investors?.length },
      { id: 'personal', label: '💳 Put your own savings in', hint: 'Founders do. Some regret it.' },
    ]);
  }
  if (!rng.chance(0.45)) return;
  const pool = ['poach', 'termsheet'];
  if (f.cofounder && biz.years >= 2) pool.push('cofounder');
  const kind = rng.pick(pool);
  if (kind === 'poach') return prompt('Poached', 'A tech giant has offered your best engineer three times her salary.', kind, [
    { id: 'counter', label: '💵 Match it, with equity', hint: 'Expensive' }, { id: 'let', label: '👋 Wish her well', hint: 'The product slips' },
  ]);
  if (kind === 'termsheet') return prompt('A Term Sheet', `A famous fund offers ${money(Math.max(2000000, (biz.valuation ?? 1000000) * 0.5))} at twice your last valuation — with a 2× liquidation preference and two board seats to your one.`, kind, [
    { id: 'take', label: '✍️ Sign it', hint: 'Cash now; they control the exit' }, { id: 'negotiate', label: '🤝 Negotiate a clean term sheet at a lower price' }, { id: 'pass', label: '🙅 Pass' },
  ]);
  return prompt('Your Cofounder', 'Your cofounder, who wrote the first version in your kitchen, says one of you has to be in charge — and it should be them.', kind, [
    { id: 'buyout', label: '💼 Buy them out', hint: 'Your stake grows; you lose their brain' }, { id: 'yield', label: '🤝 Let them be CEO; you take product', hint: 'Less control, less stress' }, { id: 'fight', label: '⚔️ Take it to the board' },
  ]);
}

export const FounderResolvers = {
  event(ctx, data, optionId) {
    const { state, rng } = ctx;
    const biz = state.business?.current;
    if (!isStartup(biz)) return;
    const f = biz.founder;
    switch (`${data.kind}:${optionId}`) {
      case 'pivot:pivot': biz.arr = Math.round((biz.arr ?? 0) * 0.5); biz.fit = clamp((biz.fit ?? 1) + rng.float(-0.1, 0.35), 0.6, 1.6); biz.quality = Math.min(100, (biz.quality ?? 50) + 5); return ctx.log('You pivoted. Half the customers left; the ones who stayed love the new thing.', '🔄', 'info');
      case 'pivot:persevere': return ctx.log('You told the board the market would come.', '💪', 'warn');
      case 'pivot:shutdown': { const name = biz.name; closeBusiness(ctx, 'Shut down by its founder'); return ctx.log(`You shut ${name} down and wrote an honest post about what went wrong. A thousand founders read it.`, '🪦', 'milestone'); }
      case 'runway:cut': biz.staff.headcount = Math.max(1, Math.round(biz.staff.headcount * 0.67)); biz.quality = Math.max(0, (biz.quality ?? 50) - 6); ctx.stat('happiness', -6); return ctx.log('You laid off a third of the team on a video call. It was the worst day of your working life.', '✂️', 'bad');
      case 'runway:bridge': { const amt = Math.round(Math.max(250000, (biz.valuation ?? 1000000) * 0.1)); biz.cash += amt; biz.ownerPct = Math.round(biz.ownerPct * 0.85 * 10000) / 10000; return ctx.log(`Your investors bridged you with ${money(amt)} — at a price. You own ${Math.round(biz.ownerPct * 100)}% now.`, '🌉', 'warn'); }
      case 'runway:personal': { const amt = Math.round(Math.max(0, state.finances.cash) * 0.6); if (amt > 0) { ctx.spend(amt, `Personal money into ${biz.name}`); biz.cash += amt; } return ctx.log(`You put ${money(amt)} of your own savings into the company.`, '💳', 'warn'); }
      case 'poach:counter': biz.cash -= 150000; return ctx.log('You matched it, with stock. She stayed.', '💵', 'good');
      case 'poach:let': biz.quality = Math.max(0, (biz.quality ?? 50) - 8); return ctx.log('She left. Three others followed her within a year.', '👋', 'warn');
      case 'termsheet:take': { const amt = Math.max(2000000, (biz.valuation ?? 1000000) * 0.5); biz.cash += amt; biz.ownerPct = Math.round(biz.ownerPct * 0.8 * 10000) / 10000; f.prefs = 2; f.boardControl = true; biz.investors.push({ round: 'growth', pct: 0.2, invested: amt }); return ctx.log(`You signed. ${money(amt)} in the bank — and a board that can sell the company over your head.`, '✍️', 'warn'); }
      case 'termsheet:negotiate': { const amt = Math.max(1000000, (biz.valuation ?? 1000000) * 0.3); biz.cash += amt; biz.ownerPct = Math.round(biz.ownerPct * 0.85 * 10000) / 10000; biz.investors.push({ round: 'growth', pct: 0.15, invested: amt }); return ctx.log(`You took less money on clean terms: ${money(amt)}, one board seat, no preference stack.`, '🤝', 'good'); }
      case 'termsheet:pass': return ctx.log('You passed. Your board thought you were mad.', '🙅', 'info');
      case 'cofounder:buyout': { const cost = Math.round((biz.valuation ?? 0) * 0.08); ctx.spend(cost, 'Buying out your cofounder', { allowDebt: true }); biz.ownerPct = Math.min(1, biz.ownerPct + 0.1); f.cofounder = false; biz.quality = Math.max(0, (biz.quality ?? 50) - 5); return ctx.log('You bought your cofounder out. The company is more yours, and quieter.', '💼', 'info'); }
      case 'cofounder:yield': f.cofounder = 'ceo'; ctx.stat('stress', -8); return ctx.log('Your cofounder took the CEO title. You went back to building the product, and slept better.', '🤝', 'info');
      default: f.cofounder = false; if (rng.chance(f.boardControl ? 0.3 : 0.6)) return ctx.log('The board backed you. Your cofounder left, and took their friends.', '⚔️', 'warn');
        ctx.log('The board backed your cofounder. You were removed as CEO of the company you started; they bought out your stake.', '⚔️', 'bad'); return exitBusiness(ctx, Math.round((biz.valuation ?? 0) * 0.8), 'Removed as CEO by the board');
    }
  },
};

export const FounderModule = { id: 'founder', order: 50.5, onAgeUp: founderTick, resolvers: FounderResolvers };
