/**
 * Federal investigations: a special agent works one big case at a time — a
 * cartel cell, a corrupt official, a gun-trafficking ring, a fugitive, a
 * counterfeiting network. Each year you choose a technique (wiretap,
 * informant, undercover, follow the money), which builds evidence and
 * carries its own risks. When the case is strong enough you take it down;
 * the prosecutor decides whether it holds up. Leaks, burned informants and
 * blown covers can end a case early.
 *
 *   FBI · DEA · ATF · U.S. Marshals · Secret Service (criminal side)
 *
 * state.careerLife.investigations = { professionId, technique, case: { target, kind, evidence, years, heat } | null, closed: [...], arrests, convictions, rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';

/** evidence per year, heat (exposure) per year, extra danger */
export const TECHNIQUES = {
  surveillance: { name: 'Surveillance & records', icon: '🔭', evidence: 18, heat: 4, danger: 0, desc: 'Slow and safe: pole cameras, subpoenas, trash pulls.' },
  informant: { name: 'Work an informant', icon: '🤫', evidence: 28, heat: 12, danger: 0.02, desc: 'Fast, if your source is telling the truth.' },
  wiretap: { name: 'Get a wiretap', icon: '🎧', evidence: 34, heat: 6, danger: 0, check: 55, desc: 'The strongest evidence there is — if a judge signs the affidavit.' },
  undercover: { name: 'Go undercover', icon: '🎭', evidence: 40, heat: 15, danger: 0.08, desc: 'Inside the organisation. The best cases, the worst nights.' },
  money: { name: 'Follow the money', icon: '💸', evidence: 22, heat: 3, danger: 0, desc: 'Bank records and shell companies. Juries love a paper trail.' },
};

const pick = (rng, a) => rng.pick(a);
const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

const COMMON = [
  D('leak', '📰', 'A Reporter Calls', 'A reporter has details of your case that only a handful of people know.', [
    { id: 'nothing', label: '🤐 "No comment," and tighten the circle', text: 'The story ran without the details that mattered.', rep: 2 },
    { id: 'trade', label: '🤝 Trade a little to keep the rest quiet', tone: 'danger', text: 'The reporter held the story.', offense: 'leak', offenseContext: 'disclosing details of a federal investigation', discovery: 0.2 },
  ]),
  D('shortcut', '📝', 'The Affidavit', 'Your probable cause is thin. A little "confidential source information" would make it airtight.', [
    { id: 'honest', label: '📑 Write what you actually have', text: 'The judge sent it back for more. It cost you a month.', rep: 2 },
    { id: 'pad', label: '✏️ Pad it', tone: 'danger', text: 'Signed the same day.', perf: 3, offense: 'falseStatement', offenseContext: 'lying in a search-warrant affidavit', discovery: 0.25 },
  ]),
  D('taskforce', '🤝', 'A Task Force Wants In', 'Local police and another agency want to join your case — and share the credit.', [
    { id: 'join', label: '🤝 Bring them in', text: 'More bodies, more evidence, more names on the press release.', perf: 2, rep: 4 },
    { id: 'solo', label: '🙅 Keep it in-house', text: 'Your case, your credit — and a few new enemies.', rep: -2 },
  ]),
];

