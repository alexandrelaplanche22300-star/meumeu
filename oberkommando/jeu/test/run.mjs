// Les bancs d'Oberkommando der Meumeu. Chaque banc monte une situation, fait tourner le monde, et dit ce qui s'est passé.
// ?only=5,6 : ne lancer que ces bancs.
import {World} from '../js/world.js';
import {DAY,BUILDINGS,UNITS,VEHICLES,RARE,MAP_N,T} from '../js/data.js';
import {derive,gel,wound,fmt,TILE_M} from '../js/ballistics.js';
import {newHealth,applyWound,tickHealth,treat,bleedRate} from '../js/health.js';
import {BLOOD,AIM} from '../js/body.js';
import {rng} from '../js/gen.js';
import {deriveArmor,stopsAt,DEFAULT_ARMORS,MATS} from '../js/armor.js';
import {CONSTRUCTIONS} from '../js/ballistics.js';
const out=document.getElementById('out');const say=t=>{out.textContent+=t+'\n';};
const only=new URLSearchParams(location.search).get('only')?.split(',').map(Number);const on=n=>!only||only.includes(n);
const run=(W,h,step=.05)=>{for(let t=0;t<h;t+=step)W.update(step);};
const count=(W,h,step=.05)=>{const ev={};for(let t=0;t<h;t+=step){W.update(step);for(const e of W.events.splice(0))ev[e.type]=(ev[e.type]||0)+1;}return ev;};
// poser un bâtiment fini, sans payer : pour monter une situation
const put=(W,f,k,i,j)=>{const b=W.addBuilding(f,k,i,j,true);if(BUILDINGS[k].store)b.stock=b.stock||{};return b;};
const free=(W,k,ci,cj,r0=4,r1=20)=>{for(let r=r0;r<r1;r++)for(let a=0;a<32;a++){const i=Math.round(ci+Math.cos(a/32*6.283)*r),j=Math.round(cj+Math.sin(a/32*6.283)*r);const c=W.canPlace('meumeu',k,i,j);if(c.ok||c.why.every(w=>w.startsWith('il manque')||w.startsWith('aucun dépôt')))return [i,j];}return null;};
// un terrain plat et dégagé de n × m cases près de (ci, cj), pour les fusillades
const field=(W,ci,cj,n,m)=>{for(let r=0;r<40;r++)for(let a=0;a<24;a++){const i=Math.round(ci+Math.cos(a/24*6.283)*r),j=Math.round(cj+Math.sin(a/24*6.283)*r);let ok=true;
  for(let dj=0;dj<m&&ok;dj++)for(let di=0;di<n;di++){const k=(j+dj)*MAP_N+i+di;const t=W.G.terrain[k];if(!(t>=T.sand&&t<=T.scrub)||W.occ[k]>=0||W.nodeAt[k]>=0||W.wall[k]){ok=false;break;}}if(ok)return [i,j];}return null;};
const T0=performance.now();const R0=rng(77);

if(on(0)){say('=== banc 0 : la carte ===');
for(const seed of [1,2,3,4,5]){const W=new World(seed);const G=W.G;const land=G.terrain.filter(t=>t>=T.sand&&t<=T.scrub).length;
  const byRes={};for(const d of G.deposits)byRes[d.res]=(byRes[d.res]||0)+1;
  const u=W.s.units.find(x=>x.f==='meumeu');const paths=W.G.beee.map(([bi,bj])=>{const r=W.pather.find(Math.floor(u.x),Math.floor(u.y),bi,bj+4,W.costFn('meumeu'),k=>Math.hypot(k%MAP_N-bi,((k/MAP_N)|0)-bj)<7,80000);return r.done?r.path.length:'NON';});
  say(`graine ${seed} : terre ${Math.round(land/MAP_N/MAP_N*100)} % · capitale ${G.capital} · bèè ${G.beee.map(p=>p.join(',')).join(' ; ')} · filons ${RARE.map(k=>k+' '+(byRes[k]||0)).join(', ')} · marche vers les Bèè : ${paths.join(', ')} cases · guerre au jour ${W.s.beee.warDay}`);}}

if(on(1)){say('\n=== banc 1 : ramasser, bâtir ===');
{const W=new World(3);const cap=W.capital();const vil=W.s.units.filter(u=>u.f==='meumeu');const near=t=>W.s.nodes.filter(n=>n.type===t&&n.left>1).sort((a,b)=>Math.hypot(a.i-cap.i,a.j-cap.j)-Math.hypot(b.i-cap.i,b.j-cap.j))[0];
  const s0={...cap.stock};W.order(vil.slice(0,4).map(u=>u.id),{type:'node',id:near('tree').id});W.order(vil.slice(4,6).map(u=>u.id),{type:'node',id:near('rock').id});W.order(vil.slice(6,8).map(u=>u.id),{type:'node',id:near('bush').id});
  run(W,12);say(`12 h, 4 bûcherons, 2 carriers, 2 cueilleurs : bois +${Math.round(cap.stock.bois-s0.bois)}, pierre +${Math.round(cap.stock.pierre-s0.pierre)}, vivres +${Math.round(cap.stock.vivres-s0.vivres)}`);
  const at=free(W,'maison',cap.i+2,cap.j+2);const r=W.place('meumeu','maison',at[0],at[1]);W.order(vil.slice(0,3).map(u=>u.id),{type:'building',id:r.b.id});run(W,8);
  say(`maison : ${r.ok?'posée':r.why}, ${r.b.done?'bâtie':Math.round(r.b.progress*100)+' %'} · population ${JSON.stringify(W.pop('meumeu'))}`);
  const q=W.train(cap,'villageois');run(W,5);say(`former un villageois : ${q.ok?'ok':q.why} · ${W.s.units.filter(u=>u.f==='meumeu').length} Meumeu`);}}

