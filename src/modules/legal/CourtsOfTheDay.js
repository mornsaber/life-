/**
 * Courts and punishment as they were, by country and era (the trial itself: JusticeSystem.js).
 * After a conviction, the court you stood in and what its sentence meant there and then:
 *
 *   Britain   magistrates and Quarter Sessions for small matters, the Assizes for serious ones (the
 *             Crown Court from 1972); transportation to Australia until 1868; borstal for the young
 *             (1902–82); for murder, the black cap (the death penalty until 1965).
 *   France    the tribunal correctionnel and the cour d'assises; the bagne in Guiana (to 1938).
 *   Russia    the Tsar's courts and exile to Siberia; after 1917 a people's court, and in the
 *             Stalin years, the camps of the Gulag.
 *   Germany   the Amtsgericht and the Landgericht; Japan, the district court.
 */
import { yearNow, PRESENT } from '../world/Eras.js';

const cc = (state) => state.character.countryId ?? 'US';

/** Where you were tried and what it meant, in a sentence (null where there's nothing to add). */
export function courtLine(state, { severity, offenseId, prison }) {
  const y = yearNow(state);
  const c = cc(state);
  const age = state.character.age;
  const serious = severity === 'felony';
  const murder = /murder|homicide/i.test(offenseId ?? '');
  if (['GB', 'IE'].includes(c)) {
    const court = !serious ? 'the magistrates\' court' : y < 1972 ? 'the Assizes' : 'the Crown Court';
    if (murder && y < 1965) return `Tried at ${court}. The judge put on the black cap: death by hanging, commuted at the last to penal servitude for life.`;
    if (serious && prison >= 7 && y < 1868) return `Tried at ${court} and sentenced to transportation: ${y < 1853 ? 'Van Diemen\'s Land' : 'Western Australia'}, in the hold of a convict ship.`;
    if (age < 21 && age >= 16 && prison > 0 && y >= 1902 && y < 1983) return `Tried at ${court} and sent to borstal: drill, trade training and a housemaster.`;
    return serious ? `Tried at ${court}${y < 1972 ? ', before a red-robed judge and a jury of twelve' : ''}.` : null;
  }
  if (c === 'FR') {
    if (serious && prison >= 8 && y >= 1852 && y < 1938) return 'Condemned by the cour d\'assises to the bagne: the convict ship to Guiana, and the penal colony at Saint-Laurent-du-Maroni.';
    if (murder && y < 1981) return 'The cour d\'assises sentenced you to the guillotine; the President commuted it to life.';
    return serious ? 'Tried before the cour d\'assises, with its jury of citizens.' : 'Sentenced by the tribunal correctionnel.';
  }
  if (['RU', 'UA', 'BY'].includes(c)) {
    if (y < 1917) return serious ? 'Sentenced to katorga: hard labour and exile in Siberia, walked there in chains.' : 'Sentenced by the district court.';
    if (y >= 1930 && y < 1956 && prison > 0) return 'Sentenced by a people\'s court to the camps: a cattle truck east, and a corrective labour camp of the Gulag.';
    return 'Sentenced by a people\'s court.';
  }
  if (c === 'DE' || c === 'AT') return serious ? 'Tried before the Landgericht.' : 'Sentenced by the Amtsgericht.';
  if (c === 'JP') return 'Tried before the district court: three judges and no jury.';
  return null;
}

export const CourtsOfTheDayModule = {
  id: 'courtsDay',
  order: 40.5,
  setup(engine) {
    engine.bus.on('legal:convicted', ({ ctx, offenseId, severity, courtMartial }) => {
      const { state } = ctx;
      if (courtMartial || !state.era || yearNow(state) >= PRESENT) return;
      const last = state.legal.record.at(-1);
      const prison = Number(/(\d+) yr prison/.exec(last?.sentence ?? '')?.[1] ?? 0);
      const line = courtLine(state, { severity, offenseId, prison });
      if (line) ctx.log(line, '⚖️', 'bad');
    });
  },
};
