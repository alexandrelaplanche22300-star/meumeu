// La santé d'un Meumeu (ou d'un Bèè) : son sang, ce qui saigne, ce qui est cassé, ce qui s'infecte, ce qu'il peut encore faire.
// Deux temps : le sang coule en secondes de combat (une fémorale vide un Meumeu en une demi-minute), mais ce qui est lent se
// compte en heures de jeu (4 s de combat chacune) — un garrot tient 10 h, une panse percée s'infecte en un jour et demi.
//
// États : ok → blessé (il se bat, moins bien) → hors de combat (à terre : il saigne encore, on peut le sauver) → mort.
// Une blessure trop grave met hors de combat tout de suite : le système nerveux, le cœur, un os porteur, ou simplement
// trop d'énergie reçue d'un coup (elle dépend du calibre, de la vitesse, de la munition — tout ce que la balistique a calculé).
//
// Les soins, du plus simple au plus poussé :
//  · l'infirmier (premiers secours) : garrot sur un membre, pansement compressif, pansement thoracique, plasma ;
//  · le médecin, sur place : en plus, drain thoracique, attelle, morphine, transfusion ;
//  · le médecin dans une tente médicale, ou l'hôpital : la chirurgie — hémostase des saignements internes, ligature des
//    vaisseaux sous garrot (le membre est sauvé), suture de la panse et des intestins (plus d'infection) ;
//  · l'hôpital seul guérit tout à fait : le sang revient, les os se ressoudent.
import {PART,REGION,BLOOD,BODY_KG,MUSCLE_BLEED} from './body.js';

export const PLASMA=15;            // mL : une dose de plasma
// ce que les innovations changent aux soins (le monde les règle) : durée d'un garrot, plasma par dose, vitesse de l'infection
export const MED={tq:1,plasma:1,sepsis:1};
export const TRANSFUSION=25;       // mL : une transfusion de sang
const HOUR=4;                      // secondes de combat par heure de jeu
export const TQ_LIMIT=10*HOUR;     // un garrot au-delà de 10 heures : le membre est perdu
export const SEPSIS=36*HOUR;       // une panse ou un intestin percés, sans chirurgie : la péritonite tue en un jour et demi
export function newHealth(){return {blood:BLOOD,bleeds:[],wounds:[],state:'ok',legs:0,arms:0,pneumo:0,sealed:false,conc:0,shock:0,cause:null,down:0,dead:null,log:[],splint:0,eyes:0,gut:0,sepsis:0,lost:[],pain:0,morph:0};}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
// la gravité, de 1 (égratignure) à 6 (mortelle) — à la manière de l'échelle AIS
export const SEV=['','légère','modérée','sérieuse','grave','critique','mortelle'];

