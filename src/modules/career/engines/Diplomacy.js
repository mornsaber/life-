/**
 * The Foreign Service, beyond the bid list: you pick a cone (consular,
 * political, economic, management, public diplomacy) and do its work at
 * post — visa lines and arrested citizens, cables home, trade deals,
 * embassy budgets, press and exchanges. Dangerous posts can go bad: a
 * crisis evacuation is the job at its hardest. Senior officers can be
 * nominated as ambassador.
 *
 * Postings put you in the country for the three-year tour (world/Posting.js).
 *
 * state.careerLife.diplomacy = { professionId, cone, cables, visas, citizens, evacuations, nominated, rep }
 */
import { clamp } from '../../../core/Random.js';
import { yearlyCount, bumpYearly } from '../../../core/State.js';
import { promote } from '../CareerEngine.js';
import { lifeOf, peekLife, resolveOption, promptOptions, applyFx, skill, engineKey } from './Kit.js';

const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

export const CONES = {
  consular: {
    name: 'Consular', icon: '🛂', desc: 'Visas, passports and citizens in trouble abroad.', weights: { smarts: 1, happiness: 2 },
    deck: [
      D('visa', '📄', 'The Visa Interview', 'A young engineer\'s visa application has everything right — and a cousin who overstayed.', [
        { id: 'approve', label: '✅ Approve it', check: 45, text: 'He came, worked, and went home on time. Your judgement held up.', rep: 3, fail: { text: 'He overstayed. Your adjudications get a second look now.', perf: -4 } },
        { id: 'refuse', label: '❌ Refuse it', text: 'He left the window crying. The rule is the rule.', perf: 1 },
      ]),
      D('arrest', '🚔', 'A Citizen in Jail', 'A tourist from home was arrested at a protest and is being held without charge.', [
        { id: 'visit', label: '🏢 Visit him and press for access to a lawyer', check: 50, text: 'He was released in a week and called you a hero to every reporter at home.', perf: 5, rep: 6, fail: { text: 'He\'s still being held. His family blames you on television.', stress: 6, rep: -3 } },
        { id: 'standard', label: '📋 Standard consular visit', text: 'You checked his welfare and gave him the lawyer list.', perf: 1 },
      ]),
      D('fraud', '💰', 'A Visa Broker', 'A local fixer offers $20,000 to approve a list of names.', [
        { id: 'report', label: '📝 Report it to embassy security', text: 'They rolled up a fraud ring. Your name went in a commendation.', perf: 6, commend: 0.6 },
        { id: 'take', label: '💸 Take it', tone: 'danger', text: 'A thick envelope of cash.', money: 20000, moneyLabel: 'Cash', offense: 'visaFraud', offenseContext: 'selling visas from a consulate', discovery: 0.45 },
      ]),
    ],
  },
  political: {
    name: 'Political', icon: '🏛️', desc: 'Read the country\'s politics and write the cables home.', weights: { smarts: 3 },
    deck: [
      D('cable', '📨', 'The Cable', 'Your reporting says the government will fall within a year. The ambassador thinks it\'s alarmist.', [
        { id: 'send', label: '📤 Send it through the dissent channel', check: 55, text: 'Eight months later it fell. Your cable was read at the very top.', perf: 8, rep: 10, fail: { text: 'It didn\'t fall. You look alarmist now.', perf: -4, rep: -4 } },
        { id: 'soften', label: '✏️ Soften it', text: 'A careful cable nobody remembers.', perf: 1 },
      ]),
      D('opposition', '🤝', 'Dinner With the Opposition', 'The opposition leader invites you to dinner. The government will hear about it.', [
        { id: 'go', label: '🍽️ Go', text: 'You learned more in one dinner than a month of meetings. The foreign ministry complained.', rep: 5, perf: 3, stress: 3 },
        { id: 'decline', label: '🙅 Decline politely', text: 'The government stayed friendly.', perf: 1 },
      ]),
    ],
  },
  economic: {
    name: 'Economic', icon: '📊', desc: 'Trade, investment, sanctions and energy.', weights: { smarts: 3 },
    deck: [
      D('deal', '🤝', 'The Contract', 'A home-country company is losing a $2 billion contract to a rival backed by bribes.', [
        { id: 'advocate', label: '📣 Advocate hard with the ministry', check: 55, text: 'The tender was reopened, and your company won it cleanly.', perf: 7, rep: 6, fail: { text: 'The bribes won.', perf: -2 } },
        { id: 'report', label: '📝 Document the bribery for a report', text: 'Your report fed a sanctions case two years later.', perf: 3 },
      ]),
      D('sanctions', '🚫', 'Sanctions Evasion', 'You spot tankers switching off their transponders in the port.', [
        { id: 'report', label: '🛰️ Report it', text: 'Three companies were sanctioned. Good work.', perf: 5, rep: 4 },
      ]),
    ],
  },
  management: {
    name: 'Management', icon: '🗂️', desc: 'Run the embassy: budget, housing, security, local staff.', weights: { smarts: 2, happiness: 1 },
    deck: [
      D('cuts', '✂️', 'Budget Cuts', 'The capital cut the post budget 15%. Local staff jobs or the motor pool?', [
        { id: 'motor', label: '🚗 Cut the motor pool and travel', text: 'Officers grumbled; nobody lost a job.', perf: 3, rep: 4 },
        { id: 'staff', label: '👥 Cut local staff positions', text: 'The budget balanced. Some of the best people at post are gone.', perf: 2, rep: -4 },
      ]),
      D('housing', '🏠', 'The Housing Board', 'A senior officer wants the best house, against the rules.', [
        { id: 'rules', label: '📏 Follow the rules', text: 'A family of five got the house. The senior officer won\'t forget.', rep: 3 },
        { id: 'bend', label: '🤫 Bend them', text: 'Career-wise, a smart move.', perf: 2, rep: -3 },
      ]),
    ],
  },
  publicDiplomacy: {
    name: 'Public diplomacy', icon: '🎤', desc: 'Press, culture and exchanges. The country\'s face to the public.', weights: { happiness: 2, looks: 1 },
    deck: [
      D('interview', '📺', 'Live on Local TV', 'A hostile host ambushes you with a question about your country\'s drone strikes.', [
        { id: 'answer', label: '🗣️ Answer honestly, in the local language', check: 50, text: 'The clip went viral for the right reasons.', perf: 6, rep: 8, fail: { text: 'A gaffe. The ministry back home called.', perf: -5 } },
        { id: 'talking', label: '📋 Stick to the talking points', text: 'Safe. Forgettable.', perf: 1 },
      ]),
      D('exchange', '🎓', 'The Exchange Program', 'You can pick one student for a year at a university back home.', [
        { id: 'merit', label: '🏆 The top scorer', text: 'A safe, excellent choice.', perf: 2 },
        { id: 'village', label: '🏘️ The girl from a village school who wrote the best essay', text: 'Twenty years later she\'s a minister — and remembers who sent her.', rep: 6, happiness: 4 },
      ]),
    ],
  },
};

