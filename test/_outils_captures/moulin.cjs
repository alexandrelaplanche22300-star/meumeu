// le moulin en gros plan : avec et sans les ailes du code, quatre angles
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=path.join(__dirname,'moulin');fs.mkdirSync(OUT,{recursive:true});
main(async({win,run,wait,shot})=>{
  await wait(1500);console.log('jour',await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`));
  const at=await run(`(()=>{const w=world();w.s.fog=false;const m=w.s.buildings.find(b=>b.k==='moulin'&&b.f==='meumeu'&&b.done&&!b.ruin);return [m.id,m.i+1.5,m.j+1.5];})()`);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);document.querySelector('.speeds [data-speed="0"]')?.click();})();0;`);await wait(4000);
  for(const [k,yaw] of [[0,0],[1,1.57],[2,3.14],[3,4.71]])for(const sails of [true,false]){
    await run(`(()=>{view.yaw=${yaw};view.elev=.42;view.lookAt(${at[1]},${at[2]});view.zoom=2.3;const g3=view.g3;const e=g3?.blds?.get(${at[0]});if(e?.g?.userData?.spin)e.g.userData.spin.visible=${sails};view.draw(.01);})();0;`);await wait(900);
    await run(`(()=>{const e=view.g3?.blds?.get(${at[0]});if(e?.g?.userData?.spin)e.g.userData.spin.visible=${sails};view.draw(.01);})();0;`);await wait(300);
    await shot(`m${k}_${sails?'ailes':'sans'}.png`);}
},{w:900,h:700,out:path.join(__dirname,'moulin')});
