// La recherche des Meumeu (V12.7) : ce qu'on sait faire, ce qu'une conception demande, ce que les savants proposent.
//
// L'ÉTAT DE L'ART (s.research.art) : pour chaque axe technique, ce que nos armes adoptées ont déjà prouvé — la contrainte de tube tenue, l'énergie
// d'une charge, la cadence, la masse d'explosif d'un obus, la portée calculée, les mécanismes, fusées d'obus, guidages… connus.
// UNE CONCEPTION DU JOUEUR, analysée contre l'état de l'art, devient des TÂCHES chiffrées avec ses propres valeurs (« Tube de 36 mm à 240 MPa —
// 8 640 MPa·mm, nous tenons 6 500 »). Ce qui est déjà maîtrisé ne coûte rien ; chaque écart a son métier, son bâtiment et ses heures-savants.
// Une tâche finie fait avancer l'état de l'art : la découverte, c'est le joueur qui repousse la frontière avec ses propres armes.
// LES LEVIERS : ce qu'un ingénieur, un chimiste ou un physicien peut proposer en réunion — une variante réelle de la conception (le tube plus épais,
// la poudre plus lente, l'ogive effilée…), recalculée par la balistique, avec ce qu'elle change aux performances et au programme.
// Tout est en tables : un axe, un levier, une réplique s'ajoutent en une entrée.
import {derive,kitToP,kitSuggestMass,fmt,ACTIONS,CONSTRUCTIONS,GUIDES} from './ballistics.js';
import {FILLS,SHELLS,FUSES,flight} from './explosive.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mm=v=>`${fmt(v,v<10?1:0)} mm`,gr=g=>g<1?`${Math.round(g*1000)} mg`:`${fmt(g,g<10?1:0)} g`,kg=v=>v<1?`${Math.round(v*1000)} g`:`${fmt(v,1)} kg`;
const dist=m=>m>=1000?`${fmt(m/1000,1)} km`:`${Math.round(m)} m`;
const pct=(a,b)=>b?Math.round((a/b-1)*100):0;
// le facteur de paroi d'un tube (1 = la paroi ordinaire) : le fiche continue (kit) dit le profil du tube, l'ancien modèle l'épaisseur
export const wallF=p=>p.kit?(.5+clamp(p.kit.barrelProfile??.38,0,1))/.88:(p.wallx||1)*(p.heavy?1.25:1);
// le tir courbe d'une arme à obus : sa portée maximale (m) ; sinon la portée utile du tir tendu
export const indirect=D=>!!(D.he&&!D.he.shaped&&D.p.d>=5);
// (la portée maximale : quelques angles autour de 45° suffisent ; gardée sur la conception calculée, que la balistique met en cache)
export function rangeOf(D){if(D._rng!=null)return D._rng;let r=D.eff;if(indirect(D)||D.rocket){try{let m=0;for(const deg of D.rocket?[25,32,39,45,51]:[38,42,45,48])m=Math.max(m,flight(D.v0,D.BC,deg,D.boost).x);r=m;}catch(e){}}return D._rng=r;}

// ---------- les métiers ----------
export const ROLES={
  ingenieur:{name:'Ingénieur',plural:'ingénieurs',at:'armurerie',ico:'⚙',col:'#e0a050',what:'tube, culasse, mécanisme, fusée d’obus, affût, dossier de fabrication, essai'},
  chimiste:{name:'Chimiste',plural:'chimistes',at:'labo',ico:'⚗',col:'#6fcf8f',what:'poudres, charges propulsives, explosifs, chargement des obus, moteurs-fusées'},
  physicien:{name:'Physicien',plural:'physiciens',at:'centre_recherche',ico:'∫',col:'#9fc4e8',what:'trajectoires et tables de tir, stabilité en vol, optique, guidage'},
};

