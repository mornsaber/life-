/**
 * Skills: what you can actually do, learned by doing it.
 *
 *   Growth   practice from your job, your hobbies, and the hours you set aside to learn
 *            (TimeBudget.js); fast at first, slow near mastery, and a little rust each year
 *            for what you stop using.
 *   Uses     employers hire for the skills a job needs; moments in life test them — first aid
 *            when someone collapses, negotiation at review time, cooking for the in-laws.
 *
 * state.skills = { [id]: 0–100 }
 */
import { Random } from '../../core/Random.js';
import { hobbiesOf } from './Hobbies.js';
import { partnerOf, clampRel } from '../people/People.js';

export const SKILLS = {
  coding: { label: 'Coding', icon: '💻' },
  data: { label: 'Data & spreadsheets', icon: '📊' },
  writing: { label: 'Writing', icon: '✍️' },
  publicSpeaking: { label: 'Public speaking', icon: '🎤' },
  negotiation: { label: 'Negotiation', icon: '🤝' },
  sales: { label: 'Sales', icon: '🛒' },
  leadership: { label: 'Leadership', icon: '🧭' },
  teaching: { label: 'Teaching', icon: '🍎' },
  finance: { label: 'Finance', icon: '💹' },
  law: { label: 'Legal knowledge', icon: '⚖️' },
  medicine: { label: 'Clinical knowledge', icon: '🩺' },
  firstAid: { label: 'First aid', icon: '🩹' },
  mechanics: { label: 'Mechanics', icon: '🔧' },
  carpentry: { label: 'Building & carpentry', icon: '🪚' },
  electrical: { label: 'Electrical', icon: '⚡' },
  driving: { label: 'Driving', icon: '🚗' },
  piloting: { label: 'Flying', icon: '✈️' },
  combat: { label: 'Self-defence & combat', icon: '🥋' },
  marksmanship: { label: 'Marksmanship', icon: '🎯' },
  cooking: { label: 'Cooking', icon: '🍳' },
  design: { label: 'Design', icon: '🎨' },
  music: { label: 'Music', icon: '🎵' },
  athletics: { label: 'Athletics', icon: '🏃' },
  gardening: { label: 'Gardening & farming', icon: '🌱' },
  caregiving: { label: 'Caregiving', icon: '🫶' },
  research: { label: 'Research', icon: '🔬' },
  investigation: { label: 'Investigation', icon: '🔎' },
  persuasion: { label: 'Persuasion', icon: '🗣️' },
  languages: { label: 'Languages', icon: '🌐' },
  survival: { label: 'Survival & outdoors', icon: '🏕️' },
};

/** Which skills a job exercises, matched on its profession id. */
const JOB_SKILLS = [
  [/tech|software|developer|it\b|cyber|intelligence/i, ['coding', 'data']],
  [/law|legal|judge|prosecut|defen|paralegal|court/i, ['law', 'writing', 'negotiation']],
  [/nurs|medic|physician|doctor|clinic|ems|dental|pharm|therap/i, ['medicine', 'firstAid', 'caregiving']],
  [/police|sheriff|trooper|warden|security|corrections|jail|border/i, ['combat', 'marksmanship', 'investigation', 'driving']],
  [/fire/i, ['firstAid', 'athletics', 'survival']],
  [/military|army|navy|marine|airforce|guard/i, ['combat', 'marksmanship', 'leadership', 'survival']],
  [/teach|school|professor|academ|educat/i, ['teaching', 'publicSpeaking', 'writing']],
  [/sales|retail|real ?estate|broker|insurance/i, ['sales', 'persuasion', 'negotiation']],
  [/financ|bank|account|actuar|invest/i, ['finance', 'data']],
  [/truck|transit|driver|courier|railroad|bus/i, ['driving', 'mechanics']],
  [/pilot|aviat|flight/i, ['piloting']],
  [/trade|construct|carpent|plumb|ironwork/i, ['carpentry', 'mechanics']],
  [/electric/i, ['electrical']],
  [/culinary|chef|cook|restaurant/i, ['cooking']],
  [/farm|ranch|garden|landscap/i, ['gardening', 'survival']],
  [/journal|writer|media|correspond|content/i, ['writing', 'investigation']],
  [/design|architect|art/i, ['design']],
  [/music|actor|entertain|showbiz/i, ['music', 'publicSpeaking']],
  [/politic|council|mayor|minister|diplomat/i, ['publicSpeaking', 'persuasion', 'negotiation']],
  [/research|scien|lab|engineer/i, ['research', 'data']],
  [/care|social work|nanny/i, ['caregiving']],
];
const HOBBY_SKILLS = { guitar: 'music', piano: 'music', singing: 'music', painting: 'design', photography: 'design', writing: 'writing', chess: 'data', cooking: 'cooking', running: 'athletics', football: 'athletics', tennis: 'athletics', boxing: 'combat', climbing: 'survival' };

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));
const sideRng = (state, salt) => new Random(((state.world?.seed ?? 1) * 70001 + state.character.age * 577 + salt) >>> 0);

