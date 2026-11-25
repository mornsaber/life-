/**
 * Referendums: votes whose result isn't written in advance.
 *
 *   History's referendums   held in their year in the country they were held in, but counted in this
 *                           world: history's share is where opinion starts, and the campaign, the
 *                           news and you move it. Norway can join the Common Market in 1972; the
 *                           Faroes can leave Denmark in 1946; Bermuda can vote itself independent.
 *   Laws put to the people  Ireland's divorce, marriage and abortion votes, Switzerland's women's
 *                           suffrage: the result sets the law (politics/StatuteBook.js), whichever way.
 *   Your referendums        a head of government can put a question to the people: independence or
 *                           statehood for a self-governing territory, or any of the country's laws;
 *                           a legislator can table a referendum bill. The vote comes the next year.
 *                           (A republic: world/Houses.js already puts the Crown to the people.)
 *
 * state.world.referendums = { held: { [id]: { year, yes } }, pending: [{ id, cc, q, year, called }] }
 */
import { yearNow, autonomyOf, AUTONOMOUS, PRESENT } from '../world/Eras.js';
import { COUNTRIES, isCitizen } from '../world/Countries.js';
import { STATUTES, statuteIn } from './StatuteBook.js';
import { setEuOverrides } from '../world/EuMembership.js';
import { setReformLayer } from '../world/Regimes.js';
import { governsHere } from '../world/Reforms.js';
import { clamp } from '../../core/Random.js';
import { setNewStates } from '../world/NewStates.js';
import { euMemberIn } from '../world/EuMembership.js';
import { stateIdOf } from '../life/Regions.js';
import { abolish } from '../world/Houses.js';

const cname = (cc) => COUNTRIES[cc]?.name ?? cc;
const rec = (state) => { const r = ((state.world ??= {}).referendums ??= { held: {}, pending: [] }); r.later ??= []; return r; };

/* ---- What a result does ---- */
/** A self-governing territory votes itself out: it is its own state from now on. */
/** How each would govern itself: Puerto Rico a presidential republic, the rest parliamentary. */
const NEW_FORM = { PR: ['a presidential republic', 'the President'] };
export function becomeIndependent(ctx, cc) {
  const { state } = ctx;
  const of = AUTONOMOUS[cc]?.of ?? null;
  (state.world.independent ??= {})[cc] = { year: yearNow(state), of };
  setNewStates(state.world.independent);
  const [form, leader] = NEW_FORM[cc] ?? ['a parliamentary democracy', 'the Prime Minister'];
  const w = (state.world.reforms ??= {});
  w[cc] = { ...(w[cc] ?? {}), kind: 'democracy', name: `independent ${cname(cc).replace(/^the /, '')}, ${form}`, leader, elections: 'free', press: 'free' };
  setReformLayer(w);
  ctx.emit?.('world:regimeChanged', { cc });
}
/** A region votes to leave (Scotland, Quebec): the game has no separate country for it, so the vote is recorded and lived. */
function secede(ctx, region, name, day) {
  (ctx.state.world.seceded ??= {})[region] = { year: yearNow(ctx.state) + 2, name };
  laterDo(ctx.state, yearNow(ctx.state) + 2, 'secession', { region, name });
  return day;
}
/** Something a result sets in motion for a later year. */
const laterDo = (state, year, what, data = {}) => rec(state).later.push({ year, what, ...data });
const setLaw = (state, cc, id, value) => {
  state.laws ??= {};
  if (cc === 'US') (state.laws.federal ??= {})[id] = value;
  else { state.laws.nations ??= {}; (state.laws.nations[cc] ??= {})[id] = value; }
};
const setEu = (state, cc, member, years = null) => {
  const o = ((state.world.euMember ??= {}));
  o[cc] = years ?? (member ? [yearNow(state) + 1] : [9999]);
  setEuOverrides(o);
};
const eu = (cc, member, years) => (ctx) => { setEu(ctx.state, cc, member, years); return null; };
const law = (cc, id, value) => (ctx) => { setLaw(ctx.state, cc, id, value); return null; };

