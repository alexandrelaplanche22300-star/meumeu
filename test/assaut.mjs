// Un assaut bèè en masse : 14 contre 5 Meumeu devant la capitale. On suit le groupe et qui tire en marchant.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
for(const seed of [21,22,23]){const W=new World(seed);for(let h=0;h<24;h++)W.update(1);
  const cap=W.capital();const cx=cap.i+2,cy=cap.j+6;const us=[];for(let n=0;n<5;n++){const u=W.addUnit('meumeu','soldat',cx-2+n,cy+1);u.w='mle1';u.mag=5;u.pouch=60;u.task={kind:'guard',tx:u.x,ty:u.y};us.push(u);}
  const a=Math.atan2(-1,1);const bs=[];for(let n=0;n<14;n++){const u=W.addUnit('beee','soldat',cx+Math.cos(a)*30+(n%5)*1.2,cy+Math.sin(a)*-30+(n/5|0)*1.2);u.w='bee_fusil';u.mag=5;u.pouch=60;bs.push(u);}
  const b=W.makeBand(bs,cap,{x:bs[0].x,y:bs[0].y});const hist=[];let movingShots=0,shots=0;
  for(let t=0;t<260;t++){W.update(1/24);const st=b.state;if(hist[hist.length-1]!==st)hist.push(st);
    for(const e of W.events.splice(0))if(e.type==='shot'&&e.f==='beee'){shots++;if(e.moving)movingShots++;}}
  const alive=L=>L.filter(u=>u.hp>0&&u.h?.state!=='mort'&&u.h?.state!=='hors').length;
  console.log(`graine ${seed} : ${hist.join(' → ')} · Bèè debout ${alive(bs)}/14 · Meumeu debout ${alive(us)}/5 · tirs bèè ${shots} dont en marchant ${movingShots}`);}
