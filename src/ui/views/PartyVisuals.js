/**
 * How a chamber looks: a hemicycle of seats coloured by party (left to right by where each party
 * stands), a slim seat bar, and a legend with the government marked. Pure: reads, never writes.
 */
import { esc } from '../Components.js';
import { partyInfo, governingParties } from '../../modules/politics/PartySystem.js';

/** Parties in a chamber, left to right, with their details. */
function seated(body) {
  return (body.parties ?? []).map((p) => ({ ...partyInfo(body, p.id), seats: p.seats }))
    .sort((a, b) => (a.id === 'nonparty') - (b.id === 'nonparty') || a.pos - b.pos);
}

/** Split n into k parts proportional to weights (largest remainder). */
function apportion(n, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  const raw = weights.map((w) => (n * w) / total);
  const out = raw.map(Math.floor);
  let left = n - out.reduce((s, x) => s + x, 0);
  raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i] += 1; left -= 1; } });
  return out;
}

/**
 * A hemicycle: dots in rows of a half-circle, filled from the left by the leftmost party. Huge
 * chambers (China's three thousand deputies) draw one dot for several seats.
 */
export function hemicycle(body, { size = 320 } = {}) {
  const parties = seated(body);
  const seats = body.seats;
  if (!parties.length || !seats) return '';
  const per = seats > 900 ? Math.ceil(seats / 600) : 1;
  const dots = Math.ceil(seats / per);
  const rows = Math.max(1, Math.min(16, Math.round(Math.sqrt(dots / 2.6))));
  const inner = rows === 1 ? 0.75 : 0.38;
  const radii = Array.from({ length: rows }, (_, i) => inner + ((1 - inner) * i) / Math.max(1, rows - 1));
  const counts = apportion(dots, radii);
  const pts = [];
  radii.forEach((r, i) => {
    const n = counts[i];
    for (let j = 0; j < n; j++) {
      const a = Math.PI - (n === 1 ? Math.PI / 2 : (Math.PI * j) / (n - 1));
      pts.push({ a, r, x: r * Math.cos(a), y: r * Math.sin(a) });
    }
  });
  pts.sort((p, q) => q.a - p.a || p.r - q.r);
  // Colour the dots party by party, left to right.
  const colours = [];
  for (const p of parties) for (let k = 0; k < Math.round(p.seats / per); k++) colours.push(p.color);
  while (colours.length < pts.length) colours.push(parties[parties.length - 1].color);
  const spacing = Math.PI / Math.max(...counts.map((c, i) => c / radii[i]));
  const dotR = Math.max(0.006, Math.min(0.045, spacing * 0.42, ((1 - inner) / Math.max(1, rows - 1)) * 0.42));
  const W = size;
  const H = size / 2 + 8;
  const sx = (x) => (W / 2 + x * (W / 2 - 6)).toFixed(1);
  const sy = (y) => (H - 4 - y * (W / 2 - 6)).toFixed(1);
  const circles = pts.map((p, i) => `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="${(dotR * (W / 2 - 6)).toFixed(2)}" fill="${colours[i]}"/>`).join('');
  const label = `${body.name}: ${parties.map((p) => `${p.name} ${p.seats}`).join(', ')}`;
  return `<figure class="hemicycle" style="margin:0;text-align:center"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="${esc(label)}">${circles}<text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">${seats.toLocaleString()}</text></svg>${per > 1 ? `<figcaption class="fine">One dot = ${per} seats</figcaption>` : ''}</figure>`;
}

/** A slim bar of seats by party, the majority line marked. */
export function seatBar(body) {
  const parties = seated(body);
  if (!parties.length) return '';
  const segs = parties.map((p) => `<span title="${esc(p.name)}: ${p.seats}" style="display:block;flex:${p.seats} 0 0;background:${p.color};min-width:${p.seats ? 2 : 0}px"></span>`).join('');
  return `<div style="position:relative;display:flex;height:12px;border-radius:6px;overflow:hidden;margin:6px 0" aria-hidden="true">${segs}<span style="position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:currentColor;opacity:.55"></span></div>`;
}

/** The legend: each party, its seats, government ★, banned parties listed after. */
export function partyLegend(body, { banned = [] } = {}) {
  const parties = seated(body);
  const gov = new Set(governingParties(body));
  const majority = Math.floor(body.seats / 2) + 1;
  const govSeats = parties.filter((p) => gov.has(p.id)).reduce((s, p) => s + p.seats, 0);
  const rows = parties.map((p) => `<li style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:${p.color};flex:none"></span><span>${gov.has(p.id) ? '★ ' : ''}${esc(p.name)}</span><b style="margin-left:auto">${p.seats.toLocaleString()}</b></li>`).join('');
  const out = banned.length ? `<li class="fine" style="list-style:none;margin-top:4px">🚫 Banned: ${banned.map((p) => esc(p.name)).join(', ')}</li>` : '';
  const govLine = body.system === 'one' ? 'The Party and its allies hold every seat that matters.' : body.system === 'none' ? 'There are no parties: members sit as appointees.' : `★ Government: ${govSeats.toLocaleString()} seats · majority ${majority.toLocaleString()}${govSeats < majority ? ' (a minority government)' : ''}`;
  return `<ul style="list-style:none;padding:0;margin:4px 0;display:grid;gap:2px">${rows}${out}</ul><p class="fine">${esc(govLine)}</p>`;
}

/** Bar + legend, for compact places. */
export const partyBar = (body) => `${seatBar(body)}${partyLegend(body)}`;
