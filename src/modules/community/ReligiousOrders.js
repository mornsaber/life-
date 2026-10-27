/**
 * Religious life in the Catholic Church's orders: a vocation with stages, vows and an
 * apostolate, not a job title.
 *
 *   The Society of Jesus   Men. Two years' novitiate, first vows, then the long formation:
 *                (Jesuits, SJ) philosophy, regency (teaching in a Jesuit school), theology and
 *                ordination, tertianship and final vows — a dozen years in all. Jesuits run
 *                schools and universities, the Jesuit Refugee Service and missions; a Jesuit
 *                may be made rector, provincial, and (rarely) Superior General.
 *   Opus Dei     A personal prelature for lay people who keep their jobs: numeraries (celibate,
 *                living in a centre and giving their salary to it) and supernumeraries
 *                (married, giving what they can). Five years to the Fidelity, the lifelong
 *                commitment; some numeraries are called to the priesthood of the prelature.
 *   Missionaries Women. Aspirancy and postulancy, two years' novitiate, temporary vows for
 *   of Charity   six years, then final vows — poverty, chastity, obedience and the fourth vow
 *   (MC)         of "wholehearted and free service to the poorest of the poor". Homes for the
 *                dying, shelters and mission houses; superior of a house, regional, and the
 *                Superior General in Kolkata.
 *
 * A Jesuit or a sister lives in community: housed and fed, with no salary. Leaving before final
 * vows is simply leaving; after them it takes a dispensation. A priest ordained in an order
 * stays a priest (community/HolyOrders.js).
 *
 * state.community.religious = { order, stage, since, stageSince, vows, kind, apostolate, office,
 *   housed, history: [] }
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { leaveJob } from '../career/CareerEngine.js';
import { postAbroad } from '../world/Posting.js';

const CATHOLIC = ['catholic', 'tradCatholic'];

export const RELIGIOUS_ORDERS = {
  jesuits: {
    name: 'Society of Jesus', short: 'the Jesuits', icon: '✝️', gender: 'male', post: 'SJ', community: true, maxAge: 40,
    stages: [
      { id: 'novice', label: 'Novice', years: 2, vows: 'first', text: 'You pronounced your first vows of poverty, chastity and obedience at the end of the novitiate: a scholastic of the Society of Jesus.' },
      { id: 'philosophy', label: 'Scholastic (philosophy)', years: 3, text: 'Three years of philosophy behind you, you were sent on regency.' },
      { id: 'regency', label: 'Scholastic (regency)', years: 2, text: 'Regency over: two years teaching in a Jesuit school taught you more than the books. On to theology.' },
      { id: 'theology', label: 'Scholastic (theology)', years: 3, ordain: true, text: 'After theology you were ordained a priest of the Society of Jesus.' },
      { id: 'tertianship', label: 'Tertian', years: 1, vows: 'final', text: 'After tertianship — the "school of the heart" — you pronounced your final vows, with the fourth vow of obedience to the Pope concerning missions.' },
      { id: 'professed', label: 'Professed Jesuit', years: null },
    ],
    offices: [['rector', 'Rector', 0.08], ['provincial', 'Provincial', 0.05], ['general', 'Superior General', 0.02]],
    apostolates: {
      school: { label: '🏫 Teaching in a Jesuit school', text: 'You taught at a Jesuit school: Latin, football and the examen at the end of every day.' },
      university: { label: '🎓 A Jesuit university', text: 'You taught and wrote at a Jesuit university — Georgetown, the Gregorian, Sophia, Ateneo — and kept office hours that ran late.' },
      refugees: { label: '⛺ The Jesuit Refugee Service', abroad: [['Kakuma', 'Kenya'], ['Amman', 'Jordan'], ['Cox\'s Bazar', 'Bangladesh']], text: 'You served with the Jesuit Refugee Service: schools in the camps, and the paperwork of people who have lost everything.' },
      parish: { label: '⛪ A Jesuit parish', text: 'You served a Jesuit parish: retreats, the Spiritual Exercises, confession on Saturday afternoons.' },
      mission: { label: '🌍 The missions', abroad: [['Juba', 'South Sudan'], ['Dili', 'Timor-Leste'], ['Ranchi', 'India'], ['Lusaka', 'Zambia']], text: 'You went where the Society sent you, as Xavier did.' },
    },
  },
  opusDei: {
    name: 'Opus Dei', short: 'Opus Dei', icon: '✝️', gender: null, post: null, community: false, maxAge: 70,
    kinds: { numerary: 'Numerary', supernumerary: 'Supernumerary' },
    stages: [
      { id: 'member', label: 'Member', years: 5, vows: 'final', text: 'After five years you made the Fidelity: your lifelong commitment to the Work.' },
      { id: 'fidelity', label: 'Member (the Fidelity)', years: null },
    ],
    offices: [['director', 'Director of a centre', 0.08], ['vicar', 'Regional Vicar', 0.03], ['prelate', 'Prelate of Opus Dei', 0.01]],
    apostolates: {
      work: { label: '💼 Sanctifying ordinary work', text: 'You tried to make your ordinary work holy: done well, offered up, and a way to bring colleagues to God.' },
      youth: { label: '🧑‍🎓 A youth club and study centre', text: 'You helped run a youth club and study centre: maths help, football and circles of formation.' },
      school: { label: '🏫 A corporate work (school, university)', text: 'You gave your evenings to one of the Work\'s schools.' },
    },
  },
  moc: {
    name: 'Missionaries of Charity', short: 'the Missionaries of Charity', icon: '🤍', gender: 'female', post: 'MC', community: true, maxAge: 35,
    stages: [
      { id: 'postulant', label: 'Postulant', years: 1, text: 'After a year as a postulant you received the white sari with the three blue stripes of a novice.' },
      { id: 'novice', label: 'Novice', years: 2, vows: 'first', text: 'You made your first vows: poverty, chastity, obedience, and wholehearted free service to the poorest of the poor.' },
      { id: 'junior', label: 'Sister (temporary vows)', years: 6, vows: 'final', text: 'After six years in temporary vows you made your final profession in Kolkata.' },
      { id: 'professed', label: 'Professed Sister', years: null },
    ],
    offices: [['superior', 'Superior of a house', 0.1], ['regional', 'Regional Superior', 0.04], ['general', 'Superior General', 0.015]],
    apostolates: {
      dying: { label: '🕯️ A home for the dying', abroad: [['Kolkata', 'India']], text: 'You washed and fed the dying at Nirmal Hriday, the home Mother Teresa opened beside the Kali temple.' },
      children: { label: '👶 A children\'s home', text: 'You cared for abandoned children in a Shishu Bhavan.' },
      shelter: { label: '🍲 A soup kitchen and shelter', text: 'You ran a soup kitchen and a night shelter for the homeless.' },
      mission: { label: '🌍 A mission house abroad', abroad: [['Port-au-Prince', 'Haiti'], ['Addis Ababa', 'Ethiopia'], ['Aden', 'Yemen'], ['Nairobi', 'Kenya']], text: 'You were sent to a mission house where the need was greatest.' },
    },
  },
};

const rel = (state) => state.community?.religious ?? null;
export const religiousOf = (state) => { const r = rel(state); return r && !r.left ? r : null; };
const married = (state) => (state.people?.list ?? []).some((p) => p.alive !== false && p.relation === 'spouse');
const catholic = (state) => CATHOLIC.includes(state.community?.faith?.traditionId);

/** Can you ask to enter an order? */
export function entryCheck(state, orderId, kind) {
  const o = RELIGIOUS_ORDERS[orderId];
  if (!o) return { ok: false, reason: 'Unknown order' };
  const c = state.character;
  if (!catholic(state)) return { ok: false, reason: 'Practising Catholics' };
  if (religiousOf(state)) return { ok: false, reason: 'Already in an order' };
  if (o.gender && c.gender !== o.gender) return { ok: false, reason: o.gender === 'male' ? 'The Society takes men' : 'The Missionaries of Charity sisters are women' };
  if (c.age < 18 || c.age > o.maxAge) return { ok: false, reason: `Ages 18 to ${o.maxAge}` };
  if ((o.community || kind === 'numerary') && married(state)) return { ok: false, reason: 'Unmarried, with no ties to a spouse' };
  if (state.legal.incarceration) return { ok: false, reason: 'Incarcerated' };
  if (state.military?.service) return { ok: false, reason: 'Finish your military service first' };
  if (yearlyCount(state, 'religiousOrders.enter')) return { ok: false, reason: 'Once a year' };
  return { ok: true };
}

