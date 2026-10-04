// les soldats meumeu en gros plan : un groupe à l'arrêt, sous trois angles (ENV TAG : préfixe des images)
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=path.join(__dirname,'soldats');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`);
  const at=await run(`(()=>{const w=world();w.s.fog=false;const S=w.s.units.filter(u=>u.f==='meumeu'&&u.k==='soldat'&&u.hp>0&&!u.inBarracks&&u.w);let best=null,bn=0;for(const a of S){const n=S.filter(b=>Math.hypot(a.x-b.x,a.y-b.y)<5).length;if(n>bn){bn=n;best=a;}}
    /* (un rang de cinq, face au sud-est, à l'arrêt, l'un en visée) */const g=S.filter(b=>Math.hypot(best.x-b.x,best.y-b.y)<5).slice(0,5);g.forEach((u,k)=>{u.x=best.x+k*1.1;u.y=best.y;u.fx=1;u.fy=1;u.task={kind:'guard',tx:u.x,ty:u.y,hold:true};u.path=null;u.anim=k===4?'aim':'idle';u.cool=k===4?1:0;});return [best.x+2.2,best.y,g.length];})()`);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);document.querySelector('.speeds [data-speed="0"]')?.click();})();0;`);await wait(4000);
  for(const [k,yaw] of [[0,0],[1,.9],[2,-.9]]){await run(`(()=>{view.yaw=${yaw};view.elev=.32;view.lookAt(${at[0]},${at[1]});view.zoom=5;view.draw(.01);})();0;`);await wait(900);await run(`view.draw(.01);0;`);await wait(200);await shot((process.env.TAG||'avant')+'_'+k+'.png');}
},{w:900,h:700,out:path.join(__dirname,'soldats')});
