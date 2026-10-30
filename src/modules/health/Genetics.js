/**
 * What runs in the family, and medicine at its edges.
 *
 *   Family history  rolled at birth: a raised risk of cancer, heart disease, diabetes or dementia
 *                   (and sometimes a lower one). It multiplies those conditions' onset odds.
 *   Genetic test    tells you what you're carrying. Knowing opens prevention: risk-reducing
 *                   surgery for a high cancer risk, statins for the heart, lifestyle for diabetes.
 *   Clinical trial  a serious illness that standard treatment isn't stopping can be enrolled in
 *                   a trial (a better chance, real side effects), or treated privately abroad with
 *                   an experimental therapy (expensive, uncertain).
 *
 * state.health.genes = { cancer, heart, diabetes, dementia, known, prevention: { cancer, heart } }
 */
import { Random, clamp } from '../../core/Random.js';
import { activeConditions, CONDITIONS } from './Conditions.js';
import { priceLevel } from '../world/Countries.js';

export const GENE_LABEL = { cancer: 'cancer', heart: 'heart disease', diabetes: 'type 2 diabetes', dementia: 'Alzheimer\'s' };
const CONDITION_GENE = { cancer: 'cancer', heartDisease: 'heart', hypertension: 'heart', stroke: 'heart', diabetes: 'diabetes', dementia: 'dementia' };
const local = (state, n) => Math.round(n * priceLevel(state));

/** Roll a family history (most people have nothing notable). */
export function rollGenes(seed) {
  const rng = new Random((seed * 2246822519 + 0x6e5) >>> 0);
  const g = {};
  for (const k of Object.keys(GENE_LABEL)) g[k] = rng.chance(0.18) ? Math.round(rng.float(1.6, 3) * 10) / 10 : rng.chance(0.1) ? 0.7 : 1;
  return { ...g, known: false, prevention: {} };
}
export const genesOf = (state) => state.health?.genes ?? null;

/** The multiplier a family history puts on a condition's onset odds (prevention included). */
export function geneFactor(state, conditionId) {
  const g = genesOf(state);
  const key = CONDITION_GENE[conditionId];
  if (!g || !key) return 1;
  const prevent = g.prevention?.[key] ? (key === 'cancer' ? 0.35 : 0.6) : 1;
  return g[key] * prevent;
}

export function geneticsTick(main) {
  const { state } = main;
  const h = state.health;
  if (!h) return;
  h.genes ??= rollGenes((state.world?.seed ?? 1) + (state.character.birthYear ?? 0));
  if (h.genes.prevention.heart) main.spend(local(state, 300), 'Statins', { allowDebt: true });
  // A clinical trial for a serious illness that isn't responding.
  const serious = activeConditions(state).find((c) => ['cancer', 'dementia', 'kidneyDisease', 'liverDisease', 'heartDisease'].includes(c.id) && c.severity >= 55 && !c.trialAsked && !c.hospice);
  if (serious && state.character.age >= 18) {
    serious.trialAsked = true;
    main.prompt({ type: 'health.trial', icon: '🧪', title: 'A Clinical Trial', text: `Your ${CONDITIONS[serious.id].name.toLowerCase()} isn't responding to standard treatment. Your specialist mentions a trial of a new drug — or there's a private clinic abroad with an experimental therapy.`, data: { conditionId: serious.id }, options: [
      { id: 'trial', label: '🧪 Enrol in the trial', hint: 'Free; you might get the placebo; real side effects' },
      { id: 'abroad', label: '✈️ The private clinic abroad', hint: `≈$${local(state, 120000).toLocaleString()}; unproven` },
      { id: 'standard', label: '🏥 Stay with standard treatment' },
    ] });
  }
}

export const GeneticsResolvers = {
  trial(ctx, data, optionId) {
    const { state, rng } = ctx;
    const c = activeConditions(state).find((x) => x.id === data.conditionId);
    if (!c) return;
    if (optionId === 'standard') return ctx.log('You stayed with the treatment you knew.', '🏥', 'info');
    if (optionId === 'abroad') ctx.spend(local(state, 120000), 'Experimental treatment abroad', { allowDebt: true });
    const odds = optionId === 'trial' ? 0.3 : 0.15;
    ctx.stat('health', -rng.int(2, 8));
    if (rng.chance(odds)) { c.severity = Math.max(10, c.severity - rng.int(30, 50)); c.remission = c.id === 'cancer' ? true : c.remission; return ctx.log(optionId === 'trial' ? 'You were on the real drug, and it worked. Your scans came back clear enough that the doctors used the word "remarkable".' : 'Against the odds, the treatment abroad bought you years.', '🌱', 'milestone'); }
    ctx.log(optionId === 'trial' ? 'The trial drug did little but make you sick. You may have been on the placebo.' : 'The clinic took the money. The disease didn\'t notice.', '🧪', 'bad');
  },
};

export const GeneticsActions = {
  test(ctx) {
    const { state } = ctx;
    const g = genesOf(state);
    if (!g || state.character.age < 18) return ctx.toast('18+', 'warn');
    if (g.known) return ctx.toast('You already know', 'warn');
    if (!ctx.spend(local(state, 250), 'Genetic test')) return ctx.toast('Not enough cash', 'warn');
    g.known = true;
    const high = Object.keys(GENE_LABEL).filter((k) => g[k] >= 1.5);
    ctx.log(high.length ? `Your genetic test came back: a raised risk of ${high.map((k) => GENE_LABEL[k]).join(' and ')}.` : 'Your genetic test came back unremarkable. Nothing you need to act on.', '🧬', high.length ? 'warn' : 'good');
  },
  /** arg: 'cancer' | 'heart'. */
  prevent(ctx, key) {
    const { state, rng } = ctx;
    const g = genesOf(state);
    if (!g?.known || g[key] < 1.5 || g.prevention[key]) return ctx.toast('Only after a test shows a raised risk', 'warn');
    g.prevention[key] = true;
    if (key === 'cancer') { ctx.spend(local(state, 25000), 'Risk-reducing surgery', { allowDebt: true }); ctx.stat('health', -rng.int(4, 10)); return ctx.log('You had risk-reducing surgery. A hard decision, and your risk is a fraction of what it was.', '🧬', 'milestone'); }
    ctx.log('You started on statins and changed your diet. Your heart risk fell.', '💊', 'good');
  },
};
