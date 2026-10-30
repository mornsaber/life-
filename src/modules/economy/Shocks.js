/**
 * Why the economy turned, and who feels it.
 *
 * Every recession has a cause, and causes pick their victims:
 *   financial   a banking crisis: finance and real estate lay off first; house prices crash
 *   housing     a housing bust: builders, trades, estate agents, mortgage brokers
 *   oil         an energy shock: inflation spikes; airlines, trucking and manufacturing suffer
 *   tech        a tech bust: software, data, design, games, startups
 *   pandemic    a pandemic: restaurants, hotels, retail, airlines and the arts shut down;
 *               hospitals are overwhelmed; the PHS deploys (military/ActiveDuty.js)
 * Inflation above 5% eats savings in real terms, and the year's log says how much.
 *
 * state.economy.cause = { id, since }   state.world.pandemic = { active, since, name }
 */
import { Random } from '../../core/Random.js';
import { REGIONS, regionsHere } from '../life/Regions.js';

export const CAUSES = {
  financial: { label: 'a banking crisis', icon: '🏦', text: 'Banks that bet on bad loans are failing; credit has frozen.', sectors: { finance: 2.5, realestate: 2, insurance: 1.6, accounting: 1.3, corporate: 1.3 }, crash: [0.72, 0.82] },
  housing: { label: 'a housing bust', icon: '🏚️', text: 'House prices are falling and nobody is building.', sectors: { trades: 2.2, carpentry: 2.2, ironworking: 2, craneOperator: 2.2, realestate: 2.5, architecture: 1.8, plumbing: 1.5, hvac: 1.4, propertyManagement: 1.4 }, crash: [0.78, 0.86] },
  oil: { label: 'an oil shock', icon: '🛢️', text: 'Fuel prices doubled. Everything that moves costs more.', sectors: { aviation: 2, flightAttendant: 2, charterAviation: 2, trucking: 1.6, logistics: 1.5, manufacturing: 1.7, cruise: 1.8 }, inflation: 0.05, oil: true },
  tech: { label: 'a tech bust', icon: '💻', text: 'The bubble burst: startups are folding and the giants are cutting.', sectors: { tech: 2.5, dataScience: 2.2, cybersecurity: 1.3, design: 1.8, gameDevelopment: 2.2, marketing: 1.6, contentCreator: 1.8, sales: 1.4 } },
  pandemic: { label: 'a pandemic', icon: '🦠', text: 'A new virus is spreading. Lockdowns have closed shops, restaurants and borders.', sectors: { culinary: 3, hospitality: 3, retail: 1.8, aviation: 2.5, flightAttendant: 3, cruise: 3.5, acting: 2.5, music: 2.5, fitness: 2.5, cosmetology: 2.5, athletics: 1.5 }, pandemic: true },
};
/** Jobs a pandemic makes harder, not scarcer. */
const FRONTLINE = ['medical', 'nursing', 'ems', 'privateEms', 'respiratoryTherapy', 'publicHealth', 'travelNursing', 'caregiving', 'pharmacy', 'funeral'];

const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 92821 + state.character.age * 613 + 0x5ec) >>> 0);
export const causeOf = (state) => (state.economy?.phase === 'recession' || state.economy?.phase === 'recovery' ? CAUSES[state.economy.cause?.id] ?? null : null);