// Appliquer une blessure calculée par la balistique. `rec` : le résultat de wound() ; `rnd` : le hasard du monde.
// Renvoie un résumé : gravité, texte, parties touchées, et ce qui arrive tout de suite.
export function applyWound(h,rec,rnd,from='tir'){if(h.state==='mort')return null;const out={sev:1,parts:[],now:null,bleed:0,text:''};let kill=null,downNow=null;
  const add=(name,sev,note='')=>{out.parts.push({name,sev,note});out.sev=Math.max(out.sev,sev);};
  for(const [k,d] of Object.entries(rec.dmg)){const p=PART[k];
    if(!p){const r=REGION[k];if(!r||d.crush<1e-4)continue;const cm3=d.crush;const rate=MUSCLE_BLEED*cm3;if(rate>0)h.bleeds.push({name:r.name,rate,limb:r.limb||null,internal:false});out.bleed+=rate;
      add(r.name,cm3/(r.vol*1e6)>.08?3:cm3/(r.vol*1e6)>.02?2:1,r.horn?'corne':'chairs');continue;}
    const frac=d.crush/(p.vol*1e6),str=d.stretch;
    switch(p.kind){
      case 'cns':if(p.id==='cerveau'&&(frac>.002||str>.25)){kill=kill||'cerveau';add(p.name,6,'détruit');}
        else if(p.id==='tronc'){kill=kill||'tronc cérébral';add(p.name,6);}
        else if(p.id==='moelle'&&frac>0){if((d.at?.[1]??0)>.165){kill=kill||'moelle cervicale';add(p.name,6,'cervicale : arrêt respiratoire');}else{downNow='paralysé';h.legs=2;h.para=1;add(p.name,5,'paralysie');}}
        else if(p.id==='cerveau'){h.conc=Math.max(h.conc,60+rnd()*90);add(p.name,4,'commotion');}break;
      case 'heart':{if(d.cut>0||frac>0){const rate=p.bleed*Math.max(d.cut,.4);h.bleeds.push({name:p.name,rate,internal:true});out.bleed+=rate;h.heart=true;add(p.name,6,'perforé');}break;}
      case 'artery':case 'vein':{if(d.cut<.25)break;const rate=p.bleed*d.cut;h.bleeds.push({name:p.name,rate,limb:p.limb||null,internal:!p.limb,vessel:p.kind});out.bleed+=rate;
        add(p.name,rate>p.bleed*.6?(p.bleed>3?5:4):3,d.cut>.9?'sectionnée':'déchirée');break;}
      case 'lung':{const rate=p.bleed*clamp(frac*4+str);h.bleeds.push({name:p.name,rate,internal:true});out.bleed+=rate;h.pneumo=Math.max(h.pneumo,1);h.drained=false;add(p.name,frac>.05?4:3,'perforé · pneumothorax');break;}
      case 'organ':{const tear=clamp(frac*3+str);if(tear<.01)break;const rate=p.bleed*tear;h.bleeds.push({name:p.name,rate,internal:true,gut:!!p.gut});out.bleed+=rate;if(p.gut&&frac>0){h.gut=(h.gut||0)+1;h.gutFixed=false;}
        add(p.name,tear>.5?5:tear>.2?4:3,(str>frac*3?'éclaté par la cavité':'perforé')+(p.gut&&frac>0?' · risque de péritonite':''));break;}
      case 'bone':{if(!d.frac)break;let note='fracturé',sev=3;
        if(p.horn){note='cassée';sev=1;}
        else if(p.walk||p.id==='bassinos'){h.legs++;downNow=downNow||(p.id==='bassinos'?'bassin brisé':'jambe brisée');note='fracture : ne tient plus debout';sev=4;}
        else if(p.limb==='arm'){h.arms++;note=p.id.startsWith('omo')?'fracture : l’épaule ne tient plus':'fracture : bras inutilisable';}
        else if(p.id==='crane'){h.conc=Math.max(h.conc,90+rnd()*120);note='fracture du crâne · commotion';sev=4;}
        else if(p.id==='machoire'){note='museau fracassé';}
        else if(p.id==='rachis'){note='vertèbre brisée';sev=4;}
        (h.fractures??=[]).push(p.name);add(p.name,sev,note);break;}
      // le museau est plein d'air : ça saigne fort par le nez, sans toucher rien de vital
      case 'air':{const tear=clamp(frac*6);if(tear<.02)break;const rate=p.bleed*tear;h.bleeds.push({name:p.name,rate,internal:false});out.bleed+=rate;add(p.name,tear>.4?3:2,'le museau saigne');break;}
      case 'airway':{if(frac<=0&&d.cut<=0)break;const rate=p.bleed;h.bleeds.push({name:p.name,rate,internal:true});out.bleed+=rate;h.pneumo=Math.max(h.pneumo,1);h.drained=false;add(p.name,4,'percée · il étouffe');break;}
      case 'eye':{if(frac<=0)break;h.eyes=(h.eyes||0)+1;add(p.name,3,'crevé : il vise mal');break;}}}
  // tout de suite : la mort, le choc de ce qu'on a reçu, ou rien encore
  const ePerKg=rec.E/BODY_KG;const torso=['thorax','abdomen','bassin','tete','cou'].some(r=>rec.regions.has(r));
  const pIncap=clamp((ePerKg-3)/22)*(torso?1:.45)+(h.heart?.7:0)+(out.bleed>BLOOD*.02?.4:0);
  h.pain=Math.min(10,(h.pain||0)+out.sev);
  if(kill){h.state='mort';h.cause=kill;h.dead={t:0};out.now='mort';}
  else if(downNow||h.conc>0){h.state='hors';h.cause=downNow||'commotion';out.now='hors';}
  else if(rnd()<pIncap){h.state='hors';h.cause='choc';h.shock=15+rnd()*45;out.now='hors';}
  else if(h.state==='ok')h.state='blesse';
  const main=out.parts.slice().sort((a,b)=>b.sev-a.sev);
  out.text=main.slice(0,4).map(p=>`${p.name}${p.note?' ('+p.note+')':''}`).join(' · ')||'rien de vital';
  const w={sev:out.sev,text:out.text,from,entry:rec.entry,exit:rec.exit,t:0,parts:out.parts};h.wounds.push(w);if(h.wounds.length>12)h.wounds.shift();out.wound=w;
  return out;}
