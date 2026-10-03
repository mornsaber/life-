/**
 * Every domain module the engine runs, in one place. Tick order is set by
 * each module's `order` field, not by its position here:
 *
 *   economy 1 · life 0 · region 4 · activities 5 · lifeEvents 7 · people 8 · k12 9 · education 10 · campus 11 · credentials 12 · friends 13 · community 14 · elderCare 15 · estate 16 ·
 *   military 20 · federal 24 · publicservice 25 · municipal 26 · career 30 · business 31 · jobMarket 32 · gig 32.5 · claims 33.5 ·
 *   politics 33 · legal 35 · emergency 40 · health 42 · housing 45 · vehicles 46 · retirement 85 · taxes 88 · cards 89 · investing 86 · finances 90
 */
import { Lifecycle } from './life/Lifecycle.js';
import { EconomyEngine } from './economy/EconomyEngine.js';
import { Relocation } from './life/Regions.js';
import { Disasters } from './life/Disasters.js';
import { Activities } from './life/Activities.js';
import { LifeEvents } from './life/LifeEvents.js';
import { Finances } from './life/Finances.js';
import { Taxes } from './life/Taxes.js';
import { CreditCards } from './life/CreditCards.js';
import { EducationEngine } from './education/EducationEngine.js';
import { K12Engine } from './education/K12.js';
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
import { PeopleEngine } from './people/index.js';
import { BusinessEngine } from './business/BusinessEngine.js';
import { JobMarket } from './career/JobMarket.js';
import { GigWork } from './career/GigWork.js';
import { WorkplaceClaims } from './career/WorkplaceClaims.js';
import { Vehicles } from './vehicles/Vehicles.js';
import { Friends } from './people/Friends.js';
import { ElderCare } from './people/ElderCare.js';
import { EstatePlanning } from './people/EstatePlanning.js';
import { Community } from './community/Community.js';

export const MODULES = [
  EconomyEngine, Lifecycle, Disasters, Relocation, Activities, LifeEvents, PeopleEngine, Friends, Community, ElderCare, EstatePlanning, K12Engine, EducationEngine, UniversityLife, CredentialsModule, MilitaryModule,
  FederalAgencies, PublicServiceEngine, MunicipalGov, StateAgencies, CareerModule, JobMarket, GigWork, BusinessEngine, WorkplaceClaims, PoliticsEngine, LegalModule,
  EmergencyModule, HealthEngine, HousingEngine, Vehicles, RetirementEngine, Taxes, CreditCards, BrokerageEngine, Finances,
];
