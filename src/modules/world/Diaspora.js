/**
 * Who lives in each country: the share of people with immigrant-background
 * names, and where those names come from (other countries' pools, plus a
 * few communities that aren't playable countries). Shares are rounded from
 * national statistics on foreign-born or foreign-origin residents.
 */
export const COMMUNITY_NAMES = {
  turkish: { male: ['Mehmet', 'Mustafa', 'Ahmet', 'Emre', 'Can', 'Burak', 'Yusuf'], female: ['Ayşe', 'Fatma', 'Elif', 'Zeynep', 'Emine', 'Merve', 'Selin'], last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Öztürk', 'Aydın'] },
  maghreb: { male: ['Mohamed', 'Karim', 'Youssef', 'Mehdi', 'Rachid', 'Samir', 'Bilal'], female: ['Fatima', 'Samira', 'Nadia', 'Leïla', 'Yasmine', 'Amina', 'Inès'], last: ['Benali', 'Haddad', 'Belkacem', 'Mansouri', 'Bouzid', 'Cherif', 'Amrani'] },
  chinese: { male: ['Wei', 'Jun', 'Hao', 'Ming', 'Jian', 'Lei', 'Kai'], female: ['Mei', 'Li', 'Xin', 'Yan', 'Jing', 'Hui', 'Lin'], last: ['Wang', 'Li', 'Zhang', 'Chen', 'Liu', 'Huang', 'Wong'] },
  polish: { male: ['Piotr', 'Krzysztof', 'Tomasz', 'Paweł', 'Michał', 'Jakub', 'Marcin'], female: ['Anna', 'Katarzyna', 'Magdalena', 'Agnieszka', 'Joanna', 'Monika', 'Ewa'], last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński'] },
  vietnamese: { male: ['Minh', 'Tuan', 'Hung', 'Duc', 'Long', 'Quang', 'Thanh'], female: ['Linh', 'Lan', 'Hoa', 'Mai', 'Thu', 'Huong', 'Ngoc'], last: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu', 'Dang'] },
  westAfrican: { male: ['Mamadou', 'Ibrahima', 'Moussa', 'Oumar', 'Chinedu', 'Kwame', 'Emeka'], female: ['Aminata', 'Fatoumata', 'Mariam', 'Aïssatou', 'Ngozi', 'Ama', 'Chioma'], last: ['Diallo', 'Traoré', 'Koné', 'Ndiaye', 'Okafor', 'Mensah', 'Diop'] },
  pakistani: { male: ['Muhammad', 'Ali', 'Imran', 'Hassan', 'Bilal', 'Usman', 'Zain'], female: ['Ayesha', 'Fatima', 'Sana', 'Hina', 'Zainab', 'Mariam', 'Noor'], last: ['Khan', 'Hussain', 'Ahmed', 'Malik', 'Iqbal', 'Butt', 'Qureshi'] },
  romanian: { male: ['Andrei', 'Ion', 'Mihai', 'Alexandru', 'Florin', 'Gabriel', 'Cristian'], female: ['Elena', 'Maria', 'Ioana', 'Andreea', 'Alina', 'Cristina', 'Mihaela'], last: ['Popescu', 'Ionescu', 'Popa', 'Dumitru', 'Stan', 'Stoica', 'Gheorghe'] },
};

/**
 * share   chance a new person has an immigrant-background name
 * from    [[source, weight]]: a playable country id or a COMMUNITY_NAMES key
 */
export const DIASPORA = {
  CA: { share: 0.26, from: [['IN', 3], ['chinese', 3], ['PH', 2], ['GB', 1], ['IT', 1]] },
  GB: { share: 0.16, from: [['IN', 3], ['pakistani', 3], ['polish', 2], ['westAfrican', 2], ['chinese', 1], ['romanian', 1]] },
  DE: { share: 0.24, from: [['turkish', 5], ['polish', 2], ['romanian', 2], ['IT', 1], ['maghreb', 1]] },
  JP: { share: 0.025, from: [['chinese', 3], ['KR', 2], ['vietnamese', 2], ['PH', 1]] },
  KR: { share: 0.035, from: [['chinese', 4], ['vietnamese', 3], ['PH', 1]] },
  IT: { share: 0.1, from: [['romanian', 4], ['maghreb', 3], ['chinese', 1], ['PH', 1]] },
  MX: { share: 0.01, from: [['US', 3]] },
  PH: { share: 0.02, from: [['chinese', 3]] },
  IN: { share: 0, from: [] },
  AU: { share: 0.28, from: [['GB', 3], ['IN', 2], ['chinese', 3], ['vietnamese', 1], ['IT', 1], ['PH', 1]] },
  FR: { share: 0.2, from: [['maghreb', 5], ['westAfrican', 3], ['turkish', 1], ['vietnamese', 1], ['IT', 1]] },
};
