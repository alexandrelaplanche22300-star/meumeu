// (V12.9) LA GUERRE CHIMIQUE — la santé : la dose par organe (concentration × temps), les symptômes, l'infection, l'incurable.
// Mécanique de jeu FICTIVE (unités de jeu, aucune donnée médicale réelle). Conception : docs/GUERRE-CHIMIQUE.md §2.
// Interfaces : exposeDose(h, C, prot, dts, ctx) — appelée par World.gasExpose ; chemTick(h, dts, rnd) — appelée par tickHealth (health.js) ;
// chemMalus(h) — ajoutée à malus() ; giveAntidote(h), decontaminate(h), dressBlisters(h) — les soins (gaz-equip.js) ; chemHeal(h, hours) — l'hôpital.
// Temps : dts en secondes de combat (4 par heure de jeu, comme health.js).
import {AGENTS} from './gaz.js';
const HOUR=4;

// Les seuils de dose par organe (unités de jeu) ; le 4e est l'incurable (pour les nerfs : l'arrêt respiratoire sans antidote, puis l'irréversible)
export const SEUILS={poumons:[5,15,30,55],yeux:[4,12,30,Infinity],peau:[8,20,45,80],nerfs:[3,8,16,28]};
export const NERFS_IRREV=45;
export const SANTE={
  PRONE:1.3,RUN:1.4,           // couché (agent dense : on respire au ras du sol) ; en courant
  FILM_TAKE:1,FILM_SOAK:.1,FILM_FADE:.01,   // la pellicule : part captée par la fourrure ; part absorbée par seconde ; évaporation par seconde
  LAT_OUT:1,                   // le réservoir de latence se vide en `lat` heures de jeu
  INF_H:30,                    // h : des cloques non pansées s'infectent à fond en 30 h (×0,3 pansées)
  ARREST_S:3,                  // s de combat : l'arrêt respiratoire tue en 3 s sans antidote (« quelques minutes »)
  ANTI_S:8*HOUR,ANTI_DECAY:.02,// l'antidote agit 8 h ; il fait baisser la dose des nerfs de 2 % par seconde
  DOOM_H:[6,40],               // h : la mort lente de l'incurable
  NARRE_S:[6,14],              // s : une ligne d'agonie dans le carnet tous les 6 à 14 s
};
// h.cx : l'état chimique d'une peluche. d : dose par organe ; lat : la dose de peau en attente (vésicant, latence) ; film : la pellicule
// sur la fourrure {agent: quantité} ; inf : l'infection des cloques (0-1) ; st : le stade atteint par organe ; doom : la mort lente fixée.
export function newChem(){return {d:{poumons:0,yeux:0,peau:0,nerfs:0},lat:0,latK:0,film:null,inf:0,st:{poumons:0,yeux:0,peau:0,nerfs:0},doom:null,anti:0,by:{}};}
const stageOf=(o,d)=>{const S=SEUILS[o];let s=0;while(s<4&&d>=S[s])s++;return s;};
const log=(h,what)=>{(h.log??=[]).push({what,bad:1});if(h.log.length>30)h.log.shift();};

// L'EXPOSITION : C {agent: concentration} ; prot {inh, oeil, cut} (0-1) ; ctx {post, run, trench}
export function exposeDose(h,C,prot,dts,ctx={}){if(!h||h.state==='mort'||!(dts>0))return;const cx=h.cx??=newChem();
  for(const a in C){const A=AGENTS[a],c=C[a];if(!A||!(c>1e-3))continue;
    const posture=ctx.post==='couche'&&A.dens>.5?SANTE.PRONE:1;
    for(const v in A.voies){const P=Math.max(0,Math.min(1,prot?.[v]||0));let k=c*(1-P)*dts*posture;if(v==='inh'&&ctx.run)k*=SANTE.RUN;if(!(k>0))continue;
      for(const o in A.voies[v]){const add=k*A.voies[v][o];
        if(o==='peau'&&A.lat>0){cx.lat+=add;cx.latK=Math.max(cx.latK,A.lat);}else cx.d[o]+=add;cx.by[a]=(cx.by[a]||0)+add;}
      // la pellicule : un agent huileux colle à la fourrure (la combinaison en arrête autant)
      if(v==='cut'&&A.film){cx.film??={};cx.film[a]=(cx.film[a]||0)+c*(1-P)*dts*SANTE.FILM_TAKE;}}}}

