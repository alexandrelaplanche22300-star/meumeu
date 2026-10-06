// L'armement d'un ouvrage bèè : un Tobrouk et une casemate à canon, finis, une garnison de fusiliers, les armes au dépôt voisin.
// Critères : la pièce du Tobrouk a une mitrailleuse lourde et 2 servants ; la casemate un canon et 1 servant ; le poste à mitrailleuse 2 fusils-mitrailleurs.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {T}=await import('../js/data.js');const {bunkerPlan,bunkerKey}=await import('../js/bunkerdata.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const W=new World(104,{map:'mer'});const N=W.N;const city=W.s.beee.cities[0];
const free=(i0,j0,w,h)=>{for(let r=4;r<80;r++)for(let a=0;a<24;a++){const i=Math.round(i0+Math.cos(a/24*6.283)*r),j=Math.round(j0+Math.sin(a/24*6.283)*r);let f=true;for(let dj=-2;dj<h+2&&f;dj++)for(let di=-2;di<w+2;di++){const k=(j+dj)*N+i+di;const t=W.G.terrain[k];if(!(t>=T.sand&&t<=T.dirt)||W.occ[k]>=0||W.nodeAt[k]>=0){f=false;break;}}if(f)return [i,j];}};
const dep=W.addBuilding('beee','camp',...free(city.x+14,city.y,2,2),true);dep.stock={'a:bee_mg_lourde':3,'m:bee_mg_lourde':6,'a:bee_canon':3,'m:bee_canon':12,'a:bee_mg':4,'m:bee_mg':6};
const mk=type=>{const P=bunkerPlan(type,0);const at=free(dep.i+6,dep.j,P.w,P.h);const b=W.addBuilding('beee',bunkerKey(type),at[0],at[1],true,[P.w,P.h],0);b.done=true;b.progress=1;return b;};
const tob=mk('tobrouk'),cas=mk('casemate_canon'),pmg=mk('poste_mg');
for(let n=0;n<20;n++){const u=W.addUnit('beee','soldat',dep.i+2+(n%5)*.6,dep.j+4+Math.floor(n/5)*.6,{w:'bee_fusil',rounds:60});u.city=city.id;u.task={kind:'guard',tx:u.x,ty:u.y};}
W.s.beee.fort={on:true,t:0};W.fortGarrison();W.s.beee.fort.armT=-99;W.fortArm();for(let k=0;k<4*60;k++)W.update(1/60);W.s.beee.fort.armT=-99;W.fortArm();
const desc=b=>{const o=b.occ||{};return Object.entries(o).map(([k,id])=>{const u=W.unit(id);const p=W.bunkerPosts(b).find(q=>q.k===+k);return `${p?.kind}:${u?.w?.replace('bee_','')}${u?.serve!=null?'(servant)':''}`;}).join(' ');};
const gunner=(b,w)=>Object.values(b.occ||{}).map(i=>W.unit(i)).find(u=>u?.w===w&&u.serve==null);const serv=u=>u?W.s.units.filter(o=>o.serve===u.id).length:0;
const gt=gunner(tob,'bee_mg_lourde'),gc=gunner(cas,'bee_canon');
check('Tobrouk : mitrailleuse lourde et 2 servants',!!gt&&serv(gt)>=2,desc(tob));
check('casemate : canon et 1 servant',!!gc&&serv(gc)>=1,desc(cas));
check('poste à mitrailleuse : 2 fusils-mitrailleurs',Object.values(pmg.occ||{}).filter(i=>W.unit(i)?.w==='bee_mg').length>=2,desc(pmg));
console.log(ok?'TOUT PASSE':'IL Y A DES ÉCHECS');
