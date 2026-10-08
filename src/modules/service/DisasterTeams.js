/**
 * Federal disaster response: FEMA reservists (intermittent federal employees
 * deployed for weeks at a time to major disasters anywhere in the country)
 * and Disaster Medical Assistance Teams (NDMS clinicians who set up field
 * hospitals). You keep your civilian job; deployments pay a daily rate and
 * your employer must give you the leave.
 *
 * state.service.teams[id] = { title, rankIndex, years, deployments, declined, joinedAge }
 */
import { clamp } from '../../core/Random.js';
import { hasFelony, isOnActiveDuty } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { addHonor } from '../../core/State.js';

const MEDICAL = ['emt', 'paramedic', 'rn', 'np', 'medicalLicense', 'pharmacistLicense'];

export const TEAMS = {
  fema: {
    name: 'FEMA Reservist Cadre', icon: '🏕️', dailyPay: 320, minAge: 18,
    ranks: ['Reservist Trainee', 'Reservist Specialist', 'Reservist Lead', 'Task Force Leader', 'Federal Coordinating Officer staff'],
    desc: 'Housing inspections, individual assistance, logistics and public assistance for communities rebuilding after declared disasters.',
    tasks: ['inspecting flooded homes for individual assistance', 'running a disaster recovery center', 'tracking millions in debris-removal claims', 'moving generators and water to a staging area'],
  },
  dmat: {
    name: 'Disaster Medical Assistance Team', icon: '⛑️', dailyPay: 480, minAge: 18, needs: MEDICAL,
    ranks: ['Team Member', 'Supervisory Team Member', 'Deputy Team Commander', 'Team Commander'],
    desc: 'NDMS medical teams: field hospitals and overloaded ERs after hurricanes, earthquakes and mass-casualty events. Needs an EMT, paramedic, nursing, physician or pharmacist credential.',
    tasks: ['triaging patients in a tent ER outside a flooded hospital', 'staffing a field hospital at a convention center', 'running a shelter medical clinic', 'evacuating a nursing home by helicopter'],
  },
  usar: {
    name: 'FEMA Urban Search & Rescue Task Force', icon: '🏚️', dailyPay: 420, minAge: 21, trauma: 9, award: 'US&R Task Force Deployment Award',
    needs: ['ff1', 'paramedic', 'pe', 'medicalLicense'], needsText: 'Needs Firefighter I, a paramedic card, a PE license (structural specialist) or a medical license',
    ranks: ['Rescue Specialist', 'Rescue Squad Officer', 'Rescue Team Manager', 'Task Force Leader'],
    desc: 'One of 28 federal task forces: 70 firefighters, medics, structural engineers and canine handlers who dig people out of collapsed buildings. You keep your job; deployments pay.',
    tasks: ['breaching a collapsed parking garage to reach a trapped worker', 'searching pancaked apartments with a search dog', 'shoring a hospital wing so rescuers could get in', 'swift-water rescues from rooftops after a hurricane'],
  },
  teamRubicon: {
    name: 'Team Rubicon', icon: '🧰', dailyPay: 0, minAge: 18, trauma: 3, award: 'Team Rubicon Greyshirt Service Award', veterans: true,
    ranks: ['Greyshirt', 'Strike Team Leader', 'Incident Commander', 'Regional Leadership'],
    desc: 'Veteran-led disaster volunteers ("Greyshirts"): mucking out flooded homes, sawing storm debris, rebuilding. Unpaid — but it gives veterans a mission again.',
    tasks: ['mucking out flooded homes with a chainsaw team', 'tarping roofs after a tornado', 'clearing downed trees for elderly homeowners', 'rebuilding a family\'s home over a long weekend'],
  },
  ares: {
    name: 'ARES Emergency Radio', icon: '📻', dailyPay: 0, minAge: 12, trauma: 1, award: 'ARES Public Service Award',
    needs: ['hamTech'], needsText: 'Needs an amateur radio license (Technician)',
    ranks: ['Operator', 'Net Control Station', 'Emergency Coordinator', 'Section Emergency Coordinator'],
    desc: 'Amateur Radio Emergency Service: when cell towers and the internet fail, licensed hams pass messages for shelters, hospitals and emergency managers.',
    tasks: ['running the shelter net from a school gym', 'relaying hospital bed counts when phones went down', 'passing welfare messages for evacuees', 'staffing the county EOC radio room'],
  },
};

const NATIONAL = ['Hurricane Ida in Louisiana', 'wildfires in California', 'flooding in Kentucky', 'Hurricane Maria\'s aftermath in Puerto Rico', 'tornadoes in Mississippi', 'an earthquake in Alaska', 'a typhoon in Guam', 'flooding in Vermont', 'Hurricane Helene in North Carolina'];

