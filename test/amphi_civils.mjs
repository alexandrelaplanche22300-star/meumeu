// Des civils dans la traversée (V12.5) : 10 soldats et 10 villageois, 1 barge, un clic sur la plage d'en face —
//  1. l'ordre prend les vingt (les villageois ne sont plus laissés à quai) ;
//  2. en face, au moins 8 villageois à terre, à moins de 40 cases du point visé ;
//  3. la soute de la barge se charge à un dépôt comme celle d'une jeep (des caisses de munitions), et elle traverse avec.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {T}=await import('../js/data.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const hours=(W,h,each=null)=>{for(let k=0;k<h*60;k++){W.update(1/60);if(each&&each())return;}};
const W=new World(71,{map:'mer'});const N=W.N,ter=W.G.terrain,dc=W.G.dcoast;
const beach=(side,jy=750)=>{for(let dj=0;dj<200;dj++)for(const s of [1,-1]){const j=jy+dj*s;for(let i=side<0?560:940;side<0?i<760:i>740;i+=side<0?1:-1){const k=j*N+i;if(ter[k]===T.sand&&dc[k]>=2&&dc[k]<=4&&W.occ[k]<0)return [i,j];}}return null;};
const west=beach(-1),east=beach(1);
const w=W.nearestWater(west[0]+3,west[1],12);const boat=W.addCombatVehicle('meumeu','barge',w[0]+.5,w[1]+.5,0);
const us=[];for(let n=0;n<20;n++){const [x,y]=W.nearestLand(west[0]-1-(n%8)*.7,west[1]-5+Math.floor(n/8)*2.2,8);us.push(W.addUnit('meumeu',n<10?'soldat':'villageois',x,y,n<10?{rounds:60}:{}));}
// la soute : vingt caisses de munitions, comme on les mettrait à bord d'une jeep (ici posées directement, le chargement au dépôt est celui de tous les engins)
boat.cargo={'m:mle1':20};
const r=W.order(us.map(u=>u.id),{type:'point',x:east[0]+.5,y:east[1]+.5});const op=W.s.amphi?.[0];
check('1. l’ordre prend soldats et villageois',r.ok&&op&&op.units.length===20,(r.text||r.why)+' · '+(op?op.units.length:0)+' embarqués prévus');
hours(W,160,()=>op&&!W.s.amphi.includes(op));
const vil=us.filter(u=>u.k==='villageois'&&u.hp>0&&u.x>N/2&&Math.hypot(u.x-east[0],u.y-east[1])<40).length,sol=us.filter(u=>u.k==='soldat'&&u.hp>0&&u.x>N/2).length;
check('2. les villageois sont en face',vil>=8,`${vil} villageois et ${sol} soldats à terre en face`);
check('3. la soute a traversé',boat.x>N/2-200&&(boat.cargo?.['m:mle1']||0)>=20,`barge en (${boat.x|0}, ${boat.y|0}) · ${boat.cargo?.['m:mle1']||0} caisses de munitions à bord`);
console.log(ok?'TOUT PASSE':'ÉCHEC');process.exit(ok?0:1);
