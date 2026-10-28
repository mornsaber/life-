/**
 * The European Parliament: 720 MEPs from every member state, sitting in political groups
 * rather than national delegations. It co-legislates with the Council, so what it adopts
 * becomes law in every member state — including yours.
 *
 *   Groups        EPP, S&D, Renew, Greens/EFA, ECR, Patriots, the Left, ESN, non-attached;
 *                 each votes on a left–right lean and on how much Europe it wants
 *   Committees    EMPL, ENVI, ITRE, ECON, LIBE, INTA, AFET, BUDG: the files you can report on
 *   The agenda    each year three or four files (directives, regulations, trade agreements,
 *                 sanctions) go to a plenary vote. Cast your vote; as rapporteur you steer a
 *                 file through committee and the trilogue with the Council
 *   Adopted law   a directive changes the national law of every member state (paid leave,
 *                 workplace safety, environmental rules, competition, non-competes); a trade
 *                 agreement or a sanctions package changes relations with that country
 *   Powers        confirmation hearings for the Commission (the Parliament can and does
 *                 reject commissioners-designate), a motion of censure, the annual budget
 *   The ladder    member → group coordinator → committee chair → group leader or Vice-
 *                 President → President of the European Parliament (elected by the MEPs,
 *                 at the start and middle of each term)
 *
 * state.europarl = { group, committee, post, influence, since, agenda: [file], adopted: [id],
 *                    reports: [{ id, name, age, outcome }], record: [{ age, text }] }
 * file = { id, name, committee, lawId?, direction?, lean, integration, kind, cc?, push, myVote, rapporteur }
 */
import { clamp } from '../../core/Random.js';
import { randomName, yearlyCount, bumpYearly } from '../../core/State.js';
import { OFFICES } from './Offices.js';
import { LAWS, levelValue, proposedValue, enact, describeValue } from './Laws.js';
import { EU_MEMBERS } from '../career/IntlOrgCareers.js';
import { COUNTRIES } from '../world/Countries.js';

/** Political groups: seats, lean (+ toward labour/left), scepticism (votes against more Europe). */
export const GROUPS = {
  epp: { name: 'European People\'s Party (EPP)', short: 'EPP', seats: 188, lean: -0.35, sceptic: 0 },
  sd: { name: 'Progressive Alliance of Socialists and Democrats (S&D)', short: 'S&D', seats: 136, lean: 0.65, sceptic: 0 },
  pfe: { name: 'Patriots for Europe', short: 'PfE', seats: 84, lean: -0.45, sceptic: 0.6 },
  ecr: { name: 'European Conservatives and Reformists (ECR)', short: 'ECR', seats: 78, lean: -0.6, sceptic: 0.35 },
  renew: { name: 'Renew Europe', short: 'Renew', seats: 77, lean: 0, sceptic: 0 },
  greens: { name: 'Greens/European Free Alliance', short: 'Greens/EFA', seats: 53, lean: 0.85, sceptic: 0 },
  left: { name: 'The Left', short: 'Left', seats: 46, lean: 1, sceptic: 0.25 },
  esn: { name: 'Europe of Sovereign Nations (ESN)', short: 'ESN', seats: 25, lean: -0.7, sceptic: 0.8 },
  ni: { name: 'Non-attached members', short: 'NI', seats: 33, lean: -0.2, sceptic: 0.4 },
};
const TOTAL = Object.values(GROUPS).reduce((s, g) => s + g.seats, 0);

export const COMMITTEES = {
  EMPL: 'Employment and Social Affairs', ENVI: 'Environment, Climate and Food Safety', ITRE: 'Industry, Research and Energy',
  ECON: 'Economic and Monetary Affairs', LIBE: 'Civil Liberties, Justice and Home Affairs', INTA: 'International Trade',
  AFET: 'Foreign Affairs', BUDG: 'Budgets',
};