if(on(2)){say('\n=== banc 2 : la logistique — porteurs, train ===');
{const W=new World(3);const cap=W.capital();Object.assign(cap.stock,{bois:400,pierre:200,pieces:100,carburant:100});
  const at=free(W,'camp',cap.i+2,cap.j+2,9,14);const camp=put(W,'meumeu','camp',at[0],at[1]);camp.stock.fer=40;W.setWant(cap,'fer',30);const r=W.addPorters(cap,2);run(W,24);const cart=W.s.vehicles.find(v=>v.k==='porteur')||{};

  say(`porteurs capitale ↔ camp à ${Math.round(Math.hypot(camp.i-cap.i,camp.j-cap.j))} cases : ${r.ok?r.n+' porteurs':r.why[0]} · 24 h plus tard : fer à la capitale ${fmt(cap.stock.fer||0,1)}, au camp ${fmt(camp.stock.fer||0,1)} · voyages ${cart.trips||0} ${cart.why?'('+cart.why+')':''}`);
  const W2=new World(3);const c2=W2.capital();Object.assign(c2.stock,{bois:3000,pierre:2000,pieces:500,carburant:500});
  let row=null;for(let dj=-6;dj<=8&&row==null;dj++){const j=c2.j+dj;let ok=true;for(let i=c2.i+6;i<c2.i+40;i++){const k=j*MAP_N+i;if(!(W2.G.terrain[k]>=T.sand&&W2.G.terrain[k]<=T.scrub)||W2.occ[k]>=0){ok=false;break;}}if(ok)row=j;}
  if(row==null)say('pas de rangée libre pour la voie de test');else{
    const cells=W2.lineCells(c2.i+6,row,c2.i+39,row);W2.planLine('meumeu','rail',cells);for(const k of Object.keys(W2.s.rails))W2.lineBuilt('rail',+k);
    const g1=put(W2,'meumeu','gare',c2.i+7,row-2),g2=put(W2,'meumeu','gare',c2.i+35,row-2);g2.stock.fer=120;g1.stock.pieces=40;g1.stock.bois=60;g1.stock.pierre=20;
    const tq=W2.train(g1,'train');run(W2,9);const tr=W2.s.vehicles.find(v=>v.k==='train');const rr=W2.setRoute(tr.id,g1.id,g2.id);run(W2,6);
    say(`train sur ${cells.length} cases de voie : ${tq.ok?'construit':tq.why} · ${rr.ok?'ligne':rr.why} · 6 h plus tard : fer en gare de départ ${fmt(g1.stock.fer||0)}, au bout ${fmt(g2.stock.fer||0)} ${tr.why?'('+tr.why+')':''}`);
    for(let n=0;n<3;n++)W2.blast(c2.i+22+n*.4,row+.5,'bombe','beee',null,1);g2.stock.fer=80;const f0=g1.stock.fer||0;run(W2,10);say(`voie bombardée au milieu : le train ${tr.why||'roule encore'} · fer arrivé depuis : ${fmt((g1.stock.fer||0)-f0)}`);}
}}

if(on(3)){say('\n=== banc 3 : la balistique — étalonnage sur de vraies cartouches, puis les armes des Meumeu ===');
  const REF=[['7,62×51 M80',{d:7.82,l:28.4,nose:'pointue',base:'plat',cons:'fmj',c:2.9,L:560,twist:305,action:'semi',rof:600,mag:20,heavy:false},840],
    ['5,56×45 M193',{d:5.7,l:18.9,nose:'pointue',base:'bt',cons:'fmjm',c:1.65,L:508,twist:305,action:'auto',rof:750,mag:30,heavy:false},990],
    ['9×19 blindée',{d:9.01,l:15.5,nose:'ronde',base:'plat',cons:'fmj',c:.4,L:100,twist:250,action:'semi',rof:600,mag:15,heavy:false},360],
    ['9×19 pointe creuse',{d:9.01,l:15.5,nose:'ronde',base:'plat',cons:'hp',c:.4,L:100,twist:250,action:'semi',rof:600,mag:15,heavy:false},360],
    ['7,62×39 M43',{d:7.92,l:26.8,nose:'pointue',base:'plat',cons:'fmj',c:1.6,L:415,twist:240,action:'auto',rof:600,mag:30,heavy:false},715],
    ['12,7×99',{d:12.95,l:58,nose:'pointue',base:'bt',cons:'fmj',c:15,L:1143,twist:381,action:'auto',rof:550,mag:100,heavy:true},890]];
  say('cartouche humaine : v0 calculée (réelle) · énergie · gélatine 10 % (70 cm) : bascule, fragmentation, profondeur');
  for(const [name,p,real] of REF){const D=derive(p);const g=gel(D,D.v0,rng(7),.7);
    say(`  ${name} : ${Math.round(D.v0)} m/s (${real}) · ${Math.round(D.E0)} J · bascule ${g.yawAt!=null?fmt(g.yawAt*100,1)+' cm':'non'} · fragmente ${g.fragAt!=null?fmt(g.fragAt*100,1)+' cm':'non'}${g.expanded?' · s’expanse':''} · ${g.exit?'sort':'s’arrête à '+fmt(g.depth*100,1)+' cm'}`);}
  {const D=derive(REF[1][1]);const g=gel(D,700,rng(7),.7);say(`  5,56 M193 à 700 m/s (vers 250 m) : fragmente ${g.fragAt!=null?'oui':'non'} · ${g.exit?'sort':'s’arrête à '+fmt(g.depth*100,1)+' cm'}`);}
  const W=new World(1);say('\nles armes des deux camps (gélatine de 16 cm, à l’échelle d’un Meumeu de 30 cm) :');
  for(const d of Object.values(W.s.designs)){const D=derive(d.p);const g=gel(D,D.at(20).v,rng(7));
    say(`  ${d.name} (${D.name}) : balle ${fmt(D.m,3)} g à ${Math.round(D.v0)} m/s = ${fmt(D.E0,1)} J · ${Math.round(D.P)} MPa · Sg ${fmt(D.Sg,2)} · arme ${Math.round(D.mass*1000)} g, recul ${fmt(D.recoil,2)} J · portée utile ${D.eff} m · perce ${fmt(D.pen(D.at(30).v),2)} mm à 30 m · ${D.perCrate} coups la caisse, ${D.carry} portés · à 20 m : bascule ${g.yawAt!=null?fmt(g.yawAt*100,1)+' cm':'non'}, ${g.exit?'sort':'s’arrête à '+fmt(g.depth*100,1)+' cm'}`);
    say(`     ${D.verdicts.map(v=>(v.tone==='bad'?'− ':v.tone==='good'?'+ ':'· ')+v.t).join(' | ')}`);}
  // des idées de joueur : qu'est-ce que la physique en dit ?
  const IDEAS=[['un gros calibre lent',{d:4,l:8,nose:'ronde',base:'plat',cons:'fmj',c:.05,L:120,twist:120,action:'verrou',rof:600,mag:4,heavy:false}],
    ['une aiguille très rapide',{d:1.2,l:7,nose:'pointue',base:'bt',cons:'fmjm',c:.04,L:220,twist:25,action:'semi',rof:600,mag:10,heavy:false}],
    ['la même, pas de rayure trop long',{d:1.2,l:7,nose:'pointue',base:'bt',cons:'fmjm',c:.04,L:220,twist:120,action:'semi',rof:600,mag:10,heavy:false}],
    ['une mitrailleuse perforante',{d:2,l:8,nose:'pointue',base:'bt',cons:'ap',c:.05,L:200,twist:60,action:'auto',rof:900,mag:50,heavy:true}],
    ['une charge absurde',{d:1.8,l:6.5,nose:'pointue',base:'plat',cons:'fmj',c:.2,L:140,twist:60,action:'verrou',rof:600,mag:5,heavy:false}]];
  say('\ndes idées de joueur :');
  for(const [name,p] of IDEAS){const D=derive(p);say(`  ${name} : ${Math.round(D.v0)} m/s, ${fmt(D.E0,1)} J, ${Math.round(D.P)} MPa, Sg ${fmt(D.Sg,2)}, ${D.moa.toFixed(1)} MOA, portée ${D.eff} m · ${D.verdicts.filter(v=>v.tone).map(v=>(v.tone==='bad'?'− ':'+ ')+v.t).join(' | ')}`);}}

