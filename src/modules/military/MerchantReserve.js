/**
 * The merchant marine as a wartime reserve: in peace it is civilian shipping, in war the
 * nation takes its ships and its seafarers. In the United States, licensed mariners are the
 * sealift pool behind the Military Sealift Command and the Ready Reserve Force; Britain
 * requisitions "Ships Taken Up From Trade", as it did for the Falklands.
 *
 *   Who is on the books  Anyone holding a seafarer's credential who has gone to sea, maritime
 *                        academy graduates, and the academies' own faculty and staff
 *   Peacetime            Inactive — except for maritime academy staff, who hold commissions
 *                        (the U.S. Maritime Service) and wear the uniform at work
 *   Wartime              Called up at any age: an old master is as useful as a young one.
 *                        A war-risk bonus on top of pay, convoys, and ships that are sunk.
 *                        Refusing is a crime; an exemption is for the sick and the very old
 *   At the peace         Stood down with the merchant marine's war medal
 *
 * state.merchantReserve = { mobilized: { war, since, voyages } | null, served: [{ war, from, to, voyages }] }
 */
import { warIn } from '../world/War.js';
import { hasCredential } from '../credentials/LicensingEngine.js';
import { addHonor } from '../../core/State.js';
import { priceLevel, COUNTRIES } from '../world/Countries.js';
import { OFFICES } from '../politics/Offices.js';

const NAMES = {
  US: { pool: 'U.S. Merchant Marine (sealift pool)', staff: 'U.S. Maritime Service', command: 'the Military Sealift Command', medal: 'Merchant Marine Expeditionary Medal', combat: 'Merchant Marine Combat Bar', wound: "Mariner's Medal" },
  GB: { pool: 'Merchant Navy (Ships Taken Up From Trade)', staff: 'Royal Naval Reserve (Merchant Navy)', command: 'the Royal Fleet Auxiliary', medal: 'Merchant Navy War Service Medal', combat: 'Merchant Navy Medal for Meritorious Service', wound: 'Merchant Navy Gallantry Commendation' },
  RU: { pool: 'Morflot mobilisation reserve', staff: 'Maritime Service reserve', command: 'the Navy\'s auxiliary fleet', medal: 'Medal for Merchant Fleet War Service', combat: 'Ushakov Medal', wound: 'Order of Courage' },
  CN: { pool: 'National Defence Transport (merchant fleet)', staff: 'National Defence Transport reserve', command: 'the PLA Navy\'s logistics fleet', medal: 'Merchant Fleet War Service Medal', combat: 'Merchant Fleet Merit Medal', wound: 'Merchant Fleet Wound Medal' },
};
const namesFor = (cc, adj) => NAMES[cc] ?? { pool: `${adj} Merchant Marine Reserve`, staff: `${adj} Maritime Service`, command: 'the navy\'s auxiliary fleet', medal: 'Merchant Marine War Service Medal', combat: 'Merchant Marine Combat Medal', wound: 'Merchant Marine Wound Medal' };

/** Commissioned ranks (navy-style) for academy staff, by post. */
const STAFF_RANK = { instructor: 3, professor: 4, deptHead: 5, trainingShipMaster: 6, commandant: 6, superintendent: 7 };
const NAVY_RANK = { 1: 'Ensign', 2: 'Lieutenant (junior grade)', 3: 'Lieutenant', 4: 'Lieutenant Commander', 5: 'Commander', 6: 'Captain', 7: 'Rear Admiral' };

const isMariner = (job) => job?.professionId === 'merchantMarine';
const isStaff = (job) => job?.professionId === 'maritimeFaculty';
const wentToSea = (state) => isMariner(state.career?.job) || (state.career?.history ?? []).some((h) => h.professionId === 'merchantMarine');
const academyGrad = (state) => state.education?.degrees?.some((d) => d.programId === 'maritimeAcademy');

/** Rank in the reserve: academy posts carry a commission; seafarers rank by their licence. */
function rankOf(state) {
  const job = state.career?.job;
  if (isStaff(job)) { const g = STAFF_RANK[job.levelId] ?? 3; return { title: NAVY_RANK[g], grade: g, officer: true }; }
  const lic = (id) => hasCredential(state, id);
  if (lic('masterLicense') || lic('chiefEngineerLicense')) return { title: 'Captain', grade: 6, officer: true };
  if (lic('chiefMateLicense')) return { title: 'Lieutenant Commander', grade: 4, officer: true };
  if (lic('mateLicense') || lic('engineerLicense')) return { title: 'Lieutenant (junior grade)', grade: 2, officer: true };
  if (academyGrad(state)) return { title: 'Ensign', grade: 1, officer: true };
  if (lic('mmc')) return { title: 'Petty Officer', grade: 5, officer: false };
  return { title: 'Seaman', grade: 3, officer: false };
}
/** Insignia code in the house style: US O/E codes, NATO OF/OR elsewhere. */
export const reserveCode = (r, cc) => (cc === 'US' ? `${r.officer ? 'O' : 'E'}-${r.grade}` : `${r.officer ? 'OF' : 'OR'}-${r.officer ? r.grade : r.grade + 1}`);

