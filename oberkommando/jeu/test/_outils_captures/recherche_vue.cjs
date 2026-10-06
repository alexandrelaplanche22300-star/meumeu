// La recherche en jeu (V12.7) : la sauvegarde test/_saves/recherche.json (brouillard actif), la réunion de lancement d'un obusier attend le commandement.
// Comme le joueur : clic sur le centre de recherche (la vue s'ouvre), « Assister » (la fenêtre de réunion), on retient deux propositions, la vague
// suivante ; puis on laisse vivre (les savants repartent à leur poste et pensent), le laboratoire de chimie, le bureau d'études, la nuit.
//   OKM_ROOT=…/jeu OUT=… electron.exe test/_outils_captures/recherche_vue.cjs
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=process.env.OUT||path.join(__dirname,'recherche');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);
  console.log('chargé, jour',await run(`(async()=>{const d=await (await fetch('test/_saves/recherche.json')).text();return window.__load(d);})()`));
  await run(`(async()=>{await view.set3d?.(true);})();0;`);await wait(3000);
  const click=async k=>run(`(()=>{const w=world(),b=w.s.buildings.find(x=>x.k==='${k}'&&x.f==='meumeu');const [W,H]=w.sizeOf(b);view.lookAt(b.i+W/2,b.j+H/2);view.zoom=1.2;view.draw(.01);
      const q=view.toScreen(b.i+W/2,b.j+H/2),cv=view.canvas,r=cv.getBoundingClientRect(),x=r.left+q.x/view.dpr,y=r.top+q.y/view.dpr;
      for(const t of ['pointerdown','pointerup'])cv.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,button:0,bubbles:true,pointerId:1}));return !!view.lab;})()`);
  const live=async n=>{for(let i=0;i<n;i++){await run(`window.__step(3,1/30);0;`);await wait(30);}};
  const game=async h=>run(`(()=>{const w=world();for(let t=0;t<${h};t+=.05)w.update(.05);return w.hour().toFixed(1);})()`);
  const btn=async sel=>run(`(()=>{const b=document.querySelector('${sel}');if(!b)return 'absent';b.click();return b.disabled?'désactivé':'ok';})()`);
  const go=async k=>run(`(()=>{const w=world(),b=w.s.buildings.find(x=>x.k==='${k}'&&x.f==='meumeu');document.querySelector('[data-r="go:'+b.id+'"]')?.click();return !!view.lab;})()`);
  const state=async()=>run(`(()=>{const w=world(),P=w.s.research.programs.find(x=>x.kind==='arme');const M=P?.meet;return JSON.stringify({h:w.hour().toFixed(1),st:P?.st,meet:M&&[M.type,M.phase,M.wave,M.props.length],leads:(P?.leads||[]).filter(L=>L.st==='exploration'||L.st==='mure').length,
    sav:w.savants().map(u=>u.name+':'+u.sci.act+(u.inLab!=null?'@'+w.building(u.inLab).k:'')+(u.sci.think?' «'+u.sci.think.txt+'»':''))});})()`);
  console.log('clic sur le centre — vue ouverte :',await click('centre_recherche'));await live(60);await shot('r1_centre_reunion.png');
  console.log(await state());
  // assister : la fenêtre de réunion
  console.log('assister :',await btn('[data-r^="meet:"]'));await live(4);await shot('r2_reunion_vague1.png');
  // le roi : « Voir la table » — la fenêtre se réduit, le roi entre et s'assied au bout de la table
  console.log('voir la table :',await btn('[data-r="mini:1"]'));await live(90);await shot('r2b_roi_entre.png');await live(120);await shot('r2c_roi_table.png');
  console.log(await run(`JSON.stringify((view.g3.labDraw||[]).filter(f=>f.u.k==='roi').map(f=>[f.act,f.k,f.moving,f.x.toFixed(2),f.z.toFixed(2)]))`));
  console.log('rouvrir :',await btn('[data-r="mini:0"]'));await live(4);
  // retenir deux propositions compatibles, puis la vague suivante
  console.log('retenir :',await run(`(()=>{const B=[...document.querySelectorAll('[data-r^="mpick:"]')].filter(b=>!b.disabled);if(!B.length)return 'aucune';B[0].click();window.__step(1,1/30);const C=[...document.querySelectorAll('[data-r^="mpick:"]')].filter(b=>!b.disabled&&!b.textContent.includes('✓'));if(C.length)C[0].click();window.__step(1,1/30);return document.querySelector('[data-r^="mdecide:"]')?.disabled?'bouton inactif':'ok';})()`));
  await live(2);await shot('r3_selection.png');
  console.log('décider :',await btn('[data-r^="mdecide:"]'));await live(4);await shot('r4_redessine.png');
  await game(.6);await live(8);await shot('r5_vague2.png');console.log(await state());
  // clore, et laisser vivre : de retour à leur poste, ils pensent
  console.log('clore :',await btn('[data-r^="mclose:"]'));await run(`(()=>{document.querySelector('[data-act="modal-off"]')?.click();})();0;`);
  await game(5);await live(50);await shot('r6_centre_apres.png');console.log(await state());
  console.log('labo :',await go('labo'));await live(60);await shot('r7_labo.png');
  console.log('bureau :',await go('armurerie'));await live(60);await shot('r8_bureau.png');
  // le panneau Programmes en grand
  await go('centre_recherche');await btn('[data-r="tab:programmes"]');await live(30);await shot('r9_programmes.png');
  // la nuit (brouillard actif)
  await run(`(()=>{const w=world();let n=0;while(!(w.hour()>=21.5||w.hour()<4)&&n++<800)w.update(.05);return w.hour();})()`);await live(60);await shot('r10_nuit.png');console.log(await state());
},{w:1600,h:900,out:OUT});
