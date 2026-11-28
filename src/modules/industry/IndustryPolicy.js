/**
 * Industrial and economic policy, decided by governments as things happen, not on dates.
 *
 * Every country the model follows has a government with a leaning ('labor' or 'business';
 * a planned economy and a colony decide differently) that changes hands when times are bad
 * or it has been in long enough, once there is mass politics. Each year it looks at its
 * industries and its economy and may pass a law:
 *
 *   tariff            protection when imports are eating the home industries or the world has
 *                     crashed; free trade for the country that leads the world's trade
 *   goldStandard      joined in calm prosperity; left in a crash that will not end
 *   lenderOfLastResort, depositInsurance, bankRegulation
 *                     after a banking panic (and loosened again after a long boom)
 *   ownership_*       a labour government nationalises an industry in trouble, or the natural
 *                     monopolies (railways, power, telephones); a business government sells
 *                     them when they lose money or the money runs short
 *   industrialPolicy  support for industries in trouble (subsidies) or laissez-faire
 *   tradeUnionsLegal  combinations made lawful once enough people work in mines and mills
 *   workplaceSafety, environmental, antitrust
 *                     after disasters, when the smoke gets bad, when a few firms own a market
 *
 * In your own country these are bills in your country's law book (Laws.js), so you can pass or
 * repeal them yourself from a seat in the legislature; while you lead the government the
 * cabinet only advises you. Elsewhere the world keeps its own book.
 */
import { clamp } from '../../core/Random.js';
import { setLawReader, setPolicyStep, rulerAt, INDUSTRIES, INDUSTRY_IDS, IX } from './IndustryEngine.js';
import { SECTORS } from '../world/OwnershipHistory.js';
import { plannedEconomy } from '../world/OwnershipHistory.js';
import { demographyAt, dataRegime } from '../world/HistoricalData.js';
import { levelValue, enact } from '../politics/Laws.js';
import { statuteIn, statuteOverride } from '../politics/StatuteBook.js';

/** Laws the industry model reads and governments here may change, and their reactive defaults. */
export const POLICY_LAWS = { tariff: 'revenue', industrialPolicy: 'laissezFaire', bankRegulation: 'standard', goldStandard: false, lenderOfLastResort: false, depositInsurance: false, tradeUnionsLegal: false, workmensCompensation: false, fortyEightHourWeek: false, holidaysWithPay: false, dockDecasualisation: false, incomeTax: false, sicknessInsurance: false, statePension: false, nationalInsurance: false, workplaceSafety: 'lax', antitrust: 'standard' };
const FLAGS = ['goldStandard', 'lenderOfLastResort', 'depositInsurance', 'tradeUnionsLegal', 'workmensCompensation', 'fortyEightHourWeek', 'holidaysWithPay', 'dockDecasualisation', 'incomeTax', 'sicknessInsurance', 'statePension', 'nationalInsurance'];
export const OWN_SECTORS = Object.keys(SECTORS).filter((s) => ['coal', 'rail', 'power', 'telecom', 'airline', 'banking', 'industry'].includes(s));

/* ---- Reading the law: your country's book, the world's own ---- */
const STATES = new WeakMap();
const where = (cc) => (cc === 'US' ? null : cc);
function readLaw(sim, cc, law) {
  if (sim.world) return law === 'subsidies' ? sim.laws[cc]?.subsidies ?? null : sim.laws[cc]?.[law] ?? POLICY_LAWS[law] ?? null;
  const state = STATES.get(sim);
  if (!state) return POLICY_LAWS[law] ?? null;
  if (law === 'subsidies') return sim.c[cc]?.subsidies ?? null;
  if (law.startsWith('ownership_')) return ownershipValue(sim, cc, law);
  if (FLAGS.includes(law)) return statuteIn(state, law, cc);
  if (law === 'science') return levelValue(state, 'industrialPolicy', 'federal', where(cc)) === 'planning';
  return levelValue(state, law, 'federal', where(cc)) ?? POLICY_LAWS[law] ?? null;
}
setLawReader(readLaw);

