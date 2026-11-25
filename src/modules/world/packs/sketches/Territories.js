/**
 * Territories that were never sovereign states: colonies handed back, by treaty and on a fixed
 * date, to a state that let them keep their own system.
 *
 *   Hong Kong  part of the Qing Empire's Xin'an County until the First Opium War (Hong Kong
 *              Island ceded 1841–42, Kowloon 1860, the New Territories leased 1898); a Crown
 *              colony, occupied by Japan 1941–45; handed to China at midnight on 30 June 1997
 *              as a Special Administrative Region: "one country, two systems" for fifty years,
 *              its own laws, courts, police, money and civil service; the National Security Law
 *              of 2020 and the "patriots only" elections of 2021.
 *   Macau      Portuguese from 1557 (a colony from 1887), handed to China on 20 December 1999
 *              as the Macao Special Administrative Region; the casinos, the pataca.
 *
 * Built with sketch() (../Sketch.js). Their life after the handover is in world/Autonomy.js.
 */
import { sketch } from '../Sketch.js';

const C = (id, name, demonym, capital, cur, ppp, o) => sketch({ id, name, demonym, capital, cur, ppp, family: 'asia', ...o });
const BRIT_POLICE = ['Recruit Police Constable', 'Police Constable', 'Senior Police Constable', 'Sergeant', 'Station Sergeant', 'Inspector', 'Senior Inspector', 'Chief Inspector', 'Superintendent', 'Senior Superintendent', 'Chief Superintendent', 'Assistant Commissioner', 'Senior Assistant Commissioner', 'Deputy Commissioner', 'Commissioner of Police'];
const PT_POLICE = ['Guarda', 'Guarda principal', 'Subchefe', 'Chefe', 'Comissário', 'Subintendente', 'Intendente', 'Superintendente', 'Superintendente-geral'];

export const HK = C('HK', 'Hong Kong', 'Hongkonger', 'Hong Kong', ['HKD', 'HK$'], 5.6, {
  languages: ['Cantonese', 'English', 'Mandarin'], pop: 7500, gdp: 52000, life: 85,
  m: 'Chi-wai Ka-ho Wing-kei Chun-yin Ho-yin Kwok-wai Siu-ming Tsz-hin Man-kit Kin-man', f: 'Wing-yan Ka-yan Mei-ling Hoi-yan Pui-yee Suk-fan Wai-ling Tsz-ching Hiu-tung Man-yee',
  l: 'Chan Wong Lee Cheung Lau Ho Leung Lam Tsang Ng',
  cities: [['hk_island', 'Hong Kong Island (Victoria)', '🌃', 'Capital region', 'large', 1250000, 1.25, 1.1], ['hk_kowloon', 'Kowloon', '🏙️', 'Major city', 'large', 2250000, 1.1, 1.0], ['hk_shatin', 'Sha Tin, New Territories', '🏘️', 'Suburb', 'medium', 700000, 1.0, 0.9], ['hk_tuenmun', 'Tuen Mun, New Territories', '🏗️', 'Suburb', 'medium', 500000, 0.9, 0.85]],
  provinces: ['Hong Kong Island', 'Kowloon', 'New Territories East', 'New Territories West'], provinceWord: 'Region',
  gov: ['presidential', 'Legislative Council (LegCo)', 90, ['Democratic Party', 'Democratic Alliance for the Betterment and Progress of Hong Kong (DAB)'], 'Chief Executive'], member: 'Member of the Legislative Council',
  tax: { allowance: 132000, brackets: [[50000, 0.02], [50000, 0.06], [50000, 0.1], [50000, 0.14], [Infinity, 0.17]], vat: 0, corporate: 0.165, label: 'Inland Revenue Department' },
  pension: { name: 'the Mandatory Provident Fund (MPF)', short: 'the MPF', kind: 'account', rate: 0.1 },
  religion: { buddhist: 20, mainline: 7, catholic: 5, none: 68 }, informality: 0.03, retire: 65, emergency: '999',
  police: { name: 'Hong Kong Police Force', ranks: BRIT_POLICE, head: 'Commissioner of Police', academy: 'the Hong Kong Police College' },
  forces: { army: null, navy: null, air: null }, navy: false, warChance: 0,
  courts: { top: 'Court of Final Appeal', high: 'Court of First Instance', appeal: 'Court of Appeal', magistrate: 'Magistrate', appointedBy: 'the Chief Executive, on the Judicial Officers Recommendation Commission' },
  edu: { exam: 'HKDSE (Hong Kong Diploma of Secondary Education)', elite: 'the University of Hong Kong' }, jury: true,
  // The SAR's own honours from 1997 (the Bauhinia, the territory's flower); before them, British honours.
  orders: [['MH', 'Medal of Honour'], ['BBS', 'Bronze Bauhinia Star'], ['SBS', 'Silver Bauhinia Star'], ['GBS', 'Gold Bauhinia Star'], ['GBM', 'Grand Bauhinia Medal']],
  ribbon: ['#de2910', '#ffffff', '#de2910'],
  stock: 'the Hang Seng Index', lender: 'HSBC', centralBank: 'the Hong Kong Monetary Authority', foreign: 'the Commissioner\'s Office of China\'s Foreign Ministry', intel: null,
  ruled: [
    ['CN', 'Xin\'an County, in the Qing Empire', 1841, { noMovement: true, leader: 'the Qing magistrate', fixed: true }],
    ['GB', 'the Crown Colony of Hong Kong', 1941, { noMovement: true, leader: 'the Governor', fixed: true, arrive: 'The Union Flag went up at Possession Point in January 1841: Hong Kong Island is British, ceded after the First Opium War (Kowloon follows in 1860, the New Territories on a 99-year lease in 1898).' }],
    ['JP', 'Japanese-occupied Hong Kong', 1945, { noMovement: true, leader: 'the Japanese Governor', fixed: true, occupation: true, arrive: 'On Christmas Day 1941 the Governor surrendered Hong Kong to the Japanese army. Black Christmas: the Stanley internment camp for the British, the rice ration, the forced departures to the mainland. The population will halve before the war is over.' }],
    ['GB', 'the Crown Colony of Hong Kong', 1997, { noMovement: true, leader: 'the Governor', fixed: true, arrive: 'Japan has surrendered. A British fleet sailed into Victoria Harbour at the end of August 1945, and Hong Kong is a Crown colony again.' }],
  ],
  regimes: null, sovereign: [],
  money: [[1863, 'XSD', '$', 'Spanish silver dollar', 1]],
});

