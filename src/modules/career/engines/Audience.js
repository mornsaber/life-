/**
 * Audience careers: you have a following, and it grows or shrinks with what
 * you put out. Set a pace (rest, steady, grind) — grind grows faster and
 * burns you out — and once a year put out something big: a video, an album,
 * a role, an investigation. It can be a hit, a flop or a controversy.
 * Sponsors and streams pay by the size of the following.
 *
 *   content creation · music · acting · journalism
 *
 * state.careerLife.audience = { professionId, fans, pace, burnout, releases: [{ name, kind, reception, age, fans }], peak, rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';

export const PACE = {
  rest: { name: 'Take it easy', icon: '🌿', growth: -0.05, burnout: -25, stress: -3, desc: 'Recharge. The audience drifts a little.' },
  steady: { name: 'Steady', icon: '📅', growth: 0.08, burnout: 6, stress: 2, desc: 'A sustainable rhythm.' },
  grind: { name: 'Grind', icon: '🔥', growth: 0.22, burnout: 22, stress: 7, desc: 'Post everything, say yes to everything. Burnout builds fast.' },
};

const pick = (rng, a) => rng.pick(a);
const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

/**
 * releases: { id: { name, icon, desc, check, boost (fans ×), floor (fans +), risk (controversy chance), cost } }
 * perFan: yearly income per fan; start: starting fans; ceiling: where growth levels off (only a few ever get near it)
 */
