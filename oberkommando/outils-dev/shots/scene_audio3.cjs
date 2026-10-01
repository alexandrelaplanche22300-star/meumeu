const {main}=require('./harness.cjs');const path=require('path');
const steps={select:"a.play('select',null,{f:'meumeu',n:2})",ack:"a.play('ack',null,{f:'meumeu',n:1})",cri:"a.cry(a.out(null),'meumeu','touche')",agonie:"a.cry(a.out(null),'meumeu','agonie')",mort:"a.cry(a.out(null),'meumeu','mort')",bee:"a.cry(a.out(null),'beee','touche')",oiseau:"for(let i=0;i<4;i++)a.bird()",grillon:"a.cricket()",hibou:"a.owl()",ambiance:"a.ambience({battle:2,fire:1,machines:3,night:true,tension:.6});a.ambience({night:false})",tir:"a.play('shot',{vol:.9,pan:0,delay:0},{cal:1.8,E:40})",banque:"a.loadBank()"};
main(async({run,shot,wait,win,logs})=>{
  await wait(1200);await run(`window.audio.init();`);
  for(const [k,code] of Object.entries(steps)){const r=await Promise.race([run(`(()=>{const a=window.audio;try{${code};return 'ok';}catch(e){return 'ERREUR '+e.message;}})()`),new Promise(r=>setTimeout(()=>r('BLOQUE'),4000))]);console.log(k,r);if(r==='BLOQUE')break;}
  await wait(1500);console.log(await run(`Object.keys(window.audio.bank||{}).join(',')`));
},{w:900,h:600,out:__dirname});
