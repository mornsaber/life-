/**
 * Civic duty outside a job.
 *
 *   Volunteer roles   Real programs with real commitments: a CASA court
 *                     advocate for a child in foster care, a 988 crisis-line
 *                     counselor, an election poll worker (paid, in election
 *                     years), a youth coach or scout leader, a hospice
 *                     volunteer, Habitat for Humanity builds, and giving
 *                     blood. Each takes hours (up to three roles at once),
 *                     some need a background check or training, and the
 *                     hours add up to the President's Volunteer Service
 *                     Award. Some roles help related careers.
 *   Selective Service Men must register between 18 and 26. Most are
 *                     registered automatically with a driver's license;
 *                     those who never register are barred from federal jobs
 *                     unless OPM accepts that it wasn't knowing and willful.
 *
 * state.service.roles = { [id]: { since, hours, cases } }, state.service.volunteerHours (lifetime)
 * state.military.sss = { registered, missed, waived }
 */
import { addHonor, hasFelony, currentYear } from '../../core/State.js';
import { hasCredential } from '../credentials/LicensingEngine.js';

export const MAX_ROLES = 3;

export const ROLES = {
  casa: {
    name: 'CASA Court Advocate', icon: '⚖️', minAge: 21, hours: 100, check: true, training: '30 hours of training, then you\'re sworn in by a judge',
    desc: 'Speak for one child in foster care: visit them, read every file, and tell the judge what\'s best for them.', careers: ['socialWork', 'cps', 'law', 'publicDefender', 'prosecution', 'courts', 'counseling'],
  },
  crisisLine: {
    name: '988 Crisis Line Volunteer', icon: '☎️', minAge: 18, hours: 150, training: '40 hours of crisis-counseling training',
    desc: 'Overnight shifts answering calls and texts from people in crisis.', careers: ['counseling', 'psychology', 'socialWork', 'nursing'],
  },
  pollWorker: {
    name: 'Election Poll Worker', icon: '🗳️', minAge: 18, hours: 20, paid: 250, elections: true,
    desc: 'Check in voters and run a precinct from 6 a.m. to close, in even-year elections. Paid a stipend.', careers: ['municipalAdmin', 'legislativeStaff', 'courts'],
  },
  coach: {
    name: 'Youth Sports Coach', icon: '⚽', minAge: 18, hours: 120, check: true,
    desc: 'Practices twice a week and games on Saturday for a rec-league team.', careers: ['education', 'fitness', 'athletics'],
  },
  scouts: {
    name: 'Scout Leader', icon: '⛺', minAge: 21, hours: 150, check: true, training: 'Youth-protection training',
    desc: 'Weekly meetings, monthly campouts, and walking kids toward their Eagle.', careers: ['education', 'parkService', 'forester'],
  },
  hospice: {
    name: 'Hospice Volunteer', icon: '🕊️', minAge: 18, hours: 60, training: '20 hours of training',
    desc: 'Sit with dying patients so their families can rest.', careers: ['nursing', 'medical', 'clergy', 'catholicClergy', 'counseling'],
  },
  habitat: {
    name: 'Habitat for Humanity Builder', icon: '🔨', minAge: 16, hours: 80,
    desc: 'Build days framing, roofing and painting homes alongside the families who\'ll live in them.', careers: ['carpentry', 'trades', 'architecture', 'realestate'],
  },
  blood: {
    name: 'Blood Donor', icon: '🩸', minAge: 17, hours: 6, health: 50,
    desc: 'A pint every eight weeks or so. One donation can help three patients.', careers: [],
  },
};

const s = (state) => state.service;
export const activeRoles = (state) => Object.keys(s(state)?.roles ?? {});

export function roleEligibility(state, id) {
  const r = ROLES[id];
  if (!r) return { ok: false, reason: 'Unknown role' };
  if (s(state).roles[id]) return { ok: false, reason: 'Already doing this' };
  if (state.character.age < r.minAge) return { ok: false, reason: `Must be ${r.minAge}+` };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (r.check && hasFelony(state)) return { ok: false, reason: 'Fails the background check' };
  if (r.health && state.stats.health < r.health) return { ok: false, reason: 'Not healthy enough to donate' };
  if (activeRoles(state).length >= MAX_ROLES) return { ok: false, reason: `No time for more than ${MAX_ROLES} roles` };
  return { ok: true };
}

