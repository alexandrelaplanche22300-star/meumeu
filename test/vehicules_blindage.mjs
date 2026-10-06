// Le blindage des véhicules (V6/V7) : perforation, ricochet, non-perforation, ce qui arrive derrière la plaque.
// CRITÈRES (fixés avant de lancer) :
//   B1 calibrage (face perpendiculaire, épaisseur effective = épaisseur / cos inclinaison) : le fusil bèè ne perce aucune face de l'automitrailleuse au-delà
//      de 10 m et perce la jeep ; l'antichar bèè perce toutes les faces de l'automitrailleuse et les flancs du char à 50 m, pas l'avant du char à 25 m et plus
//   B2 six fusiliers bèè tirent 4 h sur une automitrailleuse (équipage à bord) à 8 cases : elle perd moins de 10 % et personne à bord n'est blessé
//   B3 deux antichars bèè sur le flanc de l'automitrailleuse à 8 cases : des perforations, et en 6 h l'engin est détruit ou au moins un homme à bord est touché
//   B4 des fusiliers bèè sur une jeep chargée (4 à bord) : au moins un homme touché en 4 h
//   B5 200 coups d'antichar : sur l'avant du char à 12 cases, au moins 70 % arrêtés ou ricochent ; sur le flanc à 8 cases, au moins 50 % percent
//   B6 un antichar bèè préfère l'engin aux fantassins qui l'entourent
//   B7 aucune exception
//   B8 (ajouté après le premier passage, écrit avant de le lancer : en 300 impacts, pas un ricochet — la face était prise par quadrant, l'obliquité
//      horizontale ne dépassait jamais 45°) 200 balles de fusil bèè à 25 m, venant à 12° de l'axe de l'automitrailleuse (de face, un peu de côté) :
//      au moins 15 % ricochent (le flanc vu presque de profil) et aucune ne perce ; 200 en plein flanc : aucun ricochet
//   B9 (ajouté avec l'explosion près d'un engin, écrit avant de le lancer) un obus éclate à 1 case du centre, 40 essais, 4 hommes neufs à bord à chaque
//      essai : dans la jeep, au moins la moitié des touchés qu'auraient 4 hommes accroupis à terre au même endroit ; dans l'automitrailleuse, personne
//      touché et la caisse perd des points ; un obus au contact du char (0,2 case de la caisse) : personne touché à bord
//   B10 (ajouté avec V10, écrit avant de le lancer) une jeep vue des Bèè ne leur fait pas réclamer d'antichars ; une automitrailleuse vue, oui
//      (beeeSawArmor, au passage de stratégie suivant)
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/vehicules_blindage.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');const {TILE_M}=await import('../js/ballistics.js');
const SEED=+(process.argv[2]||101);let fail=0,errs=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const {enginsDeTest}=await import('./_engins_types.mjs');const mk=()=>{const W=enginsDeTest(new World(SEED));W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');return W;};
const open=(W,k,x0,y0)=>{const V=VEHDEF[k];for(let r=0;r<80;r++)for(let a=0;a<32;a++){const x=Math.floor(x0+Math.cos(a/32*6.283)*r)+.5,y=Math.floor(y0+Math.sin(a/32*6.283)*r)+.5;
  let ok=W.vehFits(V,x,y,0)&&!W.s.vehicles.some(o=>o.hp>0&&Math.hypot(o.x-x,o.y-y)<14);for(let q=-10;ok&&q<=10;q+=2)ok=W.vehFits(V,x,y+q,0)&&W.los(x,y,x,y+q);if(ok)return [x,y];}return null;};
const crewUp=(W,v,n)=>{const us=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,n);for(const u of us){u.x=v.x;u.y=v.y;W.vehBoard(v,u);}return us;};
const bee=(W,x,y,w='bee_fusil')=>{const u=W.addUnit('beee','soldat',x,y,{w,rounds:300});u.task={kind:'guard',tx:x,ty:y};u.spot={meumeu:W.s.t};return u;};
const run=(W,h,each)=>{for(let t=0;t<h;t+=.025){try{W.update(.025);}catch(e){errs++;if(errs<3)console.log('ERREUR',e.stack);return;}each?.();}};
const hurt=v=>(v.crew||[]).concat(v.out||[]).filter(u=>u.h&&(u.h.state!=='ok'||(u.h.wounds||[]).length)||u.hp<=0).length;
// B1 : le calibrage
{const W=mk();const pen=(w,m)=>{const D=W.W(w);return D.pen(D.at(m).v);};const eff=(k,f)=>{const [t,s]=VEHDEF[k].blindage[f];return t/Math.cos(s*Math.PI/180);};
  const faces=k=>Object.keys(VEHDEF[k].blindage).filter(f=>f!=='dessus');
  const a=faces('automitrailleuse').every(f=>pen('bee_fusil',10)<eff('automitrailleuse',f)&&pen('bee_fusil',25)<eff('automitrailleuse',f));
  const b=pen('bee_fusil',25)>eff('jeep','flanc'),c=faces('automitrailleuse').every(f=>pen('bee_at',50)>eff('automitrailleuse',f));
  const d=pen('bee_at',50)>eff('char','flanc'),e=pen('bee_at',25)<eff('char','avant');
  P(a&&b&&c&&d&&e,'B1. calibrage des blindages',`fusil 10/25 m ${pen('bee_fusil',10).toFixed(2)}/${pen('bee_fusil',25).toFixed(2)} mm · antichar 25/50 m ${pen('bee_at',25).toFixed(2)}/${pen('bee_at',50).toFixed(2)} mm · automitrailleuse ${faces('automitrailleuse').map(f=>f+' '+eff('automitrailleuse',f).toFixed(2)).join(', ')} · char avant ${eff('char','avant').toFixed(2)} flanc ${eff('char','flanc').toFixed(2)} · jeep ${eff('jeep','flanc').toFixed(2)}`);}
