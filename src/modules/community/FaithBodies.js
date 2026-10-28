/**
 * The institutions of every faith beyond the congregation: the body its clergy answer to (a
 * convention, an assembly, a synod, a council), where its ministers are trained, the offices
 * it elects or appoints, and the rites and pilgrimages its members keep.
 *
 *   body       the governing (or fellowship) body, by country where the name changes
 *   training   where clergy are formed; finishing it counts as the ministerial degree
 *   offices    [id, title, from (career level), odds a year, term in years (null = for life)]
 *   deck       which set of institutional duties its clergy and lay leaders meet
 *
 * The Catholic Church (dioceses, orders, the Holy See) and the Church of England (dioceses,
 * the Lords Spiritual) have their own hierarchies elsewhere; here they have rites only.
 *
 * Pure data and helpers.
 */
import { TRADITIONS } from './Religions.js';

const O = (id, title, from, odds, term = null) => ({ id, title, from, odds, term });

export const FAITH_BODIES = {
  mainline: {
    body: 'the Annual Conference', local: { CA: 'the United Church of Canada', AU: 'the Uniting Church Assembly', NL: 'the Synod of the Protestant Church', GB: 'the Methodist Conference', NZ: 'the General Assembly of the Presbyterian Church', ZA: 'the Methodist Conference of Southern Africa' },
    training: 'a United Methodist seminary (Candler, Duke Divinity, Wesley)', trainingLocal: { GB: 'Queen\'s Foundation, Birmingham', NL: 'the Protestant Theological University', CA: 'Emmanuel College, Toronto' },
    offices: [O('delegate', 'Delegate to General Conference', 'minister', 0.12, 4), O('board', 'Chair of the Board of Ordained Ministry', 'senior', 0.08, 4), O('moderator', 'President of the Council of Bishops', 'regional', 0.06, 2)],
    deck: 'protestant',
  },
  conservativeMethodist: {
    body: 'the Global Methodist Church', training: 'a Wesleyan seminary (Asbury, United Theological)',
    offices: [O('delegate', 'Delegate to the General Conference', 'minister', 0.15, 4), O('council', 'Member of the Transitional Leadership Council', 'senior', 0.08, 4), O('bishop', 'Presiding Bishop', 'regional', 0.06, 6)],
    deck: 'protestant',
  },
  evangelical: {
    body: 'a church-planting network', local: { GB: 'the Evangelical Alliance', KR: 'the Christian Council of Korea', BR: 'the Evangelical Confederation of Brazil', KE: 'the Evangelical Alliance of Kenya', NG: 'the Christian Association of Nigeria', ZA: 'The Evangelical Alliance of South Africa' },
    training: 'an evangelical seminary (Dallas, Trinity, Gordon-Conwell)', trainingLocal: { GB: 'Oak Hill College', KR: 'Chongshin University', BR: 'a Baptist theological faculty' },
    offices: [O('board', 'Board Member of the Network', 'minister', 0.1, 4), O('conference', 'Keynote Speaker on the Conference Circuit', 'senior', 0.1, 3), O('president', 'President of the Evangelical Alliance', 'regional', 0.05, 4)],
    deck: 'protestant',
  },
  churchPlant: {
    body: 'an independent network of church plants', training: 'a church-planting residency',
    offices: [O('coach', 'Church-Planting Coach', 'minister', 0.15, 3), O('founder', 'Founder of a Church-Planting Network', 'senior', 0.08)],
    deck: 'protestant',
  },
  baptist: {
    body: 'the Southern Baptist Convention', local: { GB: 'the Baptist Union of Great Britain', NG: 'the Nigerian Baptist Convention', BR: 'the Brazilian Baptist Convention' },
    training: 'a Southern Baptist seminary (Southern, Southwestern, Southeastern)',
    offices: [O('messenger', 'Messenger to the Annual Meeting', 'associate', 0.3, 1), O('state', 'President of the State Baptist Convention', 'senior', 0.06, 2), O('sbc', 'President of the Southern Baptist Convention', 'regional', 0.03, 2)],
    deck: 'baptist',
  },
  ifb: {
    body: 'a fellowship of independent Baptist churches', training: 'a fundamentalist Bible college (Hyles-Anderson, Pensacola Christian)',
    offices: [O('evangelist', 'Camp-Meeting Preacher', 'minister', 0.15, 2), O('college', 'President of a Bible College', 'senior', 0.05)],
    deck: 'baptist',
  },
  pentecostal: {
    body: 'the Assemblies of God', local: { BR: 'the Assembleia de Deus', NG: 'the Redeemed Christian Church of God', KE: 'the Pentecostal Assemblies of God – Kenya', KR: 'the Assemblies of God of Korea', GB: 'the Assemblies of God in Great Britain' },
    training: 'an Assemblies of God university (Evangel, Southeastern)',
    offices: [O('presbyter', 'Sectional Presbyter', 'minister', 0.12, 2), O('superintendent', 'District Superintendent', 'senior', 0.07, 4), O('general', 'General Superintendent', 'regional', 0.04, 4)],
    deck: 'pentecostal',
  },
  apostolic: {
    body: 'the United Pentecostal Church International', training: 'an Apostolic Bible institute',
    offices: [O('presbyter', 'Sectional Presbyter', 'minister', 0.12, 2), O('superintendent', 'General Superintendent', 'regional', 0.05, 4)],
    deck: 'pentecostal',
  },
  orthodoxChristian: {
    body: 'the Holy Synod', local: { US: 'the Assembly of Canonical Orthodox Bishops', GB: 'the Archdiocese of Thyateira and Great Britain', AU: 'the Greek Orthodox Archdiocese of Australia', RU: 'the Holy Synod of the Russian Orthodox Church', UA: 'the Holy Synod of the Orthodox Church of Ukraine', RO: 'the Holy Synod of the Romanian Orthodox Church' },
    training: 'an Orthodox seminary (St Vladimir\'s, Holy Cross)', trainingLocal: { RU: 'the Moscow Theological Academy', RO: 'the Faculty of Orthodox Theology in Bucharest' },
    offices: [O('confessor', 'Spiritual Father (Confessor) to the Clergy', 'senior', 0.1), O('chancellor', 'Chancellor of the Diocese', 'senior', 0.06, 6), O('metropolitan', 'Metropolitan', 'regional', 0.04)],
    deck: 'orthodox',
  },
  lds: {
    body: 'the Church of Jesus Christ of Latter-day Saints', lay: true,
    offices: [],
    deck: 'lds',
  },
  polygamistSect: { body: 'the Priesthood council', training: 'the Priesthood\'s own instruction', offices: [], deck: null },
  reformJewish: {
    body: 'the Union for Reform Judaism', local: { GB: 'Progressive Judaism (UK)', IL: 'the Israel Movement for Progressive Judaism', CA: 'the Union for Reform Judaism (Canada)', FR: 'Judaïsme en mouvement' },
    training: 'Hebrew Union College', trainingLocal: { GB: 'Leo Baeck College', IL: 'Hebrew Union College, Jerusalem', DE: 'the Abraham Geiger Kolleg' },
    offices: [O('ccar', 'Board Member of the Central Conference of American Rabbis', 'minister', 0.1, 3), O('president', 'President of the CCAR', 'senior', 0.05, 2), O('urj', 'President of the Union for Reform Judaism', 'regional', 0.04, 8)],
    deck: 'jewish',
  },
  conservativeJewish: {
    body: 'the Rabbinical Assembly', local: { IL: 'the Masorti Movement', GB: 'Masorti Judaism' },
    training: 'the Jewish Theological Seminary', trainingLocal: { IL: 'the Schechter Rabbinical Seminary', DE: 'the Zacharias Frankel College' },
    offices: [O('law', 'Member of the Committee on Jewish Law and Standards', 'minister', 0.08, 5), O('president', 'President of the Rabbinical Assembly', 'senior', 0.05, 2), O('chancellor', 'Chancellor of the Seminary', 'regional', 0.03)],
    deck: 'jewish',
  },
  orthodoxJewish: {
    body: 'the Rabbinical Council', local: { US: 'the Rabbinical Council of America', GB: 'the United Synagogue', IL: 'the Chief Rabbinate of Israel', FR: 'the Consistoire central israélite', AU: 'the Rabbinical Council of Victoria' },
    training: 'a yeshiva\'s semicha programme (Yeshiva University, Ner Israel)', trainingLocal: { IL: 'a yeshiva and the Chief Rabbinate\'s semicha exams', GB: 'the London School of Jewish Studies' },
    offices: [O('beth', 'Dayan of the Beth Din', 'senior', 0.08), O('rca', 'President of the Rabbinical Council', 'senior', 0.05, 2), O('chief', 'Chief Rabbi', 'regional', 0.04, 10)],
    deck: 'jewish',
  },
  hasidic: {
    body: 'the court of the Rebbe', training: 'the yeshiva and kollel',
    offices: [O('gabbai', 'Gabbai of the Rebbe\'s court', 'minister', 0.1), O('dayan', 'Dayan of the community\'s Beth Din', 'senior', 0.08)],
    deck: 'jewish',
  },
  sunni: {
    body: 'the Islamic Society', local: { US: 'the Islamic Society of North America', GB: 'the Muslim Council of Britain', FR: 'the French Council of the Muslim Faith', DE: 'the Central Council of Muslims in Germany', ID: 'Nahdlatul Ulama', NG: 'the Nigerian Supreme Council for Islamic Affairs', EG: 'Al-Azhar', IN: 'the All India Muslim Personal Law Board', SG: 'MUIS, the Islamic Religious Council of Singapore', MY: 'JAKIM', TR: 'the Diyanet' },
    training: 'a Darul Uloom and an ijazah from your teachers', trainingLocal: { EG: 'Al-Azhar University', ID: 'a pesantren and the State Islamic University', IN: 'the Darul Uloom at Deoband', SA: 'the Islamic University of Madinah', TR: 'a faculty of theology (ilahiyat)', GB: 'a Darul Uloom in Bury or Dewsbury' },
    offices: [O('council', 'Member of the Fiqh Council', 'minister', 0.08, 4), O('mufti', 'Mufti', 'senior', 0.06), O('grand', 'Grand Mufti', 'regional', 0.03)],
    deck: 'muslim',
  },
  shia: {
    body: 'the office of the Marja\'', local: { IQ: 'the hawza of Najaf', IR: 'the hawza of Qom', LB: 'the Supreme Islamic Shia Council' },
    training: 'the hawza (Qom or Najaf)', trainingLocal: { IQ: 'the hawza of Najaf', IR: 'the hawza of Qom' },
    offices: [O('wakil', 'Representative (Wakil) of a Marja\'', 'minister', 0.08), O('mujtahid', 'Mujtahid (licensed to give rulings)', 'senior', 0.05), O('ayatollah', 'Ayatollah', 'regional', 0.03)],
    deck: 'muslim',
  },
  salafi: {
    body: 'the circles of the scholars', training: 'study under the scholars (Madinah)',
    offices: [O('teacher', 'Teacher of a study circle', 'minister', 0.15), O('scholar', 'A recognised scholar', 'senior', 0.05)],
    deck: 'muslim',
  },
  hindu: {
    body: 'the temple trust', local: { US: 'the Hindu Temple Society of North America', GB: 'the Hindu Council UK', IN: 'the state Hindu Religious and Charitable Endowments Department', SG: 'the Hindu Endowments Board' },
    training: 'a Veda pathashala (gurukul)', trainingLocal: { IN: 'a Veda pathashala in Varanasi or Kanchipuram' },
    offices: [O('archaka', 'Chief Archaka (ritual authority) of the Temple', 'senior', 0.1), O('pontiff', 'Head of a Matha (Mathadhipati)', 'regional', 0.03)],
    deck: 'hindu',
  },
  buddhist: {
    body: 'the Sangha', local: { TH: 'the Supreme Sangha Council', JP: 'the head temple of your school', KR: 'the Jogye Order', LK: 'the Mahanayakas of the Siam Nikaya', US: 'the Buddhist Churches of America', MM: 'the State Sangha Maha Nayaka Committee' },
    training: 'a monastery\'s training (a three-year retreat, or a dharma college)', trainingLocal: { JP: 'a training monastery (sōdō) and Komazawa or Ryūkoku University', TH: 'Mahachulalongkornrajavidyalaya University', KR: 'Dongguk University' },
    offices: [O('preceptor', 'Preceptor (ordains novices)', 'senior', 0.1), O('council', 'Member of the Sangha Council', 'senior', 0.05, 5), O('patriarch', 'Head of the Order', 'regional', 0.02)],
    deck: 'buddhist',
  },
  sikh: {
    body: 'the Shiromani Gurdwara Parbandhak Committee', local: { GB: 'the Sikh Council UK', US: 'the Sikh Coalition', CA: 'the World Sikh Organization of Canada' },
    training: 'a Gurmat college (Taksal)', trainingLocal: { IN: 'the Shaheed Sikh Missionary College, Amritsar' },
    offices: [O('member', 'Elected Member of the SGPC', 'minister', 0.08, 5), O('president', 'President of the SGPC', 'senior', 0.03, 1), O('jathedar', 'Jathedar of the Akal Takht', 'regional', 0.02)],
    deck: 'sikh',
  },
  anglican: { body: 'the General Synod', church: 'anglican', deck: null, offices: [] },
  lutheran: {
    body: 'the Church Assembly', local: { SE: 'the Church Assembly (Kyrkomötet)', DE: 'the Synod of the EKD', US: 'the ELCA Churchwide Assembly' },
    training: 'a Lutheran seminary', trainingLocal: { SE: 'Uppsala University and the Church of Sweden Institute', DE: 'a Protestant theology faculty and a Predigerseminar' },
    offices: [O('delegate', 'Elected Member of the Church Assembly', 'minister', 0.12, 4), O('dean', 'Dean of the Cathedral', 'senior', 0.05), O('archbishop', 'Archbishop', 'regional', 0.03)],
    deck: 'protestant',
  },
  shinto: {
    body: 'Jinja Honchō (the Association of Shinto Shrines)', training: 'Kokugakuin University (the shrine priest licence)', trainingLocal: { JP: 'Kokugakuin or Kōgakkan University' },
    offices: [O('rank', 'Priest of the first grade (ittō)', 'senior', 0.08), O('ise', 'Priest of the Ise Grand Shrine', 'senior', 0.04), O('honcho', 'President of Jinja Honchō', 'regional', 0.02, 4)],
    deck: 'shinto',
  },
  chineseFolk: {
    body: 'the Taoist Association', local: { CN: 'the Chinese Taoist Association', SG: 'the Taoist Federation (Singapore)', TW: 'the Taoist Association of the Republic of China' },
    training: 'ordination at a Taoist temple (the White Cloud Temple)',
    offices: [O('master', 'Taoist Master of Ceremonies', 'minister', 0.1), O('association', 'Vice-President of the Taoist Association', 'senior', 0.05, 5)],
    deck: 'folk',
  },
  unitarian: {
    body: 'the Unitarian Universalist Association', local: { GB: 'the General Assembly of Unitarian and Free Christian Churches' },
    training: 'Starr King School for the Ministry', trainingLocal: { GB: 'Unitarian College, Manchester' },
    offices: [O('board', 'Member of the UUA Board of Trustees', 'minister', 0.1, 6), O('president', 'President of the Unitarian Universalist Association', 'senior', 0.03, 6)],
    deck: 'protestant',
  },
};