if(on(4)){say('\n=== banc 4 : les blessures — mille tirs au hasard sur un Meumeu debout, de face, à 20 m ===');
  const W=new World(1);const R=rng(11);
  for(const id of ['mle1','bee_fusil','bee_pm']){const D=W.W(id);const v=D.at(20).v;const st={mort:0,hors:0,blesse:0,rien:0},causes={},later={mort:0,hors:0};let E=0,n=0;
    for(let k=0;k<1000;k++){// un point d'entrée au hasard sur la silhouette de face
      const x=(R()-.5)*.21,y=R()*.3;const hit=W.bodyRay([x,y,2],[0,0,-1],0,'debout');if(!hit)continue;n++;
      const rec=wound(D,v,hit.p,hit.d,R);E+=rec.E;const h=newHealth();const o=applyWound(h,rec,R,'balle');const s=o.now||(h.state==='blesse'?'blesse':'rien');st[s]=(st[s]||0)+1;if(o.now)causes[h.cause]=(causes[h.cause]||0)+1;
      if(!o.now){for(let t=0;t<600&&h.state!=='mort';t+=1)tickHealth(h,1);if(h.state==='mort')later.mort++;else if(h.state==='hors')later.hors++;}}
    say(`  ${W.design(id).name} : ${n} touchés · ${fmt(E/n,1)} J cédés en moyenne · tout de suite : mort ${Math.round(st.mort/n*100)} %, hors de combat ${Math.round(st.hors/n*100)} %, blessé ${Math.round(st.blesse/n*100)} % · sans soins, 10 min plus tard : ${Math.round(later.mort/n*100)} % de plus sont morts`);
    say(`     causes immédiates : ${Object.entries(causes).sort((a,b)=>b[1]-a[1]).map(([c,m])=>`${c} ${m}`).join(', ')}`);}
  // la même blessure, soignée ou non : une artère fémorale
  const D=W.W('mle1');let got=null;for(let k=0;k<8000&&!got;k++){const x=.03+(R()-.5)*.02,y=.03+R()*.045;const hit=W.bodyRay([x,y,2],[0,0,-1],0,'debout');if(!hit)continue;const rec=wound(D,D.at(20).v,hit.p,hit.d,R);if(rec.dmg.femorale1?.cut>.3||rec.dmg['femorale-1']?.cut>.3)got=rec;}
  if(got){for(const care of [0,20,60]){const h=newHealth();applyWound(h,got,()=>.99,'balle');let t=0;for(;t<900&&h.state!=='mort';t+=1){if(care&&t===care)treat(h,2);tickHealth(h,1);}
    say(`  fémorale coupée, garrot ${care?'après '+care+' s':'jamais'} : ${h.state==='mort'?'mort après '+t+' s ('+h.cause+')':`vivant, ${Math.round(h.blood)}/${BLOOD} mL`}`);}}
  else say('  (pas trouvé de tir sur la fémorale)');}

