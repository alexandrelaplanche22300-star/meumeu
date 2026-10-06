// le plan de la carte V2 vu du dessus : le terrain, les gisements (couleur par ressource), la capitale (blanc) et les villes bèè (rouge)
const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');fs.mkdirSync(path.join(__dirname,'carte'),{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);
  await run(`(async()=>{const {generate}=await import('./js/gen.js');const G=generate(${process.env.SEED||7},'${process.env.MODE||'v2'}');const N=G.N,S=440/N;
    const cv=document.createElement('canvas');cv.width=440;cv.height=440;Object.assign(cv.style,{position:'fixed',left:'0',top:'0',zIndex:99999});document.body.appendChild(cv);const g=cv.getContext('2d');
    const img=g.createImageData(440,440);for(let y=0;y<440;y++)for(let x=0;x<440;x++){const t=G.terrain[Math.floor(y/S)*N+Math.floor(x/S)];const c=t===0||t===1?[40,70,110]:G.comp[Math.floor(y/S)*N+Math.floor(x/S)]===G.main?[70+t*6,110+t*4,60]:[90,90,90];const o=4*(y*440+x);img.data[o]=c[0];img.data[o+1]=c[1];img.data[o+2]=c[2];img.data[o+3]=255;}
    g.putImageData(img,0,0);const COL={fer:'#c0603a',charbon:'#202020',pierre:'#d8d8d8',cuivre:'#2ab0a0',plomb:'#7070c0',salpetre:'#f0f070',or:'#ffcc00'};
    for(const d of G.deposits){g.fillStyle=COL[d.res]||'#f0f';g.beginPath();g.arc(d.i*S,d.j*S,2,0,7);g.fill();}
    g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(G.capital[0]*S,G.capital[1]*S,6,0,7);g.stroke();g.strokeStyle='#f33';for(const b of G.beee){g.beginPath();g.arc(b[0]*S,b[1]*S,6,0,7);g.stroke();}
    g.fillStyle='#fff';g.font='14px sans-serif';g.fillText('${process.env.MODE||'v2'} · '+N+' cases · '+G.deposits.length+' gisements',8,18);})();0;`);
  await wait(9000);await shot((process.env.MODE||'v2')+'_plan.png');
},{w:440,h:440,out:path.join(__dirname,'carte')});
