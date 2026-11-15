/**
 * The little things (life/LittleThings.js): star sign, tattoos, a new look, the bucket list, the time capsule.
 */
import { esc, button, card, kv } from '../Components.js';
import { starSign, bucketNow, BUCKET, tattooAge } from '../../modules/life/LittleThings.js';
import { yearNow } from '../../modules/world/Eras.js';

export function littleThingsCard(state) {
  const l = state.little ?? { tattoos: [], bucket: [] };
  const [sign, glyph] = starSign(state);
  const age = state.character.age;
  const y = yearNow(state);
  const rows = [
    ['Star sign', `${glyph} ${sign}`],
    ...(l.look ? [['Your look', esc(l.look)]] : []),
    ...(l.tattoos?.length ? [['Tattoos', esc(l.tattoos.map((t) => t.design).join(', '))]] : []),
    ...(l.capsule ? [['Time capsule', l.capsule.opened ? `Opened (buried ${l.capsule.year})` : `Buried ${l.capsule.year}; open in ${l.capsule.year + 25}`]] : []),
  ];
  const look = `<div class="action-grid">
    ${age >= 12 ? button('💇 A new look', 'littleThings.newLook', { variant: 'small', disabled: Boolean(state.yearly['little.look']) }) : ''}
    ${age >= tattooAge(state) ? button('🖋️ Get a tattoo', 'littleThings.tattoo', { variant: 'small', disabled: Boolean(state.yearly['little.tattoo']) }) : ''}
    ${l.tattoos?.length && y >= 1990 ? button('🩹 Have one removed', 'littleThings.removeTattoo', { variant: 'small ghost' }) : ''}
    ${!l.capsule && age >= 8 ? button('⏳ Bury a time capsule', 'littleThings.buryCapsule', { variant: 'small', hint: 'Open it in 25 years' }) : ''}
  </div>`;
  let bucket = '';
  if (age >= 30) {
    const listed = (l.bucket ?? []).map((b) => `<li>${b.done ? '✅' : '⬜'} ${esc(BUCKET[b.id]?.label ?? b.id)}${b.done ? ` <small class="muted">at ${b.done}</small>` : ` ${button('Do it', 'littleThings.doBucket', { arg: b.id, variant: 'tiny' })}`}</li>`).join('');
    const add = bucketNow(state).filter((b) => !(l.bucket ?? []).some((x) => x.id === b.id)).map((b) => button(b.label, 'littleThings.addToBucket', { arg: b.id, variant: 'tiny' })).join('');
    bucket = `<h4 class="sub">📝 Bucket list</h4>${listed ? `<ul class="history">${listed}</ul>` : '<p class="fine">Things to do before you die.</p>'}${add ? `<div class="toggle-row chips-row">${add}</div>` : ''}`;
  }
  return card('About You', `${kv(rows)}${look}${bucket}`, { icon: glyph });
}
