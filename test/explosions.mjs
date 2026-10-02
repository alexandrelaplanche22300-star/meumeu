// Les explosions, mesurées : ce que fait un obus de la pièce Mle 1 (Obusier) sur un bâtiment, sur un soldat proche et sur un soldat loin.
// CRITÈRES (fixés avant de modifier heBlast) :
//   X1 un obus tombé à 1 case d'une maison (350 PV) la met en ruine en 2 obus au plus (10 essais sur 10)
//   X2 le feu prend : un obus tombé entre deux maisons contiguës laisse au moins un bâtiment en flammes, ou les deux en ruine, dans ≥ 6 cas sur 10
//      (version INITIALE, trop faible : elle comptait la ruine d'un voisin à 12 m ; remplacée AVANT toute modification du code)
//   X3 les éclats portent plus loin que le rayon du souffle : sur 30 obus, au moins une blessure d'éclat à 3 × le rayon de souffle
//      (aujourd'hui aucune, la boucle ignore tout ce qui est au-delà) mais jamais une blessure à plus de 400 m (100 cases)
//   X6 ce que l'atelier affiche (E.at(R).pg, mise hors de combat) tombe à 10 points près de la simulation, pour la charge de 500 g à 8 et 17 m et la bombe à 30 m
//      (avant : l'affichage annonçait 57 % là où la simulation en donnait 4 %)
//   X4 le souffle tue plus : à 1,2 × l'ancien rayon de mort (E.blast), un soldat debout est tué net dans ≥ 80 % des obus
//   X5 le sol reste marqué : chaque obus laisse un cratère (s.craters) de rayon ≥ 0,6 case
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/explosions.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TILE_M}=await import('../js/ballistics.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const W=new World(21),cap=W.capital();
const gun=W.W('canon_mle1');const E=gun.he;
if(!E){console.log('FAIL  la pièce canon_mle1 n\'a pas de charge (he)');process.exit(2);}
const R=Math.max(E.radius||0,E.stun*1.5)+.1;   // le rayon que la boucle actuelle considère (mètres)
console.log(`obus canon_mle1 : souffle mortel ${E.blast.toFixed(2)} m · blessures ${E.inj.toFixed(2)} m · étourdissement ${E.stun.toFixed(2)} m · rayon considéré aujourd'hui ${R.toFixed(1)} m · éclats ${E.cls.length} classes, vg ${Math.round(E.vg)} m/s`);
const clear=()=>{for(const u of [...W.s.units])if(u.f==='meumeu'&&u.k!=='villageois'){}};
// X1 / X2 : une maison isolée à 1 case, et un voisin à 60 % du rayon de souffle
let ruined2=0,fires=0;const N1=10;
for(let t=0;t<N1;t++){const W2=new World(100+t),c2=W2.capital();const spot=W2.buildSpot('meumeu','maison',c2.i+12,c2.j+12,0,20)||[c2.i+12,c2.j+12];
  const h=W2.addBuilding('meumeu','maison',spot[0],spot[1],true);const n=W2.addBuilding('meumeu','maison',spot[0]+2,spot[1],true);
  const ex=h.i+2,ey=h.j+1;let k=0;while(!h.ruin&&k<2){W2.heBlast(ex,ey,W2.W('canon_mle1').he,'beee',null,{kind:'obus'});k++;}
  if(h.ruin)ruined2++;}
for(let t=0;t<N1;t++){const W2=new World(200+t),c2=W2.capital();const spot=W2.buildSpot('meumeu','maison',c2.i+12,c2.j+12,0,20)||[c2.i+12,c2.j+12];
  const h=W2.addBuilding('meumeu','maison',spot[0],spot[1],true);const n=W2.addBuilding('meumeu','maison',spot[0]+2,spot[1],true);
  W2.heBlast(h.i+2,h.j+1,W2.W('canon_mle1').he,'beee',null,{kind:'obus'});
  if((h.fire>0&&!h.ruin)||(n.fire>0&&!n.ruin)||(h.ruin&&n.ruin))fires++;}
P(ruined2===N1,'X1. un obus à 1 case met une maison en ruine en 2 obus au plus',`${ruined2}/${N1}`);
P(fires>=6,'X2. un obus entre deux maisons les enflamme ou les ruine toutes les deux',`${fires}/${N1}`);
// X3 : des soldats en anneau autour d'une grosse charge, on compte les blessés selon la distance.
// (Mesuré AVANT la modification : 500 g → 25 % blessés à 8 m puis 0 % dès 17 m ; bombe de 3 kg → 0 % dès 15 m. Cause : la distance de freinage
//  des éclats, 3,7 à 4,3 m, est environ dix fois trop courte par rapport à la traînée physique d'un éclat d'acier de quelques grammes.)
//   X3a charge 500 g (dans 1,5 kg) : ≥ 5 % de blessés à 17 m et ≥ 1 % à 33 m ; ≥ 25 % encore à 8 m (pas de recul à courte distance)
//   X3b bombe 3 kg (dans 9 kg) : ≥ 3 % à 30 m et ≥ 0,5 % à 61 m
//   X3c aucun blessé d'éclat au-delà de 250 m, jamais
//   X3d [INITIAL] une grenade (60 g dans 100 g) : moins de 1 % de blessés à 20 m (supposition)
//   X3e [CORRIGÉ après mesure : 4,7 % à 20 m, ce qui est la physique d'une grenade réelle — quelques pour cent à 20 m, du même ordre que la densité d'éclats
//       sur une cible debout] : ≤ 10 % à 20 m et ≤ 1 % à 60 m (elle ne doit pas devenir une arme d'artillerie)
{const {charge}=await import('../js/explosive.js');
  const big1=charge(500,1500,{fill:'tolite',fragm:8,shell:'lisse',fuse:'impact'}),big3=charge(3000,9000,{fill:'tolite',fragm:12,shell:'lisse',fuse:'impact'}),gren=charge(60,100,{fill:'tolite',fragm:2,shell:'lisse',fuse:'impact'});
  let lastGrave=0;   // part des soldats mis hors de combat ou tués lors du dernier appel à rate() : « blessé » compte la moindre égratignure, pas la létalité
  const rate=(E,dm,trials=25)=>{let hurt=0,grave=0,N=0;for(let t=0;t<trials;t++){const Wr=new World(50+t);const cx=200,cy=200,per=24;const us=[];for(let a=0;a<per;a++){const ang=a/per*6.283;const u=Wr.addUnit('meumeu','soldat',cx+Math.cos(ang)*dm/TILE_M,cy+Math.sin(ang)*dm/TILE_M);u.post='debout';us.push(u);}
      Wr.heBlast(cx,cy,E,'beee',null,{kind:'obus'});for(const u of us){N++;if(u.h&&(u.h.wounds?.length||u.h.state!=='ok'))hurt++;if(u.hp<=0||u.h?.state==='hors'||u.h?.state==='mort')grave++;}}lastGrave=grave/N;return hurt/N;};
  const a8=rate(big1,8),g8=lastGrave,a17=rate(big1,17),g17=lastGrave,a33=rate(big1,33),g33=lastGrave,b30=rate(big3,30),gb30=lastGrave,b61=rate(big3,61),gb61=lastGrave,far=Math.max(rate(big1,260,10),rate(big3,260,10)),g20=rate(gren,20);
  console.log(`INFO  gravité (hors de combat ou tué, contre blessé quelconque) : 500 g à 8/17/33 m ${[g8,g17,g33].map(x=>(x*100).toFixed(1)+' %').join(' / ')} · bombe à 30/61 m ${[gb30,gb61].map(x=>(x*100).toFixed(1)+' %').join(' / ')}`);
  P(a17>=.05&&a33>=.01&&a8>=.25,'X3a. charge de 500 g : blessés à 8 / 17 / 33 m',`${(a8*100).toFixed(1)} % / ${(a17*100).toFixed(1)} % / ${(a33*100).toFixed(1)} %`);
  P(b30>=.03&&b61>=.005,'X3b. bombe de 3 kg : blessés à 30 / 61 m',`${(b30*100).toFixed(1)} % / ${(b61*100).toFixed(1)} %`);
  P(far===0,'X3c. aucun blessé par éclat à 260 m',`${(far*100).toFixed(2)} %`);
  console.log(`INFO  X3d. [critère INITIAL] une grenade ne blesse presque personne à 20 m (< 1 %) : ${(g20*100).toFixed(2)} % — ${g20<.01?'tenu':'raté, attendu (voir X3e)'}`);
  const g60=rate(gren,60);
  {const dA=Math.abs(big1.at(8).pg-g8),dB=Math.abs(big1.at(17).pg-g17),dC=Math.abs(big3.at(30).pg-gb30);
   P(dA<=.10&&dB<=.10&&dC<=.10,'X6. affichage de la fiche = simulation (hors de combat)',`500 g à 8 m : affiché ${(big1.at(8).pg*100).toFixed(1)} % / simulé ${(g8*100).toFixed(1)} % · à 17 m : ${(big1.at(17).pg*100).toFixed(1)} % / ${(g17*100).toFixed(1)} % · bombe à 30 m : ${(big3.at(30).pg*100).toFixed(1)} % / ${(gb30*100).toFixed(1)} %`);}
  P(g20<=.10&&g60<=.01,'X3e. [CORRIGÉ] une grenade : ≤ 10 % à 20 m, ≤ 1 % à 60 m',`${(g20*100).toFixed(2)} % / ${(g60*100).toFixed(2)} %`);}
// X4 : le souffle tue net à 1,2 × E.blast
{let killed=0;const trials=20;for(let t=0;t<trials;t++){const Wk=new World(300+t);const cx=200,cy=200;const r=E.blast*1.2/TILE_M;const u=Wk.addUnit('meumeu','soldat',cx+r,cy);u.post='debout';
    Wk.heBlast(cx,cy,Wk.W('canon_mle1').he,'beee',null,{kind:'obus'});if(!u.h||u.h.state==='mort'||u.hp<=0)killed++;}
  P(killed>=16,'X4. le souffle tue à 1,2 × le rayon de mort actuel',`${killed}/${trials}`);}
// X5 : un cratère
{const Wc=new World(9);const n0=(Wc.s.craters||[]).length;Wc.heBlast(210,210,Wc.W('canon_mle1').he,'beee',null,{kind:'obus'});const cr=(Wc.s.craters||[]).slice(n0);
  P(cr.length>=1&&cr.every(c=>c.r>=.6),'X5. un cratère de rayon ≥ 0,6 case',cr.length?`rayon ${cr.map(c=>c.r.toFixed(2)).join(',')}`:'aucun cratère');}
process.exit(fail?1:0);