/** Write a law: into your country's book (an act of its government), or the world's. */
function pass(sim, cc, law, value, y, why) {
  if (sim.world) { (sim.laws[cc] ??= {})[law] = value; return { kind: 'law', cc, law, value, y, why }; }
  const state = STATES.get(sim);
  enact(state, { level: 'federal', where: where(cc), lawId: law, value, sponsor: 'the government', age: state.character?.age ?? 0 });
  return { kind: 'law', cc, law, value, y, why };
}
const current = (sim, cc, law) => readLaw(sim, cc, law);

/* ---- Who governs ---- */
const income = (cc, y) => (demographyAt(cc, y)?.gdp ?? 2000) / 52591;
/** Mass politics: the vote counts (your country: the secret ballot; elsewhere, a richer society). */
function massPolitics(sim, cc, y) {
  if (sim.world) return income(cc, y) > 0.12;
  const state = STATES.get(sim);
  return statuteIn(state, 'secretBallot', cc) && income(cc, y) > 0.06;
}
/** The governing side in your country's legislature, if the game has one for it. */
function legislatureGov(state, cc) {
  for (const b of Object.values(state.legislature?.bodies ?? {})) if (b.level === 'federal' && (b.where ?? 'US') === cc && b.executive?.caucus) return b.executive.caucus;
  return null;
}
/** Whether you lead the government (then the cabinet only advises). */
const youLead = (state) => /(^|_)(pm|president|premier|chancellor|kanzler|taoiseach|firstMinister)$/i.test(state?.politics?.office?.id ?? '') || state?.politics?.office?.id === 'president';
function governing(sim, cc, y, rng) {
  const c = sim.c[cc];
  const state = sim.world ? null : STATES.get(sim);
  const fromLeg = state ? legislatureGov(state, cc) : null;
  if (fromLeg) { if (fromLeg !== c.gov) { c.gov = fromLeg; c.govYears = 0; } else c.govYears += 1; return c.gov; }
  c.govYears = (c.govYears ?? 0) + 1;
  const bad = (c.crisis ? 0.25 : 0) + Math.max(0, -c.growth) * 3;
  let p = 0.04 + bad + (c.govYears > 10 ? 0.06 : 0);
  // Labour can only win where working people vote.
  if (c.gov === 'business' && !massPolitics(sim, cc, y)) p *= 0.15;
  if (rng.next() < p) { c.gov = c.gov === 'labor' ? 'business' : 'labor'; c.govYears = 0; return { changed: c.gov }; }
  return c.gov;
}

/** How much the people's voice counts: a democracy, a limited franchise, or none. */
function regimeVoice(cc, y) {
  const r = dataRegime(cc, y);
  if (!r) return 'limited';
  if (r.democracy) return 'democracy';
  return ['monolig', 'semimon', 'parl', 'pres'].includes(r.cat) ? 'limited' : 'autocracy';
}
const UNORGANISED = new Set(['farming', 'plantation', 'construction', 'retail', 'tourism', 'banking']);