export const AUDIENCE_CAREERS = {
  contentCreator: {
    label: 'Your Channel', icon: '📹', noun: 'followers', weights: { looks: 1, happiness: 1, smarts: 1 }, perFan: 0.04, start: 800, ceiling: 3000000, payLabel: 'Ad revenue & sponsorships',
    releases: {
      series: { name: 'A new series', icon: '🎞️', desc: 'Weeks of work on something ambitious.', check: 55, boost: 1.6, floor: 5000, risk: 0.04, cost: 3000 },
      collab: { name: 'A collab with a bigger creator', icon: '🤝', desc: 'Borrow their audience.', check: 45, boost: 1.4, floor: 8000, risk: 0.06 },
      hotTake: { name: 'A spicy hot take', icon: '🌶️', desc: 'Engagement is engagement — until it isn\'t.', check: 40, boost: 1.8, floor: 10000, risk: 0.3 },
    },
    name: (rng) => `"${pick(rng, ['I Tried', 'Living on', 'Ranking Every', '24 Hours in', 'The Truth About', 'Building a'])} ${pick(rng, ['$1 a Day', 'Fast Food', 'a Tiny House', 'My Hometown', 'Gas Station Sushi', 'a Mountain Cabin'])}"`,
    hit: 'went viral', milestone: { at: 1000000, honor: { id: 'creator.million', name: 'Million-Follower Plaque', icon: '🥇' } },
    deck: [
      D('sponsor', '💰', 'A Sketchy Sponsor', 'A crypto casino offers $20,000 for a sixty-second read.', [
        { id: 'decline', label: '🙅 Pass', text: 'Your audience trusts you a bit more for it.', rep: 4 },
        { id: 'take', label: '💵 Take the money', text: 'Easy money.', money: 20000, moneyLabel: 'Sponsorship', risk: { chance: 0.35, text: 'The casino collapsed and your followers blamed you.', rep: -12 } },
      ]),
      D('troll', '😡', 'The Hate Thread', 'A forum has decided to hate you this week.', [
        { id: 'ignore', label: '🔕 Log off for a while', text: 'It blew over.', stress: -2 },
        { id: 'respond', label: '🎥 Make a response video', check: 55, text: 'Your response was funny and it went over well.', rep: 6, fail: { text: 'You fed it. It got worse.', stress: 8, rep: -4 } },
      ]),
      D('algo', '📉', 'The Algorithm Changed', 'Views fell off a cliff overnight. Everyone is scrambling.', [
        { id: 'adapt', label: '🧪 Experiment with new formats', check: 50, text: 'You found what works now before anyone else.', rep: 6, perf: 4, fail: { text: 'Nothing stuck this year.', stress: 5 } },
        { id: 'wait', label: '⏳ Keep doing what you do', text: 'It came back, slowly.', stress: 2 },
      ]),
    ],
  },
  music: {
    label: 'Your Music', icon: '🎵', noun: 'fans', weights: { happiness: 2, looks: 1 }, perFan: 0.06, start: 300, ceiling: 2500000, payLabel: 'Streaming, gigs & merch',
    releases: {
      single: { name: 'Release a single', icon: '🎶', desc: 'Quick and cheap. Most sink without a trace.', check: 45, boost: 1.3, floor: 1500, risk: 0.02 },
      album: { name: 'Record an album', icon: '💿', desc: 'A year of your life and real studio money.', check: 60, boost: 2.0, floor: 6000, risk: 0.03, cost: 12000 },
      tour: { name: 'Go on tour', icon: '🚐', desc: 'Win fans one room at a time. Hard on the body.', check: 45, boost: 1.4, floor: 3000, risk: 0.05, stress: 8, money: 0.3 },
    },
    name: (rng) => `"${pick(rng, ['Midnight', 'Paper', 'Golden', 'Static', 'Wildflower', 'Neon'])} ${pick(rng, ['Hearts', 'Highway', 'Summer', 'Ghosts', 'Radio', 'Rain'])}"`,
    hit: 'charted', milestone: { at: 500000, honor: { id: 'music.gold', name: 'Gold Record', icon: '📀' } },
    award: { id: 'music.award', name: 'Major Music Award', icon: '🎙️' },
    deck: [
      D('label', '📝', 'The Label Deal', 'A major label wants to sign you: an advance, real marketing, and they own your masters.', [
        { id: 'sign', label: '✍️ Sign', text: 'The advance was more money than you\'d ever seen.', money: 40000, moneyLabel: 'Record-deal advance', perf: 4 },
        { id: 'indie', label: '🎸 Stay independent', text: 'Smaller, but every song is yours.', rep: 6 },
      ]),
      D('cover', '🎤', 'Your Song, Their Hit', 'A big star wants to cover your song.', [
        { id: 'yes', label: '👍 Say yes', text: 'The royalties were lovely.', money: 15000, moneyLabel: 'Songwriting royalties', rep: 4 },
      ]),
      D('afterparty', '🍾', 'The Afterparty', 'Someone is passing around something stronger than champagne.', [
        { id: 'leave', label: '🚪 Head back to the hotel', text: 'You were fresh for the next show.' },
        { id: 'stay', label: '🎉 Stay', text: 'A blur.', happiness: 4, health: -3, offense: 'drugPossession', offenseContext: 'drugs at an afterparty', discovery: 0.1 },
      ]),
    ],
  },
  acting: {
    label: 'Your Career on Screen', icon: '🎬', noun: 'fans', weights: { looks: 2, happiness: 1 }, perFan: 0.015, start: 100, ceiling: 2000000, payLabel: 'Residuals & appearances',
    releases: {
      indie: { name: 'An indie film', icon: '🎥', desc: 'Little money, real acting. Festivals love them.', check: 50, boost: 1.4, floor: 2000, risk: 0.02 },
      blockbuster: { name: 'Audition for a blockbuster', icon: '🦸', desc: 'A long shot at a role millions will see.', check: 70, boost: 3.0, floor: 50000, risk: 0.03 },
      stage: { name: 'A stage play', icon: '🎭', desc: 'Eight shows a week. Critics take you seriously.', check: 45, boost: 1.2, floor: 800, risk: 0.01, stress: 5 },
    },
    name: (rng) => `"${pick(rng, ['The Long', 'A Quiet', 'Return to', 'Last Night in', 'The House on', 'Beyond'])} ${pick(rng, ['Winter', 'Harbor', 'Avalon', 'Maple Street', 'the Pines', 'Tomorrow'])}"`,
    hit: 'was a hit', milestone: { at: 2000000, honor: { id: 'acting.walk', name: 'A Star on the Walk of Fame', icon: '⭐' } },
    award: { id: 'acting.award', name: 'Major Acting Award', icon: '🏆' },
    deck: [
      D('typecast', '🎭', 'Typecast', 'You\'ve been offered the same kind of role for the fourth time. It pays well.', [
        { id: 'take', label: '💵 Take it', text: 'Good money, same character.', money: 15000, moneyLabel: 'Role fee', rep: -2 },
        { id: 'stretch', label: '🎨 Hold out for something different', check: 55, text: 'A director took a chance on you. Critics noticed.', rep: 8, perf: 4, fail: { text: 'A lean year waiting.', stress: 5 } },
      ]),
      D('director', '😠', 'The Director', 'A powerful director makes an inappropriate suggestion in a private meeting.', [
        { id: 'leave', label: '🚪 Walk out', text: 'You didn\'t get the part. You kept your dignity.', rep: 2 },
        { id: 'report', label: '📢 Go public', check: 50, text: 'Others came forward too. He was finished.', rep: 10, stress: 8, fail: { text: 'He had better lawyers. You were quietly blacklisted for a while.', rep: -8, stress: 10 } },
      ]),
    ],
  },
  journalism: {
    label: 'Your Byline', icon: '📰', noun: 'readers', weights: { smarts: 3 }, perFan: 0, start: 2000, ceiling: 400000, payLabel: '',
    releases: {
      investigation: { name: 'A months-long investigation', icon: '🔍', desc: 'Documents, sources, lawyers. It could change things.', check: 60, boost: 1.8, floor: 20000, risk: 0.1 },
      feature: { name: 'A long feature', icon: '📝', desc: 'A story people will remember.', check: 45, boost: 1.3, floor: 5000, risk: 0.02 },
      scoop: { name: 'Chase a scoop', icon: '⚡', desc: 'First is everything. Wrong is worse.', check: 50, boost: 1.5, floor: 10000, risk: 0.15 },
    },
    name: (rng) => `${pick(rng, ['the city contracts', 'the nursing-home', 'the police overtime', 'the water', 'the school-board', 'the pension'])} ${pick(rng, ['scandal', 'story', 'investigation', 'exposé'])}`,
    hit: 'made national news', award: { id: 'journalism.pulitzer', name: 'Pulitzer Prize', icon: '🏅' },
    deck: [
      D('source', '🤫', 'Protect the Source', 'A prosecutor subpoenas you to name a confidential source.', [
        { id: 'refuse', label: '🙅 Refuse', check: 50, text: 'The subpoena was quashed. Sources trust you more than ever.', rep: 10, fail: { text: 'A judge held you in contempt. A few nights in jail and a lot of support from colleagues.', rep: 6, stress: 10 } },
        { id: 'name', label: '📛 Name the source', text: 'You kept out of trouble. Nobody will tell you anything again.', rep: -20 },
      ]),
      D('lawsuit', '⚖️', 'A Libel Threat', 'A businessman you wrote about threatens to sue.', [
        { id: 'stand', label: '📑 Stand by the story', check: 45, text: 'Your notes held up. The suit went nowhere.', rep: 6, fail: { text: 'You got one detail wrong. A correction and a settlement.', rep: -6, perf: -4 } },
        { id: 'retract', label: '↩️ Retract', text: 'The story disappeared.', rep: -8 },
      ]),
      D('layoffs', '📉', 'Layoffs in the Newsroom', 'The paper is cutting a third of the staff. Your editor asks you to take a buyout.', [
        { id: 'stay', label: '🪑 Stay and fight for your job', text: 'You survived the cut. Fewer colleagues, more work.', stress: 6 },
        { id: 'buyout', label: '💵 Take the buyout', text: 'Six months\' pay and a goodbye party.', money: 25000, moneyLabel: 'Newsroom buyout', fired: 'Took a newsroom buyout' },
      ]),
    ],
  },
};

