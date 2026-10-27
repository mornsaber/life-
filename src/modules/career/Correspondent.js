/**
 * Foreign correspondents. A senior reporter can ask for a bureau abroad: a capital, a
 * conflict, a closed country. The work is the story, and the story has a price.
 *
 *   Bureaus     Washington, London, Brussels, Moscow, Beijing, Jerusalem, Cairo, Kyiv,
 *               Nairobi, Mexico City, New Delhi, Istanbul. Three-year postings.
 *   The story   Once a year: publish what you found, soften it, or go to the front line.
 *               Where the press isn't free, a hard story means expulsion, or arrest (held for
 *               months as a bargaining chip, then traded). In a war zone, the risk is the
 *               war itself.
 *   Prizes      Scoops build a name: the Pulitzer for International Reporting (US), the
 *               Orwell Prize (UK), the Prix Albert-Londres (France), the Henri Nannen Prize
 *               (Germany), the Bayeux Prize for war correspondents, and the CPJ's
 *               International Press Freedom Award for those who were jailed for it.
 *
 * job.bureau = { id, until, scoops, expelled }
 */
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { postAbroad, endPosting, postingOf } from '../world/Posting.js';
import { regimeOf } from '../world/Regimes.js';
import { COUNTRIES } from '../world/Countries.js';

export const BUREAUS = {
  washington: { city: 'Washington', cc: 'US' },
  london: { city: 'London', cc: 'GB' },
  brussels: { city: 'Brussels', cc: 'BE' },
  moscow: { city: 'Moscow', cc: 'RU' },
  beijing: { city: 'Beijing', cc: 'CN' },
  jerusalem: { city: 'Jerusalem', cc: 'IL', war: 0.4 },
  cairo: { city: 'Cairo', cc: 'EG' },
  kyiv: { city: 'Kyiv', cc: 'UA', war: 1 },
  nairobi: { city: 'Nairobi', cc: 'KE', war: 0.2 },
  mexico: { city: 'Mexico City', cc: 'MX', war: 0.15 },
  delhi: { city: 'New Delhi', cc: 'IN' },
  istanbul: { city: 'Istanbul', cc: 'TR' },
};
const PRIZES = {
  US: 'Pulitzer Prize for International Reporting',
  GB: 'Orwell Prize for Journalism',
  FR: 'Prix Albert-Londres',
  DE: 'Henri Nannen Prize',
  '*': 'national press award for foreign reporting',
};
const isReporter = (job) => job?.professionId === 'journalism';
const senior = (job) => isReporter(job) && ['senior', 'investigative', 'columnist', 'editor'].includes(job.levelId);

export function bureauCheck(state) {
  const job = state.career.job;
  if (!isReporter(job)) return { ok: false, reason: 'Journalists only' };
  if (!senior(job)) return { ok: false, reason: 'Senior reporters get the foreign bureaus' };
  if (job.bureau?.until > state.character.age) return { ok: false, reason: 'Already abroad' };
  if (postingOf(state)) return { ok: false, reason: 'Already posted abroad' };
  if (yearlyCount(state, 'correspondent.ask')) return { ok: false, reason: 'Once a year' };
  return { ok: true };
}
export const bureausFor = (state) => Object.entries(BUREAUS).filter(([, b]) => b.cc !== (state.character.countryId ?? 'US'));
const name = (cc) => COUNTRIES[cc]?.name ?? cc;

function prize(ctx, cc) {
  const { state } = ctx;
  const home = state.character.countryId ?? 'US';
  const title = PRIZES[home] ?? PRIZES['*'];
  if (state.honors.some((h) => h.id === 'press.prize')) return;
  addHonor(state, { id: 'press.prize', source: 'civil', name: title, icon: '📰', prestige: 20, precedence: 15, citation: `For reporting from ${name(cc)}.` });
  ctx.log(`Your reporting from ${name(cc)} won the ${title}.`, '📰', 'honor');
}

function bureauYear(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const b = job?.bureau;
  if (!isReporter(job) || !b) return;
  if (state.character.age >= b.until) {
    if (postingOf(state)) endPosting(ctx, `Your three years in ${BUREAUS[b.id].city} ended. You came home to the desk.`);
    job.bureau = null;
    return;
  }
  if (state.prompts.some((p) => p.type?.startsWith('correspondent.'))) return;
  const bureau = BUREAUS[b.id];
  const war = bureau.war ?? 0;
  ctx.prompt({ type: 'correspondent.story', icon: '📰', title: `The ${bureau.city} Story`, text: rng.pick([
    'A source inside a ministry hands you documents about where the money really went.',
    'You have the names of officers behind a massacre that the government denies happened.',
    'A dissident wants to tell you everything, on the record, knowing what it may cost them.',
    'Your fixer can get you to a town nobody has reported from in months.',
  ]), options: [
    { id: 'publish', label: '📰 Publish it all', hint: regimeOf(bureau.cc).press === 'free' ? 'The story of the year' : 'In a closed country, a risk', tone: regimeOf(bureau.cc).press === 'free' ? undefined : 'danger' },
    { id: 'soften', label: '✂️ Publish a careful version', hint: 'Safer; less impact' },
    ...(war ? [{ id: 'front', label: '🪖 Go to the front line', hint: 'War reporting', tone: 'danger' }] : []),
  ], data: { bureau: b.id } });
}

