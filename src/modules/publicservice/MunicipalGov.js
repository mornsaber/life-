/**
 * Municipal government: city-employed professions (public safety, city
 * administration, public works, planning), the city's budget and approval
 * rating, and municipal workplace events.
 *
 * state.publicService.city = { name, approval, fiscalHealth } while you work
 * for a city. Department heads and the City Manager make annual budget
 * choices; everyone experiences the consequences through training budgets,
 * staffing and community approval.
 */
import { L } from '../career/Ladder.js';
import { clamp } from '../../core/Random.js';

const PD = (city) => `${city} Police Department`;

export const MUNICIPAL_PROFESSIONS = {
  police: {
    id: 'police', name: 'Police Department', icon: '🚓', sector: 'municipal', payMultiplier: 1.0, minAge: 21, background: 'strict', exam: 'publicSafety',
    union: { chance: 0.85, name: 'Fraternal Order of Police Lodge 7', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: PD,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 45 },
    valued: ['postReserve', 'cit', 'emt', 'fto'],
    levels: [
      L('recruit', 'Police Recruit', 3, { years: 1 }),
      L('officer', 'Police Officer', 4, { entry: true, req: { credentials: ['post'] }, abilities: ['arrest'] }),
      L('senior', 'Senior Patrol Officer', 5, { req: { credentials: ['post'] }, abilities: ['arrest'] }),
      L('detective', 'Detective', 5, { track: 'ic', abilities: ['arrest', 'audit'] }),
      L('seniorDetective', 'Senior Detective', 6, { track: 'ic', minSize: 'medium', abilities: ['arrest', 'audit'] }),
      L('sergeant', 'Sergeant', 5, { track: 'mgmt', req: { credentials: ['fto'] }, abilities: ['arrest', 'supervise'], reports: 8 }),
      L('lieutenant', 'Lieutenant', 6, { track: 'mgmt', req: { credentials: ['supervisorCourse'] }, abilities: ['arrest', 'supervise', 'command'], reports: 25 }),
      L('captain', 'Captain', 7, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'command'], reports: 70 }),
      L('deputyChief', 'Deputy Chief', 8, { track: 'mgmt', minSize: 'large', req: { credentials: ['commandCollege'] }, abilities: ['supervise', 'budget', 'delegate', 'command'], reports: 300 }),
      L('chief', 'Chief of Police', 9, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 600 }),
    ],
  },
  fire: {
    id: 'fire', name: 'Fire Department', icon: '🚒', sector: 'municipal', payMultiplier: 0.98, minAge: 18, background: 'strict', exam: 'publicSafety',
    union: { chance: 0.9, name: 'IAFF Local 22', strike: false },
    benefits: { pension: 'publicSafety', ssCovered: false },
    employerName: (city) => `${city} Fire Department`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'], fitness: 50 },
    valued: ['ff1', 'ff2', 'emt', 'hazmatOps', 'paramedic'],
    levels: [
      L('recruit', 'Firefighter Recruit', 3, { years: 1 }),
      L('firefighter', 'Firefighter', 4, { entry: true, req: { credentials: ['ff2', 'emt'] } }),
      L('engineer', 'Driver/Engineer', 4, { req: { credentials: ['driverOperator'] } }),
      L('inspector', 'Fire Inspector', 5, { track: 'ic', req: { credentials: ['fireInspector'] }, abilities: ['inspect'] }),
      L('investigator', 'Fire Investigator', 6, { track: 'ic', minSize: 'medium', abilities: ['inspect', 'arrest'] }),
      L('lieutenant', 'Fire Lieutenant', 5, { track: 'mgmt', req: { credentials: ['fireOfficer1'] }, abilities: ['supervise', 'command'], reports: 4 }),
      L('captain', 'Fire Captain', 6, { track: 'mgmt', req: { credentials: ['fireOfficer2'] }, abilities: ['supervise', 'command'], reports: 12 }),
      L('battalion', 'Battalion Chief', 7, { track: 'mgmt', req: { credentials: ['ics300'] }, abilities: ['supervise', 'budget', 'command'], reports: 45 }),
      L('deputyChief', 'Deputy Fire Chief', 8, { track: 'mgmt', minSize: 'large', abilities: ['supervise', 'budget', 'delegate', 'command'], reports: 200 }),
      L('chief', 'Fire Chief', 9, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy', 'command'], reports: 400 }),
    ],
  },
  ems: {
    id: 'ems', name: 'Emergency Medical Services', icon: '🚑', sector: 'municipal', payMultiplier: 0.95, minAge: 18, background: 'strict', exam: 'publicSafety',
    union: { chance: 0.5, name: 'AFSCME EMS Local 2507', strike: false },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} EMS`,
    entry: { credentials: ['driverLicense'] },
    valued: ['paramedic', 'hazmatOps', 'cit'],
    levels: [
      L('emt', 'EMT', 2, { req: { credentials: ['emt'] } }),
      L('paramedic', 'Paramedic', 4, { entry: true, req: { credentials: ['paramedic'] }, abilities: ['prescribe'] }),
      L('criticalCare', 'Critical Care Paramedic', 5, { track: 'ic', abilities: ['prescribe'] }),
      L('flight', 'Flight Paramedic', 6, { track: 'ic', minSize: 'large', abilities: ['prescribe'] }),
      L('fto', 'Field Training Officer', 5, { track: 'mgmt', abilities: ['supervise'], reports: 4 }),
      L('supervisor', 'EMS Supervisor', 5, { track: 'mgmt', abilities: ['supervise', 'command'], reports: 18 }),
      L('captain', 'EMS Captain', 6, { track: 'mgmt', minSize: 'medium', abilities: ['supervise', 'budget', 'command'], reports: 50 }),
      L('chief', 'EMS Chief', 8, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'exec', 'policy'], reports: 200 }),
    ],
  },
  municipalAdmin: {
    id: 'municipalAdmin', name: 'City Administration', icon: '🏛️', sector: 'municipal', payMultiplier: 0.95, minAge: 18, background: 'standard', exam: 'municipal',
    union: { chance: 0.5, name: 'AFSCME Council 31', strike: true },
    benefits: { pension: 'municipal' },
    employerName: (city) => `City of ${city}`,
    entry: { education: { level: 'highschool' } },
    valued: ['cgfm', 'pmp'],
    levels: [
      L('clerk', 'Records Clerk', 2),
      L('deputyClerk', 'Deputy City Clerk', 3),
      L('cityClerk', 'City Clerk', 5, { abilities: ['sign'] }),
      L('analyst', 'Budget Analyst', 5, { track: 'ic', entry: true, req: { education: { level: 'bachelor' } }, abilities: ['audit'] }),
      L('seniorAnalyst', 'Senior Budget Analyst', 6, { track: 'ic', abilities: ['audit', 'budget'] }),
      L('financeDirector', 'Finance Director', 7, { track: 'ic', minSize: 'medium', req: { credentials: ['cgfm'] }, abilities: ['budget', 'sign'] }),
      L('manager', 'Department Manager', 6, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget'], reports: 15 }),
      L('acm', 'Assistant City Manager', 7, { track: 'mgmt', minSize: 'medium', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign'], reports: 120 }),
      L('cityManager', 'City Manager', 9, { track: 'mgmt', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'hire', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 900 }),
    ],
  },
  publicWorks: {
    id: 'publicWorks', name: 'Public Works', icon: '🚧', sector: 'municipal', payMultiplier: 0.97, minAge: 18, background: 'standard', exam: 'municipal',
    union: { chance: 0.6, name: 'AFSCME Local 1001', strike: true },
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Department of Public Works`,
    entry: { education: { level: 'highschool' }, credentials: ['driverLicense'] },
    valued: ['oshaSafety', 'buildingInspector', 'cdlA', 'pe'],
    levels: [
      L('maintenance', 'Maintenance Worker', 2),
      L('operator', 'Heavy Equipment Operator', 3),
      L('inspector', 'Public Works Inspector', 4, { entry: true, req: { credentials: ['buildingInspector'] }, abilities: ['inspect'] }),
      L('seniorInspector', 'Senior Inspector', 5, { track: 'ic', abilities: ['inspect'] }),
      L('cbo', 'Chief Building Official', 6, { track: 'ic', minSize: 'medium', abilities: ['inspect', 'sign'] }),
      L('cityEngineer', 'City Engineer', 7, { track: 'ic', entry: true, req: { credentials: ['pe'] }, abilities: ['inspect', 'sign'] }),
      L('supervisor', 'Public Works Supervisor', 5, { track: 'mgmt', abilities: ['supervise'], reports: 12 }),
      L('superintendent', 'Public Works Superintendent', 6, { track: 'mgmt', abilities: ['supervise', 'hire', 'budget'], reports: 40 }),
      L('director', 'Director of Public Works', 8, { track: 'mgmt', minSize: 'medium', req: { education: { level: 'bachelor' } }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'exec', 'policy'], reports: 250 }),
    ],
  },
  planning: {
    id: 'planning', name: 'Urban Planning', icon: '🗺️', sector: 'municipal', payMultiplier: 1.0, minAge: 21, background: 'standard', exam: 'municipal',
    benefits: { pension: 'municipal' },
    employerName: (city) => `${city} Planning Department`,
    entry: { education: { level: 'associate' } },
    valued: ['aicp'],
    levels: [
      L('tech', 'Planning Technician', 3),
      L('planner1', 'Planner I', 4, { entry: true, req: { education: { level: 'bachelor' } } }),
      L('planner2', 'Planner II', 5),
      L('senior', 'Senior Planner', 6, { track: 'ic' }),
      L('principal', 'Principal Planner', 7, { track: 'ic', minSize: 'large', req: { credentials: ['aicp'] } }),
      L('manager', 'Planning Manager', 7, { track: 'mgmt', abilities: ['supervise', 'hire', 'sign'], reports: 10 }),
      L('director', 'Planning Director', 8, { track: 'mgmt', minSize: 'medium', req: { credentials: ['aicp'] }, abilities: ['supervise', 'budget', 'delegate', 'sign', 'policy'], reports: 40 }),
    ],
  },
};

