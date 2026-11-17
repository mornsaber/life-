/**
 * A colonial soldier's life (the forces themselves: world/ColonialForces.js).
 *
 *   The world wars   the recruiters come to the village: enlist, or carry for the army (the East
 *                    African Carrier Corps lost tens of thousands to disease), or go to France with
 *                    a labour corps; in French West Africa from 1912, conscription ("the blood tax"),
 *                    and men who fled into the bush or across the border. Colonial units fight real
 *                    campaigns: Neuve Chapelle and Kut, Lettow-Vorbeck's war in East Africa, Verdun and
 *                    the Chemin des Dames; Keren, Monte Cassino, Kohima, the Arakan, Provence 1944.
 *   Crises           1857 (the Bengal Army rises at Meerut); Singapore 1915; Thiaroye 1944 (tirailleurs
 *                    shot for demanding their back pay); the Royal Indian Navy mutiny of 1946; the
 *                    Force Publique's mutiny against its Belgian officers in July 1960.
 *   Commissions      a local man could rise only so far: to jemadar and subedar (the Viceroy's
 *                    commission) in India until the King's commission opened to Indians in 1918;
 *                    in British West Africa from the 1940s, East Africa from 1961; never in the Force
 *                    Publique before 1960.
 *   Afterwards       at independence: the new state takes the pension on (British India's armies), or
 *                    France "crystallises" the tirailleurs' pensions at 1959 rates (unfrozen in 2011).
 *
 * svc.colonial = { ruler, force } while serving in a colony's force; the record keeps it.
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { colonialForce, colonialRuler } from '../world/ColonialForces.js';
import { CAMPAIGNS } from './Campaigns.js';
import { warIn } from '../world/War.js';
import { enlist, COMMISSION_BLOCK } from './MilitaryEngine.js';

const sideRng = (state) => new Random((((state.world?.seed ?? 1) * 6007) ^ (state.character.age * 911 + 0x3c1)) >>> 0);
const cc = (state) => state.character.countryId ?? 'US';
const INDIA = ['IN', 'PK', 'BD', 'MM', 'NP'];
const EAST_AF = ['KE', 'UG', 'TZ', 'MW', 'ZM', 'SO'];
const WEST_AF = ['NG', 'GH', 'SL', 'GM'];
const FR_AF = ['SN', 'ML', 'CI', 'GN', 'BF', 'NE', 'BJ', 'MR', 'TG', 'CM', 'TD', 'CF', 'CG', 'GA', 'DJ', 'MG', 'DZ', 'TN', 'MA'];
const INDOCHINA = ['VN', 'LA', 'KH'];

/* ---------------------------------------------------------------- campaigns of colonial units */
const add = (war, list) => { CAMPAIGNS[war] = [...(CAMPAIGNS[war] ?? []), ...list]; };
// The Indian Army joins wherever "IN" fought.
for (const war of Object.values(CAMPAIGNS)) for (const c of war) if (Array.isArray(c.nations) && c.nations.includes('IN')) c.nations = [...new Set([...c.nations, ...INDIA])];
add('ww1', [
  { id: 'neuveChapelle', name: 'Neuve Chapelle', from: 1914, until: 1916, nations: INDIA, branches: ['army'], text: 'The Indian Corps in the trenches of Flanders through the first winter: cold, wet, and a long way from home.' },
  { id: 'kut', name: 'the siege of Kut', from: 1915, until: 1917, nations: INDIA, branches: ['army'], text: 'Besieged on the Tigris for five months; then the long march into captivity.' },
  { id: 'eastAfrica1', name: 'the East African campaign', from: 1914, until: 1919, nations: [...EAST_AF, ...WEST_AF, ...INDIA, 'CD', 'ZA'], branches: ['army'], text: 'Four years chasing von Lettow-Vorbeck\'s askaris through the bush; more men died of fever than of bullets.' },
  { id: 'cameroons', name: 'the Cameroons campaign', from: 1914, until: 1917, nations: [...WEST_AF, 'SN', 'CM'], branches: ['army'], text: 'Through the forests of Kamerun after the German garrisons.' },
  { id: 'tabora', name: 'Tabora', from: 1916, until: 1917, nations: ['CD'], branches: ['army'], text: 'The Force Publique\'s march on Tabora, and the town taken.' },
  { id: 'cheminDesDames', name: 'Verdun and the Chemin des Dames', from: 1916, until: 1918, nations: [...FR_AF, ...INDOCHINA], branches: ['army'], text: 'Thrown at the German lines in the cold of April 1917; the tirailleurs\' losses were terrible.' },
]);
add('ww2', [
  { id: 'keren', name: 'Keren and the East African campaign', from: 1940, until: 1942, nations: [...INDIA, ...EAST_AF, ...WEST_AF, 'CD', 'SD'], branches: ['army'], text: 'The heights at Keren, and Italy\'s East African empire falling.', star: 'Africa Star' },
  { id: 'arakan', name: 'the Arakan', from: 1942, until: 1946, nations: [...WEST_AF, ...EAST_AF, ...INDIA], branches: ['army'], text: 'Chaungs, mangroves and the monsoon: carrying everything on your head through Burma.', star: 'Burma Star' },
  { id: 'singapore', name: 'the fall of Malaya and Singapore', from: 1941, until: 1943, nations: [...INDIA, 'MY', 'SG'], branches: ['army'], text: 'The retreat down the peninsula, and the surrender; then the camps.' },
  { id: 'java', name: 'the defence of Java', from: 1942, until: 1943, nations: ['ID'], branches: ['army'], text: 'The KNIL against the Japanese invasion: nine days, then captivity.' },
  { id: 'france40', name: 'the Battle of France', from: 1940, until: 1941, nations: FR_AF, branches: ['army'], text: 'May and June 1940: and the tirailleurs taken prisoner who were shot rather than held.' },
  { id: 'provence', name: 'the Provence landings', from: 1944, until: 1945, nations: FR_AF, branches: ['army'], text: 'The landings of August 1944 and the liberation of Toulon and Marseille. Months later you were sent home, and white troops took your place on the Rhine.' },
  { id: 'italyCol', name: 'Italy and Monte Cassino', from: 1943, until: 1945, nations: [...FR_AF, ...INDIA], branches: ['army'], text: 'The mountains around Cassino, taken where others had failed.', star: 'Italy Star' },
]);

