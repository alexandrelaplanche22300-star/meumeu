// Qui appelle une fonction (échantillon de piles) : node test/_bench_site.mjs <fichier> <heures> <fonction>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const [file,H,fn]=[process.argv[2],+(process.argv[3]||6),process.argv[4]||'near'];
const P0=World.prototype;const f=P0[fn];const site={};let n=0;const now=()=>performance.now();
P0[fn]=function(...a){const t=now();const r=f.apply(this,a);const d=now()-t;if((n++%7)===0){const L=new Error().stack.split('\n')[2].replace(/.*\/js\//,'').replace(/\)$/,'').replace(/:\d+$/,'');const o=site[L]??={n:0,ms:0};o.n++;o.ms+=d*7;}return r;};
const W=new World(1).restore(fs.readFileSync(file,'utf8'));for(let k=0;k<H*60;k++)W.update(1/60);
for(const [k,o] of Object.entries(site).sort((a,z)=>z[1].ms-a[1].ms).slice(0,12))console.log(`  ${k.padEnd(22)} ${(o.ms/H).toFixed(1).padStart(7)} ms/h  ${o.n*7} appels`);