/** President's Volunteer Service Award: yearly tiers for adults, plus a lifetime award at 4,000 hours. */
const PVSA = [
  { min: 500, id: 'pvsa.gold', name: 'President\'s Volunteer Service Award — Gold', prestige: 6, ribbon: [['#c9a227', 3]] },
  { min: 250, id: 'pvsa.silver', name: 'President\'s Volunteer Service Award — Silver', prestige: 4, ribbon: [['#9ea7ad', 3]] },
  { min: 100, id: 'pvsa.bronze', name: 'President\'s Volunteer Service Award — Bronze', prestige: 2, ribbon: [['#a0612e', 3]] },
];

const CASES = [
  { id: 'reunify', title: 'Back Home?', text: 'Your CASA child\'s mother finished rehab and wants him back. The caseworker is ready to recommend it; you have doubts about her new boyfriend.', options: [
    { id: 'support', label: '🏠 Support reunification with a safety plan', good: 0.6, win: 'The judge sent him home with services. Six months later, he\'s thriving.', lose: 'He was back in care within a year. You think about it often.' },
    { id: 'more', label: '🔎 Ask the judge for six more months of monitoring', good: 0.7, win: 'The extra time turned up nothing worrying, and he went home on solid ground.', lose: 'The delay was hard on him, and the judge noted it.' },
  ] },
  { id: 'school', title: 'Fourth School in Two Years', text: 'Your CASA child is being moved to a new foster home — and a new school, again.', options: [
    { id: 'fight', label: '🚌 Push for transportation to keep her in her school', good: 0.65, win: 'The district agreed. She made the honor roll that spring.', lose: 'The district said no. She started over, again.' },
    { id: 'accept', label: '🤝 Help her settle into the new school', good: 0.5, win: 'You met her new teachers and she found a friend the first week.', lose: 'She struggled, and stopped talking to you for a while.' },
  ] },
];
const CALLS = [
  { id: 'caller', title: 'A Caller at 3 a.m.', text: 'A young man says he has pills in his hand and just wants to talk to someone first.', options: [
    { id: 'stay', label: '🫂 Stay with him, build a safety plan', good: 0.75, win: 'An hour later he flushed the pills and agreed to see a counselor in the morning.', lose: 'He hung up. You\'ll never know. Your supervisor sat with you afterward.' },
    { id: 'rescue', label: '🚑 Start an emergency rescue', good: 0.8, win: 'Paramedics reached him in time. He called back weeks later to say thank you.', lose: 'The rescue reached him, angry and frightened; he was hospitalized.' },
  ] },
];
const PROMPT_POOL = { casa: CASES, crisisLine: CALLS };

