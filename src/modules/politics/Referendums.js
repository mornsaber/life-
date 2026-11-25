/**
 * Referendums: votes whose result isn't written in advance.
 *
 *   History's referendums   held in their year in the country they were held in, but counted in this
 *                           world: history's share is where opinion starts, and the campaign, the
 *                           news and you move it. Norway can join the Common Market in 1972; the
 *                           Faroes can leave Denmark in 1946; Bermuda can vote itself independent.
 *   Laws put to the people  Ireland's divorce, marriage and abortion votes, Switzerland's women's
 *                           suffrage: the result sets the law (politics/StatuteBook.js), whichever way.
 *   Your referendums        a head of government can put a question to the people: independence or
 *                           statehood for a self-governing territory, or any of the country's laws;
 *                           a legislator can table a referendum bill. The vote comes the next year.
 *                           (A republic: world/Houses.js already puts the Crown to the people.)
 *
 * state.world.referendums = { held: { [id]: { year, yes } }, pending: [{ id, cc, q, year, called }] }
 */
import { yearNow, autonomyOf, AUTONOMOUS } from '../world/Eras.js';
import { COUNTRIES, isCitizen } from '../world/Countries.js';
import { STATUTES, statuteIn } from './StatuteBook.js';
import { setEuOverrides } from '../world/EuMembership.js';
import { setReformLayer } from '../world/Regimes.js';
import { governsHere } from '../world/Reforms.js';
import { clamp } from '../../core/Random.js';

const cname = (cc) => COUNTRIES[cc]?.name ?? cc;
const rec = (state) => ((state.world ??= {}).referendums ??= { held: {}, pending: [] });

/* ---- What a result does ---- */
/** A self-governing territory votes itself out: it is its own state from now on. */
export function becomeIndependent(ctx, cc) {
  const { state } = ctx;
  (state.world.independent ??= {})[cc] = yearNow(state);
  const w = (state.world.reforms ??= {});
  w[cc] = { ...(w[cc] ?? {}), kind: 'democracy', name: `independent ${cname(cc).replace(/^the /, '')}, a parliamentary democracy`, leader: 'the Prime Minister', elections: 'free', press: 'free' };
  setReformLayer(w);
}
const setLaw = (state, cc, id, value) => {
  state.laws ??= {};
  if (cc === 'US') (state.laws.federal ??= {})[id] = value;
  else { state.laws.nations ??= {}; (state.laws.nations[cc] ??= {})[id] = value; }
};
const setEu = (state, cc, member) => {
  const o = ((state.world.euMember ??= {}));
  o[cc] = member ? [yearNow(state) + 1] : [9999];
  setEuOverrides(o);
};

