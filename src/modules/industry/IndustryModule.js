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
import { ensureIndustry, catchUp, emergent, crisisHere, INDUSTRIES, IX, industryShare, worldOf, industriesHere, industryName } from './IndustryEngine.js';
import { townTrade } from './Sync.js';
import { TECHS } from './IndustryData.js';
import { settleBook, bindState, policyLabel } from './IndustryPolicy.js';
import { LAWS } from '../politics/Laws.js';
import { setAvailabilityFilter } from '../career/JobTrees.js';
import { industryJobFilter } from './Sync.js';
let filterSet = false;

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
  setup() { if (!filterSet) { filterSet = true; setAvailabilityFilter(industryJobFilter); } },
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
    // This year's events, for the working life that reads them (IndustrialLife.js).
    state.industry.yearEvents = events.filter((e) => e.kind === 'disaster' || e.kind === 'crisis').map((e) => ({ kind: e.kind, cc: e.cc, ...(e.industry ? { industry: e.industry } : {}), ...(e.cause ? { cause: e.cause } : {}) }));
    const y = yearNow(state);
    const cc = here(state);
    const news = (headline, icon, tier = 'world', weight = 5) => ctx.emit('news:story', { tier, headline, weight, icon });
    // Your country's big industries turning: a boom, or closures across the country.
    const c = state.industry.c[cc];
    c.said ??= {};
    for (const [id, share, , jobs] of industriesHere(state, cc, 8)) {
      if (share < 0.03 || y - (c.said[id] ?? -99) < 8) continue;
      const I = INDUSTRIES[id];
      if (jobs < -0.4) { c.said[id] = y; news(`${industryName(state, id)} in decline: closures and layoffs across the country`, I.icon, 'national', 6); }
      else if (jobs > 0.45) { c.said[id] = y; news(`Boom in ${industryName(state, id).toLowerCase()}: it can't hire fast enough`, I.icon, 'national', 4); }
    }
    // Your own town's trade.
    const t = townTrade(state);
    if (t && t.jobs < -0.4 && y - (c.saidTown ?? -99) >= 10) {
      c.saidTown = y;
      ctx.log(`${t.icon} ${t.name} is closing down here: in this ${t.town}, shops are boarded up and families are leaving to find work elsewhere.`, t.icon, 'warn');
    }
    for (const ev of events) {
      if (ev.kind === 'disaster' && ev.cc === cc) news(`Disaster in ${INDUSTRIES[ev.industry]?.name.toLowerCase() ?? 'industry'}: many dead`, '🚨', 'national', 7);
      else if (ev.kind === 'tech') news(`A new age of industry: ${TECHS[ev.id].name}`, '💡', 'world', 4);
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
