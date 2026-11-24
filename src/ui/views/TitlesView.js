/**
 * The Honours tab's papers: how you're styled (in every country whose passport you hold), titles
 * you hold or could buy, and your wallet — driving licence, pilot's licence, boat papers and
 * passports, each drawn in its own country's design of its day.
 */
import { esc, money, button, card, kv } from '../Components.js';
import { styledName, postNominals } from '../../modules/world/Honours.js';
import { professionalTitle, addressOf } from '../../modules/world/Titles.js';
import { TITLE_MARKET, titlesOf, marketNow } from '../../modules/world/BoughtTitles.js';
import { passportsOf, PASSPORT_LABEL } from '../../modules/world/Passports.js';
import { CREDENTIALS } from '../../modules/credentials/CredentialRegistry.js';
import { COUNTRIES, citizenshipsOf } from '../../modules/world/Countries.js';
import { REGIONS } from '../../modules/life/Regions.js';
import { STATES } from '../../modules/life/States.js';
import { yearNow } from '../../modules/world/Eras.js';
import { flagImg } from '../Flags.js';

const as = (state, cc) => ({ ...state, character: { ...state.character, countryId: cc } });

/** How you're written and spoken to, here and in each country whose citizen you are. */
export function titlesCard(state) {
  if (state.character.age < 16) return '';
  const here = state.character.countryId ?? 'US';
  const ccs = [...new Set([here, ...citizenshipsOf(state)])];
  const t = professionalTitle(state);
  const post = postNominals(state);
  const rows = ccs.map((cc) => {
    const s = as(state, cc);
    const spoken = addressOf(s);
    return `<li class="region-row"><span>${flagImg(cc)} <b>${esc(styledName(s))}</b>${post ? `<small>, ${esc(post)}</small>` : ''}</span><small>${esc(COUNTRIES[cc]?.name ?? cc)}${cc === here ? ' (where you live)' : ''}${spoken ? ` · spoken to as “${esc(spoken)}”` : ''}</small></li>`;
  }).join('');
  const b = state.character.baronetcy;
  const owned = titlesOf(state).map((x) => {
    const def = TITLE_MARKET[x.kind];
    const name = def.style ? def.style(state, x.place) : `${def.prefix(state)} (${def.label.replace(/^an? /, '')})`;
    return `<li class="region-row"><span>${def.icon} <b>${esc(name)}</b> ${def.fake ? '<small class="muted">not recognised anywhere</small>' : ''}${x.exposed ? ' <small class="neg">exposed</small>' : ''}</span><small>bought ${x.year}${def.resale ? ` · worth ${money(x.value ?? x.paid)}` : ''}</small>
      ${def.prefix ? button(x.used ? 'Stop using it' : 'Use it', 'boughtTitles.use', { arg: x.id, variant: 'tiny ghost' }) : ''}${button(def.resale ? 'Sell at auction' : 'Throw it away', 'boughtTitles.sell', { arg: x.id, variant: 'tiny ghost' })}</li>`;
  }).join('');
  return card('Your Titles', `<ul class="history">${rows}</ul>
    ${kv([t?.why ? ['From', esc(t.why)] : null, b ? ['Baronetcy', `${b.number === 1 ? 'Created' : `The ${b.number}${b.number === 2 ? 'nd' : b.number === 3 ? 'rd' : 'th'} baronet`}${b.since ? ` in ${b.since}` : ''}${b.how === 'bought' ? ', bought from a broker' : ''} · passes to your eldest son`] : null].filter(Boolean))}
    ${owned ? `<h4 class="sub">Titles held</h4><ul class="history">${owned}</ul>` : ''}
    ${ccs.length > 1 ? '<p class="fine">Each country styles the same person its own way: a doctor is Dr. in Berlin, Dott. in Rome, and plain in Stockholm.</p>' : ''}`, { icon: '🎓', summary: esc(styledName(state)) });
}

/** Titles on the market, real and otherwise. */
export function titleMarketCard(state) {
  if (state.character.age < 18) return '';
  const owned = new Set(titlesOf(state).map((x) => x.kind));
  const items = marketNow(state).filter((x) => !owned.has(x.id));
  if (!items.length) return '';
  const real = items.filter((x) => x.real);
  const fake = items.filter((x) => x.fake);
  const row = (x) => button(`${x.icon} ${x.label}`, 'boughtTitles.buy', { arg: x.id, variant: 'small', hint: money(x.cost), disabled: state.finances.cash < x.cost });
  return card('Titles for Sale', `${real.length ? `<h4 class="sub">Real (of a kind)</h4><div class="action-grid">${real.map(row).join('')}</div>` : ''}${fake.length ? `<h4 class="sub">Novelty</h4><div class="action-grid">${fake.map(row).join('')}</div>` : ''}
    <p class="fine">A lordship of the manor is not a peerage: you are “Lord of the Manor of …”, never “Lord Smith”. The novelties are legal to buy and embarrassing to use.</p>`, { icon: '🛒', open: false });
}