// ---------- les axes de l'état de l'art ----------
// type 'metric' : une grandeur ; maîtrisé jusqu'à la plus grande déjà prouvée (key : une valeur par sorte — l'explosif par remplissage)
// type 'set' : une technique ; maîtrisée si elle est déjà connue
// type 'probleme' : un défaut de la conception à résoudre (pas une frontière)
// W : heures-savants d'une tâche pour un écart d'un doublement (ou une technique nouvelle)
export const AXES=[
  // (la contrainte d'une paroi suit la pression : à épaisseur proportionnelle au calibre, un gros tube n'est pas plus tendu qu'un petit — le calibre a son axe)
  {id:'tube',name:'Le tube',role:'ingenieur',type:'metric',W:5,unit:'MPa',
    val:(p,D)=>D.rocket?null:D.P/wallF(p),
    label:(p,D)=>`Tube de ${mm(p.d)} à ${Math.round(D.P)} MPa`,
    think:(p,D)=>[`${Math.round(D.P)} MPa… l’acier tiendra-t-il ?`,`Épreuve du tube à ${Math.round(D.P*1.25)} MPa`,`Usure : ${D.life} coups avant de changer le tube`,`Fretter le tube à chaud ?`,`Paroi ×${fmt(wallF(p),2)}`]},
  {id:'calibre',name:'L’usinage du calibre',role:'ingenieur',type:'metric',W:4,unit:'mm',
    val:(p,D)=>p.d,label:(p,D)=>`Usiner un calibre de ${mm(p.d)}`,
    think:(p,D)=>[`Aléser ${mm(p.d)} sur ${Math.round(p.L)} mm`,`Il faut un tour plus long`,`Tolérance : un dixième de millimètre`]},
  {id:'charge',name:'La charge propulsive',role:'chimiste',type:'metric',W:4,unit:'J',
    val:(p,D)=>D.rocket?null:D.E0,label:(p,D)=>`Charge propulsive : ${D.E0>=1000?fmt(D.E0/1000,1)+' kJ':Math.round(D.E0)+' J'} à la bouche`,
    think:(p,D)=>[`Vivacité ×${fmt(p.burn??1,2)}`,`Rendement : ${Math.round(D.eta*100)} %`,`Un grain plus lent ?`,`${Math.round(D.v0)} m/s… il en faut plus`,`La poudre brûle trop tôt`]},
  {id:'mecanisme',name:'Le mécanisme',role:'ingenieur',type:'set',W:6,
    val:(p,D)=>p.action,label:(p,D)=>`Mécanisme : ${ACTIONS[p.action]?.name||p.action}`,
    think:(p,D)=>[`${ACTIONS[p.action]?.name||'La culasse'} : le verrouillage`,`Enrayage : ${fmt(D.jam*100,1)} %`,`Le ressort récupérateur…`]},
  {id:'cadence',name:'La cadence',role:'ingenieur',type:'metric',W:4,unit:'coups/min',
    val:(p,D)=>ACTIONS[p.action]?.auto?D.rpm:null,label:(p,D)=>`Cadence de ${D.rpm} coups/min`,
    think:(p,D)=>[`${D.rpm} coups/min, ${D.sustain} sans surchauffe`,`Le tube chauffe trop vite`,`Alléger la culasse mobile ?`]},
  {id:'projectile',name:'Le projectile',role:'ingenieur',type:'set',W:4,
    val:(p,D)=>String(p.cons).startsWith('cx:')?'composite':p.cons,label:(p,D)=>`Projectile : ${CONSTRUCTIONS[p.cons]?.name||p.cons}`,
    think:(p,D)=>[`${gr(D.m)} de projectile`,`Perce ${fmt(D.pen(D.at(30).v),1)} mm à 30 m`,`La chemise doit tenir la rayure`]},
  {id:'explosif',name:'Le chargement des obus',role:'chimiste',type:'metric',W:4,unit:'g',key:p=>p.fill||'tolite',
    val:(p,D)=>D.he&&!D.he.shaped?D.he.g:null,label:(p,D)=>`Obus chargé de ${gr(D.he.g)} de ${(FILLS[p.fill]||FILLS.tolite).name.toLowerCase()}`,
    think:(p,D)=>[`${gr(D.he.g)} de ${(FILLS[p.fill]||FILLS.tolite).name.toLowerCase()}`,`Souffle mortel à ${fmt(D.he.blast,1)} m`,`${D.he.n} éclats utiles`,`Couler la charge sans bulle d’air`]},
  {id:'remplissage',name:'L’explosif',role:'chimiste',type:'set',W:6,
    val:(p,D)=>D.he&&!D.he.shaped?(p.fill||'tolite'):null,label:(p,D)=>`Remplissage : ${(FILLS[p.fill]||FILLS.tolite).name.toLowerCase()}`,
    think:(p,D)=>[`${(FILLS[p.fill]||FILLS.tolite).name} : stabilité ?`,`Équivalent tolite ×${fmt((FILLS[p.fill]||FILLS.tolite).k,2)}`]},
  {id:'fusee_obus',name:'La fusée d’obus',role:'ingenieur',type:'set',W:4,
    val:(p,D)=>D.he&&!D.he.shaped?(p.fuse||'impact'):null,label:(p,D)=>`Fusée d’obus ${(FUSES[p.fuse]||FUSES.impact).name.toLowerCase()}`,
    think:(p,D)=>[`Le percuteur doit tenir le départ`,`Armer après dix mètres de vol`,`${(FUSES[p.fuse]||FUSES.impact).name} : à quelle hauteur ?`]},
  {id:'coque',name:'La coque d’obus',role:'ingenieur',type:'set',W:3,
    val:(p,D)=>D.he&&!D.he.shaped?(p.shell||'lisse'):null,label:(p,D)=>`Coque ${(SHELLS[p.shell]||SHELLS.lisse).name.toLowerCase()}`,
    think:(p,D)=>[`${D.he.n} éclats de ${Math.round((p.fragm??4))} mg`,`Rainurer l’intérieur de la coque`]},
  {id:'portee',name:'La trajectoire',role:'physicien',type:'metric',W:4,unit:'m',
    val:(p,D)=>rangeOf(D)||null,label:(p,D)=>indirect(D)||D.rocket?`Table de tir jusqu’à ${dist(rangeOf(D))}`:`Balistique extérieure jusqu’à ${dist(D.eff)}`,
    think:(p,D)=>[`Angle 45° : ${dist(rangeOf(D))}`,`Coefficient balistique ${fmt(D.BC,0)}`,`La traînée à ${Math.round(D.v0)} m/s`,`Corriger la dérive…`,`Encore une colonne de la table`]},
  {id:'moteur',name:'Le moteur-fusée',role:'chimiste',type:'metric',W:5,unit:'m/s',
    val:(p,D)=>D.rocket&&D.boost?D.boost.dv:null,label:(p,D)=>`Moteur-fusée : Δv ${Math.round(D.boost.dv)} m/s`,
    think:(p,D)=>[`Δv = 1500 × ln(m₀/m₁)`,`Le grain doit brûler en ${fmt(D.boost.tb,2)} s`,`La tuyère érode`,`Coulée du propergol…`]},
  {id:'etages',name:'Les étages',role:'ingenieur',type:'set',W:8,
    val:(p,D)=>D.rocket?String(p.stages||1):null,label:(p,D)=>`${(p.stages||1)>=2?'Fusée à deux étages':'Fusée à un étage'}`,
    think:(p,D)=>[`Séparer le premier étage en vol`,`Le second s’allume après ${fmt((D.boost?.tb||.3)*.55,2)} s`]},
  {id:'guidage',name:'Le guidage',role:'physicien',type:'set',W:8,
    val:(p,D)=>D.rocket?(p.guide||'aucun'):null,label:(p,D)=>`Guidage : ${(GUIDES[p.guide]||GUIDES.aucun).name.toLowerCase()}`,
    think:(p,D)=>[`Garder l’axe pendant la poussée`,`Dispersion ×${fmt((GUIDES[p.guide]||GUIDES.aucun).disp,2)}`]},
  {id:'optique',name:'L’optique',role:'physicien',type:'metric',W:3,unit:'×',
    val:(p,D)=>D.sightMag>1?D.sightMag:null,label:(p,D)=>`Lunette ×${fmt(D.sightMag,1)}`,
    think:(p,D)=>[`Tailler la lentille…`,`Grossissement ×${fmt(D.sightMag,1)}`,`Il voit à ${Math.round(D.seeM||0)} m`]},
  {id:'infrarouge',name:'L’infrarouge',role:'physicien',type:'set',W:7,
    val:(p,D)=>D.mods.includes('infrarouge')?'ir':null,label:()=>`Viseur infrarouge`,think:()=>[`Le tube intensificateur…`,`Filtrer la lampe`]},
  {id:'silencieux',name:'Le silencieux',role:'ingenieur',type:'set',W:5,
    val:(p,D)=>D.sup?'sup':null,label:(p,D)=>`Silencieux de ${Math.round(p.supVol??250)} cm³`,think:(p,D)=>[`${D.dB} dB…`,`Une chicane de plus ?`]},
  {id:'affut',name:'L’affût',role:'ingenieur',type:'metric',W:3,unit:'kg',
    val:(p,D)=>D.crew>1||D.have!=='epaule'?D.mass:null,label:(p,D)=>`Affût pour ${kg(D.mass)}, ${D.crew} servant${D.crew>1?'s':''}`,
    think:(p,D)=>[`${kg(D.mass)} à pousser`,`Recul ${fmt(D.recoil,1)} J dans l’affût`]},
  // les défauts à résoudre : ils ne repoussent rien, mais il faut y passer
  {id:'stabilite',name:'La stabilité en vol',role:'physicien',type:'probleme',W:6,
    val:(p,D)=>!D.rocket&&!ACTIONS[p.action]?.mortar&&D.Sg<1.3?D.Sg:null,label:(p,D)=>`Stabiliser le projectile (Sg ${fmt(D.Sg,2)})`,
    think:(p,D)=>[`Sg ${fmt(D.Sg,2)} : il bascule`,`Pas de rayure ${Math.round(p.twist)} mm…`,`Raccourcir le pas ?`]},
  {id:'surcharge',name:'La surcharge',role:'ingenieur',type:'probleme',W:5,
    val:(p,D)=>D.overload||!D.mountOk?1:null,label:(p,D)=>`Trop lourde pour son affût (${kg(D.mass)})`,think:()=>[`L’affût plie`,`Il faut un trépied, ou des roues`]},
];
export const AXIS=Object.fromEntries(AXES.map(a=>[a.id,a]));
// les deux tâches de tout programme : le dossier de fabrication (la manufacture saura faire) et l'essai de tir (au bureau d'études, dehors)
export const FIXED={
  dossier:{id:'dossier',name:'Le dossier de fabrication',role:'ingenieur',label:(p,D)=>`Dossier de fabrication : ${D.name}, ${kg(D.massEmpty)}`,think:(p,D)=>[`Cote ${fmt(p.d,1)} mm, tolérance…`,`${Math.round(D.hoursW*10)/10} h de manufacture par arme`,`La gamme d’usinage`]},
  essai:{id:'essai',name:'L’essai de tir',role:'ingenieur',label:(p,D)=>`Essai de tir : trente coups au polygone`,think:(p,D)=>[`Dispersion mesurée : ${fmt(D.moa,1)} MOA`,`${Math.round(D.v0)} m/s au chronographe`,`Le tube a tenu`,`Encore une série`]},
};

// ---------- l'état de l'art ----------
export function artInit(designs){const A={};for(const d of designs){if(!d||(d.status!=='adopte'&&d.status!=='engin'))continue;let D;try{D=derive(d.p);}catch(e){continue;}artPush(A,d.p,D);}return A;}
// ce que prouve une conception adoptée (ou une tâche finie : seulement son axe)
export function artPush(A,p,D,only=null){for(const ax of AXES){if(ax.type==='probleme'||(only&&ax.id!==only))continue;const v=ax.val(p,D);if(v==null)continue;
    if(ax.type==='metric'){const k=ax.key?ax.id+':'+ax.key(p):ax.id;A[k]=Math.max(A[k]||0,v);}else{const k=ax.id;A[k]??=[];if(!A[k].includes(v))A[k].push(v);}}return A;}
export function artOf(A,ax,p){return ax.type==='metric'?(A[ax.key?ax.id+':'+ax.key(p):ax.id]||0):(A[ax.id]||[]);}

