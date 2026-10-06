// Le bureau d'études tel qu'il est : ouvert sur le Mle 1, en haut, puis défilé jusqu'au canon (un curseur du bas), puis un curseur bougé.
const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');
const OUT=process.env.OUT||path.join(__dirname,'dz');fs.mkdirSync(OUT,{recursive:true});const TAG=process.env.TAG||'avant';
main(async({win,run,wait,logs})=>{
  const jpg=async n=>{await wait(400);const img=await win.webContents.capturePage();fs.writeFileSync(path.join(OUT,`${TAG}_${n}.jpg`),img.toJPEG(85));console.log('capture',n);};
  // l'interface à 100 % dans une fenêtre de 1708 × 960 : exactement ce que voit le joueur (écran 1920 × 1080 à 225 %, interface à 50 %)
  await run(`localStorage.setItem('okm-zoom','1');location.reload();0;`).catch(()=>{});await wait(4500);
  await run(`window.__e=[];window.addEventListener('error',e=>window.__e.push(String(e.error?.stack||e.message)));0;`);await wait(1500);
  await run(`designer.show('mle1');0;`);await wait(3500);await jpg('1_ouvert');
  // défiler jusqu'au curseur de longueur du canon et le bouger
  const r=await run(`(()=>{const d=document.querySelector('#designer');const det=[...d.querySelectorAll('.dz-ctl details')].find(x=>/charge et le canon/i.test(x.querySelector('summary')?.textContent||''));if(det)det.open=true;const L=d.querySelector('#dz-L');if(!L)return 'pas de curseur canon';L.scrollIntoView({block:'center'});return 'ok '+(d.querySelector('.dz-body')?.scrollTop||0)+' / '+(d.querySelector('.dz-body')?.scrollHeight||0);})()`);console.log('défilé',r);
  await wait(800);await jpg('2_canon');
  await run(`(()=>{const L=document.querySelector('#dz-L');L.value=+L.value+200;L.dispatchEvent(new Event('input',{bubbles:true}));})();0;`);await wait(1200);await jpg('3_canon_bouge');
  // la page entière de haut en bas : sa hauteur
  console.log('hauteurs',await run(`JSON.stringify([...document.querySelectorAll('#designer .dz-col')].map(c=>c.className+' '+Math.round(c.scrollHeight)))`));
  console.log('erreurs',await run(`JSON.stringify(window.__e)`));
},{w:Number(process.env.W||1600),h:Number(process.env.H||900),out:OUT});