// LE PAS : latence, pellicule, antidote, stades, infection, l'incurable. Rend 'mort' quand il meurt (health.js), sinon null.
export function chemTick(h,dts,rnd=Math.random){const cx=h.cx;if(!cx||h.state==='mort'||!(dts>0))return null;
  // la pellicule continue de passer la peau hors du nuage, tant qu'on n'a pas lavé
  if(cx.film){let any=false;for(const a in cx.film){const A=AGENTS[a],f=cx.film[a];if(!A||!(f>1e-3)){delete cx.film[a];continue;}any=true;const soak=f*SANTE.FILM_SOAK*dts;
      for(const o in A.voies.cut||{}){const add=soak*A.voies.cut[o];if(o==='peau'&&A.lat>0){cx.lat+=add;cx.latK=Math.max(cx.latK,A.lat);}else cx.d[o]+=add;}
      cx.film[a]=f-soak-f*SANTE.FILM_FADE*dts;}if(!any)cx.film=null;}
  // la latence du vésicant : rien pendant des heures, puis la peau « sort »
  if(cx.lat>1e-4){const out=Math.min(cx.lat,cx.lat*dts/(Math.max(.5,cx.latK)*HOUR*SANTE.LAT_OUT));cx.lat-=out;cx.d.peau+=out;}
  // l'antidote : les nerfs redescendent, l'arrêt respiratoire est suspendu
  if(cx.anti>0){cx.anti-=dts;if(cx.d.nerfs<NERFS_IRREV)cx.d.nerfs*=Math.exp(-SANTE.ANTI_DECAY*dts);}
  // les stades, organe par organe (on n'annonce que la montée)
  const before={...cx.st};for(const o in cx.d){const s=stageOf(o,cx.d[o]);if(s>cx.st[o]){cx.st[o]=s;onStage(h,o,s,rnd);}else if(s<cx.st[o]&&o==='nerfs')cx.st[o]=s;}
  // les nerfs : l'arrêt respiratoire sans antidote, l'irréversible au-delà
  if(cx.d.nerfs>=NERFS_IRREV&&!cx.doom)setDoom(h,'nerfs détruits : il ne respire plus',rnd,.02);
  else if(cx.st.nerfs>=4&&!(cx.anti>0)&&!cx.doom){cx.arrest=(cx.arrest||0)+dts;if(cx.arrest>=SANTE.ARREST_S)return die(h,'arrêt respiratoire (neurotoxique)');}else cx.arrest=0;
  // l'infection des cloques
  if(cx.st.peau>=2&&!cx.doom){cx.inf=Math.min(1,cx.inf+dts/(SANTE.INF_H*HOUR)*(cx.dressed?.3:1));
    if(cx.inf>=1)return die(h,'infection des brûlures chimiques');if(cx.inf>=.75&&!cx.fever){cx.fever=true;log(h,'fièvre : les cloques sont infectées');}}
  // hors de combat : œdème, brûlures profondes, convulsions, aveugle, fièvre
  if(h.state!=='mort'&&chemDown(h)&&h.state!=='hors'){h.state='hors';h.cause=chemCause(cx);}
  // L'INCURABLE : une heure fixée ; ni infirmier, ni médecin, ni hôpital ne l'arrêtent (la morphine calme seulement)
  if(cx.doom){const D=cx.doom;D.left-=dts;D.narre=(D.narre??6)-dts;if(D.narre<=0){D.narre=SANTE.NARRE_S[0]+rnd()*(SANTE.NARRE_S[1]-SANTE.NARRE_S[0]);log(h,AGONIE[D.k][Math.floor(rnd()*AGONIE[D.k].length)]);h.pain=Math.min(10,(h.pain||0)+(h.morph>0?0:2));}
    if(D.left<=0)return die(h,D.cause);}
  return null;}
