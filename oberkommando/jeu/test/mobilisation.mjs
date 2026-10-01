// La mobilisation d'une ville bèè sous alertes. Durées en heures de jeu, une nuit profonde, ville développée (3 jours de croissance).
// Scénarios :
//   S   (sons)   : un commando tire huit fois, de huit endroits différents autour de la ville, toutes les 0,4 h — alertes à la chaîne, aucune vue
//   D   (danger) : le commando reste en vue à 12 cases du centre-ville et tire toutes les 0,5 h pendant 4 h — vue directe, défense locale
//   C5  (cinq)   : cinq tirs de cinq directions en cinq pas de temps consécutifs — alertes simultanées
//
// ============ CRITÈRES INITIAUX (fixés AVANT les modifications du moteur) ============
//   I1. départ de la recherche ≤ 0,5 h après le premier tir, ≥ 95 % des essais (S et D confondus)
//   I2a. part de la garnison en rondes + fouilles ≤ 45 % en S     I2b. ≤ 65 % en D, bande de défense comprise
//   I3. gardes restant à leur poste (beeeGuards) ≥ moitié de la garnison minimale (au moins 2), en S
//   I4. chaque fouille d'alerte se termine ≤ 12 h après son départ, ≥ 95 % des fouilles
//   I5. à la fin, plus aucun garde envoyé par une alerte n'est encore dehors
//   Mesure d'origine (v1) : troupes = gardes+rondes+fouilles ; bande = bandes de défense dont b.city est la ville défendue ;
//   « gardes au poste » = beeeGuards (sans les sentinelles) ; « encore dehors » compte aussi les gardes morts.
//
// ============ CRITÈRES CORRIGÉS (mêmes seuils, mesure corrigée — justification et impact) ============
//   C1a/C1b. la latence d'une RECHERCHE n'a pas de sens face à un danger en vue (la réponse est une bande de défense) : 1a = sons,
//            1b = première réponse quelconque en D.  Impact : un cas D à 1,55 h n'était pas un retard de recherche.
//   C2a/C2b. la garnison compte aussi les soldats engagés localement (assault) ; les bandes se comptent par ville d'ORIGINE des soldats
//            (un renfort voisin pèse sur le plafond de SA ville) ; C2b compte les assault comme sorties.
//            Impact : le 67 % de I2b venait des renforts d'une voisine comptés dans la ville défendue.
//   C3.  « au poste » = troupes en ville hors rondes, fouilles et engagés (sentinelles comprises).  Impact : beeeGuards ignorait les sentinelles.
//   C5.  les gardes morts ne comptent plus comme « encore dehors » ; une fouille est finie dès que le garde n'est plus en fouille.
//   C6 (nouveau). cinq alertes simultanées : part dehors ≤ 45 %, et au moins 2 gardes partis (le plafond ne bloque pas toute réaction).
//   C7 (nouveau). comptage unique : le recomptage indépendant (ce fichier) égale beeeAll/beeeOut/beeeEngaged/beeeBandOut à chaque pas.
//   node test/mobilisation.mjs [nbGraines=10] [graineDeDépart=1] [joursDeCroissance=3]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const NS=+(process.argv[2]||10),S0=+(process.argv[3]||1),WARM=+(process.argv[4]||3);
const DT=1/120,SPAN=30;
const f=(v,d=2)=>v==null?'—':(typeof v==='number'?v.toFixed(d):String(v));
const med=a=>{const v=a.filter(x=>x!=null).sort((p,q)=>p-q);return v.length?v[v.length>>1]:null;};
const alive=u=>u.hp>0&&u.h?.state!=='hors';
function spot(W,cx,cy,R,a0){const N=W.N;for(let k=0;k<72;k++){const a=a0+k/72*6.283,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;if(x<3||y<3||x>N-3||y>N-3)continue;
  let ok=true;for(let dj=-1;dj<=1&&ok;dj++)for(let di=-1;di<=1;di++){const kk=(Math.floor(y)+dj)*N+Math.floor(x)+di;if(!TERRAIN[W.G.terrain[kk]]?.walk||W.occ[kk]>=0){ok=false;break;}}if(ok)return [x,y];}return null;}
