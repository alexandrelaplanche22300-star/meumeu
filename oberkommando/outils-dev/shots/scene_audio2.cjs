const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win,logs})=>{
  await wait(1500);
  console.log(await run(`typeof window.audio+' '+(window.audio&&typeof window.audio.bird)+' '+(window.audio&&typeof window.audio.cricket)`));
  console.log(await run(`(()=>{const a=window.audio;try{a.init();return 'init ok ctx='+(a.ctx&&a.ctx.state);}catch(e){return 'init ERREUR '+e.message;}})()`));
},{w:900,h:600,out:__dirname});
