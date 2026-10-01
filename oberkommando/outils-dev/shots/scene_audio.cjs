const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  await run(`window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2000);
  console.log(await run(`(async()=>{const a=window.audio;a.init();const out=[];
    const tryit=(n,f)=>{try{f();out.push(n+' ok');}catch(e){out.push(n+' ERREUR '+e.message);}};
    tryit('select',()=>a.play('select',null,{f:'meumeu',n:2}));tryit('ack',()=>a.play('ack',null,{f:'meumeu',n:1}));tryit('cri',()=>a.cry(a.out(null),'meumeu','touche'));tryit('agonie',()=>a.cry(a.out(null),'meumeu','agonie'));tryit('mort',()=>a.cry(a.out(null),'meumeu','mort'));
    tryit('bee',()=>a.cry(a.out(null),'beee','touche'));tryit('oiseau',()=>{for(let i=0;i<4;i++)a.bird();});tryit('grillon',()=>a.cricket());tryit('hibou',()=>a.owl());tryit('ambiance',()=>{a.ambience({battle:2,fire:1,machines:3,night:true,tension:.6});a.ambience({night:false});});
    tryit('tir',()=>a.play('shot',{vol:.9,pan:0,delay:0},{cal:1.8,E:40}));tryit('banque',()=>a.loadBank());
    await new Promise(r=>setTimeout(r,1500));out.push('bank '+Object.keys(a.bank||{}).join(','));out.push('errs '+JSON.stringify(__errs));return out.join(' | ');})()`));
},{w:1200,h:700,out:__dirname});
