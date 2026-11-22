/**
 * The race for a real invention. In the years before history's inventor filed, the idea was
 * "in the air": the parts existed and several people were working on it. You can be one of them.
 *
 *   The race     pick an invention whose moment is near (a window of years before the real
 *                patent). Each year of work costs money and moves you on, faster with smarts.
 *   Winning      finish before the real date and the patent is yours: a strong patent to
 *                license, sell or build a company on, your name in the papers, and history
 *                remembers you instead.
 *   Losing       the real inventor files first. Contest it (an interference case: costly, long
 *                odds unless you were nearly there), sell your notes to them, or let it go.
 *
 * state.realInventions = { racing: { id, progress, since, spent } | null, won: { id: year }, lost: { id: year } }
 */
import { Random } from '../../core/Random.js';
import { priceLevel } from '../world/Countries.js';
import { yearNow } from '../world/Eras.js';
import { inventionsOf, commercialisePrompt } from './Inventions.js';

/** year: when history's inventor filed or showed it; window: how many years before that it could be done. */
export const RACES = {
  stethoscope: { name: 'Stethoscope', icon: '🩺', year: 1816, window: 6, inventor: 'René Laennec', smarts: 55, cost: 1500, work: 2 },
  reaper: { name: 'Mechanical Reaper', icon: '🌾', year: 1834, window: 10, inventor: 'Cyrus McCormick', smarts: 45, cost: 4000, work: 4 },
  revolver: { name: 'Revolving Pistol', icon: '🔫', year: 1836, window: 8, inventor: 'Samuel Colt', smarts: 50, cost: 5000, work: 3 },
  telegraph: { name: 'Electric Telegraph', icon: '📡', year: 1837, window: 8, inventor: 'Cooke and Wheatstone, and Samuel Morse', smarts: 65, cost: 6000, work: 4 },
  rubber: { name: 'Vulcanised Rubber', icon: '🛞', year: 1844, window: 10, inventor: 'Charles Goodyear', smarts: 55, cost: 3000, work: 5 },
  sewingMachine: { name: 'Sewing Machine', icon: '🧵', year: 1846, window: 10, inventor: 'Elias Howe', smarts: 55, cost: 4000, work: 4 },
  safetyPin: { name: 'Safety Pin', icon: '🧷', year: 1849, window: 15, inventor: 'Walter Hunt', smarts: 30, cost: 500, work: 1 },
  bessemer: { name: 'Cheap Steel Process', icon: '🔥', year: 1856, window: 8, inventor: 'Henry Bessemer', smarts: 65, cost: 12000, work: 4 },
  dynamite: { name: 'Dynamite', icon: '🧨', year: 1867, window: 6, inventor: 'Alfred Nobel', smarts: 65, cost: 6000, work: 3, danger: 0.06 },
  typewriter: { name: 'Typewriter', icon: '⌨️', year: 1868, window: 12, inventor: 'Christopher Sholes', smarts: 50, cost: 4000, work: 4 },
  telephone: { name: 'Telephone', icon: '☎️', year: 1876, window: 8, inventor: 'Alexander Graham Bell (Elisha Gray filed the same day)', smarts: 70, cost: 8000, work: 4 },
  phonograph: { name: 'Phonograph', icon: '📯', year: 1877, window: 6, inventor: 'Thomas Edison', smarts: 65, cost: 5000, work: 3 },
  lightBulb: { name: 'Electric Light Bulb', icon: '💡', year: 1879, window: 8, inventor: 'Thomas Edison and Joseph Swan', smarts: 65, cost: 9000, work: 4 },
  motorCar: { name: 'Motor Car', icon: '🚗', year: 1886, window: 10, inventor: 'Karl Benz', smarts: 70, cost: 15000, work: 5 },
  tyre: { name: 'Pneumatic Tyre', icon: '🚲', year: 1888, window: 10, inventor: 'John Boyd Dunlop', smarts: 40, cost: 2000, work: 2 },
  radio: { name: 'Wireless Telegraphy', icon: '📻', year: 1896, window: 8, inventor: 'Guglielmo Marconi', smarts: 75, cost: 10000, work: 4 },
  aircon: { name: 'Air Conditioning', icon: '❄️', year: 1906, window: 8, inventor: 'Willis Carrier', smarts: 65, cost: 8000, work: 4 },
  zip: { name: 'Zip Fastener', icon: '🤐', year: 1913, window: 12, inventor: 'Gideon Sundback', smarts: 45, cost: 3000, work: 3 },
  television: { name: 'Television', icon: '📺', year: 1926, window: 10, inventor: 'John Logie Baird', smarts: 75, cost: 12000, work: 5 },
  jetEngine: { name: 'Jet Engine', icon: '✈️', year: 1930, window: 8, inventor: 'Frank Whittle', smarts: 80, cost: 20000, work: 5 },
  ballpoint: { name: 'Ballpoint Pen', icon: '🖊️', year: 1938, window: 12, inventor: 'László Bíró', smarts: 40, cost: 2500, work: 3 },
  photocopier: { name: 'Photocopier', icon: '📠', year: 1938, window: 10, inventor: 'Chester Carlson', smarts: 70, cost: 6000, work: 5 },
  transistor: { name: 'Transistor', icon: '🔌', year: 1947, window: 6, inventor: 'Bardeen, Brattain and Shockley at Bell Labs', smarts: 85, cost: 25000, work: 4 },
  velcro: { name: 'Hook-and-Loop Fastener', icon: '🧷', year: 1955, window: 15, inventor: 'George de Mestral', smarts: 35, cost: 2000, work: 3 },
  pacemaker: { name: 'Implantable Pacemaker', icon: '❤️', year: 1958, window: 6, inventor: 'Rune Elmqvist and Åke Senning', smarts: 80, cost: 30000, work: 4 },
  instantNoodles: { name: 'Instant Noodles', icon: '🍜', year: 1958, window: 10, inventor: 'Momofuku Ando', smarts: 30, cost: 1500, work: 2 },
  chip: { name: 'Integrated Circuit', icon: '🧮', year: 1959, window: 5, inventor: 'Jack Kilby and Robert Noyce', smarts: 85, cost: 30000, work: 4 },
  laser: { name: 'Laser', icon: '🔦', year: 1960, window: 5, inventor: 'Theodore Maiman', smarts: 85, cost: 25000, work: 3 },
  mouse: { name: 'Computer Mouse', icon: '🖱️', year: 1967, window: 6, inventor: 'Douglas Engelbart', smarts: 70, cost: 8000, work: 3 },
  mobilePhone: { name: 'Handheld Mobile Phone', icon: '📱', year: 1973, window: 6, inventor: 'Martin Cooper at Motorola', smarts: 80, cost: 30000, work: 4 },
  liIon: { name: 'Lithium-Ion Battery', icon: '🔋', year: 1985, window: 8, inventor: 'Akira Yoshino', smarts: 85, cost: 35000, work: 5 },
  web: { name: 'World Wide Web', icon: '🌐', year: 1990, window: 6, inventor: 'Tim Berners-Lee (who never patented it)', smarts: 80, cost: 6000, work: 3 },
  qr: { name: 'Two-Dimensional Barcode', icon: '🔳', year: 1994, window: 8, inventor: 'Masahiro Hara at Denso Wave', smarts: 65, cost: 6000, work: 2 },
};

