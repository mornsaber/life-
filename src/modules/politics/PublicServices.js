/**
 * Politics decides who delivers public services — and whether they exist at all.
 *
 * Every government runs a set of services, each in its own department. A city
 * runs police, fire, ambulances, 911 dispatch, a jail, transit, libraries,
 * animal control, a health department and sanitation; a state runs its prisons,
 * state police and wildland fire agency; a country its federal prisons, the
 * post office and its federal agencies. Each can be:
 *
 *   own         run by the government itself
 *   contracted  bought from another government (the county sheriff, a regional
 *               fire district, a consolidated 911 center, the RCMP)
 *   private     contracted to a company (a private police or fire company, a
 *               private ambulance operator, a private prison firm) — where the
 *               law allows it (Laws: privatePolicing, privateEms, privatePrisons,
 *               privateFire)
 *   volunteer   handed to a volunteer company (fire only)
 *   merged      folded into another department (EMS into the fire department,
 *               the ATF into the FBI)
 *   abolished   ended (a state police force whose patrols go to the sheriffs,
 *               the city's libraries)
 *
 * Mayors, governors and presidents (or prime ministers) change arrangements;
 * councils and legislatures sometimes do on their own, more often when the
 * budget is short. Each arrangement changes what the service costs (Budgets),
 * how much of it there is, and who works there: the staff transfer to the new
 * provider — at their rank where there's a place, otherwise one lower — or take
 * severance. When a government takes a service back, the provider's people who
 * covered the place are invited across a rank up.
 *
 * Cities: state.world.municipal[regionId] = { [service]: arrangement }
 * States and countries: state.world.services[`${level}:${where}`] = { [service]: arrangement }
 */
import { regimeHere } from '../world/Regimes.js';
import { REGIONS } from '../life/Regions.js';
import { STATES } from '../life/States.js';
import { getProfession, PROFESSIONS, setAvailabilityFilter } from '../career/JobTrees.js';
import { agencyExists } from '../world/LocalAgencies.js';
import { hire, leaveJob } from '../career/CareerEngine.js';
import { createEmployer } from '../career/Employers.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { lawValue } from './Laws.js';
import { budgetAt, whereAt, executiveLevel, ARRANGEMENT_COST, setArrangementLookup, jurisdictionName } from './Budgets.js';
import { executiveOf } from './Legislature.js';

/** How each arrangement changes a service: what it costs and how much of it there is. */
export const ARRANGEMENTS = {
  own: { label: 'Run in-house', icon: '🏛️', cost: ARRANGEMENT_COST.own, quality: 1 },
  contracted: { label: 'Contracted to another government', icon: '📃', cost: ARRANGEMENT_COST.contracted, quality: 0.92 },
  private: { label: 'Privatized', icon: '🏢', cost: ARRANGEMENT_COST.private, quality: 0.88 },
  volunteer: { label: 'Volunteer company', icon: '🙋', cost: ARRANGEMENT_COST.volunteer, quality: 0.72 },
  merged: { label: 'Merged into another department', icon: '🔗', cost: ARRANGEMENT_COST.merged, quality: 0.95 },
  abolished: { label: 'Abolished', icon: '🚫', cost: ARRANGEMENT_COST.abolished, quality: 0 },
};

/** Who takes a city's police or fire service under contract, by country. */
const CONTRACT_PROVIDERS = {
  US: { police: { name: 'the county sheriff', profession: 'sheriff' }, fire: { name: 'the county fire district', profession: 'fire' } },
  CA: { police: { name: 'the RCMP (provincial policing contract)', profession: 'statePolice', ON: { name: 'the Ontario Provincial Police', profession: 'statePolice' } }, fire: { name: 'a regional fire service', profession: 'fire' } },
  FR: { police: { name: 'the Police nationale and Gendarmerie alone', profession: 'statePolice' } },
  IT: { police: { name: 'the Carabinieri', profession: 'statePolice' } },
  MX: { police: { name: 'the state police (mando único)', profession: 'statePolice' } },
};

/**
 * The services, by level. `profession` is the career that staffs it; `area` the budget line
 * it's paid from and `share` its part of that line; `options` the arrangements open to it, each
 * with its provider (`name`, the `profession` its staff transfer into, and the `law` that must
 * allow a private provider).
 */
