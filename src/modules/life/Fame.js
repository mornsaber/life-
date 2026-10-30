/**
 * Fame: one score for how well the public knows you, drawn from everything that makes a
 * name — a following, a sporting career, high office, a crown, a fortune, honours, a notorious
 * outfit — plus the buzz of the moment, which fades.
 *
 *   Sources    each system's contribution (0–100); the biggest counts in full, the rest add a
 *              little. Buzz is pushed in by events (`fame:buzz`) and decays every year.
 *   Tiers      Unknown · Locally known · Well known · Famous · A star · An icon
 *   Life       endorsement deals, paparazzi, talk shows, a book deal, stalkers — and tabloid
 *              scandals, which follow you into politics (approval, recognition), business
 *              (reputation) and your audience. Infamy (crime) makes you known, not liked.
 *   Choices    lie low for a year (buzz fades fast, fewer cameras), or court the press
 *              (a publicity push: buzz, at a cost and a risk).
 *
 * state.fame = { score, peak, buzz, tier, deals: [{ brand, amount, until }], security, scandals: [], since }
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, netWorth } from '../../core/State.js';
import { peekLife } from '../career/engines/Kit.js';
import { OFFICES } from '../politics/Offices.js';
import { rankOf } from '../military/MilitaryEngine.js';

export const TIERS = [
  [0, 'Unknown', '🙂'], [10, 'Locally known', '🗞️'], [25, 'Well known', '📰'], [45, 'Famous', '⭐'], [70, 'A star', '🌟'], [90, 'An icon', '💫'],
];
export const tierOf = (score) => TIERS.filter(([at]) => score >= at).at(-1);

const fm = (state) => (state.fame ??= { score: 0, peak: 0, buzz: 0, tier: 0, deals: [], security: false, scandals: [], since: null });
const OFFICE_FAME = [0, 3, 8, 14, 24, 40, 80];
const SPORT_FAME = { minor: 6, pro: 18, starter: 30, allStar: 48 };
const BRANDS = ['a sportswear giant', 'a soft-drink brand', 'a luxury watchmaker', 'a car company', 'a cosmetics line', 'a bank', 'a phone maker', 'a fast-food chain', 'a crypto exchange', 'an airline'];

/** Everything that makes you known, as { id, label, value, infamy }. */
export function fameSources(state) {
  const out = [];
  const add = (id, label, value, infamy = false) => { if (value > 0.5) out.push({ id, label, value: Math.round(clamp(value, 0, 100)), infamy }); };
  const aud = peekLife(state, 'audience');
  if (aud?.fans) add('audience', 'Your following', (Math.log10(Math.max(1, aud.fans)) - 2.5) * 16);
  const job = state.career?.job;
  if (job?.professionId === 'athletics') add('sport', 'Your sporting career', SPORT_FAME[job.levelId] ?? 0);
  const s = state.sport;
  if (s) {
    const medals = (s.olympics ?? []).filter((o) => o.place).length;
    add('olympics', 'Olympic medals and caps', medals * 18 + Math.min(15, (s.caps ?? 0) / 4) + (s.captain ? 8 : 0));
  }
  const p = state.politics;
  if (p) {
    const level = OFFICES[p.office?.id]?.level ?? 0;
    add('office', p.office ? 'Public office' : 'Your political career', OFFICE_FAME[level] + (p.recognition ?? 0) * 0.25);
  }
  const r = state.royal;
  if (r) add('royal', 'The royal family', r.reigning ? 92 : r.line != null && r.line <= 2 ? 75 : r.working ? 50 : 28);
  if (state.holySee?.pope) add('pope', 'The papacy', 99);
  else if (state.holySee?.cardinal) add('cardinal', 'The College of Cardinals', 22);
  const prestige = (state.honors ?? []).reduce((a, h) => a + (h.prestige ?? 0), 0);
  add('honours', 'Honours and awards', Math.min(35, prestige * 0.8));
  const worth = netWorth(state);
  add('wealth', 'Your fortune', worth >= 1e9 ? 60 : worth >= 1e8 ? 35 : worth >= 2e7 ? 18 : worth >= 5e6 ? 6 : 0);
  const svc = state.military?.service;
  const flag = svc && svc.track === 'officer' ? /^(O|OF)-(\d+)/.exec(rankOf(svc).code ?? '') : null;
  const stars = flag ? Number(flag[2]) - (flag[1] === 'OF' ? 5 : 6) : 0;
  if (stars >= 1) add('military', 'Your command', stars * 7 + (svc.fiveStar ? 20 : 0));
  const uw = state.underworld?.me;
  if (uw && !state.underworld?.witsec) add('crime', 'Notoriety in the underworld', (uw.rank ?? 0) * 9, true);
  const violent = (state.legal?.record ?? []).filter((c) => /murder|homicide|manslaughter|terror/i.test(`${c.offenseId ?? ''} ${c.name ?? ''}`)).length;
  if (violent) add('notoriety', 'A notorious case', 20 + violent * 8, true);
  add('buzz', 'In the news lately', fm(state).buzz);
  return out.sort((a, b) => b.value - a.value);
}

