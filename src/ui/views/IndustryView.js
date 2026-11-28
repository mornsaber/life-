/**
 * Industry & Trade: what the country lives by and which way each trade is going, the town's own
 * trade, your job's outlook, and the laws of trade and money in force (World tab).
 */
import { esc, card, kv, money, button, select } from '../Components.js';
import { foundable } from '../../modules/industry/Concerns.js';
import { INDUSTRIES, crisisHere, oilPrice, industryOfProfession, emergent, growthHere, industryName } from '../../modules/industry/IndustryEngine.js';
import { topIndustries, townTrade, jobOutlook } from '../../modules/industry/Sync.js';
import { policyLabel, OWN_SECTORS } from '../../modules/industry/IndustryPolicy.js';
import { SECTORS } from '../../modules/world/OwnershipHistory.js';
import { levelValue } from '../../modules/politics/Laws.js';
import { statuteIn } from '../../modules/politics/StatuteBook.js';
import { stateShare } from '../../modules/world/Ownership.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { getProfession } from '../../modules/career/JobTrees.js';

const trend = (h) => (h > 0.35 ? '⬆️ booming' : h > 0.08 ? '↗️ growing' : h > -0.08 ? '➡️ steady' : h > -0.35 ? '↘️ shrinking' : '⬇️ in decline');
const CAUSE = { financial: 'a banking crisis', trade: 'a crash abroad', oil: 'the oil price', industry: 'industries closing' };

export function industryCard(state) {
  if (!emergent(state) || !state.industry?.c?.[state.character?.countryId ?? 'US']) return '';
  const cc = state.character.countryId ?? 'US';
  const list = topIndustries(state, 7);
  if (!list.length) return '';
  const rows = list.map(([id, share, health, jobs]) => {
    const I = INDUSTRIES[id];
    const jobsNote = jobs < health - 0.25 ? ' · machines and imports are taking the jobs' : '';
    return `<li>${I.icon} <b>${esc(industryName(state, id))}</b> <small>${Math.round(share * 100)}% of output · ${trend(health)}${jobsNote}</small></li>`;
  }).join('');
  const town = townTrade(state);
  const where = (REGIONS[state.character.regionId]?.name ?? 'Your town').split(',')[0];
  const job = state.career?.job;
  const jobInd = job ? industryOfProfession(job.professionId) : null;
  const crisis = crisisHere(state);
  const at = (law) => levelValue(state, law, 'federal', cc === 'US' ? null : cc);
  const owned = OWN_SECTORS.filter((s) => stateShare(state, s, cc) >= 1).map((s) => SECTORS[s].label);
  const laws = [
    ['Trade', policyLabel('tariff', at('tariff') ?? 'revenue')],
    ['Money', `${statuteIn(state, 'goldStandard', cc) ? 'on the gold standard' : 'off gold'}${statuteIn(state, 'lenderOfLastResort', cc) ? ' · a lender of last resort' : ''}${statuteIn(state, 'depositInsurance', cc) ? ' · deposits insured' : ''}`],
    ['Banks', policyLabel('bankRegulation', at('bankRegulation') ?? 'standard')],
    ['Industry', policyLabel('industrialPolicy', at('industrialPolicy') ?? 'laissezFaire')],
    ['Unions', statuteIn(state, 'tradeUnionsLegal', cc) ? 'lawful' : 'unlawful: combinations are conspiracy'],
    ['Tax & welfare', [statuteIn(state, 'incomeTax', cc) ? 'income tax' : 'no income tax', statuteIn(state, 'sicknessInsurance', cc) && 'sickness insurance', statuteIn(state, 'statePension', cc) && 'a state pension', statuteIn(state, 'nationalInsurance', cc) && 'national insurance'].filter(Boolean).join(' · ')],
    ['In public hands', owned.length ? owned.join(', ') : 'nothing'],
  ];
  const oil = oilPrice(state);
  return card('Industry & Trade', `<ul class="history">${rows}</ul>
    ${town ? `<p class="fine">🏘️ ${esc(where)} is a ${esc(town.town)}: ${esc(town.name.toLowerCase())}, ${trend(town.jobs).replace(/^\S+ /, '')}.</p>` : ''}
    ${jobInd ? `<p class="fine">💼 Your trade (${esc(getProfession(job.professionId)?.name ?? '')}) works in ${esc(industryName(state, jobInd).toLowerCase())}: jobs ${trend(jobOutlook(state, job.professionId)).replace(/^\S+ /, '')}.</p>` : ''}
    ${crisis ? `<p class="fine">📉 A crisis: ${esc(CAUSE[crisis.cause] ?? 'a crash')}, since ${crisis.year}.</p>` : `<p class="fine">${growthHere(state) >= 0 ? '📈' : '📉'} Output ${growthHere(state) >= 0 ? 'grew' : 'shrank'} ${Math.abs(Math.round(growthHere(state) * 1000) / 10)}% last year.</p>`}
    ${oil > 1.5 ? `<p class="fine">🛢️ Oil costs ${Math.round(oil * 10) / 10}× what it did: the exporters' cartel.</p>` : ''}
    ${kv(laws)}
    <p class="fine">These are laws: pass or repeal them from 🏛️ Chamber, or the government will as times change.</p>`, { icon: '🏭' });
}

/** Your industrial concerns, and what you could found (Business tab). */
export function concernsCard(state) {
  if (!emergent(state) || state.character.age < 21) return '';
  const mine = state.concerns ?? [];
  const options = foundable(state);
  if (!mine.length && !options.length) return '';
  const rows = mine.map((c) => `<li>${INDUSTRIES[c.industry].icon} <b>${esc(c.name)}</b> <small>since ${c.since} · worth ${money(c.value)} · ${c.workers.toLocaleString()} workers · last year ${money(c.lastProfit ?? 0)}${c.cartel ? ' · in the cartel' : ''}${c.colonial ? ' · a concession' : ''}</small>
    <div class="toggle-row">${button('🏗️ Expand', 'concerns.expand', { arg: c.id, variant: 'tiny' })}${button('✂️ Cut wages', 'concerns.cutWages', { arg: c.id, variant: 'tiny' })}${button(c.cartel ? '📉 Leave the cartel' : '🤝 Join the cartel', 'concerns.cartel', { arg: c.id, variant: 'tiny' })}${button('🎩 Lobby the government', 'concerns.lobby', { arg: c.id, variant: 'tiny', disabled: Boolean(state.yearly?.['concerns.lobby']) })}${button('🤝 Sell', 'concerns.sell', { arg: c.id, variant: 'tiny ghost' })}</div></li>`).join('');
  const can = options.slice(0, 40).map(([id, cost, pioneer]) => ({ value: id, label: `${INDUSTRIES[id].icon} ${industryName(state, id)} · ~${money(cost)}${pioneer ? ' · the first here' : ''}` }));
  return card('Industrial Concerns', `${rows ? `<ul class="history">${rows}</ul>` : '<p class="muted">Mills, mines, works and lines: the great fortunes of the age. You need half the money; the banks lend the rest.</p>'}
    ${options.length ? `<div class="enroll-form" data-collect-root>${select('kind', can)}${button('🏭 Found it', 'concerns.found', { collect: true, variant: 'small' })}</div>` : ''}
    <p class="fine">Profits follow the industry's fortunes. Nationalisation pays compensation; a colony's independence may not.</p>`, { icon: '🏭' });
}
