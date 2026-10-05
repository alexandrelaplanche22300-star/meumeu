// Oberkommando der Meumeu — la gestion. Tout ce qui fait tourner l'arrière :
//  · les usines : une seule production chacune, choisie ; elles prennent leurs matières à un dépôt d'approvisionnement,
//    livrent à un dépôt de sortie (à moins de RADIUS cases, les porteurs y vont à pied), et leurs machines brûlent du charbon ;
//  · les dépôts : polyvalents. Chacun a une priorité (1 à 5) et des demandes : celles que le joueur y règle, celles des usines
//    qui s'y approvisionnent, celles des chantiers voisins, des voies tracées, des locomotives à court de charbon ;
//  · le bureau du fret : chaque train, chaque porteur « à la demande » prend le manque le plus prioritaire qu'il peut servir,
//    va le chercher au dépôt qui en a de trop le plus commode, et le livre. Un dépôt garde ce qu'il demande lui-même ;
//    seule une demande de priorité plus haute peut le lui prendre.
// Tout ici vaut pour les deux camps : l'état-major bèè s'en servira comme nous. Les méthodes sont posées sur World.
import {BUILDINGS,PRODUCTS,VEHICLES,RADIUS,RES,FRET,LIMIT_OF,familyOf,BEEE,madeAt} from './data.js';
import {crateCost,weaponCost,weightOf} from './designs.js';
import {derive} from './ballistics.js';
import {deriveArmor} from './armor.js';

const d2=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const inc=(map,id,k,n)=>{let m=map.get(id);if(!m)map.set(id,m={});m[k]=(m[k]||0)+n;};
const get=(map,id,k)=>map.get(id)?.[k]||0;
const whole=k=>k.startsWith('a:')||k.startsWith('p:');
const BAL_GOODS=['bois','pierre','charbon','pieces','fer','cuivre','plomb','salpetre','poudre','explosifs','sante'];