/** The player's place in the merchant marine reserve, or null. */
export function reserveStanding(state) {
  if (!state.character?.alive || state.military?.service) return null;
  const job = state.career?.job;
  const credentialed = hasCredential(state, 'mmc') || hasCredential(state, 'twic');
  if (!(isStaff(job) || isMariner(job) || academyGrad(state) || (credentialed && wentToSea(state)))) return null;
  const cc = state.character.countryId ?? 'US';
  const adj = COUNTRIES[cc]?.demonym ?? COUNTRIES[cc]?.name ?? 'National';
  const n = namesFor(cc, adj);
  const rank = rankOf(state);
  return { nation: cc, names: n, name: isStaff(job) ? n.staff : n.pool, rank, code: reserveCode(rank, cc), commissioned: isStaff(job), active: isStaff(job) || Boolean(state.merchantReserve?.mobilized) };
}

const mr = (state) => (state.merchantReserve ??= { mobilized: null, served: [] });
const liveWar = (state, cc) => { const w = warIn(state, cc); return w && w.phase !== 'ceasefire' && (w.intensity >= 2 || w.mobilized) ? w : null; };
const exempt = (state) => state.legal?.incarceration || (state.royal?.reigning && !state.royal.abdicated) || (OFFICES[state.politics?.office?.id]?.level ?? 0) >= 4 || Boolean(state.politics?.ministry);

function standDown(ctx, war) {
  const { state } = ctx;
  const r = mr(state);
  const m = r.mobilized;
  if (!m) return;
  r.mobilized = null;
  r.served = [...r.served, { war: m.war, from: m.since, to: state.character.age, voyages: m.voyages }];
  const s = reserveStanding(state);
  if (m.voyages) addHonor(state, { id: `merchantReserve.war.${m.war}`, source: 'military', name: s?.names.medal ?? 'Merchant Marine War Service Medal', icon: '⚓', prestige: 5, precedence: 40, citation: `For service at sea in ${m.war}.` });
  ctx.log(`${war ? 'The fighting stopped' : 'The war ended'}: your ship was handed back to her owners and you were stood down from ${s?.names.command ?? 'the sealift'} after ${m.voyages} wartime voyage${m.voyages === 1 ? '' : 's'}.`, '🕊️', 'milestone');
}

/** One wartime year at sea. */
function voyageYear(ctx, war) {
  const { state, rng } = ctx;
  const m = mr(state).mobilized;
  const s = reserveStanding(state);
  const job = state.career?.job;
  m.voyages += 1;
  const base = job && (isMariner(job) || isStaff(job)) && job.salary ? job.salary * 0.6 : (s?.rank.officer ? 38000 + s.rank.grade * 12000 : 32000) * priceLevel(state);
  const bonus = Math.round(base * (war.intensity >= 3 ? 1 : 0.6));
  ctx.earn(bonus, `Sealift war-risk pay — ${war.operation}`, { wage: true });
  ctx.stat('stress', 4 + war.intensity * 2);
  if (isMariner(job) && job.ship) job.ship.requisitioned = war.operation;
  const ship = job?.ship?.name ?? `SS ${rng.pick(['Cape Ducato', 'Atlantic Conveyor', 'Mount Whitney', 'Admiral Callaghan', 'Liberty Star', 'Sea Sentinel', 'Cape Henry', 'Northern Endeavour'])}`;
  if (rng.chance(0.03 * war.intensity)) {
    if (rng.chance(0.25)) return ctx.die(`Lost at sea when the ${ship} was sunk — ${war.operation}`);
    ctx.stat('health', -rng.int(12, 28));
    ctx.stat('happiness', -10);
    addHonor(state, { id: `merchantReserve.wound.${m.war}`, source: 'military', name: s?.names.wound ?? "Mariner's Medal", icon: '🎖️', prestige: 7, precedence: 30, citation: `Wounded when the ${ship} was sunk in ${war.operation}.` });
    return ctx.log(`The ${ship} was hit and sank under you. You spent nine hours in a lifeboat before a destroyer picked you up.`, '🌊', 'bad');
  }
  if (m.voyages === 1 || rng.chance(0.2)) addHonor(state, { id: `merchantReserve.combat.${m.war}`, source: 'military', name: s?.names.combat ?? 'Merchant Marine Combat Bar', icon: '⚓', prestige: 5, precedence: 45, citation: `For sailing in convoy through a war zone in ${war.operation}.` });
  ctx.log(rng.pick([
    `Another convoy for ${war.operation}: ammunition and fuel to the front, zig-zagging at night with the lights out. ${war.intensity >= 3 ? 'Two ships in the column did not make it.' : 'Everyone came home.'}`,
    `You sailed with ${s?.names.command ?? 'the sealift'} all year — tanks in the hold, a navy gun crew on the fantail.`,
    `A year of sealift runs for ${war.operation}. The war-risk bonus doubled your pay; the alarms halved your sleep.`,
  ]), '🚢', 'info');
}

