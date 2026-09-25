// Les protections. Quatre zones — le casque, le plastron, le dos, les flancs et épaules — chacune d'un matériau et d'une
// épaisseur. La balle arrive : sa perforation (de Marre, en mm d'acier) contre l'épaisseur équivalente de la plaque (plus
// épaisse si elle arrive de biais, moins si la plaque a déjà été frappée). Plus forte, elle passe, ralentie et déjà basculée ;
// plus faible, elle s'arrête — et le choc passe quand même. Chaque millimètre se paie : le poids ralentit le soldat et le fait
// viser moins vite. Huit matériaux, chacun son défaut :
//  · les tissus (toile, cuir, lin collé en couches, soie de falaise) : légers, souples ; ils arrêtent les balles lentes et
//    les éclats, mais une balle rapide les tranche (vs : sous cette vitesse ils tiennent ; vcut : au-dessus, ils ne font rien) ;
//  · la plaque d'acier : encaisse coup sur coup, mais lourde ;
//  · la céramique : deux fois et demie l'acier à poids égal, mais elle se fissure — chaque balle arrêtée l'use ;
//  · le composite : une face de céramique collée sur un dos de soie — le meilleur des deux, cher à faire ;
//  (le composite est le meilleur)
import {BODY_KG,regionAt} from './body.js';

export const MATS={
  toile:{name:'Toile épaisse',k:.2,rho:1.1,brittle:0,soft:1,vs:260,vcut:420,cost:{pieces:.4,vivres:.6},col:'#cdbb8f',desc:'des couches de toile piquée : arrête les éclats et les balles de pistolet lentes (sous 260 m/s) ; rien au-delà de 420'},
  cuir:{name:'Cuir bouilli',k:.3,rho:1.2,brittle:.02,soft:1,vs:300,vcut:460,cost:{vivres:1.5},col:'#7a4a28',desc:'du cuir durci à l’eau bouillante : un peu mieux que la toile, plus raide, plus lourd'},
  lin:{name:'Lin collé en couches',k:.3,rho:1.3,brittle:.03,soft:1,vs:340,vcut:500,cost:{vivres:1.2,pieces:.2},col:'#e6dcc4',desc:'des feuilles de lin collées en carapace, comme les cuirasses antiques : arrête les éclats et les balles lentes'},
  acier:{name:'Plaque d’acier trempé',col:'#7c8792',k:1,rho:7.85,brittle:.04,cost:{fer:1.2},desc:'encaisse coup sur coup ; lourd'},
  ceramique:{name:'Céramique',col:'#e9e6df',k:2.4,rho:3.1,brittle:.34,cost:{pierre:2},desc:'arrête bien plus que l’acier à poids égal, mais se fissure à chaque balle'},
  soie:{name:'Soie de falaise tissée',k:.35,rho:1.35,brittle:0,soft:1,vs:520,vcut:650,col:'#6fb3a8',cost:{soie:1},desc:'légère : arrête les balles lentes (sous 520 m/s) et les éclats ; une balle de fusil (au-delà de 650 m/s) la tranche'},
  composite:{name:'Composite (céramique sur soie)',k:2.9,rho:2.3,brittle:.2,col:'#4f5f4a',cost:{pierre:1.2,soie:.4},desc:'une face de céramique qui brise la pointe, un dos de soie qui retient les morceaux : la meilleure protection, chère en soie ; longue à fabriquer'},
};
export const ZONES={casque:{name:'Casque',area:.0085,max:4},plastron:{name:'Plastron',area:.011,max:8},dos:{name:'Dos',area:.011,max:8},flancs:{name:'Flancs et épaules',area:.008,max:6}};
export const DEFAULT_ARMORS=[
  {id:'casque',f:'meumeu',name:'Casque Mle 1',status:'adopte',base:true,a:{casque:['acier',.8],plastron:['acier',0],dos:['acier',0],flancs:['acier',0]}},
  {id:'gilet',f:'meumeu',name:'Gilet de soie',status:'adopte',base:true,a:{casque:['acier',.8],plastron:['soie',4],dos:['soie',4],flancs:['soie',3]}},
  {id:'bee_casque',f:'beee',name:'Casque bèè',status:'adopte',base:true,a:{casque:['acier',1],plastron:['acier',0],dos:['acier',0],flancs:['acier',0]}},
  {id:'bee_plaque',f:'beee',name:'Plastron bèè',status:'adopte',base:true,a:{casque:['acier',1],plastron:['acier',1.2],dos:['acier',0],flancs:['acier',0]}},
];
const cache=new Map();
export function deriveArmor(a){const key=JSON.stringify(a);let D=cache.get(key);if(D)return D;let mass=0;const cost={};const zones={};
  for(const [z,Z] of Object.entries(ZONES)){const [m,t]=a[z]||['acier',0];const M=MATS[m];const kg=Z.area*t*M.rho;mass+=kg;zones[z]={mat:m,t,eq:t*M.k,kg};
    for(const [r,v] of Object.entries(M.cost))cost[r]=(cost[r]||0)+v*kg/.05;}
  for(const k in cost)cost[k]=+cost[k].toFixed(2);cost.pieces=+(.3+mass*4).toFixed(2);
  D={a,mass,zones,cost,hours:2+mass*25,move:Math.max(.35,1-mass/BODY_KG*1.8),aim:1+mass/BODY_KG*1.2};cache.set(key,D);return D;}
// où la balle entre-t-elle ? le casque couvre le haut du crâne (pas le museau) ; le plastron le devant du poitrail et du ventre,
// le dos l'arrière ; les flancs les côtés et le haut des bras
export function plateZone(p){const r=regionAt(p);if(!r)return null;const id=r.id;
  if(id==='tete'&&p[1]>.25)return 'casque';if(id==='thorax'||id==='abdomen'){if(Math.abs(p[0])>.042&&Math.abs(p[2])<.03)return 'flancs';return p[2]>=0?'plastron':'dos';}
  if(id.startsWith('bras')&&p[1]>.15)return 'flancs';return null;}
// une fibre tissée arrête bien une balle lente ; une balle rapide la tranche
export function softK(M,v){if(!M.soft)return 1;const a=M.vs||520,b=M.vcut||650;return v<a?3.2:v>b?.4:3.2+(v-a)/(b-a)*(.4-3.2);}
// La balle contre la plaque. Renvoie : arrêtée (et le choc transmis), ou passée (et sa vitesse après).
export function armorHit(D,zone,u,proj,v,pen,rnd){const Z=D.zones[zone];if(!Z||Z.t<=0)return null;const M=MATS[Z.mat];u.plates??={};const integ=u.plates[zone]??1;
  const obl=.72+rnd()*.28;let eq=Z.eq*Math.max(.15,integ)/obl*softK(M,v);
  if(pen>eq){u.plates[zone]=Math.max(0,integ-M.brittle*.6);return {stopped:false,v:v*Math.sqrt(Math.max(0,1-(eq/pen)**2)),eq};}
  u.plates[zone]=Math.max(0,integ-M.brittle);const E=.5*proj.m/1000*v*v;return {stopped:true,blunt:E*(M.soft?.35:.15),eq,mat:Z.mat};}
// ce qu'une protection arrête : une munition, à une distance
export function stopsAt(D,W,R){const v=W.at(R).v;const pen=W.pen(v);const out={};for(const [z,Z] of Object.entries(D.zones)){if(Z.t<=0){out[z]=null;continue;}const M=MATS[Z.mat];let eq=Z.eq*.85*softK(M,v);out[z]={stops:pen<=eq,pen,eq,v2:pen>eq?v*Math.sqrt(1-(eq/pen)**2):0};}return out;}
