/**
 * Parties and general elections. The legislatures' two blocs are each country's
 * real main parties. Citizens vote in national elections (Australia fines you
 * for not voting), and party members can canvass, rise from member to activist,
 * organizer and local party officer — which moves votes and helps them when
 * they run for office themselves.
 *
 * state.civic.party   = { bloc, since, role, canvassed }
 * state.civic.ballots = { [bodyId]: { choice, canvassed } }   the coming election
 * state.civic.votes   = [{ age, body, choice, winner }]
 */
import { electionsHere } from '../world/Regimes.js';
import { isCitizen } from '../world/Countries.js';
import { fromPacks } from '../world/packs/index.js';
import { eraYear, PRESENT } from '../world/Eras.js';

/** Each country's main center-left (labor bloc) and center-right (business bloc) parties. */
export const PARTY_NAMES = {
  US: { labor: 'Democratic Party', business: 'Republican Party' },
  CA: { labor: 'Liberal Party', business: 'Conservative Party' },
  GB: { labor: 'Labour Party', business: 'Conservative Party' },
  DE: { labor: 'SPD', business: 'CDU/CSU' },
  FR: { labor: 'Parti socialiste (left alliance)', business: 'Les Républicains' },
  IT: { labor: 'Partito Democratico', business: 'Fratelli d\'Italia' },
  JP: { labor: 'Constitutional Democratic Party', business: 'Liberal Democratic Party' },
  KR: { labor: 'Democratic Party', business: 'People Power Party' },
  MX: { labor: 'Morena', business: 'PAN' },
  PH: { labor: 'Liberal Party', business: 'Lakas–CMD' },
  IN: { labor: 'Indian National Congress', business: 'Bharatiya Janata Party' },
  AU: { labor: 'Australian Labor Party', business: 'Liberal–National Coalition' },
};
fromPacks(PARTY_NAMES, 'PARTY_NAMES');
export const PARTY_ICON = { labor: '🌹', business: '🦅' };

/** Party roles: how much your canvassing moves an election, and how much the party backs you as a candidate. */
export const PARTY_ROLES = {
  member: { label: 'Member', swing: 0.001, share: 0.005, next: 'activist', years: 2 },
  activist: { label: 'Activist', swing: 0.002, share: 0.01, next: 'organizer', years: 3 },
  organizer: { label: 'Local organizer', swing: 0.004, share: 0.02, next: 'officer', years: 4 },
  officer: { label: 'Local party chair', swing: 0.007, share: 0.03 },
};
export const PARTY_DUES = 60;
/** Australia's fine for not voting (A$20), PPP. */
const AU_NOT_VOTING_FINE = 14;

const here = (state) => state.character.countryId ?? 'US';
export const partyName = (state, bloc) => periodParty(here(state), bloc) ?? PARTY_NAMES[here(state)]?.[bloc] ?? (bloc === 'labor' ? 'Labor bloc' : 'Business bloc');

/**
 * The main parties before today's: [country, bloc, name, until]. The first row whose `until` is
 * after the year being played wins; the "labor" bloc is the left of its day, "business" the right.
 */
