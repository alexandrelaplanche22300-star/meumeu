// Captures V12.8 : les nouveaux modèles de soldat (classique ; protégé : casque et plaque), arme en main (bras droit tendu), de jour, en 3D.
const {main}=require('./pw_harness.cjs');const OUT=process.env.OUT||'/home/user/v128/shots';
main(async({run,wait,shot})=>{
  console.log(await run(`(async()=>{const w=world();w.s.fog=false;w.s.t=Math.floor(w.s.t/24)*24+13;const c=w.capital();const x0=c.i+8,y0=c.j+10;const out=[];
    for(let n=0;n<6;n++){const u=w.addUnit('meumeu','soldat',x0+(n%3)*.9,y0+Math.floor(n/3)*1.1,{w:'mle1',rounds:30});u.skin='meumeu';u.fx=0;u.fy=1;if(n>=3){u.armor='gilet';u.plates={};}out.push(u.id);}
    await view.set3d?.(true);view.lookAt(x0+1,y0+.6);view.zoom=4;view.sel.clear();return out.join(',');})()`));
  for(let i=0;i<40;i++){await run(`window.__step(1,1/30);0;`);await wait(40);}
  await shot('20_soldats_classiques_et_proteges.png');
  await run(`(()=>{view.zoom=7;})();0;`);for(let i=0;i<20;i++){await run(`window.__step(1,1/30);0;`);await wait(40);}await shot('21_soldats_gros_plan.png');
},{w:1400,h:860,out:OUT});