const EVAC = D('evac', '🚁', 'Ordered Departure', 'The capital is falling. Families have been flown out; thousands of citizens and local staff want seats on the last flights.', [
  { id: 'stay', label: '🛡️ Stay and run the evacuation', check: 55, text: 'You got 3,000 people out in nine days, including every local employee. You were given the service\'s Award for Heroism.', perf: 12, rep: 15, trauma: 10, honor: { id: 'fs.heroism', name: 'Award for Heroism', icon: '🎖️' }, fail: { text: 'You got most out. Some local staff were left behind. You will think about them for the rest of your life.', trauma: 16, perf: 4 } },
  { id: 'leave', label: '✈️ Leave on the ordered schedule', text: 'You followed orders and left with the first wave.', perf: -2, trauma: 4 },
]);

export const isDiplomat = (job) => engineKey(job) === 'foreignService';
const fresh = () => ({ cone: null, cables: 0, visas: 0, citizens: 0, evacuations: 0, nominated: false });

export function diplomacyView(state) {
  const job = state.career.job;
  if (!isDiplomat(job)) return null;
  const rec = peekLife(state, 'diplomacy');
  return { rec: rec?.professionId === job.professionId ? rec : null, posting: job.posting };
}

export const DiplomacyModule = {
  id: 'diplomacy',
  order: 31.3,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    const job = state.career.job;
    if (!isDiplomat(job) || job.levelId === 'trainee' || state.legal.incarceration) return;
    const rec = lifeOf(state, 'diplomacy', job.professionId, fresh());
    if (!rec.cone) return void ctx.prompt({ type: 'diplomacy.cone', icon: '🌐', title: job.professionId === 'foreignService' ? 'Choose Your Cone' : 'Choose Your Stream', text: `Every ${job.professionId === 'foreignService' ? 'Foreign Service officer' : 'diplomat'} specialises. It shapes the work you do at every post.`, options: Object.entries(CONES).map(([id, c]) => ({ id, label: `${c.icon} ${c.name}`, hint: c.desc })) });
    const cone = CONES[rec.cone];
    const sk = skill(state, cone.weights);
    // The year's volume of work.
    if (rec.cone === 'consular') { rec.visas += rng.int(3000, 9000); rec.citizens += rng.int(20, 120); } else rec.cables += rng.int(25, 70);
    rec.rep = Math.round(clamp(rec.rep + (sk - 55) / 12, 0, 100));
    // A dangerous post can come apart.
    const danger = job.posting?.danger ?? 0;
    if (danger >= 0.2 && rng.chance(danger * 0.35) && !state.prompts.some((p) => p.type === 'diplomacy.event')) {
      rec.evacuations += 1;
      return void ctx.prompt({ type: 'diplomacy.event', icon: EVAC.icon, title: EVAC.title, text: `${job.posting.city}: ${EVAC.text}`, options: promptOptions(EVAC.options), data: { deckId: 'evac' } });
    }
    // Ambassadorship: the career's summit.
    if (['fs1', 'dcm'].includes(job.levelId) && !rec.nominated && rec.rep >= 70 && job.performance >= 75 && rng.chance(0.2)) {
      rec.nominated = true;
      return void ctx.prompt({ type: 'diplomacy.nomination', icon: '🏛️', title: 'A Nomination', text: 'The government wants to nominate you as ambassador to a small country. Confirmation is slow and political.', options: [{ id: 'accept', label: '✅ Accept the nomination' }, { id: 'decline', label: '🙅 Decline — stay in your current post' }] });
    }
    if (rng.chance(0.6) && !state.prompts.some((p) => p.type === 'diplomacy.event')) {
      const d = rng.pick(cone.deck);
      ctx.prompt({ type: 'diplomacy.event', icon: d.icon, title: d.title, text: `${job.posting ? `${job.posting.city} · ` : ''}${d.text}`, options: promptOptions(d.options), data: { deckId: d.id, cone: rec.cone } });
    }
  },
  actions: {
    /** Change cones (rare: once, after five years). */
    cone(ctx, id) {
      const { state } = ctx;
      const job = state.career.job;
      if (!isDiplomat(job) || !CONES[id]) return;
      const rec = lifeOf(state, 'diplomacy', job.professionId, fresh());
      if (rec.cone && (job.yearsAtEmployer ?? 0) < 5) return ctx.toast('Cone changes come after five years', 'warn');
      if (rec.coneChanged) return ctx.toast('You\'ve already changed cones once', 'warn');
      if (yearlyCount(state, 'diplomacy.cone')) return ctx.toast('Once a year', 'warn');
      bumpYearly(state, 'diplomacy.cone');
      if (rec.cone) rec.coneChanged = true;
      rec.cone = id;
      ctx.log(`You're now a ${CONES[id].name.toLowerCase()}-cone officer. ${CONES[id].desc}`, CONES[id].icon);
      return undefined;
    },
  },
  resolvers: {
    cone(ctx, _data, optionId) {
      const job = ctx.state.career.job;
      if (!isDiplomat(job) || !CONES[optionId]) return;
      lifeOf(ctx.state, 'diplomacy', job.professionId, fresh()).cone = optionId;
      ctx.log(`You chose the ${CONES[optionId].name.toLowerCase()} cone. ${CONES[optionId].desc}`, CONES[optionId].icon);
    },
    event(ctx, data, optionId) {
      const job = ctx.state.career.job;
      if (!isDiplomat(job)) return;
      const d = data.deckId === 'evac' ? EVAC : CONES[data.cone]?.deck.find((x) => x.id === data.deckId);
      if (!d) return;
      resolveOption(ctx, lifeOf(ctx.state, 'diplomacy', job.professionId, fresh()), d.options.find((o) => o.id === optionId), d.icon, CONES[data.cone]?.weights ?? { smarts: 2 });
    },
    nomination(ctx, _data, optionId) {
      const { state, rng } = ctx;
      const job = state.career.job;
      if (!isDiplomat(job) || optionId !== 'accept') return;
      if (rng.chance(0.65) && promote(ctx, 'ambassador') !== false) {
        applyFx(ctx, peekLife(state, 'diplomacy'), { text: 'After months of vetting and hearings, your appointment was confirmed. Ambassador.', happiness: 12, honor: { id: 'fs.ambassador', name: 'Ambassador (Career)', icon: '🏛️' } }, '🏛️');
      } else applyFx(ctx, peekLife(state, 'diplomacy'), { text: 'Your nomination stalled and quietly expired.', happiness: -6, stress: 6 }, '🏛️');
    },
  },
};
