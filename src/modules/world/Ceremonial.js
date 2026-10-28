/**
 * Ceremonial posts with real work: the honorary colonel of a regiment (or honorary captain,
 * honorary air commodore, Colonel of the Regiment), and the Lord-Lieutenant and Deputy
 * Lieutenants of a county. Each year brings a duty that matters to someone — a soldier's family in
 * trouble, a defence review that would merge the regiment, a royal visit to plan, an honours
 * nomination to vet — and how you handle them builds your standing with the regiment or the
 * county.
 *
 *   Standing   0–100 per post. High standing gets an honorary appointment renewed, earns the
 *              regiment's thanks (and a portrait in the mess), and a Lord-Lieutenant's personal
 *              service to the monarch is noticed (the Royal Victorian Order, through Honours.js).
 *   Regiment   welfare cases, amalgamation threats, new colours, repatriations, recruiting,
 *              guest nights
 *   Lieutenancy royal visits, citizenship ceremonies, the King's Award for Voluntary Service,
 *              honours vetting, the Lord-Lieutenant's cadets, a county emergency
 *
 * state.ceremonial = { [key]: { standing, years, events } }   key: honour id, or 'lieutenancy'
 */
import { clamp } from '../../core/Random.js';
import { addHonor } from '../../core/State.js';

const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

const REGIMENT = [
  D('welfare', '🫂', 'A Soldier\'s Family', 'The adjutant tells you a young lance corporal\'s family is about to lose their home: his wife is ill, and the debts have piled up while he was on operations.', [
    { id: 'fund', label: '💷 Help from your own pocket', cost: 5000, standing: 10, happiness: 4, text: 'The family kept their home. The lance corporal never learned where the money came from — but the sergeants\' mess did.' },
    { id: 'charity', label: '📨 Press the regimental charity to act', standing: 6, text: 'You leaned on the trustees; the benevolent fund paid the arrears within the week.' },
    { id: 'chain', label: '📋 Leave it to the chain of command', standing: 1, text: 'The commanding officer handled it, slowly.' },
  ]),
  D('merger', '⚔️', 'The Defence Review', 'A defence review proposes amalgamating the regiment with another. Three centuries of history would end with a new name.', [
    { id: 'campaign', label: '📣 Lead a public campaign to save it', check: true, standing: 15, recognition: 5, text: 'Letters to the papers, a debate in Parliament, old soldiers marching in Whitehall: the regiment was spared.', fail: { standing: 6, text: 'You fought hard and lost. The regiment was amalgamated; the old soldiers still thank you for trying.' } },
    { id: 'shape', label: '🤝 Accept it, and shape the merger', standing: 3, recognition: 3, text: 'The new regiment kept the old cap badge and the regimental march. Ministers noted your good sense.' },
  ]),
  D('colours', '🚩', 'New Colours', 'The monarch will present new Colours to the regiment. As its honorary colonel you speak at the parade and the lunch afterwards.', [
    { id: 'speech', label: '🎤 Give a speech about the regiment\'s history', check: true, standing: 8, text: 'Battle honours from Waterloo to Helmand. Old soldiers wiped their eyes; the monarch asked for a copy.', fail: { standing: 2, text: 'You went on too long, in the rain. The adjutant was polite about it.' } },
    { id: 'short', label: '🫡 Keep it short and to the soldiers', standing: 5, text: 'Ninety seconds, about the soldiers on parade. They liked it best of all.' },
  ]),
  D('repatriation', '🕯️', 'Coming Home', 'A soldier of the regiment was killed on operations. The repatriation is on Tuesday; the funeral is in his home town.', [
    { id: 'family', label: '🏡 Visit the family and attend the funeral', standing: 10, stress: 6, text: 'You sat in a front room with his mother for an hour. At the funeral, the whole town lined the street.' },
    { id: 'letter', label: '✉️ Write to the family', standing: 3, text: 'A handwritten letter on regimental paper. His mother kept it.' },
  ]),
  D('recruit', '📢', 'Recruiting in Your Town', 'The regiment is short of soldiers from its home county and asks for your help.', [
    { id: 'champion', label: '🏟️ Front the campaign: schools, fairs, the local paper', standing: 6, recognition: 2, text: 'Recruits came in from towns that hadn\'t sent anyone in years.' },
    { id: 'employers', label: '🏢 Lean on local employers to release reservists', standing: 5, text: 'Six firms signed the Armed Forces Covenant on your say-so.' },
  ]),
  D('dinner', '🍷', 'Guest Night', 'A regimental guest night: the silver on the table, the band, and a loyal toast. You\'re the principal guest.', [
    { id: 'host', label: '🍽️ Bring guests who can help the regiment', cost: 1500, standing: 5, recognition: 3, text: 'A minister and two business leaders went home with the regimental tie and a better idea of what soldiers need.' },
    { id: 'soldiers', label: '🍺 Spend the night with the junior ranks afterwards', standing: 7, happiness: 3, text: 'The corporals\' club at two in the morning: you heard more truth than in a year of briefings.' },
  ]),
];

