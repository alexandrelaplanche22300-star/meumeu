// Les sacs de sable. Critères (écrits avant) :
//  1. une ligne de 12 cases tracée, 3 villageois : toute la ligne est posée en 6 h de jeu, le coût (pierre + bois) est payé ;
//  2. le couvert : des tireurs derrière une ligne de sacs reçoivent au plus 70 % des blessures qu'à découvert (même combat, 6 graines) ;
//  3. un obus qui explose dessus la détruit (lineBroken) ; une sauvegarde les reprend.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {LINES,T}=await import('../js/data.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
// 1
{const W=new World(21);const cap=W.capital();const [ci,cj]=[cap.i+2,cap.j+8];const cells=[];for(let n=0;n<12;n++)cells.push([ci+n,cj]);
  const d=W.depots('meumeu',ci,cj)[0];d.stock.pierre=100;d.stock.bois=100;const p0=d.stock.pierre,b0=d.stock.bois;
  const r=W.planLine('meumeu','sacs',cells);const vil=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,3);
  W.order(vil.map(u=>u.id),{type:'sacs',k:cells[0][1]*W.N+cells[0][0]});
  for(let h=0;h<6;h++)for(let k=0;k<60;k++)W.update(1/60);
  const built=Object.values(W.s.sacs).filter(o=>o.b).length;const paid=(p0-d.stock.pierre)+(b0-d.stock.bois);
  check('1. ligne tracée',r.ok&&r.n===12,`${r.n} cases`);check('1. ligne posée en 6 h',built===12,`${built}/12`);check('1. coût payé',paid>=10,`${(p0-d.stock.pierre).toFixed(1)} pierre, ${(b0-d.stock.bois).toFixed(1)} bois`);
  // 3
  const k0=cells[5][1]*W.N+cells[5][0];if(W.s.sacs[k0]?.b){W.lineBroken('sacs',k0);check('3. case détruite',!W.s.sacs[k0]);}
  const data=W.serialize();const W2=new World(1).restore(data);check('3. sauvegarde : les sacs sont repris',Object.values(W2.s.sacs).filter(o=>o.b).length===built-1);}
// 2
{let hitO=0,hitS=0;for(let seed=31;seed<37;seed++)for(const withSacs of [false,true]){const W=new World(seed);W.s.beee.warDay=1;W.s.beee.nextWave=1e9;W.s.beee.nextAir=1e9;W.declareWar?.('beee');W.s.fauna=[];const cap=W.capital();
    let at=null;for(let r=10;r<80&&!at;r++)for(let a=0;a<24&&!at;a++){const i=Math.round(cap.i+Math.cos(a/24*6.283)*r),j=Math.round(cap.j+Math.sin(a/24*6.283)*r);let f=true;for(let dj=0;dj<10&&f;dj++)for(let di=0;di<40&&f;di++){const t=W.G.terrain[(j+dj)*W.N+i+di];if(!(t>=T.grass&&t<=T.dirt)||W.occ[(j+dj)*W.N+i+di]>=0||W.nodeAt[(j+dj)*W.N+i+di]>=0)f=false;}if(f)at=[i,j];}
    if(!at)continue;const [i0,j0]=at;W.s.units=[];W.uIndex=new Map();
    const us=[];for(let n=0;n<6;n++)us.push(W.addUnit('meumeu','soldat',i0+2,j0+2+n*1.2,{rounds:200}));
    if(withSacs){const cells=[];for(let n=0;n<8;n++)cells.push([i0+3,j0+1+n]);W.planLine('meumeu','sacs',cells);for(const c of cells){const k=c[1]*W.N+c[0];W.s.sacs[k].paid=1;W.lineBuilt('sacs',k);}}
    const sq=W.formSquad(us.map(u=>u.id));for(const u of us){u.task={kind:'guard',tx:u.x,ty:u.y};W.face(u,1,0);}
    const bs=[];for(let n=0;n<6;n++)bs.push(W.addUnit('beee','soldat',i0+14,j0+2+n*1.2,{rounds:200}));const camp=W.addBuilding('meumeu','camp',i0+6,j0+9,true);camp.stock={bois:100};W.makeBand(bs,camp,{x:i0+4,y:j0+5});
    for(let t=0;t<24;t+=.02)W.update(.02);   // 24 h de jeu = ~96 s de combat
    const wounded=us.filter(u=>u.hp<=0||u.h?.state!=='ok').length;if(withSacs)hitS+=wounded;else hitO+=wounded;}
  check('2. couvert : blessés derrière les sacs ≤ 70 % de ceux à découvert',hitS<=Math.ceil(hitO*.7),`à découvert ${hitO}, derrière les sacs ${hitS} (6 graines × 6 tireurs)`);}
