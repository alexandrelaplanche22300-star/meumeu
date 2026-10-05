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
  lancement:{name:'Réunion de lancement',wait:6,text:'L’équipe du bureau d’études présente la conception ; les spécialistes font leurs premiers calculs au tableau et proposent. La reine retient, la conception change, on rediscute.'},
  revue:{name:'Revue d’avancement',wait:5,text:'Où en est-on : les tâches faites, ce qu’on a mesuré de ce qu’on avait annoncé, ce qui bloque ; les pistes mûries dans les carnets.'},
  finale:{name:'Revue finale',wait:5,text:'L’essai de tir est fait : les résultats, les derniers raffinements. Sans changement, la conception est prête : à la reine de la déclarer terminée.'},
  variante:{name:'Revue de variantes',wait:8,text:'L’arme est en service ; l’équipe a continué d’y penser. Ce que la reine retient devient un prototype (Mk 2, Mk 3…), l’arme adoptée reste en fabrication.'},
};
// les phases d'une réunion, dans l'ordre
export const MEET_PHASES={rassemblement:'On se rassemble',tour:'Tour de table',propositions:'Propositions',debat:'Débat',decision:'Décision de la reine',application:'On redessine'};

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
  attente:['On attend la décision.','La reine viendra-t-elle ?'],
};
// LES CONVERSATIONS (V12.7) : ce que les savants se disent au travail (leurs essais, leurs idées, leurs doutes, leurs conclusions — tirés de leurs
// vraies pistes), à la pause, et en réunion (pour introduire, réagir, s'adresser à la reine). Les champs : {a} celui qui parle, {b} celui à qui
// il parle, {c} un collègue, {tried} l'essai (« le pas de rayure 11,0 → 6,2 cm »), {val} la valeur seule (« 6,2 cm »), {fx} son effet,
// {fxb} ce que l'autre en voit dans son domaine, {metric} une grandeur, {goal} le but (« la stabilité »), {why} la raison, {prog} le programme,
// {n} le nombre d'essais, {best} ce qu'il retient, {lever} un levier, {left} des heures, {block} un blocage. Une entrée s'ajoute en une ligne.
export const TALK={
  // au travail : un calcul, et ce qui s'ensuit
  essai:['{tried}… {fx}.','Je tente {tried}.','Voyons : {tried}. {fx}.','Et si je mettais {val} ?','Calcul n° {n} : {tried}.','J’ai refait le calcul : {tried} — {fx}.','Je reprends à {val}… {fx}.','Encore un : {tried}.','Bon, {val}. On mesure.','Essai {n} : {val}. Alors… {fx}.'],
  essai_banc_chimiste:['Pesée faite : {tried}, {fx}.','Au banc : {val}. Résultat : {fx}.','J’ai brûlé un échantillon : {val}… {fx}.','Le manomètre dit : {fx}, avec {val}.','Éprouvette n° {n} : {val}. {fx}.'],
  essai_banc_ingenieur:['Sur le marbre : {val}. {fx}.','J’ai tourné une pièce d’essai : {val}… {fx}.','À l’établi : {tried}. {fx}.','Maquette refaite à {val} : {fx}.'],
  essai_banc_physicien:['Au tableau : {tried}. {fx}.','La table de tir dit : {fx}, avec {val}.','J’ai refait l’intégrale : {val}… {fx}.','Trajectoire recalculée à {val} : {fx}.'],
  mieux:['Mieux !','Ah ! Ça s’améliore.','Voilà qui est encourageant.','C’est le meilleur jusqu’ici.','Ça tient !','Je le savais !','Oh, intéressant…','On progresse.','Enfin !','Ça monte, ça monte !'],
  pire:['Non… pire.','Raté. Je reviens en arrière.','Hmm, ça ne marche pas comme prévu.','Fausse piste.','Ce n’est pas ça.','Zut. On efface.','Ça empire. Dans l’autre sens, alors.','Rien de mieux.','Bof.','Je m’égare.'],
  question:['Et {metric}, tu y as pensé ?','Tu as regardé {metric} ?','Ton affaire, elle ne change pas {metric} ?','Et {metric}, ça bouge ?'],
  question_etat:['Montre-moi tes chiffres.','Tu en es où, {a} ?','Combien d’essais déjà ?','Tu as vérifié deux fois ?','C’est pour « {prog} » ?','Tu es sûr de ta formule ?','Ça avance ?'],
  reponse_etat:['{n} essais, et je cherche encore.','J’avance : {fx}.','Presque. Encore un ou deux calculs.','Oui, pour « {prog} ».','Tiens, regarde : {tried}.','Sûr ? Non. Mais les chiffres sont bons.','Ça avance. Lentement.'],
  objecte:['Attention : chez moi, {fxb}.','Ça m’inquiète pour {metric} : {fxb}.','Mes calculs disent {fxb}. Tu es sûr ?','{fxb}… ça va coincer, {a}.','Je regarde de mon côté : {fxb}. Pas terrible.'],
  repond_ok:['Oui, j’ai vérifié : ça tient.','Je compenserai.','Le jeu en vaut la chandelle.','C’est le prix à payer.','Je note.','Oui, oui, j’y ai pensé.','Je sais. Je cherche encore.','Tu verras à la réunion.'],
  repond_doute:['Hmm… je n’avais pas vu ça.','Tu as raison, je reprends.','Je vais revoir mes chiffres.','Aïe. Merci de me le dire.','Ah. Ça change tout.','Bon sang, tu as raison.'],
  console:['Courage.','Ça viendra.','Essaie dans l’autre sens.','Tu y es presque.','Une impasse de moins.','Note-le quand même : c’est un résultat.','Moi, j’en suis à mon dixième raté.'],
  encourage:['Pas mal !','Joli !','Continue comme ça.','Bien vu.','Ça, c’est du travail.','La reine sera contente.','Tu vas y arriver.','Ça sent la bonne idée.'],
  conclut:['Bon. {best}.','J’ai fini : {best}. C’est le meilleur de tout ce que j’ai essayé.','Après tous ces calculs, ma conclusion : {best}.','Je tiens quelque chose. {best}.','Voilà. {best}. Je ne ferai pas mieux.'],
  conclut_rep:['Présente-la à la prochaine réunion !','À la réunion, alors.','La reine va adorer.','Il faudra le prouver à l’essai.','Je vérifierai tes chiffres, si tu veux.','Bravo, {a}.','Enfin une bonne nouvelle.','Note tout dans ton carnet.'],
  idee:['J’ai une idée pour « {prog} » : {goal}.','Écoute : {why}. Il faut s’attaquer à {goal}.','Je pense à {goal}, pour « {prog} ».','Ce matin, une idée : {goal}… {why}.','Je ne peux pas laisser passer ça : {why}.','Il y a un problème avec « {prog} » : {why}.'],
  idee_rep:['Raconte !','Encore une idée ?','Vas-y, je t’écoute.','Ça me paraît prometteur.','Hmm. Méfie-toi de la pression.','Bonne chance !','Tu penses à quel levier ?','C’est ton métier, pas le mien !'],
  idee_radicale:['J’ai une idée folle : tout revoir pour {goal}.','Et si on changeait tout ? {why}.','Une refonte, voilà ce qu’il faut. Pour {goal}.','Oublions le dessin d’origine : {goal} d’abord.'],
  idee_radicale_rep:['Tu es fou !','Audacieux… pourquoi pas.','La reine n’aimera pas ça. Ou peut-être que si.','Tout revoir ? Diable.','J’aime ton culot.'],
  intuition:['Je ne sais pas pourquoi, mais je sens quelque chose du côté de {goal}.','Une intuition : {goal}.','Rien ne le demande, mais je vais regarder {goal}.'],
  impasse:['Je n’arrive à rien sur {goal}.','Impasse. J’abandonne {goal}.','Ça ne mène nulle part.','{n} essais pour rien.','Mon métier n’y peut rien, je crois.'],
  impasse_rep:['Ça arrive.','Essaie autre chose.','Courage.','On a tous des impasses.','Demain sera meilleur.','Laisse reposer, ça reviendra.'],
  inspire:['Ton idée m’a donné une piste, {b} : {why}.','{b}, à cause de toi, je cherche maintenant {goal} !','J’ai vu ton calcul, {b}. Je cherche à compenser.'],
  inspire_rep:['Content de t’avoir inspiré.','À ton service.','On fera équipe, alors.','Tiens-moi au courant.'],
  rival:['Encore toi, {b} ?','Tes chiffres sont faux, {b}.','On verra bien qui a raison à la réunion.','Toujours à objecter, hein…','Laisse-moi travailler, {b}.'],
  rival_rep:['Je ne fais que mon métier.','Les chiffres ne mentent pas.','Tu me remercieras.','Hmpf.'],
  ami:['Bien vu, {b} !','Merci, {b}.','On forme une bonne équipe.','Toi, au moins, tu comprends.','{b}, tu as un instant ? J’aimerais ton avis.'],
  monologue:['Voyons… {tried}…','Si je change {lever}…','Hmm. {fx}…','Encore un essai.','Où est mon crayon ?','Les chiffres ne mentent pas.','Recommençons.','Et si… non.','Un, deux, trois… {val}.','Il faut que ça tombe juste.'],
  // la pause, la vie
  cafe:['Tu as vu l’essai d’hier ?','Encore un café ?','Il paraît que {c} a trouvé quelque chose.','La reine viendra à la réunion, tu crois ?','J’ai rêvé de balistique cette nuit.','Qui a pris ma règle à calcul ?','Meuh.','On avance, on avance…','Tu dors, toi, la nuit ?','Le tableau est plein de craie.','Les Bèè n’ont pas de savants, eux.','Mon foin est froid.','Tu as lu le rapport d’essai ?','J’ai mal au cou à force d’écrire.'],
  cafe_prog:['« {prog} » avance bien.','Pour « {prog} », il reste {left} heures de travail.','« {prog} » est bloqué : {block}.','On attend la réunion pour « {prog} ».','« {prog} » : la reine doit trancher.','Tu crois que « {prog} » ira au front ?','Le dessin de « {prog} » me plaît.'],
  cafe_rep:['Oui.','Hmm.','Ah bon ?','On verra.','C’est bien.','Pas facile.','Meuh !','Sans doute.','Tu crois ?','Il faudrait demander à la reine.'],
  // la réunion
  ouvre_prop:['Bien. Passons aux propositions.','Qui commence ?','À vous, les chercheurs.','Les propositions, maintenant.'],
  ouvre_prop_reine:['Majesté, voici ce que nous proposons.','Majesté, nos propositions.','Si Votre Majesté le permet, nos propositions.'],
  prefixe:[['Euh… si je peux me permettre, j’ai trouvé quelque chose :','Je ne suis qu’assistant, mais :','J’ai peut-être une idée :','Je… j’ai fait un calcul :'],
    ['J’ai une proposition :','Voici ce que je propose :','J’ai travaillé là-dessus :','Écoutez ça :'],
    ['Après plusieurs nuits de calculs, je propose :','J’ai longuement vérifié :','Mes calculs me mènent à ceci :','Je propose, chiffres à l’appui :'],
    ['Mes calculs sont formels :','Je l’affirme :','Écoutez bien :','Il n’y a pas trente-six solutions :'],
    ['Mes chers collègues, j’ai la solution :','Croyez-en mon expérience :','Voici, simplement, ce qu’il faut faire :']],
  prefixe_equipe:['Notre équipe propose, après maintes réflexions :','Le bureau a planché là-dessus :','Nous avons longuement discuté, et nous proposons :','Toute l’équipe du bureau est d’accord :'],
  prefixe_reine:['Majesté, ','Votre Majesté, '],
  reaction:['Intéressant.','Ça se tient.','Hmm… à voir à l’essai.','Joli travail !','Je n’y avais pas pensé.','Pourquoi pas.','Ça me plaît.','J’ai des doutes.','Brillant !','C’est cher.','Il faudra le prouver.','Simple et efficace.'],
  reaction_radicale:['Audacieux !','Tout revoir ? Diable.','C’est une révolution !','Risqué…','La manufacture va hurler.'],
  objection_pre:['Si je puis me permettre… ','Pardon, mais ','Avec tout le respect que je te dois, ','Un instant : ','Non, attends : '],
  decision_reine:['Sage décision, Majesté.','Bien, Majesté. On redessine.','Merci, Majesté.','À vos ordres, Majesté.','Votre Majesté a l’œil.'],
  decision:['Bien. On redessine.','C’est décidé.','Au travail, alors.'],
  refus:['Dommage… je la retravaillerai.','Tant pis. Une autre fois.','Je reviendrai avec de meilleurs chiffres.','Hmm. J’y croyais.'],
  creuser:['La reine me demande de creuser : je m’y mets.','Je creuserai, Majesté.','Bien, j’approfondis.','Je reviendrai avec plus de calculs.'],
  fin:['La séance est levée.','Chacun à son poste !','Au travail !','Merci à tous.'],
};
// les grandeurs, avec leur article (pour les répliques)
export const METRIC_ART={v0:'la vitesse',range:'la portée',blast:'le souffle',lethal:'les éclats',pen:'la perforation',Sg:'la stabilité',moa:'la dispersion',rk:'le recul',P:'la pression',life:'l’usure du tube',rpm:'la cadence',sustain:'la chauffe',jam:'les enrayages',mass:'la masse',carry:'les munitions portées',cost:'le coût'};
// remplir une réplique : un modèle tiré au hasard (rnd), ses champs
export function talkLine(key,vars,rnd=Math.random){const L=TALK[key];if(!L?.length)return '';const has=t=>[...t.matchAll(/\{(\w+)\}/g)].every(m=>vars[m[1]]!=null&&vars[m[1]]!=='');
  const ok=L.filter(has);if(!ok.length)return '';const t=ok[Math.floor(rnd()*ok.length)];const s=t.replace(/\{(\w+)\}/g,(m,k)=>String(vars[k])).replace(/([.?!…]\s+)([a-zà-öø-ÿ])/g,(m,a,b)=>a+b.toUpperCase());return s.charAt(0).toUpperCase()+s.slice(1);}

