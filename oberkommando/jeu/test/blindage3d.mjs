// V12.8 · la balistique 3D sur un engin conçu : le rayon contre les vraies plaques, l'incidence, le ricochet, la perforation, l'habitacle, les éclats.
// CRITÈRES (fixés avant de lancer) :
//   D1 un tir de face sur le char moyen incliné (glacis 7,5 mm à 60°) frappe le glacis sous son angle (à 3° près), l'épaisseur vue = t / cos i
//   D2 la tourelle tourne : de face, tourelle droite → une face avant de tourelle ; tournée de 90° → une face de flanc
//   D3 le fusil antichar bèè à 30 m : perce le flanc de la chenillette de transport ; ni l'avant ni le flanc du char moyen
//   D4 un tir perçant visé sur le poste du chargeur blesse le Meumeu assis à ce poste (et son trajet le dit)
//   D5 à travers un râtelier : une charge creuse fait exploser les munitions ≥ 30 % des fois ; une balle ≤ 10 %
//   D6 les éclats de la face intérieure : plus nombreux quand la plaque était épaisse pour le projectile (te / pen proche de 1) que mince
//   D7 un tir rasant (≈ 82° d'incidence) ricoche au moins une fois sur deux
//      CORRECTION DU TEST (D7, premier essai) : le tir partait sous rel = 180° − 82°, c'est-à-dire presque perpendiculaire au flanc (8° d'incidence) ;
//      un tir RASANT arrive de l'avant à 8° de l'axe (rel = 180° − 8°), visé au bord du flanc gauche — il entre par le flanc sous ≈ 82°.
//   D8 un combat de 6 h (antichars bèè contre une chenillette et un char moyen, équipés) : aucune exception
//   node test/blindage3d.mjs [graine]
globalThis.document??={getElementById:()=>({textContent:''})};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');const E=await import('../js/engins.js');const B=await import('../js/blindage3d.js');
const {CARTE}=await import('./_engins_types.mjs');
const SEED=+(process.argv[2]||101);let fail=0,errs=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const W=new World(SEED,CARTE);W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');
const reg=(id,ex)=>{W.s.vdesigns??={};W.s.vdesigns[id]={id,f:'meumeu',name:E.EXEMPLES[ex],status:'prototype',v:E.exemple(ex),t:0};};
reg('t34','t34');reg('chenM','chenM');reg('chenT','chenT');W.enginsSync();
const kcm=100/(E.VEH_VIS*4),R2D=180/Math.PI;
// un engin posé sur une place libre, loin des autres
const used=[];const place=k=>{const V=VEHDEF[k],c=W.capital();for(let r=30;r<300;r+=2)for(let a=0;a<40;a++){const x=Math.floor(c.i+Math.cos(a/40*6.283)*r)+.5,y=Math.floor(c.j+Math.sin(a/40*6.283)*r)+.5;if(used.some(([u,v])=>Math.hypot(u-x,v-y)<20))continue;if(W.vehFits(V,x,y,0)){used.push([x,y]);return W.addCombatVehicle('meumeu',k,x,y,0);}}};
// tirer « à la main » : depuis l'angle rel (par rapport à l'avant de l'engin, positif = le tir va vers la droite de l'engin), visé en (ex, y) cm
const fire=(v,Wd,rel,ex,ycm,R=30)=>{const a=v.h+rel;const sh={x0:v.x-Math.cos(a)*R/4,y0:v.y-Math.sin(a)*R/4,by:null,w:Wd.id||null,R,f:'beee'};W.events.length=0;
  const out=W.vehImpact3D(v,VEHDEF[v.k],{v:Wd.at?Wd.at(R).v:800,ex:ex/kcm,ey:ycm/kcm,H:1},Wd,sh);const ev=W.events.find(e=>e.card)?.card||null;W.events.length=0;return {out,ev};};
// D1
{const D=E.deriveVeh(E.exemple('t34'));const pl=B.platesAt(D);const y=D.G.y0+D.v.H*.75;const {O,d}=B.shotRay(Math.PI,0,y);const h=B.rayPlates(O,d,pl).find(x=>x.enter);
  const ok=h&&h.P.id==='av'&&Math.abs(Math.acos(h.cosI)*R2D-h.P.a)<=3;P(ok,'D1. le glacis incliné, sous son angle',h?`face ${h.P.label} · ${h.P.t} mm à ${h.P.a}° · incidence ${(Math.acos(h.cosI)*R2D).toFixed(1)}° · vue ${(h.P.t/h.cosI).toFixed(1)} mm`:'rien touché');}
// D2
{const D=E.deriveVeh(E.exemple('chenM'));const T=D.tur[0];const y=T.base+T.T.h*.5;const k=yw=>{const {O,d}=B.shotRay(Math.PI,T.T.x,y);return B.rayPlates(O,d,B.platesAt(D,[yw])).find(x=>x.enter)?.P;};
  const a0=k(0),a90=k(Math.PI/2);P(a0?.k==='av'&&a90?.k==='fl','D2. la tourelle tourne',`tourelle droite : ${a0?.label} (${a0?.k}) · tournée de 90° : ${a90?.label} (${a90?.k})`);}
