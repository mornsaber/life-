/**
 * Investment banking and finance: a pipeline of named deals — mergers,
 * IPOs, bond issues, buyouts — each moving from pitch to mandate,
 * diligence, signing and close, or dying along the way. Fees from closed
 * deals fill the bonus pool; bonus season pays your share. Pitch for new
 * mandates, pull all-nighters to push a deal over the line (your health
 * pays), and keep away from inside information.
 *
 * state.careerLife.deals = { professionId, pipeline: [{ id, name, kind, size, stage, heat }], closed: [{ name, kind, size, fee, age }], dead, fees, rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';

export const STAGES = ['Pitch', 'Mandate', 'Diligence', 'Signing', 'Closed'];
export const KINDS = {
  ma: { name: 'M&A advisory', icon: '🤝', fee: 0.012, size: [200, 4000] },
  ipo: { name: 'IPO', icon: '🔔', fee: 0.05, size: [150, 1500] },
  bond: { name: 'Bond issue', icon: '📜', fee: 0.006, size: [300, 3000] },
  lbo: { name: 'Leveraged buyout', icon: '🏦', fee: 0.02, size: [300, 2500] },
};
const COS = ['a software company', 'a hospital group', 'a regional bank', 'a retailer', 'a chemicals maker', 'a logistics firm', 'a media group', 'a utility', 'a biotech', 'a restaurant chain'];
const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

const DECK = [
  D('tip', '🤫', 'A Tip You Shouldn\'t Use', 'One of your deals will be announced Monday. Your brother-in-law could buy the target\'s stock.', [
    { id: 'silent', label: '🤐 Say nothing', text: 'Monday came. Your conscience is clean.', perf: 1 },
    { id: 'tip', label: '📞 Tip him off', tone: 'danger', text: 'He made a fortune.', offense: 'insiderTrading', offenseContext: 'tipping off a relative before a merger', discovery: 0.35 },
  ]),
  D('fairness', '📊', 'The Fairness Opinion', 'The client\'s CEO wants your valuation to come out at least 20% higher.', [
    { id: 'honest', label: '📐 Run it straight', text: 'The CEO grumbled. The deal held up when shareholders sued.', rep: 6 },
    { id: 'bend', label: '🎨 Find the assumptions that get there', text: 'Happy client.', perf: 3, risk: { chance: 0.25, text: 'Shareholder litigation pulled your model apart in court.', rep: -12, perf: -8 } },
  ]),
  D('poach', '📞', 'The Headhunter', 'A private-equity fund wants you. Better hours, carried interest, two-year lockups.', [
    { id: 'stay', label: '🏦 Stay for the MD track', text: 'You stayed.', perf: 1 },
    { id: 'listen', label: '👂 Take the meeting', text: 'An offer is on the table. Your MD heard and raised your number.', money: 20000, moneyLabel: 'Retention bonus' },
  ]),
];

const isDeals = (job) => engineKey(job) === 'finance';
const fresh = () => ({ pipeline: [], closed: [], dead: 0, fees: 0 });

export function dealsView(state) {
  const job = state.career.job;
  if (!isDeals(job)) return null;
  const rec = peekLife(state, 'deals');
  return { rec: rec?.professionId === job.professionId ? rec : null };
}

function newDeal(rng, state) {
  const kind = rng.pick(Object.keys(KINDS));
  const k = KINDS[kind];
  return { id: `d${state.character.age}.${rng.int(0, 99999)}`, name: `${k.name === 'IPO' ? 'the IPO of' : k.name === 'Bond issue' ? 'a bond deal for' : k.name === 'Leveraged buyout' ? 'the buyout of' : 'the sale of'} ${rng.pick(COS)}`, kind, size: rng.int(...k.size), stage: 0, heat: 0 };
}

/** Advance a deal one stage, or kill it. */
function advance(ctx, rec, d, push = 0) {
  const { state, rng } = ctx;
  const sk = skill(state, { smarts: 3, health: 1 });
  const odds = clamp(0.5 + (sk - 50) / 150 + push + (state.economy?.phase === 'recession' ? -0.15 : 0), 0.2, 0.92);
  if (rng.chance(odds)) d.stage += 1;
  else if (rng.chance(0.4)) return 'dead';
  return d.stage >= 4 ? 'closed' : 'open';
}

