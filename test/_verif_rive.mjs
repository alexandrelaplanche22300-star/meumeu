// vérification (V12.5) : depuis une sauvegarde, les Bèè sans rôle sur la rive meumeu rejoignent une tête de pont ; les colonnes ne visent plus l'autre rive
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s,B=s.beee,mid=W.N/2,L=W.landComp();const old=new Set((B.bands||[]).map(b=>b.id));
const look=()=>{const far=s.units.filter(u=>u.f==='beee'&&u.hp>0&&u.x<mid&&u.h?.state!=='hors');const lost=far.filter(u=>!u.head&&!u.band&&u.amphi==null);
  const fresh=(B.bands||[]).filter(b=>!old.has(b.id)&&!b.kind).map(b=>{const T=W.building(b.target),m=W.bandMembers(b).filter(u=>u.hp>0);const x=m[0]?.x??0,y=m[0]?.y??0;return (T&&L[(T.j|0)*W.N+(T.i|0)]===L[(y|0)*W.N+(x|0)]?'même terre ':'AUTRE RIVE ')+m.length;});
  console.log(`J${(s.t/24).toFixed(2)} · ${far.length} Bèè valides sur notre rive, ${lost.length} sans rôle · têtes ${(B.heads||[]).map(H=>W.amphiBeeHeadMen(H).length).join('/')} · nouvelles colonnes ${fresh.join(', ')||'—'}`);};
look();for(let h=1;h<=(+process.argv[3]||24);h++){for(let k=0;k<60;k++)W.update(1/60);if(h%4===0)look();}
