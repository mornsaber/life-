/**
 * International service: secondments abroad from your job at home.
 *
 *   UN Police      a year with a UN peace operation (UNMISS in South Sudan,
 *                  MINUSCA, UNFICYP in Cyprus, UNMIK in Kosovo, BINUH in Haiti)
 *   Interpol       two years at the General Secretariat in Lyon, the Global
 *                  Complex for Innovation in Singapore or a regional bureau
 *   Europol        The Hague, for officers from EU countries
 *   Pacific        a regional assistance mission (Australian and NZ police)
 *   UN agencies    OCHA disaster response for emergency managers, WHO
 *                  country offices for public-health staff
 *
 * You keep your job, rank and pay; the mission adds an allowance. You live
 * where you're posted for the duration (world/Posting), and come home with
 * the mission's medal — and sometimes the host country's thanks.
 *
 * state.career.job.secondment = { id, until }
 */
import { clamp } from '../../core/Random.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { postAbroad, endPosting } from '../world/Posting.js';

const EU = ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'IE'];
const POLICE = (job) => Boolean(job?.abilities?.includes('arrest'));
const M = (o) => ({ years: 1, allowance: 28000, risk: 0.02, minYears: 4, ...o });

export const MISSIONS = {
  unmiss: M({ org: 'UN Police', name: 'UNMISS — South Sudan', place: 'Juba', country: 'South Sudan', who: POLICE, risk: 0.06, medal: 'UN Medal (UNMISS)' }),
  minusca: M({ org: 'UN Police', name: 'MINUSCA — Central African Republic', place: 'Bangui', country: 'Central African Republic', who: POLICE, risk: 0.06, medal: 'UN Medal (MINUSCA)' }),
  unficyp: M({ org: 'UN Police', name: 'UNFICYP — Cyprus', place: 'Nicosia', country: 'Cyprus', who: POLICE, risk: 0, allowance: 20000, medal: 'UN Medal (UNFICYP)' }),
  unmik: M({ org: 'UN Police', name: 'UNMIK — Kosovo', place: 'Pristina', country: 'Kosovo', who: POLICE, risk: 0.01, medal: 'UN Medal (UNMIK)' }),
  binuh: M({ org: 'UN Police', name: 'BINUH — Haiti', place: 'Port-au-Prince', country: 'Haiti', who: POLICE, risk: 0.05, medal: 'UN Medal (BINUH)' }),
  interpolLyon: M({ org: 'Interpol', name: 'Interpol General Secretariat', place: 'Lyon', country: 'France', who: POLICE, years: 2, minYears: 6, allowance: 24000, risk: 0, medal: null }),
  interpolSingapore: M({ org: 'Interpol', name: 'Interpol Global Complex for Innovation (cybercrime)', place: 'Singapore', country: 'Singapore', who: POLICE, years: 2, minYears: 6, allowance: 26000, risk: 0, medal: null }),
  interpolNairobi: M({ org: 'Interpol', name: 'Interpol Regional Bureau for East Africa', place: 'Nairobi', country: 'Kenya', who: POLICE, years: 2, minYears: 6, risk: 0.01, medal: null }),
  europol: M({ org: 'Europol', name: 'Europol liaison bureau', place: 'The Hague', country: 'Netherlands', who: (job, cc) => POLICE(job) && EU.includes(cc), years: 2, minYears: 5, allowance: 18000, risk: 0, medal: null }),
  pacific: M({ org: 'Pacific policing mission', name: 'Regional assistance mission — Solomon Islands', place: 'Honiara', country: 'Solomon Islands', who: (job, cc) => POLICE(job) && ['AU', 'NZ'].includes(cc), risk: 0.01, medal: 'Solomon Islands Regional Assistance Mission Medal' }),
  ocha: M({ org: 'UN OCHA', name: 'UN Disaster Assessment and Coordination team', place: 'Port Vila', country: 'Vanuatu', who: (job) => job?.professionId === 'emergencyManagement', minYears: 3, risk: 0.01, medal: null }),
  who: M({ org: 'World Health Organization', name: 'WHO outbreak response', place: 'Goma', country: 'DR Congo', who: (job) => job?.professionId === 'publicHealth', minYears: 3, risk: 0.03, medal: null }),
};

/** Host countries' thanks to foreigners who served there. */
const HOST_HONOURS = {
  France: 'Médaille d\'honneur de la Police nationale (foreign recipient)', Singapore: 'Pingat Bakti Masyarakat (Public Service Medal, honorary)', Kenya: 'Order of the Grand Warrior of Kenya (honorary)',
  Netherlands: 'Europol Award for Outstanding Cooperation', Kosovo: 'Kosovo Police Medal of Merit', Cyprus: 'Cyprus Police Commendation', Haiti: 'Haitian National Police Commendation',
  'Solomon Islands': 'Solomon Islands Police Commendation', 'South Sudan': 'South Sudan National Police Service Commendation', Vanuatu: 'Vanuatu Independence Medal (honorary)',
};

