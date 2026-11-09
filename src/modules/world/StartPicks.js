/** A start-screen choice of a state of the day, as one value: "DE@leipzig,goerlitz|PL" (country@cities, any of several). */
export const encodePicks = (picks) => picks.map(([cc, regions]) => (regions?.length ? `${cc}@${regions.join(',')}` : cc)).join('|');
export const decodePicks = (value) => String(value).split('|').map((p) => { const [cc, r] = p.split('@'); return [cc, r ? r.split(',') : null]; });
