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
  eureka:['Eurêka !','Ça y est !','Je l’ai !','Mais oui, bien sûr !'],
  accident:['Tout le monde dehors !','Ça a sauté !','Ma blouse !','Ouvrez les fenêtres !'],
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
  // la réunion
  presentation_reac:['Belle pièce.','Elle a de l’allure.','Lourde, mais elle portera loin.','J’ai déjà trois idées en l’écoutant.','Les Bèè vont la détester.','On peut faire mieux, et on va le faire.','Ambitieuse. J’aime ça.','Il y a du travail. Tant mieux.'],
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
// davantage de répliques de travail (V12.7, deuxième passe : « plus vivant »)
TALK.essai.push('Allez, encore un : {val}.','Je pousse jusqu’à {val}, pour voir.','Et maintenant {val}. Croisons les sabots.','Petit changement : {tried}.','Je recompte tout avec {val}… {fx}.','Je reviens à {val}. Pour en avoir le cœur net.','Hypothèse n° {n} : {val}.','On ne sait jamais : {val}.');
TALK.mieux.push('Regarde ça ! Regarde !','Ha ! Je le tiens.','C’est beau quand ça marche.','Les chiffres sourient, enfin.','Mieux que ce matin !','Je l’écris tout de suite, avant de l’oublier.','Tu vois ? Il fallait insister.');
TALK.pire.push('Ah non.','Bon. Pas par là.','Je m’attendais à mieux.','La balistique me déteste aujourd’hui.','Ça, c’est une impasse polie.','Pire. Mais j’ai appris pourquoi.','Retour à la case départ.');
TALK.question.push('Tu as pensé à {metric}, au moins ?','Et pour {metric}, ça donne quoi ?','Ça ne va pas abîmer {metric} ?','Je vérifierais {metric}, si j’étais toi.');
TALK.repond_ok.push('J’ai vérifié trois fois.','Ça reste dans les marges.','Je le sais, et je l’accepte.','On en parlera à la réunion.','Je mettrai ça dans ma feuille de calculs.');
TALK.repond_doute.push('Attends, je refais le calcul…','Tu me fais douter, maintenant.','Merci. Vraiment. Je n’avais pas vu.','Bon, retour au tableau.');
TALK.encourage.push('Continue, tu tiens quelque chose.','J’aime bien la direction.','Ça a de l’allure.','Tu as l’œil, toi.','Garde ça pour la réunion !');
TALK.console.push('Les impasses aussi, ça se publie.','Mange un peu de foin, ça ira mieux.','Tu trouveras demain.','Moi, hier, c’était pire.');
TALK.conclut.push('Ma décision est prise : {best}.','J’ai tout essayé. Le meilleur : {best}.','Voilà ma conclusion, chiffres à l’appui. {best}.');
TALK.conclut_rep.push('Montre-la à la reine !','Je la soutiendrai en réunion.','Tu as mérité un café.','Je relis ta feuille ce soir.');
TALK.idee.push('Écoute, j’ai une piste pour « {prog} » : {goal}.','Il faut que je te parle de {goal}. Pour « {prog} ».','Je viens de voir quelque chose : {why}.','Une idée me trotte dans la tête : {goal}.');
TALK.idee_rep.push('Je t’écoute.','Raconte, raconte.','Encore une ? Tu en as trop.','Ça me plaît déjà.','Prends des notes, surtout.');
TALK.monologue.push('Bon. Recommençons depuis le début.','Si la pression monte, alors…','Voyons, voyons…','Je l’ai sur le bout de la langue.','Mmmh. Intéressant.','Où ai-je mis la feuille n° {n} ?');

