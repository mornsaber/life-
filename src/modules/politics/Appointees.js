/**
 * Political appointees: ambassadors who aren't career diplomats. Around a third of American
 * ambassadors are the president's choices — big donors, political allies, eminent friends —
 * and Westminster governments send former ministers and premiers to London, Washington and
 * the other capitals as high commissioners and ambassadors.
 *
 *   Who        a donor of the governing party (a fortune of $2M+ and party membership), a
 *              former office-holder of the governing side, or someone eminent the government
 *              wants abroad
 *   Where      donors get the comfortable posts (Paris, London, Rome); allies anywhere
 *   How        the head of government asks; in the US the Senate must confirm
 *   How long   an American political ambassador resigns when a new president takes office;
 *              elsewhere the appointment runs about four years
 *
 * job.political = { under, since, kind: 'ambassador', country }
 */
import { netWorth, hasFelony } from '../../core/State.js';
import { COUNTRIES } from '../world/Countries.js';
import { OFFICES } from './Offices.js';
import { executiveOf } from './Legislature.js';
import { eminence } from '../world/Honours.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire } from '../career/CareerEngine.js';
import { nationalProfessionId } from '../world/NationalAgencies.js';
import { postAbroad, endPosting } from '../world/Posting.js';
import { regimeOf } from '../world/Regimes.js';

const COMMONWEALTH = ['GB', 'CA', 'AU', 'NZ', 'IN', 'SG', 'NG', 'KE', 'ZA', 'GH', 'MT', 'CY', 'MY', 'PK', 'GM', 'MW', 'MZ', 'PG', 'SB', 'VU', 'BN', 'JM', 'BS', 'BD', 'LK', 'TO'];
/** The posts donors are given. */
const PLUM = ['FR', 'GB', 'IT', 'ES', 'JP', 'IE', 'CA', 'AU', 'NL', 'DE', 'SE', 'SG', 'NZ', 'CH', 'BE'];
const OTHER = ['MX', 'BR', 'IN', 'KR', 'PL', 'TR', 'IL', 'AE', 'KE', 'ZA', 'AR', 'TH', 'PH', 'NG', 'EG', 'ID', 'VN', 'CO'];
export const TERM_YEARS = 4;

const home = (state) => state.character.countryId ?? 'US';
const titleFor = (from, to) => (COMMONWEALTH.includes(from) && COMMONWEALTH.includes(to) ? 'High Commissioner' : 'Ambassador');
/** The head of government who makes the appointment (or null). */
const appointer = (state) => {
  const nat = executiveOf(state, 'national');
  return nat && !nat.you ? nat : null;
};

/** Why the government might send you abroad: 'donor' | 'ally' | 'eminent' | null. */
export function appointeeKind(state) {
  const c = state.character;
  if (c.age < 35 || c.age > 78 || state.royal || state.legal.incarceration || hasFelony(state) || state.military.service) return null;
  if (state.politics?.office || /foreignService/.test(state.career.job?.professionId ?? '') || state.career.job?.political) return null;
  if (regimeOf(home(state)).party) return null; // the Party's own cadres go abroad
  const nat = appointer(state);
  const sameSide = !nat || !state.civic?.party?.bloc || state.civic.party.bloc === nat.caucus;
  if (!sameSide) return null;
  if (netWorth(state) >= 2e6 && state.civic?.party) return 'donor';
  if ((state.politics?.history ?? []).some((h) => (OFFICES[h.officeId]?.level ?? 0) >= 3) && (state.politics.recognition ?? 0) >= 30) return 'ally';
  if (eminence(state) >= 140) return 'eminent';
  return null;
}