/* ---- History's referendums: [year, country, history's yes share, the question, its two sides, what each result does] ---- */
const R = (id, cc, year, yes, title, text, [yesLabel, noLabel], { yesText, noText, onYes, onNo, icon = '🗳️', age = null, region = null, need = 0.5, shortText = null, skip = null } = {}) => ({ id, cc, year, yes, title, text, yesLabel, noLabel, yesText, noText, onYes, onNo, icon, age, region, need, shortText, skip });
export const HISTORIC = [
  R('no1905', 'NO', 1905, 0.9995, 'Independence from Sweden', 'Norway votes on dissolving the union with Sweden.', ['🇳🇴 For dissolution', '🇸🇪 For the union'],
    { yesText: 'Dissolution, almost unanimously: Norway is its own kingdom; a Danish prince becomes Haakon VII.', noText: 'Astonishingly, the union stands. The Storting\'s rebellion collapses.', icon: '🇳🇴', age: 25 }),
  R('fo1946', 'FO', 1946, 0.507, 'The 1946 referendum', 'The Faroese vote on whether to leave Denmark. Copenhagen may not accept a narrow result.', ['🇫🇴 For independence', '🇩🇰 To stay with Denmark'],
    { yesText: 'Independence wins.', noText: 'The islands vote to stay with Denmark; home rule comes two years later.',
      onYes: (ctx) => { if (ctx.rng.chance(0.5)) return 'Denmark annulled the result, dissolved the Løgting and offered home rule instead.'; becomeIndependent(ctx, 'FO'); return 'Copenhagen accepted it: the Faroe Islands are an independent country.'; } }),
  R('au1967', 'AU', 1967, 0.908, 'The 1967 Referendum', 'A referendum to count Aboriginal people in the census and let the Commonwealth make laws for them.', ['✅ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, by the biggest margin any Australian referendum has had.', noText: 'It failed. The Commonwealth still cannot make laws for Aboriginal people.', age: 21 }),
  R('dk1972', 'DK', 1972, 0.633, 'Joining the Common Market', 'Denmark votes on joining the European Economic Community, with Britain and Ireland.', ['🇪🇺 Vote yes', '🇩🇰 Vote no'],
    { yesText: 'Denmark joins the Common Market in 1973.', noText: 'Denmark stays out; Britain and Ireland join without it.', onNo: (ctx) => { setEu(ctx.state, 'DK', false); return null; } }),
  R('no1972', 'NO', 1972, 0.465, 'Into Europe?', 'Norway votes on joining the European Economic Community. The fishermen and the farmers are against.', ['🇪🇺 Vote yes', '🎣 Vote no'],
    { yesText: 'Norway joins the Common Market in 1973.', noText: 'No wins: Norway stays out of Europe.', onYes: (ctx) => { setEu(ctx.state, 'NO', true); return null; } }),
  R('at1978', 'AT', 1978, 0.495, 'Zwentendorf', 'Austria votes on switching on its first, finished nuclear power station.', ['⚡ Vote yes', '🚫 Vote no'],
    { yesText: 'Yes, narrowly: Zwentendorf goes online.', noText: 'No, by thirty thousand votes; the plant never runs a day.', icon: '☢️' }),
  R('gl1982', 'GL', 1982, 0.53, 'Leave the European Community?', 'Greenland went into the European Community with Denmark, though most Greenlanders voted against. With home rule there is a vote on leaving; the fishing grounds are the question.', ['🐟 Vote to leave', '🇪🇺 Vote to stay'],
    { yesText: 'Leave wins: Greenland leaves the EC in 1985, the first place ever to do so.', noText: 'Greenland votes to stay in the Community.', onNo: eu('GL', true, [1973]) }),
  R('cl1988', 'CL', 1988, 0.56, 'The Plebiscite', 'Pinochet asks for eight more years. The "No" campaign has rainbows, jingles and fifteen minutes of television a night.', ['🌈 Vote No', '✔️ Vote Yes (for Pinochet)'],
    { yesText: 'No wins: the dictatorship will hand over to an elected president in 1990.', noText: 'Yes wins, and Pinochet stays for eight more years. The opposition calls it rigged.', icon: '🌈',
      onNo: (ctx) => { const w = (ctx.state.world.reforms ??= {}); w.CL = { kind: 'junta', name: 'the military regime, General Pinochet re-confirmed', leader: 'General Pinochet', elections: 'none', press: 'censored', coups: true }; setReformLayer(w); laterDo(ctx.state, 1997, 'restore', { cc: 'CL', text: 'Pinochet\'s second term is over. Under his own constitution, Chile goes to free elections and a civilian president.' }); return null; } }),
  R('ch1992', 'CH', 1992, 0.497, 'The EEA Vote', 'Switzerland votes on joining the European Economic Area.', ['🇪🇺 Vote yes', '🇨🇭 Vote no'],
    { yesText: 'Yes, by a hair: Switzerland joins the European Economic Area.', noText: 'No, by a hair: Switzerland stays out, and goes its own way with bilateral treaties.' }),
  R('bm1995', 'BM', 1995, 0.26, 'The independence referendum', 'Bermuda votes on independence from Britain. The banks and the hotels are nervous; a hurricane has just come through.', ['🇧🇲 Vote for independence', '🇬🇧 Vote to stay British'],
    { yesText: 'Independence wins.', noText: 'Bermuda stays a British territory.', onYes: (ctx) => { becomeIndependent(ctx, 'BM'); return 'Bermuda will be an independent country.'; } }),
  R('cm1961', 'CM', 1961, 0.70, 'The Plebiscite', 'The British Cameroons vote on whether to join Cameroun or Nigeria.', ['🇨🇲 Vote to join Cameroun', '🇳🇬 Vote to join Nigeria'],
    { yesText: 'The south votes to join Cameroun; the north goes to Nigeria.', noText: 'The south votes to join Nigeria, with the north.' }),
  R('uz1991', 'UZ', 1991, 0.983, 'Independence', 'With the Soviet Union falling apart, Uzbekistan votes on independence.', ['🇺🇿 Vote for independence', '☭ Vote against'],
    { yesText: 'Independence, almost unanimously.', noText: 'Against all expectation, the vote goes against independence; Tashkent declares it anyway.', icon: '🇺🇿' }),
  R('ca1995', 'CA', 1995, 0.494, 'The Referendum', 'Quebec votes on sovereignty. On the eve, a hundred thousand Canadians rally in Montreal to ask Quebec to stay.', ['⚜️ Oui: a sovereign Quebec', '🍁 Non: stay in Canada'],
    { yesText: 'Oui wins, by a hair. Quebec\'s government will negotiate its way out of Canada.', noText: 'Non wins, by a hair; the premier blames "money and the ethnic vote" and resigns.', region: 'CA-QC',
      onYes: (ctx) => secede(ctx, 'CA-QC', 'Quebec', 'Ottawa and Quebec City open talks on the terms of separation.') }),
  R('ie1995', 'IE', 1995, 0.503, 'Divorce', 'Ireland votes on removing the ban on divorce from the Constitution.', ['✅ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, by nine thousand votes: divorce is lawful in Ireland.', noText: 'No: divorce stays banned.', onYes: (ctx) => { setLaw(ctx.state, 'IE', 'divorce', true); return null; }, onNo: (ctx) => { setLaw(ctx.state, 'IE', 'divorce', false); return null; } }),
  R('ch1971', 'CH', 1971, 0.657, 'Votes for women', 'Swiss men vote on giving women the vote in federal elections.', ['✅ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Swiss women vote from this year.', noText: 'No, again: Swiss women still can\'t vote.', onYes: (ctx) => { setLaw(ctx.state, 'CH', 'womensSuffrage', true); return null; }, onNo: (ctx) => { setLaw(ctx.state, 'CH', 'womensSuffrage', false); return null; } }),
  R('gi2002', 'GI', 2002, 0.0103, 'Joint sovereignty?', 'London and Madrid have been talking about sharing sovereignty over Gibraltar. The Chief Minister has called a referendum of his own.', ['✅ Vote yes', '❌ Vote no'],
    { yesText: 'Yes, to everyone\'s astonishment: talks on sharing sovereignty with Spain go ahead.', noText: 'No, by 98.97 per cent. The talks go nowhere.', icon: '🪨' }),
  R('ie2015', 'IE', 2015, 0.621, 'Marriage equality', 'Ireland votes on allowing two people to marry without distinction as to their sex.', ['🌈 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Ireland is the first country to bring in same-sex marriage by popular vote.', noText: 'No: marriage stays between a man and a woman.', onYes: (ctx) => { setLaw(ctx.state, 'IE', 'sameSexMarriage', true); return null; }, onNo: (ctx) => { setLaw(ctx.state, 'IE', 'sameSexMarriage', false); return null; } }),
  R('co2016', 'CO', 2016, 0.498, 'The Peace Vote', 'Colombia votes on the peace deal with the FARC after fifty years of war.', ['🕊️ Vote yes', '✋ Vote no'],
    { yesText: 'Yes: the peace deal stands.', noText: 'No, by a whisker. The deal is renegotiated, and signed again without a vote.', icon: '🕊️' }),
  R('ie2018', 'IE', 2018, 0.664, 'Repeal the Eighth', 'Ireland votes on repealing the constitutional ban on abortion.', ['✅ Vote yes (repeal)', '✖️ Vote no'],
    { yesText: 'Yes, by two to one: abortion is lawful in Ireland.', noText: 'No: the Eighth Amendment stays.', onYes: (ctx) => { setLaw(ctx.state, 'IE', 'abortion', true); return null; }, onNo: (ctx) => { setLaw(ctx.state, 'IE', 'abortion', false); return null; } }),
  /* ---- Britain and Ireland ---- */
  R('ie1972', 'IE', 1972, 0.831, 'Joining the Common Market', 'Ireland votes on joining the European Economic Community with Britain and Denmark.', ['🇪🇺 Vote yes', '🇮🇪 Vote no'],
    { yesText: 'Yes, by five to one: Ireland joins in 1973.', noText: 'No: Ireland stays out, and Britain goes in without it.', onNo: eu('IE', false) }),
  R('ni1973', 'GB', 1973, 0.989, 'The Border Poll', 'Northern Ireland votes on staying in the United Kingdom or joining the Republic. The nationalist parties have called for a boycott.', ['🇬🇧 Stay in the UK', '🇮🇪 Join the Republic'],
    { yesText: 'Stay, overwhelmingly, on a turnout of 59 per cent: most Catholics stayed at home.', noText: 'Unthinkably, a vote to leave. London says it will legislate; the loyalist paramilitaries mobilise.', region: 'GB-NIR', age: 18 }),
  R('gb1975', 'GB', 1975, 0.672, 'Stay in Europe?', 'The first national referendum Britain has ever held: should it stay in the European Community? The Cabinet is split, and allowed to campaign on both sides.', ['🇪🇺 Vote yes (stay)', '🇬🇧 Vote no (leave)'],
    { yesText: 'Yes, by two to one: Britain stays in the Community.', noText: 'No: Britain will leave the Community next year.', onNo: eu('GB', false, [1973, 1976]) }),
  R('sc1979', 'GB', 1979, 0.516, 'A Scottish Assembly', 'Scotland votes on an Assembly in Edinburgh. Parliament has added a condition: it needs the votes of 40 per cent of the whole electorate, not just of those who vote.', ['🏴 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, and over the 40 per cent bar: Scotland will have its Assembly.', noText: 'No: there will be no Scottish Assembly.', shortText: 'Yes wins the vote but falls short of the 40 per cent bar. The Act is repealed; the SNP brings down the Callaghan government.', need: 0.63, region: 'GB-SCT' }),
  R('wa1979', 'GB', 1979, 0.203, 'A Welsh Assembly', 'Wales votes on an Assembly in Cardiff, on St David\'s Day.', ['🏴 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, to general surprise: Wales will have an Assembly.', noText: 'No, by four to one.', need: 0.63, shortText: 'Yes wins, but short of the 40 per cent bar: no Assembly.', region: 'GB-WLS' }),
  R('sc1997', 'GB', 1997, 0.743, 'A Scottish Parliament', 'Two questions: a Scottish Parliament, and should it have powers to vary tax?', ['🏴 Yes, yes', '✖️ No, no'],
    { yesText: 'Yes, by three to one: Scotland will have its own Parliament, with tax powers, from 1999.', noText: 'No: no Scottish Parliament. The Union stays as it was.', region: 'GB-SCT', onYes: (ctx) => { (ctx.state.world.devolved ??= {})['GB-SCT'] = 1999; return null; } }),
  R('wa1997', 'GB', 1997, 0.503, 'A Welsh Assembly', 'Wales votes again on an Assembly. It will be close: the count goes through the night.', ['🏴 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, by 6,721 votes: Carmarthenshire, the last to declare, carries it.', noText: 'No, by a whisker. No Welsh Assembly.', region: 'GB-WLS', onYes: (ctx) => { (ctx.state.world.devolved ??= {})['GB-WLS'] = 1999; return null; } }),
  R('ni1998', 'GB', 1998, 0.711, 'The Good Friday Agreement', 'Northern Ireland votes on the Belfast Agreement: a power-sharing Assembly, the release of paramilitary prisoners, and a border poll whenever there is a majority for one.', ['🕊️ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, 71 per cent: power-sharing comes to Stormont.', noText: 'No. The Agreement falls; the Troubles go on.', region: 'GB-NIR', icon: '🕊️' }),
  R('ie1998', 'IE', 1998, 0.944, 'The Good Friday Agreement', 'The Republic votes on the Agreement, and on dropping its constitutional claim to Northern Ireland.', ['🕊️ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, 94 per cent: Articles 2 and 3 are rewritten.', noText: 'No: the claim stays in the Constitution and the Agreement falls.', icon: '🕊️' }),
  R('ie2008', 'IE', 2008, 0.466, 'The Lisbon Treaty', 'Ireland is the only country putting the EU\'s Lisbon Treaty to a vote.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Lisbon goes ahead.', noText: 'No: the treaty is stuck, and Dublin will be asked to vote again.' }),
  R('ie2009', 'IE', 2009, 0.671, 'Lisbon, again', 'With guarantees on neutrality, tax and abortion, and the economy in ruins, Ireland votes on Lisbon a second time.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, two to one: Lisbon comes into force.', noText: 'No, again. The EU looks for another way.', skip: (state) => (state.world.referendums.held.ie2008?.yes ?? 0) > 50 }),
  R('gb2011', 'GB', 2011, 0.321, 'The Alternative Vote', 'Britain votes on replacing first-past-the-post with the Alternative Vote for elections to the Commons.', ['🔢 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: general elections will use the Alternative Vote.', noText: 'No, by two to one: first-past-the-post stays.' }),
  R('sc2014', 'GB', 2014, 0.447, 'Scottish independence', '"Should Scotland be an independent country?" The polls have it close; turnout will be the highest Britain has ever seen.', ['🏴 Yes', '🇬🇧 No thanks'],
    { yesText: 'Yes wins. Independence Day is set for March 2016.', noText: 'No, 55 to 45. "Once in a generation," they said.', region: 'GB-SCT', age: 16,
      onYes: (ctx) => secede(ctx, 'GB-SCT', 'Scotland', 'Edinburgh and London will negotiate the terms: the pound, the border, the North Sea, the submarines at Faslane.') }),
  R('gb2016', 'GB', 2016, 0.519, 'Leave the European Union?', 'Should the United Kingdom remain a member of the European Union or leave it?', ['🚪 Vote Leave', '🇪🇺 Vote Remain'],
    { yesText: 'Leave wins, 52 to 48. The Prime Minister resigns the next morning.', noText: 'Remain wins. Britain stays in the European Union.', onNo: eu('GB', true, [1973]), skip: (state) => !euMemberIn('GB', 2016), icon: '🇪🇺' }),
  /* ---- Canada, Australia, New Zealand ---- */
  R('qc1980', 'CA', 1980, 0.404, 'Sovereignty-association', 'Quebec votes on a mandate to negotiate "sovereignty-association" with the rest of Canada.', ['⚜️ Oui', '🍁 Non'],
    { yesText: 'Oui: Quebec\'s government has its mandate to negotiate.', noText: 'Non, 60 to 40. "À la prochaine fois," says René Lévesque.', region: 'CA-QC',
      onYes: (ctx) => { laterDo(ctx.state, 1981, 'news', { text: 'Ottawa refuses to negotiate sovereignty-association, and the talks go nowhere; but Quebec has voted for it.' }); return null; } }),
  R('ca1992', 'CA', 1992, 0.457, 'The Charlottetown Accord', 'Canada votes on a package of constitutional changes: a distinct society for Quebec, an elected Senate, Aboriginal self-government.', ['✅ Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: the Accord is adopted.', noText: 'No, in six provinces out of ten, Quebec among them. The Constitution stays as it is.' }),
  R('au1999', 'AU', 1999, 0.451, 'The Republic', 'Australia votes on replacing the Queen with a President chosen by Parliament. Many republicans want an elected one instead, and say they will vote no.', ['🇦🇺 Vote yes (republic)', '👑 Vote no'],
    { yesText: 'Yes: Australia will be a republic.', noText: 'No, in every state. The Queen stays.', onYes: (ctx) => { abolish(ctx, 'AU'); return null; } }),
  R('nz1993', 'NZ', 1993, 0.539, 'The electoral system', 'New Zealand votes on keeping first-past-the-post or changing to mixed-member proportional representation.', ['🔢 MMP', '✖️ First-past-the-post'],
    { yesText: 'MMP wins: from 1996, Parliament is elected by proportional representation.', noText: 'First-past-the-post stays.' }),
  R('nz2016', 'NZ', 2016, 0.432, 'The flag', 'New Zealand votes on changing its flag to the silver fern design, or keeping the one with the Union Jack.', ['🌿 The silver fern', '🇳🇿 Keep the flag'],
    { yesText: 'The fern wins: the new flag goes up.', noText: 'The old flag stays, 57 to 43.', onYes: (ctx) => { (ctx.state.world.flagChange ??= {}).NZ = { year: yearNow(ctx.state), id: 'nzFern' }; return null; } }),
  /* ---- Europe ---- */
  R('it1974', 'IT', 1974, 0.407, 'Divorce', 'Italy votes on repealing its new divorce law. The Church and the Christian Democrats campaign for repeal.', ['✖️ Vote yes (repeal)', '💔 Vote no (keep divorce)'],
    { yesText: 'Yes: the divorce law is repealed.', noText: 'No, 59 per cent: divorce stays lawful in Italy.', onYes: law('IT', 'divorce', false) }),
  R('dk1992', 'DK', 1992, 0.493, 'Maastricht', 'Denmark votes on the Maastricht Treaty: the European Union, a single currency.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Denmark ratifies Maastricht.', noText: 'No, by fifty thousand votes. Europe is stunned; Copenhagen will negotiate opt-outs and ask again.' }),
  R('dk1993', 'DK', 1993, 0.567, 'Maastricht, with opt-outs', 'With opt-outs from the euro, defence and citizenship, Denmark votes on Maastricht again.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Denmark ratifies, with its opt-outs. There are riots in Nørrebro that night.', noText: 'No, again. Denmark will have to leave the Union.', onNo: eu('DK', false, [1973, 1995]), skip: (state) => (state.world.referendums.held.dk1992?.yes ?? 0) > 50 }),
  R('fr1992', 'FR', 1992, 0.510, 'Maastricht', 'France votes on the Maastricht Treaty: "le petit oui" or "non"?', ['🇪🇺 Oui', '✖️ Non'],
    { yesText: 'Oui, just: France ratifies Maastricht.', noText: 'Non: France rejects Maastricht. The treaty is dead.' }),
  R('at1994', 'AT', 1994, 0.666, 'Joining the European Union', 'Austria votes on joining the European Union.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes, two to one: Austria joins in 1995.', noText: 'No: Austria stays out.', onNo: eu('AT', false) }),
  R('fi1994', 'FI', 1994, 0.569, 'Joining the European Union', 'Finland votes on joining the European Union.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Finland joins in 1995.', noText: 'No: Finland stays out.', onNo: eu('FI', false) }),
  R('se1994', 'SE', 1994, 0.523, 'Joining the European Union', 'Sweden votes on joining the European Union.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Sweden joins in 1995.', noText: 'No: Sweden stays out.', onNo: eu('SE', false) }),
  R('no1994', 'NO', 1994, 0.478, 'Into Europe, again?', 'Twenty-two years after the last time, Norway votes on joining the European Union.', ['🇪🇺 Vote yes', '🎣 Vote no'],
    { yesText: 'Yes: Norway joins the European Union in 1995.', noText: 'No, again.', onYes: eu('NO', true, [1995]), skip: (state) => euMemberIn('NO', 1994) }),
  R('se2003', 'SE', 2003, 0.42, 'The euro', 'Sweden votes on adopting the euro. Three days before the vote, the foreign minister, Anna Lindh, was stabbed to death in a department store.', ['💶 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Sweden will adopt the euro.', noText: 'No: Sweden keeps the krona.', skip: (state) => !euMemberIn('SE', 2003) }),
  R('mt2003', 'MT', 2003, 0.536, 'Joining the European Union', 'Malta votes on joining the European Union. Labour tells its voters to vote no, spoil the ballot or stay at home.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Malta joins in 2004.', noText: 'No: Malta stays out.', onNo: eu('MT', false) }),
  R('pl2003', 'PL', 2003, 0.775, 'Joining the European Union', 'Poland votes over two days on joining the European Union. The Polish Pope has said yes.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Poland joins in 2004.', noText: 'No: Poland stays out.', onNo: eu('PL', false) }),
  R('hu2003', 'HU', 2003, 0.838, 'Joining the European Union', 'Hungary votes on joining the European Union.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Hungary joins in 2004.', noText: 'No: Hungary stays out.', onNo: eu('HU', false) }),
  R('cz2003', 'CZ', 2003, 0.773, 'Joining the European Union', 'The Czech Republic votes on joining the European Union.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: the Czech Republic joins in 2004.', noText: 'No: it stays out.', onNo: eu('CZ', false) }),
  R('ee2003', 'EE', 2003, 0.668, 'Joining the European Union', 'Estonia votes on joining the European Union.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Estonia joins in 2004.', noText: 'No: Estonia stays out.', onNo: eu('EE', false) }),
  R('hr2012', 'HR', 2012, 0.664, 'Joining the European Union', 'Croatia votes on joining the European Union.', ['🇪🇺 Vote yes', '✖️ Vote no'],
    { yesText: 'Yes: Croatia joins in 2013.', noText: 'No: Croatia stays out.', onNo: eu('HR', false) }),
  R('fr2005', 'FR', 2005, 0.453, 'The European Constitution', 'France votes on the treaty establishing a Constitution for Europe. The "Polish plumber" is the campaign\'s bogeyman.', ['🇪🇺 Oui', '✖️ Non'],
    { yesText: 'Oui: France ratifies the Constitution.', noText: 'Non, 55 per cent: the European Constitution is dead.' }),
  R('nl2005', 'NL', 2005, 0.385, 'The European Constitution', 'Three days after France, the Netherlands votes on the European Constitution.', ['🇪🇺 Voor', '✖️ Tegen'],
    { yesText: 'Voor: the Netherlands ratifies.', noText: 'Tegen, 62 per cent.' }),
  R('gr2015', 'GR', 2015, 0.387, 'The bailout', 'The banks are shut and cash machines give out sixty euros a day. Should Greece accept the creditors\' terms?', ['✅ Nai (yes)', '✖️ Oxi (no)'],
    { yesText: 'Nai: Greece accepts the terms.', noText: 'Oxi, 61 per cent. A week later the government signs a harsher deal anyway.', icon: '🏦' }),
  R('it2016', 'IT', 2016, 0.409, 'The Constitution', 'Italy votes on Matteo Renzi\'s reform of the Senate. He has said he will resign if he loses.', ['✅ Sì', '✖️ No'],
    { yesText: 'Sì: the Senate is cut down to size.', noText: 'No, 59 per cent. Renzi resigns.' }),
  /* ---- Latin America ---- */
  R('cl2020', 'CL', 2020, 0.783, 'A new constitution', 'A year after the estallido, the street protests, Chile votes on replacing Pinochet\'s constitution.', ['✅ Apruebo', '✖️ Rechazo'],
    { yesText: 'Apruebo, 78 per cent: a convention will write a new constitution.', noText: 'Rechazo: the 1980 constitution stays.' }),
  R('cl2022', 'CL', 2022, 0.381, 'The new constitution', 'The convention\'s draft: a plurinational state, rights of nature, the Senate abolished.', ['✅ Apruebo', '✖️ Rechazo'],
    { yesText: 'Apruebo: Chile has a new constitution.', noText: 'Rechazo, 62 per cent: the draft is rejected.', skip: (state) => (state.world.referendums.held.cl2020?.yes ?? 100) <= 50 }),
  R('pr2020', 'PR', 2020, 0.525, 'Statehood', 'Puerto Rico votes on whether to ask to become the 51st state.', ['⭐ Vote for statehood', '✖️ Vote no'],
    { yesText: 'Statehood wins. It is up to Congress now.', noText: 'No: Puerto Rico stays a Commonwealth.', onYes: (ctx) => statehood(ctx, 'PR') }),
];

