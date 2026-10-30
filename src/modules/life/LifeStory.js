/**
 * What the obituary says: a headline from the life you led, and the parts of it worth a line —
 * years inside, the best friend, the hobby you got good at, how the children turned out.
 */
import { HOBBIES, tierOf } from './Hobbies.js';
import { bestFriend, friendGroupsOf } from '../people/FriendGroups.js';
import { livingChildren, childrenOf } from '../people/People.js';

/** The headline, from the most newsworthy thing about the life. */
export function obituaryHeadline(state, { officeName, peakJob, topMil, militaryName, famous }) {
  const c = state.character;
  const age = c.age;
  const r = state.royal;
  if (r?.reigning) return `${c.firstName}, monarch, dies at ${age}`;
  if (officeName) return `Former ${officeName} dies at ${age}`;
  if (state.legal?.incarceration) return `${c.firstName} ${c.lastName} dies in prison at ${age}`;
  if (state.legal?.record?.some((x) => ['accountingFraud', 'ponziScheme', 'sanctionsEvasion', 'securitiesFraud'].includes(x.offenseId))) return `Disgraced financier ${c.firstName} ${c.lastName} dies at ${age}`;
  if (state.honors?.some((h) => h.id === 'moh')) return `Medal of Honor recipient dies at ${age}`;
  const elite = Object.entries(state.hobbies ?? {}).find(([, h]) => h.skill >= 90);
  if (famous) return `${c.firstName} ${c.lastName}, ${peakJob?.title ? peakJob.title.toLowerCase() : 'public figure'}, dies at ${age}`;
  if (topMil && /O-[7-9]|O-10|OF-[6-9]/.test(topMil.rankCode ?? '')) return `${topMil.rankTitle} ${c.lastName}, ${militaryName}, dies at ${age}`;
  if (peakJob?.peakGrade >= 9) return `${peakJob.title} of ${peakJob.employerName ?? 'the company'} dies at ${age}`;
  if (state.legal?.yearsInside >= 3) return `${c.firstName} ${c.lastName}, who rebuilt a life after prison, dies at ${age}`;
  if (elite) return `${HOBBIES[elite[0]].label} star ${c.firstName} ${c.lastName} dies at ${age}`;
  if (topMil) return `${militaryName} veteran ${c.firstName} ${c.lastName} dies at ${age}`;
  if (peakJob) return `${c.firstName} ${c.lastName}, ${peakJob.title.toLowerCase()}, dies at ${age}`;
  return `${c.firstName} ${c.lastName} dies at ${age}`;
}

/** Extra lines for the death screen's facts. */
export function lifeStoryFacts(state) {
  const facts = [];
  const inside = state.legal?.yearsInside ?? 0;
  if (inside || state.legal?.incarceration) facts.push(['Years inside', state.legal?.incarceration ? `${inside + (state.legal.incarceration.served ?? 0)}, and never came home` : `${inside}, and came home`]);
  const bf = bestFriend(state);
  if (bf) facts.push(['Best friend', `${bf.firstName}, for ${state.character.age - (friendGroupsOf(state).since ?? state.character.age)} years`]);
  const hobbies = Object.entries(state.hobbies ?? {}).filter(([, h]) => h.skill >= 40).sort((a, b) => b[1].skill - a[1].skill);
  if (hobbies.length) {
    const [id, h] = hobbies[0];
    facts.push(['Passion', `${HOBBIES[id].icon} ${HOBBIES[id].label} — ${tierOf(h.skill).label.toLowerCase()}${h.wins ? `, ${h.wins} win${h.wins === 1 ? '' : 's'}` : ''}`]);
  }
  const kids = childrenOf(state).filter((k) => k.relation === 'child');
  if (kids.length) {
    const alive = livingChildren(state).length;
    const close = livingChildren(state).filter((k) => (k.relationship ?? 0) >= 60).length;
    facts.push(['Children', `${kids.length}${alive < kids.length ? ` (${kids.length - alive} died before you)` : ''}${alive ? ` · ${close === alive ? 'all close to you' : close ? `${close} close to you` : 'none close at the end'}` : ''}`]);
  }
  return facts;
}
