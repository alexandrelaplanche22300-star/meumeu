// Quelles méthodes sont définies plusieurs fois ? Deux sources de conflit :
//   1. les modules ajoutés par Object.assign(World.prototype, …) : le dernier appliqué gagne (ordre de world.js) ;
//   2. les méthodes écrites dans le corps de `class World` que l'un de ces modules remplace ensuite.
//   node test/doublons.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('node:fs');
const src=fs.readFileSync(new URL('../js/world.js',import.meta.url),'utf8');
const order=[...src.matchAll(/Object\.assign\(World\.prototype,(\w+)\)/g)].map(m=>m[1]);
const mods={};for(const f of ['eco','wildlife','war','beee','perception','operations','strategy','persistence']){try{const m=await import(`../js/${f}.js`);for(const [k,v] of Object.entries(m))if(v&&typeof v==='object'&&order.includes(k))mods[k]=v;}catch(e){}}
const owners=Object.create(null);for(const n of order){for(const k of Object.keys(mods[n]||{}))(owners[k]??=[]).push(n);}
// méthodes du corps de la classe : lignes « ␣␣nom(…){ » entre `export class World` et la première ligne « } » seule
const body=src.slice(src.indexOf('export class World'),src.indexOf('\n}\n// la gestion'));
const classMethods=new Set([...body.matchAll(/^  (?:static |get |set )?([A-Za-z_]\w*)\(/gm)].map(m=>m[1]));
const kw=new Set(['if','for','while','switch','catch','return','function']);
for(const k of classMethods){if(kw.has(k))continue;if(owners[k])owners[k]=['classe World',...owners[k]];}
const dup=Object.entries(owners).filter(([,o])=>o.length>1);
console.log('ordre :',order.join(' → '));console.log(`${dup.length} méthodes définies plusieurs fois :`);
for(const [k,o] of dup)console.log(`  ${k.padEnd(20)} ${o.join(' → ')}  (actif : ${o[o.length-1]})`);
process.exit(dup.length?1:0);
