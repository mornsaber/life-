/**
 * Who inherits, and what a married woman may own, by country and era.
 *
 *   common     England's family (and its empire, the US): freedom of testation. Intestate, the
 *              spouse first, then the children. A landed estate went whole to the eldest son
 *              (primogeniture and entail) until the Law of Property Act 1925.
 *   civil      Napoleon's Code (1804) and its descendants: children have a reserved share
 *              (réserve héréditaire, legítima, Pflichtteil, iryūbun): a half for one child, two
 *              thirds for two, three quarters for three or more. The will disposes of the rest.
 *   islamic    the farāʾiḍ: fixed shares. A widow takes an eighth with children (a quarter
 *              without), a widower a quarter (a half); sons take twice a daughter's share; a
 *              will may pass on no more than a third, and not to an heir.
 *   socialist  the Soviet bloc: the state owns the land; a family keeps its flat or house and
 *              personal property; inheritance taxed away above modest sums.
 *   customary  much of Africa and the Pacific before codified law: family land goes down the
 *              line, held by the lineage (the eldest son as trustee), not sold.
 *
 *   Coverture  before the married women's property acts, what a wife owned became her
 *              husband's to manage (England 1882, the US states by about 1880, France 1965…).
 *              Islamic law never had it: a wife kept her own property.
 */
import { yearNow, PRESENT } from './Eras.js';

