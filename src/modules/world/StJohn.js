/**
 * The Order of St John: the Most Venerable Order of the Hospital of Saint John of
 * Jerusalem, a royal order of chivalry, and its Protestant sister orders in the Alliance.
 *
 *   The Venerable Order  Its Sovereign Head is the monarch (of the GB crown); a royal
 *                prince is Grand Prior; the Lord Prior chairs its Great Council. It works
 *                through national Priories (England and the Islands, Scotland, Wales,
 *                Canada, Australia, New Zealand, South Africa, the USA, Kenya, Singapore,
 *                Hong Kong) and St John Ambulance elsewhere, and runs the St John Eye
 *                Hospital in Jerusalem. Membership is by nomination, for service:
 *                Member (MStJ), Officer (OStJ), Commander (CStJ), Knight or Dame of Grace
 *                or of Justice (KStJ / DStJ) and Bailiff or Dame Grand Cross (GCStJ). The
 *                letters are used, but it gives no title and no precedence: a Knight of
 *                St John is not "Sir". In Canada, Australia and New Zealand the
 *                Governor-General is Prior.
 *   Who gets in  Long service with St John Ambulance (the Service Medal at ten years,
 *                a bar for every five more); doctors, nurses and paramedics who give
 *                their time; benefactors of the Eye Hospital; and the eminent.
 *   Medals       The Service Medal of the Order, and the Life Saving Medal (bronze,
 *                silver, gold) for a rescue at risk to yourself.
 *   The Alliance The Johanniterorden (Germany, Sweden) and the Johanniter Orde in
 *                Nederland: Protestant, men only, by invitation. Knights of Honour
 *                (Ehrenritter) become Knights of Justice (Rechtsritter) after a few
 *                years; Sweden and the Netherlands still ask for noble birth. The
 *                German order's Herrenmeister is a Prince of Prussia.
 *
 * state.stJohn = { order: 'venerable' | 'DE' | 'NL' | 'SE', grade, since, priory, justice,
 *                  office, officeSince, giving, viceRegal } | null
 */
import { addHonor, currentYear, yearlyCount, bumpYearly, hasFelony } from '../../core/State.js';
import { clamp, Random } from '../../core/Random.js';
import { eminence } from './Honours.js';
import { VOLUNTEER_SERVICES } from './CountryLaw.js';
import { TRADITIONS } from '../community/Religions.js';
import { stateIdOf } from '../life/Regions.js';
import { nobleBorn } from './Houses.js';

/* ------------------------------------------------------------------ */
/* The Venerable Order                                                 */
/* ------------------------------------------------------------------ */

/** Priories, and the St John bodies that report to the Grand Priory where there's no priory. */
export const PRIORIES = {
  GB: 'the Priory of England and the Islands', 'GB-SCT': 'the Priory of Scotland', 'GB-WLS': 'the Priory for Wales',
  CA: 'the Priory of Canada', AU: 'the Priory of Australia', NZ: 'the Priory in New Zealand', ZA: 'the Priory of South Africa',
  US: 'the Priory of the United States of America', KE: 'the Priory of Kenya', SG: 'the Priory in Singapore', HK: 'the Priory of Hong Kong',
  IN: 'St John Ambulance India', NG: 'St John Ambulance Nigeria', PG: 'St John PNG', MY: 'St John Ambulance Malaysia', JM: 'St John Jamaica', IE: 'St John Ambulance Ireland',
};
/** Where the Governor-General is Prior (ViceRegal.js keys). */
const VICE_REGAL_PRIOR = { CA: 'ca_gg', AU: 'au_gg', NZ: 'nz_gg' };

export const GRADES = [
  { id: 'member', name: 'Member of the Order of St John', post: 'MStJ', prestige: 4 },
  { id: 'officer', name: 'Officer of the Order of St John', post: 'OStJ', prestige: 6 },
  { id: 'commander', name: 'Commander of the Order of St John', post: 'CStJ', prestige: 8 },
  { id: 'knight', name: { male: 'Knight of Grace of the Order of St John', female: 'Dame of Grace of the Order of St John' }, justice: { male: 'Knight of Justice of the Order of St John', female: 'Dame of Justice of the Order of St John' }, post: { male: 'KStJ', female: 'DStJ' }, prestige: 11 },
  { id: 'bailiff', name: { male: 'Bailiff Grand Cross of the Order of St John', female: 'Dame Grand Cross of the Order of St John' }, post: 'GCStJ', prestige: 16 },
];
const gradeIdx = (id) => GRADES.findIndex((g) => g.id === id);
const g2 = (v, state) => (typeof v === 'string' ? v : v?.[state.character.gender === 'female' ? 'female' : 'male']);

