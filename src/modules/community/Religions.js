/**
 * Faith traditions (U.S. shares from Pew's Religious Landscape Study,
 * rounded), their clergy, and the schisms that split them.
 *
 *   weight         share of Americans raised in it (sets your upbringing)
 *   clergy         titles by career level; maleOnly / celibate restrictions;
 *                  lay = no paid clergy
 *   fundamentalist high-control: strict rules, shunning if you leave
 *   schism         { risk, issue, breakaway } — what the congregation might split over
 *
 * Pure data and helpers (only the plain-data country packs imported) so the job tree can use them.
 */
import { PACKS } from '../world/packs/index.js';
const CHRISTIAN_TITLES = (associate, minister, senior, regional) => ({ seminarian: 'Seminarian', associate, minister, senior, regional, chaplain: 'Chaplain' });

export const TRADITIONS = {
  catholic: { name: 'Catholic', icon: '⛪', group: 'Christian', weight: 20, house: 'Parish', clergy: { maleOnly: true, celibate: true, housing: true, titles: CHRISTIAN_TITLES('Parochial Vicar', 'Parish Priest', 'Pastor (Monsignor)', 'Bishop') }, schism: { risk: 0.2, issue: 'the traditional Latin Mass', breakaway: 'tradCatholic' } },
  tradCatholic: { name: 'Traditionalist Catholic', icon: '⛪', group: 'Christian', weight: 0, house: 'Chapel', fundamentalist: true, clergy: { maleOnly: true, celibate: true, housing: true, titles: CHRISTIAN_TITLES('Assistant Priest', 'Priest', 'Prior', 'Superior General') } },
  mainline: { name: 'Mainline Protestant', icon: '⛪', group: 'Christian', weight: 11, house: 'Church', clergy: { titles: CHRISTIAN_TITLES('Associate Pastor', 'Pastor', 'Senior Pastor', 'District Superintendent') }, schism: { risk: 0.6, issue: 'same-sex marriage and LGBTQ clergy', breakaway: 'conservativeMethodist' } },
  conservativeMethodist: { name: 'Global Methodist (breakaway)', icon: '⛪', group: 'Christian', weight: 0, house: 'Church', clergy: { titles: CHRISTIAN_TITLES('Associate Pastor', 'Pastor', 'Senior Pastor', 'Bishop') } },
  evangelical: { name: 'Evangelical / Nondenominational', icon: '✝️', group: 'Christian', weight: 14, house: 'Church', clergy: { titles: CHRISTIAN_TITLES('Youth Pastor', 'Campus Pastor', 'Lead Pastor', 'Network Overseer') }, schism: { risk: 0.4, issue: 'a pastor\'s scandal', breakaway: 'churchPlant' } },
  churchPlant: { name: 'Church Plant (breakaway)', icon: '✝️', group: 'Christian', weight: 0, house: 'Fellowship', clergy: { titles: CHRISTIAN_TITLES('Associate Pastor', 'Pastor', 'Lead Pastor', 'Network Founder') } },
  baptist: { name: 'Southern Baptist', icon: '✝️', group: 'Christian', weight: 8, house: 'Baptist Church', clergy: { maleOnly: true, titles: CHRISTIAN_TITLES('Associate Pastor', 'Pastor', 'Senior Pastor', 'Association Director') }, schism: { risk: 0.4, issue: 'women in ministry', breakaway: 'ifb' } },
  ifb: { name: 'Independent Fundamental Baptist', icon: '✝️', group: 'Christian', weight: 0.7, house: 'Bible Baptist Church', fundamentalist: true, clergy: { maleOnly: true, titles: CHRISTIAN_TITLES('Assistant Pastor', 'Pastor', 'Senior Pastor', 'Evangelist') } },
  pentecostal: { name: 'Pentecostal', icon: '🔥', group: 'Christian', weight: 4, house: 'Assembly', clergy: { titles: CHRISTIAN_TITLES('Associate Pastor', 'Pastor', 'Senior Pastor', 'District Bishop') }, schism: { risk: 0.3, issue: 'prophecy and faith healing', breakaway: 'apostolic' } },
  apostolic: { name: 'Oneness Apostolic', icon: '🔥', group: 'Christian', weight: 0, house: 'Apostolic Church', fundamentalist: true, clergy: { maleOnly: true, titles: CHRISTIAN_TITLES('Assistant Pastor', 'Pastor', 'Bishop', 'Presiding Bishop') } },
  orthodoxChristian: { name: 'Eastern Orthodox', icon: '☦️', group: 'Christian', weight: 1, house: 'Orthodox Church', clergy: { maleOnly: true, titles: { seminarian: 'Seminarian', associate: 'Deacon', minister: 'Priest', senior: 'Archpriest', regional: 'Bishop', chaplain: 'Chaplain' } } },
  lds: { name: 'Latter-day Saints', icon: '🕍', group: 'Christian', weight: 2, house: 'Ward', clergy: { lay: true }, schism: { risk: 0.1, issue: 'plural marriage', breakaway: 'polygamistSect' } },
  polygamistSect: { name: 'Fundamentalist polygamist sect', icon: '🏚️', group: 'Christian', weight: 0.02, house: 'Compound', fundamentalist: true, isolated: true, clergy: { maleOnly: true, titles: { seminarian: 'Priesthood Holder', associate: 'Elder', minister: 'Bishop', senior: 'Patriarch', regional: 'Prophet', chaplain: 'Elder' } } },
  reformJewish: { name: 'Reform Judaism', icon: '✡️', group: 'Jewish', weight: 1, house: 'Temple', clergy: { titles: { seminarian: 'Rabbinical Student', associate: 'Assistant Rabbi', minister: 'Rabbi', senior: 'Senior Rabbi', regional: 'Regional Director', chaplain: 'Chaplain' } } },
  conservativeJewish: { name: 'Conservative Judaism', icon: '✡️', group: 'Jewish', weight: 0.6, house: 'Synagogue', clergy: { titles: { seminarian: 'Rabbinical Student', associate: 'Assistant Rabbi', minister: 'Rabbi', senior: 'Senior Rabbi', regional: 'Rabbinical Assembly Leader', chaplain: 'Chaplain' } }, schism: { risk: 0.2, issue: 'interfaith marriage', breakaway: 'reformJewish' } },
  orthodoxJewish: { name: 'Orthodox Judaism', icon: '✡️', group: 'Jewish', weight: 0.5, house: 'Shul', clergy: { maleOnly: true, titles: { seminarian: 'Yeshiva Student', associate: 'Assistant Rabbi', minister: 'Rabbi', senior: 'Rosh Yeshiva', regional: 'Chief Rabbi', chaplain: 'Chaplain' } }, schism: { risk: 0.2, issue: 'modern education and the internet', breakaway: 'hasidic' } },
  hasidic: { name: 'Hasidic (Ultra-Orthodox)', icon: '✡️', group: 'Jewish', weight: 0.2, house: 'Shtiebel', fundamentalist: true, isolated: true, clergy: { maleOnly: true, titles: { seminarian: 'Yeshiva Student', associate: 'Dayan', minister: 'Rabbi', senior: 'Rosh Yeshiva', regional: 'Rebbe', chaplain: 'Chaplain' } } },
  sunni: { name: 'Sunni Islam', icon: '☪️', group: 'Muslim', weight: 0.8, house: 'Masjid', clergy: { maleOnly: true, titles: { seminarian: 'Student of Islamic Studies', associate: 'Assistant Imam', minister: 'Imam', senior: 'Senior Imam', regional: 'Director, Islamic Council', chaplain: 'Chaplain' } }, schism: { risk: 0.15, issue: 'how strictly to follow the earliest generations', breakaway: 'salafi' } },
  shia: { name: 'Shia Islam', icon: '☪️', group: 'Muslim', weight: 0.3, house: 'Islamic Center', clergy: { maleOnly: true, titles: { seminarian: 'Hawza Student', associate: 'Assistant Imam', minister: 'Imam', senior: 'Sheikh', regional: 'Ayatollah\'s Representative', chaplain: 'Chaplain' } } },
  salafi: { name: 'Salafi Islam', icon: '☪️', group: 'Muslim', weight: 0.05, house: 'Masjid', fundamentalist: true, clergy: { maleOnly: true, titles: { seminarian: 'Student of Knowledge', associate: 'Assistant Imam', minister: 'Imam', senior: 'Sheikh', regional: 'Scholar', chaplain: 'Chaplain' } } },
  hindu: { name: 'Hinduism', icon: '🕉️', group: 'Hindu', weight: 1, house: 'Mandir', clergy: { maleOnly: true, titles: { seminarian: 'Temple Apprentice', associate: 'Assistant Priest (Pujari)', minister: 'Temple Priest', senior: 'Head Priest', regional: 'Acharya', chaplain: 'Chaplain' } } },
  buddhist: { name: 'Buddhism', icon: '☸️', group: 'Buddhist', weight: 1, house: 'Temple', clergy: { titles: { seminarian: 'Novice', associate: 'Dharma Teacher', minister: 'Resident Teacher', senior: 'Abbot', regional: 'Lineage Holder', chaplain: 'Chaplain' } } },
  sikh: { name: 'Sikhism', icon: '🪯', group: 'Sikh', weight: 0.2, house: 'Gurdwara', clergy: { titles: { seminarian: 'Student Granthi', associate: 'Granthi', minister: 'Head Granthi', senior: 'Gurdwara President', regional: 'Regional Council Leader', chaplain: 'Chaplain' } } },
  // The established Church in England, and the Anglican Communion worldwide (the Episcopal Church in the US).
  anglican: { name: 'Anglican', icon: '⛪', group: 'Christian', weight: 1.2, house: 'Parish Church', hierarchy: 'anglican', clergy: { housing: true, titles: CHRISTIAN_TITLES('Assistant Curate', 'Vicar', 'Rector', 'Bishop') }, schism: { risk: 0.25, issue: 'same-sex blessings', breakaway: 'evangelical' } },
  lutheran: { name: 'Lutheran', icon: '⛪', group: 'Christian', weight: 0, house: 'Church', clergy: { housing: true, titles: CHRISTIAN_TITLES('Assistant Pastor', 'Pastor', 'Dean', 'Bishop') } },
  shinto: { name: 'Shinto', icon: '⛩️', group: 'Shinto', weight: 0, house: 'Shrine', clergy: { titles: { seminarian: 'Shrine Trainee', associate: 'Gon-negi (Junior Priest)', minister: 'Negi (Priest)', senior: 'Gūji (Chief Priest)', regional: 'Prefectural Shrine Association Director', chaplain: 'Chaplain' } } },
  chineseFolk: { name: 'Chinese folk religion & Taoism', icon: '🏮', group: 'Folk', weight: 0, house: 'Temple', clergy: { titles: { seminarian: 'Temple Apprentice', associate: 'Taoist Priest', minister: 'Temple Priest', senior: 'Temple Abbot', regional: 'Taoist Association Leader', chaplain: 'Chaplain' } } },
  unitarian: { name: 'Unitarian Universalist', icon: '🕯️', group: 'Other', weight: 0.3, house: 'Fellowship', clergy: { titles: { seminarian: 'Intern Minister', associate: 'Associate Minister', minister: 'Minister', senior: 'Senior Minister', regional: 'District Executive', chaplain: 'Chaplain' } } },
};

