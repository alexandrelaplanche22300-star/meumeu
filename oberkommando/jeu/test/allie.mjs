// L'allié meumeu (IA), carte mer. Critères (écrits avant) :
//  A1. au départ : une ville alliée dans la partie haute de la rive meumeu (y < capitale - 120), avec ses villageois, marqués « allié » ;
//  A2. le joueur ne peut pas donner d'ordre à une unité alliée (order refuse) ;
//  A3. au jour 12 : au moins 8 bâtiments alliés finis, dont un moulin, une mine, une caserne ;
//  A4. au jour 12 : la population alliée a grandi (plus de villageois qu'au départ) et n'a pas de famine (ration ≥ 0,9) ;
//  A5. au jour 20 : au moins 10 soldats alliés armés ;
//  A6. 40 Bèè posés à 60 cases de la ville alliée (et vus) : en 24 h, au moins la moitié des soldats alliés les attaquent ;
//  A7. aucune erreur.
//   node test/allie.mjs [graine] [jours]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');const {BUILDINGS}=await import('../js/data.js');
const [seed,DAYS]=[+(process.argv[2]||301),+(process.argv[3]||20)];
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const W=new World(seed,{map:'mer'});const P=player(W);const t0=Date.now();let errs=0;
const C=W.allyCentre(),cap=W.capital();
check('A1. ville alliée au nord de la capitale',!!C&&C.j<cap.j-200,C?`alliée (${C.i},${C.j}) capitale (${cap.i},${cap.j})`:'aucune');
const v0=W.allyUnits().filter(u=>u.k==='villageois').length;check('A1. ses villageois',v0>=5,v0+' villageois alliés');
{const u=W.allyUnits()[0];const r=W.order([u.id],{type:'point',x:u.x+5,y:u.y});check('A2. le joueur ne commande pas l’allié',!r.ok,JSON.stringify(r.why||r.text));}
const stats=()=>{const bs=W.s.buildings.filter(b=>b.ally&&!b.ruin),us=W.allyUnits();const by={};for(const b of bs.filter(b=>b.done))by[b.k]=(by[b.k]||0)+1;
  return {done:bs.filter(b=>b.done).length,sites:bs.filter(b=>!b.done).length,by,vil:us.filter(u=>u.k==='villageois').length,sold:us.filter(u=>u.k!=='villageois'&&u.w).length,ration:W.allyCentre()?.ration??1};};
let minRation=1;
for(let d=1;d<=DAYS;d++){for(let h=0;h<24;h++){try{P.tick();}catch(e){}for(let k=0;k<60;k++){try{W.update(1/60);}catch(e){errs++;if(errs<3)console.log('ERREUR',e.stack.split('\n').slice(0,3).join(' | '));}}W.events.length=0;minRation=Math.min(minRation,W.allyCentre()?.ration??1);}
  const s=stats();if(d%2===0||d===DAYS)console.log(`J${d} | finis ${s.done} chantiers ${s.sites} | villageois ${s.vil} soldats ${s.sold} | ${JSON.stringify(s.by)} | ${((Date.now()-t0)/1000)|0}s`);
  if(d===12){check('A3. au moins 8 bâtiments finis (moulin, mine, caserne)',s.done>=8&&s.by.moulin&&s.by.mine&&s.by.caserne,JSON.stringify(s.by));check('A4. la population grandit sans famine',s.vil>v0&&minRation>=.9,`${v0} → ${s.vil} villageois, ration min ${minRation.toFixed(2)}`);}}
const s=stats();check('A5. au jour '+DAYS+' : au moins 10 soldats armés',s.sold>=10,s.sold+' soldats');
// A6 : un raid bèè près de la ville alliée
{const A=W.allyCentre();const sold=W.allyUnits().filter(u=>u.k!=='villageois');const N=W.N;const foes=[];
  for(let n=0;n<40;n++){const [x,y]=W.nearestLand(A.i+2+60+(n%8),A.j+2+Math.floor(n/8),8);const e=W.addUnit('beee','soldat',x,y,{w:'bee_fusil',rounds:40});e.spot={meumeu:W.s.t+999};foes.push(e);}
  let peak=0;for(let h=0;h<24;h++){for(const e of foes)if(e.hp>0)e.spot={meumeu:W.s.t};for(let k=0;k<60;k++)W.update(1/60);const att=W.allyUnits().filter(u=>u.k!=='villageois'&&(u.task?.kind==='attack'||u.task?.kind==='assault'||Math.hypot(u.x-(A.i+62),u.y-(A.j+4))<25)).length;peak=Math.max(peak,att);}
  check('A6. l’allié attaque un raid repéré',sold.length>0&&peak>=sold.length/2,`${peak}/${sold.length} soldats engagés ; Bèè restants ${foes.filter(e=>e.hp>0).length}/40`);}
check('A7. aucune erreur',errs===0,errs+' erreurs');
console.log(ok?'TOUT PASSE':'DES ÉCHECS');process.exit(ok?0:1);
