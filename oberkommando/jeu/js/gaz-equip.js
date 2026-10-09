// (V12.9) LA GUERRE CHIMIQUE — la parade et la fiche de jeu : la fiche de chaque agent (létalité, organes, parade, défauts, temps), l'équipement
// de protection (masque, lunettes, combinaison, antidote) pris au dépôt, le masque qu'on enfile au premier souffle, le filtre qui s'use,
// l'auto-injection, les infirmiers (décontamination, antidote), les accidents au laboratoire. Mécanique de jeu FICTIVE (unités de jeu).
// Conception : docs/GUERRE-CHIMIQUE.md §1 et §5. Mixin sur World : gasEquip(u,k,on), gasGearTick(dt) (appelé par gasTick), gasMedic(u), gasMedicTick(u,T).
import * as GS from './gaz-sante.js';
import {AGENTS} from './gaz.js';

// LA FICHE DE JEU de chaque agent : létalité (1 gêne → 5 extrême), organes visés, parade, défauts, dépendance au temps. Le cœur : foin, miel, X-G, X-V.
export const FICHE={
  foin:{tier:3,coeur:true,organes:['poumons','yeux'],parade:['masque_gaz'],
    defauts:['nuage visible : l’ennemi se masque à temps','le vent tourne et le ramène sur nos tranchées','le masque l’arrête presque entièrement'],
    temps:'meilleur par temps frais et calme ; la chaleur le dissipe deux fois plus vite, la pluie le rabat'},
  miel:{tier:4,coeur:true,organes:['peau','yeux','poumons'],parade:['combinaison','masque_gaz','lunettes_gaz'],
    defauts:['persistant : le terrain reste interdit des jours, à nous aussi','colle à la fourrure : contamine brancardiers et infirmiers','effet retardé de plusieurs heures : il n’arrête pas un assaut'],
    temps:'la chaleur le fait remonter du sol (plus dangereux, moins durable) ; la pluie le fixe au sol'},
  xg:{tier:5,coeur:true,organes:['nerfs','yeux'],parade:['masque_gaz','antidote'],
    defauts:['très cher et long à chercher','les lots au laboratoire fuient : les chimistes y passent','se dissipe vite : il faut en lâcher beaucoup d’un coup'],
    temps:'le vent fort le dilue aussitôt ; la nuit calme le fait stagner'},
  xv:{tier:5,coeur:true,organes:['nerfs','peau'],parade:['combinaison','masque_gaz','antidote'],
    defauts:['le plus cher et le plus long','le terrain devient inhabitable : notre propre avance s’arrête aussi','presque pas de nuage : il faut des obus en masse ou des bouteilles'],
    temps:'peu sensible au temps : il reste au sol, la chaleur seule le fait remonter'},
  ortie:{tier:1,coeur:false,organes:['yeux','poumons'],parade:['lunettes_gaz','masque_gaz'],defauts:['ne tue presque jamais'],temps:'se dissipe très vite'},
  cendre:{tier:4,coeur:false,organes:['nerfs','poumons'],parade:['masque_gaz'],defauts:['il faut une concentration énorme','le vent l’emporte aussitôt','sature les filtres (×5)'],temps:'inutilisable par vent fort ou par chaleur'},
};
export const TIER_NAME=['','gêne','incapacitant','meurtrier','très meurtrier','extrême'];
export const GAS_GEAR=['masque_gaz','lunettes_gaz','combinaison','antidote'];
export const GEAR={
  MASK_ON:.25,       // h : le temps d'enfiler le masque au premier souffle (on a déjà respiré une bouffée)
  MASK_OFF:1,        // h sans gaz : on l'enlève
  FILTER:.004,       // par unité de concentration et par heure : l'usure du filtre (la cendre ×5)
  ANTI_MAX:3,        // antidotes par homme
  ANTI_NERFS:8,      // dose de nerfs à laquelle on se pique (seuil 2 : les spasmes)
  LAB_LEAK:{ortie:.003,foin:.005,miel:.006,xg:.02,xv:.015,cendre:.01},   // par heure de production : le risque d'une fuite au laboratoire
  MEDIC_R:10,MEDIC_T:4,   // cases ; secondes de combat par soin
};