function run(seed,mode){
  const W=new World(seed);for(let h=0;h<6+WARM*24;h++)W.update(1);W.s.solar=.5;
  const B=W.s.beee,c=B.cities.filter(c=>!c.fallen).sort((a,b)=>W.beeeTroops(b).length-W.beeeTroops(a).length)[0];
  const troops0=W.beeeTroops(c).length,keep=W.beeeGarrisonMin(c);
  const isOut=u=>u.f==='beee'&&u.city===c.id&&alive(u)&&!u.band&&(u.task?.kind==='patrol'||u.task?.kind==='search');
  const cm=W.addUnit('meumeu','soldat',c.x+40,c.y);cm.w='mle1';cm.mag=5;cm.pouch=200;cm.task={kind:'guard',tx:cm.x,ty:cm.y};
  const t0=W.s.t;const R={seed,mode,troops0,keep};
  const spots=[];for(let k=0;k<(mode==='C5'?5:8);k++){const p=spot(W,c.x,c.y,mode==='D'?12:30,k/(mode==='C5'?5:8)*6.283);if(p)spots.push(p);}
  if(!spots.length)return {seed,mode,skip:true};
  const place=p=>{cm.x=p[0];cm.y=p[1];cm.task={kind:'guard',tx:p[0],ty:p[1]};};
  place(spots[0]);const fire=()=>W.shotNoise(cm,W.W('mle1'),cm.x+20,cm.y);
  let next=0,shots=0,firstShotT=null,firstSearchT=null,firstBandT=null,mism=0,steps=0,dbgN=0;
  const M={share1:0,shareBand1:0,post1:1e9,share2:0,shareUsed2:0,post2:1e9,peakOut2:0,dispatched05:0};
  const disp1=new Map(),done1=[],disp2=new Map(),done2=[];
  for(let n=0;n<SPAN/DT;n++){
    const t=W.s.t-t0;
    if(mode==='S'&&t>=next&&shots<8){place(spots[shots%spots.length]);fire();if(firstShotT==null)firstShotT=t;shots++;next=t+.4;}
    if(mode==='D'&&t>=next&&t<4){fire();if(firstShotT==null)firstShotT=t;shots++;next=t+.5;}
    if(mode==='C5'&&shots<5){place(spots[shots]);fire();if(firstShotT==null)firstShotT=t;shots++;}
    if(t>=6&&cm.hp>0){W.s.units=W.s.units.filter(u=>u!==cm);cm.hp=0;}   // le commando part à 6 h : plus d'alerte nouvelle, on mesure le retour
    W.update(DT);steps++;
    const mine=W.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&u.city===c.id&&alive(u)&&!u.band);
    const outN=mine.filter(u=>u.task?.kind==='patrol'||u.task?.kind==='search').length;
    // ---- mesure v1 (initiale) ----
    const tr1=mine.filter(u=>['guard','patrol','search'].includes(u.task?.kind)).length;
    const band1=(B.bands||[]).filter(b=>b.kind==='defense'&&b.city===c.id).reduce((s,b)=>s+b.m.map(id=>W.unit(id)).filter(u=>u&&alive(u)).length,0);
    if(tr1+band1>0){M.share1=Math.max(M.share1,outN/(tr1+band1));M.shareBand1=Math.max(M.shareBand1,(outN+band1)/(tr1+band1));}
    M.post1=Math.min(M.post1,W.beeeGuards(c).length);
    // ---- mesure v2 (corrigée) : garnison = gardes, rondes, fouilles, engagés ; bandes par ville d'origine ----
    const all2=mine.filter(u=>['guard','patrol','search','assault'].includes(u.task?.kind)).length,eng=mine.filter(u=>u.task?.kind==='assault').length;
    const bandO=(B.bands||[]).filter(b=>b.kind==='defense').reduce((s,b)=>s+b.m.map(id=>W.unit(id)).filter(u=>u&&alive(u)&&u.from===c.id).length,0);
    const tot2=all2+bandO;if(tot2>0){M.share2=Math.max(M.share2,(outN+bandO)/tot2);M.shareUsed2=Math.max(M.shareUsed2,(outN+bandO+eng)/tot2);}
    M.post2=Math.min(M.post2,all2-outN-eng);
    if(mode==='C5'&&t<3){M.peakOut2=Math.max(M.peakOut2,tot2?(outN+bandO)/tot2:0);}
    // ---- comptage unique : le recomptage indépendant égale les compteurs du moteur ----
    if(typeof W.beeeAll==='function'){if(W.beeeAll(c)!==all2||W.beeeOut(c)!==outN||W.beeeEngaged(c)!==eng||W.beeeBandOut(c)!==bandO)mism++;}
    if(firstBandT==null&&(B.bands||[]).some(b=>b.kind==='defense'&&b.m.length))firstBandT=W.s.t-t0;
    // ---- fouilles d'alerte : départ et retour ----
    for(const u of mine){const k=u.task?.kind;
      if(k==='search'&&!u.task.scout&&u.task.t0>=t0-1e-9){if(!disp1.has(u.id)){disp1.set(u.id,W.s.t-t0);disp2.set(u.id,W.s.t-t0);if(firstSearchT==null)firstSearchT=W.s.t-t0;if(mode==='C5'&&W.s.t-t0<=.5)M.dispatched05++;}}
      else{if(disp1.has(u.id)&&(k==='guard'||!k)){done1.push({id:u.id,t0:disp1.get(u.id),back:W.s.t-t0});disp1.delete(u.id);}
           if(disp2.has(u.id)&&k!=='search'){done2.push({id:u.id,t0:disp2.get(u.id),back:W.s.t-t0});disp2.delete(u.id);}}}
  }
  R.M=M;R.shots=shots;R.mism=mism;R.steps=steps;
  R.latency=firstSearchT!=null&&firstShotT!=null?firstSearchT-firstShotT:null;
  R.reaction=firstShotT!=null?(()=>{const q=[firstSearchT,firstBandT].filter(v=>v!=null);return q.length?Math.min(...q)-firstShotT:null;})():null;
  R.dur1=done1.map(d=>d.back-d.t0);R.dur2=done2.map(d=>d.back-d.t0);
  R.still1=disp1.size;R.still2=[...disp2.keys()].filter(id=>{const u=W.unit(id);return u&&alive(u);}).length;R.dead=disp2.size-R.still2;
  return R;}
