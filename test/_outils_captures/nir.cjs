// la vision infrarouge de nuit : trois soldats, tube allumé, regardant vers des bâtiments ; en 3D puis en 2D
const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');fs.mkdirSync(path.join(__dirname,'nir'),{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`);
  const at=await run(`(()=>{const w=world();w.s.fog=false;document.querySelector('.speeds [data-speed="0"]')?.click();const cap=w.capital();const S=w.s.units.filter(u=>u.f==='meumeu'&&u.k==='soldat'&&u.hp>0&&!u.inBarracks).slice(0,3);
    S.forEach((u,k)=>{u.x=cap.i-6+k*3;u.y=cap.j+14;u.fx=.3*(k-1);u.fy=-1;u.nvOn=true;u.bino=34;u.irLeft=20;u.irMax=20;u.task={kind:'guard',tx:u.x,ty:u.y,hold:true};u.path=null;});return [cap.i-3,cap.j+6,w.light().toFixed(2),w.hour().toFixed(1)];})()`);
  console.log('lumière',at[2],'heure',at[3]);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);})();0;`);await wait(4000);
  await run(`(()=>{view.yaw=0;view.elev=.6;view.lookAt(${at[0]},${at[1]});view.zoom=1.0;view.draw(.01);})();0;`);await wait(1200);await run(`view.draw(.01);0;`);await wait(200);await shot('nir_3d.png');
  await run(`(async()=>{await view.set3d(false);view.lookAt(${at[0]},${at[1]});view.zoom=1.0;view.draw(.01);})();0;`);await wait(2500);await run(`view.draw(.01);0;`);await wait(200);await shot('nir_2d.png');
},{w:900,h:700,out:path.join(__dirname,'nir')});