if(on(5)){say('\n=== banc 5 : fusillades — six contre six, à découvert ou derrière un mur ===');
  for(const [dist,cover,label] of [[5,false,'20 m, à découvert'],[15,false,'60 m, à découvert (ils s’approchent)'],[8,true,'32 m, les Meumeu derrière un mur']]){let tot={mm:0,mb:0,hm:0,hb:0,shots:0,t:[],wounds:0};const N=4;
    for(let rep=0;rep<N;rep++){const W=new World(4+rep);W.s.beee.warDay=1;W.s.beee.nextWave=1e9;W.s.beee.nextAir=1e9;const cap=W.capital();const at=field(W,cap.i,cap.j,dist+2,8);if(!at){say('  pas de terrain');break;}
      // on écarte les autres
      W.s.units=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois'&&false);W.uIndex=new Map();
      const [i0,j0]=at;const us=[],bs=[];for(let n=0;n<6;n++){us.push(W.addUnit('meumeu','soldat',i0+.5,j0+1+n*.9,{rounds:200}));bs.push(W.addUnit('beee','soldat',i0+dist+.5,j0+1+n*.9,{rounds:200}));}
      for(const u of us){u.task={kind:'guard',tx:u.x,ty:u.y};W.face(u,1,0);}for(const u of bs){u.task={kind:'guard',tx:u.x,ty:u.y};W.face(u,-1,0);}
      if(cover){const cells=[];for(let n=0;n<8;n++)cells.push([i0+1,j0+n]);W.planLine('meumeu','mur',cells);for(const [i,j] of cells){const k=j*MAP_N+i;if(W.s.walls[k])W.lineBuilt('mur',k);}}
      let first=null;const t0=W.t;for(let t=0;t<2;t+=.02){W.update(.02);for(const e of W.events.splice(0)){if(e.type==='shot')tot.shots++;if(e.type==='wound'){tot.wounds++;if(first==null)first=W.t-t0;}}}
      const st=(L)=>({mort:L.filter(u=>u.hp<=0).length,hors:L.filter(u=>u.hp>0&&u.h.state==='hors').length});const a=st(us),b=st(bs);tot.mm+=a.mort;tot.hm+=a.hors;tot.mb+=b.mort;tot.hb+=b.hors;if(first!=null)tot.t.push(first*4);}
    say(`  ${label} (${N} fois, 8 s de combat) : ${Math.round(tot.shots/N)} coups tirés, ${fmt(tot.wounds/N,1)} touchés · Meumeu : ${fmt(tot.mm/N,1)} morts, ${fmt(tot.hm/N,1)} à terre · Bèè : ${fmt(tot.mb/N,1)} morts, ${fmt(tot.hb/N,1)} à terre · premier touché après ${tot.t.length?fmt(tot.t.reduce((a,b)=>a+b,0)/tot.t.length,1)+' s':'—'}`);}}

if(on(6)){say('\n=== banc 6 : grenades, obus, bombes — ce que font les éclats ===');
  for(const kind of ['grenade','obus','bombe']){const W=new World(4);W.s.beee.warDay=1;const cap=W.capital();const at=field(W,cap.i,cap.j,12,12);const [i0,j0]=at;W.s.units=[];W.uIndex=new Map();
    const ring=[];for(const r of [.1,.25,.5,1,1.5,2]){for(let n=0;n<8;n++){const a=n/8*6.283;const u=W.addUnit('meumeu','soldat',i0+6+Math.cos(a)*r,j0+6+Math.sin(a)*r);u.r=r;u.task={kind:'guard',tx:u.x,ty:u.y};ring.push(u);}}
    W.blast(i0+6,j0+6,kind,'beee',null,1);const by={};for(const u of ring){const o=by[u.r]??={mort:0,hors:0,blesse:0,ok:0};const s=u.hp<=0?'mort':u.h.state;o[s==='ok'?'ok':s]++;}
    say(`  ${kind} : ${Object.entries(by).map(([r,o])=>`à ${fmt(r*TILE_M,1)} m : ${o.mort} morts, ${o.hors} à terre, ${o.blesse} blessés, ${o.ok} indemnes`).join(' · ')}`);}}

if(on(7)){say('\n=== banc 7 : les soins — un infirmier, un hôpital ===');
  const W=new World(4);W.s.beee.warDay=1;W.s.beee.nextWave=1e9;const cap=W.capital();const at=free(W,'hopital',cap.i+2,cap.j+2,6,16);const hop=put(W,'meumeu','hopital',at[0],at[1]);
  // des blessures choisies : on tire au hasard jusqu'à toucher ce qu'on veut, sans tuer
  const R=rng(5);const D=W.W('bee_fusil');const WANT=[['fémorale','femorale1',d=>d.cut>.3],['poumon','poumonD',d=>d.crush>0],['foie','foie',d=>d.crush>0],['tibia','tibia-1',d=>d.frac],['bras','humerus1',d=>d.frac],['cuisse','cuisse-1',d=>d.crush>0]];
  const vic=[];for(const [label,key,ok] of WANT){const u=W.addUnit('meumeu','soldat',cap.i+8+vic.length*.6,cap.j+8);u.label=label;
    for(let k=0;k<20000;k++){const hit=W.bodyRay([(R()-.5)*.21,R()*.3,2],[0,0,-1],0,'debout');if(!hit)continue;const rec=wound(D,D.at(30).v,hit.p,hit.d,R);if(!rec.dmg[key]||!ok(rec.dmg[key]))continue;
      const h=newHealth();applyWound(h,rec,()=>.99,'balle');if(h.state==='mort')continue;u.h=h;break;}vic.push(u);}
  const med=W.addUnit('meumeu','infirmier',cap.i+6,cap.j+6);const before=vic.map(u=>`${u.label} : ${u.h.state}, ${fmt(bleedRate(u.h),2)} mL/s`);
  const where=u=>`${u.label} ${u.hp<=0?'MORT ('+u.h.cause+')':hop.wardList?.includes(u)?'à l’hôpital':u.h.state+(u.h.bleeds.some(b=>b.tq)?' (garrot)':'')}`;
  const ev=count(W,.5);say(`  six blessés : ${before.join(' ; ')}\n  2 s plus tard : ${vic.map(where).join(' · ')} · soins ${ev.treated||0}`);
  const ev2=count(W,6);say(`  6 h plus tard : ${vic.map(where).join(' · ')} · soins ${(ev.treated||0)+(ev2.treated||0)} · trousses restantes ${med.kits}`);
  run(W,72);say(`  trois jours plus tard : ${vic.map(where).join(' · ')}`);}

