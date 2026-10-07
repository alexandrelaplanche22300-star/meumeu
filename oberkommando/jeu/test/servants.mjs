// Une pièce lourde et ses servants : ils la suivent en marche ; arrivée, elle est mise en batterie avant le premier coup.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {HOUR_REAL}=await import('../js/data.js');
const W=new World(31);for(let h=0;h<24;h++)W.update(1);const cap=W.capital();const x0=cap.i+4,y0=cap.j+12;
W.s.designs.mg={id:'mg',f:'meumeu',name:'Mitrailleuse',status:'adopte',p:{d:2.2,l:8,nose:'pointue',base:'bt',cons:'fmj',c:.05,L:260,twist:70,action:'auto',rof:650,mag:150,heavy:true,wallx:1.6,mods:['trepied']}};
const D=W.W('mg');console.log(`pièce : ${Math.round(D.mass*1000)} g, ${D.crew} servants (${D.roles.join(', ')}), mise en batterie ${D.setup} s de combat`);
const us=[];for(let n=0;n<D.crew;n++){const u=W.addUnit('meumeu','soldat',x0+n*.6,y0);u.w=n===0?'mg':'mle1';u.mag=n===0?150:5;u.pouch=n===0?300:40;us.push(u);}
const sq=W.formSquad(us.map(u=>u.id));W.order([us[0].id],{type:'point',x:x0+12,y:y0});for(const u of us.slice(1))W.order([u.id],{type:'point',x:x0+12,y:y0});
let maxGap=0;for(let t=0;t<200;t++){W.update(1/60);const g=us[0];for(const u of us.slice(1))if(u.serve===g.id)maxGap=Math.max(maxGap,Math.hypot(u.x-g.x,u.y-g.y));}
console.log(`en marche : servants à ${maxGap.toFixed(2)} case au plus de la pièce · rôles ${us.map(u=>u.serve?'servant':u.role||'tireur').join(', ')}`);
// un Bèè apparaît à 12 cases : combien de temps avant le premier coup ?
const e=W.addUnit('beee','soldat',us[0].x+12,us[0].y);e.w=null;e.task={kind:'guard',tx:e.x,ty:e.y};
let first=null;for(let t=0;t<600&&first==null;t++){W.update(1/(HOUR_REAL*20));for(const ev of W.events.splice(0))if(ev.type==='shot'&&ev.f==='meumeu'&&Math.hypot(ev.x-us[0].x,ev.y-us[0].y)<.6)first=t/20;}
console.log(`premier coup de la pièce ${first!=null?first.toFixed(1)+' s de combat après le contact':'jamais'} · état ${us[0].why||'—'}`);
// un servant tombe : un autre membre de l'escouade prend sa place ; le tireur tombe : un autre reprend la pièce
{const W=new World(32);for(let h=0;h<24;h++)W.update(1);const cap=W.capital();const x0=cap.i+4,y0=cap.j+12;W.s.designs.mg=JSON.parse(JSON.stringify({id:'mg',f:'meumeu',name:'Mitrailleuse',status:'adopte',p:{d:2.2,l:8,nose:'pointue',base:'bt',cons:'fmj',c:.05,L:260,twist:70,action:'auto',rof:650,mag:150,heavy:true,wallx:1.6,mods:['trepied']}}));
  const us=[];for(let n=0;n<5;n++){const u=W.addUnit('meumeu','soldat',x0+n*.7,y0);u.w=n===0?'mg':'mle1';u.mag=5;u.pouch=40;us.push(u);}W.formSquad(us.map(u=>u.id));W.update(1/60);
  const srv=()=>us.filter(u=>u.serve&&W.unit(u.serve)?.w==='mg'&&u.hp>0);const s0=srv()[0];console.log(`escouade de 5 : servant ${s0?.name||s0?.id}`);
  s0.h.state='mort';W.death(s0);let t=0;while(t<120&&!srv().some(u=>u!==s0)){W.update(1/(HOUR_REAL*20));t++;}const s1=srv().find(u=>u!==s0);
  console.log(`servant tué : ${s1?`remplacé par ${s1.name||s1.id} en ${(t/20).toFixed(1)} s`:'pas remplacé'}`);
  const g=us.find(u=>u.w==='mg');g.h.state='mort';W.death(g);let t2=0;while(t2<200&&!us.some(u=>u!==g&&u.hp>0&&u.w==='mg')){W.update(1/(HOUR_REAL*20));t2++;}const g2=us.find(u=>u!==g&&u.hp>0&&u.w==='mg');
  console.log(`tireur tué : ${g2?`${g2.name||g2.id} reprend la mitrailleuse en ${(t2/20).toFixed(1)} s`:'personne ne la reprend'}`);}
// des servants sans arme, sortis de la caserne avec des caisses : ils servent la pièce et la ravitaillent
{const W=new World(33);for(let h=0;h<24;h++)W.update(1);const cap=W.capital();W.s.designs.mg={id:'mg',f:'meumeu',name:'Mitrailleuse',status:'adopte',p:{d:2.2,l:8,nose:'pointue',base:'bt',cons:'fmj',c:.05,L:260,twist:70,action:'auto',rof:650,mag:150,heavy:true,wallx:1.6,mods:['trepied']}};
  const cas=W.addBuilding('meumeu','caserne',cap.i+8,cap.j+2,true);for(const k of ['m:mg','a:mg'])cap.stock[k]=10;
  const vs=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,3);for(const v of vs)W.enterBarracks(v,cas);
  const r1=W.releaseRecruits(cas,1,'soldat','mg',null),r2=W.releaseRecruits(cas,2,'servant','mg',null);
  const ms=W.s.units.filter(u=>u.homeBarracks===cas.id);console.log(`caserne : ${r1.ok?r1.text:r1.why} · ${r2.ok?r2.text:r2.why} · ${ms.map(u=>`${u.name}:${u.w||'sans arme'}${u.crates?' '+u.crates+' caisses':''}`).join(', ')}`);
  const g=ms.find(u=>u.w==='mg');g.pouch=0;W.formSquad(ms.map(u=>u.id));for(let t=0;t<60;t++)W.update(1/(HOUR_REAL*10));
  console.log(`servants : ${ms.filter(u=>u.serve===g.id).length} · munitions du tireur ${g.mag}+${g.pouch} · caisses des servants ${ms.filter(u=>!u.w).map(u=>(u.crates||0).toFixed(2)).join(', ')}`);}
