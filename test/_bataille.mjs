// Banc de bataille IA contre IA (carte mer) : l'allié mène TOUTE l'île meumeu, l'état-major bèè la sienne ; personne ne joue le joueur.
// Relève le plus possible : toutes les 12 h l'état des deux camps (une ligne lisible + une ligne JSON), chaque opération de débarquement (camp, effectif,
// plage, vagues, débarqués, durée), chaque tête de pont bèè (vie, effectif max, terrain gagné, camp), la tête de pont alliée (phases), les ripostes,
// les bâtiments détruits et les pertes de chaque côté, le journal des deux états-majors, le coût de calcul ; des sauvegardes régulières et aux moments clés.
//   node test/_bataille.mjs <graine> <jours> <dossier>               une bataille neuve
//   node test/_bataille.mjs <graine> <jours> <dossier> --reprendre  reprend une bataille interrompue à sa dernière sauvegarde (reprise.json, réécrite tous
//     les deux jours, ou jNN.json) : la partie, les compteurs et l'historique (bilan.json, toujours écrit avec la sauvegarde la plus récente) repartent de là
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const path=await import('path');const {World}=await import('../js/world.js');const {BUILDINGS}=await import('../js/data.js');
const seed=+(process.argv[2]||301),DAYS=+(process.argv[3]||60),DIR=process.argv[4]||`test/_saves/bataille_${seed}`;fs.mkdirSync(DIR,{recursive:true});
const RESUME=process.argv.includes('--reprendre');let bil0=null,resumeFile=null;
if(RESUME){try{bil0=JSON.parse(fs.readFileSync(path.join(DIR,'bilan.json'),'utf8'));}catch(e){}
  // (les bilans d'avant cette option ne nomment pas leur sauvegarde : la jNN la plus avancée, écrite en même temps que le bilan)
  resumeFile=bil0?.sauvegarde||fs.readdirSync(DIR).filter(f=>/^j\d+\.json$/.test(f)).sort((a,z)=>parseInt(z.slice(1))-parseInt(a.slice(1)))[0];
  if(!resumeFile){console.log('rien à reprendre dans '+DIR);process.exit(1);}}
