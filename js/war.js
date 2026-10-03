// Oberkommando der Meumeu — la guerre des groupes. Une lutte pour la survie de deux espèces : des terres, des filons.
// Les Bèè ne partent plus en file indienne vers un bâtiment : ils marchent en groupe, et se battent comme une section.
//  · approche : en ligne, au pas du plus lent, vers l'objectif (un point stratégique : gare, mine, dépôt chargé…) ;
//  · feu : au contact (ou dès qu'on leur tire dessus), ils s'arrêtent à la limite de leur portée utile, se couchent derrière
//    ce qui couvre (arbre, rocher, mur, ruine) et tirent — jamais en marchant ;
//  · bond : si l'ennemi est hors de portée ou caché, une moitié avance pendant que l'autre la couvre, puis l'inverse ;
//  · assaut : quand ils sont bien plus nombreux que ce qu'ils voient et que l'ennemi est cloué au sol, ils chargent ;
//  · repli : trop de pertes, trop de feu : fumigènes, les valides emportent les blessés, retour à la ville ;
//  · objectif : plus personne pour le défendre, ils saccagent la cible (feu, charges).
// Les deux camps obéissent à la même discipline de tir : on s'arrête, on se cale, on vise ; seule la charge tire en avançant.
// Les pièces lourdes changent de mains : si le tireur tombe, un camarade reprend l'arme.
// Les méthodes sont posées sur World (comme la gestion et la faune).
import {BUILDINGS,UNITS,BEEE,DAY,TERRAIN} from './data.js';
import {Pather} from './path.js';

const d2=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const tickHealth2=(W,u,dt)=>{};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const alive=u=>u&&u.hp>0;
const active=u=>alive(u)&&!(u.h&&u.h.state==='hors');
const UDEF=u=>u.f==='beee'?BEEE.units[u.k]:UNITS[u.k];
// l'expérience : l'entraînement à la caserne mène jusqu'à « entraîné » ; au-delà, seul le combat forge
export const RANKS=[[0,'recrue'],[8,'formé'],[22,'entraîné'],[45,'aguerri'],[90,'vétéran']];
export const DRILL_RATE=.9,DRILL_MAX=44;    // points d'expérience par heure de caserne ; plafond de l'entraînement
export const rankOf=xp=>{let r=RANKS[0][1];for(const [x,n] of RANKS)if((xp||0)>=x)r=n;return r;};
export const SETTLE=.3;          // heures de jeu (≈ 1,2 s de combat) immobile avant de pouvoir tirer
const EVAL=1.2;                  // un chef de groupe réévalue la situation toutes les 1,2 h (≈ 5 s)

