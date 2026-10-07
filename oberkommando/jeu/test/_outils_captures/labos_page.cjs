// la page de contrôle des intérieurs de recherche (_labos.html) : OKM_PAGE=app://jeu/_labos.html[?el=..&ext=1] NAME=fichier.png
const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');const OUT=process.env.OUT||path.join(__dirname,'labos');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{for(let i=0;i<60&&!(await run('!!window.__done'));i++)await wait(250);console.log(await run(`document.getElementById('info').textContent`));await shot(process.env.NAME||'labos.png');},{w:1600,h:1140,out:OUT});
