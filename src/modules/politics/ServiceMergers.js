/**
 * Governments restructure their emergency services. Eight Scottish forces
 * became Police Scotland in 2013; NSW Fire Brigades became Fire and Rescue
 * NSW; Victoria's career firefighters were merged into Fire Rescue Victoria;
 * Ontario's town forces were folded into regional police services; Dorset and
 * Wiltshire combined their fire services; American cities and counties
 * consolidate into metropolitan police departments and regional fire
 * authorities.
 *
 * When it happens to the service you work for, your employer changes: your
 * old service becomes an area (or division) of the merged one. Rank and
 * seniority transfer — but there's only one chief, and some take voluntary
 * redundancy instead.
 *
 * state.world.serviceMergers[regionId][service] = { name, from, age }
 */
import { REGIONS } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { getProfession } from '../career/JobTrees.js';
import { leaveJob, demote, promote } from '../career/CareerEngine.js';
import { ladderFor } from '../career/Ladder.js';
import { leavePost, syncPostForLevel } from '../org/Executives.js';
import { attachOrg, orgOf } from '../org/Organizations.js';
import { clamp, Random } from '../../core/Random.js';

export const MERGEABLE = ['police', 'fire', 'ems'];
const SIZES = ['micro', 'small', 'medium', 'large', 'enterprise', 'mega'];
const GB_REGION = { Manchester: 'North West', Birmingham: 'West Midlands Region', 'Truro, Cornwall': 'South West' };
const AU_FIRE = { 'AU-NSW': 'Fire and Rescue NSW', 'AU-VIC': 'Fire Rescue Victoria', 'AU-QLD': 'Queensland Fire and Rescue' };

/**
 * What the merged service is called, by country and service ({ city, stateId, stateName, area }
 * → name), and the precedent the news cites. Missing: services there are already one body
 * (Police Scotland, FENZ, the Nationale Politie, the PNP) or don't merge this way.
 */
export const MERGERS = {
  US: {
    precedent: 'the way Las Vegas, Louisville and Charlotte consolidated',
    police: ({ city }) => `${city} Metropolitan Police Department`,
    fire: ({ city }) => `${city} Regional Fire Authority`,
    ems: ({ city }) => `${city} Regional EMS Authority`,
  },
  GB: {
    precedent: { police: 'as eight Scottish forces became Police Scotland in 2013', fire: 'as Dorset and Wiltshire, and the eight Scottish brigades, merged their fire services' },
    police: ({ stateId, area }) => (stateId === 'GB-WLS' ? 'Police Wales' : stateId === 'GB-ENG' && GB_REGION[area] ? `${GB_REGION[area]} Police` : null),
    fire: ({ stateId, area }) => (stateId === 'GB-WLS' ? 'Fire and Rescue Service Wales' : stateId === 'GB-ENG' && GB_REGION[area] ? `${GB_REGION[area]} Fire and Rescue Service` : null),
  },
  AU: {
    precedent: 'as NSW Fire Brigades became Fire and Rescue NSW, and Fire Rescue Victoria absorbed the career brigades',
    fire: ({ stateId, stateName }) => AU_FIRE[stateId] ?? `${stateName} Fire and Rescue Service`,
  },
  CA: {
    precedent: 'as Ontario folded town forces into regional police services',
    police: ({ city }) => `${city} Regional Police Service`,
    ems: ({ city }) => `${city} Regional Paramedic Services`,
  },
  IE: { precedent: 'under the national fire services reform', fire: ({ stateName }) => `${stateName.split(' (')[0]} Regional Fire and Rescue Service` },
  SE: { precedent: 'as Swedish municipalities pool their räddningstjänst into federations', fire: ({ city }) => `Räddningstjänsten Stor-${city}` },
  JP: { precedent: 'under the national push for wide-area fire departments (広域消防)', fire: ({ city }) => `${city} Wide-Area Fire Department` },
  IT: { precedent: 'as comuni pool their local police in an Unione dei Comuni', police: ({ city }) => `Polizia Locale dell'Unione dei Comuni di ${city}` },
  ES: { precedent: 'as Spanish provinces form fire consortia', fire: ({ city }) => `Consorcio Provincial de Bomberos de ${city}` },
  FR: { precedent: 'as communes pool their municipal police', police: ({ city }) => `Police municipale intercommunale de ${city} Métropole` },
  DE: { precedent: 'as districts pool their ambulance services in a Zweckverband', ems: ({ city }) => `Rettungszweckverband ${city}` },
};

