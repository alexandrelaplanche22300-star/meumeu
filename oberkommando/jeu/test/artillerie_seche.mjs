// L'artillerie ne tirait plus (capture du joueur, V12.2 : « 0/12 coups · sans observateur ») : une pièce à sec restait « plus d'obus » jusqu'à un ordre
// manuel de ravitaillement, et le servant gardait une fraction d'obus (0,69 caisse d'un obus par caisse) que personne ne pouvait donner.
// Mesuré avant correction (V12.2, même scénario) : 2 coups sur 12 en 8 h, puis « plus d'obus » avec le servant à côté.
// CRITÈRES (fixés avant de lancer) :
//   A1 un équipage d'obusier sorti de la caserne, ordre de 12 coups sur une zone, AUCUN ordre de ravitaillement : ≥ 6 coups en 48 h de jeu (V12.2 : 2)
//   A2 la pièce part déjà vide (0 obus) : elle tire quand même (≥ 3 coups en 48 h) — le cas « 0/12 » de la capture
//   A3 conservation : obus partis du dépôt = obus tirés + obus restant à la pièce + obus portés par les servants (à 0,01 près), rien de créé
//   A4 le tireur ne quitte pas sa position (≤ 0,5 case) : c'est un servant qui fait l'aller-retour, sans arme
//   A5 les servants portent des obus ENTIERS (caisses × obus par caisse entier) pour l'obusier et la mitrailleuse
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/artillerie_seche.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const id='canon_mle1';
const total=(W,k)=>W.s.buildings.filter(b=>b.f==='meumeu'&&b.stock).reduce((n,b)=>n+(b.stock[k]||0),0);
const mk=()=>{const W=new World(3,{assisted:true});const cap=W.capital();Object.assign(cap.stock,{pieces:900,fer:900,['a:'+id]:4,['m:'+id]:30,vivres:900});
  let cas=W.s.buildings.find(b=>b.f==='meumeu'&&b.k==='caserne'&&b.done);if(!cas){const at=W.buildSpot('meumeu','caserne',cap.i+8,cap.j+2,0,24);cas=W.addBuilding('meumeu','caserne',at[0],at[1],true);}
  for(const v of W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,6))W.enterBarracks(v,cas);cas.rally=[cas.i+6,cas.j+8];
  const m0=total(W,'m:'+id);const r=W.releaseCrew(cas,id);const g=r.gunner;for(let i=0;i<120;i++)W.update(.0125);return {W,g,r,m0};};
const order=(W,g)=>{const Wd=W.W(id),dist=Math.min(W.zoneRange(Wd)*.6,40),a=Math.PI/4;const sq=W.squad(g.sq);return W.zoneFire(sq?W.members(sq).map(u=>u.id):[g.id],g.x+Math.cos(a)*dist,g.y+Math.sin(a)*dist,{n:12});};
const run=(W,g,h)=>{let maxD=0;const x0=g.x,y0=g.y;for(let i=0;i<h*80;i++){W.update(.0125);maxD=Math.max(maxD,Math.hypot(g.x-x0,g.y-y0));if(g.task?.kind!=='zone')break;}return maxD;};
const fired=g=>g.task?.kind==='zone'?g.task.fired:12;
// A1, A3, A4
{const {W,g,r,m0}=mk();const Wd=W.W(id);order(W,g);const maxD=run(W,g,48);const n=fired(g);
  const sv=W.s.units.filter(u=>u.serve===g.id);const porte=sv.reduce((a,u)=>a+(u.ammoW===id?(u.crates||0)*Wd.perCrate:0),0),piece=(g.mag||0)+(g.pouch||0);
  const parti=(m0-total(W,'m:'+id))*Wd.perCrate;
  P(r.ok&&n>=6,'A1. la pièce à sec est ravitaillée par un servant sans ordre : elle continue de tirer',`${n}/12 coups en 48 h (V12.2 : 2) · état « ${g.why||'—'} »`);
  P(Math.abs(parti-(n+piece+porte))<=.01,'A3. conservation : obus partis du dépôt = tirés + à la pièce + portés',`partis ${parti.toFixed(2)} · tirés ${n} · pièce ${piece} · servants ${porte.toFixed(2)}`);
  P(maxD<=.5&&sv.every(u=>!u.w),'A4. le tireur garde sa position, le servant (sans arme) fait l’aller-retour',`déplacement max du tireur ${maxD.toFixed(2)} case · servants armés : ${sv.filter(u=>u.w).length}`);}
// A2
{const {W,g}=mk();for(const u of W.s.units.filter(u=>u.serve===g.id)){W.put?.(W.capital(),'m:'+id,u.crates||0);u.crates=0;}g.mag=0;g.pouch=0;order(W,g);run(W,g,48);
  P(fired(g)>=3,'A2. une pièce qui part vide tire quand même (le « 0/12 » de la capture)',`${fired(g)}/12 coups en 48 h · état « ${g.why||'—'} »`);}
// A5
{const W=new World(3,{assisted:true});W.s.designs.mg={id:'mg',f:'meumeu',name:'Mitrailleuse',status:'adopte',p:{d:2.2,l:8,nose:'pointue',base:'bt',cons:'fmj',c:.05,L:260,twist:70,action:'auto',rof:650,mag:150,heavy:true,wallx:1.6,mods:['trepied']}};
  const r=[id,'mg'].map(k=>{const Wd=W.W(k),c=W.servantCrates(Wd),n=c*Wd.perCrate;return {k,c,n,kg:n*(Wd.rm||0)/1000};});
  P(r.every(x=>Math.abs(x.n-Math.round(x.n))<1e-6&&x.n>=1),'A5. les servants portent des coups entiers',r.map(x=>`${x.k} : ${x.c} caisse = ${x.n.toFixed(3)} coups (${x.kg.toFixed(2)} kg)`).join(' · '));}
process.exit(fail?1:0);
