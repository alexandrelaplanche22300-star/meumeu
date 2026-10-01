// Les conceptions d'armes. Chaque camp commence avec les siennes ; l'armurerie en invente d'autres.
// Une conception adoptée se fabrique : ses armes (a:<id>) à la manufacture, ses munitions (m:<id>) à l'arsenal.
// Tout voyage en caisses : une caisse de munitions, c'est ce qu'un Meumeu porte, et selon la cartouche elle tient
// quelques centaines ou quelques milliers de coups.
import {derive,CRATE_KG,CONSTRUCTIONS,kitToP} from './ballistics.js';
import {KIT_PRESETS} from './kitdata.js';
import {deriveArmor} from './armor.js';

// une batterie de fusées : des tubes lisses posés sur roues, tir indirect en salve (une fusée par tube) ; le propergol est dans la fusée elle-même
const ROCKET_P=(d,l,c,barrels,hef)=>({d,l,nose:'ogive',base:'plat',cons:'he',c,L:Math.max(180,d*7),twist:4000,action:'bouche',rof:12,mag:1,heavy:false,burn:1,wallx:1,jacket:1,core:0,hef,fragm:14,zero:300,prop:'fusee',fill:'tolite',shell:'rainuree',fuse:'impact',mods:[],fins:4,finSize:1.3,cant:4,stages:1,guide:'aucun',barrels,carriage:'roues',stock:'sans',finish:'kaki',rocketBurn:1,nozzle:1,noseScale:1,boat:0});
const HMG_P=o=>({d:2.4,l:9,nose:'pointue',base:'plat',cons:'fmj',c:.06,L:260,twist:70,action:'auto',rof:600,mag:150,heavy:true,burn:1,wallx:1.3,jacket:1,core:0,hef:.3,fragm:4,zero:200,prop:'cartouche',fill:'tolite',shell:'lisse',fuse:'impact',mods:['roues','bouclier','ailettes'],finish:'kaki',feed:'bande',stock:'sans',tube:'refroidi',...o});
const AT_P=o=>({d:4.5,l:16,nose:'ogive',base:'plat',cons:'tungstene',c:.2,L:600,twist:55,action:'verrou',rof:30,mag:5,heavy:true,burn:1,wallx:1.6,jacket:1,core:0,hef:.3,fragm:4,zero:150,prop:'cartouche',fill:'tolite',shell:'lisse',fuse:'impact',caseD:1.7,mods:['bipied','frein','poignee'],finish:'bleui',feed:'boite',tube:'lourd',stock:'bois',...o});
export const DEFAULT_DESIGNS=[
  ...['meumeu','beee'].map(f=>({id:f==='meumeu'?'canon_mle1':'bee_canon',f,name:f==='meumeu'?'Obusier Mle 1':'Obusier bèè',status:'adopte',base:true,p:kitToP(KIT_PRESETS.find(p=>p.id==='howitzer').design)})),
  // les canons des véhicules meumeu (leur supériorité : les Bèè n'en ont pas) — tirés du kit « canon de campagne », la masse de l'obus à la mesure du
  // calibre (le cube) : un canon de char de 16 mm en tourelle (obus explosif léger, contre les nids et les groupes), un canon d'assaut de 28 mm en
  // casemate (presque l'obus de l'obusier, en tir tendu : contre les ouvrages)
  {id:'canon_char_mle1',f:'meumeu',name:'Canon de char Mle 1',status:'adopte',base:true,p:kitToP({...KIT_PRESETS.find(p=>p.id==='field').design,name:'Canon de char Mle 1',role:'En tourelle',caliberMm:16,barrelLengthCm:46,filler:.2,ogive:.45,coreDensity:6.4,meplat:.24,massG:60,caseLenCm:8,assignedCrew:2,carriage:'none'})},
  {id:'canon_auto_mle1',f:'meumeu',name:'Canon d’assaut Mle 1',status:'adopte',base:true,p:kitToP({...KIT_PRESETS.find(p=>p.id==='field').design,name:'Canon d’assaut Mle 1',role:'En casemate',caliberMm:28,barrelLengthCm:66,filler:.22,ogive:.42,coreDensity:6.3,meplat:.26,massG:320,caseLenCm:13,assignedCrew:2,carriage:'none'})},
  {id:'fusees_mle1',f:'meumeu',name:'Lance-fusées Mle 1',status:'adopte',base:true,p:ROCKET_P(22,110,60,4,.3)},
  // l'armement lourd d'infanterie : une mitrailleuse lourde sur roues et bouclier (puissante, chère, trois servants : faite pour tenir une tranchée et
  // pour appuyer un assaut) et un fusil antichar à bipied (deux servants : il perce le blindage des voitures)
  {id:'mg_lourde_mle1',f:'meumeu',name:'Mitrailleuse lourde Mle 1',status:'adopte',base:true,p:HMG_P({d:2.4,l:9,c:.06,L:260})},
  {id:'bee_mg_lourde',f:'beee',name:'Mitrailleuse lourde bèè',status:'adopte',base:true,p:HMG_P({d:2.0,l:7.0,c:.027,L:230,mag:120,cons:'fmj',nose:'ogive',twist:74,caseMat:'acier'})},
  {id:'at_mle1',f:'meumeu',name:'Fusil antichar Mle 1',status:'adopte',base:true,p:AT_P({})},
  {id:'bee_at',f:'beee',name:'Fusil antichar bèè',status:'adopte',base:true,p:AT_P({d:4.3,l:16,c:.18})},
  {id:'mle1',f:'meumeu',name:'Fusil Mle 1',status:'adopte',base:true,
    p:{d:1.8,l:6.5,nose:'pointue',base:'plat',cons:'fmj',c:.032,L:140,twist:60,action:'verrou',rof:600,mag:5,heavy:false}},
  // (les armes de masse bèè tirent des étuis d'acier laqué : le cuivre manquait aux cartouches pendant vingt jours, le fer débordait par milliers)
  {id:'bee_fusil',f:'beee',name:'Fusil bèè',status:'adopte',base:true,
    p:{d:2.0,l:7.0,nose:'ogive',base:'plat',cons:'fmj',c:.027,L:115,twist:74,action:'verrou',rof:600,mag:5,heavy:false,caseMat:'acier'}},
  {id:'bee_pm',f:'beee',name:'Mitraillette bèè',status:'adopte',base:true,
    p:{d:2.0,l:3.8,nose:'ronde',base:'plat',cons:'fmj',c:.006,L:55,twist:60,action:'auto',rof:550,mag:30,heavy:false,caseMat:'acier'}},
  // l'arsenal bèè : une mitrailleuse sur bipied (la cartouche du fusil, un tambour de 40), un fusil à lunette pour leurs tireurs
  // d'élite, un fusil de chasse à chevrotine pour le corps à corps
  {id:'bee_mg',f:'beee',name:'Mitrailleuse bèè',status:'adopte',base:true,
    p:{d:2.0,l:7.0,nose:'ogive',base:'plat',cons:'fmj',c:.027,L:130,twist:74,action:'auto',rof:650,mag:40,heavy:true,mods:['bipied'],caseMat:'acier'}},
  {id:'bee_lunette',f:'beee',name:'Fusil à lunette bèè',status:'adopte',base:true,
    p:{d:2.0,l:7.4,nose:'pointue',base:'bt',boat:.3,cons:'fmj',c:.03,L:150,twist:70,action:'verrou',rof:600,mag:5,heavy:true,mods:['lunette'],sightMag:4,sightObj:16}},
  {id:'bee_chasse',f:'beee',name:'Fusil de chasse bèè',status:'adopte',base:true,
    p:{d:4.5,l:4.5,nose:'ronde',base:'plat',cons:'chevrotine',c:.05,L:80,twist:4000,action:'pompe',rof:600,mag:5,heavy:false}},
];
// Les bornes du bureau d'études : larges, pour inventer — la physique se charge du reste.
export const LIMITS={d:[.3,100,.05],l:[.5,400,.1],noseScale:[.3,2.2,.01],boat:[0,.9,.01],fragm:[.2,400,.2],c:[.0005,400,.001],L:[8,3000,1],twist:[3,4000,1],rof:[1,4000,1],mag:[1,1000,1],zero:[5,1500,1],sightObj:[3,60,.5],sightMag:[1,16,.5],sightRadius:[2,120,1],sightHeight:[.5,12,.1],hef:[.02,.85,.005],core:[0,.95,.01],jacket:[.2,3.5,.05],wallx:[.35,5,.02],burn:[.25,3,.01],rocketBurn:[.2,5,.01],nozzle:[.5,1.6,.01],
  // l'étui et la balle, dedans et dehors
  caseD:[1.02,2.6,.01],neck:[0,3.5,.05],shoulder:[8,80,1],meplat:[0,.9,.01],cavity:[0,.9,.01],bands:[0,4,1],coreD:[.25,.9,.01],
  // la balle-fusée
  fins:[0,8,1],finSize:[.3,3,.05],cant:[0,25,.5],ignite:[0,300,5],stages:[1,2,1],barrels:[2,8,1],
  // le silencieux : son volume intérieur (cm³), ses chicanes
  supVol:[40,900,10],supBaffles:[2,12,1],
  // l'infrarouge : la lampe (W), la batterie (Wh), la qualité du tube
  irW:[10,150,1],irWh:[40,600,10],irQ:[.5,1.6,.05],irBeam:[8,60,1],irMode:[0,1,1],irFilt:[0,1,1],shieldT:[.3,6,.1],shieldSize:[.6,1.5,.05],shieldH:[4,90,1],shieldW:[3,90,1]};