const LIEUTENANCY = [
  D('royal', '👑', 'A Royal Visit', 'The monarch will visit the county for a day: a hospital opening, a school, a lunch with local people. You plan it and escort the visit.', [
    { id: 'plan', label: '🗓️ Plan every minute yourself', check: true, standing: 10, text: 'The day ran to the minute. The monarch spent longer at the food bank than planned because you had chosen it.', fail: { standing: 3, text: 'The car was late, the speech was cut, and the mayor sulked. It still made the evening news.' } },
    { id: 'delegate', label: '🤝 Let the palace and the council plan it', standing: 4, text: 'Smooth and forgettable.' },
  ]),
  D('citizenship', '🪪', 'A Citizenship Ceremony', 'Forty new citizens from twenty-three countries in the town hall; you welcome them on the Crown\'s behalf.', [
    { id: 'personal', label: '💬 Speak to each family afterwards', standing: 6, happiness: 4, text: 'A nurse from Kerala, a refugee engineer from Aleppo, a Polish baker. You remember all their names.' },
    { id: 'formal', label: '📜 Give the formal address', standing: 3, text: 'Dignified and brief.' },
  ]),
  D('kavs', '🏅', 'The King\'s Award for Voluntary Service', 'Two local groups are nominated and the county can recommend only one this year.', [
    { id: 'foodbank', label: '🥫 The food bank that feeds two thousand families', standing: 5, text: 'Their volunteers went to the palace garden party in their best clothes.' },
    { id: 'rescue', label: '⛰️ The mountain rescue team', standing: 5, text: 'They received the crystal at their base, between call-outs.' },
  ]),
  D('vetting', '🔍', 'An Honours Nomination', 'A wealthy donor to the governing party has been nominated for a knighthood "for services to the county". You\'re asked for an assessment.', [
    { id: 'honest', label: '⚖️ Say plainly that you can find no such services', standing: 6, text: 'The nomination went no further. Some people were not pleased; the county was.' },
    { id: 'wave', label: '✅ Support it — he gives generously', standing: -3, recognition: 2, text: 'He got his knighthood.', risk: { chance: 0.25, standing: -10, text: 'A newspaper linked the honour to the donations, and quoted your letter.' } },
  ]),
  D('cadets', '🎖️', 'Lord-Lieutenant\'s Cadets', 'Each year you choose cadets to serve as your cadets for a year, at your side at events.', [
    { id: 'quiet', label: '🌱 The quiet kid who has never been chosen for anything', standing: 5, happiness: 3, text: 'She grew six inches in confidence that year; later she joined the Navy.' },
    { id: 'star', label: '⭐ The obvious star of the county\'s cadets', standing: 3, text: 'He was excellent, as expected.' },
  ]),
  D('flood', '🌊', 'The County Floods', 'Rivers have burst their banks across the county; hundreds of homes are under water.', [
    { id: 'visit', label: '🥾 Visit the shelters and the crews every day', standing: 9, stress: 5, text: 'You were there in wellingtons every morning. People noticed who came.' },
    { id: 'thanks', label: '✉️ Thank the emergency services afterwards', standing: 3, text: 'A reception at the county hall for the firefighters and volunteers.' },
  ]),
];

