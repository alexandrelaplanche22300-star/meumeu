// OBSOLÈTE depuis V12.4 : la lampe infrarouge ne se décharge plus (IR_NO_DRAIN), il n'y a plus de recharge à mesurer. Gardé pour l'historique : ANCIENS=1 pour le lancer.
if(!process.env.ANCIENS){console.log('OBSOLÈTE (V12.4 : pas de décharge) — rien à vérifier');process.exit(0);}
// La batterie infrarouge du Meumeu : un objet fabriqué à l'atelier (cher), livré par le fret, qui recharge les soldats aux dépôts.
// CRITÈRES (fixés avant de lancer) :
//   B1 la recette existe à l'atelier et coûte au moins 10 unités de matériaux (plomb, cuivre, pièces, charbon)
//   B2 un soldat dont la batterie est à moitié vide, à moins de 6 cases d'un dépôt qui a 2 batteries chargées, est rechargé (batterie pleine) et le dépôt n'en garde qu'une
//   B3 sans batterie en stock, le même soldat n'est pas rechargé (plus de recharge gratuite)
//   B4 au-dessus de la moitié, il ne consomme rien
//   B5 le fret peut porter la batterie (famille « guerre »)
//   B6 un atelier réglé sur « batterie » en fabrique dans une journée, à partir des matières du dépôt
//   B7 la recharge d'un soldat éloigné passe bien par le dépôt le plus proche : à 10 cases d'un dépôt garni, pas de recharge
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/batterie.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {PRODUCTS,familyOf}=await import('../js/data.js');const {irOf}=await import('../js/ballistics.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const R=PRODUCTS.batterie;const total=Object.values(R?.in||{}).reduce((a,v)=>a+v,0);
P(R&&R.at==='atelier'&&total>=10,'B1. recette à l\'atelier, au moins 10 unités de matériaux',R?`${JSON.stringify(R.in)} = ${total} unités, ${R.hours} h`:'recette absente');
const mk=()=>{const W=new World(8,{assisted:true});const cap=W.capital();for(const b of W.s.buildings)if(b.stock)b.stock.batterie=0;
  const hours=irOf({}).hours;const u=W.addUnit('meumeu','soldat',cap.i+3,cap.j+3);u.w='mle1';u.irMax=hours;u.irLeft=hours;return {W,cap,u,hours};};
{const {W,cap,u,hours}=mk();cap.stock.batterie=2;u.irLeft=hours*.4;W.resupply(u);P(u.irLeft===hours&&cap.stock.batterie===1,'B2. recharge contre une batterie du dépôt',`batterie ${hours*.4|0} → ${u.irLeft} h · stock 2 → ${cap.stock.batterie}`);}
{const {W,cap,u,hours}=mk();u.irLeft=hours*.4;W.resupply(u);P(u.irLeft===hours*.4,'B3. sans batterie en stock, pas de recharge',`batterie ${u.irLeft} h sur ${hours}`);}
{const {W,cap,u,hours}=mk();cap.stock.batterie=2;u.irLeft=hours*.8;W.resupply(u);P(u.irLeft===hours*.8&&cap.stock.batterie===2,'B4. au-dessus de la moitié, aucune batterie consommée',`stock ${cap.stock.batterie}`);}
P(familyOf('batterie')==='guerre','B5. le fret porte la batterie',`famille ${familyOf('batterie')}`);
{const W=new World(8,{assisted:true});const cap=W.capital();const at=W.s.buildings.find(b=>b.f==='meumeu'&&b.k==='atelier'&&b.done);at.prod='batterie';const s0=cap.stock.batterie||0;
  for(let h=0;h<36;h++)W.update(1);const made=(W.s.buildings.filter(b=>b.stock).reduce((a,b)=>a+(b.stock.batterie||0),0))-s0;
  P(made>=1,'B6. un atelier réglé sur « batterie » en fabrique',`${made} batterie(s) en 36 h ; atelier ${at.why||'en marche'}`);}
{const {W,cap,u,hours}=mk();cap.stock.batterie=2;u.x=cap.i+20;u.y=cap.j+20;u.irLeft=hours*.4;W.resupply(u);P(u.irLeft===hours*.4&&cap.stock.batterie===2,'B7. à 20 cases de tout dépôt, pas de recharge',`batterie ${u.irLeft} h · stock ${cap.stock.batterie}`);}
process.exit(fail?1:0);
