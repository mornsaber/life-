/**
 * After a crime against you: what the justice system offers victims, one step at a time.
 *
 *   Impact statement     you tell the court what it did to you, before sentence
 *   Restorative justice  a supervised meeting with the offender (not for sexual or domestic abuse)
 *   Civil suit           sue for damages — even after an acquittal (a lower standard of proof)
 *   Compensation         the state's scheme pays for violent crime, solved or not
 *   Parole letters       years later, the board asks whether you want to be heard
 *
 * state.legal.victimOf = [{ offender, crime, age, released }]
 */

import { priceLevel } from '../world/Countries.js';

const VIOLENT = ['assault', 'mugging', 'sexualAssault', 'abuse'];
const SCHEME = { US: 'the state victim compensation fund', GB: 'the Criminal Injuries Compensation Authority', CA: 'the provincial victims\' compensation program', AU: 'the state victims of crime assistance scheme', NZ: 'ACC', IE: 'the Criminal Injuries Compensation Tribunal', FR: 'the CIVI (victims\' compensation commission)', DE: 'the Victims Compensation Act (OEG) office' };
const schemeHere = (state) => SCHEME[state.character.countryId ?? 'US'] ?? 'the state compensation scheme';
const local = (state, n) => Math.round(n * priceLevel(state));

/** Open the victim's choices. outcome: 'convicted' | 'acquitted' | 'unsolved'. */
export function victimJustice(ctx, { id, offender, outcome, used = [] }) {
  const { state } = ctx;
  const options = [];
  if (outcome === 'convicted' && !used.includes('statement')) options.push({ id: 'statement', label: '🗣️ Read a victim impact statement at sentencing', hint: 'The court hears what it did to you' });
  if (outcome === 'convicted' && !['sexualAssault', 'abuse'].includes(id) && !used.includes('restorative')) options.push({ id: 'restorative', label: '🤝 Ask for a restorative-justice meeting', hint: 'A trained facilitator; you can stop at any time' });
  if (outcome !== 'unsolved' && !used.includes('sue')) options.push({ id: 'sue', label: '⚖️ Sue for damages', hint: `${outcome === 'acquitted' ? 'A civil court needs less proof than a jury · ' : ''}A lawyer on contingency` });
  if (VIOLENT.includes(id) && !used.includes('compensation')) options.push({ id: 'compensation', label: `📝 Apply to ${schemeHere(state)}`, hint: 'For violent crime, solved or not' });
  if (!options.length) return;
  options.push({ id: 'done', label: '🚪 That\'s enough', hint: 'You can put it down' });
  if (!used.length && (outcome === 'convicted' || outcome === 'acquitted')) {
    (state.legal.victimOf ??= []).push({ offender, crime: id, age: state.character.age, convicted: outcome === 'convicted' });
    state.legal.victimOf = state.legal.victimOf.slice(-6);
  }
  ctx.prompt({ type: 'crime.victimCourt', icon: '🫂', title: 'What Happens Now', text: `${outcome === 'convicted' ? `${offender} was convicted.` : outcome === 'acquitted' ? `${offender} was acquitted.` : 'Nobody was charged.'} A victim advocate explains what you can still do.`, data: { id, offender, outcome, used }, options });
}

function resolve(ctx, data, optionId) {
  const { state, rng } = ctx;
  if (optionId === 'done') return;
  const used = [...(data.used ?? []), optionId];
  const sexual = data.id === 'sexualAssault';
  switch (optionId) {
    case 'statement':
      ctx.emit('health:trauma', { amount: -6, source: 'being heard' });
      ctx.log(`You read your statement with your hands shaking. ${data.offender} looked at the floor. The judge quoted you at sentencing.`, '🗣️', 'good');
      break;
    case 'restorative': {
      const good = rng.chance(0.6);
      ctx.emit('health:trauma', { amount: good ? -10 : 2, source: 'restorative justice' });
      ctx.log(good ? `You sat across from ${data.offender} and asked the questions only he could answer. He answered them. You left lighter.` : `${data.offender} wouldn't take responsibility. You walked out — the facilitator said that was your right.`, '🤝', good ? 'good' : 'warn');
      break;
    }
    case 'sue': {
      const odds = data.outcome === 'convicted' ? 0.8 : 0.45;
      if (!rng.chance(odds)) { ctx.stat('stress', 6); ctx.log('The civil case failed. Your lawyer took nothing; you lost another year to it.', '⚖️', 'bad'); break; }
      const award = local(state, rng.int(sexual ? 40000 : 8000, sexual ? 250000 : 60000));
      const collected = rng.chance(0.4) ? award : Math.round(award * rng.float(0.05, 0.3));
      ctx.earn(Math.round(collected * 0.67), 'Civil damages (after the lawyer\'s third)');
      ctx.log(`You won a $${award.toLocaleString()} judgment. ${collected < award ? `You collected $${collected.toLocaleString()} — most people who hurt others don't have money.` : 'It was paid in full.'}`, '⚖️', 'good');
      break;
    }
    case 'compensation': {
      const ok = rng.chance(data.outcome === 'unsolved' ? 0.55 : 0.75) && !state.legal.record.some((r) => r.severity === 'felony' && state.character.age - r.age < 10);
      if (ok) {
        const amt = local(state, rng.int(sexual ? 8000 : 1500, sexual ? 40000 : 15000));
        ctx.earn(amt, 'Victim compensation');
        ctx.log(`After eleven months and three forms, ${schemeHere(state)} paid $${amt.toLocaleString()} toward your costs and counselling.`, '📝', 'good');
      } else ctx.log(`${schemeHere(state).charAt(0).toUpperCase() + schemeHere(state).slice(1)} turned you down${state.legal.record.some((r) => r.severity === 'felony') ? ' — your own record counted against you' : ''}.`, '📝', 'warn');
      break;
    }
    default:
  }
  victimJustice(ctx, { ...data, used });
}

/** Years later: the offender is up for parole. */
export function victimParoleTick(ctx) {
  const { state, rng } = ctx;
  const due = (state.legal.victimOf ?? []).find((v) => v.convicted && !v.released && state.character.age - v.age >= 3);
  if (!due || !rng.chance(0.25)) return;
  due.released = true;
  ctx.prompt({ type: 'crime.victimParole', icon: '📋', title: 'A Letter from the Parole Board', text: `${due.offender}, convicted of the crime against you ${state.character.age - due.age} years ago, is eligible for parole. Victims may speak at the hearing.`, data: { offender: due.offender }, options: [
    { id: 'oppose', label: '🛑 Write to oppose release' },
    { id: 'support', label: '🕊️ Say you don\'t object', hint: 'If you\'re ready' },
    { id: 'none', label: '🙈 Don\'t take part', hint: 'You don\'t owe them anything' },
  ] });
}

function resolveParole(ctx, data, optionId) {
  const { rng } = ctx;
  const released = rng.chance(optionId === 'oppose' ? 0.15 : optionId === 'support' ? 0.55 : 0.3);
  ctx.emit('health:trauma', { amount: optionId === 'none' ? 0 : -3, source: 'parole hearing' });
  ctx.log(`${data.offender} was ${released ? 'released on parole' : 'denied parole'}.${optionId === 'support' ? ' You surprised yourself.' : ''}`, '📋', released && optionId === 'oppose' ? 'warn' : 'info');
}

export const VictimJusticeResolvers = { victimCourt: resolve, victimParole: resolveParole };
export const victimSchemeHere = schemeHere;
