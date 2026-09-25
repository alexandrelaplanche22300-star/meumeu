import {World} from '../js/world.js';import {setupDemo} from '../js/demo.js';
for(const seed of [1,2,4,5,6,7,8,9,10,11]){const W=new World(seed);const r=setupDemo(W);const c=W.s.beee.cities.find(c=>c.name.startsWith('Avant'));if(!c){console.log(seed,'pas d avant-poste');continue;}const cap=W.capital();const ms=W.members(W.s.squads[0]);
const t=Date.now();W.order(ms.map(u=>u.id),{type:'point',x:cap.i+(c.x-cap.i)*.55,y:cap.j+(c.y-cap.j)*.55});const t1=Date.now()-t;let t2=Date.now();for(let i=0;i<20;i++)W.update(.1);console.log(seed,'ordre',t1,'ms · 2 h',Date.now()-t2,'ms');}
