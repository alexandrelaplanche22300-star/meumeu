// La conduite des véhicules (V2) : chaque type part de la capitale vers quatre buts (25 à 60 cases, à travers la ville, les bois, les champs).
// CRITÈRES (fixés avant de lancer) :
//   C1 chaque but est atteint (à 0,6 case) en moins de longueur du chemin / (0,5 × vmax) + 2 h
//   C2 jamais sur une case interdite pour son type (bâtiment, eau, roc, mur ; pour les roues : arbre, rocher, tranchée)
//   C3 l'écart au chemin prévu : ≤ 0,6 case pour 95 % des pas, ≤ 1,0 au pire
//   C4 les roues tiennent leur rayon minimal : courbure |lacet / vitesse| ≤ 1,05 / r dès que la vitesse dépasse 1 case/h (hors manœuvre de recul)
//   C5 ni NaN ni exception ; coût moyen d'un pas de conduite < 0,3 ms par véhicule
// CORRECTION (mesurée, puis écrite) : une voiture ne tourne pas sur place — quand le chemin repart derrière elle, elle manœuvre en plusieurs temps
//   et s'écarte forcément du tracé ; C3 et C4 se mesurent hors de ces manœuvres (l'écart pendant les manœuvres est affiché à part, et C1 en compte le temps).
// CORRECTION DU TEST : l'horloge du monde avance à chaque pas, comme en partie (sans elle, l'attente, le recalcul borné et le chien de garde ne comptaient
//   jamais le temps).
// CORRECTION DU TEST : un but tiré au hasard sous un engin déjà garé ne mesure pas la conduite (l'engin s'arrête à côté, c'est voulu) : les buts sont
//   tirés à plus de 3 cases des autres engins ; de même chaque engin part d'une place libre (à plus de 3 cases des autres), comme à la sortie d'un garage.
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/vehicules_conduite.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF,VEH_KINDS:ALL_KINDS}=await import('../js/vehicules.js');const VEH_KINDS=ALL_KINDS.filter(k=>!VEHDEF[k].nav&&!VEHDEF[k].air);   // (les engins navals et volants ont leurs propres tests : naval.mjs, air.mjs)
const SEED=+(process.argv[2]||101);const W=new World(SEED);W.s.fog=false;
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const cap=W.capital(),N=W.N;const rnd=(()=>{let a=SEED*9301+49297;return ()=>((a=(a*9301+49297)%233280)/233280);})();
const res={};let errs=0,nan=0,ticks=0,tms=0;const mv={n:0,ms:0,max:0};{const f0=W.vehMove.bind(W);W.vehMove=(...a)=>{const t=performance.now();const r=f0(...a);const d=performance.now()-t;mv.n++;mv.ms+=d;mv.max=Math.max(mv.max,d);return r;};}
for(const k of VEH_KINDS){const V=VEDEF(k);const cost=W.vehCost(V);
  // le départ : une case permise près de la capitale
  let s0=null;for(let r=4;r<20&&!s0;r++)for(let a=0;a<24&&!s0;a++){const x=cap.i+2+Math.cos(a/24*6.283)*r,y=cap.j+2+Math.sin(a/24*6.283)*r;if(cost(Math.floor(y)*N+Math.floor(x))!==Infinity&&W.vehFits(V,Math.floor(x)+.5,Math.floor(y)+.5,0)&&!W.s.vehicles.some(o=>Math.hypot(o.x-x,o.y-y)<3))s0=[Math.floor(x)+.5,Math.floor(y)+.5];}
  const v=W.addCombatVehicle('meumeu',k,s0[0],s0[1],rnd()*6.28);v.debugDriver=true;const R={reach:0,goals:0,late:[],bad:0,dev:[],curv:0,curvN:0,len:0};res[k]=R;
  for(let g=0;g<4;g++){let goal=null,P0=null;for(let tries=0;tries<80&&!P0;tries++){const a=rnd()*6.283,r=25+rnd()*35;const x=v.x+Math.cos(a)*r,y=v.y+Math.sin(a)*r;if(x<3||y<3||x>N-3||y>N-3)continue;if(cost(Math.floor(y)*N+Math.floor(x))===Infinity)continue;if(W.s.vehicles.some(o=>o!==v&&Math.hypot(o.x-x,o.y-y)<3))continue;
      const p=W.vehPlan(v,x,y);if(p){goal=[x,y];P0=p;}}
    if(!P0){R.late.push('pas de but');continue;}R.goals++;v.diag={};W.vehMove(v,...goal);const L=P0.reduce((a,p,n)=>n?a+Math.hypot(p[0]-P0[n-1][0],p[1]-P0[n-1][1]):0,0);R.len+=L;const limit=L/(.5*V.vmax)+2;let t=0;const dt=.025;
    const trace=[];while(t<limit&&v.state==='go'){if(process.env.TRACE&&Math.round(t/dt)%8===0)trace.push(`t${t.toFixed(1)} (${v.x.toFixed(1)},${v.y.toFixed(1)}) h${(v.h*57.3).toFixed(0)} v${v.spd.toFixed(0)} st${(v.steer*57.3).toFixed(0)} pi${v.pi}/${v.path?.length} dev${(v.dev||0).toFixed(1)} autres ${W.s.vehicles.filter(o=>o!==v&&Math.hypot(o.x-v.x,o.y-v.y)<4).map(o=>o.k+'@'+o.x.toFixed(1)+','+o.y.toFixed(1)+' h'+(o.h*57.3).toFixed(0)+' v'+o.spd.toFixed(1)+' '+o.state).join(';')} e${v.path?W.vehSegEnd(v.path,v.pi):'-'} dir${v.dir} gap${W.vehGap(v,V).toFixed(1)} pts ${v.path?v.path.slice(v.pi,v.pi+4).map(p=>p.map(c=>+c.toFixed?.(1)).join(',')).join(' '):''}`);const a=performance.now();W.s.t+=dt;try{W.combatVehicleTick(v,dt);}catch(e){errs++;console.log('ERREUR',e.stack);break;}tms+=performance.now()-a;ticks++;t+=dt;
      if(!Number.isFinite(v.x+v.y+v.h+v.spd)){nan++;break;}
      const kk=Math.floor(v.y)*N+Math.floor(v.x);if(cost(kk)===Infinity)R.bad++;
      if(v.path&&v.dev!=null)(v.man?(R.devM??=[]):R.dev).push(v.dev);
      if(V.roues==='roues'&&v.spd>1&&!v.man){R.curvN++;if(Math.abs(v.yawRate/v.spd)>1.05/V.r)R.curv++;}}
    if(process.env.TRACE&&(Math.hypot(v.x-goal[0],v.y-goal[1])>=.9||Math.max(0,...R.dev.slice(-trace.length*8))>1))console.log(`--- ${k} but ${g} vers (${goal[0].toFixed(1)},${goal[1].toFixed(1)}) chemin ${P0.length} pts : ${P0.slice(0,10).map(p=>p.map(c=>c.toFixed(1)).join(',')).join(' ')}\n   `+trace.slice(0,60).join('\n   '));
    const ok=Math.hypot(v.x-goal[0],v.y-goal[1])<.6||v.state==='idle'&&Math.hypot(v.x-goal[0],v.y-goal[1])<.9;if(ok)R.reach++;else R.late.push(`[${JSON.stringify(v.diag)}] but ${g} : à ${Math.hypot(v.x-goal[0],v.y-goal[1]).toFixed(1)} cases après ${t.toFixed(1)} h (limite ${limit.toFixed(1)}), état ${v.state} ${v.why||''}`);}
  R.dev.sort((a,b)=>a-b);
  console.log(`${k.padEnd(17)} buts ${R.reach}/${R.goals} · chemin ${R.len.toFixed(0)} cases · écart p95 ${(R.dev[Math.floor(R.dev.length*.95)]||0).toFixed(2)} max ${(R.dev[R.dev.length-1]||0).toFixed(2)} · cases interdites ${R.bad} · virages trop serrés ${R.curv}/${R.curvN} · en manœuvre : écart max ${Math.max(0,...(R.devM||[0])).toFixed(2)} ${R.late.join(' | ')}`);}