export const POSTS = {
  member: { title: 'MEP', rank: 0 },
  coordinator: { title: 'Group coordinator', rank: 1 },
  chair: { title: 'Committee chair', rank: 2 },
  vicePresident: { title: 'Vice-President of the European Parliament', rank: 3 },
  groupLeader: { title: 'Group leader', rank: 3 },
  president: { title: 'President of the European Parliament', rank: 4 },
};

/** The legislative files that come before the Parliament. lean: + favours labour/left; integration: how much "more Europe". */
const FILES = [
  { id: 'workLife', name: 'Work-Life Balance Directive', committee: 'EMPL', lawId: 'paidLeave', direction: 'up', lean: 0.6, integration: 0.4, kind: 'directive' },
  { id: 'carcinogens', name: 'Carcinogens and Mutagens at Work Directive', committee: 'EMPL', lawId: 'workplaceSafety', direction: 'up', lean: 0.4, integration: 0.3, kind: 'directive' },
  { id: 'labourMobility', name: 'Fair Labour Mobility Directive (non-compete clauses)', committee: 'EMPL', lawId: 'nonCompeteBan', direction: 'up', lean: 0.5, integration: 0.4, kind: 'directive' },
  { id: 'natureRestoration', name: 'Nature Restoration Regulation', committee: 'ENVI', lawId: 'environmental', direction: 'up', lean: 0.55, integration: 0.5, kind: 'regulation' },
  { id: 'simplification', name: 'Omnibus Simplification Package', committee: 'ENVI', lawId: 'environmental', direction: 'down', lean: -0.5, integration: 0.1, kind: 'regulation' },
  { id: 'dma', name: 'Digital Markets Act', committee: 'ECON', lawId: 'antitrust', direction: 'up', lean: 0.25, integration: 0.5, kind: 'regulation' },
  { id: 'safetyRelief', name: 'SME Relief Package (workplace reporting)', committee: 'EMPL', lawId: 'workplaceSafety', direction: 'down', lean: -0.45, integration: 0.1, kind: 'directive' },
  { id: 'aiAct', name: 'Artificial Intelligence Act', committee: 'ITRE', lean: 0.2, integration: 0.5, kind: 'regulation' },
  { id: 'migrationPact', name: 'Pact on Migration and Asylum', committee: 'LIBE', lean: -0.3, integration: 0.4, kind: 'regulation' },
  { id: 'chipsAct', name: 'European Chips Act', committee: 'ITRE', lean: 0, integration: 0.4, kind: 'regulation', growth: 0.002 },
  { id: 'capReform', name: 'Common Agricultural Policy Reform', committee: 'BUDG', lean: -0.2, integration: 0.2, kind: 'regulation', growth: 0.001 },
  { id: 'defenceFund', name: 'European Defence Industrial Programme', committee: 'ITRE', lean: -0.25, integration: 0.5, kind: 'regulation', growth: 0.001 },
  { id: 'trade', name: 'Free Trade Agreement', committee: 'INTA', lean: -0.15, integration: 0.3, kind: 'consent', partners: ['JP', 'CA', 'IN', 'AU', 'MX', 'BR', 'KR', 'NZ'] },
  { id: 'sanctions', name: 'Sanctions package', committee: 'AFET', lean: 0.1, integration: 0.3, kind: 'resolution', partners: ['RU', 'IR', 'KP'] },
];

const SHORT = { directive: 'directive', regulation: 'regulation', consent: 'agreement (consent)', resolution: 'resolution' };

/** Is the character a sitting MEP? */
export const isMep = (state) => /_mep$/.test(state.politics?.office?.id ?? '');
const ep = (state) => state.europarl;
const homeCc = (state) => OFFICES[state.politics?.office?.id]?.country ?? state.character.countryId ?? 'DE';
const rankOf = (state) => POSTS[ep(state)?.post ?? 'member'].rank;
const log = (state, text) => { const e = ep(state); e.record = [...(e.record ?? []).slice(-11), { age: state.character.age, text }]; };
const bumpInfluence = (state, n) => { const e = ep(state); e.influence = Math.round(clamp((e.influence ?? 0) + n, 0, 100)); };

