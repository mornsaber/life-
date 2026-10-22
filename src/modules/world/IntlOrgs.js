/**
 * International organisations and the Sovereign Military Order of Malta.
 *
 *   Careers      (career/IntlOrgCareers.js) move you to the organisation's duty
 *                station and rotate you between stations every few years.
 *                Hardship posts pay danger pay and carry real risk. Salaries are
 *                exempt from national income tax: an internal staff assessment
 *                replaces it. EU staff pay the EU's own community tax.
 *   Competitions The UN Young Professionals Programme, EPSO open competitions
 *                and the World Bank's Young Professionals Program: one sitting
 *                a year, with low pass rates.
 *   Top posts    UN Secretary-General, Under-Secretaries-General, heads of UN
 *                agencies, European Commissioners and the Commission's President,
 *                NATO's Secretary General, the heads of the World Bank and the
 *                IMF, and international judges. These are offered to former
 *                heads of government, ministers and senior officials, for a
 *                fixed term.
 *   Order of Malta  A Catholic religious order of knighthood that is also a
 *                sovereign entity: it issues its own passports and has diplomatic
 *                relations with more than 100 states. Its grades are Magistral
 *                Grace, Honour and Devotion (for those of noble descent), the
 *                Promise of Obedience, and the professed Knights of Justice, who
 *                take religious vows and are styled "Fra". The Sovereign Council
 *                and the Prince and Grand Master are elected from the professed.
 *
 * state.intlOrgs = { competitions: { ypp|epso|wbYpp: { passed, age, sittings } } }
 * state.malta    = { grade, since, office, officeSince, vowsAt, conferred }
 * job.intlTerm   = age an appointed term ends
 */
