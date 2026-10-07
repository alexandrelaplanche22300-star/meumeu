const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2500);
  console.log(await run(`(async()=>{const w=world();await view.set3d(true);w.s.fog=false;const cap=w.capital();
    const fa=(w.s.fauna||[]).filter(a=>a.alive).slice(0,3);const info=[w.s.fauna?.length,w.s.vehicles.length,w.s.buildings.length];
    // un enclos avec des animaux, un moulin, la charrette
    let en=null;    const at2=w.buildSpot('meumeu','moulin',cap.i+9,cap.j+3,0,24);let mo=null;if(at2)mo=w.addBuilding('meumeu','moulin',at2[0],at2[1],true);
    const fa2=(w.s.fauna||[]).find(a=>a.alive);if(fa2){fa2.x=cap.i+5;fa2.y=cap.j+9;}view.zoom=1.4;view.lookAt(cap.i+8,cap.j+5);view.draw(0);
    return JSON.stringify({info,en:!!en,mo:!!mo,errs:__errs});})()`));
  await wait(1200);await shot('3d_07_enclos.png');
  console.log(await run(`JSON.stringify(__errs)`));
},{w:1500,h:900,out:__dirname});