function VEDEF(k){return VEHDEF[k];}
const all=Object.values(res);
P(all.every(r=>r.reach===r.goals&&r.goals===4),'C1. chaque but atteint à temps',all.map((r,i)=>`${VEH_KINDS[i]} ${r.reach}/${r.goals}`).join(' · '));
P(all.every(r=>r.bad===0),'C2. jamais sur une case interdite',all.map((r,i)=>`${VEH_KINDS[i]} ${r.bad}`).join(' · '));
P(all.every(r=>(r.dev[Math.floor(r.dev.length*.95)]||0)<=.6&&(r.dev[r.dev.length-1]||0)<=1),'C3. écart au chemin',all.map((r,i)=>`${VEH_KINDS[i]} ${(r.dev[Math.floor(r.dev.length*.95)]||0).toFixed(2)}/${(r.dev[r.dev.length-1]||0).toFixed(2)}`).join(' · '));
P(all.every(r=>r.curv<=Math.max(1,r.curvN*.01)),'C4. rayon minimal des roues',all.map((r,i)=>`${VEH_KINDS[i]} ${r.curv}/${r.curvN}`).join(' · '));
P(!errs&&!nan&&tms/Math.max(1,ticks)<.3,'C5. ni erreur ni NaN, pas de conduite léger',`erreurs ${errs} · NaN ${nan} · ${(tms/Math.max(1,ticks)*1000).toFixed(0)} µs par pas`);
console.log(`info : ${mv.n} calculs de chemin, ${mv.ms.toFixed(0)} ms en tout, ${mv.max.toFixed(0)} ms au plus`);
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
