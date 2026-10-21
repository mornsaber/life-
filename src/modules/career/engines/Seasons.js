/**
 * Season careers: the year is a season. You choose how to prepare — which
 * fishery, which crop, how hard to train, how long a contract — the season
 * rolls out with weather, markets and injuries, and the result pays on top
 * of your base.
 *
 *   commercial fishing · farm & ranch · professional sports · cruise ships
 *
 * state.careerLife.seasonWork = { professionId, plan, seasons: [{ age, plan, result, pay, tier }], best, rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';

const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

/**
 * plans: { id: { name, icon, desc, edge (score ±), spread (luck), pay (share mult), injury, stress, health } }
 * tiers: best first, [minScore, label, payMult, tone]
 */
export const SEASON_CAREERS = {
  fishing: {
    label: 'The Season', icon: '🎣', weights: { fitness: 2, smarts: 1 }, payLabel: 'Crew share of the catch',
    plans: {
      groundfish: { name: 'Groundfish & longline', icon: '🐟', desc: 'Steady trips close to home. Smaller shares, fewer surprises.', edge: 5, spread: 15, pay: 0.6, injury: 0.03, stress: 2 },
      salmon: { name: 'Salmon season', icon: '🐠', desc: 'A short, frantic season. Good years are very good.', edge: 0, spread: 25, pay: 0.9, injury: 0.05, stress: 4 },
      crab: { name: 'Bering Sea crab', icon: '🦀', desc: 'The most dangerous fishery there is. One season can pay for a year.', edge: -5, spread: 35, pay: 1.6, injury: 0.12, stress: 9 },
    },
    tiers: [[85, 'a record season', 1.0, 'good'], [65, 'a good season', 0.55, 'good'], [45, 'an average season', 0.3], [25, 'a poor season', 0.08, 'warn'], [-999, 'a bust — the fish never showed', 0, 'warn']],
    deck: [
      D('storm', '🌊', 'Weather Coming', 'A storm is building and the pots are still in the water. The skipper asks what you think.', [
        { id: 'pull', label: '⚓ Pull the gear and run for port', text: 'You lost three days of fishing. Everyone came home.', perf: 1, rep: 2 },
        { id: 'stay', label: '🎲 Keep working the gear', check: 55, text: 'You beat the weather with a full hold.', perf: 4, money: 4000, moneyLabel: 'Extra share', fail: { text: 'A wave took the deck. Somebody was hurt.', injury: 0.6, trauma: 6, stress: 6 } },
      ]),
      D('greenhorn', '🧑‍🦱', 'The New Guy', 'A greenhorn froze on deck and nearly went over the rail.', [
        { id: 'teach', label: '🤝 Take him under your wing', text: 'By the end of the season he was useful. The skipper noticed.', perf: 3, rep: 4 },
        { id: 'report', label: '📢 Tell the skipper he\'s dangerous', text: 'He was put ashore at the next port.', perf: 1 },
      ]),
      D('boat', '🚤', 'A Boat for Sale', 'An old skipper is retiring and wants you to buy his boat and permits.', [
        { id: 'pass', label: '🙅 Not this year', text: 'Somebody else bought her.' },
        { id: 'think', label: '📝 Ask about financing', text: 'The bank laughed. Owning a boat is a long way off, but you know the price now.', rep: 1 },
      ]),
    ],
  },
  agriculture: {
    label: 'The Growing Season', icon: '🌾', weights: { fitness: 1, smarts: 2 }, payLabel: 'Harvest bonus',
    plans: {
      grain: { name: 'Corn & soybeans', icon: '🌽', desc: 'Commodity crops: crop insurance takes the edge off bad years.', edge: 5, spread: 15, pay: 0.45, injury: 0.03, stress: 2 },
      specialty: { name: 'Specialty crops', icon: '🍓', desc: 'Berries, vegetables, orchards: more labour, more risk, better prices.', edge: 0, spread: 28, pay: 0.8, injury: 0.04, stress: 5 },
      livestock: { name: 'Cattle & dairy', icon: '🐄', desc: 'Every day of the year, and the herd is the bank account.', edge: 2, spread: 20, pay: 0.6, injury: 0.06, stress: 4 },
    },
    tiers: [[85, 'a bumper year', 0.9, 'good'], [65, 'a good year', 0.5, 'good'], [45, 'an ordinary year', 0.25], [25, 'drought cut the yield', 0.05, 'warn'], [-999, 'hail flattened the crop', 0, 'warn']],
    deck: [
      D('rain', '🌧️', 'Planting Window', 'The ground is still wet and the planting window is closing.', [
        { id: 'wait', label: '⏳ Wait for it to dry', check: 45, text: 'It dried out in time and the stand came up even.', perf: 3, fail: { text: 'You waited too long; the yield suffered.', perf: -2 } },
        { id: 'mud', label: '🚜 Plant in the mud', text: 'Compaction will cost you, but the seed is in.', perf: 1 },
      ]),
      D('calving', '🐮', 'A Hard Calving', 'A heifer is in trouble at 2 a.m. and the vet is an hour away.', [
        { id: 'pull', label: '🧤 Pull the calf yourself', check: 50, text: 'Cow and calf both made it.', perf: 4, rep: 4, fail: { text: 'You lost the calf. The cow survived.', happiness: -3 } },
        { id: 'vet', label: '📞 Wait for the vet', text: 'The vet saved the cow. The bill was steep.', cost: 400, costLabel: 'Emergency vet call' },
      ]),
      D('subsidy', '📋', 'The Paperwork', 'A conservation program will pay to retire a wet field — if the paperwork is done right.', [
        { id: 'do', label: '🖊️ Do it properly', text: 'Approved. A small, steady payment.', money: 2500, moneyLabel: 'Conservation program payment' },
        { id: 'fudge', label: '✏️ Fudge the acreage', tone: 'danger', text: 'A bigger payment.', money: 6000, moneyLabel: 'Conservation program payment', offense: 'falseStatement', offenseContext: 'overstating acreage on a farm program application', discovery: 0.25 },
      ]),
    ],
  },
  athletics: {
    label: 'The Season', icon: '🏆', weights: { fitness: 3, health: 1 }, payLabel: 'Performance bonuses',
    plans: {
      smart: { name: 'Train smart', icon: '🧘', desc: 'Sports science, sleep and load management.', edge: 3, spread: 20, pay: 0.4, injury: 0.08, stress: 3 },
      grind: { name: 'Offseason grind', icon: '🏋️', desc: 'Two-a-days all summer. You\'ll be better — if your body holds.', edge: 10, spread: 22, pay: 0.5, injury: 0.18, stress: 6, health: -2 },
      recover: { name: 'Rest and recover', icon: '🛌', desc: 'Let the body heal. A step slower, much less likely to break.', edge: -6, spread: 18, pay: 0.35, injury: 0.03, stress: 0, health: 3 },
    },
    tiers: [[88, 'an MVP-calibre season', 1.2, 'good'], [70, 'an all-star season', 0.7, 'good'], [48, 'a solid season', 0.3], [28, 'a down year', 0, 'warn'], [-999, 'a season you\'d rather forget', 0, 'warn']],
    deck: [
      D('hurt', '🩹', 'Play Through It?', 'Your hamstring is tight before a playoff game. The trainer says it\'s your call.', [
        { id: 'sit', label: '🪑 Sit it out', text: 'The team lost without you. You were back healthy a week later.', perf: -1 },
        { id: 'play', label: '💪 Play', check: 55, text: 'You played the game of your life.', perf: 6, rep: 6, fail: { text: 'It tore in the second half. Months of rehab.', injury: 1, perf: -4 } },
      ]),
      D('contract', '✍️', 'Contract Year', 'Your agent says a big season now means a big contract — or you could sign an extension today.', [
        { id: 'extend', label: '🖊️ Take the extension', text: 'Security. You may have left money on the table.', money: 25000, moneyLabel: 'Signing bonus', stress: -4 },
        { id: 'bet', label: '🎲 Bet on yourself', check: 60, text: 'A monster season. Teams lined up.', perf: 8, money: 80000, moneyLabel: 'New contract signing bonus', fail: { text: 'An ordinary year and an ordinary offer.', stress: 4 } },
      ]),
      D('pills', '💊', 'Something to Help', 'A teammate offers you something that "won\'t show up on the test."', [
        { id: 'no', label: '🙅 No thanks', text: 'You stayed clean.' },
        { id: 'yes', label: '💉 Take it', tone: 'danger', text: 'You felt unstoppable.', perf: 6, health: -4, risk: { chance: 0.35, text: 'You failed a drug test. An 80-game suspension and your name in every headline.', perf: -25, rep: -25, happiness: -12 } },
      ]),
      D('community', '🏟️', 'The Community Night', 'The team asks you to host a youth clinic on your day off.', [
        { id: 'go', label: '⚽ Show up', text: 'The kids were thrilled. So was the PR department.', rep: 6, happiness: 3 },
        { id: 'skip', label: '😴 Rest', text: 'You rested.' },
      ]),
    ],
    champion: { id: 'sport.champion', name: 'League Champion', icon: '🏆' },
  },
  cruise: {
    label: 'Your Contracts', icon: '🛳️', weights: { looks: 1, happiness: 2 }, payLabel: 'Contract-end bonus',
    plans: {
      short: { name: 'Short contracts', icon: '🗓️', desc: 'Four months on, more time ashore.', edge: 0, spread: 15, pay: 0.1, injury: 0, stress: 1, happiness: 3 },
      standard: { name: 'Standard contracts', icon: '🛳️', desc: 'Seven or eight months at sea, two at home.', edge: 2, spread: 15, pay: 0.2, injury: 0.01, stress: 3 },
      backToBack: { name: 'Back-to-back', icon: '🌊', desc: 'Sign on again straight away. More money, less of a life.', edge: 4, spread: 15, pay: 0.35, injury: 0.02, stress: 7, happiness: -3 },
    },
    tiers: [[80, 'top guest ratings all contract', 1.0, 'good'], [55, 'good guest ratings', 0.5, 'good'], [35, 'an ordinary contract', 0.2], [-999, 'complaints from guests', 0, 'warn']],
    deck: [
      D('medevac', '🚁', 'A Guest Collapses', 'A guest collapses in your section two days from port.', [
        { id: 'help', label: '🩺 Run for the medical team and start CPR', check: 45, text: 'The guest was airlifted and survived. The captain thanked you.', rep: 6, perf: 4, fail: { text: 'You did everything right. He didn\'t make it.', trauma: 4 } },
      ]),
      D('norovirus', '🦠', 'Norovirus Outbreak', 'Half the ship is sick and the crew is on double shifts of disinfecting.', [
        { id: 'work', label: '🧽 Work the doubles', text: 'Exhausting. The outbreak was over in a week.', perf: 3, stress: 5 },
      ]),
      D('crewbar', '🍻', 'The Crew Bar', 'A party in the crew bar is getting out of hand the night before inspection.', [
        { id: 'leave', label: '🛏️ Go to bed', text: 'Inspection went fine.' },
        { id: 'stay', label: '🎉 Stay till close', text: 'A great night.', happiness: 4, risk: { chance: 0.25, text: 'You were written up for being late to muster.', perf: -5 } },
      ]),
    ],
  },
};

