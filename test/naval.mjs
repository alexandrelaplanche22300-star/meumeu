// Les barges de débarquement, sur la carte « mer ». Critères (écrits avant) :
//  1. la barge se construit sur la plage, au bord de l'eau (comme un bâtiment), et pas à l'intérieur des terres ; les Bèè ne peuvent pas en poser ;
//  2. quatre villageois la construisent : finie, le chantier disparaît et la barge est à l'eau, devant la plage (case d'eau voisine de la terre), avec ses 420 points de vie, en moins de 30 h ;
//  3. un pilote et douze soldats montent à bord (à pied, depuis la plage) en moins de 4 h : 1 conducteur + 12 passagers ;
//  4. la traversée (le clic droit sur la plage d'en face) : la barge arrive échouée à moins de 4 cases du point visé, en moins de 60 h de jeu, et à CHAQUE pas elle est sur l'eau ;
//  5. rampe baissée : les douze passagers sortent par l'avant sur la terre (case marchable, à moins de 5 cases de la proue), le pilote reste à bord ;
//  6. le retour : rampe relevée, la barge repart vers la plage d'origine et y arrive en moins de 60 h ; elle peut y reprendre des soldats ;
//  7. le feu : six fusiliers bèè contre la barge échouée, rampe relevée, 24 h : elle garde au moins 90 % de ses points de vie, aucun passager blessé ;
//  8. coulée au large : les passagers se noient ; coulée contre la rive : ils gagnent la rive ;
//  9. un véhicule (une jeep) monte à bord, traverse et descend sur la plage d'en face ;
// 10. une sauvegarde reprend une barge en mer, son équipage et sa route.
// 12. la grande barge se construit sur la plage et part à l'eau, avec ses 950 points de vie ;
// 13. elle prend un pilote, un mitrailleur et quarante soldats — pas un de plus ;
// 14. l'automitrailleuse à canon est refusée par la barge (trop large) et acceptée par la grande ; deux sur le pont, une jeep de plus refusée (plus de place) ;
// 15. la traversée : les deux véhicules et les quarante soldats débarquent sur la plage d'en face, les véhicules l'un devant l'autre, sur la terre ;
// 16. la mitrailleuse lourde de la passerelle (son mitrailleur, des caisses dans la soute) tire sur des Bèè qui approchent de la barge échouée.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {T,TERRAIN}=await import('../js/data.js');const {VEHDEF}=await import('../js/vehicules.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const hours=(W,h,each=null)=>{for(let k=0;k<h*60;k++){W.update(1/60);if(each&&each())return;}};
const W=new World(71,{map:'mer'});const N=W.N,ter=W.G.terrain,dc=W.G.dcoast;
// une plage : une case de sable à environ 3 cases de l'eau, côté ouest (i < 750) ou est (i > 750), vers le milieu de la hauteur
const beach=(side,jy=750)=>{for(let dj=0;dj<200;dj++)for(const s of [1,-1]){const j=jy+dj*s;for(let i=side<0?560:940;side<0?i<760:i>740;i+=side<0?1:-1){const k=j*N+i;if(ter[k]===T.sand&&dc[k]>=2&&dc[k]<=4&&W.occ[k]<0)return [i,j];}}return null;};
const west=beach(-1),east=beach(1);console.log('plages :',west,east);
// 1
const camp=W.addBuilding('meumeu','camp',west[0]-8,west[1]+4,true);camp.stock={bois:999,pierre:999,fer:999,pieces:999,charbon:99};
const inland=W.canPlace('meumeu','barge',W.capital().i+10,W.capital().j+4);const bee=W.canPlace('beee','barge',west[0]-2,west[1]-1);let rc=null;for(let dj=-6;dj<=6&&!rc?.ok;dj++)for(let di=-6;di<=2&&!rc?.ok;di++){const r=W.canPlace('meumeu','barge',west[0]+di-2,west[1]+dj-1);if(r.ok)rc=Object.assign(r,{at:[west[0]+di-2,west[1]+dj-1]});}
check('1. refusée à l\'intérieur des terres',!inland.ok&&inland.why.some(x=>/mer/.test(x)),JSON.stringify(inland.why));check('1. acceptée sur la plage',!!rc?.ok,rc?JSON.stringify(rc.why):'aucune place');check('1. pas pour les Bèè',!bee.ok&&bee.why.some(x=>/camp/.test(x)),JSON.stringify(bee.why));
const site=W.place('meumeu','barge',rc.at[0],rc.at[1]).b;
// 2
const builders=[];for(let n=0;n<4;n++){const [x,y]=W.nearestLand(site.i-2,site.j+n,6);const v=W.addUnit('meumeu','villageois',x,y,{});v.task={kind:'build',b:site.id};builders.push(v);}
let barge=null;const t2=W.s.t;hours(W,60,()=>{barge=W.s.vehicles.find(v=>v.k==='barge');return !!barge;});
check('2. la barge est construite par les villageois et mise à l\'eau',!!barge&&W.isWaterAt(barge.x,barge.y),barge?`en ${(W.s.t-t2).toFixed(0)} h, (${barge.x.toFixed(1)}, ${barge.y.toFixed(1)}) hp ${barge.hp}`:'jamais sortie : '+(site.why||'')+' progrès '+(site.progress||0).toFixed(2));
check('2. le chantier a disparu',!W.building(site.id));
const landAdj=barge&&[[1,0],[-1,0],[0,1],[0,-1]].some(([a,c])=>TERRAIN[ter[(Math.floor(barge.y)+c)*N+Math.floor(barge.x)+a]]?.walk);check('2. devant la plage (une terre voisine)',!!landAdj);
check('2. 420 points de vie',barge?.hp===420);
// une barge neuve à l'eau à côté de la première (pour les essais suivants) : un chantier fini d'un coup
const newBarge=()=>{for(let dj=-14;dj<=14;dj+=2)for(let di=-8;di<=2;di++){const r=W.canPlace('meumeu','barge',west[0]+di-2,west[1]+dj-1);if(r.ok){const b=W.place('meumeu','barge',west[0]+di-2,west[1]+dj-1).b;return W.launchBoat(b);}}return null;};
// 3
const vil=W.addUnit('meumeu','villageois',barge.x-2.5,barge.y,{});const sold=[];for(let n=0;n<12;n++)sold.push(W.addUnit('meumeu','soldat',barge.x-2.4-(n%4)*.6,barge.y+(Math.floor(n/4)-1)*.8,{rounds:60}));
// (on place chacun sur la terre la plus proche de la rive, comme s'ils attendaient sur la plage)
for(const u of [vil,...sold]){const [x,y]=W.nearestLand(u.x,u.y,6);u.x=x;u.y=y;}
const r3=W.order([vil.id],{type:'vehicle',id:barge.id});W.order(sold.map(u=>u.id),{type:'vehicle',id:barge.id});
hours(W,4,()=>barge.crew.length>=13);const roles=r=>barge.crew.filter(u=>u.vrole===r).length;
check('3. pilote + douze passagers à bord',roles('conducteur')===1&&roles('passager')===12,`${roles('conducteur')} conducteur, ${roles('passager')} passagers`);
// 4
const aim=east;let allWater=true;const t0=W.s.t;const r4=W.vehMove(barge,aim[0]+.5,aim[1]+.5);check('4. la route sur l\'eau existe',r4,barge.why||'');
hours(W,60,()=>{if(!W.isWaterAt(barge.x,barge.y))allWater=false;return barge.state==='idle'&&barge.spd<.1;});
const dAim=Math.hypot(barge.x-aim[0],barge.y-aim[1]);check('4. elle arrive échouée près du point visé',barge.state==='idle'&&barge.beached&&dAim<6,`à ${dAim.toFixed(1)} cases, ${((W.s.t-t0)).toFixed(1)} h`);check('4. toujours sur l\'eau pendant la traversée',allWater);
// 5
const rr=W.boatRamp(barge,true);hours(W,3,()=>barge.ramp>=.95);const un=W.boatUnload(barge,'passagers');
check('5. la rampe s\'abaisse',rr.ok&&barge.ramp>=.9);
const landed=un.out||[];const onLand=landed.filter(u=>TERRAIN[ter[Math.floor(u.y)*N+Math.floor(u.x)]]?.walk&&W.occ[Math.floor(u.y)*N+Math.floor(u.x)]<0).length;const near=landed.filter(u=>Math.hypot(u.x-barge.x,u.y-barge.y)<(VEHDEF.barge.long/2+5)).length;
check('5. douze débarquent sur la terre, près de la proue',un.ok&&landed.length===12&&onLand===12&&near===12,`${landed.length} sortis, ${onLand} sur la terre, ${near} près`);check('5. le pilote reste à bord',barge.crew.length===1&&barge.crew[0].vrole==='conducteur');
// 7 (avant le retour : la barge est ici, échouée) : le feu contre la coque, rampe relevée
{for(const [label,weapon,n] of [['fusils','bee_fusil',6],['antichars','bee_at',3]]){const Wf=new World(72,{map:'mer'});Wf.s.beee.warDay=1;Wf.s.beee.nextWave=1e9;Wf.s.beee.nextAir=1e9;Wf.declareWar?.('beee');Wf.s.fauna=[];
    const Nf=Wf.N,tf=Wf.G.terrain,dcf=Wf.G.dcoast;let sp=null;for(let j=750;j<900&&!sp;j++)for(let i=900;i<1000&&!sp;i++){const k=j*Nf+i;if(tf[k]===T.sand&&dcf[k]>=1&&dcf[k]<=2&&Wf.occ[k]<0)sp=[i,j];}
    // la barge, juste devant le sable (côté mer), la proue vers la terre ; trois soldats à bord
    const bw=[sp[0]-1.5,sp[1]+.5];const bg=Wf.addCombatVehicle('meumeu','barge',bw[0],bw[1],0);const pil=Wf.addUnit('meumeu','villageois',bw[0],bw[1],{});Wf.vehBoard(bg,pil);const pax=[];for(let q=0;q<3;q++){const u=Wf.addUnit('meumeu','soldat',bw[0],bw[1],{rounds:30});Wf.vehBoard(bg,u);pax.push(u);}
    const camp=Wf.addBuilding('beee','camp',sp[0]+14,sp[1]-3,true);camp.stock={bois:50};const bs=[];for(let q=0;q<n;q++){const u=Wf.addUnit('beee','soldat',sp[0]+8,sp[1]-1+q*.9,{w:weapon,rounds:100});u.task={kind:'guard',tx:u.x,ty:u.y};bs.push(u);}
    Wf.makeBand(bs,camp,{x:sp[0]+3,y:sp[1]});
    for(let t=0;t<24;t+=.02)Wf.update(.02);
    const hurt=bg.crew.filter(u=>u.h&&u.h.state!=='ok').length;const pct=bg.hp/bg.max;
    if(label==='fusils')check('7. fusils bèè contre la barge (rampe relevée) : coque ≥ 90 % et personne de blessé',pct>=.9&&hurt===0,`coque ${(pct*100).toFixed(0)} %, ${hurt} blessés à bord`);
    else check('7. antichars bèè : la barge reste vulnérable (l’antichar perce les flancs)',pct<1,`coque ${(pct*100).toFixed(0)} %, ${hurt} blessés à bord, état ${bg.dead?'coulée':'à flot'}`);}}
