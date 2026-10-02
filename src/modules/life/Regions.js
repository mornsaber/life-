/**
 * Where you live drives cost of living, private-sector market pay and
 * public-sector locality pay. Moving costs money and ends a job that can't
 * follow you (remote jobs and federal duty-station transfers can).
 *
 *   col:      cost-of-living multiplier on living expenses
 *   market:   private/municipal pay multiplier
 *   locality: federal locality-pay percentage (GS-style) added to base pay
 */
export const REGIONS = {
  rural: { id: 'rural', name: 'Glacier Valley, MT', icon: '🏔️', type: 'Rural', col: 0.72, market: 0.86, locality: 0.17 },
  smalltown: { id: 'smalltown', name: 'Cedar Falls, IA', icon: '🌽', type: 'Small town', col: 0.82, market: 0.9, locality: 0.17 },
  midcity: { id: 'midcity', name: 'Columbus, OH', icon: '🏙️', type: 'Mid-size city', col: 0.95, market: 0.98, locality: 0.22 },
  sunbelt: { id: 'sunbelt', name: 'Austin, TX', icon: '🌵', type: 'Sun Belt metro', col: 1.05, market: 1.05, locality: 0.21 },
  chicago: { id: 'chicago', name: 'Chicago, IL', icon: '🌬️', type: 'Major metro', col: 1.15, market: 1.12, locality: 0.31 },
  dc: { id: 'dc', name: 'Washington, D.C.', icon: '🏛️', type: 'Capital region', col: 1.3, market: 1.18, locality: 0.33 },
  nyc: { id: 'nyc', name: 'New York City', icon: '🗽', type: 'High-cost metro', col: 1.55, market: 1.3, locality: 0.37 },
  sf: { id: 'sf', name: 'San Francisco Bay Area', icon: '🌉', type: 'High-cost metro', col: 1.65, market: 1.4, locality: 0.46 },
};

export const MOVE_COST = 3500;

export const regionOf = (state) => REGIONS[state.character.regionId] ?? REGIONS.midcity;

export const Relocation = {
  id: 'region',
  order: 4,

  init(state) {
    state.character.regionId ??= 'midcity';
  },

  setup(engine) {
    // Employers with duty stations (park rangers, embassies) relocate you.
    engine.bus.on('region:relocate', ({ ctx, regionId, reason }) => {
      if (!REGIONS[regionId] || ctx.state.character.regionId === regionId) return;
      ctx.state.character.regionId = regionId;
      ctx.log(`${reason} You relocated to ${REGIONS[regionId].name}.`, REGIONS[regionId].icon, 'milestone');
    });
  },

  actions: {
    move(ctx, regionId) {
      const { state } = ctx;
      const region = REGIONS[regionId];
      if (!region || state.character.regionId === regionId) return;
      if (state.character.age < 18) return ctx.toast('You can move out at 18.', 'warn');
      if (!ctx.spend(MOVE_COST, 'Moving costs')) return ctx.toast(`Moving costs $${MOVE_COST.toLocaleString()}.`, 'warn');
      const job = state.career.job;
      if (job && !job.remote) ctx.emit('career:resign', { reason: `Moved to ${region.name}` });
      state.character.regionId = regionId;
      ctx.log(`You packed up and moved to ${region.name}.`, region.icon, 'milestone');
      ctx.toast(`Moved to ${region.name}`, 'good');
      ctx.stat('stress', 6);
    },
  },
};
