// Les engins (V12.8) : la conception d'un véhicule — châssis, caisse et ses plaques, moteur(s), réservoir, tourelles et leurs armes,
// mitrailleuse de caisse, râteliers à munitions, passagers, soute. Une seule géométrie sert le bureau des engins (la vue 3D en coupe),
// le dessin en jeu et la balistique (les plaques et les boîtes de l'habitacle), à la manière de Panzerfront — mais avec NOTRE balistique.
// L'échelle : celle des peluches (÷6, comme les armes) — un char moyen fait un mètre de long, son équipage de Meumeu de 30 cm y est assis.
// Masses ÷216, puissances ÷216 : les ch/t sont ceux d'un vrai engin. Le blindage en mm de peluche (le fusil perce 0,95 mm à 30 m).
// Repère de la caisse (cm) : z le long de l'engin (avant +, origine au milieu), x latéral (droite +), y la hauteur (0 = le sol).
// Rien n'est plafonné pour la fantaisie (un char géant à six tourelles se dessine) : c'est la physique qui fait payer — la masse, le volume
// du moteur, la vitesse, l'essence.
import {derive,CRATE_KG,kitToP} from './ballistics.js';
import {KIT_PRESETS} from './kitdata.js';
import {crateCost} from './designs.js';
import {BODY_KG} from './body.js';

export const VEH_VIS=2;            // à l'écran : cases par mètre de peluche (un Meumeu de 30 cm est dessiné ≈ 0,6 case)
export const K_V=2.5;              // vitesse de jeu (cases/h) = vitesse physique tout-terrain (m/s) × K_V — les fantassins vont ≈ 7 cases/h
export const K_ESS=67;             // consommation de jeu = consommation physique × K_ESS : la carte est petite, un char moyen fait ≈ 400 cases avec son plein
export const BIDON_L=.1;           // un bidon d'essence : 0,1 L de peluche (le jerrican de 20 L ÷ 216)
export const CAISSE_CM3=600;       // une caisse de la soute (ce qu'un Meumeu porte à deux mains : 250 g)
const STEEL=7.85,GRAV=9.81,RHO=1.2,D2R=Math.PI/180,ESS_KG_L=.74,SEAT={w:14,h:22,l:17},PASS={w:12,h:22,l:12};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),tan=a=>Math.tan(clamp(a,-80,80)*D2R),cos=a=>Math.cos(clamp(a,-85,85)*D2R);

// ---------- les châssis ----------
// L, W, H : la caisse (cm) [min, défaut, max] ; garde : la garde au sol ; train : roues, chenilles, semi (roues avant, chenilles arrière), losange
// (les chenilles font le tour de la caisse, 14-18) ; crr : la résistance au roulement en tout-terrain ; cap : la vitesse que le train supporte (m/s
// physiques) ; susp : la part de la masse en roulement et suspension ; charge : la masse que le train porte par cm² d'emprise (kg) — au-delà, il peine
// et casse ; pl : le blindage proposé {face:[mm, ° depuis la verticale]} ; pivot : chenilles, °/s de lacet de base
export const CHASSIS={
  jeep:{name:'Jeep',ere:'39-45',train:'roues',roues:4,moteurAv:true,sb:0,L:[35,55,90],W:[20,27,40],H:[10,15,26],garde:5,crr:.06,cap:14,susp:.12,charge:.012,ouvert:true,
    pl:{av:[.3,60],avb:[.3,30],fl:[.3,0],ar:[.3,10],toit:0,sol:.3},desc:'Légère et vive : une caisse ouverte, de la tôle. Le transport, la liaison, la mitrailleuse sur pivot.'},
  voiture14:{name:'Voiture blindée 14-18',ere:'14-18',train:'roues',roues:4,moteurAv:true,L:[55,80,120],W:[25,31,42],H:[18,26,38],garde:6,crr:.075,cap:9,susp:.13,charge:.014,
    pl:{av:[1.3,20],avb:[1,10],fl:[1,0],ar:[1,0],toit:.6,sol:.4},desc:'Un châssis de voiture de luxe sous une caisse rivetée, une tourelle ronde : rapide sur route, à la peine dans les champs.'},
  auto4:{name:'Automitrailleuse 4×4',ere:'39-45',train:'roues',roues:4,L:[55,78,120],W:[27,33,46],H:[16,24,36],garde:6,crr:.065,cap:13,susp:.13,charge:.016,
    pl:{av:[2.4,35],avb:[2,30],fl:[1.3,20],ar:[1.3,20],toit:.7,sol:.6},desc:'Basse, facettée, rapide : la reconnaissance. Peu de place, peu de poids admis.'},
  auto6:{name:'Automitrailleuse 6×6',ere:'39-45',train:'roues',roues:6,L:[75,100,150],W:[30,37,52],H:[18,27,40],garde:7,crr:.065,cap:12,susp:.14,charge:.017,
    pl:{av:[2.6,35],avb:[2,30],fl:[1.5,20],ar:[1.3,20],toit:.8,sol:.6},desc:'Six roues motrices : plus de charge et de place, toujours rapide.'},
  auto8:{name:'Automitrailleuse 8×8',ere:'39-45',train:'roues',roues:8,L:[90,115,170],W:[32,40,56],H:[20,29,42],garde:7,crr:.065,cap:12,susp:.15,charge:.019,
    pl:{av:[5,35],avb:[3,30],fl:[1.6,25],ar:[1.6,20],toit:1,sol:.8},desc:'Huit roues : la grande automitrailleuse, presque un char léger qui roule.'},
  camion:{name:'Camion',ere:'39-45',train:'roues',roues:6,moteurAv:true,sb:0,L:[70,100,170],W:[28,37,52],H:[22,33,50],garde:7,crr:.065,cap:11,susp:.14,charge:.02,ouvert:true,
    pl:{av:[.3,10],avb:[.3,0],fl:[.3,0],ar:[.3,0],toit:0,sol:.3},desc:'Le ravitaillement : une cabine et un plateau. Soute, réservoir, passagers — pas de blindage.'},
  charrette:{name:'Charrette',ere:'14-18',train:'roues',roues:2,moteurAv:true,sb:0,L:[50,85,130],W:[22,30,42],H:[14,20,32],garde:5,crr:.09,cap:3.2,susp:.08,charge:.01,ouvert:true,
    pl:{av:[.2,0],avb:[.2,0],fl:[.2,0],ar:[.2,0],toit:0,sol:.2},desc:'Deux roues et un brancard : des Meumeu la tirent. Lente, sans essence, une soute pour des caisses.'},
  semi:{name:'Semi-chenillé',ere:'39-45',train:'semi',roues:2,moteurAv:true,L:[70,98,150],W:[28,35,50],H:[20,28,40],garde:6,crr:.08,cap:9,susp:.17,charge:.022,ouvert:true,
    pl:{av:[2.4,30],avb:[2,25],fl:[1.3,20],ar:[1.3,20],toit:0,sol:.6},pivot:0,desc:'Des roues devant pour diriger, des chenilles derrière pour passer : le transport de troupes blindé.'},
  chenT:{name:'Transport chenillé',ere:'39-45',train:'chenilles',moteurAv:true,L:[55,90,160],W:[28,38,60],H:[16,24,40],garde:6,crr:.09,cap:9,susp:.19,charge:.028,pivot:42,ouvert:true,
    pl:{av:[1.6,30],avb:[1.6,20],fl:[1.2,10],ar:[1,0],toit:0,sol:.8},desc:'La chenillette : passe partout, ouverte, des bancs et une soute — le transport et le ravitaillement qui suivent les chars.'},
  chenL:{name:'Chenillé léger',ere:'39-45',train:'chenilles',L:[55,80,125],W:[28,36,52],H:[18,27,40],garde:6,crr:.09,cap:8,susp:.2,charge:.026,pivot:42,
    pl:{av:[5,20],avb:[4,20],fl:[2.5,0],ar:[2,10],toit:1.2,sol:1},desc:'Petit, bon marché, agile. Une tourelle légère.'},
  chenM:{name:'Chenillé moyen',ere:'39-45',train:'chenilles',L:[80,100,160],W:[38,48,66],H:[22,30,44],garde:7,crr:.09,cap:8,susp:.21,charge:.03,pivot:34,
    pl:{av:[13,10],avb:[13,15],fl:[5,0],ar:[3.3,10],toit:2,sol:1.7},desc:'Le cheval de bataille : une grosse tourelle, de la place, un bon moteur.'},
  chenH:{name:'Chenillé lourd',ere:'39-45',train:'chenilles',L:[95,120,200],W:[48,58,85],H:[26,36,52],garde:8,crr:.1,cap:7,susp:.22,charge:.04,pivot:26,
    pl:{av:[17,10],avb:[17,20],fl:[13,0],ar:[13,10],toit:4,sol:4},desc:'Une forteresse : il faut un moteur énorme, et il boit.'},
  geant:{name:'Char géant',ere:'fantaisie',train:'chenilles',L:[140,250,600],W:[70,105,220],H:[38,60,130],garde:10,crr:.11,cap:4,susp:.24,charge:.04,pivot:14,
    pl:{av:[20,20],avb:[20,25],fl:[12,0],ar:[10,10],toit:4,sol:4},desc:'Rien n’est trop grand : des tourelles partout. Le moteur prend une salle entière, l’essence part à seaux, il avance au pas.'},
  losange:{name:'Char losange 14-18',ere:'14-18',train:'losange',L:[90,135,220],W:[40,68,100],H:[34,42,64],garde:4,crr:.13,cap:2.5,susp:.18,charge:.03,pivot:10,fb:.5,
    pl:{av:[2,45],avb:[2,45],fl:[2,0],ar:[2,20],toit:1.2,sol:1.2},desc:'Les chenilles font le tour de la caisse : il franchit les tranchées, au pas. Les canons sont dans des sponsons sur les flancs.'},
};