/**
 * Share raised with no religion. About 3 in 10 adults are "nones" today, but
 * most of them were raised in a faith and left; only ≈1 in 8 grew up without one.
 */
export const UNAFFILIATED_WEIGHT = 9;

/**
 * What children are raised in, country by country (rounded census and Pew shares; `none`
 * is raised without religion). The US uses the weights on the traditions above.
 */
export const RELIGION_MIX = {
  GB: { anglican: 28, catholic: 9, mainline: 6, evangelical: 4, pentecostal: 2, orthodoxChristian: 0.6, sunni: 6, hindu: 1.7, sikh: 0.9, buddhist: 0.4, reformJewish: 0.2, orthodoxJewish: 0.3, none: 40 },
  IE: { catholic: 74, anglican: 3, evangelical: 1, orthodoxChristian: 2, sunni: 1.5, none: 18 },
  CA: { catholic: 32, anglican: 5, mainline: 8, evangelical: 6, pentecostal: 1.5, orthodoxChristian: 1.5, sunni: 4, hindu: 2, sikh: 2, buddhist: 1, reformJewish: 0.6, conservativeJewish: 0.4, none: 35 },
  AU: { catholic: 20, anglican: 10, mainline: 3, evangelical: 4, pentecostal: 1.5, orthodoxChristian: 2.5, sunni: 3, hindu: 2.5, buddhist: 2.5, sikh: 0.8, none: 39 },
  NZ: { catholic: 10, anglican: 7, mainline: 5, evangelical: 3, pentecostal: 2, lds: 1, hindu: 2.5, sunni: 1.3, buddhist: 1.1, sikh: 1, none: 50 },
  DE: { catholic: 26, lutheran: 23, evangelical: 1, orthodoxChristian: 2, sunni: 5, shia: 0.5, buddhist: 0.3, reformJewish: 0.2, none: 42 },
  FR: { catholic: 45, evangelical: 2, mainline: 1, orthodoxChristian: 0.5, sunni: 8, reformJewish: 0.4, orthodoxJewish: 0.4, buddhist: 0.5, none: 42 },
  IT: { catholic: 74, orthodoxChristian: 2.5, evangelical: 1, sunni: 3, none: 19 },
  ES: { catholic: 58, evangelical: 1.5, orthodoxChristian: 1, sunni: 3, none: 36 },
  NL: { catholic: 18, mainline: 14, evangelical: 2, sunni: 5, hindu: 0.6, buddhist: 0.3, reformJewish: 0.2, none: 58 },
  SE: { lutheran: 52, catholic: 1.5, evangelical: 3, pentecostal: 1, orthodoxChristian: 1.5, sunni: 8, none: 33 },
  JP: { buddhist: 35, shinto: 25, evangelical: 0.5, catholic: 0.3, none: 40 },
  KR: { evangelical: 20, buddhist: 16, catholic: 11, none: 50 },
  MX: { catholic: 78, evangelical: 8, pentecostal: 3, lds: 0.3, none: 10 },
  PH: { catholic: 79, evangelical: 5, mainline: 1, sunni: 6, none: 1 },
  IN: { hindu: 79, sunni: 12, shia: 2, catholic: 1.5, evangelical: 1, sikh: 1.7, buddhist: 0.7, none: 0.5 },
  BR: { catholic: 50, evangelical: 20, pentecostal: 12, lds: 0.6, none: 10 },
  SG: { buddhist: 31, chineseFolk: 9, evangelical: 13, catholic: 6, sunni: 15, hindu: 5, sikh: 0.3, none: 20 },
  IL: { hasidic: 12, orthodoxJewish: 12, conservativeJewish: 25, reformJewish: 5, sunni: 18, orthodoxChristian: 1.5, catholic: 0.5, none: 22 },
  PS: { sunni: 97, orthodoxChristian: 1.5, catholic: 0.5, none: 1 },
  CN: { chineseFolk: 22, buddhist: 18, evangelical: 3.5, catholic: 0.5, sunni: 1.8, none: 52 },
  NG: { sunni: 48, catholic: 12, anglican: 10, pentecostal: 14, evangelical: 9, mainline: 3, none: 1 },
  KE: { catholic: 21, evangelical: 33, pentecostal: 10, anglican: 8, sunni: 11, none: 2 },
  ZA: { evangelical: 30, pentecostal: 15, mainline: 16, catholic: 7, anglican: 4, sunni: 2, hindu: 1, none: 15 },
  ID: { sunni: 87, evangelical: 7, catholic: 3, hindu: 1.7, buddhist: 0.7, none: 0.1 },
};
// Countries added as packs carry their own mix.
for (const p of PACKS) if (p.religion) RELIGION_MIX[p.id] ??= p.religion;

