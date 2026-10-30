/**
 * More dockets: the named, open-until-closed cases of probation officers, social workers and child
 * protection (and counsellors), private investigators, journalists and court staff. Each role
 * brings its cases (make), what you can do with one each year (work: raises the case's strength),
 * and how it can end (resolve: returns { result, note, perf, money?, fame?, offense? }).
 *
 * The shared machinery (intake, deadlines, the record, the Cases tab) is Docket.js.
 */
import { OFFENSES } from '../legal/Offenses.js';
import { randomName } from '../../core/State.js';

const person = (rng, gender) => { const n = randomName(rng, gender ?? (rng.chance(0.5) ? 'male' : 'female')); return `${n.firstName} ${n.lastName}`; };
const win = (note, perf = 4, extra = {}) => ({ result: 'win', note, perf, ...extra });
const loss = (note, perf = -4, extra = {}) => ({ result: 'loss', note, perf, ...extra });
const settle = (note, perf = 1, extra = {}) => ({ result: 'settle', note, perf, ...extra });

export const SIMPLE_ROLES = {
  probation: {
    label: 'Supervisees', icon: '⚖️', noun: 'supervisee', intake: [1, 3], patience: 3, strength: '🧭 Chance they make it',
    make(rng) {
      const who = person(rng);
      const offense = rng.pick(['drugPossession', 'dui', 'burglary', 'assault', 'shoplifting', 'domesticAbuse', 'grandTheft']);
      const situation = rng.pick(['lives with a mother who covers for him', 'has a job at a warehouse and a girlfriend who wants him to stay straight', 'is sleeping on a friend\'s sofa', 'has two kids and no car', 'is back with the friends who got him into it']);
      return { title: `${who} — ${OFFENSES[offense].name}`, text: `${who.split(' ')[0]} is on probation for ${OFFENSES[offense].name.toLowerCase()} and ${situation}.`, strength: rng.float(0.2, 0.75), suspect: who };
    },
    work: [
      { id: 'visit', label: '🏠 Unannounced home visit', hint: 'See how they really live', gain: [0.02, 0.12], stress: 2 },
      { id: 'treatment', label: '🏥 Fight for a treatment place', hint: 'The waiting lists are long', gain: [-0.02, 0.2], stress: 2 },
      { id: 'job', label: '💼 Line up a job interview', hint: 'Work keeps people out', gain: [0, 0.15], stress: 1 },
    ],
    resolve: [
      { id: 'discharge', label: '✅ Recommend early discharge', hint: 'If they\'re ready', run: (c, rng) => (rng.chance(c.strength) ? win(`${c.suspect} finished probation and stayed out of trouble. A card came at Christmas.`, 5) : loss(`${c.suspect} was arrested again within months. The judge asked who recommended discharge.`, -5)) },
      { id: 'violate', label: '📝 File a violation', hint: 'Back in front of the judge', run: (c) => settle(`${c.suspect} went back to the judge and served a short sentence.`, 1) },
    ],
    lapse: (c) => `${c.suspect}'s probation simply ran out. Whether it worked, nobody can say.`,
  },
  social: {
    label: 'Families & Clients', icon: '🧸', noun: 'family', intake: [1, 3], patience: 3, strength: '🏡 How safe and stable they are',
    make(rng, state) {
      const family = person(rng).split(' ')[1];
      const cps = state.career.job?.professionId === 'cps';
      const situation = cps
        ? rng.pick(['a seven-year-old with bruises a teacher noticed', 'a baby born with opiates in her system', 'three children left alone for a weekend', 'a teenager who ran from a foster home twice'])
        : rng.pick(['a veteran sleeping in his car', 'a grandmother raising four grandchildren on a pension', 'a young mother leaving a violent partner', 'a man just out of hospital with nowhere to go']);
      return { title: `The ${family} family`, text: `The ${family} case: ${situation}.`, strength: rng.float(0.15, 0.7), suspect: `the ${family}s` };
    },
    work: [
      { id: 'visit', label: '🚗 Home visit', hint: 'The only way to know', gain: [0.02, 0.14], stress: 3 },
      { id: 'services', label: '📞 Connect them to services', hint: 'Housing, treatment, childcare', gain: [0, 0.18], stress: 2 },
      { id: 'court', label: '⚖️ Prepare for the court review', hint: 'Your notes will be read aloud', gain: [0.02, 0.1], stress: 3 },
    ],
    resolve: [
      { id: 'close', label: '✅ Close the case', hint: 'Reunified, housed, stable', run: (c, rng) => (rng.chance(c.strength) ? win(`You closed the case on ${c.suspect}. Six months on, they're still doing well.`, 5) : loss(`You closed the case on ${c.suspect} too soon. It was reopened after a call to the hotline.`, -5, { trauma: 5 })) },
      { id: 'escalate', label: '🚨 Escalate: emergency removal or placement', hint: 'Safe now, hard forever', run: (c) => settle(`${c.suspect} were separated for their safety. It was the right call; it didn't feel like one.`, 2, { trauma: 4 }) },
    ],
    lapse: (c) => `The ${c.suspect} case was transferred to a colleague when your caseload got too heavy.`,
  },
  investigator: {
    label: 'Clients', icon: '🕵️', noun: 'case', intake: [1, 3], patience: 2, strength: '🔎 What you\'ve found',
    make(rng) {
      const client = person(rng);
      const kind = rng.pick([['a cheating spouse', 0.3], ['a missing daughter', 0.15], ['an employee claiming a back injury', 0.35], ['a business partner hiding money', 0.2], ['a witness who vanished before trial', 0.15]]);
      return { title: `${client}: ${kind[0]}`, text: `${client} retained you about ${kind[0]}.`, strength: kind[1] + rng.float(0, 0.2), suspect: client };
    },
    work: [
      { id: 'surveil', label: '🚙 Surveillance', hint: 'Long nights in a car', gain: [0, 0.25], stress: 3 },
      { id: 'records', label: '🗂️ Public records and databases', hint: 'Slow and legal', gain: [0.03, 0.15], stress: 1 },
      { id: 'pretext', label: '📞 Pretext a phone call', hint: 'Fast — and illegal', gain: [0.15, 0.35], stress: 1, offense: { id: 'wireFraud', context: 'pretexting records as a private investigator', discovery: 0.2 } },
    ],
    resolve: [
      { id: 'report', label: '📄 Deliver your report', hint: 'Paid if it holds up', run: (c, rng) => (rng.chance(c.strength) ? win(`Your report for ${c.suspect} held up. The fee was paid and they told their friends.`, 4, { money: 3000 + Math.round(c.strength * 6000) }) : loss(`${c.suspect} paid half and wrote you a one-star review.`, -2, { money: 1200 })) },
      { id: 'drop', label: '🙅 Drop the client', hint: 'Some cases aren\'t worth it', run: (c) => settle(`You returned ${c.suspect}'s retainer.`, 0) },
    ],
    lapse: (c) => `${c.suspect} hired someone else.`,
  },
  journalist: {
    label: 'Stories', icon: '📰', noun: 'story', intake: [1, 2], patience: 2, strength: '🧾 How well it\'s sourced',
    make(rng) {
      const who = person(rng);
      const story = rng.pick(['a council contract that went to the mayor\'s brother-in-law', 'nursing homes falsifying staffing records', 'a police unit with a pattern of planted evidence', 'a charity whose CEO bought a yacht', 'a chemical plant\'s unreported leaks', 'a football club\'s ticket-fraud ring']);
      return { title: gist(story), text: `A tip about ${story}. ${who} says they have documents.`, strength: rng.float(0.1, 0.4), suspect: who };
    },
    work: [
      { id: 'source', label: '🤫 Meet the source again', hint: 'Trust takes time', gain: [0, 0.2], stress: 2 },
      { id: 'docs', label: '📑 Get the documents verified', hint: 'Lawyers and experts', gain: [0.05, 0.2], stress: 2 },
      { id: 'door', label: '🚪 Doorstep them for comment', hint: 'They may slip — or sue', gain: [-0.05, 0.25], stress: 3 },
    ],
    resolve: [
      { id: 'publish', label: '🗞️ Publish', hint: 'Make sure it\'s solid', run: (c, rng) => (rng.chance(c.strength) ? win(`Your story ran on the front page. ${rng.pick(['There was an inquiry.', 'Two people resigned.', 'The police opened an investigation.', 'It was shortlisted for a prize.'])}`, 7, { fame: 6 }) : loss('The story didn\'t hold. A correction, an apology — and a libel claim the paper settled.', -8, { money: -4000 })) },
      { id: 'kill', label: '🗑️ Kill the story', hint: 'Not ready, maybe never', run: () => settle('You spiked the story. It might come back.', 0) },
    ],
    lapse: () => 'A rival paper got the story first.',
  },
  court: {
    label: 'Court Business', icon: '🏛️', noun: 'matter', intake: [1, 3], patience: 1, strength: '📋 How ready it is',
    make(rng, state) {
      const lvl = state.career.job?.levelId;
      const pick = lvl === 'reporter'
        ? rng.pick(['a three-week murder trial transcript, expedited for appeal', 'a deposition in a medical-malpractice case', 'the grand jury minutes'])
        : lvl === 'staffAttorney'
          ? rng.pick(['a research memo on a new sentencing statute', 'a bench memo on a habeas petition', 'drafting a standard jury instruction'])
          : rng.pick(['the jury summons for next month\'s trials', 'a calendar of forty arraignments', 'the courtroom for a high-security trial', 'a backlog of unprocessed fines']);
      return { title: gist(pick), text: `On your desk: ${pick}.`, strength: rng.float(0.3, 0.7) };
    },
    work: [
      { id: 'prep', label: '📚 Work through it', hint: 'Evenings, if you must', gain: [0.08, 0.2], stress: 2 },
      { id: 'help', label: '🤝 Get help from a colleague', hint: 'Owe them one', gain: [0.05, 0.12], stress: 0 },
    ],
    resolve: [
      { id: 'finish', label: '✅ Hand it in', hint: 'On time and right', run: (c, rng) => (rng.chance(c.strength) ? win('Done, on time and right. The judge noticed.', 3) : loss('Errors. The judge had to adjourn, and said why in open court.', -3)) },
    ],
    lapse: () => 'The deadline passed. A colleague finished it and made sure everyone knew.',
  },
};

/** One-line case name from text (DocketRecord's gist, local to avoid an import cycle). */
function gist(text) {
  const first = text.split(/(?<=[.:;])\s/)[0].replace(/[.:;]$/, '');
  return first.length > 60 ? `${first.slice(0, 57).replace(/\s\S*$/, '')}…` : first.charAt(0).toUpperCase() + first.slice(1);
}

/** Which simple docket role a job has, if any. */
export function simpleRole(job) {
  if (!job) return null;
  if (job.professionId === 'probation') return 'probation';
  if (['cps', 'socialWork', 'counseling'].includes(job.professionId)) return 'social';
  if (job.professionId === 'privateInvestigator') return 'investigator';
  if (job.professionId === 'journalism' && ['investigative', 'senior', 'reporter', 'columnist'].includes(job.levelId)) return 'journalist';
  if (job.professionId === 'courts' && ['courtClerk', 'senior', 'reporter', 'staffAttorney'].includes(job.levelId)) return 'court';
  return null;
}
