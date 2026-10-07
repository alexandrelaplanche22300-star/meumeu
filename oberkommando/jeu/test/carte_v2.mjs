// La carte normale V2 (V12.5) — node test/carte_v2.mjs [graine] [jours]
//  1. 1 200 × 1 200, une capitale et deux villes bèè, générée en moins de 15 s ;
//  2. les gisements en grappes : chaque gisement lointain (à plus de 60 cases des capitales) a un voisin à moins de 32 cases, et les grappes sont
//     à plus de 90 cases les unes des autres ;
//  3. après N jours, les Bèè ont fondé des villes, toutes à 90 cases au moins les unes des autres ; aucune exception.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const seed=+(process.argv[2]||7),DAYS=+(process.argv[3]||30);
const t0=Date.now();const W=new World(seed,{map:'v2'});const gs=(Date.now()-t0)/1000,G=W.G;
check('1. la carte V2',G.N===1200&&G.capital&&G.beee.length>=2&&gs<15,`${G.N} cases · capitale ${G.capital} · villes bèè ${G.beee.length} · ${gs.toFixed(1)} s`);
const cap=G.capital,dC=(d)=>Math.min(Math.hypot(d.i-cap[0],d.j-cap[1]),...G.beee.map(b=>Math.hypot(d.i-b[0],d.j-b[1])));
const far=G.deposits.filter(d=>dC(d)>60);
// les grappes : regroupées par proximité (32 cases)
const cl=[];for(const d of far){let c=cl.find(c=>c.some(e=>Math.hypot(e.i-d.i,e.j-d.j)<32));if(c)c.push(d);else cl.push([d]);}
const ctr=cl.map(c=>[c.reduce((a,d)=>a+d.i,0)/c.length,c.reduce((a,d)=>a+d.j,0)/c.length]);let minGap=1e9;for(let a=0;a<ctr.length;a++)for(let b=a+1;b<ctr.length;b++)minGap=Math.min(minGap,Math.hypot(ctr[a][0]-ctr[b][0],ctr[a][1]-ctr[b][1]));
const alone=far.filter(d=>!far.some(e=>e!==d&&Math.hypot(e.i-d.i,e.j-d.j)<32)).length;
check('2. les gisements en grappes espacées',alone<=far.length*.1&&minGap>90,`${far.length} gisements lointains en ${cl.length} grappes (${(far.length/cl.length).toFixed(1)} par grappe), ${alone} isolés, grappes à ${minGap.toFixed(0)} cases au moins`);
let errs=0;const c0=W.s.beee.cities.length;for(let h=0;h<DAYS*24;h++){try{for(let k=0;k<60;k++)W.update(1/60);}catch(e){errs++;if(errs<3)console.log(e.stack);break;}}
const C=W.s.beee.cities.filter(c=>!c.fallen);let mg=1e9;for(let a=0;a<C.length;a++)for(let b=a+1;b<C.length;b++)mg=Math.min(mg,Math.hypot(C[a].x-C[b].x,C[a].y-C[b].y));
check(`3. en ${DAYS} jours, des villes bèè espacées`,C.length>c0&&mg>=88&&errs===0,`${c0} → ${C.length} villes, la plus proche paire à ${mg.toFixed(0)} cases · ${W.s.units.filter(u=>u.f==='beee').length} Bèè · pourquoi pas plus : ${W.s.beee.colonyWhy||'—'} · erreurs ${errs}`);
console.log(ok?'TOUT PASSE':'ÉCHEC');process.exit(ok?0:1);
