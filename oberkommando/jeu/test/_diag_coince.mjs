const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const W=new World(104);const bot=player(W);
for(let h=0;h<5*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;}
const u=W.unit(24);const N=W.N,c=W.costFn('beee');const si=Math.floor(u.x),sj=Math.floor(u.y);
const ring=[];for(let dj=-2;dj<=2;dj++){let row='';for(let di=-2;di<=2;di++){const v=c((sj+dj)*N+si+di);row+=(v===Infinity?'#':'.');}ring.push(row);}
const on=W.s.buildings.filter(b=>{const [w,h]=(b.k==='enclos'&&b.size)||[3,3];return si>=b.i-1&&si<=b.i+4&&sj>=b.j-1&&sj<=b.j+4;}).map(b=>`${b.k}#${b.id} ${b.f} @${b.i},${b.j} done ${b.done}`);
console.log('unite',u.id,u.f,u.k,'pos',u.x.toFixed(2),u.y.toFixed(2),'tache',JSON.stringify(u.task),'why',u.why);
console.log('voisinage (# infranchissable, centre = unite)\n'+ring.join('\n'));
console.log('batiments proches',JSON.stringify(on));
console.log('fosse ici',JSON.stringify(W.s.trenches?.[sj*N+si]||null),'eau',W.s.terrain?.[sj*N+si]);
console.log('freeSpot',JSON.stringify(W.freeSpot(u.x,u.y,6)));