export const skillsOf = (state) => state.skills ?? {};
export const skill = (state, id) => state.skills?.[id] ?? 0;
/** The skills a profession uses. */
export const jobSkills = (professionId = '') => [...new Set(JOB_SKILLS.filter(([re]) => re.test(professionId)).flatMap(([, s]) => s))];

/** Practice: big gains when you're new, slow ones near mastery. */
export function practise(state, id, amount) {
  if (!SKILLS[id] || amount <= 0) return;
  state.skills ??= {};
  const now = state.skills[id] ?? 0;
  state.skills[id] = clamp(now + amount * (1 - now / 115));
}

/** Odds of passing a skill check of a given difficulty (0–100). */
export const skillChance = (state, id, difficulty = 50) => Math.max(0.05, Math.min(0.95, 0.5 + (skill(state, id) - difficulty) / 80));

/** Hiring: the skills the job needs, on average, against a modest bar. */
export function skillHireBonus(state, professionId) {
  const need = jobSkills(professionId);
  if (!need.length || !state.skills) return 0;
  const avg = need.reduce((s, id) => s + skill(state, id), 0) / need.length;
  return (avg - 25) / 500;
}

/** Moments that test what you can do. */
function skillMoments(ctx, rng) {
  const { state } = ctx;
  const job = state.career.job;
  if (job && skill(state, 'negotiation') >= 40 && rng.chance(0.08)) {
    if (rng.chance(skillChance(state, 'negotiation', 55))) {
      job.salary = Math.round(job.salary * 1.04);
      ctx.log('You negotiated a raise at your review: 4% more, and they thanked you for asking.', '🤝', 'good');
    } else ctx.log('You asked for a raise. You did not get one.', '🤝', 'muted');
  }
  if (skill(state, 'firstAid') >= 20 && rng.chance(0.03)) {
    if (rng.chance(skillChance(state, 'firstAid', 45))) {
      ctx.stat('happiness', 8);
      ctx.emit('fame:buzz', { amount: 2 });
      ctx.log('A stranger collapsed in front of you. You knew what to do, and kept them alive until the ambulance came.', '🩹', 'milestone');
    } else ctx.log('A stranger collapsed in front of you. You froze. Someone else stepped in.', '🩹', 'warn');
  }
  const partner = partnerOf(state);
  if (partner && skill(state, 'cooking') >= 50 && rng.chance(0.06)) {
    partner.relationship = clampRel(partner.relationship + 4);
    ctx.log(`You cooked for ${partner.firstName}'s family. Even the hardest critic had seconds.`, '🍳', 'good');
  }
}

export function skillsTick(ctx) {
  const { state } = ctx;
  const age = state.character.age;
  if (age < 6) return;
  const rng = sideRng(state, 0x5c);
  const used = new Set();
  // Your work.
  const job = state.career.job;
  if (job) for (const id of jobSkills(job.professionId)) { practise(state, id, 6); used.add(id); }
  if (state.military?.service) for (const id of ['combat', 'marksmanship', 'leadership', 'survival']) { practise(state, id, 5); used.add(id); }
  if ((job?.grade ?? 0) >= 6) { practise(state, 'leadership', 3); used.add('leadership'); }
  // Your hobbies.
  for (const h of Object.keys(hobbiesOf(state))) if (HOBBY_SKILLS[h]) { practise(state, HOBBY_SKILLS[h], 4); used.add(HOBBY_SKILLS[h]); }
  // Everyday life.
  if (age >= 17 && (state.vehicles?.owned ?? []).length) { practise(state, 'driving', 2); used.add('driving'); }
  if (age >= 14) { practise(state, 'cooking', 1); used.add('cooking'); }
  // Languages: the best foreign language you speak.
  const langs = Object.values(state.migration?.languages ?? {});
  if (langs.length) state.skills.languages = Math.max(skill(state, 'languages'), Math.min(100, Math.max(...langs)));
  // Rust: skills you stopped using fade, slowly.
  for (const id of Object.keys(state.skills ?? {})) if (!used.has(id) && id !== 'languages' && state.skills[id] > 20) state.skills[id] = clamp(state.skills[id] - 0.8);
  if (age >= 16) skillMoments(ctx, rng);
}

export const SkillsModule = {
  id: 'skills',
  order: 88.6,
  onAgeUp: skillsTick,
};