/* ---- History's referendums: [year, country, history's yes share, the question, its two sides, what each result does] ---- */
const R = (id, cc, year, yes, title, text, [yesLabel, noLabel], { yesText, noText, onYes, onNo, icon = '🗳️', age = null } = {}) => ({ id, cc, year, yes, title, text, yesLabel, noLabel, yesText, noText, onYes, onNo, icon, age });
export const HISTORIC = [
  R('no1905', 'NO', 1905, 0.9995, 'Independence from Sweden', 'Norway votes on dissolving the union with Sweden.', ['🇳🇴 For dissolution', '🇸🇪 For the union'],
    { yesText: 'Dissolution, almost unanimously: Norway is its own kingdom; a Danish prince becomes Haakon VII.', noText: 'Astonishingly, the union stands. The Storting\'s rebellion collapses.', icon: '🇳🇴', age: 25 }),
  R('fo1946', 'FO', 1946, 0.507, 'The 1946 referendum', 'The Faroese vote on whether to leave Denmark. Copenhagen may not accept a narrow result.', ['🇫🇴 For independence', '🇩🇰 To stay with Denmark'],
    { yesText: 'Independence wins.', noText: 'The islands vote to stay with Denmark; home rule comes two years later.',
      onYes: (ctx) => { if (ctx.rng.chance(0.5)) return 'Denmark annulled the result, dissolved the Løgting and offered home rule instead.'; becomeIndependent(ctx, 'FO'); return 'Copenhagen accepted it: the Faroe Islands are an independent country.'; } }),
  R('au1967', 'AU', 1967, 0.908, 'The 1967 Referendum', 'A referendum to count Aboriginal people in the census and let the Commonwealth make laws for them.', ['✅ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, by the biggest margin any Australian referendum has had.', noText: 'It failed. The Commonwealth still cannot make laws for Aboriginal people.', age: 21 }),
  R('dk1972', 'DK', 1972, 0.633, 'Joining the Common Market', 'Denmark votes on joining the European Economic Community, with Britain and Ireland.', ['🇪🇺 Vote yes', '🇩🇰 Vote no'],
    { yesText: 'Denmark joins the Common Market in 1973.', noText: 'Denmark stays out; Britain and Ireland join without it.', onNo: (ctx) => { setEu(ctx.state, 'DK', false); return null; } }),
  R('no1972', 'NO', 1972, 0.465, 'Into Europe?', 'Norway votes on joining the European Economic Community. The fishermen and the farmers are against.', ['🇪🇺 Vote yes', '🎣 Vote no'],
    { yesText: 'Norway joins the Common Market in 1973.', noText: 'No wins: Norway stays out of Europe.', onYes: (ctx) => { setEu(ctx.state, 'NO', true); return null; } }),
  R('at1978', 'AT', 1978, 0.495, 'Zwentendorf', 'Austria votes on switching on its first, finished nuclear power station.', ['⚡ Vote yes', '🚫 Vote no'],
    { yesText: 'Yes, narrowly: Zwentendorf goes online.', noText: 'No, by thirty thousand votes; the plant never runs a day.', icon: '☢️' }),
  R('gl1982', 'GL', 1982, 0.53, 'Leave the European Community?', 'Greenland went into the European Community with Denmark, though most Greenlanders voted against. With home rule there is a vote on leaving; the fishing grounds are the question.', ['🐟 Vote to leave', '🇪🇺 Vote to stay'],
    { yesText: 'Leave wins: Greenland leaves the EC in 1985, the first place ever to do so.', noText: 'Greenland votes to stay in the Community.' }),
  R('cl1988', 'CL', 1988, 0.56, 'The Plebiscite', 'Pinochet asks for eight more years. The "No" campaign has rainbows, jingles and fifteen minutes of television a night.', ['🌈 Vote No', '✔️ Vote Yes (for Pinochet)'],
    { yesText: 'No wins: the dictatorship will hand over to an elected president in 1990.', noText: 'Yes wins, and Pinochet stays. The opposition calls it rigged.', icon: '🌈' }),
  R('ch1992', 'CH', 1992, 0.497, 'The EEA Vote', 'Switzerland votes on joining the European Economic Area.', ['🇪🇺 Vote yes', '🇨🇭 Vote no'],
    { yesText: 'Yes, by a hair: Switzerland joins the European Economic Area.', noText: 'No, by a hair: Switzerland stays out, and goes its own way with bilateral treaties.' }),
  R('bm1995', 'BM', 1995, 0.26, 'The independence referendum', 'Bermuda votes on independence from Britain. The banks and the hotels are nervous; a hurricane has just come through.', ['🇧🇲 Vote for independence', '🇬🇧 Vote to stay British'],
    { yesText: 'Independence wins.', noText: 'Bermuda stays a British territory.', onYes: (ctx) => { becomeIndependent(ctx, 'BM'); return 'Bermuda will be an independent country.'; } }),
  R('cm1961', 'CM', 1961, 0.70, 'The Plebiscite', 'The British Cameroons vote on whether to join Cameroun or Nigeria.', ['🇨🇲 Vote to join Cameroun', '🇳🇬 Vote to join Nigeria'],
    { yesText: 'The south votes to join Cameroun; the north goes to Nigeria.', noText: 'The south votes to join Nigeria, with the north.' }),
  R('uz1991', 'UZ', 1991, 0.983, 'Independence', 'With the Soviet Union falling apart, Uzbekistan votes on independence.', ['🇺🇿 Vote for independence', '☭ Vote against'],
    { yesText: 'Independence, almost unanimously.', noText: 'Against all expectation, the vote goes against independence; Tashkent declares it anyway.', icon: '🇺🇿' }),
  R('ca1995', 'CA', 1995, 0.494, 'The Referendum', 'Quebec votes on sovereignty. On the eve, a hundred thousand Canadians rally in Montreal to ask Quebec to stay.', ['⚜️ Oui: a sovereign Quebec', '🍁 Non: stay in Canada'],
    { yesText: 'Oui wins, by a hair. Quebec\'s government will negotiate its way out of Canada.', noText: 'Non wins, by a hair; the premier blames "money and the ethnic vote" and resigns.' }),
  R('ie1995', 'IE', 1995, 0.503, 'Divorce', 'Ireland votes on removing the ban on divorce from the Constitution.', ['✅ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, by nine thousand votes: divorce is lawful in Ireland.', noText: 'No: divorce stays banned.', onYes: (ctx) => { setLaw(ctx.state, 'IE', 'divorce', true); return null; }, onNo: (ctx) => { setLaw(ctx.state, 'IE', 'divorce', false); return null; } }),
  R('ch1971', 'CH', 1971, 0.657, 'Votes for women', 'Swiss men vote on giving women the vote in federal elections.', ['✅ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Swiss women vote from this year.', noText: 'No, again: Swiss women still can\'t vote.', onYes: (ctx) => { setLaw(ctx.state, 'CH', 'womensSuffrage', true); return null; }, onNo: (ctx) => { setLaw(ctx.state, 'CH', 'womensSuffrage', false); return null; } }),
  R('gi2002', 'GI', 2002, 0.0103, 'Joint sovereignty?', 'London and Madrid have been talking about sharing sovereignty over Gibraltar. The Chief Minister has called a referendum of his own.', ['✅ Vote yes', '❌ Vote no'],
    { yesText: 'Yes, to everyone\'s astonishment: talks on sharing sovereignty with Spain go ahead.', noText: 'No, by 98.97 per cent. The talks go nowhere.', icon: '🪨' }),
  R('ie2015', 'IE', 2015, 0.621, 'Marriage equality', 'Ireland votes on allowing two people to marry without distinction as to their sex.', ['🌈 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Ireland is the first country to bring in same-sex marriage by popular vote.', noText: 'No: marriage stays between a man and a woman.', onYes: (ctx) => { setLaw(ctx.state, 'IE', 'sameSexMarriage', true); return null; }, onNo: (ctx) => { setLaw(ctx.state, 'IE', 'sameSexMarriage', false); return null; } }),
  R('co2016', 'CO', 2016, 0.498, 'The Peace Vote', 'Colombia votes on the peace deal with the FARC after fifty years of war.', ['🕊️ Vote yes', '✋ Vote no'],
    { yesText: 'Yes: the peace deal stands.', noText: 'No, by a whisker. The deal is renegotiated, and signed again without a vote.', icon: '🕊️' }),
  R('ie2018', 'IE', 2018, 0.664, 'Repeal the Eighth', 'Ireland votes on repealing the constitutional ban on abortion.', ['✅ Vote yes (repeal)', '✖️ Vote no'],
    { yesText: 'Yes, by two to one: abortion is lawful in Ireland.', noText: 'No: the Eighth Amendment stays.', onYes: (ctx) => { setLaw(ctx.state, 'IE', 'abortion', true); return null; }, onNo: (ctx) => { setLaw(ctx.state, 'IE', 'abortion', false); return null; } }),
  R('pr2020', 'PR', 2020, 0.525, 'Statehood', 'Puerto Rico votes on whether to ask to become the 51st state.', ['⭐ Vote for statehood', '✖️ Vote no'],
    { yesText: 'Statehood wins. It is up to Congress now.', noText: 'No: Puerto Rico stays a Commonwealth.', onYes: (ctx) => statehood(ctx, 'PR') }),
];

