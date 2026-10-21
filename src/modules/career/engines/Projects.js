/**
 * Project careers: the work comes as projects with a scope, a schedule and a
 * quality bar. You set how you work — careful, pushing hard, or cutting
 * corners — crises come up along the way, and every finished project goes
 * into your portfolio: acclaimed, delivered, or trouble. Cut corners and it
 * can come back on you after it's done.
 *
 *   civil engineering · architecture · technology · video games · design ·
 *   urban planning · transportation · data science · cybersecurity · land
 *   surveying · solar & wind · union construction · corporate · investment
 *   banking · marketing · environmental quality
 *
 * state.careerLife.projectWork = { professionId, approach, project: { name, size, progress, quality, corners, started } | null, portfolio: [...], rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';

export const APPROACH = {
  careful: { name: 'Careful', icon: '📐', speed: 0.8, quality: 7, stress: 2, desc: 'Slower, better work. Reviews love it; schedules don\'t.' },
  push: { name: 'Push hard', icon: '🔥', speed: 1.3, quality: 0, stress: 7, desc: 'Long hours, fast delivery. Burnout is the cost.' },
  corners: { name: 'Cut corners', icon: '✂️', speed: 1.25, quality: -10, stress: 3, desc: 'Fast and cheap — until something fails later.' },
};

const pick = (rng, a) => rng.pick(a);
const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

export const PROJECT_CAREERS = {
  engineering: {
    label: 'Your Projects', icon: '🌉', weights: { smarts: 3 },
    name: (rng) => `${pick(rng, ['Riverside', 'Route 9', 'Harbor', 'Eastgate', 'Mill Creek', 'Union Street'])} ${pick(rng, ['bridge replacement', 'water treatment plant', 'interchange', 'stormwater tunnel', 'parking structure', 'levee upgrade'])}`,
    acclaim: 'an ASCE Outstanding Project award', failure: { text: 'A project you rushed failed inspection years early: cracking that should never have happened. The forensic review named your calculations.', perf: -15, rep: -15, stress: 10, offense: 'falsifiedInspection', offenseContext: 'signing off on deficient engineering', discovery: 0.3 },
    deck: [
      D('stamp', '🖋️', 'Stamp It?', 'A developer wants your PE stamp on drawings you didn\'t fully check. The deadline is tomorrow.', [
        { id: 'check', label: '🔍 Check every sheet first', text: 'You found a real error. The developer was annoyed and then grateful.', rep: 6, perf: 2 },
        { id: 'stamp', label: '🖋️ Stamp it', tone: 'danger', text: 'The developer was happy.', perf: 2, risk: { chance: 0.2, text: 'The error you didn\'t catch became a lawsuit. Your licence is under review.', perf: -12, cost: 25000, costLabel: 'Professional liability deductible' } },
      ]),
      D('changeorder', '📋', 'The Change Order', 'The contractor found rock where the borings said clay. Redesign or a $2M change order.', [
        { id: 'redesign', label: '✏️ Redesign the foundations', check: 55, text: 'Your redesign saved the client $1.4M.', perf: 6, rep: 6, fail: { text: 'The redesign took four months and the client paid anyway.', perf: -3 } },
        { id: 'pay', label: '💵 Approve the change order', text: 'Expensive, but on schedule.', perf: 1 },
      ]),
    ],
  },
  architecture: {
    label: 'Your Commissions', icon: '🏛️', weights: { smarts: 2, happiness: 1 },
    name: (rng) => `the ${pick(rng, ['Oakwood', 'Harbor', 'Civic', 'Elm Street', 'Westside', 'Lakeshore'])} ${pick(rng, ['library', 'school', 'condo tower', 'museum wing', 'medical office', 'community center'])}`,
    acclaim: 'an AIA design award', failure: { text: 'Water started pouring through a curtain wall you value-engineered. The owner is suing.', perf: -10, rep: -12, cost: 15000, costLabel: 'Liability deductible' },
    deck: [
      D('competition', '🏆', 'A Design Competition', 'An international competition for a new concert hall. Months of unpaid work for a long shot.', [
        { id: 'enter', label: '🎨 Enter it', check: 65, text: 'You won. Your name is on the shortlist for everything now.', perf: 10, rep: 15, honor: { id: 'arch.competition', name: 'Design Competition Winner', icon: '🏆' }, stress: 8, fail: { text: 'An honorable mention and a lot of lost weekends.', stress: 6, rep: 2 } },
        { id: 'skip', label: '🙅 Stick to paying work', text: 'A sensible year.', perf: 2 },
      ]),
    ],
  },
  tech: {
    label: 'Your Projects', icon: '💻', weights: { smarts: 3 },
    name: (rng) => `${pick(rng, ['the payments', 'the search', 'the recommendations', 'the mobile app', 'the data-platform', 'the checkout'])} ${pick(rng, ['rewrite', 'migration', 'launch', 'redesign', 'scale-up', 'AI feature'])}`,
    acclaim: 'a company-wide award and a spot bonus', failure: { text: 'The shortcuts you took caused a three-day outage at peak. The postmortem had your name in it.', perf: -12, rep: -10, stress: 10 },
    deck: [
      D('outage', '🚨', 'Paged at 3 a.m.', 'Production is down and you\'re on call.', [
        { id: 'fix', label: '🛠️ Dig in and fix it', check: 55, text: 'Back up in forty minutes. The incident review praised your work.', perf: 6, rep: 4, stress: 4, fail: { text: 'Six hours down, and you had to wake the whole team.', perf: -3, stress: 6 } },
        { id: 'escalate', label: '📞 Escalate to the senior engineer', text: 'Fixed in two hours. You learned a lot.', perf: 1 },
      ]),
      D('startup', '🚀', 'A Startup Offer', 'A former colleague\'s startup offers equity and a 30% pay cut.', [
        { id: 'stay', label: '🏢 Stay put', text: 'Steady. The startup did fine without you.', perf: 1 },
        { id: 'moonlight', label: '🌙 Advise them on the side for equity', text: 'A few evenings a month.', stress: 3, risk: { chance: 0.1, text: 'They were acquired. Your sliver of equity paid out.', money: 60000, moneyLabel: 'Startup equity' } },
      ]),
    ],
  },
  gameDevelopment: {
    label: 'Your Game', icon: '🎮', weights: { smarts: 2, happiness: 1 },
    name: (rng) => `"${pick(rng, ['Ashen', 'Star', 'Hollow', 'Iron', 'Neon', 'Last'])} ${pick(rng, ['Crown', 'Drift', 'Keep', 'Tides', 'Protocol', 'Light'])}"`,
    acclaim: 'Game of the Year nominations', failure: { text: 'The game launched broken. Reviews were brutal and the studio laid off half the team.', perf: -12, rep: -12, stress: 8 },
    deck: [
      D('crunch', '🌙', 'Crunch', 'Six months to launch and the game isn\'t fun yet. The studio head wants mandatory crunch.', [
        { id: 'crunch', label: '🔥 Crunch with the team', text: 'Eighty-hour weeks. The game got good.', perf: 5, stress: 12, health: -4 },
        { id: 'delay', label: '📅 Argue for a delay', check: 55, text: 'You won the argument. The extra six months made the game.', perf: 6, rep: 6, fail: { text: 'You lost the argument and some goodwill.', perf: -3 } },
      ]),
    ],
  },
  design: {
    label: 'Your Projects', icon: '🎨', weights: { smarts: 1, happiness: 2 },
    name: (rng) => `${pick(rng, ['a rebrand for', 'an app redesign for', 'a campaign for', 'packaging for', 'a website for'])} ${pick(rng, ['a coffee chain', 'a bank', 'a nonprofit', 'a startup', 'a museum'])}`,
    acclaim: 'a design award and a portfolio piece everyone remembers', failure: { text: 'The work you rushed shipped with a typo on every bag. The client wants a refund.', perf: -6, rep: -8 },
    deck: [
      D('spec', '📝', 'Spec Work', 'A big brand wants "a few concepts" for free to see if they like you.', [
        { id: 'no', label: '🙅 Decline unpaid work', text: 'They hired someone else. Your rates stayed yours.', rep: 2 },
        { id: 'yes', label: '🎨 Do it', check: 55, text: 'They loved it and signed a retainer.', perf: 5, rep: 6, money: 8000, moneyLabel: 'Retainer', fail: { text: 'They used one of your ideas and never called back.', stress: 4 } },
      ]),
    ],
  },
  planning: {
    label: 'Your Plans', icon: '🗺️', weights: { smarts: 2, happiness: 1 },
    name: (rng) => `the ${pick(rng, ['downtown', 'waterfront', 'east side', 'transit corridor', 'old mill district'])} ${pick(rng, ['rezoning', 'comprehensive plan', 'housing plan', 'redevelopment'])}`,
    acclaim: 'an APA national planning award', failure: { text: 'A plan you rushed was thrown out in court for an inadequate environmental review.', perf: -8, rep: -8 },
    deck: [
      D('hearing', '📢', 'The Public Hearing', 'Two hundred angry neighbors packed the hearing on new apartments.', [
        { id: 'listen', label: '👂 Listen, and change the plan where they\'re right', check: 50, text: 'The plan passed with real support.', perf: 6, rep: 6, fail: { text: 'Compromise pleased nobody. The council tabled it.', perf: -3 } },
        { id: 'push', label: '📊 Stick to the data', text: 'It passed 4–3. You have new enemies.', perf: 3, rep: -2 },
      ]),
    ],
  },
  dot: {
    label: 'Your Projects', icon: '🛣️', weights: { smarts: 2 },
    name: (rng) => `the ${pick(rng, ['I-80', 'Route 12', 'County Line', 'Airport'])} ${pick(rng, ['interchange', 'widening', 'bridge deck', 'resurfacing'])}`,
    acclaim: 'a state transportation excellence award', failure: { text: 'The pavement you rushed is failing after two winters. The audit is not kind.', perf: -8, rep: -8 },
    deck: [
      D('contractor', '🚧', 'A Contractor\'s Offer', 'The paving contractor offers you a "fishing trip" while you\'re reviewing his change orders.', [
        { id: 'no', label: '🙅 Decline and report it', text: 'The ethics office thanked you.', rep: 6, perf: 2 },
        { id: 'go', label: '🎣 Go fishing', tone: 'danger', text: 'Nice trip.', offense: 'bribery', offenseContext: 'accepting a contractor\'s gift', discovery: 0.25 },
      ]),
    ],
  },
  dataScience: {
    label: 'Your Models', icon: '📊', weights: { smarts: 3 },
    name: (rng) => `the ${pick(rng, ['churn', 'pricing', 'fraud', 'demand forecast', 'credit risk', 'recommendation'])} model`,
    acclaim: 'an internal innovation award', failure: { text: 'A model you rushed turned out to be biased. It made the news.', perf: -10, rep: -12 },
    deck: [
      D('pressure', '📉', 'The Numbers the VP Wants', 'Your analysis says the product is failing. The VP wants a slide that says otherwise.', [
        { id: 'honest', label: '📊 Present what the data says', text: 'It was an uncomfortable meeting. Six months later you were right.', rep: 8, perf: 2 },
        { id: 'massage', label: '🎨 Massage the numbers', text: 'The VP loved it.', perf: 3, rep: -6 },
      ]),
    ],
  },
  cybersecurity: {
    label: 'Your Engagements', icon: '🛡️', weights: { smarts: 3 },
    name: (rng) => `${pick(rng, ['a red-team engagement against', 'incident response at', 'a zero-trust rollout at', 'a SOC build-out at'])} ${pick(rng, ['a hospital', 'a bank', 'a city government', 'a retailer', 'a utility'])}`,
    acclaim: 'a conference keynote and a bug-bounty hall of fame', failure: { text: 'A gap you left open was used in a breach. Millions of records leaked.', perf: -12, rep: -12, stress: 10 },
    deck: [
      D('ransom', '💀', 'Ransomware', 'A client\'s network is encrypted and the attackers want $4 million.', [
        { id: 'restore', label: '💾 Restore from backups', check: 55, text: 'You had them up in four days without paying.', perf: 8, rep: 8, fail: { text: 'The backups were encrypted too. They paid.', perf: -2 } },
        { id: 'negotiate', label: '🤝 Help negotiate', text: 'They paid $1.2M and got their data back.', perf: 2 },
      ]),
    ],
  },
  surveying: {
    label: 'Your Jobs', icon: '📏', weights: { smarts: 2 },
    name: (rng) => `the ${pick(rng, ['Hendricks farm', 'Pine Ridge subdivision', 'highway right-of-way', 'county line dispute', 'new school site'])} survey`,
    acclaim: 'a state surveyors\' society award', failure: { text: 'A boundary you rushed was wrong. A fence — and a lawsuit — went up in the wrong place.', perf: -8, rep: -8, cost: 6000, costLabel: 'Liability deductible' },
    deck: [
      D('dispute', '🚧', 'The Boundary Dispute', 'Two neighbors who hate each other both want you to find for them.', [
        { id: 'evidence', label: '🔎 Follow the evidence', check: 45, text: 'An old iron pin settled it. One neighbor is furious; the court agreed with you.', rep: 6, fail: { text: 'Your survey was challenged and redone.', rep: -4 } },
      ]),
    ],
  },
  renewableEnergy: {
    label: 'Your Installs', icon: '☀️', weights: { fitness: 1, smarts: 1 },
    name: (rng) => `the ${pick(rng, ['county', 'school district', 'farm cooperative', 'warehouse'])} ${pick(rng, ['solar array', 'wind farm', 'battery storage', 'microgrid'])}`,
    acclaim: 'a clean-energy project of the year', failure: { text: 'Wiring you rushed caught fire on the roof. Nobody was hurt; the client was not happy.', perf: -10, rep: -10 },
    deck: [
      D('heat', '🥵', 'A Roof in July', 'It\'s 104°F on the roof and the crew wants to push through.', [
        { id: 'break', label: '💧 Call heat breaks and finish tomorrow', text: 'A day late, nobody hurt.', perf: 1 },
        { id: 'push', label: '⏱️ Push through', text: 'Done on time.', perf: 2, injury: 0.2 },
      ]),
    ],
  },
  carpentry: {
    label: 'Your Jobs', icon: '🪚', weights: { fitness: 2 },
    name: (rng) => `the ${pick(rng, ['hospital tower', 'stadium', 'apartment block', 'office campus', 'school'])} job`,
    acclaim: 'a craftsmanship award from the local', failure: { text: 'Formwork you rushed blew out during a pour. A coworker was hurt; OSHA came.', perf: -12, rep: -10, trauma: 6 },
    deck: [
      D('safety', '🦺', 'No Guardrail', 'The foreman wants you working an open edge on the eighth floor without the guardrail up yet.', [
        { id: 'refuse', label: '🙅 Refuse until it\'s safe', text: 'The guardrail went up in an hour. The foreman didn\'t forget.', rep: 4, perf: -1 },
        { id: 'work', label: '🧗 Work it carefully', text: 'Nothing happened.', perf: 2, injury: 0.12 },
      ]),
    ],
  },
  corporate: {
    label: 'Your Initiatives', icon: '📈', weights: { smarts: 2, looks: 1 },
    name: (rng) => `the ${pick(rng, ['cost-reduction', 'digital transformation', 'market entry', 'reorg', 'ERP rollout', 'acquisition integration'])} initiative`,
    acclaim: 'a CEO award and an executive sponsor', failure: { text: 'The initiative you rushed blew up in the quarterly review. A scapegoat was needed.', perf: -12, rep: -10 },
    deck: [
      D('rival', '🗡️', 'The Rival', 'A peer is quietly taking credit for your team\'s work in front of the VP.', [
        { id: 'confront', label: '🗣️ Set the record straight in the next meeting', check: 50, text: 'The VP noticed whose work it was.', perf: 6, rep: 4, fail: { text: 'It came across as petty.', perf: -3 } },
        { id: 'ally', label: '🤝 Make an ally of the VP\'s chief of staff', text: 'Slow, effective politics.', perf: 3 },
      ]),
    ],
  },
  marketing: {
    label: 'Your Campaigns', icon: '📣', weights: { smarts: 1, looks: 1, happiness: 1 },
    name: (rng) => `the ${pick(rng, ['holiday', 'launch', 'rebrand', 'Super Bowl', 'influencer', 'back-to-school'])} campaign`,
    acclaim: 'a Cannes Lion', failure: { text: 'A campaign you rushed out offended half the internet. The brand pulled it within a day.', perf: -10, rep: -12 },
    deck: [
      D('edgy', '😬', 'Too Edgy?', 'The creative team wants an ad that will either go viral or start a boycott.', [
        { id: 'run', label: '🎲 Run it', check: 55, text: 'It went viral for the right reasons.', perf: 8, rep: 8, fail: { text: 'It went viral for the wrong reasons.', perf: -6, rep: -8 } },
        { id: 'safe', label: '🛡️ Play it safe', text: 'Solid numbers, no headlines.', perf: 2 },
      ]),
    ],
  },
  environmental: {
    label: 'Your Cases', icon: '🌿', weights: { smarts: 2 },
    name: (rng) => `${pick(rng, ['the refinery', 'the hog farm', 'the chemical plant', 'the landfill', 'the paper mill'])} ${pick(rng, ['permit', 'enforcement case', 'cleanup', 'air-quality review'])}`,
    acclaim: 'a state environmental excellence award', failure: { text: 'A permit you rushed let a plant pollute a river. The fish kill made the news.', perf: -10, rep: -10 },
    deck: [
      D('lobby', '🏭', 'Pressure From the Capitol', 'A legislator\'s office calls asking you to "go easy" on a big employer\'s violations.', [
        { id: 'enforce', label: '⚖️ Enforce the law', text: 'The fine stuck. The legislator didn\'t forget.', rep: 6, perf: 2 },
        { id: 'soft', label: '🤝 Go easy', text: 'The employer was grateful.', rep: -8 },
      ]),
    ],
  },
};
PROJECT_CAREERS.ironworking = { ...PROJECT_CAREERS.carpentry, icon: '🏗️' };
PROJECT_CAREERS.craneOperator = { ...PROJECT_CAREERS.carpentry, icon: '🏗️', failure: { text: 'A lift you rushed swung into the steel. Nobody died; the investigation was long.', perf: -12, rep: -10, trauma: 6 } };

const config = (job) => PROJECT_CAREERS[engineKey(job)];
export const isProjectCareer = (job) => Boolean(config(job));
const fresh = () => ({ approach: 'careful', project: null, portfolio: [] });

export function projectView(state) {
  const cfg = config(state.career.job);
  if (!cfg) return null;
  const rec = peekLife(state, 'projectWork');
  return { cfg, rec: rec?.professionId === state.career.job.professionId ? rec : null };
}

function start(rng, cfg, state, rec) {
  const size = rng.int(1, 3);
  rec.project = { name: cfg.name(rng), size, progress: 0, quality: Math.round(45 + skill(state, cfg.weights) / 5), corners: false, started: state.character.age };
}

function finish(ctx, cfg, rec) {
  const { state, rng } = ctx;
  const job = state.career.job;
  const p = rec.project;
  rec.project = null;
  const outcome = p.quality >= 78 ? 'acclaimed' : p.quality >= 55 ? 'delivered' : 'trouble';
  rec.portfolio = [{ name: p.name, quality: p.quality, outcome, age: state.character.age, corners: p.corners }, ...rec.portfolio].slice(0, 10);
  if (outcome === 'acclaimed') {
    applyFx(ctx, rec, { text: `You finished ${p.name} — acclaimed work${rng.chance(0.4) ? `, and ${cfg.acclaim}` : ''}.`, perf: 6, rep: 8, money: Math.round(job.salary * 0.1 / 100) * 100, moneyLabel: 'Project bonus' }, cfg.icon);
    if (rng.chance(0.25)) applyFx(ctx, rec, { honor: { id: `project.${job.professionId}.award`, name: cfg.acclaim.replace(/^an? /, '').replace(/^./, (c) => c.toUpperCase()), icon: '🏆' } });
  } else if (outcome === 'delivered') applyFx(ctx, rec, { text: `You delivered ${p.name}: solid work, on its way into service.`, perf: 3, rep: 3 }, cfg.icon);
  else applyFx(ctx, rec, { text: `${p.name.replace(/^./, (c) => c.toUpperCase())} came in late and troubled. The post-mortem was uncomfortable.`, perf: -6, rep: -6 }, cfg.icon);
  // Cut corners now, pay later.
  if (p.corners) rec.liability = (rec.liability ?? 0) + (outcome === 'trouble' ? 2 : 1);
}

export const ProjectWorkModule = {
  id: 'projectWork',
  order: 31.5,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || state.legal.incarceration) return;
    const rec = lifeOf(state, 'projectWork', job.professionId, fresh());
    const a = APPROACH[rec.approach] ?? APPROACH.careful;
    // Old shortcuts can come back on you.
    if (rec.liability && rng.chance(0.12 * rec.liability)) {
      rec.liability = Math.max(0, rec.liability - 1);
      applyFx(ctx, rec, cfg.failure, '⚠️');
      if (!state.career.job) return;
    }
    if (!rec.project) start(rng, cfg, state, rec);
    const p = rec.project;
    const sk = skill(state, cfg.weights);
    p.progress = Math.min(100, Math.round(p.progress + (45 / p.size) * a.speed * (0.6 + sk / 120)));
    p.quality = Math.round(clamp(p.quality + a.quality + (sk - 55) / 10 + rng.int(-6, 6), 0, 100));
    if (rec.approach === 'corners') p.corners = true;
    ctx.stat('stress', a.stress);
    if (p.progress >= 100) finish(ctx, cfg, rec);
    if (cfg.deck?.length && rng.chance(0.55) && !state.prompts.some((x) => x.type === 'projectWork.crisis')) {
      const d = rng.pick(cfg.deck);
      ctx.prompt({ type: 'projectWork.crisis', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id, professionId: engineKey(job) } });
    }
  },
  actions: {
    /** arg: careful | push | corners */
    approach(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!config(job) || !APPROACH[id]) return;
      if (yearlyCount(state, 'projectWork.approach')) return ctx.toast('You set how you work once a year.', 'warn');
      bumpYearly(state, 'projectWork.approach');
      lifeOf(state, 'projectWork', job.professionId, fresh()).approach = id;
      ctx.log(`You changed how you work: ${APPROACH[id].name.toLowerCase()}. ${APPROACH[id].desc}`, APPROACH[id].icon);
      return undefined;
    },
  },
  resolvers: {
    crisis(ctx, data, optionId) {
      const job = ctx.state.career.job;
      const cfg = PROJECT_CAREERS[data.professionId];
      const d = cfg?.deck?.find((x) => x.id === data.deckId);
      if (!d || !job) return;
      resolveOption(ctx, lifeOf(ctx.state, 'projectWork', job.professionId, fresh()), d.options.find((o) => o.id === optionId), d.icon, cfg.weights);
    },
  },
};