/** Congress admits a territory, or doesn't. */
function statehood(ctx, cc) {
  const { state, rng } = ctx;
  if (!rng.chance(0.25)) return 'Congress let the bill die, as it had before.';
  (state.world.statehood ??= {})[cc] = yearNow(state);
  const w = (state.world.reforms ??= {});
  w[cc] = { ...(w[cc] ?? {}), name: `the State of ${cname(cc)}, the 51st state`, leader: 'the Governor' };
  setReformLayer(w);
  return `Congress admitted ${cname(cc)} as the 51st state. Its people will vote for the President.`;
}

/* ---- Questions a government can put ---- */
/** Support for independence where a territory might hold the vote. */
const INDEPENDENCE_SUPPORT = { PR: 0.05, GL: 0.4, FO: 0.45, GI: 0.02, BM: 0.25, KY: 0.1, JE: 0.12, GG: 0.1, IM: 0.1 };
const SECESSION = { 'GB-SCT': { name: 'Scotland', support: 0.45, from: 1970, of: 'the United Kingdom' }, 'CA-QC': { name: 'Quebec', support: 0.42, from: 1976, of: 'Canada' } };
/** The questions open to you, as head of government (or a legislator tabling a bill). */
export function questionsHere(state) {
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  const out = [];
  const auto = autonomyOf(state, cc);
  if (auto && INDEPENDENCE_SUPPORT[cc] != null) out.push({ q: 'independence', label: `🏳️ Independence for ${cname(cc)}`, support: INDEPENDENCE_SUPPORT[cc] });
  if (auto && cc === 'PR' && !state.world?.statehood?.PR) out.push({ q: 'statehood', label: '⭐ Statehood (the 51st state)', support: 0.5 });
  // A nation inside a state: Scotland, Quebec (from the years their movements could force the question).
  const region = stateIdOf(state);
  const sec = SECESSION[region];
  if (sec && y >= sec.from && !state.world?.seceded?.[region]) out.push({ q: `secession:${region}`, label: `🏳️ Independence for ${sec.name}`, support: sec.support });
  const laws = [];
  for (const [id, s] of Object.entries(STATUTES)) {
    if (s.where && !s.where(cc)) continue;
    if ((s.from ?? 1800) > y || (s.to != null && y >= s.to)) continue;
    const now = statuteIn(state, id, cc);
    laws.push({ q: `law:${id}`, label: `${s.icon ?? '📜'} ${now ? 'Repeal' : 'Bring in'}: ${s.name.toLowerCase()}`, support: lawSupport(s, cc, y, !now) });
  }
  // The laws with a live argument about them: those opinion is closest to changing.
  return [...out, ...laws.sort((a, b) => b.support - a.support).slice(0, 12)];
}
/** Support for changing a law: high where history was about to make the change, low where it went the other way. */
function lawSupport(s, cc, y, want) {
  for (let k = 0; k <= 60; k += 5) if (Boolean(s.history(cc, y + k)) === want) return clamp(0.5 - k * 0.004, 0.25, 0.55);
  return 0.32;
}

