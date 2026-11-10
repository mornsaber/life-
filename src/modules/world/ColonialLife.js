/**
 * Colonial life: what a year in a colonial service brings, for the officers posted out from the
 * ruling country and for the local men and women who served in it.
 *
 *   District work   a land dispute in your court, a road to build, a census, a famine to answer:
 *                   by the book, by local custom, or the administration's way.
 *   Unrest          a strike, a boycott, a march on the district office: talk, disperse, or charge.
 *   Home leave      long leave home midway through a tour, or the road finished first.
 *   The club, fever, the locals' ceiling: the colony's everyday injustices, from either side.
 *   The movement    a local officer asked to pass papers to the nationalists, or to report them.
 *   Independence    the night the flag comes down.
 *
 * The choices add up. `standing` (0–100) is how the people of the colony see you; the loyalist
 * choices set the colony's `loyal` record and the movement's `joined`, which decide whether the new
 * government keeps you on at independence (world/History.js handOver) and whether it asks an
 * officer from the old country to stay on, on contract.
 *
 * state.colonial = { standing, inquiries, leaveTaken: { [tourStart]: true }, lastEvent }
 */
import { PROFESSIONS } from '../career/JobTrees.js';
import { COUNTRIES } from './Countries.js';
import { colonyHere, colonyStage, rulerAdj, yearNow, colonialHere } from './Eras.js';
import { postingOf } from './Posting.js';
import { leaveJob } from '../career/CareerEngine.js';
import { clamp } from '../../core/Random.js';

const cname = (cc) => COUNTRIES[cc]?.name ?? cc;
const colonialJob = (state) => {
  const job = state.career?.job;
  return job && PROFESSIONS[job.professionId]?.colonial && !job.nationalized ? job : null;
};
/** Where you serve: the colony you're posted to, or your own. */
function servingIn(state) {
  const p = postingOf(state);
  if (p?.kind === 'colonial' && p.colony && colonyStage(state, p.colony)) return { cc: p.colony, expat: true, ruler: colonyStage(state, p.colony).ruler };
  const st = colonialHere(state);
  if (st) return { cc: state.character.countryId ?? 'US', expat: false, ruler: st.ruler };
  return null;
}
const ensure = (state) => (state.colonial ??= { standing: 50, inquiries: 0, leaveTaken: {} });
const recOf = (state, cc) => (state.era.colonies[cc] ??= { done: [], pressure: 0 });
const stand = (state, d) => { const c = ensure(state); c.standing = clamp(c.standing + d, 0, 100); };
const perf = (state, d) => { const job = state.career.job; if (job) job.performance = Math.round(clamp((job.performance ?? 50) + d, 0, 100)); };

