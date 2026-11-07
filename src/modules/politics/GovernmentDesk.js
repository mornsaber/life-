/**
 * Running the country: the desk of a president or prime minister, on top of the national
 * budget (Budgets.js), the laws (Laws.js) and political capital (Statecraft.js).
 *
 *   Groups     six slices of the country — workers, business, retirees, the young, rural and
 *              urban voters — each judging you on what they care about: jobs, taxes, pensions
 *              and health, schools, roads, policing. Your overall approval follows them.
 *   Crises     a pandemic, a market crash, a general strike, a flood, a border incident: each
 *              in two acts — the first decision now, the consequences and a second call next year.
 *   Diplomacy  relations with the big powers and your neighbours: trade deals, alliances and
 *              sanctions, one move a year.
 *   Legacy     what you did, kept with the country after you leave office.
 *
 * state.politics.desk = { groups: {...}, crisis: { id, act, choice } | null, relations: { [cc]: 0–100 },
 *                         deals: [{ cc, kind, age }], legacy: [] }
 */
import { Random } from '../../core/Random.js';
import { OFFICES } from './Offices.js';
import { budgetAt } from './Budgets.js';
import { COUNTRIES } from '../world/Countries.js';

export const GROUPS = {
  workers: { label: 'Workers', icon: '👷', areas: ['welfare', 'health'] },
  business: { label: 'Business', icon: '💼', areas: ['infrastructure'] },
  retirees: { label: 'Retirees', icon: '👵', areas: ['pensions', 'health'] },
  young: { label: 'The young', icon: '🎓', areas: ['education', 'environment'] },
  rural: { label: 'Rural voters', icon: '🚜', areas: ['infrastructure', 'defense'] },
  urban: { label: 'City voters', icon: '🏙️', areas: ['policing', 'environment'] },
};
const POWERS = ['US', 'CN', 'GB', 'DE', 'FR', 'JP', 'IN', 'RU', 'BR'];
const CRISES = {
  pandemic: { title: 'A New Virus', text: 'A respiratory virus is spreading fast. Hospitals in two cities are filling up.', options: [['lockdown', '🔒 Lock down hard'], ['targeted', '🎯 Targeted measures'], ['open', '🛍️ Keep the country open']], hit: { lockdown: { business: -8, young: -4, retirees: 6 }, targeted: { retirees: 2, business: -2 }, open: { business: 4, retirees: -10 } } },
  crash: { title: 'Markets Crash', text: 'Banks are wobbling and the markets lost a fifth in a week.', options: [['bailout', '🏦 Bail out the banks'], ['stimulus', '💸 Stimulus for households'], ['wait', '🧘 Let the market correct']], hit: { bailout: { business: 6, workers: -6 }, stimulus: { workers: 6, young: 3, business: -2 }, wait: { business: -4, workers: -6 } } },
  strike: { title: 'A General Strike', text: 'The unions have called a general strike over wages. Trains, ports and schools are shut.', options: [['deal', '🤝 Broker a deal'], ['legislate', '📜 Legislate them back to work'], ['wait', '⏳ Wait them out']], hit: { deal: { workers: 6, business: -4 }, legislate: { workers: -10, business: 6 }, wait: { workers: -3, urban: -5 } } },
  flood: { title: 'Floods', text: 'Record rains have flooded three regions. Thousands are homeless.', options: [['army', '🎖️ Send in the army'], ['fund', '💰 An emergency fund'], ['local', '🏘️ Leave it to the regions']], hit: { army: { rural: 6, urban: 2 }, fund: { rural: 4, workers: 2 }, local: { rural: -10 } } },
  border: { title: 'A Border Incident', text: 'Soldiers from a neighbouring country crossed the border overnight. Two of ours are dead.', options: [['retaliate', '⚔️ Retaliate'], ['talks', '🕊️ Demand talks'], ['allies', '🌐 Go to your allies']], hit: { retaliate: { rural: 6, young: -6 }, talks: { young: 4, rural: -4 }, allies: { business: 2 } } },
};
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 66889 + state.character.age * 1013 + salt) >>> 0);

