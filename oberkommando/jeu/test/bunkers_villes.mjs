// Les bunkers des villes bèè (V12.5) — node test/bunkers_villes.mjs [carte] [graine] [jours]
//  1. au bout de N jours, des bunkers bèè finis à moins de 30 cases (× échelle) de leurs villes, dans au moins la moitié des villes de plus de 10 jours ;
//  2. ils ont une garnison (des Bèè à l'intérieur) ;
//  3. aucune exception.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const map=process.argv[2]||'classique',seed=+(process.argv[3]||5),DAYS=+(process.argv[4]||25);
const W=new World(seed,map==='classique'?{}:{map});let errs=0;const born={};
for(let h=0;h<DAYS*24;h++){try{for(let k=0;k<60;k++)W.update(1/60);}catch(e){errs++;if(errs<3)console.log(e.stack);break;}if(h%24===0)for(const c of W.s.beee.cities)born[c.id]??=W.s.t;}
const K=W.mapK||1,C=W.s.beee.cities.filter(c=>!c.fallen),old=C.filter(c=>W.s.t-(born[c.id]??0)>240);
const bk=W.s.buildings.filter(b=>b.f==='beee'&&b.done&&!b.ruin&&BUILDINGS[b.k]?.bunker);const near=c=>bk.filter(b=>Math.hypot(b.i-c.x,b.j-c.y)<30*K);
const withB=old.filter(c=>near(c).length>0);const types={};for(const b of bk)types[BUILDINGS[b.k].bunker]=(types[BUILDINGS[b.k].bunker]||0)+1;
check(`1. des bunkers autour des villes (${map}, J${W.day})`,old.length>0&&withB.length>=old.length/2,`${withB.length}/${old.length} villes anciennes en ont · ${bk.length} bunkers finis ${JSON.stringify(types)} · en chantier ${W.s.buildings.filter(b=>b.f==='beee'&&!b.done&&!b.ruin&&BUILDINGS[b.k]?.bunker).length}`);
const occ=bk.reduce((n,b)=>n+Object.keys(W.bunkerOcc(b)).length,0);
check('2. une garnison dedans',occ>0,`${occ} Bèè dans les ouvrages`);
check('3. aucune exception',errs===0,errs+' erreurs');
console.log(ok?'TOUT PASSE':'ÉCHEC');process.exit(ok?0:1);
