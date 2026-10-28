/**
 * Ministers: a national legislator whose party governs can be made a minister — first a junior
 * post (Minister of State, Parliamentary Secretary), then the cabinet. The great offices carry
 * a grace-and-favour house (Chevening for the Foreign Secretary, Dorneywood for the
 * Chancellor in Britain). A reshuffle can move you, promote you or send you to the backbenches;
 * you can resign on principle. Former foreign ministers keep a diplomatic passport for life.
 *
 *   Departments   foreign, finance, defence, interior (home), justice, health, education,
 *                 transport, environment — titled in each country's way
 *   The job       a ministerial salary on top of the legislator's; one push a year for your
 *                 department (a bill, a reform, a summit) that can make your name or a scandal
 *
 * state.politics.ministry = { dept, title, rank: 'junior'|'cabinet', since, residence }
 * state.politics.ministries = [{ dept, title, rank, from, to }]
 * (In the US, the cabinet is a separate appointed office — Executive.js.)
 */
import { clamp } from '../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { OFFICES } from './Offices.js';
import { executiveOf } from './Legislature.js';

export const DEPTS = {
  foreign: { icon: '🌐', title: 'Minister of Foreign Affairs', junior: 'Minister of State for Foreign Affairs', GB: 'Foreign Secretary', residenceGB: 'Chevening House (and 1 Carlton Gardens)', great: true },
  finance: { icon: '🏦', title: 'Minister of Finance', junior: 'Minister of State for Finance', GB: 'Chancellor of the Exchequer', residenceGB: 'Number 11 Downing Street (and Dorneywood)', great: true, IN: 'Minister of Finance', DE: 'Bundesminister der Finanzen', JP: 'Minister of Finance', CA: 'Minister of Finance' },
  defence: { icon: '🎖️', title: 'Minister of Defence', junior: 'Minister for the Armed Forces', GB: 'Defence Secretary' },
  interior: { icon: '🛂', title: 'Minister of the Interior', junior: 'Minister of State for Security', GB: 'Home Secretary', great: true },
  justice: { icon: '⚖️', title: 'Minister of Justice', junior: 'Minister for Prisons', GB: 'Lord Chancellor and Secretary of State for Justice' },
  health: { icon: '🏥', title: 'Minister of Health', junior: 'Minister for Public Health', GB: 'Health Secretary' },
  education: { icon: '🎓', title: 'Minister of Education', junior: 'Minister for Schools', GB: 'Education Secretary' },
  transport: { icon: '🚆', title: 'Minister of Transport', junior: 'Minister for Rail', GB: 'Transport Secretary' },
  environment: { icon: '🌳', title: 'Minister of the Environment', junior: 'Minister for Climate', GB: 'Environment Secretary' },
};
const titleOf = (dept, rank, cc) => {
  const d = DEPTS[dept];
  return rank === 'junior' ? d.junior : d[cc] ?? d.title;
};
const SALARY = { junior: 0.25, cabinet: 0.5 };

const home = (state) => state.character.countryId ?? 'US';
/** A national legislator abroad (ministers in the US are a separate, appointed office; MEPs sit in Europe, not the national parliament). */
const legislator = (state) => {
  const o = state.politics?.office;
  const def = o && OFFICES[o.id];
  return Boolean(def && def.country && def.country !== 'US' && def.kind === 'legislative' && (def.level ?? 0) >= 4 && !def.provinces && !def.european);
};
const governing = (state) => {
  const nat = executiveOf(state, 'national');
  const mine = state.legislature?.seat?.caucus ?? state.civic?.party?.bloc;
  return Boolean(nat && !nat.you && (!mine || !nat.caucus || nat.caucus === mine));
};
export const ministryOf = (state) => state.politics?.ministry ?? null;

function appoint(ctx, dept, rank) {
  const { state } = ctx;
  const cc = home(state);
  const was = state.politics.ministry;
  if (was) endMinistry(ctx, null);
  const title = titleOf(dept, rank, cc);
  state.politics.ministry = { dept, title, rank, since: state.character.age, residence: rank === 'cabinet' && cc === 'GB' ? DEPTS[dept].residenceGB ?? null : null };
  ctx.log(`${rank === 'cabinet' ? 'The prime minister called: you are' : 'You were appointed'} ${title}.${state.politics.ministry.residence ? ` The job comes with ${state.politics.ministry.residence}.` : ''}`, DEPTS[dept].icon, 'milestone');
  ctx.stat('happiness', rank === 'cabinet' ? 10 : 5);
  state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + (rank === 'cabinet' ? 8 : 4));
}

function endMinistry(ctx, why) {
  const { state } = ctx;
  const m = state.politics.ministry;
  if (!m) return;
  (state.politics.ministries ??= []).push({ dept: m.dept, title: m.title, rank: m.rank, from: m.since, to: state.character.age });
  state.politics.ministry = null;
  if (why) ctx.log(`${why} You are no longer ${m.title}.`, '📜', 'info');
}

