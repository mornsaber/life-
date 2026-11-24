/**
 * The interface in other languages: French, German, Spanish, Japanese and Hindi. The menus, tabs,
 * section headings, the stat names, common card titles and the main buttons are translated; the
 * story itself (event text, the life log) stays in English for now.
 *
 * Lookups are exact (`t('Money')`), or for a heading with a name after it, by its head
 * (`Your Club: Glasgow City` → `Votre club : Glasgow City`). Anything not in the table is shown as
 * written, so a missing entry never breaks a screen.
 */
export const LANGUAGES = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español', ja: '日本語', hi: 'हिन्दी' };
const ORDER = ['fr', 'de', 'es', 'ja', 'hi'];

/** English → [fr, de, es, ja, hi] */
const T = {
  // Sections and menus
  'Life': ['Vie', 'Leben', 'Vida', '人生', 'जीवन'],
  'You': ['Vous', 'Du', 'Tú', 'あなた', 'आप'],
  'Story': ['Récit', 'Geschichte', 'Historia', '物語', 'कहानी'],
  'Work': ['Travail', 'Arbeit', 'Trabajo', '仕事', 'काम'],
  'Career': ['Carrière', 'Karriere', 'Carrera', 'キャリア', 'करियर'],
  'Job': ['Emploi', 'Stelle', 'Empleo', '職', 'नौकरी'],
  'Part-time Work': ['Travail à temps partiel', 'Teilzeitarbeit', 'Trabajo a tiempo parcial', 'パートタイム', 'अंशकालिक काम'],
  'Business': ['Entreprise', 'Unternehmen', 'Negocio', '事業', 'व्यापार'],
  'School': ['École', 'Schule', 'Escuela', '学校', 'स्कूल'],
  'Education': ['Éducation', 'Bildung', 'Educación', '教育', 'शिक्षा'],
  'Licences & Certificates': ['Licences et certificats', 'Lizenzen und Zeugnisse', 'Licencias y certificados', '免許と資格', 'लाइसेंस और प्रमाणपत्र'],
  'Licenses & Certs': ['Licences et certificats', 'Lizenzen und Zeugnisse', 'Licencias y certificados', '免許と資格', 'लाइसेंस और प्रमाणपत्र'],
  'Military': ['Armée', 'Militär', 'Ejército', '軍', 'सेना'],
  'Assets': ['Biens', 'Vermögen', 'Bienes', '資産', 'संपत्ति'],
  'Money': ['Argent', 'Geld', 'Dinero', 'お金', 'पैसा'],
  'Home': ['Maison', 'Zuhause', 'Hogar', '家', 'घर'],
  'Home & Property': ['Maison et biens', 'Haus und Besitz', 'Hogar y propiedades', '家と不動産', 'घर और संपत्ति'],
  'Property': ['Biens', 'Besitz', 'Propiedades', '財産', 'संपत्ति'],
  'Property & Staff': ['Biens et domestiques', 'Besitz und Personal', 'Propiedades y servicio', '財産と使用人', 'संपत्ति और नौकर'],
  'Vehicles': ['Véhicules', 'Fahrzeuge', 'Vehículos', '乗り物', 'वाहन'],
  'Garage': ['Garage', 'Garage', 'Garaje', 'ガレージ', 'गैराज'],
  'Farm': ['Ferme', 'Hof', 'Granja', '農場', 'खेत'],
  'Relationships': ['Relations', 'Beziehungen', 'Relaciones', '人間関係', 'रिश्ते'],
  'People': ['Proches', 'Menschen', 'Personas', '人々', 'लोग'],
  'Family & Friends': ['Famille et amis', 'Familie und Freunde', 'Familia y amigos', '家族と友人', 'परिवार और मित्र'],
  'Faith & Community': ['Foi et communauté', 'Glaube und Gemeinde', 'Fe y comunidad', '信仰と地域', 'आस्था और समुदाय'],
  'Community': ['Communauté', 'Gemeinde', 'Comunidad', '地域', 'समुदाय'],
  'Health': ['Santé', 'Gesundheit', 'Salud', '健康', 'स्वास्थ्य'],
  'Doctor & Health': ['Médecin et santé', 'Arzt und Gesundheit', 'Médico y salud', '医者と健康', 'डॉक्टर और स्वास्थ्य'],
  'Conditions': ['Maladies', 'Erkrankungen', 'Enfermedades', '病気', 'बीमारियाँ'],
  'Cover': ['Assurance', 'Versicherung', 'Seguro', '保険', 'बीमा'],
  'Lifestyle': ['Mode de vie', 'Lebensstil', 'Estilo de vida', '生活習慣', 'जीवनशैली'],
  'Activities': ['Activités', 'Aktivitäten', 'Actividades', '活動', 'गतिविधियाँ'],
  'Legal': ['Justice', 'Recht', 'Legal', '法律', 'कानूनी'],
  'Cases': ['Affaires', 'Fälle', 'Casos', '事件', 'मामले'],
  'Crime': ['Crime', 'Verbrechen', 'Crimen', '犯罪', 'अपराध'],
  'Underworld': ['Pègre', 'Unterwelt', 'Bajos fondos', '裏社会', 'अंडरवर्ल्ड'],
  'Move & Travel': ['Déménager et voyager', 'Umziehen und Reisen', 'Mudarse y viajar', '引越しと旅', 'स्थानांतरण और यात्रा'],
  'Politics': ['Politique', 'Politik', 'Política', '政治', 'राजनीति'],
  'Chamber': ['Assemblée', 'Kammer', 'Cámara', '議会', 'सदन'],
  'Emergency Services': ['Secours', 'Rettungsdienste', 'Servicios de emergencia', '緊急サービス', 'आपातकालीन सेवाएँ'],
  'Volunteering': ['Bénévolat', 'Ehrenamt', 'Voluntariado', 'ボランティア', 'स्वयंसेवा'],
  'The Crown': ['La Couronne', 'Die Krone', 'La Corona', '王室', 'राजमुकुट'],
  'Society': ['Société', 'Gesellschaft', 'Sociedad', '社交界', 'समाज'],
  'High Society': ['Haute société', 'Hohe Gesellschaft', 'Alta sociedad', '上流社会', 'उच्च समाज'],
  'Goals': ['Objectifs', 'Ziele', 'Metas', '目標', 'लक्ष्य'],
  'Achievements': ['Exploits', 'Erfolge', 'Logros', '実績', 'उपलब्धियाँ'],
  'The World': ['Le monde', 'Die Welt', 'El mundo', '世界', 'दुनिया'],
  'World': ['Monde', 'Welt', 'Mundo', '世界', 'दुनिया'],
  'Résumé': ['CV', 'Lebenslauf', 'Currículum', '履歴書', 'बायोडाटा'],
  'Curriculum Vitae': ['Curriculum vitae', 'Lebenslauf', 'Currículum vítae', '履歴書', 'बायोडाटा'],
  'War': ['Guerre', 'Krieg', 'Guerra', '戦争', 'युद्ध'],
  'Study & work': ['Études et travail', 'Lernen und Arbeit', 'Estudios y trabajo', '学業と仕事', 'पढ़ाई और काम'],
  'Leisure & health': ['Loisirs et santé', 'Freizeit und Gesundheit', 'Ocio y salud', '余暇と健康', 'अवकाश और स्वास्थ्य'],
  'Service & public life': ['Service et vie publique', 'Dienst und öffentliches Leben', 'Servicio y vida pública', '奉仕と公共生活', 'सेवा और सार्वजनिक जीवन'],
  'The law': ['La loi', 'Das Gesetz', 'La ley', '法', 'कानून'],
  'Closest to you': ['Vos proches', 'Ihnen am nächsten', 'Los más cercanos', '親しい人', 'आपके सबसे करीब'],
  // Stats and the age button
  'Happiness': ['Bonheur', 'Glück', 'Felicidad', '幸福', 'खुशी'],
  'Smarts': ['Intelligence', 'Klugheit', 'Inteligencia', '知性', 'बुद्धि'],
  'Looks': ['Apparence', 'Aussehen', 'Apariencia', '容姿', 'रूप'],
  'Fitness': ['Forme', 'Fitness', 'Forma física', '体力', 'फिटनेस'],
  'Stress': ['Stress', 'Stress', 'Estrés', 'ストレス', 'तनाव'],
  'Age': ['Âge', 'Alter', 'Edad', '年齢', 'आयु'],
  'Decide': ['Décider', 'Entscheiden', 'Decidir', '決める', 'निर्णय'],
  // Common cards
  'Life Story': ['Histoire de vie', 'Lebensgeschichte', 'Historia de vida', '人生の物語', 'जीवन कथा'],
  'Front Page': ['À la une', 'Titelseite', 'Portada', '一面', 'मुख पृष्ठ'],
  'Going Out': ['Sortir', 'Ausgehen', 'Salir', 'お出かけ', 'बाहर जाना'],
  'Your Club': ['Votre club', 'Dein Verein', 'Tu club', 'あなたのクラブ', 'आपका क्लब'],
  'In the House': ['Dans la maison', 'Im Haus', 'En casa', '家の中', 'घर में'],
  'The Household': ['Le ménage', 'Der Haushalt', 'El hogar', '家計', 'घर-गृहस्थी'],
  'What You Own': ['Ce que vous possédez', 'Was dir gehört', 'Lo que posees', '所有物', 'आपकी संपत्ति'],
  'Household Staff': ['Domestiques', 'Hauspersonal', 'Servicio doméstico', '使用人', 'घरेलू कर्मचारी'],
  'Letters': ['Lettres', 'Briefe', 'Cartas', '手紙', 'पत्र'],
  'After You': ['Après vous', 'Nach dir', 'Después de ti', 'あなたの後', 'आपके बाद'],
  'Workshop': ['Atelier', 'Werkstatt', 'Taller', '工房', 'कार्यशाला'],
  'Credit': ['Crédit', 'Bonität', 'Crédito', '信用', 'साख'],
  'The World in': ['Le monde en', 'Die Welt im Jahr', 'El mundo en', '世界', 'दुनिया'],
  'Your City': ['Votre ville', 'Deine Stadt', 'Tu ciudad', 'あなたの街', 'आपका शहर'],
  'Settings': ['Réglages', 'Einstellungen', 'Ajustes', '設定', 'सेटिंग्स'],
  'Language': ['Langue', 'Sprache', 'Idioma', '言語', 'भाषा'],
  'Theme': ['Thème', 'Design', 'Tema', 'テーマ', 'थीम'],
};

let LANG = 'en';
export function setLanguage(lang, doc = globalThis.document) {
  LANG = LANGUAGES[lang] ? lang : 'en';
  if (doc?.documentElement) doc.documentElement.lang = LANG;
}
export const language = () => LANG;

/** Translate a label; unknown strings come back as they are. */
export function t(s) {
  if (LANG === 'en' || s == null) return s;
  const i = ORDER.indexOf(LANG);
  const str = String(s);
  if (T[str]) return T[str][i];
  // "Head: name" or "Head · 1900": translate the head.
  const m = str.match(/^(.+?)(: | · | in )(.+)$/);
  if (m && T[m[1]]) return `${T[m[1]][i]}${m[2] === ' in ' ? ' ' : m[2]}${m[3]}`;
  if (m && T[`${m[1]}${m[2].trimEnd()}`]) return `${T[`${m[1]}${m[2].trimEnd()}`][i]} ${m[3]}`;
  // "🏟️ Label": translate what follows the icon.
  const icon = str.match(/^(\S+\s)(.+)$/u);
  if (icon && !/\p{L}/u.test(icon[1]) && T[icon[2]]) return `${icon[1]}${T[icon[2]][i]}`;
  return str;
}
