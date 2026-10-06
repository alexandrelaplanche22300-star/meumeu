// vérification (V12.5) : le rassemblement au port, les assauts et leurs vagues — node test/_verif_port.mjs <sauvegarde> <jours>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s,B=s.beee;let last='';
const look=()=>{const S=B.stage,st=W.amphiBeeStaged(),near=S?st.filter(u=>Math.hypot(u.x-S.x,u.y-S.y)<40).length:0;const ops=(s.amphi||[]).filter(o=>o.f==='beee').map(o=>{const bs=W.amphiBoatsOf(o);return `${o.state} v${o.wave} débarqués ${o.landed} à bord ${bs.reduce((n,b)=>n+(b.crew||[]).filter(u=>u.vrole==='passager').length,0)}`;}).join(' ; ');
  console.log(`J${(s.t/24).toFixed(2)} · au port ${near}/${st.length} · bateaux ${W.amphiBeeBoats().length} · ${ops||'pas d’assaut'}${B.amphiWhy?' · ('+B.amphiWhy+')':''} · têtes ${(B.heads||[]).map(H=>W.amphiBeeHeadMen(H).length).join('/')||'—'}`);};
for(let h=1;h<=24*(+process.argv[3]||10);h++){for(let k=0;k<60;k++)W.update(1/60);if(h%6===0)look();}