// LES SCÈNES (V12.7) : de petites conversations où chaque réplique répond à la précédente — à la pause, entre deux calculs, la nuit. Une scène
// est une liste de répliques, dites tour à tour par A et B (« C: » : un troisième, s'il est là ; sinon la réplique est sautée). Les champs :
// {A} {B} {C} les noms de ceux qui parlent, {c} un collègue absent, {prog} un programme, {left} ses heures restantes, {block} ce qui le bloque,
// {last} la dernière proposition retenue par la reine, {arme} la dernière arme adoptée, {grade} le grade de A, {role} le métier de B.
// Un thème ne sert que si tous ses champs sont connus. Une scène s'ajoute en une ligne.
export const SCENES={
  reine:[
    ['La reine viendra à la réunion, tu crois ?','J’espère. Quand elle est là, on ose davantage.','Et quand elle n’est pas là, le chef de projet garde tout comme avant.','Alors il faut des chiffres impeccables pour la faire venir.'],
    ['Tu l’as déjà vue de près, la reine ?','Une fois. Elle a lu mes calculs jusqu’au bout.','Et alors ?','Elle a dit « intéressant ». Je n’ai pas dormi de la nuit.'],
    ['Il paraît que la reine relit toutes les feuilles de calculs.','Toutes ? Même les miennes, avec les ratures ?','Surtout celles-là. Elle aime voir comment on cherche.','Je vais recopier les miennes au propre.'],
    ['Si la reine me demande encore de « creuser »…','C’est bon signe : elle n’a pas dit non.','Ni oui.','C’est ça, la recherche.'],
    ['Tu crois que la reine préfère les idées sages ou les refontes ?','Ça dépend de la guerre.','Et la guerre, ça dépend de nos armes.','Alors on tourne en rond. Encore un café ?','Volontiers. Et après, on sort de ce cercle à coups de calculs.'],
    ['La couronne de la reine, elle est en quel métal, à ton avis ?','En or. Densité dix-neuf virgule trois.','Tu calcules même la couronne de la reine ?','Je calcule tout. C’est mon métier.'],
    ['La reine Meumeu est passée ce matin.','Elle a dit quelque chose ?','« Je veux une arme qui ne laisse aucune chance aux Bèè. »','Alors on n’a pas le droit de se tromper.'],
    ['Tu sais pourquoi la reine assiste à nos réunions ?','Pour nous surveiller ?','Pour choisir elle-même ce qui ira au front.','C’est un honneur. Et une sacrée pression.'],
    ['La reine m’a regardé pendant ma proposition.','Et alors ?','Elle a hoché la tête. Une seule fois.','Une seule fois, venant d’elle, c’est une médaille.'],
    ['Pour la reine : aucune pitié pour les Bèè.','Aucune.','Et pour nos erreurs ?','Encore moins. Alors on vérifie.'],
    ['La reine a dit que la guerre se gagnerait ici, dans nos labos, pas seulement au front.','Elle a raison. Un bon calcul vaut un régiment.','Et un mauvais calcul ?','Un régiment perdu. Voilà pourquoi je recompte.'],
    ['Si la reine retient ma refonte, je la dédierai aux soldats de la passe.','Et si elle la refuse ?','Je la retravaillerai jusqu’à ce qu’elle l’accepte.','Voilà l’esprit des Meumeu.'],
    ['J’ai rêvé que la reine refusait toutes mes propositions.','Et dans la vraie vie ?','Elle en a refusé deux sur trois.','Alors ton rêve était trop pessimiste.'],
  ],
  guerre:[
    ['Je n’aimerais pas être à la place des Bèè, vu ce qu’on leur prépare.','Ils l’ont cherché. Ils ont brûlé nos fermes.','Avec ce qui sort de nos tables, ils vont comprendre.','Qu’ils comprennent vite, alors.'],
    ['La reine Meumeu nous a dit qu’elle ne veut en laisser aucun en vie.','Elle l’a dit comme ça ?','Mot pour mot. Et elle n’a même pas cligné des yeux.','Alors au travail : nos armes doivent être à la hauteur de ses ordres.'],
    ['Tu penses aux soldats, parfois, quand tu calcules ?','Tout le temps. Chaque mètre de portée, c’est un Meumeu qui rentre chez lui.','Et chaque éclat de plus, un Bèè qui ne revient pas.','C’est la guerre. Ce sont eux qui l’ont voulue.'],
    ['J’ai hâte de voir nos obus tomber sur leurs tranchées.','Moi aussi. Mais d’abord, qu’ils tombent au bon endroit.','Ça, c’est ton travail.','Et le tien de les rendre plus méchants. Marché conclu.'],
    ['Mon cousin est au front.','Alors on travaille aussi pour lui.','Il écrit que les Bèè tremblent quand nos fusils parlent.','Ils trembleront davantage avec les prochains.'],
    ['Tu crois qu’on gagnera la guerre ?','On a la reine, la science et la rancune. Eux n’ont que des cornes.','Les cornes, ça fait mal quand même.','Pas autant qu’un obus fusant au-dessus de leurs têtes.'],
    ['La reine veut des armes qui font peur.','Peur ? Moi je veux qu’elles les fassent fuir.','Fuir, c’est bien. Ne pas revenir, c’est mieux.','C’est exactement ce que la reine a dit.'],
    ['Il paraît que les Bèè copient nos fusils.','Avec des années de retard.','Alors changeons de conception plus vite qu’ils ne copient.','C’est exactement ce qu’on fait ici, jour et nuit.'],
    ['Si on leur envoyait tout ce qu’on a, d’un seul coup ?','La reine attend le bon moment.','Elle attend surtout nos armes.','Alors ne la faisons pas attendre. Au tableau.'],
    ['J’ai vu les blessés revenir du front ce matin.','Moi aussi.','C’est pour eux que je refais mes calculs trois fois.','Refais-les une quatrième. Ils le méritent.'],
    ['Vengeance pour la ferme de la colline.','Vengeance, oui. Mais avec des chiffres justes.','Une vengeance mal calculée, c’est un obus dans nos propres lignes.','Tu as raison. Je vérifie encore.'],
    ['Quand la guerre sera finie, tu feras quoi ?','Je calculerai la trajectoire des fleurs.','Les fleurs n’ont pas de trajectoire.','Si on les lance assez fort, si.'],
    ['La reine dit que chaque Bèè abattu est une victoire de la science.','Alors la science a déjà gagné quelques batailles.','Il en reste beaucoup à gagner.','On les gagnera une par une. Calcul par calcul.'],
    ['Les Bèè ont attaqué une de nos mines cette nuit.','Encore ?','Six mineurs blessés.','Alors il nous faut une arme qui les arrête avant qu’ils approchent. Je m’y mets.'],
    ['Tu as vu leur artillerie ? Des tubes de fonte, montés à la va-vite.','Elle tire quand même.','Pas longtemps. Nos tubes tiennent deux fois plus.','Et nos obus portent deux fois plus loin.'],
    ['Je rêve du jour où les Bèè demanderont la paix.','La reine ne la leur accordera pas.','Tu crois ?','Elle l’a dit : aucune pitié.'],
    ['Notre mitrailleuse a tenu la passe tout seule, hier.','Trois cents Bèè, paraît-il.','Et pas un n’est passé.','Voilà à quoi servent nos calculs de chauffe.'],
    ['Tu crois que les Bèè savent qu’on existe, nous, les savants ?','Ils le sauront quand nos armes arriveront.','Ils ne connaîtront jamais nos noms.','Tant mieux. Ils connaîtront nos obus.'],
    ['La guerre ne finira pas toute seule.','Non. Elle finira quand nos armes l’auront finie.','Alors chaque heure ici compte.','Chaque heure, et chaque essai.'],
    ['J’ai envie d’en finir, avec ces chèvres.','Moi aussi. Mais on en finira proprement : avec la meilleure arme possible.','Proprement ?','Pour nous. Pas pour eux.'],
  ],
  apres_reunion:[
    ['La reine a retenu : {last}.','J’en étais sûr. Les chiffres étaient trop beaux.','Il faudra le prouver à l’essai.','On le prouvera.'],
    ['Tu as vu ? « {last} ». Adopté par la reine !','Mes collègues vont être jaloux.','C’était ton idée ?','Disons… que j’y ai contribué.'],
    ['Après « {last} », tout est à recalculer.','Encore ? J’avais fini mes tables.','Bienvenue dans la recherche.','Je déteste et j’adore ce métier.'],
    ['« {last} »… je n’aurais pas osé le proposer.','Il fallait oser. La reine aime les savants courageux.','Et si l’essai rate ?','On aura appris quelque chose. C’est déjà ça.'],
    ['Pas mal, la séance d’hier.','Tu trouves ? On s’est disputés une heure sur la pression.','Justement : c’est comme ça qu’on avance.','C:Moi j’ai surtout retenu qu’il faut des biscuits pendant les réunions.'],
  ],
  prog:[
    ['Où en est « {prog} » ?','Il reste {left} de travail.','Avec nous deux, on y arrivera.','Avec nous deux et beaucoup de café.'],
    ['« {prog} », c’est la plus belle conception qu’on ait eue.','Tu dis ça à chaque fois.','Cette fois c’est vrai.','Tu dis ça aussi à chaque fois.'],
    ['Tu crois que « {prog} » ira au front ?','Si l’essai de tir est bon, oui.','Et s’il ne l’est pas ?','Alors on recommence. La reine nous fait confiance.'],
    ['J’ai refait les comptes pour « {prog} » : {left}.','Ça fait combien de nuits ?','Trop.','Alors on dort, et on reprend demain.'],
    ['Le dessin de « {prog} » est magnifique.','Le dessin, oui. Il faut encore qu’il tire droit.','Ça, c’est ton problème.','Non : le nôtre.'],
    ['Pour « {prog} », je propose qu’on se répartisse les calculs.','Je prends la trajectoire.','Je prends la poudre.','C:Et moi le café. Quelqu’un doit bien s’en occuper.'],
  ],
  bloque:[
    ['« {prog} » est bloqué : {block}.','Encore ?','Encore. J’ai tout vérifié deux fois.','Une revue, voilà ce qu’il faut. Tout le monde autour de la table.'],
    ['{block}… je n’ai jamais vu ça.','Montre-moi.','Là, regarde la courbe.','Ah. Oui. Bon. On va avoir besoin d’un regard neuf.'],
  ],
  adoptee:[
    ['« {arme} » est en fabrication à la manufacture !','Nos peluches vont enfin avoir une vraie arme.','Et les Bèè vont s’en souvenir.','C:Mais elle n’est pas parfaite. J’ai déjà trois idées de variantes.'],
    ['Tu as vu « {arme} » sortir de la manufacture ?','J’ai pleuré un peu.','Moi aussi. Mais ne le dis à personne.','Promis.'],
  ],
  beee:[
    ['Les Bèè n’ont pas de savants, eux.','Ils ont des cornes et de la rancune.','Nous, on a des calculs.','Et la reine.'],
    ['Il paraît que les Bèè ont attaqué une mine cette nuit.','Raison de plus pour finir nos programmes.','Tu crois que nos calculs sauvent des vies ?','J’en suis sûr. Chaque millimètre de dispersion compte.'],
    ['Qu’est-ce que tu ferais si les Bèè entraient dans le centre ?','Je cacherais mes carnets.','Pas toi d’abord ?','Les carnets d’abord. Moi, je suis en peluche, je rebondis.'],
    ['Les chèvres ont des fusils, maintenant.','Des fusils copiés sur les nôtres, avec dix ans de retard.','Alors gardons dix ans d’avance.','Au travail.'],
  ],
  nuit:[
    ['Tu ne dors pas ?','Je n’arrive pas à arrêter de calculer.','Moi non plus. Ma tête fait des tables de tir.','Bon. Puisqu’on est là, on vérifie tes chiffres ?','Allez. Mais après, au lit — la reine veut des savants réveillés.'],
    ['Il est tard.','Encore une colonne et je vais me coucher.','C’est ce que tu as dit il y a trois colonnes.','Il y a beaucoup de colonnes.'],
    ['Chut. Tout le monde dort.','Sauf nous et la lampe.','Et les équations.','Les équations ne dorment jamais.'],
  ],
  vie:[
    ['Encore un café ?','Mon troisième. Je vais vibrer comme un tube trop mince.','Une paroi plus épaisse, alors ?','Très drôle.'],
    ['Qui a pris ma règle à calcul ?','C:Pas moi.','Pas moi non plus.','Elle n’est quand même pas partie toute seule !','C:… Elle est dans ta poche de blouse.'],
    ['Mon foin est froid.','Tu le laisses refroidir à chaque fois que tu calcules.','Les calculs ne refroidissent pas, eux.','Bonne remarque. Mange.'],
    ['J’ai mal au cou à force d’écrire.','Lève la tête de temps en temps : le plafond aussi a besoin d’être regardé.','Et le plafond, il calcule ?','Non. C’est pour ça qu’il est reposant.'],
    ['Le tableau est plein de craie.','On efface ?','Jamais ! Il y a peut-être une découverte là-dedans.','Alors on achète un deuxième tableau.'],
    ['J’ai fait un rêve : une balle qui ne tombait jamais.','Ça s’appelle une erreur de calcul.','Dans le rêve, c’était magnifique.','Dans la réalité, c’est la gravité.'],
    ['Tu sais pourquoi on a des cornes ?','Pour accrocher nos blouses ?','Pour avoir l’air sérieux.','C:Moi je m’en sers pour tenir mon crayon.'],
    ['Il pleut.','La pluie fait dériver les balles, tu sais.','Peu.','Peu, c’est déjà trop pour un physicien.'],
    ['J’ai compté : on a écrit quatre cents pages ce mois-ci.','Et combien sont justes ?','Trois cent quatre-vingt-dix-neuf.','Et la dernière ?','C’est la mienne. Je la refais.'],
    ['Tu as vu mon carnet ?','Lequel ? Tu en as six.','Le bleu, avec les taches de café.','Ils ont tous des taches de café.'],
    ['Si on finit tôt, on va voir l’essai de tir ?','Seulement si on se met derrière le mur.','Évidemment, derrière le mur.','Et avec du coton dans les oreilles.'],
    ['Tu as entendu le bruit tout à l’heure ?','C’était le labo. Encore une pesée qui a mal tourné.','Personne n’est blessé ?','Une blouse brûlée, et beaucoup de fierté. Il recommencera demain.'],
  ],
  grade:[
    ['Je suis {grade}, maintenant.','Félicitations ! Tu vas devoir porter une blouse plus longue.','Et diriger des assistants.','C:Moi, je veux bien être dirigé. Tant qu’on m’explique.'],
    ['Comment on devient Sommité, à ton avis ?','En se trompant plus souvent que les autres.','Ça ne devrait pas être l’inverse ?','Non : il faut avoir beaucoup cherché.'],
  ],
  rival:[
    ['Tu as encore objecté à ma proposition, {B}.','Tes chiffres de pression étaient faux.','Ils étaient arrondis !','Arrondis à quarante mégapascals près ?','… Bon. Je les refais.'],
    ['{B}, je t’ai vu sourire quand la reine a refusé mon idée.','Je souriais à cause du café.','Le café n’est pas drôle.','Le tien, si.'],
    ['À la prochaine réunion, je te bats avec mes calculs.','Je t’attends.','Et pas d’objection gratuite.','Seulement les méritées.'],
  ],
  ami:[
    ['Merci pour ton coup de main sur mes tables, {B}.','Tu ferais pareil pour moi.','Je le ferai.','C:Vous deux, vous devriez proposer ensemble à la réunion.'],
    ['On fait équipe pour la prochaine piste ?','Toi la poudre, moi la balle.','Et la reine aura une arme.','Et nous un peu de gloire.'],
  ],
  // le métier de celui qui parle
  metier_chimiste:[
    ['Ça sent le soufre ici.','C’est la poudre lente. Elle sent toujours un peu.','Tu pourrais ouvrir la fenêtre ?','Si j’ouvre, la balance ne pèse plus juste.'],
    ['J’ai réussi un grain qui brûle deux fois moins vite.','Et la pression ?','Elle baisse. La vitesse aussi, un peu.','C’est toujours ça : rien n’est gratuit en chimie.'],
    ['Combien d’explosions tu as eues au labo cette année ?','Trois. Toutes prévues, ou presque.','Et tu continues ?','Chaque explosion m’a appris quelque chose. Les Bèè, eux, n’apprendront rien des nôtres.'],
    ['Le gel incendiaire colle à tout.','Même aux blouses ?','Surtout aux blouses.','On devrait en informer la reine.'],
  ],
  metier_ingenieur:[
    ['Le tour broute encore à ce diamètre.','Change l’outil.','J’ai changé l’outil, le tour, et l’ouvrier.','Alors c’est le métal.'],
    ['Cette culasse se verrouille une fois sur dix mal.','Une fois sur dix, c’est l’enrayage au front.','Je sais. Je lime encore.','Lime, mais mesure entre chaque passe.'],
    ['Tu as vu mon affût ? Il tient trois tonnes.','Il pèse combien ?','… Trois tonnes aussi.','Les servants vont te maudire.'],
    ['Un tube plus long, ça tire plus droit.','Et ça se porte moins bien.','Tout est compromis, ici.','C’est pour ça qu’on est payés.'],
  ],
  metier_physicien:[
    ['J’ai refait l’intégrale de la trajectoire.','Et ?','Six mètres de plus. Six mètres !','Tu sais que les Bèè ne verront pas la différence ?','Ils la sentiront : six mètres de plus, c’est six mètres plus loin de nos soldats.'],
    ['La stabilité de Miller, tu y crois ?','J’y crois tant qu’elle colle aux essais.','Elle colle presque.','Presque, c’est le début d’une découverte.'],
    ['Tu as vu la lunette ×6 ? On compte les cornes des Bèè à trois cents mètres.','Et eux ne nous voient pas venir.','C’est tout l’intérêt.','Alors je veux la même sur toutes nos armes.'],
    ['La dérive, c’est le vent ou la rotation ?','Les deux. Plus la Terre qui tourne.','La Terre aussi ?','À cette distance, tout compte.'],
  ],
};

