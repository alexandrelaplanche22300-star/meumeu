// Dépouillement des bancs de bataille (_bataille.mjs) : un rapport par graine et une synthèse — node test/_analyse_bataille.mjs <dossier1> [dossier2 …]
const fs=await import('fs');const path=await import('path');
const f1=v=>v==null?'—':(Math.round(v*10)/10).toLocaleString('fr-FR');
const rows=[];
for(const dir of process.argv.slice(2)){let bil=null;try{bil=JSON.parse(fs.readFileSync(path.join(dir,'bilan.json'),'utf8'));}catch(e){}
  const st=fs.existsSync(path.join(dir,'etats.jsonl'))?fs.readFileSync(path.join(dir,'etats.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
  if(!st.length){console.log(`\n## ${dir} : pas encore de données`);continue;}
  const last=st[st.length-1],seed=bil?.graine??path.basename(dir);
  console.log(`\n## Graine ${seed} — ${f1(last.jour)} jours ${bil&&bil.termine!==false?'(terminée)':'(en cours)'}`);
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
  // les bandes bèè : par genre, combien, quelle taille, quelle issue
  const bands=bil?.bandes||[];if(bands.length){console.log(`Bandes bèè (${bands.length}) :`);const G={};for(const b of bands)(G[b.genre+' · rive '+b.rive]??=[]).push(b);
    for(const [g,L] of Object.entries(G)){const fins={};for(const b of L){const e=b.fin==null?'en cours ('+(b.etats.at(-1)?.[1]||'approche')+')':(b.etats.at(-1)?.[1]||'?')+(b.etats.at(-1)?.[2]?' — '+b.etats.at(-1)[2]:'');fins[e]=(fins[e]||0)+1;}
      const dur=L.filter(b=>b.fin!=null).map(b=>b.fin-b.t0);console.log(`  - ${g} : ${L.length}, ${f1(L.reduce((n,b)=>n+b.n,0)/L.length)} hommes en moyenne (max ${Math.max(...L.map(b=>b.max))}), durée moy. ${dur.length?f1(dur.reduce((a,v)=>a+v,0)/dur.length)+' j':'—'}, cibles ${[...new Set(L.map(b=>b.cible))].slice(0,6).join(', ')}, distance moy. ${f1(L.reduce((n,b)=>n+(b.dist||0),0)/L.length)} cases`);
      for(const [e,n] of Object.entries(fins).sort((a,z)=>z[1]-a[1]).slice(0,5))console.log(`      ${n} × ${e}`);}}
  // les morts : par camp, lieu, cause
  const C=bil?.causes||{};if(Object.keys(C).length){console.log('Morts par camp, lieu et cause :');const agg={};for(const [k,n] of Object.entries(C)){const [f,w,uk,c]=k.split('|');const a=`${f==='beee'?'Bèè':'Meumeu'} · ${w}`;(agg[a]??={n:0,c:{}}).n+=n;agg[a].c[uk+' '+c]=(agg[a].c[uk+' '+c]||0)+n;}
    for(const [a,v] of Object.entries(agg).sort((p,q)=>q[1].n-p[1].n))console.log(`  - ${a} : ${v.n} (${Object.entries(v.c).sort((p,q)=>q[1]-p[1]).slice(0,4).map(([c,n])=>n+' '+c).join(', ')})`);}
  const D=bil?.detruitsListe||[];if(D.length){console.log(`Bâtiments détruits (${D.length}) : `+D.slice(0,25).map(d=>`J${f1(d.jour)} ${d.k} ${d.camp==='beee'?'bèè':'meumeu'}`).join(' · '));}
  // les indicateurs
  const firstB=ob[0]?.debut,firstA=oa[0]?.debut,landB=ob.reduce((n,o)=>n+o.debarques,0),landA=oa.reduce((n,o)=>n+o.debarques,0);
  const peakBeeFar=Math.max(...st.map(s=>s.beee.surNotreRive)),peakAllyFar=Math.max(...st.map(s=>s.meumeu.surRiveBee));
  const pM=last.pertes.meumeu||0,pB=last.pertes.beee||0;
  const r={seed,jours:last.jour,opsB:ob.length,opsA:oa.length,firstB,firstA,landB,landA,heads:hs.length,headMax:Math.max(0,...hs.map(h=>h.max)),headLife:hs.length?hs.reduce((n,h)=>n+((h.fin??last.jour)-h.debut),0)/hs.length:null,advMax:Math.max(0,...hs.map(h=>h.avance)),
    peakBeeFar,peakAllyFar,pM,pB,dM:last.detruits.meumeu||0,dB:last.detruits.beee||0,noyes:last.noyes,villesB:last.beee.villes,tombees:last.beee.tombees,villesM:last.meumeu.villes,minutes:last.minutes};rows.push(r);
  console.log(`\nIndicateurs : premier assaut bèè J${f1(firstB)}, allié J${f1(firstA)} · débarqués bèè ${landB}, alliés ${landA} · au plus ${peakBeeFar} Bèè sur notre rive, ${peakAllyFar} alliés en face · pertes Meumeu ${pM}, Bèè ${pB} (rapport ${pM?f1(pB/pM):'—'}) · bâtiments perdus Meumeu ${r.dM}, Bèè ${r.dB} · noyés ${r.noyes} · villes bèè tombées ${r.tombees} · ${f1(r.minutes)} min de calcul`);}
if(rows.length>1){console.log('\n## Synthèse');console.log('graine | jours | ops B/A | débarqués B/A | têtes (max, vie moy.) | max en face B/A | pertes M/B | bât. perdus M/B | villes B (tombées)');
  for(const r of rows)console.log(`${r.seed} | ${f1(r.jours)} | ${r.opsB}/${r.opsA} | ${r.landB}/${r.landA} | ${r.heads} (${r.headMax}, ${f1(r.headLife)} j) | ${r.peakBeeFar}/${r.peakAllyFar} | ${r.pM}/${r.pB} | ${r.dM}/${r.dB} | ${r.villesB} (${r.tombees})`);}