function onStage(h,o,s,rnd){const cx=h.cx;const L={
    poumons:['', 'il tousse','il crache du sang','œdème : il se noie de l’intérieur','poumons détruits'],
    yeux:['', 'les yeux pleurent','yeux brûlés : il ne voit presque plus','aveugle'],
    peau:['', 'rougeurs, la fourrure brûle','des cloques de sang','brûlures chimiques profondes','les brûlures gagnent les organes'],
    nerfs:['', 'pupilles serrées, il bave','spasmes','convulsions','arrêt respiratoire']}[o];log(h,L[s]||'');
  if(o==='poumons'&&s===2)h.bleeds.push({name:'poumons (gaz) : il crache du sang',rate:.004,limb:null,internal:true});
  if(o==='poumons'&&s===4)setDoom(h,'poumons détruits par le gaz',rnd);
  if(o==='yeux'&&s>=2)h.eyes=Math.max(h.eyes||0,s>=3?2:1);
  if(o==='peau'&&s>=1)h.pain=Math.min(10,(h.pain||0)+s*1.5);
  if(o==='peau'&&s===4){h.bleeds.push({name:'brûlures chimiques jusqu’aux organes',rate:.006,limb:null,internal:true});setDoom(h,'brûlures chimiques jusqu’aux organes',rnd);}}
function setDoom(h,cause,rnd,fast=1){const cx=h.cx;if(cx.doom)return;const [a,b]=SANTE.DOOM_H;const k=/nerf/.test(cause)?'nerfs':/poumon/.test(cause)?'poumons':'peau';
  cx.doom={cause,k,left:(a+rnd()*(b-a))*HOUR*fast,narre:2};log(h,`${cause} — plus rien à faire`);}
function die(h,cause){h.state='mort';h.cause=cause;log(h,cause);return 'mort';}
function chemCause(cx){return cx.doom?cx.doom.cause:cx.st.nerfs>=3?'convulsions (neurotoxique)':cx.st.poumons>=3?'œdème du poumon (gaz)':cx.st.peau>=3?'brûlures chimiques profondes':cx.st.yeux>=3?'aveuglé par le gaz':'fièvre des cloques infectées';}
const AGONIE={
  poumons:['il crache du sang','il étouffe, la nuit entière','une écume rosée aux lèvres','il ne peut plus s’allonger sans se noyer'],
  peau:['ses brûlures suintent','les cloques crèvent, la fourrure part par plaques','il ne supporte plus qu’on le touche','les brûlures noircissent'],
  nerfs:['des spasmes le reprennent','il ne respire plus qu’à peine','il ne reconnaît plus personne'],
};
// hors de combat par le gaz : œdème, brûlures profondes, convulsions, aveugle, fièvre, l'incurable (health.js : tickHealth, heal)
export function chemDown(h){const cx=h.cx;return !!cx&&(cx.st.poumons>=3||cx.st.peau>=3||cx.st.nerfs>=3||cx.st.yeux>=3||!!cx.fever||!!cx.doom);}
// ce que la chimie retire à ce qu'il sait faire : toux, larmes, spasmes (ajouté à malus() de health.js)
export function chemMalus(h){const cx=h.cx;if(!cx)return {aim:0,move:0};const st=cx.st;
  return {aim:(st.poumons>=1?.3:0)+(st.yeux===1?.4:0)+(st.nerfs>=1?.3:0)+(st.nerfs>=2?.8:0),move:(st.poumons>=2?.2:0)+(st.nerfs>=2?.4:0)+(st.peau>=2?.15:0)};}
// LES SOINS
export function giveAntidote(h){const cx=h?.cx;if(!cx||cx.doom)return false;cx.anti=SANTE.ANTI_S;cx.arrest=0;return true;}
export function decontaminate(h){const cx=h?.cx;if(!cx?.film)return false;cx.film=null;return true;}
export function dressBlisters(h){const cx=h?.cx;if(!cx||cx.st.peau<2||cx.dressed)return false;cx.dressed=true;return true;}
// l'hôpital : il arrête l'infection et soigne ce qui n'est pas perdu — jamais l'incurable, jamais un aveugle
export function chemHeal(h,hours){const cx=h?.cx;if(!cx||cx.doom)return;cx.inf=Math.max(0,cx.inf-hours*.2);if(cx.inf<.75)cx.fever=false;cx.dressed=true;
  for(const o of ['poumons','peau'])if(cx.st[o]<4){cx.d[o]=Math.max(0,cx.d[o]-hours*1.5);cx.st[o]=stageOf(o,cx.d[o]);}
  if(cx.st.yeux<3){cx.d.yeux=Math.max(0,cx.d.yeux-hours*1.5);cx.st.yeux=stageOf('yeux',cx.d.yeux);if(!cx.st.yeux)h.eyes=0;}}