export const WAR={
  // ---------- les pièces qui changent de mains ----------
  // Le tireur d'une arme servie tombe : le servant (ou le camarade) le plus proche reprend la pièce et ce qu'elle a de munitions.
  handover(u){if(!u.w)return null;const Wd=this.W(u.w);if(!(Wd.crew>1))return null;
    const mates=u.sq?this.members(this.squad(u.sq)||{m:[]}):u.band?this.bandMembers(this.band(u.band)):[];
    const c=mates.filter(o=>o!==u&&active(o)&&d2(o.x,o.y,u.x,u.y)<5&&!UNITS[o.k]?.medic).sort((a,b)=>(b.serve===u.id)-(a.serve===u.id)||d2(a.x,a.y,u.x,u.y)-d2(b.x,b.y,u.x,u.y))[0];
    if(!c)return null;c.w=u.w;c.mag=u.mag||0;c.pouch=(u.pouch||0);c.serve=null;c.aimAt=null;c.deployT=0;u.w=null;u.mag=0;u.pouch=0;
    for(const o of mates)if(o.serve===u.id)o.serve=c.id;
    if(c.f==='meumeu')this.log('Armée',`${c.name||'Un soldat'} reprend la pièce de ${u.name||'son camarade'}.`,'warn');
    const sq=c.sq&&this.squad(c.sq);if(sq)this.assignCrews(sq);return c;},

  // ---------- la caserne : on y entre, on s'y entraîne, on en sort équipé ----------
  // Le joueur choisit qui il mobilise : les villageois (ou les soldats) qu'il envoie à la caserne y entrent et s'y entraînent ;
  // il les fait sortir quand il veut, armés de la conception choisie, protégés s'il y a des protections au dépôt.
  enterBarracks(u,b){b.inside??=[];if(u.sq)this.leave(u);u.task=null;u.path=null;u.carry=null;u.drillT=u.drillT||0;u.inBarracks=b.id;
    this.s.units.splice(this.s.units.indexOf(u),1);this.uIndex.delete(u.id);b.inside.push(u);
    this.log(this.cityName(b),`${u.name||'Un Meumeu'} entre à la caserne (${b.inside.length} à l'entraînement).`,'info');},
  drillTick(b,dt){for(const u of b.inside||[]){u.drillT=(u.drillT||0)+dt;if((u.xp||0)<DRILL_MAX)u.xp=Math.min(DRILL_MAX,(u.xp||0)+dt*DRILL_RATE*this.mod('tir'));if(u.h)tickHealth2(this,u,dt);}},
  // faire sortir n recrues (les mieux entraînées d'abord), soldats ou servants, armées de `w`, protégées par `armor`.
  // nv : l'équipement du commando — 'jum' jumelles, 'camo' tenue, 'jumcamo' les deux, 'bino' jumelles IR, 'both' IR + tenue.
  // Un soldat devient commando par son équipement (charges, tenue, jumelles) : il n'y a plus de type à part.
  releaseRecruits(b,n,k='soldat',w=null,armor=null,ids=null,charges=0,nv=null){const L=(b.inside||[]).slice().sort((a,z)=>(z.xp||0)-(a.xp||0)).filter(u=>!ids||ids.includes(u.id)).slice(0,n);if(!L.length)return {ok:false,why:['personne dans la caserne']};
    const servant=k==='servant';if(servant)k='soldat';const D=UNITS[k];if(!D?.arm)return {ok:false,why:['pas un combattant']};
    // chaque caserne forme les siens : la caserne d'élite, la troupe de choc ; la caserne, les soldats (et les servants)
    const T=BUILDINGS[b.k]?.trains||[];if(!T.includes(k))return {ok:false,why:[T.includes('choc')?'la caserne d’élite ne forme que la troupe de choc':'la troupe de choc se forme à la caserne d’élite']};
    let out=0;const why=[];const [bw,bh]=this.sizeOf(b);
    for(const u of L){if(servant){const d=this.design(w);const Wd=d&&this.W(d.id);if(!d||!Wd){why.push('choisissez l’arme de la pièce à servir');break;}
        // un servant porte les caisses de SA pièce : une arme de fantassin n'en est pas une (ses caisses de fusil étaient re-étiquetées « obus »)
        if(!(Wd.crew>1)){why.push(`${d.name} n’est pas une pièce servie : choisissez un obusier, une mitrailleuse à trépied… (les porteurs de munitions d’une escouade de fusiliers se forment à part)`);break;}
        // V12.4 (le joueur : « on devrait pouvoir les livrer sans arme, juste en tant que servants ») : il prend les caisses qu'il y a, en coups entiers,
        // jusqu'à sa charge — même aucune : il sort quand même et ira chercher les obus au dépôt quand la pièce sera à sec (crewDry)
        const pc=Math.max(1,Wd.perCrate||1),haveM=this.have(b.f,b.i+1,b.j+1)['m:'+d.id]||0;const cr=Math.min(this.servantCrates(Wd),Math.floor(haveM*pc+1e-6)/pc);
        const cost={};if(cr>0)cost['m:'+d.id]=cr;if(armor&&u.armor!==armor)cost['p:'+armor]=1;
        // V12.3 : il ne prend PAS d'arme, seulement les munitions de la pièce (règle du joueur)
        const side=null;
        const pay=this.canPay(b.f,b.i+1,b.j+1,cost);if(!pay.ok){why.push('il manque '+pay.miss.join(', '));break;}this.pay(b.f,b.i+1,b.j+1,cost);
        b.inside.splice(b.inside.indexOf(u),1);u.inBarracks=null;u.skin=b.skin||'meumeu';u.k='soldat';u.w=side?.id||null;u.mag=0;u.pouch=0;u.crates=cr;u.ammoW=d.id;u.servant=true;if(armor){u.armor=armor;u.plates={};}
        u.homeBarracks=b.id;u.x=b.i+bw/2+(this.rand()-.5)*bw;u.y=b.j+bh+.7;u.anim='idle';this.s.units.push(u);this.uIndex.set(u.id,u);
        if(side){this.resupply(u);u.mag=Math.min(this.W(side.id).p.mag,u.pouch||0);u.pouch-=u.mag;}
        const R=b.rally;u.task={kind:'guard',tx:(R?R[0]:u.x)+(out%4-1.5)*.9,ty:(R?R[1]:u.y+1)+Math.floor(out/4)*.9};u.path=null;out++;continue;}
      const armed=u.w&&u.k!=='villageois';const d=this.design(w||u.w||'mle1');if(!d||d.status!=='adopte'){why.push('une arme adoptée');break;}
      // sortir de la caserne : une arme, sa dotation de munitions (ce qu'un soldat porte), une protection si on en donne une — rien d'autre
      const cost={};const Wd0=this.W(d.id);if(Wd0.perCrate>0&&!(u.pouch>0)&&(this.have(b.f,b.i+1,b.j+1)['m:'+d.id]||0)<Math.min(1,Wd0.carry/Wd0.perCrate)*.25){why.push('il manque des munitions ('+d.name+')');break;}   // elles sont prises au dépôt à la sortie
      // une charge explosive : une demi-caisse d'explosifs
      if(!armed||u.w!==d.id)cost['a:'+d.id]=1;/* la formation d'élite se paie (vivres surtout) */if(D.choc)for(const [r,v] of Object.entries(D.cost||{}))cost[r]=(cost[r]||0)+v;if(charges>0)cost.explosifs=(cost.explosifs||0)+charges*.5;if(nv==='camo'||nv==='both'||nv==='jumcamo')cost.tenue_camo=1;if(nv==='bino'||nv==='both')cost.jumelles_ir=1;if(nv==='jum'||nv==='jumcamo')cost.jumelles=1;
      if(armor&&u.armor!==armor)cost['p:'+armor]=1;
      if(D.choc&&(u.drillT||0)<(D.drill||24)){why.push(`formation d’élite : encore ${Math.ceil((D.drill||24)-(u.drillT||0))} h pour ${u.name||'une recrue'}`);continue;}   // (V12.4 : l'élite coûte peu mais se forme 24 h)
      const pay=this.canPay(b.f,b.i+1,b.j+1,cost);if(!pay.ok){why.push('il manque '+pay.miss.join(', '));break;}this.pay(b.f,b.i+1,b.j+1,cost);
      b.inside.splice(b.inside.indexOf(u),1);u.inBarracks=null;u.skin=b.skin||'meumeu';u.k=k;u.w=d.id;if(D.choc&&u.h){u.h.vit=D.choc.vit;u.h.tough=D.choc.tough;}if(charges>0)u.charges=(u.charges||0)+charges;if(nv==='camo'||nv==='both'||nv==='jumcamo')u.camoSuit=true;if(nv==='bino'||nv==='both'){u.bino=60;u.irLeft=80;u.jum=44;}if(nv==='jum'||nv==='jumcamo')u.jum=44;const Wd=this.W(d.id);u.mag=0;u.pouch=0;if(D.smoke)u.smoke=D.smoke;if(armor){u.armor=armor;u.plates={};}
      u.homeBarracks=b.id;u.x=b.i+bw/2+(this.rand()-.5)*bw;u.y=b.j+bh+.7;u.anim='idle';this.s.units.push(u);this.uIndex.set(u.id,u);this.resupply(u);u.mag=Math.min(Wd.p.mag,u.pouch||0);u.pouch-=u.mag;
      const R=b.rally;u.task={kind:'guard',tx:(R?R[0]:u.x)+(out%4-1.5)*.9,ty:(R?R[1]:u.y+1)+Math.floor(out/4)*.9};u.path=null;out++;}
    if(out){this.log(this.cityName(b),`${out} ${servant?'servant':charges>0||nv?'commando':'soldat'}${out>1?'s':''} ${servant?'de pièce ':''}sort${out>1?'ent':''} de la caserne.`,'good');this.emit({type:'trained',x:b.i+1,y:b.j+1,k,f:b.f});}
    return out?{ok:true,n:out,text:`${out} sorti${out>1?'s':''}${why.length?` — puis ${why[0]}`:''}`}:{ok:false,why};},
  // l'arme légère d'un servant : celle qu'on donne, sinon la plus abondante au dépôt de la caserne qui a aussi des cartouches (jamais une pièce servie)
  sidearmFor(b,want=null){const have=this.have(b.f,b.i+1,b.j+1),light=d=>d&&d.status==='adopte'&&d.f===b.f&&!(this.W(d.id).crew>1);
    if(want){const d=this.design(want);return light(d)?d:null;}
    return this.designsOf(b.f).filter(d=>light(d)&&(have['a:'+d.id]||0)>=1&&(have['m:'+d.id]||0)>0).sort((a,z)=>(have['a:'+z.id]||0)-(have['a:'+a.id]||0))[0]||null;},
  // les caisses de la pièce que porte un servant : deux fois la dotation du tireur, sans dépasser ce qu'un Meumeu porte (1,2 kg : deux obus de 11 kg n'ont pas de sens)
  // V12.3 : en coups ENTIERS — une caisse d'un seul obus portée à 1,7 laissait 0,7 obus que personne ne pouvait donner (la pièce restait « plus d'obus »)
  servantCrates(Wd){const kgc=Math.max(.05,Wd.perCrate*(Wd.rm||0)/1000);const c=Math.min(2,Math.max(.25,(Wd.carry*2)/Math.max(1,Wd.perCrate)),Math.max(.25,1.2/kgc));
    const pc=Math.max(1,Wd.perCrate||1);return +(Math.max(1,Math.floor(c*pc+1e-6))/pc).toFixed(4);},
  // Un équipage complet : la pièce et ses servants sortent ensemble, en escouade. Le tireur (le mieux entraîné) prend la pièce et ses obus ;
  // chaque servant sort SANS arme, avec des caisses de la pièce qu'il apportera au tireur (V12.3, règle du joueur : avant il prenait aussi un fusil,
  // et sans fusil au dépôt l'équipage ne sortait pas). Tout ou rien : si quelque
  // chose manque, personne ne sort et rien n'est débité.
  releaseCrew(b,pieceId,{armor=null,sidearm=null,ids=null}={}){
    const d=this.design(pieceId),Wd=d&&d.status==='adopte'&&d.f===b.f?this.W(d.id):null;
    if(!Wd||!(Wd.crew>1))return {ok:false,why:['choisissez une pièce servie : une arme adoptée qui demande des servants']};
    const need=Wd.crew,nsv=need-1;const L=(b.inside||[]).slice().sort((a,z)=>(z.xp||0)-(a.xp||0)).filter(u=>!ids||ids.includes(u.id)).slice(0,need);
    if(L.length<need)return {ok:false,why:[`il faut ${need} recrues à la caserne pour servir ${d.name} : ${(b.inside||[]).filter(u=>!ids||ids.includes(u.id)).length} présente${(b.inside||[]).length>1?'s':''}`]};
    const cr=this.servantCrates(Wd),gunnerCrates=Wd.carry/Math.max(1,Wd.perCrate);
    const cost={['a:'+d.id]:1,['m:'+d.id]:+(nsv*cr+gunnerCrates).toFixed(4)};if(armor)cost['p:'+armor]=need;
    const pay=this.canPay(b.f,b.i+1,b.j+1,cost);if(!pay.ok)return {ok:false,why:['il manque '+pay.miss.join(', ')]};
    this.pay(b.f,b.i+1,b.j+1,cost);
    const [bw,bh]=this.sizeOf(b),R=b.rally||[b.i+bw/2+2,b.j+bh+3],exit=u=>{b.inside.splice(b.inside.indexOf(u),1);u.skin=b.skin||'meumeu';u.inBarracks=null;u.k='soldat';u.homeBarracks=b.id;u.x=b.i+bw/2+(this.rand()-.5)*bw;u.y=b.j+bh+.7;u.anim='idle';u.mag=0;u.pouch=0;u.serve=null;u.role=null;u.task=null;u.path=null;this.s.units.push(u);this.uIndex.set(u.id,u);if(armor){u.armor=armor;u.plates={};}this.face(u,R[0]-u.x,R[1]-u.y);};
    const gunner=L[0];exit(gunner);gunner.w=d.id;gunner.servant=false;gunner.pouch=Wd.carry;gunner.mag=Math.min(Wd.p.mag,gunner.pouch);gunner.pouch-=gunner.mag;gunner.task={kind:'guard',tx:R[0],ty:R[1]};
    const crew=L.slice(1);for(const u of crew){exit(u);u.w=null;u.servant=true;u.ammoW=d.id;u.crates=cr;u.serve=gunner.id;}
    const r=this.formSquad(L.map(u=>u.id));if(r.ok){r.sq.name=`${d.name} · équipage`;r.sq.leader=gunner.id;}
    this.log(this.cityName(b),`${d.name} : l’équipage complet (1 tireur, ${nsv} servant${nsv>1?'s':''}) sort de la caserne.`,'good');this.emit({type:'trained',x:b.i+1,y:b.j+1,k:'soldat',f:b.f});
    return {ok:true,n:need,sq:r.sq,gunner,text:`${d.name} : équipage de ${need} sorti (1 tireur, ${nsv} servant${nsv>1?'s':''} sans arme, avec ${(nsv*cr).toFixed(1).replace('.',',')} caisses de la pièce)`};},
  // ---------- les dépôts qui sautent ----------
  // Ce qu'un dépôt contient d'explosif, en « caisses d'explosifs » : les explosifs, la poudre, les caisses de munitions.
  volatile(b){let E=0;for(const [k,n] of Object.entries(b.stock||{})){if(!(n>0))continue;if(k==='explosifs')E+=n;else if(k==='poudre')E+=n*.7;else if(k.startsWith('m:'))E+=n*.35;}return E;},
  // un coup reçu peut le faire sauter : d'autant plus qu'il y a de quoi, et que le coup est fort (un obus plus qu'une balle)
  depotCook(b,dmg,by){const E=this.volatile(b);if(E<2)return false;if(this.rand()<Math.min(.6,dmg*E/1500))return this.depotBlow(b,by);return false;},
  // l'explosion : sa force suit la racine cubique de ce qui saute ; les dépôts voisins reçoivent le souffle (et peuvent sauter à leur tour)
  depotBlow(b,by){const E=this.volatile(b);if(E<2||b.ruin)return false;const k3=Math.cbrt(E);const [x,y]=this.bc(b);
    const S={vg:1300,cls:[{m:.12,n:Math.round(220*Math.pow(E,.66)),d:2.4,lam:8}],geo:.6,air:false,blast:(.1+.08*k3)*4,inj:(.1+.08*k3)*4*1.45,conc:(.1+.08*k3)*4*2.05,stun:(.1+.08*k3)*4*3.2,radius:Math.min(18,(.6+.45*k3)*4),dmgB:40+30*k3,W:.05};
    for(const k of Object.keys(b.stock))if(k==='explosifs'||k==='poudre'||k.startsWith('m:'))b.stock[k]=0;
    this.log(this.cityName(b),`${BUILDINGS[b.k].name} de ${this.cityName(b)} a sauté : ${Math.round(E)} caisses d'explosifs et de munitions.`,'bad');
    this.emit({type:'boom',src:b.f==='meumeu'?'beee':'meumeu',kind:E>25?'bomb':'shell',x,y});this.heBlast(x,y,S,b.f==='meumeu'?'beee':'meumeu',by??null,{kind:'bombe',vsB:1,rB:1+.9*k3,boom:'bomb'});
    if(!b.ruin){b.hp=0;this.collapse(b);}return true;},
  // ---------- l'état-major bèè ----------
  // Toutes les heures, il regarde la carte :
  //  · la défense d'abord : des Meumeu près d'une ville bèè (soldats, bâtisseurs, colons) ? un groupe de défense se forme
  //    à une fois et demie leur nombre (la ville, puis les villes voisines) et va à leur rencontre ; plusieurs villes, plusieurs groupes ;
  //  · l'offensive ensuite, seulement s'ils sont prêts (assez de monde face à notre armée) ou s'ils se sentent menacés (nos villes,
  //    nos mines, nos gares qui s'approchent de leur territoire) — et plusieurs raids à la fois quand ils en ont les moyens.
  intrudersNear(x,y,r){return this.s.units.filter(u=>u.f==='meumeu'&&active(u)&&d2(u.x,u.y,x,y)<r&&this.spotted(u,'beee',1));},
  // prendre des gardes : la ville d'abord (elle en garde `keep`), puis les voisines à moins de 90 cases (elles en gardent 3)
  beeeMuster(c,cities,need,keep=2,reach=90){let pool=[];const all=[c,...cities.filter(o=>o!==c).sort((a,z)=>d2(a.x,a.y,c.x,c.y)-d2(z.x,z.y,c.x,c.y))];
    for(const o of all){if(pool.length>=need)break;if(o!==c&&d2(o.x,o.y,c.x,c.y)>reach)continue;const g=this.beeeGuards(o);pool=pool.concat(g.slice(0,Math.max(0,g.length-(o===c?keep:Math.max(3,Math.ceil(this.beeeGarrisonMin(o)/2))))));}
    return pool.slice(0,need);},
  // La contre-batterie : on bombarde une ville, leur priorité est d'aller prendre la batterie, même loin.
  // La réponse est à la mesure du danger : les défenseurs autour de la batterie estimée, et la gravité du bombardement.
  // S'ils ne sont pas assez, ils attendent des renforts (et creusent) ; une batterie qui se tait est oubliée en quelques heures.
  beeeCounterBattery(cities){const B=this.s.beee;
    for(const c of cities){const S=c.shelled;if(!S||this.s.t-S.at>8)continue;
      const band=B.bands.find(b=>b.kind==='contre'&&b.city===c.id);if(band){band.pt=[S.x,S.y];continue;}
      if(this.s.t<(S.retry??0))continue;const def=this.defendersAt(S.x,S.y);
      const need=Math.min(60,Math.max(6,Math.ceil(def*1.6)+4+Math.floor(S.danger/2)));const pool=this.beeeMuster(c,cities,need,2,150);
      if(pool.length<Math.max(4,Math.ceil(need*.6))){S.retry=this.s.t+2;c.dig=Math.max(c.dig||0,1);if(!S.told){S.told=true;this.log(c.name,`${c.name} rassemble des renforts pour faire taire notre batterie.`,'warn');}continue;}
      const near=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&B.known?.[b.id]).sort((a,z)=>this.distB(a,S.x,S.y)-this.distB(z,S.x,S.y))[0]||this.building(c.centre);if(!near)continue;
      const b=this.makeBand(pool,near,c);b.kind='contre';b.city=c.id;b.pt=[S.x,S.y];B.waves=(B.waves||0)+1;
      (this.s.fog?0:this.log(c.name,`${pool.length} Bèè partent de ${c.name} à l’assaut de notre batterie (${def?`${def} défenseurs estimés`:'peu défendue'}).`,'bad'));
      this.s.fog||this.emit({type:'wave',n:pool.length,x:S.x,y:S.y,from:[c.x,c.y]});}},
  // Une ville tombée : deux contre-attaques au plus, à la mesure de ce qui l'occupe ; si elles échouent, les villes voisines se retranchent.
  beeeRetake(cities){const B=this.s.beee,L=B.lostFront;if(!L||L.done||this.s.t<L.next)return;
    if(B.bands.some(b=>b.kind==='reprise'))return;
    if(L.attempts>=2||L.failed>=2){L.done=true;for(const c of cities)if(d2(c.x,c.y,L.x,L.y)<90)c.dig=2;
      this.log('Front',`Après l’échec de leurs contre-attaques sur ${L.name}, les Bèè creusent des lignes de tranchées autour de leurs villes voisines.`,'warn');return;}
    const occ=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&this.distB(b,L.x,L.y)<22).sort((a,z)=>this.distB(a,L.x,L.y)-this.distB(z,L.x,L.y));
    const def=this.defendersAt(L.x,L.y);if(!occ.length&&!def){L.next=this.s.t+6;return;}
    const from=cities.slice().sort((a,z)=>d2(a.x,a.y,L.x,L.y)-d2(z.x,z.y,L.x,L.y))[0];if(!from)return;
    const need=Math.min(30,Math.max(6,Math.ceil(def*1.6)+3));const pool=this.beeeMuster(from,cities,need,3);
    if(pool.length<Math.ceil(need*.8)){L.next=this.s.t+4;return;}
    const target=occ[0]||this.building(from.centre);const b=this.makeBand(pool,target,from);b.kind='reprise';L.attempts++;L.next=this.s.t+10;
    (this.s.fog?0:this.log(L.name,`Contre-attaque bèè : ${pool.length} Bèè marchent sur ${L.name} pour la reprendre.`,'bad'));this.s.fog||this.emit({type:'wave',n:pool.length,x:L.x,y:L.y,from:[from.x,from.y]});},
  // Se retrancher : une ville menacée (bombardée, voisine d'une ville perdue) creuse ses tranchées, face au danger ;
  // dig 1 : une ligne ; dig 2 : un réseau — deux lignes en arc et des boyaux. Les civils creusent, le pays paie.
  beeeFortify(cities){return;   /* (V12.5, demande du joueur) plus de tranchées ni de fosses : les Bèè ne creusent plus */
    const B=this.s.beee;B.digT=(B.digT||0)+1;if(B.digT<3)return;B.digT=0;
    const foes=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&typeof B.known?.[b.id]==='object'&&(b.k==='centre'||b.done));
    // la ville la plus proche de notre capitale, et toute ville à moins de 140 cases de nos bâtiments, se couvre d'une ligne dès le
    // dixième jour (quand sa garnison est là)
    {const cap=foes.find(b=>b.capital)||foes[0];const front=cap&&cities.slice().sort((a,z)=>d2(a.x,a.y,cap.i,cap.j)-d2(z.x,z.y,cap.i,cap.j))[0];
      const L=this.beeeLevel();for(const c of cities){const g=this.beeeGuards(c).length;if(g<3)continue;
        // niveau 1 : la ville du front et celles à portée de nos bâtiments ; niveau 3 : un réseau partout ; niveau 4 : toute ville, trois lignes
        // (V12.4 : au moins une fosse par ville dès que la guerre monte — niveau d'escalade ≥ 1 ; dès le premier jour, mesuré : les gardes allaient
        // à la fosse au lieu de fouiller, recherche 3,4 h au lieu de 0,14 h, test/mobilisation.mjs)
        const want=Math.max(L>=1?1:0,L>=4&&g>=6?3:L>=3&&g>=5?2:(L>=1&&(c===front||foes.some(b=>d2(b.i,b.j,c.x,c.y)<140)))?1:0);if(want>(c.dig||0))c.dig=want;}}
    for(const c of cities){const lvl=c.dig||0;if(!lvl||(c.dug||0)>=lvl)continue;const L=B.lostFront;
      const near=foes.sort((a,z)=>d2(a.i,a.j,c.x,c.y)-d2(z.i,z.j,c.x,c.y))[0],fx=near?near.i+2:this.N*.5,fy=near?near.j+2:this.N*.5,tx=c.shelled&&this.s.t-c.shelled.at<24?c.shelled.x:L&&d2(L.x,L.y,c.x,c.y)<90?L.x:fx,ty=c.shelled&&this.s.t-c.shelled.at<24?c.shelled.y:L&&d2(L.x,L.y,c.x,c.y)<90?L.y:fy;
      // V12.4 (demande du joueur : « un trou unique de genre 4 cases, pas un champ de trous ; au moins un par ville ») : des FOSSES de 2 × 2 cases, face au
      // danger — niveau 1 : une fosse à 12 cases ; niveau 2 : trois (12 cases, de face et sur les flancs) ; niveau 3 : cinq (deux de plus à 17 cases).
      // Avant : des arcs d'une case de large, dont les diagonales faisaient un damier de petits trous.
      const a0=Math.atan2(ty-c.y,tx-c.x);const spots=[];const at=(R,a)=>spots.push([c.x+Math.cos(a0+a)*R,c.y+Math.sin(a0+a)*R]);
      if((c.dug||0)<1)at(12,0);if(lvl>=2&&(c.dug||0)<2){at(12,-.6);at(12,.6);}if(lvl>=3&&(c.dug||0)<3){at(17,-.3);at(17,.3);}
      let ok=false;
      for(const [sx,sy] of spots){let pit=null;   // la fosse : la première place libre de 2 × 2 cases, au plus près du point voulu
        for(let r=0;r<=3&&!pit;r++)for(let dj=-r;dj<=r&&!pit;dj++)for(let di=-r;di<=r&&!pit;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;const i=Math.round(sx)+di,j=Math.round(sy)+dj;
          const cells=[[i,j],[i+1,j],[i,j+1],[i+1,j+1]];if(this.canLine('beee','sacs',cells).length===4)pit=cells;}
        if(pit&&this.planLine('beee','sacs',pit).ok){ok=true;const u=this.beeeAvailable?.(pit[0][0],pit[0][1],40)?.[0];if(u)this.beeeAssign(u,{kind:'line',line:'sacs',x:pit[0][0],y:pit[0][1]});}}
      c.dug=lvl;if(ok)this.log(c.name,lvl>=2?`${c.name} se couvre de fosses de combat.`:`${c.name} creuse une fosse de combat face à la menace.`,'warn');}
    // les terrassiers : tant qu'une ligne n'est pas finie, trois villageois de la ville y creusent (les gardes l'occuperont à l'alerte,
    // voir beeeGarrison)
    const N=this.N;for(const c of cities){if(!(c.dig>0))continue;const todo=Object.keys(this.s.sacs).map(Number).filter(k=>{const t=this.s.sacs[k];return t.f==='beee'&&!t.b&&d2(k%N+.5,((k/N)|0)+.5,c.x,c.y)<22;});if(!todo.length)continue;
      const diggers=this.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='line'&&u.task.line==='sacs'&&d2(u.x,u.y,c.x,c.y)<40).length;
      for(let n=diggers;n<Math.min(3,todo.length);n++){const k=todo[Math.floor(this.rand()*todo.length)];const u=this.beeeAvailable?.(k%N,(k/N)|0,45)?.[0];if(!u)break;this.beeeAssign(u,{kind:'line',line:'sacs',x:k%N,y:(k/N)|0});}}},
  // ce qu'ils ont vu ou entendu : une alerte, un point et un rayon d'incertitude
  beeeNotice(x,y,r,why){const B=this.s.beee;B.alerts??=[];const a=B.alerts.find(a=>d2(a.x,a.y,x,y)<8&&this.s.t-a.t<2);if(a){const repeat=this.s.t-a.t>.3||a.why!==why;a.x=(a.x+x)/2;a.y=(a.y+y)/2;a.t=this.s.t;a.r=Math.min(a.r,r);a.why=why;if(repeat)a.done=false;return;}
    B.alerts.push({x,y,r,t:this.s.t,why,done:false});if(B.alerts.length>20)B.alerts.shift();
    const w={explosion:1.6,'camarade abattu':1.2,vu:.6,pas:.5,tir:.35,claquement:.25,bruit:.3}[why]||.3;for(const c of B.cities){if(c.fallen)continue;const d=d2(c.x,c.y,x,y);if(d<60)c.threat=Math.min(4,(c.threat||0)+w);else if(d<160)c.threat=Math.min(3,(c.threat||0)+w*.35);}
    if(why==='vu')B.lead={x,y,t:this.s.t};},
  // l'alerte la plus fraîche à moins de 30 cases d'un Bèè (trois heures au plus)
  beeeAlertNear(u){let best=null;const t=this.s.t;for(const a of this.s.beee.alerts||[]){if(t-a.t>=3||d2(a.x,a.y,u.x,u.y)>=30)continue;if(!best||a.t>best.t)best=a;}return best;},
  // Le regard d'un garde à son poste. En alerte, il se tourne vers le bruit et s'accroupit ; sinon il tourne la tête toutes les
  // 0,1 à 0,25 h : une sentinelle vers l'extérieur de sa ville (à 70° près), un garde autour de son poste (surtout vers le dehors).
  beeeLook(u,T0,a){const t=this.s.t;
    if(a){if(a.cone)this.face(u,Math.cos(a.bearing),Math.sin(a.bearing));else this.face(u,a.x-u.x,a.y-u.y);if(!u.orderPost){u.orderPost='accroupi';u.alertPost=1;}u.lookT=t+.05;return;}
    if(u.alertPost){u.alertPost=0;if(u.orderPost==='accroupi'&&!u.sentry&&!u.inTrench)u.orderPost=null;}
    if(t<(u.lookT??0))return;u.lookT=t+.1+this.rand()*.15;
    const c=this.s.beee.cities.find(c=>c.id===u.city);const out=c&&d2(u.x,u.y,c.x,c.y)>1?Math.atan2(u.y-c.y,u.x-c.x):null;
    let an;if(T0.fx!=null)an=Math.atan2(T0.fy,T0.fx)+(this.rand()-.5)*2.1;
    else if(u.sentry&&out!=null)an=out+(this.rand()-.5)*2.44;
    else if(out!=null&&this.rand()<.65)an=out+(this.rand()-.5)*3.5;
    else an=this.rand()*6.283;
    this.face(u,Math.cos(an),Math.sin(an));},
  // Le bruit d'un de nos tirs. La bouche situe le tireur (le silencieux la couvre, s'il n'est pas usé ou sec) ; le claquement
  // d'une balle supersonique s'entend le long de sa trajectoire, plus fort que la bouche d'une arme silencieuse — mais les Bèè
  // le situent mal : ils cherchent du côté où les balles passent, pas d'où elles partent.
  shotNoise(u,W,x1,y1){let dB=W.dB;const S=W.sup;if(S){u.supUse=(u.supUse||0)+1;let R=S.R;if(S.life)R*=1-(1-S.floor)*Math.min(1,(u.supUse-1)/S.life);if(S.wet)R*=u.supUse<=S.wet?S.wetK:1;dB=Math.max(W.actDb||100,Math.round(W.dB0-Math.min(38,R)));}
    u.lastDb=dB;u.firedAt=this.s.t;u.firedK=1+.9*Math.max(0,Math.min(1,Math.max(W.flash||0,(dB-125)/25)));if(u.f!=='meumeu')return;this.beeeHear(u.x,u.y,dB);
    if(W.crackDb>dB+2&&x1!=null){const k=.4+this.rand()*.5;this.beeeHear(u.x+(x1-u.x)*k,u.y+(y1-u.y)*k,W.crackDb,'claquement');}},
  // La reconnaissance lointaine : les Bèè savent que l'ennemi a commencé dans le coin d'en face (la carte le veut ainsi) ; depuis la ville la plus avancée,
  // un binôme pousse une pointe dans cette direction — de plus en plus loin, de plus en plus souvent à mesure que la guerre s'aggrave — et rentre.
  // Ce qu'il voit nourrit le renseignement (beeeScout) : sans lui, les offensives attendaient que nous passions à portée de leurs villes.
  // (ils connaissent notre direction, pas notre position : l'éclaireur la suit jusqu'au bout — bornée à 140 + 60 × niveau, la reconnaissance ne nous
  // trouvait qu'au jour 27 quand nous sommes à 430 cases)
  beeeRecon(cities){const B=this.s.beee,t=this.s.t,L=this.beeeLevel();if(L<1||!cities.length||t<(B.reconT||0))return;
    // la ville la plus avancée QUI PEUT céder deux éclaireurs (mesuré : la plus avancée, une jeune colonie de 2 à 5 gardes, ne le pouvait jamais —
    // aucune reconnaissance lointaine en 30 jours, aucun bâtiment meumeu connu, aucune offensive)
    const N=this.N,goal=[N*.12,N*.88];const c=cities.slice().sort((a,z)=>d2(a.x,a.y,goal[0],goal[1])-d2(z.x,z.y,goal[0],goal[1])).find(c=>{const n=this.beeeGuards(c).length;return n>=6||n>=this.beeeGarrisonMin(c)+2;});if(!c)return;
    const g=this.beeeGuards(c);
    const active=this.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='patrol'&&u.task.recon).length;if(active>=2*(1+(L>=3?1:0)))return;
    const d=d2(c.x,c.y,goal[0],goal[1]),reach=d*.97,ang=Math.atan2(goal[1]-c.y,goal[0]-c.x)+Math.atan2((((B.reconN=(B.reconN||0)+1)%3)-1)*25,Math.max(30,reach));   // ±25 cases à l'arrivée (±0,35 rad, c'était ±150 cases à 430 : deux paires sur trois passaient loin de nous)
    const tx=Math.max(4,Math.min(N-5,c.x+Math.cos(ang)*reach)),ty=Math.max(4,Math.min(N-5,c.y+Math.sin(ang)*reach));const fs=this.freeSpot(tx,ty,8);const route=this.scoutRoute(c,[fs[0],fs[1]]);
    for(const u of g.slice(0,2)){u.task={kind:'patrol',pts:route,i:0,until:t+20+reach*.8,home:[c.x,c.y],city:c.id,sector:1,road:1,recon:1};u.path=null;}
    B.reconT=t+DAY*(L>=3?1.2:2.4);},
  // l'itinéraire d'une reconnaissance : un vrai chemin (calculé une fois), en étapes de 15 cases, aller et retour
  scoutRoute(c,p){const N=this.N,cl=v=>Math.max(0,Math.min(N-1,Math.floor(v)));const ti=cl(p[0]),tj=cl(p[1]);const cost=this.costFn('beee');
    const r=this.pather.find(cl(c.x),cl(c.y),ti,tj,cost,k=>Math.abs(k%N-ti)<=3&&Math.abs(((k/N)|0)-tj)<=3,Math.max(60000,N*300));const P=r.path||[];
    const out=[];const ok=r.done&&P.length>5;if(ok){for(let k=14;k<P.length;k+=15)out.push([P[k][0]+.5,P[k][1]+.5]);out.push([P[P.length-1][0]+.5,P[P.length-1][1]+.5]);}
    else{const L=d2(p[0],p[1],c.x,c.y),n=Math.max(1,Math.ceil(L/15));for(let k=1;k<=n;k++)out.push(this.freeSpot(c.x+(p[0]-c.x)*k/n,c.y+(p[1]-c.y)*k/n,4));}   // pas de chemin connu : en ligne droite, étape par étape
    const back=out.slice(0,-1).reverse();back.push([c.x,c.y]);return out.concat(back);},
  beeeGuards(c){return (this.beeeByCity?this.beeeByCity(c.id):this.s.units).filter(u=>u.f==='beee'&&u.city===c.id&&u.task?.kind==='guard'&&active(u)&&!u.band&&!u.sentry&&!u.heavy);},
  // La garnison : ce qu'une ville garde toujours, selon sa taille (quatre à dix soldats ; la capitale et les greniers un peu plus).
  beeeGarrisonMin(c){const ct=this.building(c.centre);if(!ct)return 0;const res=ct.done?this.cityStats(ct).res:0;const cap=c===this.s.beee.cities.find(x=>!x.fallen);
    return Math.min(10,4+Math.floor(res/10)+(cap?2:0)+(ct.granary?1:0));},
  // Les soldats d'une ville (gardes, sentinelles, rondes, fouilles) : ceux qui sont à elle et ne sont pas partis en bande
  beeeTroops(c){return this.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&u.city===c.id&&active(u)&&!u.band&&['guard','patrol','search'].includes(u.task?.kind));},
  // Les points clés d'une ville : le centre, les dépôts, la gare, les usines, les mines — un garde à chacun, à tour de rôle
  beeeKeyPoints(c){const w={centre:9,entrepot:8,gare:7,grenier:6,arsenal:6,manufacture:6,poudrerie:6,mine:5,caserne:4,moulin:3,atelier:3,camp:2};
    return this.s.buildings.filter(b=>b.f==='beee'&&b.done&&!b.ruin&&w[b.k]&&d2(b.i,b.j,c.x,c.y)<30).sort((a,z)=>w[z.k]-w[a.k]).slice(0,7);},
  // Chaque heure : les soldats sans ville rejoignent la plus proche ; une ville sous son minimum reçoit des gardes de la ville la
  // plus proche qui en a de trop ; au calme, chaque garde tient un point clé ; à l'alerte (des Meumeu vus tout près, une menace
  // forte, un bombardement), les gardes descendent dans les tranchées de la ville et s'y couchent.
  beeeGarrison(cities){const t=this.s.t;
    /* (V12.5) ni ceux d'une tête de pont, d'un assaut ou du port, et seulement une ville de la même terre — mesuré : chaque heure, les hommes des têtes de pont
       étaient rendus à une ville de l'autre côté de la mer, et les soldats appelés au port renvoyés chez eux (8 à 28 sur 100 y arrivaient) */
    const L=this.landComp(),N=this.N,lk=(x,y)=>L[Math.floor(y)*N+Math.floor(x)];
    for(const u of this.s.units){if(u.f!=='beee'||u.k!=='soldat'||!active(u)||u.band||u.head||u.stage||u.amphi!=null||u.task&&u.task.kind!=='guard')continue;if(u.city!=null&&cities.some(c=>c.id===u.city))continue;
      const k=lk(u.x,u.y),c=cities.filter(c=>lk(c.x,c.y)===k).sort((a,z)=>d2(a.x,a.y,u.x,u.y)-d2(z.x,z.y,u.x,u.y))[0];if(!c)continue;u.city=c.id;u.home=c.centre;u.keyB=null;u.task={kind:'guard',tx:c.x+2,ty:c.y+3};u.path=null;}
    // pas assez de soldats pour toutes les garnisons : chacune au prorata (deux au moins), pour qu'aucune ville ne reste vide
    const need=new Map(cities.map(c=>[c,this.beeeGarrisonMin(c)])),have=new Map(cities.map(c=>[c,this.beeeTroops(c).length]));
    {const sN=[...need.values()].reduce((a,n)=>a+n,0),sH=[...have.values()].reduce((a,n)=>a+n,0);if(sH<sN)for(const c of cities)need.set(c,Math.max(2,Math.floor(need.get(c)*sH/sN)));}
    for(const c of cities){let miss=need.get(c)-have.get(c);if(miss<=0)continue;let sent=0;
      for(const o of cities.filter(o=>o!==c&&have.get(o)>need.get(o)).sort((a,z)=>d2(a.x,a.y,c.x,c.y)-d2(z.x,z.y,c.x,c.y))){
        const g=this.beeeGuards(o).slice(0,Math.min(miss,have.get(o)-need.get(o)));for(const u of g){u.city=c.id;u.home=c.centre;u.keyB=null;u.orderPost=null;u.task={kind:'guard',tx:c.x+2+(this.rand()-.5)*4,ty:c.y+3+(this.rand()-.5)*4};u.path=null;}
        have.set(o,have.get(o)-g.length);have.set(c,have.get(c)+g.length);miss-=g.length;sent+=g.length;if(miss<=0)break;}
      if(sent&&!this.s.fog&&t-(c.garT||-99)>24){c.garT=t;this.log(c.name,`${sent} soldats bèè viennent renforcer la garnison de ${c.name}.`,'warn');}}
    for(const c of cities){const I=this.intrudersNear(c.x,c.y,40);const alert=I.length>0||(c.threat||0)>=1.6||c.shelled&&t-c.shelled.at<6;
      if(alert&&!c.alertT){c.alertT=t;c.dig=Math.max(c.dig||0,1);}else if(!alert&&c.alertT&&t-c.alertT>4)c.alertT=null;
      const g=this.beeeGuards(c);const N=this.N;
      const T0=Object.keys(this.s.sacs).map(Number).filter(k=>{const o=this.s.sacs[k];return o.f==='beee'&&o.b&&d2(k%N+.5,((k/N)|0)+.5,c.x,c.y)<24;}),T=alert?T0:[];
      // les sentinelles : la nuit, une (deux pour une grosse garnison) aux points clés, accroupies ; le jour, au calme, elles rentrent
      const night=this.light()<.4,S=this.s.units.filter(u=>u.f==='beee'&&u.sentry&&u.city===c.id&&active(u)&&!u.band);
      if(!night&&!alert&&(c.threat||0)<.8)for(const u of S){u.sentry=false;u.keyB=null;u.orderPost=null;if(u.task?.kind!=='guard')u.task={kind:'guard',tx:c.x+2,ty:c.y+3};}
      else if(night&&g.length>=4){const K=this.beeeKeyPoints(c);for(let k=S.length;k<Math.min(K.length,g.length>=8?2:1);k++){const u=g.pop();const b=K[k];const [w,h]=this.sizeOf(b);const [x,y]=this.freeSpot(b.i+w/2,b.j-.8,2);u.sentry=true;u.keyB=null;u.task={kind:'guard',tx:x,ty:y};u.orderPost='accroupi';u.path=null;}}
      if(T.length){T.sort((p,q)=>Math.atan2((p/N|0)-c.y,p%N-c.x)-Math.atan2((q/N|0)-c.y,q%N-c.x));
        // tous à la tranchée sauf deux (qui restent au centre, en réserve) ; répartis le long de la ligne
        const go=g.slice(0,Math.max(0,g.length-2));go.forEach((u,q)=>{const k=T[Math.floor((q+.5)*T.length/go.length)];const x=k%N+.5,y=((k/N)|0)+.5;u.inTrench=true;if(d2(u.task.tx,u.task.ty,x,y)>.8){u.task.tx=x;u.task.ty=y;u.orderPost='couche';u.path=null;}});continue;}
      // au calme : la moitié de la garnison tient la tranchée (accroupie, de veille, répartie le long de la ligne) ; les autres aux points clés
      if(T0.length&&g.length>=4){T0.sort((p,q)=>Math.atan2((p/N|0)-c.y,p%N-c.x)-Math.atan2((q/N|0)-c.y,q%N-c.x));g.sort((p,q)=>Number(!!q.inTrench)-Number(!!p.inTrench));
        const hold=g.splice(0,Math.floor(g.length/2));hold.forEach((u,q)=>{const k=T0[Math.floor((q+.5)*T0.length/hold.length)];const x=k%N+.5,y=((k/N)|0)+.5;u.inTrench=true;u.keyB=null;if(d2(u.task.tx,u.task.ty,x,y)>.8){u.task.tx=x;u.task.ty=y;u.orderPost='accroupi';u.path=null;}});}
      // au calme : un garde par point clé (le plus important d'abord), le reste autour du centre
      const K=this.beeeKeyPoints(c);if(!K.length)continue;const used=new Map();for(const u of g)if(u.keyB&&!u.inTrench&&K.some(b=>b.id===u.keyB))used.set(u.keyB,(used.get(u.keyB)||0)+1);
      for(const u of g){if(u.keyB&&!u.inTrench&&K.some(b=>b.id===u.keyB))continue;const b=K.slice().sort((p,q)=>(used.get(p.id)||0)-(used.get(q.id)||0))[0];used.set(b.id,(used.get(b.id)||0)+1);
        const [w,h]=this.sizeOf(b);const n=used.get(b.id);const [x,y]=this.freeSpot(b.i+w/2+(n%2?-1:1)*(w/2+.8),b.j+h+.8,2);u.keyB=b.id;u.inTrench=false;u.orderPost=null;u.task.tx=x;u.task.ty=y;u.path=null;}
      // La relève : quand des gardes partent en fouille ou en ronde, les points clés les plus importants ne restent pas vides. Un garde
      // d'un point moins important (ou d'un point tenu à deux) vient le remplacer ; on ne déplace jamais vers un point moins important.
      {const rank=id=>K.findIndex(x=>x.id===id);
       for(const b of K){if((used.get(b.id)||0)>0)continue;
         const donors=g.filter(u=>!u.inTrench&&u.keyB&&rank(u.keyB)>=0&&(rank(u.keyB)>rank(b.id)||(used.get(u.keyB)||0)>1)).sort((p,q)=>rank(q.keyB)-rank(p.keyB));
         const u=donors[0];if(!u)break;
         used.set(u.keyB,(used.get(u.keyB)||0)-1);used.set(b.id,1);
         const [w,h]=this.sizeOf(b);const [x,y]=this.freeSpot(b.i+w/2+(w/2+.8),b.j+h+.8,2);u.keyB=b.id;u.orderPost=null;u.task.tx=x;u.task.ty=y;u.path=null;}}
    }},
  // La défense, tous les quarts d'heure : une ville qui voit des Meumeu à 34 cases sort sa garnison et appelle ses voisines.
  beeeDefend(cities){const B=this.s.beee;B.bands??=[];
    // la défense : la garnison sort (sauf deux), les villes voisines à moins de 110 cases envoient ce qu'elles ont au-delà de la
    // moitié de leur propre garnison ; une bande de défense déjà dehors reçoit les renforts qui arrivent ensuite
    for(const c of cities){const I=this.intrudersNear(c.x,c.y,34);if(!I.length)continue;const cur=B.bands.find(b=>b.kind==='defense'&&b.city===c.id);
      const need=Math.max(4,Math.ceil(I.filter(u=>u.w||UDEF(u).img).length*1.6)+1);let pool=cur?[]:this.beeeGuards(c).slice(0,Math.max(0,this.beeeGuards(c).length-Math.max(2,Math.ceil(this.beeeGarrisonMin(c)/2)))).slice(0,this.beeeRoom(c,true));
      if(cur&&cur.m.map(id=>this.unit(id)).filter(active).length>=need)continue;
      for(const o of cities.filter(o=>o!==c).sort((a,z)=>d2(a.x,a.y,c.x,c.y)-d2(z.x,z.y,c.x,c.y))){if(pool.length>=need)break;if(d2(o.x,o.y,c.x,c.y)>80||this.rand()<.35)continue;const g=this.beeeGuards(o);pool=pool.concat(g.slice(0,Math.max(0,g.length-Math.ceil(this.beeeGarrisonMin(o)/2))).slice(0,this.beeeRoom(o,true)));}
      // (les secours tardent : pas toutes les voisines, pas tout de suite — seulement celles à moins de 80 cases, deux fois sur trois)
      if(cur){if(pool.length){pool=pool.slice(0,need);for(const u of pool){cur.m.push(u.id);u.from=u.city??u.from;u.city=null;u.band=cur.id;u.keyB=null;u.task={kind:'band',tx:u.x,ty:u.y};u.path=null;}cur.peak=Math.max(cur.peak,cur.m.length);
        if(!this.s.fog&&this.s.t-(c.helpT??-99)>6&&(c.helpT=this.s.t))this.log(c.name,`${pool.length} Bèè accourent des villes voisines au secours de ${c.name}.`,'warn');}continue;}
      pool=pool.slice(0,need);if(pool.length<2)continue;const centre=this.building(c.centre)||this.s.buildings.find(b=>b.f==='beee'&&b.k==='centre'&&!b.ruin);if(!centre)continue;
      const band=this.makeBand(pool,centre,{x:c.x,y:c.y});band.kind='defense';band.city=c.id;
      // la contre-attaque : l'offensive suivante est avancée (elle vise d'abord ce que nous avons près de leurs villes)
      B.nextWave=Math.min(B.nextWave??1e9,this.s.t+8);
      this.log('Front',`${c.name} : ${pool.length} Bèè sortent à la rencontre de nos ${I.length} Meumeu.`,'warn');this.emit({type:'band',state:'defense',x:c.x,y:c.y});}
    },
  // Le plan d'un raid : ce qui fait tenir l'ennemi, là où il est faible. Une voie ferrée loin de ses soldats vaut autant qu'une gare.
  // Ils partent à deux contre un au moins ; s'ils ne sont pas assez, ils choisissent plus faible, ou attendent.
  // Les buts de guerre bèè : la tension vient du voisinage — ce que nous bâtissons près de chez eux (et eux près de chez nous).
  //  · détruire un avant-poste (camp, mine, gare, ville nouvelle) trop proche ; · s'installer : raser ce qui gêne près d'un filon, puis y bâtir ;
  //  · nous affaiblir : mines, gares, usines, dépôts, voies ; · l'offensive finale sur notre capitale, seulement quand ils estiment
  //    nous avoir fait assez de mal (le compte des dégâts) et que notre armée ne fait plus le poids.
  beeeFinal(mobile){const B=this.s.beee;const ourArmy=this.s.units.filter(u=>u.f==='meumeu'&&active(u)&&(u.w||UDEF(u).img)).length;return (B.hurt||0)>=22&&mobile>=ourArmy*1.6+4;},
  beeeAimOf(b,dc,final){const ore=['camp','mine'].includes(b.k)&&this.s.nodes.some(n=>n.res&&n.left>0&&d2(n.i,n.j,b.i,b.j)<12);
    if(b.capital)return final?'finale':null;if(dc<70&&(ore||b.k==='camp'))return 'installation';if(dc<90&&['camp','mine','gare','centre','tour'].includes(b.k))return 'avant-poste';return 'affaiblir';},
  AIMTXT:{diversion:'une diversion','contre-attaque':'une contre-attaque',finale:'offensive finale',installation:'pour s’installer',['avant-poste']:'contre un avant-poste',affaiblir:'pour nous affaiblir',represailles:'en représailles, contre nos greniers'},
  // couper une voie : sans explosifs, ils la démontent (tire-fonds, éclisses, traverses) sur quelques cases — une heure et demie
  bandRailCut(b,up){const N=this.N;const k=b.rail;const x=k%N+.5,y=((k/N)|0)+.5;const close=up.filter(u=>d2(u.x,u.y,x,y)<1.6);if(close.length<Math.min(2,up.length)){for(const u of up){u.task.tx=x+(u.id%3-1)*.8;u.task.ty=y+((u.id/3|0)%3-1)*.8;}return false;}
    b.cutT=(b.cutT||0)+this.dt;if(b.cutT<1.5)return false;let n=0;for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const kk=(((y|0)+dj)*N)+(x|0)+di;if(this.s.rails[kk]?.b){this.lineBroken('rail',kk);n++;}}
    if(n){this.emit({type:'rail-cut',x,y});this.log('Front',`Des Bèè ont démonté ${n} case${n>1?'s':''} de voie ferrée.`,'bad');}return true;},
  // ---------- les groupes bèè ----------
  band(id){return this.s.beee.bands?.find(b=>b.id===id)||null;},
  bandMembers(b){return b?b.m.map(id=>this.unit(id)).filter(alive):[];},
  makeBand(units,target,from){const B=this.s.beee;B.bands??=[];
    const b={id:this.id(),m:units.map(u=>u.id),target:target.id,from:[from.x,from.y],state:'approche',t:0,eval:0,peak:units.length,morale:1,spacing:1.8,
      anchor:null,dir:null,contactT:-9,half:0,smoked:false};
    for(const u of units){u.from=u.city??u.from;u.city=null;u.band=b.id;u.task={kind:'band',tx:u.x,ty:u.y};u.path=null;}
    B.bands.push(b);return b;},
  // ce que le groupe voit : les nôtres, actifs, à vue d'au moins un de ses membres
  bandContacts(b,up){const r=this.sight()+2;const seen=[];
    for(const e of this.s.units){if(e.f===b.f||e.f!=='meumeu'||!active(e))continue;
      if(!this.spotted(e,'beee'))continue;for(const u of up){if(d2(u.x,u.y,e.x,e.y)<r&&this.los(u.x,u.y,e.x,e.y)){seen.push(e);break;}}}
    return seen;},
  // la ligne du groupe : perpendiculaire à `dir`, centrée sur `c`, chacun à `sp` cases de son voisin ; les places couvertes
  // (un arbre, un rocher, un mur, une ruine entre la place et l'ennemi) sont préférées si elles ne sont pas trop loin
  bandLine(b,up,c,dir,enemy=null){const n=up.length,px=-dir[1],py=dir[0],sp=b.spacing;const slots=[];
    for(let q=0;q<n;q++){const off=(q-(n-1)/2)*sp;let x=c[0]+px*off,y=c[1]+py*off;
      if(enemy){let best=null,bv=0;for(let dx=-1.5;dx<=1.5;dx+=.75)for(let dy=-1.5;dy<=1.5;dy+=.75){const sx=x+dx,sy=y+dy;const k=Math.floor(sy)*this.N+Math.floor(sx);
          if(!this.G.terrain||this.occ[k]>=0||this.nodeAt[k]>=0)continue;const cv=this.coverFor({x:sx,y:sy},enemy.x,enemy.y);const v=cv?cv.h*cv.p-Math.hypot(dx,dy)*.02:0;if(v>bv){bv=v;best=[sx,sy];}}
        if(best){x=best[0];y=best[1];}}
      slots.push(this.freeSpot(x,y));}
    // chacun prend la place la plus proche de lui (sans croiser toute la ligne)
    const order=up.slice().sort((a,z)=>(a.x*px+a.y*py)-(z.x*px+z.y*py));order.forEach((u,q)=>{u.task.tx=slots[q][0];u.task.ty=slots[q][1];});},
  freeSpot(x,y,r=2.5){const N=this.N;x=Math.max(1,Math.min(N-2,x));y=Math.max(1,Math.min(N-2,y));const ok=(i,j)=>{if(i<0||j<0||i>=N||j>=N)return false;const k=j*N+i;return !!TERRAIN[this.G.terrain[k]]?.walk&&this.occ[k]<0&&this.nodeAt[k]<0;};
    if(ok(Math.floor(x),Math.floor(y)))return [x,y];for(let rr=1;rr<=r;rr++)for(let a=0;a<8*rr;a++){const t=a/(8*rr)*Math.PI*2,i=Math.floor(x+Math.cos(t)*rr),j=Math.floor(y+Math.sin(t)*rr);if(ok(i,j))return [i+.5,j+.5];}return [x,y];},
  // le chemin du groupe : un vrai itinéraire (lacs, reliefs, forêts contournés), recalculé toutes les six heures ;
  // le groupe vise le point du chemin quelques cases devant lui
  // Le grand chemin : la carte vue en carrés de huit cases (praticables si l'on marche sur la moitié au moins) ; un A* sur ce
  // quadrillage, instantané et complet, donne les étapes d'une longue marche (le chemin fin, lui, s'épuise avant d'arriver au
  // bout de la carte et menait les colonnes dans des culs-de-sac) ; entre deux étapes, chacun trouve son chemin.
  coarseRoute(x0,y0,x1,y1){const N=this.N,S=8,M=Math.ceil(N/S);
    if(!this._coarse){const ok=new Uint8Array(M*M);for(let J=0;J<M;J++)for(let I=0;I<M;I++){let w=0,n=0;for(let j=J*S;j<Math.min(N,J*S+S);j++)for(let i=I*S;i<Math.min(N,I*S+S);i++){n++;if(TERRAIN[this.G.terrain[j*N+i]]?.walk)w++;}ok[J*M+I]=w>=n*.5?1:0;}this._coarse={ok,M,P:new Pather(M)};}
    const C=this._coarse,cl=v=>Math.max(0,Math.min(M-1,Math.floor(v/S)));const si=cl(x0),sj=cl(y0),ti=cl(x1),tj=cl(y1),s0=sj*M+si;
    const r=C.P.find(si,sj,ti,tj,k=>C.ok[k]||k===s0?1:Infinity,k=>Math.abs(k%M-ti)<=1&&Math.abs(((k/M)|0)-tj)<=1);
    return r.path.map(([i,j])=>[i*S+S/2,j*S+S/2]);},
  bandWaypoint(b,c,g){g=this.freeSpot(g[0],g[1],6);const N=this.N,key=Math.floor(g[0])+','+Math.floor(g[1]);
    // loin du but : les étapes du grand chemin, deux carrés devant le groupe
    if(d2(g[0],g[1],c[0],c[1])>45){const ck=Math.floor(g[0]/8)+','+Math.floor(g[1]/8);if(!b.croute||b.ckey!==ck||this.s.t-(b.crouteT||0)>12){b.croute=this.coarseRoute(c[0],c[1],g[0],g[1]);b.ckey=ck;b.ci=0;b.crouteT=this.s.t;}
      const R=b.croute;if(R.length>1){let best=b.ci||0,bd=1e9;for(let k=b.ci||0;k<Math.min(R.length,(b.ci||0)+12);k++){const d=d2(R[k][0],R[k][1],c[0],c[1]);if(d<bd){bd=d;best=k;}}b.ci=best;const w=R[Math.min(R.length-1,best+2)];return this.freeSpot(w[0],w[1],5);}}
    if(!b.route||b.routeKey!==key||this.s.t-(b.routeT||0)>6){const cl=v=>Math.max(0,Math.min(N-1,Math.floor(v)));const ti=cl(g[0]),tj=cl(g[1]);const cost=this.costFn('beee');
      const r=this.pather.find(cl(c[0]),cl(c[1]),ti,tj,cost,k=>Math.abs(k%N-ti)<=2&&Math.abs(((k/N)|0)-tj)<=2&&cost(k)!==Infinity,Math.max(40000,N*160));b.route=r.path||[];b.routeKey=key;b.routeT=this.s.t;b.ri=0;}
    const R=b.route;if(!R.length)return g;let best=b.ri||0,bd=1e9;for(let k=b.ri||0;k<Math.min(R.length,(b.ri||0)+40);k++){const d=d2(R[k][0]+.5,R[k][1]+.5,c[0],c[1]);if(d<bd){bd=d;best=k;}}
    b.ri=best;const w=R[Math.min(R.length-1,best+5)];return [w[0]+.5,w[1]+.5];},
  // la marche : une colonne par deux, serrée — la ligne de front ne se forme qu'au contact
  bandColumn(b,up,c,dir){const px=-dir[1],py=dir[0];const order=up.slice().sort((a,z)=>((z.x-c[0])*dir[0]+(z.y-c[1])*dir[1])-((a.x-c[0])*dir[0]+(a.y-c[1])*dir[1]));
    // V12.4 (demande du joueur : « des formations plus espacées ») : deux files à 1,6 case l'une de l'autre, un rang toutes les 1,8 cases (avant 0,9 et 0,9 :
    // un paquet serré qu'un seul obus fauchait)
    order.forEach((u,q)=>{const row=Math.floor(q/2),side=q%2?.8:-.8;const [x,y]=this.freeSpot(c[0]-dir[0]*row*1.8+px*side,c[1]-dir[1]*row*1.8+py*side);u.task.tx=x;u.task.ty=y;});},
  // l'échelon : une ligne en biais (chacun 1,5 case en retrait et 1,6 case de côté de celui qui le précède) — à l'approche de l'objectif, chacun voit
  // et tire devant lui sans masquer le voisin ; le côté refusé (gauche ou droite) dépend du groupe
  bandEchelon(b,up,c,dir){const px=-dir[1],py=dir[0],sg=b.id%2?1:-1;const order=up.slice().sort((a,z)=>((z.x-c[0])*dir[0]+(z.y-c[1])*dir[1])-((a.x-c[0])*dir[0]+(a.y-c[1])*dir[1]));
    order.forEach((u,q)=>{const [x,y]=this.freeSpot(c[0]-dir[0]*q*1.5+px*sg*q*1.6,c[1]-dir[1]*q*1.5+py*sg*q*1.6);u.task.tx=x;u.task.ty=y;});},
  bandRange(up){const rs=up.filter(u=>u.w||UDEF(u).img).map(u=>this.engageRange(u)).sort((a,z)=>a-z);return rs.length?rs[Math.floor(rs.length/2)]:8;},
  bandSet(b,state,why=''){if(b.state===state)return;b.state=state;b.t=0;b.eval=0;b.why=why;
    if(state==='assaut'||state==='repli'||state==='feu'||state==='objectif'){const up=this.bandMembers(b).filter(active);const L=up[0];if(L&&b.f!=='x')this.emit({type:'band',state,x:L.x,y:L.y});}},
  bandsTick(dt){const B=this.s.beee;if(!B.bands?.length)return;
    for(const b of [...B.bands]){const ms=this.bandMembers(b);const up=ms.filter(active);
      if(!up.length){B.bands.splice(B.bands.indexOf(b),1);continue;}
      // un membre qu'une autre logique a détourné (cible tombée, retour au camp) revient au groupe
      for(const u of up)if(!u.task||(u.task.kind!=='band'&&u.task.kind!=='bandcarry'&&!(u.task.kind==='assault'&&b.state==='objectif'))){u.task={kind:'band',tx:u.x,ty:u.y};u.path=null;}
      // un membre coincé (un bâtiment, un passage) depuis deux heures ne retient pas le groupe : on part sans lui
      if(b.state==='approche'||b.state==='bond'||b.state==='repli'||b.state==='rassemblement')for(const u of up){const m=Math.hypot(u.x-(u.lastX??u.x),u.y-(u.lastY??u.y));if(m>.05||d2(u.x,u.y,u.task.tx,u.task.ty)<1){u.stuckT=0;u.lastX=u.x;u.lastY=u.y;}else if((u.stuckT=(u.stuckT||0)+dt)>2&&up.length>1){u.band=null;u.stuckT=0;{const home=this.s.beee.cities.filter(x=>!x.fallen).sort((p,q)=>d2(p.x,p.y,u.x,u.y)-d2(q.x,q.y,u.x,u.y))[0];u.city=home?.id??null;u.task={kind:'guard',tx:home?home.x+(this.rand()-.5)*6:u.x,ty:home?home.y+(this.rand()-.5)*6:u.y};u.path=null;}b.m=b.m.filter(id=>id!==u.id);b.peak=Math.max(1,b.peak-1);}}
      if(up.length<=2&&b.peak>=4&&(b.state==='approche'||b.state==='bond')&&up.every(u=>(u.stuckT||0)>1.5)){this.bandDisband(b,up);continue;}
      b.t+=dt;b.eval-=dt;const c=[up.reduce((a,u)=>a+u.x,0)/up.length,up.reduce((a,u)=>a+u.y,0)/up.length];
      // une expédition qui s'éternise (trente heures de plus que la marche jusqu'à sa cible, et plus un coup de feu depuis six heures) renonce et rentre
      b.age=(b.age||0)+dt;if(b.state==='rassemblement'||b.state==='attente'){b.goT=b.age;b.lim=null;}
      if(b.kind!=='defense'&&b.state!=='repli'&&b.state!=='rassemblement'&&b.state!=='attente'&&b.age-(b.goT||0)>(b.lim??=30+(()=>{const T=this.building(b.target);return T?d2(...this.bc(T),c[0],c[1]):120;})()/4)&&this.s.t-b.contactT>6){this.bandRetreat(b,up,c,true);continue;}
      const target=this.building(b.target);let goal=b.kind==='rail'&&this.s.rails[b.rail]?.b?[b.rail%this.N+.5,((b.rail/this.N)|0)+.5]:target&&!target.ruin?this.bc(target):null;
      if(b.kind==='rail'&&!goal&&b.state!=='repli'){this.bandRetreat(b,up,c,true);continue;}
      if(b.kind==='defense'&&b.state!=='repli'){const city=this.s.beee.cities.find(x=>x.id===b.city);const I=city?this.intrudersNear(city.x,city.y,34):[];
        if(I.length){b.calmT=0;goal=[I.reduce((a,u)=>a+u.x,0)/I.length,I.reduce((a,u)=>a+u.y,0)/I.length];b.lastI=goal;}
        else{b.calmT=(b.calmT||0)+dt;if(b.calmT>3){
            // l'intrus chassé : s'ils sont encore nombreux et d'attaque, ils le poursuivent jusqu'à chez lui (notre bâtiment le plus proche de là d'où il venait)
            const L=b.lastI,tg=L&&up.length>=6&&b.morale>.55&&this.s.buildings.filter(o=>o.f==='meumeu'&&B.known?.[o.id]&&typeof B.known[o.id]==='object'&&!B.known[o.id].ruin&&this.t-B.known[o.id].t<3*DAY&&d2(o.i,o.j,L[0],L[1])<80).sort((p,q)=>d2(p.i,p.j,L[0],L[1])-d2(q.i,q.j,L[0],L[1]))[0];
            if(tg){b.kind=null;b.target=tg.id;b.aim='contre-attaque';b.calmT=0;this.bandSet(b,'approche','contre-attaque');this.s.fog||this.log(this.cityName(tg),`Les Bèè contre-attaquent : ${up.length} poursuivent vers ${this.cityName(tg)} (${BUILDINGS[tg.k].name.toLowerCase()}) !`,'bad');continue;}
            this.bandDisband(b,up);continue;}goal=city?[city.x,city.y]:b.from;}}
      if((b.kind==='contre'||b.kind==='riposte')&&b.state!=='repli'){goal=b.pt;if(d2(b.pt[0],b.pt[1],c[0],c[1])<4&&this.s.t-b.contactT>1){b.calmT=(b.calmT||0)+dt;if(b.calmT>2){this.bandRetreat(b,up,c,true);continue;}}}
      const seen=this.bandContacts(b,up);if(seen.length){b.contactT=this.s.t;b.fightT=(b.fightT||0)+dt;}
      // sous le brouillard : on apprend l'existence d'une colonne quand un des nôtres la voit
      if(this.s.fog&&!b.meuSeen&&up.some(u=>this.spotted(u,'meumeu'))){b.meuSeen=true;const tg=this.building(b.target);this.log(tg?this.cityName(tg):'Front',`Une colonne bèè d’environ ${up.length} est repérée${tg?` en direction de ${this.cityName(tg)}`:''} !`,'bad');this.emit({type:'wave',n:up.length,x:c[0],y:c[1],from:b.from});}
      const enemy=seen.slice().sort((a,z)=>d2(a.x,a.y,c[0],c[1])-d2(z.x,z.y,c[0],c[1]))[0]||null;
      // le moral : les pertes, le feu reçu, le rapport de forces
      // les pertes : les morts, et les blessés graves (à terre qui saignent) ; un sonné qui se relève ne compte qu'à moitié
      const dead=b.peak-ms.length,down=ms.filter(u=>u.h?.state==='hors').length;const lost=(dead+down*.7)/Math.max(1,b.peak),supp=up.reduce((a,u)=>a+(u.supp||0),0)/up.length;
      const armedSeen=seen.filter(e=>e.w||UDEF(e).img).length;const odds=armedSeen?clamp((up.length/armedSeen-1)*.12,-.25,.2):.05;
      const want=clamp(1.05-lost*1.35-supp*.5+odds,0,1);b.morale+=(want-b.morale)*Math.min(1,this.dts/12);
      // plus une cartouche dans le groupe : on décroche (on ne reste pas planté devant l'ennemi)
      if(b.state!=='repli'&&up.every(u=>!(u.mag>0)&&!(u.pouch>0)&&!UDEF(u).img)){this.bandSet(b,'repli','plus de munitions');this.bandRetreat(b,up,c,true);continue;}
      // ils ne décrochent qu'après une vraie défaite
      if(b.state!=='repli'&&(b.kind==='defense'||b.kind==='contre'?(b.morale<.35||lost>=.45):(b.morale<.2||lost>=.7))){this.bandRetreat(b,up,c);continue;}   // (un assaut ne se replie plus à mi-chemin : 70 % de pertes)
      const range=this.bandRange(up),stand=range*.92;
      // plus d'objectif : on en choisit un autre, ou l'on rentre
      if(!goal&&b.aim==='installation'&&!b.settled&&target){b.settled=true;const [sx,sy]=this.bc(target);const camp=this.beeeBuild?.('camp',Math.round(sx),Math.round(sy),10);
        this.log('Front',camp?'Les Bèè s’installent sur les ruines : ils y bâtissent un camp.':'Les Bèè ont rasé notre avant-poste.','bad');if(camp){this.bandRetreat(b,up,c,true);continue;}}
      if(!goal&&b.kind!=='defense'&&b.state!=='repli'&&!enemy){const nb=this.beeeTarget?.(c[0],c[1],b.aim==='finale');if(nb)b.target=nb.id;else{this.bandRetreat(b,up,c,true);continue;}}
      const dirTo=(x,y)=>{const dx=x-c[0],dy=y-c[1],L=Math.hypot(dx,dy)||1;return [dx/L,dy/L];};
      switch(b.state){
        case 'rassemblement':{const R=b.rally;if(!R||!target){this.bandSet(b,'approche');break;}
          // attaqués au rassemblement : on se défend d'abord
          if(enemy&&d2(enemy.x,enemy.y,c[0],c[1])<range*1.2){this.bandDeploy(b,up,c,enemy,stand);break;}
          up.forEach((u,q)=>{const an=q*2.4,rr=.9*Math.sqrt(q+1);u.task.tx=R[0]+Math.cos(an)*rr;u.task.ty=R[1]+Math.sin(an)*rr;u.charge=false;});
          // un chef impatient part avant que tous soient là (on les voit arriver par paquets)
          if(b.rallyMax==null)b.rallyMax=(10+Math.max(...up.map(u=>d2(u.x,u.y,R[0],R[1])))/4.5)*(b.patience||1);
          const here=up.filter(u=>d2(u.x,u.y,R[0],R[1])<7).length;const night=this.light()<.35;
          b.rallyStarted??=b.age;if(b.age-b.rallyStarted>b.rallyMax+24&&here<Math.ceil(up.length*.9)){this.bandRetreat(b,up,c,true);break;}
          if(here>=Math.ceil(up.length*.9)){this.bandSet(b,'approche','rassemblés : en avant');
            this.s.fog||this.log(this.cityName(target),`L’armée bèè rassemblée (${up.length}) s’ébranle vers ${this.cityName(target)}${this.light()<.6?' à l’aube':''} !`,'bad');
            for(const o of B.bands)if(o.state==='attente'&&o.waitFor===b.id)this.bandSet(o,'approche','la diversion part');}
          break;}
        case 'attente':{const main=B.bands.find(o=>o.id===b.waitFor);if(!main||main.state!=='rassemblement'){this.bandSet(b,'approche');break;}if(enemy)this.bandDeploy(b,up,c,enemy,stand);break;}
        case 'approche':{for(const u of up)u.charge=false;
          // pris sous un feu qu'ils ne voient pas : ils avancent en tirant au lieu de marcher l'arme à la bretelle (de jour comme de nuit : la nuit les couvre aussi)
          if(!enemy&&supp>.2&&b.kind!=='defense')for(const u of up)u.charge=true;
          // au contact, ou dès qu'on leur tire dessus : ils se déploient là, à distance de tir, au lieu de marcher sous le feu
          if(enemy&&(d2(enemy.x,enemy.y,c[0],c[1])<range*1.35||supp>.2)){this.bandDeploy(b,up,c,enemy,Math.min(stand,d2(enemy.x,enemy.y,c[0],c[1])));break;}
          if(goal&&b.kind!=='defense'&&b.kind!=='contre'&&d2(goal[0],goal[1],c[0],c[1])<(b.kind==='rail'?2.5:Math.max(3,range*.7))&&!enemy){this.bandSet(b,'objectif');if(b.kind!=='rail')for(const u of up)this.bandToObjective(u,b);break;}
          const g0=goal||b.from;
          // la marche d'approche : chacun a sa place fixe dans la ligne d'arrivée (face à la cible, à portée) et s'y rend par son
          // propre chemin (le chemin de groupe s'égarait loin du but) ; au contact, la ligne de feu reprend la main
          if(!enemy&&b.kind!=='defense'&&b.kind!=='contre'&&d2(g0[0],g0[1],c[0],c[1])>8){
            // V12.4 (demande du joueur : « des formations plus espacées, en colonne, en échelon ») : chacun va seul à SA place, comme avant (mesuré : le seul
            // procédé qui arrive à coup sûr) ; loin (plus de 30 cases), une ligne large (1,8 case entre voisins, 1,5 avant) ; plus près, un ÉCHELON (chacun
            // 1,2 case en retrait de son voisin) ; au contact, la ligne de feu. MESURÉ (test/formations.mjs) : une colonne à la marche — places en colonne, ou
            // colonne mobile, ou colonne derrière un guide — les serrait à moins d'une case les uns des autres (49 à 77 %), et deux sur trois n'arrivaient
            // pas ; la colonne (élargie) reste pour les groupes de défense et de contre-batterie (bandColumn).
            const shape=b.kind==='rail'||d2(g0[0],g0[1],c[0],c[1])>30?'ligne':'echelon';const key=Math.round(g0[0]/3)+','+Math.round(g0[1]/3)+shape;
            if(!b.march||b.march.key!==key||up.some(u=>!b.march.slots[u.id])){const dir=dirTo(g0[0],g0[1]);const px=-dir[1],py=dir[0];const st=b.kind==='rail'?1.2:Math.max(2.5,Math.min(range*.6,6));
              const order=up.slice().sort((a,z)=>(a.x*px+a.y*py)-(z.x*px+z.y*py));const slots={};const n=order.length,sg=b.id%2?1:-1;
              order.forEach((u,q)=>{const off=(q-(n-1)/2)*b.spacing,depth=shape==='echelon'?((sg>0?q:n-1-q)-(n-1)/2)*1.2:0;slots[u.id]=this.freeSpot(g0[0]-dir[0]*(st+depth)+px*off,g0[1]-dir[1]*(st+depth)+py*off,3);});
              b.march={key,slots,dir};b.shape=shape;}
            b.dir=b.march.dir;for(const u of up){const s0=b.march.slots[u.id];u.task.tx=s0[0];u.task.ty=s0[1];}break;}
          const g=!enemy?this.bandWaypoint(b,c,g0):g0;const dir=dirTo(g[0],g[1]);b.dir=dir;
          // la ligne avance au pas du plus lent : elle vise quelques cases devant le centre du groupe
          const lead=Math.min(3,d2(g[0],g[1],c[0],c[1]));const far=!enemy&&this.s.t-b.contactT>2;
          // loin : en colonne ; à moins de 20 cases de l'objectif, sans ennemi en vue : en échelon ; au contact : en ligne
          if(far&&d2(g0[0],g0[1],c[0],c[1])>20)this.bandColumn(b,up,[c[0]+dir[0]*lead,c[1]+dir[1]*lead],dir);else if(far){b.shape='echelon';this.bandEchelon(b,up,[c[0]+dir[0]*lead,c[1]+dir[1]*lead],dir);}else this.bandLine(b,up,[c[0]+dir[0]*lead,c[1]+dir[1]*lead],dir);break;}
        case 'feu':{for(const u of up)u.charge=false;
          if(!enemy){if(this.s.t-b.contactT>2)this.bandSet(b,'approche','plus personne en vue');break;}
          if(b.eval>0)break;b.eval=EVAL;
          const de=d2(enemy.x,enemy.y,c[0],c[1]);const esupp=seen.reduce((a,e)=>a+(e.supp||0),0)/seen.length;
          if(esupp>.45&&b.morale>.6)this.bandLine(b,up,b.anchor||c,b.dir||[1,0],enemy);
          if(de>range*1.05){this.bandSet(b,'bond','hors de portée : on avance par bonds');b.half=0;this.bandBound(b,up,c,enemy,stand);break;}
          if(de<range*.45&&b.morale<.75){this.bandDeploy(b,up,c,enemy,stand);}   // trop près, pas assez sûrs : on reprend ses distances
          // l'assaut en masse : deux fois plus nombreux, le moral haut, l'ennemi plaqué au sol (ou l'échange qui s'éternise)
          else if(up.length>=6&&up.length>=Math.max(1,seen.filter(e=>e.w||UDEF(e).img).length)*2&&b.morale>.6&&(esupp>.3||(b.fightT||0)>1)&&de<range*1.02){this.bandSet(b,'assaut','deux fois plus nombreux : à l’assaut');
            const L=up[0];this.log('Front',`${up.length} Bèè montent à l’assaut en masse contre ${seen.length} des nôtres !`,'bad');if(L)this.s.fog||this.emit({type:'wave',n:up.length,x:L.x,y:L.y,from:[L.x,L.y]});}
          break;}
        case 'bond':{for(const u of up)u.charge=false;
          const movers=up.filter((u,q)=>q%2===b.half);const done=movers.every(u=>d2(u.x,u.y,u.task.tx,u.task.ty)<.6);
          if(enemy&&d2(enemy.x,enemy.y,c[0],c[1])<=range){this.bandDeploy(b,up,c,enemy,stand);break;}
          if(done||b.t>3){b.half=1-b.half;b.t=0;if(!enemy&&this.s.t-b.contactT>2){this.bandSet(b,'approche');break;}this.bandBound(b,up,c,enemy,stand);}break;}
        case 'assaut':{if(!enemy){this.bandSet(b,goal?'approche':'repli');break;}
          if(b.morale<.45){this.bandDeploy(b,up,c,enemy,stand);break;}
          for(const u of up){u.charge=false;const e=seen.slice().sort((a,z)=>d2(a.x,a.y,u.x,u.y)-d2(z.x,z.y,u.x,u.y))[0];u.task.tx=e.x;u.task.ty=e.y;u.task.foe=e.id;}break;}
        case 'objectif':{if(b.kind==='rail'){if(enemy){this.bandDeploy(b,up,c,enemy,stand);break;}if(this.bandRailCut(b,up))this.bandRetreat(b,up,c,true);break;}
          if(enemy){for(const u of up){u.task={kind:'band',tx:u.x,ty:u.y};u.path=null;}this.bandDeploy(b,up,c,enemy,stand);break;}
          if(!goal){this.bandSet(b,'approche');break;}
          for(const u of up)if(u.task?.kind!=='assault')this.bandToObjective(u,b);break;}
        case 'repli':{const home=b.from;const done=d2(home[0],home[1],c[0],c[1])<6;
          if(done){this.bandDisband(b,up);break;}
          const wp=d2(home[0],home[1],c[0],c[1])>8?this.bandWaypoint(b,c,home):home;for(const u of up){if(u.task?.kind==='bandcarry'){u.task.tx=wp[0];u.task.ty=wp[1];continue;}u.task.tx=wp[0]+(u.id%5-2)*.8;u.task.ty=wp[1]+((u.id/5|0)%3-1)*.8;u.charge=false;}break;}}}},
  bandDeploy(b,up,c,enemy,stand){const dx=c[0]-enemy.x,dy=c[1]-enemy.y,L=Math.hypot(dx,dy)||1;const dir=[-dx/L,-dy/L];b.dir=dir;
    const at=[enemy.x+dx/L*stand,enemy.y+dy/L*stand];b.anchor=at;this.bandSet(b,'feu','au contact : ligne de feu à bonne distance');this.bandLine(b,up,at,dir,enemy);},
  // un bond : la moitié qui bouge avance d'un tiers de portée vers l'ennemi (ou l'objectif) ; l'autre tient sa place et tire
  bandBound(b,up,c,enemy,stand){const g=enemy?[enemy.x,enemy.y]:(this.building(b.target)?this.bc(this.building(b.target)):b.from);const dx=g[0]-c[0],dy=g[1]-c[1],L=Math.hypot(dx,dy)||1;const dir=[dx/L,dy/L];b.dir=dir;
    const step=Math.min(Math.max(2,this.bandRange(up)*.35),Math.max(0,L-stand));const at=[c[0]+dir[0]*step,c[1]+dir[1]*step];
    const movers=up.filter((u,q)=>q%2===b.half);const px=-dir[1],py=dir[0];movers.forEach((u,q)=>{const off=(q-(movers.length-1)/2)*b.spacing*2;u.task.tx=at[0]+px*off;u.task.ty=at[1]+py*off;});},
  bandToObjective(u,b){const t=this.building(b.target);if(!t)return;const [tw,th]=this.sizeOf(t);u.task={kind:'assault',targetId:t.id,approach:b.from,tx:t.i+tw/2,ty:t.j+th/2,band:b.id};u.path=null;},
  // le repli : fumigènes entre eux et l'ennemi, les valides emportent les blessés, tous rentrent
  bandRetreat(b,up,c,quiet=false){{const L=this.s.beee.lostFront;if(b.state!=='repli'&&!quiet&&L&&!L.done&&(b.kind==='reprise'||b.kind==='defense'&&d2(c[0],c[1],L.x,L.y)<40))L.failed++;}
    if(b.state!=='repli'&&!quiet&&b.kind==='contre'){const city=this.s.beee.cities.find(x=>x.id===b.city);if(city){city.dig=Math.max(city.dig||0,1);if(city.shelled)city.shelled.retry=this.s.t+6;}}
    this.bandSet(b,'repli',quiet?'plus rien à prendre':'trop de pertes : ils décrochent');
    if(!b.smoked&&!quiet){b.smoked=true;for(const u of up.slice(0,2))this.throwSmoke(u);}
    const down=this.bandMembers(b).filter(u=>u.h?.state==='hors'&&!u.carriedBy);const able=up.slice();
    for(const v of down){const u=able.sort((a,z)=>d2(a.x,a.y,v.x,v.y)-d2(z.x,z.y,v.x,v.y)).find(u=>u.task?.kind!=='bandcarry');if(!u||d2(u.x,u.y,v.x,v.y)>8)continue;u.task={kind:'bandcarry',id:v.id,tx:b.from[0],ty:b.from[1]};u.path=null;v.carriedBy=u.id;}
    for(const u of up)if(u.task?.kind!=='bandcarry'){u.task={kind:'band',tx:b.from[0],ty:b.from[1]};u.path=null;u.charge=false;}
    if(!quiet){const L=up[0];this.log('Front',`Les Bèè décrochent${down.length?` en emportant ${Math.min(down.length,up.length)} blessé${down.length>1?'s':''}`:''}.`,'good');if(L)this.emit({type:'rout',x:L.x,y:L.y,f:'beee'});}},
  bandDisband(b,up){const B=this.s.beee;const city=B.cities.filter(x=>!x.fallen).sort((a,z)=>d2(a.x,a.y,b.from[0],b.from[1])-d2(z.x,z.y,b.from[0],b.from[1]))[0];
    for(const u of this.bandMembers(b)){u.band=null;u.charge=false;if(u.carrying){const v=this.unit(u.carrying);if(v)v.carriedBy=null;u.carrying=null;}if(active(u)){u.city=city?.id??null;u.task={kind:'guard',tx:u.x,ty:u.y};}}
    B.bands.splice(B.bands.indexOf(b),1);},
  // ce que fait un membre du groupe, à sa place
  bandUnit(u,T0){const b=this.band(u.band);if(!b){u.band=null;u.task={kind:'guard',tx:u.x,ty:u.y};return;}const D=UDEF(u);
    if(T0.kind==='bandcarry'){const v=this.unit(T0.id);if(!v||!alive(v)||v.h?.state!=='hors'){if(v)v.carriedBy=null;u.carrying=null;u.task={kind:'band',tx:T0.tx,ty:T0.ty};return;}
      if(!u.carrying){if(d2(u.x,u.y,v.x,v.y)>.4){this.go(u,v.x,v.y);return;}u.carrying=v.id;v.carriedBy=u.id;}
      this.go(u,T0.tx,T0.ty);v.x=u.x+.15;v.y=u.y+.1;return;}
    const at=d2(u.x,u.y,T0.tx,T0.ty)<.5;const armed=u.w||D.img;
    if(b.state==='repli'){if(!at)this.go(u,T0.tx,T0.ty);else u.anim='idle';return;}
    // la charge : on court sur l'ennemi en tirant (mal)
    // l'assaut : un tiers reste et couvre (il tire, arrêté) ; les autres courent sans tirer jusqu'à trois cases, puis tirent
    if(b.state==='assaut'&&armed){const e=T0.foe!=null&&this.unit(T0.foe);if(e&&active(e)){const cover=b.m.indexOf(u.id)%3===0;const de=d2(u.x,u.y,e.x,e.y);
      if(cover){if(!this.engage(u,e)&&de>this.engageRange(u))this.go(u,e.x,e.y);return;}
      if(de>3.2){u.post='debout';this.go(u,e.x,e.y);return;}if(!this.engage(u,e))this.go(u,e.x,e.y);return;}}
    // à sa place : on tire (après s'être calé) ; en route : on ne tire pas
    if(!at){this.go(u,T0.tx,T0.ty);return;}
    if(b.dir)this.face(u,b.dir[0],b.dir[1]);
    if(armed&&(b.state==='feu'||b.state==='bond'||b.state==='approche'||b.state==='rassemblement'||b.state==='attente')){const e=this.nearestEnemy(u,Math.max(this.sight(),this.engageRange(u)));if(e&&this.engage(u,e))return;}
    u.anim=u.anim==='aim'?'aim':'idle';},
  // le prochain objectif d'un groupe dont la cible est tombée : le bâtiment utile le plus proche
  beeeTarget(x,y,final=false){const w={gare:4,mine:4,camp:2.5,atelier:2,arsenal:2.5,manufacture:3,entrepot:3,ferme:1.5,moulin:1.5,champ:1,centre:2,caserne:2,tour:1,fonderie:2,hopital:1.5};
    const ours=this.s.buildings.filter(b=>b.f==='meumeu'&&b.done&&!b.ruin&&(!b.capital||final)&&d2(b.i,b.j,x,y)<45);if(!ours.length)return null;
    return ours.map(b=>({b,s:(w[b.k]||1)/(1+d2(b.i,b.j,x,y)/15)})).sort((a,z)=>z.s-a.s)[0].b;},
};
