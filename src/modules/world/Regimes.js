/**
 * How a country is governed decides what its people may do. Most countries are open
 * societies; some are not, and their rules reach into every part of a life:
 *
 *   elections   'free' | 'controlled' (a ruling party always wins) | 'sham' (one list, 99%)
 *               | 'none' (an absolute monarchy, a junta, a theocracy)
 *   exit        'free' | 'restricted' (exit permits, travel bans for the suspect) | 'closed'
 *               (leaving without permission is a crime: defection is the only way out)
 *   business    'free' | 'restricted' (licences go to the connected) | 'state' (private
 *               enterprise is illegal; only the grey markets trade)
 *   religion    'free' | 'state' (a state faith; apostasy and proselytising are crimes)
 *               | 'restricted' (registered congregations only) | 'banned'
 *   internet    'open' | 'censored' | 'none'
 *   surveillance  the yearly risk that anything said or done against the state is reported
 *   women       'equal' | 'restricted' (dress codes, guardianship, some jobs closed)
 *               | 'barred' (no school past twelve, no university, most work closed)
 *   alcohol     false: prohibited
 *   banking     'open' | 'domestic' (cut off from Visa, Mastercard and SWIFT) | 'state'
 *               (no consumer credit; savings under the mattress, loans from moneylenders)
 *   jobs        'market' | 'assigned' (the state assigns your workplace)
 *   ratings     false: no international credit rating (nobody lends to it)
 *   songbun     North Korea's hereditary caste: core, wavering or hostile
 *
 * Sanctions sit on top: who imposes them, and how hard they bite (1 targeted, 2 broad,
 * 3 comprehensive). They cut off cards and foreign banking, empty the shops, keep
 * nationals out of other countries, and freeze the foreign assets of the regime's
 * senior people.
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly, criminalRecord } from '../../core/State.js';
import { COUNTRIES, FOREIGN_CITIES } from './Countries.js';
import { OFFICES } from '../politics/Offices.js';
import { getProfession } from '../career/JobTrees.js';
import { createEmployer } from '../career/Employers.js';
import { hire, bestEntryLevel } from '../career/CareerEngine.js';
import { arrive } from './Migration.js';

const R = (o) => ({ kind: 'democracy', elections: 'free', press: 'free', exit: 'free', business: 'free', religion: 'free', internet: 'open', surveillance: 0.02, women: 'equal', alcohol: true, banking: 'open', jobs: 'market', ratings: true, ...o });
const AUTOCRACY = { press: 'state', internet: 'censored', surveillance: 0.15 };
const GULF = { kind: 'absoluteMonarchy', elections: 'none', religion: 'state', ...AUTOCRACY, surveillance: 0.12 };
const JUNTA = { kind: 'junta', elections: 'none', ...AUTOCRACY, surveillance: 0.2, coups: true };
const FRAGILE = { kind: 'fragile', ratings: false, banking: 'domestic' };

export const REGIMES = {
  KP: R({ kind: 'totalitarian', name: 'a totalitarian one-party state', elections: 'sham', press: 'state', exit: 'closed', business: 'state', religion: 'banned', internet: 'none', surveillance: 0.45, banking: 'state', jobs: 'assigned', ratings: false, songbun: true, foreignMedia: true, party: true, leader: 'the Supreme Leader' }),
  CN: R({ kind: 'oneParty', name: 'a one-party state', elections: 'none', ...AUTOCRACY, religion: 'restricted', surveillance: 0.12, party: true, leader: 'the General Secretary' }),
  VN: R({ kind: 'oneParty', name: 'a one-party state', elections: 'controlled', ...AUTOCRACY, religion: 'restricted', surveillance: 0.1, party: true, leader: 'the General Secretary' }),
  IR: R({ kind: 'theocracy', name: 'an Islamic republic', elections: 'controlled', ...AUTOCRACY, religion: 'state', women: 'restricted', alcohol: false, banking: 'domestic', ratings: false, surveillance: 0.2, exit: 'restricted', leader: 'the Supreme Leader' }),
  AF: R({ kind: 'theocracy', name: 'the Taliban\'s Islamic Emirate', elections: 'none', ...AUTOCRACY, religion: 'state', women: 'barred', alcohol: false, banking: 'domestic', ratings: false, surveillance: 0.25, internet: 'censored', leader: 'the Supreme Leader (Amir al-Mu\'minin)' }),
  SA: R({ ...GULF, name: 'an absolute monarchy', women: 'restricted', alcohol: false, leader: 'the King' }),
  KW: R({ ...GULF, name: 'an emirate with an elected assembly', elections: 'controlled', alcohol: false, leader: 'the Emir' }),
  QA: R({ ...GULF, name: 'an absolute monarchy (emirate)', alcohol: true, leader: 'the Emir' }),
  AE: R({ ...GULF, name: 'a federation of absolute monarchies', alcohol: true, leader: 'the President of the UAE' }),
  BH: R({ ...GULF, name: 'a monarchy with a weak parliament', elections: 'controlled', alcohol: true, leader: 'the King' }),
  BN: R({ ...GULF, name: 'an absolute monarchy (sultanate)', alcohol: false, leader: 'the Sultan' }),
  RU: R({ kind: 'authoritarian', name: 'an authoritarian presidential state', elections: 'controlled', ...AUTOCRACY, surveillance: 0.18, banking: 'domestic', ratings: false, exit: 'restricted', leader: 'the President' }),
  SY: R({ kind: 'transitional', name: 'a transitional government after civil war', elections: 'none', ...AUTOCRACY, banking: 'domestic', ratings: false, surveillance: 0.1 }),
  VE: R({ kind: 'authoritarian', name: 'an authoritarian state', elections: 'controlled', ...AUTOCRACY, banking: 'domestic', ratings: false, surveillance: 0.12, leader: 'the President' }),
  MM: R({ ...JUNTA, name: 'a military junta', banking: 'domestic', ratings: false, leader: 'the Commander-in-Chief' }),
  ML: R({ ...JUNTA, name: 'a military junta', leader: 'the transitional President (a colonel)' }),
  NE: R({ ...JUNTA, name: 'a military junta', leader: 'the head of the CNSP' }),
  SD: R({ ...JUNTA, name: 'a military government at war', ...FRAGILE, coups: true }),
  TD: R({ kind: 'authoritarian', name: 'a military-led presidency', elections: 'controlled', ...AUTOCRACY }),
  GW: R({ ...JUNTA, name: 'a military-led transition' }),
  EG: R({ kind: 'authoritarian', name: 'an authoritarian presidency', elections: 'controlled', ...AUTOCRACY, surveillance: 0.12 }),
  TR: R({ kind: 'hybrid', name: 'a competitive authoritarian presidency', elections: 'controlled', press: 'state', internet: 'censored', surveillance: 0.06 }),
  PK: R({ kind: 'hybrid', name: 'a hybrid regime (the army behind the scenes)', elections: 'controlled', press: 'state', surveillance: 0.06, coups: true }),
  ET: R({ kind: 'hybrid', name: 'a dominant-party state', elections: 'controlled', press: 'state', internet: 'censored', surveillance: 0.08 }),
  KH: R({ kind: 'hybrid', name: 'a dominant-party state', elections: 'controlled', ...AUTOCRACY }),
  SO: R({ ...FRAGILE, name: 'a fragile federal state', surveillance: 0.02 }),
  SS: R({ ...FRAGILE, name: 'a fragile state', elections: 'none' }),
  YE: R({ ...FRAGILE, name: 'a country divided by civil war', elections: 'none', alcohol: false }),
  LY: R({ ...FRAGILE, name: 'a country split between rival governments', elections: 'none', alcohol: false }),
  HT: R({ ...FRAGILE, name: 'a state without elected leaders, run by a transitional council', elections: 'none' }),
  CD: R({ ...FRAGILE, name: 'a fragile presidential state' }),
  CF: R({ ...FRAGILE, name: 'a fragile presidential state' }),
  PS: R({ ...FRAGILE, name: 'a territory under occupation and divided rule', elections: 'none', exit: 'restricted' }),
};
export const regimeOf = (cc) => REGIMES[cc] ?? R({});
export const regimeHere = (state) => regimeOf(state.character.countryId ?? 'US');
export const isOpenSociety = (cc) => ['democracy'].includes(regimeOf(cc).kind);

/** Sanctions in force: who imposes them, and how hard (1 targeted, 2 broad, 3 comprehensive). */
export const SANCTIONS = {
  KP: { by: 'the UN Security Council, the US, the EU and others', level: 3, note: 'A near-total embargo: no exports, no foreign banking, no flights beyond Beijing and Vladivostok.' },
  IR: { by: 'the US (with EU and UN measures)', level: 2, note: 'Oil and banking sanctions: no Visa or Mastercard, the rial collapses, foreign firms stay away.' },
  RU: { by: 'the US, the EU, the UK, Japan and their allies', level: 2, note: 'Since 2022: Western cards and SWIFT cut off, flights to Europe and North America banned, assets frozen.' },
  SY: { by: 'the US and the EU (being eased)', level: 2, note: 'Years of banking and trade sanctions, now slowly lifting.' },
  VE: { by: 'the US', level: 1, note: 'Oil and financial sanctions on the government and its companies.' },
  MM: { by: 'the US, the EU and the UK', level: 1, note: 'Targeted sanctions on the junta, its banks and its businesses.' },
  AF: { by: 'the UN (on Taliban leaders)', level: 1, note: 'Taliban leaders are sanctioned; the central bank\'s reserves are frozen abroad.' },
  SD: { by: 'the US and the UN', level: 1, note: 'An arms embargo and sanctions on both warring generals.' },
};
export const sanctionsOn = (cc) => SANCTIONS[cc] ?? null;

