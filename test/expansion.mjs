// L'expansion des Bèè, mesurée : combien de villes au fil des jours, à quel rythme on fonde, et qu'est-ce qui freine (colonyWhy).
// CRITÈRES (fixés avant de modifier quoi que ce soit) — joueur passif, 30 jours :
//   E1 villes bèè debout au jour 30 : ≥ 6 en moyenne et ≥ 5 à chaque graine
//   E2 première colonie fondée avant le jour 5, à chaque graine
//   E3 aucun blocage durable : jamais plus de 5 jours consécutifs sans nouvelle fondation avant que la carte soit pleine
//   E4 aucune exception, et le temps de calcul d'un jour de jeu reste ≤ 2,5 × celui du départ (l'empire grandit, le jeu doit rester fluide)
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/expansion.mjs <graine> [jours]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const seed=+(process.argv[2]||101),days=+(process.argv[3]||30);
const W=new World(seed);const B=W.s.beee;const why={};let lastFounded=0,lastT=0,maxGap=0,first=null;const rows=[];const cost=[];
for(let h=1;h<=days*24;h++){const t0=performance.now();try{W.update(1);}catch(e){console.log('EXCEPTION',e.stack.split('\n').slice(0,3).join(' | '));process.exit(2);}
  cost.push(performance.now()-t0);
  const w=(B.colonyWhy||'').replace(/ : .*/,'').replace(/\d+ fondation/,'N fondation');why[w]=(why[w]||0)+1;
  if((B.founded||0)>lastFounded){if(first===null)first=h/24;maxGap=Math.max(maxGap,(h-lastT)/24);lastT=h;lastFounded=B.founded;}
  if(h%(24*5)===0)rows.push(`j${h/24}:${B.cities.filter(c=>!c.fallen).length}v/${B.founded||0}f`);}
const alive=B.cities.filter(c=>!c.fallen).length;
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;const early=avg(cost.slice(24,72)),late=avg(cost.slice(-72));
console.log(`graine ${seed} · ${rows.join(' ')} · villes au jour ${days} : ${alive} · fondées ${B.founded||0} · première fondation j${first==null?'—':first.toFixed(1)} · plus long silence ${maxGap.toFixed(1)} j · ms/h ${early.toFixed(1)} → ${late.toFixed(1)} (×${(late/early).toFixed(2)})`);
console.log('  freins :',Object.entries(why).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k||'(libre)'} ${v}`).join(' · '));
