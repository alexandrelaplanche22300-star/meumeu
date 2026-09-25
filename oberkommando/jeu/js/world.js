// Oberkommando der Meumeu — la simulation. Deux horloges : l'heure de jeu (production, chantiers, trains, jours) et la seconde de combat
// (cadences de tir, vol des balles, hémorragies). Une heure de jeu dure HOUR_REAL secondes à 1× : c'est aussi le nombre de
// secondes de combat qu'elle contient. Les positions sont en cases (x = i, y = j) ; une case vaut TILE_M mètres pour la balistique.
// Deux civilisations sur la même carte. Tout est un objet placé ; les stocks sont dans les dépôts, les munitions en caisses.
import {SITE_RANGE,HOUR_REAL,DAY,NIGHT,MAP_N,RADIUS,CARRY,GAP,TERRAIN,T,RES,RARE,NODES,BUILDINGS,LINES,UNITS,BLASTS,VEHICLES,PRODUCTS,LIMIT_OF,FRET,BOMB,FLAK,FIRE,BEEE,START,GOAL,NAMES,CITY_NAMES,BEEE_CITIES,VEHICLE_NAMES,INNOV,DOMAINS} from './data.js';
import {ECO} from './eco.js';
import {generate,rng} from './gen.js';
import {Pather} from './path.js';
import {derive,wound,TILE_M,CRATE_KG,CONSTRUCTIONS,ACTIONS} from './ballistics.js';
import {regionAt,AIM,SILH,BODY_H,BLOOD,setSpecies} from './body.js';
import {newHealth,applyWound,tickHealth,malus,firstAid,doctorCare,heal,needsCare,needsDoctor,needsSurgery,bleedRate,triage,MED} from './health.js';
import {DEFAULT_DESIGNS,weightOf,crateCost,weaponCost,protoCost,PROTO_HOURS,fragDesign} from './designs.js';
import {DEFAULT_ARMORS,deriveArmor,plateZone,armorHit} from './armor.js';

export const SAVE_VERSION=7;
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
const d2=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const ENEMY={meumeu:'beee',beee:'meumeu'};
const UDEF=(u)=>u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];
export const alive=u=>u&&u.hp>0;
export const active=u=>alive(u)&&!(u.h&&u.h.state==='hors');
const POST={debout:1.4,accroupi:1,couche:.7};
const DOM_OF={tree:'bois',rock:'pierre',bush:'vivres',ore:'mine'};
const SACK={hp:25,fire:.3};   // saccager au contact : points retirés par heure et par Meumeu, chance d'y mettre le feu par heure

export class World{
  constructor(seed=Date.now()%100000){this.events=[];this.init(seed);}
  init(seed){const G=generate(seed);this.G=G;this.N=G.N;this.rand=rng(seed*2654435761+7);for(let k=0;k<16;k++)this.rand();this.pather=new Pather(this.N);
    const s=this.s={v:SAVE_VERSION,seed,t:7,nextId:1,units:[],buildings:[],vehicles:[],shots:[],falls:[],log:[],rails:{},walls:{},corpses:[],squads:[],
      designs:Object.fromEntries(DEFAULT_DESIGNS.map(d=>[d.id,JSON.parse(JSON.stringify(d))])),armors:Object.fromEntries(DEFAULT_ARMORS.map(d=>[d.id,JSON.parse(JSON.stringify(d))])),smokes:[],
      nodes:G.nodes,beee:{cities:[],waves:0,anger:0,tension:0},won:null,lost:null,cityN:0,squadN:0,
      innov:{prac:{},next:{},ideas:[],done:[],order:INNOV.map(x=>x.id).sort(()=>this.rand()-.5)}};this.remod();
    const war=BEEE.peace[0]+this.rand()*(BEEE.peace[1]-BEEE.peace[0]);s.beee.warDay=Math.floor(war);s.beee.nextWave=(s.beee.warDay-1)*DAY+10;s.beee.nextAir=(s.beee.warDay-1+BEEE.air)*DAY;
    this.grids();
    const [ci,cj]=G.capital;const cap=this.addBuilding('meumeu','centre',ci-2,cj-2,true);cap.capital=true;cap.goal=true;cap.city=CITY_NAMES[0];s.cityN=1;Object.assign(cap.stock,START.stock);
    for(let n=0;n<START.villagers;n++){const a=n/START.villagers*Math.PI*2;this.addUnit('meumeu','villageois',ci+Math.cos(a)*3.2,cj+Math.sin(a)*3.2);}
    G.beee.forEach(([bi,bj],n)=>this.makeBeeeCity(bi,bj,BEEE_CITIES[n]));
    this.log(CITY_NAMES[0],'La capitale est fondée. Les bons filons sont loin : il faudra des rails. Les Bèè tiennent l’autre bout du continent — pour l’instant, ils nous observent.');}
  grids(){const N=this.N,M=N*N;this.occ=new Int32Array(M).fill(-1);this.rail=new Uint8Array(M);this.wall=new Int8Array(M);this.nodeAt=new Int32Array(M).fill(-1);
    for(const nd of this.s.nodes)if(nd.left>0||nd.type==='bush'||nd.type==='ore')this.nodeAt[nd.j*N+nd.i]=nd.id;
    for(const b of this.s.buildings)this.stamp(b,b.id);
    for(const [k,r] of Object.entries(this.s.rails))this.rail[+k]=r.b?2:1;
    for(const [k,w] of Object.entries(this.s.walls))this.wall[+k]=(w.f==='meumeu'?1:-1)*(w.b?2:1);
    this.bIndex=new Map(this.s.buildings.map(b=>[b.id,b]));this.uIndex=new Map(this.s.units.map(u=>[u.id,u]));}
  stamp(b,v){const [w,h]=BUILDINGS[b.k].size;for(let a=0;a<w;a++)for(let c=0;c<h;c++)this.occ[(b.j+c)*this.N+b.i+a]=v;}
  id(){return this.s.nextId++;}
  log(where,text,tone='info'){this.s.log.unshift({t:this.s.t,where,text,tone});if(this.s.log.length>160)this.s.log.pop();}
  emit(e){this.events.push(e);}
  get t(){return this.s.t;}
  get day(){return Math.floor(this.s.t/DAY)+1;}
  get atWar(){return this.day>=this.s.beee.warDay;}
  hour(){return ((this.s.t%DAY)+DAY)%DAY;}
  isNight(){const h=this.hour();return h>=NIGHT[0]||h<NIGHT[1];}
  light(){const h=this.hour();if(h>=7&&h<=19)return 1;if(h>=NIGHT[0]||h<NIGHT[1])return 0;return h<7?(h-NIGHT[1])/2:(NIGHT[0]-h)/2;}
  terrainAt(i,j){return i<0||j<0||i>=this.N||j>=this.N?T.deep:this.G.terrain[j*this.N+i];}
  gauss(){let u=0,v=0;while(!u)u=this.rand();while(!v)v=this.rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

  // ---------- les conceptions ----------
  design(id){return this.s.designs[id]||null;}
  W(id){const d=this.design(id)||this.s.designs.mle1;return derive(d.p);}
  designsOf(f,status='adopte'){return Object.values(this.s.designs).filter(d=>d.f===f&&(!status||d.status===status));}
  goodName(k){if(k.startsWith('p:')){const a=this.s.armors[k.slice(2)];return a?a.name:'Protection';}if(k.startsWith('m:')){const d=this.design(k.slice(2));return `Munitions ${d?d.name:'?'}`;}if(k.startsWith('a:')){const d=this.design(k.slice(2));return d?d.name:'Arme';}return RES[k]?.name||k;}
  // proposer un prototype au bureau d'études : il se paie, il prend du temps, puis il est adopté
  canPropose(b,p){const why=[];if(!b||b.k!=='armurerie'||!b.done)why.push('un bureau d’études');else if(b.proto)why.push('un prototype est déjà en cours');const D=derive(p);
    if(CONSTRUCTIONS[p.cons].minD&&p.d<CONSTRUCTIONS[p.cons].minD)why.push(`${CONSTRUCTIONS[p.cons].name.toLowerCase()} : ${CONSTRUCTIONS[p.cons].minD} mm de calibre au moins`);
    if(!D.mountOk)why.push(`l’épaule ne tient pas cette arme : ${D.need==='trepied'?'un trépied':'un bipied'} au moins`);
    if((p.mods||[]).includes('bouclier')&&D.have==='epaule')why.push('un bouclier demande un affût');
    if(b){const pay=this.canPay(b.f,b.i+1,b.j+1,protoCost(p));if(!pay.ok)why.push(`il manque : ${pay.miss.join(', ')}`);}return {ok:!why.length,why,D};}
  propose(b,name,p){const r=this.canPropose(b,p);if(!r.ok)return r;this.pay(b.f,b.i+1,b.j+1,protoCost(p));const id='d'+this.id();
    this.s.designs[id]={id,f:b.f,name:name||`Modèle ${Object.keys(this.s.designs).length}`,status:'prototype',p:JSON.parse(JSON.stringify(p)),origin:b.id};b.proto={id,left:PROTO_HOURS};
    this.log(this.cityName(b),`Prototype en fabrication : ${this.s.designs[id].name} (${r.D.name}).`,'good');return {ok:true,id,text:`Prototype lancé : ${this.s.designs[id].name}`};}

  // ---------- les protections ----------
  armorOf(id){const A=id&&this.s.armors[id];return A?{A,D:deriveArmor(A.a)}:null;}
  armorsOf(f,status='adopte'){return Object.values(this.s.armors).filter(a=>a.f===f&&(!status||a.status===status));}
  proposeArmor(b,name,a){if(!b||b.k!=='armurerie'||!b.done)return {ok:false,why:['un bureau d’études']};if(b.proto||b.protoA)return {ok:false,why:['un prototype est déjà en cours']};const D=deriveArmor(a);
    const cost=Object.fromEntries(Object.entries(D.cost).map(([k,v])=>[k,+(v*3).toFixed(1)]));const p=this.canPay(b.f,b.i+1,b.j+1,cost);if(!p.ok)return {ok:false,why:[`il manque : ${p.miss.join(', ')}`]};
    this.pay(b.f,b.i+1,b.j+1,cost);const id='p'+this.id();this.s.armors[id]={id,f:b.f,name:name||`Protection ${Object.keys(this.s.armors).length}`,status:'prototype',a:JSON.parse(JSON.stringify(a))};b.protoA={id,left:8};
    this.log(this.cityName(b),`Prototype de protection : ${this.s.armors[id].name} (${Math.round(D.mass*1000)} g).`,'good');return {ok:true,id,text:`Prototype lancé : ${this.s.armors[id].name} (8 h)`};}
  // ---------- les choses ----------
  addUnit(f,k,x,y,o={}){const D=f==='beee'?BEEE.units[k]:UNITS[k];const u={id:this.id(),f,k,x,y,hp:1,max:1,task:null,path:null,carry:null,cool:0,dir:'se',fx:1,fy:0,anim:'idle',post:'debout',supp:0,xp:0};
    if(D.img){u.hp=D.hp;u.max=D.hp;u.shells=8;}else u.h=newHealth();
    if(D.arm){u.w=o.w||(typeof D.arm==='string'?D.arm:'mle1');const W=this.W(u.w);u.mag=W.p.mag;u.pouch=o.rounds??Math.min(W.carry,W.p.mag*8);}
    if(D.grenades)u.gren=D.grenades;if(D.medic)u.kits=D.kits;if(D.tents)u.tents=D.tents;if(D.smoke)u.smoke=D.smoke;
    u.armor=o.armor!==undefined?o.armor:(f==='beee'?(k==='commando'?'bee_plaque':k==='soldat'?'bee_casque':null):null);u.plates={};
    if(k==='villageois'||D.medic||D.arm){const used=new Set(this.s.units.map(x=>x.name));u.name=NAMES.find(n=>!used.has(n))||'Meumeu '+u.id;if(f==='beee')u.name='Bèè '+u.id;}
    this.s.units.push(u);this.uIndex?.set(u.id,u);return u;}
  addBuilding(f,k,i,j,done=false){const B=BUILDINGS[k];const b={id:this.id(),f,k,i,j,done,progress:done?1:0,hp:done?B.hp:B.hp*.1,max:B.hp,queue:[],fire:0,ruin:false};
    if(B.store){b.stock={};b.no=this.s.buildings.filter(x=>x.f===f&&x.k===k).length+1;b.prio=k==='tente'?4:3;b.want=k==='tente'?{sante:6}:k==='centre'?{vivres:80}:{};}
    // ceux qui forment (caserne, fonderie, hôpital) gardent une réserve à leur dépôt : ce qu'il faut pour les prochains
    if(B.stock0&&f==='meumeu')b.need={...B.stock0};if(B.ward)b.wardList=[];
    // une usine neuve : sa première production (le joueur la change), son plafond, et l'outillage du fusil de base
    if(B.factory){const first=f==='meumeu'?{arsenal:'m:mle1',manufacture:'a:mle1'}[k]:null;b.prod=first||Object.keys(PRODUCTS).find(p=>PRODUCTS[p].at===k)||null;b.limit=b.prod?LIMIT_OF(b.prod):0;if(B.manufacture)b.tooled={mle1:true};}
    this.s.buildings.push(b);this.stamp(b,b.id);this.bIndex?.set(b.id,b);return b;}
  addVehicle(f,k,home){const used=new Set(this.s.vehicles.map(v=>v.name));const V=VEHICLES[k];const [w,h]=BUILDINGS[home.k].size;
    const v={id:this.id(),f,k,name:VEHICLE_NAMES.find(n=>!used.has(n))||k+' '+this.s.nextId,x:home.i+w/2,y:home.j+h+.3,home:home.id,base:home.id,at:home.id,route:null,cargo:{},state:'idle',hp:V.hp||50,max:V.hp||50,pass:[],alt:0,
      mode:k==='bombardier'?null:'fret',only:[],job:null};if(k==='train')v.coal=this.tender();
    if(k==='train'){const p=this.platform(home);if(p){v.x=p[0]+.5;v.y=p[1]+.5;}v.trail=[];}
    if(k==='avion'||k==='bombardier'){v.x=home.i+1;v.y=home.j+1;}
    this.s.vehicles.push(v);return v;}
  building(id){return this.bIndex.get(id)||null;}
  unit(id){return this.uIndex.get(id)||null;}
  centreOf(b){const cs=this.s.buildings.filter(x=>x.k==='centre'&&x.f===b.f&&!x.ruin);return cs.sort((a,z)=>d2(a.i,a.j,b.i,b.j)-d2(z.i,z.j,b.i,b.j))[0]||null;}
  cityName(b){const c=this.centreOf(b);return c&&d2(c.i,c.j,b.i,b.j)<30?c.city:b.f==='beee'?'Terres bèè':'Avant-poste';}
  capital(){return this.s.buildings.find(b=>b.capital)||null;}

  // ---------- les dépôts ----------
  isDepot(b){return b.done&&BUILDINGS[b.k].store;}
  depots(f,x,y,r=RADIUS){return this.s.buildings.filter(b=>b.f===f&&this.isDepot(b)&&this.distB(b,x,y)<=r).sort((a,z)=>this.distB(a,x,y)-this.distB(z,x,y));}
  distB(b,x,y){const [w,h]=BUILDINGS[b.k].size;const dx=Math.max(b.i-x,0,x-(b.i+w)),dy=Math.max(b.j-y,0,y-(b.j+h));return Math.hypot(dx,dy);}
  // ce qu'un dépôt contient, pesé (une arme pèse sa masse, le reste compte une caisse)
  stored(b){let s=0;for(const [k,v] of Object.entries(b.stock||{}))s+=v*weightOf(k,this.s.designs,this.s.armors);return s;}
  room(b){return Math.max(0,BUILDINGS[b.k].store-this.stored(b));}
  have(f,x,y,r=RADIUS){const o={};for(const b of this.depots(f,x,y,r))for(const [k,v] of Object.entries(b.stock))o[k]=(o[k]||0)+v;return o;}
  canPay(f,x,y,cost,r=RADIUS){const h=this.have(f,x,y,r);const miss=Object.entries(cost).filter(([k,n])=>(h[k]||0)<n-1e-6).map(([k,n])=>`${+(n-(h[k]||0)).toFixed(2)} ${this.goodName(k).toLowerCase()}`);return {ok:!miss.length,miss};}
  pay(f,x,y,cost,r=RADIUS){if(!this.canPay(f,x,y,cost,r).ok)return false;for(const [k,n0] of Object.entries(cost)){let n=n0;for(const b of this.depots(f,x,y,r)){const q=Math.min(n,b.stock[k]||0);b.stock[k]=(b.stock[k]||0)-q;n-=q;if(n<=1e-9)break;}}return true;}
  // prendre au plus `n` d'un bien dans les dépôts proches ; renvoie ce qui a été pris
  take(f,x,y,k,n,r=RADIUS){let got=0;for(const b of this.depots(f,x,y,r)){const q=Math.min(n-got,b.stock[k]||0);if(q>0){b.stock[k]-=q;got+=q;}if(got>=n-1e-9)break;}return got;}
  put(b,k,n){const w=weightOf(k,this.s.designs,this.s.armors);const q=Math.min(n,this.room(b)/w);b.stock[k]=(b.stock[k]||0)+q;return q;}
  dropAt(u){const comp=this.G.comp;const here=comp[(Math.floor(u.y))*this.N+Math.floor(u.x)];
    return this.s.buildings.filter(b=>b.f===u.f&&this.isDepot(b)&&this.room(b)>=1&&comp[(b.j)*this.N+b.i]===here).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0]||null;}