const yearsInField = (state, job) => (job?.yearsAtEmployer ?? 0) + (state.career.history ?? []).filter((h) => h.professionId === job?.professionId).reduce((s, h) => s + Math.max(0, (h.endAge ?? 0) - (h.startAge ?? 0)), 0);

/** Can you go on this mission? */
export function missionEligibility(state, id) {
  const m = MISSIONS[id];
  const job = state.career.job;
  const cc = state.character.countryId ?? 'US';
  if (!m || !job) return { ok: false, reason: 'Needs a job' };
  if (!m.who(job, cc)) return { ok: false, reason: `Not open to ${job.title}s` };
  if (job.secondment) return { ok: false, reason: 'Already on a secondment' };
  if (state.character.posting) return { ok: false, reason: 'Already posted abroad' };
  if (job.probationLeft) return { ok: false, reason: 'Finish your probation first' };
  if (yearsInField(state, job) < m.minYears) return { ok: false, reason: `Needs ${m.minYears} years' experience` };
  if (job.performance < 55) return { ok: false, reason: 'Needs a strong record (performance 55+)' };
  if ((state.career.lastSecondment ?? -99) + 4 > state.character.age) return { ok: false, reason: 'One secondment every few years' };
  if (yearlyCount(state, 'intl.apply')) return { ok: false, reason: 'You applied this year' };
  return { ok: true, odds: clamp(0.35 + (job.performance - 55) / 90 + (state.stats.smarts - 50) / 300, 0.15, 0.85) };
}

export const openMissions = (state) => Object.keys(MISSIONS).filter((id) => MISSIONS[id].who(state.career.job, state.character.countryId ?? 'US'));

function finish(ctx, job) {
  const { state, rng } = ctx;
  const m = MISSIONS[job.secondment.id];
  job.secondment = null;
  state.career.lastSecondment = state.character.age;
  endPosting(ctx);
  ctx.log(`Your secondment with ${m.org} (${m.name}) ended. You came home to your job as ${job.title}, with stories nobody at the station believes.`, '🌐', 'milestone');
  if (m.medal) addHonor(state, { id: `intl.${m.medal}`, source: 'international', name: m.medal, icon: '🇺🇳', precedence: 7, prestige: 6, citation: `For service with ${m.name}.` });
  if (HOST_HONOURS[m.country] && job.performance >= 70 && rng.chance(0.25)) {
    addHonor(state, { id: `foreign.${m.country}`, source: 'foreign', from: m.country, name: HOST_HONOURS[m.country], icon: '🎖️', precedence: 8, prestige: 8, citation: `Awarded by ${m.country} for service with ${m.name}.` });
    ctx.log(`${m.country} decorated you: ${HOST_HONOURS[m.country]}.`, '🎖️', 'honor');
  }
  job.performance = Math.round(clamp(job.performance + 6, 0, 100));
}

export const IntlServiceModule = {
  id: 'intl',
  order: 31,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!job?.secondment) return;
    const m = MISSIONS[job.secondment.id];
    if (!m) { job.secondment = null; return; }
    ctx.earn(m.allowance, `${m.org} mission allowance`);
    ctx.stat('stress', m.risk ? 6 : 2);
    job.performance = Math.round(clamp(job.performance + 2, 0, 100));
    if (m.risk && rng.chance(m.risk)) {
      ctx.stat('health', -rng.int(8, 25));
      ctx.log(`${m.place}: your convoy was caught in unrest. You were hurt, but you'll recover.`, '🩹', 'bad');
    } else ctx.log(rng.pick([
      `${m.place}: you mentored local officers through their first big investigation.`,
      `${m.place}: a long year of patrols, reports and meetings — and colleagues from twenty countries.`,
      `${m.place}: you learned more about policing in a year abroad than in five at home.`,
    ]), '🌐');
    if (state.character.age >= job.secondment.until) finish(ctx, job);
  },
  actions: {
    /** arg: mission id */
    apply(ctx, id) {
      const { state, rng } = ctx;
      const check = missionEligibility(state, id);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'intl.apply');
      const m = MISSIONS[id];
      if (!rng.chance(check.odds)) return ctx.log(`You applied to ${m.org} (${m.name}). The selection panel chose other candidates this round.`, '📭', 'warn');
      const job = state.career.job;
      job.secondment = { id, until: state.character.age + m.years };
      postAbroad(ctx, { place: m.place, country: m.country, kind: 'secondment', years: m.years });
      ctx.log(`Selected! You're seconded to ${m.org} — ${m.name} — for ${m.years === 1 ? 'a year' : `${m.years} years`}, based in ${m.place}, ${m.country}. ${job.employer.name} holds your job.`, '🌐', 'milestone');
      return undefined;
    },
  },
};
