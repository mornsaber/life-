/**
 * Privy councils and executive councils: the sovereign's (or the governor's) formal advisers,
 * appointed for life (or, in a colony, for as long as they serve).
 *
 *   The Privy Council (UK)   cabinet ministers, the prime minister, the first ministers, the
 *                            Speaker, senior royals, the archbishops, the realms' prime ministers
 *                            and governors-general. "The Rt Hon." for life.
 *   The King's Privy Council for Canada   every federal cabinet minister, the prime minister and
 *                            the governor general: "The Hon." for life, and the letters PC.
 *   A privy council of the realm   Jamaica and the other realms that have one.
 *   A colony's Executive Council   the governor's council: senior officials ex officio (the Chief
 *                            Secretary), and a few prominent local people as unofficial members.
 *                            "The Hon." while you serve; it ends with independence.
 *
 * state.privyCouncil = [{ council, name, since, until?, style, letters? }]
 */
import { Random } from '../../core/Random.js';
import { addHonor, currentYear, netWorth, yearlyCount, bumpYearly } from '../../core/State.js';
import { COURTS } from '../legal/Judiciary.js';
import { LEGISLATURES } from '../politics/NationalOffices.js';
import { colonyHere, rulerAdj, colonialHere } from './Eras.js';
import { COUNTRIES } from './Countries.js';
import { familyPrestige } from '../people/FamilyLegacy.js';

export const COUNCILS = {
  GB: { name: 'His Majesty\'s Most Honourable Privy Council', title: 'Privy Counsellor', style: 'The Rt Hon.' },
  CA: { name: 'the King\'s Privy Council for Canada', title: 'Member of the Privy Council for Canada', style: 'The Hon.', letters: 'PC' },
  JM: { name: 'the Privy Council of Jamaica', title: 'Member of the Privy Council of Jamaica', style: 'The Hon.', letters: 'PC' },
};
const REALMS_IN_UK_PC = ['CA', 'AU', 'NZ'];
const here = (state) => state.character.countryId ?? 'US';
const held = (state) => (state.privyCouncil ??= []);
const member = (state, council) => held(state).some((m) => m.council === council && m.until == null);

/** Which councils your position puts you on, with why. */
function dueFor(state) {
  const out = [];
  const cc = here(state);
  const o = state.politics?.office;
  const ministry = state.politics?.ministry;
  const head = o && o.id === LEGISLATURES[cc]?.execOffice;
  const gg = o && /_gg$/.test(o.id);
  if (cc === 'GB' && (head || ministry?.rank === 'cabinet' || /speaker|firstMinister|leaderOpposition/i.test(o?.id ?? ''))) out.push(['GB', head ? 'as prime minister' : 'on joining the cabinet']);
  if (cc === 'GB' && state.royal && state.character.age >= 21 && ['heir', 'child'].includes(state.royal.level)) out.push(['GB', 'as a senior member of the royal family']);
  if (cc === 'GB' && state.community?.orders?.grade === 'bishop' && /anglican/i.test(state.community.orders.tradition ?? '')) out.push(['GB', 'as an archbishop']);
  if (REALMS_IN_UK_PC.includes(cc) && (head || gg)) out.push(['GB', head ? 'as a prime minister of one of the realms' : 'as governor-general']);
  if (cc === 'CA' && (head || gg || ministry?.rank === 'cabinet')) out.push(['CA', head ? 'as prime minister' : gg ? 'as governor general' : 'on joining the federal cabinet']);
  if (cc === 'JM' && (head || ministry?.rank === 'cabinet')) out.push(['JM', 'on appointment to the government']);
  return out;
}

/** Your seat on a sovereign's privy council (Britain's, Canada's, Jamaica's), if you hold one. */
export const counsellorSeat = (state) => held(state).find((m) => COUNCILS[m.council] && m.until == null) ?? null;
/** Your seat on a colony's Executive Council, if you hold one. */
export const excoSeat = (state) => held(state).find((m) => m.council.startsWith('exco.') && m.until == null) ?? null;
const officialMember = (state) => state.career?.job?.professionId === 'colonialService' && (state.career.job.grade ?? 0) >= 7;
const ri = (rng, a, b) => a + Math.floor(rng.next() * (b - a + 1));
const pick = (rng, list) => list[Math.floor(rng.next() * list.length)];
const crng = (state, salt) => new Random((((state.world?.seed ?? 1) * 7919) ^ (currentYear(state) * 131) ^ salt) >>> 0);

