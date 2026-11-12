/**
 * Life in office: the protection detail, the threats, the weekly trek back to your district, and
 * the temptations — and who investigates officials where you live.
 *
 *   Security     a head of state or government has a close-protection detail (the Secret Service,
 *                the Met's Royalty and Specialist Protection, the BKA's Sicherungsgruppe…);
 *                ministers and governors have officers; members have a panic button. Threats come
 *                with the job: letters, plots foiled, now and then an attempt. US presidents keep
 *                their detail for life; elsewhere it winds down after you leave.
 *   The district  a legislator splits the week between the capital and home: surgeries and town
 *                halls keep the seat safe; neglect it and the voters notice. Before the airliner it
 *                was a long train ride.
 *   Temptations  the government jet for a family holiday, a relative on the payroll. Who catches
 *                you depends on the country: the FBI, the police, the CBI, Brazil's Federal Police,
 *                the Party's discipline inspectors.
 *
 * state.officeLife = { seed, district: 'little'|'normal'|'lots', threats, attempts, protection: { tier, agency, until }, perks }
 * Its own random stream: the rest of the year rolls as it always did.
 */
import { Random, clamp } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { OFFICES } from './Offices.js';
import { mySeat } from './Legislature.js';
import { corruptionHere } from '../crime/CrimeWorld.js';
import { regimeOf } from '../world/Regimes.js';

const cc = (state) => state.character?.countryId ?? 'US';
const orng = (state) => {
  state.officeLife ??= {};
  state.officeLife.seed = ((state.officeLife.seed ?? (((state.world?.seed ?? 17) * 3266489917) >>> 0)) * 1664525 + 1013904223) >>> 0;
  return new Random(state.officeLife.seed);
};

/** Who guards a head of state or government. */
const DETAIL = { US: 'the Secret Service', GB: 'the Met\'s Royalty and Specialist Protection', FR: 'the Service de la protection (SDLP)', DE: 'the BKA\'s Sicherungsgruppe', IT: 'the Ispettorato di Pubblica Sicurezza', JP: 'the Security Police (SP)', IN: 'the Special Protection Group', CA: 'the RCMP', AU: 'the AFP', RU: 'the Federal Protective Service (FSO)', CN: 'the Central Security Bureau', BR: 'the GSI', MX: 'the Presidential Guard', KR: 'the Presidential Security Service', ES: 'the Policía Nacional protection unit' };
/** Who investigates officials. */
const WATCHDOG = { US: 'the FBI', GB: 'the police', FR: 'the financial prosecutors (PNF)', DE: 'the state prosecutors', IT: 'the Guardia di Finanza', ES: 'the Anti-Corruption Prosecutor', IN: 'the CBI', BR: 'the Federal Police', KR: 'the prosecutors', JP: 'the Tokyo prosecutors\' special squad', CN: 'the Party\'s discipline inspectors (CCDI)', VN: 'the Party\'s inspection commission', RU: 'the FSB', MX: 'the Attorney General', CA: 'the RCMP', AU: 'the anti-corruption commission', NG: 'the EFCC', KE: 'the Ethics and Anti-Corruption Commission', ZA: 'the Hawks', PH: 'the Ombudsman', ID: 'the KPK' };
export const watchdogHere = (state) => WATCHDOG[cc(state)] ?? 'the police';
export const detailHere = (state) => DETAIL[cc(state)] ?? 'a state protection detail';

/** Your protection: 'detail' (a head of state or government), 'officers' (ministers, governors, big-city mayors), or null. */
export function protectionOf(state) {
  const o = state.politics?.office;
  const def = o && OFFICES[o.id];
  if (def && (def.headOfState || o.id === 'president' || (def.leader && (def.level ?? 0) >= 5) || (def.executive && def.national && (def.level ?? 0) >= 5))) return { tier: 'detail', agency: detailHere(state) };
  if (def && ((def.level ?? 0) >= 5 || o.id === 'governor' || def.cabinet || (o.id === 'mayor' && (def.level ?? 0) >= 2))) return { tier: 'officers', agency: 'a protection team' };
  const kept = state.officeLife?.protection;
  if (kept && (kept.until == null || kept.until > state.character.age)) return kept;
  return null;
}
/** A legislator (with a district to go home to). */
export const isLegislator = (state) => Boolean(mySeat(state) && !mySeat(state).peer) || ['cityCouncil', 'stateRep', 'stateSenator', 'usRep', 'usSenator'].includes(state.politics?.office?.id) || (OFFICES[state.politics?.office?.id]?.kind === 'legislative' && !OFFICES[state.politics.office.id].appointedBy);

