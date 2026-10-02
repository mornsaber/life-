/**
 * Medical conditions: acute (one-off emergencies), chronic, mental health
 * and addiction. A condition instance lives in state.health.conditions:
 *
 *   { id, onsetAge, severity 0–100, diagnosed, treated, remission, serviceConnected }
 *
 * Severity drifts each year (faster untreated). Every condition adds to the
 * yearly mortality risk Lifecycle rolls, so deaths come from what you have.
 *
 *   annualCost   treatment cost before insurance (billed yearly while treated)
 *   drain        health lost per year untreated (treated: × treatedFactor)
 *   mortality    added yearly death risk at severity 100 untreated (scales with severity)
 *   remission    yearly remission chance while treated (mental/addiction/cancer)
 *   disabling    severity at which you can't keep working
 *   va           VA rating by severity band when service-connected
 */
import { clamp } from '../../core/Random.js';

export const KINDS = {
  acute: { name: 'Acute', icon: '🚑' },
  chronic: { name: 'Chronic', icon: '🩺' },
  mental: { name: 'Mental health', icon: '🧠' },
  addiction: { name: 'Addiction', icon: '🍾' },
};

export const ACUTE = {
  flu: { name: 'Bad flu', icon: '🤒', cost: 400, health: -4, untreatedDeath: 0.002, minAge: 0 },
  brokenBone: { name: 'Broken bone', icon: '🦴', cost: 7000, health: -8, fitness: -5, untreatedDeath: 0, minAge: 3 },
  appendicitis: { name: 'Appendicitis', icon: '🔪', cost: 28000, health: -10, untreatedDeath: 0.25, minAge: 6 },
  concussion: { name: 'Concussion', icon: '💫', cost: 3500, health: -6, untreatedDeath: 0.01, minAge: 8 },
  pneumonia: { name: 'Pneumonia', icon: '🫁', cost: 14000, health: -10, untreatedDeath: 0.12, minAge: 50 },
  carAccident: { name: 'Car accident', icon: '🚗', cost: 22000, health: -16, fitness: -4, untreatedDeath: 0.08, minAge: 16, trauma: 12, injury: 'backInjury' },
};

export const CONDITIONS = {
  // Chronic
  hypertension: { kind: 'chronic', name: 'Hypertension', icon: '🩸', annualCost: 700, drain: 1, treatedFactor: 0, mortality: 0.01, progress: 4 },
  diabetes: { kind: 'chronic', name: 'Type 2 diabetes', icon: '🍬', annualCost: 4500, drain: 2, treatedFactor: 0.2, mortality: 0.025, progress: 5, disabling: 95 },
  heartDisease: { kind: 'chronic', name: 'Heart disease', icon: '❤️‍🩹', annualCost: 9000, drain: 2, treatedFactor: 0.35, mortality: 0.07, progress: 5, disabling: 80 },
  cancer: { kind: 'chronic', name: 'Cancer', icon: '🎗️', annualCost: 65000, drain: 5, treatedFactor: 0.5, mortality: 0.4, progress: 14, remission: 0.4, disabling: 70 },
  backInjury: { kind: 'chronic', name: 'Chronic back injury', icon: '🦴', annualCost: 3500, drain: 1, treatedFactor: 0.3, mortality: 0, progress: 3, disabling: 75, va: [[40, 10], [70, 20], [101, 40]] },
  tbi: { kind: 'chronic', name: 'Traumatic brain injury', icon: '🧠', annualCost: 3000, drain: 1, treatedFactor: 0.5, mortality: 0.004, progress: 1, disabling: 80, va: [[40, 10], [70, 40], [101, 70]] },
  hearingLoss: { kind: 'chronic', name: 'Tinnitus / hearing loss', icon: '👂', annualCost: 300, drain: 0, treatedFactor: 0, mortality: 0, progress: 1, va: [[101, 10]] },
  arthritis: { kind: 'chronic', name: 'Arthritis', icon: '🦵', annualCost: 1800, drain: 1, treatedFactor: 0.3, mortality: 0, progress: 3 },
  asthma: { kind: 'chronic', name: 'Asthma', icon: '💨', annualCost: 1200, drain: 1, treatedFactor: 0, mortality: 0.004, progress: 1 },
  // Mental health
  depression: { kind: 'mental', name: 'Depression', icon: '🌧️', annualCost: 2800, drain: 0, treatedFactor: 0.2, mortality: 0.004, progress: 6, remission: 0.3, happiness: -7, disabling: 90, va: [[40, 30], [70, 50], [101, 70]] },
  anxiety: { kind: 'mental', name: 'Anxiety disorder', icon: '😰', annualCost: 2200, drain: 0, treatedFactor: 0, mortality: 0, progress: 4, remission: 0.3, happiness: -3, stress: 6 },
  ptsd: { kind: 'mental', name: 'PTSD', icon: '🌫️', annualCost: 4500, drain: 0, treatedFactor: 0.3, mortality: 0.006, progress: 6, remission: 0.2, happiness: -8, stress: 8, disabling: 85, va: [[40, 30], [70, 50], [90, 70], [101, 100]] },
  // Addiction
  alcohol: { kind: 'addiction', name: 'Alcohol use disorder', icon: '🍺', annualCost: 0, drain: 2, treatedFactor: 0.2, mortality: 0.012, progress: 8, happiness: -3, dui: 0.08, board: 0.12 },
  opioids: { kind: 'addiction', name: 'Opioid addiction', icon: '💊', annualCost: 0, drain: 3, treatedFactor: 0.2, mortality: 0.04, progress: 10, happiness: -4, board: 0.18, overdose: true },
  gambling: { kind: 'addiction', name: 'Gambling addiction', icon: '🎰', annualCost: 0, drain: 0, treatedFactor: 0, mortality: 0.003, progress: 8, happiness: -4, losses: [4000, 20000] },
};

