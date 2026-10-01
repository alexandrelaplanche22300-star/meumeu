const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2200);
  await run(`designer.show('fusees_mle1');`);await wait(2500);await shot('fusees_designer.png');
  await run(`designer.active.fire();`);await wait(300);await shot('fusees_tir.png');
  console.log(await run(`JSON.stringify(__errs)`));
},{w:1600,h:1000,out:__dirname});