/** Congress admits a territory, or doesn't. */
function statehood(ctx, cc) {
  const { state, rng } = ctx;
  if (!rng.chance(0.25)) return 'Congress let the bill die, as it had before.';
  (state.world.statehood ??= {})[cc] = yearNow(state);
  const w = (state.world.reforms ??= {});
  w[cc] = { ...(w[cc] ?? {}), name: `the State of ${cname(cc)}, the 51st state`, leader: 'the Governor' };
  setReformLayer(w);
  return `Congress admitted ${cname(cc)} as the 51st state. Its people will vote for the President.`;
}

/* ---- Questions a government can put ---- */
/** Support for independence where a territory might hold the vote. */
const INDEPENDENCE_SUPPORT = { PR: 0.05, GL: 0.4, FO: 0.45, GI: 0.02, BM: 0.25, KY: 0.1, JE: 0.12, GG: 0.1, IM: 0.1 };
/** The questions open to you, as head of government (or a legislator tabling a bill). */
export function questionsHere(state) {
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  const out = [];
  const auto = autonomyOf(state, cc);
  if (auto && INDEPENDENCE_SUPPORT[cc] != null) out.push({ q: 'independence', label: `🏳️ Independence for ${cname(cc)}`, support: INDEPENDENCE_SUPPORT[cc] });
  if (auto && cc === 'PR' && !state.world?.statehood?.PR) out.push({ q: 'statehood', label: '⭐ Statehood (the 51st state)', support: 0.5 });
  for (const [id, s] of Object.entries(STATUTES)) {
    if (s.where && !s.where(cc)) continue;
    if ((s.from ?? 1800) > y || (s.to != null && y >= s.to)) continue;
    const now = statuteIn(state, id, cc);
    out.push({ q: `law:${id}`, label: `${s.icon ?? '📜'} ${now ? 'Repeal' : 'Bring in'}: ${s.name.toLowerCase()}`, support: lawSupport(s, cc, y, !now) });
  }
  return out;
}
/** Support for changing a law: high where history was about to make the change, low where it went the other way. */
function lawSupport(s, cc, y, want) {
  for (let k = 0; k <= 60; k += 5) if (Boolean(s.history(cc, y + k)) === want) return clamp(0.5 - k * 0.004, 0.25, 0.55);
  return 0.32;
}