const config = (job) => SEASON_CAREERS[engineKey(job)];
const fresh = (cfg) => ({ plan: Object.keys(cfg.plans)[0], seasons: [], best: null });

export function seasonView(state) {
  const cfg = config(state.career.job);
  if (!cfg) return null;
  const rec = peekLife(state, 'seasonWork');
  return { cfg, rec: rec?.professionId === state.career.job.professionId ? rec : null };
}

export const SeasonWorkModule = {
  id: 'seasonWork',
  order: 31.6,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || state.legal.incarceration) return;
    const rec = lifeOf(state, 'seasonWork', job.professionId, fresh(cfg));
    const plan = cfg.plans[rec.plan] ?? Object.values(cfg.plans)[0];
    const sk = skill(state, cfg.weights);
    let score = Math.round(sk + plan.edge + rng.int(-plan.spread, plan.spread));
    const injured = rng.chance(plan.injury);
    if (injured) {
      score -= 30;
      ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) });
    }
    const [, result, mult, tone] = cfg.tiers.find(([min]) => score >= min);
    const pay = Math.round(job.salary * plan.pay * mult / 100) * 100;
    if (pay) ctx.earn(pay, cfg.payLabel, { wage: true });
    ctx.stat('stress', plan.stress);
    if (plan.health) ctx.stat('health', plan.health);
    if (plan.happiness) ctx.stat('happiness', plan.happiness);
    const tier = cfg.tiers.findIndex(([min]) => score >= min);
    job.performance = Math.round(clamp(job.performance + (2 - tier) * 3, 0, 100));
    rec.rep = Math.round(clamp(rec.rep + (2 - tier) * 2, 0, 100));
    if (tier >= cfg.tiers.length - 1) ctx.stat('happiness', -4);
    rec.seasons = [{ age: state.character.age, plan: rec.plan, result, pay, tier }, ...rec.seasons].slice(0, 12);
    if (!rec.best || tier < rec.best.tier || (tier === rec.best.tier && pay > rec.best.pay)) rec.best = { age: state.character.age, result, pay, tier };
    ctx.log(`${cfg.icon} ${plan.name}: ${result}${injured ? ', cut short by an injury' : ''}${pay ? ` — $${pay.toLocaleString()} ${cfg.payLabel.toLowerCase()}` : ''}.`, cfg.icon, tone);
    if (cfg.champion && tier <= 1 && rng.chance(0.12)) {
      ctx.log('Your team won the championship. A parade, a ring, and a night you\'ll never forget.', '🏆', 'good');
      applyFx(ctx, rec, { honor: cfg.champion, rep: 10, happiness: 10, money: Math.round(job.salary * 0.15 / 100) * 100, moneyLabel: 'Playoff share' });
    }
    if (cfg.deck?.length && rng.chance(0.6) && !state.prompts.some((x) => x.type === 'seasonWork.event')) {
      const d = rng.pick(cfg.deck);
      ctx.prompt({ type: 'seasonWork.event', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id, professionId: engineKey(job) } });
    }
  },
  actions: {
    /** arg: a plan id for this career */
    plan(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      if (!cfg?.plans[id]) return;
      if (yearlyCount(state, 'seasonWork.plan')) return ctx.toast('You plan the season once a year.', 'warn');
      bumpYearly(state, 'seasonWork.plan');
      lifeOf(state, 'seasonWork', job.professionId, fresh(cfg)).plan = id;
      ctx.log(`Next season: ${cfg.plans[id].name.toLowerCase()}. ${cfg.plans[id].desc}`, cfg.plans[id].icon);
      return undefined;
    },
  },
  resolvers: {
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = SEASON_CAREERS[data.professionId];
      const d = cfg?.deck?.find((x) => x.id === data.deckId);
      if (!d || !job) return;
      resolveOption(ctx, lifeOf(ctx.state, 'seasonWork', job.professionId, fresh(cfg)), d.options.find((o) => o.id === optionId), d.icon, cfg.weights);
    },
  },
};
