const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');
const W=new World(101);W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');const c=W.capital();
const V=VEHDEF.automoteur;let p=null;for(let r=0;r<40&&!p;r++)for(let a=0;a<24&&!p;a++){const x=Math.floor(c.i+30+Math.cos(a/24*6.283)*r)+.5,y=Math.floor(c.j+30+Math.sin(a/24*6.283)*r)+.5;if(W.vehFits(V,x,y,0))p=[x,y];}
const v=W.addCombatVehicle('meumeu','automoteur',p[0],p[1],-Math.PI/2);const us=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0).slice(0,4);for(const u of us){u.x=v.x;u.y=v.y;W.vehBoard(v,u);}
v.mounts.forEach((m,i)=>{const mag=W.W(m.w).p.mag||1;m.mag=Math.min(mag,V.armes[i].coups);m.pouch=V.armes[i].coups-m.mag;});
console.log('équipage',v.crew.map(u=>u.vrole).join(','),'pièces',W.vehPieces(V),'servants pour',JSON.stringify(Object.keys(W.vehCrewFor(v,V).gunner).map(k=>[k,!!W.vehCrewFor(v,V).gunner[k]])));
const G=[[9,-.4],[9.5,.5],[8.8,1]].map(([dx,dy])=>{const u=W.addUnit('beee','soldat',p[0]+dx,p[1]+dy,{w:'bee_fusil',rounds:200});u.task={kind:'guard',tx:u.x,ty:u.y};u.spot={meumeu:W.s.t};return u;});
for(let k=0;k<48;k++){W.update(.025);const m=v.mounts[0];if(k%4===0){const mz=W.vehMuzzle(v,V.armes[0],m.yaw);const tg=m.target&&W.unit(m.target.id);console.log(`t${(k*.025).toFixed(2)} cap ${(v.h*57.3).toFixed(0)} cible ${JSON.stringify(m.target)} yaw ${(m.yaw*57.3).toFixed(1)} cool ${m.cool?.toFixed(2)} mag ${m.mag}/${m.pouch} aimAt ${m.aimAt} · relèvement ${tg?(Math.atan2(tg.y-mz.by,tg.x-mz.bx)*57.3).toFixed(1):'-'}`);}}
