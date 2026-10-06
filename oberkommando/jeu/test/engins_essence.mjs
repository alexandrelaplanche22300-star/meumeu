// V12.8 · l'essence des engins conçus : elle se brûle en roulant, à sec on s'arrête, le plein se refait tout seul à l'arrêt.
// CRITÈRES (fixés avant de lancer) :
//   R1 un char moyen conçu qui roule : l'essence baisse de (distance roulée × perCase), à 5 % près
//   R2 à sec, il s'arrête (moins de 0,05 case en 1 h avec un ordre de route) et le dit ; une barge (pas un engin conçu) n'a pas d'essence
//   R3 arrêté à moins de 5 cases d'un dépôt qui a de l'essence : plein refait en 1 h au plus ; le stock baisse exactement de ce qui est pris
//   R4 dépôt sans essence : rien ne se passe, il dit qu'il attend de l'essence
//   R5 un camion conçu arrêté à 3 cases, sa soute chargée d'essence, fait le plein du char ; sa soute baisse d'autant (loin de tout dépôt)
//   R6 en roulant, aucun plein (même à côté du dépôt)
//   CORRECTION DU TEST (R2) : le char roulait encore à la fin de R1 (son freinage : 0,19 case) — on le laisse s'arrêter avant de le mettre à sec
//   R7 la jauge survit à la sauvegarde
//   node test/engins_essence.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');const E=await import('../js/engins.js');const {CARTE}=await import('./_engins_types.mjs');
const SEED=+(process.argv[2]||101);const W=new World(SEED,CARTE);W.s.fog=false;
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const run=h=>{for(let t=0;t<h;t+=.025)W.update(.025);};const r2=x=>Math.round(x*100)/100;
W.s.vdesigns={e_char:{id:'e_char',f:'meumeu',name:'Char moyen',status:'prototype',v:E.exemple('chenM'),t:0},e_cam:{id:'e_cam',f:'meumeu',name:'Camion',status:'prototype',v:E.exemple('camion'),t:0}};
W.enginsSync();const V=VEHDEF.e_char,Ee=V.engin;
const cap=W.capital();const D0=W.depots('meumeu',cap.i,cap.j,30)[0];
const spot=(k,x0,y0,pred=()=>true)=>{const Vk=VEHDEF[k];for(let r=0;r<40;r++)for(let a=0;a<32;a++){const x=Math.floor(x0+Math.cos(a/32*6.283)*r)+.5,y=Math.floor(y0+Math.sin(a/32*6.283)*r)+.5;
  if(W.vehFits(Vk,x,y,0)&&!W.s.vehicles.some(o=>Math.hypot(o.x-x,o.y-y)<2.5)&&W.vehOpenAt(Vk,k,x,y,400)&&pred(x,y))return [x,y];}return null;};
