// La réaction d'un état-major bèè à la chute d'une ville, sur plusieurs graines (scénario 2 de ia.mjs, paramétré).
// Sert à distinguer un vrai changement de comportement d'un simple décalage du hasard : on compare les distributions.
//   node test/ia_tombee.mjs [graineDeDépart=11] [nbGraines=10]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const S0=+(process.argv[2]||11),NS=+(process.argv[3]||10);
const T=W=>Object.values(W.s.trenches).filter(t=>t.f==='beee');
const rows=[];
for(let seed=S0;seed<S0+NS;seed++){
  const W=new World(seed);for(let h=0;h<24*4;h++)W.update(1);
  if(W.s.beee.cities.length<2){const c0=W.s.beee.cities[0];let made=null;for(let r=26;r<50&&!made;r+=3)for(let q=0;q<12&&!made;q++){const i=Math.round(c0.x+Math.cos(q*.52)*r),j=Math.round(c0.y+Math.sin(q*.52)*r);if(W.canPlace('beee','centre',i-2,j-2).ok)made=W.makeBeeeCity(i,j,'Bèèval');}}
  const cs=W.s.beee.cities;if(cs.length<2){rows.push({seed,skip:true});continue;}
  const lost=cs[cs.length-1],other=cs[0];
  for(let n=0;n<16;n++){const u=W.addUnit('beee','soldat',other.x+n%4,other.y+3+(n/4|0));u.city=other.id;u.task={kind:'guard',tx:u.x,ty:u.y};}
  W.damage(W.building(lost.centre),1e6,'meumeu');W.update(1);
  for(let n=0;n<10;n++){const u=W.addUnit('meumeu','soldat',lost.x+2+n%3,lost.y+2+(n/3|0));u.w=u.w||'mle1';}
  const L=W.s.beee.lostFront;const r={seed,fallen:lost.fallen,tr8:0,tr24:0,tr48:0,dug48:0,att48:0};
  r.maxSearch=0;r.alertsMax=0;r.searchHours=0;for(let h=0;h<48;h++){W.dt=1;W.beeeStaff(W.s.beee.cities.filter(c=>!c.fallen));W.update(1);if(h===7)r.tr8=T(W).length;if(h===23)r.tr24=T(W).length;
    const ns=W.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='search'&&!u.task.scout).length;r.maxSearch=Math.max(r.maxSearch,ns);r.searchHours+=ns;r.alertsMax=Math.max(r.alertsMax,(W.s.beee.alerts||[]).length);}
  r.tr48=T(W).length;r.dug48=T(W).filter(t=>t.b).length;r.att48=L?.attempts||0;r.threat=Math.max(...W.s.beee.cities.filter(c=>!c.fallen).map(c=>c.threat||0));rows.push(r);
  console.log(`graine ${seed} : tombée ${r.fallen} · tranchées +8 h ${r.tr8} · +24 h ${r.tr24} · +48 h ${r.tr48} (creusées ${r.dug48}) · tentatives de reprise ${r.att48} · menace max ${r.threat.toFixed(2)} · chercheurs d'alerte max ${r.maxSearch}, heures-chercheur ${r.searchHours} · alertes max ${r.alertsMax}`);}
const ok=rows.filter(r=>!r.skip);const avg=k=>ok.length?(ok.reduce((n,r)=>n+r[k],0)/ok.length).toFixed(1):'—';
console.log(`\nmoyennes sur ${ok.length} graines : tranchées +8 h ${avg('tr8')} · +24 h ${avg('tr24')} · +48 h ${avg('tr48')} · creusées ${avg('dug48')} · tentatives ${avg('att48')} · chercheurs max ${avg('maxSearch')} · heures-chercheur ${avg('searchHours')} · alertes max ${avg('alertsMax')}`);