/* ---- Holding the vote ---- */
const votingAge = (y) => (y < 1970 ? 21 : 18);
function noise(rng) { return (rng.float(-1, 1) + rng.float(-1, 1) + rng.float(-1, 1)) * 0.035; }

function holdPrompt(ctx, ref) {
  const { state } = ctx;
  const cc = state.character.countryId ?? 'US';
  const here = !ref.region || stateIdOf(state) === ref.region;
  const canVote = here && state.character.age >= (ref.age ?? votingAge(yearNow(state))) && isCitizen(state, cc) && !state.legal?.incarceration;
  if (!canVote || state.prompts.some((p) => p.type === 'referendum.vote')) return count(ctx, ref, 0, null);
  ctx.prompt({ type: 'referendum.vote', icon: ref.icon ?? '🗳️', title: ref.title, text: `${ref.text} The polls have it close to ${Math.round(ref.yes * 100)}% yes.`,
    options: [
      { id: 'yes', label: ref.yesLabel }, { id: 'no', label: ref.noLabel },
      { id: 'campaignYes', label: `📣 Campaign: ${ref.yesLabel.replace(/^\S+\s/, '')}` }, { id: 'campaignNo', label: `📣 Campaign: ${ref.noLabel.replace(/^\S+\s/, '')}` },
      { id: 'abstain', label: '🤷 Stay at home' },
    ], data: { ref: ref.id ?? null, custom: ref.custom ?? null } });
}

