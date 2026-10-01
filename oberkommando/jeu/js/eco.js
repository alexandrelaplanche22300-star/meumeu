// Oberkommando der Meumeu — la gestion. Tout ce qui fait tourner l'arrière :
//  · les usines : une seule production chacune, choisie ; elles prennent leurs matières à un dépôt d'approvisionnement,
//    livrent à un dépôt de sortie (à moins de RADIUS cases, les porteurs y vont à pied), et leurs machines brûlent du charbon ;
//  · les dépôts : polyvalents. Chacun a une priorité (1 à 5) et des demandes : celles que le joueur y règle, celles des usines
//    qui s'y approvisionnent, celles des chantiers voisins, des voies tracées, des locomotives à court de charbon ;
//  · le bureau du fret : chaque train, chaque porteur « à la demande » prend le manque le plus prioritaire qu'il peut servir,
//    va le chercher au dépôt qui en a de trop le plus commode, et le livre. Un dépôt garde ce qu'il demande lui-même ;
//    seule une demande de priorité plus haute peut le lui prendre.
// Tout ici vaut pour les deux camps : l'état-major bèè s'en servira comme nous. Les méthodes sont posées sur World.
import {BUILDINGS,PRODUCTS,VEHICLES,RADIUS,RES,RARE,GOAL,FRET,LIMIT_OF,familyOf} from './data.js';
import {crateCost,weaponCost,weightOf} from './designs.js';
import {derive} from './ballistics.js';
import {deriveArmor} from './armor.js';

const d2=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const inc=(map,id,k,n)=>{let m=map.get(id);if(!m)map.set(id,m={});m[k]=(m[k]||0)+n;};
const get=(map,id,k)=>map.get(id)?.[k]||0;
const whole=k=>k.startsWith('a:')||k.startsWith('p:');