/* ------------------------------------------------------------------ */
/* City budget & approval                                              */
/* ------------------------------------------------------------------ */

const BUDGET_CHOICES = [
  { id: 'taxes', label: '🧾 Raise property taxes', fiscal: 15, approval: -10, perf: 0 },
  { id: 'cuts', label: '✂️ Cut services across the board', fiscal: 10, approval: -12, perf: -2 },
  { id: 'bonds', label: '🏗️ Issue bonds for infrastructure', fiscal: -6, approval: 9, perf: 4 },
  { id: 'safety', label: '🚨 Fund police & fire overtime', fiscal: -8, approval: 6, perf: 2 },
  { id: 'balanced', label: '⚖️ Hold the line on a balanced budget', fiscal: 4, approval: 0, perf: 3 },
];

const MUNICIPAL_EVENTS = {
  police: {
    title: 'Viral Arrest Video', text: 'A bystander video of your department making a rough arrest is trending. The community is demanding answers.',
    options: [
      { id: 'townhall', label: '🎤 Volunteer to speak at a community town hall', approval: 6, perf: 5, boss: -2, check: 'smarts' },
      { id: 'defend', label: '🛡️ Publicly defend your fellow officers', approval: -6, coworkers: 10, boss: 4 },
      { id: 'quiet', label: '🤐 Keep your head down', approval: -2 },
    ],
  },
  fire: {
    title: 'Station Brownout Proposal', text: 'To close a budget gap, the council proposes rotating closures of your station.',
    options: [
      { id: 'lobby', label: '📣 Testify at council about response times', approval: 5, perf: 4, boss: -4, fiscal: -3 },
      { id: 'accept', label: '🤷 Accept the brownouts', fiscal: 4, approval: -3, coworkers: -6 },
    ],
  },
  ems: {
    title: 'Hospital Wall Times', text: 'Ambulances are stuck for hours waiting to offload patients at the ER.',
    options: [
      { id: 'escalate', label: '📞 Escalate to hospital administrators', perf: 5, boss: 2, check: 'smarts' },
      { id: 'tough', label: '⏳ Tough it out on scene', perf: 0, stress: 6 },
    ],
  },
  municipalAdmin: {
    title: 'Public Records Request', text: 'A reporter filed a records request for embarrassing emails between council members.',
    options: [
      { id: 'release', label: '📂 Release them in full, as the law requires', approval: 8, boss: -8, perf: 3 },
      { id: 'redact', label: '🖍️ Redact heavily and dare them to sue', approval: -6, fiscal: -5, boss: 6 },
      { id: 'stall', label: '🐌 Slow-walk the request', approval: -3, perf: -2 },
    ],
  },
  publicWorks: {
    title: 'Water Main Break', text: 'A 2 AM water main break is flooding downtown streets.',
    options: [
      { id: 'lead', label: '🔧 Lead the overnight repair crew yourself', perf: 7, approval: 4, stress: 8 },
      { id: 'morning', label: '🌅 Shut the valves and wait for the morning crew', approval: -5, fiscal: -2 },
    ],
  },
  planning: {
    title: 'Contested Zoning Hearing', text: 'A developer wants to build 400 apartments next to a single-family neighborhood. Residents are furious.',
    options: [
      { id: 'approve', label: '🏢 Recommend approval — the city needs housing', approval: -5, fiscal: 8, perf: 3 },
      { id: 'deny', label: '🚫 Recommend denial', approval: 5, fiscal: -6 },
      { id: 'compromise', label: '🤝 Negotiate a smaller project with a park', approval: 4, fiscal: 3, perf: 6, check: 'smarts' },
    ],
  },
};

