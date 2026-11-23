/**
 * After you: the thirty years that follow a life, told once at its end (and kept, so the story
 * doesn't change when you look again).
 *
 *   Your children   what became of each: marriage, a family, the work they did, how long they lived.
 *   Your business   carried on, sold, or closed: by how well it was doing when you left it.
 *   Your town       what came next on its own clock (TownStory.js): the mill closing, the mall.
 *   Your cause      a movement you led wins on history's date, or fades.
 *   Your club       a title or a relegation you didn't live to see.
 *   The world       the history of the next thirty years, as it came.
 *
 * state.epilogue = { from, to, lines: [{ year, icon, text }] }
 */
import { Random } from '../../core/Random.js';
import { yearNow } from '../world/Eras.js';
import { EVENTS } from '../world/History.js';
import { MILESTONES, dueYear } from '../life/TownStory.js';
import { REGIONS } from '../life/Regions.js';
import { CAUSES, victoryYear } from '../civic/Activism.js';

const SPAN = 30;
const LABEL = {
  ww1: 'The Great War', spanishFlu: 'The influenza pandemic', russianRevolution: 'Revolution in Russia', depression: 'The Great Depression', ww2: 'The Second World War',
  coldWar: 'The Cold War begins', koreanWar: 'War in Korea', vietnamWar: 'War in Vietnam', oilShock: 'The oil shock', sovietCollapse: 'The Soviet Union breaks up',
  dotcom: 'The dot-com bubble bursts', gfc: 'The banks crash', covid: 'A pandemic closes the world', aiWave: 'Thinking machines arrive', marsLanding: 'People walk on Mars', climateTipping: 'The climate tips',
};

export function writeEpilogue(state) {
  const from = yearNow(state);
  const to = from + SPAN;
  const rng = new Random(((state.world?.seed ?? 1) * 92821 + (state.character.birthYear ?? 0)) >>> 0);
  const lines = [];
  // The children.
  const kids = (state.people?.list ?? []).filter((p) => p.alive && p.relation === 'child').slice(0, 5);
  for (const k of kids) {
    const age = state.character.age + (k.ageOffset ?? -25);
    const job = k.job ?? k.career?.title ?? null;
    const married = (k.married || age > 25) && rng.chance(0.75);
    const nKids = married ? rng.int(0, from < 1950 ? 5 : 3) : 0;
    const lived = Math.max(age + 1, Math.round(rng.float(0.8, 1.15) * (from < 1900 ? 62 : from < 1950 ? 70 : 80)));
    const year = from + rng.int(1, 20);
    lines.push({ year, icon: '👪', text: `${k.firstName}${job ? `, a ${String(job).toLowerCase()},` : ''} ${married ? `married${nKids ? ` and had ${nKids === 1 ? 'a child' : `${nKids} children`}` : ''}` : 'never married'}${lived - age <= SPAN ? `, and died at ${lived}` : `, and was still living ${SPAN} years after you`}.` });
  }
  if (!kids.length) lines.push({ year: from + 1, icon: '🕯️', text: 'There were no children. A nephew cleared the house, and kept one photograph.' });
  // The business.
  const biz = state.business?.current;
  if (biz) {
    const strong = (biz.lastYear?.profit ?? 0) > 0;
    const y = from + rng.int(3, 20);
    lines.push({ year: y, icon: '🏪', text: strong ? (rng.chance(0.5) ? `${biz.name} carried on under new hands, and was sold in ${y} for more than you ever made from it.` : `${biz.name} was still trading ${SPAN} years on, your name over the door.`) : `${biz.name} closed in ${y}. A charity shop has the premises now.` });
  }
  // The town's next chapters.
  const regionId = state.character.regionId;
  const seen = state.world?.townStory?.[regionId] ?? {};
  const town = REGIONS[regionId]?.name?.split(',')[0] ?? 'the town';
  for (const m of MILESTONES) {
    if (seen[m.id] || (m.needs && !seen[m.needs] && m.id !== 'regeneration')) continue;
    const due = dueYear(m, regionId, state.character.countryId ?? 'US');
    if (due != null && due > from && due <= to) lines.push({ year: due, icon: m.icon, text: m.text(town, false, state.character.countryId ?? 'US') });
  }
  // The cause.
  const mv = state.civic?.movement;
  if (mv) {
    const won = victoryYear(mv.cause, state.character.countryId ?? 'US');
    lines.push(won && won > from && won <= to
      ? { year: won, icon: '🏆', text: `${mv.name} won what you founded it for: ${(CAUSES[mv.cause]?.name ?? 'the cause').toLowerCase()}. Someone said your name from the platform.` }
      : { year: from + rng.int(5, 15), icon: '🍂', text: `${mv.name} dwindled to a newsletter and an annual dinner, then not even that.` });
  }
  // The club.
  if (state.fandom) { const y = from + rng.int(1, SPAN); lines.push({ year: y, icon: rng.chance(0.4) ? '🏆' : '📉', text: rng.chance(0.4) ? `${state.fandom.club} finally won the title in ${y}. ${kids.length ? 'Your grandchildren said you would have wept.' : 'The old men in your seat said you would have wept.'}` : `${state.fandom.club} went down in ${y}, and came back up three years later.` }); }
  // The world.
  for (const [id, e] of Object.entries(EVENTS)) {
    const at = e.at ?? null;
    if (at && at > from && at <= to && LABEL[id]) lines.push({ year: at, icon: '🌍', text: `${LABEL[id]}.` });
  }
  lines.sort((a, b) => a.year - b.year);
  state.epilogue = { from, to, lines: lines.slice(0, 16) };
  return state.epilogue;
}

export const EpilogueModule = {
  id: 'epilogue',
  order: 99,
  setup(engine) {
    engine.bus.on('life:ended', ({ ctx }) => { if (!ctx.state.epilogue) writeEpilogue(ctx.state); });
  },
};
export const epilogueOf = (state) => state.epilogue ?? null;
