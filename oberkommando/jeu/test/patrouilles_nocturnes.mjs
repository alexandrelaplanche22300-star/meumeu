// Scénario 2, partie B — les rondes de nuit d'une ville bèè, sur le vrai World.prototype (strategy.js actif).
// On laisse la ville grandir WARM jours, on met la nuit, et on suit 24 h de jeu : départs, binômes simultanés, itinéraire réel
// (pas de téléportation), passage devant les infrastructures sensibles, garnison minimale, retour à la ville.
// Puis, à +6 h, un tir à 15 cases d'un binôme en ronde : combien de temps avant qu'il réagisse, et la ville se vide-t-elle ?
// Les patrouilles de RECONNAISSANCE (search + scout) ne comptent pas comme des réponses à une alerte.
//   node test/patrouilles_nocturnes.mjs [nbGraines=10] [graineDeDépart=1] [joursDeCroissance=3]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TERRAIN}=await import('../js/data.js');
const NS=+(process.argv[2]||10),S0=+(process.argv[3]||1),WARM=+(process.argv[4]||3);
const DT=1/120,SPAN=24;const SENS=new Set(['mine','gare','entrepot','camp','poudrerie','arsenal','manufacture','moulin','caserne','atelier']);
const f=(v,d=2)=>v==null?'—':(typeof v==='number'?v.toFixed(d):String(v));
function run(seed){
  const W=new World(seed);for(let h=0;h<6+WARM*24;h++)W.update(1);
  const B=W.s.beee;const cities=B.cities.filter(c=>!c.fallen);
  const c=cities.slice().sort((a,b)=>W.beeeTroops(b).length-W.beeeTroops(a).length)[0];
  W.s.solar=18.5;const t0=W.s.t;                                   // début de nuit
  const R={seed,city:c.name,guards0:W.beeeGuards(c).length,troops0:W.beeeTroops(c).length,keep:W.beeeGarrisonMin(c),night:W.light()};
  const infra=W.s.buildings.filter(b=>b.f==='beee'&&b.done&&!b.ruin&&SENS.has(b.k)&&Math.hypot(b.i-c.x,b.j-c.y)<160);R.infraN=infra.length;
  const visited=new Set(),prev=new Map(),pairsMax=[0],ptsFar=[];let tele=0,reappear=0,minTroops=R.troops0,alertUnit=null,alertT=null,reactT=null,mob=0,minGuards=R.guards0,maxRadius=0,mobMax=0,patT=null,alertHome=null;
  const isPat=u=>u.f==='beee'&&!u.band&&u.city===c.id&&u.task?.kind==='patrol';
  const patrols=()=>W.s.units.filter(isPat);
  for(let n=0;n<SPAN/DT;n++){
    W.update(DT);const t=W.s.t-t0;
    const P=patrols();if(P.length&&patT==null)patT=t;pairsMax[0]=Math.max(pairsMax[0],Math.floor(P.length/2));
    for(const u of W.s.units){if(u.f!=='beee'||u.city!==c.id)continue;const q=prev.get(u.id);const d=q?Math.hypot(u.x-q[0],u.y-q[1]):0;
      if(q&&d>3&&q[2]!=='enlist'){if(n-q[3]>1){reappear++;}else{tele++;if(process.env.DBG)console.log(`   SAUT t=${t.toFixed(2)} ${d.toFixed(1)} c unité ${u.id} avant=${q[2]} maintenant=${u.task?.kind} (${q[0].toFixed(0)},${q[1].toFixed(0)})→(${u.x.toFixed(0)},${u.y.toFixed(0)})`);}}
      prev.set(u.id,[u.x,u.y,u.task?.kind,n]);}   // une recrue qui prend son poste, ou une unité sortie d'un bâtiment après y être entrée, n'est pas une téléportation
    for(const u of P){maxRadius=Math.max(maxRadius,Math.hypot(u.x-c.x,u.y-c.y));for(const b of infra)if(!visited.has(b.id)&&Math.hypot(u.x-(b.i+1),u.y-(b.j+1))<9)visited.add(b.id);}
    minGuards=Math.min(minGuards,W.beeeGuards(c).length);minTroops=Math.min(minTroops,W.beeeTroops(c).length);
    const away=W.s.units.filter(u=>u.f==='beee'&&u.city===c.id&&!u.band&&(u.task?.kind==='patrol'||(u.task?.kind==='search'&&!u.task.scout))).length;mobMax=Math.max(mobMax,away/Math.max(1,R.troops0));
    // alerte locale : à +6 h, un commando tire à 15 cases d'un binôme en ronde
    if(alertT==null&&t>=6&&P.length){alertUnit=P[0];const a=Math.atan2(alertUnit.y-c.y,alertUnit.x-c.x)+1.2;const x=alertUnit.x+Math.cos(a)*15,y=alertUnit.y+Math.sin(a)*15;
      if(TERRAIN[W.G.terrain[Math.floor(y)*W.N+Math.floor(x)]]?.walk){const cm=W.addUnit('meumeu','soldat',x,y);cm.w='mle1';cm.mag=5;cm.pouch=20;W.shotNoise(cm,W.W('mle1'),x+20,y);alertT=t;alertHome=[alertUnit.x,alertUnit.y];R.alertDist=Math.hypot(alertUnit.x-x,alertUnit.y-y);R.guardsAtAlert=W.beeeGuards(c).length;}}
    if(alertT!=null&&reactT==null&&t>alertT){const r=W.s.units.some(u=>u.f==='beee'&&!u.band&&u.city===c.id&&u.task?.kind==='search'&&!u.task.scout&&u.task.t0>=t0+alertT-1e-9);if(r)reactT=t-alertT;}
  }
  R.patT=patT;R.pairsMax=pairsMax[0];R.tele=tele;R.reappear=reappear;R.visited=visited.size;R.maxRadius=maxRadius;R.minGuards=minGuards;R.minTroops=minTroops;R.mobMax=mobMax;R.reactT=reactT;R.alertT=alertT;
  R.patEnd=patrols().length;R.guardsEnd=W.beeeGuards(c).length;R.troopsEnd=W.beeeTroops(c).length;
  return R;}
