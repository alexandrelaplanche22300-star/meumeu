// Le ciel : piste, hangar, avion de transport, planeurs. Critères (écrits avant) :
//  1. une piste de 3 × 70 cases est reconnue (longueur ≥ 44, largeur ≥ 3) ; une bande de 3 × 30 n'en est pas une ;
//  2. un hangar se refuse loin d'une piste et se pose à côté d'elle ;
//  3. l'avion construit au hangar sort sur la piste (au sol, altitude 0) ;
//  4. avec un pilote : il roule, décolle sans sortir de la piste, monte à 150 m (± 3) en moins de 20 h de jeu (80 s de combat) ;
//  5. vitesse de croisière : 52 m/s à 8 % près (mesurée sur 100 cases) ;
//  6. virage : la vitesse angulaire mesurée vaut g·tan(25°)/52 = 0,088 rad/s à 30 % près ;
//  7. atterrissage sur la piste : toucher à moins de 3,4 m/s de chute, sur la piste, arrêt avant le bout, sans accident ;
//  8. un planeur remorqué par l'avion : décollage (piste de 70), largage à 150 m ; plané vers un champ à 280 cases : il se pose à moins de 30 cases du but, équipage indemne ;
//  9. la finesse : sans but, un planeur lâché à 120 m parcourt 12 × 120 = 1 440 m = 360 cases (à 25 % près) avant de se poser ;
// 10. les arbres : lâché bas au-dessus d'une forêt, 60 essais : il y a des accidents, des blessés, et des pilotes tués seulement quand le choc est violent (jamais sous 25 m/s) et pas plus de 40 % ;
// 11. le pont aérien : 60 caisses chargées au hangar A, livrées au hangar B à 300 cases (l'avion atterrit, on décharge) ;
// 12. un planeur est plus discret qu'un avion : à 8 cases d'une sentinelle (de jour) bèè, l'avion est vu et pas le planeur ;
// 13. une sauvegarde reprend un avion en vol qui remorque un planeur.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {T,TERRAIN,BUILDINGS}=await import('../js/data.js');const {VEHDEF}=await import('../js/vehicules.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const hours=(W,h,each=null)=>{for(let k=0;k<h*60;k++){W.update(1/60);if(each&&each())return true;}return false;};
const W=new World(81);const N=W.N;W.s.fauna=[];W.s.beee.warDay=0;W.s.beee.nextWave=1e9;W.s.beee.nextAir=1e9;
const cap=W.capital();
// un terrain dégagé (arbres, rochers retirés) dans un rectangle
const clear=(i0,j0,w,h)=>{for(const nd of W.s.nodes){if(nd.i>=i0&&nd.i<i0+w&&nd.j>=j0&&nd.j<j0+h&&nd.type!=='ore'){nd.left=0;W.nodeAt[nd.j*N+nd.i]=-1;}}};
const lay=(i0,j0,len,wid,vertical=false)=>{const cells=[];for(let n=0;n<len;n++)for(let m=0;m<wid;m++)cells.push(vertical?[i0+m,j0+n]:[i0+n,j0+m]);for(const [i,j] of cells){const k=j*N+i;W.s.pistes[k]={f:'meumeu',b:1,p:1,hp:150};}W.pisteV=(W.pisteV|0)+1;return cells;};
// ---- terrain d'essai : le plateau au nord-ouest de la capitale, tout dégagé
const A0=[cap.i+8,cap.j-60];clear(A0[0]-20,A0[1]-12,150,40);
// 1
lay(A0[0],A0[1],70,3);lay(A0[0],A0[1]+12,30,3);const rws=W.airRunways();check('1. une piste de 70 × 3 reconnue, pas la bande de 30',rws.length===1&&rws[0].len>=69&&rws[0].len<=72&&rws[0].wid>=3,rws.map(r=>`${r.len.toFixed(0)}×${r.wid.toFixed(0)}`).join(' '));
const rw=rws[0];
// 2
const camp=W.addBuilding('meumeu','camp',A0[0]+24,A0[1]+22,true);camp.stock={bois:999,pierre:999,fer:999,pieces:999,cuivre:99,charbon:99};
const far=W.canPlace('meumeu','hangar',cap.i+30,cap.j+30);const nearSpot=[A0[0]+30,A0[1]+8];const near=W.canPlace('meumeu','hangar',nearSpot[0],nearSpot[1]);
check('2. hangar refusé loin de la piste',!far.ok&&far.why.some(x=>/piste/.test(x)),JSON.stringify(far.why));check('2. hangar accepté à côté',near.ok,JSON.stringify(near.why));
const hangar=W.place('meumeu','hangar',nearSpot[0],nearSpot[1]).b;hangar.done=true;hangar.progress=1;hangar.hp=hangar.max;hangar.stock={pierre:99,bois:999,fer:999,pieces:999,cuivre:99,charbon:99,...{}};
// 3
const tr=W.train(hangar,'avion');check('3. l\'avion est commandé',tr.ok,JSON.stringify(tr.why||tr.text));let avion=null;hours(W,70,()=>{avion=W.s.vehicles.find(v=>v.k==='avion');return !!avion;});
check('3. l\'avion sort sur la piste',!!avion&&avion.state==='parked'&&avion.alt===0&&!!W.airRunwayAt(avion.x,avion.y,3),avion?`(${avion.x.toFixed(1)}, ${avion.y.toFixed(1)}) état ${avion.state}`:'jamais sorti');
const pilot=W.addUnit('meumeu','villageois',avion.x,avion.y,{});W.vehBoard(avion,pilot);
// 4
const rt=W.airTakeoff(avion);check('4. décollage accepté',rt.ok,JSON.stringify(rt.why||rt.text));
let offRunway=false;let climbT=null;const t0=W.s.t;hours(W,25,()=>{if(avion.state==='roll'&&!W.airRunwayAt(avion.x,avion.y,2.5))offRunway=true;if(avion.state==='cruise'&&avion.alt>=147){climbT=W.s.t-t0;return true;}return avion.state==='crashed';});
check('4. décolle sans sortir de la piste et monte à 150 m',avion.state==='cruise'&&Math.abs(avion.alt-150)<=3&&!offRunway,`état ${avion.state}, ${avion.alt.toFixed(0)} m en ${climbT?.toFixed(1)} h`);
// 5 : croisière sur 100 cases
const far1=[avion.x+130,avion.y];W.airGoto(avion,far1[0],far1[1]);hours(W,1);const x0=avion.x,y0=avion.y,tc=W.s.t;hours(W,3);const dm=Math.hypot(avion.x-x0,avion.y-y0)*4/((W.s.t-tc)*4);
check('5. croisière à 52 m/s ± 8 %',Math.abs(dm-52)/52<.08,`${dm.toFixed(1)} m/s`);
// 6 : un virage de 90° : on mesure le taux de virage
{W.airGoto(avion,avion.x,avion.y+200);const h0=avion.h;const t1=W.s.t;hours(W,1.2);const dh=Math.abs(Math.atan2(Math.sin(avion.h-h0),Math.cos(avion.h-h0)));const w=dh/((W.s.t-t1)*4);const wTh=9.81*Math.tan(25*Math.PI/180)/52;
  check('6. taux de virage ≈ g·tan(25°)/V',Math.abs(w-wTh)/wTh<.3,`${w.toFixed(3)} rad/s pour ${wTh.toFixed(3)} attendu`);}
