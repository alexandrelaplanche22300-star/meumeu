// La recherche (V12.6) : les savants meumeu, leurs disciplines, leurs caractères, leurs grades ; les étapes d'un projet et le bâtiment où chacune
// se fait ; les réunions ; ce que disent les savants dans la vue recherche. La simulation est dans research.js, l'intérieur des bâtiments dans
// bldg3d.js (labInteriors), la vue et le panneau dans view.js et research-ui.js.

// Les six disciplines. Un savant en a une ; il travaille aussi hors d'elle, mais au tiers.
export const DISC={
  agro:{name:'Agronomie',who:'agronome',ico:'❦',col:'#9fbf4a'},
  geo:{name:'Géologie',who:'géologue',ico:'⛰',col:'#b09878'},
  meca:{name:'Mécanique',who:'ingénieur',ico:'⚙',col:'#d49a48'},
  chimie:{name:'Chimie',who:'chimiste',ico:'⚗',col:'#6fcf8f'},
  balist:{name:'Balistique',who:'balisticien',ico:'◎',col:'#e0705f'},
  medecine:{name:'Médecine',who:'médecin chercheur',ico:'✚',col:'#9fc4e8'},
};
// le domaine d'une innovation → la discipline qui la mène
export const DOM_DISC={bois:'agro',vivres:'agro',pierre:'geo',mine:'geo',atelier:'meca',logistique:'meca',construction:'meca',armement:'meca',
  tir:'balist',defense:'balist',soins:'medecine',chimie:'chimie'};
// L'ancien métier d'un villageois qu'on forme : son domaine de pratique et son nom. Formé dans la discipline de ce domaine, il en garde le savoir-faire
// (le trait « praticien » : +25 % dans sa discipline, et dix points d'expérience d'avance).
export const METIERS={bois:'bûcheron',pierre:'carrier',vivres:'meunier',mine:'mineur',atelier:'ouvrier d’atelier',construction:'bâtisseur',logistique:'porteur',
  armement:'armurier',chimie:'ouvrier poudrier',soins:'brancardier',tir:'tireur',defense:'sentinelle'};

// Les étapes d'un projet : où elles se font, et ce qu'on y voit
export const PHASES={
  theorie:{name:'Théorie',at:'centre_recherche',verb:'au tableau noir',ico:'✎'},
  experience:{name:'Expériences',at:'labo',verb:'à la paillasse',ico:'⚗'},
  conception:{name:'Plans et maquette',at:'armurerie',verb:'à la planche à dessin',ico:'📐'},
  pilote:{name:'Essai pilote',at:'poudrerie',verb:'dans l’atelier pilote',ico:'⚙'},
};
// le bâtiment → l'étape qu'on y mène, et combien de savants y tiennent (places de travail)
export const LAB_KIND={centre_recherche:'theorie',labo:'experience',armurerie:'conception',poudrerie:'pilote'};
export const LAB_SEATS={centre_recherche:10,labo:5,armurerie:3,poudrerie:3};
// le chemin d'une innovation selon son domaine, et la part du travail de chaque étape
export const DOM_PHASES={bois:['theorie','experience'],vivres:['theorie','experience'],pierre:['theorie','experience'],mine:['theorie','experience'],soins:['theorie','experience'],
  atelier:['theorie','conception'],logistique:['theorie','conception'],construction:['theorie','conception'],armement:['theorie','conception'],tir:['theorie','conception'],defense:['theorie','conception'],
  chimie:['theorie','experience','pilote']};
export const PHASE_SHARE={2:[.4,.6],3:[.3,.4,.3]};
// le travail d'une innovation, en heures-savant (un chercheur à 100 %) : ses heures de développement d'autrefois × WORK_K
export const WORK_K=2.2;

// Les grades, selon l'expérience (heures de travail dans sa discipline) ; k : ce que vaut une heure de travail
export const GRADES=[{name:'Assistant',xp:0,k:.6},{name:'Chercheur',xp:25,k:1},{name:'Chercheur confirmé',xp:70,k:1.35},{name:'Maître de recherche',xp:160,k:1.7},{name:'Sommité',xp:320,k:2.1}];
export const gradeOf=xp=>{let g=0;for(let i=0;i<GRADES.length;i++)if(xp>=GRADES[i].xp)g=i;return g;};

