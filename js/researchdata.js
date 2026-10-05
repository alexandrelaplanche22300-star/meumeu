// La recherche (V12.7) : les données. Trois métiers (techaxes.ROLES), leurs bâtiments, les grades, les réunions de programme, les répliques.
// La simulation est dans research.js ; les axes de l'état de l'art, l'analyse des conceptions et les leviers des savants dans techaxes.js.
export {ROLES} from './techaxes.js';

// le bâtiment → le métier qui y travaille, et combien de savants y tiennent
export const LAB_KIND={centre_recherche:'physicien',labo:'chimiste',armurerie:'ingenieur'};
export const LAB_SEATS={centre_recherche:10,labo:6,armurerie:5};
// l'idée d'un ouvrier (INNOV, la pratique) : le métier qui la mène
export const DOM_ROLE={bois:'ingenieur',pierre:'ingenieur',vivres:'chimiste',mine:'ingenieur',atelier:'ingenieur',logistique:'ingenieur',construction:'ingenieur',
  armement:'ingenieur',tir:'physicien',defense:'ingenieur',soins:'chimiste',chimie:'chimiste'};

// les grades, selon l'expérience (heures de travail) ; k : ce que vaut une heure de travail
export const GRADES=[{name:'Assistant',xp:0,k:.6},{name:'Chercheur',xp:25,k:1},{name:'Chercheur confirmé',xp:70,k:1.35},{name:'Maître de recherche',xp:160,k:1.7},{name:'Sommité',xp:320,k:2.1}];
export const gradeOf=xp=>{let g=0;for(let i=0;i<GRADES.length;i++)if(xp>=GRADES[i].xp)g=i;return g;};

// les réunions d'un programme : la présentation de la conception, les revues d'avancement, la revue finale (après l'essai), la revue de variantes.
// Les phases (research.js) : rassemblement, tour de table, propositions, débat, puis la décision du commandement par vagues. wait : heures que les
// savants attendent à la table la décision du commandement (ils griffonnent) avant que le chef de projet ne garde la conception telle quelle
export const MEETINGS={
  lancement:{name:'Réunion de lancement',wait:6,text:'L’équipe du bureau d’études présente la conception ; les spécialistes font leurs premiers calculs au tableau et proposent. Le commandement retient, la conception change, on rediscute.'},
  revue:{name:'Revue d’avancement',wait:5,text:'Où en est-on : les tâches faites, ce qu’on a mesuré de ce qu’on avait annoncé, ce qui bloque ; les pistes mûries dans les carnets.'},
  finale:{name:'Revue finale',wait:5,text:'L’essai de tir est fait : les résultats, les derniers raffinements. Sans changement, la conception est prête : au commandement de la déclarer terminée.'},
  variante:{name:'Revue de variantes',wait:8,text:'L’arme est en service ; l’équipe a continué d’y penser. Ce que le commandement retient devient un prototype (Mk 2, Mk 3…), l’arme adoptée reste en fabrication.'},
};
// les phases d'une réunion, dans l'ordre
export const MEET_PHASES={rassemblement:'On se rassemble',tour:'Tour de table',propositions:'Propositions',debat:'Débat',decision:'Décision du commandement',application:'On redessine'};

// les blocages d'une tâche, selon son axe (sinon le générique)
export const BLOCKS={tube:['le tube gonfle à l’épreuve','une fissure à la chambre'],calibre:['le tour broute à ce diamètre','l’alésage n’est pas droit'],charge:['la poudre colle au fond de l’étui','les pressions mesurées dérivent'],
  mecanisme:['la culasse ne se verrouille pas toujours','l’extracteur arrache le culot'],cadence:['le mécanisme s’emballe','le ressort casse à la millième'],explosif:['la charge se fendille en séchant','des bulles dans la coulée'],
  remplissage:['le composé suinte','il ne détone pas franchement'],fusee_obus:['la fusée part au départ du coup','elle ne s’arme pas'],portee:['la table ne colle pas aux tirs','la dérive est inexpliquée'],
  moteur:['le grain se fissure','la tuyère fond'],guidage:['la toupie dérive','l’axe oscille'],essai:['le prototype s’enraye à l’essai','la dispersion est trop forte'],
  _:['les mesures se contredisent','il manque une pièce','on tourne en rond']};

// les répliques du quotidien (les pensées de travail viennent des tâches elles-mêmes : techaxes.thinkOf)
export const SAYS={
  ecole:['Recopiez la formule.','Encore une fois, lentement.','Qui peut me dire pourquoi ?','Au tableau !'],
  oisif:['Que fait-on, maintenant ?','Un programme, vite !','Je relis les rapports d’essai.','Si seulement on avait des plans…'],
  cafe:['Encore un café ?','Tu as vu l’essai d’hier ?','Meuh.'],
  eureka:['Eurêka !','Ça y est !','Je l’ai !','Mais oui, bien sûr !'],
  accident:['Tout le monde dehors !','Ça a sauté !','Mes sourcils !','Ouvrez les fenêtres !'],
  dort:['Zzz…'],
  attente:['On attend la décision.','Le commandement viendra-t-il ?'],
};