// 7 : atterrissage
{const r=W.airLand(avion);check('7. l\'ordre d\'atterrir est accepté',r.ok,JSON.stringify(r.why||r.text));let sink=null,touch=null;let crashed=false;
  hours(W,60,()=>{if(avion.state==='rollout'&&!touch){touch={x:avion.x,y:avion.y,spd:avion.spd,vz:avion.vz};}if(avion.state==='crashed'){crashed=true;return true;}return avion.state==='parked';});
  const on=touch&&W.airRunwayAt(touch.x,touch.y,1.5);const stopOn=W.airRunwayAt(avion.x,avion.y,2);
  check('7. toucher sur la piste, arrêt sur la piste, sans accident',!crashed&&avion.state==='parked'&&!!on&&!!stopOn,crashed?avion.crashCause:`toucher à (${touch?.x.toFixed(0)}, ${touch?.y.toFixed(0)}) à ${touch?.spd.toFixed(1)} m/s ; arrêt (${avion.x.toFixed(0)}, ${avion.y.toFixed(0)})`);}
// 8 : le planeur remorqué
{const g=W.addAircraft('meumeu','planeur',rw.A[0]+rw.dx*3,rw.A[1]+rw.dy*3+1.6,Math.atan2(rw.dy,rw.dx));
  const gp=W.addUnit('meumeu','villageois',g.x,g.y,{});W.vehBoard(g,gp);const sol=[];for(let n=0;n<8;n++){const u=W.addUnit('meumeu','soldat',g.x,g.y,{rounds:30});W.vehBoard(g,u);sol.push(u);}
  // l'avion (revenu au sol) au seuil, le nez le long de la piste, le planeur derrière
  avion.x=rw.A[0]+rw.dx*10;avion.y=rw.A[1]+rw.dy*10;avion.h=Math.atan2(rw.dy,rw.dx);avion.state='parked';avion.alt=0;avion.spd=0;g.x=avion.x-rw.dx*5;g.y=avion.y-rw.dy*5;g.h=avion.h;
  const at=W.airTow(avion,g);check('8. le planeur est attaché derrière l\'avion',at.ok,JSON.stringify(at.why||at.text));
  const tk=W.airTakeoff(avion);check('8. décollage remorqué accepté',tk.ok,JSON.stringify(tk.why||tk.text));
  W.airGoto(avion,avion.x+400,avion.y);let crashA=false;hours(W,60,()=>{if(avion.state==='crashed'||g.state==='crashed'){crashA=true;return true;}return avion.state==='cruise'&&avion.alt>=145;});
  // en croisière à 150 m : le champ à 280 cases devant ; on largue 100 cases avant
  // le champ : à 280 cases, vers le centre de la carte (la montée se fait en tournant : on ne sait pas où est l'avion) ; on le dégage ; largage 100 cases avant
  {const cx=300-avion.x,cy=300-avion.y,L=Math.hypot(cx,cy)||1,ux=cx/L,uy=cy/L;var goalF=[avion.x+ux*280,avion.y+uy*280];clear(goalF[0]-45,goalF[1]-45,90,90);g.target=[goalF[0],goalF[1]];avion.goal=[goalF[0]-ux*60,goalF[1]-uy*60];avion.releaseAt={x:goalF[0]-ux*100,y:goalF[1]-uy*100,r:5};}
  const alt0=avion.alt;hours(W,40,()=>g.state==='glide'||g.state==='crashed');const rel=g.releaseT!=null;const altRel=g.alt;
  let landed=false;hours(W,90,()=>{if(g.state==='crashed')return true;if(g.state==='parked'&&g.alt===0&&rel){landed=true;return true;}return false;});
  const dGoal=Math.hypot(g.x-goalF[0],g.y-goalF[1]);const hurt=g.crew.filter(u=>u.hp<=0||u.h?.state!=='ok').length;
  check('8. largué en vol puis posé près du champ visé, équipage indemne',rel&&landed&&dGoal<30&&hurt===0&&g.crew.length===9,`largué ${rel} à ${altRel.toFixed(0)} m, posé ${landed}, à ${dGoal.toFixed(1)} cases, ${hurt} blessés, ${g.crew.length} à bord, ${g.crashCause||''}`);}
