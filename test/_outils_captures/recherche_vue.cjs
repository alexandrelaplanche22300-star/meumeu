// La vue recherche en jeu (V12.6) : la sauvegarde test/_saves/recherche.json (brouillard actif). On clique sur le centre de recherche comme le joueur
// (le clic de la vue), on laisse vivre, on capture ; on convoque une réunion par le panneau ; on affecte un chimiste à l'usine chimique et un ingénieur
// au bureau d'études (le « Affecter… » du panneau), avec un prototype en cours (le chemin du concepteur : propose) ; puis la nuit (brouillard actif).
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=process.env.OUT||path.join(__dirname,'recherche');fs.mkdirSync(OUT,{recursive:true});
main(async({run,wait,shot})=>{await wait(1500);
  await run(`(async()=>{const d=await (await fetch('test/_saves/recherche.json')).text();return window.__load(d);})()`);
  await run(`(async()=>{await view.set3d?.(true);})();0;`);await wait(3000);
  const click=async k=>run(`(()=>{const w=world(),b=w.s.buildings.find(x=>x.k==='${k}'&&x.f==='meumeu');const [W,H]=w.sizeOf(b);view.lookAt(b.i+W/2,b.j+H/2);view.zoom=1.2;view.draw(.01);
      const q=view.toScreen(b.i+W/2,b.j+H/2),cv=view.canvas,r=cv.getBoundingClientRect(),x=r.left+q.x/view.dpr,y=r.top+q.y/view.dpr;
      for(const t of ['pointerdown','pointerup'])cv.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,button:0,bubbles:true,pointerId:1}));return !!view.lab;})()`);
  const live=async n=>{for(let i=0;i<n;i++){await run(`window.__step(3,1/30);0;`);await wait(30);}};
  const game=async h=>run(`(()=>{const w=world();for(let t=0;t<${h};t+=.05)w.update(.05);return w.hour().toFixed(1);})()`);
  const btn=async sel=>run(`(()=>{const b=document.querySelector('${sel}');if(!b)return 'absent';b.click();return b.disabled?'désactivé':'ok';})()`);
  const go=async k=>run(`(()=>{const w=world(),b=w.s.buildings.find(x=>x.k==='${k}'&&x.f==='meumeu');document.querySelector('[data-r="go:'+b.id+'"]')?.click();return !!view.lab;})()`);
  console.log('clic sur le centre — vue ouverte :',await click('centre_recherche'));await live(70);await shot('r1_centre_jour.png');
  // une réunion, par le panneau
  console.log('onglet réunions :',await btn('[data-r="tab:reunions"]'));await live(3);console.log('convoquer :',await btn('[data-r^="meet:"]'));
  await game(.4);await live(25);await shot('r5_reunion.png');
  console.log(await run(`JSON.stringify((view.g3.labDraw||[]).filter(f=>f.b===view.lab.b).map(f=>f.u.name+':'+f.act+':'+(f.k||'-')+(f.moving?'*':'')))`));
  // l'usine chimique et le bureau d'études : les savants affectés par le « Affecter… » du panneau ; un prototype au bureau d'études
  console.log(await run(`(()=>{const w=world();const A=w.s.buildings.find(b=>b.k==='armurerie'&&b.f==='meumeu');const d=w.s.designs.mle1;const r=w.propose(A,'Fusil d’essai',JSON.parse(JSON.stringify(d.p)));
      document.querySelector('[data-r="tab:savants"]')?.click();window.__step(1,1/30);
      const pick=(disc,k)=>{const u=w.savants().find(x=>x.sci.disc===disc&&!x.sci.pid&&!x.sci.meet);if(!u)return disc+' : personne';const sel=document.querySelector('[data-rsel="move:'+u.id+'"]');const b=w.s.buildings.find(x=>x.k===k&&x.f==='meumeu');if(!sel||!b)return disc+' : pas de choix';sel.value=String(b.id);sel.dispatchEvent(new Event('change',{bubbles:true}));return u.name+' → '+k;};
      return [r.ok?'prototype lancé':r.why,pick('chimie','poudrerie'),pick('meca','armurerie')].join(' · ');})()`));
  console.log('heure',await game(5));
  console.log('usine :',await go('poudrerie'));await live(70);await shot('r6_usine.png');
  console.log('bureau :',await go('armurerie'));await live(70);await shot('r7_bureau.png');
  // la nuit (le brouillard reste actif)
  console.log('heure',await run(`(()=>{const w=world();let n=0;while(w.hour()<21.5&&n++<6000)w.update(.05);return w.hour().toFixed(1);})()`));
  await go('centre_recherche');await live(70);await shot('r4_centre_nuit.png');
  console.log('brouillard :',await run(`world().s.fog`));
},{w:1600,h:900,out:OUT});
