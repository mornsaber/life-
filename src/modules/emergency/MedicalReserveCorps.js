/**
 * Medical Reserve Corps — licensed medical and public-health volunteers who
 * staff mass vaccination clinics, disaster medical stations and surge
 * capacity in local emergencies. Requires an existing medical credential.
 */
export const MedicalReserveCorps = {
  id: 'mrc',
  name: 'Medical Reserve Corps',
  short: 'MRC',
  icon: '⚕️',
  minAge: 18,
  requirements: { health: 40 },
  requiresCredentials: ['emt', 'paramedic', 'rn', 'np', 'medicalLicense', 'cna', 'pharmacistLicense', 'lcsw'],
  units: ['County Medical Reserve Corps', 'Metro Health MRC', 'Tri-County MRC', 'Coastal Region MRC'],
  callsPerYear: [3, 12],
  stipendPerCall: 0,
  ranks: [
    { title: 'MRC Volunteer', xp: 0 },
    { title: 'Clinic Lead', xp: 80, cert: 'acls' },
    { title: 'Medical Branch Director', xp: 240, cert: 'ics300' },
    { title: 'MRC Unit Coordinator', xp: 480, cert: 'ics300', minYears: 5 },
  ],
  credentials: ['acls', 'ics300', 'hazmatOps', 'emt'],
  trainingBudget: 1000,
  drills: [
    'Point-of-dispensing (POD) exercise for a simulated anthrax release.',
    'Mass-casualty triage drill with the hospital coalition.',
    'Flu vaccination clinic at the senior center.',
    'Radiation screening exercise with the health department.',
  ],
  awards: {
    valor: { name: 'Surgeon General\'s MRC Valor Award', icon: '⚕️', prestige: 22, ribbon: [['#003366', 3], ['#c5a100', 1], ['#003366', 3]] },
    lifesaving: { name: 'MRC Lifesaving Commendation', icon: '🫀', prestige: 13, ribbon: [['#003366', 2], ['#fff', 3], ['#003366', 2]] },
    merit: { name: 'MRC Service Award', icon: '📜', prestige: 5, ribbon: [['#c5a100', 2], ['#003366', 3], ['#c5a100', 2]] },
  },
  dispatches: [
    {
      id: 'massVax', title: '💉 Mass Vaccination Clinic',
      text: 'A measles outbreak; the health department needs 5,000 vaccinations in a weekend.',
      options: [
        { id: 'lead', label: 'Run a vaccination line and supervise new volunteers', cert: 'ics300', success: 0.9, risk: 0.05, xp: 20, stat: 'smarts', successText: '5,412 shots in two days. The outbreak stalled.', failText: 'A cold-chain failure spoiled a batch of vaccine.' },
        { id: 'shots', label: 'Give shots all weekend', success: 0.95, risk: 0.05, xp: 12, successText: 'Your arm is tired. Hundreds of kids are protected.', failText: 'The line was so long people left.' },
      ],
    },
    {
      id: 'mci', title: '🚑 Mass-Casualty Incident',
      text: 'A bus crash on the interstate sent 30 injured to a hospital built for a dozen trauma patients.',
      options: [
        { id: 'acls', label: 'Work the resuscitation bay', cert: 'acls', success: 0.75, risk: 0.1, xp: 30, heroic: true, save: true, successText: 'You ran two codes back to back. Both patients made it to surgery.', failText: 'You lost one despite everything.' },
        { id: 'triage', label: 'Triage arrivals at the ambulance bay', success: 0.85, risk: 0.05, xp: 20, stat: 'smarts', save: true, successText: 'Your triage got the sickest patients seen first.', failText: 'A quiet internal bleed slipped past triage.' },
      ],
    },
    {
      id: 'coolingCenter', title: '🌡️ Heat Emergency',
      text: 'A week-long heat dome is filling ERs. The county opens cooling centers with medical stations.',
      options: [
        { id: 'station', label: 'Staff a cooling-center medical station', success: 0.9, risk: 0.05, xp: 16, save: true, successText: 'You caught three heat-stroke cases early.', failText: 'An elderly man collapsed before reaching you.' },
        { id: 'outreach', label: 'Join outreach to homeless encampments', cert: 'ics300', success: 0.8, risk: 0.1, xp: 20, save: true, successText: 'Water, electrolytes and a ride to shelter for dozens of people.', failText: 'Many refused to come in.' },
      ],
    },
    {
      id: 'shelterMed', title: '🏫 Shelter Medical Unit',
      text: 'Wildfire evacuees in a shelter need prescriptions refilled and chronic conditions managed.',
      options: [
        { id: 'meds', label: 'Reconcile medications and call in refills', success: 0.9, risk: 0, xp: 14, stat: 'smarts', successText: 'Insulin, inhalers and blood thinners for everyone who needed them.', failText: 'Pharmacies were closed; two people went without.' },
        { id: 'rounds', label: 'Do rounds on the frail and elderly', success: 0.9, risk: 0.05, xp: 12, save: true, successText: 'You found a woman with sepsis and got her to the hospital.', failText: 'A long night of small problems.' },
      ],
    },
  ],
};
