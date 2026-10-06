// Les cartes : taille, parts de terrain, temps de génération, sites de départ ; en mode mer, un croquis (1 caractère = 15 cases) de cinq lignes.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {generate}=await import('../js/gen.js');const {T}=await import('../js/data.js');const {World}=await import('../js/world.js');
const seed=+(process.argv[2]||104);const NAMES=Object.keys(T);const CH={[T.deep]:'~',[T.shallow]:'-',[T.sand]:'s',[T.grass]:'g',[T.meadow]:'m',[T.dirt]:'d',[T.scrub]:'c',[T.rock]:'R',[T.snow]:'S'};
for(const mode of process.argv[3]?[process.argv[3]]:['classique','mer']){const t0=Date.now();const G=generate(seed,mode);const t1=Date.now();const N=G.N;const cnt={};for(const t of G.terrain)cnt[t]=(cnt[t]||0)+1;
  console.log(`\n== ${mode} · grille ${N}×${N} · génération ${t1-t0} ms · capitale ${G.capital} · bèè ${JSON.stringify(G.beee)} · filons ${G.deposits.length} · ressources ${G.nodes.length}`);
  console.log('  terrain : '+NAMES.map(n=>n+' '+((cnt[T[n]]||0)/(N*N)*100).toFixed(1)+'%').join(' · '));
  if(mode==='mer'){const [x0,y0,x1,y1]=G.bounds;console.log(`  rectangle jouable : ${x1-x0} × ${y1-y0}`);for(const j of [y0+30,y0+150,(y0+y1)/2,y1-150,y1-30]){let s='';for(let i=0;i<N;i+=15)s+=CH[G.terrain[j*N+i]];console.log('  '+s);}
    let sandMin=1e9,sandSum=0,sandN=0;for(let j=y0+60;j<y1-60;j+=10){let run=0;for(let i=500;i<1000;i++){if(G.terrain[j*N+i]===T.sand)run++;else if(run){sandMin=Math.min(sandMin,run);sandSum+=run;sandN++;run=0;}}}
    console.log(`  plage au centre (largeur) : min ${sandMin} · moyenne ${(sandSum/sandN).toFixed(1)} sur ${sandN} côtes`);
    let seaW=[];for(let j=y0+60;j<y1-60;j+=20){let n=0;for(let i=0;i<N;i++){const t=G.terrain[j*N+i];if(t===T.deep||t===T.shallow)if(i>500&&i<1000)n++;}seaW.push(n);}console.log(`  mer au centre (largeur) : min ${Math.min(...seaW)} · moyenne ${(seaW.reduce((a,b)=>a+b,0)/seaW.length).toFixed(0)} · max ${Math.max(...seaW)}`);}
  const t2=Date.now();const W=new World(seed,{map:mode});console.log(`  World : ${Date.now()-t2} ms · mémoire ${(process.memoryUsage().rss/1e6).toFixed(0)} Mo`);}
