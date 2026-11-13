/**
 * How you'll be remembered: the person you are, and what's left of you afterwards.
 *
 *   Temperament  two traits you're born with (ambitious, kind, reckless, devout…). The next
 *                generation often takes after the last: an heir inherits one of the parent's
 *                traits half the time. They nudge the stats a little each year.
 *   Epithet      what the family calls you afterwards — "the Builder", "the Black Sheep",
 *                "the Statesman" — from the life you led, or your temperament if nothing stood out.
 *   Memoirs      in later life, if anyone would read them: by subscription before 1850, a
 *                publisher's advance after, a ghostwriter from 1950. They sell, and they settle
 *                scores (a feud with a relative they named).
 *   Named after  a street, a school, a scholarship, a hospital wing, a statue, an airport —
 *     you        each from its time (no airports before 1950, scholarships from 1900), for
 *                the famous, the powerful and the generous.
 *   The funeral  of its day: Victorian full mourning (1840–1914), a state funeral for a head of
 *                state or government, military honours (the Last Post, Taps from 1891),
 *                cremation once it was legal and usual, a "celebration of life" from 1990.
 *   Judged again later generations see the ancestors with new eyes: from 2000 a statue of a
 *                colonial governor or an autocrat's minister may come down; a political prisoner
 *                gets a street once their country is free.
 *
 * state.remembered = { temperament: [id, id], memoir: { year, title, sold } | null,
 *                      namedAfter: [{ kind, name, year, removed? }], funeral: text | null,
 *                      judged: [ancestorIndex] }
 * Ancestors carry { temperament, epithet, namedAfter, funeral, deeds } (Legacy.js ancestorRecord).
 */
import { Random, clamp } from '../../core/Random.js';
import { addLog, netWorth, hasFelony } from '../../core/State.js';
import { yearNow, statePensionExists } from '../world/Eras.js';
import { fameScore, addBuzz } from '../life/Fame.js';
import { familyPrestige } from './FamilyLegacy.js';
import { OFFICES } from '../politics/Offices.js';
import { NATIONAL_OFFICES } from '../politics/NationalOffices.js';
import { REGIONS } from '../life/Regions.js';
import { regimeOf } from '../world/Regimes.js';
import { OFFENSES } from '../legal/Offenses.js';
import { priceLevel } from '../world/Countries.js';
import { allBusinesses } from '../business/Capital.js';

export const TEMPERAMENTS = {
  ambitious: { label: 'Ambitious', icon: '🧗', epithet: 'the Ambitious', stat: ['smarts', 0.3] },
  kind: { label: 'Kind', icon: '🤲', epithet: 'the Kind', stat: ['happiness', 0.5] },
  reckless: { label: 'Reckless', icon: '🎲', epithet: 'the Wild', stat: ['health', -0.3] },
  thrifty: { label: 'Thrifty', icon: '🪙', epithet: 'the Careful', stat: ['stress', -0.3] },
  charming: { label: 'Charming', icon: '😊', epithet: 'the Charming', stat: ['looks', 0.2] },
  stubborn: { label: 'Stubborn', icon: '🪨', epithet: 'the Stubborn', stat: ['stress', 0.3] },
  devout: { label: 'Devout', icon: '🙏', epithet: 'the Pious', stat: ['happiness', 0.3] },
  curious: { label: 'Curious', icon: '🔭', epithet: 'the Curious', stat: ['smarts', 0.5] },
  cheerful: { label: 'Cheerful', icon: '🌞', epithet: 'the Cheerful', stat: ['happiness', 0.8] },
  melancholy: { label: 'Melancholy', icon: '🌧️', epithet: 'the Melancholy', stat: ['happiness', -0.6] },
};
const IDS = Object.keys(TEMPERAMENTS);

const side = (state, salt) => new Random(((state.world?.seed ?? 7) * 2654435761 + (state.character.birthYear ?? 0) * 97 + state.character.age * 131 + salt) >>> 0);
export const rememberedOf = (state) => (state.remembered ??= { temperament: null, memoir: null, namedAfter: [], funeral: null, judged: [] });
const officeDef = (id) => OFFICES[id] ?? NATIONAL_OFFICES[id] ?? null;
const town = (state) => (REGIONS[state.character.regionId]?.name ?? 'your town').split(',')[0];

