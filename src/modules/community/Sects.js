/**
 * Religion as a career path beyond the established churches (which the clergy careers cover):
 * founding your own congregation, and the hard choices inside any church.
 *
 *   A new church   start with a few dozen people in a rented hall. Each year, how you preach:
 *                  community and service (slow, loved), prosperity (fast, rich, criticised),
 *                  or the end times (devoted, isolated, watched). Members tithe; the church
 *                  can buy a building, run a TV ministry, or become a megachurch.
 *   Controversy    rises with prosperity and apocalyptic preaching: press exposés, a tax audit
 *                  of the church's exemption, former members calling it a cult, a schism.
 *   Clergy         serving priests and ministers face the institution's own crises: a
 *                  colleague's misconduct reported to you, money missing from the collection.
 *
 * state.sect = { name, since, members, style, funds, controversy, building, tv }
 */
import { Random, clamp } from '../../core/Random.js';
import { priceLevel } from '../world/Countries.js';
import { commitOffense } from '../legal/JusticeSystem.js';

export const STYLES = {
  community: { label: '🤲 Community and service', growth: [0.02, 0.12], tithe: 25, controversy: -3 },
  prosperity: { label: '💰 The prosperity gospel', growth: [0.05, 0.3], tithe: 90, controversy: 6 },
  endtimes: { label: '🔥 The end is near', growth: [-0.05, 0.25], tithe: 60, controversy: 9 },
};
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 13693 + state.character.age * 887 + 0x5ec7) >>> 0);
const local = (state, n) => Math.round(n * priceLevel(state));
export const sectOf = (state) => state.sect ?? null;
const CLERGY = ['clergy', 'catholicClergy', 'anglicanClergy'];

export function sectTick(main) {
  const { state } = main;
  const rng = sideRng(state);
  const ctx = { ...main, rng };
  // Clergy in an established church: the institution's crises.
  if (CLERGY.includes(state.career.job?.professionId) && rng.chance(0.1)) {
    const kind = rng.pick(['misconduct', 'money']);
    ctx.prompt({ type: 'sects.clergy', icon: '⛪', title: kind === 'misconduct' ? 'What You Were Told' : 'The Collection', text: kind === 'misconduct' ? 'A parishioner tells you, in tears, that a senior colleague behaved inappropriately with her teenage son years ago. Your superiors would prefer it handled "pastorally".' : 'The parish accounts don\'t add up: thousands missing from the collection over three years, and the treasurer is a friend.', data: { kind }, options: kind === 'misconduct'
      ? [{ id: 'police', label: '🚓 Report it to the police and the safeguarding office' }, { id: 'internal', label: '🤐 Pass it up the hierarchy and let them deal with it', tone: 'danger' }]
      : [{ id: 'audit', label: '📒 Call in the diocese\'s auditors' }, { id: 'quiet', label: '🤝 Talk to the treasurer privately' }] });
  }
  const S = sectOf(state);
  if (!S) return;
  const st = STYLES[S.style] ?? STYLES.community;
  S.members = Math.max(5, Math.round(S.members * (1 + rng.float(...st.growth)) + rng.int(0, 15) + (S.tv ? rng.int(50, 400) : 0)));
  const tithes = local(state, S.members * st.tithe);
  S.funds += tithes;
  const salary = Math.min(Math.round(tithes * 0.25), local(state, S.members > 2000 ? 400000 : 80000));
  if (salary > 0) main.earn(salary, `Pastor's salary — ${S.name}`, { wage: true });
  S.funds -= salary;
  S.controversy = Math.round(clamp(S.controversy + st.controversy + (S.members > 5000 ? 2 : 0) + rng.int(-3, 3), 0, 100));
  main.log(`${S.name}: ${S.members.toLocaleString()} members${S.building ? ' in your own building' : ''}${S.tv ? ', and a TV audience' : ''}.`, '⛪', 'info');
  if (S.controversy >= 60 && rng.chance(0.4)) {
    const kind = rng.pick(['expose', 'audit', 'cult', 'schism']);
    const text = { expose: 'A newspaper has run a long exposé on the church\'s finances — and your house.', audit: 'The tax authorities are auditing the church\'s charitable exemption.', cult: 'Former members have gone on television calling the church a cult.', schism: 'Your associate pastor is leading a third of the congregation out to start their own church.' }[kind];
    return ctx.prompt({ type: 'sects.controversy', icon: '📰', title: 'Controversy', text, data: { kind }, options: [
      { id: 'open', label: '📖 Open the books and answer every question' }, { id: 'fight', label: '⚔️ Fight back: sermons, lawyers, loyalty' }, { id: 'shift', label: '🤲 Change course: more service, less spectacle' },
    ] });
  }
  if (rng.chance(0.35)) {
    const opts = [];
    if (!S.building && S.funds > local(state, 400000)) opts.push({ id: 'building', label: '🏛️ Buy a building of your own', hint: `$${local(state, 400000).toLocaleString()}` });
    if (!S.tv && S.members > 1000 && S.funds > local(state, 250000)) opts.push({ id: 'tv', label: '📺 Start a TV and streaming ministry', hint: `$${local(state, 250000).toLocaleString()}` });
    opts.push(...Object.entries(STYLES).filter(([id]) => id !== S.style).map(([id, x]) => ({ id: `style:${id}`, label: x.label })));
    opts.push({ id: 'stay', label: '🙏 Carry on as you are' });
    ctx.prompt({ type: 'sects.direction', icon: '⛪', title: `${S.name}: The Way Ahead`, text: `${S.members.toLocaleString()} members, $${S.funds.toLocaleString()} in the church's accounts, controversy ${S.controversy}/100.`, data: {}, options: opts });
  }
}

