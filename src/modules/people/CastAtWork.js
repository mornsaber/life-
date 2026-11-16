/**
 * The people around you live the same working world you do (career/CompanyLife.js,
 * Advancement.js, Ministries.js, Boardroom.js, EraPay.js), told from the outside:
 *
 *   Their firm     bought, merged, or gone under (and their job with it).
 *   A transfer     your spouse is offered the head office in another city: go with them,
 *                  live apart in the week, or ask them to turn it down.
 *   Partnership    a lawyer or accountant in the family is made partner, or passed over.
 *   The door       a senior public servant leaves for a well-paid private job.
 *   Boards         someone near the top joins a board.
 *   Marriage bar   your wife had to resign her post when you married (where a bar stood).
 *
 * Their own random stream, so none of this reshuffles your life.
 */
import { Random } from '../../core/Random.js';
import { ageOf, living, byId, spouseOf } from './People.js';
import { getProfession } from '../career/JobTrees.js';
import { regionsHere } from '../life/Regions.js';
import { yearNow } from '../world/Eras.js';
import { marriageBar } from '../career/EraPay.js';

const CLOSE = ['mother', 'father', 'sibling', 'child', 'spouse', 'partner', 'fiance', 'friend'];
const PUBLIC = ['municipal', 'state', 'federal', 'public'];
const PARTNERSHIP = ['law', 'accounting', 'consulting', 'architecture', 'finance'];
const PREFIX = ['Consolidated', 'United', 'General', 'National', 'Allied', 'Standard', 'Northern', 'Atlas', 'Meridian', 'Harbour', 'Summit', 'Westbrook'];
const SUFFIX = ['Group', 'Holdings', 'Industries', 'Company'];
const CHARITY = ['the hospital trust', 'a children\'s charity', 'the city orchestra', 'a housing charity', 'the museum trustees'];

const rngOf = (state) => new Random((((state.world?.seed ?? 1) * 7349) ^ (state.character.age * 2971 + 0xca57)) >>> 0);
const gradeOf = (p) => {
  const prof = getProfession(p.career?.professionId);
  return prof?.levels.find((l) => l.id === p.career.levelId)?.grade ?? 1;
};
const isPartner = (p) => ['spouse', 'partner', 'fiance'].includes(p.relation);
const loseJob = (p) => { p.job = null; if (!isPartner(p)) p.income = 0; else p.income = Math.round((p.income ?? 0) * 0.3); };
const their = (p) => (p.gender === 'female' ? 'her' : p.gender === 'male' ? 'his' : 'their');
const corpName = (rng) => `${rng.pick(PREFIX)} ${rng.pick(SUFFIX)}`;

