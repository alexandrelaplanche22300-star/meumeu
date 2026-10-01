const {main}=require('./harness.cjs');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);for(let k=0;k<60;k++){await wait(250);if(await run('document.body.innerText.includes("Partie de test prête")'))break;}await wait(800);
  console.log(await run(`(async()=>{const w=world();w.s.fog=false;w.s.solar=13;const cap=w.capital();const vs=[];
    for(const k of ['automitrailleuse','char','jeep_mg']){let p=null;for(let r=0;r<24&&!p;r++)for(let a=0;a<16&&!p;a++){const X=cap.i+16+Math.cos(a/16*6.28)*r,Y=cap.j+16+Math.sin(a/16*6.28)*r;if(w.vehFits(w.vehDef({k}),X,Y,0)&&w.vehOpenAt(w.vehDef({k}),k,X,Y)&&!w.s.vehicles.some(o=>Math.hypot(o.x-X,o.y-Y)<3.5))p=[X,Y];}
      const v=w.addCombatVehicle('meumeu',k,p[0],p[1],0);vs.push(v);const us=w.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh).slice(0,2);for(const u of us){u.x=v.x;u.y=v.y;w.vehBoard(v,u);}}
    window.__vs=vs;const mx=vs.reduce((a,v)=>a+v.x,0)/3,my=vs.reduce((a,v)=>a+v.y,0)/3;view.zoom=1.2;view.lookAt(mx,my);for(let i=0;i<3;i++)view.draw(.016);
    // le cadre : autour des trois engins (en coordonnées d'écran du canevas)
    const cv=view.canvas,R=cv.getBoundingClientRect(),dpr=view.dpr;const Q=vs.map(v=>view.toScreen(v.x,v.y));const x0=Math.min(...Q.map(q=>q.x))-60*dpr,x1=Math.max(...Q.map(q=>q.x))+60*dpr,y0=Math.min(...Q.map(q=>q.y))-80*dpr,y1=Math.max(...Q.map(q=>q.y))+60*dpr;
    const ev=(type,x,y,btn)=>cv.dispatchEvent(new PointerEvent(type,{clientX:R.left+x/dpr,clientY:R.top+y/dpr,button:btn,buttons:type==='pointerup'?0:(btn===2?2:1),bubbles:true,pointerId:1}));
    ev('pointerdown',x0,y0,0);ev('pointermove',(x0+x1)/2,(y0+y1)/2,0);ev('pointermove',x1,y1,0);ev('pointerup',x1,y1,0);
    const selAfterBox=[...view.selVs];window.__stop=true;return JSON.stringify({selAfterBox});
    // le clic droit : 12 cases plus loin
    const T=view.toScreen(mx+12,my+4);ev('pointerdown',T.x,T.y,2);ev('pointerup',T.x,T.y,2);
    const goals=vs.map(v=>v.goal?[+v.goal[0].toFixed(1),+v.goal[1].toFixed(1)]:null);for(let k=0;k<160;k++)w.update(.025);
    return JSON.stringify({selAfterBox,ids:vs.map(v=>v.id),goals,arrives:vs.map(v=>[v.k,v.state,+v.x.toFixed(1),+v.y.toFixed(1)]),errs:__errs});})()`));
  await wait(800);await shot('multisel_panneau.png');
},{w:1400,h:860,out:__dirname});
