/**
 * Politics and government work of their day: how office was won and held, and how a government
 * job was got, before the rules we know.
 *
 *   The ballot     open voting until the secret ballot (Victoria 1856, Britain 1872, the US
 *                  states 1888–96, France's voting booth 1913): before it, "treating" the voters
 *                  with drink and dinners was how a seat was won, and bribery was common.
 *   Pay            British MPs were unpaid until 1911, Italian deputies until 1912, German
 *                  Reichstag members until 1906; British councillors until 1974. A seat was for
 *                  men of means.
 *   Qualification  a British MP had to own landed property until 1858.
 *   The Senate     US senators were chosen by state legislatures until the 17th Amendment (1913):
 *                  you courted the legislature, not the voters.
 *   Nomination     before direct primaries (Wisconsin 1903; most states by 1915) candidates were
 *                  chosen by party conventions and caucuses.
 *   Neutrality     the Hatch Act (1939) bars US federal employees from running; elsewhere civil
 *                  servants resign to stand. Serving officers sat in parliaments until the First
 *                  World War in Britain and much of Europe.
 *   Patronage      before merit hiring (Britain's open competition 1870, the Pendleton Act 1883,
 *                  Canada 1908...) a government post went to those with a patron: party, family,
 *                  standing. In the US "to the victor belong the spoils": a new administration
 *                  replaced federal clerks, postmasters and customs men with its own.
 */
import { Random } from '../../core/Random.js';
import { netWorth, isOnActiveDuty } from '../../core/State.js';
import { leaveJob } from '../career/CareerEngine.js';
import { yearNow } from '../world/Eras.js';
import { OFFICES } from './Offices.js';
import { stateIdOf } from '../life/Regions.js';
import { skinToneOf } from '../people/SkinTone.js';
import { priceLevel } from '../world/Countries.js';
import { statuteIn, statuteOverride, SECRET_BALLOT_FROM, MEMBERS_PAID_FROM, MERIT_FROM } from './StatuteBook.js';
export { SECRET_BALLOT_FROM, MERIT_FROM };

const cc = (state) => state.character?.countryId ?? 'US';
const at = (table, c) => table[c] ?? table['*'];

export const secretBallot = (state) => statuteIn(state, 'secretBallot');

/** Members of the national legislature unpaid until: */
/** Local councillors unpaid until: */
const COUNCILLORS_PAID_FROM = { GB: 1974, IE: 1974, AU: 1990, NZ: 1974, '*': 1960, US: 1800 };

/** What an office pays this year (0 where it was unpaid). */
export function officePay(state, officeId, salary) {
  const o = OFFICES[officeId];
  if (!o) return salary;
  const y = yearNow(state);
  const c = cc(state);
  if (o.kind === 'legislative' && o.country && !statuteIn(state, 'paidLegislators', c)) return 0;
  if (['cityCouncil', 'schoolBoard'].includes(officeId) && y < at(COUNCILLORS_PAID_FROM, c)) return 0;
  return salary;
}
export const unpaidNote = (state, officeId) => (officePay(state, officeId, 1) ? null : 'Unpaid in this day: members lived on their own means');

/** US senators chosen by the state legislature. */
export const senateByLegislature = (state, officeId) => officeId === 'usSenator' && cc(state) === 'US' && yearNow(state) < 1913;
/** Nominated at a convention rather than in a primary. */
export const conventionEra = (state) => cc(state) === 'US' ? yearNow(state) < 1910 : true;

/** Era rules on who may stand: a reason, or null. */
export function standCheck(state, officeId) {
  const o = OFFICES[officeId];
  if (!o) return null;
  const y = yearNow(state);
  const c = cc(state);
  if (officeId === 'gb_mp' && y < 1858) {
    const landed = (state.housing?.properties ?? []).length || (state.farm?.acres ?? 0) > 0;
    if (!landed || netWorth(state) < 40000) return 'A Member must own landed property (the qualification lasted until 1858)';
  }
  if (senateByLegislature(state, officeId)) {
    const held = [state.politics?.office?.id, ...(state.politics?.history ?? []).map((h) => h.officeId)];
    if (!held.some((id) => ['stateRep', 'stateSenator', 'governor', 'usRep', 'mayor'].includes(id)) && (state.politics?.recognition ?? 0) < 50) return 'Senators are chosen by the state legislature (until 1913): you need standing in the state party first';
  }
  return null;
}