/* ---- Deciding ---- */
const share = (c, id) => { const t = c.out.reduce((s, v) => s + v, 0); return t > 0 ? c.out[IX[id]] / t : 0; };
const MAKE = INDUSTRY_IDS.filter((id) => INDUSTRIES[id].tradable);
/** How hard imports are biting: big tradable industries that are shrinking. */
const importPressure = (c) => MAKE.reduce((s, id) => s + share(c, id) * Math.max(0, -c.health[IX[id]]), 0);
/** How much of the world's trade the country leads. */
const leadership = (c) => MAKE.reduce((s, id) => s + share(c, id) * (c.share[IX[id]] ?? 0), 0) / Math.max(0.01, MAKE.reduce((s, id) => s + share(c, id), 0));
/** How a sector is doing: its industries' health, weighted by size. */
function sectorHealth(c, sector) {
  let h = 0; let w = 0;
  for (const id of INDUSTRY_IDS) if (INDUSTRIES[id].sector === sector) { const s = share(c, id); h += s * c.health[IX[id]]; w += s; }
  return { h: w ? h / w : 0, w };
}
const LABEL = { tariff: { free: 'free trade', revenue: 'a revenue tariff', protective: 'protective tariffs' }, bankRegulation: { light: 'light-touch banking rules', standard: 'standard banking rules', strict: 'strict banking rules' }, industrialPolicy: { laissezFaire: 'laissez-faire', support: 'state support for industry', planning: 'state planning and science' } };
export const policyLabel = (law, value) => LABEL[law]?.[value] ?? value;

