/**
 * Major incidents: the days when every agency works the same emergency.
 * A natural disaster (life/Disasters.js) or a man-made one — a derailment,
 * a chemical explosion, a building collapse, a mass-casualty crash, an
 * active shooter — pulls in police, fire, EMS, dispatch, hospitals, public
 * works and utilities, the emergency operations centre, the press and the
 * volunteers, each with their own part to play. Responders may also be
 * sent as mutual aid to a disaster in a neighbouring area.
 *
 * Your part depends on your job (or, without one, on being a neighbour who
 * can help). Volunteer services get their own callout (EmergencyEngine).
 *
 * state.majorIncidents = [{ age, name, kind, role, outcome, mutualAid }]
 */
import { clamp } from '../../../core/Random.js';
import { addHonor } from '../../../core/State.js';
import { skill, engineKey } from './Kit.js';

export const ROLES = {
  responder: { label: 'Responder', ids: ['police', 'sheriff', 'statePolice', 'transitPolice', 'universityPolice', 'airportPolice', 'privatePolice', 'fire', 'airportFire', 'stateFire', 'privateFire', 'ems', 'privateEms', 'borderPatrol', 'usms', 'fbi', 'atf'] },
  dispatch: { label: 'Dispatcher', ids: ['dispatch'] },
  health: { label: 'Hospital', ids: ['nursing', 'travelNursing', 'medical', 'physicianAssistant', 'respiratoryTherapy', 'imaging', 'pharmacy'] },
  coordination: { label: 'Coordination', ids: ['emergencyManagement', 'municipalAdmin', 'publicHealth'] },
  infrastructure: { label: 'Infrastructure', ids: ['publicWorks', 'waterUtility', 'lineworker', 'trades', 'plumbing', 'craneOperator', 'engineering', 'dot'] },
  media: { label: 'Press', ids: ['journalism'] },
};
export const roleOf = (job) => (job ? Object.keys(ROLES).find((r) => ROLES[r].ids.includes(engineKey(job))) ?? null : null);

const MAN_MADE = [
  { kind: 'derailment', icon: '🚆', name: 'the freight train derailment', text: 'A freight train carrying chemicals derailed near homes.' },
  { kind: 'explosion', icon: '💥', name: 'the chemical plant explosion', text: 'An explosion at a chemical plant sent a plume over the town.' },
  { kind: 'collapse', icon: '🏚️', name: 'the building collapse', text: 'An apartment building partially collapsed overnight with people inside.' },
  { kind: 'pileup', icon: '🚗', name: 'the highway pile-up', text: 'Seventy vehicles piled up in fog on the interstate.' },
  { kind: 'shooting', icon: '🚨', name: 'the shooting at the shopping centre', text: 'Shots were fired in a crowded shopping centre.' },
  { kind: 'crush', icon: '🏟️', name: 'the stadium crowd crush', text: 'A crowd surge at a concert left dozens hurt.' },
];

const SUPERVISOR = /captain|chief|lieutenant|sergeant|supervisor|commander|director|manager|deputy|superintendent|foreman/i;

/** The prompt for your part in it. */
function rolePrompt(ctx, incident, mutualAid = false) {
  const { state } = ctx;
  const job = state.career.job;
  const role = roleOf(job);
  const where = mutualAid ? `${incident.name} (mutual aid to a neighbouring area)` : incident.name;
  const agencies = 'Fire, police and EMS, dispatch, the hospitals, public works and the utilities, the emergency operations centre and the volunteer units';
  const text = `${incident.text ?? `${incident.name} hit hard.`} ${agencies} are all working it${mutualAid ? ', and your agency has been asked to send help' : ''}.`;
  let options;
  switch (role) {
    case 'responder': options = [
      { id: 'front', label: '🦺 Go in with the rescue teams', hint: 'Lives on the line, yours included', tone: 'danger' },
      ...(SUPERVISOR.test(job.title) ? [{ id: 'command', label: '🎛️ Take a branch of incident command', hint: 'Run the people who run the scene' }] : []),
      { id: 'support', label: '📋 Staging, perimeter and logistics', hint: 'Less glory, still essential' },
    ]; break;
    case 'dispatch': options = [{ id: 'console', label: '🎧 Work the console through the surge', hint: 'Every call at once' }, { id: 'relief', label: '🛌 Take the relief shift', hint: 'Someone has to be fresh tomorrow' }]; break;
    case 'health': options = [{ id: 'surge', label: '🏥 Stay for the surge — double shifts', hint: 'Mass-casualty plan activated' }, { id: 'triage', label: '🏷️ Run triage at the door', hint: 'Who goes first. Who waits.' }]; break;
    case 'coordination': options = [{ id: 'eoc', label: '🖥️ Run the operations centre', hint: 'Resources, shelters, the public' }, { id: 'defer', label: '🏛️ Let the elected officials lead', hint: 'Safer for you' }]; break;
    case 'infrastructure': options = [{ id: 'restore', label: '🔧 Work around the clock restoring service', hint: 'Overtime, risk, gratitude' }, { id: 'normal', label: '🕗 Normal shifts', hint: 'Rest matters too' }]; break;
    case 'media': options = [{ id: 'scene', label: '🎥 Report from the scene', hint: 'The story of the year' }, { id: 'careful', label: '📝 Careful, verified reporting', hint: 'Slower, right' }]; break;
    default: options = [{ id: 'volunteer', label: '🤝 Go and help — sandbags, shelters, blood drives' }, { id: 'donate', label: '💵 Donate', hint: '$500' }, { id: 'safe', label: '🏠 Stay safe with your family' }];
  }
  ctx.prompt({ type: mutualAid ? 'majorIncidents.mutualAid' : 'majorIncidents.respond', icon: incident.icon ?? '🚨', title: mutualAid ? 'Mutual Aid Request' : `Major Incident: ${incident.name.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())}`, text: `${where}.\n${text}`, options: mutualAid ? [...options, { id: 'decline', label: '🙅 Stay home — your own area needs you' }] : options, data: { name: incident.name, kind: incident.kind, severity: incident.severity ?? 2, role } });
}

