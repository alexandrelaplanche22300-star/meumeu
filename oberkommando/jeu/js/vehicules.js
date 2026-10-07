// Les véhicules de combat des Meumeu (leur supériorité technologique : les Bèè n'en ont pas) : les engins conçus au bureau des engins (V12.8).
// Ce fichier : leurs caractéristiques (VEHDEF) et leur conduite — le chemin (une grille à leur mesure : arbres, rochers et tranchées arrêtent les
// roues, les chenilles passent en peinant), puis un pilote qui le suit comme un conducteur : il braque (rayon minimal des roues ; les chenilles
// pivotent sur place), accélère, freine avant les virages serrés et avant l'arrivée, et ne rentre pas dans les autres véhicules.
// Unités : cases (4 m) et heures de jeu ; une heure de jeu vaut HOUR_REAL secondes de combat (this.dts) — tourelles et braquage en °/s de combat.
import {TERRAIN,HOUR_REAL,BUILDINGS} from './data.js';
import {ACTIONS as ACT,TILE_M as TILE,CONSTRUCTIONS} from './ballistics.js';
import {fragDesign} from './designs.js';
import {EXPO} from './explosive.js';
import {vehDefOf,deriveVeh,VEH_VIS,exemple} from './engins.js';
import {platesAt,rayPlates,rayMods,inCone,shotRay,seatsOf} from './blindage3d.js';
const CONS_SHAPED=W=>CONSTRUCTIONS[W.p.cons]?.shaped,CONS_INC=W=>CONSTRUCTIONS[W.p.cons]?.inc;

const D2R=Math.PI/180;
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
export const VEH_SIG=2.2;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const active=u=>u&&u.hp>0&&u.h?.state!=='hors';

// Le blindage : chaque face, son épaisseur (mm d'acier, à l'échelle des peluches : le fusil bèè perce 0,85 mm à 10 m, l'antichar 3,7) et son inclinaison
// depuis la verticale (°). La tourelle a ses propres faces. Les armes : un poste par arme, sur la tourelle, l'affût ou la caisse, avec son débattement.
//  roues : 'roues' (braquage, rayon minimal r) ou 'chenilles' (pivot sur place, vitesse de lacet pivot °/s)
//  long, large : l'emprise au sol (cases) ; modele, avant : le modèle 3D et son axe avant ('+x', '+z', '-z')
//  places : conducteur (toujours), servants des armes, passagers ; soute : caisses portées
//  cout : des matières seulement (V12.5, demande du joueur) — les armes d'un engin viennent avec lui ; plus d'arme préfabriquée prise au stock
//  (des mitrailleuses et canons à faire venir de l'arsenal pour chaque engin : un cauchemar logistique)
export const VEHDEF={
};
// V12.5 : la barge de débarquement (nav:'eau' : elle ne roule pas, elle navigue — voir naval.js). Une coque blindée à l'avant (la rampe relevée) et sur les flancs :
// le fusil et la mitrailleuse bèè ne la percent pas, l'antichar si. Un pilote, vingt-quatre passagers, un véhicule sur le pont, soixante caisses.
// (V12.5 : 3,8 × 1,7 — les soldats tiennent entre les pavois sans les traverser ; deux mitrailleuses dans les cuves de poupe, vers l'avant au repos)
VEHDEF.barge={name:'Barge de débarquement',nav:'eau',modele:':barge',avant:'+x',long:3.8,large:1.7,roues:'chenilles',pivot:24,vmax:16,t0:3,frein:2,pont:[1.3,-1.0],
  blindage:{avant:[3.2,30],flanc:[2.3,0],arriere:[1.3,0],dessus:[0,0]},hp:420,places:{servants:2,passagers:24},soute:60,
  // (deux affûts de mitrailleuses jumelées, une par cuve de poupe : chaque affût tire ses deux armes ensemble)
  armes:[{id:'mg1',piece:'affut',w:'mg_lourde_mle1',arc:300,tour:120,coups:900,repos:0,garde:0,jumelle:true,pos:[-1.5,0.6050000000000001,0.88],tube:.55},{id:'mg1b',piece:'affut',w:'mg_lourde_mle1',arc:300,tour:120,coups:900,repos:0,garde:0,jumelle:true,pos:[-1.5,0.515,0.88],tube:.55},{id:'mg2',piece:'affut2',w:'mg_lourde_mle1',arc:300,tour:120,coups:900,repos:0,garde:0,jumelle:true,pos:[-1.5,-0.515,0.88],tube:.55},{id:'mg2b',piece:'affut2',w:'mg_lourde_mle1',arc:300,tour:120,coups:900,repos:0,garde:0,jumelle:true,pos:[-1.5,-0.6050000000000001,0.88],tube:.55}],
  cout:{fer:60,pieces:25,bois:70},heures:26,
  why:'Une coque blindée qu’on échoue sur la plage : un pilote, deux mitrailleurs (deux mitrailleuses lourdes dans les cuves de poupe), vingt-quatre Meumeu, un véhicule léger (jeep, automitrailleuse), des munitions. La proue relevée arrête les balles de fusil et de mitrailleuse bèè ; baissée, elle laisse courir les soldats vers la plage. Elle repart chercher du monde tant que le pilote vit.'};
// V12.5 : la grande barge (une barge de chars) : un long pont ouvert derrière une rampe de toute la largeur, la passerelle et une mitrailleuse lourde sur affût à l'arrière.
// Sur le pont, des véhicules à la file tant que leurs longueurs y tiennent (deux automitrailleuses à canon, ou un automoteur et une jeep…), et quarante soldats.
VEHDEF.grande_barge={name:'Grande barge de débarquement',nav:'eau',modele:':grande_barge',avant:'+x',long:7,large:2.6,roues:'chenilles',pivot:14,vmax:11,t0:4.5,frein:3,pont:[3.15,-2.35],
  blindage:{avant:[4.2,30],flanc:[2.8,0],arriere:[1.8,0],dessus:[0,0]},hp:950,places:{servants:2,passagers:40},soute:140,
  armes:[{id:'mg1',piece:'affut',w:'mg_lourde_mle1',arc:300,tour:110,coups:1500,repos:0,garde:0,jumelle:true,pos:[-2.5,0.9650000000000001,1.48],tube:.55},{id:'mg1b',piece:'affut',w:'mg_lourde_mle1',arc:300,tour:110,coups:1500,repos:0,garde:0,jumelle:true,pos:[-2.5,0.875,1.48],tube:.55},{id:'mg2',piece:'affut2',w:'mg_lourde_mle1',arc:300,tour:110,coups:1500,repos:0,garde:0,jumelle:true,pos:[-2.5,-0.875,1.48],tube:.55},{id:'mg2b',piece:'affut2',w:'mg_lourde_mle1',arc:300,tour:110,coups:1500,repos:0,garde:0,jumelle:true,pos:[-2.5,-0.9650000000000001,1.48],tube:.55}],
  cout:{fer:150,pieces:60,bois:120,cuivre:4},heures:52,
  why:'La barge des blindés : un pilote, deux mitrailleurs, quarante Meumeu, et sur le pont des véhicules à la file (deux automitrailleuses à canon, une automitrailleuse à canon et un automoteur, ou trois jeeps). Rampe relevée, la proue et les hauts pavois arrêtent les balles bèè ; les deux mitrailleuses lourdes du roof couvrent la plage pendant qu’on débarque. Plus lente, plus large : il lui faut une vraie plage.'};
// V12.5 : le ciel (voir air.js) — un avion de transport trimoteur, un planeur d'assaut (silencieux), un planeur lourd. Mesures réelles : vitesses en m/s (qui valent des cases/h),
// altitudes en m. Réservés aux Meumeu.
VEHDEF.avion={name:'Avion de transport',air:{power:true,stall:27,vr:36,cruise:52,climb:3.6,descend:4.5,accel:4.2,brake:5,bank:25,cruiseAlt:150,loiter:.09},modele:':avion',avant:'+x',long:4.7,large:7.4,roues:'roues',r:1,vmax:62,t0:1,frein:1,
  blindage:{avant:[.25,0],flanc:[.2,0],arriere:[.2,0],dessus:[.2,0]},hp:240,places:{servants:0,passagers:18},soute:80,armes:[],
  cout:{fer:90,pieces:60,bois:50,cuivre:10,charbon:20},heures:60,
  why:'Un trimoteur de transport : un pilote, dix-huit passagers, quatre-vingts caisses (le pont aérien : munitions d’abord), ou un planeur à la remorque. Il décolle d’une piste de 44 cases au moins, vole à 150 m, atterrit sur une piste. Les Bèè l’entendent de loin.'};
VEHDEF.planeur={name:'Planeur d’assaut',air:{power:false,silent:true,stall:20,glide:29,ld:12,bank:30,brake:3.2,tow:44},modele:':planeur',avant:'+x',long:2.8,large:5.3,roues:'roues',r:1,vmax:60,t0:1,frein:1,
  blindage:{avant:[.1,0],flanc:[.08,0],arriere:[.08,0],dessus:[.08,0]},hp:90,places:{servants:0,passagers:9},soute:6,armes:[],
  cout:{bois:70,fer:10,pieces:15},heures:24,
  why:'Un pilote et huit soldats, en toile et en bois : remorqué par l’avion, largué avant la côte, il plane en silence (finesse 12 : 12 m parcourus pour 1 m perdu) et se pose dans un champ. Tout le monde en sort d’un coup, prêt à combattre. Un arbre à grande vitesse peut tuer le pilote.'};
VEHDEF.planeur_lourd={name:'Planeur lourd',air:{power:false,silent:true,heavy:true,stall:23,glide:33,ld:10,bank:25,brake:2.6,tow:40},modele:':planeur_lourd',avant:'+x',long:7,large:13.8,roues:'roues',r:1,vmax:60,t0:1,frein:1,
  blindage:{avant:[.12,0],flanc:[.1,0],arriere:[.1,0],dessus:[.1,0]},hp:180,places:{servants:0,passagers:36},soute:40,armes:[],
  cout:{bois:200,fer:60,pieces:60,cuivre:6},heures:60,
  why:'Le mammouth : un pilote, trente-cinq soldats, quarante caisses. Plus lourd à remorquer, plus lent à planer (finesse 10) : il demande une longue piste d’arrivée et un grand champ.'};
// Le bateau de débarquement bèè (voir naval.js : mêmes règles que la barge) : une coque de planches, une planche en guise de rampe, seize Bèè, pas de véhicule. Les Bèè en construisent des dizaines.
VEHDEF.bateau_bee={name:'Bateau bèè',faction:'beee',nav:'eau',modele:':bateau_bee',avant:'+x',long:3,large:1.2,roues:'chenilles',pivot:30,vmax:13,t0:3,frein:2,
  blindage:{avant:[.35,0],flanc:[.22,0],arriere:[.2,0],dessus:[0,0]},hp:150,places:{servants:0,passagers:16},soute:16,armes:[],
  cout:{bois:120},heures:14,   // (V12.5 : du bois seulement — les chantiers attendaient des pièces puis du fer venus de gares lointaines, à 0 % des jours entiers : aucune flotte avant J30)
  why:'Une coque de planches, une rampe de bois, seize soldats : la coque arrête à peine le fusil. Les Bèè en construisent des dizaines pour leurs grands assauts.'};
const VEDF=v=>VEHDEF[v.k];
// la vitesse sur chaque terrain (part de vmax) : les roues s'enlisent dans le sable et peinent dans la lande, les chenilles moins
const TERRAIN_V={roues:{sand:.55,scrub:.7,dirt:1,grass:.95,meadow:.95},chenilles:{sand:.8,scrub:.85,dirt:1,grass:.95,meadow:.95}};