export const OFFICES = {
  sovereign: 'Sovereign Head of the Order of St John',
  grandPrior: 'Grand Prior of the Order of St John',
  lordPrior: 'Lord Prior of St John',
  prior: 'Prior',
  chancellor: 'Chancellor',
};

/* ------------------------------------------------------------------ */
/* The Alliance orders                                                 */
/* ------------------------------------------------------------------ */

export const ALLIANCE = {
  DE: { name: 'the Johanniterorden', noble: false, grades: { honour: 'Ehrenritter des Johanniterordens', justice: 'Rechtsritter des Johanniterordens', commendator: 'Kommendator des Johanniterordens' }, head: 'Herrenmeister des Johanniterordens', work: 'the Johanniter-Unfall-Hilfe' },
  NL: { name: 'the Johanniter Orde in Nederland', noble: true, grades: { honour: 'Ere-Ridder in de Johanniter Orde', justice: 'Rechtsridder in de Johanniter Orde', commendator: 'Commendator in de Johanniter Orde' }, head: 'Landcommandeur van de Johanniter Orde in Nederland', work: 'the Johanniter Hulpgroepen' },
  SE: { name: 'the Johanniterorden i Sverige', noble: true, grades: { honour: 'Riddare av Johanniterorden i Sverige', justice: 'Rättsriddare av Johanniterorden i Sverige', commendator: 'Kommendator av Johanniterorden i Sverige' }, head: 'Kommendator (head) of the Johanniterorden i Sverige', work: 'the order\'s hospice and youth work' },
};

/* ------------------------------------------------------------------ */
/* Who you are to the Order                                            */
/* ------------------------------------------------------------------ */

const faithGroup = (state) => TRADITIONS[state.community?.faith?.traditionId]?.group ?? null;
const christian = (state) => faithGroup(state) === 'Christian';
const protestant = (state) => christian(state) && !['catholic', 'tradCatholic', 'orthodoxChristian', 'lds', 'polygamistSect'].includes(state.community.faith.traditionId);
const medical = (job) => ['medical', 'nursing', 'ems', 'privateEms', 'travelNursing', 'physicianAssistant'].includes(job?.professionId);
const gbRoyal = (state) => state.royal && state.royal.crownId === 'GB';

/** Your priory: by your country (and in Britain, Scotland and Wales by region). */
export function prioryOf(state) {
  const cc = state.character.countryId ?? 'US';
  if (cc === 'GB') return PRIORIES[stateIdOf(state)] ?? PRIORIES.GB;
  return PRIORIES[cc] ?? null;
}

/** St John Ambulance here: the country's volunteer ambulance service carries the name. */
export const stJohnAmbulanceHere = (cc) => /St\.? John/.test(VOLUNTEER_SERVICES[cc]?.ambulance ?? '');
/** Years given to St John: the volunteer ambulance service where it's St John's, or a paid post with it. */
export function stJohnYears(state) {
  const amb = state.emergency?.ambulance;
  const vol = amb && stJohnAmbulanceHere(state.character.countryId) ? amb.years ?? 0 : 0;
  const job = state.career?.job;
  const paid = job && /St\.? John/.test(job.employer?.name ?? '') ? job.yearsAtEmployer ?? 0 : 0;
  return vol + paid;
}

export function gradeName(state) {
  const s = state.stJohn;
  if (!s) return null;
  if (s.order !== 'venerable') {
    const a = ALLIANCE[s.order];
    return s.office === 'head' ? a.head : a.grades[s.grade];
  }
  if (s.office === 'sovereign') return OFFICES.sovereign;
  const g = GRADES[gradeIdx(s.grade)];
  if (!g) return null;
  return g2(s.justice && g.justice ? g.justice : g.name, state);
}