// ---------- l'analyse d'une conception : les tâches ----------
// n : l'écart (en doublements, ou 1 pour une technique nouvelle) ; work : heures-savants
export function analyze(p,A){const D=derive(p);const tasks=[];
  for(const ax of AXES){const v=ax.val(p,D);if(v==null)continue;let n=0,gap='';const a=artOf(A,ax,p);
    if(ax.type==='metric'){if(!a){n=1.4;gap='jamais fait';}else if(v>a*1.02){n=Math.log2(v/a);gap=`${fmtV(v,ax)} contre ${fmtV(a,ax)} maîtrisés (+${pct(v,a)} %)`;}}
    else if(ax.type==='set'){if(!a.includes(v)){n=1;gap='technique nouvelle';}}
    else if(ax.type==='probleme'){n=1;gap='défaut à corriger';}
    if(n<=0)continue;n=Math.min(3,n);tasks.push({ax:ax.id,role:ax.role,label:ax.label(p,D),gap,v,a:ax.type==='metric'?a:null,n:+n.toFixed(2),work:+(ax.W*(.6+1.6*n)).toFixed(1)});}
  const nov=tasks.reduce((s,t)=>s+t.n,0);
  tasks.push({ax:'dossier',role:'ingenieur',label:FIXED.dossier.label(p,D),gap:'',v:0,a:null,n:0,work:+(2+Math.min(6,D.hoursW*.35)).toFixed(1)});
  tasks.push({ax:'essai',role:'ingenieur',label:FIXED.essai.label(p,D),gap:'',v:0,a:null,n:0,work:+(2+1.5*nov).toFixed(1),after:true});
  const work=tasks.reduce((s,t)=>s+t.work,0);return {D,tasks,work:+work.toFixed(1),nov:+nov.toFixed(2)};}
const fmtV=(v,ax)=>ax.unit==='J'?(v>=1000?fmt(v/1000,1)+' kJ':Math.round(v)+' J'):ax.unit==='m'?dist(v):ax.unit==='g'?gr(v):ax.unit==='kg'?kg(v):ax.unit==='×'?'×'+fmt(v,1):ax.unit==='mm'?mm(v):`${Math.round(v)} ${ax.unit}`;
export const thinkOf=(t,p,D)=>{const ax=AXIS[t.ax]||FIXED[t.ax];try{return ax?.think?.(p,D)||[];}catch(e){return [];}};

// ---------- ce qu'on mesure d'une conception ----------
// (sign : +1 plus c'est grand mieux c'est ; −1 l'inverse)
export const KEYNUMS=[
  ['v0','Vitesse','m/s',0,1],['range','Portée','m',0,1],['blast','Souffle mortel','m',1,1],['lethal','Éclats mortels','m',1,1],['pen','Perforation','mm',1,1],
  ['Sg','Stabilité','',2,1],['moa','Dispersion','MOA',1,-1],['rk','Recul','',2,-1],['P','Pression','MPa',0,-1],['life','Vie du tube','coups',0,1],
  ['rpm','Cadence','coups/min',0,1],['sustain','Cadence tenue','coups/min',0,1],['jam','Enrayages','',3,-1],['mass','Masse','kg',2,-1],['carry','Coups portés','',0,1],['cost','Fabrication','pièces',1,-1]];
export function nums(D){if(D._nums)return D._nums;const he=D.he&&!D.he.shaped?D.he:null;return D._nums={rpm:ACTIONS[D.p.action]?.auto?D.rpm:0,v0:D.rocket?D.boost?.dv||D.v0:D.v0,range:rangeOf(D),blast:he?.blast||0,lethal:he?.lethal||0,pen:D.he?0:D.pen(D.at(30).v),
  Sg:D.rocket||ACTIONS[D.p.action]?.mortar?5:Math.min(5,D.Sg),moa:D.moa,rk:D.rk,P:D.rocket?0:D.P,life:D.life,sustain:ACTIONS[D.p.action]?.auto?Math.min(D.sustain,D.rpm*3):0,jam:D.jam||0,mass:D.mass,carry:D.carry,
  cost:(D.costW.pieces||0)+(D.costW.fer||0)*.5+(D.costW.cuivre||0)};}
export function effects(D0,D1){const a=nums(D0),b=nums(D1),out=[];for(const [k,name,u,dec,sign] of KEYNUMS){const x=a[k],y=b[k];if(!isFinite(x)||!isFinite(y))continue;const rel=x?(y-x)/Math.abs(x):y?1:0;if(Math.abs(rel)<.03)continue;
    out.push({k,name,u,dec,from:x,to:y,rel:+rel.toFixed(3),good:rel*sign>0});}return out;}
export const fxTxt=e=>`${e.name} ${e.rel>0?'+':'−'}${Math.round(Math.abs(e.rel)*100)} %`;
// ce que vaut l'arme dans son emploi : un indice relatif (seuls les rapports comptent) — ce que les savants cherchent à améliorer
export function roleOf(D){return D.rocket?'fusee':indirect(D)?'piece':ACTIONS[D.p.action]?.auto&&(D.crew>1||D.feed?.belt)?'mitrailleuse':['ap','tungstene'].includes(D.p.cons)?'antichar':'fusil';}
export function merit(D){const n=nums(D),r=roleOf(D),m=Math.max(.02,n.mass),st=n.Sg<1.3?Math.max(.15,n.Sg/1.3):1;
  if(r==='fusee')return Math.sqrt(n.range)*(n.blast+n.lethal+.1)/Math.pow(Math.max(1,n.moa),.4);
  if(r==='piece')return Math.sqrt(n.range)*(n.blast+n.lethal+.1)/Math.pow(m,.25)*(n.P>620?.3:1);
  if(r==='mitrailleuse')return n.range*Math.min(1,n.sustain/Math.max(1,D.rpm))*Math.pow(D.rpm,.3)/Math.pow(m,.4)/(1+5*n.jam)*st;
  if(r==='antichar')return (n.pen+.1)/Math.pow(m,.3)/(1+n.rk)*st;
  return n.range/Math.sqrt(Math.max(.5,n.moa))/(1+n.rk)/Math.pow(m,.3)*st*(n.P>620?.3:1);}

