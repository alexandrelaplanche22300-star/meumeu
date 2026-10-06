// une ville bèè et sa ceinture de bunkers (sauvegarde bunkers_villes_j25)
const {main}=require('./harness.cjs');const path=require('path');
main(async({run,wait,shot})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/bunkers_villes_j25.json')).text();return window.__load(d);})()`);
  const at=await run(`(async()=>{const D=await import('./js/data.js');const w=world();w.s.fog=false;const bk=w.s.buildings.filter(b=>b.f==='beee'&&b.done&&!b.ruin&&D.BUILDINGS[b.k]?.bunker);const C=w.s.beee.cities.filter(c=>!c.fallen).map(c=>[c,bk.filter(b=>Math.hypot(b.i-c.x,b.j-c.y)<30).length]).sort((a,z)=>z[1]-a[1])[0][0];return [C.x,C.y];})()`);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);document.querySelector('.speeds [data-speed="0"]')?.click();})();0;`);await wait(4000);
  for(const [k,yaw,z] of [[0,0,.42],[1,.7,.6]]){await run(`(()=>{view.yaw=${yaw};view.elev=.55;view.lookAt(${at[0]},${at[1]});view.zoom=${z};view.draw(.01);})();0;`);await wait(1200);await run(`view.draw(.01);0;`);await wait(200);await shot('bunkers_'+k+'.png');}
},{w:900,h:700,out:path.join(__dirname,'centre')});
