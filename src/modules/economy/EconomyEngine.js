/**
 * The shared macroeconomy. Everything cyclical reads from here: property
 * prices and mortgage rates, city budgets, federal stability, layoffs,
 * investment returns, business revenue, pension COLAs and union raises.
 *
 * state.economy = {
 *   phase: 'expansion'|'peak'|'recession'|'recovery', phaseYears,
 *   gdpGrowth, unemployment, inflation, interestRate,   // percentages as decimals
 *   marketIndex, cpi, returns: { index, bonds, treasuries, crypto, sectors{} },
 *   cryptoMania, history: [{ year, phase, ret, inflation, unemployment }]
 * }
 *
 * A cycle is a 5–9 year expansion, a 1-year peak, a 1–2 year recession and a
 * 1–2 year recovery — about one recession every 8–12 years — plus rare
 * black-swan shocks that cut an expansion short.
 */
import { clamp } from '../../core/Random.js';

/** Round to `p` and normalize -0 (which doesn't survive JSON). */
const rnd = (x, p = 1000) => Math.round(x * p) / p + 0;

export const PHASES = {
  expansion: { label: 'Expansion', icon: '📈', gdp: [0.015, 0.035], unemployment: 0.042, inflation: 0.025, rate: 0.035, market: [0.1, 0.15] },
  peak: { label: 'Peak', icon: '⛰️', gdp: [0.005, 0.02], unemployment: 0.037, inflation: 0.04, rate: 0.05, market: [0.03, 0.16] },
  recession: { label: 'Recession', icon: '📉', gdp: [-0.035, -0.005], unemployment: 0.08, inflation: 0.015, rate: 0.01, market: [-0.2, 0.15] },
  recovery: { label: 'Recovery', icon: '🌱', gdp: [0.02, 0.045], unemployment: 0.06, inflation: 0.02, rate: 0.015, market: [0.18, 0.15] },
};

/** Sector betas for individual stocks. */
export const SECTORS = {
  tech: { name: 'Tech', icon: '💻', beta: 1.4, vol: 0.3 },
  finance: { name: 'Banks', icon: '🏦', beta: 1.2, vol: 0.2 },
  energy: { name: 'Energy', icon: '🛢️', beta: 0.9, vol: 0.25, inflationHedge: true },
  health: { name: 'Healthcare', icon: '🩺', beta: 0.6, vol: 0.18 },
  consumer: { name: 'Consumer staples', icon: '🛒', beta: 0.5, vol: 0.12 },
};

export function createEconomy(rng) {
  return {
    phase: 'expansion',
    phaseYears: rng.int(0, 4),
    expansionLength: rng.int(5, 9),
    gdpGrowth: 0.025,
    unemployment: 0.042,
    inflation: 0.025,
    interestRate: 0.035,
    marketIndex: 100,
    cpi: 1,
    returns: { index: 0, bonds: 0, treasuries: 0.035, crypto: 0, sectors: {} },
    cryptoMania: false,
    history: [],
  };
}

export const economyOf = (state) => state.economy;
export const isRecession = (state) => state.economy.phase === 'recession';

/** Revenue / demand multiplier for businesses and commissions. */
export function demandFactor(state) {
  return { expansion: 1.04, peak: 1.07, recession: 0.82, recovery: 0.95 }[state.economy.phase];
}

function nextPhase(e, rng) {
  if (e.phase === 'expansion') {
    if (e.phaseYears >= e.expansionLength) return 'peak';
    if (rng.chance(0.02)) return 'recession'; // black swan
    return null;
  }
  if (e.phase === 'peak') return 'recession';
  if (e.phase === 'recession') return e.phaseYears >= 1 && (e.phaseYears >= 2 || rng.chance(0.5)) ? 'recovery' : null;
  if (e.phase === 'recovery') return e.phaseYears >= 1 && (e.phaseYears >= 2 || rng.chance(0.5)) ? 'expansion' : null;
  return null;
}

export const EconomyEngine = {
  id: 'economy',
  order: 1,

  init(state, rng) {
    state.economy ??= createEconomy(rng);
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const e = state.economy;
    e.phaseYears += 1;
    const next = nextPhase(e, rng);
    if (next) {
      e.phase = next;
      e.phaseYears = 0;
      if (next === 'expansion') e.expansionLength = rng.int(5, 9);
      const label = PHASES[next];
      const msg = {
        peak: 'The economy is running hot. Inflation is climbing and the Fed is raising rates.',
        recession: '📉 The economy has tipped into recession. Layoffs are spreading.',
        recovery: '🌱 The recession is over. Hiring is picking back up.',
        expansion: '📈 The economy is expanding again.',
      }[next];
      ctx.log(msg, label.icon, next === 'recession' ? 'warn' : 'info');
    }

    const p = PHASES[e.phase];
    const prevRate = e.interestRate;
    e.gdpGrowth = rnd(rng.float(...p.gdp));
    e.unemployment = rnd(clamp(e.unemployment + (p.unemployment - e.unemployment) * 0.6 + rng.float(-0.004, 0.004), 0.025, 0.14));
    e.inflation = rnd(clamp(e.inflation + (p.inflation - e.inflation) * 0.5 + rng.float(-0.006, 0.008), -0.01, 0.1));
    e.interestRate = rnd(clamp(e.interestRate + (p.rate - e.interestRate) * 0.5 + rng.float(-0.003, 0.003), 0.0025, 0.08), 10000);
    e.cpi = rnd(e.cpi * (1 + e.inflation), 10000);

    // Asset returns
    const [mu, sigma] = p.market;
    const index = clamp(mu + rng.float(-sigma, sigma), -0.45, 0.6);
    const rateMove = e.interestRate - prevRate;
    const bonds = clamp(prevRate + 0.01 - rateMove * 6 + rng.float(-0.02, 0.02), -0.15, 0.2);
    if (!e.cryptoMania && rng.chance(0.12)) {
      e.cryptoMania = true;
      ctx.log('🪙 Crypto mania! Everyone\'s cousin is buying coins.', '🪙', 'warn');
    } else if (e.cryptoMania && rng.chance(0.45)) e.cryptoMania = false;
    const crypto = e.cryptoMania ? rng.float(0.5, 2.5) : clamp(index * 2 + rng.float(-0.6, 0.5), -0.8, 1.5);
    const sectors = {};
    for (const [id, s] of Object.entries(SECTORS)) {
      sectors[id] = rnd(clamp(0.02 + (index - 0.02) * s.beta + (s.inflationHedge ? (e.inflation - 0.025) * 4 : 0) + rng.float(-s.vol, s.vol), -0.7, 1.2));
    }
    e.returns = { index: rnd(index ), bonds: rnd(bonds ), treasuries: e.interestRate, crypto: rnd(crypto ), sectors };
    e.marketIndex = rnd(e.marketIndex * (1 + index), 100);
    e.history.push({ year: state.character.birthYear + state.character.age, phase: e.phase, ret: e.returns.index, inflation: e.inflation, unemployment: e.unemployment });
    if (e.history.length > 120) e.history.shift();
  },
};
