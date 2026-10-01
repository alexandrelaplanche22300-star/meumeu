const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2500);
  console.log(await run(`(async()=>{const w=world();await view.set3d(true);w.s.fog=false;const cap=w.capital();document.querySelector('.speeds [data-speed="0"]').click();
    const h0=w.hour();w.s.t+=((13-h0)%24+24)%24;for(let k=0;k<4;k++)w.update(.01);
    const kinds=['jeep','jeep_mg','automitrailleuse','char','automoteur'];const V=k=>w.vehDef({k});window.__veh=[];
    let x=cap.i+10,y=cap.j+14;for(const k of kinds){let p=null;for(let r=0;r<12&&!p;r++)for(let a=0;a<16&&!p;a++){const X=x+Math.cos(a/16*6.28)*r,Y=y+Math.sin(a/16*6.28)*r;if(w.vehFits(V(k),X,Y,0)&&!w.s.vehicles.some(o=>Math.hypot(o.x-X,o.y-Y)<2.6))p=[X,Y];}
      const v=w.addCombatVehicle('meumeu',k,p[0],p[1],1.4);__veh.push(v);x+=3.2;}
    __veh[1].mounts[0].yaw=Math.PI*0.7;__veh[2].mounts.forEach(m=>{m.yaw=.8;m.el=.25;});__veh[3].mounts.forEach(m=>{m.yaw=-.9;m.el=.2;});__veh[4].mounts.forEach(m=>{m.yaw=.18;m.el=.3;});
    const sol=w.s.units.filter(u=>u.f==='meumeu'&&u.k==='soldat').slice(0,5);sol.forEach((u,n)=>{u.x=__veh[n].x+1.4;u.y=__veh[n].y+1.6;u.path=null;u.task=null;u.fx=0;u.fy=1;});
    view.zoom=1.25;view.lookAt(cap.i+17,cap.j+15);for(let i=0;i<4;i++)view.draw(.016);return JSON.stringify({heure:w.hour(),errs:__errs});})()`));
  await wait(500);await shot('veh_4_jour.png');
  console.log(await run(`(()=>{const w=world(),cap=w.capital();__veh.forEach((v,i)=>w.vehMove(v,cap.i+16+i*2.5,cap.j+34));const tr=[];for(let k=0;k<60;k++){w.update(.025);if(k%10===9)tr.push(__veh.slice(0,2).map(v=>[+v.x.toFixed(1),+v.y.toFixed(1),+v.spd.toFixed(1),v.man?'man':'',v.path?.length]));}
    view.zoom=1.25;for(let i=0;i<3;i++)view.draw(.016);return JSON.stringify({tr,errs:__errs});})()`));
  await wait(300);await shot('veh_5_route_jour.png');
},{w:1500,h:900,out:__dirname});