const config = (job) => AUDIENCE_CAREERS[engineKey(job)];
const fresh = (cfg) => ({ income: 0, fans: cfg.start, pace: 'steady', burnout: 0, releases: [], peak: cfg.start });
/** 12,345 → "12.3K" */
export const fansLabel = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(n);

export function audienceView(state) {
  const cfg = config(state.career.job);
  if (!cfg) return null;
  const rec = peekLife(state, 'audience');
  return { cfg, rec: rec?.professionId === state.career.job.professionId ? rec : null };
}

/** Add followers, slowing as the audience nears the ceiling. */
const grow = (cfg, rec, gain) => { rec.fans = Math.max(0, Math.round(rec.fans + (gain > 0 ? gain * Math.max(0.02, 1 - rec.fans / cfg.ceiling) : gain))); };

function milestone(ctx, cfg, rec) {
  if (cfg.milestone && rec.fans >= cfg.milestone.at) applyFx(ctx, rec, { honor: cfg.milestone.honor });
  rec.peak = Math.max(rec.peak, rec.fans);
}

export const AudienceModule = {
  id: 'audience',
  order: 31.7,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || state.legal.incarceration) return;
    const rec = lifeOf(state, 'audience', job.professionId, fresh(cfg));
    const pace = PACE[rec.pace] ?? PACE.steady;
    const sk = skill(state, cfg.weights);
    // The following drifts with your pace, your work and your reputation.
    const growth = pace.growth + (sk - 50) / 400 + (rec.rep - 50) / 500 + rng.float(-0.05, 0.05);
    grow(cfg, rec, rec.fans * growth + (rec.pace === 'rest' ? 0 : sk * 4));
    rec.burnout = Math.round(clamp(rec.burnout + pace.burnout, 0, 100));
    ctx.stat('stress', pace.stress);
    if (rec.burnout >= 85) {
      rec.burnout = 40;
      rec.pace = 'rest';
      rec.fans = Math.round(rec.fans * 0.85);
      ctx.stat('happiness', -8);
      ctx.log(`Burnout caught up with you. You stepped away for months and some of your ${cfg.noun} moved on.`, '🫠', 'warn');
    }
    milestone(ctx, cfg, rec);
    // Sponsors, streams and residuals scale with the audience (capped well above a salary).
    const income = Math.round(Math.min(rec.fans * cfg.perFan, job.salary * 6) / 100) * 100;
    rec.income = income >= 100 ? income : 0;
    if (rec.income) ctx.earn(income, cfg.payLabel, { wage: true });
    if (cfg.deck?.length && rng.chance(0.55) && !state.prompts.some((x) => x.type === 'audience.event')) {
      const d = rng.pick(cfg.deck);
      ctx.prompt({ type: 'audience.event', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id, professionId: engineKey(job) } });
    }
  },
  actions: {
    /** arg: rest | steady | grind */
    pace(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      if (!cfg || !PACE[id]) return;
      if (yearlyCount(state, 'audience.pace')) return ctx.toast('You set your pace once a year.', 'warn');
      bumpYearly(state, 'audience.pace');
      lifeOf(state, 'audience', job.professionId, fresh(cfg)).pace = id;
      ctx.log(`New pace: ${PACE[id].name.toLowerCase()}. ${PACE[id].desc}`, PACE[id].icon);
      return undefined;
    },
    /** arg: a release kind for this career — one a year */
    release(ctx, kind) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      const r = cfg?.releases[kind];
      if (!r) return;
      if (yearlyCount(state, 'audience.release')) return ctx.toast('One big release a year.', 'warn');
      bumpYearly(state, 'audience.release');
      const rec = lifeOf(state, 'audience', job.professionId, fresh(cfg));
      if (r.cost) ctx.spend(r.cost, `${r.name} — production costs`, { allowDebt: true });
      if (r.stress) ctx.stat('stress', r.stress);
      const name = cfg.name(rng);
      const score = skill(state, cfg.weights) + (rec.rep - 50) / 8 + rng.int(-25, 25) - rec.burnout / 10;
      let reception;
      if (rng.chance(r.risk)) {
        reception = 'controversy';
        rec.fans = Math.round(rec.fans * 0.8);
        applyFx(ctx, rec, { text: `${name} blew up — for the wrong reasons. A backlash, a lost sponsor and an apology nobody accepted.`, rep: -12, perf: -6, stress: 10, happiness: -6 }, '🔥');
      } else if (score >= r.check + 22) {
        reception = 'hit';
        grow(cfg, rec, rec.fans * (r.boost - 1) + r.floor * 2);
        applyFx(ctx, rec, { text: `${name} ${cfg.hit}. Your ${cfg.noun} surged.`, rep: 10, perf: 8, happiness: 8 }, '🚀');
        if (cfg.award && rng.chance(0.15)) applyFx(ctx, rec, { text: `You won the ${cfg.award.name.toLowerCase()} for ${name}.`, honor: cfg.award, rep: 10 }, cfg.award.icon);
      } else if (score >= r.check) {
        reception = 'well received';
        grow(cfg, rec, rec.fans * (r.boost - 1) / 2 + r.floor);
        applyFx(ctx, rec, { text: `${name} was well received.`, rep: 4, perf: 4, happiness: 3 }, cfg.icon);
      } else {
        reception = 'flop';
        rec.fans = Math.round(rec.fans * 0.97);
        applyFx(ctx, rec, { text: `${name} flopped. Hardly anyone noticed.`, rep: -3, happiness: -4 }, '😶');
      }
      if (r.money && reception !== 'controversy') ctx.earn(Math.round(job.salary * r.money / 100) * 100, `${r.name} — earnings`, { wage: true });
      rec.releases = [{ name, kind, reception, age: state.character.age, fans: rec.fans }, ...rec.releases].slice(0, 10);
      milestone(ctx, cfg, rec);
      return undefined;
    },
  },
  resolvers: {
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = AUDIENCE_CAREERS[data.professionId];
      const d = cfg?.deck?.find((x) => x.id === data.deckId);
      if (!d || !job) return;
      resolveOption(ctx, lifeOf(ctx.state, 'audience', job.professionId, fresh(cfg)), d.options.find((o) => o.id === optionId), d.icon, cfg.weights);
    },
  },
};