export const bodyOf = (traditionId) => FAITH_BODIES[traditionId] ?? null;
export const bodyName = (traditionId, cc = 'US') => FAITH_BODIES[traditionId]?.local?.[cc] ?? FAITH_BODIES[traditionId]?.body ?? null;
export const trainingName = (traditionId, cc = 'US') => FAITH_BODIES[traditionId]?.trainingLocal?.[cc] ?? FAITH_BODIES[traditionId]?.training ?? 'a seminary';

/* ------------------------------------------------------------------ */
/* Institutional duties                                                */
/* ------------------------------------------------------------------ */

const D = (id, icon, title, text, options) => ({ id, icon, title, text, options });

/** Duties a minister (and, less often, a lay leader) meets in the wider body. Option effects: standing, happiness, stress, cost, check. */
export const DECKS = {
  protestant: [
    D('vote', '🗳️', 'A Vote at Conference', 'The conference is voting on whether to ordain and marry LGBTQ people. Delegates are watching which way you go.', [
      { id: 'yes', label: '🏳️‍🌈 Speak in favour', standing: 4, text: 'You spoke, the hall listened, and the vote went your way by a handful. Some of your congregation left; others came.', risk: { chance: 0.3, standing: -4, text: 'A third of your congregation voted to leave the denomination.' } },
      { id: 'no', label: '📖 Speak for the traditional teaching', standing: 3, text: 'You argued from scripture and tradition. The vote went against you, but the conservatives remember who stood up.' },
      { id: 'quiet', label: '🤐 Abstain and keep the peace at home', standing: -1, text: 'You kept your congregation together, and your head down.' },
    ]),
    D('planting', '🌱', 'A New Congregation', 'The body wants a new congregation planted in a fast-growing suburb, and asks if your church will sponsor it.', [
      { id: 'sponsor', label: '🌱 Sponsor it and send members', standing: 6, stress: 4, text: 'Forty of your best members went to plant it. Three years on it has two hundred.', fail: { standing: 1, text: 'The plant struggled in a rented school gym and closed after two years.' }, check: true },
      { id: 'decline', label: '🏠 Keep your people at home', standing: -2, text: 'You said your church wasn\'t ready.' },
    ]),
    D('abuse', '⚖️', 'An Abuse Report', 'A youth worker in a neighbouring church is accused of abusing teenagers. The body\'s safeguarding committee, on which you sit, must decide what to tell the police.', [
      { id: 'report', label: '🚔 Report everything to the police', standing: 6, text: 'The police charged him. Some in the body called you disloyal; the survivors called you brave.' },
      { id: 'internal', label: '🤫 Handle it internally', standing: -8, text: 'He was moved quietly to another church.', risk: { chance: 0.5, standing: -12, text: 'A newspaper investigation named the committee — and you — for covering it up.' } },
    ]),
    D('mission', '✈️', 'A Mission Partnership', 'A partner church overseas asks your congregation to fund a clinic and a school.', [
      { id: 'fund', label: '💵 Raise the money and visit', cost: 3000, standing: 5, happiness: 4, text: 'You spent two weeks there at the opening. The children sang for you.' },
      { id: 'pray', label: '🙏 Pray for them and send a modest gift', standing: 1, text: 'A modest cheque and a letter.' },
    ]),
  ],
  baptist: [
    D('resolution', '📜', 'A Resolution at the Annual Meeting', 'Thousands of messengers will vote on a resolution barring churches with women pastors from the convention.', [
      { id: 'for', label: '✋ Support it', standing: 4, text: 'It passed. Several churches with women on staff were disfellowshipped.' },
      { id: 'against', label: '🙅 Speak against it', standing: 2, text: 'You spoke against it and lost, but were applauded by a third of the hall.' },
    ]),
    D('abuse', '⚖️', 'The Abuse Database', 'A report finds convention leaders kept a secret list of abusive ministers. You\'re asked to sit on the task force.', [
      { id: 'serve', label: '📋 Serve, and push for a public database', standing: 6, stress: 5, text: 'The database was published. Survivors thanked you; some old friends stopped calling.' },
      { id: 'decline', label: '🚪 Decline', standing: -2, text: 'You said you were too busy.' },
    ]),
    D('revival', '⛺', 'A Revival', 'The association asks you to preach a week of revival meetings in a rural county.', [
      { id: 'preach', label: '🔥 Preach every night', check: true, standing: 6, stress: 3, text: 'Thirty-one people came forward to be baptised in the river.', fail: { standing: 2, text: 'The tent stayed half empty; it rained all week.' } },
      { id: 'send', label: '📨 Send your associate', standing: 1, text: 'Your associate preached; it went fine.' },
    ]),
  ],
  pentecostal: [
    D('healing', '🔥', 'A Healing Crusade', 'You\'re asked to share a platform with a famous faith healer at a stadium crusade.', [
      { id: 'join', label: '🏟️ Take the platform', standing: 6, recognition: 3, text: 'Forty thousand people, the music, the altar call: your name went round the movement.', risk: { chance: 0.25, standing: -10, text: 'The healer was exposed as a fraud; the clip of you beside him went viral.' } },
      { id: 'decline', label: '🙏 Decline politely', standing: 0, text: 'You stayed home and preached to your own people.' },
    ]),
    D('prophecy', '📯', 'A Prophecy Dispute', 'A minister in your district is prophesying the date of the Lord\'s return. The district asks you to sit on the panel that will discipline him.', [
      { id: 'discipline', label: '⚖️ Vote to suspend his credentials', standing: 5, text: 'He was suspended and took half his church with him.' },
      { id: 'mercy', label: '🤝 Argue for counsel, not discipline', standing: 2, text: 'He was counselled, and the date came and went.' },
    ]),
  ],
  orthodox: [
    D('calendar', '📅', 'The Calendar Question', 'The synod debates moving to the revised calendar for fixed feasts. Old believers in your parish are furious.', [
      { id: 'old', label: '📜 Keep the old calendar', standing: 3, text: 'Christmas stays on 7 January. The grandmothers were pleased.' },
      { id: 'new', label: '🗓️ Support the revised calendar', standing: 2, text: 'The synod adopted it narrowly; a few families went to an Old Calendarist parish.' },
    ]),
    D('athos', '⛰️', 'A Retreat on the Holy Mountain', 'Your bishop sends you on retreat to a monastery on Mount Athos.', [
      { id: 'go', label: '🛶 Go, for a month of silence', standing: 4, happiness: 5, stress: -8, text: 'Vigils through the night, the Jesus Prayer, the sea at dawn. You came back quieter.' },
    ]),
    D('war', '🕊️', 'War and the Patriarchate', 'A war divides the Orthodox world; the patriarchates are taking sides. Your parish has families from both countries.', [
      { id: 'peace', label: '🕊️ Preach peace and refuse to take sides', standing: 4, text: 'You kept both families in the church. Your bishop was not entirely pleased.' },
      { id: 'side', label: '📣 Follow your patriarch\'s line', standing: 2, text: 'Several families left for another parish.' },
    ]),
  ],
  lds: [
    D('calling', '📋', 'A Calling', 'The stake president extends a new calling: hours every week, unpaid.', [
      { id: 'accept', label: '🙏 Accept', standing: 5, stress: 3, text: 'You were set apart for it the next Sunday.' },
      { id: 'decline', label: '🙅 Ask to be excused', standing: -3, text: 'He understood; the bishop looked disappointed.' },
    ]),
    D('temple', '🕍', 'Temple Service', 'The temple needs volunteers for ordinance work.', [
      { id: 'serve', label: '🕍 Serve a shift each week', standing: 4, happiness: 3, text: 'Quiet hours in white, in the celestial room.' },
    ]),
  ],
  jewish: [
    D('conversion', '✡️', 'A Conversion Case', 'A woman who has studied for three years asks your beth din to convert her. Her fiancé\'s family insists the conversion be accepted everywhere.', [
      { id: 'accept', label: '🌊 Accept her: the mikveh next week', standing: 4, happiness: 3, text: 'She immersed, and came up a Jew. The wedding was in spring.' },
      { id: 'strict', label: '📜 Ask her to keep studying', standing: 1, text: 'Another year of study. She came back.' },
    ]),
    D('israel', '🇮🇱', 'A Statement on Israel', 'War in Gaza has split your community. The body asks its rabbis to sign a joint statement.', [
      { id: 'sign', label: '✍️ Sign', standing: 3, text: 'Half your board thanked you; the other half wrote letters.' },
      { id: 'own', label: '🗣️ Write your own sermon instead', check: true, standing: 5, text: 'Your Shabbat sermon on grief and responsibility was shared across the country.', fail: { standing: -3, text: 'The sermon pleased nobody; three families resigned.' } },
    ]),
    D('kashrut', '🍽️', 'A Kashrut Dispute', 'A popular caterer\'s kosher certificate is in question. You\'re asked to rule.', [
      { id: 'pull', label: '🚫 Withdraw the certificate', standing: 4, text: 'The caterer fixed the kitchen within a month and got it back.' },
      { id: 'warn', label: '⚠️ Give a warning', standing: 1, text: 'A warning, and a supervisor in the kitchen.' },
    ]),
    D('security', '🛡️', 'Security at the Synagogue', 'After attacks elsewhere, the board asks whether to hire armed guards.', [
      { id: 'guards', label: '🛡️ Hire them and train volunteers', cost: 2000, standing: 4, text: 'Guards at the door on Shabbat; the community felt safer.' },
      { id: 'open', label: '🚪 Keep the doors open', standing: 1, text: 'You kept the doors open and the police on speed-dial.' },
    ]),
  ],
  muslim: [
    D('moon', '🌙', 'The Ramadan Moon', 'Two mosques in town will start Ramadan on different days: one follows the local sighting, the other the calculations. Families are split.', [
      { id: 'unite', label: '🤝 Broker one date for the city', check: true, standing: 6, text: 'For the first time in years the whole city fasted and celebrated Eid together.', fail: { standing: 1, text: 'Two Eids again; at least the families joked about it.' } },
      { id: 'own', label: '🌙 Follow your masjid\'s usual practice', standing: 1, text: 'Eid came a day apart, as usual.' },
    ]),
    D('fatwa', '📜', 'A Question for a Ruling', 'Young professionals ask whether they may take out a mortgage with interest, since no Islamic mortgages are offered here.', [
      { id: 'permit', label: '🏠 Permit it out of necessity', standing: 3, text: 'You ruled on necessity (darura). Families bought homes; some elders grumbled.' },
      { id: 'forbid', label: '🚫 Forbid it, and help set up a cooperative', standing: 5, stress: 4, text: 'The cooperative bought its first three houses after two years.' },
    ]),
    D('interfaith', '🤝', 'After an Attack', 'An attack on a mosque elsewhere in the country. The mayor asks you to lead an interfaith vigil.', [
      { id: 'lead', label: '🕯️ Lead the vigil', standing: 5, recognition: 2, text: 'Rabbis, priests and imams stood together on the steps of city hall. Your words were on the news.' },
      { id: 'inside', label: '🕌 Hold prayers inside the masjid', standing: 2, text: 'The masjid was full; the police stood outside all night.' },
    ]),
    D('radical', '⚠️', 'A Young Man Drifting', 'Parents tell you their son is watching extremist preachers online.', [
      { id: 'mentor', label: '🫂 Spend time with him every week', check: true, standing: 5, stress: 4, text: 'He argued with you for months. Then he enrolled at college and started helping with the youth group.', fail: { standing: 0, text: 'He stopped coming. You told the parents to speak to a deradicalisation programme.' } },
      { id: 'refer', label: '📞 Refer the family to the authorities', standing: 1, text: 'The family was referred; they stopped coming to the masjid.' },
    ]),
  ],
  hindu: [
    D('festival', '🪔', 'The Temple Festival', 'The temple\'s great festival: the deity is taken out in procession on a chariot.', [
      { id: 'lead', label: '🛕 Lead the rites yourself', standing: 5, happiness: 4, stress: 3, text: 'Ten thousand devotees pulled the chariot through the streets.' },
      { id: 'share', label: '🤝 Share them with the younger priests', standing: 2, text: 'The young priests did well; you watched from the steps.' },
    ]),
    D('caste', '⚖️', 'Who May Serve', 'A young man of a Dalit family has trained as a priest and wants to serve in the sanctum. The trustees are divided.', [
      { id: 'yes', label: '🙏 Back his appointment', standing: 3, text: 'He performed his first puja in the sanctum. Some families moved to another temple; more came.', risk: { chance: 0.3, standing: -3, text: 'The orthodox trustees tried to remove you.' } },
      { id: 'no', label: '📜 Defer to the trustees', standing: 1, text: 'The trustees voted no. He found a temple elsewhere.' },
    ]),
    D('kumbh', '🌊', 'The Kumbh Mela', 'The Kumbh Mela comes round: millions bathing at the confluence. Your matha asks you to lead its camp.', [
      { id: 'go', label: '⛺ Lead the camp', standing: 6, stress: 5, happiness: 5, text: 'A month by the river: discourses at dawn, the royal bath, more people than you have ever seen.' },
    ]),
  ],
  buddhist: [
    D('retreat', '🧘', 'The Rains Retreat', 'The three-month retreat begins. You are asked to teach the novices.', [
      { id: 'teach', label: '📿 Teach the novices', standing: 5, stress: -4, text: 'Dawn chanting, the alms round, and twenty novices who grew calmer week by week.' },
      { id: 'sit', label: '🧘 Sit in silence yourself', happiness: 4, stress: -8, standing: 1, text: 'Three months of silence. You came out lighter.' },
    ]),
    D('donor', '💰', 'A Rich Donor', 'A wealthy businessman offers to build a golden stupa — if his name is carved on it.', [
      { id: 'accept', label: '🏗️ Accept', standing: 2, text: 'The stupa went up, with his name at the base.', risk: { chance: 0.3, standing: -6, text: 'He was arrested for fraud; the stupa became a joke in the papers.' } },
      { id: 'redirect', label: '🏫 Ask him to fund a school instead', check: true, standing: 6, text: 'He funded a school for village children, without his name on it.', fail: { standing: 0, text: 'He took his money elsewhere.' } },
    ]),
    D('politics', '🗳️', 'Monks and Politics', 'Monks in your order are marching in the streets against the government. The council asks your view.', [
      { id: 'march', label: '🚶 March with them', standing: 3, text: 'Saffron robes in the street; the world watched.', risk: { chance: 0.25, standing: -5, text: 'The police raided the monastery that night.' } },
      { id: 'counsel', label: '🧘 Counsel them to stay in the monastery', standing: 2, text: 'Most stayed. You were called a coward by some, wise by others.' },
    ]),
  ],
  sikh: [
    D('langar', '🍲', 'The Langar', 'A flood has displaced thousands. The gurdwara can open its langar around the clock.', [
      { id: 'open', label: '🍲 Open it day and night', cost: 1500, standing: 6, stress: 4, happiness: 4, text: 'Fifty thousand meals in a week, cooked by volunteers in shifts.' },
      { id: 'normal', label: '🥣 Keep the usual hours', standing: 0, text: 'The usual langar, with extra lentils.' },
    ]),
    D('election', '🗳️', 'Gurdwara Elections', 'The committee elections are bitter: two factions, accusations of misused donations.', [
      { id: 'audit', label: '📊 Demand an open audit', standing: 5, text: 'The audit found the money; one faction\'s leader resigned.' },
      { id: 'stay', label: '🙏 Stay above it, in the Guru\'s service', standing: 2, text: 'You stayed out of it and read from the Guru Granth Sahib.' },
    ]),
    D('turban', '🪯', 'A Turban Case', 'A young Sikh was barred from a school for wearing a kirpan. The family asks the gurdwara to support a court case.', [
      { id: 'support', label: '⚖️ Back the case', cost: 1000, standing: 6, recognition: 2, text: 'The court ruled for the family. Sikh families across the country now cite the case.' },
      { id: 'mediate', label: '🤝 Mediate with the school', standing: 3, text: 'The school agreed to a small, blunt kirpan sewn into its sheath.' },
    ]),
  ],
  shinto: [
    D('matsuri', '🏮', 'The Shrine Festival', 'The great festival: the kami rides through the streets in its portable shrine.', [
      { id: 'lead', label: '⛩️ Lead the rites', standing: 5, happiness: 4, text: 'Drums, the shouting bearers, and the whole town in the street until late.' },
    ]),
    D('yasukuni', '⚖️', 'A Political Shrine Visit', 'A politician wants to make an official visit to your shrine on a war anniversary. Neighbouring countries will protest.', [
      { id: 'welcome', label: '🙏 Welcome him privately, no cameras', standing: 3, text: 'He came, prayed, left. The papers didn\'t notice.' },
      { id: 'refuse', label: '🚫 Ask him not to make it official', standing: 2, text: 'He visited as a private person. Some on the association board were cool to you afterwards.' },
    ]),
  ],
  folk: [
    D('mazu', '🌊', 'The Mazu Pilgrimage', 'The goddess Mazu\'s palanquin will be carried for nine days from temple to temple.', [
      { id: 'walk', label: '🚶 Walk with the procession', standing: 5, happiness: 4, stress: 2, text: 'Nine days, firecrackers, millions on the roadside. Your feet will remember.' },
    ]),
    D('ghost', '👻', 'The Ghost Festival', 'The seventh month: the gates of the underworld open. Families need rites for their ancestors.', [
      { id: 'rites', label: '🔥 Perform the rites for every family', standing: 4, stress: 3, text: 'Paper offerings burned in the street all month; the hungry ghosts were fed.' },
    ]),
  ],
};

