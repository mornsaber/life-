/**
 * Every faith's institutions, lived: the body a minister answers to and may lead, the training
 * that forms its clergy, and the rites and pilgrimages its members keep (data in FaithBodies.js).
 *
 *   Training    A seminarian in a faith without a diocese is formed by the faith's own school —
 *               Hebrew Union College, the hawza in Qom, a Veda pathashala, Kokugakuin — and
 *               finishing it counts as the ministerial degree.
 *   The body    Ministers (and lay leaders, less often) meet its business: votes at conference,
 *               rulings, festivals, scandals. How they handle it builds standing, and standing
 *               (with seniority) gets them elected or appointed to its offices, from delegate to
 *               President of the Southern Baptist Convention, Chief Rabbi, Grand Mufti or
 *               Jathedar of the Akal Takht. Elected offices run for a term.
 *   Rites       Coming-of-age rites for children raised in the faith (bar and bat mitzvah,
 *               confirmation, the sacred thread, the first turban, Shichi-Go-San), and the
 *               pilgrimages and vows adults choose: the Hajj, the Kumbh Mela, a season as a
 *               monk, Amrit, an LDS mission, the Camino.
 *
 * state.community.institution = { traditionId, standing, office, history: [] }
 * state.community.rites = { [riteId]: age } · state.community.honorific · state.community.mission
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { TRADITIONS } from './Religions.js';
import { FAITH_BODIES, DECKS, bodyName, trainingName, hasBody, ritesFor, comingOfAgeFor } from './FaithBodies.js';
import { travelBlock } from '../world/Travel.js';
import { COUNTRIES } from '../world/Countries.js';

const LEVEL_RANK = { seminarian: 0, associate: 1, minister: 2, chaplain: 2, senior: 3, regional: 4 };
const cc = (state) => state.character.countryId ?? 'US';
const ministerOf = (state) => (state.career?.job?.professionId === 'clergy' ? state.career.job : null);
const hasSeminary = (state) => (state.education?.degrees ?? []).some((d) => d.programId === 'seminary');

/** Your place in your faith's wider body: as its minister, or as a lay leader. */
export function institutionOf(state) {
  const faith = state.community?.faith;
  if (!faith || !hasBody(faith.traditionId)) return null;
  const job = ministerOf(state);
  const role = job ? 'minister' : faith.role ? 'lay' : null;
  if (!role) return null;
  const rec = state.community.institution?.traditionId === faith.traditionId ? state.community.institution : null;
  return { role, traditionId: faith.traditionId, body: bodyName(faith.traditionId, cc(state)), def: FAITH_BODIES[faith.traditionId], rec, job };
}

const recOf = (state, traditionId) => {
  const c = state.community;
  if (c.institution?.traditionId !== traditionId) c.institution = { traditionId, standing: 50, office: null, history: [...(c.institution?.history ?? [])] };
  return c.institution;
};

function endOffice(ctx, rec, why) {
  if (!rec.office) return;
  rec.history.push({ title: rec.office.title, from: rec.office.since, to: ctx.state.character.age });
  ctx.log(`${why} You stepped down as ${rec.office.title}.`, '📜', 'info');
  rec.office = null;
}

/** A seminarian of a faith without dioceses is formed by its own school. */
function formation(ctx) {
  const { state } = ctx;
  const job = ministerOf(state);
  if (!job || job.levelId !== 'seminarian' || hasSeminary(state) || (job.yearsInLevel ?? 0) < 1) return;
  const school = trainingName(job.tradition ?? state.community.faith?.traditionId, cc(state));
  state.education.degrees.push({ type: 'master', programId: 'seminary', major: null, schoolId: 'private', year: state.character.age, faithTraining: school });
  ctx.log(`You finished your training at ${school}: ready for ordination.`, '🎓', 'milestone');
}

function comingOfAge(ctx) {
  const { state } = ctx;
  const faith = state.community.faith;
  if (!faith?.raised) return;
  const c = state.community;
  c.rites ??= {};
  for (const r of comingOfAgeFor(faith.traditionId)) {
    if (c.rites[r.id] != null || state.character.age !== r.age || (r.gender && r.gender !== state.character.gender)) continue;
    if (faith.attendance === 'occasional' && r.id !== 'barMitzvah' && r.id !== 'batMitzvah') continue;
    c.rites[r.id] = state.character.age;
    ctx.log(r.text, r.icon, 'milestone');
    ctx.stat('happiness', 3);
  }
}

