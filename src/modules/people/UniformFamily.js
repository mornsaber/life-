/**
 * A family in uniform, seen from your side (people/RelativeService.js has your relatives'
 * own service, deployments and the waiting at home).
 *
 *   Tradition   joining a service a parent served in is noticed: "the third generation".
 *   Following   a grown child, without work, may follow you into the forces, the police or the
 *               fire service: proud, and worried.
 *   Away        deployed or on an unaccompanied tour with children at home, you choose how you
 *               keep in touch: letters (before the 1990s), phone calls, video calls.
 *   After       veterans and retired officers join their association (the Royal British
 *               Legion, the American Legion, the RSL, the Legion in Canada; the retired
 *               officers' association), march on Remembrance or Memorial Day, and meet the old
 *               crew at reunions.
 *
 * state.uniformFamily = { association, joined, reunions }
 */
import { Random, clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { yearNow, eraWorkBlock } from '../world/Eras.js';
import { getProfession } from '../career/JobTrees.js';
import { ageOf, living } from './People.js';
import { enlist } from './RelativeService.js';
import { startCareer } from './NpcCareers.js';
import { serviceOfJob, uniformedRole } from '../publicsafety/Uniformed.js';
import { branchOf } from '../military/MilitaryEngine.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 3371) ^ (state.character.age * 271 + 0xfa1)) >>> 0);
const ccOf = (state) => state.character.countryId ?? 'US';

/** Your service background: { kind: 'military'|'police'|'fire'|'ems', years } from what you've done. */
export function serviceBackground(state) {
  const mil = (state.military?.history ?? []).reduce((a, h) => a + (h.yearsOfService ?? 0), 0) + (state.military?.service?.yearsOfService ?? 0);
  const civil = {};
  for (const h of state.career?.history ?? []) { const s = serviceOfJob(h); if (s) civil[s] = (civil[s] ?? 0) + Math.max(0, (h.endAge ?? 0) - (h.startAge ?? 0)); }
  const cur = serviceOfJob(state.career?.job);
  if (cur) civil[cur] = (civil[cur] ?? 0) + Math.max(0, state.character.age - (state.career.job.startAge ?? state.character.age));
  const [kind, years] = Object.entries({ military: mil, ...civil }).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  return years > 0 ? { kind, years } : null;
}

/** The veterans' association of your country and era. */
export function associationOf(state, kind) {
  const y = yearNow(state);
  const cc = ccOf(state);
  if (kind !== 'military') return kind === 'fire' ? 'the retired firefighters\' association' : kind === 'ems' ? 'the ambulance service retirees\' club' : 'the retired police officers\' association';
  if (cc === 'GB' && y >= 1921) return 'the Royal British Legion';
  if (cc === 'US') return y >= 1919 ? 'the American Legion' : y >= 1899 ? 'the Veterans of Foreign Wars' : 'the Grand Army of the Republic';
  if (cc === 'AU' && y >= 1916) return 'the RSL';
  if (cc === 'NZ' && y >= 1916) return 'the RSA';
  if (cc === 'CA' && y >= 1925) return 'the Royal Canadian Legion';
  return 'the veterans\' association';
}
const remembrance = (state) => ({ GB: 'Remembrance Sunday', CA: 'Remembrance Day', AU: 'Anzac Day', NZ: 'Anzac Day', US: 'Memorial Day', FR: 'the 11 November parade' }[ccOf(state)] ?? 'the remembrance parade');

/** Parents who served (NPC careers or service records). */
const servedParent = (state, kind) => living(state).concat((state.people?.list ?? []).filter((p) => !p.alive)).find((p) => ['mother', 'father'].includes(p.relation)
  && (kind === 'military' ? Boolean(p.service || p.veteran) : serviceOfJob({ professionId: p.career?.professionId }) === kind));

/** A grown child follows you in. */
function following(ctx, rng) {
  const { state } = ctx;
  const bg = serviceBackground(state);
  if (!bg || bg.years < 6) return;
  for (const p of living(state).filter((x) => x.relation === 'child')) {
    const age = ageOf(state, p);
    if (age < 18 || age > 25 || p.job || p.service || p.career || p.life?.studying || !rng.chance(0.07)) continue;
    if (bg.kind === 'military') {
      if (enlist(state, p, rng)) ctx.log(`${p.firstName} joined the ${branchOf(p.service).name}, following you. You were proud, and you know too much to be only proud.`, '🎖️', 'milestone');
      return;
    }
    const profession = getProfession(bg.kind === 'ems' ? 'ems' : bg.kind);
    if (!profession || eraWorkBlock({ ...state, character: { ...state.character, gender: p.gender } }, profession)) continue;
    startCareer(rng, state, p, profession, { age, levelIdx: 0 });
    p.income = p.careerIncome;
    ctx.log(`${p.firstName} joined the ${bg.kind === 'police' ? 'police' : bg.kind === 'fire' ? 'fire service' : 'ambulance service'}, like you. You gave them the advice nobody gave you.`, '👣', 'milestone');
    return;
  }
}

/** Away from the children: how you keep in touch. */
function away(ctx) {
  const { state } = ctx;
  const svc = state.military?.service;
  const deployed = svc && (svc.deployedThisYear || (svc.overseas && !svc.overseas.accompanied));
  const kids = living(state).filter((p) => p.relation === 'child' && ageOf(state, p) < 18);
  if (!deployed || !kids.length || yearlyCount(state, 'uniformFamily.away')) return;
  bumpYearly(state, 'uniformFamily.away');
  const y = yearNow(state);
  const contact = y >= 2008 ? { id: 'video', label: '📱 Video calls whenever you can', hint: 'Bedtime stories across time zones' } : y >= 1990 ? { id: 'phone', label: '📞 Phone home every week', hint: 'Expensive, crackly, worth it' } : { id: 'letters', label: '✉️ Write every week', hint: 'Letters that arrive in bundles' };
  ctx.prompt({
    type: 'uniformFamily.away', icon: '🏠', title: 'Far From Home',
    text: `You're away, and ${kids.length === 1 ? `${kids[0].firstName} is` : 'the children are'} growing up without you there. ${kids[0].firstName} asked when you're coming home.`,
    options: [contact, { id: 'focus', label: '🪖 Keep your head in the job', hint: 'It\'s easier, and it costs later' }],
    data: {},
  });
}

/** After service: the association, the parade, the reunions. */
function after(ctx, rng) {
  const { state } = ctx;
  if (uniformedRole(state)) return;
  const bg = serviceBackground(state);
  if (!bg || bg.years < (bg.kind === 'military' ? 2 : 10) || state.character.age < 30) return;
  const uf = (state.uniformFamily ??= { association: null, joined: false, reunions: 0 });
  uf.association ??= associationOf(state, bg.kind);
  if (!uf.joined && !uf.asked) {
    uf.asked = true;
    return ctx.prompt({
      type: 'uniformFamily.join', icon: '🎖️', title: 'The Association',
      text: `A letter from ${uf.association}: would you like to join? Old comrades, a bar, help for those who need it.`,
      options: [{ id: 'join', label: '🤝 Join', hint: 'Among people who understand' }, { id: 'no', label: '🙂 Not for you', hint: 'That part of your life is over' }],
      data: {},
    });
  }
  if (!uf.joined) return;
  if (bg.kind === 'military' && rng.chance(0.3)) {
    ctx.stat('happiness', 3);
    ctx.emit('health:trauma', { amount: -3, source: 'remembrance' });
    ctx.log(`You marched on ${remembrance(state)} with ${uf.association}, medals on your chest, for the ones who didn't come home.`, '🌺', 'info');
  } else if (rng.chance(0.15)) {
    uf.reunions += 1;
    ctx.stat('happiness', 4);
    ctx.emit('health:trauma', { amount: -4, source: 'old comrades' });
    ctx.log(`A reunion with the old ${bg.kind === 'military' ? 'unit' : bg.kind === 'fire' ? 'watch' : 'shift'}. Fewer of you each time; the same stories, told better.`, '🍻', 'good');
  }
}

export const UniformFamilyModule = {
  id: 'uniformFamily',
  order: 31.4,
  setup(engine) {
    // A family tradition, noticed when you join.
    engine.bus.on('career:hired', ({ ctx, job }) => {
      const kind = serviceOfJob(job);
      if (!ctx || !kind || kind === 'corrections') return;
      const parent = servedParent(ctx.state, kind);
      if (!parent) return;
      job.boss = clamp((job.boss ?? 50) + 5, 0, 100);
      ctx.log(`Your ${parent.relation} served in the ${kind === 'police' ? 'force' : kind === 'fire' ? 'fire service' : 'ambulance service'} too. Someone at your first briefing remembered the name.`, '👣', 'info');
    });
  },
  onAgeUp(ctx) {
    const rng = sideRng(ctx.state);
    following(ctx, rng);
    away(ctx);
    after(ctx, rng);
  },
  resolvers: {
    away(ctx, data, optionId) {
      const { state } = ctx;
      const kids = living(state).filter((p) => p.relation === 'child' && ageOf(state, p) < 18);
      if (optionId === 'focus') {
        for (const k of kids) k.relationship = clamp((k.relationship ?? 60) - 6, 0, 100);
        return ctx.log('You kept your head in the job. When you came home, the children were shy with you for a week.', '🪖', 'warn');
      }
      for (const k of kids) k.relationship = clamp((k.relationship ?? 60) + 4, 0, 100);
      ctx.stat('happiness', 2);
      ctx.log(optionId === 'letters' ? 'You wrote every week. The children kept the letters in a shoebox.' : optionId === 'phone' ? 'You phoned every week, queueing for the line. The children told you everything at once.' : 'Bedtime stories on a screen, across time zones. Not the same; better than nothing.', '🏠', 'good');
    },
    join(ctx, data, optionId) {
      const uf = ctx.state.uniformFamily;
      if (!uf) return;
      if (optionId !== 'join') return ctx.log('You put the letter in a drawer.', '🙂', 'info');
      uf.joined = true;
      ctx.stat('happiness', 3);
      ctx.log(`You joined ${uf.association}.`, '🎖️', 'good');
    },
  },
};