/* ---- Holding the vote ---- */
const votingAge = (y) => (y < 1970 ? 21 : 18);
function noise(rng) { return (rng.float(-1, 1) + rng.float(-1, 1) + rng.float(-1, 1)) * 0.035; }

function holdPrompt(ctx, ref) {
  const { state } = ctx;
  const cc = state.character.countryId ?? 'US';
  const canVote = state.character.age >= (ref.age ?? votingAge(yearNow(state))) && isCitizen(state, cc) && !state.legal?.incarceration;
  if (!canVote || state.prompts.some((p) => p.type === 'referendum.vote')) return count(ctx, ref, 0, null);
  ctx.prompt({ type: 'referendum.vote', icon: ref.icon ?? '🗳️', title: ref.title, text: `${ref.text} The polls have it close to ${Math.round(ref.yes * 100)}% yes.`,
    options: [
      { id: 'yes', label: ref.yesLabel }, { id: 'no', label: ref.noLabel },
      { id: 'campaignYes', label: `📣 Campaign: ${ref.yesLabel.replace(/^\S+\s/, '')}` }, { id: 'campaignNo', label: `📣 Campaign: ${ref.noLabel.replace(/^\S+\s/, '')}` },
      { id: 'abstain', label: '🤷 Stay at home' },
    ], data: { ref: ref.id ?? null, custom: ref.custom ?? null } });
}

function count(ctx, ref, push, vote) {
  const { state, rng } = ctx;
  const share = clamp(ref.yes + noise(rng) + push, 0.001, 0.9995);
  const won = share > 0.5;
  rec(state).held[ref.id ?? `${ref.custom.q}.${yearNow(state)}`] = { year: yearNow(state), yes: Math.round(share * 1000) / 10 };
  const what = won ? (ref.onYes?.(ctx) ?? null) : (ref.onNo?.(ctx) ?? null);
  const pct = share > 0.995 ? '99.9' : (Math.round(share * 1000) / 10).toFixed(1);
  const side = vote == null ? '' : vote === won ? ' You were on the winning side.' : ' You were on the losing side.';
  ctx.log(`🗳️ ${ref.title}: ${pct}% yes. ${won ? ref.yesText : ref.noText}${what ? ` ${what}` : ''}${side}`, '🗳️', 'milestone');
  ctx.emit?.('news:story', { tier: 'national', headline: `${cname(state.character.countryId ?? 'US')}: ${ref.title}: ${won ? 'yes' : 'no'} (${pct}%)`, weight: 8, icon: '🗳️' });
  return won;
}

