// sonde temporaire : pourquoi les recrues bèè restent en caserne (armes, cartouches, plomb)
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const SEED=+(process.argv[2]||104),DAYS=+(process.argv[3]||20);
const W=new World(SEED);const bot=player(W);
for(let h=0;h<DAYS*24;h++){try{bot.tick();}catch(e){}W.update(1);W.events.length=0;
  if(h%72===71){const P=W.s.beee.plan||{};const nat=P.nat||{},T=P.T||{};const f=k=>`${Math.round(nat[k]||0)}/${Math.round(T[k]??0)} D${(P.D?.[k]??0).toFixed(2)}`;
    const mines=W.beeeBuildings('mine').filter(b=>b.done).map(b=>W.s.nodes[b.ore]?.res);const mc={};for(const r of mines)mc[r]=(mc[r]||0)+1;
    const ars=W.beeeBuildings('arsenal').filter(b=>b.done).map(b=>`${b.prod}:${(b.why||'ok').slice(0,40)}`);
    const man=W.beeeBuildings('manufacture').map(b=>b.done?`:`:'chantier');const plombNodes=W.s.nodes.filter(n=>n.res==='plomb'&&n.left>0).length;
    const cas=W.beeeBuildings('caserne').filter(b=>b.done).slice(0,4).map(b=>{const H=W.have('beee',b.i+1,b.j+1);return `[in ${(b.inside||[]).length} a ${Math.round(H['a:bee_fusil']||0)} m ${(H['m:bee_fusil']||0).toFixed(1)} why ${(b.why||'').slice(0,30)}]`;}).join(' ');
    console.log(`j${W.day} sold ${P.sold}/${P.pop} | a:fusil ${f('a:bee_fusil')} m:fusil ${f('m:bee_fusil')} | plomb ${f('plomb')} cuivre ${f('cuivre')} poudre ${f('poudre')} | mines ${JSON.stringify(mc)} filons plomb ${plombNodes} | manuf ${JSON.stringify(man)} | arsenaux ${ars.length} | ${cas}`);}}
