// Les tranchées bèè en FOSSES (V12.4, demande du joueur : « un trou unique de genre 4 cases, pas un champ de trous ; au moins un par ville »).
// Avant : des arcs d'une case de large ; leurs pas en diagonale faisaient un damier de petits trous séparés (capture du joueur).
// CRITÈRES (fixés avant de lancer ; graines 101 et 102, 6 jours, IA bèè seule) :
//   F1 toute ville bèè gardée par au moins 3 soldats a au moins une fosse (tranchée prévue ou creusée) à moins de 26 cases
//   F2 chaque case de tranchée bèè appartient à un carré plein de 2 × 2 cases (aucune case isolée, aucune diagonale)
//   F3 chaque morceau (cases voisines par un côté) compte au moins 4 cases
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/fosses.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const R={f1:[],f2:[],f3:[]};
for(const seed of [101,102]){const W=new World(seed);for(let h=0;h<6*24;h++){W.update(1);W.events.length=0;}const N=W.N;
  const T=new Set(Object.keys(W.s.trenches).map(Number).filter(k=>W.s.trenches[k].f==='beee'));
  const cities=W.s.beee.cities.filter(c=>!c.fallen);
  for(const c of cities){const g=W.beeeGuards(c).length;if(g<3)continue;const n=[...T].filter(k=>d2(k%N+.5,((k/N)|0)+.5,c.x,c.y)<26).length;R.f1.push([`${seed}:${c.name}`,n>=4,`${g} gardes, ${n} cases`]);}
  const inSq=k=>{const i=k%N,j=(k/N)|0;for(const [a,b] of [[0,0],[-1,0],[0,-1],[-1,-1]]){const i0=i+a,j0=j+b;if([[0,0],[1,0],[0,1],[1,1]].every(([x,y])=>T.has((j0+y)*N+i0+x)))return true;}return false;};
  const bad=[...T].filter(k=>!inSq(k));R.f2.push([seed,!bad.length&&T.size>0,`${T.size} cases, ${bad.length} hors d’un carré`]);
  const seen=new Set();const sizes=[];for(const k of T){if(seen.has(k))continue;let n=0;const q=[k];seen.add(k);while(q.length){const x=q.pop();n++;for(const y of [x+1,x-1,x+N,x-N])if(T.has(y)&&!seen.has(y)){seen.add(y);q.push(y);}}sizes.push(n);}
  R.f3.push([seed,sizes.length>0&&sizes.every(n=>n>=4),`morceaux : ${sizes.join(', ')}`]);}
P(R.f1.length>0&&R.f1.every(x=>x[1]),'F1. chaque ville gardée a au moins une fosse',R.f1.map(x=>`${x[0]} ${x[2]}`).join(' · '));
P(R.f2.every(x=>x[1]),'F2. chaque case de tranchée fait partie d’un carré de 2 × 2',R.f2.map(x=>`graine ${x[0]} : ${x[2]}`).join(' · '));
P(R.f3.every(x=>x[1]),'F3. pas de petit trou isolé : chaque morceau fait au moins 4 cases',R.f3.map(x=>`graine ${x[0]} : ${x[2]}`).join(' · '));
process.exit(fail?1:0);
