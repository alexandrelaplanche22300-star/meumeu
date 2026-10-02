const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');
const W=new World(101);W.s.fog=false;const cap=W.capital(),N=W.N;const V=VEHDEF.jeep_mg,cost=W.vehCost(V);
let s0=null;for(let r=4;r<20&&!s0;r++)for(let a=0;a<24&&!s0;a++){const x=cap.i+2+Math.cos(a/24*6.283)*r,y=cap.j+2+Math.sin(a/24*6.283)*r;if(cost(Math.floor(y)*N+Math.floor(x))!==Infinity)s0=[Math.floor(x)+.5,Math.floor(y)+.5];}
const v=W.addCombatVehicle('meumeu','jeep_mg',s0[0],s0[1],2.5);
const goal=[v.x+30,v.y-12];W.vehMove(v,...goal);console.log('chemin',v.path.length,'pts', v.path.slice(0,8).map(p=>p.map(c=>c.toFixed(1)).join(',')).join(' '));
for(let t=0;t<3;t+=.025){W.combatVehicleTick(v,.025);if(Math.round(t*40)%6===0){const P=v.path;const tgt=P?.[Math.min(P.length-1,v.pi+1)];console.log(`t ${t.toFixed(2)} x ${v.x.toFixed(2)} y ${v.y.toFixed(2)} h ${(v.h*57.3).toFixed(0)} spd ${v.spd.toFixed(1)} steer ${(v.steer*57.3).toFixed(0)} pi ${v.pi}/${P?.length} dev ${(v.dev||0).toFixed(2)} rev ${(v.rev||0).toFixed(2)} state ${v.state} stuck ${(v.stuckT||0).toFixed(2)}`);}if(v.state!=='go')break;}
