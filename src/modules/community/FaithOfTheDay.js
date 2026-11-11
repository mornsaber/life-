/**
 * Faith and community of their day: who belonged to a church at all, what an established church
 * barred others from, the states that persecuted faiths, the emptying of the pews after the 1960s,
 * and the clubs and societies people joined.
 *
 *   Belonging     before the 1960s nearly everyone in the West was raised in a faith: having
 *                 none was rare, and in the Soviet bloc it was the state's own creed.
 *   Established   the Church of England: until 1828–29 dissenters and Catholics couldn't hold
 *   churches      office (Jews until 1858), and Oxford and Cambridge took only Anglicans until
 *                 1871. Ireland and Sweden had their own.
 *   Persecution   the Soviet state's official atheism (churchgoers passed over at work); the
 *                 persecution of Jews in Nazi Germany and the lands it occupied, 1933–45.
 *   Decline       from 1965 in the West, regular churchgoers become Christmas-and-funerals ones.
 *   Societies     friendly societies (sick pay before the welfare state), Masonic lodges,
 *                 temperance societies, the Women's Institute, Scouts and Guides, Rotary, Lions,
 *                 Elks, the Grange, working men's clubs: dates, who could join, dues and what
 *                 they did for you.
 *
 * state.faithDay = { seed, clubs: [{ id, since }], eraChecked, persecuted, fled, atheismAsked }
 * Its own random stream: the rest of the year rolls as it always did.
 */
import { Random } from '../../core/Random.js';
import { yearNow, PRESENT } from '../world/Eras.js';
import { TRADITIONS, RELIGION_MIX, congregationName, newCommunity } from './Religions.js';
import { ADMISSION_HOOKS } from '../education/EducationEngine.js';
import { arrive } from '../world/Migration.js';
import { COUNTRIES } from '../world/Countries.js';

