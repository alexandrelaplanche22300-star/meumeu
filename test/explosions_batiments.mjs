// V12.8 · les obus et ceux qui sont DANS les bâtiments (abris, casernes) — demande du joueur : « les explosions ne sont pas assez brutales et létales ».
// MESURÉ AVANT (test/_mesure_explosions.mjs, graine 101, carte V2) : à découvert, l'obus de 36 mm tue 100 % jusqu'à 4 m, met hors de combat 94 % à 8 m
// et 46 % à 12 m (couché : à peu près pareil) ; une maison ou un atelier tombe au premier obus, une caserne au deuxième, le centre-ville au quatrième.
// MAIS : une maison bèè pleine (5 villageois à l'abri), bombardée jusqu'à la ruine — 0 % de morts, 0 % de blessés. Les occupants (abri, caserne,
// hôpital, aérodrome) étaient hors d'atteinte des obus, et l'effondrement les relâchait indemnes (ou laissait les recrues dans la ruine).
// CRITÈRES (fixés avant de lancer) :
//   O1 un abri plein (maison bèè, 5 villageois) bombardé jusqu'à la ruine : ≥ 50 % morts ou hors de combat (avant : 0 %)
//   O2 un seul obus sur une caserne bèè de 10 recrues : au moins une recrue touchée en moyenne (avant : 0)
//   O3 une caserne de 10 recrues bombardée jusqu'à la ruine : personne ne reste dans la ruine, les vivants sont sur la carte ; morts entre 15 et 60 %
//   O4 un bunker plein : un obus dessus touche au plus le quart de ce qu'il touche dans une maison
//   O5 chaque blessure reçue dans un bâtiment a sa radiographie (événement wound avec inB, un trajet) ; le souffle enfermé, un événement blast
//   node test/explosions_batiments.mjs [graine] [essais]
globalThis.document??={getElementById:()=>({textContent:''})};
const {World}=await import('../js/world.js');const {CARTE}=await import('./_engins_types.mjs');const {BUILDINGS}=await import('../js/data.js');
const SEED=+(process.argv[2]||101),TR=+(process.argv[3]||8);let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const W=new World(SEED,CARTE);if(!W.atWar)W.declareWar('meumeu');W.s.fog=false;const E=W.W('canon_mle1').he;
// des places libres, loin les unes des autres (une par essai)
const used=[];const spot=(w,h)=>{const c=W.capital();for(let r=40;r<400;r+=3)for(let a=0;a<48;a++){const x=Math.floor(c.i+Math.cos(a/48*6.283)*r),y=Math.floor(c.j+Math.sin(a/48*6.283)*r);if(used.some(([u,v])=>Math.hypot(u-x,v-y)<24))continue;
  let ok=true;for(let dj=-3;ok&&dj<h+3;dj++)for(let di=-3;ok&&di<w+3;di++){const k=(y+dj)*W.N+x+di;ok=k>=0&&W.occ[k]<0&&W.G.terrain[k]!=null&&!W.s.buildings.some(b=>W.distB(b,x+di,y+dj)<1);}if(ok){used.push([x,y]);return [x,y];}}return null;};
const hideIn=(b,k,n,list)=>{const out=[];const [w,h]=W.sizeOf(b);for(let q=0;q<n;q++){const u=W.addUnit('beee',k,b.i+w/2,b.j+h/2,{});W.s.units.splice(W.s.units.indexOf(u),1);W.uIndex.delete(u.id);(b[list]??=[]).push(u);out.push(u);}return out;};
const shell=b=>{const [w,h]=W.sizeOf(b);W.heBlast(b.i+w/2+(W.rand()-.5)*w*.5,b.j+h/2+(W.rand()-.5)*h*.5,E,'meumeu',null,{kind:'obus',w:'canon_mle1'});};
const st=u=>u.hp<=0||u.h?.state==='mort'?'mort':u.h?.state==='hors'?'hors':(u.h?.wounds||[]).length?'blesse':'ok';
const evs=[];const grab=()=>{for(const e of W.events.splice(0))if(e.inB!=null)evs.push(e);};
// O1
{let n=0,bad=0,dead=0;for(let t=0;t<TR;t++){const [x,y]=spot(2,2);const b=W.addBuilding('beee','maison',x,y,true);const vs=hideIn(b,'villageois',5,'hide');let q=0;W.events.length=0;while(!b.ruin&&q<50){shell(b);q++;grab();}
  for(const u of vs){n++;const s=st(u);if(s==='mort'||s==='hors')bad++;if(s==='mort')dead++;}}
  P(bad/n>=.5,'O1. un abri plein bombardé jusqu’à la ruine',`morts ou hors de combat ${Math.round(bad/n*100)} % (dont morts ${Math.round(dead/n*100)} %) sur ${n} villageois`);}
// O2
{let hit=0;for(let t=0;t<TR;t++){const [x,y]=spot(3,3);const b=W.addBuilding('beee','caserne',x,y,true);const rs=hideIn(b,'villageois',10,'inside');W.events.length=0;shell(b);grab();hit+=rs.filter(u=>st(u)!=='ok').length;}
  P(hit/TR>=1,'O2. un obus sur une caserne de dix recrues',`${(hit/TR).toFixed(1)} recrue(s) touchée(s) par obus`);}
// O3
{let n=0,dead=0,stuck=0,lost=0;for(let t=0;t<TR;t++){const [x,y]=spot(3,3);const b=W.addBuilding('beee','caserne',x,y,true);const rs=hideIn(b,'villageois',10,'inside');let q=0;W.events.length=0;while(!b.ruin&&q<50){shell(b);q++;grab();}
  stuck+=(b.inside||[]).length;for(const u of rs){n++;if(st(u)==='mort')dead++;else if(!W.s.units.includes(u))lost++;}}
  P(!stuck&&!lost&&dead/n>=.15&&dead/n<=.6,'O3. la caserne s’effondre sur ses recrues',`morts ${Math.round(dead/n*100)} % · restés dans la ruine ${stuck} · vivants hors de la carte ${lost}`);}
// O4
{const hurt=(k,size)=>{let h=0;for(let t=0;t<TR;t++){const [x,y]=spot(...size);const b=W.addBuilding('beee',k,x,y,true);const vs=hideIn(b,'villageois',5,'hide');W.events.length=0;shell(b);grab();h+=vs.filter(u=>st(u)!=='ok').length;}return h/TR;};
  const hM=hurt('maison',[2,2]),kB=Object.keys(BUILDINGS).find(k=>BUILDINGS[k].bunker),hB=hurt(kB,BUILDINGS[kB].size);
  P(hB<=hM/4+1e-9&&hM>0,'O4. le bunker protège ses occupants',`touchés par obus : maison ${hM.toFixed(2)} · ${BUILDINGS[kB].name} ${hB.toFixed(2)}`);}
// O5
{const w=evs.filter(e=>e.type==='wound'),b=evs.filter(e=>e.type==='blast');
  P(w.length&&w.every(e=>e.rec?.path?.length&&e.inside&&e.v>0)&&b.length,'O5. les blessures dans un bâtiment ont leur radiographie',`${w.length} blessures (${[...new Set(w.map(e=>e.inside))].join(', ')}) · ${b.length} souffles enfermés`);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