/** A question a government put, as a referendum to hold. */
function customRef(state, { q, cc, called }) {
  const opts = questionsHere({ ...state, character: { ...state.character, countryId: cc } });
  const o = opts.find((x) => x.q === q);
  const base = (o?.support ?? 0.4) + (called ? clamp(((state.politics?.approval ?? 50) - 50) / 400, -0.05, 0.05) : 0);
  if (q === 'independence') return { custom: { q, cc }, title: `A referendum on independence`, text: `${cname(cc)} votes on whether to become an independent country.`, yes: base, yesLabel: '🏳️ For independence', noLabel: '✖️ Against', yesText: 'Independence wins.', noText: 'Independence loses.', onYes: (ctx) => { becomeIndependent(ctx, cc); return `${cname(cc)} will be an independent country.`; } };
  if (q === 'statehood') return { custom: { q, cc }, title: 'A referendum on statehood', text: `${cname(cc)} votes on asking to become a state of the Union.`, yes: base, yesLabel: '⭐ For statehood', noLabel: '✖️ Against', yesText: 'Statehood wins. It is up to Congress now.', noText: 'Statehood loses.', onYes: (ctx) => statehood(ctx, cc) };
  const id = q.slice(4);
  const s = STATUTES[id];
  const want = !statuteIn(state, id, cc);
  return { custom: { q, cc }, title: `A referendum: ${s?.name ?? id}`, text: `${want ? 'Should' : 'Should we keep'} ${(s?.name ?? id).toLowerCase()}${want ? ' become law?' : '?'} ${s?.effect ?? ''}`, yes: base,
    yesLabel: want ? '✅ Vote yes: bring it in' : '✅ Vote yes: repeal it', noLabel: '✖️ Vote no', yesText: want ? 'Yes: it becomes law.' : 'Yes: it is repealed.', noText: 'No: the law stays as it is.',
    onYes: (ctx) => { setLaw(ctx.state, cc, id, want); return null; } };
}

export const ReferendumsModule = {
  id: 'referendum',
  order: 34.4,
  init(state) { setEuOverrides(state.world?.euMember ?? {}); },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive) return;
    const cc = state.character.countryId ?? 'US';
    const y = yearNow(state);
    const r = rec(state);
    for (const ref of HISTORIC) if (ref.cc === cc && ref.year === y && !r.held[ref.id] && state.era) return holdPrompt(ctx, ref);
    const due = r.pending.find((p) => p.cc === cc && p.year <= y);
    if (due) {
      r.pending = r.pending.filter((p) => p !== due);
      holdPrompt(ctx, customRef(state, due));
    }
  },
  actions: {
    /** Put a question to the people: arg is the question id (independence, statehood, law:<statute>). */
    call(ctx, q) {
      const { state, rng } = ctx;
      const cc = state.character.countryId ?? 'US';
      const r = rec(state);
      if (r.pending.some((p) => p.cc === cc)) return ctx.toast('A referendum is already on its way', 'warn');
      if (!questionsHere(state).some((x) => x.q === q)) return ctx.toast('Not a question that can be put here', 'warn');
      if (state.yearly['referendum.call']) return ctx.toast('One referendum bill a year', 'warn');
      state.yearly['referendum.call'] = true;
      const leader = governsHere(state);
      // A legislator's bill has to get through the chamber first.
      if (!leader && !rng.chance(0.35)) return ctx.log('Your referendum bill was voted down in the chamber.', '🗳️', 'warn');
      r.pending.push({ cc, q, year: yearNow(state) + 1, called: leader });
      return ctx.log(leader ? 'Your government has called a referendum. The country votes next year.' : 'Your referendum bill passed. The country votes next year.', '🗳️', 'milestone');
    },
  },
  resolvers: {
    vote(ctx, data, optionId) {
      const { state } = ctx;
      const ref = data.ref ? HISTORIC.find((x) => x.id === data.ref) : customRef(state, data.custom);
      if (!ref) return;
      const famous = (state.fame?.score ?? 0) > 40 || Boolean(state.politics?.office);
      const push = { campaignYes: famous ? 0.03 : 0.012, campaignNo: famous ? -0.03 : -0.012 }[optionId] ?? 0;
      if (optionId.startsWith('campaign')) ctx.stat('stress', 3);
      const vote = optionId === 'abstain' ? null : /yes/i.test(optionId);
      count(ctx, ref, push, vote);
    },
  },
};
export const historicReferendum = (id) => HISTORIC.find((x) => x.id === id);
export { AUTONOMOUS };
