const {main}=require('./harness.cjs');const path=require('path');
const SETS=[['meumeu','goat_plush_toy','armored_meumeu_vehicle','vintage_military_jeep_logistic_unarmed','ww2_locomotive','ww2_wagon','gewehr_43_rifle','heavy_machine_gun','assault_rifle','armored_car'],
 ['coastal_tavern','architectural_building','industrial_warehouse_3d_model','windmill','steampunk_hut','medieval_forge_3d_model','medieval_stone_oven_3d_model','steampunk_refinery_3d_model','industrial_plant','stylized_camp_tent_3d_model']];
let k=0;
main(async({run,shot,wait,win})=>{
  for(const s of SETS){await win.loadURL('app://jeu/_planche3d.html?m='+s.join(','));await wait(1200);await run('window.__draw(0)');await wait(300);await shot('front_'+(k++)+'.png');}
},{w:1500,h:600,out:__dirname});