function decide(sim, cc, y, rng, gov) {
  const c = sim.c[cc];
  const out = [];
  if (plannedEconomy(cc, y)) {
    // The plan provides: a state pension, sick pay and social insurance, paid for out of wages.
    if (!c.wasPlanned) for (const law of ['incomeTax', 'sicknessInsurance', 'statePension', 'nationalInsurance']) if (!current(sim, cc, law)) out.push(pass(sim, cc, law, true, y, 'the new order'));
    c.wasPlanned = true;
    return out;
  }
  // Out of a planned economy: the state still owns everything until someone sells it.
  if (c.wasPlanned) {
    c.wasPlanned = false;
    for (const sector of OWN_SECTORS) out.push(pass(sim, cc, `ownership_${sector}`, true, y, 'the end of the planned economy'));
  }
  if (rulerAt(cc, y)) {
    // A colony's economic laws are made by its masters: a revenue tax for the administration,
    // and in time a compensation ordinance for the mines and railways.
    const roll = (p) => rng.next() < p;
    c.colonialSince ??= y;
    if (!current(sim, cc, 'incomeTax') && income(cc, y) > 0.015 && roll(0.012)) out.push(pass(sim, cc, 'incomeTax', true, y, 'the colonial treasury'));
    if (!current(sim, cc, 'workmensCompensation') && income(cc, y) > 0.02 && y > c.colonialSince + 30 && roll(0.015)) out.push(pass(sim, cc, 'workmensCompensation', true, y, 'an ordinance from the colonial office'));
    return out;
  }
  const labor = gov === 'labor';
  const mass = massPolitics(sim, cc, y);
  const crisis = c.crisis;
  const fresh = crisis && crisis.year === y;
  const roll = (p) => rng.next() < p;
  // A law just changed is not changed back for a while (no joining and leaving gold every other year).
  c.changed ??= {};
  const set = (law, value, why) => {
    if (current(sim, cc, law) === value || y - (c.changed[law] ?? -99) < 10) return;
    c.changed[law] = y;
    out.push(pass(sim, cc, law, value, y, why));
  };

  // Tariffs.
  const tariff = current(sim, cc, 'tariff');
  const press = importPressure(c);
  const lead = leadership(c);
  // Industrialists' lobbying counts (Concerns.js): a dinner with ministers is worth something.
  const lobbied = c.lobby && y - c.lobby.year <= 1;
  if (tariff !== 'protective' && ((fresh && crisis.cause !== 'oil' && roll(0.35)) || (press > 0.08 && roll(0.2)) || (lobbied && gov === 'business' && roll(0.25)))) set('tariff', 'protective', fresh ? 'the crash' : lobbied ? 'the manufacturers\' lobby' : 'the flood of cheap imports');
  else if (tariff !== 'free' && !crisis && lead > 0.12 && roll(gov === 'business' ? 0.15 : 0.08)) set('tariff', 'free', 'its lead in the world\'s trade');
  else if (tariff === 'protective' && !crisis && press < 0.02 && c.growth > 0.02 && roll(0.06)) set('tariff', 'revenue', 'a run of good years');

  // Money and banks.
  const gold = current(sim, cc, 'goldStandard');
  if (!gold && !crisis && c.growth > 0 && income(cc, y) > 0.06 && roll(gov === 'business' ? 0.06 : 0.02)) set('goldStandard', true, 'the call for sound money');
  else if (gold && crisis && crisis.cause !== 'industry' && y - crisis.year >= 1 && roll(0.4)) set('goldStandard', false, 'a crash that would not end');
  if (fresh && crisis.cause === 'financial') {
    if (!current(sim, cc, 'lenderOfLastResort') && roll(0.45)) set('lenderOfLastResort', true, 'the panic');
    if (!current(sim, cc, 'depositInsurance') && mass && roll(labor ? 0.45 : 0.2)) set('depositInsurance', true, 'the bank runs');
    if (current(sim, cc, 'bankRegulation') !== 'strict' && roll(labor ? 0.5 : 0.25)) set('bankRegulation', 'strict', 'the banking crisis');
  } else if (!crisis && (c.calm ?? 0) >= 12 && gov === 'business' && current(sim, cc, 'bankRegulation') !== 'light' && roll(0.1)) set('bankRegulation', 'light', 'a long boom');
  c.calm = crisis ? 0 : (c.calm ?? 0) + 1;

  // Industrial policy and subsidies.
  const ip = current(sim, cc, 'industrialPolicy');
  if (ip === 'laissezFaire' && ((labor && press > 0.05) || (crisis?.cause === 'industry') || (lobbied && roll(0.4))) && roll(0.25)) set('industrialPolicy', 'support', lobbied ? 'the industry\'s lobbying' : 'industries in trouble');
  // The trusts: a labour government goes after cartels; a long business government relaxes.
  const at = current(sim, cc, 'antitrust');
  if ((c.cartels ?? 0) > 0 && labor && at !== 'aggressive' && roll(0.15)) set('antitrust', 'aggressive', 'the trusts and cartels');
  else if (at === 'aggressive' && gov === 'business' && (c.calm ?? 0) > 8 && roll(0.06)) set('antitrust', 'standard', 'the case for big business');
  else if (ip !== 'laissezFaire' && gov === 'business' && !crisis && (c.calm ?? 0) > 6 && roll(0.08)) set('industrialPolicy', 'laissezFaire', 'the call to leave industry to the market');
  const support = current(sim, cc, 'industrialPolicy') !== 'laissezFaire';
  const subs = {};
  if (support) for (const id of MAKE.filter((i) => c.health[IX[i]] < -0.15).sort((p, q) => share(c, q) - share(c, p)).slice(0, 3)) subs[id] = true;
  if (sim.world) (sim.laws[cc] ??= {}).subsidies = subs; else c.subsidies = subs;

  // Combinations: unions made lawful once mines and mills employ enough people and they vote.
  // Organised labour: the mines, mills, works, docks and railways (not the fields or the shops).
  const organised = INDUSTRY_IDS.filter((id) => !UNORGANISED.has(id)).reduce((s, id) => s + share(c, id) * INDUSTRIES[id].union, 0);
  const voice = regimeVoice(cc, y);
  if (!current(sim, cc, 'tradeUnionsLegal') && organised > 0.12 && voice !== 'autocracy' && (mass ? roll(labor ? 0.3 : 0.08) : roll(0.012))) set('tradeUnionsLegal', true, 'the unions\' long campaign');

  // Labour law: what organised workers win from a government that needs their votes.
  const unions = current(sim, cc, 'tradeUnionsLegal');
  const hazard = INDUSTRY_IDS.reduce((s, id) => s + share(c, id) * INDUSTRIES[id].hazard, 0);
  // Disasters: the more dangerous the work and the laxer the rules, the more often; fewer as
  // the country gets richer (better gear, ventilation, inspectors).
  const safety = current(sim, cc, 'workplaceSafety') ?? 'lax';
  const sf = { lax: 1.3, standard: 0.6, strict: 0.35 }[safety] ?? 1;
  if (roll(hazard * 0.35 * sf * (1 - 0.6 * clamp(income(cc, y), 0, 1)))) {
    const pool = INDUSTRY_IDS.filter((id) => INDUSTRIES[id].hazard >= 0.5 && share(c, id) > 0.005);
    const total = pool.reduce((s, id) => s + share(c, id) * INDUSTRIES[id].hazard, 0);
    let x = rng.next() * total;
    const id = pool.find((i) => (x -= share(c, i) * INDUSTRIES[i].hazard) <= 0) ?? pool[0];
    if (id) { c.disasters = [...(c.disasters ?? []).slice(-4), y]; out.push({ kind: 'disaster', cc, y, industry: id }); }
  }
  const disaster = (c.disasters ?? []).some((d) => y - d <= 1);
  if (disaster && safety === 'lax' && mass && roll(0.4)) set('workplaceSafety', 'standard', 'the disaster');
  else if (disaster && safety === 'standard' && labor && roll(0.2)) set('workplaceSafety', 'strict', 'another disaster');
  // And loosened again when memories fade: a business government, fifteen quiet years.
  else if (safety === 'strict' && gov === 'business' && !(c.disasters ?? []).some((d) => y - d < 15) && roll(0.08)) set('workplaceSafety', 'standard', 'the burden of red tape');
  if (!current(sim, cc, 'workmensCompensation') && mass && (disaster ? roll(0.5) : unions && hazard > 0.1 && roll(labor ? 0.15 : 0.04))) set('workmensCompensation', true, disaster ? 'the disaster' : 'the toll of accidents at work');
  if (!current(sim, cc, 'fortyEightHourWeek') && mass && unions && income(cc, y) > 0.08 && roll(labor ? 0.1 : 0.02)) set('fortyEightHourWeek', true, 'the campaign for shorter hours');
  if (!current(sim, cc, 'holidaysWithPay') && mass && unions && current(sim, cc, 'fortyEightHourWeek') && income(cc, y) > 0.12 && roll(labor ? 0.08 : 0.02)) set('holidaysWithPay', true, 'the unions\' demand for a week by the sea');
  if (!current(sim, cc, 'dockDecasualisation') && mass && unions && share(c, 'shipping') > 0.008 && roll(labor ? 0.06 : 0.01)) set('dockDecasualisation', true, 'the dockers\' strikes against the call-on');

  // The state's purse and the welfare it pays for. Income tax when customs no longer pay the
  // bills (free trade, a crisis) or a richer state wants more; sickness insurance to take the wind
  // out of organised labour's sails (either side passes it); pensions and then the welfare state
  // once organised labour has had time to grow and working people vote, sooner after a slump.
  const rich = income(cc, y);
  const unionYears = unions ? y - (c.changed.tradeUnionsLegal ?? 1800) : 0;
  if (!current(sim, cc, 'incomeTax') && rich > 0.03 && roll(tariff === 'free' ? 0.08 : crisis ? 0.02 : mass && labor ? 0.03 : 0.004)) set('incomeTax', true, tariff === 'free' ? 'the revenue lost with the tariff' : crisis ? 'a state short of money' : 'the cost of government');
  if (!current(sim, cc, 'sicknessInsurance') && organised > 0.12 && rich > 0.07 && voice !== 'autocracy' && roll(labor ? 0.05 : 0.025)) set('sicknessInsurance', true, labor ? 'the unions\' friendly societies made national' : 'the need to take the wind out of the socialists\' sails');
  if (!current(sim, cc, 'statePension') && rich > 0.09 && organised > 0.1 && unionYears > 10 && roll(mass ? (labor ? 0.06 : 0.015) : 0.005)) set('statePension', true, 'old age without the workhouse');
  if (!current(sim, cc, 'nationalInsurance') && mass && current(sim, cc, 'statePension') && unionYears > 20 && rich > 0.14 && roll((labor ? 0.06 : 0.008) * (crisis ? 3 : 1))) set('nationalInsurance', true, crisis ? 'the slump and the dole queues' : 'cradle to grave');
  else if (current(sim, cc, 'nationalInsurance') && gov === 'business' && crisis && c.growth < -0.03 && roll(0.01)) set('nationalInsurance', false, 'a state that cannot pay');

  // Nationalisation and privatisation.
  if (mass) for (const sector of OWN_SECTORS) {
    const id = `ownership_${sector}`;
    const owned = current(sim, cc, id);
    const { h, w } = sectorHealth(c, sector);
    if (w < 0.005) continue;
    const monopoly = ['rail', 'power', 'telecom'].includes(sector) && income(cc, y) > 0.15;
    if (!owned && labor && (h < -0.2 || monopoly || (crisis && sector === 'banking' && crisis.cause === 'financial')) && roll(0.08)) set(id, true, h < -0.2 ? 'an industry in trouble' : 'the case for running a monopoly in public hands');
    else if (owned && gov === 'business' && (h < -0.15 || c.growth < 0 || (c.calm ?? 0) > 8) && roll(0.07)) set(id, false, 'the call to sell it to private owners');
  }
  return out;
}
/** Ownership laws are only this world's when the model sets them: written when a law is read first. */
function ownershipValue(sim, cc, id, y) {
  if (sim.world) return sim.laws[cc]?.[id] ?? false;
  const state = STATES.get(sim);
  const o = statuteOverride(state, id, cc);
  return o === undefined || o === null ? false : Boolean(o);
}