/** One number: the biggest source in full, a third of the rest. */
export function fameScore(state) {
  const src = fameSources(state);
  if (!src.length) return 0;
  const [top, ...rest] = src;
  return Math.round(clamp(top.value + rest.reduce((a, s) => a + s.value, 0) * 0.3, 0, 100));
}
export const isInfamous = (state) => { const s = fameSources(state); return Boolean(s[0]?.infamy); };

/** Push buzz from anywhere (a viral moment, a rescue on the news). */
export function addBuzz(state, amount) {
  const f = fm(state);
  f.buzz = Math.round(clamp(f.buzz + amount, 0, 60));
}

/** A scandal: it lands on everything you have — office, business, audience, job. */
export function scandal(ctx, severity, headline) {
  const { state } = ctx;
  const f = fm(state);
  f.scandals.push({ age: state.character.age, headline, severity });
  if (f.scandals.length > 12) f.scandals.shift();
  addBuzz(state, severity * 2);
  const o = state.politics?.office;
  if (o) o.approval = Math.max(5, Math.round((o.approval ?? 50) - severity * 1.5));
  for (const b of [state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean)) if (typeof b.reputation === 'number') b.reputation = Math.max(0, b.reputation - Math.round(severity / 2));
  const aud = peekLife(state, 'audience');
  if (aud) aud.rep = Math.max(0, (aud.rep ?? 50) - severity);
  if (state.career?.job) state.career.job.performance = Math.max(0, (state.career.job.performance ?? 50) - Math.round(severity / 3));
  ctx.stat('stress', severity);
  ctx.stat('happiness', -Math.round(severity / 2));
  ctx.log(`Scandal: ${headline}`, '📰', 'bad');
  // A big one can become a cancellation (Celebrity.js).
  ctx.emit('fame:afterScandal', { severity, headline });
}

const SCANDALS = [
  ['an old video of you surfaced', 10], ['a former friend sold a story about you to a tabloid', 8], ['your tax affairs made the front page', 12],
  ['a leaked group chat', 9], ['photos from a party you\'d rather forget', 7], ['an ex wrote a tell-all', 11],
];

