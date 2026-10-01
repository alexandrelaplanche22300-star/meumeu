// La chaîne alimentaire mesurée : un moulin, huit champs, une ville qui mange. On relève le rendement du domaine selon la
// fertilité, l'effet des cratères, la production réelle de vivres par heure et la ration servie à la ville.
//   node test/nourriture.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
const seed=+(process.argv[2]||3);const F='meumeu';
const W=new World(seed);for(let h=0;h<6;h++)W.update(1);const cap=W.capital();const cx=cap.i+2,cy=cap.j+2;
let mill=null;for(let r=6;r<28&&!mill;r++)for(let a=0;a<48&&!mill;a++){const i=Math.round(cx+Math.cos(a/48*6.283)*r-1),j=Math.round(cy+Math.sin(a/48*6.283)*r-1);if(W.canPlace(F,'moulin',i,j).ok)mill=W.place(F,'moulin',i,j).b;}
if(!mill){console.log('moulin non posé');process.exit(1);}
mill.done=true;mill.progress=1;mill.hp=mill.max;
console.log(`rendement du domaine : ${W.cropYield(mill).toFixed(2)} (fertilité moyenne ${((()=>{let s=0;for(let j=0;j<3;j++)for(let i=0;i<3;i++)s+=W.fertAt(mill.i+i,mill.j+j);return s/9;})()).toFixed(0)}/100)`);
// cratères : 0, 2, 4 cases du domaine détruites → le rendement doit baisser
const base=W.cropYield(mill);const rows=[['aucun cratère',base]];
for(const n of [2,5]){for(let q=0;q<n;q++)W.addCrater(mill.i+(q%3)+.5,mill.j+((q/3)|0)+.5,.5);rows.push([`${n} cratères`,W.cropYield(mill)]);}
for(const [l,y] of rows)console.log(`  ${l.padEnd(14)} rendement ${y.toFixed(2)} (${Math.round(y/base*100)} %)`);
const ok1=rows[1][1]<base&&rows[2][1]<rows[1][1];
// la production réelle sur 3 jours, avec quatre ouvriers ; la ville mange
const W2=new World(seed);for(let h=0;h<6;h++)W2.update(1);const c2=W2.capital();let m2=null;
for(let r=6;r<28&&!m2;r++)for(let a=0;a<48&&!m2;a++){const i=Math.round(c2.i+2+Math.cos(a/48*6.283)*r-1),j=Math.round(c2.j+2+Math.sin(a/48*6.283)*r-1);if(W2.canPlace(F,'moulin',i,j).ok)m2=W2.place(F,'moulin',i,j).b;}
m2.done=true;m2.progress=1;m2.hp=m2.max;
for(const u of W2.idle(F).slice(0,4))W2.order([u.id],{type:'building',id:m2.id});W2.addPorters(c2,2);
const eat=W2.cityFoodRate(c2);const v0=c2.stock.vivres||0;let minRation=1;
const ids=W2.workers(m2).map(u=>u.id);for(let h=0;h<96;h++){W2.update(1);minRation=Math.min(minRation,c2.ration??1);if(process.env.DBG&&h>=59&&h<=68){const near=W2.s.units.filter(u=>u.hp>0&&Math.hypot(u.x-m2.i,u.y-m2.j)<22&&!ids.includes(u.id)&&u.f!=="meumeu");console.log("   autour:",near.map(u=>`${u.f}/${u.k}@${Math.hypot(u.x-m2.i,u.y-m2.j).toFixed(0)}`).join(" ")||"rien");}if(process.env.DBG){const ws=ids.map(i=>W2.unit(i));console.log(`h${h+1} jour${W2.day} ${W2.hour().toFixed(0)}h ouvriers=${W2.workers(m2).length} `+ws.map(u=>u?`${u.hp>0?"":"MORT "}${u.task?.kind}/${u.why||"-"}`:"absent").join(" | ")+` guerre=${W2.atWar} vivres=${(c2.stock.vivres||0).toFixed(0)}`);}if(h%12===11)console.log(`  h${h+1} : vivres capitale ${(c2.stock.vivres||0).toFixed(0)} · moulin ${(m2.stock?.vivres||0).toFixed(1)} · ration ${(c2.ration??1).toFixed(2)} · ouvriers ${W2.workers(m2).length}`);}
for(const l of (W2.s.log||[]).slice(-14))console.log("  journal:",typeof l==="string"?l:JSON.stringify(l).slice(0,170));
console.log(`consommation de la ville ${eat.toFixed(2)} vivres/h · stock ${v0.toFixed(0)} → ${(c2.stock.vivres||0).toFixed(0)} · ration minimale ${minRation.toFixed(2)}`);
console.log(ok1?'OK : les cratères réduisent le rendement':'ÉCHEC : les cratères ne changent pas le rendement');process.exit(ok1?0:1);