/** The year's colonial events, one at most. */
const EVENTS = [
  { id: 'dispute', when: () => true, weight: 3, build: (s, w) => ({
    title: 'A Dispute in Your Court', icon: '⚖️',
    text: `Two villages in your district both claim the same grazing land. The headman who supports the administration wants it; the elders say it has always been the other village's.`,
    options: [
      { id: 'law', label: '📜 Decide by the written law', hint: 'Fair on paper' },
      { id: 'custom', label: '🌳 Hear the elders and follow custom', hint: 'The people will remember' },
      { id: 'headman', label: '🤝 Give it to the loyal headman', hint: `What the ${rulerAdj(w.ruler)} administration wants` },
    ] }) },
  { id: 'famine', when: () => true, weight: 1, build: (s, w) => ({
    title: 'The Rains Failed', icon: '🌾',
    text: `The harvest in ${cname(w.cc)} has failed. The revenue is due, and the secretariat wants its targets met.`,
    options: [
      { id: 'relief', label: '🍲 Suspend the tax and open relief works', hint: 'Your superiors won\'t thank you' },
      { id: 'targets', label: '📈 Collect the revenue as ordered', hint: 'Good for your file' },
    ] }) },
  { id: 'unrest', when: (s, w) => (recOf(s, w.cc).pressure ?? 0) >= 2 || yearNow(s) >= 1918, weight: 2, build: (s, w) => ({
    title: 'Trouble at the District Office', icon: '✊',
    text: `A crowd has marched on the district office: strikers from the ${['port', 'railway yards', 'mines', 'cotton mills'][yearNow(s) % 4]}, students, nationalists with banners. The police are waiting for your order.`,
    options: [
      { id: 'talk', label: '🗣️ Go out and talk to them', hint: 'Brave, and not what the Governor wants' },
      { id: 'disperse', label: '🚓 Disperse them peacefully', hint: 'Arrests, no shooting' },
      { id: 'charge', label: '⚔️ Order a baton charge', hint: 'Order restored; someone may die', tone: 'danger' },
    ] }) },
  { id: 'leave', when: (s, w) => w.expat && postingOf(s) && !ensure(s).leaveTaken[postingOf(s).since], weight: 2, build: () => ({
    title: 'Long Leave', icon: '🚢',
    text: 'You\'re owed six months\' home leave: the voyage, your family, the shops, the cold. Or you could stay and see the bridge you started finished.',
    options: [
      { id: 'go', label: '🚢 Take your leave' },
      { id: 'stay', label: '🌉 Stay and finish the bridge', hint: 'Your file will say so' },
    ] }) },
  { id: 'club', when: (s, w) => w.expat && yearNow(s) >= 1900, weight: 1, build: (s, w) => ({
    title: 'The Club Votes', icon: '🥃',
    text: `The club in ${cname(w.cc)} is voting on whether to admit local members, starting with a barrister who studied in ${COUNTRIES[w.ruler]?.name ?? 'the mother country'}.`,
    options: [
      { id: 'yes', label: '✅ Vote to admit him' },
      { id: 'no', label: '❌ Vote with the old guard' },
      { id: 'abstain', label: '🤐 Find a reason to be away that night' },
    ] }) },
  { id: 'fever', when: (s, w) => w.expat, weight: 1, build: null },
  { id: 'ceiling', when: (s, w) => !w.expat && (s.career.job?.grade ?? 0) >= 3, weight: 2, build: (s, w) => ({
    title: 'Passed Over', icon: '🪜',
    text: `The senior post you were acting in has gone to a ${rulerAdj(w.ruler)} officer ten years younger. "The service isn't ready," the circular says.`,
    options: [
      { id: 'protest', label: '✍️ Protest formally', hint: 'It goes on your file' },
      { id: 'accept', label: '🙂 Swallow it and carry on' },
      { id: 'resign', label: '🚪 Resign and join the movement', tone: 'danger' },
    ] }) },
  { id: 'papers', when: (s, w) => !w.expat && yearNow(s) >= 1905, weight: 2, build: (s, w) => ({
    title: 'A Friend from the Movement', icon: '📂',
    text: 'An old schoolfriend, now in the independence movement, asks you to pass on the list of men the police plan to arrest next week.',
    options: [
      { id: 'pass', label: '📂 Pass him the list', hint: 'Treason, if they find out', tone: 'danger' },
      { id: 'report', label: '🏛️ Report him to your superiors', hint: 'Loyal service, and a friend in prison' },
      { id: 'refuse', label: '🙅 Refuse, and say nothing' },
    ] }) },
];

function yearEvent(ctx) {
  const { state, rng } = ctx;
  if (!state.era || !colonialJob(state) || state.prompts.some((q) => q.type?.startsWith('colonialLife.'))) return;
  const where = servingIn(state);
  if (!where || !rng.chance(0.45)) return;
  const c = ensure(state);
  const pool = EVENTS.filter((e) => e.when(state, where));
  const ev = rng.weighted(pool, (e) => e.weight);
  if (!ev) return;
  c.lastEvent = ev.id;
  if (ev.id === 'fever') {
    ctx.stat('health', -rng.int(6, 16));
    return ctx.log(`${rng.pick(['Malaria', 'Blackwater fever', 'Dysentery', 'Dengue'])} laid you up for a month in the station bungalow. Two of your colleagues have died of it.`, '🦟', 'bad');
  }
  const b = ev.build(state, where);
  ctx.prompt({ type: `colonialLife.event`, icon: b.icon, title: b.title, text: b.text, options: b.options, data: { id: ev.id, cc: where.cc, expat: where.expat, ruler: where.ruler } });
}

