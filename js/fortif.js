// Oberkommando der Meumeu — l'état-major bèè et la côte : un PLAN D'ENSEMBLE, pas des bunkers posés au hasard.
// Sur la carte « mer », la côte des Bèè est longue (plus de 2 000 cases) : l'IA la découpe en SECTEURS (une cinquantaine de cases de plage), évalue la menace de chacun
// (la mer d'en face, les barges vues, les obus reçus), et bâtit pour chaque secteur le même ENSEMBLE FORTIFIÉ en couches, dans cet ordre :
//   dépôt de secteur (le ravitaillement des ouvrages : sans lui, rien ne se bâtit ni ne tire)  →  couche 1 : la plage — mines (bande de sable mouillé), sacs de sable (profondeur 8),
//   fosses et boyaux (10), bunkers en quinconce aux champs de tir croisés (13 à 17)  →  couche 2 : casemates à canon à 40, observatoires, poste de commandement à 30  →
//   couche 3 : batteries casematées et casemates lourdes à l'intérieur des terres (60 à 90), qui couvrent la plage et la première ligne si elle cède.
// « Profondeur » : la distance de la case à l'eau (G.dcoast). Les ouvrages se posent aux profondeurs voulues, tournés vers la mer ; la garnison vient des villes voisines.
// Rien ne triche : mêmes coûts, mêmes matériaux, mêmes bâtisseurs, même ravitaillement que le joueur.
import {BUILDINGS,T,TERRAIN,LINES,HOUR_REAL} from './data.js';
import {bunkerPlan,bunkerKey} from './bunkerdata.js';
import {VEHDEF} from './vehicules.js';
const BEEE_FORT_DAY=6;   // pas de bunkers avant le jour 6 (la base d'abord)

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
const SEC=48;   // côté d'un bloc de secteur (cases)

// la gamme d'ouvrages : de l'ouvrage léger de première ligne aux batteries ; `tier` : à partir de quand on les bâtit
export const FORT_KIT={
  line1:['tobrouk','poste_mg','blockhaus_s','poste_mg','double_mg','blockhaus_m','tobrouk','blockhaus_rond'],   // la première ligne : une variété, de l'ouvrage à une pièce au blockhaus de huit tireurs
  line2:['casemate_canon','blockhaus_l','blockhaus_m'],
  obs:'observatoire',cmd:'poste_commandement',mortar:'fosse_mortier',
  heavy:['casemate_lourde','batterie'],
};

