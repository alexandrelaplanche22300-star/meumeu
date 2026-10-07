const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2500);
  const r=await run(`(async()=>{const w=world();const cap=w.capital();await view.set3d(true);w.s.fog=false;Object.assign(cap.stock,{'a:canon_mle1':4,'m:canon_mle1':20,'a:mle1':60,'m:mle1':600});
    const at=w.buildSpot('meumeu','caserne',cap.i+8,cap.j+2,0,24);const cas=w.addBuilding('meumeu','caserne',at[0],at[1],true);cas.rally=[cas.i+5,cas.j+9];
    for(const v of w.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,4))w.enterBarracks(v,cas);
    const r=w.releaseCrew(cas,'canon_mle1');const g=r.gunner;window.__g=g;
    g.x=cas.i+6;g.y=cas.j+7;g.task={kind:'guard',tx:g.x,ty:g.y};g.path=null;g.fx=1;g.fy=.4;
    const sv=w.s.units.filter(u=>u.serve===g.id);sv.forEach((u,k)=>{u.x=g.x-.7;u.y=g.y+.5*k;u.path=null;});
    view.sel.clear();view.sel.add(g.id);document.querySelector('.speeds [data-speed="0"]').click();
    view.zoom=2.6;view.lookAt(g.x+1,g.y);view.draw(0);renderPanel(true);
    const info=[...view.scene3d.guns.entries()].map(([k,e])=>({k:k.slice(0,24),pool:!!e.pool,n:e.pool&&e.pool.n,gh:e.m&&e.m.gh,L:e.m&&e.m.L,tris:e.m&&e.m.geo.attributes.position.count/3}));
    return JSON.stringify({ok:r.ok,info,gunner:{x:g.x,y:g.y,w:g.w,crew:w.W(g.w).crew,scr:view.toScreen(g.x,g.y)},cas:{i:cas.i,j:cas.j},errs:__errs});})()`);
  console.log(r);await wait(600);await shot('3d_03_piece.png');
},{w:1500,h:900,out:__dirname});
