// (V12.9) La guerre chimique — les nuages, les obus à gaz, les bouteilles, la recherche, la protection. Agents FICTIFS, nombres de jeu.
// (Les doses et les symptômes : test/gaz.mjs, côté santé.)
// CRITÈRES (fixés avant de lancer) :
//   N1 un obus à gaz de 18 mm et plus fait un vrai nuage (plusieurs cellules) ; en dessous, une bouffée d'une cellule, bien plus faible, qui disparaît vite
//   N2 le vent emporte le nuage : son centre avance dans le sens du vent
//   N3 deux nuages qui se recouvrent s'additionnent (grille commune)
//   N4 le foin se dissipe en quelques heures ; le miel tient au sol et en remonte (le terrain reste interdit)
//   N5 un agent dense s'accumule dans un creux (cratère) plus que sur le plat voisin
//   B1 la bouteille : refusée sans la découverte ; posée, remplie (barre à 1 caisse/h), portée (×0,6), reposée
//   B2 la batterie synchronisée lâche plus de gaz que les mêmes bouteilles ouvertes une à une ; sans la découverte, refusée
//   B3 un obus tout près crève la bouteille : tout le gaz sur place, d'un coup
//   R1 la recherche : le foin (production, obus) verrouillé avant « Les toxiques de combat », ouvert après ; X-V demande X-G et la combinaison
//   E1 le masque pris au dépôt s'enfile dans le nuage après un instant, son filtre s'use ; la combinaison ralentit
//   node test/gaz_nuages.mjs   (sans Node : ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/gaz_nuages.mjs)
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {INNOV}=await import('../js/data.js');const {charge}=await import('../js/explosive.js');
const {GAS_CELL}=await import('../js/gaz.js');const {BOUTEILLE}=await import('../js/gaz-bouteilles.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const mk=(seed=3)=>{const W=new World(seed,{assisted:true});const g=W.gasState();g.wind={a:0,v:6,base:6};g.meteo='sec';g.meteoT=1e9;return W;};
const tot=(W,a)=>{let t=0;for(const k in W.s.gas.air)t+=W.s.gas.air[k][a]||0;return t;};
const cells=(W,a)=>Object.values(W.s.gas.air).filter(c=>(c[a]||0)>.05).length;
const centre=(W,a)=>{const NC=W.gasNC();let sx=0,sw=0;for(const k in W.s.gas.air){const c=W.s.gas.air[k][a]||0;sx+=(k%NC+.5)*GAS_CELL*c;sw+=c;}return sw?sx/sw:NaN;};
const calm=W=>{W.s.gas.wind.v=W.s.gas.wind.base=0;W.gasWeather=()=>{};};
const steps=(W,h)=>{for(let t=0;t<h-1e-9;t+=.05)W.gasCloudTick(.05);};
const X=150,Y=150;
// N1
{const W=mk();calm(W);const E=charge(600,1800,{fill:'gaz_foin'});const big=W.gasShell(X,Y,E,{cal:75});const n1=cells(W,'foin'),t1=tot(W,'foin');
  const W2=mk();calm(W2);const E2=charge(15,40,{fill:'gaz_foin'});const sm=W2.gasShell(X,Y,E2,{cal:12});const n2=cells(W2,'foin'),t2=tot(W2,'foin');steps(W2,1);const t2b=tot(W2,'foin');
  P(big.real&&!sm.real&&n1>=4&&n2<=1&&t2<t1*.05&&t2b<t2*.2,'N1. ≥ 18 mm : un vrai nuage ; en dessous, une bouffée qui s\'éteint',`75 mm : ${n1} cellules, ${t1.toFixed(0)} · 12 mm : ${n2} cellule, ${t2.toFixed(1)} → ${t2b.toFixed(2)} après 1 h`);}
// N2
{const W=mk();W.gasWeather=()=>{};W.gasRelease(X,Y,'foin',200,{r:2});const c0=centre(W,'foin');steps(W,1);const c1=centre(W,'foin');
  P(c1-c0>2,'N2. le vent emporte le nuage',`centre x ${c0.toFixed(1)} → ${c1.toFixed(1)} (vent 6 cases/h vers l\'est)`);}
// N3
{const W=mk();calm(W);W.gasRelease(X,Y,'foin',100,{r:2});const a=tot(W,'foin');const k=W.gasKey(X,Y);const c1=W.s.gas.air[k].foin;W.gasRelease(X+1,Y,'foin',100,{r:2});const c2=W.s.gas.air[k].foin;
  P(Math.abs(tot(W,'foin')-2*a)<1e-6&&c2>c1*1.5,'N3. deux nuages qui se recouvrent s\'additionnent',`cellule centrale ${c1.toFixed(1)} → ${c2.toFixed(1)} · total ${tot(W,'foin').toFixed(0)}`);}
// N4
{const W=mk();calm(W);W.gasRelease(X,Y,'foin',200,{r:2});steps(W,8);const f8=tot(W,'foin');
  const W2=mk();calm(W2);W2.gasShell(X,Y,charge(600,1800,{fill:'gaz_miel'}),{cal:75});steps(W2,24);const air=tot(W2,'miel');let sol=0;for(const k in W2.s.gas.sol)sol+=W2.s.gas.sol[k].miel||0;
  P(f8<200*.05&&sol>5&&air>.5,'N4. le foin se dissipe ; le miel tient au sol et en remonte',`foin après 8 h : ${f8.toFixed(2)} (sur 200) · miel après 24 h : sol ${sol.toFixed(1)}, air ${air.toFixed(2)}`);}
// N5
{const W=mk();calm(W);const cx=X+.5,cy=Y+.5;for(let j=Y;j<Y+GAS_CELL;j++)for(let i=X+GAS_CELL*2;i<X+GAS_CELL*3;i++)W.crater[j*W.N+i]=1;
  const kA=W.gasKey(X,Y),kB=W.gasKey(X+GAS_CELL*2,Y),kF=W.gasKey(X-GAS_CELL*2,Y);W.gasRelease(X+GAS_CELL,Y,'xv',100,{r:0});steps(W,1);
  const a=W.s.gas.air;const hole=a[kB]?.xv||0,flat=a[kA]?.xv||0,flat2=a[kF]?.xv||0;
  P(hole>flat*1.3&&hole>flat2,'N5. le gaz dense s\'accumule dans le creux',`creux ${hole.toFixed(2)} · plat voisin ${flat.toFixed(2)} · plat opposé ${flat2.toFixed(2)}`);}
// B1–B3 : un soldat près d'un dépôt
const soldat=W=>{const cap=W.capital();const u=W.s.units.find(x=>x.f==='meumeu'&&x.w&&x.h)||W.s.units.find(x=>x.f==='meumeu'&&x.h);if(!u.w)u.w=Object.keys(W.s.designs)[0];u.x=cap.i+1.5;u.y=cap.j+5.5;u.task=null;u.path=null;return {u,cap};};
{const W=mk();calm(W);const {u,cap}=soldat(W);Object.assign(cap.stock,{bouteille_gaz:10,agent_foin:20});const r0=W.cylPlace(u);
  W.s.innov.done.push('phosphore','toxiques','bouteilles_gaz');const r1=W.cylPlace(u);const c=r1.c;const f0=W.cylFill(c,'foin');
  for(let t=0;t<2;t+=.05)W.gasCylTick(.05);const lv2=W.cylLevel(c);const s0=W.speedOf(u);const rc=W.cylCarry(u,c);const s1=W.speedOf(u);u.x+=3;W.gasCylTick(.05);const moved=Math.abs(c.x-u.x)<1e-6;const rd=W.cylDrop(u);
  P(!r0.ok&&r1.ok&&f0.ok&&Math.abs(lv2-.5)<.03&&rc.ok&&Math.abs(s1/s0-BOUTEILLE.SLOW)<.02&&moved&&rd.ok,'B1. poser, remplir (barre), porter, poser',`sans découverte : « ${r0.why?.[0]} » · barre ${Math.round(lv2*100)} % après 2 h · vitesse ×${(s1/s0).toFixed(2)} · suit le porteur ${moved}`);}
{const run=(sync)=>{const W=mk();calm(W);W.s.gas.wind.v=0;const {u,cap}=soldat(W);W.s.innov.done.push('phosphore','toxiques','bouteilles_gaz');if(sync)W.s.innov.done.push('batteries_gaz');
    const L=[0,1,2].map(n=>{const c={id:W.s.gas.nid++,f:'meumeu',x:X+n*1.5,y:Y,agent:'foin',amt:4,fill:false,open:false,sync:1,hp:30,by:null};W.s.gas.cyl.push(c);return c;});
    let r;if(sync)r=W.cylOpen(L[0],true);else{for(const c of L)r=W.cylOpen(c,false);}W.gasCloudTick=()=>{};for(let t=0;t<2;t+=.05)W.gasCylTick(.05);return {t:tot(W,'foin'),r,open:L.filter(c=>c.amt<.01).length};};
  const W0=mk();const c0={id:1,f:'meumeu',x:X,y:Y,agent:'foin',amt:4,fill:false,open:false,sync:1,hp:30,by:null};W0.s.gas.cyl.push(c0,{...c0,id:2,x:X+1});W0.s.innov.done.push('phosphore','toxiques','bouteilles_gaz');const ref=W0.cylOpen(c0,true);
  const a=run(false),b=run(true);
  P(!ref.ok&&b.r.ok&&b.open===3&&b.t>a.t*1.2,'B2. la batterie synchronisée : un nuage plus gros',`sans découverte : « ${ref.why?.[0]} » · une à une ${a.t.toFixed(0)} · batterie ${b.t.toFixed(0)} (${b.r.text})`);}
{const W=mk();calm(W);const c={id:W.s.gas.nid++,f:'meumeu',x:X,y:Y,agent:'miel',amt:4,fill:false,open:false,sync:1,hp:30,by:null};W.s.gas.cyl.push(c);const E=charge(500,1500,{fill:'tolite'});
  W.gasCylBlast(X+.3,Y,E);const gone=!W.s.gas.cyl.includes(c);const t=tot(W,'miel');
  P(gone&&t>50,'B3. un obus tout près crève la bouteille',`crevée ${gone} · miel lâché ${t.toFixed(0)}`);}
// R1
{const W=mk();const cap=W.capital();const lab=W.s.buildings.find(b=>b.f==='meumeu'&&b.k==='labo')||W.addBuilding('meumeu','labo',cap.i+12,cap.j+12,true);
  const before=W.productsOf(lab).includes('agent_foin')||W.unlocked('fill:gaz_foin');W.s.innov.done.push('phosphore','toxiques');const after=W.productsOf(lab).includes('agent_foin')&&W.unlocked('fill:gaz_foin')&&!W.unlocked('fill:gaz_xv');
  const xv=INNOV.find(I=>I.id==='xv');const coeur=['toxiques','miel','xg','xv'].every(id=>INNOV.some(I=>I.id===id));
  P(!before&&after&&xv.needs.includes('xg')&&xv.needs.includes('combinaisons')&&coeur,'R1. l\'arbre : chaque agent par sa découverte',`avant : ${before} · après « toxiques » : ${after} · X-V demande ${xv.needs.join(' + ')}`);}
// E1
{const W=mk();calm(W);const {u,cap}=soldat(W);Object.assign(cap.stock,{masque_gaz:4,combinaison:2});W.s.innov.done.push('phosphore','toxiques','masques','miel','combinaisons');
  const r=W.equip(u,'masque_gaz',true);const s0=W.speedOf(u);const rs=W.equip(u,'combinaison',true);const s1=W.speedOf(u);
  W.gasRelease(u.x,u.y,'foin',400,{r:1});W.gasGearTick(.1);const early=u.gasMask;for(let t=0;t<1;t+=.05){W.gasGearTick(.05);}const on=u.gasMask,f=u.maskF;const prot=W.unitProtection(u);
  P(r.ok&&rs.ok&&!early&&on&&f<1&&prot.inh>.9&&prot.cut>.8&&Math.abs(s1/s0-.8)<.02,'E1. le masque au premier souffle, le filtre s\'use, la combinaison ralentit',`masque porté après 0,1 h : ${early} · après 1 h : ${on} · filtre ${Math.round(f*100)} % · protection respirée ${prot.inh} · vitesse ×${(s1/s0).toFixed(2)}`);}
// la simulation entière tourne avec un nuage, des bouteilles, un obus (aucune exception)
{const W=mk(5);const {u,cap}=soldat(W);W.s.innov.done.push('phosphore','toxiques','bouteilles_gaz','miel');Object.assign(cap.stock,{bouteille_gaz:3,agent_foin:10});const c=W.cylPlace(u).c;W.cylFill(c,'foin');
  W.gasRelease(u.x+6,u.y,'miel',150,{r:2});let err=null;try{W.update(3);W.heBlast(u.x+6,u.y+1,charge(600,1800,{fill:'gaz_foin'}),'meumeu',null,{cal:75});W.update(2);}catch(e){err=e;}
  P(!err,'S. la simulation tourne avec du gaz',err?String(err.stack||err).slice(0,300):`cellules ${Object.keys(W.s.gas.air).length} · bouteille ${Math.round(W.cylLevel(c)*100)} % · vent ${W.s.gas.wind.v.toFixed(1)}`);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');if(fail&&typeof process!=='undefined')process.exitCode=1;
