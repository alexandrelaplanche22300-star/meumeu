// Défense bèè : depuis une sauvegarde, 40 Meumeu débarquent sur la côte bèè (face au secteur le plus fortifié) ; qui réagit, en combien de temps, et le bilan
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const N=W.N,B=W.s.beee;
// le secteur le plus fortifié : le centre des bunkers finis
const bk=W.s.buildings.filter(b=>b.f==='beee'&&BUILDINGS[b.k]?.bunker&&b.done&&!b.ruin);
let best=null,bn=-1;for(const b of bk){const n=bk.filter(o=>Math.hypot(o.i-b.i,o.j-b.j)<40).length;if(n>bn){bn=n;best=b;}}
const aim=W.amphiBeach(best.i-15,best.j,60);console.log('cible : plage',aim.x|0,aim.y|0,'bunkers finis à 40 cases',bn);
// en face, côté meumeu : trois barges et 40 soldats
const wb=W.amphiBeach(600,aim.y,80);const boats=[];for(let n=0;n<3;n++){const w=W.nearestWater(wb.x+wb.nx*3,wb.y+wb.ny*3+(n-1)*5,12);boats.push(W.addCombatVehicle('meumeu','barge',w[0]+.5,w[1]+.5,0));}
const sold=[];for(let n=0;n<40;n++){const [x,y]=W.nearestLand(wb.x-wb.nx*2-(n%8)*.7,wb.y-wb.ny*2-4+Math.floor(n/8)*2,8);sold.push(W.addUnit('meumeu','soldat',x,y,{rounds:120}));}
const r=W.order(sold.map(u=>u.id),{type:'point',x:aim.x,y:aim.y});console.log('ordre :',r.text||r.why);
const op=W.s.amphi.find(o=>o.f==='meumeu');let landedT=null;const bands0=new Set((B.bands||[]).map(b=>b.id));
for(let h=0;h<+(process.env.H||120);h++){for(let k=0;k<60;k++)W.update(1/60);
  if(landedT==null&&op.landed>0)landedT=h;
  if(h%6===5){const alive=sold.filter(u=>u.hp>0&&u.h?.state!=='mort'&&u.h?.state!=='hors');const ashore=alive.filter(u=>!u.inVeh&&u.x>N/2);
    const nb=(B.bands||[]).filter(b=>!bands0.has(b.id));const near=W.s.units.filter(u=>u.f==='beee'&&u.hp>0&&Math.hypot(u.x-aim.x,u.y-aim.y)<35).length;
    console.log(`+${h+1} h : op ${W.s.amphi.includes(op)?op.state:'finie'} | Meumeu vivants ${alive.length}, à terre ${ashore.length} | Bèè à 35 cases ${near} | nouveaux groupes bèè ${nb.map(b=>(b.kind||'?')+':'+b.state+':'+b.m.length).join(',')} | alerte ${B.lead?((W.s.t-B.lead.t).toFixed(0)+' h, '+(B.lead.why||'')):'-'}`);}}