  // ---------- se déplacer ----------
  costFn(f){const ter=this.G.terrain,occ=this.occ,wall=this.wall;const mine=f==='meumeu'?1:-1;
    return k=>{if(!TERRAIN[ter[k]].walk||occ[k]>=0)return Infinity;const w=wall[k];if(w===-2*mine)return 25;return 1;};}
  go(u,tx,ty,rect=null){const N=this.N;const key=rect?`r${rect.join(',')}`:`${Math.floor(tx)},${Math.floor(ty)}`;
    if(u.goal!==key||!u.path){const si=clamp(Math.floor(u.x),0,N-1),sj=clamp(Math.floor(u.y),0,N-1);const ti=clamp(Math.floor(tx),0,N-1),tj=clamp(Math.floor(ty),0,N-1);
      const goal=rect?(k=>{const i=k%N,j=(k/N)|0;return i>=rect[0]-1&&i<=rect[0]+rect[2]&&j>=rect[1]-1&&j<=rect[1]+rect[3];}):(k=>k===tj*N+ti);
      const r=this.pather.find(si,sj,ti,tj,this.costFn(u.f),goal);u.path=r.path;u.pathDone=r.done;u.goal=key;u.pi=0;}
    return this.follow(u,rect?null:[tx,ty]);}
  speedOf(u){const D=UDEF(u);let s=D.speed*(u.armor?this.armorOf(u.armor)?.D.move||1:1)*(u.carry?.n>5?.85:1)*(u.carrying!=null?.55*this.mod('brancard'):1)*(u.amput?.7:1);if(u.h){if(u.h.state==='hors')return 0;s*=Math.max(.15,malus(u.h).move);}if(u.post==='couche')s*=.25;else if(u.post==='accroupi')s*=.7;
    if(u.w){const Wd=this.W(u.w);if(Wd.crew>1){const n=this.servants(u,1.5).length;s*=Math.min(.8,.3+.5*n/(Wd.crew-1));}}if(u.crates>0)s*=Math.max(.6,1-u.crates*.15);return s;}
  // les servants d'une pièce : ceux de l'escouade qui la servent, à `r` cases au plus
  servants(u,r=1.2){return this.s.units.filter(o=>o.serve===u.id&&alive(o)&&o.h?.state!=='hors'&&Math.hypot(o.x-u.x,o.y-u.y)<=r);}
  // une escouade répartit ses rôles : pour chaque pièce, ses servants (les plus proches) ; le reste tire
  assignCrews(sq){const ms=this.members(sq);for(const u of ms)if(u.serve&&!ms.some(g=>g.id===u.serve))u.serve=null;
    for(const g of ms){if(!g.w)continue;const Wd=this.W(g.w);const need=Wd.crew-1-ms.filter(o=>o.serve===g.id).length;if(need<=0)continue;
      const free=ms.filter(o=>o!==g&&!o.serve&&o.role!=='munitions'&&!UNITS[o.k]?.medic&&!(o.w&&this.W(o.w).crew>1)).sort((a,b)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y));for(const o of free.slice(0,need))o.serve=g.id;}}
  follow(u,exact){const sp=this.speedOf(u)*this.dt;let left=sp;if(sp<=0){u.anim='idle';return false;}
    while(left>0){let tgt;if(u.pi<u.path.length){const [i,j]=u.path[u.pi];tgt=[i+.5,j+.5];}else if(exact&&u.pathDone){tgt=exact;}else{u.anim='idle';return true;}
      if(u.pi<u.path.length){const [i,j]=u.path[u.pi];const w=this.wall[j*this.N+i];if(w===(u.f==='meumeu'?-2:2)){u.blockedBy=j*this.N+i;u.anim='idle';return false;}}
      const dx=tgt[0]-u.x,dy=tgt[1]-u.y,d=Math.hypot(dx,dy);this.face(u,dx,dy);
      if(d<=left){u.x=tgt[0];u.y=tgt[1];left-=d;if(u.pi<u.path.length)u.pi++;else{u.anim='idle';return true;}}else{u.x+=dx/d*left;u.y+=dy/d*left;left=0;}}
    u.anim='walk';u.moved=this.s.t;u.blockedBy=null;return false;}
  face(u,dx,dy){const n=Math.hypot(dx,dy);if(n<1e-6)return;u.fx=dx/n;u.fy=dy/n;const sx=dx-dy,sy=dx+dy;u.dir=sy>=0?(sx>=0?'se':'sw'):(sx>=0?'ne':'nw');}

  // ---------- les escouades ----------
  // Des soldats choisis, la touche G : une escouade. On la commande d'un bloc ; elle se met en formation, se couvre, se soigne.
  formSquad(ids){const us=ids.map(id=>this.unit(id)).filter(u=>alive(u)&&u.f==='meumeu'&&u.k!=='villageois');if(us.length<2)return {ok:false,why:['au moins deux soldats']};
    for(const u of us)if(u.sq)this.leave(u);const n=++this.s.squadN;const sq={id:this.id(),f:'meumeu',name:`${n}${n===1?'re':'e'} escouade`,m:us.map(u=>u.id),leader:us.slice().sort((a,b)=>(b.xp||0)-(a.xp||0))[0].id,morale:1,form:'ligne'};
    for(const u of us)u.sq=sq.id;this.s.squads.push(sq);this.assignCrews(sq);this.log('Armée',`${sq.name} formée : ${us.length} ${us.length>1?'hommes':'homme'}.`,'good');return {ok:true,sq,text:`${sq.name} : ${us.length}`};}
  squad(id){return this.s.squads.find(q=>q.id===id)||null;}
  // Changer d'arme, de protection : au dépôt le plus proche (à moins de RADIUS cases), qui doit l'avoir en stock ; l'ancienne y reste
  rearm(u,wid){const dep=this.depots(u.f,u.x,u.y)[0];if(!dep)return {ok:false,why:[`aucun dépôt à moins de ${RADIUS} cases`]};if(u.w===wid)return {ok:true};
    if((dep.stock['a:'+wid]||0)<1)return {ok:false,why:[`${this.design(wid)?.name||'cette arme'} : aucune au ${this.depotName(dep)}`]};
    dep.stock['a:'+wid]-=1;if(u.w){this.put(dep,'a:'+u.w,1);const Wo=this.W(u.w);const back=(u.mag+u.pouch)/Wo.perCrate;if(back>0)this.put(dep,'m:'+u.w,back);}
    u.w=wid;u.mag=0;u.pouch=0;this.resupply(u);const Wn=this.W(wid);const n=Math.min(Wn.p.mag,u.pouch);u.mag=n;u.pouch-=n;u.serve=null;const sq=u.sq&&this.squad(u.sq);if(sq)this.assignCrews(sq);return {ok:true};}
  rearmor(u,aid){const dep=this.depots(u.f,u.x,u.y)[0];if(!dep)return {ok:false,why:[`aucun dépôt à moins de ${RADIUS} cases`]};if((u.armor||'')===(aid||''))return {ok:true};
    if(aid&&(dep.stock['p:'+aid]||0)<1)return {ok:false,why:[`${this.s.armors[aid]?.name||'cette protection'} : aucune au ${this.depotName(dep)}`]};
    if(aid)dep.stock['p:'+aid]-=1;if(u.armor)this.put(dep,'p:'+u.armor,1);u.armor=aid||null;u.plates={};return {ok:true};}
  // le rôle dans l'escouade : tireur, servant d'une pièce, porteur de munitions
  setRole(u,role){if(role==='munitions'){u.role='munitions';u.serve=null;}else if(role?.startsWith('serve:')){u.role=null;u.serve=+role.slice(6);}else{u.role=null;u.serve=null;}return {ok:true};}
  // Le porteur de munitions : deux caisses au plus, des munitions de l'arme la plus portée de son escouade ; il les prend au
  // dépôt quand il passe à portée, et remplit les cartouchières de ceux qui sont à moins de 1,5 case et ont moins de la moitié.
  bearerTick(u){const sq=this.squad(u.sq);if(!sq)return;const ms=this.members(sq).filter(o=>o.w&&alive(o));if(!ms.length)return;
    const cnt={};for(const o of ms)cnt[o.w]=(cnt[o.w]||0)+1;const wid=u.ammoW&&cnt[u.ammoW]?u.ammoW:Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];if(u.ammoW!==wid){u.ammoW=wid;u.crates=0;}
    const Wd=this.W(wid);if((u.crates||0)<2){const got=this.take(u.f,u.x,u.y,'m:'+wid,2-(u.crates||0));if(got>0)u.crates=(u.crates||0)+got;}
    if(!(u.crates>0))return;for(const o of ms){if(o.w!==wid||o===u||Math.hypot(o.x-u.x,o.y-u.y)>1.5)continue;const want=Wd.carry-(o.pouch||0);if(want<Wd.carry*.5)continue;
      const give=Math.min(want,Math.floor(u.crates*Wd.perCrate));if(give<=0)break;o.pouch=(o.pouch||0)+give;u.crates=Math.max(0,u.crates-give/Wd.perCrate);if(o.why?.startsWith('à sec'))o.why=null;}}
  leave(u){const sq=this.squad(u.sq);u.sq=null;if(!sq)return;sq.m=sq.m.filter(id=>id!==u.id);if(sq.leader===u.id)sq.leader=sq.m[0]??null;if(!sq.m.length)this.s.squads.splice(this.s.squads.indexOf(sq),1);}
  dissolve(id){const sq=this.squad(id);if(!sq)return;for(const mid of sq.m){const u=this.unit(mid);if(u)u.sq=null;}this.s.squads.splice(this.s.squads.indexOf(sq),1);}
  members(sq){return sq.m.map(id=>this.unit(id)).filter(Boolean);}

  // ---------- les ordres du joueur ----------
  targetAt(x,y,f='meumeu'){const N=this.N;const i=Math.floor(x),j=Math.floor(y);
    const en=this.s.units.filter(u=>alive(u)&&d2(u.x,u.y,x,y)<.7).sort((a,b)=>d2(a.x,a.y,x,y)-d2(b.x,b.y,x,y))[0];if(en)return {type:'unit',id:en.id};
    if(i<0||j<0||i>=N||j>=N)return null;const k=j*N+i;
    if(this.occ[k]>=0)return {type:'building',id:this.occ[k]};
    const w=this.wall[k];if(w)return {type:'wall',k};
    if(this.nodeAt[k]>=0)return {type:'node',id:this.nodeAt[k]};
    if(this.rail[k]===1)return {type:'rail',k};
    return {type:'point',x,y};}
  order(ids,t){const us=ids.map(id=>this.unit(id)).filter(u=>u&&u.f==='meumeu'&&active(u));if(!us.length||!t)return {ok:false,why:['personne en état']};const vil=us.filter(u=>u.k==='villageois');
    const set=(u,task)=>{u.task=task;u.path=null;u.goal=null;u.idleT=0;u.hold=false;u.why=null;};
    const hostile=(t.type==='unit'&&this.unit(t.id)?.f==='beee')||(t.type==='building'&&this.building(t.id)?.f==='beee')||(t.type==='wall'&&this.s.walls[t.k]?.f==='beee');
    if(hostile&&!this.atWar)this.declareWar('meumeu');
    if(t.type==='unit'){const e=this.unit(t.id);
      if(e.f==='meumeu'){const med=us.filter(u=>UNITS[u.k].medic&&u.kits>0);if(e.h&&(needsCare(e.h)||(needsDoctor(e.h)&&med.some(m=>UNITS[m.k].doctor)))&&med.length){set(med[0],{kind:'soigne',id:e.id});return {ok:true,text:`${med[0].name} court soigner ${e.name||'le blessé'}`};}
        if(e.h?.state==='hors'){const carriers=us.slice(0,2);carriers.forEach(u=>set(u,{kind:'evac',id:e.id}));return {ok:true,text:`${carriers.length} vont chercher ${e.name||'le blessé'}`};}
        us.forEach((u,n)=>set(u,{kind:'move',tx:e.x+(n%3-1)*.5,ty:e.y+(((n/3)|0)%3-1)*.5}));return {ok:true,text:'on le suit'};}
      us.forEach(u=>set(u,{kind:'attack',unit:e.id}));return {ok:true,text:`${us.length} à l’attaque`};}
    if(t.type==='building'){const b=this.building(t.id);const B=BUILDINGS[b.k];
      if(b.f!=='meumeu'){us.forEach(u=>set(u,{kind:'attack',b:b.id}));return {ok:true,text:`${us.length} à l’assaut de : ${B.name.toLowerCase()}`};}
      const mil=us.filter(u=>u.k!=='villageois');mil.forEach((u,n)=>set(u,{kind:'move',tx:b.i+B.size[0]/2+(n%4-1.5)*.7,ty:b.j+B.size[1]+.8+((n/4)|0)*.7}));
      if(B.airfield&&us.length){us.forEach(u=>set(u,{kind:'board',b:b.id}));return {ok:true,text:`${us.length} embarquent à l’aérodrome`};}
      if(!vil.length)return {ok:true,text:'en position'};
      const docs=B.tent&&!b.done?us.filter(u=>UNITS[u.k].doctor):[];if(docs.length){docs.forEach(u=>set(u,{kind:'build',b:b.id}));if(!vil.length)return {ok:true,text:'on monte la tente'};}
      if(!b.done||b.hp<b.max-1||b.fire>0){vil.forEach(u=>set(u,{kind:!b.done?'build':'repair',b:b.id}));return {ok:true,text:!b.done?`${vil.length} au chantier : ${B.name.toLowerCase()}`:`${vil.length} réparent${b.fire>0?' et éteignent le feu':''}`};}
      if(B.workers){const room=B.workers-this.workers(b).length;if(room<=0)return {ok:false,why:[`${B.name} : ${B.workers} places, toutes prises`]};vil.slice(0,room).forEach(u=>set(u,{kind:'work',b:b.id}));return {ok:true,text:`${Math.min(room,vil.length)} au travail : ${B.name.toLowerCase()}`};}
      if(B.store){vil.forEach(u=>set(u,{kind:'deposit',b:b.id}));return {ok:true,text:'ils déposent là'};}
      return {ok:true,text:'rien à y faire'};}
    if(t.type==='wall'){const w=this.s.walls[t.k];if(w&&w.f!=='meumeu'){us.forEach(u=>set(u,{kind:'attack',wall:t.k}));return {ok:true,text:'on abat le mur'};}
      if(w&&!w.b){vil.forEach(u=>set(u,{kind:'line',line:'mur',x:t.k%this.N,y:(t.k/this.N)|0}));return {ok:true,text:'on bâtit le mur'};}}
    if(t.type==='rail'){vil.forEach(u=>set(u,{kind:'line',line:'rail',x:t.k%this.N,y:(t.k/this.N)|0}));return {ok:true,text:`${vil.length} posent la voie`};}
    if(t.type==='node'){const nd=this.s.nodes[t.id];if(!vil.length)return {ok:false,why:['seuls les villageois ramassent']};vil.forEach(u=>set(u,{kind:'gather',node:nd.id,type:nd.type,res:nd.res||NODES[nd.type].res}));
      return {ok:true,text:`${vil.length} : ${nd.type==='tree'?'bûcheron':nd.type==='rock'?'carrier':nd.type==='bush'?'cueilleur':'extraction à la main'}`};}
    // un point : on y va en formation, face à la direction de la marche ; les soldats attaquent ce qu'ils croisent
    const cx=us.reduce((a,u)=>a+u.x,0)/us.length,cy=us.reduce((a,u)=>a+u.y,0)/us.length;let dx=t.x-cx,dy=t.y-cy;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;const px=-dy,py=dx;
    // la formation : celle de l'escouade si tous en sont (ligne, colonne, dispersée), sinon en ligne ; les infirmiers suivent derrière
    const sq=us[0].sq&&us.every(u=>u.sq===us[0].sq)?this.squad(us[0].sq):null;const F={ligne:[6,.75,.8],colonne:[2,.6,.7],dispersee:[5,1.5,1.4]}[sq?.form||'ligne'];
    const front=us.filter(u=>!UNITS[u.k].medic),rear=us.filter(u=>UNITS[u.k].medic);const n=front.length;
    front.forEach((u,q)=>{const row=Math.floor(q/F[0]),col=q%F[0],cols=Math.min(F[0],n-row*F[0]);const off=(col-(cols-1)/2)*F[1],back=row*F[2];
      set(u,{kind:u.k==='villageois'?'move':'assault',tx:t.x+px*off-dx*back,ty:t.y+py*off-dy*back,fx:dx,fy:dy});});
    const rows=Math.ceil(n/F[0]);rear.forEach((u,q)=>set(u,{kind:'move',tx:t.x+px*(q-(rear.length-1)/2)*.8-dx*(rows*F[2]+.8),ty:t.y+py*(q-(rear.length-1)/2)*.8-dy*(rows*F[2]+.8),fx:dx,fy:dy}));
    return {ok:true,text:us.length>1?`${us.length} en route, ${sq?{ligne:'en ligne',colonne:'en colonne',dispersee:'dispersés'}[sq.form]:'en ligne'}`:'en route'};}
  workers(b){return this.s.units.filter(u=>u.task?.kind==='work'&&u.task.b===b.id);}
  // Les bâtisseurs portent les matériaux : du dépôt du chantier au chantier, CARRY caisses par voyage, jusqu'à ce que tout
  // soit là. Ce qui manque au dépôt y devient une commande (le fret l'y amène : porteurs, trains).
  siteDepot(b){const D=this.building(b.site);if(D&&D.done&&!D.ruin)return D;const [x,y]=this.bc(b);const N=this.depots(b.f,x,y,SITE_RANGE)[0]||null;if(N)b.site=N.id;return N;}
  enRoute(b,k){let n=0;for(const u of this.s.units)if(u.task?.kind==='build'&&u.task.b===b.id){if(u.task.fetch===k)n+=u.task.fetchN||0;else if(u.carry?.k===k&&u.task.bring)n+=u.carry.n;}return n;}
  // au chantier : déposer ce qu'on porte ; sinon partir chercher ce qui manque le plus. Rend vrai si le chantier a de quoi avancer.
  haulTick(u,T0,b,dt){b.paid??={};if(u.carry&&T0.bring){const k=u.carry.k;const need=Math.max(0,(this.siteCost(b)[k]||0)-(b.paid[k]||0));const q=Math.min(need,u.carry.n);b.paid[k]=(b.paid[k]||0)+q;u.carry.n-=q;
      if(u.carry.n<=1e-6)u.carry=null;T0.bring=false;if(q>0)return true;}
    const rem=this.siteRemaining(b);const D=this.siteDepot(b);u.anim='idle';
    if(!D){b.why='aucun dépôt d’où apporter les matériaux';return false;}
    const want=Object.entries(rem).map(([k,n])=>[k,n-this.enRoute(b,k)]).filter(([,n])=>n>1e-6).sort((a,z)=>z[1]-a[1]);
    if(!want.length){b.why=Object.keys(rem).length?`les matériaux arrivent (${this.siteMissing(b)})`:null;return false;}
    const has=want.find(([k])=>(D.stock[k]||0)>=Math.min(1,want.find(w=>w[0]===k)[1])-1e-6);
    if(!has){b.why=`attend au ${this.depotName(D)} : ${want.map(([k,n])=>`${Math.ceil(n)} ${this.goodName(k).toLowerCase()}`).join(', ')} (commandé)`;return false;}
    if(u.carry){const R=this.depots(u.f,u.x,u.y,SITE_RANGE)[0];if(R)this.put(R,u.carry.k,u.carry.n);u.carry=null;}
    T0.fetch=has[0];T0.fetchN=Math.min(CARRY,has[1]);u.path=null;b.why=null;return false;}
  fetchTick(u,T0,b,dt){const D=this.siteDepot(b);if(!D){T0.fetch=null;return;}const [w,h]=BUILDINGS[D.k].size;if(!this.go(u,D.i+w/2,D.j+h/2,[D.i,D.j,w,h]))return;
    const k=T0.fetch;const q=Math.min(T0.fetchN,D.stock[k]||0);if(q>0){D.stock[k]-=q;u.carry={k,n:q};T0.bring=true;}T0.fetch=null;T0.fetchN=0;u.path=null;}
  idle(f='meumeu'){return this.s.units.filter(u=>u.f===f&&u.k==='villageois'&&!u.task&&active(u));}
  setPosture(ids,post){for(const id of ids){const u=this.unit(id);if(u&&u.h)u.orderPost=post==='auto'?null:post;}}

  // ---------- bâtir ----------
  canPlace(f,k,i,j){const B=BUILDINGS[k];const [w,h]=B.size;const N=this.N;const why=[];let ore=null,free=true;
    for(let a=0;a<w;a++)for(let c=0;c<h;c++){const ii=i+a,jj=j+c;if(ii<1||jj<1||ii>=N-1||jj>=N-1){free=false;continue;}const kk=jj*N+ii;
      if(!TERRAIN[this.G.terrain[kk]].build||this.occ[kk]>=0||this.wall[kk]||this.rail[kk])free=false;const nd=this.nodeAt[kk];if(nd>=0){const n=this.s.nodes[nd];if(n.type==='ore')ore=n;}}   // arbres, buissons, rochers : le chantier les dégage
    // GAP cases d'écart tout autour : des rues entre les bâtiments, une vue claire, un incendie qui ne saute pas d'un toit à l'autre
    let crowd=false;for(let a=-GAP;a<w+GAP&&!crowd;a++)for(let c=-GAP;c<h+GAP;c++){if(a>=0&&a<w&&c>=0&&c<h)continue;const ii=i+a,jj=j+c;if(ii<0||jj<0||ii>=N||jj>=N)continue;if(this.occ[jj*N+ii]>=0){crowd=true;break;}}
    if(!free)why.push('la place est prise');else if(crowd)why.push(`trop près d’un autre bâtiment : ${GAP} cases d’écart`);if(B.onOre&&!ore)why.push('sur un filon');if(!B.onOre&&ore)why.push('pas sur le filon');
    if(B.unique&&this.s.buildings.some(b=>b.f===f&&b.k===k&&!b.ruin))why.push('un seul');
    if(k==='centre'&&this.s.buildings.some(b=>b.f===f&&b.k==='centre'&&d2(b.i,b.j,i,j)<24))why.push('trop près d’une autre ville');
    if(B.station&&!this.platformAt(i,j,w,h))why.push('au bord d’une voie ferrée');
    // un chantier se paie à mesure : il lui faut un dépôt à moins de RADIUS cases, où le fret apportera ce qui manque (le camp est gratuit)
    const site=Object.keys(B.cost).length?this.depots(f,i+w/2,j+h/2,SITE_RANGE)[0]||null:null;if(Object.keys(B.cost).length&&!site)why.push(`aucun dépôt à moins de ${SITE_RANGE} cases d’où apporter les matériaux`);
    return {ok:!why.length,why,ore,site};}
  place(f,k,i,j){const r=this.canPlace(f,k,i,j);if(!r.ok)return r;const B=BUILDINGS[k];
    // le chantier dégage ce qui pousse ou traîne sous lui : arbres, buissons, rochers (le bois et la pierre sont perdus)
    for(let a=0;a<B.size[0];a++)for(let c=0;c<B.size[1];c++){const kk=(j+c)*this.N+i+a;const nd=this.nodeAt[kk];if(nd>=0&&this.s.nodes[nd].type!=='ore'){this.s.nodes[nd].left=0;this.nodeAt[kk]=-1;}}
    const b=this.addBuilding(f,k,i,j,false);if(r.ore)b.ore=r.ore.id;b.paid={};b.site=r.site?.id??null;if(f!=='meumeu')this.sitePay(b);
    if(k==='centre'){b.city=CITY_NAMES[this.s.cityN%CITY_NAMES.length];this.s.cityN++;}
    this.emit({type:'placed',x:i+B.size[0]/2,y:j+B.size[1]/2});return {ok:true,b};}
  cancel(id){const b=this.building(id);if(!b||b.done||b.ruin)return;const d=this.building(b.site)||this.depots(b.f,b.i,b.j)[0];if(d)for(const [k,n] of Object.entries(b.paid||{}))this.put(d,k,n);this.remove(b);}
  remove(b){this.stamp(b,-1);this.s.buildings.splice(this.s.buildings.indexOf(b),1);this.bIndex.delete(b.id);for(const u of this.s.units)if(u.task?.b===b.id)u.task=null;}
  lineCells(i0,j0,i1,j1){const out=[];let i=i0,j=j0;const di=Math.sign(i1-i0),dj=Math.sign(j1-j0);out.push([i,j]);
    while(i!==i1||j!==j1){const ri=Math.abs(i1-i),rj=Math.abs(j1-j);if(ri&&rj&&Math.abs(ri-rj)<=Math.max(ri,rj)/2){i+=di;j+=dj;}else if(ri>rj)i+=di;else j+=dj;out.push([i,j]);}return out;}
  canLine(f,kind,cells){const N=this.N;const ok=[];for(const [i,j] of cells){if(i<1||j<1||i>=N-1||j>=N-1)continue;const k=j*N+i;if(!TERRAIN[this.G.terrain[k]].build||this.occ[k]>=0)continue;
    if(kind==='rail'&&this.rail[k])continue;if(kind==='mur'&&(this.wall[k]||this.rail[k]))continue;if(this.nodeAt[k]>=0&&this.s.nodes[this.nodeAt[k]].type==='ore')continue;ok.push(k);}return ok;}
  planLine(f,kind,cells){const ks=this.canLine(f,kind,cells);for(const k of ks){if(kind==='rail'){this.s.rails[k]={b:0,p:0,hp:LINES.rail.hp};this.rail[k]=1;}else{this.s.walls[k]={f,b:0,p:0,hp:LINES.mur.hp};this.wall[k]=f==='meumeu'?1:-1;}
      const nd=this.nodeAt[k];if(nd>=0&&this.s.nodes[nd].type!=='ore'){this.s.nodes[nd].left=0;this.nodeAt[k]=-1;}}
    return {ok:ks.length>0,n:ks.length,cost:Object.fromEntries(Object.entries(LINES[kind].cost).map(([r,v])=>[r,v*ks.length]))};}
  lineBuilt(kind,k){if(kind==='rail'){const r=this.s.rails[k];r.b=1;r.p=1;this.rail[k]=2;this._rnDirty=true;}else{const w=this.s.walls[k];w.b=1;w.p=1;w.hp=LINES.mur.hp*this.mod('mur');this.wall[k]=(w.f==='meumeu'?2:-2);this.repath();}}
  lineBroken(kind,k){if(kind==='rail'){const r=this.s.rails[k];if(!r)return;r.b=0;r.p=0;r.paid=0;r.hp=LINES.rail.hp;this.rail[k]=1;r.broken=true;this._rnDirty=true;}else{delete this.s.walls[k];this.wall[k]=0;this.repath();}}
  repath(){for(const u of this.s.units)u.path=null;}
  platformAt(i,j,w,h){const N=this.N;for(let a=-1;a<=w;a++)for(let c=-1;c<=h;c++){if(a>=0&&a<w&&c>=0&&c<h)continue;const ii=i+a,jj=j+c;if(ii<0||jj<0||ii>=N||jj>=N)continue;if(this.rail[jj*N+ii])return [ii,jj];}return null;}
  platform(b){const [w,h]=BUILDINGS[b.k].size;const N=this.N;let best=null;for(let a=-1;a<=w;a++)for(let c=-1;c<=h;c++){if(a>=0&&a<w&&c>=0&&c<h)continue;const ii=b.i+a,jj=b.j+c;if(ii<0||jj<0||ii>=N||jj>=N)continue;if(this.rail[jj*N+ii]===2)return [ii,jj];if(this.rail[jj*N+ii]&&!best)best=[ii,jj];}return best;}

  // ---------- former, construire ----------
  // Un soldat part avec une arme de la conception choisie : elle doit être dans un dépôt proche de la caserne.
  canTrain(b,k,w=null,armor=null){const B=BUILDINGS[b.k];const why=[];if(!b.done)why.push('pas fini');const D=UNITS[k]||VEHICLES[k];if(!(B.trains||[]).includes(k))why.push('pas ici');
    if(b.queue.length>=5)why.push('cinq en attente');if(UNITS[k]&&this.pop('meumeu').used+(UNITS[k].pop||1)>this.pop('meumeu').cap)why.push('plus de place de vie : des maisons');
    if(k==='train'&&!this.platform(b))why.push('la gare n’a pas de voie');
    const cost={...D.cost};if(UNITS[k]?.arm){const d=this.design(w||'mle1');if(!d||d.status!=='adopte')why.push('une arme adoptée');else cost['a:'+d.id]=1;if(armor){const a=this.s.armors[armor];if(!a||a.status!=='adopte')why.push('une protection adoptée');else cost['p:'+armor]=1;}}
    const p=this.canPay(b.f,b.i+1,b.j+1,cost);if(!p.ok)why.push(`il manque : ${p.miss.join(', ')}`);return {ok:!why.length,why,cost};}
  train(b,k,w=null,armor=null){const r=this.canTrain(b,k,w,armor);if(!r.ok)return r;const D=UNITS[k]||VEHICLES[k];this.pay(b.f,b.i+1,b.j+1,r.cost);b.queue.push({k,left:D.hours,w:w||'mle1',armor:UNITS[k]?.arm?armor:null});return {ok:true,text:`${D.name} en préparation`};}
  pop(f){const cap=this.s.buildings.filter(b=>b.f===f&&b.done&&BUILDINGS[b.k].pop).reduce((a,b)=>a+BUILDINGS[b.k].pop,0);const used=this.s.units.filter(u=>u.f===f).reduce((a,u)=>a+(UDEF(u).pop||1),0)+this.s.vehicles.filter(v=>v.f===f&&v.k==='porteur').length;return {cap,used};}

  // ---------- les véhicules ----------
  setRoute(vid,a,b){const v=this.s.vehicles.find(x=>x.id===vid);const A=this.building(a),B=this.building(b);if(!v||!A||!B||a===b)return {ok:false,why:['deux arrêts différents']};
    const need=v.k==='train'?'station':v.k==='avion'?'airfield':'store';if(!BUILDINGS[A.k][need]||!BUILDINGS[B.k][need])return {ok:false,why:[v.k==='train'?'deux gares':v.k==='avion'?'deux aérodromes':'deux dépôts']};
    v.route={a,b,out:['guerre','vivres','industrie','materiaux'],back:['rare']};v.mode='ligne';v.job=null;v.state='go';v.leg=0;v.path=null;return {ok:true,text:`${v.name} : ligne ${this.cityName(A)} ↔ ${this.cityName(B)}`};}
  goodsOf(sets,at){const map={rare:RARE,materiaux:['bois','pierre','charbon'],minerais:['fer','cuivre','plomb','salpetre'],vivres:['vivres'],industrie:['pieces','carburant'],guerre:['explosifs','sante',...Object.keys(at?.stock||{}).filter(k=>k.startsWith('m:')||k.startsWith('a:'))]};return sets.flatMap(s=>map[s]||[]);}
  // Charger : dans l'ordre des familles choisies, mais sans qu'un seul bien prenne tout — au plus 40 % de la place au premier tour,
  // puis ce qui reste. Un convoi part mêlé : des munitions, des vivres, des pièces, du bois.
  capOf(v){return VEHICLES[v.k].cap*(v.k==='porteur'?this.mod('cap_porteur'):v.k==='train'?this.mod('cap_train'):1);}
  // Les porteurs : des villageois oisifs affectés à un dépôt ; à pied, ils servent les dépôts voisins. Rendus, ils redeviennent
  // villageois là où ils sont (ce qu'ils portent est posé au dépôt le plus proche).
  porters(D){return this.s.vehicles.filter(v=>v.k==='porteur'&&v.base===D.id);}
  addPorters(D,n=2){if(!D||!BUILDINGS[D.k].store||!D.done)return {ok:false,why:['pas un dépôt achevé']};const [x,y]=this.bc(D);
    const us=this.idle(D.f).filter(u=>d2(u.x,u.y,x,y)<60).sort((a,z)=>d2(a.x,a.y,x,y)-d2(z.x,z.y,x,y)).slice(0,n);if(!us.length)return {ok:false,why:['aucun villageois sans rien à faire']};
    for(const u of us){this.s.units.splice(this.s.units.indexOf(u),1);this.uIndex.delete(u.id);const v=this.addVehicle(D.f,'porteur',D);Object.assign(v,{x:u.x,y:u.y,at:null,name:u.name||v.name,u,range:VEHICLES.porteur.range});}
    return {ok:true,n:us.length};}
  releasePorter(v){if(v?.k!=='porteur')return;const D=this.depots(v.f,v.x,v.y)[0];if(D&&Object.keys(v.cargo).length)this.unloadCargo(v,D);const u=v.u;
    if(u){u.x=v.x;u.y=v.y;u.task=null;u.path=null;u.carry=null;this.s.units.push(u);this.uIndex.set(u.id,u);}this.s.vehicles.splice(this.s.vehicles.indexOf(v),1);}
  loadCargo(v,at,to){const V={cap:this.capOf(v)};const goods=this.goodsOf(at.id===v.route.a?v.route.out:v.route.back,at);
    for(const share of [.4,1]){let room=V.cap-this.cargoW(v);for(const k of goods){if(room<=.01)break;const w=weightOf(k,this.s.designs,this.s.armors);const lim=Math.max(0,V.cap*share-(v.cargo[k]||0)*w);
      const q=Math.min(Math.min(room,lim)/w,at.stock[k]||0);const qq=k.startsWith('a:')?Math.floor(q):Math.floor(q*100)/100;if(qq>0){at.stock[k]-=qq;v.cargo[k]=(v.cargo[k]||0)+qq;room-=qq*w;}}}}
  cargoW(v){let s=0;for(const [k,n] of Object.entries(v.cargo))s+=n*weightOf(k,this.s.designs,this.s.armors);return s;}
  unloadCargo(v,at){for(const [k,n] of Object.entries(v.cargo)){const q=this.put(at,k,n);v.cargo[k]-=q;if(v.cargo[k]<=1e-6)delete v.cargo[k];}v.why=Object.keys(v.cargo).length?`${this.depotName(at)} est plein`:null;}
  // Un véhicule roule sur sa ligne fixe (deux arrêts, ce qui part dans chaque sens), ou à la demande du bureau du fret (eco.js).
  vehicleTick(v,dt){if(v.k==='bombardier')return this.bomberTick(v,dt);if(v.mode==='fret')return this.fretTick(v,dt);return this.routeTick(v,dt);}
  routeTick(v,dt){if(!v.route){v.state='idle';return;}
    const A=this.building(v.route.a),B=this.building(v.route.b);if(!A||!B||!A.done||!B.done){v.state='idle';v.why=!A||!B?'un arrêt a disparu':'un arrêt est en ruine';return;}
    const to=v.leg===0?B:A;
    if(v.state==='wait'){v.wait-=dt;if(v.wait<=0){v.state='go';v.path=null;}return;}
    const r=this.moveTo(v,to,dt);if(r==='blocked'){v.state='wait';v.wait=3;return;}if(r===true)this.arrive(v,to);}
  // Aller jusqu'à un dépôt : vrai à l'arrivée, 'blocked' s'il n'y a pas de chemin, faux en route (ou en attente de charbon, de carburant).
  moveTo(v,to,dt){const V=VEHICLES[v.k];if(v.at===to.id&&v.state!=='fly')return true;
    if(v.k==='avion'){
      if(v.state!=='fly'){const from=this.building(v.at)||this.building(v.home);const tx=to.i+1,ty=to.j+1;const dist=d2(v.x,v.y,tx,ty);const fuel=Math.ceil(dist/100*V.fuel);
        if(!from||(from.stock.carburant||0)<fuel){v.why=`attend ${fuel} carburant à ${from?this.cityName(from):'?'}`;return false;}
        from.stock.carburant-=fuel;v.why=null;v.pass=(from.pass||[]).splice(0,V.seats);Object.assign(v,{state:'fly',at:null,ax:v.x,ay:v.y,bx:tx,by:ty,t:0,dur:dist/V.speed+.3,dest:to.id});this.emit({type:'takeoff',x:v.x,y:v.y});return false;}
      v.t+=dt;const q=Math.min(1,v.t/v.dur);v.x=v.ax+(v.bx-v.ax)*q;v.y=v.ay+(v.by-v.ay)*q;v.alt=4*Math.min(1,q/.12,(1-q)/.12);v.dx=v.bx-v.ax;v.dy=v.by-v.ay;
      if(q<1)return false;const [w,h]=BUILDINGS[to.k].size;v.alt=0;
      for(const u of v.pass){u.x=to.i+(this.rand()*w);u.y=to.j+h+.6;u.task=null;this.s.units.push(u);this.uIndex.set(u.id,u);}v.pass=[];v.state='go';v.at=to.id;return true;}
    if(v.k==='train'){
      if(!v.path||v.dest!==to.id){const r=this.railPath(v,to);if(!r){v.why='pas de voie jusque-là';v.path=null;return 'blocked';}
        // la locomotive ne part que le tender assez plein pour le trajet ; elle fait le plein à la gare où elle est
        const need=r.length*FRET.COAL_PER_CASE+.2;if((v.coal||0)<need){const at=this.building(v.at);if(at?.stock){const q=Math.min(this.tender()-(v.coal||0),at.stock.charbon||0);if(q>0){at.stock.charbon-=q;v.coal=(v.coal||0)+q;}}
          if((v.coal||0)<need){v.needCoal=true;v.why=`attend du charbon${at?' à '+this.depotName(at):''} (${need.toFixed(1)} pour le trajet)`;return false;}}
        v.needCoal=false;v.path=r;v.pi=0;v.dest=to.id;v.why=null;v.at=null;}
      const nx=v.path[v.pi];if(nx&&this.rail[nx[1]*this.N+nx[0]]!==2){v.path=null;v.why='voie coupée';return 'blocked';}
      const x0=v.x,y0=v.y;const done=this.slide(v,v.path,V.speed*dt*this.mod('vit_train'));v.coal=Math.max(0,(v.coal||0)-d2(x0,y0,v.x,v.y)*FRET.COAL_PER_CASE);
      if(done){v.path=null;v.at=to.id;return true;}return false;}
    if(!v.path||v.dest!==to.id){const [w,h]=BUILDINGS[to.k].size;const N=this.N;const goal=k=>{const i=k%N,j=(k/N)|0;return i>=to.i-1&&i<=to.i+w&&j>=to.j-1&&j<=to.j+h;};
      if(goal(Math.floor(v.y)*N+Math.floor(v.x))){v.at=to.id;v.path=null;return true;}
      const r=this.pather.find(Math.floor(v.x),Math.floor(v.y),to.i+1,to.j+1,this.costFn(v.f),goal,40000);if(!r.done){v.why='pas de chemin par la terre';return 'blocked';}v.path=r.path.map(([i,j])=>[i,j]);v.pi=0;v.dest=to.id;v.why=null;v.at=null;}
    if(this.slide(v,v.path,V.speed*dt*(v.k==='porteur'?this.mod('vit_marche')*(this.cargoW(v)>this.capOf(v)*.6?.8:1):1))){v.path=null;v.at=to.id;return true;}return false;}
  slide(v,path,left){while(left>0){if(v.pi>=path.length)return true;const [i,j]=path[v.pi];const tx=i+.5,ty=j+.5;const dx=tx-v.x,dy=ty-v.y,d=Math.hypot(dx,dy);if(d>1e-6){v.dx=dx/d;v.dy=dy/d;}
      if(d<=left){v.x=tx;v.y=ty;left-=d;v.pi++;if(v.trail){v.trail.unshift([v.x,v.y]);if(v.trail.length>12)v.trail.pop();}}else{v.x+=dx/d*left;v.y+=dy/d*left;left=0;}}return v.pi>=path.length;}
  arrive(v,to){this.unloadCargo(v,to);this.practice('logistique',1);v.leg=1-v.leg;const dest=v.leg===0?this.building(v.route.b):this.building(v.route.a);this.loadCargo(v,to,dest);v.state='wait';v.wait=v.k==='train'?1.2:.6;v.path=null;
    this.emit({type:'stop',kind:v.k,x:v.x,y:v.y});}
  railPath(v,to){const N=this.N;const goal=this.platform(to);if(!goal)return null;const gk=goal[1]*N+goal[0];const st=Math.floor(v.y)*N+Math.floor(v.x);if(this.rail[st]!==2&&this.rail[st]!==1)return null;
    const from=new Map([[st,-1]]);const q=[st];let found=false,qi=0;while(qi<q.length){const k=q[qi++];if(k===gk){found=true;break;}const i=k%N,j=(k/N)|0;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(this.rail[kk]!==2||from.has(kk))continue;from.set(kk,k);q.push(kk);}}
    if(!found)return null;const out=[];for(let k=gk;k!==st&&k!==-1;k=from.get(k))out.push([k%N,(k/N)|0]);return out.reverse();}
  bomb(vid,x,y){const v=this.s.vehicles.find(z=>z.id===vid);if(!v||v.k!=='bombardier')return {ok:false,why:['pas un bombardier']};if(v.state!=='idle')return {ok:false,why:['il est en vol']};
    const home=this.building(v.home);if(!home?.done)return {ok:false,why:['son aérodrome est en ruine']};const V=VEHICLES.bombardier;const dist=d2(v.x,v.y,x,y)*2;const fuel=Math.ceil(dist/100*V.fuel);
    if((home.stock.carburant||0)<fuel)return {ok:false,why:[`${fuel} carburant à l’aérodrome`]};if((home.stock.explosifs||0)<V.bombs)return {ok:false,why:[`${V.bombs} caisses d’explosifs à l’aérodrome (les bombes)`]};
    home.stock.carburant-=fuel;home.stock.explosifs-=V.bombs;if(!this.atWar)this.declareWar('meumeu');this.sortie(v,x,y);this.emit({type:'takeoff',x:v.x,y:v.y});return {ok:true,text:`${v.name} décolle vers la cible`};}
  sortie(v,x,y){const L=d2(v.x,v.y,x,y)||1;const ux=(x-v.x)/L,uy=(y-v.y)/L;const ex=x+ux*(BOMB.stick+1),ey=y+uy*(BOMB.stick+1);
    Object.assign(v,{state:'out',tx:x,ty:y,ex,ey,ax:v.x,ay:v.y,t:0,dur:d2(v.x,v.y,ex,ey)/VEHICLES.bombardier.speed+.1,dropped:0});}
  bomberTick(v,dt){const V=VEHICLES.bombardier;if(v.state==='idle'||v.state==='down')return;
    if(v.state==='out'||v.state==='back'){v.t+=dt;const q=Math.min(1,v.t/v.dur);const bx=v.state==='out'?v.ex:v.hx,by=v.state==='out'?v.ey:v.hy;v.x=v.ax+(bx-v.ax)*q;v.y=v.ay+(by-v.ay)*q;v.dx=bx-v.ax;v.dy=by-v.ay;v.alt=5*Math.min(1,q/.1,v.state==='back'?(1-q)/.1:1);
      if(v.state==='out'){const L=Math.hypot(v.dx,v.dy)||1;const rem=((v.tx-v.x)*v.dx+(v.ty-v.y)*v.dy)/L;const n=V.bombs;const S=BOMB.stick;const want=q>=1?n:Math.floor(clamp((S-rem)/(2*S)*n+.5,0,n));
        while(v.dropped<want&&v.dropped<n){v.dropped++;this.s.falls.push({id:this.id(),kind:'bomb',f:v.f,x0:v.x,y0:v.y,x1:v.x+v.dx/L*.6+(this.rand()-.5)*.8,y1:v.y+v.dy/L*.6+(this.rand()-.5)*.8,alt:v.alt,t:0,dur:BOMB.fall});}}
      if(q>=1){if(v.state==='out'){const home=v.f==='beee'?this.beeeHome(v):this.building(v.home);v.hx=home?home.i+1:v.ax;v.hy=home?home.j+1:v.ay;Object.assign(v,{state:'back',ax:v.x,ay:v.y,t:0,dur:d2(v.x,v.y,v.hx,v.hy)/V.speed+.2});}
        else{v.state='idle';v.alt=0;if(v.f==='beee')this.s.vehicles.splice(this.s.vehicles.indexOf(v),1);}}}}
  beeeHome(v){return this.s.buildings.filter(b=>b.f==='beee'&&b.k==='aerodrome'&&b.done).sort((a,z)=>d2(a.i,a.j,v.x,v.y)-d2(z.i,z.j,v.x,v.y))[0]||null;}

  // ---------- le temps ----------
  update(dt){let left=dt;while(left>1e-9){const d=Math.min(.025,left);this.tick(d);left-=d;}}
  tick(dt){const s=this.s;this.dt=dt;this.dts=dt*HOUR_REAL;s.t+=dt;
    for(const u of [...s.units])if(alive(u))this.unitTick(u,dt);
    s.units=s.units.filter(u=>{if(alive(u))return true;this.uIndex.delete(u.id);if(u.sq)this.leave(u);return false;});
    for(const b of [...s.buildings])this.buildingTick(b,dt);
    for(const v of [...s.vehicles])this.vehicleTick(v,dt);
    this.shotsTick(dt);this.fallsTick(dt);this.flakTick(dt);this.defenseTick();this.squadTick();this.beeeTick(dt);this.innovTick(dt);
    for(const nd of s.nodes)if(nd.type==='bush'&&nd.left<nd.max)nd.left=Math.min(nd.max,nd.left+dt*nd.max/NODES.bush.regrow);
    if(s.corpses.length&&s.t-s.corpses[0].t>3*DAY)s.corpses.shift();
    if(s.smokes.length)s.smokes=s.smokes.filter(m=>m.end>s.t);
    this.checkEnd();}

  // ---------- les Meumeu, les soldats ----------
  unitTick(u,dt){const D=UDEF(u);const dts=this.dts;u.cool=Math.max(0,(u.cool||0)-dts);u.reload=Math.max(0,(u.reload||0)-dts);u.supp=(u.supp||0)*Math.exp(-dts/5);
    // le corps : le sang coule, on tombe, on meurt
    if(u.h){const ch=tickHealth(u.h,dts);if(ch)this.stateChange(u,ch);if(u.h.log?.length&&u.h.log[u.h.log.length-1].t==null)u.h.log[u.h.log.length-1].t=this.s.t;if(!alive(u))return;
      if(u.h.state==='hors'){u.anim='down';u.task=u.task?.kind==='carried'?u.task:null;u.path=null;u.post='couche';return;}}
    if(u.role==='munitions'&&u.sq)this.bearerTick(u);
    // un servant rejoint sa pièce quand elle s'arrête
    if(u.serve&&(!u.task||u.task.kind==='guard')){const g=this.unit(u.serve);if(g&&alive(g)&&this.s.t-(g.moved||-9)>.05){const tx=g.x-.45,ty=g.y+.35;if(Math.hypot(u.x-tx,u.y-ty)>.9)u.task={kind:'guard',tx,ty};}}
    // se réapprovisionner : munitions de sa conception, grenades, trousses — dans les dépôts proches
    u.resup=(u.resup||0)-dts;if(u.resup<=0){u.resup=3;this.resupply(u);this.selfCare(u);}
    const T0=u.task;
    // la posture : debout en marche ; accroupi au combat ; couché sous le feu (ou sur ordre). Pas un coup de feu avant la guerre.
    const threat=(D.arm||D.img)&&this.atWar?this.nearestEnemy(u,Math.max(this.sight(),this.engageRange(u))):null;
    u.post=u.orderPost||(u.anim==='walk'?'debout':threat?(u.supp>.45?'couche':'accroupi'):'debout');
    if(D.medic&&this.medicTick(u,T0))return;
    if(u.k==='villageois'&&u.supp>.3&&T0?.kind!=='shelter'&&this.atWar){this.shelter(u);}
    // les combattants répondent : ils voient loin, tirent à portée, vont chercher l'ennemi
    if((D.arm||D.img)&&(!T0||T0.kind==='assault'||T0.kind==='guard'||(T0.kind==='move'&&T0.hold))){const e=threat||(T0?.kind==='assault'?null:null);
      if(e){if(this.engage(u,e))return;if(T0?.kind!=='assault'&&!u.hold){this.go(u,e.x,e.y);return;}}}
    if(!T0){u.anim=u.anim==='aim'?'aim':'idle';if(u.carry&&u.k==='villageois')this.deliverTick(u);return;}
    switch(T0.kind){
      case 'move':case 'guard':{if(this.go(u,T0.tx,T0.ty)){if(T0.fx!=null)this.face(u,T0.fx,T0.fy);if(T0.kind==='move'){u.task=T0.back||null;u.path=null;}}return;}
      case 'hosp':{const b=this.building(T0.b);if(!b||!b.done||(b.wardList||[]).length>=BUILDINGS[b.k].ward){u.task=null;return;}const [w,h]=BUILDINGS[b.k].size;if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;
        this.admit(b,u);return;}
      case 'assault':{if(u.blockedBy!=null&&!this.wall[u.blockedBy])u.blockedBy=null;
        if(!this.atWar){if(this.go(u,T0.tx,T0.ty))u.task={kind:'guard',tx:T0.tx,ty:T0.ty};return;}
        const e=this.nearestEnemy(u,this.engageRange(u))||this.nearestEnemyBuilding(u,this.engageRange(u)*.6);
        if(e){if(this.engage(u,e))return;const [x,y]=this.posOf(e);if(e.i!=null&&BUILDINGS[e.k]){const [w,h]=BUILDINGS[e.k].size;this.go(u,x,y,[e.i,e.j,w,h]);}else this.go(u,x,y);return;}
        if(u.blockedBy!=null){this.engage(u,{wall:u.blockedBy,x:u.blockedBy%this.N+.5,y:((u.blockedBy/this.N)|0)+.5});return;}
        if(this.go(u,T0.tx,T0.ty)){if(T0.fx!=null)this.face(u,T0.fx,T0.fy);u.task=u.f==='beee'?{kind:'assault',tx:T0.tx,ty:T0.ty,hunt:true}:{kind:'guard',tx:T0.tx,ty:T0.ty};if(u.f==='beee')this.beeeRetarget(u);}return;}
      case 'attack':{const e=T0.unit!=null?this.unit(T0.unit):T0.b!=null?this.building(T0.b):T0.wall!=null?(this.wall[T0.wall]?{wall:T0.wall,x:T0.wall%this.N+.5,y:((T0.wall/this.N)|0)+.5}:null):null;
        if(!e||(e.hp!=null&&e.hp<=0)||e.ruin||(e.h&&e.h.state!=='ok'&&e.h.state!=='blesse')){u.task=null;return;}
        if(!this.engage(u,e)){const [x,y]=this.posOf(e);if(e.k&&BUILDINGS[e.k]&&e.i!=null){const [w,h]=BUILDINGS[e.k].size;this.go(u,x,y,[e.i,e.j,w,h]);}else this.go(u,x,y);}return;}
      case 'gather':return this.gatherTick(u,T0,dt);
      case 'deposit':{const b=this.building(T0.b);if(!b||!u.carry){u.task=null;return;}this.deliverTo(u,b);return;}
      case 'build':case 'repair':{const b=this.building(T0.b);if(!b||(T0.kind==='build'&&b.done)||(T0.kind==='repair'&&(b.ruin||!b.done||(b.hp>=b.max-.5&&!b.fire)))){u.task=null;return;}
        // un bâtisseur meumeu qui va chercher des matériaux au dépôt du chantier
        if(T0.kind==='build'&&T0.fetch!=null&&u.f==='meumeu'){this.fetchTick(u,T0,b,dt);return;}
        const [w,h]=BUILDINGS[b.k].size;if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;u.anim='action';this.face(u,b.i+w/2-u.x,b.j+h/2-u.y);
        if(T0.kind==='build'){
          // on ne bâtit que ce qui est payé : les bâtisseurs prennent les matériaux aux dépôts proches, à mesure qu'ils arrivent
          const frac=this.sitePaidFrac(b);if(b.progress>=frac-1e-6&&(u.f==='meumeu'?!this.haulTick(u,T0,b,dt):!this.sitePay(b))){if(u.f!=='meumeu'){u.anim='idle';b.why=`attend des matériaux : ${this.siteMissing(b)}`;}return;}b.why=null;
          const nb=this.s.units.filter(x=>x.task?.kind==='build'&&x.task.b===b.id).length;b.progress=Math.min(this.sitePaidFrac(b),1,b.progress+dt/BUILDINGS[b.k].hours*(1/Math.sqrt(Math.max(1,nb))*1.2)*this.mod('construction'));this.practice('construction',dt);b.hp=Math.max(b.hp,b.max*b.progress);
          if(b.progress>=1){b.done=true;const was=b.ruin;b.ruin=false;b.why=null;b.hp=Math.max(b.hp,b.max*.6);this.autoLink(b);this.log(this.cityName(b),`${BUILDINGS[b.k].name} : ${was?'rebâti':'terminé'}.`,'good');this.emit({type:'built',x:b.i+w/2,y:b.j+h/2,k:b.k});u.task=null;
            if(BUILDINGS[b.k].workers&&this.workers(b).length<BUILDINGS[b.k].workers)u.task={kind:'work',b:b.id};}}
        else{if(b.fire>0){b.fire=Math.max(0,b.fire-dt*3);}else b.hp=Math.min(b.max,b.hp+dt*60);}return;}
      case 'work':{const b=this.building(T0.b);if(!b||!b.done){u.task=null;return;}if(BUILDINGS[b.k].hub)return this.hubTick(u,b,dt);const [w,h]=BUILDINGS[b.k].size;u.at=this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]);u.anim=u.at&&b.working?'action':'idle';return;}
      case 'line':return this.lineTick(u,T0,dt);
      case 'evac':return this.evacTick(u,T0);
      case 'shelter':{const b=this.building(T0.b);if(!b||!b.done){u.task=null;return;}const [w,h]=BUILDINGS[b.k].size;if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;
        if((b.hide||[]).length>=(BUILDINGS[b.k].shelter||0)){u.task=null;return;}(b.hide??=[]).push(u);this.s.units.splice(this.s.units.indexOf(u),1);this.uIndex.delete(u.id);u.task=null;u.path=null;return;}
      case 'board':{const b=this.building(T0.b);if(!b||!b.done){u.task=null;return;}const [w,h]=BUILDINGS[b.k].size;if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;
        (b.pass??=[]).push(u);this.s.units.splice(this.s.units.indexOf(u),1);this.uIndex.delete(u.id);u.task=null;return;}}}
  stateChange(u,st){if(st==='mort'){this.death(u);return;}
    if(st==='hors'){this.emit({type:'down',id:u.id,x:u.x,y:u.y,f:u.f,cause:u.h.cause});if(u.f==='meumeu')this.log(this.nearCity(u),`${u.name||UNITS[u.k].name} est à terre : ${u.h.cause}.`,'bad');}}
  death(u){if(u.hp<=0)return;u.hp=0;const cause=u.h?.cause||'tué';this.s.corpses.push({x:u.x,y:u.y,f:u.f,k:u.k,t:this.s.t,dir:u.dir,sheet:UDEF(u).sheet,bl:u.h?1-u.h.blood/BLOOD:0,wounds:(u.h?.wounds||[]).map(w=>({entry:w.entry,exit:w.exit,sev:w.sev}))});if(this.s.corpses.length>200)this.s.corpses.shift();
    this.emit({type:'death',x:u.x,y:u.y,f:u.f,k:u.k,id:u.id});if(u.f==='meumeu')this.log(this.nearCity(u),`${u.name||UNITS[u.k]?.name} est mort (${cause}).`,'bad');}
  resupply(u){const D=UDEF(u);const beeeHome=u.f==='beee'&&this.s.buildings.some(b=>b.f==='beee'&&b.done&&this.distB(b,u.x,u.y)<RADIUS);
    if(u.w){const W=this.W(u.w);const want=W.carry-u.pouch;if(want>W.p.mag){if(beeeHome)u.pouch=W.carry;else{const crates=this.take(u.f,u.x,u.y,'m:'+u.w,want/W.perCrate);u.pouch+=Math.floor(crates*W.perCrate);}}}
    if(D.smoke&&(u.smoke||0)<D.smoke){if(beeeHome)u.smoke=D.smoke;else{const g=this.take(u.f,u.x,u.y,'explosifs',(D.smoke-(u.smoke||0))/20);u.smoke=(u.smoke||0)+Math.floor(g*20+1e-6);}}
    if(D.grenades&&u.gren<D.grenades){if(beeeHome)u.gren=D.grenades;else{const g=this.take(u.f,u.x,u.y,'explosifs',(D.grenades-u.gren)/10);u.gren+=Math.floor(g*10+1e-6);}}
    if(D.medic&&u.kits<D.kits){const g=this.take(u.f,u.x,u.y,'sante',(D.kits-u.kits)/4);u.kits+=Math.floor(g*4+1e-6);}
    if(D.tents&&u.tents<D.tents&&this.canPay(u.f,u.x,u.y,{sante:1,bois:5}).ok){this.pay(u.f,u.x,u.y,{sante:1,bois:5});u.tents++;}
    if(D.img&&u.shells<8){if(beeeHome)u.shells=8;else{const g=this.take(u.f,u.x,u.y,'explosifs',(8-u.shells)/6);u.shells+=Math.floor(g*6+1e-6);}}}
  // Toutes les trois secondes : un soldat à sec va chercher des munitions ; un blessé qui saigne encore, qui a un bras cassé
  // ou un pneumothorax se replie vers l'hôpital (le saignement interne ne s'arrête qu'au bloc).
  selfCare(u){const D=UDEF(u);const T0=u.task;
    if(D.arm&&u.w&&u.mag<=0&&u.pouch<=0&&(!T0||T0.kind==='guard'||T0.kind==='assault')){
      if(u.f==='beee'){this.beeeRetarget(u);return;}
      const W=this.W(u.w);const dep=this.s.buildings.filter(b=>b.f===u.f&&this.isDepot(b)&&(b.stock['m:'+u.w]||0)>=W.p.mag/W.perCrate).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0];
      if(dep){const [w,h]=BUILDINGS[dep.k].size;u.task={kind:'move',tx:dep.i+w/2,ty:dep.j+h+.6,back:T0&&T0.kind!=='assault'?T0:null};u.path=null;u.why='à sec : il va chercher des munitions';}
      else u.why=`à sec : aucun dépôt n’a de munitions ${this.design(u.w)?.name||''}`;return;}
    if(u.why?.startsWith('à sec')&&(u.mag>0||u.pouch>0))u.why=null;
    if(u.h&&u.f==='meumeu'&&u.h.state==='blesse'&&T0?.kind!=='hosp'&&T0?.kind!=='evac'){const h=u.h;
      const need=needsSurgery(h)||bleedRate(h)>.01||h.arms>0||h.pneumo>0||h.legs>0||(h.lost||[]).length;
      if(need){const b=needsSurgery(h)?this.careFor(u):this.hospitalFor(u)||this.careFor(u);if(b){u.task={kind:'hosp',b:b.id};u.path=null;u.why=null;}else u.why='blessé : il faudrait une tente médicale ou un hôpital';}}}
  // Attaquer les Bèè en temps de paix, c'est leur déclarer la guerre.
  declareWar(by){const B=this.s.beee;if(this.atWar)return;B.warDay=this.day;B.told=99;B.nextWave=this.s.t+DAY*.8;B.nextAir=this.s.t+BEEE.air*DAY;
    this.log('Frontière',by==='meumeu'?'Nous avons ouvert le feu : c’est la guerre avec les Bèè.':'Les Bèè ont déclaré la guerre.','bad');this.emit({type:'war',text:by==='meumeu'?'Nous avons déclaré la guerre aux Bèè.':'Les Bèè ont déclaré la guerre.'});}
  // Un fumigène : lancé entre soi et l'ennemi le plus proche (ou droit devant) ; un nuage que les balles traversent, pas les regards
  throwSmoke(u,x=null,y=null){if(!(u.smoke>0)||!active(u))return false;if(x==null){const e=this.nearestEnemy(u,20);const dx=e?e.x-u.x:u.fx||1,dy=e?e.y-u.y:u.fy||0;const L=Math.hypot(dx,dy)||1;const d=Math.min(3,e?L*.45:2.5);x=u.x+dx/L*d;y=u.y+dy/L*d;}
    u.smoke--;this.s.shots.push({kind:'smokeg',f:u.f,by:u.id,x0:u.x,y0:u.y,x1:x,y1:y,t:0,dur:1.5/HOUR_REAL});this.emit({type:'throw',x:u.x,y:u.y});return true;}
  smokeOrder(ids){let n=0;for(const id of ids){const u=this.unit(id);if(u&&this.throwSmoke(u))n++;}return n;}
  posOf(e){if(e.wall!=null)return [e.x,e.y];if(e.k&&BUILDINGS[e.k]&&e.i!=null){const [w,h]=BUILDINGS[e.k].size;return [e.i+w/2,e.j+h/2];}return [e.x,e.y];}
  // ce qu'on voit : 18 cases (72 m) le jour, la moitié la nuit
  sight(){return 9+9*this.light();}
  // la portée d'engagement : ce que l'arme porte utilement (un peu plus), et ce qu'on voit
  engageRange(u){const D=UDEF(u);if(D.img)return D.range;if(!u.w)return 3;const W=this.W(u.w);return clamp(W.eff*1.25/TILE_M,3,16);}
  // voir : un bâtiment entre deux points cache (on ne voit pas à travers les maisons)
  los(ax,ay,bx,by){for(const s of this.s.smokes){const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy||1;const t=Math.max(0,Math.min(1,((s.x-ax)*dx+(s.y-ay)*dy)/L2));if(Math.hypot(ax+dx*t-s.x,ay+dy*t-s.y)<s.r*Math.min(1,(s.end-this.s.t)/1+.3))return false;}
  const d=d2(ax,ay,bx,by);const n=Math.ceil(d*2);for(let k=1;k<n;k++){const x=ax+(bx-ax)*k/n,y=ay+(by-ay)*k/n;const o=this.occ[Math.floor(y)*this.N+Math.floor(x)];if(o>=0){const b=this.bIndex.get(o);if(b&&!b.ruin&&this.distB(b,ax,ay)>.6&&this.distB(b,bx,by)>.6)return false;}}return true;}
  nearestEnemy(u,r){let best=null,bd=r;for(const e of this.s.units){if(e.f===u.f||!active(e))continue;const d=d2(e.x,e.y,u.x,u.y);if(d<bd&&this.los(u.x,u.y,e.x,e.y)){bd=d;best=e;}}return best;}
  nearestEnemyBuilding(u,r){let best=null,bd=r;for(const b of this.s.buildings){if(b.f===u.f||b.ruin)continue;const d=this.distB(b,u.x,u.y);if(d<bd){bd=d;best=b;}}return best;}

  // ---------- tirer ----------
  // Engager : à portée et à vue, on vise (le temps de viser dépend de l'arme), on tire au rythme de la culasse,
  // on recharge le chargeur depuis les munitions qu'on porte. Faux si l'on doit d'abord se rapprocher.
  engage(u,e){const D=UDEF(u);const [x,y]=this.posOf(e);const isB=e.k&&BUILDINGS[e.k]&&e.i!=null;const distT=isB?this.distB(e,u.x,u.y):d2(x,y,u.x,u.y);
    if(D.img)return this.cannon(u,e,distT,isB);
    // un fusil ne démolit pas une maison : au contact, on la saccage (on y met le feu, on arrache, on fait sauter) ; les commandos y jettent leurs grenades
    if(isB||e.wall!=null){if(distT>(isB?.9:1.5))return false;this.face(u,x-u.x,y-u.y);u.anim='action';u.path=null;
      if(u.gren>0&&(u.gcool||0)<=0){u.gcool=6;u.gren--;this.s.shots.push({kind:'grenade',f:u.f,by:u.id,x0:u.x,y0:u.y,x1:x,y1:y,t:0,dur:BLASTS.grenade.fuse/HOUR_REAL});this.emit({type:'throw',x:u.x,y:u.y});}
      u.gcool=Math.max(0,(u.gcool||0)-this.dts);this.damage(e,SACK.hp*this.dt,u.f);if(isB&&e.fire<=0&&this.rand()<SACK.fire*this.dt){e.fire=FIRE.hours;this.emit({type:'fire',x:e.i+1,y:e.j+1});}return true;}
    if(!u.w)return false;const W=this.W(u.w);if(distT>this.engageRange(u))return false;
    if(!isB&&e.wall==null&&!this.los(u.x,u.y,x,y))return false;
    this.face(u,x-u.x,y-u.y);u.anim='aim';u.path=null;
    if(u.supp>.85&&this.rand()<.7)return true;                 // cloué au sol
    // une grenade : un ennemi à portée de lancer, ou un bâtiment à nettoyer
    if(u.gren>0&&(u.gcool||0)<=0&&distT<=BLASTS.grenade.throw&&distT>.35){u.gcool=6;u.gren--;const sp=.35+distT*.12;
      this.s.shots.push({kind:'grenade',f:u.f,by:u.id,x0:u.x,y0:u.y,x1:x+(this.rand()-.5)*sp,y1:y+(this.rand()-.5)*sp,t:0,dur:BLASTS.grenade.fuse/HOUR_REAL});this.emit({type:'throw',x:u.x,y:u.y});return true;}
    u.gcool=Math.max(0,(u.gcool||0)-this.dts);
    if(u.reload>0)return true;
    // une pièce : elle se met en batterie (immobile) avant de tirer ; il manque des servants, elle tire et recharge lentement
    let miss=0;if(W.crew>1){const mv=this.s.t-(u.moved||-9)<.03;u.deployT=mv?0:(u.deployT||0)+this.dts;if(u.deployT<W.setup){u.why='mise en batterie';return true;}if(u.why==='mise en batterie')u.why=null;miss=Math.max(0,W.crew-1-this.servants(u).length);}
    if(u.mag<=0){if(u.pouch>0){const n=Math.min(W.p.mag,u.pouch);u.mag=n;u.pouch-=n;u.reload=(W.p.mag>12?4:W.p.action==='verrou'?3:2.5)*(1+miss*.8);u.burst=0;this.emit({type:'reload',x:u.x,y:u.y});return true;}u.dry=true;return false;}
    u.dry=false;if(u.cool>0)return true;if(u.f==='meumeu')this.practice('tir',.03);
    if(u.aimAt!==(e.id??e.wall??'b')){u.aimAt=e.id??e.wall??'b';u.cool=W.aim*(u.post==='couche'?1.2:1);return true;}
    // le coup part
    u.mag--;if(ACTIONS[W.p.action]?.auto){u.burst=(u.burst||0)+1;if(u.burst>=4){u.burst=0;u.cool=W.aim*.7;}else u.cool=W.cyc;}else{u.burst=0;u.cool=W.cyc+W.aim*.4;}if(miss)u.cool*=1+miss*.5;
    const R=distT*TILE_M;const fl=W.at(R);
    const share={};let ix=x,iy=y;for(let k=0;k<(isB||e.wall!=null?1:(W.pel||1));k++){const res=isB||e.wall!=null?{hit:true,struct:true,v:fl.v}:this.resolve(u,e,W,R,u.burst||0,share);
      [ix,iy]=res.hit?[x,y]:[res.px??x,res.py??y];
      this.s.shots.push({kind:'round',f:u.f,by:u.id,w:u.w,x0:u.x,y0:u.y,x1:ix,y1:iy,t:0,dur:Math.max(.01,fl.t)/HOUR_REAL,res,target:isB?{b:e.id}:e.wall!=null?{wall:e.wall}:{u:e.id},R,tracer:!!CONSTRUCTIONS[W.p.cons].tracer});}
    this.emit({type:'shot',x:u.x,y:u.y,x1:ix,y1:iy,f:u.f,cal:W.p.d,v0:W.v0,E:W.E0,sup:W.v0>340,tr:!!CONSTRUCTIONS[W.p.cons].tracer});u.xp=(u.xp||0)+.05;return true;}
  // Où va la balle : la dispersion (l'arme, le tireur, sa posture, le feu qu'il subit, sa blessure, le recul de la rafale),
  // l'erreur d'estimation de la distance (la chute), puis ce qu'elle rencontre : le couvert (et s'il le perce), le corps.
  resolve(u,e,W,R,burst,share=null){const D=UDEF(u);const skill=(D.skill||2.4)/(1+(u.xp||0)/60)/(u.f==='meumeu'?this.mod('tir'):1);const moving=this.s.t-(u.moved||-9)<.03;
    const sigS=skill*POST[u.post||'debout']*(moving?2.4:1)*(1+1.5*(u.supp||0))*(u.h?malus(u.h).aim:1)*(u.armor?this.armorOf(u.armor)?.D.aim||1:1);
    const sigW=W.moa*.291;const sigR=burst*W.rk*9;const sig=Math.hypot(sigS,sigW,sigR)/1000*(W.tracer&&burst>0?.7:1);
    const fl=W.at(R),fl2=W.at(R+1);const slope=fl2.drop-fl.drop;const dropErr=slope*.12*R;
    let ex,ey;if(share?.ex!=null){ex=share.ex;ey=share.ey;}else{ex=sig*R*this.gauss();ey=sig*R*this.gauss()+dropErr*this.gauss();if(share){share.ex=ex;share.ey=ey;}}
    if(W.pel>1){const sp=(CONSTRUCTIONS[W.p.cons].spread||20)/1000*R/2;ex+=sp*this.gauss()*.7;ey+=sp*this.gauss()*.7;}
    const post=e.post||'debout';const aimY=AIM[post];
    // le couvert, devant la cible
    const cov=this.coverFor(e,u.x,u.y);let v=fl.v,yaw0=0;
    const hy=aimY+ey;
    if(cov&&hy<cov.h&&this.rand()<cov.p){const pen=W.pen(v);if(pen>cov.eq){v*=Math.sqrt(1-cov.eq/pen);yaw0=.4+this.rand()*1.1;this.emit({type:'pierce',x:e.x,y:e.y});}
      else return {hit:false,cover:cov.kind,px:e.x+(u.x-e.x)*.08,py:e.y+(u.y-e.y)*.08,near:.2};}
    // le corps : la balle arrive de la direction du tireur ; on se place dans le repère de la cible
    const tx=u.x-e.x,ty=u.y-e.y;const tl=Math.hypot(tx,ty)||1;const fx=e.fx??1,fy=e.fy??0;const cross=fx*ty/tl-fy*tx/tl,dot=fx*tx/tl+fy*ty/tl;const alpha=Math.atan2(cross,dot);
    const dirL=[0,-slope,-1];const oL=[ex,hy,2];const hit=this.bodyRay(oL,dirL,alpha,post,e.f);
    if(!hit){const near=Math.hypot(ex,hy-BODY_H/2);const k=.4+this.rand()*1.6;return {hit:false,near,px:e.x-tx/tl*k+(this.rand()-.5)*.3,py:e.y-ty/tl*k+(this.rand()-.5)*.3};}
    // la protection : la balle entre-t-elle par une plaque ?
    let plate=null;const Ar=e.armor&&this.armorOf(e.armor);if(Ar){const zone=plateZone(hit.p);if(zone&&Ar.D.zones[zone]?.t>0){const r=armorHit(Ar.D,zone,e,W.proj||W,v,W.pen(v),this.rand);
        if(r?.stopped)return {hit:true,stopped:true,zone,v,blunt:r.blunt,mat:r.mat,armor:Ar.A.name,p:hit.p,d:hit.d,eq:r.eq};if(r){v=r.v;yaw0=Math.max(yaw0,.5+this.rand()*.8);plate=zone;}}}
    const rec=wound(W.proj||W,v,hit.p,hit.d,this.rand,yaw0);return {hit:true,rec,v,plate,cover:cov&&hy<cov.h?cov.kind:null};}
  // Le rayon d'une balle dans le repère du corps, selon la posture ; renvoie le point d'entrée, ou rien (elle passe à côté)
  bodyRay(oL,dL,alpha,post,sp='meumeu'){setSpecies(sp);const ca=Math.cos(-alpha),sa=Math.sin(-alpha);const rot=v=>[v[0]*ca+v[2]*sa,v[1],-v[0]*sa+v[2]*ca];let o=rot(oL),d=rot(dL);
    if(post==='accroupi'){o=[o[0],o[1]/.72,o[2]];d=[d[0],d[1]/.72,d[2]];}
    else if(post==='couche'){const h0=.045,c=.15;const tr=v=>[v[0],v[2]+c,h0-v[1]];const trd=v=>[v[0],v[2],-v[1]];o=tr(o);d=trd(d);}
    const n=Math.hypot(d[0],d[1],d[2]);d=[d[0]/n,d[1]/n,d[2]/n];
    // la boîte qui contient le corps, pour ne marcher que dedans
    const bmin=[-.105,0,-.065],bmax=[.105,BODY_H+.01,.075];let t0=0,t1=6;for(let a=0;a<3;a++){if(Math.abs(d[a])<1e-9){if(o[a]<bmin[a]||o[a]>bmax[a])return null;continue;}let ta=(bmin[a]-o[a])/d[a],tb=(bmax[a]-o[a])/d[a];if(ta>tb)[ta,tb]=[tb,ta];t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)return null;}
    for(let t=t0;t<=t1;t+=.0005){const p=[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t];if(regionAt(p))return {p:[p[0]-d[0]*.001,p[1]-d[1]*.001,p[2]-d[2]*.001],d};}return null;}
  // Le couvert d'une cible, vu du tireur : un mur, une maison, une ruine, un arbre, juste devant elle.
  // h : sa hauteur (m) ; eq : son épaisseur en acier équivalent (mm) ; p : la chance qu'il soit sur la trajectoire.
  coverFor(e,sx,sy){const dx=sx-e.x,dy=sy-e.y;const L=Math.hypot(dx,dy)||1;let best=null;
    for(const s of [.35,.6,.9]){const x=e.x+dx/L*s,y=e.y+dy/L*s;const i=Math.floor(x),j=Math.floor(y);if(i<0||j<0||i>=this.N||j>=this.N)continue;const k=j*this.N+i;
      let c=null;const w=this.wall[k];if(Math.abs(w)===2)c={kind:'mur',h:.25,eq:3*(w>0?this.mod('couvert'):1),p:.95};
      else if(this.occ[k]>=0){const b=this.bIndex.get(this.occ[k]);if(b)c=b.ruin?{kind:'ruine',h:.16,eq:2.5,p:.8}:{kind:'maison',h:.6,eq:1.2,p:1};}
      else if(this.nodeAt[k]>=0){const nd=this.s.nodes[this.nodeAt[k]];if(nd.type==='tree'&&nd.left>0)c={kind:'arbre',h:1,eq:4,p:.35};else if(nd.type==='rock'&&nd.left>0)c={kind:'rocher',h:.12,eq:8,p:.7};}
      if(c&&(!best||c.h*c.p>best.h*best.p))best=c;}
    return best;}
  // Le canon : il tire des obus en cloche ; ils éclatent à l'arrivée
  cannon(u,e,distT,isB){const D=UDEF(u);if(distT>D.range)return false;const [x,y]=this.posOf(e);this.face(u,x-u.x,y-u.y);u.anim='aim';if(u.cool>0)return true;if(u.shells<=0){u.dry=true;return false;}
    u.shells--;u.cool=D.cd;const sp=.25+distT*.05;this.s.shots.push({kind:'shell',f:u.f,by:u.id,x0:u.x,y0:u.y,x1:x+(this.rand()-.5)*sp,y1:y+(this.rand()-.5)*sp,t:0,dur:(.6+distT*.06)/HOUR_REAL,vsB:D.vsB});
    this.emit({type:'cannon',x:u.x,y:u.y,f:u.f});return true;}

  // ---------- les soins ----------
  // L'infirmier et le médecin soignent d'abord celui que le triage désigne : rouge (il mourra sans soins), puis jaune, puis vert ;
  // les « dépassés » en dernier. Ensuite ils ramènent ceux qui sont à terre vers la tente médicale la plus proche, ou l'hôpital ;
  // les infirmiers font aussi l'évacuation de la tente vers l'hôpital. Le médecin va opérer dans une tente voisine s'il y a à faire.
  medicTick(u,T0){const D=UDEF(u);if(T0&&!['soigne','evac','operer'].includes(T0.kind)&&!T0.auto)return false;
    if(T0?.kind==='soigne'){const e=this.unit(T0.id);const need=e&&alive(e)&&e.h&&(D.doctor?needsDoctor(e.h):needsCare(e.h));if(!need){u.task=null;u.treatT=0;return true;}
      if(d2(u.x,u.y,e.x,e.y)>.35){this.go(u,e.x,e.y);return true;}u.anim='action';u.post='accroupi';this.face(u,e.x-u.x,e.y-u.y);u.treatT=(u.treatT||0)+this.dts;
      if(u.treatT>=(D.doctor?6:5)){u.treatT=0;if(u.kits<=0){u.task=null;u.why='plus de trousses : il faut des fournitures médicales';return true;}
        const done=D.doctor?doctorCare(e.h,u.kits,false):firstAid(e.h,u.kits);this.useKits(u,done);this.medLog(e,u,done);this.practice('soins',1);u.task=null;}return true;}
    if(T0?.kind==='operer')return this.operateTick(u,T0);
    if(T0?.kind==='evac')return false;
    // sous la tente d'abord, s'il y a quelqu'un à soigner (qui saigne, pour tous ; à opérer, pour le médecin)
    const tneed=p=>D.doctor?(needsSurgery(p.h)||needsDoctor(p.h)):needsCare(p.h);
    if(u.kits>=(D.doctor?2:1)){const t=this.s.buildings.filter(b=>b.f===u.f&&b.done&&BUILDINGS[b.k].tent&&this.distB(b,u.x,u.y)<25&&(b.wardList||[]).some(tneed)).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0];
      if(t&&(D.doctor||(t.wardList.some(p=>needsCare(p.h))&&!this.s.units.some(e=>e.f===u.f&&e.h&&needsCare(e.h)&&d2(e.x,e.y,u.x,u.y)<6)))){u.task={kind:'operer',b:t.id,auto:true};return true;}}
    if(u.kits>0){let best=null,bs=0;for(const e of this.s.units){if(e.f!==u.f||!e.h||e.h.state==='mort'||e.carriedBy)continue;if(!(D.doctor?needsDoctor(e.h):needsCare(e.h)))continue;const d=d2(e.x,e.y,u.x,u.y);if(d>14)continue;
        const w={rouge:4,jaune:1.6,vert:.6,noir:.25}[triage(e.h).k]||.5;const sc=w*(1+bleedRate(e.h)*2)/(1+d*.15);if(sc>bs){bs=sc;best=e;}}
      if(best){u.task={kind:'soigne',id:best.id,auto:true};u.treatT=0;return true;}}
    // plus personne à soigner ici : on évacue un blessé à terre (et déjà soigné) vers la tente, ou l'hôpital
    const down=this.s.units.filter(e=>e.f===u.f&&e.h?.state==='hors'&&!needsCare(e.h)&&!e.carriedBy&&d2(e.x,e.y,u.x,u.y)<22).sort((a,z)=>d2(a.x,a.y,u.x,u.y)-d2(z.x,z.y,u.x,u.y))[0];
    if(down&&this.careFor(u,down)){u.task={kind:'evac',id:down.id,auto:true};return false;}
    // l'évacuation secondaire : de la tente vers l'hôpital, ceux qui sont opérés et ne marchent pas
    if(!D.doctor){const hosp=this.hospitalFor(u);if(hosp){const t=this.s.buildings.find(b=>b.f===u.f&&BUILDINGS[b.k].tent&&this.distB(b,u.x,u.y)<30&&(b.wardList||[]).some(p=>!needsSurgery(p.h)&&p.h.state==='hors'&&!p.h.stay));
        if(t){const p=t.wardList.find(q=>!needsSurgery(q.h)&&q.h.state==='hors');t.wardList.splice(t.wardList.indexOf(p),1);const [w,h]=BUILDINGS[t.k].size;p.x=t.i+w/2;p.y=t.j+h+.3;this.s.units.push(p);this.uIndex.set(p.id,p);u.task={kind:'evac',id:p.id,auto:true,to:'hosp'};return false;}}}
    return false;}
  useKits(u,done){let n=0;for(const d of done)n+=d==='plasma'||d==='transfusion'?2:d==='morphine'?1:d.startsWith('hémostase')||d.startsWith('ligature')||d==='suture digestive'?1:.5;u.kits=Math.max(0,u.kits-Math.ceil(n));}
  medLog(e,u,done){if(!done.length)return;(e.h.log??=[]).push({t:this.s.t,what:done.join(', '),by:u.name||UNITS[u.k].name});if(e.h.log.length>30)e.h.log.shift();
    this.emit({type:'treated',x:e.x,y:e.y,what:done,id:e.id});if(e.f==='meumeu')this.log(this.nearCity(e),`${u.name} soigne ${e.name||'un blessé'} : ${done.join(', ')}.`,'good');}
  // Opérer sous la tente : un patient à la fois, le plus urgent d'abord ; un quart de minute par opération
  // Sous la tente : le plus urgent d'abord. Le médecin opère (un quart de minute) ; l'infirmier fait les premiers secours.
  operateTick(u,T0){const D=UDEF(u);const b=this.building(T0.b);if(!b||!b.done){u.task=null;return true;}
    const need=q=>D.doctor?(needsSurgery(q.h)||needsDoctor(q.h)):needsCare(q.h);const p=(b.wardList||[]).filter(need).sort((a,z)=>bleedRate(z.h)-bleedRate(a.h))[0];if(!p||u.kits<1){u.task=null;u.opT=0;return true;}
    const [w,h]=BUILDINGS[b.k].size;if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return true;u.anim='action';b.working=true;if(D.doctor)b.surgeon=u.id;u.opT=(u.opT||0)+this.dts;
    const surg=D.doctor&&needsSurgery(p.h)&&u.kits>=2;const T=surg?8/this.mod('chirurgie'):D.doctor?6:5;
    if(u.opT>=T){u.opT=0;const done=D.doctor?doctorCare(p.h,u.kits,surg):firstAid(p.h,u.kits);this.useKits(u,done);this.medLog(p,u,done);this.practice('soins',1);}return true;}
  // où porter un blessé : la tente médicale la plus proche (si elle est plus près que l'hôpital), sinon l'hôpital
  careFor(u,e=u,to=null){const room=b=>b.f===u.f&&b.done&&BUILDINGS[b.k].ward&&(b.wardList||[]).length<BUILDINGS[b.k].ward;
    const tent=to==='hosp'?null:this.s.buildings.filter(b=>room(b)&&BUILDINGS[b.k].tent).sort((a,z)=>this.distB(a,e.x,e.y)-this.distB(z,e.x,e.y))[0];const hosp=this.hospitalFor(e);
    if(tent&&(!hosp||this.distB(tent,e.x,e.y)<this.distB(hosp,e.x,e.y)*.8))return tent;return hosp||tent||null;}
  hospitalFor(u){return this.s.buildings.filter(b=>b.f===u.f&&b.done&&BUILDINGS[b.k].ward&&!BUILDINGS[b.k].tent&&(b.wardList||[]).length<BUILDINGS[b.k].ward).sort((a,z)=>(BUILDINGS[z.k].ward>4?1:0)-(BUILDINGS[a.k].ward>4?1:0)||this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0]||null;}
  // Porter un blessé : on va le chercher, on le soulève, on marche (moins vite) jusqu'à la tente ou l'hôpital
  evacTick(u,T0){const e=this.unit(T0.id);if(!e||!alive(e)||(e.h?.state!=='hors'&&T0.to!=='hosp')){if(e)e.carriedBy=null;u.task=null;u.carrying=null;return;}
    if(!u.carrying){if(e.carriedBy&&e.carriedBy!==u.id){u.task=null;return;}if(d2(u.x,u.y,e.x,e.y)>.4){this.go(u,e.x,e.y);return;}u.carrying=e.id;e.carriedBy=u.id;}
    const b=this.careFor(u,u,T0.to);if(!b){u.task=null;u.carrying=null;e.carriedBy=null;return;}const [w,h]=BUILDINGS[b.k].size;
    const arrived=this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]);e.x=u.x+.15;e.y=u.y+.1;
    if(arrived){this.admit(b,e);e.carriedBy=null;u.carrying=null;u.task=null;}}
  admit(b,e){(b.wardList??=[]).push(e);const i=this.s.units.indexOf(e);if(i>=0)this.s.units.splice(i,1);this.uIndex.delete(e.id);if(e.sq)this.leave(e);e.task=null;
    (e.h.log??=[]).push({t:this.s.t,what:`admis : ${BUILDINGS[b.k].name.toLowerCase()} (${this.cityName(b)})`,by:''});
    this.log(this.cityName(b),`${e.name||'Un blessé'} est arrivé à ${BUILDINGS[b.k].name.toLowerCase()}.`,'good');}
  // Le médecin porte une tente pliée : il la plante là où il est (près du front), et la monte lui-même
  pitchTent(u){const D=UDEF(u);if(!D.doctor)return {ok:false,why:['seul un médecin plante une tente']};if(!(u.tents>0))return {ok:false,why:['plus de tente : il en reprend une dans un dépôt (1 fourniture médicale, 5 bois)']};
    for(let r=1;r<6;r++)for(let a=0;a<16;a++){const i=Math.round(u.x+Math.cos(a/16*6.283)*r-1),j=Math.round(u.y+Math.sin(a/16*6.283)*r-1);const c=this.canPlace(u.f,'tente',i,j);
      if(!c.ok&&!c.why.every(w=>w.startsWith('il manque')))continue;const b=this.addBuilding(u.f,'tente',i,j,false);u.tents--;u.task={kind:'build',b:b.id};u.path=null;
      this.log(this.nearCity(u),`${u.name} plante une tente médicale.`,'good');return {ok:true,b,text:`${u.name} plante une tente médicale`};}
    return {ok:false,why:['pas de place à plat ici']};}
  // Guéri à l'hôpital : il reprend son poste — sauf s'il a perdu un membre : réformé, il retourne travailler comme villageois
  discharge(b,u){const B=BUILDINGS[b.k];const [w,h]=B.size;u.x=b.i+w/2+(this.rand()-.5)*w;u.y=b.j+h+.6;u.task=null;u.path=null;u.post='debout';this.s.units.push(u);this.uIndex.set(u.id,u);
    if(u.h.lost?.length&&u.k!=='villageois'){const dep=this.depots(u.f,u.x,u.y)[0];if(u.w&&dep)this.put(dep,'a:'+u.w,1);u.k='villageois';u.w=null;u.mag=0;u.pouch=0;u.gren=0;u.amput=true;
      this.log(this.cityName(b),`${u.name} a perdu un membre : réformé, il retourne travailler (son arme est rendue au dépôt).`,'warn');}
    else this.log(this.cityName(b),`${u.name||'Un blessé'} est guéri : il reprend son poste.`,'good');}
  gatherTick(u,T0,dt){const nd=this.s.nodes[T0.node];const res=T0.res;
    if(u.carry&&(u.carry.k!==res||u.carry.n>=CARRY-1e-6||!nd||nd.left<1e-6)){this.deliverTick(u);return;}
    if(!nd||nd.left<1){const next=this.s.nodes.filter(x=>x.type===T0.type&&x.left>=1&&(x.type!=='ore'||x.res===res)&&d2(x.i,x.j,u.x,u.y)<12).sort((a,b)=>d2(a.i,a.j,u.x,u.y)-d2(b.i,b.j,u.x,u.y))[0];
      if(!next){u.task=null;return;}T0.node=next.id;u.path=null;return;}
    if(!this.go(u,nd.i+.5,nd.j+.5,[nd.i,nd.j,1,1]))return;u.anim='action';this.face(u,nd.i+.5-u.x,nd.j+.5-u.y);
    const mine=nd.type==='ore'&&this.s.buildings.some(b=>b.k==='mine'&&b.ore===nd.id&&b.done);const rate=(NODES[nd.type].rate)*(mine?0:1)*this.mod('gather_'+nd.type);this.practice(DOM_OF[nd.type],dt);
    const got=Math.min(rate*dt,nd.left,CARRY-(u.carry?.n||0));nd.left-=got;u.carry={k:res,n:(u.carry?.n||0)+got};if(nd.left<1&&nd.type!=='bush'&&nd.type!=='ore'){this.nodeAt[nd.j*this.N+nd.i]=-1;this.emit({type:'felled',x:nd.i,y:nd.j,nt:nd.type});}}
  // Au camp : chacun ramasse ce que le camp demande (ou ce qui y manque le plus) à moins de 10 cases, et le rapporte au camp
  hubTick(u,b,dt){const want=b.res||'auto';const TYPE={bois:'tree',pierre:'rock',vivres:'bush'};let types=want==='auto'?['tree','rock','bush']:[TYPE[want]];
    if(want==='auto')types.sort((x,y)=>(b.stock[NODES[x].res]||0)-(b.stock[NODES[y].res]||0));
    let nd=u.hubNode!=null?this.s.nodes[u.hubNode]:null;const ok=n=>n&&n.left>=1&&types.includes(n.type)&&this.distB(b,n.i+.5,n.j+.5)<10;
    if(u.carry&&(u.carry.n>=CARRY-1e-6||!ok(nd))){if(this.room(b)<1){u.why='le camp est plein : il lui faut des porteurs';u.anim='idle';u.at=false;return;}this.deliverTo(u,b);u.at=false;return;}
    if(!ok(nd)){nd=null;for(const t of types){const c=this.s.nodes.filter(n=>n.type===t&&n.left>=1&&this.distB(b,n.i+.5,n.j+.5)<10).sort((a,z)=>d2(a.i,a.j,u.x,u.y)-d2(z.i,z.j,u.x,u.y))[0];if(c){nd=c;break;}}
      u.hubNode=nd?nd.id:null;u.path=null;if(!nd){u.why='plus rien à ramasser autour du camp';u.anim='idle';u.at=false;return;}}
    u.why=null;if(!this.go(u,nd.i+.5,nd.j+.5,[nd.i,nd.j,1,1])){u.at=false;return;}u.at=true;u.anim='action';this.face(u,nd.i+.5-u.x,nd.j+.5-u.y);const res=NODES[nd.type].res;
    const got=Math.min(NODES[nd.type].rate*this.mod('gather_'+nd.type)*dt,nd.left,CARRY-(u.carry?.k===res?u.carry.n:0));if(u.carry&&u.carry.k!==res){this.deliverTo(u,b);return;}
    nd.left-=got;u.carry={k:res,n:(u.carry?.n||0)+got};this.practice(DOM_OF[nd.type],dt);if(nd.left<1&&nd.type!=='bush'){this.nodeAt[nd.j*this.N+nd.i]=-1;this.emit({type:'felled',x:nd.i,y:nd.j,nt:nd.type});}}
  deliverTick(u){const aff=u.dep!=null?this.building(u.dep):null;const b=aff&&this.isDepot(aff)&&this.room(aff)>=1?aff:this.dropAt(u);if(!b){u.anim='idle';u.why='aucun dépôt atteignable';return;}this.deliverTo(u,b);}
  deliverTo(u,b){const [w,h]=BUILDINGS[b.k].size;if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;const q=this.put(b,u.carry.k,u.carry.n);u.carry.n-=q;if(u.carry.n<.01)u.carry=null;if(u.task?.kind==='deposit'&&!u.carry)u.task=null;}
  lineTick(u,T0,dt){const N=this.N;const kind=T0.line;const store=kind==='rail'?this.s.rails:this.s.walls;
    if(T0.k==null||!store[T0.k]||store[T0.k].b){let best=null,bd=14;for(const kk of Object.keys(store)){const o=store[kk];if(o.b||(kind==='mur'&&o.f!==u.f))continue;const i=kk%N,j=(kk/N)|0;const d=d2(i,j,T0.x,T0.y)*.3+d2(i,j,u.x,u.y);if(d<bd){bd=d;best=+kk;}}
      if(best==null){u.task=null;return;}T0.k=best;T0.x=best%N;T0.y=(best/N)|0;u.path=null;}
    const k=T0.k,i=k%N,j=(k/N)|0;const o=store[k];if(!this.go(u,i+.5,j+.5,[i,j,1,1]))return;
    if(!o.paid){if(!this.pay(u.f,i,j,LINES[kind].cost)){u.anim='idle';u.why=`il manque ${Object.entries(LINES[kind].cost).map(([r,v])=>v+' '+RES[r].name.toLowerCase()).join(' et ')} à moins de ${RADIUS} cases`;return;}o.paid=1;u.why=null;}
    u.anim='action';this.face(u,i+.5-u.x,j+.5-u.y);o.p+=dt/LINES[kind].hours;if(o.p>=1){this.lineBuilt(kind,k);T0.k=null;}}

  // ---------- les escouades : le moral ----------
  squadTick(){if(!this.s.squads.length)return;for(const sq of this.s.squads){const ms=this.members(sq);if(!ms.length)continue;const up=ms.filter(active);
      const supp=up.reduce((a,u)=>a+(u.supp||0),0)/Math.max(1,up.length);const lost=1-up.length/Math.max(sq.peak||ms.length,1);sq.peak=Math.max(sq.peak||0,ms.length);
      const target=clamp(1-lost*1.2-supp*.6,0,1);sq.morale+=(target-sq.morale)*Math.min(1,this.dts/8);
      if(!this.unit(sq.leader)||!active(this.unit(sq.leader))){const nl=up.sort((a,b)=>(b.xp||0)-(a.xp||0))[0];if(nl&&nl.id!==sq.leader){sq.leader=nl.id;sq.morale-=.15;}}
      // le repli : sous 25 % de moral, l'escouade décroche vers le dépôt le plus proche
      if(sq.morale<.25&&!sq.broken){sq.broken=true;const L=this.unit(sq.leader)||up[0];const dep=L&&this.s.buildings.filter(b=>b.f===sq.f&&b.done&&!b.ruin).sort((a,z)=>this.distB(a,L.x,L.y)-this.distB(z,L.x,L.y))[0];
        for(const u of up.slice(0,2))this.throwSmoke(u);
        if(dep){for(const u of up){u.task={kind:'move',tx:dep.i+1+(this.rand()-.5)*2,ty:dep.j+BUILDINGS[dep.k].size[1]+1};u.path=null;}this.log('Armée',`${sq.name} décroche : trop de pertes.`,'bad');this.emit({type:'rout',x:L.x,y:L.y});}}
      else if(sq.morale>.5)sq.broken=false;}}

  // ---------- les bâtiments ----------
  buildingTick(b,dt){const B=BUILDINGS[b.k];b.working=false;
    if(b.hide?.length&&(b.ruin||!this.s.units.some(e=>e.f!==b.f&&alive(e)&&this.distB(b,e.x,e.y)<13))){b.hideT=(b.hideT||0)+dt;if(b.hideT>.5||b.ruin){this.unhide(b);}}else b.hideT=0;
    if(b.fire>0){b.fire-=dt;b.hp-=FIRE.dps*dt;if(b.hp<=0&&!b.ruin)this.collapse(b);}
    // les blessés soignés ici
    if(b.wardList?.length&&b.done){
      if(B.tent){// sous la tente : le corps continue (on y saigne encore, on peut y mourir) ; opéré et debout, il repart
        for(const u of [...b.wardList]){const ch=tickHealth(u.h,this.dts);if(u.h.state==='mort'){b.wardList.splice(b.wardList.indexOf(u),1);u.hp=0;this.s.corpses.push({x:b.i+1,y:b.j+2.2,f:u.f,k:u.k,t:this.s.t,dir:'se',sheet:UDEF(u).sheet,bl:1,wounds:[]});
            this.log(this.cityName(b),`${u.name||'Un blessé'} est mort sous la tente (${u.h.cause}).`,'bad');this.emit({type:'death',x:b.i+1,y:b.j+1,f:u.f,k:u.k,id:u.id});continue;}
          if(!needsSurgery(u.h)&&u.h.state!=='hors'){b.wardList.splice(b.wardList.indexOf(u),1);const [w,h]=B.size;u.x=b.i+w/2;u.y=b.j+h+.5;this.s.units.push(u);this.uIndex.set(u.id,u);u.task=null;
            const hosp=this.hospitalFor(u);if(u.h.state==='blesse'&&hosp&&(u.h.legs||u.h.arms||u.h.gut||u.h.lost.length)){u.task={kind:'hosp',b:hosp.id};}
            (u.h.log??=[]).push({t:this.s.t,what:'sort de la tente'+(u.task?' : il part vers l’hôpital':' : il reprend son poste'),by:''});}}}
      else{const rate=B.ward>4?1:.4;for(const u of [...b.wardList]){if(heal(u.h,dt*rate)){b.wardList.splice(b.wardList.indexOf(u),1);this.discharge(b,u);}}}}
    if(!b.done){if(b.ruin&&b.f==='beee'&&this.s.buildings.some(c=>c.f==='beee'&&c.k==='centre'&&c.done&&d2(c.i,c.j,b.i,b.j)<24)){b.progress+=dt/40;if(b.progress>=1){b.done=true;b.ruin=false;b.hp=b.max*.7;}}return;}
    // le laboratoire : l'innovation avance
    if(b.dev){b.dev.left-=dt;b.working=true;if(b.dev.left<=0){const I=INNOV.find(x=>x.id===b.dev.id);this.s.innov.done.push(b.dev.id);b.dev=null;this.remod();this.log(this.cityName(b),`Innovation : ${I.name}. ${I.text}`,'good');this.emit({type:'innov',id:I.id});}}
    if(b.protoA){b.protoA.left-=dt;b.working=true;if(b.protoA.left<=0){const a=this.s.armors[b.protoA.id];if(a){a.status='adopte';this.log(this.cityName(b),`Protection adoptée : ${a.name}. La manufacture peut la fabriquer.`,'good');this.emit({type:'design',id:a.id});}b.protoA=null;}}
    // le bureau d'études : le prototype avance
    if(b.proto){b.proto.left-=dt;b.working=true;if(b.proto.left<=0){const d=this.design(b.proto.id);if(d){d.status='adopte';this.log(this.cityName(b),`Prototype réussi : ${d.name} est adopté. La manufacture et l’arsenal peuvent le fabriquer.`,'good');this.emit({type:'design',id:d.id});}b.proto=null;}}
    const q=b.queue[0];if(q){q.left-=dt;if(q.left<=0){b.queue.shift();const [w,h]=B.size;
      if(UNITS[q.k]||(b.f==='beee'&&BEEE.units[q.k])){const u=this.addUnit(b.f,q.k,b.i+w/2+(this.rand()-.5)*w,b.j+h+.7,{w:q.w,rounds:0,armor:q.armor});this.resupply(u);if(b.rally)u.task={kind:u.k==='villageois'?'move':'guard',tx:b.rally[0],ty:b.rally[1]};this.emit({type:'trained',x:u.x,y:u.y,k:q.k,f:b.f});}
      else{const v=this.addVehicle(b.f,q.k,b);this.log(this.cityName(b),`${VEHICLES[q.k].name} « ${v.name} » prêt.`,'good');this.emit({type:'trained',x:v.x,y:v.y,k:q.k,f:b.f});}}}
    const here=B.workers?this.workers(b).filter(u=>u.at):[];if(!here.length)return;const n=here.length;
    // les fermes et les mines livrent à leur dépôt de sortie (le plus proche, ou celui que le joueur a choisi)
    if(B.makes||b.k==='mine'){this.autoLink(b);const dep=this.building(b.out);if(!dep){b.why=`aucun dépôt à moins de ${RADIUS} cases`;return;}
      if(this.room(dep)<1){b.why=`le dépôt de sortie est plein (${this.depotName(dep)})`;return;}
      if(B.makes){b.why=null;for(const [k,v] of Object.entries(B.makes))this.put(dep,k,v*n*dt*this.mod('ferme'));this.practice('vivres',dt*n*.5);b.working=true;return;}
      const nd=this.s.nodes[b.ore];if(!nd||nd.left<=0){b.why='filon épuisé';return;}b.why=null;
      const got=Math.min(nd.left,B.rate*n*dt*this.mod('mine'));nd.left-=got;this.put(dep,nd.res,got);this.practice('mine',dt*n);b.working=true;return;}
    // les usines : une production, un dépôt d'approvisionnement, un dépôt de sortie, du charbon (eco.js)
    if(B.factory)this.factoryTick(b,n,dt);}
  // Encaisser (bâtiments, murs, canons) : les points partent, le feu prend, à zéro ça s'effondre.
  damage(e,dmg,by){if(e.wall!=null){const w=this.s.walls[e.wall];if(!w)return;w.hp-=dmg;if(w.hp<=0){this.lineBroken('mur',e.wall);this.emit({type:'collapse',x:e.x,y:e.y,small:true});}return;}
    if(e.k&&BUILDINGS[e.k]&&e.i!=null){if(e.ruin)return;e.hp-=dmg;e.hitAt=this.s.t;if(e.hp<e.max*.5&&e.fire<=0&&this.rand()<.35){e.fire=FIRE.hours;this.emit({type:'fire',x:e.i+1,y:e.j+1});}if(e.hp<=0)this.collapse(e);
      if(e.f==='beee')this.beeeAlarm(e);return;}
    // un canon (une machine) : il perd des points
    if(e.hp!=null&&!e.h){e.hp-=dmg;e.hitAt=this.s.t;if(e.hp<=0){e.hp=0;this.death(e);}}}
  shelter(u){const b=this.s.buildings.filter(b=>b.f===u.f&&b.done&&BUILDINGS[b.k].shelter&&(b.hide||[]).length<BUILDINGS[b.k].shelter&&this.distB(b,u.x,u.y)<25).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0];
    if(b){u.task={kind:'shelter',b:b.id};u.path=null;u.carry=null;}return !!b;}
  shelterAll(){let n=0;for(const u of [...this.s.units])if(u.f==='meumeu'&&u.k==='villageois'&&active(u)&&this.shelter(u))n++;return n;}
  nearCity(u){const c=this.s.buildings.filter(b=>b.k==='centre'&&b.f===u.f).sort((a,z)=>d2(a.i,a.j,u.x,u.y)-d2(z.i,z.j,u.x,u.y))[0];return c&&d2(c.i,c.j,u.x,u.y)<30?c.city:'Campagne';}
  unhide(b){const [w,h]=BUILDINGS[b.k].size;for(const u of b.hide){u.x=b.i+this.rand()*w;u.y=b.j+h+.5;u.task=null;u.path=null;this.s.units.push(u);this.uIndex.set(u.id,u);}b.hide=[];b.hideT=0;}
  collapse(b){const B=BUILDINGS[b.k];const [w,h]=B.size;if(b.hide?.length)this.unhide(b);b.ruin=true;b.done=false;b.progress=.2;b.hp=b.max*.2;b.fire=Math.max(b.fire,2);b.queue=[];b.batch=null;b.paid={...B.cost};
    for(const v of this.s.vehicles)if(v.job&&(v.job.to===b.id||v.job.from===b.id)&&v.job.phase==='src')v.job=null;
    if(b.stock){for(const k of Object.keys(b.stock)){b.stock[k]-=b.stock[k]*.7;}}
    // les blessés de l'hôpital, les passagers : ceux qui étaient dedans
    if(b.wardList?.length){for(const u of b.wardList)u.hp=0;b.wardList=[];this.log(this.cityName(b),`${B.name} s’est effondré sur ses blessés.`,'bad');}
    if(b.pass){for(const u of b.pass)u.hp=0;b.pass=[];}
    for(const u of this.s.units)if(u.task?.b===b.id&&u.task.kind==='work')u.task=null;
    if(b.proto){const d=this.design(b.proto.id);if(d)d.status='perdu';b.proto=null;}
    // la manufacture tombe : l'outillage est perdu ; les plans aussi, sauf s'ils sont aux archives d'une autre ville
    // une manufacture tombe : son outillage est perdu. Les plans survivent tant qu'une autre manufacture tient, ou des archives loin de celle-ci.
    if(b.k==='manufacture'){b.tooled={};const other=this.s.buildings.some(m=>m!==b&&m.f===b.f&&m.k==='manufacture'&&m.done&&!m.ruin);const arch=this.s.buildings.some(a=>a.f===b.f&&a.k==='archives'&&a.done&&d2(a.i,a.j,b.i,b.j)>=20);
      const lost=this.designsOf(b.f).filter(d=>!d.base);if(!arch&&!other)for(const d of lost)d.status='perdu';
      this.log(this.cityName(b),other||arch?`Une manufacture d’armes est détruite : son outillage est perdu, les plans sont sauvés${other?' (une autre manufacture les a)':' par les archives'}.`:`La dernière manufacture d’armes est détruite : outillage et plans perdus${lost.length?` (${lost.map(d=>d.name).join(', ')})`:''}.`,'bad');}
    this.log(this.cityName(b),`${B.name} ${b.f==='beee'?'bèè ':''}détruit${b.k==='centre'?' : la ville tombe !':'.'}`,b.f==='beee'?'good':'bad');
    this.emit({type:'collapse',x:b.i+w/2,y:b.j+h/2,k:b.k,f:b.f,big:w*h>=6});
    if(b.k==='centre'&&b.f==='beee'){const c=this.s.beee.cities.find(c=>c.centre===b.id);if(c){c.fallen=true;this.log(c.name,`${c.name} est tombée.`,'good');this.s.beee.anger+=2;}}
    if(b.k==='centre'&&b.f==='meumeu')this.s.beee.anger=Math.max(0,this.s.beee.anger-1);}

  // ---------- ce qui vole ----------
  shotsTick(dt){const s=this.s;for(const sh of s.shots){sh.t+=dt;if(sh.t<sh.dur)continue;sh.done=true;
      if(sh.kind==='flak'){const v=s.vehicles.find(x=>x.id===sh.v);const hit=v&&v.alt>0&&d2(v.x,v.y,sh.x1,sh.y1)<FLAK.hit;if(hit){v.hp-=FLAK.dmg;v.hitAt=s.t;if(v.hp<=0)this.shootDown(v);}this.emit({type:'flak',x:sh.x1,y:sh.y1,h:sh.h,hit});continue;}
      if(sh.kind==='round'){this.landRound(sh);continue;}
      if(sh.kind==='grenade'){this.blast(sh.x1,sh.y1,'grenade',sh.f,sh.by,1);continue;}
      if(sh.kind==='smokeg'){this.s.smokes.push({x:sh.x1,y:sh.y1,r:1.7,t0:this.s.t,end:this.s.t+8});this.emit({type:'smoke',x:sh.x1,y:sh.y1});continue;}
      if(sh.kind==='shell'){this.blast(sh.x1,sh.y1,'obus',sh.f,sh.by,sh.vsB||1);continue;}}
    s.shots=s.shots.filter(x=>!x.done);}
  // Une balle arrive : la blessure calculée au départ s'applique (si la cible est encore là) ; sinon, elle fait lever la poussière
  // et coucher ceux qui l'entendent passer.
  landRound(sh){const r=sh.res,tg=sh.target;const W=this.W(sh.w);const shooter=this.unit(sh.by);
    if(tg.b!=null){const b=this.building(tg.b);if(b){const E=.5*W.m/1000*r.v*r.v;this.damage(b,E/25,sh.f);if(CONSTRUCTIONS[W.p.cons].inc&&this.rand()<.05&&b.fire<=0){b.fire=FIRE.hours;this.emit({type:'fire',x:b.i+1,y:b.j+1});}}this.emit({type:'impact',x:sh.x1,y:sh.y1,hit:false,small:true,mat:'maison'});return;}
    if(tg.wall!=null){if(this.wall[tg.wall]){const E=.5*W.m/1000*r.v*r.v;this.damage({wall:tg.wall,x:sh.x1,y:sh.y1},E/25,sh.f);}this.emit({type:'impact',x:sh.x1,y:sh.y1,hit:false,small:true,mat:'pierre'});return;}
    const e=this.unit(tg.u);
    if(r.stopped&&e&&alive(e)){this.plateHit(e,r,shooter,sh,W);return;}
    if(r.hit&&e&&alive(e)&&d2(e.x,e.y,sh.x1,sh.y1)<.6){
      if(!e.h){this.damage(e,.5*W.m/1000*r.v*r.v/5,sh.f);this.emit({type:'impact',x:e.x,y:e.y,hit:true,small:true,mat:'metal'});return;}
      setSpecies(e.f);const out=applyWound(e.h,r.rec,this.rand,'balle');e.hitAt=this.s.t;e.supp=Math.min(1.5,(e.supp||0)+.6);
      if(r.plate)(e.h.log??=[]).push({t:this.s.t,what:`une balle a traversé la protection (${r.plate})`,by:''});
      this.emit({type:'wound',plate:r.plate,cause:e.h.cause,len:W.l/1000,victim:e.id,shooter:sh.by,vf:e.f,vk:e.k,sk:shooter?.k,w:sh.w,rec:r.rec,out,R:sh.R,v:r.v,cover:r.cover,x:e.x,y:e.y,dir:[sh.x1-sh.x0,sh.y1-sh.y0],name:e.name,sname:shooter?.name||(sh.tower?'une tour':null),armor:e.armor?this.armorOf(e.armor)?.D.a||null:null});
      if(out?.now==='mort')this.death(e);else if(out?.now==='hors')this.stateChange(e,'hors');
      if(shooter)shooter.xp=(shooter.xp||0)+(out?.now?3:1);
      for(const o of this.s.units)if(o!==e&&alive(o)&&o.f===e.f&&d2(o.x,o.y,e.x,e.y)<.5)o.supp=Math.min(1.5,(o.supp||0)+.25);
      if(e.f==='beee')this.beeeAlarm(e);return;}
    // manquée : la poussière, et ceux qu'elle frôle se couchent
    if(e&&alive(e)){const near=r.near??1;e.supp=Math.min(1.5,(e.supp||0)+.35*Math.max(0,1-near/.6));if(e.f==='beee')this.beeeAlarm(e);}
    this.emit({type:'impact',x:sh.x1,y:sh.y1,hit:false,small:true,mat:r.cover||'terre'});}
  // Une balle arrêtée par la plaque : un choc (qui peut couper le souffle, faire tomber), la plaque qui s'use, un bruit de cloche
  plateHit(e,r,shooter,sh=null,W=null){e.supp=Math.min(1.5,(e.supp||0)+.5);
    // pour la radiographie : la balle arrive, s'écrase sur la plaque et s'arrête (un trajet de 4 cm, jusqu'à la plaque)
    let rec=null;if(r.p&&r.d&&W){const m=(W.proj||W).m??W.m;const back=r.p.map((v,i)=>v-r.d[i]*.04);const dd=(W.proj?.p?.d)||W.p?.d||1.8;
      rec={path:[{p:back,v:r.v,yaw:0,d:dd},{p:r.p.slice(),v:r.v*.4,yaw:0,d:dd*1.6},{p:r.p.slice(),v:0,yaw:0,d:dd*1.8}],vIn:r.v,E0:.5*m/1000*r.v*r.v,E:0,dmg:{},tc:[],frags:[],entry:r.p.slice(),exit:null,lodged:true,stopped:true};}
    this.emit({type:'plate',x:e.x,y:e.y,mat:r.mat,zone:r.zone,victim:e.id,shooter:shooter?.id,rec,v:r.v,blunt:r.blunt,eq:r.eq,armorName:r.armor,armor:e.armor?this.armorOf(e.armor)?.D.a||null:null,vf:e.f,vk:e.k,name:e.name,sname:shooter?.name||(sh?.tower?'une tour':null),w:sh?.w,R:sh?.R,len:W?W.l/1000:.0065,dir:sh?[sh.x1-sh.x0,sh.y1-sh.y0]:[1,0]});
    if(e.h){e.h.pain=Math.min(10,(e.h.pain||0)+.5);(e.h.log??=[]).push({t:this.s.t,what:`balle arrêtée par ${r.zone==='casque'?'le casque':r.zone==='dos'?'la plaque de dos':r.zone==='flancs'?'la protection des flancs':'le plastron'} (${r.armor})`,by:''});
      const jk=r.blunt/1.5;if(jk>3&&this.rand()<Math.min(.6,(jk-3)/10)){e.h.shock=Math.max(e.h.shock,6+this.rand()*10);if(e.h.state==='ok')e.h.state='blesse';e.h.cause='choc derrière la plaque';}}
    if(e.f==='beee')this.beeeAlarm(e);}
  // Une explosion : les éclats (chacun sa blessure, calculée par la balistique), le souffle, les bâtiments, les murs, les rails.
  blast(x,y,kind,f,by,vsB=1){const S=BLASTS[kind];const N=this.N;const s=this.s;const Df=fragDesign(S.mass,S.d);
    for(const u of [...s.units]){if(!alive(u))continue;const dt=d2(u.x,u.y,x,y);if(dt>S.radius)continue;const r=Math.max(.05,dt*TILE_M);
      if(!u.h){this.damage(u,S.dmgB*(1-dt/S.radius)*.6,f);continue;}
      if(dt<S.blast){u.h.state='mort';u.h.cause='souffle de l’explosion';this.death(u);continue;}
      const area=u.post==='couche'?.012:u.post==='accroupi'?.026:.035;const lam=S.frags*area/(4*Math.PI*r*r);let k=0;{let L=Math.exp(-lam),p=1;do{k++;p*=this.rand();}while(p>L&&k<9);k--;}
      u.supp=Math.min(1.5,(u.supp||0)+.8);
      for(let n=0;n<k&&alive(u);n++){const v=S.v*Math.exp(-r/S.lambda);if(v<60)break;
        // l'éclat arrive de l'explosion, n'importe où sur la silhouette tournée vers elle
        const tx=x-u.x,ty=y-u.y,tl=Math.hypot(tx,ty)||1;const fx=u.fx??1,fy=u.fy??0;const alpha=Math.atan2(fx*ty/tl-fy*tx/tl,fx*tx/tl+fy*ty/tl);
        const post=u.post||'debout';const [sw,sh]=SILH[post];const hit=this.bodyRay([(this.rand()-.5)*sw*1.6,this.rand()*sh,2],[0,.05*(this.rand()-.5),-1],alpha,post,u.f);if(!hit)continue;
        const Ar=u.armor&&this.armorOf(u.armor);let vv=v;if(Ar){const zone=plateZone(hit.p);if(zone&&Ar.D.zones[zone]?.t>0){const pen=5.5e-4*Math.pow(S.mass,.7)*Math.pow(v,1.43)/Math.pow(S.d,1.07);const r=armorHit(Ar.D,zone,u,Df,v,pen,this.rand);
          if(r?.stopped){this.emit({type:'plate',x:u.x,y:u.y,mat:r.mat,zone,victim:u.id});continue;}if(r)vv=r.v;}}
        const rec=wound(Df,vv,hit.p,hit.d,this.rand,this.rand()*1.5);const out=applyWound(u.h,rec,this.rand,'éclat');
        this.emit({type:'wound',cause:u.h.cause,len:S.d/1000,victim:u.id,shooter:by,vf:u.f,vk:u.k,w:null,frag:kind,rec,out,R:r,v,x:u.x,y:u.y,dir:[u.x-x,u.y-y],name:u.name,sname:this.unit(by)?.name||null});
        if(out?.now==='mort'){this.death(u);break;}if(out?.now==='hors')this.stateChange(u,'hors');}}
    const rB=S.radius*.6;for(const b of s.buildings){const d=this.distB(b,x,y);if(d<rB)this.damage(b,S.dmgB*vsB*(1-d/rB*.5),f);}
    for(let j=Math.floor(y-rB);j<=y+rB;j++)for(let i=Math.floor(x-rB);i<=x+rB;i++){if(i<0||j<0||i>=N||j>=N||d2(i+.5,j+.5,x,y)>rB)continue;const k=j*N+i;
      if(this.wall[k]===2||this.wall[k]===-2)this.damage({wall:k,x:i+.5,y:j+.5},S.dmgB*vsB*.6,f);
      if(this.rail[k]===2){const rr=s.rails[k];rr.hp-=S.dmgB*vsB*.5;if(rr.hp<=0){this.lineBroken('rail',k);this.emit({type:'rail-cut',x:i+.5,y:j+.5});}}
      const nd=this.nodeAt[k];if(nd>=0&&s.nodes[nd].type==='tree'&&kind==='bombe'&&this.rand()<.5){s.nodes[nd].left=0;this.nodeAt[k]=-1;}}
    this.emit({type:'boom',x,y,kind:kind==='bombe'?'bomb':kind==='obus'?'shell':'grenade',big:kind!=='grenade'});}
  fallsTick(dt){for(const F of this.s.falls){F.t+=dt;if(F.t<F.dur)continue;F.done=true;this.blast(F.x1,F.y1,'bombe',F.f,null,1);}
    this.s.falls=this.s.falls.filter(F=>!F.done);}
  flakTick(dt){const planes=this.s.vehicles.filter(v=>v.alt>1&&v.hp>0);if(!planes.length)return;
    for(const b of this.s.buildings){const B=BUILDINGS[b.k];if(!B.flak||!b.done)continue;b.fcool=(b.fcool||0)-dt;if(b.fcool>0)continue;const gx=b.i+1,gy=b.j+1;
      const v=planes.filter(v=>v.f!==b.f&&d2(v.x,v.y,gx,gy)<B.flak.range).sort((a,z)=>d2(a.x,a.y,gx,gy)-d2(z.x,z.y,gx,gy))[0];if(!v)continue;b.fcool=B.flak.cd*(.8+this.rand()*.4);
      const V=VEHICLES[v.k];const L=Math.hypot(v.dx||0,v.dy||0)||1;const lead=V.speed*FLAK.flight;const ax=v.x+(v.dx||0)/L*lead,ay=v.y+(v.dy||0)/L*lead;
      this.s.shots.push({kind:'flak',f:b.f,v:v.id,x0:gx,y0:gy,x1:ax+(this.rand()-.5)*2*FLAK.spread,y1:ay+(this.rand()-.5)*2*FLAK.spread,h:v.alt,t:0,dur:FLAK.flight});this.emit({type:'flak-fire',x:gx,y:gy});}}
  // Les tours et les centres-villes : des tireurs à l'abri, avec la meilleure arme adoptée ; ils puisent leurs munitions aux dépôts.
  defenseTick(){if(!this.atWar)return;for(const b of this.s.buildings){const B=BUILDINGS[b.k];if(!B.defense||!b.done)continue;const [w,h]=B.size;const gx=b.i+w/2,gy=b.j+h/2;
      b.cool=(b.cool||0)-this.dts;if(b.cool>0)continue;
      const e=this.s.units.filter(u=>u.f!==b.f&&active(u)&&d2(u.x,u.y,gx,gy)<B.defense.range).sort((a,z)=>d2(a.x,a.y,gx,gy)-d2(z.x,z.y,gx,gy))[0];if(!e){b.cool=1;continue;}
      const wid=this.bestRifle(b.f);const W=this.W(wid);const shooters=Math.round(B.defense.shooters*(b.f==='meumeu'?this.mod('creneaux'):1))+Math.floor((b.hide||[]).length/3);if(b.f==='meumeu')this.practice('defense',.02);b.cool=(W.cyc+W.aim*.5)/shooters;
      if(b.f==='meumeu'){const got=this.take(b.f,gx,gy,'m:'+wid,1/W.perCrate);if(got<1/W.perCrate*.99){b.dry=true;b.cool=3;continue;}b.dry=false;}
      const pseudo={id:'b'+b.id,f:b.f,k:'soldat',x:gx,y:gy,post:'accroupi',supp:0,xp:30,w:wid};const R=d2(e.x,e.y,gx,gy)*TILE_M;const fl=W.at(R);const res=this.resolve(pseudo,e,W,R,0);
      const x1=res.hit?e.x:(res.px??e.x),y1=res.hit?e.y:(res.py??e.y);
      this.s.shots.push({kind:'round',f:b.f,by:null,w:wid,x0:gx,y0:gy-.6,x1,y1,t:0,dur:Math.max(.01,fl.t)/HOUR_REAL,res,target:{u:e.id},R,tower:true});
      this.emit({type:'shot',x:gx,y:gy-.6,x1,y1,f:b.f,cal:W.p.d,v0:W.v0,E:W.E0,sup:W.v0>340,tower:true});}}
  bestRifle(f){const ds=this.designsOf(f).filter(d=>!['he'].includes(d.p.cons));if(f==='beee')return 'bee_fusil';let best='mle1',be=0;for(const d of ds){const D=derive(d.p);if(D.eff>be&&D.rk<.4){be=D.eff;best=d.id;}}return best;}
  shootDown(v){v.state='down';const L=Math.hypot(v.dx||1,v.dy||0)||1;this.s.falls.push({id:this.id(),kind:'wreck',f:v.f,x0:v.x,y0:v.y,x1:v.x+(v.dx||1)/L*3,y1:v.y+(v.dy||0)/L*3,alt:v.alt,t:0,dur:.4,k:v.k});
    this.s.vehicles.splice(this.s.vehicles.indexOf(v),1);for(const u of v.pass||[])u.hp=0;this.log('Ciel',`${v.f==='beee'?'Bombardier bèè':VEHICLES[v.k].name+' « '+v.name+' »'} abattu !`,v.f==='beee'?'good':'bad');this.emit({type:'downed',x:v.x,y:v.y,f:v.f});}

  // ---------- les Bèè ----------
  makeBeeeCity(ci,cj,name){const c={id:this.id(),name,x:ci,y:cj,fallen:false};const centre=this.addBuilding('beee','centre',ci-2,cj-2,true);centre.city=name;c.centre=centre.id;this.s.beee.cities.push(c);
    for(const k of ['caserne','maison','maison','tour','tour','camp','maison'])this.beeeBuild(c,k,true);
    const cap=this.G.capital;const a0=Math.atan2(cap[1]-cj,cap[0]-ci);const cells=[];for(let t=-7;t<=7;t++){const a=a0+t*.11;cells.push([Math.round(ci+Math.cos(a)*9),Math.round(cj+Math.sin(a)*9)]);}
    const ks=this.canLine('beee','mur',cells);for(const k of ks){this.s.walls[k]={f:'beee',b:1,p:1,hp:LINES.mur.hp};this.wall[k]=-2;}
    for(let n=0;n<BEEE.garrison;n++){const a=n/BEEE.garrison*Math.PI*2;const u=this.addUnit('beee',n%4===3?'commando':'soldat',ci+Math.cos(a)*5,cj+Math.sin(a)*5);u.task={kind:'guard',tx:u.x,ty:u.y};u.city=c.id;}
    return c;}
  beeeSpot(c,k,r0=4,r1=12){const B=BUILDINGS[k];for(let t=0;t<200;t++){const a=this.rand()*Math.PI*2,d=r0+this.rand()*(r1-r0);const i=Math.round(c.x+Math.cos(a)*d-B.size[0]/2),j=Math.round(c.y+Math.sin(a)*d-B.size[1]/2);
      const N=this.N;let ok=true;for(let x=-1;x<=B.size[0]&&ok;x++)for(let y=-1;y<=B.size[1];y++){const ii=i+x,jj=j+y;if(ii<1||jj<1||ii>=N-1||jj>=N-1){ok=false;break;}const kk=jj*N+ii;if(!TERRAIN[this.G.terrain[kk]].build||this.occ[kk]>=0||this.wall[kk]||this.rail[kk]){ok=false;break;}}
      if(ok)return [i,j];}return null;}
  beeeBuild(c,k,done=false){const at=this.beeeSpot(c,k,k==='tour'?6:3.5,k==='tour'?10:9);if(!at)return null;const N=this.N;const B=BUILDINGS[k];for(let x=0;x<B.size[0];x++)for(let y=0;y<B.size[1];y++){const nd=this.nodeAt[(at[1]+y)*N+at[0]+x];if(nd>=0){this.s.nodes[nd].left=0;this.nodeAt[(at[1]+y)*N+at[0]+x]=-1;}}
    const b=this.addBuilding('beee',k,at[0],at[1],true);b.done=true;b.progress=1;b.hp=b.max;if(B.store)b.stock={};return b;}
  beeeAlarm(target){if(!this.atWar)return;const now=this.s.t;if(target.alarmAt&&now-target.alarmAt<.5)return;target.alarmAt=now;const [x,y]=this.posOf(target);
    const foe=this.s.units.filter(u=>u.f==='meumeu'&&active(u)).sort((a,b)=>d2(a.x,a.y,x,y)-d2(b.x,b.y,x,y))[0];if(!foe||d2(foe.x,foe.y,x,y)>18)return;
    for(const u of this.s.units)if(u.f==='beee'&&u.task?.kind==='guard'&&active(u)&&d2(u.x,u.y,x,y)<16)u.task={kind:'assault',tx:foe.x,ty:foe.y,back:[u.x,u.y]};}
  beeeRetarget(u){const b=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0];
    if(b&&this.distB(b,u.x,u.y)<25&&(u.pouch>0||u.mag>0||u.shells>0)){const [w,h]=BUILDINGS[b.k].size;u.task={kind:'assault',tx:b.i+w/2,ty:b.j+h+.5};}
    else{const home=this.s.beee.cities.find(c=>!c.fallen);if(home)u.task={kind:'guard',tx:home.x+(this.rand()-.5)*8,ty:home.y+(this.rand()-.5)*8};}}
  beeeTick(dt){const B=this.s.beee;const cities=B.cities.filter(c=>!c.fallen);if(!cities.length)return;const day=this.day;
    // la paix armée : on nous observe, on s'arme, on nous menace — puis la guerre
    const tension=[[3,'Des éclaireurs bèè ont été vus près de nos villes. Ils comptent nos maisons.'],[7,'Les Bèè mobilisent : leurs casernes tournent jour et nuit.'],[B.warDay-3,'Ultimatum bèè : ils exigent nos filons. La guerre dans trois jours.'],[B.warDay-1,'Les ambassadeurs bèè sont partis. Demain, la guerre.'],[B.warDay,'Les Bèè ont déclaré la guerre.']];
    for(const [d,text] of tension){if(day>=d&&(B.told||0)<d){B.told=d;this.log('Frontière',text,d>=B.warDay?'bad':'warn');this.emit({type:d>=B.warDay?'war':'tension',text});}}
    for(const c of cities){const units=this.s.units.filter(u=>u.f==='beee'&&u.city===c.id);const cap=Math.min(BEEE.cap,10+day*2+B.anger*3);
      for(const b of this.s.buildings)if(b.f==='beee'&&b.k==='caserne'&&b.done&&!b.queue.length&&units.length<cap&&d2(b.i,b.j,c.x,c.y)<20){const k=day>=8&&this.rand()<.35?'commando':'soldat';b.queue.push({k,left:5});}
      for(const b of this.s.buildings)if(b.f==='beee'&&b.k==='fonderie'&&b.done&&!b.queue.length&&units.filter(u=>u.k==='canon').length<2+Math.floor(day/6))b.queue.push({k:'canon',left:14});
      c.grow=(c.grow||0)+dt;if(c.grow>=BEEE.buildEvery){c.grow=0;const has=k=>this.s.buildings.some(b=>b.f==='beee'&&b.k===k&&d2(b.i,b.j,c.x,c.y)<20);
        const k=day>=5&&!has('fonderie')?'fonderie':['maison','tour','caserne','tour','camp'][Math.floor(this.rand()*5)];const b=this.beeeBuild(c,k);if(b)this.log(c.name,`Les Bèè bâtissent : ${BUILDINGS[k].name.toLowerCase()}.`,'bad');}
      for(const u of this.s.units)if(u.f==='beee'&&u.city==null&&u.task?.kind!=='assault'&&d2(u.x,u.y,c.x,c.y)<12)u.city=c.id;}
    if(!this.atWar)return;
    if(this.s.t>=B.nextWave){B.nextWave=this.s.t+BEEE.every*DAY*(.8+this.rand()*.4)/(1+B.anger*.15);B.waves++;
      const ours=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin);if(ours.length){const from=cities[Math.floor(this.rand()*cities.length)];
        const w={gare:4,mine:4,camp:2.5,atelier:2,arsenal:2.5,manufacture:3,ferme:1.5,centre:B.waves>3?3:.5,maison:1,caserne:2,tour:1,fonderie:2,hopital:1.5};
        const target=ours.map(b=>({b,s:(w[b.k]||1)/(1+d2(b.i,b.j,from.x,from.y)/40)*(.6+this.rand()*.8)})).sort((a,z)=>z.s-a.s)[0].b;
        const size=Math.min(30,BEEE.wave+BEEE.grow*(B.waves-1)+Math.floor(B.anger));
        let pool=this.s.units.filter(u=>u.f==='beee'&&u.city===from.id&&u.task?.kind==='guard'&&active(u)).slice(0,Math.max(0,size-2));
        const total=this.s.units.filter(u=>u.f==='beee').length;while(pool.length<size&&total+pool.length<BEEE.cap*3){const a=this.rand()*Math.PI*2;const u=this.addUnit('beee',B.waves>=3&&pool.length%5===4?'canon':B.waves>=2&&pool.length%3===2?'commando':'soldat',from.x+Math.cos(a)*4,from.y+Math.sin(a)*4);pool.push(u);}
        const [tw,th]=BUILDINGS[target.k].size;for(const [n,u] of pool.entries()){u.city=null;u.task={kind:'assault',tx:target.i+tw/2+(n%4-1.5)*.7,ty:target.j+th+.5+((n/4)|0)*.6};u.path=null;}
        this.log(this.cityName(target),`Une armée bèè de ${pool.length} marche de ${from.name} vers ${this.cityName(target)} (${BUILDINGS[target.k].name.toLowerCase()}).`,'bad');
        this.emit({type:'wave',n:pool.length,x:target.i,y:target.j,from:[from.x,from.y]});}}
    if(false&&this.s.t>=B.nextAir){   // plus d'aviation dans le jeu : ni raids ni bombardiers
B.nextAir=this.s.t+BEEE.airEvery*DAY*(.7+this.rand()*.6);const af=this.s.buildings.find(b=>b.f==='beee'&&b.k==='aerodrome'&&b.done);
      const tg=this.s.buildings.filter(b=>b.f==='meumeu'&&b.done&&['gare','centre','aerodrome','arsenal','manufacture','mine','atelier','caserne','hopital'].includes(b.k));
      if(af&&tg.length){const t=tg[Math.floor(this.rand()*tg.length)];const [w,h]=BUILDINGS[t.k].size;const v={id:this.id(),f:'beee',k:'bombardier',name:'Bombardier bèè',x:af.i+1,y:af.j+1,home:af.id,hp:VEHICLES.bombardier.hp*.8,max:VEHICLES.bombardier.hp*.8,alt:0,cargo:{},state:'idle',pass:[]};
        this.s.vehicles.push(v);this.sortie(v,t.i+w/2,t.j+h/2);
        this.log(this.cityName(t),`Un bombardier bèè a décollé vers ${this.cityName(t)} !`,'bad');this.emit({type:'air-raid',x:t.i,y:t.j});}}}

  // ---------- les innovations ----------
  // ce qu'une innovation adoptée multiplie ; les soins sont réglés dans health.js
  remod(){const m={};for(const id of this.s.innov?.done||[]){const I=INNOV.find(x=>x.id===id);if(I)for(const [k,v] of Object.entries(I.mod))m[k]=(m[k]||1)*v;}this.mods=m;MED.tq=m.garrot||1;MED.plasma=m.plasma||1;MED.sepsis=m.antiseptique||1;}
  mod(k){return this.mods?.[k]||1;}
  practice(dom,x){if(!dom)return;const P=this.s.innov.prac;P[dom]=(P[dom]||0)+x;}
  // Toutes les deux heures : un domaine assez pratiqué donne une idée à un Meumeu qui y travaille (au plus six en attente)
  innovTick(dt){const I=this.s.innov;I.clock=(I.clock||0)+dt;if(I.clock<2)return;I.clock=0;if(I.ideas.length>=6)return;
    for(const dom of Object.keys(DOMAINS)){const need=I.next[dom]||14;if((I.prac[dom]||0)<need)continue;
      const id=I.order.find(x=>{const d=INNOV.find(y=>y.id===x);return d.dom===dom&&!I.done.includes(x)&&!I.ideas.some(y=>y.id===x)&&!this.s.buildings.some(b=>b.dev?.id===x);});if(!id){I.next[dom]=1e9;continue;}
      I.next[dom]=need*1.9;const who=this.inventor(dom);I.ideas.push({id,who,t:this.s.t});const X=INNOV.find(y=>y.id===id);
      this.log(who?this.nearCity(who):'Recherche',`${who?.name||'Un Meumeu'} a une idée : ${X.name}.`,'good');this.emit({type:'idea',id,who:who?.name,x:who?.x,y:who?.y});if(I.ideas.length>=6)break;}}
  inventor(dom){const T={bois:['tree'],pierre:['rock'],vivres:['bush']};const us=this.s.units.filter(u=>u.f==='meumeu'&&u.name&&active(u));
    const busy=us.filter(u=>{const k=u.task?.kind;if(T[dom])return (k==='gather'&&T[dom].includes(u.task.type))||(k==='work'&&BUILDINGS[this.building(u.task.b)?.k]?.hub);
      if(dom==='mine')return k==='work'&&this.building(u.task.b)?.k==='mine'||u.task?.type==='ore';if(dom==='construction')return k==='build'||k==='line';if(dom==='soins')return !!UNITS[u.k]?.medic;
      if(dom==='tir'||dom==='defense')return !!u.w;if(dom==='armement'||dom==='atelier')return k==='work'&&['arsenal','manufacture','atelier'].includes(this.building(u.task.b)?.k);return false;});
    const pool=busy.length?busy:us;return pool[Math.floor(this.rand()*pool.length)]||null;}
  canDevelop(id){const why=[];const I=INNOV.find(x=>x.id===id);const lab=this.s.buildings.find(b=>b.f==='meumeu'&&BUILDINGS[b.k].lab&&b.done);if(!lab)why.push('un laboratoire bâti');else if(lab.dev)why.push('le laboratoire travaille déjà sur une idée');
    if(lab){const p=this.canPay('meumeu',lab.i+1,lab.j+1,I.cost);if(!p.ok)why.push(`il manque : ${p.miss.join(', ')}`);}return {ok:!why.length,why,lab};}
  develop(id){const r=this.canDevelop(id);if(!r.ok)return r;const I=INNOV.find(x=>x.id===id);this.pay('meumeu',r.lab.i+1,r.lab.j+1,I.cost);r.lab.dev={id,left:I.hours,total:I.hours};
    this.s.innov.ideas=this.s.innov.ideas.filter(x=>x.id!==id);this.log(this.cityName(r.lab),`Le laboratoire développe : ${I.name}.`,'good');return {ok:true,text:`Au laboratoire : ${I.name} (${I.hours} h)`};}
  dropIdea(id){this.s.innov.ideas=this.s.innov.ideas.filter(x=>x.id!==id);}
  checkEnd(){const s=this.s;if(!s.won){const cap=this.capital();
      if(s.beee.cities.length&&s.beee.cities.every(c=>c.fallen)){s.won={day:this.day,how:'guerre'};this.log('Front','Toutes les villes bèè sont tombées. La guerre est gagnée.','good');this.emit({type:'won'});}}
    if(!s.lost&&!s.buildings.some(b=>b.f==='meumeu'&&b.k==='centre'&&!b.ruin)){s.lost={day:this.day};this.log('Front','Le dernier centre-ville est tombé.','bad');this.emit({type:'lost'});}}

  save(){return JSON.stringify(this.s);}
  load(json){const s=JSON.parse(json);if(s.v!==SAVE_VERSION)throw new Error('version');const G=generate(s.seed);this.G=G;this.N=G.N;this.pather=new Pather(this.N);this.s=s;this.rand=rng(s.seed+Math.floor(s.t*100));this.grids();this.remod();this._rnDirty=true;this._lineDem=null;}
}
// la gestion (usines, dépôts, commandes, fret) : eco.js
Object.assign(World.prototype,ECO);
