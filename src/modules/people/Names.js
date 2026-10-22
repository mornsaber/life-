/**
 * Changing your name: by deed poll (any adult, a small fee, once a year), and on marriage
 * (keep yours, take theirs, double-barrel, or they take yours).
 *
 * state.character.birthName = { firstName, lastName }; formerNames = ['Jane Smith', …]
 */
import { randomName, yearlyCount, bumpYearly } from '../../core/State.js';
import { living } from './People.js';

const spouseOf = (state) => living(state).find((p) => p.relation === 'spouse');
const doubleBarrel = (a, b) => (a === b ? a : `${a}-${b}`);

function rename(ctx, firstName, lastName, why) {
  const c = ctx.state.character;
  if (firstName === c.firstName && lastName === c.lastName) return;
  c.birthName ??= { firstName: c.firstName, lastName: c.lastName };
  c.formerNames = [...(c.formerNames ?? []), `${c.firstName} ${c.lastName}`];
  c.firstName = firstName;
  c.lastName = lastName;
  ctx.log(`${why} You are now ${firstName} ${lastName}.`, '🪪', 'milestone');
}

/** The choices a deed poll offers this year. */
function deedPollOptions(ctx) {
  const { state, rng } = ctx;
  const c = state.character;
  const opts = [];
  const firsts = new Set();
  while (firsts.size < 3) firsts.add(randomName(rng, c.gender === 'female' ? 'female' : 'male').firstName);
  for (const f of firsts) if (f !== c.firstName) opts.push({ id: `first|${f}`, label: `✏️ First name: ${f}` });
  const last = randomName(rng, 'male').lastName;
  if (last !== c.lastName) opts.push({ id: `last|${last}`, label: `✏️ Surname: ${last}` });
  const sp = spouseOf(state);
  if (sp && sp.lastName !== c.lastName) {
    opts.push({ id: `last|${sp.lastName}`, label: `💍 Take ${sp.firstName}'s surname, ${sp.lastName}` });
    if (!c.lastName.includes('-')) opts.push({ id: `last|${doubleBarrel(c.lastName, sp.lastName)}`, label: `🔗 Double-barrel: ${doubleBarrel(c.lastName, sp.lastName)}` });
  }
  const b = c.birthName;
  if (b && (b.firstName !== c.firstName || b.lastName !== c.lastName)) opts.push({ id: `both|${b.firstName}|${b.lastName}`, label: `↩️ Back to your birth name, ${b.firstName} ${b.lastName}` });
  opts.push({ id: 'cancel', label: '🙅 Keep my name' });
  return opts;
}

export const NamesModule = {
  id: 'names',
  order: 41,
  setup(engine) {
    engine.bus.on('people:married', ({ ctx, personId }) => {
      const { state } = ctx;
      const p = state.people.list.find((x) => x.id === personId);
      const c = state.character;
      if (!p || p.lastName === c.lastName || state.royal) return;
      ctx.prompt({
        type: 'names.marriage', icon: '💍', title: 'Married Names',
        text: `You are ${c.firstName} ${c.lastName}; ${p.firstName} is ${p.firstName} ${p.lastName}. What about your names?`,
        options: [
          { id: 'keep', label: '🙂 Both keep our own names' },
          { id: 'mine', label: `💍 I take ${p.lastName}` },
          { id: 'theirs', label: `💍 ${p.firstName} takes ${c.lastName}` },
          { id: 'double', label: `🔗 We both become ${doubleBarrel(c.lastName, p.lastName)}` },
        ],
        data: { personId },
      });
    });
  },
  actions: {
    /** Change your name by deed poll. */
    change(ctx) {
      const { state } = ctx;
      if (state.character.age < 18) return ctx.toast('You can change your own name at 18.', 'warn');
      if (state.royal) return ctx.toast('Royals don\'t change their names by deed poll.', 'warn');
      if (yearlyCount(state, 'names.change')) return ctx.toast('One name change a year.', 'warn');
      if (state.prompts.some((p) => p.type === 'names.deedPoll')) return undefined;
      ctx.prompt({ type: 'names.deedPoll', icon: '🪪', title: 'Change Your Name', text: 'A deed poll costs about $200 and some paperwork: bank, passport, licence and employer all need telling.', options: deedPollOptions(ctx) });
      return undefined;
    },
  },
  resolvers: {
    deedPoll(ctx, data, optionId) {
      if (optionId === 'cancel') return;
      const c = ctx.state.character;
      const [kind, a, b] = String(optionId).split('|');
      if (!ctx.spend(200, 'Deed poll and new documents')) return ctx.toast('You can\'t afford the paperwork.', 'warn');
      bumpYearly(ctx.state, 'names.change');
      if (kind === 'first') rename(ctx, a, c.lastName, 'Your deed poll came through.');
      else if (kind === 'last') rename(ctx, c.firstName, a, 'Your deed poll came through.');
      else if (kind === 'both') rename(ctx, a, b, 'You went back to the name you were born with.');
      ctx.stat('happiness', 3);
    },
    marriage(ctx, data, optionId) {
      const { state } = ctx;
      const c = state.character;
      const p = state.people.list.find((x) => x.id === data.personId);
      if (!p) return;
      if (optionId === 'mine') rename(ctx, c.firstName, p.lastName, 'You took your spouse\'s surname.');
      else if (optionId === 'theirs') { p.lastName = c.lastName; ctx.log(`${p.firstName} took your surname: ${p.firstName} ${p.lastName}.`, '💍'); }
      else if (optionId === 'double') { const n = doubleBarrel(c.lastName, p.lastName); p.lastName = n; rename(ctx, c.firstName, n, 'You both double-barrelled.'); }
    },
  },
};