export const DISTRICT = {
  little: { label: 'Mostly in the capital', approval: -3, stress: -2, cost: 0, recognition: 0 },
  normal: { label: 'Home most weekends', approval: 0, stress: 1, cost: 2000, recognition: 1 },
  lots: { label: 'Every week, every event', approval: 3, stress: 4, cost: 6000, recognition: 2 },
};

function security(ctx, rng) {
  const { state } = ctx;
  const ol = state.officeLife;
  const p = protectionOf(state);
  const o = state.politics?.office;
  // Leaving office: a former US president keeps the detail for life; others for a few years.
  if (!o && ol.protection && ol.protection.until === undefined) ol.protection.until = cc(state) === 'US' && ol.protection.president ? null : state.character.age + 5;
  if (o && p?.tier === 'detail') ol.protection = { ...p, president: o.id === 'president' };
  if (!o && !p) return;
  if (!o) return;
  const level = OFFICES[o.id]?.level ?? 1;
  const era = yearNow(state) < 1970 ? 1.5 : 1;
  const unrest = regimeOf(cc(state))?.kind === 'fragile' ? 2 : 1;
  if (p) ctx.stat('happiness', -1);
  // Threats come with prominence.
  if (rng.chance(Math.min(0.5, 0.05 * level * era))) {
    ol.threats = (ol.threats ?? 0) + 1;
    ctx.stat('stress', 3);
    if (rng.chance(0.5)) ctx.log(p ? `${p.agency === detailHere(state) ? `${p.agency[0].toUpperCase()}${p.agency.slice(1)}` : 'Your protection team'} foiled a plot against you. You only heard about it afterwards.` : 'A threatening letter arrived at your office. The police took it seriously.', '🛡️', 'warn');
  }
  // An attempt on your life: rare, and survivable with a detail.
  if (level >= 4 && rng.chance(0.004 * level * era * unrest)) {
    ol.attempts = (ol.attempts ?? 0) + 1;
    const dies = rng.chance(p?.tier === 'detail' ? 0.12 : p ? 0.3 : 0.45);
    if (dies) { ctx.log('An assassin got through.', '🕯️', 'death'); return ctx.die('Assassinated in office'); }
    ctx.stat('health', -rng.int(0, 15));
    ctx.stat('stress', 15);
    if (o) o.approval = Math.round(clamp(o.approval + 8, 0, 100));
    ctx.log(`Someone tried to kill you. ${p ? 'Your protection officers threw you to the ground and took the bullet\'s path.' : 'You were lucky.'} The country rallied round.`, '🛡️', 'bad');
  }
}

function district(ctx, rng) {
  const { state } = ctx;
  if (!isLegislator(state)) return;
  const o = state.politics.office;
  const ol = state.officeLife;
  const d = DISTRICT[ol.district ?? 'normal'];
  const train = yearNow(state) < 1950;
  if (o) o.approval = Math.round(clamp(o.approval + d.approval, 0, 100));
  ctx.stat('stress', d.stress + (train && ol.district === 'lots' ? 2 : 0));
  if (d.cost) ctx.spend(d.cost, train ? 'Train fares to the district' : 'Travel to the district', { allowDebt: true });
  state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + d.recognition);
  // A constituent at your surgery.
  if (ol.district !== 'little' && rng.chance(0.4)) {
    ctx.prompt({
      type: 'officeLife.constituent', icon: '🏘️', title: cc(state) === 'GB' ? 'At Your Surgery' : 'A Constituent\'s Case',
      text: rng.pick(['A widow\'s pension has been stopped by mistake, and the agency won\'t answer her letters.', 'A family is about to be deported after twenty years here.', 'A factory in town is about to close, and the workers want you at the gates.', 'A veteran has waited two years for a medical appointment.']),
      data: {},
      options: [{ id: 'take', label: '📞 Take up the case personally', hint: 'Time and stress; gratitude' }, { id: 'staff', label: '🗂️ Pass it to your caseworkers' }, { id: 'no', label: '🙅 Not something you can fix' }],
    });
  }
}

