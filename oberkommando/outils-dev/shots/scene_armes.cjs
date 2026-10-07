const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2200);
  for(const id of ['mg_lourde_mle1','at_mle1','canon_mle1','bee_mg_lourde']){
    await run(`designer.show('${id}');`);await wait(2400);await run(`document.querySelector('#dz-plan').scrollIntoView({block:'center'});`);await wait(1200);await shot('arme_'+id+'.png');}
  console.log(await run(`JSON.stringify(__errs)`));
},{w:1600,h:1000,out:__dirname});
