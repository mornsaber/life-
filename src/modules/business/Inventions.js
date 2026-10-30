/**
 * Inventions and patents: tinker in the garage, file a patent, then decide
 * what it's for.
 *
 *  - Develop: pick a field; each year costs money and moves the prototype on
 *    (faster and better with smarts). Some never work.
 *  - Patent: file it (a fee, a wait, and an examiner who may say no) — or give
 *    it away as open hardware.
 *  - Commercialise: license it for yearly royalties, sell it outright, or
 *    build a company around it (the next business you start gets the patent).
 *  - Fights: big companies infringe (sue or settle into a licence) and patent
 *    trolls sue you. Patents run 20 years, then anyone can use them.
 *
 * state.inventions = { projects: [...], patents: [...], founding: patentId | null }
 */
import { Random } from '../../core/Random.js';
import { priceLevel } from '../world/Countries.js';

export const FIELDS = {
  kitchen: { label: '🍳 Kitchen gadget', cost: 3000, work: 1, ceiling: 55, smarts: 0, nouns: ['Peeler', 'Spatula', 'Lid', 'Blender Blade', 'Egg Timer'] },
  software: { label: '💻 Software method', cost: 5000, work: 1, ceiling: 70, smarts: 45, nouns: ['Compression Algorithm', 'Search Index', 'Sync Protocol', 'Image Codec'] },
  gadget: { label: '🔌 Consumer device', cost: 9000, work: 2, ceiling: 75, smarts: 40, nouns: ['Charger', 'Earbud', 'Smart Lock', 'Bike Light', 'Thermostat'] },
  green: { label: '🌱 Clean energy', cost: 16000, work: 3, ceiling: 90, smarts: 60, nouns: ['Solar Film', 'Battery Cell', 'Heat Pump Valve', 'Turbine Blade'] },
  medical: { label: '🩺 Medical device', cost: 25000, work: 3, ceiling: 95, smarts: 65, nouns: ['Stent', 'Glucose Sensor', 'Inhaler', 'Surgical Clamp'] },
};
const ADJ = ['Flex', 'Quantum', 'Nimbus', 'Vela', 'Orbit', 'Kestrel', 'Lumen', 'Arc', 'Tidal', 'Halo'];
export const PATENT_YEARS = 20;
export const patentFee = (state) => Math.round(12000 * priceLevel(state));
const local = (state, n) => Math.round(n * priceLevel(state));
const sideRng = (state, salt = 0) => new Random(((state.world?.seed ?? 1) * 40099 + state.character.age * 4211 + salt) >>> 0);
const pending = (state, type) => state.prompts.some((p) => p.type === type);

export const inventionsOf = (state) => state.inventions ?? { projects: [], patents: [], founding: null };
function ensure(state) {
  state.inventions ??= { projects: [], patents: [], founding: null };
  return state.inventions;
}
/** Yearly royalties a licence pays (quality 0–100). */
export const royaltyFor = (state, quality, rng) => local(state, Math.round(quality * quality * 14 * rng.float(0.6, 1.4)));
export const livePatents = (state) => inventionsOf(state).patents.filter((p) => p.status !== 'expired' && p.status !== 'sold' && p.status !== 'open');