console.log(`### scénario 2B — rondes de nuit · ${NS} graines · croissance ${WARM} jour(s) · 24 h de jeu de nuit · durées en heures de jeu`);
const all=[];for(let s=S0;s<S0+NS;s++){const r=run(s);all.push(r);
  console.log(`graine ${s} · ${r.city} : gardes ${r.guards0} · troupes ${r.troops0} · garnison min ${r.keep} · surplus ${r.troops0-r.keep} · infra ${r.infraN} · 1re ronde ${f(r.patT)} h · binômes max ${r.pairsMax} · rayon max ${f(r.maxRadius,0)} c · infra passées ${r.visited} · téléport. ${r.tele} (réapparitions ${r.reappear}) · gardes min ${r.minGuards} · troupes min ${r.minTroops}/${r.troops0} · part max mobilisée ${f(r.mobMax*100,0)} % · réaction à l'alerte ${f(r.reactT)} h · fin : rondes ${r.patEnd}, gardes ${r.guardsEnd}/${r.guards0}`);}
const n=all.length,cnt=fn=>all.filter(fn).length;const line=(l,v)=>console.log(l.padEnd(70),v);
console.log('\n===== critères (villes avec ≥ 8 gardes seulement, puis toutes) =====');
for(const [nom,set] of [['≥ 8 gardes',all.filter(r=>r.guards0>=8)],['toutes',all]]){const m=set.length;const c2=fn=>set.filter(fn).length;console.log(`\n-- ${nom} (${m} villes)`);
  line('une ronde part dans les 2 h après le début de la nuit',`${c2(r=>r.patT!=null&&r.patT<=2)}/${m}`);
  line('au moins 2 binômes en ronde',`${c2(r=>r.pairsMax>=2)}/${m}`);
  line('un binôme reste urbain (rayon < 20) et un autre sort (rayon > 30)',`${c2(r=>r.maxRadius>30)}/${m} sortent au-delà de 30 c`);
  line('au moins une infrastructure sensible approchée (< 9 c)',`${c2(r=>r.visited>=1)}/${m}`);
  line('aucune téléportation',`${c2(r=>r.tele===0)}/${m}`);
  line('garnison conservée : troupes ≥ 50 % de l’effectif de départ',`${c2(r=>r.minTroops>=r.troops0*.5)}/${m}`);
  line('gardes jamais < 2 (attention : la démobilisation de famine y compte)',`${c2(r=>r.minGuards>=2)}/${m}`);
  line('jamais plus de 50 % de la garnison en ronde ou recherche',`${c2(r=>r.mobMax<=.5)}/${m}`);
  line('réaction à une alerte locale ≤ 0,5 h',`${c2(r=>r.reactT!=null&&r.reactT<=.5)}/${c2(r=>r.alertT!=null)} testées`);
  line('rondes terminées et gardes revenus à la fin des 24 h',`${c2(r=>r.patEnd===0&&r.guardsEnd>=r.guards0)}/${m}`);}