/** Religious upbringing at birth (by country): a tradition id, or null for none. */
export function upbringing(rng, countryId = 'US') {
  const mix = RELIGION_MIX[countryId];
  const options = mix
    ? Object.entries(mix).filter(([id]) => id === 'none' || TRADITIONS[id]).map(([id, w]) => ({ id: id === 'none' ? null : id, w }))
    : [...Object.entries(TRADITIONS).filter(([, t]) => t.weight > 0).map(([id, t]) => ({ id, w: t.weight })), { id: null, w: UNAFFILIATED_WEIGHT }];
  return rng.weighted(options, (o) => o.w).id;
}

/** A tradition's name where you are: the Anglican Church is the Church of England in England. */
const LOCAL_NAMES = {
  anglican: { GB: 'Church of England', IE: 'Church of Ireland', AU: 'Anglican Church of Australia', CA: 'Anglican Church of Canada', NZ: 'Anglican Church in Aotearoa', US: 'Episcopal Church', NG: 'Church of Nigeria (Anglican)', KE: 'Anglican Church of Kenya', ZA: 'Anglican Church of Southern Africa' },
  lutheran: { SE: 'Church of Sweden', DE: 'Evangelical Church in Germany (EKD)' },
  mainline: { NL: 'Protestant Church in the Netherlands', CA: 'United Church of Canada', AU: 'Uniting Church', NZ: 'Presbyterian Church', GB: 'Methodist / Church of Scotland', ZA: 'Methodist / Dutch Reformed' },
};
export const traditionName = (id, countryId = 'US') => LOCAL_NAMES[id]?.[countryId] ?? TRADITIONS[id]?.name ?? id;

