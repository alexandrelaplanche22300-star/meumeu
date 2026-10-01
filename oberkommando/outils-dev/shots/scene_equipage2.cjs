const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);for(let k=0;k<60;k++){await wait(250);if(await run('document.body.innerText.includes("Partie de test prête")'))break;}await wait(800);
  console.log(await run(`(async()=>{const w=world();await view.set3d(true);w.s.fog=false;w.s.solar=13;document.querySelector('.speeds [data-speed="0"]')?.click();const cap=w.capital();const vs=[];
    for(const k of ['jeep_mg','jeep','char']){let p=null;for(let r=0;r<20&&!p;r++)for(let a=0;a<16&&!p;a++){const X=cap.i+14+Math.cos(a/16*6.28)*r,Y=cap.j+14+Math.sin(a/16*6.28)*r;if(w.vehFits(w.vehDef({k}),X,Y,.5)&&!w.s.vehicles.some(o=>Math.hypot(o.x-X,o.y-Y)<3.2))p=[X,Y];}
      const v=w.addCombatVehicle('meumeu',k,p[0],p[1],.5);vs.push(v);const us=w.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh&&u.k==='soldat').slice(0,4);for(const u of us){u.x=v.x;u.y=v.y;w.vehBoard(v,u);}}
    vs[0].mounts[0].yaw=1.1;vs[2].mounts.forEach(m=>m.yaw=-.7);
    view.zoom=3;view.lookAt((vs[0].x+vs[1].x)/2,(vs[0].y+vs[1].y)/2);for(let i=0;i<6;i++)view.draw(.016);
    return JSON.stringify({heure:w.hour(),bord:vs.map(v=>v.k+':'+v.crew.map(u=>u.vrole).join(',')),errs:__errs});})()`));
  for(const ms of [300,1500,4000]){await wait(ms);console.log('après',ms,await run('JSON.stringify({solar:world().s.solar,veh:world().s.vehicles.length,t:+world().s.t.toFixed(3),zoom:view.zoom})'));}await shot('equipage_jeeps.png');
},{w:1500,h:900,out:__dirname});