const reach=(v,x0,y0)=>{for(let r=0;r<20;r++)for(let a=0;a<24;a++){const x=Math.floor(x0+Math.cos(a/24*6.283)*r)+.5,y=Math.floor(y0+Math.sin(a/24*6.283)*r)+.5;if(W.vehFits(V,x,y,0)&&W.vehPlan(v,x,y))return [x,y];}return null;};
const noDepot=(x,y)=>!W.depots('meumeu',x,y,8).length;
// un char loin de tout dépôt, piloté sans équipage (essai de conduite)
const s1=spot('e_char',cap.i+30,cap.j+30,noDepot);const tank=W.addCombatVehicle('meumeu','e_char',s1[0],s1[1],0);tank.debugDriver=true;
// R1
const f0=tank.fuel;let dist=0,px=tank.x,py=tank.y;const g=reach(tank,tank.x+16,tank.y+4);W.vehMove(tank,g[0],g[1]);
for(let t=0;t<3&&tank.state==='go';t+=.025){W.update(.025);dist+=Math.hypot(tank.x-px,tank.y-py);px=tank.x;py=tank.y;}
const used=f0-tank.fuel,exp=dist*Ee.perCase;
P(dist>8&&Math.abs(used-exp)<=exp*.05,'R1. l’essence baisse avec la distance roulée',`${r2(dist)} cases · brûlé ${r2(used)} · attendu ${r2(exp)} bidons (${r2(Ee.perCase)} par case, plein ${Ee.plein})`);
// R2
tank.state='idle';tank.path=null;tank.itin=null;run(.5);tank.fuel=0;const x2=tank.x,y2=tank.y;const g2=reach(tank,tank.x-12,tank.y);W.vehMove(tank,g2[0],g2[1]);run(1);const mv=Math.hypot(tank.x-x2,tank.y-y2);
const barge=VEHDEF.barge;P(mv<.05&&/sec/.test(tank.why||'')&&!barge.engin,'R2. à sec, il s’arrête et le dit',`déplacé ${r2(mv)} case · « ${tank.why} » · barge sans essence : ${!barge.engin}`);
// R5 (loin des dépôts) : un camion à 3 cases, sa soute pleine d'essence
const s5=spot('e_cam',tank.x,tank.y,(x,y)=>Math.hypot(x-tank.x,y-tank.y)<=3&&Math.hypot(x-tank.x,y-tank.y)>=1.8&&noDepot(x,y));let r5='pas de place pour le camion';
if(s5){const cam=W.addCombatVehicle('meumeu','e_cam',s5[0],s5[1],0);cam.cargo.essence=30;const c0=cam.cargo.essence,t0=tank.fuel;run(1.5);
  r5=`char ${r2(t0)} → ${r2(tank.fuel)} / ${Ee.plein} · soute du camion ${c0} → ${r2(cam.cargo.essence||0)} · « ${tank.why||'—'} »`;
  P(Math.abs(tank.fuel-Ee.plein)<.05&&Math.abs((c0-(cam.cargo.essence||0))-(tank.fuel-t0))<1e-6&&!tank.dry,'R5. le camion ravitailleur fait le plein du char',r5);
  W.s.vehicles.splice(W.s.vehicles.indexOf(cam),1);W.cvs?.splice(W.cvs.indexOf(cam),1);}
else P(false,'R5. le camion ravitailleur fait le plein du char',r5);
// R3 / R4 : un char à côté du dépôt de la capitale
const s3=spot('e_char',D0.i+1,D0.j+1,(x,y)=>W.depots('meumeu',x,y,4).length>0);const t3=W.addCombatVehicle('meumeu','e_char',s3[0],s3[1],0);t3.debugDriver=true;
for(const b of W.depots('meumeu',t3.x,t3.y,5))b.stock.essence=0;t3.fuel=0;run(1);
P(t3.fuel===0&&/essence/.test(t3.why||''),'R4. dépôt sans essence : il attend',`essence ${t3.fuel} · « ${t3.why} »`);
D0.stock.essence=100;const st0=W.depots('meumeu',t3.x,t3.y,5).reduce((a,b)=>a+(b.stock.essence||0),0);run(1);const st1=W.depots('meumeu',t3.x,t3.y,5).reduce((a,b)=>a+(b.stock.essence||0),0);
P(Math.abs(t3.fuel-Ee.plein)<.05&&Math.abs((st0-st1)-t3.fuel)<1e-6&&!t3.dry,'R3. au dépôt, le plein se refait en 1 h',`essence ${r2(t3.fuel)} / ${Ee.plein} · dépôt ${r2(st0)} → ${r2(st1)} · « ${t3.why||'—'} »`);
// R6 : en roulant à côté du dépôt, pas de plein
t3.fuel=Ee.plein*.5;const f6=t3.fuel;const g6=reach(t3,t3.x+10,t3.y);W.vehMove(t3,g6[0],g6[1]);let maxUp=0,last=t3.fuel;
for(let t=0;t<1.5&&t3.state==='go';t+=.025){W.update(.025);if((t3.spd||0)>.5)maxUp=Math.max(maxUp,t3.fuel-last);last=t3.fuel;}
P(maxUp<=1e-9&&t3.fuel<f6,'R6. en roulant, aucun plein',`plus forte hausse en roulant ${maxUp} · ${r2(f6)} → ${r2(t3.fuel)}`);
// R7
try{t3.fuel=7.25;const data=W.serialize();const W2=new World(SEED,CARTE);W2.restore(data);const v2=W2.s.vehicles.find(x=>x.id===t3.id);P(v2?.fuel===7.25,'R7. la jauge survit à la sauvegarde',`relu ${v2?.fuel}`);}
catch(e){P(false,'R7. la jauge survit à la sauvegarde',e.message);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