/** Replace your St John honour with the current grade (and office). */
function sync(state) {
  const s = state.stJohn;
  state.honors = state.honors.filter((h) => !/^stJohn\.(grade|office|alliance)/.test(h.id));
  if (!s) return;
  const cc = state.character.countryId ?? 'GB';
  if (s.order !== 'venerable') {
    const a = ALLIANCE[s.order];
    addHonor(state, { id: `stJohn.alliance.${s.office ?? s.grade}`, source: 'foreign', country: s.order, from: a.name, name: gradeName(state), icon: '✠', precedence: 9, prestige: s.office === 'head' ? 18 : s.grade === 'commendator' ? 10 : s.grade === 'justice' ? 8 : 6, citation: 'Pro fide, pro utilitate hominum: for the faith, in the service of humanity.' });
    return;
  }
  if (s.office === 'sovereign') {
    addHonor(state, { id: 'stJohn.office.sovereign', source: 'foreign', country: 'GB', from: 'the Order of St John', name: OFFICES.sovereign, icon: '✠', precedence: 9, prestige: 20, citation: 'The monarch is the Order\'s Sovereign Head.' });
    return;
  }
  const g = GRADES[gradeIdx(s.grade)];
  const post = g2(g.post, state);
  addHonor(state, { id: `stJohn.grade.${g.id}`, source: 'order', country: cc, from: 'the Order of St John', name: `${gradeName(state)} (${post})`, post, icon: '✠', precedence: 9, prestige: g.prestige, citation: 'Pro fide, pro utilitate hominum. A royal order of chivalry: the letters are used, but no title or precedence comes with it.' });
  if (s.office && OFFICES[s.office]) {
    const title = ['prior', 'chancellor'].includes(s.office) ? `${OFFICES[s.office]} of ${s.priory ?? 'the Priory'}` : OFFICES[s.office];
    addHonor(state, { id: `stJohn.office.${s.office}`, source: 'foreign', country: cc, from: 'the Order of St John', name: title, icon: '✠', precedence: 9, prestige: s.office === 'grandPrior' ? 18 : s.office === 'lordPrior' ? 14 : 8, citation: 'An office of the Order of St John.' });
  }
}

function admit(ctx, grade, why, { justice = false } = {}) {
  const { state } = ctx;
  state.stJohn = { order: 'venerable', grade, since: state.character.age, priory: prioryOf(state) ?? PRIORIES.GB, justice: justice || nobleBorn(state), office: null };
  sync(state);
  ctx.stat('happiness', 5);
  ctx.log(`${why} You were admitted ${gradeName(state)}, invested by ${state.stJohn.priory.startsWith('the ') ? `the Prior of ${state.stJohn.priory.slice(4)}` : 'the Order'} at a service of the Order. You may write ${g2(GRADES[gradeIdx(grade)].post, state)} after your name.`, '✠', 'honor');
}

function promote(ctx, grade, why) {
  const { state } = ctx;
  const s = state.stJohn;
  if (gradeIdx(grade) <= gradeIdx(s.grade)) return;
  s.grade = grade;
  sync(state);
  ctx.stat('happiness', 4);
  ctx.log(`${why} You were promoted within the Order of St John to ${gradeName(state)} (${g2(GRADES[gradeIdx(grade)].post, state)}).`, '✠', 'honor');
}

function award(ctx, id, name, citation, prestige) {
  const { state } = ctx;
  state.honors = state.honors.filter((h) => h.id !== id);
  addHonor(state, { id, source: 'foreign', from: 'the Order of St John', name, icon: '🎖️', precedence: 21, prestige, citation });
}

/** A rescue at risk to your own life: the Order's Life Saving Medal. */
export function lifeSavingMedal(ctx, level = 'bronze') {
  const name = `Life Saving Medal of the Order of St John in ${level[0].toUpperCase()}${level.slice(1)}`;
  if (ctx.state.honors.some((h) => h.id === `stJohn.lifeSaving.${level}`)) return;
  award(ctx, `stJohn.lifeSaving.${level}`, name, 'For a rescue at risk to your own life.', { bronze: 6, silver: 9, gold: 13 }[level]);
  ctx.log(`The Order of St John awarded you its ${name}.`, '🎖️', 'honor');
}

/* ------------------------------------------------------------------ */
/* The year                                                            */
/* ------------------------------------------------------------------ */