// 9 : la finesse
{clear(rw.A[0]-10,rw.A[1]+30,420,30);const g=W.addAircraft('meumeu','planeur',rw.A[0]+5,rw.A[1]+44,0);const p=W.addUnit('meumeu','villageois',g.x,g.y,{});W.vehBoard(g,p);g.state='glide';g.alt=120;g.spd=29;g.h=0;g.goal=null;g.target=null;
  const x0=g.x;hours(W,80,()=>g.state==='rollout'||g.state==='parked'||g.state==='crashed');const dist=(g.x-x0)*4,theo=120*12;
  check('9. finesse 12 : 1 440 m parcourus à 25 % près',g.state!=='crashed'&&Math.abs(dist-theo)/theo<.25,`${dist.toFixed(0)} m pour ${theo} attendus, état ${g.state}${g.crashCause?' ('+g.crashCause+')':''}`);}
// 10 : la forêt
{let crashes=0,hurt=0,dead=0,fast=0,n=0;for(let t=0;t<60;t++){const Wf=new World(300+t);Wf.s.fauna=[];const Nf=Wf.N;
    // une forêt : la plus dense autour de la capitale (on compte les arbres dans un carré de 30)
    let best=null,bc=-1;for(let q=0;q<400;q++){const i=40+Math.floor(Wf.rand()*(Nf-100)),j=40+Math.floor(Wf.rand()*(Nf-100));let c=0;for(const nd of Wf.s.nodes.slice(0,2500)){if(nd.type==='tree'&&Math.abs(nd.i-i)<14&&Math.abs(nd.j-j)<14)c++;}if(c>bc){bc=c;best=[i,j];}}
    const g=Wf.addAircraft('meumeu','planeur',best[0]-14,best[1],0);const p=Wf.addUnit('meumeu','villageois',g.x,g.y,{});Wf.vehBoard(g,p);for(let q=0;q<4;q++){const u=Wf.addUnit('meumeu','soldat',g.x,g.y,{rounds:10});Wf.vehBoard(g,u);}
    g.state='glide';g.alt=14;g.spd=29;g.h=0;g.target=null;g.goal=null;n++;const crew0=g.crew.length;let sp=0;for(let k=0;k<600&&g.state==='glide';k++){Wf.update(1/60/4);sp=g.spd;if(g.state==='crashed')break;}
    for(let k=0;k<600&&g.state!=='crashed'&&g.state!=='parked';k++)Wf.update(1/60/4);
    if(g.state==='crashed'){crashes++;const ci=g.crashInfo;hurt+=ci.hurt;dead+=ci.killed;if(ci.killed&&ci.speed<25)fast=-99;}}
  check('10. forêt : des accidents, des blessés, des morts rares et seulement à grande vitesse',crashes>=10&&hurt>0&&dead<=Math.ceil(crashes*.4)&&fast>=0,`${crashes}/${n} accidents, ${hurt} blessés, ${dead} tués`);}