export const CATALOG = {
  police: { level: 'city', area: 'police', share: 0.8, profession: 'police', icon: '🚓', label: 'Policing', popular: 1,
    options: { contracted: { provider: 'contract' }, private: { name: 'a private police company', profession: 'privatePolice', law: ['privatePolicing', 'contracting'] } } },
  fire: { level: 'city', area: 'fire', share: 0.95, profession: 'fire', icon: '🚒', label: 'Fire protection', popular: 1,
    options: { contracted: { provider: 'contract' }, volunteer: { name: 'a volunteer fire company', profession: null }, private: { name: 'a private fire company', profession: 'privateFire', law: ['privateFire', true] } } },
  ems: { level: 'city', area: 'ems', share: 1, profession: 'ems', icon: '🚑', label: 'Ambulance service', popular: 0.9,
    options: { merged: { name: 'the fire department (fire-based EMS)', profession: 'fire' }, private: { name: 'a private ambulance company', profession: 'privateEms', law: ['privateEms', 'open'] } } },
  dispatch: { level: 'city', area: 'police', share: 0.08, profession: 'dispatch', icon: '📟', label: '911 dispatch', popular: 0.4,
    options: { contracted: { name: 'the county\'s consolidated 911 center', profession: 'dispatch' } } },
  jail: { level: 'city', area: 'police', share: 0.12, profession: 'jail', icon: '🔐', label: 'The jail', popular: 0.2,
    options: { private: { name: 'a private jail operator', profession: 'privatePrisons', law: ['privatePrisons', 'state'] } } },
  transit: { level: 'city', area: 'transit', share: 1, profession: 'transit', icon: '🚌', label: 'Public transit', popular: 0.6,
    options: { private: { name: 'a private transit operator', profession: 'paratransit' }, abolished: { name: null, profession: null } } },
  library: { level: 'city', area: 'parks', share: 0.4, profession: 'library', icon: '📚', label: 'Public libraries', popular: 0.7,
    options: { abolished: { name: null, profession: null } } },
  animalControl: { level: 'city', area: 'health', share: 0.25, profession: 'animalControl', icon: '🐕', label: 'Animal control', popular: 0.3,
    options: { contracted: { name: 'the county humane society', profession: null } } },
  publicHealth: { level: 'city', area: 'health', share: 0.75, profession: 'publicHealth', icon: '🩺', label: 'Public health department', popular: 0.5,
    options: { contracted: { name: 'the state health department', profession: 'publicHealth' } } },
  sanitation: { level: 'city', area: 'works', share: 0.35, profession: 'publicWorks', icon: '🗑️', label: 'Sanitation & street crews', popular: 0.5,
    options: { private: { name: 'a private waste hauler', profession: 'trucking' } } },
  prisons: { level: 'state', area: 'corrections', share: 0.85, profession: 'corrections', icon: '🔒', label: 'Prisons', popular: 0.2,
    options: { private: { name: 'a private prison company', profession: 'privatePrisons', law: ['privatePrisons', 'state'] } } },
  statePolice: { level: 'state', area: 'police', share: 0.8, profession: 'statePolice', icon: '🚔', label: 'State police', popular: 0.8,
    options: { abolished: { name: 'the county sheriffs', profession: 'sheriff' } } },
  stateFire: { level: 'state', area: 'environment', share: 0.5, profession: 'stateFire', icon: '🔥', label: 'Wildland fire agency', popular: 0.7,
    options: { contracted: { name: 'county fire districts', profession: 'fire' } } },
  federalPrisons: { level: 'national', area: 'policing', share: 0.25, profession: 'federalPrisons', icon: '⛓️', label: 'Federal prisons', popular: 0.2,
    options: { private: { name: 'a private prison company', profession: 'privatePrisons', law: ['privatePrisons', 'federal'] } } },
  postal: { level: 'national', area: 'admin', share: 0.3, profession: 'postal', icon: '📮', label: 'The postal service', popular: 0.7,
    options: { private: { name: 'a privatized postal company', profession: 'logistics' } } },
  tsa: { level: 'national', area: 'policing', share: 0.12, profession: 'tsa', icon: '🛄', label: 'Airport screening', popular: 0.4, us: true,
    options: { private: { name: 'private screening contractors', profession: 'privateSecurity' } } },
  atf: { level: 'national', area: 'policing', share: 0.06, profession: 'atf', icon: '🔫', label: 'The ATF', popular: 0.3, us: true,
    options: { merged: { name: 'the FBI', profession: 'fbi' } } },
  dea: { level: 'national', area: 'policing', share: 0.1, profession: 'dea', icon: '💊', label: 'The DEA', popular: 0.4, us: true,
    options: { merged: { name: 'the FBI', profession: 'fbi' } } },
};
/** The city services (kept for the old police/fire callers). */
export const SERVICES = Object.keys(CATALOG).filter((id) => CATALOG[id].level === 'city');
const LABEL = { police: 'police department', fire: 'fire department' };
const deptLabel = (service) => {
  const label = LABEL[service] ?? CATALOG[service]?.label ?? service;
  const bare = label.replace(/^the /i, '');
  // Acronyms keep their capitals ("the DEA"), other names read in lower case.
  return /^[A-Z]{2,}\b/.test(bare) ? bare : bare.toLowerCase();
};

