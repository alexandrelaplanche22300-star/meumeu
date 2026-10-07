// des Bèè armés (vraies armes bèè) de jour, brouillard actif mais vus par nos soldats : le bras droit tendu tient l'arme ; quatre angles
const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');fs.mkdirSync(path.join(__dirname,'soldats'),{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`);
  const at=await run(`(()=>{const w=world();w.s.fog=true;w.s.t=Math.floor(w.s.t/24)*24+36;w.s.solar=12;document.querySelector('.speeds [data-speed="0"]')?.click();const cap=w.capital(),x0=cap.i-30,y0=cap.j+30;
    const M=w.s.units.find(u=>u.f==='meumeu'&&u.k==='soldat'&&u.hp>0&&!u.inBarracks);M.x=x0-4;M.y=y0;M.fx=1;M.fy=0;M.task={kind:'guard',tx:M.x,ty:M.y,hold:true};
    const ws=['bee_fusil','bee_mg','bee_fusil'];const B=ws.map((wid,k)=>{const b=w.addUnit('beee','soldat',x0+k*1.6,y0+k*.6,{w:wid});b.fx=-1;b.fy=0;b.task={kind:'guard',tx:b.x,ty:b.y,hold:true};b.holdFire=true;b.spot={meumeu:w.s.t};return b;});
    for(let k=0;k<20;k++){w.update(1/600);for(const b of B)b.spot={meumeu:w.s.t};}window.__B=B.map(b=>b.id);return [x0+1.6,y0+.6,w.light().toFixed(2),B.map(b=>b.w+'/'+w.W(b.w).pistol+'/'+w.W(b.w).crew).join(' ')];})()`);
  console.log('lumière',at[2],'armes',at[3]);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);})();0;`);await wait(4000);
  for(const [k,yaw] of [[0,0],[1,1.2],[2,2.8],[3,-1.4]]){await run(`(()=>{for(const id of window.__B){const b=world().unit(id);b.spot={meumeu:world().s.t};}view.yaw=${yaw};view.elev=.32;view.lookAt(${at[0]},${at[1]});view.zoom=3.6;view.draw(.01);})();0;`);await wait(800);await run(`(()=>{for(const id of window.__B){const b=world().unit(id);b.spot={meumeu:world().s.t};}view.draw(.01);})();0;`);await wait(200);await shot('bee_'+k+'.png');}
},{w:900,h:700,out:path.join(__dirname,'soldats')});