// Le saignement total, en mL/s, compte tenu des soins
export function bleedFactor(b){return b.tq?0:b.clamped?.04:b.dressed?(b.internal?.85:.2):1;}
export function bleedRate(h){let s=0;for(const b of h.bleeds)s+=b.rate*bleedFactor(b);return s;}
// La convalescence, hors de l'hôpital : quand plus rien ne saigne, le sang revient (2 % par heure de jeu, soit par 4 s de combat)
// et une blessure légère se referme en deux jours. Un os cassé, un poumon percé, un saignement interne : il faut l'hôpital.
const REST=2*24*HOUR;
export function tickHealth(h,dts){if(h.state==='mort'||(h.state==='ok'&&!h.bleeds.length&&!h.pneumo&&h.conc<=0))return null;const before=h.state;
  for(const b of h.bleeds){if(b.rate<.02&&!b.internal)b.rate*=Math.exp(-dts/90);                // les petits saignements coagulent
    if(b.tq&&!b.lost){b.tqT=(b.tqT||0)+dts;if(b.tqT>TQ_LIMIT*MED.tq&&b.limb){b.lost=true;if(!h.lost.includes(b.limb+(b.name.includes('droit')?'D':'G')))h.lost.push(b.limb+(b.name.includes('droit')?'D':'G'));
      h.log?.push({dt:0,what:`membre perdu : le garrot sur ${b.name} a tenu trop longtemps`,bad:1});if(b.limb==='leg')h.legs=Math.max(h.legs,1);else h.arms=Math.max(h.arms,1);}}}
  h.bleeds=h.bleeds.filter(b=>b.internal||b.tq||b.rate>1e-4);
  const br=bleedRate(h);h.blood=Math.max(0,h.blood-br*dts);
  // une panse, un intestin percés s'infectent
  if(h.gut&&!h.gutFixed)h.sepsis=(h.sepsis||0)+dts/SEPSIS*MED.sepsis;
  if(h.morph>0)h.morph-=dts;
  const legsOk=h.legs<=(h.splint||0)&&!h.para;
  if(br<.002&&!h.pneumo&&legsOk&&!h.arms&&!h.bleeds.some(b=>b.internal&&!b.clamped)&&!(h.gut&&!h.gutFixed)){h.blood=Math.min(BLOOD,h.blood+BLOOD*.02*dts/HOUR);h.rest=(h.rest||0)+dts;
    if(h.state==='blesse'&&h.rest>REST&&h.blood>BLOOD*.95&&!h.legs&&!h.lost.length){h.state='ok';h.wounds=[];h.bleeds=[];h.rest=0;h.pain=0;return 'ok';}}else h.rest=0;
  const loss=1-h.blood/BLOOD;
  if(h.pneumo&&!h.sealed)h.pneumo+=dts;if(h.conc>0)h.conc-=dts;if(h.shock>0)h.shock-=dts*(h.morph>0?3:1);
  if(loss>.5||(h.pneumo>420&&!h.sealed)||h.sepsis>=1){h.state='mort';h.cause=loss>.5?'hémorragie':h.sepsis>=1?'péritonite':'asphyxie';}
  else if(loss>.36||(h.pneumo>150&&!h.sealed)||!legsOk||h.conc>0||h.shock>0||h.sepsis>.75){if(h.state!=='hors'){h.state='hors';h.cause=loss>.36?'hémorragie':h.pneumo>150?'détresse respiratoire':h.sepsis>.75?'fièvre, infection':!legsOk?(h.para?'paralysé':'jambe brisée'):h.cause||'choc';}}
  else if(h.state==='hors')h.state=h.wounds.length?'blesse':'ok';
  if(h.state==='hors')h.down+=dts;
  return h.state!==before?h.state:null;}
