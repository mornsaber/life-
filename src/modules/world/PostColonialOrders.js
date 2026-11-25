/**
 * The national orders of former colonies, where a country pack only sketched a placeholder
 * ("National Order of Merit"): the real names, lowest grade first, with their letters.
 * When each was founded, and what came between independence and its founding (British honours
 * in a Commonwealth realm, nothing in a new republic), lives in HonoursOfTheDay.js.
 *
 *   tiers: [post-nominal letters, name, extra?], extra: { prefix, from, until } (a grade that
 *   came later or ended: Trinidad's Trinity Cross gave way to the Order of the Republic in 2008).
 */
const SIR = { prefix: { male: 'Sir', female: 'Dame' } };
export const POSTCOLONIAL_ORDERS = {
  BB: { order: 'Order of Barbados', tiers: [['BSM', 'Barbados Service Medal'], ['BSS', 'Barbados Service Star'], ['SCM', 'Silver Crown of Merit'], ['GCM', 'Gold Crown of Merit'], ['CHB', 'Companion of Honour of Barbados'], ['KA', { male: 'Knight of St Andrew', female: 'Dame of St Andrew' }, SIR]] },
  TT: { order: null, tiers: [['HBM', 'Hummingbird Medal (Gold)'], ['CM', 'Chaconia Medal (Gold)'], ['TC', 'Trinity Cross', { until: 2008 }], ['ORTT', 'Order of the Republic of Trinidad and Tobago', { from: 2008 }]] },
  GY: { order: null, tiers: [['AA', 'Golden Arrow of Achievement'], ['CCH', 'Cacique\'s Crown of Honour'], ['OR', 'Order of Roraima', { from: 1976 }], ['OE', 'Order of Excellence of Guyana']] },
  MU: { order: 'Order of the Star and Key of the Indian Ocean', tiers: [['MSK', 'Member of the Order of the Star and Key of the Indian Ocean'], ['OSK', 'Officer of the Order of the Star and Key of the Indian Ocean'], ['CSK', 'Commander of the Order of the Star and Key of the Indian Ocean'], ['GOSK', 'Grand Officer of the Order of the Star and Key of the Indian Ocean'], ['GCSK', 'Grand Commander of the Order of the Star and Key of the Indian Ocean']] },
  FJ: { order: 'Order of Fiji', tiers: [['MF', 'Member of the Order of Fiji'], ['OF', 'Officer of the Order of Fiji'], ['CF', 'Companion of the Order of Fiji']] },
  BZ: { order: null, tiers: [['MSA', 'Meritorious Service Award'], ['OD', 'Order of Distinction'], ['OB', 'Order of Belize']] },
  AG: { order: 'Order of the Nation', tiers: [['MN', 'Member of the Order of the Nation'], ['ON', 'Officer of the Order of the Nation'], ['CN', 'Commander of the Order of the Nation'], ['KCN', { male: 'Knight Commander of the Order of the Nation', female: 'Dame Commander of the Order of the Nation' }, SIR]] },
  LC: { order: null, tiers: [['SLMM', 'Saint Lucia Medal of Merit'], ['SLC', 'Saint Lucia Cross']] },
  KN: { order: null, tiers: [['SM', 'Star of Merit'], ['CMN', 'Companion of the Order of St Christopher and Nevis']] },
  DM: { order: null, tiers: [['SAH', 'Sisserou Award of Honour'], ['DAH', 'Dominica Award of Honour']] },
  SL: { order: null, tiers: [['MR', 'Member of the Order of the Rokel'], ['OR', 'Officer of the Order of the Rokel'], ['CR', 'Commander of the Order of the Rokel'], ['GCOR', 'Grand Commander of the Order of the Republic of Sierra Leone']] },
  ZM: { order: null, tiers: [['', 'Order of Distinguished Service (Second Division)'], ['', 'Order of Distinguished Service (First Division)'], ['', 'Order of the Eagle of Zambia'], ['', 'Grand Order of the Eagle of Zambia']] },
  TZ: { order: null, tiers: [['', 'Order of the Torch of Kilimanjaro'], ['', 'Order of the Arusha Declaration'], ['', 'Order of the United Republic of Tanzania']] },
  BW: { order: null, tiers: [['PMS', 'Presidential Order of Meritorious Service'], ['PH', 'Presidential Order of Honour'], ['NB', 'Naledi ya Botswana (Star of Botswana)']] },
  SR: { order: 'Honorary Order of the Yellow Star', tiers: [['', 'Honorary Order of the Yellow Star (Member)'], ['', 'Honorary Order of the Yellow Star (Officer)'], ['', 'Honorary Order of the Yellow Star (Commander)'], ['', 'Honorary Order of the Yellow Star (Grand Officer)']] },
  NA: { order: 'Order of the Most Ancient Welwitschia Mirabilis', tiers: [['', 'Order of the Most Ancient Welwitschia Mirabilis (Fourth Class)'], ['', 'Order of the Most Ancient Welwitschia Mirabilis (Third Class)'], ['', 'Order of the Most Ancient Welwitschia Mirabilis (Second Class)'], ['', 'Order of the Most Ancient Welwitschia Mirabilis (First Class)']] },
  // Mobutu's Order of the Leopard (1966), long before the Kabila–Lumumba heroes' order.
  CD: { order: 'National Order of the Leopard', tiers: [['', 'National Order of the Leopard (Chevalier)'], ['', 'National Order of the Leopard (Officier)'], ['', 'National Order of the Leopard (Commandeur)'], ['', 'National Order of the Leopard (Grand Officier)']] },
};

/** Put the real orders in place of the placeholders (called by Honours.js once the packs are in). */
export function applyPostColonialOrders(ORDERS) {
  const MIN = [40, 80, 130, 190, 260, 320];
  for (const [cc, def] of Object.entries(POSTCOLONIAL_ORDERS)) {
    const old = ORDERS[cc];
    const ribbon = old?.tiers?.[0]?.ribbon;
    const n = def.tiers.filter(([, , x]) => !x?.from).length;
    let i = 0;
    const tiers = def.tiers.map(([post, name, extra = {}], k) => {
      // A grade that replaced another sits at the same place in the ladder.
      const at = extra.from ? i - 1 : i++;
      return { id: `pc${k}`, name, ...(post ? { post } : {}), min: MIN[Math.min(MIN.length - 1, at + Math.max(0, 5 - n))], ribbon, ...extra };
    });
    ORDERS[cc] = { minAge: old?.minAge ?? 35, ...(old ?? {}), order: def.order, tiers };
  }
}
