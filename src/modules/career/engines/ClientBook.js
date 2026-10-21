/**
 * Book-of-business careers: your income is your clients. Win them, keep
 * them happy, raise your rates when you can — and watch rivals poach the big
 * ones.
 *
 *   Each year     Clients pay; loyal ones stay and refer friends; neglected
 *                 ones drift away. A share of what your book brings in is
 *                 yours (commission, production pay, your chair's take).
 *   Actions       Prospect for new clients · look after the ones you have ·
 *                 raise your rates (once a year each).
 *   Capacity      Too many clients for your hours and loyalty slips.
 *
 *   sales · real estate · insurance · cosmetology · personal training ·
 *   accounting · dentistry · veterinary medicine · physical therapy
 *
 * state.careerLife.clientBook = { professionId, clients: [{ id, name, kind, value, loyalty, since }], won, lost, revenue, rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly, randomName } from '../../../core/State.js';
import { lifeOf, peekLife, resolveOption, promptOptions, skill, engineKey } from './Kit.js';

const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

export const BOOK_CAREERS = {
  sales: {
    label: 'Your Accounts', icon: '🤝', noun: 'account', value: [15000, 120000], capacity: 25, weights: { looks: 1, smarts: 1, happiness: 1 },
    kinds: ['regional distributor', 'hospital system', 'school district', 'manufacturer', 'retail chain', 'startup', 'county government'],
    deck: [
      D('rfp', '📑', 'The Big RFP', 'A Fortune 500 company opened an RFP worth a year of your quota. A rival has the inside track.', [
        { id: 'chase', label: '🏃 Go all in on it', check: 60, text: 'You won it. Your manager rang the bell.', money: 30000, moneyLabel: 'Commission', perf: 8, rep: 8, stress: 6, fail: { text: 'You lost it in the final round, and the rest of your pipeline suffered.', perf: -4, stress: 6 } },
        { id: 'pass', label: '🙅 Focus on the pipeline you have', text: 'Steady quarter. You hit plan.', perf: 2 },
      ]),
      D('kickback', '💸', 'A Gift From the Buyer', 'A buyer hints that a "consulting fee" to his brother-in-law would close the deal.', [
        { id: 'decline', label: '🙅 Decline politely', text: 'You lost the deal and kept your conscience.', perf: -2, rep: 3 },
        { id: 'pay', label: '🤝 Pay it', tone: 'danger', text: 'The deal closed.', money: 20000, moneyLabel: 'Commission', offense: 'kickback', offenseContext: 'paying a buyer for a contract' },
      ]),
    ],
  },
  realestate: {
    label: 'Your Clients', icon: '🏡', noun: 'client', value: [6000, 25000], capacity: 18, weights: { looks: 1, smarts: 1, happiness: 1 },
    kinds: ['first-time buyer', 'downsizing couple', 'investor', 'relocating family', 'estate sale', 'luxury seller'],
    deck: [
      D('lowball', '📉', 'The Overpriced Listing', 'A seller insists on listing 20% above the market. It\'ll sit for months.', [
        { id: 'truth', label: '📊 Show them the comps and hold firm', check: 45, text: 'They listened. It sold in two weeks.', money: 9000, moneyLabel: 'Commission', rep: 4, fail: { text: 'They fired you and listed with someone who told them what they wanted to hear.', rep: -2 } },
        { id: 'list', label: '🙂 List it at their price', text: 'It sat for 140 days and they blamed you.', rep: -4 },
      ]),
      D('dual', '🔀', 'Both Sides of the Deal', 'Your buyer wants a house you have listed. You could represent both and double the commission.', [
        { id: 'refer', label: '🤝 Refer the buyer to a colleague', text: 'Clean and fair. Your seller sent you two referrals.', money: 6000, moneyLabel: 'Commission', rep: 5 },
        { id: 'dual', label: '💰 Take both sides', text: 'Double commission.', money: 14000, moneyLabel: 'Commission', risk: { chance: 0.2, text: 'The buyer felt steered and complained to the board. A fine and a reprimand.', cost: 5000, costLabel: 'Real-estate board fine', rep: -8 } },
      ]),
    ],
  },
  insurance: {
    label: 'Your Book', icon: '📋', noun: 'policyholder', value: [800, 6000], capacity: 400, sample: 20, weights: { smarts: 1, happiness: 1, looks: 1 },
    kinds: ['auto', 'home', 'life', 'small business', 'farm', 'umbrella'],
    deck: [
      D('claim', '🌪️', 'After the Storm', 'A storm tore through town. Your policyholders are calling, and the adjusters are weeks behind.', [
        { id: 'help', label: '📞 Personally walk every client through their claim', text: 'Exhausting. Your retention the next year was the best in the region.', rep: 10, stress: 8, perf: 4 },
        { id: 'route', label: '📤 Route everyone to the claims line', text: 'Efficient. Some clients didn\'t forget it.', rep: -5 },
      ]),
    ],
  },
  cosmetology: {
    label: 'Your Chair', icon: '💇', noun: 'regular', value: [400, 2500], capacity: 120, sample: 15, weights: { looks: 1, happiness: 2 },
    kinds: ['color', 'cuts', 'bridal', 'extensions', 'barbering', 'kids'],
    deck: [
      D('booth', '🪑', 'Rent a Booth?', 'The salon offers you booth rental: you keep everything, pay $1,200 a month, and build your own brand.', [
        { id: 'rent', label: '🪑 Rent the booth', check: 50, text: 'Your regulars followed you. You\'re your own boss now.', perf: 4, rep: 6, money: 8000, moneyLabel: 'Booth income', fail: { text: 'Half your regulars didn\'t follow; a thin first year.', cost: 4000, costLabel: 'Booth rent shortfall' } },
        { id: 'stay', label: '🏠 Stay on commission', text: 'Steady and safe.', perf: 1 },
      ]),
      D('viral', '📱', 'A Viral Transformation', 'A before-and-after you posted is blowing up online.', [
        { id: 'ride', label: '📈 Lean in: post daily and open your books', text: 'Your waitlist hit three months. Rates went up.', rep: 10, perf: 4 },
      ]),
    ],
  },
  fitness: {
    label: 'Your Clients', icon: '🏋️', noun: 'client', value: [1500, 6000], capacity: 30, weights: { fitness: 2, happiness: 1 },
    kinds: ['weight loss', 'strength', 'marathon prep', 'post-rehab', 'seniors', 'athlete'],
    deck: [
      D('injury', '🤕', 'A Client Gets Hurt', 'A client tears a shoulder on a lift you programmed.', [
        { id: 'own', label: '🙋 Own it and refer her to physical therapy', text: 'She came back after rehab and stayed with you for years.', rep: 4 },
        { id: 'blame', label: '🙅 Say she used bad form', text: 'She left and told everyone.', rep: -8, risk: { chance: 0.2, text: 'She sued. Your liability insurance covered most of it.', cost: 3000, costLabel: 'Legal costs' } },
      ]),
    ],
  },
  accounting: {
    label: 'Your Clients', icon: '🧮', noun: 'client', value: [3000, 40000], capacity: 40, weights: { smarts: 3 },
    kinds: ['small business', 'nonprofit', 'family estate', 'medical practice', 'restaurant group', 'startup'],
    deck: [
      D('aggressive', '🧾', 'The Aggressive Deduction', 'Your biggest client wants a deduction you\'re fairly sure won\'t survive an audit.', [
        { id: 'refuse', label: '🙅 Refuse to sign it', text: 'They grumbled and stayed.', rep: 4 },
        { id: 'sign', label: '✍️ Sign the return', text: 'They were delighted.', money: 4000, moneyLabel: 'Fees', risk: { chance: 0.25, text: 'An audit disallowed it and named the preparer. A penalty and a referral to the board.', cost: 8000, costLabel: 'Preparer penalty', rep: -10 } },
      ]),
      D('busy', '📆', 'Busy Season', 'It\'s April and you have forty returns left.', [
        { id: 'grind', label: '☕ Grind through it', text: 'Eighty-hour weeks. Every return filed.', stress: 8, perf: 4, money: 6000, moneyLabel: 'Busy-season overtime' },
        { id: 'extend', label: '📤 File extensions on the complicated ones', text: 'Sane hours; a few annoyed clients.', rep: -2 },
      ]),
    ],
  },
  dentistry: {
    label: 'Your Patients', icon: '🦷', noun: 'patient family', value: [800, 4000], capacity: 900, sample: 18, weights: { smarts: 2, happiness: 1 },
    kinds: ['family', 'cosmetic', 'implants', 'orthodontic', 'pediatric', 'seniors'],
    deck: [
      D('buyin', '🏥', 'Buy Into the Practice', 'The owner is retiring and offers you the practice for $650,000 over ten years.', [
        { id: 'buy', label: '🏦 Buy it', check: 50, text: 'You own a practice now: more work, much more income.', perf: 6, rep: 8, money: 40000, moneyLabel: 'Owner draw', fail: { text: 'The first year was rough: patients left with the old owner.', cost: 20000, costLabel: 'Practice loan shortfall' } },
        { id: 'corporate', label: '🏢 Join a corporate group instead', text: 'Steady pay and no ownership headaches.', perf: 2 },
      ]),
    ],
  },
  veterinary: {
    label: 'Your Patients', icon: '🐾', noun: 'client family', value: [400, 2500], capacity: 1200, sample: 18, weights: { smarts: 2, happiness: 1 },
    kinds: ['dogs', 'cats', 'exotics', 'farm animals', 'horses', 'rescue partners'],
    deck: [
      D('cost', '💔', 'Treatment They Can\'t Afford', 'A family\'s dog needs $6,000 surgery. They have $500.', [
        { id: 'discount', label: '💙 Do it at cost', text: 'The dog lived. The family will never go anywhere else.', rep: 8, cost: 1500, costLabel: 'Discounted surgery' },
        { id: 'euthanasia', label: '😔 Offer euthanasia', text: 'The hardest part of the job.', stress: 6 },
      ]),
    ],
  },
  physicalTherapy: {
    label: 'Your Caseload', icon: '🦵', noun: 'patient', value: [1200, 4500], capacity: 60, weights: { smarts: 1, fitness: 1, happiness: 1 },
    kinds: ['post-surgical knee', 'back pain', 'sports injury', 'stroke rehab', 'vestibular', 'pediatric'],
    deck: [
      D('cashpay', '💵', 'Go Cash-Pay?', 'You could open a cash-pay sports practice: no insurance, higher rates, fewer patients.', [
        { id: 'open', label: '🏃 Open it', check: 50, text: 'Athletes found you. You set your own hours now.', rep: 8, money: 15000, moneyLabel: 'Practice income', fail: { text: 'It was slow to fill; a lean year.', cost: 10000, costLabel: 'Practice start-up' } },
        { id: 'stay', label: '🏥 Stay in the clinic', text: 'Insurance paperwork and steady pay.', perf: 1 },
      ]),
    ],
  },
};

const config = (job) => BOOK_CAREERS[engineKey(job)];
export const isBookCareer = (job) => Boolean(config(job));
const fresh = () => ({ clients: [], won: 0, lost: 0, revenue: 0 });
/** Large books (an agency's policies, a practice's patients) keep a sample: each named client stands for `k` real ones. */
export const bookScale = (cfg) => Math.max(1, Math.round(cfg.capacity / (cfg.sample ?? cfg.capacity)));

