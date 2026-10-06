// V12.8 · un chenillé conçu au bureau des engins transporte des Meumeu et des ressources, comme la jeep et le camion.
// CRITÈRES (fixés avant de lancer) :
//   T1 un char moyen conçu avec 3 passagers et 10 caisses de soute s'inscrit dans la partie (enginsSync) : chenilles, 3 passagers, 10 caisses,
//      ses servants = son équipage moins le conducteur
//   T2 dix Meumeu envoyés vers lui : le conducteur, les servants et 3 passagers montent ; les autres restent à terre
//   T3 près d'un dépôt, la soute se charge (du fer : 10 unités = 1 caisse) jusqu'à 10 caisses, pas plus ; elle se décharge au dépôt
//   T4 « débarquer les passagers » : seuls les passagers descendent, l'équipage reste à son poste
//      (mesuré, graine 101 : la partie n'a que 8 Meumeu libres — 7 montent, 1 reste ; le critère compte ceux qu'on envoie)
//   T5 la partie se sauvegarde et se recharge : l'engin conçu, son équipage et sa soute sont toujours là
//   node test/engins_transport.mjs [graine]   (ou ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/engins_transport.mjs)
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');const E=await import('../js/engins.js');const {CARTE}=await import('./_engins_types.mjs');
const SEED=+(process.argv[2]||101);const W=new World(SEED,CARTE);W.s.fog=false;
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const run=h=>{for(let t=0;t<h;t+=.025)W.update(.025);};
// T1
const v=E.exemple('chenM');v.passagers=3;v.soute=10;const ID='e_test';
W.s.vdesigns={[ID]:{id:ID,f:'meumeu',name:'Char de transport',status:'prototype',v,t:0}};W.enginsSync();const V=VEHDEF[ID];const crewN=E.deriveVeh(v).crew.length;
P(V&&V.roues==='chenilles'&&V.places.passagers===3&&V.soute===10&&V.places.servants===crewN-1,'T1. le chenillé conçu s’inscrit, bancs et soute compris',
  V?`${V.roues} · servants ${V.places.servants} (équipage ${crewN}) · passagers ${V.places.passagers} · soute ${V.soute}`:'pas de fiche');
// un départ libre, près d'un dépôt (le centre de la capitale)
const D0=W.depots('meumeu',W.capital().i,W.capital().j,30)[0];let at=null;
for(let r=2;r<14&&!at;r++)for(let a=0;a<24&&!at;a++){const x=Math.floor(D0.i+1+Math.cos(a/24*6.283)*r)+.5,y=Math.floor(D0.j+1+Math.sin(a/24*6.283)*r)+.5;if(W.vehFits(V,x,y,0)&&W.depots('meumeu',x,y,4).length)at=[x,y];}
const tank=W.addCombatVehicle('meumeu',ID,at[0],at[1],0);
// T2
const sol=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,10);sol.forEach((u,n)=>{u.x=tank.x-3+n*.5;u.y=tank.y+2.5;u.task=null;u.path=null;});
W.order(sol.map(u=>u.id),{type:'vehicle',id:tank.id});run(3);
const roles=c=>c.reduce((o,u)=>(o[u.vrole]=(o[u.vrole]||0)+1,o),{});const R2=roles(tank.crew||[]);const left=sol.filter(u=>!u.inVeh).length;const seats=1+V.places.servants+3;
P(R2.conducteur===1&&R2.servant===V.places.servants&&R2.passager===3&&left===sol.length-seats,'T2. l’équipage et trois passagers montent, les autres restent',`à bord ${JSON.stringify(R2)} · à terre ${left} sur ${sol.length}`);
// T3
D0.stock.fer=(D0.stock.fer||0)+500;const l1=W.vehLoad(tank,'fer',60),l2=W.vehLoad(tank,'fer',200),full=W.souteUsed(tank),l3=W.vehLoad(tank,'fer',10);
const u1=W.vehUnload(tank,'fer');const empty=W.souteUsed(tank);
P(l1.ok&&Math.abs(full-10)<1e-6&&!l3.ok&&u1.ok&&empty<1e-6,'T3. la soute se charge jusqu’à 10 caisses, pas plus, et se décharge',`60 fer : ${l1.ok?'ok':l1.why} · puis 200 : ${l2.ok?'ok':l2.why} · soute ${full} / 10 · en plus : ${l3.ok?'accepté':l3.why} · déchargée : ${empty}`);
// T4
W.vehLoad(tank,'fer',40);const out4=W.vehUnboard(tank,'passagers');const R4=roles(tank.crew||[]);
P(out4.length===3&&!R4.passager&&R4.conducteur===1&&R4.servant===V.places.servants,'T4. seuls les passagers descendent',`descendus ${out4.length} · à bord ${JSON.stringify(R4)}`);
// T5
let t5='';try{const data=W.serialize();delete VEHDEF[ID];const W2=new World(SEED,CARTE);W2.restore(data);const v2=W2.s.vehicles.find(x=>x.id===tank.id);const R5=roles(v2?.crew||[]);
  t5=`${(data.length/1024).toFixed(0)} Ko · fiche ${VEHDEF[ID]?'oui':'non'} · à bord ${JSON.stringify(R5)} · soute ${W2.souteUsed(v2)}`;
  P(!!VEHDEF[ID]&&R5.conducteur===1&&R5.servant===V.places.servants&&Math.abs(W2.souteUsed(v2)-4)<1e-6,'T5. sauvegarde et relecture',t5);}
catch(e){P(false,'T5. sauvegarde et relecture',e.message);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