function temptations(ctx, rng) {
  const { state } = ctx;
  const o = state.politics?.office;
  if (!o || (OFFICES[o.id]?.level ?? 1) < 2 || !rng.chance(0.12)) return;
  const kind = rng.pick(['perk', 'relative']);
  ctx.prompt({
    type: 'officeLife.temptation', icon: '😈', title: kind === 'perk' ? 'A Perk of Office' : 'A Job for Family',
    text: kind === 'perk' ? 'There\'s an official car, and an official plane, and a family holiday coming up. Nobody checks the logs very closely.' : 'Your nephew needs a job. There\'s a vacancy on your staff, paid from the public purse.',
    data: { kind },
    options: [{ id: 'take', label: kind === 'perk' ? '✈️ Use it' : '🧑‍💼 Hire him', tone: 'danger' }, { id: 'no', label: '🙅 Pay your own way' }],
  });
}

export const OfficeLifeModule = {
  id: 'officeLife',
  order: 33.7,
  init(state) { state.officeLife ??= {}; },
  onAgeUp(ctx) {
    const { state } = ctx;
    const rng = orng(state);
    security(ctx, rng);
    if (!state.character.alive || !state.politics?.office) return;
    district(ctx, rng);
    temptations(ctx, rng);
  },
  actions: {
    /** How much time you spend in your district: little | normal | lots. */
    district(ctx, arg) {
      if (!DISTRICT[arg]) return;
      if (!isLegislator(ctx.state)) return ctx.toast('Only legislators have a district to go home to.', 'warn');
      ctx.state.officeLife.district = arg;
      ctx.toast(DISTRICT[arg].label, 'info');
    },
  },
  resolvers: {
    constituent(ctx, data, optionId) {
      const o = ctx.state.politics?.office;
      if (optionId === 'take') { ctx.stat('stress', 3); if (o) o.approval = Math.round(clamp(o.approval + 2, 0, 100)); ctx.log('You took up the case yourself and won it. They\'ll vote for you as long as they live.', '🏘️', 'good'); }
      else if (optionId === 'staff') ctx.log('Your caseworkers took it on.', '🗂️', 'info');
      else { if (o) o.approval = Math.round(clamp(o.approval - 1, 0, 100)); ctx.log('You told them it wasn\'t something you could fix. They told their neighbours.', '🏘️', 'warn'); }
    },
    temptation(ctx, data, optionId) {
      const { state } = ctx;
      if (optionId !== 'take') return ctx.log('You paid your own way.', '🙅', 'info');
      state.officeLife.perks = (state.officeLife.perks ?? 0) + 1;
      // Where officials are rarely caught, it's how things are done; elsewhere a reporter finds out.
      const caught = orng(state).chance(clamp(0.45 - corruptionHere(state) * 0.4, 0.05, 0.45));
      if (caught) {
        state.politics.scandals = (state.politics.scandals ?? 0) + 1;
        const o = state.politics.office;
        if (o) o.approval = Math.round(clamp(o.approval - 8, 0, 100));
        ctx.log(`${data.kind === 'perk' ? 'A reporter got the flight logs.' : 'A reporter found your nephew on the payroll.'} ${watchdogHere(state)[0].toUpperCase()}${watchdogHere(state).slice(1)} opened an inquiry.`, '📰', 'bad');
      } else ctx.log(data.kind === 'perk' ? 'The family flew in style. Nobody asked.' : 'Your nephew started on Monday. Nobody asked.', '😈', 'warn');
    },
  },
};
