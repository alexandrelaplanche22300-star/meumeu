// un rayon depuis des pixels de l'écran : quel maillage, quel triangle, où dans le repère du modèle
const {main}=require('./harness.cjs');const path=require('path');
main(async({run,wait})=>{await wait(1500);await run(`(async()=>{const d=await (await fetch('test/_saves/mer301_j30.json')).text();return window.__load(d);})()`);
  const at=await run(`(()=>{const w=world();w.s.fog=false;const m=w.s.buildings.find(b=>b.k==='moulin'&&b.f==='meumeu'&&b.done&&!b.ruin);w.s.units=w.s.units.filter(u=>Math.hypot(u.x-m.i,u.y-m.j)>14);return [m.id,m.i+1.5,m.j+1.5];})()`);
  await run(`(async()=>{document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);document.querySelector('.speeds [data-speed="0"]')?.click();})();0;`);await wait(4000);
  await run(`(()=>{view.yaw=0;view.elev=.42;view.lookAt(${at[1]}-1.6,${at[2]}-1.6);view.zoom=2.6;view.draw(.01);})();0;`);await wait(800);
  const out=await run(`(async()=>{const THREE=await import('./js/lib/three.module.js');const g3=view.g3;const cv=view.canvas;const R=cv.getBoundingClientRect();const res=[];
    for(const [px,py] of ${process.env.PTS}){const nd=new THREE.Vector2((px-R.left)/R.width*2-1,-((py-R.top)/R.height*2-1));const rc=new THREE.Raycaster();rc.setFromCamera(nd,g3.cam);
      const e=g3.blds.get(${at[0]});const hits=rc.intersectObject(e.g,true);if(!hits.length){res.push([px,py,'rien']);continue;}const h=hits[0];const m=h.object;const inv=m.matrixWorld.clone().invert();const p=h.point.clone().applyMatrix4(inv);
      res.push([px,py,m.parent===e.g?'tour':'ailes/arbre',+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3),h.faceIndex]);}return JSON.stringify(res);})()`);
  console.log(out);
},{w:900,h:700,out:path.join(__dirname,'moulin')});
