// L'équipage des véhicules (V3) : monter, conduire, descendre.
// CRITÈRES (fixés avant de lancer) :
//   E1 sans conducteur, un engin ne bouge pas, même avec un ordre de route
//   (des villageois : tout Meumeu peut monter à bord, soldat ou non)
//   E2 six soldats envoyés vers une jeep (4 places) : 4 montent (1 conducteur, 3 passagers), 2 restent à terre (« plus de place »)
//   E3 avec un conducteur, la jeep roule jusqu'à son but (à 1 case près, en moins de 4 h)
//   E4 « tout le monde descend » : tous redeviennent des unités, sur des cases praticables, hors de l'emprise de l'engin
//   E5 la jeep à mitrailleuse : 1 conducteur, 1 servant, 2 passagers
//      (CORRECTION V12.8 : la jeep à mitrailleuse est conçue au bureau — 1 passager, pas 2 comme l'ancienne fiche ; le critère lit ses places)
//   E6 la partie avec un équipage à bord se sauvegarde et se recharge (JSON) : l'équipage est toujours à bord, à son poste
// CORRECTION DU TEST (mesurée sur les graines 104 et 107) : le but fixe de E3 (14 cases à l'est, 2 au sud) tombait sur un arbre dès la création du
//   monde, et sur la graine 104 la jeep naissait dans une poche fermée par les arbres (aucun but atteignable entre 8 et 20 cases) — elle refusait
//   la route, à raison. Le départ est la case libre la plus proche qui débouche (vehOpenAt), le but la case atteignable la plus proche du point visé.
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/vehicules_equipage.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');
const SEED=+(process.argv[2]||101);const {enginsDeTest}=await import('./_engins_types.mjs');const W=enginsDeTest(new World(SEED));W.s.fog=false;const N=W.N;
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const cap=W.capital();const run=h=>{for(let t=0;t<h;t+=.025)W.update(.025);};
const spot=(k,x0,y0)=>{const V=VEHDEF[k];for(let r=0;r<14;r++)for(let a=0;a<24;a++){const x=Math.floor(x0+Math.cos(a/24*6.283)*r)+.5,y=Math.floor(y0+Math.sin(a/24*6.283)*r)+.5;if(W.vehFits(V,x,y,0)&&!W.s.vehicles.some(o=>Math.hypot(o.x-x,o.y-y)<3))return [x,y];}return null;};
const spotOpen=(k,x0,y0)=>{const V=VEHDEF[k];for(let r=0;r<24;r++)for(let a=0;a<24;a++){const x=Math.floor(x0+Math.cos(a/24*6.283)*r)+.5,y=Math.floor(y0+Math.sin(a/24*6.283)*r)+.5;if(W.vehFits(V,x,y,0)&&W.vehOpenAt(V,k,x,y,600))return [x,y];}return null;};
const reachFrom=(v,x0,y0)=>{const V=VEHDEF[v.k];for(let r=0;r<20;r++)for(let a=0;a<24;a++){const x=Math.floor(x0+Math.cos(a/24*6.283)*r)+.5,y=Math.floor(y0+Math.sin(a/24*6.283)*r)+.5;if(W.vehFits(V,x,y,0)&&W.vehPlan(v,x,y))return [x,y];}return null;};
const s1=spotOpen('jeep',cap.i+10,cap.j+12);const jeep=W.addCombatVehicle('meumeu','jeep',s1[0],s1[1],0);
// E1
W.vehMove(jeep,jeep.x+12,jeep.y);run(1);const moved1=Math.hypot(jeep.x-s1[0],jeep.y-s1[1]);P(moved1<.05,'E1. sans conducteur, l’engin ne bouge pas',`déplacé de ${moved1.toFixed(2)} case(s) en 1 h`);jeep.state='idle';jeep.itin=null;jeep.path=null;
// E2
const sol=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0).slice(0,6);sol.forEach((u,n)=>{u.x=jeep.x-3+n*.6;u.y=jeep.y+3;u.task=null;u.path=null;});
const r2=W.order(sol.map(u=>u.id),{type:'vehicle',id:jeep.id});run(2);
const roles=c=>c.reduce((o,u)=>(o[u.vrole]=(o[u.vrole]||0)+1,o),{});const R2=roles(jeep.crew||[]);const left=sol.filter(u=>!u.inVeh).length;
P((jeep.crew||[]).length===4&&R2.conducteur===1&&R2.passager===3&&left===2,'E2. quatre montent (1 conducteur, 3 passagers), deux restent',`ordre : ${r2.text||r2.why} · à bord ${JSON.stringify(R2)} · à terre ${left}`);
// E3
const [gx,gy]=reachFrom(jeep,jeep.x+14,jeep.y+2);const ok3=W.vehMove(jeep,gx,gy);let t3=0;while(t3<4&&jeep.state==='go'){run(.25);t3+=.25;}const d3=Math.hypot(jeep.x-gx,jeep.y-gy);
P(ok3&&d3<1,'E3. avec un conducteur, la jeep roule jusqu’à son but',`à ${d3.toFixed(2)} case du but après ${t3.toFixed(2)} h`);
// E4
const out4=W.vehUnboard(jeep,'tous');const cost=W.vehCost(VEHDEF.jeep);const c=Math.cos(jeep.h),s=Math.sin(jeep.h);
const bad=out4.filter(u=>{const lx=(u.x-jeep.x)*c+(u.y-jeep.y)*s,ly=-(u.x-jeep.x)*s+(u.y-jeep.y)*c;const inside=Math.abs(lx)<VEHDEF.jeep.long/2&&Math.abs(ly)<VEHDEF.jeep.large/2;return inside||!W.s.units.includes(u)||u.inVeh||cost(Math.floor(u.y)*N+Math.floor(u.x))===Infinity&&W.occ[Math.floor(u.y)*N+Math.floor(u.x)]>=0;});
P(out4.length===4&&!bad.length&&!(jeep.crew||[]).length,'E4. tous descendent, à terre, hors de l’emprise',`descendus ${out4.length} · mal placés ${bad.length} · encore à bord ${(jeep.crew||[]).length}`);
// E5
const s5=spot('jeep_mg',cap.i+6,cap.j+16);const jm=W.addCombatVehicle('meumeu','jeep_mg',s5[0],s5[1],0);const sol5=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,4);sol5.forEach((u,n)=>{u.x=jm.x-2+n*.6;u.y=jm.y+2.5;u.task=null;});
W.order(sol5.map(u=>u.id),{type:'vehicle',id:jm.id});run(2);const R5=roles(jm.crew||[]);
const NP=VEHDEF.jeep_mg.places.passagers;P(R5.conducteur===1&&R5.servant===1&&R5.passager===NP,`E5. jeep à mitrailleuse : 1 conducteur, 1 servant, ${NP} passager(s)`,JSON.stringify(R5));
// E6
let e6='';try{const json=JSON.stringify(W.s);const back=JSON.parse(json);const v2=back.vehicles.find(v=>v.id===jm.id);const R6=roles(v2?.crew||[]);e6=`${(json.length/1024).toFixed(0)} Ko · relu ${JSON.stringify(R6)}`;P(R6.conducteur===1&&R6.servant===1&&R6.passager===NP,'E6. sauvegarde et relecture avec un équipage à bord',e6);}
catch(e){P(false,'E6. sauvegarde et relecture avec un équipage à bord',e.message);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