const cc = (state) => state.character.countryId ?? 'US';
const cityName = (regionId) => REGIONS[regionId]?.name?.split(',')[0] ?? 'the city';

/** The contract provider for a city's police or fire service (null where cities can't contract). */
export const providerOf = (state, service) => {
  const p = CONTRACT_PROVIDERS[cc(state)]?.[service];
  if (!p) return null;
  const province = REGIONS[state.character.regionId]?.state?.split('-')[1];
  return p[province] ?? p;
};
/** Who would provide a service under an arrangement here: { name, profession } (null: nobody). */
export function providerFor(state, service, arrangement) {
  const opt = CATALOG[service]?.options[arrangement];
  if (!opt) return null;
  if (opt.provider === 'contract') return providerOf(state, service);
  return { name: opt.name, profession: opt.profession };
}

/** Where a service's government is, for someone living here. */
const whereOf = (state, service, regionId = state.character.regionId) => (CATALOG[service].level === 'city' ? regionId : whereAt(state, CATALOG[service].level));
const bookOf = (state, service, where) => {
  const level = CATALOG[service].level;
  if (level === 'city') return state.world?.municipal?.[where];
  return state.world?.services?.[`${level}:${where}`];
};

/** How a service is delivered where you live. */
export function arrangementOf(state, service, regionId = state.character.regionId) {
  if (!CATALOG[service]) return 'own';
  return bookOf(state, service, whereOf(state, service, regionId))?.[service] ?? 'own';
}
function setArrangement(state, service, value, where) {
  const level = CATALOG[service].level;
  state.world ??= {};
  if (level === 'city') {
    state.world.municipal ??= {};
    state.world.municipal[where] = { ...(state.world.municipal[where] ?? {}), [service]: value };
  } else {
    state.world.services ??= {};
    const key = `${level}:${where}`;
    state.world.services[key] = { ...(state.world.services[key] ?? {}), [service]: value };
  }
}

/** Does the law allow a private provider for this option? */
export function lawAllows(state, opt) {
  if (!opt?.law) return true;
  const [lawId, need] = opt.law;
  const v = lawValue(state, lawId);
  if (need === 'state' || need === 'federal') return Boolean(v?.[need]);
  return v === need;
}

/** Does this service exist where you live (the career it needs is here, and it's a national service of this country)? */
export function serviceHere(state, service) {
  const s = CATALOG[service];
  if (!s) return false;
  if (s.us && cc(state) !== 'US') return false;
  const province = REGIONS[state.character.regionId]?.state;
  return cc(state) === 'US' || agencyExists(cc(state), s.profession, province);
}

/** Can this city choose how it polices (or fights fires)? Only where local forces exist. */
export function canChoose(state, service) {
  if (!serviceHere(state, service)) return false;
  if ((service === 'police' || service === 'fire') && !providerOf(state, service) && cc(state) !== 'US') return false;
  return Object.keys(CATALOG[service].options).some((a) => providerFor(state, service, a) || a === 'abolished' || a === 'volunteer');
}

