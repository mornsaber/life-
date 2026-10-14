/**
 * Your children's passports. A child gets citizenship by birth where the country
 * grants it, and by descent from each parent — but descent has strings attached:
 *
 *  - Japan: register the birth (and reserve Japanese nationality) within three
 *    months, or the child loses it.
 *  - Germany: a German born abroad after 2000 must register a child born abroad
 *    within a year.
 *  - India: citizenship by descent needs registration within a year and no
 *    other passport; otherwise the child gets an OCI card instead.
 *  - Canada and the UK pass citizenship down one generation born abroad:
 *    a parent who is a citizen only by descent can't pass it on.
 *  - Elsewhere it passes automatically; registering just papers it.
 *
 * Children with a passport from Japan, Korea or India alongside another must
 * choose by 22 (Migration.js handles your own choice).
 *
 * person.citizenships = [...] on each child.
 */
import { COUNTRIES } from './Countries.js';
import { IMMIGRATION, birthCountryOf, residencesOf, nationalityCode } from './Immigration.js';
import { fromPacks } from './packs/index.js';

/** Registering a birth abroad. deadline: the citizenship is lost if you don't (null: it's automatic). */
export const BIRTH_REGISTRATION = {
  US: { name: 'Consular Report of Birth Abroad', fee: 100, deadline: false },
  CA: { name: 'proof of Canadian citizenship', fee: 75, deadline: false, oneGeneration: true },
  GB: { name: 'British birth registration abroad', fee: 150, deadline: false, oneGeneration: true },
  DE: { name: 'Geburtsanzeige at the German consulate', fee: 60, deadline: 'bornAbroad' },
  JP: { name: 'koseki birth notice (reserving Japanese nationality)', fee: 0, deadline: true },
  KR: { name: 'family-register birth report', fee: 0, deadline: false },
  IT: { name: 'AIRE registration', fee: 0, deadline: false },
  FR: { name: 'transcription into the French civil register', fee: 0, deadline: false },
  MX: { name: 'registro de nacimiento at the consulate', fee: 15, deadline: false },
  PH: { name: 'Report of Birth', fee: 25, deadline: false },
  IN: { name: 'registration of birth at the Indian mission', fee: 30, deadline: true, soleNationality: true },
  AU: { name: 'citizenship by descent', fee: 300, deadline: false },
};
fromPacks(BIRTH_REGISTRATION, 'BIRTH_REGISTRATION');

/** Whether you hold a citizenship only by descent (born abroad, never naturalized there). */
export const byDescent = (state, cc) => birthCountryOf(state) !== cc && !(state.migration?.naturalized ?? []).includes(cc);

/** The passports a newborn holds automatically, and those that need registering. */
export function newbornCitizenships(state, child) {
  const born = nationalityCode(child) ?? state.character.countryId ?? 'US';
  const out = new Set();
  const rule = IMMIGRATION[born]?.birthright;
  if (rule === true || (rule?.parentPR && residencesOf(state)[born]?.status === 'permanent')) out.add(born);
  const other = state.people?.list?.find((p) => p.id === child.otherParentId);
  const otherCode = nationalityCode(other);
  if (otherCode) out.add(otherCode);
  const register = [];
  const lost = [];
  for (const cc of state.character.citizenships ?? [birthCountryOf(state)]) {
    if (cc === born || out.has(cc)) {
      out.add(cc);
      continue;
    }
    const r = BIRTH_REGISTRATION[cc];
    if (r?.oneGeneration && byDescent(state, cc)) {
      lost.push(cc);
      continue;
    }
    if (r?.deadline === true || (r?.deadline === 'bornAbroad' && birthCountryOf(state) !== cc)) register.push(cc);
    else out.add(cc);
  }
  return { citizenships: [...out], register, lost, born };
}

