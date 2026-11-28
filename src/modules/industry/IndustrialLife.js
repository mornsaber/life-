/**
 * Working life in industry: what the model's year means for someone at the coalface, the loom,
 * the furnace or the dock gate.
 *
 *   disasters   an explosion, a fire, a collapse in your own industry: go to the rescue, or not;
 *               compensation if the law gives it, the hat passed round if it doesn't
 *   short time  a shrinking trade puts you on short time: a week in four unpaid
 *   the store   in a company town without lawful unions, wages come partly in the company's own
 *               tokens, spent at its store
 *   strikes     a cut or a closure and a lawful union calls you out: strike, or work on; where
 *               unions are unlawful, it's a secret combination and the law can come for you
 *   machines    new machines arrive: take the redundancy money, retrain, or hang on
 *   closure     the trade dies in your town: the gates shut for good
 *
 * At most one of these a year, so a life in the mill isn't a year of nothing but the mill.
 * Its own random stream, so the rest of the year falls as it would have.
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { industryOfProfession, jobsHealth, INDUSTRIES, emergent } from './IndustryEngine.js';
import { townTrade, unionsLawful } from './Sync.js';
import { statuteIn } from '../politics/StatuteBook.js';
import { leaveJob } from '../career/CareerEngine.js';

const cc = (state) => state.character?.countryId ?? 'US';
const PLACE = { coal: 'the pit', metalMining: 'the mine', textiles: 'the mill', ironSteel: 'the works', engineering: 'the works', shipbuilding: 'the yard', shipping: 'the docks', whaling: 'the whaler', fishing: 'the boats', timber: 'the camp', oilGas: 'the rig', chemicals: 'the plant', automobile: 'the plant', aerospace: 'the plant', railways: 'the line', construction: 'the site', farming: 'the farm', plantation: 'the estate', electronics: 'the factory', software: 'the office', pharma: 'the lab', telecom: 'the exchange', power: 'the power station', nuclear: 'the reactor', trucking: 'the depot', airlines: 'the airport', media: 'the studio', renewables: 'the plant' };
const DISASTER = {
  coal: 'Firedamp: an explosion underground. The cage came up with the first of the dead an hour later.',
  metalMining: 'A roof fall in the deep levels: men trapped behind tons of rock.',
  textiles: 'Fire in the carding room: the cotton dust went up like gunpowder.',
  ironSteel: 'A furnace burst: molten iron across the casting floor.',
  shipbuilding: 'Staging collapsed on the slipway: men fell into the hull.',
  shipping: 'A cargo sling parted over the hold.',
  whaling: 'A ship lost with all hands in the ice.',
  fishing: 'A gale caught the fleet at sea: three boats did not come home.',
  timber: 'A log jam broke on the river.',
  oilGas: 'A blowout and a fire on the rig.',
  chemicals: 'An explosion at the works: the windows went for a mile around.',
  railways: 'A collision in fog on the main line.',
  construction: 'Scaffolding gave way on the site.',
};
const rngOf = (state) => new Random(((state.world?.seed ?? 1) * 6113 + state.character.age * 397 + 0x1a1) >>> 0);

/** Your job's industry, if it is one the model follows. */
function myIndustry(state) {
  const job = state.career?.job;
  if (!job || !emergent(state) || !state.industry?.c?.[cc(state)]) return null;
  const id = industryOfProfession(job.professionId, state);
  return id ? { job, id, I: INDUSTRIES[id], place: PLACE[id] ?? 'work', jobs: jobsHealth(state, id) } : null;
}