/* ------------------------------------------------------------------ */
/* Rules other modules ask about                                       */
/* ------------------------------------------------------------------ */

/** Can you leave? Null if yes; otherwise why not. */
export function exitBlock(state) {
  const r = regimeHere(state);
  if (r.exit === 'closed') return `${COUNTRIES[state.character.countryId]?.name ?? 'The state'} doesn't let its citizens leave. Defecting is the only way out`;
  if (r.exit === 'restricted' && state.regime?.travelBan) return 'You are under a travel ban';
  return null;
}
/** Private business allowed? */
export const businessBlock = (state) => (regimeHere(state).business === 'state' ? 'Private enterprise is illegal here — the markets (jangmadang) are as far as it goes' : null);
/** Consumer credit allowed? */
export const creditBlock = (state) => (regimeHere(state).banking === 'state' ? 'No consumer credit exists here' : null);
/** Work closed to women. */
const WOMEN_OK = ['medical', 'nursing', 'education', 'publicHealth', 'caregiving', 'childcare', 'midwifery', 'pharmacy', 'dentistry', 'agriculture'];
export function workBlock(state, profession) {
  const r = regimeHere(state);
  if (r.women === 'barred' && state.character.gender === 'female' && !WOMEN_OK.includes(profession.id)) return 'Women are barred from this work here';
  return null;
}
/** Study closed. */
export function studyBlock(state, uniCountry) {
  const r = regimeHere(state);
  const home = state.character.countryId ?? 'US';
  if (r.women === 'barred' && state.character.gender === 'female') return 'Women are barred from universities here';
  if (uniCountry && uniCountry !== home && r.exit === 'closed') return 'Citizens may not study abroad without the state\'s selection';
  if (r.songbun && state.regime?.songbun === 'hostile' && uniCountry === home) return 'Your songbun (family background) bars you from university';
  return null;
}
/** Elections where you live: run normally, as a one-list ritual, or not at all. */
export const electionsHere = (state) => regimeHere(state).elections;
/** What debt is called where there are no cards. */
export const debtWord = (state) => (regimeHere(state).banking === 'state' ? 'to market moneylenders (donju)' : 'on credit cards');