function venerableYear(ctx) {
  const { state, rng } = ctx;
  const c = state.character;
  const age = c.age;
  const priory = prioryOf(state);
  // The monarch is Sovereign Head; giving up the throne ends it.
  if (gbRoyal(state) && state.royal.reigning) {
    if (state.stJohn?.office !== 'sovereign') {
      if (state.stJohn?.office === 'grandPrior') state.world.stJohnGrandPrior = null;
      state.stJohn = { ...(state.stJohn ?? { grade: 'bailiff', since: age, priory: PRIORIES.GB, justice: true }), order: 'venerable', office: 'sovereign', officeSince: age, viceRegal: false };
      sync(state);
      ctx.log('As monarch you are Sovereign Head of the Order of St John.', '✠', 'honor');
    }
    return;
  }
  const s0 = state.stJohn;
  if (s0?.office === 'sovereign') { s0.office = null; s0.grade = 'bailiff'; sync(state); }
  // Working royals of the GB crown are Knights and Dames of Justice; one is Grand Prior.
  if (gbRoyal(state) && age >= 21 && !state.stJohn) admit(ctx, 'knight', 'The Sovereign Head admitted you to the Order of St John.', { justice: true });
  const s = state.stJohn;
  if (gbRoyal(state) && s && !s.office && age >= 35 && !state.world.stJohnGrandPrior && rng.chance(0.15)) {
    state.world.stJohnGrandPrior = { you: true, since: currentYear(state) };
    s.office = 'grandPrior';
    s.officeSince = age;
    s.grade = 'bailiff';
    sync(state);
    ctx.log('The Sovereign Head appointed you Grand Prior of the Order of St John, the royal head of its Great Council, with a Bailiff Grand Cross.', '✠', 'honor');
  }
  // A Governor-General is Prior of the country's priory for the term.
  const vr = VICE_REGAL_PRIOR[c.countryId];
  const gg = vr && state.world?.viceRegal?.[vr]?.you;
  if (gg && s?.office !== 'prior') {
    if (!state.stJohn) admit(ctx, 'knight', 'As Governor-General you head the Order in the realm.', { justice: true });
    const t = state.stJohn;
    if (gradeIdx(t.grade) < gradeIdx('knight')) { t.grade = 'knight'; t.justice = true; }
    Object.assign(t, { office: 'prior', officeSince: age, viceRegal: true, priory });
    sync(state);
    ctx.log(`As Governor-General you are Prior of ${priory}: you invest its new members, and wear the Order's insignia as a Knight of Justice.`, '✠', 'honor');
  } else if (!gg && s?.viceRegal) {
    s.viceRegal = false;
    s.office = null;
    sync(state);
    ctx.log('Your vice-regal term over, you are no longer Prior of the Order in the realm.', '✠', 'info');
  }
  // St John Ambulance: the Service Medal at ten years, a bar for every five more.
  const years = stJohnYears(state);
  if (years >= 10) {
    const bars = Math.floor((years - 10) / 5);
    const held = state.honors.find((h) => h.id === 'stJohn.serviceMedal');
    if (!held || (held.bars ?? 0) < bars) {
      award(ctx, 'stJohn.serviceMedal', `Service Medal of the Order of St John${bars ? ` with ${bars} bar${bars > 1 ? 's' : ''}` : ''}`, `${years} years of efficient service with St John.`, 4 + bars);
      state.honors.find((h) => h.id === 'stJohn.serviceMedal').bars = bars;
      ctx.log(held ? `A bar to your Service Medal of the Order of St John: ${years} years.` : 'Ten years with St John: the Service Medal of the Order of St John.', '🎖️', 'honor');
    }
  }
  // A save on a call can be a rescue at real risk.
  const saver = state.emergency?.ambulance;
  if (saver && stJohnAmbulanceHere(c.countryId) && (saver.saves ?? 0) >= 3 && rng.chance(0.02)) lifeSavingMedal(ctx, rng.chance(0.15) ? 'silver' : 'bronze');
  if (!priory && !state.stJohn) return;
  if (hasFelony(state) || state.legal?.incarceration) return;
  const em = eminence(state);
  const amb = state.emergency?.ambulance;
  const rankIndex = amb && stJohnAmbulanceHere(c.countryId) ? amb.rankIndex ?? 0 : 0;
  const medic = medical(state.career?.job) && (state.career.job.yearsAtEmployer ?? 0) >= 5;
  // Nomination: years of service, a doctor's or nurse's time, generous giving, or eminence.
  if (!state.stJohn) {
    if (age < 18) return;
    if (years >= 5 && rankIndex >= 2 && rng.chance(0.25)) return admit(ctx, 'member', `Your unit nominated you for ${years} years' service with St John.`);
    if (medic && priory && rng.chance(0.03)) return admit(ctx, 'member', 'Your work training first-aiders for St John was recognised.');
    if ((state.flags?.stJohnGiving ?? 0) >= 25000 && rng.chance(0.4)) return admit(ctx, (state.flags.stJohnGiving ?? 0) >= 250000 ? 'commander' : 'officer', 'Your gifts to the St John Eye Hospital in Jerusalem were noticed.');
    if (em >= 140 && priory && rng.chance(0.04)) return admit(ctx, em >= 220 ? 'commander' : 'officer', 'The Priory invited you to support its work.');
    return;
  }
  const s2 = state.stJohn;
  if (s2.order !== 'venerable' || s2.office === 'sovereign') return;
  const served = age - s2.since;
  const gi = gradeIdx(s2.grade);
  // Promotion: for service (rank in the brigade, years), giving and standing.
  if (gi === 0 && served >= 4 && (rankIndex >= 4 || years >= 15 || (state.flags?.stJohnGiving ?? 0) >= 25000 || em >= 120) && rng.chance(0.25)) promote(ctx, 'officer', 'For your service to St John.');
  else if (gi === 1 && served >= 5 && (rankIndex >= 5 || years >= 22 || (state.flags?.stJohnGiving ?? 0) >= 150000 || em >= 180) && rng.chance(0.2)) promote(ctx, 'commander', 'For your leadership in St John.');
  else if (gi === 2 && served >= 5 && (rankIndex >= 6 || years >= 30 || (state.flags?.stJohnGiving ?? 0) >= 500000 || em >= 240) && rng.chance(0.15)) promote(ctx, 'knight', 'For distinguished service to the Order.');
  // Offices: a Knight or Dame may be elected Prior (or Chancellor where the Governor-General is Prior); a Prior may become Lord Prior.
  if (!s2.office && gi >= 3 && served >= 8 && age >= 50 && age < 78 && priory && rng.chance(0.06)) {
    s2.office = VICE_REGAL_PRIOR[c.countryId] ? 'chancellor' : 'prior';
    s2.officeSince = age;
    s2.priory = priory;
    sync(state);
    ctx.log(`You were appointed ${OFFICES[s2.office]} of ${priory}: the Order's work in the country is yours to lead.`, '✠', 'honor');
  } else if (['prior', 'chancellor'].includes(s2.office) && !s2.viceRegal && age - s2.officeSince >= 2 && age < 75 && rng.chance(0.08)) {
    s2.office = 'lordPrior';
    s2.officeSince = age;
    s2.grade = 'bailiff';
    sync(state);
    ctx.log('The Sovereign Head appointed you Lord Prior of St John, chairing the Grand Council of the whole Order, with a Bailiff Grand Cross.', '✠', 'honor');
  } else if (s2.office && !s2.viceRegal && s2.office !== 'grandPrior' && (age - s2.officeSince >= (s2.office === 'lordPrior' ? 3 : 6) || age >= 80)) {
    ctx.log(`Your term as ${s2.office === 'lordPrior' ? OFFICES.lordPrior : `${OFFICES[s2.office]} of ${s2.priory}`} ended.`, '✠', 'info');
    s2.office = null;
    sync(state);
  }
  if (rng.chance(0.2)) ctx.log(rng.pick(['You helped at the Order\'s St John\'s Day service.', 'You presented first-aid certificates to a St John cadet division.', 'You hosted a fundraising dinner for the St John Eye Hospital.', 'You visited a St John community care project.']), '✠');
}