/* ---------------------------------------------------------------- commissions */
/** The year local men could hold a full commission in the colony's force. */
const OFFICERS_FROM = { IN: 1918, PK: 1918, BD: 1918, MM: 1940, NG: 1942, GH: 1942, SL: 1950, GM: 1960, KE: 1961, UG: 1961, TZ: 1961, MW: 1963, ZM: 1963, CD: 9999, ID: 1930, '*': 1950 };
/** Why a colonial subject can't take a commission here yet, or null. */
export function commissionBlock(state) {
  const f = colonialForce(state);
  if (!f) return null;
  const c = cc(state);
  if ((state.character.citizenships ?? []).includes(f.ruler)) return null;
  const from = OFFICERS_FROM[c] ?? (f.ruler === 'FR' ? 9999 : OFFICERS_FROM['*']);
  if (yearNow(state) >= from) return null;
  return `Commissions in ${f.army} go to ${f.ruler === 'GB' ? 'British' : f.ruler === 'FR' ? 'French' : 'European'} officers${from < 9999 ? ` (until ${from})` : ''}: a local soldier rises through the ranks${INDIA.includes(c) ? ' to jemadar and subedar' : ''}`;
}

COMMISSION_BLOCK.fn = commissionBlock;

/* ---------------------------------------------------------------- the year */
function recruitment(ctx, rng) {
  const { state } = ctx;
  const c = cc(state);
  const f = colonialForce(state);
  const war = warIn(state, c);
  if (!f || !war || !['ww1', 'ww2'].includes(war.id)) return;
  const age = state.character.age;
  if (state.character.gender !== 'male' || age < 17 || age > 40 || state.military.service) return;
  const flags = (state.colonialSoldier ??= {});
  if (flags[`asked_${war.id}`] || !rng.chance(0.5)) return;
  flags[`asked_${war.id}`] = true;
  const french = f.ruler === 'FR';
  const eastAfrica = EAST_AF.includes(c) || c === 'CD';
  ctx.prompt({
    type: 'colonialSoldiers.recruit', icon: '🥁', title: french ? 'The Recruiters' : 'The Recruiting Party',
    text: french
      ? `The commandant de cercle has his quota for ${war.name.replace(/ \(.*/, '')}: every village must send its young men. The chief has put your name forward.`
      : `A recruiting party has come to the district for ${war.name.replace(/ \(.*/, '')}, with drums and promises: pay, a uniform, land after the war.`,
    options: [
      { id: 'enlist', label: `🪖 Join ${f.army}`, hint: 'Soldiering, far from home' },
      ...(eastAfrica && war.id === 'ww1' ? [{ id: 'carrier', label: '📦 Go as a carrier (the Carrier Corps)', hint: 'No rifle; the fevers killed thousands' }] : []),
      ...(!french && INDIA.includes(c) || ['CN'].includes(c) ? [{ id: 'labour', label: '⛏️ Sign on with a labour corps for France', hint: 'Digging behind the lines' }] : []),
      { id: 'refuse', label: french ? '🌳 Slip away into the bush' : '🏠 Stay with your family', hint: french ? 'Your family may pay for it' : 'Not everyone went' },
    ],
    data: { force: f.army, war: war.id },
  });
}

