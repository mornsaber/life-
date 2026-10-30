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
  if (e.phase === 'recession' && e.phaseYears === 0 && (!e.cause || e.cause.since !== state.character.age)) {
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
  }
  // A pandemic: two years of it.
  const p = state.world?.pandemic;
  if (p?.active) {
    const years = state.character.age - p.since;
    if (years >= 2) { p.active = false; main.log('The pandemic has ended — or at least the emergency has. Some things never quite went back.', '💉', 'info'); }
    else {
      const job = state.career.job;
      if (rng.chance(0.3)) { main.stat('health', -rng.int(3, 12)); main.log(`You caught ${p.name}. ${state.character.age >= 70 ? 'It was frightening at your age.' : 'Two miserable weeks.'}`, '🤒', 'warn'); }
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

export const ShocksModule = { id: 'shocks', order: 1.1, onAgeUp: shocksTick };