export const DealsModule = {
  id: 'deals',
  order: 31.52,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!isDeals(job) || !job.paidThisYear || state.legal.incarceration) return;
    const rec = lifeOf(state, 'deals', job.professionId, fresh());
    while (rec.pipeline.length < 3) rec.pipeline.push(newDeal(rng, state));
    let fees = 0;
    const done = [];
    for (const d of rec.pipeline) {
      const r = d.stage >= 4 ? 'closed' : advance(ctx, rec, d);
      if (r === 'closed') {
        const fee = Math.round(d.size * 1e6 * KINDS[d.kind].fee);
        fees += fee;
        rec.closed = [{ name: d.name, kind: d.kind, size: d.size, fee, age: state.character.age }, ...rec.closed].slice(0, 12);
        ctx.log(`Closed: ${d.name} — a $${d.size.toLocaleString()} million ${KINDS[d.kind].name.toLowerCase()}. $${(fee / 1e6).toFixed(1)}M in fees.`, KINDS[d.kind].icon, 'good');
        done.push(d);
      } else if (r === 'dead') {
        rec.dead += 1;
        ctx.log(`${d.name.replace(/^./, (c) => c.toUpperCase())} died in ${STAGES[d.stage].toLowerCase()}.`, '💀', 'warn');
        done.push(d);
      }
    }
    rec.pipeline = rec.pipeline.filter((d) => !done.includes(d));
    rec.fees += fees;
    // Bonus season: your share of the pool depends on seniority and the year.
    const share = { analyst: 0.002, associate: 0.004, vp: 0.006, director: 0.008, md: 0.012, groupHead: 0.015, pm: 0.006, cio: 0.01 }[job.levelId] ?? 0.004;
    const bonus = Math.round(Math.min(job.salary * 3, job.salary * 0.2 + fees * share) / 1000) * 1000;
    ctx.earn(bonus, 'Year-end bonus', { wage: true });
    ctx.log(`Bonus season: $${bonus.toLocaleString()}${fees ? ` on $${(fees / 1e6).toFixed(1)}M of fees` : ' in a dry year'}.`, '💰', fees ? 'good' : undefined);
    job.performance = Math.round(clamp(job.performance + (fees ? 4 : -4), 0, 100));
    rec.rep = Math.round(clamp(rec.rep + (fees ? 3 : -2), 0, 100));
    ctx.stat('stress', 6);
    if (rng.chance(0.5) && !state.prompts.some((p) => p.type === 'deals.event')) {
      const d = rng.pick(DECK);
      ctx.prompt({ type: 'deals.event', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id } });
    }
  },
  actions: {
    /** Pitch for a new mandate. */
    pitch(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!isDeals(job)) return;
      if (yearlyCount(state, 'deals.pitch')) return ctx.toast('One big pitch a year', 'warn');
      bumpYearly(state, 'deals.pitch');
      const rec = lifeOf(state, 'deals', job.professionId, fresh());
      ctx.stat('stress', 4);
      if (rng.chance(0.35 + skill(state, { smarts: 2, looks: 1 }) / 200)) {
        const d = newDeal(rng, state);
        d.stage = 1;
        rec.pipeline.push(d);
        ctx.log(`Your pitch book won the mandate for ${d.name}.`, '📑', 'good');
      } else ctx.log('Three weeks on a pitch book. The client went with another bank.', '📑', 'warn');
      return undefined;
    },
    /** Pull all-nighters on one deal. arg: deal id */
    push(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const rec = peekLife(state, 'deals');
      const d = rec?.pipeline.find((x) => x.id === id);
      if (!isDeals(job) || !d) return;
      if (yearlyCount(state, 'deals.push') >= 2) return ctx.toast('Two all-nighter sprints a year is already too many', 'warn');
      bumpYearly(state, 'deals.push');
      ctx.stat('health', -3);
      ctx.stat('stress', 6);
      const r = advance(ctx, rec, d, 0.2);
      if (r === 'dead') { rec.pipeline = rec.pipeline.filter((x) => x !== d); rec.dead += 1; ctx.log(`You pushed ${d.name} too hard and the other side walked.`, '💀', 'warn'); } else ctx.log(`A week of all-nighters on ${d.name}: ${d.stage >= 4 ? 'signed — it closes at year end' : `now at ${STAGES[d.stage].toLowerCase()}`}.`, '🌙');
      return undefined;
    },
  },
  resolvers: {
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const d = DECK.find((x) => x.id === data.deckId);
      if (!d || !isDeals(job)) return;
      resolveOption(ctx, lifeOf(ctx.state, 'deals', job.professionId, fresh()), d.options.find((o) => o.id === optionId), d.icon, { smarts: 3 });
    },
  },
};
