// Les à-coups : la pire image (un tick) sur deux heures de jeu, image par image, et ce qui la cause.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const [seed,DAY]=[+(process.argv[2]||302),+(process.argv[3]||30)];const W=new World(seed);const P=player(W);
for(let h=0;h<DAY*24;h++){try{P.tick();}catch(e){}W.update(1);W.events.length=0;}
const wrap=(o,n)=>{const f=o[n];const st={t:0,max:0,n:0};o[n]=function(...a){const t=performance.now();const r=f.apply(this,a);const d=performance.now()-t;st.t+=d;st.n++;if(d>st.max)st.max=d;return r;};return st;};
const proto=Object.getPrototypeOf(W);const S={};for(const n of ['beeeEconomy','beeePlan','beeeLabour','beeePorters','beeeSiting','beeeStaff','beeeSearch','detectTick','intelTick','noiseTick','market','pickJob'])if(proto[n])S[n]=wrap(proto,n);
const ticks=[];for(let f=0;f<60*8*2;f++){const a=performance.now();W.update(1/60/4);W.events.length=0;ticks.push(performance.now()-a);}
ticks.sort((a,b)=>b-a);console.log(`jour ${DAY} · Bèè ${W.s.units.filter(u=>u.f==='beee').length} · image moyenne ${(ticks.reduce((a,b)=>a+b,0)/ticks.length).toFixed(2)} ms · pires ${ticks.slice(0,5).map(x=>x.toFixed(0)).join(', ')} ms`);
for(const [n,s] of Object.entries(S))if(s.n)console.log(`  ${n.padEnd(12)} appels ${s.n} · pire ${s.max.toFixed(1)} ms · total ${s.t.toFixed(0)} ms`);