/** Where the Council meets: the sovereign's house, wherever the court is that week. */
const meetingPlace = (state, council) => council === 'GB' ? (currentYear(state) < 1837 ? 'St James\'s Palace' : 'Buckingham Palace') : council === 'CA' ? 'Rideau Hall' : 'King\'s House';
/** What a Privy Counsellors' review looks into, by the year. */
function reviewTopic(state, rng) {
  const y = currentYear(state);
  return pick(rng, [
    y >= 1980 ? 'the intelligence that took the country to war' : 'the conduct of the war in the colonies',
    y >= 1970 ? 'a collapsed bank and the regulators who missed it' : 'the failure of a great bank',
    y >= 1950 ? 'the security vetting of the civil service' : 'a leak of state papers to the press',
    y >= 1900 ? 'the riots in the industrial towns' : 'the Chartist disturbances in the north',
    y < 1960 ? 'a colliery disaster and the inspectors who passed the pit' : 'a disaster at sea and the safety rules that failed',
  ]);
}
/** Appeals heard by the Judicial Committee: from where, while they still came (Canada to 1949, India 1949, Australia 1986, Hong Kong 1997, New Zealand 2004). */
function appealFrom(state, rng) {
  const y = currentYear(state);
  const from = [['Jamaica', 0, 9999], ['Trinidad', 0, 9999], ['the Isle of Man', 0, 9999], ['Mauritius', 0, 9999], ['Canada', 0, 1949], ['India', 0, 1949], ['Australia', 0, 1986], ['Hong Kong', 1842, 1997], ['New Zealand', 0, 2004], ['Malaysia', 1957, 1985], ['Singapore', 1965, 1994], ['the Gold Coast', 0, 1960], ['Ceylon', 0, 1971]].filter(([, a, b]) => y >= a && y < b);
  return pick(rng, from)[0];
}
/** The question before an Executive Council in a colony this year. */
function councilQuestion(state, rng) {
  const y = currentYear(state);
  return pick(rng, [
    { id: 'strike', text: `The ${y >= 1920 ? 'dock and railway workers have struck' : 'plantation labourers have stopped work'}. The Colonial Secretary wants troops on the streets.`, official: 'Back the Colonial Secretary: order restored first', local: 'Ask for an inquiry into wages and conditions' },
    { id: 'famine', text: 'The rains failed. The Treasury says relief would encourage idleness and cost too much.', official: 'Hold to the Treasury\'s line', local: 'Press for relief works and grain at cost' },
    { id: 'land', text: 'Settlers want more of the best land reserved for them, and the Governor is inclined to agree.', official: 'Support the reservation', local: 'Speak for the people who farm it now' },
    { id: 'budget', text: 'The estimates: more for the police and the officials\' salaries, less for schools and clinics.', official: 'Pass the estimates as drafted', local: 'Move money to schools and clinics' },
    { id: 'press', text: `A ${y >= 1930 ? 'nationalist newspaper' : 'native newspaper'} has printed something the Governor calls seditious and wants banned.`, official: 'Agree to the ban', local: 'Argue for letting it print' },
  ]);
}

