// Scénario 1 — le tir nocturne d'un commando. Comportement réellement chargé (World.prototype après world.js), jamais une
// fonction isolée de war.js ou strategy.js. Le tir passe par shotNoise(), le point d'entrée du combat.
// Configuration : nuit profonde, commando à 24 cases de quatre gardes Bèè, ligne de vue dégagée, aucune alerte préalable.
// Toutes les durées sont en HEURES DE JEU (temps simulé) ; le temps réel de la fenêtre n'est jamais mélangé.
// Modes (chacun sur toutes les graines) :
//   N  Mle 1 supersonique, nu, immobile        S  Mle 1 supersonique + silencieux, immobile
//   U  cartouche subsonique + silencieux       Q  cartouche subsonique nue
//   M  Mle 1 puis FUITE directe (à l'opposé des gardes, 40 cases)      R  Mle 1, second tir une heure plus tard
//   V  contrôle : AUCUN tir (vue seule)         F  Mle 1 mais les alertes sont effacées à chaque pas (le son n'aide pas la vue)
//   node test/tir_nocturne.mjs [nbGraines=20] [graineDeDépart=1] [distance=24] [joursDeCroissance=0] [modes=NSUQMRVF]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const NS=+(process.argv[2]||20),S0=+(process.argv[3]||1),DIST=+(process.argv[4]||24),WARM=+(process.argv[5]||0);
const DT=1/240,SPAN=16;                      // un pas = 15 s de jeu ; 16 h de jeu suivies après le tir (assez pour voir le retour des gardes)
const ang=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))*180/Math.PI;
const WEAPON={N:'mle1',S:'mle1_sil',U:'sub_sil',Q:'sub',M:'mle1',R:'mle1',V:'mle1',F:'mle1'};
function clearSpot(W,cx,cy,R){const N=W.N;for(let a=0;a<72;a++){const x=cx+Math.cos(a/72*6.283)*R,y=cy+Math.sin(a/72*6.283)*R;if(x<3||y<3||x>N-3||y>N-3)continue;
  let ok=true;for(let dj=-1;dj<=1&&ok;dj++)for(let di=-1;di<=1;di++){const k=(Math.floor(y)+dj)*N+Math.floor(x)+di;if(!TERRAIN[W.G.terrain[k]]?.walk||W.occ[k]>=0){ok=false;break;}}
    if(ok&&W.los(cx,cy,x,y))return [x,y,a/72*6.283];}return null;}
function makeWorld(seed,warm){
  const W=new World(seed);for(let h=0;h<6+warm*24;h++)W.update(1);
  const m=W.s.designs.mle1;
  W.s.designs.mle1_sil={...m,id:'mle1_sil',name:'Mle 1 silencieux',base:false,p:{...m.p,mods:['manchon'],supVol:250}};
  W.s.designs.sub={...m,id:'sub',name:'Mle 1 subsonique',base:false,p:{...m.p,c:.003}};
  W.s.designs.sub_sil={...m,id:'sub_sil',name:'Mle 1 subsonique silencieux',base:false,p:{...m.p,c:.003,mods:['manchon'],supVol:250}};
  W.s.solar=0.5;return W;}                                             // nuit profonde