/** The arrangements open to the executive now: [{ to, label, ok, reason, effect }]. */
export function choicesFor(state, service) {
  const s = CATALOG[service];
  const now = arrangementOf(state, service);
  if (now !== 'own') {
    return [{ to: 'own', label: `🏛️ Bring ${s.label.toLowerCase()} back in-house`, ok: true, effect: 'Popular, but costs money to stand up · new public jobs' }];
  }
  return Object.entries(s.options).map(([to, opt]) => {
    const p = providerFor(state, service, to);
    const a = ARRANGEMENTS[to];
    const allowed = lawAllows(state, opt);
    const label = to === 'abolished' ? `🚫 Abolish ${s.label.toLowerCase()}${p?.name ? ` (duties to ${p.name})` : ''}` : `${a.icon} ${to === 'merged' ? 'Merge into' : to === 'volunteer' ? 'Hand to' : 'Contract to'} ${p?.name ?? 'a provider'}`;
    const saves = Math.round((1 - a.cost) * 100);
    return { to, label, ok: allowed && (Boolean(p) || to === 'abolished' || to === 'volunteer'), reason: allowed ? (p || to === 'abolished' || to === 'volunteer' ? null : 'No provider here') : `The law doesn't allow it (${opt.law[0] === 'privatePrisons' ? 'private prisons are banned' : opt.law[0] === 'privateFire' ? 'private fire companies are banned' : opt.law[0] === 'privateEms' ? 'cities can\'t contract 911 ambulances to companies' : 'private policing contracts aren\'t allowed'})`, effect: `Saves ~${saves}% of its cost · ${a.quality ? `${Math.round(a.quality * 100)}% of the service` : 'no service'}` };
  });
}

/** The mayor's choice for a city service (kept for police/fire callers): { ok, reason, action, label, effect }. */
export function mayorChoice(state, service) {
  const office = state.politics?.office;
  if (office?.id !== 'mayor' && !/mayor/i.test(office?.id ?? '')) return { ok: false, reason: 'Mayors only' };
  return executiveChoice(state, service);
}
/** Any executive's choice for a service at their level. */
export function executiveChoice(state, service) {
  const s = CATALOG[service];
  if (!s) return { ok: false, reason: 'Unknown service' };
  const level = executiveLevel(state.politics?.office?.id) ?? (/mayor/i.test(state.politics?.office?.id ?? '') ? 'city' : null);
  if (level !== s.level) return { ok: false, reason: `Decided by the ${s.level === 'city' ? 'mayor' : s.level === 'state' ? 'governor' : 'national government'}` };
  if (!canChoose(state, service)) return { ok: false, reason: 'Not delivered by government here' };
  if (yearlyCount(state, `municipal.${service}`)) return { ok: false, reason: 'One change a year' };
  const options = choicesFor(state, service);
  const first = options.find((o) => o.ok) ?? options[0];
  if (!first) return { ok: false, reason: 'No other arrangement here' };
  return { ok: first.ok, reason: first.reason, action: first.to === 'own' ? 'establish' : first.to === 'contracted' ? 'contract' : first.to, to: first.to, label: first.label, effect: first.effect, options };
}

/* ------------------------------------------------------------------ */
/* Changing a service                                                  */
/* ------------------------------------------------------------------ */

const isStaffedBy = (job, service) => job && job.professionId === CATALOG[service].profession;
/** Your job is in this government's version of the service. */
function staffHere(state, job, service, where) {
  if (!isStaffedBy(job, service)) return false;
  const s = CATALOG[service];
  if (s.level === 'city') {
    const regionId = where;
    return job.sector === 'municipal' && ((job.employer.cityName ?? REGIONS[job.employer.regionId]?.name) === REGIONS[regionId]?.name || job.employer.name.includes(cityName(regionId)) || job.employer.regionId === regionId);
  }
  if (s.level === 'state') return (REGIONS[job.employer.regionId ?? state.character.regionId]?.state ?? whereAt(state, 'state')) === where;
  return true;
}