function count(ctx, ref, push, vote) {
  const { state, rng } = ctx;
  const share = clamp(ref.yes + noise(rng) + push, 0.001, 0.9995);
  const won = share > (ref.need ?? 0.5);
  const short = !won && share > 0.5 && ref.shortText;
  rec(state).held[ref.id ?? `${ref.custom.q}.${yearNow(state)}`] = { year: yearNow(state), yes: Math.round(share * 1000) / 10 };
  const what = won ? (ref.onYes?.(ctx) ?? null) : (ref.onNo?.(ctx) ?? null);
  const pct = share > 0.995 ? '99.9' : (Math.round(share * 1000) / 10).toFixed(1);
  const side = vote == null ? '' : vote === won ? ' You were on the winning side.' : ' You were on the losing side.';
  ctx.log(`🗳️ ${ref.title}: ${pct}% yes. ${won ? ref.yesText : short ? ref.shortText : ref.noText}${what ? ` ${what}` : ''}${side}`, '🗳️', 'milestone');
  ctx.emit?.('news:story', { tier: 'national', headline: `${cname(state.character.countryId ?? 'US')}: ${ref.title}: ${won ? 'yes' : 'no'} (${pct}%)`, weight: 8, icon: '🗳️' });
  return won;
}

/** A number in [0, 1) fixed by the life and the year. */
function yearRoll(state, y) {
  let h = (y * 2654435761) ^ ((state.character.birthYear ?? 0) * 40503);
  for (const ch of `${state.character.firstName}${state.character.lastName}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
/** A result's later consequences, in the year they come. */
function aftermath(ctx, l) {
  const { state } = ctx;
  const cc = state.character.countryId ?? 'US';
  if (l.what === 'restore') {
    const w = state.world.reforms ?? {};
    delete w[l.cc];
    setReformLayer(w);
    ctx.emit?.('world:regimeChanged', { cc: l.cc });
    if (cc === l.cc) ctx.log(l.text, '🗳️', 'milestone');
  } else if (l.what === 'secession') {
    const mine = stateIdOf(state) === l.region;
    if (mine) ctx.log(`🏳️ Independence Day: ${l.name} is its own country from today. Its own seat at the UN; for now, the same money in your pocket.`, '🏳️', 'milestone');
    ctx.emit?.('news:story', { tier: mine ? 'national' : 'world', headline: `${l.name} becomes independent`, weight: 9, icon: '🏳️' });
  } else if (l.what === 'news') ctx.log(l.text, '🗳️', 'info');
}

/** A question a government put, as a referendum to hold. */
function customRef(state, { q, cc, called }) {
  const opts = questionsHere({ ...state, character: { ...state.character, countryId: cc } });
  const o = opts.find((x) => x.q === q);
  const base = (o?.support ?? 0.4) + (called ? clamp(((state.politics?.approval ?? 50) - 50) / 400, -0.05, 0.05) : 0);
  if (q === 'independence') return { custom: { q, cc }, title: `A referendum on independence`, text: `${cname(cc)} votes on whether to become an independent country.`, yes: base, yesLabel: '🏳️ For independence', noLabel: '✖️ Against', yesText: 'Independence wins.', noText: 'Independence loses.', onYes: (ctx) => { becomeIndependent(ctx, cc); return `${cname(cc)} will be an independent country.`; } };
  if (q === 'statehood') return { custom: { q, cc }, title: 'A referendum on statehood', text: `${cname(cc)} votes on asking to become a state of the Union.`, yes: base, yesLabel: '⭐ For statehood', noLabel: '✖️ Against', yesText: 'Statehood wins. It is up to Congress now.', noText: 'Statehood loses.', onYes: (ctx) => statehood(ctx, cc) };
  if (q.startsWith('secession:')) {
    const region = q.slice(10);
    const sec = SECESSION[region];
    return { custom: { q, cc }, title: `A referendum on ${sec.name}'s independence`, text: `Should ${sec.name} be an independent country?`, yes: base, region, yesLabel: '🏳️ Yes', noLabel: `✖️ No: stay in ${sec.of}`, yesText: 'Yes wins.', noText: `No: ${sec.name} stays in ${sec.of}.`,
      onYes: (ctx) => secede(ctx, region, sec.name, `${sec.name} will leave ${sec.of}: the terms are to be negotiated.`) };
  }
  const id = q.slice(4);
  const s = STATUTES[id];
  const want = !statuteIn(state, id, cc);
  return { custom: { q, cc }, title: `A referendum: ${s?.name ?? id}`, text: `${want ? 'Should' : 'Should we keep'} ${(s?.name ?? id).toLowerCase()}${want ? ' become law?' : '?'} ${s?.effect ?? ''}`, yes: base,
    yesLabel: want ? '✅ Vote yes: bring it in' : '✅ Vote yes: repeal it', noLabel: '✖️ Vote no', yesText: want ? 'Yes: it becomes law.' : 'Yes: it is repealed.', noText: 'No: the law stays as it is.',
    onYes: (ctx) => { setLaw(ctx.state, cc, id, want); return null; } };
}