export function inventionsTick(ctx) {
  const { state } = ctx;
  const inv = state.inventions;
  if (!inv) return;
  const rng = sideRng(state, 0x1a7);
  const age = state.character.age;

  for (const pr of [...inv.projects]) {
    const f = FIELDS[pr.field];
    if (pr.pendingAt != null) {
      // The examiner's decision.
      if (age - pr.pendingAt < 2) continue;
      inv.projects = inv.projects.filter((x) => x !== pr);
      if (rng.chance(0.55 + pr.quality / 250)) {
        const patent = { id: pr.id, name: pr.name, field: pr.field, quality: pr.quality, grantedAge: age, expires: age + PATENT_YEARS - 2, status: 'held', royalty: 0, licensee: null };
        inv.patents.push(patent);
        ctx.log(`Patent granted: the ${pr.name}. It's yours to use, license or sell until age ${patent.expires}.`, '📜', 'milestone');
        commercialisePrompt(ctx, patent);
      } else ctx.log(`The patent office rejected your ${pr.name} application: prior art. Someone got there first.`, '📜', 'bad');
      continue;
    }
    if (!ctx.spend(local(state, f.cost), `Prototype development — ${pr.name}`)) {
      ctx.log(`You couldn't fund work on the ${pr.name} this year.`, '🔧', 'warn');
      continue;
    }
    pr.spent += local(state, f.cost);
    pr.progress += Math.round((100 / f.work) * (0.6 + state.stats.smarts / 200) * rng.float(0.8, 1.2));
    pr.quality = Math.min(f.ceiling, Math.round(pr.quality + rng.int(8, 20) * (0.5 + state.stats.smarts / 100)));
    if (pr.progress < 100) continue;
    if (rng.chance(0.2 + Math.max(0, f.smarts - state.stats.smarts) / 100)) {
      inv.projects = inv.projects.filter((x) => x !== pr);
      ctx.stat('happiness', -4);
      ctx.log(`The ${pr.name} prototype never worked. Back to the drawing board.`, '💥', 'bad');
      continue;
    }
    pr.done = true;
    ctx.prompt({
      type: 'inventions.prototype', icon: '💡', title: `It Works: the ${pr.name}`,
      text: `Your ${f.label.split(' ').slice(1).join(' ').toLowerCase()} prototype works${pr.quality >= 60 ? ' — and it\'s genuinely better than anything on the market' : ''}. What now?`,
      options: [
        { id: 'patent', label: '📜 File a patent', hint: `≈$${patentFee(state).toLocaleString()} · two years to grant` },
        { id: 'open', label: '🌍 Publish it open for anyone', hint: 'No money; goodwill and a name' },
        { id: 'shelve', label: '📦 Shelve it' },
      ],
      data: { id: pr.id },
    });
  }

  for (const p of inv.patents) {
    if (p.status === 'expired' || p.status === 'sold' || p.status === 'open') continue;
    if (age >= p.expires) {
      p.status = 'expired';
      ctx.log(`Your patent on the ${p.name} expired. Anyone can make it now.`, '📜', 'info');
      continue;
    }
    if (p.status === 'licensed') ctx.earn(p.royalty, `Patent royalties — ${p.name}`);
    // Someone big copies it.
    if (['held', 'company'].includes(p.status) && rng.chance(0.05 + p.quality / 1500) && !pending(state, 'inventions.infringe')) {
      ctx.prompt({
        type: 'inventions.infringe', icon: '⚖️', title: 'They Copied It',
        text: `A household-name manufacturer is selling something remarkably like your ${p.name}.`,
        options: [
          { id: 'sue', label: '⚖️ Sue for infringement', hint: `≈$${local(state, 150000).toLocaleString()} in legal fees; big damages if you win` },
          { id: 'license', label: '🤝 Offer them a licence' },
          { id: 'ignore', label: '🙄 Let it go' },
        ],
        data: { id: p.id },
      });
    }
  }
  // A patent troll: a shell company with a vague patent and a lawyer.
  if ((livePatents(state).length || state.business?.current) && rng.chance(0.03) && !pending(state, 'inventions.troll')) {
    ctx.prompt({
      type: 'inventions.troll', icon: '🧌', title: 'A Patent Troll',
      text: 'A company that makes nothing says your work infringes its patent on "a method of transmitting data". It offers to settle.',
      options: [
        { id: 'settle', label: '💸 Settle', hint: `≈$${local(state, 50000).toLocaleString()}` },
        { id: 'fight', label: '🥊 Fight it', hint: `≈$${local(state, 80000).toLocaleString()} in fees; usually you win` },
      ],
      data: {},
    });
  }
}