/* ------------------------------------------------------------------ */
/* Rites of passage and pilgrimages                                    */
/* ------------------------------------------------------------------ */

const R = (id, o) => ({ id, ...o });
const CHRISTIAN_CONFIRM = ['catholic', 'tradCatholic', 'anglican', 'lutheran', 'mainline', 'orthodoxChristian'];

/** Coming-of-age rites, kept automatically when you're raised in the faith. */
export const COMING_OF_AGE = [
  R('barMitzvah', { traditions: ['reformJewish', 'conservativeJewish', 'orthodoxJewish', 'hasidic'], age: 13, gender: 'male', name: 'Bar mitzvah', icon: '✡️', text: 'You read from the Torah at your bar mitzvah, and the congregation threw sweets.' }),
  R('batMitzvah', { traditions: ['reformJewish', 'conservativeJewish'], age: 13, gender: 'female', name: 'Bat mitzvah', icon: '✡️', text: 'You read from the Torah at your bat mitzvah; your grandmother cried.' }),
  R('batMitzvahOrth', { traditions: ['orthodoxJewish', 'hasidic'], age: 12, gender: 'female', name: 'Bat mitzvah', icon: '✡️', text: 'Your bat mitzvah: a dinner and a speech on a passage of the Torah.' }),
  R('confirmation', { traditions: CHRISTIAN_CONFIRM, age: 14, name: 'Confirmation', icon: '🕊️', text: 'You were confirmed by the bishop.' }),
  R('baptismBeliever', { traditions: ['evangelical', 'baptist', 'pentecostal', 'ifb', 'apostolic', 'churchPlant'], age: 12, name: 'Believer\'s baptism', icon: '💧', text: 'You walked forward at the altar call and were baptised by full immersion.' }),
  R('ldsBaptism', { traditions: ['lds'], age: 8, name: 'Baptism', icon: '💧', text: 'You were baptised at eight, in white, by your father.' }),
  R('upanayana', { traditions: ['hindu'], age: 10, gender: 'male', name: 'Upanayana (the sacred thread)', icon: '🧵', text: 'At your upanayana you received the sacred thread and the Gayatri mantra.' }),
  R('dastar', { traditions: ['sikh'], age: 12, gender: 'male', name: 'Dastar Bandi (the first turban)', icon: '🪯', text: 'Your first turban was tied in the gurdwara, before the Guru Granth Sahib.' }),
  R('shichigosan', { traditions: ['shinto'], age: 7, name: 'Shichi-Go-San', icon: '⛩️', text: 'Dressed in a kimono, you were taken to the shrine for Shichi-Go-San and given chitose-ame sweets.' }),
];

