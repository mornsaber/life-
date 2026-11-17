/**
 * Policing and firefighting of their day: the same career in 1905, 1925, 1970 and 2020 meets
 * different moments. Each is tied to a country (or anywhere) and a span of years, comes at most
 * once in a career, and asks you to choose.
 *
 *   Police   the ward boss's patronage, Prohibition money, the coming of the radio car,
 *            Miranda, corruption commissions, the unit-beat Panda car, PACE and the Scarman
 *            report, the miners' strike, CompStat and the numbers, the Macpherson report,
 *            austerity cuts, body cameras, the summer of 2020.
 *   Fire     the horses retired, breathing apparatus (and the "smoke eaters" who refused it),
 *            the move to medical calls, the British firefighters' strikes of 1977 and 2002,
 *            station closures.
 *
 * state.serviceEra = { seen: [id] }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { eraScale } from '../economy/EraEconomy.js';
import { serviceOfJob } from './Uniformed.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 2843) ^ (state.character.age * 911 + 0xe7a)) >>> 0);

/** { id, service, countries?, from, until, title, icon, text, options: [{ id, label, hint, fx }] } fx: { perf, boss, trauma, stress, happiness, cash, offense, flag, note } */
export const MOMENTS = [
  /* ---- Police ---- */
  { id: 'patronage', service: 'police', countries: ['US'], from: 1850, until: 1910, icon: '🎩', title: 'The Ward Boss',
    text: 'The ward boss got you this job, and he reminds you of it: a contribution to the party at election time, and a blind eye to his saloon.',
    options: [{ id: 'pay', label: '💵 Pay up and look away', hint: 'How it\'s done', fx: { cash: -150, boss: 10 } }, { id: 'refuse', label: '🙅 Refuse', hint: 'Honest, and you\'ll walk the worst beat in the city', fx: { boss: -15, perf: -5, happiness: 3 } }] },
  { id: 'prohibition', service: 'police', countries: ['US'], from: 1920, until: 1933, icon: '🥃', title: 'Prohibition',
    text: 'A bootlegger\'s man offers you an envelope every week to keep your patrol away from a warehouse. Half your station takes it.',
    options: [{ id: 'take', label: '💰 Take the envelope', hint: 'Everyone does', fx: { cash: 1500, offense: 'briberyOfficer' } }, { id: 'refuse', label: '🙅 Refuse it', fx: { boss: -5, happiness: 2 } }, { id: 'raid', label: '🚨 Raid the warehouse', hint: 'Make a name, make enemies', fx: { perf: 10, trauma: 4, stress: 6 } }] },
  { id: 'radio', service: 'police', from: 1930, until: 1950, icon: '📻', title: 'The Radio Car',
    text: 'The force has fitted radios to its cars. No more walking to the call box: the station can reach you anywhere.',
    options: [{ id: 'car', label: '🚓 Volunteer for the radio cars', hint: 'Faster, busier', fx: { perf: 5 } }, { id: 'beat', label: '🚶 Stay on the beat', hint: 'You know every shopkeeper', fx: { happiness: 3 } }] },
  { id: 'miranda', service: 'police', countries: ['US'], from: 1966, until: 1970, icon: '📜', title: 'Miranda',
    text: 'The Supreme Court says suspects must be told their rights before questioning. The old hands say it will end confessions.',
    options: [{ id: 'adapt', label: '📋 Learn the new rules and build cases on evidence', fx: { perf: 5 } }, { id: 'grumble', label: '😤 Carry on the old way where you can', hint: 'Cases may be thrown out', fx: { perf: -5, flag: 'oldWays' } }] },
  { id: 'commission', service: 'police', countries: ['US'], from: 1970, until: 1974, icon: '🔍', title: 'The Commission',
    text: 'A commission is investigating police corruption. Its investigators want to talk to you about what you have seen in your precinct.',
    options: [{ id: 'testify', label: '🎙️ Tell them what you\'ve seen', hint: 'Colleagues won\'t forgive it', fx: { boss: -20, happiness: 4, stress: 8, note: 'You testified. Some of your colleagues stopped speaking to you; one shook your hand in the car park.' } }, { id: 'silent', label: '🤐 Say you saw nothing', fx: { stress: 4 } }] },
  { id: 'panda', service: 'police', countries: ['GB'], from: 1967, until: 1975, icon: '🐼', title: 'Unit Beat Policing',
    text: 'The force is taking officers off foot patrol and putting them in small blue and white "Panda" cars. More ground covered; fewer conversations.',
    options: [{ id: 'panda', label: '🚗 Take a Panda car', fx: { perf: 4 } }, { id: 'foot', label: '🚶 Ask to stay on foot', fx: { happiness: 2 } }] },
  { id: 'scarman', service: 'police', countries: ['GB'], from: 1981, until: 1985, icon: '📘', title: 'After the Riots',
    text: 'The Scarman report into the riots says the police lost the trust of the communities they policed. The new chief wants community officers.',
    options: [{ id: 'community', label: '🤝 Become a community beat officer', fx: { perf: 3, happiness: 4 } }, { id: 'tsg', label: '🛡️ Join the support group for public order', fx: { perf: 5, trauma: 5 } }] },
  { id: 'pace', service: 'police', countries: ['GB'], from: 1986, until: 1990, icon: '⚖️', title: 'PACE',
    text: 'The Police and Criminal Evidence Act has arrived: interviews taped, detention clocks, custody sergeants. Paperwork everywhere.',
    options: [{ id: 'learn', label: '📋 Master it', hint: 'Custody sergeants are in demand', fx: { perf: 5 } }, { id: 'groan', label: '😮‍💨 Muddle through', fx: {} }] },
  { id: 'miners', service: 'police', countries: ['GB'], from: 1984, until: 1986, icon: '⛏️', title: 'The Miners\' Strike',
    text: 'You are being sent by coach to the coalfields to police the pickets. The overtime is huge. Some of the miners are your cousins.',
    options: [{ id: 'go', label: '🚌 Go', hint: 'The overtime pays the mortgage', fx: { cash: 4000, trauma: 6, stress: 6 } }, { id: 'excuse', label: '🙏 Ask to be excused', hint: 'Not well received', fx: { boss: -10 } }] },
  { id: 'compstat', service: 'police', from: 1994, until: 2012, icon: '📊', title: 'The Numbers',
    text: 'Every week the commanders are grilled on crime figures. Your sergeant hints that some burglaries could be recorded as "criminal damage".',
    options: [{ id: 'honest', label: '📋 Record crimes as they are', fx: { boss: -5, happiness: 2 } }, { id: 'juke', label: '📉 Massage the figures', hint: 'Everyone\'s doing it', fx: { boss: 8, flag: 'jukedStats' } }] },
  { id: 'macpherson', service: 'police', countries: ['GB'], from: 1999, until: 2002, icon: '📕', title: 'The Macpherson Report',
    text: 'The inquiry into the murder of a black teenager finds the force institutionally racist. There is training, anger, and a lot of silence in the canteen.',
    options: [{ id: 'listen', label: '👂 Take it seriously', fx: { happiness: 2, perf: 3 } }, { id: 'defensive', label: '😤 Get defensive', fx: { perf: -3 } }] },
  { id: 'austerity', service: 'police', countries: ['GB'], from: 2010, until: 2016, icon: '✂️', title: 'The Cuts',
    text: 'Budgets are being cut by a fifth. Stations are closing and posts are going unfilled. You are offered voluntary redundancy, or a heavier caseload.',
    options: [{ id: 'stay', label: '💪 Stay and carry the load', fx: { stress: 8, perf: 3 } }, { id: 'go', label: '🚪 Take the package', hint: 'A year\'s pay, and out', fx: { leave: 'Took voluntary redundancy in the cuts' } }] },
  { id: 'bodycam', service: 'police', from: 2014, until: 2020, icon: '📹', title: 'Body Cameras',
    text: 'Everyone on patrol now wears a camera. Complaints are down, and every moment of your shift is on the record.',
    options: [{ id: 'fine', label: '👍 Fine by you', fx: { perf: 2 } }, { id: 'resent', label: '😒 Resent it', fx: { stress: 3 } }] },
  { id: 'summer2020', service: 'police', countries: ['US'], from: 2020, until: 2022, icon: '✊', title: 'The Summer of 2020',
    text: 'After a man died under an officer\'s knee in Minneapolis, there are protests in every city, calls to defund the police, and colleagues quitting.',
    options: [{ id: 'listen', label: '🤝 Walk with the marchers and listen', fx: { happiness: 2, boss: -5 } }, { id: 'line', label: '🛡️ Hold the line', fx: { trauma: 6, stress: 6 } }, { id: 'quit', label: '🚪 Quit', fx: { leave: 'Quit policing in 2020' } }] },

  /* ---- Fire ---- */
  { id: 'horses', service: 'fire', from: 1910, until: 1925, icon: '🐎', title: 'The Last Horses',
    text: 'The motor pumps have arrived. The horses that pulled your engine are being sold off; the old hands are close to tears.',
    options: [{ id: 'drive', label: '🚒 Learn to drive the motor pump', fx: { perf: 6 } }, { id: 'horses', label: '🐎 Ask to stay with the horse-drawn engine while it lasts', fx: { happiness: 4 } }] },
  { id: 'breathing', service: 'fire', from: 1955, until: 1975, icon: '😷', title: 'Breathing Apparatus',
    text: 'The brigade is issuing breathing apparatus. The old "smoke eaters" laugh at anyone who wears a mask.',
    options: [{ id: 'wear', label: '😷 Wear it every time', hint: 'Your lungs will thank you', fx: { smoke: -30 } }, { id: 'refuse', label: '💨 Eat smoke like the old hands', hint: 'Respect now; cancer later', fx: { smoke: 40, boss: 5 } }] },
  { id: 'medical', service: 'fire', countries: ['US', 'CA', 'AU'], from: 1972, until: 1990, icon: '🚑', title: 'Fire-Based EMS',
    text: 'The department is taking on the ambulances. Firefighters who train as paramedics get extra pay, and most calls will be medical.',
    options: [{ id: 'train', label: '🩺 Train as a firefighter-paramedic', fx: { perf: 6, cash: 0, note: 'You qualified as a firefighter-paramedic. Most of your calls are medical now.' } }, { id: 'fire', label: '🔥 Stay a firefighter', fx: {} }] },
  { id: 'strike77', service: 'fire', countries: ['GB'], from: 1977, until: 1979, icon: '🪧', title: 'The Firefighters\' Strike',
    text: 'The union has called the first national firefighters\' strike. The army is covering with old "Green Goddess" engines.',
    options: [{ id: 'strike', label: '🪧 Strike with your watch', hint: 'Nine weeks without pay', fx: { cash: -1500, happiness: 3 } }, { id: 'work', label: '🚒 Cross the picket line', hint: 'Your watch won\'t forget', fx: { boss: 10, happiness: -8 } }] },
  { id: 'strike02', service: 'fire', countries: ['GB'], from: 2002, until: 2004, icon: '🪧', title: 'Strike Again',
    text: 'The FBU has called national strikes over pay. The Green Goddesses are out of storage once more.',
    options: [{ id: 'strike', label: '🪧 Strike', fx: { cash: -800, happiness: 2 } }, { id: 'work', label: '🚒 Keep working', fx: { happiness: -6 } }] },
  { id: 'closure', service: 'fire', from: 2008, until: 2030, icon: '🏚️', title: 'Your Station Is Closing',
    text: 'Fires are rarer than they were and budgets are tight. Your station is to close and its crew to be split up.',
    options: [{ id: 'fight', label: '📣 Campaign to save it', hint: 'The town is behind you', fx: { boss: -8, happiness: 3 } }, { id: 'move', label: '🧳 Take the transfer quietly', fx: { happiness: -3 } }] },
];

