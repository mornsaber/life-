// A whole life, every screen as the browser shows it (period names and local money applied), into one text file.
//
//   node tools/life-dump.mjs <CC> <seed> <birth year> [out.txt]
import { Engine } from '../src/core/Engine.js';
import { Store } from '../src/core/State.js';
import { Random } from '../src/core/Random.js';
import { MODULES } from '../src/modules/registry.js';
import { VIEWS } from '../src/ui/Renderer.js';
import { writeFileSync } from 'node:fs';
import { localizeHtml, countryOf } from '../src/modules/world/Countries.js';
import { periodText } from '../src/modules/world/Eras.js';
import { sync } from '../src/modules/world/History.js';
const cc = process.argv[2] ?? 'MD', seed = Number(process.argv[3] ?? 4), start = Number(process.argv[4] ?? 1840);
const m=new Map(); const e=new Engine({store:new Store({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}),rng:new Random(seed),modules:MODULES});
const s=e.newLife({countryId:cc, startYear: start});
const out=[];
const txt=(h)=>h.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ');
const dump=(tag)=>{ for (const [id,v] of Object.entries(VIEWS)) { try { out.push(`=== ${tag} [${id}] ${(sync(s), txt(localizeHtml(periodText(v(s,{})), countryOf(s))))}`); } catch(err) { out.push(`=== ${tag} [${id}] ERROR ${err.message}`); } } };
out.push(`START ${JSON.stringify({name: s.character.firstName+' '+s.character.lastName, region: s.character.regionId, birthYear: s.character.birthYear})}`);
dump('age0');
for (let a=1;a<=60 && s.character.alive;a++) {
  for (let k=0;k<12 && s.prompts.length;k++){const q=s.prompts[0]; out.push(`PROMPT ${s.character.age} ${q.title}: ${q.text} || ${q.options.map(o=>o.label).join(' / ')}`); e.resolvePrompt(q.id,(q.options.find(o=>!o.disabled&&o.tone!=='danger')??q.options[0]).id); if (s.prompts[0]===q) s.prompts.shift();}
  s.stats.health=Math.max(s.stats.health,60);
  e.ageUp();
  if ([12,22,35,50].includes(a)) dump('age'+a);
}
out.push('LOG'); for (const l of s.log ?? []) out.push(`${l.age ?? ''} ${l.icon ?? ''} ${l.text}`);
writeFileSync(process.argv[5] ?? `life-${cc}-${start}-${seed}.txt`, out.join('\n'));
console.log('done', s.character.age, s.character.alive);
