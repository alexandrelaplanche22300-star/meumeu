// Pourquoi les chantiers côtiers n'avancent pas : état de chaque ouvrage ouvert (bâtisseurs, matériaux, raison)
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const B=W.s.beee;
const show=()=>{const sites=W.s.buildings.filter(b=>b.f==='beee'&&BUILDINGS[b.k]?.bunker&&!b.ruin);const done=sites.filter(b=>b.done);const open=sites.filter(b=>!b.done);
  const why={};for(const b of open){const k=(b.why||'?').replace(/[0-9.,]+/g,'#').replace(/n°#.*$/,'').slice(0,70);why[k]=(why[k]||0)+1;}
  const bld=open.map(b=>W.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).length);
  console.log(`J${W.day} h${(W.s.t%24)|0} | finis ${done.length} ouverts ${open.length} | bâtisseurs par chantier ${bld.join(',')} | progrès moyen ${(open.reduce((n,b)=>n+(b.progress||0),0)/Math.max(1,open.length)).toFixed(2)} | civils bèè ${W.beeeCivilians().length} dont libres ${W.beeeAvailable(1200,750,2000).length}`);
  for(const [k,n] of Object.entries(why).sort((a,z)=>z[1]-a[1]).slice(0,5))console.log('   ',n,k);
  console.log('    fortTick : on',B.fort?.on,'count',B.fort?.count,'| réserve nationale',JSON.stringify(Object.fromEntries(['pierre','bois','fer','pieces'].map(k=>[k,Math.round(B.plan?.nat?.[k]||0)]))));};
show();for(let d=0;d<4;d++){for(let k=0;k<24*60;k++)W.update(1/60);show();}
{const C=W.beeeCivilians();const by={};for(const u of C){const k=u.task?.kind||'aucune';by[k]=(by[k]||0)+1;}console.log('civils',C.length,JSON.stringify(by));}