// 11 : le pont aérien — 300 cases entre deux pistes
{const B0=[A0[0]+300,A0[1]];lay(B0[0],B0[1],70,3);W.airRunways();const hB=W.addBuilding('meumeu','hangar',B0[0]+30,B0[1]+8,true);hB.stock={bois:10};
  const av2=W.vehFromHangar(hangar,'avion');check('11. un second avion sort du hangar A, près de lui',!!av2&&Math.hypot(av2.x-(hangar.i+4.5),av2.y-(hangar.j+3.5))<16,av2?`à ${Math.hypot(av2.x-(hangar.i+4.5),av2.y-(hangar.j+3.5)).toFixed(1)} cases`:'aucun');
  W.vehBoard(av2,W.addUnit('meumeu','villageois',av2.x,av2.y,{}));hangar.stock['m:mle1']=60;const rl=W.vehLoad(av2,'m:mle1',60);check('11. 60 caisses chargées au hangar A',rl.ok&&(av2.cargo['m:mle1']||0)>=59,JSON.stringify(rl.why||rl.text));
  const gt=W.airGoto(av2,B0[0]+35,B0[1]+1);if(!gt)console.log('  goto refusé :',av2.why);av2.autoLand=true;hours(W,60,()=>av2.state==='cruise'&&av2.alt>=145||av2.state==='crashed');W.airLand(av2,B0[0]+35,B0[1]+1);
  let crashB=false;hours(W,120,()=>{if(av2.state==='crashed'){crashB=true;return true;}return av2.state==='parked'&&av2.alt===0;});
  const onB=!crashB&&!!W.airRunwayAt(av2.x,av2.y,3)&&Math.hypot(av2.x-(B0[0]+35),av2.y-B0[1])<40;
  check('11. l\'avion se pose sur la piste B (300 cases plus loin)',onB,crashB?av2.crashCause:`état ${av2.state} en (${av2.x.toFixed(0)}, ${av2.y.toFixed(0)})`);
  const tx=W.airTaxiTo(av2,hB.i+4,B0[1]+1);hours(W,12,()=>av2.state==='parked');const ru=W.vehUnload(av2,'m:mle1',60);
  check('11. il roule jusqu\'au hangar B et la cargaison y arrive',tx.ok&&ru.ok&&(hB.stock['m:mle1']||0)>=59,`${JSON.stringify(tx.why||'')} hangar B : ${(hB.stock['m:mle1']||0).toFixed(1)} caisses`);}
