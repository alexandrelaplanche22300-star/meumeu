// la pyramide en chantier (à 40 %) et en ruine, à côté de celle qui est finie
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=path.join(__dirname,'centre');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`);
  const at=await run(`(()=>{const w=world();w.s.fog=false;const C=w.s.buildings.filter(o=>o.k==='centre'&&o.f==='meumeu'&&o.done&&!o.ruin);const a=C[1],b=C[2]||C[0];a.done=false;a.progress=.4;b.ruin=true;b.done=false;b.progress=.2;return [a.i+2,a.j+2,b.i+2,b.j+2];})()`);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);document.querySelector('.speeds [data-speed="0"]')?.click();})();0;`);await wait(4000);
  for(const [x,y,n] of [[at[0],at[1],'pyr_chantier.png'],[at[2],at[3],'pyr_ruine.png']]){await run(`(()=>{view.yaw=0;view.elev=.5;view.lookAt(${x}-1.2,${y}-1.2);view.zoom=2;view.draw(.01);})();0;`);await wait(900);await run(`view.draw(.01);0;`);await wait(200);await shot(n);}
},{w:900,h:700,out:path.join(__dirname,'centre')});