/** Whether you run a national government: a president, or a prime minister / premier of a country. */
export function leadsCountry(state) {
  const o = state.politics?.office;
  const def = o && OFFICES[o.id];
  if (!def) return false;
  return o.id === 'president' || Boolean(def.leader && (def.level ?? 0) >= 5) || Boolean(def.executive && def.national && (def.level ?? 0) >= 5 && !def.ceremonial);
}
export const deskOf = (state) => state.politics?.desk ?? null;
function ensure(state) {
  const here = state.character.countryId ?? 'US';
  state.politics.desk ??= {
    groups: Object.fromEntries(Object.keys(GROUPS).map((g) => [g, 50])), crisis: null,
    relations: Object.fromEntries(POWERS.filter((cc) => cc !== here && COUNTRIES[cc]).map((cc) => [cc, 50])), deals: [], legacy: [],
  };
  return state.politics.desk;
}

function groupYear(ctx, d) {
  const { state } = ctx;
  const e = state.economy;
  const b = budgetAt(state, 'national');
  const f = (area) => (b?.funding?.[area] ?? 1);
  const jobs = (0.06 - (e.unemployment ?? 0.05)) * 300;
  for (const [g, def] of Object.entries(GROUPS)) {
    const care = def.areas.reduce((s, a) => s + (f(a) - 1) * 40, 0) / def.areas.length;
    const econ = g === 'business' ? (e.phase === 'recession' ? -6 : 3) : g === 'workers' ? jobs : g === 'young' ? jobs / 2 : 0;
    d.groups[g] = clamp(d.groups[g] + care + econ + (50 - d.groups[g]) * 0.1);
  }
  const avg = Object.values(d.groups).reduce((s, v) => s + v, 0) / Object.keys(d.groups).length;
  state.politics.office.approval = clamp((state.politics.office.approval ?? 50) * 0.6 + avg * 0.4);
}

function crisisYear(ctx, d, rng) {
  const { state } = ctx;
  if (state.prompts.some((p) => p.type === 'desk.crisis')) return;
  // A crisis nobody answered: you let it drift, and the country noticed.
  if (d.crisis?.act === 0) {
    state.politics.office.approval = clamp((state.politics.office.approval ?? 50) - 5);
    d.legacy.push({ age: state.character.age, text: `${CRISES[d.crisis.id]?.title ?? 'A crisis'}: left to drift` });
    d.crisis = null;
    return ctx.log('You let the crisis drift. The country noticed.', '📉', 'warn');
  }
  // Act two: last year's decision comes home.
  if (d.crisis?.act === 1) {
    const c = CRISES[d.crisis.id];
    const worked = rng.chance(d.crisis.choice === c.options[0][0] ? 0.6 : 0.5);
    d.crisis.act = 2;
    ctx.prompt({
      type: 'desk.crisis', icon: worked ? '📈' : '📉', title: `${c.title}: A Year On`,
      text: worked ? 'Your response is being credited. The worst is over — now what do you claim?' : 'Things have got worse. The papers want a scapegoat.',
      options: worked ? [{ id: 'credit', label: '🏆 Take the credit' }, { id: 'thank', label: '🙏 Thank the public servants' }] : [{ id: 'change', label: '🔄 Change course' }, { id: 'sack', label: '🪓 Sack the minister responsible' }, { id: 'hold', label: '🧱 Hold your nerve' }],
      data: { id: d.crisis.id, worked },
    });
    return;
  }
  // The aftermath went unanswered: the crisis passes into history as it stands.
  if (d.crisis?.act === 2) d.crisis = null;
  if (d.crisis || !rng.chance(0.2)) return;
  const id = rng.pick(Object.keys(CRISES));
  const c = CRISES[id];
  d.crisis = { id, act: 0, choice: null };
  ctx.prompt({ type: 'desk.crisis', icon: '🚨', title: c.title, text: c.text, options: c.options.map(([oid, label]) => ({ id: oid, label })), data: { id, act: 0 } });
  ctx.emit('news:story', { tier: 'national', headline: `${c.title}: the government responds`, weight: 8, icon: '🚨' });
}