import { INTL_ORG_PROFESSIONS, DUTY_STATIONS, HARDSHIP, EU_MEMBERS, NATO_MEMBERS, P5 } from '../career/IntlOrgCareers.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire, leaveJob } from '../career/CareerEngine.js';
import { postAbroad, endPosting, postingOf } from './Posting.js';
import { OFFICES } from '../politics/Offices.js';
import { citizenshipsOf, COUNTRIES } from './Countries.js';
import { addHonor, yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { living } from '../people/People.js';
import { orgOf } from '../org/Organizations.js';
import { seatsAt } from '../org/Vacancies.js';

const ROTATION_YEARS = 4;
const isIntl = (job) => Boolean(job && INTL_ORG_PROFESSIONS[job.professionId]);
const cits = (state) => citizenshipsOf(state);
const anyOf = (state, list) => cits(state).some((c) => list.includes(c));

/* ------------------------------------------------------------------ */
/* Competitions                                                        */
/* ------------------------------------------------------------------ */

export const COMPETITIONS = {
  ypp: { name: 'UN Young Professionals Programme exam', icon: '🇺🇳', maxAge: 32, base: 0.04, needs: 'bachelor', desc: 'A written exam and interview; about 1 in 40 candidates pass.' },
  epso: { name: 'EPSO open competition (AD5 concours)', icon: '🇪🇺', base: 0.05, needs: 'bachelor', eu: true, desc: 'Reasoning tests, a case study and an assessment centre; a few per cent pass.' },
  wbYpp: { name: 'World Bank Group Young Professionals Program', icon: '🏦', maxAge: 32, base: 0.02, needs: 'master', desc: 'For economists and specialists with a master\'s or PhD; under 2% are selected.' },
};

const degreeRank = { bachelor: 1, master: 2, doctorate: 3, professional: 3 };
const bestDegree = (state) => state.education.degrees.reduce((m, d) => Math.max(m, degreeRank[d.type] ?? 0), 0);

export function competitionCheck(state, id) {
  const c = COMPETITIONS[id];
  const s = state.intlOrgs?.competitions?.[id];
  if (!c) return { ok: false, reason: 'No such competition' };
  if (s?.passed) return { ok: false, reason: 'Passed — you\'re on the reserve list' };
  if (state.character.age < 21) return { ok: false, reason: 'From 21' };
  if (c.maxAge && state.character.age > c.maxAge) return { ok: false, reason: `${c.maxAge} and under` };
  if (c.eu && !anyOf(state, EU_MEMBERS)) return { ok: false, reason: 'EU citizens only' };
  if (bestDegree(state) < degreeRank[c.needs]) return { ok: false, reason: `Needs a ${c.needs}'s degree` };
  if (yearlyCount(state, `intlOrgs.sit.${id}`)) return { ok: false, reason: 'One sitting a year' };
  const languages = 1 + Object.values(state.migration?.languages ?? {}).filter((v) => v >= 100).length;
  const odds = clamp(c.base + Math.max(0, state.stats.smarts - 60) / 160 + (languages >= 2 ? 0.03 : 0) + (bestDegree(state) >= 2 ? 0.02 : 0), 0.01, 0.4);
  return { ok: true, odds };
}

/* ------------------------------------------------------------------ */
/* Duty stations                                                       */
/* ------------------------------------------------------------------ */

const stationsOf = (employerName) => DUTY_STATIONS[employerName] ?? { hq: ['Geneva', 'Switzerland'] };

function station(ctx, [place, country], years = ROTATION_YEARS) {
  const { state } = ctx;
  endPosting(ctx);
  const p = postAbroad(ctx, { place, country, kind: 'intl', years });
  if (!p) return ctx.log(`Your duty station is ${place}, in your own country.`, '🌐', 'info');
  return ctx.log(`Your duty station: ${place}, ${country}.${HARDSHIP.includes(place) ? ' A hardship post: danger pay, rest-and-recuperation breaks — and real risk.' : ''}`, '🌐', 'milestone');
}

function rotate(ctx, job) {
  const { rng } = ctx;
  const st = stationsOf(job.employer.name);
  const here = postingOf(ctx.state)?.place;
  const options = [st.hq, ...(st.field ?? [])].filter((s) => s[0] !== here);
  if (!options.length) { if (postingOf(ctx.state)) ctx.state.character.posting.until += ROTATION_YEARS; return; }
  // Mobility: a field tour after headquarters, headquarters after the field.
  const next = here === st.hq[0] || !st.field?.length ? rng.pick(st.field?.length ? st.field : options) : rng.chance(0.5) ? st.hq : rng.pick(options);
  ctx.log('Rotation: the organisation\'s mobility policy moves you on.', '🔁', 'info');
  station(ctx, next);
}

/* ------------------------------------------------------------------ */
/* Top appointments                                                    */
/* ------------------------------------------------------------------ */

function political(state) {
  const p = state.politics ?? {};
  const held = [...(p.history ?? []).map((h) => h.officeId), p.office?.id].filter((id) => OFFICES[id]);
  const level = held.reduce((m, id) => Math.max(m, OFFICES[id].level ?? 0), 0);
  const head = held.some((id) => (OFFICES[id].leader && (OFFICES[id].level ?? 0) >= 5) || /president|_pm$/.test(id));
  return { level, head };
}
const jobAt = (state, prof, minGrade) => { const j = state.career.job; return j?.professionId === prof && (j.grade ?? 0) >= minGrade; };

/** Appointed posts: you take the top rung of the organisation's ladder, under the post's own title. */
export const TOP_POSTS = {
  unSG: { prof: 'unSecretariat', level: 'asg', title: 'Secretary-General of the United Nations', by: 'the General Assembly, on the Security Council\'s recommendation', employer: 'United Nations Secretariat (New York)', term: 5, chance: 0.02, who: (s, pol) => !anyOf(s, P5) && (pol.head || jobAt(s, 'unSecretariat', 10)) },
  usg: { prof: 'unSecretariat', level: 'asg', title: 'Under-Secretary-General of the United Nations', by: 'the Secretary-General', employer: 'United Nations Secretariat (New York)', term: 4, chance: 0.04, who: (s, pol) => pol.level >= 4 || jobAt(s, 'unSecretariat', 9) || jobAt(s, 'foreignService', 9) },
  unAgency: { prof: 'unAgencies', level: 'regional', title: 'Executive Head of a UN agency', by: 'the Secretary-General and the agency\'s governing board', employer: null, term: 5, chance: 0.03, who: (s, pol) => pol.level >= 4 || jobAt(s, 'unAgencies', 9) || jobAt(s, 'publicHealth', 9) },
  euCommissioner: { prof: 'euInstitutions', level: 'dg', title: 'European Commissioner', by: 'your government, with the European Parliament\'s consent', employer: 'European Commission', term: 5, chance: 0.06, who: (s, pol) => anyOf(s, EU_MEMBERS) && pol.level >= 4 },
  euPresident: { prof: 'euInstitutions', level: 'dg', title: 'President of the European Commission', by: 'the European Council, elected by the European Parliament', employer: 'European Commission', term: 5, chance: 0.04, who: (s, pol) => anyOf(s, EU_MEMBERS) && pol.head },
  natoSG: { prof: 'nato', level: 'asg', title: 'Secretary General of NATO', by: 'the North Atlantic Council, by consensus', employer: 'NATO Headquarters (International Staff)', term: 4, chance: 0.04, who: (s, pol) => anyOf(s, NATO_MEMBERS) && !cits(s).includes('US') && pol.head },
  bankHead: { prof: 'intlFinance', level: 'vp', title: 'President of the World Bank Group', by: 'the Board of Executive Directors', employer: null, term: 5, chance: 0.03, who: (s, pol) => (cits(s).includes('US') || anyOf(s, EU_MEMBERS)) && (pol.head || jobAt(s, 'intlFinance', 10) || jobAt(s, 'finance', 10)) },
  intlJudge: { prof: 'intlJustice', level: 'chief', title: 'Judge of an international court', by: 'the UN General Assembly and Security Council (or the Assembly of States Parties)', employer: null, term: 9, chance: 0.03, who: (s) => Boolean(s.judiciary?.seat) || jobAt(s, 'law', 9) || jobAt(s, 'intlJustice', 10) },
};

export function postTitle(id, state) {
  if (id === 'bankHead' && !cits(state).includes('US')) return 'Managing Director of the IMF';
  return TOP_POSTS[id].title;
}

/** An appointee takes the seat: whoever held that rung retires. */
function vacateSeat(state, job) {
  const org = orgOf(state, job.employer);
  const ids = org?.departments?.[job.employer.deptId]?.seats?.[job.professionId]?.[job.levelId];
  if (!ids?.length) return;
  const seats = seatsAt(org, job.employer.deptId, getProfession(job.professionId), getProfession(job.professionId).levels.find((l) => l.id === job.levelId), org.size);
  while (ids.filter((id) => org.people[id]).length + 1 > seats && ids.length) {
    const out = ids.findIndex((id) => org.people[id]);
    if (out < 0) break;
    delete org.people[ids[out]];
    ids.splice(out, 1);
  }
}

function offerTopPosts(ctx) {
  const { state, rng } = ctx;
  const age = state.character.age;
  if (age < 40 || age > 72 || state.politics?.office || state.prompts.some((p) => p.type === 'intlOrgs.appointment')) return;
  const job = state.career.job;
  if (job?.intlTerm) return;
  const pol = political(state);
  for (const [id, t] of Object.entries(TOP_POSTS)) {
    if (job?.intlPost === id) continue;
    if (!t.who(state, pol) || !rng.chance(t.chance)) continue;
    const employer = t.employer ?? rng.pick(getProfession(t.prof).employers);
    const name = id === 'bankHead' ? (cits(state).includes('US') ? 'World Bank Group' : 'International Monetary Fund') : employer;
    ctx.prompt({
      type: 'intlOrgs.appointment', icon: getProfession(t.prof).icon, title: postTitle(id, state),
      text: `${id === 'euCommissioner' ? 'Your government wants to nominate you' : 'You are being sounded out'} for ${postTitle(id, state)} (${name}) — a ${t.term}-year term, appointed by ${t.by}.`,
      options: [{ id: 'accept', label: '✅ Let your name go forward' }, { id: 'decline', label: '🙅 Not for you' }],
      data: { post: id, employer: name },
    });
    return;
  }
}

/* ------------------------------------------------------------------ */
/* The Order of Malta                                                  */
/* ------------------------------------------------------------------ */

export const MALTA_GRADES = {
  magistral: { name: 'Knight of Magistral Grace', female: 'Dame of Magistral Grace', icon: '✠', prestige: 6 },
  honour: { name: 'Knight of Honour and Devotion', female: 'Dame of Honour and Devotion', icon: '✠', prestige: 8 },
  obedience: { name: 'Knight in Obedience', female: 'Dame in Obedience', icon: '✠', prestige: 9 },
  justice: { name: 'Knight of Justice (professed)', female: 'Dame of Justice', icon: '✠', prestige: 12 },
};
export const MALTA_OFFICES = { council: 'Member of the Sovereign Council', chancellor: 'Grand Chancellor', grandMaster: 'Prince and Grand Master of the Sovereign Military Order of Malta' };
const MALTA_FEE = 3000;
const OBLATION = 700;

const catholic = (state) => ['catholic', 'tradCatholic'].includes(state.community?.faith?.traditionId);
const noble = (state) => Boolean(state.character.peerage || state.royal || state.character.formerRoyal || state.character.style?.prefix === 'The Hon.' || state.character.noble);
const attached = (state) => living(state).some((p) => ['spouse', 'fiance', 'partner'].includes(p.relation));
export const maltaGradeName = (state) => { const g = MALTA_GRADES[state.malta?.grade]; return g ? (state.character.gender === 'female' ? g.female : g.name) : null; };

export function maltaJoinCheck(state) {
  if (state.malta?.grade) return { ok: false, reason: 'Already a member' };
  if (!catholic(state)) return { ok: false, reason: 'Practising Catholics only' };
  if (state.character.age < 21) return { ok: false, reason: 'From 21' };
  if (yearlyCount(state, 'intlOrgs.joinMalta')) return { ok: false, reason: 'One application a year' };
  if (state.legal.record.some((r) => r.severity === 'felony')) return { ok: false, reason: 'Of good standing (no criminal record)' };
  return { ok: true, odds: clamp(0.25 + ({ devout: 0.15, regular: 0.05 }[state.community?.faith?.attendance] ?? -0.1) + Math.min(0.3, (state.honors?.length ?? 0) * 0.03) + (noble(state) ? 0.2 : 0), 0.08, 0.85) };
}

function maltaHonour(state) {
  const m = state.malta;
  const name = m.office ? MALTA_OFFICES[m.office] : maltaGradeName(state);
  state.honors = state.honors.filter((h) => !h.id.startsWith('smom.'));
  addHonor(state, { id: `smom.${m.office ?? m.grade}`, source: 'foreign', from: 'the Sovereign Military Order of Malta', name: `${name} (Sovereign Military Order of Malta)`, icon: '✠', precedence: 7, prestige: m.office === 'grandMaster' ? 40 : m.office ? 18 : MALTA_GRADES[m.grade].prestige, citation: 'Tuitio fidei et obsequium pauperum: defence of the faith and service to the poor and the sick.' });
}

function setMaltaStyle(state) {
  const m = state.malta;
  const c = state.character;
  if (m?.office === 'grandMaster') c.style = { ...(c.style ?? {}), prefix: 'His Most Eminent Highness Fra' };
  else if (m?.grade === 'justice') c.style = { ...(c.style ?? {}), prefix: 'Fra' };
  else if (/Fra$/.test(c.style?.prefix ?? '')) c.style = { ...(c.style ?? {}), prefix: null };
}

function maltaYear(ctx) {
  const { state, rng } = ctx;
  const m = state.malta;
  if (!m?.grade) return;
  const age = state.character.age;
  const years = age - m.since;
  ctx.spend(OBLATION, 'Annual oblation to the Order of Malta', { allowDebt: true });
  // Breaking the vow of chastity ends the profession.
  if (m.grade === 'justice' && attached(state)) {
    m.grade = 'obedience';
    if (m.office === 'grandMaster') ctx.log('You resigned as Grand Master to marry. The Order\'s Council Complete of State will elect a successor.', '✠', 'warn');
    m.office = null;
    setMaltaStyle(state);
    maltaHonour(state);
    ctx.log('Released from your religious vows, you are no longer a professed Knight of Justice.', '✠', 'warn');
  }
  // Terms of office: the Sovereign Council sits for six years; the Grand Master for ten (once renewable), and retires at 85.
  if (m.office && (age - m.officeSince >= (m.office === 'grandMaster' ? 10 : 6) || age >= 85)) {
    const renew = m.office === 'grandMaster' && age < 85 && !m.renewed && rng.chance(0.5);
    if (renew) { m.renewed = true; m.officeSince = age; ctx.log('The Council Complete of State re-elected you Grand Master for a second ten-year term.', '✠', 'honor'); } else {
      ctx.log(`Your term as ${MALTA_OFFICES[m.office]} ended.`, '✠', 'info');
      m.office = null;
      setMaltaStyle(state);
      maltaHonour(state);
    }
  }
  // Elections: the Chapter General chooses the Sovereign Council from senior members; the Grand Master comes from the professed.
  if (!m.office && years >= 10 && age >= 40 && ['obedience', 'justice'].includes(m.grade) && rng.chance(0.05)) {
    m.office = m.grade === 'justice' && rng.chance(0.3) ? 'chancellor' : 'council';
    m.officeSince = age;
    maltaHonour(state);
    ctx.log(`The Chapter General elected you ${MALTA_OFFICES[m.office]} of the Order of Malta.`, '✠', 'honor');
  } else if (['council', 'chancellor'].includes(m.office) && m.grade === 'justice' && age >= 50 && age < 80 && rng.chance(0.06)) {
    m.office = 'grandMaster';
    m.officeSince = age;
    m.renewed = false;
    setMaltaStyle(state);
    maltaHonour(state);
    ctx.stat('happiness', 15);
    ctx.log('The Grand Master has died. The Council Complete of State, meeting in the Magistral Palace in Rome, elected you Prince and Grand Master of the Sovereign Military Order of Malta: head of a sovereign order with diplomatic relations with more than a hundred states, ranking with a cardinal of the Church.', '👑', 'honor');
  }
  // The Order's lay members serve the sick: a quiet year adds a little.
  if (rng.chance(0.25)) ctx.log(rng.pick(['You volunteered at the Order\'s soup kitchen.', 'You helped at a Malteser camp for young people with disabilities.', 'You served at the Order\'s hospice.', 'You joined a Malteser night-shelter shift.']), '✠');
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const IntlOrgsModule = {
  id: 'intlOrgs',
  order: 60,
  init(state) {
    state.intlOrgs ??= { competitions: {} };
  },
  setup(engine) {
    engine.bus.on('career:hired', ({ ctx, job }) => {
      if (!isIntl(job)) return;
      ctx.state.career.lastIntlStationAge = ctx.state.character.age;
      station(ctx, stationsOf(job.employer.name).hq);
    });
    engine.bus.on('career:separated', ({ ctx, job }) => {
      if (!isIntl(job)) return;
      if (postingOf(ctx.state)?.kind === 'intl') endPosting(ctx, 'Your international service ended: you came home.');
      // Long service with the Order's relief agency: the Order's own decoration.
      const years = job.yearsAtEmployer ?? 0;
      if (['maltaRelief', 'maltaDiplomacy'].includes(job.professionId) && years >= 5 && !ctx.state.honors.some((h) => h.id === 'smom.merit')) {
        addHonor(ctx.state, { id: 'smom.merit', source: 'foreign', from: 'the Sovereign Military Order of Malta', name: 'Order pro Merito Melitensi', icon: '✠', precedence: 8, prestige: 8, citation: 'For service to the Order of Malta\'s humanitarian work.' });
        ctx.log('The Order of Malta awarded you the Order pro Merito Melitensi.', '✠', 'honor');
      }
    });
  },
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.character.alive) return;
    const job = state.career.job;
    if (isIntl(job)) {
      // Pay: exempt from national income tax (US citizens excepted outside the EU); EU staff pay the EU's tax.
      const usTaxed = cits(state).includes('US') && job.professionId !== 'euInstitutions';
      const share = job.professionId === 'euInstitutions' ? 0.82 : usTaxed ? 0 : 1;
      if (share) for (const i of state.finances.ledger.income) if (/^(Salary|Annual bonus) — /.test(i.source) && i.source.endsWith(job.title) && !i.taxFree) i.taxFree = Math.round(i.amount * share);
      const p = postingOf(state);
      if (p?.kind === 'intl' && HARDSHIP.includes(p.place)) {
        ctx.earn(15000, 'Danger pay and hardship allowance', { wage: true });
        if (rng.chance(0.03)) {
          ctx.stat('health', -rng.int(10, 30));
          ctx.stat('stress', 20);
          ctx.log(`${rng.pick(['Your convoy was ambushed outside', 'Shelling hit the compound in', 'You were briefly detained by an armed group near', 'A bomb went off a street from the office in'])} ${p.place}. You were hurt, and evacuated for treatment.`, '⚠️', 'bad');
        }
      }
      if (!p && job.professionId && (state.character.age - (state.career.lastIntlStationAge ?? 0)) >= ROTATION_YEARS && rng.chance(0.4)) { state.career.lastIntlStationAge = state.character.age; rotate(ctx, job); }
      else if (p?.kind === 'intl' && p.until <= state.character.age) { state.career.lastIntlStationAge = state.character.age; rotate(ctx, job); }
      // Appointed terms.
      if (job.intlTerm && state.character.age >= job.intlTerm) {
        const t = TOP_POSTS[job.intlPost];
        if (t && !job.intlRenewed && job.performance >= 65 && rng.chance(0.5)) {
          job.intlRenewed = true;
          job.intlTerm = state.character.age + t.term;
          ctx.log(`You were reappointed ${job.title} for a second term.`, '🌐', 'honor');
        } else {
          ctx.log(`Your term as ${job.title} ended.`, '🌐', 'milestone');
          leaveJob(ctx, `Term as ${job.title} ended`);
        }
      }
    }
    offerTopPosts(ctx);
    maltaYear(ctx);
  },
  actions: {
    /** Sit a recruitment competition (arg: ypp | epso | wbYpp). */
    sit(ctx, id) {
      const { state, rng } = ctx;
      const check = competitionCheck(state, id);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, `intlOrgs.sit.${id}`);
      const c = COMPETITIONS[id];
      const s = (state.intlOrgs.competitions[id] ??= { passed: false, sittings: 0 });
      s.sittings += 1;
      ctx.stat('stress', 6);
      if (rng.chance(check.odds)) {
        Object.assign(s, { passed: true, age: state.character.age });
        ctx.stat('happiness', 10);
        return ctx.log(`You passed the ${c.name}: you're on the reserve list. Apply on the job board.`, c.icon, 'milestone');
      }
      return ctx.log(`You didn't make it through the ${c.name} this year.`, c.icon, 'bad');
    },
    /** Seek admission to the Order of Malta. */
    joinMalta(ctx) {
      const { state, rng } = ctx;
      const check = maltaJoinCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'intlOrgs.joinMalta');
      if (!ctx.spend(MALTA_FEE, 'Passage fee, Order of Malta', { credit: true })) return ctx.toast('The passage fee is beyond you this year.', 'warn');
      if (!rng.chance(check.odds)) return ctx.log('Your sponsors put your name forward to the Order of Malta, but the national association did not admit you this year.', '✠', 'bad');
      state.malta = { grade: noble(state) ? 'honour' : 'magistral', since: state.character.age, office: null };
      maltaHonour(state);
      ctx.stat('happiness', 6);
      return ctx.log(`You were invested as a ${maltaGradeName(state)} of the Sovereign Military Order of Malta, in a Mass at the cathedral.`, '✠', 'honor');
    },
    /** Take the Promise of Obedience (after three years). */
    obedience(ctx) {
      const { state } = ctx;
      const m = state.malta;
      if (!m?.grade || !['magistral', 'honour'].includes(m.grade)) return ctx.toast('Only Knights and Dames of the third class make the Promise of Obedience.', 'warn');
      if (state.character.age - m.since < 3) return ctx.toast('After three years\' membership.', 'warn');
      m.grade = 'obedience';
      m.obedienceAt = state.character.age;
      maltaHonour(state);
      return ctx.log('You made the Promise of Obedience: a commitment to strive for Christian perfection in the spirit of the Order.', '✠', 'milestone');
    },
    /** Take religious vows as a Knight of Justice (men, unmarried; after a novitiate). */
    profess(ctx) {
      const { state } = ctx;
      const m = state.malta;
      if (m?.grade !== 'obedience') return ctx.toast('Professed Knights come from those in Obedience.', 'warn');
      if (state.character.gender === 'female') return ctx.toast('The professed Knights of Justice are men; women religious of the Order are nuns of its monasteries.', 'warn');
      if (attached(state)) return ctx.toast('Professed Knights take a vow of chastity: unmarried, and no partner.', 'warn');
      if (state.character.age - (m.obedienceAt ?? m.since) < 2) return ctx.toast('A novitiate first: two years in Obedience.', 'warn');
      m.grade = 'justice';
      m.vowsAt = state.character.age;
      setMaltaStyle(state);
      maltaHonour(state);
      return ctx.log('You took solemn vows of poverty, chastity and obedience: a professed Knight of Justice. You are Fra now.', '✠', 'milestone');
    },
    /** The annual Lourdes pilgrimage with the Order's sick and disabled guests. */
    pilgrimage(ctx) {
      const { state } = ctx;
      if (!state.malta?.grade) return ctx.toast('The Order\'s pilgrimage is for its members and their guests.', 'warn');
      if (yearlyCount(state, 'intlOrgs.pilgrimage')) return ctx.toast('Once a year, in May.', 'warn');
      if (!ctx.spend(1500, 'Lourdes pilgrimage', { credit: true })) return ctx.toast('You can\'t afford the trip this year.', 'warn');
      bumpYearly(state, 'intlOrgs.pilgrimage');
      ctx.stat('happiness', 6);
      ctx.stat('stress', -6);
      return ctx.log('You went on the Order\'s international pilgrimage to Lourdes, pushing the wheelchairs of the sick to the grotto.', '⛪', 'good');
    },
    /** Leave the Order. */
    leaveMalta(ctx) {
      const { state } = ctx;
      if (!state.malta?.grade) return undefined;
      state.malta = null;
      state.honors = state.honors.filter((h) => !h.id.startsWith('smom.') || h.id === 'smom.merit');
      setMaltaStyle(state);
      return ctx.log('You resigned from the Order of Malta.', '✠', 'info');
    },
  },
  resolvers: {
    appointment(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId !== 'accept') return ctx.log('You let it be known you weren\'t a candidate.', '🌐');
      const t = TOP_POSTS[data.post];
      // Not every name that goes forward wins: vetoes, rival candidates, a parliament's hearing.
      if (!rng.chance(data.post === 'euCommissioner' ? 0.8 : 0.5)) return ctx.log(`Another candidate was chosen as ${postTitle(data.post, state)}.`, '🌐', 'bad');
      const profession = getProfession(t.prof);
      const employer = createEmployer(rng, state, profession, state.character.regionId);
      employer.name = data.employer;
      const job = hire(ctx, { professionId: t.prof, levelId: t.level, employer });
      if (!job) return undefined;
      job.title = postTitle(data.post, state);
      job.titleMap = { ...(job.titleMap ?? {}), [t.level]: job.title };
      job.intlPost = data.post;
      job.intlTerm = state.character.age + t.term;
      vacateSeat(state, job);
      return ctx.log(`You were appointed ${job.title}, for ${t.term} years.`, profession.icon, 'honor');
    },
  },
};

export const intlOrgCountryName = (cc) => COUNTRIES[cc]?.name ?? cc;