/** Whether a public job here and now asks you to stay out of elections, and why. */
export function neutralityBar(state) {
  const job = state.career?.job;
  const y = yearNow(state);
  const c = cc(state);
  if (isOnActiveDuty(state)) {
    if (y < 1918 && c !== 'US') return null;
    return c === 'US' ? 'Members of the armed forces on active duty can\'t run for office' : 'Serving members of the armed forces can\'t stand for election';
  }
  if (!job || !['federal', 'state', 'public'].includes(job.sector)) return null;
  if (c === 'US') return job.sector === 'federal' && y >= 1939 ? 'Federal employees can\'t run (Hatch Act)' : null;
  return 'Civil servants must resign before they stand';
}

/** When government posts began to be filled on merit (open competition or a civil-service law). */
const MUNICIPAL_LAG = { US: 1910, '*': 0 };
export function meritHere(state, sector) {
  const c = cc(state);
  const y = yearNow(state);
  if (!statuteIn(state, 'meritCivilService', c)) return false;
  // American city halls kept the spoils system a generation after the Pendleton Act.
  if (sector === 'municipal' && c === 'US' && statuteOverride(state, 'meritCivilService', c) == null) return y >= MUNICIPAL_LAG.US;
  return true;
}

/** The hiring bonus (or penalty) of patronage for a public post before merit hiring. */
export function patronageBonus(state, profession) {
  const sector = profession?.sector;
  if (!['federal', 'state', 'municipal', 'public'].includes(sector) || meritHere(state, sector)) return 0;
  let b = -0.15;
  if (state.civic?.party) b += 0.2;
  if ((state.society?.standing ?? 0) >= 40) b += 0.1;
  if (state.character.style?.peerage || state.nobility?.rank) b += 0.1;
  if (state.politics?.office || (state.politics?.history ?? []).length) b += 0.1;
  return b;
}
export const patronageNote = (state, profession) => (['federal', 'state', 'municipal', 'public'].includes(profession?.sector) && !meritHere(state, profession.sector) ? (state.civic?.party ? 'Patronage: your party connections help' : 'Patronage: posts go to those with a patron (join a party)') : null);

