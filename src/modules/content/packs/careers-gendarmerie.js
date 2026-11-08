/**
 * Gendarmeries and paramilitary police: police forces with military status and military ranks
 * (France's Gendarmerie nationale, Italy's Carabinieri, Spain's Guardia Civil, the Royal
 * Marechaussee, Turkey's Jandarma, Chile's Carabineros, India's CRPF...). This is the template;
 * each country's force, its name and its ranks, is in world/NationalAgencies.js (template
 * 'gendarmerie'). It never appears on its own.
 */
const careers = {
  gendarmerie: {
    id: 'gendarmerie', name: 'Gendarmerie (template)', icon: '🎖️', sector: 'state', payMultiplier: 0.95, minAge: 18, templateOnly: true,
    background: 'strict', layoffRate: 0, union: null,
    employers: ['the Gendarmerie'],
    entry: { education: { level: 'highschool' } },
    ladder: [
      ['gendarme', 'Gendarme', 2, { years: 2 }],
      ['corporal', 'Corporal', 3],
      ['sergeant', 'Sergeant', 3, { abilities: ['supervise'], reports: 8 }],
      ['adjutant', 'Warrant Officer', 4, { abilities: ['supervise'], reports: 20 }],
      ['lieutenant', 'Lieutenant', 4, { entry: true, req: { education: { level: 'bachelor' } }, abilities: ['supervise'], reports: 30 }],
      ['captain', 'Captain', 5, { abilities: ['supervise'], reports: 60 }],
      ['major', 'Major', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 150 }],
      ['ltColonel', 'Lieutenant Colonel', 6, { track: 'mgmt', abilities: ['supervise', 'budget'], reports: 400 }],
      ['colonel', 'Colonel', 7, { track: 'mgmt', abilities: ['supervise', 'budget', 'hire'], reports: 1500 }],
      ['general', 'General', 9, { track: 'mgmt', appointed: true, appointedBy: 'the government', abilities: ['supervise', 'budget', 'hire', 'policy'], reports: 100000 }],
    ],
  },
};

export default { id: 'careers-gendarmerie', version: 1, careers };