export const INVESTIGATION_CAREERS = {
  fbi: {
    label: 'Your Case', icon: '🕵️', weights: { smarts: 3, fitness: 1 },
    kinds: ['public corruption', 'organised crime', 'counterterrorism', 'cyber intrusion', 'securities fraud', 'crimes against children'],
    target: (rng) => `${pick(rng, ['a county commissioner', 'a crime family captain', 'a ransomware crew', 'a hedge fund manager', 'a state senator', 'an online predator network', 'a sleeper cell'])}`,
    award: { id: 'fbi.directors', name: 'FBI Director\'s Award for Excellence', icon: '🏅' },
    deck: [
      D('cooperator', '🗣️', 'The Cooperator', 'A mid-level target wants a deal: everything he knows for a lighter sentence.', [
        { id: 'flip', label: '🔁 Flip him', check: 50, text: 'His testimony reached two levels higher.', perf: 5, evidence: 20, fail: { text: 'He lied in the proffer. Now he\'s a defence witness.', perf: -4 } },
        { id: 'charge', label: '⚖️ Charge him with everything', text: 'One more conviction. The trail upward went cold.', perf: 2 },
      ]),
    ],
  },
  dea: {
    label: 'Your Case', icon: '💊', weights: { smarts: 2, fitness: 2 },
    kinds: ['cartel distribution', 'fentanyl pill press', 'pill-mill doctor', 'money laundering'],
    target: (rng) => `${pick(rng, ['a cartel cell', 'a pill-press lab', 'a pain clinic doctor', 'a trucking company moving loads', 'a street crew supplying three cities'])}`,
    award: { id: 'dea.administrator', name: 'DEA Administrator\'s Award', icon: '🏅' },
    deck: [
      D('seizure', '💵', 'The Duffel Bag', 'A search turns up $400,000 in cash. Nobody has counted it yet.', [
        { id: 'count', label: '🧾 Count it on camera with a witness', text: 'Every dollar logged.', rep: 4 },
        { id: 'skim', label: '💰 Nobody will miss a stack', tone: 'danger', text: 'A stack of cash in your truck.', money: 10000, moneyLabel: 'Cash', offense: 'embezzlement', offenseContext: 'skimming seized drug money', discovery: 0.4 },
      ]),
    ],
  },
  atf: {
    label: 'Your Case', icon: '💥', weights: { smarts: 2, fitness: 2 },
    kinds: ['gun trafficking', 'straw purchasing', 'arson for profit', 'bombing'],
    target: (rng) => `${pick(rng, ['a straw-purchasing ring', 'a gun shop selling out the back', 'an arsonist torching warehouses', 'a man building pipe bombs', 'a crew converting rifles to automatic'])}`,
    award: { id: 'atf.director', name: 'ATF Director\'s Award', icon: '🏅' },
    deck: [
      D('walk', '🔫', 'Let Them Walk?', 'Your supervisor wants to let a load of guns cross the border so you can follow them to the buyer.', [
        { id: 'object', label: '🙅 Object in writing', text: 'The plan was dropped. Your supervisor won\'t forget.', rep: 6, perf: -2 },
        { id: 'go', label: '👀 Follow orders', text: 'You lost the guns. Months later one turned up at a murder.', rep: -10, trauma: 6 },
      ]),
    ],
  },
  usms: {
    label: 'Your Fugitive', icon: '⭐', weights: { fitness: 3, smarts: 1 },
    kinds: ['violent fugitive', 'sex-offender absconder', 'escaped prisoner', 'witness-protection breach'],
    target: (rng) => `${pick(rng, ['a murderer who skipped bail', 'an escaped prisoner', 'a gang enforcer on the Fifteen Most Wanted', 'a sex offender who cut his monitor', 'a cartel hitman hiding across state lines'])}`,
    award: { id: 'usms.director', name: 'Marshals Service Director\'s Award', icon: '⭐' },
    fast: true,
    deck: [
      D('door', '🚪', 'The Door', 'You\'ve found him. He\'s armed and barricaded with his girlfriend inside.', [
        { id: 'wait', label: '📞 Surround and call him out', check: 45, text: 'Six hours later he walked out with his hands up.', perf: 5, commend: 0.4, fail: { text: 'He went out a back window. The hunt continues.', perf: -3 } },
        { id: 'breach', label: '💥 Breach now', check: 55, weights: { fitness: 3 }, text: 'Dynamic entry, nobody hurt. He was in cuffs before he reached the gun.', perf: 6, commend: 0.5, fail: { text: 'He fired through the door. A deputy was hit.', trauma: 10, injury: 0.3 } },
      ]),
    ],
  },
  usss: {
    label: 'Your Case', icon: '🕶️', weights: { smarts: 3 },
    kinds: ['counterfeit currency', 'bank fraud', 'cyber financial crime', 'threats against a protectee'],
    target: (rng) => `${pick(rng, ['a counterfeit print shop', 'a card-skimming ring', 'a business-email-compromise crew', 'a man posting threats against the President'])}`,
    award: { id: 'usss.director', name: 'Secret Service Director\'s Award', icon: '🏅' },
    deck: [
      D('detail', '🛡️', 'Pulled for a Detail', 'A protective detail needs bodies for a foreign visit. Your case will sit for two months.', [
        { id: 'go', label: '🛡️ Go', text: 'Long days standing post. Good for your career.', perf: 3, stress: 4 },
        { id: 'ask', label: '🙋 Ask to stay on the case', text: 'Your SAC said yes, once.', rep: -2, evidence: 10 },
      ]),
    ],
  },
};

