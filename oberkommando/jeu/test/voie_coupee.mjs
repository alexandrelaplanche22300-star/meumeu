// Une voie bèè coupée : le réseau doit se scinder, puis les poseurs bèè doivent la réparer. Usage : voie_coupee.mjs <graine> <jours avant> <jours après>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const [seed,D1,D2]=[+(process.argv[2]||104),+(process.argv[3]||14),+(process.argv[4]||6)];
const W=new World(seed);const P=player(W);const N=W.N;
const days=n=>{for(let d=0;d<n;d++)for(let h=0;h<24;h++){try{P.tick();}catch(e){}const st=W.s.t<72?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);W.events.length=0;}};
days(D1);
const c=W.s.beee.cities.find(c=>c.railCells&&c.railCells.length>8&&c.railCells.every(([i,j])=>W.s.rails[j*N+i]?.b));
if(!c){console.log('AUCUNE ligne finie à couper au jour',D1);process.exit(0);}
const mid=c.railCells[c.railCells.length>>1];const k=mid[1]*N+mid[0];
const gares=W.s.buildings.filter(b=>b.f==='beee'&&b.k==='gare'&&b.done&&!b.ruin);
const nets=()=>new Set(gares.map(g=>W.netOf(g))).size;
const n0=nets();W.lineBroken('rail',k);const n1=nets();
console.log(`ville ${c.name} · ${c.railCells.length} cases · coupe en (${mid}) · réseaux de gares ${n0} → ${n1} (doit augmenter) · case posée ${W.s.rails[k].b}`);
for(let d=1;d<=D2;d++){days(1);console.log(`  jour +${d} : case réparée ${W.s.rails[k].b?'OUI':'non'} · réseaux ${nets()} · poseurs ${W.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='line'&&u.task.line==='rail').length}`);if(W.s.rails[k].b)break;}