/** Change how a service is delivered — by the executive or a council/legislature vote — and deal with the staff. */
export function changeService(ctx, service, to, { byMayor = false, byExecutive = byMayor, regionId = ctx.state.character.regionId } = {}) {
  const { state } = ctx;
  const s = CATALOG[service];
  if (!s) return;
  // A state that owns everything doesn't privatize, merge or abolish on a council vote.
  if (to !== 'own' && regimeHere(state).business === 'state') return;
  const where = s.level === 'city' ? regionId : whereAt(state, s.level);
  const from = arrangementOf(state, service, regionId);
  const p = providerFor(state, service, to === 'own' ? from : to);
  const place = s.level === 'city' ? cityName(where) : jurisdictionName(state, s.level, where);
  setArrangement(state, service, to, where);
  // The budget feels it: savings out, start-up costs in.
  const b = budgetAt(state, s.level, { where });
  if (b) b.debt = Math.round(Math.max(0, b.debt + (to === 'own' ? 0.03 : -0.01) * s.share) * 100) / 100;
  const fiscal = state.publicService?.city;
  if (fiscal && s.level === 'city') fiscal.fiscalHealth = Math.round(clamp(fiscal.fiscalHealth + (to === 'own' ? -10 : 8) * s.share, 0, 100));
  if (byExecutive && state.politics.office) state.politics.office.approval = Math.round(clamp(state.politics.office.approval + (to === 'own' ? 4 : to === 'abolished' ? -10 : -6) * s.popular, 0, 100));
  const what = deptLabel(service);
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  ctx.log(to === 'own'
    ? `${cap(place)} brought ${s.label.toLowerCase()} back in-house${byExecutive ? ' — your promise kept' : ''}. It's hiring.`
    : to === 'abolished'
      ? `${cap(place)} abolished its ${what}${p?.name ? `; ${p.name} take over its duties` : ''}.`
      : `${cap(place)} ${to === 'merged' ? `merged its ${what} into ${p.name}` : `handed its ${what} to ${p?.name ?? 'a contractor'}`}.${byExecutive ? ' Your budget office counts the savings; the union counts the votes.' : ''}`, s.icon, 'milestone');
  // Staff affected.
  const job = state.career.job;
  if (!job) return;
  if (to !== 'own' && staffHere(state, job, service, where)) {
    const transfer = p?.profession && PROFESSIONS[p.profession];
    ctx.prompt({
      type: 'cityServices.transfer', icon: '📃', title: `${cap(place)} ${to === 'abolished' ? 'Abolishes' : to === 'merged' ? 'Merges' : 'Contracts Out'} ${s.label === 'Policing' ? 'Its Police Department' : s.label === 'Fire protection' ? 'Its Fire Department' : s.label}`,
      text: transfer
        ? `${cap(p.name)} ${to === 'abolished' ? 'take over its duties' : 'is taking over'}. Staff can transfer — at their current rank where there's a place, otherwise one lower — or take severance.`
        : `There's no job to transfer to${to === 'volunteer' ? ': a volunteer company runs it now (you could join as a volunteer)' : ''}. Staff are laid off with severance.`,
      options: [
        ...(transfer ? [{ id: 'transfer', label: `🔁 Transfer to ${p.name}`, hint: PROFESSIONS[p.profession].sector === 'private' ? 'A company job: pay by band, no public pension' : 'Keep working; your seniority partly carries over' }] : []),
        { id: 'rif', label: '📦 Take severance (laid off)', hint: 'A quarter-year\'s pay and unemployment benefits' },
      ],
      data: { service, regionId, to },
    });
  } else if (to === 'own' && p?.profession && job.professionId === p.profession && job.professionId !== s.profession) {
    ctx.prompt({
      type: 'cityServices.newDepartment', icon: '🏛️', title: `${cap(place)} Is Starting a ${s.label === 'Policing' ? 'Police' : s.label === 'Fire protection' ? 'Fire' : s.label} Department`,
      text: `The new department wants experienced people who know the place. You covered ${place} for ${p.name}.`,
      options: [{ id: 'join', label: '🏛️ Join the new department', hint: 'A rank up — and the uncertainty of a start-up' }, { id: 'stay', label: '🙅 Stay where you are' }],
      data: { service, regionId },
    });
  }
}

/** The level in another ladder at (or just below) your grade. */
function matchingLevel(profession, size, grade, stepDown) {
  const levels = profession.levels.filter((l) => !l.appointed && !l.id.endsWith('_cmd1'));
  const entry = levels.findIndex((l) => l.entry);
  const usable = levels.slice(Math.max(0, entry));
  const target = grade - (stepDown ? 1 : 0);
  return [...usable].filter((l) => l.grade <= target).sort((a, b) => b.grade - a.grade)[0] ?? usable[0] ?? levels[0];
}

