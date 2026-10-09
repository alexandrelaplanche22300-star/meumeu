// (V12.9) LA GUERRE CHIMIQUE — le module commun. Mécanique de jeu FICTIVE : agents inventés, nombres de réglage (unités de jeu).
// Conception : docs/GUERRE-CHIMIQUE.md. Répartition du travail (qui écrit quoi) : en tête de chaque fonction.
//  · gaz.js (ce fichier)      : la table des agents, l'état s.gas, les interfaces communes (gasAt, gasRelease, unitProtection, gasExpose, gasTick)
//  · gaz-sante.js             : la dose par organe, les symptômes, l'incurable (exposeDose, chemTick) — branché dans health.js
//  · gaz-nuages.js            : le vent, la diffusion, la décroissance, les dépôts, les points bas, les obus à gaz (gasCloudTick)
//  · gaz-bouteilles.js        : les bouteilles : fabriquer, remplir, porter, poser, combiner, ouvrir, fuir (gasCylTick)
//  · data.js / ui.js / eco.js : la recherche, les produits, l'équipement de protection, les soins, l'interface
import {exposeDose} from './gaz-sante.js';
import {HOUR_REAL} from './data.js';

export const GAS_CELL=2;   // une cellule de gaz = 2 × 2 cases (8 m)
export const ORGANES=['poumons','yeux','peau','nerfs'];
export const VOIES={inh:'respiré',oeil:'les yeux',cut:'la peau'};
// Les agents. vol : demi-vie dans l'air (h) ; sol : demi-vie au sol (h, 0 = pas de dépôt) ; dep : part qui se dépose par heure ;
// dens : 0 (monte) → 1 (rampe, coule dans les trous) ; pot : concentration apportée par caisse ; voies : par où il entre → poids par organe ;
// lat : latence de la peau (h, le vésicant) ; film : colle à la fourrure ; col : couleur du nuage ; res : la ressource (labo) ; fill : le chargement d'obus.
export const AGENTS={
  ortie:{name:'Ortie',fam:'irritant',vol:.4,sol:0,dep:0,dens:.3,pot:6,lat:0,film:0,col:'#e8e0c0',res:'agent_ortie',fill:'gaz_ortie',
    voies:{inh:{poumons:.15},oeil:{yeux:1}},desc:'un irritant : larmes et toux, presque jamais mortel ; il force l’ennemi à se masquer (et à mal viser)'},
  foin:{name:'Foin',fam:'suffocant',vol:1.5,sol:0,dep:0,dens:.7,pot:10,lat:0,film:0,col:'#c9c25a',res:'agent_foin',fill:'gaz_foin',
    voies:{inh:{poumons:1},oeil:{yeux:.3}},desc:'un suffocant jaune-vert, plus lourd que l’air : il noie les poumons, on crache du sang ; le masque l’arrête'},
  miel:{name:'Miel',fam:'vésicant',vol:3,sol:30,dep:.25,dens:.9,pot:8,lat:4,film:1,col:'#b8862b',res:'agent_miel',fill:'gaz_miel',
    voies:{inh:{poumons:.4},oeil:{yeux:.8},cut:{peau:1}},desc:'un vésicant huileux et persistant : rien pendant des heures, puis des cloques de sang, l’infection, des brûlures jusqu’aux organes ; il interdit le terrain des jours'},
  xg:{name:'X-G',fam:'neurotoxique',vol:.8,sol:0,dep:0,dens:.5,pot:4,lat:0,film:0,col:'#d8dde0',res:'agent_xg',fill:'gaz_xg',
    voies:{inh:{nerfs:1,poumons:.1},oeil:{nerfs:.3,yeux:.2}},desc:'un neurotoxique volatil, presque invisible : spasmes, convulsions, arrêt respiratoire en quelques minutes sans antidote'},
  xv:{name:'X-V',fam:'neurotoxique',vol:2,sol:60,dep:.4,dens:1,pot:3,lat:0,film:1,col:'#7a7458',res:'agent_xv',fill:'gaz_xv',
    voies:{inh:{nerfs:1},oeil:{nerfs:.3},cut:{nerfs:.6,peau:.2}},desc:'un neurotoxique huileux qui passe la peau et reste au sol des jours : le terrain devient inhabitable, pour nous aussi'},
  cendre:{name:'Cendre',fam:'sanguin',vol:.25,sol:0,dep:0,dens:.2,pot:12,lat:0,film:0,col:'#9fb4c0',res:'agent_cendre',fill:'gaz_cendre',
    voies:{inh:{nerfs:.7,poumons:.2}},desc:'un agent sanguin ultra-volatil : tout ou rien — il faut une concentration énorme, le vent l’emporte aussitôt ; il sature les filtres'},
};
export const AGENT_IDS=Object.keys(AGENTS);