/** Clergy title for a career level in your tradition. */
export const clergyTitle = (traditionId, levelId) => TRADITIONS[traditionId]?.clergy?.titles?.[levelId] ?? null;

/** Can you be ordained in your tradition? */
export function clergyEligibility(state) {
  const faith = state.community?.faith;
  if (!faith) return { ok: false, reason: 'Belong to a congregation first' };
  const t = TRADITIONS[faith.traditionId];
  if (t.clergy.lay) return { ok: false, reason: `${t.name} has no paid clergy (lay leadership only)` };
  if (state.character.age - faith.joinedAge < 3 && !faith.raised) return { ok: false, reason: '3 years of membership required' };
  if (t.clergy.maleOnly && state.character.gender !== 'male') return { ok: false, reason: `${t.name} ordains only men` };
  if (t.clergy.celibate && (state.people?.list ?? []).some((p) => p.alive && p.relation === 'spouse')) return { ok: false, reason: `${t.name} priests must be celibate and unmarried` };
  return { ok: true };
}

const ANGLICAN = ['St Mary\'s', 'All Saints', 'St Peter\'s', 'Holy Trinity', 'St John the Baptist', 'Christ Church', 'St Andrew\'s'];
const SAINTS = ['St. Mark\'s', 'St. Anne\'s', 'St. Joseph\'s', 'Holy Cross', 'Our Lady of Grace', 'St. Michael\'s', 'Sacred Heart'];
const PLACES = ['Grace', 'Trinity', 'Cornerstone', 'New Hope', 'Riverside', 'First', 'Calvary', 'Faith', 'Living Water', 'Harvest'];
const HEBREW = ['Beth Shalom', 'Temple Emanuel', 'Beth El', 'Tikvah', 'Ohev Sholom', 'B\'nai Israel'];
const ARABIC = ['Al-Noor', 'Al-Rahman', 'Dar Al-Salam', 'Al-Huda', 'Masjid Ibrahim'];

