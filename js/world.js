// Oberkommando der Meumeu — la simulation. Deux horloges : l'heure de jeu (production, chantiers, trains, jours) et la seconde de combat
// (cadences de tir, vol des balles, hémorragies). Une heure de jeu dure HOUR_REAL secondes à 1× : c'est aussi le nombre de
// secondes de combat qu'elle contient. Les positions sont en cases (x = i, y = j) ; une case vaut TILE_M mètres pour la balistique.
// Deux civilisations sur la même carte. Tout est un objet placé ; les stocks sont dans les dépôts, les munitions en caisses.
import {SITE_RANGE,HOUR_REAL,DAY,NIGHT,MAP_N,RADIUS,CARRY,GAP,TERRAIN,T,RES,RARE,ORE_LEFT,NODES,BUILDINGS,LINES,UNITS,BLASTS,VEHICLES,PRODUCTS,LIMIT_OF,FRET,BOMB,FLAK,FIRE,BEEE,START,NAMES,CITY_NAMES,BEEE_CITIES,VEHICLE_NAMES,INNOV,DOMAINS} from './data.js';
import {ECO} from './eco.js';
import {generate,rng} from './gen.js';
import {Pather} from './path.js';
import {derive,wound,TILE_M,CRATE_KG,CONSTRUCTIONS,ACTIONS,fitMods,crewOf} from './ballistics.js';
import {regionAt,AIM,SILH,BODY_H,BLOOD,setSpecies} from './body.js';
import {newHealth,applyWound,applyBurn,tickHealth,malus,firstAid,doctorCare,heal,needsCare,needsDoctor,needsSurgery,bleedRate,triage,MED} from './health.js';
import {DEFAULT_DESIGNS,weightOf,crateCost,weaponCost,protoCost,PROTO_HOURS,PROTO_HOURS_ARMOR,fragDesign} from './designs.js';
import {DEFAULT_ARMORS,deriveArmor,plateZone,armorHit} from './armor.js';
import {arcTable,aimArc,EXPO} from './explosive.js';
import {WILDLIFE} from './wildlife.js';
import {WAR,SETTLE} from './war.js';
import {GUIDES} from './ballistics.js';
import {TIPC} from './gunart.js';
import {BEEE_AI} from './beee.js';
import {advanceSolar,SOLAR_DEFAULT,solarRemaining} from './clock.js';
import {PERCEPTION} from './perception.js';
import {OPERATIONS} from './operations.js';
import {STRATEGY} from './strategy.js';
import {ESCALADE} from './escalade.js';
import {VEHICULES,VEHDEF} from './vehicules.js';
import {PERSISTENCE} from './persistence.js';
import {BUNKERS} from './bunkers.js';
import {NAVAL} from './naval.js';
import {bunkerPlan} from './bunkerdata.js';
// Le chemin d'un train : les centres des cases, et à chaque virage à angle droit un quart de cercle (rayon : une demi-case) —
// la même courbe que celle que dessine la voie. Chaque point est [x - 0,5, y - 0,5, case] (slide ajoute la demi-case).
export function railCurve(cells,N){const P=cells.map(k=>[k%N+.5,((k/N)|0)+.5,k]);const out=[];
  for(let n=1;n<P.length;n++){const a=P[n-1],b=P[n],c=P[n+1];
    const d1=[Math.sign(b[0]-a[0]),Math.sign(b[1]-a[1])],d2=c?[Math.sign(c[0]-b[0]),Math.sign(c[1]-b[1])]:null;
    const corner=d2&&Math.abs(d1[0])+Math.abs(d1[1])===1&&Math.abs(d2[0])+Math.abs(d2[1])===1&&(d1[0]!==d2[0]||d1[1]!==d2[1]);
    if(!corner){out.push([b[0]-.5,b[1]-.5,b[2]]);continue;}
    const sx=b[0]-d1[0]*.5,sy=b[1]-d1[1]*.5,cx=sx+d2[0]*.5,cy=sy+d2[1]*.5;const a0=Math.atan2(sy-cy,sx-cx),a1=Math.atan2(b[1]+d2[1]*.5-cy,b[0]+d2[0]*.5-cx);let da=a1-a0;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;
    for(let q=1;q<=6;q++){const t=a0+da*q/6;out.push([cx+Math.cos(t)*.5-.5,cy+Math.sin(t)*.5-.5,b[2]]);}}
  return out;}

export const SAVE_VERSION=11;
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
const d2=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const ENEMY={meumeu:'beee',beee:'meumeu'};
const UDEF=(u)=>u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];
// une caserne : on y entre, on s'y entraîne, on en sort équipé (la caserne forme des soldats, la caserne d'élite la troupe de choc)
export const isBarracks=k=>{const T=BUILDINGS[k]?.trains||[];return T.includes('soldat')||T.includes('choc');};
export const alive=u=>u&&u.hp>0;
export const active=u=>alive(u)&&!(u.h&&u.h.state==='hors');
const POST={debout:1.4,accroupi:1,couche:.7};
const DOM_OF={tree:'bois',rock:'pierre',bush:'vivres',ore:'mine'};
const SACK={hp:25,fire:.3};   // saccager au contact : points retirés par heure et par Meumeu, chance d'y mettre le feu par heure
const FOOD_CIVIL=.12, FOOD_SOLDIER=.2; // caisses par habitant et par heure de jeu (base ; les Bèè ×BEEE.frugal, les Meumeu ×MEUMEU_FRUGAL)
// « La tech pour les Meumeu, la masse pour les Bèè » : un Meumeu mange un tiers de moins (0,08 vivre/h un villageois, 0,13 un soldat) et ses moulins
// produisent 50 % de plus. Avant, deux moulins ne nourrissaient qu'une quarantaine de Meumeu : impossible d'entretenir une armée en plus des ouvriers.
const MEUMEU_FRUGAL=.65, MEUMEU_MILL=1.5;