// ---------- les paramètres qu'un savant peut faire varier ----------
// les fiches continues (p.kit) changent dans la fiche, puis la balistique recalcule le modèle ; l'ancien modèle change ses champs
const KEEP=['fill','shell','fuse','stages','guide','cant','finSize','nozzle','ignite','fragm','caseMat','rim','feed','tube','bands','noseScale','cavity','coreD','neck','shoulder','caseD','mods'];
export function variant(p,f){const q=JSON.parse(JSON.stringify(p));if(q.kit){const k=q.kit;delete k._sourceP;delete k._sourceK;f(k,q);const r=kitToP(k);for(const x of KEEP)if(q[x]!==undefined&&x!=='mods')r[x]=q[x];r.kit=k;return r;}f(null,q);return q;}
const scaleMass=(k,f)=>{const m0=kitSuggestMass(k);f();const m1=kitSuggestMass(k);if(m0>0)k.massG=Math.max(.05,+(k.massG*m1/m0).toFixed(3));};
export const PARAMS={
  calibre:{name:'le calibre',u:'mm',dec:1,get:p=>p.kit?p.kit.caliberMm:p.d,
    set:(k,q,v)=>{if(k)scaleMass(k,()=>{k.caliberMm=+v.toFixed(2);});else{const r=v/q.d;q.d=+v.toFixed(2);q.l=+(q.l*r).toFixed(2);q.c=+(q.c*r**3).toFixed(4);q.twist=Math.round(q.twist*r);}}},
  balle:{name:'la longueur du projectile',u:'calibres',dec:1,get:p=>p.kit?p.kit.lengthCal:p.l/p.d,
    set:(k,q,v)=>{if(k)scaleMass(k,()=>{k.lengthCal=+v.toFixed(2);});else q.l=+(v*q.d).toFixed(2);}},
  tube:{name:'la longueur du tube',u:'cm',dec:1,get:p=>p.kit?p.kit.barrelLengthCm:p.L/10,set:(k,q,v)=>{if(k)k.barrelLengthCm=+v.toFixed(1);else q.L=Math.round(v*10);}},
  paroi:{name:'l’épaisseur du tube',u:'×',dec:2,get:p=>wallF(p),set:(k,q,v)=>{if(k)k.barrelProfile=+clamp(v*.88-.5,0,1).toFixed(2);else q.wallx=+clamp(v/(q.heavy?1.25:1),.35,5).toFixed(2);}},
  pas:{name:'le pas de rayure',u:'cm',dec:1,ok:p=>p.kit?p.kit.rifled!==false:p.twist<4000,get:p=>p.kit?p.kit.twistCm:p.twist/10,set:(k,q,v)=>{if(k)k.twistCm=+v.toFixed(1);else q.twist=Math.max(3,Math.round(v*10));}},
  charge:{name:'la charge de poudre',u:'',dec:2,get:p=>p.kit?p.kit.loadDensity:p.c,set:(k,q,v)=>{if(k)k.loadDensity=+clamp(v,.2,1.05).toFixed(3);else q.c=+Math.max(.0005,v).toFixed(4);}},
  vivacite:{name:'la vivacité de la poudre',u:'×',dec:2,get:p=>p.kit?(p.kit.vivacity??1):(p.burn??1),set:(k,q,v)=>{v=+clamp(v,.35,2.5).toFixed(2);if(k)k.vivacity=v;q.burn=v;}},
  ogive:{name:'l’ogive',u:'',dec:2,get:p=>p.kit?(p.kit.ogive??.5):({pointue:.78,ogive:.5,ronde:.28,plate:.1}[p.nose]??.5),set:(k,q,v)=>{if(k)k.ogive=+clamp(v,0,.95).toFixed(2);else q.nose=v>.65?'pointue':v>.38?'ogive':v>.2?'ronde':'plate';}},
  culot:{name:'le culot en dépouille',u:'',dec:2,get:p=>p.kit?(p.kit.boattail??0):(p.boat??(p.base==='bt'?.3:0)),set:(k,q,v)=>{v=+clamp(v,0,.4).toFixed(2);if(k)k.boattail=v;else{q.boat=v;q.base=v>.1?'bt':'plat';}}},
  cadence:{name:'la cadence',u:'coups/min',dec:0,get:p=>p.kit?(p.kit.rof??p.rof??500):(p.rof||500),set:(k,q,v)=>{v=Math.max(30,Math.round(v));if(k)k.rof=v;q.rof=v;}},
  // (V12.8) la proportion de combustible d'un thermobarique (le reste : le cœur de tolite)
  combustible:{name:'la part de combustible',u:'%',dec:2,ok:p=>!!FILLS[p.fill]?.tb,get:p=>FILLS[p.fill]?.tb?(p.tbf??FILLS[p.fill].tb.f0):null,set:(k,q,v)=>{q.tbf=+clamp(v,.1,.92).toFixed(2);}},
  remplissage:{name:'la part d’explosif',u:'%',dec:2,get:p=>p.kit?(p.kit.filler??0):(p.hef??.3),set:(k,q,v)=>{if(k)k.filler=+clamp(v,.1,.55).toFixed(3);q.hef=+clamp(v,.02,.85).toFixed(3);}},
  moteur:{name:'l’impulsion du moteur',u:'N·s',dec:0,get:p=>p.kit?(p.kit.motorNs||0):(p.c||0),set:(k,q,v)=>{if(k)k.motorNs=+Math.max(1,v).toFixed(1);else q.c=+Math.max(.001,v).toFixed(4);}},
  ailettes:{name:'les ailettes',u:'',dec:0,get:p=>p.kit?(p.kit.fins??4):(p.fins??4),set:(k,q,v)=>{v=Math.round(clamp(v,0,8));if(k)k.fins=v;q.fins=v;q.finSize=Math.min(3,(q.finSize??1)+(v>4?.2:0));}},
};
const pv=(p,id)=>{try{return PARAMS[id].get(p);}catch(e){return null;}};
const setP=(p,id,v)=>variant(p,(k,q)=>PARAMS[id].set(k,q,v));
// une variante qui touche plusieurs choses d'un coup (p de départ, liste [paramètre ou champ, valeur])
export function applyEdit(p,edits){let q=p;for(const [id,v] of edits){if(PARAMS[id])q=setP(q,id,v);else if(id==='muzzle')q=variant(q,(k,r)=>{if(k)k.muzzle=v;else r.mods=[...new Set([...(r.mods||[]).filter(m=>!['frein','cacheflamme','manchon'].includes(m)),...(v==='brake'?['frein']:v==='flash'?['cacheflamme']:[])])];});
    else if(id==='sight')q=variant(q,(k,r)=>{if(k){k.sight='optic';k.magnification=v;}else{r.mods=[...new Set([...(r.mods||[]),'lunette'])];r.sightMag=v;}});
    else if(id==='carriage')q=variant(q,(k,r)=>{if(k)k.carriage=v;});else if(id==='material')q=variant(q,(k,r)=>{if(k)k.material=v;});
    else q=variant(q,(k,r)=>{r[id]=v;if(k&&id==='fill')k.fill=v;});}
  return q;}

// ---------- LE CARNET DE PISTES : comment pense un savant ----------
// Un savant ne tire pas une étude d'un tiroir. Il voit un défaut avec les yeux de son métier, reçoit une directive, entend un collègue, ou a une
// intuition : il ouvre une PISTE — un but (la portée, la précision, le recul…) et les leviers que son métier lui donne. Il la creuse pas à pas, à son
// poste. À chaque pas il essaie une variation : un paramètre poussé ou relâché, un levier de plus (les combinaisons naissent ainsi). La balistique du
// concepteur lui répond ; il garde ce qui sert, réduit son pas quand il tâtonne, note ses impasses. Sa confiance monte avec les essais (deux fois plus
// vite au laboratoire, au bureau, au centre : il vérifie). Ce qu'il CROIT d'une piste n'est pas ce qu'elle vaut : son estimation est bruitée selon son
// grade et sa confiance, et il peut ne pas voir un effet néfaste — qu'un collègue d'un autre métier relèvera peut-être en réunion.
const NOISE=[.35,.25,.15,.1,.05],MISS=[.4,.3,.18,.1,.04];
const gauss=rnd=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const mortarD=D=>!!ACTIONS[D.p.action]?.mortar;
// ce qu'une grandeur veut dire pour cette arme (sinon ni but, ni effet secondaire, ni objection)
export function metricOk(m,D){const ind=indirect(D)||mortarD(D)||!!D.rocket;switch(m){case 'rk':return !ind;case 'Sg':return !D.rocket&&!mortarD(D);case 'pen':return !D.he;case 'lethal':case 'blast':return !!(D.he&&!D.he.shaped);
  case 'sustain':case 'rpm':return !!ACTIONS[D.p.action]?.auto;case 'jam':return (D.jam||0)>.002;case 'P':case 'life':return !D.rocket;case 'carry':return false;default:return true;}}
