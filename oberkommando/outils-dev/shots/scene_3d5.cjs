const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2500);
  console.log(await run(`(async()=>{const w=world();await view.set3d(true);w.s.fog=false;const cap=w.capital();
    const put=(k,di,dj)=>{const at=w.buildSpot('meumeu',k,cap.i+di,cap.j+dj,0,24);return at?w.addBuilding('meumeu',k,at[0],at[1],true):null;};
    const r=[put('tour',9,-3),put('arsenal',10,4),put('moulin',-9,4)].map(b=>!!b);
    view.zoom=1.3;view.lookAt(cap.i+4,cap.j+2);view.draw(0);
    return JSON.stringify({r,errs:__errs});})()`));
  await wait(1500);await shot('3d_08_lot.png');
  await run(`view.zoom=.8;view.lookAt(world().capital().i+30,world().capital().j-20);`);await wait(1200);await shot('3d_09_rochers.png');
  console.log(await run(`JSON.stringify(__errs)`));
},{w:1500,h:900,out:__dirname});
