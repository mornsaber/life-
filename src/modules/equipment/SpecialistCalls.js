/**
 * Specialist calls: what the specialised kit is for. A K-9 unit tracks the
 * suspect who ran, the armoured rescue vehicle gets officers to a barricaded
 * gunman, the ladder truck reaches the fourth floor, the heavy rescue cuts a
 * driver out, the helicopter drops water on the ridge before it runs.
 *
 * Every year an agency with specialist categories may catch one of these
 * calls. With the kit in service (and not worn out) the call usually goes
 * well: your performance, the crew's morale, the town's goodwill. Without it
 * the agency waits on mutual aid, and it shows — and the next budget
 * meeting has a reason to buy one.
 *
 * deptEquip[key].calls = { [catId]: { served, missed } }
 */
import { clamp } from '../../core/Random.js';
import { GROUPS } from './EquipmentCatalog.js';
import { contexts, recordOf, needOf, modelQuality } from './Equipment.js';

const S = (use, title, good, bad) => ({ use, title, good, bad });

/** By equipment group and category: what it's used for and how a call goes with or without it. */
export const SPECIALIST = {
  police: {
    k9: S('Tracking suspects who run, finding drugs and searching buildings', 'Suspect on the Run',
      'Your K-9 team tracked the suspect who bailed from a stolen car through three backyards. Arrest made, nobody hurt.',
      'A suspect ran from a traffic stop. With no K-9 of your own, the neighbouring agency\'s dog arrived 50 minutes later — the trail was cold.'),
    armored: S('Barricaded suspects, active shooters and rescues under fire', 'Barricaded Gunman',
      'A man barricaded himself in a house and fired at officers. The armoured rescue vehicle pulled a wounded neighbour out from under fire and the stand-off ended peacefully.',
      'A man barricaded himself in a house and fired at officers. You had nothing armoured to get the wounded neighbour out; it took the state team two hours to arrive.'),
    motors: S('Traffic enforcement, escorts and getting through gridlock', 'Gridlock Pursuit',
      'Traffic was locked solid, but your motor officers threaded through and caught the hit-and-run driver at the next exit.',
      'The hit-and-run driver vanished into gridlock; your patrol cars couldn\'t get through.'),
  },
  airportPolice: {
    k9: S('Sweeping unattended bags and screening cargo', 'Unattended Bag',
      'An unattended bag at the checkpoint: your explosives-detection dog cleared it in four minutes and the terminal stayed open.',
      'An unattended bag at the checkpoint, and no detection dog on shift. The terminal was evacuated for three hours and hundreds of flights were delayed.'),
  },
  federalLE: {
    armored: S('High-risk warrants and hostage rescues', 'High-Risk Warrant',
      'The warrant on a heavily armed suspect went by the book: the armoured vehicle let the team close in safely.',
      'The warrant on a heavily armed suspect was delayed a week waiting for an armoured vehicle from another field office.'),
  },
  borderPatrol: {
    drones: S('Spotting crossings and finding lost migrants in the desert', 'Lost in the Desert',
      'Your surveillance drone spotted a group lost in the desert at 110°F. Agents reached them with water in time.',
      'A group was reported lost in the desert. Without aerial surveillance, agents searched on foot for two days.'),
    atvs: S('Rough country the trucks can\'t reach', 'Into the Canyon',
      'Agents on ATVs and horseback reached an injured hiker deep in a canyon.',
      'An injured hiker deep in a canyon waited hours: your trucks couldn\'t get in.'),
  },
  fire: {
    ladder: S('Rescues from upper floors and fighting fires from above', 'Trapped on the Fourth Floor',
      'Residents were trapped on the fourth floor of a burning building. Your aerial ladder brought out six people.',
      'Residents were trapped on the fourth floor of a burning building. Your ground ladders couldn\'t reach; the mutual-aid ladder arrived late.'),
    rescue: S('Extrications, collapses, trench and confined-space rescues', 'Pinned in the Wreck',
      'A driver was pinned in a crushed car. Your heavy rescue crew cut her out in 14 minutes — inside the golden hour.',
      'A driver was pinned in a crushed car. Without a heavy rescue you waited 40 minutes for the county\'s tools.'),
    brush: S('Grass and wildland fires off the road', 'Grass Fire Running',
      'A grass fire was running toward homes. Your brush trucks drove into the field and held it at the fence line.',
      'A grass fire was running toward homes; your engines couldn\'t leave the road. Two sheds burned before help came.'),
  },
  stateFire: {
    helicopter: S('Initial attack from the air and hoist rescues', 'Smoke on the Ridge',
      'A lightning start on a steep ridge: your helitack crew dropped water within 20 minutes and caught it at two acres.',
      'A lightning start on a steep ridge. With no helicopter of your own the fire ran 800 acres before aircraft arrived.'),
    airtanker: S('Retardant lines ahead of big fires', 'Fire Racing Toward Town',
      'A fire raced toward a town; your contracted air tanker laid a retardant line and the town held.',
      'A fire raced toward a town and no air tanker was free. Crews fell back and homes were lost.'),
    dozer: S('Cutting fireline fast', 'Cutting Line',
      'Your dozer cut a mile of line overnight and the fire stopped at it.',
      'Hand crews cut line all night; without a dozer it wasn\'t enough and the fire jumped.'),
    tender: S('Water where there are no hydrants', 'No Hydrants',
      'Your water tenders shuttled water up the forest road and kept the engines pumping.',
      'The engines ran dry on a forest road with no water tender to refill them.'),
  },
  parks: {
    boats: S('Water rescues and lake patrols', 'Capsized on the Lake',
      'Two kayakers capsized in cold water. Your patrol boat had them out in minutes.',
      'Two kayakers capsized in cold water. Without a boat you waited for the sheriff\'s marine unit — one had hypothermia.'),
  },
  volFire: {
    tanker: S('Water supply where there are no hydrants', 'Barn Fire, No Hydrants',
      'A barn fire miles from any hydrant: your tanker shuttle kept water on it and saved the farmhouse.',
      'A barn fire miles from any hydrant. Without a tanker your engine ran dry; the farmhouse was lost.'),
    brush: S('Grass and wildland fires', 'Field Fire',
      'A field fire jumped the road; your brush truck chased it down.',
      'A field fire jumped the road and your engine couldn\'t follow it into the field.'),
  },
  sar: {
    drones: S('Thermal search from the air', 'Missing Hiker',
      'A hiker was missing overnight. Your thermal drone found him in a ravine before dawn.',
      'A hiker was missing overnight. With no drone, teams searched until the afternoon.'),
    rope: S('Cliff and swift-water rescues', 'Over the Edge',
      'A climber fell onto a ledge. Your rope team lowered and hauled her out.',
      'A climber fell onto a ledge. Without rope gear you waited for a team two counties over.'),
  },
  emergencyOps: {
    boats: S('Flood rescues and resupplying cut-off towns', 'The River Broke Its Banks',
      'The river broke its banks overnight. Your flood rescue boats pulled 40 people off rooftops before dawn.',
      'The river broke its banks overnight. With no flood boats of your own, crews waited for the neighbouring region\'s while people sheltered on rooftops.'),
    generators: S('Power for evacuation centres and incident bases', 'Blackout at the Evacuation Centre',
      'The storm took the power out; your generators kept the evacuation centre lit and warm.',
      'The storm took the power out, and the evacuation centre spent the night in the dark.'),
  },
  usar: {
    k9: S('Finding people buried in collapses', 'Building Collapse',
      'After the collapse your search dog alerted on a void; the crew dug out a survivor.',
      'After the collapse, with no search dog, crews took hours to find the survivor.'),
  },
};