function newClient(rng, cfg, state) {
  const n = randomName(rng, rng.pick(['male', 'female']));
  return { id: rng.id('cl_'), name: `${n.firstName} ${n.lastName}`, kind: rng.pick(cfg.kinds), value: Math.round(rng.int(cfg.value[0], cfg.value[1]) / 100) * 100, loyalty: rng.int(45, 70), since: state.character.age };
}

export function bookView(state) {
  const cfg = config(state.career.job);
  if (!cfg) return null;
  const rec = peekLife(state, 'clientBook');
  return { cfg, rec: rec?.professionId === state.career.job.professionId ? rec : null, k: bookScale(cfg) };
}

export const ClientBookModule = {
  id: 'clientBook',
  order: 31.4,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    const cfg = config(job);
    if (!cfg || state.legal.incarceration) return;
    const rec = lifeOf(state, 'clientBook', job.professionId, fresh());
    const k = bookScale(cfg);
    const cap = (cfg.sample ?? cfg.capacity);
    // A starting book: the firm hands a new hire a few clients.
    if (!rec.clients.length && !rec.won) for (let i = 0; i < Math.ceil(cap / 4); i++) rec.clients.push(newClient(rng, cfg, state));
    // Clients pay; the neglected drift; the loyal refer friends.
    const revenue = rec.clients.reduce((s, c) => s + c.value, 0) * k;
    rec.revenue = revenue;
    // Your share: a full book pays about 60% on top of base pay (twice that for a book twice the standard).
    const standard = cap * k * (cfg.value[0] + cfg.value[1]) / 2;
    if (revenue) ctx.earn(Math.round(job.salary * 0.6 * clamp(revenue / standard, 0, 2) / 100) * 100, `${cfg.label === 'Your Chair' ? 'Your chair' : 'Your book'} (${cfg.noun}s)`, { wage: true });
    const over = rec.clients.length - cap;
    const stay = [];
    let lost = 0;
    let referred = 0;
    for (const c of rec.clients) {
      c.loyalty = Math.round(clamp(c.loyalty - 4 - Math.max(0, over) * 2 + (rec.rep - 50) / 15, 0, 100));
      if (rng.chance((100 - c.loyalty) / 100 * 0.35)) { lost += 1; continue; }
      stay.push(c);
      if (c.loyalty >= 75 && rng.chance(0.12)) referred += 1;
    }
    rec.clients = stay;
    for (let i = 0; i < referred && rec.clients.length < cap * 1.3; i++) rec.clients.push({ ...newClient(rng, cfg, state), loyalty: 70 });
    rec.lost += lost;
    rec.won += referred;
    if (over > 0) ctx.stat('stress', Math.min(8, over));
    // Performance follows how full your book is.
    job.performance = Math.round(clamp(job.performance + (rec.clients.length / cap - 0.6) * 8, 0, 100));
    ctx.log(`${cfg.label}: $${Math.round(revenue).toLocaleString()} brought in; ${lost * k} ${cfg.noun}${lost * k === 1 ? '' : 's'} left${referred ? `, ${referred * k} came by referral` : ''}.`, cfg.icon);
    // Rivals go after your biggest client.
    const big = [...rec.clients].sort((a, b) => b.value - a.value)[0];
    if (big && rng.chance(0.25) && !state.prompts.some((p) => p.type === 'clientBook.event')) {
      ctx.prompt({ type: 'clientBook.event', icon: '🦈', title: 'A Rival Circles Your Best Client', text: `A competitor is courting ${big.name} (${big.kind}, $${(big.value * k).toLocaleString()} a year) with a better price.`,
        options: [{ id: 'match', label: '💸 Match the price', hint: 'Keep them, earn less' }, { id: 'relationship', label: '☕ Lean on the relationship', hint: `Loyalty ${big.loyalty}%` }, { id: 'let', label: '👋 Let them go' }],
        data: { kind: 'poach', clientId: big.id, professionId: engineKey(job) } });
    } else if (cfg.deck?.length && rng.chance(0.5) && !state.prompts.some((p) => p.type === 'clientBook.event')) {
      const d = rng.pick(cfg.deck);
      ctx.prompt({ type: 'clientBook.event', icon: d.icon, title: d.title, text: d.text, options: promptOptions(d.options), data: { deckId: d.id, professionId: engineKey(job) } });
    }
  },
  actions: {
    /** Go find new clients: networking, open houses, cold calls, social media. */
    prospect(ctx) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      if (!cfg) return;
      if (yearlyCount(state, 'clientBook.prospect')) return ctx.toast('You already went prospecting this year.', 'warn');
      bumpYearly(state, 'clientBook.prospect');
      const rec = lifeOf(state, 'clientBook', job.professionId, fresh());
      const n = Math.max(0, Math.round((skill(state, cfg.weights) / 25) * (0.6 + rec.rep / 100) + rng.int(-1, 2)));
      for (let i = 0; i < n; i++) rec.clients.push(newClient(rng, cfg, state));
      rec.won += n;
      ctx.stat('stress', 3);
      ctx.log(n ? `You went prospecting and signed ${n * bookScale(cfg)} new ${cfg.noun}${n * bookScale(cfg) === 1 ? '' : 's'}.` : 'A season of prospecting and nobody signed.', cfg.icon, n ? 'good' : 'warn');
      return undefined;
    },
    /** Look after the clients you have. */
    nurture(ctx) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      if (!cfg) return;
      if (yearlyCount(state, 'clientBook.nurture')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'clientBook.nurture');
      const rec = lifeOf(state, 'clientBook', job.professionId, fresh());
      for (const c of rec.clients) c.loyalty = Math.min(100, c.loyalty + 12);
      ctx.stat('stress', 2);
      ctx.log(`You checked in with every ${cfg.noun}: calls, notes, small favors. Loyalty is up.`, '☕', 'good');
      return undefined;
    },
    /** Raise your rates: more from everyone, and some leave. */
    raise(ctx) {
      const { state } = ctx;
      const job = state.career.job;
      const cfg = config(job);
      if (!cfg) return;
      if (yearlyCount(state, 'clientBook.raise')) return ctx.toast('Once a year.', 'warn');
      bumpYearly(state, 'clientBook.raise');
      const rec = lifeOf(state, 'clientBook', job.professionId, fresh());
      for (const c of rec.clients) { c.value = Math.round(c.value * 1.1 / 100) * 100; c.loyalty = Math.max(0, c.loyalty - 10); }
      ctx.log('You raised your rates 10%. Most clients grumbled and stayed.', '📈');
      return undefined;
    },
  },
  resolvers: {
    event(ctx, data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      const cfg = BOOK_CAREERS[data.professionId];
      if (!cfg || !job) return;
      const rec = lifeOf(state, 'clientBook', job.professionId, fresh());
      if (data.kind === 'poach') {
        const c = rec.clients.find((x) => x.id === data.clientId);
        if (!c) return;
        if (optionId === 'match') { c.value = Math.round(c.value * 0.85 / 100) * 100; c.loyalty = Math.min(100, c.loyalty + 15); return ctx.log(`You matched the price and kept ${c.name}.`, '🤝'); }
        if (optionId === 'relationship' && rng.chance(c.loyalty / 100)) { c.loyalty = Math.min(100, c.loyalty + 10); return ctx.log(`${c.name} stayed: "We\'re not going anywhere."`, '☕', 'good'); }
        rec.clients = rec.clients.filter((x) => x !== c);
        rec.lost += 1;
        return ctx.log(`${c.name} left for the competitor.`, '👋', 'warn');
      }
      const d = cfg.deck?.find((x) => x.id === data.deckId);
      if (d) resolveOption(ctx, rec, d.options.find((o) => o.id === optionId), d.icon, cfg.weights);
      return undefined;
    },
  },
};