export const MENTAL_TREATMENT = 'therapy and medication';
export const REHAB_COST = 32000;

/** Credentials a licensing board or FAA/DOT medical can suspend for addiction. */
export const BOARD_LICENSES = ['rn', 'np', 'medicalLicense', 'pharmacistLicense', 'paramedic', 'emt', 'cdlA', 'commercialPilot', 'atp', 'privatePilot', 'barLicense', 'cna'];

export const conditionDef = (id) => CONDITIONS[id];
export const activeConditions = (state) => state.health?.conditions.filter((c) => !c.remission) ?? [];
export const hasCondition = (state, id) => activeConditions(state).some((c) => c.id === id);
export const getCondition = (state, id) => state.health?.conditions.find((c) => c.id === id);

/** Yearly mortality contributed by a condition (risk at severity 100 untreated). */
export function conditionMortality(c) {
  const def = CONDITIONS[c.id];
  if (c.remission || !def.mortality) return 0;
  const sev = c.severity / 100;
  return def.mortality * sev * sev * (c.treated ? def.treatedFactor + 0.15 : 1);
}

/**
 * Extra yearly death risk from conditions plus a weighted cause of death,
 * consumed by Lifecycle's mortality roll.
 */
export function healthMortality(state) {
  const parts = activeConditions(state).map((c) => ({ id: c.id, risk: conditionMortality(c) })).filter((p) => p.risk > 0);
  return { total: clamp(parts.reduce((s, p) => s + p.risk, 0), 0, 0.9), parts };
}

export const DEATH_CAUSE = {
  hypertension: 'Stroke', diabetes: 'Diabetes complications', heartDisease: 'Heart disease', cancer: 'Cancer',
  tbi: 'Complications of a brain injury', asthma: 'Asthma attack', depression: 'Suicide', ptsd: 'Suicide',
  alcohol: 'Alcohol-related liver failure', opioids: 'Opioid overdose', gambling: 'Suicide',
};

/** VA rating (0–100) for one service-connected condition. */
export function vaRatingFor(c) {
  const bands = CONDITIONS[c.id].va;
  if (!bands || !c.serviceConnected) return 0;
  return bands.find(([max]) => c.severity < max)?.[1] ?? 0;
}

/** VA "whole person" math: ratings combine multiplicatively, rounded to the nearest 10. */
export function combinedVaRating(ratings) {
  const remaining = ratings.filter((r) => r > 0).sort((a, b) => b - a).reduce((eff, r) => eff * (1 - r / 100), 1);
  return clamp(Math.round((1 - remaining) * 10) * 10, 0, 100);
}

/** Annual VA disability compensation by combined rating (veteran alone). */
export const VA_COMPENSATION = { 0: 0, 10: 2100, 20: 4150, 30: 6430, 40: 9260, 50: 13180, 60: 16700, 70: 21050, 80: 24460, 90: 27490, 100: 45800 };
