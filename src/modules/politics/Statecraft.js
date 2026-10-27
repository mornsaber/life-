/**
 * Governing, not just holding office: political capital, signature initiatives that become a
 * legacy, scandals, leadership challenges and impeachment.
 *
 *   Capital      Earned by approval and time in office, spent on initiatives. A popular
 *                officeholder can get big things done; an unpopular one can't.
 *   Initiatives  A signature policy (health, the economy, security, schools, the climate):
 *                spend capital, take the risk, and if it passes it is your legacy.
 *   Scandals     Old money, a staffer's emails, an affair, a donor's favours. Deny, apologise,
 *                blame a staffer, or resign. Corruption you committed is what gets found.
 *   Challenges   A prime minister or premier whose approval sinks faces a leadership
 *                challenge: fight it, call a snap election, or go.
 *   Impeachment  A president or governor caught in a scandal with the public against them
 *                can be impeached; the upper house decides on removal.
 *
 * state.politics.capital (0–100), state.politics.legacy = [{ area, age, title }]
 */
import { yearlyCount, bumpYearly, currentYear } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { OFFICES } from './Offices.js';

export const INITIATIVES = {
  health: { label: '🏥 A health care reform', titles: ['the Health Security Act', 'universal coverage for children', 'a cap on drug prices'] },
  economy: { label: '💼 An economic plan', titles: ['a jobs and infrastructure bill', 'a tax reform', 'an industrial strategy'] },
  security: { label: '🛡️ A public safety package', titles: ['a police reform act', 'a crime bill', 'a border security plan'] },
  schools: { label: '🎓 A schools programme', titles: ['free pre-school for every four-year-old', 'a teacher pay deal', 'free university tuition'] },
  climate: { label: '🌍 A climate law', titles: ['a clean energy standard', 'a carbon price', 'a coal phase-out'] },
};
const isLeader = (o) => /_pm$|premier|governor|mayor|president|^president$/.test(o?.id ?? '') || OFFICES[o?.id]?.executive;
const parliamentary = (o) => /_pm$|premier/.test(o?.id ?? '');
const presidential = (o) => /president|governor/.test(o?.id ?? '') && !parliamentary(o);
const pol = (state) => state.politics;

function capitalYear(ctx) {
  const { state } = ctx;
  const p = pol(state);
  const o = p.office;
  if (!o) { p.capital = 0; return; }
  p.capital = Math.round(clamp((p.capital ?? 20) * 0.85 + 8 + (o.approval - 50) / 4 + (isLeader(o) ? 4 : 0), 0, 100));
}

function scandalYear(ctx) {
  const { state, rng } = ctx;
  const p = pol(state);
  const o = p.office;
  if (!o || state.prompts.some((x) => x.type?.startsWith('statecraft.'))) return;
  // Corruption you committed is what the papers find; anyone can be caught in something smaller.
  const dirty = (state.legal?.investigations ?? []).some((i) => /corruption|bribery|fraud/i.test(i.offenseId));
  if (!rng.chance(dirty ? 0.25 : 0.05)) return;
  const what = dirty ? rng.pick(['payments from a contractor routed through a shell company', 'a donor who got a government contract weeks after a large gift']) : rng.pick(['a staffer\'s leaked emails mocking voters', 'an expenses claim for a second home', 'a holiday paid for by a lobbyist', 'an old video that has aged badly']);
  ctx.prompt({ type: 'statecraft.scandal', icon: '📰', title: 'A Scandal', text: `The papers have a story about ${what}. Your approval is ${o.approval}%.`, options: [
    { id: 'deny', label: '🙅 Deny everything', hint: dirty ? 'If they have proof…' : 'Usually blows over' },
    { id: 'apologise', label: '🙇 Apologise and take responsibility' },
    { id: 'staffer', label: '🫵 Fire the staffer responsible', hint: 'Shifts blame; loyalty suffers' },
    { id: 'resign', label: '🚪 Resign', tone: 'danger' },
  ], data: { dirty } });
}

function challengeYear(ctx) {
  const { state, rng } = ctx;
  const o = pol(state).office;
  if (!o || state.prompts.some((x) => x.type?.startsWith('statecraft.'))) return;
  if (parliamentary(o) && o.approval < 35 && rng.chance(0.3)) {
    ctx.prompt({ type: 'statecraft.challenge', icon: '🗡️', title: 'A Leadership Challenge', text: `With your approval at ${o.approval}%, a rival has gathered enough signatures to challenge you for the leadership of your party.`, options: [
      { id: 'fight', label: '🥊 Fight the challenge', hint: 'Win and you\'re stronger; lose and you\'re out' },
      { id: 'snap', label: '🗳️ Call a snap election over their heads', tone: 'danger' },
      { id: 'resign', label: '🚪 Resign with dignity' },
    ] });
  } else if (presidential(o) && o.approval < 30 && (pol(state).scandals ?? 0) >= 1 && rng.chance(0.25)) {
    ctx.prompt({ type: 'statecraft.impeach', icon: '⚖️', title: 'Impeachment', text: 'The lower house has voted articles of impeachment against you. The upper house will try you.', options: [
      { id: 'fight', label: '⚖️ Fight it in the trial' },
      { id: 'resign', label: '🚪 Resign before the vote' },
    ] });
  }
}

