// Le garage (V8) : ce que coûte un engin, combien de temps il prend, où il sort.
// CRITÈRES (fixés avant de lancer) :
//   G1 un char commandé à un garage achevé, près de la capitale approvisionnée : la commande est acceptée et le stock à portée baisse exactement du
//      coût affiché (V12.8 : celui de sa conception, armes, premier plein et râteliers compris)
//   G2 le char sort entre 70 h et 72 h après la commande, sans équipage, sur une case qui débouche (vehOpenAt), hors de l'emprise du garage
//   G3 sans canon de char en stock : la commande est refusée, et la raison nomme ce qui manque ; rien n'est prélevé
//   G4 une jeep : coût prélevé exactement, sortie entre 10 h et 11 h
//   G5 au plus cinq engins en attente ; aucune exception
// CORRECTION DU TEST (V12.8) : les anciens engins sont retirés ; « char » et « jeep » sont des engins CONÇUS (test/_engins_types.mjs : automitrailleuse
//   lourde 8×8, jeep de liaison) dont le coût et les heures découlent de la conception (mesuré : 51 h et 23 h). G2 : sortie entre ses heures et 2 h
//   de plus (avant : 70–72 h, les heures de l'ancienne fiche) ; G4 : entre ses heures et 1 h de plus (avant : 10–11 h). G5 échouait par ricochet
//   (la jeep de G4, pas encore sortie après 14 h, comptait parmi les cinq).
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/vehicules_garage.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');
const SEED=+(process.argv[2]||101);let fail=0,errs=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const {enginsDeTest}=await import('./_engins_types.mjs');const W=enginsDeTest(new World(SEED));const cap=W.capital();
const at=W.buildSpot('meumeu','garage',cap.i+8,cap.j+2,0,24);const g=W.addBuilding('meumeu','garage',at[0],at[1],true);const [gw,gh]=W.sizeOf(g);
const have=()=>W.have('meumeu',g.i+1,g.j+1);const fill=(k,n)=>{cap.stock[k]=(cap.stock[k]||0)+n;};
const run=(h,each)=>{for(let t=0;t<h;t+=.025){try{W.update(.025);}catch(e){errs++;if(errs<3)console.log('ERREUR',e.stack);return;}if(each?.())return;}};
const delta=(a,b,cost)=>Object.keys(cost).map(k=>`${k} ${+((a[k]||0)-(b[k]||0)).toFixed(2)}/${cost[k]}`).join(' · ');
const exact=(a,b,cost)=>Object.entries(cost).every(([k,n])=>Math.abs(((a[k]||0)-(b[k]||0))-n)<1e-6);
// G3 (V12.5) : un engin ne demande que des matières — ses armes viennent avec lui, aucune arme préfabriquée n'est prise au stock
P(!Object.keys(VEHDEF.char.cout).some(k=>k.startsWith('a:'))&&Object.values(VEHDEF).every(V=>!Object.keys(V.cout||{}).some(k=>k.startsWith('a:'))),'G3. aucun engin ne coûte d’arme préfabriquée',Object.entries(VEHDEF).filter(([,V])=>Object.keys(V.cout||{}).some(k=>k.startsWith('a:'))).map(([k])=>k).join(', ')||'aucun');
// G1, G2 : le char
for(const [k,n] of Object.entries(VEHDEF.char.cout))fill(k,n+5);
{const h0=have();const r=W.train(g,'char');const h1=have();const C=VEHDEF.char.cout;
  P(r.ok&&exact(h0,h1,C),'G1. le char : commande acceptée, le stock baisse exactement du coût',`${r.ok?'acceptée':'refusée : '+r.why}` + ` · ${delta(h0,h1,C)}`);
  const n0=W.s.vehicles.length,t0=W.s.t;let v=null;const Hc=VEHDEF.char.heures;run(Hc+10,()=>{v=W.s.vehicles.slice(n0).find(o=>o.k==='char');return !!v;});const dt=W.s.t-t0;
  const inside=v&&v.x>=g.i-.2&&v.x<=g.i+gw+.2&&v.y>=g.j-.2&&v.y<=g.j+gh+.2;
  P(v&&dt>=Hc-.05&&dt<=Hc+2&&!(v.crew||[]).length&&W.vehOpenAt(VEHDEF.char,'char',v.x,v.y)&&!inside,`G2. il sort entre ${Hc} et ${Hc+2} h, sans équipage, sur une case qui débouche, hors du garage`,v?`${dt.toFixed(2)} h · équipage ${(v.crew||[]).length} · débouche ${W.vehOpenAt(VEHDEF.char,'char',v.x,v.y)} · (${v.x.toFixed(1)}, ${v.y.toFixed(1)}) garage ${g.i},${g.j} ${gw}×${gh}`:'aucun char sorti');}
// G4 : la jeep
for(const [k,n] of Object.entries(VEHDEF.jeep.cout))fill(k,n+2);
{const h0=have();const r=W.train(g,'jeep');const h1=have();const C=VEHDEF.jeep.cout;const n0=W.s.vehicles.length,t0=W.s.t;let v=null;const Hj=VEHDEF.jeep.heures;run(Hj+3,()=>{v=W.s.vehicles.slice(n0).find(o=>o.k==='jeep');return !!v;});const dt=W.s.t-t0;
  P(r.ok&&exact(h0,h1,C)&&v&&dt>=Hj-.05&&dt<=Hj+1,`G4. la jeep : coût exact, sortie entre ${Hj} et ${Hj+1} h`,`${r.ok?'acceptée':'refusée : '+r.why} · ${delta(h0,h1,C)} · ${v?dt.toFixed(2)+' h':'pas sortie'}`);}
// G5 : cinq au plus
{for(const [k,n] of Object.entries(VEHDEF.jeep.cout))fill(k,n*8);let acc=0,last=null;for(let i=0;i<7;i++){const r=W.train(g,'jeep');if(r.ok)acc++;else last=r.why;}
  P(acc===5&&/cinq/.test((last||[]).join(' '))&&errs===0,'G5. cinq en attente au plus, aucune exception',`acceptées ${acc} · refus : ${(last||[]).join(', ')} · erreurs ${errs}`);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