const config = (job) => INVESTIGATION_CAREERS[engineKey(job)];
const fresh = () => ({ technique: 'surveillance', case: null, closed: [], arrests: 0, convictions: 0 });
/** Trainees are still at the academy or riding along. */
const working = (job) => job && job.levelId !== 'trainee';

export function investigationView(state) {
  const job = state.career.job;
  const cfg = config(job);
  if (!cfg) return null;
  const rec = peekLife(state, 'investigations');
  return { cfg, rec: rec?.professionId === job.professionId ? rec : null, working: working(job) };
}

export function techniqueEligibility(state, id) {
  const job = state.career.job;
  if (!working(job)) return { ok: false, reason: 'Finish your training first' };
  if (id === 'undercover' && (job.yearsAtEmployer ?? 0) < 2) return { ok: false, reason: 'Two years in the field first' };
  if (yearlyCount(state, 'investigations.technique')) return { ok: false, reason: 'Once a year' };
  return { ok: true };
}

/** Abroad, the national agency's own commendation stands in for the American award. */
const awardFor = (job, cfg) => (job.professionId === engineKey(job) ? cfg.award : { id: `${job.professionId}.commendation`, name: `${job.employer?.name?.split(' — ')[0] ?? 'Agency'} Commendation`, icon: '🏅' });

function open(rng, cfg, rec) {
  rec.case = { target: cfg.target(rng), kind: rng.pick(cfg.kinds), evidence: 0, years: 0, heat: 0 };
}

function takedown(ctx, cfg, rec) {
  const { state, rng } = ctx;
  const c = rec.case;
  rec.case = null;
  const arrests = cfg.fast ? 1 : rng.int(2, 6 + Math.round(c.evidence / 25));
  rec.arrests += arrests;
  // The prosecutor and the jury decide: stronger evidence, likelier pleas and convictions.
  const convicted = rng.chance(clamp(0.45 + c.evidence / 250, 0.4, 0.95));
  const outcome = convicted ? (c.evidence >= 110 ? 'landmark' : 'convicted') : 'acquitted';
  if (convicted) rec.convictions += arrests;
  rec.closed = [{ target: c.target, kind: c.kind, outcome, age: state.character.age, arrests }, ...rec.closed].slice(0, 10);
  if (cfg.fast) {
    applyFx(ctx, rec, { text: `You caught ${c.target}.${convicted ? ' He\'s back in custody for good.' : ' A judge let him out on bond again.'}`, perf: convicted ? 6 : 1, rep: convicted ? 6 : 0 }, cfg.icon);
  } else if (outcome === 'landmark') {
    applyFx(ctx, rec, { text: `The takedown of ${c.target}: ${arrests} arrests, a press conference, and convictions on every count. A landmark ${c.kind} case.`, perf: 10, rep: 12, happiness: 8 }, '🚨');
    if (rng.chance(0.5)) applyFx(ctx, rec, { honor: awardFor(state.career.job, cfg) });
  } else if (convicted) {
    applyFx(ctx, rec, { text: `You took down ${c.target}: ${arrests} arrests and guilty pleas from most of them.`, perf: 6, rep: 6 }, '🚨');
  } else {
    applyFx(ctx, rec, { text: `The ${c.kind} case against ${c.target} went to trial and the jury acquitted. Months of work, gone.`, perf: -6, rep: -6, happiness: -6 }, '⚖️');
  }
}

