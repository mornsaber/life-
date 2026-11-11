/**
 * Every vocation pack (career/Vocations.js). One family of jobs per file; a job belongs to the
 * first pack that lists it.
 */
import { MEDICINE } from './medicine.js';
import { TRADES } from './trades.js';
import { BUSINESS } from './business.js';
import { ARTS } from './arts.js';
import { SERVICE } from './service.js';

export const PACKS = [MEDICINE, TRADES, BUSINESS, ARTS, SERVICE];
