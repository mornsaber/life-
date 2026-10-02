/**
 * University life around the degree itself: Greek life, clubs, student
 * government, varsity sports, parties, honors college, scholarships, study
 * abroad, academic/disciplinary probation and academic-integrity cases.
 * Runs right after EducationEngine (order 11) and listens to its events:
 * education:enrolled / term / graduated / left.
 *
 * state.campus — see emptyCampus() in Network.js.
 */
import { yearlyCount, bumpYearly } from '../../core/State.js';
import { clamp } from '../../core/Random.js';
import { SCHOOLS, PROGRAMS } from '../education/Catalog.js';
import { annualTuition } from '../education/EducationEngine.js';
import { CLUBS, emptyCampus, onCampus } from './Network.js';
import { moveIntoDorm, leaveDorm, dormTick } from './HousingDorms.js';
import { applyInternship, resolveInternship, offerPrompt, resolveReturnOffer } from './Internships.js';
import {
  joinRotc, quitRotc, rotcTick, leavePipeline, seekNomination, academyPrompt, resolveAcademy, commissionPrompt, resolveCommission,
} from './Rotc.js';

export const GREEK = ['Alpha Phi Kappa', 'Sigma Delta Omega', 'Kappa Theta Rho', 'Delta Gamma Pi', 'Tau Beta Sigma'];
export const SPORTS = ['football', 'basketball', 'soccer', 'track', 'rowing', 'swimming', 'volleyball', 'lacrosse'];
export const ABROAD = ['Madrid', 'Florence', 'Tokyo', 'Cape Town', 'Buenos Aires', 'Copenhagen', 'Seoul', 'Edinburgh'];
const GREEK_DUES = 1500;

const enrolled = (state) => state.education.enrolled;

function strike(ctx, kind, reason) {
  const { state } = ctx;
  const c = state.campus;
  c.conduct += 1;
  ctx.log(`Student conduct board: ${reason}. ${c.conduct >= 3 ? 'You were expelled.' : 'You are on disciplinary probation.'}`, '⚖️', 'bad');
  if (c.conduct >= 3) expel(ctx, kind);
}

function expel(ctx, why) {
  const { state } = ctx;
  if (!enrolled(state)) return;
  const school = SCHOOLS[enrolled(state).schoolId];
  state.education.enrolled = null;
  state.campus.expelledAge = state.character.age;
  ctx.log(`${school.name} expelled you (${why}). It will follow you on future applications.`, '🚫', 'bad');
  ctx.stat('happiness', -15);
  ctx.emit('education:left', { reason: 'expelled' });
}

/** Clears campus-only memberships when you're no longer a student. */
function endCampusLife(ctx, { graduated = false } = {}) {
  const c = ctx.state.campus;
  if (c.greek) c.greekAlumni = true;
  c.greek = null;
  c.clubs = [];
  c.studentGov = null;
  c.sport = null;
  c.probation = 0;
  c.honors = false;
  c.scholarships = c.scholarships.filter((s) => s.id === 'rotc' || s.id === 'academy');
  if (!graduated && (c.rotc || c.academy)) leavePipeline(ctx, 'left school');
  leaveDorm(ctx, graduated ? 'You moved out of the dorms after graduation.' : null);
}

function offerScholarships(ctx, programId, schoolId) {
  const { state } = ctx;
  const c = state.campus;
  const program = PROGRAMS[programId];
  if (!['bachelor', 'associate', 'master'].includes(program.type) || SCHOOLS[schoolId].academy) return;
  const tuition = annualTuition(programId, schoolId, state);
  const gpa = state.education.degrees.at(-1)?.gpa ?? 3.0;
  if (state.stats.smarts >= 80 && gpa >= 3.4 && tuition > 0) {
    const annual = Math.round(tuition * (state.stats.smarts >= 92 ? 0.5 : 0.25));
    c.scholarships.push({ id: 'merit', name: 'Merit scholarship', annual, minGpa: 3.0 });
    ctx.log(`You won a $${annual.toLocaleString()}/yr merit scholarship (keep a 3.0 GPA).`, '🏅', 'good');
  }
  if (program.type === 'bachelor' && state.stats.smarts >= 85 && gpa >= 3.5 && schoolId !== 'online') {
    c.honors = true;
    c.scholarships.push({ id: 'honors', name: 'Honors College scholarship', annual: 4000, minGpa: 3.3 });
    ctx.log('You were invited into the Honors College: smaller seminars, a thesis, and a $4,000/yr scholarship.', '📜', 'good');
  }
}

