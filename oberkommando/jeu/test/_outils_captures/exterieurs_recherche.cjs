// Les extérieurs des bâtiments de recherche (V12.7), toit fermé, dans la partie de test « Recherche » (carte V2) — de jour, puis de nuit (brouillard actif)
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=process.env.OUT||path.join(__dirname,'exterieurs');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);
  await run(`(()=>{const W=new (world().constructor)(4,{map:'v2',assisted:true,sci:true});window.__load(W.serialize());return 1;})()`);
  await run(`(async()=>{await view.set3d?.(true);})();0;`);await wait(3000);
  const look=async(k,z)=>run(`(()=>{const w=world(),b=w.s.buildings.find(x=>x.k==='${k}'&&x.f==='meumeu');const [W,H]=w.sizeOf(b);view.lookAt(b.i+W/2,b.j+H/2);view.zoom=${z};return b.i+','+b.j;})()`);
  const live=async n=>{for(let i=0;i<n;i++){await run(`window.__step(2,1/30);0;`);await wait(30);}};
  for(const [k,z] of [['centre_recherche',2.2],['labo',2.6],['armurerie',3]]){console.log(k,await look(k,z));await live(30);await shot('ext_'+k+'.png');}
  await look('centre_recherche',1.1);await live(30);await shot('ext_ensemble.png');
},{w:1600,h:900,out:OUT});
