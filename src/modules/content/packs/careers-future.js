/**
 * Careers the future brings (world/History.js, loose futures): they open only once this
 * world has had the change that creates them (`futureNeeds`, checked in world/Eras.js).
 *
 *   aiOps          AI operations: the people who train, supervise, audit and answer for the
 *                  machines doing everyone else's work (after the AI wave)
 *   spaceIndustry  commercial spaceflight: launch crews, orbital engineers, astronauts (after
 *                  launch costs collapse)
 */
const careers = {
  aiOps: {
    id: 'aiOps', name: 'AI Operations', icon: '🤖', sector: 'private', payMultiplier: 1.25, minAge: 18,
    futureNeeds: 'aiWave', cyclical: 0.8,
    employers: ['Synthex Labs', 'Northlight AI', 'Cobalt Intelligence', 'Meridian Models'],
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['annotator', 'AI Trainer', 2, { years: 2 }],
      ['operator', 'AI Systems Operator', 3, { entry: true }],
      ['auditor', 'AI Safety Auditor', 5],
      ['lead', 'AI Operations Lead', 6, { abilities: ['supervise'], reports: 20 }],
      ['head', 'Head of AI Oversight', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'policy'], reports: 200 }],
    ],
  },
  spaceIndustry: {
    id: 'spaceIndustry', name: 'Commercial Spaceflight', icon: '🚀', sector: 'private', payMultiplier: 1.3, minAge: 18,
    futureNeeds: 'spaceIndustry', background: 'strict',
    employers: ['Helios Launch', 'Orbital Frontier', 'Kestrel Aerospace', 'Ares Transport'],
    entry: { education: { level: 'bachelor' } },
    ladder: [
      ['tech', 'Launch Technician', 2, { years: 2 }],
      ['engineer', 'Orbital Systems Engineer', 4, { entry: true }],
      ['astronaut', 'Commercial Astronaut', 6],
      ['commander', 'Mission Commander', 7, { abilities: ['supervise'], reports: 12 }],
      ['director', 'Director of Flight Operations', 8, { track: 'mgmt', abilities: ['supervise', 'budget', 'policy'], reports: 300 }],
    ],
  },
};

export default { id: 'careers-future', version: 1, careers };
