// Audit: do badges of rank match their titles? For every force, track and grade, in each year,
// flags a rank whose title is of its period (a Landsman, a Jemadar, an Airman Third Class) but
// whose badge is still today's, and two different titles in one ladder that share a badge.
//
//   node tools/insignia-audit.mjs [CC ...] [--years=1820,1900,...] [--strict]
import { setEraYear, PRESENT, branchFrom } from '../src/modules/world/Eras.js';
import { branchOf, rankOf } from '../src/modules/military/MilitaryEngine.js';
import { militaryInsignia } from '../src/ui/Insignia.js';
import '../src/modules/registry.js';

const args = process.argv.slice(2);
const ccs = args.filter((a) => !a.startsWith('--'));
const years = (args.find((a) => a.startsWith('--years='))?.slice(8) ?? '1820,1860,1900,1916,1940,1960,1990').split(',').map(Number);
const BRANCHES = ['army', 'navy', 'airforce', 'marines'];
const code = (nation, track, grade) => (nation ? `${track === 'enlisted' ? 'OR' : 'OF'}-${grade + 1}` : `${track === 'enlisted' ? 'E' : 'O'}-${grade + 1}`);

/** [title, badge] for each grade of a ladder in a year. */
export function ladderBadges(nation, branch, track, year) {
  setEraYear(year);
  try {
    const svc = { nation, branch, track, grade: 0 };
    const titles = branchOf(svc)?.[track] ?? [];
    return titles.map((_, grade) => { const title = rankOf({ ...svc, grade }).title; return [title, militaryInsignia(code(nation, track, grade), nation ?? null, { branch, title })]; });
  } catch { return []; } finally { setEraYear(null); }
}

/**
 * Known and correct: a rank renamed but not re-badged, or a badge that two grades really did share.
 * [country, pattern on the old title (or "a / b" for a shared badge)].
 */
const ALLOW = [
  ['RU', /^(Praporshchik|Podporuchik|Poruchik|Shtabs-Kapitan|Junior Unter-Ofitser|Senior Unter-Ofitser|Feldfebel|Kaptenarmus|Podpraporshchik|Zauryad-Praporshchik|Kvartirmeyster|Botsmanmat|Botsman|Senior Botsman)/], // the Soviet boards copied the Tsar's
  ['JP', /Taishō|Gensui|Sōchō|Jun-i|Shōho|1-sa/], // a Gensui wore a Taishō's insignia; a sergeant major and a warrant officer looked alike
  ['US', /Quartermaster Sergeant|First Sergeant|Coxswain|Quartermaster|Boatswain's Mate/], // three chevrons and a tie; the old rating badges
  ['GB', /Leading Seaman|Garrison Sergeant Major|Regimental Sergeant Major|Warrant Officer|Quartermaster Sergeant|Colonel-Commandant/],
  ['CA', /Leading Seaman|Chief Petty Officer|Midshipman|Air Chief Marshal/], ['IN', /Honorary|Master Chief|Brigadier/],
  ['IT', /Maresciallo|Generale d'Armata/], ['DE', /Obermatrose|Obermaat|Unteroffizier|Offizierstellvertreter/],
];
const allowed = (cc, text) => ALLOW.some(([c, re]) => c === cc && re.test(text));

export function auditInsignia(nations, yrs = years) {
  const flags = [];
  const base = (t) => String(t).replace(/^Acting /, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  for (const cc of nations) for (const b of BRANCHES) for (const t of ['enlisted', 'officer']) {
    // Only forces that exist: marines where a country has them, each branch from its founding.
    if (b === 'marines' && !['US', 'GB', 'FR'].includes(cc)) continue;
    const nation = cc === 'US' ? undefined : cc;
    const today = ladderBadges(nation, b, t, PRESENT);
    for (const y of yrs) {
      if ((branchFrom(cc, b) ?? 0) > y) continue;
      const then = ladderBadges(nation, b, t, y);
      then.forEach(([title, badge], i) => {
        const [nowTitle, nowBadge] = today[i] ?? [];
        // A title of its period wearing today's badge.
        // (Naval officers' sleeve rings follow the grade in every period; a variant of today's title is today's rank.)
        const variant = base(title) === base(nowTitle ?? '') || String(nowTitle ?? '').startsWith(base(title));
        if (!variant && !(t === 'officer' && ['navy', 'coastguard'].includes(b)) && badge && badge === nowBadge && !/^(Private|Seaman|Lieutenant|Captain|Major|Colonel|Sergeant|Corporal|Commander)$/.test(title)) { if (!allowed(cc, title)) flags.push(`${cc} ${b} ${t} ${y} #${i}: "${title}" wears today's badge for "${nowTitle}"`); }
        // Two titles, one badge, side by side.
        const next = then[i + 1];
        if (next && base(next[0]) !== base(title) && next[1] && next[1] === badge) { if (!allowed(cc, `${title} / ${next[0]}`)) flags.push(`${cc} ${b} ${t} ${y} #${i}/${i + 1}: "${title}" and "${next[0]}" share a badge`); }
      });
    }
  }
  return [...new Set(flags)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flags = auditInsignia(ccs.length ? ccs : ['US', 'GB', 'DE', 'FR', 'RU', 'JP', 'IT', 'IN', 'CA', 'AU']);
  for (const f of flags) console.log(f);
  console.log(`\n${flags.length} flags.`);
  if (args.includes('--strict') && flags.length) process.exit(1);
}