// 6
W.boatRamp(barge,false);hours(W,3,()=>barge.ramp<=.05);const home=[west[0]+.5,west[1]+.5];const t1=W.s.t;let allWater2=true;const mv6=W.vehMove(barge,home[0],home[1]);if(!mv6)console.log('  vehMove retour refusé :',barge.why,'départ',barge.x.toFixed(1),barge.y.toFixed(1),'eau ici',W.isWaterAt(barge.x,barge.y),'but',home);
hours(W,60,()=>{if(!W.isWaterAt(barge.x,barge.y))allWater2=false;return barge.state==='idle'&&barge.spd<.1;});
const dHome=Math.hypot(barge.x-home[0],barge.y-home[1]);check('6. elle revient à sa plage',barge.state==='idle'&&dHome<6&&allWater2,`à ${dHome.toFixed(1)} cases, ${(W.s.t-t1).toFixed(1)} h`);
// 8 : coulée au large, puis contre la rive
{const mid=[750,west[1]];W.boatMove(barge,mid[0],mid[1]);hours(W,40,()=>barge.state==='idle'&&barge.spd<.1);
  const pax=W.addUnit('meumeu','soldat',barge.x,barge.y,{rounds:10}),pax2=W.addUnit('meumeu','soldat',barge.x,barge.y,{rounds:10});W.vehBoard(barge,pax);W.vehBoard(barge,pax2);const n0=barge.crew.length;
  barge.hp=1;W.vehDestroyed(barge,'test');check('8. coulée au large : tout le monde se noie',barge.drowned===n0&&n0>=2,`${barge.drowned}/${n0} noyés`);}
