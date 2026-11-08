/**
 * Flags as images. Today's flags are the flag-icons set (MIT licence, icons/flags/LICENSE-flag-icons.txt);
 * flags that no longer fly are drawn here as simple SVGs: the US flag with its stars of the year, the
 * Union Flag before Ireland joined, the Soviet red flag, the Qing dragon flag, the Kaiser's tricolour,
 * the Kingdom of Italy's, Bourbon France's white flag, Canada's Red Ensign and others.
 *
 * Germany 1933–45 is shown with the black-white-red tricolour the Reich also flew, not the swastika flag.
 */
import { periodFlag } from '../modules/world/Eras.js';

const W = 60;
const H = 45;
const wrap = (body, title) => `<svg class="flag-img" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>`;
const bands = (colors, vertical = false) => colors.map((c, i) => (vertical
  ? `<rect x="${(i * W) / colors.length}" y="0" width="${W / colors.length + 0.5}" height="${H}" fill="${c}"/>`
  : `<rect x="0" y="${(i * H) / colors.length}" width="${W}" height="${H / colors.length + 0.5}" fill="${c}"/>`)).join('');
const star = (cx, cy, r, fill) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.4 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};
/** The Union Flag (with or without St Patrick's saltire), scaled into a box. */
const union = (w, h, patrick = true) => `<svg x="0" y="0" width="${w}" height="${h}" viewBox="0 0 60 30" preserveAspectRatio="none">
  <rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>
  ${patrick ? '<path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="2"/>' : ''}
  <path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>`;