function stageOf(r) {
  return RELIGIOUS_ORDERS[r.order].stages.find((s) => s.id === r.stage);
}

function ordain(ctx, r) {
  const { state } = ctx;
  const cur = state.community.orders;
  if (cur && !cur.laicized && ['priest', 'bishop'].includes(cur.grade)) return;
  state.community.orders = { tradition: state.community.faith?.traditionId ?? 'catholic', grade: 'priest', since: state.character.age, diocese: r.order === 'jesuits' ? 'Society of Jesus' : 'Prelature of Opus Dei', laicized: false };
}

/** A year in the order: formation moves on, the apostolate, and offices for the professed. */
function religiousYear(ctx) {
  const { state, rng } = ctx;
  const r = religiousOf(state);
  if (!r) return;
  const o = RELIGIOUS_ORDERS[r.order];
  const st = stageOf(r);
  // Leaving a community order to take an outside job means leaving the order.
  if (o.community) r.housed = true;
  ctx.stat('happiness', rng.int(0, 3));
  ctx.stat('stress', -rng.int(0, 3));
  if (st?.years && state.character.age - r.stageSince >= st.years) {
    if (st.vows === 'final' && o.community) {
      return ctx.prompt({ type: 'religiousOrders.vows', icon: o.icon, title: 'Final Vows', text: `The time has come for your final profession in ${o.short}. Under the vow of poverty you give up everything you own.`, options: [
        { id: 'profess', label: '🙏 Make my final vows', hint: 'For life' },
        { id: 'wait', label: '⏳ Ask for another year' },
        { id: 'leave', label: '🚪 Leave the order', tone: 'danger' },
      ] });
    }
    advance(ctx, r);
  }
  // An apostolate once formation allows one.
  if (!r.apostolate && apostolateOpen(r)) {
    const picks = Object.entries(o.apostolates);
    ctx.prompt({ type: 'religiousOrders.apostolate', icon: o.icon, title: 'Your Mission', text: r.order === 'opusDei' ? 'Where will you give your time in the Work?' : 'Your superior asks where you feel called to serve. Obedience has the last word, but the Society listens.', options: picks.map(([id, a]) => ({ id, label: a.label })) });
  } else if (r.apostolate) {
    const a = o.apostolates[r.apostolate];
    if (a && rng.chance(0.4)) ctx.log(a.text, o.icon, 'good');
  }
  // Offices for the professed.
  if (['professed', 'fidelity'].includes(r.stage) && state.character.age >= 35) {
    const at = o.offices.findIndex(([id]) => id === r.office);
    const next = o.offices[at + 1];
    if (next && rng.chance(next[2] + (state.stats.smarts - 60) / 1000)) {
      r.office = next[0];
      (r.history ??= []).push({ age: state.character.age, office: next[1] });
      ctx.log(next[0] === 'general' ? `The General Congregation elected you ${next[1]} of ${o.name}${r.order === 'jesuits' ? ' — "the Black Pope" to the newspapers' : ''}.` : r.order === 'opusDei' && next[0] === 'prelate' ? 'The Pope appointed you Prelate of Opus Dei.' : `You were named ${next[1]}.`, o.icon, 'milestone');
    }
  }
  // Opus Dei: numeraries give their earnings to the centre; supernumeraries give what they can.
  if (r.order === 'opusDei') {
    const pay = state.career.job?.salary ?? 0;
    const give = Math.round(pay * (r.kind === 'numerary' ? 0.5 : 0.05));
    if (give > 0) ctx.spend(give, r.kind === 'numerary' ? 'Salary given to your Opus Dei centre' : 'Gift to Opus Dei', { allowDebt: false });
    if (r.kind === 'numerary') r.housed = true;
    // Some numeraries are asked to become priests of the prelature.
    if (r.kind === 'numerary' && r.stage === 'fidelity' && state.character.gender === 'male' && !r.priestAsked && state.character.age >= 30 && rng.chance(0.08)) {
      r.priestAsked = true;
      ctx.prompt({ type: 'religiousOrders.prelatePriest', icon: '✝️', title: 'A Call to the Priesthood', text: 'The Prelate asks whether you would study for the priesthood of the prelature: a doctorate in Rome, and ordination.', options: [{ id: 'yes', label: '⛪ Accept' }, { id: 'no', label: '💼 Stay a lay numerary' }] });
    }
  }
}