// les réponses aux répliques qui sont des questions (clé : la réplique telle qu'écrite)
export const ANSWERS={
  'Encore une idée ?':['Oui. Et celle-là, c’est la bonne.','Toujours. C’est mon métier.','La dernière était un essai. Celle-ci est sérieuse.'],
  'Tu penses à quel levier ?':['D’abord {lever}.','Je commence par {lever}, on verra ensuite.','Je ne sais pas encore : je vais tout essayer.'],
  'Qui commence ?':['Moi. J’ai des chiffres frais.'],
};
// une réponse quand une question est restée en l'air
export const REPONSE=['Bonne question. Je te réponds après ce calcul.','Hmm… laisse-moi réfléchir.','Oui, je crois.','Peut-être bien. On verra à l’essai.','Je te montrerai ma feuille.'];
// l'avis qu'on donne quand un collègue montre ses chiffres
export const AVIS=['Ça me paraît bon.','Je pousserais un peu plus loin.','Hmm. Vérifie la pression avant de conclure.','Joli. Continue.','C’est propre. La reine aimera.','Je n’aurais pas osé. Bravo.'];
// une question sur l'avancement d'une piste, et les réponses qui lui vont
export const QA=[
  ['Tu en es où, {a} ?',['Essai {n}. Et ce n’est pas fini.','J’avance : {fx}.','Sur {goal}. Ça résiste.','Presque. Encore un ou deux calculs.']],
  ['Combien d’essais déjà ?',['{n}. Et j’en ferai d’autres.','{n} essais, et je cherche encore.','Je ne compte plus. {n}, je crois.']],
  ['Montre-moi tes chiffres.',['Tiens, regarde : {tried}.','Voilà : {fx}. Qu’est-ce que tu en penses ?','Ils sont dans ma feuille, avec les ratures.']],
  ['Tu as vérifié deux fois ?',['Trois fois.','Sûr ? Non. Mais les chiffres sont bons.','Deux fois. Je vérifierai une troisième.']],
  ['C’est pour « {prog} » ?',['Oui, pour « {prog} ».','Pour « {prog} », bien sûr. Pour qui d’autre ?']],
  ['Tu es sur quoi, là ?',['Sur {goal}.','{goal}, avec {lever}.','Un levier : {lever}. Je le pousse.']],
  ['Tu veux un deuxième avis ?',['Volontiers. Regarde : {tried}.','Plus tard. Je veux d’abord comprendre seul.','Oui ! Je tourne en rond.']],
  ['Ça avance ?',['Ça avance. Lentement.','Oui : {fx}.','Non. Mais je sais pourquoi.']],
];
// les grandeurs, avec leur article (pour les répliques)
export const METRIC_ART={v0:'la vitesse',range:'la portée',blast:'le souffle',lethal:'les éclats',pen:'la perforation',Sg:'la stabilité',moa:'la dispersion',rk:'le recul',P:'la pression',life:'l’usure du tube',rpm:'la cadence',sustain:'la chauffe',jam:'les enrayages',mass:'la masse',carry:'les munitions portées',cost:'le coût'};
// remplir une réplique : un modèle tiré au hasard (rnd), ses champs
export function talkLine(key,vars,rnd=Math.random){const L=TALK[key];if(!L?.length)return '';const has=t=>[...t.matchAll(/\{(\w+)\}/g)].every(m=>vars[m[1]]!=null&&vars[m[1]]!=='');
  const ok=L.filter(has);if(!ok.length)return '';const t=ok[Math.floor(rnd()*ok.length)];const s=t.replace(/\{(\w+)\}/g,(m,k)=>String(vars[k])).replace(/([.?!…]\s+)([a-zà-öø-ÿ])/g,(m,a,b)=>a+b.toUpperCase());return s.charAt(0).toUpperCase()+s.slice(1);}

