// vérification (V12.5) : les villageois alliés s'abritent quand des Bèè approchent — morts meumeu par type sur N jours depuis une sauvegarde
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s;const dead={};let shelterN=0;
{const d0=W.death.bind(W);W.death=u=>{if(u.hp>0){const k=u.f+' '+u.k;dead[k]=(dead[k]||0)+1;}return d0(u);};}
{const s0=W.shelter.bind(W);W.shelter=u=>{const r=s0(u);if(r&&u.f==='meumeu')shelterN++;return r;};}
for(let d=1;d<=(+process.argv[3]||6);d++){for(let h=0;h<24;h++)for(let k=0;k<60;k++)W.update(1/60);console.log(`J${W.day} · morts ${JSON.stringify(dead)} · mises à l'abri ${shelterN} · villageois alliés ${s.units.filter(u=>u.ally&&u.k==='villageois').length}`);}