if(on(8)){say('\n=== banc 8 : les munitions — arsenal, manufacture, caserne ===');
  const W=new World(4);const cap=W.capital();Object.assign(cap.stock,{fer:60,sels:30,plomb:60,cuivre:40,poudre:40,salpetre:30,pieces:80,bois:300,pierre:200,vivres:300,charbon:80,'m:mle1':0,'a:mle1':0});
  const ars=put(W,'meumeu','arsenal',...free(W,'arsenal',cap.i+2,cap.j+2,6,14));const ars2=put(W,'meumeu','poudrerie',...free(W,'poudrerie',cap.i+2,cap.j+2,6,14));const man=put(W,'meumeu','manufacture',...free(W,'manufacture',cap.i+2,cap.j+2,6,15));const cas=put(W,'meumeu','caserne',...free(W,'caserne',cap.i+2,cap.j+2,6,16));
  W.setProduct(ars2,'explosifs');
  const vil=W.s.units.filter(u=>u.f==='meumeu');W.order(vil.slice(0,2).map(u=>u.id),{type:'building',id:ars.id});W.order(vil.slice(2,4).map(u=>u.id),{type:'building',id:ars2.id});W.order(vil.slice(4,8).map(u=>u.id),{type:'building',id:man.id});
  const f0=cap.stock.fer,p0=cap.stock.plomb,c0=cap.stock.charbon;run(W,24);const have=W.have('meumeu',cap.i+2,cap.j+2);
  say(`  un jour : ${fmt(have['m:mle1']||0,1)} caisses de munitions Mle 1 (plafond ${ars.limit}), ${fmt(have.explosifs||0,1)} explosifs (plafond ${ars2.limit}), ${fmt(have['a:mle1']||0)} fusils (plafond ${man.limit}) · plomb consommé ${fmt(p0-cap.stock.plomb,1)} · charbon brûlé ${fmt(c0-cap.stock.charbon,1)} · arsenal : ${ars.why||'au travail'} · manufacture : ${man.why||'au travail'}`);
  const q=[];for(let n=0;n<4;n++)q.push(W.train(cas,'soldat','mle1'));run(W,14);const sol=W.s.units.filter(u=>u.k==='soldat');
  say(`  former quatre soldats : ${q.map(r=>r.ok?'ok':r.why[0]).join(', ')} · ${sol.length} soldats, ${sol.map(u=>u.pouch+u.mag).join('/')} coups chacun`);
  // une nouvelle arme : prototype, outillage de la manufacture (elle change de modèle), fabrication
  const bur=put(W,'meumeu','armurerie',...free(W,'armurerie',cap.i+2,cap.j+2,6,18));const p={d:2.2,l:8,nose:'pointue',base:'bt',cons:'fmj',c:.05,L:180,twist:60,action:'semi',rof:600,mag:10,heavy:false};
  Object.assign(cap.stock,{fer:80,sels:30,plomb:60,cuivre:40,poudre:40,pieces:80,charbon:80});
  const pr=W.propose(bur,'Fusil Mle 2',p);run(W,16);const d=W.design(pr.id);const r1=W.setProduct(man,'a:'+pr.id);const r2=W.setProduct(ars,'m:'+pr.id);run(W,30);const h2=W.have('meumeu',cap.i+2,cap.j+2);
  say(`  prototype Mle 2 : ${pr.ok?'lancé':pr.why} · ${d?.status} · ${r1.text} · outillé ${!!man.tooled[pr.id]} · ${fmt(h2['a:'+pr.id]||0)} fusils, ${fmt(h2['m:'+pr.id]||0,1)} caisses de munitions`);
  // sans charbon, les machines s'arrêtent
  cap.stock.charbon=0;ars.limit=0;run(W,3);say(`  plus de charbon, plafond levé : arsenal « ${ars.why} »`);
  // la manufacture tombe : sans autre manufacture ni archives, les plans sont perdus
  W.collapse(man);say(`  la manufacture tombe (seule, sans archives) : Mle 2 ${W.design(pr.id).status} · Mle 1 ${W.design('mle1').status}`);}

if(on(9)){say('\n=== banc 9 : la paix armée, puis la guerre — trente jours sans rien faire ===');
  const W=new World(5);const days=[];let ev={};const t0=performance.now();let firstShot=null;
  for(let t=0;t<30*DAY;t+=.25){W.update(.25);for(const e of W.events.splice(0)){ev[e.type]=(ev[e.type]||0)+1;if(e.type==='shot'&&firstShot==null)firstShot=W.day;if(e.type==='tension'||e.type==='war')days.push(`j${W.day}`);}}
  say(`  ${Math.round(performance.now()-t0)} ms · guerre prévue au jour ${W.s.beee.warDay} · annonces ${days.join(', ')} · premier coup de feu au jour ${firstShot} · vagues ${W.s.beee.waves} · raids ${ev['air-raid']||0} · tirs ${ev.shot||0} · blessures ${ev.wound||0} · morts ${ev.death||0} · Bèè ${W.s.units.filter(u=>u.f==='beee').length} · la capitale ${W.s.lost?'TOMBÉE au jour '+W.s.lost.day:'tient'}`);
  const js=W.save();const W2=new World(1);W2.load(js);W2.update(1);say(`  sauvegarde : ${Math.round(js.length/1024)} Ko, rechargée, ${W2.s.units.length} unités`);}

