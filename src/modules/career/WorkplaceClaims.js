/**
 * Workplace harassment and discrimination: reporting to HR, EEOC charges,
 * employment lawyers on contingency, settlements, trials — and retaliation,
 * which is the most common charge the EEOC sees. Supervisors can also be
 * on the receiving end of a complaint.
 *
 * state.career.claims = { active: { kind, basis, stage, employer, salary, documented, retaliated, years } | null, history: [] }
 */
import { clamp } from '../../core/Random.js';
import { minorChildren } from '../people/People.js';
import { TRADITIONS } from '../community/Religions.js';

export const BASES = {
  sex: 'sexual harassment',
  gender: 'sex discrimination',
  pregnancy: 'pregnancy discrimination',
  age: 'age discrimination',
  disability: 'disability discrimination',
  religion: 'religious discrimination',
  orientation: 'sexual-orientation discrimination',
  hostile: 'a hostile work environment',
};

const CONTINGENCY = 0.33;

/** Which kinds of mistreatment you're exposed to, weighted. */
function exposures(state) {
  const c = state.character;
  const list = [{ basis: 'hostile', w: 3 }];
  list.push({ basis: 'sex', w: c.gender === 'female' ? 4 : 1 });
  if (c.gender === 'female') list.push({ basis: 'gender', w: 2 });
  if (state.people?.expecting || (minorChildren(state).some((k) => state.character.age + k.ageOffset === 0))) list.push({ basis: 'pregnancy', w: 4 });
  if (c.age >= 45) list.push({ basis: 'age', w: c.age >= 55 ? 4 : 2 });
  if ((state.health?.conditions ?? []).some((x) => !x.remission && x.diagnosed)) list.push({ basis: 'disability', w: 2 });
  const faith = state.community?.faith && TRADITIONS[state.community.faith.traditionId];
  if (faith && (['Muslim', 'Jewish', 'Sikh', 'Hindu'].includes(faith.group) || faith.fundamentalist)) list.push({ basis: 'religion', w: 2 });
  if (['men', 'everyone'].includes(state.people?.orientation) && c.gender === 'male') list.push({ basis: 'orientation', w: 2 });
  if (state.people?.orientation === 'women' && c.gender === 'female') list.push({ basis: 'orientation', w: 2 });
  return list;
}

/** Settlement value: a multiple of pay, more for documented cases and retaliation. */
export function claimValue(claim, rng) {
  const base = claim.salary * rng.float(0.3, 1.2);
  return Math.round(base * (claim.documented ? 1.4 : 1) * (claim.retaliated ? 1.5 : 1) * (claim.basis === 'sex' ? 1.3 : 1));
}

function incidentTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const claims = state.career.claims;
  if (!job || claims.active || state.prompts.some((p) => p.type === 'claims.incident')) return;
  const toxic = job.boss < 35 ? 2 : 1;
  if (!rng.chance(0.022 * toxic * (job.grade <= 3 ? 1.3 : 1))) return;
  const basis = rng.weighted(exposures(state), (x) => x.w).basis;
  const text = {
    sex: `Your ${rng.pick(['manager', 'director', 'top salesperson'])} keeps making comments about your body and won't take no for an answer.`,
    gender: 'You trained the new hire. Now he outranks you and earns 20% more.',
    pregnancy: 'Right after you announced you were expecting, your best accounts were quietly reassigned.',
    age: `Your boss joked that the team needs "fresh energy" — then gave your project to someone twenty years younger.`,
    disability: 'HR keeps "losing" your request for a reasonable accommodation, and your manager rolls his eyes at your appointments.',
    religion: 'Coworkers mock your faith, and your request to swap shifts for a holy day was denied when others\' swaps were approved.',
    orientation: 'Since a coworker saw a photo of your partner, the jokes started — and the invites stopped.',
    hostile: `A ${rng.pick(['senior manager', 'coworker', 'shift lead'])} screams at people, throws things and plays favorites. Everyone is afraid of him.`,
  }[basis];
  ctx.stat('stress', 8);
  ctx.stat('happiness', -4);
  ctx.prompt({
    type: 'claims.incident', icon: '🚩', title: 'Trouble at Work',
    text: `${text}\n(${BASES[basis]})`,
    options: [
      { id: 'hr', label: '📝 Report it to HR in writing', hint: 'Creates a record — and a retaliation risk' },
      { id: 'eeoc', label: '🏛️ File an EEOC charge', hint: 'Free; 300-day deadline; investigation or mediation' },
      { id: 'lawyer', label: '⚖️ Hire an employment lawyer', hint: '33% contingency — you pay nothing unless you win' },
      { id: 'quit', label: '🚪 Quit', hint: 'You can still bring a claim later' },
      { id: 'endure', label: '😶 Keep your head down' },
    ],
    data: { basis },
  });
}

