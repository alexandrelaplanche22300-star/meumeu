// Le feu des véhicules (V4/V5) : chaque poste choisit sa cible, pointe, tire avec la balistique de l'infanterie, consomme ses coups.
// CRITÈRES (fixés avant de lancer) :
//   F1 une automitrailleuse servie et approvisionnée, face à 8 Bèè à 15 cases, en met au moins 3 hors de combat en 1 h de jeu
//      CORRIGÉ (échelle de temps mesurée : une heure de jeu = 4 secondes de combat, une double mitrailleuse y tire ~26 coups) : en 4 h
//   F2 priorité : face à une équipe antichar et à des fusiliers (à distance semblable), la première cible de chaque pièce est l'antichar
//   F3 le canon du char ne tire pas sur un isolé (la coaxiale s'en charge) ; il tire sur un groupe de trois
//   F4 sans servant, aucun coup
//   F5 les coups à bord diminuent ; à vide, plus de tir ; à l'arrêt près d'un dépôt qui a les caisses, le plein se refait
//   F6 l'automoteur (casemate, ±12°) arrêté pivote sa caisse vers une cible à 90° et la prend sous son feu
//   F6 CORRIGÉ (mesuré : les Bèè bougent pendant les 3 h, l'écart final au relèvement de départ ne dit rien) : la caisse a tourné d'au moins 45° vers
//      les cibles et l'engin a tiré
//   F7 aucune exception
// CORRECTION DU TEST (avant tout résultat de tir) : les Bèè à 15 cases étaient hors de la vue de l'équipage (10 cases ce matin-là) ; ils sont mis à
//   8-9 cases. Les armes sont chargées comme après un ravitaillement (le chargeur plein, le reste en soute).
// CORRECTION DU TEST F5 (mesurée, après V6/V7) : depuis que les balles qui percent la tôle blessent vraiment l'équipage (le rayon de vehCrewHit
//   manquait presque toujours), six fusiliers à 8 cases mettent les deux hommes de la jeep hors de combat en 0,2 h, avant que l'affût, au repos vers
//   l'arrière, ait pivoté et visé (0,8 h). F5 mesure les munitions, pas la survie : les cibles restent en place et n'ont pas de cartouches.
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/vehicules_feu.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');
const SEED=+(process.argv[2]||101);let fail=0,errs=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
// un terrain dégagé, loin des villes : un monde neuf, la guerre déclarée, pas de brouillard
const mk=()=>{const W=new World(SEED);W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');WW=W;return W;};
const open=(W,k,x0,y0)=>{const V=VEHDEF[k];for(let r=0;r<80;r++)for(let a=0;a<32;a++){const x=Math.floor(x0+Math.cos(a/32*6.283)*r)+.5,y=Math.floor(y0+Math.sin(a/32*6.283)*r)+.5;
  let ok=W.vehFits(V,x,y,0)&&!W.s.vehicles.some(o=>o.hp>0&&Math.hypot(o.x-x,o.y-y)<14);for(let q=0;ok&&q<12;q+=2)ok=W.vehFits(V,x+q,y,0)&&W.los(x,y,x+q,y);if(ok)return [x,y];}return null;};
const crewUp=(W,v,n)=>{const us=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,n);for(const u of us){u.x=v.x;u.y=v.y;W.vehBoard(v,u);}};
let WW=null;const arm=(v)=>{const V=VEHDEF[v.k];v.mounts.forEach((m,i)=>{const mag=WW.W(m.w).p.mag||1;m.mag=Math.min(mag,V.armes[i].coups);m.pouch=V.armes[i].coups-m.mag;});};
const bee=(W,x,y,w='bee_fusil')=>{const u=W.addUnit('beee','soldat',x,y,{w,rounds:200});u.task={kind:'guard',tx:x,ty:y};u.spot={meumeu:W.s.t};return u;};
const run=(W,h,each)=>{for(let t=0;t<h;t+=.025){try{W.update(.025);}catch(e){errs++;if(errs<3)console.log('ERREUR',e.stack);return;}each?.();}};
const down=us=>us.filter(u=>u.hp<=0||u.h?.state==='hors').length;
// F1
{const W=mk();const c=W.capital();const p=open(W,'automitrailleuse',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','automitrailleuse',p[0],p[1],0);crewUp(W,v,2);arm(v);
  const B=[];for(let n=0;n<8;n++)B.push(bee(W,p[0]+8+(n%4)*.8,p[1]-1.5+Math.floor(n/4)*1.6));let shots=0;W.events.length=0;
  run(W,4,()=>{for(const e of W.events.splice(0))if(e.type==='shot'&&e.veh===v.id)shots++;});
  P(down(B)>=3,'F1. l’automitrailleuse en met au moins 3 hors de combat en 4 h',`hors de combat ${down(B)}/8 · ${shots} coups · coups restants ${v.mounts.map(m=>m.mag+m.pouch).join('/')}`);}
// F2
{const W=mk();const c=W.capital();const res={};for(const k of ['automitrailleuse','char','jeep_mg']){const p=open(W,k,c.i+30,c.j+30+Object.keys(res).length*12);const v=W.addCombatVehicle('meumeu',k,p[0],p[1],0);crewUp(W,v,3);arm(v);
    const R=[bee(W,p[0]+8,p[1]-1),bee(W,p[0]+8,p[1]+1),bee(W,p[0]+7.5,p[1])];const at=bee(W,p[0]+9,p[1]+2.5,'bee_at');const first={};
    run(W,.3,()=>{for(const m of v.mounts)if(m.target&&!first[m.id])first[m.id]=m.target.id;});res[k]=Object.entries(first).map(([id,tid])=>`${id}:${tid===at.id?'antichar':'fusilier'}`).join(',');
    for(const u of [...R,at]){u.hp=0;}W.update(.01);v.hp=0;}
  P(Object.values(res).every(s=>s&&!s.includes('fusilier')),'F2. chaque pièce prend d’abord l’antichar',JSON.stringify(res));}
// F3
{const W=mk();const c=W.capital();const p=open(W,'char',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','char',p[0],p[1],0);crewUp(W,v,3);arm(v);
  const lone=bee(W,p[0]+8.5,p[1]);let canonLone=0,coaxLone=0;W.events.length=0;run(W,1.5,()=>{for(const e of W.events.splice(0))if(e.type==='shot'&&e.veh===v.id){if(e.mount==='canon')canonLone++;else coaxLone++;}});
  lone.hp=0;const G=[bee(W,p[0]+9,p[1]-.5),bee(W,p[0]+9.6,p[1]+.4),bee(W,p[0]+8.8,p[1]+.9),bee(W,p[0]+9.3,p[1]-1.1)];let canonGrp=0;W.events.length=0;
  run(W,2,()=>{for(const e of W.events.splice(0))if(e.type==='shot'&&e.veh===v.id&&e.mount==='canon')canonGrp++;});
  P(canonLone===0&&coaxLone>0&&canonGrp>0,'F3. canon : pas d’obus sur un isolé, des obus sur un groupe',`isolé : canon ${canonLone} coaxiale ${coaxLone} · groupe : canon ${canonGrp}`);}
// F4
{const W=mk();const c=W.capital();const p=open(W,'jeep_mg',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','jeep_mg',p[0],p[1],0);crewUp(W,v,1);arm(v);bee(W,p[0]+8,p[1]);let shots=0;W.events.length=0;
  run(W,.5,()=>{for(const e of W.events.splice(0))if(e.type==='shot'&&e.veh===v.id)shots++;});P(shots===0,'F4. sans servant, aucun coup',`${shots} coups (à bord : ${v.crew.map(u=>u.vrole).join(',')})`);}
// F5
{const W=mk();const c=W.capital();const p=open(W,'jeep_mg',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','jeep_mg',p[0],p[1],0);crewUp(W,v,2);v.mounts[0].mag=10;v.mounts[0].pouch=0;
  const T=[];for(let n=0;n<6;n++)T.push(bee(W,p[0]+8,p[1]-2+n*.8));const pin=T.map(u=>[u.x,u.y]);
  run(W,3,()=>T.forEach((u,i)=>{if(u.hp>0){u.x=pin[i][0];u.y=pin[i][1];u.mag=0;u.rounds=0;}}));const after=v.mounts[0].mag+v.mounts[0].pouch;const dry=v.mounts[0].dry;
  // le plein : près de la capitale (son dépôt), des caisses de munitions de mitrailleuse lourde
  const cap=W.capital();const d=W.building(cap.centre??cap.id)||W.s.buildings.find(b=>b.f==='meumeu'&&b.k==='centre');d.stock['m:mg_lourde_mle1']=(d.stock['m:mg_lourde_mle1']||0)+6;
  const q=open(W,'jeep_mg',d.i+2,d.j+6);v.x=q[0];v.y=q[1];v.state='idle';v.supT=0;W.update(.05);const refill=v.mounts[0].mag+v.mounts[0].pouch;
  P(after<10&&dry&&refill>after,'F5. les coups baissent, à vide on cesse, le plein se refait au dépôt',`10 → ${after} (à vide : ${dry}) → ${refill} après le dépôt`);}
// F6
{const W=mk();const c=W.capital();const p=open(W,'automoteur',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','automoteur',p[0],p[1],-Math.PI/2);crewUp(W,v,4);arm(v);
  const G=[bee(W,p[0]+9,p[1]-.4),bee(W,p[0]+9.5,p[1]+.5),bee(W,p[0]+8.8,p[1]+1)];const h0=v.h;let shots=0;W.events.length=0;run(W,3,()=>{for(const e of W.events.splice(0))if(e.type==='shot'&&e.veh===v.id)shots++;});
  P(Math.atan2(Math.sin(v.h-h0),Math.cos(v.h-h0))>Math.PI/4&&shots>0,'F6. l’automoteur pivote sa caisse vers la cible et tire',`cap ${(h0*57.3).toFixed(0)}° → ${(v.h*57.3).toFixed(0)}° · ${shots} coups · hors de combat ${down(G)}/3`);}
P(errs===0,'F7. aucune exception',`${errs}`);
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