export const VEHICULES={
  // un engin (gros, bruyant) se voit de plus loin qu'un homme : sa signature visuelle
  vehSeen(f,v){return this.visibleAt(f,v.x,v.y,v.stealth?.6:VEH_SIG);},
  vehDef(v){return VEHDEF[v.k];},
  isCombatVehicle(v){return !!VEHDEF[v?.k];},
  // Un véhicule neuf (à la sortie du garage) : caisse orientée, armes vides (on les charge au dépôt), personne à bord.
  // (V12.8) les engins conçus au bureau des engins : chacun sa fiche (VEHDEF, sous l'identifiant de sa conception) et ses armes (des conceptions « engin »,
  // invisibles au joueur) ; le garage ne propose qu'eux. Refait à chaque nouvelle partie, au chargement, et à chaque conception enregistrée.
  // (V12.8) les engins conçus au bureau : une étude (status etude) n'entre pas au garage ; adoptée, ou un ancien prototype, si.
  enginsSync(){const s=this.s,VD=s.vdesigns||(s.vdesigns={});
    // les trois ravitailleurs, adoptés d'office : une citerne, une charrette de munitions, un camion de munitions
    for(const [id,name,ex] of [['sd_citerne','Citerne','citerne'],['sd_charrette','Charrette de munitions','charrette_mun'],['sd_camion_mun','Camion de munitions','camion_mun']]){
      if(VD[id])continue;try{VD[id]={id,f:'meumeu',name,status:'adopte',v:exemple(ex),base:true};}catch(e){console.warn('ravitailleur',name,e);}}
    const live=vd=>vd&&vd.status!=='perdu'&&vd.status!=='etude';
    for(const k of Object.keys(VEHDEF))if(VEHDEF[k].engin&&!live(VD[k]))delete VEHDEF[k];
    for(const vd of Object.values(VD)){if(!live(vd)){delete VEHDEF[vd.id];continue;}try{VEHDEF[vd.id]=vehDefOf(vd);}catch(e){console.warn('engin',vd.name,e);continue;}
      const reg=(id,p,name)=>{if(p)s.designs[id]={id,f:vd.f||'meumeu',name,status:'engin',p:JSON.parse(JSON.stringify(p))};};
      vd.v.tourelles.forEach((T,i)=>{reg(vd.id+'_t'+i,T.arme,`${vd.name} — tourelle ${i+1}`);reg(vd.id+'_x'+i,T.coax,`${vd.name} — coaxiale ${i+1}`);});reg(vd.id+'_c',vd.v.mgCaisse,`${vd.name} — mitrailleuse de caisse`);}
    BUILDINGS.garage.trains=Object.values(VD).filter(live).map(vd=>vd.id);},
  addCombatVehicle(f,k,x,y,h=0){const V=VEHDEF[k];const v={id:this.id(),f,k,name:V.name+' '+(this.s.vehicles.filter(o=>o.k===k).length+1),x,y,h,spd:0,steer:0,yawRate:0,odo:0,
      hp:V.hp,max:V.hp,pass:[],crew:[],cargo:{},path:null,pi:0,goal:null,state:'idle',alt:0,comp:{},
      mounts:V.armes.map(a=>({id:a.id,yaw:a.garde??a.repos??0,el:0,w:a.w,mag:0,pouch:0,cool:0,reload:0,aimAt:null,target:null}))};
    if(V.engin){v.fuel=V.engin.plein;for(let i=0;i<v.mounts.length;i++){const m=v.mounts[i],W=this.W(m.w),c=V.armes[i].coups||0;m.mag=Math.min(c,W?.p?.mag||1);m.pouch=c-m.mag;}}   // (un engin conçu sort du garage le plein fait, ses râteliers remplis : c'est dans son prix)
    this.s.vehicles.push(v);(this.cvs??=[]).push(v);return v;},

  // La sortie du garage : une place libre devant la porte (la face sud), le nez vers l'extérieur ; puis le point de ralliement s'il y en a un.
  // Nul si tout est encombré (on réessaie dans une demi-heure).
  // (une case de sortie qui débouche : mesuré, un engin posé à la première case libre pouvait naître dans une poche fermée par les arbres, sans
  // aucun but atteignable ; on prend la première d'où le terrain praticable s'étend sur assez de cases, sinon la première libre, en le disant)
  vehFromGarage(b,k){const V=VEHDEF[k],[w,h]=this.sizeOf(b);const oth=this.vehOthers({},false);let first=null;
    for(let r=0;r<6;r++)for(let a=-r;a<=r;a++){const x=b.i+w/2+a*1.4,y=b.j+h+V.long/2+.4+r*1.2;if(!this.vehFits(V,x,y,Math.PI/2,false,0,oth,.2))continue;first??=[x,y];
      if(this.vehOpenAt(V,k,x,y))return this.vehOut(b,k,x,y);}
    if(!first)return null;if(b.f==='meumeu')this.log('Front',`Le garage est enclavé : le véhicule sort, mais le terrain autour (arbres, bâtiments) le bloque.`,'bad');
    return this.vehOut(b,k,first[0],first[1]);},
  vehOut(b,k,x,y){const v=this.addCombatVehicle(b.f,k,x,y,Math.PI/2);v.home=b.id;if(b.rally)this.vehMove(v,b.rally[0],b.rally[1]);return v;},
  // le terrain praticable pour ce type, depuis (x, y), s'étend-il sur au moins « need » cases ? (un remplissage borné sur la grille du chemin)
  vehOpenAt(V,k,x,y,need=250){const N=this.N,cost=this.vehRouteCost({...V,k});const s=clamp(Math.floor(y),0,N-1)*N+clamp(Math.floor(x),0,N-1);if(cost(s)===Infinity)return false;
    const seen=new Set([s]),q=[s];for(let i=0;i<q.length&&seen.size<need;i++){const c=q[i],ci=c%N,cj=(c/N)|0;
      for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=ci+di,bj=cj+dj;if(a<0||bj<0||a>=N||bj>=N)continue;const n=bj*N+a;if(seen.has(n)||cost(n)===Infinity)continue;seen.add(n);q.push(n);}}
    return seen.size>=need;},
  // ---------- le chemin ----------
  // Le coût d'une case pour ce véhicule : infranchissable (eau, roc, bâtiment, mur ; pour les roues : arbre, rocher, tranchée), ou un prix :
  // le terrain lent, les cratères, la lisière d'un obstacle (l'engin est large : il préfère le milieu des passages)
  // (la fonction lit la carte au moment de l'appel : un arbre abattu, un bâtiment neuf comptent tout de suite)
  vehCost(V){const key=V.roues;if(this._vc?.[key])return this._vc[key];
    const N=this.N,ter=this.G.terrain,occ=this.occ,wall=this.wall,crater=this.crater,nodes=this.s.nodes,nodeAt=this.nodeAt,tr=this.s.sacs,wheels=V.roues==='roues';
    // (le bord de la carte, deux cases, est interdit aux engins : mesuré, des chemins longeaient la colonne x = 0,5 et les engins s'y coinçaient)
    // (un gisement non épuisé aussi, comme un rocher : vu en jeu, une jeep posée au milieu du chevalement d'un filon de plomb)
    const hard=k=>{if(k<0||k>=ter.length)return true;const bi=k%N,bj=(k/N)|0;if(bi<2||bj<2||bi>N-3||bj>N-3)return true;const T=TERRAIN[ter[k]];if(!T?.walk||occ[k]>=0||wall[k]||this.fort[k])return true;const n=nodeAt[k];if(n>=0){const nd=nodes[n];if(nd&&nd.left>0&&(nd.type==='rock'||nd.type==='ore'||wheels&&nd.type==='tree'))return true;}return wheels&&!!tr[k];};
    const fn=k=>{if(hard(k))return Infinity;const i=k%N;let c=1;const T=TERRAIN[ter[k]];c/=Math.max(.3,TERRAIN_V[V.roues][T.k]??1);c+=Math.min(3,(crater[k]||0)*(wheels?1.6:.8));
      const n=nodeAt[k];if(n>=0&&nodes[n]?.type==='tree'&&nodes[n].left>0)c+=5;if(!wheels&&tr[k])c+=4;
      // la lisière : une case voisine infranchissable coûte (deux de chaque côté pour les engins larges)
      let edge=0;for(const o of [1,-1,N,-N,N+1,N-1,-N+1,-N-1]){const kk=k+o;if((o===1||o===N+1||o===-N+1)&&i===N-1||(o===-1||o===N-1||o===-N-1)&&i===0)continue;if(hard(kk))edge++;}
      return edge>=5?Infinity:c+edge*1.6;};
    // le cache : la valeur de chaque case, recalculée seulement quand les bâtiments ou les murs changent, et au plus chaque quart d'heure de jeu
    // (les arbres abattus, les tranchées) — mesuré : sans lui, chaque test d'emprise relisait huit voisins par point, 0,3 ms par pas de conduite
    const val=new Float32Array(N*N),st=new Int32Array(N*N);let ver=0,sig='';const cached=k=>{const sg=(this.occV|0)+':'+(this.wallV|0)+':'+Math.floor(this.s.t*4);if(sg!==sig){sig=sg;ver++;}
      if(k<0||k>=val.length)return Infinity;if(st[k]!==ver){st[k]=ver;val[k]=fn(k);}return val[k];};
    (this._vc??={})[key]=cached;return cached;},
  // le coût d'une case pour l'ITINÉRAIRE : celui de la case, mais interdite si l'engin n'y tient dans aucun des huit caps (mesuré : l'itinéraire passait
  // par des goulets d'une case où une jeep ne tient pas ; les morceaux locaux échouaient, le repli déviait de 6 cases, le chien de garde abandonnait)
  vehRouteCost(V){const key=V.k||V.name;if(this._vrc?.[key])return this._vrc[key];const N=this.N,base=this.vehCost(V);const val=new Float32Array(N*N),st=new Int32Array(N*N);let ver=0,sig='';
    const fn=k=>{const sg=(this.occV|0)+':'+(this.wallV|0)+':'+Math.floor(this.s.t*4);if(sg!==sig){sig=sg;ver++;}if(k<0||k>=val.length)return Infinity;if(st[k]===ver)return val[k];st[k]=ver;
      const c=base(k);if(c===Infinity)return val[k]=Infinity;const x=k%N+.5,y=((k/N)|0)+.5;let ok=false;for(let q=0;q<8&&!ok;q++)ok=this.vehFits(V,x,y,q*Math.PI/4);return val[k]=ok?c:Infinity;};
    (this._vrc??={})[key]=fn;return fn;},
  // Le chemin : la grille (A*), redressée (on garde les cases d'où l'on voit loin), puis arrondie (Chaikin) pour que la trajectoire soit une courbe.
  vehPlan(v,tx,ty){const V=VEHDEF[v.k],N=this.N,cost=this.vehRouteCost({...V,k:v.k});const si=clamp(Math.floor(v.x),0,N-1),sj=clamp(Math.floor(v.y),0,N-1);
    let ti=clamp(Math.floor(tx),0,N-1),tj=clamp(Math.floor(ty),0,N-1);
    // un but sur une case interdite : la case permise la plus proche
    if(cost(tj*N+ti)===Infinity){let best=null,bd=1e9;for(let r=1;r<=6&&!best;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const a=ti+di,b=tj+dj;if(a<0||b<0||a>=N||b>=N)continue;if(cost(b*N+a)===Infinity)continue;const d=Math.hypot(di,dj);if(d<bd){bd=d;best=[a,b];}}if(!best)return null;[ti,tj]=best;}
    const r=this.pather.find(si,sj,ti,tj,cost,k=>k===tj*N+ti,Math.max(40000,N*160));if(!r.done||!r.path.length)return null;
    const cells=this.vehSmooth(si,sj,r.path,cost);let P=[[v.x,v.y],...cells.map(([i,j])=>[i+.5,j+.5])];
    if(ti===Math.floor(tx)&&tj===Math.floor(ty))P[P.length-1]=[tx,ty];
    for(let it=0;it<2;it++){if(P.length<3)break;const Q=[P[0]];for(let n=0;n<P.length-1;n++){const [a,b]=[P[n],P[n+1]];Q.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}Q.push(P[P.length-1]);
      // un coin arrondi ne doit pas couper une case interdite : sinon on garde l'ancien tracé
      if(Q.every(([x,y])=>cost(clamp(Math.floor(y),0,N-1)*N+clamp(Math.floor(x),0,N-1))!==Infinity))P=Q;}
    return P;},
  // Le chemin d'un engin à roues : A* « hybride » — on cherche dans l'espace (position, cap) avec de vrais arcs de braquage (rayon minimal), en avant
  // et en arrière, plutôt que de case en case : le tracé est conduisible par construction (une voiture ne tourne pas sur place ; un chemin de grille
  // lui demandait des épingles qu'elle ne pouvait pas prendre — mesuré : 3 à 5 cases d'écart, des engins nez au mur).
  //  heuristique : le coût d'arrivée sur la grille (Dijkstra depuis le but, obstacles compris), borné à une fenêtre autour du départ et du but
  //  emprise : le centre, l'avant, l'arrière et les deux flancs ne touchent aucune case interdite
  //  rendu : des points [x, y, sens] (sens −1 en marche arrière), un point par pas d'arc
  //  chenilles : des arcs plus serrés (rayon 1,6 case) et le pivot sur place (±30°, sans avancer) — leur chemin tient compte de leur largeur
  //  gh : un cap d'arrivée voulu (±45°) — pour enchaîner des étapes sans rebrousser à chacune
  vehHybrid(v,tx,ty,maxN=60000,m=40,others=null,gh=null,om=.35){const V=VEHDEF[v.k],N=this.N,cost=this.vehCost(V),H=24,STEP=1.05,L=V.long*.62,trk=V.roues==='chenilles',maxSt=Math.atan(L/(trk?1.6:V.r));
    const cell=(x,y)=>clamp(Math.floor(y),0,N-1)*N+clamp(Math.floor(x),0,N-1);const free=(x,y)=>x>=1&&y>=1&&x<N-1&&y<N-1&&cost(cell(x,y))!==Infinity;
    // (la souplesse des deux premiers pas : seulement si la pose de départ est déjà serrée — sinon le pilote, strict, refusait le début du chemin)
    const fits=(x,y,h,relax)=>this.vehFits(V,x,y,h,relax,0,others,om);const roomy=(x,y,h)=>this.vehFits(V,x,y,h,false,.15);const depth=[];const tight=!this.vehFits(V,v.x,v.y,v.h,false,0,others,om);
    this._hyb={why:'but interdit'};if(!free(tx,ty))return null;
    // la carte du coût d'arrivée (fenêtre)
    const x0=clamp(Math.floor(Math.min(v.x,tx))-m,0,N-1),y0=clamp(Math.floor(Math.min(v.y,ty))-m,0,N-1),x1=clamp(Math.floor(Math.max(v.x,tx))+m,0,N-1),y1=clamp(Math.floor(Math.max(v.y,ty))+m,0,N-1);
    // (double précision : en Float32, la distance relue était arrondie et le test « d > D[k] » écartait des cases jamais développées)
    const ww=x1-x0+1,hh=y1-y0+1,D=new Float64Array(ww*hh).fill(Infinity);const Q=[];const qpush=(k,d)=>{Q.push([d,k]);let i=Q.length-1;while(i>0){const p=(i-1)>>1;if(Q[p][0]<=Q[i][0])break;[Q[p],Q[i]]=[Q[i],Q[p]];i=p;}};
    const qpop=()=>{const t=Q[0],l=Q.pop();if(Q.length){Q[0]=l;let i=0;for(;;){const a=2*i+1,b=a+1;let s=i;if(a<Q.length&&Q[a][0]<Q[s][0])s=a;if(b<Q.length&&Q[b][0]<Q[s][0])s=b;if(s===i)break;[Q[s],Q[i]]=[Q[i],Q[s]];i=s;}}return t;};
    {const gi=Math.floor(tx)-x0,gj=Math.floor(ty)-y0;D[gj*ww+gi]=0;qpush(gj*ww+gi,0);
      while(Q.length){const [d,k]=qpop();if(d>D[k])continue;const i=k%ww,j=(k/ww)|0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=ww||b>=hh)continue;
        const c=cost((b+y0)*N+a+x0);if(c===Infinity)continue;const nd=d+(di&&dj?1.414:1)*c;const kk=b*ww+a;if(nd<D[kk]){D[kk]=nd;qpush(kk,nd);}}}}
    const hOf=(x,y)=>{const i=Math.floor(x)-x0,j=Math.floor(y)-y0;if(i<0||j<0||i>=ww||j>=hh)return Infinity;return D[j*ww+i];};
    this._hyb={why:'départ hors de la carte d’arrivée',h0:hOf(v.x,v.y),win:[x0,y0,x1,y1]};if(hOf(v.x,v.y)===Infinity)return null;
    // la recherche : nœuds (x, y, cap, g, parent, sens, braquage) dans des tableaux ; une case-cap déjà fermée n'est pas rouverte
    const X=[],Y=[],TH=[],G=[],PAR=[],DIR=[],ST=[];const closed=new Map(),open=[];const hb=h=>((Math.round(h/(2*Math.PI)*H)%H)+H)%H;
    const opush=(n,f)=>{open.push([f,n]);let i=open.length-1;while(i>0){const p=(i-1)>>1;if(open[p][0]<=open[i][0])break;[open[p],open[i]]=[open[i],open[p]];i=p;}};
    const opop=()=>{const t=open[0],l=open.pop();if(open.length){open[0]=l;let i=0;for(;;){const a=2*i+1,b=a+1;let s=i;if(a<open.length&&open[a][0]<open[s][0])s=a;if(b<open.length&&open[b][0]<open[s][0])s=b;if(s===i)break;[open[s],open[i]]=[open[i],open[s]];i=s;}}return t;};
    const add=(x,y,h,g,par,dir,st)=>{X.push(x);Y.push(y);TH.push(h);G.push(g);PAR.push(par);DIR.push(dir);ST.push(st);return X.length-1;};
    opush(add(v.x,v.y,v.h,0,-1,1,0),hOf(v.x,v.y));depth[0]=0;const steers=[-maxSt,-maxSt*.5,0,maxSt*.5,maxSt];let goal=-1,n=0;
    while(open.length&&n<maxN){const [,c]=opop();const key=cell(X[c],Y[c])*H+hb(TH[c]);if(closed.has(key))continue;closed.set(key,c);n++;
      if(d2(X[c],Y[c],tx,ty)<(gh==null?.7:1.2)&&(gh==null||Math.abs(wrap(TH[c]+(DIR[c]<0?Math.PI:0)-gh))<.8)){goal=c;break;}
      if(trk)for(const dh of [Math.PI/6,-Math.PI/6]){const h=wrap(TH[c]+dh);if(!fits(X[c],Y[c],h,tight&&depth[c]<2))continue;const k2=cell(X[c],Y[c])*H+hb(h);if(closed.has(k2))continue;
        // (un pivot coûte le temps qu'il prend, compté en cases parcourues : 30° au rythme du pivot, à la vitesse de route — pour le char, ~3 cases)
        const g=G[c]+(Math.PI/6)/Math.max(.1,V.pivot*D2R*HOUR_REAL)*V.vmax*cost(cell(X[c],Y[c]));const nn=add(X[c],Y[c],h,g,c,DIR[c],0);depth[nn]=depth[c]+1;opush(nn,g+hOf(X[c],Y[c])*1.05);}
      for(const dir of [1,-1])for(const st of steers){let x=X[c],y=Y[c],h=TH[c],ok=true;const sub=3,ds=STEP/sub*dir;
        for(let q=0;q<sub;q++){h=wrap(h+ds/L*Math.tan(st));x+=Math.cos(h)*ds;y+=Math.sin(h)*ds;if(!fits(x,y,h,tight&&depth[c]<2)){ok=false;break;}}
        if(!ok)continue;const k2=cell(x,y)*H+hb(h);if(closed.has(k2))continue;const hv=hOf(x,y);if(hv===Infinity)continue;
        const g=G[c]+STEP*cost(cell(x,y))*(dir<0?2.5:1)+Math.abs(st)*.25+Math.abs(st-ST[c])*.35+(dir!==DIR[c]&&c!==0?8:0)+(roomy(x,y,h)?0:.7);
        const nn=add(x,y,h,g,c,dir,st);depth[nn]=depth[c]+1;opush(nn,g+hv*1.05);}}
    this._hyb={why:goal<0?'pas trouvé':'ok',n,open:open.length,nodes:X.length};if(goal<0)return null;const out=[];for(let c=goal;c>=0;c=PAR[c])out.push([X[c],Y[c],DIR[c],TH[c]]);out.reverse();
    // le premier point porte le sens du premier pas ; le dernier : le but exact (à moins de 0,7 case du dernier nœud ; pas pour une étape)
    if(out.length>1)out[0][2]=out[1][2];if(gh==null)out.push([tx,ty,out[out.length-1][2],out[out.length-1][3]]);return out;},
  // l'emprise au sol : le centre, l'avant, l'arrière et les deux flancs hors de toute case interdite (la même règle pour le chemin et pour le pilote —
  // mesuré : le pilote ne regardait que le centre, une jeep s'est mis le nez dans un obstacle d'où aucun chemin ne la sortait plus)
  //  marge : en plus (ou en moins) de l'emprise — le pilote vérifie une emprise plus petite (−0,06) que celle du chemin : le tracé prévu lui laisse
  //  toujours de quoi s'écarter un peu ; le chemin, lui, préfère (par son coût) garder 0,15 case de plus
  //  autres : des engins à éviter (leur rectangle) — les engins arrêtés pour le chemin, tous pour le pilote
  //  omarge : la marge gardée autour des autres engins (le chemin en garde 0,35 s'il le peut, le pilote vérifie le contact)
  vehFits(V,x,y,h,relax=false,marge=0,autres=null,omarge=0){const N=this.N,cost=this.vehCost(V);const free=(a,b)=>a>=1&&b>=1&&a<N-1&&b<N-1&&cost(Math.floor(b)*N+Math.floor(a))!==Infinity;if(relax)return free(x,y);
    const c=Math.cos(h),s=Math.sin(h),hl=V.long*.42+marge,hw=V.large*.42+marge;const P=[[x,y],[x+c*hl,y+s*hl],[x-c*hl,y-s*hl],[x-s*hw,y+c*hw],[x+s*hw,y-c*hw]];
    if(!P.every(([a,b])=>free(a,b)))return false;if(autres)for(const o of autres){const O=VEHDEF[o.k];if(d2(o.x,o.y,x,y)>(V.long+O.long)/2+.6)continue;const oc=Math.cos(o.h),os=Math.sin(o.h);
      for(const [a,b] of P){const lx=(a-o.x)*oc+(b-o.y)*os,ly=-(a-o.x)*os+(b-o.y)*oc;if(Math.abs(lx)<O.long/2+omarge&&Math.abs(ly)<O.large/2+omarge)return false;}}return true;},
  // (« arrêté » : sans ordre de route, ou presque immobile quel que soit son ordre — mesuré : un engin « en route » mais coincé n'était pas contourné, 229 attentes derrière lui)
  vehOthers(v,stopped){return this.s.vehicles.filter(o=>o!==v&&VEHDEF[o.k]&&o.hp>0&&(!stopped||o.spd<.3||o.state!=='go'));},
  // le redressement : depuis chaque point, la case la plus lointaine qu'on voit en ligne droite (sans traverser d'interdit)
  vehSmooth(si,sj,path,cost){const out=[];let ax=si+.5,ay=sj+.5,k=0;while(k<path.length){let far=k;for(let m=Math.min(path.length-1,k+16);m>k;m--){if(this.clearLine(ax,ay,path[m][0]+.5,path[m][1]+.5,cost)){far=m;break;}}out.push(path[far]);ax=path[far][0]+.5;ay=path[far][1]+.5;k=far+1;}return out;},

  // ---------- la conduite ----------
  // ---------- l'horizon glissant ----------
  // Rouler vers (tx, ty) : un ITINÉRAIRE de grille jusqu'au but (rapide, même pour un détour de 480 cases), puis, à mesure qu'on avance, un CHEMIN LOCAL
  // conduisible (A* hybride : rayon de braquage, marche arrière, emprise, engins garés) sur les ~12 cases suivantes de l'itinéraire, refait avant d'en
  // voir le bout. Mesuré : planifier tout le trajet d'un coup coûtait jusqu'à 5,7 s et devait tout refaire à la moindre obstruction ; chaque morceau
  // local reste petit (fenêtre de 14 cases, 8 000 nœuds au plus). Faux s'il n'y a pas d'itinéraire.
  vehMove(v,tx,ty){if(VEHDEF[v.k]?.nav==='eau')return this.boatMove(v,tx,ty);if(VEHDEF[v.k]?.air)return this.airGoto(v,tx,ty);const R=this.vehPlan(v,tx,ty);if(!R){v.why='pas de chemin pour ce véhicule (arbres, rochers, tranchées, eau)';v.path=null;v.itin=null;v.state='idle';return false;}
    v.itin=R;v.ri=0;v.goal=[tx,ty];v.path=null;v.state='go';v.why=null;v.man=null;v.watch=null;v.localN=0;return true;},
  // le morceau local : vers le point de l'itinéraire à ~12 cases devant (cap voulu : la direction de l'itinéraire là-bas), à défaut ~6 cases ;
  // le but lui-même s'il est à portée. À défaut de tout, l'itinéraire tel quel (le pilote manœuvre au besoin).
  vehLocal(v){const V=VEHDEF[v.k],R=v.itin;if(!R)return;const oth=this.vehOthers(v,true);
    // la progression sur l'itinéraire (projection sur les segments), puis le point à `dist` cases plus loin
    const pr=this.vehRouteAt(v),best=pr.i;
    const at=dist=>{let s=-d2(R[best][0],R[best][1],R[Math.min(R.length-1,best+1)][0],R[Math.min(R.length-1,best+1)][1])*pr.t;for(let n=best;n<R.length-1;n++){const l=d2(R[n][0],R[n][1],R[n+1][0],R[n+1][1]);if(s+l>=dist){const q=(dist-s)/l;return {x:R[n][0]+(R[n+1][0]-R[n][0])*q,y:R[n][1]+(R[n+1][1]-R[n][1])*q,h:Math.atan2(R[n+1][1]-R[n][1],R[n+1][0]-R[n][0]),fin:false};}s+=l;}
      return {x:v.goal[0],y:v.goal[1],h:null,fin:true};};
    v.localN=(v.localN||0)+1;let P=null;
    for(const [dist,om] of [[12,.35],[6,.35],[12,.05],[6,.05]]){const T=at(dist);P=this.vehHybrid(v,T.x,T.y,8000,14,oth,T.fin?null:T.h,om);if(P){P.fin=T.fin;break;}
      if(!T.fin){P=this.vehHybrid(v,T.x,T.y,8000,14,oth,null,om);if(P){P.fin=false;break;}}}
    // (quatre essais ratés : on suit l'itinéraire tel quel 0,3 h avant de retenter — chaque essai raté coûte jusqu'à 20 000 nœuds)
    if(!P){v.localWait=this.s.t+.3;(v.diag??={}).localFail=(v.diag.localFail||0)+1;v.diag.lastFail={x:+v.x.toFixed(1),y:+v.y.toFixed(1),h:+v.h.toFixed(2),why:this._hyb?.why,fits:this.vehFits(V,v.x,v.y,v.h)};P=[[v.x,v.y,1],...R.slice(best+1,best+12).map(p=>[p[0],p[1],1])];P.fin=best+12>=R.length;if(P.fin)P.push([v.goal[0],v.goal[1],1]);}
    else (v.diag??={}).localOk=(v.diag.localOk||0)+1;
    v.path=P;v.pi=0;},
  // Le chien de garde : un engin en route dont la distance au but ne baisse pas d'au moins 0,5 case en 1,5 h se dégage vers la pose libre la plus proche
  // (1,2 case au plus, huit caps), puis refait son morceau local ; après cinq tentatives il s'arrête et le dit (mesuré : des engins coincés contre un
  // engin garé, au bout d'une marche arrière, nés dans un autre engin — chaque cas réglé à la main en faisait apparaître un autre)
  // (la progression se mesure le long de l'itinéraire, pas à vol d'oiseau : sur un détour, la distance droite au but grandit d'abord — mesuré, le
  // chien de garde déclarait « bloqués » des engins qui roulaient)
  // la position de l'engin sur l'itinéraire : projeté sur les segments (pas sur les points — mesuré : le point le plus proche restait en retard quand le
  // tracé local s'écartait un peu, la cible « 12 cases plus loin » tombait à 2 cases et l'engin refaisait 359 morceaux pour un trajet)
  vehRouteAt(v){const R=v.itin;let bi=v.ri||0,bt=0,bd=1e9;for(let n=Math.max(0,(v.ri||0)-2);n<Math.min(R.length-1,(v.ri||0)+40);n++){const q=this.segProj(v.x,v.y,R[n],R[n+1]);if(q.d<bd-1e-6){bd=q.d;bi=n;bt=q.t;}}
    if(bi>=(v.ri||0))v.ri=bi;else{bi=v.ri;bt=0;}return {i:bi,t:bt,d:bd};},
  vehRouteLeft(v){const R=v.itin;if(!R)return 0;const p=this.vehRouteAt(v);let s=p.d+d2(R[p.i][0],R[p.i][1],R[Math.min(R.length-1,p.i+1)][0],R[Math.min(R.length-1,p.i+1)][1])*(1-p.t);
    for(let n=p.i+1;n<R.length-1;n++)s+=d2(R[n][0],R[n][1],R[n+1][0],R[n+1][1]);return s;},
  vehWatch(v,V){if(!v.goal)return;const t=this.s.t,d=this.vehRouteLeft(v);const w=v.watch??={t,d,n:0};if(d<w.d-.5){w.t=t;w.d=d;return;}if(t-w.t<1.5)return;
    w.t=t;w.d=d;(v.diag??={}).watch=(v.diag.watch||0)+1;if(++w.n>5){v.state='idle';v.path=null;v.itin=null;v.why='bloqué : je n’arrive pas à passer';v.watch=null;return;}
    const oth=this.vehOthers(v,false);let best=null,bd=1e9;for(let r=.25;r<=1.2&&!best;r+=.25)for(let a=0;a<16;a++){const x=v.x+Math.cos(a/16*6.283)*r,y=v.y+Math.sin(a/16*6.283)*r;
      for(let q=0;q<8;q++){const h=wrap(v.h+q*Math.PI/4);if(this.vehFits(V,x,y,h,false,0,oth)){const c=r+Math.abs(wrap(h-v.h))*.3;if(c<bd){bd=c;best=[x,y,h];}}}}
    if(best){[v.x,v.y,v.h]=best;v.spd=0;v.man=null;}v.path=null;},
  // un nouveau morceau local tout de suite (bloqué : un engin qui ne bouge pas, un mur devant) — trois fois en deux heures au plus
  vehReplan(v){(v.diag??={}).rRe=(v.diag.rRe||0)+1;const t=this.s.t;v.replans=(v.replans||[]).filter(x=>t-x<2);if(v.replans.length>=3||!v.goal)return false;v.replans.push(t);v.path=null;return true;},
  // le cap de la caisse : l'angle (repère du monde, x vers l'est, y vers le sud) ; l'avant du véhicule est (cos h, sin h) ; v.dir : +1 en avant, −1 en arrière
  // La soute d'un engin : comptée en caisses (une caisse de munitions, une arme, une protection = 1 ; 10 unités d'une ressource = 1).
  // On charge et décharge à un dépôt à moins de 4 cases ; à l'arrêt, l'équipage, les Meumeu à 2,5 cases et les armes de l'engin s'y ravitaillent.
  soutePart(k,n){return /^(m|a|p):/.test(k)?n:n/10;},
  souteUsed(v){let s=0;for(const [k,n] of Object.entries(v.cargo||{}))s+=this.soutePart(k,n);return s;},
  vehLoad(v,k,n){const V=VEHDEF[v.k];if(!V?.soute)return {ok:false,why:['pas de soute']};const RD=V.air?14:4;if(!this.depots(v.f,v.x,v.y,RD).length)return {ok:false,why:[`il faut un dépôt à moins de ${RD} cases`]};
    const room=V.soute-this.souteUsed(v),per=this.soutePart(k,1);const want=Math.min(n,Math.floor(room/per+1e-9));if(want<=0)return {ok:false,why:['soute pleine']};
    const got=this.take(v.f,v.x,v.y,k,want,RD);if(got<=0)return {ok:false,why:['le dépôt n’en a pas']};v.cargo[k]=(v.cargo[k]||0)+got;return {ok:true,text:`${v.name} : ${Math.round(got*10)/10} ${this.goodName(k)} chargé${got>1?'s':''}.`};},
  vehUnload(v,k=null,n=Infinity){const RD=VEHDEF[v.k]?.air?14:4;const D=this.depots(v.f,v.x,v.y,RD)[0];if(!D)return {ok:false,why:[`il faut un dépôt à moins de ${RD} cases`]};let moved=0;
    for(const kk of k?[k]:Object.keys(v.cargo)){const q=this.put(D,kk,Math.min(n,v.cargo[kk]||0));v.cargo[kk]-=q;moved+=q;if(v.cargo[kk]<=1e-6)delete v.cargo[kk];}
    return moved>0?{ok:true,text:`${v.name} décharge au dépôt.`}:{ok:false,why:['rien à décharger, ou dépôt plein']};},
  vehSouteSupply(v){if(!v.cargo||(v.spd||0)>.5)return;if(this.s.t-(v.souteT??-9)<.25)return;v.souteT=this.s.t;
    const crate=(w,cap,give)=>{const k='m:'+w;if(!((v.cargo[k]||0)>=1))return false;const Wd=this.W(w);if(!Wd)return false;if(!give(Wd))return false;v.cargo[k]-=1;if(v.cargo[k]<=1e-6)delete v.cargo[k];return true;};
    for(const m of v.mounts||[])crate(m.w,0,Wd=>{if((m.pouch||0)>=Wd.p.mag*2)return false;m.pouch=(m.pouch||0)+(Wd.perCrate||Wd.p.mag);return true;});
    const near=[...(v.crew||[]),...this.s.units.filter(u=>u.f===v.f&&!u.inVeh&&u.hp>0&&Math.hypot(u.x-v.x,u.y-v.y)<2.5)];
    for(const u of near){if(!u.w)continue;crate(u.w,0,Wd=>{const carry=Wd.carry||Wd.p.mag*4;if((u.pouch||0)+(u.mag||0)>=carry*.5)return false;u.pouch=Math.min(carry,(u.pouch||0)+(Wd.perCrate||Wd.p.mag));return true;});}},
  // (V12.8) L'essence d'un engin conçu : il en brûle à chaque case roulée (perCase, tiré de sa masse et de son moteur) ; à sec, il s'arrête.
  // Le plein se refait tout seul dès qu'il est arrêté (sans ordre de route : mesuré, un char qui démarrait d'un dépôt refaisait son plein tant qu'il roulait
  // à moins de 0,5 case/h, 11 → 20 bidons en partant) : d'abord sa propre soute, puis un engin ravitailleur ami arrêté à 3 cases (sa soute),
  // puis un dépôt à 5 cases — 40 bidons par heure de jeu (un char moyen refait son plein en une demi-heure, dix secondes de combat).
  vehBurn(v,V,d){if(!(d>0))return;const E=V.engin,was=v.fuel;v.fuel=Math.max(0,v.fuel-d*E.perCase);
    if(v.f==='meumeu'&&was>E.plein*.2&&v.fuel<=E.plein*.2)this.log('Front',`${v.name} : réservoir presque vide (${Math.round(v.fuel*10)/10} / ${E.plein}).`,'bad');},
  vehRefuel(v,V){const E=V.engin,k=E.carbu;if(v.state==='go'||(v.spd||0)>.5||this.s.t<(v.fuelT||0))return;v.fuelT=this.s.t+.25;let want=Math.min(E.plein-v.fuel,40*.25);if(want<.05)return;
    const got0=v.fuel,give=q=>{v.fuel+=q;want-=q;};
    if((v.cargo?.[k]||0)>0){const q=Math.min(want,v.cargo[k]);v.cargo[k]-=q;if(v.cargo[k]<=1e-6)delete v.cargo[k];give(q);}
    if(want>.05)for(const o of this.s.vehicles){if(o===v||o.f!==v.f||o.hp<=0||o.state==='go'||(o.spd||0)>.5||!((o.cargo?.[k]||0)>0)||Math.hypot(o.x-v.x,o.y-v.y)>3)continue;
      const q=Math.min(want,o.cargo[k]);o.cargo[k]-=q;if(o.cargo[k]<=1e-6)delete o.cargo[k];give(q);if(want<=.05)break;}
    if(want>.05)for(const o of this.s.vehicles){if(o===v||o.f!==v.f||o.hp<=0||o.state==='go'||(o.spd||0)>.5||!(o.cuveN>0)||Math.hypot(o.x-v.x,o.y-v.y)>3)continue;
      if((VEHDEF[o.k]?.engin?.cuveKind||'')!==k)continue;const q=Math.min(want,o.cuveN);o.cuveN-=q;give(q);if(want<=.05)break;}
    if(want>.05){const q=this.take(v.f,v.x,v.y,k,want,5);if(q>0)give(q);}
    if(v.fuel>got0&&v.dry){v.dry=false;v.why=null;}},
  // la citerne : sa cuve (à part de son réservoir) se remplit à un dépôt ; les engins arrêtés à 3 cases s'y servent (vehRefuel)
  vehCuveFill(v,V){if(V.role!=='citerne'||v.state==='go'||(v.spd||0)>.5||this.s.t<(v.cuveT||0))return;v.cuveT=this.s.t+.25;
    const k=V.engin?.cuveKind;if(!k||!(V.cuve>0))return;const room=V.cuve-(v.cuveN||0);if(room<.5)return;
    const q=this.take(v.f,v.x,v.y,k,Math.min(room,10),4);if(q>0)v.cuveN=(v.cuveN||0)+q;},
  // le camion et la charrette de munitions : à l'arrêt, une caisse passe à un engin ami dont l'arme est à moitié vide
  vehAmmoRun(v,V){if(V.role!=='munitions'||(v.spd||0)>.5||this.s.t-(v.ammoT??-9)<.25)return;v.ammoT=this.s.t;
    for(const o of this.s.vehicles){if(o===v||o.f!==v.f||o.hp<=0||Math.hypot(o.x-v.x,o.y-v.y)>3.5)continue;const OV=VEHDEF[o.k];if(!OV?.armes)continue;
      for(let i=0;i<o.mounts.length;i++){const m=o.mounts[i],W=this.W(m.w);if(!W)continue;const cap=OV.armes[i]?.coups||W.p.mag*4;if((m.mag||0)+(m.pouch||0)>=cap*.55)continue;
        const key='m:'+m.w;if(!((v.cargo?.[key]||0)>=1))continue;m.pouch=(m.pouch||0)+(W.perCrate||W.p.mag);v.cargo[key]-=1;if(v.cargo[key]<=1e-6)delete v.cargo[key];}}},
  vehAmmoLoad(v,V){if(V.role!=='munitions'||v.supplyHold||v.state==='go'||(v.spd||0)>.5)return;if(this.s.t<(v.ammoLT||0))return;
    const room=V.soute-this.souteUsed(v);if(room<1||!this.depots(v.f,v.x,v.y,4).length)return;v.ammoLT=this.s.t+.5;
    const H=this.have(v.f,v.x,v.y,4);let left=Math.min(room,8);
    for(const k of Object.keys(H)){if(left<1||!k.startsWith('m:')||H[k]<2)continue;const q=this.take(v.f,v.x,v.y,k,Math.min(2,Math.floor(H[k]-1),left),4);if(q>0){v.cargo[k]=(v.cargo[k]||0)+q;left-=q;}}},
  // la tournée, seulement sans ordre du joueur (un clic droit pose supplyHold : il reste où on l'a mis, et ravitaille quand même autour de lui)
  vehSupplyDrive(v,V){if(!V.role||v.supplyHold||v.state!=='idle'||!this.vehDriver(v)||this.s.t<(v.supLook||0))return;v.supLook=this.s.t+.5;
    const go=(x,y,why)=>{const ok=this.vehMove(v,x,y);if(ok)v.why=why;else v.supLook=this.s.t+2;return ok;};
    if(V.role==='citerne'){const k=V.engin?.cuveKind||'essence';
      let best=null,bd=80;if((v.cuveN||0)>2)for(const o of this.s.vehicles){if(o===v||o.f!==v.f||o.hp<=0)continue;const E=VEHDEF[o.k]?.engin;if(!E||E.perCase<=0||E.carbu!==k||!(o.fuel<E.plein*.45))continue;const d=Math.hypot(o.x-v.x,o.y-v.y);if(d<bd){bd=d;best=o;}}
      if(best)return go(best.x,best.y,`va ravitailler ${best.name}`);
      if((v.cuveN||0)<V.cuve*.35){const D=this.depots(v.f,v.x,v.y,400).find(d=>(d.stock?.[k]||0)>=2);if(D){const [x,y]=this.bc(D);go(x,y,'va remplir la citerne');}}return;}
    if(V.role!=='munitions')return;
    const crates=Object.entries(v.cargo||{}).reduce((a,[k,n])=>a+(k.startsWith('m:')?n:0),0);
    if(crates<1){const D=this.depots(v.f,v.x,v.y,400).find(d=>Object.entries(d.stock||{}).some(([k,n])=>k.startsWith('m:')&&n>=2));if(D){const [x,y]=this.bc(D);go(x,y,'va chercher des caisses');}return;}
    let best=null,bd=80;for(const o of this.s.vehicles){if(o===v||o.f!==v.f||o.hp<=0||!o.mounts)continue;const OV=VEHDEF[o.k];if(!OV)continue;
      const low=o.mounts.some((m,i)=>{const W=this.W(m.w);if(!W||!((v.cargo['m:'+m.w]||0)>=1))return false;const cap=OV.armes[i]?.coups||W.p.mag*4;return (m.mag||0)+(m.pouch||0)<cap*.4;});
      if(!low)continue;const d=Math.hypot(o.x-v.x,o.y-v.y);if(d<bd){bd=d;best=o;}}
    if(best)go(best.x,best.y,`va porter des munitions à ${best.name}`);},
  combatVehicleTick(v,dt){const V=VEHDEF[v.k];if(V.air){this.airTick(v,V,dt);return;}if(V.nav==='eau'){this.vehSouteSupply(v);this.boatTick(v,V,dt);if(V.armes.length&&v.hp>0){this.vehResupply(v,V);if(this.atWar)this.vehFire(v,V,dt);}return;}if(v.hp<=0){v.spd=0;return;}this.vehSouteSupply(v);
    if(v.fire>0){v.fire-=dt;v.hp-=dt*35;if(v.hp<=0){this.vehDestroyed(v,'brûlé');return;}}
    if(v.comp?.moteur||v.comp?.train){if(v.state==='go'){v.state='idle';v.path=null;v.itin=null;}v.why=v.comp.moteur?'moteur détruit : immobilisé':'train de roulement brisé : immobilisé';}
    if(V.engin&&V.engin.perCase>0&&!(v.fuel>1e-6)){v.fuel=0;if(v.state==='go'){v.state='idle';v.path=null;v.itin=null;}v.dry=true;v.why=`à sec : il attend ${V.engin.carbu==='charbon'?'du charbon':'de l’essence'} (un dépôt à 5 cases, ou un engin ravitailleur à 3)`;}
    const drv=this.vehDriver(v),x0=v.x,y0=v.y;
    if(v.state==='go'&&v.itin&&drv){if(!v.path||!v.path.fin&&this.vehRemainLocal(v)<4&&!(this.s.t<v.localWait))this.vehLocal(v);this.vehDrive(v,V,dt);this.vehWatch(v,V);}else this.vehBrake(v,V,dt);
    v.odo+=v.spd*(v.dir||1)*dt;v.x=clamp(v.x,1,this.N-2);v.y=clamp(v.y,1,this.N-2);
    if(V.engin){this.vehBurn(v,V,Math.hypot(v.x-x0,v.y-y0));this.vehRefuel(v,V);}
    if(V.role){this.vehCuveFill(v,V);this.vehAmmoLoad(v,V);this.vehAmmoRun(v,V);if(v.state!=='go')this.vehSupplyDrive(v,V);}
    if(V.armes.length){this.vehResupply(v,V);if(this.atWar)this.vehFire(v,V,dt);}},
  // personne au volant, le véhicule reste où il est (v.debugDriver : les essais de conduite, sans équipage)
  vehDriver(v){return !!v.debugDriver||(v.crew||[]).some(u=>u.vrole==='conducteur'&&u.hp>0&&u.h?.state!=='hors');},
  // ---------- le feu ----------
  // Chaque poste (tourelle, affût, casemate) a son servant ; sans servant, il ne tire pas. Le premier servant pointe la première pièce, le suivant
  // la suivante ; un servant de plus que de pièces charge (le canon recharge deux fois plus vite). Les armes : celles des conceptions (la même
  // balistique que l'infanterie, par un tireur « virtuel » posté sur la caisse), leurs coups à bord (le chargeur, la soute).
  vehPieces(V){return [...new Set(V.armes.map(a=>a.piece))];},
  // (un passager valide reprend l'arme d'un servant tombé — le conducteur, lui, conduit ; mesuré : le servant de la jeep hors de combat, la
  // mitrailleuse restait muette avec deux hommes valides à bord)
  vehCrewFor(v,V){const ok=u=>u.hp>0&&u.h?.state!=='hors';const P=this.vehPieces(V);let sv=(v.crew||[]).filter(u=>u.vrole==='servant'&&ok(u));
    if(sv.length<P.length)sv=sv.concat((v.crew||[]).filter(u=>u.vrole==='passager'&&ok(u)).slice(0,P.length-sv.length));
    const gunner={};P.forEach((p,i)=>gunner[p]=sv[i]||null);return {gunner,loader:sv.length>P.length};},
  // la classe d'une arme montée : canon (un obus explosif, coup par coup) ou mitrailleuse
  vehClass(W){return W.he&&!ACT[W.p.action]?.auto?'canon':'mg';},
  // la position d'un poste dans le monde : devant/derrière, côté, hauteur (repère de la caisse), et le bout du tube selon le pointage
  vehMuzzle(v,A,yaw){const c=Math.cos(v.h),s=Math.sin(v.h);const p=A.pos||[0,0,.8];const bx=v.x+c*p[0]-s*p[1],by=v.y+s*p[0]+c*p[1];const a=v.h+yaw;return {x:bx+Math.cos(a)*(A.tube||.5),y:by+Math.sin(a)*(A.tube||.5),bx,by,z:p[2]};},
  // Les cibles d'une arme, notées : l'antichar d'abord (la seule menace pour un blindé), puis les pièces lourdes, puis l'infanterie — le canon cherche
  // les groupes (au moins trois à 1,5 case) et les ouvrages, il ne gâche pas un obus sur un isolé quand une mitrailleuse de l'engin peut le prendre.
  vehTargets(v,V,cls,from,range,hasMg){const out=[];const enemy=v.f==='meumeu'?'beee':'meumeu';
    this.near(from.x,from.y,range,e=>{if(e.f!==enemy||!active(e))return;const d=d2(e.x,e.y,from.x,from.y);if(d>range)return;if(!(this.spotted(e,v.f)||this.visibleAt(v.f,e.x,e.y)))return;if(!this.los(from.x,from.y,e.x,e.y))return;
      const We=e.w?this.W(e.w):null;const at=!!We&&We.p.action==='verrou'&&We.p.d>=4;const heavy=!!We&&We.crew>1;let grp=0;this.near(e.x,e.y,1.5,o=>{if(o.f===enemy&&active(o))grp++;});
      const s=cls==='canon'?(at?12:heavy?9:grp>=3?4+grp:hasMg?0:1.5):(at?11:heavy?7.5:5+Math.min(3,grp*.4));if(s<=0)return;out.push({e,isB:false,s:s-d/range*3});});
    if(cls==='canon')for(const b of this.s.buildings){if(b.f!==enemy||b.ruin)continue;const [w,h]=this.sizeOf(b);const bx=b.i+w/2,by=b.j+h/2,d=d2(bx,by,from.x,from.y);if(d>range||!this.visibleAt(v.f,bx,by))continue;
      const s=(b.k==='tour'?8:b.k==='caserne'?5:BUILDINGS[b.k]?.defense?7:2.5)-d/range*3;out.push({e:b,isB:true,s});}
    return out.sort((a,z)=>z.s-a.s);},
  vehFire(v,V,dt){const {gunner,loader}=this.vehCrewFor(v,V);const t=this.s.t;
    for(let i=0;i<v.mounts.length;i++){const m=v.mounts[i];m.cool=Math.max(0,(m.cool||0)-this.dts);m.reload=Math.max(0,(m.reload||0)-this.dts);
      // (une arme vide se recharge d'elle-même, sans attendre une cible qui lui convienne)
      if(m.mag<=0&&m.pouch>0&&m.reload<=0&&(gunner[V.armes[i].piece])){const W=this.W(m.w);if(W){const n=Math.min(W.p.mag||1,m.pouch);m.mag=n;m.pouch-=n;m.reload=this.vehClass(W)==='canon'?(loader?3:6):W.p.mag>12?4:2.5;m.burst=0;}}}
    for(const piece of this.vehPieces(V)){const g=gunner[piece];const idx=V.armes.map((a,i)=>a.piece===piece?i:-1).filter(i=>i>=0);const main=v.mounts[idx[0]],A0=V.armes[idx[0]];
      if(!main||!A0)continue;const W0=this.W(main.w);if(!W0)continue;const cls=this.vehClass(W0);   /* (une arme sans poste, sur un engin d'avant elle : elle ne tire pas) */const hasMg=V.armes.some(a=>this.vehClass(this.W(a.w))==='mg');
      const from=this.vehMuzzle(v,A0,main.yaw);const range=cls==='canon'?clamp(Math.max(20,W0.eff*1.8/4),20,40):clamp(Math.max(14,W0.eff*1.6/4),12,34);
      // la cible de la pièce, revue chaque dixième d'heure (ou perdue)
      const keep=main.target&&(main.target.isB?this.building(main.target.id):this.unit(main.target.id));const lost=!keep||(!main.target.isB&&!active(keep))||keep.ruin;
      if(!g){main.target=null;continue;}
      // (la pièce vise la meilleure cible de toutes ses armes : mesuré, une tourelle qui ne cherchait que pour son canon ne tournait pas vers un isolé,
      // et la coaxiale ne tirait jamais)
      // (une cible gardée tant qu'une autre ne vaut pas nettement plus : mesuré, deux cibles de notes voisines faisaient changer la pièce de cible chaque
      // dixième d'heure, et chaque changement remettait la visée à zéro — elle ne tirait jamais)
      if(lost||t>=(main.retarget||0)){main.retarget=t+.1;let best=null,cur=null;for(const c2 of new Set(idx.map(i=>this.vehClass(this.W(v.mounts[i].w))))){const L=this.vehTargets(v,V,c2,{x:from.bx,y:from.by},range,hasMg);const T=L[0];if(T&&(!best||T.s>best.s))best={...T,cls:c2};
          if(!lost){const C=L.find(q=>q.e.id===main.target.id);if(C&&(!cur||C.s>cur.s))cur={...C,cls:c2};}}
        if(cur&&best&&best.e.id!==cur.e.id&&best.s<cur.s+2)best=cur;main.target=best?{id:best.e.id,isB:best.isB,cls:best.cls}:null;}
      // (sans cible : vers le tireur qui vient de frapper l'engin — mesuré, un affût au repos vers l'arrière mettait 0,8 h à tirer son premier coup
      // contre des fusiliers déjà en joue ; il tourne pendant qu'on le repère)
      const tg=main.target&&(main.target.isB?this.building(main.target.id):this.unit(main.target.id));
      if(!tg){const T=v.threat;if(T&&this.s.t-T.t<.6&&!v.comp?.[piece]){const hf=A0.arc>=360?Math.PI:A0.arc/2*D2R,w0=clamp(wrap(T.a-v.h-(A0.repos||0)),-hf,hf)+(A0.repos||0),r0=A0.tour*D2R*this.dts;
        const ny0=wrap(main.yaw+clamp(wrap(w0-main.yaw),-r0,r0));for(const i of idx)v.mounts[i].yaw=ny0;}continue;}
      const [tx,ty]=main.target.isB?(()=>{const [w,h]=this.sizeOf(tg);return [tg.i+w/2,tg.j+h/2];})():[tg.x,tg.y];
      // pointer : la pièce tourne à sa vitesse ; une casemate (débattement court) : la caisse pivote vers la cible si l'engin est arrêté
      const R0=A0.repos||0;let want=wrap(Math.atan2(ty-from.by,tx-from.bx)-v.h-R0);const half=A0.arc>=360?Math.PI:A0.arc/2*D2R;   // (V12.8 : autour de la direction de repos — un sponson regarde son flanc)
      if(Math.abs(want)>half){if(v.state!=='go'&&V.roues==='chenilles'&&!V.nav){const pr=V.pivot*D2R*this.dts;v.h=wrap(v.h+clamp(want,-pr,pr));want=wrap(Math.atan2(ty-from.by,tx-from.bx)-v.h-R0);}want=clamp(want,-half,half);}want+=R0;
      const rate=(v.comp?.[piece]?0:A0.tour*D2R)*this.dts;const err=wrap(want-main.yaw);const ny=wrap(main.yaw+clamp(err,-rate,rate));for(const i of idx)v.mounts[i].yaw=ny;
      const R=d2(tx,ty,from.bx,from.by);const el=Math.atan2((W0.at(R*TILE).drop||0),R*TILE)+(main.target.isB?.02:0);for(const i of idx)v.mounts[i].el+=(el-v.mounts[i].el)*Math.min(1,this.dts*2);
      if(Math.abs(wrap(want-ny))>.035||Math.abs(wrap(Math.atan2(ty-from.by,tx-from.bx)-v.h-ny))>.05)continue;
      // tirer : chaque arme de la pièce (la coaxiale ne prend que l'infanterie dans l'axe du canon)
      for(const i of idx){const m=v.mounts[i],A=V.armes[i],W=this.W(m.w);if(!W||m.broken)continue;let e=tg,isB=main.target.isB;const ci=this.vehClass(W);
        // chaque arme ne tire que sur ce qui lui convient : le canon sur la cible choisie pour lui, la mitrailleuse sur des hommes (pas sur des murs)
        if(!A.coax&&(ci==='canon'&&main.target.cls!=='canon'||ci==='mg'&&isB))continue;
        if(A.coax){const T=this.vehTargets(v,V,'mg',{x:from.bx,y:from.by},range,true).find(q=>!q.isB&&Math.abs(wrap(Math.atan2(q.e.y-from.by,q.e.x-from.bx)-v.h-ny))<.07);if(!T)continue;e=T.e;isB=false;}
        else if(i!==idx[0]&&!A.jumelle)continue;
        this.vehShoot(v,V,m,A,W,e,isB,g,loader);}}},
  // un coup (ou le rechargement) d'une arme montée — la même balistique que l'infanterie ; sur un affût stable, des rafales de dix et une remise en
  // joue courte (mesuré : par rafales de six, une double mitrailleuse lourde tirait 48 coups en 16 secondes de combat)
  vehShoot(v,V,m,A,W,e,isB,g,loader){if(m.reload>0||m.cool>0)return;
    if(m.mag<=0){if(m.pouch>0){const n=Math.min(W.p.mag||1,m.pouch);m.mag=n;m.pouch-=n;const cls=this.vehClass(W);m.reload=(cls==='canon'?(loader?3:6):W.p.mag>12?4:2.5);m.burst=0;return;}m.dry=true;return;}
    m.dry=false;const mz=this.vehMuzzle(v,A,m.yaw);const [tx,ty]=isB?(()=>{const [w,h]=this.sizeOf(e);return [e.i+w/2,e.j+h/2];})():[e.x,e.y];
    const S={id:v.id,f:v.f,x:mz.x,y:mz.y,k:'soldat',xp:g?.xp||0,post:'couche',supp:v.supp||0,h:g?.h,armor:null,moved:v.spd>.5?this.s.t:-9,mount:true,fx:Math.cos(v.h+m.yaw),fy:Math.sin(v.h+m.yaw),w:m.w};
    // (une arme montée — pivot, tourelle, viseur, servant déjà en place — pointe en 0,3 du temps du fantassin : mesuré, à 0,5 la mitrailleuse d'une
    // jeep, pivot compris, tirait après 0,8 h)
    // (passer à la cible voisine ne demande qu'un petit pointage : le temps suit l'angle à rattraper — mesuré, la pièce refaisait une visée complète
    // pour le Bèè d'à côté, et le servant tombait avant le coup suivant)
    if(m.aimAt!==(e.id??'b')){const aA=Math.atan2(ty-mz.y,tx-mz.x),da=m.aimA==null?9:Math.abs(wrap(aA-m.aimA));m.aimAt=e.id??'b';m.aimA=aA;m.cool=W.aim*.3*clamp(.25+da/.35,.25,1)*this.fireJitter(.25);return;}
    m.mag--;const auto=ACT[W.p.action]?.auto;if(auto){m.burst=(m.burst||0)+1;if(m.burst>=(m.burstN||=8+Math.floor(this.rand()*5))){m.burst=0;m.burstN=0;m.cool=W.aim*.35*this.fireJitter(.15);}else m.cool=W.cyc*this.fireJitter(.04);}else{m.burst=0;m.cool=(W.cyc+W.aim*.3)*this.fireJitter(.15);}   /* (V12.5 : rafales de 8 à 12, le décalage des tirs) */
    const Rm=d2(tx,ty,mz.x,mz.y)*TILE;const fl=W.at(Rm);const share={};let ix=tx,iy=ty;
    for(let k=0;k<(isB?1:(W.pel||1));k++){const res=isB?{hit:true,struct:true,v:fl.v}:this.resolve(S,e,W,Rm,m.burst||0,share);[ix,iy]=res.hit?[tx,ty]:[res.px??tx,res.py??ty];
      this.s.shots.push({kind:'round',f:v.f,by:v.id,w:m.w,x0:mz.x,y0:mz.y,x1:ix,y1:iy,t:0,dur:Math.max(.01,fl.t)/HOUR_REAL,res,target:isB?{b:e.id}:{u:e.id},R:Rm,tracer:auto?((m.tr=(m.tr||0)+1)%4===0):false});}
    this.shotNoise(S,W,ix,iy);v.firedAt=this.s.t;
    this.emit({type:'shot',by:v.id,veh:v.id,mount:m.id,x:mz.x,y:mz.y,z:mz.z,x1:ix,y1:iy,f:v.f,cal:W.p.d,v0:W.v0,dB:S.lastDb,E:W.E0,sup:W.vTop>340,tr:auto?m.tr%4===0:true,flash:W.flash,he:!!W.he,action:W.p.action,feed:W.p.feed||'',barrels:W.barrels||1,rof:W.rpm,caseMat:W.caseless?null:(W.p.caseMat||'laiton'),eject:!W.rocket&&W.p.action!=='verrou'});},
  // le ravitaillement : à l'arrêt près d'un de nos dépôts (5 cases), chaque arme refait le plein de coups (des caisses de ses munitions)
  vehResupply(v,V){if(v.state==='go'||this.s.t<(v.supT||0))return;v.supT=this.s.t+.5;
    for(let i=0;i<v.mounts.length;i++){const m=v.mounts[i],A=V.armes[i],W=this.W(m.w);if(!W||!(W.perCrate>0))continue;const want=A.coups-(m.mag+m.pouch);if(want<W.perCrate*.5&&m.mag+m.pouch>0)continue;
      // (l'arme se charge tout de suite : un engin ravitaillé est prêt à tirer — recharger une bande, c'est quatre secondes de combat, une heure de jeu)
      const crates=Math.max(1,Math.floor(want/W.perCrate));let got=this.take(v.f,v.x,v.y,'m:'+m.w,crates,5);
      // (V12.8) un engin conçu : ses armes sont à lui, aucun arsenal n'en fait les caisses d'avance — il les fait au dépôt avec les matières
      // de leur recette (la même qu'à l'arsenal : poudre, plomb, cuivre, fer), autant que le dépôt en a
      if(got<crates&&V.engin){const R=this.recipe({f:v.f,i:v.x,j:v.y},'m:'+m.w);if(R){const H=this.have(v.f,v.x,v.y,5);let n=crates-got;
        for(const [k,q] of Object.entries(R.in))if(q>0)n=Math.min(n,Math.floor((H[k]||0)/q+1e-9));if(n>0){for(const [k,q] of Object.entries(R.in))if(q>0)this.take(v.f,v.x,v.y,k,q*n,5);got+=n;}}}
      if(got>0){m.pouch+=Math.round(got*W.perCrate);const n=Math.min(Math.max(0,(W.p.mag||1)-m.mag),m.pouch);m.mag+=n;m.pouch-=n;}}},
  // ---------- le blindage ----------
  // Ce que vaut un engin comme cible pour un tireur : l'antichar le prend avant tout ; une arme légère seulement si elle peut percer sa face la plus
  // mince à cette distance (une jeep, oui ; un char, non — on ne gâche pas ses cartouches sur de l'acier)
  vehThreatFor(u,v,d,r){const W=u.w&&this.W(u.w);if(!W)return -9;const V=VEHDEF[v.k];{const k=this.atKind?.(u.w);if(k==='lrac'&&d>this.atFireMax(W,k))return -9;}   /* (V12.8 : le lance-roquettes ne tire que de près) */const at=W.p.action==='verrou'&&W.p.d>=4||!!CONS_SHAPED(W);
    const thin=Math.min(...Object.entries(V.blindage).filter(([k])=>k!=='dessus').map(([,b])=>b[0]));const pen=W.pen(W.at(d*TILE).v);
    return (at?14:pen>thin*1.15?6:-6)-d/Math.max(1,r)*3;},
  // Un coup au but sur un engin : la face (selon d'où il vient ; la tourelle s'il frappe haut et que l'engin en a une, orientée selon son pointage),
  // l'obliquité (l'angle horizontal composé avec l'inclinaison de la plaque), l'épaisseur effective t / cos(obliquité) ; puis :
  //  le ricochet : au-delà d'un angle critique (68° à 80° selon l'épaisseur rapportée au calibre ; un gros calibre « écrase » une plaque mince)
  //  la non-perforation : la plaque arrête tout (étincelles)
  //  la perforation : la vitesse qui reste ; le projectile et des éclats de la plaque dans l'habitacle (les mêmes blessures que dehors) ; un obus
  //  explosif qui perce éclate dedans ; des organes touchés selon la face (moteur, train, tourelle, arme) ; parfois le feu ; les dégâts à la caisse
  // (V12.8) LA BALISTIQUE 3D d'un engin conçu : le rayon du tir contre les vraies plaques de la conception (blindage3d.js) — l'angle d'incidence exact,
  // le ricochet, la perforation (notre formule : W.pen(v) contre l'épaisseur vue t / cos i ; la charge creuse perce selon son calibre, pas sa vitesse),
  // puis, s'il perce, son trajet dans l'habitacle : le Meumeu assis à ce poste, le râtelier (qui peut exploser), le moteur, l'essence (le feu) ; et le
  // cône d'éclats arrachés à la face intérieure, chacun son rayon. Un tir qui ne rencontre aucune plaque est passé à côté.
  vehImpact3D(v,V,r,W,sh){const D=deriveVeh(V.engin.v),kcm=100/(VEH_VIS*TILE);const a=Math.atan2(v.y-sh.y0,v.x-sh.x0),rel=wrap(a-v.h);
    const yaw=[];V.armes.forEach((A,i)=>{const m=/^tourelle(\d+)$/.exec(A.piece||'');if(m)yaw[+m[1]]=v.mounts[i]?.yaw||0;});
    const {O,d}=shotRay(rel,(r.ex||0)*kcm,(r.ey??(r.H||1)*.45)*kcm,(this.rand()-.5)*.03);const hits=rayPlates(O,d,platesAt(D,yaw));const ent=hits.find(h=>h.enter);
    const hx=v.x-Math.cos(a)*.5,hy=v.y-Math.sin(a)*.5;
    if(!ent){this.emit({type:'impact',x:v.x+Math.cos(a)*(.8+this.rand()),y:v.y+Math.sin(a)*(.8+this.rand()),hit:false,small:true,mat:'terre'});return 'manqué';}
    // un équipage découvert (caisse ouverte, tourelle ouverte) : le haut du corps dépasse — touché avant toute plaque
    const crew=(v.crew||[]).filter(u=>u.hp>0),seats=seatsOf(D,crew);const vel=r.v;
    const pre=rayMods(O,d,D.mods.filter(m=>m.kind==='equipage'||m.kind==='passager'),0,ent.s)[0];
    if(pre){const us=seats.get(pre.m.id)||[];const u=us[(this.rand()*us.length)|0];if(u){this.vehCrewHit(v,u,W.proj||W,vel,'balle par-dessus le bord',sh.by);v.hitAt=this.s.t;return 'découvert';}}
    const P=ent.P,t=P.t||0,cosI=Math.max(.06,ent.cosI),obl=Math.acos(cosI),te=t/cosI,shaped=!!W.he?.shaped,pen=W.pen(vel),cal=W.p.d||2;const where=P.label||'la caisse';
    v.hitAt=this.s.t;v.threat={a:Math.atan2(sh.y0-v.y,sh.x0-v.x),t:this.s.t};v.lastHit={face:P.id,t,obl:Math.round(obl/D2R),te:+te.toFixed(2),pen:+pen.toFixed(2),part:P.part};
    const card=o=>({veh:v.id,vf:v.f,vname:v.name,shooter:sh.by,w:sh.w,R:sh.R,where,face:P.id,part:P.part,t,slope:P.a||0,obl:obl/D2R,te,pen,v:vel,cal,m:W.m||10,he:!!W.he,shaped,y:ent.X[1],...o});
    if(t>0){// le ricochet : au-delà d'un angle critique (68° à 80° selon l'épaisseur rapportée au calibre) ; une charge creuse ne glisse qu'en rasant (fusée qui ne mord pas)
      const crit=(68+12*Math.min(1,t/Math.max(.1,cal)))*D2R;const pr=shaped?(obl>78*D2R?.5:0):clamp((obl-crit+6*D2R)/(12*D2R),0,1)*(cal>t*3?.3:1);
      if(this.rand()<pr){v.lastHit.out='ricochet';this.emit({type:'ricochet',x:hx,y:hy,veh:v.id,f:v.f,ang:a+Math.PI*.5*(this.rand()<.5?1:-1)*(.3+this.rand()*.4),v:vel,card:card({out:'ricochet'})});return 'ricochet';}
      if(pen<=te){v.lastHit.out='arrêté';v.hp-=Math.min(.6,.5*(W.m||10)/1000*vel*vel/4000)+(shaped?4:0);this.emit({type:'plate',x:hx,y:hy,veh:v.id,mat:'acier',where,card:card({out:'arrêté'})});
        // un obus explosif qui ne perce pas éclate contre la plaque : le souffle et les éclats dehors (l'équipage découvert, la caisse, les roues)
        if(W.he&&!shaped)this.heBlast(hx,hy,W.he,sh.f,sh.by,{kind:'obus',w:sh.w,at:null});
        return 'arrêté';}}
    // percé : ce qui reste au projectile (la charge creuse : son jet, d'autant plus vif qu'il lui restait à percer)
    v.lastHit.out='percé';const v2=shaped?Math.min(1500,500+1000*(1-te/Math.max(.01,pen))):t>0?vel*Math.sqrt(Math.max(0,1-(te/pen)**2)):vel;v.lastHit.v2=Math.round(v2);
    const exit=hits.find(h=>!h.enter&&h.s>ent.s+.1),path=rayMods(O,d,D.mods,ent.s,exit?exit.s:ent.s+600);const seen=[];let vcur=v2,boom=null;
    const proj=shaped?null:(W.proj||W),E=v=>.5*(W.m||10)/1000*v*v;
    if(W.he&&!shaped){// l'obus explosif qui perce éclate dans l'habitacle : sa masse en morceaux, tout le monde à bord en reçoit ; un râtelier peut partir
      v.hp-=40+E(v2)/30+W.he.g*3;const fm=Math.max(.05,(W.m||60)/30),fd=Math.max(1,cal/6);
      for(const u of crew){const k=1+this.poisson(1.5);for(let n=0;n<k&&u.hp>0;n++)if(this.rand()<.6)this.vehCrewHit(v,u,fragDesign(fm*(.4+this.rand()*1.2),fd),700+this.rand()*400,'obus éclaté dans l’habitacle',sh.by);}
      if(D.mods.some(m=>m.kind==='munitions')&&this.rand()<.35)boom=D.mods.find(m=>m.kind==='munitions');if(this.rand()<.35)v.fire=Math.max(v.fire||0,2);seen.push('l’obus éclate dedans');}
    else for(const h of path){if(vcur<60)break;const m=h.m;
      if(m.kind==='equipage'||m.kind==='passager'){const us=seats.get(m.id)||[];const u=us[(this.rand()*us.length)|0];seen.push(m.label+(u?'':' (vide)'));
        if(u&&u.hp>0){this.vehCrewHit(v,u,shaped?fragDesign(.4+this.rand(),1.6):proj,vcur*(shaped?1:.9),shaped?'jet de la charge creuse':'balle à travers la tôle',sh.by);vcur*=shaped?.75:.45;}}
      else if(m.kind==='munitions'){seen.push(m.label);const pd=shaped?.6:Math.min(.25,E(vcur)/2500);if(this.rand()<pd){boom=m;break;}vcur*=.4;}
      else if(m.kind==='moteur'){seen.push('le moteur');(v.comp??={}).moteur=true;vcur*=.25;}
      else if(m.kind==='essence'){seen.push(m.label);if(this.rand()<(shaped?.5:CONS_INC(W)?.6:.15))v.fire=Math.max(v.fire||0,2);vcur*=.6;}
      else{seen.push(m.label);vcur*=.5;}}
    // le cône d'éclats de la face intérieure : d'autant plus nombreux que la plaque était épaisse pour ce projectile ; plus large et plus dense pour un jet
    const nf=shaped?Math.round(6+4*Math.min(3,(pen-te)/Math.max(.5,t))):t>0?Math.round(.5+3*(te/pen)*Math.min(2,1+t)):0,plug=7.85e-3*Math.PI*(cal/2)**2*te;let fhits=0;
    for(let n=0;n<nf;n++){const dd=inCone(d,shaped?.8:.6,()=>this.rand());const h=rayMods(ent.X,dd,D.mods,.5,140)[0];if(!h)continue;const m=h.m,vf=v2*(.4+this.rand()*.5);
      if(m.kind==='equipage'||m.kind==='passager'){const us=seats.get(m.id)||[];const u=us[(this.rand()*us.length)|0];if(u&&u.hp>0){fhits++;this.vehCrewHit(v,u,fragDesign(Math.max(.002,plug/Math.max(1,nf)*(.5+this.rand())),Math.max(.3,cal*(.15+this.rand()*.25))),vf,shaped?'éclat du jet':'éclat de blindage',sh.by);}}
      else if(m.kind==='munitions'&&!boom&&this.rand()<(shaped?.12:.03))boom=m;else if(m.kind==='essence'&&this.rand()<.05)v.fire=Math.max(v.fire||0,1.5);}
    if(!W.he)v.hp-=E(v2)/45+(shaped?30+(pen-te)*3:0);
    // la tourelle percée : sa couronne se bloque parfois ; un tir dans le masque peut casser l'arme ; un flanc bas percé, le train de roulement
    if(P.part==='tourelle'&&this.rand()<.25)(v.comp??={}).tourelle=true;
    if(P.part==='tourelle'&&P.k==='av'&&this.rand()<.3){const ms=v.mounts.filter((m,i)=>V.armes[i].piece==='tourelle'+P.ti&&!m.broken);if(ms.length)ms[(this.rand()*ms.length)|0].broken=true;}
    if(P.part==='caisse'&&/^fl/.test(P.id)&&ent.X[1]<D.G.y0+D.v.H*.35&&(shaped||E(vel)>150)&&this.rand()<.4)(v.comp??={}).train=true;
    this.emit({type:'pierce',x:hx,y:hy,veh:v.id,where,card:card({out:'percé',v2,crew:crew.length,nf,fhits,path:seen.slice(0,6),boom:!!boom})});
    if(boom){// le râtelier explose : l'engin est perdu, l'équipage avec lui (presque)
      v.ammoBoom=true;for(const u of crew)if(u.hp>0)for(let k=0;k<3&&u.hp>0;k++)this.vehCrewHit(v,u,fragDesign(2+this.rand()*6,4),600+this.rand()*500,`les munitions ont explosé (${boom.label})`,sh.by);
      this.emit({type:'boom',kind:'shell',x:v.x,y:v.y,f:v.f});this.log('Front',`${v.name} : ${boom.label.toLowerCase()} touché — les munitions explosent.`,v.f==='meumeu'?'bad':'good');v.hp=0;v.fire=Math.max(v.fire||0,6);}
    if(v.fire>0&&!v.bailed&&v.hp>0){v.bailed=true;this.vehUnboard(v,'tous');this.log('Front',`${v.name} brûle : l’équipage saute à terre.`,'bad');}
    if(v.hp<=0)this.vehDestroyed(v,boom?'munitions explosées':shaped?'charge creuse':'perforé');return 'percé';},
  vehImpact(v,r,W,sh){const V=VEHDEF[v.k];if(v.hp<=0)return;if(V.engin)return this.vehImpact3D(v,V,r,W,sh);const a=Math.atan2(v.y-sh.y0,v.x-sh.x0);
    const tm=v.mounts.find((m,i)=>V.armes[i].piece==='tourelle');const tur=!!V.blindage.tourelle&&r.ey>r.H*.6;const ref=tur?v.h+(tm?.yaw||0):v.h;
    // la face : vu de trois quarts, un engin montre l'avant (ou l'arrière) et un flanc à la fois ; le coup tombe sur l'une ou l'autre au prorata de la
    // surface que chacune présente (largeur·|cos|, longueur·|sin|) — le flanc vu presque de profil est touché sous un angle rasant, et ricoche
    // (mesuré : en choisissant la face par quadrant, l'obliquité horizontale ne dépassait jamais 45°, et rien ne ricochait jamais)
    const rel=wrap(a-ref),ar=Math.abs(rel),Lf=tur?1:V.long,Wf=tur?1:V.large,pc=Wf*Math.abs(Math.cos(rel)),ps=Lf*Math.abs(Math.sin(rel));let face,oh;
    if(this.rand()*(pc+ps)<ps){face='flanc';oh=Math.abs(ar-Math.PI/2);}else if(ar<Math.PI/2){face='arriere';oh=ar;}else{face='avant';oh=Math.PI-ar;}
    const key=tur?(face==='avant'||!V.blindage.tourelle_flanc?'tourelle':'tourelle_flanc'):face;const [t,slope]=V.blindage[key]||[0,0];
    const cosO=Math.max(.06,Math.cos(oh)*Math.cos(slope*D2R)),obl=Math.acos(cosO),te=t/cosO;const vel=r.v,pen=W.pen(vel),cal=W.p.d||2;
    const hx=v.x-Math.cos(a)*.5,hy=v.y-Math.sin(a)*.5;const where=tur?'la tourelle':face==='avant'?'l’avant':face==='arriere'?'l’arrière':'le flanc';
    v.hitAt=this.s.t;v.threat={a:Math.atan2(sh.y0-v.y,sh.x0-v.x),t:this.s.t};v.lastHit={face:key,t,obl:Math.round(obl/D2R),te:+te.toFixed(2),pen:+pen.toFixed(2)};
    // (V12.8) la fiche du coup pour la radiographie de la plaque : la face, l'épaisseur et son inclinaison, l'obliquité, ce que le projectile perce
    const card=o=>({veh:v.id,vf:v.f,vname:v.name,shooter:sh.by,w:sh.w,R:sh.R,where,face:key,t,slope,obl:obl/D2R,te,pen,v:vel,cal,m:W.m||10,he:!!W.he,...o});
    if(t>0){const crit=(68+12*Math.min(1,t/Math.max(.1,cal)))*D2R;const pr=clamp((obl-crit+6*D2R)/(12*D2R),0,1)*(cal>t*3?.3:1);
      // (la balle repart réfléchie sur la normale de la face quand c'est l'angle horizontal qui la fait glisser ; sur une plaque inclinée vue de face,
      // elle saute par-dessus et continue presque droit)
      if(this.rand()<pr){v.lastHit.out='ricochet';const nA=face==='avant'?ref:face==='arriere'?ref+Math.PI:Math.cos(ref+Math.PI/2-a)<0?ref+Math.PI/2:ref-Math.PI/2;
        this.emit({type:'ricochet',x:hx,y:hy,veh:v.id,f:v.f,ang:oh>Math.PI/4?Math.PI+2*nA-a:a+(this.rand()-.5)*.3,v:vel,card:card({out:'ricochet'})});return;}
      if(pen<=te){v.lastHit.out='arrêté';v.hp-=Math.min(.6,.5*(W.m||10)/1000*vel*vel/4000);this.emit({type:'plate',x:hx,y:hy,veh:v.id,mat:'acier',where,card:card({out:'arrêté'})});return;}}
    // percé
    const v2=t>0?vel*Math.sqrt(Math.max(0,1-(te/pen)**2)):vel,E2=.5*(W.m||10)/1000*v2*v2;v.lastHit.out='percé';v.lastHit.v2=Math.round(v2);
    const crew=(v.crew||[]).filter(u=>u.hp>0);this.emit({type:'pierce',x:hx,y:hy,veh:v.id,where,card:card({out:'percé',v2,crew:crew.length,nf:t>0?Math.round(.5+3*(te/pen)*Math.min(2,1+t)):0})});const open=(V.blindage.dessus?.[0]||0)<.05;
    // l'obus explosif qui perce éclate dans l'habitacle
    // (des éclats de l'obus lui-même : sa masse en une trentaine de morceaux ; chacun à bord en reçoit un ou plusieurs dans l'espace clos)
    if(W.he&&!W.he.shaped){v.hp-=40+E2/30+W.he.g*3;const fm=Math.max(.05,(W.m||60)/30),fd=Math.max(1,cal/6);
      for(const u of crew){const k=1+this.poisson(1.5);for(let n=0;n<k&&u.hp>0;n++)if(this.rand()<.6)this.vehCrewHit(v,u,fragDesign(fm*(.4+this.rand()*1.2),fd),700+this.rand()*400,'obus éclaté dans l’habitacle',sh.by);}
      if(this.rand()<.35)v.fire=Math.max(v.fire||0,2);}
    else{v.hp-=E2/45;
      // le projectile lui-même : un homme sur sa trajectoire — chacun couvre une part de la silhouette (assis bas dans une caisse fermée : 15 % ;
      // découvert, le buste dépasse : 20 %) ; mesuré : l'ancienne somme (0,2 + 0,17 par homme) donnait 74 % pour deux hommes, 85 % dès trois
      if(crew.length&&this.rand()<1-Math.pow(1-(open?.2:.15),crew.length))this.vehCrewHit(v,crew[(this.rand()*crew.length)|0],W.proj||W,v2*.85,'balle à travers la tôle',sh.by);
      // les éclats arrachés à la plaque : d'autant plus nombreux que la plaque était épaisse pour ce projectile
      // (le bouchon d'acier que le projectile découpe — π(calibre/2)²·épaisseur, 7,85 g/cm³ — part en morceaux à une fraction de sa vitesse restante)
      const nf=t>0?Math.round(.5+3*(te/pen)*Math.min(2,1+t)):0,plug=7.85e-3*Math.PI*(cal/2)**2*te;
      for(let n=0;n<nf;n++){const u=crew[(this.rand()*crew.length)|0];if(u&&u.hp>0&&this.rand()<.3)this.vehCrewHit(v,u,fragDesign(Math.max(.002,plug/nf*(.5+this.rand())),Math.max(.3,cal*(.15+this.rand()*.25))),v2*(.5+this.rand()*.4),'éclat de blindage',sh.by);}
      if(CONS_INC(W)&&this.rand()<.12)v.fire=Math.max(v.fire||0,1.5);}
    // les organes : selon la face ; une balle n'en abîme un que selon l'énergie qui lui reste (mesuré : à 22 % par balle quelle qu'elle soit, la
    // première salve de fusils cassait la mitrailleuse d'une jeep — une balle de 33 J aussi sûrement qu'un obus)
    if(this.rand()<(W.he?.6:Math.min(.22,E2/1500))){const c=v.comp??={};
      if(face==='arriere')c.moteur=true;else if(face==='flanc'&&!tur&&this.rand()<.6)c.train=true;else if(tur&&this.rand()<.5)c.tourelle=true;
      else{const ok=v.mounts.filter(m=>!m.broken);if(ok.length)ok[(this.rand()*ok.length)|0].broken=true;}}
    // le feu : l'équipage sort (et s'expose)
    if(v.fire>0&&!v.bailed){v.bailed=true;this.vehUnboard(v,'tous');this.log('Front',`${v.name} brûle : l’équipage saute à terre.`,'bad');}
    if(v.hp<=0)this.vehDestroyed(v,W.he?'obus':'perforé');},
  // Une charge qui éclate près d'un engin (heBlast) : la distance comptée depuis la caisse ; les éclats qui frappent la caisse la percent ou non
  // (la même pénétration que sur un gilet) ; un équipage découvert (la jeep) les prend aussi par-dessus le bord, assis ; le souffle tout près abîme
  // la caisse et les roues, et tue l'équipage découvert comme un homme à terre.
  vehBlast(v,x,y,E,by,Df,Rmax){const V=VEHDEF[v.k];const dc=d2(v.x,v.y,x,y)*TILE,r=Math.max(.05,dc-Math.min(V.long,V.large)/2*TILE),rc=Math.max(.05,dc);if(r>Rmax)return;
    // (r : depuis la caisse, pour la caisse ; rc : depuis le centre, pour l'équipage assis autour du centre)
    const crew=(v.crew||[]).filter(u=>u.hp>0&&u.h),open=(V.blindage.dessus?.[0]||0)<.05,t=V.blindage.flanc[0];let hurt=0;
    const bev=(u,eff)=>this.emit({type:'blast',victim:u.id,vf:u.f,vk:u.k,name:u.name,x:v.x,y:v.y,dir:[v.x-x,v.y-y],r:rc,pk:E.pressure?.(rc)||0,W:E.W,eff,shooter:by,frag:'obus',post:'accroupi',veh:v.id});
    if(open)for(const u of crew){if(rc<E.blast){u.h.state='mort';u.h.cause='souffle de l’explosion';bev(u,'mort');this.death(u);hurt++;}
      else if(rc<E.inj){bev(u,'lesions');u.h.shock=Math.max(u.h.shock,30+this.rand()*60);if(u.h.state!=='hors'){u.h.state='hors';u.h.cause='souffle : poumons et tympans déchirés';this.stateChange(u,'hors');}hurt++;}}
    const a=Math.atan2(v.y-y,v.x-x),rel=wrap(a-v.h),halfW=(Math.abs(Math.cos(rel))*V.large+Math.abs(Math.sin(rel))*V.long)/2*TILE,H=(V.haut||Math.min(V.large*.8,1.1))*TILE;
    // (un éclat qui traverse la tôle touche un homme avec la probabilité surface du corps / surface de la caisse : l'équipage reçoit le même flux
    // qu'à terre, ralenti par la tôle ; si la caisse arrête les éclats, seul le haut du corps d'un équipage découvert reste exposé, par-dessus le bord)
    for(const c of E.cls||[]){const pen=vv=>5.5e-4*Math.pow(c.m,.7)*Math.pow(vv,1.43)/Math.pow(c.d,1.07);
      const vel=E.vg*Math.exp(-r/c.lam);if(vel>=40){const nH=Math.min(400,c.n*E.geo/(4*Math.PI*r*r)*2*halfW*H);v.hp-=nH*(pen(vel)>t?.05:.005);}
      const vc=E.vg*Math.exp(-rc/c.lam);if(vc<40)continue;const pc=pen(vc),through=pc>t,v2=through?vc*Math.sqrt(1-(t/pc)**2):vc;
      const A=EXPO.sol.accroupi*(through?1:open?.4:0);if(A>0)for(const u of crew){const k=Math.min(6,this.poisson(c.n*E.geo/(4*Math.PI*rc*rc)*A));
        for(let n=0;n<k&&u.hp>0;n++)if(this.vehCrewHit(v,u,Df(c),v2,through?'éclat à travers la caisse':'éclat',by))hurt++;}}
    // le souffle sur la caisse et les roues
    if(r<E.blast*2){v.hp-=(E.dmgB||40)*(open?.4:.15)*(1-r/(E.blast*2));if(r<E.blast&&this.rand()<.5)(v.comp??={}).train=true;}
    v.hitAt=this.s.t;if(hurt&&v.f==='meumeu')this.log('Front',`${v.name} : une explosion tout près, ${hurt} touché(s) à bord.`,'bad');
    if(v.hp<=0)this.vehDestroyed(v,'explosion');},
  // Détruit : l'épave reste ; ceux qui sont encore à bord s'en sortent ou non, blessés
  vehDestroyed(v,cause){if(v.dead)return;v.dead=true;v.hp=0;v.spd=0;v.state='idle';v.path=null;v.itin=null;if(VEHDEF[v.k]?.air){v.dead=false;this.airCrash(v,cause||'détruit');return;}
    if(VEHDEF[v.k]?.nav==='eau'){this.emit({type:'boom',kind:'shell',x:v.x,y:v.y,f:v.f});this.emit({type:'fire',x:v.x,y:v.y});this.boatSunk(v,cause);return;}
    for(const u of (v.crew||[]).filter(u=>u.hp>0))if(this.rand()<(v.fire>0?.6:.45))this.vehCrewHit(v,u,fragDesign(.6+this.rand(),1.5),350+this.rand()*350,`engin détruit (${cause})`);
    this.vehUnboard(v,'tous');this.emit({type:'boom',kind:'shell',x:v.x,y:v.y,f:v.f});this.emit({type:'fire',x:v.x,y:v.y});
    this.log('Front',`${v.name} est détruit (${cause}).`,v.f==='meumeu'?'bad':'good');},
  // ---------- l'équipage ----------
  // Monter : le premier à bord conduit, puis les servants des armes (un par poste : tourelle, affût, casemate ; un servant de plus recharge),
  // puis les passagers ; plein, on reste à terre. À bord, un Meumeu quitte la carte (comme à l'abri d'un bâtiment) : il est dans v.crew.
  vehSeats(v){const c=(v.crew||[]).filter(u=>u.hp>0);return {cond:c.filter(u=>u.vrole==='conducteur').length,serv:c.filter(u=>u.vrole==='servant').length,pass:c.filter(u=>u.vrole==='passager').length};},
  vehBoard(v,u){const V=VEDF(v),s=this.vehSeats(v);if(v.hp<=0)return null;const role=!s.cond?'conducteur':s.serv<V.places.servants?'servant':s.pass<(V.nav==='eau'?this.boatCap(v):V.places.passagers)?'passager':null;   /* (sur un bateau : la place que laissent les véhicules du pont) */if(!role)return null;
    const i=this.s.units.indexOf(u);if(i>=0)this.s.units.splice(i,1);this.uIndex.delete(u.id);if(u.sq&&this.leave)this.leave(u);
    Object.assign(u,{vrole:role,inVeh:v.id,task:null,path:null,goal:null,anim:'idle'});(v.crew??=[]).push(u);return role;},
  // Descendre : autour de l'engin, côté arrière d'abord (à l'abri de la caisse) ; « passagers » ne fait descendre qu'eux
  vehUnboard(v,who='tous'){const out=[];const c=Math.cos(v.h),s=Math.sin(v.h),V=VEDF(v);let n=0;
    v.crew=(v.crew||[]).filter(u=>u.hp>0);for(const u of [...v.crew]){if(who==='passagers'&&u.vrole!=='passager')continue;const a=Math.PI+(n%2?1:-1)*(.35+.3*Math.floor(n/2));n++;
      const [x,y]=this.freeSpot(v.x+Math.cos(v.h+a)*(V.long/2+.6),v.y+Math.sin(v.h+a)*(V.long/2+.6),4);
      v.crew.splice(v.crew.indexOf(u),1);Object.assign(u,{x,y,inVeh:null,vrole:null,task:null,path:null,goal:null,fx:-c,fy:-s});this.s.units.push(u);this.uIndex.set(u.id,u);out.push(u);}
    return out;},
  // la tâche « monter » : marcher jusqu'à l'engin, puis monter (à moins d'une demi-longueur de sa caisse)
  boardTick(u,T){const v=this.s.vehicles.find(o=>o.id===T.v);if(!v||v.hp<=0||!VEHDEF[v.k]){u.task=null;return;}const V=VEDF(v);
    if(d2(u.x,u.y,v.x,v.y)<V.long/2+.7){const r=this.vehBoard(v,u);if(!r){u.task=null;u.why='plus de place à bord';}return;}
    this.go(u,v.x,v.y);},
  // (le freinage glisse encore : jamais dans une case interdite — mesuré : sans ce garde-fou, une automitrailleuse finissait 166 pas dans un obstacle)
  vehBrake(v,V,dt){const dec=V.vmax/Math.max(.2,V.frein)*HOUR_REAL;v.spd=Math.max(0,v.spd-dec*dt);v.yawRate=0;if(v.spd>0){const s=v.dir||1,N=this.N,nx=v.x+Math.cos(v.h)*v.spd*s*dt,ny=v.y+Math.sin(v.h)*v.spd*s*dt;
    if(!this.vehFits(V,nx,ny,v.h,!this.vehFits(V,v.x,v.y,v.h,false,-.06),-.06)){v.spd=0;return;}v.x=nx;v.y=ny;}},
  // la fin du tronçon courant : le dernier point qui garde le sens du pas suivant (un rebroussement : on s'arrête, puis on repart dans l'autre sens)
  vehSegEnd(P,pi){const d=P[Math.min(P.length-1,pi+1)][2];let j=Math.min(P.length-1,pi+1);while(j<P.length-1&&P[j+1][2]===d)j++;return j;},
  // Le pilote : un point à suivre sur le tronçon (poursuite pure, regard d'autant plus loin qu'on va vite), la vitesse permise par le virage à venir et
  // par la distance d'arrêt (au bout du tronçon : l'arrivée ou un rebroussement), puis la mécanique — roues (bicyclette : lacet = v·sens/L·tan(braquage),
  // braquage inversé en marche arrière) ou chenilles (lacet direct, pivot sur place).
  vehDrive(v,V,dt){const P=v.path,N=this.N;const acc=V.vmax/Math.max(.3,V.t0)*HOUR_REAL,dec=V.vmax/Math.max(.2,V.frein)*HOUR_REAL;
    const e=this.vehSegEnd(P,v.pi),dir=P[Math.min(P.length-1,v.pi+1)][2]||1;
    // le point le plus proche sur le tronçon (on n'avance que), puis le point visé à la distance de regard, sans dépasser le bout du tronçon
    let best=v.pi,bd=1e9;for(let n=v.pi;n<Math.min(e,v.pi+8);n++){const q=this.segProj(v.x,v.y,P[n],P[n+1]);if(q.d<bd){bd=q.d;best=n;}}v.pi=best;v.dev=bd;
    // (en marche arrière, un regard plus court : le suivi à reculons est moins stable)
    const look=dir<0?.8:Math.max(1.1,.9+v.spd*.05);let tgt=P[e];{let left=look,n=best;const q=this.segProj(v.x,v.y,P[n],P[n+1]||P[n]);let cx=q.x,cy=q.y;
      while(n<e){const bx=P[n+1][0],by=P[n+1][1];const L=d2(cx,cy,bx,by);if(L>=left){tgt=[cx+(bx-cx)/L*left,cy+(by-cy)/L*left];break;}left-=L;cx=bx;cy=by;n++;}}
    let toEnd=d2(v.x,v.y,P[Math.min(e,best+1)][0],P[Math.min(e,best+1)][1]);for(let n=best+1;n<e;n++)toEnd+=d2(P[n][0],P[n][1],P[n+1][0],P[n+1][1]);
    // au bout du tronçon : l'arrivée, un rebroussement (à l'arrêt, on change de sens), ou la fin d'un morceau local qui n'est pas le but (on enchaîne
    // sur le suivant sans s'arrêter). À moins de 0,9 case du but, s'il faudrait un braquage impossible pour le toucher, on y est (mesuré : sans cela,
    // une jeep faisait un tour complet autour de son but). Le bout est atteint aussi quand on l'a dépassé (un tronçon court de marche arrière finit
    // sur un point que le rayon ne permet pas de toucher — mesuré : une automitrailleuse tournait autour à 5 cases du chemin).
    const last=e>=P.length-1,arrive=()=>{v.state='idle';v.path=null;v.itin=null;this.vehBrake(v,V,dt);};
    if(last&&P.fin&&d2(v.x,v.y,P[e][0],P[e][1])<.9&&Math.abs(wrap(Math.atan2(P[e][1]-v.y,P[e][0]-v.x)-(dir>0?v.h:v.h+Math.PI)))>.8){arrive();return;}
    // le but occupé par un engin arrêté : on s'arrête au plus près (deux engins envoyés au même endroit se rangent côte à côte)
    if(P.fin){const fin=P[P.length-1];for(const o of this.vehOthers(v,true)){const L2=(V.long+VEHDEF[o.k].long)/2;if(d2(o.x,o.y,fin[0],fin[1])<L2+.3&&d2(v.x,v.y,fin[0],fin[1])<L2+1.6&&d2(v.x,v.y,o.x,o.y)<L2+.8){arrive();return;}}}
    const pa=P[Math.max(v.pi,e-1)],pe=P[e],passed=best>=e-1&&(v.x-pe[0])*(pe[0]-pa[0])+(v.y-pe[1])*(pe[1]-pa[1])>=0&&d2(v.x,v.y,pe[0],pe[1])<1.2;
    if(toEnd<.3||passed||best>=e-1&&d2(v.x,v.y,P[e][0],P[e][1])<.3){if(last&&!P.fin){(v.diag??={}).rFin=(v.diag.rFin||0)+1;v.path=null;return;}if(last){arrive();return;}
      if(v.spd<.4){v.pi=e;v.spd=0;v.dir=P[Math.min(P.length-1,e+1)][2]||1;return;}this.vehBrake(v,V,dt);return;}
    v.dir=dir;const hr=dir>0?v.h:v.h+Math.PI;const want=Math.atan2(tgt[1]-v.y,tgt[0]-v.x),err=wrap(want-hr);
    // la vitesse permise : le virage à venir (courbure du tronçon), la distance d'arrêt, le terrain, la place libre devant ; en arrière, au pas
    const k=this.vehCurv(P,v.pi,3.5,e);const kc=clamp(Math.floor(v.y),0,N-1)*N+clamp(Math.floor(v.x),0,N-1);const ter=TERRAIN[this.G.terrain[kc]];
    let vt=(dir>0?V.vmax:Math.min(4,V.vmax*.25))*(TERRAIN_V[V.roues][ter?.k]??1)*(1-Math.min(.55,(this.crater[kc]||0)*.25));
    // (le virage : une accélération latérale v²·k bornée — une jeep à fond prend un virage de 8 cases, au rayon minimal elle roule au pas de course)
    if(V.roues==='roues')vt=Math.min(vt,Math.sqrt((V.alat||100)/Math.max(.02,k)),Math.abs(err)>.8?5:Infinity);
    // (les chenilles : le virage à venir se prend à la vitesse que permet le pivot, v·k ≤ ω — mesuré : sans cela, un automoteur prenait un virage de 57°
    // en deux cases sans ralentir, sortait de 0,6 case par l'extérieur et allait frotter le coin d'un char garé, figé 9 h)
    else vt=Math.min(vt,V.vmax*(1-Math.min(.85,Math.abs(err)/1.2)),Math.max(V.vmax*.55,V.pivot*D2R*HOUR_REAL*1.5/Math.max(.02,k)));
    if(!last||P.fin)vt=Math.min(vt,Math.sqrt(2*dec*Math.max(0,toEnd-.2)));
    if(dir>0){const gap=this.vehPathGap(v,V,P,e);if(gap<99)vt=Math.min(vt,Math.max(0,(gap-.4)*6));if(gap<.5&&v.spd<.2){v.waitT=(v.waitT||0)+dt;if(v.waitT>.8){v.waitT=0;this.vehReplan(v);return;}}else v.waitT=0;}
    v.spd=v.spd<vt?Math.min(vt,v.spd+acc*dt):Math.max(vt,v.spd-dec*dt);
    if(V.roues==='roues'){const L=V.long*.62,maxSt=Math.atan(L/V.r);const st=clamp(Math.atan2(2*L*Math.sin(err),look),-maxSt,maxSt)*(dir>0?1:-1);
      const sr=2.2*HOUR_REAL;v.steer+=clamp(st-v.steer,-sr*dt,sr*dt);v.yawRate=v.spd*dir/L*Math.tan(v.steer);
      // filet de sécurité (chemin de grille, sans marche arrière) : face à un mur ou le chemin derrière, une manœuvre en plusieurs temps — en avant
      // braqué à fond, en arrière braqué à l'opposé, jusqu'à faire face (mesuré : sans cela, une jeep adossée à un mur restait figée)
      if(!v.man&&Math.abs(err)>1.9&&v.spd<1.5&&!P.some(p=>p[2]<0))v.man={dir:-1,left:.8,n:0};
      if(v.man){const fwdFree=this.vehFits(V,v.x+Math.cos(v.h)*.5*dir,v.y+Math.sin(v.h)*.5*dir,v.h,false,-.06,this.vehOthers(v,false));if(Math.abs(err)<1.0&&fwdFree||v.man.n>9){const giveUp=v.man.n>9;v.man=null;if(giveUp&&v.goal){this.vehReplan(v);}return;}
        const M=v.man,sp=Math.min(4,V.vmax*.2)*M.dir,stl=(M.dir>0?1:-1)*Math.sign(err||1)*maxSt;v.steer=stl;
        const h2=wrap(v.h+sp/L*Math.tan(stl)*dt),bx=v.x+Math.cos(h2)*sp*dt,by=v.y+Math.sin(h2)*sp*dt;
        if(!this.vehFits(V,bx,by,h2,!this.vehFits(V,v.x,v.y,v.h,false,-.06),-.06)||M.left<=0){M.dir=-M.dir;M.left=.8;M.n++;}
        else{v.h=h2;v.x=bx;v.y=by;v.yawRate=sp/L*Math.tan(stl);M.left-=Math.abs(sp)*dt;}v.spd=0;v.odo+=sp*dt;return;}}
    else{const pr=V.pivot*D2R*HOUR_REAL;v.yawRate=clamp(err*3*HOUR_REAL,-pr,pr);if(Math.abs(err)>.9)v.spd=Math.min(v.spd,.6);}
    // (le nouveau cap se vérifie avec le pas : mesuré, un chenillé qui pivotait contre un autre engin gardait la rotation refusée et restait imbriqué)
    const h2=wrap(v.h+v.yawRate*dt),nx=v.x+Math.cos(h2)*v.spd*dir*dt,ny=v.y+Math.sin(h2)*v.spd*dir*dt;
    // jamais dans une case interdite (un dernier garde-fou : le chemin les évite déjà) ; bloqué : un nouveau chemin
    const relaxNow=!this.vehFits(V,v.x,v.y,v.h,false,-.06);if(!this.vehFits(V,nx,ny,h2,relaxNow,-.06,this.vehOthers(v,false))){v.spd=0;v.yawRate=0;
      // un autre engin dans l'emprise (pas le terrain) : on attend qu'il passe, puis un nouveau chemin qui le contourne s'il reste là
      if(this.vehFits(V,nx,ny,h2,relaxNow,-.06)){(v.diag??={}).rVeh=(v.diag.rVeh||0)+1;
        // (contre un engin ARRÊTÉ seulement : un pas de rechange tout droit, en avant puis en arrière, avant d'attendre — mesuré : un chenillé qui pivotait
        // vers son point de visée faisait entrer son flanc dans le coin d'un char garé, refusait le pas, recalculait le même chemin, et restait figé 9 h ;
        // le chemin, lui, passait : avancer droit d'abord, puis tourner)
        const all=this.vehOthers(v,false),moving=all.filter(o=>!(o.spd<.3||o.state!=='go'));
        if((v.altN||0)<40&&this.vehFits(V,nx,ny,h2,relaxNow,-.06,moving)){const st=Math.max(.6,Math.min(3,V.vmax*.2))*dt;
          for(const d of dir>0?[1,-1]:[-1,1]){const ax=v.x+Math.cos(v.h)*st*d,ay=v.y+Math.sin(v.h)*st*d;if(this.vehFits(V,ax,ay,v.h,relaxNow,-.06,all)){v.x=ax;v.y=ay;v.odo=(v.odo||0)+st*d;v.altN=(v.altN||0)+1;(v.diag.alt=(v.diag.alt||0)+1);return;}}}
        v.waitT=(v.waitT||0)+dt;if(v.waitT>.8){v.waitT=0;this.vehReplan(v);}return;}
      if(V.roues==='roues'&&!v.man){v.man={dir:-dir,left:.8,n:0};return;}v.stuckT=(v.stuckT||0)+dt;if(v.stuckT>.5){v.stuckT=0;this.vehReplan(v);}return;}
    v.h=h2;v.x=nx;v.y=ny;v.altN=0;
    // coincé (un autre engin, un trou) : on recalcule
    if(v.spd<.2&&vt>1){v.stuckT=(v.stuckT||0)+dt;if(v.stuckT>1.2){v.stuckT=0;if(v.goal)this.vehReplan(v);}}else v.stuckT=0;},
  vehRemainLocal(v){const P=v.path;let s=d2(v.x,v.y,P[Math.min(P.length-1,v.pi+1)][0],P[Math.min(P.length-1,v.pi+1)][1]);for(let n=v.pi+1;n<P.length-1;n++)s+=d2(P[n][0],P[n][1],P[n+1][0],P[n+1][1]);return s;},
  segProj(px,py,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],L2=vx*vx+vy*vy||1e-9;const t=clamp(((px-a[0])*vx+(py-a[1])*vy)/L2,0,1);const x=a[0]+vx*t,y=a[1]+vy*t;return {x,y,t,d:d2(px,py,x,y)};},
  vehRemain(v,P){let s=0,cx=v.x,cy=v.y;for(let n=v.pi+1;n<P.length;n++){s+=d2(cx,cy,P[n][0],P[n][1]);cx=P[n][0];cy=P[n][1];}return s;},
  // la courbure la plus forte sur les `span` prochaines cases du chemin (1/rayon)
  vehCurv(P,i0,span,end=P.length-1){let k=0,s=0;for(let n=Math.max(1,i0);n<end&&s<span;n++){const [a,b,c]=[P[n-1],P[n],P[n+1]];const l1=d2(a[0],a[1],b[0],b[1]),l2=d2(b[0],b[1],c[0],c[1]);s+=l1;if(l1<1e-6||l2<1e-6)continue;
      const t=Math.abs(wrap(Math.atan2(c[1]-b[1],c[0]-b[0])-Math.atan2(b[1]-a[1],b[0]-a[0])));k=Math.max(k,t/((l1+l2)/2));}return k;},
  // la place libre devant, LE LONG DU CHEMIN prévu (5 cases) : la distance au premier point où l'emprise toucherait un autre engin (mesuré : regardée
  // droit devant, un engin garé que le chemin contournait arrêtait l'engin avant son virage — 229 attentes)
  vehPathGap(v,V,P,e){const near=this.s.vehicles.filter(o=>o!==v&&VEHDEF[o.k]&&o.hp>0&&d2(o.x,o.y,v.x,v.y)<V.long+8);if(!near.length)return 99;let s=0,x=v.x,y=v.y;
    for(let n=v.pi;n<e&&s<5;n++){const [bx,by]=P[n+1];const L=d2(x,y,bx,by);const h=Math.atan2(by-y,bx-x);for(let q=.5;q<=L&&s+q<=5;q+=.5){const px=x+(bx-x)*q/L,py=y+(by-y)*q/L;
        if(!this.vehFits(V,px,py,h,true)||this.vehFits(V,px,py,h,false,-.06)&&!this.vehFits(V,px,py,h,false,-.06,near))return s+q-.5;}s+=L;x=bx;y=by;}return 99;},
  // la place libre devant : le plus proche autre engin dans le couloir de la caisse (distance le long du cap), 99 s'il n'y en a pas
  vehGap(v,V){let g=99;const cx=Math.cos(v.h),cy=Math.sin(v.h);for(const o of this.s.vehicles){if(o===v||!VEHDEF[o.k]||o.hp<=0)continue;const dx=o.x-v.x,dy=o.y-v.y;const along=dx*cx+dy*cy,side=Math.abs(-dx*cy+dy*cx);
      const W=(V.large+VEHDEF[o.k].large)/2+.15;if(along>0&&side<W){const L=along-(V.long+VEHDEF[o.k].long)/2;if(L>-.2&&L<g)g=L;}}return g;},
};

// les barges et bateaux bèè se construisent sur la plage comme des bâtiments : le chantier coûte et dure ce que coûte et dure le véhicule
for(const k of Object.keys(BUILDINGS))if(BUILDINGS[k].launch){const V=VEHDEF[BUILDINGS[k].launch];BUILDINGS[k].cost={...V.cout};BUILDINGS[k].hours=V.heures;BUILDINGS[k].hp=V.hp;}
