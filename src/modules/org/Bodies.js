/**
 * International bodies whose local organizations are units of one whole, not
 * independent employers. A diocese isn't a church of its own: it's a unit of the
 * Catholic Church, with a bishop appointed by the Pope. When a priest serves
 * abroad, the priest serves *in the diocese there* (on loan, "fidei donum", from
 * the home bishop), not in a foreign branch of the home diocese.
 *
 * A body: { name, head, overseas: { title, text(home, unit, country), years } }
 * A career joins a body with `body: '<id>'` on its profession; its org type carries
 * `body: '<id>'` too, so organizations show what they're part of.
 */
import { REGIONS } from '../life/Regions.js';
import { getProfession } from '../career/JobTrees.js';
import { attachOrg, orgOf } from './Organizations.js';

import { dioceseName, anglicanDioceseName, ANGLICAN_PROVINCES } from '../community/Dioceses.js';

export { dioceseName };

export const BODIES = {
  catholic: {
    name: 'the Catholic Church', head: 'the Pope (the Holy See)',
    unitName: (countryId, city, size) => dioceseName(countryId, city, size === 'enterprise' || size === 'mega'),
    overseas: {
      title: 'A Call to Serve Abroad',
      text: (home, unit, country) => `The Church in ${country} is short of priests. Your bishop has agreed to lend you to ${unit} for three years as a fidei donum priest: you serve there under its bishop, then come home to ${home}.`,
      accept: 'Go as a fidei donum priest',
    },
  },
  anglican: {
    name: 'the Anglican Communion', head: 'the Archbishop of Canterbury (first among equals)',
    unitName: (countryId, city, size) => anglicanDioceseName(countryId, city, size === 'enterprise' || size === 'mega'),
    // A companion-link loan only goes to another Anglican province.
    countries: ANGLICAN_PROVINCES,
    overseas: {
      title: 'A Companion-Diocese Link',
      text: (home, unit, country) => `${home} has a companion link with ${unit} in ${country}. Your bishop asks whether you would go for three years as a mission partner, licensed by the bishop there, then come home.`,
      accept: 'Go as a mission partner',
    },
  },
};

/** The international body a job belongs to, if any. */
export function bodyOfJob(job) {
  const id = job && getProfession(job.professionId)?.body;
  return id ? { id, ...BODIES[id] } : null;
}

/**
 * You now serve where you live: the employer becomes the local unit of the same body
 * (the diocese there), and you join its organization.
 */
export function joinLocalUnit(ctx) {
  const { state } = ctx;
  const job = state.career.job;
  const body = bodyOfJob(job);
  if (!body) return false;
  const region = REGIONS[state.character.regionId];
  if (!region) return false;
  const name = body.unitName(state.character.countryId ?? 'US', region.name, job.employer.size);
  if (name === job.employer.name && orgOf(state, job.employer)?.regionId === region.id) return false;
  const from = job.employer.name;
  job.employer.name = name;
  job.employer.stateId = region.state;
  attachOrg(state, job.employer, getProfession(job.professionId), region.id);
  job.supervisorId = null;
  ctx.log(`You left ${from} and now serve in ${name}, still within ${body.name}.`, '✝️', 'info');
  return true;
}