export const GAZ={
  // l'état du gaz dans la sauvegarde : air et sol en cellules clairsemées, le vent, le temps (propriétaire du contenu : gaz-nuages.js)
  gasState(){const s=this.s;return s.gas??={air:{},sol:{},wind:{a:this.rand()*6.283,v:6},meteo:'sec',cyl:[],nid:1};},
  gasNC(){return Math.ceil(this.N/GAS_CELL);},
  gasKey(x,y){return Math.floor(y/GAS_CELL)*this.gasNC()+Math.floor(x/GAS_CELL);},
  // INTERFACE — la concentration de l'air à la case (x, y) : {agent: C} (objet vide hors nuage). Ne pas modifier le résultat.
  gasAt(x,y){const g=this.s.gas;if(!g)return EMPTY;return g.air[this.gasKey(x,y)]||EMPTY;},
  // INTERFACE — lâcher `amount` (unités de concentration·cellule) d'un agent en (x, y). o.r : rayon en cases (étalé sur les cellules
  // touchées) ; o.src : 'obus' | 'bouteille' | 'fuite' | 'labo'. Version simple ; gaz-nuages.js peut l'affiner sans changer la signature.
  gasRelease(x,y,agent,amount,o={}){if(!AGENTS[agent]||!(amount>0))return;const g=this.gasState();const r=Math.max(0,o.r||0),NC=this.gasNC();
    const cells=[];for(let j=Math.floor((y-r)/GAS_CELL);j<=Math.floor((y+r)/GAS_CELL);j++)for(let i=Math.floor((x-r)/GAS_CELL);i<=Math.floor((x+r)/GAS_CELL);i++){
      if(i<0||j<0||i>=NC||j>=NC)continue;if(r>0&&Math.hypot((i+.5)*GAS_CELL-x,(j+.5)*GAS_CELL-y)>r+GAS_CELL*.71)continue;cells.push(j*NC+i);}
    if(!cells.length)return;const per=amount/cells.length;for(const k of cells){const c=g.air[k]??={};c[agent]=(c[agent]||0)+per;}
    this.emit({type:'gas',x,y,agent,amount,src:o.src||null});},
  // INTERFACE — la protection d'une peluche, voie par voie (0 : rien ; 1 : étanche). Propriétaire : la recherche/l'équipement.
  // Champs d'unité convenus : u.gasMask (porte un masque), u.maskF (filtre restant, 0-1), u.goggles, u.chemSuit, u.antidote (nombre).
  unitProtection(u){const m=u.gasMask?(u.maskF??1)>0?.92:.3:0;const o=Math.max(u.goggles?.9:0,u.gasMask?.5:0);return {inh:m,oeil:o,cut:u.chemSuit?.85:0};},
  // INTERFACE — exposer une peluche à l'air de sa case pendant dts secondes de combat (dose par organe : gaz-sante.js).
  gasExpose(u,dts){if(!u.h||u.h.state==='mort')return;const C=this.gasAt(u.x,u.y);let any=false;for(const k in C)if(C[k]>1e-3){any=true;break;}
    if(!any&&!u.h.cx?.film)return;const ctx={post:u.post||'debout',run:this.s.t-(u.moved||-9)<.03,trench:!!this.s.sacs?.[Math.floor(u.y)*this.N+Math.floor(u.x)]?.b};
    exposeDose(u.h,C,this.unitProtection(u),dts,ctx);u.gasSeen=this.s.t;},
  // le pas du gaz (appelé par World.tick) : les nuages, les bouteilles, puis l'exposition
  gasTick(dt){const g=this.s.gas;if(!g)return;this.gasCloudTick?.(dt);this.gasCylTick?.(dt);
    this.gasT=(this.gasT||0)+dt;if(this.gasT<.02)return;const step=this.gasT;this.gasT=0;const dts=step*HOUR_REAL;
    for(const u of this.s.units)if(u.hp>0&&u.h&&u.inLab==null)this.gasExpose(u,dts);},
};
const EMPTY=Object.freeze({});
