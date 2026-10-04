// les trois tenues de soldat meumeu (normale, camouflée, élite) côte à côte, fusil en main, sous quatre angles
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=path.join(__dirname,'soldats');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`);
  const at=await run(`(()=>{const w=world();w.s.fog=false;document.querySelector('.speeds [data-speed="0"]')?.click();const cap=w.capital();const x0=cap.i-30,y0=cap.j+30;
    const S=w.s.units.filter(u=>u.f==='meumeu'&&u.k==='soldat'&&u.hp>0&&!u.inBarracks&&u.w&&!w.W(u.w).pistol&&!(w.W(u.w).crew>1)).slice(0,3);
    w.s.units=w.s.units.filter(u=>S.includes(u)||Math.hypot(u.x-x0,u.y-y0)>14);w.s.buildings=w.s.buildings.filter(b=>Math.hypot(b.i-x0,b.j-y0)>14);w.s.nodes.forEach(n=>{if(Math.hypot(n.i-x0,n.j-y0)<14)n.left=0;});
    S.forEach((u,k)=>{u.x=x0+k*1.4;u.y=y0-k*1.4;u.fx=1;u.fy=1;u.task={kind:'guard',tx:u.x,ty:u.y,hold:true};u.path=null;u.anim='idle';u.cool=0;u.post='debout';u.reload=0;u.skin=['meumeu','meumeu_soldat','plush_cow_knight'][k];});return [x0+1.4,y0-1.4,S.map(u=>u.w).join(',')];})()`);
  console.log('armes',at[2]);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);})();0;`);await wait(4000);
  for(const [k,yaw] of [[0,0],[1,.8],[2,-.8],[3,2.4]]){await run(`(()=>{view.yaw=${yaw};view.elev=.32;view.lookAt(${at[0]},${at[1]});view.zoom=3.4;view.draw(.01);})();0;`);await wait(900);await run(`view.draw(.01);0;`);await wait(200);await shot('tenues_'+k+'.png');}
},{w:900,h:700,out:path.join(__dirname,'soldats')});
