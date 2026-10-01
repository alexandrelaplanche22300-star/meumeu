// La batterie infrarouge du Meumeu : un objet fabriqué à l'atelier (cher), livré par le fret, qui recharge les soldats aux dépôts.
// CRITÈRES (fixés avant de lancer) — REMPLACÉS en V12.4 par la règle du joueur (« les visions nocturnes ne devraient plus inclure de batterie, seulement
// la batterie nécessaire aux réglages de lampe choisis — plus puissante, plus lourde — mais on n'a pas à les recharger ») ; critères d'avant gardés pour
// mémoire :
//   B1 la recette existe à l'atelier et coûte au moins 10 unités de matériaux (plomb, cuivre, pièces, charbon)
//   B2 un soldat dont la batterie est à moitié vide, à moins de 6 cases d'un dépôt qui a 2 batteries chargées, est rechargé (batterie pleine) et le dépôt n'en garde qu'une
//   B3 sans batterie en stock, le même soldat n'est pas rechargé (plus de recharge gratuite)
//   B4 au-dessus de la moitié, il ne consomme rien
//   B5 le fret peut porter la batterie (famille « guerre »)
//   B6 un atelier réglé sur « batterie » en fabrique dans une journée, à partir des matières du dépôt
//   B7 la recharge d'un soldat éloigné passe bien par le dépôt le plus proche : à 10 cases d'un dépôt garni, pas de recharge
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/batterie.mjs
// CRITÈRES V12.4 (fixés avant de lancer) :
//   N1 l'atelier ne propose plus de batteries
//   N2 une visée infrarouge allumée 48 h de nuit ne se vide pas (autonomie intacte) et ne prend aucune batterie au dépôt (stock inchangé)
//   N3 la batterie suit la lampe : sa masse croît avec la puissance (10 W < 35 W < 150 W), et au réglage moyen (35 W) elle pèse ce qu'elle pesait (120 g)
//   N4 l'ancien réglage de capacité (irWh) d'une conception est ignoré : mêmes masse, coût et portée avec ou sans lui
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {irOf,irCostOf}=await import('../js/ballistics.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
{const W=new World(8,{assisted:true});const at=W.s.buildings.find(b=>b.f==='meumeu'&&b.k==='atelier');const L=at?W.productsOf(at):[];P(at&&!L.includes('batterie'),'N1. plus de batteries à l’atelier',`atelier : ${L.join(', ')}`);}
{const W=new World(8,{assisted:true});const cap=W.capital();cap.stock.batterie=3;const hours=irOf({}).hours;const u=W.addUnit('meumeu','soldat',cap.i+3,cap.j+3);u.w='mle1';u.irMax=hours;u.irLeft=hours;u.nvOn=true;
  const l0=u.irLeft;for(let h=0;h<48;h++)W.update(1);P(u.irLeft>=l0&&cap.stock.batterie===3,'N2. allumée 48 h, elle ne se vide pas et ne prend rien au dépôt',`autonomie ${l0} → ${u.irLeft} · batteries au dépôt 3 → ${cap.stock.batterie}`);}
{const k=w=>irOf({irW:w}).packKg;P(k(10)<k(35)&&k(35)<k(150)&&Math.abs(k(35)-.12)<.005,'N3. la batterie suit la lampe (plus puissante, plus lourde)',`10 W : ${Math.round(k(10)*1000)} g · 35 W : ${Math.round(k(35)*1000)} g · 150 W : ${Math.round(k(150)*1000)} g`);}
{const a=irOf({irW:60}),b=irOf({irW:60,irWh:600});P(a.packKg===b.packKg&&a.range===b.range&&JSON.stringify(irCostOf(a))===JSON.stringify(irCostOf(b)),'N4. l’ancien réglage de capacité est ignoré',`sans : ${Math.round(a.packKg*1000)} g, ${a.range} cases · avec 600 Wh : ${Math.round(b.packKg*1000)} g, ${b.range} cases`);}
process.exit(fail?1:0);