const precedentOf = (cc, service) => { const p = MERGERS[cc].precedent; return typeof p === 'string' ? p : p[service] ?? Object.values(p)[0]; };
const countryOf = (state) => state.character.countryId ?? 'US';
const placeOf = (regionId) => {
  const r = REGIONS[regionId];
  return { city: (r?.name ?? 'City').split(',')[0], area: r?.name ?? 'City', stateId: r?.state, stateName: STATES[r?.state]?.name ?? 'State' };
};

/** The merged service covering this place, if its government has merged it. */
export function mergedService(state, regionId, service) {
  return state.world?.serviceMergers?.[regionId]?.[service]?.name ?? null;
}

/** The name a merger would give this service here (null: none). */
export function mergerName(countryId, regionId, service) {
  const fn = MERGERS[countryId]?.[service];
  return fn ? fn(placeOf(regionId)) : null;
}

/** Your job, if it's in a service that can be merged here. */
function mergeableJob(state, service) {
  const job = state.career.job;
  if (!job || job.professionId !== service || job.onLeave) return null;
  const org = orgOf(state, job.employer);
  // A national body (or one already merged) isn't merged again.
  if (org?.size === 'mega' || job.mergedFrom) return null;
  return job;
}

const isHead = (job) => Boolean(job.headOf) || job.levelId === getProfession(job.professionId)?.levels.at(-1)?.id;

/** The government merges a service where you live. Returns the new name, or null. */
export function mergeService(ctx, service, regionId = ctx.state.character.regionId) {
  const { state } = ctx;
  const cc = countryOf(state);
  const name = mergerName(cc, regionId, service);
  if (!name || mergedService(state, regionId, service)) return null;
  const job = mergeableJob(state, service);
  const from = job?.employer.name ?? null;
  if (job && (job.employer.name === name || job.employer.orgName === name)) return null;
  state.world.serviceMergers ??= {};
  state.world.serviceMergers[regionId] = { ...(state.world.serviceMergers[regionId] ?? {}), [service]: { name, from, age: state.character.age } };
  ctx.log(`📰 The government merged ${from ?? `the local ${service === 'ems' ? 'ambulance' : service} services`} into ${name}, ${precedentOf(cc, service)}.`, service === 'police' ? '🚓' : service === 'fire' ? '🚒' : '🚑', 'milestone');
  if (!job) return name;
  const head = isHead(job);
  ctx.prompt({
    type: 'serviceMergers.transfer', icon: '🏛️', title: `${from} Is Merging`,
    text: `From next year ${from} becomes part of ${name}. Everyone transfers with their rank and seniority${head ? ' — but the merged service will have one chief, and the board is choosing between the old chiefs' : ''}. Some are taking voluntary redundancy instead.`,
    options: [
      ...(head
        ? [{ id: 'compete', label: `🎯 Apply to lead ${name}`, hint: 'Against the other chiefs' }, { id: 'deputy', label: '🤝 Take a deputy post', hint: 'One rank down, pay protected for now' }]
        : [{ id: 'transfer', label: `🔁 Transfer to ${name}`, hint: 'Same rank, seniority kept' }]),
      { id: 'redundancy', label: '📦 Take voluntary redundancy', hint: 'A lump sum: more for long service' },
    ],
    data: { service, regionId, name },
  });
  return name;
}

