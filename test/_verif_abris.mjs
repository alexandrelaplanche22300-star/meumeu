// vérification (V12.5) : « aux abris » local — les villageois alliés à portée d'un Bèè vu s'abritent, les autres continuent de produire
//   node test/_verif_abris.mjs <sauvegarde> <jours>  → toutes les 3 h : à l'abri, au travail, total ; morts par type ; pic d'abrités
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s;const dead={};let shelterN=0,peak=0,sumHid=0,sumAll=0,n=0;
{const d0=W.death.bind(W);W.death=u=>{if(u.hp>0){const k=u.f+' '+u.k;dead[k]=(dead[k]||0)+1;}return d0(u);};}
{const s0=W.shelter.bind(W);W.shelter=u=>{const r=s0(u);if(r&&u.f==='meumeu')shelterN++;return r;};}
const WORK=new Set(['work','gather','build','line','haul','carry','deliver']);
for(let h=1;h<=24*(+process.argv[3]||6);h++){for(let k=0;k<60;k++)W.update(1/60);if(h%3)continue;
  const hid=s.buildings.filter(b=>b.ally).reduce((a,b)=>a+(b.hide||[]).filter(u=>u.k==='villageois').length,0);const V=s.units.filter(u=>u.ally&&u.k==='villageois'&&u.hp>0);
  const work=V.filter(u=>WORK.has(u.task?.kind)||u.inBarracks).length,toShelter=V.filter(u=>u.task?.kind==='shelter').length;peak=Math.max(peak,hid+toShelter);sumHid+=hid+toShelter;sumAll+=hid+V.length;n++;
  if(h%12===0)console.log(`J${(s.t/24).toFixed(1)} · à l'abri ${hid} (+${toShelter} en route) · au travail ${work} · villageois ${V.length+hid} · morts ${JSON.stringify(dead)}`);}
console.log(`bilan : mises à l'abri ${shelterN} · pic ${peak} villageois abrités ensemble · en moyenne ${(100*sumHid/Math.max(1,sumAll)).toFixed(1)} % des villageois à l'abri · morts ${JSON.stringify(dead)}`);
