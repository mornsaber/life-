/**
 * Federal careers outside the agencies in publicservice/: the Postal
 * Service, the federal law-enforcement agencies (FBI, DEA, ATF, U.S.
 * Marshals, Secret Service) and Social Security / VA claims staff.
 *
 * Federal law enforcement:
 *   - New special agents must be hired before 37 and retire at 57.
 *   - Each agency trains its own (FBI and DEA at Quantico; ATF, the
 *     Marshals and the Secret Service at FLETC).
 *   - Every agent needs a Top Secret clearance — with a polygraph.
 *
 * Claims staff link to the disability system: people who've worked SSA or
 * VA claims know how to document their own (better SSDI odds).
 */
import { L } from './Ladder.js';
import { JUSTICE_EVENTS, INCIDENT_ICONS } from './JusticeCareers.js';
import careersPack, { EM_AGENCIES, FED_LE_MAX_AGE, FED_LE_RETIREMENT, agency, emergencyHq } from '../content/packs/careers-government.js';
export { EM_AGENCIES, FED_LE_MAX_AGE, FED_LE_RETIREMENT, agency, emergencyHq };





/* The careers themselves (GOV_PROFESSIONS) live in content/packs/careers-government.js. */

export const GOV_EVENTS = {
  postal: [
    { title: 'The Dog on Route 14', text: 'A loose pit bull charges you at the gate.', options: [
      { id: 'spray', label: '🧴 Use your dog spray and back away', perf: 2 },
      { id: 'skip', label: '📭 Skip the house and file a dog warning', perf: 1 },
    ] },
    { title: 'Mandatory Overtime in December', text: 'Peak season: 12-hour days, six days a week.', options: [
      { id: 'work', label: '📦 Carry it all', perf: 5, stress: 6 },
      { id: 'grieve', label: '✊ File a grievance over the overtime list', perf: 0 },
    ] },
  ],
  fbi: [
    { title: 'Wire Room', text: 'Your Title III wiretap catches a cartel facilitator discussing a shipment — and a corrupt sheriff.', options: [
      { id: 'build', label: '🗂️ Keep building the case', perf: 7, stress: 4 },
      { id: 'arrest', label: '🚔 Move now before the evidence moves', perf: 4, risk: 0.15 },
    ] },
  ],
  dea: [
    { title: 'Controlled Buy', text: 'Your informant wants to go into the stash house alone.', options: [
      { id: 'cover', label: '🚗 Cover him from the van', perf: 6, risk: 0.15 },
      { id: 'abort', label: '🛑 Abort the buy', perf: -2 },
    ] },
  ],
  atf: [
    { title: 'Suspicious Device', text: 'A pipe bomb is found outside a courthouse.', options: [
      { id: 'render', label: '💣 Render it safe yourself', perf: 9, risk: 0.2 },
      { id: 'robot', label: '🤖 Wait for the robot', perf: 4 },
    ] },
  ],
  usms: [
    { title: 'Fugitive Warrant', text: 'A murder suspect who skipped trial is holed up in his mother\'s house.', options: [
      { id: 'knock', label: '🚪 Knock and announce with the task force', perf: 7, risk: 0.2 },
      { id: 'wait', label: '⏳ Surround it and wait him out', perf: 5 },
    ] },
  ],
  usss: [
    { title: 'Rope Line', text: 'At a campaign event, a man in the crowd reaches into his jacket.', options: [
      { id: 'cover', label: '🛡️ Cover and evacuate the protectee', perf: 8, risk: 0.1 },
      { id: 'watch', label: '👀 Keep eyes on him and radio it in', perf: 3 },
    ] },
  ],
  benefitsClaims: [
    { title: 'The Backlog', text: 'Your office has 4,000 pending claims. Management wants decisions out faster.', options: [
      { id: 'careful', label: '🔍 Keep developing each file properly', perf: 2, stress: 3 },
      { id: 'fast', label: '⏩ Speed up — deny when the file is thin', perf: 5, boss: 4 },
    ] },
    { title: 'A Veteran at the Counter', text: 'A Vietnam veteran with Agent Orange exposure was denied years ago and doesn\'t know he can reopen.', options: [
      { id: 'help', label: '🤝 Walk him through a supplemental claim', perf: 4 },
      { id: 'next', label: '🎟️ Take the next number', perf: 0 },
    ] },
  ],
};

// Their on-the-job incidents play through the shared incident module (JusticeCareers.js).
Object.assign(JUSTICE_EVENTS, GOV_EVENTS);
for (const [id, p] of Object.entries(careersPack.careers)) INCIDENT_ICONS[id] = p.icon;