export const ColonialLifeModule = {
  id: 'colonialLife',
  order: 61,
  onAgeUp(ctx) { yearEvent(ctx); },
  resolvers: {
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const rec = recOf(state, data.cc);
      const job = state.career.job;
      const ruler = rulerAdj(data.ruler);
      const loyal = () => { if (!data.expat) rec.loyal = true; };
      const helped = () => { if (!data.expat) { rec.helped = true; rec.pressure = (rec.pressure ?? 0) + 1; } };
      switch (`${data.id}.${optionId}`) {
        case 'dispute.law': perf(state, 2); stand(state, 2); return ctx.log('You ruled by the law. Neither village is happy, which your superiors say means you got it right.', '📜');
        case 'dispute.custom': stand(state, 8); perf(state, -2); helped(); return ctx.log('You sat under the tree with the elders and gave the land back by custom. Word went round the district.', '🌳', 'good');
        case 'dispute.headman': perf(state, 5); stand(state, -8); loyal(); rec.pressure = (rec.pressure ?? 0) + 1; return ctx.log(`The headman got his land. The ${ruler} administration notes your good judgment; the other village notes something else.`, '🤝', 'warn');
        case 'famine.relief': stand(state, 12); perf(state, -6); helped(); ctx.stat('happiness', 3); return ctx.log('You suspended the land tax and opened relief works on the new road. Fewer died in your district than in any other.', '🍲', 'good');
        case 'famine.targets': perf(state, 6); stand(state, -15); loyal(); rec.pressure = (rec.pressure ?? 0) + 2; ctx.stat('happiness', -4); return ctx.log('You met the revenue. The secretariat was pleased. You stopped riding through the villages.', '📈', 'bad');
        case 'unrest.talk':
          stand(state, 10); perf(state, -4); helped();
          if (rng.chance(0.25)) { ctx.stat('health', -6); return ctx.log('You went out alone and talked. A stone caught you above the eye, but the crowd went home, and the Governor sent a sharp note.', '🗣️', 'warn'); }
          return ctx.log('You went out alone and talked. The crowd went home. The Governor sent a sharp note.', '🗣️', 'good');
        case 'unrest.disperse': perf(state, 3); stand(state, -3); return ctx.log('The police cleared the square. Forty arrests, no deaths.', '🚓');
        case 'unrest.charge': {
          perf(state, 4); stand(state, -20); loyal(); rec.pressure = (rec.pressure ?? 0) + 3;
          ctx.stat('stress', 8);
          if (rng.chance(0.4)) {
            ensure(state).inquiries += 1;
            ctx.log('The charge left three dead. There was an inquiry; it found you had acted within your orders. The newspapers in the capital called you a butcher.', '⚔️', 'bad');
            if (ensure(state).inquiries >= 2 && job) { leaveJob(ctx, 'Retired early after a second inquiry'); return ctx.log('After a second inquiry the service retired you early, quietly, on a reduced pension.', '🏛️', 'bad'); }
            return undefined;
          }
          return ctx.log('The charge broke the crowd. Order was restored. The movement had its martyrs\' photographs printed by morning.', '⚔️', 'bad');
        }
        case 'leave.go': {
          const p = postingOf(state);
          if (p) ensure(state).leaveTaken[p.since] = true;
          ctx.stat('happiness', 8); ctx.stat('stress', -10); ctx.stat('health', 4);
          return ctx.log('Six months\' home leave: the long voyage, family dinners, rain. You came back browner than anyone at home and paler than anyone out here.', '🚢', 'good');
        }
        case 'leave.stay': { const p = postingOf(state); if (p) ensure(state).leaveTaken[p.since] = true; perf(state, 6); stand(state, 3); ctx.stat('stress', 4); return ctx.log('You stayed and saw the bridge finished. It\'s in the annual report with your name under it.', '🌉', 'good'); }
        case 'club.yes': stand(state, 6); perf(state, -2); return ctx.log(rng.chance(0.5) ? 'The vote carried by one. The old members resigned in a body and started another club.' : 'The vote failed by four. You were the only officer who voted yes, and everyone knew.', '✅');
        case 'club.no': stand(state, -6); return ctx.log('The vote failed. The barrister went back to his chambers and, a few years later, to the movement.', '❌', 'warn');
        case 'club.abstain': return ctx.log('You found a reason to be up-country that night.', '🤐');
        case 'ceiling.protest': perf(state, -4); stand(state, 6); helped(); return ctx.log('Your protest went on file. Nothing changed, except that the younger officers of your country now come to you.', '✍️');
        case 'ceiling.accept': ctx.stat('happiness', -4); return ctx.log('You swallowed it. It isn\'t the first time and won\'t be the last.', '🙂');
        case 'ceiling.resign':
          rec.joined = true; rec.pressure = (rec.pressure ?? 0) + 2; rec.helped = true;
          if (job) leaveJob(ctx, 'Resigned to join the independence movement');
          ctx.stat('happiness', 4);
          return ctx.log('You resigned from the service and joined the movement. A trained administrator: they put you to work at once.', '✊', 'milestone');
        case 'papers.pass':
          helped(); rec.joined = true;
          if (rng.chance(0.25)) {
            if (job) leaveJob(ctx, 'Dismissed for passing information to the nationalists');
            ctx.emit('legal:offense', { offenseId: 'antiState', caught: true, evidence: 0.7, context: 'passing police lists to the independence movement' });
            return ctx.log('The leak was traced to you. You were dismissed, and charged.', '📂', 'bad');
          }
          return ctx.log('Half the men on the list were gone by the time the police came. Nobody looked at you twice.', '📂', 'good');
        case 'papers.report': loyal(); perf(state, 8); stand(state, -12); ctx.stat('happiness', -6); return ctx.log('You reported him. He got three years. You got a commendation and a cold silence at home.', '🏛️', 'warn');
        default: return ctx.log('You kept out of it.', '🤐');
      }
    },
  },
};

/** How the people of the colony see you (0–100), for the handover. */
export const colonialStanding = (state) => state.colonial?.standing ?? 50;