function yearAtWork(ctx, rng, p, said) {
  const { state } = ctx;
  const prof = getProfession(p.career.professionId);
  if (!prof) return;
  const grade = gradeOf(p);
  const name = p.firstName;
  const say = (text, icon, kind) => { if (said.n < 2) { said.n += 1; ctx.log(text, icon, kind); } };
  const y = yearNow(state);

  if (prof.sector === 'private' && y >= 1880) {
    const roll = rng.next();
    if (roll < 0.012) {
      const buyer = corpName(rng);
      say(`${name}'s employer was bought by ${buyer}. New owners, new systems${rng.chance(0.3) ? ', and a round of cuts' : ''}.`, '🤝', 'info');
      if (rng.chance(0.3)) { loseJob(p); say(`${name} lost ${their(p)} job in the cuts after the takeover.`, '📦', 'warn'); }
      return;
    }
    if (roll < 0.018) {
      loseJob(p);
      return say(`${name}'s firm went under. ${name} is out of work.`, '📉', 'bad');
    }
    // A head-office transfer for your spouse: the family's decision.
    if (p.relation === 'spouse' && grade >= 5 && !state.prompts.some((x) => x.type === 'castAtWork.transfer') && rng.chance(0.03)) {
      const cities = regionsHere(state).filter((r) => r.id !== state.character.regionId);
      if (cities.length) {
        const to = rng.pick(cities);
        return ctx.prompt({
          type: 'castAtWork.transfer',
          icon: '🏢',
          title: `${name}'s head office`,
          text: `${name} has been offered a senior post at head office in ${to.name}. It's the next step, and it means moving.`,
          options: [
            { id: 'move', label: `🚚 Move to ${to.name} together`, hint: 'Their career rises; you start again there' },
            { id: 'apart', label: '🚆 Live apart in the week', hint: 'More money, less of each other' },
            { id: 'decline', label: '🏠 Ask them to turn it down', hint: 'You stay put; they may resent it' },
          ],
          data: { personId: p.id, regionId: to.id },
        });
      }
    }
  }
  // Partnership: made up, or passed over (once).
  if (PARTNERSHIP.includes(p.career.professionId) && !p.career.partnership && grade >= 5 && (p.career.inField ?? 0) >= 9 && rng.chance(0.25)) {
    if (rng.chance(0.45)) {
      p.career.partnership = 'partner';
      p.careerIncome = Math.round((p.careerIncome ?? p.income ?? 0) * 1.8);
      if (!isPartner(p) || p.relation === 'spouse') p.income = p.careerIncome;
      return say(`${name} was made a partner at ${their(p)} firm.`, '🥂', 'good');
    }
    p.career.partnership = 'passed';
    return say(`${name} was passed over for partner, and took a post at a rival firm.`, '🚪', 'warn');
  }
  // The revolving door: a senior public servant takes a private job.
  if (PUBLIC.includes(prof.sector) && grade >= 7 && !p.career.revolved && ageOf(state, p) >= 45 && rng.chance(0.03)) {
    p.career.revolved = true;
    p.job = y >= 1900 ? `Director, ${corpName(rng)}` : `Agent, ${corpName(rng)}`;
    p.careerIncome = Math.round((p.careerIncome ?? p.income ?? 0) * 1.7);
    p.income = p.careerIncome;
    return say(`${name} left public service for a well-paid post at a private company. Some called it the revolving door.`, '🚪', 'info');
  }
  // A board seat near the top.
  if (grade >= 8 && !p.career.board && rng.chance(0.03)) {
    p.career.board = rng.chance(0.5) ? rng.pick(CHARITY) : `${corpName(rng)}`;
    say(`${name} joined the board of ${p.career.board}.`, '🪑', 'good');
  }
}

/** Your wife's post under a marriage bar: she resigns when you marry. */
function barredSpouse(ctx, personId) {
  const { state } = ctx;
  const p = byId(state, personId) ?? spouseOf(state);
  if (!p || p.gender !== 'female' || !p.job || !p.career) return;
  const bar = marriageBar(state, getProfession(p.career.professionId));
  if (!bar) return;
  p.job = null;
  p.income = 0;
  ctx.log(`${p.firstName} had to resign from ${bar.what} on your marriage: married women weren't kept on (the bar lasts until ${bar.until}).`, '💍', 'warn');
}

export const CastAtWorkModule = {
  id: 'castAtWork',
  // After the people's own year (people/NpcLives.js, 8.5).
  order: 8.6,
  setup(engine) {
    engine.bus.on('people:married', ({ ctx, personId }) => { if (ctx) barredSpouse(ctx, personId); });
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    const rng = rngOf(state);
    const said = { n: 0 };
    for (const p of living(state)) {
      if (!CLOSE.includes(p.relation) || !p.job || !p.career || (p.relationship ?? 0) < 45) continue;
      const age = ageOf(state, p);
      if (age < 22 || age > 66 || p.retired) continue;
      yearAtWork(ctx, rng, p, said);
    }
  },
  resolvers: {
    transfer(ctx, data, optionId) {
      const { state } = ctx;
      const p = byId(state, data.personId);
      if (!p?.alive || !p.job) return;
      if (optionId === 'move') {
        p.careerIncome = Math.round((p.careerIncome ?? p.income ?? 0) * 1.25);
        p.income = p.careerIncome;
        p.relationship = Math.min(100, (p.relationship ?? 60) + 6);
        ctx.emit('region:relocate', { regionId: data.regionId, reason: `You moved for ${p.firstName}'s new post at head office.` });
        return;
      }
      if (optionId === 'apart') {
        p.careerIncome = Math.round((p.careerIncome ?? p.income ?? 0) * 1.25);
        p.income = p.careerIncome;
        p.relationship = Math.max(0, (p.relationship ?? 60) - 10);
        ctx.stat('happiness', -4);
        return ctx.log(`${p.firstName} took the post and comes home at weekends. The money is better; the house is quieter.`, '🚆', 'info');
      }
      p.relationship = Math.max(0, (p.relationship ?? 60) - 8);
      ctx.log(`${p.firstName} turned the post down for the family. It was a big thing to give up, and you both know it.`, '🏠', 'warn');
    },
  },
};
