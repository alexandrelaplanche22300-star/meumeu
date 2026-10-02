// Oberkommando der Meumeu — les bunkers en jeu. Le plan (bunkerdata.js) donne la forme ; ici : poser ses cases dans les grilles du monde, y loger une garnison,
// en ouvrir les portes à la charge. Les méthodes sont posées sur World (comme la guerre et l'économie).
//  · grilles : fort (1 mur · 2 sol couvert · 3 porte · 4 embrasure · 5 sol à ciel ouvert), emb (embrasure : on voit et on tire à travers, on ne passe pas),
//    fortB (le bâtiment de chaque case), occ (les murs et les embrasures : le béton), wall (la porte : ±3 selon le camp ; l'ennemi ne la franchit pas) ;
//  · un poste = une case du plan (tir, pièce, soute, abri) ; une garnison = chaque soldat à un poste, mené par le pathfinding ordinaire, par la porte.
import {BUILDINGS} from './data.js';
import {bunkerPlan} from './bunkerdata.js';

const CODE={'#':1,'.':2,'G':2,'A':2,'D':3,'E':4,'o':5};
export const BUNKERS={
  bunkerPlanOf(b){const id=BUILDINGS[b.k]?.bunker;return id?bunkerPlan(id,b.rot||0):null;},
  // v >= 0 : poser (v = l'id du bâtiment) ; v < 0 : effacer
  stampBunker(b,v){const P=this.bunkerPlanOf(b),N=this.N;this.occV=(this.occV||0)+1;this.wallV=(this.wallV||0)+1;
    for(let c=0;c<P.h;c++)for(let a=0;a<P.w;a++){const ch=P.rows[c][a];if(ch===' ')continue;const k=(b.j+c)*N+b.i+a;
      if(v<0){this.occ[k]=-1;this.fort[k]=0;this.emb[k]=0;this.fortB[k]=-1;if(Math.abs(this.wall[k])===3)this.wall[k]=0;continue;}
      this.fort[k]=CODE[ch];this.fortB[k]=v;if(ch==='#'||ch==='E')this.occ[k]=v;if(ch==='E')this.emb[k]=1;
      if(ch==='D'&&!b.ruin&&!(b.doorsDown||[]).includes(k))this.wall[k]=b.f==='meumeu'?3:-3;}},
  // les postes d'un bunker, en cases du monde : [{k,i,j,kind,fx,fy}]
  bunkerPosts(b){const P=this.bunkerPlanOf(b);if(!P)return [];const N=this.N;return P.posts.map(p=>({k:(b.j+p.c)*N+b.i+p.a,i:b.i+p.a,j:b.j+p.c,kind:p.kind,fx:p.fx,fy:p.fy}));},
  // la table des occupants (case → unité), nettoyée : un mort, un blessé évacué, un soldat reparti ailleurs libèrent leur poste
  bunkerOcc(b){const o=b.occ??={};for(const [k,id] of Object.entries(o)){const u=this.unit(id);if(!u||!(u.hp>0)||u.h?.state==='mort'||u.h?.state==='hors'||u.task?.bunker!==b.id||u.task?.post!==+k)delete o[k];}return o;},
  bunkerFree(b){const o=this.bunkerOcc(b);return this.bunkerPosts(b).filter(p=>!o[p.k]);},
  // loger ces soldats : chacun au poste libre qui lui convient (tireur → poste de tir ; pièce lourde → emplacement de pièce ; sans arme → soute ; le reste dans l'abri),
  // le plus proche de lui d'abord ; ils s'y rendent par le pathfinding ordinaire (la porte est la seule entrée), se tournent vers l'embrasure et y restent
  garrison(b,us,want=null){if(!b||b.ruin||!b.done)return {ok:false,why:['le bunker n’est pas terminé']};const o=this.bunkerOcc(b);
    // un poste désigné : celui qui l'occupe déjà cède sa place (il retourne à ses affaires)
    if(want!=null&&o[want]&&!us.some(u=>u.id===o[want])){const old=this.unit(o[want]);if(old){old.task=null;old.path=null;old.sentry=false;}delete o[want];}
    const posts=this.bunkerFree(b);if(!posts.length)return {ok:false,why:['le bunker est plein']};
    const pref=u=>{const W=u.w&&this.W(u.w);if(u.k==='medecin'||u.k==='infirmier'||u.k==='villageois')return ['abri','soute'];if(!W)return ['soute','abri'];if(W.crew>1)return ['gun','tir','abri'];return b.f==='beee'?['gun','tir','soute','abri']:['tir','abri','gun'];};   // (les Bèè : la pièce d'abord — l'état-major y met ensuite l'arme lourde)
    let n=0;const taken=new Set();
    // l'ordre au poste désigné : le premier soldat qui peut le tenir (une arme lourde pour un emplacement de pièce, un fusil pour un poste de tir), sinon le premier
    let first=null;const wp=want!=null?posts.find(p=>p.k===want):null;if(wp){first=us.find(u=>{const W=u.w&&this.W(u.w);return wp.kind==='gun'?W&&W.crew>1:wp.kind==='tir'?W&&!(W.crew>1):true;})||us[0];}
    for(const u of (first?[first,...us.filter(x=>x!==first)]:us)){
      let best=u===first?wp:null;if(!best)for(const kind of pref(u)){const c=posts.filter(p=>p.kind===kind&&!taken.has(p.k)).sort((p,q)=>Math.hypot(p.i-u.x,p.j-u.y)-Math.hypot(q.i-u.x,q.j-u.y))[0];if(c){best=c;break;}}
      if(!best)continue;taken.add(best.k);o[best.k]=u.id;n++;
      u.task={kind:'guard',tx:best.i+.5,ty:best.j+.5,fx:best.fx||null,fy:best.fy||null,hold:true,bunker:b.id,post:best.k,postKind:best.kind};u.path=null;u.goal=null;u.orderPost=best.kind==='tir'||best.kind==='gun'?'debout':null;u.sentry=true;}
    return n?{ok:true,text:`${n} prennent leur poste dans ${BUILDINGS[b.k].name.toLowerCase()}`}:{ok:false,why:['aucun poste libre qui convienne']};},
  // l'extérieur d'une porte : la case libre voisine (hors du plan), d'où l'on pose une charge
  doorFront(b,key){const P=this.bunkerPlanOf(b),N=this.N;const a=key%N-b.i,c=((key/N)|0)-b.j;for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]])if(P.at(a+dx,c+dy)===' ')return [b.i+a+dx+.5,b.j+c+dy+.5];return null;},
  // les portes encore debout, avec leur clé de case
  bunkerDoors(b){const P=this.bunkerPlanOf(b),N=this.N;if(!P)return [];return P.doors.map(([a,c])=>(b.j+c)*N+b.i+a).filter(k=>!(b.doorsDown||[]).includes(k));},
  // une charge qui explose en (x, y) : les portes de ce bunker à moins de r cases sautent (seules les charges ouvrent une porte)
  breakDoorsNear(b,x,y,r=2.6){const N=this.N;let n=0;for(const k of this.bunkerDoors(b)){if(Math.hypot(k%N+.5-x,((k/N)|0)+.5-y)>r)continue;(b.doorsDown??=[]).push(k);this.wall[k]=0;n++;this.emit({type:'collapse',x:k%N+.5,y:((k/N)|0)+.5,small:true});}
    if(n){this.wallV=(this.wallV||0)+1;this.repath();this.log(this.cityName?.(b)||'Front',`${n>1?'Des portes ont':'Une porte a'} sauté sous une charge : ${BUILDINGS[b.k].name.toLowerCase()} est ouvert.`,b.f==='meumeu'?'bad':'good');}return n;},
  // une fois par pas : un bunker détruit libère sa garnison et n'a plus de portes ; les occupants qui n'y sont plus sont retirés de la table
  bunkerTick(){for(const b of this.s.buildings){if(!BUILDINGS[b.k]?.bunker)continue;
      if(b.ruin){if(!b.ruinDone){b.ruinDone=true;for(const k of this.bunkerDoors(b))this.wall[k]=0;b.occ={};this.wallV=(this.wallV||0)+1;}continue;}
      if(b.occ&&this.s.t-(b.occT??-9)>.25){b.occT=this.s.t;this.bunkerOcc(b);}}},
};
