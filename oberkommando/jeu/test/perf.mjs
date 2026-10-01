// Le coût d'une image en fin de partie : on mène le monde jusqu'au jour J (ou on recharge l'instantané), puis on profile les ticks.
//   node test/perf.mjs <graine> <jour> [profil.cpuprofile]      (l'instantané : test/.perf-<graine>-<jour>.bin)
const out={textContent:''};globalThis.document??={getElementById:()=>out};
import {Session} from 'node:inspector/promises';import fs from 'node:fs';import v8 from 'node:v8';
const {World}=await import('../js/world.js');const {generate,rng}=await import('../js/gen.js');const {Pather}=await import('../js/path.js');const {player}=await import('./bot.mjs');
const [seed,DAY,prof]=[+(process.argv[2]||302),+(process.argv[3]||70),process.argv[4]];const snap=`test/.perf-${seed}-${DAY}.bin`;
let W,t0=Date.now();
if(fs.existsSync(snap)){const s=v8.deserialize(fs.readFileSync(snap));W=Object.create(World.prototype);W.events=[];const G=generate(s.seed);W.G=G;W.N=G.N;W.rand=rng(seed*31+5);W.pather=new Pather(W.N);W.s=s;W.remod();W.grids();}
else{W=new World(seed);const P=player(W);for(let h=0;h<DAY*24;h++){try{P.tick();}catch(e){}W.update(1);W.events.length=0;if(h%240===0)process.stdout.write(`j${h/24|0} `);}fs.writeFileSync(snap,v8.serialize(W.s));}
const cnt=f=>W.s.units.filter(u=>u.f===f&&u.hp>0).length;
console.log(`\nmonde prêt en ${((Date.now()-t0)/1000).toFixed(0)} s · Bèè ${cnt('beee')} · Meumeu ${cnt('meumeu')} · bâtiments ${W.s.buildings.length} · véhicules ${W.s.vehicles.length} · nœuds ${W.s.nodes.length}`);
const S=new Session();S.connect();if(prof){await S.post('Profiler.enable');await S.post('Profiler.setSamplingInterval',{interval:200});await S.post('Profiler.start');}
const frame=(n)=>{const a=performance.now();for(let k=0;k<n;k++){W.update(1/60/4);W.events.length=0;}return (performance.now()-a)/n;};
const ms=[];for(let r=0;r<3;r++)ms.push(frame(200));
while(W.light()>.5)W.update(.25);const night=[];for(let r=0;r<3;r++)night.push(frame(200));
const a=performance.now();let worst=0;for(let h=0;h<24;h++){const a1=performance.now();W.update(1);W.events.length=0;worst=Math.max(worst,performance.now()-a1);}const hour=(performance.now()-a)/24;
console.log(`image de jour ${ms.map(x=>x.toFixed(2)).join(' / ')} ms · de nuit ${night.map(x=>x.toFixed(2)).join(' / ')} ms · une heure de jeu ${hour.toFixed(0)} ms (la pire ${worst.toFixed(0)} ms)`);
if(prof){const {profile}=await S.post('Profiler.stop');fs.writeFileSync(prof,JSON.stringify(profile));
  const byId=new Map(profile.nodes.map(n=>[n.id,n]));const cntS=new Map();for(const s of profile.samples)cntS.set(s,(cntS.get(s)||0)+1);const tot=profile.samples.length;
  const name=n=>`${n.callFrame.functionName||'(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber+1}`;
  const self=new Map();for(const [id,c] of cntS){const k=name(byId.get(id));self.set(k,(self.get(k)||0)+c);}
  console.log([...self].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,c])=>`${(c/tot*100).toFixed(1).padStart(5)} %  ${k}`).join('\n'));
  const incl=new Map();const parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);
  for(const [id,c] of cntS){const seen=new Set();let x=id;while(x!=null){const k=name(byId.get(x));if(!seen.has(k)){seen.add(k);incl.set(k,(incl.get(k)||0)+c);}x=parent.get(x);}}
  console.log('--- inclusif');console.log([...incl].sort((a,b)=>b[1]-a[1]).slice(3,35).map(([k,c])=>`${(c/tot*100).toFixed(1).padStart(5)} %  ${k}`).join('\n'));}