export const StatecraftModule = {
  id: 'statecraft',
  order: 70.5,
  onAgeUp(engineCtx) {
    const { state } = engineCtx;
    if (!state.character.alive || !state.politics) return;
    // A side stream, so the business of governing doesn't reshuffle the rest of the life.
    const rng = new Random(((state.world?.seed ?? 1) * 40503 + currentYear(state) * 811 + 0x5c) >>> 0);
    const ctx = { ...engineCtx, rng };
    capitalYear(ctx);
    scandalYear(ctx);
    challengeYear(ctx);
  },
  actions: {
    /** Push a signature initiative (arg: area). */
    initiative(ctx, area) {
      const { state, rng } = ctx;
      const p = pol(state);
      const o = p.office;
      const it = INITIATIVES[area];
      if (!o || !it) return ctx.toast('Only an officeholder can push an initiative.', 'warn');
      if (yearlyCount(state, 'statecraft.initiative')) return ctx.toast('One big push a year', 'warn');
      if ((p.capital ?? 0) < 30) return ctx.toast('Not enough political capital (30 needed)', 'warn');
      bumpYearly(state, 'statecraft.initiative');
      p.capital -= 30;
      const odds = clamp(0.25 + (p.capital + 30) / 200 + (o.approval - 50) / 200 + (isLeader(o) ? 0.15 : 0), 0.1, 0.85);
      const title = rng.pick(it.titles);
      if (rng.chance(odds)) {
        (p.legacy ??= []).push({ area, title, age: state.character.age, year: currentYear(state) });
        o.approval = Math.min(100, o.approval + rng.int(2, 7));
        p.recognition = Math.min(100, (p.recognition ?? 0) + 6);
        return ctx.log(`Your signature initiative passed: ${title}. It will carry your name for years.`, '🏛️', 'milestone');
      }
      o.approval = Math.max(0, o.approval - rng.int(2, 5));
      return ctx.log(`${title[0].toUpperCase()}${title.slice(1)} died in the legislature. You spent capital and got nothing for it.`, '🏛️', 'bad');
    },
  },
  resolvers: {
    scandal(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = pol(state);
      const o = p.office;
      if (!o) return undefined;
      p.scandals = (p.scandals ?? 0) + 1;
      if (optionId === 'resign') { ctx.emit('politics:leave', { reason: 'Resigned over a scandal' }); return ctx.log('You resigned. The story died the next day.', '🚪', 'warn'); }
      if (optionId === 'deny') {
        if (data.dirty && rng.chance(0.6)) {
          o.approval = Math.max(0, o.approval - 15);
          ctx.log('Then the documents came out. The denial became the story.', '📰', 'bad');
          return ctx.emit('legal:offense', { offenseId: 'publicCorruption', context: 'the scandal that would not die', caught: true, evidence: 0.85 });
        }
        o.approval = Math.max(0, o.approval - 2);
        return ctx.log('You denied it, flatly, and the news moved on.', '🙅', 'info');
      }
      if (optionId === 'apologise') { o.approval = Math.max(0, o.approval - (data.dirty ? 8 : 3)); p.capital = Math.max(0, (p.capital ?? 0) - 10); return ctx.log('You apologised. Some respected it; your opponents framed it.', '🙇', 'info'); }
      o.approval = Math.max(0, o.approval - 1);
      p.capital = Math.max(0, (p.capital ?? 0) - 15);
      return ctx.log('You fired a staffer. The press moved on; your staff noticed.', '🫵', 'warn');
    },
    challenge(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = pol(state).office;
      if (!o) return undefined;
      if (optionId === 'resign') { ctx.emit('politics:leave', { reason: 'Resigned after a leadership challenge' }); return ctx.log('You resigned the leadership. Your successor thanked you in a speech you didn\'t watch.', '🚪', 'info'); }
      if (optionId === 'snap') {
        const won = rng.chance(clamp(0.25 + o.approval / 150, 0.1, 0.6));
        if (!won) { ctx.emit('politics:leave', { reason: 'Lost a snap election' }); return ctx.log('The snap election was a disaster. Your party lost power, and you lost the leadership the next morning.', '🗳️', 'bad'); }
        o.approval = Math.min(100, o.approval + 15);
        return ctx.log('The gamble paid off: a fresh mandate, and the rebels silenced.', '🗳️', 'milestone');
      }
      const won = rng.chance(clamp(0.35 + o.approval / 120 + (pol(state).capital ?? 0) / 300, 0.15, 0.8));
      if (!won) { ctx.emit('politics:leave', { reason: 'Lost a leadership challenge' }); return ctx.log('You lost the leadership ballot. Your successor moved into the official residence by the weekend.', '🗡️', 'bad'); }
      o.approval = Math.min(100, o.approval + 6);
      return ctx.log('You beat the challenge. The rebels went quiet — for now.', '🥊', 'good');
    },
    impeach(ctx, data, optionId) {
      const { state, rng } = ctx;
      const o = pol(state).office;
      if (!o) return undefined;
      if (optionId === 'resign') { ctx.emit('politics:leave', { reason: 'Resigned before an impeachment vote' }); return ctx.log('You resigned before the vote. The helicopter took off from the lawn.', '🚁', 'bad'); }
      if (rng.chance(clamp(0.2 + (35 - o.approval) / 100, 0.1, 0.5))) { ctx.emit('politics:leave', { reason: 'Removed from office by impeachment' }); return ctx.log('The upper house voted to convict. You were removed from office.', '⚖️', 'bad'); }
      o.approval = Math.min(100, o.approval + 4);
      return ctx.log('The upper house acquitted you. You survived, diminished.', '⚖️', 'info');
    },
  },
};
