const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const W=new World(104);W.s.fog=false;const v=W.addCombatVehicle('meumeu','jeep_mg',96.8,393.4,-128/57.3);
const t=performance.now();const P=W.vehLong(v,149.2,382.6);console.log('par étapes :',P?P.length+' pts':'échec',(performance.now()-t).toFixed(0)+' ms',P?'rebroussements '+P.filter((p,i)=>i&&p[2]!==P[i-1][2]).length:'');
for(const e of W._long)console.log('  ',JSON.stringify(e));
