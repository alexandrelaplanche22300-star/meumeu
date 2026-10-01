const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');
const W=new World(101);W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');const c=W.capital();
const V=VEHDEF.automitrailleuse;let p=null;for(let r=0;r<40&&!p;r++)for(let a=0;a<24&&!p;a++){const x=Math.floor(c.i+30+Math.cos(a/24*6.283)*r)+.5,y=Math.floor(c.j+30+Math.sin(a/24*6.283)*r)+.5;if(W.vehFits(V,x,y,0))p=[x,y];}
const v=W.addCombatVehicle('meumeu','automitrailleuse',p[0],p[1],0);const us=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0).slice(0,2);for(const u of us){u.x=v.x;u.y=v.y;W.vehBoard(v,u);}v.mounts.forEach(m=>m.pouch=1500);
const B=[];for(let n=0;n<4;n++){const u=W.addUnit('beee','soldat',p[0]+15,p[1]-1.5+n,{w:'bee_fusil',rounds:200});u.task={kind:'guard',tx:u.x,ty:u.y};u.spot={meumeu:W.s.t};B.push(u);}
console.log('équipage',v.crew.map(u=>u.vrole),'guerre',W.atWar,'vue',W.sight?.());
for(let k=0;k<24;k++){W.update(.025);const m=v.mounts[0];if(k%3===0)console.log(`t${(k*.025).toFixed(3)} cible ${JSON.stringify(m.target)} yaw ${m.yaw.toFixed(2)} cool ${m.cool?.toFixed(2)} reload ${m.reload?.toFixed(2)} mag ${m.mag} pouch ${m.pouch} aimAt ${m.aimAt} dry ${m.dry} · visible ${W.visibleAt('meumeu',B[0].x,B[0].y)} spotted ${W.spotted(B[0],'meumeu')} los ${W.los(v.x,v.y,B[0].x,B[0].y)}`);}