/** What each kind of downturn does to business demand, by business type (× on demand). */
const BUSINESS_SHOCK = {
  pandemic: { restaurant: 0.55, foodTruck: 0.6, catering: 0.45, salon: 0.55, gym: 0.45, personalTraining: 0.6, retail: 0.75, charterOperator: 0.55, tourBoat: 0.45, busCharter: 0.5, productionCompany: 0.7, recordingStudio: 0.8, flightSchool: 0.7, homeHealth: 1.15, homeCareAgency: 1.15, pharmacyStore: 1.1, courier: 1.3, softwareShop: 1.1, cleaning: 1.1, funeralHome: 1.2 },
  housing: { constructionCo: 0.65, homeBuilder: 0.5, developer: 0.5, demolitionCo: 0.7, excavation: 0.65, craneRental: 0.65, roofing: 0.8, brokerage: 0.75, architecturePractice: 0.75, landscaping: 0.85, movingCompany: 0.8 },
  financial: { brokerage: 0.6, insuranceAgency: 0.85, cpaFirm: 0.9, developer: 0.7, homeBuilder: 0.75, consulting: 0.8, staffingAgency: 0.75 },
  oil: { trucking: 0.75, courier: 0.85, charterOperator: 0.7, busCharter: 0.75, movingCompany: 0.8, towing: 0.85, solarInstaller: 1.25 },
  tech: { techStartup: 0.5, softwareShop: 0.7, indieGameStudio: 0.65, marketingAgency: 0.75, designStudio: 0.75, itSecurityFirm: 0.9, staffingAgency: 0.8 },
};
export function businessShock(state, typeId) {
  const id = state.economy?.phase === 'recession' ? state.economy.cause?.id : state.world?.pandemic?.active ? 'pandemic' : null;
  return (id && BUSINESS_SHOCK[id]?.[typeId]) || 1;
}

/** How much harder this recession hits a profession (×, 1 = the usual). */
export function shockFactor(state, professionId) {
  const c = state.economy?.phase === 'recession' ? CAUSES[state.economy.cause?.id] : null;
  return c?.sectors?.[professionId] ?? 1;
}

export function shocksTick(main) {
  const { state } = main;
  const e = state.economy;
  if (!e) return;
  const rng = sideRng(state);
  // A new recession: what caused it.
  if (e.phase === 'recession' && !e.cause) {
    const id = rng.weighted([['financial', 3], ['housing', 3], ['oil', 2], ['tech', 2], ['pandemic', 0.8]], ([, w]) => w)[0];
    const c = CAUSES[id];
    e.cause = { id, since: state.character.age };
    main.log(`${c.icon} The recession began with ${c.label}. ${c.text}`, c.icon, 'warn');
    if (c.crash) {
      const m = rng.float(...c.crash);
      for (const regionId of new Set([...Object.keys(REGIONS), ...regionsHere(state).map((r) => r.id)])) state.housing.market[regionId] = Math.round((state.housing.market[regionId] ?? 1) * m * 1000) / 1000;
      main.log(`🏠 House prices crashed — down about ${Math.round((1 - m) * 100)}%.`, '🏠', 'warn');
      const under = (state.housing?.properties ?? []).filter((p) => (p.mortgage?.balance ?? 0) > p.value * m);
      if (under.length) main.log(`Your ${under[0].typeName.toLowerCase()} is now worth less than the mortgage on it.`, '📉', 'bad');
    }
    if (c.inflation) e.inflation = Math.min(0.14, e.inflation + c.inflation);
    if (c.pandemic) {
      state.world ??= {};
      state.world.pandemic = { active: true, since: state.character.age, name: rng.pick(['a novel coronavirus', 'a new strain of influenza', 'a respiratory virus first seen in a market']) };
    }
    const job = state.career.job;
    if (job && c.sectors[job.professionId] >= 1.5) main.log(`Your industry is one of the hardest hit. Colleagues are being let go.`, '⚠️', 'warn');
    for (const b of [state.business?.current, ...(state.business?.holdings ?? [])].filter(Boolean)) {
      const f = businessShock(state, b.typeId);
      if (f < 0.85) main.log(`${b.name} is in the eye of it: customers expect to vanish (demand down about ${Math.round((1 - f) * 100)}%).`, '🏚️', 'warn');
      else if (f > 1.05) main.log(`${b.name} is one of the few businesses this downturn helps.`, '📈', 'good');
    }
  }
  // A pandemic: two years of it.
  const p = state.world?.pandemic;
  if (p?.active) {
    const years = state.character.age - p.since;
    if (years >= 2) { p.active = false; main.log('The pandemic has ended — or at least the emergency has. Some things never quite went back.', '💉', 'info'); }
    else {
      const job = state.career.job;
      // The first year: lockdown, and how you live with it. The second: the vaccine.
      if (years === 0 && !p.lockdownAsked) {
        p.lockdownAsked = true;
        main.prompt({ type: 'shocks.lockdown', icon: '🏠', title: 'Lockdown', text: 'The government has closed schools, shops and offices. You may leave home for food, medicine and an hour of exercise.', data: {}, options: [
          { id: 'strict', label: '🏠 Follow the rules to the letter', hint: 'Safer; lonelier' },
          { id: 'bend', label: '🍷 See a few friends quietly', hint: 'Saner; riskier' },
          { id: 'protest', label: '📢 Join the protests against it', hint: 'A fine, and the virus doesn\'t care' },
        ] });
      }
      if (years === 1 && !p.vaccineAsked) {
        p.vaccineAsked = true;
        main.prompt({ type: 'shocks.vaccine', icon: '💉', title: 'The Vaccine', text: 'A vaccine has been approved. Your age group can book now.', data: {}, options: [
          { id: 'yes', label: '💉 Book it', hint: 'A sore arm and a day in bed' },
          { id: 'no', label: '🙅 Not for me', hint: job && FRONTLINE.includes(job.professionId) ? 'Your employer may require it' : '' },
        ] });
      }
      if (job && !FRONTLINE.includes(job.professionId) && ['corporate', 'finance', 'accounting', 'tech', 'insurance', 'marketing', 'humanResources', 'dataScience', 'design', 'actuary', 'legalSupport', 'law'].includes(job.professionId)) {
        main.stat('stress', -3);
        if (rng.chance(0.5)) main.log('You worked from the kitchen table all year. No commute; no edges to the day.', '💻', 'info');
      }
      const risk = state.health?.vaccinated ? 0.08 : p.strict === state.character.age ? 0.15 : p.bend === state.character.age ? 0.4 : 0.3;
      if (rng.chance(risk)) { main.stat('health', -rng.int(3, 12)); main.log(`You caught ${p.name}. ${state.character.age >= 70 ? 'It was frightening at your age.' : 'Two miserable weeks.'}`, '🤒', 'warn'); }
      if (job && FRONTLINE.includes(job.professionId)) { main.stat('stress', 12); main.log('Another year on the front line of the pandemic: double shifts, colleagues off sick, patients who couldn\'t say goodbye to their families.', '😷', 'warn'); }
      main.stat('happiness', -3);
    }
  }
  // Inflation eats savings.
  if (e.inflation >= 0.05 && state.finances.cash > 2000) {
    const lost = Math.round(state.finances.cash * e.inflation);
    main.log(`Prices rose ${(e.inflation * 100).toFixed(1)}% this year: your cash savings lost about $${lost.toLocaleString()} of buying power.`, '🔥', 'warn');
    main.stat('stress', 3);
  }
  if (e.phase === 'expansion' && e.cause) e.cause = null;
}