/* ------------------------------------------------------------------ */
/* The wallet                                                          */
/* ------------------------------------------------------------------ */

const EU = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'GR', 'SE', 'DK', 'FI', 'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'RO', 'BG', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY'];
const EU_JOINED = { DE: 1958, FR: 1958, IT: 1958, NL: 1958, BE: 1958, LU: 1958, DK: 1973, IE: 1973, GB: 1973, GR: 1981, ES: 1986, PT: 1986, AT: 1995, SE: 1995, FI: 1995, PL: 2004, CZ: 2004, HU: 2004, SK: 2004, SI: 2004, LT: 2004, LV: 2004, EE: 2004, MT: 2004, CY: 2004, RO: 2007, BG: 2007, HR: 2013 };
const inEU = (cc, y) => (EU.includes(cc) || cc === 'GB') && y >= (EU_JOINED[cc] ?? 9999) && !(cc === 'GB' && y >= 2021);
const DL_NAME = { DE: 'Führerschein', AT: 'Führerschein', FR: 'Permis de conduire', BE: 'Permis de conduire', IT: 'Patente di guida', ES: 'Permiso de conducción', PT: 'Carta de condução', NL: 'Rijbewijs', SE: 'Körkort', DK: 'Kørekort', NO: 'Førerkort', FI: 'Ajokortti', PL: 'Prawo jazdy', JP: '運転免許証', CN: '机动车驾驶证', KR: '운전면허증', BR: 'Carteira Nacional de Habilitação', MX: 'Licencia de Conducir', AR: 'Licencia de Conducir', IN: 'Driving Licence', GB: 'Driving Licence', IE: 'Driving Licence', AU: 'Driver Licence', NZ: 'Driver Licence', CA: "Driver's Licence", US: 'Driver License', RU: 'Водительское удостоверение' };
const num = (state, salt) => { let h = 7; for (const ch of `${state.character.firstName}${state.character.lastName}${salt}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return String(h).padStart(10, '0').slice(0, 9); };

/** A card the size and shape of the real thing (85.6 × 54 mm), coloured as its country made it. */
function plastic({ bg, ink = '#111', head, sub = '', lines = [], flag = '', band = '', photo = true, note = '' }) {
  return `<div class="id-card" style="position:relative;max-width:340px;aspect-ratio:1.586;border-radius:12px;padding:10px 12px;background:${bg};color:${ink};box-shadow:0 2px 6px rgba(0,0,0,.25);font-family:system-ui,sans-serif;overflow:hidden;margin:.4rem 0">
    ${band ? `<div style="position:absolute;left:0;right:0;bottom:0;height:14%;background:${band}"></div>` : ''}
    <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:.8em;letter-spacing:.04em;text-transform:uppercase">${flag}<span>${esc(head)}</span></div>
    ${sub ? `<div style="font-size:.62em;opacity:.8">${esc(sub)}</div>` : ''}
    <div style="display:flex;gap:10px;margin-top:6px">${photo ? '<div style="width:24%;aspect-ratio:.78;background:rgba(0,0,0,.18);border-radius:4px;display:grid;place-items:center;font-size:1.6em">👤</div>' : ''}
      <div style="font-size:.68em;line-height:1.35">${lines.map(([k, v]) => `<div><span style="opacity:.65">${esc(k)}</span> <b>${esc(v)}</b></div>`).join('')}</div></div>
    ${note ? `<div style="position:absolute;right:10px;bottom:16%;font-size:.6em;opacity:.75">${esc(note)}</div>` : ''}</div>`;
}
/** A paper document or booklet of its day. */
const paper = ({ bg, head, lines = [], note = '' }) => `<div class="id-paper" style="max-width:340px;border:1px solid rgba(0,0,0,.25);border-radius:4px;padding:10px 12px;background:${bg};color:#222;font-family:Georgia,serif;margin:.4rem 0;box-shadow:0 1px 3px rgba(0,0,0,.2)"><div style="font-weight:700;letter-spacing:.03em">${esc(head)}</div>${lines.map(([k, v]) => `<div style="font-size:.78em"><i>${esc(k)}</i> ${esc(v)}</div>`).join('')}${note ? `<div style="font-size:.7em;opacity:.7;margin-top:4px">${esc(note)}</div>` : ''}</div>`;

const active = (state, id) => state.credentials?.held?.[id]?.status === 'active';
const heldIn = (state, cat) => Object.entries(state.credentials?.held ?? {}).filter(([id, h]) => CREDENTIALS[id]?.category === cat && h.status === 'active').map(([id]) => id);

function drivingLicence(state) {
  if (!active(state, 'driverLicense')) return '';
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  const name = `${state.character.firstName} ${state.character.lastName}`;
  const born = String(state.character.birthYear ?? y - state.character.age);
  const classes = ['B', active(state, 'motorcycle') ? 'A' : null, active(state, 'cdlB') ? 'C' : null, active(state, 'cdlA') ? 'CE' : null].filter(Boolean).join(' ');
  const lines = [['Name', name], ['Born', born], ['Classes', classes], ['No.', num(state, 'dl')]];
  const title = DL_NAME[cc] ?? 'Driving Licence';
  // Before plastic: paper licences and booklets.
  if (cc === 'GB' && y < 1998) return paper({ bg: y < 1973 ? '#e9c9c2' : '#d7ead2', head: y < 1973 ? 'Driving Licence (red booklet)' : 'Driving Licence', lines: [['Name', name], ['Groups', classes]], note: y < 1973 ? 'Renewed every three years at the council offices.' : 'The green paper licence: no photograph.' });
  if (cc === 'DE' && y < 1999) return paper({ bg: '#c9c9c9', head: 'Führerschein', lines: [['Name', name], ['Klasse', active(state, 'motorcycle') ? '1, 3' : '3']], note: 'The grey “Lappen”, folded in three.' });
  if (cc === 'FR' && y < 2013) return paper({ bg: '#f3c6cf', head: 'Permis de conduire', lines: [['Nom', name], ['Catégories', classes]], note: 'The pink three-fold “permis rose”.' });
  if (cc === 'US' && y < 1958) return paper({ bg: '#efe6c8', head: `${STATES[REGIONS[state.character.regionId]?.state]?.name ?? 'State'} Operator's License`, lines: [['Name', name], ['Born', born]], note: 'No photograph in those days.' });
  if (y < 1960) return paper({ bg: '#ece3cc', head: title, lines: [['Name', name], ['Classes', classes]] });
  if (cc === 'US') {
    const st = STATES[REGIONS[state.character.regionId]?.state];
    return plastic({ bg: 'linear-gradient(135deg,#f5f7fb,#dfe8f3)', head: `${st?.name ?? 'State'} ${y >= 2008 ? '★ ' : ''}Driver License`, sub: y >= 2008 ? 'REAL ID' : '', lines: [['Name', name], ['DOB', born], ['Class', active(state, 'cdlA') ? 'A' : active(state, 'cdlB') ? 'B' : 'D'], ['End', active(state, 'motorcycle') ? 'M' : 'NONE'], ['DL', num(state, 'dl')]], band: '#2b5fa8' });
  }
  if (cc === 'JP') {
    // The band: green for a new driver, blue, gold for five years without a mark.
    const yrs = state.character.age - (state.credentials.held.driverLicense.earnedAge ?? state.character.age);
    const clean = !(state.vehicles?.record?.points);
    return plastic({ bg: '#fbfbf7', head: title, lines, band: yrs < 3 ? '#3aa657' : clean && yrs >= 5 ? '#d4a531' : '#3d6fb6', note: yrs < 3 ? 'green: new driver' : clean && yrs >= 5 ? 'gold: excellent driver' : 'blue' });
  }
  if (inEU(cc, y) || (cc === 'GB' && y >= 1998)) {
    // The pink EU card (from 1996), with the stars and the country's letters; Britain's after 2021 carries the Union flag.
    const mark = cc === 'GB' && y >= 2021 ? flagImg('GB') : `<span style="display:inline-grid;place-items:center;width:26px;height:18px;background:#1f3f9c;color:#ffd700;border-radius:2px;font-size:.7em">${cc === 'GB' ? 'UK' : cc === 'GR' ? 'GR' : cc}</span>`;
    return plastic({ bg: 'linear-gradient(135deg,#fbe3e8,#f4c6d1)', head: title, sub: 'European Union model', flag: mark, lines });
  }
  if (cc === 'BR') return plastic({ bg: 'linear-gradient(135deg,#dfeedd,#b9d8b4)', head: title, flag: flagImg('BR'), lines });
  return plastic({ bg: 'linear-gradient(135deg,#f1f1f1,#d9dde4)', head: title, flag: flagImg(cc), lines });
}

function pilotLicence(state) {
  const held = heldIn(state, 'aviation');
  if (!held.length) return '';
  const cc = state.character.countryId ?? 'US';
  const y = yearNow(state);
  const top = ['atp', 'commercialPilot', 'privatePilot', 'studentPilot'].find((id) => held.includes(id)) ?? held[0];
  const ratings = held.filter((id) => id !== top).map((id) => CREDENTIALS[id].name.replace(/\s*\(.*\)/, '')).join(', ') || 'none';
  const name = `${state.character.firstName} ${state.character.lastName}`;
  if (cc === 'US' && y >= 1999) return plastic({ bg: 'linear-gradient(135deg,#f3efe2,#d8cfae)', head: 'Airman Certificate', sub: 'Federal Aviation Administration', flag: flagImg('US'), lines: [['Name', name], ['Grade', CREDENTIALS[top].name], ['Ratings', ratings], ['Cert. No.', num(state, 'faa')]], photo: false });
  const euBooklet = inEU(cc, y) && y >= 2012;
  return paper({ bg: euBooklet ? '#cfd9ee' : '#e6e1cf', head: euBooklet ? 'Flight Crew Licence (EASA)' : cc === 'US' ? 'Airman Certificate' : 'Pilot\'s Licence', lines: [['Holder', name], ['Licence', CREDENTIALS[top].name], ['Ratings', ratings]], note: euBooklet ? 'A blue booklet, stamped by the national aviation authority.' : y < 1960 ? 'A cloth-bound licence book with your logbook beside it.' : '' });
}

function otherPapers(state) {
  const sea = heldIn(state, 'maritime');
  if (!sea.length) return '';
  return paper({ bg: '#dfe9ee', head: 'Seafarer\'s Papers', lines: sea.map((id) => ['', CREDENTIALS[id].name]), note: 'A discharge book and certificates of competency.' });
}

/** Passport covers of their day: burgundy in the EU from 1985, America's blue from 1976. */
function passportColour(cc, y, kind) {
  if (kind === 'diplomatic') return '#5a1020';
  if (kind === 'official') return '#1c3a5e';
  if (kind === 'laissezPasser') return '#1f6fb5';
  if (cc === 'US') return y < 1926 ? '#6b5a3a' : y < 1976 ? '#24553a' : '#1b2a4a';
  if (cc === 'GB') return y >= 1988 && y < 2020 ? '#6b1a2a' : '#152241';
  if (inEU(cc, y) && y >= 1985) return '#6b1a2a';
  return { JP: '#7a1f2b', IN: '#1d2c55', CN: '#7a1f2b', BR: '#1d2c55', AU: '#1d2c55', CA: '#1d2c55', NZ: '#111', CH: '#b01b1b', RU: '#7a1f2b', MX: '#1f4d2b', ZA: '#1f4d2b', NG: '#1f4d2b' }[cc] ?? '#3a2a2a';
}
function passports(state) {
  const y = yearNow(state);
  if (y < 1915) return '';
  return passportsOf(state).map((p) => {
    const issuer = COUNTRIES[p.country]?.name ?? p.country;
    return `<div class="id-passport" style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:110px;height:155px;margin:.3rem .4rem .3rem 0;border-radius:6px;background:${passportColour(p.country, y, p.kind)};color:#e8c96a;font-family:Georgia,serif;text-align:center;box-shadow:inset -4px 0 0 rgba(0,0,0,.25),0 2px 5px rgba(0,0,0,.3);vertical-align:top">
      <div style="font-size:.62em;letter-spacing:.05em;text-transform:uppercase;padding:0 6px">${esc(issuer)}</div><div style="font-size:1.6em">${COUNTRIES[p.country] ? flagImg(p.country) : '🛂'}</div><div style="font-size:.6em;letter-spacing:.08em;text-transform:uppercase">${esc(PASSPORT_LABEL[p.kind] ?? 'Passport')}</div></div>`;
  }).join('');
}

export function walletCard(state) {
  if (state.character.age < 15) return '';
  const body = drivingLicence(state) + pilotLicence(state) + otherPapers(state);
  const pp = passports(state);
  if (!body && !pp) return '';
  return card('Your Papers', `${body}${pp ? `<h4 class="sub">Passports</h4><div>${pp}</div>` : ''}<p class="fine">Each drawn as its country issued it in ${yearNow(state)}.</p>`, { icon: '🪪' });
}