function commercialisePrompt(ctx, patent) {
  const { state } = ctx;
  const rng = sideRng(state, 0xc0);
  const royalty = royaltyFor(state, patent.quality, rng);
  const sale = Math.round(royalty * rng.float(4, 7));
  ctx.prompt({
    type: 'inventions.commercialise', icon: '💼', title: `What to Do With the ${patent.name}`,
    text: `Manufacturers are interested. One offers a licence; another wants to buy the patent outright.`,
    options: [
      { id: 'license', label: '📃 License it', hint: `≈$${royalty.toLocaleString()} a year in royalties` },
      { id: 'sell', label: '💰 Sell the patent', hint: `$${sale.toLocaleString()} now` },
      { id: 'company', label: '🚀 Build a company around it', hint: 'Your next business starts with it' },
      { id: 'hold', label: '🗄️ Hold it for now' },
    ],
    data: { id: patent.id, royalty, sale },
  });
}

const patentById = (state, id) => inventionsOf(state).patents.find((p) => p.id === id);

export const InventionsModule = {
  id: 'inventions',
  order: 51,

  setup(engine) {
    // The company you said you'd build: the next business you start owns the patent.
    engine.bus.on('business:started', ({ ctx, biz }) => {
      const inv = ctx.state.inventions;
      const p = inv?.founding && patentById(ctx.state, inv.founding);
      if (!p || !biz) return;
      inv.founding = null;
      p.status = 'company';
      biz.patent = { name: p.name, quality: p.quality };
      biz.quality = Math.min(100, (biz.quality ?? 50) + Math.round(p.quality / 5));
      ctx.log(`${biz.name} launched with your patented ${p.name} at its heart.`, '🚀', 'good');
    });
  },

  onAgeUp(ctx) {
    if (ctx.state.character.age >= 16) inventionsTick(ctx);
  },

  actions: {
    /** arg: a FIELDS id. */
    start(ctx, field) {
      const { state } = ctx;
      const f = FIELDS[field];
      if (!f) return;
      if (state.character.age < 16) return ctx.toast('16+', 'warn');
      if (state.legal?.incarceration) return ctx.toast('Not from inside.', 'warn');
      const inv = ensure(state);
      if (inv.projects.filter((p) => p.pendingAt == null && !p.done).length >= 2) return ctx.toast('Two projects at once is plenty.', 'warn');
      if (state.stats.smarts < f.smarts) return ctx.toast(`That field needs more know-how (smarts ${f.smarts}+).`, 'warn');
      const rng = sideRng(state, inv.projects.length + inv.patents.length + 7);
      const name = `${rng.pick(ADJ)} ${rng.pick(f.nouns)}`;
      inv.projects.push({ id: `inv_${state.character.age}_${inv.projects.length + inv.patents.length}`, name, field, progress: 0, quality: 10, spent: 0, startedAge: state.character.age });
      ctx.log(`You started work on an invention: the ${name}.`, '💡', 'good');
    },
    abandon(ctx, id) {
      const inv = ensure(ctx.state);
      const pr = inv.projects.find((p) => p.id === id && p.pendingAt == null);
      if (!pr) return;
      inv.projects = inv.projects.filter((p) => p !== pr);
      ctx.log(`You gave up on the ${pr.name}.`, '📦', 'muted');
    },
    /** arg: patent id — reopen the licensing/sale talks for a patent you're holding. */
    shop(ctx, id) {
      const p = patentById(ctx.state, id);
      if (!p || p.status !== 'held' || pending(ctx.state, 'inventions.commercialise')) return;
      commercialisePrompt(ctx, p);
    },
  },

  resolvers: {
    prototype(ctx, data, optionId) {
      const { state } = ctx;
      const inv = ensure(state);
      const pr = inv.projects.find((p) => p.id === data.id);
      if (!pr) return;
      if (optionId === 'patent') {
        if (!ctx.spend(patentFee(state), 'Patent application')) return ctx.toast('You can\'t afford the filing fee.', 'warn');
        pr.pendingAt = state.character.age;
        return ctx.log(`You filed a patent on the ${pr.name}. Patent pending.`, '📜', 'info');
      }
      inv.projects = inv.projects.filter((p) => p !== pr);
      if (optionId === 'open') {
        inv.patents.push({ id: pr.id, name: pr.name, field: pr.field, quality: pr.quality, grantedAge: state.character.age, expires: state.character.age, status: 'open', royalty: 0 });
        ctx.stat('happiness', 6);
        ctx.emit('fame:buzz', { amount: Math.round(pr.quality / 10) });
        return ctx.log(`You published the ${pr.name} design for anyone to build. Makers around the world did.`, '🌍', 'good');
      }
      ctx.log(`You put the ${pr.name} in a box in the garage.`, '📦', 'muted');
    },
    commercialise(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = patentById(state, data.id);
      if (!p || p.status !== 'held') return;
      if (optionId === 'license') {
        p.status = 'licensed';
        p.royalty = data.royalty;
        p.licensee = rng.pick(['Halvorsen Industries', 'Kitamura Electric', 'Brandt & Cole', 'Apex Consumer Goods', 'Medisure Devices', 'Northwind Manufacturing']);
        return ctx.log(`You licensed the ${p.name} to ${p.licensee}: about $${p.royalty.toLocaleString()} a year in royalties.`, '📃', 'good');
      }
      if (optionId === 'sell') {
        p.status = 'sold';
        ctx.earn(data.sale, `Sale of patent — ${p.name}`);
        return ctx.log(`You sold the ${p.name} patent for $${data.sale.toLocaleString()}.`, '💰', 'good');
      }
      if (optionId === 'company') {
        ensure(state).founding = p.id;
        return ctx.log(`You decided to build a company around the ${p.name}. Start a business (Business tab) and the patent goes in with you.`, '🚀', 'info');
      }
      ctx.log(`You held on to the ${p.name} patent.`, '🗄️');
    },
    infringe(ctx, data, optionId) {
      const { state, rng } = ctx;
      const p = patentById(state, data.id);
      if (!p) return;
      if (optionId === 'ignore') return ctx.log(`You let the copy of your ${p.name} slide.`, '🙄', 'muted');
      if (optionId === 'license') {
        if (p.status === 'company') return ctx.log('Your company kept the patent to itself.', '🤝');
        p.status = 'licensed';
        p.royalty = royaltyFor(state, p.quality, rng);
        p.licensee = 'the copycat';
        return ctx.log(`The copycat took a licence: about $${p.royalty.toLocaleString()} a year.`, '🤝', 'good');
      }
      ctx.spend(local(state, 150000), 'Patent litigation', { allowDebt: true });
      ctx.stat('stress', 8);
      if (rng.chance(0.4 + p.quality / 300)) {
        const damages = local(state, Math.round(p.quality * rng.int(8000, 20000)));
        ctx.earn(damages, `Patent infringement damages — ${p.name}`);
        return ctx.log(`A jury found they infringed your ${p.name} patent: $${damages.toLocaleString()} in damages.`, '⚖️', 'milestone');
      }
      if (rng.chance(0.35)) { p.status = 'expired'; return ctx.log(`Worse than losing: the court invalidated your ${p.name} patent.`, '⚖️', 'bad'); }
      ctx.log(`You lost the infringement case over the ${p.name}.`, '⚖️', 'bad');
    },
    troll(ctx, _data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'settle') {
        ctx.spend(local(state, 50000), 'Patent troll settlement', { allowDebt: true });
        return ctx.log('You paid the troll to go away. It will be back for someone else.', '🧌', 'warn');
      }
      ctx.spend(local(state, 80000), 'Patent defence', { allowDebt: true });
      if (rng.chance(0.7)) return ctx.log('You fought the troll and won: its patent was thrown out.', '🧌', 'good');
      ctx.spend(local(state, 120000), 'Patent judgment', { allowDebt: true });
      ctx.log('You fought the troll and lost.', '🧌', 'bad');
    },
  },
};
