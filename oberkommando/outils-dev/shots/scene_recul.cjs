const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);for(let k=0;k<60;k++){await wait(250);if(await run('document.body.innerText.includes("Partie de test prête")'))break;}await wait(800);
  console.log(await run(`(async()=>{const w=world();await view.set3d(true);const cap=w.capital();const out={};
    for(const k of ['char','automoteur','automitrailleuse']){let p=null;for(let r=0;r<20&&!p;r++)for(let a=0;a<16&&!p;a++){const X=cap.i+14+Math.cos(a/16*6.28)*r,Y=cap.j+14+Math.sin(a/16*6.28)*r;if(w.vehFits(w.vehDef({k}),X,Y,0)&&!w.s.vehicles.some(o=>Math.hypot(o.x-X,o.y-Y)<3))p=[X,Y];}
      const v=w.addCombatVehicle('meumeu',k,p[0],p[1],0);const V=w.vehDef(v);const g3=view.g3;g3.syncVehicle(v,V,.016);const U=g3.vehs.get(v.id).g.userData;
      const m0=V.armes[0];g3.kick(v.id,{veh:v.id,mount:m0.id,cal:w.W(m0.w).p.d});const part=Object.keys(U.parts).find(n=>n==='canon'||n==='armes'||n.startsWith('canons'));const M=U.parts[part].userData.mesh;
      const tr=[];for(let f=0;f<40;f++){g3.syncVehicle(v,V,.016);if(f%4===0)tr.push(+((M.position.distanceTo(M.userData.base))*U.sc).toFixed(4));}out[k]={piece:part,recul_cases:tr};}
    return JSON.stringify({out,errs:__errs});})()`));
},{w:1200,h:800,out:__dirname});