export class World{
  constructor(seed=Date.now()%100000,options={}){this.events=[];this.init(seed,options);}
  // (une graine dont la carte ne se laisse pas générer — la capitale bèè introuvable — passait à « Erreur de démarrage du rendu » : on prend la suivante ;
  //  la graine retenue est celle qui est sauvée, donc un rechargement retrouve la même carte)
  init(seed,options={}){let G;for(let k=0;;k++){try{G=generate(seed,options.map);break;}catch(e){if(k>=24)throw e;seed++;}}this.G=G;this.N=G.N;this.bounds=G.bounds||[0,0,G.N,G.N];   /* (V12.5) le rectangle jouable : toute la carte, ou 1 500 × 600 sur la carte « mer » */this.rand=rng(seed*2654435761+7);for(let k=0;k<16;k++)this.rand();this.pather=new Pather(this.N);
    const s=this.s={v:SAVE_VERSION,seed,map:G.mode,genV:G.version,t:7,solar:7,solarSettings:{...SOLAR_DEFAULT},nextId:1,units:[],buildings:[],vehicles:[],shots:[],falls:[],tracks:[],log:[],rails:{},walls:{},sacs:{},mines:{},craters:[],corpses:[],squads:[],
      designs:Object.fromEntries(DEFAULT_DESIGNS.map(d=>[d.id,JSON.parse(JSON.stringify(d))])),armors:Object.fromEntries(DEFAULT_ARMORS.map(d=>[d.id,JSON.parse(JSON.stringify(d))])),smokes:[],groundFires:[],
      nodes:G.nodes,fauna:[],beee:{cities:[],waves:0,anger:0,tension:0,phase:'war'},won:null,lost:null,cityN:0,squadN:0,
      innov:{prac:{},next:{},ideas:[],done:[],order:INNOV.map(x=>x.id).sort(()=>this.rand()-.5)}};this.remod();
    s.fert=G.fert.slice();s.fertSpots=G.blobs.map(b=>({i:b.i,j:b.j,r:b.r}));
    s.beee.warDay=1;s.beee.nextWave=BEEE.firstRaid*DAY;s.fog=true;   // le brouillard de guerre, par défaut
    this.grids();
    const [ci,cj]=G.capital;const cap=this.addBuilding('meumeu','centre',ci-2,cj-2,true);cap.capital=true;cap.goal=true;cap.city=CITY_NAMES[0];s.cityN=1;Object.assign(cap.stock,START.stock);
    for(let n=0;n<START.villagers;n++){const a=n/START.villagers*Math.PI*2;this.addUnit('meumeu','villageois',ci+Math.cos(a)*3.2,cj+Math.sin(a)*3.2);}
    if(options.assisted||options.dev)this.assistedStart(cap,ci,cj);
    if(options.dev)this.devStart(cap,ci,cj);   // partie de test : le départ établi, plus de gros stocks ; le brouillard reste (bouton « Brouillard » pour le lever)
    for(const [n,p] of G.beee.slice(0,BEEE.cities).entries())this.makeBeeeCity(...p,BEEE_CITIES[n]);
    this.spawnFauna();
    this.log(CITY_NAMES[0],'La capitale est fondée. Les Bèè commencent eux aussi avec un centre-ville et des villageois. Les filons éloignés attisent déjà la rivalité ; les premières offensives attendront que les industries puissent tourner.');}
  // Départ optionnel pour jouer immédiatement au système militaire et logistique sans escamoter la progression : les ateliers sont
  // construits, mais les choix de production, les ouvriers et l'expansion restent ceux du joueur.
  assistedStart(cap,ci,cj){
    Object.assign(cap.stock,{bois:700,pierre:420,vivres:520,pieces:180,charbon:120,fer:105,plomb:55,cuivre:45,poudre:55,explosifs:18,sante:24,batterie:3,'a:mle1':14,'m:mle1':20,'p:casque':14,'p:gilet':10});
    const put=(k,di,dj,stock={})=>{const b=this.addBuilding('meumeu',k,ci+di,cj+dj,true);if(b.stock)Object.assign(b.stock,stock);return b;};
    const camp=put('camp',-8,-4,{bois:80,pierre:50,vivres:45});
    const mill=put('moulin',5,-4),granary=put('grenier',10,-4,{vivres:100,ble_moulu:30});
    const workshop=put('atelier',5,3),office=put('armurerie',9,3),barracks=put('caserne',-8,3),warehouse=put('entrepot',5,8,{bois:120,pierre:100,fer:35,pieces:40,charbon:40});
    for(let n=0;n<8;n++){const a=n/8*Math.PI*2+.2;this.addUnit('meumeu','villageois',ci+Math.cos(a)*5.2,cj+Math.sin(a)*5.2);}
    for(let n=0;n<4;n++)this.addUnit('meumeu','soldat',ci-1+n*1.15,cj+6.5,{rounds:14,armor:n<3?'gilet':null});
    const labour=this.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(-8);
    labour.slice(0,4).forEach(u=>u.task={kind:'work',b:mill.id});labour.slice(4,6).forEach(u=>u.task={kind:'work',b:workshop.id});
    // La chaîne industrielle est prête mais à l'arrêt : un deuxième moulin, cinq mines en service (salpêtre, plomb, cuivre, fer,
    // charbon, chacune avec son camp-dépôt), et l'arsenal (munitions), la manufacture d'armes et l'usine chimique (poudre) bâtis mais
    // sans ouvrier ni commande — le choix de la production reste au joueur.
    const F='meumeu';
    for(let n=0;n<14;n++){const a=n/14*Math.PI*2+.7;this.addUnit(F,'villageois',ci+Math.cos(a)*7.4,cj+Math.sin(a)*7.4);}
    const idle=()=>this.s.units.filter(u=>u.f===F&&u.k==='villageois'&&!u.task);
    const at2=this.buildSpot(F,'moulin',ci-8,cj-10,0,22),mill2=at2?this.addBuilding(F,'moulin',at2[0],at2[1],true):null;
    if(mill2)for(const u of idle().slice(0,4))u.task={kind:'work',b:mill2.id};
    this.startMines=this.placeMines(F,ci,cj,['salpetre','plomb','cuivre','fer','charbon']);
    for(const k of ['poudrerie','arsenal','manufacture']){const at=this.buildSpot(F,k,ci,cj,7,26);if(at)this.addBuilding(F,k,at[0],at[1],true);}
    this.log(CITY_NAMES[0],`Départ établi : deux moulins, ${this.startMines.length} mines en service (${this.startMines.join(', ')||'aucune'}), grenier, atelier, bureau d'études, caserne, entrepôt, et un arsenal, une manufacture d'armes et une usine chimique à l'arrêt. Quatre soldats gardent la capitale; les Bèè restent une menace de campagne.`,'good');
  }
  // Une case libre pour un bâtiment, en spirale autour de (x,y) entre les rayons r0 et r1.
  buildSpot(F,k,x,y,r0=4,r1=26){for(let r=r0;r<r1;r++)for(let a=0;a<48;a++){const i=Math.round(x+Math.cos(a/48*6.283)*r-BUILDINGS[k].size[0]/2),j=Math.round(y+Math.sin(a/48*6.283)*r-BUILDINGS[k].size[1]/2);if(this.canPlace(F,k,i,j).ok)return [i,j];}return null;}
  // Une mine en service sur le filon le plus proche de chaque ressource demandée (la mine d'abord : elle exige de l'espace autour
  // d'elle ; son camp-dépôt ensuite, un peu à l'écart) ; deux villageois libres y travaillent. Rend les ressources réellement servies.
  placeMines(F,ci,cj,list,perMine=2){const built=[],idle=()=>this.s.units.filter(u=>u.f===F&&u.k==='villageois'&&!u.task);
    for(const res of list){
      // le filon le plus proche où une mine se pose (le plus proche peut être sous un bâtiment du départ) ; jusqu'à 48 cases
      let nd=null,okm=null;for(const n of this.s.nodes.filter(n=>n.type==='ore'&&n.res===res&&n.left>0&&Math.hypot(n.i-ci,n.j-cj)<48).sort((p,q)=>Math.hypot(p.i-ci,p.j-cj)-Math.hypot(q.i-ci,q.j-cj))){const c=this.canPlace(F,'mine',n.i,n.j);if(c.ok){nd=n;okm=c;break;}}
      if(nd){const m=this.addBuilding(F,'mine',nd.i,nd.j,true);if(okm.ore)m.ore=okm.ore.id;m.site=okm.site?.id??null;built.push(res);
        const cp=this.buildSpot(F,'camp',nd.i+.5,nd.j+.5,4,14);if(cp)this.addBuilding(F,'camp',cp[0],cp[1],true);
        for(const u of idle().slice(0,perMine))u.task={kind:'work',b:m.id};}}
    return built;}
  // Partie de test (bouton « Dev ») : la base du départ établi, plus une mine en service sur chaque filon proche (avec son camp-dépôt),
  // les usines d'armes, de gros stocks (armes, munitions, protections, explosifs) et de quoi observer les Bèè librement.
  devStart(cap,ci,cj){
    Object.assign(cap.stock,{bois:3000,pierre:2200,vivres:2500,pieces:900,charbon:900,fer:700,plomb:450,cuivre:350,salpetre:300,poudre:420,explosifs:140,sante:100,batterie:12,jumelles:8,jumelles_ir:6,tenue_camo:8,'a:mle1':70,'m:mle1':600,'p:casque':40,'p:gilet':40});
    const F='meumeu';
    const free=(k,x,y,r0=4,r1=26)=>this.buildSpot(F,k,x,y,r0,r1);
    const put=(k,at)=>at?this.addBuilding(F,k,at[0],at[1],true):null;
    for(let n=0;n<16;n++){const a=n/16*Math.PI*2+.4;this.addUnit(F,'villageois',ci+Math.cos(a)*6.4,cj+Math.sin(a)*6.4);}
    // les cinq mines, le deuxième moulin, l'arsenal, la manufacture et l'usine chimique viennent déjà du départ établi : on y ajoute la pierre
    const built=[...(this.startMines||[]),...this.placeMines(F,ci,cj,['pierre'])];
    for(const k of ['fonderie','four','hopital','tour','tour'])put(k,free(k,ci,cj,7,26));
    for(let n=0;n<8;n++)this.addUnit(F,'soldat',ci-3+n*.9,cj+8,{rounds:14,armor:'gilet'});
    this.log(CITY_NAMES[0],`Partie de test : ${built.length} mines en service (${built.join(', ')||'aucune'}), usines d'armes, gros stocks, douze soldats. Le brouillard de guerre est en place : bouton « Brouillard » ou touche N pour le lever.`,'good');
  }
  grids(){const N=this.N,M=N*N;this.occ=new Int32Array(M).fill(-1);this.rail=new Uint8Array(M);this.wall=new Int8Array(M);this.crater=new Float32Array(M);this.nodeAt=new Int32Array(M).fill(-1);this.fort=new Uint8Array(M);this.emb=new Uint8Array(M);this.fortB=new Int32Array(M).fill(-1);
    for(const nd of this.s.nodes)if(nd.left>0||nd.type==='bush'||nd.type==='ore')this.nodeAt[nd.j*N+nd.i]=nd.id;
    for(const b of this.s.buildings)this.stamp(b,b.id);
    for(const [k,r] of Object.entries(this.s.rails))this.rail[+k]=r.b?2:1;
    this.s.sacs??={};this.s.mines??={};delete this.s.trenches;   /* (V12.5) les anciennes tranchées ont disparu : les sacs de sable les remplacent */this.s.craters??=[];this.s.groundFires??=[];for(const [k,w] of Object.entries(this.s.walls))this.wall[+k]=(w.f==='meumeu'?1:-1)*(w.b?2:1);for(const c of this.s.craters)this.stampCrater(c);
    this.bIndex=new Map(this.s.buildings.map(b=>[b.id,b]));this.uIndex=new Map(this.s.units.map(u=>[u.id,u]));}
  sizeOf(b){return b.size||BUILDINGS[b.k].size;}
  // La fertilité : 0–100 par case ; ce qu'elle rend (0,12 sur la roche nue, 0,9 à 50, 1,3 à 80, 1,5 sur la terre noire).
  fertAt(i,j){const F=this.s.fert;return F&&i>=0&&j>=0&&i<this.N&&j<this.N?F[j*this.N+i]:50;}
  fertYield(v){return .12+1.4*Math.pow(Math.max(0,v)/100,.85);}
  // le rendement d'une ferme (ses 9 cases) ou d'un moulin (les 8 champs autour de la tour ; un cratère n'y pousse plus rien)
  cropYield(b,i0=b.i,j0=b.j,k=b.k){const [w,h]=k===b?.k?this.sizeOf(b):BUILDINGS[k].size;let s=0,n=0;const N=this.N;
    for(let j=j0;j<j0+h;j++)for(let i=i0;i<i0+w;i++){if(k==='moulin'&&i===i0+1&&j===j0+1)continue;s+=this.fertYield(this.fertAt(i,j))*(this.crater?.[j*N+i]>0?.2:1);n++;}return n?s/n:1;}
  // Une explosion laboure la terre : les limons partent, la roche remonte. Une bombe ravage un champ ; un obus, un coin de champ ;
  // la grenade, la balle explosive, à peine. L'incendiaire brûle l'humus. Rien ne repousse vite : c'est pour la vie d'une partie.
  scorch(x,y,r,loss){const F=this.s.fert;if(!F)return;const N=this.N;this.fertV=(this.fertV||0)+1;for(let j=Math.max(0,Math.floor(y-r));j<=Math.min(N-1,Math.floor(y+r));j++)for(let i=Math.max(0,Math.floor(x-r));i<=Math.min(N-1,Math.floor(x+r));i++){
      const d=d2(i+.5,j+.5,x,y);if(d>r)continue;const k=j*N+i;F[k]=Math.max(0,Math.round(F[k]-loss*(1-.6*d/r)));}}
  // La grille des unités (carrés de 8 cases), refaite à chaque tick : trouver ses voisins sans parcourir toute la population.
  gridBuild(){const C=8,M=Math.ceil(this.N/C);let g=this.ug;if(!g||g.M!==M)g=this.ug={M,C,cells:Array.from({length:M*M},()=>[]),used:[]};else{for(const c of g.used)c.length=0;g.used.length=0;}
    for(const u of this.s.units){if(!(u.hp>0))continue;const ci=Math.min(M-1,Math.max(0,Math.floor(u.x/C))),cj=Math.min(M-1,Math.max(0,Math.floor(u.y/C)));const c=g.cells[cj*M+ci];if(!c.length)g.used.push(c);c.push(u);}}
  // chaque unité (vivante au début du tick) dans le carré de rayon r autour de (x,y) ; fn rend true pour s'arrêter
  near(x,y,r,fn){const g=this.ug;if(!g){for(const u of this.s.units)if(fn(u))return u;return null;}const C=g.C,M=g.M;
    const i0=Math.max(0,Math.floor((x-r)/C)),i1=Math.min(M-1,Math.floor((x+r)/C)),j0=Math.max(0,Math.floor((y-r)/C)),j1=Math.min(M-1,Math.floor((y+r)/C));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const c=g.cells[j*M+i];for(let k=0;k<c.length;k++)if(fn(c[k]))return c[k];}return null;}
  penCapacity(b){const [w,h]=this.sizeOf(b);return Math.max(2,Math.floor(w*h*.75));}
  stamp(b,v){if(BUILDINGS[b.k].bunker){this.stampBunker(b,v);return;}this.occV=(this.occV||0)+1;const [w,h]=this.sizeOf(b);for(let a=0;a<w;a++)for(let c=0;c<h;c++)this.occ[(b.j+c)*this.N+b.i+a]=v;}
  id(){return this.s.nextId++;}
  log(where,text,tone='info'){this.s.log.unshift({t:this.s.t,where,text,tone});if(this.s.log.length>160)this.s.log.pop();}
  emit(e){this.events.push(e);
    if(e.type==='shot'&&e.by!=null){const op=this.operation(this.unit(e.by)?.op);if(op)op.fired=(op.fired||0)+1;}
    if(e.type==='shot'&&e.f==='beee')this.meumeuHear(e.x,e.y,e.dB??150,'tirs');else if(e.type==='boom'){this.meumeuHear(e.x,e.y,e.kind==='bomb'?185:170,'explosion');
      // les Bèè entendent aussi nos explosions (grenades, obus, bombes, charges) : pas les leurs
      // (un obus, une roquette, une bombe tombent de loin : fouiller le point d'impact rassemblait les Bèè sous le prochain coup — c'est le départ du coup,
      //  entendu à la pièce, qu'ils remontent ; seules les grenades et les charges posées à la main font fouiller le lieu de l'explosion)
      if(e.src!=='beee'&&e.kind!=='pop'&&e.kind!=='shell'&&e.kind!=='bomb'&&e.kind!=='rocket')this.beeeHear?.(e.x,e.y,e.kind==='grenade'?160:170,'explosion');}}
  // Les bruits de la vie : un train qui roule, un chantier, des arbres qu'on abat, une mine — ils portent plus ou moins loin.
  // Chez l'ennemi, on les note (à peu près) ; les Bèè, eux, s'en servent pour orienter leurs reconnaissances.
  noiseTick(dt){this.noiT=(this.noiT||0)+dt;if(this.noiT<.5)return;this.noiT=0;const src=[];
    // les portées (en cases de 4 m) : une locomotive s'entend à des kilomètres, une usine à un peu plus d'un, une mine, un chantier,
    // une cognée moins loin ; une ville bèè, sa rumeur (les cloches, les voix, les charrettes), d'autant plus loin qu'elle est peuplée
    for(const v of this.s.vehicles)if(v.k==='train'&&v.state==='go')src.push([v.x,v.y,95,'train',v.f]);
    for(const u of this.s.units){const k=u.task?.kind;if(u.hp<=0)continue;if(k==='build'&&u.anim==='action')src.push([u.x,u.y,30,'chantier',u.f]);else if(k==='gather'&&u.task.type==='tree'&&u.anim==='action')src.push([u.x,u.y,22,'abattage',u.f]);}
    for(const b of this.s.buildings)if(b.done&&!b.ruin){if(b.k==='mine'&&b.working)src.push([b.i+1,b.j+1,38,'mine',b.f]);else if(BUILDINGS[b.k]?.factory&&b.working)src.push([b.i+1,b.j+1,42,'usine',b.f]);
      else if(b.k==='centre'&&b.f==='beee'){const st=this.cityStats(b);if(st.res>4)src.push([b.i+1,b.j+1,22+Math.sqrt(st.res)*4,'ville',b.f]);}}
    for(const [x,y,R,kind,f] of src){if(f==='beee'){this.meumeuHear(x,y,110+R*1.6,kind);}
      else{const ear=this.near(x,y,R,u=>u.f==='beee'&&active(u)&&d2(u.x,u.y,x,y)<R);if(ear){const B=this.s.beee;
        // un bruit de nos ouvriers ne donne aux Bèè qu'un relèvement (depuis leur écouteur), jamais l'endroit où l'on travaille
        if(!B.lead||this.s.t-B.lead.t>6){const h=this.acousticContact(ear,x,y,110+R*1.6,kind);if(h)B.lead={cone:true,x:h.ox,y:h.oy,bearing:h.angle,half:h.uncertainty,t:this.s.t,why:kind};}
        // tout près (à moins de 60 % de sa portée), un bruit de travail des nôtres (un chantier, une cognée) les fait venir voir : une
        // petite fouille, au plus toutes les deux heures au même endroit ; un train, une usine, une mine ne font qu'orienter leurs reconnaissances
        if((kind==='chantier'||kind==='abattage')&&this.near(x,y,R*.6,u=>u.f==='beee'&&active(u)&&d2(u.x,u.y,x,y)<R*.6)){const NT=B.noiseT??={},key=Math.floor(x/6)+','+Math.floor(y/6);
          if(this.s.t>=(NT[key]??0)){NT[key]=this.s.t+2;this.beeeHear?.(x,y,110+R*1.6,'bruit');const ks=Object.keys(NT);if(ks.length>200)for(const q of ks)if(NT[q]<this.s.t)delete NT[q];}}}}}}
  // Les pas. Un Meumeu qui marche s'entend à 3 cases le jour, 6 la nuit (courbé la moitié, en rampant le tiers ; une pièce qu'on
  // pousse, moitié plus ; un éclaireur ou un commando, moins) : le Bèè qui l'entend se tourne vers le bruit et donne l'alerte.
  // Les nôtres entendent de même les Bèè qui marchent (4 cases le jour, 7 la nuit ; une colonne en marche, plus loin).
  // La nuit, les rondes et les fouilles bèè portent une lanterne : elles voient mieux autour d'elles, et se voient de loin.
  // jusqu'où s'entendent les pas d'une unité (en cases), dans sa posture — post : une autre posture, pour l'annoncer au joueur
  stepRange(u,post=u.post){const night=this.light()<.4;if(u.f==='beee')return (night?7:4)*(u.band?1.4:1);const Wd=u.w?this.W(u.w):null,D=UDEF(u);
    return (night?6:3)*(post==='couche'?.3:post==='accroupi'?.5:1)*(Wd?.crew>1?1.5:1)*(D.scout||D.camo||u.k==='commando'?.7:1);}
  stepsTick(dt){this.stepT=(this.stepT||0)+dt;if(this.stepT<.1)return;this.stepT=0;const t=this.s.t,night=this.light()<.4;
    // Les pas laissent des traces espacées, qui durent selon le sol. Les Bèè peuvent
    // les relever près d'une ronde; les Meumeu ne voient les traces bèè qu'après les avoir
    // réellement découvertes. L'âge est celui du jeu, pas celui du rendu.
    const tracks=this.s.tracks??=([]),lifeFor=(x,y)=>{const terrain=this.terrainAt(Math.floor(x),Math.floor(y));return ({[T.sand]:3,[T.grass]:2.4,[T.meadow]:2.4,[T.dirt]:6,[T.scrub]:1.5,[T.snow]:8}[terrain]||1.2);};
    for(const u of this.s.units){if(!active(u)||u.anim!=='walk')continue;const p=u.trackPos,dist=p?Math.hypot(u.x-p.x,u.y-p.y):2;if(dist<1.05)continue;
      const dx=p?u.x-p.x:(u.fx||1),dy=p?u.y-p.y:(u.fy||0),terrain=this.terrainAt(Math.floor(u.x),Math.floor(u.y)),life=lifeFor(u.x,u.y)*(u.post==='couche'?.7:u.post==='accroupi'?.82:1);
      tracks.push({x:u.x,y:u.y,f:u.f,t,life,heading:Math.atan2(dy,dx),quiet:u.orderPost==='couche'||u.orderPost==='accroupi',noticed:false});u.trackPos={x:u.x,y:u.y};
    }
    // Qui pourrait voir une trace bèè : une grille grossière (32 cases) de notre présence, refaite à chaque passage. Une trace à plus de ~96 cases de tout
    // Meumeu n'est pas regardée (avant : visibleAt fouillait 220 cases pour chacune des mille traces, dix fois par heure — la moitié du temps de calcul
    // d'une partie à vingt villes bèè) ; et chaque trace n'est revue que toutes les 0,4 heure.
    const G=32,pres=new Set(),key=(x,y)=>((x/G)|0)*4096+((y/G)|0);
    for(const o of this.s.units)if(o.f==='meumeu'&&active(o))pres.add(key(o.x,o.y));for(const b of this.s.buildings)if(b.f==='meumeu'&&b.done&&!b.ruin)pres.add(key(b.i,b.j));for(const v of this.s.vehicles)if(v.f==='meumeu')pres.add(key(v.x,v.y));
    const watched=(x,y)=>{const cx=(x/G)|0,cy=(y/G)|0;for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(pres.has((cx+a)*4096+cy+b))return true;return false;};
    for(const tr of tracks){if(t-tr.t>tr.life)continue;
      if(tr.f==='beee'&&!tr.foundByMe&&t>=(tr.seeAt||0)){tr.seeAt=t+.4;if(watched(tr.x,tr.y)&&this.visibleAt('meumeu',tr.x,tr.y))tr.foundByMe=t;}
      if(tr.f==='meumeu'&&!tr.noticed&&t-tr.t<tr.life*.65&&t>=(tr.checkAt||0)){
        tr.checkAt=t+.45;const eye=this.near(tr.x,tr.y,20,o=>o.f==='beee'&&active(o)&&Math.hypot(o.x-tr.x,o.y-tr.y)<Math.max(o.lamp&&night?3.2:1.2,this.visualRange(o,tr.x,tr.y,.25))&&this.los(o.x,o.y,tr.x,tr.y));
        if(eye){tr.noticed=true;for(const other of tracks)if(other.f==='meumeu'&&Math.hypot(other.x-tr.x,other.y-tr.y)<2.5)other.noticed=true;this.beeeNotice?.(tr.x+(this.rand()-.5)*2,tr.y+(this.rand()-.5)*2,2,'traces');}
      }}
    this.s.tracks=tracks.filter(tr=>t-tr.t<=tr.life).slice(-1000);
    // Les équipes bèè en marche : plus elles sont nombreuses, plus elles s'entendent de loin (un soldat seul à quelques cases, une compagnie à
    // plus de cent mètres) — et chaque pas d'une équipe est signalé à chaque tick, pour que la couronne suive l'équipe en temps réel.
    const walkers=new Map();for(const u of this.s.units)if(u.f==='beee'&&active(u)&&u.anim==='walk'){const k=Math.floor(u.x/6)+','+Math.floor(u.y/6);let L=walkers.get(k);if(!L)walkers.set(k,L=[]);L.push(u);}
    const teamOf=u=>{let n=0;const gx=Math.floor(u.x/6),gy=Math.floor(u.y/6);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=walkers.get((gx+a)+','+(gy+b));if(L)for(const o of L)if(Math.hypot(o.x-u.x,o.y-u.y)<6)n++;}return Math.max(1,n);};
    for(const u of this.s.units){if(!active(u))continue;
      if(u.f==='beee'){const k=u.task?.kind;u.lamp=night&&!u.band&&(k==='patrol'||k==='search'&&!u.task.scout);
        if(u.anim!=='walk'||t<(u.stepHeardT??-9))continue;const team=teamOf(u),R=this.stepRange(u)*(1+.18*Math.min(14,team-1));
        if(this.near(u.x,u.y,R,o=>o.f==='meumeu'&&active(o)&&d2(o.x,o.y,u.x,u.y)<R)){u.stepHeardT=t+.1;this.meumeuHear(u.x,u.y,110+R*1.6,'pas',team);}continue;}
      if(u.f!=='meumeu'||u.anim!=='walk'||t<(u.stepHeardT??-9))continue;
      const R=this.stepRange(u);
      const ear=this.near(u.x,u.y,R,o=>o.f==='beee'&&active(o)&&d2(o.x,o.y,u.x,u.y)<R);if(!ear)continue;
      u.stepHeardT=t+.3;this.face(ear,u.x-ear.x,u.y-ear.y);this.beeeHear?.(u.x,u.y,110+R*1.6,'pas');}}
  get t(){return this.s.t;}
  get day(){return Math.floor(this.s.t/DAY)+1;}
  get atWar(){return true;}
  hour(){return this.s.solar??((this.s.t%DAY)+DAY)%DAY;}
  nightRemaining(){return solarRemaining(this.hour(),this.s.solarSettings||SOLAR_DEFAULT);}
  isNight(){const h=this.hour();return h>=NIGHT[0]||h<NIGHT[1];}
  light(){const h=this.hour();if(h>=NIGHT[0]||h<NIGHT[1])return 0;if(h>=NIGHT[1]+2&&h<=NIGHT[0]-2)return 1;return h<12?(h-NIGHT[1])/2:(NIGHT[0]-h)/2;}
  terrainAt(i,j){return i<0||j<0||i>=this.N||j>=this.N?T.deep:this.G.terrain[j*this.N+i];}
  gauss(){let u=0,v=0;while(!u)u=this.rand();while(!v)v=this.rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

  // ---------- les conceptions ----------
  design(id){return this.s.designs[id]||null;}
  // les caractéristiques d'une arme : dérivées de sa conception, gardées une demi-heure de jeu (la conception peut changer au bureau)
  W(id){const d=this.design(id)||this.s.designs.mle1;const C=this.wCache??=new Map();const c=C.get(d);if(c&&c.p===d.p&&this.s.t-c.t<.5&&this.s.t>=c.t)return c.D;const D=derive(d.p);C.set(d,{p:d.p,t:this.s.t,D});return D;}
  designsOf(f,status='adopte'){return Object.values(this.s.designs).filter(d=>d.f===f&&(!status||d.status===status));}
  goodName(k){if(k.startsWith('p:')){const a=this.s.armors[k.slice(2)];return a?a.name:'Protection';}if(k.startsWith('m:')){const d=this.design(k.slice(2));return `Munitions ${d?d.name:'?'}`;}if(k.startsWith('a:')){const d=this.design(k.slice(2));return d?d.name:'Arme';}return RES[k]?.name||k;}
  // proposer un prototype au bureau d'études : il se paie, il prend du temps, puis il est adopté
  canPropose(b,p){const why=[];if(!b||b.k!=='armurerie'||!b.done)why.push('un bureau d’études');else if(b.proto)why.push('un prototype est déjà en cours');const D=derive(p);
    if(CONSTRUCTIONS[p.cons].minD&&p.d<CONSTRUCTIONS[p.cons].minD)why.push(`${CONSTRUCTIONS[p.cons].name.toLowerCase()} : ${CONSTRUCTIONS[p.cons].minD} mm de calibre au moins`);
    if(p.fuse==='fusant'&&p.d<8&&CONSTRUCTIONS[p.cons].he)why.push('une fusée fusante : 8 mm de calibre au moins');
    if(D.overload)why.push('trop lourde pour son affût : trépied, roues ou plus de servants');
    if((p.mods||[]).includes('bouclier')&&D.have==='epaule')why.push('un bouclier demande un affût');
    if(b){const pay=this.canPay(b.f,b.i+1,b.j+1,protoCost(p));if(!pay.ok)why.push(`il manque : ${pay.miss.join(', ')}`);}return {ok:!why.length,why,D};}
  propose(b,name,p){const r=this.canPropose(b,p);if(!r.ok)return r;this.pay(b.f,b.i+1,b.j+1,protoCost(p));const id='d'+this.id();
    // une seule pièce par attache : ce qui est enregistré est ce que le dessin montre et ce que la balistique compte
    this.s.designs[id]={id,f:b.f,name:name||`Modèle ${Object.keys(this.s.designs).length}`,status:'prototype',p:{...JSON.parse(JSON.stringify(p)),mods:fitMods(p.mods)},origin:b.id};b.proto={id,left:PROTO_HOURS};
    this.log(this.cityName(b),`Prototype en fabrication : ${this.s.designs[id].name} (${r.D.name}).`,'good');return {ok:true,id,text:`Prototype lancé : ${this.s.designs[id].name}`};}

  // ---------- les protections ----------
  armorOf(id){const A=id&&this.s.armors[id];return A?{A,D:deriveArmor(A.a)}:null;}
  armorsOf(f,status='adopte'){return Object.values(this.s.armors).filter(a=>a.f===f&&(!status||a.status===status));}
  proposeArmor(b,name,a){if(!b||b.k!=='armurerie'||!b.done)return {ok:false,why:['un bureau d’études']};if(b.proto||b.protoA)return {ok:false,why:['un prototype est déjà en cours']};const D=deriveArmor(a);
    const cost=Object.fromEntries(Object.entries(D.cost).map(([k,v])=>[k,+(v*3).toFixed(1)]));const p=this.canPay(b.f,b.i+1,b.j+1,cost);if(!p.ok)return {ok:false,why:[`il manque : ${p.miss.join(', ')}`]};
    this.pay(b.f,b.i+1,b.j+1,cost);const id='p'+this.id();this.s.armors[id]={id,f:b.f,name:name||`Protection ${Object.keys(this.s.armors).length}`,status:'prototype',a:JSON.parse(JSON.stringify(a))};b.protoA={id,left:PROTO_HOURS_ARMOR};
    this.log(this.cityName(b),`Prototype de protection : ${this.s.armors[id].name} (${Math.round(D.mass*1000)} g).`,'good');return {ok:true,id,text:`Prototype lancé : ${this.s.armors[id].name} (${PROTO_HOURS_ARMOR} h)`};}
  // ---------- les choses ----------
  addUnit(f,k,x,y,o={}){const D=f==='beee'?BEEE.units[k]:UNITS[k];const u={id:this.id(),f,k,x,y,hp:1,max:1,task:null,path:null,carry:null,cool:0,dir:'se',fx:1,fy:0,anim:'idle',post:'debout',supp:0,xp:0};
    if(D.img){u.hp=D.hp;u.max=D.hp;u.w=o.w||(f==='meumeu'?'canon_mle1':'bee_canon');const W=this.W(u.w),rounds=Math.max(0,Math.floor(o.rounds??0));u.mag=Math.min(W.p.mag,rounds);u.pouch=rounds-u.mag;u.shells=0;}else{u.h=newHealth();if(D.choc){u.h.vit=D.choc.vit;u.h.tough=D.choc.tough;}}
    if(D.arm){u.w=o.w||(typeof D.arm==='string'?D.arm:'mle1');const W=this.W(u.w);if(o.rounds!=null){const rounds=Math.max(0,Math.floor(o.rounds));u.mag=Math.min(W.p.mag,rounds);u.pouch=rounds-u.mag;}else{u.mag=W.p.mag;u.pouch=Math.min(W.carry,W.p.mag*8);}}
    if(D.medic)u.kits=D.kits;if(D.tents)u.tents=D.tents;if(D.smoke)u.smoke=D.smoke;
    u.armor=o.armor??null;u.plates={};
    if(k==='villageois'||D.medic||D.arm){const used=new Set(this.s.units.map(x=>x.name));u.name=NAMES.find(n=>!used.has(n))||'Meumeu '+u.id;if(f==='beee')u.name='Bèè '+u.id;}
    this.s.units.push(u);this.uIndex?.set(u.id,u);return u;}
  addBuilding(f,k,i,j,done=false,size=null,rot=0){const B=BUILDINGS[k];const b={id:this.id(),f,k,i,j,done,progress:done?1:0,hp:done?B.hp:B.hp*.1,max:B.hp,queue:[],fire:0,ruin:false};if(k==='enclos'&&size)b.size=[...size];if(B.bunker){b.rot=rot;b.size=[...size];}
    if(B.store){b.stock={};b.no=this.s.buildings.filter(x=>x.f===f&&x.k===k).length+1;b.prio=k==='tente'?4:3;b.want=k==='tente'?{sante:6}:k==='centre'?{vivres:80}:k==='grenier'?{vivres:120,ble_moulu:30}:{};}
    // ceux qui forment (caserne, fonderie, hôpital) gardent une réserve à leur dépôt : ce qu'il faut pour les prochains
    if(B.stock0)b.need=f==='beee'?Object.fromEntries(Object.entries(B.stock0).map(([key,n])=>[key.replace('m:mle1','m:bee_fusil').replace('a:mle1','a:bee_fusil'),n])):{...B.stock0};if(B.ward)b.wardList=[];
    // une usine neuve : sa première production (le joueur la change), son plafond, et l'outillage du fusil de base
    if(B.factory){const first=(f==='meumeu'?{arsenal:'m:mle1',manufacture:'a:mle1'}:{arsenal:'m:bee_fusil',manufacture:'a:bee_fusil'})[k];b.prod=first||Object.keys(PRODUCTS).find(p=>PRODUCTS[p].at===k)||null;b.limit=b.prod?LIMIT_OF(b.prod):0;if(B.manufacture)b.tooled={[f==='meumeu'?'mle1':'bee_fusil']:true};}
    this.s.buildings.push(b);this.bIndex?.set(b.id,b);this.stamp(b,b.id);return b;}
  addVehicle(f,k,home){const used=new Set(this.s.vehicles.map(v=>v.name));const V=VEHICLES[k];const [w,h]=BUILDINGS[home.k].size;
    const v={id:this.id(),f,k,name:VEHICLE_NAMES.find(n=>!used.has(n))||k+' '+this.s.nextId,x:home.i+w/2,y:home.j+h+.3,home:home.id,base:home.id,at:home.id,route:null,cargo:{},state:'idle',hp:V.hp||50,max:V.hp||50,pass:[],alt:0,
      mode:k==='bombardier'?null:'fret',only:[],job:null};if(k==='train')v.coal=this.tender();
    if(k==='train'){const p=this.platform(home);if(p){v.x=p[0]+.5;v.y=p[1]+.5;}v.trail=[];}
    if(k==='avion'||k==='bombardier'){v.x=home.i+1;v.y=home.j+1;}
    this.s.vehicles.push(v);return v;}
  building(id){return this.bIndex.get(id)||null;}
  unit(id){return this.uIndex.get(id)||null;}
  // le centre-ville le plus proche : gardé une heure de jeu (les villes changent rarement), recalculé si ce centre tombe
  centreOf(b){const m=b._cOf;if(m&&this.s.t-m.t<1&&m.t<=this.s.t&&m.n===this.s.buildings.length){const c=m.id!=null?this.building(m.id):null;if(m.id==null||c&&!c.ruin)return c;}
    let best=null,bd=Infinity;for(const x of this.s.buildings){if(x.k!=='centre'||x.f!==b.f||x.ruin)continue;const d=d2(x.i,x.j,b.i,b.j);if(d<bd){bd=d;best=x;}}
    Object.defineProperty(b,'_cOf',{value:{t:this.s.t,id:best?.id??null,n:this.s.buildings.length},writable:true,configurable:true,enumerable:false});return best;}
  // Les villes : chaque centre-ville en est une ; un bâtiment appartient au centre le plus proche (à moins de 26 cases),
  // un Meumeu à la ville où il est né (ou la plus proche). Chaque ville a ses places (son centre, ses maisons), ses
  // habitants, et sa croissance : son centre forme des villageois tant qu'il a des vivres et de la place.
  cityOf(b){const c=this.centreOf(b);return c&&d2(c.i,c.j,b.i,b.j)<26?c:null;}
  homeOf(u){let c=u.home!=null&&this.building(u.home);if(!c||c.ruin||c.k!=='centre'){c=this.s.buildings.filter(x=>x.k==='centre'&&x.f===u.f&&!x.ruin&&x.done).sort((a,z)=>d2(a.i,a.j,u.x,u.y)-d2(z.i,z.j,u.x,u.y))[0]||null;u.home=c?.id??null;}return c;}
  // Les places (cap), les habitants (res) et les maisons (houses) de chaque ville d'un camp : calculés d'un seul passage pour
  // toutes ses villes et gardés pour l'instant (refaits si un bâtiment ou un habitant apparaît ou disparaît). Demandés ville par
  // ville, chacun reparcourait tous les bâtiments et tous les habitants : le tiers de l'heure de l'économie bèè (les à-coups).
  cityStats(c){const t=this.s.t,K=this._cs??={};let E=K[c.f];
    if(!E||E.t!==t||E.nb!==this.s.buildings.length||E.nu!==this.s.units.length||E.nv!==this.s.vehicles.length){E=K[c.f]={t,nb:this.s.buildings.length,nu:this.s.units.length,nv:this.s.vehicles.length,m:new Map()};
      const of=id=>{let o=E.m.get(id);if(!o)E.m.set(id,o={cap:0,res:0,houses:0});return o;};
      for(const b of this.s.buildings){if(b.f!==c.f)continue;const B=BUILDINGS[b.k];const pop=b.done&&B.pop;if(!pop&&b.k!=='maison')continue;const ct=this.cityOf(b);if(!ct)continue;const o=of(ct.id);if(pop)o.cap+=B.pop;if(b.k==='maison')o.houses++;}
      for(const u of this.s.units){if(u.f!==c.f)continue;const h=this.homeOf(u);if(h)of(h.id).res++;}
      for(const v of this.s.vehicles){if(v.k!=='porteur'||v.f!==c.f||!v.u)continue;const h=this.homeOf(v.u);if(h)of(h.id).res++;}}
    const o=E.m.get(c.id);return o?{cap:o.cap,res:o.res,houses:o.houses}:{cap:0,res:0,houses:0};}
  cityFoodRate(c){const m=c._food;if(m&&this.s.t-m.t<.25&&m.t<=this.s.t)return m.v;const v=this.cityFoodRate0(c);Object.defineProperty(c,'_food',{value:{t:this.s.t,v},writable:true,configurable:true,enumerable:false});return v;}
  cityFoodRate0(c){let rate=0;for(const u of this.s.units)if(u.f===c.f&&alive(u)&&this.homeOf(u)===c)rate+=u.k==='villageois'?FOOD_CIVIL:FOOD_SOLDIER;
    for(const v of this.s.vehicles)if(v.f===c.f&&v.k==='porteur'&&v.u&&this.homeOf(v.u)===c)rate+=FOOD_CIVIL;
    for(const b of this.s.buildings)if(b.inside?.length&&b.f===c.f&&this.cityOf(b)===c)rate+=b.inside.length*FOOD_SOLDIER;return rate*(c.f==='beee'?BEEE.frugal||1:MEUMEU_FRUGAL);}
  rationTick(c,dt){c.rationT=(c.rationT||0)+dt;if(c.rationT<1)return;
    while(c.rationT>=1){c.rationT-=1;const need=this.cityFoodRate(c),got=Math.min(need,c.stock.vivres||0);c.stock.vivres=(c.stock.vivres||0)-got;c.ration=need?got/need:1;
      if(c.ration<.5&&c.rationWarn!==this.day){c.rationWarn=this.day;this.log(c.city,`Rations basses : ${Math.round(c.ration*100)} % des besoins couverts. La croissance ralentit jusqu'au ravitaillement.`,'warn');}}}
  cities(f){return this.s.buildings.filter(b=>b.k==='centre'&&b.f===f&&!b.ruin&&b.done);}
  cityName(b){const c=this.centreOf(b);return c&&d2(c.i,c.j,b.i,b.j)<30?c.city:b.f==='beee'?'Terres bèè':'Avant-poste';}
  capital(){return this.s.buildings.find(b=>b.capital)||null;}

  // ---------- les dépôts ----------
  isDepot(b){return !!(BUILDINGS[b.k].store&&(b.done||b.k==='gare'&&!b.ruin&&b.site===b.id&&this.netOf(b)!=null));}
  depotList(f){const c=(this._dl??={})[f];if(c&&c.t===this.s.t&&c.n===this.s.buildings.length)return c.L;const L=this.s.buildings.filter(b=>b.f===f&&this.isDepot(b));this._dl[f]={t:this.s.t,n:this.s.buildings.length,L};return L;}
  // le dépôt le plus proche (à r cases au plus, qui passe le filtre ok) : un seul passage, sans trier (canPlace l'appelle pour
  // chaque emplacement essayé — des milliers par heure quand l'IA bèè cherche où bâtir)
  nearestDepot(f,x,y,r=RADIUS,ok=null){let best=null,bd=r+1e-9;for(const b of this.depotList(f)){if(ok&&!ok(b))continue;const d=this.distB(b,x,y);if(d<bd){bd=d;best=b;}}return best;}
  depots(f,x,y,r=RADIUS){const L=[];for(const b of this.depotList(f)){const d=this.distB(b,x,y);if(d<=r)L.push([d,b]);}L.sort((a,z)=>a[0]-z[0]);return L.map(o=>o[1]);}
  distB(b,x,y){const [w,h]=this.sizeOf(b);const dx=Math.max(b.i-x,0,x-(b.i+w)),dy=Math.max(b.j-y,0,y-(b.j+h));return Math.hypot(dx,dy);}
  // ce qu'un dépôt contient, pesé (une arme pèse sa masse, le reste compte une caisse)
  stored(b){let s=0;const st=b.stock;if(!st)return 0;for(const k in st){const v=st[k];s+=k.charCodeAt(1)===58&&(k[0]==='a'||k[0]==='p')?v*weightOf(k,this.s.designs,this.s.armors):v;}return s;}
  room(b){return Math.max(0,BUILDINGS[b.k].store-this.stored(b));}
  have(f,x,y,r=RADIUS){const o={};for(const b of this.depots(f,x,y,r))for(const [k,v] of Object.entries(b.stock))o[k]=(o[k]||0)+v;return o;}
  canPay(f,x,y,cost,r=RADIUS){const h=this.have(f,x,y,r);const miss=Object.entries(cost).filter(([k,n])=>(h[k]||0)<n-1e-6).map(([k,n])=>`${+(n-(h[k]||0)).toFixed(2)} ${this.goodName(k).toLowerCase()}`);return {ok:!miss.length,miss};}
  pay(f,x,y,cost,r=RADIUS){if(!this.canPay(f,x,y,cost,r).ok)return false;for(const [k,n0] of Object.entries(cost)){let n=n0;for(const b of this.depots(f,x,y,r)){const q=Math.min(n,b.stock[k]||0);b.stock[k]=(b.stock[k]||0)-q;n-=q;if(n<=1e-9)break;}}return true;}
  // prendre au plus `n` d'un bien dans les dépôts proches ; renvoie ce qui a été pris
  take(f,x,y,k,n,r=RADIUS){let got=0;for(const b of this.depots(f,x,y,r)){const q=Math.min(n-got,b.stock[k]||0);if(q>0){b.stock[k]-=q;got+=q;}if(got>=n-1e-9)break;}return got;}
  put(b,k,n){if(BUILDINGS[b.k].foodOnly&&!['vivres','grain','ble_moulu'].includes(k))return 0;const w=weightOf(k,this.s.designs,this.s.armors);const q=Math.max(0,Math.min(n,this.room(b)/w));b.stock[k]=(b.stock[k]||0)+q;return q;}
  dropAt(u){const comp=this.G.comp;const here=comp[(Math.floor(u.y))*this.N+Math.floor(u.x)];
    let best=null,bd=Infinity;const food=['vivres','grain','ble_moulu'].includes(u.carry?.k);for(const b of this.depotList(u.f)){if(comp[(b.j)*this.N+b.i]!==here||BUILDINGS[b.k].foodOnly&&!food)continue;const d=this.distB(b,u.x,u.y);if(d<bd&&this.room(b)>=1){bd=d;best=b;}}return best;}

  // ---------- se déplacer ----------
  costFn(f){const ter=this.G.terrain,occ=this.occ,wall=this.wall,crater=this.crater;const mine=f==='meumeu'?1:-1;
    return k=>{if(k<0||k>=ter.length||!TERRAIN[ter[k]]?.walk||occ[k]>=0)return Infinity;const w=wall[k];if(w===-3*mine)return Infinity;if(w===-2*mine)return 25;return 1+Math.min(2.2,crater[k]||0);};}
  stampCrater(c){if(!this.crater)return;const N=this.N,r=Math.max(.25,c.r||.5);for(let j=Math.max(0,Math.floor(c.y-r));j<=Math.min(N-1,Math.ceil(c.y+r));j++)for(let i=Math.max(0,Math.floor(c.x-r));i<=Math.min(N-1,Math.ceil(c.x+r));i++){const d=d2(i+.5,j+.5,c.x,c.y);if(d<r)this.crater[j*N+i]=Math.max(this.crater[j*N+i],(1-d/r)*(c.force||1));}}
  addCrater(x,y,r,force=1){const C=this.s.craters??=[];const c={x,y,r:Math.max(.3,Math.min(3.8,r)),force:Math.max(.2,Math.min(2.2,force)),seed:this.rand()*10000,t:this.s.t};C.push(c);this.stampCrater(c);this.navDirty=true;if(C.length>500){C.splice(0,C.length-500);this.crater.fill(0);for(const q of C)this.stampCrater(q);}return c;}
  go(u,tx,ty,rect=null){const N=this.N;
    // un long trajet : les étapes du grand chemin (quadrillage de huit, instantané), et le chemin fin seulement jusqu'à l'étape
    // suivante — une recherche sur toute la carte coûtait jusqu'à deux dixièmes de seconde, et il y en avait quatorze par image
    if(!rect&&this.coarseRoute&&Math.hypot(tx-u.x,ty-u.y)>48){const gk=Math.floor(tx/8)+','+Math.floor(ty/8);if(!u.cr||u.crk!==gk){u.cr=this.coarseRoute(u.x,u.y,tx,ty);u.crk=gk;u.ci=0;}const R=u.cr;
      if(R.length>3){let best=u.ci||0,bd=1e9;for(let k=u.ci||0;k<Math.min(R.length,(u.ci||0)+10);k++){const d=Math.hypot(R[k][0]-u.x,R[k][1]-u.y);if(d<bd){bd=d;best=k;}}u.ci=best;const w=R[Math.min(R.length-2,best+3)];[tx,ty]=this.freeSpot(w[0],w[1],4);}}
    else if(u.cr){u.cr=null;u.crk=null;}
    const key=rect?`r${rect.join(',')}`:`${Math.floor(tx)},${Math.floor(ty)}`;if(u.pathWait>0){u.pathWait=Math.max(0,u.pathWait-this.dt);u.anim='idle';return false;}
    // au plus quatorze recherches de chemin par instant : les autres attendent le suivant (pas d'à-coup quand cent Bèè repartent ensemble)
    if((u.goal!==key||!u.path)&&(this.pathBudget??1)<=0){u.anim='idle';return false;}
    if(u.goal!==key||!u.path){this.pathBudget=(this.pathBudget??14)-1;const cost=this.costFn(u.f);
      // enfermé sur une case devenue infranchissable (un chantier qui prend corps autour de son bâtisseur) : un pas de côté vers la case libre la plus proche —
      // mesuré : un bâtisseur bèè resté 175 heures dans l'emprise de la manufacture, sa réservation de pierre bloquait le chantier et toute l'armurerie
      {const ci=clamp(Math.floor(u.x),0,N-1),cj=clamp(Math.floor(u.y),0,N-1);if(cost(cj*N+ci)===Infinity){const [fx,fy]=this.freeSpot(u.x,u.y,6);if(Math.hypot(fx-u.x,fy-u.y)<7){u.x=fx;u.y=fy;}}}
      const si=clamp(Math.floor(u.x),0,N-1),sj=clamp(Math.floor(u.y),0,N-1),ti=clamp(Math.floor(tx),0,N-1),tj=clamp(Math.floor(ty),0,N-1);
      const goal=rect?(k=>{const i=k%N,j=(k/N)|0;return i>=rect[0]-1&&i<=rect[0]+rect[2]&&j>=rect[1]-1&&j<=rect[1]+rect[3];}):(k=>{const i=k%N,j=(k/N)|0;if(k===tj*N+ti)return true;return cost(tj*N+ti)===Infinity&&Math.abs(i-ti)<=1&&Math.abs(j-tj)<=1&&cost(k)!==Infinity;});
      const ck=`${u.f}|${si},${sj}>${key}`,C=this.pathCache??=new Map();let r=C.get(ck);
      if(!r||this.s.t-r.t>3||r.v!==this.occV||r.w!==this.wallV){r=this.pather.find(si,sj,ti,tj,cost,goal,Math.max(30000,N*120));r.t=this.s.t;r.v=this.occV;r.w=this.wallV;C.set(ck,r);if(C.size>4000)C.delete(C.keys().next().value);}else this.pathBudget++;u.path=r.sm||(r.sm=this.smooth(si,sj,r.path,cost));u.pathDone=r.done;u.goal=key;u.pi=0;const tail=r.path[r.path.length-1];const ei=tail?tail[0]:si,ej=tail?tail[1]:sj;u.pathExact=r.done&&!rect&&ei===ti&&ej===tj?[tx,ty]:r.done&&!rect?[ei+.5,ej+.5]:null;if(!r.done&&r.path.length===0){u.path=null;u.pathWait=.25;u.why='passage bloqué : nouvelle recherche en cours';return false;}}
    return this.follow(u,rect?null:(u.pathExact||[tx,ty]));}
  speedOf(u,raw=false){const D=UDEF(u);const LK=D.choc?.load??1;let s=D.speed*(u.armor?1-(1-(this.armorOf(u.armor)?.D.move||1))*LK:1)*(u.carry?.n>5?.85:1)*(u.carrying!=null?.55*this.mod('brancard'):1)*(u.amput?.7:1);if(u.h){if(u.h.state==='hors')return 0;s*=Math.max(.15,malus(u.h).move);}if(u.post==='couche')s*=.25;else if(u.post==='accroupi')s*=.7;// la charge : l'arme, ses munitions, la batterie de l'infrarouge ; jusqu'au tiers de son poids, on marche presque normalement
    if(u.w){const Wd=this.W(u.w);if(!(Wd.crew>1)){const kg=((Wd.mass||0)+((u.mag||0)+(u.pouch||0))*(Wd.rm||0)/1000+(Wd.ir?.packKg||0)+(u.bino?.03:0)+this.crateKg(u))*LK;const L=kg/1.5;if(L>.3)s*=Math.max(.55,1-(L-.3)*1.1);}}   // une pièce servie : son poids est poussé par ses servants (plus bas)
    if(u.w){const Wd=this.W(u.w);if(Wd.crew>1){const P=this.pushSpeed(u,Wd);if(P!=null)s*=Math.max(0,P/.7);else{const n=this.servants(u,1.5).length;s*=Math.min(.8,.3+.5*n/(Wd.crew-1));}}}if(u.crates>0&&!(u.w&&!(this.W(u.w).crew>1))){const L=this.crateKg(u)/1.5;if(L>.3)s*=Math.max(.55,1-(L-.3)*1.1);}   // les caisses pèsent ce qu'elles contiennent : un obus de 700 g n'est pas 834 cartouches
    // un servant décroché presse le pas
    if(u.serve&&u.task&&Math.hypot(u.task.tx-u.x,u.task.ty-u.y)>.7)s*=1.35;
    // chaque Bèè a son pas (à dix pour cent près) ; vers une alerte fraîche (moins d'une heure), ils courent
    if(u.f==='beee'){s*=.9+((u.id*37)%21)/100;if(u.task?.kind==='search'&&!u.task.scout&&this.s.t-(u.task.t0??-9)<1)s*=1.3;}
    // en formation : on règle son pas sur le plus lent, et celui qui a pris de l'avance ralentit pour garder l'alignement
    if(!raw&&u.sq&&u.task?.fm){const sq=this.squad(u.sq);if(sq?.pace>0)s=Math.min(s,sq.pace);if(u.fmLag>0)s*=Math.max(.35,1-u.fmLag*.4);}
    return s;}
  // Une pièce d'artillerie (une arme servie lourde) se pousse ou se porte par ses servants : sa vitesse suit les kilos par
  // servant présent. Roues : 0,86·exp(−kg/10) m/s ; à l'épaule : 0,78·exp(−kg/2,15) m/s. Traîneau et plateforme se traînent.
  // Un affût fixe (pieux) ne bouge pas. Renvoie des m/s à l'échelle d'un marcheur (1,4 m/s = le pas normal du soldat), ou null
  // pour une arme servie légère (mitrailleuse portée), qui garde l'ancien modèle.
  pushSpeed(u,Wd){const car=Wd.p?.carriage;if(car==='fixe'||car==='pieux'||Wd.carriage?.fixed)return 0;
    const how=!!ACTIONS[Wd.p?.action]?.howitzer;if(Wd.pushMps==null&&!how&&!Wd.fixed)return null;
    const n=1+this.servants(u,1.6).length;if(Wd.pushMps!=null)return Wd.pushMps*Math.min(1,n/Math.max(1,Wd.crewMin||Wd.crew));
    const kg=(Wd.mass||0)/n;const wheels=how&&(!car||car==='roues'||car==='bifleche');
    if(wheels)return .86*Math.exp(-kg/10);if(how&&car==='traineau')return .86*Math.exp(-kg/10)*.55;if(how&&car==='plateforme')return .86*Math.exp(-kg/10)*.3;return .78*Math.exp(-kg/2.15);}
  // les servants d'une pièce : ceux de l'escouade qui la servent, à `r` cases au plus
  // (le rayon de présence s'élargit avec l'équipage : au-delà de sept servants, la table des places (unitTick) les range plus loin en arrière ; à 1,2 case fixe,
  //  un équipage de douze en comptait huit « présents » et la pièce tirait « au ralenti » avec tout son monde)
  servants(u,r=1.2){r=Math.max(r,this.crewReach(u));return this.s.units.filter(o=>o.serve===u.id&&alive(o)&&o.h?.state!=='hors'&&Math.hypot(o.x-u.x,o.y-u.y)<=r);}
  crewReach(u){const n=u.w?Math.max(1,this.W(u.w).crew)-1:1;return 1.25+Math.max(0,n-7)*.19;}
  // Une tranchée n'est pas qu'un couvert : son parapet cale le bipied et le fond dur reçoit les jambes d'un trépied.
  // Les armes servies s'y mettent plus vite en batterie et vibrent moins, sans transformer un fusil à l'épaule en pièce fixe.
  trenchRest(u,Wd=null){const i=Math.floor(u.x),j=Math.floor(u.y),o=this.s.sacs[j*this.N+i];if(!o?.b||o.f!==u.f)return 1;const W=Wd||u.w&&this.W(u.w);if(W&&(W.have==='bipied'||W.have==='trepied'))return .58;return .88;}
  // Une pièce hors escouade prend ses servants d'elle-même : les servants de pièce libres (ou sans arme) à moins de huit cases,
  // les plus proches d'abord ; ceux d'une pièce détruite ou partie se libèrent (unitTick). Sans cela elle restait sans équipage.
  crewTick(){this.crT=(this.crT||0)+this.dt;if(this.crT<.25)return;this.crT=0;
    for(const g of this.s.units){if(g.sq||!g.w||!active(g))continue;const need=(this.W(g.w).crew||1)-1;if(need<=0)continue;const have=this.s.units.filter(o=>o.serve===g.id&&active(o)).length;if(have>=need)continue;
      const free=this.s.units.filter(o=>o.f===g.f&&o!==g&&!o.sq&&!o.serve&&active(o)&&o.k!=='villageois'&&!UNITS[o.k]?.medic&&(o.servant||!o.w)&&Math.hypot(o.x-g.x,o.y-g.y)<8).sort((a,b)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y));
      for(const o of free.slice(0,need-have))o.serve=g.id;}}
  // une escouade répartit ses rôles : pour chaque pièce, ses servants (les plus proches) ; le reste tire
  assignCrews(sq){const ms=this.members(sq).filter(active),inside=new Set(ms.map(u=>u.id));
    const crewOf=g=>g.w?this.W(g.w).crew:(UDEF(g).img==='canon'?UDEF(g).crew||2:1);
    for(const u of this.members(sq))if(u.serve){const gun=ms.find(g=>g.id===u.serve);if(!active(u)||!gun||crewOf(gun)<=1||u.id===gun.id)u.serve=null;}
    for(const g of ms){const need=Math.max(0,crewOf(g)-1);if(!need)continue;let assigned=ms.filter(o=>o.serve===g.id).sort((a,b)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y));
      for(const o of assigned.slice(need))o.serve=null;if(assigned.length>=need)continue;
      const free=ms.filter(o=>o!==g&&!o.serve&&o.role!=='munitions'&&!UNITS[o.k]?.medic&&!(o.w&&this.W(o.w).crew>1)).sort((a,b)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y));for(const o of free.slice(0,need-assigned.length))if(inside.has(o.id))o.serve=g.id;}}
  // la ligne droite entre deux cases est-elle libre (sans couper un coin bloqué) ?
  clearLine(ax,ay,bx,by,cost){const N=this.N;const d=Math.hypot(bx-ax,by-ay);const n=Math.ceil(d/.3);for(let k=1;k<n;k++){const x=ax+(bx-ax)*k/n,y=ay+(by-ay)*k/n;for(const [ox,oy] of [[0,0],[.28,0],[-.28,0],[0,.28],[0,-.28]]){if(cost(Math.floor(y+oy)*N+Math.floor(x+ox))>=20)return false;}}return true;}
  smooth(si,sj,path,cost){if(path.length<3)return path;const out=[];let ax=si+.5,ay=sj+.5,k=0;
    while(k<path.length){let far=k;for(let m=Math.min(path.length-1,k+12);m>k;m--){if(this.clearLine(ax,ay,path[m][0]+.5,path[m][1]+.5,cost)){far=m;break;}}out.push(path[far]);ax=path[far][0]+.5;ay=path[far][1]+.5;k=far+1;}return out;}
  follow(u,exact){const sp=this.speedOf(u)*this.dt;let left=sp;if(sp<=0){u.anim='idle';u.why??=(u.w&&this.W(u.w).crew>1?'pièce sur affût fixe : elle ne se déplace pas':null);return false;}
    // un chemin neuf part du centre de la case : on saute les premiers points déjà dépassés (pas de demi-tour pour y revenir)
    if(u.pathSkip!==u.path){u.pathSkip=u.path;const cost=this.costFn(u.f);while(u.pi<Math.min(u.path.length-1,3)){const [i,j]=u.path[u.pi+1];if(!this.clearLine(u.x,u.y,i+.5,j+.5,cost))break;u.pi++;}}
    // coincé (des camarades sur la même place, une bousculade) : tout près du but, on s'y tient ; plus loin, on recalcule
    {const k=u.stk;if(!k||k.p!==u.path){u.stk={p:u.path,t:this.s.t,x:u.x,y:u.y,n:k&&k.p===null&&this.s.t-k.t<2?k.n:0};}else if(this.s.t-k.t>=.5){const moved=Math.hypot(u.x-k.x,u.y-k.y),want=this.speedOf(u)*(this.s.t-k.t);
      if(moved<want*.2){const end=exact||(u.path.length?[u.path[u.path.length-1][0]+.5,u.path[u.path.length-1][1]+.5]:[u.x,u.y]);if(Math.hypot(end[0]-u.x,end[1]-u.y)<1.3||k.n>=3){u.stk=null;u.anim='idle';return true;}
        u.stk={p:null,t:this.s.t,x:u.x,y:u.y,n:k.n+1};u.path=null;u.goal=null;u.pathExact=null;u.pathWait=.1;u.anim='idle';return false;}
      k.t=this.s.t;k.x=u.x;k.y=u.y;}}
    // la dernière place est prise par un camarade immobile : on s'arrête à côté plutôt que de le pousser sans fin
    if(exact&&u.pi>=u.path.length&&Math.hypot(exact[0]-u.x,exact[1]-u.y)<.5&&this.near(exact[0],exact[1],.3,o=>o!==u&&o.f===u.f&&alive(o)&&o.anim!=='walk'&&Math.hypot(o.x-exact[0],o.y-exact[1])<.28)){u.anim='idle';return true;}
    while(left>0){let tgt;if(u.pi<u.path.length){const [i,j]=u.path[u.pi];tgt=[i+.5,j+.5];
        // le but exact est dans la dernière case : on y va tout droit, sans passer par le centre de la case pour revenir en arrière (ce demi-tour retournait la pièce)
        if(exact&&u.pathDone&&u.pi===u.path.length-1&&Math.floor(exact[0])===i&&Math.floor(exact[1])===j)tgt=exact;}else if(u.pathDone){if(exact)tgt=exact;else{u.anim='idle';return true;}}else{u.path=null;u.goal=null;u.pathExact=null;u.pathWait=.25;u.why='chemin incomplet : reprise du calcul';u.anim='idle';return false;}
      if(u.pi<u.path.length){const [i,j]=u.path[u.pi];const w=this.wall[j*this.N+i];if(w===(u.f==='meumeu'?-2:2)){u.blockedBy=j*this.N+i;u.path=null;u.goal=null;u.pathWait=.25;u.anim='idle';return false;}}
      // un pas de rattrapage de moins de 0,12 case (la séparation des camarades vient de la pousser) ne la tourne pas : à l'arrêt, une pièce garde son cap
      const dx=tgt[0]-u.x,dy=tgt[1]-u.y,d=Math.hypot(dx,dy);if(d>(u.pi<u.path.length?.12:.3))this.face(u,dx,dy);
      if(d<=left){u.x=tgt[0];u.y=tgt[1];left-=d;u.walkPh=(u.walkPh||0)+d*2.6;if(u.pi<u.path.length)u.pi++;else{u.anim='idle';return true;}}else{u.x+=dx/d*left;u.y+=dy/d*left;u.walkPh=(u.walkPh||0)+left*2.6;left=0;}}
    u.anim='walk';u.moved=this.s.t;u.blockedBy=null;if(u.why?.startsWith('pièce sur affût'))u.why=null;return false;}
  face(u,dx,dy){const n=Math.hypot(dx,dy);if(n<1e-6)return;u.fx=dx/n;u.fy=dy/n;const sx=dx-dy,sy=dx+dy;u.dir=sy>=0?(sx>=0?'se':'sw'):(sx>=0?'ne':'nw');}

  // ---------- les escouades ----------
  // Des soldats choisis, la touche G : une escouade. On la commande d'un bloc ; elle se met en formation, se couvre, se soigne.
  formSquad(ids){const us=ids.map(id=>this.unit(id)).filter(u=>alive(u)&&u.f==='meumeu'&&u.k!=='villageois');if(us.length<2)return {ok:false,why:['au moins deux soldats']};
    for(const u of us)if(u.sq)this.leave(u);const n=++this.s.squadN;const sq={id:this.id(),f:'meumeu',name:`${n}${n===1?'re':'e'} escouade`,m:us.map(u=>u.id),leader:us.slice().sort((a,b)=>(b.xp||0)-(a.xp||0))[0].id,morale:1,form:'ligne'};
    for(const u of us)u.sq=sq.id;this.s.squads.push(sq);this.assignCrews(sq);this.log('Armée',`${sq.name} formée : ${us.length} ${us.length>1?'hommes':'homme'}.`,'good');return {ok:true,sq,text:`${sq.name} : ${us.length}`};}
  squad(id){return this.s.squads.find(q=>q.id===id)||null;}
  // Changer d'arme, de protection : au dépôt le plus proche (à moins de RADIUS cases), qui doit l'avoir en stock ; l'ancienne y reste
  rearm(u,wid){const cas=this.s.buildings.find(b=>b.f===u.f&&b.done&&!b.ruin&&isBarracks(b.k)&&this.distB(b,u.x,u.y)<4);if(!cas)return {ok:false,why:['on ne change d’arme qu’à la caserne : envoyez-le là-bas']};
    const dep=this.depots(u.f,cas.i+1,cas.j+1)[0];if(!dep)return {ok:false,why:[`aucun dépôt à moins de ${RADIUS} cases de la caserne`]};if(u.w===wid)return {ok:true};
    if((dep.stock['a:'+wid]||0)<1)return {ok:false,why:[`${this.design(wid)?.name||'cette arme'} : aucune au ${this.depotName(dep)}`]};
    dep.stock['a:'+wid]-=1;if(u.w){this.put(dep,'a:'+u.w,1);const Wo=this.W(u.w);const back=(u.mag+u.pouch)/Wo.perCrate;if(back>0)this.put(dep,'m:'+u.w,back);}
    u.w=wid;u.mag=0;u.pouch=0;this.resupply(u);const Wn=this.W(wid);const n=Math.min(Wn.p.mag,u.pouch);u.mag=n;u.pouch-=n;u.serve=null;const sq=u.sq&&this.squad(u.sq);if(sq)this.assignCrews(sq);return {ok:true};}
  rearmor(u,aid){const dep=this.depots(u.f,u.x,u.y)[0];if(!dep)return {ok:false,why:[`aucun dépôt à moins de ${RADIUS} cases`]};if((u.armor||'')===(aid||''))return {ok:true};
    if(aid&&(dep.stock['p:'+aid]||0)<1)return {ok:false,why:[`${this.s.armors[aid]?.name||'cette protection'} : aucune au ${this.depotName(dep)}`]};
    if(aid)dep.stock['p:'+aid]-=1;if(u.armor)this.put(dep,'p:'+u.armor,1);u.armor=aid||null;u.plates={};return {ok:true};}
  // le rôle dans l'escouade : tireur, servant d'une pièce, porteur de munitions
  setRole(u,role){if(role==='munitions'){u.role='munitions';u.serve=null;}else if(role?.startsWith('serve:')){u.role=null;u.serve=+role.slice(6);}else{u.role=null;u.serve=null;}return {ok:true};}
  joinSquad(u,sid){const sq=this.squad(sid);if(!u||u.f!=='meumeu'||!alive(u)||u.k==='villageois'||!sq)return {ok:false,why:['soldat ou escouade introuvable']};if(u.sq===sq.id)return {ok:true,text:`${u.name||'Le soldat'} est déjà dans ${sq.name}`};if(u.sq)this.leave(u);if(!sq.m.includes(u.id))sq.m.push(u.id);u.sq=sq.id;this.assignCrews(sq);this.log('Armée',`${u.name||'Un soldat'} rejoint ${sq.name}.`,'good');return {ok:true,text:`${u.name||'Le soldat'} rejoint ${sq.name}`};}
  // Le porteur de munitions : deux caisses au plus, des munitions de l'arme la plus portée de son escouade ; il les prend au
  // dépôt quand il passe à portée, et remplit les cartouchières de ceux qui sont à moins de 1,5 case et ont moins de la moitié.
  bearerTick(u){if(u.crewAmmo)return;const sq=this.squad(u.sq);if(!sq)return;const ms=this.members(sq).filter(o=>o.w&&alive(o));if(!ms.length)return;
    const cnt={};for(const o of ms)cnt[o.w]=(cnt[o.w]||0)+1;
    if((u.crates||0)>0&&u.ammoW&&!cnt[u.ammoW])return;   // des caisses d'un type que personne de l'escouade n'utilise : il les garde (elles ne se perdent pas, ne se changent pas en autre chose)
    const wid=u.ammoW&&cnt[u.ammoW]?u.ammoW:Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];if(u.ammoW!==wid){u.ammoW=wid;u.crates=0;}
    const Wd=this.W(wid);if((u.crates||0)<2){const got=this.take(u.f,u.x,u.y,'m:'+wid,2-(u.crates||0),Wd.crew>1?2.5:RADIUS);if(got>0)u.crates=(u.crates||0)+got;}
    if(!(u.crates>0))return;for(const o of ms){if(o.w!==wid||o===u||Math.hypot(o.x-u.x,o.y-u.y)>1.5)continue;const want=Wd.carry-(o.pouch||0);if(want<Wd.carry*.5)continue;
      const give=Math.min(want,Math.floor(u.crates*Wd.perCrate));if(give<=0)break;o.pouch=(o.pouch||0)+give;u.crates=Math.max(0,u.crates-give/Wd.perCrate);if(o.why?.startsWith('à sec'))o.why=null;}}
  leave(u){const sq=this.squad(u.sq);u.sq=null;if(!sq)return;sq.m=sq.m.filter(id=>id!==u.id);if(sq.leader===u.id)sq.leader=sq.m[0]??null;if(!sq.m.length)this.s.squads.splice(this.s.squads.indexOf(sq),1);}
  dissolve(id){const sq=this.squad(id);if(!sq)return;for(const mid of sq.m){const u=this.unit(mid);if(u)u.sq=null;}this.s.squads.splice(this.s.squads.indexOf(sq),1);}
  members(sq){return sq.m.map(id=>this.unit(id)).filter(Boolean);}

  // ---------- les ordres du joueur ----------
  targetAt(x,y,f='meumeu'){const N=this.N;const i=Math.floor(x),j=Math.floor(y);
    const en=this.s.units.filter(u=>alive(u)&&(u.f===f||this.s.fog===false||this.spotted(u,f))&&d2(u.x,u.y,x,y)<.7).sort((a,b)=>d2(a.x,a.y,x,y)-d2(b.x,b.y,x,y))[0];if(en)return {type:'unit',id:en.id};
    // un véhicule de combat : sous le curseur, dans son emprise
    for(const v of this.s.vehicles){const V=VEHDEF[v.k];if(!V||(v.f!==f&&this.s.fog!==false&&!this.vehSeen(f,v)))continue;const c=Math.cos(v.h),s=Math.sin(v.h),lx=(x-v.x)*c+(y-v.y)*s,ly=-(x-v.x)*s+(y-v.y)*c;if(Math.abs(lx)<V.long/2+.2&&Math.abs(ly)<V.large/2+.2)return {type:'vehicle',id:v.id};}
    const beast=this.s.fauna?.find(a=>a.alive&&d2(a.x,a.y,x,y)<.7);if(beast)return {type:'fauna',id:beast.id};
    const carcass=this.s.fauna?.find(a=>!a.alive&&a.food>0&&d2(a.x,a.y,x,y)<.7);if(carcass)return {type:'carcass',id:carcass.id};
    if(i<0||j<0||i>=N||j>=N)return null;const k=j*N+i;
    const bid=this.occ[k]>=0?this.occ[k]:this.fortB[k];if(bid>=0){const b=this.building(bid);if(b?.f!==f&&this.s.fog!==false&&!this.s.intel?.[b?.id]&&!this.visibleAt(f,x,y))return {type:'point',x,y};return {type:'building',id:bid};}
    const w=this.wall[k];if(w)return {type:'wall',k};if(this.s.sacs[k])return {type:'sacs',k};
    if(this.nodeAt[k]>=0)return {type:'node',id:this.nodeAt[k]};
    if(this.rail[k]===1)return {type:'rail',k};
    return {type:'point',x,y};}
  order(ids,t,internal=false){const us=ids.map(id=>this.unit(id)).filter(u=>u&&u.f==='meumeu'&&active(u));if(!us.length||!t)return {ok:false,why:['personne en état']};if(!internal)this.interruptOperations(ids);for(const u of us)u.observe=null;const vil=us.filter(u=>u.k==='villageois');
    const set=(u,task)=>{u.task=task;u.path=null;u.goal=null;u.pathExact=null;u.pathWait=0;u.idleT=0;u.hold=false;u.why=null;};
    const hostile=(t.type==='unit'&&this.unit(t.id)?.f==='beee')||(t.type==='building'&&this.building(t.id)?.f==='beee')||(t.type==='wall'&&this.s.walls[t.k]?.f==='beee');
    if(hostile&&!this.atWar)this.declareWar('meumeu');
    if(t.type==='vehicle'){const v=this.s.vehicles.find(o=>o.id===t.id);if(!v||v.hp<=0)return {ok:false,why:['véhicule hors d’usage']};if(v.f!=='meumeu')return {ok:false,why:['pas un des nôtres']};
      const V=VEHDEF[v.k],s=this.vehSeats(v),room=(s.cond?0:1)+V.places.servants-s.serv+V.places.passagers-s.pass;if(room<=0)return {ok:false,why:['plus de place à bord']};
      const go=us.slice(0,room);go.forEach(u=>set(u,{kind:'board',v:v.id}));return {ok:true,text:`${go.length} montent à bord de ${v.name}${us.length>go.length?` (${us.length-go.length} restent : plus de place)`:''}`};}
    if(t.type==='fauna'){const a=this.s.fauna?.find(a=>a.id===t.id&&a.alive);if(!a)return {ok:false,why:['animal introuvable']};if(vil.length){vil.forEach(u=>set(u,{kind:'capture',id:a.id}));return {ok:true,text:`${vil.length} villageois partent capturer l’herbivore`};}const hunters=us.filter(u=>u.k==='chasseur'&&u.w);if(!hunters.length)return {ok:false,why:['un chasseur équipé d’un fusil est nécessaire']};hunters.forEach(u=>set(u,{kind:'hunt',id:a.id}));return {ok:true,text:`${hunters.length} chasseurs en route`};}
    if(t.type==='carcass'){const workers=us.filter(u=>u.k==='villageois'||u.k==='chasseur');if(!workers.length)return {ok:false,why:['envoyer un villageois ou un chasseur récupérer la viande']};workers.forEach(u=>set(u,{kind:'butcher',id:t.id}));return {ok:true,text:'Récupération de la viande'};}
    if(t.type==='unit'){const e=this.unit(t.id);
      if(e.f==='meumeu'){const med=us.filter(u=>UNITS[u.k].medic&&u.kits>0);if(e.h&&(needsCare(e.h)||(needsDoctor(e.h)&&med.some(m=>UNITS[m.k].doctor)))&&med.length){set(med[0],{kind:'soigne',id:e.id});return {ok:true,text:`${med[0].name} court soigner ${e.name||'le blessé'}`};}
        if(e.h?.state==='hors'){const carriers=us.slice(0,2);carriers.forEach(u=>set(u,{kind:'evac',id:e.id}));return {ok:true,text:`${carriers.length} vont chercher ${e.name||'le blessé'}`};}
        us.forEach((u,n)=>set(u,{kind:'move',tx:e.x+(n%3-1)*.5,ty:e.y+(((n/3)|0)%3-1)*.5}));return {ok:true,text:'on le suit'};}
      us.forEach(u=>set(u,{kind:'attack',unit:e.id}));return {ok:true,text:`${us.length} à l’attaque`};}
    if(t.type==='building'){const bb=this.building(t.id);if(bb&&bb.f===us[0].f&&BUILDINGS[bb.k].bunker&&bb.done&&!bb.ruin)return this.garrison(bb,us);}
    if(t.type==='building'&&this.building(t.id)?.f==='beee'){const sab=us.filter(u=>(u.charges||0)>0);
      if(sab.length&&t.queue&&sab.every(u=>u.task?.kind==='sabotage')){for(const u of sab)(u.task.next??=[]).push(t.id);return {ok:true,text:`cible suivante ajoutée : ${BUILDINGS[this.building(t.id).k].name.toLowerCase()} (${sab[0].task.next.length+1} au programme)`};}
      if(sab.length){sab.forEach(u=>set(u,{kind:'sabotage',b:t.id,back:[u.x,u.y],next:[]}));const rest=us.filter(u=>!sab.includes(u));rest.forEach(u=>set(u,{kind:'attack',b:t.id}));
        return {ok:true,text:`${sab.length} partent saboter ${BUILDINGS[this.building(t.id).k].name.toLowerCase()} : ils s’infiltrent courbés, posent leurs charges et s’éclipsent`};}}
    if(t.type==='building'){const b=this.building(t.id);const B=BUILDINGS[b.k];
      if(b.f!=='meumeu'){us.forEach(u=>set(u,{kind:'attack',b:b.id}));return {ok:true,text:`${us.length} à l’assaut de : ${B.name.toLowerCase()}`};}
      // tenir un bâtiment : les soldats se postent contre ses murs, du côté de l'ennemi d'abord, accroupis, et ne le quittent pas pour poursuivre
      const [bw,bh]=this.sizeOf(b);const mil=us.filter(u=>u.k!=='villageois');if(mil.length){const cx=b.i+bw/2,cy=b.j+bh/2;const foe=this.s.beee.cities.filter(c=>!c.fallen).sort((p,q)=>d2(p.x,p.y,cx,cy)-d2(q.x,q.y,cx,cy))[0];const fa=foe?Math.atan2(foe.y-cy,foe.x-cx):0;
        const slots=[];for(let q=0;q<Math.max(8,mil.length*2);q++){const a2=q/Math.max(8,mil.length*2)*Math.PI*2;const r=Math.max(bw,bh)/2+.6;const x=cx+Math.cos(a2)*Math.min(r,bw/2+.6)/Math.max(Math.abs(Math.cos(a2)),.35)*.95,y=cy+Math.sin(a2)*Math.min(r,bh/2+.6)/Math.max(Math.abs(Math.sin(a2)),.35)*.95;slots.push({a2,x,y,w:Math.cos(a2-fa)});}
        slots.sort((p,q)=>q.w-p.w);mil.forEach((u,n)=>{const sl=slots[n%slots.length];const [x,y]=this.freeSpot?this.freeSpot(sl.x,sl.y,2):[sl.x,sl.y];set(u,{kind:'guard',tx:x,ty:y,fx:Math.cos(sl.a2),fy:Math.sin(sl.a2)});u.hold=true;u.orderPost='accroupi';});
        if(!vil.length)return {ok:true,text:`${mil.length} tiennent ${B.name.toLowerCase()} : postés contre les murs, face à l’ennemi`};}
      if(B.airfield&&us.length){us.forEach(u=>set(u,{kind:'board',b:b.id}));return {ok:true,text:`${us.length} embarquent à l’aérodrome`};}
      if(!vil.length)return {ok:true,text:'en position'};
      const docs=B.tent&&!b.done?us.filter(u=>UNITS[u.k].doctor):[];if(docs.length){docs.forEach(u=>set(u,{kind:'build',b:b.id}));if(!vil.length)return {ok:true,text:'on monte la tente'};}
      if(!b.done||b.hp<b.max-1||b.fire>0){vil.forEach(u=>set(u,{kind:!b.done?'build':'repair',b:b.id}));return {ok:true,text:!b.done?`${vil.length} au chantier : ${B.name.toLowerCase()}`:`${vil.length} réparent${b.fire>0?' et éteignent le feu':''}`};}
      if(isBarracks(b.k)&&b.done&&!b.ruin){const go=us.filter(u=>u.k==='villageois'||(UNITS[u.k]?.arm&&u.k!=='canon'));go.forEach(u=>set(u,{kind:'enlist',b:b.id}));return {ok:true,text:`${go.length} vont à la caserne s’entraîner`};}
      if(B.workers){const room=B.workers-this.workers(b,true).length;if(room<=0)return {ok:false,why:[`${B.name} : ${B.workers} places, toutes prises`]};vil.slice(0,room).forEach(u=>set(u,{kind:'work',b:b.id}));return {ok:true,text:`${Math.min(room,vil.length)} au travail : ${B.name.toLowerCase()}`};}
      if(B.store){vil.forEach(u=>set(u,{kind:'deposit',b:b.id}));return {ok:true,text:'ils déposent là'};}
      return {ok:true,text:'rien à y faire'};}
    if(t.type==='wall'){const w=this.s.walls[t.k];if(w&&w.f!=='meumeu'){us.forEach(u=>set(u,{kind:'attack',wall:t.k}));return {ok:true,text:'on abat le mur'};}
      if(w&&!w.b){vil.forEach(u=>set(u,{kind:'line',line:'mur',x:t.k%this.N,y:(t.k/this.N)|0}));return {ok:true,text:'on bâtit le mur'};}}
    if(t.type==='sacs'){const armed=us.filter(u=>u.k!=='villageois'&&!UNITS[u.k]?.medic);
      if(armed.length){const N=this.N;const seen=new Set([t.k]),q=[t.k],cells=[];while(q.length&&cells.length<armed.length*3){const k=q.shift();if(this.s.sacs[k]?.b)cells.push(k);const i=k%N,j=(k/N)|0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const kk=(j+dj)*N+i+di;if(!seen.has(kk)&&this.s.sacs[kk]){seen.add(kk);q.push(kk);}}}
        if(!cells.length)return {ok:false,why:['ce n’est pas encore fait : il faut d’abord poser les sacs ou creuser la fosse']};const step=Math.max(1,Math.floor(cells.length/armed.length));
        armed.forEach((u,n)=>{const k=cells[Math.min(cells.length-1,n*step)];set(u,{kind:'guard',tx:k%N+.5,ty:((k/N)|0)+.5});u.orderPost='couche';});
        if(!vil.length)return {ok:true,text:`${armed.length} occupent ${this.s.sacs[t.k]?.t==='fosses'?'la fosse':'les sacs de sable'}`};}
      vil.forEach(u=>set(u,{kind:'line',line:this.s.sacs[t.k]?.t||'sacs',x:t.k%this.N,y:(t.k/this.N)|0}));return {ok:true,text:this.s.sacs[t.k]?.t==='fosses'?'on creuse la fosse':'on pose les sacs de sable'};}
    if(t.type==='mines'){vil.forEach(u=>set(u,{kind:'line',line:'mines',x:t.k%this.N,y:(t.k/this.N)|0}));return {ok:true,text:'on pose les mines'};}
    if(t.type==='rail'){vil.forEach(u=>set(u,{kind:'line',line:'rail',x:t.k%this.N,y:(t.k/this.N)|0}));return {ok:true,text:`${vil.length} posent la voie`};}
    if(t.type==='node'&&this.s.nodes[t.id]?.type==='ore'&&us.some(u=>(u.charges||0)>0)){const nd=this.s.nodes[t.id];const sab=us.filter(u=>(u.charges||0)>0);
      sab.forEach(u=>set(u,{kind:'sabotage',node:t.id,back:[u.x,u.y],next:[]}));return {ok:true,text:`${sab.length} partent faire effondrer le filon de ${nd.res} : il sera perdu pour tout le monde`};}
    if(t.type==='node'){const nd=this.s.nodes[t.id];if(!vil.length)return {ok:false,why:['seuls les villageois ramassent']};vil.forEach(u=>set(u,{kind:'gather',node:nd.id,type:nd.type,res:nd.res||NODES[nd.type].res}));
      return {ok:true,text:`${vil.length} : ${nd.type==='tree'?'bûcheron':nd.type==='rock'?'carrier':nd.type==='bush'?'cueilleur':'extraction à la main'}`};}
    // un point : on y va en formation, face à la direction de la marche ; les soldats attaquent ce qu'ils croisent
    const cx=us.reduce((a,u)=>a+u.x,0)/us.length,cy=us.reduce((a,u)=>a+u.y,0)/us.length;let dx=t.x-cx,dy=t.y-cy;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;const px=-dy,py=dx;
    // la formation : celle de l'escouade si tous en sont (ligne, colonne, dispersée), sinon en ligne ; les infirmiers suivent derrière
    const sq=us[0].sq&&us.every(u=>u.sq===us[0].sq)?this.squad(us[0].sq):null;
    const slots=this.formSlots(us,sq,t.x,t.y,dx,dy);for(const [u,x,y] of slots)set(u,{kind:u.k==='villageois'||UNITS[u.k].medic?'move':'assault',tx:x,ty:y,fx:dx,fy:dy,fm:us.length>1?1:0});
    if(sq){sq.dir=[dx,dy];sq.fk=`${sq.form||'ligne'}|${sq.spacing??1}`;}
    const stuck=us.find(u=>u.w&&this.W(u.w).crew>1&&this.pushSpeed(u,this.W(u.w))===0);
    return {ok:true,text:(us.length>1?`${us.length} en route, ${sq?{ligne:'en ligne',colonne:'en colonne',dispersee:'dispersés'}[sq.form||'ligne']:'en ligne'}`:'en route')+(stuck?' — la pièce sur affût fixe reste en place':'')};}
  // Les places d'une formation autour d'un point (x, y), face à (dx, dy) : en ligne (un seul rang, deux au-delà de dix),
  // en colonne (deux de front), dispersés (en quinconce, larges). L'écart de l'escouade multiplie les intervalles.
  // Les servants suivent leur pièce, les infirmiers se tiennent derrière. Renvoie [[unité, x, y], …].
  formSlots(us,sq,x,y,dx,dy){const px=-dy,py=dx;const form=sq?.form||'ligne';const k=sq?.spacing??1;
    const lat=u=>u.x*px+u.y*py,fwd=u=>u.x*dx+u.y*dy;let front=us.filter(u=>!UNITS[u.k]?.medic&&!u.serve).sort((a,b)=>lat(a)-lat(b));const rear=us.filter(u=>UNITS[u.k]?.medic&&!u.serve);const n=front.length;
    // chacun prend la place la plus proche de lui : pas de chassé-croisé à travers la ligne
    if(form==='colonne'){front.sort((a,b)=>fwd(b)-fwd(a));const L=[];for(let q=0;q<n;q+=2)L.push(...front.slice(q,q+2).sort((a,b)=>lat(a)-lat(b)));front=L;}
    const cols0=form==='colonne'?2:form==='dispersee'?4:Math.max(1,n>10?Math.ceil(n/2):n);const gap=(form==='dispersee'?2.3:form==='colonne'?1.3:1.35)*k,depth=(form==='dispersee'?2.3:form==='colonne'?1.45:1.4)*k;
    const out=[];front.forEach((u,q)=>{const row=Math.floor(q/cols0),col=q%cols0,cols=Math.min(cols0,n-row*cols0);const off=(col-(cols-1)/2)*gap+(form==='dispersee'&&row%2?gap/2:0),back=row*depth;
      const [fx,fy]=this.walkSpot(x+px*off-dx*back,y+py*off-dy*back);out.push([u,fx,fy]);});
    const rows=Math.ceil(n/cols0);rear.forEach((u,q)=>{const ox=x+px*(q-(rear.length-1)/2)*1.35-dx*(rows*depth+1.45),oy=y+py*(q-(rear.length-1)/2)*1.35-dy*(rows*depth+1.45);out.push([u,ox,oy]);});
    return out;}
  // la place praticable la plus proche (les arbres et buissons se traversent : seuls l'eau, le relief et les bâtiments comptent)
  walkSpot(x,y){const N=this.N,ok=(a,b)=>{const i=Math.floor(a),j=Math.floor(b);if(i<0||j<0||i>=N||j>=N)return false;const k=j*N+i;return !!TERRAIN[this.G.terrain[k]]?.walk&&this.occ[k]<0;};
    if(ok(x,y))return [x,y];for(let r=.5;r<=3;r+=.5)for(let a=0;a<12;a++){const t=a/12*Math.PI*2,xx=x+Math.cos(t)*r,yy=y+Math.sin(t)*r;if(ok(xx,yy))return [xx,yy];}return [x,y];}
  // Tenir : chacun reste où il est, face à l'ennemi (ou devant lui) ; il riposte à portée, ne poursuit pas, ne part rien brûler
  holdOrder(ids){let n=0;for(const id of ids){const u=this.unit(id);if(!u||u.f!=='meumeu'||!active(u))continue;u.task={kind:'guard',tx:u.x,ty:u.y,fx:u.fx,fy:u.fy};u.hold=true;u.path=null;u.goal=null;u.why=null;n++;}
    return n?{ok:true,text:`${n} ${n>1?'tiennent':'tient'} la position`}:{ok:false,why:['personne en état']};}
  // l'escouade change de formation ou d'écart à l'arrêt : elle se replace tout de suite autour de son centre
  reform(sq){const ms=this.members(sq).filter(u=>active(u)&&!u.serve&&(!u.task||u.task.kind==='guard'||u.task.kind==='assault'||u.task.kind==='move'));if(ms.length<2)return;
    const tg=ms.map(u=>u.task?.tx!=null?[u.task.tx,u.task.ty]:[u.x,u.y]);const cx=tg.reduce((a,p)=>a+p[0],0)/tg.length,cy=tg.reduce((a,p)=>a+p[1],0)/tg.length;
    let [dx,dy]=sq.dir||[ms[0].fx||1,ms[0].fy||0];const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
    const ord=ms.slice().sort((a,b)=>((a.x-cx)*-dy+(a.y-cy)*dx)-((b.x-cx)*-dy+(b.y-cy)*dx));
    for(const [u,x,y] of this.formSlots(ord,sq,cx,cy,dx,dy)){const T=u.task;const kind=T?.kind==='assault'?'assault':T?.kind==='move'?'move':'guard';u.task={kind,tx:x,ty:y,fx:dx,fy:dy,fm:1};u.path=null;u.goal=null;}}
  // les ouvriers d'un bâtiment : un index refait une fois par tick (600 unités × 300 bâtiments, c'était la moitié d'une image) ;
  // exact : le compte au moment même, pour qui embauche (ne jamais dépasser les places)
  workers(b,exact=false){if(exact)return this.s.units.filter(u=>u.task?.kind==='work'&&u.task.b===b.id);const t=this.s.t;
    if(this._wkT!==t||!this._wk){this._wkT=t;const m=this._wk=new Map();for(const u of this.s.units){const T=u.task;if(T?.kind==='work'){let a=m.get(T.b);if(!a)m.set(T.b,a=[]);a.push(u);}}}
    return (this._wk.get(b.id)||[]).filter(u=>u.task?.kind==='work'&&u.task.b===b.id);}
  // Les bâtisseurs portent les matériaux : du dépôt du chantier au chantier, CARRY caisses par voyage, jusqu'à ce que tout
  // soit là. Ce qui manque au dépôt y devient une commande (le fret l'y amène : porteurs, trains).
  siteDepot(b){const D=this.building(b.site);if(D&&this.isDepot(D)&&!D.ruin&&!BUILDINGS[D.k].foodOnly)return D;const [x,y]=this.bc(b);const N=this.depots(b.f,x,y,SITE_RANGE).find(d=>!BUILDINGS[d.k].foodOnly)||null;if(N)b.site=N.id;return N;}
  enRoute(b,k){const t=this.s.t;if(this._erT!==t||!this._er){this._erT=t;const m=this._er=new Map();for(const u of this.s.units){const T=u.task;if(T?.kind!=='build')continue;let o=m.get(T.b);if(!o)m.set(T.b,o={});
      if(T.fetch)o[T.fetch]=(o[T.fetch]||0)+(T.fetchN||0);else if(u.carry&&T.bring)o[u.carry.k]=(o[u.carry.k]||0)+u.carry.n;}}return this._er.get(b.id)?.[k]||0;}
  // au chantier : déposer ce qu'on porte ; sinon partir chercher ce qui manque le plus. Rend vrai si le chantier a de quoi avancer.
  haulTick(u,T0,b,dt){b.paid??={};if(u.carry&&T0.bring){const k=u.carry.k;const need=Math.max(0,(this.siteCost(b)[k]||0)-(b.paid[k]||0));const q=Math.min(need,u.carry.n);b.paid[k]=(b.paid[k]||0)+q;u.carry.n-=q;
      if(u.carry.n<=1e-6)u.carry=null;T0.bring=false;if(q>0)return true;}
    const rem=this.siteRemaining(b);const D=this.siteDepot(b);u.anim='idle';
    if(!D){b.why='aucun dépôt d’où apporter les matériaux';return false;}
    // Ce qui manque le plus EN PROPORTION passe d'abord : la progression d'un chantier est bornée par son matériau le moins payé
    // (sitePaidFrac), et on allait chercher le plus abondant (le bois) avant les 20 pièces qui le bloquaient — un centre restait à 0 %
    // pendant des jours avec tout son bois et sa pierre livrés. À proportion égale, la plus grosse quantité d'abord (comme avant).
    const cost=this.siteCost(b);
    const want=Object.entries(rem).map(([k,n])=>[k,n-this.enRoute(b,k),n/Math.max(1e-6,cost[k]||n)]).filter(([,n])=>n>1e-6).sort((a,z)=>z[2]-a[2]||z[1]-a[1]);
    if(!want.length){b.why=Object.keys(rem).length?`les matériaux arrivent (${this.siteMissing(b)})`:null;return false;}
    // Un chantier commande à son dépôt attitré, mais ses bâtisseurs peuvent aussi prendre
    // directement les matériaux disponibles dans un autre dépôt proche.
    const [x,y]=this.bc(b);let found=this.depots(b.f,x,y,SITE_RANGE).map(dep=>({dep,item:want.find(([k,n])=>(dep.stock[k]||0)>=Math.min(1,n)-1e-6)})).find(o=>o.item);
    // rien à portée : on attend un convoi une heure, puis on va chercher soi-même, plus loin (à pied, dix par voyage)
    if(!found){b.waitT??=this.s.t;if(this.s.t-b.waitT>1)found=this.depots(b.f,x,y,90).map(dep=>({dep,item:want.find(([k,n])=>(dep.stock[k]||0)>=Math.min(1,n)-1e-6)})).find(o=>o.item);}else b.waitT=null;
    const has=found?.item;if(has&&this.distB(found.dep,x,y)>SITE_RANGE)b.why=`les bâtisseurs vont chercher ${this.goodName(has[0]).toLowerCase()} au ${this.depotName(found.dep)}, loin`;
    if(!has){b.why=`attend au ${this.depotName(D)} : ${want.map(([k,n])=>`${Math.ceil(n)} ${this.goodName(k).toLowerCase()}`).join(', ')} (commandé)`;return false;}
    if(u.carry){const R=this.depots(u.f,u.x,u.y,SITE_RANGE)[0];if(R)this.put(R,u.carry.k,u.carry.n);u.carry=null;}
    T0.fetch=has[0];T0.fetchN=Math.min(CARRY,has[1]);T0.fetchDepot=found.dep.id;T0.fetchT=this.s.t;u.path=null;if(this.distB(found.dep,x,y)<=SITE_RANGE)b.why=null;
    // le compte « en route » de l'instant le sait tout de suite : le bâtisseur suivant n'ira pas chercher la même chose
    if(this._er&&this._erT===this.s.t){let o=this._er.get(b.id);if(!o)this._er.set(b.id,o={});o[has[0]]=(o[has[0]]||0)+T0.fetchN;}return false;}
  // (un voyage de plus d'un jour est abandonné : sa réservation « en route » ne doit pas bloquer le chantier — le plus long mesuré dure dix heures)
  fetchTick(u,T0,b,dt){const D=this.building(T0.fetchDepot);if(!D||!this.isDepot(D)||this.s.t-(T0.fetchT??this.s.t)>24){T0.fetch=null;T0.fetchDepot=null;T0.fetchN=0;u.path=null;return;}const [w,h]=BUILDINGS[D.k].size;if(!this.go(u,D.i+w/2,D.j+h/2,[D.i,D.j,w,h]))return;
    const k=T0.fetch;const q=Math.min(T0.fetchN,D.stock[k]||0);if(q>0){D.stock[k]-=q;u.carry={k,n:q};T0.bring=true;}T0.fetch=null;T0.fetchDepot=null;T0.fetchN=0;u.path=null;}
  idle(f='meumeu'){return this.s.units.filter(u=>u.f===f&&u.k==='villageois'&&!u.task&&active(u));}
  setPosture(ids,post){for(const id of ids){const u=this.unit(id);if(u&&u.h){u.orderPost=post==='auto'?null:post;u.postSet=post!=='auto';}}}

  // ---------- bâtir ----------
  canPlace(f,k,i,j,rot=0){const B=BUILDINGS[k];const [w,h]=B.bunker?this.bunkerSize(B.bunker,rot):k==='enclos'?(this.penSize||B.size):B.size;const N=this.N;const why=[];let ore=null,free=true;
    for(let a=0;a<w;a++)for(let c=0;c<h;c++){const ii=i+a,jj=j+c;if(ii<1||jj<1||ii>=N-1||jj>=N-1){free=false;continue;}const kk=jj*N+ii;
      if(!TERRAIN[this.G.terrain[kk]].build||this.occ[kk]>=0||this.wall[kk]||this.rail[kk])free=false;const nd=this.nodeAt[kk];if(nd>=0){const n=this.s.nodes[nd];if(n.type==='ore')ore=n;}}   // arbres, buissons, rochers : le chantier les dégage
    // GAP cases d'écart tout autour : des rues entre les bâtiments, une vue claire, un incendie qui ne saute pas d'un toit à l'autre
    const gap=B.bunker?0:GAP;let crowd=false;for(let a=-gap;a<w+gap&&!crowd;a++)for(let c=-gap;c<h+gap;c++){if(a>=0&&a<w&&c>=0&&c<h)continue;const ii=i+a,jj=j+c;if(ii<0||jj<0||ii>=N||jj>=N)continue;if(this.occ[jj*N+ii]>=0){crowd=true;break;}}
    if(!free)why.push('la place est prise');else if(crowd)why.push(`trop près d’un autre bâtiment : ${GAP} cases d’écart`);if(B.onOre&&!ore)why.push('sur un filon');if(!B.onOre&&ore)why.push('pas sur le filon');
    if(B.bunker&&this.G.dcoast){const WET='pas sur le sable mouillé du bord : il faut pouvoir débarquer';for(let a=0;a<w&&!why.includes(WET);a++)for(let c=0;c<h;c++){const dd=this.G.dcoast[(j+c)*N+i+a];if(dd<7){why.push(WET);break;}}}
    if(B.unique&&this.s.buildings.some(b=>b.f===f&&b.k===k&&!b.ruin))why.push('un seul');
    if(k==='centre'&&this.s.buildings.some(b=>b.f===f&&b.k==='centre'&&d2(b.i,b.j,i,j)<24))why.push('trop près d’une autre ville');
    if(B.station&&!this.platformAt(i,j,w,h))why.push('au bord d’une voie ferrée');
    if(B.coastal){let wet=false;for(let a=-3;a<w+3&&!wet;a++)for(let c=-3;c<h+3;c++){const ii=i+a,jj=j+c;if(ii<0||jj<0||ii>=N||jj>=N)continue;const t=this.G.terrain[jj*N+ii];if(t===T.deep||t===T.shallow){wet=true;break;}}if(!wet)why.push('au bord de la mer');}
    // un chantier se paie à mesure : il lui faut un dépôt à moins de RADIUS cases, où le fret apportera ce qui manque (le camp est gratuit)
    const site=Object.keys(B.cost).length?this.nearestDepot(f,i+w/2,j+h/2,SITE_RANGE,d=>!BUILDINGS[d.k].foodOnly):null;
    const railhead=k==='gare'&&!site&&this.railheadConnected(f,i,j,w,h);
    if(Object.keys(B.cost).length&&!site&&!railhead)why.push(`placez d’abord un camp-dépôt gratuit à moins de ${SITE_RANGE} cases pour apporter les matériaux`);
    return {ok:!why.length,why,ore,site,railhead};}
  railheadConnected(f,i,j,w,h){const nets=new Set(this.s.buildings.filter(b=>b.f===f&&b.k==='gare'&&b.done&&!b.ruin).map(b=>this.netOf(b)).filter(n=>n!=null));if(!nets.size)return false;
    const net=this.railNets();for(let a=-1;a<=w;a++)for(let c=-1;c<=h;c++){if(a>=0&&a<w&&c>=0&&c<h)continue;const x=i+a,y=j+c;if(x>=0&&y>=0&&x<this.N&&y<this.N&&this.rail[y*this.N+x]===2&&nets.has(net[y*this.N+x]))return true;}return false;}
  bunkerSize(id,rot){const P=bunkerPlan(id,rot);return [P.w,P.h];}
  place(f,k,i,j,rot=0){const r=this.canPlace(f,k,i,j,rot);if(!r.ok)return r;const B=BUILDINGS[k],size=B.bunker?this.bunkerSize(B.bunker,rot):k==='enclos'?(this.penSize||B.size):B.size;
    // le chantier dégage ce qui pousse ou traîne sous lui : arbres, buissons, rochers (le bois et la pierre sont perdus)
    for(let a=0;a<size[0];a++)for(let c=0;c<size[1];c++){const kk=(j+c)*this.N+i+a;const nd=this.nodeAt[kk];if(nd>=0&&this.s.nodes[nd].type!=='ore'){this.s.nodes[nd].left=0;this.nodeAt[kk]=-1;}}
    const b=this.addBuilding(f,k,i,j,false,size,rot);if(r.ore)b.ore=r.ore.id;b.paid={};b.site=r.railhead?b.id:r.site?.id??null;
    if(k==='centre'){b.city=CITY_NAMES[this.s.cityN%CITY_NAMES.length];this.s.cityN++;}
    this.emit({type:'placed',x:i+size[0]/2,y:j+size[1]/2});return {ok:true,b};}
  cancel(id){const b=this.building(id);if(!b||b.done||b.ruin)return;const d=this.building(b.site)||this.depots(b.f,b.i,b.j)[0];if(d)for(const [k,n] of Object.entries(b.paid||{}))this.put(d,k,n);this.remove(b);}
  remove(b){this.stamp(b,-1);this.s.buildings.splice(this.s.buildings.indexOf(b),1);this.bIndex.delete(b.id);for(const u of this.s.units)if(u.task?.b===b.id)u.task=null;}
  lineCells(i0,j0,i1,j1){const out=[];let i=i0,j=j0;const di=Math.sign(i1-i0),dj=Math.sign(j1-j0);out.push([i,j]);
    while(i!==i1||j!==j1){const ri=Math.abs(i1-i),rj=Math.abs(j1-j);if(ri&&rj&&Math.abs(ri-rj)<=Math.max(ri,rj)/2){i+=di;j+=dj;}else if(ri>rj)i+=di;else j+=dj;out.push([i,j]);}return out;}
  // Le tracé d'une voie ferrée : des lignes droites et des virages à angle droit (la pièce courbe se pose au coin), qui
  // contournent ce qui barre la route — bâtiment, roc, eau, filon, mur. Une voie déjà posée se rejoint (elle coûte moins) :
  // on raccorde un embranchement en traçant depuis elle. Chaque virage coûte cher : le tracé en fait le moins possible.
  railRoute(i0,j0,i1,j1){const N=this.N;
    const free=k=>{const i=k%N,j=(k/N)|0;if(i<1||j<1||i>=N-1||j>=N-1)return false;if(this.rail[k])return true;
      return TERRAIN[this.G.terrain[k]].build&&this.occ[k]<0&&!this.wall[k]&&!(this.nodeAt[k]>=0&&this.s.nodes[this.nodeAt[k]].type==='ore');};
    const ell=()=>{const out=[];let i=i0,j=j0;out.push([i,j]);while(i!==i1){i+=Math.sign(i1-i);out.push([i,j]);}while(j!==j1){j+=Math.sign(j1-j);out.push([i,j]);}return out;};
    // un bout posé sur du roc, un bâtiment : on part (on arrive) de la case libre la plus proche
    const snap=(i,j)=>{if(free(j*N+i))return [i,j];for(let r=1;r<=6;r++)for(let a=-r;a<=r;a++)for(const [x,y] of [[i+a,j-r],[i+a,j+r],[i-r,j+a],[i+r,j+a]])if(x>0&&y>0&&x<N-1&&y<N-1&&free(y*N+x))return [x,y];return null;};
    const A=snap(i0,j0),Z=snap(i1,j1);if(!A||!Z)return ell();[i0,j0]=A;[i1,j1]=Z;
    const s0=j0*N+i0,g=j1*N+i1;if(s0===g)return [[i0,j0]];
    const pad=24,bx0=Math.max(1,Math.min(i0,i1)-pad),bx1=Math.min(N-2,Math.max(i0,i1)+pad),by0=Math.max(1,Math.min(j0,j1)-pad),by1=Math.min(N-2,Math.max(j0,j1)+pad);
    const D=[[1,0],[0,1],[-1,0],[0,-1]],TURN=4;const cost=new Map(),prev=new Map();const H=[];
    const push=(f,st)=>{H.push([f,st]);let n=H.length-1;while(n){const p=(n-1)>>1;if(H[p][0]<=H[n][0])break;[H[p],H[n]]=[H[n],H[p]];n=p;}};
    const pop=()=>{const top=H[0],last=H.pop();if(H.length){H[0]=last;let n=0;for(;;){const a=2*n+1,b=a+1;let m=n;if(a<H.length&&H[a][0]<H[m][0])m=a;if(b<H.length&&H[b][0]<H[m][0])m=b;if(m===n)break;[H[m],H[n]]=[H[n],H[m]];n=m;}}return top;};
    const hh=k=>Math.abs(k%N-i1)+Math.abs(((k/N)|0)-j1);
    for(let d=0;d<4;d++){const st=s0*4+d;cost.set(st,0);prev.set(st,-1);push(hh(s0),st);}
    let end=-1,it=0;while(H.length&&it++<250000){const [,st]=pop();const k=st>>2,d=st&3,c=cost.get(st);if(k===g){end=st;break;}const i=k%N,j=(k/N)|0;
      for(let nd=0;nd<4;nd++){if(nd===((d+2)&3))continue;const a=i+D[nd][0],b=j+D[nd][1];if(a<bx0||a>bx1||b<by0||b>by1)continue;const kk=b*N+a;if(!free(kk))continue;
        const c2=c+(this.rail[kk]?.4:1)+(nd!==d&&prev.get(st)!==-1?TURN:0);const st2=kk*4+nd;if(cost.has(st2)&&cost.get(st2)<=c2)continue;cost.set(st2,c2);prev.set(st2,st);push(c2+hh(kk),st2);}}
    if(end<0)return ell();const out=[];for(let st=end;st!==-1;st=prev.get(st))out.push([(st>>2)%N,((st>>2)/N)|0]);return out.reverse();}
  // annuler un tracé : toutes les cases prévues (pas encore bâties) reliées à celle-ci ; ce qui était payé revient au dépôt
  lineStore(kind){return kind==='rail'?this.s.rails:kind==='sacs'||kind==='fosses'?this.s.sacs:kind==='mines'?this.s.mines:this.s.walls;}
  cancelLine(f,kind,k0){const N=this.N;const store=this.lineStore(kind);const o0=store[k0];if(!o0||o0.b||(kind!=='rail'&&o0.f!==f))return 0;const mine=o=>(kind!=='sacs'&&kind!=='fosses')||(o.t||'sacs')===kind;if(!mine(o0))return 0;
    const seen=new Set([k0]),q=[k0];while(q.length){const k=q.pop();const i=k%N,j=(k/N)|0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const kk=(j+dj)*N+i+di;const o=store[kk];if(!o||o.b||seen.has(kk)||(kind!=='rail'&&o.f!==f)||!mine(o))continue;seen.add(kk);q.push(kk);}}
    for(const k of seen){const o=store[k];if(o.paid){const d=this.depots(f,k%N,(k/N)|0)[0];if(d)for(const [r,v] of Object.entries(LINES[kind].cost))this.put(d,r,v);}
      delete store[k];if(kind==='rail'){this.rail[k]=0;this._rnDirty=true;}else if(kind==='mur')this.wall[k]=0;}
    for(const u of this.s.units)if(u.task?.kind==='line'&&u.task.line===kind&&seen.has(u.task.k))u.task.k=null;
    return seen.size;}
  canLine(f,kind,cells){const N=this.N;const ok=[];for(const [i,j] of cells){if(i<1||j<1||i>=N-1||j>=N-1)continue;const k=j*N+i;if(!TERRAIN[this.G.terrain[k]].build||this.occ[k]>=0)continue;
    if(kind==='rail'&&this.rail[k])continue;if(kind!=='rail'&&(this.wall[k]||this.rail[k]))continue;if(this.s.sacs[k]||this.s.mines[k])continue;if(this.nodeAt[k]>=0&&this.s.nodes[this.nodeAt[k]].type==='ore')continue;ok.push(k);}return ok;}
  planLine(f,kind,cells){const ks=this.canLine(f,kind,cells);for(const k of ks){if(kind==='rail'){this.s.rails[k]={f,b:0,p:0,hp:LINES.rail.hp};this.rail[k]=1;}else if(kind==='mur'){this.s.walls[k]={f,b:0,p:0,hp:LINES.mur.hp};this.wall[k]=f==='meumeu'?1:-1;}else if(kind==='mines')this.s.mines[k]={f,b:0,p:0,hp:LINES.mines.hp};else this.s.sacs[k]={f,b:0,p:0,hp:LINES[kind].hp,t:kind};
      const nd=this.nodeAt[k];if(nd>=0&&this.s.nodes[nd].type!=='ore'){this.s.nodes[nd].left=0;this.nodeAt[k]=-1;}}
    return {ok:ks.length>0,n:ks.length,cost:Object.fromEntries(Object.entries(LINES[kind].cost).map(([r,v])=>[r,v*ks.length]))};}
  lineBuilt(kind,k){if(kind==='mur')this.wallV=(this.wallV||0)+1;if(kind==='rail'){const r=this.s.rails[k];r.b=1;r.p=1;this.rail[k]=2;this._rnDirty=true;}else if(kind==='mur'){const w=this.s.walls[k];w.b=1;w.p=1;w.hp=LINES.mur.hp*this.mod('mur');this.wall[k]=(w.f==='meumeu'?2:-2);this.repath();}else{const t=(kind==='mines'?this.s.mines:this.s.sacs)[k];t.b=1;t.p=1;}}   // (les sacs et les fosses : même magasin, t dit lequel)
  lineBroken(kind,k){if(kind==='mur')this.wallV=(this.wallV||0)+1;if(kind==='rail'){const r=this.s.rails[k];if(!r)return;r.b=0;r.p=0;r.paid=0;r.hp=LINES.rail.hp;this.rail[k]=1;r.broken=true;this._rnDirty=true;}else if(kind==='mur'){delete this.s.walls[k];this.wall[k]=0;this.repath();}else if(kind==='mines')delete this.s.mines[k];else delete this.s.sacs[k];}
  repath(){for(const u of this.s.units)u.path=null;}
  platformAt(i,j,w,h){const N=this.N;for(let a=-1;a<=w;a++)for(let c=-1;c<=h;c++){if(a>=0&&a<w&&c>=0&&c<h)continue;const ii=i+a,jj=j+c;if(ii<0||jj<0||ii>=N||jj>=N)continue;if(this.rail[jj*N+ii])return [ii,jj];}return null;}
  platform(b){const [w,h]=this.sizeOf(b);const N=this.N;let best=null;for(let a=-1;a<=w;a++)for(let c=-1;c<=h;c++){if(a>=0&&a<w&&c>=0&&c<h)continue;const ii=b.i+a,jj=b.j+c;if(ii<0||jj<0||ii>=N||jj>=N)continue;if(this.rail[jj*N+ii]===2)return [ii,jj];if(this.rail[jj*N+ii]&&!best)best=[ii,jj];}return best;}

  // ---------- former, construire ----------
  // Un soldat part avec une arme de la conception choisie : elle doit être dans un dépôt proche de la caserne.
  draftCandidate(b,skip=null){const city=this.cityOf(b),reserved=new Set();for(const x of this.s.buildings)for(const q of x.queue||[])if(q!==skip&&q.draftId!=null)reserved.add(q.draftId);
    return this.s.units.filter(u=>u.f===b.f&&u.k==='villageois'&&alive(u)&&!reserved.has(u.id)&&(!city||this.homeOf(u)===city)).sort((a,z)=>Number(!!a.task)-Number(!!z.task)||d2(a.x,a.y,b.i,b.j)-d2(z.x,z.y,b.i,b.j))[0]||null;}
  canTrain(b,k,w=null,armor=null){const B=BUILDINGS[b.k],why=[],D=UNITS[k]||VEHICLES[k]||(VEHDEF[k]&&{name:VEHDEF[k].name,cost:VEHDEF[k].cout,hours:VEHDEF[k].heures});if(!b.done)why.push('pas fini');if(!(B.trains||[]).includes(k))why.push('pas ici');if(b.queue.length>=5)why.push('cinq en attente');
    const draft=null;if(UNITS[k]?.arm)why.push('envoyez-y des villageois, puis faites-les sortir équipés');
    // pas de maisons à bâtir : un Meumeu de plus, ce sont des vivres de plus (sa formation, puis sa ration chaque heure)
    if(UNITS[k]&&!UNITS[k]?.arm){const c=this.cityOf(b)||b;if(c.k==='centre'&&(c.ration??1)<.5)why.push('la ville a faim : moins de la moitié des rations');}if(k==='train'&&!this.platform(b))why.push('la gare n’a pas de voie');
    const cost={...D.cost};if(UNITS[k]?.arm){const d=this.design(w||'mle1');if(!d||d.status!=='adopte')why.push('une arme adoptée');else cost['a:'+d.id]=1;if(armor){const ar=this.s.armors[armor];if(!ar||ar.status!=='adopte')why.push('une protection adoptée');else cost['p:'+armor]=1;}}
    const pay=this.canPay(b.f,b.i+1,b.j+1,cost);if(!pay.ok)why.push('il manque : '+pay.miss.join(', '));return {ok:!why.length,why,cost,draftId:draft?.id??null};}
  train(b,k,w=null,armor=null,role='tireur'){const r=this.canTrain(b,k,w,armor);if(!r.ok)return r;const D=UNITS[k]||VEHICLES[k]||{name:VEHDEF[k].name,hours:VEHDEF[k].heures};this.pay(b.f,b.i+1,b.j+1,r.cost);b.queue.push({k,left:D.hours,w:w||'mle1',armor:UNITS[k]?.arm?armor:null,role:UNITS[k]?.arm&&role==='munitions'?'munitions':'tireur',...(r.draftId!=null?{draftId:r.draftId}:{})});return {ok:true,text:D.name+(role==='munitions'&&UNITS[k]?.arm?' · porteur de munitions':'')+(r.draftId!=null?' — un civil mobilisé':'')+' en préparation'};}
  pop(f){const cap=this.s.buildings.filter(b=>b.f===f&&b.done&&BUILDINGS[b.k].pop).reduce((a,b)=>a+BUILDINGS[b.k].pop,0);const used=this.s.units.filter(u=>u.f===f).reduce((a,u)=>a+(UDEF(u).pop||1),0)+this.s.buildings.filter(b=>b.f===f).reduce((a,b)=>a+(b.inside?.length||0),0)+this.s.vehicles.filter(v=>v.f===f&&v.k==='porteur').length;return {cap,used};}

  // S'équiper à la caserne : un fusil (la conception adoptée dont il y a le plus au dépôt), ses munitions, une protection s'il y en a
  enlist(u,b){const have=this.have(b.f,b.i+1,b.j+1);const guns=this.designsOf(b.f).filter(d=>d.status==='adopte'&&(have['a:'+d.id]||0)>=1).sort((a,z)=>(have['a:'+z.id]||0)-(have['a:'+a.id]||0));
    if(!guns.length)return {ok:false,why:'aucun fusil au dépôt de la caserne'};const d=guns[0];const cost={...UNITS.soldat.cost,['a:'+d.id]:1};if(!this.canPay(b.f,b.i+1,b.j+1,cost).ok)return {ok:false,why:`il manque ${this.canPay(b.f,b.i+1,b.j+1,cost).miss.join(', ')}`};
    this.pay(b.f,b.i+1,b.j+1,cost);const arm=Object.values(this.s.armors).filter(a=>a.f===b.f&&a.status==='adopte'&&(have['p:'+a.id]||0)>=1).sort((a,z)=>(have['p:'+z.id]||0)-(have['p:'+a.id]||0))[0];
    if(arm)this.pay(b.f,b.i+1,b.j+1,{['p:'+arm.id]:1});
    u.k='soldat';u.w=d.id;const W=this.W(d.id);u.mag=0;u.pouch=0;u.carry=null;u.smoke=UNITS.soldat.smoke||0;u.armor=arm?.id||null;u.plates={};u.homeBarracks=b.id;u.why=null;this.resupply(u);u.mag=Math.min(W.p.mag,u.pouch);u.pouch-=u.mag;
    const [w,h]=this.sizeOf(b);u.task={kind:'guard',tx:b.i+w/2+(this.rand()-.5)*2,ty:b.j+h+1.5};u.path=null;
    this.log(this.cityName(b),`${u.name||'Un villageois'} devient soldat : ${d.name}${arm?`, ${arm.name.toLowerCase()}`:''}.`,'good');this.emit({type:'trained',x:u.x,y:u.y,k:'soldat',f:b.f});return {ok:true};}
  // ---------- les véhicules ----------
  setRoute(vid,a,b){const v=this.s.vehicles.find(x=>x.id===vid);const A=this.building(a),B=this.building(b);if(!v||!A||!B||a===b)return {ok:false,why:['deux arrêts différents']};if(A.f!==v.f||B.f!==v.f||A.ruin||B.ruin)return {ok:false,why:['deux arrêts de notre camp, non détruits']};
    const need=v.k==='train'?'station':v.k==='avion'?'airfield':'store';if(!BUILDINGS[A.k][need]||!BUILDINGS[B.k][need])return {ok:false,why:[v.k==='train'?'deux gares':v.k==='avion'?'deux aérodromes':'deux dépôts']};
    v.route={a,b,out:['guerre','vivres','industrie','materiaux'],back:['minerais','industrie']};v.mode='ligne';v.job=null;v.state='go';v.leg=0;v.path=null;return {ok:true,text:`${v.name} : ligne ${this.cityName(A)} ↔ ${this.cityName(B)}`};}
  goodsOf(sets,at){const map={rare:RARE,materiaux:['bois','pierre','charbon'],minerais:['fer','cuivre','plomb','salpetre'],vivres:['vivres','grain','ble_moulu'],industrie:['pieces','carburant'],guerre:['poudre','explosifs','explosifs_brisants','melange_inc','sante','jumelles','jumelles_ir','tenue_camo',...Object.keys(at?.stock||{}).filter(k=>k.startsWith('m:')||k.startsWith('a:')||k.startsWith('p:'))]};return [...new Set(sets.flatMap(s=>map[s]||[]))];}
  // Charger : dans l'ordre des familles choisies, mais sans qu'un seul bien prenne tout — au plus 40 % de la place au premier tour,
  // puis ce qui reste. Un convoi part mêlé : des munitions, des vivres, des pièces, du bois.
  capOf(v){return VEHICLES[v.k].cap*(v.k==='porteur'?this.mod('cap_porteur'):v.k==='train'?this.mod('cap_train'):1);}
  // Les porteurs : des villageois oisifs affectés à un dépôt ; à pied, ils servent les dépôts voisins. Rendus, ils redeviennent
  // villageois là où ils sont (ce qu'ils portent est posé au dépôt le plus proche).
  porters(D){return this.s.vehicles.filter(v=>v.k==='porteur'&&v.base===D.id);}
  // on en affecte autant qu'on veut, un par un (0 à N) : une hotte de 15 caisses, 40 cases de portée — peu suffisent
  addPorters(D,n=1){if(!D||!BUILDINGS[D.k].store||!D.done)return {ok:false,why:['pas un dépôt achevé']};const [x,y]=this.bc(D);
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
  vehicleTick(v,dt){if(VEHDEF[v.k])return this.combatVehicleTick(v,dt);if(v.k==='bombardier')return this.bomberTick(v,dt);if(v.mode==='fret')return this.fretTick(v,dt);return this.routeTick(v,dt);}
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
      const nx=v.path[v.pi];if(nx&&this.rail[nx[2]??(nx[1]*this.N+nx[0])]!==2){v.path=null;v.why='voie coupée';return 'blocked';}
      const x0=v.x,y0=v.y;const done=this.slide(v,v.path,V.speed*dt*this.mod('vit_train'));v.coal=Math.max(0,(v.coal||0)-d2(x0,y0,v.x,v.y)*FRET.COAL_PER_CASE);
      if(done){v.path=null;v.at=to.id;return true;}return false;}
    if(!v.path||v.dest!==to.id){const [w,h]=BUILDINGS[to.k].size;const N=this.N;const goal=k=>{const i=k%N,j=(k/N)|0;return i>=to.i-1&&i<=to.i+w&&j>=to.j-1&&j<=to.j+h;};
      if(goal(Math.floor(v.y)*N+Math.floor(v.x))){v.at=to.id;v.path=null;return true;}
      const r=this.pather.find(Math.floor(v.x),Math.floor(v.y),to.i+1,to.j+1,this.costFn(v.f),goal,40000);if(!r.done){v.why='pas de chemin par la terre';return 'blocked';}v.path=r.path.map(([i,j])=>[i,j]);v.pi=0;v.dest=to.id;v.why=null;v.at=null;}
    if(this.slide(v,v.path,V.speed*dt*(v.k==='porteur'?this.mod('vit_marche')*(this.cargoW(v)>this.capOf(v)*.6?.8:1):1))){v.path=null;v.at=to.id;return true;}return false;}
  slide(v,path,left){while(left>0){if(v.pi>=path.length)return true;const [i,j]=path[v.pi];const tx=i+.5,ty=j+.5;const dx=tx-v.x,dy=ty-v.y,d=Math.hypot(dx,dy);if(d>1e-6){v.dx=dx/d;v.dy=dy/d;}
      if(d<=left){v.x=tx;v.y=ty;left-=d;v.pi++;if(v.trail){v.trail.unshift([v.x,v.y]);if(v.trail.length>48)v.trail.pop();}}else{v.x+=dx/d*left;v.y+=dy/d*left;left=0;}}return v.pi>=path.length;}
  arrive(v,to){this.unloadCargo(v,to);this.practice('logistique',1);v.leg=1-v.leg;const dest=v.leg===0?this.building(v.route.b):this.building(v.route.a);this.loadCargo(v,to,dest);v.state='wait';v.wait=v.k==='train'?1.2:.6;v.path=null;
    this.emit({type:'stop',kind:v.k,x:v.x,y:v.y});}
  // le chemin d'un train sur les rails (en largeur) ; une gare injoignable n'est pas recherchée à nouveau avant une heure
  railPath(v,to){const N=this.N;const goal=this.platform(to);if(!goal)return null;const gk=goal[1]*N+goal[0];const st=Math.floor(v.y)*N+Math.floor(v.x);if(this.rail[st]!==2&&this.rail[st]!==1)return null;
    const fk=st+'>'+gk;const F=v.rfail??={};if(F[fk]>this.s.t)return null;
    const M=N*N;if(!this.rFrom||this.rFrom.length!==M){this.rFrom=new Int32Array(M);this.rSeen=new Int32Array(M);this.rStamp=0;this.rQ=new Int32Array(M);}const from=this.rFrom,seen=this.rSeen,q=this.rQ,stp=++this.rStamp;
    seen[st]=stp;from[st]=-1;q[0]=st;let n=1,found=false,qi=0;while(qi<n){const k=q[qi++];if(k===gk){found=true;break;}const i=k%N,j=(k/N)|0;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(this.rail[kk]!==2||seen[kk]===stp)continue;
        if(di&&dj&&(this.rail[j*N+a]||this.rail[b*N+i]))continue;seen[kk]=stp;from[kk]=k;q[n++]=kk;}}
    if(!found){F[fk]=this.s.t+1;for(const key of Object.keys(F))if(F[key]<this.s.t)delete F[key];return null;}const cells=[];for(let k=gk;k!==-1;k=from[k])cells.push(k);cells.reverse();return railCurve(cells,N);}
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

  // la présence meumeu, en grille grossière (32 cases), refaite chaque quart d'heure de jeu : far(x,y) = aucun Meumeu à moins de ~64 cases
  lodFar(){const t=this.s.t;if(!this._lodP||t-this._lodP.t>.25||t<this._lodP.t){const G=32,S=new Set(),k=(x,y)=>((x/G)|0)*4096+((y/G)|0);
      for(const o of this.s.units)if(o.f==='meumeu'&&alive(o))S.add(k(o.x,o.y));for(const b of this.s.buildings)if(b.f==='meumeu'&&!b.ruin)S.add(k(b.i,b.j));for(const v of this.s.vehicles)if(v.f==='meumeu')S.add(k(v.x,v.y));
      this._lodP={t,S,f:(x,y)=>{const cx=(x/G)|0,cy=(y/G)|0;for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(S.has((cx+a)*4096+cy+b))return false;return true;}};}
    return this._lodP.f;}
  // ---------- le temps ----------
  // Pour le dessin seulement : une unité simulée un pas sur quatre (niveau de détail) est montrée en chemin entre sa place d'avant son pas et sa place
  // actuelle, au prorata du temps écoulé — sans cela elle restait immobile trois images puis sautait (« les Bèè sont saccadés »). Rend la liste des vraies
  // places, que la vue remet aussitôt après l'image (View.draw) : la simulation ne voit jamais ces positions.
  lodShow(){const s=this.s,back=[];for(const u of s.units){if(u.it===undefined||!(u.itd>0))continue;const f=(s.t-u.it)/u.itd;if(!(f>=0&&f<1))continue;
      const dx=u.x-u.ix,dy=u.y-u.iy;if(dx*dx+dy*dy>9)continue;back.push([u,u.x,u.y,u.walkPh]);u.x=u.ix+dx*f;u.y=u.iy+dy*f;
      // la foulée aussi : sans cela la phase de marche avançait de quatre pas d'un coup, une image sur quatre (les jambes sautaient)
      if(u.iph!=null&&u.walkPh!=null)u.walkPh=u.iph+(u.walkPh-u.iph)*f;}
    return back;}
  update(dt){let left=dt;while(left>1e-9){const d=Math.min(.025,left);this.tick(d);left-=d;}}
  tick(dt){const s=this.s;this.dt=dt;this.dts=dt*HOUR_REAL;s.solar=advanceSolar(this.hour(),this.dts,s.solarSettings||SOLAR_DEFAULT);s.t+=dt;this.gridBuild();this.pathBudget=14;
    // les engins de combat en état, une fois par pas (mesuré : chaque soldat parcourait tous les véhicules, trains et fret compris, en cherchant sa cible)
    this.cvs=s.vehicles.filter(v=>VEHDEF[v.k]&&v.hp>0);
    // l'ordre de passage change à chaque instant : personne ne tire toujours le premier parce qu'il est en tête de liste
    // Le niveau de détail : une unité ou un bâtiment bèè loin de tout Meumeu (plus de ~64 cases), hors combat, n'est simulé qu'un pas sur quatre, avec un pas
    // quatre fois plus long (les minuteries suivent : this.dt et this.dts sont multipliés pendant son tour). Même résultat, quatre fois moins de calcul pour
    // l'arrière du pays bèè (mesuré : une partie de 30 jours à vingt villes passait les trois quarts de son temps là).
    const LODK=4,ph=(this._lodN=(this._lodN||0)+1)%LODK,far=this.lodFar();
    const lod=(o,fn)=>{if(o.id%LODK!==ph)return;const d0=this.dt,s0=this.dts;this.dt=d0*LODK;this.dts=s0*LODK;try{fn(dt*LODK);}finally{this.dt=d0;this.dts=s0;}};
    {const L=[...s.units];const n=L.length;const o=n?Math.floor(this.rand()*n):0,rev=this.rand()<.5;for(let q=0;q<n;q++){const u=L[rev?(o-q+n)%n:(o+q)%n];if(!alive(u))continue;
      // (une unité au pas lent garde sa place d'avant son pas : l'affichage la fait glisser de l'une à l'autre pendant les quatre pas suivants — lodShow)
      if(u.f==='beee'&&!u.band&&u.task?.kind!=='assault'&&!(u.supp>.05)&&!(u.reload>0)&&!u.salvoQ&&far(u.x,u.y))lod(u,d=>{const x0=u.x,y0=u.y,p0=u.walkPh;this.unitTick(u,d);u.ix=x0;u.iy=y0;u.iph=p0;u.it=s.t;u.itd=d;});
      else{if(u.it!==undefined)u.it=undefined;this.unitTick(u,dt);}}}
    this.faunaTick(dt);
    s.units=s.units.filter(u=>{if(alive(u))return true;if(u.f==='beee'&&s.beee){const L=s.beee.lossAt??=[];L.push({x:u.x,y:u.y,t:s.t});if(L.length>400)L.splice(0,L.length-400);}this.uIndex.delete(u.id);if(u.sq)this.leave(u);return false;});
    for(const b of [...s.buildings]){if(b.f==='beee'&&!(b.fire>0)&&far(b.i,b.j))lod(b,d=>this.buildingTick(b,d));else this.buildingTick(b,dt);}
    for(const v of [...s.vehicles])this.vehicleTick(v,dt);
    this.detectTick(dt);this.intelTick(dt);this.noiseTick(dt);this.stepsTick(dt);this.chargesTick();this.salvoTick();this.shotsTick(dt);this.fallsTick(dt);this.minesTick();this.bunkerTick();this.flakTick(dt);this.defenseTick();this.squadTick();this.crewTick();this.operationTick();this.beeeTick(dt);this.bandsTick(dt);this.innovTick(dt);
    this.bushT=(this.bushT||0)+dt;if(this.bushT>=.5){const g=this.bushT;this.bushT=0;for(const nd of this.bushes??=s.nodes.filter(n=>n.type==='bush'))if(nd.left<nd.max)nd.left=Math.min(nd.max,nd.left+g*nd.max/NODES.bush.regrow);}
    if(s.corpses.length&&s.t-s.corpses[0].t>3*DAY)s.corpses.shift();
    if(s.smokes.length)s.smokes=s.smokes.filter(m=>m.end>s.t);if(s.groundFires.length)s.groundFires=s.groundFires.filter(m=>m.end>s.t);
    this.checkEnd();}

  // ---------- les Meumeu, les soldats ----------
  unitTick(u,dt){const D=UDEF(u);const dts=this.dts;u.cool=Math.max(0,(u.cool||0)-dts);u.reload=Math.max(0,(u.reload||0)-dts);u.supp=(u.supp||0)*Math.exp(-dts/(D.choc?2:5));if(u.stun>0){u.stun=Math.max(0,u.stun-dts*(D.choc?2:1));if(!u.stun&&u.why==='sonné')u.why=null;}
    // le corps : le sang coule, on tombe, on meurt
    if(u.h){const ch=tickHealth(u.h,dts);if(ch)this.stateChange(u,ch);if(u.h.log?.length&&u.h.log[u.h.log.length-1].t==null)u.h.log[u.h.log.length-1].t=this.s.t;if(!alive(u))return;
      if(u.h.state==='hors'){u.anim='down';u.task=u.task?.kind==='carried'?u.task:null;u.path=null;u.post='couche';return;}}
    // on ne se marche pas dessus : deux Meumeu trop proches s'écartent (1,2 m au moins entre deux soldats)
    {const R=u.k==='villageois'?.2:.3;this.near(u.x,u.y,R,o=>{if(o===u||o.f!==u.f||!alive(o))return;let dx=u.x-o.x,dy=u.y-o.y;const dd=dx*dx+dy*dy;if(dd>=R*R)return;
      let d=Math.sqrt(dd);if(d<1e-4){const a=(u.id*2.399)%6.283;dx=Math.cos(a);dy=Math.sin(a);d=1;}const k=Math.min(.05,(R-d)*.5,4*this.dt);const nx=u.x+dx/d*k,ny=u.y+dy/d*k;const kk=Math.floor(ny)*this.N+Math.floor(nx);
      if(TERRAIN[this.G.terrain[kk]]?.walk&&this.occ[kk]<0){u.x=nx;u.y=ny;}});}
    // un servant porte les caisses de sa pièce ; il n'en change le type que les mains vides (des caisses pleines d'un autre type restent ce qu'elles sont)
    if(u.serve&&(u.servant||!u.w)&&u.sq&&!u.crewAmmo&&!(u.crates>0)){const g=this.unit(u.serve);if(g?.w)u.ammoW=g.w;}
    if(u.role==='munitions'||(u.serve&&(u.servant||!u.w)))this.bearerTick(u);
    if(u.crewAmmo)this.crewAmmoTick(u);
    // un servant rejoint sa pièce quand elle s'arrête
    if(u.serve){const g=this.unit(u.serve);if(!g||!alive(g)||g.h?.state==='hors'){u.serve=null;}else{const crew=this.s.units.filter(o=>o.serve===g.id&&alive(o)&&o.h?.state!=='hors').sort((a,b)=>a.id-b.id),slot=Math.max(0,crew.findIndex(o=>o.id===u.id)),slots=[[-.48,-.58],[-.48,.58],[.12,-.78],[.12,.78],[-.92,0],[.58,-.92],[.58,.92]],pos=slots[slot]||[-.9-Math.floor((slot-7)/2)*.38,slot%2?-.8:.8],fx=g.fx||1,fy=g.fy||0,fn=Math.hypot(fx,fy)||1,px=-fy/fn,py=fx/fn;const tx=g.x+fx/fn*pos[0]+px*pos[1],ty=g.y+fy/fn*pos[0]+py*pos[1];if(u.task?.kind!=='evac'&&!u.crewAmmo){u.task={kind:'guard',tx,ty};this.face(u,g.x-u.x,g.y-u.y);}}}
    // se réapprovisionner : munitions de sa conception, fumigènes, trousses — dans les dépôts proches
    u.resup=(u.resup||0)-dts;if(u.resup<=0){u.resup=3;this.resupply(u);this.selfCare(u);if(u.f==='meumeu'){const I=u.w&&this.W(u.w).ir;const mx=Math.max(I?I.hours:0,u.bino?80:0);if(mx&&u.irMax!==mx){u.irLeft=u.irLeft==null?mx:Math.min(mx,u.irLeft);u.irMax=mx;}}}
    // V12.4 : la batterie de l'infrarouge ne se vide plus (elle est dimensionnée pour la lampe choisie : voir irOf) — plus de recharge à gérer
    if(u.irMax&&!(u.irLeft>0))u.irLeft=u.irMax;
    const T0=u.task;
    // le retour d'une opération : courbé tant qu'un Bèè est à portée de vue, debout (et vite) ensuite
    if(u.sneakHome&&!u.postSet){if(!T0||T0.kind!=='move'){u.sneakHome=false;u.orderPost=null;}else{const R=18;u.orderPost=this.near(u.x,u.y,R,e=>e.f!==u.f&&active(e)&&this.spotted(e,u.f)&&d2(e.x,e.y,u.x,u.y)<R)||(u.supp||0)>.1?'accroupi':null;}}
    if(['hunt','capture','butcher','lead'].includes(T0?.kind)){this.wildlifeOrder(u,T0);return;}
    // (un Bèè qui se déplace se relève : l'ordre « couché » d'une garde ne le fait plus traverser la carte en rampant — accroupi sous un feu nourri)
    const OP=u.f==='beee'&&!u.postSet&&u.anim==='walk'&&u.orderPost==='couche'?((u.supp||0)>.6?'accroupi':null):u.orderPost;
    if(T0&&(T0.kind==='band'||T0.kind==='bandcarry')){u.post=OP||(u.anim==='walk'?'debout':this.atWar&&(u.supp||0)>.4?'couche':this.atWar?'accroupi':'debout');this.bandUnit(u,T0);return;}
    // la posture : debout en marche ; accroupi au combat ; couché sous le feu (ou sur ordre). Pas un coup de feu avant la guerre.
    let threat=(D.arm||D.img)&&this.atWar?this.nearestEnemy(u,Math.max(this.sight(),this.engageRange(u))):null;
    // le tir discret : on n'abat qu'un Bèè isolé, proche, dont personne d'autre n'entendra le coup ni ne verra la chute —
    // sauf si l'on est soi-même découvert (alors on répond)
    if(threat&&u.quiet&&!this.spotted(u,u.f==='meumeu'?'beee':'meumeu')&&!this.quietOk(u,threat))threat=null;
    // accroupi pour une alerte, à son poste seulement : il se relève en partant
    if(u.alertPost&&T0?.kind!=='guard'){u.alertPost=0;if(u.orderPost==='accroupi'&&!u.sentry&&!u.inTrench)u.orderPost=null;}
    u.post=OP||(u.anim==='walk'?'debout':threat?(u.supp>.45?'couche':'accroupi'):'debout');
    // à couvert : un garde pris sous le feu (sans formation, sans poste imposé) se décale d'une case et demie au plus vers le meilleur
    // abri entre lui et le tireur (un arbre, un rocher, un mur, une tranchée) — une fois par heure, pour ne pas danser
    if(threat&&(u.supp||0)>.2&&T0?.kind==='guard'&&!T0.fm&&!T0.hold&&!u.sentry&&this.s.t>=(u.coverT??-1)&&!this.coverFor(u,threat.x,threat.y)){u.coverT=this.s.t+1;const N=this.N;let best=null,bv=0;
      for(let a=0;a<12;a++){const an=a/12*6.283;for(const r of [.8,1.5]){const x=u.x+Math.cos(an)*r,y=u.y+Math.sin(an)*r;const k=Math.floor(y)*N+Math.floor(x);if(k<0||k>=N*N||!TERRAIN[this.G.terrain[k]]?.walk||this.occ[k]>=0||this.nodeAt[k]>=0)continue;
        const cv=this.coverFor({x,y,f:u.f},threat.x,threat.y);const v=cv?cv.h*cv.p-r*.05+(this.s.sacs[k]?.b?.3:0):0;if(v>bv){bv=v;best=[x,y];}}}
      if(best&&bv>.15){T0.tx=best[0];T0.ty=best[1];u.path=null;u.why='se met à couvert';}}
    if(D.medic&&this.medicTick(u,T0))return;
    if(u.k==='villageois'&&u.supp>.3&&T0?.kind!=='shelter'&&this.atWar){this.shelter(u);}
    // les combattants répondent : ils voient loin, tirent à portée, vont chercher l'ennemi
    // (en tir discret : une équipe découverte en plein sabotage décroche d'abord ; en repli, on ne tire que sur un ennemi tout
    // proche, pour rompre le contact — sinon on s'éloigne : s'arrêter pour riposter à chaque Bèè en vue la clouait sur place)
    if(((D.arm&&u.w)||D.img)&&!u.holdFire&&(u.roe!=='riposte'||u.supp>.1)&&!((D.scout||u.scoutRole)&&!D.sniper&&(u.supp||0)<.2&&!this.spotted(u,u.f==='meumeu'?'beee':'meumeu'))&&(!T0||T0.kind==='assault'||T0.kind==='guard'||T0.kind==='search'||T0.kind==='patrol'||(T0.kind==='move'&&T0.hold)||(u.quiet&&threat&&(T0.kind==='sabotage'&&!this.spotted(u,u.f==='meumeu'?'beee':'meumeu')||T0.kind==='move'&&(!(T0.retreat||u.sneakHome)||d2(threat.x,threat.y,u.x,u.y)<5)))||(T0.kind==='zone'&&threat&&d2(threat.x,threat.y,u.x,u.y)<4))){const e=threat||(T0?.kind==='assault'?null:null);
      // Un assaillant bèè choisit d'abord sa distance de tir ; la réponse automatique ne doit pas le faire charger.
      if(!(u.f==='beee'&&T0?.kind==='assault'&&(u.w||D.img))&&e){if(this.engage(u,e))return;if(T0?.kind!=='assault'&&!u.hold&&!u.quiet&&u.f!=='meumeu'){this.go(u,e.x,e.y);return;}}}
    if(!T0){u.anim=u.anim==='aim'?'aim':'idle';if(u.carry&&u.k==='villageois')this.deliverTick(u);return;}
    switch(T0.kind){
      case 'search':case 'patrol':{if(this.s.t>T0.until||!T0.pts?.length){u.task={kind:'guard',tx:T0.home[0]+(this.rand()-.5)*6,ty:T0.home[1]+(this.rand()-.5)*6};u.path=null;return;}
        if(u.why?.startsWith('passage bloqué')){T0.fails=(T0.fails||0)+1;if(T0.fails>2){T0.fails=0;T0.i++;u.why=null;u.pathWait=0;u.path=null;}}   // une étape inaccessible : on passe à la suivante
        // chacun un peu à côté de son voisin (pas tous à la file sur la même ligne) ; à chaque étape, on regarde de côté
        const p0=T0.pts[T0.i%T0.pts.length],sx=u.f==='beee'?((u.id%5)-2)*.3:0,sy=u.f==='beee'?(((u.id*7)%5)-2)*.3:0;const p=[p0[0]+sx,p0[1]+sy];
        // (la direction d'arrivée est retenue à l'étape : tourner à partir du regard du moment le faisait pivoter à chaque instant)
        if(this.go(u,p[0],p[1])){if(!T0.wait&&u.fx!=null){T0.bx=u.fx;T0.by=u.fy;}T0.wait=(T0.wait||0)+dt;u.anim='idle';if(u.f==='beee'&&T0.bx!=null){const sd=(Math.floor(T0.wait*20)+u.id)%2?1:-1;this.face(u,-T0.by*sd,T0.bx*sd);}
          if(T0.wait>(T0.kind==='search'?(T0.cone?.15:.35):.2)){T0.wait=0;T0.i++;if(T0.kind==='search'&&T0.i>=T0.pts.length)T0.until=0;}}return;}
      case 'move':case 'guard':{
        // un garde bèè : au calme et de jour, il fait quelques pas autour de son poste de temps en temps ; la nuit ou en alerte, il y reste
        const bee=u.f==='beee'&&T0.kind==='guard'&&!u.band,alertA=bee?this.beeeAlertNear?.(u):null;
        if(bee&&!u.sentry&&!u.inTrench){if(alertA||this.light()<.5||threat){T0.mx=0;T0.my=0;}else if(this.s.t>=(u.millT??0)){u.millT=this.s.t+.3+this.rand()*.5;
            if(this.rand()<.55&&!(T0.mx||T0.my)){const an=this.rand()*6.283,r=2+this.rand()*2;const [fx,fy]=this.freeSpot(T0.tx+Math.cos(an)*r,T0.ty+Math.sin(an)*r,2);T0.mx=fx-T0.tx;T0.my=fy-T0.ty;}else{T0.mx=0;T0.my=0;}}}
        const gx=T0.tx+(T0.mx||0),gy=T0.ty+(T0.my||0);
        if(this.go(u,gx,gy)){if(T0.fx!=null&&!bee)this.face(u,T0.fx,T0.fy);if(T0.kind==='move'){u.task=T0.back||null;u.path=null;}
          // à son poste, il regarde : vers l'alerte s'il y en a une (accroupi), sinon il balaie les environs (une sentinelle, vers l'extérieur)
          else if(bee)this.beeeLook(u,T0,alertA);}return;}
      case 'resupply':{const b=this.building(T0.b);if(!b||!b.done||b.ruin){u.task=T0.back||null;u.path=null;return;}const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h+.7,[b.i,b.j,w,h]))return;u.anim='idle';this.resupply(u,true);const stocked=u.w?(u.mag+u.pouch>0):true;if(stocked){u.task=T0.back||{kind:'guard',tx:u.x,ty:u.y};u.path=null;u.why=null;}else u.why='attend les munitions au dépôt de sa caserne';return;}
      case 'hosp':{const b=this.building(T0.b);if(!b||!b.done||(b.wardList||[]).length>=BUILDINGS[b.k].ward){u.task=null;return;}const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;
        this.admit(b,u);return;}
      case 'sabotage':{if(T0.node!=null){const nd=this.s.nodes[T0.node];if(!nd||nd.left<=0||!(u.charges>0)){u.orderPost=null;u.task=T0.back?{kind:'move',tx:T0.back[0],ty:T0.back[1]}:null;u.path=null;return;}
          if(!u.postSet)u.orderPost='accroupi';if(d2(u.x,u.y,nd.i+.5,nd.j+.5)>1.4){this.go(u,nd.i+.5,nd.j+.5);return;}u.anim='action';T0.plant=(T0.plant||0)+dt;if(T0.plant<.6)return;
          u.charges--;this.s.charges??=[];if(!this.s.charges.some(c=>c.node===T0.node))this.s.charges.push({node:T0.node,f:u.f,by:u.id,t:this.s.t+(u.fuse??.3),x:nd.i+.5,y:nd.j+.5});
          u.orderPost='accroupi';u.sneakHome=true;u.task=T0.back?{kind:'move',tx:T0.back[0],ty:T0.back[1]}:{kind:'guard',tx:u.x,ty:u.y};u.path=null;return;}
        const b=this.building(T0.b);if((!b||b.ruin)&&(u.charges>0||u.torch>0)){const nx=(T0.next||[]).map(id=>this.building(id)).find(b2=>b2&&!b2.ruin);if(nx){T0.b=nx.id;T0.next=T0.next.filter(id=>id!==nx.id);T0.plant=0;u.path=null;return;}}
        if(b&&!b.ruin&&!T0.plant&&(this.s.charges?.some(c=>c.b===b.id&&c.f===u.f)||u.torch>0&&!(u.charges>0)&&b.fire>0)){const nx=(T0.next||[]).map(id=>this.building(id)).find(b2=>b2&&!b2.ruin&&!this.s.charges.some(c=>c.b===b2.id&&c.f===u.f));if(nx){T0.b=nx.id;T0.next=T0.next.filter(id=>id!==nx.id);u.path=null;return;}u.orderPost='accroupi';u.task=T0.back?{kind:u.f==='beee'?'guard':'move',tx:T0.back[0],ty:T0.back[1]}:{kind:'guard',tx:u.x,ty:u.y};u.path=null;return;}   // un camarade l'a déjà minée
        if(!b||b.ruin||!(u.charges>0||u.torch>0)){u.orderPost=null;u.task=T0.back?{kind:u.f==='beee'?'guard':'move',tx:T0.back[0],ty:T0.back[1]}:null;u.path=null;return;}
        const [w,h]=this.sizeOf(b);const d=this.distB(b,u.x,u.y);if(!u.postSet)u.orderPost=d<6?'couche':d<22||(u.det?.beee||0)>.1?'accroupi':null;   // debout de loin, courbé à l'approche, on rampe au plus près
        if(this.spotted(u,u.f==='meumeu'?'beee':'meumeu')&&!T0.plant&&((u.supp||0)>.2||this.s.units.some(e=>e.f!==u.f&&active(e)&&e.w&&d2(e.x,e.y,u.x,u.y)<7))){
          for(const m of this.s.units.filter(m=>m.f===u.f&&m.task?.kind==='sabotage'&&m.task.b===T0.b&&!m.task.plant&&d2(m.x,m.y,u.x,u.y)<12)){const bk=m.task.back;m.orderPost=null;m.task=bk?{kind:m.f==='beee'?'guard':'move',tx:bk[0],ty:bk[1],retreat:1}:{kind:'guard',tx:m.x,ty:m.y};m.path=null;m.why='compromis : l’équipe décroche';}   // toute l'équipe décroche
          if(u.f==='meumeu'&&!(this.s.t-(this.compT||-9)<.5)){this.compT=this.s.t;this.log('Front',`${u.name||'Un saboteur'} est découvert : l’équipe décroche.`,'bad');}return;}
        if(d>1.3){this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]);return;}
        u.anim='action';T0.plant=(T0.plant||0)+dt;if(T0.plant<.5)return;
        // une torche (les Bèè n'ont pas d'explosifs) : le feu prend, il faudra l'éteindre en réparant
        if(!(u.charges>0)&&u.torch>0){u.torch--;b.fire=Math.max(b.fire||0,FIRE.hours);this.emit({type:'fire',x:b.i+w/2,y:b.j+h/2});this.log(this.cityName(b),u.f==='beee'?`Des Bèè ont mis le feu à ${BUILDINGS[b.k].name.toLowerCase()} : il faut l’éteindre (réparer).`:`${u.name||'Un saboteur'} a mis le feu à ${BUILDINGS[b.k].name.toLowerCase()} bèè.`,u.f==='beee'?'bad':'good');}
        else{u.charges--;const op=this.operation(u.op);if(op)op.planted=(op.planted||0)+1;this.s.charges??=[];this.s.charges.push({b:b.id,f:u.f,by:u.id,t:this.s.t+(u.fuse??.3),x:b.i+w/2,y:b.j+h/2});}
        if(u.f==='meumeu')this.log(this.cityName(b),`${u.name||'Un saboteur'} a posé sa charge sur ${BUILDINGS[b.k].name.toLowerCase()} bèè.`,'good');
        {const nx=(T0.next||[]).map(id=>this.building(id)).find(b2=>b2&&!b2.ruin);if(nx&&(u.charges>0||u.torch>0)){u.task={kind:'sabotage',b:nx.id,back:T0.back,next:T0.next.filter(id=>id!==nx.id)};u.path=null;return;}}
        u.orderPost='accroupi';u.sneakHome=true;   // on décroche courbé, sans traîner
        u.task=T0.back?{kind:u.f==='beee'?'guard':'move',tx:T0.back[0],ty:T0.back[1]}:{kind:'guard',tx:u.x,ty:u.y};u.path=null;return;}
      case 'assault':{if(u.blockedBy!=null&&!this.wall[u.blockedBy])u.blockedBy=null;
        if(!this.atWar){if(this.go(u,T0.tx,T0.ty))u.task={kind:'guard',tx:T0.tx,ty:T0.ty};return;}
        const enemy=this.nearestEnemy(u,Math.max(this.sight(),this.engageRange(u)+2));
        if(u.f==='beee'&&(u.w||D.img)){const range=this.engageRange(u),desired=Math.max(3.5,range*.92);
          // à portée : on tire (sans reculer — reculer sous le feu, c'est ne plus tirer) ; sinon on s'approche jusqu'à portée
          if(enemy){T0.sabotage=false;const dist=d2(u.x,u.y,enemy.x,enemy.y);
            if(dist<=range&&this.engage(u,enemy))return;
            const dx=enemy.x-u.x,dy=enemy.y-u.y,n=Math.hypot(dx,dy)||1;this.go(u,u.x+dx/n*Math.max(1,dist-desired),u.y+dy/n*Math.max(1,dist-desired));return;}
          const target=this.building(T0.targetId)||this.nearestEnemyBuilding(u,range);
          if(target&&target.f!==u.f&&!target.ruin&&this.distB(target,u.x,u.y)<=range*.98&&this.engage(u,target))return;
          if(target&&target.f!==u.f&&!target.ruin){const [tw,th]=BUILDINGS[target.k].size,tx=target.i+tw/2,ty=target.j+th/2;
            const [sx,sy]=T0.approach||[u.x,u.y],dx=sx-tx,dy=sy-ty,n=Math.hypot(dx,dy)||1,side=(u.id%5-2)*.55;
            const stand=Math.max(Math.max(tw,th)/2+1,range*.93),safe=!BUILDINGS[target.k].defense&&!this.s.buildings.some(b=>b.f==='meumeu'&&b.done&&!b.ruin&&BUILDINGS[b.k].defense&&d2(b.i,b.j,tx,ty)<BUILDINGS[b.k].defense.range+3);
            if(!D.img&&safe&&d2(u.x,u.y,tx,ty)<stand+.6)T0.sabotage=true;
            const radius=T0.sabotage&&safe?Math.max(tw,th)/2+.65:stand,gx=tx+dx/n*radius-dy/n*side,gy=ty+dy/n*radius+dx/n*side;
            if(d2(u.x,u.y,gx,gy)>.55){this.go(u,gx,gy);return;}u.anim='aim';this.face(u,tx-u.x,ty-u.y);return;}
          this.beeeRetarget(u);return;}
        // nos soldats obéissent : en marche, ils ripostent à ce qui est à portée (et s'arrêtent pour tirer), puis reprennent
        // la route de l'ordre ; ils ne partent ni à la poursuite, ni brûler ou saccager un bâtiment qu'on ne leur a pas désigné
        const e=this.nearestEnemy(u,this.engageRange(u));
        if(e&&this.engage(u,e))return;
        if(u.blockedBy!=null){this.engage(u,{wall:u.blockedBy,x:u.blockedBy%this.N+.5,y:((u.blockedBy/this.N)|0)+.5});return;}
        if(this.go(u,T0.tx,T0.ty)){if(T0.fx!=null)this.face(u,T0.fx,T0.fy);u.task=u.f==='beee'?{kind:'assault',tx:T0.tx,ty:T0.ty,hunt:true}:{kind:'guard',tx:T0.tx,ty:T0.ty};if(u.f==='beee')this.beeeRetarget(u);}return;}
      case 'attack':{const e=T0.unit!=null?this.unit(T0.unit):T0.b!=null?this.building(T0.b):T0.wall!=null?(this.wall[T0.wall]?{wall:T0.wall,x:T0.wall%this.N+.5,y:((T0.wall/this.N)|0)+.5}:null):null;
        if(!e||(e.hp!=null&&e.hp<=0)||e.ruin||(e.h&&e.h.state!=='ok'&&e.h.state!=='blesse')){u.task=null;return;}
        if(!this.engage(u,e)){const [x,y]=this.posOf(e);if(e.k&&BUILDINGS[e.k]&&e.i!=null){const [w,h]=BUILDINGS[e.k].size;this.go(u,x,y,[e.i,e.j,w,h]);}else this.go(u,x,y);}return;}
      case 'enlist':{const b=this.building(T0.b);if(!b||!b.done||b.ruin){u.task=null;return;}const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h+.7,[b.i,b.j,w,h]))return;
        this.enterBarracks(u,b);return;}
      case 'gather':return this.gatherTick(u,T0,dt);
      case 'deposit':{const b=this.building(T0.b);if(!b||!u.carry){u.task=null;return;}this.deliverTo(u,b);return;}
      case 'build':case 'repair':{const b=this.building(T0.b);if(!b||(T0.kind==='build'&&b.done)||(T0.kind==='repair'&&(b.ruin||!b.done||(b.hp>=b.max-.5&&!b.fire)))){u.task=null;return;}
        // un bâtisseur meumeu qui va chercher des matériaux au dépôt du chantier
        if(T0.kind==='build'&&T0.fetch!=null){this.fetchTick(u,T0,b,dt);return;}
        const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;u.anim='action';this.face(u,b.i+w/2-u.x,b.j+h/2-u.y);
        if(T0.kind==='build'){
          // on ne bâtit que ce qui est payé : les bâtisseurs prennent les matériaux aux dépôts proches, à mesure qu'ils arrivent
          const frac=this.sitePaidFrac(b);if(frac>=1-1e-6&&b.progress>=1-1e-6)b.progress=1;else if(b.progress>=frac-1e-6&&!this.haulTick(u,T0,b,dt))return;b.why=null;
          const nb=this.s.units.filter(x=>x.task?.kind==='build'&&x.task.b===b.id).length,extra=b.k==='enclos'?Math.max(0,this.sizeOf(b)[0]*this.sizeOf(b)[1]-9)*.25:0;b.progress=Math.min(this.sitePaidFrac(b),1,b.progress+dt/(BUILDINGS[b.k].hours+extra)*(1/Math.sqrt(Math.max(1,nb))*1.2)*this.mod('construction'));this.practice('construction',dt);b.hp=Math.max(b.hp,b.max*b.progress);
          if(b.progress>=1){b.done=true;const was=b.ruin;b.ruin=false;b.why=null;b.hp=Math.max(b.hp,b.max*.6);this.autoLink(b);this.log(this.cityName(b),`${BUILDINGS[b.k].name} : ${was?'rebâti':'terminé'}.`,'good');this.emit({type:'built',x:b.i+w/2,y:b.j+h/2,k:b.k});u.task=null;
            if(BUILDINGS[b.k].workers&&this.workers(b,true).length<BUILDINGS[b.k].workers)u.task={kind:'work',b:b.id};}}
        else{if(b.fire>0){b.fire=Math.max(0,b.fire-dt*3);}else b.hp=Math.min(b.max,b.hp+dt*60);}return;}
      case 'work':{const b=this.building(T0.b);if(!b||!b.done){u.task=null;return;}if(BUILDINGS[b.k].hub)return this.hubTick(u,b,dt);const [w,h]=this.sizeOf(b);u.at=this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]);u.anim=u.at&&b.working?'action':'idle';return;}
      case 'line':return this.lineTick(u,T0,dt);
      case 'zone':return this.zoneTick(u,T0);
      case 'evac':return this.evacTick(u,T0);
      case 'board':return this.boardTick(u,T0);
      case 'shelter':{const b=this.building(T0.b);if(!b||!b.done){u.task=null;return;}const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;
        if((b.hide||[]).length>=(BUILDINGS[b.k].shelter||0)){u.task=null;return;}(b.hide??=[]).push(u);this.s.units.splice(this.s.units.indexOf(u),1);this.uIndex.delete(u.id);u.task=null;u.path=null;return;}
      case 'board':{const b=this.building(T0.b);if(!b||!b.done){u.task=null;return;}const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;
        (b.pass??=[]).push(u);this.s.units.splice(this.s.units.indexOf(u),1);this.uIndex.delete(u.id);u.task=null;return;}}}
  stateChange(u,st){if(st==='hors'||st==='mort')this.handover(u);if(st==='mort'){this.death(u);return;}
    if(st==='hors'){this.emit({type:'down',id:u.id,x:u.x,y:u.y,f:u.f,cause:u.h.cause});if(u.f==='meumeu')this.log(this.nearCity(u),`${u.name||UNITS[u.k].name} est à terre : ${u.h.cause}.`,'bad');}}
  death(u){if(u.hp<=0)return;if(u.f==='beee'&&this.s.units.some(o=>o!==u&&o.f==='beee'&&active(o)&&d2(o.x,o.y,u.x,u.y)<this.sight()*.7&&this.los(o.x,o.y,u.x,u.y)))this.beeeNotice?.(u.x,u.y,5,'camarade abattu');if(u.f==='meumeu')this.s.beee.hurt=(this.s.beee.hurt||0)+(u.w?.6:.35);if(u.w&&this.W(u.w).crew>1)this.handover?.(u);u.hp=0;const cause=u.h?.cause||'tué';this.s.corpses.push({x:u.x,y:u.y,f:u.f,k:u.k,t:this.s.t,dir:u.dir,sheet:UDEF(u).sheet,bl:u.h?1-u.h.blood/BLOOD:0,wounds:(u.h?.wounds||[]).map(w=>({entry:w.entry,exit:w.exit,sev:w.sev}))});if(this.s.corpses.length>200)this.s.corpses.shift();
    this.emit({type:'death',x:u.x,y:u.y,f:u.f,k:u.k,id:u.id});if(u.f==='meumeu')this.log(this.nearCity(u),`${u.name||UNITS[u.k]?.name} est mort (${cause}).`,'bad');}
  resupply(u,fromBarracks=false){const D=UDEF(u),barr=fromBarracks&&u.homeBarracks&&this.building(u.homeBarracks);if(barr)this.autoLink(barr);const supply=barr&&this.building(barr.sup),take=(k,n,r=RADIUS)=>{if(supply){const q=Math.min(n,supply.stock[k]||0);supply.stock[k]=(supply.stock[k]||0)-q;return q;}return this.take(u.f,u.x,u.y,k,n,r);};
    if(u.w){const W=this.W(u.w),heavy=W.crew>1||D.img,near=heavy?this.depots(u.f,u.x,u.y,2.5).length>0:true;
      if((near||supply)&&W.perCrate>0){const want=Math.max(0,W.carry-(u.mag||0)-(u.pouch||0));if(want>=1){const available=supply?Math.floor((supply.stock['m:'+u.w]||0)*W.perCrate+1e-6):this.depots(u.f,u.x,u.y,heavy?2.5:RADIUS).reduce((n,b)=>n+Math.floor((b.stock['m:'+u.w]||0)*W.perCrate+1e-6),0);const rounds=Math.min(want,available);if(rounds>=1){const crates=take('m:'+u.w,rounds/W.perCrate,heavy?2.5:RADIUS);u.pouch=(u.pouch||0)+Math.min(rounds,Math.floor(crates*W.perCrate+1e-6));}}}}
    // la tôle d'un bouclier se redresse au dépôt (comme les essuies du silencieux : gratuit) : une pièce à moins de 6 cases d'un dépôt retrouve sa plaque
    if(u.plates?.bouclier<1&&this.depots(u.f,u.x,u.y,6).length)u.plates.bouclier=1;
    // au dépôt, on change les essuies du silencieux, on le regraisse
    // (les essuies du silencieux se changent gratuitement) ; la batterie infrarouge, elle, se change contre une BATTERIE CHARGÉE prise au dépôt
    // (fabriquée à l'atelier, livrée par le fret comme toute marchandise) : dès qu'elle est à moitié vide, un dépôt à moins de 6 cases qui en a
    // une la remplace ; sans batterie en stock, pas de recharge.
    {const dep=u.supUse?this.depots(u.f,u.x,u.y,6):[];if(dep.length)u.supUse=0;}   // (V12.4 : plus de batteries à prendre au dépôt)
    if(D.smoke&&(u.smoke||0)<D.smoke){const g=take('explosifs',(D.smoke-(u.smoke||0))/20);u.smoke=(u.smoke||0)+Math.floor(g*20+1e-6);}
    if(D.medic&&u.kits<D.kits){const g=take('sante',(D.kits-u.kits)/4);u.kits+=Math.floor(g*4+1e-6);}
    if(D.tents&&u.tents<D.tents&&this.canPay(u.f,u.x,u.y,{sante:1,bois:5}).ok){this.pay(u.f,u.x,u.y,{sante:1,bois:5});u.tents++;}
    // Une pièce conçue prend les munitions m:<conception>, jamais des obus génériques.
    if(u.role==='munitions'&&u.sq&&!fromBarracks&&!u.crewAmmo)this.ammoRun(u);}
  // Ordre explicite : un servant va au dépôt puis rapporte les obus. Le stock n'est débité qu'à son arrivée.
  requestCrewResupply(gunId){const gun=this.unit(gunId);if(!gun||gun.f!=='meumeu'||!alive(gun)||!gun.w)return {ok:false,why:['pièce introuvable']};
    const W=this.W(gun.w);if(W.crew<=1)return {ok:false,why:['cette arme n’a pas de servants']};
    if((gun.mag||0)+(gun.pouch||0)>=W.carry)return {ok:false,why:['la pièce est déjà chargée au maximum']};
    const working=this.s.units.find(u=>u.crewAmmo?.gun===gun.id&&active(u));if(working)return {ok:true,text:`${working.name||'Le servant'} ravitaille déjà la pièce.`};
    const crew=this.s.units.filter(u=>u.serve===gun.id&&active(u)&&u.h?.state!=='hors'&&(!u.crates||u.ammoW===gun.w)).sort((a,b)=>d2(a.x,a.y,gun.x,gun.y)-d2(b.x,b.y,gun.x,gun.y));
    const servant=crew[0];if(!servant)return {ok:false,why:['aucun servant disponible : affectez-en un à cette pièce']};
    const k='m:'+gun.w,dep=this.s.buildings.filter(b=>b.f===gun.f&&this.isDepot(b)&&Math.floor((b.stock[k]||0)*W.perCrate+1e-6)>=1).sort((a,b)=>this.distB(a,servant.x,servant.y)-this.distB(b,servant.x,servant.y))[0];
    if(!dep&&!(servant.crates>1/W.perCrate))return {ok:false,why:[`aucun dépôt n’a de munitions pour ${this.design(gun.w)?.name||'cette pièce'}`]};
    const [bw,bh]=dep?this.sizeOf(dep):[0,0];servant.crewAmmo={gun:gun.id,dep:dep?.id??null,phase:servant.crates>1/W.perCrate?'return':'out'};
    servant.task=servant.crewAmmo.phase==='out'?{kind:'move',tx:dep.i+bw/2,ty:dep.j+bh+.6}:{kind:'move',tx:gun.x,ty:gun.y};servant.path=null;
    servant.why=servant.crewAmmo.phase==='out'?`cherche des munitions au ${this.depotName(dep)}`:'rapporte les munitions à la pièce';
    gun.why='attend le retour du servant avec les munitions';return {ok:true,text:`${servant.name||'Un servant'} va ravitailler ${this.design(gun.w)?.name||'la pièce'} au ${dep?this.depotName(dep):'stock porté'}.`};}
  // une pièce servie à sec (joueur seulement : les Bèè ont leur propre ravitaillement) : si un servant porte encore un obus entier, il le donne de lui-même
  // (bearerTick) ; sinon l'un d'eux part au dépôt garni le plus proche. Vrai si quelqu'un s'en occupe.
  crewDry(u){if(u.f!=='meumeu'||!u.w)return false;const W=this.W(u.w);if(!(W.crew>1))return false;
    if(this.s.units.some(o=>o.serve===u.id&&active(o)&&o.ammoW===u.w&&Math.floor((o.crates||0)*W.perCrate+1e-6)>=1&&d2(o.x,o.y,u.x,u.y)<2.5))return true;
    if((this.s.t-(u.crewAskT??-9))<.5)return this.s.units.some(o=>o.crewAmmo?.gun===u.id&&active(o));u.crewAskT=this.s.t;
    const r=this.requestCrewResupply(u.id);if(r.ok){u.why='à sec : un servant va chercher des obus au dépôt';return true;}return false;}
  crewAmmoTick(u){const job=u.crewAmmo,gun=this.unit(job?.gun);if(!gun||!alive(gun)||!gun.w||!active(u)){u.crewAmmo=null;return;}
    const W=this.W(gun.w);if(job.phase==='out'){const dep=this.building(job.dep);if(!dep||!this.isDepot(dep)){u.crewAmmo=null;u.why='ravitaillement interrompu : dépôt indisponible';return;}
      const [bw,bh]=this.sizeOf(dep),tx=dep.i+bw/2,ty=dep.j+bh+.6;
      if(this.distB(dep,u.x,u.y)>1.5){if(u.task?.kind!=='move')u.task={kind:'move',tx,ty};return;}
      const rounds=Math.min(Math.max(0,W.carry-(gun.mag||0)-(gun.pouch||0)),2*W.perCrate,Math.floor((dep.stock['m:'+gun.w]||0)*W.perCrate+1e-6));
      if(rounds<1){u.crewAmmo=null;u.why='dépôt à sec : aucun obus à rapporter';gun.why='à sec : dépôt sans munitions';return;}
      dep.stock['m:'+gun.w]-=rounds/W.perCrate;u.ammoW=gun.w;u.crates=(u.crates||0)+rounds/W.perCrate;job.phase='return';u.path=null;u.task={kind:'move',tx:gun.x,ty:gun.y};u.why=`rapporte ${rounds} coup${rounds>1?'s':''} à la pièce`;return;}
    if(d2(u.x,u.y,gun.x,gun.y)>1.35){if(u.task?.kind!=='move')u.task={kind:'move',tx:gun.x,ty:gun.y};else{u.task.tx=gun.x;u.task.ty=gun.y;}return;}
    const rounds=Math.min(Math.max(0,W.carry-(gun.mag||0)-(gun.pouch||0)),Math.floor((u.crates||0)*W.perCrate+1e-6));
    if(rounds>0){gun.pouch=(gun.pouch||0)+rounds;u.crates=Math.max(0,(u.crates||0)-rounds/W.perCrate);gun.dry=false;gun.why=null;this.log(this.nearCity(gun),`${u.name||'Un servant'} a livré ${rounds} coup${rounds>1?'s':''} à ${this.design(gun.w)?.name||'la pièce'}.`,'good');}
    u.crewAmmo=null;u.why=null;u.task={kind:'guard',tx:gun.x,ty:gun.y};u.path=null;}
  // Le porteur de munitions de l'escouade : à vide et loin de tout dépôt garni, il va recharger ses caisses au dépôt (ou au
  // camp-dépôt avancé) le plus proche qui en a, puis revient ; chargé, il court au camarade le plus à court.
  ammoRun(u){const sq=this.squad(u.sq);const wid=u.ammoW;if(!sq||!wid||!alive(u)||u.h?.state==='hors')return;const T0=u.task;const Wd=this.W(wid);const k='m:'+wid;
    if(T0&&!['guard','move'].includes(T0.kind))return;
    // en route vers le dépôt : rechargé (le dépôt est à portée), il fait demi-tour
    if(T0?.ammoRun==='dep'){if((u.crates||0)>=1.5){u.task=T0.back||null;u.path=null;u.why=null;}return;}
    // vers un camarade : vidé, arrivé près de lui (la cohue empêche d'atteindre sa case exacte) ou lui servi, il reprend son poste
    if(T0?.ammoRun==='mate'){const m=this.unit(T0.mate);if(!(u.crates>=.05)||!m||!alive(m)||d2(m.x,m.y,u.x,u.y)<1.3||(m.pouch||0)>=Wd.carry*.5){u.task=T0.back||null;u.path=null;}else{T0.tx=m.x;T0.ty=m.y;}return;}
    const back=T0&&!T0.ammoRun?T0:null;
    if((u.crates||0)<.5){if(this.depots(u.f,u.x,u.y,Wd.crew>1?2.5:RADIUS).some(D=>(D.stock[k]||0)>=1))return;
      const dep=this.s.buildings.filter(b=>b.f===u.f&&this.isDepot(b)&&!BUILDINGS[b.k].foodOnly&&(b.stock[k]||0)>=1).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0];
      if(!dep){u.why='porteur à vide : aucun dépôt n’a de munitions '+(this.design(wid)?.name||'');return;}
      const [w,h]=this.sizeOf(dep);u.task={kind:'move',tx:dep.i+w/2,ty:dep.j+h+.6,back,ammoRun:'dep'};u.path=null;u.why=`va recharger ses caisses (${this.depotName(dep)})`;return;}
    const dry=this.members(sq).filter(o=>o!==u&&o.w===wid&&alive(o)&&(o.pouch||0)<Wd.carry*.5).sort((a,z)=>((a.mag||0)+(a.pouch||0))-((z.mag||0)+(z.pouch||0))||d2(a.x,a.y,u.x,u.y)-d2(z.x,z.y,u.x,u.y))[0];
    if(dry&&d2(dry.x,dry.y,u.x,u.y)>1.3){u.task={kind:'move',tx:dry.x,ty:dry.y,back,ammoRun:'mate',mate:dry.id};u.path=null;}}
  // Toutes les trois secondes : un soldat à sec va chercher des munitions ; un blessé qui saigne encore, qui a un bras cassé
  // ou un pneumothorax se replie vers l'hôpital (le saignement interne ne s'arrête qu'au bloc).
  selfCare(u){const D=UDEF(u);const T0=u.task;
    if(u.op&&this.operation(u.op)?.state==='en_cours'){if(u.w&&u.mag<=0&&u.pouch<=0)u.why='à sec : programme maintenu, repli ou ravitaillement à ordonner';return;}
    if((D.arm||D.img)&&u.w&&u.mag<=0&&u.pouch<=0&&(!T0||T0.kind==='guard'||T0.kind==='assault')){
      if(u.f==='beee'){this.beeeRetarget(u);return;}
      const W=this.W(u.w);
      // l'escouade a un porteur de munitions (chargé, ou parti recharger) : on l'attend sur place
      const sq=u.sq&&this.squad(u.sq);const bearer=sq&&this.members(sq).find(o=>o!==u&&o.role==='munitions'&&alive(o)&&o.h?.state!=='hors'&&o.ammoW===u.w);
      if(bearer&&((bearer.crates||0)>0||bearer.task?.ammoRun)){u.why='à sec : attend le porteur de munitions';return;}
      if(W.crew>1&&this.s.units.some(o=>o.crewAmmo?.gun===u.id&&active(o))){u.why='à sec : attend le retour du servant';return;}
      // V12.3 : une pièce servie ne quitte pas sa position pour aller aux munitions — un de ses servants y va (seule, sans servant, elle y va elle-même)
      if(this.crewDry(u))return;
      // le dépôt garni le plus proche (un camp avancé) passe avant la caserne quand il est plus près
      const dep=this.s.buildings.filter(b=>b.f===u.f&&this.isDepot(b)&&(b.stock['m:'+u.w]||0)>=W.p.mag/W.perCrate).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0];
      const bar=u.homeBarracks&&this.building(u.homeBarracks);
      if(bar?.done&&!bar.ruin&&(!dep||this.distB(bar,u.x,u.y)<=this.distB(dep,u.x,u.y)+8)){u.task={kind:'resupply',b:u.homeBarracks,back:T0&&T0.kind!=='assault'?T0:null};u.path=null;u.why='à sec : retour à sa caserne pour se ravitailler';return;}
      if(dep){const [w,h]=BUILDINGS[dep.k].size;u.task={kind:'move',tx:dep.i+w/2,ty:dep.j+h+.6,back:T0&&T0.kind!=='assault'?T0:null};u.path=null;u.why='à sec : il va chercher des munitions';}
      else u.why='à sec : aucun dépôt n’a de munitions '+(this.design(u.w)?.name||'');return;}
    if(u.why?.startsWith('à sec')&&(u.mag>0||u.pouch>0))u.why=null;
    // Le blessé ne quitte pas son poste pour une égratignure : il ne part seul que s'il saigne vraiment ou si son état est grave,
    // et, sous un ordre (marche, garde, assaut, tir), seulement en urgence vitale (hémorragie, poumon ouvert, bloc nécessaire)
    if(u.h&&u.f==='meumeu'&&u.h.state==='blesse'&&T0?.kind!=='hosp'&&T0?.kind!=='evac'){const h=u.h;const br=bleedRate(h),loss=1-h.blood/BLOOD;
      const vital=needsSurgery(h)||br*DAY*HOUR_REAL>Math.max(1,(.3-loss)*BLOOD)||loss>.22||(h.pneumo>0&&!h.sealed&&!h.drained);
      const serious=vital||br>.01||h.legs>0||(h.lost||[]).length>0||loss>.12;
      const need=T0&&T0.kind!=='work'&&T0.kind!=='gather'?vital:serious;
      if(need){const b=needsSurgery(h)?this.careFor(u):this.hospitalFor(u)||this.careFor(u);if(b){u.task={kind:'hosp',b:b.id};u.path=null;u.why=null;}else u.why='blessé : il faudrait une tente médicale ou un hôpital';}}}
  // Attaquer les Bèè en temps de paix, c'est leur déclarer la guerre.
  declareWar(by){const B=this.s.beee;if(B.phase==='war')return;if((B.phase==='truce'||B.phase==='peace')&&by==='meumeu')B.anger+=1;
    B.phase='war';B.truceUntil=null;B.warDay=this.day;B.told=99;B.nextWave=this.s.t+DAY*.8;B.nextAir=this.s.t+BEEE.air*DAY;
    this.log('Frontière',by==='meumeu'?'Nous avons ouvert le feu : c’est la guerre avec les Bèè.':'Les Bèè ont déclaré la guerre.','bad');this.emit({type:'war',text:by==='meumeu'?'Nous avons déclaré la guerre aux Bèè.':'Les Bèè ont déclaré la guerre.'});}
  // Un fumigène : lancé entre soi et l'ennemi le plus proche (ou droit devant) ; un nuage que les balles traversent, pas les regards
  throwSmoke(u,x=null,y=null){if(!(u.smoke>0)||!active(u))return false;if(x==null){const e=this.nearestEnemy(u,20);const dx=e?e.x-u.x:u.fx||1,dy=e?e.y-u.y:u.fy||0;const L=Math.hypot(dx,dy)||1;const d=Math.min(3,e?L*.45:2.5);x=u.x+dx/L*d;y=u.y+dy/L*d;}
    u.smoke--;this.s.shots.push({kind:'smokeg',f:u.f,by:u.id,x0:u.x,y0:u.y,x1:x,y1:y,t:0,dur:1.5/HOUR_REAL});this.emit({type:'throw',x:u.x,y:u.y});return true;}
  smokeOrder(ids){let n=0;for(const id of ids){const u=this.unit(id);if(u&&this.throwSmoke(u))n++;}return n;}
  posOf(e){if(e.wall!=null)return [e.x,e.y];if(e.k&&BUILDINGS[e.k]&&e.i!=null){const [w,h]=BUILDINGS[e.k].size;return [e.i+w/2,e.j+h/2];}return [e.x,e.y];}
  // ce qu'on voit : 18 cases (72 m) le jour, la moitié la nuit
  sight(){return 10+22*this.light();}   // portée nue : le grossissement optique est appliqué observateur par observateur
  // la portée d'engagement : ce que l'arme porte utilement (un peu plus), et ce qu'on voit
  engageRange(u){const D=UDEF(u);if(!u.w)return D.img?D.range:3;const W=this.W(u.w);if(D.img||ACTIONS[W.p.action]?.mortar)return Math.max(8,this.zoneRange(W)*.95);const reach=W.optic?.mag>1?1+(W.optic.day-1)*.8:1;return clamp(Math.max(14,W.eff*1.6/TILE_M),12,34*reach);}
  // voir : un bâtiment entre deux points cache (on ne voit pas à travers les maisons)
  los(ax,ay,bx,by){for(const s of this.s.smokes){const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy||1;const t=Math.max(0,Math.min(1,((s.x-ax)*dx+(s.y-ay)*dy)/L2));if(Math.hypot(ax+dx*t-s.x,ay+dy*t-s.y)<s.r*Math.min(1,(s.end-this.s.t)/1+.3))return false;}
  const d=d2(ax,ay,bx,by);const n=Math.ceil(d*2);for(let k=1;k<n;k++){const x=ax+(bx-ax)*k/n,y=ay+(by-ay)*k/n;const ix=Math.floor(y)*this.N+Math.floor(x),o=this.occ[ix];if(o>=0){const b=this.bIndex.get(o);if(b&&!b.ruin){if(this.fort[ix]){if(!this.emb[ix])return false;}else if(this.distB(b,ax,ay)>.6&&this.distB(b,bx,by)>.6)return false;}}}return true;}
  // ---------- la détection ----------
  // On ne tire que sur ce qu'on a repéré. La signature d'une unité : debout, accroupie, couchée ; en marche ; l'éclair de son
  // dernier coup ; une tranchée, un arbre, un rocher, un mur tout près ; le camouflage des éclaireurs et des tireurs d'élite.
  // La nuit raccourcit la vue (sight), la fumée la coupe (los). Repérée, une unité le reste un peu (le souvenir du guetteur).
  sigOf(e){const N=this.N,i=Math.floor(e.x),j=Math.floor(e.y);const D=UDEF(e);const fired=this.s.t-(e.firedAt??-9)<.25;const firedK=e.firedK??1.9;
    // la posture compte plus que tout, et plus encore la nuit : couché dans le noir, on n'est qu'une ombre ; ramper se voit à peine
    const night=this.light()<.4;let k=(e.post==='couche'?.32*(night?.7:1):e.post==='accroupi'?.58*(night?.85:1):1)*(e.anim==='walk'?(e.post==='couche'?1.1:e.post==='accroupi'?1.2:1.3):1)*(fired?firedK:1)*(this.s.sacs[j*N+i]?.b?.5:1);
    if(e.camoSuit&&!fired)k*=night?.55:.62;
    if(night&&e.nvOn&&(e.irLeft??0)>0&&e.w&&this.W(e.w).ir?.leak)k*=1.35;   // une lampe sans filtre laisse une lueur rouge : on repère l'opérateur
    let near=false;for(let dj=-1;dj<=1&&!near;dj++)for(let di=-1;di<=1;di++){const kk=(j+dj)*N+i+di;if(this.nodeAt[kk]>=0||this.occ[kk]>=0&&this.bIndex.get(this.occ[kk])?.f===e.f){near=true;break;}}if(near)k*=.65;
    if(D.camo&&!fired)k*=D.camo;if(D.img)k=Math.max(k,1.3);
    // une lanterne dans la nuit se voit de loin (aussi loin qu'un homme debout en plein jour)
    if(e.lamp&&night)k=Math.max(k,3.2);return k;}
  // La suspicion monte avant le repérage : de près et de jour, presque aussitôt ; de loin et de nuit, il faut du temps —
  // le temps de se jeter à terre (la signature baisse, on sort du champ, la suspicion retombe). Un guetteur qui a déjà vu
  // quelque chose dans l'heure réagit trois fois plus vite ; un éclaireur aussi.
  detectTick(dt){this.detT=(this.detT||0)+dt;if(this.detT<.06)return;const step=this.detT;this.detT=0;this.gridBuild();const base=this.sight();const t=this.s.t;const night=this.light()<.4;
    const act=this.s.units.filter(u=>active(u)&&u.hp>0);
    const towers=this.s.buildings.filter(b=>b.done&&!b.ruin&&BUILDINGS[b.k].defense).map(b=>{const [w,h]=this.sizeOf(b);return {x:b.i+w/2,y:b.j+h/2,f:b.f,k:'tour',tower:true};})
    // (un engin de combat dont l'équipage vit guette tout autour de lui, comme une tour : l'équipage à bord ne comptait plus comme observateur)
    for(const v of this.s.vehicles)if(VEHDEF[v.k]&&v.hp>0&&(v.crew||[]).some(u=>u.hp>0&&u.h?.state!=='hors'))towers.push({x:v.x,y:v.y,f:v.f,k:'tour',tower:true,veh:v.id});
    // chaque guetteur : son acuité (un villageois au travail regarde à peine), la direction où il regarde (le cône), son éveil
    // (en ronde il tourne la tête, en alerte il scrute partout), et la nuit son infrarouge s'il en a un (projecteur allumé, batterie chargée)
    const alerts=this.s.beee.alerts||[];
    const Lt=this.light();let gmax=Math.max(1,...act.map(u=>this.eyeProfile(u).max/Math.max(1,base)));
    for(const o of act){const D=o.scoutRole?{scout:1.5}:UDEF(o);const civ=!o.w&&!UDEF(o).img;const Wo=o.w?this.W(o.w):null;o._civ=civ;o._eye=(D.scout||1)*(civ?.45:1)*(o.post==='couche'?.9:1);
      // la lunette : son gain (de jour, et selon son objectif la nuit), dans un cône de ±22° autour de la visée (±35° immobile : il balaie)
      const O=Wo?.optic;o._scope=O&&O.mag>1?O.night+(O.day-O.night)*Math.max(0,Math.min(1,(Lt-.15)/.45)):1;o._scC=t-(o.moved??-9)>.05?.82:.93;gmax=Math.max(gmax,o._eye*o._scope);
      const alert=o.f==='beee'&&(o.task?.kind==='search'||alerts.some(a=>t-a.t<3&&d2(a.x,a.y,o.x,o.y)<a.r+14));o._wide=alert?2:o.task?.kind==='patrol'?1:0;
      const ir=night&&o.f==='meumeu'&&o.nvOn&&(o.irLeft??0)>0?Math.max(Wo?.ir?Wo.ir.range*(1+.2*Math.log2(Wo.optic?.mag||1)):0,o.bino||0):0;o._ir=ir;if(ir)gmax=Math.max(gmax,ir/Math.max(1,base)*o._eye);}
    for(const o of towers){o._eye=1.8;o._wide=1;o._ir=0;}
    // les jumelles (u.jum : leur portée de jour en cases ; u.bino : l'infrarouge de nuit) : de jour, la vue porte jusque-là
    if(!night)for(const o of act)if(o.jum>0){o._eye=Math.max(o._eye,o.jum/Math.max(1,base));gmax=Math.max(gmax,o._eye);}
    const CONE=[[1,.55,.22],[1,.72,.38],[1,.88,.62]];
    const cone=(o,e,d)=>{if(o.tower||o.fx==null||d<.01)return 1;const c=(o.fx*(e.x-o.x)+o.fy*(e.y-o.y))/d;const L=CONE[o._wide||0];return c>=.5?L[0]:c>=-.2?L[1]:L[2];};
    for(const f of ['meumeu','beee']){const tw=towers.filter(o=>o.f===f);if(!act.some(o=>o.f===f)&&!tw.length)continue;
      for(const e of act){if(e.f===f)continue;const R=Math.max(1.6,base*this.sigOf(e));let best=Infinity,by=null;
        const sg=R/Math.max(.01,base);
        const look=o=>{if(o.f!==f||!o.tower&&!active(o))return;const d=d2(o.x,o.y,e.x,e.y);const r=this.visualRange(o,e.x,e.y,sg);if(d>r)return;
          const q=d<Math.min(o._civ&&night?1.2:2,r*.35)?0:d/r;if(q<best&&(d<2||this.los(o.x,o.y,e.x,e.y))){best=q;by=o;if(q===0)return true;}};
        if(!this.near(e.x,e.y,Math.max(R*Math.max(1.73,gmax*1.05),R/base*40),look))for(const o of tw)if(look(o))break;
        const det=(e.det??={});
        if(by){const warm=(this.s.beee.alerts||[]).some(a=>f==='beee'&&t-a.t<3&&this.alertCovers(a,e.x,e.y,8))||e.spot?.[f]!=null&&t-e.spot[f]<1;
          const T=(night?.75:.14)*(.12+best)*(warm?.33:1)*(!by.tower&&(by.scoutRole||UDEF(by).scout)?.7:1)*(!by.tower&&by._civ?3:1);det[f]=best===0?1.2:Math.min(1.2,(det[f]||0)+step/Math.max(.02,T));
          if(f==='beee'&&det[f]>.45&&det[f]<1&&t-(e.susAlertT??-99)>1){e.susAlertT=t;this.beeeNotice?.(e.x+(this.rand()-.5)*7,e.y+(this.rand()-.5)*7,8,'mouvement suspect');}
          if(det[f]>=1){const was=this.spotted(e,f,1);(e.spot??={})[f]=t;(e.spotBy??={})[f]=by.id;if(f==='beee'&&!was)this.beeeNotice?.(e.x,e.y,4,'vu');}}
        else det[f]=Math.max(0,(det[f]||0)-step*1.5);}}}
  chargesTick(){const C=this.s.charges;if(!C?.length)return;for(const c of [...C]){if(this.s.t<c.t)continue;C.splice(C.indexOf(c),1);
      if(c.node!=null){const n=this.s.nodes[c.node];this.blast(c.x,c.y,'grenade',c.f,c.by,1,'shell');if(n&&n.left>0){n.sabUntil=this.t+24;this.log('Front',`L’accès au filon de ${n.res} est saboté ; le minerai reste disponible après remise en état.`,'info');}continue;}
      const b=this.building(c.b);
      this.blast(c.x,c.y,'grenade',c.f,c.by,1,'shell');if(!b||b.ruin)continue;const B=BUILDINGS[b.k];
      if(BUILDINGS[b.k].bunker){this.breakDoorsNear(b,c.x,c.y);}
      if(b.k==='mine'){b.sabUntil=this.t+24;b.why='accès saboté : remise en état';}
      if(this.volatile?.(b)>2)this.depotBlow?.(b,c.by);else{this.damage(b,b.max*.5,c.f);if(B.factory||B.store){b.sabUntil=this.s.t+14;b.why='saboté : réparations en cours';}}
      const who=b.f==='meumeu';this.log(this.cityName(b),who?`Sabotage ! ${B.name} a sauté dans la nuit${b.sabUntil>this.s.t?' — arrêt le temps des réparations':''}.`:`Nos saboteurs ont fait sauter ${B.name.toLowerCase()} bèè.`,who?'bad':'good');}}
  quietOk(u,e){if(!u.w)return false;const W=this.W(u.w);const d=d2(u.x,u.y,e.x,e.y);if(d>14)return false;
    const S=W.sup;let dB=W.dB;if(S){let R=S.R;const use=(u.supUse||0)+1;if(S.life)R*=1-(1-S.floor)*Math.min(1,(use-1)/S.life);if(S.wet)R*=use<=S.wet?S.wetK:1;dB=Math.max(W.actDb||100,Math.round(W.dB0-Math.min(38,R)));}
    const hear=Math.max(4,(dB-110)/1.6),crack=W.crackDb>dB+2?Math.max(4,(W.crackDb-110)/1.6):0;const see=this.sight()*.8;
    return !this.near(e.x,e.y,Math.max(hear,crack,see)+2,o=>o!==e&&o.f===e.f&&active(o)&&this.spotted(o,u.f)&&(d2(o.x,o.y,u.x,u.y)<hear||crack&&d2(o.x,o.y,e.x,e.y)<crack*.7||d2(o.x,o.y,e.x,e.y)<see&&this.los(o.x,o.y,e.x,e.y)));}
  spotted(e,f,mem=.3){const m=e.spot?.[f];return m!=null&&this.s.t-m<=mem;}
  nearestEnemy(u,r){let best=null,score=-Infinity;const D0=UDEF(u);this.near(u.x,u.y,r,e=>{if(e.f===u.f||!active(e))return;const d=d2(e.x,e.y,u.x,u.y);if(d>r||!this.spotted(e,u.f)||!this.los(u.x,u.y,e.x,e.y))return;
      const armed=!!(e.w||UDEF(e).img),reach=d<=this.engageRange(u),threat=(armed?4:0)+(e.task?.kind==='attack'||e.task?.kind==='assault'?2:0)
        +(D0.sniper?(e.serve?4:0)+(e.w&&this.W(e.w).crew>1?5:0)+(UDEF(e).scout?3:0)+(UDEF(e).medic?2:0)+(e.k==='commando'?2:0):0);
      // un vrai feu se répartit : une cible déjà prise à partie par des camarades vaut moins ; chacun préfère ce qu'il a devant lui
      // (son secteur), garde sa cible plutôt que de perdre sa visée, répond d'abord à qui vient de tirer, vise moins volontiers un
      // homme couché ; un petit penchant propre à chaque tireur départage les autres
      const aimed=this.aimCount(e.id,u.f)-(u.aimAt===e.id?1:0);const face=u.fx!=null&&d>.01?(u.fx*(e.x-u.x)+u.fy*(e.y-u.y))/d:0;
      const fired=this.s.t-(e.firedAt??-9)<.05?1.5:0,prone=e.post==='couche'?.6:0,mine=u.aimAt===e.id?1.5:0,taste=((u.id*73+e.id*151)%97)/97*.8;
      const value=threat+(reach?2:0)-d/Math.max(3,r)*3-(e.h?.state==='blesse'?1:0)-aimed*1.6+face*1.2+fired-prone+mine+taste;
      if(value>score){score=value;best=e;}});
    // les engins ennemis : l'antichar d'abord ; les armes légères seulement si elles peuvent percer (voir vehThreatFor)
    for(const v of this.cvs||[]){if(v.f===u.f||v.hp<=0)continue;const d=d2(v.x,v.y,u.x,u.y);if(d>r||!this.vehSeen(u.f,v)||!this.los(u.x,u.y,v.x,v.y))continue;const val=this.vehThreatFor(u,v,d,r);if(val>score){score=val;best=v;}}
    return best;}
  // combien des nôtres visent cette cible en ce moment (compté une fois par instant)
  aimCount(id,f){const t=this.s.t;if(this._aimT!==t||!this._aim){this._aimT=t;const m=this._aim={meumeu:new Map(),beee:new Map()};for(const u of this.s.units){if(u.aimAt==null||!(u.hp>0)||t-(u.firedAt??-9)>.05)continue;const M=m[u.f];if(M)M.set(u.aimAt,(M.get(u.aimAt)||0)+1);}}
    return this._aim[f]?.get(id)||0;}
  nearestEnemyBuilding(u,r){let best=null,bd=r;for(const b of this.s.buildings){if(b.f===u.f||b.ruin)continue;const d=this.distB(b,u.x,u.y);if(d<bd){bd=d;best=b;}}return best;}

  // ---------- tirer ----------
  // Engager : à portée et à vue, on vise (le temps de viser dépend de l'arme), on tire au rythme de la culasse,
  // on recharge le chargeur depuis les munitions qu'on porte. Faux si l'on doit d'abord se rapprocher.
  engage(u,e){if(!this.atWar||u.h&&u.h.state!=='ok'&&u.h.state!=='blesse')return false;const D=UDEF(u);const [x,y]=this.posOf(e);const isB=e.k&&BUILDINGS[e.k]&&e.i!=null;const distT=isB?this.distB(e,u.x,u.y):d2(x,y,u.x,u.y);
    if(D.img)return this.cannon(u,e,distT,isB);
    // un fusil ne démolit pas une maison : au contact, on la saccage (on y met le feu, on arrache, on défonce)
    if(isB||e.wall!=null){if(distT>(isB?.9:1.5))return false;this.face(u,x-u.x,y-u.y);u.anim='action';u.path=null;
      this.damage(e,SACK.hp*this.dt,u.f);if(isB&&e.fire<=0&&this.rand()<SACK.fire*this.dt){e.fire=FIRE.hours;this.emit({type:'fire',x:e.i+1,y:e.j+1});}return true;}
    if(!u.w)return false;const W=this.W(u.w);
    // un mortier ne tire qu'en cloche : sur l'ennemi qu'il voit, il règle son tir coup après coup
    if(ACTIONS[W.p.action]?.mortar){if(isB||e.wall!=null)return false;if(!u.lob||u.lob.id!==e.id)u.lob={id:e.id,x,y,high:true,bias:null,fired:0,n:Infinity};u.lob.x=x;u.lob.y=y;return this.zoneTick(u,u.lob,true);}
    if(distT>this.engageRange(u))return false;
    if(!isB&&e.wall==null&&!this.los(u.x,u.y,x,y))return false;
    this.face(u,x-u.x,y-u.y);u.anim='aim';u.path=null;
    // on ne tire pas en marchant : on s'arrête, on se cale, on vise ; seule la charge tire en avançant (et mal)
    if(!u.charge&&this.s.t-(u.moved||-9)<SETTLE)return true;
    if(u.supp>.85&&this.rand()<.7)return true;                 // cloué au sol
    if((u.stun||0)>0){u.why='sonné';return true;}              // sonné par une explosion : il ne tire plus, un instant
    if(u.reload>0)return true;
    // une pièce : elle se met en batterie (immobile) avant de tirer ; il manque des servants, elle tire et recharge lentement
    let miss=0;if(W.crew>1){const mv=this.s.t-(u.moved||-9)<.03,rest=this.trenchRest(u,W);u.deployT=mv?0:(u.deployT||0)+this.dts*(rest<1?1.45:1);if(u.deployT<W.setup){u.why=rest<1?'mise en batterie dans la tranchée':'mise en batterie';return true;}if(u.why?.startsWith('mise en batterie'))u.why=null;miss=Math.max(0,W.crew-1-this.servants(u).length);if(miss)u.why=`${miss} servant${miss>1?'s':''} manquant${miss>1?'s':''} · pointage et rechargement très lents`;}
    if(u.mag<=0){if(u.pouch>0){const n=Math.min(W.p.mag,u.pouch);u.mag=n;u.pouch-=n;u.reload=u.reloadTotal=(W.p.mag>12?4:W.p.action==='verrou'?3:2.5)*(1+miss*2.5);u.burst=0;this.emit({type:'reload',x:u.x,y:u.y});return true;}u.dry=true;return false;}
    u.dry=false;if(u.cool>0)return true;if(u.f==='meumeu')this.practice('tir',.03);
    if(u.aimAt!==(e.id??e.wall??'b')){u.aimAt=e.id??e.wall??'b';u.cool=(W.crew>1?Math.min(W.aim,12):W.aim)*(u.post==='couche'?1.2:1)*(UDEF(u).choc?.7:1);return true;}
    // le coup part
    // l'entretien d'une mitrailleuse servie : le tube s'use à chaque coup ; tous les huitièmes de sa vie de tube, l'entretien prend une pièce au dépôt le plus
    // proche (40 cases) ; sans pièce, l'arme usée s'enraye de plus en plus souvent — une mitrailleuse coûte cher à tenir, pas seulement à fabriquer
    if(W.mg){u.wear=(u.wear||0)+1;const step=Math.max(60,(W.life||2000)/8);if(u.wear>=step){u.wear-=step;const got=this.take(u.f,u.x,u.y,'pieces',1,40);u.worn=got<.99?(u.worn||0)+1:Math.max(0,(u.worn||0)-1);}
      if(u.worn>0&&this.rand()<.015*u.worn){u.cool=(u.cool||0)+(W.clear||3);u.why='mitrailleuse usée : il faut des pièces';}}
    u.mag--;if(ACTIONS[W.p.action]?.auto){u.burst=(u.burst||0)+1;if(u.burst>=4){u.burst=0;u.cool=(W.crew>1?Math.min(W.aim,12):W.aim)*.7;}else u.cool=W.cyc;}else{u.burst=0;u.cool=W.cyc+(W.crew>1?Math.min(W.aim,12):W.aim)*.4;}if(miss)u.cool*=1+miss*1.8;
    if(!(W.mountOk||u.k==='choc'&&W.need==='bipied')){u.cool*=1+Math.min(5,W.rk0*(u.k==='choc'?.5:1));u.why='affût insuffisant : tir lent et dispersé';}
    const R=distT*TILE_M;const fl=W.at(R);
    const isV=!!VEHDEF[e.k]&&!!e.mounts;const share={};let ix=x,iy=y;for(let k=0;k<(isB||e.wall!=null?1:(W.pel||1));k++){const res=isB||e.wall!=null?{hit:true,struct:true,v:fl.v}:isV?this.vehAim(u,e,W,R,u.burst||0):this.resolve(u,e,W,R,u.burst||0,share);
      [ix,iy]=res.hit?[x,y]:[res.px??x,res.py??y];
      this.s.shots.push({kind:'round',f:u.f,by:u.id,w:u.w,x0:u.x,y0:u.y,x1:ix,y1:iy,t:0,dur:Math.max(.01,fl.t)/HOUR_REAL,res,target:isB?{b:e.id}:e.wall!=null?{wall:e.wall}:isV?{v:e.id}:{u:e.id},R,tracer:!!CONSTRUCTIONS[W.p.cons].tracer});}
    this.shotNoise(u,W,ix,iy);
    // (nos balles sur une ville bèè : comme un bombardement, ils cherchent le tireur au son et à l'éclair — avant, seuls les obus déclenchaient une riposte)
    if(u.f==='meumeu'&&e.f==='beee'&&!isB)this.beeeShelled(ix,iy,u,{radius:.5});
    this.emit({type:'shot',by:u.id,moving:this.s.t-(u.moved??-9)<.05,x:u.x+(u.fx||0)*.32,y:u.y+(u.fy||0)*.32,x1:ix,y1:iy,f:u.f,cal:W.p.d,v0:W.v0,dB:u.lastDb,E:W.E0,sup:W.vTop>340,tr:!!CONSTRUCTIONS[W.p.cons].tracer,rk:W.rocket,flash:W.flash,inc:!!CONSTRUCTIONS[W.p.cons].inc,tip:TIPC[W.p.cons]||null,he:!!W.he,action:W.p.action,feed:W.p.feed||'',barrels:W.barrels||1,rof:W.rpm,caseMat:W.caseless?null:(W.p.caseMat||'laiton'),eject:!W.rocket&&W.p.action!=='verrou',fins:W.fins||0,ig:W.boost?.ig||0,seek:!!GUIDES[W.p.guide]?.seek,stages:W.p.stages||1});if(W.rocket)this.backblast(u,x-u.x,y-u.y,W);u.xp=(u.xp||0)+.05;return true;}
  // Où va la balle : la dispersion (l'arme, le tireur, sa posture, le feu qu'il subit, sa blessure, le recul de la rafale),
  // l'erreur d'estimation de la distance (la chute), puis ce qu'elle rencontre : le couvert (et s'il le perce), le corps.
  resolve(u,e,W,R,burst,share=null){const D=UDEF(u);const skill=(D.skill||2.4)/(1+(u.xp||0)/60)/(u.f==='meumeu'?this.mod('tir'):1);const moving=this.s.t-(u.moved||-9)<.03;
    const irBlur=u.nvOn&&(u.irLeft??0)>0&&this.light()<.4&&d2(u.x,u.y,e.x,e.y)>this.sight()?2.5:1;   // (à l'infrarouge, au-delà de la vue nue : image floue, sans relief)
    const sigS=irBlur*skill*POST[u.post||'debout']*(moving?2.4:1)*(1+1.5*(u.supp||0))*(u.h?malus(u.h).aim:1)*(u.armor?1+((this.armorOf(u.armor)?.D.aim||1)-1)*(UDEF(u).choc?.load??1):1);
    const sigW=W.moa*.291*(u.mount?1:(W.mountOk||u.k==='choc'&&W.need==='bipied')?1:2+Math.min(4,W.rk0))*(u.mount?.8:this.trenchRest(u,W));const sigR=burst*W.rk*(u.k==='choc'?.5:1)*9*(u.mount?.5:1);const crewU=u.k==='choc'?crewOf(W,.5):W.crew;const missing=crewU>1&&!u.mount?Math.max(0,crewU-1-this.servants(u).length):0;
    // Le viseur réduit l'erreur angulaire propre du tireur; il n'ajoute pas de
    // vitesse ni de portée balistique. Tirer en mouvement/sous le feu garde ses
    // pénalités, et la dispersion/traînée de l'arme restent présentes.
    const sigSight=(W.sightAimMrad||1.8)*(moving?2.2:1)*(u.post==='couche'?.55:u.post==='accroupi'?.78:1);
    // la lunette : une image nette et grossie, le tireur arrêté tient mieux sa visée ; son réticule gradué fait estimer la distance
    // (la chute : plus la balle tombe vite, plus l'estimation compte) ; la nuit, sans lumière dans l'optique ni infrarouge allumé, on vise mal
    const O=W.optic,mg=O?.mag>1?Math.log2(O.mag):0,Lt=this.light();const dark=Lt<.4?(.4-Lt)/.4:0;const nv=u.nvOn&&(u.irLeft??0)>0&&(W.ir||u.bino);
    const nightK=1+dark*(nv?.15:1.1/(1+(O?.mag>1?Math.min(1,O.ep/2.5)*mg*.5:0)));
    const sig=Math.hypot(sigS/(moving?1:1+.16*mg),sigW,sigR,sigSight)/1000*(1+missing*1.6)*(W.tracer&&burst>0?.7:1)*nightK;
    const fl=W.at(R),fl2=W.at(R+1);const slope=fl2.drop-fl.drop;const dropErr=slope*.12*R/(1+.5*mg);
    let ex,ey;if(share?.ex!=null){ex=share.ex;ey=share.ey;}else{ex=sig*R*this.gauss();ey=sig*R*this.gauss()+dropErr*this.gauss();if(share){share.ex=ex;share.ey=ey;}}
    if(W.pel>1){const sp=(CONSTRUCTIONS[W.p.cons].spread||20)/1000*R/2;ex+=sp*this.gauss()*.7;ey+=sp*this.gauss()*.7;}
    const post=e.post||'debout';const aimY=AIM[post];
    // le couvert, devant la cible
    const cov=this.coverFor(e,u.x,u.y);let v=fl.v,yaw0=0;
    const hy=aimY+ey;
    if(cov&&hy<cov.h&&this.rand()<cov.p){const pen=W.pen(v);if(pen>cov.eq){v*=Math.sqrt(1-cov.eq/pen);yaw0=.4+this.rand()*1.1;this.emit({type:'pierce',x:e.x,y:e.y});}
      else return {hit:false,cover:cov.kind,px:e.x+(u.x-e.x)*.08,py:e.y+(u.y-e.y)*.08,near:.2};}
    // le bouclier de la pièce : il abrite le tireur et ses servants des tirs venus de face ; la balle doit d'abord le traverser (le modèle des plaques de gilet)
    {const sg=this.shieldFor(e,u.x,u.y);
      if(sg&&hy<sg.S.h&&Math.abs(ex)<sg.S.w/2+.02){const r=armorHit(sg.D,'bouclier',sg.gun,W.proj||W,v,W.pen(v),this.rand);
        if(r?.stopped){sg.gun.shieldHit=this.s.t;return {hit:false,cover:'metal',shield:true,px:e.x+(u.x-e.x)*.08,py:e.y+(u.y-e.y)*.08,near:.15};}
        if(r){yaw0=Math.max(yaw0,.3+this.rand()*.6);v=r.v;sg.gun.shieldHit=this.s.t;}}}
    // le corps : la balle arrive de la direction du tireur ; on se place dans le repère de la cible
    const tx=u.x-e.x,ty=u.y-e.y;const tl=Math.hypot(tx,ty)||1;const fx=e.fx??1,fy=e.fy??0;const cross=fx*ty/tl-fy*tx/tl,dot=fx*tx/tl+fy*ty/tl;const alpha=Math.atan2(cross,dot);
    const dirL=[0,-slope,-1];const oL=[ex,hy,2];const hit=this.bodyRay(oL,dirL,alpha,post,e.f);
    if(!hit){const near=Math.hypot(ex,hy-BODY_H/2);const k=.4+this.rand()*1.6;return {hit:false,near,px:e.x-tx/tl*k+(this.rand()-.5)*.3,py:e.y-ty/tl*k+(this.rand()-.5)*.3};}
    // la protection : la balle entre-t-elle par une plaque ?
    let plate=null;const Ar=e.armor&&this.armorOf(e.armor);if(Ar){const zone=plateZone(hit.p);if(zone&&Ar.D.zones[zone]?.t>0){const r=armorHit(Ar.D,zone,e,W.proj||W,v,W.pen(v),this.rand);
        if(r?.stopped)return {hit:true,stopped:true,zone,v,blunt:r.blunt,mat:r.mat,armor:Ar.A.name,p:hit.p,d:hit.d,eq:r.eq};if(r){
          // La bascule de la balle après la plaque est proportionnelle à l'énergie que la plaque lui a prise : un gilet de soie qu'elle
          // traverse à peine ne la retourne pas (mesuré avant : 820 J cédés au corps avec un gilet, contre 194 J sans).
          const lost=Math.max(0,1-(r.v*r.v)/Math.max(1,v*v));yaw0=Math.max(yaw0,(.5+this.rand()*.8)*Math.min(1,.2+2*lost));v=r.v;plate=zone;}}}
    const rec=wound(W.proj||W,v,hit.p,hit.d,this.rand,yaw0);return {hit:true,rec,v,plate,cover:cov&&hy<cov.h?cov.kind:null};}
  // Viser un véhicule : la même dispersion que sur un homme (le tireur, sa posture, le feu subi, l'arme, la rafale), mais la cible est la silhouette de
  // l'engin vue du tireur (sa longueur ou sa largeur selon l'angle, sa hauteur) — on la touche presque toujours de près ; où la balle frappe en hauteur
  // (ey) dira plus loin si c'est la caisse ou la tourelle.
  vehAim(u,v,W,R,burst){const D=UDEF(u);const moving=this.s.t-(u.moved||-9)<.03;
    const sigS=(D?.skill||2.4)/(1+(u.xp||0)/60)*(POST[u.post||'debout']||1)*(moving?2.4:1)*(1+1.5*(u.supp||0))*(u.h?malus(u.h).aim:1);
    const sigW=W.moa*.291*(u.mount||W.mountOk||u.k==='choc'&&W.need==='bipied'?1:2+Math.min(4,W.rk0));const sig=Math.hypot(sigS,sigW,burst*W.rk*(u.k==='choc'?.5:1)*9*(u.mount?.5:1),W.sightAimMrad||1.8)/1000;
    const V=VEHDEF[v.k];const a=Math.atan2(v.y-u.y,v.x-u.x),rel=Math.atan2(Math.sin(a-v.h),Math.cos(a-v.h));
    const halfW=(Math.abs(Math.cos(rel))*V.large+Math.abs(Math.sin(rel))*V.long)/2*TILE_M,H=(V.haut||Math.min(V.large*.8,1.1))*TILE_M;
    const ex=sig*R*this.gauss(),ey=H*.45+sig*R*this.gauss();const fl=W.at(R);
    if(Math.abs(ex)<halfW&&ey>0&&ey<H)return {hit:true,veh:true,v:fl.v,ex,ey,H};
    const k=.6+this.rand()*1.6;return {hit:false,near:Math.max(0,Math.abs(ex)-halfW),px:v.x-Math.cos(a)*k+(this.rand()-.5)*.6,py:v.y-Math.sin(a)*k+(this.rand()-.5)*.6};}
  // Un membre d'équipage touché dans l'habitacle (le projectile qui a percé, ou un éclat de la plaque) : la même blessure que dehors — un rayon qui
  // le frappe d'un côté au hasard (assis : accroupi), le modèle de blessure, l'état qui suit (hors de combat, mort)
  vehCrewHit(v,u,P,vel,cause){if(!u.h){u.hp=0;return true;}u.x=v.x;u.y=v.y;setSpecies(u.f);let hit=null;
    // (un rayon presque droit, comme pour les éclats à terre — mesuré : incliné de ±0,15 rad depuis 2 m, il dérivait de ±30 cm pour un corps de ±10 cm,
    // et manquait presque toujours)
    for(let t=0;t<6&&!hit;t++)hit=this.bodyRay([(this.rand()-.5)*.22,this.rand()*BODY_H*.72,2],[(this.rand()-.5)*.04,(this.rand()-.5)*.04,-1],this.rand()*6.283,'accroupi',u.f);if(!hit)return false;
    const rec=wound(P,vel,hit.p,hit.d,this.rand,this.rand()*1.3);const out=applyWound(u.h,rec,this.rand,cause);u.hitAt=this.s.t;
    (u.h.log??=[]).push({t:this.s.t,what:`touché à bord de ${v.name} (${cause})`,by:''});
    this.emit({type:'wound',cause:u.h.cause,len:(P.p?.d||2)/1000,victim:u.id,vf:u.f,vk:u.k,rec,out,x:v.x,y:v.y,dir:[0,1],name:u.name,veh:v.id});
    if(out?.now==='mort')this.death(u);return true;}
  // Le rayon d'une balle dans le repère du corps, selon la posture ; renvoie le point d'entrée, ou rien (elle passe à côté)
  bodyRay(oL,dL,alpha,post,sp='meumeu'){setSpecies(sp);const ca=Math.cos(-alpha),sa=Math.sin(-alpha);const rot=v=>[v[0]*ca+v[2]*sa,v[1],-v[0]*sa+v[2]*ca];let o=rot(oL),d=rot(dL);
    if(post==='accroupi'){o=[o[0],o[1]/.72,o[2]];d=[d[0],d[1]/.72,d[2]];}
    else if(post==='couche'){const h0=.045,c=.15;const tr=v=>[v[0],v[2]+c,h0-v[1]];const trd=v=>[v[0],v[2],-v[1]];o=tr(o);d=trd(d);}
    const n=Math.hypot(d[0],d[1],d[2]);d=[d[0]/n,d[1]/n,d[2]/n];
    // la boîte qui contient le corps, pour ne marcher que dedans
    const bmin=sp==='wild'?[-.105,0,-.2]:[-.105,0,-.065],bmax=sp==='wild'?[.105,BODY_H+.01,.2]:[.105,BODY_H+.01,.075];let t0=0,t1=6;for(let a=0;a<3;a++){if(Math.abs(d[a])<1e-9){if(o[a]<bmin[a]||o[a]>bmax[a])return null;continue;}let ta=(bmin[a]-o[a])/d[a],tb=(bmax[a]-o[a])/d[a];if(ta>tb)[ta,tb]=[tb,ta];t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)return null;}
    for(let t=t0;t<=t1;t+=.0005){const p=[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t];if(regionAt(p))return {p:[p[0]-d[0]*.001,p[1]-d[1]*.001,p[2]-d[2]*.001],d};}return null;}
  // Le couvert d'une cible, vu du tireur : un mur, une maison, une ruine, un arbre, juste devant elle.
  // h : sa hauteur (m) ; eq : son épaisseur en acier équivalent (mm) ; p : la chance qu'il soit sur la trajectoire.
  // Le bouclier qui abrite `e` d'un tir venu de (sx,sy) : celui de sa pièce (il la tient, ou il la sert), si le tir vient de face (à ± 70° de son cap)
  // et si `e` est derrière la plaque ou à sa hauteur (pas en avant d'elle). Rend la plaque sous la forme d'une zone d'armure (armorHit) ; l'usure vit sur la pièce.
  // Le poids de l'obus se partage entre ceux qui servent la pièce (le tireur et ses servants présents) : à deux bras, la loi d'avant (1 s par 100 g au-delà de 2,5 s) ;
  // plus de bras la raccourcissent, moins l'allongent — et au-delà de 0,5 kg par bras (ce qu'un Meumeu lève à l'aise) chacun peine, de plus en plus vite (puissance 1,5).
  handsFactor(W,hands){const r=(W.rm||0)/1000/Math.max(1,hands)/.5;return Math.min(12,(2/Math.max(1,hands))*(1+.6*Math.pow(Math.max(0,r-1),1.5)));}
  // Le poids, en kg, des caisses qu'un Meumeu porte : ce qu'elles contiennent (obus ou cartouches), pas leur nombre
  crateKg(u){if(!(u.crates>0))return 0;const Wa=u.ammoW&&this.design(u.ammoW)?this.W(u.ammoW):null;return Wa?u.crates*Wa.perCrate*(Wa.rm||0)/1000:u.crates*CRATE_KG;}
  shieldFor(e,sx,sy){const gun=e.w&&this.W(e.w).crew>1?e:(e.serve?this.unit(e.serve):null);if(!gun||!alive(gun)||!gun.w)return null;
    const S=this.W(gun.w).shield;if(!S)return null;const fx=gun.fx??1,fy=gun.fy??0,fn=Math.hypot(fx,fy)||1,dx=sx-gun.x,dy=sy-gun.y,dn=Math.hypot(dx,dy)||1;
    if((fx*dx+fy*dy)/(fn*dn)<.34)return null;
    if(((e.x-gun.x)*fx+(e.y-gun.y)*fy)/fn>.25)return null;
    return {gun,S,D:{zones:{bouclier:{mat:S.mat,t:S.t,eq:S.eq,kg:S.kg}}}};}
  coverFor(e,sx,sy){const dx=sx-e.x,dy=sy-e.y;const L=Math.hypot(dx,dy)||1;let best=null;
    for(const s of [.35,.6,.9]){const x=e.x+dx/L*s,y=e.y+dy/L*s;const i=Math.floor(x),j=Math.floor(y);if(i<0||j<0||i>=this.N||j>=this.N)continue;const k=j*this.N+i;
      let c=null;const trench=this.s.sacs[k];if(trench?.b&&Math.hypot(e.x-(i+.5),e.y-(j+.5))<.8)c=trench.t==='fosses'?{kind:'fosse',h:.9,eq:10,p:.9}:{kind:'sacs',h:.5,eq:6,p:.92};const w=this.wall[k];if(!c&&Math.abs(w)===3)c={kind:'porte',h:1,eq:24,p:1};else if(!c&&Math.abs(w)===2)c={kind:'mur',h:.25,eq:3*(w>0?this.mod('couvert'):1),p:.95};
      else if(!c&&this.occ[k]>=0){const b=this.bIndex.get(this.occ[k]);if(b){const BD=BUILDINGS[b.k];c=b.ruin?{kind:'ruine',h:.16,eq:2.5,p:.8}:BD.bunker?(this.emb[k]?{kind:'embrasure',h:.6,eq:BD.eq||40,p:.55}:{kind:'beton',h:1,eq:BD.eq||40,p:1}):{kind:'maison',h:.6,eq:1.2,p:1};}}
      else if(!c&&this.nodeAt[k]>=0){const nd=this.s.nodes[this.nodeAt[k]];if(nd.type==='tree'&&nd.left>0)c={kind:'arbre',h:1,eq:4,p:.35};else if(nd.type==='rock'&&nd.left>0)c={kind:'rocher',h:.12,eq:8,p:.7};}
      if(c&&(!best||c.h*c.p>best.h*best.p))best=c;}
    return best;}
  // Le canon : il tire des obus en cloche ; ils éclatent à l'arrivée
  cannon(u,e,distT,isB){if(!u.w)return false;const W=this.W(u.w),[x,y]=this.posOf(e);if(!this.canZone(W)||distT>this.zoneRange(W)*.96)return false;if(!u.lob||u.lob.id!==e.id)u.lob={id:e.id,x,y,high:true,bias:null,fired:0,n:Infinity};u.lob.x=x;u.lob.y=y;return this.zoneTick(u,u.lob,true);}

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
    const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return true;u.anim='action';b.working=true;if(D.doctor)b.surgeon=u.id;u.opT=(u.opT||0)+this.dts;
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
    const b=this.careFor(u,u,T0.to);if(!b){u.task=null;u.carrying=null;e.carriedBy=null;return;}const [w,h]=this.sizeOf(b);
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
  discharge(b,u){const B=BUILDINGS[b.k];const [w,h]=this.sizeOf(b);u.x=b.i+w/2+(this.rand()-.5)*w;u.y=b.j+h+.6;u.task=null;u.path=null;u.post='debout';this.s.units.push(u);this.uIndex.set(u.id,u);
    if(u.h.lost?.length&&u.k!=='villageois'){const dep=this.depots(u.f,u.x,u.y)[0];if(u.w&&dep)this.put(dep,'a:'+u.w,1);u.k='villageois';u.w=null;u.mag=0;u.pouch=0;u.gren=0;u.amput=true;
      this.log(this.cityName(b),`${u.name} a perdu un membre : réformé, il retourne travailler (son arme est rendue au dépôt).`,'warn');}
    else this.log(this.cityName(b),`${u.name||'Un blessé'} est guéri : il reprend son poste.`,'good');}
  gatherTick(u,T0,dt){const nd=this.s.nodes[T0.node];const res=T0.res;
    if(nd?.sabUntil>this.t){u.anim='idle';u.why='accès saboté : remise en état';return;}
    if(u.carry&&(u.carry.k!==res||u.carry.n>=CARRY-1e-6||!nd||nd.left<1e-6)){this.deliverTick(u);return;}
    if(!nd||nd.left<1){const next=this.s.nodes.filter(x=>x.type===T0.type&&x.left>=1&&(x.type!=='ore'||x.res===res)&&d2(x.i,x.j,u.x,u.y)<12).sort((a,b)=>d2(a.i,a.j,u.x,u.y)-d2(b.i,b.j,u.x,u.y))[0];
      if(!next){u.task=null;return;}T0.node=next.id;u.path=null;return;}
    if(!this.go(u,nd.i+.5,nd.j+.5,[nd.i,nd.j,1,1]))return;u.anim='action';this.face(u,nd.i+.5-u.x,nd.j+.5-u.y);
    const mine=nd.type==='ore'&&this.s.buildings.some(b=>b.k==='mine'&&b.ore===nd.id&&b.done);const rate=(NODES[nd.type].rate)*(mine?0:1)*this.mod('gather_'+nd.type);this.practice(DOM_OF[nd.type],dt);
    const got=Math.min(rate*dt,nd.left,CARRY-(u.carry?.n||0));nd.left-=got;u.carry={k:res,n:(u.carry?.n||0)+got};if(nd.left<1&&nd.type!=='bush'&&nd.type!=='ore'){this.nodeAt[nd.j*this.N+nd.i]=-1;this.emit({type:'felled',x:nd.i,y:nd.j,nt:nd.type});}}
  // Au camp : chacun ramasse ce que le camp demande (ou ce qui y manque le plus) à moins de 10 cases, et le rapporte au camp
  // V12.5 : la ressource vivante la plus proche de (x, y) dans un rayon autour d'un bâtiment — on ne parcourt que les cases voisines (la grille nodeAt),
  // au lieu des 94 000 ressources de la carte « mer » (le coût dépendait de la taille de la carte, plus de ce qu'il y a autour du camp)
  nodeNearest(b,r,type,x,y){const N=this.N,[w,h]=this.sizeOf(b);let best=null,bd=1e18;const nodes=this.s.nodes;
    for(let j=Math.max(0,Math.floor(b.j-r)-1);j<=Math.min(N-1,Math.ceil(b.j+h+r)+1);j++)for(let i=Math.max(0,Math.floor(b.i-r)-1);i<=Math.min(N-1,Math.ceil(b.i+w+r)+1);i++){const id=this.nodeAt[j*N+i];if(id<0)continue;const n=nodes[id];
      if(!n||n.type!==type||!(n.left>=1)||this.distB(b,n.i+.5,n.j+.5)>=r)continue;const d=d2(n.i,n.j,x,y);if(d<bd){bd=d;best=n;}}return best;}
  hubTick(u,b,dt){const want=b.res||'auto';const TYPE={bois:'tree',pierre:'rock',vivres:'bush'};let types=want==='auto'?['tree','rock','bush']:[TYPE[want]];
    if(want==='auto')types.sort((x,y)=>(b.stock[NODES[x].res]||0)-(b.stock[NODES[y].res]||0));
    let nd=u.hubNode!=null?this.s.nodes[u.hubNode]:null;const ok=n=>n&&n.left>=1&&types.includes(n.type)&&this.distB(b,n.i+.5,n.j+.5)<10;
    if(u.carry&&(u.carry.n>=CARRY-1e-6||!ok(nd))){if(this.room(b)<1){u.why='le camp est plein : il lui faut des porteurs';u.anim='idle';u.at=false;return;}this.deliverTo(u,b);u.at=false;return;}
    if(!ok(nd)){if(u.hubScan>this.s.t){u.anim='idle';u.at=false;return;}nd=null;for(const t of types){const c=this.nodeNearest(b,10,t,u.x,u.y);if(c){nd=c;break;}}
      u.hubNode=nd?nd.id:null;u.path=null;if(!nd){u.why='plus rien à ramasser autour du camp';u.anim='idle';u.at=false;u.hubScan=this.s.t+1;u.hubEmpty=(u.hubEmpty||0)+1;
        if(u.hubEmpty>=12){u.task=null;u.hubEmpty=0;u.why=null;if(!b.emptyTold&&u.f==='meumeu'){b.emptyTold=true;this.log(this.cityName(b),`${this.depotName(b)} : plus rien à ramasser à 10 cases. Ses villageois sont libres.`,'warn');}}return;}u.hubEmpty=0;b.emptyTold=false;}
    u.why=null;if(!this.go(u,nd.i+.5,nd.j+.5,[nd.i,nd.j,1,1])){u.at=false;return;}u.at=true;u.anim='action';this.face(u,nd.i+.5-u.x,nd.j+.5-u.y);const res=NODES[nd.type].res;
    const got=Math.min(NODES[nd.type].rate*this.mod('gather_'+nd.type)*dt,nd.left,CARRY-(u.carry?.k===res?u.carry.n:0));if(u.carry&&u.carry.k!==res){this.deliverTo(u,b);return;}
    nd.left-=got;u.carry={k:res,n:(u.carry?.n||0)+got};this.practice(DOM_OF[nd.type],dt);if(nd.left<1&&nd.type!=='bush'){this.nodeAt[nd.j*this.N+nd.i]=-1;this.emit({type:'felled',x:nd.i,y:nd.j,nt:nd.type});}}
  deliverTick(u){const aff=u.dep!=null?this.building(u.dep):null;const b=aff&&this.isDepot(aff)&&this.room(aff)>=1&&(!BUILDINGS[aff.k].foodOnly||['vivres','grain','ble_moulu'].includes(u.carry?.k))?aff:this.dropAt(u);if(!b){u.anim='idle';u.why='aucun dépôt atteignable';return;}this.deliverTo(u,b);}
  deliverTo(u,b){const [w,h]=this.sizeOf(b);if(!this.go(u,b.i+w/2,b.j+h/2,[b.i,b.j,w,h]))return;const q=this.put(b,u.carry.k,u.carry.n);u.carry.n-=q;if(u.carry.n<.01)u.carry=null;if(u.task?.kind==='deposit'&&!u.carry)u.task=null;}
  lineTick(u,T0,dt){const N=this.N;const kind=T0.line;const store=this.lineStore(kind);
    if(T0.k==null||!store[T0.k]||store[T0.k].b){let best=null,bd=14;for(const kk of Object.keys(store)){const o=store[kk];if(o.b||(kind!=='rail'&&o.f!==u.f)||((kind==='sacs'||kind==='fosses')&&(o.t||'sacs')!==kind))continue;const i=kk%N,j=(kk/N)|0;const d=d2(i,j,T0.x,T0.y)*.3+d2(i,j,u.x,u.y);if(d<bd){bd=d;best=+kk;}}
      // plus rien à poser : ce qui reste du sac (le plus gros) est rapporté au dépôt, à pied
      if(best==null){const L=Object.entries(T0.pack||{}).filter(([r,q])=>q>.05).sort((a,z)=>z[1]-a[1])[0];if(L&&!u.carry)u.carry={k:L[0],n:L[1]};u.task=null;return;}T0.k=best;T0.x=best%N;T0.y=(best/N)|0;u.path=null;}
    const k=T0.k,i=k%N,j=(k/N)|0;const o=store[k];const cost=LINES[kind].cost;
    // Loin de tout dépôt, l'ouvrier va chercher de quoi poser plusieurs cases (ce qu'il porte : dix unités) au dépôt le plus proche
    // qui en a, et revient poser : plus rien n'est prélevé à distance sur le pays (de vrais convois, qu'on peut intercepter).
    if(T0.fetchD!=null){const D=this.building(T0.fetchD);if(!D||D.ruin||!D.done){T0.fetchD=null;u.path=null;}else{const [w,h]=this.sizeOf(D);if(!this.go(u,D.i+w/2,D.j+h/2,[D.i,D.j,w,h]))return;
        // une charrette : trois fois ce qu'on porte à dos (une vingtaine de cases de voie par voyage)
        const n=Math.max(1,Math.floor(CARRY*3/Object.values(cost).reduce((a,b)=>a+b,0)));const P=T0.pack??={};for(const [r,q] of Object.entries(cost)){const t=Math.min(q*n,D.stock[r]||0);if(t>0){D.stock[r]-=t;P[r]=(P[r]||0)+t;}}
        T0.fetchD=null;u.path=null;u.why=null;return;}}
    if(!o.paid){const P=T0.pack;const inPack=P&&Object.entries(cost).every(([r,q])=>(P[r]||0)>=q-1e-9);
      if(!inPack&&!this.canPay(u.f,i,j,cost).ok){const D=this.depots(u.f,u.x,u.y,120).find(d=>!BUILDINGS[d.k].foodOnly&&Object.entries(cost).every(([r,q])=>(d.stock[r]||0)>=q));
        if(D){T0.fetchD=D.id;u.path=null;u.why=`va chercher ${Object.keys(cost).map(r=>this.goodName(r).toLowerCase()).join(' et ')} au ${this.depotName(D)}`;return;}
        u.anim='idle';u.why=`il manque ${this.canPay(u.f,i,j,cost).miss.join(' et ')} : aucun dépôt à moins de 120 cases n’en a`;return;}}
    if(!this.go(u,i+.5,j+.5,[i,j,1,1]))return;
    if(!o.paid){const P=T0.pack;if(P&&Object.entries(cost).every(([r,q])=>(P[r]||0)>=q-1e-9)){for(const [r,q] of Object.entries(cost))P[r]-=q;}else if(!this.pay(u.f,i,j,cost)){u.anim='idle';u.why=`il manque ${this.canPay(u.f,i,j,cost).miss.join(' et ')} à moins de ${RADIUS} cases`;return;}o.paid=1;u.why=null;}
    u.anim='action';this.face(u,i+.5-u.x,j+.5-u.y);o.p+=dt/LINES[kind].hours;if(o.p>=1){this.lineBuilt(kind,k);T0.k=null;}}

  // ---------- les escouades : le moral ----------
  squadTick(){if(!this.s.squads.length)return;for(const sq of this.s.squads){this.assignCrews(sq);const ms=this.members(sq);if(!ms.length)continue;const up=ms.filter(active);
      // la formation ou l'écart ont changé (panneau de l'escouade) : on se replace tout de suite, sans attendre un ordre de marche
      {const fk=`${sq.form||'ligne'}|${sq.spacing??1}`;if(sq.fk==null)sq.fk=fk;else if(sq.fk!==fk){sq.fk=fk;this.reform(sq);}}
      // la marche en formation : tous au pas du plus lent ; celui qui a pris de l'avance sur le rang ralentit
      {const mv=up.filter(u=>u.task?.fm&&(u.task.kind==='assault'||u.task.kind==='move'||u.task.kind==='guard')&&Math.hypot(u.task.tx-u.x,u.task.ty-u.y)>.4);let pace=Infinity;const rem=mv.map(u=>Math.hypot(u.task.tx-u.x,u.task.ty-u.y));const mx=rem.length?Math.max(...rem):0;
        for(const u of up)u.fmLag=0;if(mv.length>1)mv.forEach((u,q)=>{if(u.anim!=='aim')pace=Math.min(pace,this.speedOf(u,true));u.fmLag=Math.max(0,mx-rem[q]-1.2);});sq.pace=mv.length>1&&pace<Infinity?pace:0;}
      const supp=up.reduce((a,u)=>a+(u.supp||0),0)/Math.max(1,up.length);const lost=1-up.length/Math.max(sq.peak||ms.length,1);sq.peak=Math.max(sq.peak||0,ms.length);
      const target=clamp(1-lost*1.6-supp*.75,0,1);sq.morale+=(target-sq.morale)*Math.min(1,this.dts/8);
      if(!this.unit(sq.leader)||!active(this.unit(sq.leader))){const nl=up.sort((a,b)=>(b.xp||0)-(a.xp||0))[0];if(nl&&nl.id!==sq.leader){sq.leader=nl.id;sq.morale-=.15;}}
      // le repli : sous 25 % de moral, l'escouade décroche vers le dépôt le plus proche
      if(sq.morale<.32&&!sq.broken){sq.broken=true;const L=this.unit(sq.leader)||up[0];const dep=L&&this.s.buildings.filter(b=>b.f===sq.f&&b.done&&!b.ruin).sort((a,z)=>this.distB(a,L.x,L.y)-this.distB(z,L.x,L.y))[0];
        for(const u of up.slice(0,2))this.throwSmoke(u);
        const down=ms.filter(u=>u.h?.state==='hors'&&!u.carriedBy);const bearers=up.filter(u=>!UNITS[u.k].medic).slice(0,down.length);
        down.slice(0,bearers.length).forEach((v,n)=>{bearers[n].task={kind:'evac',id:v.id};bearers[n].path=null;});
        if(dep){for(const u of up){if(u.task?.kind==='evac')continue;u.task={kind:'move',tx:dep.i+1+(this.rand()-.5)*2,ty:dep.j+BUILDINGS[dep.k].size[1]+1};u.path=null;}this.log('Armée',`${sq.name} décroche : trop de pertes.`,'bad');this.emit({type:'rout',x:L.x,y:L.y});}}
      else if(sq.morale>.5)sq.broken=false;}}

  // ---------- les bâtiments ----------
  buildingTick(b,dt){const B=BUILDINGS[b.k];b.working=false;
    if(b.k==='centre'&&b.done&&!b.ruin){this.rationTick(b,dt);
      // Croissance automatique. Meumeu : seule la nourriture décide (25 vivres + une réserve de rations : un jour si un moulin
      // produit dans la ville, trois jours sinon, pour ne pas manger le stock de départ avant le premier moulin) — plus de plafond
      // de places, plus rien à cliquer ; on regarde tous les quarts d'heure et la naissance prend la moitié du temps.
      // Bèè : inchangé (plafond de places, réserve de 12 h, contrôle toutes les heures).
      if(b.grow!==false){const bee=b.f==='beee';b.growT=(b.growT||0)-dt*((b.ration??1)>=.5?1:.3);if(b.growT<=0){b.growT=bee?1:.25;if(!b.queue.length){const food=b.stock.vivres||0,rate=this.cityFoodRate(b);const ok=bee?this.cityStats(b).res<this.cityStats(b).cap&&food>=25+rate*12:food>=25+rate*(this.s.buildings.some(x=>x.k==='moulin'&&x.f===b.f&&x.done&&!x.ruin&&this.cityOf(x)===b)?24:72);if(ok&&this.canTrain(b,'villageois').ok){this.train(b,'villageois');const q=b.queue[b.queue.length-1];q.left/=2;}}}}}
    if(b.hide?.length&&(b.ruin||!this.s.units.some(e=>e.f!==b.f&&alive(e)&&this.distB(b,e.x,e.y)<13))){b.hideT=(b.hideT||0)+dt;if(b.hideT>.5||b.ruin){this.unhide(b);}}else b.hideT=0;
    if(b.inside?.length)this.drillTick(b,dt);
    if(b.stock&&(b.cleanT=(b.cleanT||0)+dt)>=1){b.cleanT=0;for(const k in b.stock){const v=b.stock[k];if(!(v>1e-6))delete b.stock[k];}}
    if(b.fire>0&&b.stock&&this.rand()<dt*this.volatile(b)/60&&this.depotBlow(b,null))return;
    if(b.fire>0){b.fire-=dt;b.hp-=FIRE.dps*dt;if(b.hp<=0&&!b.ruin)this.collapse(b);}
    // les blessés soignés ici
    if(b.wardList?.length&&b.done){
      if(B.tent){// sous la tente : le corps continue (on y saigne encore, on peut y mourir) ; opéré et debout, il repart
        for(const u of [...b.wardList]){const ch=tickHealth(u.h,this.dts);if(u.h.state==='mort'){b.wardList.splice(b.wardList.indexOf(u),1);u.hp=0;this.s.corpses.push({x:b.i+1,y:b.j+2.2,f:u.f,k:u.k,t:this.s.t,dir:'se',sheet:UDEF(u).sheet,bl:1,wounds:[]});
            this.log(this.cityName(b),`${u.name||'Un blessé'} est mort sous la tente (${u.h.cause}).`,'bad');this.emit({type:'death',x:b.i+1,y:b.j+1,f:u.f,k:u.k,id:u.id});continue;}
          if(!needsSurgery(u.h)&&u.h.state!=='hors'){b.wardList.splice(b.wardList.indexOf(u),1);const [w,h]=this.sizeOf(b);u.x=b.i+w/2;u.y=b.j+h+.5;this.s.units.push(u);this.uIndex.set(u.id,u);u.task=null;
            const hosp=this.hospitalFor(u);if(u.h.state==='blesse'&&hosp&&(u.h.legs||u.h.arms||u.h.gut||u.h.lost.length)){u.task={kind:'hosp',b:hosp.id};}
            (u.h.log??=[]).push({t:this.s.t,what:'sort de la tente'+(u.task?' : il part vers l’hôpital':' : il reprend son poste'),by:''});}}}
      else{const rate=B.ward>4?1:.4;for(const u of [...b.wardList]){if(heal(u.h,dt*rate)){b.wardList.splice(b.wardList.indexOf(u),1);this.discharge(b,u);}}}}
    if(!b.done)return;
    // le laboratoire : l'innovation avance
    if(b.dev){b.dev.left-=dt;b.working=true;if(b.dev.left<=0){const I=INNOV.find(x=>x.id===b.dev.id);this.s.innov.done.push(b.dev.id);b.dev=null;this.remod();this.log(this.cityName(b),`Innovation : ${I.name}. ${I.text}`,'good');this.emit({type:'innov',id:I.id});}}
    if(b.protoA){b.protoA.left-=dt;b.working=true;if(b.protoA.left<=0){const a=this.s.armors[b.protoA.id];if(a){a.status='adopte';this.log(this.cityName(b),`Protection adoptée : ${a.name}. La manufacture peut la fabriquer.`,'good');this.emit({type:'design',id:a.id});}b.protoA=null;}}
    // le bureau d'études : le prototype avance
    if(b.proto){b.proto.left-=dt;b.working=true;if(b.proto.left<=0){const d=this.design(b.proto.id);if(d){d.status='adopte';this.log(this.cityName(b),`Prototype réussi : ${d.name} est adopté. La manufacture et l’arsenal peuvent le fabriquer.`,'good');this.emit({type:'design',id:d.id});}b.proto=null;}}
    const q=b.queue[0];if(q){q.left-=dt;if(q.left<=0){if(q.draftId!=null){let draft=this.unit(q.draftId);if(!draft||draft.k!=='villageois'||!alive(draft)){draft=this.draftCandidate(b,q);if(!draft){q.left=1;b.why='attend un civil mobilisable';return;}q.draftId=draft.id;}this.s.units.splice(this.s.units.indexOf(draft),1);this.uIndex.delete(draft.id);}b.queue.shift();const [w,h]=this.sizeOf(b);
      if(UNITS[q.k]||(b.f==='beee'&&BEEE.units[q.k])){const u=this.addUnit(b.f,q.k,b.i+w/2+(this.rand()-.5)*w,b.j+h+.7,{w:q.w,rounds:0,armor:q.armor});if(q.role==='munitions')this.setRole(u,'munitions');const centre=this.cityOf(b)||this.centreOf(b);u.home=centre?.id??null;if(UNITS[q.k]?.arm&&(b.k==='caserne'||b.k==='caserne_elite'))u.homeBarracks=b.id;this.resupply(u,!!u.homeBarracks);
        const enemyCity=b.f==='beee'&&centre&&this.s.beee.cities.find(c=>c.centre===centre.id);if(enemyCity){u.city=enemyCity.id;if(u.k!=='villageois'){const a=this.rand()*Math.PI*2,r=5+this.rand()*3;u.task={kind:'guard',tx:enemyCity.x+Math.cos(a)*r,ty:enemyCity.y+Math.sin(a)*r};}}
        else if(b.rally)u.task={kind:u.k==='villageois'?'move':'guard',tx:b.rally[0],ty:b.rally[1]};this.emit({type:'trained',x:u.x,y:u.y,k:q.k,f:b.f});}
      else if(VEHDEF[q.k]){const v=VEHDEF[q.k].nav==='eau'?this.vehFromCale(b,q.k):this.vehFromGarage(b,q.k);if(!v){b.queue.unshift({...q,left:.5});b.why='la sortie est encombrée';return;}this.log(this.cityName(b),VEHDEF[q.k].nav==='eau'?`${v.name} est à l’eau.`:`${v.name} sort du garage.`,'good');this.emit({type:'trained',x:v.x,y:v.y,k:q.k,f:b.f});}
      else{const v=this.addVehicle(b.f,q.k,b);this.log(this.cityName(b),`${VEHICLES[q.k].name} « ${v.name} » prêt.`,'good');this.emit({type:'trained',x:v.x,y:v.y,k:q.k,f:b.f});}}}
    const here=B.workers?this.workers(b).filter(u=>u.at):[];if(!here.length)return;const n=here.length;
    // les fermes et les mines livrent à leur dépôt de sortie (le plus proche, ou celui que le joueur a choisi)
    if(B.makes||b.k==='mine'){this.autoLink(b);let dep=this.building(b.out);if(!dep){b.why=`aucun dépôt à moins de ${RADIUS} cases`;return;}
      // une ferme, un moulin rattachés d'office : le centre-ville plein, on livre au grenier (ou à un autre dépôt) plutôt que de laisser pourrir
      if(this.room(dep)<1&&b.auto_out&&B.soil){const alt=this.reach(b).find(d=>d.id!==dep.id&&this.room(d)>=5&&!BUILDINGS[d.k].hub);if(alt){b.out=alt.id;dep=alt;}}
      if(this.room(dep)<1){b.why=`le dépôt de sortie est plein (${this.depotName(dep)})`;return;}
      // un plafond : le champ s'arrête quand son dépôt de sortie a assez de grain (le moulin n'en moud pas plus vite)
      const lim=b.limit??B.limit??0;if(B.makes&&lim>0&&Object.keys(B.makes).every(k=>(dep.stock[k]||0)>=lim)){b.why=`plafond atteint : ${lim} au dépôt de sortie`;b.working=false;return;}
      if(B.makes){b.why=null;const y=(B.soil?this.cropYield(b):1)*(b.f==='beee'&&B.soil?1.25:1)*(b.f==='meumeu'&&B.soil?MEUMEU_MILL:1);b.yield=y;
        // le moulin : ses ouvriers récoltent le blé des huit champs et le moulent aussitôt en vivres (b.ble : le blé récolté, b.madeV : les vivres faits)
        for(const [k,v] of Object.entries(B.makes)){const q=v*n*dt*this.mod('ferme')*y;this.put(dep,k,q);if(k==='vivres'){b.madeV=(b.madeV||0)+q;if(B.ble)b.ble=(b.ble||0)+q*B.ble;}}
        b.rateV=(B.makes.vivres||0)*n*this.mod('ferme')*y;this.practice('vivres',dt*n*.5);b.working=true;return;}
      const nd=this.s.nodes[b.ore];if(!nd||nd.left<=0){b.why='filon épuisé';return;}if(b.sabUntil>this.t||nd.sabUntil>this.t){b.why='accès saboté : remise en état';return;}b.why=null;
      const got=Math.min(nd.left,B.rate*n*dt*this.mod('mine'));nd.left-=got;this.put(dep,nd.res,got);this.practice('mine',dt*n);b.working=true;return;}
    // les usines : une production, un dépôt d'approvisionnement, un dépôt de sortie, du charbon (eco.js)
    if(B.factory)this.factoryTick(b,n,dt);
    if(B.pen&&b.animals>0)this.penTick(b,dt,n);}
  // Encaisser (bâtiments, murs, canons) : les points partent, le feu prend, à zéro ça s'effondre.
  damage(e,dmg,by){if(e.wall!=null){const w=this.s.walls[e.wall];if(!w)return;w.hp-=dmg;if(w.hp<=0){this.lineBroken('mur',e.wall);this.emit({type:'collapse',x:e.x,y:e.y,small:true});}return;}
    if(e.k&&BUILDINGS[e.k]&&e.i!=null){if(e.ruin)return;if(e.stock&&this.depotCook(e,dmg,by))return;e.hp-=dmg;e.hitAt=this.s.t;if(e.hp<e.max*.5&&e.fire<=0&&this.rand()<.35){e.fire=FIRE.hours;this.emit({type:'fire',x:e.i+1,y:e.j+1});}if(e.hp<=0)this.collapse(e);
      if(e.f==='beee')this.beeeAlarm(e,by);return;}
    // un canon (une machine) : il perd des points
    if(e.hp!=null&&!e.h){e.hp-=dmg;e.hitAt=this.s.t;if(e.hp<=0){e.hp=0;this.death(e);}}}
  shelter(u){const b=this.s.buildings.filter(b=>b.f===u.f&&b.done&&BUILDINGS[b.k].shelter&&(b.hide||[]).length<BUILDINGS[b.k].shelter&&this.distB(b,u.x,u.y)<25).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0];
    if(b){u.task={kind:'shelter',b:b.id};u.path=null;u.carry=null;}return !!b;}
  shelterAll(){let n=0;for(const u of [...this.s.units])if(u.f==='meumeu'&&u.k==='villageois'&&active(u)&&this.shelter(u))n++;return n;}
  nearCity(u){const c=this.s.buildings.filter(b=>b.k==='centre'&&b.f===u.f).sort((a,z)=>d2(a.i,a.j,u.x,u.y)-d2(z.i,z.j,u.x,u.y))[0];return c&&d2(c.i,c.j,u.x,u.y)<30?c.city:'Campagne';}
  unhide(b){const [w,h]=this.sizeOf(b);for(const u of b.hide){u.x=b.i+this.rand()*w;u.y=b.j+h+.5;u.task=null;u.path=null;this.s.units.push(u);this.uIndex.set(u.id,u);}b.hide=[];b.hideT=0;}
  collapse(b){const B=BUILDINGS[b.k];const [w,h]=this.sizeOf(b);if(b.hide?.length)this.unhide(b);b.ruin=true;b.done=false;b.progress=.2;b.hp=b.max*.2;b.fire=Math.max(b.fire,2);b.queue=[];b.batch=null;b.paid={...B.cost};
    for(const v of this.s.vehicles)if(v.job&&(v.job.to===b.id||v.job.from===b.id)&&v.job.phase==='src')v.job=null;
    if(b.stock){for(const k of Object.keys(b.stock)){b.stock[k]-=b.stock[k]*.7;}}
    // les blessés de l'hôpital, les passagers : ceux qui étaient dedans
    if(b.wardList?.length){for(const u of b.wardList)u.hp=0;b.wardList=[];this.log(this.cityName(b),`${B.name} s’est effondré sur ses blessés.`,'bad');}
    if(b.pass){for(const u of b.pass)u.hp=0;b.pass=[];}
    for(const u of this.s.units)if(u.task?.b===b.id&&u.task.kind==='work')u.task=null;
    if(b.proto){const d=this.design(b.proto.id);if(d)d.status='perdu';b.proto=null;}
    // une protection en étude est perdue avec son bureau, comme une arme (avant, elle restait « prototype » pour toujours)
    if(b.protoA){const a=this.s.armors[b.protoA.id];if(a)a.status='perdu';b.protoA=null;}
    // la manufacture tombe : l'outillage est perdu ; les plans aussi, sauf s'ils sont aux archives d'une autre ville
    // une manufacture tombe : son outillage est perdu. Les plans survivent tant qu'une autre manufacture tient, ou des archives loin de celle-ci.
    if(b.k==='manufacture'){b.tooled={};const other=this.s.buildings.some(m=>m!==b&&m.f===b.f&&m.k==='manufacture'&&m.done&&!m.ruin);const arch=this.s.buildings.some(a=>a.f===b.f&&a.k==='archives'&&a.done&&d2(a.i,a.j,b.i,b.j)>=20);
      const lost=this.designsOf(b.f).filter(d=>!d.base);if(!arch&&!other)for(const d of lost)d.status='perdu';
      this.log(this.cityName(b),other||arch?`Une manufacture d’armes est détruite : son outillage est perdu, les plans sont sauvés${other?' (une autre manufacture les a)':' par les archives'}.`:`La dernière manufacture d’armes est détruite : outillage et plans perdus${lost.length?` (${lost.map(d=>d.name).join(', ')})`:''}.`,'bad');}
    this.log(this.cityName(b),`${B.name} ${b.f==='beee'?'bèè ':''}détruit${b.k==='centre'?' : la ville tombe !':'.'}`,b.f==='beee'?'good':'bad');
    this.emit({type:'collapse',x:b.i+w/2,y:b.j+h/2,k:b.k,f:b.f,big:w*h>=6});
    if(b.f==='meumeu'){const H={centre:6,manufacture:4,arsenal:4,gare:3,mine:3,fonderie:3,poudrerie:3,atelier:2,caserne:2,entrepot:2,hopital:2}[b.k]||1;this.s.beee.hurt=(this.s.beee.hurt||0)+H;}
    if(b.k==='centre'&&b.f==='beee'){const c=this.s.beee.cities.find(c=>c.centre===b.id);if(c){c.fallen=true;this.s.beee.lostFront={x:c.x,y:c.y,name:c.name,attempts:0,failed:0,next:this.s.t+2};this.log(c.name,`${c.name} est tombée. Les villes voisines préparent une réponse.`,'good');this.s.beee.anger+=2;}}
    if(b.k==='centre'&&b.f==='meumeu')this.s.beee.anger=Math.max(0,this.s.beee.anger-1);}

  // ---------- ce qui vole ----------
  shotsTick(dt){const s=this.s;for(const sh of s.shots){sh.t+=dt;if(sh.t<sh.dur)continue;sh.done=true;
      if(sh.kind==='flak'){const v=s.vehicles.find(x=>x.id===sh.v);const hit=v&&v.alt>0&&d2(v.x,v.y,sh.x1,sh.y1)<FLAK.hit;if(hit){v.hp-=FLAK.dmg;v.hitAt=s.t;if(v.hp<=0)this.shootDown(v);}this.emit({type:'flak',x:sh.x1,y:sh.y1,h:sh.h,hit});continue;}
      if(sh.kind==='round'){this.landRound(sh);continue;}
      if(sh.kind==='hunt-round'){this.landHuntRound(sh);continue;}
      if(sh.kind==='grenade'){this.blast(sh.x1,sh.y1,'grenade',sh.f,sh.by,1);continue;}
      if(sh.kind==='smokeg'){this.s.smokes.push({x:sh.x1,y:sh.y1,r:1.7,t0:this.s.t,end:this.s.t+8});this.emit({type:'smoke',x:sh.x1,y:sh.y1});continue;}
      if(sh.kind==='shell'){this.blast(sh.x1,sh.y1,'obus',sh.f,sh.by,sh.vsB||1);continue;}
      if(sh.kind==='hshell'){const W=this.W(sh.w);if(W.he)this.heBlast(sh.x1,sh.y1,W.he,sh.f,sh.by,{w:sh.w});continue;}}
    s.shots=s.shots.filter(x=>!x.done);}
  // Une balle arrive : la blessure calculée au départ s'applique (si la cible est encore là) ; sinon, elle fait lever la poussière
  // et coucher ceux qui l'entendent passer.
  // une balle explosive éclate où elle arrive : sur la plaque (au contact de celui qui la porte), dans le corps (les autres
  // autour reçoivent souffle et éclats), au sol ou contre un mur si elle manque
  landRound(sh){this.landRound0(sh);const W=this.W(sh.w);if(!W.he||W.he.shaped)return;const r=sh.res,e=sh.target.u!=null?this.unit(sh.target.u):null;
    if(r.stopped&&e&&alive(e))this.heBlast(e.x,e.y,W.he,sh.f,sh.by,{at:{id:e.id,r:.06},w:sh.w});
    else if(r.hit&&e)this.heBlast(sh.x1,sh.y1,W.he,sh.f,sh.by,{skip:e.id,w:sh.w});else this.heBlast(sh.x1,sh.y1,W.he,sh.f,sh.by,{w:sh.w});}
  landRound0(sh){const r=sh.res,tg=sh.target;const W=this.W(sh.w);const shooter=this.unit(sh.by);
    if(tg.v!=null){const v=this.s.vehicles.find(o=>o.id===tg.v);if(v&&r.hit&&v.hp>0){this.vehImpact(v,r,W,sh);return;}this.emit({type:'impact',x:sh.x1,y:sh.y1,hit:false,small:true,mat:r.cover||'terre'});return;}
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
  // Une explosion des anciennes tables (grenade, obus de canon, bombe) : on la traduit en charge, et c'est la même physique.
  // boom : l'effet et le bruit à montrer (d'office selon la table : une charge de démolition se montre comme un obus)
  blast(x,y,kind,f,by,vsB=1,boom=null){const S=BLASTS[kind];const b=S.blast*TILE_M;
    const E=S._E??=({vg:S.v,cls:[{m:S.mass,n:S.frags,d:S.d,lam:S.lambda}],geo:.6,air:false,blast:b,inj:b*1.45,conc:b*2.05,stun:b*3.2,radius:S.radius*TILE_M,dmgB:S.dmgB,W:kind==='bombe'?.1:kind==='obus'?.01:.001});
    this.heBlast(x,y,E,f,by,{kind,vsB,rB:S.radius*.6,boom:boom||(kind==='bombe'?'bomb':kind==='obus'?'shell':'grenade')});}
  poisson(l){if(l<=0)return 0;let k=0,L=Math.exp(-Math.min(l,30)),p=1;do{k++;p*=this.rand();}while(p>L&&k<10);return k-1;}
  // Une charge qui éclate en (x, y) — E : la charge calculée (explosive.js), distances en mètres. Dans l'ordre :
  //  le souffle (mortel ; lésions internes ; commotion : assommé ; sonné : ne tire plus quelques secondes, sourd) ;
  //  les éclats, classe par classe : combien touchent (selon la distance, la posture, le couvert, la fusée), chacun sa vraie blessure ;
  //  les bâtiments, murs et voies. o.at : une victime au contact (la balle explosive qui l'a frappée) ; o.skip : une victime déjà blessée.
  heBlast(x,y,E,f,by,o={}){const s=this.s,N=this.N;const kind=o.kind||'obus';
    // Equilibrage de jeu : même fiche de charge, souffle plus dangereux et infrastructures plus vulnérables.
    E={...E,blast:E.blast*1.45,inj:E.inj*1.35,conc:E.conc*1.2,stun:E.stun*1.15,dmgB:E.dmgB*3.4,radius:(E.radius||0)*1.2};if(o.rB!=null)o={...o,rB:o.rB*1.25};
    const fd=new Map();const Df=c=>{let d=fd.get(c);if(!d){d=fragDesign(c.m,c.d);fd.set(c,d);}return d;};
    const shooter=by!=null?this.unit(by):null;const fragReach=Math.min(250,Math.max(0,...(E.cls||[]).map(c=>c.lam*Math.log(Math.max(1,E.vg)/55))));const Rmax=Math.max(E.radius||0,E.stun*1.5,fragReach)+.1;if(shooter?.f==='meumeu'&&f==='meumeu')this.beeeShelled(x,y,shooter,E);const note=(u,what)=>(u.h.log??=[]).push({t:s.t,what,by:shooter?.name||''});
    for(const u of [...s.units]){if(!alive(u)||u.id===o.skip)continue;let r=Math.max(.05,d2(u.x,u.y,x,y)*TILE_M);if(E.air)r=Math.hypot(r,.6);if(o.at?.id===u.id)r=o.at.r;if(this.s.sacs[Math.floor(u.y)*N+Math.floor(u.x)]?.b)r*=1.9;if(r>Math.max(Rmax,E.fire||0))continue;
      if(!u.h){this.damage(u,E.dmgB*Math.max(0,1-r/Rmax)*.6,f);continue;}
      u.supp=Math.min(1.5,(u.supp||0)+.9*Math.max(0,1-r/(E.stun*1.5+.5)));if(u.f==='beee')this.beeeAlarm(u);
      if(r<E.blast){u.h.state='mort';u.h.cause='souffle de l’explosion';note(u,'tué net par le souffle');this.death(u);continue;}
      if(r<E.inj){u.h.shock=Math.max(u.h.shock,30+this.rand()*60);u.h.bleeds.push({name:'poumons (souffle)',rate:.02+this.rand()*.05,limb:null,internal:true});if(u.h.state!=='hors'){u.h.state='hors';u.h.cause='souffle : poumons et tympans déchirés';this.stateChange(u,'hors');}note(u,'soufflé : lésions internes');}
      else if(r<E.conc){const p=.3+.6*(1-(r-E.inj)/Math.max(.01,E.conc-E.inj));if(this.rand()<p){u.h.conc=Math.max(u.h.conc,20+this.rand()*70);if(u.h.state!=='hors'){u.h.state='hors';u.h.cause='commotion (souffle)';this.stateChange(u,'hors');}note(u,'assommé par le souffle');}
        else{u.stun=Math.max(u.stun||0,8+this.rand()*10);u.deaf=Math.max(u.deaf||0,s.t+6);note(u,'sonné par le souffle');}}
      else if(r<E.stun){u.stun=Math.max(u.stun||0,(3+this.rand()*8)*(1.3-(r-E.conc)/Math.max(.01,E.stun-E.conc)));u.deaf=Math.max(u.deaf||0,s.t+2);}
      // La surpression a une valeur propre (kPa), distincte des éclats. Au-dessus d'environ 12 kPa une peluche de 30 cm
      // est renversée ; plus près, elle est réellement projetée dans l'axe du souffle, sauf si un obstacle l'arrête.
      const pk=E.pressure?.(r)||0;if(pk>12&&alive(u)){u.post='couche';u.stun=Math.max(u.stun||0,Math.min(18,1+pk/22));const dx=u.x-x,dy=u.y-y,L=Math.hypot(dx,dy)||1,kick=Math.min(.9,Math.max(.08,(pk-12)/150));const nx=clamp(u.x+dx/L*kick,.1,N-.1),ny=clamp(u.y+dy/L*kick,.1,N-.1),kk=Math.floor(ny)*N+Math.floor(nx);if(TERRAIN[this.G.terrain[kk]]?.walk&&this.occ[kk]<0){u.x=nx;u.y=ny;}note(u,`projeté par le souffle (${Math.round(pk)} kPa)`);this.emit({type:'blowdown',x:u.x,y:u.y,pressure:pk,id:u.id});}
      if(E.inc&&r<(E.fire||0)&&alive(u)){const sev=Math.max(0,1-r/Math.max(.01,E.fire));const out=applyBurn(u.h,sev,this.rand,true);if(out){this.emit({type:'burn',x:u.x,y:u.y,victim:u.id,out});if(out.now==='mort')this.death(u);else if(out.now==='hors')this.stateChange(u,'hors');}}
      // les éclats
      const post=u.post||'debout';const air=!!E.air;let A=EXPO[air?'air':'sol'][post];
      if(!air&&o.at?.id!==u.id){const cov=this.coverFor(u,x,y);if(cov&&cov.h>.1)A*=.3;}
      const tx=x-u.x,ty=y-u.y,tl=Math.hypot(tx,ty)||1;const fx=u.fx??1,fy=u.fy??0;const alpha=Math.atan2(fx*ty/tl-fy*tx/tl,fx*tx/tl+fy*ty/tl);const [sw,sh]=SILH[post];
      for(const c of E.cls){if(!alive(u))break;const v=E.vg*Math.exp(-r/c.lam);if(v<40)continue;const k=Math.min(8,this.poisson(c.n*E.geo*A/(4*Math.PI*r*r)));
        for(let n=0;n<k&&alive(u);n++){let hit=null;for(let t=0;t<5&&!hit;t++)hit=air?this.bodyRay([(this.rand()-.5)*sw*1.3,BODY_H+.25,(this.rand()-.5)*.14],[(this.rand()-.5)*.3,-1,(this.rand()-.5)*.5],alpha,post,u.f):this.bodyRay([(this.rand()-.5)*sw*1.6,this.rand()*sh,2],[0,.05*(this.rand()-.5),-1],alpha,post,u.f);if(!hit)continue;
          const Ar=u.armor&&this.armorOf(u.armor);let vv=v;if(Ar){const zone=plateZone(hit.p);if(zone&&Ar.D.zones[zone]?.t>0){const pen=5.5e-4*Math.pow(c.m,.7)*Math.pow(v,1.43)/Math.pow(c.d,1.07);const rr=armorHit(Ar.D,zone,u,Df(c),v,pen,this.rand);
            if(rr?.stopped){this.emit({type:'plate',x:u.x,y:u.y,mat:rr.mat,zone,victim:u.id});continue;}if(rr)vv=rr.v;}}
          setSpecies(u.f);const rec=wound(Df(c),vv,hit.p,hit.d,this.rand,this.rand()*1.5);const out=applyWound(u.h,rec,this.rand,'éclat');u.hitAt=s.t;
          this.emit({type:'wound',cause:u.h.cause,len:c.d/1000,victim:u.id,shooter:by,vf:u.f,vk:u.k,w:o.w||null,frag:kind,rec,out,R:r,v,x:u.x,y:u.y,dir:[u.x-x,u.y-y],name:u.name,sname:shooter?.name||null,armor:u.armor?this.armorOf(u.armor)?.D.a||null:null});
          if(out?.now==='mort'){this.death(u);break;}if(out?.now==='hors')this.stateChange(u,'hors');if(shooter)shooter.xp=(shooter.xp||0)+(out?.now?2:.5);}}}
    // les engins (voir vehBlast)
    for(const v of [...(this.cvs||[])])if(v.hp>0)this.vehBlast(v,x,y,E,by,Df,Rmax);
    // les bâtiments, les murs, les voies (la fusée à retard enferme le souffle : bien plus de dégâts)
    const vsB=o.vsB||1;const rB=o.rB??Math.max(.3,E.blast*2.5/TILE_M),fireR=(E.fire||0)/TILE_M;for(const b of s.buildings){const d=this.distB(b,x,y);if(d<rB){const impact=E.dmgB*vsB*(1-d/rB*.45);this.damage(b,impact,f);if(!b.ruin&&b.fire<=0&&impact>Math.max(12,b.max*.12)&&(d<rB*.35||this.rand()<Math.min(.7,impact/Math.max(1,b.max)*.55))){b.fire=FIRE.hours*(.45+.4*(1-d/rB));this.emit({type:'fire',x:b.i+1,y:b.j+1});}}if(E.inc&&d<fireR&&!b.ruin){b.fire=Math.max(b.fire||0,FIRE.hours*(1-d/Math.max(.1,fireR)*.5));this.emit({type:'fire',x:b.i+1,y:b.j+1});}}
    for(let j=Math.floor(y-rB);j<=y+rB;j++)for(let i=Math.floor(x-rB);i<=x+rB;i++){if(i<0||j<0||i>=N||j>=N||d2(i+.5,j+.5,x,y)>rB)continue;const k=j*N+i;
      if(this.wall[k]===2||this.wall[k]===-2)this.damage({wall:k,x:i+.5,y:j+.5},E.dmgB*vsB*.6,f);
      if(this.rail[k]===2){const rr=s.rails[k];rr.hp-=E.dmgB*vsB*.5;if(rr.hp<=0){this.lineBroken('rail',k);this.emit({type:'rail-cut',x:i+.5,y:j+.5});}}
      const tr=s.sacs[k];if(tr?.b){tr.hp=(tr.hp||LINES.sacs.hp)-E.dmgB*vsB*(.35+.25*Math.max(0,1-d2(i+.5,j+.5,x,y)/Math.max(.1,rB)));if(tr.hp<=0){this.lineBroken('sacs',k);this.emit({type:'trench-cut',x:i+.5,y:j+.5});}}
      const nd=this.nodeAt[k];if(nd>=0&&s.nodes[nd].type==='tree'&&(kind==='bombe'||kind==='obus')&&this.rand()<(kind==='bombe'?.62:.22)*Math.max(.15,1-d2(i+.5,j+.5,x,y)/Math.max(.1,rB))){s.nodes[nd].left=0;this.nodeAt[k]=-1;this.emit({type:'felled',x:i+.5,y:j+.5});}}
    const boom=o.boom||(E.W>.03?'bomb':E.W>.0015?'shell':E.W>.0002?'grenade':'pop');
    if(!E.air&&boom!=='pop')this.addCrater(x,y,boom==='bomb'?Math.max(1.4,rB*.9):boom==='shell'?Math.max(.6,rB*.6):Math.max(.32,rB*.3),boom==='bomb'?2.1:boom==='shell'?1.5:.65);
    {const S0=boom==='bomb'?[Math.max(1.8,rB*.9),70]:boom==='shell'?[Math.max(1,rB*.6),42]:boom==='grenade'?[.7,12]:[.45,5];this.scorch(x,y,S0[0],S0[1]*(E.air?.3:1));if(E.inc)this.scorch(x,y,Math.max(.6,fireR||.6),22);}
    if(E.fill?.smoke){s.smokes.push({x,y,r:Math.min(5,Math.max(2.4,1.6*Math.cbrt(Math.max(1,E.g)/30))),t0:s.t,end:s.t+10});this.emit({type:'smoke',x,y});}   // le phosphore : un nuage qui aveugle
    if(E.inc&&!E.air){const nap=this.mod('napalm');s.groundFires.push({x,y,r:Math.max(.35,fireR)*(1+.35*(nap-1)),end:s.t+FIRE.hours*nap,chemical:true});if(s.groundFires.length>80)s.groundFires.splice(0,s.groundFires.length-80);this.emit({type:'fire-area',x,y,r:fireR});}
    this.emit({type:'boom',src:f,x,y,kind:boom,big:boom!=='grenade',air:!!E.air,r:Math.max(E.danger||0,E.conc)/TILE_M,conc:E.conc/TILE_M,pressure1:E.pressure?.(1)||0,blast:E.blast/TILE_M,fragmentReach:fragReach/TILE_M,fragments:E.n??E.cls?.reduce((n,c)=>n+c.n,0)??0,chargeKg:E.W||0,dB:Math.max(155,Math.min(195,175+10*Math.log10(Math.max(.0001,E.W||.01)/.01))),inc:!!E.inc});}

  // le souffle arrière d'une balle auto-propulsée : ceux qui se tiennent derrière le tireur, dans un cône, sont brûlés, assourdis
  backblast(u,dx,dy,W){const L=Math.hypot(dx,dy)||1;const bx=-dx/L,by=-dy/L;const reach=Math.min(1.2,.25+Math.sqrt(W.p.c)*.35);
    for(const o of this.s.units){if(o===u||!alive(o)||!o.h)continue;const rx=o.x-u.x,ry=o.y-u.y;const d=Math.hypot(rx,ry);if(d>reach||d<1e-3)continue;if((rx*bx+ry*by)/d<.7)continue;
      o.stun=Math.max(o.stun||0,3+4*(1-d/reach));o.supp=Math.min(1.5,(o.supp||0)+.6);o.h.pain=Math.min(10,(o.h.pain||0)+2*(1-d/reach));(o.h.log??=[]).push({t:this.s.t,what:'brûlé et assourdi par le souffle arrière d’une fusée',by:u.name||''});}}
  // ---------- le tir sur zone ----------
  // Une arme à obus (charge explosive à éclats, 5 mm et plus) tire en cloche sur un point : sans voir la cible, par-dessus murs
  // et maisons. La dispersion : en portée (la poudre, la hausse), en direction ; et une erreur de départ (la carte, la distance
  // estimée) que le « réglage » corrige coup après coup — à condition qu'un Meumeu voie où tombent les obus.
  canZone(W){return !!(W?.he&&!W.he.shaped&&W.p.d>=5);}
  arcOf(W){return W._arc??=arcTable(W.v0,W.BC,!!ACTIONS[W.p.action]?.mortar,W.boost);}
  zoneRange(W){return this.canZone(W)?this.arcOf(W).max/TILE_M:0;}
  zoneFire(ids,x,y,opt={}){const us=ids.map(id=>this.unit(id)).filter(u=>u&&u.f==='meumeu'&&active(u)&&u.w&&this.canZone(this.W(u.w)));
    if(!us.length)return {ok:false,why:['aucune arme à obus dans la sélection (munition explosive à éclats, 5 mm et plus)']};
    if(!this.atWar)this.declareWar('meumeu');
    for(const u of us){u.task={kind:'zone',x,y,n:opt.n??Infinity,high:opt.high??true,bias:null,fired:0};u.path=null;u.goal=null;u.hold=false;u.why=null;u.cool=Math.min(u.cool||0,18);}
    const far=us.filter(u=>d2(u.x,u.y,x,y)>this.zoneRange(this.W(u.w))).length;
    return {ok:true,text:`${us.length} pièce${us.length>1?'s':''} en tir sur zone${far?` (${far} doivent se rapprocher)`:''}${this.observer('meumeu',x,y)?' · un observateur voit la zone : le tir se règle':' · personne ne voit la zone : tir sans réglage'}`};}
  // auto : un mortier qui répond seul à un ennemi vu (pas d'ordre) — il ne bouge pas, et dit s'il a pu tirer
  zoneTick(u,T,auto=false){const W=this.W(u.w);if(!u.w||!this.canZone(W)){if(!auto)u.task=null;return false;}if(!this.atWar){if(!auto)u.task=null;return false;}
    const A=this.arcOf(W);const distT=d2(u.x,u.y,T.x,T.y);const R=distT*TILE_M;
    if(R>A.max*.96){if(auto)return false;const k=1-A.max*.85/TILE_M/distT;this.go(u,u.x+(T.x-u.x)*k,u.y+(T.y-u.y)*k);u.why='se rapproche pour tirer';return true;}
    const sol=aimArc(A,R,T.high)||aimArc(A,R,!T.high);if(!sol||R<Math.max(6,A.min*.9)){if(auto)return false;u.why='trop près pour un tir courbe';u.task=null;return false;}
    this.face(u,T.x-u.x,T.y-u.y);u.anim='aim';u.path=null;
    if((u.stun||0)>0){u.why='sonné';return true;}
    let miss=0;if(W.crew>1){const mv=this.s.t-(u.moved||-9)<.03,rest=this.trenchRest(u,W);u.deployT=mv?0:(u.deployT||0)+this.dts*(rest<1?1.45:1);if(u.deployT<W.setup){u.why=rest<1?'mise en batterie dans la tranchée':'mise en batterie';return true;}miss=Math.max(0,W.crew-1-this.servants(u).length);}
    u.why=miss?`${miss} servant${miss>1?'s':''} manquant${miss>1?'s':''} · pièce servie au ralenti`:null;if(u.reload>0){if(!miss&&u.loading)u.why=u.loading;return true;}u.loading=null;const mortar=!!ACTIONS[W.p.action]?.mortar;
    // un mortier n'a pas de chargeur : le chargeur prend l'obus suivant dans les caisses et le laisse glisser
    const hands=1+Math.min(this.servants(u).length,Math.max(0,W.crew-1)),kgTxt=(W.rm||0)<1000?`${Math.round(W.rm||0)} g`:`${((W.rm||0)/1000).toFixed(1).replace('.',',')} kg`;
    if(mortar&&u.mag<=0&&u.pouch>0){u.mag=1;u.pouch--;u.reload=u.reloadTotal=2.5*(1+miss*.8)+Math.max(0,(W.rm||0)/100)*this.handsFactor(W,hands);u.loading=u.why=W.salvo>1?`charge une salve de ${W.salvo} fusées (${kgTxt}) à ${hands} bras`:`charge un obus de ${kgTxt} à ${hands} bras`;this.emit({type:'reload',x:u.x,y:u.y});return true;}
    if(u.mag<=0){if(u.pouch>0){const n=Math.min(W.p.mag,u.pouch);u.mag=n;u.pouch-=n;u.reload=u.reloadTotal=(W.p.mag>12?4:2.5)*(1+miss*.8);this.emit({type:'reload',x:u.x,y:u.y});return true;}u.dry=true;
      // V12.3 : à sec en plein tir, un servant part chercher des obus au dépôt (avant : la pièce restait « plus d'obus » jusqu'à un ordre de ravitaillement)
      if(!this.s.units.some(o=>o.crewAmmo?.gun===u.id&&active(o))&&!this.crewDry(u))u.why='plus d’obus';else if(!u.why?.startsWith('à sec'))u.why='plus d’obus : un servant va en chercher';return true;}
    u.dry=false;if(u.cool>0)return true;
    // pointer la pièce sur une nouvelle zone : le temps de viser, une fois
    // (une pièce sur affût se pointe à la manivelle : son temps de visée « à l'épaule », qui croît avec sa masse, est plafonné — sinon une pièce de
    //  65 mm visait plus de 5 minutes réelles entre deux coups)
    const aimZ=W.crew>1||mortar?Math.min(W.aim,12):W.aim;
    if(!T.laid){T.laid=true;u.cool=aimZ*1.5;u.why='pointe la pièce';return true;}
    // l'erreur de départ : sans observateur, elle reste ; avec, elle fond de moitié à chaque coup observé
    const obs=this.observer(u.f,T.x,T.y);if(!T.bias)T.bias=[this.gauss()*R*.06,this.gauss()*R*.03];
    const skill=1/(1+(u.xp||0)/80);const sR=R*(.012+W.moa*.0006)*(1+miss*.4)*skill,sD=R*(W.moa*.00045+.004)*(1+miss*.4)*skill;
    const dl=Math.hypot(T.x-u.x,T.y-u.y)||1;const ux=(T.x-u.x)/dl,uy=(T.y-u.y)/dl;const eR=(T.bias[0]+this.gauss()*sR)/TILE_M,eD=(T.bias[1]+this.gauss()*sD)/TILE_M;
    const x1=T.x+ux*eR-uy*eD,y1=T.y+uy*eR+ux*eD;if(obs){T.bias[0]*=.5;T.bias[1]*=.5;T.obs=obs.id;}else T.obs=null;
    u.mag--;T.fired++;if(u.f==='meumeu')this.practice('tir',.05);u.xp=(u.xp||0)+.1;
    u.cool=mortar?W.cyc:(ACTIONS[W.p.action]?.auto?Math.max(W.cyc,.6):W.cyc)+aimZ*.4+(W.p.mag<=1?1.2:0);if(miss)u.cool*=1+miss*.5;
    this.shotNoise(u,W,x1,y1);if(UDEF(u).sniper){u.cool*=2.2;u.snip=(u.snip||0)+1;if(u.snip%2===0&&u.task?.kind!=='move'){const a=this.rand()*Math.PI*2,ox=u.x,oy=u.y;const [nx,ny]=this.freeSpot?.(u.x+Math.cos(a)*3.5,u.y+Math.sin(a)*3.5,3)||[u.x+Math.cos(a)*3.5,u.y+Math.sin(a)*3.5];u.task={kind:'move',tx:nx,ty:ny,back:{kind:'guard',tx:nx,ty:ny}};u.path=null;u.orderPost='couche';}}
    if(W.jam&&this.rand()<W.jam){u.cool+=W.clear*(.7+this.rand()*.6);u.why='enrayé : il dégage la culasse';u.jams=(u.jams||0)+1;}else if(u.why?.startsWith('enrayé'))u.why=null;
    const SALVO=W.rocket&&W.salvo>1?W.salvo:0;
    // une batterie de fusées tire une salve : un départ par tube (0,45 s d'écart), chacune avec son écart propre autour du point visé
    if(SALVO){const dur=Math.max(.2,sol.t)/HOUR_REAL,top=Math.tan(sol.deg*Math.PI/180)*R/4/TILE_M;u.salvoQ=[];
      for(let k=0;k<SALVO;k++){const e2R=(T.bias[0]+this.gauss()*sR*1.5)/TILE_M,e2D=(T.bias[1]+this.gauss()*sD*1.5)/TILE_M;u.salvoQ.push({t:k*.45,x1:T.x+ux*e2R-uy*e2D,y1:T.y+uy*e2R+ux*e2D,dur,top});}}
    else{    this.s.shots.push({kind:'hshell',f:u.f,by:u.id,w:u.w,x0:u.x,y0:u.y,x1,y1,t:0,dur:Math.max(.2,sol.t)/HOUR_REAL,top:Math.tan(sol.deg*Math.PI/180)*R/4/TILE_M});
    this.emit({type:'shot',by:u.id,x:u.x,y:u.y,x1,y1,f:u.f,cal:W.p.d,v0:W.v0,E:W.E0,sup:W.vTop>340,arc:true,rk:W.rocket,tip:TIPC[W.p.cons]||null,he:!!W.he,action:W.p.action,feed:W.p.feed||'',barrels:W.barrels||1,rof:W.rpm,fins:W.fins||0,ig:W.boost?.ig||0});if(W.rocket)this.backblast(u,T.x-u.x,T.y-u.y,W);}
    if(T.fired>=T.n&&!auto){u.task=null;u.why=null;}return true;}
  // les fusées d'une salve partent l'une après l'autre
  salvoTick(){for(const u of this.s.units){if(!u.salvoQ?.length)continue;const W=u.w?this.W(u.w):null;if(!W||!(u.hp>0)){u.salvoQ=null;continue;}
    for(const it of u.salvoQ)it.t-=this.dts;const due=u.salvoQ.filter(it=>it.t<=0);u.salvoQ=u.salvoQ.filter(it=>it.t>0);
    for(const it of due){this.s.shots.push({kind:'hshell',f:u.f,by:u.id,w:u.w,x0:u.x,y0:u.y,x1:it.x1,y1:it.y1,t:0,dur:it.dur,top:it.top});
      this.emit({type:'shot',by:u.id,x:u.x,y:u.y,x1:it.x1,y1:it.y1,f:u.f,cal:W.p.d,v0:W.v0,E:W.E0,sup:W.vTop>340,arc:true,rk:true,tip:TIPC[W.p.cons]||null,he:!!W.he,action:W.p.action,feed:W.p.feed||'',barrels:1,rof:W.rpm,fins:W.fins||0,ig:W.boost?.ig||0});this.backblast(u,it.x1-u.x,it.y1-u.y,W);}
    if(!u.salvoQ.length)u.salvoQ=null;}}
  // V12.5 : les mines. Un soldat ou un engin à roues ou à chenilles qui pose le pied sur une mine posée par l'autre camp la fait sauter ; les mines voisines
  // de la même main sont alors repérées (visibles) — le champ de mines se dévoile à celui qui y perd quelqu'un.
  minesTick(){const M=this.s.mines;let any=false;for(const _ in M){any=true;break;}if(!any)return;const N=this.N;
    for(const u of this.s.units){if(!(u.hp>0)||u.inVeh||u.h?.state==='mort')continue;const k=Math.floor(u.y)*N+Math.floor(u.x);const m=M[k];if(m&&m.b&&m.f!==u.f)this.triggerMine(k);}
    for(const v of this.s.vehicles){if(!(v.hp>0)||v.k==='train'||v.alt>0)continue;const k=Math.floor(v.y)*N+Math.floor(v.x);const m=M[k];if(m&&m.b&&m.f!==v.f)this.triggerMine(k);}}
  triggerMine(k){const N=this.N,m=this.s.mines[k];if(!m)return;const i=k%N,j=(k/N)|0;this.lineBroken('mines',k);this.blast(i+.5,j+.5,'mine',m.f,null,1,'grenade');
    for(let dj=-3;dj<=3;dj++)for(let di=-3;di<=3;di++){const o=this.s.mines[(j+dj)*N+i+di];if(o)o.seen=true;}this.emit({type:'mine',x:i+.5,y:j+.5});}
  fallsTick(dt){for(const F of this.s.falls){F.t+=dt;if(F.t<F.dur)continue;F.done=true;this.blast(F.x1,F.y1,'bombe',F.f,null,1);}
    this.s.falls=this.s.falls.filter(F=>!F.done);}
  flakTick(dt){const planes=this.s.vehicles.filter(v=>v.alt>1&&v.hp>0);if(!planes.length)return;
    for(const b of this.s.buildings){const B=BUILDINGS[b.k];if(!B.flak||!b.done)continue;b.fcool=(b.fcool||0)-dt;if(b.fcool>0)continue;const gx=b.i+1,gy=b.j+1;
      const v=planes.filter(v=>v.f!==b.f&&d2(v.x,v.y,gx,gy)<B.flak.range).sort((a,z)=>d2(a.x,a.y,gx,gy)-d2(z.x,z.y,gx,gy))[0];if(!v)continue;b.fcool=B.flak.cd*(.8+this.rand()*.4);
      const V=VEHICLES[v.k];const L=Math.hypot(v.dx||0,v.dy||0)||1;const lead=V.speed*FLAK.flight;const ax=v.x+(v.dx||0)/L*lead,ay=v.y+(v.dy||0)/L*lead;
      this.s.shots.push({kind:'flak',f:b.f,v:v.id,x0:gx,y0:gy,x1:ax+(this.rand()-.5)*2*FLAK.spread,y1:ay+(this.rand()-.5)*2*FLAK.spread,h:v.alt,t:0,dur:FLAK.flight});this.emit({type:'flak-fire',x:gx,y:gy});}}
  // Les tours et les centres-villes : des tireurs à l'abri, avec la meilleure arme adoptée ; ils puisent leurs munitions aux dépôts.
  defenseTick(){if(!this.atWar)return;for(const b of this.s.buildings){const B=BUILDINGS[b.k];if(!B.defense||!b.done)continue;const [w,h]=this.sizeOf(b);const gx=b.i+w/2,gy=b.j+h/2;
      b.cool=(b.cool||0)-this.dts;if(b.cool>0)continue;
      const e=this.s.units.filter(u=>u.f!==b.f&&active(u)&&d2(u.x,u.y,gx,gy)<B.defense.range&&this.spotted(u,b.f)).sort((a,z)=>d2(a.x,a.y,gx,gy)-d2(z.x,z.y,gx,gy))[0];if(!e){b.cool=1;continue;}
      const wid=this.bestRifle(b.f);const W=this.W(wid);const shooters=Math.round(B.defense.shooters*(b.f==='meumeu'?this.mod('creneaux'):1))+Math.floor((b.hide||[]).length/3);if(b.f==='meumeu')this.practice('defense',.02);b.cool=(W.cyc+W.aim*.5)/shooters;
      {const got=this.take(b.f,gx,gy,'m:'+wid,1/W.perCrate);if(got<1/W.perCrate*.99){b.dry=true;b.cool=3;continue;}b.dry=false;}
      const pseudo={id:'b'+b.id,f:b.f,k:'soldat',x:gx,y:gy,post:'accroupi',supp:0,xp:30,w:wid};const R=d2(e.x,e.y,gx,gy)*TILE_M;const fl=W.at(R);const res=this.resolve(pseudo,e,W,R,0);
      const x1=res.hit?e.x:(res.px??e.x),y1=res.hit?e.y:(res.py??e.y);
      this.s.shots.push({kind:'round',f:b.f,by:null,w:wid,x0:gx,y0:gy-.6,x1,y1,t:0,dur:Math.max(.01,fl.t)/HOUR_REAL,res,target:{u:e.id},R,tower:true});
      this.emit({type:'shot',x:gx,y:gy-.6,x1,y1,f:b.f,cal:W.p.d,v0:W.v0,E:W.E0,sup:W.v0>340,tower:true});}}
  bestRifle(f){const ds=this.designsOf(f).filter(d=>!['he'].includes(d.p.cons));if(f==='beee')return 'bee_fusil';let best='mle1',be=0;for(const d of ds){const D=derive(d.p);if(D.eff>be&&D.rk<.4){be=D.eff;best=d.id;}}return best;}
  shootDown(v){v.state='down';const L=Math.hypot(v.dx||1,v.dy||0)||1;this.s.falls.push({id:this.id(),kind:'wreck',f:v.f,x0:v.x,y0:v.y,x1:v.x+(v.dx||1)/L*3,y1:v.y+(v.dy||0)/L*3,alt:v.alt,t:0,dur:.4,k:v.k});
    this.s.vehicles.splice(this.s.vehicles.indexOf(v),1);for(const u of v.pass||[])u.hp=0;this.log('Ciel',`${v.f==='beee'?'Bombardier bèè':VEHICLES[v.k].name+' « '+v.name+' »'} abattu !`,v.f==='beee'?'good':'bad');this.emit({type:'downed',x:v.x,y:v.y,f:v.f});}

  // ---------- les Bèè ----------
  makeBeeeCity(ci,cj,name){
    const centre=this.addBuilding('beee','centre',ci-2,cj-2,true);
    centre.city=name;
    centre.stock={...START.stock,'a:bee_fusil':START.stock['a:mle1'],'m:bee_fusil':START.stock['m:mle1']};
    delete centre.stock['a:mle1'];delete centre.stock['m:mle1'];
    centre.stock['p:bee_casque']=centre.stock['p:casque']||0;
    centre.stock['p:bee_plaque']=centre.stock['p:gilet']||0;
    delete centre.stock['p:casque'];delete centre.stock['p:gilet'];for(const [k,m] of Object.entries(BEEE.boost||{}))centre.stock[k]=Math.round((centre.stock[k]||0)*m);
    const c={id:this.id(),name,x:ci,y:cj,centre:centre.id,fallen:false};
    this.s.beee.cities.push(c);
    // une garnison dès le départ (six fusils), des fusils et des cartouches en réserve : il y a de l'enjeu tout de suite
    centre.stock['a:bee_fusil']=(centre.stock['a:bee_fusil']||0)+18;centre.stock['m:bee_fusil']=(centre.stock['m:bee_fusil']||0)+24;
    for(let n=0;n<(BEEE.garrison||0);n++){const a=n/6*Math.PI*2;const g=this.addUnit('beee','soldat',ci+Math.cos(a)*6,cj+Math.sin(a)*6,{w:'bee_fusil'});g.city=c.id;g.home=centre.id;g.task={kind:'guard',tx:g.x,ty:g.y};this.resupply?.(g);if(!(g.mag>0)){const W0=this.W('bee_fusil');g.mag=W0.p.mag;g.pouch=Math.round(W0.carry*.6);}}
    const nv=BEEE.villagers||START.villagers;for(let n=0;n<nv;n++){const a=n/nv*Math.PI*2;
      const u=this.addUnit('beee','villageois',ci+Math.cos(a)*3.2,cj+Math.sin(a)*3.2);u.city=c.id;u.home=centre.id;}
    return c;}
  beeeAlarm(target,by=null){if(!this.atWar)return;const now=this.s.t;const [x,y]=this.posOf(target);this.beeeArtilleryAlarm(x,y,by);if(target.alarmAt&&now-target.alarmAt<.5)return;target.alarmAt=now;
    const foe=this.s.units.filter(u=>u.f==='meumeu'&&active(u)&&this.spotted(u,'beee')).sort((a,b)=>d2(a.x,a.y,x,y)-d2(b.x,b.y,x,y))[0];if(!foe||d2(foe.x,foe.y,x,y)>18)return;
    // seuls les gardes les plus proches de l'intrus, dans la limite de ce que le plafond de chaque ville permet, se lancent au combat
    const room=new Map();
    for(const u of this.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='guard'&&active(u)&&d2(u.x,u.y,x,y)<16).sort((a,z)=>d2(a.x,a.y,foe.x,foe.y)-d2(z.x,z.y,foe.x,foe.y))){
      const c=this.s.beee.cities.find(k=>k.id===u.city);if(c&&!room.has(c.id))room.set(c.id,this.beeeRoom(c,true));
      if(c&&room.get(c.id)<=0)continue;if(c)room.set(c.id,room.get(c.id)-1);
      u.task={kind:'assault',tx:foe.x,ty:foe.y,back:[u.x,u.y]};}}
  beeeArtilleryAlarm(x,y,by){const u=this.unit(by);if(!u||u.f!=='meumeu'||!(UDEF(u).img||u.w&&ACTIONS[this.W(u.w).p.action]?.mortar))return;
    const city=this.s.beee.cities.filter(c=>!c.fallen).sort((a,b)=>d2(a.x,a.y,x,y)-d2(b.x,b.y,x,y))[0];if(!city||d2(city.x,city.y,x,y)>32)return;
    const B=this.s.beee,prev=B.counterBattery,shots=prev?.by===by&&this.s.t-prev.at<36?Math.min(8,prev.shots+1):1;
    const error=Math.max(.5,4-shots*.55),angle=this.rand()*Math.PI*2;
    B.counterBattery={by,x:u.x+Math.cos(angle)*error,y:u.y+Math.sin(angle)*error,at:this.s.t,shots,city:city.id,threat:UDEF(u).img?3:Math.min(5,1+this.W(u.w).p.d/5)};
    if(shots===1)this.log(city.name,UDEF(u).img||this.W(u.w)?.he?`Des obus frappent la ville : les Bèè cherchent la batterie ennemie.`:`On tire sur la ville : les Bèè cherchent le tireur.`, 'warn');}
  // Une ville bèè bombardée de loin : on repère la batterie au son et à l'éclair — l'estimation se resserre à chaque coup.
  // Le danger se cumule (la taille de la charge, la cadence) et s'oublie en quelques heures de calme.
  beeeShelled(x,y,u,E){if(!this.atWar)return;const dist=d2(u.x,u.y,x,y);if(dist<10)return;
    const city=this.s.beee.cities.filter(c=>!c.fallen).sort((a,z)=>d2(a.x,a.y,x,y)-d2(z.x,z.y,x,y))[0];if(!city||d2(city.x,city.y,x,y)>26)return;
    const S=city.shelled&&this.s.t-city.shelled.at<8?city.shelled:(city.shelled={shots:0,danger:0,x:u.x,y:u.y,first:this.s.t});
    S.shots++;S.at=this.s.t;S.by=u.id;S.danger=S.danger*Math.exp(-(this.s.t-(S.last??this.s.t))/6)+1+Math.min(4,(E.radius||1)/2);S.last=this.s.t;
    const err=Math.max(.8,dist*.3/Math.sqrt(S.shots)),a=this.rand()*Math.PI*2,k=1/Math.min(S.shots,6);
    S.x+=(u.x+Math.cos(a)*err-S.x)*k;S.y+=(u.y+Math.sin(a)*err-S.y)*k;if(S.shots===1)S.x=u.x+Math.cos(a)*err,S.y=u.y+Math.sin(a)*err;
    this.s.beee.counterBattery={by:u.id,x:S.x,y:S.y,at:this.s.t,shots:S.shots,city:city.id,threat:S.danger};
    if(S.shots===1)this.log(city.name,`Nos obus tombent sur ${city.name} : les Bèè cherchent d’où ils viennent.`,'warn');}
  beeeRetarget(u){const b=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin).sort((a,z)=>this.distB(a,u.x,u.y)-this.distB(z,u.x,u.y))[0];
    if(b&&this.distB(b,u.x,u.y)<25&&(u.pouch>0||u.mag>0||u.shells>0)){const [w,h]=this.sizeOf(b);u.task={kind:'assault',tx:b.i+w/2,ty:b.j+h+.5};}
    else{const home=this.s.beee.cities.find(c=>!c.fallen);if(home)u.task={kind:'guard',tx:home.x+(this.rand()-.5)*8,ty:home.y+(this.rand()-.5)*8};}}
  // ---------- les innovations ----------
  // ce qu'une innovation adoptée multiplie ; les soins sont réglés dans health.js
  remod(){const m={};for(const id of this.s.innov?.done||[]){const I=INNOV.find(x=>x.id===id);if(I)for(const [k,v] of Object.entries(I.mod))m[k]=(m[k]||1)*v;}this.mods=m;MED.tq=m.garrot||1;MED.plasma=m.plasma||1;MED.sepsis=m.antiseptique||1;}
  mod(k){return this.mods?.[k]||1;}
  practice(dom,x){if(!dom)return;const P=this.s.innov.prac;P[dom]=(P[dom]||0)+x;}
  // Toutes les deux heures : un domaine assez pratiqué donne une idée à un Meumeu qui y travaille (au plus six en attente)
  innovTick(dt){const I=this.s.innov;I.clock=(I.clock||0)+dt;if(I.clock<2)return;I.clock=0;if(I.ideas.length>=6)return;
    for(const dom of Object.keys(DOMAINS)){const need=I.next[dom]||14;if((I.prac[dom]||0)<need)continue;
      const order=[...I.order,...INNOV.map(x=>x.id).filter(x=>!I.order.includes(x))];   // (les parties enregistrées avant une découverte neuve la reçoivent en fin de liste)
      const id=order.find(x=>{const d=INNOV.find(y=>y.id===x);return d&&d.dom===dom&&!I.done.includes(x)&&!I.ideas.some(y=>y.id===x)&&!this.s.buildings.some(b=>b.dev?.id===x)&&(d.needs||[]).every(n=>I.done.includes(n));});if(!id){I.next[dom]=1e9;continue;}
      I.next[dom]=need*1.9;const who=this.inventor(dom);I.ideas.push({id,who,t:this.s.t});const X=INNOV.find(y=>y.id===id);
      this.log(who?this.nearCity(who):'Recherche',`${who?.name||'Un Meumeu'} a une idée : ${X.name}.`,'good');this.emit({type:'idea',id,who:who?.name,x:who?.x,y:who?.y});if(I.ideas.length>=6)break;}}
  inventor(dom){const T={bois:['tree'],pierre:['rock'],vivres:['bush']};const us=this.s.units.filter(u=>u.f==='meumeu'&&u.name&&active(u));
    const busy=us.filter(u=>{const k=u.task?.kind;if(T[dom])return (k==='gather'&&T[dom].includes(u.task.type))||(k==='work'&&BUILDINGS[this.building(u.task.b)?.k]?.hub);
      if(dom==='mine')return k==='work'&&this.building(u.task.b)?.k==='mine'||u.task?.type==='ore';if(dom==='construction')return k==='build'||k==='line';if(dom==='soins')return !!UNITS[u.k]?.medic;
      if(dom==='chimie')return k==='work'&&this.building(u.task.b)?.k==='poudrerie';if(dom==='tir'||dom==='defense')return !!u.w;if(dom==='armement'||dom==='atelier')return k==='work'&&['arsenal','manufacture','atelier'].includes(this.building(u.task.b)?.k);return false;});
    const pool=busy.length?busy:us;return pool[Math.floor(this.rand()*pool.length)]||null;}
  // Ce qui n'est cité par aucune découverte est libre depuis le début ; ce qu'une découverte débloque ne l'est qu'une fois celle-ci adoptée.
  unlocked(key){const done=this.s.innov?.done||[];const gate=INNOV.filter(I=>I.unlock?.includes(key));return !gate.length||gate.some(I=>done.includes(I.id));}
  canDevelop(id){const why=[];const I=INNOV.find(x=>x.id===id);const miss=(I.needs||[]).filter(n=>!(this.s.innov?.done||[]).includes(n));if(miss.length)why.push('il faut d’abord : '+miss.map(n=>INNOV.find(y=>y.id===n)?.name||n).join(', '));const lab=this.s.buildings.find(b=>b.f==='meumeu'&&BUILDINGS[b.k].lab&&b.done);if(!lab)why.push('un laboratoire bâti');else if(lab.dev)why.push('le laboratoire travaille déjà sur une idée');
    if(lab){const p=this.canPay('meumeu',lab.i+1,lab.j+1,I.cost);if(!p.ok)why.push(`il manque : ${p.miss.join(', ')}`);}return {ok:!why.length,why,lab};}
  develop(id){const r=this.canDevelop(id);if(!r.ok)return r;const I=INNOV.find(x=>x.id===id);this.pay('meumeu',r.lab.i+1,r.lab.j+1,I.cost);r.lab.dev={id,left:I.hours,total:I.hours};
    this.s.innov.ideas=this.s.innov.ideas.filter(x=>x.id!==id);this.log(this.cityName(r.lab),`Le laboratoire développe : ${I.name}.`,'good');return {ok:true,text:`Au laboratoire : ${I.name} (${I.hours} h)`};}
  dropIdea(id){this.s.innov.ideas=this.s.innov.ideas.filter(x=>x.id!==id);}
  checkEnd(){const s=this.s;if(!s.won&&s.beee.cities.length&&s.beee.cities.every(c=>c.fallen)){
      s.won={day:this.day,how:'guerre'};this.log('Front','Toutes les villes bèè sont tombées. La guerre est gagnée.','good');this.emit({type:'won'});}
    if(!s.lost&&!s.buildings.some(b=>b.f==='meumeu'&&b.k==='centre'&&!b.ruin)){s.lost={day:this.day};this.log('Front','Le dernier centre-ville est tombé.','bad');this.emit({type:'lost'});}}

}
// la gestion (usines, dépôts, commandes, fret) : eco.js
Object.assign(World.prototype,ECO);
Object.assign(World.prototype,WILDLIFE);
Object.assign(World.prototype,WAR);
Object.assign(World.prototype,BEEE_AI);
Object.assign(World.prototype,PERCEPTION);
Object.assign(World.prototype,OPERATIONS);
Object.assign(World.prototype,STRATEGY);
Object.assign(World.prototype,ESCALADE);
Object.assign(World.prototype,VEHICULES);
Object.assign(World.prototype,PERSISTENCE);
Object.assign(World.prototype,BUNKERS);
Object.assign(World.prototype,NAVAL);
