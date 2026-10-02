const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {VEHDEF}=await import('../js/vehicules.js');
const W=new World(101);W.s.fog=false;if(!W.atWar)W.declareWar('meumeu');const c=W.capital();
const V=VEHDEF.char;let p=null;for(let r=0;r<40&&!p;r++)for(let a=0;a<24&&!p;a++){const x=Math.floor(c.i+30+Math.cos(a/24*6.283)*r)+.5,y=Math.floor(c.j+30+Math.sin(a/24*6.283)*r)+.5;if(W.vehFits(V,x,y,0))p=[x,y];}
const v=W.addCombatVehicle('meumeu','char',p[0],p[1],0);const us=W.s.units.filter(u=>u.f==='meumeu'&&u.hp>0).slice(0,3);for(const u of us){u.x=v.x;u.y=v.y;W.vehBoard(v,u);}
v.mounts.forEach((m,i)=>{const mag=W.W(m.w).p.mag||1;m.mag=Math.min(mag,V.armes[i].coups);m.pouch=V.armes[i].coups-m.mag;});
const Wc=W.W('canon_char_mle1');console.log('canon : mag',Wc.p.mag,'action',Wc.p.action,'aim',Wc.aim,'cyc',Wc.cyc,'he',!!Wc.he,'classe',W.vehClass(Wc),'eff',Wc.eff);
const G=[[9,-.5],[9.6,.4],[8.8,.9],[9.3,-1.1]].map(([dx,dy])=>{const u=W.addUnit('beee','soldat',p[0]+dx,p[1]+dy,{w:'bee_fusil',rounds:200});u.task={kind:'guard',tx:u.x,ty:u.y};u.spot={meumeu:W.s.t};return u;});
for(let k=0;k<60;k++){W.update(.025);const m=v.mounts[0];if(k%6===0)console.log(`t${(k*.025).toFixed(2)} cible ${JSON.stringify(m.target)} yaw ${m.yaw.toFixed(2)} cool ${m.cool?.toFixed(2)} reload ${m.reload?.toFixed(2)} mag ${m.mag}/${m.pouch} aimAt ${m.aimAt} · coax ${v.mounts[1].mag}/${v.mounts[1].pouch}`);}