/** Two traits: one from the parent half the time (the last ancestor's), the rest by chance. */
export function assignTemperament(state) {
  const r = rememberedOf(state);
  if (r.temperament) return r.temperament;
  const rng = side(state, 11);
  const parent = state.lineage?.ancestors?.at(-1)?.temperament ?? [];
  const first = parent.length && rng.chance(0.5) ? rng.pick(parent) : rng.pick(IDS);
  let second = rng.pick(IDS);
  for (let i = 0; i < 6 && (second === first || (first === 'cheerful' && second === 'melancholy') || (first === 'melancholy' && second === 'cheerful')); i++) second = rng.pick(IDS);
  r.temperament = [first, second];
  return r.temperament;
}

/** The highest office you held (now or before), by level. */
function topOffice(state) {
  const ids = [...(state.politics?.history ?? []).map((h) => h.officeId), state.politics?.office?.id].filter(Boolean);
  return ids.map(officeDef).filter(Boolean).sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0] ?? null;
}
const headOf = (state) => Boolean(state.royal?.level === 'monarch' || (state.politics?.history ?? []).concat(state.politics?.office ? [state.politics.office] : []).some((h) => { const o = officeDef(h.officeId ?? h.id); return o && (o.leader || o.level >= 5); }));
const flagOfficer = (state) => [...(state.military?.history ?? []), state.military?.service].filter(Boolean).some((m) => /General|Admiral|Marshal|Air Chief/.test(m.rankTitle ?? ''));
const founded = (state) => (state.business?.history?.length ?? 0) + allBusinesses(state).length;

/** Who you were, to the people who came after: one epithet. */
export function epithetOf(state) {
  const felonies = (state.legal?.record ?? []).filter((r) => r.severity === 'felony').length;
  const worth = netWorth(state) / priceLevel(state);
  const kids = (state.people?.list ?? []).filter((p) => p.relation === 'child').length;
  const female = state.character.gender === 'female';
  if (state.royal?.level === 'monarch') return (state.royal.popularity ?? 50) >= 70 ? (female ? 'the Great' : 'the Great') : (state.royal.popularity ?? 50) < 30 ? 'the Unloved' : 'the Steady';
  if ((state.underworld?.me?.rank ?? 0) >= 4) return female ? 'the Godmother' : 'the Godfather';
  if (felonies >= 3) return female ? 'the Black Sheep' : 'the Black Sheep';
  if (headOf(state)) return 'the Statesman';
  if (flagOfficer(state)) return 'the General';
  if (topOffice(state)?.level >= 3) return 'the Politician';
  if (worth >= 10_000_000) return 'the Rich';
  if (founded(state) >= 2) return 'the Builder';
  if (fameScore(state) >= 60) return 'the Famous';
  if ((state.honors ?? []).length >= 3) return 'the Honoured';
  if (state.character.age >= 95) return 'the Long-Lived';
  if (kids >= 6) return female ? 'the Matriarch' : 'the Patriarch';
  if (worth < 0) return 'the Unlucky';
  const t = rememberedOf(state).temperament?.[0];
  return TEMPERAMENTS[t]?.epithet ?? 'the Quiet';
}

/** What later generations may hold against you (or honour you for). */
export function deedsOf(state) {
  const d = new Set();
  const jobs = [...(state.career?.history ?? []), state.career?.job].filter(Boolean);
  if (jobs.some((j) => /colonial|gurkha/i.test(j.professionId ?? ''))) d.add('colonial');
  const offices = [...(state.politics?.history ?? []), ...(state.politics?.office ? [state.politics.office] : [])];
  if (offices.length && regimeOf(state.character.countryId ?? 'US')?.kind && !['democracy', 'monarchy'].includes(regimeOf(state.character.countryId ?? 'US').kind)) d.add('autocrat');
  if (hasFelony(state, { purpose: 'border' })) d.add('felon');
  if ((state.legal?.record ?? []).some((r) => OFFENSES[r.offenseId]?.political)) d.add('dissident');
  return [...d];
}

