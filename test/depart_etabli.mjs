// Le « Départ établi » (partie avancée) : une chaîne industrielle prête, mais à l'arrêt.
// CRITÈRES (fixés avant de lancer ; graines 1 à 8) :
//   D1 cinq mines posées (salpêtre, plomb, cuivre, fer, charbon), chacune sur son filon (mine.ore défini), dans ≥ 7 graines sur 8
//   D2 exactement deux moulins achevés, chacun avec ≥ 4 ouvriers affectés
//   D3 [INITIAL] exactement un arsenal, une manufacture d'armes et une usine chimique, achevés, sans ouvrier ni production après 24 h
//   D3' [CORRIGÉ] même chose, mais « à l'arrêt » = aucun ouvrier, aucun lot en cours, non « working » (b.prod n'est que la production choisie par défaut, pas une activité)
//   D4 [INITIAL] les mines produisent : après 48 h, chacun des cinq minerais a augmenté dans les dépôts de la ville, dans ≥ 7 graines sur 8
//   D4bis [CORRIGÉ] même chose, mais le minerai va dans le camp de chaque mine, pas dans le dépôt de la capitale : on compte le stock de tous les bâtiments meumeu
//   D5 aucune exception en 72 h ; la ration reste ≥ 0,9
//   D6 « Dev » (graines 5 et 6, celles où un filon de pierre est posable) : mêmes bâtiments une seule fois (pas de doublon arsenal / manufacture / usine chimique), et la mine de pierre en plus
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/depart_etabli.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const F='meumeu',ORES=['salpetre','plomb','cuivre','fer','charbon'];
const done=(W,k)=>W.s.buildings.filter(b=>b.f===F&&b.k===k&&b.done&&!b.ruin);
const workersOf=(W,b)=>W.s.units.filter(u=>u.f===F&&u.hp>0&&u.task?.b===b.id).length;
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const seeds=[1,2,3,4,5,6,7,8];const R=[];
for(const s of seeds){const W=new World(s,{assisted:true});const cap=W.capital();
  const before={};const have0=W.have(F,cap.i+1,cap.j+1);for(const o of ORES)before[o]=have0[o]||0;const tot=o=>W.s.buildings.filter(b=>b.f===F).reduce((n,b)=>n+(b.stock?.[o]||0),0);const before2={};for(const o of ORES)before2[o]=tot(o);
  const info={s};try{
    info.mines=done(W,'mine');info.minesOre=new Set(info.mines.map(m=>W.building(m.id).ore!=null?(W.s.nodes.find(n=>n.id===W.building(m.id).ore)?.res||'?'):null).filter(Boolean));
    info.mills=done(W,'moulin').map(m=>workersOf(W,m));
    const boots={ars:done(W,'arsenal').length,man:done(W,'manufacture').length,pou:done(W,'poudrerie').length};info.boots=boots;
    let minRation=1;for(let h=0;h<24;h++){W.update(1);minRation=Math.min(minRation,cap.ration??1);}
    info.idle24=[...done(W,'arsenal'),...done(W,'manufacture'),...done(W,'poudrerie')].map(b=>workersOf(W,b)+(b.batch||b.making||b.prod?1:0));
    info.idleReal=[...done(W,'arsenal'),...done(W,'manufacture'),...done(W,'poudrerie')].map(b=>workersOf(W,b)+(b.batch||b.making||b.working?1:0));
    for(let h=24;h<72;h++){W.update(1);minRation=Math.min(minRation,cap.ration??1);if(h===47){const hv=W.have(F,cap.i+1,cap.j+1);info.gain=ORES.map(o=>[o,(hv[o]||0)-before[o]]);info.gain2=ORES.map(o=>[o,tot(o)-before2[o]]);}}
    info.minRation=minRation;}catch(e){info.err=String(e.stack||e).split('\n').slice(0,3).join(' | ');}
  R.push(info);}
const ok1=R.filter(r=>ORES.every(o=>r.minesOre?.has(o))).length;
P(ok1>=7,'D1. cinq mines sur leur filon',`${ok1}/8 graines · `+R.map(r=>`${r.s}:${[...(r.minesOre||[])].length}`).join(' '));
P(R.every(r=>r.mills?.length===2&&r.mills.every(n=>n>=4)),'D2. deux moulins avec ≥ 4 ouvriers chacun',R.map(r=>`${r.s}:[${r.mills}]`).join(' '));
const three=r=>r.boots?.ars===1&&r.boots?.man===1&&r.boots?.pou===1;
console.log(`INFO  D3. [critère INITIAL, mal posé : b.prod est la production choisie par défaut] ${R.every(r=>three(r)&&r.idle24?.every(n=>n===0))?'tenu':'raté, attendu'}`);
P(R.every(r=>three(r)&&r.idleReal?.every(n=>n===0)),'D3bis. [CORRIGÉ] arsenal, manufacture, usine chimique : un de chaque, à l arrêt',R.map(r=>`${r.s}:${r.boots?.ars}${r.boots?.man}${r.boots?.pou}/idle ${r.idleReal}`).join(' '));
const ok4=R.filter(r=>r.gain?.every(([o,g])=>g>0)).length;
console.log(`INFO  D4. [critère INITIAL, dépôt de la capitale seul] ${ok4}/8 graines`);
const ok4b=R.filter(r=>r.gain2?.every(([o,g])=>g>0)).length;
P(ok4b>=7,'D4bis. [CORRIGÉ] les cinq minerais augmentent en 48 h (tous les stocks)',`${ok4b}/8 graines · `+R.map(r=>`${r.s}:${(r.gain2||[]).map(([o,g])=>o[0]+Math.round(g)).join(',')}`).join(' '));
P(R.every(r=>!r.err&&r.minRation>=.9),'D5. aucune exception, ration ≥ 0,9',R.map(r=>r.err?`${r.s}:ERR ${r.err}`:`${r.s}:${r.minRation.toFixed(2)}`).join(' '));
for(const sd of [5,6]){const W=new World(sd,{dev:true});const c=k=>done(W,k).length;const ores=new Set(done(W,'mine').map(m=>W.s.nodes.find(n=>n.id===m.ore)?.res));
 P(c('arsenal')===1&&c('manufacture')===1&&c('poudrerie')===1&&c('moulin')===2&&ores.has('pierre')&&ORES.every(o=>ores.has(o)),`D6. Dev graine ${sd} : pas de doublon, la pierre en plus`,`arsenal ${c('arsenal')} · manufacture ${c('manufacture')} · usine chimique ${c('poudrerie')} · moulins ${c('moulin')} · minerais ${[...ores]}`);}
process.exit(fail?1:0);