function run(seed,mode,dist=DIST,warm=WARM,span=SPAN){
  const W=makeWorld(seed,warm);
  const B=W.s.beee,c=B.cities[0],G=W.beeeGuards(c).slice(0,4);if(G.length<4)return {seed,mode,skip:'moins de 4 gardes'};
  const gx=G.reduce((n,u)=>n+u.x,0)/4,gy=G.reduce((n,u)=>n+u.y,0)/4;
  const p=clearSpot(W,gx,gy,dist);if(!p)return {seed,mode,skip:'pas de terrain dégagé à '+dist};
  B.alerts=[];const wid=WEAPON[mode];
  const cm=W.addUnit('meumeu','soldat',p[0],p[1]);cm.w=wid;cm.mag=5;cm.pouch=20;cm.task={kind:'guard',tx:p[0],ty:p[1]};
  const perp=p[2]+Math.PI/2,tx=p[0]+Math.cos(perp)*30,ty=p[1]+Math.sin(perp)*30;   // il tire de côté, ni vers ni loin des gardes
  const Wp=W.W(wid);const R={seed,mode,dist:Math.hypot(cm.x-gx,cm.y-gy),dB:Wp.dB,crack:Wp.crackDb,guards0:W.beeeGuards(c).length,keep:W.beeeGarrisonMin(c),troops0:W.beeeTroops(c).length};
  const t0=W.s.t;const fire=()=>W.shotNoise(cm,W.W(wid),tx,ty);
  const prev=new Map(W.s.units.filter(u=>u.f==='beee').map(u=>[u.id,[u.x,u.y,null,0]]));let lastSeen=null,tele=0,reappear=0,shot2=false,secondAlert=null,found=null,seen=null,spdSum=0,spdN=0;
  R.minGuards=R.guards0;R.minGuardsPre=R.guards0;
  if(mode!=='V'){fire();R.tirT=0;}
  for(let n=0;n<span/DT;n++){
    if(mode==='M'&&n===2){                                             // M : fuite directe, à l'opposé des gardes, 40 cases (ou moins si le terrain l'interdit)
      let ok2=false;for(const Ld of [40,32,24,16]){const x=cm.x+Math.cos(p[2])*Ld,y=cm.y+Math.sin(p[2])*Ld;if(x>3&&y>3&&x<W.N-3&&y<W.N-3&&TERRAIN[W.G.terrain[Math.floor(y)*W.N+Math.floor(x)]]?.walk&&W.occ[Math.floor(y)*W.N+Math.floor(x)]<0){R.fleeOrder=!!W.order([cm.id],{type:'point',x,y}).ok;ok2=true;break;}}if(!ok2)R.fleeOrder=false;}
    if(mode==='R'&&!shot2&&W.s.t-t0>=1){shot2=true;const l=B.alerts.filter(q=>q.cone).at(-1);R.a1=l?{half:l.half,err:ang(l.bearing,Math.atan2(cm.y-l.oy,cm.x-l.ox)),n:l.n}:null;fire();R.t2=W.s.t-t0;}
    W.update(DT);const t=W.s.t-t0;
    const seekers=W.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='search'&&!u.task.scout&&u.task.t0>=t0-1e-9);
    for(const u of W.s.units){if(u.f!=='beee')continue;const q=prev.get(u.id);const d=q?Math.hypot(u.x-q[0],u.y-q[1]):0;
      if(q&&d>3){if(n-q[3]>1)reappear++;else tele++;}                                    // une unité sortie d'un bâtiment après y être entrée n'est pas une téléportation
      if(q&&u.task?.kind==='search'&&!u.task.scout&&u.task.t0>=t0-1e-9&&t-(u.task.t0-t0)>.02&&t-(u.task.t0-t0)<.9&&d>0&&d<3){spdSum+=d/DT;spdN++;}
      prev.set(u.id,[u.x,u.y,u.task?.kind,n]);}
    R.minGuards=Math.min(R.minGuards,W.beeeGuards(c).length);if(seen==null)R.minGuardsPre=Math.min(R.minGuardsPre,W.beeeGuards(c).length);   // avant toute détection visuelle : seul le binôme d'écoute est parti
    const al=B.alerts.filter(a=>a.t>=t0-1e-9);
    if(R.alertT==null&&al.length&&al[0].why!=='vu'&&al[0].why!=='mouvement suspect'){const a=al[0];R.alertT=t;R.alertWhy=a.why;R.alertR=a.r;
      // le cône : relèvement depuis l'écouteur, demi-largeur, portée d'audition. Aucun champ ne donne la position ni la distance de la source.
      R.cone=a.cone===true;R.noPos=a.cone===true&&a.r===0&&!('d' in a)&&!('px' in a)&&!('estX' in a);
      R.errDeg=a.cone?ang(a.bearing,Math.atan2(cm.y-a.oy,cm.x-a.ox)):null;R.half=a.half;R.reach=a.reach;R.apexDist=Math.hypot(a.x-cm.x,a.y-cm.y);
      R.inZone=W.alertCovers(a,cm.x,cm.y,0);R.reachOk=a.reach>=Math.hypot(a.ox-cm.x,a.oy-cm.y);R.apexAt=[a.ox,a.oy];}
    const react=G.filter(u=>u.alertPost===1).length;if(react>0&&R.firstT==null)R.firstT=t;
    if(react>=2&&R.two==null)R.two=t;R.maxReact=Math.max(R.maxReact||0,react);
    if(seekers.length&&R.searchT==null){R.searchT=t;R.searchN=seekers.length;
      const a=B.alerts.find(q=>q.cone&&q.done&&q.t>=t0-1e-9);
      if(a){const pts=seekers.flatMap(u=>u.task.pts||[]);const rho=pts.map(q=>Math.hypot(q[0]-a.ox,q[1]-a.oy));
        let pair=0,np=0;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){pair+=Math.hypot(pts[i][0]-pts[j][0],pts[i][1]-pts[j][1]);np++;}
        R.swp={n:pts.length,k:seekers.length,rmin:Math.min(...rho),rmax:Math.max(...rho),reach:a.reach,
          inCone:pts.every(q=>ang(Math.atan2(q[1]-a.oy,q[0]-a.ox),a.bearing)*Math.PI/180<=a.half+.12),coneTask:seekers.every(u=>u.task.cone===1),
          spread:np?pair/np:0,nearTruth:pts.filter(q=>Math.hypot(q[0]-cm.x,q[1]-cm.y)<6).length/Math.max(1,pts.length),minToTruth:Math.min(...pts.map(q=>Math.hypot(q[0]-cm.x,q[1]-cm.y)))};}}
    if(R.searchT!=null&&R.arriveT==null){const a=al.find(a=>a.why!=='vu');if(a)for(const u of seekers)if(Math.hypot(u.x-a.ox,u.y-a.oy)>=.25*a.reach&&W.alertCovers(a,u.x,u.y,3)){R.arriveT=t;break;}}   // un chercheur est entré dans le cône, au-delà du quart de sa portée
    R.maxSeek=Math.max(R.maxSeek||0,seekers.length);
    const vis=W.spotted(cm,'beee');if(vis)lastSeen=t;
    if(seen==null&&(vis||B.alerts.some(a=>a.t>=t0&&a.why==='vu'))){seen=t;const by=W.unit(cm.spotBy?.beee);R.seenBy=by&&by.task?.kind==='search'&&!by.task.scout&&by.task.t0>=t0-1e-9?'chercheur':'autre';}   // détection VISUELLE ; par qui ?
    if(R.searchT!=null&&!seekers.length&&R.freeT==null)R.freeT=t;                                        // toutes les recherches d'alerte sont terminées
    if(R.passT==null&&seekers.some(u=>Math.hypot(u.x-cm.x,u.y-cm.y)<6))R.passT=t;
    if(found==null&&seekers.some(u=>Math.hypot(u.x-cm.x,u.y-cm.y)<3.5))found=t;                          // un chercheur envoyé PAR LE SON est arrivé sur lui
    if(mode==='R'&&shot2&&secondAlert==null){const a=B.alerts.filter(q=>q.cone).at(-1);if(a&&a.t>t0+R.t2-1e-9){secondAlert=t-R.t2;R.a2={half:a.half,err:ang(a.bearing,Math.atan2(cm.y-a.oy,cm.x-a.ox)),n:a.n};}}
    if(mode==='F')B.alerts.length=0;                    // F : le son n'aide plus la vue
  }
  R.lastSeen=lastSeen;R.moved=Math.hypot(cm.x-p[0],cm.y-p[1]);
  {const near=W.s.units.filter(u=>u.f==='beee'&&!(u.task?.scout)&&u.hp>0).map(u=>Math.hypot(u.x-cm.x,u.y-cm.y));R.endNearest=near.length?Math.min(...near):null;}
  R.seen=seen;R.found=found;R.tele=tele;R.reappear=reappear;R.speed=spdN?spdSum/spdN:null;R.guardsEnd=W.beeeGuards(c).length;
  R.garrisonPct=Math.round(100*(R.maxSeek||0)/Math.max(1,R.troops0));
  // qui a localisé le commando ? le son (un chercheur arrive sur lui avant toute vue), un chercheur du son qui le voit, un autre Bèè qui le voit, ou personne
  R.loc=found!=null&&(seen==null||found<seen)?'son':seen!=null&&R.seenBy==='chercheur'?'son puis vue':seen!=null?'vue directe':'personne';
  if(mode==='M'){R.newTracks=(W.s.tracks||[]).filter(tr=>tr.f==='meumeu'&&tr.t>=t0-1e-9).length;R.pasAlerts=B.alerts.filter(a=>a.why==='pas').length;R.escaped=lastSeen==null||span-lastSeen>=6;}
  if(mode==='R'){R.secondAlertDelay=secondAlert;if(R.a1&&R.a2){R.keepsPrecision=R.a2.half<=R.a1.half+1e-9;R.merged=R.a2.n>R.a1.n;}R.relance=W.s.units.some(u=>u.f==='beee'&&u.task?.kind==='search'&&!u.task.scout&&u.task.t0>=t0+R.t2-1e-9);}
  return R;}