// les BUTS : leur sens, le défaut qui les fait voir (avec ses chiffres), et les leviers de chaque métier
export const GOALS={
  range:{name:'la portée',sign:1,bad:D=>!indirect(D)&&!D.rocket&&D.eff<35?`portée utile ${dist(D.eff)} seulement`:null,
    levers:{physicien:['lunette','ogive','culot','balle'],chimiste:['charge','vivacite','moteur'],ingenieur:['tube','affut','etages']}},
  moa:{name:'la précision',sign:-1,bad:D=>D.rocket?(D.moa>15?`la gerbe s’ouvre à ${fmt(D.moa,0)} MOA`:null):!indirect(D)&&!mortarD(D)&&D.moa>2.5?`${fmt(D.moa,1)} MOA de dispersion`:null,
    levers:{physicien:['pas','balle','ailettes','gyro'],ingenieur:['tube','paroi','frein','affut']}},
  Sg:{name:'la stabilité',sign:1,bad:D=>!D.rocket&&!mortarD(D)&&D.Sg<1.3?`la balle bascule (Sg ${fmt(D.Sg,2)})`:null,levers:{physicien:['pas','balle']}},
  rk:{name:'le recul',sign:-1,bad:D=>!indirect(D)&&!mortarD(D)&&!D.rocket&&D.rk>.35?`recul violent (${fmt(D.recoil,1)} J)`:null,
    levers:{ingenieur:['frein','paroi','affut'],chimiste:['charge'],physicien:['balle']}},
  P:{name:'la pression',sign:-1,bad:D=>!D.rocket&&D.P>460?`${Math.round(D.P)} MPa dans le tube`:null,levers:{chimiste:['vivacite','charge'],ingenieur:['paroi']}},
  life:{name:'l’usure du tube',sign:1,bad:D=>!D.rocket&&D.life<1500?`le tube s’use en ${D.life} coups`:null,levers:{ingenieur:['paroi'],chimiste:['vivacite','charge']}},
  mass:{name:'la légèreté',sign:-1,bad:D=>D.overload||!D.mountOk?`trop lourde pour son affût (${kg(D.mass)})`:D.crew<=1&&(D.verdicts||[]).some(v=>v.tone==='bad'&&/^Arme lourde/.test(v.t))?`${kg(D.mass)} à porter pour un seul soldat`:null,
    levers:{ingenieur:['paroi','tube','material','affut'],physicien:['calibre']}},
  lethal:{name:'la létalité',sign:1,bad:D=>D.he&&!D.he.shaped&&D.he.lethal<1.6*Math.cbrt(Math.max(.001,D.he.g))?`éclats mortels à ${fmt(D.he.lethal,1)} m seulement`:null,
    levers:{chimiste:['remplissage','explosif','combustible'],ingenieur:['coque','fusee','balle']}},
  pen:{name:'la perforation',sign:1,bad:()=>null,levers:{physicien:['balle','calibre'],chimiste:['charge']}},
  sustain:{name:'la chauffe',sign:1,bad:D=>ACTIONS[D.p.action]?.auto&&D.sustain<D.rpm?`le tube surchauffe (${D.sustain} coups/min tenus pour ${D.rpm})`:null,levers:{ingenieur:['cadence','paroi']}},
  jam:{name:'la fiabilité',sign:-1,bad:D=>(D.jam||0)>.012?`un enrayage tous les ${Math.round(1/D.jam)} coups`:null,levers:{ingenieur:['cadence'],chimiste:['charge']}},
  cost:{name:'le coût',sign:-1,bad:(D,n)=>n.cost>8?`${fmt(n.cost,1)} pièces à fabriquer`:null,levers:{ingenieur:['material','paroi','tube']}},
};
// ce que chaque métier regarde d'abord : ce qu'il remarque, ce qu'il objecte
export const EYES={ingenieur:['mass','rk','sustain','jam','life','cost'],chimiste:['P','v0','lethal','blast','life','range'],physicien:['Sg','moa','range','pen','v0']};
// les leviers à choix (les autres sont les paramètres continus de PARAMS)
export const CHOICES={
  frein:{name:'la bouche',opts:(p,D)=>D.rocket?[]:['brake','crown','flash'],key:'muzzle',cur:p=>p.kit?(p.kit.muzzle||'crown'):(p.mods||[]).includes('frein')?'brake':(p.mods||[]).includes('cacheflamme')?'flash':'crown',
    txt:v=>({brake:'un frein de bouche',crown:'une bouche simple',flash:'un cache-flamme'})[v]},
  lunette:{name:'la visée',opts:(p,D)=>D.rocket||indirect(D)?[]:[2,3,4,6],key:'sight',cur:(p,D)=>D.sightMag>1?D.sightMag:1,txt:v=>v>1?`une lunette ×${v}`:'les organes de visée seuls'},
  affut:{name:'l’affût',opts:p=>p.kit?['shoulder','bipod','tripod','wheels']:[],key:'carriage',cur:p=>p.kit?.carriage||'shoulder',txt:v=>({shoulder:'tirée à l’épaule',bipod:'un bipied',tripod:'un trépied',wheels:'un affût à roues'})[v]},
  material:{name:'le métal',opts:p=>p.kit?['steel','iron','bronze']:[],key:'material',cur:p=>p.kit?.material||'steel',txt:v=>({steel:'un tube en acier',iron:'un tube en fonte',bronze:'un tube en bronze'})[v]},
  coque:{name:'la coque',opts:(p,D,ctx)=>D.he&&!D.he.shaped?(ctx?.shells||['lisse','rainuree','billes']).filter(x=>SHELLS[x]):[],key:'shell',cur:p=>p.shell||'lisse',txt:v=>(SHELLS[v]?.name||v).toLowerCase()},
  fusee:{name:'la fusée d’obus',opts:(p,D)=>D.he&&!D.he.shaped?Object.keys(FUSES).filter(f=>f!=='fusant'||p.d>=8):[],key:'fuse',cur:p=>p.fuse||'impact',txt:v=>`une fusée ${(FUSES[v]?.name||v).toLowerCase()}`},
  explosif:{name:'l’explosif',opts:(p,D,ctx)=>D.he&&!D.he.shaped?(ctx?.fills||['poudre','tolite','brisant']).filter(f=>FILLS[f]):[],key:'fill',cur:p=>p.fill||'tolite',txt:v=>`un chargement en ${(FILLS[v]?.name||v).toLowerCase()}`},
  gyro:{name:'le guidage',opts:(p,D)=>D.rocket?['aucun','gyro']:[],key:'guide',cur:p=>p.guide||'aucun',txt:v=>v==='gyro'?'un guidage gyroscopique':'aucun guidage'},
  etages:{name:'les étages',opts:(p,D)=>D.rocket&&!p.kit?[1,2]:[],key:'stages',cur:p=>p.stages||1,txt:v=>v>=2?'deux étages':'un seul étage'},
};
// un levier continu n'a de sens que pour certaines armes
const LEVER_OK={combustible:D=>!!D.he?.tb,moteur:D=>!!D.rocket,ailettes:D=>!!D.rocket,remplissage:D=>!!(D.he&&!D.he.shaped),cadence:D=>!!ACTIONS[D.p.action]?.auto,
  pas:D=>!D.rocket&&!mortarD(D),charge:D=>!D.rocket,vivacite:D=>!D.rocket,tube:D=>!D.rocket,paroi:D=>!D.rocket};
export const leverOk=(id,p,D,ctx)=>CHOICES[id]?CHOICES[id].opts(p,D,ctx).length>1:!!PARAMS[id]&&pv(p,id)!=null&&(PARAMS[id].ok?.(p)??true)&&(LEVER_OK[id]?.(D)??true);
const leverCur=(p,D,id)=>CHOICES[id]?CHOICES[id].cur(p,D):pv(p,id);
const editOf=(id,v)=>CHOICES[id]?[CHOICES[id].key,v]:[id,v];
export const leverOfEdit=e=>Object.keys(CHOICES).find(k=>CHOICES[k].key===e[0])||e[0];
export const LEVER_NAME=id=>CHOICES[id]?.name||PARAMS[id]?.name||id;
// ce que dit une édition, lisiblement (« le pas de rayure 11,0 → 6,2 cm »)
const fmtP=(p,id,x)=>{const P0=PARAMS[id];if(id==='charge')return p.kit?`${Math.round(x*100)} %`:gr(x);if(id==='remplissage')return `${Math.round(x*100)} %`;if(P0.u==='×')return '×'+fmt(x,P0.dec??1);
  return fmt(x,P0.dec??1)+(P0.u&&P0.u!=='%'?' '+P0.u:'');};
export function descEdit(p,e){const id=leverOfEdit(e),v=e[1];if(CHOICES[id])return CHOICES[id].txt(v);if(!PARAMS[id])return `${e[0]} : ${v}`;const a=pv(p,id);return `${PARAMS[id].name} ${fmtP(p,id,a)} → ${fmtP(p,id,v)}`;}
// ce qu'une conception vaut au regard d'un but, et des directives du commandement (dir.prio : un poids par but ; ce qui se dégrade coûte)
const SIDE=['range','moa','mass','rk','lethal','P','life','cost','v0','jam','sustain','Sg','pen','rpm'];
const mval=(n,m)=>m==='lethal'?n.lethal+n.blast:m==='sustain'?(n.rpm?Math.min(1.5,n.sustain/n.rpm):0):n[m];
export function gainOf(n0,n1,m){if(m==='sustain'){const r=n=>n.rpm?Math.min(1,n.sustain/n.rpm):0;return clamp((r(n1)-r(n0))*1.5,-1,1.5);}
  if(m==='Sg'){const g=x=>x>=1.9?0:Math.log(1.9/Math.max(.05,x));return clamp(g(n0.Sg)-g(n1.Sg),-1,1.5);}
  const sign=GOALS[m]?.sign??(KEYNUMS.find(k=>k[0]===m)?.[4]||1);const a=mval(n0,m),b=mval(n1,m);if(!isFinite(a)||!isFinite(b))return 0;const rel=a?(b-a)/Math.abs(a):0;return clamp(rel*sign,-1,1.5);}
