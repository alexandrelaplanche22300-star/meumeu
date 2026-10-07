const out={textContent:''};globalThis.document??={getElementById:()=>out};
for(const f of (process.env.FLAGS||'').split(',').filter(Boolean))globalThis[f]=1;
const {World}=await import('../js/world.js');const W=new World(+(process.env.SEED||11));for(let h=0;h<96;h++)W.update(1);const bc=W.s.buildings.filter(b=>b.k==='centre'&&b.f==='beee'&&!b.ruin&&b.done);
console.log(process.env.FLAGS||'tout',bc.map(b=>{const st=W.cityStats(b);return st.res-st.cap;}).join(' '));