export const ECO={
  // ---------- les rattachements ----------
  bc(b){const [w,h]=BUILDINGS[b.k].size;return [b.i+w/2,b.j+h/2];},
  // les dépôts à portée d'un bâtiment, du plus proche au plus lointain
  reach(b,r=RADIUS){const [x,y]=this.bc(b);return this.s.buildings.filter(d=>d!==b&&d.f===b.f&&this.isDepot(d)&&this.distB(d,x,y)<=r).sort((a,z)=>this.distB(a,x,y)-this.distB(z,x,y));},
  linkOk(b,id){if(id==null)return false;const d=this.building(id);if(!d||d===b||d.f!==b.f||!this.isDepot(d))return false;const [x,y]=this.bc(b);return this.distB(d,x,y)<=RADIUS;},
  takesIn(b){const B=BUILDINGS[b.k];return !!(B.factory||(B.stock0&&!B.store));},
  givesOut(b){const B=BUILDINGS[b.k];return !!(B.factory||B.makes||b.k==='mine');},
  // un rattachement perdu (dépôt détruit, trop loin) retombe sur le dépôt le plus proche
  autoLink(b){const near=()=>this.reach(b)[0]?.id??null;let moved=false;
    if(this.takesIn(b)&&!this.linkOk(b,b.sup)){const was=b.sup;b.sup=near();moved=was!=null&&was!==b.sup;}
    if(this.givesOut(b)&&!this.linkOk(b,b.out)){const was=b.out;b.out=near();moved=moved||(was!=null&&was!==b.out);}
    if(moved&&b.f==='meumeu')this.log(this.cityName(b),`${BUILDINGS[b.k].name} : son dépôt a disparu, rattaché d’office au plus proche.`,'warn');},
  setLink(b,which,id){if(!b||!['sup','out'].includes(which))return {ok:false,why:['rien à rattacher']};
    if(which==='sup'&&!this.takesIn(b)||which==='out'&&!this.givesOut(b))return {ok:false,why:['ce bâtiment ne prend ni ne livre rien']};
    if(!this.linkOk(b,id))return {ok:false,why:[`un dépôt à nous, bâti, à moins de ${RADIUS} cases`]};
    b[which]=id;const d=this.building(id);return {ok:true,text:`${BUILDINGS[b.k].name} : ${which==='sup'?'s’approvisionne à':'livre à'} ${this.depotName(d)}`};},
  depotName(d){if(!d)return '—';return `${BUILDINGS[d.k].name.toLowerCase()}${d.no>1?` n°${d.no}`:''} de ${this.cityName(d)}`;},
  // ce qui est rattaché à un dépôt : les usines qui y prennent, celles (et les mines, les fermes) qui y livrent, les chantiers
  linkedTo(d){const o={sup:[],out:[],site:[]};for(const b of this.s.buildings){if(b.f!==d.f)continue;if(b.sup===d.id&&this.takesIn(b))o.sup.push(b);if(b.out===d.id&&this.givesOut(b))o.out.push(b);if(b.site===d.id&&!b.done&&!b.ruin)o.site.push(b);}return o;},

  // ---------- les usines ----------
  productsOf(b){const B=BUILDINGS[b.k];if(!B.factory)return [];const L=Object.keys(PRODUCTS).filter(k=>PRODUCTS[k].at===b.k);
    if(B.arsenal)L.unshift(...this.designsOf(b.f).map(d=>'m:'+d.id));
    if(B.manufacture)L.push(...this.designsOf(b.f).map(d=>'a:'+d.id),...this.armorsOf(b.f).map(a=>'p:'+a.id));
    return L;},
  productName(k){if(!k)return 'rien';return PRODUCTS[k]?.name||this.goodName(k);},
  // un lot : ce qu'il prend, ce qu'il donne, ses heures de travail ; tool : l'outillage à faire d'abord
  recipe(b,key){const P=PRODUCTS[key];
    if(P){const r={key,in:{...P.in},out:{...P.out},hours:P.hours};if(key==='carburant')r.in.bois=+(r.in.bois*this.mod('carburant_bois')).toFixed(2);return r;}
    if(key.startsWith('m:')){const d=this.design(key.slice(2));if(!d||d.status!=='adopte')return null;const c=crateCost(d.p);for(const k of ['fer','plomb','cuivre'])if(c[k])c[k]=+(c[k]*this.mod('fer_munitions')).toFixed(2);return {key,in:c,out:{[key]:1},hours:1.2};}
    if(key.startsWith('a:')){const d=this.design(key.slice(2));if(!d||d.status!=='adopte')return null;if(!b.tooled?.[d.id])return {key,tool:d.id,in:{pieces:4,fer:1},out:{},hours:6};
      return {key,in:weaponCost(d.p),out:{[key]:1},hours:derive(d.p).hoursW/2};}
    if(key.startsWith('p:')){const a=this.s.armors[key.slice(2)];if(!a||a.status!=='adopte')return null;const D=deriveArmor(a.a);return {key,in:{...D.cost},out:{[key]:1},hours:D.hours/2};}
    return null;},
  // le charbon des machines, par heure de travail d'un Meumeu
  coalRate(b){return (BUILDINGS[b.k].factory?.coal||0)*this.mod('charbon_machines');},
  setProduct(b,key){if(!b||!BUILDINGS[b.k].factory)return {ok:false,why:['pas une usine']};if(key&&!this.productsOf(b).includes(key))return {ok:false,why:['cette usine ne sait pas faire ça']};
    if(b.prod===key)return {ok:true,text:'rien ne change'};
    // un lot commencé est démonté : ses matières retournent au dépôt d'approvisionnement
    if(b.batch&&!b.batch.tool&&b.batch.done<b.batch.hours){const sup=this.building(b.sup);if(sup)for(const [k,v] of Object.entries(b.batch.in))this.put(sup,k,v);}
    b.batch=null;b.prod=key||null;b.limit=key?LIMIT_OF(key):0;
    const R=key&&this.recipe(b,key);return {ok:true,text:`${BUILDINGS[b.k].name} : ${key?this.productName(key).toLowerCase():'à l’arrêt'}${R?.tool?' — il faut d’abord l’outiller (6 h)':''}`};},
  setLimit(b,n){b.limit=Math.max(0,Math.round(n));},
  // la commande permanente d'une usine à son dépôt d'approvisionnement : de quoi faire BUF lots d'avance, charbon compris
  factoryNeed(b){if(!b.done||!b.prod||b.halt)return null;const R=this.recipe(b,b.prod);if(!R)return null;
    const out=this.building(b.out);if(!R.tool&&b.limit>0&&out&&(out.stock[b.prod]||0)>=b.limit)return null;
    const W=BUILDINGS[b.k].workers||1;const lots=R.tool?1:Math.max(FRET.BUF,Math.ceil(FRET.BUF_H*W/Math.max(.1,R.hours)));
    const need={};for(const [k,v] of Object.entries(R.in))need[k]=v*lots;const c=this.coalRate(b)*R.hours*lots;if(c>0)need.charbon=(need.charbon||0)+c;return need;},
  factoryTick(b,n,dt){const B=BUILDINGS[b.k];this.autoLink(b);
    if(!b.prod){b.why='aucune production choisie';return;}if(b.halt){b.why='arrêtée';return;}
    const sup=this.building(b.sup),out=this.building(b.out);
    if(!sup){b.why=`aucun dépôt d’approvisionnement à moins de ${RADIUS} cases`;return;}if(!out){b.why=`aucun dépôt de sortie à moins de ${RADIUS} cases`;return;}
    // un lot fini qui n'a pas pu sortir : on réessaie
    if(b.batch&&b.batch.done>=b.batch.hours){this.factoryDeliver(b,out);return;}
    if(!b.batch){const R=this.recipe(b,b.prod);if(!R){b.why='la conception est perdue';return;}
      if(!R.tool&&b.limit>0&&(out.stock[b.prod]||0)>=b.limit){b.why=`plafond atteint : ${b.limit} au dépôt de sortie`;b.full=true;return;}b.full=false;
      const miss=Object.entries(R.in).filter(([k,v])=>(sup.stock[k]||0)<v-1e-6);
      if(miss.length){b.why=`attend au dépôt d’approvisionnement : ${miss.map(([k,v])=>`${+(v-(sup.stock[k]||0)).toFixed(1)} ${this.goodName(k).toLowerCase()}`).join(', ')}`;return;}
      for(const [k,v] of Object.entries(R.in))sup.stock[k]-=v;b.batch={...R,out:{...R.out},done:0};}
    const c=this.coalRate(b)*n*dt;if(c>0){if((sup.stock.charbon||0)<c){b.why='machines froides : plus de charbon au dépôt d’approvisionnement';b.cold=true;return;}sup.stock.charbon-=c;}b.cold=false;
    b.batch.done+=n*dt*this.mod(B.factory.mod);b.why=null;b.working=true;this.practice(B.factory.mod==='soins'?'soins':B.factory.mod==='armement'?'armement':B.factory.mod==='briques'?'construction':'atelier',dt*n);
    if(b.batch.done>=b.batch.hours)this.factoryDeliver(b,out);},
  factoryDeliver(b,out){const bt=b.batch;
    if(bt.tool){b.tooled??={};b.tooled[bt.tool]=true;b.batch=null;this.log(this.cityName(b),`${BUILDINGS[b.k].name} outillée pour ${this.design(bt.tool)?.name||'?'}.`,'good');return;}
    for(const [k,v] of Object.entries(bt.out)){const q=this.put(out,k,v);bt.out[k]-=q;if(bt.out[k]<=1e-6)delete bt.out[k];}
    if(Object.keys(bt.out).length){b.why=`le dépôt de sortie est plein (${this.depotName(out)})`;return;}
    b.batch=null;b.made=(b.made||0)+1;},

  // ---------- les chantiers : ils se paient à mesure que les matériaux arrivent ----------
  siteCost(b){return b.ruin?{}:BUILDINGS[b.k].cost;},
  // (un reste d'arrondi ne doit pas laisser un chantier à 99,999 % pour toujours)
  sitePaidFrac(b){const c=this.siteCost(b);let f=1;for(const [k,v] of Object.entries(c)){if(!(v>0))continue;const p=b.paid?.[k]||0;f=Math.min(f,p>=v-1e-6?1:p/v);}return f;},
  siteRemaining(b){const c=this.siteCost(b);const o={};for(const [k,v] of Object.entries(c)){const r=v-(b.paid?.[k]||0);if(r>1e-6)o[k]=r;}return o;},
  // les bâtisseurs prennent ce qu'ils trouvent dans les dépôts à moins de RADIUS cases ; renvoie vrai si le chantier a avancé d'un cran
  sitePay(b){const rem=this.siteRemaining(b);if(!Object.keys(rem).length)return false;const before=this.sitePaidFrac(b);const [x,y]=this.bc(b);b.paid??={};
    for(const [k,n] of Object.entries(rem)){const got=this.take(b.f,x,y,k,n);if(got>0)b.paid[k]=(b.paid[k]||0)+got;}
    return this.sitePaidFrac(b)>before+1e-9;},
  siteMissing(b){return Object.entries(this.siteRemaining(b)).map(([k,v])=>`${Math.ceil(v)} ${this.goodName(k).toLowerCase()}`).join(', ');},

  // ---------- les demandes ----------
  // Toutes les demandes d'un camp, et ce qui est déjà en route : de quoi décider de chaque voyage.
  market(f){const deps=this.s.buildings.filter(b=>b.f===f&&this.isDepot(b));
    const M={f,deps,dem:new Map(),inb:new Map(),outb:new Map()};
    const add=(D,k,n,p,src,by)=>{if(!(n>1e-6))return;let m=M.dem.get(D.id);if(!m)M.dem.set(D.id,m={});(m[k]??=[]).push({p,n,src,by});};
    for(const D of deps){const p=D.prio??3;for(const [k,n] of Object.entries(D.want||{}))add(D,k,n,p,'want',null);}
    // l'objectif : le rare à la capitale, en toute dernière priorité — n'importe quelle autre demande passe avant
    const cap=null;if(cap)for(const k of RARE)add(cap,k,GOAL,.5,'objectif',null);
    for(const b of this.s.buildings){if(b.f!==f)continue;
      if(b.done&&BUILDINGS[b.k].factory){const need=this.factoryNeed(b);const D=need&&this.building(b.sup);if(D&&this.isDepot(D))for(const [k,n] of Object.entries(need))add(D,k,n,D.prio??3,'usine',b.id);}
      if(b.done&&b.need&&Object.keys(b.need).length){this.autoLink(b);const D=this.building(b.sup);if(D&&this.isDepot(D))for(const [k,n] of Object.entries(b.need))add(D,k,n,D.prio??3,'reserve',b.id);}
      if(!b.done&&!b.ruin&&b.site!=null){const D=this.building(b.site);if(D&&this.isDepot(D))for(const [k,n0] of Object.entries(this.siteRemaining(b))){const n=n0-(b.f==='meumeu'?this.enRoute(b,k):0);if(n>1e-6)add(D,k,n,D.prio??3,'chantier',b.id);}}}
    for(const [id,need] of Object.entries(this.lineDemand(f))){const D=this.building(+id);if(D)for(const [k,n] of Object.entries(need))add(D,k,n,D.prio??3,'voie',null);}
    for(const v of this.s.vehicles){if(v.f!==f)continue;
      if(v.k==='train'&&v.needCoal&&v.at!=null){const D=this.building(v.at);if(D&&this.isDepot(D))add(D,'charbon',this.tender(),Math.min(5,(D.prio??3)+1),'locomotive',v.id);}
      const J=v.job;if(!J)continue;
      if(J.phase==='src'){for(const [k,n] of Object.entries(J.q)){inc(M.inb,J.to,k,n);if(J.from!=null)inc(M.outb,J.from,k,n);}}
      else for(const [k,n] of Object.entries(v.cargo))inc(M.inb,J.to,k,n);}
    return M;},
  // les voies et les murs tracés, pas encore payés : une demande au dépôt le plus proche (gardée une heure de jeu)
  lineDemand(f){const c=this._lineDem?.[f];if(c&&this.s.t-c.t<1)return c.d;const d={};const N=this.N;
    const deps=this.s.buildings.filter(b=>b.f===f&&this.isDepot(b));if(deps.length){
      const scan=(store,kind,mine)=>{for(const [kk,o] of Object.entries(store)){if(o.b||o.paid||!mine(o))continue;const i=kk%N,j=(kk/N)|0;let best=null,bd=RADIUS;
          for(const D of deps){const dd=this.distB(D,i+.5,j+.5);if(dd<=bd){bd=dd;best=D;}}if(!best)continue;const m=d[best.id]??={};for(const [r,v] of Object.entries(({rail:{bois:2,pierre:1},mur:{pierre:4}})[kind]))m[r]=(m[r]||0)+v;}};
      if(f==='meumeu')scan(this.s.rails,'rail',()=>true);scan(this.s.walls,'mur',o=>o.f===f);}
    (this._lineDem??={})[f]={t:this.s.t,d};return d;},
  // Les manques d'un dépôt, par priorité : son stock et ce qui arrive couvrent d'abord les demandes les plus hautes.
  // On ne demande pas plus que la place qui reste : un dépôt plein n'attire plus de convoi (il se vide d'abord).
  deficits(M,D){const m=M.dem.get(D.id);if(!m)return [];const out=[];let free=this.room(D);for(const [k,n] of Object.entries(M.inb.get(D.id)||{}))free-=n*this.w1(k);
    for(const [k,L] of Object.entries(m)){let cover=(D.stock[k]||0)+get(M.inb,D.id,k);const byP=new Map();for(const x of L)byP.set(x.p,(byP.get(x.p)||0)+x.n);
      for(const [p,n] of [...byP].sort((a,z)=>z[0]-a[0])){const c=Math.min(cover,n);cover-=c;const want=Math.min(n-c,Math.max(0,free)/this.w1(k));if(want>.05)out.push({D,k,p,n:want,of:n,full:want<n-c-.05});}}
    return out;},
  w1(k){return weightOf(k,this.s.designs,this.s.armors);},
  // ce qu'un dépôt garde pour lui face à une demande de priorité p : toutes ses propres demandes de priorité au moins égale
  reserved(M,S,k,p){const L=M.dem.get(S.id)?.[k];if(!L)return 0;let r=0;for(const x of L)if(x.p>=p)r+=x.n;return r;},
  avail(M,S,k,p){return Math.max(0,(S.stock[k]||0)-this.reserved(M,S,k,p)-get(M.outb,S.id,k));},
  // la liste de ce qui manque partout, pour l'écran du fret
  shortages(f){const M=this.market(f);const L=[];for(const D of M.deps)for(const it of this.deficits(M,D)){let src=0;for(const S of M.deps)if(S!==D)src+=this.avail(M,S,it.k,it.p);L.push({...it,src,inb:get(M.inb,D.id,it.k)});}
    return L.sort((a,z)=>z.p-a.p||z.n-a.n);},
  demandLines(D){const M=this.market(D.f);const m=M.dem.get(D.id)||{};const L=[];for(const [k,xs] of Object.entries(m))for(const x of xs)L.push({k,...x});
    return {lines:L.sort((a,z)=>z.p-a.p||a.k.localeCompare(z.k)),inb:M.inb.get(D.id)||{},outb:M.outb.get(D.id)||{},def:this.deficits(M,D)};},
  setNeed(b,k,n){b.need??={};if(!(n>0))delete b.need[k];else b.need[k]=Math.round(n);},
  // les goulots : des dépôts pleins où une mine, une ferme, une usine s'arrête faute de place — il manque du fret
  jams(f){const L=[];for(const D of this.s.buildings){if(D.f!==f||!this.isDepot(D))continue;const B=BUILDINGS[D.k];const fill=this.stored(D)/B.store;if(fill<.95)continue;
      const stuck=this.s.buildings.filter(b=>b.f===f&&b.done&&b.out===D.id&&b.why?.includes('plein'));if(stuck.length)L.push({D,fill,stuck});}return L;},
  setWant(D,k,n){D.want??={};if(!(n>0))delete D.want[k];else D.want[k]=Math.round(n);},
  setPrio(D,p){D.prio=Math.max(1,Math.min(5,Math.round(p)));},

  // ---------- le réseau ferré : des morceaux de voie d'un seul tenant ----------
  railNets(){if(this._rn&&!this._rnDirty)return this._rn;const N=this.N,c=new Int32Array(N*N).fill(-1);let id=0;
    for(let k0=0;k0<N*N;k0++){if(this.rail[k0]!==2||c[k0]>=0)continue;const q=[k0];c[k0]=id;
      while(q.length){const k=q.pop();const i=k%N,j=(k/N)|0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(this.rail[kk]===2&&c[kk]<0){c[kk]=id;q.push(kk);}}}
      id++;}this._rn=c;this._rnDirty=false;return c;},
  netOf(D){const p=this.platform(D);if(!p)return null;const c=this.railNets()[p[1]*this.N+p[0]];return c>=0?c:null;},
  netAt(x,y){const i=Math.floor(x),j=Math.floor(y);if(i<0||j<0||i>=this.N||j>=this.N)return null;const c=this.railNets()[j*this.N+i];return c>=0?c:null;},
  tender(){return FRET.TENDER*this.mod('tender');},

  // ---------- le bureau du fret ----------
  // qui un véhicule peut servir : une gare du même réseau ; pour un porteur, un dépôt à sa portée sur la même terre
  serves(v,D){const B=BUILDINGS[D.k];if(!D.done||D.f!==v.f||(v.ban?.[D.id]||0)>this.s.t)return false;
    if(v.k==='train'){if(!B.station)return false;const n=this.netOf(D);return n!=null&&n===this.netAt(v.x,v.y);}
    if(v.k==='porteur'||v.k==='charrette'){if(!B.store)return false;const base=this.building(v.base)||this.building(v.home);const [x,y]=base?this.bc(base):[v.x,v.y];
      if(this.distB(D,x,y)>(v.range||VEHICLES.porteur.range))return false;const comp=this.G.comp;return comp[D.j*this.N+D.i]===comp[Math.floor(v.y)*this.N+Math.floor(v.x)];}
    return false;},
  carries(v,k){return !v.only?.length||v.only.includes(familyOf(k));},
  // Choisir le prochain voyage : d'abord livrer ce qu'on a à bord ; sinon le manque le plus prioritaire qu'on puisse couvrir,
  // pris au dépôt le plus commode (le détour pour y aller, plus le trajet jusqu'au manque) ; on complète le chargement avec
  // les autres manques du même dépôt que la même source peut couvrir.
  // Le trop-plein : un petit dépôt rempli à plus de EVAC_HI vide ce qui dépasse ses propres demandes vers le grand dépôt
  // (centre-ville, entrepôt) le plus proche qui a de la place, jusqu'à redescendre à EVAC_LO. Le fret s'en charge quand il
  // n'a rien de plus pressé : sans cela, une mine, une ferme, un camp s'arrêtent, leur dépôt plein.
  pushes(M,v){const out=[];const big=M.deps.filter(H=>BUILDINGS[H.k].big&&this.serves(v,H)&&this.room(H)>BUILDINGS[H.k].store*.15);if(!big.length)return out;
    for(const S of M.deps){const B=BUILDINGS[S.k];if(B.big||S.evac===false||!this.serves(v,S))continue;const used=this.stored(S);if(used<B.store*FRET.EVAC_HI)continue;
      const [x,y]=this.bc(S);const H=big.filter(h=>h!==S).sort((a,z)=>this.distB(a,x,y)-this.distB(z,x,y))[0];if(!H)continue;let over=used-B.store*FRET.EVAC_LO;
      for(const [k,n0] of Object.entries(S.stock).sort((a,z)=>z[1]-a[1])){if(over<=0)break;const n=Math.min(this.avail(M,S,k,1),over);if(n>=1){out.push({S,D:H,k,n});over-=n;}}}
    return out;},
  pickJob(v){const M=this.market(v.f);const cap=this.capOf(v);const deps=M.deps.filter(D=>this.serves(v,D));if(deps.length<1)return null;
    let items=[];for(const D of deps)for(const it of this.deficits(M,D))if(this.carries(v,it.k))items.push(it);
    items.sort((a,z)=>z.p-a.p||z.n/z.of-a.n/a.of);
    if(this.cargoW(v)>.01){const goods=Object.keys(v.cargo);let best=null,bs=1e9;
      for(const it of items)if(goods.includes(it.k)&&this.room(it.D)>=1){const [x,y]=this.bc(it.D);const sc=d2(v.x,v.y,x,y)-it.p*40;if(sc<bs){bs=sc;best=it.D;}}
      if(!best)best=deps.filter(D=>D.id!==v.at&&this.room(D)>=Math.min(this.cargoW(v),20)).sort((a,z)=>(BUILDINGS[z.k].big?1:0)-(BUILDINGS[a.k].big?1:0)||this.distB(a,v.x,v.y)-this.distB(z,v.x,v.y))[0];
      if(!best){v.why='aucun dépôt n’a de place pour son chargement';return null;}
      return {from:null,to:best.id,q:{},phase:'dst',p:0,t:this.s.t};}
    const w=k=>weightOf(k,this.s.designs,this.s.armors);
    for(const it of items){let best=null,bs=1e9;const [dx,dy]=this.bc(it.D);
      for(const S of deps){if(S===it.D)continue;const a=this.avail(M,S,it.k,it.p);if(a<Math.min(it.n,1)-1e-6)continue;const [sx,sy]=this.bc(S);const sc=d2(v.x,v.y,sx,sy)+d2(sx,sy,dx,dy);if(sc<bs){bs=sc;best=S;}}
      if(!best)continue;const q={};let room=cap;
      const take=(k,n,p)=>{const a=this.avail(M,best,k,p)-(q[k]||0);let m=Math.min(n,a,room/w(k));if(whole(k))m=Math.floor(m);else m=Math.floor(m*100)/100;if(m>0){q[k]=(q[k]||0)+m;room-=m*w(k);}};
      take(it.k,it.n,it.p);for(const o of items)if(o!==it&&o.D===it.D&&room>.5)take(o.k,o.n,o.p);
      if(!Object.keys(q).length)continue;return {from:best.id,to:it.D.id,q,phase:'src',p:it.p,t:this.s.t};}
    // rien ne manque qu'il puisse servir : vider un dépôt trop plein
    const P=this.pushes(M,v);if(P.length){const p0=P.sort((a,z)=>d2(v.x,v.y,...this.bc(a.S))-d2(v.x,v.y,...this.bc(z.S)))[0];const q={};let room=cap;
      for(const p of P)if(p.S===p0.S&&p.D===p0.D&&room>.5){let m=Math.min(p.n,room/w(p.k));m=whole(p.k)?Math.floor(m):Math.floor(m*100)/100;if(m>0){q[p.k]=m;room-=m*w(p.k);}}
      if(Object.keys(q).length)return {from:p0.S.id,to:p0.D.id,q,phase:'src',p:0,t:this.s.t,evac:true};}
    return null;},
  ban(v,D,h=6){(v.ban??={})[D.id]=this.s.t+h;},
  fretTick(v,dt){
    if(v.state==='wait'){v.wait-=dt;if(v.wait>0)return;v.state='idle';}
    let J=v.job;
    if(!J){v.look=(v.look||0)-dt;if(v.look>0){v.state='idle';return;}v.look=FRET.LOOK;J=v.job=this.pickJob(v);
      if(!J){v.state='idle';v.why=this.s.buildings.some(D=>this.serves(v,D))?null:v.k==='train'?'aucune gare sur son réseau':'aucun dépôt à portée';return;}v.why=null;v.state='go';}
    const S=J.from!=null?this.building(J.from):null,D=this.building(J.to);
    if(!D||!D.done){v.job=null;return;}
    // un voyage qui n'aboutit pas en douze heures est abandonné
    if(this.s.t-J.t>12){if(S)this.ban(v,S,3);this.ban(v,D,3);v.job=null;v.why='voyage abandonné : trop long';return;}
    if(J.phase==='src'){if(!S||!S.done){v.job=null;return;}
      const r=this.moveTo(v,S,dt);if(r==='blocked'){this.ban(v,S);v.job=null;return;}if(r!==true)return;
      const cap=this.capOf(v);let got=0;for(const [k,n] of Object.entries(J.q)){const w=weightOf(k,this.s.designs,this.s.armors);let q=Math.min(n,S.stock[k]||0,(cap-this.cargoW(v))/w);if(whole(k))q=Math.floor(q);
        if(q>1e-6){S.stock[k]-=q;v.cargo[k]=(v.cargo[k]||0)+q;got+=q;}}
      J.phase='dst';J.t=this.s.t;v.state='wait';v.wait=v.k==='train'?1:.5;this.emit({type:'stop',kind:v.k,x:v.x,y:v.y});if(got<=0)v.job=null;return;}
    const r=this.moveTo(v,D,dt);if(r==='blocked'){this.ban(v,D);v.job=null;return;}if(r!==true)return;
    const w0=this.cargoW(v);this.unloadCargo(v,D);const moved=w0-this.cargoW(v);if(moved>.01){this.practice('logistique',1);v.trips=(v.trips||0)+1;v.moved=(v.moved||0)+moved;}v.job=null;v.state='wait';v.wait=v.k==='train'?1:.5;this.emit({type:'stop',kind:v.k,x:v.x,y:v.y});},
  setMode(v,mode){if(v.k==='bombardier')return {ok:false,why:['un bombardier ne fait pas de fret']};v.mode=mode==='ligne'?'ligne':'fret';v.job=null;v.state='idle';v.path=null;v.why=null;
    return {ok:true,text:`${v.name} : ${v.mode==='fret'?'à la demande du bureau du fret':'sur sa ligne'}`};},
  toggleFamily(v,fam){v.only??=[];const i=v.only.indexOf(fam);if(i>=0)v.only.splice(i,1);else v.only.push(fam);v.job=v.job?.phase==='src'?null:v.job;},
  jobText(v){const J=v.job;if(!J)return v.state==='wait'?'charge, décharge':'attend une commande';const S=J.from!=null&&this.building(J.from),D=this.building(J.to);
    const what=Object.entries(J.phase==='src'?J.q:v.cargo).filter(([,n])=>n>=.05).map(([k,n])=>`${+n.toFixed(1)} ${this.goodName(k).toLowerCase()}`).join(', ');
    if(J.evac)return J.phase==='src'?`va vider le trop-plein de ${this.depotName(S)} (${what})`:`porte le trop-plein à ${this.depotName(D)} (${what})`;
    return J.phase==='src'?`va charger ${what} à ${this.depotName(S)}, pour ${this.depotName(D)}`:`livre ${what||'son chargement'} à ${this.depotName(D)}`;},
};
