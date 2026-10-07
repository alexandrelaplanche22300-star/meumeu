// La page de contrôle d’un modèle (_cape.html, ou _modele.html) capturée : OKM_PAGE='app://jeu/_modele.html?m=…#r=…' NOM=fichier.png
const {main}=require('./harness.cjs');const path=require('path');
main(async({run,wait,shot})=>{for(let i=0;i<40;i++){if(await run('!!window.__done'))break;await wait(250);}await wait(300);console.log(await run(`document.getElementById('info').textContent`));await shot(process.env.NOM||'modele.png');},{w:1600,h:840,out:process.env.OUT||__dirname});
