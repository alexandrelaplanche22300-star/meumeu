const {main}=require('./harness.cjs');const path=require('path');
const L=JSON.parse(process.env.OKM_LIST);
main(async({run,shot,wait,win})=>{
  for(const it of L){await win.loadURL('app://jeu/_vue.html?m='+it.m+'&a='+(it.a||'0,90,180,270')+'&e='+(it.e||.35));await wait(1300);await run('window.__draw()');await wait(250);await shot('vue_'+it.m+'.png');}
},{w:1600,h:450,out:__dirname});