export const GAZ_EQUIP={
  // la protection prise ou rendue au dépôt (6 cases) : masque (on l'enfile au premier souffle), lunettes, combinaison (portée, ×0,8), antidote (3)
  gasEquip(u,k,on=true){if(!u||!u.h)return {ok:false,why:['seul un soldat s’équipe']};if(!GAS_GEAR.includes(k))return {ok:false,why:['équipement inconnu']};
    const D=this.gearDepot(u);if(!D)return {ok:false,why:['il faut être à moins de 6 cases d’un dépôt']};
    const field={masque_gaz:'maskKit',lunettes_gaz:'goggles',combinaison:'chemSuit'}[k];
    if(k==='antidote'){const n=u.antidote||0;if(on){if(n>=GEAR.ANTI_MAX)return {ok:false,why:[`${GEAR.ANTI_MAX} antidotes au plus par homme`]};if((D.stock.antidote||0)<1)return {ok:false,why:['aucun antidote au dépôt (l’hôpital en fait, après la découverte)']};
        D.stock.antidote-=1;u.antidote=n+1;return {ok:true,text:`${u.name||'Le soldat'} : ${n+1} antidote${n+1>1?'s':''}`};}
      if(n<=0)return {ok:true,text:'rien à rendre'};this.put(D,'antidote',1);u.antidote=n-1;return {ok:true,text:'un antidote rendu'};}
    if(on){if(u[field])return {ok:true,text:'déjà équipé'};if((D.stock[k]||0)<1)return {ok:false,why:[`${this.goodName(k)} : aucun en stock au ${this.depotName(D)}`]};
      D.stock[k]-=1;u[field]=true;if(k==='masque_gaz'){u.maskF=1;u.gasMask=false;}return {ok:true,text:`${u.name||'Le soldat'} : ${this.goodName(k).toLowerCase()}`};}
    if(!u[field])return {ok:true,text:'rien à rendre'};u[field]=false;if(k==='masque_gaz'){u.gasMask=false;if((u.maskF??1)<.2)return {ok:true,text:'masque au filtre épuisé : jeté'};}this.put(D,k,1);return {ok:true,text:`${this.goodName(k)} rendu au ${this.depotName(D)}`};},
  gasGearOf(u){const L=[];if(u.maskKit)L.push(`masque${u.gasMask?' (porté)':''} · filtre ${Math.round((u.maskF??1)*100)} %`);if(u.goggles)L.push('lunettes');if(u.chemSuit)L.push('combinaison');if(u.antidote)L.push(`${u.antidote} antidote${u.antidote>1?'s':''}`);return L;},
  // le pas de l'équipement : le masque au premier souffle, le filtre qui s'use, l'auto-injection, les accidents de laboratoire
  gasGearTick(dt){const s=this.s,g=s.gas;if(!g)return;
    for(const u of s.units){if(!(u.hp>0)||!u.h||u.h.state==='mort')continue;const C=this.gasAt(u.x,u.y);let tot=0,cendre=0;for(const a in C){tot+=C[a];if(a==='cendre')cendre+=C[a];}
      if(u.maskKit){if(tot>.05){u.gasClear=0;if(!u.gasMask){u.maskT=(u.maskT||0)+dt;if(u.maskT>=GEAR.MASK_ON||u.h.state!=='ok'){u.gasMask=true;u.maskT=0;}}}
        else if(u.gasMask){u.gasClear=(u.gasClear||0)+dt;if(u.gasClear>=GEAR.MASK_OFF){u.gasMask=false;u.gasClear=0;}}
        if(u.gasMask&&tot>0)u.maskF=Math.max(0,(u.maskF??1)-(tot+4*cendre)*GEAR.FILTER*dt);}
      const cx=u.h.cx;if(u.antidote>0&&cx&&(cx.d?.nerfs||0)>=GEAR.ANTI_NERFS&&!(cx.anti>0)&&!cx.doom&&typeof GS.giveAntidote==='function'){GS.giveAntidote(u.h);u.antidote--;(u.h.log??=[]).push({t:s.t,what:'se pique à l’antidote',by:u.name||''});}}
    for(const b of s.buildings){if(!b.done||!b.working||!b.prod?.startsWith?.('agent_'))continue;const a=b.prod.slice(6);const p=(GEAR.LAB_LEAK[a]||0)*dt;if(!(p>0)||this.rand()>=p)continue;
      const [w,h]=this.sizeOf?.(b)||[4,4];this.gasRelease(b.i+w/2,b.j+h/2,a,AGENTS[a].pot*3,{r:2,src:'labo'});if(b.f==='meumeu')this.log(this.nearCity({x:b.i,y:b.j,f:b.f}),`Une fuite au laboratoire : du ${AGENTS[a].name.toLowerCase()} dans les ateliers.`,'bad');}},
  // ce qu'un infirmier peut faire contre le gaz pour e : 'antidote' (nerfs atteints, pas encore piqué), 'decon' (pellicule sur la fourrure)
  gasNeed(e){const cx=e.h?.cx;if(!cx||e.h.state==='mort'||cx.doom)return null;
    if((cx.d?.nerfs||0)>=GEAR.ANTI_NERFS&&!(cx.anti>0)&&this.unlocked('prod:antidote')&&typeof GS.giveAntidote==='function')return 'antidote';
    if(cx.film&&Object.values(cx.film).some(v=>v>.01)&&this.unlocked('soin:decontamination')&&typeof GS.decontaminate==='function')return 'decon';
    if((cx.st?.peau||0)>=2&&!cx.dressed&&typeof GS.dressBlisters==='function')return 'cloques';return null;},
  // l'infirmier choisit un contaminé proche (avant les saignements : l'antidote n'attend pas)
  gasMedic(u){if(!(u.kits>0))return false;let best=null,bs=0;for(const e of this.s.units){if(e.f!==u.f||e.carriedBy)continue;const n=this.gasNeed(e);if(!n)continue;const d=Math.hypot(e.x-u.x,e.y-u.y);if(d>GEAR.MEDIC_R)continue;
      const sc=(n==='antidote'?5:1.5)/(1+d*.15);if(sc>bs){bs=sc;best=e;}}
    if(!best)return false;u.task={kind:'gaz',id:best.id,auto:true};u.treatT=0;return true;},
  gasMedicTick(u,T){const e=this.unit(T.id);const n=e&&e.hp>0?this.gasNeed(e):null;if(!n||!(u.kits>0)){u.task=null;u.treatT=0;return true;}
    if(Math.hypot(u.x-e.x,u.y-e.y)>.35){this.go(u,e.x,e.y);return true;}u.anim='action';u.post='accroupi';u.treatT=(u.treatT||0)+this.dts;if(u.treatT<GEAR.MEDIC_T)return true;u.treatT=0;
    const done=[];if(n==='antidote'){GS.giveAntidote(e.h);done.push('antidote');}else if(n==='cloques'){GS.dressBlisters(e.h);done.push('cloques pansées');}else{
      // laver un contaminé, c'est se contaminer un peu sans combinaison (un dixième de sa pellicule)
      if(!u.chemSuit&&u.h&&e.h.cx?.film&&typeof GS.newChem==='function'){const cx=u.h.cx??=GS.newChem();cx.film??={};for(const a in e.h.cx.film)cx.film[a]=(cx.film[a]||0)+e.h.cx.film[a]*.1;}
      GS.decontaminate(e.h);done.push('décontamination (lavage de la fourrure)');}
    u.kits=Math.max(0,u.kits-1);this.medLog(e,u,done);this.practice('soins',1);u.task=null;return true;},
};
