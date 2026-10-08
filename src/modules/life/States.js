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
  GA: { name: 'Georgia', deathPenalty: 'active', incomeTax: [[Infinity, 0.0539]], propertyTax: 0.0083, salesTax: 0.074, rightToWork: true, cannabis: false, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: 7.25, nlc: true, population: 'large', disasters: { hurricane: 0.03, tornado: 0.04 } },
  NC: { name: 'North Carolina', deathPenalty: 'moratorium', incomeTax: [[Infinity, 0.045]], propertyTax: 0.0072, salesTax: 0.07, rightToWork: true, cannabis: false, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: 7.25, nlc: true, population: 'large', disasters: { hurricane: 0.06, flood: 0.03 } },
  VA: { name: 'Virginia', incomeTax: [[3000, 0.02], [5000, 0.03], [17000, 0.05], [Infinity, 0.0575]], propertyTax: 0.0082, salesTax: 0.057, rightToWork: true, cannabis: true, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: 12.41, nlc: true, population: 'large', disasters: { hurricane: 0.03, flood: 0.02 } },
  PA: { name: 'Pennsylvania', deathPenalty: 'moratorium', incomeTax: [[Infinity, 0.0307]], propertyTax: 0.0149, salesTax: 0.063, rightToWork: false, cannabis: false, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: 7.25, nlc: true, population: 'large', disasters: { flood: 0.04, blizzard: 0.04 } },
  MA: { name: 'Massachusetts', incomeTax: [[1083150, 0.05], [Infinity, 0.09]], propertyTax: 0.0114, salesTax: 0.0625, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: 15, nlc: false, population: 'large', disasters: { blizzard: 0.06, hurricane: 0.02 } },
  MI: { name: 'Michigan', incomeTax: [[Infinity, 0.0425]], propertyTax: 0.0138, salesTax: 0.06, rightToWork: false, cannabis: true, dui: { fineMult: 1, suspendYears: 1 }, minWage: 10.56, nlc: false, population: 'large', disasters: { blizzard: 0.06, tornado: 0.02 } },
  MN: { name: 'Minnesota', incomeTax: [[31690, 0.0535], [104090, 0.068], [193240, 0.0785], [Infinity, 0.0985]], propertyTax: 0.0111, salesTax: 0.0749, rightToWork: false, cannabis: true, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: 11.13, nlc: false, population: 'medium', disasters: { blizzard: 0.07, flood: 0.03, tornado: 0.02 } },
  TN: { name: 'Tennessee', deathPenalty: 'active', incomeTax: [], propertyTax: 0.0064, salesTax: 0.0955, rightToWork: true, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: 7.25, nlc: true, population: 'large', disasters: { tornado: 0.06, flood: 0.03 } },
  LA: { name: 'Louisiana', deathPenalty: 'rare', incomeTax: [[12500, 0.0185], [50000, 0.035], [Infinity, 0.0425]], propertyTax: 0.0055, salesTax: 0.0956, rightToWork: true, cannabis: false, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: 7.25, nlc: false, population: 'medium', disasters: { hurricane: 0.14, flood: 0.08 } },
  AZ: { name: 'Arizona', deathPenalty: 'active', incomeTax: [[Infinity, 0.025]], propertyTax: 0.0062, salesTax: 0.084, rightToWork: true, cannabis: true, dui: { fineMult: 1.5, suspendYears: 1 }, minWage: 14.7, nlc: true, population: 'large', disasters: { wildfire: 0.05, flood: 0.02 } },
  NV: { name: 'Nevada', deathPenalty: 'rare', incomeTax: [], propertyTax: 0.0059, salesTax: 0.0824, rightToWork: true, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: 12, nlc: false, population: 'medium', disasters: { wildfire: 0.04, earthquake: 0.01 } },
  UT: { name: 'Utah', deathPenalty: 'rare', incomeTax: [[Infinity, 0.0455]], propertyTax: 0.0057, salesTax: 0.0719, rightToWork: true, cannabis: false, dui: { fineMult: 1.3, suspendYears: 1 }, minWage: 7.25, nlc: true, population: 'medium', disasters: { earthquake: 0.015, wildfire: 0.04, blizzard: 0.03 } },
  OR: { name: 'Oregon', deathPenalty: 'moratorium', incomeTax: [[4300, 0.0475], [10750, 0.0675], [125000, 0.0875], [Infinity, 0.099]], propertyTax: 0.0093, salesTax: 0, rightToWork: false, cannabis: true, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: 14.7, nlc: false, population: 'medium', disasters: { wildfire: 0.08, earthquake: 0.015 } },
  AK: { name: 'Alaska', incomeTax: [], propertyTax: 0.0104, salesTax: 0.018, rightToWork: false, cannabis: true, dui: { fineMult: 1.2, suspendYears: 1 }, minWage: 11.73, nlc: false, population: 'small', disasters: { earthquake: 0.04, blizzard: 0.08, wildfire: 0.04 } },
  HI: { name: 'Hawaii', incomeTax: [[9600, 0.014], [14400, 0.032], [19200, 0.055], [24000, 0.064], [36000, 0.068], [48000, 0.072], [125000, 0.076], [175000, 0.079], [225000, 0.0825], [275000, 0.09], [325000, 0.1], [Infinity, 0.11]], propertyTax: 0.0027, salesTax: 0.045, rightToWork: false, cannabis: false, dui: { fineMult: 1.1, suspendYears: 1 }, minWage: 14, nlc: false, population: 'small', disasters: { hurricane: 0.03, wildfire: 0.03, flood: 0.03 } },
  WV: { name: 'West Virginia', incomeTax: [[10000, 0.0236], [25000, 0.0315], [40000, 0.0354], [60000, 0.0472], [Infinity, 0.0512]], propertyTax: 0.0057, salesTax: 0.065, rightToWork: true, cannabis: false, dui: { fineMult: 1, suspendYears: 1 }, minWage: 8.75, nlc: true, population: 'small', disasters: { flood: 0.07 } },
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
  tornado: { name: 'Tornado', icon: '🌪️' },
};