/** A plausible congregation name for a tradition. */
export function congregationName(rng, traditionId) {
  const t = TRADITIONS[traditionId];
  if (t.group === 'Jewish') return `${rng.pick(HEBREW)} ${t.house}`;
  if (t.group === 'Muslim') return `${rng.pick(ARABIC)} ${t.house}`;
  if (['catholic', 'tradCatholic', 'orthodoxChristian', 'anglican'].includes(traditionId)) return `${rng.pick(traditionId === 'anglican' ? ANGLICAN : SAINTS)} ${t.house}`;
  if (traditionId === 'lds') return `${rng.pick(['Maple Ridge', 'Cedar Hills', 'Oak Grove', 'Riverbend'])} ${t.house}`;
  if (traditionId === 'polygamistSect') return `The ${rng.pick(['Priesthood', 'United Order', 'Restored Covenant'])} ${t.house}`;
  if (t.group === 'Christian' || t.group === 'Other') return `${rng.pick(PLACES)} ${t.house}`;
  const pool = { Shinto: ['Hachiman', 'Inari', 'Tenmangū', 'Hie'], Folk: ['Thian Hock Keng', 'City God', 'Mazu', 'Guan Di'], Hindu: ['Sri Ganesha', 'Sri Venkateswara', 'Shiva Vishnu', 'Hindu Community'], Buddhist: ['Lotus', 'Golden Light', 'Mountain Rain', 'Insight Meditation'], Sikh: ['Guru Nanak', 'Sikh Society', 'Khalsa'] }[t.group] ?? ['Lakeside', 'Valley', 'Peace', 'Cedar'];
  return `${rng.pick(pool)} ${t.house}`;
}

/** Lay leadership title by tradition group. */
export const LAY_ROLE = { Shinto: 'Shrine Parishioner Representative (Ujiko Sōdai)', Folk: 'Temple Committee Member', Christian: 'Deacon', Jewish: 'Synagogue Board Member', Muslim: 'Masjid Board Member', Hindu: 'Temple Trustee', Buddhist: 'Sangha Council Member', Sikh: 'Gurdwara Committee Member', Other: 'Board Trustee' };

/** A membership record. */
export const membership = (traditionId, congregation, age, { raised = false, attendance = 'regular' } = {}) => ({ traditionId, congregation, attendance, joinedAge: age, raised, role: null, devoutYears: 0 });

/** Fresh community slice (raised in a tradition, or not). */
export function newCommunity(traditionId = null, congregation = null, age = 0) {
  return {
    upbringing: traditionId,
    faith: traditionId ? membership(traditionId, congregation, age, { raised: true, attendance: TRADITIONS[traditionId].fundamentalist ? 'devout' : 'regular' }) : null,
    giving: traditionId && TRADITIONS[traditionId].fundamentalist ? 10 : 0,
    givenThisYear: 0,
    volunteering: [],
    volunteerYears: 0,
    mentoring: null,
    mentorYears: 0,
    former: [],
  };
}
