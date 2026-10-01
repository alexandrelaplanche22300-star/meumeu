const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  for(const m of ['vintage_military_logistic_jeep_with_gun','armored_car','armored_vehicle','guncarrier_casemate','vintage_armored_car','heavy_carriage']){
    await win.loadURL('app://jeu/_pieces.html?m='+m);for(let k=0;k<40;k++){await wait(150);if(await run('document.title')==='prêt')break;}await shot('pieces_'+m+'.png');}
},{w:1600,h:1000,out:__dirname});
