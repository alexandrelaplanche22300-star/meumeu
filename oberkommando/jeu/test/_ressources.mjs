// L'épuisement des ressources et la croissance bèè, d'une sauvegarde à l'autre — node test/_ressources.mjs <sauvegarde…>
// Par rive : ce qui reste dans les filons (somme de « left » sur la somme de « max », par ressource), les filons vides ; les arbres ; et l'empire bèè.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
for(const f of process.argv.slice(2)){const W=new World(1).restore(fs.readFileSync(f,'utf8'));const s=W.s,mid=W.N/2,B=s.beee;const bee=s.beee.cities.reduce((n,c)=>n+c.x,0)/s.beee.cities.length>mid;
  const side=n=>(n.i>mid)===bee?'bèè':'meumeu';const R={};
  for(const n of s.nodes){if(n.type!=='ore'&&n.type!=='tree'&&n.type!=='rock')continue;const k=side(n)+' '+(n.type==='ore'?n.res:n.type==='tree'?'bois':'roche');const r=R[k]??={left:0,max:0,n:0,empty:0};r.left+=Math.max(0,n.left||0);r.max+=n.max||n.left||0;r.n++;if(!(n.left>=1))r.empty++;}
  const pct=k=>R[k]?Math.round(100*R[k].left/Math.max(1,R[k].max))+' %'+(R[k].empty?` (${R[k].empty}/${R[k].n} vides)`:''):'—';
  const res=['fer','charbon','pierre','cuivre','plomb','salpetre','bois'];
  const bU=s.units.filter(u=>u.f==='beee'&&u.hp>0).length,bS=s.units.filter(u=>u.f==='beee'&&u.hp>0&&u.k!=='villageois').length,bC=B.cities.filter(c=>!c.fallen).length;
  console.log(`== ${f.replace(/.*_saves\//,'')} · J${W.day} · Bèè ${bU} unités (${bS} soldats), ${bC} villes, ${(B.fort?.count||0)} ouvrages`);
  for(const sd of ['meumeu','bèè'])console.log(`   rive ${sd} : `+res.map(r=>`${r} ${pct(sd+' '+r)}`).join(' · '));}
