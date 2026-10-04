// le moulin seul (les autres bâtiments masqués), de près, quatre angles, ailes à l'arrêt en croix puis en X
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=path.join(__dirname,'moulin');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`);
  const at=await run(`(()=>{const w=world();w.s.fog=false;const m=w.s.buildings.find(b=>b.k==='moulin'&&b.f==='meumeu'&&b.done&&!b.ruin);w.s.units=w.s.units.filter(u=>Math.hypot(u.x-m.i,u.y-m.j)>14);w.s.nodes.forEach(n=>{if(Math.hypot(n.i-m.i,n.j-m.j)<14)n.left=0;});return [m.id,m.i+1.5,m.j+1.5];})()`);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);document.querySelector('.speeds [data-speed="0"]')?.click();})();0;`);await wait(4000);
  for(const [k,yaw] of [[0,0],[1,1.57],[2,3.14],[3,4.71]]){
    await run(`(()=>{view.yaw=${yaw};view.elev=.42;view.lookAt(${at[1]}-1.6*Math.cos(${yaw})+1.6*Math.sin(${yaw}),${at[2]}-1.6*Math.cos(${yaw})-1.6*Math.sin(${yaw}));view.zoom=2.6;const g3=view.g3;for(const [id,e] of g3.blds)e.g.visible=id===${at[0]};view.draw(.01);})();0;`);await wait(800);
    await run(`(()=>{for(const [id,e] of view.g3.blds)e.g.visible=id===${at[0]};view.draw(.01);})();0;`);await wait(300);await shot('s'+k+'.png');}
},{w:900,h:700,out:path.join(__dirname,'moulin')});