function record(state, entry) {
  state.majorIncidents ??= [];
  state.majorIncidents = [{ age: state.character.age, ...entry }, ...state.majorIncidents].slice(0, 20);
}

function citation(ctx, name) {
  const { state } = ctx;
  const id = `incident.${state.character.age}`;
  if (state.honors.some((h) => h.id === id)) return;
  addHonor(state, { id, source: 'civil', name: `Unit Citation — ${name.replace(/^the /, '')}`, icon: '🎖️', prestige: 4, precedence: 52, citation: `For service during ${name}.` });
  ctx.log(`Your unit was cited for its work during ${name}.`, '🎖️', 'honor');
}

export const MajorIncidentsModule = {
  id: 'majorIncidents',
  order: 3.5,
  setup(engine) {
    engine.bus.on('disaster:struck', ({ ctx, disaster }) => {
      if (ctx.state.legal.incarceration || ctx.state.character.age < 16) return;
      // Volunteers get their own callout; a paid job (or none) gets this.
      const volunteering = Object.entries(ctx.state.emergency ?? {}).some(([id, m]) => id !== 'history' && m && !m.onLeave);
      if (!roleOf(ctx.state.career.job) && volunteering) return;
      rolePrompt(ctx, { name: disaster.name, kind: disaster.type, severity: disaster.severity, text: `${disaster.name} tore through the area.` });
    });
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (state.legal.incarceration || state.character.age < 16 || state.prompts.some((p) => p.type.startsWith('majorIncidents.'))) return;
    const role = roleOf(state.career.job);
    // A man-made major incident nearby: rare for anyone, more likely to involve you if you respond for a living.
    if (rng.chance(role ? 0.06 : 0.015)) {
      const m = rng.pick(MAN_MADE);
      return void rolePrompt(ctx, { ...m, severity: rng.int(1, 3) });
    }
    // Mutual aid to a disaster in a neighbouring area.
    if (['responder', 'health', 'infrastructure', 'coordination'].includes(role) && rng.chance(0.05)) {
      const kind = rng.pick(['wildfire', 'flood', 'hurricane', 'tornado', 'ice storm']);
      rolePrompt(ctx, { name: `the ${kind}`, kind, icon: { wildfire: '🔥', flood: '🌊', hurricane: '🌀', tornado: '🌪️', 'ice storm': '🧊' }[kind], text: `A ${kind} has overwhelmed the agencies two hours away.` }, true);
    }
  },
  resolvers: {
    respond(ctx, data, optionId) { resolve(ctx, data, optionId, false); },
    mutualAid(ctx, data, optionId) { resolve(ctx, data, optionId, true); },
  },
};