function missionTick(ctx) {
  const { state } = ctx;
  const m = state.community.mission;
  if (!m) return;
  if (state.character.age >= m.until) {
    state.community.mission = null;
    ctx.log(`You came home from your mission in ${m.place}. Your family met you at the airport with a banner.`, '📛', 'milestone');
    return;
  }
  ctx.log(`Another year as Elder${state.character.gender === 'female' ? ' (Sister)' : ''} ${state.character.lastName} in ${m.place}: up at 6:30, study, tracting, discussions in the evening.`, '📛');
}

function bodyTick(ctx) {
  const { state, rng } = ctx;
  const inst = institutionOf(state);
  const c = state.community;
  // Out of ministry and lay office: any office in the body ends.
  if (!inst) {
    if (c.institution?.office) endOffice(ctx, c.institution, 'You no longer serve your faith\'s body.');
    return;
  }
  const rec = recOf(state, inst.traditionId);
  rec.standing = Math.round(clamp(rec.standing + (50 - rec.standing) * 0.05, 0, 100));
  const age = state.character.age;
  // Terms end; an elder steps down at 75.
  if (rec.office && ((rec.office.until != null && age >= rec.office.until) || age >= 75)) endOffice(ctx, rec, rec.office.until != null && age >= rec.office.until ? 'Your term ended.' : 'At seventy-five, it was time.');
  // Election or appointment to the body's offices: the highest you're senior enough for.
  if (inst.role === 'minister' && !rec.office) {
    const rank = LEVEL_RANK[inst.job.levelId] ?? 0;
    const offices = (inst.def.offices ?? []).filter((o) => (LEVEL_RANK[o.from] ?? 9) <= rank && !rec.history.some((h) => h.title === o.title && o.term == null));
    // The highest you're senior enough for first; failing that, a humbler seat.
    const best = [...offices].reverse().find((o) => rng.chance(o.odds * (0.4 + rec.standing / 60)));
    if (best) {
      rec.office = { id: best.id, title: best.title, since: age, until: best.term ? age + best.term : null };
      ctx.log(`You were ${best.term ? 'elected' : 'named'} ${best.title} (${inst.body}).`, TRADITIONS[inst.traditionId].icon, 'milestone');
      ctx.stat('happiness', 5);
      if (state.politics) state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 2);
    }
  }
  // The body's business.
  const deck = DECKS[inst.def.deck];
  if (!deck || state.prompts.some((p) => p.type === 'faithInstitutions.duty')) return;
  if (!rng.chance(inst.role === 'minister' ? (rec.office ? 0.6 : 0.4) : 0.15)) return;
  const d = rng.pick(deck);
  ctx.prompt({ type: 'faithInstitutions.duty', icon: d.icon, title: d.title, text: `${rec.office ? `As ${rec.office.title}: ` : ''}${d.text}`, options: d.options.map(({ id, label }) => ({ id, label })), data: { deck: inst.def.deck, deckId: d.id } });
}

function apply(ctx, rec, fx) {
  if (!fx) return;
  const { state } = ctx;
  if (fx.cost && !ctx.spend(fx.cost, 'A gift through your faith', { allowDebt: false })) {
    ctx.log('You couldn\'t find the money; you gave your time instead.', '🙏', 'info');
  }
  if (fx.standing) rec.standing = Math.round(clamp(rec.standing + fx.standing, 0, 100));
  if (fx.recognition && state.politics) state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + fx.recognition);
  for (const k of ['happiness', 'stress']) if (fx[k]) ctx.stat(k, fx[k]);
  if (fx.text) ctx.log(fx.text, '📜', (fx.standing ?? 0) > 0 ? 'good' : (fx.standing ?? 0) < 0 ? 'warn' : 'info');
}

