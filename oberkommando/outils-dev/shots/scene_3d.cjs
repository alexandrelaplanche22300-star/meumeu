const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win,logs})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2500);
  await shot('3d_00_2d.png');
  const r=await run(`(async()=>{const cap=world().capital();view.lookAt(cap.i+2,cap.j+2);view.zoom=1.2;const ok=await view.set3d(true);return JSON.stringify({ok,errs:__errs});})()`);console.log(r);
  await wait(2500);await shot('3d_01_on.png');
  console.log(await run(`JSON.stringify({errs:__errs})`));
},{w:1500,h:900,out:__dirname});