// 9 : le véhicule sur le pont
{const b2=newBarge();check('9. une seconde barge à l\'eau',!!b2);if(b2){b2.ramp=1;b2.rampTo=1;const jeep=W.addCombatVehicle('meumeu','jeep',b2.x-2.4,b2.y,0);const [jx,jy]=W.nearestLand(jeep.x,jeep.y,5);jeep.x=jx;jeep.y=jy;
    const pilot=W.addUnit('meumeu','villageois',jx,jy,{});W.vehBoard(b2,pilot);const e=W.boatEmbark(b2,jeep);check('9. la jeep monte à bord',e.ok&&b2.cargoVehs?.includes(jeep.id),JSON.stringify(e.why||e.text));
    b2.rampTo=0;hours(W,2);W.vehMove(b2,east[0]+.5,east[1]+.5);hours(W,60,()=>b2.state==='idle'&&b2.spd<.1);
    const dj=Math.hypot(jeep.x-b2.x,jeep.y-b2.y);check('9. la jeep voyage sur le pont',dj<1.5&&jeep.onDeck,`à ${dj.toFixed(2)} case de la barge`);
    b2.rampTo=1;hours(W,3,()=>b2.ramp>=.95);const u2=W.boatUnload(b2,'passagers');const onL=TERRAIN[ter[Math.floor(jeep.y)*N+Math.floor(jeep.x)]]?.walk;
    check('9. la jeep descend sur la terre',u2.ok&&!jeep.aboard&&onL&&!b2.cargoVehs?.length,`${u2.text||JSON.stringify(u2.why)} · jeep en (${jeep.x.toFixed(1)}, ${jeep.y.toFixed(1)})`);
    // 10 : la sauvegarde d'une barge en mer
    W.boatRamp(b2,false);hours(W,2);const m2=[750,east[1]];W.vehMove(b2,m2[0],m2[1]);hours(W,6);const data=W.serialize();const W2=new World(1).restore(data);const c2=W2.s.vehicles.find(v=>v.id===b2.id);
    check('10. sauvegarde : la barge en mer, son pilote et sa route sont repris',!!c2&&c2.crew.length===b2.crew.length&&c2.state==='go'&&c2.bpath?.length>0&&W2.isWaterAt(c2.x,c2.y),c2?`${c2.crew.length} à bord, état ${c2.state}`:'absente');}}