export const ECO={
  // ---------- les rattachements ----------
  bc(b){const [w,h]=this.sizeOf(b);return [b.i+w/2,b.j+h/2];},
  // les dépôts à portée d'un bâtiment, du plus proche au plus lointain
  reach(b,r=RADIUS){const [x,y]=this.bc(b);return this.s.buildings.filter(d=>d!==b&&d.f===b.f&&this.isDepot(d)&&this.distB(d,x,y)<=r).sort((a,z)=>this.distB(a,x,y)-this.distB(z,x,y));},
  linkOk(b,id){if(id==null)return false;const d=this.building(id);if(!d||d===b||d.f!==b.f||!this.isDepot(d))return false;const [x,y]=this.bc(b);return this.distB(d,x,y)<=RADIUS;},
  takesIn(b){const B=BUILDINGS[b.k];return !!(B.factory||B.pen||(B.stock0&&!B.store));},
  givesOut(b){const B=BUILDINGS[b.k];return !!(B.factory||B.makes||B.pen||b.k==='mine');},
  // un rattachement perdu (dépôt détruit, trop loin) retombe sur le dépôt le plus proche
  // Les vivres d'un moulin (ou d'une ferme bèè) vont là où la ville mange : le centre-ville ; à défaut un grenier.
  // Tant que le joueur n'a pas choisi lui-même un rattachement, il suit cette règle.
  autoLink(b){const food=['ferme','moulin'].includes(b.k);let reach=null;const R=()=>reach??=this.reach(b);
    const near=()=>R().find(d=>d.k!=='grenier'||food)?.id??null;let moved=false;
    const pref=which=>{
      // jamais un camp de récolte
      if(which==='out'&&food)return R().find(d=>d.k==='centre')?.id??R().find(d=>d.k==='grenier')?.id??R().find(d=>!BUILDINGS[d.k].hub)?.id??null;
      return null;};
    for(const which of ['sup','out']){if(which==='sup'?!this.takesIn(b):!this.givesOut(b))continue;const cur=b[which];
      if(!this.linkOk(b,cur)){const p=food?pref(which):null;b[which]=p??near();b['auto_'+which]=true;moved=moved||(cur!=null&&cur!==b[which]);}
      else if(food&&b['auto_'+which]!==false){const p=pref(which);if(p!=null&&p!==cur)b[which]=p;}}
    if(moved&&b.f==='meumeu')this.log(this.cityName(b),`${BUILDINGS[b.k].name} : son dépôt a disparu, rattaché d’office au plus proche.`,'warn');},
  setLink(b,which,id){if(!b||!['sup','out'].includes(which))return {ok:false,why:['rien à rattacher']};
    if(which==='sup'&&!this.takesIn(b)||which==='out'&&!this.givesOut(b))return {ok:false,why:['ce bâtiment ne prend ni ne livre rien']};
    if(!this.linkOk(b,id))return {ok:false,why:[`un dépôt à nous, bâti, à moins de ${RADIUS} cases`]};
    if(this.building(id).k==='grenier'&&!['ferme','moulin'].includes(b.k))return {ok:false,why:['le grenier accepte seulement les denrées']};
    b[which]=id;b['auto_'+which]=false;const d=this.building(id);return {ok:true,text:`${BUILDINGS[b.k].name} : ${which==='sup'?'s’approvisionne à':'livre à'} ${this.depotName(d)}`};},
  depotName(d){if(!d)return '—';return `${BUILDINGS[d.k].name.toLowerCase()}${d.no>1?` n°${d.no}`:''} de ${this.cityName(d)}`;},
  // ce qui est rattaché à un dépôt : les usines qui y prennent, celles (et les mines, les fermes) qui y livrent, les chantiers
  linkedTo(d){const o={sup:[],out:[],site:[]};for(const b of this.s.buildings){if(b.f!==d.f)continue;if(b.sup===d.id&&this.takesIn(b))o.sup.push(b);if(b.out===d.id&&this.givesOut(b))o.out.push(b);if(b.site===d.id&&!b.done&&!b.ruin)o.site.push(b);}return o;},

  // ---------- les usines ----------
  productsOf(b){const B=BUILDINGS[b.k];if(!B.factory)return [];const L=Object.keys(PRODUCTS).filter(k=>madeAt(k,b.k));
    if(B.arsenal)L.unshift(...[...this.designsOf(b.f),...this.designsOf(b.f,'engin')].map(d=>'m:'+d.id));
    if(B.manufacture)L.push(...this.designsOf(b.f).map(d=>'a:'+d.id),...this.armorsOf(b.f).map(a=>'p:'+a.id));
    return L;},
  productName(k){if(!k)return 'rien';return PRODUCTS[k]?.name||this.goodName(k);},
  // un lot : ce qu'il prend, ce qu'il donne, ses heures de travail ; tool : l'outillage à faire d'abord
  recipe(b,key){const P=PRODUCTS[key];
    if(P){const r={key,in:{...P.in},out:{...P.out},hours:P.hours};if(key==='carburant')r.in.bois=+(r.in.bois*this.mod('carburant_bois')).toFixed(2);return r;}
    if(key.startsWith('m:')){const d=this.design(key.slice(2));if(!d||(d.status!=='adopte'&&d.status!=='engin'))return null;const c=crateCost(d.p);for(const k of ['fer','plomb','cuivre'])if(c[k])c[k]=+(c[k]*this.mod('fer_munitions')).toFixed(2);
      // les Bèè, à court de plomb ou de cuivre, font des balles à noyau de fer et des douilles d'acier laqué (moins bonnes, mais elles tirent)
      // la production de masse bèè : des cartouches chargées au plus juste (40 % de poudre en moins)
      if(b.f==='beee'&&c.poudre)c.poudre=+(c.poudre*.6).toFixed(3);
      if(b.f==='beee'){const H=this.have('beee',b.i+1,b.j+1);if(c.plomb&&(H.plomb||0)<c.plomb*3){c.fer=+((c.fer||0)+c.plomb*1.3).toFixed(2);delete c.plomb;}if(c.cuivre&&(H.cuivre||0)<c.cuivre*3){c.fer=+((c.fer||0)+c.cuivre*1.1).toFixed(2);delete c.cuivre;}}
      return {key,in:c,out:{[key]:1},hours:1.2};}
    if(key.startsWith('a:')){const d=this.design(key.slice(2));if(!d||d.status!=='adopte')return null;if(!b.tooled?.[d.id])return {key,tool:d.id,in:{pieces:4,fer:1},out:{},hours:6};
      // le fusil bèè, fabriqué en masse : 40 % moins cher
      const wc=weaponCost(d.p);if(b.f==='beee')for(const k in wc)wc[k]=+(wc[k]*.6).toFixed(2);return {key,in:wc,out:{[key]:1},hours:derive(d.p).hoursW/2*(b.f==='beee'?.7:1)};}
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
    if(!b.prod){b.why='aucune production choisie';return;}if(b.halt){b.why='arrêtée';return;}if(b.sabUntil>this.s.t){b.why='saboté : réparations en cours';return;}
    const sup=this.building(b.sup);let out=this.building(b.out);
    // le dépôt de sortie plein : on livre au dépôt voisin qui a de la place
    if(out&&this.room(out)<5){const [x,y]=this.bc(b);const alt=this.depots(b.f,x,y,RADIUS).find(d=>d!==out&&this.room(d)>=5&&!BUILDINGS[d.k].foodOnly);if(alt)out=alt;}
    if(!sup){b.why=`aucun dépôt d’approvisionnement à moins de ${RADIUS} cases`;return;}if(!out){b.why=`aucun dépôt de sortie à moins de ${RADIUS} cases`;return;}
    // un lot fini qui n'a pas pu sortir : on réessaie
    if(b.batch&&b.batch.done>=b.batch.hours){this.factoryDeliver(b,out);return;}
    if(!b.batch){const R=this.recipe(b,b.prod);if(!R){b.why='la conception est perdue';return;}
      if(!R.tool&&b.limit>0&&(out.stock[b.prod]||0)>=b.limit){b.why=`plafond atteint : ${b.limit} au dépôt de sortie`;b.full=true;return;}b.full=false;
      // ce qui manque au dépôt d'approvisionnement, les ouvriers vont le prendre dans un dépôt voisin (à moins de 14 cases), à pied
      const [fx,fy]=this.bc(b);const near=this.have(b.f,fx,fy,RADIUS);const miss=Object.entries(R.in).filter(([k,v])=>(sup.stock[k]||0)<v-1e-6&&(near[k]||0)<v-1e-6);
      if(miss.length){b.why=`attend au dépôt d’approvisionnement : ${miss.map(([k,v])=>`${+(v-(sup.stock[k]||0)).toFixed(1)} ${this.goodName(k).toLowerCase()}`).join(', ')}`;return;}
      for(const [k,v] of Object.entries(R.in)){const q=Math.min(v,Math.max(0,sup.stock[k]||0));sup.stock[k]=(sup.stock[k]||0)-q;if(v-q>1e-9)this.take(b.f,fx,fy,k,v-q,RADIUS);}b.batch={...R,out:{...R.out},done:0};}
    const c=this.coalRate(b)*n*dt;if(c>0){if((sup.stock.charbon||0)<c){const [fx,fy]=this.bc(b);if(this.take(b.f,fx,fy,'charbon',c,RADIUS)<c-1e-9){b.why='machines froides : plus de charbon au dépôt d’approvisionnement ni à côté';b.cold=true;return;}}else sup.stock.charbon-=c;}b.cold=false;
    b.batch.done+=n*dt*this.mod(B.factory.mod);b.why=null;b.working=true;this.practice(b.k==='poudrerie'||b.k==='labo'?'chimie':B.factory.mod==='soins'?'soins':B.factory.mod==='armement'?'armement':B.factory.mod==='briques'?'construction':'atelier',dt*n);
    if(b.batch.done>=b.batch.hours)this.factoryDeliver(b,out);},
  factoryDeliver(b,out){const bt=b.batch;
    if(bt.tool){b.tooled??={};b.tooled[bt.tool]=true;b.batch=null;this.log(this.cityName(b),`${BUILDINGS[b.k].name} outillée pour ${this.design(bt.tool)?.name||'?'}.`,'good');return;}
    for(const [k,v] of Object.entries(bt.out)){const q=this.put(out,k,v);bt.out[k]-=q;if(bt.out[k]<=1e-6)delete bt.out[k];}
    if(Object.keys(bt.out).length){b.why=`le dépôt de sortie est plein (${this.depotName(out)})`;return;}
    b.batch=null;b.made=(b.made||0)+1;},

  // ---------- les chantiers : ils se paient à mesure que les matériaux arrivent ----------
  siteCost(b){if(b.ruin)return {};const c=BUILDINGS[b.k]?.cost||{};
    if(b.f==='beee'&&b.colony&&b.k==='centre'&&BEEE.colonyCost<1){const o={};for(const [k,v] of Object.entries(c))o[k]=Math.max(1,Math.round(v*BEEE.colonyCost));return o;}
    return c;},
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
    for(const D of deps){const p=D.prio??3;for(const [k,n] of Object.entries(D.want||{}))add(D,k,n,p,'want',null);
      if(D.k==='centre'){const rate=this.cityFoodRate(D),bee=D.f==='beee';const reserve=rate*(bee?30:48);const low=(D.stock.vivres||0)<rate*12;
        // les Bèè : trente heures de réserve, pressantes seulement sous douze (moins de vivres promenés d'une ville à l'autre)
        add(D,'vivres',Math.max(0,reserve-(D.want?.vivres||0)),bee&&!low?2:Math.max(4,p),'rations',D.id);}}
    // L'équilibrage automatique : les biens de base se répartissent d'eux-mêmes entre les dépôts, au prorata de leur taille
    // (un dépôt prioritaire en veut une part et demie, et passe devant). Les camps de récolte donnent, ne reçoivent pas.
    // (les Bèè n'équilibrent pas : leur intendance commande ce qu'il faut, où il le faut — leurs porteurs ne courent pas après la moyenne)
    const recv=f==='beee'?[]:deps.filter(D=>{const B=BUILDINGS[D.k];return !B.foodOnly&&!B.tent&&!B.hub&&D.balance!==false;});
    if(recv.length>1){const keys=new Set(BAL_GOODS);for(const D of deps)for(const k of Object.keys(D.stock))if(k.startsWith('m:'))keys.add(k);
      const wt=D=>BUILDINGS[D.k].store*((D.prio??3)>=5?1.5:1);const cap=recv.reduce((a,D)=>a+wt(D),0);
      for(const k of keys){let tot=0;for(const D of deps)tot+=Math.max(0,D.stock[k]||0);if(tot<6)continue;
        for(const D of recv){const tgt=Math.min(tot*wt(D)/cap,BUILDINGS[D.k].store*.2);const have=D.stock[k]||0;if(have<tgt*.6)add(D,k,tgt-have,(D.prio??3)>=5?4:1,'equilibre',null);}}}
    for(const b of this.s.buildings){if(b.f!==f)continue;
      if(b.done&&BUILDINGS[b.k].factory){const need=this.factoryNeed(b);const D=need&&this.building(b.sup);if(D&&this.isDepot(D))for(const [k,n] of Object.entries(need))add(D,k,n,D.prio??3,'usine',b.id);}
      if(b.done&&b.need&&Object.keys(b.need).length){this.autoLink(b);const D=this.building(b.sup);if(D&&this.isDepot(D))for(const [k,n] of Object.entries(b.need))add(D,k,n,D.prio??3,'reserve',b.id);}
      if(!b.done&&!b.ruin&&b.site!=null){const D=this.building(b.site);if(D&&this.isDepot(D))for(const [k,n0] of Object.entries(this.siteRemaining(b))){const n=n0-this.enRoute(b,k);if(n>1e-6)add(D,k,n,D.prio??3,'chantier',b.id);}}}
    // Une gare doit pouvoir servir de relais entre une mine isolée et une
    // manufacture. Le besoin faible collecte au départ ; le besoin plus haut
    // attire un train à l'arrivée. Les usines proches ont encore priorité pour
    // retirer la marchandise de la gare par porteur.
    if(f==='beee'){
      const keys=['vivres','fer','pieces','bois','pierre','charbon','salpetre','plomb','cuivre','poudre','explosifs','a:bee_fusil','m:bee_fusil'];
      const stations=deps.filter(D=>D.done&&BUILDINGS[D.k].station&&this.netOf(D)!=null);
      for(const G of stations){const [gx,gy]=this.bc(G);const local=deps.filter(D=>D!==G&&D.done&&this.distB(D,gx,gy)<=VEHICLES.porteur.range);
        for(const k of keys){const supply=local.reduce((n,D)=>n+Math.max(0,D.stock[k]||0),0);
          const needed=local.reduce((n,D)=>n+(M.dem.get(D.id)?.[k]||[]).filter(x=>x.src==='usine'||x.src==='chantier'||x.src==='reserve'||x.src==='rations'||x.src==='want').reduce((a,x)=>a+x.n,0),0);
          const short=Math.max(0,needed-local.reduce((n,D)=>n+Math.max(0,D.stock[k]||0),0));
          if(short>1)add(G,k,Math.min(60,Math.max(12,short*2)),2,'relais',null);
          else if(supply>12)add(G,k,Math.min(60,Math.max(12,supply*.12)),1,'collecte',null);
        }}
    }
    // Les munitions du front : le dépôt le plus proche d'un soldat (un camp-dépôt avancé aussi) réclame de quoi remplir sa
    // cartouchière une fois ; le fret l'y amène avant le reste. Le porteur de munitions de l'escouade s'y recharge.
    if(f==='meumeu'){const need=new Map();for(const u of this.s.units){if(u.f!==f||!u.w||!(u.hp>0)||u.h?.state==='mort')continue;const W=this.W(u.w);if(!(W?.perCrate>0))continue;
        let best=null,bd=RADIUS;for(const D of deps){const B=BUILDINGS[D.k];if(B.foodOnly||B.tent)continue;const d=this.distB(D,u.x,u.y);if(d<bd){bd=d;best=D;}}if(!best)continue;
        const m=need.get(best)||{};const k='m:'+u.w;m[k]=(m[k]||0)+W.carry/W.perCrate+(u.role==='munitions'?2:0);need.set(best,m);}
      for(const [D,m] of need)for(const [k,n] of Object.entries(m))add(D,k,Math.min(60,Math.ceil(n)),Math.max(4,D.prio??3),'front',null);}
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
      scan(this.s.walls,'mur',o=>o.f===f);}
    (this._lineDem??={})[f]={t:this.s.t,d};return d;},
  // Les manques d'un dépôt, par priorité : son stock et ce qui arrive couvrent d'abord les demandes les plus hautes.
  // On ne demande pas plus que la place qui reste : un dépôt plein n'attire plus de convoi (il se vide d'abord).
  deficits(M,D){const m=M.dem.get(D.id);if(!m)return [];const out=[];let free=this.room(D);for(const [k,n] of Object.entries(M.inb.get(D.id)||{}))free-=n*this.w1(k);
    for(const [k,L] of Object.entries(m)){if(BUILDINGS[D.k].foodOnly&&k!=='vivres')continue;let cover=(D.stock[k]||0)+get(M.inb,D.id,k);const byP=new Map();for(const x of L)byP.set(x.p,(byP.get(x.p)||0)+x.n);
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
  setWant(D,k,n){D.want??={};if(!(n>0)||BUILDINGS[D.k].foodOnly&&k!=='vivres')delete D.want[k];else D.want[k]=Math.round(n);},
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
  serves(v,D){const B=BUILDINGS[D.k];if(!this.isDepot(D)||D.f!==v.f||(v.ban?.[D.id]||0)>this.s.t)return false;
    if(v.k==='train'){if(!B.station)return false;const n=this.netOf(D);return n!=null&&n===this.netAt(v.x,v.y);}
    if(v.k==='porteur'||v.k==='charrette'){if(!B.store)return false;const base=this.building(v.base)||this.building(v.home);const [x,y]=base?this.bc(base):[v.x,v.y];
      if(this.distB(D,x,y)>Math.max(v.range||0,VEHICLES[v.k]?.range||VEHICLES.porteur.range))return false;const comp=this.G.comp;return comp[D.j*this.N+D.i]===comp[Math.floor(v.y)*this.N+Math.floor(v.x)];}
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
  // le marché d'un camp, gardé un instant pour tous les convois qui cherchent un travail (chaque voyage attribué y est inscrit aussitôt)
  marketC(f){const c=(this._mk??={})[f];if(c&&this.s.t-c.t<.1&&c.t<=this.s.t)return c.M;const M=this.market(f);this._mk[f]={t:this.s.t,M};return M;},
  pickJob(v){const J=this.pickJob0(v);if(J&&J.q){const M=this._mk?.[v.f]?.M;if(M)for(const [k,n] of Object.entries(J.q)){inc(M.inb,J.to,k,n);if(J.from!=null)inc(M.outb,J.from,k,n);}}return J;},
  pickJob0(v){const M=this.marketC(v.f);const cap=this.capOf(v);const deps=M.deps.filter(D=>this.serves(v,D));if(deps.length<1)return null;
    let items=[];for(const D of deps)for(const it of this.deficits(M,D))if(this.carries(v,it.k))items.push(it);
    items.sort((a,z)=>z.p-a.p||z.n/z.of-a.n/a.of);
    if(this.cargoW(v)>.01){const goods=Object.keys(v.cargo);let best=null,bs=1e9;
      for(const it of items)if(goods.includes(it.k)&&this.room(it.D)>=1){const [x,y]=this.bc(it.D);const sc=d2(v.x,v.y,x,y)-it.p*40;if(sc<bs){bs=sc;best=it.D;}}
      if(!best)best=deps.filter(D=>D.id!==v.at&&this.room(D)>=Math.min(this.cargoW(v),20)&&(!BUILDINGS[D.k].foodOnly||goods.every(k=>k==='vivres'))).sort((a,z)=>(BUILDINGS[z.k].big?1:0)-(BUILDINGS[a.k].big?1:0)||this.distB(a,v.x,v.y)-this.distB(z,v.x,v.y))[0];
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
    if(!D||!this.isDepot(D)){v.job=null;return;}
    // Le délai suit la distance réelle : une locomotive ou un porteur ne doit
    // pas abandonner un trajet valide simplement parce que la carte est grande.
    const goal=J.phase==='src'?S:D;const speed=Math.max(1,VEHICLES[v.k]?.speed||1);
    const maxTrip=Math.max(12,4+(goal?this.distB(goal,v.x,v.y):0)/speed*2.2);
    if(this.s.t-J.t>maxTrip){if(S)this.ban(v,S,3);this.ban(v,D,3);v.job=null;v.why='voyage abandonné : trop long';return;}
    if(J.phase==='src'){if(!S||!this.isDepot(S)){v.job=null;return;}
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

  // ---------- l'équipement d'un soldat, pris (ou rendu) au dépôt tout proche ----------
  // jumelles : la vue porte à 44 cases de jour (u.jum) ; jumelles IR : de plus 22 cases de nuit dans le faisceau (u.bino, 8 h de
  // batterie) ; tenue camouflée : moins visible ; charge de démolition : une demi-caisse d'explosifs, quatre au plus par homme.
  // Avec des charges, c'est ce qui fait un commando.
  gearOf(u){const L=[];if(u.bino)L.push('jumelles_ir');else if(u.jum)L.push('jumelles');if(u.camoSuit)L.push('tenue_camo');return L;},
  isCommando(u){return !!(u&&((u.charges||0)>0||u.camoSuit||u.jum||u.bino||u.k==='commando'));},
  gearDepot(u){return this.depots(u.f,u.x,u.y,6).find(D=>!BUILDINGS[D.k].foodOnly)||null;},
  equip(u,k,on=true){if(!u||!u.w)return {ok:false,why:['seul un soldat armé s’équipe']};if(!['jumelles','jumelles_ir','tenue_camo','charge'].includes(k))return {ok:false,why:['équipement inconnu']};
    const D=this.gearDepot(u);if(!D)return {ok:false,why:['il faut être à moins de 6 cases d’un dépôt (ou sortir de la caserne équipé)']};
    if(k==='charge'){const n=u.charges||0;if(on){if(n>=4)return {ok:false,why:['quatre charges au plus par homme']};if((D.stock.explosifs||0)<.5)return {ok:false,why:[`pas assez d’explosifs au ${this.depotName(D)} (une charge : une demi-caisse ; la poudrerie en fabrique)`]};
        D.stock.explosifs-=.5;u.charges=n+1;return {ok:true,text:`${u.name||'Le soldat'} : ${n+1} charge${n+1>1?'s':''} de démolition`};}
      if(n<=0)return {ok:true,text:'rien à rendre'};this.put(D,'explosifs',.5);u.charges=n-1;return {ok:true,text:`une charge rendue au ${this.depotName(D)}`};}
    const has=k==='tenue_camo'?!!u.camoSuit:k==='jumelles_ir'?!!u.bino:!!u.jum&&!u.bino;
    if(on){if(has)return {ok:true,text:'déjà équipé'};if((D.stock[k]||0)<1)return {ok:false,why:[`${this.goodName(k)} : aucune en stock au ${this.depotName(D)} (l’atelier en fabrique)`]};
      // des jumelles remplacent les autres (les anciennes retournent au dépôt)
      if(k!=='tenue_camo'&&(u.jum||u.bino))this.equip(u,u.bino?'jumelles_ir':'jumelles',false);
      D.stock[k]-=1;if(k==='tenue_camo')u.camoSuit=true;else if(k==='jumelles')u.jum=44;else{u.jum=44;u.bino=60;u.irLeft=80;}
      return {ok:true,text:`${u.name||'Le soldat'} : ${this.goodName(k).toLowerCase()} — ${this.isCommando(u)?'équipé en commando':'équipé'}`};}
    if(!has)return {ok:true,text:'rien à rendre'};this.put(D,k,1);if(k==='tenue_camo')u.camoSuit=false;else{u.jum=0;u.bino=0;u.irLeft=0;u.irMax=0;}
    return {ok:true,text:`${this.goodName(k)} rendu${k==='tenue_camo'?'e':'es'} au ${this.depotName(D)}`};},
};
