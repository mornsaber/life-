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
import { isCitizen } from '../world/Countries.js';

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
export const partyName = (state, bloc) => PARTY_NAMES[here(state)]?.[bloc] ?? (bloc === 'labor' ? 'Labor bloc' : 'Business bloc');
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
  const b = state.civic?.ballots?.[body.id];
  if (!b) return;
  delete state.civic.ballots[body.id];
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
      state.civic.ballots[data.bodyId] = { choice: optionId };
      if (optionId === 'skip' && here(state) === 'AU') {
        ctx.spend(AU_NOT_VOTING_FINE, 'Fine for not voting', { allowDebt: true });
        ctx.log('You didn\'t vote. The Australian Electoral Commission sent a fine.', '📮', 'warn');
      }
    },
  },
};
