/**
 * States: the legal and fiscal layer above regions.
 *
 *   incomeTax     [upper bound, marginal rate] brackets on federal-style taxable income ([] = no income tax)
 *   propertyTax   effective annual rate on home value
 *   salesTax      combined average rate (affects cost of living)
 *   rightToWork   union security clauses banned: fewer unions, no agency fees
 *   cannabis      recreational cannabis legal under state law (still federally illegal)
 *   dui           { fineMult, suspendYears } — DUI penalties
 *   minWage       hourly state minimum wage (floors G1 pay)
 *   nlc           member of the Nurse Licensure Compact
 *   population    sizes state agencies (employer size)
 *   disasters     annual probabilities by hazard
 */
export const STATES = {
  MT: { name: 'Montana', deathPenalty: 'rare', incomeTax: [[20500, 0.047], [Infinity, 0.059]], propertyTax: 0.0074, salesTax: 0, rightToWork: false, cannabis: true, dui: { fineMult: 1, suspendYears: 1 }, minWage: 10.55, nlc: true, population: 'small', disasters: { wildfire: 0.08, blizzard: 0.06 } },
  IA: { name: 'Iowa', incomeTax: [[Infinity, 0.038]], propertyTax: 0.0152, salesTax: 0.069, rightToWork: true, cannabis: false, dui: { fineMult: 1, suspendYears: 1 }, minWage: 7.25, nlc: true, population: 'medium', disasters: { flood: 0.05, blizzard: 0.06 } },
  OH: { name: 'Ohio', deathPenalty: 'moratorium', incomeTax: [[26050, 0], [100000, 0.0275], [Infinity, 0.035]], propertyTax: 0.0136, salesTax: 0.072, rightToWork: false, cannabis: true, dui: { fineMult: 1, suspendYears: 1 }, minWage: 10.7, nlc: true, population: 'large', disasters: { flood: 0.04, blizzard: 0.04 } },
  TX: { name: 'Texas', deathPenalty: 'active', incomeTax: [], propertyTax: 0.0168, salesTax: 0.082, rightToWork: true, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: 7.25, nlc: true, population: 'enterprise', disasters: { hurricane: 0.06, flood: 0.05 } },
  IL: { name: 'Illinois', incomeTax: [[Infinity, 0.0495]], propertyTax: 0.0207, salesTax: 0.088, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: 15, nlc: false, population: 'large', disasters: { blizzard: 0.05, flood: 0.03 } },
  DC: { name: 'District of Columbia', incomeTax: [[10000, 0.04], [40000, 0.06], [60000, 0.065], [250000, 0.085], [500000, 0.0925], [Infinity, 0.1075]], propertyTax: 0.0057, salesTax: 0.06, rightToWork: false, cannabis: true, dui: { fineMult: 1, suspendYears: 1 }, minWage: 17.5, nlc: false, population: 'medium', disasters: { flood: 0.02 } },
  NY: { name: 'New York', incomeTax: [[17150, 0.04], [80650, 0.055], [215400, 0.06], [1077550, 0.0685], [Infinity, 0.0965]], propertyTax: 0.014, salesTax: 0.085, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: 16, nlc: false, population: 'enterprise', disasters: { hurricane: 0.02, blizzard: 0.05, flood: 0.03 } },
  CA: { name: 'California', deathPenalty: 'moratorium', incomeTax: [[10756, 0.01], [25499, 0.02], [40245, 0.04], [55866, 0.06], [70606, 0.08], [360659, 0.093], [432787, 0.103], [721314, 0.113], [Infinity, 0.123]], propertyTax: 0.0071, salesTax: 0.088, rightToWork: false, cannabis: true, dui: { fineMult: 1.4, suspendYears: 1 }, minWage: 16.5, nlc: false, population: 'enterprise', disasters: { wildfire: 0.1, earthquake: 0.02 } },
  FL: { name: 'Florida', deathPenalty: 'active', incomeTax: [], propertyTax: 0.0086, salesTax: 0.07, rightToWork: true, cannabis: false, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: 14, nlc: true, population: 'enterprise', disasters: { hurricane: 0.12, flood: 0.05 } },
  WA: { name: 'Washington', incomeTax: [], propertyTax: 0.0087, salesTax: 0.092, rightToWork: false, cannabis: true, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: 16.66, nlc: true, population: 'large', disasters: { wildfire: 0.05, earthquake: 0.02 } },
  CO: { name: 'Colorado', incomeTax: [[Infinity, 0.044]], propertyTax: 0.0051, salesTax: 0.077, rightToWork: false, cannabis: true, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: 14.81, nlc: true, population: 'medium', disasters: { wildfire: 0.07, blizzard: 0.05 } },
};

export function stateIncomeTax(stateId, taxable) {
  const brackets = STATES[stateId]?.incomeTax ?? [];
  let remaining = Math.max(0, taxable);
  let lower = 0;
  let tax = 0;
  for (const [upper, rate] of brackets) {
    if (remaining <= 0) break;
    const span = Math.min(remaining, upper - lower);
    tax += span * rate;
    remaining -= span;
    lower = upper;
  }
  return Math.round(tax);
}

/** Top marginal rate, for comparisons in the UI. */
export const topStateRate = (stateId) => STATES[stateId].incomeTax.reduce((m, [, r]) => Math.max(m, r), 0);

export const DISASTER_LABEL = {
  hurricane: { name: 'Hurricane', icon: '🌀' },
  wildfire: { name: 'Wildfire', icon: '🔥' },
  flood: { name: 'Flood', icon: '🌊' },
  blizzard: { name: 'Blizzard', icon: '🌨️' },
  earthquake: { name: 'Earthquake', icon: '🫨' },
};