function moveTo(ctx, professionId, { gradeShift = 0, why, employerName = null }) {
  const { state, rng } = ctx;
  const old = state.career.job;
  const profession = getProfession(professionId);
  if (!profession) return false;
  const employer = createEmployer(rng, state, profession, state.character.regionId);
  if (employerName) employer.name = employerName;
  const level = matchingLevel(profession, employer.size, old.grade + gradeShift, gradeShift < 0);
  const years = old.yearsAtEmployer ?? 0;
  const salary = old.salary;
  leaveJob(ctx, why, { fired: false });
  const job = hire(ctx, { professionId, levelId: level.id, employer });
  if (!job) return false;
  // Seniority partly carries over in a transfer.
  job.yearsAtEmployer = Math.round(years * 0.5);
  job.salary = Math.max(job.salary, Math.round(salary * (gradeShift > 0 ? 1.08 : 0.97)));
  return job;
}

/* ------------------------------------------------------------------ */
/* What it means for jobs and budgets                                  */
/* ------------------------------------------------------------------ */

/** Why a career isn't hiring here because of how services are arranged or what the law allows (null: it is). */
export function serviceBlock(state, professionId) {
  if (!state?.character) return null;
  // Public careers: their service here has been contracted out, privatized or abolished.
  for (const [id, s] of Object.entries(CATALOG)) {
    if (s.profession !== professionId) continue;
    const a = arrangementOf(state, id);
    if (a !== 'own') return `${s.label} here is ${ARRANGEMENTS[a].label.toLowerCase()}`;
  }
  // Private careers the law has closed.
  if (professionId === 'privatePolice' && lawValue(state, 'privatePolicing') === 'banned') return 'Private police are banned in this state';
  if (professionId === 'privateEms' && lawValue(state, 'privateEms') === 'public') return 'Only public EMS may operate in this state';
  if (professionId === 'privatePrisons') { const v = lawValue(state, 'privatePrisons'); if (v && !v.state && !v.federal) return 'Private prisons are banned here'; }
  if (professionId === 'privateFire' && lawValue(state, 'privateFire') === false) return 'Private fire companies are banned in this state';
  return null;
}
// The job board asks before listing a career.
setAvailabilityFilter((state, p) => !serviceBlock(state, p.id));

/** A budget area's cost after its services' arrangements: contracting saves, abolishing saves the service's whole share. */
setArrangementLookup((state, b, area) => {
  let k = 1;
  for (const [id, s] of Object.entries(CATALOG)) {
    if (s.level !== b.level || s.area !== area) continue;
    const a = (b.level === 'city' ? state.world?.municipal?.[b.where] : state.world?.services?.[`${b.level}:${b.where}`])?.[id] ?? 'own';
    k -= s.share * (1 - ARRANGEMENTS[a].cost);
  }
  return clamp(k, 0, 1);
});

/* ------------------------------------------------------------------ */
/* Actions, resolvers, the module                                      */
/* ------------------------------------------------------------------ */

export const PublicServiceActions = {
  /** The executive changes how a service is delivered: arg = 'service' or 'service|arrangement'. */
  decide(ctx, arg) {
    const { state } = ctx;
    const [service, to] = String(arg).split('|');
    const c = executiveChoice(state, service);
    if (!c.options) return ctx.toast(c.reason, 'warn');
    const pick = to ? c.options.find((o) => o.to === to) : c.options.find((o) => o.ok);
    if (!pick?.ok) return ctx.toast(pick?.reason ?? c.reason ?? 'Not possible', 'warn');
    bumpYearly(state, `municipal.${service}`);
    changeService(ctx, service, pick.to, { byExecutive: true });
  },
};

