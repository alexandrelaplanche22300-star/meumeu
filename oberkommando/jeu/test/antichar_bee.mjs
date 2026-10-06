// V12.8 · la riposte bèè à nos blindés : le renseignement, le développement d'urgence, la production en proportion, la chasse au char.
// CRITÈRES (fixés avant de lancer) :
//   K1 un char moyen vu par les Bèè : compté, son flanc mesuré ; leur fusil antichar ne le perce plus → développement d'urgence déclaré ;
//      le lance-roquettes adopté au bout de 2 jours (pas avant), le fusil antichar lourd au bout de 3
//   K2 plus de blindés vus, plus d'équipes antichars voulues (3 blindés > 1 blindé, pour le lance-roquettes et le fusil antichar)
//   K3 le lance-roquettes perce le flanc et l'arrière du char moyen, pas l'avant du char lourd ; le fusil antichar lourd perce le flanc du char
//      moyen à 30 m, pas son avant
//   K4 trois chasseurs à lance-roquettes, à 18 cases d'un char moyen arrêté (équipage à bord), qu'ils voient : leur premier tir part à portée
//      (≤ 4,5 cases) et de flanc ou de l'arrière (plus de 60° de l'avant du char) ; le char est percé au moins une fois en 4 h
//      CORRECTION (mesurée au premier essai) : en plein jour, à découvert, face à un char dont le tireur veille, les trois chasseurs marchaient vers
//      lui et tombaient tous à cinq ou six cases, avant leur portée — c'est ce que l'IA ne doit plus faire. K4 devient : K4a de jour, à découvert :
//      ils ne s'y jettent pas (au moins deux sur trois en vie après 4 h, en attente) ; K4b la nuit venue : ils approchent et le char est percé au
//      moins une fois en 4 h, le premier tir à portée et de flanc ou de l'arrière.
//   K5 aucun tir de lance-roquettes au-delà de sa distance de tir
//   node test/antichar_bee.mjs [graine]
globalThis.document??={getElementById:()=>({textContent:''})};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');const E=await import('../js/engins.js');const {DAY}=await import('../js/data.js');
const {CARTE}=await import('./_engins_types.mjs');
const SEED=+(process.argv[2]||101);let fail=0,errs=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const W=new World(SEED,CARTE);W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');
W.s.vdesigns={chenM:{id:'chenM',f:'meumeu',name:'Char moyen',status:'prototype',v:E.exemple('chenM'),t:0},tigre:{id:'tigre',f:'meumeu',name:'Char lourd',status:'prototype',v:E.exemple('tigre'),t:0}};W.enginsSync();
const used=[];const place=k=>{const V=VEHDEF[k],c=W.capital();for(let r=40;r<400;r+=2)for(let a=0;a<40;a++){const x=Math.floor(c.i+Math.cos(a/40*6.283)*r)+.5,y=Math.floor(c.j+Math.sin(a/40*6.283)*r)+.5;if(used.some(([u,v])=>Math.hypot(u-x,v-y)<40))continue;
  let ok=W.vehFits(V,x,y,0);for(let q=-20;ok&&q<=20;q+=4)ok=W.los(x,y,x+q,y+18)&&W.los(x,y,x-18,y+q);if(ok){used.push([x,y]);return W.addCombatVehicle('meumeu',k,x,y,0);}}};
// K1
const tank=place('chenM');const crew=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,4);for(const u of crew){u.x=tank.x;u.y=tank.y;W.vehBoard(tank,u);}
const spotter=W.addUnit('beee','soldat',tank.x,tank.y+7,{w:'bee_fusil',rounds:20});spotter.task={kind:'guard',tx:spotter.x,ty:spotter.y};
W.beeeSawArmor();const B=W.s.beee,t0=W.s.t;const a1=!!B.atDev,lr0=W.design('bee_lrac').status;
W.s.t=t0+2*DAY-1;W.beeeSawArmor();const lrEarly=W.design('bee_lrac').status;W.s.t=t0+2*DAY+.1;W.beeeSawArmor();const lr2=W.design('bee_lrac').status,ld2=W.design('bee_at_lourd').status;
W.s.t=t0+3*DAY+.1;W.beeeSawArmor();const ld3=W.design('bee_at_lourd').status;W.s.t=t0;
P(Object.keys(B.armor?.ids||{}).length===1&&B.armor.flank>=4.9&&a1&&lr0!=='adopte'&&lrEarly!=='adopte'&&lr2==='adopte'&&ld2!=='adopte'&&ld3==='adopte','K1. le renseignement et le développement d’urgence',
  `vus ${Object.keys(B.armor?.ids||{}).length} · flanc ${B.armor?.flank?.toFixed(1)} mm · urgence ${a1} · lance-roquettes : ${lr0} → ${lrEarly} (j+2 − 1 h) → ${lr2} · fusil lourd : ${ld2} (j+2) → ${ld3} (j+3)`);
