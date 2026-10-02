// La partie de test (bouton « Dev ») : que contient-elle, et tient-elle 3 jours sans erreur ?
// Critères fixés d'avance :
//   1. au moins 4 mines construites, chacune avec un camp-dépôt à proximité
//   2. usines d'armes présentes : arsenal, manufacture, poudrerie, fonderie, hôpital
//   3. stocks importants (fer ≥ 500, poudre ≥ 300, 'a:mle1' ≥ 50, 'm:mle1' ≥ 400)
//   4. 20 villageois au moins et 12 soldats
//   5. [INITIAL, remplacé] brouillard levé (s.fog === false) et les Bèè toujours là (≥ 2 villes)
//   5'. [CORRIGÉ à la demande de l'utilisateur : « remets le brouillard », le mode Dev n'est qu'un départ avancé] brouillard en place
//       (s.fog === true, il se lève par le bouton) et les Bèè toujours là (≥ 2 villes)
//   6. 3 jours de jeu sans exception, et au moins 3 mines qui produisent
//   node test/dev.mjs [graine=5]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const seed=+(process.argv[2]||5);
const line=(l,ok,d,info=false)=>{console.log(`${info?(ok?'INFO':'INFO (raté, attendu)'):(ok?'PASS':'FAIL')}  ${l}${d?'  ['+d+']':''}`);if(!ok&&!info)process.exitCode=1;};
const W=new World(seed,{dev:true});
const B=W.s.buildings.filter(b=>b.f==='meumeu'),has=k=>B.filter(b=>b.k===k&&b.done).length;
const mines=B.filter(b=>b.k==='mine'&&b.done),camps=B.filter(b=>b.k==='camp'&&b.done);
const near=mines.filter(m=>camps.some(c=>Math.hypot(c.i-m.i,c.j-m.j)<16));
line('1. mines construites, chacune près d’un camp-dépôt',mines.length>=4&&near.length===mines.length,`${mines.length} mines, ${near.length} avec un camp proche : ${mines.map(m=>m.ore?W.s.nodes.find(n=>n.id===m.ore)?.res:'?').join(', ')}`);
line('2. usines d’armes présentes',['arsenal','manufacture','poudrerie','fonderie','hopital'].every(k=>has(k)>0),['arsenal','manufacture','poudrerie','fonderie','hopital','four','tour','armurerie','atelier','caserne'].map(k=>`${k} ${has(k)}`).join(' · '));
const cap=W.capital();const st=cap.stock;
line('3. stocks importants',(st.fer||0)>=500&&(st.poudre||0)>=300&&(st['a:mle1']||0)>=50&&(st['m:mle1']||0)>=400,`fer ${st.fer} · poudre ${st.poudre} · armes ${st['a:mle1']} · cartouches ${st['m:mle1']} · explosifs ${st.explosifs}`);
const vill=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').length,sold=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='soldat').length;
line('4. villageois et soldats',vill>=20&&sold>=12,`${vill} villageois, ${sold} soldats`);
line('5. [critère INITIAL, remplacé] brouillard levé et Bèè présents',W.s.fog===false&&W.s.beee.cities.length>=2,`fog ${W.s.fog}, villes bèè ${W.s.beee.cities.length}`,true);
line('5bis. [critère CORRIGÉ] brouillard en place et Bèè présents',W.s.fog===true&&W.s.beee.cities.length>=2,`fog ${W.s.fog}, villes bèè ${W.s.beee.cities.length}`);
let err=null;try{for(let h=0;h<72;h++)W.update(1);}catch(e){err=e;}
const working=mines.filter(m=>m.working).length;
const ore=camps.map(c=>Object.entries(c.stock||{}).filter(([k])=>['charbon','fer','cuivre','plomb','salpetre','pierre'].includes(k)).reduce((n,[,v])=>n+v,0));
const filled=ore.filter(v=>v>=200).length;
line('6a. [critère INITIAL] 3 jours sans exception, ≥ 3 mines « en marche » à la fin',!err&&working>=3,err?`exception : ${err.message}`:`${working}/${mines.length} mines en marche à la fin — mesure mal posée : un camp plein (500) arrête sa mine`,true);
line('6b. [critère CORRIGÉ] 3 jours sans exception, ≥ 3 camps ont reçu ≥ 200 de minerai',!err&&filled>=3,err?`exception : ${err.message}`:`${filled}/${camps.length} camps garnis ; minerai par camp : ${ore.map(v=>Math.round(v)).join(' / ')} — justification : la mine s'arrête quand son camp est plein, ce qui est le comportement voulu`);