/** The policy year for a simulation (the world, or your country inside the life). */
function step(sim, y, rng, state) {
  if (state) STATES.set(sim, state);
  // A life on history's dates: its laws follow history; the model only reads them.
  if (state && (state.industry?.mode ?? 'emergent') !== 'emergent') return [];
  const out = [];
  for (const cc of Object.keys(sim.c)) {
    if (!demographyAt(cc, y)) continue;
    const g = governing(sim, cc, y, rng);
    const gov = typeof g === 'object' ? g.changed : g;
    if (typeof g === 'object') out.push({ kind: 'government', cc, y, gov });
    if (state && youLead(state) && cc === (state.character?.countryId ?? 'US')) {
      // You lead: your cabinet advises, you decide (from the law book).
      const advice = decide({ ...sim, c: { [cc]: { ...sim.c[cc] } }, world: true, laws: { [cc]: snapshot(sim, cc) } }, cc, y, rng, gov);
      for (const a of advice) out.push({ ...a, kind: 'advice' });
      continue;
    }
    for (const e of decide(sim, cc, y, rng, gov)) out.push(e);
  }
  return out;
}
/** Your country's policy laws as values (for advice computed without passing them). */
function snapshot(sim, cc) {
  const s = {};
  for (const law of Object.keys(POLICY_LAWS)) s[law] = readLaw(sim, cc, law);
  for (const sector of OWN_SECTORS) s[`ownership_${sector}`] = ownershipValue(sim, cc, `ownership_${sector}`);
  return s;
}
setPolicyStep(step);

/**
 * At the start of a life: write the model's laws into your country's book where history's
 * dates would otherwise speak (ownership, the gold standard, deposit insurance...).
 */
export function settleBook(state, cc, y) {
  if (plannedEconomy(cc, y) || rulerAt(cc, y)) return;
  const sim = state.industry;
  STATES.set(sim, state);
  for (const law of FLAGS) if (statuteOverride(state, law, cc) == null) pass(sim, cc, law, POLICY_LAWS[law], y, 'settled');
}
export const bindState = (state) => { if (state?.industry) STATES.set(state.industry, state); };
export { clamp };