const seenOf = (state) => (state.serviceEra ??= { seen: [] }).seen;

/** The era's note for the card: how the job is done now. */
export function eraNote(state, service) {
  const y = yearNow(state);
  const cc = state.character.countryId ?? 'US';
  if (service === 'police') {
    if (y < 1930) return 'Foot patrol, a whistle and a call box. No radio: you are on your own until help runs to you.';
    if (y < 1960) return 'Radio cars and the first professional standards; still mostly on your own on the beat.';
    if (y < 1985) return cc === 'GB' ? 'Panda cars, personal radios, and a public that is starting to ask questions.' : 'Radio cars, rising crime and riots, new rules on questioning.';
    if (y < 2010) return 'Computers, crime figures every week, and community policing on the posters.';
    return 'Body cameras, phones filming every arrest, and more mental-health calls than crimes.';
  }
  if (y < 1920) return 'Horse-drawn steam pumps, leather helmets, and no breathing apparatus.';
  if (y < 1970) return 'Motor pumps and ladders; breathing apparatus is new and many refuse it.';
  if (y < 2000) return 'Breathing apparatus on every call; smoke alarms are cutting the number of house fires.';
  return 'Fewer fires than ever: most calls are crashes, floods and medical emergencies.';
}

export const ServiceErasModule = {
  id: 'serviceEras',
  order: 31.2,
  onAgeUp(ctx) {
    const { state } = ctx;
    const service = serviceOfJob(state.career?.job);
    if (!['police', 'fire'].includes(service) || state.prompts.some((p) => p.type === 'serviceEras.moment')) return;
    const y = yearNow(state);
    const cc = state.character.countryId ?? 'US';
    const seen = seenOf(state);
    const open = MOMENTS.filter((m) => m.service === service && y >= m.from && y < m.until && (!m.countries || m.countries.includes(cc)) && !seen.includes(m.id));
    const rng = sideRng(state);
    if (!open.length || !rng.chance(0.45)) return;
    const m = rng.pick(open);
    seen.push(m.id);
    ctx.prompt({ type: 'serviceEras.moment', icon: m.icon, title: m.title, text: m.text, options: m.options.map(({ id, label, hint }) => ({ id, label, ...(hint ? { hint } : {}) })), data: { id: m.id } });
  },
  resolvers: {
    moment(ctx, data, optionId) {
      const { state } = ctx;
      const m = MOMENTS.find((x) => x.id === data.id);
      const o = m?.options.find((x) => x.id === optionId);
      if (!o) return;
      const fx = o.fx ?? {};
      const job = state.career?.job;
      if (fx.perf && job) job.performance = clamp((job.performance ?? 55) + fx.perf, 0, 100);
      if (fx.boss && job) job.boss = clamp((job.boss ?? 50) + fx.boss, 0, 100);
      if (fx.trauma) ctx.emit('health:trauma', { amount: fx.trauma, source: m.title.toLowerCase() });
      if (fx.stress) ctx.stat('stress', fx.stress);
      if (fx.happiness) ctx.stat('happiness', fx.happiness);
      if (fx.smoke) { const w = (state.wear ??= { years: 0, noise: 0, smoke: 0, lifting: 0, flags: {}, fallen: 0 }); w.smoke = Math.max(0, w.smoke + fx.smoke); w.mask = fx.smoke < 0; }
      if (fx.cash > 0) ctx.earn(Math.round(fx.cash * eraScale(state, 'wage')), m.title, { retained: true });
      if (fx.cash < 0) ctx.spend(Math.round(-fx.cash * eraScale(state, 'wage')), m.title, { credit: true });
      if (fx.flag && job) (job.eraFlags ??= []).push(fx.flag);
      if (fx.offense) ctx.emit('legal:offense', { offenseId: fx.offense, context: m.title.toLowerCase(), discovery: 0.15, evidence: 0.5 });
      ctx.log(fx.note ?? `${m.title}: ${o.label.replace(/^\S+\s/, '')}.`, m.icon, 'info');
      if (fx.leave && job) {
        const pay = Math.round(job.salary ?? 0);
        ctx.emit('career:resign', { reason: fx.leave });
        if (/redundancy/.test(fx.leave)) ctx.earn(pay, 'Voluntary redundancy', { wage: true });
      }
    },
  },
};
