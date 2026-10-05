import {BUILDINGS,DAY,BEEE} from './data.js';
const alive=u=>u&&u.hp>0&&u.h?.state!=='hors';
// Offensives : une ARMÉE conventionnelle, pas des raids. Une seule armée en campagne à la fois (MAXCOL), qui ne part que si elle est massive
// (ARMY_MIN soldats libérés par l'ensemble des villes, chacune gardant la moitié de sa garnison minimale, ARMY_KEEP), avec une marge
// d'écrasement sur la défense estimée (ARMY_ODDS) ; jours entre la fin d'une armée et le départ de la suivante (GAP). Pas de groupe de
// diversion, pas de petites colonnes qui s'égrènent : les Bèè rassemblent, marchent en masse, donnent l'assaut, se replient.
// (Historique mesuré, 9 campagnes de 30 jours contre le joueur automatique — 1 colonne : 3,0 offensives, capitale tombée 2/9 ; 3 colonnes :
// 6,3 offensives de 4 à 23 soldats chacune, capitale tombée 3/9 ; les groupes de 15-20 soldats sur 300 ne faisaient pas une guerre.)
// (MAXCOL, ARMY_MIN, ARMY_KEEP, ARMY_ODDS, GAP : voir raidK() dans beee.js — ils suivent le niveau d'escalade ; au niveau 0 : 1, 30, .5, 2.2, .6)
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const adiff=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
// Le renseignement garde une observation datée, jamais une référence à un stock adverse.
export const STRATEGY={
  beeeScout(){const B=this.s.beee,t=this.t;B.known??={};B.reports??=[];
    B.knowT=(B.knowT||0)+this.dt;if(B.knowT<.5)return;B.knowT=0;
    for(const b of this.s.buildings){if(b.f!=='meumeu')continue;const [x,y]=this.bc(b);if(!this.visibleAt('beee',x,y))continue;
      const troops=this.s.units.filter(u=>u.f==='meumeu'&&alive(u)&&u.w&&Math.hypot(u.x-x,u.y-y)<18&&this.spotted(u,'beee')).length;
      const snapshot={id:b.id,k:b.k,x,y,i:b.i,j:b.j,done:b.done,ruin:!!b.ruin,capital:!!b.capital,t,troops,defense:BUILDINGS[b.k].defense?3:0};
      const prior=B.known[b.id];if(prior&&typeof prior==='object'&&t-prior.t<1)continue;
      const pending=B.reports.find(r=>r.snapshot.id===b.id);if(pending)pending.snapshot=snapshot;else B.reports.push({at:t+.35+Math.min(1.5,Math.min(...B.cities.filter(c=>!c.fallen).map(c=>Math.hypot(c.x-x,c.y-y)),100)/100),snapshot});
    }
    for(const r of [...B.reports])if(r.at<=t){B.known[r.snapshot.id]=r.snapshot;B.reports.splice(B.reports.indexOf(r),1);}
  },
  // Un bruit n'apporte à un Bèè qu'un RELÈVEMENT : une direction et son incertitude, prises depuis l'endroit où il écoute. Ni la
  // position de la source ni sa distance ne sont transmises ; seule une vue directe (beeeNotice « vu ») donne une position. Le
  // seul chiffre de portée est la distance maximale à laquelle ce bruit est audible (sa puissance), qui borne la fouille.
  beeeHear(x,y,dB,why='tir'){const contacts=this.s.units.filter(u=>u.f==='beee'&&alive(u)).map(u=>({u,h:this.acousticContact(u,x,y,dB,why)})).filter(q=>q.h).sort((a,b)=>a.h.uncertainty-b.h.uncertainty);
    const q=contacts[0];return q?this.beeeCone(q.h,dB,why,q.u.id):null;},
  beeeCone(h,dB,why,listener){const B=this.s.beee,t=this.t;B.alerts??=[];
    const night=this.light()<.4&&why!=='pas',reach=Math.max(4,(dB-110)/1.6)*(night?1.5:1),half=h.uncertainty;
    // même direction (à l'incertitude près) depuis le même écouteur, ou depuis un écouteur voisin : c'est le même bruit ; le contact
    // le plus précis l'emporte, jamais l'inverse (sans cela, chaque tir entendu par un autre garde ferait monter la menace des villes)
    // Deux écouteurs éloignés entendent le même tir sous deux angles : leurs cônes se recoupent. On ne s'en sert QUE pour ne pas
    // compter deux fois le même bruit (aucune triangulation : la position du croisement n'est ni calculée ni conservée).
    const close=h.d<10;   // très proche de l'écouteur : plusieurs tireurs voisins ne font qu'un contact (l'alerte ne garde que ce drapeau, jamais la distance)
    const same=q=>{if(close&&q.close&&Math.hypot(q.ox-h.ox,q.oy-h.oy)<12)return true;if(q.listener===listener)return adiff(q.bearing,h.angle)<Math.max(.35,q.half+half);
      for(let rho=4;rho<=Math.min(reach,70);rho+=4)if(this.alertCovers(q,h.ox+Math.cos(h.angle)*rho,h.oy+Math.sin(h.angle)*rho,2))return true;return false;};
    let a=B.alerts.find(q=>q.cone&&t-q.t<2&&same(q));
    if(a){const repeat=t-a.t>.3||a.why!==why;if(half<=a.half){a.bearing=h.angle;a.half=half;a.reach=reach;a.ox=h.ox;a.oy=h.oy;a.x=h.ox;a.y=h.oy;a.listener=listener;a.close=close;}
      a.t=t;a.why=why;a.dB=Math.max(a.dB||0,dB);a.n=(a.n||1)+1;if(repeat)a.done=false;return a;}
    a={cone:true,x:h.ox,y:h.oy,ox:h.ox,oy:h.oy,r:0,bearing:h.angle,half,reach,dB,t,why,done:false,n:1,listener,close,readyAt:t+.1,level:'suspicion'};
    B.alerts.push(a);if(B.alerts.length>20)B.alerts.shift();
    const w={explosion:1.6,'camarade abattu':1.2,vu:.6,pas:.5,tir:.35,claquement:.25,bruit:.3}[why]||.3;
    // la menace d'une ville monte au plus une fois toutes les 1,5 h par source de bruit : un combat n'est pas une suite de menaces neuves
    for(const c of B.cities){if(c.fallen||t<(c.thrT||0))continue;const d=Math.hypot(c.x-h.ox,c.y-h.oy);if(d<60){c.threat=Math.min(4,(c.threat||0)+w);c.thrT=t+1.5;}else if(d<160){c.threat=Math.min(3,(c.threat||0)+w*.35);c.thrT=t+1.5;}}
    return a;},
  // La mobilisation d'une ville : ses soldats en ronde ou en fouille, et la place qu'il lui reste avant le plafond (40 % de la garnison,
  // 60 % face à un danger avéré). Les éclaireurs de campagne comptent aussi : ils quittent la ville.
  // (la reconnaissance lointaine — task.recon — ne compte pas dans les sorties de la ville et n'est jamais rappelée : c'est la mission de l'état-major)
  beeeByCity(id){if(this._bcT!==this.s.t||this._bcN!==this.s.units.length){this._bcT=this.s.t;this._bcN=this.s.units.length;const M=this._bc??=new Map();for(const a of M.values())a.length=0;for(const u of this.s.units){if(u.f!=='beee'||u.city==null)continue;let a=M.get(u.city);if(!a)M.set(u.city,a=[]);a.push(u);}}return this._bc.get(id)||[];},
  beeeOut(c){return this.beeeByCity(c.id).filter(u=>u.f==='beee'&&u.city===c.id&&alive(u)&&!u.band&&!u.task?.recon&&(u.task?.kind==='patrol'||u.task?.kind==='search')).length;},
  // la bande de défense de la ville compte aussi : ses membres sont dehors et dans le total
  // (comptés par ville d'ORIGINE : un renfort venu d'une voisine pèse sur le plafond de sa ville, pas sur celui de la ville défendue)
  beeeBandOut(c){return (this.s.beee.bands||[]).filter(b=>b.kind==='defense').reduce((n,b)=>n+b.m.filter(id=>{const u=this.unit(id);return u&&alive(u)&&u.from===c.id;}).length,0);},
  // les soldats de la ville engagés localement face à un intrus (assault) : ils comptent parmi les sorties
  beeeEngaged(c){return this.beeeByCity(c.id).filter(u=>u.f==='beee'&&u.k==='soldat'&&u.city===c.id&&alive(u)&&!u.band&&u.task?.kind==='assault').length;},
  // la garnison sert de base au plafond : gardes, rondes, fouilles ET soldats engagés localement (assault), plus la bande de défense
  beeeAll(c){return this.beeeByCity(c.id).filter(u=>u.f==='beee'&&u.k==='soldat'&&u.city===c.id&&alive(u)&&!u.band&&['guard','patrol','search','assault'].includes(u.task?.kind)).length;},
  beeeCap(c,danger=false){const n=this.beeeAll(c)+this.beeeBandOut(c),reserve=Math.max(2,Math.ceil(this.beeeGarrisonMin(c)/2));return Math.max(0,Math.min(Math.floor(n*(danger?.6:.4)),n-reserve));},
  beeeRoom(c,danger=false){return Math.max(0,this.beeeCap(c,danger)-this.beeeOut(c)-this.beeeBandOut(c)-this.beeeEngaged(c));},
  // Le rappel : si la garnison a fondu (une offensive est partie, des pertes) les sorties au-delà du plafond rentrent, une par veille, en
  // commençant par ce qui compte le moins : les éclaireurs de campagne, puis les rondes de secteur, puis les fouilles les plus lointaines.
  beeeRecall(c){const cap=this.beeeCap(c,!!c.alertT),used=this.beeeOut(c)+this.beeeBandOut(c)+this.beeeEngaged(c);if(used<=cap)return 0;   // un départ n'est permis que sous le plafond : le rappel n'a donc pas besoin de marge, il ne fait pas d'aller-retour
   
    const out=this.s.units.filter(u=>u.f==='beee'&&u.city===c.id&&alive(u)&&!u.band&&!u.task?.recon&&(u.task?.kind==='patrol'||u.task?.kind==='search')&&u.task.until>this.t);
    const rank=u=>u.task.scout?0:u.task.sector||u.task.road?1:2,far=u=>distance(u,c);
    out.sort((a,b)=>rank(a)-rank(b)||far(b)-far(a));const u=out[0];if(!u)return 0;u.task.until=0;return 1;},
  // Une alerte couvre-t-elle ce point ? Un cône : dans la direction entendue (à l'incertitude près) et à portée d'audition.
  alertCovers(a,x,y,m=8){if(!a.cone)return Math.hypot(a.x-x,a.y-y)<a.r+m;const dx=x-a.ox,dy=y-a.oy,d=Math.hypot(dx,dy);if(d<m)return true;return d<=a.reach+m&&adiff(Math.atan2(dy,dx),a.bearing)<=a.half+Math.atan2(m,d);},
  // Les chercheurs balaient le cône en zigzag, du proche au lointain, chacun sur sa moitié : aucun point n'est « la » position du bruit.
  coneSweep(a,k){const N=5,far=Math.max(10,a.reach*.9),out=[];
    for(let s=0;s<Math.max(1,k);s++){const side=s%2?-1:1,pts=[];
      for(let i=0;i<N;i++){const rho=far*(.3+.7*i/(N-1)),an=a.bearing+side*a.half*.5+(i%2?1:-1)*a.half*.3;pts.push(this.freeSpot(a.ox+Math.cos(an)*rho,a.oy+Math.sin(an)*rho,6));}
      out.push(pts);}
    return out;},
  beeeSearch(cities){this.beeeScout();const B=this.s.beee,t=this.t;B.searchT=(B.searchT||0)+this.dt;if(B.searchT<.1)return;const el=B.searchT;B.searchT=0;
    B.srch=(B.srch||[]).filter(q=>t-q.t<1.5);
    for(const a of B.alerts||[]){if(a.done||t-a.t>3||t<(a.readyAt||a.t+.15))continue;
      // (une fouille par secteur de 15 cases toutes les 1,5 h : chaque « mouvement suspect » relançait la sienne, les mêmes soldats faisaient la navette)
      if(a.why!=='camarade abattu'&&B.srch.some(q=>distance(q,a)<15)){a.done=true;continue;}
      const c=cities.slice().sort((p,q)=>distance(p,a)-distance(q,a))[0];if(!c||distance(c,a)>150)continue;
      const keep=this.beeeGarrisonMin(c),g=this.beeeGuards(c),pat=this.s.units.filter(u=>u.f==='beee'&&alive(u)&&!u.band&&u.task?.kind==='patrol'&&distance(u,a)<55);
      // À son minimum de garnison, la ville ne se vide pas mais détache un binôme d'écoute : au moins la moitié du minimum reste à son poste.
      const spare=Math.max(g.length-keep,Math.min(2,g.length-Math.max(2,Math.ceil(keep/2))),0);
      // Plafond de mobilisation : une ville ne sort jamais plus de 40 % de sa garnison en rondes et fouilles (60 % face à un danger avéré).
      // Les rondes déjà dehors (`pat`) sont réaffectées sans compter de nouveau ; seuls les gardes neufs consomment la place restante.
      const danger=a.why==='vu'||a.why==='explosion'||a.why==='camarade abattu',room=this.beeeRoom(c,danger);
      const want=a.why==='vu'?6:a.why==='explosion'?5:a.why==='traces'?3:2,pool=[...pat,...g.slice(0,Math.min(spare,room))].slice(0,want);if(!pool.length)continue;
      a.done=true;B.srch.push({x:a.x,y:a.y,t});a.level=a.why==='vu'?'confirmation':'recherche';const pts=[];
      if(!a.cone)for(let n=0;n<5;n++){const an=n*2.4,rr=Math.max(3,a.r)*(.4+n*.15);pts.push(this.freeSpot(a.x+Math.cos(an)*rr,a.y+Math.sin(an)*rr,6));}
      const sweep=a.cone?this.coneSweep(a,pool.length):null;   // un bruit : on balaie un cône ; une vue : on converge sur le point vu
      // un balayage plus long dure plus longtemps : la fouille doit pouvoir atteindre le bout du cône avant de rentrer
      for(const [n,u] of pool.entries()){const home=cities.find(c=>c.id===u.city)||c;u.task={kind:'search',pts:sweep?sweep[n]:(n%2?pts.slice().reverse():pts),i:0,t0:t,until:t+(a.cone?1+(Math.max(10,a.reach*.9)+8)/7.5+.8:5),home:[home.x,home.y],cone:a.cone?1:0};u.path=null;}
    }
    for(const c of cities){c.threat=Math.max(0,(c.threat||0)-.06*el);this.beeeRecall(c);
      // Une reconnaissance due passe avant une ronde ordinaire : sans elle le renseignement vieillit, aucune cible n'est plus valable
      // (4 jours) et la guerre s'arrête. Si le plafond est plein de rondes de secteur, deux d'entre elles rentrent pour lui faire place.
      if(t>=(c.scoutT||0)&&this.beeeRoom(c)<2){let n=0;for(const u of this.s.units)if(n<2&&u.f==='beee'&&u.city===c.id&&alive(u)&&!u.band&&u.task?.kind==='patrol'&&u.task.until>t){u.task.until=0;n++;}}
      if(t<(c.sectorT||0))continue;c.sectorT=t+5;
      const troops=this.beeeTroops(c),guards=this.beeeGuards(c),reserve=this.beeeGarrisonMin(c),surplus=Math.max(0,troops.length-reserve);
      const pairs=Math.min(6,Math.floor(surplus/3)),busy=troops.filter(u=>u.task?.kind==='patrol').length/2;
      let free=guards.slice(0,Math.max(0,guards.length-reserve));
      for(let n=busy;n<pairs&&free.length>=2&&this.beeeRoom(c)>=2;n++){const sector=(c.sectorN||0)%8;c.sectorN=sector+1;const an=sector*Math.PI/4,radius=Math.min(145,30+surplus*2.2);
        const out=this.freeSpot(c.x+Math.cos(an)*radius,c.y+Math.sin(an)*radius,8),route=this.reachablePatrol(c,out);if(!route.length)continue;
        for(const u of free.splice(0,2)){u.task={kind:'patrol',pts:route,i:0,until:t+12+radius*.4,home:[c.x,c.y],city:c.id,sector:sector+1};u.path=null;}}
      // Reconnaissance de campagne : secteurs tournants, aucun accès à la capitale cachée.
      if(t>=(c.scoutT||0)&&free.length>=2&&this.beeeRoom(c)>=2){c.scoutT=t+18;
        // Une grille de reconnaissance partagée couvre les territoires non visités.
        // Les secteurs lointains passent d'abord ; ce n'est pas la position d'une unité ennemie.
        if(!B.reconGrid){B.reconGrid=[];const origin=cities[0];for(let j=0;j<4;j++)for(let i=0;i<4;i++)B.reconGrid.push([(i+.5)*this.N/4,(j+.5)*this.N/4]);// Ordre aléatoire (selon la graine) : trié « du plus loin de leur capitale au plus proche », il envoyait leurs éclaireurs d'abord vers le bord
        // opposé de la carte, là où se trouvent toujours les Meumeu — la capitale meumeu était connue dès le jour 3 (mesuré, joueur passif).
        {const G=B.reconGrid;for(let k=G.length-1;k>0;k--){const m=Math.floor(this.rand()*(k+1));[G[k],G[m]]=[G[m],G[k]];}}}
        // La mémoire d'abord : ce qu'ils ont déjà vu et dont l'observation vieillit (plus d'un jour) mérite une reconnaissance sur place ;
        // à défaut, la grille explore les secteurs jamais visités. Sans cela, le renseignement périmé (4 jours) éteint toute offensive.
        const old=Object.values(B.known||{}).filter(I=>typeof I==='object'&&!I.ruin&&I.done&&t-I.t>DAY).sort((p,q)=>p.t-q.t);
        const memo=old.length&&((B.reconN||0)%3!==2)?old[Math.min(old.length-1,Math.floor(this.rand()*Math.min(3,old.length)))]:null;
        const target=memo?[memo.x,memo.y]:B.reconGrid[(B.reconN||0)%B.reconGrid.length];B.reconN=(B.reconN||0)+1;const point=this.freeSpot(...target,8),radius=Math.hypot(point[0]-c.x,point[1]-c.y),route=this.reachablePatrol(c,point);
        if(route.length)for(const u of free.slice(0,2)){u.task={kind:'search',pts:route,i:0,scout:1,until:t+24+radius,home:[c.x,c.y]};u.path=null;}}
    }
  },
  reachablePatrol(c,p){const N=this.N,cl=v=>Math.max(0,Math.min(N-1,Math.floor(v))),cost=this.costFn('beee'),ti=cl(p[0]),tj=cl(p[1]);
    const home=this.freeSpot(c.x,c.y,8);{const L=this.landComp(),q=this.walkTarget({x:home[0],y:home[1]},p[0],p[1]);if(!q||L[cl(q[1])*N+cl(q[0])]!==L[cl(home[1])*N+cl(home[0])])return [];}   // (une autre rive : pas à pied)
    const r=this.pather.find(cl(home[0]),cl(home[1]),ti,tj,cost,k=>Math.abs(k%N-ti)<=2&&Math.abs((k/N|0)-tj)<=2&&cost(k)!==Infinity,100000);
    if(!r.done||r.path.length<4)return [];const pts=r.path.filter((_,n)=>n%15===0).map(([x,y])=>[x+.5,y+.5]);const end=r.path.at(-1);pts.push([end[0]+.5,end[1]+.5]);return [...pts,...pts.slice(0,-1).reverse(),home];
  },
  // Les défenseurs autour d'un point, d'après les relevés datés. Chaque relevé compte les soldats à 18 cases DE SON bâtiment : les mêmes
  // soldats figurent dans tous les relevés d'une base (mesuré : jusqu'à 7 fois trop dans la somme). On garde le plus fort relevé, plus les
  // ouvrages de défense (chacun est un bâtiment distinct).
  defendersAt(x,y){let seen=0,works=0;for(const I of Object.values(this.s.beee.known||{})){if(typeof I!=='object'||I.ruin||this.t-I.t>DAY*3)continue;if(Math.hypot(I.x-x,I.y-y)<35){seen=Math.max(seen,I.troops);works+=I.defense;}}
    // (et les pertes que leur a coûtées ce secteur : ce qui les a tués était là, même s'ils ne l'ont pas vu)
    const lost=(this.s.beee.lossAt||[]).filter(p=>this.t-p.t<DAY*3&&Math.hypot(p.x-x,p.y-y)<45).length;return Math.max(seen,Math.ceil(lost*.35))+works;},
  beeePlanRaid(from,guard,aimed=[],small=false){const avail=guard.length;if(avail<4)return null;const weights={centre:5,gare:7,mine:5,arsenal:6,poudrerie:6,labo:6,centre_recherche:6,armurerie:5,entrepot:5,camp:3,moulin:4,atelier:4,manufacture:5,caserne:4,tour:1};   // (V12.7 : la recherche meumeu — ses savants, ses programmes — est une cible)
    /* (V12.5) seulement une cible sur la même terre : sur la carte mer, les colonnes visaient l'autre rive et restaient « en rassemblement » des semaines
       (mesuré : 230 à 510 soldats immobiles, jusqu'à 22 jours) — la mer, c'est l'affaire de la flotte (amphibee.js) */
    const L=this.landComp(),N=this.N,home=L[Math.floor(from.y)*N+Math.floor(from.x)];
    const candidates=[];for(const I of Object.values(this.s.beee.known||{})){if(typeof I!=='object'||I.ruin||!I.done||this.t-I.t>DAY*4||aimed.some(p=>Math.hypot(p[0]-I.x,p[1]-I.y)<25))continue;
      if(home>=0&&L[Math.floor(I.y)*N+Math.floor(I.x)]!==home)continue;
      // un relevé plus vieux dit moins bien ce qui garde la base : la marge grandit avec son âge (un demi-soldat par jour)
      const def=this.defendersAt(I.x,I.y),need=small?Math.max(4,Math.ceil(def*1.6+2+(this.t-I.t)/DAY*.5)):Math.max(this.raidK().armyMin,Math.ceil(def*this.raidK().odds+4+(this.t-I.t)/DAY*.5));if(need>avail)continue;   // small : les commandos de sabotage gardent l'ancien calcul
      const target=this.building(I.id);if(!target)continue;const distance=Math.hypot(I.x-from.x,I.y-from.y),age=(this.t-I.t)/DAY;
      candidates.push({target,at:[I.x,I.y],def,need,aim:I.capital?'finale':distance<90?'avant-poste':'affaiblir',s:(weights[I.k]||2)/(1+distance/90)/(1+def*.25)/(1+age*.5),size:avail});}
    candidates.sort((a,b)=>b.s-a.s);return candidates[0]||null;
  },
  beeeRally(pool,at){const x=pool.reduce((n,u)=>n+u.x,0)/pool.length,y=pool.reduce((n,u)=>n+u.y,0)/pool.length,d=Math.hypot(at[0]-x,at[1]-y)||1;return this.freeSpot(x+(at[0]-x)*Math.min(.35,18/d),y+(at[1]-y)*Math.min(.35,18/d),8);},
  beeeSabotage(cities){const B=this.s.beee;if(this.light()>.35||this.t<(B.sabT||0))return;B.sabT=this.t+DAY;
    const plan=cities.map(c=>({c,g:this.beeeGuards(c)})).filter(q=>q.g.length>this.beeeGarrisonMin(q.c)+3).map(q=>({...q,plan:this.beeePlanRaid(q.c,q.g,[],true)})).find(q=>q.plan&&['gare','mine','arsenal','entrepot','poudrerie'].includes(q.plan.target.k));if(!plan)return;
    const n=Math.floor(this.take('beee',plan.c.x,plan.c.y,'explosifs',2,40));for(const u of plan.g.slice(0,n)){u.charges=1;u.fuse=1;u.task={kind:'sabotage',b:plan.plan.target.id,back:[plan.c.x,plan.c.y]};u.path=null;}
  },
  beeeStaff(cities,offense=true){const B=this.s.beee;if(!this.atWar||!cities.length)return;B.bands??=[];B.defT=(B.defT||0)+this.dt;if(B.defT>=.25){B.defT=0;this.beeeDefend(cities);}B.staffT=(B.staffT||0)+this.dt;if(B.staffT<1)return;B.staffT=0;
    this.beeeGarrison(cities);this.beeeCounterBattery(cities);this.beeeRetake(cities);this.beeeFortify(cities);this.beeeRecon(cities);this.beeeHeavy(cities);this.beeeSawArmor();this.beeeSabotage(cities);
    // Les colonnes en route (ni repliées, ni défense, ni contre-batterie, ni diversion). Une colonne de plus part seulement si le surplus
    // restant en vaut une, et jusqu'à trois à la fois.
    const cols=B.bands.filter(b=>b.state!=='repli'&&b.kind!=='defense'&&b.kind!=='contre'&&b.aim!=='diversion');
    const K=this.raidK();if(!offense||this.t<(B.nextWave||0)||cols.length>=K.maxcol)return;
    const groups=cities.map(c=>({c,g:this.beeeTroops(c).filter(u=>u.task?.kind!=='assault')})).map(q=>({...q,g:q.g.slice(0,Math.max(0,q.g.length-Math.max(3,Math.ceil(this.beeeGarrisonMin(q.c)*K.keep))))})).sort((a,b)=>b.g.length-a.g.length),from=groups[0]?.c;if(!from)return;
    const mobile=groups.filter(q=>distance(q.c,from)<240).flatMap(q=>q.g);if(mobile.length<K.armyMin)return;   // pas d'armée tant qu'elle ne serait pas massive : on rassemble, on ne fait pas partir de petits groupes
    const plan=this.beeePlanRaid(from,mobile);if(!plan){B.nextWave=this.t+4;return;}
    const main=mobile.slice().sort((a,b)=>Math.hypot(a.x-plan.at[0],a.y-plan.at[1])-Math.hypot(b.x-plan.at[0],b.y-plan.at[1])).slice(0,plan.size),band=this.makeBand(main,plan.target,from);
    band.aim=plan.aim;band.state='rassemblement';band.rally=this.beeeRally(main,plan.at);band.patience=6;band.intelAt=this.t;B.waves=(B.waves||0)+1;B.nextWave=this.t+DAY*K.gap;
    // (plus de groupe de diversion : une armée, un objectif)
  }
};
