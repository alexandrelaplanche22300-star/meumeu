// le centre-ville meumeu (pyramide) sous quatre angles, et un centre bèè pour comparer
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=path.join(__dirname,'centre');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`);
  const at=await run(`(()=>{const w=world();w.s.fog=false;const c=w.capital();const b=w.s.buildings.find(o=>o.k==='centre'&&o.f==='beee'&&o.done&&!o.ruin);w.s.units=w.s.units.filter(u=>Math.hypot(u.x-c.i-2,u.y-c.j-2)>9);return [c.i+2,c.j+2,b.i+2,b.j+2];})()`);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);document.querySelector('.speeds [data-speed="0"]')?.click();})();0;`);await wait(4000);
  const go=async(x,y,yaw,z,name)=>{await run(`(()=>{view.yaw=${yaw};view.elev=.5;view.lookAt(${x}-1.2*Math.cos(${yaw})+1.2*Math.sin(${yaw}),${y}-1.2*Math.cos(${yaw})-1.2*Math.sin(${yaw}));view.zoom=${z};view.draw(.01);})();0;`);await wait(900);await run(`view.draw(.01);0;`);await wait(200);await shot(name);};
  await go(at[0],at[1],0,1.1,'az_ville1.png');await go(at[0]+6,at[1]+8,.6,.75,'az_ville2.png');
  
},{w:900,h:700,out:path.join(__dirname,'centre')});
