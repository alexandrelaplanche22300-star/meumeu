const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const [file,H]=[process.argv[2],+(process.argv[3]||6)];
const W=new World(1).restore(fs.readFileSync(file,'utf8'));const pf=W.pather;const F0=pf.find.bind(pf);const st=[];
pf.find=(si,sj,ti,tj,cost,goal,max)=>{const t=performance.now();const r=F0(si,sj,ti,tj,cost,goal,max);const d=performance.now()-t;const L=Math.hypot(ti-si,tj-sj);st.push({d,done:r.done,L,len:r.path.length,max,site:new Error().stack.split('\n')[2].replace(/.*\/js\//,'').replace(/\)$/,'')});return r;};
for(let k=0;k<H*60;k++)W.update(1/60);
const by={};for(const s of st){const k=s.site.replace(/:\d+$/,'')+(s.done?' ok':' ÉCHEC');const o=by[k]??={n:0,ms:0,L:0};o.n++;o.ms+=s.d;o.L+=s.L;}
for(const [k,o] of Object.entries(by).sort((a,z)=>z[1].ms-a[1].ms))console.log(k.padEnd(28),String(o.n).padStart(5),'recherches',(o.ms/H).toFixed(0).padStart(5),'ms/h  dist moy',(o.L/o.n).toFixed(0));