function crises(ctx, rng) {
  const { state } = ctx;
  const svc = state.military.service;
  const c = cc(state);
  const y = yearNow(state);
  if (!svc || !svc.colonial) return;
  const done = (state.colonialSoldier ??= {});
  const crisis = (id, when, prompt) => { if (!done[id] && when) { done[id] = true; ctx.prompt({ type: 'colonialSoldiers.crisis', ...prompt, data: { id } }); } };
  crisis('1857', y === 1857 && INDIA.includes(c), { icon: '🔥', title: 'Meerut, May 1857', text: 'The new cartridges, greased (they say) with cow and pig fat. At Meerut the sepoys have shot their officers and marched on Delhi. Your regiment is restless tonight.', options: [{ id: 'rise', label: '🔥 Rise with them', hint: 'For the old order, and against the Company' }, { id: 'loyal', label: '🛡️ Stay loyal', hint: 'And march against your own' }, { id: 'desert', label: '🌙 Slip away home' }] });
  crisis('1915', y === 1915 && ['SG', 'MY', 'IN'].includes(c) && rng.chance(0.3), { icon: '🔥', title: 'Singapore, February 1915', text: 'Half the 5th Light Infantry have mutinied in Singapore, on a rumour that they were to be sent to fight the Ottoman Sultan, the Caliph.', options: [{ id: 'rise', label: '🔥 Join them' }, { id: 'loyal', label: '🛡️ Stand with your officers' }] });
  crisis('thiaroye', y === 1944 && FR_AF.includes(c), { icon: '💰', title: 'Thiaroye, December 1944', text: 'Home from the war and the German camps, the tirailleurs at Thiaroye camp are owed their back pay and demob money. The officers say it will come later. The men are refusing to move.', options: [{ id: 'stand', label: '✊ Stand with the men for the pay', hint: 'They\'ve sent for the gendarmes' }, { id: 'quiet', label: '🤐 Take the train home and wait' }] });
  crisis('rin1946', y === 1946 && INDIA.includes(c) && svc.branch === 'navy', { icon: '⚓', title: 'Bombay, February 1946', text: 'The ratings of HMIS Talwar have struck over food and insults, and the strike is spreading to every ship in the harbour. They are flying the flags of the Congress and the League together.', options: [{ id: 'rise', label: '✊ Join the strike' }, { id: 'loyal', label: '🛡️ Stay at your post' }] });
  crisis('fp1960', y === 1960 && c === 'CD', { icon: '🔥', title: 'Thysville, July 1960', text: 'Independence is a week old and General Janssens has written on the blackboard: "Before independence = after independence." Not one Congolese officer. The men are turning on their Belgian officers.', options: [{ id: 'rise', label: '🔥 Throw out the Belgian officers', hint: 'The army will be Congolese' }, { id: 'loyal', label: '🛡️ Protect your officers\' families' }] });
}

/** At independence: what a colonial soldier is owed. */
function independence(ctx) {
  const { state } = ctx;
  const c = cc(state);
  const served = state.military.history.filter((h) => h.colonial && h.nation === c);
  const live = state.military.service?.colonial ? [state.military.service] : [];
  if (!served.length && !live.length) return;
  const done = (state.colonialSoldier ??= {});
  if (done.independence || colonialRuler(state, c)) return;
  done.independence = true;
  const ruler = (served[0] ?? live[0]).colonial.ruler;
  if (ruler === 'FR') {
    done.crystallised = yearNow(state);
    for (const p of state.retirement?.pensions ?? []) if (p.source === 'military') p.annual = Math.round(p.annual * 0.3);
    return ctx.log('France has "crystallised" the pensions of its colonial veterans at their old rates: a French veteran of the same war gets several times what you do.', '🧊', 'bad');
  }
  if (ruler === 'GB') return ctx.log(`The new government took on the army, and your service pension with it. The regiment keeps its old colours and its old battle honours.`, '🎖️', 'info');
  return ctx.log('The old colonial army was handed over to the new state. What you were owed, you were told, is now its business.', '📜', 'warn');
}