// ---------- les moteurs ----------
// P : la puissance d'un moteur (W de peluche) [min, défaut, max] ; kgW : kg par W ; volW : le volume de son compartiment (cm³ par W, refroidissement
// et transmission compris) ; bsfc : la consommation spécifique (g par kWh — de charbon pour la vapeur) ; cout : par W ; feu : la part d'essence qui prend
export const MOTEURS={
  vapeur:{name:'Machine à vapeur',P:[20,300,8000],kgW:.016,volW:55,bsfc:2600,carbu:'charbon',cout:{fer:.012,pieces:.004},heures:.004,desc:'Une chaudière et des pistons : simple, lourde, énorme. Elle brûle du charbon, pas d’essence, et fume.'},
  bicyl:{name:'Bicylindre',P:[15,90,400],kgW:.0048,volW:20,bsfc:450,carbu:'essence',cout:{fer:.006,pieces:.012,cuivre:.0008},heures:.006,desc:'Petit, léger, bon marché : pour une jeep ou une voiture de liaison.'},
  bras:{name:'Traction (bras)',P:[20,40,80],kgW:.0004,volW:1.2,bsfc:0,carbu:'essence',cout:{bois:.004},heures:.001,desc:'Pas de moteur : des Meumeu tirent. Elle ne brûle ni essence ni charbon.'},
  quatre:{name:'Quatre cylindres',P:[60,250,900],kgW:.0038,volW:17,bsfc:400,carbu:'essence',cout:{fer:.005,pieces:.014,cuivre:.001},heures:.007,desc:'Le moteur de camion : robuste, sobre.'},
  six:{name:'Six cylindres en ligne',P:[150,700,2200],kgW:.0033,volW:15,bsfc:370,carbu:'essence',cout:{fer:.005,pieces:.016,cuivre:.0012},heures:.008,desc:'Le moteur des chars moyens : souple, endurant.'},
  v8:{name:'V8',P:[300,1100,3500],kgW:.0029,volW:13,bsfc:360,carbu:'essence',cout:{fer:.005,pieces:.019,cuivre:.0016},heures:.009,desc:'Compact et puissant : il boit un peu plus.'},
  v12:{name:'V12 (moteur d’avion)',P:[600,2000,7000],kgW:.0022,volW:11,bsfc:345,carbu:'essence',cout:{fer:.004,pieces:.026,cuivre:.0026},heures:.011,desc:'Un moteur d’avion dans un char : la puissance maximale par kilo et par litre. Cher, fragile, assoiffé à pleine charge.'},
};

// ---------- les tourelles ----------
// facettes : le nombre de pans (les rondes en ont dix) ; fixe : la casemate ne tourne pas (débattement arc) ; ouverte : pas de toit (l'équipage se voit)
export const FORMES={
  cylindre:{name:'Cylindre',facettes:10,desc:'Ronde, verticale : simple à couler.'},
  cone:{name:'Tronc de cône',facettes:10,desc:'Ronde, les flancs inclinés : les obus glissent.'},
  boite:{name:'Boîte',facettes:4,desc:'Plaques soudées : avant, flancs, arrière. On règle chaque angle.'},
  hexagone:{name:'Hexagone',facettes:6,desc:'Six pans : un nez, des joues inclinées.'},
  dome:{name:'Dôme',facettes:10,desc:'Coulée en dôme : très inclinée partout, mais basse et étroite à l’intérieur.'},
  casemate:{name:'Casemate (fixe)',facettes:4,fixe:true,desc:'Dans la caisse, sans tourner : plus d’arme pour le même poids — c’est l’engin qui pointe.'},
  sponson:{name:'Sponson (flanc)',facettes:4,fixe:true,flanc:true,desc:'Une casemate en encorbellement sur un flanc, comme les chars losanges : elle tire de côté.'},
  affut:{name:'Affût à bouclier',facettes:3,ouverte:true,desc:'Un pivot et un bouclier : le tireur est dehors. Léger, tout l’horizon.'},
  ouverte:{name:'Tourelle ouverte',facettes:10,ouverte:true,desc:'Ronde, sans toit : on voit tout, on reçoit tout ce qui tombe.'},
};
// les armes proposées pour une tourelle (on les retouche au concepteur d'armes en mode engin)
const FIELD=KIT_PRESETS.find(k=>k.id==='field')?.design||{};
const HMG=()=>({d:2.4,l:9,nose:'pointue',base:'plat',cons:'fmj',c:.06,L:260,twist:70,action:'auto',rof:600,mag:150,heavy:true,burn:1,wallx:1.3,jacket:1,core:0,hef:.3,fragm:4,zero:200,prop:'cartouche',fill:'tolite',shell:'lisse',fuse:'impact',mods:[],finish:'kaki',feed:'bande',stock:'sans',tube:'refroidi'});
export const VEH_ARMES={
  mitrailleuse:{name:'Mitrailleuse lourde',p:HMG},
  canon_court:{name:'Canon court 16 mm (explosif)',p:()=>kitToP({...FIELD,name:'Canon court 16 mm',role:'En tourelle',caliberMm:16,barrelLengthCm:46,filler:.2,ogive:.45,coreDensity:6.4,meplat:.24,massG:60,caseLenCm:8,assignedCrew:2,carriage:'none'})},
  antichar:{name:'Canon antichar 10 mm (perforant)',p:()=>kitToP({...FIELD,name:'Canon antichar 10 mm',role:'En tourelle',caliberMm:10,barrelLengthCm:52,filler:0,ogive:.6,coreDensity:7.8,meplat:.1,massG:22,caseLenCm:8,assignedCrew:2,carriage:'none'})},
  canon_long:{name:'Canon long 14 mm (perforant)',p:()=>kitToP({...FIELD,name:'Canon long 14 mm',role:'En tourelle',caliberMm:14,barrelLengthCm:84,filler:0,ogive:.62,coreDensity:7.8,meplat:.1,massG:60,caseLenCm:12,assignedCrew:2,carriage:'none'})},
  canon_lourd:{name:'Canon d’assaut 28 mm (explosif)',p:()=>kitToP({...FIELD,name:'Canon d’assaut 28 mm',role:'En casemate',caliberMm:28,barrelLengthCm:66,filler:.22,ogive:.42,coreDensity:6.3,meplat:.26,massG:320,caseLenCm:13,assignedCrew:2,carriage:'none'})},
};

// ---------- une conception d'engin ----------
// v : {chassis, L, W, H, pl:{av:[mm,°], avb, fl, ar, toit:mm, sol:mm}, ouvert, moteur:{type, P, n, pos:'arriere'|'avant'|'centre'}, bidons,
//      tourelles:[{forme, z, x, D, h, long, pl:{av:[mm,°], fl, ar, toit}, arme:p, coax:p|null, elec}], mgCaisse:p|null,
//      racks:[{ti, n, z, x}] (ti : l'index de la tourelle, 'c' la mitrailleuse de caisse, 'x0' la coaxiale de la tourelle 0), passagers, soute}
// (V12.8) la recherche qu'une conception demande avant que le garage la fabrique
export function techNeeded(v){const C=CHASSIS[v.chassis]||{},out=['garage_engins'];if(/chenilles|semi|losange/.test(C.train||''))out.push('chenilles');
  if((v.tourelles||[]).some(T=>T.forme!=='affut'))out.push('tourelles');if(['six','v8','v12'].includes(v.moteur?.type))out.push('gros_moteurs');return out;}
