/**
 * Every domain module the engine runs, in one place. Tick order is set by
 * each module's `order` field, not by its position here.
 */
import { Lifecycle } from './life/Lifecycle.js';
import { Activities } from './life/Activities.js';
import { Finances } from './life/Finances.js';
import { EducationEngine } from './education/EducationEngine.js';
import { CareerModule } from './career/index.js';
import { MilitaryModule } from './military/index.js';
import { EmergencyModule } from './emergency/index.js';

export const MODULES = [Lifecycle, Activities, EducationEngine, MilitaryModule, CareerModule, EmergencyModule, Finances];
