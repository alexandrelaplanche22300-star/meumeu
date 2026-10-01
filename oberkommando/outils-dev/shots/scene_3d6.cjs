const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2200);
  console.log(await run(`(async()=>{const w=world();await view.set3d(true);w.s.fog=false;const cap=w.capital();document.querySelector('.speeds [data-speed="0"]').click();
    const vil=w.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,6),res=['bois','pierre','vivres','fer','poudre','sante'];
    const ox=cap.i+8,oy=cap.j+10;vil.forEach((u,n)=>{u.x=ox+n*1.1;u.y=oy;u.path=null;u.task=null;u.fx=0;u.fy=1;u.carry={k:res[n],n:10};u.anim='idle';});
    const sol=w.s.units.filter(u=>u.f==='meumeu'&&u.k==='soldat').slice(0,4);
    sol.forEach((u,n)=>{u.x=ox+n*1.3;u.y=oy+2.4;u.path=null;u.task=null;u.fx=0;u.fy=1;u.anim=n===0?'aim':n===1?'walk':'idle';u.walkPh=n*3;if(n===2){u.reload=1.5;u.reloadTotal=3;}if(n===3){u.anim='aim';}});
    view.zoom=3.0;view.lookAt(ox+3,oy+1.2);
    for(let i=0;i<4;i++)view.draw(.016);
    view.onEvent({type:'shot',by:sol[3].id,E:1500,x:sol[3].x,y:sol[3].y});for(let i=0;i<3;i++)view.draw(.016);
    return JSON.stringify({vil:vil.length,sol:sol.length,errs:__errs});})()`));
  await wait(400);console.log(await run(`JSON.stringify({z:view.zoom,cx:view.cx,cy:view.cy,ok:!!view.g3})`));await shot('3d_10_portes.png');
  console.log(await run(`JSON.stringify(__errs)`));
},{w:1500,h:900,out:__dirname});
