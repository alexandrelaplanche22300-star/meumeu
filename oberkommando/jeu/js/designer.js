// Le bureau d'études : on dessine une arme, la physique répond. Rien n'est une note arbitraire — la vitesse sort de la poudre et
// du canon, la portée de la traînée et de la dispersion, la blessure du bloc de gélatine calculé pas à pas. Chaque avantage a son
// prix : une balle plus lourde porte plus loin et perce mieux, mais le soldat en porte moins et le recul monte ; plus de poudre,
// c'est plus vite, mais la pression use le tube et l'étui grossit l'arme ; l'automatique arrose, et vide les dépôts.
// Tout se voit en direct : le plateau (l'arme à l'échelle, ses servants), la trajectoire au ralenti, la précision à chaque
// distance, la perforation, le bloc de gélatine ; et chaque réglage s'explique, avec ses chiffres, dans « Ce que ça change ».
import {derive,gel,wound,NOSES,BASES,CONSTRUCTIONS,ACTIONS,MODS,MOUNTS,HUMAN,PROPS,fmt,CASEMATS,RIMS,STOCKS,FINISHES,GUIDES,FEEDS,TUBES,CARRIAGES,SUPS,CX,CX0,cxKey,cxParse,editKit,irOf,irCostOf,PORTS,portOf,toggleMod,fitMods,shieldOf,crewOf,heavyFor,SHIELD_MATS} from './ballistics.js';
import {layout,drawWeapon,drawRound,TIPC} from './gunart.js';
import {GunViewer} from './gun3d.js';
import {setSpecies,regionAt,PART} from './body.js';
import {MATS,deriveArmor,armorHit,plateZone,stopsAt} from './armor.js';
import {ShotView} from './xray.js';
import {FILLS,SHELLS,FUSES,ZB,arcTable,CHARGES} from './explosive.js';
// les cibles du tir d'essai : un Bèè nu, ou protégé
const TARGETS={nue:{name:'Sans protection',a:null},toile:{name:'Gilet de toile',a:{casque:['acier',0],plastron:['toile',5],dos:['toile',5],flancs:['toile',3]}},
  soie:{name:'Gilet balistique',a:{casque:['acier',.8],plastron:['soie',4],dos:['soie',4],flancs:['soie',3]}},acier:{name:'Plastron d’acier',a:{casque:['acier',1],plastron:['acier',1.2],dos:['acier',0],flancs:['acier',0]}},
  composite:{name:'Composite',a:{casque:['acier',1],plastron:['composite',2],dos:['composite',2],flancs:['soie',3]}}};
import {LIMITS,crateCost,weaponCost,protoCost} from './designs.js';
const ROLE_ICO={ingenieur:'⚙',chimiste:'⚗',physicien:'∫'};
import {rng} from './gen.js';
import {PRESETS,FAMS,CHOICE,presetP} from './presets.js';

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const C_LO=Math.log(LIMITS.c[0]),C_HI=Math.log(LIMITS.c[1]);
const cToS=c=>Math.round((Math.log(c)-C_LO)/(C_HI-C_LO)*1000),sToC=s=>+Math.exp(C_LO+(C_HI-C_LO)*s/1000).toFixed(4);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
const mg=g=>g<1?`${fmt(g*1000,0)} mg`:`${fmt(g,g<10?2:1)} g`;
const cm=m=>Math.abs(m)>=2?`${fmt(m,1)} m`:Math.abs(m)<.1?`${fmt(m*100,1)} cm`:`${fmt(m*100,0)} cm`;

// Les munitions, par famille : ce qui sert à quoi
// La couleur de pointe (le code des arsenaux) : on reconnaît la munition à l'œil
// les valeurs par défaut des réglages de forme (une conception ancienne ne les a pas)
const GEO={neck:1.1,shoulder:30,meplat:0,cavity:0,bands:0,coreD:.55,sightMag:2,sightRadius:32,sightHeight:1.2,fins:0,finSize:1,cant:0,ignite:0,stages:1,barrels:4,supVol:250,supBaffles:5,irW:35,irWh:200,irQ:1,irBeam:43,irMode:0,irFilt:1,shieldT:1.8,shieldSize:1};

// ---------- ce que change chaque réglage : le mécanisme, et les chiffres de cette arme ----------
const HELP={
  supArch:(D,p)=>{const S=D.sup;if(!S)return '<b>Silencieux</b> : ajoutez le module « Silencieux » pour le régler.';const A=SUPS[S.arch];return `<b>${esc(A.name)}</b> : ${esc(A.desc)}. Il retire <b>${fmt(S.R,1)} dB</b> à la bouche (${D.dB0} → ${D.dB} dB)${D.dB<=D.actDb+1?' — on n’entend plus que la culasse':''}.${D.crackDb?` La balle est supersonique : son claquement (${D.crackDb} dB) s’entend toujours, le long de la trajectoire ; les Bèè le situent mal, mais ils l’entendent. Une munition subsonique (moins de poudre, une balle plus lourde) l’efface.`:' La balle est subsonique : pas de claquement.'}${S.life?` Ses essuies s’usent : après ${S.life} coups, il ne retire plus que ${Math.round(S.floor*100)} % ; on les change au dépôt.`:''}${S.wet?` Les ${S.wet} premiers coups sont presque muets (×${S.wetK}) ; on le regraisse au dépôt.`:''}`;},
  supVol:(D,p)=>HELP.supArch(D,p),supBaffles:(D,p)=>HELP.supArch(D,p),
  shieldMat:(D,p)=>{const S=D.shield;if(!S)return '<b>Bouclier</b> : ajoutez le module « Bouclier » pour le régler.';const M=MATS[S.mat];return `<b>${esc(M.name)}</b> : ${esc(M.desc)}. Équivalent : ${fmt(M.k,2)} mm d’acier par millimètre (ici ${fmt(S.eq,1)} mm), densité ${fmt(M.rho,1)}.${M.brittle>=.1?' Fragile : chaque balle arrêtée la fissure, il faut la redresser au dépôt.':''}`;},
  shieldT:(D,p)=>HELP.shieldMat(D,p),shieldH:(D,p)=>HELP.shieldSize(D,p),shieldW:(D,p)=>HELP.shieldSize(D,p),shieldSize:(D,p)=>{const S=D.shield;return S?`<b>Taille de la plaque</b> : ${fmt(S.h*100,0)} × ${fmt(S.w*100,0)} cm, ${Math.round(S.kg*1000)} g. Elle protège ce qui est derrière elle, jusqu’à ${fmt(S.h*100,0)} cm : un servant debout (buste à 15 cm) est couvert, un tireur accroupi ou couché l’est mieux encore. Les tirs de côté et de dos la contournent.`:HELP.shieldMat(D,p);},
  irW:(D,p)=>{const I=D.ir;if(!I)return '<b>Visée infrarouge</b> : ajoutez le module pour la régler.';return `<b>Visée infrarouge</b> : de nuit, dans son faisceau (un cône devant l’arme), le tireur voit à <b>${Math.round(I.range*4)} m</b> — lampe de ${I.W} W, tube ${fmt(I.q,2)}× — sans que les Bèè puissent voir cette lumière. Plus la lampe est puissante et le tube fin, plus on voit loin ; un faisceau étroit porte plus loin mais éclaire moins de terrain. Batterie : <b>${fmt(I.hours,0)} h</b> d’utilisation (dix fois plus qu’avant : plusieurs nuits), rechargée au dépôt. Lampe et lunette ${Math.round(I.lampKg*1000)} g sur l’arme, pack de ${Math.round(I.packKg*1000)} g dans le dos (${Math.round(Math.min(35,I.packKg/1.5*120))} % de vitesse en moins). Chaque arme demande du cuivre, ${fmt(I.Wh*.015,1)} plomb pour la batterie et des pièces.`;},
  irWh:(D,p)=>HELP.irW(D,p),irQ:(D,p)=>HELP.irW(D,p),irBeam:(D,p)=>HELP.irW(D,p),irFilt:(D,p)=>HELP.irW(D,p),
  d:(D,p)=>`<b>Le calibre</b> : le diamètre de la balle. Plus large, elle est plus lourde à longueur égale (ici ${mg(D.m)}), creuse une cavité plus grande et casse plus d’os ; mais sa section freine dans l’air (coefficient balistique ${fmt(D.BC,0)}) et, à masse égale, elle perce moins. Au-delà de 7,5 mm l’épaule ne suffit plus, au-delà de 11 mm il faut un trépied. À l’échelle humaine : ${fmt(p.d*HUMAN,1)} mm.`,
  l:(D,p)=>`<b>La longueur de la balle</b> : ${fmt(p.l,1)} mm. Le canon reste à ${p.L} mm ; l’étui et la culasse peuvent grossir. Si la balle est trop courte pour ce nez, sa pointe s’écrase et perd en aérodynamique. Stabilité Sg ${fmt(D.Sg,2)} (${D.Sg<1?'<b class="bad">elle bascule en vol</b>':D.Sg<1.3?'juste':D.Sg>3?'surstabilisée':'bonne'}).`,
  noseScale:(D,p)=>`<b>Profil du nez</b> : pointe ×${fmt(p.noseScale??1,2)}. Sa longueur réelle est ${fmt(D.noseLen,1)} mm, limitée par les ${fmt(p.l,1)} mm de la balle. Sa masse et sa traînée changent, sans modifier le canon.`,
  boat:(D,p)=>`<b>Dépouille du culot</b> : ${Math.round((p.boat??0)*100)} %. Le profil arrière aminci perd un peu de volume et de masse, mais freine moins dans l’air. La coupe montre la forme choisie.`,
  rocketBurn:(D,p)=>D.rocket?`<b>Durée de combustion</b> : ×${fmt(p.rocketBurn??1,2)} ; poussée ${fmt(D.boost.tr*1000,0)} ms après la bouche. Plus longue : accélération moins brutale et trajectoire différente.`:'Disponible pour la propulsion par fusée.',
  nozzle:(D,p)=>D.rocket?`<b>Tuyère</b> : rendement ×${fmt(p.nozzle??1,2)} ; vitesse en fin de poussée ${Math.round(D.vTop)} m/s. Une poussée forte accroît aussi la dispersion.`:'Disponible pour la propulsion par fusée.',
  nose:(D,p)=>`<b>Le nez</b> : sa forme dans l’air et dans la chair. ${esc(NOSES[p.nose].desc)}. Pointue : faible traînée (facteur ${NOSES.pointue.i}), bascule tôt dans le corps. Plate : freine vite (facteur ${NOSES.plate.i}) mais coupe net et ne bascule jamais.`,
  base:(D,p)=>`<b>Le culot</b> : ${p.base==='bt'?'en dépouille (conique), il réduit la traînée d’environ 10 % : la balle garde sa vitesse plus loin, la trajectoire est plus tendue':'plat : plus de volume donc un peu plus lourd, mais plus de traînée en vol'}. Dans le corps, un culot en dépouille aide la balle à basculer un peu plus tôt.`,
  cons:(D,p)=>{const C=CONSTRUCTIONS[p.cons];return `<b>${esc(C.name)}</b> : ${esc(C.desc)}.${C.frag<Infinity&&C.frag>0?` Elle se brise au-dessus de ${C.frag} m/s (elle part à ${Math.round(D.v0)} m/s).`:''}${C.expand?` Elle s’ouvre entre ${C.expand[0]} et ${C.expand[1]} m/s, jusqu’à ${fmt(C.expand[2],2)} fois son diamètre.`:''}${C.minD?` Il faut ${C.minD} mm de calibre au moins.`:''}${D.he?` <b>Charge explosive : ${mg(D.he.g)}</b>.`:' Pas de charge explosive.'}`;},
  c:(D,p)=>`<b>La poudre</b> : ${mg(p.c)}, vivacité ×${fmt(p.burn??1,2)}. C’est l’énergie : ${Math.round(D.v0)} m/s au départ, ${fmt(D.E0,1)} J. Plus de poudre, c’est plus vite, mais la pression monte (${Math.round(D.P)} MPa ; au-delà de 460 le tube s’use vite, au-delà de 620 il peut éclater), l’étui grossit (${fmt(D.caseLen,1)} mm), le recul aussi (${fmt(D.recoil,2)} J). Un canon trop court ne brûle pas tout : ici ${Math.round(D.eta/.32*100)} % du possible.`,
  burn:(D,p)=>`<b>Vivacité effective de la poudre</b> : ×${fmt(p.burn??1,2)}. Elle règle la vitesse de combustion dans le modèle. Plus vive : la pression monte plus tôt, utile dans un tube court mais le pic de pression augmente ; plus progressive : la poussée dure plus longtemps et valorise un tube long. Le modèle intègre le travail des gaz le long du tube, W = ∫P(x)·A dx, puis calcule v = √(2W/m) en respectant l’énergie chimique disponible. La trajectoire applique la gravité et la traînée G7 par pas de temps.`,
  L:(D,p)=>`<b>Le canon</b> : ${p.L} mm. Plus long, la poudre pousse la balle plus longtemps (${Math.round(D.eta/.32*100)} % de l’énergie possible), moins d’éclair à la bouche, meilleure précision ; mais l’arme s’alourdit (${Math.round(D.mass*1000)} g), s’allonge, épaule plus lentement (${fmt(D.aim,2)} s pour viser). À l’échelle humaine : ${fmt(p.L*HUMAN/10,0)} cm.`,
  twist:(D,p)=>`<b>Le pas de rayure</b> : la balle fait un tour tous les ${p.twist} mm. Plus court, elle tourne plus vite : Sg ${fmt(D.Sg,2)}. Sous 1, elle bascule en vol ; entre 1,3 et 2,5, c’est l’idéal ; au-delà de 3 elle est surstabilisée — précise, mais elle reste droite plus longtemps dans le corps (blessure plus fine).`,
  heavy:(D,p)=>`<b>Canon lourd</b> : un tube plus épais, ${p.heavy?'monté':'non monté'}. Il chauffe moins vite (tient ${D.sustain} coups/min en continu), vibre moins (dispersion −15 %), dure plus longtemps ; mais il pèse bien plus lourd.`,
  action:(D,p)=>`<b>La culasse</b> : ${esc(ACTIONS[p.action].desc)}. ${p.action==='verrou'?'Le tireur manœuvre à la main : précis, fiable, lent':p.action==='semi'?'Les gaz réarment : un coup par pression':'Les gaz réarment en boucle : des rafales, de la suppression — mais la chaleur, le recul qui disperse, et les caisses qui fondent'}. Cadence : ${D.rpm} coups/min.`,
  rof:(D,p)=>`<b>La cadence</b> en automatique : ${p.rof} coups/min. Plus haute, plus de balles dans la zone (l’ennemi se couche), mais le tube chauffe (il tient ${D.sustain} coups/min en continu) et un chargeur de ${p.mag} dure ${fmt(p.mag/p.rof*60,1)} s.`,
  mag:(D,p)=>`<b>Le chargeur</b> : ${p.mag} coups. ${ACTIONS[p.action]?.auto&&p.mag>=50?'À partir de 50 en automatique, c’est une bande : il faut un chargeur à côté du tireur. ':''}Plus grand, moins de rechargements ; mais plus lourd (${Math.round(p.mag*D.rm)} g plein).`,
  zero:(D,p)=>`<b>La hausse</b> : on règle la visée pour toucher juste à ${p.zero||50} m. La balle monte au-dessus de la ligne de visée, la croise à ${p.zero||50} m, puis retombe : ${[25,50,100,200].filter(r=>r<=600&&!D.at(r).beyond).map(r=>`${r} m : ${D.los(r)>=0?'+':''}${cm(D.los(r))}`).join(' · ')}. Un Meumeu fait 20 cm de haut : au-delà de ±10 cm, on le rate sans corriger.`,
  wallx:(D,p)=>`<b>L’épaisseur du tube</b> : ×${fmt(D.wallx,2)}. Un tube épais vibre moins (dispersion ${fmt(D.moa,1)} MOA), chauffe moins vite (tient ${D.sustain} coups/min), dure plus (${D.life} coups) ; il pèse (arme ${Math.round(D.mass*1000)} g). Mince : léger, mais il se tord à la chaleur et disperse.`,
  jacket:(D,p)=>`<b>La chemise</b> : l’enveloppe de cuivre autour du noyau, ×${fmt(D.jacket,1)}. Épaisse, la balle reste entière plus longtemps : elle se brise au-dessus de ${Math.round((CONSTRUCTIONS[p.cons].frag||0)*Math.sqrt(D.jacket))||'—'} m/s et s’ouvre plus tard. Mince : elle éclate vite dans le corps (grosse blessure, perce peu).`,
  core:(D,p)=>`<b>Le noyau d’acier</b> : ${Math.round((D.core||0)*100)} % du plomb remplacé par de l’acier trempé. Plus dur, il perce mieux (${fmt(D.pen(D.at(30).v),2)} mm à 30 m), mais la balle est plus légère et coûte du fer.`,
  fragm:(D,p)=>D.he&&!D.he.shaped?`<b>La taille des éclats</b> : ${fmt(p.fragm??4,1)} mg chacun, ${D.he.n} éclats. Des petits éclats sont nombreux : de près, personne n’y échappe ; mais l’air les freine vite (un éclat de 1 mg a perdu les deux tiers de sa vitesse en ${fmt(16*Math.cbrt(.001)*1.1,1)} m). Des gros éclats portent loin et chacun fait une vraie plaie — mais ils sont rares : entre eux, on passe. Aujourd’hui : gravement touché à ${cm(D.he.lethal)}, touché à ${cm(D.he.danger)}.`:'<b>La taille des éclats</b> : seulement pour les munitions explosives à éclats.',
  prop:(D,p)=>D.rocket?`<b>Balle auto-propulsée</b> : ${mg(p.c)} de poudre de fusée dans la balle. Elle quitte le tube à <b>${Math.round(D.v0)} m/s</b>, puis sa fusée la pousse ${fmt(D.boost.tr*1000,0)} ms de plus, jusqu’à <b>${Math.round(D.vTop)} m/s</b> (Δv = 1500 × ln(masse pleine / masse vide)). Le tube ne tient aucune pression : léger, pas de recul ; mais le souffle arrière brûle et assourdit qui se tient derrière, l’éclair trahit le tireur, et la poussée jamais parfaitement dans l’axe disperse (${fmt(D.moa,1)} MOA). De près, elle est lente : elle frappe mieux à 30 m qu’à 3.`:`<b>Cartouche</b> : la poudre brûle dans l’étui ; la balle a toute sa vitesse à la bouche. Essayez la propulsion par fusée : une balle qui accélère après le tube, sans recul.`,
  tbf:(D,p)=>{const T=D.he?.tb;return T?`<b>Le thermobarique</b> : ${Math.round(T.f*100)} % de combustible (${(FILLS[p.fill]?.tb?.fuel)||''}), dispersé à ${Math.round(T.q*100)} % par le cœur, brûlé à ${Math.round(T.eta*100)} % assez vite pour pousser l’onde. Souffle : ${fmt(T.Wcore*1000,1)} g de tolite du cœur + ${fmt(T.Wab*1000,1)} g d’équivalent de la postcombustion${T.cloud?` · nuage détonant de ${fmt(T.cloud,1)} m`:''} · enfermé ×${fmt(T.conf,1)}.`:'';},
  fill:(D,p)=>`<b>L’explosif</b> : ${esc((FILLS[p.fill]||FILLS.tolite).name)} — ${esc((FILLS[p.fill]||FILLS.tolite).desc)}. ${Object.values(FILLS).map(F=>`${F.name} : ×${F.k} de souffle`).join(' · ')}.`,
  shell:(D,p)=>`<b>La coque</b> : ${esc((SHELLS[p.shell]||SHELLS.lisse).name)} — ${esc((SHELLS[p.shell]||SHELLS.lisse).desc)}.`,
  fuse:(D,p)=>`<b>La fusée</b> : ${esc((FUSES[p.fuse]||FUSES.impact).name)} — ${esc((FUSES[p.fuse]||FUSES.impact).desc)}.`,
  hef:(D,p)=>D.he?`<b>La charge explosive</b> : ${Math.round(D.hef*100)} % du volume de la balle, soit ${D.he.g<1?Math.round(D.he.g*1000)+' mg':fmt(D.he.g,2)+' g'}. Le souffle tue à ${cm(D.he.blast)} ; la coque (${mg(D.he.casing)}) éclate en ${D.he.n} éclats lancés à ${Math.round(D.he.vg)} m/s, mortels à ${cm(D.he.lethal)}. Plus d’explosif : plus de souffle, des éclats plus rapides — mais moins nombreux, et une balle plus légère qui perce moins.`:'<b>La charge explosive</b> : seulement pour les munitions explosives (explosive, explosive-incendiaire, semi-perforante, charge creuse).',
  caseD:(D,p)=>`<b>Le diamètre de l’étui</b> : ${fmt(D.Dc,1)} mm (×${fmt(D.Dc/p.d,2)}). La poudre prend la place qu’il faut : un étui gras est court (${fmt(D.caseLen,1)} mm ici), une cartouche trapue, une culasse courte — mais plus lourde de laiton (${mg(D.caseMass)} l’étui) ; un étui fin est long, la culasse s’allonge.`,
  neck:(D,p)=>`<b>Le collet</b> : ${fmt(D.neckL,1)} mm. C’est lui qui tient la balle droite dans l’axe : long, elle part plus droit (dispersion ${fmt(D.moa,1)} MOA), mais l’étui et l’arme s’allongent.`,
  shoulder:(D,p)=>`<b>L’épaulement</b> : ${Math.round(D.shAng)}°. Raide, il perd moins de place et l’étui raccourcit ; doux, il glisse mieux dans la chambre. Une cartouche de pistolet n’en a pas : étui droit.`,
  caseMat:(D,p)=>{const M=CASEMATS[p.caseMat]||CASEMATS.laiton;return `<b>${esc(M.name)}</b> : ${esc(M.desc)}. L’étui pèse ${mg(D.caseMass)} ; le coup ${fmt(D.rm,3)} g, ${D.carry} coups par soldat.${D.caseless?` Le tube tient ${D.sustain} coups/min en continu avant que la poudre ne s’allume seule.`:''}`;},
  rim:(D,p)=>`<b>${esc((RIMS[p.rim]||RIMS.sans).name)}</b> : ${esc((RIMS[p.rim]||RIMS.sans).desc)}.`,
  meplat:(D,p)=>`<b>Le méplat</b> : ${Math.round((D.meplat||0)*100)} % du calibre coupé à plat. La traînée monte vite (coefficient balistique ${fmt(D.BC,0)}) ; la balle frappe à plat.`,
  cavity:(D,p)=>`<b>La cavité</b> : un creux dans le nez, ${Math.round((p.cavity||0)*100)} % de sa longueur. La balle s’allège (${mg(D.m)}), part plus vite ; sur une pointe creuse ou molle, elle s’ouvre dans le corps.`,
  bands:(D,p)=>`<b>Les cannelures</b> : ${p.bands||0}. L’étui s’y sertit : la balle part toujours à la même pression (dispersion ${fmt(D.moa,1)} MOA), au prix d’un peu de traînée.`,
  coreD:(D,p)=>`<b>Le noyau</b> : ${Math.round((p.coreD??.55)*100)} % du calibre. Fin, il concentre l’effort sur une petite surface : il perce mieux (${fmt(D.pen(D.at(30).v),2)} mm d’acier à 30 m).`,
  fins:(D,p)=>D.rocket?`<b>Les ailettes</b> : ${D.fins}. Elles redressent la fusée pendant sa poussée (dispersion ${fmt(D.moa,1)} MOA) ; chacune freine un peu (coefficient ${fmt(D.BC,0)}).`:'Seulement pour une balle-fusée.',
  finSize:(D,p)=>D.rocket?`<b>L’envergure des ailettes</b> : ×${fmt(p.finSize??1,2)} calibre. Grandes : plus stable, plus de traînée.`:'Seulement pour une balle-fusée.',
  cant:(D,p)=>D.rocket?`<b>Les tuyères inclinées</b> : ${fmt(p.cant||0,1)}°. La fusée tourne sur elle-même : ses défauts de poussée s’annulent (dispersion ${fmt(D.moa,1)} MOA), mais une part de la poussée part en rotation (fin de poussée ${Math.round(D.vTop)} m/s).`:'Seulement pour une balle-fusée.',
  ignite:(D,p)=>D.rocket?`<b>L’allumage retardé</b> : ${p.ignite||0} ms. Une petite charge l’éjecte à ${Math.round(D.v0)} m/s, le moteur s’allume loin du tireur : presque pas d’éclair (signature ×${fmt(D.flash,2)}) ni de souffle arrière ; elle est plus lente à partir.`:'Seulement pour une balle-fusée.',
  stages:(D,p)=>D.rocket?`<b>Les étages</b> : ${p.stages||1}. À deux étages, le premier se détache vide et le second repart plus léger : plus de vitesse pour la même poudre (${Math.round(D.vTop)} m/s) ; la séparation disperse un peu.`:'Seulement pour une balle-fusée.',
  guide:(D,p)=>{const G=GUIDES[p.guide]||GUIDES.aucun;return D.rocket?`<b>${esc(G.name)}</b> : ${esc(G.desc)}. Dispersion ${fmt(D.moa,1)} MOA.`:'Seulement pour une balle-fusée.';},
  stock:(D,p)=>{const S=STOCKS[p.stock]||STOCKS.bois;return `<b>${esc(S.name)}</b> : ${esc(S.desc)}. Arme ${Math.round(D.mass*1000)} g, ${fmt(D.aim,2)} s pour viser, recul ressenti ${fmt(D.rk,2)}.`;},
  finish:(D,p)=>`<b>${esc((FINISHES[p.finish]||FINISHES.bleui).name)}</b> : la couleur du métal et du bois. Elle ne change rien au tir ; l’or des gravures coûte du cuivre. On la reconnaît au combat.`,
  feed:(D,p)=>`<b>${esc(D.feed.name)}</b> : ${esc(D.feed.desc)}. Le chargeur plein participe aux ${Math.round(D.mass*1000)} g de l’arme${D.feed.crew?' et réclame un servant supplémentaire':''}.`,
  tube:(D,p)=>`<b>${esc(D.tube.name)}</b> : ${esc(D.tube.desc)}. Dispersion ${fmt(D.moa,1)} MOA, durée ${D.life} coups, tir continu ${D.sustain} coups/min.`,
  carriage:(D,p)=>`<b>${esc(D.carriage.name)}</b> : ${esc(D.carriage.desc)}. Mise en batterie ${fmt(D.setup,1)} s, ${D.crew} servant${D.crew>1?'s':''}.`,
  barrels:(D,p)=>`<b>${D.barrels} tubes</b> : chacun ajoute sa masse et son coût, mais partage la chaleur. Le modèle, les colliers et la bouche changent en direct.`,
  mods:(D,p)=>`<b>Les modules</b> : chacun a son prix en poids et en fabrication. Montés ici : ${D.mods.length?D.mods.map(k=>`${MODS[k].name.toLowerCase()} (${Math.round(D.modKg[k]*1000)} g)`).join(', '):'aucun'}.`,
  ...Object.fromEntries(Object.entries(MODS).map(([k,M])=>[`mod-${k}`,(D,p)=>{const P=PORTS[portOf(k)];return `<b>${esc(M.name)}</b> : ${esc(M.desc)}.${D.modKg[k]!=null?` Ici : ${Math.round(D.modKg[k]*1000)} g.`:''}${P?` <i>Se fixe : ${esc(P.name.toLowerCase())}${P.one?` — ${esc(P.hint)} (choisir celui-ci remplace l’autre)`:''}.</i>`:''}`;}])),
};