/** Cases move one stage a year: investigation → mediation/settlement → (rarely) trial. */
function caseTick(ctx) {
  const { state, rng } = ctx;
  const claims = state.career.claims;
  const c = claims.active;
  if (!c || c.stage === 'reported') return;
  c.years += 1;
  const strength = clamp(0.35 + (c.documented ? 0.2 : 0) + (c.retaliated ? 0.2 : 0) + (c.basis === 'hostile' ? -0.15 : 0), 0.1, 0.85);
  if (c.stage === 'eeoc') {
    if (rng.chance(0.3)) {
      const amount = Math.round(claimValue(c, rng) * 0.35);
      return close(ctx, 'mediated', amount, `EEOC mediation: ${c.employer} agreed to pay $${amount.toLocaleString()} and retrain its managers.`);
    }
    c.stage = 'rightToSue';
    ctx.log('The EEOC issued a right-to-sue letter. You have 90 days to file in court.', '🏛️');
    return;
  }
  if (c.stage === 'rightToSue') {
    if (!rng.chance(strength)) return close(ctx, 'dropped', 0, 'No lawyer would take your case on contingency, and the deadline passed.');
    c.stage = 'lawsuit';
    c.lawyer = true;
    ctx.log('An employment lawyer took your case on contingency and filed suit.', '⚖️');
    return;
  }
  if (c.stage === 'lawsuit') {
    if (c.years < 2 && rng.chance(0.4)) return ctx.log(`Discovery drags on in your case against ${c.employer}. Depositions, document dumps, delay.`, '📂');
    if (rng.chance(strength + 0.15)) {
      const gross = claimValue(c, rng);
      return close(ctx, 'settled', gross, `${c.employer} settled your ${BASES[c.basis]} claim for $${gross.toLocaleString()} (with a confidentiality clause).`);
    }
    // To trial: big verdicts happen, but so do losses.
    if (rng.chance(strength * 0.6)) {
      const gross = Math.round(claimValue(c, rng) * rng.float(2, 4));
      return close(ctx, 'verdict', gross, `A jury found ${c.employer} liable for ${BASES[c.basis]}. Verdict: $${gross.toLocaleString()}.`);
    }
    return close(ctx, 'lost', 0, `The jury sided with ${c.employer}. You walked away with nothing but closure.`);
  }
}

function close(ctx, result, gross, text) {
  const { state } = ctx;
  const claims = state.career.claims;
  const c = claims.active;
  let net = 0;
  if (gross > 0) {
    // Emotional-distress and back-pay awards are taxable; the lawyer takes a third off the top.
    const fee = c.lawyer ? Math.round(gross * CONTINGENCY) : 0;
    net = gross - fee;
    ctx.earn(net, 'Employment claim settlement');
    ctx.stat('happiness', 8);
  } else ctx.stat('happiness', -4);
  ctx.stat('stress', -6);
  claims.history.push({ basis: c.basis, employer: c.employer, result, gross, net, age: state.character.age });
  claims.active = null;
  ctx.log(`${text}${gross && c.lawyer ? ` After the 33% contingency fee you kept $${net.toLocaleString()}.` : ''}`, '⚖️', gross ? 'good' : 'warn');
}

/** Filing while employed: retaliation is common — and makes the case stronger. */
function retaliationRisk(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const c = state.career.claims.active;
  if (!job || !c || !rng.chance(0.3)) return;
  c.retaliated = true;
  if (rng.chance(0.4)) {
    ctx.log(`Two weeks after you complained, ${job.employer.name} fired you for "performance." That's textbook retaliation.`, '📦', 'bad');
    ctx.emit('career:resign', { reason: 'Terminated after complaining (retaliation)', fired: true });
  } else {
    ctx.emit('career:adjust', { performance: -15, boss: -25, coworkers: -10 });
    ctx.log('Since you complained, you\'ve been cut out of meetings and written up for things everyone does.', '🧊', 'warn');
  }
}

