/**
 * The years health care changed where you live: the day the sickness fund, the panel doctor, the
 * NHS or Medicare arrived. (The coverage itself: health/Insurance.js, health/HealthSystems.js.)
 */
import { yearNow } from '../world/Eras.js';
import { NATIONAL_HEALTH_FROM } from './HealthSystems.js';
import { SICKNESS_FUND_FROM } from './Insurance.js';

const SICKNESS_TEXT = {
  DE: 'Bismarck\'s sickness insurance law: workers pay into a Krankenkasse, and when they fall ill the fund pays the doctor and a sick wage.',
  GB: 'Lloyd George\'s National Insurance: fourpence a week from your wages, and a "panel" doctor when you\'re ill. Your wife and children aren\'t covered.',
  JP: 'The Health Insurance Act covers factory and mine workers: the doctor is paid by the fund.',
  FR: 'The assurances sociales: workers below a wage ceiling are insured for sickness and maternity.',
};
const NATIONAL_TEXT = {
  GB: 'On 5 July 1948 the National Health Service opened: doctors, hospitals, dentists and opticians, free when you need them. The queues at the opticians went round the block.',
  US: 'Medicare and Medicaid have begun: hospital care for everyone over 65, and help for the poorest.',
  CA: 'Medicare (Canadian style) has reached your province: doctors and hospitals paid from taxes, for everyone.',
  FR: 'The Sécurité sociale is founded: health insurance for every worker and their family.',
  JP: 'Kaihoken: from this year every Japanese is covered by health insurance.',
  AU: 'Medibank: free public hospital care and doctors\' bills paid for every Australian.',
  IT: 'The Servizio Sanitario Nazionale replaces the old mutual funds: care for every resident.',
  SE: 'National health insurance: a doctor\'s visit costs a few kronor.',
  NZ: 'The Social Security Act: free hospital care, and soon free visits to the doctor.',
};
const US_NATIONAL = 1966;

export const HealthcareMomentsModule = {
  id: 'healthcareMoments',
  order: 18.5,
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.era || state.character.age < 4) return;
    const cc = state.character.countryId ?? 'US';
    const y = yearNow(state);
    const seen = (state.healthcareMoments ??= {});
    const nat = cc === 'US' ? US_NATIONAL : NATIONAL_HEALTH_FROM[cc];
    if (SICKNESS_FUND_FROM[cc] === y && !seen[`fund_${cc}`]) {
      seen[`fund_${cc}`] = true;
      ctx.log(SICKNESS_TEXT[cc] ?? 'A new law: workers\' compulsory sickness insurance. When you\'re ill, the fund pays the doctor.', '🏛️', 'milestone');
    }
    if (nat === y && !seen[`nat_${cc}`]) {
      seen[`nat_${cc}`] = true;
      ctx.log(NATIONAL_TEXT[cc] ?? 'National health care has arrived: the doctor and the hospital are paid for.', '🏥', 'milestone');
    }
  },
};
