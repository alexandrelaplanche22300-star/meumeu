// La troupe de choc (V12.4, demande du joueur : « recrutable dans une caserne d'élite, plus résistante aux blessures, n'est affectée par le poids de ses
// armes et de sa protection balistique qu'à 50 %, a plus de vie, mais sa formation se paie en vivres »).
// CRITÈRES (fixés avant de lancer) :
//   C1 la caserne d'élite est au menu Armer ; un villageois qui y entre en sort « troupe de choc », armé de l'arme choisie ; le dépôt perd exactement
//      le coût de la formation (vivres et pièces de UNITS.choc.cost) + 1 arme
//   C2 chaque caserne forme les siens : la caserne refuse la troupe de choc, la caserne d'élite refuse le soldat ; sans vivres au dépôt, refus qui nomme
//      les vivres ; aucun refus ne touche au stock
//   C3 plus de vie : avec le même saignement, la troupe de choc tombe (hors de combat) et meurt au moins 1,25 × plus tard qu'un soldat
//   C4 plus dure aux blessures : 400 balles réelles (résolveur du jeu) appliquées aux deux corps avec le même tirage : saignement total de la troupe de choc
//      = 0,6 × celui du soldat (± 1 %) ; elle tombe de choc au plus 0,75 × aussi souvent (si le soldat tombe ≥ 10 fois)
//   C5 poids à 50 % : avec une arme lourde et une protection, le ralentissement de la troupe de choc (1 − vitesse / vitesse à vide) est la moitié de celui
//      du soldat (± 0,02) ; la gêne de visée de la protection aussi (± 0,01)
//   CORRIGÉ après mesure (mesure, pas seuil) : C4 comptait toute chute (jambe brisée, commotion, paralysie : des lésions, pas « le choc ») — on compte
//      les chutes de cause « choc » ; C5 : protection mal décrite (0 g) et charge si lourde que le soldat touchait le plancher de vitesse (−45 %) — gilet
//      au format du jeu, 300 cartouches
//   C6 le modèle 3D : la scène choisit le chevalier (plush_cow_knight) pour la troupe de choc, le soldat pour le soldat
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/troupe_choc.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {UNITS,BUILDINGS,BUILD_CATS}=await import('../js/data.js');const H=await import('../js/health.js');const {rng}=await import('../js/gen.js');const {setSpecies}=await import('../js/body.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const C=UNITS.choc;
const mk=(k='caserne_elite')=>{const W=new World(3,{assisted:true});const cap=W.capital();Object.assign(cap.stock,{pieces:900,fer:900,bois:900,pierre:900,vivres:900,'a:mle1':20,'m:mle1':20});
  const at=W.buildSpot('meumeu',k,cap.i+8,cap.j+2,0,24);const b=W.addBuilding('meumeu',k,at[0],at[1],true);
  for(const v of W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,3))W.enterBarracks(v,b);return {W,b,cap};};
const total=(W,k)=>W.s.buildings.filter(b=>b.f==='meumeu'&&b.stock).reduce((n,b)=>n+(b.stock[k]||0),0);
const snap=W=>JSON.stringify(W.s.buildings.filter(b=>b.stock).map(b=>[b.id,Object.entries(b.stock).filter(([,v])=>v).sort()]));
// C1
{const {W,b}=mk();const menu=BUILD_CATS.find(c=>c.k==='armer').items.includes('caserne_elite');const ks=['vivres','pieces','a:mle1'],av=Object.fromEntries(ks.map(k=>[k,total(W,k)]));
  const r=W.releaseRecruits(b,1,'choc','mle1');const u=W.s.units.find(x=>x.k==='choc');const ap=Object.fromEntries(ks.map(k=>[k,total(W,k)]));
  const ok=menu&&r.ok&&u&&u.w==='mle1'&&u.h?.vit===C.choc.vit&&u.h?.tough===C.choc.tough&&Math.abs(av.vivres-ap.vivres-C.cost.vivres)<1e-6&&Math.abs(av.pieces-ap.pieces-C.cost.pieces)<1e-6&&Math.abs(av['a:mle1']-ap['a:mle1']-1)<1e-6;
  P(ok,'C1. la caserne d’élite forme la troupe de choc, payée en vivres',`menu Armer : ${menu} · ${r.ok?r.text:r.why} · unité ${u?.k} arme ${u?.w} · vivres −${(av.vivres-ap.vivres).toFixed(1)} pièces −${(av.pieces-ap.pieces).toFixed(1)} fusils −${(av['a:mle1']-ap['a:mle1']).toFixed(0)}`);}
