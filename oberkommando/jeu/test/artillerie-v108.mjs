import assert from 'node:assert/strict';
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const {HOUR_REAL}=await import('../js/data.js');
const {kitCalc,kitToP,derive}=await import('../js/ballistics.js');
const {KIT_PRESETS}=await import('../js/kitdata.js');

const world=new World(911),cap=world.capital(),[gx,gy]=world.freeSpot(cap.i+9,cap.j+7,7);
const gun=world.addUnit('meumeu','canon',gx,gy,{w:'canon_mle1',rounds:0});
const W=world.W(gun.w),crew=world.addUnit('meumeu','soldat',gx+.6,gy+.4,{rounds:0});
crew.w=null;crew.mag=crew.pouch=0;crew.serve=gun.id;gun.task={kind:'guard',tx:gx,ty:gy};
assert.ok(world.distB(cap,gx,gy)>2.5,'la pièce doit être hors de la portée automatique du dépôt');
assert.equal(gun.mag+gun.pouch,0,'une pièce neuve sans coups est réellement vide');
for(const b of world.s.buildings)if(b.stock)b.stock['m:'+gun.w]=0;
assert.equal(world.requestCrewResupply(gun.id).ok,false,'sans stock, aucun ordre ni munition magique');
cap.stock['m:'+gun.w]=4/W.perCrate;const initial=cap.stock['m:'+gun.w];
const order=world.requestCrewResupply(gun.id);assert.equal(order.ok,true,order.why?.join(' '));
assert.equal(cap.stock['m:'+gun.w],initial,'le clic ne débite pas le stock à distance');
let reached=false,delivered=false;for(let i=0;i<3600;i++){world.update(1/(HOUR_REAL*10));if(crew.crewAmmo?.phase==='return')reached=true;if(gun.mag+gun.pouch>0){delivered=true;break;}}
assert.equal(reached,true,'le servant doit atteindre le dépôt et prendre des coups');
assert.equal(delivered,true,'le servant doit revenir à la pièce');
assert.ok(cap.stock['m:'+gun.w]<initial,'les coups doivent provenir du stock');
assert.equal(Math.round((initial-cap.stock['m:'+gun.w])*W.perCrate),gun.mag+gun.pouch,'conservation des obus entre dépôt et pièce');
const before=gun.mag+gun.pouch;for(let i=0;i<200;i++)world.update(1/(HOUR_REAL*10));
assert.equal(gun.mag+gun.pouch,before,'pas de remplissage automatique hors portée');

const battery=KIT_PRESETS.find(p=>p.id==='rocket-battery').design;
const light=KIT_PRESETS.find(p=>p.id==='rocket').design;
const D=derive(kitToP(battery)),L=derive(kitToP(light));
assert.equal(D.rocket,true);assert.equal(D.barrels,6);assert.equal(D.p.mag,6);
assert.ok(D.massEmpty>L.massEmpty,'six tubes et un affût pèsent plus qu’un tube épaulé');
assert.ok(D.crew>=2&&D.pushMps>0,'la batterie est mobile et servie');
assert.ok(D.vTop>D.v0,'la roquette accélère après la bouche');
assert.ok(D.he,'la roquette explosive emporte sa charge dans le monde');
console.log('PASS obus finis, servant dépôt → pièce, stock conservé, batterie de six roquettes mobile');