const cc = (state) => state.character?.countryId ?? 'US';
const WEST = ['GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'FR', 'DE', 'NL', 'BE', 'LU', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IS', 'IT', 'ES', 'PT'];
const SOVIET = ['RU', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'EE', 'LV', 'LT'];
const BLOC = ['PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'AL', 'DD', 'MN', 'CN', 'VN', 'KP', 'CU'];

/** Official atheism: the years a state discouraged religion. */
export function officialAtheism(state) {
  const y = yearNow(state);
  const c = cc(state);
  if (SOVIET.includes(c)) return (c === 'EE' || c === 'LV' || c === 'LT' ? y >= 1945 : y >= 1922) && y < 1988;
  if (c === 'AL') return y >= 1967 && y < 1990;
  if (BLOC.includes(c)) return y >= 1949 && y < (['CN', 'VN', 'KP', 'CU'].includes(c) ? 1979 : 1989);
  return false;
}

/** How much of the modern share of "no religion" there was in a year (1 = today's). */
export function unbeliefScale(state) {
  const y = yearNow(state);
  if (!state?.era || y >= 1990) return 1;
  if (officialAtheism(state)) return 1;
  return y < 1900 ? 0.03 : y < 1945 ? 0.08 : y < 1965 ? 0.15 : 0.45;
}

/** Established churches and what they barred others from: [traditionId, { office: [[groupOrIds, until]], university: until }]. */
const ESTABLISHED = {
  GB: { church: 'anglican', office: [['catholic', 1829], ['Jewish', 1858], ['other', 1828]], university: 1871 },
  IE: { church: 'anglican', office: [['catholic', 1829], ['Jewish', 1858], ['other', 1828]], university: 1873 },
  SE: { church: 'lutheran', office: [['any', 1870]], university: 1870 },
  DK: { church: 'lutheran', office: [['any', 1849]] },
  NO: { church: 'lutheran', office: [['any', 1851]] },
};
export const establishedHere = (state) => ESTABLISHED[cc(state)] ?? null;

/** Why your faith bars you, here and now, from 'office' or 'university' (null if it doesn't). */
export function faithBar(state, what) {
  const e = establishedHere(state);
  if (!e || !state.era) return null;
  const y = yearNow(state);
  const tid = state.community?.faith?.traditionId ?? state.community?.upbringing;
  if (!tid || tid === e.church) return null;
  const group = TRADITIONS[tid]?.group;
  const church = TRADITIONS[e.church]?.name ?? 'the established church';
  if (what === 'university') return e.university && y < e.university ? `The universities here take only members of the ${church} (until ${e.university})` : null;
  for (const [who, until] of e.office) {
    if (y >= until) continue;
    const hit = who === 'any' || who === tid || who === group || (who === 'other' && group === 'Christian' && !['catholic', 'tradCatholic', 'orthodoxChristian'].includes(tid));
    if (hit) return `Public office here is closed to ${group === 'Jewish' ? 'Jews' : tid === 'catholic' ? 'Catholics' : 'those outside the established church'} until ${until}`;
  }
  return null;
}

/** Persecution of Jews under Nazi rule: [country, from, until]. */
const NAZI_RULE = { DE: [1933, 1945], AT: [1938, 1945], CZ: [1939, 1945], PL: [1939, 1945], NL: [1940, 1945], BE: [1940, 1944], LU: [1940, 1944], FR: [1940, 1944], NO: [1940, 1945], DK: [1943, 1945], GR: [1941, 1944], RS: [1941, 1944], HU: [1944, 1945], IT: [1943, 1945] };
export function persecutedAsJew(state) {
  const tid = state.community?.faith?.traditionId ?? state.community?.upbringing;
  if (TRADITIONS[tid]?.group !== 'Jewish') return false;
  const r = NAZI_RULE[cc(state)];
  const y = yearNow(state);
  return Boolean(r && y >= r[0] && y < r[1]);
}

/* ------------------------------------------------------------------ */
/* Clubs and societies                                                 */
/* ------------------------------------------------------------------ */
const BRIT = ['GB', 'IE', 'AU', 'NZ', 'CA', 'ZA'];
const ANGLO = [...BRIT, 'US'];
/**
 * from/until: years open. countries: where (null = most places). gender: 'male'|'female', and
 * mixedFrom: the year it took the other sex too. perk: what it does each year.
 */
export const CLUBS = {
  friendly: { name: 'Friendly society (the Oddfellows)', icon: '🤝', from: 1810, until: 1948, countries: [...ANGLO, 'DE', 'FR', 'NL', 'BE', 'DK', 'SE'], minAge: 16, dues: 40, perk: 'sick', desc: 'A few pennies a week: sick pay if you can\'t work, and money to bury you.' },
  masons: { name: 'Masonic lodge', icon: '📐', from: 1717, countries: null, gender: 'male', minAge: 21, dues: 150, perk: 'network', desc: 'Ritual, charity and dinners; a brother in every trade.' },
  temperance: { name: 'Temperance society', icon: '🚱', from: 1826, until: 1940, countries: [...ANGLO, 'SE', 'NO', 'FI', 'DK'], minAge: 10, dues: 5, perk: 'pledge', desc: 'Sign the pledge: no drink, and meetings with hymns and lectures.' },
  wi: { name: 'Women\'s Institute', icon: '🫙', from: 1897, countries: BRIT, gender: 'female', minAge: 16, dues: 15, perk: 'friends', fromHere: { GB: 1915, IE: 1910, AU: 1922, NZ: 1921, CA: 1897, ZA: 1930 }, desc: 'Jam, talks, campaigns and company.' },
  womensClub: { name: 'Women\'s club', icon: '☕', from: 1890, countries: ['US'], gender: 'female', minAge: 18, dues: 30, perk: 'friends', desc: 'Lectures, libraries and reform campaigns.' },
  scouts: { name: 'Scouts', icon: '⚜️', from: 1908, countries: null, gender: 'male', mixedFrom: 1976, minAge: 8, maxAge: 17, dues: 10, perk: 'outdoors', desc: 'Camps, knots and badges.' },
  guides: { name: 'Girl Guides', icon: '🌼', from: 1910, countries: null, gender: 'female', minAge: 7, maxAge: 17, dues: 10, perk: 'outdoors', desc: 'Camps, badges and service.' },
  rotary: { name: 'Rotary Club', icon: '⚙️', from: 1905, countries: null, gender: 'male', mixedFrom: 1987, minAge: 25, dues: 300, perk: 'network', desc: 'Weekly lunches with the town\'s business and professional people; charity.' },
  lions: { name: 'Lions Club', icon: '🦁', from: 1917, countries: null, gender: 'male', mixedFrom: 1987, minAge: 21, dues: 120, perk: 'network', desc: 'Service projects and fundraising.' },
  elks: { name: 'Elks Lodge', icon: '🦌', from: 1868, countries: ['US'], gender: 'male', mixedFrom: 1995, minAge: 21, dues: 80, perk: 'social', desc: 'A bar, a hall and charity.' },
  grange: { name: 'The Grange', icon: '🌾', from: 1867, countries: ['US'], minAge: 14, dues: 20, perk: 'farm', rural: true, desc: 'Farmers\' fraternity: co-operative buying and suppers.' },
  wmc: { name: 'Working men\'s club', icon: '🍺', from: 1862, countries: ['GB'], gender: 'male', mixedFrom: 2007, minAge: 18, dues: 20, perk: 'social', desc: 'Cheap beer, bingo, snooker and a turn on a Saturday.' },
};

/** Whether you can join a club here and now (ok, reason). */
export function clubEligibility(state, id) {
  const c = CLUBS[id];
  if (!c) return { ok: false, reason: 'No such club' };
  const y = yearNow(state);
  const here = cc(state);
  const from = c.fromHere?.[here] ?? c.from;
  if (state.era && y < from) return { ok: false, reason: `Founded in ${from}` };
  if (state.era && c.until && y >= c.until) return { ok: false, reason: 'Past its day' };
  if (c.countries && !c.countries.includes(here)) return { ok: false, reason: 'Not here' };
  const age = state.character.age;
  if (age < c.minAge) return { ok: false, reason: `From age ${c.minAge}` };
  if (c.maxAge && age > c.maxAge) return { ok: false, reason: 'For children' };
  if (c.gender && state.character.gender !== c.gender && !(c.mixedFrom && y >= c.mixedFrom)) return { ok: false, reason: c.gender === 'male' ? 'Men only' : 'Women only' };
  if (id === 'temperance' && officialAtheism(state)) return { ok: false, reason: 'Not here' };
  return { ok: true };
}
export const clubsOf = (state) => state.faithDay?.clubs ?? [];
/** The clubs that exist here and now (for the card), whether or not you can join. */
export const clubsHere = (state) => Object.keys(CLUBS).filter((id) => { const r = clubEligibility(state, id).reason; return !['Not here', 'Past its day'].includes(r) && !/^Founded/.test(r ?? ''); });

const frng = (state) => {
  state.faithDay ??= { clubs: [] };
  state.faithDay.seed = ((state.faithDay.seed ?? (((state.world?.seed ?? 3) * 3266489917) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(state.faithDay.seed);
};

// Before 1871 Oxford and Cambridge (and their like) took only the established church.
ADMISSION_HOOKS.push({
  eligibility(state, programId) {
    if (!['bachelor', 'master', 'phd', 'jd', 'md'].includes(programId)) return null;
    return faithBar(state, 'university');
  },
});

function clubYear(ctx) {
  const { state } = ctx;
  const fd = state.faithDay;
  fd.clubs = fd.clubs.filter((m) => {
    const c = CLUBS[m.id];
    if (!c) return false;
    if (c.maxAge && state.character.age > c.maxAge) { ctx.log(`You grew out of the ${c.name}.`, c.icon, 'info'); return false; }
    if (state.era && c.until && yearNow(state) >= c.until) { ctx.log(`The ${c.name} wound up.`, c.icon, 'info'); return false; }
    return true;
  });
  for (const m of fd.clubs) {
    const c = CLUBS[m.id];
    ctx.spend(c.dues, `${c.name} dues`, { allowDebt: true });
    if (c.perk === 'sick' && state.stats.health < 45) {
      const pay = Math.round(c.dues * 12);
      ctx.earn(pay, 'Friendly society sick pay');
      ctx.log(`Ill and off work, you drew $${pay.toLocaleString()} sick pay from your friendly society.`, c.icon, 'good');
    }
    if (c.perk === 'pledge') ctx.stat('health', 1);
    if (c.perk === 'friends' || c.perk === 'social') ctx.stat('happiness', 1);
    if (c.perk === 'outdoors') { ctx.stat('health', 1); ctx.stat('happiness', 1); }
    if (c.perk === 'network' && state.career?.job && typeof state.career.job.performance === 'number') state.career.job.performance = Math.min(100, state.career.job.performance + 2);
    if (c.perk === 'social') ctx.stat('stress', -1);
  }
}

export const FaithOfTheDayModule = {
  id: 'faithDay',
  order: 14.2,
  init(state) {
    state.faithDay ??= { clubs: [] };
    state.faithDay.clubs ??= [];
    const fd = state.faithDay;
    // Raised in a faith, as nearly everyone was before the 1960s.
    if (state.community && state.era && !fd.eraChecked && state.character.age === 0) {
      fd.eraChecked = true;
      const scale = unbeliefScale(state);
      if (state.community.upbringing == null && scale < 1) {
        const rng = frng(state);
        if (!rng.chance(scale)) {
          const mix = Object.entries(RELIGION_MIX[cc(state)] ?? { mainline: 1 }).filter(([id]) => id !== 'none' && TRADITIONS[id]);
          if (mix.length) {
            const t = rng.weighted(mix, ([, w]) => w)[0];
            Object.assign(state.community, newCommunity(t, congregationName(rng, t), 0), { mentorYears: state.community.mentorYears ?? 0 });
          }
        }
      }
    }
  },
  guard(state, actionId) {
    if (actionId === 'politics.run') return faithBar(state, 'office');
    return null;
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.community) return;
    const fd = state.faithDay ?? (state.faithDay = { clubs: [] });
    const rng = frng(state);
    const y = yearNow(state);
    const faith = state.community.faith;
    if (state.era && y < PRESENT) {
      // The pews empty.
      if (faith && faith.attendance === 'regular' && WEST.includes(cc(state)) && y >= 1965 && rng.chance(0.04)) {
        faith.attendance = 'occasional';
        ctx.log('Like most of your neighbours, you\'ve stopped going to church every Sunday: Christmas, weddings and funerals now.', '🕯️', 'info');
      }
      // Official atheism.
      if (faith && officialAtheism(state) && state.character.age >= 16 && faith.attendance !== 'occasional') {
        if (!fd.atheismAsked) {
          fd.atheismAsked = y;
          ctx.prompt({
            type: 'faithDay.atheism', icon: '☦️', title: 'Faith Under an Atheist State',
            text: 'The state teaches that religion is a relic. Churchgoers are noted at work and in the Party; their children can be kept out of university. What will you do?',
            data: {},
            options: [
              { id: 'quiet', label: '🕯️ Keep the faith quietly', hint: 'At home, and at church on the great feasts' },
              { id: 'open', label: '⛪ Keep going to church openly', hint: 'It will cost you at work' },
            ],
          });
        } else if (rng.chance(0.15)) {
          ctx.log('A meeting at work criticized your churchgoing. Someone else got the promotion.', '📋', 'warn');
          ctx.stat('stress', 4);
          if (typeof state.career?.job?.performance === 'number') state.career.job.performance = Math.max(0, state.career.job.performance - 5);
        }
      }
      // Persecution of Jews under Nazi rule.
      if (persecutedAsJew(state) && !fd.fled) persecution(ctx, rng, y);
    }
    clubYear(ctx);
  },
  actions: {
    join(ctx, id) {
      const { state } = ctx;
      const r = clubEligibility(state, id);
      if (!r.ok) return ctx.toast(r.reason, 'warn');
      if (clubsOf(state).some((m) => m.id === id)) return ctx.toast('You\'re already a member.', 'info');
      if (clubsOf(state).length >= 3) return ctx.toast('Three clubs is enough for anyone.', 'warn');
      state.faithDay.clubs.push({ id, since: state.character.age });
      ctx.log(`You joined the ${CLUBS[id].name}.`, CLUBS[id].icon, 'good');
      ctx.stat('happiness', 2);
    },
    leave(ctx, id) {
      const { state } = ctx;
      if (!clubsOf(state).some((m) => m.id === id)) return;
      state.faithDay.clubs = clubsOf(state).filter((m) => m.id !== id);
      ctx.log(`You let your membership of the ${CLUBS[id].name} lapse.`, CLUBS[id].icon, 'info');
    },
  },
  resolvers: {
    atheism(ctx, data, optionId) {
      const faith = ctx.state.community?.faith;
      if (!faith) return;
      if (optionId === 'quiet') { faith.attendance = 'occasional'; ctx.log('You keep your faith at home: icons in a corner, and church on Easter night.', '🕯️', 'info'); }
      else { ctx.log('You go to church openly. People at work have noticed.', '⛪', 'warn'); ctx.stat('stress', 3); }
    },
    flee(ctx, data, optionId) {
      const { state } = ctx;
      const fd = state.faithDay;
      if (optionId === 'stay') { ctx.log('You stay, hoping it will pass.', '🕯️', 'warn'); return; }
      const to = optionId;
      if (!COUNTRIES[to]) return;
      const rng = frng(state);
      // Visas were scarce: quotas, sponsors, money.
      const odds = (to === 'US' ? 0.45 : to === 'GB' ? 0.55 : 0.6) + (state.people?.wealth === 'upper' ? 0.2 : 0);
      if (!rng.chance(odds)) { fd.refused = (fd.refused ?? 0) + 1; ctx.log(`Your application for a visa to ${COUNTRIES[to].name} was refused: the quota is full.`, '📮', 'bad'); ctx.stat('stress', 6); return; }
      fd.fled = yearNow(state);
      arrive(ctx, to, { visa: 'asylum', reason: `You got out. You reached ${COUNTRIES[to].name} with one suitcase, and much of your family still behind.` });
      ctx.stat('happiness', -6);
    },
  },
};

function persecution(ctx, rng, y) {
  const { state } = ctx;
  const fd = state.faithDay;
  const age = state.character.age;
  if (!fd.persecuted) {
    fd.persecuted = y;
    ctx.log('The new regime\'s laws single out Jews: shops boycotted, jobs and schools closed to you, citizenship taken away.', '✡️', 'bad');
    if (state.career?.job) ctx.emit('career:resign', { reason: 'Dismissed under the racial laws' });
    ctx.stat('happiness', -8);
    ctx.stat('stress', 10);
  }
  if (age >= 16 && !state.prompts.some((p) => p.type === 'faithDay.flee')) {
    const late = y >= 1941;
    ctx.prompt({
      type: 'faithDay.flee', icon: '🧳', title: late ? 'The Deportations Have Begun' : 'Leave While You Can?',
      text: late ? 'The borders are all but closed. Neighbours have been taken east and not heard from again.' : 'Families you know are leaving: if a country will give you a visa, you could go.',
      data: {},
      options: [
        { id: 'GB', label: `${COUNTRIES.GB?.flag ?? ''} Apply to Britain`.trim() },
        { id: 'US', label: `${COUNTRIES.US?.flag ?? ''} Apply to America`.trim() },
        { id: 'stay', label: '🕯️ Stay', tone: 'danger' },
      ],
    });
  }
  // From 1941, deportation: most did not survive.
  if (y >= 1941 && rng.chance(age < 16 ? 0.3 : 0.45)) {
    ctx.log('You were deported to a camp in the east.', '🕯️', 'bad');
    ctx.die('Murdered in the Holocaust');
  }
}