// V12.5 : les chiffres clés dont on montre l'évolution sous le curseur pris (nom, unité, décimales, sens du mieux : 1 plus c'est haut, -1 plus c'est bas, 0 neutre)
const KEYS=[['v0','Vitesse','m/s',0,1],['E0','Énergie','J',1,1],['eff','Portée utile','m',0,1],['pen','Perce à 30 m','mm',2,1],['moa','Dispersion','MOA',1,-1],['mass','Arme','g',0,-1],['rk','Recul','J',2,-1],['P','Pression','MPa',0,-1],['carry','Coups portés','',0,1],['rpm','Cadence','coups/min',0,1],['aim','Pour viser','s',2,-1],['Sg','Stabilité','',2,0],['dB','Bruit','dB',0,-1],['m','Balle','mg',0,0],['blast','Souffle mortel','cm',0,1],['lethal','Éclats mortels','cm',0,1],['nv','Portée de nuit','m',0,1],['beam','Faisceau','°',0,0],['lit','Largeur éclairée','m',0,1],['leak','Se trahit','',0,-1],['shH','Plaque, haut','cm',0,0],['shW','Plaque, large','cm',0,0],['shEq','Plaque, acier','mm',1,1],['flash','Éclair','',2,-1],['life','Vie du canon','coups',0,1],['sup','Coupe du manchon','dB',1,1]];
const keyNums=D=>{const I=D.ir,S=D.shield,nv=I?I.range*4:NaN,beam=I?I.beam:NaN;return {v0:D.rocket?D.vTop:D.v0,E0:D.E0,eff:D.eff,pen:D.pen(D.at(30).v),moa:D.moa,mass:D.mass*1000,rk:D.rk*SHOOTER,P:D.P,carry:D.carry,rpm:D.rpm,aim:D.aim,Sg:D.Sg,dB:D.dB,m:D.m*1000,blast:D.he?D.he.blast*100:NaN,lethal:D.he&&!D.he.shaped?D.he.lethal*100:NaN,nv,beam,lit:I?2*nv*Math.tan(beam*Math.PI/360):NaN,leak:I?(I.leak?1:0):NaN,shH:S?S.h*100:NaN,shW:S?S.w*100:NaN,shEq:S?S.eq:NaN,flash:D.flash,life:D.life,sup:D.sup?D.sup.R:NaN};};
// la vue d'analyse qui montre le mieux l'effet de chaque réglage (le plateau, lui, est toujours visible)
const VIEW_OF={d:'round',l:'round',noseScale:'round',boat:'round',meplat:'round',bands:'round',caseD:'round',neck:'round',shoulder:'round',caseMat:'round',rim:'round',nose:'round',base:'round',
  core:'pen',coreD:'pen',jacket:'gel',cavity:'gel',cons:'gel',hef:'zone',fragm:'zone',fill:'zone',shell:'zone',fuse:'zone',
  c:'traj',burn:'traj',L:'traj',zero:'traj',sightHeight:'traj',sightRadius:'traj',rocketBurn:'traj',nozzle:'traj',prop:'traj',ignite:'traj',stages:'traj',
  twist:'prec',wallx:'prec',sightMag:'prec',sightObj:'prec',tube:'prec',fins:'prec',finSize:'prec',cant:'prec',guide:'prec'};
// trois leviers, dits à partir de cette arme : ce qui monte vraiment la puissance, la portée, la précision
function leversHtml(D,p){const eta=Math.round((D.eta||0)/.32*100);
  const pow=eta<75?`Le canon ne prend que ${eta} % de l’énergie de la poudre : allongez-le, ou rendez la poudre plus vive.`:`Énergie ${fmt(D.E0,0)} J à ${Math.round(D.rocket?D.vTop:D.v0)} m/s. Pour monter : plus de poudre, ou une balle plus longue. Un plus gros calibre alourdit et blesse plus, mais freine davantage.`;
  const range={frein:`Elle freine avant d’arriver (coefficient ${fmt(D.BC,0)}). Allongez la balle, pointez le nez, creusez la dépouille, ou donnez plus de vitesse.`,
    dispersion:D.Sg<1.3?`Elle n’est pas tenue en vol (Sg ${fmt(D.Sg,2)}). Raccourcissez le pas de rayure.`:`La dispersion (${fmt(D.moa,1)} MOA) rate la cible avant que la balle ne tombe. Canon plus long pour son calibre, tube plus épais, ou un bipied.`,
    visee:`L’œil lâche avant la balle. Ajoutez une lunette, ou allongez le rayon de visée.`,
    chute:`La trajectoire plonge. Plus de poudre, une balle plus longue et plus fine (nez pointu, dépouille).`}[D.effWhy]||'';
  const prec=D.Sg<1.3?`Sg ${fmt(D.Sg,2)} : raccourcissez le pas de rayure, sinon elle bascule.`
    :D.Sg>3?`Sg ${fmt(D.Sg,2)}, surstabilisée : allongez un peu le pas de rayure.`
    :`Dispersion ${fmt(D.moa,1)} MOA, Sg ${fmt(D.Sg,2)}. Pour resserrer : tube plus épais, canon plus long, collet plus long, bipied ou trépied.`;
  return `<div class="dz-levers"><p><b>Puissance.</b> ${pow}</p><p><b>Portée (${D.eff} m).</b> ${range}</p><p><b>Précision.</b> ${prec}</p></div>`;}

