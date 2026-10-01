// La vigilance : à quelle distance un garde bèè (ou un villageois) repère-t-il un Meumeu, selon la posture, le camouflage,
// l'heure — devant lui, sur le côté, derrière — et un tireur à visée infrarouge, la nuit ?
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const W=new World(41);for(let h=0;h<24;h++)W.update(1);const cap=W.capital();const x0=cap.i+30,y0=cap.j+4;
function range(obs,post,{hour=12,side='devant',camo=false,walk=false}={}){W.s.beee.alerts=[];W.s.t=Math.floor(W.s.t/24)*24+hour;const o=W.addUnit('beee',obs==='villageois'?'villageois':'soldat',x0,y0);if(obs!=='villageois')o.w='bee_fusil';o.task={kind:'guard',tx:x0,ty:y0};
  const ang={devant:0,'côté':Math.PI/2,derrière:Math.PI}[side];o.fx=1;o.fy=0;
  let best=0;for(let d=1;d<=40;d+=.5){const e=W.addUnit('meumeu','soldat',x0+Math.cos(ang)*d,y0+Math.sin(ang)*d);e.w='mle1';e.post=post;e.orderPost=post;e.anim=walk?'walk':'idle';e.camoSuit=camo;
    W.s.beee.alerts=[];let ok=false;e.det={};for(let k=0;k<40&&!ok;k++){W.detT=1;W.detectTick(0);ok=W.spotted(e,'beee');}
    W.s.units.splice(W.s.units.indexOf(e),1);W.uIndex.delete(e.id);if(ok)best=d;else break;}
  W.s.units.splice(W.s.units.indexOf(o),1);W.uIndex.delete(o.id);return best;}
for(const obs of ['soldat','villageois'])for(const hour of [12,1]){console.log(`— ${obs} bèè, ${hour===12?'midi':'une heure du matin'} (repéré jusqu'à … cases ; 1 case = 4 m)`);
  for(const [post,camo,walk] of [['debout',false,true],['accroupi',false,true],['couche',false,true],['couche',true,true],['couche',true,false]])
    console.log(`   ${post.padEnd(8)}${camo?' camouflé':'         '}${walk?' en marche':' immobile '} : devant ${range(obs,post,{hour,camo,walk})} · côté ${range(obs,post,{hour,camo,walk,side:'côté'})} · derrière ${range(obs,post,{hour,camo,walk,side:'derrière'})}`);}