function yearTick(ctx) {
  const { state, rng } = ctx;
  const f = fm(state);
  const age = state.character.age;
  // Endorsement deals pay while they run.
  f.deals = f.deals.filter((d) => d.until >= age);
  for (const d of f.deals) ctx.earn(d.amount, `Endorsement — ${d.brand}`, { wage: true });
  if (f.security) ctx.spend(Math.round(30000 + f.score * 600), 'Private security', { allowDebt: true });
  // Buzz fades (fast if you lie low).
  // (Yearly counters reset before the year runs: the choice is carried on the record.)
  const low = Boolean(f.lyingLow);
  f.lyingLow = false;
  f.buzz = Math.round(f.buzz * (low ? 0.3 : 0.6));
  const before = f.score;
  f.score = fameScore(state);
  f.peak = Math.max(f.peak, f.score);
  const tier = TIERS.indexOf(tierOf(f.score));
  if (tier > (f.tier ?? 0)) {
    f.since ??= age;
    const [, label, icon] = TIERS[tier];
    ctx.log(isInfamous(state) ? `${label}, for the wrong reasons: your face is on the news and people cross the street.` : [null, 'People in town started to recognise you.', 'Strangers know your name now.', 'You are famous: you can\'t buy groceries without a selfie.', 'You are a star: your name sells magazines.', 'You are an icon: one of the most recognised people alive.'][tier], icon, 'milestone');
  }
  f.tier = tier;
  // Fame carries into politics: the public already knows your name.
  if (state.politics && f.score > 0) state.politics.recognition = Math.max(state.politics.recognition ?? 0, Math.round(f.score * 0.5));
  if (age < 16 || state.legal?.incarceration || !state.character.alive) return;
  if (state.prompts.some((p) => p.type?.startsWith('fame.'))) return;
  const s = f.score;
  const infamous = isInfamous(state);
  // One fame moment a year at most.
  if (!infamous && s >= 25 && f.deals.length < 3 && rng.chance(0.3)) {
    const brand = rng.pick(BRANDS);
    const amount = Math.round(s * s * 40 / 1000) * 1000;
    return ctx.prompt({ type: 'fame.endorse', icon: '🤝', title: 'An Endorsement Deal', text: `${brand[0].toUpperCase()}${brand.slice(1)} wants your face on its campaign: $${amount.toLocaleString()} a year for three years.`, options: [
      { id: 'accept', label: '✍️ Sign' }, { id: 'decline', label: '🙅 Decline' },
    ], data: { brand, amount } });
  }
  if (s >= 40 && !low && rng.chance(0.25)) {
    return ctx.prompt({ type: 'fame.paparazzi', icon: '📸', title: 'Paparazzi', text: 'Photographers have been camped outside your home all week. Today one followed you into a restaurant.', options: [
      { id: 'ignore', label: '🕶️ Smile and ignore them' }, { id: 'confront', label: '😠 Confront him', tone: 'danger' }, { id: 'sue', label: '⚖️ Sue for invasion of privacy ($25,000)', disabled: state.finances.cash < 25000 },
    ] });
  }
  if (s >= 50 && !f.security && rng.chance(0.05)) {
    return ctx.prompt({ type: 'fame.stalker', icon: '👁️', title: 'A Stalker', text: 'The same person has turned up at your home, your work and your gym. The letters are getting stranger.', options: [
      { id: 'security', label: '🛡️ Hire private security', hint: 'A yearly cost while you keep it' }, { id: 'police', label: '🚓 Go to the police for an order' }, { id: 'ignore', label: '🤷 Ignore it', tone: 'danger' },
    ] });
  }
  if (s >= 25 && rng.chance(0.04 + s / 1500 + (infamous ? 0.05 : 0))) {
    const [headline, severity] = rng.pick(SCANDALS);
    return ctx.prompt({ type: 'fame.scandal', icon: '📰', title: 'A Tabloid Story', text: `The papers have it: ${headline}.`, options: [
      { id: 'apologise', label: '🙏 Apologise publicly' }, { id: 'deny', label: '🙅 Deny everything' }, { id: 'lawyers', label: '⚖️ Send in the lawyers ($40,000)', disabled: state.finances.cash < 40000 },
    ], data: { headline, severity } });
  }
  if (s >= 30 && age >= 35 && !yearlyCount(state, 'fame.book') && !(f.bookAge && age - f.bookAge < 10) && rng.chance(0.12)) {
    const advance = Math.round(s * s * 25 / 1000) * 1000;
    return ctx.prompt({ type: 'fame.book', icon: '📚', title: 'A Book Deal', text: `A publisher offers a $${advance.toLocaleString()} advance for your memoir.`, options: [
      { id: 'write', label: '✍️ Write it yourself' }, { id: 'ghost', label: '👻 Use a ghostwriter' }, { id: 'decline', label: '🙅 Not yet' },
    ], data: { advance } });
  }
  if (s >= 30 && rng.chance(0.15)) {
    return ctx.prompt({ type: 'fame.talkShow', icon: '🎙️', title: 'A Late-Night Show', text: 'A late-night talk show wants you on the couch next week.', options: [
      { id: 'charm', label: '😄 Go on and be charming' }, { id: 'decline', label: '🙅 Decline' },
    ] });
  }
  return undefined;
}