// D3
{const at=W.W('bee_at');const T=place('chenT'),M=place('chenM');const yT=E.deriveVeh(VEHDEF.chenT.engin.v).G.y0+12,yM=E.deriveVeh(VEHDEF.chenM.engin.v).G.y0+15;
  const r1=fire(T,at,Math.PI/2,0,yT),r2=fire(M,at,Math.PI,0,yM),r3=fire(M,at,Math.PI/2,0,yM);
  P(r1.out==='percé'&&r2.out!=='percé'&&r3.out!=='percé','D3. le fusil antichar bèè à 30 m',`chenillette flanc : ${r1.out} (${r1.ev?.t} mm vus ${r1.ev?.te?.toFixed(1)}, perce ${r1.ev?.pen?.toFixed(2)}) · char moyen avant : ${r2.out} (${r2.ev?.te?.toFixed(1)} mm) · flanc : ${r3.out} (${r3.ev?.te?.toFixed(1)} mm)`);}
// une arme d'essai qui perce tout (pour viser l'habitacle) : la balle du fusil de précision lourd, ou une charge creuse
const big=W.W('fpl_meumeu1'),strong=Object.assign(Object.create(big),{pen:()=>60,id:'fpl_meumeu1'});
const heat=Object.assign(Object.create(big),{pen:()=>60,he:{shaped:true,g:1},id:'fpl_meumeu1'});
// D4
{const v=place('chenM');const us=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,4);for(const u of us){u.x=v.x;u.y=v.y;W.vehBoard(v,u);}
  const D=E.deriveVeh(VEHDEF.chenM.engin.v);const m=D.mods.find(x=>x.role==='chargeur');const b=m.box;const zc=(b.z0+b.z1)/2,yc=(b.y0+b.y1)/2;
  const who=B.seatsOf(D,v.crew).get(m.id)?.[0];const h0=(who?.h?.wounds||[]).length;
  // de la gauche (le tir va vers la droite : rel = +90°), le décalage latéral est −z
  const r=fire(v,strong,Math.PI/2,-zc,yc);const h1=(who?.h?.wounds||[]).length;
  P(r.out==='percé'&&who&&(h1>h0||who.hp<=0)&&r.ev?.path?.some(p=>/[Cc]hargeur/.test(p)),'D4. le chargeur touché à son poste',`${r.out} · trajet : ${(r.ev?.path||[]).join(' → ')} · ${who?.name||'personne'} : ${h1-h0} blessure(s)`);}
// D5
{const D=E.deriveVeh(VEHDEF.chenM.engin.v);const rk=D.mods.find(x=>x.kind==='munitions'&&x.box);const b=rk.box;const zc=(b.z0+b.z1)/2,yc=(b.y0+b.y1)/2,xc=(b.x0+b.x1)/2;
  const trial=(Wd,n)=>{let boom=0,thr=0;for(let i=0;i<n;i++){const v=place('chenM');const side=xc<0?Math.PI/2:-Math.PI/2;const r=fire(v,Wd,side,side>0?-zc:zc,yc);if(r.ev?.path?.some(p=>p===rk.label))thr++;if(r.ev?.boom)boom++;}return [boom,thr];};
  const [bh,th]=trial(heat,30),[bb,tb]=trial(strong,30);P(th>=10&&bh/th>=.3&&(tb<10||bb/tb<=.1),'D5. les munitions qui explosent',`charge creuse : ${bh} explosions sur ${th} traversées du râtelier · balle : ${bb} sur ${tb}`);}
// D6
{const D=E.deriveVeh(E.exemple('chenM'));const mk=pen=>Object.assign(Object.create(big),{pen:()=>pen});let thick=0,thin=0;
  for(let i=0;i<20;i++){const v=place('chenM');const y=D.G.y0+15;thick+=fire(v,mk(5.3),Math.PI/2,0,y).ev?.nf||0;const v2=place('chenM');thin+=fire(v2,mk(40),Math.PI/2,0,y).ev?.nf||0;}
  P(thick>thin,'D6. les éclats de la face intérieure',`plaque juste percée (te/pen ≈ 0,95) : ${thick/20} éclats en moyenne · plaque mince pour le projectile : ${thin/20}`);}
// D7
{let ric=0,last='';const n=30;for(let i=0;i<n;i++){const v=place('chenM');const D=E.deriveVeh(VEHDEF.chenM.engin.v);const hw=D.v.W/2;const r=fire(v,mk2(),Math.PI-8/R2D,(hw-1)/Math.cos(8/R2D),D.G.y0+15);if(r.out==='ricochet')ric++;last=`${r.out} sur ${r.ev?.where||'—'} à ${r.ev?.obl?.toFixed(0)}°`;}
  function mk2(){return Object.assign(Object.create(big),{pen:()=>12});}
  P(ric/n>=.5,'D7. un tir rasant ricoche',`${ric} ricochets sur ${n} tirs sous ≈ 82° (dernier : ${last})`);}
// D8
{const T=place('chenT'),M=place('chenM');for(const v of [T,M]){const us=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,3);for(const u of us){u.x=v.x;u.y=v.y;W.vehBoard(v,u);}}
  for(const v of [T,M])for(let n=0;n<2;n++){const b=W.addUnit('beee','soldat',v.x-.5+n,v.y+8,{w:'bee_at',rounds:200});b.task={kind:'guard',tx:b.x,ty:b.y};b.spot={meumeu:W.s.t};}
  const ev={};W.events.length=0;for(let t=0;t<6;t+=.025){try{W.update(.025);}catch(e){errs++;if(errs<3)console.log('ERREUR',e.stack);break;}for(const e of W.events.splice(0))if(e.card)ev[(e.veh===T.id?'chenillette ':'char ')+e.card.out]=(ev[(e.veh===T.id?'chenillette ':'char ')+e.card.out]||0)+1;}
  P(errs===0,'D8. un combat de six heures',`${JSON.stringify(ev)} · exceptions ${errs}`);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