/** Move your job into the merged service: same rank and seniority, a bigger organization. */
export function transferToMerged(ctx, job, name, regionId) {
  const { state } = ctx;
  const profession = getProfession(job.professionId);
  const employer = job.employer;
  const from = employer.name;
  const { city } = placeOf(regionId);
  // The old service's head post ends with it.
  if (job.headOf) leavePost(state, job, { quiet: true });
  employer.name = name;
  const i = SIZES.indexOf(employer.size);
  // Bigger than either service was (never smaller).
  employer.size = SIZES[Math.max(i, Math.min(SIZES.indexOf('enterprise'), Math.max(i + 1, SIZES.indexOf('large'))))];
  attachOrg(state, employer, profession, regionId);
  // Your old service lives on as an area of the new one.
  if (countryOf(state) !== 'US') employer.division = `${city} ${job.professionId === 'police' ? 'Division' : 'Area'}`;
  job.mergedFrom = from;
  job.supervisorId = null;
  return job;
}

export const ServiceMergerResolvers = {
  transfer(ctx, data, optionId) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!job || job.professionId !== data.service) return;
    if (optionId === 'redundancy') {
      const years = job.yearsAtEmployer ?? 0;
      const pay = Math.round(job.salary * clamp(0.5 + years * 0.04, 0.5, 2));
      leaveJob(ctx, `Voluntary redundancy when ${job.employer.name} merged into ${data.name}`, { fired: false });
      ctx.earn(pay, 'Voluntary redundancy payment', { wage: true });
      return ctx.log(`You took voluntary redundancy: $${pay.toLocaleString()} for ${years} years' service.`, '📦', 'info');
    }
    const salary = job.salary;
    const from = job.employer.name;
    if (optionId === 'compete') {
      const odds = clamp(0.2 + ((job.performance ?? 60) - 60) / 100 + Math.min(job.yearsInLevel ?? 0, 5) * 0.02, 0.1, 0.6);
      transferToMerged(ctx, job, data.name, data.regionId);
      if (rng.chance(odds)) {
        const top = ladderFor(getProfession(job.professionId), job.employer.size).filter((l) => !l.appointed).at(-1);
        if (top && top.id !== job.levelId) promote(ctx, top.id);
        syncPostForLevel(ctx, job);
        ctx.stat('happiness', 8);
        return ctx.log(`The board chose you to lead ${data.name}. ${from} is now one of its areas.`, '🎖️', 'milestone');
      }
      ctx.log(`The board chose another chief to lead ${data.name}.`, '📋', 'warn');
    } else {
      transferToMerged(ctx, job, data.name, data.regionId);
    }
    if (optionId === 'compete' || optionId === 'deputy') {
      demote(ctx, `the merged service has one chief`);
      job.salary = Math.max(job.salary, salary);
      return ctx.log(`You serve ${data.name} as ${job.title}, with your pay protected.`, '🤝', 'info');
    }
    ctx.log(`You transferred to ${data.name} as ${job.title}. Your rank and ${job.yearsAtEmployer ?? 0} years' seniority came with you; ${from} is now ${job.employer.division && job.employer.division !== data.name ? `its ${job.employer.division}` : 'part of it'}.`, '🔁', 'good');
  },
};

export const ServiceMergersModule = {
  id: 'serviceMergers',
  order: 33.7,
  init(state) {
    state.world ??= {};
    state.world.serviceMergers ??= {};
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.career.job) return;
    // Its own stream, so a reorganisation doesn't shift the rest of the life.
    const rng = new Random(((state.world?.seed ?? 1) * 92821 + state.character.age * 173 + 11) >>> 0);
    for (const service of MERGEABLE) {
      if (!mergeableJob(state, service) || !rng.chance(0.015)) continue;
      mergeService(ctx, service);
    }
  },
  resolvers: ServiceMergerResolvers,
};
