// L'efficacité des débarquements (bèè et allié) depuis une sauvegarde : toutes les 12 h, les têtes de pont, les hommes à terre sur l'autre rive,
// les bâtiments détruits chez l'adversaire. node test/_tetes.mjs <sauvegarde> <jours>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const D=+(process.argv[3]||15),B=W.s.beee,mid=W.N/2,t0=Date.now();
const alive=u=>u.hp>0&&u.h?.state!=='hors'&&u.h?.state!=='mort';
const beeSide=(()=>{const c=B.cities.filter(c=>!c.fallen);return c.reduce((n,q)=>n+q.x,0)/c.length>mid;})();const onBee=u=>(u.x>mid)===beeSide;
const bldg=f=>W.s.buildings.filter(b=>b.f===f&&b.done&&!b.ruin).length;const m0=bldg('meumeu'),b0=bldg('beee');
let opsB=0,opsA=0,landB=0,landA=0;const seen=new Set();
const tally={meuDead:0,beeDead:0};
for(let h=0;h<D*24;h++){for(let k=0;k<60;k++){W.update(1/60);for(const o of W.s.amphi||[])if(!seen.has(o.id)){seen.add(o.id);if(o.f==='beee')opsB++;else if(o.ally)opsA++;}}
  if(h%12===11){const heads=(B.heads||[]).map(H=>W.amphiBeeHeadMen(H).length);const beeAshore=W.s.units.filter(u=>u.f==='beee'&&alive(u)&&!onBee(u)).length;
    const allyAshore=W.s.units.filter(u=>u.ally&&alive(u)&&onBee(u)).length;const al=W.s.ally;
    console.log(`J${W.day} ${String(Math.floor(W.hour())).padStart(2)}h · BÈÈ ops ${opsB} · têtes ${heads.length?heads.join('/'):'—'} · bèè sur notre rive ${beeAshore} · nos bâtiments ${bldg('meumeu')} (${bldg('meumeu')-m0>=0?'+':''}${bldg('meumeu')-m0}) · ALLIÉ ops ${opsA} · alliés sur la rive bèè ${allyAshore} · raid ${al?.raid?(al.raid.state||'en cours'):'—'} · bâtiments bèè ${bldg('beee')} (${bldg('beee')-b0>=0?'+':''}${bldg('beee')-b0}) · ${((Date.now()-t0)/60000).toFixed(1)} min`);}}