function allianceYear(ctx) {
  const { state, rng } = ctx;
  const s = state.stJohn;
  if (!s || s.order === 'venerable') return;
  const age = state.character.age;
  const a = ALLIANCE[s.order];
  ctx.spend(400, `Annual dues, ${a.name}`, { allowDebt: true });
  if (s.grade === 'honour' && age - s.since >= 4 && rng.chance(0.3)) {
    s.grade = 'justice';
    sync(state);
    ctx.log(`Dubbed at the order's Rittertag, you are now ${a.grades.justice}.`, '✠', 'honor');
  } else if (s.grade === 'justice' && age - s.since >= 12 && age >= 45 && rng.chance(0.06)) {
    s.grade = 'commendator';
    sync(state);
    ctx.log(`You were elected ${a.grades.commendator}: you lead the order's work in your province.`, '✠', 'honor');
  }
  // The German order's Herrenmeister is a Prince of Prussia; the others elect their head.
  const prussian = state.house?.cc === 'DE' && !state.house.renounced;
  if (!s.office && s.grade !== 'honour' && age >= 45 && age < 75 && (s.order === 'DE' ? prussian : s.grade === 'commendator') && rng.chance(0.08)) {
    s.office = 'head';
    s.officeSince = age;
    sync(state);
    ctx.log(`The Chapter elected you ${a.head}.`, '👑', 'honor');
  } else if (s.office === 'head' && (age - s.officeSince >= 12 || age >= 78)) {
    s.office = null;
    sync(state);
    ctx.log(`You stood down as ${a.head}.`, '✠', 'info');
  }
}