export function newVehicle(ch='chenM'){const C=CHASSIS[ch];const v={chassis:ch,L:C.L[1],W:C.W[1],H:C.H[1],pl:JSON.parse(JSON.stringify(C.pl)),ouvert:!!C.ouvert,
    moteur:{type:ch==='charrette'?'bras':ch==='jeep'?'bicyl':ch==='camion'||ch==='voiture14'?'quatre':ch==='losange'?'vapeur':ch==='geant'?'v12':['auto4','auto6','auto8','semi','chenL'].includes(ch)?'six':'six',P:0,n:ch==='geant'?3:1,pos:CHASSIS[ch].moteurAv?'avant':'arriere'},
    bidons:0,tourelles:[],mgCaisse:null,racks:[],passagers:0,soute:0};
  const M=MOTEURS[v.moteur.type];v.moteur.P=Math.round(clamp(defaultPower(ch),M.P[0],M.P[2]));v.bidons=Math.round(defaultBidons(ch));return v;}
// la puissance et le plein proposés : ceux d'un vrai engin de ce châssis (ch/t réels)
function defaultPower(ch){return {charrette:40,chenT:420,jeep:200,voiture14:200,auto4:330,auto6:450,auto8:800,camion:300,semi:450,chenL:550,chenM:1000,chenH:2100,geant:2400,losange:500}[ch]||500;}
function defaultBidons(ch){return {charrette:0,chenT:8,jeep:3,voiture14:4,auto4:5,auto6:7,auto8:12,camion:9,semi:8,chenL:8,chenM:22,chenH:25,geant:120,losange:40}[ch]||10;}
export function newTurret(forme='cylindre',arme='mitrailleuse'){const f=FORMES[forme];
  return {forme,z:0,x:0,D:0,h:0,long:forme==='boite'||forme==='hexagone'?1.3:1,pl:{av:[forme==='affut'?1:3,forme==='cone'||forme==='dome'?35:10],fl:[2,forme==='cone'?25:forme==='dome'?40:15],ar:[2,10],toit:f.ouverte?0:1},arme:VEH_ARMES[arme].p(),coax:null,elec:false};}

// ---------- la géométrie ----------
// la caisse : un profil (avant bas, nez, glacis, toit, arrière) extrudé, les flancs inclinés ; renvoie les sommets et les faces (polygones plans)
export function hullGeom(v){const C=CHASSIS[v.chassis],L=v.L,W=v.W,H=v.H,y0=C.garde,y1=y0+H,fb=C.fb??.4,hL=H*fb,hU=H-hL;const P=v.pl;
  const ys=y0+H*(v.sb??C.sb??.45);   // la cassure du flanc : vertical dessous, incliné de P.fl[1] au-dessus
  const zF0=L/2-hL*tan(P.avb[1]),zN=L/2,yN=y0+hL,zF2=L/2-hU*tan(P.av[1]),zR1=-L/2+H*tan(P.ar[1]),zR0=-L/2;
  const hw=y=>Math.max(2,W/2-Math.max(0,y-ys)*tan(P.fl[1]));
  const prof=[[zF0,y0],[zN,yN],[zF2,y1],[zR1,y1],[zR0,y0]];
  // une face qui suit une arête du profil (avant bas, glacis, toit, arrière, plancher) : de gauche à droite, avec la cassure du flanc si elle la croise
  const cut=(a,b)=>{const E=[a];if((a[1]-ys)*(b[1]-ys)<0){const f=(ys-a[1])/(b[1]-a[1]);E.push([a[0]+(b[0]-a[0])*f,ys]);}E.push(b);return E;};
  const strip=(i,j)=>{const E=cut(prof[i],prof[j]);return [...E.map(([z,y])=>[-hw(y),y,z]),...E.slice().reverse().map(([z,y])=>[hw(y),y,z])];};
  // un flanc : le profil coupé à la cassure — la partie basse (verticale) et la partie haute (inclinée)
  const clip=(below)=>{const out=[];for(let i=0;i<prof.length;i++){const a=prof[i],b=prof[(i+1)%prof.length],ina=below?a[1]<=ys:a[1]>=ys,inb=below?b[1]<=ys:b[1]>=ys;
      if(ina)out.push(a);if(ina!==inb){const f=(ys-a[1])/(b[1]-a[1]);out.push([a[0]+(b[0]-a[0])*f,ys]);}}return out;};
  const side=(pts,s)=>pts.map(([z,y])=>[s*hw(y),y,z]);const lo=clip(true),hi=clip(false);
  const F=(id,label,pts,t,a)=>({id,label,poly:pts,t,a});
  const faces=[F('avb','avant bas',strip(0,1),P.avb[0],P.avb[1]),F('av','glacis',strip(1,2),P.av[0],P.av[1]),F('toit','toit',strip(2,3),P.toit,90),F('ar','arrière',strip(3,4),P.ar[0],P.ar[1]),F('sol','plancher',strip(4,0),P.sol,90)];
  if(lo.length>=3){faces.push(F('flg','flanc gauche',side(lo,-1),P.fl[0],0),F('fld','flanc droit',side(lo,1),P.fl[0],0));}
  if(hi.length>=3){faces.push(F('flgh','flanc gauche haut',side(hi,-1),P.fl[0],P.fl[1]),F('fldh','flanc droit haut',side(hi,1),P.fl[0],P.fl[1]));}
  if(v.ouvert)faces.splice(2,1);
  const ok=zF2>zR1+4&&zF0>zR0;return {faces,y0,y1,ys,zF0,zN,yN,zF2,zR1,zR0,hw,roof:{z0:zR1,z1:zF2,hw:hw(y1)},ok};}
// une tourelle : ses faces (polygones plans), dans le repère de la caisse, tourelle à 0 (canon vers l'avant)
export function turretGeom(T,base,v){const F=FORMES[T.forme],r=T.D/2,h=T.h,cx=T.x,cz=T.z,y0=base,y1=base+h,faces=[];
  const lab=ang=>{const a=Math.abs(((ang+540)%360)-180);return a<50?'av':a>130?'ar':'fl';};
  const ring=(rr,y,n,off=0,stretch=1)=>Array.from({length:n},(_,i)=>{const a=off+i/n*Math.PI*2;return [cx+Math.sin(a)*rr,y,cz+Math.cos(a)*rr*stretch];});
  const pushRing=(A,B,n,offA)=>{for(let i=0;i<n;i++){const j=(i+1)%n,mid=(offA+(i+.5)/n*Math.PI*2)/D2R;const k=lab(mid);const pl=T.pl[k]||T.pl.fl;
      const poly=[A[i],A[j],B[j],B[i]];faces.push({id:'t'+k+i,label:{av:'tourelle avant',fl:'tourelle flanc',ar:'tourelle arrière'}[k],poly,t:pl[0],a:pl[1],k});}};
  if(F.ouverte&&T.forme==='affut'){// un bouclier en trois pans devant le pivot
    const n=3,A=ring(r*1.1,y0,7,-Math.PI/3),B=ring(r*1.1,y1,7,-Math.PI/3);for(let i=0;i<3;i++){const poly=[A[i*2],A[i*2+2],B[i*2+2],B[i*2]];faces.push({id:'tav'+i,label:'bouclier',poly,t:T.pl.av[0],a:0,k:'av'});}
    return {faces,y0,y1,top:y1};}
  if(T.forme==='boite'||T.forme==='casemate'||T.forme==='sponson'||T.forme==='hexagone'){const Lt=T.D*(T.long||1),hw0=r,hw1=Math.max(r*.35,r-h*tan(T.pl.fl[1]));
    const zf0=cz+Lt*.5,zf1=zf0-h*tan(T.pl.av[1]),zr0=cz-Lt*.5,zr1=zr0+h*tan(T.pl.ar[1]);const hex=T.forme==='hexagone';
    const bot=hex?[[cx-hw0,zf0-r*.5],[cx,zf0],[cx+hw0,zf0-r*.5],[cx+hw0,zr0+r*.3],[cx+hw0*.6,zr0],[cx-hw0*.6,zr0],[cx-hw0,zr0+r*.3]]:[[cx-hw0,zf0],[cx+hw0,zf0],[cx+hw0,zr0],[cx-hw0,zr0]];
    const top=hex?[[cx-hw1,zf1-r*.4],[cx,zf1],[cx+hw1,zf1-r*.4],[cx+hw1,zr1+r*.25],[cx+hw1*.6,zr1],[cx-hw1*.6,zr1],[cx-hw1,zr1+r*.25]]:[[cx-hw1,zf1],[cx+hw1,zf1],[cx+hw1,zr1],[cx-hw1,zr1]];
    const n=bot.length;for(let i=0;i<n;i++){const j=(i+1)%n;const mx=(bot[i][0]+bot[j][0])/2-cx,mz=(bot[i][1]+bot[j][1])/2-cz;const k=lab(Math.atan2(mx,mz)/D2R);const pl=T.pl[k]||T.pl.fl;
      faces.push({id:'t'+k+i,label:{av:'tourelle avant',fl:'tourelle flanc',ar:'tourelle arrière'}[k],poly:[[bot[i][0],y0,bot[i][1]],[bot[j][0],y0,bot[j][1]],[top[j][0],y1,top[j][1]],[top[i][0],y1,top[i][1]]],t:pl[0],a:pl[1],k});}
    if(T.pl.toit>0)faces.push({id:'ttoit',label:'toit de tourelle',poly:top.map(([x,z])=>[x,y1,z]).reverse(),t:T.pl.toit,a:90,k:'toit'});
    return {faces,y0,y1,top:y1};}
  const n=F.facettes,off=Math.PI/n;let rTop=T.forme==='cone'?Math.max(r*.3,r-h*tan(T.pl.fl[1])):r;
  if(T.forme==='dome'){const yM=y0+h*.55,rM=r*.92,rT=r*.45;const A=ring(r,y0,n,off),B=ring(rM,yM,n,off),Cc=ring(rT,y1,n,off);pushRing(A,B,n,off);
    for(let i=0;i<n;i++){const j=(i+1)%n;faces.push({id:'tdome'+i,label:'dôme',poly:[B[i],B[j],Cc[j],Cc[i]],t:T.pl.fl[0],a:62,k:'fl'});}
    faces.push({id:'ttoit',label:'toit de tourelle',poly:[...Cc].reverse(),t:T.pl.toit||T.pl.fl[0],a:90,k:'toit'});return {faces,y0,y1,top:y1};}
  const A=ring(r,y0,n,off),B=ring(rTop,y1,n,off);pushRing(A,B,n,off);
  if(!F.ouverte&&T.pl.toit>0)faces.push({id:'ttoit',label:'toit de tourelle',poly:[...B].reverse(),t:T.pl.toit,a:90,k:'toit'});
  return {faces,y0,y1,top:y1};}

