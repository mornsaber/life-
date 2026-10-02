/**
 * Every domain module the engine runs, in one place. Tick order is set by
 * each module's `order` field, not by its position here:
 *
 *   economy 1 · life 0 · region 4 · activities 5 · lifeEvents 7 · education 10 · campus 11 · credentials 12 ·
 *   military 20 · federal 24 · publicservice 25 · municipal 26 · career 30 ·
 *   politics 33 · legal 35 · emergency 40 · health 42 · housing 45 · retirement 85 · investing 86 · finances 90
 */
import { Lifecycle } from './life/Lifecycle.js';
import { EconomyEngine } from './economy/EconomyEngine.js';
import { Relocation } from './life/Regions.js';
import { Disasters } from './life/Disasters.js';
import { Activities } from './life/Activities.js';
import { LifeEvents } from './life/LifeEvents.js';
import { Finances } from './life/Finances.js';
import { EducationEngine } from './education/EducationEngine.js';
import { CredentialsModule } from './credentials/index.js';
import { CareerModule } from './career/index.js';
import { MilitaryModule } from './military/index.js';
import { EmergencyModule } from './emergency/index.js';
import { PublicServiceEngine, MunicipalGov, StateAgencies, FederalAgencies } from './publicservice/index.js';
import { LegalModule } from './legal/index.js';
import { RetirementEngine } from './retirement/RetirementEngine.js';
import { HousingEngine } from './realestate/index.js';
import { PoliticsEngine } from './politics/index.js';
import { BrokerageEngine } from './investing/index.js';
import { HealthEngine } from './health/index.js';
import { UniversityLife } from './campus/index.js';

export const MODULES = [
  EconomyEngine, Lifecycle, Disasters, Relocation, Activities, LifeEvents, EducationEngine, UniversityLife, CredentialsModule, MilitaryModule,
  FederalAgencies, PublicServiceEngine, MunicipalGov, StateAgencies, CareerModule, PoliticsEngine, LegalModule,
  EmergencyModule, HealthEngine, HousingEngine, RetirementEngine, BrokerageEngine, Finances,
];