// Ce que la blessure retire : précision, vitesse. (Un bras cassé, un œil crevé, c'est viser mal ; la douleur et le sang perdu aussi.)
export function malus(h){const loss=1-h.blood/BLOOD;const pain=h.morph>0?0:(h.pain||0)*.05;
  return {aim:1+h.arms*1.5+(h.eyes||0)*.9+loss*3+(h.pneumo?.5:0)+pain,move:!(h.legs<=(h.splint||0))||h.para?0:(h.legs?.3:1)*(1-loss*1.2-(h.pneumo?.3:0))};}
// ---------- les soins ----------
// Premiers secours (l'infirmier, et le médecin) : garrot sur les membres, pansement compressif ailleurs, pansement thoracique, plasma.
export function firstAid(h,kit=1){const done=[];for(const b of h.bleeds){if(b.tq||b.dressed||b.clamped)continue;if(b.limb){b.tq=true;b.tqT=0;done.push(`garrot (${b.name})`);}else{b.dressed=true;done.push(`pansement (${b.name})`);}}
  if(h.pneumo&&!h.sealed&&!h.drained){h.sealed=true;done.push('pansement thoracique');}
  if(kit>=2&&h.blood<BLOOD*.75){h.blood=Math.min(BLOOD,h.blood+PLASMA*MED.plasma);done.push('plasma');}
  return done;}
export const treat=firstAid;
// Le médecin, sur place : en plus des premiers secours, il draine le thorax, pose les attelles, calme la douleur, transfuse.
// Dans une tente médicale (ou à l'hôpital), il opère : hémostase, ligature des vaisseaux sous garrot, suture digestive.
export function doctorCare(h,kit,surgery=false){const done=firstAid(h,kit);
  if(h.pneumo&&!h.drained){h.drained=true;h.pneumo=0;h.sealed=false;done.push('drain thoracique');}
  const brk=h.legs+h.arms;if(brk>(h.splint||0)&&!h.para){h.splint=h.legs;h.splintA=h.arms;done.push(h.legs?'attelle : il boitera jusqu’à l’arrière':'attelle');}
  if((h.shock>0||(h.pain||0)>3)&&!(h.morph>0)&&kit>=1){h.morph=12*HOUR;h.shock=Math.min(h.shock,2);done.push('morphine');}
  if(kit>=2&&h.blood<BLOOD*.8){h.blood=Math.min(BLOOD,h.blood+TRANSFUSION);done.push('transfusion');}
  if(surgery){for(const b of h.bleeds){if(b.internal&&!b.clamped){b.clamped=true;done.push(`hémostase (${b.name})`);}else if(b.tq&&!b.lost){b.tq=false;b.clamped=true;done.push(`ligature (${b.name}) : le membre est sauvé`);}}
    if(h.gut&&!h.gutFixed){h.gutFixed=true;h.sepsis=Math.min(h.sepsis,.2);done.push('suture digestive');}}
  return done;}