export const IndustrialLifeModule = {
  id: 'industrialLife',
  order: 29.2,
  onAgeUp(ctx) {
    const { state } = ctx;
    const me = myIndustry(state);
    if (!me) return;
    const rng = rngOf(state);
    const il = (state.industrialLife ??= {});
    const y = yearNow(state);
    const events = state.industry.yearEvents ?? [];
    if (state.prompts.some((p) => p.type.startsWith('industrialLife.'))) return;

    // A disaster in your own trade this year.
    const d = events.find((e) => e.kind === 'disaster' && e.cc === cc(state) && e.industry === me.id);
    if (d && rng.chance(0.35)) {
      const comp = statuteIn(state, 'workmensCompensation', cc(state));
      return void ctx.prompt({ type: 'industrialLife.disaster', icon: '🚨', title: `Disaster at ${me.place}`, text: `${DISASTER[me.id] ?? 'An accident at work.'} ${comp ? 'The families will get compensation, by law.' : 'There is no compensation: the families have only what the town collects.'}`, options: [
        { id: 'rescue', label: '⛑️ Go in with the rescue', hint: 'Dangerous; the town will remember' },
        { id: 'collect', label: '🎩 Organise the collection for the families', hint: 'A week\'s wages, and a lot of work' },
        { id: 'away', label: '🙈 Keep your head down', hint: 'You weren\'t on that shift' },
      ] });
    }
    // The trade closing in your town: the gates shut for good.
    if (me.jobs < -0.55 && me.job.sector === 'private' && rng.chance(0.25)) {
      il.closed = { year: y, industry: me.id };
      const name = me.job.employer?.name ?? me.place;
      leaveJob(ctx, `${name} closed`);
      ctx.stat('happiness', -6); ctx.stat('stress', 6);
      return void ctx.log(`${name} has closed for good. The last shift came out to a crowd at the gates; some of them had worked there forty years. ${townTrade(state)?.town === me.I.town ? `Without it this ${me.I.town} has nothing to live on.` : ''}`, '🔒', 'bad');
    }
    // New machines: the trade keeps its output and loses its people.
    const machines = (me.I.automates ?? []).length && me.jobs < -0.3 && me.jobs < (state.industry.c[cc(state)].health?.[0] ?? 0) + 0.5;
    if (machines && (il.machines ?? -99) < y - 8 && rng.chance(0.3)) {
      il.machines = y;
      return void ctx.prompt({ type: 'industrialLife.machines', icon: '🤖', title: 'The New Machines', text: `New machinery is going in at ${me.place}. It does the work of ten; the company wants volunteers for redundancy.`, options: [
        { id: 'take', label: '💵 Take the redundancy money', hint: 'Half a year\'s pay; out of work' },
        { id: 'retrain', label: '📚 Learn to run the new machines', hint: 'Night classes; you keep your place' },
        { id: 'hang', label: '🤞 Hang on and hope', hint: 'Last in, first out' },
      ] });
    }
    // A strike, lawful or not.
    const member = me.job.unionMember || state.unions?.mine;
    if (me.I.union >= 0.5 && (me.jobs < -0.25 || state.economy?.inflation > 0.06) && (il.strike ?? -99) < y - 5 && rng.chance(0.18 * me.I.union)) {
      il.strike = y;
      const lawful = unionsLawful(state);
      return void ctx.prompt({ type: 'industrialLife.strike', icon: '✊', title: lawful ? 'The Union Calls a Strike' : 'A Secret Combination', text: lawful
        ? `${me.jobs < -0.25 ? 'The owners want a wage cut and longer hours to see them through' : 'Prices have run away from wages'}. The ${member ? 'union' : 'men'} at ${me.place} vote to come out.`
        : `Organising is a crime here. Men meet at night in the back room of a pub to swear an oath and plan a stoppage. Informers are everywhere.`, data: { lawful }, options: [
        { id: 'out', label: lawful ? '✊ Come out with them' : '🤝 Take the oath', hint: lawful ? 'No pay till it ends; you may win' : 'Prison or transportation if you\'re caught' },
        { id: 'work', label: '🚶 Work on', hint: lawful ? 'Blackleg: they will remember' : 'Safe, and alone' },
      ] });
    }
    // Short time in a shrinking trade.
    if (me.jobs < -0.2 && (il.shortTime ?? -99) < y - 2 && rng.chance(0.35)) {
      il.shortTime = y;
      const lost = Math.round((me.job.salary ?? 0) * 0.15);
      if (lost > 0) { state.finances.cash -= lost; state.finances.ledger?.expenses?.push({ reason: 'Short time (pay lost)', amount: lost }); }
      ctx.stat('stress', 3);
      return void ctx.log(`Short time at ${me.place}: orders are down, and everyone loses a day a week. About ${Math.round(15)}% of the year's pay gone.`, '📉', 'warn');
    }
    // The company store, in a company town without lawful unions.
    const t = townTrade(state);
    if (t && t.id === me.id && me.I.kind === 'extract' && !unionsLawful(state) && (il.store ?? -99) < y - 6 && rng.chance(0.3)) {
      il.store = y;
      const cost = Math.round((me.job.salary ?? 0) * 0.04);
      if (cost > 0) state.finances.cash -= cost;
      ctx.log(`Part of your wages came in the company's own tokens, good only at the company store, where everything costs a quarter more. In a ${t.town} there is nowhere else to shop.`, '🏪', 'warn');
    }
  },
  resolvers: {
    disaster(ctx, data, optionId) {
      const { state } = ctx;
      const rng = rngOf(state);
      if (optionId === 'rescue') {
        ctx.stat('stress', 12);
        if (rng.chance(0.25)) { ctx.stat('health', -rng.int(8, 25)); return ctx.log('You went down with the rescue party. You brought two men out alive; the afterdamp nearly had you too. You were weeks recovering.', '⛑️', 'warn'); }
        ctx.stat('happiness', 3);
        return ctx.log('You went in with the rescue party, and came out with the living and the dead. The town will not forget who went down.', '⛑️', 'milestone');
      }
      if (optionId === 'collect') {
        const give = Math.round((state.career?.job?.salary ?? 0) / 52);
        if (give > 0) state.finances.cash -= give;
        ctx.stat('happiness', 2);
        return ctx.log('You went door to door with the collecting tin for the widows and orphans, and gave a week\'s wages yourself.', '🎩', 'info');
      }
      ctx.stat('stress', 4);
      ctx.log('You kept your head down. You went to the funerals; everyone did.', '🕯️', 'info');
    },
    machines(ctx, data, optionId) {
      const { state } = ctx;
      const job = state.career?.job;
      if (!job) return;
      if (optionId === 'take') {
        const pay = Math.round((job.salary ?? 0) * 0.5);
        if (pay > 0) ctx.earn(pay, 'Redundancy pay', {});
        leaveJob(ctx, 'took voluntary redundancy');
        return ctx.log('You took the redundancy money and walked out of the gate for the last time.', '💵', 'warn');
      }
      if (optionId === 'retrain') {
        ctx.stat('smarts', 2); ctx.stat('stress', 4);
        job.performance = Math.min(100, (job.performance ?? 60) + 8);
        (state.industrialLife ??= {}).retrained = true;
        return ctx.log('You went to night classes and learned the new machines. You are one of the ones they kept.', '📚', 'good');
      }
      job.performance = Math.max(0, (job.performance ?? 60) - 4);
      ctx.log('You hung on. Half the men around you went; nobody knows who goes next.', '🤞', 'warn');
    },
    strike(ctx, data, optionId) {
      const { state } = ctx;
      const rng = rngOf(state);
      const job = state.career?.job;
      if (optionId === 'work') {
        if (data.lawful) { ctx.stat('happiness', -4); return ctx.log('You worked on through the strike, walking in past the pickets. Some of them have not spoken to you since.', '🚶', 'warn'); }
        return ctx.log('You kept away from the meetings.', '🚶', 'info');
      }
      if (!data.lawful) {
        if (rng.chance(0.25)) {
          ctx.stat('stress', 15);
          return ctx.log('An informer gave your name. You were taken up for unlawful combination and swearing an oath; the magistrate made an example of you.', '⛓️', 'bad');
        }
        ctx.stat('happiness', 2);
        return ctx.log('You took the oath in the back room. The stoppage held a week; the masters gave way on the cut, and nobody was taken.', '🤝', 'good');
      }
      const weeks = rng.int(2, 14);
      const lost = Math.round(((job?.salary ?? 0) / 52) * weeks);
      if (lost > 0) state.finances.cash -= lost;
      const won = rng.chance(0.45);
      if (won && job) job.salary = Math.round(job.salary * 1.05);
      ctx.stat('stress', 6);
      ctx.log(`You were out ${weeks} weeks on strike: soup kitchens, picket lines, a hard winter. ${won ? 'The owners gave way: no cut, and a little more.' : 'In the end hunger sent you back on the old terms.'}`, '✊', won ? 'good' : 'warn');
    },
  },
};