if(on(10)){say('\n=== banc 10 : une vague contre une capitale défendue ===');
  for(const def of [false,true]){const W=new World(4);W.s.beee.warDay=1;const cap=W.capital();
    if(def){for(let n=0;n<8;n++)W.addUnit('meumeu','soldat',cap.i+2+Math.cos(n)*4,cap.j+2+Math.sin(n)*4);W.addUnit('meumeu','infirmier',cap.i+2,cap.j+5);for(const [di,dj] of [[6,-3],[-4,6]]){const at=free(W,'tour',cap.i+di,cap.j+dj,0,6);if(at)put(W,'meumeu','tour',at[0],at[1]);}cap.stock['m:mle1']=20;}
    W.s.beee.nextWave=W.t+.1;W.s.beee.waves=2;const ev=count(W,48);const lostB=W.s.buildings.filter(b=>b.f==='meumeu'&&b.ruin).length;
    say(`  ${def?'défendue':'sans défense'} : ${ev.wave||0} vague · tirs ${ev.shot||0} · blessures ${ev.wound||0} · à terre ${ev.down||0} · morts ${ev.death||0} (dont Bèè ${W.s.corpses.filter(c=>c.f==='beee').length}) · Meumeu debout ${W.s.units.filter(u=>u.f==='meumeu'&&u.h?.state!=='hors').length} · bâtiments en ruine ${lostB} · capitale ${cap.ruin?'TOMBÉE':Math.round(cap.hp)+'/'+cap.max}`);}}
if(on(11)){say('\n=== banc 11 : un camp au bord de la forêt, six villageois qui récoltent ===');
  const W=new World(3);const cap=W.capital();const tree=W.s.nodes.filter(n=>n.type==='tree'&&n.left>1).sort((a,b)=>Math.hypot(a.i-cap.i,a.j-cap.j)-Math.hypot(b.i-cap.i,b.j-cap.j))[0];
  const at=free(W,'camp',tree.i,tree.j,2,8);const camp=put(W,'meumeu','camp',at[0],at[1]);const vil=W.s.units.filter(u=>u.f==='meumeu').slice(0,6);const r=W.order(vil.map(u=>u.id),{type:'building',id:camp.id});
  run(W,12);const s1={...camp.stock};camp.res='pierre';for(const u of W.workers(camp))u.hubNode=null;run(W,12);
  say(`  ${r.ok?r.text:r.why} · 12 h de bois : ${fmt(s1.bois||0)} bois, ${fmt(s1.pierre||0)} pierre, ${fmt(s1.vivres||0)} baies · puis 12 h de pierre : +${fmt((camp.stock.pierre||0)-(s1.pierre||0))} pierre · souches : ${W.s.nodes.filter(n=>n.type==='tree'&&n.left<1&&W.distB(camp,n.i,n.j)<10).length}`);}

if(on(12)){say('\n=== banc 12 : les idées des Meumeu ===');
  const W=new World(3);const cap=W.capital();const vil=W.s.units.filter(u=>u.f==='meumeu');const tree=W.s.nodes.filter(n=>n.type==='tree'&&n.left>1).sort((a,b)=>Math.hypot(a.i-cap.i,a.j-cap.j)-Math.hypot(b.i-cap.i,b.j-cap.j))[0];
  W.order(vil.map(u=>u.id),{type:'node',id:tree.id});const ev=count(W,48);const I=W.s.innov;
  say(`  deux jours de bûcheronnage à huit : ${fmt(I.prac.bois||0)} heures de pratique · idées : ${I.ideas.map(x=>`${x.id} (${x.who?.name||x.who})`).join(', ')||'aucune'}`);
  const lab=put(W,'meumeu','labo',...free(W,'labo',cap.i+2,cap.j+2,6,16));Object.assign(cap.stock,{fer:20,pieces:40,bois:300});const first=I.ideas[0];const r0=W.mod('gather_tree');const d=first?W.develop(first.id):{ok:false,why:['pas d’idée']};run(W,12);
  say(`  développer ${first?.id} : ${d.ok?'lancé':d.why} · adoptée : ${I.done.join(', ')||'non'} · coupe du bois ×${fmt(r0,2)} → ×${fmt(W.mod('gather_tree'),2)}`);}

if(on(13)){say('\n=== banc 13 : la chaîne des soins — le front, la tente, l’hôpital ===');
  const W=new World(4);W.s.beee.warDay=1;W.s.beee.nextWave=1e9;const cap=W.capital();const hop=put(W,'meumeu','hopital',...free(W,'hopital',cap.i+2,cap.j+2,6,16));
  const at=field(W,cap.i,cap.j,10,8);const [x0,y0]=at;const R=rng(9);const D=W.W('bee_fusil');const vic=[];
  const WANT=[['fémorale','femorale1',d=>d.cut>.3],['foie','foie',d=>d.crush>0],['poumon','poumonD',d=>d.crush>0],['panse','panse',d=>d.crush>0],['tibia','tibia-1',d=>d.frac],['cuisse','cuisse1',d=>d.crush>0]];
  for(const [label,key,ok] of WANT){const u=W.addUnit('meumeu','soldat',x0+3+vic.length*.8,y0+4);u.label=label;
    for(let k=0;k<30000;k++){const hit=W.bodyRay([(R()-.5)*.21,R()*.3,2],[0,0,-1],0,'debout');if(!hit)continue;const rec=wound(D,D.at(30).v,hit.p,hit.d,R);if(!rec.dmg[key]||!ok(rec.dmg[key]))continue;
      const h=newHealth();applyWound(h,rec,()=>.99,'balle');if(h.state==='mort')continue;u.h=h;break;}u.task={kind:'guard',tx:u.x,ty:u.y};vic.push(u);}
  const nurse=W.addUnit('meumeu','infirmier',x0+2,y0+2),nurse2=W.addUnit('meumeu','infirmier',x0+6,y0+2),doc=W.addUnit('meumeu','medecin',x0+4,y0+1);const t=W.pitchTent(doc);
  const where=u=>{if(u.hp<=0)return `${u.label} MORT (${u.h.cause})`;const b=W.s.buildings.find(b=>(b.wardList||[]).includes(u));return `${u.label} ${b?(b.k==='tente'?'tente':'hôpital'):u.h.state}${u.h.lost?.length?' (membre perdu)':''}`;};
  const e1=count(W,1);say(`  tente : ${t.ok?'plantée':t.why} · 1 h : ${vic.map(where).join(' · ')} · soins ${e1.treated||0}`);
  const e2=count(W,8);say(`  9 h : ${vic.map(where).join(' · ')} · soins ${e2.treated||0} · trousses : médecin ${doc.kits}, infirmiers ${nurse.kits}/${nurse2.kits}`);
  run(W,90);say(`  4 jours : ${vic.map(where).join(' · ')} · réformés : ${vic.filter(u=>u.amput).length}`);}
