import {World} from '../js/world.js';import {setupDemo} from '../js/demo.js';
const W=new World(3);setupDemo(W);const c=W.s.beee.cities.find(c=>c.name.startsWith('Avant'));const cap=W.capital();const ms=W.members(W.s.squads[0]);
W.order(ms.map(u=>u.id),{type:'point',x:cap.i+(c.x-cap.i)*.55,y:cap.j+(c.y-cap.j)*.55});
for(let i=0;i<60;i++){const t=Date.now();W.update(.1);const dt=Date.now()-t;if(dt>300)console.log('pas',i,'lent',dt,'ms');}
const g=ms.find(u=>u.w==='mg2');console.log('pièce',g.x.toFixed(1),g.y.toFixed(1),g.why,g.deployT,'servants',W.servants(g,1.5).length);