export const MO = C('MO', 'Macau', 'Macanese', 'Macau', ['MOP', 'MOP$'], 5.8, {
  languages: ['Cantonese', 'Portuguese', 'Mandarin'], pop: 680, gdp: 60000, life: 85,
  m: 'Chi-kin Ka-hou Weng-kei Chon-ian Ho-in Kuok-wai Sio-man Kin-man João Miguel', f: 'Weng-ian Ka-ian Mei-leng Hoi-ian Sut-fan Wai-leng Ieng-ieng Man-i Ana Maria',
  l: 'Chan Wong Lei Ho Leong Lam Choi Ieong Sou Fernandes',
  cities: [['mo_peninsula', 'Macau Peninsula', '🎰', 'Capital region', 'medium', 500000, 1.05, 1.0], ['mo_taipa', 'Taipa', '🌉', 'Suburb', 'small', 100000, 1.1, 1.0], ['mo_coloane', 'Coloane', '🏝️', 'Small town', 'small', 15000, 1.0, 0.9]],
  provinces: ['Macau Peninsula', 'Taipa', 'Coloane'], provinceWord: 'Parish',
  gov: ['presidential', 'Legislative Assembly', 33, ['New Macau Association', 'Union for Development'], 'Chief Executive'], member: 'Member of the Legislative Assembly',
  tax: { allowance: 144000, brackets: [[20000, 0.07], [20000, 0.08], [40000, 0.09], [80000, 0.1], [Infinity, 0.12]], vat: 0, corporate: 0.12, label: 'Financial Services Bureau' },
  pension: { name: 'the Social Security Fund', short: 'the FSS', kind: 'account', rate: 0.05 },
  religion: { buddhist: 25, catholic: 7, none: 68 }, informality: 0.03, retire: 65, emergency: '999',
  police: { name: 'Public Security Police Force (PSP)', ranks: PT_POLICE, head: 'Commander of the Public Security Police', academy: 'the Academy of Public Security Forces' },
  forces: { army: null, navy: null, air: null }, navy: false, warChance: 0,
  courts: { top: 'Court of Final Appeal (Tribunal de Última Instância)', high: 'Court of First Instance', appeal: 'Court of Second Instance', magistrate: 'Judge of the Basic Court', appointedBy: 'the Chief Executive' },
  edu: { exam: 'the Joint Admission Examination', elite: 'the University of Macau' }, jury: false,
  orders: [['', 'Medal of Merit'], ['', 'Silver Lotus Medal of Honour'], ['', 'Golden Lotus Medal of Honour'], ['', 'Grand Lotus Medal of Honour']],
  ribbon: ['#00785e', '#ffffff', '#00785e'],
  stock: null, lender: 'Banco Nacional Ultramarino', centralBank: 'the Monetary Authority of Macao',
  ruled: [['PT', 'Portuguese Macau', 1999, { noMovement: true, leader: 'the Governor', fixed: true }]],
  regimes: null, sovereign: [],
  money: [[1894, 'XSD', '$', 'Mexican silver dollar', 1]],
});
