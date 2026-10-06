// mesure (pas un test) : ce que fait une charge — Bèè debout / couchés par distance, bâtiments par nombre de coups, abris pleins
globalThis.document??={getElementById:()=>({textContent:''})};
const {World}=await import('../js/world.js');const {CARTE}=await import('./_engins_types.mjs');const {BUILDINGS}=await import('../js/data.js');
const SEED=+(process.argv[2]||101),TR=+(process.argv[3]||12);const W0=new World(SEED,CARTE);if(!W0.atWar)W0.declareWar('meumeu');W0.s.fog=false;
const snap=W0.serialize();const fresh=()=>{const W=new World(SEED,CARTE);W.restore(snap);return W;};
const open=(W)=>{const c=W.capital();for(let r=40;r<200;r++)for(let a=0;a<32;a++){const x=Math.floor(c.i+Math.cos(a/32*6.283)*r)+.5,y=Math.floor(c.j+Math.sin(a/32*6.283)*r)+.5;let ok=true;
  for(let dj=-6;ok&&dj<=6;dj++)for(let di=-6;ok&&di<=6;di++){const k=(Math.floor(y)+dj)*W.N+Math.floor(x)+di;ok=W.occ[k]<0&&!W.s.buildings.some(b=>W.distB(b,x+di,y+dj)<1);}if(ok)return [x,y];}};
const DIST=[1,2,3,4,6,8,12,16,20];
for(const id of ['canon_mle1','fusees_mle1']){const D=W0.W(id);const E=D.he;
  for(const post of ['debout','couche']){const res=DIST.map(()=>({mort:0,hors:0,blesse:0,n:0}));
    for(let tr=0;tr<TR;tr++){const W=fresh();const [x,y]=open(W);const us=[];
      DIST.forEach((d,i)=>{for(let k=0;k<4;k++){const a=(k/4+i*.07+tr*.13)*6.283;const u=W.addUnit('beee','soldat',x+Math.cos(a)*d/4,y+Math.sin(a)*d/4,{});u.post=post;us.push([i,u]);}});
      W.heBlast(x,y,E,'meumeu',null,{kind:'obus',w:id});
      for(const [i,u] of us){const r=res[i];r.n++;const st=u.hp<=0||u.h?.state==='mort'?'mort':u.h?.state==='hors'?'hors':(u.h?.wounds||[]).length?'blesse':null;if(st)r[st]++;}}
    console.log(`${id} (${D.p.d} mm, ${(E.W*1000).toFixed(1)} g TNT) · ${post}`);
    console.log('   m   '+DIST.map(d=>String(d).padStart(5)).join(''));
    for(const k of ['mort','hors','blesse'])console.log(`  ${k.padEnd(6)}`+res.map(r=>String(Math.round(r[k]/r.n*100)).padStart(4)+'%').join(''));}}
// les bâtiments : combien d'obus de 36 mm au milieu pour une ruine ; le feu
{const E=W0.W('canon_mle1').he;const ks=['maison','atelier','caserne','entrepot','centre','tour'];const line=[];
  for(const k of ks){let shots=0,fire=0,tot=0;for(let tr=0;tr<Math.max(3,TR/4);tr++){const W=fresh();const [x,y]=open(W);const [w,h]=BUILDINGS[k].size;const b=W.addBuilding('beee',k,Math.floor(x)-1,Math.floor(y)-1,true);b.f='beee';
      let n=0;while(!b.ruin&&n<200){W.heBlast(b.i+w/2+(W.rand()-.5)*w*.6,b.j+h/2+(W.rand()-.5)*h*.6,E,'meumeu',null,{kind:'obus',w:'canon_mle1'});n++;if(b.fire>0&&!b.ruin)fire++;}shots+=n;tot++;}
    line.push(`${k} ${(shots/tot).toFixed(1)} obus (hp ${BUILDINGS[k].hp})`);}
  console.log('bâtiments (obus de 36 mm tombés sur le toit) : '+line.join(' · '));}
// un abri plein : une maison bèè avec 5 villageois dedans, des obus jusqu'à la ruine
{const E=W0.W('canon_mle1').he;let dead=0,hurt=0,n=0;for(let tr=0;tr<TR;tr++){const W=fresh();const [x,y]=open(W);const b=W.addBuilding('beee','maison',Math.floor(x)-1,Math.floor(y)-1,true);
  const vs=[];for(let k=0;k<5;k++){const u=W.addUnit('beee','villageois',x,y,{});W.s.units.splice(W.s.units.indexOf(u),1);W.uIndex.delete(u.id);(b.hide??=[]).push(u);vs.push(u);}
  let q=0;while(!b.ruin&&q<200){W.heBlast(b.i+1,b.j+1,E,'meumeu',null,{kind:'obus',w:'canon_mle1'});q++;}
  for(const u of vs){n++;if(u.hp<=0||u.h?.state==='mort')dead++;else if(u.h&&u.h.state!=='ok')hurt++;}}
  console.log(`abri plein (maison bèè, 5 villageois, obus jusqu’à la ruine) : morts ${Math.round(dead/n*100)} % · blessés ${Math.round(hurt/n*100)} %`);}