export const BEEE_FORT={
  // ---------- la côte et ses secteurs ----------
  fortActive(){return this.G?.mode==='mer'&&!!this.G.dcoast;},
  // les secteurs de la côte des Bèè : un par bloc de SEC × SEC cases qui contient du « contour » (la ligne de profondeur 12) ; pour chacun : le centre du contour, le sens de la mer
  // (n : vers l'intérieur des terres), la tangente (t, le long de la plage), l'étendue le long de la plage, la menace de base
  fortSectors(){if(this._fsec)return this._fsec;const N=this.N,dc=this.G.dcoast,ter=this.G.terrain,[x0,y0,x1,y1]=this.bounds;const blocks=new Map();
    // le territoire bèè : la moitié est de la carte (le côté des Bèè), d'où part la mer ; les cases de terre à profondeur 12 forment la ligne
    for(let j=y0;j<y1;j++)for(let i=Math.floor(N/2);i<x1;i++){const k=j*N+i;if(dc[k]<12||dc[k]>13)continue;const t=ter[k];if(t<T.sand||t>T.scrub)continue;const bk=Math.floor((j-y0)/SEC)*64+Math.floor((i-Math.floor(N/2))/SEC);let a=blocks.get(bk);if(!a)blocks.set(bk,a=[]);a.push(k);}
    const out=[];for(const [bk,cells] of blocks){if(cells.length<14)continue;let mx=0,my=0;for(const k of cells){mx+=k%N+.5;my+=((k/N)|0)+.5;}mx/=cells.length;my/=cells.length;
      // le sens vers l'intérieur : le gradient moyen de la profondeur
      let gx=0,gy=0;for(const k of cells){const i=k%N,j=(k/N)|0;gx+=dc[j*N+Math.min(N-1,i+3)]-dc[j*N+Math.max(0,i-3)];gy+=dc[Math.min(N-1,j+3)*N+i]-dc[Math.max(0,j-3)*N+i];}
      const gl=Math.hypot(gx,gy);if(gl<cells.length*.9)continue;const nx=gx/gl,ny=gy/gl,tx=-ny,ty=nx;
      let smin=1e9,smax=-1e9;for(const k of cells){const s=(k%N+.5-mx)*tx+(((k/N)|0)+.5-my)*ty;smin=Math.min(smin,s);smax=Math.max(smax,s);}
      if(smax-smin<20)continue;
      // la menace de base : une côte qui regarde la mer centrale (le sens vers la mer pointe vers l'ouest) fait face aux Meumeu ; les côtes extérieures sont plus calmes
      const base=nx>.6?3:nx>.2?2:1;   // (n pointe vers l'intérieur des terres : vers l'est sur la côte qui fait face à la mer centrale et aux Meumeu)
      out.push({id:'s'+bk,cx:mx,cy:my,nx,ny,tx,ty,smin:smin+4,smax:smax-4,len:smax-smin,base,threat:0,el:null,placed:0});}
    // du plus menacé au moins menacé, puis du nord au sud
    out.sort((a,b)=>b.base-a.base||a.cy-b.cy);this._fsec=out;return out;},
  // un point de la côte d'un secteur : à l'abscisse s le long de la plage (depuis le centre du contour) et à la profondeur d (cases de l'eau) ; null si hors terre
  fortPoint(sec,s,d){const N=this.N,dc=this.G.dcoast,ter=this.G.terrain;let x=sec.cx+sec.tx*s,y=sec.cy+sec.ty*s;
    for(let q=0;q<70;q++){const i=Math.floor(x),j=Math.floor(y);if(i<2||j<2||i>=N-2||j>=N-2)return null;const here=dc[j*N+i];if(here<0)return null;if(Math.abs(here-d)<=1)break;const st=here<d?1:-1;x+=sec.nx*st;y+=sec.ny*st;}
    const i=Math.floor(x),j=Math.floor(y);if(i<2||j<2||i>=N-2||j>=N-2)return null;const k=j*N+i;if(Math.abs(dc[k]-d)>2||ter[k]<T.sand||ter[k]>T.scrub)return null;return [x,y];},
  // la rotation d'un bunker pour que ses embrasures regardent la mer : le « front » du plan (rot 0 : vers le haut, -j) tourne dans le sens des aiguilles
  fortRot(sec){const fx=-sec.nx,fy=-sec.ny;const dirs=[[0,-1],[1,0],[0,1],[-1,0]];let best=0,bd=-9;for(let r=0;r<4;r++){const d=dirs[r][0]*fx+dirs[r][1]*fy;if(d>bd){bd=d;best=r;}}return best;},

  // ---------- le plan d'ensemble d'un secteur ----------
  // une liste d'éléments, chacun : {key, tier, kind:'camp'|'bunker'|'line'|'mines', type, x, y, rot, line, cells, done}
  // tier 1 : le dépôt, la plage (sacs, premiers bunkers) ; tier 2 : bunkers de remplissage, fosses, mines ; tier 3 : casemates, observatoires, commandement ; tier 4 : batteries.
  fortPlan(sec){if(sec.el)return sec.el;{const F=this.s.beee.fort;const saved=F?.plans?.[sec.id];if(saved){sec.el=saved;return saved;}}const el=[];const rot=this.fortRot(sec);let n=0;const key=()=>sec.id+':'+(n++);
    const span=sec.smax-sec.smin;
    // --- le dépôt de sector : un camp-dépôt (gratuit) au centre, à 26 de l'eau
    {const p=this.fortPoint(sec,(sec.smin+sec.smax)/2,26);if(p)el.push({key:key(),tier:1,kind:'camp',x:p[0],y:p[1]});}
    // --- les sacs de sable : une ligne continue à la profondeur 8 (de bord à bord), plus tard doublée
    {const cells=[];for(let s=sec.smin;s<=sec.smax;s+=1){const p=this.fortPoint(sec,s,8);if(p)cells.push([Math.floor(p[0]),Math.floor(p[1])]);}if(cells.length>10)el.push({key:key(),tier:1,kind:'line',line:'sacs',cells:this.fortUniq(cells)});}
    // --- les premiers bunkers : tous les 18 cases, à la profondeur 15 ; la gamme tourne
    const nB=Math.max(2,Math.floor(span/18));for(let q=0;q<nB;q++){const s=sec.smin+(q+.5)*span/nB;const p=this.fortPoint(sec,s,15);if(p)el.push({key:key(),tier:1,kind:'bunker',type:FORT_KIT.line1[q%FORT_KIT.line1.length],x:p[0],y:p[1],rot,s});}
    // --- tier 2 : des bunkers entre les premiers (champs de tir croisés), la fosse-boyau qui les relie, les mines de la bande mouillée
    for(let q=0;q<nB;q++){const s=sec.smin+(q+1)*span/nB;if(s>sec.smax-4)continue;const p=this.fortPoint(sec,s,14);if(p)el.push({key:key(),tier:2,kind:'bunker',type:FORT_KIT.line1[(q+3)%FORT_KIT.line1.length],x:p[0],y:p[1],rot,s});}
    {const cells=[];for(let s=sec.smin;s<=sec.smax;s+=1){const p=this.fortPoint(sec,s,10);if(p)cells.push([Math.floor(p[0]),Math.floor(p[1])]);}if(cells.length>10)el.push({key:key(),tier:2,kind:'line',line:'fosses',cells:this.fortUniq(cells)});}
    if(false)for(let band=0;band<2;band++){const cells=[];   // (les mines : retirées du plan bèè, demande du joueur — trop complexe pour ce qu'elles apportent)
for(let s=sec.smin;s<=sec.smax;s+=2)for(const d of band?[4,6]:[3,5]){const p=this.fortPoint(sec,s+(d%2?0:1),d);if(p)cells.push([Math.floor(p[0]),Math.floor(p[1])]);}const u=this.fortUniq(cells);if(u.length>8)el.push({key:key(),tier:2+band,kind:'mines',cells:u});}
    // --- tier 3 : la défense en profondeur
    for(let q=0;q<Math.max(1,Math.floor(span/48));q++){const s=sec.smin+(q+.5)*span/Math.max(1,Math.floor(span/48));const p=this.fortPoint(sec,s,40);if(p)el.push({key:key(),tier:3,kind:'bunker',type:FORT_KIT.line2[q%FORT_KIT.line2.length],x:p[0],y:p[1],rot,s});}
    for(const e of [-1,1]){const p=this.fortPoint(sec,e<0?sec.smin+2:sec.smax-2,22);if(p)el.push({key:key(),tier:3,kind:'bunker',type:FORT_KIT.obs,x:p[0],y:p[1],rot,s:e});}
    {const p=this.fortPoint(sec,(sec.smin+sec.smax)/2,32);if(p)el.push({key:key(),tier:3,kind:'bunker',type:FORT_KIT.cmd,x:p[0],y:p[1],rot});}
    for(const e of [-.3,.3]){const p=this.fortPoint(sec,(sec.smin+sec.smax)/2+e*span,30);if(p)el.push({key:key(),tier:3,kind:'bunker',type:FORT_KIT.mortar,x:p[0],y:p[1],rot});}
    // --- tier 4 : les batteries à l'intérieur, qui couvrent la plage et la première ligne
    {const p=this.fortPoint(sec,(sec.smin+sec.smax)/2,75);if(p)el.push({key:key(),tier:4,kind:'bunker',type:'batterie',x:p[0],y:p[1],rot});}
    for(const e of [-.28,.28]){const p=this.fortPoint(sec,(sec.smin+sec.smax)/2+e*span,58);if(p)el.push({key:key(),tier:4,kind:'bunker',type:'casemate_lourde',x:p[0],y:p[1],rot});}
    sec.el=el;{const F=(this.s.beee.fort??={on:false,t:-99,count:0});(F.plans??={})[sec.id]=el;}   // (le plan est dans la sauvegarde : un rechargement ne pose pas les ouvrages une deuxième fois)
    return el;},
  fortUniq(cells){const seen=new Set(),out=[];for(const [i,j] of cells){const k=j*this.N+i;if(seen.has(k))continue;seen.add(k);out.push([i,j]);}return out;},
  // ---------- l'exécution ----------
  fortTierAllowed(){const d=this.day;return 1+(d>=11?1:0)+(d>=17?1:0)+(d>=25?1:0);},
  // le prix d'un élément (en marchandises)
  fortCost(el){if(el.kind==='bunker')return BUILDINGS[bunkerKey(el.type)].cost;if(el.kind==='camp')return {};if(el.kind==='mines')return {mine:el.cells.length};const L=LINES[el.line].cost,out={};for(const [k,v] of Object.entries(L))out[k]=v*el.cells.length;return out;},
  // un élément est fait : le bâtiment terminé, ou toutes les cases du tracé posées
  fortDone(el){if(!el.placed)return false;if(el.kind==='bunker'||el.kind==='camp'){const b=this.building(el.pid);return !!b&&b.done&&!b.ruin;}
    const store=this.lineStore(el.kind==='mines'?'mines':el.line);return el.keys.every(k=>store[k]?.b);},
  // le bâtiment d'un élément est détruit ou a disparu : on le replace
  fortLost(el){if(!el.placed)return false;if(el.kind==='bunker'||el.kind==='camp'){const b=this.building(el.pid);return !b;}return false;},
  // la menace d'un secteur : celle de base, plus ce qu'on y a vu venir (des barges à moins de 140 cases) ; elle retombe d'un quart par jour
  fortThreatTick(){const t=this.s.t,F=this.s.beee.fort;if(t-(F.thT||-99)<6)return;const dtD=Math.min(2,(t-(F.thT||t))/24);F.thT=t;const secs=this.fortSectors();
    for(const sec of secs)sec.threat*=Math.pow(.75,dtD);
    for(const v of this.s.vehicles){if(v.f!=='meumeu'||v.hp<=0)continue;const V=VEHDEF[v.k];if(!(V?.nav==='eau'||V?.air))continue;if(!this.vehSeen('beee',v)&&!(v.f==='meumeu'&&this.s.fog===false&&false))continue;
      for(const sec of secs){const d=dist(v.x,v.y,sec.cx,sec.cy);if(d<140)sec.threat=Math.min(8,sec.threat+(1-d/140)*2.5);}}},
  fortNearestCity(x,y){let best=1e9;for(const c of this.s.beee.cities){if(c.fallen)continue;const d=dist(x,y,c.x,c.y);if(d<best)best=d;}return best;},
  fortScore(sec){return sec.base*10+sec.threat*6-this.fortNearestCity(sec.cx,sec.cy)/25;},
  // l'état-major : toutes les deux heures, il ouvre de nouveaux ouvrages là où la menace est la plus forte et où il en a les moyens
  fortTick(){if(!this.fortActive())return;const B=this.s.beee,F=B.fort??={on:false,t:-99,count:0};const t=this.s.t;if(t-F.t<2)return;F.t=t;
    const plan=B.plan;if(!plan?.nat)return;const cities=B.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);
    // la base d'abord : des villes, une caserne, un arsenal, une manufacture, des vivres ; jamais de bunkers avant
    const base=cities.length>=4&&this.day>=(BEEE_FORT_DAY)&&['caserne','arsenal','manufacture'].every(k=>this.beeeBuildings(k).some(b=>b.done));   // (pas de verrou sur la réserve de vivres : elle oscille autour de 0,6 sans famine et bloquait tout jusqu'au jour 15)
    F.on=base;this.fortMaintain();if(!base)return;
    this.fortThreatTick();const secs=this.fortSectors().slice();secs.sort((a,z)=>this.fortScore(z)-this.fortScore(a));
    const tierMax=Math.min(4,this.fortTierAllowed()+1),nat=plan.nat;const reserve={pierre:130,fer:60,bois:110,pieces:40,mine:0};for(const [k,n] of Object.entries(this.amphiBeeReserve?.()||{}))reserve[k]=(reserve[k]||0)+n;   // (la flotte d'assaut a sa part : la côte ne prend pas tout)
    // ce qui est en cours (éléments posés, pas finis)
    let open=0;const perSec=new Map();for(const sec of secs){if(!sec.el)continue;let n=0;for(const el of sec.el){if(!el.placed)continue;if(this.fortLost(el)){el.placed=false;el.pid=null;continue;}if(!this.fortDone(el)){n++;open++;}}perSec.set(sec.id,n);}
    const maxConc=Math.min(30,6+Math.floor(cities.length/2)+this.beeeLevel()*2);let started=0;
    for(const sec of secs.slice(0,6+Math.floor(cities.length/2))){if(open+started>=maxConc)break;const els=this.fortPlan(sec);if(!els.length)continue;
      const tierHere=Math.min(4,tierMax+(sec.threat>3?1:0));let secOpen=perSec.get(sec.id)||0;
      for(let tier=1;tier<=tierHere&&open+started<maxConc&&secOpen<(sec.threat>3?6:4);tier++){
        const prev=els.filter(e=>e.tier===tier-1&&!e.failed),prevDone=prev.filter(e=>this.fortDone(e)).length;if(tier>1&&prev.length&&prevDone<prev.length*.7)break;
        const campEl=els.find(e=>e.kind==='camp'),campOk=!campEl||campEl.placed&&this.fortDone(campEl);
        for(const el of els){if(el.tier!==tier||el.placed||el.failed||(el.retryT||0)>t)continue;if(el.kind!=='camp'&&!campOk)continue;if(open+started>=maxConc||secOpen>=(sec.threat>3?6:4))break;
          // un camp avant tout : sans dépôt à moins de 36 cases, rien ne se bâtit
          const cost=this.fortCost(el);let afford=true;for(const [k,n] of Object.entries(cost))if((nat[k]||0)<n*.45+(reserve[k]||0)){afford=false;break;}if(!afford){el.retryT=t+6;continue;}
          if(this.fortPlace(el,sec)){started++;secOpen++;F.count++;}else{el.fails=(el.fails||0)+1;el.retryT=t+10+el.fails*6;if(el.fails>=4)el.failed=true;}}}}
    // les ouvrages détruits ou en ruine reprennent par les réparations (voir beeeLabour) ; les lignes dont des cases ont sauté sont retracées une fois par jour
    if(t-(F.relayT||0)>24){F.relayT=t;for(const sec of secs){if(!sec.el)continue;for(const el of sec.el){if(!el.placed||(el.kind!=='line'&&el.kind!=='mines'))continue;const store=this.lineStore(el.kind==='mines'?'mines':el.line);if(!el.keys.some(k=>!store[k])||!this.fortDone(el)&&el.keys.some(k=>store[k]))continue;
        if(el.keys.every(k=>!store[k]||store[k].b)&&el.keys.some(k=>!store[k])){const r=this.planLine('beee',el.kind==='mines'?'mines':el.line,el.cells);if(r.n){el.keys=this.fortKeys(el.cells);this.fortWorkers(el);}}}}}
    this.fortGarrison();this.fortArm();},
  // les chantiers en cours gardent leurs ouvriers : deux bâtisseurs par ouvrage, trois poseurs par ligne (ils viennent des villes voisines)
  fortMaintain(){for(const sec of this._fsec||[]){if(!sec.el)continue;for(const el of sec.el){if(!el.placed)continue;if(this.fortLost(el)){el.placed=false;el.pid=null;continue;}if(this.fortDone(el))continue;
      if(el.kind==='bunker'||el.kind==='camp'){const b=this.building(el.pid);const have=this.s.units.filter(u=>u.task?.b===b.id&&u.task.kind==='build').length;for(const u of this.beeeAvailable(b.i,b.j,600).slice(0,Math.max(0,4-have)))this.beeeAssign(u,{kind:'build',b:b.id});}
      else this.fortWorkers(el);}this.fortSupply(sec);}},
  // le dépôt d'un secteur réclame au fret ce que demandent ses lignes en cours (les ouvrages ont leur propre commande de chantier)
  fortSupply(sec){const campEl=sec.el?.find(e=>e.kind==='camp');const camp=campEl?.placed&&this.building(campEl.pid);if(!camp?.done)return;const want={pierre:30,bois:20};
    for(const el of sec.el){if(!el.placed||this.fortDone(el)||(el.kind!=='line'&&el.kind!=='mines'))continue;const st=this.lineStore(el.kind==='mines'?'mines':el.line);const left=el.keys.filter(k=>st[k]&&!st[k].b).length;const c=LINES[el.kind==='mines'?'mines':el.line].cost;for(const [k,v] of Object.entries(c))want[k]=(want[k]||0)+Math.min(80,v*left);}
    camp.want=want;camp.prio=6;},
  // ---------- (V12.5, demande du joueur) les bunkers des villes ----------
  // Toutes les cartes : chaque ville bèè reçoit une ceinture d'ouvrages, à 16 cases de son centre (× l'échelle de la carte) — quatre bunkers légers aux quatre
  // points cardinaux, puis deux de plus et une casemate à canon (24 cases) tournés vers la menace (le bâtiment meumeu connu le plus proche, sinon le milieu de
  // la carte) ; la capitale et les villes de plus de 8 bâtiments en ont deux de plus. Mêmes coûts, mêmes bâtisseurs, mêmes armes et même garnison que les
  // ouvrages de côte. Ils viennent après la base (caserne, arsenal), 4 chantiers à la fois plus un par trois villes, et la côte garde sa réserve.
  cityFortPlan(c){const B=this.s.beee,P=(B.cityForts??={});if(P[c.id])return P[c.id];const K=this.mapK||1,R=16*K;
    const known=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&B.known?.[b.id]).sort((a,z)=>dist(a.i,a.j,c.x,c.y)-dist(z.i,z.j,c.x,c.y))[0];
    const tx=known?known.i:this.N/2,ty=known?known.j:this.N/2,ta=Math.atan2(ty-c.y,tx-c.x);
    const big=c.centre===B.cities[0]?.centre||this.s.buildings.filter(b=>b.f==='beee'&&!b.ruin&&dist(b.i,b.j,c.x,c.y)<30).length>8;
    const els=[];let n=0;const add=(tier,a,r,type)=>{const ox=Math.cos(a),oy=Math.sin(a);els.push({key:'c'+c.id+':'+(n++),tier,kind:'bunker',type,x:c.x+ox*r,y:c.y+oy*r,rot:this.fortRot({nx:-ox,ny:-oy})});};
    [0,1,2,3].forEach(q=>add(1,q*Math.PI/2+Math.PI/4,R,FORT_KIT.line1[q%FORT_KIT.line1.length]));
    add(2,ta-.45,R,'double_mg');add(2,ta+.45,R,'blockhaus_m');add(2,ta,R*1.5,'casemate_canon');
    if(big){add(3,ta-1.2,R*1.2,'blockhaus_l');add(3,ta+1.2,R*1.2,'tobrouk');}
    return P[c.id]={els};},
  cityFortTick(){const B=this.s.beee,t=this.s.t;if(!this.atWar&&this.day<8)return;if(t-(B.cityFortT??-99)<3)return;B.cityFortT=t;B.fort??={on:false,t:-99,count:0};
    const plan=B.plan;if(!plan?.nat)return;const cities=B.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);
    if(this.day<6||!['caserne','arsenal'].every(k=>this.beeeBuildings(k).some(b=>b.done)))return;
    const reserve={pierre:130,fer:60,bois:110,pieces:40};for(const [k,n] of Object.entries(this.amphiBeeReserve?.()||{}))reserve[k]=(reserve[k]||0)+n;
    let open=0;const all=[];for(const c of cities){const P=this.cityFortPlan(c);for(const el of P.els){if(el.placed&&this.fortLost(el)){el.placed=false;el.pid=null;}if(el.placed&&!this.fortDone(el)){open++;
        const b=this.building(el.pid);const have=this.s.units.filter(u=>u.task?.b===b.id&&u.task.kind==='build').length;for(const u of this.beeeAvailable(b.i,b.j,300).slice(0,Math.max(0,3-have)))this.beeeAssign(u,{kind:'build',b:b.id});}}all.push([c,P]);}
    /* (en largeur : la première couronne de toutes les villes avant la suivante — mesuré : ville par ville, 3 villes sur 8 en avaient à J26) */
    const tierMax=1+(this.day>=12?1:0)+(this.day>=20?1:0),maxOpen=4+Math.floor(cities.length/3);
    for(let tier=1;tier<=tierMax&&open<maxOpen;tier++)for(const [c,P] of all){if(open>=maxOpen)break;{const prev=P.els.filter(e=>e.tier===tier-1&&!e.failed);if(tier>1&&prev.some(e=>!this.fortDone(e)))continue;
        for(const el of P.els){if(el.tier!==tier||el.placed||el.failed||(el.retryT||0)>t||open>=maxOpen)continue;
          const cost=this.fortCost(el);if(Object.entries(cost).some(([k,n])=>(plan.nat[k]||0)<n*.45+(reserve[k]||0))){el.retryT=t+6;continue;}
          if(this.fortPlace(el,null)){open++;B.fort.count++;}else{el.fails=(el.fails||0)+1;el.retryT=t+10+el.fails*6;if(el.fails>=4)el.failed=true;}}}}
    if(!this.fortActive()){this.fortGarrison();this.fortArm();}},
  // ---------- l'armement des ouvrages ----------
  // l'emplacement de pièce d'un Tobrouk reçoit une mitrailleuse lourde ; celui d'une casemate, d'une fosse ou d'une batterie un canon ; dans les blockhaus, les premiers postes de
  // tir (selon le type) reçoivent un fusil-mitrailleur ; une arme servie a ses servants (les camarades de l'ouvrage, à la case voisine de la pièce)
  fortHeavyOf(type){return {tobrouk:'bee_mg_lourde',tobrouk_double:'bee_mg_lourde',fosse_mortier:'bee_canon',casemate_canon:'bee_canon',casemate_lourde:'bee_canon',batterie:'bee_canon'}[type]||null;},
  fortMgPosts(type){return {poste_mg:2,double_mg:2,blockhaus_s:1,blockhaus_m:2,blockhaus_l:3,fortin:4,blockhaus_rond:2,blockhaus_l_coin:2,poste_commandement:1}[type]||0;},
  // ce que les ouvrages (finis ou en chantier) réclament en armes : {id: nombre}
  fortArmsWant(){const out={};if(!this.fortActive?.()&&!this.s.beee.cityForts)return out;for(const b of this.s.buildings){if(b.f!=='beee'||b.ruin)continue;const id=BUILDINGS[b.k]?.bunker;if(!id)continue;
      const H=this.fortHeavyOf(id);const P=this.bunkerPlanOf(b);if(H){const n=P.posts.filter(p=>p.kind==='gun').length;const armed=this.fortArmedCount(b,H);out[H]=(out[H]||0)+Math.max(0,n-armed);}
      const m=this.fortMgPosts(id);if(m){out.bee_mg=(out.bee_mg||0)+Math.max(0,m-this.fortArmedCount(b,'bee_mg'));}}
    return out;},
  fortArmedCount(b,w){const o=b.occ||{};let n=0;for(const id of Object.values(o)){const u=this.unit(id);if(u&&u.w===w)n++;}return n;},
  // changer l'arme d'un Bèè : l'ancienne rendue au dépôt le plus proche, la nouvelle prise dans les dépôts (jusqu'à 450 cases : un convoi la porte), avec ses munitions
  fortRearm(u,w,x,y){const W=this.W(w);if(!W||u.w===w)return false;const got=this.take('beee',x,y,'a:'+w,1,450);if(got<1)return false;
    const D=this.depots('beee',x,y,450)[0];if(D&&u.w){this.put(D,'a:'+u.w,1);const Wo=this.W(u.w);const back=((u.mag||0)+(u.pouch||0))/Math.max(1,Wo?.perCrate||1);if(back>0)this.put(D,'m:'+u.w,back);}
    u.w=w;u.mag=0;u.pouch=0;const crates=this.take('beee',x,y,'m:'+w,Math.max(.2,W.carry/Math.max(1,W.perCrate)),450);const rounds=Math.floor(crates*W.perCrate+1e-6);u.mag=Math.min(W.p.mag,rounds);u.pouch=Math.max(0,rounds-u.mag);u.heavy=W.crew>1;return true;},
  fortArm(){const t=this.s.t,F=this.s.beee.fort;if(!F||t-(F.armT||-99)<4)return;F.armT=t;
    for(const b of this.s.buildings){if(b.f!=='beee'||!b.done||b.ruin)continue;const id=BUILDINGS[b.k]?.bunker;if(!id)continue;const occ=this.bunkerOcc(b);const posts=this.bunkerPosts(b);const [bx,by]=[b.i+1,b.j+1];
      const H=this.fortHeavyOf(id);
      if(H){const W=this.W(H);for(const p of posts.filter(p=>p.kind==='gun')){const u=this.unit(occ[p.k]);if(!u)continue;if(u.w!==H&&!this.fortRearm(u,H,bx,by))continue;
          // les servants : les autres occupants de l'ouvrage (hors pièces), postés à côté de la pièce
          const need=Math.max(0,(W.crew||1)-1),have=this.s.units.filter(o=>o.serve===u.id&&o.hp>0).length;if(have>=need)continue;
          const mates=Object.values(occ).map(i=>this.unit(i)).filter(o=>o&&o!==u&&o.serve==null&&!(o.w&&this.W(o.w)?.crew>1)).sort((a,z)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(z.x-u.x,z.y-u.y)).slice(0,need-have);
          const P=this.bunkerPlanOf(b);const side=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]].map(([dx,dy])=>[p.i+dx,p.j+dy]).filter(([i,j])=>{const ch=P.at(i-b.i,j-b.j);return '.oA'.includes(ch);});
          mates.forEach((o,n)=>{o.serve=u.id;o.servant=true;const c=side[n%Math.max(1,side.length)];if(c&&o.task){o.task.tx=c[0]+.5;o.task.ty=c[1]+.5;o.path=null;o.goal=null;}});}}
      const m=this.fortMgPosts(id);if(m){let have=this.fortArmedCount(b,'bee_mg');for(const p of posts.filter(p=>p.kind==='tir')){if(have>=m)break;const u=this.unit(occ[p.k]);if(!u||u.w==='bee_mg'||u.serve!=null)continue;if(this.fortRearm(u,'bee_mg',bx,by))have++;}}}},
  fortKeys(cells){return cells.map(([i,j])=>j*this.N+i);},
  // pose un élément : un bâtiment (au plus près de l'endroit voulu, tourné vers la mer) ou une ligne ; les bâtisseurs de la ville voisine y vont
  fortPlace(el,sec){const t=this.s.t;
    if(el.kind==='camp'){const b=this.beeeBuild('camp',el.x,el.y,8);if(!b)return false;el.placed=true;el.pid=b.id;return true;}
    if(el.kind==='bunker'){const id=BUILDINGS[bunkerKey(el.type)].bunker,key=bunkerKey(el.type);const [w,h]=this.bunkerSize(id,el.rot);const ci=Math.round(el.x-w/2),cj=Math.round(el.y-h/2);
      for(let r=0;r<=6;r++)for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){if(r&&Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const i=ci+dx,j=cj+dy;if(!this.canPlace('beee',key,i,j,el.rot).ok)continue;
        const out=this.place('beee',key,i,j,el.rot);if(!out.ok)continue;const b=out.b;el.placed=true;el.pid=b.id;for(const u of this.beeeAvailable(b.i,b.j,600).slice(0,3))this.beeeAssign(u,{kind:'build',b:b.id});return true;}
      return false;}
    // les lignes : sacs, fosses, mines
    const kind=el.kind==='mines'?'mines':el.line;if(kind==='mines'&&(this.s.beee.plan?.nat?.mine||0)<Math.min(el.cells.length,24)*.5)return false;
    const r=this.planLine('beee',kind,el.cells);if(!r.ok)return false;el.placed=true;el.keys=this.fortKeys(el.cells);this.fortWorkers(el);return true;},
  // des poseurs pour une ligne : trois villageois, qui y vont chercher leurs matériaux au dépôt du secteur
  fortWorkers(el){const kind=el.kind==='mines'?'mines':el.line,store=this.lineStore(kind);const todo=el.cells.filter(([i,j])=>{const o=store[j*this.N+i];return o&&!o.b;});if(!todo.length)return;
    const [i0,j0]=todo[Math.floor(todo.length/2)];
    {const C=LINES[kind]?.cost||{};const five=Object.fromEntries(Object.entries(C).map(([r,q])=>[r,q*5]));if(!this.canPay('beee',i0,j0,five,450).ok)return;
     const civ=this.beeeCivilians().length,all=this.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='line').length;if(all>=Math.max(6,Math.floor(civ*.08)))return;}
    const busy=this.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='line'&&u.task.line===kind&&todo.some(([i,j])=>dist(i,j,u.x,u.y)<40)).length;
    for(let n=busy;n<5;n++){const u=this.beeeAvailable(i0,j0,600)[0];if(!u)break;const [ci,cj]=todo[Math.floor((n+.5)*todo.length/5)]||todo[0];this.beeeAssign(u,{kind:'line',line:kind,x:ci,y:cj,k:cj*this.N+ci});}},
  // ---------- la garnison ----------
  // les ouvrages terminés reçoivent leurs hommes : un par poste de tir, un par emplacement de pièce, un à la soute ; ils viennent des gardes des villes voisines
  fortGarrison(){const t=this.s.t,B=this.s.beee,F=B.fort;if(t-(F.gT||-99)<3)return;F.gT=t;let need=0,given=0;
    const pool=this.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&u.hp>0&&!u.band&&!u.sentry&&u.task?.kind==='guard'&&u.h?.state!=='hors');
    const forts=this.s.buildings.filter(b=>b.f==='beee'&&b.done&&!b.ruin&&BUILDINGS[b.k]?.bunker);
    for(const b of forts){const free=this.bunkerFree(b).filter(p=>p.kind==='tir'||p.kind==='gun'||p.kind==='soute');if(!free.length)continue;need+=free.length;
      // les plus proches, sans dépasser les garnisons minimales des villes (on ne déshabille pas une ville) : le reste vient des recrues à venir
      const cands=pool.filter(u=>!u.sentry).sort((a,z)=>dist(a.x,a.y,b.i,b.j)-dist(z.x,z.y,b.i,b.j)).filter(u=>dist(u.x,u.y,b.i,b.j)<110).slice(0,free.length);
      if(!cands.length)continue;const r=this.garrison(b,cands);if(r.ok){given+=cands.length;for(const u of cands){const k=pool.indexOf(u);if(k>=0)pool.splice(k,1);}}}
    F.need=Math.max(0,need-given);},
  // des soldats en plus pour tenir les ouvrages (voir les renforts de beeeTick)
  fortNeed(){return this.s.beee.fort?.need||0;},
  // la demande de mines de la fabrication : tant qu'un champ de mines est prévu ou en cours, la manufacture en fait
  fortMineWant(){return 0;const F=this.s.beee.fort;if(!F?.on)return 0;let w=0;for(const sec of this._fsec||[]){if(!sec.el)continue;for(const el of sec.el)if(el.kind==='mines'&&!el.failed&&!this.fortDone(el))w+=Math.min(40,el.cells.length);}return Math.min(70,w);},
  // un bilan (pour les tests et le journal)
  fortStats(){const out={sectors:0,open:0,bunkers:{},lines:{sacs:0,fosses:0,mines:0},total:0,garrison:0,posts:0};for(const sec of this._fsec||[]){if(!sec.el)continue;out.sectors++;let any=false;
      for(const el of sec.el){if(!el.placed)continue;any=true;if(el.kind==='bunker'&&this.fortDone(el)){out.bunkers[el.type]=(out.bunkers[el.type]||0)+1;out.total++;}else if(el.kind==='line'||el.kind==='mines'){const st=this.lineStore(el.kind==='mines'?'mines':el.line);const n=el.keys.filter(k=>st[k]?.b).length;out.lines[el.kind==='mines'?'mines':el.line]+=n;}}
      if(any&&sec.el.some(e=>e.placed&&!this.fortDone(e)))out.open++;}
    for(const b of this.s.buildings)if(b.f==='beee'&&b.done&&!b.ruin&&BUILDINGS[b.k]?.bunker){const o=this.bunkerOcc(b);out.garrison+=Object.keys(o).length;out.posts+=this.bunkerPosts(b).filter(p=>p.kind==='tir'||p.kind==='gun'||p.kind==='soute').length;}
    return out;},
};
