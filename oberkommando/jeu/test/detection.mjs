// La détection : à quelle distance repère-t-on un soldat, selon sa posture, son couvert, sa spécialité, l'heure — et après un coup de feu ?
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const W=new World(41);for(let h=0;h<24;h++)W.update(1);const cap=W.capital();const x0=cap.i+30,y0=cap.j+4;
// un terrain dégagé : on cherche une case sans arbre ni bâtiment autour
const N=W.N;const clear=(x,y)=>{for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const k=(Math.floor(y)+dj)*N+Math.floor(x)+di;if(W.nodeAt[k]>=0||W.occ[k]>=0)return false;}return true;};
function range(k,post,{fired=false,hour=12}={}){W.s.t=Math.floor(W.s.t/24)*24+hour;const o=W.addUnit('beee','soldat',x0,y0);o.w='bee_fusil';o.task={kind:'guard',tx:x0,ty:y0};
  let best=0;for(let d=2;d<=40;d+=1){const e=W.addUnit('meumeu',k,x0+d,y0);e.w='mle1';e.post=post;e.orderPost=post;e.anim='idle';if(fired)e.firedAt=W.s.t;W.detT=1;W.detectTick(0);const ok=W.spotted(e,'beee');W.s.units.splice(W.s.units.indexOf(e),1);W.uIndex.delete(e.id);if(ok)best=d;else break;}
  W.s.units.splice(W.s.units.indexOf(o),1);W.uIndex.delete(o.id);return best;}
console.log(`terrain dégagé à l'observation : ${clear(x0+10,y0)?'oui':'non (des arbres)'} · vue de jour ${W.sight().toFixed(0)} cases`);
for(const [k,post] of [['soldat','debout'],['soldat','couche'],['eclaireur','couche'],['tireur','couche']])console.log(`  ${k} ${post} : repéré jusqu'à ${range(k,post)} cases de jour, ${range(k,post,{hour:1})} de nuit ; après un coup de feu ${range(k,post,{fired:true})}`);