const OLD_PARTIES = [
  ['US', 'labor', 'Democratic-Republican Party', 1828], ['US', 'labor', 'Democratic Party', 9999],
  ['US', 'business', 'Federalist Party', 1816], ['US', 'business', 'National Republican faction', 1834], ['US', 'business', 'Whig Party', 1854],
  ['GB', 'labor', 'Whigs', 1859], ['GB', 'labor', 'Liberal Party', 1922], ['GB', 'business', 'Tories', 1834],
  ['CA', 'labor', 'Reformers', 1867], ['CA', 'business', 'Progressive Conservative Party', 2003], ['CA', 'business', 'Conservative Party', 9999],
  ['AU', 'business', 'Free Trade Party', 1909], ['AU', 'business', 'Commonwealth Liberal Party', 1917], ['AU', 'business', 'Nationalist Party', 1931], ['AU', 'business', 'United Australia Party', 1945],
  ['DE', 'labor', 'Progress Party (Fortschrittspartei)', 1875], ['DE', 'labor', 'Social Democrats (SPD)', 9999], ['DE', 'business', 'Conservatives and National Liberals', 1919], ['DE', 'business', 'Centre Party', 1945],
  ['FR', 'labor', 'Republicans (the Left)', 1905], ['FR', 'labor', 'Socialists (SFIO)', 1969], ['FR', 'business', 'Party of Order', 1870], ['FR', 'business', 'Moderate Republicans', 1945], ['FR', 'business', 'Gaullists', 2002], ['FR', 'business', 'UMP', 2015],
  ['IT', 'labor', 'Historical Left (Sinistra storica)', 1892], ['IT', 'labor', 'Socialist Party (PSI)', 1946], ['IT', 'labor', 'Communist Party (PCI)', 1991], ['IT', 'labor', 'Democrats of the Left', 2007],
  ['IT', 'business', 'Historical Right (Destra storica)', 1919], ['IT', 'business', 'Christian Democrats', 1994], ['IT', 'business', 'Forza Italia', 2022],
  ['JP', 'labor', 'Kenseikai / Minseitō', 1945], ['JP', 'labor', 'Japan Socialist Party', 1996], ['JP', 'labor', 'Democratic Party of Japan', 2017], ['JP', 'business', 'Rikken Seiyūkai', 1945], ['JP', 'business', 'Liberal Party', 1955],
  ['KR', 'business', 'Liberal Party', 1961], ['KR', 'business', 'Democratic Republican Party', 1981], ['KR', 'business', 'Democratic Justice Party', 1990], ['KR', 'business', 'Grand National Party', 2012], ['KR', 'business', 'Saenuri / Liberty Korea Party', 2020],
  ['MX', 'labor', 'the Liberals', 1929], ['MX', 'labor', 'PRI', 2014], ['MX', 'business', 'the Conservatives', 1939],
  ['IN', 'business', 'Bharatiya Jana Sangh', 1977], ['IN', 'business', 'Janata Party', 1980],
  ['PH', 'labor', 'Nacionalista Party', 1946], ['PH', 'business', 'Nacionalista Party', 1991],
];
export function periodParty(cc, bloc) {
  const y = eraYear();
  if (y >= PRESENT) return null;
  return OLD_PARTIES.find(([c, b, , until]) => c === cc && b === bloc && y < until)?.[2] ?? null;
}
/**
 * A one-party-dominant national legislature (China's NPC): the dominant bloc's share of seats
 * is fixed by the system, not swung by elections. PARTY_NAMES[cc].dominant = { bloc, share }.
 */
export const dominantParty = (state) => PARTY_NAMES[here(state)]?.dominant ?? null;
export const partyOf = (state) => state.civic?.party ?? null;
export const canVote = (state) => state.character.age >= 18 && isCitizen(state, here(state)) && !state.legal.incarceration;

/** How much your party standing helps when you run as its candidate. */
export function partyBonus(state) {
  const p = partyOf(state);
  return p ? PARTY_ROLES[p.role]?.share ?? 0 : 0;
}

/** The national campaign season: a ballot prompt the year before an election. */
export function ballotPrompt(ctx, body) {
  const { state } = ctx;
  if (!canVote(state) || state.prompts.some((p) => p.type === 'party.ballot')) return;
  const kind = electionsHere(state);
  if (kind === 'none') return;
  if (kind === 'sham') {
    ctx.prompt({
      type: 'party.ballot', icon: '🗳️', title: `Election: ${body.name}`,
      text: 'Election day: one approved candidate per district, chosen by the Party. Turnout is compulsory and checked; a vote against means walking to a separate booth with a pen while officials watch.',
      options: [{ id: 'endorse', label: '✅ Drop the ballot in unmarked (a vote for)' }, { id: 'crossOut', label: '✏️ Cross out the name', tone: 'danger' }],
      data: { bodyId: body.id, sham: true },
    });
    return;
  }
  const p = partyOf(state);
  const lean = body.labor * 2 > body.seats ? 'labor' : 'business';
  ctx.prompt({
    type: 'party.ballot', icon: '🗳️', title: `Election: ${body.name}`,
    text: `Campaign season. The ${partyName(state, lean)} holds the majority (${Math.max(body.labor, body.seats - body.labor)} of ${body.seats} seats).${p ? ` You're a ${PARTY_ROLES[p.role].label.toLowerCase()} in the ${partyName(state, p.bloc)}.` : ''}`,
    options: [
      { id: 'labor', label: `${PARTY_ICON.labor} Vote ${partyName(state, 'labor')}` },
      { id: 'business', label: `${PARTY_ICON.business} Vote ${partyName(state, 'business')}` },
      ...(p ? [{ id: 'canvass', label: `🚪 Knock doors for the ${partyName(state, p.bloc)}`, hint: 'Weekends all autumn' }] : []),
      { id: 'skip', label: '🛋️ Stay home', hint: here(state) === 'AU' ? 'Voting is compulsory: a fine' : undefined },
    ],
    data: { bodyId: body.id },
  });
}