const W=RESUME?new World(1).restore(fs.readFileSync(path.join(DIR,resumeFile),'utf8')):new World(seed,{map:'mer',allyAll:true});const B=W.s.beee,mid=W.N/2,T0=Date.now()-(bil0?.minutes||0)*60000;
if(!RESUME)for(const n of ['journal.txt','etats.jsonl'])fs.writeFileSync(path.join(DIR,n),'');
else{const f=path.join(DIR,'etats.jsonl');if(fs.existsSync(f))fs.writeFileSync(f,fs.readFileSync(f,'utf8').split('\n').filter(l=>l&&JSON.parse(l).jour<=W.s.t/24+.01).join('\n')+'\n');}   /* (les relevés faits après la sauvegarde seront refaits) */
const LOG={write:x=>fs.appendFileSync(path.join(DIR,'journal.txt'),x),end(){}},JL={write:x=>fs.appendFileSync(path.join(DIR,'etats.jsonl'),x),end(){}};
const say=s=>{LOG.write(s+'\n');console.log(s);};
const alive=u=>u.hp>0&&u.h?.state!=='mort';const valid=u=>alive(u)&&u.h?.state!=='hors';
const beeRight=B.cities.reduce((n,c)=>n+c.x,0)/B.cities.length>mid,onBeeSide=u=>(u.x>mid)===beeRight;
const BOATS=new Set(['barge','grande_barge','bateau_bee']);
// les suivis
const ops=new Map(),heads=new Map(),deadSeen=new Set(),bldSeen=new Map(),bldK=new Map(),bldAt=new Map();const tally={morts:{meumeu:0,beee:0},detruits:{meumeu:0,beee:0},noyes:0};let lastLogT=-1,saves=0,evSaves=0;
const seenLog=new Set();
const sample=()=>{const s=W.s,U=s.units;
  const A=U.filter(u=>u.f==='meumeu'&&valid(u)),Bv=U.filter(u=>u.f==='beee'&&valid(u));
  const sold=L=>L.filter(u=>u.k!=='villageois').length;
  const bl=f=>s.buildings.filter(b=>b.f===f&&b.done&&!b.ruin);
  const boats=k=>s.vehicles.filter(v=>v.k===k&&v.hp>0&&!v.dead);
  const R=s.ally?.raid||{};const allyFar=A.filter(onBeeSide).length,beeFar=Bv.filter(u=>!onBeeSide(u)).length;
  const H=(B.heads||[]).map(h=>({id:h.id,hommes:W.amphiBeeHeadMen(h).length,avance:Math.round(Math.hypot(h.x-h.bx,h.y-h.by)),camp:!!(h.camp&&W.building(h.camp)&&!W.building(h.camp).ruin)}));
  const rip=(B.bands||[]).filter(b=>b.kind==='riposte').map(b=>W.bandMembers(b).filter(valid).length);
  const bands=(B.bands||[]).filter(b=>b.kind!=='riposte').map(b=>(b.kind||'?')+':'+W.bandMembers(b).filter(valid).length);
  const st={jour:+(s.t/24).toFixed(2),meumeu:{unites:A.length,soldats:sold(A),villes:W.allyCities().length,batiments:bl('meumeu').length,barges:boats('barge').length,grandes:boats('grande_barge').length,surRiveBee:allyFar,raid:R.phase||null,garnison:(R.garrison||[]).length},
    beee:{unites:Bv.length,soldats:sold(Bv),villes:B.cities.filter(c=>!c.fallen).length,tombees:B.cities.filter(c=>c.fallen).length,batiments:bl('beee').length,ouvrages:B.fort?.count||0,bateaux:boats('bateau_bee').length,surNotreRive:beeFar,tetes:H,ripostes:rip,bandes:bands},
    ops:(s.amphi||[]).map(o=>({camp:o.f==='beee'?'bèè':o.ally?'allié':'joueur',etat:o.state,vague:o.wave,debarques:o.landed})),pertes:{...tally.morts},detruits:{...tally.detruits},noyes:tally.noyes,minutes:+((Date.now()-T0)/60000).toFixed(1)};
  JL.write(JSON.stringify(st)+'\n');
  say(`J${st.jour.toFixed(1)} | MEUMEU ${st.meumeu.unites} (${st.meumeu.soldats} sold.) ${st.meumeu.villes} villes ${st.meumeu.batiments} bât. barges ${st.meumeu.barges}+${st.meumeu.grandes}G · en face ${allyFar}${R.phase?` [${R.phase}, garnison ${st.meumeu.garnison}]`:''} | BÈÈ ${st.beee.unites} (${st.beee.soldats} sold.) ${st.beee.villes} villes (${st.beee.tombees} tombées) ${st.beee.batiments} bât. ${st.beee.ouvrages} ouvrages ${st.beee.bateaux} bateaux · en face ${beeFar} · têtes ${H.map(h=>h.hommes+'h/'+h.avance+'c'+(h.camp?'+camp':'')).join(' ')||'—'} · ripostes ${rip.join('/')||'—'}${bands.length?' · bandes '+bands.join(' '):''} | ops ${st.ops.map(o=>o.camp+':'+o.etat+':v'+o.vague+':'+o.debarques).join(' ')||'—'} | morts M ${tally.morts.meumeu} B ${tally.morts.beee} · détruits M ${tally.detruits.meumeu} B ${tally.detruits.beee} · noyés ${tally.noyes} | ${st.minutes} min`);};