// le poids de chaque grandeur selon l'emploi de l'arme (ce qu'un savant d'expérience a en tête quand il juge une idée)
export const ROLE_W={piece:{lethal:2,range:1.5,mass:.5,moa:.8},fusee:{lethal:2,range:1.5,moa:1.3,mass:.6},fusil:{range:1.5,moa:1.5,mass:1.3,rk:1.2},mitrailleuse:{sustain:1.5,range:1.3,jam:1.5,mass:.8},antichar:{pen:2,range:1.2,rk:1.2}};
export function leadScore(D0,D1,goal,dir={},bold=false){const n0=nums(D0),n1=nums(D1),RW=ROLE_W[roleOf(D0)]||{};let s=60*gainOf(n0,n1,goal)*(RW[goal]??1);
  for(const [m,w] of Object.entries(dir.prio||{}))if(w>0&&m!==goal)s+=20*w*gainOf(n0,n1,m);
  for(const m of SIDE)if(m!==goal&&metricOk(m,D0)){const g=gainOf(n0,n1,m);if(g<0)s+=g*(m==='mass'&&D0.crew<=1?40:25)*(RW[m]??1)*(1+Math.max(0,dir.prio?.[m]||0));}
  if((D0.p.kit?.carriage||'')!==(D1.p.kit?.carriage||'')&&D0.mountOk&&!D0.overload)s-=bold?4:14;if(D1.crew>D0.crew)s-=(bold?4:12)*(D1.crew-D0.crew);
  if(D1.P>620&&!(D0.P>620))s-=100;if(!D1.rocket&&!mortarD(D1)&&D1.Sg<1&&!(D0.Sg<1))s-=80;if(D1.overload&&!D0.overload)s-=40;if(D0.mountOk&&!D1.mountOk)s-=30;
  return +s.toFixed(1);}
// une piste neuve
export function newLead({id,pid,owner,role,goal,origin,t,why='',inspiredBy=null,bold=false}){return {id,pid,owner,role,goal,origin,why,inspiredBy,bold,t0:t,steps:0,exp:0,edits:[],step:{},bias:{},score:0,fx:[],st:'exploration',notes:[],fails:0,refused:0};}
export const confOf=L=>+(1-Math.exp(-(L.steps+2*L.exp)/7)).toFixed(2);
const LIVE=new Set(['exploration','mure']);
// jusqu'où une variante s'écarte de la conception (en facteur ; l'ogive et le culot en valeur, à pas additifs)
const BOUNDS={calibre:[.8,1.25],balle:[.65,1.5],tube:[.5,2],paroi:[.6,2.2],pas:[.35,1.6],charge:[.6,1.3],vivacite:[.5,1.6],cadence:[.5,1.6],remplissage:[.5,1.8],moteur:[.6,1.8],ailettes:[.5,2]};
const ADD={ogive:[0,.95],culot:[0,.4]};
const ABS={balle:[1.6,7],pas:[.5,400],ailettes:[2,8],cadence:[30,1500],remplissage:[.05,.6]};
// une piste RADICALE : une refonte — des bornes larges, des pas plus grands, des leviers de plus (le calibre, l'affût…), et l'emploi de l'arme peut changer
const RADICAL={calibre:[.55,1.8],balle:[.5,2.2],tube:[.35,3],paroi:[.45,3],pas:[.25,2],charge:[.5,1.45],vivacite:[.4,2.2],cadence:[.35,2.2],remplissage:[.3,2.5],moteur:[.4,3],ailettes:[.4,2.5]};
const BOLD_LEVERS={ingenieur:['affut','material','tube','paroi','cadence'],chimiste:['explosif','charge','vivacite'],physicien:['calibre','balle','pas']};
// UN PAS DE RÉFLEXION : une variation de la meilleure idée du moment, jugée par la balistique ; rend ce qu'il a essayé (sa bulle de pensée)
// grade : un débutant tâtonne plus large et suit moins la pente ; lab : il vérifie à son poste (l'essai compte double pour la confiance)
export function thinkStep(L,p,{rnd=Math.random,dir={},lab=false,grade=1,ctx={}}={}){
  const D0=derive(p);const frozen=dir.frozen||[];const levers=[...new Set([...(GOALS[L.goal]?.levers[L.role]||[]),...(L.bold?BOLD_LEVERS[L.role]||[]:[])])].filter(x=>!frozen.includes(x)&&leverOk(x,p,D0,ctx));
  if(!levers.length){L.st='impasse';L.notes.unshift('Mon métier n’a pas de levier pour cela.');return null;}
  // affiner un levier déjà dans l'idée, ou en essayer un de plus (c'est ainsi que naissent les combinaisons)
  // (d'abord ce qu'il n'a pas encore essayé — c'est méthodique)
  L.tried??={};const pick=a=>a[Math.floor(rnd()*a.length)];const inIdea=L.edits.map(leverOfEdit).filter(x=>levers.includes(x)),fresh=levers.filter(x=>!L.tried[x]);
  const id=fresh.length&&rnd()<.55?pick(fresh):inIdea.length&&rnd()<.65?pick(inIdea):pick(levers);L.tried[id]=(L.tried[id]||0)+1;
  let v,cand,q=null;
  for(let k=0;k<4&&!q;k++){
    if(CHOICES[id]){const cur=L.edits.find(e=>leverOfEdit(e)===id)?.[1]??leverCur(p,D0,id);const o=CHOICES[id].opts(p,D0,ctx).filter(x=>x!==cur);if(!o.length)return null;v=o[Math.floor(rnd()*o.length)];}
    else{const base=pv(p,id),cur=L.edits.find(e=>e[0]===id)?.[1]??base,sig=(L.step[id]??.16)*(1.3-.1*grade)*(L.bold?1.8:1),z=(L.bias[id]||0)*(.4+.15*grade)+gauss(rnd)*.8;
      if(ADD[id])v=clamp(cur+sig*1.1*z,...ADD[id]);else{const B=(L.bold?RADICAL:BOUNDS)[id]||(L.bold?[.35,3]:[.5,2]);v=clamp(cur*Math.exp(sig*z),base*B[0],base*B[1]);if(ABS[id])v=clamp(v,...ABS[id]);}
      if(id==='calibre'){const d0=ctx.d0??base;v=clamp(v,d0*.6,d0*1.6);}}
    cand=[...L.edits.filter(e=>leverOfEdit(e)!==id),editOf(id,v)];
    // (la fiche arrondit, borne, ou ne bouge pas : on relit ce qu'elle a vraiment pris, et on réessaie si rien n'a changé)
    try{const r=applyEdit(p,cand);if(PARAMS[id]){const x=pv(r,id),was=L.edits.find(e=>e[0]===id)?.[1]??pv(p,id);if(x==null||Math.abs(x-was)<=Math.abs(was)*.004+1e-6)continue;v=x;cand[cand.length-1]=[id,x];}q=r;}catch(e){return null;}}
  if(!q)return null;let D1,s;try{D1=derive(q);if(!isFinite(D1.v0))return null;s=leadScore(D0,D1,L.goal,dir,L.bold);}catch(e){return null;}
  L.steps++;if(lab)L.exp++;const tried=descEdit(p,editOf(id,v));const fx=effects(D0,D1);const main=fx.find(f=>f.k===L.goal||(L.goal==='lethal'&&f.k==='blast'));
  const better=s>L.score+.4;
  const prev=PARAMS[id]?L.edits.find(e=>e[0]===id)?.[1]??pv(p,id):null,dirn=PARAMS[id]?Math.sign(v-prev):0;
  if(better){if(PARAMS[id]){L.bias[id]=dirn;L.step[id]=Math.min(.35,(L.step[id]??.16)*1.25);}
    L.edits=cand;L.score=s;L.fx=fx;L.fails=0;L.notes.unshift(`Essai ${L.steps} : ${tried}${main?' — '+fxTxt(main).toLowerCase():''}. Mieux.`);}
  else{L.fails++;if(PARAMS[id]){L.step[id]=Math.max(.03,(L.step[id]??.16)*.8);L.bias[id]=-dirn;}L.notes.unshift(`Essai ${L.steps} : ${tried} — ${s<L.score-10?'pire':'rien de mieux'}.`);}
  if(L.notes.length>12)L.notes.length=12;
  (L.hist??=[]).push({n:L.steps,txt:tried,val:shortEdit(p,editOf(id,v)),s:+s.toFixed(1),ok:better,fx:main?fxTxt(main).toLowerCase():''});if(L.hist.length>16)L.hist.shift();
  // mûre, ou impasse (une piste mûre continue de s'affiner, sans changer d'état)
  if(L.st==='exploration'){if((L.score>=25&&L.steps>=3)||(L.score>=8&&L.steps>=4&&(L.fails>=3||L.steps>=10))){L.st='mure';L.notes.unshift('Je tiens quelque chose : à présenter.');}
    else if(L.steps>=6+2*levers.length&&L.score<4){L.st='impasse';L.notes.unshift('Je n’arrive à rien : impasse.');}}
  return {tried,better,main,score:s};}