/** The swing your vote and canvassing add to the labor bloc's share (negative helps business). */
export function ballotSwing(state, body) {
  const b = state.civic?.ballots?.[body.id];
  if (!b || b.choice === 'skip') return 0;
  const p = partyOf(state);
  const dir = b.choice === 'labor' ? 1 : -1;
  return dir * (0.0002 + (b.canvassed && p ? PARTY_ROLES[p.role].swing : 0));
}

/** After the count: how your side did. */
export function ballotResult(ctx, body) {
  const { state } = ctx;
  if (electionsHere(state) === 'none') return;
  const b = state.civic?.ballots?.[body.id];
  if (!b) return;
  delete state.civic.ballots[body.id];
  if (b.sham) {
    if (b.choice === 'crossOut' && ctx.rng.chance(0.7)) {
      ctx.log('Your crossed-out ballot was noticed. You were taken for questioning.', '👁️', 'bad');
      ctx.emit('legal:offense', { offenseId: 'antiState', context: 'voting against the Party\'s candidate', caught: true, evidence: 0.95 });
      return;
    }
    return ctx.log(`${body.name} election: turnout 99.9%, and every official candidate elected with 99.9% of the vote.`, '🗳️', 'muted');
  }
  const winner = body.labor * 2 > body.seats ? 'labor' : 'business';
  state.civic.votes = [...(state.civic.votes ?? []).slice(-19), { age: state.character.age, body: body.name, choice: b.choice, winner }];
  if (b.choice === 'skip') return ctx.log(`You sat out the ${body.name} election. The ${partyName(state, winner)} won.`, '🗳️', 'muted');
  const won = b.choice === winner;
  ctx.stat('happiness', won ? 3 : -2);
  ctx.log(`${body.name} election: the ${partyName(state, winner)} won ${Math.max(body.labor, body.seats - body.labor)} seats. ${won ? 'Your side won.' : 'Your side lost.'}${b.canvassed ? ' You knocked on hundreds of doors for it.' : ''}`, '🗳️', won ? 'good' : 'info');
}

export const PartyModule = {
  id: 'party',
  order: 33.4,

  onAgeUp(ctx) {
    const { state } = ctx;
    const p = partyOf(state);
    if (!p) return;
    ctx.spend(PARTY_DUES, 'Party membership dues', { allowDebt: true });
    // Years of work move you up the local party.
    const role = PARTY_ROLES[p.role];
    const years = state.character.age - (p.roleSince ?? p.since);
    if (role.next && years >= role.years && (p.canvassed ?? 0) >= 1 && (role.next !== 'officer' || state.politics.recognition >= 20 || ctx.rng.chance(0.3))) {
      p.role = role.next;
      p.roleSince = state.character.age;
      p.canvassed = 0;
      ctx.log(`You became a ${PARTY_ROLES[p.role].label.toLowerCase()} in the ${partyName(state, p.bloc)}.`, PARTY_ICON[p.bloc], 'good');
      state.politics.recognition = Math.min(100, state.politics.recognition + 3);
    }
  },

  actions: {
    join(ctx, bloc) {
      const { state } = ctx;
      if (!PARTY_ICON[bloc]) return;
      if (state.character.age < 16) return ctx.toast('Party membership starts at 16.', 'warn');
      if (partyOf(state)?.bloc === bloc) return;
      state.civic.party = { bloc, since: state.character.age, role: 'member', canvassed: 0 };
      ctx.log(`You joined the ${partyName(state, bloc)}.`, PARTY_ICON[bloc], 'good');
    },
    leave(ctx) {
      const { state } = ctx;
      const p = partyOf(state);
      if (!p) return;
      state.civic.party = null;
      ctx.log(`You let your ${partyName(state, p.bloc)} membership lapse.`, '🗳️');
    },
  },

  resolvers: {
    ballot(ctx, data, optionId) {
      const { state } = ctx;
      state.civic.ballots ??= {};
      const p = partyOf(state);
      if (optionId === 'canvass' && p) {
        p.canvassed = (p.canvassed ?? 0) + 1;
        ctx.stat('stress', 2);
        ctx.stat('fitness', 1);
        state.politics.recognition = Math.min(100, state.politics.recognition + 1);
        state.civic.ballots[data.bodyId] = { choice: p.bloc, canvassed: true };
        return ctx.log(`You spent the campaign knocking on doors for the ${partyName(state, p.bloc)}.`, '🚪', 'good');
      }
      state.civic.ballots[data.bodyId] = { choice: optionId, ...(data.sham ? { sham: true } : {}) };
      if (optionId === 'skip' && here(state) === 'AU') {
        ctx.spend(AU_NOT_VOTING_FINE, 'Fine for not voting', { allowDebt: true });
        ctx.log('You didn\'t vote. The Australian Electoral Commission sent a fine.', '📮', 'warn');
      }
    },
  },
};