function join(state) {
  const bloc = state.civic?.party?.bloc;
  const group = bloc === 'labor' ? 'sd' : bloc === 'business' ? 'epp' : 'renew';
  const was = state.europarl;
  state.europarl = { wasPresident: was?.wasPresident, reports: was?.reports ?? [], group, committee: group === 'sd' ? 'EMPL' : group === 'epp' ? 'ECON' : 'ITRE', post: 'member', influence: 5, since: state.character.age, agenda: [], adopted: was?.adopted ?? [], record: [] };
  return state.europarl;
}

/** Draw this year's agenda: files not yet adopted, plus a trade agreement or sanctions now and then. */
function newAgenda(state, rng) {
  const e = ep(state);
  const pool = rng.shuffle(FILES.filter((f) => !e.adopted.includes(f.id) || f.partners));
  const agenda = [];
  for (const f of pool) {
    if (agenda.length >= rng.int(3, 4)) break;
    const file = { ...f, push: 0, myVote: null, rapporteur: false };
    delete file.partners;
    if (f.partners) {
      const cc = rng.pick(f.partners.filter((c) => COUNTRIES[c]));
      if (!cc) continue;
      file.cc = cc;
      file.id = `${f.id}:${cc}`;
      file.name = f.id === 'trade' ? `EU–${COUNTRIES[cc].name} ${f.name}` : `${f.name} against ${COUNTRIES[cc].name}`;
      if (e.adopted.includes(file.id)) continue;
    }
    // A directive that would change nothing at home (already the law) is off the agenda.
    if (f.lawId && proposedValue(f.lawId, levelValue(state, f.lawId, 'federal', homeCc(state)), f.direction) === null) continue;
    agenda.push(file);
  }
  e.agenda = agenda;
}

/** How many of the 720 vote yes on a file. Your group follows you if you lead it. */
export function tally(state, file, rng) {
  const e = ep(state);
  let yes = 0;
  // Files reach the plenary as compromises, so most pass; how good the deal looks moves every group at once.
  const mood = (rng.next() - 0.5) * 0.24;
  for (const [id, g] of Object.entries(GROUPS)) {
    let p = clamp(0.57 + mood + file.lean * g.lean * 0.5 - file.integration * g.sceptic * 0.6 + file.push, 0.03, 0.97);
    if (id === e.group && e.myVoteWhip && file.myVote) p = file.myVote === 'yes' ? 0.93 : file.myVote === 'no' ? 0.07 : p;
    // Group discipline is high but not total: a few rebels either way.
    const rebels = (rng.next() - 0.5) * 0.12;
    yes += Math.round(g.seats * clamp(p + rebels, 0, 1));
  }
  if (file.myVote === 'yes') yes += 1;
  yes = clamp(yes, 0, TOTAL);
  return { yes, no: TOTAL - yes, passed: yes > TOTAL / 2 };
}

/** What an adopted file does in the world. */
function applyFile(ctx, file) {
  const { state } = ctx;
  const changed = [];
  if (file.lawId) {
    for (const cc of EU_MEMBERS) {
      const cur = levelValue(state, file.lawId, 'federal', cc);
      const next = proposedValue(file.lawId, cur, file.direction);
      if (next === null) continue;
      enact(state, { level: 'federal', where: cc, lawId: file.lawId, value: next, sponsor: 'the European Union', age: state.character.age });
      if (cc === homeCc(state)) changed.push(`${LAWS[file.lawId].name}: now ${describeValue(file.lawId, next)}`);
    }
  }
  if (file.cc) {
    const rel = (state.world.relations ??= {});
    rel[file.cc] = Math.round(clamp((rel[file.cc] ?? 0) + (file.kind === 'consent' ? 10 : -15), -100, 100));
    if (file.kind === 'consent' && state.economy) state.economy.growth = (state.economy.growth ?? 0) + 0.002;
  }
  if (file.growth && state.economy) state.economy.growth = (state.economy.growth ?? 0) + file.growth;
  return changed;
}