export const CorrespondentModule = {
  id: 'correspondent',
  order: 52.5,
  onAgeUp(ctx) {
    if (ctx.state.character.alive) bureauYear(ctx);
  },
  actions: {
    /** Ask the foreign desk for a bureau (arg: bureau id). */
    ask(ctx, id) {
      const { state, rng } = ctx;
      const check = bureauCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'correspondent.ask');
      const bureau = BUREAUS[id];
      if (!bureau || bureau.cc === state.character.countryId) return ctx.toast('Pick a bureau abroad', 'warn');
      const job = state.career.job;
      if (!rng.chance(clamp(0.45 + (job.performance ?? 60) / 200, 0.3, 0.9))) return ctx.log(`The foreign editor gave ${bureau.city} to someone else this year.`, '📰', 'bad');
      job.bureau = { id, until: state.character.age + 3, scoops: 0 };
      postAbroad(ctx, { place: bureau.city, kind: 'tour', years: 3, country: name(bureau.cc) });
      return ctx.log(`You are the new ${bureau.city} correspondent. You flew out with two suitcases and a satellite phone.`, '🌍', 'milestone');
    },
  },
  resolvers: {
    story(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!job?.bureau) return undefined;
      const bureau = BUREAUS[data.bureau];
      const r = regimeOf(bureau.cc);
      const closed = r.press !== 'free';
      if (optionId === 'soften') {
        job.performance = Math.min(100, (job.performance ?? 60) + 2);
        return ctx.log('A careful version ran. Your editor called it solid; your source called it timid.', '✂️', 'info');
      }
      if (optionId === 'front') {
        ctx.stat('stress', 12);
        if (rng.chance(0.03 * (bureau.war ?? 0.2) + 0.01)) {
          addHonor(state, { id: 'press.fallen', source: 'civil', name: 'Named on the Journalists\' Memorial', icon: '🕯️', prestige: 10, posthumous: true, citation: `Killed reporting from the front in ${name(bureau.cc)}.` });
          ctx.log(`You were killed by shelling while reporting from the front. Your last dispatch ran the next morning.`, '🕯️', 'bad');
          return ctx.die(`Killed reporting from the front line in ${name(bureau.cc)}`);
        }
        if (rng.chance(0.15)) { ctx.stat('health', -rng.int(10, 30)); ctx.log('Your car was hit by shrapnel. You were wounded, and filed the story from a field hospital.', '🪖', 'bad'); }
        job.bureau.scoops += 1;
        if (job.bureau.scoops >= 2 && rng.chance(0.25)) addHonor(state, { id: 'press.bayeux', source: 'civil', name: 'Bayeux Calvados-Normandy Award for War Correspondents', icon: '🪖', prestige: 14, precedence: 16, citation: `For reporting from the front in ${name(bureau.cc)}.` });
        return ctx.log('Your dispatches from the front line ran on the front page for a week.', '🪖', 'good');
      }
      // Publish it all.
      job.bureau.scoops += 1;
      job.performance = Math.min(100, (job.performance ?? 60) + 6);
      if (closed && rng.chance(r.kind === 'democracy' ? 0.05 : 0.3)) {
        if (rng.chance(0.5)) {
          endPosting(ctx, null);
          job.bureau = { ...job.bureau, until: state.character.age, expelled: true };
          return ctx.log(`${name(bureau.cc)} revoked your accreditation and gave you a week to leave. The story ran everywhere.`, '🛂', 'warn');
        }
        const months = rng.int(6, 18);
        ctx.stat('health', -10);
        ctx.stat('happiness', -20);
        addHonor(state, { id: 'press.cpj', source: 'civil', name: 'CPJ International Press Freedom Award', icon: '🗽', prestige: 15, precedence: 14, citation: 'For courage in reporting, at the cost of liberty.' });
        ctx.log(`You were arrested on espionage charges and held for ${months} months, a bargaining chip, until a prisoner exchange brought you home.`, '⛓️', 'bad');
        endPosting(ctx, null);
        job.bureau = { ...job.bureau, until: state.character.age };
        return undefined;
      }
      ctx.log('The story led the paper and was picked up around the world.', '📰', 'good');
      if (job.bureau.scoops >= 3 && rng.chance(0.3)) prize(ctx, bureau.cc);
      return undefined;
    },
  },
};
