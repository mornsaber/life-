/**
 * Family in uniform. A child, sibling or partner can join the forces: a real rank in their
 * country's service, promotions, deployments — and you, at home, waiting. In a war the call-ups
 * come faster and the deployments are to the fighting. A deployment is a choice about how you
 * carry it (letters and care packages, video calls, not watching the news); now and then the
 * knock on the door comes.
 *
 * person.service = { branch, nation, track, grade, years, term, deployed, tours, wounded }
 */
import { Random, clamp } from '../../core/Random.js';
import { ageOf, living } from './People.js';
import { personDies } from './PeopleEngine.js';
import { branchOf, rankOf } from '../military/MilitaryEngine.js';
import { nationalBranchIds, combatTempo } from '../world/NationalForces.js';
import { warIn } from '../world/War.js';
import { priceLevel } from '../world/Countries.js';

const FAMILY = ['child', 'sibling', 'spouse', 'partner', 'fiance'];
const BRANCH_POOL = ['army', 'army', 'army', 'navy', 'airforce', 'marines'];
const sideRng = (state) => new Random(((state.world?.seed ?? 1) * 15485863 + state.character.age * 733 + 0x5e7) >>> 0);
const homeCc = (state) => state.character.countryId ?? null;

/** The branch a relative can join at home, or null (some countries have no forces to speak of). */
function branchHere(state, rng) {
  const cc = homeCc(state);
  const pool = cc ? BRANCH_POOL.filter((b) => nationalBranchIds(cc).includes(b)) : BRANCH_POOL;
  return pool.length ? rng.pick(pool) : null;
}

export const serviceLabel = (svc) => { const r = rankOf(svc); return `${r.title}, ${branchOf(svc).name}`; };
export const rankCodeOf = (svc) => rankOf(svc).code;
const pay = (state, svc) => Math.round((svc.track === 'officer' ? 55000 + svc.grade * 11000 : 32000 + svc.grade * 5000) * priceLevel(state));

export function enlist(state, p, rng) {
  const branch = branchHere(state, rng);
  if (!branch) return null;
  const officer = ['bachelor', 'master', 'professional', 'doctorate'].includes(p.life?.edu) || Boolean(p.degree);
  p.service = { branch, nation: homeCc(state), track: officer ? 'officer' : 'enlisted', grade: officer ? 0 : 1, years: 0, term: rng.pick([4, 4, 6, 8, 20]), deployed: false, tours: 0 };
  p.job = serviceLabel(p.service);
  p.income = pay(state, p.service);
  return p.service;
}