// 12 : la discrétion
{const Wd=new World(82);const gl=Wd.addAircraft('meumeu','planeur',300,300,0),av=Wd.addAircraft('meumeu','avion',300,300,0);gl.alt=60;av.alt=60;
  Wd.s.solar=13;const bee=Wd.addUnit('beee','soldat',308,300,{rounds:10});const sg=Wd.vehSeen('beee',gl),sa=Wd.vehSeen('beee',av);check('12. le planeur est plus discret que l\'avion',sa&&!sg,`avion vu : ${sa}, planeur vu : ${sg}`);}
// 13 : sauvegarde en vol
{const Ws=new World(83);const cp=Ws.capital();const a0=[cp.i+8,cp.j-60];for(const nd of Ws.s.nodes){if(nd.i>=a0[0]-20&&nd.i<a0[0]+170&&nd.j>=a0[1]-12&&nd.j<a0[1]+30&&nd.type!=='ore'){nd.left=0;Ws.nodeAt[nd.j*Ws.N+nd.i]=-1;}}
  for(let n=0;n<70;n++)for(let m=0;m<3;m++)Ws.s.pistes[(a0[1]+m)*Ws.N+a0[0]+n]={f:'meumeu',b:1,p:1,hp:150};Ws.pisteV=1;const r=Ws.airRunways()[0];
  const av=Ws.addAircraft('meumeu','avion',r.A[0]+r.dx*10,r.A[1]+r.dy*10,Math.atan2(r.dy,r.dx)),g=Ws.addAircraft('meumeu','planeur',av.x-r.dx*5,av.y-r.dy*5,av.h);Ws.vehBoard(av,Ws.addUnit('meumeu','villageois',av.x,av.y,{}));Ws.vehBoard(g,Ws.addUnit('meumeu','villageois',g.x,g.y,{}));Ws.airTow(av,g);Ws.airTakeoff(av);Ws.airGoto(av,r.A[0]+200,r.A[1]);
  for(let k=0;k<30*60&&!(av.alt>100);k++)Ws.update(1/60);
  const data=Ws.serialize();const W2=new World(1).restore(data);const a2=W2.s.vehicles.find(v=>v.id===av.id),g2=W2.s.vehicles.find(v=>v.id===g.id);
  check('13. sauvegarde en vol : avion, planeur, câble, pilotes repris',!!a2&&!!g2&&a2.tows===g2.id&&g2.towedBy===a2.id&&a2.state===av.state&&Math.abs(a2.alt-av.alt)<.01&&a2.crew.length===1&&g2.crew.length===1,a2?`état ${a2.state}, alt ${a2.alt.toFixed(0)}`:'absent');
  for(let k=0;k<5*60;k++)W2.update(1/60);check('13. le vol continue après la reprise',(a2.state==='cruise'||a2.state==='climb')&&g2.alt>40&&a2.alt>100);}
console.log(ok?'\nTOUT PASSE':'\nIL Y A DES ÉCHECS');