export const InvestigationsModule = {
  id: 'investigations',
  order: 31.25,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || !working(job) || state.legal.incarceration) return;
    const rec = lifeOf(state, 'investigations', job.professionId, fresh());
    if (!rec.case) open(rng, cfg, rec);
    const c = rec.case;
    const t = TECHNIQUES[rec.technique] ?? TECHNIQUES.surveillance;
    const sk = skill(state, cfg.weights);
    c.years += 1;
    // A wiretap needs a judge to agree.
    if (t.check && sk + rng.int(-20, 20) < t.check) {
      ctx.log(`The judge refused your wiretap application on ${c.target}. Back to the street.`, '⚖️', 'warn');
      c.evidence += 8;
    } else c.evidence += Math.round(t.evidence * (0.6 + sk / 120) * (cfg.fast ? 2 : 1));
    c.heat += t.heat + rng.int(0, 6);
    ctx.stat('stress', 3 + Math.round(t.heat / 4));
    if (t.danger && rng.chance(t.danger)) applyFx(ctx, rec, { text: 'Your cover nearly came apart in a room full of armed men. You talked your way out.', trauma: 8, stress: 8 }, '🎭');
    // Too much heat and the target knows.
    if (c.heat >= 45 && rng.chance((c.heat - 35) / 60)) {
      rec.case = null;
      rec.closed = [{ target: c.target, kind: c.kind, outcome: 'blown', age: state.character.age, arrests: 0 }, ...rec.closed].slice(0, 10);
      applyFx(ctx, rec, { text: `${c.target.replace(/^./, (x) => x.toUpperCase())} found out about the investigation and went to ground. The case is dead.`, perf: -6, rep: -4, happiness: -5 }, '💨');
    } else if (c.evidence >= 100 || (cfg.fast && c.evidence >= 60)) takedown(ctx, cfg, rec);
    else ctx.log(`Your ${c.kind} case on ${c.target}: ${Math.min(99, c.evidence)}% of what a prosecutor needs.`, cfg.icon);
    if (rng.chance(0.6) && !state.prompts.some((x) => x.type === 'investigations.event')) {
      const d = rng.pick([...cfg.deck, ...COMMON]);
      ctx.prompt({ type: 'investigations.event', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id, professionId: engineKey(job) } });
    }
  },
  actions: {
    /** arg: a technique id */
    technique(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!config(job) || !TECHNIQUES[id]) return;
      const ok = techniqueEligibility(state, id);
      if (!ok.ok) return ctx.toast(ok.reason, 'warn');
      bumpYearly(state, 'investigations.technique');
      lifeOf(state, 'investigations', job.professionId, fresh()).technique = id;
      ctx.log(`You switched techniques: ${TECHNIQUES[id].name.toLowerCase()}. ${TECHNIQUES[id].desc}`, TECHNIQUES[id].icon);
      return undefined;
    },
    /** Take the case down now, with whatever evidence you have. */
    takedown(ctx) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      const rec = peekLife(state, 'investigations');
      if (!cfg || rec?.professionId !== job.professionId || !rec.case) return;
      if (rec.case.evidence < 40) return ctx.toast('Not enough evidence for a prosecutor to charge', 'warn');
      takedown(ctx, cfg, rec);
      return undefined;
    },
  },
  resolvers: {
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = INVESTIGATION_CAREERS[data.professionId];
      const d = [...(cfg?.deck ?? []), ...COMMON].find((x) => x.id === data.deckId);
      if (!d || !job) return;
      const rec = lifeOf(ctx.state, 'investigations', job.professionId, fresh());
      const option = d.options.find((o) => o.id === optionId);
      const ok = resolveOption(ctx, rec, option, d.icon, cfg.weights);
      if (rec.case) {
        const fx = ok ? option : option?.fail ?? option;
        if (fx?.evidence) rec.case.evidence += fx.evidence;
      }
    },
  },
};