// Les caractères : deux par savant, tirés à sa sortie d'école. Les effets sont des multiplicateurs (1 = rien).
//  work : tout le travail · exp : au laboratoire et à l'atelier pilote · eur : les eurêkas · acc : les accidents · meet : en réunion · chat : dans une
//  équipe de trois ou plus · alone : seul sur son projet · teach : les élèves au centre · night : travaille la nuit · fat : fatigue · perc : percée
//  idea : propositions · aff : entente de départ avec les autres · rival : piqué par un rival · mor : le moral revient · team : moral de l'équipe
export const TRAITS={
  distrait:{name:'Génie distrait',text:'Des éclairs de génie : deux fois plus d’eurêkas, mais il avance un peu moins vite.',eur:2,work:.9},
  methodique:{name:'Méthodique',text:'Il avance régulièrement (+15 %) ; peu d’eurêkas, deux fois moins d’accidents.',work:1.15,eur:.5,acc:.5},
  audacieux:{name:'Audacieux',text:'Expériences menées tambour battant (+25 % au laboratoire et à l’atelier pilote), mais deux fois plus d’accidents.',exp:1.25,acc:2},
  prudent:{name:'Prudent',text:'Trois fois moins d’accidents ; un peu plus lent aux expériences.',acc:.33,exp:.9},
  bavard:{name:'Bavard',text:'Les réunions vont moitié mieux avec lui ; dans une grande équipe, il fait perdre un peu de temps.',meet:1.5,chat:.94},
  solitaire:{name:'Solitaire',text:'Seul sur un projet, il avance de 30 % plus vite ; en réunion, il se tait.',alone:1.3,meet:.5},
  pedagogue:{name:'Pédagogue',text:'Il enseigne : les élèves du centre apprennent 60 % plus vite quand il y est ; les assistants de son équipe progressent vite.',teach:1.6},
  insomniaque:{name:'Insomniaque',text:'Il travaille la nuit comme le jour, mais se fatigue plus vite.',night:1,fat:1.4},
  perfectionniste:{name:'Perfectionniste',text:'Deux fois plus de chances d’une percée à la fin d’un projet ; un peu plus lent.',perc:2,work:.92},
  reveur:{name:'Rêveur',text:'Les idées lui viennent : deux fois plus de propositions en remue-méninges, et parfois seul à son bureau.',idea:2},
  ombrageux:{name:'Ombrageux',text:'Il s’entend mal avec ses collègues, mais la rivalité le pique : +10 % quand un rival mène un autre projet.',aff:-.35,rival:1.1},
  optimiste:{name:'Optimiste',text:'Son moral revient vite, et celui de son équipe tient mieux.',mor:2,team:.05},
};
export const TRAIT_KEYS=Object.keys(TRAITS);

// Les réunions : au centre de recherche, autour de la grande table. hours : leur durée ; min : combien de savants au moins
export const MEETINGS={
  remue:{name:'Remue-méninges',hours:2,min:2,text:'Autour de la table, on lance des idées : de nouvelles propositions dans les disciplines des présents (les rêveurs et les bavards en apportent davantage). Les projets des présents attendent deux heures.'},
  point:{name:'Point d’avancement',hours:1,min:1,project:true,text:'L’équipe d’un projet fait le point : un blocage saute le plus souvent, le moral remonte, le chef d’équipe apprend.'},
  colloque:{name:'Colloque',hours:3,min:3,text:'Des savants de disciplines différentes exposent leurs travaux : de l’expérience pour tous, des idées à la croisée des disciplines, et l’on apprend à s’entendre.'},
  seminaire:{name:'Séminaire',hours:2,min:2,text:'Les anciens enseignent aux jeunes : les assistants et les chercheurs gagnent de l’expérience, d’autant plus que les maîtres sont gradés (et pédagogues).'},
};

// Ce qu'on entend dans la vue recherche (bulles au-dessus des savants)
export const SAYS={
  agro:['Le blé aime le salpêtre.','Une rotation sur trois ans…','Regardez ces racines !','Trop d’eau, pas assez de soleil.','Et si on croisait ces deux blés ?'],
  geo:['Cette veine plonge au nord.','Du quartz… le filon n’est pas loin.','Il faut étayer, et vite.','Ce caillou a une histoire.','La roche chante sous le marteau.'],
  meca:['Il faut une came, ici.','Moins de frottement, plus de rendement.','On démonte et on recommence.','Ce boulon ne vaut rien.','Un levier, et je soulève la caserne !'],
  chimie:['Et si on doublait le salpêtre ?','Ça mousse… c’est normal ?','Notez : ne pas respirer.','Trois gouttes, pas quatre !','Ça sent le soufre.'],
  balist:['La courbe tombe trop vite.','Corrigeons la hausse.','Huit cents mètres par seconde !','Le vent, toujours le vent.','Une demi-graduation de plus.'],
  medecine:['Lavez-vous les sabots !','La plaie doit rester propre.','Le pouls revient !','Il faut du sang, beaucoup.','Moins de fièvre ce matin.'],
  remue:['J’ai une idée !','Et pourquoi pas ?','Ça ne marchera jamais.','Attendez, attendez…','Et si on retournait le problème ?','Meuh… intéressant.'],
  point:['Où en est-on ?','On est bloqués là-dessus.','Il faut tout reprendre.','On avance, doucement.','Qui s’occupe des mesures ?'],
  colloque:['Dans ma discipline, on dirait…','Votre courbe ressemble à la mienne !','Question de la salle !','Applaudissons.','C’est passionnant.'],
  seminaire:['Retenez bien ceci.','Qui peut me dire pourquoi ?','Au tableau !','Prenez des notes.','Bonne question.'],
  ecole:['Recopiez la formule.','Encore une fois, lentement.','Silence dans les rangs !','Qui a fini ?'],
  cafe:['Encore un café ?','Tu as vu la nouvelle hotte ?','Meuh.','On devrait parler à la direction.','Il pleut encore.','Tu dors bien, toi ?'],
  eureka:['Eurêka !','Ça y est !','Je l’ai !','Mais oui, bien sûr !'],
  accident:['Tout le monde dehors !','Ça a sauté !','Mes sourcils !','Ouvrez les fenêtres !'],
  bloque:['Ça ne veut pas marcher…','On tourne en rond.','Rien ne se reproduit.'],
  dort:['Zzz…'],
  oisif:['Que fait-on, maintenant ?','Un projet, vite !','Je relis mes notes.'],
};