export function offer(ctx, { force = false } = {}) {
  const { state, rng } = ctx;
  const kind = appointeeKind(state);
  if (!kind || state.prompts.some((p) => p.type === 'appointees.ambassador')) return;
  if (!force && !rng.chance({ donor: 0.05, ally: 0.04, eminent: 0.02 }[kind])) return;
  const from = home(state);
  const pool = (kind === 'donor' ? PLUM : rng.chance(0.5) ? PLUM : OTHER).filter((cc) => cc !== from && COUNTRIES[cc]);
  const to = rng.pick(pool);
  const nat = appointer(state);
  const t = titleFor(from, to);
  const by = from === 'US' ? `President ${nat?.name ?? ''}`.trim() : nat?.title ? `The ${nat.title}` : 'The government';
  const why = { donor: 'Your fundraising for the party has been noticed.', ally: 'An old political ally wants you in the job.', eminent: 'They want someone of your standing.' }[kind];
  ctx.prompt({
    type: 'appointees.ambassador', icon: '🌐', title: `${t} to ${COUNTRIES[to].name}?`,
    text: `${by} wants to appoint you ${t} to ${COUNTRIES[to].name}, at the embassy in ${COUNTRIES[to].capital}. ${why}${from === 'US' ? ' The Senate must confirm you.' : ''} A political appointment: you serve ${from === 'US' ? 'until the president leaves office' : `about ${TERM_YEARS} years`}, and you'd give up your job.`,
    options: [{ id: 'accept', label: `🌐 Accept`, hint: from === 'US' ? 'Confirmation hearing' : 'Appointed' }, { id: 'decline', label: '🙅 Decline' }],
    data: { to, kind },
  });
}

function serve(ctx) {
  const { state } = ctx;
  const job = state.career.job;
  const p = job?.political;
  if (!p) return;
  const nat = appointer(state);
  const newBoss = home(state) === 'US' && nat && p.under && nat.name !== p.under;
  const done = !newBoss && state.character.age - p.since >= (home(state) === 'US' ? 8 : TERM_YEARS);
  if (!newBoss && !done) return;
  ctx.log(newBoss ? `A new president took office: like every political ambassador, you submitted your resignation. You came home from ${COUNTRIES[p.country]?.name}.` : `Your term as ${job.title} ended. You came home.`, '🌐', 'milestone');
  endPosting(ctx);
  ctx.emit('career:resign', { reason: newBoss ? 'Resigned on the change of administration' : 'End of appointment' });
}

export const AppointeesModule = {
  id: 'appointees',
  order: 34.2,
  onAgeUp(ctx) {
    serve(ctx);
    offer(ctx);
  },
  resolvers: {
    ambassador(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'accept') return ctx.log('You declined the posting.', '🌐', 'info');
      const from = home(state);
      // The Senate's advice and consent: donors with thin résumés and scandals have a harder time.
      if (from === 'US' && !rng.chance(Math.max(0.3, 0.85 - (state.politics?.scandals ?? 0) * 0.15 - (data.kind === 'donor' ? 0.1 : 0)))) {
        return ctx.log('Your nomination stalled in the Senate Foreign Relations Committee and was quietly withdrawn.', '🏛️', 'bad');
      }
      const prof = getProfession(from === 'US' ? 'foreignService' : nationalProfessionId(from, 'foreignService')) ?? getProfession('foreignService');
      const level = prof.levels.find((l) => l.id === 'ambassador') ?? prof.levels.at(-1);
      const employer = createEmployer(rng, state, prof, state.character.regionId);
      const to = COUNTRIES[data.to];
      employer.name = `${COUNTRIES[from]?.demonym ?? 'National'} ${titleFor(from, data.to) === 'High Commissioner' ? 'High Commission' : 'Embassy'}, ${to.capital}`;
      const job = hire(ctx, { professionId: prof.id, levelId: level.id, employer });
      if (!job) return undefined;
      job.title = `${titleFor(from, data.to)} to ${to.name}`;
      job.political = { under: appointer(state)?.name ?? null, since: state.character.age, kind: 'ambassador', country: data.to };
      // Career diplomats bid on posts; a political ambassador was given one.
      state.prompts = state.prompts.filter((p) => p.type !== 'federal.posting');
      ctx.emit('career:posting', { posting: { city: to.capital, country: to.name, hardship: 0, danger: 0, immunity: true, housing: true, political: true } });
      endPosting(ctx);
      postAbroad(ctx, { place: to.capital, country: to.name, kind: 'mission', years: TERM_YEARS });
      ctx.stat('happiness', 10);
      return ctx.log(`${from === 'US' ? 'Confirmed by the Senate, you' : 'You'} presented your credentials in ${to.capital}: ${job.title}. A residence, a car with flags, and a staff of career diplomats who know far more than you do.`, '🌐', 'milestone');
    },
  },
};