// Atelier complet de la V5.8 : toujours utilisable avec les armes des versions récentes.
export class DesignerAncien{
  constructor(host,{world,bureau,propose,ico,goodName,toArmor}){this.host=host;this.plan3d=(()=>{try{return localStorage.getItem('okm-plan3d')!=='0';}catch(e){return true;}})();this.world=world;this.bureau=bureau;this.propose=propose;this.ico=ico;this.goodName=goodName;this.toArmor=toArmor;this.gelR=20;this.help='cons';this.anim=null;this.target='nue';this.shotKey='';this.runId=0;
    this.muzzle=new Image();this.muzzle.src=new URL('../assets/fx/weapon_muzzle_generated.png',import.meta.url).href;this.muzzle.onload=()=>{if(this.open&&this.D)this.draw(0);};
    host.addEventListener('input',e=>{if(e.target.closest('#designer.dz'))this.read(e.target);});
    host.addEventListener('change',e=>{if(e.target.id==='dz-from'){this.load(e.target.value);}else if(e.target.closest('#designer.dz')&&(e.target.type==='range'||e.target.type==='number'))this.fire();});
    host.addEventListener('pointerover',e=>{const h=e.target.closest('[data-help]');if(h&&h.dataset.help!==this.help){this.help=h.dataset.help;this.renderHelp();}});
    host.addEventListener('focusin',e=>{const h=e.target.closest('[data-help]');if(h){this.help=h.dataset.help;if(e.target.matches?.('input[type=range],input[type=number]'))this.effStart(h.dataset.help);this.renderHelp();}});
    host.addEventListener('pointerdown',e=>{const el=e.target.closest?.('#designer input[type=range]');const h=el?.closest('[data-help]');if(h)this.effStart(h.dataset.help);});
    host.addEventListener('change',e=>{if(e.target.id==='dz-follow'){this.follow=e.target.checked;try{localStorage.setItem('okm-dz-follow',this.follow?'1':'0');}catch(_){}}});
    this.view=(()=>{try{return localStorage.getItem('okm-dz-view')||'traj';}catch(e){return 'traj';}})();this.follow=(()=>{try{return localStorage.getItem('okm-dz-follow')!=='0';}catch(e){return true;}})();
    host.addEventListener('click',e=>{const b=e.target.closest('[data-dz]');if(!b)return;const [k,v]=b.dataset.dz.split(':');
      if(k==='close'){if(this.engin){const cb=this.engin.onCancel;this.engin=null;this.close();cb?.();return;}if(this.onExit)this.onExit();else this.close();}else if(k==='p3d'){this.plan3d=!this.plan3d;try{localStorage.setItem('okm-plan3d',this.plan3d?'1':'0');}catch(e){}this.build();this.render();this.draw(0);}else if(k==='armor'){this.toArmor?.();}else if(k==='preset'){this.applyPreset(v);}else if(k==='blank'){this.blank();}else if(k==='gel'){this.gelR=+v;this.render();}else if(k==='tgt'){this.target=v;this.render();}else if(k==='shotmode'){if(this.shot)this.shot.mode=v;this.sync();}else if(k==='fire')this.fire();else if(k==='view'){this.setView(v,true);}else if(k==='who'){this.who=v;for(const x of this.host.querySelectorAll('[data-dz^="who:"]'))x.classList.toggle('on',x.dataset.dz==='who:'+v);this.render();}
      else if(k==='go'&&this.engin){const cb=this.engin.onDone,p=JSON.parse(JSON.stringify(this.p));this.engin=null;this.close();cb?.(p);}
      else if(k==='go'){const r=this.propose(this.p,this.name);this.say(r.ok?r.text:r.why.join(' · '),r.ok?'good':'bad');if(r.ok){if(this.onExit)this.onExit();else this.close();}}
      else if(k==='cx'){const [,f,val]=b.dataset.dz.split(':');this.effStart('cons');this.detachKit();const cur=String(this.p.cons).startsWith('cx:')?cxParse(this.p.cons):{...CX0};cur[f]=['cxtr','cxinc','cxhe','cxn','cxs'].includes(f)?+val:val;this.p.cons=cxKey(cur);this.help='cons';this.build();this.render();this.fire();}
      else if(k==='mod'){this.effStart('mod-'+v);this.detachKit();this.p.mods=toggleMod(this.p.mods,v);this.help='mod-'+v;this.sync();this.render();this.fire();}
      else if(['nose','base','action','cons','fill','shell','fuse','prop','caseMat','rim','stock','finish','guide','feed','tube','carriage','supArch','shieldMat'].includes(k)){this.effStart(k);this.detachKit();this.p[k]=v;if(k==='action'&&ACTIONS[v]?.mortar)this.p.mag=1;this.help=k;this.sync();this.render();this.fire();}});
    addEventListener('resize',()=>{if(this.open)this.render();});}
  get open(){return !this.host.hidden;}
  show(fromId='mle1'){this.host.hidden=false;this.load(fromId);const run=++this.runId;let last=performance.now();const loop=now=>{if(!this.open||run!==this.runId)return;const dt=Math.min(.1,(now-last)/1000);last=now;try{this.shot?.step(dt);}catch(e){console.error(e);}if(this.plan3d&&this.D&&!this.anim)try{this.drawPlan(this.D,0);}catch(e){}requestAnimationFrame(loop);};requestAnimationFrame(loop);}
  showDraft(p,name){this.kitSynced=null;this.show('mle1');this.p={...this.p,...JSON.parse(JSON.stringify(p))};this.name=name;this.build();this.render();this.fire();}
  // la construction sur mesure : chaque pièce se choisit, la balle se recalcule (sa clé porte tous les choix)
  cxHtml(p){const on=String(p.cons).startsWith('cx:');const o={...CX0,...(on?cxParse(p.cons):{})};const opt=(f,L)=>`<div class="seg wrap">${Object.entries(L).map(([v,x])=>`<button data-dz="cx:${f}:${v}" class="${on&&o[f]===v?'on':''}">${esc(x.name)}</button>`).join('')}</div>`;
    const tog=(f,n)=>`<button data-dz="cx:${f}:${o[f]?0:1}" class="${on&&o[f]?'on':''}">${n}</button>`;
    return `<div class="dz-fam"><small>Sur mesure ${on?'<b>· active</b>':'· choisissez une pièce pour commencer'}</small>
      <div class="dz-f"><span>Chemise</span>${opt('cxj',CX.j)}</div><div class="dz-f"><span>Noyau</span>${opt('cxc',CX.c)}</div><div class="dz-f"><span>Pointe</span>${opt('cxt',CX.t)}</div>
      <div class="dz-f"><span>Charges</span><div class="seg wrap">${tog('cxtr','Traçante')}${tog('cxinc','Incendiaire')}${tog('cxhe','Explosive')}</div></div>
      <div class="dz-f"><span>Projectiles par coup</span><div class="seg wrap">${[1,2,3,5,9,12,20,30].map(n=>`<button data-dz="cx:cxn:${n}" class="${on&&o.cxn===n?'on':''}">${n}</button>`).join('')}</div></div>
      <div class="dz-f"><span>Ouverture de la gerbe</span><div class="seg wrap">${[2,5,10,16,28,45].map(n=>`<button data-dz="cx:cxs:${n}" class="${on&&o.cxs===n?'on':''}">${n} mrad</button>`).join('')}</div></div></div>`;}
  close(){++this.runId;this.host.hidden=true;this.anim=null;this.shot?.dispose();this.shot=null;this.shotKey='';}
  detachKit(){} // Une action de l'atelier ne supprime jamais la fiche continue.
  // l'arme vierge : le strict nécessaire pour tirer une balle ; rien n'est choisi pour le joueur
  blank(){this.kitSynced=null;this.p={d:1.5,l:5,nose:'ogive',base:'plat',cons:'fmj',c:.02,L:100,twist:60,action:'verrou',rof:300,mag:1,feed:'interne',heavy:false,burn:1,wallx:1,jacket:1,core:0,hef:.3,fragm:4,zero:40,prop:'cartouche',fill:'tolite',shell:'lisse',fuse:'impact',mods:[],noseScale:1,boat:0,rocketBurn:1,nozzle:1,...CHOICE,feed:'interne'};
    this.name=`Conception ${Object.keys(this.world().s.designs).length+1}`;this.help='cons';this.shotKey='';this.build();this.render();this.fire();}
  applyPreset(k){this.kitSynced=null;const P=PRESETS[k];if(!P)return;this.p=presetP(k);this.name=P.name;this.help='cons';this.shotKey='';this.build();this.render();this.fire();}
  // (V12.8) l'arme d'un engin : retouchée ici, puis rendue à sa tourelle (onDone) — pas de programme, pas de prototype
  editP(p,name,{onDone,onCancel}={}){this.engin={onDone,onCancel,p0:JSON.parse(JSON.stringify(p)),name};this.show(null);}
  load(id){const E=this.engin?.p0?{id:'(engin)',name:this.engin.name,p:this.engin.p0,base:false,engin:true}:null;if(E)this.engin.p0=null;const d=E||this.world().design(id)||this.world().design('mle1');this.ref=d;this.kitSynced=null;this.p=JSON.parse(JSON.stringify(d.p));this.p.burn??=1;this.p.noseScale??=1;this.p.boat??=d.p.base==='bt'?.3:0;this.p.rocketBurn??=1;this.p.nozzle??=1;this.p.mods=fitMods(this.p.mods);this.p.zero??=50;this.p.prop??='cartouche';this.p.fill??='tolite';this.p.shell??='lisse';this.p.fuse??='impact';this.p.fragm??=4;for(const [k,v] of Object.entries(CHOICE))this.p[k]??=v;
    this.name=d.engin?d.name:d.base?`${d.name.replace(/Mle \d+/,'')}Modèle ${Object.keys(this.world().s.designs).length}`.trim():`${d.name} (variante)`;this.build();this.render();this.fire();}
  say(t,tone){const el=this.host.querySelector('.dz-say');if(el){el.textContent=t;el.className='dz-say '+tone;}}
  // la page, une fois ; ensuite on ne change que les chiffres et les dessins
  build(){const p=this.p;const W=this.world();const ds=Object.values(W.s.designs).filter(d=>d.status!=='perdu'&&d.status!=='reference'&&d.status!=='engin'&&d.f!=='beee');
    const seg=(k,opts,ok=()=>true)=>`<div class="seg" data-help="${k}">${Object.entries(opts).filter(([v])=>ok(v)).map(([v,o])=>`<button data-dz="${k}:${v}" class="${p[k]===v?'on':''}" title="${esc(o.desc||'')}">${esc(o.name)}</button>`).join('')}</div>`;
    const range=(id,label,min,max,step,val,hint)=>{const lo=id==='c'?LIMITS.c[0]:min,hi=id==='c'?LIMITS.c[1]:max,nstep=id==='c'?.0001:step,nval=id==='c'?sToC(val):val;return `<label class="dz-r" data-help="${id}"><span>${label}<em id="dz-v-${id}"></em></span><div class="dz-range"><input type="range" id="dz-${id}" min="${min}" max="${max}" step="${step}" value="${val}"><input type="number" id="dz-num-${id}" min="${lo}" max="${hi}" step="${nstep}" value="${nval}" aria-label="${label} : valeur précise"></div><small>${hint}</small><div class="dz-eff" id="dz-e-${id}"></div></label>`;};
    const tab=(v,n)=>`<button data-dz="view:${v}" class="${this.view===v?'on':''}">${n}</button>`;
    this.host.innerHTML=`<div class="dz" id="designer" role="dialog" aria-label="Bureau d’études">
      <header class="dz-head"><div><b>Bureau d’études · atelier complet</b><small>Munition en coupe, affût, tir d’essai et courbes · réglages de la V5.8</small></div>
        <div class="seg"><button class="on">Armes</button><button data-dz="armor">Protections</button></div>
        <div class="seg" title="Qui porte l’arme : la troupe de choc ressent moitié moins le poids et le recul, et tient à l’épaule ce qui demande un bipied"><button data-dz="who:soldat" class="${this.who!=='choc'?'on':''}">Soldat</button><button data-dz="who:choc" class="${this.who==='choc'?'on':''}">Élite</button></div>
        <label class="dz-name">Nom <input id="dz-name" value="${esc(this.name)}" maxlength="28"></label>
        <label class="dz-name">Partir de <select id="dz-from">${ds.map(d=>`<option value="${d.id}" ${d.id===this.ref.id?'selected':''}>${esc(d.name)}${d.f==='beee'?' (bèè)':''}${d.status==='prototype'?' — prototype':''}</option>`).join('')}</select></label>
        <button class="ghost" data-dz="blank" title="Un tube, une culasse à verrou, un coup : tout le reste est à concevoir">□ Arme vierge</button>
        <button class="ghost" data-dz="close">Fermer</button></header>
      <div class="dz-body dz3">
        <section class="dz-col dz-ctl">
          <details open><summary>La balle</summary>
            ${range('d','Calibre',LIMITS.d[0],LIMITS.d[1],LIMITS.d[2],p.d,'large : plus lourde, grosse blessure ; freine plus, perce moins à masse égale')}
            ${range('l','Longueur de la balle',LIMITS.l[0],LIMITS.l[1],LIMITS.l[2],p.l,'indépendante du canon ; une pointe trop longue ne tient pas sur une balle courte')}
            ${range('noseScale','Longueur de la pointe',LIMITS.noseScale[0],LIMITS.noseScale[1],LIMITS.noseScale[2],p.noseScale??1,'profil extérieur ; sa pointe ne peut dépasser la balle')}
            ${range('boat','Dépouille du culot',LIMITS.boat[0],LIMITS.boat[1],LIMITS.boat[2],p.boat??0,'réduit la traînée, enlève du volume au projectile')}
            ${range('jacket','Chemise',LIMITS.jacket[0],LIMITS.jacket[1],LIMITS.jacket[2],p.jacket??1,'épaisse : se brise et s’ouvre plus tard ; plus de cuivre')}
            ${range('core','Noyau d’acier',LIMITS.core[0],LIMITS.core[1],LIMITS.core[2],p.core||0,'une part de plomb remplacée par de l’acier : perce mieux, plus légère')}
            ${range('hef','Charge explosive',LIMITS.hef[0],LIMITS.hef[1],LIMITS.hef[2],p.hef??.3,'munitions explosives : plus d’explosif, plus de souffle — moins de coque, moins d’éclats')}
            <div class="dz-he-ctl" id="dz-hectl">
              ${range('fragm','Taille des éclats',LIMITS.fragm[0],LIMITS.fragm[1],LIMITS.fragm[2],p.fragm??4,'petits : nombreux, terribles de près, freinés vite ; gros : rares, ils portent loin')}
              <div class="dz-f" data-help="fill"><span>Explosif</span>${seg('fill',FILLS,v=>p.fill===v||this.world().unlocked('fill:'+v))}</div>
              ${FILLS[p.fill]?.tb?range('tbf','Part de combustible',LIMITS.tbf[0],LIMITS.tbf[1],LIMITS.tbf[2],p.tbf??FILLS[p.fill].tb.f0,'le combustible autour du cœur de tolite : plus de combustible, plus de postcombustion — mais trop, et le cœur ne le disperse plus'):''}
              <div class="dz-f" data-help="shell"><span>Coque</span>${seg('shell',SHELLS,v=>p.shell===v||this.world().unlocked('shell:'+v))}</div>
              <div class="dz-f" data-help="fuse"><span>Fusée</span>${seg('fuse',FUSES)}</div></div>
            ${range('meplat','Méplat (pointe tronquée)',LIMITS.meplat[0],LIMITS.meplat[1],LIMITS.meplat[2],p.meplat??0,'une pointe plate au bout : freine dans l’air, coupe net')}
            ${range('cavity','Cavité de pointe',LIMITS.cavity[0],LIMITS.cavity[1],LIMITS.cavity[2],p.cavity??0,'un creux dans le nez : allège la balle, l’ouvre plus tôt')}
            ${range('bands','Cannelures',LIMITS.bands[0],LIMITS.bands[1],LIMITS.bands[2],p.bands??0,'des gorges autour de la balle : sertissage régulier, un peu de traînée')}
            ${range('coreD','Diamètre du noyau',LIMITS.coreD[0],LIMITS.coreD[1],LIMITS.coreD[2],p.coreD??.55,'fin : il concentre l’effort et perce mieux ; épais : plus lourd')}
            <div class="dz-f"><span>Nez · architecture de départ</span>${seg('nose',NOSES)}</div>
            <details><summary>Construction du projectile <small>une famille toute prête, ou sur mesure, pièce par pièce</small></summary><div class="dz-f" data-help="cons">${FAMS.map(([fam,ks])=>`<div class="dz-fam"><small>${fam}</small><div class="seg wrap">${ks.filter(k=>CONSTRUCTIONS[k]).map(v=>`<button data-dz="cons:${v}" class="${p.cons===v?'on':''}" title="${esc(CONSTRUCTIONS[v].desc)}"><i class="tip" style="background:${TIPC[v]||'#c07a3e'}"></i>${esc(CONSTRUCTIONS[v].name)}</button>`).join('')}</div></div>`).join('')}
              ${this.cxHtml(p)}</div></details>
          </details>
          <details><summary>L’étui <small>la forme de la cartouche</small></summary>
            <div class="dz-f" data-help="caseMat"><span>Matière</span>${seg('caseMat',CASEMATS)}</div>
            <div class="dz-f" data-help="rim"><span>Culot de l’étui</span>${seg('rim',RIMS)}</div>
            ${range('caseD','Diamètre de l’étui',LIMITS.caseD[0],LIMITS.caseD[1],LIMITS.caseD[2],p.caseD??1.45,'en calibres : un étui gras est plus court pour la même poudre, mais la culasse grossit')}
            ${range('neck','Collet',LIMITS.neck[0],LIMITS.neck[1],LIMITS.neck[2],p.neck??1.1,'la longueur qui tient la balle : long, elle part plus droit')}
            ${range('shoulder','Épaulement',LIMITS.shoulder[0],LIMITS.shoulder[1],LIMITS.shoulder[2],p.shoulder??30,'l’angle entre le corps et le collet : raide, l’étui raccourcit')}
          </details>
          <details><summary>La balle-fusée <small>propulsion par fusée seulement</small></summary>
            ${range('fins','Ailettes',LIMITS.fins[0],LIMITS.fins[1],LIMITS.fins[2],p.fins??0,'la stabilisent pendant la poussée : moins de dispersion, plus de traînée')}
            ${range('finSize','Envergure des ailettes',LIMITS.finSize[0],LIMITS.finSize[1],LIMITS.finSize[2],p.finSize??1,'en calibres')}
            ${range('cant','Tuyères inclinées',LIMITS.cant[0],LIMITS.cant[1],LIMITS.cant[2],p.cant??0,'la font tourner sur elle-même : moins de dispersion, un peu moins de poussée')}
            ${range('ignite','Allumage retardé',LIMITS.ignite[0],LIMITS.ignite[1],LIMITS.ignite[2],p.ignite??0,'une petite charge l’éjecte, le moteur s’allume loin du tireur : pas d’éclair ni de souffle')}
            ${range('stages','Étages',LIMITS.stages[0],LIMITS.stages[1],LIMITS.stages[2],p.stages??1,'deux étages : le premier se détache vide, le second repart plus léger')}
            <div class="dz-f" data-help="guide"><span>Guidage</span>${seg('guide',GUIDES)}</div>
          </details>
          <details><summary>La charge et le canon</summary>
            <div class="dz-f" data-help="prop"><span>Propulsion</span>${seg('prop',PROPS)}</div>
            ${range('c','Poudre',0,1000,1,cToS(p.c),'plus : plus vite — plus de pression, un étui et un recul plus gros')}
            ${range('burn','Vivacité de la poudre',LIMITS.burn[0],LIMITS.burn[1],LIMITS.burn[2],p.burn??1,'vive : pic de pression plus précoce ; progressive : pousse plus loin dans le tube')}
            ${range('rocketBurn','Durée du moteur-fusée',LIMITS.rocketBurn[0],LIMITS.rocketBurn[1],LIMITS.rocketBurn[2],p.rocketBurn??1,'règle le temps de poussée après la bouche')}
            ${range('nozzle','Rendement de la tuyère',LIMITS.nozzle[0],LIMITS.nozzle[1],LIMITS.nozzle[2],p.nozzle??1,'plus de vitesse mais aussi de dispersion')}
            ${range('L','Longueur du canon',LIMITS.L[0],LIMITS.L[1],LIMITS.L[2],p.L,'réglage indépendant de la longueur de la balle ; plus long : plus lourd')}
            ${range('twist','Pas de rayure',LIMITS.twist[0],LIMITS.twist[1],LIMITS.twist[2],p.twist,'court : tient les balles longues ; trop long, elles basculent')}
            ${range('wallx','Épaisseur du tube',LIMITS.wallx[0],LIMITS.wallx[1],LIMITS.wallx[2],p.wallx??(p.heavy?1.5:1),'épais : plus précis, tient la chaleur, dure ; bien plus lourd')}
          </details>
          <details><summary>L’arme</summary>
            <div class="dz-f"><span>Culasse</span>${seg('action',ACTIONS)}</div>
            <div class="dz-f" data-help="feed"><span>Alimentation</span>${seg('feed',FEEDS)}</div>
            <div class="dz-f" data-help="tube"><span>Profil du tube</span>${seg('tube',TUBES)}</div>
            <div class="dz-f" data-help="carriage"><span>Affût d’artillerie</span>${seg('carriage',CARRIAGES)}</div>
            <div class="dz-f" data-help="stock"><span>Crosse</span>${seg('stock',STOCKS)}</div>
            <div class="dz-f" data-help="finish"><span>Finition</span>${seg('finish',FINISHES)}</div>
            ${range('barrels','Nombre de tubes',LIMITS.barrels[0],LIMITS.barrels[1],LIMITS.barrels[2],p.barrels??(ACTIONS[p.action]?.multi?4:1),'mécanique rotative (2 à 8 canons) ou lance-fusées (1 à 12 tubes, tirés en salve) : poids, coût, servants')}
            ${range('rof','Cadence (automatique)',LIMITS.rof[0],LIMITS.rof[1],LIMITS.rof[2],p.rof,'plus : plus de suppression, plus de chaleur')}
            ${range('mag','Chargeur',LIMITS.mag[0],LIMITS.mag[1],LIMITS.mag[2],p.mag,'grand : moins de rechargements ; plus lourd ; 50 et plus en auto : une bande')}
          </details>
          <details open><summary>Conception du viseur <small>voir et régler la hausse, sans changer la vitesse du projectile</small></summary>
            ${range('zero','Distance de zéro',LIMITS.zero[0],LIMITS.zero[1],LIMITS.zero[2],p.zero,'déplace le point visé, ne change pas la portée balistique')}
            ${range('sightRadius','Rayon de visée',LIMITS.sightRadius[0],LIMITS.sightRadius[1],LIMITS.sightRadius[2],p.sightRadius??Math.min(32,p.L/10+8),'distance entre hausse et guidon, plafonnée par la longueur réelle de l’arme')}
            ${range('sightHeight','Hauteur du viseur',LIMITS.sightHeight[0],LIMITS.sightHeight[1],LIMITS.sightHeight[2],p.sightHeight??1.2,'change le biais au-dessus ou en dessous du point visé')}
            ${range('sightMag','Grossissement',LIMITS.sightMag[0],LIMITS.sightMag[1],LIMITS.sightMag[2],p.sightMag??2,'actif avec une lunette : on voit et on touche plus loin, dans la direction où l’on vise')}
            ${range('sightObj','Objectif',LIMITS.sightObj[0],LIMITS.sightObj[1],LIMITS.sightObj[2],p.sightObj??Math.round(6+2.6*(p.sightMag??2)),'diamètre de la lentille avant (mm) : la lumière qu’elle recueille fait la vue de nuit ; objectif ÷ grossissement doit rester au-dessus de 2,5 mm')}
            <p class="quiet small">Ajoutez « Lunette » dans Modules pour activer le grossissement. Le zéro et le rayon se règlent aussi sur une hausse mécanique.</p>
          </details>
          <details><summary>Modules</summary><div class="dz-mods" data-help="mods">${Object.entries(MODS).map(([k,M])=>`<button class="chip" data-dz="mod:${k}" data-help="mod-${k}" title="${esc(M.desc)} — se fixe : ${esc((PORTS[portOf(k)]?.name||'').toLowerCase())}">${esc(M.name)}</button>`).join('')}</div></details>
          <details open id="dz-sup" ${(p.mods||[]).includes('manchon')?'':'hidden'}><summary>Silencieux</summary>${seg('supArch',SUPS)}
            ${range('supVol','Volume intérieur (cm³)',LIMITS.supVol[0],LIMITS.supVol[1],LIMITS.supVol[2],p.supVol??250,'plus il est grand devant la charge de poudre, plus les gaz se détendent : plus silencieux, plus lourd, plus long')}
            ${range('supBaffles','Chicanes',LIMITS.supBaffles[0],LIMITS.supBaffles[1],LIMITS.supBaffles[2],p.supBaffles??5,'chaque chicane freine les gaz ; au-delà de huit, elles se gênent et pèsent')}</details>
          <details open id="dz-ir" ${(p.mods||[]).includes('infrarouge')?'':'hidden'}><summary>Visée infrarouge</summary>
            <div id="dz-irdata" style="font-size:12.5px;line-height:1.5;margin:.15rem 0 .55rem;padding:.45rem .6rem;border-radius:8px;background:rgba(70,130,140,.16);border:1px solid rgba(120,190,200,.25)"></div>
            ${range('irW','Puissance de la lampe (W)',LIMITS.irW[0],LIMITS.irW[1],LIMITS.irW[2],p.irW??35,'la portée du faisceau (en racine de la puissance) ; mais la batterie se vide plus vite')}
                        ${range('irQ','Qualité du tube',LIMITS.irQ[0],LIMITS.irQ[1],LIMITS.irQ[2],p.irQ??1,'un meilleur convertisseur voit plus loin avec la même lampe — plus de cuivre, plus de pièces')}
            ${range('irBeam','Largeur du faisceau (°)',LIMITS.irBeam[0],LIMITS.irBeam[1],LIMITS.irBeam[2],p.irBeam??43,'étroit : porte plus loin mais éclaire moins de terrain ; large : voit sur les côtés, mais moins loin')}
            ${range('irFilt','Filtre IR (0 sans · 1 avec)',LIMITS.irFilt[0],LIMITS.irFilt[1],LIMITS.irFilt[2],p.irFilt??1,'sans filtre la lampe laisse une lueur rouge visible : plus léger, mais on te repère la nuit')}</details>
          <details open id="dz-shield" ${(p.mods||[]).includes('bouclier')?'':'hidden'}><summary>Bouclier</summary>
            <div class="dz-f" data-help="shieldMat"><span>Matériau de la plaque</span><div class="seg wrap">${SHIELD_MATS.map(m=>`<button data-dz="shieldMat:${m}" title="${esc(MATS[m].desc)}">${esc(MATS[m].name)}</button>`).join('')}</div></div>
            ${range('shieldT','Épaisseur de la plaque (mm)',LIMITS.shieldT[0],LIMITS.shieldT[1],LIMITS.shieldT[2],p.shieldT??GEO.shieldT,'plus épaisse : elle arrête des balles plus fortes, mais pèse et coûte plus')}
            ${range('shieldH','Hauteur de la plaque (cm)',LIMITS.shieldH[0],LIMITS.shieldH[1],LIMITS.shieldH[2],Math.round((shieldOf({...p,mods:['bouclier']})?.h??.2)*100),'du sol au bord haut : elle abrite tout ce qui est plus bas (un Meumeu debout a le buste à 15 cm, accroupi 11, couché 4) ; plus haute, plus lourde')}
            ${range('shieldW','Largeur de la plaque (cm)',LIMITS.shieldW[0],LIMITS.shieldW[1],LIMITS.shieldW[2],Math.round((shieldOf({...p,mods:['bouclier']})?.w??.09)*100),'plus large : elle arrête les coups qui passent à côté du servant ; plus lourde')}
            <div id="dz-shielddata" style="font-size:12.5px;line-height:1.5;margin:.15rem 0 .55rem;padding:.45rem .6rem;border-radius:8px;background:rgba(70,130,140,.16);border:1px solid rgba(120,190,200,.25)"></div></details>
        </section>
        <section class="dz-col dz-mid">
          <div class="dz-big" id="dz-big"></div><div class="dz-mission" id="dz-mission"></div>
          <div class="dz-stage">
            <div class="dz-planbox"><h3>Le plateau <small>l’arme à l’échelle, ses servants — des Meumeu de 30 cm</small><button class="small ${this.plan3d?'on':''}" data-dz="p3d" title="Plateau 3D (glisser : tourner, molette : zoom, double clic : recentrer) ou plan de profil">${this.plan3d?'3D':'Plan'}</button><button class="small" data-dz="fire">Tirer ▸</button></h3>
              <canvas id="dz-plan" class="dz-cv"></canvas></div>
            <nav class="dz-tabs" aria-label="Vue d’analyse">${tab('round','Munition')}${tab('traj','Trajectoire')}${tab('prec','Précision')}${tab('zone','Zone d’effet')}${tab('pen','Perforation')}${tab('gel','Dans le corps')}${tab('tir','Tir sur un Bèè')}
              <label class="dz-follow" title="La vue suit le réglage que vous touchez : le canon montre la trajectoire, le pas de rayure la précision, la charge explosive la zone…"><input type="checkbox" id="dz-follow" ${this.follow!==false?'checked':''}> suivre les réglages</label></nav>
            <div class="dz-viewbox">
              <div class="dz-view" data-view="round"><h3>La munition en coupe <small>dessus : l’extérieur ; dessous : coupée — chaque réglage a sa pièce</small></h3>
                <canvas id="dz-round" class="dz-cv"></canvas><div id="dz-components" class="dz-components" aria-label="Composants visibles"></div></div>
              <div class="dz-view" data-view="traj"><h3>La trajectoire <small>au-dessus et au-dessous de la ligne de visée, au ralenti</small></h3><canvas id="dz-traj" class="dz-cv"></canvas></div>
              <div class="dz-view" data-view="prec"><h3>Portée et précision <small>où tombent les balles sur un Meumeu debout (7 × 20 cm), à chaque distance</small></h3><canvas id="dz-prec" class="dz-cv"></canvas></div>
              <div class="dz-view" data-view="zone" id="dz-zonewrap"><h3>Zone d’effet <small>vu de dessus, à l’échelle — des Bèè tous les 50 cm ; à droite, la chance d’être touché selon la distance</small></h3>
                <canvas id="dz-zone" class="dz-cv"></canvas><p class="dz-gelt" id="dz-zonet"></p></div>
              <div class="dz-view" data-view="pen"><h3>Perforation <small>millimètres d’acier traversés, selon la distance — pour un obus : ses éclats, selon la distance à l’explosion</small></h3><canvas id="dz-pen" class="dz-cv"></canvas></div>
              <div class="dz-view" data-view="gel"><h3>Dans le corps <small>bloc de gélatine de 16 cm, comme un Meumeu</small><span class="seg sm">${[5,20,50,100].map(r=>`<button data-dz="gel:${r}" class="${r===this.gelR?'on':''}">${r} m</button>`).join('')}</span></h3>
                <canvas id="dz-gel" class="dz-cv"></canvas><p class="dz-gelt" id="dz-gelt"></p></div>
              <div class="dz-view" data-view="tir"><h3>Sur un Bèè, en 3D <small>le tir d’essai au ralenti, à ${this.gelR} m (distance réglée dans « Dans le corps »)</small><span class="seg sm">${Object.entries(TARGETS).map(([k,T])=>`<button data-dz="tgt:${k}" class="${k===this.target?'on':''}">${T.name}</button>`).join('')}</span></h3>
                <div class="dz-shotwrap"><canvas id="dz-shot" class="dz-cv dz-shot"></canvas><span class="seg sm dz-shotmode">${[['xray','Radiographie'],['anat','Anatomie'],['peluche','Peluche']].map(([k,n])=>`<button data-dz="shotmode:${k}">${n}</button>`).join('')}</span></div><p class="dz-gelt" id="dz-shott"></p></div>
            </div></div>
        </section>
        <section class="dz-col dz-side">
          <div class="dz-help" id="dz-help"></div>
          <h3>Affût et servants</h3><div id="dz-crew" class="dz-crew"></div>
          <h3>Signature</h3><div id="dz-sig" class="dz-tab"></div>
          <div id="dz-he"></div>
          <h3>Les chiffres <small>face à ${esc(this.ref.name)}</small></h3><div id="dz-tab" class="dz-tab"></div>
          <h3>Le verdict</h3><ul id="dz-ver" class="dz-ver"></ul>
          <h3>Ce que ça coûte</h3><div id="dz-cost" class="dz-cost"></div>
          <div class="dz-go"><button data-dz="go" id="dz-go">${this.engin?'Monter sur l’engin':'Lancer le programme'}</button><p class="dz-say quiet small"></p></div>
        </section></div></div>`;
    this.sync();this.applyView();}
  read(el){const numeric=el.id.startsWith('dz-num-'),id=el.id.replace(numeric?'dz-num-':'dz-','');if(numeric&&el.value==='')return;if(id==='name'){this.name=el.value;return;}if(!(id==='heavy'||id==='c'||id in LIMITS||id in this.p))return;this.detachKit();if(id==='heavy'){this.p.heavy=el.checked;this.help='heavy';}else if(id==='c'){this.p.c=numeric?+el.value:sToC(+el.value);this.help='c';}else{this.p[id]=numeric?Math.max(LIMITS[id][0],Math.min(LIMITS[id][1],+el.value)):+el.value;this.help=id;}this.sync();this.render();}
  sync(){const p=this.p;if(p.kit){const previous=this.kitSynced;if(previous&&previous.kit)for(const key of Object.keys(p))if(key!=='kit'&&JSON.stringify(p[key])!==JSON.stringify(previous[key]))editKit(p,key);this.kitSynced=JSON.parse(JSON.stringify(p));}else this.kitSynced=null;const $=id=>this.host.querySelector('#dz-v-'+id);const set=(id,t)=>{const e=$(id);if(e)e.textContent=t;};const dv=id=>p[id]??(id==='caseD'?+((this.D?.Dc||p.d*1.45)/p.d).toFixed(2):id==='shieldH'||id==='shieldW'?Math.round((shieldOf({...p,mods:['bouclier']})?.[id==='shieldH'?'h':'w']??.1)*100):GEO[id]);for(const id of Object.keys(LIMITS)){const r=this.host.querySelector('#dz-'+id),n=this.host.querySelector('#dz-num-'+id);if(r)r.value=id==='c'?cToS(p.c):dv(id);if(n&&document.activeElement!==n)n.value=id==='c'?p.c:dv(id);}
    set('caseD',` ×${fmt(dv('caseD'),2)} (${fmt(dv('caseD')*p.d,1)} mm)`);set('neck',` ${fmt(dv('neck'),2)} calibre`);set('shoulder',` ${dv('shoulder')}°`);set('meplat',` ${Math.round(dv('meplat')*100)} %`);set('cavity',` ${Math.round(dv('cavity')*100)} %`);set('bands',` ${dv('bands')}`);set('coreD',` ${Math.round(dv('coreD')*100)} % du calibre`);
    set('supVol',` ${dv('supVol')} cm³`);set('shieldT',` ${fmt(dv('shieldT'),1)} mm`);set('shieldH',` ${Math.round(dv('shieldH'))} cm`);set('shieldW',` ${Math.round(dv('shieldW'))} cm`);set('irW',` ${dv('irW')} W`);set('irWh',` ${dv('irWh')} Wh`);set('irQ',` ×${fmt(dv('irQ'),2)}`);set('irBeam',` ${dv('irBeam')}°`);set('irFilt',dv('irFilt')?' filtré':' sans filtre');set('supBaffles',` ${dv('supBaffles')}`);
    set('fins',p.prop==='fusee'?` ${dv('fins')}`:' — (fusée)');set('finSize',` ${fmt(dv('finSize'),2)} calibre`);set('cant',` ${fmt(dv('cant'),1)}°`);set('ignite',` ${dv('ignite')} ms`);set('stages',` ${dv('stages')}`);set('barrels',` ${ACTIONS[p.action]?.multi||(p.prop==='fusee'&&ACTIONS[p.action]?.mortar)?dv('barrels'):1}`);
    for(const id of ['fins','finSize','cant','ignite','stages'])for(const el of [this.host.querySelector('#dz-'+id),this.host.querySelector('#dz-num-'+id)])if(el)el.disabled=p.prop!=='fusee';
    {const C1=CONSTRUCTIONS[p.cons];for(const el of [this.host.querySelector('#dz-coreD'),this.host.querySelector('#dz-num-coreD')])if(el)el.disabled=!(C1.core||(p.core||0)>0);}
    set('d',` ${fmt(p.d,1)} mm`);set('l',` ${fmt(p.l,1)} mm`);set('noseScale',` ×${fmt(p.noseScale??1,2)}`);set('boat',` ${Math.round((p.boat??0)*100)} %`);set('c',` ${mg(p.c)}`);set('burn',` ×${fmt(p.burn??1,2)}`);set('rocketBurn',` ×${fmt(p.rocketBurn??1,2)}`);set('nozzle',` ×${fmt(p.nozzle??1,2)}`);set('L',` ${p.L} mm`);set('twist',` 1 tour / ${p.twist} mm`);set('rof',ACTIONS[p.action]?.auto?` ${p.rof} coups/min`:' — (automatique seulement)');set('mag',` ${p.mag} coups`);set('zero',` ${p.zero} m`);set('sightRadius',` ${fmt(this.D?.sightRadius??p.sightRadius??32,0)} cm réels`);set('sightHeight',` ${fmt(p.sightHeight??1.2,1)} cm`);set('sightMag',p.mods?.includes('lunette')?` ×${fmt(p.sightMag??2,1)}`:' — ajouter Lunette');set('wallx',` ×${fmt(p.wallx??(p.heavy?1.5:1),2)}`);set('jacket',` ×${fmt(p.jacket??1,1)}`);set('core',` ${Math.round((p.core||0)*100)} %`);set('hef',CONSTRUCTIONS[p.cons].he?` ${Math.round((p.hef??.3)*100)} % du volume`:' — (munitions explosives)');
    const C0=CONSTRUCTIONS[p.cons];const hc=this.host.querySelector('#dz-hectl');if(hc)hc.classList.toggle('off',!C0.he||!!C0.shaped);set('fragm',C0.he&&!C0.shaped?` ${fmt(p.fragm??4,1)} mg`:' — (explosive à éclats)');for(const [id,off] of [['fragm',!C0.he||!!C0.shaped],['hef',!C0.he],['core',!!(C0.core||C0.he||C0.pellets)]]){const e=this.host.querySelector('#dz-'+id);if(e)e.disabled=off;}
    const rof=this.host.querySelector('#dz-rof');if(rof)rof.disabled=!ACTIONS[p.action]?.auto;for(const el of [this.host.querySelector('#dz-mag'),this.host.querySelector('#dz-num-mag')])if(el)el.disabled=!!ACTIONS[p.action]?.mortar;for(const id of ['rocketBurn','nozzle'])for(const el of [this.host.querySelector('#dz-'+id),this.host.querySelector('#dz-num-'+id)])if(el)el.disabled=p.prop!=='fusee';for(const el of [this.host.querySelector('#dz-barrels'),this.host.querySelector('#dz-num-barrels')])if(el)el.disabled=!(ACTIONS[p.action]?.multi||(p.prop==='fusee'&&ACTIONS[p.action]?.mortar));const ms=new Set(p.mods||[]);
    {const sh=this.host.querySelector('#dz-shield');if(sh)sh.hidden=!(p.mods||[]).includes('bouclier');
      // le bouclier, lu en direct : la plaque, sa masse, et ce qu'elle arrête de ce que tirent les Bèè
      const sd=this.host.querySelector('#dz-shielddata');if(sd&&(p.mods||[]).includes('bouclier')){const S=shieldOf(p),W=this.world();
        const rows=W.designsOf('beee').map(d=>{const Wd=W.W(d.id);const cell=R=>{const t=stopsAt({zones:{bouclier:{mat:S.mat,t:S.t,eq:S.eq,kg:S.kg}}},Wd,R).bouclier;return t.stops?`<span class="good">${R} m ✓</span>`:`<span class="bad">${R} m ✗ ${Math.round(t.v2)} m/s</span>`;};return `<tr><td>${esc(d.name)}</td><td>${cell(10)}</td><td>${cell(40)}</td><td>${cell(100)}</td></tr>`;}).join('');
        sd.innerHTML=`Plaque de <b>${fmt(S.h*100,0)} × ${fmt(S.w*100,0)} cm</b>, ${fmt(S.t,1)} mm de ${esc(S.name.toLowerCase())} : <b>${Math.round(S.kg*1000)} g</b>, équivalent de ${fmt(S.eq,1)} mm d’acier. Elle abrite les servants des tirs de face, jusqu’à ${fmt(S.h*100,0)} cm de haut ; l’usure s’y voit, et on la redresse au dépôt.${rows?`<table class="mini" style="margin-top:.35rem"><thead><tr><th>Ce que tirent les Bèè</th><th>10 m</th><th>40 m</th><th>100 m</th></tr></thead><tbody>${rows}</tbody></table>`:''}`;}
      const sp=this.host.querySelector('#dz-sup');if(sp)sp.hidden=!(p.mods||[]).includes('manchon');const ir=this.host.querySelector('#dz-ir');if(ir)ir.hidden=!(p.mods||[]).includes('infrarouge');
      // les données du viseur, lues en direct à côté des curseurs : portée de nuit, faisceau, autonomie de la batterie, poids et coût en matériaux
      const dd=this.host.querySelector('#dz-irdata');if(dd&&(p.mods||[]).includes('infrarouge')){const I=irOf(p),C=irCostOf(I);dd.innerHTML=`<b>De nuit, on voit à ${Math.round(I.range*4)} m</b> (${fmt(I.range,0)} cases) dans un faisceau de ${I.beam}°<br>Batterie : celle de la lampe, <b>sans recharge</b> (${I.Wh} Wh, ${Math.round(I.packKg*1000)} g au dos : plus la lampe est puissante, plus elle pèse) · lampe ${I.W} W, tube ×${fmt(I.q,2)}, ${Math.round(I.lampKg*1000)} g sur l’arme<br>Coût : ${fmt(C.plomb,1)} plomb · ${fmt(C.cuivre,1)} cuivre · ${fmt(C.pieces,1)} pièces${I.leak?'<br><b class="bad">Sans filtre : lueur rouge visible, elle trahit l’opérateur</b>':''}`;}}
    for(const b of this.host.querySelectorAll('[data-dz]')){const [k,v]=b.dataset.dz.split(':');if(['nose','base','action','cons','fill','shell','fuse','prop','caseMat','rim','stock','finish','guide','feed','tube','carriage'].includes(k))b.classList.toggle('on',(p[k]??CHOICE[k])===v);if(k==='supArch')b.classList.toggle('on',(p.supArch||'chicanes')===v);if(k==='shieldMat')b.classList.toggle('on',(p.shieldMat||'acier')===v);if(k==='gel')b.classList.toggle('on',+v===this.gelR);if(k==='tgt')b.classList.toggle('on',v===this.target);if(k==='shotmode')b.classList.toggle('on',v===(this.shot?.mode||'xray'));if(k==='mod')b.classList.toggle('on',ms.has(v));}}
  renderHelp(){const el=this.host.querySelector('#dz-help');if(!el||!this.D)return;const f=HELP[this.help]||HELP.cons;const e=this.eff&&this.eff.key===this.help?this.effHtml():'';el.innerHTML=`<h3>Ce que ça change</h3>${leversHtml(this.D,this.p)}${e?`<div class="dz-eff on">${e}</div>`:''}<p>${f(this.D,this.p)}</p>`;}
  applyView(){const v=this.view||'traj';for(const el of this.host.querySelectorAll('.dz-view'))el.hidden=el.dataset.view!==v;for(const b of this.host.querySelectorAll('[data-dz^="view:"]'))b.classList.toggle('on',b.dataset.dz==='view:'+v);}
  setView(v,manual){if(!v)return;if(v==='zone'&&!(this.D?.he&&!this.D.he.shaped))v=manual?'zone':'gel';if(v===this.view&&!manual)return;this.view=v;try{localStorage.setItem('okm-dz-view',v);}catch(e){}this.applyView();const D=this.D;if(!D)return;
    if(v==='round')this.drawRoundCv(D);else if(v==='traj')this.drawTraj(D,0);else if(v==='prec')this.drawPrec(D);else if(v==='zone')this.drawZone(D);else if(v==='pen')this.drawPen(D,this.R||D);else if(v==='gel')this.drawGel(D);else if(v==='tir'){this.shotKey='';this.shoot(D);}}
  effStart(key){if(this.eff?.key!==key){const old=this.eff&&this.host.querySelector('#dz-e-'+this.eff.key);if(old){old.innerHTML='';old.classList.remove('on');}}if(this.eff?.key!==key||this.eff.D!==this.D)this.eff={key,D:this.D};if(this.follow!==false)this.setView(VIEW_OF[key]||(key.startsWith('mod-')?null:null));}
  effHtml(){const E=this.eff;if(!E||!E.D||!this.D||E.D===this.D)return '';const a=keyNums(E.D),b=keyNums(this.D);
    const ch=KEYS.map(([k,n,u,dec,better])=>{const v0=a[k],v1=b[k];if(!Number.isFinite(v0)||!Number.isFinite(v1))return null;const rel=Math.abs(v1-v0)/Math.max(Math.abs(v0),1e-9);return rel>.004?{n,u,dec,better,v0,v1,rel}:null;}).filter(Boolean).sort((x,y)=>y.rel-x.rel).slice(0,4);
    if(!ch.length)return '';
    return ch.map(c=>{const up=c.v1>c.v0;const tone=c.better===0?'':(up===(c.better>0)?'good':'bad');return `<span class="${tone}">${c.n} ${fmt(c.v0,c.dec)} → <b>${fmt(c.v1,c.dec)}</b>${c.u?' '+c.u:''} ${up?'▲':'▼'}</span>`;}).join('');}
  render(){const D=derive(this.p),R=derive(this.ref.p);this.D=D;const W=this.world();const $=id=>this.host.querySelector('#'+id);if(!$('dz-big'))return;const p=this.p;
    const pen=D.pen(D.at(30).v),penR=R.pen(R.at(30).v);
    $('dz-big').innerHTML=[['Vitesse',D.rocket?`${Math.round(D.v0)}→${Math.round(D.vTop)}`:`${Math.round(D.v0)}`,'m/s'],['Énergie',fmt(D.E0,D.E0<10?1:0),'J'],(ACTIONS[p.action]?.mortar?['Portée en cloche',`${Math.round(arcTable(D.v0,D.BC,true,D.boost).max)}`,'m']:['Portée utile',`${D.eff}`,'m']),['Perce à 30 m',fmt(pen,pen<10?2:0),'mm']].map(([k,v,u])=>`<div><small>${k}</small><b>${v}<i>${u}</i></b></div>`).join('')+
      `<div class="dz-cal"><small>Cartouche</small><b>${esc(D.name)}</b><i>≈ ${fmt(p.d*HUMAN,1)} mm humain</i></div>`;
    const role=ACTIONS[p.action]?.mortar?'Artillerie indirecte':D.he?'Arme explosive directe':ACTIONS[p.action]?.auto?'Arme de suppression':D.eff>=45?'Tir de précision':'Arme individuelle';
    const limits=[!D.mountOk?`affût ${MOUNTS[D.need].name.toLowerCase()} requis`:'',D.overload?'trop lourde pour son affût (mettez-la sur trépied ou sur roues)':'',D.crew>1?`${D.crew} servants`:'',D.fixed?'pièce fixe':'',D.rk>.6?'recul très fort':'',D.P>620?'pression dangereuse':'',D.carry<5?'munitions très lourdes':'',!ACTIONS[p.action]?.mortar&&D.eff<45?`portée ${D.eff} m`:'',D.Sg<1.3?'balle mal stabilisée':''].filter(Boolean);
    $('dz-mission').innerHTML=`<b>${role}</b><span>${D.he?`zone dangereuse ${cm(D.he.danger)} · `:''}${D.eff} m utiles · ${D.rpm} coups/min · ${D.carry} coups portés</span><em class="${limits.length?'warn':'good'}">${limits.length?limits.join(' · '):'prête à servir sans contrainte majeure'}</em>`;
    $('dz-components').innerHTML=[`${D.barrels} tube${D.barrels>1?'s':''} ${D.tube.name.toLowerCase()} · ${p.L} mm`,`Culasse ${ACTIONS[p.action].name}`,`${D.feed.name} · ${p.mag} coup${p.mag>1?'s':''}`,...(ACTIONS[p.action]?.howitzer?[`Affût ${D.carriage.name.toLowerCase()}`]:[]),...D.mods.map(k=>MODS[k].name),`Projectile ${fmt(p.d,1)} × ${fmt(D.l,1)} mm`,`Pointe ${NOSES[p.nose].name}`,`Culot ${BASES[p.base].name}`,CONSTRUCTIONS[p.cons].name,...(D.he?[`Coque ${(SHELLS[p.shell]||SHELLS.lisse).name}`,`Charge ${(FILLS[p.fill]||FILLS.tolite).name}`,`Fusée ${(FUSES[p.fuse]||FUSES.impact).name}`]:[]),`Étui ${(CASEMATS[p.caseMat]||CASEMATS.laiton).name.toLowerCase()}`,`Crosse ${(STOCKS[p.stock]||STOCKS.bois).name.toLowerCase()}`,`Finition ${(FINISHES[p.finish]||FINISHES.bleui).name.toLowerCase()}`,...((p.meplat||0)>0?[`Méplat ${Math.round(p.meplat*100)} %`]:[]),...((p.cavity||0)>0?[`Cavité ${Math.round(p.cavity*100)} %`]:[]),...((p.bands||0)>0?[`${p.bands} cannelure${p.bands>1?'s':''}`]:[]),...(D.rocket?[`Moteur ×${fmt(p.rocketBurn,2)}`,`Tuyère ×${fmt(p.nozzle,2)}`,...(p.fins?[`${p.fins} ailettes`]:[]),...((p.stages||1)>1?['Deux étages']:[]),...(p.cant?[`Rotation ${p.cant}°`]:[]),...(p.ignite?[`Allumage à ${p.ignite} ms`]:[]),`Guidage ${(GUIDES[p.guide]||GUIDES.aucun).name.toLowerCase()}`]:[])].map(v=>`<span>${esc(v)}</span>`).join('');
    this.R=R;{const e=this.eff&&this.host.querySelector('#dz-e-'+this.eff.key);if(e){e.innerHTML=this.effHtml();e.classList.toggle('on',!!e.innerHTML);}}
    this.renderHelp();
    // l'affût et les servants
    const need=MOUNTS[D.need],have=MOUNTS[D.have];
    $('dz-crew').innerHTML=`<div class="kv"><span>Il faut</span><b>${need.name}</b></div><div class="kv"><span>Monté</span><b class="${D.mountOk?'good':'bad'}">${have.name}${D.mountOk?'':' — insuffisant'}</b></div>
      <div class="dz-roles">${D.roles.map(r=>`<span class="chip on">${r}</span>`).join('')}</div>
      <p class="small">${D.crew} servant${D.crew>1?'s':''}${D.setup?` · mise en batterie ${fmt(D.setup,1)} s`:''}${D.fixed?' · <b class="bad">ancrée sur pieux : immobile par choix jusqu’au démontage</b>':''}. ${D.crew>1?`Ce que l’arme demande en munitions pour tenir : ${fmt(D.supply*1000,0)} g — un pourvoyeur les porte.`:''}</p>
      ${D.mountOk?'':`<p class="small bad">Affût insuffisant : recul ${fmt(D.rk0,2)} J/kg, arme de ${Math.round(D.mass*1000)} g, calibre ${fmt(p.d,1)} mm. Le prototype reste possible, mais les tirs seront lents et dispersés. Ajoutez ${D.need==='trepied'?'un trépied':'un bipied'} pour le servir correctement.</p>`}`;
    $('dz-sig').innerHTML=`<div class="kv"><span>Éclair de bouche</span><b>${D.flash<.15?'presque nul':D.flash<.4?'faible':D.flash<.7?'visible':'aveuglant'}</b></div><div class="kv"><span>Bruit</span><b>${D.dB} dB${D.sup?` (−${fmt(D.sup.R,1)} au silencieux)`:''} · entendu à ${Math.round(Math.max(4,(D.dB-110)/1.6)*4)} m le jour, ${Math.round(Math.max(4,(D.dB-110)/1.6)*6)} m la nuit</b></div><div class="kv"><span>Claquement</span><b>${D.crackDb?`${D.crackDb} dB : supersonique, entendu à ${Math.round(Math.max(4,(D.crackDb-110)/1.6)*4)} m le jour, ${Math.round(Math.max(4,(D.crackDb-110)/1.6)*6)} m la nuit (mal situé)`:'aucun : subsonique'}</b></div>`;
    $('dz-he').innerHTML=D.he?`<h3>Charge explosive</h3><div class="dz-tab"><div class="kv"><span>Explosif</span><b>${mg(D.he.g)}</b></div>${D.he.shaped?`<div class="kv"><span>Jet de cuivre</span><b>perce ${fmt(D.pen(0),0)} mm d’acier, à toute distance</b></div>`:`<div class="kv"><span>Éclats</span><b>${D.he.n}</b></div>`}<div class="kv"><span>Souffle mortel</span><b>${cm(D.he.blast)}</b></div><div class="kv"><span>Surpression à 1 m</span><b>${Math.round(D.he.pressure?.(1)||0)} kPa</b></div>${D.he.inc?`<div class="kv"><span>Gerbe incendiaire</span><b>${cm(D.he.fire)}</b></div>`:''}${D.he.shaped?'':`<div class="kv"><span>Éclats mortels</span><b>${cm(D.he.lethal)}</b></div><div class="kv"><span>Éclats dangereux</span><b>${cm(D.he.danger)}</b></div>`}</div>`:'';
    const row=(k,v,rv,u,dec=0,better=1)=>{const d=v-rv;const tone=Math.abs(d)<Math.abs(rv)*.02+1e-9?'':((d>0)===(better>0)?'good':'bad');return `<div class="kv"><span>${k}</span><b>${fmt(v,dec)} ${u}${better&&tone?` <em class="${tone}">${d>0?'+':''}${fmt(d,dec)}</em>`:''}</b></div>`;};
    $('dz-tab').innerHTML=row('Balle',D.m*1000,R.m*1000,'mg',0,0)+row('Cartouche entière',D.rm,R.rm,'g',2,-1)+row('Pression',D.P,R.P,'MPa',0,-1)+row('Stabilité (Sg)',D.Sg,R.Sg,'',2,0)+row('Coefficient balistique',D.BC,R.BC,'kg/m²',0,1)+
      row('Dispersion de l’arme',D.moa,R.moa,'MOA',1,-1)+row('Arme chargée',D.mass*1000,R.mass*1000,'g',0,-1)+row('Recul ressenti',D.rk*SHOOTER,R.rk*SHOOTER,'J',2,-1)+row('Temps pour viser',D.aim,R.aim,'s',2,-1)+
      row('Cadence',D.rpm,R.rpm,'coups/min',0,1)+row('Vie du canon',D.life,R.life,'coups',0,1)+row('Portés par soldat',D.carry,R.carry,'coups',0,1)+row('Par caisse',D.perCrate,R.perCrate,'coups',0,1);
    $('dz-ver').innerHTML=D.verdicts.filter(v=>this.who!=='choc'||!v.t.startsWith('Arme lourde')).map(v=>`<li class="${v.tone}">${v.tone==='good'?'＋':v.tone==='bad'?'－':'·'} ${esc(v.t)}</li>`).join('')+(D.mountOk?'':D.need==='bipied'?`<li class="bad">－ L’épaule d’un soldat ne tient pas cette arme : bipied obligatoire — la troupe de choc, elle, la tient à l’épaule</li>`:`<li class="bad">－ L’épaule ne tient pas cette arme : trépied obligatoire</li>`)+(this.who==='choc'?`<li class="${heavyFor(D,.5)?'bad':'good'}">${heavyFor(D,.5)?'－ Lourde même pour l’élite':'＋ Pas lourde pour l’élite'} : ${Math.round(D.mass*500)} g ressentis (${Math.round(D.mass*1000)} g réels)</li><li class="good">＋ Troupe de choc : ${crewOf(D,.5)} servant${crewOf(D,.5)>1?'s':''} au lieu de ${D.crew} ; recul ressenti ${fmt((D.rk0||0)/2,2)} au lieu de ${fmt(D.rk0||0,2)} J/kg${!D.mountOk&&D.need==='bipied'?' ; tenue à l’épaule, sans bipied':''}</li>`:'');
    const cc=crateCost(p),wc=weaponCost(p),pc=protoCost(p),pv=W.programPreview?W.programPreview(p):{work:0,nov:0,tasks:[]};const costs=o=>Object.entries(o).map(([k,n])=>`<span class="cost">${this.ico(k)}${fmt(n,n<1?2:1)}</span>`).join(' ');
    $('dz-cost').innerHTML=`<div class="kv"><span>Une caisse (${D.perCrate} coups)</span><b>${costs(cc)}</b></div><div class="kv"><span>Une arme</span><b>${costs(wc)} · ${fmt(D.hoursW/2,1)} h</b></div><div class="kv"><span>Le programme</span><b>${costs(pc)} · ${Math.round(pv.work)} heures-savants</b></div>
      <ul class="dz-prog">${pv.tasks.map(t=>`<li class="${t.n>0?'new':''}"><span>${ROLE_ICO[t.role]||''} ${esc(t.label)}</span><small>${t.gap?esc(t.gap)+' · ':''}${Math.round(t.work)} h</small></li>`).join('')}</ul>
      <p class="quiet small">Les savants en discutent en réunion de lancement et proposent des améliorations ; vous tranchez. Adoptée, il faut encore l’outillage de la manufacture (4 pièces, 1 fer, 6 h).</p>`;
    const bur=this.bureau();const can=bur?W.canPropose(bur,p):{ok:false,why:['un bureau d’études bâti (choisissez-le, puis « Concevoir »)']};const go=$('dz-go');go.disabled=!can.ok&&!this.engin;go.title=can.ok||this.engin?'':can.why.join(', ');
    if(!can.ok)this.say(`Il faut : ${can.why.join(' · ')}`,'warn');else this.say(`Prêt : ${pv.tasks.length} tâches, ${Math.round(pv.work)} heures-savants${pv.nov>0?` — ${pv.tasks.filter(t=>t.n>0).length} au-delà de ce qu’on sait`:''}. Réunion de lancement au centre de recherche.`,'');
    this.draw(0);this.drawPrec(D);this.drawPen(D,R);this.drawGel(D);this.drawZone(D);this.shoot(D);}
  // ---------- le tir d'essai : la balle (ou la gerbe) entre dans un Bèè, à travers sa protection s'il en a une ----------
  shoot(D){const cv=this.host.querySelector('#dz-shot');if(!cv)return;const key=JSON.stringify([this.p,this.gelR,this.target]);if(key===this.shotKey)return;this.shotKey=key;
    if(!this.shot||this.shot.cv!==cv){this.shot?.dispose();this.shot=new ShotView(cv);}
    setSpecies('beee');const p=this.p,C=CONSTRUCTIONS[p.cons];const v0=D.at(this.gelR).v;const r=rng(5);const n=Math.min(D.pel||1,20);const T=TARGETS[this.target];const A=T.a?deriveArmor(T.a):null;const evs=[];const notes=[];
    const spread=D.pel>1?Math.min(.05,(C.spread||20)/1000*this.gelR/2):0;
    for(let k=0;k<n;k++){let v=v0;const x=(r()-.5)*.03+(spread?(r()-.5)*2*spread:0),y=.15+(r()-.5)*.05+(spread?(r()-.5)*spread:0);const dir=[(r()-.5)*.03,(r()-.5)*.03,-1];const L=Math.hypot(...dir);const d=dir.map(q=>q/L);
      let q=[x,y,.2];for(let i=0;i<500&&!regionAt(q);i++)q=q.map((c,j)=>c+d[j]*.0008);if(!regionAt(q)){notes.push('à côté');continue;}
      let yaw0=0,plate=null;const zone=A?plateZone(q):null;
      if(A&&zone&&A.zones[zone]?.t>0){const W=D.proj||D;const res=armorHit(A,zone,{},W,v,D.pen(v),r);
        if(res?.stopped){const back=q.map((c,j)=>c-d[j]*.04);const dd=D.proj?.p?.d||p.d;const m=(D.proj||D).m;evs.push({victim:'essai',vf:'beee',len:D.l/1000,cons:p.cons,armor:T.a,zone,mat:res.mat,armorName:T.name,blunt:res.blunt,
          rec:{path:[{p:back,v,yaw:0,d:dd},{p:q.slice(),v:v*.4,yaw:0,d:dd*1.6},{p:q.slice(),v:0,yaw:0,d:dd*1.8}],vIn:v,E0:.5*m/1000*v*v,E:0,dmg:{},tc:[],frags:[],entry:q.slice(),exit:null,lodged:true,stopped:true}});notes.push(`arrêtée par le ${zone} (${MATS[res.mat].name.toLowerCase()})`);continue;}
        if(res){const lost=Math.max(0,1-(res.v*res.v)/Math.max(1,v*v));yaw0=(.5+r()*.8)*Math.min(1,.2+2*lost);v=res.v;plate=zone;notes.push(`traverse le ${zone} (${MATS[A.zones[zone].mat].name.toLowerCase()}) : ${Math.round(v0)} → ${Math.round(v)} m/s`);}}
      const rec=wound(D.proj||D,v,q,d,r,yaw0);evs.push({victim:'essai',vf:'beee',len:D.l/1000,cons:p.cons,armor:T.a,plate,rec});
      const hit=Object.entries(rec.dmg).filter(([id,x])=>PART[id]&&(x.crush>1e-4||x.cut>.2||x.frac||x.stretch>.1)).map(([id,x])=>`${PART[id].name}${x.cut>.2&&/artère|veine|aorte/.test(PART[id].name)?' (ouverte)':x.frac?' (fracture)':x.stretch>.1&&x.crush<1e-4?' (déchiré par la cavité)':''}`);
      notes.push(`${n>1?`${D.pel>1?(C.dart?'dard':'plomb'):'balle'} ${k+1} : `:''}${fmt(rec.E,1)} J cédés${rec.exit?`, ressort à ${Math.round(rec.vOut)} m/s`:', logée'}${rec.fragmented?(C.he?', éclate':', se fragmente'):''}${hit.length?' — '+hit.slice(0,5).join(', '):''}`);}
    this.shot.set(evs);const t=this.host.querySelector('#dz-shott');if(t)t.innerHTML=`À ${this.gelR} m, contre un Bèè ${T.a?'('+T.name.toLowerCase()+')':'sans protection'} : ${notes.map(esc).join(' · ')||'rien'}.`;}
  // ---------- l'animation du tir : l'éclair, le recul, puis la balle au ralenti le long de sa trajectoire ----------
  fire(){this.anim={t0:performance.now()};const loop=()=>{if(!this.anim||!this.open)return;const t=(performance.now()-this.anim.t0)/1000;this.draw(t);if(t<3.2)requestAnimationFrame(loop);else{this.anim=null;this.draw(0);}};requestAnimationFrame(loop);}
  draw(t){if(!this.D)return;this.drawPlan(this.D,t);this.drawTraj(this.D,t);if(!t)this.drawRoundCv(this.D);}
  drawRoundCv(D){const F=this.fit('dz-round');if(!F)return;const [x,W,H]=F;const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#10283a');bg.addColorStop(1,'#0b1c29');x.fillStyle=bg;x.fillRect(0,0,W,H);
    x.strokeStyle='rgba(140,190,225,.08)';for(let g=0;g<W;g+=14){x.beginPath();x.moveTo(g,0);x.lineTo(g,H);x.stroke();}for(let g=0;g<H;g+=14){x.beginPath();x.moveTo(0,g);x.lineTo(W,g);x.stroke();}
    drawRound(x,D,6,4,W-12,H-8);x.fillStyle='rgba(200,230,250,.9)';x.font='11px ui-monospace,Consolas,monospace';x.fillText(`${D.name} · ${CONSTRUCTIONS[D.p.cons].name.toLowerCase()} · balle ${mg(D.m)} · poudre ${mg(D.p.c)} · ${Math.round(D.P)} MPa · ${fmt(D.rm,3)} g le coup`,10,H-4>0?14:14,W-20);}
  fit(id){const cv=this.host.querySelector('#'+id);if(!cv||!cv.clientWidth||!cv.clientHeight)return null;const dpr=devicePixelRatio||1;const w=cv.clientWidth,h=cv.clientHeight;if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
    const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);return [x,w,h];}

  // ---------- le plateau ----------
  drawPlan(D,t){const F=this.fit('dz-plan');if(!F)return;const [x,W,H]=F;const p=D.p;const ms=new Set(D.mods);
    if(this.plan3d&&!(ACTIONS[p.action]?.mortar&&!ACTIONS[p.action]?.howitzer&&false)){try{this.gv??=new GunViewer();this.gv.attach(this.host.querySelector('#dz-plan'));this.gv.draw(x,W,H,D,t);x.fillStyle='rgba(232,220,196,.75)';x.font='11px system-ui';x.fillText(`${MOUNTS[D.have].name.toLowerCase()} · ${D.crew} servant${D.crew>1?'s':''} · ${Math.round(D.mass*1000)} g chargée`,12,16);x.fillStyle='rgba(168,180,186,.8)';x.fillText('glisser : tourner · molette : zoom · double clic : recentrer',12,H-8);return;}catch(e){console.error(e);this.plan3d=false;}}
    const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1c2a33');bg.addColorStop(.72,'#141d23');bg.addColorStop(1,'#0e1418');x.fillStyle=bg;x.fillRect(0,0,W,H);const sp=x.createRadialGradient(W*.4,H*.6,10,W*.4,H*.6,W*.6);sp.addColorStop(0,'rgba(255,230,190,.10)');sp.addColorStop(1,'rgba(255,230,190,0)');x.fillStyle=sp;x.fillRect(0,0,W,H);
    const ground=H-26;x.fillStyle='rgba(90,70,45,.45)';x.fillRect(0,ground,W,H-ground);x.strokeStyle='rgba(160,130,90,.45)';x.beginPath();x.moveTo(0,ground);x.lineTo(W,ground);x.stroke();
    if(ACTIONS[p.action]?.mortar&&!ACTIONS[p.action]?.howitzer)return this.drawMortar(D,t,x,W,H,ground);
    // les dimensions de l'arme (mm)
    const d=p.d,Dc=d*(D.pistol?1.25:1.45),COL=D.COL,wall=d*(.35+.00075*D.P)*D.wallx,Dout=d+2*wall;const crewGun=D.have==='trepied';
    const G=layout(D);const {act,stock,dev}=G;const Lw=G.Lw;
    // la place des servants derrière l'arme : le tireur, puis les pourvoyeurs qui attendent avec leurs caisses
    const bearers=D.roles.filter(r=>r!=='tireur'&&r!=='chargeur').length;const behind=D.have==='epaule'?.075:D.have==='bipied'?.18:.075;const crewMm=(behind+bearers*.13)*1000+40;
    // Échelle stable pour les armes portatives : changer la balle ne redimensionne pas le canon à l'écran.
    const s=Math.min(.9,(H-50)/330,(W-40)/Math.max(700,Lw+crewMm));const u=v=>v*1000*s;
    const recoil=t>0&&t<.35?Math.sin(Math.min(1,t/.35)*Math.PI)*Math.min(26,4+D.rk*40)*(1-Math.min(1,t/.35)):0;
    // la hauteur de l'axe : à l'épaule d'un Meumeu debout, au ras du sol couché, ou sur son affût
    const axisY=ACTIONS[p.action]?.howitzer?ground-Math.min((ground-70)*.8,Math.max(u(.07),Dout*s*2.6)):D.have==='epaule'?ground-u(.185):D.have==='bipied'?ground-u(.05):ground-Math.min(ground-70,Math.max(u(.1),Dout*s*6+20));
    const bx=20+crewMm*s-recoil;
    // les servants d'abord (l'arme passe devant eux) : le chargeur de l'autre côté de l'arme, les pourvoyeurs derrière, le tireur
    if(D.roles.includes('chargeur'))meu(x,bx+(stock+act*.5)*s,ground-u(.012),s,'genou',true);
    for(let k=0;k<bearers;k++)meu(x,bx-u(behind+.07)-k*u(.13),ground,s,'porte');
    if(D.have==='epaule')meu(x,bx-u(.04),ground,s,'epaule');else if(D.have==='bipied')meu(x,bx+u(.01),ground,s,'couche');else meu(x,bx-u(.035),ground,s,'genou');
    const mx=drawWeapon(x,D,{bx,ay:axisY,s,ground,t,G});
    // l'éclair, la fumée, l'étui éjecté ; pour une fusée, le souffle arrière
    if(D.rocket&&t>0&&t<1.6){const k=t/1.6;const rx=bx-8;for(let i=0;i<6;i++){x.fillStyle=`rgba(${t<.15?'255,200,120':'205,200,190'},${.5*(1-k)})`;x.beginPath();x.arc(rx-i*10-k*60,axisY+(i%2?-4:4)*k*3,5+k*22+i*3,0,7);x.fill();}}
    if(t>0&&t<.15&&D.flash>.02){const r=(12+D.flash*66)*Math.min(1,s*3)*(1-t/.15);
      if(this.muzzle.complete&&this.muzzle.naturalWidth){x.save();x.globalCompositeOperation='lighter';x.globalAlpha=Math.min(1,D.flash*1.4);x.drawImage(this.muzzle,mx,axisY-r*.72,r*2.4,r*1.44);x.restore();}
      else{const g=x.createRadialGradient(mx,axisY,0,mx,axisY,r);g.addColorStop(0,'rgba(255,250,210,.95)');g.addColorStop(.4,'rgba(255,190,70,.7)');g.addColorStop(1,'rgba(255,120,20,0)');x.fillStyle=g;x.beginPath();x.ellipse(mx+r*.5,axisY,r*1.3,r*.6,0,0,7);x.fill();}}
    if(t>0&&t<2.2){const k=t/2.2;for(let i=0;i<5;i++){x.fillStyle=`rgba(200,196,188,${.35*(1-k)})`;x.beginPath();x.arc(mx+10+i*9+k*40,axisY-k*30-i*3,6+k*20+i*2,0,7);x.fill();}
      if(p.action!=='verrou'&&!D.rocket&&t<.8){const ex=bx+(stock+act*.45)*s+t*60,ey=axisY-20*s-Math.sin(t/.8*Math.PI)*40+t*t*60;x.fillStyle='#c9a043';x.fillRect(ex,ey,Math.max(3,D.caseLen*s),Math.max(2,Dc*s));}}
    // la cartouche en coupe, en médaillon
    // la vue de détail : l'arme seule, agrandie, dans la place libre à droite — chaque pièce se voit
    {const RH=Math.max((D.Dc||d*1.45)*3.2+6,Dout*1.8);const x0=Math.max(mx+36,W*.46),wA=W-12-x0,hA=ground-60;const sd=Math.min(wA/(G.Lw*1.08+(ms.has('baionnette')?20:0)+(D.rocket?40:0)),hA/(RH*(ms.has('trepied')||ACTIONS[p.action]?.howitzer?9:6.5)));
      if(wA>200&&sd>s*1.35){const cy=48+hA*.42;x.save();x.fillStyle='rgba(255,255,255,.035)';x.strokeStyle='rgba(255,255,255,.12)';x.beginPath();x.roundRect?x.roundRect(x0-8,40,wA+14,hA+10,10):x.rect(x0-8,40,wA+14,hA+10);x.fill();x.stroke();
        drawWeapon(x,D,{bx:x0+(D.rocket?14:4)+(ACTIONS[p.action]?.howitzer?G.stock*.8*sd:0),ay:cy,s:sd,ground:Math.min(40+hA+4,cy+RH*sd*(ms.has('trepied')||ACTIONS[p.action]?.howitzer?4.2:3.2)),t:0,G});
        x.fillStyle='rgba(232,220,196,.75)';x.font='11px system-ui';x.fillText(`détail ×${fmt(sd/s,1)}`,x0,54);x.restore();}}
    const TW=W-24;x.fillStyle='#e8dcc4';x.font='600 12px system-ui';x.fillText(`${MOUNTS[D.have].name.toLowerCase()} · ${D.crew} servant${D.crew>1?'s':''} · ${Math.round(D.mass*1000)} g chargée · ${fmt(Lw/10,1)} cm`,12,18,TW);
    x.fillStyle='#a8b4ba';x.font='11px system-ui';x.fillText(`${ACTIONS[p.action].name.toLowerCase()}${ACTIONS[p.action]?.auto?` · ${p.rof} coups/min`:''} · ${ACTIONS[p.action]?.auto&&p.mag>=50?'bande':'chargeur'} de ${p.mag}${D.mods.length?' · '+D.mods.map(k=>MODS[k].name.toLowerCase()).join(', '):''}`,12,34,TW);
    // l'échelle
    x.strokeStyle='#a8b4ba';x.beginPath();x.moveTo(12,ground+14);x.lineTo(12+u(.1),ground+14);x.stroke();x.fillStyle='#a8b4ba';x.fillText('10 cm',16+u(.1),ground+18);}
  // l'arme de profil : crosse (ou poignées de pièce), boîte de culasse, canon, bouche, chargeur, modules. Rend la bouche.
  gun(x,D,bx,ay,s,ground,ms,stock,act,dev){const p=D.p;const d=p.d,Dc=d*(D.pistol?1.25:1.45),COL=D.COL,wall=d*(.35+.00075*D.P)*D.wallx,Dout=d+2*wall;const crewGun=D.have==='trepied';
    const X=v=>bx+v*s;const hR=Math.max(Dc*3.2+6,Dout*1.8);const r2=hR*s/2;
    const metal=(y0,h)=>{const g=x.createLinearGradient(0,y0,0,y0+h);g.addColorStop(0,'#7b848d');g.addColorStop(.45,'#3d434a');g.addColorStop(1,'#23272b');return g;};
    const wood=(y0,h)=>{const g=x.createLinearGradient(0,y0,0,y0+h);g.addColorStop(0,'#a8703f');g.addColorStop(1,'#6a4221');return g;};
    x.lineWidth=1;x.strokeStyle='#1c1f22';
    // un lance-fusée : un simple tube ouvert aux deux bouts, une poignée, une détente électrique, une hausse
    if(D.rocket){const Lt=stock+act+p.L;const bw=Math.max(3,(d+2*d*.08)*s*1.15);const og=x.createLinearGradient(0,ay-bw/2,0,ay+bw/2);og.addColorStop(0,'#7c8a55');og.addColorStop(.5,'#4f5a33');og.addColorStop(1,'#2f361e');
      x.fillStyle=og;x.fillRect(X(0),ay-bw/2,Lt*s,bw);x.strokeRect(X(0),ay-bw/2,Lt*s,bw);x.fillStyle='#2f361e';x.beginPath();x.moveTo(X(0),ay-bw/2);x.lineTo(X(0)-bw*.6,ay-bw*.85);x.lineTo(X(0)-bw*.6,ay+bw*.85);x.lineTo(X(0),ay+bw/2);x.fill();
      for(const f of [.25,.62,.97]){x.fillStyle='#3a4226';x.fillRect(X(Lt*f)-2,ay-bw/2-1,4,bw+2);}
      x.fillStyle='#2b2f33';x.beginPath();x.moveTo(X(Lt*.42),ay+bw/2);x.lineTo(X(Lt*.4),ay+bw/2+r2*2.2);x.lineTo(X(Lt*.44),ay+bw/2+r2*2.2);x.lineTo(X(Lt*.47),ay+bw/2);x.fill();
      x.fillStyle='#c9cdd2';x.fillRect(X(Lt*.55),ay-bw/2-6,3,6);x.fillRect(X(Lt*.9),ay-bw/2-4,2,4);
      // le souffle arrière, au départ
      return X(Lt);}
    // l'affût
    if(ms.has('trepied')){const hx=X(stock+act*.6);x.strokeStyle='#2e3338';x.lineWidth=Math.max(2,d*s*.9);const hh=ground-ay;x.beginPath();x.moveTo(hx,ay+r2);x.lineTo(hx+hh*.95,ground);x.moveTo(hx,ay+r2);x.lineTo(hx-hh*1.15,ground);x.moveTo(hx,ay+r2);x.lineTo(hx-hh*.2,ground+3);x.stroke();x.fillStyle='#2e3338';x.fillRect(hx-6,ay+r2-2,12,6);x.lineWidth=1;}
    if(ms.has('bipied')){const lx=X(stock+act+p.L*.62);x.strokeStyle='#2e3338';x.lineWidth=Math.max(1.5,d*s*.6);x.beginPath();x.moveTo(lx,ay);x.lineTo(lx-8,ground);x.moveTo(lx,ay);x.lineTo(lx+8,ground);x.stroke();x.lineWidth=1;}
    // la crosse ou les poignées de pièce
    if(crewGun){x.fillStyle=metal(ay-r2,r2*2);x.fillRect(X(0),ay-r2*.8,stock*s,r2*1.6);x.fillStyle='#6a4221';x.fillRect(X(0)-2,ay-r2*1.6,5,r2*3.2);}
    else{x.fillStyle=wood(ay-r2,r2*4);x.beginPath();x.moveTo(X(0),ay-r2*1.1);x.lineTo(X(stock),ay-r2*.9);x.lineTo(X(stock),ay+r2*.9);x.lineTo(X(stock*.45),ay+r2*1.5);x.lineTo(X(0),ay+r2*3.2);x.closePath();x.fill();x.stroke();
      x.fillStyle='#2a1a0e';x.fillRect(X(0),ay-r2*1.1,3,r2*4.3);}
    // la boîte de culasse, la détente, la poignée
    x.fillStyle=metal(ay-r2,r2*2);x.fillRect(X(stock),ay-r2,act*s,r2*2);x.strokeRect(X(stock),ay-r2,act*s,r2*2);
    x.fillStyle='#2b2f33';x.beginPath();x.moveTo(X(stock+act*.18),ay+r2);x.lineTo(X(stock+act*.1),ay+r2+r2*1.6);x.lineTo(X(stock+act*.25),ay+r2+r2*1.6);x.lineTo(X(stock+act*.3),ay+r2);x.fill();
    x.strokeStyle='#1c1f22';x.beginPath();x.arc(X(stock+act*.36),ay+r2*1.35,r2*.5,0,Math.PI);x.stroke();
    if(p.action==='verrou'||p.action==='culasse'){x.strokeStyle='#c9cdd2';x.lineWidth=2;x.beginPath();x.moveTo(X(stock+act*.62),ay-r2*.2);x.lineTo(X(stock+act*.62)+6,ay+r2*1.4);x.stroke();x.fillStyle='#c9cdd2';x.beginPath();x.arc(X(stock+act*.62)+6,ay+r2*1.4,2.5,0,7);x.fill();x.lineWidth=1;}
    else{x.fillStyle='#c9cdd2';x.fillRect(X(stock+act*.7),ay-r2*.5,5,2);x.fillStyle='#15181b';x.fillRect(X(stock+act*.45),ay-r2*.25,act*s*.25,r2*.5);}
    // le canon, son garde-main
    const bw=Math.max(2,Dout*s);const b0=stock+act;const multi=ACTIONS[p.action]?.multi;
    // une arme rotative : un faisceau de canons autour d'un axe, tenu par des colliers
    if(multi){for(const o of [-.95,0,.95]){x.fillStyle=metal(ay+o*bw-bw/2,bw);x.fillRect(X(b0),ay+o*bw-bw/2,p.L*s,bw);x.strokeRect(X(b0),ay+o*bw-bw/2,p.L*s,bw);}x.fillStyle='#2b2f33';for(const f of [.05,.5,.95])x.fillRect(X(b0+p.L*f)-2,ay-bw*1.6,4,bw*3.2);}
    else{x.fillStyle=metal(ay-bw/2,bw);x.fillRect(X(b0),ay-bw/2,p.L*s,bw);x.strokeRect(X(b0),ay-bw/2,p.L*s,bw);}
    if(!crewGun){x.fillStyle=wood(ay-r2*.8,r2*1.6);x.fillRect(X(b0),ay-r2*.8,p.L*s*.42,r2*1.6);x.strokeRect(X(b0),ay-r2*.8,p.L*s*.42,r2*1.6);}
    else if(D.wallx>1.3||ACTIONS[p.action]?.auto){x.fillStyle='rgba(30,34,38,.85)';for(let k=0;k<p.L*.5;k+=d*1.6){x.fillRect(X(b0+k),ay-bw*.95,Math.max(1,d*s*.8),bw*1.9);}}
    x.fillStyle='#c9cdd2';x.fillRect(X(b0+p.L)-3,ay-bw/2-4,2,4);
    // la bouche
    const m0=b0+p.L;if(ms.has('manchon')){const hh=Math.max(bw*2.3,6)*Math.pow((p.supVol??250)/250,.2);x.fillStyle=metal(ay-hh/2,hh);x.fillRect(X(m0),ay-hh/2,dev*s,hh);x.strokeRect(X(m0),ay-hh/2,dev*s,hh);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(X(m0),ay-hh/2+1,dev*s,hh*.2);}
    else if(ms.has('frein')){const hh=Math.max(bw*1.6,5);x.fillStyle=metal(ay-hh/2,hh);x.fillRect(X(m0),ay-hh/2,dev*s,hh);x.fillStyle='#101214';for(let k=1;k<4;k++)x.fillRect(X(m0+dev*k/4)-1,ay-hh/2,2,hh);}
    else if(ms.has('cacheflamme')){x.fillStyle='#2b2f33';for(const o of [-1,1])x.fillRect(X(m0),ay+o*bw*.45-(o<0?1.5:0),dev*s,1.5);x.fillRect(X(m0),ay-bw/2,dev*s*.3,bw);}
    // le chargeur : boîte, tambour, ou bande qui pend vers une caisse
    const mag=p.mag,rmm=Dc;if(ACTIONS[p.action]?.auto&&mag>=50){const bxx=X(stock+act*.35),by=ay+r2;x.strokeStyle='#b8912f';x.lineWidth=Math.max(2,Dc*s*1.2);x.beginPath();x.moveTo(bxx,by);x.quadraticCurveTo(bxx-10,by+30,bxx-5,Math.min(ground-8,by+50));x.stroke();x.lineWidth=1;
      const bw2=Math.max(14,COL*s*1.6),bh=Math.max(10,Math.min(60,mag*D.rm*.1*s*30));x.fillStyle='#4f5a3a';x.fillRect(bxx-bw2,Math.min(ground-bh,by+40),bw2,bh);x.strokeRect(bxx-bw2,Math.min(ground-bh,by+40),bw2,bh);}
    else if(mag>30){const rr=Math.max(6,Math.sqrt(mag)*rmm*s*1.3);x.fillStyle=metal(ay,rr*2);x.beginPath();x.arc(X(stock+act*.45),ay+r2+rr*.9,rr,0,7);x.fill();x.stroke();}
    else if(mag>1){const mh=Math.max(6,Math.min(r2*8,mag/2*rmm*s*1.05+6)),mw=Math.max(4,COL*s*1.1);const mx0=X(stock+act*.55);x.fillStyle=metal(ay,mh);x.beginPath();x.moveTo(mx0,ay+r2);x.lineTo(mx0+mw,ay+r2);x.lineTo(mx0+mw+mh*.15,ay+r2+mh);x.lineTo(mx0+mh*.15,ay+r2+mh);x.closePath();x.fill();x.stroke();}
    // poignée avant, lunette, bouclier
    if(ms.has('poignee')){const gx=X(b0+p.L*.25);x.fillStyle='#2b2f33';x.fillRect(gx-2,ay+r2*.8,5,r2*2.4);}
    if(ms.has('lunette')){const lx=X(stock+act*.15),lw=COL*3*s,lh=Math.max(5,(d*2.2+4)*s);x.fillStyle=metal(ay-r2-lh-4,lh);x.fillRect(lx,ay-r2-lh-4,lw,lh);x.strokeRect(lx,ay-r2-lh-4,lw,lh);x.fillStyle='#5fd1c1';x.fillRect(lx+lw-2,ay-r2-lh-3,2,lh-2);x.fillStyle='#2b2f33';x.fillRect(lx+lw*.25,ay-r2-4,3,4);x.fillRect(lx+lw*.7,ay-r2-4,3,4);}
    if(ms.has('bouclier')){const sx=X(b0+Math.min(p.L*.2,40));const hh=Math.max(40,.2*1000*s),ww=Math.max(14,.09*1000*s);x.fillStyle=metal(ay-hh*.6,hh);x.globalAlpha=.9;x.beginPath();x.moveTo(sx,ay-hh*.62);x.lineTo(sx+ww*.35,ay-hh*.62-ww*.25);x.lineTo(sx+ww*.35,ground-2-ww*.25);x.lineTo(sx,ground-2);x.closePath();x.fill();x.stroke();x.globalAlpha=1;x.fillStyle='#0d0f10';x.fillRect(sx+ww*.1,ay-4,ww*.15,5);}
    return X(m0+dev);}
  // la cartouche en coupe : l'étui de laiton, la poudre, la balle et sa construction, la couleur de pointe
  cartridge(x,D,x0,y0,w,h){const p=D.p,C=CONSTRUCTIONS[p.cons];x.save();x.fillStyle='rgba(18,48,71,.92)';x.beginPath();x.roundRect?x.roundRect(x0,y0,w,h,8):x.rect(x0,y0,w,h);x.fill();
    x.strokeStyle='rgba(160,200,230,.12)';for(let g=x0;g<x0+w;g+=12){x.beginPath();x.moveTo(g,y0);x.lineTo(g,y0+h);x.stroke();}
    const d=p.d,l=D.l,nose=D.noseLen,Dc=d*(D.pistol?1.25:1.45),caseLen=D.caseLen,neck=D.pistol?0:d*1.1,shoulder=D.pistol?0:(Dc-d)*.9,out=l*.7,seat=l-out,COL=caseLen+out;
    const sc=Math.min((w-24)/COL,(h-36)/Dc);const px=v=>x0+12+v*sc,Y=y0+h/2+6,py=v=>Y-v*sc;const body=caseLen-neck-shoulder;const pel=D.pel>1;
    // l'étui (ou la douille de papier d'une cartouche de chevrotine)
    const brass=x.createLinearGradient(0,py(Dc/2),0,py(-Dc/2));brass.addColorStop(0,'#f0cf73');brass.addColorStop(.5,'#c9a043');brass.addColorStop(1,'#8a6a22');
    if(D.rocket){const Lm=D.boost.Lm;const st=x.createLinearGradient(0,py(d/2),0,py(-d/2));st.addColorStop(0,'#aab3bb');st.addColorStop(.5,'#6b747c');st.addColorStop(1,'#3b4148');x.fillStyle=st;x.strokeStyle='#22272b';x.fillRect(px(d*.35),py(d/2),(Lm-d*.35)*sc,d*sc);x.strokeRect(px(d*.35),py(d/2),(Lm-d*.35)*sc,d*sc);
      x.fillStyle='#2b2f33';x.beginPath();x.moveTo(px(0),py(d*.42));x.lineTo(px(d*.35),py(d*.3));x.lineTo(px(d*.35),py(-d*.3));x.lineTo(px(0),py(-d*.42));x.fill();
      x.fillStyle='#4a3a22';x.fillRect(px(d*.5),py(d*.38),(Lm-d*.7)*sc,d*.76*sc);const r1=rng(9);x.fillStyle='#9a8a62';for(let k=0;k<120;k++)x.fillRect(px(d*.5+r1()*(Lm-d*.7)),py((r1()-.5)*d*.7),1.3,1.3);
      x.fillStyle='rgba(255,255,255,.75)';x.font='10px system-ui';x.fillText('fusée : poudre, tuyères',px(d*.4),py(-d/2)+12);}
    else{x.fillStyle=pel&&!C.dart&&p.cons!=='duplex'?'#b3302a':brass;x.strokeStyle='#5a4412';x.beginPath();x.moveTo(px(0),py(Dc/2*.92));x.lineTo(px(d*.2),py(Dc/2*.78));x.lineTo(px(d*.42),py(Dc/2));x.lineTo(px(body),py(Dc/2*.97));x.lineTo(px(body+shoulder),py(d/2*1.06));x.lineTo(px(caseLen),py(d/2*1.06));
    x.lineTo(px(caseLen),py(-d/2*1.06));x.lineTo(px(body+shoulder),py(-d/2*1.06));x.lineTo(px(body),py(-Dc/2*.97));x.lineTo(px(d*.42),py(-Dc/2));x.lineTo(px(d*.2),py(-Dc/2*.78));x.lineTo(px(0),py(-Dc/2*.92));x.closePath();x.fill();x.stroke();
    x.fillStyle='#2a2418';x.fillRect(px(d*.5),py(Dc/2*.8),(body-d*.5)*sc,Dc/2*.8*sc);const r0=rng(7);x.fillStyle='#6b6b52';for(let k=0;k<160;k++)x.fillRect(px(d*.5+r0()*(body-d*.5)),py(r0()*Dc/2*.8),1.4,1.4);}
    const b0=D.rocket?D.boost.Lm:caseLen-seat,r=d/2,tip=b0+l,shank=l-nose;
    if(pel&&p.cons!=='duplex'){x.fillStyle=C.dart?'#9aa4ad':'#7d8388';const n=Math.min(D.pel,24);for(let k=0;k<n;k++){const fx=b0+(k%4+.5)*l/4,fy=((k/4|0)%2?.5:-.5)*r*.8;if(C.dart){x.fillRect(px(b0),py(fy+r*.08*(k%3-1)),l*sc,1.2);}else{x.beginPath();x.arc(px(fx),py(fy),Math.max(1.5,r*.35*sc),0,7);x.fill();}}}
    else{const jacket=C.mono?'#c46d38':C.soft?'#8d9196':C.core?'#a8744a':'#c07a3e';const drawB=(o,sub)=>{const rr=r*sub,boat=p.boat??(p.base==='bt'?.3:0);x.beginPath();x.moveTo(px(o),py(rr*(1-boat*.75)));x.lineTo(px(o+Math.min(shank,Math.max(d*.1,l*.17))*boat),py(rr));
        if(p.nose==='plate'){x.lineTo(px(o+l-nose*.2),py(rr*.95));x.lineTo(px(o+l),py(rr*.55));x.lineTo(px(o+l),py(-rr*.55));x.lineTo(px(o+l-nose*.2),py(-rr*.95));}
        else{const k=p.nose==='pointue'?.08:p.nose==='ogive'?.3:.55;x.quadraticCurveTo(px(o+shank+nose*.75),py(rr),px(o+l),py(rr*k));x.lineTo(px(o+l),py(-rr*k));x.quadraticCurveTo(px(o+shank+nose*.75),py(-rr),px(o+shank),py(-rr));}
        x.lineTo(px(o),py(-rr*(1-boat*.75)));x.closePath();x.fillStyle=jacket;x.fill();x.strokeStyle='#4a2a10';x.stroke();};
      if(C.sub){x.fillStyle='#6c7a5a';x.fillRect(px(b0),py(r),l*.75*sc,d*sc);drawB(b0,C.sub);}else if(p.cons==='duplex'){drawB(b0,1);}else drawB(b0,1);
      x.save();x.beginPath();x.rect(px(b0),py(r),l*sc,r*sc);x.clip();if(!C.mono&&!C.sub){x.fillStyle='#8d9196';x.fillRect(px(b0+d*.12),py(r*.82),(l-nose*.6)*sc,r*.82*sc);}
      if(C.core){x.fillStyle=C.rare?'#5fd1c1':p.cons==='tungstene'?'#9aa4ad':'#40464d';x.fillRect(px(b0+d*.25),py(r*.5),(l-nose*.4)*sc,r*.5*sc);}
      if(p.cons==='hp'){x.fillStyle='#2a2418';x.beginPath();x.moveTo(px(tip),py(r*.4));x.lineTo(px(tip-nose*.7),py(0));x.lineTo(px(tip),py(0));x.fill();}
      if(C.he&&!C.shaped){const hf=Math.sqrt(D.hef||.3);x.fillStyle='#f0c419';x.fillRect(px(b0+shank*.15),py(r*.9*hf),shank*.8*sc,r*.9*hf*sc);}
      if(C.shaped){x.fillStyle='#f0c419';x.fillRect(px(b0+d*.2),py(r*.8),shank*.6*sc,r*.8*sc);x.strokeStyle='#e08a4a';x.lineWidth=2;x.beginPath();x.moveTo(px(b0+shank*.75),py(r*.8));x.lineTo(px(b0+shank*.4),py(0));x.stroke();x.lineWidth=1;}
      if(C.tracer){x.fillStyle='#d23a2e';x.fillRect(px(b0),py(r*.4),d*.6*sc,r*.4*sc);}x.restore();
      if(TIPC[p.cons]){x.fillStyle=TIPC[p.cons];x.beginPath();x.arc(px(tip-nose*.12),py(0),Math.max(1.5,r*.5*sc),0,7);x.fill();}}
    x.fillStyle='#dcecf7';x.font='11px ui-monospace,Consolas,monospace';x.fillText(`${D.name} · ${C.name.toLowerCase()}`,x0+10,y0+14,w-20);x.fillStyle='#8fc3e6';x.fillText(`balle ${mg(D.m)} · poudre ${mg(p.c)} · ${Math.round(D.P)} MPa`,x0+10,y0+h-8,w-20);x.restore();}

  // ---------- la trajectoire : au-dessus / au-dessous de la ligne de visée, et la balle au ralenti ----------
  drawTraj(D,t){const F=this.fit('dz-traj');if(!F)return;const [x,W,H]=F;const ink=css('--ink'),muted=css('--muted'),line=css('--line'),teal=css('--teal'),orange=css('--orange'),red=css('--red');
    const last=D.table.length?D.table[D.table.length-1].x:0;const Xmax=Math.max(60,Math.min(last,600,Math.ceil(Math.max(D.eff*2.2,(D.p.zero||50)*1.6)/25)*25));
    const X0=46,X1=W-16,Y0=16,Y1=H-26;const ys=[];for(let r=0;r<=Xmax;r+=Math.max(1,Xmax/200))ys.push([r,D.los(r)]);const top=Math.max(.06,...ys.map(q=>q[1]))*1.15,bot=Math.min(-.12,...ys.map(q=>q[1]))*1.1;
    const X=r=>X0+(X1-X0)*r/Xmax,Y=y=>Y0+(Y1-Y0)*(top-y)/(top-bot);
    // la zone où l'on touche encore un Meumeu (±10 cm)
    x.fillStyle='rgba(84,170,161,.12)';x.fillRect(X0,Y(.1),X1-X0,Y(-.1)-Y(.1));x.strokeStyle=line;x.lineWidth=1;x.font='11px system-ui';x.fillStyle=muted;
    const step=Xmax>300?100:Xmax>120?50:25;for(let r=0;r<=Xmax;r+=step){x.beginPath();x.moveTo(X(r),Y0);x.lineTo(X(r),Y1);x.stroke();x.fillText(`${r} m`,X(r)-10,H-8);}
    for(const y of [.1,0,-.1,-.3,-.5,-1,-2].filter(y=>y<=top&&y>=bot)){x.fillText(`${y>0?'+':''}${fmt(y*100,0)} cm`,4,Y(y)+4);}
    x.setLineDash([6,4]);x.strokeStyle=ink;x.beginPath();x.moveTo(X0,Y(0));x.lineTo(X1,Y(0));x.stroke();x.setLineDash([]);x.fillStyle=ink;x.fillText('ligne de visée',X1-80,Y(0)-5);
    // la trajectoire, teinte par la vitesse (bleu-vert supersonique, orange subsonique)
    for(let i=1;i<ys.length;i++){const [r0,y0]=ys[i-1],[r1,y1]=ys[i];x.strokeStyle=D.at(r1).v>340?teal:orange;x.lineWidth=2.4;x.beginPath();x.moveTo(X(r0),Y(y0));x.lineTo(X(r1),Y(y1));x.stroke();}
    const z=D.p.zero||50;if(z<=Xmax){x.fillStyle=red;x.beginPath();x.arc(X(z),Y(0),4,0,7);x.fill();x.fillText(`hausse ${z} m`,X(z)+6,Y(0)+14);}
    for(const r of [25,50,100,200,300].filter(r=>r<Xmax&&r!==z)){const y=D.los(r);x.fillStyle=Math.abs(y)>.1?red:muted;x.fillText(`${y>=0?'+':''}${cm(y)}`,X(r)+3,Y(y)+(y>0?-6:14));}
    const sub=D.table.find(q=>q.v<340&&q.x<Xmax);if(sub&&D.v0>340){x.fillStyle=orange;x.fillText('passe le mur du son',X(sub.x)+4,Y0+10);}
    if(D.eff&&D.eff<Xmax){x.strokeStyle=red;x.setLineDash([2,3]);x.beginPath();x.moveTo(X(D.eff),Y0);x.lineTo(X(D.eff),Y1);x.stroke();x.setLineDash([]);x.fillStyle=red;x.fillText(`portée utile ${D.eff} m`,X(D.eff)+4,Y1-6);}
    // la balle au ralenti : le temps de vol étiré, une traînée derrière elle
    if(t>.05){const tf=D.at(Xmax).t||1;const slow=2.6;const tt=Math.min(tf,(t-.05)/slow*tf);let r=0;for(const q of D.table){if(q.t>tt||q.x>Xmax)break;r=q.x;}
      const y=D.los(r);const g=x.createLinearGradient(X(Math.max(0,r-Xmax*.08)),0,X(r),0);g.addColorStop(0,'rgba(255,200,80,0)');g.addColorStop(1,'rgba(255,200,80,.9)');x.strokeStyle=g;x.lineWidth=3;x.beginPath();x.moveTo(X(Math.max(0,r-Xmax*.08)),Y(D.los(Math.max(0,r-Xmax*.08))));x.lineTo(X(r),Y(y));x.stroke();
      x.fillStyle='#fff3c4';x.beginPath();x.arc(X(r),Y(y),3.5,0,7);x.fill();x.fillStyle=ink;x.font='600 11px system-ui';x.fillText(`${Math.round(r)} m · ${Math.round(D.at(r).v)} m/s · ${fmt(D.at(r).t*1000,0)} ms`,Math.min(X(r)+8,X1-150),Y(y)-8);}}

  // ---------- la précision : un Meumeu de face à chaque distance, et où tombent vingt balles ----------
  drawPrec(D){const F=this.fit('dz-prec');if(!F)return;const [x,W,H]=F;const muted=css('--muted'),ink=css('--ink');const Rs=[10,25,50,100,200].filter(r=>!D.at(r).beyond);const n=Rs.length||1;const pw=W/n;
    for(let i=0;i<Rs.length;i++){const R=Rs[i];const sig=D.sigAt(R);const cx=pw*i+pw/2,cy=H/2-6;const sc=Math.min(95/.3,(pw*.42)/Math.max(.15,sig*2.4));const k=v=>v*sc;
      x.fillStyle='rgba(84,170,161,.08)';x.fillRect(pw*i+4,4,pw-8,H-8);
      // le Meumeu de face (d'après le portrait) : 30 cm, cible utile 7 × 20 cm
      meuFront(x,cx,cy+k(.15),sc);
      x.strokeStyle='rgba(179,38,30,.8)';x.setLineDash([3,3]);x.beginPath();x.ellipse(cx,cy+k(.02),k(sig*2),k(sig*2),0,0,7);x.stroke();x.setLineDash([]);
      const r0=rng(11+i);for(let j=0;j<20;j++){const a=r0()*6.283,g=Math.sqrt(-2*Math.log(Math.max(1e-6,r0())));const hx=cx+Math.cos(a)*g*k(sig),hy=cy+k(.02)+Math.sin(a)*g*k(sig);x.fillStyle='#b3261e';x.beginPath();x.arc(hx,hy,2,0,7);x.fill();}
      x.fillStyle=ink;x.font='600 12px system-ui';x.textAlign='center';x.fillText(`${R} m`,cx,16);x.font='600 12px system-ui';const hp=Math.round(D.hitP(R)*100);x.fillStyle=hp>=50?css('--good'):hp>=20?css('--orange2'):css('--red');x.fillText(`touche ${hp} %`,cx,H-22);x.font='11px system-ui';x.fillStyle=muted;x.fillText(`groupe ${cm(sig*4)}`,cx,H-8);x.textAlign='left';}}
  // ---------- la perforation selon la distance, contre ce qu'on rencontre ----------
  // un mortier : la plaque de base, le tube à 60°, le bipied ; le chargeur laisse glisser l'obus, le pointeur à la hausse
  drawMortar(D,t,x,W,H,ground){const p=D.p;const d=p.d,wall=d*(.35+.00075*D.P)*D.wallx,Dout=d+2*wall;const L=p.L;
    const s=Math.min(.9,(W-60)/(L*.5+520),(H-50)/(L*.87+60));const u=v=>v*1000*s;const a=-Math.PI/3;
    const bx=W*.5-L*.25*s,by=ground-4;const mx=bx+Math.cos(a)*L*s,my=by+Math.sin(a)*L*s;
    const bearers=D.roles.filter(r=>r!=='tireur'&&r!=='chargeur').length;
    for(let k=0;k<bearers;k++)meu(x,bx-u(.2)-k*u(.13),ground,s,'porte');
    meu(x,bx-u(.07),ground,s,'genou');                                               // le pointeur, à la hausse
    // la plaque de base
    x.fillStyle='#3b4148';x.beginPath();x.ellipse(bx,by+2,Dout*s*2.4,Dout*s*.7,0,0,7);x.fill();x.strokeStyle=LINE;x.lineWidth=1;x.stroke();
    // le tube
    x.save();x.translate(bx,by);x.rotate(a);const g=x.createLinearGradient(0,-Dout*s/2,0,Dout*s/2);g.addColorStop(0,'#5b636b');g.addColorStop(.5,'#2e3439');g.addColorStop(1,'#1d2226');x.fillStyle=g;x.fillRect(0,-Dout*s/2,L*s,Dout*s);x.strokeStyle=LINE;x.strokeRect(0,-Dout*s/2,L*s,Dout*s);
    x.fillStyle='#15191c';x.fillRect(L*s-2,-d*s/2,2,d*s);x.restore();
    // le bipied, la hausse
    const kx=bx+Math.cos(a)*L*s*.62,ky=by+Math.sin(a)*L*s*.62;x.strokeStyle='#4a525a';x.lineWidth=Math.max(1.5,Dout*s*.35);x.beginPath();x.moveTo(kx,ky);x.lineTo(kx+u(.09),ground);x.moveTo(kx,ky);x.lineTo(kx+u(.05),ground);x.stroke();
    x.fillStyle='#8a939b';x.fillRect(kx-4,ky-6,6,4);
    // le chargeur, à genoux devant la bouche ; l'obus qui descend, le départ, la fumée
    meu(x,mx+u(.07),ground,s,'genou',true);
    const sl=D.l*s,sd=d*s;const drop=t>0&&t<.45?t/.45:0;
    if(t===0||drop>0){const q=drop>0?drop:0;const ox=mx+Math.cos(a)*(sl*(1.2-q*1.5)),oy=my+Math.sin(a)*(sl*(1.2-q*1.5));x.save();x.translate(ox,oy);x.rotate(a+Math.PI);x.fillStyle='#6b7b3a';x.beginPath();x.ellipse(0,0,sl*.55,sd*.5,0,0,7);x.fill();x.fillStyle='#f0c419';x.fillRect(sl*.2,-sd*.5,sl*.12,sd);x.fillStyle='#39402a';x.fillRect(-sl*.75,-sd*.35,sl*.25,sd*.7);x.restore();}
    if(t>=.45&&t<.75){const k=(t-.45)/.3;x.globalCompositeOperation='lighter';const r=x.createRadialGradient(mx,my,0,mx,my,20+40*k);r.addColorStop(0,`rgba(255,240,200,${.9*(1-k)})`);r.addColorStop(1,'rgba(255,120,40,0)');x.fillStyle=r;x.beginPath();x.arc(mx,my,20+40*k,0,7);x.fill();x.globalCompositeOperation='source-over';}
    if(t>=.45&&t<3){const k=(t-.45);for(let n=0;n<7;n++){x.fillStyle=`rgba(200,195,185,${Math.max(0,.35-k*.1)})`;x.beginPath();x.arc(mx+n*6+k*14,my-n*5-k*20,8+n*3+k*10,0,7);x.fill();}
      if(k<.6){const ox=mx+Math.cos(a)*k*900,oy=my+Math.sin(a)*k*900;x.fillStyle='#6b7b3a';x.beginPath();x.arc(ox,oy,Math.max(1.5,sd*.5),0,7);x.fill();}}
    x.fillStyle='rgba(255,255,255,.75)';x.font='11px system-ui';x.fillText(`Mortier de ${fmt(d,1)} mm · tube de ${L} mm · ${fmt(D.mass*1000,0)} g · ${D.crew} servant${D.crew>1?'s':''} — il ne tire qu’en cloche, de ${CHARGES.length} charges`,10,16);}
  // la zone d'effet d'un obus : le souffle (mortel, lésions, commotion, sonné), les éclats (gravement touché à 50 %, touché à 10 %,
  // à 1 % : la distance de sécurité), debout et couché ; et le tir courbe (portée, charges, temps de vol)
  drawZone(D){const he=D.he;const tb=this.host.querySelector('[data-dz="view:zone"]');if(tb)tb.classList.toggle('off',!he||!!he.shaped);if(!he||he.shaped)return;const F=this.fit('dz-zone');if(!F)return;const [x,W,H]=F;
    const ink=css('--ink'),muted=css('--muted'),line=css('--line');x.font='11px system-ui';
    const safe=(()=>{let r=0;for(let q=.02;q<200;q*=1.04)if(he.at(q).pb>=.01)r=q;return r;})();
    const Rm=Math.max(.6,Math.min(40,Math.max(he.danger,he.stun)*1.25));const cx=H/2+6,cy=H/2,S=(H/2-14)/Rm;
    // la chance d'être gravement touché, en couleur ; les anneaux du souffle
    for(let r=Rm;r>0;r-=Rm/60){const {pg,pb}=he.at(r);x.fillStyle=`rgba(${Math.round(120+135*pg)},${Math.round(70*(1-pg))},40,${Math.min(.85,pb*.9+pg*.2)})`;x.beginPath();x.arc(cx,cy,r*S,0,7);x.fill();}
    const ring=(r,col,lab,dash)=>{if(r*S<2)return;x.strokeStyle=col;x.lineWidth=1.5;x.setLineDash(dash||[]);x.beginPath();x.arc(cx,cy,r*S,0,7);x.stroke();x.setLineDash([]);};
    ring(he.stun,'#9fb4ff','',[2,3]);ring(he.conc,'#9fb4ff','');ring(he.inj,'#ff7a6a','');ring(he.blast,'#ffffff','');ring(he.lethal,'#ff3b2f','',[5,3]);ring(he.danger,'#ffb347','',[5,3]);
    // des Meumeu tous les 50 cm, pour l'échelle
    for(let r=.5;r<Rm;r+=.5)for(const a of [-.6,.9,2.4,3.9]){const px=cx+Math.cos(a+r)*r*S,py=cy+Math.sin(a+r)*r*S;x.fillStyle='rgba(240,230,210,.85)';x.beginPath();x.ellipse(px,py,Math.max(1.5,.035*S),Math.max(1.2,.025*S),0,0,7);x.fill();}
    x.fillStyle='#fff';x.beginPath();x.arc(cx,cy,3,0,7);x.fill();
    x.fillStyle=muted;x.fillText(`${fmt(Rm,1)} m`,cx+Rm*S*.72,cy+Rm*S*.72);
    // la courbe
    const G0=H+30,G1=W-12,T0=14,T1=H-26;const Xg=r=>G0+(G1-G0)*r/Rm,Yg=p=>T1-(T1-T0)*p;x.strokeStyle=line;x.beginPath();x.moveTo(G0,T0);x.lineTo(G0,T1);x.lineTo(G1,T1);x.stroke();
    for(const [f,col,dash] of [[r=>he.at(r).pg,'#ff3b2f',[]],[r=>he.at(r).pb,'#ffb347',[]],[r=>he.at(r,'couche').pg,'#ff3b2f',[4,3]],[r=>he.at(r,'couche').pb,'#ffb347',[4,3]]]){x.strokeStyle=col;x.setLineDash(dash);x.lineWidth=2;x.beginPath();for(let i=0;i<=80;i++){const r=Math.max(.02,Rm*i/80);const v=f(r);i?x.lineTo(Xg(r),Yg(v)):x.moveTo(Xg(r),Yg(v));}x.stroke();x.setLineDash([]);}
    x.fillStyle=muted;x.fillText('100 %',G0+4,T0+8);x.fillText(`distance (m) →  ${fmt(Rm,1)}`,G1-110,T1+14);x.fillStyle='#ff3b2f';x.fillText('— gravement touché',G1-150,T0+10);x.fillStyle='#ffb347';x.fillText('— touché',G1-150,T0+24);x.fillStyle=muted;x.fillText('- - couché',G1-150,T0+38);
    const A=arcTable(D.v0,D.BC,!!ACTIONS[this.p.action]?.mortar,D.boost);const zoneOk=this.p.d>=5;
    const t=this.host.querySelector('#dz-zonet');if(t)t.innerHTML=`<b>Le souffle</b> (${mg(he.g)} de ${esc(he.fill.name.toLowerCase())}, ${fmt(he.W*1000,2)} g d’équivalent tolite) : tue net à <b>${cm(he.blast)}</b>, déchire poumons et tympans à ${cm(he.inj)}, assomme à <b>${cm(he.conc)}</b>, sonne et assourdit à ${cm(he.stun)} (le Bèè ne tire plus quelques secondes). `+
      `<b>Les éclats</b> : ${he.n} éclats de ${fmt((he.fm||.004)*1000,1)} mg (${esc(he.shell.name.toLowerCase())}), lancés à ${Math.round(he.vg)} m/s ; un Bèè debout est gravement touché une fois sur deux à <b>${cm(he.lethal)}</b> (couché : ${cm(he.lethalProne)}), touché une fois sur dix à <b>${cm(he.danger)}</b> ; distance de sécurité (1 %) : ${cm(safe)}. `+
      `Fusée ${esc(he.fuse.name.toLowerCase())} : ${esc(he.fuse.desc)}. `+
      (zoneOk?`<b>Tir sur zone</b> : portée ${Math.round(A.max)} m (${Math.round(A.max/4)} cases)${A.mortar?` avec ${CHARGES.length} charges (de ${Math.round(A.min)} à ${Math.round(A.max)} m, en cloche)`:', en cloche ou tendu'}. Sans observateur, les obus tombent à 6 % de la distance près ; un Meumeu qui voit la zone règle le tir.`:'<b>Tir sur zone</b> : il faut 5 mm de calibre au moins.');}
  drawPen(D,R){const F=this.fit('dz-pen');if(!F)return;const [x,W,H]=F;const muted=css('--muted'),line=css('--line'),teal=css('--teal'),ink=css('--ink');
    if(D.he&&!D.he.shaped&&D.he.cls?.length){this.drawFragPen(D,x,W,H,{muted,line,teal,ink});return;}
    const last=D.table.length?D.table[D.table.length-1].x:0;const Xmax=Math.max(50,Math.min(last,400,Math.ceil(D.eff*2.5/50)*50));const pmax=Math.max(1.5,D.pen(D.v0),R.pen(R.v0))*1.15;
    const X0=40,X1=W-170,Y0=10,Y1=H-24;const X=r=>X0+(X1-X0)*r/Xmax,Y=v=>Y1-(Y1-Y0)*Math.min(1,v/pmax);x.font='11px system-ui';
    const refs=[['casque Mle 1',.8],['plastron bèè',1.2],['tôle de wagon',3],['mur de briques',8],['plaque de pièce',15]].filter(([,v])=>v<pmax);
    for(const [n,v] of refs){x.strokeStyle=line;x.setLineDash([3,3]);x.beginPath();x.moveTo(X0,Y(v));x.lineTo(X1,Y(v));x.stroke();x.setLineDash([]);x.fillStyle=muted;x.fillText(`${n} (${fmt(v,1)} mm)`,X1+6,Y(v)+4);}
    const step=Xmax>200?100:50;for(let r=0;r<=Xmax;r+=step){x.fillStyle=muted;x.fillText(`${r} m`,X(r)-10,H-8);}
    const plot=(W2,col,dash)=>{x.setLineDash(dash);x.strokeStyle=col;x.lineWidth=2.2;x.beginPath();for(let r=0;r<=Xmax;r+=Math.max(1,Xmax/150)){const v=W2.pen(W2.at(r).v);r?x.lineTo(X(r),Y(v)):x.moveTo(X(r),Y(v));}x.stroke();x.setLineDash([]);};
    plot(R,teal+'66',[4,4]);plot(D,teal,[]);x.fillStyle=ink;x.fillText(`${fmt(D.pen(D.v0),D.pen(D.v0)<10?2:0)} mm à la bouche`,X0+4,Y0+10);x.fillStyle=muted;x.fillText('— cette arme   - - la référence',X0+4,Y0+24);}
  drawFragPen(D,x,W,H,{muted,line,teal,ink}){const he=D.he,cls=[...he.cls].sort((a,z)=>z.m-a.m);const big=cls[0],small=cls[cls.length-1],mid=cls.reduce((a,c)=>Math.abs(Math.log(c.m/he.fm))<Math.abs(Math.log(a.m/he.fm))?c:a,cls[0]);
    const dmm=g=>2*Math.cbrt(3*(g*1000/7.85)/(4*Math.PI)),pen=(c,r)=>{const v=he.vg*Math.exp(-r/c.lam);return .00112*Math.sqrt(c.m)*Math.pow(v,1.4)/Math.pow(dmm(c.m),.75)*.7*Math.max(0,Math.min(1,(v-120)/250));};
    const Xmax=Math.max(4,Math.min(200,Math.ceil((he.danger||10)*1.3)));const pmax=Math.max(1,pen(big,0))*1.15;
    const X0=40,X1=W-170,Y0=10,Y1=H-24;const X=r=>X0+(X1-X0)*r/Xmax,Y=v=>Y1-(Y1-Y0)*Math.min(1,v/pmax);x.font='11px system-ui';
    const refs=[['casque Mle 1',.8],['plastron bèè',1.2],['tôle de wagon',3],['mur de briques',8],['plaque de pièce',15]].filter(([,v])=>v<pmax);
    for(const [n,v] of refs){x.strokeStyle=line;x.setLineDash([3,3]);x.beginPath();x.moveTo(X0,Y(v));x.lineTo(X1,Y(v));x.stroke();x.setLineDash([]);x.fillStyle=muted;x.fillText(`${n} (${fmt(v,1)} mm)`,X1+6,Y(v)+4);}
    const step=Xmax>100?25:Xmax>40?10:Xmax>16?5:2;for(let r=0;r<=Xmax;r+=step){x.fillStyle=muted;x.fillText(`${r} m`,X(r)-8,H-8);}
    const ys=pmax>8?2:pmax>4?1:pmax>2?.5:.25;for(let v=0;v<=pmax;v+=ys){x.fillStyle=muted;x.fillText(`${fmt(v,2)}`,4,Y(v)+4);x.strokeStyle=line+'55';x.beginPath();x.moveTo(X0,Y(v));x.lineTo(X0+4,Y(v));x.stroke();}x.fillText('mm',4,Y1+14);
    // la limite où les éclats tuent (une fois sur deux, debout)
    x.strokeStyle='#e0705f';x.setLineDash([5,4]);x.beginPath();x.moveTo(X(he.lethal),Y0);x.lineTo(X(he.lethal),Y1);x.stroke();x.setLineDash([]);x.fillStyle='#e0705f';x.fillText(`mortels jusqu’à ${fmt(he.lethal,1)} m`,Math.min(X1-110,X(he.lethal)+4),Y0+42);
    const plot=(c,col,dash,w)=>{x.setLineDash(dash);x.strokeStyle=col;x.lineWidth=w;x.beginPath();for(let r=0;r<=Xmax;r+=Xmax/160){const v=pen(c,r);r?x.lineTo(X(r),Y(v)):x.moveTo(X(r),Y(v));}x.stroke();x.setLineDash([]);x.lineWidth=1;};
    const g=m=>m<1?`${Math.round(m*1000)} mg`:`${fmt(m,1)} g`;
    plot(small,teal+'88',[3,3],1.6);plot(mid,teal,[],2.4);if(big!==mid)plot(big,'#e8bf62',[],2);
    x.fillStyle=ink;x.fillText(`les éclats d’un obus, selon la distance à l’explosion (lancés à ${Math.round(he.vg)} m/s)`,X0+4,Y0+10);
    x.fillStyle=muted;x.fillText(`— typiques (${g(mid.m)}) : ${fmt(pen(mid,1),2)} mm à 1 m   — plus gros (${g(big.m)}, en or)   - - plus petits (${g(small.m)})`,X0+4,Y0+24);}
  // le bloc de gélatine, vu de côté : le trajet (sa couleur dit la bascule), la cavité temporaire, les éclats
  drawGel(D){const F=this.fit('dz-gel');if(!F)return;const [x,w,h]=F;const v=D.at(this.gelR).v;const g=gel(D,v,rng(3),.16);
    const X0=20,X1=w-20,Yc=h/2-6,Lm=.16;const k=(X1-X0)/Lm;const X=z=>X0+Math.min(Lm,Math.max(0,z))*k,Y=y=>Yc-Math.max(-.035,Math.min(.035,y))*k;const half=Math.min(.03*k,Yc-10);
    const gg=x.createLinearGradient(0,Yc-half,0,Yc+half);gg.addColorStop(0,'rgba(240,214,160,.55)');gg.addColorStop(1,'rgba(220,180,120,.45)');x.fillStyle=gg;x.fillRect(X0,Yc-half,X1-X0,2*half);x.strokeStyle='rgba(180,140,90,.6)';x.strokeRect(X0,Yc-half,X1-X0,2*half);
    x.fillStyle='rgba(215,90,60,.25)';x.beginPath();x.moveTo(X(0),Yc);for(const t of g.R.tc)x.lineTo(X(t.p[2]),Yc-Math.min(half,t.r*k));for(const t of [...g.R.tc].reverse())x.lineTo(X(t.p[2]),Yc+Math.min(half,t.r*k));x.closePath();x.fill();
    for(const f of g.R.frags){x.strokeStyle='rgba(200,110,40,.85)';x.lineWidth=1;x.beginPath();f.pts.forEach((q,i)=>{const px=X(q.p[2]),py=Y(q.p[1]);i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();}
    const P=g.R.path;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const yaw=Math.min(1,b.yaw/(Math.PI/2));x.strokeStyle=`rgb(${Math.round(90+150*yaw)},${Math.round(60-30*yaw)},40)`;x.lineWidth=Math.max(1.5,b.d/1000*k*.9);x.beginPath();x.moveTo(X(Math.max(0,a.p[2])),Y(a.p[1]));x.lineTo(X(Math.max(0,b.p[2])),Y(b.p[1]));x.stroke();}
    let row=0;const tag=(z,t,col)=>{if(z==null)return;x.strokeStyle=col;x.lineWidth=1.5;x.setLineDash([3,3]);x.beginPath();x.moveTo(X(z),Yc-half);x.lineTo(X(z),Yc+half);x.stroke();x.setLineDash([]);x.font='600 12px system-ui';const tw=x.measureText(t).width;const ty=Yc-half+14+row*16;row++;x.fillStyle='rgba(255,255,255,.8)';x.fillRect(X(z)+2,ty-11,tw+6,15);x.fillStyle=col;x.fillText(t,X(z)+5,ty);};
    tag(g.yawAt,`bascule ${fmt(g.yawAt*100,1)} cm`,'#b3261e');tag(g.fragAt,`${D.he?'éclate':'se brise'} ${fmt(g.fragAt*100,1)} cm`,'#c86a1f');if(!g.exit)tag(g.depth,`arrêtée ${fmt(g.depth*100,1)} cm`,css('--ink'));
    x.fillStyle=css('--muted');x.font='12px system-ui';for(let c=0;c<=16;c+=4)x.fillText(`${c} cm`,X(c/100)-8,h-6);
    const t=this.host.querySelector('#dz-gelt');const exitE=.5*D.m/1000*g.vOut**2;
    t.innerHTML=`À ${this.gelR} m, elle arrive à <b>${Math.round(v)} m/s</b> (${fmt(.5*D.m/1000*v*v,1)} J) et laisse <b>${fmt(g.E,1)} J</b> dans le bloc${g.exit?` — elle en ressort à ${Math.round(g.vOut)} m/s (${fmt(exitE,1)} J perdus pour la blessure)`:''}. `+
      `${g.yawAt!=null?`Elle bascule à ${fmt(g.yawAt*100,1)} cm. `:'Elle reste droite. '}${g.fragmented?(D.he?'La charge éclate : des éclats partout. ':'Elle se fragmente : des éclats partout. '):''}${g.expanded?'Elle s’expanse. ':''}Cavité temporaire jusqu’à ${fmt(g.maxTc*2*1000,1)} mm de large, à ${fmt(g.tcAt*100,1)} cm : elle déchire le foie, la rate, le cerveau.${D.he?` Autour du point d’éclatement : souffle mortel à ${cm(D.he.blast)}${D.he.shaped?'':`, éclats mortels à ${cm(D.he.lethal)}`}.`:''}`;}
}
const SHOOTER=1.5;
// ---------- les Meumeu du plateau, d'après le portrait : une peluche crème, museau clair, cornes, pattes et sabots plus foncés ----------
const CREAM='#f1e3c6',SHADE='#dcc6a0',PAW='#c9a57a',LINE='#8a7355',EYE='#4a2e1e';
function blob(x,cx,cy,rx,ry,fill,rot=0){x.beginPath();x.ellipse(cx,cy,Math.max(.5,rx),Math.max(.5,ry),rot,0,7);x.fillStyle=fill;x.fill();x.strokeStyle=LINE;x.lineWidth=1;x.stroke();}
function head(x,cx,cy,k,face=1){blob(x,cx-face*k*.028,cy-k*.03,k*.013,k*.01,SHADE,-.5*face);blob(x,cx+face*k*.012,cy-k*.043,k*.008,k*.016,PAW,.3*face);// oreille, corne
  blob(x,cx,cy,k*.034,k*.04,CREAM);blob(x,cx+face*k*.012,cy+k*.018,k*.026,k*.02,'#f6ecd6');
  x.fillStyle=EYE;x.beginPath();x.arc(cx+face*k*.012,cy-k*.012,Math.max(1,k*.004),0,7);x.fill();x.beginPath();x.arc(cx+face*k*.028,cy+k*.016,Math.max(.8,k*.0032),0,7);x.fill();
  x.strokeStyle='#b98a55';x.setLineDash([2,2]);x.beginPath();x.arc(cx+face*k*.012,cy+k*.02,k*.014,.3,Math.PI-.3);x.stroke();x.setLineDash([]);}