const local = (state, n) => Math.round(n * priceLevel(state));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 52021 + state.character.age * 3307 + salt) >>> 0);
export const racesOf = (state) => state.realInventions ?? { racing: null, won: {}, lost: {} };
const ensure = (state) => (state.realInventions ??= { racing: null, won: {}, lost: {} });

/** The inventions whose moment is near this year (and not already run by you). */
export function racesOpen(state, y = yearNow(state)) {
  const r = racesOf(state);
  return Object.entries(RACES).filter(([id, x]) => y >= x.year - x.window && y < x.year && !r.won[id] && !r.lost[id]).map(([id, x]) => ({ id, ...x }));
}
/** How far ahead of history you are, as the papers would put it. */
const yearsEarly = (x, y) => x.year - y;

function win(ctx, id, x) {
  const { state } = ctx;
  const r = ensure(state);
  const y = yearNow(state);
  r.racing = null;
  r.won[id] = y;
  const inv = (state.inventions ??= { projects: [], patents: [], founding: null });
  const patent = { id: `real_${id}`, name: x.name, field: 'real', quality: Math.min(98, 80 + yearsEarly(x, y) * 2), grantedAge: state.character.age, expires: state.character.age + 18, status: 'held', royalty: 0, licensee: null, real: id };
  inv.patents.push(patent);
  ctx.stat('happiness', 12);
  ctx.emit('fame:buzz', { amount: 25 });
  ctx.emit('news:story', { tier: 'world', headline: `${state.character.firstName} ${state.character.lastName} patents the ${x.name.toLowerCase()}`, weight: 9, icon: x.icon, you: true });
  ctx.log(`You beat ${x.inventor.split(' (')[0]} to it: the ${x.name.toLowerCase()} is yours, ${yearsEarly(x, y)} year${yearsEarly(x, y) === 1 ? '' : 's'} before history expected it. The patent is granted.`, x.icon, 'milestone');
  commercialisePrompt(ctx, patent);
}

