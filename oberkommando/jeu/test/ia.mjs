// L'état-major bèè face à trois situations : une ville bombardée de loin, une ville tombée, une contre-attaque qui échoue.
//   node test/ia.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
function setup(seed){const W=new World(seed);for(let h=0;h<24*3;h++)W.update(1);
  const cities=W.s.beee.cities.filter(c=>!c.fallen);const c=cities[0];
  for(let n=0;n<16;n++){const a=n/16*6.283;const u=W.addUnit('beee','soldat',c.x+Math.cos(a)*4,c.y+Math.sin(a)*4);u.city=c.id;u.task={kind:'guard',tx:u.x,ty:u.y};}
  return {W,c};}
const kinds=W=>(W.s.beee.bands||[]).map(b=>`${b.kind||'raid'}:${b.state}(${b.m.length})`).join(' ')||'—';
// 1. une batterie à 22 cases tire six obus sur la ville
{const {W,c}=setup(7);const cap=W.capital();const a=Math.atan2(cap.j-c.y,cap.i-c.x);
  const gun={id:-5,f:'meumeu',x:c.x+Math.cos(a)*22,y:c.y+Math.sin(a)*22};
  for(let q=0;q<6;q++){W.beeeShelled(c.x+(q%3-1),c.y+1,gun,{radius:3});}
  const S=c.shelled;console.log(`bombardement : ${S.shots} coups, danger ${S.danger.toFixed(1)}, batterie estimée à ${d2(S.x,S.y,gun.x,gun.y).toFixed(1)} cases de la vraie`);
  for(let h=0;h<6;h++){W.dt=1;W.beeeStaff(W.s.beee.cities.filter(c=>!c.fallen));W.update(1);}
  const b=W.s.beee.bands.find(b=>b.kind==='contre');
  console.log(`  contre-batterie : ${b?`${b.m.length} Bèè, état ${b.state}, à ${d2(...W.bandMembers(b).reduce((s,u,_,A)=>[s[0]+u.x/A.length,s[1]+u.y/A.length],[0,0]),gun.x,gun.y).toFixed(1)} cases de la batterie`:'AUCUNE'} · groupes ${kinds(W)}`);
  // la même batterie, mais défendue par 12 soldats : la réponse grossit, ou ils attendent et creusent
  const {W:W2,c:c2}=setup(7);for(let n=0;n<12;n++){const u=W2.addUnit('meumeu','soldat',gun.x+n%4*.6,gun.y+(n/4|0)*.6);u.w=u.w||'mle1';}
  for(let q=0;q<6;q++)W2.beeeShelled(c2.x,c2.y,gun,{radius:3});for(let h=0;h<8;h++){W2.dt=1;W2.beeeStaff(W2.s.beee.cities.filter(c=>!c.fallen));W2.update(1);}
  const b2=W2.s.beee.bands.find(b=>b.kind==='contre');console.log(`  batterie défendue par 12 : ${b2?`assaut de ${b2.peak}`:'pas d’assaut'} · ville retranchée : ${c2.dig||0} · tranchées bèè ${Object.values(W2.s.trenches).filter(t=>t.f==='beee').length}`);}
// 2. une ville tombe : contre-attaques, puis tranchées chez les voisines
{const W=new World(11);for(let h=0;h<24*4;h++)W.update(1);if(W.s.beee.cities.length<2){const c0=W.s.beee.cities[0];let made=null;for(let r=26;r<50&&!made;r+=3)for(let q=0;q<12&&!made;q++){const i=Math.round(c0.x+Math.cos(q*.52)*r),j=Math.round(c0.y+Math.sin(q*.52)*r);if(W.canPlace('beee','centre',i-2,j-2).ok)made=W.makeBeeeCity(i,j,'Bèèval');}}const cs=W.s.beee.cities;console.log(`villes bèè au jour 14 : ${cs.length} (${cs.map(c=>c.name).join(', ')})`);
  if(cs.length>1){const lost=cs[cs.length-1];const other=cs[0];for(let n=0;n<16;n++){const u=W.addUnit('beee','soldat',other.x+n%4,other.y+3+(n/4|0));u.city=other.id;u.task={kind:'guard',tx:u.x,ty:u.y};}
    const ctr=W.building(lost.centre);W.damage(ctr,1e6,'meumeu');W.update(1);
    for(let n=0;n<10;n++){const u=W.addUnit('meumeu','soldat',lost.x+2+n%3,lost.y+2+(n/3|0));u.w=u.w||'mle1';}
    const L=W.s.beee.lostFront;console.log(`  tombée : ${lost.fallen} · front perdu ${L?.name}`);
    for(let h=0;h<48;h++){W.dt=1;W.beeeStaff(W.s.beee.cities.filter(c=>!c.fallen));W.update(1);if(h%8===7)console.log(`   +${h+1} h : tentatives ${L.attempts}, échecs ${L.failed}, fini ${!!L.done} · ${kinds(W)} · tranchées bèè ${Object.values(W.s.trenches).filter(t=>t.f==='beee').length} (creusées ${Object.values(W.s.trenches).filter(t=>t.f==='beee'&&t.b).length})`);}
    // on force l'échec pour voir la suite
    L.failed=2;for(let h=0;h<24;h++){W.dt=1;W.beeeStaff(W.s.beee.cities.filter(c=>!c.fallen));W.update(1);}
    console.log(`  après deux échecs : dig ${W.s.beee.cities.filter(c=>!c.fallen).map(c=>c.dig||0).join(',')} · tranchées bèè ${Object.values(W.s.trenches).filter(t=>t.f==='beee').length} (creusées ${Object.values(W.s.trenches).filter(t=>t.f==='beee'&&t.b).length})`);}}