export const SectResolvers = {
  clergy(ctx, data, optionId) {
    const { rng } = ctx;
    if (optionId === 'police') { ctx.emit('career:adjust', { boss: -10 }); ctx.stat('stress', 6); return ctx.log('You reported it. The hierarchy was cold to you for years; the family thanked you.', '🚓', 'good'); }
    if (optionId === 'internal') { if (rng.chance(0.3)) { ctx.emit('fame:scandal', { severity: 9, headline: 'a church cover-up you were part of' }); ctx.emit('career:resign', { reason: 'Removed over a safeguarding cover-up', fired: true }); return ctx.log('An inquiry years later found you had known. You were removed from ministry.', '📰', 'bad'); } return ctx.log('You passed it up. You never heard what happened.', '🤐', 'warn'); }
    if (optionId === 'audit') return ctx.log('The auditors found it. Your friend repaid what he could and resigned.', '📒', 'info');
    return ctx.log('Your friend cried, and promised to pay it back. Most of it came back.', '🤝', 'info');
  },
  controversy(ctx, data, optionId) {
    const { state, rng } = ctx;
    const S = sectOf(state);
    if (!S) return;
    if (optionId === 'open') { S.controversy = Math.max(0, S.controversy - 20); S.members = Math.round(S.members * 0.92); return ctx.log('You opened the books. Some members left; the story died.', '📖', 'info'); }
    if (optionId === 'shift') { S.style = 'community'; S.controversy = Math.max(0, S.controversy - 12); return ctx.log('You changed course: food banks, night shelters, fewer lights on stage.', '🤲', 'good'); }
    if (data.kind === 'schism') { S.members = Math.round(S.members * 0.67); return ctx.log('A third of your church walked out behind your old associate.', '💔', 'bad'); }
    if (data.kind === 'audit' && rng.chance(0.4)) { S.funds = Math.round(S.funds * 0.6); commitOffense(ctx, { offenseId: 'taxEvasion', discovery: 0.3, evidence: 0.7, context: 'church funds spent on the pastor' }); return ctx.log('The audit found church money paying for your lifestyle. Back taxes, and an investigation.', '🧾', 'bad'); }
    S.controversy = Math.max(0, S.controversy - 5);
    ctx.emit('fame:buzz', { amount: 3 });
    ctx.log('You fought back from the pulpit. The faithful closed ranks.', '⚔️', 'warn');
  },
  direction(ctx, data, optionId) {
    const { state } = ctx;
    const S = sectOf(state);
    if (!S) return;
    if (optionId === 'building') { S.funds -= local(state, 400000); S.building = true; return ctx.log('The church bought an old cinema and filled it every Sunday.', '🏛️', 'milestone'); }
    if (optionId === 'tv') { S.funds -= local(state, 250000); S.tv = true; S.controversy += 5; return ctx.log('Your sermons now go out on cable and every streaming platform.', '📺', 'milestone'); }
    if (optionId.startsWith('style:')) { S.style = optionId.slice(6); return ctx.log(`You changed how you preach: ${STYLES[S.style].label.replace(/^\S+ /, '').toLowerCase()}.`, '📖', 'info'); }
  },
};

export const SectActions = {
  found(ctx, name) {
    const { state } = ctx;
    if (state.character.age < 21) return ctx.toast('21+', 'warn');
    if (sectOf(state)) return ctx.toast('You already lead a church', 'warn');
    state.sect = { name: name || `${state.character.lastName} Fellowship Church`, since: state.character.age, members: 30, style: 'community', funds: 0, controversy: 5, building: false, tv: false };
    ctx.log(`You founded ${state.sect.name}: thirty people on folding chairs in a rented hall.`, '⛪', 'milestone');
  },
  close(ctx) {
    const S = sectOf(ctx.state);
    if (!S) return;
    ctx.state.sect = null;
    ctx.log(`You closed ${S.name} and gave what was left to charity.`, '⛪', 'info');
  },
};

export const SectsModule = { id: 'sects', order: 40.6, onAgeUp: sectTick, actions: SectActions, resolvers: SectResolvers };