const LIEUTENANCY_OFFICES = ['gb_lordLieutenant', 'gb_deputyLieutenant'];

/** The ceremonial posts you hold now. */
export function ceremonialPosts(state) {
  const posts = state.honors.filter((h) => h.source === 'honoraryRank').map((h) => ({ key: h.id, name: h.name, kind: 'regiment' }));
  const o = state.politics?.office;
  if (o && LIEUTENANCY_OFFICES.includes(o.id)) posts.push({ key: 'lieutenancy', name: o.id === 'gb_lordLieutenant' ? 'Lord-Lieutenant of the County' : 'Deputy Lieutenant of the County', kind: 'lieutenancy' });
  return posts.map((p) => ({ ...p, rec: state.ceremonial?.[p.key] ?? null }));
}
const recOf = (state, key) => ((state.ceremonial ??= {})[key] ??= { standing: 50, years: 0, events: 0 });

function apply(ctx, rec, fx) {
  if (!fx) return;
  const { state } = ctx;
  if (fx.cost) ctx.spend(fx.cost, 'A gift to the regiment', { allowDebt: false });
  if (fx.standing) rec.standing = Math.round(clamp(rec.standing + fx.standing, 0, 100));
  if (fx.recognition && state.politics) state.politics.recognition = Math.min(100, (state.politics.recognition ?? 0) + fx.recognition);
  for (const k of ['happiness', 'stress']) if (fx[k]) ctx.stat(k, fx[k]);
  if (fx.text) ctx.log(fx.text, '🎖️', (fx.standing ?? 0) > 0 ? 'good' : (fx.standing ?? 0) < 0 ? 'warn' : 'info');
}

export const CeremonialModule = {
  id: 'ceremonial',
  order: 33.9,
  onAgeUp(ctx) {
    const { state, rng } = ctx;
    if (!state.character.alive || state.legal.incarceration) return;
    const posts = ceremonialPosts(state);
    for (const p of posts) {
      const rec = recOf(state, p.key);
      rec.years += 1;
      rec.standing = Math.round(clamp(rec.standing + (50 - rec.standing) * 0.05, 0, 100));
      // Long, loved service is marked.
      if (p.kind === 'regiment' && rec.standing >= 80 && rec.years >= 4 && !rec.thanked) {
        rec.thanked = true;
        addHonor(state, { id: `${p.key}.portrait`, source: 'civil', name: 'Regimental thanks — a portrait in the officers\' mess', icon: '🖼️', prestige: 6, precedence: 60, citation: `For devoted service as ${p.name}.` });
        ctx.log('The regiment commissioned your portrait for the officers\' mess.', '🖼️', 'honor');
      }
    }
    if (!posts.length || state.prompts.some((x) => x.type === 'ceremonial.duty') || !rng.chance(0.75)) return;
    const p = rng.pick(posts);
    const deck = p.kind === 'lieutenancy' ? LIEUTENANCY : REGIMENT;
    const d = rng.pick(deck);
    ctx.prompt({ type: 'ceremonial.duty', icon: d.icon, title: d.title, text: `${p.name}: ${d.text}`, options: d.options.map(({ id, label }) => ({ id, label })), data: { key: p.key, kind: p.kind, deckId: d.id } });
  },
  resolvers: {
    duty(ctx, data, optionId) {
      const { state, rng } = ctx;
      const deck = data.kind === 'lieutenancy' ? LIEUTENANCY : REGIMENT;
      const d = deck.find((x) => x.id === data.deckId);
      const o = d?.options.find((x) => x.id === optionId);
      if (!o) return undefined;
      const rec = recOf(state, data.key);
      rec.events += 1;
      // A check rests on judgement and standing in the room.
      const ok = !o.check || rng.chance(clamp(0.35 + (state.stats.smarts - 50) / 150 + rec.standing / 250, 0.15, 0.9));
      apply(ctx, rec, ok ? o : o.fail);
      if (ok && o.risk && rng.chance(o.risk.chance)) apply(ctx, rec, o.risk);
      return undefined;
    },
  },
};

/** For the honorary-rank renewal: standing makes it likelier. */
export const standingOf = (state, key) => state.ceremonial?.[key]?.standing ?? 50;