// 11 : un véhicule reçoit l'ordre de se charger : il roule jusqu'à la plage, la barge baisse sa rampe, il monte
{const b3=newBarge();const [jx,jy]=W.nearestLand(b3.x-12,b3.y+3,6);const jeep=W.addCombatVehicle('meumeu','jeep',jx,jy,0);const pil=W.addUnit('meumeu','villageois',b3.x-2,b3.y,{});[pil.x,pil.y]=W.nearestLand(pil.x,pil.y,6);W.vehBoard(b3,pil);
  const dr=W.addUnit('meumeu','villageois',jx,jy,{});W.vehBoard(jeep,dr);   // la jeep a un conducteur
  const r=W.vehEmbarkOrder(jeep,b3);check('11. l\'ordre de se charger est accepté',r.ok,JSON.stringify(r.why||r.text));hours(W,12,()=>jeep.aboard===b3.id);
  check('11. la jeep roule jusqu\'à la barge et monte à bord',jeep.aboard===b3.id&&b3.cargoVehs?.includes(jeep.id)&&b3.ramp>=.9,`à bord : ${jeep.aboard===b3.id}, rampe ${b3.ramp?.toFixed(2)}`);}
// 12 à 16 : la grande barge
{const site=(()=>{for(let dj=-24;dj<=24;dj+=2)for(let di=-10;di<=4;di++){const r=W.canPlace('meumeu','grande_barge',west[0]+di-3,west[1]+dj-1);if(r.ok)return W.place('meumeu','grande_barge',west[0]+di-3,west[1]+dj-1).b;}return null;})();
  check('12. le chantier de la grande barge se pose sur la plage',!!site);const g=site&&W.launchBoat(site);
  check('12. la grande barge est à l\'eau, 950 points de vie',!!g&&g.k==='grande_barge'&&W.isWaterAt(g.x,g.y)&&g.hp===950,g?`(${g.x.toFixed(1)}, ${g.y.toFixed(1)}) hp ${g.hp}`:'pas lancée');
  if(g){g.ramp=1;g.rampTo=1;const [lx,ly]=W.nearestLand(g.x-4,g.y,6);const men=[];for(let n=0;n<43;n++)men.push(W.addUnit('meumeu',n?'soldat':'villageois',lx,ly,{rounds:30}));
    const roles=men.map(u=>W.vehBoard(g,u));const R=r=>g.crew.filter(u=>u.vrole===r).length;
    check('13. un pilote, un mitrailleur, quarante soldats ; le 43e refusé',R('conducteur')===1&&R('servant')===1&&R('passager')===40&&roles[42]===null,`${R('conducteur')} pilote, ${R('servant')} mitrailleur, ${R('passager')} passagers, 43e : ${roles[42]}`);
    // les véhicules : une automitrailleuse à canon refusée par la petite barge, acceptée deux fois par la grande ; une jeep de trop
    const at=(dx)=>{const [x,y]=W.nearestLand(g.x-Math.cos(g.h)*(4+dx),g.y-Math.sin(g.h)*(4+dx),6);return [x,y];};
    const small=W.s.vehicles.find(v=>v.k==='barge'&&v.hp>0&&!v.sunk);const c0=W.addCombatVehicle('meumeu','char',...at(0),g.h);let rs={ok:false,why:['pas de petite barge']};if(small){small.ramp=1;[c0.x,c0.y]=W.nearestLand(small.x-Math.cos(small.h)*3,small.y-Math.sin(small.h)*3,6);rs=W.boatEmbark(small,c0);}
    check('14. la barge refuse l\'automitrailleuse à canon',!rs.ok&&/large|long/.test(rs.why[0]),JSON.stringify(rs.why||rs.text));
    [c0.x,c0.y]=at(0);const e1=W.boatEmbark(g,c0);const c1=W.addCombatVehicle('meumeu','char',...at(1),g.h);const e2=W.boatEmbark(g,c1);const j=W.addCombatVehicle('meumeu','jeep',...at(2),g.h);const e3=W.boatEmbark(g,j);
    check('14. deux automitrailleuses à canon sur le pont de la grande barge',e1.ok&&e2.ok&&g.cargoVehs.length===2,`${e1.text||e1.why} · ${e2.text||e2.why}`);
    check('14. une jeep de plus : plus de place',!e3.ok&&/place/.test(e3.why[0]),JSON.stringify(e3.why||e3.text));
    // 15 : la traversée et le débarquement
    g.rampTo=0;hours(W,3,()=>g.ramp<=.05);let wet=true;W.vehMove(g,east[0]+.5,east[1]+.5);hours(W,90,()=>{if(!W.isWaterAt(g.x,g.y))wet=false;return g.state==='idle'&&g.spd<.1;});
    const dE=Math.hypot(g.x-east[0],g.y-east[1]);const onDeck=[c0,c1].every(c=>c.onDeck&&Math.hypot(c.x-g.x,c.y-g.y)<3);
    check('15. la grande barge traverse (toujours sur l\'eau) et s\'échoue en face, les véhicules sur le pont',dE<6&&wet&&onDeck,`à ${dE.toFixed(1)} cases, véhicules sur le pont : ${onDeck}`);
    g.rampTo=1;hours(W,3,()=>g.ramp>=.95);const u=W.boatUnload(g,'passagers');const land=c=>TERRAIN[ter[Math.floor(c.y)*N+Math.floor(c.x)]]?.walk;const apart=Math.hypot(c0.x-c1.x,c0.y-c1.y);
    check('15. quarante soldats et deux véhicules débarquent, les véhicules sur la terre, l\'un devant l\'autre',u.ok&&u.out.length===40&&u.vehs.length===2&&land(c0)&&land(c1)&&apart>=1.5&&!g.cargoVehs.length,`${u.text||JSON.stringify(u.why)} · écart ${apart.toFixed(1)} cases`);
    // 16 : la mitrailleuse de la passerelle, sur des Bèè qui viennent vers la barge
    if(!W.atWar)W.declareWar('meumeu');W.s.fog=false;g.cargo['m:mg_lourde_mle1']=6;for(const v of u.out){v.task=null;}
    const tx=g.x-Math.cos(g.h)*12,ty=g.y-Math.sin(g.h)*12;const B=[];for(let n=0;n<6;n++){const [x,y]=W.freeSpot(g.x+Math.cos(g.h)*14+(n-2.5)*1.2,g.y+Math.sin(g.h)*14,4);const b=W.addUnit('beee','soldat',x,y,{w:'bee_fusil'});b.task={kind:'move',tx:g.x,ty:g.y};B.push(b);}
    const m=g.mounts[0];let fired=0;const sh0=W.s.shots.length;hours(W,3,()=>{if(m.mag>0||W.s.shots.some(q=>q.by===g.id))fired=1;return W.s.shots.filter(q=>q.by===g.id).length>4;});const shots=W.s.shots.filter(q=>q.by===g.id).length;const hurt=B.filter(b=>b.hp<=0||b.h?.state&&b.h.state!=='ok').length;
    check('16. la mitrailleuse lourde de la grande barge tire sur les Bèè',(g.firedAt??-1)>0&&hurt>=1,`premier tir ${g.firedAt?.toFixed?.(2)} h, ${hurt}/6 Bèè touchés, coups en vol ${shots}, munitions ${m.mag}+${m.pouch}`);}}
console.log(ok?'\nTOUT PASSE':'\nIL Y A DES ÉCHECS');