/* ------------------------------------------------------------------ */
/* The year under a regime                                             */
/* ------------------------------------------------------------------ */

const SONGBUN = [['core', 25], ['wavering', 55], ['hostile', 20]];
const ASSIGNED = ['manufacturing', 'agriculture', 'trades', 'logistics', 'retail'];

function ensure(state) {
  state.regime ??= { songbun: null, dissent: 0, reported: 0, sanctioned: null, travelBan: false };
  return state.regime;
}

/** The state assigns you a workplace (North Korea): nobody is unemployed on paper. */
function assignJob(ctx) {
  const { state, rng } = ctx;
  const prof = getProfession(rng.pick(ASSIGNED));
  const employer = createEmployer(rng, state, prof, state.character.regionId);
  // Everything belongs to the state: a numbered enterprise, a cooperative farm.
  const city = FOREIGN_CITIES[state.character.regionId]?.name ?? COUNTRIES[state.character.countryId]?.capital ?? '';
  const KIND = { manufacturing: 'Machine Works', agriculture: 'Cooperative Farm', trades: 'Construction Enterprise', logistics: 'Transport Enterprise', retail: 'State Store' };
  employer.name = `${city} No. ${rng.int(1, 12)} ${KIND[prof.id] ?? 'State Enterprise'}`;
  const level = bestEntryLevel(state, prof, employer.size) ?? prof.levels[0];
  hire(ctx, { professionId: prof.id, levelId: level.id, employer });
  ctx.log(`The local labour administration assigned you to work at ${employer.name}. Workplaces are allocated, not chosen.`, '🏭', 'info');
}

