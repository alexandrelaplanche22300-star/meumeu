// Dépouillement des bancs de bataille (_bataille.mjs) : un rapport par graine et une synthèse — node test/_analyse_bataille.mjs <dossier1> [dossier2 …]
const fs=await import('fs');const path=await import('path');
const f1=v=>v==null?'—':(Math.round(v*10)/10).toLocaleString('fr-FR');
const rows=[];
for(const dir of process.argv.slice(2)){let bil=null;try{bil=JSON.parse(fs.readFileSync(path.join(dir,'bilan.json'),'utf8'));}catch(e){}
  const st=fs.existsSync(path.join(dir,'etats.jsonl'))?fs.readFileSync(path.join(dir,'etats.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
  if(!st.length){console.log(`\n## ${dir} : pas encore de données`);continue;}
  const last=st[st.length-1],seed=bil?.graine??path.basename(dir);
  console.log(`\n## Graine ${seed} — ${f1(last.jour)} jours ${bil?'(terminée)':'(en cours)'}`);
  // les courbes : tous les 5 jours
  console.log('jour | Meumeu (soldats) villes bât. barges | Bèè (soldats) villes bât. ouvrages bateaux | Bèè sur notre rive | alliés en face | morts M/B | détruits M/B');
  for(const s of st.filter((s,i)=>Math.abs(s.jour/5-Math.round(s.jour/5))<.06||i===st.length-1))
    console.log(`${f1(s.jour).padStart(4)} | ${s.meumeu.unites} (${s.meumeu.soldats}) ${s.meumeu.villes} ${s.meumeu.batiments} ${s.meumeu.barges}+${s.meumeu.grandes}G | ${s.beee.unites} (${s.beee.soldats}) ${s.beee.villes}${s.beee.tombees?'/'+s.beee.tombees+'t':''} ${s.beee.batiments} ${s.beee.ouvrages} ${s.beee.bateaux} | ${s.beee.surNotreRive} | ${s.meumeu.surRiveBee}${s.meumeu.raid?' ['+s.meumeu.raid+']':''} | ${s.pertes.meumeu||0}/${s.pertes.beee||0} | ${s.detruits.meumeu||0}/${s.detruits.beee||0}`);
  // les opérations
  const ops=bil?.operations||[];const ob=ops.filter(o=>o.camp==='bèè'),oa=ops.filter(o=>o.camp==='allié');
  const desc=o=>`J${f1(o.debut)}→${o.fin?'J'+f1(o.fin):'…'} : ${o.embarques} embarqués, ${o.debarques} débarqués, ${o.vagues} vague(s), plage (${o.plage})`;
  console.log(`\nOpérations bèè (${ob.length}) :`);for(const o of ob)console.log('  - '+desc(o));
  console.log(`Opérations alliées (${oa.length}) :`);for(const o of oa)console.log('  - '+desc(o));
  const hs=bil?.tetesBee||[];console.log(`Têtes de pont bèè (${hs.length}) :`);for(const h of hs)console.log(`  - (${h.lieu}) J${f1(h.debut)}→${h.fin?'J'+f1(h.fin):'tient encore'} · ${h.max} hommes au plus · ${h.avance} cases gagnées${h.camp?' · camp bâti':''}`);
  // les indicateurs
  const firstB=ob[0]?.debut,firstA=oa[0]?.debut,landB=ob.reduce((n,o)=>n+o.debarques,0),landA=oa.reduce((n,o)=>n+o.debarques,0);
  const peakBeeFar=Math.max(...st.map(s=>s.beee.surNotreRive)),peakAllyFar=Math.max(...st.map(s=>s.meumeu.surRiveBee));
  const pM=last.pertes.meumeu||0,pB=last.pertes.beee||0;
  const r={seed,jours:last.jour,opsB:ob.length,opsA:oa.length,firstB,firstA,landB,landA,heads:hs.length,headMax:Math.max(0,...hs.map(h=>h.max)),headLife:hs.length?hs.reduce((n,h)=>n+((h.fin??last.jour)-h.debut),0)/hs.length:null,advMax:Math.max(0,...hs.map(h=>h.avance)),
    peakBeeFar,peakAllyFar,pM,pB,dM:last.detruits.meumeu||0,dB:last.detruits.beee||0,noyes:last.noyes,villesB:last.beee.villes,tombees:last.beee.tombees,villesM:last.meumeu.villes,minutes:last.minutes};rows.push(r);
  console.log(`\nIndicateurs : premier assaut bèè J${f1(firstB)}, allié J${f1(firstA)} · débarqués bèè ${landB}, alliés ${landA} · au plus ${peakBeeFar} Bèè sur notre rive, ${peakAllyFar} alliés en face · pertes Meumeu ${pM}, Bèè ${pB} (rapport ${pM?f1(pB/pM):'—'}) · bâtiments perdus Meumeu ${r.dM}, Bèè ${r.dB} · noyés ${r.noyes} · villes bèè tombées ${r.tombees} · ${f1(r.minutes)} min de calcul`);}
if(rows.length>1){console.log('\n## Synthèse');console.log('graine | jours | ops B/A | débarqués B/A | têtes (max, vie moy.) | max en face B/A | pertes M/B | bât. perdus M/B | villes B (tombées)');
  for(const r of rows)console.log(`${r.seed} | ${f1(r.jours)} | ${r.opsB}/${r.opsA} | ${r.landB}/${r.landA} | ${r.heads} (${r.headMax}, ${f1(r.headLife)} j) | ${r.peakBeeFar}/${r.peakAllyFar} | ${r.pM}/${r.pB} | ${r.dM}/${r.dB} | ${r.villesB} (${r.tombees})`);}