export const GovernmentDeskModule = {
  id: 'desk',
  order: 63.5,

  onAgeUp(ctx) {
    const { state } = ctx;
    if (!leadsCountry(state)) return;
    const d = ensure(state);
    const rng = sideRng(state, 0x6d);
    groupYear(ctx, d);
    crisisYear(ctx, d, rng);
    // Relations drift back toward neutral; deals keep them warm.
    for (const cc of Object.keys(d.relations)) d.relations[cc] = clamp(d.relations[cc] + (50 - d.relations[cc]) * 0.05 + (d.deals.some((x) => x.cc === cc && x.kind !== 'sanction') ? 1 : 0));
  },

  actions: {
    /** arg: 'CC:trade|alliance|sanction' — one move a year. */
    diplomacy(ctx, arg) {
      const { state } = ctx;
      if (!leadsCountry(state)) return;
      const [cc, kind] = String(arg).split(':');
      const d = ensure(state);
      if (d.relations[cc] == null || !['trade', 'alliance', 'sanction'].includes(kind)) return;
      if (state.yearly['desk.diplomacy']) return ctx.toast('One big diplomatic move a year.', 'warn');
      state.yearly['desk.diplomacy'] = 1;
      const rng = sideRng(state, cc.charCodeAt(0) + kind.length);
      const name = COUNTRIES[cc].name;
      if (kind === 'sanction') {
        d.relations[cc] = clamp(d.relations[cc] - 30);
        d.groups.business = clamp(d.groups.business - 4);
        d.deals = d.deals.filter((x) => x.cc !== cc);
        d.deals.push({ cc, kind, age: state.character.age });
        d.legacy.push({ age: state.character.age, text: `Sanctioned ${name}` });
        return ctx.log(`You imposed sanctions on ${name}.`, '🚫', 'warn');
      }
      const need = kind === 'alliance' ? 65 : 40;
      if (d.relations[cc] < need && !rng.chance(0.3)) { d.relations[cc] = clamp(d.relations[cc] + 5); return ctx.log(`${name} wasn't ready for ${kind === 'trade' ? 'a trade deal' : 'an alliance'}. Talks will continue.`, '🤝', 'info'); }
      d.deals.push({ cc, kind, age: state.character.age });
      d.relations[cc] = clamp(d.relations[cc] + 10);
      if (kind === 'trade') { d.groups.business = clamp(d.groups.business + 6); d.groups.rural = clamp(d.groups.rural + 2); }
      else d.groups.rural = clamp(d.groups.rural + 3);
      d.legacy.push({ age: state.character.age, text: `${kind === 'trade' ? 'Trade deal' : 'Alliance'} with ${name}` });
      ctx.emit('news:story', { tier: 'world', headline: `${kind === 'trade' ? 'Trade deal' : 'New alliance'} signed with ${name}`, weight: 6, icon: '🤝', you: true });
      ctx.log(`You signed ${kind === 'trade' ? 'a trade deal' : 'an alliance'} with ${name}.`, '🤝', 'milestone');
    },
  },

  resolvers: {
    crisis(ctx, data, optionId) {
      const { state } = ctx;
      const d = ensure(state);
      const c = CRISES[data.id];
      if (!c) return;
      if (data.act === 0) {
        for (const [g, v] of Object.entries(c.hit[optionId] ?? {})) d.groups[g] = clamp(d.groups[g] + v);
        d.crisis = { id: data.id, act: 1, choice: optionId };
        return ctx.log(`${c.title}: you chose to ${c.options.find((o) => o[0] === optionId)?.[1].replace(/^\S+ /, '').toLowerCase()}.`, '🚨', 'info');
      }
      d.crisis = null;
      const shift = { credit: 4, thank: 2, change: 1, sack: 2, hold: -3 }[optionId] ?? 0;
      state.politics.office.approval = clamp((state.politics.office.approval ?? 50) + shift + (data.worked ? 4 : -6));
      d.legacy.push({ age: state.character.age, text: `${c.title}: ${data.worked ? 'handled' : 'mishandled'}` });
      ctx.log(data.worked ? `The ${c.title.toLowerCase()} became part of your record — the good part.` : `The ${c.title.toLowerCase()} will follow you into the history books.`, data.worked ? '🏆' : '📉', data.worked ? 'good' : 'warn');
    },
  },
};