// ce qui reste à faire, et qui peut le faire
export function needsCare(h){return h.state!=='mort'&&(h.bleeds.some(b=>!b.tq&&!b.dressed&&!b.clamped&&b.rate>.005)||(h.pneumo&&!h.sealed&&!h.drained));}
export function needsDoctor(h){return h.state!=='mort'&&(needsCare(h)||(h.pneumo&&!h.drained)||(h.legs+h.arms>(h.splint||0)&&!h.para)||(h.shock>0&&!(h.morph>0))||h.blood<BLOOD*.7);}
export function needsSurgery(h){return h.state!=='mort'&&(h.bleeds.some(b=>(b.internal&&!b.clamped&&b.rate>.003)||(b.tq&&!b.lost))||(h.gut&&!h.gutFixed));}
// À l'hôpital : on opère (plus de saignement interne), le sang revient, les os se ressoudent.
export function heal(h,hours){doctorCare(h,3,true);h.bleeds=[];h.pneumo=0;h.sealed=false;h.drained=false;h.shock=0;h.conc=0;h.sepsis=0;h.gut=0;h.blood=Math.min(BLOOD,h.blood+BLOOD*.08*hours);
  h.bone=(h.bone||0)+hours;if(h.bone>72){h.legs=0;h.arms=0;h.splint=0;}
  // la convalescence : selon la pire blessure, d'une heure (une égratignure) à deux jours (une blessure critique)
  h.hosp=(h.hosp||0)+hours;const worst=Math.max(0,...h.wounds.map(w=>w.sev||1));h.stay=[0,1,3,8,16,30,48][worst]||0;
  if(h.blood>=BLOOD*.9&&!h.legs&&!h.arms&&h.hosp>=h.stay){h.state='ok';h.wounds=[];h.pain=0;h.hosp=0;return true;}return false;}
// Les constantes : ce que l'infirmier lit en se penchant sur lui
export function vitals(h){const loss=1-h.blood/BLOOD;const br=bleedRate(h);
  const pulse=h.state==='mort'?0:Math.round(130*(1+loss*1.9)*(h.shock>0?1.15:1)*(h.sepsis>.3?1.15:1));
  const resp=h.state==='mort'?0:Math.round(30*(1+(h.pneumo&&!h.sealed&&!h.drained?1.3:h.pneumo?.4:0)+loss*1.2));
  const temp=38.6+(h.sepsis||0)*2.6;const cons=h.state==='mort'?'mort':h.conc>0||loss>.42?'inconscient':loss>.25||h.shock>0?'confus':'éveillé';
  const left=br>.002?Math.max(0,(h.blood-BLOOD*.5)/br):null;return {pulse,resp,temp,cons,loss,br,left};}
// Le triage : qui d'abord. Rouge : il mourra sans soins tout de suite ; jaune : grave mais il tient ; vert : léger ;
// noir : au-delà de ce qu'on peut faire ici (on soigne les autres d'abord).
export function triage(h){if(h.state==='mort')return {k:'mort',label:'mort',c:'#222'};const v=vitals(h);
  if(h.state==='ok'&&!h.bleeds.length)return {k:'ok',label:'indemne',c:'#6f9f78'};
  const internal=h.bleeds.filter(b=>b.internal&&!b.clamped).reduce((a,b)=>a+b.rate*bleedFactor(b),0);
  if((v.left!=null&&v.left<12&&internal>.3)||(h.heart&&internal>.5))return {k:'noir',label:'dépassé',c:'#1d1d1d'};
  if(v.br>.05||(h.pneumo&&!h.sealed&&!h.drained)||v.loss>.3||internal>.03||h.sepsis>.5)return {k:'rouge',label:'urgence absolue',c:'#c62828'};
  if(h.legs||h.arms||h.pneumo||(h.gut&&!h.gutFixed)||h.bleeds.some(b=>b.tq&&!b.lost)||v.loss>.12||h.state==='hors')return {k:'jaune',label:'urgence relative',c:'#e0a800'};
  return {k:'vert',label:'blessé léger',c:'#43a047'};}
