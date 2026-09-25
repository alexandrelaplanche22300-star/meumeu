// Les conceptions d'armes. Chaque camp commence avec les siennes ; l'armurerie en invente d'autres.
// Une conception adoptée se fabrique : ses armes (a:<id>) à la manufacture, ses munitions (m:<id>) à l'arsenal.
// Tout voyage en caisses : une caisse de munitions, c'est ce qu'un Meumeu porte, et selon la cartouche elle tient
// quelques centaines ou quelques milliers de coups.
import {derive,CRATE_KG,CONSTRUCTIONS} from './ballistics.js';
import {deriveArmor} from './armor.js';

export const DEFAULT_DESIGNS=[
  {id:'mle1',f:'meumeu',name:'Fusil Mle 1',status:'adopte',base:true,
    p:{d:1.8,l:6.5,nose:'pointue',base:'plat',cons:'fmj',c:.032,L:140,twist:60,action:'verrou',rof:600,mag:5,heavy:false}},
  {id:'bee_fusil',f:'beee',name:'Fusil bèè',status:'adopte',base:true,
    p:{d:2.0,l:7.0,nose:'ogive',base:'plat',cons:'fmj',c:.036,L:150,twist:70,action:'verrou',rof:600,mag:5,heavy:false}},
  {id:'bee_pm',f:'beee',name:'Mitraillette bèè',status:'adopte',base:true,
    p:{d:2.0,l:3.8,nose:'ronde',base:'plat',cons:'fmj',c:.006,L:55,twist:60,action:'auto',rof:550,mag:30,heavy:false}},
];
// Les bornes du bureau d'études : larges, pour inventer — la physique se charge du reste.
export const LIMITS={d:[.5,14,.1],l:[.8,70,.1],c:[.001,30,.001],L:[15,480,1],twist:[5,800,1],rof:[60,1400,10],mag:[1,250,1],zero:[10,200,5]};
export const ammoKey=id=>'m:'+id,armKey=id=>'a:'+id;
// ce que pèse un bien, en caisses (les armes pèsent leur masse ; tout le reste compte une caisse)
export function weightOf(k,designs,armors){if(k.startsWith('a:')){const d=designs?.[k.slice(2)];return d?Math.max(.02,derive(d.p).massEmpty/CRATE_KG):.2;}if(k.startsWith('p:')){const a=armors?.[k.slice(2)];return a?Math.max(.05,deriveArmor(a.a).mass/CRATE_KG):.4;}return 1;}
// Ce que coûte une caisse de munitions, une arme, un prototype
export function crateCost(p){const D=derive(p);const k=D.perCrate/1000;return Object.fromEntries(Object.entries(D.costK).map(([r,v])=>[r,+(v*k).toFixed(2)]).filter(([,v])=>v>0));}
export function weaponCost(p){return {...derive(p).costW};}
export function protoCost(p){const D=derive(p);const w=D.costW;return {pieces:+(4+w.pieces*2).toFixed(1),fer:+(w.fer*4+1).toFixed(1),sels:1,...(CONSTRUCTIONS[p.cons].rare?{[CONSTRUCTIONS[p.cons].rare]:2}:{})};}
export const PROTO_HOURS=14;
// un éclat (de grenade, d'obus, de bombe) : un petit bout de métal irrégulier qui ne bascule pas
export function fragDesign(mass,d){return {p:{d,nose:'plate',base:'plat',cons:'ap'},m:mass,l:d,Sg:5};}