function resolve(ctx, data, optionId, mutualAid) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const sev = data.severity ?? 2;
  const sk = skill(state, { smarts: 1, fitness: 1, happiness: 1 });
  const ok = (bar) => sk + rng.int(-20, 20) >= bar;
  const perf = (n) => { if (job) job.performance = Math.round(clamp(job.performance + n, 0, 100)); };
  const pay = (share, label) => { if (job) ctx.earn(Math.round(job.salary * share / 100) * 100, label, { wage: true }); };
  let outcome = optionId;
  switch (optionId) {
    case 'decline': ctx.log(`You stayed home from ${data.name}. Others went.`, '🏠'); outcome = 'declined'; break;
    case 'front':
      if (ok(45 + sev * 5)) { perf(8); ctx.emit('health:trauma', { amount: 6 + sev * 2, source: data.name }); ctx.stat('happiness', 4); ctx.log(`You pulled people out of ${data.name}. Some of them you'll remember for the rest of your life.`, '🦺', 'good'); if (rng.chance(0.5)) citation(ctx, data.name); outcome = 'rescues'; }
      else { ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(20, 50) }); ctx.emit('health:trauma', { amount: 12 + sev * 2, source: data.name }); perf(2); ctx.log(`You were hurt going in during ${data.name}. Your crew got you out.`, '🩹', 'bad'); outcome = 'injured'; }
      pay(0.04 * sev, 'Disaster overtime'); break;
    case 'command':
      if (ok(55)) { perf(10); ctx.log(`You ran a branch of incident command for ${data.name}. The after-action report used your branch as the model.`, '🎛️', 'good'); citation(ctx, data.name); outcome = 'command'; }
      else { perf(-6); ctx.stat('stress', 8); ctx.log(`Your branch lost track of two crews for an hour during ${data.name}. The after-action report noticed.`, '🎛️', 'warn'); outcome = 'command trouble'; }
      pay(0.03 * sev, 'Disaster overtime'); break;
    case 'support': perf(3); ctx.stat('stress', 4); pay(0.03 * sev, 'Disaster overtime'); ctx.log(`You ran staging and the perimeter for ${data.name}. Without you nothing moves.`, '📋'); break;
    case 'console': perf(5); ctx.emit('health:trauma', { amount: 6, source: data.name }); pay(0.03 * sev, 'Disaster overtime'); ctx.log(`You took call after call during ${data.name}, some of them from people you couldn't reach in time.`, '🎧'); if (rng.chance(0.3)) citation(ctx, data.name); break;
    case 'relief': perf(1); ctx.log('You took the relief shift. Tomorrow\'s calls were just as bad.', '🛌'); break;
    case 'surge': perf(5); ctx.stat('stress', 8); ctx.emit('health:trauma', { amount: 5, source: data.name }); pay(0.04 * sev, 'Mass-casualty overtime'); ctx.log(`The hospital went to its mass-casualty plan for ${data.name}. You worked thirty hours straight.`, '🏥'); break;
    case 'triage':
      if (ok(50)) { perf(8); ctx.emit('health:trauma', { amount: 8, source: data.name }); ctx.log(`You ran triage at the door during ${data.name}. Hard calls, all of them right.`, '🏷️', 'good'); citation(ctx, data.name); }
      else { perf(-2); ctx.emit('health:trauma', { amount: 12, source: data.name }); ctx.log(`Triage during ${data.name} overwhelmed everyone. You'll second-guess some of those calls forever.`, '🏷️', 'warn'); }
      break;
    case 'eoc':
      if (ok(50)) { perf(10); ctx.log(`You ran the operations centre for ${data.name}: shelters open, resources where they were needed, the public kept informed.`, '🖥️', 'good'); citation(ctx, data.name); }
      else { perf(-8); ctx.log(`The response to ${data.name} was slow and the press noticed. Fingers pointed at the operations centre.`, '🖥️', 'warn'); }
      ctx.stat('stress', 8); break;
    case 'defer': ctx.log('The officials took the podium. You kept your head down.', '🏛️'); break;
    case 'restore': perf(6); pay(0.06 * sev, 'Restoration overtime'); if (rng.chance(0.1)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(15, 35) }); ctx.log(`You worked eighteen-hour days restoring service after ${data.name}. People cheered your truck.`, '🔧', 'good'); break;
    case 'normal': ctx.log('You worked your normal shifts.', '🕗'); break;
    case 'scene': perf(6); ctx.emit('health:trauma', { amount: 4, source: data.name }); ctx.log(`Your reporting from ${data.name} led the national news.`, '🎥', 'good'); break;
    case 'careful': perf(3); ctx.log(`You took your time and got ${data.name} right while others ran rumours.`, '📝'); break;
    case 'volunteer': ctx.stat('happiness', 6); ctx.stat('stress', 3); if (rng.chance(0.08)) ctx.emit('health:injury', { conditionId: 'backInjury', severity: rng.int(10, 25) }); ctx.log(`You filled sandbags and served meals at the shelter after ${data.name}.`, '🤝', 'good'); break;
    case 'donate': ctx.spend(500, `Donation — ${data.name} relief`, { allowDebt: true }); ctx.stat('happiness', 2); ctx.log(`You donated to the relief fund for ${data.name}.`, '💵'); break;
    default: ctx.log(`You stayed safe with your family during ${data.name}.`, '🏠');
  }
  record(state, { name: data.name, kind: data.kind, role: data.role ?? 'civilian', outcome, mutualAid });
}