if(on(14)){say('\n=== banc 14 : toutes les munitions contre toutes les protections ===');
  const base={d:1.8,l:6.5,nose:'pointue',base:'plat',c:.032,L:140,twist:60,action:'verrou',rof:600,mag:5,heavy:false};
  const plates=[['soie 4 mm',{casque:['acier',0],plastron:['soie',4],dos:['soie',0],flancs:['soie',0]}],['acier 1,2 mm',{casque:['acier',0],plastron:['acier',1.2],dos:['acier',0],flancs:['acier',0]}],['céramique 3 mm',{casque:['acier',0],plastron:['ceramique',3],dos:['acier',0],flancs:['acier',0]}]];
  for(const [n,a] of plates){const A=deriveArmor(a);say(`  plastron ${n} : ${fmt(A.mass*1000,0)} g, vitesse ×${fmt(A.move,2)}`);}
  say('  munition (1,8 mm Mle 1, même charge) — à 20 m : ce qui arrête · ce qu’elle laisse dans un gel de 16 cm');
  for(const cons of Object.keys(CONSTRUCTIONS)){if(CONSTRUCTIONS[cons].minD)continue;const D=derive({...base,cons});const v=D.at(20).v;const g=gel(D,v,rng(3));
    const st=plates.map(([n,a])=>{const r=stopsAt(deriveArmor(a),D,20).plastron;return `${n.split(' ')[0]} ${r.stops?'arrête':'passe'}`;}).join(', ');
    say(`  ${CONSTRUCTIONS[cons].name} : ${Math.round(D.v0)} m/s${D.pel>1?` × ${D.pel}`:''} · perce ${fmt(D.pen(v),2)} mm · ${st} · gel ${fmt(g.E,1)} J${g.fragmented?' (fragmentée)':''}`);}
  const W=new World(4);W.s.beee.warDay=1;W.s.beee.nextWave=1e9;const cap=W.capital();const at=field(W,cap.i,cap.j,14,4);W.s.units=[];W.uIndex=new Map();
  W.s.designs.fap={id:'fap',f:'meumeu',name:'Fusil à plombs',status:'adopte',p:{d:4,l:6,nose:'ronde',base:'plat',cons:'chevrotine',c:.05,L:120,twist:200,action:'semi',rof:600,mag:5,heavy:false}};
  for(const dist of [.5,1.25,2.5,5]){let hits=0,shots=0,down=0;for(let rep=0;rep<40;rep++){const u=W.addUnit('meumeu','soldat',at[0]+.5,at[1]+1.5,{w:'fap',rounds:50});const e=W.addUnit('beee','soldat',at[0]+.5+dist,at[1]+1.5,{armor:null});
      W.face(u,1,0);W.face(e,-1,0);const Wd=W.W('fap');const share={};let hit=0;for(let k=0;k<Wd.pel;k++){const r=W.resolve(u,e,Wd,dist*4,0,share);if(r.hit&&!r.stopped){hit++;applyWound(e.h,r.rec,R0,'balle');}}shots++;hits+=hit;if(e.h.state==='hors'||e.h.state==='mort')down++;W.s.units=[];}
    say(`  chevrotine (4 mm, 9 plombs) à ${dist*4} m : ${fmt(hits/shots,1)} plombs touchent · hors de combat ou mort du premier coup : ${Math.round(down/shots*100)} %`);}}