export const ReferendumsModule = {
  id: 'referendum',
  order: 34.4,
  init(state) {
    setEuOverrides(state.world?.euMember ?? {});
    // Older saves kept only the year.
    const ind = state.world?.independent;
    if (ind) for (const [cc, v] of Object.entries(ind)) if (typeof v === 'number') ind[cc] = { year: v, of: AUTONOMOUS[cc]?.of ?? null };
    setNewStates(ind ?? {});
  },
  onAgeUp(ctx) {
    const { state } = ctx;
    if (!state.character.alive) return;
    const cc = state.character.countryId ?? 'US';
    const y = yearNow(state);
    const r = rec(state);
    // What earlier results set in motion.
    for (const l of r.later.filter((x) => x.year <= y)) aftermath(ctx, l);
    r.later = r.later.filter((x) => x.year > y);
    if (state.era) for (const ref of HISTORIC) if (ref.cc === cc && ref.year === y && !r.held[ref.id] && !ref.skip?.(state)) holdPrompt(ctx, ref);
    // In the years after the present, governments put questions of their own now and then.
    // (Rolled from the year itself, not the life's dice, so nothing else in the life shifts.)
    const roll = yearRoll(state, y);
    if (y > PRESENT && !r.pending.some((p) => p.cc === cc) && roll < 0.03) {
      const qs = questionsHere(state);
      const big = qs.filter((x) => !x.q.startsWith('law:'));
      const from = big.length && roll < 0.015 ? big : qs;
      const pick = from.length ? from[Math.floor(yearRoll(state, y + 7919) * from.length)] : null;
      if (pick) { r.pending.push({ cc, q: pick.q, year: y + 1, called: false }); ctx.log(`The government has announced a referendum for next year: ${pick.label.replace(/^\S+\s/, '')}.`, '🗳️', 'info'); }
    }
    const due = r.pending.find((p) => p.cc === cc && p.year <= y);
    if (due) {
      r.pending = r.pending.filter((p) => p !== due);
      holdPrompt(ctx, customRef(state, due));
    }
  },
  actions: {
    /** Put a question to the people: arg is the question id (independence, statehood, law:<statute>). */
    call(ctx, q) {
      const { state, rng } = ctx;
      const cc = state.character.countryId ?? 'US';
      const r = rec(state);
      if (r.pending.some((p) => p.cc === cc)) return ctx.toast('A referendum is already on its way', 'warn');
      if (!questionsHere(state).some((x) => x.q === q)) return ctx.toast('Not a question that can be put here', 'warn');
      if (state.yearly['referendum.call']) return ctx.toast('One referendum bill a year', 'warn');
      state.yearly['referendum.call'] = true;
      const leader = governsHere(state);
      // A legislator's bill has to get through the chamber first.
      if (!leader && !rng.chance(0.35)) return ctx.log('Your referendum bill was voted down in the chamber.', '🗳️', 'warn');
      r.pending.push({ cc, q, year: yearNow(state) + 1, called: leader });
      return ctx.log(leader ? 'Your government has called a referendum. The country votes next year.' : 'Your referendum bill passed. The country votes next year.', '🗳️', 'milestone');
    },
  },
  resolvers: {
    vote(ctx, data, optionId) {
      const { state } = ctx;
      const ref = data.ref ? HISTORIC.find((x) => x.id === data.ref) : customRef(state, data.custom);
      if (!ref) return;
      const famous = (state.fame?.score ?? 0) > 40 || Boolean(state.politics?.office);
      const push = { campaignYes: famous ? 0.03 : 0.012, campaignNo: famous ? -0.03 : -0.012 }[optionId] ?? 0;
      if (optionId.startsWith('campaign')) ctx.stat('stress', 3);
      const vote = optionId === 'abstain' ? null : /yes/i.test(optionId);
      count(ctx, ref, push, vote);
    },
  },
};
export const historicReferendum = (id) => HISTORIC.find((x) => x.id === id);
export { AUTONOMOUS };