export const MerchantReserveModule = {
  id: 'merchantReserve',
  order: 52.6,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.character.alive) return;
    const r = state.merchantReserve;
    const s = reserveStanding(state);
    if (r?.mobilized) {
      const war = s ? liveWar(state, s.nation) : null;
      if (!war || war.operation !== r.mobilized.war || exempt(state)) return standDown(ctx, war);
      return voyageYear(ctx, war);
    }
    if (!s || exempt(state)) return;
    const war = liveWar(state, s.nation);
    if (!war) {
      // Peacetime: inactive, but the academies' staff wear the uniform.
      if (s.commissioned && rng.chance(0.3)) ctx.log(rng.pick([`The summer training cruise: three months at sea with ${rng.int(200, 600)} cadets, and you as a ${s.rank.title} in the ${s.name}.`, `Graduation day: you pinned licences and reserve commissions on a new class of mates and engineers.`, `An inspection from the ${s.name}: the cadet regiment marched, the training ship passed.`]), '⚓', 'info');
      return;
    }
    if (state.prompts.some((p) => p.type === 'merchantReserve.callup')) return;
    // Called up at any age: working seafarers and academy staff first.
    const odds = (isMariner(state.career?.job) || s.commissioned ? 0.55 : 0.3) * (war.mobilized ? 1.4 : 1) * (war.intensity >= 3 ? 1.3 : 1);
    if (!rng.chance(Math.min(0.9, odds))) return;
    ctx.prompt({
      type: 'merchantReserve.callup', icon: '⚓', title: 'The Ships Are Called Up',
      text: `${war.operation} needs ships and the seafarers to sail them. Orders from ${s.names.command}: report aboard as a ${s.rank.title} in the ${s.names.pool}. There is no age limit for mariners.`,
      options: [
        { id: 'sail', label: '🚢 Report aboard', hint: 'War-risk pay; convoys; danger' },
        { id: 'exempt', label: '📄 Ask to be excused', hint: 'Health, age or a vital post ashore' },
        { id: 'refuse', label: '🙅 Refuse to sail', tone: 'danger', hint: 'A crime in wartime' },
      ],
      data: { war: war.operation },
    });
  },
  actions: {
    /** Volunteer for the sealift in wartime without waiting for orders. */
    volunteer(ctx) {
      const { state } = ctx;
      const s = reserveStanding(state);
      const war = s && liveWar(state, s.nation);
      if (!war) return ctx.toast('The merchant marine is only called up in wartime', 'warn');
      if (mr(state).mobilized) return ctx.toast('You are already sailing with the sealift', 'warn');
      mr(state).mobilized = { war: war.operation, since: state.character.age, voyages: 0 };
      return ctx.log(`You volunteered for the sealift: a ${s.rank.title} in the ${s.names.pool} for ${war.operation}.`, '⚓', 'milestone');
    },
  },
  resolvers: {
    callup(ctx, data, optionId) {
      const { state, rng } = ctx;
      const s = reserveStanding(state);
      const war = s && liveWar(state, s.nation);
      if (!war || war.operation !== data?.war) return ctx.log('The call-up was cancelled before you sailed.', '⚓', 'info');
      if (optionId === 'exempt') {
        const age = state.character.age;
        if (state.stats.health < 40 || age >= 78 || rng.chance(age >= 65 ? 0.4 : 0.15)) return ctx.log('Excused: the board sent you home.', '📄', 'good');
        ctx.log('The board refused to excuse you. The ships need every licence they can find.', '📄', 'warn');
      } else if (optionId === 'refuse') {
        ctx.emit('legal:offense', { offenseId: 'draftEvasion', context: 'refusing to sail under wartime orders', discovery: 0.7, evidence: 0.8 });
        return ctx.log('You refused to sail. The maritime authority has your name, and your licences are on the line.', '🙅', 'bad');
      }
      mr(state).mobilized = { war: war.operation, since: state.character.age, voyages: 0 };
      return ctx.log(`You reported aboard: a ${s.rank.title} in the ${s.names.pool}, sailing for ${war.operation}.`, '🚢', 'milestone');
    },
  },
};