// ---------- les mesures d'un polygone ----------
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const nrm=a=>{const l=Math.hypot(...a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
export function polyArea(P){let s=[0,0,0];for(let i=1;i<P.length-1;i++){const c=cross(sub(P[i],P[0]),sub(P[i+1],P[0]));s=[s[0]+c[0],s[1]+c[1],s[2]+c[2]];}return Math.hypot(...s)/2;}
export function polyCenter(P){const c=[0,0,0];for(const p of P){c[0]+=p[0];c[1]+=p[1];c[2]+=p[2];}return c.map(x=>x/P.length);}
// la normale sortante (par rapport à un point intérieur)
export function polyNormal(P,inside){let n=[0,0,0];for(let i=1;i<P.length-1;i++){const c=cross(sub(P[i],P[0]),sub(P[i+1],P[0]));n=[n[0]+c[0],n[1]+c[1],n[2]+c[2]];}n=nrm(n);
  if(inside&&dot(n,sub(polyCenter(P),inside))<0)n=n.map(x=>-x);return n;}

// ---------- l'arme d'une tourelle, vue par l'engin ----------
// l'équipage : 1 tireur, et 1 chargeur dès que l'arme se charge coup par coup (canon) ou qu'elle est lourde ; la couronne minimale suit le poids et la
// longueur de la munition (le chargeur la manie) ; les munitions : volume d'un coup rangé (étui couché, une alvéole)
export function armeVeh(p){if(!p)return null;let D;try{D=derive(p);}catch(e){return null;}const auto=!!(D.p.action&&/auto|gaz|recul|rotatif/.test(D.p.action));
  const charge=!auto||D.mass>1.2;const crew=charge&&(D.mass>.6||(D.p.d||0)>6)?2:1;   /* (V12.8 : un petit calibre se charge d'une main : un seul servant) */const colCm=D.COL/10,dcCm=D.Dc/10;
  const Dmin=Math.max(crew>1?22:15,1.8*colCm+(crew>1?5:2))+1.2*Math.cbrt(Math.max(.01,D.mass));
  const vol=colCm*Math.pow(dcCm*1.18+.1,2)*1.25;   // cm³ par coup rangé
  return {D,crew,charge,Dmin,vol,colCm,dcCm,rm:D.rm,kg:D.mass,name:p.kit?.name||D.name||'arme'};}

// Les chiffres du concepteur d'armes, pour une arme servie sur un pivot ou une tourelle.
// Poids, recul, cycle, cadence, visée : les mêmes que pour la mitrailleuse sur trépied et le canon sur affût à roues.
// Seul le recul change de masse d'appui : ce n'est plus l'épaule d'un Meumeu, c'est la tourelle (même impulsion, I²/2m).
export function serviceArme(D,{turretKg=0,crew=1}={}){
  const auto=!!(D.p?.action&&/auto|gaz|recul|rotatif/.test(D.p.action));
  const Mt=Math.max(D.mass||.2,turretKg||D.mass||.2);
  const I=Math.sqrt(Math.max(0,2*(D.recoil||0)*(D.mass||.2)));
  const reculJ=I*I/(2*Mt),kick=I/Mt;
  const pen30=D.pen(D.at(30).v);
  return {kg:D.mass,g:(D.mass||0)*1000,recul:D.recoil||0,reculJ,kick,cyc:D.cyc,rpm:D.rpm,aim:D.aim,v0:D.vTop||D.v0,E0:D.E0,pen30,moa:D.moa,rm:D.rm,P:D.P,life:D.life,auto,crew,mag:D.p?.mag||1,blast:D.he&&!D.he.shaped?D.he.blast:0};
}

// ---------- la disposition de l'habitacle (une grille de cases d'espace) ----------
// On place, dans l'ordre : le moteur (et la transmission) à son bout, l'essence contre lui, le panier de chaque tourelle (son tireur et son
// chargeur) sous sa couronne, le conducteur et le mitrailleur à l'avant, les râteliers où le joueur les met (ou au plus près), puis les passagers
// et la soute dans ce qui reste. Ce qui ne tient pas est une ERREUR qui le nomme : la conception doit tenir physiquement.
function layout(v,G,mods,errs,warns,tur){const C=CHASSIS[v.chassis],c=clamp(Math.max(v.L,v.W*1.6)/56,1,8);const ts=Math.max(v.pl.fl[0],.3)/10,tt=(v.ouvert?0:v.pl.toit)/10+.2,tb=v.pl.sol/10+.2;
  const nz=Math.max(4,Math.ceil(v.L/c)),nx=Math.max(3,Math.ceil(v.W/c)),ny=Math.max(3,Math.ceil((v.H+(v.ouvert?SEAT.h*.75:0))/c));const z0=-v.L/2,x0=-v.W/2,y0=G.y0;
  const cz=k=>z0+(k+.5)*c,cx=i=>x0+(i+.5)*c,cy=j=>y0+(j+.5)*c;
  const inside=(i,j,k)=>{const x=cx(i),y=cy(j),z=cz(k);if(y<y0+tb||y>G.y1-tt+(v.ouvert?SEAT.h*.75:0))return false;if(Math.abs(x)>G.hw(Math.min(y,G.y1))-ts)return false;
    const yl=Math.min(y-y0,v.H);const zF=yl<v.H*(C.fb??.4)?G.zF0+(G.zN-G.zF0)*yl/(v.H*(C.fb??.4)):G.zN+(G.zF2-G.zN)*(yl-v.H*(C.fb??.4))/Math.max(1e-6,v.H*(1-(C.fb??.4)));const zR=G.zR0+(G.zR1-G.zR0)*yl/v.H;return z<zF-ts&&z>zR+ts;};
  const occ=new Uint8Array(nx*ny*nz),idx=(i,j,k)=>(k*ny+j)*nx+i;let freeN=0;for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)if(inside(i,j,k))freeN++;else occ[idx(i,j,k)]=255;
  const V1=c*c*c;const box=(i0,i1,j0,j1,k0,k1)=>({x0:x0+i0*c,x1:x0+(i1+1)*c,y0:y0+j0*c,y1:y0+(j1+1)*c,z0:z0+k0*c,z1:z0+(k1+1)*c});
  const isFree=(i0,i1,j0,j1,k0,k1)=>{if(i0<0||j0<0||k0<0||i1>=nx||j1>=ny||k1>=nz)return false;for(let k=k0;k<=k1;k++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)if(occ[idx(i,j,k)])return false;return true;};
  const mark=(i0,i1,j0,j1,k0,k1,id)=>{for(let k=k0;k<=k1;k++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)occ[idx(i,j,k)]=id;};
  let mid=1;const add=(m,b)=>{m.box=box(...b);m.cells=b;mark(...b,mid++);mods.push(m);return m;};
  // une boîte de w×h×l cm : la première place libre en balayant z dans l'ordre demandé (zs), x depuis le côté demandé, y depuis le bas
  const nyIn=Math.max(1,Math.ceil(v.H/c));let seatMode=false;   // seatMode : un siège peut dépasser du bord d'une caisse découverte
  const find=(w,h,l,zs,xs='centre',ys='bas')=>{const a=Math.max(1,Math.ceil(w/c)),b=Math.max(1,Math.ceil(h/c)),d=Math.max(1,Math.ceil(l/c));const NY=seatMode?ny:nyIn;
    const xo=[];for(let i=0;i+a<=nx;i++)xo.push(i);if(xs==='gauche')xo.sort((p,q)=>p-q);else if(xs==='droite')xo.sort((p,q)=>q-p);else{const m=(nx-a)/2;xo.sort((p,q)=>Math.abs(p-m)-Math.abs(q-m));}
    const yo=[];for(let j=0;j+b<=NY;j++)yo.push(j);if(ys==='haut')yo.reverse();if(ys==='sol')yo.length=Math.min(1,yo.length);
    for(const k of zs)for(const i of xo)for(const j of yo){if(k+d>nz)continue;if(isFree(i,i+a-1,j,j+b-1,k,k+d-1))return [i,i+a-1,j,j+b-1,k,k+d-1];}return null;};
  const zsFront=[...Array(nz).keys()].reverse(),zsRear=[...Array(nz).keys()];const near=z=>{const k=Math.round((z-z0)/c);return [...Array(nz).keys()].sort((p,q)=>Math.abs(p-k)-Math.abs(q-k));};
  // le moteur : des tranches pleines depuis son bout, jusqu'au volume voulu ; la transmission comprise
  const M=MOTEURS[v.moteur.type],Pt=v.moteur.P*Math.max(1,v.moteur.n|0),Veng=Pt*M.volW;const pos=v.moteur.pos||'arriere';
  {let need=Veng,ks=pos==='avant'?zsFront:pos==='centre'?near(0):zsRear;const taken=[];for(const k of ks){if(need<=0)break;let n=0;for(let j=0;j<nyIn;j++)for(let i=0;i<nx;i++)if(!occ[idx(i,j,k)])n++;if(!n)continue;taken.push(k);need-=n*V1;}
    if(need>0)errs.push(`Le moteur (${fmtL(Veng)}) ne tient pas dans la caisse : allongez-la, élargissez-la, ou moins de puissance.`);
    if(taken.length){const k0=Math.min(...taken),k1=Math.max(...taken);for(const k of taken)for(let j=0;j<nyIn;j++)for(let i=0;i<nx;i++)if(!occ[idx(i,j,k)])occ[idx(i,j,k)]=mid;
      mods.push({id:'moteur',label:`Moteur${v.moteur.n>1?'s':''} (${M.name.toLowerCase()})`,kind:'moteur',box:box(0,nx-1,0,nyIn-1,k0,k1),cells:[0,nx-1,0,nyIn-1,k0,k1]});mid++;}}
  // les tourelles : le panier sous la couronne (fixes : l'équipage derrière l'arme, dans la caisse)
  tur.forEach((t,ti)=>{const T=t.T,A=t.A;const crew=A?.crew||1;const F=FORMES[T.forme];
    if(F.flanc){const side=T.x<0?'gauche':'droite';for(let q=0;q<crew;q++){const b=find(SEAT.w,SEAT.h,SEAT.l,near(T.z),side);if(b)add({id:`t${ti}_${q?'chargeur':'tireur'}`,label:`${q?'Chargeur':'Tireur'} — ${tName(ti)}`,kind:'equipage',role:q?'chargeur':'tireur',ti},b);else errs.push(`Pas de place pour le ${q?'chargeur':'tireur'} de la ${tName(ti)}.`);}return;}
    if(F.ouverte&&T.forme==='affut'){seatMode=true;const b=find(PASS.w,30,PASS.l,near(T.z),'centre','sol');seatMode=false;if(b)add({id:`t${ti}_tireur`,label:`Tireur — ${tName(ti)} (debout)`,kind:'equipage',role:'tireur',ti,expose:true},b);if(crew>1){seatMode=true;const b2=find(SEAT.w,SEAT.h,SEAT.l,near(T.z));seatMode=false;if(b2)add({id:`t${ti}_chargeur`,label:`Chargeur — ${tName(ti)}`,kind:'equipage',role:'chargeur',ti},b2);}return;}
    const r=T.D/2,ki0=Math.floor((T.z-r-z0)/c),ki1=Math.ceil((T.z+r-z0)/c)-1,ii0=Math.floor((T.x-r-x0)/c),ii1=Math.ceil((T.x+r-x0)/c)-1;
    const k0=clamp(ki0,0,nz-1),k1=clamp(ki1,0,nz-1),i0=clamp(ii0,0,nx-1),i1=clamp(ii1,0,nx-1);let clash=null;
    for(let k=k0;k<=k1&&!clash;k++)for(let j=0;j<ny&&!clash;j++)for(let i=i0;i<=i1;i++){const o=occ[idx(i,j,k)];if(o&&o!==255){clash=mods.find(m=>m.cells&&k>=m.cells[4]&&k<=m.cells[5]&&i>=m.cells[0]&&i<=m.cells[1])||{label:'une autre tourelle'};break;}}
    if(clash&&!(crew===1&&T.D<22)){errs.push(`La ${tName(ti)} est au-dessus de « ${clash.label.toLowerCase()} » : déplacez-la.`);return;}
    const jTop=ny-1,jBot=Math.max(0,crew===1&&T.D<22?Math.floor(ny*.45):0);const half=Math.floor((i0+i1)/2);
    const seat=(a0,a1,role)=>{for(let j=jBot;j<=jTop;j++)for(let k=k0;k<=k1;k++)for(let i=a0;i<=a1;i++)if(!occ[idx(i,j,k)])occ[idx(i,j,k)]=mid;mods.push({id:`t${ti}_${role}`,label:`${role==='tireur'?'Tireur':'Chargeur'} — ${tName(ti)}`,kind:'equipage',role,ti,box:box(a0,a1,jBot,jTop,k0,k1),cells:[a0,a1,jBot,jTop,k0,k1]});mid++;};
    if(crew>1){seat(i0,half,'tireur');seat(half+1,i1,'chargeur');}else seat(i0,i1,'tireur');});
  seatMode=true;
  {const zs=pos==='avant'?near(G.zN-v.L*.35):zsFront;const b=find(SEAT.w,19,SEAT.l,zs,'gauche','sol');if(b)add({id:'conducteur',label:'Conducteur',kind:'equipage',role:'conducteur'},b);else errs.push('Pas de place pour le conducteur.');
    if(v.mgCaisse){const zs2=b?[b[4],...near(cz(b[4]))]:zs;const b2=find(SEAT.w,19,SEAT.l,zs2,'droite','sol');   /* (à côté du conducteur d'abord) */if(b2)add({id:'mitrailleur',label:'Mitrailleur de caisse',kind:'equipage',role:'mitrailleur'},b2);else errs.push('Pas de place pour le mitrailleur de caisse.');}}
  seatMode=false;
  // les râteliers : où le joueur les veut, sinon au plus près
  const R=[];const rack=(placed)=>(v.racks||[]).forEach((r,ri)=>{if((r.z!=null)!==placed)return;const A=rackArme(v,r.ti);if(!A||!(r.n>0))return;const V=r.n*A.vol;const depth=clamp(Math.max(A.colCm*1.08+.4,Math.cbrt(V)*.8),c,Math.max(c,v.W*.45));const h=Math.min(v.H*.42,Math.max(c,Math.sqrt(V/depth)));const l=Math.max(c,V/(depth*h));
    const zs=r.z!=null?near(r.z):zsRear;const xs=r.x==null?'centre':r.x<0?'gauche':r.x>0?'droite':'centre';
    const b=find(depth,h,l,zs,xs)||find(depth,h*.6,l*1.7,zs,xs)||find(l,h,depth,zs,xs);
    if(!b){errs.push(`Le râtelier ${ri+1} (${r.n} coups de ${A.name}) ne tient pas.`);return;}
    const m=add({id:'r'+ri,label:`Râtelier ${ri+1} — ${r.n} coups (${A.name})`,kind:'munitions',ti:r.ti,n:r.n,he:!!A.D.he,poudre:A.D.p.c*r.n/1000},b);R.push(m);
    if(r.z!=null&&Math.abs((m.box.z0+m.box.z1)/2-r.z)>Math.max(8,v.L*.1))warns.push(`Râtelier ${ri+1} : pas de place où vous l’aviez mis, rangé au plus près.`);});
  rack(true);   // (ceux que le joueur a placés)
  seatMode=true;
  // les passagers : des bancs, deux de front si la largeur le permet, rangée après rangée (depuis l'arrière si le moteur est devant)
  if(v.passagers>0){let left=v.passagers,n=0;const a=Math.ceil(PASS.w/c),b=Math.ceil(PASS.h/c),d=Math.ceil(PASS.l/c);
    const ks=pos==='avant'?zsRear:near(-v.L*.15);
    for(const k of ks){if(left<=0)break;if(k+d>nz)continue;
      for(const side of [0,1]){if(left<=0)break;const io=[];for(let i=0;i+a<=nx;i++)io.push(i);if(side)io.reverse();
        for(const i of io)if(isFree(i,i+a-1,0,b-1,k,k+d-1)){add({id:'p'+n,label:`Passager ${n+1}`,kind:'passager'},[i,i+a-1,0,b-1,k,k+d-1]);left--;n++;break;}}}
    if(left>0)errs.push(`Il manque la place de ${left} passager${left>1?'s':''} sur ${v.passagers}.`);}
  seatMode=false;rack(false);   // (les râteliers sans place imposée : dans ce que laissent les bancs)
  // l'essence (ou le charbon) : contre le moteur, en bas, dans la place que laissent les sièges et les munitions
  {const Vf=M.carbu==='charbon'?v.bidons*CAISSE_CM3:v.bidons*BIDON_L*1000;if(Vf>0){const h=Math.min(v.H*.45,Math.max(c,Math.cbrt(Vf)));const l=Math.max(c,Vf/(h*Math.max(c,v.W*.7)));
    const b=find(Math.max(c,v.W*.7),h,l,pos==='avant'?zsFront:zsRear,'centre','bas')||find(Math.max(c,v.W*.4),h,l*1.8,pos==='avant'?zsFront:zsRear)||find(c*2,c*2,Vf/(4*c*c),zsRear);
    if(b)add({id:'reservoir',label:M.carbu==='charbon'?'Soute à charbon':'Réservoir d’essence',kind:'essence',v:Vf},b);else errs.push(`Le réservoir (${v.bidons} ${M.carbu==='charbon'?'caisses de charbon':'bidons'}) ne tient pas.`);}}
  // le conducteur, à l'avant gauche (le moteur à l'avant : derrière lui) ; le mitrailleur de caisse à sa droite
  seatMode=false;
  // la soute : des caisses, empilées
  if(v.soute>0){const e=Math.cbrt(CAISSE_CM3);let left=v.soute,n=0;const zs=pos==='avant'?zsRear:near(-v.L*.2);const blocks=[];
    while(left>0){const b=find(e,e,e,zs);if(!b)break;mark(...b,mid);blocks.push(box(...b));left--;n++;}mid++;
    if(n)mods.push({id:'soute',label:`Soute — ${n} caisse${n>1?'s':''}`,kind:'soute',n,box:blocks.reduce((a,b)=>({x0:Math.min(a.x0,b.x0),x1:Math.max(a.x1,b.x1),y0:Math.min(a.y0,b.y0),y1:Math.max(a.y1,b.y1),z0:Math.min(a.z0,b.z0),z1:Math.max(a.z1,b.z1)})),blocks});
    if(left>0)errs.push(`La soute : ${left} caisse${left>1?'s':''} de trop.`);}
  let used=0;for(let q=0;q<occ.length;q++)if(occ[q]&&occ[q]!==255)used++;
  return {cell:c,vol:freeN*V1,used:used*V1,libre:(freeN-used)*V1};}
const tName=ti=>`tourelle ${ti+1}`;
const fmtL=cm3=>`${(cm3/1000).toFixed(cm3<10000?1:0).replace('.',',')} L`;
export function rackArme(v,ti){if(ti==='c')return armeVeh(v.mgCaisse);if(typeof ti==='string'&&ti[0]==='x')return armeVeh(v.tourelles[+ti.slice(1)]?.coax);return armeVeh(v.tourelles[ti]?.arme);}

// ---------- la vitesse : la puissance contre le roulement et l'air ----------
function vmaxOf(Pw,eta,m,crr,A,Cd){let v=1;for(let i=0;i<60;i++){const f=.5*RHO*Cd*A*v*v*v+crr*m*GRAV*v-eta*Pw;const df=1.5*RHO*Cd*A*v*v+crr*m*GRAV;v=Math.max(.05,v-f/df);}return v;}

// ---------- tout ce qui découle d'une conception ----------
const CACHE=new Map();
export function deriveVeh(v){const key=JSON.stringify(v);if(CACHE.has(key))return CACHE.get(key);const D=deriveVeh0(v);CACHE.set(key,D);if(CACHE.size>200)CACHE.delete(CACHE.keys().next().value);return D;}
function deriveVeh0(v){const C=CHASSIS[v.chassis]||CHASSIS.chenM,M=MOTEURS[v.moteur?.type]||MOTEURS.six;const errs=[],warns=[],mods=[];
  const G=hullGeom(v);if(!G.ok)errs.push('Les plaques avant et arrière sont trop inclinées pour cette longueur : le toit disparaît.');
  const inside=[0,(G.y0+G.y1)/2,0];
  // les tourelles : taille minimale selon l'arme, posées sur le toit (ou dans la caisse, ou sur un flanc)
  const tur=v.tourelles.map((T,ti)=>{const A=armeVeh(T.arme),Ac=armeVeh(T.coax),F=FORMES[T.forme]||FORMES.cylindre;const Dmin=Math.max(A?.Dmin||16,Ac?Ac.Dmin*.6:0);
    if(!(T.D>=Dmin)){if(T.D>0)warns.push(`La ${tName(ti)} est agrandie à ${Math.round(Dmin)} cm : l’arme et ${A?.crew>1?'ses deux servants':'son tireur'} n’y tenaient pas.`);T={...T,D:Math.ceil(Dmin)};}
    const h=T.h>0?T.h:Math.round(clamp(T.D*.45,12,40));T={...T,h};
    let base=G.y1;if(F.fixe&&!F.flanc)base=G.y1-h*.55;if(F.flanc)base=G.y0+v.H*.35;
    if(T.forme==='affut'){const rf=G.roof;if(T.z>rf.z1+2||T.z<rf.z0-2||Math.abs(T.x)>rf.hw)errs.push(`Le pivot de la ${tName(ti)} est hors de la caisse.`);}   // (un affût : seul son pivot doit être sur la caisse)
    else if(!F.fixe&&!F.flanc){const rf=G.roof;if(T.z+T.D/2>rf.z1+2||T.z-T.D/2<rf.z0-2||Math.abs(T.x)+T.D/2>rf.hw+2)errs.push(`La ${tName(ti)} déborde du toit : rapprochez-la du milieu, ou une caisse plus grande.`);}
    const geo=turretGeom(T,base,v);let area=0,kg=0;for(const f of geo.faces){const a=polyArea(f.poly);area+=a;kg+=a*f.t/10*STEEL/1000;}
    const ring=Math.PI*T.D*(T.pl.av[0]/10+.5)*1.2*STEEL/1000;const mech=.12*(A?.kg||0)+ring;
    const mass=kg+mech+(A?.kg||0)+(Ac?.kg||0);const trav=F.fixe?0:clamp((T.elec?55:24)/Math.pow(Math.max(.2,mass),.45),2,120);
    const svc=A?serviceArme(A.D,{crew:A.crew,turretKg:mass}):null;
    if(svc&&svc.kick>8)warns.push(`La ${tName(ti)} est légère pour ce recul : ${fmt1(svc.kick)} m/s (${fmt1(svc.reculJ)} J dans ${fmt1(mass)} kg). Le concepteur d’armes compte ${fmt1(svc.recul)} J dans l’arme seule.`);
    return {T,A,Ac,F,geo,base,area,plates:kg,mass,trav,crew:A?.crew||1,arc:F.fixe?(F.flanc?120:24):360,svc};});
  // les masses (kg de peluche)
  let armor=0;const hullPl=[];for(const f of G.faces){const a=polyArea(f.poly);const kg=a*Math.max(.3,f.t)/10*STEEL/1000;armor+=kg;hullPl.push({...f,n:polyNormal(f.poly,inside),c:polyCenter(f.poly),area:a,part:'caisse'});}
  const frame=.0011*v.L*v.W*(C.train==='roues'?1:1.25);const nEng=Math.max(1,v.moteur.n|0),Pw=v.moteur.P*nEng;const engKg=Pw*M.kgW*(nEng>1?1.08:1);
  const fuelKg=M.carbu==='charbon'?v.bidons*CRATE_KG:v.bidons*BIDON_L*ESS_KG_L;
  const weapKg=tur.reduce((a,t)=>a+t.mass,0)+(v.mgCaisse?armeVeh(v.mgCaisse)?.kg*1.2||0:0);
  let ammoKg=0;for(const r of v.racks||[]){const A=rackArme(v,r.ti);if(A)ammoKg+=r.n*A.rm/1000;}
  const crewN=1+tur.reduce((a,t)=>a+t.crew,0)+(v.mgCaisse?1:0),paxKg=(v.passagers||0)*(BODY_KG+.3),cargoKg=(v.soute||0)*CRATE_KG;
  const dry=armor+frame+engKg+weapKg;let gross=dry+fuelKg+ammoKg+crewN*BODY_KG+paxKg+cargoKg;let susp=0;for(let i=0;i<4;i++){susp=C.susp*gross;gross=dry+susp+fuelKg+ammoKg+crewN*BODY_KG+paxKg+cargoKg;}
  // l'habitacle
  const lay=layout(v,G,mods,errs,warns,tur);
  // la vitesse, l'accélération, la conso
  const eta=C.train==='roues'?.82:C.train==='semi'?.75:C.train==='losange'?.6:.7;const A_front=(v.W/100)*((v.H+C.garde+(tur.length?Math.max(...tur.map(t=>t.T.h)):0))/100);
  const charge=C.charge*v.L*v.W,over=gross/charge;let crr=C.crr*(over>1?1+(over-1)*.8:1);
  let vPhys=Math.min(C.cap*(over>1?1/Math.sqrt(over):1),vmaxOf(Pw,eta,gross,crr,A_front,.95));const vmax=vPhys*K_V;
  const t0=clamp(gross*vPhys*vPhys/(2*eta*Pw)*2.2,.6,30);
  // l'essence : l'énergie par mètre à 70 % de la vitesse maximale, la consommation spécifique, × K_ESS (la carte est petite)
  const vc=vPhys*.7,Fm=crr*gross*GRAV+.5*RHO*.95*A_front*vc*vc,kgPerM=Fm/eta*M.bsfc/3.6e9;
  const perCase=M.carbu==='charbon'?kgPerM*4*K_ESS/CRATE_KG:kgPerM*4*K_ESS/ESS_KG_L/BIDON_L;   // bidons (ou caisses de charbon) par case
  const range=perCase>0?v.bidons/perCase:0;
  // le braquage : roues = rayon (cases), chenilles = pivot (°/s), d'autant plus lent que l'engin est long et lourd par ch
  const pw=Pw/gross;const pivot=C.train==='roues'?0:clamp((C.pivot||20)*Math.sqrt(pw/8)*Math.sqrt(48/Math.max(30,v.W))*(v.W/Math.max(v.W,v.L*.5)),3,70);
  const rmin=C.train==='roues'||C.train==='semi'?Math.max(1.2,v.L/100*VEH_VIS*1.35):0;
  // le coût : l'acier, le moteur, les armes (comprises), le premier plein, les munitions des râteliers ; les heures de garage
  const cout={fer:0,pieces:0,cuivre:0,bois:0};const addC=(o,k=1)=>{for(const [r,q] of Object.entries(o||{}))cout[r]=(cout[r]||0)+q*k;};
  addC({fer:(armor+frame+susp*.7+tur.reduce((a,t)=>a+t.plates,0))*1.15,pieces:susp*.6+(C.train==='chenilles'||C.train==='losange'?gross*.05:C.train==='semi'?gross*.035:gross*.02)});
  addC(M.cout,Pw);for(const t of tur){if(t.A)addC(t.A.D.costW);if(t.Ac)addC(t.Ac.D.costW);addC({pieces:t.F.fixe?1:2+t.mass*.08,cuivre:t.T.elec?1+t.mass*.03:0});}
  if(v.mgCaisse){const A=armeVeh(v.mgCaisse);if(A)addC(A.D.costW);}
  for(const r of v.racks||[]){const A=rackArme(v,r.ti);if(!A)continue;const cc=crateCost(A.D.p);addC(cc,r.n/Math.max(1,A.D.perCrate));}
  if(C.train==='roues'||C.train==='semi')addC({bois:.5+v.L*.01});
  for(const k in cout)cout[k]=+cout[k].toFixed(cout[k]<10?1:0);for(const k in cout)if(!(cout[k]>0))delete cout[k];
  const plein={[M.carbu]:v.bidons};const heures=Math.round(12+Math.pow(gross,.72)*1.6+Pw*M.heures+tur.length*6+(v.racks||[]).length);
  // les plaques pour la balistique (repère de la caisse ; celles des tourelles tournent avec elles)
  const plates=[...hullPl];tur.forEach((t,ti)=>{const ins=[t.T.x,t.base+t.T.h/2,t.T.z];for(const f of t.geo.faces)plates.push({...f,n:polyNormal(f.poly,ins),c:polyCenter(f.poly),area:polyArea(f.poly),part:'tourelle',ti,fixe:!!t.F.fixe});});
  const crew=mods.filter(m=>m.kind==='equipage').map(m=>({role:m.role,ti:m.ti,id:m.id,label:m.label}));
  if(over>1.15)warns.push(`Surchargé : ${Math.round(gross)} kg pour ${Math.round(charge)} kg admis par le train — il peine, s’use, va moins vite.`);
  if(pw<4)warns.push(`${fmt1(pw*1.36)} ch/t seulement : il se traîne.`);
  if(range<120&&perCase>0)warns.push(`Autonomie courte : ${Math.round(range)} cases.`);
  const D={v,C,M,G,tur,mods,lay,plates,crew,errs,warns,ok:!errs.length,
    masses:{blindage:armor,chassis:frame+susp,moteur:engKg,armes:weapKg,munitions:ammoKg,carburant:fuelKg,equipage:crewN*BODY_KG,passagers:paxKg,soute:cargoKg},
    mass:gross,charge,over,Pw,pw,chT:Pw/1000*1.36/(gross/1000),eta,vPhys,vmax,t0,frein:clamp(t0*.45,.4,6),perCase,range,carbu:M.carbu,pivot,rmin,
    long:v.L/100*VEH_VIS,large:(v.W+(C.train==='roues'||C.train==='semi'?6:10))/100*VEH_VIS,haut:(G.y1+(tur.length?Math.max(...tur.map(t=>t.T.h)):0))/100*VEH_VIS,
    places:{equipage:crewN,passagers:v.passagers||0},soute:v.soute||0,cout,plein,heures};
  return D;}
const fmt1=x=>(Math.round(x*10)/10).toString().replace('.',',');

// ---------- l'engin dans le jeu : sa fiche au format des véhicules (VEHDEF), tout découle de la conception ----------
// ses armes sont des conceptions « engin » (invisibles au joueur) : <id>_tI (tourelle I), <id>_xI (sa coaxiale), <id>_c (la mitrailleuse de caisse)
// pos : [avant, côté, hauteur] en cases ; repos : la direction de repos d'une arme (un sponson regarde son flanc), son débattement est autour d'elle
export function vehDefOf(vd){const v=vd.v,D=deriveVeh(v),C=D.C,k=VEH_VIS/100;
  const ammo=ti=>(v.racks||[]).filter(r=>String(r.ti)===String(ti)).reduce((a,r)=>a+r.n,0);const armes=[];
  D.tur.forEach((t,i)=>{if(!t.A)return;const T=t.T,y=(t.base+T.h*.5)*k,fixe=!!t.F.fixe,fl=!!t.F.flanc;
    armes.push({id:'t'+i,piece:fixe?'canons'+i:'tourelle'+i,w:vd.id+'_t'+i,arc:fixe?(fl?120:24):360,tour:Math.max(4,t.trav||20),coups:ammo(i),hausse:[-6,fixe?20:18],pos:[T.z*k,T.x*k,y],tube:Math.max(.15,(t.A.D.p.L||200)/10*k),repos:fl?(T.x<0?-Math.PI/2:Math.PI/2):0});
    if(t.Ac)armes.push({id:'x'+i,piece:'tourelle'+i,w:vd.id+'_x'+i,arc:360,tour:Math.max(4,t.trav||20),coups:ammo('x'+i),coax:'t'+i,pos:[T.z*k,(T.x+2)*k,y],tube:.3});});
  if(v.mgCaisse)armes.push({id:'c',piece:'caisse',w:vd.id+'_c',arc:40,tour:40,coups:ammo('c'),pos:[(D.G.zN-6)*k,v.W*.22*k,(D.G.y0+v.H*.6)*k],tube:.32});
  const face=id=>{const f=D.G.faces.find(x=>x.id===id);return f?[f.t,f.a]:null;},t0=D.tur.find(t=>!t.F.ouverte)?.T;
  return {name:vd.name,modele:':engin_'+vd.id,avant:'+z',long:D.long,large:D.large,haut:D.haut,roues:C.train==='roues'||C.train==='semi'?'roues':'chenilles',r:D.rmin||2,pivot:D.pivot||20,vmax:D.vmax,t0:D.t0,frein:D.frein,
    blindage:{avant:face('av')||[.3,0],flanc:face('flg')||face('flgh')||[.3,0],arriere:face('ar')||[.3,0],dessus:v.ouvert?[0,0]:[v.pl.toit,85],...(t0?{tourelle:[t0.pl.av[0],t0.pl.av[1]],tourelle_flanc:[t0.pl.fl[0],t0.pl.fl[1]]}:{})},
    hp:Math.round(40+6*Math.pow(D.mass,.8)),places:{servants:Math.max(0,D.crew.length-1),passagers:v.passagers||0},soute:v.soute||0,armes,
    cout:{...D.cout,...D.plein},heures:D.heures,faction:vd.f||'meumeu',
    why:`${C.name} conçu au bureau des engins : ${fmt1(D.mass)} kg, ${fmt1(D.chT)} ch/t, ${fmt1(D.vmax)} cases/h, ${D.perCase>0?Math.round(D.range)+' cases d’autonomie':'tirée, sans carburant'}, ${D.crew.length} d’équipage${v.passagers?', '+v.passagers+' passagers':''}${v.soute?', '+v.soute+' caisses':''}${v.role==='citerne'?`. Citerne : ${v.cuve|0} ${D.carbu==='charbon'?'caisses de charbon':'bidons'} à verser aux engins arrêtés à 3 cases`:''}${v.role==='munitions'?'. Porte des caisses de munitions aux engins et aux Meumeu tout près':''}.`,
    role:v.role||null,cuve:v.role==='citerne'?Math.max(0,v.cuve|0):0,
    engin:{id:vd.id,v,carbu:D.carbu,plein:v.bidons,perCase:D.perCase,ouvert:!!v.ouvert,cuveKind:D.carbu}};}

// ---------- des conceptions d'exemple (le bureau les propose ; les tests les mesurent) ----------
export function exemple(id){const T=(f,a,o)=>({...newTurret(f,a),...o});let v;
  switch(id){
    case 'jeep':v=newVehicle('jeep');v.passagers=3;return v;
    case 'jeep_mg':v=newVehicle('jeep');v.tourelles=[T('affut','mitrailleuse',{z:-21,D:16,h:12})];v.racks=[{ti:0,n:600,z:-20}];v.passagers=1;return v;
    case 'rolls':v=newVehicle('voiture14');v.tourelles=[T('cylindre','mitrailleuse',{z:-6,D:20,h:12,pl:{av:[1.5,0],fl:[1.3,0],ar:[1.3,0],toit:.6}})];v.racks=[{ti:0,n:1500}];return v;
    case 'auto4':v=newVehicle('auto4');v.tourelles=[T('ouverte','mitrailleuse',{z:-4,D:22,h:9,pl:{av:[2,30],fl:[1.3,30],ar:[1.3,30],toit:0}})];v.racks=[{ti:0,n:2000}];return v;
    case 'auto8':v=newVehicle('auto8');v.tourelles=[T('boite','antichar',{z:-8,D:24,h:14,pl:{av:[5,15],fl:[2.5,20],ar:[2,20],toit:1}})];v.tourelles[0].coax=HMG();v.racks=[{ti:0,n:55},{ti:'x0',n:1200}];return v;
    case 'camion':v=newVehicle('camion');v.soute=30;v.passagers=2;v.bidons=30;return v;
    case 'citerne':v=newVehicle('camion');v.L=140;v.H=32;v.soute=2;v.passagers=0;v.bidons=20;v.role='citerne';v.cuve=80;return v;
    case 'charrette_mun':v=newVehicle('charrette');v.soute=12;v.passagers=0;v.bidons=0;v.role='munitions';return v;
    case 'camion_mun':v=newVehicle('camion');v.L=130;v.soute=32;v.passagers=1;v.bidons=16;v.role='munitions';return v;
    case 'chenT':v=newVehicle('chenT');v.passagers=6;v.soute=8;return v;
    case 'semi':v=newVehicle('semi');v.L=110;v.W=40;v.mgCaisse=HMG();v.racks=[{ti:'c',n:1500}];v.passagers=8;return v;
    case 'chenM':v=newVehicle('chenM');v.tourelles=[T('boite','canon_court',{z:6,D:0,h:15,pl:{av:[8,10],fl:[5,25],ar:[5,10],toit:1.7}})];v.tourelles[0].coax=HMG();v.mgCaisse=HMG();
      v.racks=[{ti:0,n:40,z:-10,x:-14},{ti:0,n:40,z:-10,x:14},{ti:'x0',n:1500},{ti:'c',n:1500}];return v;
    case 't34':v=newVehicle('chenM');v.W=50;v.H=28;v.sb=.55;/* (la tourelle en avant, comme le vrai) */Object.assign(v.pl,{av:[7.5,60],avb:[7.5,53],fl:[7.5,40],ar:[6.7,48]});v.moteur={type:'v12',P:1300,n:1,pos:'arriere'};v.tourelles=[T('hexagone','canon_long',{z:2,h:14,pl:{av:[12,30],fl:[9,20],ar:[8,10],toit:2.7}})];
      v.racks=[{ti:0,n:60}];v.bidons=25;return v;
    case 'tigre':v=newVehicle('chenH');v.moteur={type:'v12',P:2700,n:1,pos:'arriere'};v.tourelles=[T('boite','canon_long',{z:4,D:0,h:16,pl:{av:[17,0],fl:[13,0],ar:[13,0],toit:4},elec:true})];
      v.tourelles[0].coax=HMG();v.mgCaisse=HMG();v.racks=[{ti:0,n:45,x:-20},{ti:0,n:45,x:20},{ti:'x0',n:2000},{ti:'c',n:2000}];v.bidons=26;return v;
    case 'geant':v=newVehicle('geant');v.tourelles=[T('boite','canon_lourd',{z:30,h:22}),T('cylindre','canon_court',{z:-40,x:-25}),T('cylindre','canon_court',{z:-40,x:25}),
        T('cone','mitrailleuse',{z:80,x:-28,D:18}),T('cone','mitrailleuse',{z:80,x:28,D:18}),T('dome','antichar',{z:-90})];
      v.racks=[{ti:0,n:60},{ti:1,n:60},{ti:2,n:60},{ti:3,n:2000},{ti:4,n:2000},{ti:5,n:60}];return v;
    case 'automoteur':v=newVehicle('chenM');v.tourelles=[T('casemate','canon_lourd',{z:15,h:14,pl:{av:[10,35],fl:[4,10],ar:[3,0],toit:1.5}})];v.racks=[{ti:0,n:15},{ti:0,n:15}];return v;
    case 'losange':v=newVehicle('losange');v.tourelles=[T('sponson','canon_court',{z:0,x:-34}),T('sponson','canon_court',{z:0,x:34})];v.mgCaisse=HMG();v.racks=[{ti:0,n:60},{ti:1,n:60},{ti:'c',n:2000}];return v;
  }
  return newVehicle();}
export const EXEMPLES={jeep:'Jeep de liaison',jeep_mg:'Jeep à mitrailleuse',rolls:'Voiture blindée 14-18',auto4:'Automitrailleuse de reconnaissance',auto8:'Automitrailleuse lourde 8×8',
  camion:'Camion de ravitaillement',citerne:'Citerne',charrette_mun:'Charrette de munitions',camion_mun:'Camion de munitions',chenT:'Chenillette de transport',semi:'Semi-chenillé de transport',chenM:'Char moyen',t34:'Char moyen incliné',tigre:'Char lourd',geant:'Char géant à six tourelles',losange:'Char losange 14-18',automoteur:'Automoteur à casemate'};