console.log(`### mobilisation · ${NS} graines · ville développée ${WARM} jour(s) · nuit · ${SPAN} h de jeu · mesure v1 (initiale) et v2 (corrigée)`);
const all={S:[],D:[],C5:[]};
for(let s=S0;s<S0+NS;s++)for(const m of ['S','D','C5']){const r=run(s,m);all[m].push(r);if(r.skip){console.log(`graine ${s} ${m} : ignorée`);continue;}
  const M=r.M;console.log(`graine ${s} · ${m} : troupes ${r.troops0} (min ${r.keep}) · latence ${f(r.latency)} h · v1 dehors ${f(M.share1*100,0)} % / avec bande ${f(M.shareBand1*100,0)} % · v2 dehors ${f(M.share2*100,0)} % / avec engagés ${f(M.shareUsed2*100,0)} % · au poste v1 ${M.post1}, v2 ${M.post2} · fouilles ${r.dur2.length+r.still2} (médiane ${f(med(r.dur2),1)} h) · non concordance des compteurs ${r.mism}/${r.steps}`);}
const ok=m=>all[m].filter(r=>!r.skip);const line=(l,pass,d)=>console.log(`${pass?'PASS':'FAIL'}  ${l}${d?'  ['+d+']':''}`);
const S=ok('S'),D=ok('D'),C=ok('C5');const both=[...S,...D];
console.log('\n===== CRITÈRES INITIAUX (mesure v1) =====');
{const lat=both.filter(r=>r.latency!=null);
 line('I1. départ de la recherche ≤ 0,5 h (S et D)',lat.length>0&&lat.filter(r=>r.latency<=.5).length>=Math.ceil(.95*both.length),`${lat.filter(r=>r.latency<=.5).length}/${both.length} (sans recherche dans ${both.length-lat.length} cas)`);
 line('I2a. part dehors ≤ 45 % (S)',S.every(r=>r.M.share1<=.45),`pire ${f(Math.max(...S.map(r=>r.M.share1))*100,0)} %`);
 line('I2b. part dehors + bande ≤ 65 % (D)',D.every(r=>r.M.shareBand1<=.65),`pire ${f(Math.max(...D.map(r=>r.M.shareBand1))*100,0)} % ; ${D.filter(r=>r.M.shareBand1<=.65).length}/${D.length}`);
 const okP=r=>r.M.post1>=Math.min(r.troops0,Math.max(2,Math.ceil(r.keep/2)));
 line('I3. gardes à leur poste ≥ moitié du minimum (S)',S.every(okP),`${S.filter(okP).length}/${S.length}`);
 const d1=both.flatMap(r=>r.dur1);line('I4. fouilles terminées ≤ 12 h',d1.length>0&&d1.filter(d=>d<=12).length>=Math.ceil(.95*d1.length),`${d1.filter(d=>d<=12).length}/${d1.length}`);
 line('I5. plus aucun garde d’alerte dehors à la fin',both.every(r=>r.still1===0),`${both.filter(r=>r.still1===0).length}/${both.length}`);}
