// Les plans de bunkers : chacun doit être jouable, dans les quatre orientations.
//  - toutes les cases de sol sont reliées à une porte par le sol (on y entre, on y circule) ;
//  - chaque porte a une case de sol à l'intérieur et une case libre à l'extérieur (on peut y arriver) ;
//  - chaque embrasure touche au moins une case de sol (un poste de tir) et au moins une case libre à l'extérieur (elle regarde dehors) ;
//  - chaque G a un poste, au moins un poste de tir par type sauf l'abri, la fosse à mortier et l'observatoire (une fente) ;
//  - la rotation conserve le nombre de cases de chaque sorte.
import {BUNKER_TYPES,BUNKER_IDS,bunkerPlan,bunkerDefs} from '../js/bunkerdata.js';
let ok=true;const bad=(id,rot,msg)=>{console.log('ÉCHEC',id,'rot',rot,':',msg);ok=false;};
const N4=[[0,-1],[1,0],[0,1],[-1,0]];
for(const id of BUNKER_IDS){const base=bunkerPlan(id,0);const count=P=>{const c={};for(const r of P.rows)for(const ch of r)c[ch]=(c[ch]||0)+1;return JSON.stringify(Object.entries(c).sort());};
  for(let rot=0;rot<4;rot++){const P=bunkerPlan(id,rot);const at=P.at;
    if(!P.rows.every(r=>r.length===P.w))bad(id,rot,'lignes de longueurs différentes');
    if(count(P)!==count(base))bad(id,rot,'la rotation change le contenu');
    if(rot%2===0?(P.w!==base.w||P.h!==base.h):(P.w!==base.h||P.h!==base.w))bad(id,rot,'dimensions après rotation');
    // sol relié aux portes
    const seen=new Set(),q=[];for(const [a,c] of P.doors){seen.add(a+','+c);q.push([a,c]);}
    while(q.length){const [a,c]=q.pop();for(const [dx,dy] of N4){const x=a+dx,y=c+dy;const ch=at(x,y);if(!'.oGAD'.includes(ch)||seen.has(x+','+y))continue;seen.add(x+','+y);q.push([x,y]);}}
    for(let c=0;c<P.h;c++)for(let a=0;a<P.w;a++)if('.oGA'.includes(at(a,c))&&!seen.has(a+','+c))bad(id,rot,`case de sol ${a},${c} (${at(a,c)}) non reliée à une porte`);
    if(!P.doors.length)bad(id,rot,'aucune porte');
    for(const [a,c] of P.doors){const inside=N4.some(([dx,dy])=>'.oGA'.includes(at(a+dx,c+dy)));const outside=N4.some(([dx,dy])=>at(a+dx,c+dy)===' ');if(!inside)bad(id,rot,`porte ${a},${c} sans sol à l'intérieur`);if(!outside)bad(id,rot,`porte ${a},${c} sans case libre à l'extérieur`);}
    for(const [a,c] of P.embr){const inside=N4.some(([dx,dy])=>'.oGA'.includes(at(a+dx,c+dy)));const outside=N4.some(([dx,dy])=>at(a+dx,c+dy)===' ');if(!inside)bad(id,rot,`embrasure ${a},${c} sans poste de tir`);if(!outside)bad(id,rot,`embrasure ${a},${c} ne regarde pas dehors`);}
    // étanchéité : aucune case de sol (ni de fosse) ne touche l'extérieur — un ennemi n'entrerait pas par la porte mais par là
    for(let c=0;c<P.h;c++)for(let a=0;a<P.w;a++)if('.oGA'.includes(at(a,c))&&N4.some(([dx,dy])=>at(a+dx,c+dy)===' '))bad(id,rot,`case de sol ${a},${c} ouverte sur l'extérieur`);
    const tir=P.posts.filter(p=>p.kind==='tir').length,gun=P.posts.filter(p=>p.kind==='gun').length;
    if(!tir&&!['abri','fosse_mortier'].includes(id)&&!gun)bad(id,rot,'aucun poste de tir');
    if(base.guns&&gun!==base.guns)bad(id,rot,'postes de pièce');
    for(const p of P.posts.filter(p=>p.kind==='tir'||p.kind==='gun')){if(!(p.fx||p.fy))bad(id,rot,`poste ${p.a},${p.c} sans direction`);}}}
const D=bunkerDefs();console.log(BUNKER_IDS.length,'types ;',Object.entries(D).map(([k,d])=>`${d.name} ${d.size.join('×')} ${JSON.stringify(d.cost)} ${d.hours}h hp ${d.hp}`).join('\n  '));
console.log(ok?'\nTOUT PASSE':'\nIL Y A DES ÉCHECS');