export const UniversityLife = {
  id: 'campus',
  order: 11,

  init(state) {
    state.campus ??= emptyCampus();
  },

  setup(engine) {
    const { bus } = engine;
    bus.on('education:enrolled', ({ ctx, programId, schoolId }) => {
      const { state } = ctx;
      state.campus.probation = 0;
      offerScholarships(ctx, programId, schoolId);
      if (SCHOOLS[schoolId].academy) academyPrompt(ctx);
      else if (onCampus(state) && state.character.age <= 24 && !state.housing.properties.some((p) => p.use === 'primary')) moveIntoDorm(ctx);
    });
    bus.on('education:term', ({ ctx, yearGpa, gpa }) => {
      const { state } = ctx;
      const c = state.campus;
      if (c.academy) c.academyYears = (c.academyYears ?? 0) + 1;
      if (yearGpa < 2.0) {
        c.probation += 1;
        if (c.probation >= 2) {
          const school = SCHOOLS[enrolled(state).schoolId];
          state.education.enrolled = null;
          ctx.log(`Academic dismissal: a second year below 2.0 ended your time at ${school.name}.`, '📉', 'bad');
          ctx.stat('happiness', -12);
          ctx.emit('education:left', { reason: 'dismissed' });
          return;
        }
        ctx.log(`A ${yearGpa.toFixed(2)} GPA put you on academic probation. Another year like that and you're out.`, '📉', 'warn');
      } else c.probation = 0;
      for (const s of [...c.scholarships]) {
        if (s.minGpa && gpa < s.minGpa) {
          c.scholarships = c.scholarships.filter((x) => x !== s);
          ctx.log(`You lost your ${s.name} (GPA under ${s.minGpa.toFixed(1)}).`, '💸', 'bad');
          if (s.id === 'rotc') leavePipeline(ctx, 'lost the scholarship over grades');
        }
      }
    });
    bus.on('education:graduated', ({ ctx, degree }) => {
      const { state } = ctx;
      const c = state.campus;
      if (c.honors && degree.type === 'bachelor') degree.honorsCollege = true;
      const commission = c.rotc || c.academy;
      endCampusLife(ctx, { graduated: true });
      if (commission) commissionPrompt(ctx);
      else if (c.offers.length) offerPrompt(ctx);
    });
    bus.on('education:left', ({ ctx, reason }) => {
      endCampusLife(ctx);
      ctx.state.campus.offers = [];
      if (reason === 'expelled' || reason === 'dismissed') ctx.state.campus.nomination = false;
    });
  },

  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const c = state.campus;
    if (!enrolled(state)) {
      if (c.housing === 'dorm') leaveDorm(ctx, 'You moved out of the dorms.');
      return;
    }
    dormTick(ctx);
    rotcTick(ctx);
    if (c.greek) {
      ctx.spend(GREEK_DUES, `${c.greek.name} dues`, { allowDebt: true });
      c.greek.years += 1;
      c.resume += 1;
      ctx.stat('happiness', 3);
      if (!c.greek.officer && c.greek.years >= 2 && rng.chance(0.25)) {
        c.greek.officer = true;
        c.resume += 2;
        ctx.log(`Your brothers/sisters elected you chapter president of ${c.greek.name}.`, '🏛️', 'good');
      }
    }
    for (const id of c.clubs) {
      const club = CLUBS[id];
      ctx.stat(club.stat, 1);
      c.resume += 1;
    }
    if (c.studentGov) {
      c.studentGovYears += 1;
      c.resume += c.studentGov === 'president' ? 3 : 1;
    }
    if (c.sport) {
      c.sport.years += 1;
      ctx.stat('fitness', 3);
      ctx.stat('stress', 4);
      c.resume += 1;
      if (rng.chance(0.08)) ctx.emit('health:injury', { conditionId: rng.pick(['backInjury', 'tbi']), severity: rng.int(15, 40) });
    }
    // Campus temptations: a leaked exam during finals.
    if (onCampus(state) && rng.chance(0.08)) {
      ctx.prompt({
        type: 'campus.leakedExam',
        icon: '📝',
        title: 'Finals Week',
        text: 'A classmate is passing around what looks like the stolen final exam.',
        options: [
          { id: 'use', label: '👀 Take a look', tone: 'danger', hint: 'Academic integrity violation if caught' },
          { id: 'report', label: '🚩 Report it to the professor' },
          { id: 'ignore', label: '📚 Study the honest way' },
        ],
      });
    }
  },

  actions: {
    moveIntoDorm: (ctx) => moveIntoDorm(ctx),
    moveOffCampus(ctx) {
      leaveDorm(ctx, 'You moved out of the dorms.');
    },
    rush(ctx) {
      const { state, rng } = ctx;
      const c = state.campus;
      if (!onCampus(state) || c.academy) return ctx.toast('Greek life is for students at a residential campus.', 'warn');
      if (c.greek) return ctx.toast('You are already in a chapter.', 'warn');
      if (yearlyCount(state, 'campus.rush')) return ctx.toast('Rush week is over until next year.', 'warn');
      bumpYearly(state, 'campus.rush');
      if (!rng.chance(clamp(0.35 + (state.stats.looks - 50) / 150 + (state.stats.happiness - 50) / 200, 0.1, 0.9))) {
        return ctx.log("You rushed, but didn't get a bid this year.", '📭', 'warn');
      }
      const name = rng.pick(GREEK);
      ctx.prompt({
        type: 'campus.hazing',
        icon: '🏛️',
        title: `${name} Pledge Week`,
        text: `${name} gave you a bid. On the last night of pledging, the brothers/sisters line the pledges up in the basement with a handle of vodka.`,
        options: [
          { id: 'endure', label: '🥃 Go along with it', tone: 'danger' },
          { id: 'refuse', label: '🙅 Refuse and walk out', hint: 'You lose the bid' },
          { id: 'report', label: '🚩 Report the hazing', hint: 'The chapter gets suspended' },
        ],
        data: { name },
      });
    },
    leaveGreek(ctx) {
      const c = ctx.state.campus;
      if (!c.greek) return;
      ctx.log(`You deactivated from ${c.greek.name}.`, '🏛️');
      c.greek = null;
    },
    /** arg: club id — joins, or leaves if already a member. Max two. */
    club(ctx, id) {
      const { state } = ctx;
      const c = state.campus;
      if (!CLUBS[id] || !enrolled(state)) return;
      if (c.clubs.includes(id)) {
        c.clubs = c.clubs.filter((x) => x !== id);
        return ctx.log(`You quit the ${CLUBS[id].name}.`, CLUBS[id].icon);
      }
      if (c.clubs.length >= 2) return ctx.toast('Two clubs is all your schedule allows.', 'warn');
      c.clubs.push(id);
      ctx.log(`You joined the ${CLUBS[id].name}.`, CLUBS[id].icon);
    },
    runForStudentGov(ctx) {
      const { state, rng } = ctx;
      const c = state.campus;
      if (!enrolled(state) || state.education.enrolled.schoolId === 'online') return ctx.toast('Student government is for on-campus students.', 'warn');
      if (yearlyCount(state, 'campus.election')) return ctx.toast('Elections are once a year.', 'warn');
      if (c.studentGov === 'president') return ctx.toast('You are already student body president.', 'warn');
      bumpYearly(state, 'campus.election');
      const forPresident = c.studentGov === 'senator';
      const chance = clamp((forPresident ? 0.25 : 0.45) + (state.stats.looks - 50) / 200 + (state.stats.smarts - 50) / 300 + (c.greek ? 0.08 : 0) + c.clubs.length * 0.03, 0.05, 0.85);
      if (rng.chance(chance)) {
        c.studentGov = forPresident ? 'president' : 'senator';
        state.politics.recognition = Math.min(100, state.politics.recognition + (forPresident ? 6 : 2));
        ctx.log(forPresident ? 'You were elected student body president!' : 'You won a seat in the student senate.', '🗳️', 'good');
      } else ctx.log(`You lost the student ${forPresident ? 'body president' : 'senate'} race.`, '🗳️', 'warn');
    },
    tryOut(ctx) {
      const { state, rng } = ctx;
      const c = state.campus;
      if (!onCampus(state)) return ctx.toast('Varsity sports are for full-time students on campus.', 'warn');
      if (c.sport) return ctx.toast('You are already on a team.', 'warn');
      if (yearlyCount(state, 'campus.tryout')) return ctx.toast('Tryouts are once a year.', 'warn');
      bumpYearly(state, 'campus.tryout');
      const sport = rng.pick(SPORTS);
      if (state.stats.fitness < 60 || !rng.chance(clamp((state.stats.fitness - 50) / 40, 0.05, 0.9))) return ctx.log(`You got cut from the ${sport} team.`, '🏟️', 'warn');
      c.sport = { name: sport, years: 0, scholarship: false };
      let text = `You made the varsity ${sport} team!`;
      const tuition = annualTuition(enrolled(state).programId, enrolled(state).schoolId, state);
      if (state.stats.fitness >= 80 && tuition > 0 && rng.chance(0.4)) {
        c.sport.scholarship = true;
        c.scholarships.push({ id: 'athletic', name: 'Athletic scholarship', annual: Math.round(tuition * 0.6) });
        text += ' The coach found you an athletic scholarship.';
      }
      ctx.log(text, '🏟️', 'good');
    },
    quitTeam(ctx) {
      const c = ctx.state.campus;
      if (!c.sport) return;
      ctx.log(`You quit the ${c.sport.name} team.`, '🏟️');
      c.sport = null;
      c.scholarships = c.scholarships.filter((s) => s.id !== 'athletic');
    },
    party(ctx) {
      const { state, rng } = ctx;
      if (!enrolled(state)) return ctx.toast('Parties need a campus.', 'warn');
      if (yearlyCount(state, 'campus.party')) return ctx.toast('You already went wild this year.', 'warn');
      bumpYearly(state, 'campus.party');
      ctx.stat('happiness', 6);
      ctx.stat('stress', -8);
      ctx.log(rng.pick(['You threw a legendary toga party.', 'You closed down every bar on campus.', 'You made it to every house party this semester.']), '🎉');
      if (state.character.age < 21 && rng.chance(0.15)) {
        ctx.emit('legal:offense', { offenseId: 'underageDrinking', context: 'campus police broke up a party', caught: true });
        strike(ctx, 'underage drinking', 'cited for underage drinking');
      } else if (rng.chance(0.05)) {
        ctx.stat('health', -8);
        ctx.log('You woke up in the ER with alcohol poisoning.', '🚑', 'bad');
        ctx.emit('health:trauma', { amount: 4, source: 'life' });
      }
    },
    /** Buy or copy a paper. */
    cheat(ctx) {
      const { state, rng } = ctx;
      if (!enrolled(state)) return;
      if (yearlyCount(state, 'campus.cheat')) return ctx.toast('You already took that risk this year.', 'warn');
      bumpYearly(state, 'campus.cheat');
      plagiarism(ctx, rng.chance(0.25 + state.campus.integrity * 0.15));
    },
    studyAbroad(ctx) {
      const { state, rng } = ctx;
      const e = enrolled(state);
      const c = state.campus;
      if (!e || !['bachelor', 'master'].includes(PROGRAMS[e.programId].type) || e.schoolId === 'online' || c.academy) return ctx.toast("Study abroad is for on-campus bachelor's or master's students.", 'warn');
      if (e.yearsAttended < 1) return ctx.toast('After your first year.', 'warn');
      if (e.abroad) return ctx.toast('One semester abroad per degree.', 'warn');
      e.abroad = true;
      const city = rng.pick(ABROAD);
      const cost = 9000;
      const fromCash = Math.max(0, Math.min(cost, Math.floor(state.finances.cash)));
      if (fromCash) ctx.spend(fromCash, 'Study abroad');
      state.finances.loans += cost - fromCash;
      c.abroad.push({ city, age: state.character.age, programId: e.programId });
      c.resume += 2;
      ctx.stat('happiness', 8);
      ctx.stat('smarts', 3);
      let text = `You spent a semester abroad in ${city}.`;
      if (rng.chance(0.4)) {
        ctx.emit('credential:grant', { id: 'languageProficiency', silent: true });
        text += ' You came home fluent.';
      }
      ctx.log(text, '✈️', 'good');
    },
    applyInternship: (ctx, professionId) => applyInternship(ctx, professionId),
    joinRotc: (ctx, branch) => joinRotc(ctx, branch),
    quitRotc: (ctx) => quitRotc(ctx),
    seekNomination: (ctx) => seekNomination(ctx),
  },

  resolvers: {
    internship: resolveInternship,
    returnOffer: resolveReturnOffer,
    academy: resolveAcademy,
    commission: resolveCommission,
    hazing(ctx, data, optionId) {
      const { state, rng } = ctx;
      const c = state.campus;
      if (optionId === 'refuse') return ctx.log(`You walked out of ${data.name}'s pledge night.`, '🙅');
      if (optionId === 'report') {
        ctx.log(`You reported the hazing. The university suspended ${data.name}.`, '🚩', 'good');
        return ctx.stat('happiness', -3);
      }
      ctx.stat('health', -rng.int(3, 10));
      c.greek = { name: data.name, years: 0, officer: false };
      ctx.log(`You survived pledge night and joined ${data.name}.`, '🏛️', 'good');
      if (rng.chance(0.1)) {
        ctx.log(`A pledge was hospitalized. The university investigated ${data.name}.`, '🚨', 'bad');
        c.greek = null;
        strike(ctx, 'hazing', 'participating in hazing');
      }
    },
    leakedExam(ctx, _data, optionId) {
      const { state, rng } = ctx;
      if (optionId === 'use') plagiarism(ctx, rng.chance(0.3 + state.campus.integrity * 0.15), 'the stolen exam');
      else if (optionId === 'report') {
        ctx.log('You reported the leaked exam. The professor rewrote the final overnight.', '🚩', 'good');
        state.campus.resume += 1;
      } else ctx.log('You studied the honest way.', '📚');
    },
  },
};

function plagiarism(ctx, caught, what = 'a purchased essay') {
  const { state } = ctx;
  const c = state.campus;
  if (!caught) {
    state.yearly['campus.gpa'] = (state.yearly['campus.gpa'] ?? 0) + 0.3;
    return ctx.log(`You turned in ${what}. Nobody noticed — this time.`, '🤫', 'warn');
  }
  c.integrity += 1;
  state.yearly['campus.gpa'] = (state.yearly['campus.gpa'] ?? 0) - 0.6;
  if (c.integrity >= 2 || PROGRAMS[enrolled(state)?.programId]?.type === 'professional') {
    ctx.log(`Academic integrity hearing: caught again using ${what}.`, '⚖️', 'bad');
    expel(ctx, 'academic dishonesty');
  } else {
    ctx.log(`Academic integrity hearing: caught using ${what}. You failed the course and got a disciplinary note on your transcript.`, '⚖️', 'bad');
    c.conduct += 1;
    if (c.conduct >= 3) expel(ctx, 'repeated misconduct');
  }
}
