// Une partie pour regarder la vue recherche (V12.6) : départ établi (graine 5), un centre de recherche et un laboratoire bâtis près de la capitale, six
// villageois envoyés à l'école par le vrai chemin (trainSavant : l'ouvrier de l'usine chimique d'abord), 40 h de jeu ; puis deux projets lancés sur les
// propositions qu'ont les ouvriers, un remue-méninges convoqué, et encore quelques heures. Brouillard actif. Écrit test/_saves/recherche.json.
//   ELECTRON_RUN_AS_NODE=1 electron.exe test/_outils_captures/recherche_save.mjs [heures en plus]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../../js/world.js');const {INNOV}=await import('../../js/data.js');
const W=new World(5,{assisted:true});const [ci,cj]=W.G.capital;const cap=W.capital();
Object.assign(cap.stock,{vivres:1500,pieces:300,bois:700,pierre:700,fer:120,salpetre:80,charbon:120,cuivre:40,sante:30});
const spot=(k,r0=6)=>{for(let r=r0;r<30;r++)for(let a=0;a<40;a++){const i=Math.round(ci+Math.cos(a/40*6.283)*r),j=Math.round(cj+Math.sin(a/40*6.283)*r);if(W.canPlace('meumeu',k,i,j).ok)return [i,j];}};
// les deux bâtiments par le vrai chemin : le chantier posé (il dégage le terrain), six villageois l'y bâtissent avec les matériaux des dépôts
const site=k=>{const [i,j]=spot(k);const r=W.place('meumeu',k,i,j);if(!r.ok)throw new Error(k+' : '+r.why);return W.s.buildings.find(b=>b.k===k&&b.i===i&&b.j===j);};
const C=site('centre_recherche'),L=site('labo');const idle=()=>W.s.units.filter(u=>u.f==='meumeu'&&!u.ally&&u.k==='villageois'&&!u.task);
W.order(idle().slice(0,6).map(u=>u.id),{type:'building',id:C.id});W.order(idle().slice(0,4).map(u=>u.id),{type:'building',id:L.id});
for(let t=0;t<80&&!(C.done&&L.done);t+=.1)W.update(.1);console.log('bâtis :',C.done,L.done,'jour',W.day,W.hour().toFixed(1));
const U=W.s.buildings.find(b=>b.k==='poudrerie');const v=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois'&&!u.ally);v[2].task={kind:'work',b:U.id};
for(const d of ['chimie','agro','geo','meca']){const r=W.trainSavant(C,d);console.log(r.ok?r.text:r.why);}
for(let t=0;t<40;t+=.1)W.update(.1);
for(const d of ['medecine','balist']){const r=W.trainSavant(C,d);console.log(r.ok?r.text:r.why);}
// des propositions : celles des ouvriers, plus un remue-méninges
const S=W.savants();console.log('savants :',S.map(u=>`${u.name} (${u.sci.disc}, ${u.sci.traits.join('+')})`).join(' · '));
let m=W.meet(C,'remue',S.slice(0,3).map(u=>u.id));console.log('réunion :',m.ok?m.text:m.why);for(let t=0;t<3;t+=.1)W.update(.1);
console.log('propositions :',W.s.innov.ideas.map(x=>x.id).join(', '));
for(const x of [...W.s.innov.ideas]){const fr=W.savants().filter(u=>!u.sci.pid);if(fr.length<1)break;const pick=fr.filter(u=>({bois:'agro',vivres:'agro',pierre:'geo',mine:'geo',chimie:'chimie'})[INNOVdom(x.id)]===u.sci.disc);const team=(pick.length?pick:fr).slice(0,2).map(u=>u.id);const r=W.startProject(x.id,team);console.log('projet',x.id,r.ok?'lancé':r.why);if(W.s.research.projects.filter(P=>P.st==='actif').length>=2)break;}
function INNOVdom(id){return INNOV.find(y=>y.id===id)?.dom;}
const extra=+process.argv[2]||4;for(let t=0;t<extra;t+=.1)W.update(.1);
m=W.meet(C,'remue',W.savants().filter(u=>!u.sci.pid&&!u.sci.meet).slice(0,4).map(u=>u.id));console.log('2e réunion :',m.ok?m.text:m.why);for(let t=0;t<.6;t+=.1)W.update(.1);
W.s.fog=true;fs.writeFileSync(new URL('../_saves/recherche.json',import.meta.url),W.serialize());
console.log('écrit — jour',W.day,'heure',W.hour().toFixed(1),'· centre',C.i,C.j,'· labo',L.i,L.j,'· dans le centre',(C.staff||[]).length,'· labo',(L.staff||[]).length,'· projets',W.s.research.projects.map(P=>P.name+' '+P.phases[P.ph].k).join(' | '));
