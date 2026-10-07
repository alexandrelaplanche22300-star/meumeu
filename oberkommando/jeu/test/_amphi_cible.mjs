// Les plages choisies par les Bèè pour huit assauts successifs, depuis une sauvegarde : node test/_amphi_cible.mjs <sauvegarde>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const B=W.s.beee;
const cities=B.cities.filter(c=>!c.fallen);const base=cities.sort((a,z)=>z.x-a.x)[Math.floor(cities.length/2)];
console.log(`base ${base.name} (${base.x|0},${base.y|0}) · bâtiments meumeu connus ${W.s.buildings.filter(b=>b.f==='meumeu'&&B.known?.[b.id]).length} · têtes de pont ${(B.heads||[]).length}`);
const t0=performance.now();const picks=[];
for(let k=0;k<8;k++){const a=W.amphiBeeAim(base);if(!a){console.log('assaut',k+1,': aucune plage');continue;}(B.amphiUsed??=[]).push({x:a[0],y:a[1],t:W.s.t});picks.push(a);W.s.t+=24*10;
  console.log(`assaut ${k+1} : plage (${a[0]|0}, ${a[1]|0})${picks.length>1?` · à ${Math.round(Math.hypot(a[0]-picks[picks.length-2][0],a[1]-picks[picks.length-2][1]))} cases de la précédente`:''}`);}
const ys=picks.map(p=>p[1]);console.log(`étendue nord-sud : ${Math.round(Math.max(...ys)-Math.min(...ys))} cases · ${((performance.now()-t0)/8).toFixed(0)} ms par choix`);
