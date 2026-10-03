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
 * Pure data and helpers (no module imports) so the job tree can use them.
 */
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
  unitarian: { name: 'Unitarian Universalist', icon: '🕯️', group: 'Other', weight: 0.3, house: 'Fellowship', clergy: { titles: { seminarian: 'Intern Minister', associate: 'Associate Minister', minister: 'Minister', senior: 'Senior Minister', regional: 'District Executive', chaplain: 'Chaplain' } } },
};

/**
 * Share raised with no religion. About 3 in 10 adults are "nones" today, but
 * most of them were raised in a faith and left; only ≈1 in 8 grew up without one.
 */
export const UNAFFILIATED_WEIGHT = 9;

/** Religious upbringing at birth: a tradition id, or null for none. */
export function upbringing(rng) {
  const options = [...Object.entries(TRADITIONS).filter(([, t]) => t.weight > 0).map(([id, t]) => ({ id, w: t.weight })), { id: null, w: UNAFFILIATED_WEIGHT }];
  return rng.weighted(options, (o) => o.w).id;
}

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

const SAINTS = ['St. Mark\'s', 'St. Anne\'s', 'St. Joseph\'s', 'Holy Cross', 'Our Lady of Grace', 'St. Michael\'s', 'Sacred Heart'];
const PLACES = ['Grace', 'Trinity', 'Cornerstone', 'New Hope', 'Riverside', 'First', 'Calvary', 'Faith', 'Living Water', 'Harvest'];
const HEBREW = ['Beth Shalom', 'Temple Emanuel', 'Beth El', 'Tikvah', 'Ohev Sholom', 'B\'nai Israel'];
const ARABIC = ['Al-Noor', 'Al-Rahman', 'Dar Al-Salam', 'Al-Huda', 'Masjid Ibrahim'];

/** A plausible congregation name for a tradition. */
export function congregationName(rng, traditionId) {
  const t = TRADITIONS[traditionId];
  if (t.group === 'Jewish') return `${rng.pick(HEBREW)} ${t.house}`;
  if (t.group === 'Muslim') return `${rng.pick(ARABIC)} ${t.house}`;
  if (['catholic', 'tradCatholic', 'orthodoxChristian'].includes(traditionId)) return `${rng.pick(SAINTS)} ${t.house}`;
  if (traditionId === 'lds') return `${rng.pick(['Maple Ridge', 'Cedar Hills', 'Oak Grove', 'Riverbend'])} ${t.house}`;
  if (traditionId === 'polygamistSect') return `The ${rng.pick(['Priesthood', 'United Order', 'Restored Covenant'])} ${t.house}`;
  if (t.group === 'Christian' || t.group === 'Other') return `${rng.pick(PLACES)} ${t.house}`;
  const pool = { Hindu: ['Sri Ganesha', 'Sri Venkateswara', 'Shiva Vishnu', 'Hindu Community'], Buddhist: ['Lotus', 'Golden Light', 'Mountain Rain', 'Insight Meditation'], Sikh: ['Guru Nanak', 'Sikh Society', 'Khalsa'] }[t.group] ?? ['Lakeside', 'Valley', 'Peace', 'Cedar'];
  return `${rng.pick(pool)} ${t.house}`;
}

/** Lay leadership title by tradition group. */
export const LAY_ROLE = { Christian: 'Deacon', Jewish: 'Synagogue Board Member', Muslim: 'Masjid Board Member', Hindu: 'Temple Trustee', Buddhist: 'Sangha Council Member', Sikh: 'Gurdwara Committee Member', Other: 'Board Trustee' };

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