console.log(ok?'\nTOUT PASSE':'\nIL Y A DES ÉCHECS');
// ---- les fosses et boyaux (V12.5). Critères (écrits avant) : une ligne de 10 cases, 3 villageois : creusée en 6 h pour du bois seulement ; des tireurs dedans
//  reçoivent au plus 60 % des blessures de ceux à découvert (6 graines) ; sacs et fosses ne se mélangent pas dans un même tracé annulé.
{const W=new World(21);const cap=W.capital();const [ci,cj]=[cap.i+2,cap.j+9];const cells=[];for(let n=0;n<10;n++)cells.push([ci+n,cj]);
  const d=W.depots('meumeu',ci,cj)[0];d.stock.pierre=100;d.stock.bois=100;const p0=d.stock.pierre,b0=d.stock.bois;
  const r=W.planLine('meumeu','fosses',cells);const vil=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,3);
  W.order(vil.map(u=>u.id),{type:'sacs',k:cells[0][1]*W.N+cells[0][0]});
  for(let h=0;h<6;h++)for(let k=0;k<60;k++)W.update(1/60);
  const built=Object.values(W.s.sacs).filter(o=>o.b&&o.t==='fosses').length;
  check('4. fosses : tracé accepté',r.ok&&r.n===10);check('4. fosses : creusées en 6 h',built===10,`${built}/10`);check('4. fosses : du bois seulement, pas de pierre',p0===d.stock.pierre&&b0-d.stock.bois>=3,`${(b0-d.stock.bois).toFixed(1)} bois, ${(p0-d.stock.pierre).toFixed(1)} pierre`);
  // un tracé de sacs voisin n'est pas annulé quand on annule les fosses
  W.planLine('meumeu','sacs',[[ci,cj+3],[ci+1,cj+3]]);const before=Object.values(W.s.sacs).filter(o=>!o.b&&o.t==='sacs').length;W.cancelLine('meumeu','fosses',(cj+3)*W.N+ci);check('4. annuler des fosses ne touche pas les sacs',Object.values(W.s.sacs).filter(o=>!o.b&&o.t==='sacs').length===before&&before===2);}
{let hitF=0,hitO=0;for(let seed=31;seed<37;seed++)for(const withF of [false,true]){const W=new World(seed);W.s.beee.warDay=1;W.s.beee.nextWave=1e9;W.s.beee.nextAir=1e9;W.declareWar?.('beee');W.s.fauna=[];const cap=W.capital();
    let at=null;for(let r=10;r<80&&!at;r++)for(let a=0;a<24&&!at;a++){const i=Math.round(cap.i+Math.cos(a/24*6.283)*r),j=Math.round(cap.j+Math.sin(a/24*6.283)*r);let f=true;for(let dj=0;dj<10&&f;dj++)for(let di=0;di<40&&f;di++){const t=W.G.terrain[(j+dj)*W.N+i+di];if(!(t>=T.grass&&t<=T.dirt)||W.occ[(j+dj)*W.N+i+di]>=0||W.nodeAt[(j+dj)*W.N+i+di]>=0)f=false;}if(f)at=[i,j];}
    if(!at)continue;const [i0,j0]=at;W.s.units=[];W.uIndex=new Map();
    const us=[];for(let n=0;n<6;n++)us.push(W.addUnit('meumeu','soldat',i0+2.5,j0+1.5+n*1.2,{rounds:200}));
    if(withF){const cells=[];for(let n=0;n<8;n++)cells.push([i0+2,j0+1+n]);W.planLine('meumeu','fosses',cells);for(const c of cells){const k=c[1]*W.N+c[0];W.s.sacs[k].paid=1;W.lineBuilt('fosses',k);}}
    const sq=W.formSquad(us.map(u=>u.id));for(const u of us){u.task={kind:'guard',tx:u.x,ty:u.y};W.face(u,1,0);}
    const bs=[];for(let n=0;n<6;n++)bs.push(W.addUnit('beee','soldat',i0+14,j0+2+n*1.2,{rounds:200}));const camp=W.addBuilding('meumeu','camp',i0+6,j0+9,true);camp.stock={bois:100};W.makeBand(bs,camp,{x:i0+4,y:j0+5});
    for(let t=0;t<24;t+=.02)W.update(.02);
    const wounded=us.filter(u=>u.hp<=0||u.h?.state!=='ok').length;if(withF)hitF+=wounded;else hitO+=wounded;}
  check('4. fosses : blessés ≤ 60 % de ceux à découvert',hitF<=Math.ceil(hitO*.6),`à découvert ${hitO}, dans les fosses ${hitF}`);}
console.log(ok?'\nTOUT PASSE (fosses comprises)':'\nIL Y A DES ÉCHECS (fosses)');