/** Supervisors: a complaint about you. */
function accusedTick(ctx) {
  const { state, rng } = ctx;
  const job = state.career.job;
  if (!job?.abilities.includes('supervise') || state.prompts.some((p) => p.type === 'claims.accused')) return;
  if (!rng.chance(0.012)) return;
  ctx.prompt({
    type: 'claims.accused', icon: '📨', title: 'A Complaint About You',
    text: 'HR has opened an investigation after one of your reports filed a complaint about how you treat the team.',
    options: [
      { id: 'cooperate', label: '🤝 Cooperate fully', hint: 'Usually clears you if the complaint is thin' },
      { id: 'lawyer', label: '⚖️ Lawyer up ($5,000)' },
      { id: 'pressure', label: '😠 Lean on the employee to drop it', hint: 'That\'s retaliation', tone: 'danger' },
    ],
    data: {},
  });
}

export const WorkplaceClaims = {
  id: 'claims',
  order: 33.5,

  init(state) {
    state.career.claims ??= { active: null, history: [] };
  },

  onAgeUp(ctx) {
    if (ctx.state.legal.incarceration) return;
    caseTick(ctx);
    incidentTick(ctx);
    accusedTick(ctx);
  },

  resolvers: {
    incident(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const claims = state.career.claims;
      const base = { basis: data.basis, employer: job?.employer.name ?? 'your former employer', salary: job?.salary ?? state.finances.lastYear?.gross ?? 40000, documented: false, retaliated: false, years: 0, lawyer: false };
      if (optionId === 'endure') {
        ctx.stat('stress', 6);
        ctx.stat('happiness', -4);
        ctx.emit('health:trauma', { amount: 4, source: 'life' });
        return ctx.log('You kept your head down. It didn\'t stop.', '😶', 'warn');
      }
      if (optionId === 'quit') {
        ctx.emit('career:resign', { reason: `Quit over ${BASES[data.basis]}` });
        // Constructive discharge: you may still sue.
        if (rng.chance(0.5)) {
          claims.active = { ...base, stage: 'eeoc', documented: false };
          ctx.log('Before your last day, you filed an EEOC charge. Quitting doesn\'t waive your rights.', '🏛️');
        }
        return;
      }
      if (optionId === 'hr') {
        if (rng.chance(0.45)) {
          ctx.emit('career:adjust', { coworkers: 4 });
          claims.history.push({ basis: data.basis, employer: base.employer, result: 'resolved by HR', gross: 0, net: 0, age: state.character.age });
          return ctx.log('HR investigated. The person was disciplined and moved to another team.', '📝', 'good');
        }
        claims.active = { ...base, stage: 'reported', documented: true };
        ctx.log('HR "looked into it" and closed the file. At least now it\'s on paper.', '📝', 'warn');
        retaliationRisk(ctx);
        // A documented report that went nowhere becomes an EEOC charge.
        if (claims.active) claims.active.stage = 'eeoc';
        return;
      }
      claims.active = { ...base, stage: optionId === 'lawyer' ? 'lawsuit' : 'eeoc', documented: rng.chance(0.4), lawyer: optionId === 'lawyer' };
      ctx.log(optionId === 'lawyer' ? 'An employment lawyer took your case on a one-third contingency.' : 'You filed a charge of discrimination with the EEOC.', optionId === 'lawyer' ? '⚖️' : '🏛️');
      retaliationRisk(ctx);
    },
    accused(ctx, data, optionId) {
      const { rng } = ctx;
      if (optionId === 'lawyer') ctx.spend(5000, 'Employment attorney', { allowDebt: true });
      if (optionId === 'pressure') {
        ctx.log('The employee recorded your conversation. HR fired you the same day.', '📦', 'bad');
        return ctx.emit('career:resign', { reason: 'Fired for retaliating against a complainant', fired: true });
      }
      if (rng.chance(optionId === 'lawyer' ? 0.85 : 0.75)) {
        ctx.emit('career:adjust', { boss: -3 });
        return ctx.log('The investigation found no policy violation. You were told to "be mindful of tone."', '📨');
      }
      ctx.emit('career:adjust', { performance: -15, boss: -15 });
      ctx.log('HR substantiated the complaint. You were written up and sent to management training.', '📨', 'warn');
    },
  },
};