/* ------------------------------------------------------------------ */
/* Alliance admission                                                  */
/* ------------------------------------------------------------------ */

export function allianceCheck(state) {
  const cc = state.character.countryId;
  const a = ALLIANCE[cc];
  if (!a) return { ok: false, reason: 'No Alliance order here' };
  if (state.stJohn) return { ok: false, reason: 'Already a member of an Order of St John' };
  if (!protestant(state)) return { ok: false, reason: 'Protestant Christians only' };
  if (state.character.gender === 'female') return { ok: false, reason: 'A men\'s order (women serve in its sisterhood and charities)' };
  if (state.character.age < 25) return { ok: false, reason: 'From 25' };
  if (a.noble && !nobleBorn(state)) return { ok: false, reason: 'Of noble birth' };
  if (hasFelony(state)) return { ok: false, reason: 'Of good standing (no criminal record)' };
  if (yearlyCount(state, 'stJohn.alliance')) return { ok: false, reason: 'One approach a year' };
  return { ok: true, odds: clamp(0.15 + (nobleBorn(state) ? 0.25 : 0) + Math.min(0.3, eminence(state) / 500) + ({ devout: 0.15, regular: 0.05 }[state.community.faith.attendance] ?? 0), 0.05, 0.8) };
}

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export const StJohnModule = {
  id: 'stJohn',
  order: 61,
  init(state) {
    state.stJohn ??= null;
  },
  onAgeUp(engineCtx) {
    // A side stream, so the Order's affairs don't reshuffle every other roll in the life.
    const { state } = engineCtx;
    if (!state.character.alive) return;
    const rng = new Random(((state.world?.seed ?? 1) * 22695477 + currentYear(state) * 389 + 0x57a) >>> 0);
    const ctx = { ...engineCtx, rng };
    if (state.stJohn && state.stJohn.order !== 'venerable') allianceYear(ctx);
    else venerableYear(ctx);
  },
  actions: {
    /** A gift to the St John Eye Hospital in Jerusalem. */
    give(ctx, amount) {
      const { state } = ctx;
      const sum = Number(amount) || 10000;
      if (yearlyCount(state, 'stJohn.give')) return ctx.toast('Once a year', 'warn');
      if (!ctx.spend(sum, 'Gift to the St John Eye Hospital, Jerusalem')) return ctx.toast('You can\'t afford that gift.', 'warn');
      bumpYearly(state, 'stJohn.give');
      state.flags ??= {};
      state.flags.stJohnGiving = (state.flags.stJohnGiving ?? 0) + sum;
      ctx.stat('happiness', 3);
      return ctx.log(`You made a gift to the St John Eye Hospital Group, which treats patients in Jerusalem, the West Bank and Gaza regardless of who they are.`, '👁️', 'good');
    },
    /** Seek an invitation to your country's Alliance order (Germany, the Netherlands, Sweden). */
    joinAlliance(ctx) {
      const { state, rng } = ctx;
      const check = allianceCheck(state);
      if (!check.ok) return ctx.toast(check.reason, 'warn');
      bumpYearly(state, 'stJohn.alliance');
      const a = ALLIANCE[state.character.countryId];
      if (!rng.chance(check.odds)) return ctx.log(`Your sponsors put your name forward to ${a.name}, but no invitation came this year.`, '✠', 'bad');
      state.stJohn = { order: state.character.countryId, grade: 'honour', since: state.character.age, office: null };
      sync(state);
      ctx.stat('happiness', 5);
      return ctx.log(`You were received into ${a.name} as ${a.grades.honour}, and pledged yourself to ${a.work}.`, '✠', 'honor');
    },
    /** Resign from the Order. */
    resign(ctx) {
      const { state } = ctx;
      const s = state.stJohn;
      if (!s || s.office === 'sovereign' || s.viceRegal) return ctx.toast('Not while you hold that office.', 'warn');
      if (s.office === 'grandPrior') state.world.stJohnGrandPrior = null;
      state.stJohn = null;
      sync(state);
      return ctx.log('You resigned from the Order of St John.', '✠', 'info');
    },
  },
};
