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
import { pickFresh } from '../../core/Pools.js';
import { L, detectiveRanks } from '../career/Ladder.js';
import { clamp } from '../../core/Random.js';
import { jobBudget } from '../politics/Budgets.js';


/* The careers themselves (MUNICIPAL_PROFESSIONS) live in content/packs/careers-municipal.js. */

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

export const MUNICIPAL_EVENTS = {
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
  councilInspector: {
    title: 'A Friendly Envelope', text: 'A contractor with a half-finished extension and no permit invites you for coffee. There\'s an envelope on the table and the job is "nearly up to code."',
    options: [
      { id: 'stop', label: '🛑 Issue a stop-work notice', approval: 3, perf: 5, boss: 2 },
      { id: 'warn', label: '📋 Give them 30 days to get a permit', approval: 1, perf: 2 },
      { id: 'look', label: '🙈 Pocket it and sign off', approval: -2, perf: -2, check: 'smarts' },
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

function adjustCity(state, { fiscal = 0, approval = 0, budgetId: id = null }) {
  const city = state.publicService.city;
  if (!city) return;
  city.fiscalHealth = Math.round(clamp(city.fiscalHealth + fiscal, 0, 100));
  city.approval = Math.round(clamp(city.approval + approval, 0, 100));
  // The city manager's budget recommendation changes the city's actual books.
  const b = id ? jobBudget(state, state.career.job, { create: false }) : null;
  if (!b || b.level !== 'city') return;
  const scale = (areas, k) => { for (const a of areas) b.funding[a] = Math.round(clamp((b.funding[a] ?? 1) * k, 0.6, 1.4) * 1000) / 1000; };
  if (id === 'taxes') b.levy = Math.round(((b.levy ?? 0) + 0.04) * 1000) / 1000 || 0;
  else if (id === 'cuts') scale(Object.keys(b.funding), 0.94);
  else if (id === 'bonds') { b.debt = Math.round((b.debt + 0.12) * 100) / 100; scale(['works'], 1.1); }
  else if (id === 'safety') scale(['police', 'fire', 'ems'], 1.06);
}

/** More municipal events per department, so city careers don't repeat one scenario. */
const MORE_MUNICIPAL_EVENTS = {
  police: [
    { id: 'bodycam', title: 'Body Camera Footage', text: 'Your partner\'s body camera "malfunctioned" during a use-of-force incident. Yours was recording.', options: [
      { id: 'release', label: '📼 Turn your footage over to internal affairs', approval: 5, perf: 4, coworkers: -10 },
      { id: 'delete', label: '🗑️ Let your footage "auto-delete"', approval: -2, coworkers: 6, stress: 8 },
    ] },
    { id: 'community', title: 'Community Policing Grant', text: 'A federal grant would fund foot patrols in the neighborhood with the most shootings.', options: [
      { id: 'walk', label: '🚶 Volunteer to walk the beat', approval: 6, perf: 5, stress: 4 },
      { id: 'pass', label: '🚓 Stay on patrol in your car', approval: 0 },
    ] },
  ],
  fire: [
    { id: 'cancer', title: 'Turnout Gear Study', text: 'A study links your department\'s old turnout gear to cancer. Replacing it costs $2 million.', options: [
      { id: 'push', label: '📣 Push the union and council to replace it', approval: 3, fiscal: -4, perf: 3, boss: -2 },
      { id: 'wait', label: '⏳ Wait for next year\'s budget', coworkers: -4 },
    ] },
    { id: 'school', title: 'Fire Safety Week', text: 'The schools want a crew for fire safety week, during your days off.', options: [
      { id: 'yes', label: '🧯 Do it on your own time', approval: 5, perf: 2, stress: 2 },
      { id: 'no', label: '🛋️ Enjoy your days off', approval: 0 },
    ] },
  ],
  ems: [
    { id: 'frequent', title: 'Frequent Flyer', text: 'The same caller has dialed 911 forty times this year — loneliness more than illness.', options: [
      { id: 'refer', label: '🤝 Connect him with community paramedicine', approval: 4, perf: 4, fiscal: 1 },
      { id: 'transport', label: '🚑 Keep transporting every time', fiscal: -2 },
    ] },
    { id: 'mci', title: 'Bus Crash', text: 'A school bus overturned. Twenty-two kids, four ambulances.', options: [
      { id: 'triage', label: '🏷️ Run START triage as first-in medic', perf: 8, approval: 4, stress: 10, check: 'smarts' },
      { id: 'transport', label: '🚑 Load the worst patient and go', perf: 3, stress: 6 },
    ] },
  ],
  municipalAdmin: [
    { id: 'contract', title: 'Garbage Contract', text: 'The low bidder for the city garbage contract is the mayor\'s brother-in-law.', options: [
      { id: 'rebid', label: '📑 Recommend rebidding it', approval: 4, boss: -6 },
      { id: 'award', label: '✍️ Award it to the low bidder', fiscal: 2, approval: -3, boss: 4 },
    ] },
    { id: 'ransomware', title: 'Ransomware', text: 'Hackers encrypted the city\'s billing systems and want $400,000 in bitcoin.', options: [
      { id: 'restore', label: '💾 Refuse and rebuild from backups', fiscal: -3, approval: 2, perf: 4, stress: 8 },
      { id: 'pay', label: '💸 Pay the ransom quietly', fiscal: -5, approval: -4, perf: -2 },
    ] },
  ],
  publicWorks: [
    { id: 'mainBreak', title: 'Water Main Break', text: 'A 36-inch main burst downtown on the coldest night of the year.', options: [
      { id: 'night', label: '🔧 Lead the crew through the night', perf: 7, approval: 4, stress: 8 },
      { id: 'contract', label: '📞 Call in an emergency contractor', fiscal: -4, perf: 3 },
    ] },
    { id: 'lead', title: 'Lead Service Lines', text: 'Testing finds lead above the action level in an older neighborhood.', options: [
      { id: 'announce', label: '📢 Notify residents today and hand out filters', approval: 3, perf: 5, boss: -3 },
      { id: 'retest', label: '🧪 Quietly retest first', approval: -6, perf: -2 },
    ] },
  ],
  planning: [
    { id: 'housing', title: 'Affordable Housing Fight', text: 'A 200-unit affordable project faces a packed hearing of angry neighbors.', options: [
      { id: 'recommend', label: '🏘️ Recommend approval', approval: -2, fiscal: 2, perf: 4 },
      { id: 'shrink', label: '✂️ Recommend cutting it to 80 units', approval: 2, perf: 1 },
    ] },
    { id: 'historic', title: 'Historic District', text: 'A developer wants to demolish a crumbling 1890s storefront for a parking garage.', options: [
      { id: 'protect', label: '🏛️ Recommend historic designation', approval: 3, fiscal: -1, perf: 3 },
      { id: 'garage', label: '🚗 Recommend the garage', fiscal: 3, approval: -3 },
    ] },
  ],
};

export const municipalPool = (professionId) => [{ id: 'main', ...MUNICIPAL_EVENTS[professionId] }, ...(MORE_MUNICIPAL_EVENTS[professionId] ?? [])];
const findMunicipalEvent = (professionId, eventId = 'main') => municipalPool(professionId).find((e) => e.id === eventId) ?? municipalPool(professionId)[0];

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
    if (state.economy.phase === 'recession' && state.economy.phaseYears === 0) {
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
      const event = pickFresh(rng, state, `municipal.${job.professionId}`, municipalPool(job.professionId));
      ctx.prompt({
        type: 'municipal.event',
        icon: '🏙️',
        title: event.title,
        text: `${city.name}\n${event.text}`,
        options: event.options.map((o) => ({ id: o.id, label: o.label })),
        data: { professionId: job.professionId, eventId: event.id },
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
      const city = ctx.state.publicService.city;
      if (!choice || !city) return;
      adjustCity(ctx.state, { ...choice, budgetId: choice.id });
      ctx.log(`Budget adopted: ${choice.label.slice(2).trim()}. Fiscal health ${city.fiscalHealth}, approval ${city.approval}.`, '🏛️');
      ctx.emit('career:adjust', { performance: choice.perf + Math.round((city.approval - 50) / 10), boss: 0 });
    },
    event(ctx, data, optionId) {
      const option = findMunicipalEvent(data.professionId, data.eventId).options.find((o) => o.id === optionId);
      applyEventOption(ctx, option);
      ctx.log(`You chose: ${option.label.slice(2).trim()}.`, '🏙️');
    },
  },
};