export const PoliticsOfTheDayModule = {
  id: 'politicsOfTheDay',
  order: 40.5,
  actions: {
    /** Buy a pocket borough seat from its patron (Britain before 1832). */
    buySeat(ctx) {
      const { state } = ctx;
      if (!pocketBoroughs(state)) return ctx.toast('No seats for sale: the Reform Act did for the pocket boroughs', 'warn');
      if (state.politics?.office) return ctx.toast('You already hold office', 'warn');
      const price = seatPrice(state);
      if (state.character.age < 21) return ctx.toast('From 21', 'warn');
      if (!ctx.spend(price, 'The price of a pocket borough', { credit: false })) return ctx.toast('A seat costs a fortune', 'warn');
      ctx.emit('politics:take', { officeId: 'gb_mp' });
      return ctx.log('You bought a seat from its patron: forty electors, all his tenants, voted as they were told. You are a Member of Parliament.', '🏛️', 'milestone');
    },
    /** Join the machine, or work for it this year. */
    machine(ctx) {
      const { state, rng } = ctx;
      if (!machineHere(state)) return ctx.toast('No machine to join here', 'warn');
      const m = (state.politics ??= {}).machine ??= { rank: -1, votes: 0, since: state.character.age };
      if (state.yearly?.['politics.machine']) return ctx.toast('Once a year', 'warn');
      (state.yearly ??= {})['politics.machine'] = 1;
      if (m.rank < 0) { m.rank = 0; return ctx.log('You joined the machine as a ward heeler: coal for widows at Christmas, a word with the judge, a job on the city payroll, and in return, votes.', '🎩', 'good'); }
      const delivered = rng.int(50, 400) * (m.rank + 1);
      m.votes += delivered;
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 3 + m.rank);
      ctx.earn(Math.round(2000 * (m.rank + 1)), 'The machine\'s thanks (a city sinecure)', {});
      if (m.votes >= 1500 * (m.rank + 1) && m.rank < MACHINE_RANKS.length - 1) { m.rank += 1; m.votes = 0; ctx.log(`You delivered your district. The organisation made you ${MACHINE_RANKS[m.rank].toLowerCase()}.`, '🎩', 'milestone'); }
      else ctx.log(`You got out ${delivered} votes for the ticket.`, '🗳️', 'info');
      if (rng.chance(0.06 + m.rank * 0.02)) ctx.emit('fame:scandal', { ctx, severity: 7, headline: 'a reform newspaper exposed the machine\'s padded payroll' });
      return undefined;
    },
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const job = state.career?.job;
    const y = yearNow(state);
    // The spoils system: a new administration rewards its own.
    if (!job || cc(state) !== 'US' || !['federal', 'municipal'].includes(job.sector) || meritHere(state, job.sector) || y % 4 !== 1) return;
    const rng = new Random(((state.world?.seed ?? 3) * 40503 + y * 17) >>> 0);
    if (!rng.chance(0.5)) return; // the same party held on
    const odds = state.civic?.party ? 0.45 : 0.7;
    if (!rng.chance(odds)) return ctx.log('The new administration came in and swept out half the office. You kept your post.', '🧹', 'info');
    leaveJob(ctx, 'Replaced by the new administration (the spoils system)', { fired: true });
    ctx.log(`The new administration gave your post to one of its own: ${job.sector === 'federal' ? '"to the victor belong the spoils."' : 'the ward boss had a nephew.'}`, '🧹', 'bad');
  },
};

/** Who could endorse you, by the year their kind existed. */
const ENDORSE_FROM = { labor: { US: 1869, GB: 1868, '*': 1880 }, veterans: { US: 1866, '*': 1919 }, lawEnforcement: { '*': 1960 }, party: { '*': 0 }, editorial: { '*': 0 }, bar: { US: 1878, '*': 1880 }, parents: { US: 1897, '*': 1950 }, activists: { '*': 0 } };
export const endorsementNow = (state, id) => yearNow(state) >= at(ENDORSE_FROM[id] ?? { '*': 0 }, cc(state));
const ENDORSE_NAME = { labor: (y) => (y < 1900 ? 'The trades unions' : null), lawEnforcement: () => null, parents: (y) => (y < 1925 ? 'The Mothers\' Congress' : null), editorial: (y) => (y < 1900 ? 'The party newspapers' : null) };
export const endorsementName = (state, id, fallback) => ENDORSE_NAME[id]?.(yearNow(state)) ?? fallback;

/** The campaign's tools in the words of the day. */
export function campaignWords(state) {
  const y = yearNow(state);
  const c = cc(state);
  const tv = y >= (c === 'US' ? 1952 : c === 'GB' ? 1959 : 1965);
  const radio = y >= 1924;
  return {
    ad: tv ? '📺 Run a TV ad' : radio ? '📻 Buy radio time' : '🪧 Posters and handbills',
    attack: tv ? '🗡️ Attack ad' : radio ? '🗡️ A radio broadside' : '🗞️ A broadside in the party paper',
    adLog: tv ? 'Your ad is on every channel.' : radio ? 'Your voice was on the wireless across the district.' : 'Your posters went up on every wall and your handbills into every hand.',
    fundraise: y < 1900 ? '🎩 Call on the party\'s subscribers' : y < 1960 ? '🍽️ A fundraising dinner' : '📞 Fundraise',
    canvass: y < 1900 ? '🍺 Speak at the hustings and taverns' : '🚪 Canvass',
    debate: y < 1960 ? '🎤 Debate on the stump' : '🎤 Debate',
    nominated: conventionEra(state) ? 'the party convention' : 'the primary',
    treat: !secretBallot(state),
  };
}

