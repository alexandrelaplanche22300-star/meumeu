const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');
const all=fs.readdirSync(process.env.OKM_ROOT+'/assets3d').filter(f=>f.endsWith('.json')&&!f.startsWith('_')).map(f=>f.slice(0,-5));
const SETS=JSON.parse(process.env.OKM_SETS||'null')||[all.slice(0,15),all.slice(15,30),all.slice(30)];
let k=0;
main(async({run,shot,wait,win})=>{
  for(const s of SETS){await win.loadURL('app://jeu/_planche3d.html?m='+s.join(','));await wait(1500);await run('window.__draw(.7)');await wait(300);await shot('planche_'+(k++)+'.png');}
},{w:1500,h:900,out:__dirname});
