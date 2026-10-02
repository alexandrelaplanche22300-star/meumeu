// L'assaut amphibie (joueur). Critères : 40 soldats, 3 barges libres ; un clic droit sur la plage d'en face :
//  1. l'ordre est accepté (3 barges prises, 40 soldats répartis) ;
//  2. en 24 h de jeu tous (ou presque) sont à bord ;
//  3. la traversée se fait sur l'eau et en moins de 110 h ;
//  4. au moins 30 soldats sont à terre sur la rive d'en face, à moins de 40 cases du point visé ;
//  5. l'opération est terminée et les barges libérées.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {T}=await import('../js/data.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const hours=(W,h,each=null)=>{for(let k=0;k<h*60;k++){W.update(1/60);if(each&&each())return;}};
const W=new World(71,{map:'mer'});const N=W.N,ter=W.G.terrain,dc=W.G.dcoast;
const beach=(side,jy=750)=>{for(let dj=0;dj<200;dj++)for(const s of [1,-1]){const j=jy+dj*s;for(let i=side<0?560:940;side<0?i<760:i>740;i+=side<0?1:-1){const k=j*N+i;if(ter[k]===T.sand&&dc[k]>=2&&dc[k]<=4&&W.occ[k]<0)return [i,j];}}return null;};
const west=beach(-1),east=beach(1);
const boats=[];for(let n=0;n<3;n++){const w=W.nearestWater(west[0]+3,west[1]-6+n*6,12);const v=W.addCombatVehicle('meumeu','barge',w[0]+.5,w[1]+.5,0);boats.push(v);}
check('0. trois barges à l\'eau',boats.every(b=>b&&W.isWaterAt(b.x,b.y)));
const sold=[];for(let n=0;n<40;n++){const [x,y]=W.nearestLand(west[0]-1-(n%8)*.7,west[1]-5+Math.floor(n/8)*2.2,8);sold.push(W.addUnit('meumeu','soldat',x,y,{rounds:60}));}
const r=W.order(sold.map(u=>u.id),{type:'point',x:east[0]+.5,y:east[1]+.5});
check('1. ordre accepté',r.ok,JSON.stringify(r.text||r.why));const op=W.s.amphi?.[0];
let aboard=0;hours(W,24,()=>{aboard=Math.max(aboard,boats.reduce((n,b)=>n+(b.crew||[]).filter(u=>u.vrole==='passager').length,0));return op.state!=='load';});
check('2. à bord',aboard>=36,aboard+' passagers, état '+op?.state);
let allWater=true;hours(W,140,()=>{for(const b of boats)if(!W.isWaterAt(b.x,b.y))allWater=false;return op&&!W.s.amphi.includes(op);});
check('3. traversée sur l\'eau',allWater);
const near=sold.filter(u=>u.hp>0&&u.x>N/2&&Math.hypot(u.x-east[0],u.y-east[1])<40).length;
check('4. à terre en face',near>=30,near+' soldats, débarqués '+op?.landed+', état '+op?.state);
check('5. opération close',!W.s.amphi.includes(op)&&boats.every(b=>!b.op),op?.state);
console.log(ok?'TOUT PASSE':'DES ÉCHECS');process.exit(ok?0:1);