export function teamEligibility(state, id) {
  const t = TEAMS[id];
  if (!t) return { ok: false, reason: 'Unknown team' };
  if (state.service.teams[id]) return { ok: false, reason: 'Already a member' };
  if (state.character.age < t.minAge) return { ok: false, reason: `Must be ${t.minAge}+` };
  if (hasFelony(state)) return { ok: false, reason: 'Fails the federal background check' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (t.needs && !t.needs.some((c) => hasCredential(state, c))) return { ok: false, reason: t.needsText ?? 'Needs a clinical license or EMS certification' };
  return { ok: true };
}

export function joinTeam(ctx, id) {
  const { state } = ctx;
  const check = teamEligibility(state, id);
  if (!check.ok) return ctx.toast(check.reason, 'warn');
  state.service.teams[id] = { rankIndex: 0, years: 0, deployments: 0, declined: 0, joinedAge: state.character.age };
  ctx.log(`You were sworn in as a ${TEAMS[id].ranks[0]} with the ${TEAMS[id].name}.`, TEAMS[id].icon, 'milestone');
  ctx.toast(`Joined: ${TEAMS[id].name}`, 'good');
}

export function leaveTeam(ctx, id, reason) {
  const { state } = ctx;
  const m = state.service.teams[id];
  if (!m) return;
  state.service.history.push({ kind: id, name: TEAMS[id].name, title: TEAMS[id].ranks[m.rankIndex], years: m.years, endAge: state.character.age, reason, deployments: m.deployments });
  state.service.teams[id] = null;
  ctx.log(`You left the ${TEAMS[id].name}. ${reason}.`, TEAMS[id].icon);
}

/** Yearly: members get deployment requests to national disasters. */
export function teamsTick(ctx) {
  const { state, rng } = ctx;
  for (const [id, m] of Object.entries(state.service.teams)) {
    if (!m) continue;
    if (state.legal.incarceration) { leaveTeam(ctx, id, 'Separated during incarceration'); continue; }
    m.years += 1;
    if (isOnActiveDuty(state) || !rng.chance(0.65)) continue;
    deploymentRequest(ctx, id, rng.pick(NATIONAL));
  }
}

export function deploymentRequest(ctx, id, where) {
  const t = TEAMS[id];
  if (ctx.state.prompts.some((p) => p.type === 'service.teamDeploy' && p.data.id === id)) return;
  ctx.prompt({
    type: 'service.teamDeploy',
    icon: t.icon,
    title: `${t.name}: Deployment Request`,
    text: `You're requested for ${where}: ${ctx.rng.int(2, 6)} weeks. Your employer has to release you.`,
    options: [
      { id: 'go', label: '🧳 Deploy', hint: t.dailyPay ? `≈$${(t.dailyPay * 30).toLocaleString()} a month` : 'Unpaid — your travel and meals are covered' },
      { id: 'decline', label: '🙅 Decline this one', hint: 'Too many declines and you\'re dropped' },
    ],
    data: { id, where },
  });
}

export const TeamResolvers = {
  teamDeploy(ctx, data, optionId) {
    const { state, rng } = ctx;
    const m = state.service.teams[data.id];
    const t = TEAMS[data.id];
    if (!m) return;
    if (optionId === 'decline') {
      m.declined += 1;
      if (m.declined >= 3) leaveTeam(ctx, data.id, 'Dropped from the roster after declining three deployments');
      return;
    }
    const days = rng.int(14, 45);
    m.deployments += 1;
    m.declined = 0;
    if (t.dailyPay) ctx.earn(t.dailyPay * days, `${t.name} deployment pay`, { wage: true });
    ctx.stat('stress', 6);
    // Veterans find something they'd lost: a mission and a team.
    const vet = state.military.history.length > 0;
    ctx.stat('happiness', t.veterans && vet ? 9 : 4);
    if (t.veterans && vet) ctx.emit('health:trauma', { amount: -4, source: 'purpose' });
    ctx.emit('health:trauma', { amount: t.trauma ?? (data.id === 'dmat' ? 6 : 3), source: 'disaster' });
    state.service.volunteerHours = (state.service.volunteerHours ?? 0) + (t.dailyPay ? 0 : days * 10);
    ctx.log(`${days} days deployed to ${data.where}: ${rng.pick(t.tasks)}.`, t.icon, 'good');
    if (state.career.job && rng.chance(0.15)) ctx.emit('career:adjust', { boss: -4 });
    if (m.rankIndex < t.ranks.length - 1 && m.deployments >= (m.rankIndex + 1) * 3 && rng.chance(clamp(0.4 + (state.stats.smarts - 55) / 200, 0.1, 0.8))) {
      m.rankIndex += 1;
      ctx.log(`${t.name}: promoted to ${t.ranks[m.rankIndex]}.`, '⬆️', 'good');
    }
    if (m.deployments % 5 === 0) addHonor(state, { id: `service.${data.id}`, source: 'service', name: t.award ?? (data.id === 'fema' ? 'FEMA Disaster Service Award' : 'NDMS Distinguished Service Award'), icon: t.icon, ribbon: [['#002868', 3], ['#fff', 1], ['#c8102e', 3]], prestige: 8, precedence: 23, citation: `${m.deployments} disaster deployments.` });
  },
};

/** Disasters in your own state call up your team. */
export function localDisaster(ctx, disaster) {
  for (const id of Object.keys(TEAMS)) {
    if (ctx.state.service.teams[id] && disaster.severity >= 2) deploymentRequest(ctx, id, disaster.name);
  }
}