export const PrivyCouncilModule = {
  id: 'privyCouncil',
  order: 34.4,
  setup(engine) {
    // A conviction for a serious crime: struck off the Council (Jonathan Aitken resigned before he could be, in 1997).
    engine.bus.on('legal:convicted', ({ ctx, severity }) => {
      if (severity !== 'felony') return;
      for (const m of held(ctx.state)) {
        if (m.until != null) continue;
        m.until = currentYear(ctx.state);
        m.removed = true;
        ctx.log(m.council.startsWith('exco.') ? `After your conviction the Governor removed you from the Executive Council of ${m.colony}.` : `After your conviction you were struck off ${m.name}. You are no longer "${m.style}".`, '📜', 'bad');
      }
    });
  },
  actions: {
    /** Stand at a meeting of the Council while the Orders are read: nobody sits, and it's over in minutes. */
    attend(ctx) {
      const { state } = ctx;
      const m = counsellorSeat(state);
      if (!m) return ctx.toast('You are not a member of a privy council.', 'warn');
      if (yearlyCount(state, 'privyCouncil.attend')) return ctx.toast('The Council has met for the year.', 'warn');
      bumpYearly(state, 'privyCouncil.attend');
      m.meetings = (m.meetings ?? 0) + 1;
      ctx.stat('happiness', 2);
      ctx.log(`You stood with three other counsellors at ${meetingPlace(state, m.council)} while the Lord President read out the Orders in Council and the sovereign said "Approved" to each. Nobody sits at a Privy Council; it was over in a quarter of an hour.`, '📜', 'info');
    },
    /** Confidential briefings "on Privy Council terms": the government shares secrets with senior figures across the House. */
    briefing(ctx) {
      const { state } = ctx;
      const m = counsellorSeat(state);
      const o = state.politics?.office;
      if (!m || !o) return ctx.toast('Briefings on Privy Council terms are for counsellors in public life.', 'warn');
      if (yearlyCount(state, 'privyCouncil.briefing')) return ctx.toast('You have been briefed this year.', 'warn');
      bumpYearly(state, 'privyCouncil.briefing');
      ctx.stat('smarts', 1); ctx.stat('stress', 3);
      o.approval = Math.min(100, (o.approval ?? 50) + 2);
      ctx.log(`You were briefed "on Privy Council terms" by the ${currentYear(state) >= 1909 ? 'security services' : 'Foreign Office'}: what you heard, you can never repeat. In the House you spoke with an authority your colleagues noticed.`, '🤫', 'info');
    },
    /** Chair a committee of Privy Counsellors looking into a national failure. */
    review(ctx) {
      const { state } = ctx;
      const m = counsellorSeat(state);
      if (!m) return ctx.toast('Only a Privy Counsellor can sit on a Privy Counsellor review.', 'warn');
      if (state.character.age < 45) return ctx.toast('Reviews go to senior counsellors.', 'warn');
      if ((m.lastReview ?? -99) > currentYear(state) - 4) return ctx.toast('You finished a review not long ago.', 'warn');
      const rng = crng(state, 0x7e1);
      m.lastReview = currentYear(state);
      m.reviews = (m.reviews ?? 0) + 1;
      const topic = reviewTopic(state, rng);
      ctx.stat('smarts', 2); ctx.stat('stress', 6);
      const verdict = rng.next() < 0.5;
      if (state.politics?.office) state.politics.office.approval = Math.max(0, Math.min(100, (state.politics.office.approval ?? 50) + (verdict ? 3 : -2)));
      ctx.log(`You chaired a committee of Privy Counsellors into ${topic}. ${verdict ? 'Your report was blunt, and the papers called it fearless.' : 'Your report was careful, and the papers called it a whitewash.'}`, '📑', verdict ? 'good' : 'warn');
    },
    /** Sit on the Judicial Committee: the final court of appeal for the Empire and later the Commonwealth. */
    appeal(ctx) {
      const { state } = ctx;
      const m = counsellorSeat(state);
      const seat = state.judiciary?.seat;
      if (!m || m.council !== 'GB' || !seat || (COURTS[seat.court]?.rank ?? 0) < 3) return ctx.toast('The Judicial Committee sits senior judges who are Privy Counsellors.', 'warn');
      if (currentYear(state) < 1833) return ctx.toast('The Judicial Committee was created in 1833.', 'warn');
      if (yearlyCount(state, 'privyCouncil.appeal')) return ctx.toast('You have sat this year.', 'warn');
      bumpYearly(state, 'privyCouncil.appeal');
      const rng = crng(state, 0xa99);
      const where = appealFrom(state, rng);
      seat.reputation = Math.min(100, (seat.reputation ?? 50) + 2);
      ctx.stat('smarts', 1);
      ctx.log(`You sat on the Judicial Committee of the Privy Council in Downing Street, five judges without wigs, hearing ${rng.next() < 0.3 && currentYear(state) >= 1965 ? 'a death-row appeal' : 'an appeal'} from ${where}. Your judgment went out as "humble advice" to the sovereign.`, '⚖️', 'info');
    },
    /** Resign from the Council and give up the style. */
    resign(ctx) {
      const { state } = ctx;
      const m = counsellorSeat(state);
      if (!m) return ctx.toast('You are not a member of a privy council.', 'warn');
      m.until = currentYear(state);
      m.resigned = true;
      ctx.stat('happiness', -3);
      ctx.log(`You resigned from ${m.name}. You are no longer "${m.style}"; few ever give it up.`, '📜', 'warn');
    },
    /** Put the year's question to the Governor's council. */
    advise(ctx) {
      const { state } = ctx;
      const m = excoSeat(state);
      if (!m) return ctx.toast('You do not sit on an Executive Council.', 'warn');
      if (yearlyCount(state, 'privyCouncil.advise')) return ctx.toast('The Council has dealt with this year\'s business.', 'warn');
      if (state.prompts.some((p) => p.type === 'privyCouncil.advise')) return;
      bumpYearly(state, 'privyCouncil.advise');
      const q = councilQuestion(state, crng(state, 0x5ad));
      ctx.prompt({ type: 'privyCouncil.advise', icon: '📜', title: 'Around the Governor\'s Table', text: q.text, data: { id: q.id }, options: [
        { id: 'official', label: `🏛️ ${q.official}`, hint: 'The Governor will remember it' },
        { id: 'local', label: `🗣️ ${q.local}`, hint: officialMember(state) ? 'Unusual from an official' : 'What you are there for' },
        { id: 'quiet', label: '🤐 Say nothing', hint: 'Safe, and pointless' },
      ] });
    },
    /** Press for more local members on the council: the colony's slow road to self-government. */
    pressReform(ctx) {
      const { state } = ctx;
      const m = excoSeat(state);
      if (!m) return ctx.toast('You do not sit on an Executive Council.', 'warn');
      if ((m.lastPress ?? -99) > currentYear(state) - 2) return ctx.toast('You raised it only last year.', 'warn');
      m.lastPress = currentYear(state);
      m.standing = Math.max(0, (m.standing ?? 60) - 15);
      m.voice = Math.min(100, (m.voice ?? 40) + 12);
      const rec = state.era?.colonies?.[here(state)];
      if (rec) rec.pressure = (rec.pressure ?? 0) + 2;
      ctx.log(`You moved that the Executive Council should have more ${COUNTRIES[here(state)]?.demonym ?? 'local'} members, and the Legislative Council an elected majority. The Governor minuted his disapproval; the newspapers printed your speech in full.`, '🗳️', 'milestone');
    },
    /** Resign in protest. */
    resignProtest(ctx) {
      const { state } = ctx;
      const m = excoSeat(state);
      if (!m) return ctx.toast('You do not sit on an Executive Council.', 'warn');
      m.until = currentYear(state);
      m.resigned = true;
      const rec = state.era?.colonies?.[here(state)];
      if (rec) rec.pressure = (rec.pressure ?? 0) + 2;
      ctx.stat('happiness', 2);
      ctx.log(`You resigned from the Executive Council of ${m.colony} in protest, and said why in public. You are no longer "The Hon.", but in the bazaars and the clubs your name went round.`, '✊', 'milestone');
    },
  },
  resolvers: {
    advise(ctx, data, optionId) {
      const { state } = ctx;
      const m = excoSeat(state);
      if (!m) return;
      m.standing ??= 60; m.voice ??= 40;
      if (optionId === 'official') { m.standing = Math.min(100, m.standing + 8); m.voice = Math.max(0, m.voice - 8); return ctx.log('You backed the official line. The Governor thanked you afterwards; outside, people noticed which way you voted.', '🏛️', 'info'); }
      if (optionId === 'local') {
        m.standing = Math.max(0, m.standing - 10); m.voice = Math.min(100, m.voice + 10);
        const rec = state.era?.colonies?.[here(state)];
        if (rec) rec.pressure = (rec.pressure ?? 0) + 1;
        const won = crng(state, 0x3b1).next() < 0.3;
        return ctx.log(won ? 'You argued for the people outside, and for once the Governor gave way.' : 'You argued for the people outside. You were outvoted by the officials, as unofficial members always were, but you said it on the record.', '🗣️', won ? 'good' : 'info');
      }
      ctx.log('You said nothing, and the officials carried the day.', '🤐', 'info');
    },
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const year = currentYear(state);
    for (const [council, why] of dueFor(state)) {
      if (held(state).some((m) => m.council === council)) continue;
      const c = COUNCILS[council];
      held(state).push({ council, name: c.name, since: year, style: c.style, letters: c.letters ?? null });
      addHonor(state, { id: `pc.${council}`, source: 'civil', country: council, name: c.title, icon: '📜', prestige: 7, precedence: 8, citation: `Sworn of ${c.name} ${why}.` });
      ctx.log(`You were sworn of ${c.name} ${why}, kneeling on a stool before the sovereign to kiss hands. You are ${c.style} for life.`, '📜', 'honor');
    }
    colonyCouncil(ctx);
  },
};