/** Things named after you: what's possible in this year, and how much standing it takes. */
const NAMINGS = [
  { kind: 'street', from: 1800, need: 30, name: (s) => `${s.character.lastName} Street` },
  { kind: 'school', from: 1870, need: 45, name: (s) => `the ${s.character.firstName} ${s.character.lastName} School` },
  { kind: 'scholarship', from: 1900, need: 35, rich: true, name: (s) => `the ${s.character.lastName} Scholarship` },
  { kind: 'hospital wing', from: 1900, need: 40, rich: true, name: (s) => `the ${s.character.lastName} Wing` },
  { kind: 'statue', from: 1820, need: 70, name: (s) => `a statue of ${s.character.firstName} ${s.character.lastName}` },
  { kind: 'airport', from: 1950, need: 90, head: true, name: (s) => `${s.character.firstName} ${s.character.lastName} International Airport` },
];
/** Standing: the best of fame, the family's prestige, office and fortune (0–100). */
export function standing(state) {
  const office = topOffice(state);
  const worth = netWorth(state) / priceLevel(state);
  return Math.round(Math.max(fameScore(state), familyPrestige(state) * 1.2, (office?.level ?? 0) * 17 + (headOf(state) ? 15 : 0), worth >= 50_000_000 ? 60 : worth >= 5_000_000 ? 40 : 0, (state.honors ?? []).length * 12));
}

function namingTick(ctx) {
  const { state } = ctx;
  if (state.character.age < 40) return;
  const r = rememberedOf(state);
  const y = yearNow(state);
  const s = standing(state);
  const rich = netWorth(state) / priceLevel(state) >= 2_000_000;
  const open = NAMINGS.filter((n) => y >= n.from && s >= n.need && (!n.rich || rich) && (!n.head || headOf(state)) && !r.namedAfter.some((x) => x.kind === n.kind));
  if (!open.length || !side(state, 23).chance(0.12)) return;
  const n = open.sort((a, b) => b.need - a.need)[0];
  const name = n.name(state);
  r.namedAfter.push({ kind: n.kind, name, year: y, place: town(state) });
  if (n.rich) ctx.spend(Math.round(250000 * priceLevel(state)), `Endowing ${name}`, { allowDebt: false });
  ctx.log(n.rich ? `You endowed ${name} in ${town(state)}. It will carry your name long after you.` : `${town(state)} named ${name} after you.`, n.kind === 'statue' ? '🗽' : n.kind === 'airport' ? '✈️' : '🪧', 'milestone');
  ctx.stat('happiness', 6);
}

/** Memoirs: who can write them, and what they'd earn. */
export function memoirEligibility(state) {
  const r = rememberedOf(state);
  if (r.memoir) return { ok: false, reason: `You published "${r.memoir.title}" in ${r.memoir.year}` };
  if (state.character.age < 45) return { ok: false, reason: 'Memoirs come later in life (45+)' };
  if (standing(state) < 30) return { ok: false, reason: 'No publisher thinks anyone would read them yet' };
  return { ok: true };
}
const memoirTitle = (state, rng) => rng.pick([`A Life in ${topOffice(state) ? 'Public Service' : 'Full'}`, 'My Story', `Recollections of ${state.character.firstName} ${state.character.lastName}`, 'Looking Back', 'The Long Road', 'In My Own Words']);
function writeMemoir(ctx, mode) {
  const { state, rng } = ctx;
  const e = memoirEligibility(state);
  if (!e.ok) return ctx.toast(e.reason, 'warn');
  const y = yearNow(state);
  const title = memoirTitle(state, rng);
  const how = y < 1850 ? 'printed by subscription' : y < 1950 || mode !== 'ghost' ? 'written in your own hand' : 'with a ghostwriter';
  const advance = Math.round((y < 1850 ? 2000 : 10000) * (1 + standing(state) / 10) ** 1.6 * priceLevel(state) * (mode === 'tell' ? 1.6 : 1));
  const sold = Math.round(500 * (1 + standing(state) / 8) ** 2 * (0.5 + rng.next()) * (mode === 'tell' ? 1.5 : 1));
  rememberedOf(state).memoir = { year: y, title, sold, mode };
  ctx.earn(advance, y < 1850 ? 'Subscribers to your memoirs' : 'Memoir advance and royalties');
  addBuzz(state, mode === 'tell' ? 12 : 5);
  ctx.log(`Your memoirs, "${title}", ${how}, sold ${sold.toLocaleString()} copies.`, '📖', 'milestone');
  if (mode === 'tell') {
    const target = (state.people?.list ?? []).filter((p) => p.alive && ['sibling', 'child', 'spouse', 'ex', 'parent'].includes(p.relation)).sort(() => rng.next() - 0.5)[0];
    if (target) {
      target.relationship = clamp((target.relationship ?? 50) - rng.int(25, 45), 0, 100);
      ctx.log(`${target.firstName} read what you wrote about them. They haven't spoken to you since.`, '💢', 'bad');
    }
  }
}