function regimeYear(ctx) {
  const { state, rng } = ctx;
  const cc = state.character.countryId ?? 'US';
  const r = regimeOf(cc);
  const g = ensure(state);
  const age = state.character.age;
  // Songbun: assigned at birth, by the family's loyalty since the 1950s.
  if (r.songbun && !g.songbun) g.songbun = rng.weighted(SONGBUN, ([, w]) => w)[0];
  if (!state.character.alive || state.legal.incarceration) return;
  // Assigned work: the unemployed adult is given a workplace.
  if (r.jobs === 'assigned' && age >= 18 && age < 60 && !state.career.job && !state.education.enrolled && !state.military.service && !state.retirement?.retired && !state.politics?.office?.fullTime && !(state.cpc?.rank > 0 && !state.cpc.retiredFrom)) {
    assignJob(ctx);
  }
  // Women barred from school past twelve (the Taliban's edict).
  if (r.women === 'barred' && state.character.gender === 'female' && age >= 12 && state.k12 && !state.k12.dropout && !state.k12.graduated) {
    state.k12.dropout = true;
    ctx.log('Girls\' schooling ends at twelve here: the secondary schools are closed to you.', '🏫', 'bad');
  }
  // Worship where it is banned or tightly controlled.
  const faith = state.community?.faith?.traditionId;
  if (faith && r.religion === 'banned' && rng.chance(Math.min(0.5, r.surveillance))) {
    ctx.log('An informer reported your secret prayers.', '👁️', 'bad');
    ctx.emit('legal:offense', { offenseId: 'illegalWorship', context: 'underground worship', caught: true, evidence: 0.95 });
    return;
  }
  // Watching foreign films (smuggled USB sticks): common, and dangerous.
  if (r.foreignMedia && age >= 14 && g.foreignMedia && rng.chance(r.surveillance * 0.3)) {
    ctx.log('A "109 Group" inspection found South Korean dramas on your USB stick.', '💾', 'bad');
    ctx.emit('legal:offense', { offenseId: 'foreignMedia', context: 'reactionary thought and culture', caught: true, evidence: 0.95 });
    return;
  }
  // Sanctions bite: empty shelves, a collapsing currency.
  const s = sanctionsOn(cc);
  if (s && rng.chance(0.15 * s.level)) ctx.log(rng.pick([`Sanctions: imported medicine was nowhere to be found this year.`, `Sanctions: the currency fell again, and prices with it.`, `Sanctions: foreign firms left; their offices stand empty.`, `Sanctions: spare parts for anything foreign-made are impossible to get.`]), '🚫', 'warn');
  if (s) ctx.spend(Math.round(500 * s.level), 'Sanctions: shortages and black-market prices', { allowDebt: true });
  // Senior figures of a sanctioned regime are sanctioned personally.
  if (s && !g.sanctioned && seniorFigure(state)) {
    g.sanctioned = { by: s.by, since: age, travelBan: s.level >= 2 };
    ctx.log(`You were added to the sanctions lists of ${s.by}: your assets abroad are frozen${s.level >= 2 ? ' and you may not travel there' : ''}.`, '🚫', 'bad');
  }
  // Juntas: senior officers are courted for, or forced into, a coup.
  if (r.coups && state.military?.service?.track === 'officer' && state.military.service.grade >= 7 && rng.chance(0.04) && !state.prompts.some((p) => p.type === 'regime.coup')) {
    ctx.prompt({
      type: 'regime.coup', icon: '🪖', title: 'A Knock at Night',
      text: 'Fellow generals are planning to seize power. They want you with them — or out of the way.',
      options: [{ id: 'join', label: '🪖 Join the coup', tone: 'danger' }, { id: 'refuse', label: '🙅 Refuse and stay loyal' }, { id: 'report', label: '📞 Warn the government' }],
    });
  }
}