if(on(15)){say('\n=== banc 15 : la chaîne complète — filons, mines, atelier, dépôts, fret à la demande, trains, priorités ===');
  const W=new World(3);const cap=W.capital();const [ci,cj]=W.bc(cap);
  const ore=res=>W.s.nodes.filter(n=>n.type==='ore'&&n.res===res).sort((a,b)=>Math.hypot(a.i-ci,a.j-cj)-Math.hypot(b.i-ci,b.j-cj))[0];
  const coal=ore('charbon'),clay=ore('fer');say(`  charbon à ${Math.round(Math.hypot(coal.i-ci,coal.j-cj))} cases, fer à ${Math.round(Math.hypot(clay.i-ci,clay.j-cj))} cases de la capitale`);
  // à chaque filon : un camp (dépôt gratuit) posé par des villageois, puis une mine rattachée à ce camp
  const vil=W.s.units.filter(u=>u.f==='meumeu');const campAt=nd=>{for(let r=5;r<11;r++)for(let a=0;a<24;a++){const i=Math.round(nd.i+Math.cos(a/24*6.283)*r),j=Math.round(nd.j+Math.sin(a/24*6.283)*r);if(W.canPlace('meumeu','camp',i,j).ok)return [i,j];}return null;};
  const c1=W.place('meumeu','camp',...campAt(coal)).b,c2=W.place('meumeu','camp',...campAt(clay)).b;W.order(vil.slice(0,2).map(u=>u.id),{type:'building',id:c1.id});W.order(vil.slice(2,4).map(u=>u.id),{type:'building',id:c2.id});run(W,8);
  say(`  camps : ${c1.done?'bâti':'chantier '+Math.round(c1.progress*100)+' %'}, ${c2.done?'bâti':'chantier '+Math.round(c2.progress*100)+' %'}`);
  const m1=W.place('meumeu','mine',coal.i,coal.j),m2=W.place('meumeu','mine',clay.i,clay.j);say(`  mines posées : ${m1.ok?'charbon':m1.why[0]}, ${m2.ok?'fer':m2.why[0]} · approvisionnées par ${W.depotName(W.building(m1.b?.site))}`);
  W.order(vil.slice(0,2).map(u=>u.id),{type:'building',id:m1.b.id});W.order(vil.slice(2,4).map(u=>u.id),{type:'building',id:m2.b.id});
  // des porteurs : au centre-ville et à chaque camp
  for(let n=0;n<3;n++)W.train(cap,'villageois');run(W,13);W.addPorters(cap,1);W.addPorters(c1,1);W.addPorters(c2,1);run(W,13);
  say(`  mines : ${m1.b.done?'bâtie':'chantier '+Math.round(m1.b.progress*100)+' % '+(m1.b.why||'')}, ${m2.b.done?'bâtie':'chantier '+Math.round(m2.b.progress*100)+' % '+(m2.b.why||'')} · livrent à : ${W.depotName(W.building(m1.b.out))}, ${W.depotName(W.building(m2.b.out))}`);
  for(const [m,us] of [[m1.b,vil.slice(0,2)],[m2.b,vil.slice(2,4)]])W.order(us.map(u=>u.id),{type:'building',id:m.id});
  // un atelier près de la capitale, approvisionné par la capitale : il commande fer, bois et charbon, fait des pièces
  cap.stock.pierre=(cap.stock.pierre||0)+100;   // la pierre vient d'une mine de pierre, pas encore posée ici
  const at=free(W,'atelier',cap.i+2,cap.j+2,6,14);const br=W.place('meumeu','atelier',...at).b;W.order(vil.slice(4,7).map(u=>u.id),{type:'building',id:br.id});run(W,10);
  W.order(vil.slice(4,7).map(u=>u.id),{type:'building',id:br.id});cap.stock.pieces=0;const b0=0;run(W,36);
  const carts=W.s.vehicles.filter(v=>v.k==='porteur');
  say(`  36 h : atelier ${br.done?(br.why||'au travail'):'chantier '+Math.round(br.progress*100)+' % '+(br.why||'')+' · bâtisseurs '+W.s.units.filter(u=>u.task?.b===br.id).length} · commande de l’atelier : ${JSON.stringify(Object.fromEntries(Object.entries(W.factoryNeed(br)||{}).map(([k,v])=>[k,+v.toFixed(1)])))} · pièces à la capitale ${fmt(b0)} → ${fmt(cap.stock.pieces||0)} · fer à la capitale ${fmt(cap.stock.fer||0,1)} · charbon ${fmt(cap.stock.charbon||0,1)} · porteurs : ${carts.map(v=>`${W.depotName(W.building(v.base))} ${v.trips||0}${v.why?' ('+v.why+')':''}`).join(', ')}`);
  // les priorités : un dépôt en urgence (5) passe avant les autres et peut prendre ce que la capitale garde pour elle
  const e=put(W,'meumeu','entrepot',...free(W,'entrepot',cap.i+2,cap.j+2,8,14));e.stock={};W.setWant(e,'pieces',20);W.setPrio(e,5);run(W,8);
  say(`  un entrepôt en urgence qui demande 20 pièces : ${fmt(e.stock.pieces||0,1)} arrivées en 8 h`);
  // les trains : deux gares sur une voie, un arsenal qui s'approvisionne au bout de la ligne ; un train à la demande
  const W2=new World(3);const g=W2.capital();Object.assign(g.stock,{bois:3000,pierre:2000,pieces:500,charbon:200,fer:200});
  let row=null;for(let dj=-6;dj<=8&&row==null;dj++){const j=g.j+dj;let ok=true;for(let i=g.i+6;i<g.i+44;i++){const k=j*MAP_N+i;if(!(W2.G.terrain[k]>=T.sand&&W2.G.terrain[k]<=T.scrub)||W2.occ[k]>=0){ok=false;break;}}if(ok)row=j;}
  if(row==null){say('  pas de rangée libre pour la voie de test');}else{
    const cells=W2.lineCells(g.i+6,row,g.i+43,row);W2.planLine('meumeu','rail',cells);for(const k of Object.keys(W2.s.rails))W2.lineBuilt('rail',+k);
    const g1=put(W2,'meumeu','gare',g.i+7,row-2),g2=put(W2,'meumeu','gare',g.i+38,row-2);Object.assign(g1.stock,{fer:40,plomb:40,cuivre:30,poudre:30,pieces:30,charbon:30});
    const ars=put(W2,'meumeu','arsenal',g.i+39,row-7);W2.setLink(ars,'sup',g2.id);W2.setLink(ars,'out',g2.id);const vs=W2.s.units.filter(u=>u.f==='meumeu');W2.order(vs.slice(0,2).map(u=>u.id),{type:'building',id:ars.id});
    const tq=W2.train(g1,'train');run(W2,40);const tr=W2.s.vehicles.find(v=>v.k==='train');
    say(`  train à la demande sur ${cells.length} cases : ${tq.ok?'construit':tq.why[0]} · ${tr?.trips||0} voyages · plomb au bout ${fmt(g2.stock.plomb||0,1)} · munitions faites ${fmt(g2.stock['m:mle1']||0,1)} · tender ${fmt(tr?.coal||0,1)} · arsenal ${ars.why||'au travail'}`);}}

say(`\n(${Math.round(performance.now()-T0)} ms)`);