export function relativeServiceTick(main) {
  const { state } = main;
  if (!state.people) return;
  const rng = sideRng(state);
  const ctx = { ...main, rng };
  const war = warIn(state, homeCc(state) ?? 'US');
  const fighting = war && war.phase !== 'ceasefire';
  for (const p of living(state).filter((x) => FAMILY.includes(x.relation))) {
    const age = ageOf(state, p);
    // Joining up: young, not studying, not working — more often in a war.
    if (!p.service && !p.veteran && age >= 18 && age <= 26 && !p.life?.studying && !/\(part-time\)/.test(p.job ?? 'x') && !p.job && rng.chance(fighting ? 0.12 : 0.03)) {
      if (enlist(state, p, rng)) main.log(`${p.firstName} ${fighting ? 'answered the call-up and' : ''} joined the ${branchOf(p.service).name}.`.replace('  ', ' '), branchOf(p.service).icon ?? '🎖️', 'milestone');
      continue;
    }
    const s = p.service;
    if (!s) continue;
    s.years += 1;
    // Promotion: steady for the first years, slower after.
    const max = (branchOf(s)[s.track]?.length ?? 9) - 1;
    if (s.grade < max && rng.chance(s.years <= 6 ? 0.45 : 0.18)) {
      s.grade += 1;
      p.job = serviceLabel(s);
      p.income = pay(state, s);
      if (rng.chance(0.5)) main.log(`${p.firstName} was promoted to ${rankOf(s).title}.`, '🎖️', 'good');
    }
    // Coming home from a deployment.
    if (s.deployed) {
      s.deployed = false;
      s.tours += 1;
      const danger = fighting ? 0.05 * Math.min(3, war.intensity ?? 1) : 0.004 * combatTempo(homeCc(state));
      if (rng.chance(danger)) {
        p.service = null;
        p.veteran = true;
        main.log(`The knock on the door came. ${p.firstName} was killed on deployment.`, '🕯️', 'bad');
        main.emit('health:trauma', { amount: p.relation === 'child' ? 25 : 15, source: 'a death in service' });
        personDies(main, p, 'killed in action');
        continue;
      }
      if (rng.chance(danger * 3)) { s.wounded = true; main.log(`${p.firstName} was wounded on deployment and flown home. They'll recover — mostly.`, '🩹', 'bad'); main.stat('stress', 8); }
      else main.log(`${p.firstName} came home from deployment.`, '🏠', 'good');
      main.stat('stress', -6);
    }
    // Leaving at the end of the term (an officer often stays longer).
    if (s.years >= s.term && !(fighting && rng.chance(0.7))) {
      main.log(`${p.firstName} left the ${branchOf(s).name} after ${s.years} years as ${/^[AEIOU]/.test(rankOf(s).title) ? 'an' : 'a'} ${rankOf(s).title}.`, '🎖️', 'info');
      p.service = null;
      p.veteran = { rank: rankOf(s).title, years: s.years, branch: branchOf(s).name };
      p.job = null;
      p.income = 0;
      continue;
    }
    // Sent abroad.
    if (rng.chance(fighting ? 0.5 : 0.18 * clamp(combatTempo(homeCc(state)) * 2, 0.4, 1))) {
      s.deployed = true;
      const where = fighting ? `to the war${war.name ? ` (${war.name})` : ''}` : rng.pick(['on a peacekeeping mission', 'to a base overseas', 'on a six-month sea deployment', 'to a training mission abroad']);
      ctx.prompt({ type: 'relativeService.deployed', icon: '🎖️', title: `${p.firstName} Is Deploying`, text: `${p.firstName} (${rankOf(s).title}) is being sent ${where}.${fighting ? ' Every night the news shows where.' : ''}`, data: { personId: p.id, fighting: Boolean(fighting) }, options: [
        { id: 'letters', label: '📦 Letters and care packages every week', hint: 'Closer; you worry more' },
        { id: 'calls', label: '📱 Video calls when they can' },
        { id: 'news', label: '📵 Stop watching the news', hint: 'Protect yourself' },
      ] });
    }
  }
}

export const RelativeServiceResolvers = {
  deployed(ctx, data, optionId) {
    const p = living(ctx.state).find((x) => x.id === data.personId);
    if (!p) return;
    if (optionId === 'letters') { p.relationship = clamp((p.relationship ?? 60) + 8, 0, 100); ctx.stat('stress', data.fighting ? 10 : 5); ctx.spend(Math.round(300 * priceLevel(ctx.state)), 'Care packages'); return ctx.log(`You wrote to ${p.firstName} every week. They read the letters to their whole unit.`, '📦', 'good'); }
    if (optionId === 'calls') { p.relationship = clamp((p.relationship ?? 60) + 4, 0, 100); ctx.stat('stress', data.fighting ? 7 : 3); return ctx.log(`Grainy video calls at strange hours. You learned to read ${p.firstName}'s face.`, '📱', 'info'); }
    ctx.stat('stress', data.fighting ? 3 : 1);
    ctx.log('You stopped watching the news. It helped, a little.', '📵', 'info');
  },
};

export const RelativeServiceModule = { id: 'relativeService', order: 13.2, onAgeUp: relativeServiceTick, resolvers: RelativeServiceResolvers };