function adjustCity(state, { fiscal = 0, approval = 0 }) {
  const city = state.publicService.city;
  if (!city) return;
  city.fiscalHealth = Math.round(clamp(city.fiscalHealth + fiscal, 0, 100));
  city.approval = Math.round(clamp(city.approval + approval, 0, 100));
}

function applyEventOption(ctx, option) {
  const { state, rng } = ctx;
  let perf = option.perf ?? 0;
  if (option.check && state.stats[option.check] < 50 + rng.int(-10, 10)) {
    perf = -Math.abs(perf || 3);
    ctx.log('It didn\'t land the way you hoped.', '😬', 'warn');
  }
  adjustCity(state, option);
  if (option.stress) ctx.stat('stress', option.stress);
  ctx.emit('career:adjust', { performance: perf, boss: option.boss ?? 0, coworkers: option.coworkers ?? 0 });
}

export const MunicipalGov = {
  id: 'municipal',
  order: 26,

  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => {
      if (job.sector !== 'municipal') {
        ctx.state.publicService.city = null;
        return;
      }
      const name = job.employer.name;
      const existing = ctx.state.publicService.city;
      if (existing?.employerName === name) return;
      ctx.state.publicService.city = { name: job.employer.cityName ?? name, employerName: name, approval: ctx.rng.int(40, 65), fiscalHealth: ctx.rng.int(40, 70) };
    });
    engine.bus.on('disaster:struck', ({ ctx, disaster }) => {
      const city = ctx.state.publicService.city;
      if (!city) return;
      city.fiscalHealth = Math.max(0, city.fiscalHealth - disaster.severity * 8);
      ctx.log(`${disaster.name} blew a hole in ${city.name}'s budget.`, '🏛️', 'warn');
    });
    engine.bus.on('career:separated', ({ ctx }) => {
      ctx.state.publicService.city = null;
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const city = state.publicService.city;
    const job = state.career.job;
    if (!city || !job) return;

    // Drift and shocks
    city.approval = Math.round(clamp(city.approval + (50 - city.approval) * 0.15 + rng.int(-5, 5), 0, 100));
    city.fiscalHealth = Math.round(clamp(city.fiscalHealth + rng.int(-6, 5), 0, 100));
    if (rng.chance(0.07)) {
      city.fiscalHealth = Math.max(0, city.fiscalHealth - 20);
      ctx.log(`A recession hammered ${city.name}'s tax revenue. Budgets are being cut.`, '📉', 'warn');
    }

    if (job.abilities.includes('policy') || (job.abilities.includes('budget') && job.grade >= 7)) {
      ctx.prompt({
        type: 'municipal.budget',
        icon: '🏛️',
        title: `${city.name} Budget Season`,
        text: `Fiscal health ${city.fiscalHealth}/100 · Community approval ${city.approval}/100.\nThe council wants your recommendation for next year's budget.`,
        options: BUDGET_CHOICES.map((c) => ({ id: c.id, label: c.label, hint: `Fiscal ${c.fiscal >= 0 ? '+' : ''}${c.fiscal} · Approval ${c.approval >= 0 ? '+' : ''}${c.approval}` })),
      });
    } else if (MUNICIPAL_EVENTS[job.professionId] && rng.chance(0.35)) {
      const event = MUNICIPAL_EVENTS[job.professionId];
      ctx.prompt({
        type: 'municipal.event',
        icon: '🏙️',
        title: event.title,
        text: `${city.name}\n${event.text}`,
        options: event.options.map((o) => ({ id: o.id, label: o.label })),
        data: { professionId: job.professionId },
      });
    }

    if (job.levelId === 'cityManager' && city.approval < 25 && rng.chance(0.6)) {
      ctx.log(`With approval at ${city.approval}, the council voted no confidence in you.`, '🗳️', 'bad');
      ctx.emit('career:resign', { reason: 'Removed by a council vote of no confidence', fired: true });
    }
  },

  resolvers: {
    budget(ctx, _data, optionId) {
      const choice = BUDGET_CHOICES.find((c) => c.id === optionId);
      adjustCity(ctx.state, choice);
      const city = ctx.state.publicService.city;
      ctx.log(`Budget adopted: ${choice.label.slice(2).trim()}. Fiscal health ${city.fiscalHealth}, approval ${city.approval}.`, '🏛️');
      ctx.emit('career:adjust', { performance: choice.perf + Math.round((city.approval - 50) / 10), boss: 0 });
    },
    event(ctx, data, optionId) {
      const option = MUNICIPAL_EVENTS[data.professionId].options.find((o) => o.id === optionId);
      applyEventOption(ctx, option);
      ctx.log(`You chose: ${option.label.slice(2).trim()}.`, '🏙️');
    },
  },
};