// le nom court d'un levier, et une édition dite brièvement (« pas 6,2 cm », « culot 0,00 », « un frein de bouche »)
export const SHORT={calibre:'calibre',balle:'projectile',tube:'tube',paroi:'paroi',pas:'pas',charge:'charge',vivacite:'vivacité',ogive:'ogive',culot:'culot',cadence:'cadence',remplissage:'explosif',moteur:'moteur',ailettes:'ailettes'};
export function shortEdit(p,e){const id=leverOfEdit(e);if(CHOICES[id])return CHOICES[id].txt(e[1]);if(!PARAMS[id])return `${e[0]} ${e[1]}`;return `${SHORT[id]||id} ${fmtP(p,id,e[1])}`;}
// la valeur essayée, courte (« 6,2 cm », « un frein de bouche »)
export const shortTry=t=>String(t).includes('→ ')?String(t).split('→ ').pop():String(t);
// ce qu'un savant conclut de sa piste : le meilleur de ses essais
export function concludeLine(L,p){const ok=(L.hist||[]).filter(h=>h.ok).length,m=L.fx.find(f=>f.k===L.goal||(L.goal==='lethal'&&f.k==='blast'));
  return `Sur ${L.steps} essai${L.steps>1?'s':''} (${ok} prometteur${ok>1?'s':''}), je retiens : ${L.edits.map(e=>descEdit(p,e)).join(' ; ')||'rien'}${m?' — '+fxTxt(m).toLowerCase():''}`;}
// plusieurs pas d'affilée (au tableau, en réunion : un calcul à chaud)
export function burst(L,p,n,o){let r=null;for(let i=0;i<n&&LIVE.has(L.st);i++)r=thinkStep(L,p,o)||r;return r;}
// ce qu'il croit : l'estimation (bruitée selon le grade et la confiance), et l'effet néfaste qu'il n'a pas vu
export function believe(fx,grade,conf,rnd=Math.random){const sig=NOISE[grade]*(1-.75*conf);const est=fx.map(f=>({...f,rel:+(f.rel*(1+gauss(rnd)*sig)).toFixed(3),err:+(Math.abs(f.rel)*sig*1.6).toFixed(3)}));
  const bad=fx.filter(f=>!f.good).sort((a,z)=>Math.abs(z.rel)-Math.abs(a.rel))[0];let missed=null;if(bad&&rnd()<MISS[grade]*(1-conf)){missed=bad.k;const i=est.findIndex(f=>f.k===bad.k);if(i>=0)est.splice(i,1);}
  return {est,missed};}
// les défauts qu'un métier voit dans une conception, et les buts que les directives lui donnent
export function defectsSeen(role,D,dir={},ctx={}){const n=nums(D),out=[];
  for(const [g,G] of Object.entries(GOALS)){if(!metricOk(g,D))continue;const lv=(G.levers[role]||[]).filter(x=>!(dir.frozen||[]).includes(x)&&leverOk(x,D.p,D,ctx));if(!lv.length)continue;let why=null;try{why=G.bad(D,n);}catch(e){}
    const pr=dir.prio?.[g]||0;if(why&&(EYES[role].includes(g)||lv.length>=2||pr>0))out.push({goal:g,why,origin:'defaut'});else if(pr>0)out.push({goal:g,why:`la reine veut ${G.name}`,origin:'directive'});}
  return out;}
// les buts où un métier peut quelque chose (pour l'intuition, l'inspiration)
export function goalsFor(role,D,dir={},ctx={}){return Object.keys(GOALS).filter(g=>metricOk(g,D)&&(GOALS[g].levers[role]||[]).some(x=>!(dir.frozen||[]).includes(x)&&leverOk(x,D.p,D,ctx)));}
// la conception a changé : la piste est-elle encore bonne ? (changed : les champs que la décision a touchés)
export function rebaseLead(L,p,{dir={},changed=[]}={}){if(!LIVE.has(L.st)&&L.st!=='proposee')return;if(!L.edits.length)return;
  if(L.edits.some(e=>changed.includes(e[0]))){L.st='caduque';L.notes.unshift('La décision a tranché ce que je touchais.');return;}
  let s=-99,fx=[];try{const D0=derive(p),D1=derive(applyEdit(p,L.edits));s=leadScore(D0,D1,L.goal,dir,L.bold);fx=effects(D0,D1);}catch(e){}
  L.steps=Math.floor(L.steps*.6);L.exp=Math.floor(L.exp*.6);L.fails=0;
  if(s<3||!fx.length){L.st='caduque';L.score=s;L.notes.unshift('Sur la nouvelle conception, ça n’apporte plus rien.');return;}
  const m=fx.find(f=>f.k===L.goal||(L.goal==='lethal'&&f.k==='blast'));L.notes.unshift(`Refait sur la nouvelle conception${m?' : '+fxTxt(m).toLowerCase():''}.`);L.score=s;L.fx=fx;L.st='exploration';}
// le titre d'une idée (« Pour la portée : l'ogive 0,50 → 0,74 ; le culot… »)
export function ideaTitle(L,p){const ch=L.edits.map(e=>descEdit(p,e));return `${L.bold?'Refonte — ':''}Pour ${GOALS[L.goal]?.name||L.goal} : ${ch.slice(0,3).join(' ; ')||'à creuser'}`;}
// une proposition de réunion, à partir d'une piste : ce qu'elle change, ce qu'elle vaut vraiment, ce qu'en croit son auteur, ce qu'elle coûte au programme
export function proposalOf(L,p,A,who,{rnd=Math.random,dir={},kind='piste',title=null}={}){const q=applyEdit(p,L.edits);const an0=analyze(p,A),an1=analyze(q,A);const D0=an0.D,D1=an1.D;
  const fx=effects(D0,D1),conf=confOf(L),B=believe(fx,who.grade,conf,rnd);
  if(kind==='piste'&&confOf(L)<.45)kind='idee';
  return {kind,lead:L.id,role:who.role,by:who.id,byName:who.name,grade:who.grade,goal:L.goal,why:L.why||'',title:title||ideaTitle(L,p),edits:JSON.parse(JSON.stringify(L.edits)),changes:L.edits.map(e=>descEdit(p,e)),
    bold:!!L.bold,est:B.est,missed:B.missed,real:fx,conf,score:leadScore(D0,D1,L.goal,dir,L.bold),dWork:+(an1.work-an0.work).toFixed(1),newTasks:an1.tasks.filter(t=>t.n>0&&!an0.tasks.some(o=>o.ax===t.ax)).map(t=>t.label),
    origin:L.origin,inspiredBy:L.inspiredBy,steps:L.steps,exp:L.exp,notes:L.notes.slice(0,5),hist:(L.hist||[]).slice(-8),best:L.edits.map(e=>shortEdit(p,e)),objections:[],supports:[]};}
// le débat : chacun regarde les propositions des autres avec ses yeux — objections (ce qui se dégrade dans son domaine, surtout ce que l'auteur n'a
// pas vu), soutiens (ce qui s'améliore dans son domaine)
export function debate(props,who,rnd=Math.random,D=null){const L=[];for(const c of props)for(const w of who){if(w.id===c.by)continue;const eyes=(EYES[w.role]||[]).filter(k=>!D||metricOk(k,D));
    const bad=c.real.filter(f=>!f.good&&eyes.includes(f.k)&&Math.abs(f.rel)>.06).sort((a,z)=>Math.abs(z.rel)-Math.abs(a.rel))[0];
    if(bad&&!c.objections.some(o=>o.k===bad.k)&&rnd()<.3+.12*w.grade+(c.missed===bad.k?.25:0)){const o={by:w.id,byName:w.name,role:w.role,k:bad.k,fx:bad,text:`${c.missed===bad.k?'Tu n’as pas vu':'Attention à'} ${bad.name.toLowerCase()} : ${fxTxt(bad).toLowerCase()}, d’après mes calculs.`};c.objections.push(o);L.push({...o,on:c});}
    const good=c.real.filter(f=>f.good&&eyes.includes(f.k)&&f.rel>.05&&f.k!==c.goal).sort((a,z)=>z.rel-a.rel)[0];
    if(good&&!c.supports.some(o=>o.by===w.id)&&rnd()<.3){const o={by:w.id,byName:w.name,role:w.role,k:good.k,text:`Et c’est bon pour ${good.name.toLowerCase()} : ${fxTxt(good).toLowerCase()}. Je soutiens.`};c.supports.push(o);L.push({...o,on:c});}}
  return L;}
