const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  await win.loadURL('app://jeu/_pivots.html');for(let k=0;k<60;k++){await wait(200);if(await run('document.title')==='prêt')break;}
  console.log(await run('JSON.stringify(window.__pivots,null,1)'));await shot('pivots_avant.png');
},{w:1800,h:1000,out:__dirname});
