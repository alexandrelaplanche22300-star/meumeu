// mesure : l'A* hybride d'un seul tenant sur toute la carte, sur les longs détours qui posaient problème
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
for(const [seed,k,x,y,h,tx,ty] of [[104,'jeep_mg',96.8,393.4,-128,149.2,382.6],[106,'jeep',0,0,0,0,0]]){const W=new World(seed);W.s.fog=false;
  let v;if(seed===106){// le premier but de la jeep sur 106 : rejouer la sélection du test
    const N=W.N,cap=W.capital();const V=(await import('../js/vehicules.js')).VEHDEF.jeep;const cost=W.vehCost(V);const rnd=(()=>{let a=seed*9301+49297;return ()=>((a=(a*9301+49297)%233280)/233280);})();
    let s0=null;for(let r=4;r<20&&!s0;r++)for(let a=0;a<24&&!s0;a++){const X=cap.i+2+Math.cos(a/24*6.283)*r,Y=cap.j+2+Math.sin(a/24*6.283)*r;if(cost(Math.floor(Y)*N+Math.floor(X))!==Infinity)s0=[Math.floor(X)+.5,Math.floor(Y)+.5];}
    v=W.addCombatVehicle('meumeu','jeep',s0[0],s0[1],rnd()*6.28);let goal=null;for(let t=0;t<80&&!goal;t++){const a=rnd()*6.283,r=25+rnd()*35;const X=v.x+Math.cos(a)*r,Y=v.y+Math.sin(a)*r;if(X<3||Y<3||X>N-3||Y>N-3)continue;if(cost(Math.floor(Y)*N+Math.floor(X))===Infinity)continue;if(W.vehPlan(v,X,Y))goal=[X,Y];}
    tx=goal[0];ty=goal[1];}
  else v=W.addCombatVehicle('meumeu',k,x,y,h/57.3);
  const G=W.vehPlan(v,tx,ty);const gl=G?G.reduce((a,p,n)=>n?a+Math.hypot(p[0]-G[n-1][0],p[1]-G[n-1][1]):0,0):0;
  for(const [mx,m] of [[60000,40],[200000,120],[600000,500]]){const t=performance.now();const P=W.vehHybrid(v,tx,ty,mx,m);console.log(`graine ${seed} ${v.k} : grille ${gl.toFixed(0)} cases · hybride fenêtre ${m} / ${mx} nœuds → ${P?P.length+' pts':'échec'} en ${(performance.now()-t).toFixed(0)} ms · ${JSON.stringify(W._hyb)}`);}}