/* les morts : comptés à la mort même (le monde retire les cadavres de s.units dans la foulée, un relevé périodique n'en voyait aucun) */
/* (et par cause et par lieu : rive bèè, rive meumeu, en mer) */
const causes={},deathsByDay={};const where=u=>W.isWaterAt?.(u.x,u.y)?'mer':onBeeSide(u)?'rive bèè':'rive meumeu';
{const d0=W.death.bind(W);W.death=u=>{if(u.hp>0&&!deadSeen.has(u.id)){deadSeen.add(u.id);tally.morts[u.f]=(tally.morts[u.f]||0)+1;
  const c=String(u.h?.cause||'tué').split(/[ ,(]/).slice(0,2).join(' '),k=`${u.f}|${where(u)}|${u.k}|${c}`;causes[k]=(causes[k]||0)+1;const d=Math.floor(W.s.t/24);(deathsByDay[d]??={meumeu:0,beee:0})[u.f]++;}return d0(u);};}
/* les bandes bèè : naissance (genre, effectif, cible, distance), chaque changement d'état (et pourquoi), fin (survivants) */
const bandsT=new Map();{const s0=W.bandSet.bind(W);W.bandSet=(b,state,why='')=>{const r=bandsT.get(b.id);if(r&&b.state!==state)r.etats.push([+(W.s.t/24).toFixed(2),state,why]);return s0(b,state,why);};}
const destroyed=[];
/* (la reprise : l'historique du bilan — les opérations, têtes et bandes finies y restent ; celles en cours sont rattachées aux vivantes de la sauvegarde) */
const hist={ops:[],heads:[],bands:[]};
if(RESUME&&bil0){tally.morts={...tally.morts,...bil0.pertes};tally.detruits={...tally.detruits,...bil0.detruits};tally.noyes=bil0.noyes||0;Object.assign(causes,bil0.causes||{});Object.assign(deathsByDay,bil0.mortsParJour||{});destroyed.push(...(bil0.detruitsListe||[]));
  const t=W.s.t,camp=o=>o.f==='beee'?'bèè':'allié';
  for(const h of bil0.operations||[]){const o=h.fin==null&&(W.s.amphi||[]).find(o=>camp(o)===h.camp&&(o.beach.x|0)===h.plage[0]&&(o.beach.y|0)===h.plage[1]&&!ops.has(o.id));
    if(o)ops.set(o.id,{o,t0:h.debut*24,n:h.embarques,boats:h.bateaux});else hist.ops.push(h.fin==null?{...h,fin:+(t/24).toFixed(1),interrompue:true}:h);}
  for(const h of bil0.tetesBee||[]){const H=h.fin==null&&(B.heads||[]).find(H=>(H.bx|0)===h.lieu[0]&&(H.by|0)===h.lieu[1]&&!heads.has(H.id));
    if(H)heads.set(H.id,{t0:h.debut*24,max:h.max,adv:h.avance,camp:h.camp,x:h.lieu[0],y:h.lieu[1]});else hist.heads.push(h.fin==null?{...h,fin:+(t/24).toFixed(1)}:h);}
  hist.bands=(bil0.bandes||[]).filter(b=>b.fin!=null);evSaves=fs.readdirSync(DIR).filter(f=>/^moment\d/.test(f)).length;if(evSaves)W._sb=W._sa=W._sl=1;}
const track=()=>{const s=W.s,t=s.t;
  const gone=(id,f)=>{tally.detruits[f]++;const b=W.building(id);destroyed.push({jour:+(t/24).toFixed(1),camp:f,k:b?.k||bldK.get(id)||'?',lieu:b?[b.i,b.j]:bldAt.get(id)||null});bldSeen.delete(id);};
  for(const b of s.buildings){if(BOATS.has(b.k))continue;if(b.done&&!b.ruin){bldSeen.set(b.id,b.f);bldK.set(b.id,b.k);bldAt.set(b.id,[b.i,b.j]);}else if(b.ruin&&bldSeen.has(b.id))gone(b.id,bldSeen.get(b.id));}
  for(const [id,f] of [...bldSeen]){if(!W.building(id))gone(id,f);}
  for(const b of B.bands||[])if(!bandsT.has(b.id)){const m=W.bandMembers(b),T=W.building(b.target),x=m[0]?.x??0,y=m[0]?.y??0;
    bandsT.set(b.id,{genre:b.kind||'raid',but:b.aim||null,t0:+(t/24).toFixed(2),n:m.length,cible:T?T.k+(T.f==='meumeu'?'':' ('+T.f+')'):'—',dist:T?Math.round(Math.hypot(T.i-x,T.j-y)):null,rive:onBeeSide({x,y})?'bèè':'meumeu',etats:[],max:m.length});}
  for(const [id,r] of bandsT){if(r.fin!=null)continue;const b=(B.bands||[]).find(q=>q.id===id);if(b){r.max=Math.max(r.max,W.bandMembers(b).filter(valid).length);r.last=W.bandMembers(b).filter(valid).length;}else{r.fin=+(t/24).toFixed(2);}}
  for(const v of s.vehicles)if(v.drowned&&!v._compte){v._compte=1;tally.noyes+=v.drowned;}
  for(const o of s.amphi||[])if(!ops.has(o.id)){ops.set(o.id,{o,t0:t,n:o.units.length,boats:o.boats.length});say(`  >> OPÉRATION ${o.f==='beee'?'BÈÈ':o.ally?'ALLIÉE':'joueur'} lancée J${(t/24).toFixed(1)} : ${o.units.length} soldats, ${o.boats.length} bateaux, plage (${o.beach.x|0}, ${o.beach.y|0})`);}
  for(const [id,r] of ops)if(!r.end&&!(s.amphi||[]).includes(r.o)){r.end=t;say(`  << opération ${r.o.f==='beee'?'bèè':'alliée'} terminée J${(t/24).toFixed(1)} : ${r.o.landed} débarqués en ${r.o.wave} vague(s), ${((t-r.t0)/24).toFixed(1)} j`);}
  for(const h of B.heads||[]){const n=W.amphiBeeHeadMen(h).length;let H=heads.get(h.id);if(!H){H={t0:t,max:0,adv:0,camp:false,x:h.bx|0,y:h.by|0};heads.set(h.id,H);say(`  ++ tête de pont bèè J${(t/24).toFixed(1)} à (${H.x}, ${H.y})`);}
    H.max=Math.max(H.max,n);H.adv=Math.max(H.adv,Math.hypot(h.x-h.bx,h.y-h.by));H.camp||=!!(h.camp&&W.building(h.camp)?.done);H.last=t;}
  for(const [id,H] of heads)if(!H.end&&!(B.heads||[]).some(h=>h.id===id)){H.end=t;say(`  -- tête de pont bèè (${H.x}, ${H.y}) perdue J${(t/24).toFixed(1)} après ${((t-H.t0)/24).toFixed(1)} j : ${H.max} hommes au plus, ${Math.round(H.adv)} cases gagnées${H.camp?', camp bâti':''}`);}
  // le journal des états-majors (les entrées nouvelles)
  for(const e of [...s.log].reverse()){const k=e.t+'|'+e.text;if(seenLog.has(k))continue;seenLog.add(k);if(/débarqu|tête de pont|flotte|vague|riposte|attaque|tombe|tombée|appareille|embarque|assaut|lance|marchent|ligne|décroch|fonde|barge|renfort/i.test(e.text))say(`     · J${(e.t/24).toFixed(1)} [${e.where}] ${e.text}`);}
  if(seenLog.size>4000)seenLog.clear();};
const save=tag=>{try{fs.writeFileSync(path.join(DIR,`${tag}.json`),W.serialize());say(`  [sauvegarde ${tag}]`);}catch(e){say('  [sauvegarde impossible '+e.message+']');}};
say(RESUME?`### reprise de la bataille · graine ${seed} · à J${(W.s.t/24).toFixed(1)}, depuis ${resumeFile} · jusqu'à J${DAYS}`:`### bataille IA contre IA · graine ${seed} · ${DAYS} jours · carte mer (${W.N} cases) · l'allié mène toute l'île`);
for(let h=Math.round(W.s.t)+1;h<=DAYS*24;h++){for(let k=0;k<60;k++)W.update(1/60);
  if(h%2===0)track();
  if(h%12===0)sample();
  // une sauvegarde tous les dix jours (gardée), et une de reprise tous les deux jours (réécrite) ; le bilan est écrit avec, et nomme sa sauvegarde
  if(h%(24*10)===0){save('j'+h/24);writeBilan(false,'j'+h/24+'.json');}else if(h%48===0&&h<DAYS*24){save('reprise');writeBilan(false,'reprise.json');}
  // les moments clés (au plus quatre) : une tête de pont bèè forte, l'allié qui passe à l'attaque, un débarquement en cours de vague
  if(evSaves<4&&h%6===0){const big=(B.heads||[]).some(H=>W.amphiBeeHeadMen(H).length>=25),adv=W.s.ally?.raid?.phase==='avancer',land=(W.s.amphi||[]).some(o=>o.state==='land');
    if((big&&!W._sb)||(adv&&!W._sa)||(land&&evSaves<2&&!W._sl)){if(big)W._sb=1;if(adv)W._sa=1;if(land)W._sl=1;evSaves++;save(`moment${evSaves}_j${(W.s.t/24).toFixed(1)}`);}}}
// le bilan (aussi tous les dix jours, « en cours »)
function writeBilan(fini,sauvegarde=null){const opL=hist.ops.concat([...ops.values()].map(r=>({camp:r.o.f==='beee'?'bèè':'allié',debut:+(r.t0/24).toFixed(1),fin:r.end?+(r.end/24).toFixed(1):null,embarques:r.n,bateaux:r.boats,debarques:r.o.landed,vagues:r.o.wave,plage:[r.o.beach.x|0,r.o.beach.y|0]})));
const hL=hist.heads.concat([...heads.values()].map(H=>({lieu:[H.x,H.y],debut:+(H.t0/24).toFixed(1),fin:H.end?+(H.end/24).toFixed(1):null,max:H.max,avance:Math.round(H.adv),camp:H.camp})));
const bL=hist.bands.concat([...bandsT.values()].map(r=>({...r,fin:r.fin??null,survivants:r.last??null})));
const bilan={graine:seed,jours:DAYS,jour:+(W.s.t/24).toFixed(2),sauvegarde,minutes:+((Date.now()-T0)/60000).toFixed(1),operations:opL,tetesBee:hL,bandes:bL,causes,mortsParJour:deathsByDay,detruitsListe:destroyed,pertes:tally.morts,detruits:tally.detruits,noyes:tally.noyes,final:{meumeuVilles:W.allyCities().length,beeVilles:B.cities.filter(c=>!c.fallen).length,beeTombees:B.cities.filter(c=>c.fallen).length}};
bilan.termine=fini;fs.writeFileSync(path.join(DIR,'bilan.json'),JSON.stringify(bilan,null,1));return {opL,hL,bilan};}
{const {opL,hL,bilan}=writeBilan(true);
say(`### BILAN graine ${seed} : opérations bèè ${opL.filter(o=>o.camp==='bèè').length} (${opL.filter(o=>o.camp==='bèè').reduce((n,o)=>n+o.debarques,0)} débarqués), alliées ${opL.filter(o=>o.camp==='allié').length} (${opL.filter(o=>o.camp==='allié').reduce((n,o)=>n+o.debarques,0)} débarqués) · têtes de pont bèè ${hL.length} · morts M ${tally.morts.meumeu} B ${tally.morts.beee} · détruits M ${tally.detruits.meumeu} B ${tally.detruits.beee} · ${bilan.minutes} min`);
}