// K2
{const want=n=>{B.armor.ids={};for(let i=0;i<n;i++)B.armor.ids[9e6+i]=0;return Object.fromEntries(W.beeeHeavyWants().map(o=>[o.id,o.teams]));};const w1=want(1),w3=want(3);B.armor.ids={[tank.id]:0};
  P((w3.bee_lrac||0)>(w1.bee_lrac||0)&&(w3.bee_at||0)>(w1.bee_at||0),'K2. plus de blindés vus, plus d’antichars voulus',`1 blindé : ${JSON.stringify(w1)} · 3 blindés : ${JSON.stringify(w3)}`);}
// K3
{const kcm=100/(E.VEH_VIS*4);const fire=(k,Wd,rel,R=12)=>{const v=place(k);const D=E.deriveVeh(VEHDEF[k].engin.v);const a=v.h+rel;const sh={x0:v.x-Math.cos(a)*R/4,y0:v.y-Math.sin(a)*R/4,by:null,w:Wd.id||null,R,f:'beee'};
    const o=W.vehImpact3D(v,VEHDEF[k],{v:Wd.at(R).v,ex:0,ey:(D.G.y0+D.v.H*.5)/kcm,H:1},Wd,sh);W.s.vehicles.splice(W.s.vehicles.indexOf(v),1);W.cvs.splice(W.cvs.indexOf(v),1);return o;};
  const L=W.W('bee_lrac'),H=W.W('bee_at_lourd');const r={lracFlanc:fire('chenM',L,Math.PI/2),lracArriere:fire('chenM',L,0),lracTigreAvant:fire('tigre',L,Math.PI),lourdFlanc:fire('chenM',H,Math.PI/2,30),lourdAvant:fire('chenM',H,Math.PI,30)};
  P(r.lracFlanc==='percé'&&r.lracArriere==='percé'&&r.lracTigreAvant!=='percé'&&r.lourdFlanc==='percé'&&r.lourdAvant!=='percé','K3. ce que percent les armes d’urgence',JSON.stringify(r));}
// K4, K5
const fm=W.atFireMax(W.W('bee_lrac'),'lrac');let far=0,shotsAll=0;
const hunt=(night,label)=>{const v=place('chenM');for(const u of W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,4)){u.x=v.x;u.y=v.y;W.vehBoard(v,u);}v.hp=1e6;
  W.s.solar=night?21:9;   // (l'heure du jeu suit l'horloge solaire s.solar, pas s.t)
  const hs=[];for(let n=0;n<3;n++){const h=W.addUnit('beee','soldat',v.x-3+n*3,v.y+18,{w:'bee_lrac',rounds:6});h.task={kind:'guard',tx:h.x,ty:h.y};h.spot={meumeu:W.s.t};hs.push(h);}
  let first=null,pierce=0,shots=0;W.events.length=0;
  for(let t=0;t<4;t+=.025){try{W.update(.025);}catch(e){errs++;if(errs<3)console.log('ERREUR',e.stack);break;}
    for(const e of W.events.splice(0)){if(e.type==='shot'&&hs.some(h=>h.id===e.by)){shots++;shotsAll++;const d=Math.hypot(e.x-v.x,e.y-v.y);if(d>fm+.5)far++;
        if(!first){const ang=Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-v.y,e.x-v.x)-v.h),Math.cos(Math.atan2(e.y-v.y,e.x-v.x)-v.h)))*180/Math.PI;first={d,ang,t};}}
      if(e.card&&e.veh===v.id&&e.card.out==='percé')pierce++;}}
  const alive=hs.filter(h=>h.hp>0&&h.h?.state!=='mort'&&h.h?.state!=='hors').length;
  return {first,pierce,shots,alive,txt:`${label} : ${first?`premier tir à ${first.d.toFixed(1)} cases, ${first.ang.toFixed(0)}° de l’avant, après ${first.t.toFixed(2)} h · `:'aucun tir · '}${shots} roquettes · ${pierce} perforation(s) · ${alive}/3 debout · tâches ${hs.map(h=>(h.task?.kind||'—')+(h.task?.wait?' (attend)':'')+' à '+Math.hypot(h.x-v.x,h.y-v.y).toFixed(1)).join(', ')}`};};
{const r=hunt(false,'de jour');P(r.alive>=2&&errs===0,'K4a. de jour, à découvert : ils ne se jettent pas sous la mitrailleuse',r.txt);}
{const r=hunt(true,'de nuit');P(r.first&&r.first.d<=4.5&&r.first.ang>60&&r.pierce>=1&&errs===0,'K4b. la nuit : la chasse au char',r.txt);}
P(far===0,'K5. le lance-roquettes ne tire pas de loin',`${far} tir(s) au-delà de ${fm.toFixed(1)} cases sur ${shotsAll}`);
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
