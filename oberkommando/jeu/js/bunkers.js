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
  garrison(b,us,want=null){if(!b||b.ruin||!b.done)return {ok:false,why:['le bunker n’est pas terminé']};
    us=(us||[]).filter(u=>u&&u.hp>0&&u.k!=='savant'&&u.k!=='reine');if(!us.length)return {ok:false,why:['les savants ne tiennent pas un bunker']};
    const o=this.bunkerOcc(b);
    if(want!=null&&o[want]&&!us.some(u=>u.id===o[want])){const old=this.unit(o[want]);if(old){old.task=null;old.path=null;old.sentry=false;}delete o[want];}
    const posts=this.bunkerFree(b);if(!posts.length)return {ok:false,why:['le bunker est plein']};
    const P=this.bunkerPlanOf(b),CARD=[[0,-1],[1,0],[0,1],[-1,0]];
    // un trou de tir = une seule case, celle juste derrière l'embrasure (pas toutes les cases voisines : sinon l'équipe s'entasse sur le trou le plus proche)
    const holes=[];const seen=new Set();
    for(const [ea,ec] of P.embr){for(const [dx,dy] of CARD){if(!'.o'.includes(P.at(ea+dx,ec+dy)))continue;const p=posts.find(q=>q.i===b.i+ea+dx&&q.j===b.j+ec+dy&&q.kind==='tir');if(p&&!seen.has(p.k)){seen.add(p.k);holes.push(p);break;}}}
    const taken=new Set(),left=us.slice();
    const rifle=u=>{const W=u.w&&this.W(u.w);return !!(W&&!(W.crew>1)&&u.k!=='medecin'&&u.k!=='infirmier'&&u.k!=='villageois');};
    const heavy=u=>{const W=u.w&&this.W(u.w);return !!(W&&W.crew>1);};
    const place=(u,p)=>{taken.add(p.k);o[p.k]=u.id;const i=left.indexOf(u);if(i>=0)left.splice(i,1);
      u.task={kind:'guard',tx:p.i+.5,ty:p.j+.5,fx:p.fx||null,fy:p.fy||null,hold:true,bunker:b.id,post:p.k,postKind:p.kind};u.path=null;u.goal=null;u.pathExact=[p.i+.5,p.j+.5];u.orderPost=p.kind==='tir'||p.kind==='gun'?'debout':null;u.sentry=true;};
    // une case désignée (clic sur cette case) : un soldat y va, les autres sur les cases restantes
    if(want!=null){const wp=posts.find(p=>p.k===+want);if(wp&&!o[wp.k]){const who=left.find(u=>wp.kind==='gun'?heavy(u):wp.kind==='tir'?rifle(u):u.k!=='villageois')||left[0];if(who)place(who,wp);}}
    // priorité : un tireur devant chaque trou encore libre, le plus proche de ce trou
    let guard=0;while(guard++<64){const open=holes.filter(p=>!taken.has(p.k)&&!o[p.k]);const men=left.filter(rifle);if(!open.length||!men.length)break;let bu=null,bp=null,bd=1e9;
      for(const u of men)for(const p of open){const d=(p.i+.5-u.x)**2+(p.j+.5-u.y)**2;if(d<bd){bd=d;bu=u;bp=p;}}if(!bu)break;place(bu,bp);}
    for(const p of posts){if(p.kind!=='gun'||taken.has(p.k)||o[p.k])continue;const u=left.filter(heavy).sort((a,z)=>(p.i-a.x)**2+(p.j-a.y)**2-(p.i-z.x)**2-(p.j-z.y)**2)[0];if(u)place(u,p);}
    const pref=u=>{if(u.k==='medecin'||u.k==='infirmier'||u.k==='villageois')return ['abri','soute'];if(heavy(u))return ['gun','abri','soute'];if(rifle(u))return ['tir','abri','soute'];return ['soute','abri'];};
    for(const u of left.slice()){let best=null;for(const kind of pref(u)){best=posts.filter(p=>p.kind===kind&&!taken.has(p.k)&&!o[p.k]).sort((p,q)=>(p.i-u.x)**2+(p.j-u.y)**2-(q.i-u.x)**2-(q.j-u.y)**2)[0];if(best)break;}if(best)place(u,best);}
    const n=us.length-left.length;
    return n?{ok:true,text:`${n} prennent leur poste dans ${BUILDINGS[b.k].name.toLowerCase()}`}:{ok:false,why:['aucun poste libre qui convienne']};},
  // l'extérieur d'une porte : la case libre voisine (hors du plan), d'où l'on pose une charge
  doorFront(b,key){const P=this.bunkerPlanOf(b),N=this.N;const a=key%N-b.i,c=((key/N)|0)-b.j;for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]])if(P.at(a+dx,c+dy)===' ')return [b.i+a+dx+.5,b.j+c+dy+.5];return null;},
  // les portes encore debout, avec leur clé de case
  bunkerDoors(b){const P=this.bunkerPlanOf(b),N=this.N;if(!P)return [];return P.doors.map(([a,c])=>(b.j+c)*N+b.i+a).filter(k=>!(b.doorsDown||[]).includes(k));},
  // le souffle d'une charge posée à la porte : deux grenades, l'une sur le seuil, l'autre trois cases à l'intérieur — les occupants près de la porte sont touchés (le béton du reste les protège)
  bunkerBlast(b,c){const N=this.N;let door=null,bd=1e9;for(const k of (b.doorsDown||[])){const d=Math.hypot(k%N+.5-c.x,((k/N)|0)+.5-c.y);if(d<bd){bd=d;door=k;}}if(door==null||bd>3.2)return;const P=this.bunkerPlanOf(b),a=door%N-b.i,r=((door/N)|0)-b.j;
    const ins=[[0,-1],[1,0],[0,1],[-1,0]].find(([dx,dy])=>'.oGA'.includes(P.at(a+dx,r+dy)));const x=door%N+.5,y=((door/N)|0)+.5;this.blast(x,y,'obus',c.f,c.by,1,'grenade');if(ins){this.blast(x+ins[0]*1.2,y+ins[1]*1.2,'obus',c.f,c.by,1,'grenade');this.blast(x+ins[0]*3,y+ins[1]*3,'grenade',c.f,c.by,1,'grenade');}},
  // le verrou d'une porte forcé à la main (clic droit des soldats, quelques heures de jeu sous le feu) : la porte s'ouvre, pour de bon
  unlockDoor(b,key){if((b.doorsDown||[]).includes(key))return false;(b.doorsDown??=[]).push(key);this.wall[key]=0;this.wallV=(this.wallV||0)+1;this.repath();this.emit({type:'collapse',x:key%this.N+.5,y:((key/this.N)|0)+.5,small:true});this.log(this.cityName?.(b)||'Front',`Une porte de ${BUILDINGS[b.k].name.toLowerCase()} est débloquée de l’extérieur.`,b.f==='meumeu'?'bad':'good');return true;},
  // une charge qui explose en (x, y) : les portes de ce bunker à moins de r cases sautent (seules les charges ouvrent une porte)
  breakDoorsNear(b,x,y,r=2.6){const N=this.N;let n=0;for(const k of this.bunkerDoors(b)){if(Math.hypot(k%N+.5-x,((k/N)|0)+.5-y)>r)continue;(b.doorsDown??=[]).push(k);this.wall[k]=0;n++;this.emit({type:'collapse',x:k%N+.5,y:((k/N)|0)+.5,small:true});}
    if(n){this.wallV=(this.wallV||0)+1;this.repath();this.log(this.cityName?.(b)||'Front',`${n>1?'Des portes ont':'Une porte a'} sauté sous une charge : ${BUILDINGS[b.k].name.toLowerCase()} est ouvert.`,b.f==='meumeu'?'bad':'good');}return n;},
  // une fois par pas : un bunker détruit libère sa garnison et n'a plus de portes ; les occupants qui n'y sont plus sont retirés de la table
  bunkerTick(){for(const b of this.s.buildings){if(!BUILDINGS[b.k]?.bunker)continue;
      if(b.ruin){if(!b.ruinDone){b.ruinDone=true;for(const k of this.bunkerDoors(b))this.wall[k]=0;b.occ={};this.wallV=(this.wallV||0)+1;}continue;}
      if(b.occ)for(const [k,id] of Object.entries(b.occ)){const u=this.unit(id);if(u&&(u.k==='savant'||u.k==='reine')){delete b.occ[k];if(u.task?.bunker===b.id){u.task=null;u.path=null;u.sentry=false;}}}
      if(b.occ&&this.s.t-(b.occT??-9)>.25){b.occT=this.s.t;this.bunkerOcc(b);}}},
};
