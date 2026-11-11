/**
 * Factories, mines, energy and utilities: the mine manager's certificate and the shotfirer are
 * credentials already; this adds the safety and supervisory courses, the mines rescue brigade,
 * work abroad on the fields and the plants, the medals for disasters underground, the mines
 * inspectorate and the safety executive, and the union and works council posts.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, UNION, regulatorFrom, COMMONWEALTH, WORKPLACE_COMPLAINTS } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;
const MINES = ['coalMining'];
const ENERGY = ['oilGas', 'renewableEnergy', 'waterUtility'];

export const INDUSTRY = {
  id: 'industry',
  name: 'Industry',
  professions: ['manufacturing', 'millWork', 'coalMining', 'oilGas', 'renewableEnergy', 'waterUtility', 'publicWorks', 'lamplighter'],
  use: [MANAGEMENT, UNION],
  specialtyAt: 3,
  specialties: [
    { id: 'production', name: 'The production line', icon: '🏭' },
    { id: 'maintenanceEng', name: 'Maintenance', icon: '🔧' },
    { id: 'quality', name: 'Quality', icon: '✅', from: 1940 },
    { id: 'faceworker', name: 'At the face', icon: '⛏️', professions: MINES },
    { id: 'drilling', name: 'Drilling', icon: '🛢️', professions: ['oilGas'] },
    { id: 'wind', name: 'Wind', icon: '🌬️', professions: ['renewableEnergy'] },
    { id: 'solar', name: 'Solar', icon: '☀️', professions: ['renewableEnergy'] },
  ],
  courses: [
    { id: 'minesRescue', name: 'mines rescue brigade training', icon: '⛑️', from: 1902, professions: MINES, minGrade: 2, cost: 0, renew: 4, perf: 3 },
    { id: 'deputy', name: (s) => (COMMONWEALTH.includes(cc(s)) ? 'the deputy\'s certificate' : 'the mine foreman\'s certificate'), icon: '📜', from: 1872, professions: MINES, minGrade: 3, cost: 0, passRate: 0.7, perf: 3, gateMgmt: true },
    { id: 'offshoreSurvival', name: 'offshore survival and helicopter escape', icon: '🚁', from: 1975, professions: ['oilGas', 'renewableEnergy'], minGrade: 1, cost: 1200, renew: 4, perf: 2 },
    { id: 'leanSixSigma', name: (s) => (y(s) < 1990 ? 'a work-study course' : 'a lean manufacturing course'), icon: '📉', from: 1920, professions: ['manufacturing', 'millWork'], minGrade: 2, cost: 1500, perf: 4 },
    { id: 'waterTreatment', name: 'an advanced water treatment course', icon: '💧', from: 1920, professions: ['waterUtility', 'publicWorks'], minGrade: 2, cost: 800, perf: 3 },
  ],
  postingOdds: 0.07,
  postings: [
    { id: 'fieldsAbroad', name: (s) => (y(s) < 1950 ? 'The Oilfields of Persia' : 'An Oilfield Abroad'), icon: '🛢️', from: 1908, professions: ['oilGas'], minGrade: 3, years: 2, places: ['IR', 'SA', 'KW', 'NG', 'VE', 'NO', 'AE', 'KZ'], happiness: 3, stress: 5, text: 'The company needs experienced hands on its fields abroad for two years.' },
    { id: 'minesAbroad', name: 'The Mines Abroad', icon: '⛏️', professions: MINES, minGrade: 3, years: 2, places: ['ZA', 'AU', 'CA', 'US', 'ZM', 'CL', 'BO'], happiness: 2, stress: 5, text: 'A mining company abroad is paying well for experienced miners.' },
    { id: 'newPlant', name: 'Commissioning a New Plant', icon: '🏭', professions: ['manufacturing', 'waterUtility', 'renewableEnergy', 'publicWorks'], minGrade: 4, years: 1, happiness: 2, stress: 4, performance: 4, text: 'The firm is commissioning a new plant and wants you on the start-up team.' },
  ],
  awards: [
    { id: 'edwardMedal', name: (s) => (y(s) < 1971 ? 'the Edward Medal (Mines)' : 'the George Medal'), icon: '🏅', from: 1907, countries: COMMONWEALTH, professions: MINES, minPerformance: 85, chance: 0.015, prestige: 4, text: 'You were decorated for going back underground after the explosion.' },
    { id: 'safetyAward', name: (s) => (y(s) < 1974 ? 'a safety first award' : 'a workplace safety award'), icon: '🦺', from: 1920, minYears: 5, minPerformance: 75, chance: 0.04, prestige: 1 },
    { id: 'longServiceWorks', name: 'a long-service gold watch', icon: '⌚', minYears: 25, chance: 0.5, prestige: 1, text: 'Twenty-five years: the firm presented you with a gold watch.' },
  ],
  licence: (s) => ({ coalMining: 'mineManager', oilGas: 'wellControl', waterUtility: 'waterOperator', renewableEnergy: 'nabcep' })[prof(s)] ?? null,
  regulator: (s) => (MINES.includes(prof(s))
    ? regulatorFrom({ GB: ['HM Inspectorate of Mines', 1843], US: [y(s) < 1977 ? 'the Bureau of Mines' : 'the Mine Safety and Health Administration', 1910], '*': ['the mines inspectorate', 1900] })(s)
    : regulatorFrom({ GB: [y(s) < 1975 ? 'the Factory Inspectorate' : 'the Health and Safety Executive', 1833], US: ['OSHA', 1971], '*': ['the factory inspectorate', 1920] })(s)),
  complaintOdds: 0.015,
  complaints: [
    { id: 'shotfiring', short: 'an unsafe blast', severity: 2, weight: (s) => (MINES.includes(prof(s)) ? 2 : 0), founded: 0.45, text: 'A shot you fired brought down the roof early.' },
    { id: 'guard', short: 'a removed machine guard', severity: 2, weight: (s) => (['manufacturing', 'millWork'].includes(prof(s)) ? 2 : 0.3), founded: 0.5, text: 'A worker lost a finger on a machine whose guard you took off.' },
    { id: 'spill', short: 'a spill', severity: 2, weight: (s) => (ENERGY.includes(prof(s)) ? 2 : 0.3), founded: 0.45, text: 'A leak on your shift reached the river.' },
    ...WORKPLACE_COMPLAINTS.filter((c) => c.id !== 'expenses'),
  ],
  eliteOdds: 0.035,
  elite: [
    { id: 'worksCouncil', name: (s) => (cc(s) === 'DE' ? 'Chair of the works council (Betriebsrat)' : 'Convenor of the shop stewards'), icon: '✊', professions: ['manufacturing', 'millWork', 'coalMining'], minGrade: 2, minYears: 12, years: 4, prestige: 2, stipend: 3000, text: 'Your workmates want you to speak for them.' },
    { id: 'minersPresident', name: (s) => (cc(s) === 'GB' ? 'President of the miners\' union' : 'President of the mineworkers\' union'), icon: '⛏️', professions: MINES, minGrade: 3, minYears: 20, minAwards: 0, years: 5, prestige: 4, stipend: 15000, text: 'The coalfields have elected you to lead the union.' },
    { id: 'inspector', name: 'Inspector of factories', icon: '📋', minGrade: 5, minYears: 20, years: 6, prestige: 3, stipend: 8000, text: 'The inspectorate wants a practical man or woman who knows the floor.' },
  ],
};