/** Can you keep this rite now? */
export function riteCheck(state, rite) {
  const faith = state.community?.faith;
  const age = state.character.age;
  if (!faith || !rite.traditions.includes(faith.traditionId)) return { ok: false, reason: 'Not in your tradition' };
  if (state.legal?.incarceration) return { ok: false, reason: 'In custody' };
  if (rite.gender && rite.gender !== state.character.gender) return { ok: false, reason: rite.gender === 'male' ? 'Men only' : 'Women only' };
  if (age < (rite.minAge ?? 0)) return { ok: false, reason: `From ${rite.minAge}` };
  if (rite.maxAge && age > rite.maxAge) return { ok: false, reason: `Up to ${rite.maxAge}` };
  if (rite.once && state.community.rites?.[rite.id] != null) return { ok: false, reason: `Done at ${state.community.rites[rite.id]}` };
  if (rite.devout && faith.attendance !== 'devout') return { ok: false, reason: 'Devout members' };
  if (rite.married && !(state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse')) return { ok: false, reason: 'Married couples' };
  if (rite.years && (state.career?.job || state.education?.enrolled)) return { ok: false, reason: 'Free of work and school' };
  if (state.community.mission) return { ok: false, reason: 'On your mission' };
  if (yearlyCount(state, 'faithInstitutions.rite')) return { ok: false, reason: 'One a year' };
  if (rite.abroad && rite.abroad !== cc(state) && age >= 18) {
    const block = travelBlock(state, rite.abroad);
    if (block && block !== 'You live here') return { ok: false, reason: block };
  }
  if (rite.cost && age >= 18 && state.finances.cash < rite.cost) return { ok: false, reason: `Costs about $${rite.cost.toLocaleString()}` };
  return { ok: true };
}

const MISSIONS = ['Tokyo', 'São Paulo', 'Manchester', 'Manila', 'Lima', 'Johannesburg', 'Seoul', 'Rome', 'Guatemala City', 'Accra', 'the Philippines Cebu Mission', 'Ohio Columbus'];

export const FaithInstitutionsModule = {
  id: 'faithInstitutions',
  order: 14.5,
  guard(state, actionId) {
    if (state.community?.mission && ['career.apply', 'directEntry.apply'].includes(actionId)) return 'You\'re serving a mission.';
    return null;
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.community || !state.character.alive) return;
    formation(ctx);
    comingOfAge(ctx);
    missionTick(ctx);
    if (!state.legal?.incarceration) bodyTick(ctx);
  },
  actions: {
    /** Keep a rite or make a pilgrimage. */
    rite(ctx, id) {
      const { state } = ctx;
      const rite = ritesFor(state.community?.faith?.traditionId).find((r) => r.id === id);
      if (!rite) return ctx.toast('Not in your tradition', 'warn');
      const check = riteCheck(state, rite);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      if (rite.cost && !ctx.spend(rite.cost, rite.name, { allowDebt: false })) return ctx.toast('You can\'t afford it', 'warn');
      bumpYearly(state, 'faithInstitutions.rite');
      const c = state.community;
      (c.rites ??= {})[rite.id] = state.character.age;
      if (rite.title) c.honorific = rite.title[state.character.gender] ?? rite.title.male;
      if (rite.years) c.mission = { until: state.character.age + rite.years, place: ctx.rng.pick(MISSIONS) };
      for (const k of ['happiness', 'stress', 'fitness']) if (rite[k]) ctx.stat(k, rite[k]);
      if (c.faith) c.faith.devoutYears += 1;
      const where = rite.abroad && rite.abroad !== cc(state) ? ` (${COUNTRIES[rite.abroad]?.name ?? rite.abroad})` : '';
      return ctx.log(`${rite.name}${where}: ${rite.years ? `${rite.text.split('.')[0]}. You were called to serve in ${c.mission.place}.` : rite.text}`, rite.icon, rite.once ? 'milestone' : 'good');
    },
    /** Step down from an office in your faith's body. */
    resignOffice(ctx) {
      const rec = ctx.state.community?.institution;
      if (!rec?.office) return ctx.toast('No office to resign', 'warn');
      return endOffice(ctx, rec, 'You asked to be released.');
    },
  },
  resolvers: {
    duty(ctx, data, optionId) {
      const { state, rng } = ctx;
      const d = DECKS[data.deck]?.find((x) => x.id === data.deckId);
      const o = d?.options.find((x) => x.id === optionId);
      const inst = institutionOf(state);
      if (!o || !inst) return undefined;
      const rec = recOf(state, inst.traditionId);
      const ok = !o.check || rng.chance(clamp(0.35 + (state.stats.smarts - 50) / 150 + rec.standing / 250, 0.15, 0.9));
      apply(ctx, rec, ok ? o : o.fail);
      if (ok && o.risk && rng.chance(o.risk.chance)) apply(ctx, rec, o.risk);
      return undefined;
    },
  },
};

/** For the Community tab. */
export function faithInstitutionSummary(state) {
  const faith = state.community?.faith;
  if (!faith) return null;
  const inst = institutionOf(state);
  const def = FAITH_BODIES[faith.traditionId];
  return {
    body: bodyName(faith.traditionId, cc(state)),
    training: def && !def.church && !def.lay ? trainingName(faith.traditionId, cc(state)) : null,
    inst,
    rec: inst?.rec ?? null,
    offices: def?.offices ?? [],
    rites: ritesFor(faith.traditionId).map((r) => ({ rite: r, check: riteCheck(state, r), done: state.community.rites?.[r.id] ?? null })),
    kept: Object.entries(state.community.rites ?? {}),
    honorific: state.community.honorific ?? null,
    mission: state.community.mission ?? null,
    history: state.community.institution?.history ?? [],
  };
}