// B2 : des fusils contre l'automitrailleuse
{const W=mk();const c=W.capital();const p=open(W,'automitrailleuse',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','automitrailleuse',p[0],p[1],0);crewUp(W,v,2);
  for(let n=0;n<6;n++)bee(W,p[0]-1.5+n*.6,p[1]+8);const ev={plate:0,pierce:0,ricochet:0};W.events.length=0;run(W,4,()=>{for(const e of W.events.splice(0))if(e.veh===v.id&&ev[e.type]!=null)ev[e.type]++;});
  P(v.hp>=v.max*.9&&!hurt(v),'B2. des fusils contre l’automitrailleuse : rien ne passe',`pv ${v.hp.toFixed(0)}/${v.max} · ${JSON.stringify(ev)} · touchés à bord ${hurt(v)}`);}
// B3 : des antichars contre l'automitrailleuse
{const W=mk();const c=W.capital();const p=open(W,'automitrailleuse',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','automitrailleuse',p[0],p[1],0);const crew=crewUp(W,v,4);
  for(let n=0;n<2;n++)bee(W,p[0]-.5+n,p[1]+8,'bee_at');const ev={plate:0,pierce:0,ricochet:0};W.events.length=0;run(W,6,()=>{for(const e of W.events.splice(0))if(e.veh===v.id&&ev[e.type]!=null)ev[e.type]++;});
  const touched=crew.filter(u=>u.hp<=0||u.h&&(u.h.wounds||[]).length).length;
  P(ev.pierce>0&&(v.hp<=0||touched>0),'B3. des antichars contre l’automitrailleuse : ils percent',`pv ${Math.max(0,v.hp).toFixed(0)}/${v.max} · ${JSON.stringify(ev)} · touchés ${touched}/${crew.length} · organes ${JSON.stringify(v.comp||{})}`);}
// B4 : des fusils contre une jeep chargée
{const W=mk();const c=W.capital();const p=open(W,'jeep',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','jeep',p[0],p[1],0);const crew=crewUp(W,v,4);
  for(let n=0;n<4;n++)bee(W,p[0]-1+n*.6,p[1]+7);const ev={plate:0,pierce:0,ricochet:0};W.events.length=0;run(W,4,()=>{for(const e of W.events.splice(0))if(e.veh===v.id&&ev[e.type]!=null)ev[e.type]++;});
  const touched=crew.filter(u=>u.hp<=0||u.h&&(u.h.wounds||[]).length).length;P(touched>=1,'B4. des fusils contre une jeep : la tôle ne protège pas',`${JSON.stringify(ev)} · touchés ${touched}/${crew.length} · pv ${Math.max(0,v.hp).toFixed(0)}/${v.max}`);}
// B5 : 200 coups d'antichar sur le char, de face puis de flanc (directement, par l'impact)
{const W=mk();const c=W.capital();const p=open(W,'char',c.i+30,c.j+30);const Wat=W.W('bee_at');const shoot=(dx,dy,dist)=>{const res={};for(let n=0;n<200;n++){const v=W.addCombatVehicle('meumeu','char',p[0],p[1],0);v.hp=1e9;
    const sx=p[0]+dx*dist,sy=p[1]+dy*dist;const fl=Wat.at(dist*TILE_M);W.vehImpact(v,{hit:true,veh:true,v:fl.v,ex:0,ey:.3*TILE_M,H:1.1*TILE_M},Wat,{x0:sx,y0:sy});const o=v.lastHit?.out||'?';res[o]=(res[o]||0)+1;W.s.vehicles.splice(W.s.vehicles.indexOf(v),1);}return res;};
  const front=shoot(1,.04,12),side=shoot(.04,1,8);const fs=(front['arrêté']||0)+(front.ricochet||0),sp=side['percé']||0;
  P(fs>=140&&sp>=100,'B5. le char : l’avant tient l’antichar, le flanc non',`avant à 12 cases ${JSON.stringify(front)} · flanc à 8 cases ${JSON.stringify(side)}`);}
// B6 : l'antichar préfère l'engin
{const W=mk();const c=W.capital();const p=open(W,'automitrailleuse',c.i+30,c.j+30);const v=W.addCombatVehicle('meumeu','automitrailleuse',p[0],p[1],0);crewUp(W,v,2);
  const inf=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,3);inf.forEach((u,n)=>{u.x=p[0]-1+n;u.y=p[1]+5;u.task={kind:'guard',tx:u.x,ty:u.y};});
  const at=bee(W,p[0],p[1]+9,'bee_at');for(const u of inf)u.spot={beee:W.s.t};const T=W.nearestEnemy(at,W.engageRange(at));
  P(T===v,'B6. l’antichar préfère l’engin aux fantassins',`cible : ${T?(T.mounts?T.name:T.k+' '+T.id):'aucune'}`);}
P(errs===0,'B7. aucune exception',`${errs}`);
// B10 : les Bèè voient nos blindés
{const W=mk();const c=W.capital();const p=open(W,'automitrailleuse',c.i+30,c.j+30);const j=W.addCombatVehicle('meumeu','jeep',p[0],p[1],0);const look=bee(W,p[0],p[1]+7);
  W.s.beee.sawArmor=false;W.beeeSawArmor();const jeepSaw=!!W.s.beee.sawArmor;W.s.vehicles.splice(W.s.vehicles.indexOf(j),1);
  W.addCombatVehicle('meumeu','automitrailleuse',p[0],p[1],0);W.beeeSawArmor();const amSaw=!!W.s.beee.sawArmor;
  P(!jeepSaw&&amSaw,'B10. les Bèè réclament des antichars quand ils voient un blindé, pas une jeep',`jeep vue : ${jeepSaw} · automitrailleuse vue : ${amSaw} · guetteur à ${Math.hypot(look.x-p[0],look.y-p[1]).toFixed(1)} cases`);}
// B8 : l'incidence rasante
{const W=mk();const c=W.capital();const p=open(W,'automitrailleuse',c.i+30,c.j+30);const Wf=W.W('bee_fusil');const shoot=(deg,dist)=>{const res={};const a=deg*Math.PI/180;
    for(let n=0;n<200;n++){const v=W.addCombatVehicle('meumeu','automitrailleuse',p[0],p[1],0);v.hp=1e9;const fl=Wf.at(dist*TILE_M);
      W.vehImpact(v,{hit:true,veh:true,v:fl.v,ex:0,ey:.3*TILE_M,H:1.1*TILE_M},Wf,{x0:p[0]+Math.cos(a)*dist,y0:p[1]+Math.sin(a)*dist});const o=v.lastHit?.out||'?';res[o]=(res[o]||0)+1;W.s.vehicles.splice(W.s.vehicles.indexOf(v),1);}return res;};
  const near=shoot(12,25/TILE_M),side=shoot(90,25/TILE_M);
  P((near.ricochet||0)>=30&&!near['percé']&&!side.ricochet,'B8. l’incidence rasante fait ricocher',`à 12° de l’axe ${JSON.stringify(near)} · plein flanc ${JSON.stringify(side)}`);}
// B9 : un obus à côté d'un engin
{const W=mk();const c=W.capital();const pool=W.s.units.filter(u=>u.f==='meumeu'&&u.h).slice(0,4);const snap=pool.map(u=>JSON.stringify(u.h));
  const fresh=()=>pool.forEach((u,i)=>{u.h=JSON.parse(snap[i]);u.hp=1;u.inVeh=null;u.vrole=null;});const touched=()=>pool.filter(u=>u.hp<=0||u.h.state!=='ok'||(u.h.wounds||[]).length).length;
  const trial=(k,dist)=>{const p=open(W,k||'jeep',c.i+30,c.j+30);let n=0,lost=0;for(let i=0;i<40;i++){fresh();let v=null;
      // (ceux qui ne trouvent pas de place — le char n'en a que 3 — s'écartent : on ne compte que l'équipage)
      if(k){v=W.addCombatVehicle('meumeu',k,p[0],p[1],0);for(const u of pool){u.x=v.x;u.y=v.y;if(!W.vehBoard(v,u)){u.x=p[0]+40;u.y=p[1];}}}
      else for(const u of pool){u.x=p[0]+(W.rand()-.5)*.3;u.y=p[1]+(W.rand()-.5)*.3;u.post='accroupi';if(!W.s.units.includes(u)){W.s.units.push(u);W.uIndex.set(u.id,u);}}
      const hp0=v?.hp;W.blast(p[0],p[1]+dist,'obus','beee',null);n+=touched();if(v){lost+=hp0-Math.max(0,v.hp);W.vehUnboard(v,'tous');for(const u of pool)if(!W.s.units.includes(u)){W.s.units.push(u);W.uIndex.set(u.id,u);}W.s.vehicles.splice(W.s.vehicles.indexOf(v),1);}}
    return {n,lost:Math.round(lost)};};
  const sol=trial(null,1),jeep=trial('jeep',1),am=trial('automitrailleuse',1),ch=trial('char',VEHDEF.char.large/2+.2);
  P(jeep.n>=sol.n*.5&&am.n===0&&am.lost>0&&ch.n===0,'B9. un obus à côté d’un engin',`touchés sur 40 obus (4 hommes) : à terre accroupis ${sol.n} · jeep ${jeep.n} (caisse −${jeep.lost}) · automitrailleuse ${am.n} (caisse −${am.lost}) · char au contact ${ch.n} (caisse −${ch.lost})`);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