const DRAW = {
  usStars({ n }) {
    const stripes = Array.from({ length: 13 }, (_, i) => `<rect x="0" y="${(i * H) / 13}" width="${W}" height="${H / 13 + 0.3}" fill="${i % 2 ? '#fff' : '#B22234'}"/>`).join('');
    const cw = W * 0.4;
    const ch = (H * 7) / 13;
    const cols = Math.ceil(Math.sqrt(n * (cw / ch)));
    const rows = Math.ceil(n / cols);
    let stars = '';
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      stars += star(((c + 0.5) * cw) / cols, ((r + 0.5) * ch) / rows, Math.min(cw / cols, ch / rows) * 0.36, '#fff');
    }
    return wrap(`${stripes}<rect width="${cw}" height="${ch}" fill="#3C3B6E"/>${stars}`, `The Stars and Stripes (${n} stars)`);
  },
  gbPre1801: () => wrap(union(W, H, false), 'The Union Flag of Great Britain (1707–1800)'),
  ussr: () => wrap(`<rect width="${W}" height="${H}" fill="#CC0000"/>${star(12, 7, 3, 'none').replace('fill="none"', 'fill="none" stroke="#FFD700" stroke-width="0.8"')}<text x="12" y="20" font-size="11" text-anchor="middle" fill="#FFD700">☭</text>`, 'The flag of the Soviet Union'),
  prussia: () => wrap(bands(['#111', '#fff']), 'The flag of Prussia'),
  germanEmpire: () => wrap(bands(['#111', '#fff', '#DD0000']), 'The black-white-red of the German Reich'),
  sardinia: () => wrap(`<rect width="${W}" height="${H}" fill="#1F4E9E"/><rect x="18" y="10" width="24" height="25" fill="#C8102E"/><rect x="27.5" y="10" width="5" height="25" fill="#fff"/><rect x="18" y="20" width="24" height="5" fill="#fff"/>`, 'The flag of the Kingdom of Sardinia'),
  italyKingdom: () => wrap(`${bands(['#009246', '#fff', '#CE2B37'], true)}<rect x="24" y="15" width="12" height="15" fill="#1F4E9E"/><rect x="25" y="16" width="10" height="13" fill="#C8102E"/><rect x="29" y="16" width="2" height="13" fill="#fff"/><rect x="25" y="21.5" width="10" height="2" fill="#fff"/><text x="30" y="14.5" font-size="5" text-anchor="middle" fill="#B8860B">♛</text>`, 'The flag of the Kingdom of Italy'),
  bourbon: () => wrap(`<rect width="${W}" height="${H}" fill="#F8F6EE" stroke="#ccc"/><text x="30" y="30" font-size="18" text-anchor="middle" fill="#C9A227">⚜</text>`, 'The white flag of Bourbon France'),
  qing: () => wrap(`<rect width="${W}" height="${H}" fill="#F5C400"/><path d="M8,30 C14,18 22,34 30,22 C36,13 44,28 52,16" fill="none" stroke="#1D4F9C" stroke-width="3.2" stroke-linecap="round"/><circle cx="52" cy="11" r="3.2" fill="#C8102E"/><circle cx="9" cy="30" r="2.2" fill="#1D4F9C"/>`, 'The Yellow Dragon Flag of the Qing'),
  fiveRaces: () => wrap(bands(['#C8102E', '#F5C400', '#3B6BC4', '#fff', '#111']), 'The Five Races Under One Union flag'),
  iranLionSun: () => wrap(`${bands(['#239F40', '#fff', '#DA0000'])}<text x="30" y="27" font-size="11" text-anchor="middle" fill="#C9A227">🦁</text>`, 'The Lion and Sun flag of Iran'),
  redEnsign: () => wrap(`<rect width="${W}" height="${H}" fill="#C8102E"/>${union(W / 2, H / 2)}<path d="M40,18 h10 v8 q0,6 -5,8 q-5,-2 -5,-8 z" fill="#fff" stroke="#999" stroke-width="0.6"/>`, 'The Red Ensign'),
  southAfrica1928: () => wrap(`${bands(['#FF7F00', '#fff', '#002395'])}${union(10, 7)}`, 'The flag of the Union of South Africa'),
  brazilEmpire: () => wrap(`<rect width="${W}" height="${H}" fill="#009B3A"/><polygon points="30,5 55,22.5 30,40 5,22.5" fill="#FEDF00"/><circle cx="30" cy="22.5" r="7" fill="#009B3A" stroke="#fff" stroke-width="1"/><text x="30" y="16" font-size="6" text-anchor="middle" fill="#B8860B">♛</text>`, 'The flag of the Empire of Brazil'),
  egyptKingdom: () => wrap(`<rect width="${W}" height="${H}" fill="#2E8B57"/><circle cx="27" cy="22.5" r="9" fill="#fff"/><circle cx="30" cy="22.5" r="7.5" fill="#2E8B57"/>${star(34, 16, 2, '#fff')}${star(37, 22.5, 2, '#fff')}${star(34, 29, 2, '#fff')}`, 'The flag of the Kingdom of Egypt'),
  portugalMonarchy: () => wrap(`${bands(['#1F3F8F', '#fff'], true)}<rect x="24" y="13" width="12" height="16" rx="2" fill="#fff" stroke="#C8102E" stroke-width="1.6"/><text x="30" y="12" font-size="6" text-anchor="middle" fill="#B8860B">♛</text>`, 'The flag of the Kingdom of Portugal'),
  libyaGreen: () => wrap(`<rect width="${W}" height="${H}" fill="#009A00"/>`, 'The green flag of Libya'),
  yugoslavia: () => wrap(`${bands(['#003893', '#fff', '#DE0000'])}${star(30, 22.5, 7, '#DE0000').replace('/>', ' stroke="#FFD700" stroke-width="0.8"/>')}`, 'The flag of Yugoslavia'),
};

/** A country's flag in the year being played, as an image (HTML). */
export function flagHtml(state, cc, { cls = '' } = {}) {
  const f = periodFlag(state, cc ?? 'US');
  if (f.id && DRAW[f.id]) return `<span class="flag ${cls}">${DRAW[f.id](f)}</span>`;
  const code = String(f.img ?? cc ?? 'US').toLowerCase();
  return `<img class="flag ${cls}" src="icons/flags/${code}.svg" alt="" width="20" height="15" loading="lazy">`;
}