export function realInventionsTick(ctx) {
  const { state } = ctx;
  const r = state.realInventions;
  if (!r?.racing) return;
  const x = RACES[r.racing.id];
  const y = yearNow(state);
  if (!x) { r.racing = null; return; }
  // History arrives: the real inventor files first.
  if (y >= x.year) {
    r.lost[r.racing.id] = y;
    ctx.prompt({
      type: 'realInventions.beaten', icon: '📜', title: `Beaten to the ${x.name}`,
      text: `${x.inventor} got there first. You were ${Math.min(99, r.racing.progress)}% of the way.`,
      options: [
        { id: 'contest', label: '⚖️ Contest the patent', hint: `≈$${local(state, 40000).toLocaleString()} in fees${r.racing.progress >= 80 ? '; your notebooks are a real case' : '; a long shot'}` },
        { id: 'sell', label: '📓 Sell them your notes and drawings', hint: 'A modest sum, and a footnote in the history' },
        { id: 'drop', label: '🤷 Let it go' },
      ],
      data: { id: r.racing.id, progress: r.racing.progress },
    });
    r.racing = null;
    return;
  }
  if (!ctx.spend(local(state, x.cost), `Work on the ${x.name.toLowerCase()}`, { credit: true })) {
    ctx.log(`No money for the ${x.name.toLowerCase()} this year: the work stood still while the others kept on.`, '🔧', 'warn');
    return;
  }
  const rng = sideRng(state, 0x5e1 + y);
  r.racing.spent += local(state, x.cost);
  r.racing.progress += Math.round((100 / x.work) * (0.7 + state.stats.smarts / 200) * rng.float(0.7, 1.25));
  if (x.danger && rng.chance(x.danger)) {
    ctx.stat('health', -25);
    ctx.log(`An explosion in the workshop. You lived; the shed did not.`, '💥', 'bad');
    r.racing.progress = Math.max(0, r.racing.progress - 30);
  }
  if (r.racing.progress >= 100) return win(ctx, r.racing.id, x);
  ctx.log(`The ${x.name.toLowerCase()}: ${Math.min(99, r.racing.progress)}% there. Others are working on it too.`, x.icon, 'info');
}

export const RealInventionsModule = {
  id: 'realInventions',
  order: 51.2,
  onAgeUp(ctx) {
    if (ctx.state.character.age >= 16) realInventionsTick(ctx);
  },
  actions: {
    race(ctx, id) {
      const { state } = ctx;
      const x = RACES[id];
      if (!x || !racesOpen(state).some((o) => o.id === id)) return ctx.toast('Its moment isn\'t now.', 'warn');
      if (state.character.age < 16) return ctx.toast('16+', 'warn');
      if (state.stats.smarts < x.smarts) return ctx.toast(`You'd need more know-how (smarts ${x.smarts}+).`, 'warn');
      const r = ensure(state);
      if (r.racing) return ctx.toast('You are already racing for one.', 'warn');
      r.racing = { id, progress: 0, since: state.character.age, spent: 0 };
      ctx.log(`You set to work on a ${x.name.toLowerCase()}. You are not the only one.`, x.icon, 'good');
    },
    quit(ctx) {
      const r = ensure(ctx.state);
      if (!r.racing) return;
      ctx.log(`You gave up on the ${RACES[r.racing.id].name.toLowerCase()}.`, '📦', 'muted');
      r.lost[r.racing.id] = yearNow(ctx.state);
      r.racing = null;
    },
  },
  resolvers: {
    beaten(ctx, data, optionId) {
      const { state, rng } = ctx;
      const x = RACES[data.id];
      if (!x) return;
      if (optionId === 'drop') return ctx.log(`The ${x.name.toLowerCase()} belongs to ${x.inventor.split(' (')[0]} now. You went back to other work.`, '🤷', 'muted');
      if (optionId === 'sell') {
        const sum = local(state, Math.round(800 * data.progress));
        ctx.earn(sum, `Notes on the ${x.name.toLowerCase()}`);
        return ctx.log(`You sold your notes on the ${x.name.toLowerCase()} for $${sum.toLocaleString()}.`, '📓', 'info');
      }
      ctx.spend(local(state, 40000), 'Patent interference case', { allowDebt: true });
      ctx.stat('stress', 10);
      if (rng.chance(data.progress >= 80 ? 0.35 : 0.08)) {
        const royalty = local(state, Math.round(9000 + data.progress * 300));
        const inv = (state.inventions ??= { projects: [], patents: [], founding: null });
        inv.patents.push({ id: `real_${data.id}`, name: `${x.name} (shared)`, field: 'real', quality: 70, grantedAge: state.character.age, expires: state.character.age + 15, status: 'licensed', royalty, licensee: 'the rival patentee', real: data.id });
        ctx.emit('fame:buzz', { amount: 10 });
        return ctx.log(`The court found your notebooks came first on part of it: a share of the ${x.name.toLowerCase()} patent, about $${royalty.toLocaleString()} a year.`, '⚖️', 'milestone');
      }
      ctx.log(`You lost the interference case over the ${x.name.toLowerCase()}.`, '⚖️', 'bad');
    },
  },
};

export const realPatentsHeld = (state) => inventionsOf(state).patents.filter((p) => p.real);