/**
 * Rites and pilgrimages you can choose. cost is in dollars; gender, minAge, maxAge, once,
 * devout (needs devout attendance); title is an honorific it confers; years is time away.
 */
export const RITES = [
  R('hajj', { traditions: ['sunni', 'shia', 'salafi'], name: 'The Hajj', icon: '🕋', minAge: 18, cost: 9000, once: true, abroad: 'SA', title: { male: 'Hajji', female: 'Hajja' }, happiness: 10, stress: -5, text: 'You stood at Arafat in white, circled the Kaaba, and came home a hajji. The neighbours brought sweets.' }),
  R('umrah', { traditions: ['sunni', 'shia', 'salafi'], name: 'Umrah', icon: '🕋', minAge: 12, cost: 3500, abroad: 'SA', happiness: 6, stress: -4, text: 'The lesser pilgrimage: Makkah in the cool season, and a visit to the Prophet\'s mosque in Madinah.' }),
  R('karbala', { traditions: ['shia'], name: 'Arbaeen: the walk to Karbala', icon: '🚶', minAge: 14, cost: 1500, abroad: 'IQ', happiness: 7, stress: 2, text: 'Twenty million people walked from Najaf to Karbala; strangers fed you at every tent.' }),
  R('kumbh', { traditions: ['hindu'], name: 'The Kumbh Mela', icon: '🌊', minAge: 10, cost: 1200, abroad: 'IN', happiness: 7, text: 'You bathed at the confluence of the Ganges and the Yamuna with tens of millions of others.' }),
  R('varanasi', { traditions: ['hindu'], name: 'Pilgrimage to Varanasi', icon: '🪔', minAge: 10, cost: 900, abroad: 'IN', happiness: 5, stress: -4, text: 'The ghats at dawn, the evening aarti, the burning ghats at Manikarnika.' }),
  R('sannyasa', { traditions: ['hindu'], name: 'Sannyasa (renunciation)', icon: '🧡', minAge: 60, once: true, devout: true, happiness: 6, stress: -10, text: 'You took sannyasa: the saffron robe, a new name, and the household left behind.' }),
  R('monkhood', { traditions: ['buddhist'], name: 'Temporary ordination as a monk', icon: '🧘', gender: 'male', minAge: 20, maxAge: 35, once: true, happiness: 6, stress: -8, text: 'You shaved your head and spent three months as a monk: alms at dawn, chanting, silence.' }),
  R('vipassana', { traditions: ['buddhist'], name: 'A ten-day silent retreat', icon: '🧘', minAge: 18, cost: 0, happiness: 4, stress: -10, text: 'Ten days of silence. Day four was the worst; day nine you didn\'t want it to end.' }),
  R('bodhgaya', { traditions: ['buddhist'], name: 'Pilgrimage to Bodh Gaya', icon: '🌳', minAge: 12, cost: 1500, abroad: 'IN', happiness: 6, stress: -4, text: 'You sat under the Bodhi tree where the Buddha was enlightened.' }),
  R('amrit', { traditions: ['sikh'], name: 'Amrit Sanchar (initiation into the Khalsa)', icon: '🪯', minAge: 14, once: true, devout: true, title: { male: 'Amritdhari', female: 'Amritdhari' }, happiness: 6, text: 'You took amrit before the Panj Pyare and keep the five Ks from now on.' }),
  R('harmandir', { traditions: ['sikh'], name: 'The Golden Temple at Amritsar', icon: '🛕', minAge: 8, cost: 900, abroad: 'IN', happiness: 6, stress: -4, text: 'You walked the parikrama around the pool and ate in the langar with a hundred thousand others.' }),
  R('mission', { traditions: ['lds'], name: 'A full-time mission', icon: '📛', minAge: 18, maxAge: 25, once: true, years: 2, happiness: 5, stress: 4, text: 'Two years as a missionary: a name badge, a companion, a bicycle and doors slammed in your face. You came home fluent in another language.' }),
  R('templeMarriage', { traditions: ['lds'], name: 'A temple sealing', icon: '🕍', minAge: 18, once: true, married: true, happiness: 6, text: 'You and your spouse were sealed in the temple "for time and all eternity".' }),
  R('birthright', { traditions: ['reformJewish', 'conservativeJewish', 'orthodoxJewish'], name: 'Birthright Israel', icon: '🇮🇱', minAge: 18, maxAge: 26, once: true, cost: 0, abroad: 'IL', happiness: 5, text: 'Ten free days in Israel: Masada at sunrise, the Western Wall, floating in the Dead Sea.' }),
  R('kotel', { traditions: ['reformJewish', 'conservativeJewish', 'orthodoxJewish', 'hasidic'], name: 'Jerusalem for the festivals', icon: '🕍', minAge: 12, cost: 2500, abroad: 'IL', happiness: 5, stress: -2, text: 'Sukkot in Jerusalem, and a note in the cracks of the Western Wall.' }),
  R('uman', { traditions: ['hasidic'], name: 'Rosh Hashanah in Uman', icon: '🕯️', gender: 'male', minAge: 16, cost: 1800, abroad: 'UA', happiness: 5, text: 'Rosh Hashanah at Rebbe Nachman\'s grave, with thirty thousand other men, dancing in the streets.' }),
  R('camino', { traditions: ['catholic', 'tradCatholic', 'anglican', 'lutheran', 'mainline'], name: 'The Camino de Santiago', icon: '🐚', minAge: 16, cost: 2500, abroad: 'ES', happiness: 6, stress: -6, fitness: 3, text: 'Eight hundred kilometres on foot to Santiago de Compostela. Your blisters had blisters.' }),
  R('lourdes', { traditions: ['catholic', 'tradCatholic'], name: 'Pilgrimage to Lourdes', icon: '💧', minAge: 8, cost: 1800, abroad: 'FR', happiness: 5, stress: -4, text: 'The candlelit procession, the grotto, and the cold water of the baths.' }),
  R('rome', { traditions: ['catholic', 'tradCatholic'], name: 'Pilgrimage to Rome', icon: '⛪', minAge: 8, cost: 2500, abroad: 'IT', happiness: 5, text: 'The Holy Door, the tombs of the apostles, and the Pope\'s blessing in St Peter\'s Square.' }),
  R('athos', { traditions: ['orthodoxChristian'], name: 'Pilgrimage to Mount Athos', icon: '⛰️', gender: 'male', minAge: 18, cost: 1500, abroad: 'GR', happiness: 6, stress: -8, text: 'A week on the Holy Mountain: all-night vigils and monks who had not seen a woman in fifty years.' }),
  R('holyFire', { traditions: ['orthodoxChristian'], name: 'Holy Fire in Jerusalem', icon: '🕯️', minAge: 12, cost: 2500, abroad: 'IL', happiness: 6, text: 'Holy Saturday in the Church of the Holy Sepulchre, when the fire comes out of the tomb.' }),
  R('holyLand', { traditions: ['evangelical', 'baptist', 'pentecostal', 'mainline', 'ifb', 'churchPlant', 'apostolic', 'conservativeMethodist'], name: 'A Holy Land tour', icon: '✝️', minAge: 14, cost: 3500, abroad: 'IL', happiness: 5, text: 'Baptised again in the Jordan, a boat on the Sea of Galilee, and the Garden Tomb.' }),
  R('missionTrip', { traditions: ['evangelical', 'baptist', 'pentecostal', 'mainline', 'churchPlant', 'conservativeMethodist', 'ifb'], name: 'A short-term mission trip', icon: '🧳', minAge: 14, cost: 1800, happiness: 4, text: 'A week building a school and running a children\'s club abroad.' }),
  R('ise', { traditions: ['shinto'], name: 'Pilgrimage to the Ise Grand Shrine', icon: '⛩️', minAge: 8, cost: 600, happiness: 5, stress: -4, text: 'The cypress halls of Ise in the forest, and the old pilgrim street outside.' }),
  R('qingming', { traditions: ['chineseFolk'], name: 'Qingming: sweeping the ancestors\' tombs', icon: '🪦', minAge: 6, cost: 100, happiness: 3, text: 'You swept the family graves, burned incense and paper money, and had a picnic beside the ancestors.' }),
  R('mazu', { traditions: ['chineseFolk'], name: 'The Dajia Mazu pilgrimage', icon: '🌊', minAge: 12, cost: 500, abroad: 'TW', happiness: 6, text: 'Nine days walking behind Mazu\'s palanquin, sleeping in temples.' }),
  R('ga', { traditions: ['unitarian'], name: 'General Assembly', icon: '🕯️', minAge: 16, cost: 900, happiness: 4, text: 'Workshops, a justice march and the Ware lecture: a week among your people.' }),
];

/** The rites open to someone of a tradition. */
export const ritesFor = (traditionId) => RITES.filter((r) => r.traditions.includes(traditionId));
export const comingOfAgeFor = (traditionId) => COMING_OF_AGE.filter((r) => r.traditions.includes(traditionId));
/** Faiths with a body (and duties) of their own here. */
export const hasBody = (traditionId) => Boolean(FAITH_BODIES[traditionId] && !FAITH_BODIES[traditionId].church && TRADITIONS[traditionId]);
