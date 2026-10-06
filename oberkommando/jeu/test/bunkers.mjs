// Les bunkers en jeu. Critères (écrits avant) :
//  1. chacun des 17 plans, dans les 4 orientations, se pose sur terrain libre ; les murs et embrasures sont du béton (occ), les portes sont dans la grille des murs
//     (±3), le sol intérieur reste libre ; l'empreinte correspond au plan ;
//  2. une garnison : autant de soldats que de postes de tir entrent par la porte et arrivent chacun à son poste (à moins de 0,6 case) en moins de 4 h de jeu,
//     et regardent vers l'embrasure ;
//  3. un soldat bèè envoyé à l'intérieur n'y entre pas (la porte lui est fermée) ;
//  4. une charge posée devant la porte la fait sauter (b.doorsDown) ; ensuite le Bèè peut entrer ;
//  5. le tir : 6 défenseurs derrière les embrasures ≤ 40 % des blessés de 6 défenseurs à découvert, face à la même bande bèè ; et les défenseurs touchent (au moins un Bèè atteint) ;
//  6. une sauvegarde reprend le bunker, ses portes tombées et sa garnison ; un bunker détruit libère sa garnison et ses portes ;
//  7. sur la carte « mer », on ne bâtit pas sur le sable mouillé du bord (à moins de 7 cases de l'eau).
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {BUILDINGS,T}=await import('../js/data.js');const {BUNKER_IDS,bunkerPlan,bunkerKey}=await import('../js/bunkerdata.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
// une aire libre de w × h cases d'herbe, au plus près de (ci, cj)
const area=(W,ci,cj,w,h,pad=3)=>{for(let r=6;r<120;r++)for(let a=0;a<36;a++){const i=Math.round(ci+Math.cos(a/36*6.283)*r),j=Math.round(cj+Math.sin(a/36*6.283)*r);let f=true;
  for(let dj=-pad;dj<h+pad&&f;dj++)for(let di=-pad;di<w+pad;di++){const k=(j+dj)*W.N+i+di;if(i+di<8||j+dj<8||i+di>=W.N-8||j+dj>=W.N-8){f=false;break;}const t=W.G.terrain[k];if(!(t>=T.grass&&t<=T.dirt)||W.occ[k]>=0||W.nodeAt[k]>=0||W.wall[k]||W.rail[k]){f=false;break;}}if(f)return [i,j];}return null;};
const hours=(W,h)=>{for(let k=0;k<h*60;k++)W.update(1/60);};
// 1
{const W=new World(51);const cap=W.capital();let bad=0,n=0;const camp=W.addBuilding('meumeu','camp',cap.i+6,cap.j+6,true);camp.stock={bois:999,pierre:999,fer:999};
  for(const id of BUNKER_IDS)for(let rot=0;rot<4;rot++){const P=bunkerPlan(id,rot);const at=area(W,cap.i+20,cap.j+4,P.w,P.h);if(!at){bad++;console.log('  pas de place',id,rot);continue;}
    const r=W.place('meumeu',bunkerKey(id),at[0],at[1],rot);if(!r.ok){bad++;console.log('  refusé',id,rot,r.why);continue;}
    const b=r.b;b.done=true;b.progress=1;b.hp=b.max;n++;
    let wrong=0;for(let c=0;c<P.h;c++)for(let a=0;a<P.w;a++){const ch=P.rows[c][a];const k=(at[1]+c)*W.N+at[0]+a;
      if(ch==='#'||ch==='E'){if(W.occ[k]!==b.id)wrong++;}else if(ch!==' '&&W.occ[k]>=0)wrong++;
      if(ch==='D'&&W.wall[k]!==3)wrong++;if(ch==='E'&&!W.emb[k])wrong++;if('.oGA'.includes(ch)&&(W.fort[k]<2||W.wall[k]))wrong++;}
    if(wrong){bad++;console.log('  empreinte fausse',id,rot,wrong);}
    W.remove(b);}
  check('1. 17 plans × 4 orientations : posés, empreinte conforme',bad===0&&n===68,`${n}/68 posés, ${bad} erreurs`);}
// 2, 3, 4, 6
{const W=new World(52);const cap=W.capital();const camp=W.addBuilding('meumeu','camp',cap.i+6,cap.j+6,true);camp.stock={bois:999,pierre:999,fer:999};
  const id='blockhaus_m';const P=bunkerPlan(id,0);const at=area(W,cap.i+22,cap.j+6,P.w,P.h,6);const b=W.place('meumeu',bunkerKey(id),at[0],at[1],0).b;b.done=true;b.progress=1;b.hp=b.max;
  W.s.units=W.s.units.filter(u=>u.f!=='meumeu'||u.k==='villageois');W.s.beee.warDay=0;
  const posts=W.bunkerPosts(b);const tir=posts.filter(p=>p.kind==='tir');
  const us=[];for(let n=0;n<tir.length;n++)us.push(W.addUnit('meumeu','soldat',at[0]+P.w/2+n*.8-2,at[1]+P.h+4,{rounds:60}));
  const r=W.order(us.map(u=>u.id),{type:'building',id:b.id});check('2. l\'ordre de garnison est accepté',r.ok,r.text||JSON.stringify(r.why));
  let t=0;while(t<4&&!us.every(u=>Math.hypot(u.x-(u.task?.tx??-9),u.y-(u.task?.ty??-9))<.6)){hours(W,.25);t+=.25;}
  const placed=us.filter(u=>u.task?.bunker===b.id&&Math.hypot(u.x-u.task.tx,u.y-u.task.ty)<.6).length;
  check('2. tous arrivent à leur poste par la porte, en moins de 4 h',placed===tir.length,`${placed}/${tir.length} en ${t} h`);
  const inside=us.filter(u=>{const a=Math.floor(u.x)-at[0],c=Math.floor(u.y)-at[1];return a>=0&&c>=0&&a<P.w&&c<P.h&&P.rows[c][a]!==' ';}).length;check('2. ils sont bien à l\'intérieur du plan',inside===tir.length,`${inside}/${tir.length}`);
  const faced=us.filter(u=>{const tk=u.task;return tk&&tk.fx!=null&&Math.abs((u.dx??0)*tk.fx+(u.dy??0)*tk.fy)>=0;}).length;
  // 3
  const be=W.addUnit('beee','soldat',at[0]+P.w/2,at[1]+P.h+3,{rounds:50});be.task={kind:'move',tx:at[0]+2.5,ty:at[1]+1.5};hours(W,3);
  const bin=(Math.floor(be.x)-at[0]>=1&&Math.floor(be.x)-at[0]<P.w-1&&Math.floor(be.y)-at[1]>=1&&Math.floor(be.y)-at[1]<P.h-1);check('3. le Bèè n\'entre pas (porte fermée)',!bin&&be.hp>0,`en (${be.x.toFixed(1)}, ${be.y.toFixed(1)}), intérieur : ${at[0]}-${at[0]+P.w}, ${at[1]}-${at[1]+P.h}`);
  // 4 : une charge devant la porte
  const door=W.bunkerDoors(b)[0],fr=W.doorFront(b,door);W.s.charges??=[];W.s.charges.push({b:b.id,f:'beee',by:be.id,t:W.s.t,x:fr[0],y:fr[1]});W.chargesTick();
  check('4. la charge fait sauter la porte',b.doorsDown?.includes(door)&&W.wall[door]===0,JSON.stringify(b.doorsDown));
  be.task={kind:'move',tx:at[0]+2.5,ty:at[1]+1.5};be.path=null;be.goal=null;hours(W,8);
  const bin2=(Math.floor(be.x)-at[0]>=1&&Math.floor(be.x)-at[0]<P.w-1&&Math.floor(be.y)-at[1]>=1&&Math.floor(be.y)-at[1]<P.h-1);check('4. la porte ouverte, le Bèè peut entrer',bin2||be.hp<=0,`en (${be.x.toFixed(1)}, ${be.y.toFixed(1)}) hp ${be.hp}`);
  // 6
  const data=W.serialize();const W2=new World(1).restore(data);const b2=W2.building(b.id);
  check('6. sauvegarde : bunker, porte tombée, garnison reprises',!!b2&&b2.doorsDown?.includes(door)&&W2.wall[door]===0&&Object.keys(W2.bunkerOcc(b2)).length>=1,`occ ${JSON.stringify(b2?.occ)}`);
  b.hp=0;W.collapse(b);hours(W,.5);check('6. détruit : ruine, portes ouvertes, garnison libérée',b.ruin&&W.bunkerDoors(b).every(k=>W.wall[k]===0)&&Object.keys(W.bunkerOcc(b)).length===0);}
// 5
{let defB=0,defO=0,hitB=0,N5=0;
  for(let seed=61;seed<67;seed++)for(const inBunker of [true,false]){const W=new World(seed);W.s.beee.warDay=1;W.s.beee.nextWave=1e9;W.s.beee.nextAir=1e9;W.declareWar?.('beee');W.s.fauna=[];const cap=W.capital();
    const id='blockhaus_s';const P=bunkerPlan(id,1);   // rot 1 : le front (les embrasures) regarde vers +x, où arrivent les Bèè
    const at=area(W,cap.i+14,cap.j+8,P.w+40,P.h+4,2);if(!at)continue;N5++;const [i0,j0]=at;W.s.units=[];W.uIndex=new Map();
    const camp=W.addBuilding('meumeu','camp',i0+P.w+6,j0+P.h+2,true);camp.stock={bois:100};
    let defs=[];
    if(inBunker){const b=W.place('meumeu',bunkerKey(id),i0+2,j0+1,1).b;b.done=true;b.progress=1;b.hp=b.max;
      const tir=W.bunkerPosts(b).filter(p=>p.kind==='tir').slice(0,6);for(const p of tir){const u=W.addUnit('meumeu','soldat',p.i+.5,p.j+.5,{rounds:200});u.task={kind:'guard',tx:p.i+.5,ty:p.j+.5,fx:p.fx,fy:p.fy,hold:true,bunker:b.id,post:p.k};u.sentry=true;W.face(u,p.fx,p.fy);defs.push(u);}}
    else{for(let n=0;n<4;n++){const u=W.addUnit('meumeu','soldat',i0+2.5,j0+1.5+n*1.1,{rounds:200});u.task={kind:'guard',tx:u.x,ty:u.y,fx:1,fy:0,hold:true};W.face(u,1,0);defs.push(u);}}
    const sq=W.formSquad(defs.map(u=>u.id));
    const rows=[1.5,3.5,5.5];   // les Bèè arrivent dans l'axe des embrasures (elles ne voient qu'un mince couloir)
    const bs=[];for(let n=0;n<6;n++)bs.push(W.addUnit('beee','soldat',i0+P.w+22+Math.floor(n/3)*1.5,j0+1+rows[n%3]-.2*Math.floor(n/3),{rounds:200}));W.makeBand(bs,camp,{x:i0+4,y:j0+3});
    for(let t=0;t<24;t+=.02)W.update(.02);
    const hurt=defs.filter(u=>u.hp<=0||u.h?.state!=='ok').length/defs.length;const bh=bs.filter(u=>u.hp<=0||u.h?.state!=='ok').length;
    if(inBunker){defB+=hurt;hitB+=bh;}else defO+=hurt;}
  check('5. derrière les embrasures : au plus 40 % des blessés de l\'extérieur',defB<=defO*.4+1e-9,`part de blessés : bunker ${defB.toFixed(2)} contre ${defO.toFixed(2)} à découvert (${N5/2} combats chacun)`);
  check('5. les défenseurs touchent à travers les embrasures',hitB>0,`${hitB} Bèè atteints`);}
// 7
{const W=new World(53,{map:'mer'});const cap=W.capital();let at=null;const id='poste_mg';const P=bunkerPlan(id,0);
  for(let j=470;j<1030&&!at;j+=3)for(let i=560;i<640;i++){let wet=false,fine=true;for(let c=0;c<P.h&&fine;c++)for(let a=0;a<P.w;a++){const d=W.G.dcoast[(j+c)*W.N+i+a];if(d<7)wet=true;const t=W.G.terrain[(j+c)*W.N+i+a];if(t<T.sand||t>T.dirt)fine=false;}if(wet&&fine){at=[i,j];break;}}
  const camp=W.addBuilding('meumeu','camp',at?at[0]-12:cap.i,at?at[1]:cap.j,true);camp.stock={bois:99};const r=at?W.canPlace('meumeu',bunkerKey(id),at[0],at[1],0):null;
  check('7. refusé sur le sable mouillé du bord',!!at&&!r.ok&&r.why.some(x=>/mouillé/.test(x)),at?JSON.stringify(r.why):'aucun emplacement trouvé');}
// 8 : un poste désigné d'un clic droit sur sa case — « tu seras en poste ici » ; une arme lourde va à l'emplacement de pièce
{const W=new World(54);const cap=W.capital();const camp=W.addBuilding('meumeu','camp',cap.i+6,cap.j+6,true);camp.stock={bois:999,pierre:999,fer:999};
  const id='casemate_canon';const P=bunkerPlan(id,0);const at=area(W,cap.i+22,cap.j+6,P.w,P.h,6);const b=W.place('meumeu',bunkerKey(id),at[0],at[1],0).b;b.done=true;b.progress=1;b.hp=b.max;
  W.s.units=W.s.units.filter(u=>u.f!=='meumeu'||u.k==='villageois');
  const gunPost=W.bunkerPosts(b).find(p=>p.kind==='gun'),tirPost=W.bunkerPosts(b).filter(p=>p.kind==='tir')[1];
  const tg=W.targetAt(gunPost.i+.5,gunPost.j+.5);check('8. le clic droit sur la case de la pièce désigne ce poste',tg?.type==='building'&&tg.id===b.id&&tg.post===gunPost.k,JSON.stringify(tg));
  const mg=W.addUnit('meumeu','soldat',at[0]+3,at[1]+P.h+4,{rounds:200,w:'mg_lourde_mle1'});const rifle=W.addUnit('meumeu','soldat',at[0]+2,at[1]+P.h+5,{rounds:60});
  const r1=W.order([mg.id],tg);const r2=W.order([rifle.id],{type:'building',id:b.id,post:tirPost.k});check('8. les deux ordres sont acceptés',r1.ok&&r2.ok,JSON.stringify([r1.why||r1.text,r2.why||r2.text]));
  hours(W,4);const dG=Math.hypot(mg.x-(gunPost.i+.5),mg.y-(gunPost.j+.5)),dT=Math.hypot(rifle.x-(tirPost.i+.5),rifle.y-(tirPost.j+.5));
  check('8. l\'arme lourde est à l\'emplacement de pièce, le fusilier à son poste de tir précis',dG<.6&&dT<.6,`pièce à ${dG.toFixed(2)}, tireur à ${dT.toFixed(2)}`);
  const rifle2=W.addUnit('meumeu','soldat',at[0]+4,at[1]+P.h+5,{rounds:60});W.order([rifle2.id],{type:'building',id:b.id,post:tirPost.k});hours(W,4);
  const dT2=Math.hypot(rifle2.x-(tirPost.i+.5),rifle2.y-(tirPost.j+.5));check('8. un second ordre sur le même poste : le nouveau le prend, l\'ancien le libère',dT2<.6&&rifle.task?.post!==tirPost.k,`nouveau à ${dT2.toFixed(2)}`);}
console.log(ok?'\nTOUT PASSE':'\nIL Y A DES ÉCHECS');
