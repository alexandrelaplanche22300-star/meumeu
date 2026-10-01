const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');
const W=new World(101);W.s.fog=false;const N=W.N;
const v=W.addCombatVehicle('meumeu','jeep',57.5,383.5,49/57.3);const V=VEHDEF.jeep;const cost=W.vehCost(V);
const hl=V.long*.42,hw=V.large*.42;const free=(x,y)=>cost(Math.floor(y)*N+Math.floor(x))!==Infinity;const c=Math.cos(v.h),s=Math.sin(v.h);
console.log('départ libre',free(v.x,v.y),'avant',free(v.x+c*hl,v.y+s*hl),'arrière',free(v.x-c*hl,v.y-s*hl),'flancs',free(v.x-s*hw,v.y+c*hw),free(v.x+s*hw,v.y-c*hw),'but libre',free(89.9,358.4));
let t=performance.now();const P=W.vehHybrid(v,89.9,358.4);console.log('hybride',P?P.length+' pts':'null',(performance.now()-t).toFixed(0)+' ms',JSON.stringify(W._hyb));
t=performance.now();const P2=W.vehHybrid(v,89.9,358.4,400000);console.log('hybride (400k)',P2?P2.length+' pts':'null',(performance.now()-t).toFixed(0)+' ms');
// le voisinage du départ
let rows=[];for(let dj=-4;dj<=4;dj++){let r='';for(let di=-4;di<=4;di++)r+=cost((Math.floor(v.y)+dj)*N+Math.floor(v.x)+di)===Infinity?'#':'.';rows.push(r);}console.log(rows.join('\n'));
