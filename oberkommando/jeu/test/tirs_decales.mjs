// Le décalage des tirs (V12.5) : 8 soldats meumeu en ligne tirent sur 8 Bèè à 10 cases, en plein jour ; on relève l'instant de chaque coup.
//  1. au plus 25 % des coups partent au même pas de simulation que 3 autres ou plus (salves synchronisées) ;
//  2. la cadence moyenne reste celle de l'arme (le nombre de coups ne baisse pas de plus de 15 % par rapport à une référence) ;
//  3. aucune exception.   node test/tirs_decales.mjs [référence de coups]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const W=new World(11);W.s.t=12;W.s.solar=12;W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');const [cx,cy]=W.G.capital;
const M=[],B=[];for(let n=0;n<8;n++){const [x,y]=W.freeSpot(cx+30,cy-20+n*1.5,3);const u=W.addUnit('meumeu','soldat',x,y,{rounds:400});u.task={kind:'guard',tx:u.x,ty:u.y,hold:true};M.push(u);}
for(let n=0;n<8;n++){const [x,y]=W.freeSpot(cx+40,cy-20+n*1.5,3);const b=W.addUnit('beee','soldat',x,y,{w:'bee_fusil'});b.task={kind:'guard',tx:b.x,ty:b.y,hold:true};b.hp=1e6;b.holdFire=true;B.push(b);}
const ticks=new Map();let step=0,errs=0;
const hours=1.5;for(let k=0;k<hours*60*40;k++){try{const before=new Map(M.map(u=>[u.id,u.mag]));W.update(1/(60*40));step++;for(const u of M){const m0=before.get(u.id);if(u.mag!=null&&m0!=null&&u.mag<m0){ticks.set(step,(ticks.get(step)||0)+(m0-u.mag));}}for(const b of B){b.hp=1e6;if(b.h)b.h.state='ok';}}catch(e){errs++;if(errs<3)console.log(e.stack);break;}}
const total=[...ticks.values()].reduce((a,n)=>a+n,0),sync=[...ticks.values()].filter(n=>n>=4).reduce((a,n)=>a+n,0);
check('1. peu de salves synchronisées',total>0&&sync/total<=.25,`${total} coups, ${sync} partis à 4 ou plus au même pas (${(100*sync/Math.max(1,total)).toFixed(0)} %)`);
const ref=+process.argv[2]||0;check('2. la cadence est gardée',!ref||total>=ref*.85,ref?`${total} coups contre ${ref} sans décalage`:`${total} coups (pas de référence donnée)`);
check('3. aucune exception',errs===0,errs+' erreurs');
console.log('COUPS',total);console.log(ok?'TOUT PASSE':'ÉCHEC');process.exit(ok?0:1);
