const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  const L=(process.env.MODS||'').split(',');const V=(process.env.VUES||'0,1,3').split(',');
  for(const m of L)for(const v of V){await win.loadURL('app://jeu/_pieces.html?m='+m+'&v='+v+'&min='+(process.env.MIN||0));for(let k=0;k<40;k++){await wait(150);if(await run('document.title')==='prêt')break;}await shot('pc_'+m+'_'+v+'.png');}
},{w:1600,h:1000,out:__dirname});
