// Les radiographies de l'escouade sélectionnée, en plein combat : combien elles coûtent (ms par seconde de jeu), combien de fenêtres et de rendus, et à quoi ça ressemble.
const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');const OUT=path.join(__dirname,'dz');const TAG=process.env.TAG||'';
main(async({win,run,wait})=>{const jpg=async n=>{await wait(300);fs.writeFileSync(path.join(OUT,`xray${TAG}_${n}.jpg`),(await win.webContents.capturePage()).toJPEG(86));console.log('capture',n);};
  await run(`localStorage.setItem('okm-zoom','1');localStorage.setItem('okm-xray','sel');location.reload();0;`).catch(()=>{});await wait(4500);
  await run(`window.__e=[];window.addEventListener('error',e=>window.__e.push(String(e.error?.stack||e.message)));window.confirm=()=>true;document.querySelector('[data-act="scen-front"]').click();0;`);await wait(3000);
  const setup=await run(`(()=>{const w=world(),s=w.s;const M=s.units.filter(u=>u.f==='meumeu'&&u.k!=='villageois'&&u.task?.kind==='guard');const mx=M.reduce((a,u)=>a+u.x,0)/M.length,my=M.reduce((a,u)=>a+u.y,0)/M.length;
    const c=s.beee.cities.find(c=>!c.fallen);const dx=c.x-mx,dy=c.y-my,L=Math.hypot(dx,dy);const B=s.units.filter(u=>u.f==='beee'&&u.k==='soldat').slice(0,30);
    B.forEach((u,k)=>{const [x,y]=w.freeSpot(mx+dx/L*12+(k%10-4.5)*1.4,my+dy/L*12+Math.floor(k/10)*1.6,3);u.x=x;u.y=y;u.path=null;u.task={kind:'guard',tx:x,ty:y};});
    view.sel.clear();for(const u of M)view.sel.add(u.id);w.order(M.filter(u=>!u.serve).map(u=>u.id),{type:'unit',id:B[0].id});w.s.fog=false;view.set3d(true);view.lookAt(mx+dx/L*6,my+dy/L*6);view.zoom=1.1;
    const X=window.xray,T={add:0,step:0,draw:0,ev:0,cards:0,frames:0,nd:0,td:0,max:0};const a=X.add.bind(X),st=X.step.bind(X),dr=view.draw.bind(view),d0=X.draw.bind(X);
    X.add=(e,o)=>{const t=performance.now(),n=X.cards.length;a(e,o);T.add+=performance.now()-t;T.ev++;if(X.cards.length>n)T.cards++;};
    X.step=dt=>{const t=performance.now();st(dt);T.step+=performance.now()-t;};X.draw=c=>{const t=performance.now();d0(c);const q=performance.now()-t;T.td+=q;T.nd++;T.max=Math.max(T.max,q);};
    view.draw=dt=>{const t=performance.now();const r=dr(dt);T.draw+=performance.now()-t;T.frames++;return r;};
    window.__T=T;document.querySelector('.speeds [data-speed="1"]')?.click();return M.length+' soldats choisis, '+B.length+' Bèè à 12 cases';})()`);console.log(setup);
  for(const k of [1,2,3]){await wait(6000);await jpg('combat'+k);}
  await wait(2000);
  const T=JSON.parse(await run(`JSON.stringify(window.__T)`));const s=20;
  const gpu=await run(`(()=>{const c=document.createElement('canvas').getContext('webgl2');const d=c&&c.getExtension('WEBGL_debug_renderer_info');return d?c.getParameter(d.UNMASKED_RENDERER_WEBGL):'?';})()`);
  console.log(`rendus : ${T.nd} en 20 s, ${(T.td/Math.max(1,T.nd)).toFixed(2)} ms chacun, le plus long ${T.max.toFixed(1)} ms · carte graphique : ${gpu}`);
  console.log(`radiographies : ${T.ev} blessures vues par l'escouade, ${T.cards} fenêtres ouvertes · coût : création ${(T.add/s).toFixed(1)} ms/s + dessin ${(T.step/s).toFixed(1)} ms/s · pour comparer, la carte : ${(T.draw/s).toFixed(0)} ms/s (${T.frames} images, ${(T.draw/Math.max(1,T.frames)).toFixed(1)} ms l'image)`);
  console.log('erreurs',await run(`JSON.stringify(window.__e)`));
},{w:854,h:480,out:OUT});
