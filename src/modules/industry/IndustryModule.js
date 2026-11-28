/**
 * The industry model in the life: runs your country's year, tells you what changed, and hands
 * the year's crisis (if any) to the economy (EconomyEngine reads crisisHere). In a life whose
 * economy runs itself, the world's named crashes (the Long Depression, the Great Depression, the
 * oil shocks, the tech bust, the banking collapse) are what the model produced, named by what
 * they were like, not the dates they had in our history.
 */
import { Random } from '../../core/Random.js';
import { yearNow, TECH } from '../world/Eras.js';
import { COUNTRIES } from '../world/Countries.js';
import { ensureIndustry, catchUp, emergent, crisisHere, INDUSTRIES, IX, industryShare, worldOf } from './IndustryEngine.js';
import { TECHS } from './IndustryData.js';
import { settleBook, bindState, policyLabel } from './IndustryPolicy.js';
import { LAWS } from '../politics/Laws.js';

const here = (state) => state.character?.countryId ?? 'US';
const nameOf = (cc) => COUNTRIES[cc]?.name ?? cc;
const CAUSE_TEXT = {
  financial: 'Banks have failed and credit has frozen',
  trade: 'A crash abroad has come home along the trade routes: orders cancelled, ships idle',
  oil: 'The oil price has tripled and everything that moves costs more',
  industry: 'The industries the country lives on are closing',
};

/** Start a life's industry: the country from 1800 to the year before the start, and its law book. */
export function startIndustry(state) {
  if (!state?.character) return;
  ensureIndustry(state);
  bindState(state);
  catchUp(state, yearNow(state) - 1);
  if (emergent(state)) settleBook(state, here(state), yearNow(state));
}

export const IndustryModule = {
  id: 'industry',
  order: 0.9,
  init(state) { startIndustry(state); },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character?.alive) return;
    const before = state.industry?.cc;
    ensureIndustry(state);
    bindState(state);
    // A new country (you moved): its history from 1800, then on with the life.
    if (state.industry.cc !== before || state.industry.year < yearNow(state) - 1) {
      catchUp(state, yearNow(state) - 1);
      if (emergent(state)) settleBook(state, here(state), yearNow(state));
    }
    const events = catchUp(state, yearNow(state));
    const y = yearNow(state);
    const cc = here(state);
    const news = (headline, icon, tier = 'world', weight = 5) => ctx.emit('news:story', { tier, headline, weight, icon });
    for (const ev of events) {
      if (ev.kind === 'tech') news(`A new age of industry: ${TECHS[ev.id].name}`, '💡', 'world', 4);
      else if (ev.kind === 'cartel') news('The oil exporters have banded together: the price of oil has tripled', '🛢️', 'world', 8);
      else if (ev.kind === 'oilEnd') news('The oil exporters\' cartel has cracked; prices are falling', '🛢️', 'world', 4);
      else if (ev.kind === 'crisis' && ev.cc !== cc) news(`Crash in ${nameOf(ev.cc)}: banks and firms are failing`, '📉', 'world', 6);
      else if (ev.kind === 'crisis') ctx.log(`📉 ${CAUSE_TEXT[ev.cause] ?? 'The economy has crashed'}.`, '📉', 'warn');
      else if (ev.kind === 'law' && ev.cc === cc && ev.why !== 'settled') {
        const law = LAWS[ev.law];
        const what = law?.kind === 'choice' ? `${law.name}: now ${policyLabel(ev.law, ev.value)}` : `${law?.name ?? ev.law} ${ev.value ? 'enacted' : 'repealed'}`;
        news(`The government acts on ${ev.why}: ${what}`, law?.icon ?? '📜', 'national', 6);
      } else if (ev.kind === 'advice' && ev.cc === cc) {
        const law = LAWS[ev.law];
        ctx.log(`Your ministers urge you to change ${law?.name ?? ev.law} (${law?.kind === 'choice' ? policyLabel(ev.law, ev.value) : ev.value ? 'enact it' : 'repeal it'}), because of ${ev.why}. It is your decision (Politics → Chamber).`, '🗂️', 'info');
      }
    }
  },
};
export { Random, INDUSTRIES, IX, worldOf };