/** "Primary" in the words of the day: a party convention before direct primaries. */
export const nomWord = (state, cap = false) => (cc(state) === 'US' && conventionEra(state) ? (cap ? 'Convention' : 'convention') : cap ? 'Primary' : 'primary');

/**
 * What a race costs in the money of its day, against today's figure: American campaigns before
 * broadcast advertising cost a fraction of today's; an unreformed British election before the
 * Corrupt Practices Act (1883) was ruinous (treating, transport, "head money"), and capped after.
 */
export function raceCostFactor(state) {
  const y = yearNow(state);
  const c = cc(state);
  if (c === 'US') return y < 1920 ? 0.12 : y < 1952 ? 0.25 : y < 1975 ? 0.5 : y < 2000 ? 0.75 : 1;
  if (c === 'GB' || c === 'IE') return y < 1883 ? 2.5 : 1;
  return y < 1920 ? 0.3 : y < 1960 ? 0.5 : y < 1990 ? 0.8 : 1;
}
export const raceCost = (state, office) => Math.round((office?.cost ?? 0) * raceCostFactor(state));

/* ------------------------------------------------------------------ */
/* Who may vote                                                        */
/* ------------------------------------------------------------------ */
const VOTING_AGE_18_FROM = { US: 1971, GB: 1970, FR: 1974, DE: 1970, IT: 1975, JP: 2016, CA: 1970, AU: 1973, IN: 1989, '*': 1972 };
const JIM_CROW_STATES = ['AL', 'AR', 'FL', 'GA', 'LA', 'MS', 'NC', 'SC', 'TN', 'TX', 'VA', 'OK', 'KY'];
/**
 * Why you can't vote here and now (or null): the voting age (21 until about 1970; 20 in Japan to
 * 2016), the property franchise (Britain: freeholders before 1832, £10 householders to 1867, men of
 * household to 1918), and in the Jim Crow South, the poll tax and literacy test until 1965.
 * Women's suffrage is the statute book's (politics/StatuteBook.js).
 */
export function voteBar(state) {
  const y = yearNow(state);
  const c = cc(state);
  const age = state.character.age;
  const voteAge = y < (VOTING_AGE_18_FROM[c] ?? VOTING_AGE_18_FROM['*']) ? (c === 'JP' ? 20 : 21) : 18;
  if (age < voteAge) return `The voting age is ${voteAge}`;
  if (c === 'GB' || c === 'IE') {
    const owns = (state.housing?.properties ?? []).length > 0 || (state.farm?.acres ?? 0) > 0;
    const householder = owns || (!state.housing?.withParents && (state.housing?.rental || owns));
    if (y < 1832 && (!owns || netWorth(state) < 20000)) return 'Only freeholders and the old borough franchise vote (until the Reform Act of 1832)';
    if (y < 1867 && !householder) return 'Only £10 householders vote (until 1867)';
    if (y < 1918 && !householder) return 'Only householders and lodgers of standing vote (until 1918)';
  }
  if (c === 'US' && y < 1965 && JIM_CROW_STATES.includes(stateIdOf(state)) && skinToneOf(state) >= 4) {
    return y < 1870 ? 'Black men cannot vote here' : 'The poll tax and the literacy test keep Black voters off the rolls (until the Voting Rights Act, 1965)';
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Pocket boroughs and the machine                                     */
/* ------------------------------------------------------------------ */
/** Before the Reform Act (1832) a patron's borough seat could be bought outright. */
export const pocketBoroughs = (state) => cc(state) === 'GB' && yearNow(state) < 1832;
export const seatPrice = (state) => Math.round(500000 * priceLevel(state));
/** City machines (Tammany Hall and its cousins), about 1850–1960: you climb by delivering votes. */
export const MACHINE_RANKS = ['Ward heeler', 'Precinct captain', 'District leader', 'Ward boss', 'Boss of the machine'];
export const machineHere = (state) => cc(state) === 'US' && yearNow(state) >= 1850 && yearNow(state) < 1965;