console.log('\n===== CRITÈRES CORRIGÉS (mesure v2) =====');
{const latS=S.filter(r=>r.latency!=null),reaD=D.filter(r=>r.reaction!=null);
 line('C1a. sons : départ de la recherche ≤ 0,5 h',latS.length===S.length&&latS.filter(r=>r.latency<=.5).length>=Math.ceil(.95*S.length),`${latS.filter(r=>r.latency<=.5).length}/${S.length} ; médiane ${f(med(latS.map(r=>r.latency)))} h ; pire ${f(Math.max(...latS.map(r=>r.latency)))} h`);
 line('C1b. danger : première réponse (recherche ou bande) ≤ 0,5 h',reaD.length===D.length&&reaD.filter(r=>r.reaction<=.5).length>=Math.ceil(.95*D.length),`${reaD.filter(r=>r.reaction<=.5).length}/${D.length} ; médiane ${f(med(reaD.map(r=>r.reaction)))} h`);
 line('C2a. sons : rondes + fouilles + bande d’origine ≤ 45 %',S.every(r=>r.M.share2<=.45),`pire ${f(Math.max(...S.map(r=>r.M.share2))*100,0)} % ; ${S.filter(r=>r.M.share2<=.45).length}/${S.length}`);
 line('C2b. danger : sorties + bande d’origine + engagés locaux ≤ 65 %',D.every(r=>r.M.shareUsed2<=.65),`pire ${f(Math.max(...D.map(r=>r.M.shareUsed2))*100,0)} % ; ${D.filter(r=>r.M.shareUsed2<=.65).length}/${D.length}`);
 const okP2=r=>r.M.post2>=Math.min(r.troops0,Math.max(2,Math.ceil(r.keep/2)));
 line('C3. troupes restant à leur poste ≥ moitié du minimum (au moins 2) — sons',S.every(okP2),`${S.filter(okP2).length}/${S.length} ; pire ${Math.min(...S.map(r=>r.M.post2))}`);
 line('C3b. idem face au danger',D.every(okP2),`${D.filter(okP2).length}/${D.length} ; pire ${Math.min(...D.map(r=>r.M.post2))}`);
 const d2=both.flatMap(r=>r.dur2);line('C4. fouilles terminées ≤ 12 h',d2.length>0&&d2.filter(d=>d<=12).length>=Math.ceil(.95*d2.length),`${d2.filter(d=>d<=12).length}/${d2.length} ; médiane ${f(med(d2),1)} h`);
 line('C5. plus aucun garde VIVANT d’alerte dehors à la fin',both.every(r=>r.still2===0),`${both.filter(r=>r.still2===0).length}/${both.length} (morts en chemin : ${both.reduce((n,r)=>n+r.dead,0)})`);
 line('C6. cinq alertes simultanées : part dehors ≤ 45 % et ≥ 2 gardes partis en 0,5 h',C.every(r=>r.M.peakOut2<=.45&&r.M.dispatched05>=2),`pire part ${f(Math.max(...C.map(r=>r.M.peakOut2))*100,0)} % ; gardes partis en 0,5 h : ${C.map(r=>r.M.dispatched05).join('/')}`);
 line('C7. comptage unique : recomptage indépendant = compteurs du moteur à chaque pas',[...S,...D,...C].every(r=>r.mism===0),`${[...S,...D,...C].reduce((n,r)=>n+r.mism,0)} écarts sur ${[...S,...D,...C].reduce((n,r)=>n+r.steps,0)} pas`);}