function meu(x,cx,ground,s,pose,face=false){const k=1000*s;const f=face?-1:1;x.save();x.globalAlpha=face?.92:1;
  if(pose==='couche'){blob(x,cx-k*.06,ground-k*.03,k*.07,k*.03,CREAM);blob(x,cx-k*.13,ground-k*.018,k*.03,k*.014,PAW);
    x.save();x.translate(cx+k*.012,ground-k*.045);x.rotate(.55);head(x,k*.01,-k*.012,k,1);x.restore();blob(x,cx+k*.02,ground-k*.03,k*.012,k*.03,PAW,.6);}
  else if(pose==='genou'){blob(x,cx-k*.01,ground-k*.018,k*.035,k*.018,PAW);blob(x,cx,ground-k*.075,k*.05,k*.055,CREAM);head(x,cx+f*k*.01,ground-k*.16,k,f);blob(x,cx+f*k*.035,ground-k*.08,k*.012,k*.03,PAW,.8*f);}
  else if(pose==='porte'){blob(x,cx-k*.02,ground-k*.03,k*.017,k*.03,SHADE);blob(x,cx+k*.02,ground-k*.03,k*.017,k*.03,SHADE);blob(x,cx-k*.02,ground-k*.008,k*.018,k*.009,PAW);blob(x,cx+k*.02,ground-k*.008,k*.018,k*.009,PAW);
    blob(x,cx,ground-k*.11,k*.055,k*.058,CREAM);head(x,cx+k*.005,ground-k*.215,k,1);x.fillStyle='#6a4a2a';x.fillRect(cx-k*.03,ground-k*.14,k*.06,k*.04);x.strokeStyle='#3a2410';x.strokeRect(cx-k*.03,ground-k*.14,k*.06,k*.04);blob(x,cx+k*.04,ground-k*.12,k*.013,k*.03,PAW,.5);}
  else{// debout, l'arme à l'épaule
    blob(x,cx-k*.02,ground-k*.035,k*.018,k*.035,SHADE);blob(x,cx+k*.024,ground-k*.035,k*.018,k*.035,SHADE);blob(x,cx-k*.02,ground-k*.009,k*.019,k*.01,PAW);blob(x,cx+k*.024,ground-k*.009,k*.019,k*.01,PAW);
    blob(x,cx,ground-k*.115,k*.058,k*.06,CREAM);x.strokeStyle='#b98a55';x.setLineDash([2,2]);x.beginPath();x.arc(cx+k*.02,ground-k*.1,k*.018,3.6,5.2);x.stroke();x.setLineDash([]);
    head(x,cx+k*.02,ground-k*.235,k,1);blob(x,cx+k*.05,ground-k*.175,k*.03,k*.013,PAW,-.1);}
  x.restore();}
