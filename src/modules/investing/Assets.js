/**
 * Asset classes and allocation profiles. Every return comes from the shared
 * economy's yearly returns (economy.returns), so brokerage accounts, IRAs
 * and 401(k)/TSP funds all move with the same market.
 */
import { SECTORS } from '../economy/EconomyEngine.js';

export const ASSETS = {
  index: { name: 'S&P 500 Index Fund', icon: '📊', dividend: 0.015, ret: (e) => e.returns.index },
  bonds: { name: 'Total Bond Fund', icon: '🧾', dividend: 0, ret: (e) => e.returns.bonds },
  treasuries: { name: 'Treasury Bills', icon: '🏛️', dividend: 0, interest: true, ret: (e) => e.interestRate },
  crypto: { name: 'Crypto', icon: '🪙', dividend: 0, ret: (e) => e.returns.crypto },
  ...Object.fromEntries(Object.entries(SECTORS).map(([id, s]) => [id, { name: `${s.name} stocks`, icon: s.icon, dividend: id === 'consumer' ? 0.028 : id === 'energy' ? 0.035 : 0.012, ret: (e) => e.returns.sectors[id] ?? e.returns.index, stock: true }])),
};

export const PROFILES = {
  conservative: { name: 'Conservative', icon: '🛡️', mix: { treasuries: 0.4, bonds: 0.4, index: 0.2 } },
  balanced: { name: 'Balanced', icon: '⚖️', mix: { index: 0.6, bonds: 0.4 } },
  aggressive: { name: 'Aggressive', icon: '🚀', mix: { index: 0.8, tech: 0.12, crypto: 0.08 } },
};

/** 401(k)/TSP fund lineup. */
export const DC_FUNDS = {
  stable: { name: 'Stable Value / G Fund', icon: '🛡️', mix: { treasuries: 1 } },
  balanced: { name: 'Target-Date Fund', icon: '⚖️', mix: { index: 0.6, bonds: 0.4 } },
  aggressive: { name: 'Stock Index / C Fund', icon: '🚀', mix: { index: 0.9, bonds: 0.1 } },
};

export function mixReturn(economy, mix) {
  return Object.entries(mix).reduce((s, [asset, w]) => s + w * (ASSETS[asset].ret(economy) + ASSETS[asset].dividend), 0);
}

export const profileReturn = (economy, profileId) => mixReturn(economy, (PROFILES[profileId] ?? DC_FUNDS[profileId] ?? PROFILES.balanced).mix);

/**
 * Wages, prices and living costs are kept in today's dollars, so balances
 * compound at real (inflation-adjusted) returns.
 */
export const realReturn = (economy, nominal) => (1 + nominal) / (1 + Math.max(0, economy.inflation)) - 1;

/** Long-term capital gains brackets (single filer, simplified). */
export function ltcgTax(ordinaryTaxable, gains) {
  if (gains <= 0) return 0;
  const rate = ordinaryTaxable < 48350 ? 0 : ordinaryTaxable < 533400 ? 0.15 : 0.2;
  return Math.round(gains * rate);
}

export const IRA_LIMIT = (age) => (age >= 50 ? 8000 : 7000);
export const ROTH_INCOME_LIMIT = 161000;
