const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  const L=[['vintage_military_logistic_jeep_with_gun','+x'],['vintage_armored_car','+z'],['armored_vehicle','+z'],['guncarrier_casemate','-z']];
  for(const [m,f] of L){await win.loadURL('app://jeu/_pose.html?m='+m+'&front='+encodeURIComponent(f)+'&yaw=40&pitch=14&spin=60');for(let k=0;k<40;k++){await wait(150);if(await run('document.title')==='prêt')break;}await shot('pose_'+m+'.png');}
},{w:1600,h:1000,out:__dirname});