const check = (state, base) => clamp(base + (state.stats.looks - 50) / 200 + (state.stats.smarts - 50) / 250 + (state.stats.happiness - 50) / 300, 0.1, 0.92);

export const FameModule = {
  id: 'fame',
  order: 96,
  setup(engine) {
    engine.bus.on('fame:buzz', ({ ctx, amount }) => addBuzz(ctx.state, amount ?? 5));
    // A public disgrace elsewhere (a doping ban, a conviction) lands as a scandal once you're known.
    engine.bus.on('fame:scandal', ({ ctx, severity, headline }) => { if (fameScore(ctx.state) >= 10) scandal(ctx, severity ?? 8, headline); });
  },
  init(state) {
    fm(state);
  },
  onAgeUp(ctx) {
    if (!ctx.state.character.alive) return;
    yearTick(ctx);
  },
  actions: {
    /** Lie low for the year: buzz fades fast, the cameras lose interest. */
    lieLow(ctx) {
      const { state } = ctx;
      if (yearlyCount(state, 'fame.lieLow')) return ctx.toast('Already lying low', 'warn');
      bumpYearly(state, 'fame.lieLow');
      fm(state).lyingLow = true;
      ctx.stat('stress', -4);
      return ctx.log('You turned down every invitation and stayed home. The cameras drifted away.', '🕶️', 'info');
    },
    /** Court the press: buzz now, at a price and a risk. */
    publicity(ctx) {
      const { state, rng } = ctx;
      const f = fm(state);
      if (yearlyCount(state, 'fame.publicity') || yearlyCount(state, 'fame.lieLow')) return ctx.toast('Once a year (and not while lying low)', 'warn');
      if (state.character.age < 16) return ctx.toast('From 16', 'warn');
      const cost = 5000 + f.score * 300;
      if (!ctx.spend(cost, 'Publicist and a publicity push', { allowDebt: false })) return ctx.toast(`A publicist costs about $${cost.toLocaleString()}`, 'warn');
      bumpYearly(state, 'fame.publicity');
      if (rng.chance(0.12)) {
        scandal(ctx, 6, 'your publicity stunt backfired, and everyone saw it');
        return undefined;
      }
      addBuzz(state, rng.int(6, 14));
      f.score = fameScore(state);
      return ctx.log(rng.pick(['A magazine cover and a viral interview.', 'A charity stunt that the morning shows loved.', 'Your publicist got you on every podcast that matters.']), '📣', 'good');
    },
    /** Let the security detail go. */
    dropSecurity(ctx) {
      fm(ctx.state).security = false;
      return ctx.log('You let the security detail go.', '🛡️', 'info');
    },
  },
  resolvers: {
    endorse(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'accept') return ctx.log('You turned the endorsement down.', '🙅', 'info');
      fm(state).deals.push({ brand: data.brand, amount: data.amount, until: state.character.age + 2 });
      ctx.log(`You signed with ${data.brand}: $${data.amount.toLocaleString()} a year.`, '🤝', 'good');
      if (data.brand === 'a crypto exchange' && rng.chance(0.35)) scandal(ctx, 9, 'the crypto exchange you promoted collapsed, taking fans\' savings with it');
      return undefined;
    },
    paparazzi(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'confront') {
        if (rng.chance(0.4)) scandal(ctx, 7, 'you were filmed shoving a photographer');
        else ctx.log('You told him exactly what you thought. The clip got a million views; most people took your side.', '😠', 'warn');
        addBuzz(state, 6);
      } else if (optionId === 'sue') {
        ctx.spend(25000, 'Privacy lawsuit', { allowDebt: false });
        if (rng.chance(0.5)) { ctx.earn(rng.int(40000, 150000), 'Privacy damages', {}); ctx.log('You won: the agency paid damages and the photographers backed off.', '⚖️', 'good'); } else ctx.log('The judge ruled a public street is a public street.', '⚖️', 'warn');
      } else {
        ctx.stat('stress', 3);
        ctx.log('You smiled, said nothing and finished your lunch.', '🕶️', 'info');
      }
      return undefined;
    },
    stalker(ctx, data, optionId) {
      const { state, rng } = ctx;
      const f = fm(state);
      if (optionId === 'security') { f.security = true; ctx.log('A close-protection team now goes everywhere with you.', '🛡️', 'info'); return undefined; }
      if (optionId === 'police') { ctx.log(rng.chance(0.7) ? 'The court granted a restraining order; the letters stopped.' : 'The order was granted. The letters didn\'t stop.', '🚓', 'warn'); ctx.stat('stress', 5); return undefined; }
      ctx.stat('stress', 8);
      if (rng.chance(0.15)) { ctx.stat('health', -rng.int(5, 15)); ctx.log('The stalker attacked you outside your home. Neighbours pulled him off.', '🩹', 'bad'); }
      return undefined;
    },
    scandal(ctx, data, optionId) {
      const { state, rng } = ctx;
      let sev = data.severity;
      if (optionId === 'apologise') sev = Math.round(sev * (rng.chance(check(state, 0.6)) ? 0.5 : 0.9));
      else if (optionId === 'deny') sev = rng.chance(0.4) ? Math.round(sev * 0.3) : Math.round(sev * 1.5);
      else { ctx.spend(40000, 'Media lawyers', { allowDebt: false }); sev = rng.chance(0.55) ? 2 : sev; }
      scandal(ctx, sev, data.headline);
      return undefined;
    },
    book(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'decline') return undefined;
      bumpYearly(state, 'fame.book');
      fm(state).bookAge = state.character.age;
      ctx.earn(data.advance, 'Book advance', { wage: true });
      if (optionId === 'write') ctx.stat('stress', 6);
      const hit = rng.chance(check(state, optionId === 'write' ? 0.35 : 0.25));
      if (hit) { addBuzz(state, 10); ctx.earn(Math.round(data.advance * 0.8), 'Royalties', { wage: true }); }
      ctx.log(hit ? 'Your memoir was a bestseller: book tours, festival talks and royalties.' : 'Your memoir came out to polite reviews and sold to your fans.', '📚', hit ? 'good' : 'info');
      return undefined;
    },
    talkShow(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'charm') return undefined;
      if (rng.chance(check(state, 0.65))) { addBuzz(state, 8); ctx.log('You killed it: the clip was everywhere the next morning.', '🎙️', 'good'); } else { addBuzz(state, 3); ctx.log('An awkward seven minutes. The host saved it.', '🎙️', 'info'); }
      return undefined;
    },
  },
};

/** For the UI. */
export function fameSummary(state) {
  const f = state.fame;
  if (!f) return null;
  const score = fameScore(state);
  return { score, tier: tierOf(score), peak: f.peak, sources: fameSources(state), deals: f.deals, security: f.security, scandals: f.scandals, infamous: isInfamous(state), lowThisYear: Boolean(state.yearly['fame.lieLow']), pushedThisYear: Boolean(state.yearly['fame.publicity']) };
}
