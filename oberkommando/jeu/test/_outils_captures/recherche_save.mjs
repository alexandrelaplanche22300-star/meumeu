// Une partie pour regarder la recherche (V12.7) : départ établi (graine 5 : bureau d'études et laboratoire de chimie), un centre de recherche bâti par
// le vrai chemin, six villageois envoyés à l'école (deux de chaque métier), deux jours de jeu ; puis un obusier de 50 mm lancé au bureau d'études
// (world.propose, le chemin du concepteur) et on laisse vivre jusqu'à ce que la réunion de lancement attende le commandement. Brouillard actif.
// Écrit test/_saves/recherche.json.
//   ELECTRON_RUN_AS_NODE=1 electron.exe test/_outils_captures/recherche_save.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../../js/world.js');const {kitToP}=await import('../../js/ballistics.js');const {KIT_PRESETS}=await import('../../js/kitdata.js');
const W=new World(5,{assisted:true});const [ci,cj]=W.G.capital;const cap=W.capital();
Object.assign(cap.stock,{vivres:1800,pieces:400,bois:800,pierre:800,fer:200,salpetre:120,charbon:160,cuivre:80,sante:30,plomb:60});
const spot=(k,r0=6)=>{for(let r=r0;r<30;r++)for(let a=0;a<40;a++){const i=Math.round(ci+Math.cos(a/40*6.283)*r),j=Math.round(cj+Math.sin(a/40*6.283)*r);if(W.canPlace('meumeu',k,i,j).ok)return [i,j];}};
const site=k=>{const [i,j]=spot(k);const r=W.place('meumeu',k,i,j);if(!r.ok)throw new Error(k+' : '+r.why);return W.s.buildings.find(b=>b.k===k&&b.i===i&&b.j===j);};
const C=site('centre_recherche');const idle=()=>W.s.units.filter(u=>u.f==='meumeu'&&!u.ally&&u.k==='villageois'&&!u.task);
W.order(idle().slice(0,8).map(u=>u.id),{type:'building',id:C.id});
for(let t=0;t<90&&!C.done;t+=.1)W.update(.1);console.log('centre bâti :',C.done,'jour',W.day,W.hour().toFixed(1));
const A=W.s.buildings.find(b=>b.k==='armurerie'&&b.f==='meumeu'),L=W.s.buildings.find(b=>b.k==='labo'&&b.f==='meumeu');console.log('bureau',!!A,'labo',!!L);
for(const r of ['ingenieur','chimiste','physicien','chimiste']){const x=W.trainSavant(C,r);console.log(x.ok?x.text:x.why);}
for(let t=0;t<30;t+=.1)W.update(.1);
for(const r of ['ingenieur','physicien']){const x=W.trainSavant(C,r);console.log(x.ok?x.text:x.why);}
for(let t=0;t<30;t+=.1)W.update(.1);
console.log('savants :',W.savants().map(u=>`${u.name} (${u.sci.role})`).join(' · '));
const p=kitToP({...KIT_PRESETS.find(x=>x.id==='howitzer').design,caliberMm:50,massG:1100,barrelLengthCm:70});
const r=W.propose(A,'Obusier 50',p);console.log(r.ok?r.text||'programme lancé':r.why);const P=W.s.research.programs.find(x=>x.kind==='arme');
for(let t=0;t<12&&P.meet?.phase!=='decision';t+=.05)W.update(.05);
W.s.fog=true;fs.writeFileSync(new URL('../_saves/recherche.json',import.meta.url),W.serialize());
console.log('écrit — jour',W.day,'heure',W.hour().toFixed(1),'· réunion',P.meet?.type,P.meet?.phase,'·',P.meet?.props.length,'propositions ·',P.meet?.script.length,'répliques');