export const ammoKey=id=>'m:'+id,armKey=id=>'a:'+id;
// ce que pèse un bien, en caisses (les armes pèsent leur masse ; tout le reste compte une caisse)
export function weightOf(k,designs,armors){if(k.startsWith('a:')){const d=designs?.[k.slice(2)];return d?Math.max(.02,derive(d.p).massEmpty/CRATE_KG):.2;}if(k.startsWith('p:')){const a=armors?.[k.slice(2)];return a?Math.max(.05,deriveArmor(a.a).mass/CRATE_KG):.4;}return 1;}
// Ce que coûte une caisse de munitions, une arme, un prototype
export function crateCost(p){const D=derive(p);const k=D.perCrate/1000;return Object.fromEntries(Object.entries(D.costK).map(([r,v])=>[r,+(v*k).toFixed(2)]).filter(([,v])=>v>0));}
export function weaponCost(p){return {...derive(p).costW};}
export function protoCost(p){const D=derive(p);const w=D.costW;return {pieces:+(5+w.pieces*2).toFixed(1),fer:+(w.fer*4+1).toFixed(1),cuivre:1};}
export const PROTO_HOURS=14;
export const PROTO_HOURS_ARMOR=8;
// un éclat (de grenade, d'obus, de bombe) : un petit bout de métal irrégulier qui ne bascule pas
export function fragDesign(mass,d){return {p:{d,nose:'plate',base:'plat',cons:'ap'},m:mass,l:d,Sg:5};}
