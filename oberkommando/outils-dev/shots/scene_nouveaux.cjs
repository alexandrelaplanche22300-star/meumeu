const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  const L=['armored_vehicle','vintage_armored_car','atank','guncarrier_casemate','huge_cannon','heavy_carriage','mg_shield_wheels','assault_rifle_ir','rocket_launch','historic_rocket_a','historic_rocket_b'];
  await win.loadURL('app://jeu/_planche.html?m='+L.join(',')+'&a=.7');await wait(2000);await shot('nouveaux_a.png');
  await win.loadURL('app://jeu/_planche.html?m='+L.join(',')+'&a=2.4');await wait(2000);await shot('nouveaux_b.png');
},{w:1600,h:900,out:__dirname});
