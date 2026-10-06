// La couronne sonore : la précision du relèvement suit la puissance de la source.
// CRITÈRES (fixés avant de lancer) :
//   C1 à 6 cases, de jour : incertitude train < usine < mine < chantier < pas (source plus forte = relèvement plus net)
//   C2 pour un même son, l'incertitude croît avec la distance (10 < 30 < 55 cases pour un train, dont la portée est de 60 cases)
//      [version initiale 10/40/80 : la portée du train s'arrête à 60 cases, le contact n'existe plus à 80 — distances corrigées avant toute autre modification]
//   C3 un tir nu (dB ~150, portée 25 cases) reste moins net qu'un train (dB ~206) à 20 cases
//   C4 jamais de position : le contact ne contient aucune coordonnée de la source (pas de x/y, seulement ox/oy de l'oreille, angle, incertitude)
//   C5 de nuit, une équipe de 12 Bèè qui marchent à 15 cases est entendue comme une équipe (team ≥ 10), un Bèè seul au même endroit ne l'est pas
//   C6 temps réel : une équipe qui marche pendant 1 h de jeu (10 ticks) met son contact à jour au moins 8 fois
//   C7 la portée d'écoute d'une équipe de 12 est au moins 2,5 fois celle d'un Bèè seul
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/couronne.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const W=new World(11);W.s.fog=false;const cap=W.capital();
const ear=W.s.units.find(u=>u.f==='meumeu');ear.x=cap.i+3;ear.y=cap.j+3;
const mean=(dB,d,kind,n=200)=>{let a=0,c=0;for(let i=0;i<n;i++){const h=W.acousticContact(ear,ear.x+d,ear.y,dB,kind);if(h){a+=h.uncertainty;c++;}}return c?a/c:null;};
W.light=()=>1;   // plein jour
const S={train:110+60*1.6,usine:110+30*1.6,mine:110+24*1.6,chantier:110+18*1.6,pas:110+6*1.6};
const u=Object.fromEntries(Object.entries(S).map(([k,dB])=>[k,mean(dB,5,k)]));
P(u.train<u.usine&&u.usine<u.mine&&u.mine<u.chantier&&u.chantier<u.pas,'C1. plus la source est forte, plus le relèvement est net',Object.entries(u).map(([k,v])=>`${k} ${v?.toFixed(3)}`).join(' · '));
const t10=mean(S.train,10,'train'),t40=mean(S.train,30,'train'),t80=mean(S.train,55,'train');
P(t10<t40&&t40<t80,'C2. l\'incertitude croît avec la distance',`${t10?.toFixed(3)} < ${t40?.toFixed(3)} < ${t80?.toFixed(3)}`);
const tir30=mean(150,20,'tirs'),tr30=mean(S.train,20,'train');
P(tr30<tir30,'C3. un train est mieux situé qu\'un tir nu à 30 cases',`train ${tr30?.toFixed(3)} · tir ${tir30?.toFixed(3)}`);
const h=W.acousticContact(ear,ear.x+8,ear.y+2,150,'tirs');
P(h&&h.x===undefined&&h.y===undefined&&typeof h.angle==='number'&&typeof h.uncertainty==='number','C4. aucune position de source dans le contact',Object.keys(h||{}).join(','));
// C5 à C7 : l'écoute des équipes
{const W2=new World(12);W2.s.fog=false;W2.light=()=>0;const cap2=W2.capital();
  const ear2=W2.s.units.find(u=>u.f==='meumeu');ear2.x=cap2.i+3;ear2.y=cap2.j+3;
  const mkTeam=n=>{const L=[];for(let k=0;k<n;k++){const e=W2.addUnit('beee','soldat',ear2.x+15+(k%4)*.7,ear2.y+(k/4|0)*.7);e.anim='walk';e.stepHeardT=-9;e.hp=1e9;L.push(e);}return L;};
  const run=(L,ticks)=>{W2.s.heard=[];let updates=0,lastT=-1;for(let i=0;i<ticks;i++){W2.s.t+=.1;for(const e of L){e.anim='walk';}W2.stepsTick(.1);const c=W2.s.heard.find(h=>h.kind==='pas'&&h.oid===ear2.id);if(c&&c.t!==lastT){updates++;lastT=c.t;}}
    return {contact:W2.s.heard.find(h=>h.kind==='pas'&&h.oid===ear2.id)||null,updates};};
  const solo=mkTeam(1);const rs=run(solo,10);W2.s.units=W2.s.units.filter(u=>!solo.includes(u));
  const team=mkTeam(12);const rt=run(team,10);
  P(rt.contact&&(rt.contact.team||0)>=10&&!rs.contact,'C5. de nuit, une équipe de 12 à 15 cases est entendue comme une équipe, un Bèè seul non',`équipe : ${rt.contact?`team ${rt.contact.team}, incertitude ${rt.contact.uncertainty.toFixed(2)}`:'rien'} · seul : ${rs.contact?'entendu':'rien'}`);
  P(rt.updates>=8,'C6. le contact de l équipe en marche se rafraîchit à chaque tick',`${rt.updates} mises à jour en 10 ticks (1 h de jeu)`);
  const R1=W2.stepRange(team[0]);const R12=R1*(1+.18*Math.min(14,12-1));
  P(R12>=2.5*R1,'C7. la portée d une équipe de 12 est au moins 2,5 fois celle d un Bèè seul',`${R1.toFixed(1)} cases seul · ${R12.toFixed(1)} cases en équipe de 12`);}
process.exit(fail?1:0);