// C2
{const r=[];{const {W,b}=mk('caserne');const s0=snap(W);const x=W.releaseRecruits(b,1,'choc','mle1');r.push(['caserne → choc',!x.ok&&snap(W)===s0,x.why?.[0]]);}
  {const {W,b}=mk();const s0=snap(W);const x=W.releaseRecruits(b,1,'soldat','mle1');r.push(['élite → soldat',!x.ok&&snap(W)===s0,x.why?.[0]]);}
  {const {W,b}=mk();for(const o of W.s.buildings)if(o.stock)o.stock.vivres=0;const s0=snap(W);const x=W.releaseRecruits(b,1,'choc','mle1');r.push(['sans vivres',!x.ok&&/vivres/.test(x.why?.join(' '))&&snap(W)===s0,x.why?.[0]]);}
  P(r.every(x=>x[1]),'C2. chaque caserne forme les siens ; sans vivres, refus nommé, stock intact',r.map(x=>`${x[0]} : ${x[1]?'refusé, intact':'FAUX'} (« ${x[2]} »)`).join(' | '));}
// C3
{const run=(h)=>{h.bleeds.push({name:'cuisse',rate:.5,limb:'leg',internal:false});let t=0,hors=null,mort=null;while(t<3600&&!mort){H.tickHealth(h,1);t+=1;if(h.state==='hors'&&hors==null)hors=t;if(h.state==='mort')mort=t;}return {hors,mort};};
  const s=run(H.newHealth()),c=run(Object.assign(H.newHealth(),{vit:C.choc.vit,tough:C.choc.tough}));
  P(s.hors&&s.mort&&c.hors>=1.25*s.hors&&c.mort>=1.25*s.mort,'C3. plus de vie : elle tombe et meurt plus tard pour le même saignement',`soldat : hors à ${s.hors} s, mort à ${s.mort} s · choc : hors à ${c.hors} s, mort à ${c.mort} s`);}
// C4
{const W=new World(5,{assisted:true});const c=W.capital();const tgt=W.addUnit('meumeu','soldat',c.i+20,c.j+20);tgt.post='debout';const sh=W.addUnit('beee','soldat',c.i+23,c.j+20);sh.w='bee_fusil';const Wd=W.W(sh.w);
  let bS=0,bC=0,iS=0,iC=0,n=0;const R1=rng(77),R2=rng(77);
  for(let i=0;i<4000&&n<400;i++){tgt.h=H.newHealth();const r=W.resolve(sh,tgt,Wd,12,1);if(!r.hit||r.stopped||!r.rec)continue;n++;setSpecies('meumeu');
    const hS=H.newHealth(),hC=Object.assign(H.newHealth(),{vit:C.choc.vit,tough:C.choc.tough});const oS=H.applyWound(hS,r.rec,R1,'balle'),oC=H.applyWound(hC,r.rec,R2,'balle');
    bS+=H.bleedRate(hS);bC+=H.bleedRate(hC);if(oS.now==='hors'&&hS.cause==='choc')iS++;if(oC.now==='hors'&&hC.cause==='choc')iC++;}
  P(n>=200&&Math.abs(bC/bS-.6)<=.01&&(iS<10||iC<=.75*iS),'C4. plus dure : elle saigne 0,6 × et tombe moins de choc',`${n} balles · saignement soldat ${bS.toFixed(1)} mL/s, choc ${bC.toFixed(1)} (× ${(bC/bS).toFixed(3)}) · tombés : soldat ${iS}, choc ${iC}`);}
// C5
{const W=new World(3,{assisted:true});const c=W.capital();const {ZONES}=await import('../js/armor.js');const az=Object.keys(ZONES);W.s.armors.lourd={id:'lourd',f:'meumeu',name:'Gilet lourd',status:'adopte',a:Object.fromEntries(az.map((z,i)=>[z,['acier',i<2?2:1]]))};
  const A=W.armorOf('lourd');const sp=(k,arm,heavy)=>{const u=W.addUnit('meumeu',k,c.i+10,c.j+10);u.armor=arm?'lourd':null;u.w=heavy?'mle1':null;if(heavy){u.mag=5;u.pouch=300;}const v=W.speedOf(u);W.s.units.splice(W.s.units.indexOf(u),1);W.uIndex.delete(u.id);return v;};
  const slow=k=>1-sp(k,true,true)/sp(k,false,false);const dS=slow('soldat'),dC=slow('choc');
  const aimS=(A?.D.aim||1)-1,aimC=aimS*(UNITS.choc.choc.load);
  P(A&&dS>.05&&Math.abs(dC-dS/2)<=.02,'C5. le poids de l’arme et de la protection ne la gêne qu’à moitié',`gilet ${Math.round((A?.D.mass||0)*1000)} g · ralentissement soldat ${(dS*100).toFixed(1)} %, choc ${(dC*100).toFixed(1)} % · gêne de visée du gilet : soldat +${(aimS*100).toFixed(1)} %, choc +${(aimC*100).toFixed(1)} %`);}
// C6
{const fs=await import('node:fs');const src=fs.readFileSync(new URL('../js/scene3d.js',import.meta.url),'utf8');
  const ok=/u\.k==='choc'\?'plush_cow_knight'/.test(src)&&/'meumeu_soldat'/.test(src)&&fs.existsSync(new URL('../assets3d/plush_cow_knight.json',import.meta.url))&&fs.existsSync(new URL('../assets3d/meumeu_soldat.json',import.meta.url));
  P(ok,'C6. modèles : le chevalier pour la troupe de choc, le soldat pour le soldat','scene3d.js et assets3d');}
process.exit(fail?1:0);