export const VolunteerModule = {
  id: 'volunteering',
  order: 41.5,
  init(state) {
    state.service ??= {};
    state.service.roles ??= {};
    state.service.volunteerHours ??= 0;
    // Saves from before registration existed: adults count as registered.
    state.military.sss ??= { registered: state.character.age >= 18, missed: false, waived: false };
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    selectiveServiceTick(ctx);
    const roles = s(state).roles;
    let hours = 0;
    for (const [id, m] of Object.entries(roles)) {
      const r = ROLES[id];
      if (state.legal.incarceration) { delete roles[id]; continue; }
      if (r.elections && currentYear(state) % 2 !== 0) continue;
      const h = Math.round(r.hours * rng.float(0.8, 1.2));
      m.hours += h;
      hours += h;
      if (r.paid) ctx.earn(r.paid, 'Poll worker stipend');
      // What the role does for you.
      switch (id) {
        case 'casa': ctx.stat('stress', 3); ctx.stat('happiness', 3); m.cases = (m.cases ?? 0) + (rng.chance(0.4) ? 1 : 0); break;
        case 'crisisLine': ctx.stat('stress', 4); ctx.emit('health:trauma', { amount: 2, source: 'crisis calls' }); ctx.stat('happiness', 3); break;
        case 'coach': ctx.stat('fitness', 2); ctx.stat('happiness', 4); ctx.log(rng.pick(['Your team went 9–3 and the kids dumped Gatorade on you.', 'Your team didn\'t win a game. Every kid came back next season anyway.', 'One of your players thanked you at the end-of-season pizza party for believing in her.']), r.icon); break;
        case 'scouts': ctx.stat('fitness', 1); ctx.stat('happiness', 3); if (rng.chance(0.2)) ctx.log('One of your scouts earned Eagle. He asked you to pin the medal.', '🦅', 'good'); break;
        case 'hospice': ctx.stat('happiness', 2); ctx.emit('health:trauma', { amount: 1, source: 'grief' }); break;
        case 'habitat': ctx.stat('fitness', 2); ctx.stat('happiness', 3); if (rng.chance(0.3)) ctx.log('You handed the keys to a family at a Habitat home dedication.', '🔑', 'good'); break;
        case 'blood': {
          const pints = rng.int(3, 6);
          m.cases = (m.cases ?? 0) + pints;
          ctx.stat('health', -1);
          const gallons = Math.floor(m.cases / 8);
          if (gallons > (m.gallons ?? 0)) { m.gallons = gallons; ctx.log(`You reached ${gallons} gallon${gallons > 1 ? 's' : ''} donated — a new pin from the blood center.`, '🩸', 'good'); }
          if (gallons >= 5 && !state.honors.some((x) => x.id === 'blood.5gal')) addHonor(state, { id: 'blood.5gal', source: 'civil', name: 'Five-Gallon Blood Donor', icon: '🩸', prestige: 2, precedence: 70, citation: 'Forty pints donated.' });
          break;
        }
        case 'pollWorker': if (rng.chance(0.3)) ctx.log(rng.pick(['The line wrapped around the gym until 9 p.m.; you kept everyone in it.', 'A voter insisted he\'d already been checked in. You got him a provisional ballot.', 'The scanner jammed at 7 a.m. You fed ballots into the emergency bin all day.']), r.icon); break;
        default:
      }
      // Experience that counts in related careers.
      const job = state.career.job;
      if (job && r.careers.includes(job.professionId)) job.performance = Math.min(100, job.performance + 2);
      const pool = PROMPT_POOL[id];
      if (pool && rng.chance(0.5) && !state.prompts.some((p) => p.type === 'volunteering.moment')) {
        const ev = rng.pick(pool);
        ctx.prompt({ type: 'volunteering.moment', icon: r.icon, title: ev.title, text: ev.text, options: ev.options.map(({ id: oid, label }) => ({ id: oid, label })), data: { role: id, ev: ev.id } });
      }
    }
    if (!hours) return;
    s(state).volunteerHours += hours;
    const tier = PVSA.find((t) => hours >= t.min);
    if (tier && !state.honors.some((x) => x.id === tier.id) && state.character.age >= 26) {
      addHonor(state, { id: tier.id, source: 'civil', name: tier.name, icon: '🇺🇸', prestige: tier.prestige, precedence: 60, citation: `${hours} hours of volunteer service in a year.`, ribbon: tier.ribbon });
      ctx.log(`${hours} volunteer hours this year earned you the ${tier.name}.`, '🇺🇸', 'honor');
    }
    if (s(state).volunteerHours >= 4000 && !state.honors.some((x) => x.id === 'pvsa.lifetime')) {
      addHonor(state, { id: 'pvsa.lifetime', source: 'civil', name: 'President\'s Lifetime Achievement Award', icon: '🇺🇸', prestige: 10, precedence: 40, citation: '4,000+ hours of volunteer service over a lifetime.', ribbon: [['#002868', 1], ['#c9a227', 2], ['#002868', 1]] });
      ctx.log('Over 4,000 hours of service in your life: the President\'s Lifetime Achievement Award.', '🇺🇸', 'honor');
    }
  },
  actions: {
    join(ctx, id) {
      const { state } = ctx;
      const ok = roleEligibility(state, id);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      s(state).roles[id] = { since: state.character.age, hours: 0, cases: 0 };
      const r = ROLES[id];
      ctx.log(`You signed up as a ${r.name.toLowerCase().replace(/^(\w)/, (c) => c)}.${r.training ? ` First: ${r.training}.` : ''}${r.check ? ' You passed the background check.' : ''}`, r.icon, 'good');
    },
    leave(ctx, id) {
      const { state } = ctx;
      const m = s(state).roles[id];
      if (!m) return;
      delete s(state).roles[id];
      s(state).history.push({ kind: id, name: ROLES[id].name, title: 'Volunteer', years: state.character.age - m.since, endAge: state.character.age, reason: `${m.hours} hours`, deployments: 0 });
      ctx.log(`You stepped down as a ${ROLES[id].name.toLowerCase()} after ${m.hours} hours.`, ROLES[id].icon);
    },
    /** Ask OPM for a Selective Service status letter to clear a missed registration. */
    sssLetter(ctx) {
      const { state, rng } = ctx;
      const sss = state.military.sss;
      if (!sss.missed || sss.waived) return;
      if (state.yearly['sss.letter']) return ctx.toast('One request a year', 'warn');
      state.yearly['sss.letter'] = 1;
      if (rng.chance(0.55)) { sss.waived = true; ctx.log('OPM accepted that your failure to register wasn\'t knowing and willful. Federal jobs are open to you again.', '📄', 'good'); }
      else ctx.log('OPM found your failure to register was knowing and willful. Federal employment stays closed to you.', '📄', 'bad');
    },
    sssRegister(ctx) {
      const sss = ctx.state.military.sss;
      if (sss.registered || ctx.state.character.age >= 26) return;
      sss.registered = true;
      ctx.log('You registered with the Selective Service System.', '📋');
    },
  },
  resolvers: {
    moment(ctx, data, optionId) {
      const { state, rng } = ctx;
      const ev = PROMPT_POOL[data.role]?.find((e) => e.id === data.ev);
      const o = ev?.options.find((x) => x.id === optionId);
      if (!o) return;
      const win = rng.chance(o.good);
      ctx.stat('happiness', win ? 6 : -3);
      if (!win) ctx.emit('health:trauma', { amount: 3, source: 'volunteering' });
      ctx.log(win ? o.win : o.lose, ROLES[data.role].icon, win ? 'good' : 'warn');
      if (win && data.role === 'casa' && (s(state).roles.casa?.cases ?? 0) >= 3 && !state.honors.some((x) => x.id === 'casa.advocate')) addHonor(state, { id: 'casa.advocate', source: 'civil', name: 'CASA Advocate of the Year', icon: '⚖️', prestige: 4, precedence: 58, citation: 'For speaking up for children in foster care.' });
    },
  },
};

/** Men 18–25 must register; a driver's license does it automatically in most states. */
function selectiveServiceTick(ctx) {
  const { state } = ctx;
  const sss = state.military.sss;
  if (state.character.gender !== 'male' || sss.registered || sss.missed) return;
  const age = state.character.age;
  if (age < 18) return;
  if (hasCredential(state, 'driverLicense') || state.military.service || state.military.history.length) {
    sss.registered = true;
    ctx.log(hasCredential(state, 'driverLicense') ? 'Your driver\'s license registered you with the Selective Service System automatically.' : 'Joining the military registered you with the Selective Service System.', '📋');
    return;
  }
  if (age === 18) ctx.log('You turned 18: men must register with the Selective Service System (on the Military tab).', '📋', 'warn');
  if (age >= 26) {
    sss.missed = true;
    ctx.log('You turned 26 without ever registering with the Selective Service. You can\'t be prosecuted now — but you\'re barred from federal jobs unless OPM rules it wasn\'t knowing and willful.', '📋', 'bad');
  }
}

/** Federal hiring bar for men who never registered. */
export const sssBarred = (state) => state.character.gender === 'male' && state.military.sss?.missed && !state.military.sss.waived && !state.military.history.length;

