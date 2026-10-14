/**
 * Private-sector job titles by country. Companies in Japan and Korea run on
 * seniority ranks (kachō, buchō; gwajang, bujang), German firms on
 * Abteilungsleiter and Prokura, French ones on cadres and the PDG. The map
 * is by US title, so it applies to every private career that uses it.
 */
export const PRIVATE_TITLES = {
  JP: {
    'Junior Analyst': 'Shain (Staff)', Analyst: 'Shain (Staff)', 'Senior Analyst': 'Shunin (Senior Staff)', 'Senior Specialist': 'Shunin (Senior Specialist)', 'Principal Consultant': 'Senmon-shoku (Expert)',
    'Team Supervisor': 'Kakarichō (Section Chief)', 'Operations Manager': 'Kachō (Manager)', Director: 'Buchō (General Manager)', 'Senior Director': 'Honbuchō (Division Head)',
    'Vice President': 'Torishimariyaku (Board Director)', 'Chief Executive Officer': 'Shachō (President & CEO)', 'Store Manager': 'Tenchō (Store Manager)', 'Assistant Manager': 'Fuku-tenchō (Assistant Manager)',
  },
  KR: {
    'Junior Analyst': 'Sawon (Staff)', Analyst: 'Juim (Associate)', 'Senior Analyst': 'Daeri (Assistant Manager)', 'Senior Specialist': 'Chaekim (Senior Specialist)',
    'Team Supervisor': 'Gwajang (Manager)', 'Operations Manager': 'Chajang (Deputy General Manager)', Director: 'Bujang (General Manager)', 'Senior Director': 'Isa (Director)',
    'Vice President': 'Jeonmu (Executive Vice President)', 'Chief Executive Officer': 'Daepyo Isa (CEO)', 'Store Manager': 'Jeomjang (Store Manager)',
  },
  DE: {
    'Junior Analyst': 'Junior Referent', Analyst: 'Referent', 'Senior Analyst': 'Senior Referent', 'Senior Specialist': 'Fachexperte',
    'Team Supervisor': 'Teamleiter', 'Operations Manager': 'Abteilungsleiter', Director: 'Bereichsleiter', 'Senior Director': 'Prokurist (Hauptabteilungsleiter)',
    'Vice President': 'Geschäftsführer', 'Chief Executive Officer': 'Vorstandsvorsitzender', 'Store Manager': 'Filialleiter', 'Assistant Manager': 'Stellvertretender Filialleiter',
  },
  FR: {
    'Junior Analyst': 'Chargé d\'études junior', Analyst: 'Chargé d\'études', 'Senior Analyst': 'Chargé d\'études senior', 'Team Supervisor': 'Chef d\'équipe', 'Operations Manager': 'Responsable de service',
    Director: 'Directeur', 'Senior Director': 'Directeur de division', 'Vice President': 'Directeur général délégué', 'Chief Executive Officer': 'Président-directeur général (PDG)', 'Store Manager': 'Directeur de magasin',
  },
  IT: {
    'Team Supervisor': 'Capo reparto', 'Operations Manager': 'Responsabile operativo', Director: 'Dirigente', 'Senior Director': 'Direttore di divisione',
    'Vice President': 'Direttore generale', 'Chief Executive Officer': 'Amministratore delegato', 'Store Manager': 'Direttore di punto vendita',
  },
  MX: {
    'Team Supervisor': 'Jefe de área', 'Operations Manager': 'Gerente de operaciones', Director: 'Director de área', 'Senior Director': 'Director de división',
    'Vice President': 'Director general adjunto', 'Chief Executive Officer': 'Director general', 'Store Manager': 'Gerente de tienda',
  },
  GB: { 'Vice President': 'Executive Director', 'Senior Director': 'Divisional Director', 'Operations Manager': 'Operations Manager', 'Chief Executive Officer': 'Chief Executive' },
  AU: { 'Vice President': 'General Manager', 'Senior Director': 'Head of Division' },
  IN: { 'Vice President': 'Vice President', 'Senior Director': 'General Manager', 'Chief Executive Officer': 'Managing Director & CEO' },
  PH: { 'Senior Director': 'Assistant Vice President', 'Chief Executive Officer': 'President & CEO' },
};