/** At a birth: the passports the baby gets now, and a prompt for any that hang on registration. */
export function settleNewborn(ctx, child) {
  const { state } = ctx;
  if (child.adopted) {
    child.citizenships = [...new Set([nationalityCode(child) ?? state.character.countryId ?? 'US', ...(state.character.citizenships ?? [birthCountryOf(state)])])];
    return;
  }
  const { citizenships, register, lost, born } = newbornCitizenships(state, child);
  child.citizenships = citizenships;
  for (const cc of lost) ctx.log(`${child.firstName} isn't ${COUNTRIES[cc].demonym}: you're a citizen by descent yourself, and ${COUNTRIES[cc].name} only passes citizenship down one generation born abroad.`, '🛂', 'warn');
  if (!register.length) return;
  ctx.prompt({
    type: 'nationality.register', icon: '🛂', title: 'Register the Birth Abroad',
    text: `${child.firstName} was born in ${COUNTRIES[born]?.name ?? 'another country'}. ${register.map((cc) => `${COUNTRIES[cc].name} needs a ${BIRTH_REGISTRATION[cc].name}`).join('; ')} — or ${child.firstName} loses that nationality.`,
    options: [
      { id: 'register', label: '📝 Register the birth', hint: register.map((cc) => `${COUNTRIES[cc].flag} ${BIRTH_REGISTRATION[cc].fee ? `$${BIRTH_REGISTRATION[cc].fee}` : 'free'}`).join(' · ') },
      { id: 'skip', label: '🤷 Don\'t bother', hint: `${child.firstName} won't be ${register.map((cc) => COUNTRIES[cc].demonym).join(' or ')}` },
    ],
    data: { childId: child.id, register },
  });
}

export const NationalityResolvers = {
  register(ctx, data, optionId) {
    const { state } = ctx;
    const child = state.people.list.find((p) => p.id === data.childId);
    if (!child) return;
    if (optionId !== 'register') return ctx.log(`You never registered ${child.firstName}'s birth. ${data.register.map((cc) => COUNTRIES[cc].demonym).join(' and ')} nationality lapsed.`, '🛂', 'warn');
    for (const cc of data.register) {
      const r = BIRTH_REGISTRATION[cc];
      // India grants citizenship by descent only to children with no other passport; the rest get an OCI card.
      if (r.soleNationality && child.citizenships.length) {
        child.oci = true;
        ctx.log(`${child.firstName} already holds another passport, so India issued an Overseas Citizen of India card instead of citizenship.`, '🪪');
        continue;
      }
      if (r.fee) ctx.spend(r.fee, `${COUNTRIES[cc].name} birth registration`, { allowDebt: true });
      child.citizenships = [...new Set([...child.citizenships, cc])];
      ctx.log(`You registered ${child.firstName}'s birth: ${child.firstName} is ${COUNTRIES[cc].demonym}. ${COUNTRIES[cc].flag}`, '🛂', 'good');
    }
  },
};

/** A grown child with a passport from a country that bans dual nationality picks one at 22. */
export function childDualChoices(ctx) {
  const { state } = ctx;
  for (const c of state.people?.list ?? []) {
    if (c.relation !== 'child' || !c.alive || !c.citizenships || c.citizenships.length < 2 || c.dualChosen) continue;
    if (state.character.age + c.ageOffset !== 22) continue;
    const strict = c.citizenships.find((cc) => IMMIGRATION[cc] && !IMMIGRATION[cc].dualOut);
    if (!strict) continue;
    c.dualChosen = true;
    // They keep the passport of the country they live in.
    const keep = c.citizenships.includes(state.character.countryId ?? 'US') ? state.character.countryId ?? 'US' : strict;
    c.citizenships = keep === strict ? [strict] : c.citizenships.filter((cc) => cc !== strict);
    ctx.log(`${c.firstName} turned 22 and had to choose: ${c.firstName} kept ${COUNTRIES[keep].demonym} nationality.`, '🛂');
  }
}

export const NationalityModule = {
  id: 'nationality',
  order: 8.5,
  onAgeUp: childDualChoices,
  resolvers: NationalityResolvers,
};
