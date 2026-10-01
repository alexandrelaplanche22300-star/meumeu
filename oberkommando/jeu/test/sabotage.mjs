// Le sabotage : nos commandos de nuit sur une usine bèè ; des saboteurs bèè sur notre entrepôt.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
const W=new World(51);for(let h=0;h<24*20;h++)W.update(1);
const c=W.s.beee.cities[0];const cap0=W.capital();const tgt=W.addBuilding('beee','entrepot',Math.round(c.x+(cap0.i-c.x)*.35),Math.round(c.y+(cap0.j-c.y)*.35),true);tgt.stock={poudre:12};console.log('gardes près de la cible',W.s.units.filter(u=>u.f==='beee'&&u.w&&Math.hypot(u.x-tgt.i,u.y-tgt.j)<15).length);
console.log(`cible bèè : ${tgt?.k} à ${tgt?.i},${tgt?.j} · pv ${Math.round(tgt?.hp)}/${tgt?.max}`);
W.s.t=Math.floor(W.s.t/24)*24+22;const us=[0,1].map(n=>{const u=W.addUnit('meumeu','commando',tgt.i-14+n,tgt.j-14);u.w='mle1';u.mag=5;u.pouch=30;u.charges=1;return u;});
console.log('ordre :',W.order(us.map(u=>u.id),{type:'building',id:tgt.id}).text);
let spotted=0,boom=false;for(let t=0;t<24*6&&!boom;t++){W.update(1/6);if(us.some(u=>W.spotted(u,'beee')))spotted++;boom=W.s.log.some(l=>/saboteurs ont fait sauter/.test(l.text));}
console.log(`  ${boom?'sautée':'pas sautée'} · pv ${Math.round(tgt.hp)}/${tgt.max} ${tgt.sabUntil>W.s.t?'· arrêtée pour réparations':''} · nos commandos repérés ${spotted} fois · vivants ${us.filter(u=>u.hp>0&&u.h?.state!=='mort').length}/2`);
// les Bèè sabotent : un entrepôt à nous, isolé, la nuit
const cap=W.capital();const ent=W.addBuilding('meumeu','entrepot',Math.round((cap.i+c.x)/2),Math.round((cap.j+c.y)/2),true);ent.stock={poudre:30,explosifs:10};
for(let n=0;n<8;n++){const u=W.addUnit('beee','soldat',c.x+n%3,c.y+3+(n/3|0));u.w='bee_fusil';u.city=c.id;u.task={kind:'guard',tx:u.x,ty:u.y};}
W.s.beee.sabT=0;W.s.t=Math.floor(W.s.t/24)*24+24+22;W.dt=1;W.beeeSabotage(W.s.beee.cities.filter(x=>!x.fallen));const sab=W.s.units.filter(u=>u.task?.kind==='sabotage'&&u.f==='beee');
console.log(`saboteurs bèè : ${sab.length} vers ${sab[0]?BUILDINGS[W.building(sab[0].task.b).k].name:'—'}`);
let t2=0;for(;t2<24*4*6&&!W.s.log.some(l=>/^Sabotage/.test(l.text));t2++)W.update(1/6);
console.log(`  ${W.s.log.filter(l=>/Sabotage|sauté/.test(l.text)).map(l=>l.text).slice(-2).join(' | ')||'rien'} (après ${(t2/6).toFixed(1)} h)`);