/** The governor's Executive Council in a colony: officials ex officio, a few notable locals. */
function colonyCouncil(ctx) {
  const { state } = ctx;
  const cc = here(state);
  const st = colonialHere(state);
  const seat = held(state).find((m) => m.council === `exco.${cc}` && m.until == null);
  if (seat && !st) {
    seat.until = currentYear(state);
    return void ctx.log(`The Executive Council of ${seat.colony} was dissolved at independence. You are no longer "The Hon."`, '📜', 'info');
  }
  // Unofficial members served at the Governor's pleasure: lose it, and you weren't reappointed.
  if (seat && !officialMember(state) && (seat.standing ?? 60) < 20) {
    seat.until = currentYear(state);
    return void ctx.log(`Your term on the Executive Council of ${seat.colony} ran out, and the Governor did not reappoint you.`, '📜', 'warn');
  }
  if (seat || state.privyCouncil?.some((m) => m.council === `exco.${cc}` && (m.resigned || m.removed))) return;
  if (!st || seat || state.character.age < 35) return;
  const job = state.career?.job;
  const official = job?.professionId === 'colonialService' && (job.grade ?? 0) >= 7;
  const notable = state.character.age >= 40 && (familyPrestige(state) >= 35 || netWorth(state) >= 1_000_000 || (state.honors?.length ?? 0) >= 2);
  if (!official && !notable) return;
  const rng = new Random(((state.world?.seed ?? 1) * 5051 + state.character.age * 97 + 0x9c) >>> 0);
  if (!official && !rng.chance(0.15)) return;
  held(state).push({ council: `exco.${cc}`, name: `the Executive Council of ${st.name}`, colony: st.name, since: currentYear(state), style: 'The Hon.' });
  ctx.log(official
    ? `As a senior officer of the ${rulerAdj(st.ruler)} administration you sit ex officio on the Executive Council of ${st.name}, around the Governor's table.`
    : `The Governor has appointed you an unofficial member of the Executive Council of ${st.name}: one of the few ${COUNTRIES[cc]?.demonym ?? 'local'} voices at his table. You are "The Hon." while you serve.`, '📜', 'honor');
}

/** Your style from councils: "The Rt Hon." for a Privy Counsellor; "The Hon." for Canada, Jamaica, an Executive Council. */
export function councilStyle(state) {
  const m = (state.privyCouncil ?? []).filter((x) => x.until == null);
  if (!m.length) return null;
  const best = m.find((x) => x.style === 'The Rt Hon.') ?? m[0];
  return { prefix: best.style, why: best.name };
}
/** Letters after the name: PC (Canada, Jamaica). */
export const councilLetters = (state) => (state.privyCouncil ?? []).filter((x) => x.letters && x.until == null).map((x) => x.letters)[0] ?? null;