export const ColonialSoldiersModule = {
  id: 'colonialSoldiers',
  order: 26.5,
  setup(engine) {
    engine.bus.on('military:discharged', ({ ctx, svc }) => {
      const h = ctx?.state.military.history.at(-1);
      if (h && svc?.colonial) h.colonial = svc.colonial;
    });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const rng = sideRng(state);
    const svc = state.military.service;
    // Mark service in a colony's own force (for campaigns, crises and what's owed later).
    if (svc && !svc.colonial) { const f = colonialForce(state, svc.nation ?? cc(state)); if (f && (svc.nation ?? cc(state)) === cc(state)) svc.colonial = { ruler: f.ruler, force: f.army }; }
    recruitment(ctx, rng);
    crises(ctx, rng);
    independence(ctx);
    // Unfrozen at last (2011), for those still alive.
    const done = state.colonialSoldier;
    if (done?.crystallised && !done.thawed && yearNow(state) >= 2011) {
      done.thawed = true;
      for (const p of state.retirement?.pensions ?? []) if (p.source === 'military') p.annual = Math.round(p.annual / 0.3);
      ctx.log('After half a century, France unfroze the colonial veterans\' pensions: yours is now what a French veteran gets.', '🎖️', 'good');
    }
  },
  resolvers: {
    recruit(ctx, data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'enlist') {
        enlist(ctx, { branch: 'army', track: 'enlisted', component: 'active', specialty: 'infantry', conscript: true });
        if (state.military.service) state.military.service.colonial = { ruler: colonialForce(state)?.ruler, force: data.force };
        return undefined;
      }
      if (optionId === 'carrier') {
        ctx.stat('health', -12); ctx.stat('stress', 10);
        if (rng.chance(0.2)) { ctx.stat('health', -40); return ctx.log('You carried loads for the army through the bush. Dysentery and fever went through the column; you nearly didn\'t come back.', '📦', 'bad'); }
        return ctx.log('You carried sixty pounds a day for the army for a year, then walked home, thinner and older.', '📦', 'warn');
      }
      if (optionId === 'labour') { ctx.stat('stress', 6); ctx.earn(Math.round(800), 'Labour corps pay'); return ctx.log('You dug trenches and unloaded ships behind the lines in France for a year: cold such as you had never known.', '⛏️', 'info'); }
      if (rng.chance(0.4)) { ctx.stat('stress', 8); return ctx.log('You stayed out of the recruiters\' way. They took your cousin instead, and the chief fined your father.', '🌳', 'warn'); }
      return ctx.log('You stayed home. Some of those who went never came back.', '🏠', 'info');
    },
    crisis(ctx, data, optionId) {
      const { state, rng } = ctx;
      const svc = state.military.service;
      if (data.id === 'thiaroye') {
        if (optionId === 'stand') {
          if (rng.chance(0.25)) { ctx.stat('health', -30); return ctx.log('At dawn the gendarmes and the troops opened fire on the camp. You were wounded; dozens were killed. Afterwards they said it was a mutiny.', '🕯️', 'bad'); }
          ctx.stat('stress', 12);
          return ctx.log('At dawn the gendarmes opened fire on the camp. You lived. Dozens didn\'t, and they were buried where no one could find them.', '🕯️', 'bad');
        }
        return ctx.log('You took the train home. You heard what happened at the camp the next morning.', '🚂', 'warn');
      }
      if (optionId === 'rise') {
        if (data.id === 'fp1960') { ctx.stat('stress', 8); return ctx.log('The Belgian officers were gone within the week, and Congolese sergeants were made officers overnight. The country fell into crisis around you.', '🔥', 'warn'); }
        if (rng.chance(data.id === '1857' ? 0.5 : 0.35)) {
          if (svc) svc.misconduct = (svc.misconduct ?? 0) + 3;
          ctx.stat('stress', 15);
          return ctx.log(data.id === '1857' ? 'The rising was crushed. Men of your regiment were blown from guns as an example; you escaped into the countryside and lived under another name.' : 'The mutiny was put down within days. Courts-martial followed, and public executions.', '🔥', 'bad');
        }
        return ctx.log('You went with them, and when it was over you were one of the lucky ones: the reprisals passed you by.', '🔥', 'warn');
      }
      if (optionId === 'desert') return ctx.log('You took off your uniform and walked home by night.', '🌙', 'warn');
      ctx.stat('stress', 6);
      return ctx.log('You stood with your officers. Some of your own people will never forgive you; the army remembered it in your favour.', '🛡️', 'info');
    },
  },
};