export const PublicServiceResolvers = {
  transfer(ctx, data, optionId) {
    const { state } = ctx;
    const job = state.career.job;
    if (!job) return;
    const p = providerFor(state, data.service, data.to ?? 'contracted');
    if (optionId === 'transfer' && p?.profession) {
      const sameCareer = p.profession === data.service;
      const moved = moveTo(ctx, p.profession, { gradeShift: ctx.rng.chance(0.5) ? 0 : -1, why: `${CATALOG[data.service]?.label ?? 'Service'} ${data.to === 'abolished' ? 'abolished' : 'handed over'}: transferred to ${p.name}`, employerName: sameCareer && data.service === 'fire' ? `${cityName(data.regionId)} Area Fire Protection District` : null });
      if (moved) return ctx.log(`You transferred to ${p.name} as ${moved.title}.`, '🔁', 'good');
    }
    const severance = Math.round(job.salary * 0.25);
    leaveJob(ctx, 'Laid off when the department was disbanded (reduction in force)', { fired: false });
    ctx.earn(severance, 'Severance pay', { wage: true });
    ctx.emit('career:laidOff', { reason: 'rif' });
    ctx.log(`You took severance ($${severance.toLocaleString()}) when the department closed.`, '📦', 'warn');
  },
  newDepartment(ctx, data, optionId) {
    if (optionId !== 'join' || !ctx.state.career.job) return;
    const target = CATALOG[data.service]?.profession ?? data.service;
    const moved = moveTo(ctx, target, { gradeShift: 1, why: `Joined the new ${deptLabel(data.service)}` });
    if (moved) ctx.log(`You joined the new ${deptLabel(data.service)} as ${moved.title}.`, '🏛️', 'milestone');
  },
};

/**
 * NPC governments reorganize now and then: a business administration short of money contracts
 * out or privatizes; a labor one takes services back in-house.
 */
function npcReform(ctx, rng) {
  const { state } = ctx;
  const mine = executiveLevel(state.politics?.office?.id);
  for (const [service, s] of Object.entries(CATALOG)) {
    if (s.level === mine || !canChoose(state, service)) continue;
    const exec = executiveOf(state, s.level);
    const b = budgetAt(state, s.level, { create: false });
    const squeezed = (b?.health ?? 60) < 40;
    const now = arrangementOf(state, service);
    const labor = exec?.caucus === 'labor';
    if (now === 'own') {
      if (!rng.chance((squeezed ? 0.02 : 0.006) * (labor ? 0.4 : 1.3))) continue;
      const opts = choicesFor(state, service).filter((o) => o.ok && o.to !== 'abolished');
      if (!opts.length) continue;
      changeService(ctx, service, rng.pick(opts).to);
    } else if (rng.chance(labor ? 0.04 : 0.012)) changeService(ctx, service, 'own');
  }
}

/** A law that closes private providers ends the private jobs it covered. */
function lawClosures(ctx) {
  const { state } = ctx;
  const job = state.career.job;
  if (!job || job.sector !== 'private') return;
  const why = serviceBlock(state, job.professionId);
  if (!why || job.lawClosedAge === state.character.age) return;
  job.lawClosedAge = state.character.age;
  const publicTwin = { privatePolice: 'police', privateEms: 'ems', privatePrisons: 'corrections', privateFire: 'fire' }[job.professionId];
  ctx.prompt({
    type: 'cityServices.lawClosure', icon: '⚖️', title: 'The Law Changed',
    text: `${why}. ${job.employer.name} is winding down its operations here.${publicTwin ? ' The public service is absorbing some of the staff.' : ''}`,
    options: [
      ...(publicTwin && !serviceBlock(state, publicTwin) ? [{ id: 'public', label: '🏛️ Move to the public service', hint: 'A rank lower, a public pension' }] : []),
      { id: 'rif', label: '📦 Take severance' },
    ],
    data: { to: publicTwin ?? null },
  });
}
PublicServiceResolvers.lawClosure = (ctx, data, optionId) => {
  const job = ctx.state.career.job;
  if (!job) return;
  if (optionId === 'public' && data.to) {
    const moved = moveTo(ctx, data.to, { gradeShift: -1, why: 'Private operator closed by law: joined the public service' });
    if (moved) return ctx.log(`You joined the public service as ${moved.title}.`, '🏛️', 'good');
  }
  const severance = Math.round(job.salary * 0.25);
  leaveJob(ctx, 'Laid off when a new law closed the company\'s operations', { fired: false });
  ctx.earn(severance, 'Severance pay', { wage: true });
  ctx.emit('career:laidOff', { reason: 'rif' });
};

export const PublicServicesModule = {
  id: 'cityServices',
  order: 33.6,
  init(state) {
    state.world ??= {};
    state.world.municipal ??= {};
    state.world.services ??= {};
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    // Its own random stream, so council politics doesn't shift the rest of the life.
    const rng = new Random(((state.world?.seed ?? 1) * 40503 + state.character.age * 131 + 7) >>> 0);
    npcReform(ctx, rng);
    lawClosures(ctx);
  },
  actions: { decide: PublicServiceActions.decide },
  resolvers: PublicServiceResolvers,
};