const f=(v,d=2)=>v==null?'—':(typeof v==='number'?v.toFixed(d):String(v));
const NAME={N:'Mle1 nu',S:'Mle1 silencieux',U:'subsonique silencieux',Q:'subsonique nu',M:'tir puis fuite',R:'deux tirs',V:'aucun tir',F:'tir, son coupé'};
const MODES=(process.argv[6]||'NSUQMRVF').split('');const all=Object.fromEntries(MODES.map(m=>[m,[]]));
console.log(`### scénario 1 — distance ${DIST} cases · ${NS} graines à partir de ${S0} · croissance ${WARM} jour(s) · durées en heures de jeu`);
for(let s=S0;s<S0+NS;s++)for(const m of MODES){const r=run(s,m);all[m].push(r);
  if(r.skip){console.log(`graine ${s} ${m} : ignorée (${r.skip})`);continue;}
  console.log(`graine ${s} · ${NAME[m]} : dB ${r.dB} claq ${r.crack} · alerte ${f(r.alertT,3)} h (${r.alertWhy||'aucune'}) · 1er garde ${f(r.firstT,3)} · 2 gardes ${f(r.two,3)} · recherche d'alerte ${f(r.searchT,3)} (${r.searchN||0}) · arrivée ${f(r.arriveT,2)} · erreur ${f(r.errDeg,0)}° · cône ±${f(r.half,2)} rad portée ${f(r.reach,0)} c sans position:${r.noPos?'oui':'NON'} · balayage ${r.swp?`${r.swp.n} pts ρ${f(r.swp.rmin,0)}–${f(r.swp.rmax,0)} passage ${f(r.passT,2)}`:'—'} · vu ${f(r.seen,2)} · dernier vu ${f(r.lastSeen,2)} · fouille ${f(r.found,2)} · localisé par : ${r.loc} · gardes ${r.guards0}→min avant vue ${r.minGuardsPre}→min ${r.minGuards}→fin ${r.guardsEnd} (min garnison ${r.keep}) · recherches finies ${f(r.freeT,1)} · vitesse ${f(r.speed,1)} c/h · téléport. ${r.tele} (réapparitions ${r.reappear})`);}