/** Last year's agenda goes to the plenary. */
function plenary(ctx) {
  const { state, rng } = ctx;
  const e = ep(state);
  for (const file of e.agenda ?? []) {
    const t = tally(state, file, rng);
    const close = Math.abs(t.yes - TOTAL / 2) <= 6;
    if (t.passed) {
      e.adopted.push(file.id);
      const changed = applyFile(ctx, file);
      const mine = file.rapporteur ? ' — your report' : '';
      ctx.log(`🇪🇺 The European Parliament adopted the ${file.name}${mine} (${t.yes}–${t.no}).${changed.length ? ` At home: ${changed.join('; ')}.` : ''}`, '🇪🇺', file.rapporteur ? 'milestone' : 'info');
      log(state, `${file.name}: adopted ${t.yes}–${t.no}${file.myVote ? `, you voted ${file.myVote}` : ''}`);
      if (file.rapporteur) {
        e.reports.push({ id: file.id, name: file.name, age: state.character.age, outcome: 'adopted' });
        bumpInfluence(state, 10);
        state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + 6);
        ctx.emit('fame:buzz', { amount: 4 });
      }
    } else {
      ctx.log(`🇪🇺 The European Parliament rejected the ${file.name} (${t.yes}–${t.no}).`, '🇪🇺', file.rapporteur ? 'bad' : 'info');
      log(state, `${file.name}: rejected ${t.yes}–${t.no}${file.myVote ? `, you voted ${file.myVote}` : ''}`);
      if (file.rapporteur) {
        e.reports.push({ id: file.id, name: file.name, age: state.character.age, outcome: 'rejected' });
        bumpInfluence(state, -4);
      }
    }
    if (close && file.myVote && file.myVote !== 'abstain' && (file.myVote === 'yes') === t.passed) {
      ctx.log(`It came down to a handful of votes, and yours was one of them.`, '🗳️', 'good');
      bumpInfluence(state, 2);
    }
  }
  e.agenda = [];
  e.myVoteWhip = false;
}

/** The new Commission faces the Parliament's hearings at the start of each term. */
function hearings(ctx) {
  const { state, rng } = ctx;
  const nm = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
  const cc = rng.pick(EU_MEMBERS.filter((c) => COUNTRIES[c]));
  const portfolio = rng.pick(['Trade', 'Competition', 'Energy', 'Justice', 'Migration', 'Agriculture', 'the Internal Market', 'Health', 'Climate Action', 'Defence']);
  const flaw = rng.pick(['a conflict of interest over a family company', 'evasive answers on the portfolio', 'a past corruption inquiry at home', 'nothing: a strong performance', 'a poor grasp of the files']);
  ctx.prompt({
    type: 'europarl.hearing', icon: '🇪🇺', title: 'Commission Hearings',
    text: `The commissioner-designate for ${portfolio}, ${nm.firstName} ${nm.lastName} (${COUNTRIES[cc].flag} ${COUNTRIES[cc].name}), comes before your committee. The hearing showed ${flaw}.`,
    options: [{ id: 'approve', label: '✅ Approve the nominee' }, { id: 'grill', label: '🔥 Grill them and vote to reject' }],
    data: { name: `${nm.firstName} ${nm.lastName}`, cc, portfolio, weak: !/strong/.test(flaw) },
  });
}

/** Promotion inside the Parliament: the groups hand out coordinator and chair posts. */
function ladder(ctx) {
  const { state, rng } = ctx;
  const e = ep(state);
  const years = state.character.age - e.since;
  if (e.post === 'member' && years >= 1 && rng.chance(clamp(0.1 + e.influence / 150, 0.05, 0.6))) {
    e.post = 'coordinator';
    ctx.log(`Your group made you its coordinator on the ${COMMITTEES[e.committee]} committee: you speak for ${GROUPS[e.group].short} there.`, '🇪🇺', 'good');
  } else if (e.post === 'coordinator' && years >= 3 && rng.chance(clamp(e.influence / 250, 0.02, 0.3))) {
    e.post = 'chair';
    ctx.log(`Elected chair of the ${COMMITTEES[e.committee]} committee.`, '🇪🇺', 'milestone');
  }
}

