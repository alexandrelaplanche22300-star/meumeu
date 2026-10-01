const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2500);
  console.log(await run(`(async()=>{const w=world();await view.set3d(true);w.s.fog=false;const cap=w.capital();document.querySelector('.speeds [data-speed="0"]').click();
    const kinds=['jeep','jeep_mg','automitrailleuse','char','automoteur'];const V=k=>w.vehDef({k});window.__veh=[];
    let x=cap.i+10,y=cap.j+14;for(const k of kinds){let p=null;for(let r=0;r<12&&!p;r++)for(let a=0;a<16&&!p;a++){const X=x+Math.cos(a/16*6.28)*r,Y=y+Math.sin(a/16*6.28)*r;if(w.vehFits(V(k),X,Y,0)&&!w.s.vehicles.some(o=>Math.hypot(o.x-X,o.y-Y)<2.6))p=[X,Y];}
      const v=w.addCombatVehicle('meumeu',k,p[0],p[1],-.6);__veh.push(v);x+=3.2;}
    __veh[1].mounts[0].yaw=Math.PI*0.7;__veh[2].mounts.forEach(m=>{m.yaw=.8;m.el=.25;});__veh[3].mounts.forEach(m=>{m.yaw=-.9;m.el=.2;});__veh[4].mounts.forEach(m=>{m.yaw=.18;m.el=.3;});
    view.zoom=2.2;view.lookAt(cap.i+16,cap.j+14);for(let i=0;i<4;i++)view.draw(.016);return JSON.stringify({n:__veh.length,pos:__veh.map(v=>[v.k,+v.x.toFixed(1),+v.y.toFixed(1)]),errs:__errs});})()`));
  await wait(500);await shot('veh_1_repos.png');
  console.log(await run(`(()=>{const w=world(),cap=w.capital();const r=__veh.map((v,i)=>w.vehMove(v,cap.i+16+i*2.5,cap.j+34));for(let k=0;k<24;k++){w.update(.025);}for(let i=0;i<3;i++)view.draw(.016);return JSON.stringify({ok:r,etat:__veh.map(v=>[v.k,v.state,+v.spd.toFixed(1),v.why||''])});})()`));
  await wait(300);await shot('veh_2_route.png');
  console.log(await run(`(()=>{const w=world();for(let k=0;k<40;k++){w.update(.025);}view.lookAt(__veh[3].x,__veh[3].y);view.zoom=3.4;for(let i=0;i<3;i++)view.draw(.016);return JSON.stringify({etat:__veh.map(v=>[v.k,v.state,+v.x.toFixed(1),+v.y.toFixed(1),+v.spd.toFixed(1)]),errs:__errs});})()`));
  await wait(300);await shot('veh_3_proche.png');
},{w:1500,h:900,out:__dirname});
