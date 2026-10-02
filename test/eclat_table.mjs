// Létalité mesurée d'UN éclat selon son énergie, avec les fonctions du jeu (bodyRay → wound → applyWound), sur un Meumeu debout.
// grave = hors de combat ou mort tout de suite ; blessé = au moins une blessure enregistrée. Sert à caler pGrave / pBless (explosive.js).
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/eclat_table.mjs [essais]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const {fragDesign}=await import('../js/designs.js');
const {wound}=await import('../js/ballistics.js');
const {setSpecies,SILH}=await import('../js/body.js');
const {newHealth,applyWound}=await import('../js/health.js');
const N=+(process.argv[2]||800);const W=new World(7);
const dOf=g=>2*Math.cbrt(3*(g*1000/7.85)/(4*Math.PI));
const [sw,sh]=SILH.debout;
function measure(mKg,E){const v=Math.sqrt(2*E/mKg),D=fragDesign(mKg,dOf(mKg));let grave=0,bless=0,touche=0;
  for(let i=0;i<N;i++){const alpha=W.rand()*Math.PI*2;let hit=null;
    for(let t=0;t<5&&!hit;t++)hit=W.bodyRay([(W.rand()-.5)*sw*1.6,W.rand()*sh,2],[0,.05*(W.rand()-.5),-1],alpha,'debout','meumeu');
    if(!hit)continue;touche++;setSpecies('meumeu');
    const rec=wound(D,v,hit.p,hit.d,W.rand,W.rand()*1.5),h=newHealth(),o=applyWound(h,rec,W.rand,'éclat');
    if(h.state==='hors'||h.state==='mort'||o?.now==='hors'||o?.now==='mort')grave++;
    if((h.wounds?.length||0)>0||(h.bleeds?.length||0)>0)bless++;}
  return {g:grave/Math.max(1,touche),b:bless/Math.max(1,touche),touche};}
const Es=[.5,1,2,5,10,20,50,100,200,500,1000,2000,4000],Ms=[.0005,.001,.004];
console.log('E (J)   '+Ms.map(m=>`${(m*1000).toFixed(1)} g grave/blessé`).join('   '));
const rows=[];
for(const E of Es){const r=Ms.map(m=>measure(m,E));rows.push({E,g:r.reduce((a,x)=>a+x.g,0)/r.length,b:r.reduce((a,x)=>a+x.b,0)/r.length});
  console.log(String(E).padStart(6)+'   '+r.map(x=>`${x.g.toFixed(3)} / ${x.b.toFixed(3)}`.padEnd(20)).join(' '));}
console.log('\nMOYENNE (sur les masses) — à mettre dans explosive.js :');
console.log('GRAVE  = '+JSON.stringify(rows.map(r=>[r.E,+r.g.toFixed(3)])));
console.log('BLESSE = '+JSON.stringify(rows.map(r=>[r.E,+r.b.toFixed(3)])));