const apostolateOpen = (r) => ({ jesuits: ['professed', 'tertianship'], opusDei: ['member', 'fidelity'], moc: ['junior', 'professed'] }[r.order] ?? []).includes(r.stage);

function advance(ctx, r) {
  const o = RELIGIOUS_ORDERS[r.order];
  const st = stageOf(r);
  const i = o.stages.indexOf(st);
  const next = o.stages[i + 1];
  if (!next) return;
  if (st.ordain) ordain(ctx, r);
  if (st.vows) r.vows = st.vows;
  r.stage = next.id;
  r.stageSince = ctx.state.character.age;
  ctx.log(st.text, o.icon, st.vows === 'final' || st.ordain ? 'milestone' : 'good');
}

function leave(ctx, why) {
  const { state } = ctx;
  const r = religiousOf(state);
  if (!r) return;
  const o = RELIGIOUS_ORDERS[r.order];
  r.left = state.character.age;
  r.housed = false;
  if (state.character.posting?.kind === 'mission') state.character.posting = null;
  ctx.log(why ?? (r.vows === 'final' ? `Rome granted your indult: you were dispensed from your vows and left ${o.short}.${state.community.orders && !state.community.orders.laicized ? ' You remain a priest, and may seek a bishop to take you.' : ''}` : `You left ${o.short}. ${o.community ? 'Your superiors wished you well; you walked out with a small suitcase and a bus fare.' : ''}`), '🚪', 'warn');
}

