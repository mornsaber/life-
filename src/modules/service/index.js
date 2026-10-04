/**
 * Service beyond a job: national service (AmeriCorps, Peace Corps), state
 * service (Guard state activations, State Defense Forces), federal disaster
 * teams (FEMA reservists, DMATs) and veterans' posts (VFW, American Legion).
 */
import { programTick, joinProgram, completeTerm, ProgramResolvers } from './NationalService.js';
import { stateForcesTick, stateEmergency, joinSdf, leaveSdf, sdfSchool, StateForceResolvers } from './StateForces.js';
import { teamsTick, joinTeam, leaveTeam, localDisaster, TeamResolvers, TEAMS } from './DisasterTeams.js';
import { postsTick, PostActions, PostResolvers, POSTS } from './VeteranPosts.js';

export const ServiceModule = {
  id: 'service',
  order: 41,

  init(state) {
    state.service ??= {};
    const s = state.service;
    s.program ??= null;
    s.alumni ??= [];
    s.nceUntil ??= 0;
    s.sdf ??= null;
    s.teams ??= {};
    for (const id of Object.keys(TEAMS)) s.teams[id] ??= null;
    s.posts ??= {};
    for (const id of Object.keys(POSTS)) s.posts[id] ??= null;
    s.history ??= [];
  },

  setup(engine) {
    engine.bus.on('disaster:struck', ({ ctx, disaster }) => {
      stateEmergency(ctx, 'disaster', { name: disaster.name, severity: disaster.severity });
      localDisaster(ctx, disaster);
    });
    engine.bus.on('legal:incarcerated', ({ ctx }) => {
      if (ctx.state.service.program) completeTerm(ctx, false);
      if (ctx.state.service.sdf) leaveSdf(ctx, 'Discharged during incarceration');
    });
  },

  onAgeUp(ctx) {
    programTick(ctx);
    stateForcesTick(ctx);
    teamsTick(ctx);
    postsTick(ctx);
  },

  actions: {
    joinProgram,
    quitProgram(ctx) {
      if (ctx.state.service.program) completeTerm(ctx, false);
    },
    joinSdf,
    sdfSchool,
    leaveSdf: (ctx) => leaveSdf(ctx, 'Resigned'),
    joinTeam,
    leaveTeam: (ctx, id) => leaveTeam(ctx, id, 'Resigned'),
    ...PostActions,
  },

  resolvers: {
    ...ProgramResolvers,
    ...StateForceResolvers,
    ...TeamResolvers,
    ...PostResolvers,
  },
};
