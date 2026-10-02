/**
 * Military decorations: catalog (with branch-specific names and ribbon
 * colors), award rules for combat actions and service milestones, and the
 * prestige / pension multipliers medals confer.
 *
 * Awarded medals are stored in the shared `state.honors` list (source:
 * 'military') so they outlive the service record and appear on the tombstone.
 */
import { addHonor } from '../../core/State.js';

/** Ribbon stripes are [color, relative width] from left to right. */
export const MEDALS = {
  moh: {
    name: 'Medal of Honor', icon: '🎖️', tier: 'valor', precedence: 1, prestige: 120, pension: 0.25,
    ribbon: [['#3f8fd2', 1]], stars: true,
  },
  serviceCross: {
    name: { army: 'Distinguished Service Cross', navy: 'Navy Cross', marines: 'Navy Cross', airforce: 'Air Force Cross', coastguard: 'Coast Guard Cross' },
    icon: '✠', tier: 'valor', precedence: 2, prestige: 60, pension: 0.12,
    ribbon: [['#c8102e', 1], ['#fff', 1], ['#002868', 6], ['#fff', 1], ['#c8102e', 1]],
  },
  silverStar: {
    name: 'Silver Star', icon: '⭐', tier: 'valor', precedence: 3, prestige: 40, pension: 0.08,
    ribbon: [['#002868', 2], ['#fff', 1], ['#002868', 1], ['#fff', 1], ['#c8102e', 2], ['#fff', 1], ['#002868', 1], ['#fff', 1], ['#002868', 2]],
  },
  legionOfMerit: {
    name: 'Legion of Merit', icon: '🏵️', tier: 'merit', precedence: 4, prestige: 30, pension: 0.05,
    ribbon: [['#fff', 1], ['#9b1b30', 10], ['#fff', 1]],
  },
  bronzeStar: {
    name: 'Bronze Star Medal', icon: '🥉', tier: 'valor', precedence: 5, prestige: 25, pension: 0.05,
    ribbon: [['#fff', 1], ['#c8102e', 4], ['#fff', 1], ['#002868', 2], ['#fff', 1], ['#c8102e', 4], ['#fff', 1]],
  },
  purpleHeart: {
    name: 'Purple Heart', icon: '💜', tier: 'sacrifice', precedence: 6, prestige: 20, pension: 0.04,
    ribbon: [['#fff', 1], ['#5b2a86', 10], ['#fff', 1]],
  },
  msm: {
    name: 'Meritorious Service Medal', icon: '🎗️', tier: 'merit', precedence: 7, prestige: 15, pension: 0.03,
    ribbon: [['#9b1b30', 2], ['#fff', 1], ['#9b1b30', 6], ['#fff', 1], ['#9b1b30', 2]],
  },
  commendation: {
    name: { army: 'Army Commendation Medal', navy: 'Navy and Marine Corps Commendation Medal', marines: 'Navy and Marine Corps Commendation Medal', airforce: 'Air and Space Commendation Medal', coastguard: 'Coast Guard Commendation Medal' },
    icon: '🟢', tier: 'merit', precedence: 8, prestige: 10, pension: 0.02,
    ribbon: [['#fff', 1], ['#1f6f43', 3], ['#fff', 1], ['#1f6f43', 3], ['#fff', 1], ['#1f6f43', 3], ['#fff', 1]],
  },
  achievement: {
    name: { army: 'Army Achievement Medal', navy: 'Navy and Marine Corps Achievement Medal', marines: 'Navy and Marine Corps Achievement Medal', airforce: 'Air and Space Achievement Medal', coastguard: 'Coast Guard Achievement Medal' },
    icon: '🔷', tier: 'merit', precedence: 9, prestige: 6, pension: 0.01,
    ribbon: [['#1f6f43', 2], ['#fff', 1], ['#002868', 2], ['#fff', 2], ['#002868', 2], ['#fff', 1], ['#1f6f43', 2]],
  },
  combatAction: {
    name: { army: 'Combat Action Badge', navy: 'Combat Action Ribbon', marines: 'Combat Action Ribbon', airforce: 'Air Force Combat Action Medal', coastguard: 'Combat Action Ribbon' },
    icon: '⚔️', tier: 'service', precedence: 10, prestige: 8, pension: 0.01,
    ribbon: [['#002868', 2], ['#ffd100', 1], ['#fff', 1], ['#c8102e', 2], ['#fff', 1], ['#ffd100', 1], ['#002868', 2]],
  },
  goodConduct: {
    name: 'Good Conduct Medal', icon: '🎀', tier: 'service', precedence: 11, prestige: 4, pension: 0.005,
    ribbon: [['#c8102e', 2], ['#fff', 1], ['#c8102e', 2], ['#fff', 1], ['#c8102e', 2]],
  },
  humanitarian: {
    name: 'Humanitarian Service Medal', icon: '🤲', tier: 'service', precedence: 12, prestige: 5, pension: 0.005,
    ribbon: [['#002868', 3], ['#5b2a86', 1], ['#002868', 2], ['#5b2a86', 1], ['#002868', 3]],
  },
  expeditionary: {
    name: 'Global War on Terrorism Expeditionary Medal', icon: '🌍', tier: 'service', precedence: 13, prestige: 5, pension: 0.005,
    ribbon: [['#4b6ea8', 2], ['#ffd100', 1], ['#fff', 1], ['#c8102e', 1], ['#fff', 1], ['#ffd100', 1], ['#4b6ea8', 2]],
  },
  ndsm: {
    name: 'National Defense Service Medal', icon: '🇺🇸', tier: 'service', precedence: 14, prestige: 2, pension: 0,
    ribbon: [['#c8102e', 3], ['#ffd100', 2], ['#fff', 1], ['#002868', 1], ['#fff', 1], ['#c8102e', 1], ['#fff', 1], ['#002868', 1], ['#fff', 1], ['#ffd100', 2], ['#c8102e', 3]],
  },
};

