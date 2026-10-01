import assert from 'node:assert/strict';
globalThis.document={getElementById:()=>({textContent:''})};
globalThis.Image=class {set src(v){this._src=v;}};
globalThis.addEventListener=()=>{};
const raf=[];globalThis.requestAnimationFrame=f=>raf.push(f);
const {DesignerAncien}=await import('../js/designer.js');
const host={hidden:true,addEventListener(){}};
const designer=new DesignerAncien(host,{});
designer.load=()=>{};
designer.shot={step:()=>{steps++;},dispose(){}};
let steps=0;
designer.show();
assert.equal(designer.runId,1);
assert.equal(raf.length,1);
raf.shift()(performance.now()+20);
assert.equal(steps,1,'la radiographie animée doit démarrer au premier tour');
designer.close();

const {World}=await import('../js/world.js');
const {derive}=await import('../js/ballistics.js');
const {DEFAULT_DESIGNS}=await import('../js/designs.js');
const W=new World(71),u=W.s.units.find(x=>x.f==='meumeu');
assert.ok(u);
W.s.units=[u];W.s.buildings=[];W.s.heard=[];
W.meumeuHear(u.x+30,u.y,190,'tirs');
const far=W.s.heard.at(-1);
W.s.heard=[];W.meumeuHear(u.x+5,u.y,190,'tirs');
const near=W.s.heard.at(-1);
assert.ok(near.uncertainty<far.uncertainty,'relèvement plus précis à proximité');
assert.equal(near.oid,u.id);
W.s.fog=false;W.s.heard=[];W.emit({type:'shot',f:'beee',x:u.x+5,y:u.y,dB:190});
assert.equal(W.s.heard.length,1,'bruit conservé même carte entièrement visible');

// ANCIENNE VERSION (gardée) — périmée : DEFAULT_DESIGNS[0] est devenu l'Obusier Mle 1 issu du kit (p.kit), dont la fiche continue impose
// sa propre optique (panoramique ×3) ; changer p.sightMag n'y touche donc pas (dans l'atelier, editKit() reporte le réglage sur la fiche).
// Le moteur est bon (test/balistique_coherence.mjs R1c : l'œil croît strictement avec le grossissement), le test visait une arme
// de l'ancien modèle.
//   const p={...DEFAULT_DESIGNS[0].p,mods:['lunette'],sightMag:1,sightRadius:20,sightHeight:1.2};
// NOUVELLE VERSION : le Fusil Mle 1 (ancien modèle) pour p.sightMag, et la fiche du kit pour le kit.
const p={...DEFAULT_DESIGNS.find(d=>d.id==='mle1').p,mods:['lunette'],sightMag:1,sightRadius:20,sightHeight:1.2};
const a=derive(p),b=derive({...p,sightMag:4}),c=derive({...p,sightHeight:4});
assert.equal(a.v0,b.v0,'grossissement sans énergie supplémentaire');
assert.ok(b.seeM>a.seeM,'grossissement accroît la portée d’œil');
{const pk=DEFAULT_DESIGNS[0].p,k1=derive({...pk,kit:{...pk.kit,magnification:1}}),k4=derive({...pk,kit:{...pk.kit,magnification:4}});
  assert.equal(k1.v0,k4.v0,'kit : grossissement sans énergie supplémentaire');
  assert.ok(k4.seeM>k1.seeM,'kit : grossissement accroît la portée d’œil');}
assert.ok(b.sightAimMrad<a.sightAimMrad,'grossissement réduit l’erreur angulaire de visée');
assert.equal(a.v0,c.v0,'hauteur du viseur sans changement de vitesse');
assert.notEqual(a.los(20),c.los(20),'hauteur modifie le biais');
assert.ok(derive({...p,l:75,c:.032,d:11.8}).caseLen>=75*.3,'l’étui reçoit la partie sertie de la balle');
const B=new World(72),city=B.s.beee.cities.find(c=>!c.fallen);
assert.ok(city);
const guards=[B.addUnit('beee','soldat',city.x+2,city.y+2),B.addUnit('beee','soldat',city.x+3,city.y+2)];
for(const g of guards){g.city=city.id;g.task={kind:'guard',tx:g.x,ty:g.y};}
B.beeeGuards=()=>guards.filter(g=>g.task?.kind==='guard');
// [V7, périmé] une garnison de deux gardes répondait à une alerte, sans délai :
//   B.s.beee.alerts=[];B.beeeNotice(city.x+4,city.y+3,7,'tir');B.dt=.2;B.beeeSearch([city]);
//   assert.ok(guards.some(g=>g.task?.kind==='search'),'même une petite garnison répond à une alerte');
// [V10] une alerte a un délai de réaction (0,15 h) et une ville ne détache un binôme d'écoute que si elle garde au moins la moitié de sa
// garnison minimale : on complète donc la garnison jusqu'à son minimum, puis on laisse passer le délai.
while(guards.length<B.beeeGarrisonMin(city)){const g=B.addUnit('beee','soldat',city.x+2+guards.length*.5,city.y+4);g.city=city.id;g.task={kind:'guard',tx:g.x,ty:g.y};guards.push(g);}
B.s.beee.alerts=[];B.beeeNotice(city.x+4,city.y+3,7,'tir');B.s.t+=.2;B.dt=.2;B.beeeSearch([city]);
assert.ok(guards.some(g=>g.task?.kind==='search'),'une ville à son minimum de garnison envoie un binôme d’écoute');
assert.equal(B.s.beee.alerts.at(-1).done,true);
B.s.t+=.5;B.beeeNotice(city.x+4,city.y+3,7,'tir');
assert.equal(B.s.beee.alerts.at(-1).done,false,'une nouvelle alerte rouvre la fouille');
for(let i=0;i<7;i++){const g=B.addUnit('beee','soldat',city.x+4+i,city.y+2);g.city=city.id;g.task={kind:'guard',tx:g.x,ty:g.y};guards.push(g);}
// [V7, périmé] B.beeeSectorPatrols([city]) — cette fonction de war.js n'est plus appelée par le jeu (code mort) ; les rondes de secteur
// vivent dans strategy.js (beeeSearch) et sont soumises au plafond de mobilisation :
//   B.beeeSectorPatrols([city]);
//   assert.equal(guards.filter(g=>g.task?.sector).length,4,'deux binômes couvrent les secteurs lointains sans vider la garnison');
city.sectorT=0;B.s.t+=6;B.dt=.2;B.beeeSearch([city]);
assert.ok(guards.some(g=>g.task?.sector),'la ville envoie des rondes de secteur (chemin actif : beeeSearch)');
assert.ok(B.beeeOut(city)<=B.beeeCap(city,true),'sans dépasser le plafond de mobilisation de la ville');
assert.ok(guards.filter(g=>g.task?.kind==='guard').length>=Math.ceil(B.beeeGarrisonMin(city)/2),'et sans vider la garnison : la moitié du minimum reste au poste');
console.log('OK : radiographie animée, bruits, viseur, étui, riposte des garnisons');