const ISLAMIC = ['SA', 'IR', 'EG', 'PK', 'AF', 'IQ', 'JO', 'KW', 'QA', 'BH', 'AE', 'OM', 'YE', 'LY', 'DZ', 'MA', 'SD', 'MR', 'SY', 'BD', 'MY', 'BN', 'MV', 'KM', 'SO', 'DJ', 'PS', 'NE', 'TD', 'ML', 'SN', 'GN', 'GM', 'AZ', 'UZ', 'TJ', 'TM', 'KG', 'ID'];
const CIVIL = ['FR', 'BE', 'LU', 'MC', 'ES', 'PT', 'IT', 'SM', 'AD', 'CH', 'LI', 'AT', 'DE', 'NL', 'DK', 'SE', 'NO', 'FI', 'IS', 'GR', 'TR', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'RS', 'ME', 'MK', 'BA', 'AL', 'EE', 'LV', 'LT', 'JP', 'KR', 'TW', 'TH', 'CN', 'VN', 'LA', 'KH', 'BR', 'AR', 'CL', 'UY', 'PY', 'BO', 'PE', 'EC', 'CO', 'VE', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'HT', 'LB', 'TN', 'CD', 'CG', 'CM', 'CI', 'BJ', 'BF', 'TG', 'GA', 'MG', 'CF', 'BI', 'RW', 'AO', 'MZ', 'CV', 'ST', 'GW', 'TL', 'GQ', 'SR', 'RU', 'UA', 'BY', 'MD', 'GE', 'AM', 'KZ', 'MN', 'PH'];
const CUSTOMARY = ['KE', 'UG', 'TZ', 'ZM', 'ZW', 'MW', 'BW', 'LS', 'SZ', 'NA', 'NG', 'GH', 'SL', 'LR', 'ET', 'ER', 'SS', 'PG', 'SB', 'VU', 'FJ', 'WS', 'TO', 'KI', 'TV', 'NR', 'FM', 'MH', 'PW'];
const SOVIET = ['RU', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'EE', 'LV', 'LT'];
const EAST_BLOC = ['PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'AL', 'MN', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'CN', 'VN', 'LA', 'KP', 'CU'];

/** When a married woman could own her own property in law. */
const WIVES_OWN = { GB: 1882, IE: 1882, US: 1880, CA: 1884, AU: 1890, NZ: 1884, ZA: 1953, IN: 1874, FR: 1965, BE: 1958, LU: 1972, IT: 1975, ES: 1975, PT: 1966, DE: 1958, AT: 1978, CH: 1988, NL: 1957, SE: 1921, NO: 1888, DK: 1925, FI: 1930, JP: 1947, KR: 1960, BR: 1962, AR: 1926, MX: 1928, CL: 1989, CN: 1950, RU: 1918 };
/** When the reserved share for children came in (the Code civil and its copies). */
const RESERVE_FROM = { FR: 1804, BE: 1804, LU: 1804, IT: 1865, ES: 1889, PT: 1867, DE: 1900, AT: 1811, CH: 1912, NL: 1838, JP: 1947, KR: 1977, BR: 1916, AR: 1871, CL: 1857, MX: 1884, PL: 1964, TR: 1926 };

const cc = (state) => state?.character?.countryId ?? 'US';
const reserveOf = (children) => (children <= 0 ? 0 : children === 1 ? 0.5 : children === 2 ? 2 / 3 : 0.75);

/** The law of succession where you live, in the year being played. */
export function successionLaw(state, country = cc(state)) {
  const y = yearNow(state);
  const era = state?.era && y < PRESENT;
  const soviet = era && ((SOVIET.includes(country) && y >= 1918 && y < 1991) || (EAST_BLOC.includes(country) && y >= 1946 && y < 1990));
  let family = ISLAMIC.includes(country) ? 'islamic' : CUSTOMARY.includes(country) && era && y < 1970 ? 'customary' : CIVIL.includes(country) ? 'civil' : 'common';
  if (soviet) family = 'socialist';
  // The reserve exists from its code (most of the civil-law world took it from Napoleon's).
  const reserveFrom = RESERVE_FROM[country] ?? 1900;
  const reserve = family === 'civil' && (!era || y >= reserveFrom);
  const wivesFrom = WIVES_OWN[country] ?? (family === 'islamic' ? 0 : family === 'civil' ? 1960 : 1900);
  return {
    family,
    reserve,
    /** Children's reserved share of the estate, given how many there are. */
    reserved: (children) => (reserve ? reserveOf(children) : 0),
    primogeniture: era && ['GB', 'IE'].includes(country) && y < 1925,
    coverture: Boolean(era && y < wivesFrom && family !== 'islamic'),
    sonsDouble: family === 'islamic',
    willCap: family === 'islamic' ? 1 / 3 : null,
    stateLand: family === 'socialist',
    name: { common: 'freedom of testation', civil: reserve ? (country === 'DE' || country === 'AT' ? 'the Pflichtteil (compulsory share)' : country === 'JP' ? 'the iryūbun (reserved portion)' : ['ES', 'PT', 'BR', 'AR', 'CL', 'MX', 'PE', 'CO', 'VE'].includes(country) ? 'the legítima (forced heirship)' : 'the réserve héréditaire (forced heirship)') : 'the civil code', islamic: 'the farāʾiḍ (Islamic shares)', socialist: 'socialist inheritance law', customary: 'customary law (family land held by the lineage)' }[family],
  };
}

/**
 * Divide an estate among a spouse and children under the law (or the will where the law
 * allows): [{ to, share }] summing to 1. `children` are { id, gender, eldest? }.
 * `will` is the testator's own division (or null for intestacy).
 */
export function lawfulShares(state, { spouse = null, spouseGender = null, children = [], will = null }) {
  const law = successionLaw(state);
  const n = children.length;
  if (law.family === 'islamic') {
    // A third may go by will (to charity, say); the rest by the fixed shares.
    const free = will?.charity ? law.willCap : 0;
    const rest = 1 - free;
    const spousePart = spouse ? (spouseGender === 'female' ? (n ? 1 / 8 : 1 / 4) : (n ? 1 / 4 : 1 / 2)) : 0;
    const units = children.reduce((s, c) => s + (c.gender === 'male' ? 2 : 1), 0);
    const out = [];
    if (spouse) out.push({ to: spouse, share: rest * (n ? spousePart : 1) });
    for (const c of children) out.push({ to: c.id, share: rest * (1 - (spouse ? spousePart : 0)) * ((c.gender === 'male' ? 2 : 1) / units) });
    if (free) out.push({ to: 'charity', share: free });
    return out;
  }
  if (law.family === 'customary' && n) {
    // The eldest son holds the family's land for the lineage; the widow is maintained from it.
    const heir = children.find((c) => c.gender === 'male') ?? children[0];
    return [{ to: heir.id, share: spouse ? 0.7 : 1 }, ...(spouse ? [{ to: spouse, share: 0.3 }] : [])];
  }
  // The will, then the children's reserve where the law has one.
  let shares = will?.shares ?? null;
  if (!shares) {
    // Intestate: spouse half and children half (common and civil alike, roughly).
    shares = spouse && n ? [{ to: spouse, share: 0.5 }, ...children.map((c) => ({ to: c.id, share: 0.5 / n }))] : spouse ? [{ to: spouse, share: 1 }] : children.map((c) => ({ to: c.id, share: 1 / n }));
  }
  const reserved = law.reserved(n);
  if (reserved) {
    const toKids = shares.filter((s) => children.some((c) => c.id === s.to)).reduce((a, s) => a + s.share, 0);
    if (toKids < reserved - 1e-9) {
      // The children's reserve comes first; what the will gave others is cut back to fit.
      const others = shares.filter((s) => !children.some((c) => c.id === s.to));
      const otherTotal = others.reduce((a, s) => a + s.share, 0) || 1;
      shares = [...children.map((c) => ({ to: c.id, share: reserved / n })), ...others.map((s) => ({ to: s.to, share: (s.share / otherTotal) * (1 - reserved) }))];
    }
  }
  return shares;
}