export const EuropeanParliamentModule = {
  id: 'europarl',
  order: 33.5,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.character.alive) return;
    if (!isMep(state)) {
      if (state.europarl && !state.europarl.left) {
        state.europarl.left = state.character.age;
        state.europarl.agenda = [];
      }
      return;
    }
    if (!state.europarl || state.europarl.left) join(state);
    plenary(ctx);
    ladder(ctx);
    newAgenda(state, rng);
    const o = state.politics.office;
    if (o.termYearsLeft === OFFICES[o.id].term && !state.prompts.some((p) => p.type === 'europarl.hearing') && state.character.age > ep(state).since) hearings(ctx);
    ctx.stat('stress', 2);
  },
  actions: {
    /** Vote on a file. arg: "fileId|yes" (yes, no or abstain). */
    vote(ctx, arg) {
      const { state } = ctx;
      if (!isMep(state)) return ctx.toast('MEPs only', 'warn');
      const [id, how] = String(arg).split('|');
      const file = ep(state).agenda.find((f) => f.id === id);
      if (!file || !['yes', 'no', 'abstain'].includes(how)) return ctx.toast('Not on the agenda', 'warn');
      file.myVote = how;
      if (ep(state).post === 'groupLeader') ep(state).myVoteWhip = true;
      return ctx.toast(`You will vote ${how} on the ${file.name}${ep(state).post === 'groupLeader' ? ` — and ${GROUPS[ep(state).group].short} will follow your whip` : ''}`, 'info');
    },
    /** Bid to be rapporteur on a file in your committee. arg: fileId. */
    rapporteur(ctx, id) {
      const { state, rng } = ctx;
      const e = ep(state);
      if (!isMep(state)) return ctx.toast('MEPs only', 'warn');
      if (yearlyCount(state, 'europarl.rapporteur')) return ctx.toast('One report a year', 'warn');
      const file = e.agenda.find((f) => f.id === id);
      if (!file) return ctx.toast('Not on the agenda', 'warn');
      bumpYearly(state, 'europarl.rapporteur');
      const own = file.committee === e.committee;
      const odds = clamp(0.2 + e.influence / 200 + rankOf(state) * 0.1 + GROUPS[e.group].seats / 1500 - (own ? 0 : 0.2), 0.05, 0.9);
      if (!rng.chance(odds)) return ctx.log(`The groups' points system gave the report on the ${file.name} to another MEP. You will be a shadow rapporteur.`, '📄', 'info');
      file.rapporteur = true;
      file.push += 0.08 + e.influence / 600 + (state.stats.smarts - 50) / 800;
      bumpInfluence(state, 5);
      ctx.stat('stress', 4);
      return ctx.log(`You are rapporteur on the ${file.name}: you write the Parliament's position and lead the trilogue with the Council.`, '📄', 'milestone');
    },
    /** Negotiate hard in the trilogue on your report. arg: fileId. */
    trilogue(ctx, id) {
      const { state, rng } = ctx;
      const file = ep(state)?.agenda.find((f) => f.id === id && f.rapporteur);
      if (!file) return ctx.toast('Only on your own report', 'warn');
      if (file.trilogue) return ctx.toast('The trilogue is done', 'warn');
      file.trilogue = true;
      if (rng.chance(clamp(0.45 + (state.stats.smarts - 50) / 150, 0.2, 0.8))) {
        file.push += 0.1;
        return ctx.log(`An all-night trilogue in Brussels: the Council gave ground and a deal was struck at 4 a.m. The file is on course.`, '🤝', 'good');
      }
      file.push -= 0.05;
      return ctx.log(`The trilogue stalled: the Council presidency would not move, and the compromise text has critics on all sides.`, '🤝', 'bad');
    },
    /** A plenary speech or a priority question to the Commission. */
    speech(ctx) {
      const { state, rng } = ctx;
      if (!isMep(state)) return ctx.toast('MEPs only', 'warn');
      if (yearlyCount(state, 'europarl.speech')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'europarl.speech');
      const good = rng.chance(clamp(0.5 + (state.stats.smarts - 50) / 200, 0.25, 0.85));
      bumpInfluence(state, good ? 3 : 1);
      if (good) ctx.emit('fame:buzz', { amount: 2 });
      return ctx.log(good ? 'Your Strasbourg speech went viral at home: one minute, translated into 24 languages.' : 'You put a priority question to the Commission. The answer, six weeks later, said very little.', '🎙️', good ? 'good' : 'info');
    },
    /** Win money from the EU budget for your home region. */
    budget(ctx) {
      const { state, rng } = ctx;
      const e = ep(state);
      if (!isMep(state)) return ctx.toast('MEPs only', 'warn');
      if (yearlyCount(state, 'europarl.budget')) return ctx.toast('Once a year', 'warn');
      if (e.committee !== 'BUDG' && rankOf(state) < 1) return ctx.toast('Budgets committee members, coordinators and above', 'warn');
      bumpYearly(state, 'europarl.budget');
      if (!rng.chance(clamp(0.35 + e.influence / 200, 0.2, 0.8))) return ctx.log('Your amendment for cohesion money at home fell in the budget conciliation.', '💶', 'info');
      if (state.economy) state.economy.growth = (state.economy.growth ?? 0) + 0.001;
      state.politics.office.approval = clamp((state.politics.office.approval ?? 50) + 4, 0, 100);
      bumpInfluence(state, 2);
      return ctx.log(`You won €${rng.int(40, 400)} million in cohesion funding for your home region: a rail link, a hospital wing, broadband for the villages.`, '💶', 'good');
    },
    /** Change political group. arg: group id. */
    switchGroup(ctx, gid) {
      const { state } = ctx;
      const e = ep(state);
      if (!isMep(state) || !GROUPS[gid] || gid === e.group) return ctx.toast('Not possible', 'warn');
      if (yearlyCount(state, 'europarl.switch')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'europarl.switch');
      const was = e.group;
      e.group = gid;
      // Group posts stay with the group; the Bureau (President, Vice-Presidents) is the House's.
      if (['coordinator', 'chair', 'groupLeader'].includes(e.post)) e.post = 'member';
      bumpInfluence(state, -10);
      return ctx.log(`You left ${GROUPS[was].short} and joined ${GROUPS[gid].short}.`, '🔀', 'info');
    },
    /** Change committee. arg: committee code. */
    committee(ctx, code) {
      const { state } = ctx;
      const e = ep(state);
      if (!isMep(state) || !COMMITTEES[code] || code === e.committee) return ctx.toast('Not possible', 'warn');
      if (yearlyCount(state, 'europarl.committee')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'europarl.committee');
      e.committee = code;
      if (['coordinator', 'chair'].includes(e.post)) e.post = 'member';
      return ctx.log(`You moved to the ${COMMITTEES[code]} committee.`, '🗂️', 'info');
    },
    /** Stand for a post: group leader, Vice-President, or President of the Parliament. arg: post id. */
    stand(ctx, post) {
      const { state, rng } = ctx;
      const e = ep(state);
      if (!isMep(state) || !['groupLeader', 'vicePresident', 'president'].includes(post)) return ctx.toast('Not possible', 'warn');
      if (yearlyCount(state, 'europarl.stand')) return ctx.toast('One election a year', 'warn');
      const o = state.politics.office;
      const window = o.termYearsLeft === OFFICES[o.id].term || o.termYearsLeft === 3;
      if (post !== 'groupLeader' && !window) return ctx.toast('The Bureau is elected at the start and the middle of the term', 'warn');
      if (POSTS[post].rank <= rankOf(state) && post !== 'president') return ctx.toast('You already hold a post at least that senior', 'warn');
      bumpYearly(state, 'europarl.stand');
      const big = GROUPS[e.group].seats;
      const odds = post === 'groupLeader' ? clamp(e.influence / 140 + rankOf(state) * 0.08, 0.03, 0.75)
        : post === 'vicePresident' ? clamp(0.2 + e.influence / 200 + big / 1000, 0.05, 0.8)
          : clamp((e.influence - 30) / 120 + big / 700 + (rankOf(state) >= 3 ? 0.15 : 0), 0.01, 0.65);
      if (!rng.chance(odds)) {
        bumpInfluence(state, -2);
        return ctx.log(post === 'president' ? 'You lost the election for President of the Parliament in the third round.' : `You were not elected ${POSTS[post].title}.`, '🗳️', 'bad');
      }
      e.post = post;
      if (post === 'president') e.wasPresident = true;
      bumpInfluence(state, post === 'president' ? 10 : 5);
      state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + (post === 'president' ? 15 : 6));
      if (post === 'president') ctx.emit('fame:buzz', { amount: 8 });
      return ctx.log(post === 'president' ? 'Elected President of the European Parliament: you chair the plenary, sign the budget into law and speak for the Parliament at every European Council.' : `Elected ${POSTS[post].title}${post === 'groupLeader' ? ` of ${GROUPS[e.group].short}` : ''}.`, '🇪🇺', 'milestone');
    },
    /** Table a motion of censure against the Commission. Needs two-thirds to pass. */
    censure(ctx) {
      const { state, rng } = ctx;
      const e = ep(state);
      if (!isMep(state)) return ctx.toast('MEPs only', 'warn');
      if (rankOf(state) < 3 && e.influence < 50) return ctx.toast('A tenth of the House must sign: you need to lead a group or have real influence', 'warn');
      if (yearlyCount(state, 'europarl.censure')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'europarl.censure');
      const share = clamp(0.25 + (rng.next() * 0.3) + (e.influence - 50) / 400, 0.1, 0.8);
      const yes = Math.round(TOTAL * share);
      if (share >= 2 / 3) {
        ctx.emit('fame:buzz', { amount: 10 });
        bumpInfluence(state, 15);
        log(state, `Censure motion carried ${yes}–${TOTAL - yes}: the Commission resigned`);
        return ctx.log(`Your motion of censure carried, ${yes} to ${TOTAL - yes}. The whole Commission resigned — the first time the Parliament has ever brought one down.`, '⚖️', 'milestone');
      }
      bumpInfluence(state, share > 0.4 ? 3 : -3);
      log(state, `Censure motion failed ${yes}–${TOTAL - yes}`);
      return ctx.log(`Your motion of censure failed, ${yes} to ${TOTAL - yes}. The Commission survives, bruised.`, '⚖️', 'info');
    },
  },
  resolvers: {
    hearing(ctx, data, optionId) {
      const { state, rng } = ctx;
      const e = ep(state);
      if (!e) return undefined;
      if (optionId === 'approve') {
        log(state, `Approved ${data.name} for ${data.portfolio}`);
        return ctx.log(`You voted to confirm ${data.name} as Commissioner for ${data.portfolio}.`, '🇪🇺', 'info');
      }
      const odds = clamp((data.weak ? 0.35 : 0.08) + rankOf(state) * 0.1 + e.influence / 300, 0.03, 0.85);
      if (rng.chance(odds)) {
        const rel = (state.world.relations ??= {});
        rel[data.cc] = Math.round(clamp((rel[data.cc] ?? 0) - 5, -100, 100));
        bumpInfluence(state, 8);
        ctx.emit('fame:buzz', { amount: 4 });
        log(state, `Rejected ${data.name} (${data.portfolio})`);
        return ctx.log(`The committee rejected ${data.name}. ${COUNTRIES[data.cc].name} had to send a new nominee, and Brussels learned your name.`, '🔥', 'milestone');
      }
      bumpInfluence(state, 1);
      log(state, `Grilled ${data.name}, who was confirmed anyway`);
      return ctx.log(`You grilled ${data.name} for three hours, but the big groups' deal held and the nominee was confirmed.`, '🔥', 'info');
    },
  },
};

/** Former Presidents of the European Parliament (for honours and passports). */
export const ledEuroparl = (state) => Boolean(state.europarl?.wasPresident);