/** The funeral of its day, for the life you led. */
export function funeralOf(state) {
  const y = yearNow(state);
  const cc = state.character.countryId ?? 'US';
  const served = (state.military?.history ?? []).length > 0 || Boolean(state.military?.service);
  if (state.royal?.level === 'monarch') return 'A state funeral: the lying-in-state, the gun carriage, the crowned heads of the world behind the coffin.';
  if (headOf(state)) return y < 1900 ? 'A state funeral: black-draped streets and a procession a mile long.' : 'A state funeral, broadcast live: the flag on the coffin and every former leader in the front pews.';
  const parts = [];
  if (y >= 1840 && y < 1915) parts.push('full Victorian mourning — black-plumed horses, mutes at the door, a year of crape for the widow');
  else if (y >= 1990) parts.push('a celebration of life, with photographs and a playlist');
  else parts.push(y < 1840 ? 'a parish burial, the bell tolling once for every year' : 'a church service and a burial');
  if (served) parts.push(cc === 'US' ? (y >= 1891 ? 'Taps played over the grave and the flag folded for the family' : 'a volley fired over the grave') : y >= 1867 && ['GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'IN'].includes(cc) ? 'the Last Post at the graveside' : 'a volley fired over the grave');
  const cremation = (cc === 'GB' ? 1885 : cc === 'US' ? 1876 : 1900);
  if (y >= cremation && y >= 1965 && side(state, 31).chance(cc === 'GB' || cc === 'JP' ? 0.7 : 0.4)) parts.push('and afterwards a cremation');
  const big = standing(state) >= 50;
  return `${big ? 'A crowded funeral' : 'A funeral'}: ${parts.join('; ')}.`;
}

/** Later generations judge the ancestors: statues come down, dissidents get streets. */
function judgeAncestors(ctx) {
  const { state } = ctx;
  const anc = state.lineage?.ancestors ?? [];
  if (!anc.length) return;
  const r = rememberedOf(state);
  const y = yearNow(state);
  const rng = side(state, 41);
  anc.forEach((a, i) => {
    if (r.judged.includes(i)) return;
    const deeds = a.deeds ?? [];
    const statue = (a.namedAfter ?? []).find((n) => ['statue', 'street', 'school'].includes(n.kind) && !n.removed);
    if (statue && y >= 2000 && deeds.some((d) => ['colonial', 'autocrat'].includes(d)) && rng.chance(0.08)) {
      r.judged.push(i);
      statue.removed = y;
      ctx.prompt({ type: 'remembered.reckoning', icon: '🗽', title: 'Your Ancestor, Judged Again', text: `There are calls to ${statue.kind === 'statue' ? 'take down' : 'rename'} ${statue.name}, after your ${a.gender === 'female' ? 'great-grandmother' : 'great-grandfather'} ${a.name} — for ${deeds.includes('colonial') ? 'the part they played in running an empire' : 'serving a regime that jailed its opponents'}. The family has been asked for a view.`, data: { i }, options: [
        { id: 'defend', label: '🛡️ Defend them in the papers', hint: 'The family name, against the mood of the times' },
        { id: 'museum', label: '🏛️ Ask that it go to a museum, with the history told', hint: 'A middle way' },
        { id: 'agree', label: '🤝 Agree it should go', hint: 'Some relatives won\'t forgive you' },
      ] });
      return;
    }
    if (deeds.includes('dissident') && regimeOf(state.character.countryId ?? 'US')?.kind === 'democracy' && a.country === (state.character.countryId ?? 'US') && y - (a.died ?? y) >= 1 && rng.chance(0.1)) {
      r.judged.push(i);
      (a.namedAfter ??= []).push({ kind: 'street', name: `${a.name.split(' ').at(-1)} Street`, year: y, rehabilitated: true });
      ctx.log(`Your ${a.gender === 'female' ? 'grandmother' : 'grandfather'} ${a.name}, jailed by the old regime, has been rehabilitated: a street now bears the family name in their honour.`, '🕊️', 'milestone');
      ctx.stat('happiness', 5);
    }
  });
}

/**
 * Old age before the pension: with no state pension yet, no work and no money, the old went to
 * their children, kept working while they could, or ended in the workhouse (Britain, until 1930)
 * or the county poorhouse (America, into the 1950s).
 */
function oldAgeTick(ctx) {
  const { state } = ctx;
  const y = yearNow(state);
  const cc = state.character.countryId ?? 'US';
  if (state.character.age < 68 || statePensionExists(state) || state.career?.job || state.remembered?.poorhouse) return;
  if ((state.finances?.cash ?? 0) > 300 * priceLevel(state) || state.prompts.some((p) => p.type === 'remembered.oldAge')) return;
  const child = (state.people?.list ?? []).find((p) => p.alive && p.relation === 'child' && (p.age ?? 0) >= 21);
  const house = cc === 'GB' || cc === 'IE' ? (y < 1930 ? 'the workhouse' : null) : cc === 'US' ? (y < 1955 ? 'the county poorhouse' : null) : 'the almshouse';
  if (!house && !child) return;
  ctx.prompt({ type: 'remembered.oldAge', icon: '🏚️', title: 'Old, and Nothing Put By', text: `There is no pension yet${cc === 'US' ? '' : ' for people like you'}, no work at your age, and the money has run out.`, data: {}, options: [
    ...(child ? [{ id: 'child', label: `🏡 Move in with ${child.firstName}`, hint: 'A room in their house, and their goodwill' }] : []),
    { id: 'work', label: '🧺 Keep working at whatever you can get', hint: 'Hard on the body' },
    ...(house ? [{ id: 'house', label: `🏚️ Go into ${house}`, hint: 'A roof and food, and the shame of it', tone: 'danger' }] : []),
  ] });
}

export const RememberedResolvers = {
  oldAge(ctx, data, optionId) {
    const { state } = ctx;
    if (optionId === 'child') {
      const child = (state.people?.list ?? []).find((p) => p.alive && p.relation === 'child' && (p.age ?? 0) >= 21);
      if (child) child.relationship = clamp((child.relationship ?? 50) - 8, 0, 100);
      state.housing.withChildren = true;
      return ctx.log(`You moved into ${child?.firstName ?? 'your child'}'s house: the back bedroom, and the grandchildren underfoot.`, '🏡', 'info');
    }
    if (optionId === 'work') { ctx.stat('health', -4); ctx.earn(Math.round(150 * priceLevel(state)), 'Odd jobs'); return ctx.log('You took in washing, minded children, swept yards: whatever paid a few coins.', '🧺', 'warn'); }
    state.remembered.poorhouse = state.character.age;
    ctx.stat('happiness', -15);
    return ctx.log('You went into the house: the uniform, the separate wards for men and women, the oakum to pick.', '🏚️', 'bad');
  },
  reckoning(ctx, data, optionId) {
    const a = ctx.state.lineage?.ancestors?.[data.i];
    if (!a) return;
    if (optionId === 'defend') { ctx.stat('stress', 6); return ctx.log(`You defended ${a.name} in the papers. It came down anyway, and your letter was quoted against you for years.`, '🛡️', 'warn'); }
    if (optionId === 'museum') return ctx.log(`${a.name}'s statue went to the city museum, with a panel telling the whole story. Most people thought that was fair.`, '🏛️', 'info');
    ctx.stat('happiness', 2);
    const cousin = (ctx.state.people?.list ?? []).find((p) => p.alive && ['sibling', 'parent'].includes(p.relation));
    if (cousin) cousin.relationship = clamp((cousin.relationship ?? 50) - 15, 0, 100);
    return ctx.log(`You said it should go. ${cousin ? `${cousin.firstName} called it a betrayal of the family.` : 'Some of the family called it a betrayal.'}`, '🤝', 'info');
  },
};

/** What the next generation keeps of you (Legacy.js adds it to your ancestor record). */
export function rememberedRecord(old) {
  const r = old.remembered ?? {};
  return { temperament: r.temperament ?? null, epithet: epithetOf(old), namedAfter: r.namedAfter ?? [], memoir: r.memoir?.title ?? null, funeral: r.funeral ?? funeralOf(old), deeds: deedsOf(old) };
}

export const RememberedModule = {
  id: 'remembered',
  order: 61,
  setup(engine) {
    engine.bus.on('death', (state) => {
      const r = rememberedOf(state);
      r.funeral = funeralOf(state);
      addLog(state, r.funeral, '⚱️', 'info');
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const t = assignTemperament(state);
    for (const id of t) { const [stat, n] = TEMPERAMENTS[id].stat; if (side(state, 7).chance(Math.abs(n))) ctx.stat(stat, Math.sign(n)); }
    namingTick(ctx);
    judgeAncestors(ctx);
    oldAgeTick(ctx);
  },
  actions: {
    memoir: (ctx, mode) => writeMemoir(ctx, mode ?? 'honest'),
  },
  resolvers: RememberedResolvers,
};
