// Oberkommando der Meumeu — l'état-major bèè de l'assaut amphibie (la mécanique commune est dans amphi.js).
// Les Bèè ne trichent pas : ils construisent leurs bateaux sur leur plage, comme des bâtiments, rassemblent des soldats des villes proches,
// choisissent une plage en face (près d'une cible CONNUE de leur renseignement, sinon une plage au hasard) et lancent la flotte.
// À terre, les débarqués forment un groupe d'assaut (le même que celui des attaques par terre).
import {BUILDINGS} from './data.js';
import {VEHDEF} from './vehicules.js';

const BEE_AMPHI_DAY=22,BEE_AMPHI_BUNKERS=15,SITES=3;
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);

export const AMPHI_BEE={
  // ce que la flotte voulue coûte encore (bateaux ni à l'eau ni en chantier) : le programme côtier le laisse en réserve
  amphiBeeReserve(){if(this.G?.mode!=='mer'||this.day<BEE_AMPHI_DAY-6)return {};const miss=Math.max(0,Math.min(6,this.amphiBeeWant()-this.amphiBeeBoats().length-this.amphiBeeSites().length));
    const out={};for(const [k,n] of Object.entries(BUILDINGS.bateau_bee.cost))out[k]=n*miss;return out;},
  amphiBeeWant(){return Math.min(24,6+Math.floor(Math.max(0,this.day-BEE_AMPHI_DAY)/2));},
  amphiBeeBoats(){return this.s.vehicles.filter(v=>v.f==='beee'&&v.k==='bateau_bee'&&v.hp>0&&!v.dead);},
  // les bateaux en chantier sur la plage
  amphiBeeSites(){return this.s.buildings.filter(b=>b.f==='beee'&&b.k==='bateau_bee'&&!b.done&&!b.ruin);},
  // l'état-major : toutes les deux heures de jeu
  amphiBeeTick(){if(this.G?.mode!=='mer'||!this.G.dcoast)return;this.amphiBeeRiposteTick();const B=this.s.beee,t=this.s.t;if(t-(B.amphiT??-99)<2)return;B.amphiT=t;this.amphiBeeStranded();this.amphiBeeHeadTick();
    // (les bateaux se construisent dès J16, quand la côte a dix ouvrages ; les assauts attendent J22 et quinze ouvrages — mesuré : chantiers ouverts à J22,
    //  premiers bateaux à J29, premier assaut à J34)
    if(this.day<BEE_AMPHI_DAY-6||(B.fort?.count||0)<10)return;
    const cities=B.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);if(cities.length<4)return;
    // 1. les bateaux se construisent sur la plage, comme des bâtiments : trois chantiers à la fois au plus, sur la côte de la ville la plus proche de la mer
    //    (ses dépôts fournissent le bois et le fer) ; fini, le bateau glisse à l'eau devant son chantier
    // 0. les bateaux restés sur l'autre rive (après un débarquement, ou une opération manquée) rentrent à leur côte : là-bas, aucun soldat bèè ne peut les rejoindre
    //    (mesuré : six bateaux vides attendaient sur la plage meumeu, comptés « libres » pour l'assaut suivant, qui ne pouvait jamais embarquer)
    const mid=this.N/2,right=cities.reduce((n,c)=>n+c.x,0)/cities.length>mid,home=v=>(v.x>mid)===right;
    for(const v of this.amphiBeeBoats())if(!v.op&&v.state!=='go'&&!home(v)){const p=this.amphiBeach(right?mid+160:mid-160,v.y,140);if(p){v.rampTo=0;this.boatMove(v,p.x,p.y);}}
    const want=this.amphiBeeWant(),have=this.amphiBeeBoats().length,sites=this.amphiBeeSites();
    if(have+sites.length<want&&sites.length<SITES&&t>=(B.siteT??0)){B.siteT=t+4;let at=null,bd=1e9;const cost=BUILDINGS.bateau_bee.cost;const stocked=this.depotList('beee').filter(D=>D.done&&!D.ruin&&!BUILDINGS[D.k].foodOnly&&Object.entries(cost).every(([k,n])=>k==='pieces'||(this.have('beee',D.i+1,D.j+1)[k]||0)>=n*2));
      for(const o of [...stocked.map(D=>({x:D.i+1,y:D.j+1,R:70})),...cities.map(c=>({x:c.x,y:c.y,R:170,far:1}))]){const p=this.amphiBeeBoatSite(o,o.R);if(!p)continue;const d=d2(p[0],p[1],o.x,o.y)+(o.far?400:0);if(d<bd){bd=d;at=p;}if(at&&!o.far&&bd<25)break;}
      if(at){const out=this.place('beee','bateau_bee',at[0]-2,at[1]-1);if(out.ok){out.b.prio=3;B.amphiWhy=null;}else B.amphiWhy='bateau refusé : '+(out.why||[]).join(', ');}   /* (posé directement : le site est déjà vérifié, et le frein « deux chantiers en attente » de beeeBuild bloquait les bateaux voisins) */else B.amphiWhy='pas de plage près des villes';}
    for(const b of sites){const n=this.s.units.filter(u=>u.task?.kind==='build'&&u.task.b===b.id).length;for(const u of this.beeeAvailable(b.i,b.j,600).slice(0,Math.max(0,4-n)))this.beeeAssign(u,{kind:'build',b:b.id});}
    if(this.day<BEE_AMPHI_DAY||(B.fort?.count||0)<BEE_AMPHI_BUNKERS)return;
    const ready=this.amphiBeeStage(cities,this.amphiBeeBoats().filter(home),right);
    // 3. l'assaut : assez de bateaux libres, assez de monde dans les villes de la côte, et l'intervalle écoulé
    if(t<(B.amphiNext??0)||this.s.amphi?.some(o=>o.f==='beee'))return;
    const free=this.amphiBeeBoats().filter(v=>!v.op&&v.state!=='go'&&home(v));const need0=Math.min(want,6+2*(B.amphiCount||0));if(free.length<need0){B.amphiWhy=`flotte ${free.length}/${need0}`;return;}   /* (premier assaut à 6 bateaux, puis deux de plus à chaque fois) */
    const cx=free.reduce((n,v)=>n+v.x,0)/free.length,cy=free.reduce((n,v)=>n+v.y,0)/free.length;
    const base=cities.slice().sort((a,z)=>d2(a.x,a.y,cx,cy)-d2(z.x,z.y,cx,cy))[0];if(!base)return;
    const cap=Math.floor(VEHDEF.bateau_bee.places.passagers-1),need=Math.min(free.length*cap,Math.floor(free.length*cap*.9));
    const pool=ready.slice(0,need);if(pool.length<Math.max(24,free.length*7)){B.amphiWhy='troupes au port insuffisantes ('+pool.length+')';return;}
    const aim=this.amphiBeeAim(base);if(!aim)return;
    const vil=(B.heads||[]).some(h=>h.camp)?[]:this.beeeAvailable(B.stage.x,B.stage.y,120).slice(0,6);pool.push(...vil);
    const boats=free.slice(0,Math.ceil(pool.length/cap));const R=this.amphiLaunch('beee',pool.slice(0,boats.length*cap),boats,aim[0],aim[1],{ferry:true,maxWave:3});
    if(R.ok){(B.amphiUsed??=[]).push({x:aim[0],y:aim[1],t});B.amphiUsed=B.amphiUsed.filter(u=>t-u.t<24*30);B.amphiNext=t+24*(8+this.rand()*6);B.amphiCount=(B.amphiCount||0)+1;B.amphiWhy=null;this.log?.('Bèè',`Une flotte bèè appareille : ${R.op.units.length} soldats, ${boats.length} bateaux.`,'warn');}else B.amphiWhy=R.why?.[0];},
  // un chantier de bateau près d'une ville : du sable à 1-3 cases de l'eau, le plus proche du centre (le coin haut-gauche du chantier de 4 × 2)
  amphiBeeBoatSite(c,R=170){const N=this.N,dc=this.G.dcoast;let best=null,bd=1e9;
    for(let dj=-R;dj<=R;dj+=2)for(let di=-R;di<=R;di+=2){const i=Math.floor(c.x)+di,j=Math.floor(c.y)+dj;if(i<6||j<6||i>=N-6||j>=N-6)continue;const k=j*N+i;if(dc[k]<1||dc[k]>3||this.occ[k]>=0)continue;const d=Math.hypot(di,dj);if(d<bd&&this.canPlace('beee','bateau_bee',i-2,j-1).ok){bd=d;best=[i,j];}}return best;},
  // La plage visée (V12.5) : avant, toujours la même — la tête de pont tenue, ou le bâtiment connu le plus proche, ou la traversée la plus courte (mesuré :
  // trois assauts sur 45 jours, trois fois la même plage). Maintenant toute la côte d'en face est notée, une plage tous les 35 cases : la traversée (un peu),
  // une cible connue tout près (un bonus), les ouvrages connus à côté (un malus : ils cherchent le point faible), les plages déjà prises ces trente jours
  // (un fort malus : ils changent de secteur), et une bonne part de hasard. Ils ne savent que ce que leur renseignement a vu (B.known). Une tête de pont
  // qui tient n'est renforcée qu'un assaut sur deux environ ; l'autre fois, un nouveau front.
  amphiBeeAim(base){const B=this.s.beee,mid=this.N/2,bee=base.x>mid,t=this.s.t;
    const H=(B.heads||[]).map(h=>[h,this.amphiBeeHeadMen(h).length]).filter(([,n])=>n>0).sort((a,z)=>z[1]-a[1])[0]?.[0];if(H&&this.rand()<.3+.6*Math.min(1,this.amphiBeeHeadMen(H).length/30)){const b=this.amphiBeach(H.bx,H.by,30);if(b&&(b.x<mid)===bee)return [b.x,b.y];}
    const [,y0,,y1]=this.G.bounds||[0,0,this.N,this.N],used=(B.amphiUsed||[]).filter(u=>t-u.t<24*30);
    const known=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&B.known?.[b.id]),forts=known.filter(b=>BUILDINGS[b.k]?.bunker||b.k==='tour');
    const cands=[];for(let y=y0+30;y<=y1-30;y+=35){const b=this.amphiBeach(bee?mid-160:mid+160,y,120);if(!b||(b.x<mid)!==bee||cands.some(c=>d2(c.x,c.y,b.x,b.y)<25))continue;
      let s=-d2(b.x,b.y,base.x,base.y)/150;
      if(known.length){let kd=1e9;for(const k of known)kd=Math.min(kd,d2(k.i,k.j,b.x,b.y));s+=Math.max(0,3-kd/60);}
      for(const f of forts)if(d2(f.i,f.j,b.x,b.y)<40)s-=1.5;
      for(const u of used){const d=d2(u.x,u.y,b.x,b.y);if(d<120)s-=4*(1-d/120);}
      s+=this.rand()*3;cands.push({x:b.x,y:b.y,s});}
    if(!cands.length)return null;cands.sort((a,z)=>z.s-a.s);return [cands[0].x,cands[0].y];},
  // ---------- la tête de pont ----------
  // les débarqués : si une cible meumeu est connue, un groupe d'assaut ; sinon (les Bèè ne savent rien de cette rive) une tête de pont qui se retranche,
  // envoie des éclaireurs, bâtit un camp-dépôt avec les villageois venus avec la vague, et lance l'assaut dès qu'un éclaireur a vu quelque chose
  amphiBeeLanded(op,out){const B=this.s.beee;let band=op.bandId&&B.bands?.find(b=>b.id===op.bandId);
    if(band){for(const u of out){if(u.k!=='soldat')continue;band.m.push(u.id);u.band=band.id;u.task={kind:'band',tx:u.x,ty:u.y};}band.peak=Math.max(band.peak,band.m.length);}
    let H=(B.heads??=[]).find(h=>d2(h.bx,h.by,op.beach.x,op.beach.y)<40);
    if(!H){const b0=op.beach;H={id:this.id(),bx:b0.x,by:b0.y,x:b0.x-b0.nx*12,y:b0.y-b0.ny*12,nx:b0.nx,ny:b0.ny,tx:b0.tx,ty:b0.ty,m:[],t0:this.s.t,reconT:0,camp:null};B.heads.push(H);
      this.log?.('Front',`Les Bèè ont débarqué : une tête de pont près de (${b0.x|0}, ${b0.y|0}).`,'bad');}
    for(const u of out){u.stage=null;if(band&&u.k==='soldat')continue;u.amphi=null;u.city=null;u.head=H.id;H.m.push(u.id);}
    this.amphiBeeHeadPlace(H);},
  // la vague suivante d'un assaut : des soldats de la ville la plus proche du port des bateaux, s'il en reste assez
  amphiBeeNextWave(op){const B=this.s.beee,S=B.stage;const boats=this.amphiBoatsOf(op);if(!boats.length||!S)return null;
    const cap=VEHDEF.bateau_bee.places.passagers-1,pool=this.amphiBeeStaged().filter(u=>u.h?.state!=='hors'&&d2(u.x,u.y,S.x,S.y)<40);
    if(pool.length<10)return null;this.log?.('Front',`Une nouvelle vague bèè embarque pour leur tête de pont (${pool.length} soldats).`,'bad');return pool.slice(0,boats.length*cap);},
  // (V12.5) un Bèè resté sur la rive meumeu sans rôle (sa bande dissoute le rendait à une ville de l'autre côté de l'eau) rejoint la tête de pont la plus proche,
  // ou en fonde une là où il est si aucune n'est à 120 cases : à terre, on tient ou on avance, on ne rentre pas (mesuré : 30 à 76 Bèè par partie erraient sur notre rive)
  amphiBeeStranded(){const B=this.s.beee,cities=B.cities.filter(c=>!c.fallen);if(!cities.length)return;const L=this.landComp(),N=this.N,lk=(x,y)=>L[Math.floor(y)*N+Math.floor(x)];
    const homes=new Set(cities.map(c=>lk(c.x,c.y)));
    for(const u of this.s.units){if(u.f!=='beee'||!(u.hp>0)||u.head||u.band||u.amphi!=null||u.inVeh||u.h?.state==='hors'||u.h?.state==='mort')continue;const k=lk(u.x,u.y);if(k<0||homes.has(k))continue;
      let H=null,bd=120;for(const h of B.heads||[]){const d=d2(h.x,h.y,u.x,u.y);if(d<bd){bd=d;H=h;}}
      /* (loin dans les terres, sans plage à 40 cases : une poche, tournée vers l'intérieur — la mer est du côté de leurs villes) */
      if(!H){const b0=this.amphiBeach(u.x,u.y,40),sx=cities.reduce((n,c)=>n+c.x,0)/cities.length>u.x?1:-1;
        H={id:this.id(),bx:b0?b0.x:u.x,by:b0?b0.y:u.y,x:u.x,y:u.y,nx:b0?b0.nx:sx,ny:b0?b0.ny:0,tx:b0?b0.tx:0,ty:b0?b0.ty:sx,m:[],t0:this.s.t,reconT:0,camp:null};(B.heads??=[]).push(H);}
      u.city=null;u.head=H.id;u.task=null;u.path=null;u.goal=null;H.m.push(u.id);}},
  // (V12.5) le rassemblement au port : les villes sont à 100-150 cases de la côte, et une marche de 200 cases prend des jours quand des milliers de Bèè
  // cherchent leur chemin (mesuré : 2,5 cases à l'heure ; après 24 h d'embarquement, la deuxième vague partait vide — 0 débarqué sur 180 appelés).
  // Les soldats du prochain assaut viennent donc d'avance attendre à quatorze cases derrière les bateaux : quarante au plus toutes les deux heures,
  // jusqu'à une fois et demie ce que la flotte emporte ; l'assaut et ses vagues embarquent ceux qui sont arrivés (à moins de 40 cases).
  amphiBeeStaged(){return this.s.units.filter(u=>u.stage&&u.f==='beee'&&u.hp>0&&u.amphi==null&&!u.head&&!u.band);},
  amphiBeeStage(cities,boats,right){const B=this.s.beee;if(!boats.length)return [];
    const px=boats.reduce((n,b)=>n+b.x,0)/boats.length,py=boats.reduce((n,b)=>n+b.y,0)/boats.length,b0=this.amphiBeach(px,py,30);
    /* (le point ne bouge pas pendant un assaut : la flotte partie, le « port » calculé sur les bateaux restés filait ailleurs) */
    {const nx=b0?b0.x-b0.nx*14:px+(right?14:-14),ny=b0?b0.y-b0.ny*14:py;if(!B.stage||!this.s.amphi?.some(o=>o.f==='beee')&&d2(B.stage.x,B.stage.y,nx,ny)>30)B.stage={x:nx,y:ny};}
    const sx=B.stage.x,sy=B.stage.y;
    const spot=u=>{const a=this.rand()*6.283,r=3+this.rand()*10,p=this.freeSpot(sx+Math.cos(a)*r,sy+Math.sin(a)*r,4);u.task={kind:'guard',tx:p[0],ty:p[1],stage:1};u.path=null;u.goal=null;};
    const staged=this.amphiBeeStaged();for(const u of staged)if(!u.task||u.task.kind==='guard'&&!u.task.stage)spot(u);
    const want=Math.ceil(boats.length*(VEHDEF.bateau_bee.places.passagers-1)*1.5);
    if(staged.length<want){const base=cities.slice().sort((a,z)=>d2(a.x,a.y,sx,sy)-d2(z.x,z.y,sx,sy))[0];
      for(const u of this.beeeMuster(base,cities,Math.min(40,want-staged.length),2,260))if(u.k==='soldat'&&!u.task?.bunker&&!u.head&&!u.band){u.from=u.city??u.from;u.city=null;u.stage=1;spot(u);}}
    return staged.filter(u=>u.h?.state!=='hors'&&d2(u.x,u.y,sx,sy)<40);},
  amphiBeeHeadMen(H){return H.m.map(id=>this.unit(id)).filter(u=>u&&u.hp>0&&u.f==='beee'&&!u.band&&u.head===H.id&&u.h?.state!=='hors');},
  // le retranchement : un arc à une douzaine de cases à l'intérieur, face aux terres ; les villageois au camp
  amphiBeeHeadPlace(H){const men=this.amphiBeeHeadMen(H),sold=men.filter(u=>u.k==='soldat'&&u.task?.kind!=='search');const n=sold.length;
    sold.forEach((u,q)=>{const off=(q-(n-1)/2)*1.6,row=q%2?3:0;const p=this.freeSpot(H.x+H.tx*off-H.nx*row,H.y+H.ty*off-H.ny*row,3);u.task={kind:'guard',tx:p[0],ty:p[1],hold:true,fx:-H.nx,fy:-H.ny};u.path=null;u.goal=null;});
    for(const u of men)if(u.k==='villageois'&&!u.task)u.task={kind:'move',tx:H.x+H.nx*3,ty:H.y+H.ny*3};},
  amphiBeeHeadTick(){const B=this.s.beee,t=this.s.t;if(!B.heads?.length)return;
    for(const H of [...B.heads]){const men=this.amphiBeeHeadMen(H);if(!men.length){B.heads.splice(B.heads.indexOf(H),1);continue;}
      const sold=men.filter(u=>u.k==='soldat'),vil=men.filter(u=>u.k==='villageois');
      // le camp-dépôt de la tête de pont (ses villageois le bâtissent)
      if(vil.length&&!(H.camp&&this.building(H.camp)&&!this.building(H.camp).ruin)){const c=this.beeeBuild('camp',H.x+H.nx*3,H.y+H.ny*3,10);if(c){H.camp=c.id;c.prio=4;for(const u of vil)this.beeeAssign(u,{kind:'build',b:c.id});}}
      // une cible connue (vue par un éclaireur, ou entendue) à moins de 350 cases : l'assaut, en gardant six hommes au retranchement
      let tgt=null,bd=350;for(const b of this.s.buildings){if(b.f!=='meumeu'||b.ruin||!B.known?.[b.id])continue;const d=d2(b.i,b.j,H.x,H.y);if(d<bd){bd=d;tgt=b;}}
      const free=sold.filter(u=>u.task?.kind!=='search');
      if(!tgt&&free.length>=30&&t>=(H.advT||0)&&d2(H.x,H.y,H.bx,H.by)<60){H.advT=t+12;const p=this.freeSpot(H.x-H.nx*15,H.y-H.ny*15,6);if(p&&this.walkTarget?.({x:H.x,y:H.y},p[0],p[1])!==null){H.x=p[0];H.y=p[1];this.amphiBeeHeadPlace(H);continue;}}
      /* (V12.5) l'assaut part en masse : deux hommes par défenseur vu à la cible, plus six, quatorze au moins ; sinon la tête attend ses vagues
         (mesuré : des groupes de 8 à 30 partaient toutes les deux heures contre une caserne, et décrochaient « trop de pertes ») */
      const need=tgt?Math.max(14,Math.ceil((B.known[tgt.id]?.troops||0)*2+6)+6):14;
      if(tgt&&free.length>=need){const go=free.slice(6);for(const u of go){u.head=null;H.m.splice(H.m.indexOf(u.id),1);}const band=this.makeBand(go,tgt,{x:H.x,y:H.y});band.kind='debarquement';
        this.log?.('Front',`Depuis leur tête de pont, ${go.length} Bèè passent à l’attaque.`,'bad');this.amphiBeeHeadPlace(H);continue;}
      // les éclaireurs : deux soldats, en éventail vers l'intérieur, toutes les dix heures
      // (chaque reconnaissance va plus loin, jusqu'à 300 cases ; un bruit entendu sur cette rive depuis moins d'un jour donne la direction)
      if(t>=H.reconT&&free.length>=4){H.reconT=t+10;H.reconN=(H.reconN||0)+1;const L=B.lead,heard=L&&t-L.t<24&&(L.x<this.N/2)===(H.x<this.N/2)&&L.bearing!=null;
        const a=heard?L.bearing+(this.rand()-.5)*(L.half||.4):Math.atan2(-H.ny,-H.nx)+(this.rand()-.5)*1.8,D=Math.min(300,60+40*H.reconN+this.rand()*40),ox=heard?L.x:H.x,oy=heard?L.y:H.y;
        if(heard){const p=this.freeSpot(ox+Math.cos(a)*Math.min(D,140),oy+Math.sin(a)*Math.min(D,140),8);for(const u of free.slice(-2)){u.task={kind:'search',pts:[p,[H.x,H.y]],i:0,scout:1,until:t+40,home:[H.x,H.y],t0:t};u.path=null;}}else{
        // (V12.5 : une tête de pont forte envoie plusieurs paires en éventail — une de plus par 25 soldats libres, trois au plus ; mesuré : une seule paire
        //  au hasard, 64 hommes attendaient des jours sans rien connaître, nos bâtiments à 200 cases)
        const pairs=Math.min(3,1+Math.floor(Math.max(0,free.length-4)/25));for(let q=0;q<pairs;q++){const aq=a+(q-(pairs-1)/2)*.9;
          const p1=this.freeSpot(H.x+Math.cos(aq)*D,H.y+Math.sin(aq)*D,8),p2=this.freeSpot(H.x+Math.cos(aq+.5)*D*.7,H.y+Math.sin(aq+.5)*D*.7,8);
          for(const u of free.slice(-2*(q+1),q?-2*q:undefined)){u.task={kind:'search',pts:[p1,p2,[H.x,H.y]],i:0,scout:1,until:t+20+D*.3,home:[H.x,H.y],t0:t};u.path=null;}}}}
      // les éclaireurs rentrés (garde sans place) et les renforts reprennent leur place dans l'arc
      if(sold.some(u=>!u.task||u.task.kind==='guard'&&!u.task.hold))this.amphiBeeHeadPlace(H);}},
  // ---------- la riposte : des Meumeu vus sur la rive bèè ----------
  // toutes les heures : les Meumeu VUS (pas devinés) sur la terre des Bèè sont regroupés par carrés de 48 cases ; le plus gros groupe déclenche une riposte
  // à sa mesure (deux Bèè pour un Meumeu, plus six), prise dans les villes proches — jamais dans les garnisons des ouvrages, qui tiennent leurs postes.
  // Le groupe de riposte suit l'ennemi (son point est remis à jour), reçoit des renforts s'il fond, et rentre quand la zone est calme.
  amphiBeeRiposteTick(){const B=this.s.beee,t=this.s.t;if(t-(B.ripT??-9)<1)return;B.ripT=t;
    const cities=B.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);if(!cities.length)return;const L=this.landComp(),N=this.N;
    const home=L[Math.floor(cities[0].y)*N+Math.floor(cities[0].x)];if(home<0)return;
    const G=new Map();for(const u of this.s.units){if(u.f!=='meumeu'||!(u.hp>0)||u.inVeh||u.h?.state==='hors'||u.h?.state==='mort')continue;const k=Math.floor(u.y)*N+Math.floor(u.x);if(L[k]!==home||!this.spotted(u,'beee'))continue;
      const g=Math.floor(u.x/48)+','+Math.floor(u.y/48);let a=G.get(g);if(!a)G.set(g,a=[]);a.push(u);}
    const rip=(B.bands||[]).filter(b=>b.kind==='riposte');
    for(const b of rip){const g=[...G.values()].map(a=>[a,d2(a.reduce((n,u)=>n+u.x,0)/a.length,a.reduce((n,u)=>n+u.y,0)/a.length,b.pt[0],b.pt[1])]).sort((p,q)=>p[1]-q[1])[0];
      if(g&&g[1]<90){const a=g[0];b.pt=[a.reduce((n,u)=>n+u.x,0)/a.length,a.reduce((n,u)=>n+u.y,0)/a.length];b.seenT=t;b.enemy=a.length;}}
    for(const a of [...G.values()].sort((p,q)=>q.length-p.length)){if(a.length<2)break;const x=a.reduce((n,u)=>n+u.x,0)/a.length,y=a.reduce((n,u)=>n+u.y,0)/a.length;
      const need=Math.min(140,a.length*2+6);let band=rip.find(b=>d2(b.pt[0],b.pt[1],x,y)<90);
      const c=cities.slice().sort((p,q)=>d2(p.x,p.y,x,y)-d2(q.x,q.y,x,y))[0];
      if(band){const have=this.bandMembers(band).filter(u=>u.hp>0).length;if(have>=need*.7||t-(band.reinfT??-9)<6)continue;band.reinfT=t;
        const more=this.beeeMuster(c,cities,need-have,2,300).filter(u=>!u.task?.bunker&&!u.head);for(const u of more){band.m.push(u.id);u.from=u.city??u.from;u.city=null;u.band=band.id;u.task={kind:'band',tx:u.x,ty:u.y};u.path=null;}continue;}
      if(t<(B.ripRetry??0))continue;
      const pool=this.beeeMuster(c,cities,need,2,300).filter(u=>!u.task?.bunker&&!u.head);if(pool.length<Math.max(6,Math.ceil(need*.5))){B.ripRetry=t+2;continue;}
      const b=this.makeBand(pool,this.building(c.centre),c);b.city=c.id;b.pt=[x,y];b.seenT=t;b.enemy=a.length;b.kind='riposte';
      this.log?.(c.name,`${c.name} lance ${pool.length} hommes contre ${a.length} Meumeu débarqués.`,'warn');}
    // une riposte sans ennemi vu depuis 8 h rentre
    for(const b of rip)if(t-(b.seenT??t)>8){const up=this.bandMembers(b).filter(u=>u.hp>0);this.bandRetreat(b,up,b.pt,true);}},
};
