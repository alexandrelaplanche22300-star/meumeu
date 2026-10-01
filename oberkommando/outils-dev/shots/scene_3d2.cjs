const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win,logs})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2500);
  console.log(await run(`(async()=>{const w=world();const cap=w.capital();await view.set3d(true);
    const sol=w.s.units.filter(u=>u.f==='meumeu'&&u.k!=='villageois').slice(0,8);sol.forEach((u,n)=>{u.x=cap.i+6+n%4;u.y=cap.j+6+(n/4|0);u.task={kind:'move',tx:cap.i+14+n%4,ty:cap.j+10+(n/4|0)};u.path=null;});
    view.sel.clear();sol.forEach(u=>view.sel.add(u.id));document.querySelector('.speeds [data-speed="1"]').click();for(let i=0;i<50;i++)__step(1,1/30);
    const c=sol[0];view.zoom=2.6;view.lookAt(c.x,c.y);view.draw(0);
    return JSON.stringify({n:sol.length,ks:sol.map(u=>u.k),errs:__errs});})()`));
  await wait(800);await shot('3d_02_soldats.png');
  console.log(await run(`(()=>{const t=[];for(const m of [true,false]){view.g3=m?view.scene3d:null;view.zoom=1.0;const c=world().capital();view.lookAt(c.i+4,c.j+4);view.draw(0.016);const t0=performance.now();for(let i=0;i<30;i++)view.draw(0.016);t.push((m?'3D ':'2D ')+((performance.now()-t0)/30).toFixed(1)+' ms/image');}view.g3=view.scene3d;return t.join(' · ')+' · erreurs '+JSON.stringify(__errs);})()`));
},{w:1500,h:900,out:__dirname});