// de face, pour la cible
function meuFront(x,cx,foot,sc){const k=sc;x.save();const B=(ax,ay,rx,ry,c)=>{x.beginPath();x.ellipse(cx+ax*k,foot-ay*k,rx*k,ry*k,0,0,7);x.fillStyle=c;x.fill();x.strokeStyle=LINE;x.lineWidth=.8;x.stroke();};
  B(-.033,.035,.022,.035,SHADE);B(.033,.035,.022,.035,SHADE);B(-.033,.01,.022,.011,PAW);B(.033,.01,.022,.011,PAW);B(-.068,.12,.018,.04,CREAM);B(.068,.12,.018,.04,CREAM);B(-.07,.09,.017,.014,PAW);B(.07,.09,.017,.014,PAW);
  B(0,.11,.06,.058,CREAM);B(-.045,.27,.016,.012,SHADE);B(.045,.27,.016,.012,SHADE);B(-.018,.285,.007,.014,PAW);B(.018,.285,.007,.014,PAW);B(0,.235,.038,.048,CREAM);B(0,.205,.03,.022,'#f6ecd6');
  x.fillStyle=EYE;for(const [ex,ey] of [[-.016,.25],[.016,.25],[-.012,.206],[.012,.206]]){x.beginPath();x.arc(cx+ex*k,foot-ey*k,Math.max(1,.0035*k),0,7);x.fill();}
  x.strokeStyle='rgba(179,38,30,.35)';x.strokeRect(cx-.035*k,foot-.23*k,.07*k,.2*k);x.restore();}

// Le bureau d'études des armes : l'atelier complet (V5.8). L'éditeur de pièces V6 a été retiré en V12.3 (superflu) ;
// son modèle de calcul (kitCalc / kitToP de ballistics.js) reste celui des armes de départ qui en viennent (obusier, canons d'engins).
export class Designer{
  constructor(host,options){this.host=host;this.bureau=options.bureau;this.classic=new DesignerAncien(host,options);this.classic.onExit=()=>this.close();}
  get open(){return !this.host.hidden;}
  // la conception en cours dans l'atelier (pas encore enregistrée), pour la nomenclature du catalogue ; null si l'atelier n'est pas affiché
  draft(){if(this.host.hidden||!this.host.querySelector('#designer')||!this.classic.p)return null;return {p:JSON.parse(JSON.stringify(this.classic.p)),name:this.classic.name};}
  show(fromId='mle1'){this.classic.show(fromId);}
  editP(p,name,cb){this.classic.editP(p,name,cb);}
  close(){this.classic.close();}
}

