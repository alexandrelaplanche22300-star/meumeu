// Le sifflement des balles : plus de « pschiiit » avant chaque tir.
// CRITÈRES (fixés avant de lancer) — on évalue la vraie fonction whiz() de ui.js avec de fausses dépendances :
//   W1 un tir de NOS soldats ne siffle jamais, même s'il passe tout près d'un soldat sélectionné
//   W2 un tir ennemi qui passe à moins de 1,8 case d'un soldat sélectionné siffle, une fois, avec le MÊME retard que le bruit du coup (jamais avant)
//   W3 un tir ennemi qui passe à plus de 1,8 case des soldats sélectionnés ne siffle pas
//   W4 un tir ennemi qui passe près d'un soldat NON sélectionné ne siffle pas (seules les oreilles sélectionnées comptent)
//   W5 sans soldat sélectionné, aucun sifflement
//   W6 le sifflement est plus faible quand la balle passe plus loin (volume décroissant avec la distance)
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/sifflement.mjs
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../js/ui.js',import.meta.url),'utf8');
const i=src.indexOf('function whiz(e){'),marker="audio.play('whiz',P,{sup:e.sup});}",j=src.indexOf(marker,i)+marker.length;
if(i<0||j<marker.length){console.log('FAIL  la fonction whiz est introuvable');process.exit(2);}
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
function run(shot,{sel=[1],units}){const calls=[];
  const view={sel:new Set(sel)};const world={unit:id=>units.find(u=>u.id===id)};
  const where=(x,y)=>({vol:1,pan:0,far:false});const soundWhere=e=>({vol:1,pan:0,delay:.31});const audio={play:(n,p,o)=>calls.push({n,p:{...p}})};
  const whiz=new Function('view','world','where','soundWhere','audio',src.slice(i,j)+';return whiz;')(view,world,where,soundWhere,audio);
  whiz(shot);return calls;}
const units=[{id:1,f:'meumeu',hp:10,x:100,y:100},{id:2,f:'meumeu',hp:10,x:130,y:100}];
const enemy=(y)=>({type:'shot',f:'beee',x:140,y,x1:60,y1:y});
const w1=run({type:'shot',f:'meumeu',x:90,y:100.2,x1:110,y1:100.2},{units});
P(w1.length===0,'W1. nos propres tirs ne sifflent pas',`${w1.length} sifflement(s)`);
const w2=run(enemy(101),{units});
P(w2.length===1&&w2[0].n==='whiz'&&w2[0].p.delay===.31,'W2. un tir ennemi tout près siffle une fois, avec le retard du coup',`${w2.length} sifflement(s), retard ${w2[0]?.p.delay}`);
const w3=run(enemy(106),{units});
P(w3.length===0,'W3. un tir ennemi à 6 cases ne siffle pas',`${w3.length}`);
const w4=run(enemy(101),{sel:[2],units:[{id:1,f:'meumeu',hp:10,x:100,y:100},{id:2,f:'meumeu',hp:10,x:130,y:110}]});
P(w4.length===0,'W4. seul un soldat sélectionné entend',`${w4.length}`);
const w5=run(enemy(101),{sel:[],units});
P(w5.length===0,'W5. sans sélection, aucun sifflement',`${w5.length}`);
const near=run(enemy(100.4),{units}),far=run(enemy(101.6),{units});
P(near.length===1&&far.length===1&&near[0].p.vol>far[0].p.vol,'W6. plus loin, plus faible',`${near[0]?.p.vol.toFixed(2)} contre ${far[0]?.p.vol.toFixed(2)}`);
process.exit(fail?1:0);