export const ReligiousOrdersModule = {
  id: 'religiousOrders',
  order: 38.5,
  setup(engine) {
    // Taking an outside job means leaving community life.
    engine.bus.on('career:hired', ({ ctx, job }) => {
      const r = religiousOf(ctx.state);
      if (!r || !RELIGIOUS_ORDERS[r.order].community) return;
      if (['catholicClergy', 'education', 'professor', 'holySeeDiplomacy', 'romanCuria'].includes(job?.professionId)) return;
      leave(ctx, `You took a job outside the order, and with it left ${RELIGIOUS_ORDERS[r.order].short}.`);
    });
  },
  onAgeUp(ctx) {
    if (ctx.state.character.alive) religiousYear(ctx);
  },
  actions: {
    /** Ask to enter an order (arg: 'jesuits' | 'moc' | 'opusDei:numerary' | 'opusDei:supernumerary'). */
    enter(ctx, arg) {
      const { state, rng } = ctx;
      const [orderId, kind] = String(arg ?? '').split(':');
      const check = entryCheck(state, orderId, kind);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'religiousOrders.enter');
      const o = RELIGIOUS_ORDERS[orderId];
      const devout = state.community.faith?.attendance === 'devout';
      if (!rng.chance(clamp(0.45 + (devout ? 0.3 : 0) + (state.stats.happiness - 50) / 300, 0.15, 0.9))) return ctx.log(`The vocation director met you several times and advised you to wait a year and keep praying about it.`, o.icon, 'info');
      if (o.community && state.career.job) leaveJob(ctx, `Entered ${o.short}`);
      const priest = state.community.orders && !state.community.orders.laicized && ['priest', 'bishop'].includes(state.community.orders.grade);
      // A diocesan priest who joins the Jesuits skips the studies already done.
      const stage = orderId === 'jesuits' && priest ? 'tertianship' : o.stages[0].id;
      state.community.religious = { order: orderId, kind: orderId === 'opusDei' ? (kind === 'numerary' ? 'numerary' : 'supernumerary') : null, stage, since: state.character.age, stageSince: state.character.age, vows: null, apostolate: null, office: null, housed: o.community || kind === 'numerary', history: [] };
      if (state.community.religious.housed && state.housing) { state.housing.rental = null; state.housing.withParents = false; }
      return ctx.log({
        jesuits: 'You entered the Jesuit novitiate: the thirty-day Spiritual Exercises in silence, a "pilgrim experiment" with no money, and hospital work.',
        moc: 'You entered the Missionaries of Charity as an aspirant: a bucket, a plate, two saris and a crucifix are all you own now.',
        opusDei: kind === 'numerary' ? 'You asked to be admitted to Opus Dei as a numerary: celibacy, a room in a centre, your salary given over, and your job kept.' : 'You asked to be admitted to Opus Dei as a supernumerary: daily Mass and prayer, a weekly circle, and your family life as your path to holiness.',
      }[orderId], o.icon, 'milestone');
    },
    /** Leave the order (a dispensation after final vows). */
    leave(ctx) {
      if (!religiousOf(ctx.state)) return ctx.toast('You are not in an order.', 'warn');
      return leave(ctx);
    },
    /** Change apostolate (once a year; your superior must agree). */
    reassign(ctx) {
      const { state, rng } = ctx;
      const r = religiousOf(state);
      if (!r?.apostolate) return ctx.toast('No mission to change', 'warn');
      if (yearlyCount(state, 'religiousOrders.reassign')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'religiousOrders.reassign');
      if (!rng.chance(0.6)) return ctx.log('Your superior asked you to stay where you are for now. Obedience.', '🙏', 'info');
      if (state.character.posting?.kind === 'mission') state.character.posting = null;
      r.apostolate = null;
      return ctx.log('Your superior agreed to a change. A new mission next year.', '🙏', 'info');
    },
  },
  resolvers: {
    vows(ctx, data, optionId) {
      const { state } = ctx;
      const r = religiousOf(state);
      if (!r) return undefined;
      if (optionId === 'leave') return leave(ctx);
      if (optionId === 'wait') { r.stageSince += 1; return ctx.log('Your superiors gave you another year to discern.', '⏳', 'info'); }
      // Poverty: what you own goes to the poor or the order.
      const given = Math.max(0, Math.round(state.finances.cash));
      if (given > 0) { state.finances.cash -= given; ctx.log(`You gave away everything you had (${given.toLocaleString()} in savings) before your profession.`, '🤲', 'info'); }
      return advance(ctx, r);
    },
    apostolate(ctx, data, optionId) {
      const { state, rng } = ctx;
      const r = religiousOf(state);
      const o = r && RELIGIOUS_ORDERS[r.order];
      const a = o?.apostolates[optionId];
      if (!a) return undefined;
      r.apostolate = optionId;
      if (a.abroad) {
        const [place, country] = rng.pick(a.abroad);
        postAbroad(ctx, { place, country, kind: 'mission', years: 5 });
        return ctx.log(`${a.text} You were sent to ${place}, ${country}.`, o.icon, 'milestone');
      }
      return ctx.log(a.text, o.icon, 'good');
    },
    prelatePriest(ctx, data, optionId) {
      const r = religiousOf(ctx.state);
      if (!r || optionId !== 'yes') return ctx.log('You stayed a lay numerary.', '💼', 'info');
      ordain(ctx, r);
      return ctx.log('After a doctorate in Rome you were ordained a priest of the Prelature of Opus Dei.', '⛪', 'milestone');
    },
  },
};

/** For the Community view: what religious life looks like for you now. */
export function religiousSummary(state) {
  const r = religiousOf(state);
  if (!r) return null;
  const o = RELIGIOUS_ORDERS[r.order];
  const st = stageOf(r);
  return {
    order: o, stage: st?.label ?? r.stage, kind: r.kind ? o.kinds[r.kind] : null,
    since: r.since, vows: r.vows, apostolate: r.apostolate ? o.apostolates[r.apostolate]?.label : null,
    office: r.office ? o.offices.find(([id]) => id === r.office)?.[1] : null,
    nextIn: st?.years ? Math.max(0, st.years - (state.character.age - r.stageSince)) : null,
  };
}
