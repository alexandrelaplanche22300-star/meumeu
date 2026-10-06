// les onglets du panneau de la vue recherche (Carnet, Savoir, Bâtiment), sur la sauvegarde test/_saves/recherche.json
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=process.env.OUT||path.join(__dirname,'recherche');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);
  await run(`(async()=>{const d=await (await fetch('test/_saves/recherche.json')).text();return window.__load(d);})()`);await run(`(async()=>{await view.set3d?.(true);})();0;`);await wait(2500);
  await run(`(()=>{const w=world();for(let t=0;t<6;t+=.05)w.update(.05);const b=w.s.buildings.find(x=>x.k==='centre_recherche');view.enterLab(b);ui.R&&(ui.R.tab='projets');})();0;`);
  const live=async n=>{for(let i=0;i<n;i++){await run(`window.__step(3,1/30);0;`);await wait(30);}};
  for(const t of ['carnet','savoir','batiment']){await run(`document.querySelector('[data-r="tab:${t}"]')?.click();0;`);await live(25);await shot('o_'+t+'.png');}
},{w:1600,h:900,out:OUT});
