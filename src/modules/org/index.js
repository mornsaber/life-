/**
 * Organizations domain module (`orgs.`): persistent employers and their
 * people (Organizations), vacancies (Vacancies, driven from the career
 * loop), leaving / returning / moving within an employer (Reentry), and
 * supervisors' powers over their named reports (Supervision), and the
 * politics behind public employers (Government).
 */
import { OrganizationsModule } from './Organizations.js';
import { ReentryActions, ReentryResolvers } from './Reentry.js';
import { SupervisionActions } from './Supervision.js';
import { GovernmentActions, politicalTurnover, oversightTick } from './Government.js';
import { npcBusinessesTick } from './Businesses.js';
import { ExecutiveActions, executiveResolvers, refreshExecutiveSearch } from './Executives.js';
import { hire } from '../career/CareerEngine.js';
import { recalcSalary } from '../career/Compensation.js';
import { ensureDepartment } from '../career/ManagementEngine.js';
import { employerAt } from './Reentry.js';

export const OrgModule = {
  ...OrganizationsModule,
  actions: { ...ReentryActions, ...SupervisionActions, ...GovernmentActions, ...ExecutiveActions },
  resolvers: { ...ReentryResolvers, ...executiveResolvers({ hire, recalcSalary, employerAt, ensureDepartment }) },

  onAgeUp(ctx) {
    // Elections and new administrations reach into the agency you work for; your own appointees shape your approval.
    if (ctx.state.career.job) politicalTurnover(ctx, ctx.state.career.job);
    oversightTick(ctx);
    npcBusinessesTick(ctx);
    refreshExecutiveSearch(ctx.state);
  },
};
