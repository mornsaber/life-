/**
 * Social work, child protection, public health and the charities: the social work qualification
 * (from the almoners and the settlement houses), child protection and best-interests training;
 * relief missions, a settlement house year, a secondment to the inquiry; the social work and
 * public health awards; the care council and the charity commission; the director of social
 * services, the chief medical officer's public health deputy, a charity's chief executive.
 */
import { yearNow } from '../../world/Eras.js';
import { MANAGEMENT, UNION, regulatorFrom, COMMONWEALTH } from './blocks.js';

const y = (s) => yearNow(s);
const cc = (s) => s.character.countryId ?? 'US';
const prof = (s) => s.career?.job?.professionId;

export const SOCIAL = {
  id: 'social',
  name: 'Social Work & Charities',
  professions: ['socialWork', 'cps', 'publicHealth', 'nonprofit'],
  use: [MANAGEMENT, UNION],
  specialtyAt: 3,
  specialties: [
    { id: 'children', name: 'Children and families', icon: '🧒', professions: ['socialWork', 'cps'] },
    { id: 'mental', name: 'Mental health', icon: '🧠', professions: ['socialWork'] },
    { id: 'elderly', name: 'Older people', icon: '👵', professions: ['socialWork'] },
    { id: 'epidemics', name: 'Epidemics and outbreaks', icon: '🦠', professions: ['publicHealth'] },
    { id: 'sanitation', name: 'Sanitation and housing', icon: '🚰', professions: ['publicHealth'] },
    { id: 'fundraising', name: 'Fundraising', icon: '💷', professions: ['nonprofit'] },
    { id: 'campaigns', name: 'Campaigns', icon: '📣', professions: ['nonprofit'] },
  ],
  courses: [
    { id: 'socialWorkQual', name: (s) => (y(s) < 1920 ? 'training at a settlement house' : y(s) < 1971 ? 'the almoner\'s or social science certificate' : y(s) < 2003 ? 'the Certificate of Qualification in Social Work' : 'a social work degree'), icon: '🤝', professions: ['socialWork', 'cps'], minGrade: 1, cost: 4000, years: 1, perf: 7 },
    { id: 'childProtection', name: 'advanced child protection training', icon: '🛡️', from: 1974, professions: ['socialWork', 'cps'], minGrade: 3, cost: 0, renew: 3, perf: 3 },
    { id: 'mph', name: (s) => (y(s) < 1960 ? 'a Diploma in Public Health' : 'a Master of Public Health'), icon: '📊', from: 1916, professions: ['publicHealth'], minGrade: 3, cost: 25000, years: 1, perf: 6 },
    { id: 'epidemiology', name: 'field epidemiology training', icon: '🦠', from: 1951, professions: ['publicHealth'], minGrade: 4, cost: 0, years: 1, perf: 5 },
    { id: 'charityMgmt', name: 'a charity management course', icon: '🏛️', from: 1980, professions: ['nonprofit'], minGrade: 3, cost: 2500, perf: 4 },
  ],
  postingOdds: 0.08,
  postings: [
    { id: 'relief', name: (s) => (y(s) < 1945 ? 'Relief Work Abroad' : 'A Humanitarian Mission'), icon: '⛺', professions: ['socialWork', 'nonprofit', 'publicHealth'], minGrade: 3, years: 1, places: ['SS', 'SY', 'BD', 'HT', 'ET', 'AF', 'SO', 'IN', 'TR', 'PK'], stress: 9, happiness: 6, text: (s) => (y(s) < 1945 ? 'A relief committee is sending workers to a famine abroad.' : 'An aid agency is short of experienced staff for a crisis abroad.') },
    { id: 'outbreak', name: 'An Outbreak Abroad', icon: '🦠', from: 1950, professions: ['publicHealth'], minGrade: 4, years: 1, places: ['SL', 'LR', 'GN', 'CD', 'HT', 'YE', 'IN', 'BR'], stress: 9, happiness: 5, text: 'The WHO needs epidemiologists for an outbreak.' },
    { id: 'inquiry', name: 'A Secondment to a Public Inquiry', icon: '📜', from: 1945, professions: ['socialWork', 'cps', 'publicHealth'], minGrade: 6, years: 1, happiness: 2, stress: 4, text: 'A public inquiry into a terrible case wants an experienced practitioner on its panel.' },
    { id: 'settlement', name: 'A Year at a Settlement House', icon: '🏚️', until: 1960, professions: ['socialWork', 'nonprofit'], minGrade: 1, years: 1, happiness: 5, stress: 3, text: 'A settlement house in the slums wants a resident worker for a year.' },
  ],
  awards: [
    { id: 'socialWorker', name: (s) => (y(s) < 1990 ? 'a mention in the professional journal' : 'Social Worker of the Year'), icon: '🏆', professions: ['socialWork', 'cps'], minGrade: 3, minPerformance: 85, chance: 0.04, prestige: 1 },
    { id: 'healthMedal', name: 'a public health medal', icon: '🏅', professions: ['publicHealth'], posting: 'outbreak', chance: 0.3, prestige: 3 },
    { id: 'charityAward', name: 'a charity award', icon: '💛', from: 1980, professions: ['nonprofit'], minGrade: 4, minPerformance: 80, chance: 0.05, prestige: 1 },
  ],
  licence: (s) => (['socialWork', 'cps'].includes(prof(s)) ? 'lcsw' : prof(s) === 'publicHealth' ? 'cph' : null),
  regulator: (s) => (prof(s) === 'nonprofit'
    ? regulatorFrom({ GB: ['the Charity Commission', 1853], US: ['the state attorney general\'s charities bureau', 1950] })(s)
    : regulatorFrom({ GB: [y(s) < 2012 ? 'the General Social Care Council' : y(s) < 2019 ? 'the HCPC' : 'Social Work England', 2001], US: ['the state social work board', 1960], '*': ['the social care council', 1990] })(s)),
  complaintOdds: 0.016,
  complaints: [
    { id: 'missedAbuse', short: 'a child you didn\'t protect', severity: 2, weight: (s) => (['socialWork', 'cps'].includes(prof(s)) ? 3 : 0), founded: 0.45, text: 'A child on your caseload was badly hurt. The newspapers have your name.' },
    { id: 'removal', short: 'a removal that went wrong', severity: 2, weight: (s) => (prof(s) === 'cps' ? 2 : 0), founded: 0.45, text: 'A family says their children were taken from them on gossip.' },
    { id: 'funds', short: 'charity funds', severity: 2, weight: (s) => (prof(s) === 'nonprofit' ? 2 : 0), founded: 0.45, text: 'An audit can\'t account for donations your team raised.' },
    { id: 'confidential', short: 'a breach of confidence', severity: 1, weight: 2, founded: 0.5, text: 'Details of a client\'s case turned up on social media.' },
  ],
  eliteOdds: 0.035,
  elite: [
    { id: 'director', name: (s) => (cc(s) === 'GB' ? 'Director of Social Services' : 'Director of the county\'s children\'s services'), icon: '🏛️', from: 1971, professions: ['socialWork', 'cps'], minGrade: 7, minYears: 20, years: 6, prestige: 3, stipend: 15000, text: 'A local authority wants you to run its social services.' },
    { id: 'moh', name: (s) => (y(s) < 1974 && COMMONWEALTH.includes(cc(s)) ? 'Medical Officer of Health for a great city' : 'Director of Public Health'), icon: '🚰', professions: ['publicHealth'], minGrade: 6, minYears: 18, years: 6, prestige: 4, stipend: 15000, text: 'The city wants you in charge of its people\'s health.' },
    { id: 'ceo', name: 'Chief executive of a national charity', icon: '💛', professions: ['nonprofit'], minGrade: 7, minYears: 18, years: 6, prestige: 3, stipend: 20000, text: 'The trustees of a famous charity want you as their chief executive.' },
  ],
};