function ministryYear(ctx) {
  const { state, rng } = ctx;
  const m = state.politics?.ministry;
  if (m) {
    // Out of the legislature, or out of government: out of office.
    if (!legislator(state)) return endMinistry(ctx, 'You left the legislature.');
    if (!governing(state)) return endMinistry(ctx, 'Your party lost power.');
    const base = OFFICES[state.politics.office.id]?.salary ?? 100000;
    ctx.earn(Math.round(base * SALARY[m.rank]), `Ministerial salary — ${m.title}`, { wage: true });
    ctx.stat('stress', m.rank === 'cabinet' ? 6 : 3);
    // The reshuffle.
    if (rng.chance(0.18)) {
      const r = rng.next();
      const approval = state.politics.office.approval ?? 50;
      if (r < 0.3 + (50 - approval) / 200) return endMinistry(ctx, 'The prime minister sacked you in a reshuffle.');
      if (m.rank === 'junior' && r < 0.75) return appoint(ctx, rng.pick(Object.keys(DEPTS)), 'cabinet');
      if (m.rank === 'cabinet' && r < 0.6) return appoint(ctx, rng.pick(Object.keys(DEPTS).filter((d) => d !== m.dept)), 'cabinet');
    }
    return undefined;
  }
  if (!legislator(state) || !governing(state) || state.prompts.some((p) => p.type === 'ministers.offer')) return undefined;
  const served = (state.politics.ministries ?? []).length;
  const odds = 0.05 + (state.politics.recognition ?? 0) / 400 + served * 0.04;
  if (!rng.chance(clamp(odds, 0.03, 0.35))) return undefined;
  const rank = served >= 1 || (state.politics.recognition ?? 0) >= 60 ? 'cabinet' : 'junior';
  const dept = rng.pick(Object.keys(DEPTS));
  return ctx.prompt({
    type: 'ministers.offer', icon: DEPTS[dept].icon, title: home(state) === 'GB' ? 'A Call from Downing Street' : 'A Call from the Prime Minister',
    text: `The head of government wants you in the government: ${titleOf(dept, rank, home(state))}.`,
    options: [{ id: 'accept', label: '✅ Accept' }, { id: 'decline', label: '🙅 Stay on the backbenches' }],
    data: { dept, rank },
  });
}

export const MinistersModule = {
  id: 'ministers',
  order: 31.5,
  onAgeUp(ctx) {
    if (!ctx.state.character.alive || !ctx.state.politics) return;
    ministryYear(ctx);
  },
  actions: {
    /** Push your department's big idea for the year. */
    initiative(ctx) {
      const { state, rng } = ctx;
      const m = ministryOf(state);
      if (!m) return ctx.toast('Ministers only', 'warn');
      if (yearlyCount(state, 'ministers.initiative')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'ministers.initiative');
      const ok = rng.chance(clamp(0.4 + (state.stats.smarts - 50) / 150 + (m.rank === 'cabinet' ? 0.1 : 0), 0.15, 0.85));
      const o = state.politics.office;
      if (ok) {
        o.approval = clamp((o.approval ?? 50) + 4, 0, 100);
        state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 4);
        return ctx.log(`${{ foreign: 'Your summit produced a treaty', finance: 'Your budget was well received in the markets', defence: 'Your defence review passed', interior: 'Your policing reform passed', justice: 'Your sentencing reform passed', health: 'Your hospital-waiting-list plan worked', education: 'Your schools reform passed', transport: 'Your rail plan was funded', environment: 'Your climate bill passed' }[m.dept]}. The papers called you a future leader.`, DEPTS[m.dept].icon, 'good');
      }
      o.approval = clamp((o.approval ?? 50) - 4, 0, 100);
      ctx.emit('fame:scandal', { severity: 5, headline: 'a ministerial initiative that fell apart in public' });
      return ctx.log('Your big initiative fell apart: leaks, a U-turn and an awkward statement to the House.', DEPTS[m.dept].icon, 'bad');
    },
    /** Resign on principle. */
    resign(ctx) {
      const { state } = ctx;
      const m = ministryOf(state);
      if (!m) return ctx.toast('Ministers only', 'warn');
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 5);
      return endMinistry(ctx, 'You resigned on principle, with a resignation statement that was quoted for days.');
    },
  },
  resolvers: {
    offer(ctx, data, optionId) {
      if (optionId !== 'accept') return ctx.log('You turned the post down and stayed on the backbenches.', '🙅', 'info');
      appoint(ctx, data.dept, data.rank);
      return undefined;
    },
  },
};

/** Former foreign ministers (and current ones) travel on diplomatic passports. */
export const wasForeignMinister = (state) => [...(state.politics?.ministries ?? []), state.politics?.ministry].some((m) => m?.dept === 'foreign' && m.rank === 'cabinet');