export const ShocksResolvers = {
  lockdown(ctx, data, optionId) {
    const { state } = ctx;
    const p = state.world?.pandemic;
    if (!p) return;
    if (optionId === 'strict') { p.strict = state.character.age + 1; ctx.stat('happiness', -6); return ctx.log('You stayed in. Groceries on the doorstep, family on a screen, the same walk every day.', '🏠', 'info'); }
    if (optionId === 'bend') { p.bend = state.character.age + 1; ctx.stat('happiness', 3); return ctx.log('A few friends in the garden, coats on. Nobody told.', '🍷', 'warn'); }
    p.bend = state.character.age + 1;
    ctx.spend(Math.round(200 * (state.character.countryId && state.character.countryId !== 'US' ? 0.8 : 1)), 'Fine for breaching lockdown', { allowDebt: true });
    ctx.log('You marched against the lockdown and got a fixed-penalty fine for it.', '📢', 'warn');
  },
  vaccine(ctx, data, optionId) {
    const { state } = ctx;
    if (optionId === 'yes') { state.health.vaccinated = true; ctx.stat('health', -1); return ctx.log('A sore arm, a day in bed, and a weight off.', '💉', 'good'); }
    const job = state.career.job;
    if (job && FRONTLINE.includes(job.professionId) && ctx.rng.chance(0.4)) { ctx.emit('career:resign', { reason: 'Dismissed for refusing the vaccine mandate', fired: true }); return ctx.log('Your employer required it. You refused, and you were let go.', '🙅', 'bad'); }
    ctx.log('You decided against it.', '🙅', 'info');
  },
};

export const ShocksModule = { id: 'shocks', order: 1.1, onAgeUp: shocksTick, resolvers: ShocksResolvers };
