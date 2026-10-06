// Compare des séries de batailles au même jour : node test/_compare_batailles.mjs <jour> <étiquette>=<préfixe de dossier> …
//   ex. node test/_compare_batailles.mjs 40 avant=test/_saves/avant_bataille_ s1=test/_saves/bataille_ s2=test/_saves/bataille2_
// Pour chaque série et chaque graine (301, 305, 311) : l'état relevé le plus proche du jour demandé (etats.jsonl) et ce que dit le bilan des opérations,
// têtes de pont et bâtiments détruits jusqu'à ce jour ; puis la moyenne des trois graines, série par série.
const fs=await import('fs');const path=await import('path');
const DAY=+process.argv[2]||40,SER=process.argv.slice(3).map(a=>a.split('='));const SEEDS=[301,305,311];
const f1=v=>v==null||Number.isNaN(v)?'—':(Math.round(v*10)/10).toLocaleString('fr-FR');
const rows=[];
for(const [lab,pre] of SER)for(const seed of SEEDS){const dir=pre+seed;if(!fs.existsSync(dir))continue;
  const st=fs.existsSync(path.join(dir,'etats.jsonl'))?fs.readFileSync(path.join(dir,'etats.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
  const s=st.filter(x=>x.jour<=DAY+.3).at(-1);if(!s||s.jour<DAY-1)continue;
  let bil=null;try{bil=JSON.parse(fs.readFileSync(path.join(dir,'bilan.json'),'utf8'));}catch(e){}
  const ops=(bil?.operations||[]).filter(o=>o.debut<=DAY),ob=ops.filter(o=>o.camp==='bèè'),oa=ops.filter(o=>o.camp==='allié');
  const det=(bil?.detruitsListe||[]).filter(d=>d.jour<=DAY);const heads=(bil?.tetesBee||[]).filter(h=>h.debut<=DAY);
  const morts=bil?.mortsParJour?Object.entries(bil.mortsParJour).filter(([d])=>+d<DAY).reduce((a,[,v])=>({m:a.m+(v.meumeu||0),b:a.b+(v.beee||0)}),{m:0,b:0}):null;
  rows.push({lab,seed,jour:s.jour,mU:s.meumeu.unites,mS:s.meumeu.soldats,mV:s.meumeu.villes,mB:s.meumeu.batiments,barges:s.meumeu.barges+(s.meumeu.grandes||0),
    bU:s.beee.unites,bS:s.beee.soldats,bV:s.beee.villes,bT:s.beee.tombees,bat:s.beee.bateaux,beeFar:s.beee.surNotreRive,allyFar:s.meumeu.surRiveBee,
    opsB:ob.length,landB:ob.reduce((n,o)=>n+(o.debarques||0),0),opsA:oa.length,landA:oa.reduce((n,o)=>n+(o.debarques||0),0),heads:heads.length,
    detM:det.filter(d=>d.camp==='meumeu').length||(s.detruits?.meumeu??0),detB:det.filter(d=>d.camp==='beee').length||(s.detruits?.beee??0),mortsM:morts?.m??null,mortsB:morts?.b??null});}
const H='série | graine | jour | Meumeu unités (soldats) villes bât. barges | Bèè unités (soldats) villes tombées bateaux | Bèè sur notre rive | alliés en face | ops bèè (débarqués) | ops alliées (débarqués) | têtes bèè | bât. détruits M/B | morts M/B';
console.log(`## Les séries au jour ${DAY}\n\n${H}`);
for(const r of rows)console.log(`${r.lab} | ${r.seed} | ${f1(r.jour)} | ${r.mU} (${r.mS}) ${r.mV} ${r.mB} ${r.barges} | ${r.bU} (${r.bS}) ${r.bV} ${r.bT} ${r.bat} | ${r.beeFar} | ${r.allyFar} | ${r.opsB} (${r.landB}) | ${r.opsA} (${r.landA}) | ${r.heads} | ${r.detM}/${r.detB} | ${r.mortsM??'—'}/${r.mortsB??'—'}`);
console.log('\n## Moyennes des trois graines\n');console.log(H.replace('graine | jour | ',''));
for(const [lab] of SER){const R=rows.filter(r=>r.lab===lab);if(!R.length)continue;const m=k=>R.reduce((a,r)=>a+(r[k]??0),0)/R.length;const mm=k=>R.some(r=>r[k]==null)?null:m(k);
  console.log(`${lab} (${R.length}) | ${f1(m('mU'))} (${f1(m('mS'))}) ${f1(m('mV'))} ${f1(m('mB'))} ${f1(m('barges'))} | ${f1(m('bU'))} (${f1(m('bS'))}) ${f1(m('bV'))} ${f1(m('bT'))} ${f1(m('bat'))} | ${f1(m('beeFar'))} | ${f1(m('allyFar'))} | ${f1(m('opsB'))} (${f1(m('landB'))}) | ${f1(m('opsA'))} (${f1(m('landA'))}) | ${f1(m('heads'))} | ${f1(m('detM'))}/${f1(m('detB'))} | ${f1(mm('mortsM'))}/${f1(mm('mortsB'))}`);}
