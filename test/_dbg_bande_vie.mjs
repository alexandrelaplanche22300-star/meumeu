// la vie des bandes bèè sur la rive meumeu : chaque changement d'état, la dissolution — node test/_dbg_bande_vie.mjs <sauvegarde> <heures>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s,B=s.beee,mid=W.N/2;const J=()=>'J'+(s.t/24).toFixed(2);
const desc=b=>{const m=W.bandMembers(b).filter(u=>u.hp>0),T=W.building(b.target);const x=m.length?m.reduce((n,u)=>n+u.x,0)/m.length:0,y=m.length?m.reduce((n,u)=>n+u.y,0)/m.length:0;return `${b.kind||'raid'}#${b.id} ${m.length} h. à (${x|0},${y|0}) cible ${T?T.k+' ('+T.i+','+T.j+') à '+Math.round(Math.hypot(T.i-x,T.j-y)):'—'} âge ${(b.age||0).toFixed(1)} lim ${b.lim?.toFixed?.(0)} goT ${b.goT?.toFixed?.(1)} contact il y a ${(s.t-b.contactT).toFixed(1)} h`;};
const s0=W.bandSet.bind(W);W.bandSet=(b,st,why='')=>{if(b.state!==st&&(b.kind==='debarquement'||(W.bandMembers(b)[0]?.x??999)<mid))console.log(J(),'ÉTAT',b.state,'→',st,why?'('+why+')':'','·',desc(b));return s0(b,st,why);};
const d0=W.bandDisband.bind(W);W.bandDisband=(b,up)=>{if(b.kind==='debarquement'||(up[0]?.x??999)<mid)console.log(J(),'DISSOUTE',desc(b));return d0(b,up);};
const m0=W.makeBand.bind(W);W.makeBand=(us,tg,fr)=>{const b=m0(us,tg,fr);if((us[0]?.x??999)<mid)console.log(J(),'NÉE',desc(b));return b;};
for(let h=1;h<=(+process.argv[3]||24);h++)for(let k=0;k<60;k++)W.update(1/60);