export function medalName(medalId, branch) {
  const name = MEDALS[medalId].name;
  return typeof name === 'string' ? name : name[branch] ?? Object.values(name)[0];
}

export function awardMedal(ctx, medalId, { branch, citation, valorDevice = false, posthumous = false } = {}) {
  const medal = MEDALS[medalId];
  if (!medal) throw new Error(`Unknown medal ${medalId}`);
  const name = medalName(medalId, branch);
  addHonor(ctx.state, {
    id: medalId,
    source: 'military',
    name,
    icon: medal.icon,
    ribbon: medal.ribbon,
    precedence: medal.precedence,
    prestige: medal.prestige + (valorDevice ? 5 : 0),
    pension: medal.pension,
    citation,
    device: valorDevice ? 'V' : null,
    posthumous,
  });
  const label = `${name}${valorDevice ? ' with "V" device' : ''}${posthumous ? ' (posthumously)' : ''}`;
  ctx.log(`Awarded the ${label}. ${citation ?? ''}`.trim(), medal.icon, 'honor');
  if (!posthumous) ctx.toast(`🎖️ ${label}`, 'honor');
  return name;
}

const hasMedal = (state, id) => state.honors.some((h) => h.source === 'military' && h.id === id);

/**
 * Translate a combat outcome into decorations.
 * `valor` ≈ 0–110: how far above and beyond the action was.
 */
export function awardForAction(ctx, svc, { valor, wounded, success, title, killed = false }) {
  const opts = { branch: svc.branch, posthumous: killed };
  if (wounded || killed) awardMedal(ctx, 'purpleHeart', { ...opts, citation: `Wounded in action: ${title}.` });

  const roll = ctx.rng.next();
  if (valor >= 100 && success && roll < 0.35) {
    awardMedal(ctx, 'moh', { ...opts, citation: `For conspicuous gallantry and intrepidity at the risk of life above and beyond the call of duty — ${title}.` });
  } else if (valor >= 88 && roll < 0.55) {
    awardMedal(ctx, 'serviceCross', { ...opts, citation: `For extraordinary heroism in combat — ${title}.` });
  } else if (valor >= 75 && roll < 0.65) {
    awardMedal(ctx, 'silverStar', { ...opts, citation: `For gallantry in action — ${title}.` });
  } else if (valor >= 60 && roll < 0.7) {
    awardMedal(ctx, 'bronzeStar', { ...opts, valorDevice: true, citation: `For heroic achievement in combat — ${title}.` });
  } else if (valor >= 45 && roll < 0.6) {
    awardMedal(ctx, 'commendation', { ...opts, valorDevice: true, citation: `For valor during ${title}.` });
  }
}

/** Yearly service-record awards. */
export function annualReview(ctx, svc) {
  const { rng, state } = ctx;
  const branch = svc.branch;
  if (svc.yearsOfService === 1 && !hasMedal(state, 'ndsm')) {
    awardMedal(ctx, 'ndsm', { branch, citation: 'For honorable active service during a period of national emergency.' });
  }
  if (svc.track === 'enlisted' && svc.yearsOfService % 3 === 0 && svc.disciplinary === 0) {
    awardMedal(ctx, 'goodConduct', { branch, citation: 'For three years of exemplary behavior, efficiency and fidelity.' });
  }
  if (svc.eval >= 92 && rng.chance(0.3)) {
    awardMedal(ctx, 'commendation', { branch, citation: 'For meritorious service and sustained superior performance.' });
  } else if (svc.eval >= 82 && rng.chance(0.35)) {
    awardMedal(ctx, 'achievement', { branch, citation: 'For outstanding achievement in the performance of duty.' });
  }
}

export function endOfTourAwards(ctx, svc, { sawCombat }) {
  const branch = svc.branch;
  awardMedal(ctx, 'expeditionary', { branch, citation: `Deployment #${svc.deployments}.` });
  if (sawCombat && !hasMedal(ctx.state, 'combatAction')) {
    awardMedal(ctx, 'combatAction', { branch, citation: 'For satisfactory performance under enemy fire.' });
  }
  const senior = (svc.track === 'enlisted' && svc.grade >= 6) || (svc.track === 'officer' && svc.grade >= 2);
  if (senior && svc.eval >= 80 && ctx.rng.chance(0.5)) {
    awardMedal(ctx, 'bronzeStar', { branch, citation: 'For meritorious service in a combat zone.' });
  }
}

export function careerEndAwards(ctx, svc) {
  const branch = svc.branch;
  if (svc.track === 'officer' && svc.grade >= 5 && svc.eval >= 70) {
    awardMedal(ctx, 'legionOfMerit', { branch, citation: 'For exceptionally meritorious conduct in the performance of outstanding services.' });
  } else if (svc.yearsOfService >= 15 && svc.eval >= 70) {
    awardMedal(ctx, 'msm', { branch, citation: 'For a distinguished career of service.' });
  }
}

export function militaryHonors(state) {
  return state.honors.filter((h) => h.source === 'military');
}

/** Medals raise retired pay by their summed pension bonus, capped at +50%. */
export function pensionMultiplier(state) {
  const bonus = militaryHonors(state).reduce((sum, h) => sum + (h.pension ?? 0), 0);
  return 1 + Math.min(0.5, bonus);
}

export const MOH_ANNUAL_PENSION = 20000;