const seniorFigure = (state) => {
  const o = state.politics?.office;
  if (o && (OFFICES[o.id]?.level ?? 0) >= 4) return true;
  if ((state.cpc?.rank ?? 0) >= 5) return true;
  const svc = state.military?.service;
  return Boolean(svc?.track === 'officer' && svc.grade >= 7);
};

export const RegimesModule = {
  id: 'regime',
  order: 61,
  init(state) {
    ensure(state);
  },
  onAgeUp(ctx) {
    regimeYear(ctx);
  },
  actions: {
    /** Speak against the government: free speech at home, a crime in a dictatorship. */
    speakOut(ctx) {
      const { state, rng } = ctx;
      const r = regimeHere(state);
      const g = ensure(state);
      if (state.character.age < 16) return ctx.toast('From 16', 'warn');
      if (yearlyCount(state, 'regime.speakOut')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'regime.speakOut');
      g.dissent += 1;
      if (r.press === 'free') {
        state.politics.recognition = (state.politics.recognition ?? 0) + 5;
        return ctx.log('You spoke out against the government. Some agreed, some didn\'t; nobody came for you.', '📢', 'info');
      }
      if (rng.chance(clamp(r.surveillance * (1 + g.dissent * 0.4), 0.05, 0.9))) {
        ctx.log('Plain-clothes officers came for you before dawn.', '👁️', 'bad');
        ctx.emit('legal:offense', { offenseId: 'antiState', context: 'criticising the government', caught: true, evidence: 0.95 });
        return undefined;
      }
      ctx.stat('happiness', 3);
      return ctx.log('You spoke out — carefully, among people you trust. Word spread. So did the risk.', '📢', 'warn');
    },
    /** Trade in the markets (jangmadang): the real economy where the state's is broken. */
    trade(ctx) {
      const { state, rng } = ctx;
      const r = regimeHere(state);
      if (r.business !== 'state') return ctx.toast('Here you can simply start a business', 'warn');
      if (state.character.age < 16) return ctx.toast('From 16', 'warn');
      if (yearlyCount(state, 'regime.trade')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'regime.trade');
      if (rng.chance(0.08)) {
        ctx.spend(300, 'Bribes to a market inspector', { allowDebt: true });
        return ctx.log('An inspector seized your goods. A bribe kept you out of the labour camp.', '🧺', 'bad');
      }
      const take = rng.int(400, 2500);
      ctx.earn(take, 'Market trading (jangmadang)', { informal: true });
      return ctx.log(`You traded rice, Chinese goods and phone cards at the market: $${take.toLocaleString()} — far more than your state wage.`, '🧺', 'good');
    },
    /** Watch smuggled foreign films (North Korea). */
    foreignMedia(ctx) {
      const g = ensure(ctx.state);
      g.foreignMedia = !g.foreignMedia;
      ctx.stat('happiness', g.foreignMedia ? 4 : 0);
      return ctx.log(g.foreignMedia ? 'You started watching smuggled South Korean dramas at night, curtains drawn.' : 'You got rid of the USB sticks.', '💾', g.foreignMedia ? 'warn' : 'info');
    },
    /** Defect: across the Tumen river into China, then the long road to Seoul. */
    defect(ctx) {
      const { state, rng } = ctx;
      const r = regimeHere(state);
      if (r.exit !== 'closed') return ctx.toast('You can simply leave', 'warn');
      if (state.character.age < 16) return ctx.toast('Too young to make the journey', 'warn');
      ctx.prompt({
        type: 'regime.defect', icon: '🌊', title: 'Crossing the River',
        text: 'A broker can get you across the Tumen into China, then down through Laos or Thailand to a South Korean embassy. If the border guards or the Chinese police catch you, you\'ll be sent back to a prison camp — and your family will suffer.',
        options: [{ id: 'broker', label: '💵 Pay a broker ($8,000)', hint: 'Better odds' }, { id: 'alone', label: '🏃 Go alone at night', tone: 'danger' }, { id: 'stay', label: '🏠 Not now' }],
      });
      return undefined;
    },
  },
  resolvers: {
    defect(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'stay') return undefined;
      if (optionId === 'broker' && !ctx.spend(8000, 'Defection broker', { allowDebt: true })) return undefined;
      const odds = optionId === 'broker' ? 0.65 : 0.3;
      if (!rng.chance(odds)) {
        ctx.log('You were caught and handed back across the border.', '⛓️', 'bad');
        ctx.emit('legal:offense', { offenseId: 'illegalBorder', context: 'attempted defection', caught: true, evidence: 0.99 });
        return undefined;
      }
      state.character.citizenships = [...new Set([...(state.character.citizenships ?? [state.character.countryId]), 'KR'])];
      arrive(ctx, 'KR', { visa: null, reason: 'After months in hiding you reached a South Korean consulate. You were flown to Seoul.' });
      ctx.earn(20000, 'Resettlement grant (Hanawon)');
      ctx.stat('happiness', 15);
      ctx.log('South Korea recognises you as a citizen. Three months at Hanawon taught you how to use a bank card, a subway map and a smartphone.', '🇰🇷', 'milestone');
      return undefined;
    },
    coup(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'refuse') return ctx.log('You refused. The plotters went ahead without you.', '🪖', 'info');
      if (optionId === 'report') {
        if (rng.chance(0.6)) { ctx.stat('happiness', 3); return ctx.log('The plot collapsed; the government thanked you.', '🪖', 'good'); }
        return ctx.log('The coup succeeded anyway. The new junta knows what you did.', '🪖', 'bad');
      }
      if (!rng.chance(0.55)) {
        ctx.log('The coup failed. You were arrested.', '⛓️', 'bad');
        ctx.emit('legal:offense', { offenseId: 'antiState', context: 'a failed coup', caught: true, evidence: 0.99 });
        return undefined;
      }
      const g = ensure(state);
      g.junta = { since: state.character.age };
      state.military.service.grade = Math.min(9, state.military.service.grade + 1);
      ctx.stat('happiness', 10);
      return ctx.log('The coup succeeded. State television announced a "transitional council" — with you on it. You were promoted.', '🪖', 'milestone');
    },
  },
};

/** For the Move tab: what life is like under this government. */
export function regimeSummary(state) {
  const cc = state.character.countryId ?? 'US';
  const r = regimeOf(cc);
  const s = sanctionsOn(cc);
  return { r, s, criminal: criminalRecord(state).length };
}