const ok=m=>(all[m]||[]).filter(r=>!r.skip);const cnt=(m,fn)=>ok(m).filter(fn).length;const nn=m=>ok(m).length;
const mean=(m,k)=>{const v=ok(m).map(r=>r[k]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
const med=(m,k)=>{const v=ok(m).map(r=>r[k]).filter(x=>x!=null).sort((a,b)=>a-b);return v.length?v[v.length>>1]:null;};
const mean2=(m,fn)=>{const v=ok(m).map(fn).filter(x=>x!=null);return v.length?v.reduce((p,q)=>p+q,0)/v.length:null;};
const pass=(m,fn)=>`${cnt(m,fn)}/${nn(m)}`;const line=(l,v)=>console.log(l.padEnd(66),v);
// seuil d'arrivée dérivé de la vitesse mesurée : latence de départ + trajet à la course × 1,25 (détours)
const ref=ok('N').length?'N':MODES.find(m=>ok(m).length);
const vRun=mean(ref,'speed')||9;const latency=med(ref,'searchT')??.65;const THR=+(latency+(DIST-6)/vRun*1.25).toFixed(2);
console.log(`\n===== synthèse =====\nvitesse de course mesurée des chercheurs : ${f(vRun,1)} cases/h · latence médiane de départ : ${f(latency,2)} h · seuil d'arrivée dérivé pour ${DIST} cases : ${THR} h (dans ta recette : 2 h)`);
for(const m of ['N','S','U','Q']){if(!ok(m).length)continue;console.log(`\n-- ${NAME[m].toUpperCase()} (dB ${ok(m)[0]?.dB}, claquement ${ok(m)[0]?.crack})`);
  line('alerte SONORE créée',pass(m,r=>r.alertT!=null));
  line('alerte ≤ 0,10 h',pass(m,r=>r.alertT!=null&&r.alertT<=.10));
  line('1er garde orienté ≤ 0,20 h',pass(m,r=>r.firstT!=null&&r.firstT<=.20));
  line('≥ 2 gardes réorientés ≤ 0,50 h',pass(m,r=>r.two!=null&&r.two<=.5));
  line('recherche d’alerte (non-reconnaissance) déclenchée ≤ 0,50 h',pass(m,r=>r.searchT!=null&&r.searchT<=.5));
  line('recherche d’alerte déclenchée ≤ 1,00 h',pass(m,r=>r.searchT!=null&&r.searchT<=1));
  line(`arrivée dans la zone ≤ ${THR} h (seuil dérivé)`,pass(m,r=>r.arriveT!=null&&r.arriveT<=THR));
  line('arrivée dans la zone ≤ 2 h (seuil de la recette)',pass(m,r=>r.arriveT!=null&&r.arriveT<=2));
  line('erreur angulaire du cône, moyenne / médiane (seuil 30°)',`${f(mean(m,'errDeg'),1)}° / ${f(med(m,'errDeg'),1)}°`);
  line('AUCUNE position transmise : alerte = cône, sans distance estimée',pass(m,r=>r.noPos));
  line('le cône contient le vrai tireur',pass(m,r=>r.inZone));
  line('la portée d’audition (borne) dépasse la vraie distance',pass(m,r=>r.reachOk));
  line('balayage en cône ordonné aux chercheurs',pass(m,r=>r.swp?.coneTask));
  line('balayage étalé du proche au lointain (≥ 40 % de la portée)',pass(m,r=>r.swp&&r.swp.rmax-r.swp.rmin>=.4*r.swp.reach));
  line('balayage : tous les points dans le cône',pass(m,r=>r.swp?.inCone));
  line('balayage étalé : distance moyenne entre points ≥ 30 % de la portée (une convergence sur un point ferait ≈ 5 c)',pass(m,r=>r.swp&&r.swp.spread>=.3*r.swp.reach));
  line('étalement moyen des points du balayage (cases)',f(mean2(m,r=>r.swp?.spread),1));
  line('un chercheur passe à < 6 c du vrai tireur (couverture)',pass(m,r=>r.passT!=null));
  line('garde d’origine ≥ moitié du minimum AVANT toute vue (binôme seul)',pass(m,r=>r.minGuardsPre>=Math.min(r.guards0,Math.max(2,Math.ceil(r.keep/2)))));
  line('garde jamais inférieure à 2 pendant toute l’observation',pass(m,r=>r.minGuards>=2));
  line('gardes revenus à leur poste (fin de recherche + 4 h)',pass(m,r=>r.freeT!=null&&r.freeT<=SPAN-4&&r.guardsEnd>=r.guards0));
  line('part max de la garnison lancée en recherche',`${f(mean(m,'garrisonPct'),0)} % en moyenne`);
  line('localisé : par le son seul / son puis vue / vue directe / personne',`${cnt(m,r=>r.loc==='son')} / ${cnt(m,r=>r.loc==='son puis vue')} / ${cnt(m,r=>r.loc==='vue directe')} / ${cnt(m,r=>r.loc==='personne')}`);
  line('détection visuelle dans la fenêtre du flash (≤ 0,25 h)',pass(m,r=>r.seen!=null&&r.seen<=.25));
  line('téléportations (seuil 0)',`${ok(m).reduce((n,r)=>n+r.tele,0)} (réapparitions : ${ok(m).reduce((n,r)=>n+r.reappear,0)})`);}
if(ok('V').length&&ok('F').length&&ok('N').length){console.log('\n-- CONTRÔLES DE VISION (le commando est-il vu sans le son ?)');
  line('V : aucun tir — vu en 16 h',pass('V',r=>r.seen!=null));
  line('F : tir mais alertes effacées (flash seul) — vu en 16 h',pass('F',r=>r.seen!=null));
  line('F : vu dans la fenêtre du flash (≤ 0,25 h)',pass('F',r=>r.seen!=null&&r.seen<=.25));
  line('N : tir + alerte sonore — vu en 16 h',pass('N',r=>r.seen!=null));
  line('N : vu dans la fenêtre du flash (≤ 0,25 h)',pass('N',r=>r.seen!=null&&r.seen<=.25));}
if(ok('M').length){console.log('\n-- TIR PUIS FUITE DIRECTE (à l’opposé des gardes)');
  line('ordre de fuite accepté',pass('M',r=>r.fleeOrder));line('distance parcourue (moyenne, cases)',f(mean('M','moved'),1));
  line('pistes Meumeu laissées (moyenne)',f(mean('M','newTracks'),1));line('alertes « pas » (les gardes sont loin : attendu 0)',pass('M',r=>r.pasAlerts>0));
  line('repéré à vue au moins une fois',pass('M',r=>r.seen!=null));
  line('ÉCHAPPÉ : plus vu pendant les 6 dernières heures',pass('M',r=>r.escaped));
  line('dernier repérage à vue (médiane, h)',f(med('M','lastSeen'),2));
  line('Bèè le plus proche à la fin (médiane, cases)',f(med('M','endNearest'),0));
  line('localisé par le son (seul ou puis vue)',pass('M',r=>r.loc==='son'||r.loc==='son puis vue'));}
if(ok('R').length){console.log('\n-- DEUX TIRS');line('seconde alerte créée ou mise à jour',pass('R',r=>r.secondAlertDelay!=null));line('contacts fusionnés (même écouteur, même relèvement)',pass('R',r=>r.merged));line('le second tir ne dégrade pas la précision du cône',pass('R',r=>r.keepsPrecision));line('recherche relancée',pass('R',r=>r.relance));}
// portée : à quelle distance chaque arme provoque-t-elle une alerte sonore ? (un pas de temps, mêmes graines)
const PM=['N','S','Q','U'].filter(m=>MODES.includes(m));
if(PM.length){console.log('\n===== portée d’alerte sonore par arme (nuit, taux sur les graines) =====');
  const DS=[6,9,12,18,24,36];console.log('distance (cases)'.padEnd(26)+DS.map(d=>String(d).padStart(6)).join(''));
  for(const m of PM){let row=(NAME[m]).padEnd(26);for(const d of DS){let a=0,n=0;for(let s=S0;s<S0+NS;s++){const r=run(s,m,d,0,.02);if(r.skip)continue;n++;if(r.alertT!=null)a++;}row+=`${a}/${n}`.padStart(6);}console.log(row);}}