// deux propositions qui touchent le même champ sont en conflit ; le plus gradé tente un compromis (à mi-chemin). Deux propositions compatibles se
// combinent — la balistique dit si l'ensemble vaut plus (synergie) ou moins (antagonisme) que la meilleure des deux
export const keysOf=c=>c.edits.map(e=>e[0]);
export const conflictOf=(a,b)=>keysOf(a).some(k=>keysOf(b).includes(k));
const short=t=>t.replace(/^(Refonte — )?Pour [^:]+: /,'');
export function merge(a,b,p,A,who,{rnd=Math.random,dir={}}={}){const shared=conflictOf(a,b);const edits=[];
  for(const e of a.edits){const o=b.edits.find(x=>x[0]===e[0]);if(!o)edits.push(e);else if(typeof e[1]==='number'&&typeof o[1]==='number')edits.push([e[0],(e[1]+o[1])/2]);else edits.push(rnd()<.5?e:o);}
  for(const e of b.edits)if(!edits.some(x=>x[0]===e[0]))edits.push(e);
  const L={id:-1,edits,bold:!!(a.bold||b.bold),goal:a.score>=b.score?a.goal:b.goal,role:who.role,steps:Math.min(a.steps,b.steps),exp:Math.min(a.exp||0,b.exp||0),origin:shared?'compromis':'combinaison',notes:[]};
  let c;try{c=proposalOf(L,p,A,who,{rnd,dir,kind:L.origin,title:shared?`Compromis : ${short(a.title)} / ${short(b.title)}`:`Les deux ensemble : ${short(a.title)} + ${short(b.title)}`});}catch(e){return null;}
  const D0=derive(p),D1=derive(applyEdit(p,edits));c.score=+((leadScore(D0,D1,a.goal,dir,L.bold)+leadScore(D0,D1,b.goal,dir,L.bold))/2).toFixed(1);c.from=[a.lead,b.lead];c.synergy=+(c.score-Math.max(a.score,b.score)).toFixed(1);
  c.why=shared?`${a.byName} et ${b.byName} touchent la même chose : à mi-chemin.`:`J’ai fait le calcul des deux ensemble.`;return c;}

// ---------- ce qu'on dit en réunion ----------
// la présentation d'une conception par l'équipe du bureau d'études (la réunion de lancement) : toutes ses caractéristiques, chacune par le métier
// qui la connaît, puis ce qui plaît et ce qui inquiète, puis les tâches au-delà de ce qu'on sait
const MAT={steel:'acier',iron:'fonte',bronze:'bronze'},COST={pieces:'pièces',fer:'fer',cuivre:'cuivre',plomb:'plomb',bois:'bois',charbon:'charbon',poudre:'poudre',explosifs:'explosifs'};
const lc=t=>t.charAt(0).toLowerCase()+t.slice(1);
const roleOfVerdict=t=>/pression|usé|poudre|charge|explosi/i.test(t)?'chimiste':/recul|lourde|surchauffe|enray|fiable|affût|épaule|trépied/i.test(t)?'ingenieur':'physicien';
export function presentLines(p,an,name){const D=an.D,L=[],he=D.he&&!D.he.shaped,n=nums(D),A=ACTIONS[p.action]||{};const say=(role,text)=>L.push({role,text});
  const kind=D.rocket?'une fusée':indirect(D)?'une pièce d’artillerie':A.mortar?'un mortier':A.auto?'une arme automatique':D.crew>1?'une arme servie':'une arme d’épaule';
  say('ingenieur',`Voici « ${name} », sortie de notre bureau d’études : ${kind} de ${mm(p.d)} — ${D.name}.`);
  say('ingenieur',`Le tube : ${Math.round(p.L)} mm${D.rocket?'':`, une paroi ×${fmt(wallF(p),2)}`}${p.kit?.material?`, en ${MAT[p.kit.material]||p.kit.material}`:''}${(p.tubes||1)>1?` — ${p.tubes} tubes`:''}${A.name?` ; le mécanisme : ${A.name.toLowerCase()}`:''}.`);
  say('ingenieur',`Le projectile : ${gr(D.m)}, ${fmt(p.l/p.d,1)} calibres de long${CONSTRUCTIONS[p.cons]?`, ${CONSTRUCTIONS[p.cons].name.toLowerCase()}`:''}.`);
  if(D.rocket)say('chimiste',`Le moteur : Δv ${Math.round(D.boost?.dv||0)} m/s, une combustion de ${fmt(D.boost?.tb||0,2)} s.`);
  else say('chimiste',`La charge : ${D.E0>=1000?fmt(D.E0/1000,1)+' kJ':Math.round(D.E0)+' J'} à la bouche — ${Math.round(D.v0)} m/s, ${Math.round(D.P)} MPa dans le tube, ${Math.round((D.eta||0)*100)} % de la poudre utile.`);
  if(he)say('chimiste',`L’obus : ${gr(D.he.g)} de ${(FILLS[p.fill]||FILLS.tolite).name.toLowerCase()}, ${(SHELLS[p.shell]||SHELLS.lisse).name.toLowerCase()}, fusée ${(FUSES[p.fuse]||FUSES.impact).name.toLowerCase()} : souffle mortel à ${fmt(D.he.blast,1)} m, ${D.he.n} éclats mortels jusqu’à ${fmt(D.he.lethal,1)} m.`);
  if(indirect(D)||D.rocket){const R=rangeOf(D);say('physicien',`La trajectoire : ${dist(R)} au plus loin ; ${fmt(D.moa,1)} MOA de dispersion — à cette distance, ${fmt(D.moa*.000291*R,1)} m d’écart entre deux coups.`);}
  else say('physicien',`La trajectoire : ${dist(D.eff)} de portée utile ; ${fmt(D.moa,1)} MOA de dispersion ; une stabilité Sg de ${fmt(D.Sg,2)}.`);
  if(!he&&!D.rocket&&n.pen>0)say('physicien',`À 30 m, elle perce ${fmt(n.pen,1)} mm d’acier.`);
  say('ingenieur',`${kg(D.mass)} chargée, ${D.crew} servant${D.crew>1?'s':''}${A.auto?` ; ${D.rpm} coups/min, ${D.sustain} tenus sans surchauffe`:''} ; un recul de ${fmt(D.recoil,1)} J.`);
  const cw=Object.entries(D.costW||{}).filter(([,v])=>v>0).map(([k,v])=>`${fmt(v,v<10?1:0)} ${COST[k]||k}`).join(', ');
  say('ingenieur',`À fabriquer : ${cw||'presque rien'} par arme, ${fmt(D.hoursW||0,1)} h de manufacture ; ${D.perCrate} coups par caisse.`);
  for(const v of (D.verdicts||[]).filter(v=>v.tone==='good').slice(0,2))say('physicien',`Ce qui me plaît : ${lc(v.t)}.`);
  for(const v of (D.verdicts||[]).filter(v=>v.tone==='bad').slice(0,3))say(roleOfVerdict(v.t),`Ce qui m’inquiète : ${lc(v.t)}.`);
  const nov=an.tasks.filter(t=>t.n>0);say('physicien',nov.length?`Pour la faire : ${an.tasks.length} tâches, dont ${nov.length} au-delà de ce qu’on sait — ${Math.round(an.work)} heures-savants.`:`Tout est dans ce qu’on maîtrise : ${Math.round(an.work)} heures-savants.`);
  for(const t of nov.slice(0,6))say(t.role,`${t.label} — ${t.gap}.`);
  return L;}
// l'avancement, à une revue
export function progressLines(P){const L=[];const done=P.tasks.filter(t=>t.done>=t.work),run=P.tasks.filter(t=>t.done<t.work);
  L.push({role:'ingenieur',text:`« ${P.name} » : ${done.length} tâche${done.length>1?'s':''} sur ${P.tasks.length} faite${done.length>1?'s':''}.`});
  for(const t of done.slice(-3))L.push({role:t.role,text:`${t.label} : fait${t.res?' — '+t.res:''}.`});
  for(const t of run.slice(0,3))L.push({role:t.role,text:`${t.label} : ${Math.round(t.done/t.work*100)} %${t.block?' — bloqué : '+t.block:''}.`});
  return L;}