/** How much of a category's standard is in service and in life (0–1), and its average quality. */
function coverage(state, c, catId) {
  const cat = GROUPS[c.group]?.categories?.[catId];
  if (!cat) return { share: 0, quality: 1 };
  const d = recordOf(state, c, { peek: true });
  const live = (d.units[catId] ?? []).filter((u) => !u.renovating && u.age <= (cat.models[u.model]?.life ?? 10));
  const need = Math.max(1, needOf(cat, c));
  const quality = live.length ? live.reduce((s, u) => s + modelQuality(cat, u.model) * (u.used ? 0.9 : 1), 0) / live.length : 1;
  return { share: Math.min(1, live.length / need), quality, count: live.length };
}

/** What this kit is for, and how the calls have gone (for the fleet card). */
export function specialistNote(state, c, catId) {
  const s = SPECIALIST[c.group]?.[catId];
  if (!s) return null;
  const calls = state.deptEquip?.[c.key]?.calls?.[catId];
  return { use: s.use, served: calls?.served ?? 0, missed: calls?.missed ?? 0 };
}

function callFor(ctx, c) {
  const { state, rng } = ctx;
  const table = SPECIALIST[c.group];
  if (!table) return;
  const ids = Object.keys(table).filter((id) => GROUPS[c.group]?.categories?.[id]);
  if (!ids.length || !rng.chance(0.4)) return;
  const catId = rng.pick(ids);
  const s = table[catId];
  const cov = coverage(state, c, catId);
  // Kit in service: usually goes well; better kit, better odds. Without it: mutual aid, late.
  const good = cov.count > 0 && rng.chance(clamp(0.55 + cov.share * 0.3 + (cov.quality - 1) * 0.8, 0.4, 0.95));
  const d = recordOf(state, c);
  const rec = ((d.calls ??= {})[catId] ??= { served: 0, missed: 0 });
  rec[good ? 'served' : 'missed'] += 1;
  const icon = GROUPS[c.group].categories[catId].icon;
  if (c.kind === 'job') {
    const job = state.career.job;
    if (job) job.performance = Math.round(clamp(job.performance + (good ? 4 : -2), 0, 100));
    ctx.stat(good ? 'happiness' : 'stress', good ? 3 : 4);
  } else if (c.member) {
    c.member.xp = (c.member.xp ?? 0) + (good ? 6 : 2);
    if (c.org) {
      c.org.readiness = Math.round(clamp((c.org.readiness ?? 60) + (good ? 2 : -3), 0, 100));
      // Grateful residents give; a bad night brings the levy into question.
      if (good && rng.chance(0.4)) c.org.funds = (c.org.funds ?? 0) + rng.int(2, 8) * 1000;
    }
  }
  const lack = !good && cov.count === 0 && c.manager ? ` (${c.label} has none in service — you can buy one under Fleet & Facilities.)` : '';
  ctx.log(`${s.title}: ${good ? s.good : s.bad}${lack}`, icon, good ? 'good' : 'warn');
}

export const SpecialistCallsModule = {
  id: 'specialistCalls',
  order: 30.96,
  onAgeUp(ctx) {
    for (const c of contexts(ctx.state)) {
      if (c.kind !== 'job' && c.kind !== 'volunteer') continue;
      callFor(ctx, c);
    }
  },
};
