/**
 * Every domain module the engine runs, in one place. Tick order is set by
 * each module's `order` field, not by its position here:
 *
 *   life 0 · region 4 · activities 5 · education 10 · credentials 12 ·
 *   military 20 · federal 24 · publicservice 25 · municipal 26 · career 30 ·
 *   legal 35 · emergency 40 · retirement 85 · finances 90
 */
import { Lifecycle } from './life/Lifecycle.js';
import { Relocation } from './life/Regions.js';
import { Activities } from './life/Activities.js';
import { Finances } from './life/Finances.js';
import { EducationEngine } from './education/EducationEngine.js';
import { CredentialsModule } from './credentials/index.js';
import { CareerModule } from './career/index.js';
import { MilitaryModule } from './military/index.js';
import { EmergencyModule } from './emergency/index.js';
import { PublicServiceEngine, MunicipalGov, FederalAgencies } from './publicservice/index.js';
import { LegalModule } from './legal/index.js';
import { RetirementEngine } from './retirement/RetirementEngine.js';

export const MODULES = [
  Lifecycle, Relocation, Activities, EducationEngine, CredentialsModule, MilitaryModule,
  FederalAgencies, PublicServiceEngine, MunicipalGov, CareerModule, LegalModule,
  EmergencyModule, RetirementEngine, Finances,
];
