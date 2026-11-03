/* Ferrum et Fides : toutes les données du jeu (carte, factions, armes, troupes, histoire, cours).
   Les personnages historiques sont réels ; Raoul le Noir, Mélisende, Zoé, Yusuf, Thorvald,
   la Vipère et les autres héros de l'aventure sont inventés pour le jeu. */
var FF = (function () {
  'use strict';

  // ---------- Projection : la même que la carte d'Imperium (docs/strategie/monde.js) ----------
  var K = 22.8, COS = Math.cos(46 * Math.PI / 180);
  function proj(lon, lat) { return [(lon + 11) * K * COS, (62 - lat) * K]; }

  // ---------- Factions et religions ----------
  var FACTIONS = {
    latins: { nom: 'Latins (croisés)', couleur: '#c0392b', religion: 'catholique', jouable: true,
      bonus: ['⚔️ Charge des chevaliers : +20 % de dégâts au corps à corps (toi et tes troupes).',
        '🛡️ Chevaliers francs recrutables : la meilleure infanterie lourde.',
        '✝️ Ferveur : tes troupes reprennent courage (+15 PV) au début de chaque bataille.'],
      histoire: 'Les « Francs » répondent en 1095 à l\'appel du pape Urbain II à Clermont. Chevaliers de France, de Lotharingie (dont la Belgique actuelle), de Normandie et d\'Italie du Sud partent vers Jérusalem.' },
    romains: { nom: 'Romains (Empire d\'Orient)', couleur: '#7d3c98', religion: 'orthodoxe', jouable: true,
      bonus: ['💰 Trésor de Constantinople : +40 % d\'or gagné, recrues 25 % moins chères.',
        '🔥 Feu grégeois : l\'arme secrète de la flotte, terrible en combat naval.',
        '🪓 Garde varègue et archers toxotai : les meilleures troupes à distance et d\'élite.'],
      histoire: 'Les Byzantins s\'appelaient eux-mêmes « Romains » (Rhomaioi) : leur empire était la suite de l\'Empire romain. L\'empereur Alexis Ier Comnène avait demandé de l\'aide au pape contre les Turcs.' },
    hongrie: { nom: 'Royaume de Hongrie', couleur: '#27ae60', religion: 'catholique' },
    venise: { nom: 'République de Venise', couleur: '#d4ac0d', religion: 'catholique' },
    genes: { nom: 'République de Gênes', couleur: '#e67e22', religion: 'catholique' },
    seldjoukides: { nom: 'Sultanat seldjoukide de Roum', couleur: '#16a085', religion: 'sunnite' },
    emirs: { nom: 'Émirats seldjoukides de Syrie', couleur: '#1abc9c', religion: 'sunnite' },
    fatimides: { nom: 'Califat fatimide', couleur: '#2e86c1', religion: 'chiite' },
    armeniens: { nom: 'Principautés arméniennes', couleur: '#a04000', religion: 'armenienne' },
    abbassides: { nom: 'Califat abbasside', couleur: '#117a65', religion: 'sunnite' },
    cid: { nom: 'Valence du Cid', couleur: '#943126', religion: 'catholique' },
    irlande: { nom: 'Royaumes d\'Irlande', couleur: '#229954', religion: 'catholique' },
    legende: { nom: 'Lieu de légende', couleur: '#f1c40f', religion: 'mystere' },
    // Royaumes et principautés d'Europe en 1096 (souverains réels)
    france: { nom: 'Royaume de France', couleur: '#2e4a9e', religion: 'catholique', royaume: true, souverain: 'Philippe Ier (1060-1108)',
      histoire: 'Le roi Philippe Ier est excommunié pour avoir épousé Bertrade de Montfort : il ne part pas en croisade. Son frère Hugues de Vermandois, lui, prend la croix.' },
    empire: { nom: 'Saint-Empire romain germanique', couleur: '#5d6d7e', religion: 'catholique', royaume: true, souverain: 'Henri IV (1056-1105)',
      histoire: 'L\'empereur Henri IV est en guerre contre le pape (la querelle des Investitures). Godefroy de Bouillon, duc de Basse-Lotharingie, est son vassal.' },
    flandre: { nom: 'Comté de Flandre', couleur: '#1c2833', religion: 'catholique', royaume: true, souverain: 'Robert II (1093-1111)',
      histoire: 'Robert II de Flandre part en croisade et rentre si célèbre qu\'on l\'appelle « Robert de Jérusalem ».' },
    normandie: { nom: 'Duché de Normandie', couleur: '#e59866', religion: 'catholique', royaume: true, souverain: 'Robert Courteheuse (1087-1106)',
      histoire: 'Pour payer sa croisade, Robert Courteheuse met la Normandie en gage chez son frère, le roi d\'Angleterre, contre 10 000 marcs d\'argent.' },
    toulouse: { nom: 'Comté de Toulouse', couleur: '#f39c12', religion: 'catholique', royaume: true, souverain: 'Raymond de Saint-Gilles (1094-1105)',
      histoire: 'Raymond IV, le plus riche des chefs croisés, jure de ne jamais revenir. Il mourra en Orient, devant Tripoli, en 1105.' },
    angleterre: { nom: 'Royaume d\'Angleterre', couleur: '#922b21', religion: 'catholique', royaume: true, souverain: 'Guillaume II le Roux (1087-1100)',
      histoire: 'Fils de Guillaume le Conquérant. Il ne part pas en croisade mais prête l\'argent du voyage à son frère Robert, en échange de la Normandie.' },
    ecosse: { nom: 'Royaume d\'Écosse', couleur: '#5b2c6f', religion: 'catholique', royaume: true, souverain: 'Donald III (1094-1097)',
      histoire: 'Royaume des Gaëls au nord de l\'Angleterre. En 1097, Edgar, aidé par les Anglais, chasse son oncle Donald III.' },
    castille: { nom: 'Royaume de Castille et León', couleur: '#ca6f1e', religion: 'catholique', royaume: true, souverain: 'Alphonse VI (1072-1109)',
      histoire: 'Alphonse VI prend Tolède en 1085, puis est battu par les Almoravides à Sagrajas en 1086. Le pape demande aux Espagnols de rester se battre chez eux.' },
    barcelone: { nom: 'Comté de Barcelone', couleur: '#f5b041', religion: 'catholique', royaume: true, souverain: 'Raimond-Bérenger III (1086-1131)',
      histoire: 'Comté catalan tourné vers la mer. Raimond-Bérenger III deviendra aussi comte de Provence par mariage.' },
    almoravides: { nom: 'Empire almoravide', couleur: '#7e5109', religion: 'sunnite', royaume: true, souverain: 'Youssef ibn Tachfin (1061-1106)',
      histoire: 'Venus du Sahara et du Maroc, les Almoravides traversent le détroit en 1086 et réunissent presque tous les royaumes musulmans d\'Espagne (les taïfas).' },
    saragosse: { nom: 'Taïfa de Saragosse', couleur: '#48c9b0', religion: 'sunnite', royaume: true, souverain: 'Al-Musta\'in II (1085-1110)',
      histoire: 'Dernier grand royaume musulman indépendant d\'Espagne, gouverné par les Banou Houd. Le Cid a servi ses rois avant de prendre Valence.' },
    papaute: { nom: 'États pontificaux', couleur: '#fdfefe', religion: 'catholique', royaume: true, souverain: 'Le pape Urbain II (1088-1099)',
      histoire: 'Urbain II lance la croisade à Clermont en 1095. Il meurt le 29 juillet 1099, deux semaines après la prise de Jérusalem, sans en connaître la nouvelle.' },
    normands: { nom: 'Duché de Pouille (Normands)', couleur: '#b9770e', religion: 'catholique', royaume: true, souverain: 'Roger Borsa (1085-1111)',
      histoire: 'Les fils de Robert Guiscard se partagent l\'Italie du Sud. Bohémond, le demi-frère de Roger Borsa, part en croisade avec ses Normands.' },
    sicile: { nom: 'Comté de Sicile (Normands)', couleur: '#dc7633', religion: 'catholique', royaume: true, souverain: 'Roger Ier (1071-1101)',
      histoire: 'Roger Ier a pris la Sicile aux émirs musulmans (1061-1091). Chrétiens, musulmans et juifs y vivent ensemble ; son armée compte des archers sarrasins.' },
    croatie: { nom: 'Royaume de Croatie', couleur: '#e6b0aa', religion: 'catholique', royaume: true, souverain: 'Petar Snačić (1093-1097)',
      histoire: 'Dernier roi croate. Il meurt en 1097 à la bataille du mont Gvozd contre Coloman de Hongrie, qui devient roi de Croatie en 1102.' },
    boheme: { nom: 'Duché de Bohême', couleur: '#85c1e9', religion: 'catholique', royaume: true, souverain: 'Bretislav II (1092-1100)',
      histoire: 'Duché slave du Saint-Empire. En 1096, les croisés de Pierre l\'Ermite et d\'Emich y massacrent les Juifs de Prague.' },
    pologne: { nom: 'Duché de Pologne', couleur: '#ec7063', religion: 'catholique', royaume: true, souverain: 'Ladislas Ier Herman (1079-1102)',
      histoire: 'Duché des Piasts. Ses fils Zbigniew et Boleslas se disputent déjà le pouvoir.' },
    rus: { nom: 'Rus de Kiev', couleur: '#d35400', religion: 'orthodoxe', royaume: true, souverain: 'Grand-prince Sviatopolk II (1093-1113)',
      histoire: 'Le plus grand pays d\'Europe, chrétien orthodoxe depuis 988. En 1096, les nomades coumans brûlent le monastère des Grottes de Kiev.' },
    danemark: { nom: 'Royaume de Danemark', couleur: '#cb4335', religion: 'catholique', royaume: true, souverain: 'Éric Ier le Bon (1095-1103)',
      histoire: 'Éric le Bon partira lui aussi en pèlerinage vers Jérusalem. Il meurt en chemin, à Chypre, en 1103.' },
    norvege: { nom: 'Royaume de Norvège', couleur: '#1f618d', religion: 'catholique', royaume: true, souverain: 'Magnus III aux Jambes nues (1093-1103)',
      histoire: 'Le dernier grand roi viking : il ravage les Orcades et l\'île de Man, et porte le kilt des Gaëls, d\'où son surnom.' },
    suede: { nom: 'Royaume de Suède', couleur: '#5499c7', religion: 'catholique', royaume: true, souverain: 'Inge l\'Ancien (1079-1110)',
      histoire: 'Royaume encore à moitié païen : le grand temple d\'Uppsala a peut-être été détruit peu avant 1100.' },
    pise: { nom: 'République de Pise', couleur: '#a93226', religion: 'catholique', royaume: true, souverain: 'L\'archevêque Daimbert (1088-1099)',
      histoire: 'Ville de marins rivale de Gênes. Daimbert part en 1098 avec 120 navires pisans et devient patriarche de Jérusalem en 1099.' },
    zirides: { nom: 'Émirat ziride d\'Ifriqiya', couleur: '#76448a', religion: 'sunnite', royaume: true, souverain: 'Tamim ibn al-Muizz (1062-1108)',
      histoire: 'Émirs berbères de Mahdia (Tunisie). En 1087, Pisans et Génois ont pillé leur capitale : une « croisade » avant la croisade.' },
    mossoul: { nom: 'Atabeg de Mossoul', couleur: '#0e6655', religion: 'sunnite', royaume: true, souverain: 'Kerbogha (1096-1102)',
      histoire: 'Kerbogha rassemble une immense armée pour sauver Antioche en 1098. Il est battu par les croisés affamés le 28 juin 1098.' },
    prusses: { nom: 'Tribus prussiennes', couleur: '#7d6608', religion: 'paienne', royaume: true, souverain: 'Pas de roi : des chefs de clan',
      histoire: 'Peuple balte de la côte de l\'ambre. Ils refusent le christianisme : l\'évêque Adalbert de Prague a été tué chez eux en 997.' },
    coumans: { nom: 'Coumans (Kiptchaks)', couleur: '#b9770e', religion: 'paienne', royaume: true, souverain: 'Le khan Boniak (vers 1096)',
      histoire: 'Nomades turcs des steppes. En 1096, Boniak attaque Kiev et pille le monastère des Grottes.' }
  };

  var RELIGIONS = {
    catholique: { nom: 'Chrétiens latins (catholiques)', texte: 'Ils suivent le pape de Rome et prient en latin. Le pape Urbain II lance la croisade en promettant le pardon des péchés à ceux qui partent.' },
    orthodoxe: { nom: 'Chrétiens grecs (orthodoxes)', texte: 'Ils suivent le patriarche de Constantinople et prient en grec. Depuis 1054, ils sont séparés des Latins (le « schisme »), mais restent chrétiens et voisins méfiants.' },
    sunnite: { nom: 'Musulmans sunnites', texte: 'Les Turcs seldjoukides et le calife de Bagdad sont sunnites. En 1096, le monde musulman est divisé : les émirs d\'Alep et de Damas sont rivaux, et les croisés en profitent.' },
    chiite: { nom: 'Musulmans chiites (ismaéliens)', texte: 'Le califat fatimide du Caire est chiite et rival des Seldjoukides sunnites. Les Fatimides reprennent Jérusalem aux Turcs en 1098, un an avant l\'arrivée des croisés.' },
    armenienne: { nom: 'Chrétiens arméniens', texte: 'L\'Église arménienne est l\'une des plus anciennes du monde. À Édesse, le prince arménien Thoros adopte le croisé Baudouin de Boulogne en 1098.' },
    juive: { nom: 'Communautés juives', texte: 'Présentes dans toutes les grandes villes. En 1096, des bandes de la « croisade populaire » massacrent les Juifs de Rhénanie (Mayence, Worms, Cologne) : un des épisodes les plus sombres de cette époque.' },
    copte: { nom: 'Chrétiens coptes', texte: 'Les chrétiens d\'Égypte, très nombreux sous les califes fatimides. Ils prient en copte, la dernière forme de la langue des pharaons, et ont inventé les monastères du désert.' },
    syriaque: { nom: 'Chrétiens syriaques (jacobites)', texte: 'Ils prient en syriaque, une forme de l\'araméen, la langue de Jésus. Nombreux à Édesse, Antioche et Mélitène, ils gardent de grands monastères dans les montagnes du Tour Abdin.' },
    maronite: { nom: 'Chrétiens maronites', texte: 'Montagnards du Liban, disciples de saint Maron. En 1099, des Maronites guident l\'armée des croisés le long de la côte, de Tripoli jusqu\'à Jérusalem.' },
    nestorienne: { nom: 'Église de l\'Orient (nestoriens)', texte: 'Chrétiens d\'Irak et de Perse. Leur chef vit à Bagdad, à côté du calife. Leurs moines ont porté l\'Évangile jusqu\'en Chine et en Inde.' },
    druze: { nom: 'Druzes', texte: 'Une foi née en Égypte vers 1017, à l\'époque du calife fatimide al-Hakim. Ses fidèles se sont réfugiés dans les montagnes du Liban. Depuis 1043, on ne peut plus s\'y convertir : on naît druze.' },
    samaritaine: { nom: 'Samaritains', texte: 'Un tout petit peuple autour de Naplouse. Ils suivent la Torah de Moïse, mais leur montagne sainte est le mont Garizim, pas Jérusalem.' },
    paienne: { nom: 'Anciennes religions (païens)', texte: 'Prusses, Lituaniens, Coumans et une partie des Suédois prient encore les anciens dieux : Perkūnas le dieu du tonnerre, Tengri le Ciel éternel, ou Odin, Thor et Freyr au temple d\'Uppsala.' },
    mystere: { nom: 'Sanctuaires de légende', texte: 'Selon le Codex des Lames, les Forgerons de l\'Aube ont caché les armes des légendes dans des lieux oubliés.' }
  };
  // Détails réels de chaque religion en 1096 : chef, lieu de prière, fêtes, prêtre rencontré en ville
  var REL_INFO = {
    catholique: { icone: '✝️', groupe: 'chretien', chef: 'Le pape Urbain II (1088-1099), à Rome', culte: 'Église, cathédrale et abbaye. Cluny, en Bourgogne, est la plus grande église du monde.', fete: 'Noël, Pâques, la Pentecôte, la Toussaint', pretre: ['Père Lambert', 'Prêtre'] },
    orthodoxe: { icone: '☦️', groupe: 'chretien', chef: 'Le patriarche Nicolas III Grammatikos (1084-1111), à Constantinople', culte: 'Église à coupoles, couverte d\'icônes et de mosaïques d\'or. Sainte-Sophie est la plus grande.', fete: 'Pâques (la plus grande fête), l\'Épiphanie, la Dormition de Marie', pretre: ['Père Nikitas', 'Prêtre orthodoxe'] },
    sunnite: { icone: '☪️', groupe: 'musulman', chef: 'Le calife abbasside al-Mustazhir (1094-1118), à Bagdad. Le vrai pouvoir appartient aux sultans seldjoukides.', culte: 'Mosquée, avec son minaret d\'où l\'on appelle à la prière cinq fois par jour.', fete: 'Le mois du Ramadan, l\'Aïd al-Fitr, l\'Aïd al-Adha, le pèlerinage de La Mecque', pretre: ['Cheikh Hassan', 'Imam'] },
    chiite: { icone: '☪️', groupe: 'musulman', chef: 'Le calife fatimide al-Musta\'li (1094-1101), au Caire, guidé par le vizir al-Afdal. En 1094, les partisans de son frère Nizar ont fait sécession : ce sont les futurs « Assassins » de Hassan Sabbah.', culte: 'Mosquée. Au Caire, la mosquée al-Azhar est aussi une grande école.', fete: 'L\'Aïd, Achoura, la fête de Ghadir Khumm', pretre: ['Cheikh Ali', 'Imam'] },
    armenienne: { icone: '✝️', groupe: 'chretien', chef: 'Le catholicos Grégoire II le Martyrophile (1066-1105)', culte: 'Église de pierre au toit conique, entourée de khatchkars (croix sculptées dans la pierre)', fete: 'Noël le 6 janvier, Vardavar (la fête de l\'eau, en été)', pretre: ['Ter Grigor', 'Prêtre arménien'] },
    juive: { icone: '✡️', groupe: 'juif', chef: 'Pas de chef unique : les rabbins, les académies de Bagdad et l\'exilarque. En Champagne, le grand savant Rachi de Troyes (1040-1105) écrit ses commentaires de la Bible.', culte: 'Synagogue, où l\'on lit la Torah', fete: 'Pessah (la Pâque), Yom Kippour, Hanoucca, le shabbat chaque semaine', pretre: ['Rabbi Yehuda', 'Rabbin'] },
    copte: { icone: '✝️', groupe: 'chretien', chef: 'Le patriarche Michel IV d\'Alexandrie (1092-1102)', culte: 'Église et monastères du désert, comme ceux du Wadi Natroun', fete: 'Noël le 7 janvier, le Nayrouz (nouvel an copte, en septembre)', pretre: ['Abouna Boutros', 'Moine copte'] },
    syriaque: { icone: '✝️', groupe: 'chretien', chef: 'Le patriarche syriaque d\'Antioche, qui vit le plus souvent dans les monastères de Mésopotamie', culte: 'Église et monastères de montagne, comme Mor Gabriel au Tour Abdin (fondé en 397)', fete: 'Pâques, la fête de la Croix', pretre: ['Mor Yaqoub', 'Moine syriaque'] },
    maronite: { icone: '✝️', groupe: 'chretien', chef: 'Le patriarche maronite, caché dans les vallées du Mont-Liban', culte: 'Petites églises et ermitages creusés dans la falaise de la vallée de la Qadisha', fete: 'La Saint-Maron (9 février), Pâques', pretre: ['Père Youssef', 'Prêtre maronite'] },
    nestorienne: { icone: '✝️', groupe: 'chretien', chef: 'Le catholicos Makkikha Ier (1092-1110), à Bagdad', culte: 'Église sans images, avec une grande croix nue', fete: 'Pâques, le jeûne des Ninivites', pretre: ['Mar Isho', 'Prêtre de l\'Église de l\'Orient'] },
    druze: { icone: '🌟', groupe: 'autre', chef: 'Pas de chef unique : les « sages » (uqqal) gardent les livres secrets', culte: 'Khalwa, une maison de prière simple, souvent en haut d\'une colline', fete: 'L\'Aïd al-Adha, prié en secret', pretre: ['Cheikh Sulayman', 'Sage druze'] },
    samaritaine: { icone: '📜', groupe: 'juif', chef: 'Le grand prêtre samaritain, à Naplouse', culte: 'Le mont Garizim, leur montagne sainte, et une petite synagogue', fete: 'La Pâque, sacrifiée sur le mont Garizim', pretre: ['Le prêtre Abisha', 'Prêtre samaritain'] },
    paienne: { icone: '🌳', groupe: 'paien', chef: 'Pas de chef unique : des prêtres, des chamans et les chefs de clan', culte: 'Bois sacrés, pierres et temples de bois. Le grand temple d\'Uppsala avait des statues de Thor, Odin et Freyr.', fete: 'Les fêtes du solstice et des moissons', pretre: ['Le vieux Waidelotte', 'Prêtre des anciens dieux'] },
    mystere: { icone: '✦', groupe: 'autre', chef: 'Les Forgerons de l\'Aube (légende)', culte: 'Forges oubliées', fete: '—' }
  };
  Object.keys(REL_INFO).forEach(function (k) { Object.assign(RELIGIONS[k], REL_INFO[k]); });

  // ---------- Lieux de la carte : [clé, nom, lon, lat, faction, religion, port, région, description] ----------
  var L = [
    ['bruges', 'Bruges', 3.22, 51.21, 'latins', 'catholique', true, 'occident', 'Port de Flandre, riche de la laine et du drap.'],
    ['bouillon', 'Bouillon', 5.07, 49.79, 'latins', 'catholique', false, 'occident', 'Château des Ardennes (Belgique actuelle). Godefroy le met en gage chez l\'évêque de Liège pour payer sa croisade.'],
    ['aix', 'Aix-la-Chapelle', 6.08, 50.78, 'latins', 'catholique', false, 'occident', 'L\'ancienne capitale de Charlemagne. La légende dit que son épée Joyeuse y dort encore.'],
    ['cologne', 'Cologne', 6.96, 50.94, 'latins', 'catholique', false, 'occident', 'Grande ville du Rhin, ravagée en 1096 par les massacres de la croisade populaire.'],
    ['clermont', 'Clermont', 3.08, 45.78, 'latins', 'catholique', false, 'occident', 'Ici, le 27 novembre 1095, le pape Urbain II a appelé à la croisade.'],
    ['ratisbonne', 'Ratisbonne', 12.1, 49.02, 'latins', 'catholique', false, 'occident', 'Ville du Danube où passent les armées vers l\'est.'],
    ['hongrie', 'Esztergom', 18.74, 47.79, 'hongrie', 'catholique', false, 'hongrie', 'Capitale du roi Coloman de Hongrie, qui se méfie des croisés après les pillages de la croisade populaire.'],
    ['belgrade', 'Belgrade', 20.46, 44.82, 'romains', 'orthodoxe', false, 'balkans', 'Porte de l\'Empire romain d\'Orient sur le Danube.'],
    ['nis', 'Niš', 21.9, 43.32, 'romains', 'orthodoxe', false, 'balkans', 'Ville byzantine sur la route militaire vers Constantinople.'],
    ['sofia', 'Serdica', 23.32, 42.7, 'romains', 'orthodoxe', false, 'balkans', 'L\'actuelle Sofia, ville byzantine des Balkans.'],
    ['andrinople', 'Andrinople', 26.56, 41.68, 'romains', 'orthodoxe', false, 'balkans', 'Grande forteresse byzantine de Thrace.'],
    ['constantinople', 'Constantinople', 28.98, 41.01, 'romains', 'orthodoxe', true, 'balkans', 'La plus grande ville chrétienne du monde, avec Sainte-Sophie et ses murailles géantes.'],
    ['durazzo', 'Dyrrachium', 19.45, 41.32, 'romains', 'orthodoxe', true, 'balkans', 'Port byzantin sur l\'Adriatique, où débarquent les croisés venus d\'Italie.'],
    ['thessalonique', 'Thessalonique', 22.94, 40.64, 'romains', 'orthodoxe', true, 'balkans', 'Deuxième ville de l\'Empire.'],
    ['venise', 'Venise', 12.33, 45.44, 'venise', 'catholique', true, 'occident', 'Ville de marchands sur la lagune, alliée commerciale de l\'Empire.'],
    ['genes', 'Gênes', 8.93, 44.41, 'genes', 'catholique', true, 'occident', 'République de marins. Ses arbalétriers sont célèbres.'],
    ['rome', 'Rome', 12.5, 41.9, 'latins', 'catholique', false, 'occident', 'La ville du pape Urbain II.'],
    ['bari', 'Bari', 16.87, 41.12, 'latins', 'catholique', true, 'occident', 'Port normand des Pouilles d\'où part Bohémond de Tarente.'],
    ['valence', 'Valence', -0.38, 39.47, 'cid', 'catholique', true, 'occident', 'Conquise en 1094 par Rodrigue Díaz, le Cid. Il y règne jusqu\'à sa mort en 1099.'],
    ['dublin', 'Dublin', -6.26, 53.35, 'irlande', 'catholique', true, 'occident', 'Ville irlandaise. On raconte qu\'une lance maudite, Gáe Bolg, est cachée dans les collines.'],
    ['rhodes', 'Rhodes', 28.22, 36.43, 'romains', 'orthodoxe', true, 'mer', 'Île byzantine. En 1099, la flotte romaine y affronte la flotte de Pise.'],
    ['chypre', 'Chypre', 33.03, 34.68, 'romains', 'orthodoxe', true, 'mer', 'Île byzantine qui ravitaille les croisés.'],
    ['nicee', 'Nicée', 29.72, 40.43, 'seldjoukides', 'sunnite', false, 'anatolie', 'Capitale du sultan Kılıç Arslan. Assiégée en mai-juin 1097.'],
    ['dorylee', 'Dorylée', 30.52, 39.78, 'seldjoukides', 'sunnite', false, 'anatolie', 'Plaine où les croisés battent Kılıç Arslan le 1er juillet 1097.'],
    ['iconium', 'Iconium', 32.49, 37.87, 'seldjoukides', 'sunnite', false, 'anatolie', 'L\'actuelle Konya, au cœur de l\'Anatolie turque.'],
    ['antioche', 'Antioche', 36.16, 36.2, 'emirs', 'sunnite', false, 'syrie', 'Énorme ville fortifiée. Le siège dure d\'octobre 1097 à juin 1098.'],
    ['edesse', 'Édesse', 38.79, 37.16, 'armeniens', 'armenienne', false, 'syrie', 'Ville arménienne. Baudouin de Boulogne y fonde le premier État croisé en 1098.'],
    ['alep', 'Alep', 37.16, 36.2, 'emirs', 'sunnite', false, 'syrie', 'Émirat turc de Ridwan, rival de Damas.'],
    ['lattaquie', 'Lattaquié', 35.78, 35.52, 'romains', 'orthodoxe', true, 'syrie', 'Port tenu par la flotte byzantine et des marins venus du Nord.'],
    ['tripoli', 'Tripoli', 35.84, 34.43, 'fatimides', 'chiite', true, 'syrie', 'Riche ville de l\'émir Fakhr al-Mulk, qui paie les croisés pour qu\'ils passent sans l\'attaquer.'],
    ['liban', 'Sanctuaire du Liban', 36.3, 34.1, 'legende', 'mystere', false, 'syrie', 'Dans les montagnes enneigées, la forge oubliée des Forgerons de l\'Aube.'],
    ['acre', 'Acre', 35.08, 32.93, 'fatimides', 'chiite', true, 'syrie', 'Port fortifié de la côte.'],
    ['jaffa', 'Jaffa', 34.75, 32.05, 'fatimides', 'chiite', true, 'syrie', 'Le port de Jérusalem. En juin 1099, des navires génois y apportent le bois des tours de siège.'],
    ['jerusalem', 'Jérusalem', 35.23, 31.78, 'fatimides', 'chiite', false, 'syrie', 'Ville sainte des juifs, des chrétiens et des musulmans. Tenue par les Fatimides depuis 1098.'],
    ['damas', 'Damas', 36.29, 33.51, 'emirs', 'sunnite', false, 'syrie', 'Émirat turc de Duqaq, l\'une des plus vieilles villes du monde.'],
    ['alexandrie', 'Alexandrie', 29.92, 31.2, 'fatimides', 'chiite', true, 'egypte', 'Grand port fatimide et son phare légendaire.'],
    ['bagdad', 'Bagdad', 44.36, 33.31, 'abbassides', 'sunnite', false, 'orient', 'Ville du calife abbasside. Les marchands de la route de la soie y apportent des trésors de Chine.'],
    // Europe des royaumes (1096)
    ['liege', 'Liège', 5.57, 50.63, 'empire', 'catholique', false, 'occident', 'Principauté de l\'évêque Otbert, qui prête l\'argent de la croisade à Godefroy contre le château de Bouillon (Belgique actuelle).'],
    ['paris', 'Paris', 2.35, 48.86, 'france', 'catholique', false, 'occident', 'Ville du roi Philippe Ier, sur la Seine. Ses écoles attirent déjà des étudiants de toute l\'Europe.'],
    ['rouen', 'Rouen', 1.1, 49.44, 'normandie', 'catholique', true, 'occident', 'Capitale du duc Robert Courteheuse, fils aîné de Guillaume le Conquérant.'],
    ['toulouse', 'Toulouse', 1.44, 43.6, 'toulouse', 'catholique', false, 'occident', 'Ville de Raymond de Saint-Gilles, qui part en 1096 avec la plus grande armée de la croisade.'],
    ['londres', 'Londres', -0.12, 51.5, 'angleterre', 'catholique', true, 'nord', 'Grand port sur la Tamise. Guillaume le Roux y fait construire la grande salle de Westminster (1097).'],
    ['dunfermline', 'Dunfermline', -3.46, 56.07, 'ecosse', 'catholique', false, 'nord', 'Résidence des rois d\'Écosse, où repose la reine sainte Marguerite.'],
    ['tolede', 'Tolède', -4.02, 39.86, 'castille', 'catholique', false, 'iberie', 'Ancienne capitale wisigothe prise aux musulmans en 1085. Ses traducteurs passent les livres arabes en latin.'],
    ['cordoue', 'Cordoue', -4.78, 37.88, 'almoravides', 'sunnite', false, 'iberie', 'L\'ancienne capitale du califat d\'al-Andalus, avec sa Grande Mosquée aux mille colonnes. Tenue par les Almoravides.'],
    ['saragosse', 'Saragosse', -0.88, 41.65, 'saragosse', 'sunnite', false, 'iberie', 'Capitale des Banou Houd et de leur palais de l\'Aljaferia.'],
    ['barcelone', 'Barcelone', 2.17, 41.39, 'barcelone', 'catholique', true, 'iberie', 'Port catalan du comte Raimond-Bérenger III.'],
    ['palerme', 'Palerme', 13.36, 38.12, 'sicile', 'catholique', true, 'occident', 'Ville aux mille mosquées devenue normande en 1072. On y parle arabe, grec et latin.'],
    ['knin', 'Knin', 16.2, 44.04, 'croatie', 'catholique', false, 'balkans', 'Forteresse du roi Petar Snačić, dernier roi des Croates.'],
    ['prague', 'Prague', 14.42, 50.08, 'boheme', 'catholique', false, 'est', 'Château des ducs de Bohême, sur la Vltava.'],
    ['cracovie', 'Cracovie', 19.94, 50.06, 'pologne', 'catholique', false, 'est', 'Capitale des ducs de Pologne, au pied du château du Wawel.'],
    ['kiev', 'Kiev', 30.52, 50.45, 'rus', 'orthodoxe', true, 'est', 'Capitale de la Rus, avec sa cathédrale Sainte-Sophie. Le Dniepr mène les Varègues jusqu\'à Constantinople.'],
    ['novgorod', 'Novgorod', 31.27, 58.52, 'rus', 'orthodoxe', true, 'est', 'Ville de marchands au nord de la Rus, riche des fourrures des forêts.'],
    ['roskilde', 'Roskilde', 12.08, 55.64, 'danemark', 'catholique', true, 'nord', 'Ville des rois de Danemark, sur un fjord.'],
    ['bergen', 'Bergen', 5.32, 60.39, 'norvege', 'catholique', true, 'nord', 'Port fondé par le roi Olaf le Paisible, où l\'on sèche la morue.'],
    ['uppsala', 'Uppsala', 17.64, 59.86, 'suede', 'catholique', false, 'nord', 'Vieux centre des rois de Suède et de l\'ancien culte d\'Odin.'],
    // Villes ajoutées (toutes réelles en 1096)
    ['mayence', 'Mayence', 8.27, 50.0, 'empire', 'catholique', false, 'occident', 'Grande ville du Rhin et de son archevêque. En mai 1096, la bande d\'Emich de Leiningen y massacre la communauté juive.'],
    ['pise', 'Pise', 10.4, 43.72, 'pise', 'catholique', true, 'occident', 'Port de marins qui construit sa grande cathédrale. Sa flotte part pour la Terre sainte en 1098.'],
    ['lisbonne', 'Lisbonne', -9.14, 38.72, 'almoravides', 'sunnite', true, 'iberie', 'Al-Ushbuna, port sur le Tage, repris par les Almoravides en 1094.'],
    ['seville', 'Séville', -5.98, 37.39, 'almoravides', 'sunnite', true, 'iberie', 'Ville du roi-poète al-Mutamid, exilé par les Almoravides en 1091.'],
    ['mahdia', 'Mahdia', 11.06, 35.5, 'zirides', 'sunnite', true, 'egypte', 'Capitale fortifiée des Zirides sur la côte de Tunisie, pillée par Pise et Gênes en 1087.'],
    ['caire', 'Le Caire', 31.24, 30.04, 'fatimides', 'chiite', false, 'egypte', 'Capitale des califes fatimides, avec la mosquée al-Azhar. Le vizir al-Afdal vient d\'y bâtir de nouvelles portes géantes.'],
    ['ascalon', 'Ascalon', 34.57, 31.67, 'fatimides', 'chiite', true, 'syrie', 'Forteresse fatimide de la côte. Le 12 août 1099, les croisés y écrasent l\'armée d\'al-Afdal.'],
    ['tarse', 'Tarse', 34.9, 36.92, 'seldjoukides', 'armenienne', true, 'anatolie', 'Ville de saint Paul, peuplée d\'Arméniens sous garnison turque. Tancrède et Baudouin se la disputent en 1097.'],
    ['mossoul', 'Mossoul', 43.13, 36.34, 'mossoul', 'sunnite', false, 'orient', 'Ville de l\'atabeg Kerbogha, sur le Tigre, face aux ruines de Ninive.'],
    ['trebizonde', 'Trébizonde', 39.72, 41.0, 'romains', 'orthodoxe', true, 'anatolie', 'Port romain de la mer Noire. Le duc Théodore Gabras le défend presque seul contre les Turcs.'],
    ['smyrne', 'Smyrne', 27.14, 38.42, 'seldjoukides', 'sunnite', true, 'anatolie', 'Port de l\'émir Tzachas, un pirate turc qui rêvait de prendre Constantinople. Les Romains la reprennent en 1097.']
  ];
  // Villages : [clé, nom, lon, lat, faction, religion, région, description, recrue]
  var VIL = [
    ['vezelay', 'Vézelay', 3.75, 47.47, 'france', 'catholique', 'occident', 'Village de Bourgogne au pied de la basilique de la Madeleine, grand lieu de pèlerinage.', 'paysan'],
    ['mosony', 'Moson', 17.27, 47.87, 'hongrie', 'catholique', 'hongrie', 'Bourg fortifié où les croisés d\'Emich de Leiningen sont écrasés par les Hongrois en août 1096.', 'paysan'],
    ['ochrid', 'Ohrid', 20.8, 41.12, 'romains', 'orthodoxe', 'balkans', 'Bourg au bord du lac, ancienne capitale bulgare, sur la Via Egnatia.', 'paysan'],
    ['philippopolis', 'Philippopolis', 24.75, 42.15, 'romains', 'orthodoxe', 'balkans', 'Bourg de Thrace (Plovdiv) où vivent des pauliciens, des chrétiens jugés hérétiques.', 'paysan'],
    ['melfi', 'Melfi', 15.65, 40.99, 'normands', 'catholique', 'occident', 'Village normand sous le château où Urbain II a réuni un concile en 1089.', 'paysan'],
    ['heraclee', 'Héraclée', 34.05, 37.51, 'seldjoukides', 'sunnite', 'anatolie', 'Village d\'Anatolie (Ereğli). Les croisés y battent les Turcs en septembre 1097.', 'turcopole'],
    ['marash', 'Marash', 36.93, 37.58, 'armeniens', 'armenienne', 'syrie', 'Bourg arménien gouverné par Tatoul, qui accueille les croisés en octobre 1097.', 'armenien'],
    ['shaizar', 'Shaizar', 36.57, 35.27, 'emirs', 'sunnite', 'syrie', 'Village fortifié des Banou Munqidh sur l\'Oronte. Le prince-poète Oussama y est né en 1095.', 'turcopole'],
    ['tiberiade', 'Tibériade', 35.53, 32.79, 'fatimides', 'juive', 'syrie', 'Bourg au bord du lac de Galilée, célèbre pour ses savants juifs qui recopient la Bible hébraïque.', 'paysan'],
    ['cluny', 'Cluny', 4.66, 46.43, 'france', 'catholique', 'occident', 'Village de la plus puissante abbaye d\'Europe. Urbain II, ancien moine de Cluny, y a consacré l\'autel de la nouvelle église en octobre 1095.', 'paysan'],
    ['compostelle', 'Compostelle', -8.54, 42.88, 'castille', 'catholique', 'iberie', 'Bourg de Galice où des pèlerins de toute l\'Europe viennent prier sur le tombeau de saint Jacques.', 'paysan'],
    ['athos', 'Mont Athos', 24.33, 40.16, 'romains', 'orthodoxe', 'balkans', 'La sainte montagne des moines orthodoxes : une vingtaine de monastères, et aucune femme admise.', 'paysan'],
    ['sambie', 'Sambie', 20.3, 54.9, 'prusses', 'paienne', 'est', 'Côte de l\'ambre des Prusses païens, avec leurs bois sacrés où les étrangers n\'ont pas le droit d\'entrer.', 'paysan'],
    ['steppe', 'Camp couman', 35.0, 47.8, 'coumans', 'paienne', 'est', 'Les yourtes du khan Boniak au bord du Dniepr. On y prie Tengri, le Ciel éternel.', 'coumane'],
    ['naplouse', 'Naplouse', 35.26, 32.22, 'fatimides', 'samaritaine', 'syrie', 'Bourg au pied du mont Garizim, la montagne sainte des Samaritains.', 'paysan'],
    ['byblos', 'Byblos', 35.65, 34.12, 'fatimides', 'maronite', 'syrie', 'Très vieux port (Jbeil) au pied du Mont-Liban, où vivent les chrétiens maronites.', 'maronite'],
    ['hasbaya', 'Hasbaya', 35.68, 33.4, 'emirs', 'druze', 'syrie', 'Bourg du Wadi al-Taym, au pied du mont Hermon, où vivent les Druzes.', 'paysan'],
    ['midyat', 'Midyat', 41.37, 37.42, 'mossoul', 'syriaque', 'orient', 'Bourg du Tour Abdin, la « montagne des serviteurs de Dieu », couvert de monastères syriaques.', 'paysan'],
    ['natroun', 'Wadi Natroun', 30.3, 30.35, 'fatimides', 'copte', 'egypte', 'Vallée du désert où les monastères coptes existent depuis le IVe siècle.', 'paysan']
  ];
  // Communautés religieuses minoritaires dans les villes (réelles en 1096)
  var MINORITES = {
    constantinople: ['juive', 'catholique', 'armenienne'], jerusalem: ['orthodoxe', 'juive', 'armenienne', 'copte', 'syriaque'], antioche: ['orthodoxe', 'syriaque', 'armenienne'],
    edesse: ['syriaque', 'orthodoxe'], alep: ['juive', 'syriaque'], damas: ['juive', 'orthodoxe'], tripoli: ['maronite', 'sunnite'], bagdad: ['nestorienne', 'juive'],
    mossoul: ['nestorienne', 'syriaque', 'juive'], alexandrie: ['copte', 'juive', 'sunnite'], caire: ['copte', 'juive', 'sunnite'], tolede: ['juive', 'sunnite'],
    cordoue: ['juive', 'catholique'], seville: ['juive', 'catholique'], saragosse: ['juive', 'catholique'], palerme: ['sunnite', 'orthodoxe', 'juive'],
    cologne: ['juive'], mayence: ['juive'], prague: ['juive'], rouen: ['juive'], paris: ['juive'], kiev: ['juive'], uppsala: ['paienne'], bari: ['orthodoxe', 'juive'],
    venise: ['orthodoxe'], tarse: ['sunnite', 'orthodoxe'], acre: ['juive'], ascalon: ['juive', 'samaritaine'], nicee: ['orthodoxe'], iconium: ['orthodoxe', 'armenienne'], valence: ['sunnite']
  };
  var LIEUX = {};
  L.forEach(function (l) {
    var p = proj(l[2], l[3]);
    LIEUX[l[0]] = { id: l[0], nom: l[1], x: p[0], y: p[1], faction: l[4], religion: l[5], port: l[6], region: l[7], desc: l[8], voisins: [] };
  });
  VIL.forEach(function (l) {
    var p = proj(l[2], l[3]);
    LIEUX[l[0]] = { id: l[0], nom: l[1], x: p[0], y: p[1], faction: l[4], religion: l[5], port: false, region: l[6], desc: l[7], recrue: l[8], village: true, voisins: [] };
  });
  // Les villes d'Europe de l'Ouest passent sous leur vrai royaume de 1096
  var ROY = { bruges: 'flandre', bouillon: 'empire', aix: 'empire', cologne: 'empire', ratisbonne: 'empire', clermont: 'france', rome: 'papaute', bari: 'normands' };
  Object.keys(ROY).forEach(function (k) { LIEUX[k].faction = ROY[k]; });
  Object.keys(MINORITES).forEach(function (k) { LIEUX[k].minorites = MINORITES[k]; });

  // Routes : [a, b, 'terre' | 'mer']
  var ROUTES = [
    ['bruges', 'bouillon', 'terre'], ['bouillon', 'liege', 'terre'], ['liege', 'aix', 'terre'], ['aix', 'cologne', 'terre'], ['bouillon', 'vezelay', 'terre'], ['vezelay', 'clermont', 'terre'],
    ['clermont', 'genes', 'terre'], ['clermont', 'toulouse', 'terre'], ['toulouse', 'barcelone', 'terre'], ['barcelone', 'valence', 'terre'], ['genes', 'venise', 'terre'], ['genes', 'rome', 'terre'],
    ['rome', 'melfi', 'terre'], ['melfi', 'bari', 'terre'], ['cologne', 'ratisbonne', 'terre'], ['ratisbonne', 'mosony', 'terre'], ['mosony', 'hongrie', 'terre'], ['venise', 'hongrie', 'terre'],
    ['hongrie', 'belgrade', 'terre'], ['belgrade', 'nis', 'terre'], ['nis', 'sofia', 'terre'], ['sofia', 'philippopolis', 'terre'], ['philippopolis', 'andrinople', 'terre'],
    ['paris', 'bruges', 'terre'], ['paris', 'bouillon', 'terre'], ['paris', 'rouen', 'terre'], ['paris', 'vezelay', 'terre'], ['rouen', 'londres', 'mer'], ['londres', 'bruges', 'mer'],
    ['londres', 'dunfermline', 'terre'], ['dunfermline', 'bergen', 'mer'], ['dublin', 'dunfermline', 'mer'], ['bergen', 'roskilde', 'mer'], ['roskilde', 'uppsala', 'mer'],
    ['roskilde', 'cologne', 'terre'], ['uppsala', 'novgorod', 'mer'], ['novgorod', 'kiev', 'terre'], ['kiev', 'cracovie', 'terre'], ['cracovie', 'prague', 'terre'],
    ['prague', 'ratisbonne', 'terre'], ['cracovie', 'hongrie', 'terre'], ['kiev', 'constantinople', 'mer'], ['toulouse', 'saragosse', 'terre'], ['saragosse', 'barcelone', 'terre'],
    ['saragosse', 'tolede', 'terre'], ['tolede', 'cordoue', 'terre'], ['cordoue', 'valence', 'terre'], ['barcelone', 'genes', 'mer'], ['rome', 'palerme', 'mer'], ['palerme', 'bari', 'terre'],
    ['venise', 'knin', 'mer'], ['knin', 'hongrie', 'terre'], ['knin', 'durazzo', 'terre'],
    ['andrinople', 'constantinople', 'terre'], ['durazzo', 'ochrid', 'terre'], ['ochrid', 'thessalonique', 'terre'], ['thessalonique', 'andrinople', 'terre'],
    ['constantinople', 'nicee', 'terre'], ['nicee', 'dorylee', 'terre'], ['dorylee', 'iconium', 'terre'], ['iconium', 'heraclee', 'terre'], ['heraclee', 'antioche', 'terre'],
    ['heraclee', 'marash', 'terre'], ['marash', 'antioche', 'terre'], ['marash', 'edesse', 'terre'],
    ['antioche', 'edesse', 'terre'], ['antioche', 'alep', 'terre'], ['antioche', 'lattaquie', 'terre'], ['lattaquie', 'tripoli', 'terre'],
    ['tripoli', 'liban', 'terre'], ['tripoli', 'acre', 'terre'], ['acre', 'jaffa', 'terre'], ['jaffa', 'jerusalem', 'terre'], ['acre', 'tiberiade', 'terre'],
    ['damas', 'tiberiade', 'terre'], ['tiberiade', 'jerusalem', 'terre'], ['damas', 'liban', 'terre'], ['alep', 'shaizar', 'terre'], ['shaizar', 'damas', 'terre'], ['shaizar', 'lattaquie', 'terre'], ['alep', 'bagdad', 'terre'], ['edesse', 'bagdad', 'terre'],
    ['bruges', 'dublin', 'mer'], ['genes', 'valence', 'mer'], ['venise', 'durazzo', 'mer'], ['bari', 'durazzo', 'mer'],
    ['constantinople', 'rhodes', 'mer'], ['rhodes', 'chypre', 'mer'], ['chypre', 'lattaquie', 'mer'], ['chypre', 'jaffa', 'mer'],
    ['jaffa', 'alexandrie', 'mer'], ['rhodes', 'alexandrie', 'mer'],
    ['cologne', 'mayence', 'terre'], ['mayence', 'ratisbonne', 'terre'], ['mayence', 'prague', 'terre'], ['genes', 'pise', 'terre'], ['pise', 'rome', 'terre'], ['pise', 'palerme', 'mer'],
    ['lisbonne', 'seville', 'terre'], ['lisbonne', 'compostelle', 'terre'], ['lisbonne', 'londres', 'mer'], ['seville', 'cordoue', 'terre'], ['compostelle', 'tolede', 'terre'], ['compostelle', 'toulouse', 'terre'],
    ['valence', 'mahdia', 'mer'], ['mahdia', 'palerme', 'mer'], ['mahdia', 'alexandrie', 'mer'], ['vezelay', 'cluny', 'terre'], ['cluny', 'clermont', 'terre'],
    ['thessalonique', 'athos', 'terre'], ['athos', 'constantinople', 'mer'], ['cracovie', 'sambie', 'terre'], ['sambie', 'roskilde', 'mer'], ['sambie', 'novgorod', 'mer'],
    ['kiev', 'steppe', 'terre'], ['steppe', 'trebizonde', 'mer'], ['constantinople', 'trebizonde', 'mer'], ['trebizonde', 'edesse', 'terre'],
    ['constantinople', 'smyrne', 'mer'], ['smyrne', 'rhodes', 'mer'], ['smyrne', 'dorylee', 'terre'], ['heraclee', 'tarse', 'terre'], ['tarse', 'antioche', 'terre'], ['tarse', 'chypre', 'mer'],
    ['edesse', 'mossoul', 'terre'], ['mossoul', 'bagdad', 'terre'], ['edesse', 'midyat', 'terre'], ['midyat', 'mossoul', 'terre'],
    ['alexandrie', 'caire', 'terre'], ['caire', 'natroun', 'terre'], ['natroun', 'alexandrie', 'terre'], ['caire', 'ascalon', 'terre'],
    ['jaffa', 'ascalon', 'terre'], ['ascalon', 'jerusalem', 'terre'], ['ascalon', 'alexandrie', 'mer'], ['jerusalem', 'naplouse', 'terre'], ['naplouse', 'tiberiade', 'terre'], ['naplouse', 'jaffa', 'terre'],
    ['tripoli', 'byblos', 'terre'], ['byblos', 'acre', 'terre'], ['damas', 'hasbaya', 'terre'], ['hasbaya', 'tiberiade', 'terre']
  ];
  ROUTES.forEach(function (r) {
    LIEUX[r[0]].voisins.push({ id: r[1], type: r[2] });
    LIEUX[r[1]].voisins.push({ id: r[0], type: r[2] });
  });

  // ---------- Armes ----------
  // forme : modèle 3D ; deg : dégâts ; dur : durée d'un coup (s) ; portee (m) ; end : endurance par coup ;
  // arc : largeur du coup (degrés) ; recul : force du recul ; brise : traverse les gardes.
  var ARMES = {
    epee: { nom: 'Épée de chevalier', type: 'historique', forme: 'epee', deg: 14, dur: 0.55, portee: 2.0, end: 12, arc: 70, recul: 1, prix: 0,
      origine: 'Europe, XIe siècle', desc: 'L\'arme du chevalier : équilibrée, rapide, fiable.', couleur: 0xc9ccd1 },
    masse: { nom: 'Masse d\'armes', type: 'historique', forme: 'masse', deg: 18, dur: 0.68, portee: 1.8, end: 16, arc: 60, recul: 1.6, brise: true, prix: 120,
      origine: 'Partout au Moyen Âge', desc: 'Écrase les armures et traverse les gardes.', couleur: 0x8a8f96 },
    hache: { nom: 'Hache danoise', type: 'historique', forme: 'hache', deg: 22, dur: 0.8, portee: 2.3, end: 20, arc: 95, recul: 1.4, prix: 160,
      origine: 'Scandinavie, arme des Varègues', desc: 'Grande hache à deux mains : touche plusieurs ennemis à la fois.', couleur: 0x9aa1a8 },
    lance: { nom: 'Lance de fantassin', type: 'historique', forme: 'lance', deg: 15, dur: 0.6, portee: 3.1, end: 12, arc: 30, recul: 1.2, prix: 90,
      origine: 'Toute l\'Europe et l\'Orient', desc: 'Très longue portée en estoc : tient l\'ennemi à distance.', couleur: 0xb0b4b9 },
    kilij: { nom: 'Kılıç (sabre turc)', type: 'historique', forme: 'sabre', deg: 13, dur: 0.42, portee: 2.0, end: 9, arc: 80, recul: 0.8, prix: 150,
      origine: 'Turcs seldjoukides', desc: 'Sabre courbé très rapide, l\'arme des cavaliers turcs.', couleur: 0xd5d8dc },
    fleau: { nom: 'Fléau d\'armes', type: 'historique', forme: 'fleau', deg: 20, dur: 0.75, portee: 2.1, end: 17, arc: 75, recul: 1.5, brise: true, prix: 200,
      origine: 'Europe centrale', desc: 'La boule contourne les boucliers.', couleur: 0x7f8c8d },
    spathion: { nom: 'Spathion romain', type: 'historique', forme: 'epee', deg: 16, dur: 0.52, portee: 2.1, end: 11, arc: 70, recul: 1, prix: 220,
      origine: 'Empire romain d\'Orient', desc: 'Longue épée des cavaliers byzantins, héritière de la spatha romaine.', couleur: 0xe5e8e8 },
    ulfberht: { nom: 'Épée Ulfberht', type: 'historique', forme: 'epee', deg: 19, dur: 0.5, portee: 2.1, end: 11, arc: 72, recul: 1.1, prix: 320,
      origine: 'Rhénanie, IXe-XIe siècle', desc: 'Lame d\'acier rare marquée +VLFBERH+T. Les meilleures épées de leur temps.', couleur: 0xeef2f3 },

    excalibur: { nom: 'Excalibur', type: 'legendaire', forme: 'epee', deg: 26, dur: 0.5, portee: 2.3, end: 10, arc: 75, recul: 1.3, couleur: 0x9fd8ff, lueur: 0x66ccff,
      origine: 'Légende du roi Arthur (Bretagne)', desc: 'L\'épée du roi Arthur, rendue à la Dame du Lac… puis cachée par les Forgerons de l\'Aube.',
      pouvoir: { id: 'vague', nom: 'Lame de lumière', desc: 'Lance une vague de lumière qui traverse les ennemis.', recharge: 6 } },
    durandal: { nom: 'Durandal', type: 'legendaire', forme: 'epee', deg: 24, dur: 0.55, portee: 2.2, end: 8, arc: 75, recul: 1.4, couleur: 0xffe08a, lueur: 0xffcc33,
      origine: 'La Chanson de Roland (France)', desc: 'L\'épée indestructible du paladin Roland. Il n\'a jamais réussi à la briser.',
      pouvoir: { id: 'inbrisable', nom: 'Inbrisable', desc: 'Onde de choc autour de toi, puis 6 s où ta garde ne fatigue plus et tes coups font +30 %.', recharge: 14 } },
    mjollnir: { nom: 'Mjöllnir', type: 'legendaire', forme: 'marteau', deg: 25, dur: 0.7, portee: 1.9, end: 14, arc: 70, recul: 2.2, brise: true, couleur: 0xaeb6bf, lueur: 0x85c1e9,
      origine: 'Mythologie nordique', desc: 'Le marteau du dieu Thor, apporté à Constantinople par un Varègue.',
      pouvoir: { id: 'foudre', nom: 'Colère du tonnerre', desc: 'La foudre frappe les 5 ennemis les plus proches et les étourdit.', recharge: 10 } },
    kusanagi: { nom: 'Kusanagi', type: 'legendaire', forme: 'epee', deg: 21, dur: 0.42, portee: 2.2, end: 8, arc: 85, recul: 1, couleur: 0xa9dfbf, lueur: 0x58d68d,
      origine: 'Mythologie japonaise', desc: '« L\'épée qui fauche les herbes », trouvée dans la queue d\'un serpent à huit têtes. Arrivée par la route de la soie.',
      pouvoir: { id: 'vent', nom: 'Faucheuse des vents', desc: 'Une tempête en cône repousse et blesse les ennemis devant toi.', recharge: 7 } },
    gungnir: { nom: 'Gungnir', type: 'legendaire', forme: 'lance', deg: 24, dur: 0.55, portee: 3.3, end: 10, arc: 30, recul: 1.4, couleur: 0xf5cba7, lueur: 0xffa64d,
      origine: 'Mythologie nordique', desc: 'La lance d\'Odin, qui ne manque jamais sa cible.',
      pouvoir: { id: 'lancer', nom: 'Jamais ne manque', desc: 'Lance Gungnir, qui poursuit sa cible et revient.', recharge: 6 } },
    joyeuse: { nom: 'Joyeuse', type: 'legendaire', forme: 'epee', deg: 20, dur: 0.5, portee: 2.1, end: 9, arc: 75, recul: 1.1, couleur: 0xfdebd0, lueur: 0xfff3b0,
      origine: 'Légende de Charlemagne', desc: 'L\'épée de Charlemagne, qui changeait de couleur trente fois par jour.',
      pouvoir: { id: 'soin', nom: 'Éclat de Charlemagne', desc: 'Te soigne de 35 PV et aveugle les ennemis proches.', recharge: 16 } },
    tizona: { nom: 'Tizona', type: 'legendaire', forme: 'epee', deg: 23, dur: 0.5, portee: 2.1, end: 9, arc: 75, recul: 1.2, couleur: 0xf1948a, lueur: 0xff6b5b,
      origine: 'Le Cid (Espagne)', desc: 'L\'épée du Cid. La légende dit qu\'elle effrayait les ennemis indignes.',
      pouvoir: { id: 'effroi', nom: 'Effroi du Cid', desc: 'Les ennemis proches fuient 4 s et prennent +50 % de dégâts.', recharge: 15 } },
    gaebolg: { nom: 'Gáe Bolg', type: 'legendaire', forme: 'lance', deg: 22, dur: 0.55, portee: 3.2, end: 10, arc: 30, recul: 1.2, couleur: 0xd2b4de, lueur: 0xbb8fce,
      origine: 'Mythologie irlandaise', desc: 'La lance de Cú Chulainn, aux trente pointes.',
      pouvoir: { id: 'pointes', nom: 'Trente pointes', desc: 'Une ligne de pointes jaillit du sol devant toi.', recharge: 8 } },
    ruyi: { nom: 'Ruyi Jingu Bang', type: 'legendaire', forme: 'baton', deg: 19, dur: 0.48, portee: 2.9, end: 9, arc: 110, recul: 1.6, couleur: 0xf7dc6f, lueur: 0xf4d03f,
      origine: 'La Pérégrination vers l\'Ouest (Chine)', desc: 'Le bâton du Roi Singe, qui grandit et rétrécit à volonté.',
      pouvoir: { id: 'tourbillon', nom: 'Bâton qui grandit', desc: 'Le bâton s\'allonge et tourne autour de toi.', recharge: 9 } }
  };

  // ---------- Unités (troupes, mercenaires, ennemis, boss) ----------
  // look : peau, tunique, pantalon, casque, croix, bouclier, couleur du bouclier, cape
  var U = {};
  function u(id, o) { U[id] = o; }
  var PEAU = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
  // Troupes et mercenaires recrutables
  u('milicien', { nom: 'Milicien', pv: 34, deg: 7, vit: 3.4, arme: 'lance', look: { tunique: 0x8d6e63, pantalon: 0x5d4037, casque: 'capuche' }, prix: 10, garde: 0.1 });
  u('sergent', { nom: 'Sergent à pied', pv: 55, deg: 11, vit: 3.5, arme: 'epee', look: { tunique: 0xecf0f1, croix: 0xc0392b, pantalon: 0x566573, casque: 'nasal', bouclier: 'kite', bc: 0xc0392b }, prix: 25, garde: 0.3 });
  u('arbaletrier', { nom: 'Arbalétrier', pv: 38, deg: 12, vit: 3.4, arme: 'epee', tir: { deg: 13, cad: 2.6, portee: 22 }, look: { tunique: 0x7b7d7d, pantalon: 0x4d5656, casque: 'chapel' }, prix: 35, garde: 0.1 });
  u('chevalier', { nom: 'Chevalier franc', pv: 95, deg: 16, vit: 3.6, arme: 'epee', look: { tunique: 0xf8f9f9, croix: 0xc0392b, pantalon: 0x85929e, casque: 'heaume', bouclier: 'kite', bc: 0xf8f9f9, cape: 0xc0392b }, prix: 80, garde: 0.45, faction: 'latins' });
  u('skutatos', { nom: 'Skutatos (fantassin romain)', pv: 60, deg: 11, vit: 3.4, arme: 'lance', look: { tunique: 0x7d3c98, pantalon: 0x4a235a, casque: 'rond', bouclier: 'rond', bc: 0x7d3c98 }, prix: 25, garde: 0.4, faction: 'romains' });
  u('toxotes', { nom: 'Toxotes (archer romain)', pv: 40, deg: 10, vit: 3.6, arme: 'epee', tir: { deg: 13, cad: 1.9, portee: 24 }, look: { tunique: 0xa569bd, pantalon: 0x5b2c6f, casque: 'rond' }, prix: 30, garde: 0.1, faction: 'romains' });
  u('varegue', { nom: 'Garde varègue', pv: 90, deg: 18, vit: 3.4, arme: 'hache', look: { tunique: 0xb03a2e, pantalon: 0x1b2631, casque: 'nasal', barbe: 0xd4ac0d, cape: 0x1b2631 }, prix: 70, garde: 0.3, merc: true, histo: 'Guerriers scandinaves et anglo-saxons au service de l\'empereur, fidèles jusqu\'à la mort.' });
  u('turcopole', { nom: 'Turcopole', pv: 45, deg: 10, vit: 4, arme: 'kilij', tir: { deg: 11, cad: 2, portee: 22 }, look: { tunique: 0xd68910, pantalon: 0x6e2c00, casque: 'rond' }, prix: 40, merc: true, histo: 'Archers légers d\'origine turque ou mixte, engagés par les Byzantins puis par les croisés.' });
  u('petchenegue', { nom: 'Petchénègue', pv: 46, deg: 11, vit: 4, arme: 'kilij', tir: { deg: 10, cad: 2.2, portee: 20 }, look: { tunique: 0x6e2c00, pantalon: 0x3e2723, casque: 'fourrure' }, prix: 35, merc: true, histo: 'Nomades des steppes, mercenaires de l\'empereur. Ils escortent (et harcèlent) les croisés dans les Balkans.' });
  u('genois', { nom: 'Arbalétrier génois', pv: 44, deg: 12, vit: 3.5, arme: 'epee', tir: { deg: 17, cad: 2.6, portee: 26 }, look: { tunique: 0xe67e22, croix: 0xc0392b, pantalon: 0xecf0f1, casque: 'chapel', bouclier: 'pavois', bc: 0xecf0f1 }, prix: 45, merc: true, histo: 'Les meilleurs arbalétriers de la Méditerranée, payés très cher.' });
  u('normand', { nom: 'Chevalier normand', pv: 85, deg: 16, vit: 3.6, arme: 'epee', look: { tunique: 0xb7950b, pantalon: 0x515a5a, casque: 'nasal', bouclier: 'kite', bc: 0xc0392b }, prix: 75, garde: 0.4, merc: true, histo: 'Normands d\'Italie du Sud, comme Bohémond de Tarente : des guerriers redoutés.' });
  u('armenien', { nom: 'Archer arménien', pv: 42, deg: 10, vit: 3.6, arme: 'epee', tir: { deg: 12, cad: 2, portee: 23 }, look: { tunique: 0xa04000, pantalon: 0x4a235a, casque: 'rond' }, prix: 35, merc: true, histo: 'Les Arméniens de Cilicie et d\'Édesse aident les croisés à traverser le Taurus.' });
  u('hospitalier', { nom: 'Frère de l\'Hôpital', pv: 110, deg: 17, vit: 3.5, arme: 'epee', look: { tunique: 0x1c1c1c, croix: 0xffffff, pantalon: 0x2c3e50, casque: 'heaume', bouclier: 'kite', bc: 0x1c1c1c, cape: 0x111111 }, prix: 120, garde: 0.5, histo: 'L\'Hôpital Saint-Jean de Jérusalem, dirigé par Gérard, soigne les pèlerins depuis avant 1099. Il deviendra l\'ordre militaire des Hospitaliers.' });
  // Troupes des villages et des royaumes du Nord et de l'Est
  u('maronite', { nom: 'Archer maronite', pv: 40, deg: 10, vit: 3.8, arme: 'epee', tir: { deg: 12, cad: 2, portee: 23 }, look: { tunique: 0x6e2c00, pantalon: 0x1b2631, casque: 'capuche' }, prix: 30, garde: 0.15,
    histo: 'Montagnards chrétiens du Liban. En 1099, ils guident les croisés le long de la côte.' });
  u('paysan', { nom: 'Volontaire du village', pv: 28, deg: 6, vit: 3.4, arme: 'lance', look: { tunique: 0xa1887f, pantalon: 0x6d4c41, casque: 'capuche' }, prix: 6, garde: 0.05, promo: 'milicien', promoXp: 8,
    histo: 'Des paysans qui prennent la fourche et la lance pour suivre un seigneur. Avec de l\'expérience, ils deviennent de vrais soldats.' });
  U.milicien.promo = { latins: 'sergent', romains: 'skutatos' }; U.milicien.promoXp = 16;
  u('huscarl', { nom: 'Huscarl danois', pv: 80, deg: 17, vit: 3.4, arme: 'hache', look: { tunique: 0x1f618d, pantalon: 0x1b2631, casque: 'nasal', barbe: 0xd35400, bouclier: 'rond', bc: 0xcb4335 }, prix: 60, garde: 0.3, merc: true, or: 12,
    histo: 'Gardes du corps des rois scandinaves, armés de la grande hache. Beaucoup finissent dans la Garde varègue.' });
  u('coumane', { nom: 'Archer couman', pv: 42, deg: 10, vit: 4.1, arme: 'kilij', tir: { deg: 11, cad: 2.1, portee: 22 }, look: { tunique: 0x9a7d0a, pantalon: 0x4d3b0f, casque: 'fourrure' }, prix: 35, merc: true, or: 9,
    histo: 'Nomades turcs des steppes au nord de la mer Noire. Ils pillent la Rus en 1096, puis servent comme mercenaires.' });
  u('druzhinnik', { nom: 'Droujinnik de la Rus', pv: 85, deg: 15, vit: 3.5, arme: 'hache', look: { tunique: 0x922b21, pantalon: 0x1b2631, casque: 'rond', barbe: 0x6e2c00, bouclier: 'kite', bc: 0xd35400 }, prix: 65, garde: 0.4, merc: true,
    histo: 'La droujina est la garde personnelle des princes de Kiev : des guerriers lourds, héritiers des Varègues.' });
  u('almoravide', { nom: 'Guerrier almoravide', pv: 52, deg: 11, vit: 3.7, arme: 'lance', look: { tunique: 0x1c2833, pantalon: 0x1c2833, casque: 'turban', bouclier: 'rond', bc: 0x7e5109 }, garde: 0.35, or: 11 });
  // Ennemis
  // Cavalerie (à cheval seulement dans les grandes batailles en terrain ouvert)
  u('chevalier_monte', { nom: 'Chevalier monté', pv: 100, deg: 17, vit: 3.6, arme: 'lance', look: { tunique: 0xf8f9f9, croix: 0xc0392b, pantalon: 0x85929e, casque: 'heaume', bouclier: 'kite', bc: 0xc0392b, cape: 0xc0392b }, prix: 160, garde: 0.4, faction: 'latins',
    cheval: { robe: 0x4e342e, caparacon: 0xf8f9f9, croix: 0xc0392b, vit: 6.2, pv: 45, charge: 1.2 },
    histo: 'Le chevalier lourd et son destrier : sa charge, lance couchée, peut briser une armée. Les Turcs disaient qu\'un chevalier franc à cheval pouvait percer les murs de Babylone.' });
  u('cataphracte', { nom: 'Cataphracte', pv: 105, deg: 15, vit: 3.4, arme: 'lance', look: { tunique: 0x7d3c98, pantalon: 0x4a235a, casque: 'rond', bouclier: 'rond', bc: 0x7d3c98, cape: 0x4a235a }, prix: 150, garde: 0.45, faction: 'romains',
    cheval: { robe: 0x3e2723, caparacon: 0x95a5a6, vit: 5.6, pv: 60, charge: 1.1 },
    histo: 'Cavaliers romains couverts de fer, eux et leurs chevaux. Lents mais presque impossibles à arrêter.' });
  u('cavalier_turc', { nom: 'Archer à cheval turc', pv: 38, deg: 9, vit: 4, arme: 'kilij', tir: { deg: 10, cad: 1.8, portee: 24 }, look: { tunique: 0x148f77, pantalon: 0x0b5345, casque: 'fourrure' }, garde: 0.05, or: 12,
    cheval: { robe: 0xa04000, vit: 7, pv: 25 }, histo: 'Les archers à cheval seldjoukides tournent autour de l\'ennemi en tirant sans jamais s\'arrêter. C\'est ainsi qu\'ils encerclent les croisés à Dorylée.' });
  u('cavalier_fatimide', { nom: 'Cavalier fatimide', pv: 55, deg: 12, vit: 3.6, arme: 'lance', look: { tunique: 0xfdfefe, pantalon: 0x2e86c1, casque: 'turban', bouclier: 'rond', bc: 0x2e86c1 }, garde: 0.3, or: 13,
    cheval: { robe: 0xd5d8dc, caparacon: 0x2e86c1, vit: 6.4, pv: 30 } });
  // Les nomades combattent à cheval
  U.turcopole.cheval = { robe: 0xa04000, vit: 6.8, pv: 25 };
  U.petchenegue.cheval = { robe: 0x6e2c00, vit: 6.8, pv: 25 };
  U.coumane.cheval = { robe: 0x8d6e63, vit: 7, pv: 25 };
  // Montures à acheter (forge et écurie)
  var CHEVAUX = {
    roncin: { nom: 'Roncin', prix: 80, vit: 5.6, pv: 20, robe: 0x8d6e63, desc: 'Un cheval de voyage solide et bon marché. Mieux que d\'aller à pied !' },
    arabe: { nom: 'Cheval arabe', prix: 220, vit: 7, pv: 25, robe: 0xd5d8dc, desc: 'Rapide et nerveux, il tourne vite. Parfait pour frapper et repartir.' },
    destrier: { nom: 'Destrier caparaçonné', prix: 320, vit: 6.2, pv: 60, charge: 1.3, robe: 0x1c1c1c, caparacon: true, desc: 'Le grand cheval de guerre des chevaliers, couvert d\'un caparaçon. Sa charge fait des ravages.' }
  };
  u('brigand', { nom: 'Brigand', pv: 30, deg: 7, vit: 3.3, arme: 'masse', look: { tunique: 0x6d4c41, pantalon: 0x3e2723, casque: 'capuche' }, garde: 0.05, or: 6 });
  u('noir', { nom: 'Mercenaire de Raoul', pv: 50, deg: 11, vit: 3.5, arme: 'epee', look: { tunique: 0x1c2833, pantalon: 0x17202a, casque: 'nasal', bouclier: 'kite', bc: 0x1c2833 }, garde: 0.3, or: 10 });
  u('noir_tir', { nom: 'Arbalétrier de Raoul', pv: 34, deg: 9, vit: 3.4, arme: 'epee', tir: { deg: 11, cad: 3, portee: 20 }, look: { tunique: 0x283747, pantalon: 0x17202a, casque: 'chapel' }, garde: 0.05, or: 9 });
  u('assassin', { nom: 'Assassin', pv: 36, deg: 12, vit: 4.6, arme: 'kilij', look: { tunique: 0x212f3d, pantalon: 0x1b2631, casque: 'capuche', cape: 0x17202a }, garde: 0.2, esquive: 0.35, or: 12 });
  u('seldjoukide', { nom: 'Guerrier seldjoukide', pv: 46, deg: 10, vit: 4, arme: 'kilij', look: { tunique: 0x117864, pantalon: 0x0e6251, casque: 'rond', bouclier: 'rond', bc: 0x16a085 }, garde: 0.3, or: 9 });
  u('archer_turc', { nom: 'Archer turc', pv: 34, deg: 9, vit: 4, arme: 'kilij', tir: { deg: 10, cad: 2, portee: 22 }, look: { tunique: 0x148f77, pantalon: 0x0b5345, casque: 'fourrure' }, garde: 0.05, or: 9 });
  u('fatimide', { nom: 'Lancier fatimide', pv: 52, deg: 11, vit: 3.6, arme: 'lance', look: { tunique: 0xfdfefe, pantalon: 0x2e86c1, casque: 'turban', bouclier: 'rond', bc: 0x2e86c1 }, garde: 0.35, or: 10 });
  u('fatimide_tir', { nom: 'Archer fatimide', pv: 34, deg: 9, vit: 3.6, arme: 'epee', tir: { deg: 10, cad: 2.2, portee: 22 }, look: { tunique: 0x2e86c1, pantalon: 0x1b4f72, casque: 'turban' }, garde: 0.05, or: 9 });
  u('pirate', { nom: 'Pirate', pv: 38, deg: 9, vit: 3.8, arme: 'kilij', look: { tunique: 0x922b21, pantalon: 0x212f3d, casque: 'aucun' }, garde: 0.1, or: 12 });
  u('pisan', { nom: 'Marin de Pise', pv: 48, deg: 11, vit: 3.6, arme: 'epee', look: { tunique: 0xc0392b, pantalon: 0xecf0f1, casque: 'chapel', bouclier: 'rond', bc: 0xc0392b }, garde: 0.3, or: 10 });
  u('golem', { nom: 'Gardien de pierre', pv: 120, deg: 18, vit: 2.4, arme: 'masse', taille: 1.5, pierre: true, look: { peau: 0x839192, tunique: 0x707b7c, pantalon: 0x5f6a6a, casque: 'aucun' }, garde: 0, or: 15 });
  u('spectre', { nom: 'Spectre gardien', pv: 60, deg: 13, vit: 3.6, arme: 'epee', spectre: true, look: { peau: 0xaed6f1, tunique: 0x5dade2, pantalon: 0x2e86c1, casque: 'heaume', bouclier: 'kite', bc: 0x5dade2 }, garde: 0.35, or: 10 });
  // Boss (pv élevés, attaques spéciales)
  u('gautier', { nom: 'Gautier le Rouge, chef des brigands', boss: true, pv: 240, deg: 13, vit: 3.4, arme: 'masse', taille: 1.2, special: ['saut', 'charge'], look: { tunique: 0x922b21, pantalon: 0x3e2723, casque: 'capuche', barbe: 0xa04000 }, or: 60 });
  u('hugues', { nom: 'Hugues le Balafré', boss: true, pv: 320, deg: 15, vit: 3.6, arme: 'epee', taille: 1.15, special: ['charge', 'tourbillon', 'invocation'], invoque: 'noir', look: { tunique: 0x1c2833, pantalon: 0x17202a, casque: 'heaume', bouclier: 'kite', bc: 0x641e16 }, garde: 0.35, or: 80 });
  u('thorvald', { nom: 'Thorvald, le vieux Varègue', boss: true, pv: 380, deg: 17, vit: 3.3, arme: 'mjollnir', taille: 1.25, special: ['foudre', 'saut'], look: { tunique: 0xb03a2e, pantalon: 0x1b2631, casque: 'nasal', barbe: 0xecf0f1, cape: 0x1b2631 }, garde: 0.3, or: 90, amical: true });
  u('bertrand', { nom: 'Bertrand de Mauves', boss: true, pv: 420, deg: 18, vit: 3.6, arme: 'durandal', taille: 1.2, special: ['onde', 'charge', 'tourbillon'], look: { tunique: 0x4a235a, pantalon: 0x1b2631, casque: 'heaume', bouclier: 'kite', bc: 0x4a235a, cape: 0x17202a }, garde: 0.4, or: 110 });
  u('vipere', { nom: 'La Vipère', boss: true, pv: 360, deg: 16, vit: 5, arme: 'kusanagi', taille: 1.05, special: ['charge', 'invocation', 'vent'], invoque: 'assassin', look: { tunique: 0x145a32, pantalon: 0x0b5345, casque: 'capuche', cape: 0x0b5345 }, garde: 0.25, esquive: 0.4, or: 120 });
  u('golem_aube', { nom: 'Le Golem de l\'Aube', boss: true, pv: 650, deg: 24, vit: 2.4, arme: 'masse', taille: 2.4, pierre: true, special: ['saut', 'tourbillon', 'rochers'], look: { peau: 0x95a5a6, tunique: 0x7f8c8d, pantalon: 0x616a6b, casque: 'aucun' }, or: 150 });
  u('raoul', { nom: 'Raoul le Noir', boss: true, pv: 800, deg: 20, vit: 3.8, arme: 'gungnir', taille: 1.3, special: ['onde', 'foudre', 'charge', 'invocation', 'saut'], invoque: 'noir', look: { tunique: 0x0b0b0b, pantalon: 0x17202a, casque: 'heaume', bouclier: 'kite', bc: 0x0b0b0b, cape: 0x641e16 }, garde: 0.4, or: 250 });
  u('cid', { nom: 'Rodrigue Díaz, le Cid', boss: true, pv: 450, deg: 18, vit: 3.6, arme: 'tizona', taille: 1.15, special: ['charge', 'tourbillon'], look: { tunique: 0xf4d03f, croix: 0x943126, pantalon: 0x5d6d7e, casque: 'nasal', bouclier: 'kite', bc: 0x943126, barbe: 0x6e2c00 }, garde: 0.45, or: 120, amical: true });
  u('chulainn', { nom: 'Le spectre de Cú Chulainn', boss: true, pv: 420, deg: 18, vit: 4.2, arme: 'gaebolg', taille: 1.2, spectre: true, special: ['charge', 'saut', 'pointes'], look: { peau: 0xa9dfbf, tunique: 0x229954, pantalon: 0x145a32, casque: 'aucun', bouclier: 'rond', bc: 0x229954 }, or: 120 });
  u('paladin', { nom: 'Le spectre du paladin', boss: true, pv: 380, deg: 16, vit: 3.5, arme: 'joyeuse', taille: 1.2, spectre: true, special: ['onde', 'invocation'], invoque: 'spectre', look: { peau: 0xd6eaf8, tunique: 0x2874a6, pantalon: 0x1b4f72, casque: 'heaume', bouclier: 'kite', bc: 0xf4d03f, cape: 0x2874a6 }, garde: 0.4, or: 110 });
  u('roisinge', { nom: 'L\'esprit du Roi Singe', boss: true, pv: 400, deg: 16, vit: 5, arme: 'ruyi', taille: 1.0, spectre: true, special: ['tourbillon', 'saut', 'charge'], look: { peau: 0xd4ac0d, tunique: 0xc0392b, pantalon: 0xf1c40f, casque: 'couronne' }, esquive: 0.4, or: 120 });

  // ---------- Navires ----------
  var NAVIRES = {
    nef: { nom: 'Nef latine', pv: 110, vit: 8, virage: 0.75, equipage: 10, voile: 0xf8f9f9, coque: 0x6e4b2a, embleme: 0xc0392b },
    dromon: { nom: 'Dromon romain', pv: 130, vit: 9, virage: 0.85, equipage: 12, voile: 0x7d3c98, coque: 0x5b3a1e, embleme: 0xf1c40f, feu: true },
    genoise: { nom: 'Galère génoise', pv: 110, vit: 9, virage: 0.85, equipage: 10, voile: 0xecf0f1, coque: 0x6e4b2a, embleme: 0xe67e22 },
    fatimide: { nom: 'Galère fatimide', pv: 100, vit: 8.5, virage: 0.85, equipage: 9, voile: 0x2e86c1, coque: 0x5b3a1e, embleme: 0xfdfefe, troupe: 'fatimide' },
    pisane: { nom: 'Galère pisane', pv: 105, vit: 8.5, virage: 0.8, equipage: 10, voile: 0xc0392b, coque: 0x5b3a1e, embleme: 0xffffff, troupe: 'pisan' },
    pirate: { nom: 'Birème pirate', pv: 80, vit: 9.5, virage: 0.95, equipage: 8, voile: 0x1c1c1c, coque: 0x4a3520, embleme: 0xc0392b, troupe: 'pirate' }
  };

  // ---------- Personnages des dialogues ----------
  // look : pour dessiner le portrait en blocs
  var PERSOS = {
    narrateur: { nom: '', look: null },
    heros: { nom: '{heros}', look: { peau: 0xf1c27d, cheveux: 0x5d4037 } },
    anselme: { nom: 'Frère Anselme', look: { peau: 0xffdbac, cheveux: 0xd5d8dc, capuche: 0x5d4037 } },
    godefroy: { nom: 'Godefroy de Bouillon', look: { peau: 0xf1c27d, cheveux: 0xb9770e, barbe: 0xb9770e, casque: 0xaab7b8 } },
    raoul: { nom: 'Raoul le Noir', look: { peau: 0xe0ac69, cheveux: 0x111111, barbe: 0x111111, casque: 0x1c1c1c, yeux: 0xc0392b } },
    melisende: { nom: 'Mélisende de Liège', look: { peau: 0xffdbac, cheveux: 0xd35400, longs: true } },
    zoe: { nom: 'Zoé Argyre', look: { peau: 0xe0ac69, cheveux: 0x1c1c1c, longs: true, bijou: 0xf1c40f } },
    thorvald: { nom: 'Thorvald le Varègue', look: { peau: 0xffdbac, cheveux: 0xecf0f1, barbe: 0xecf0f1, casque: 0x95a5a6 } },
    yusuf: { nom: 'Yusuf ibn Rashid', look: { peau: 0xc68642, cheveux: 0x1c1c1c, barbe: 0x1c1c1c, turban: 0xfdfefe } },
    alexis: { nom: 'L\'empereur Alexis Ier Comnène', look: { peau: 0xe0ac69, cheveux: 0x4a235a, barbe: 0x4a235a, couronne: 0xf1c40f } },
    anne: { nom: 'La princesse Anne Comnène', look: { peau: 0xe0ac69, cheveux: 0x3e2723, longs: true, couronne: 0xf1c40f } },
    tatikios: { nom: 'Le général Tatikios', look: { peau: 0xc68642, cheveux: 0x1c1c1c, barbe: 0x1c1c1c, casque: 0xd4ac0d, nezOr: true } },
    bohemond: { nom: 'Bohémond de Tarente', look: { peau: 0xffdbac, cheveux: 0xf4d03f, casque: 0xaab7b8 } },
    raymond: { nom: 'Raymond de Saint-Gilles, comte de Toulouse', look: { peau: 0xf1c27d, cheveux: 0x7b7d7d, barbe: 0x7b7d7d } },
    adhemar: { nom: 'Adhémar du Monteil, légat du pape', look: { peau: 0xffdbac, cheveux: 0xd5d8dc, mitre: 0xfdfefe } },
    coloman: { nom: 'Coloman, roi de Hongrie', look: { peau: 0xf1c27d, cheveux: 0x6e2c00, barbe: 0x6e2c00, couronne: 0xf1c40f } },
    firouz: { nom: 'Firouz, gardien de la tour', look: { peau: 0xc68642, cheveux: 0x1c1c1c, barbe: 0x1c1c1c, casque: 0x95a5a6 } },
    iftikhar: { nom: 'Iftikhar ad-Dawla, gouverneur fatimide', look: { peau: 0x8d5524, cheveux: 0x1c1c1c, barbe: 0x1c1c1c, turban: 0x2e86c1 } },
    gerard: { nom: 'Frère Gérard de l\'Hôpital', look: { peau: 0xffdbac, cheveux: 0xd5d8dc, capuche: 0x1c1c1c } },
    cid: { nom: 'Rodrigue Díaz, le Cid', look: { peau: 0xe0ac69, cheveux: 0x6e2c00, barbe: 0x6e2c00, casque: 0xaab7b8 } },
    vipere: { nom: 'La Vipère', look: { peau: 0xe0ac69, cheveux: 0x1c1c1c, capuche: 0x145a32, longs: true } },
    bertrand: { nom: 'Bertrand de Mauves', look: { peau: 0xf1c27d, cheveux: 0x4a235a, casque: 0x4a235a } },
    hugues: { nom: 'Hugues le Balafré', look: { peau: 0xf1c27d, cheveux: 0x1c1c1c, barbe: 0x1c1c1c, cicatrice: true } },
    michel: { nom: 'Michel le logothète', look: { peau: 0xe0ac69, cheveux: 0x7b7d7d, chapeau: 0x7d3c98 } },
    tancrede: { nom: 'Tancrède de Hauteville', look: { peau: 0xffdbac, cheveux: 0xb9770e } },
    marchand: { nom: 'Wang, marchand de Chang\'an', look: { peau: 0xf1c27d, cheveux: 0x1c1c1c, chapeau: 0x1c1c1c } }
  };

  // Raccourci pour écrire les dialogues : D('qui', 'texte')
  function D(q, t) { return { q: q, t: t }; }
  function C() { return { choix: Array.prototype.slice.call(arguments) }; }

  // ---------- Combats réutilisés ----------
  var COMBATS = {
    bouillon: { titre: 'L\'attaque de l\'abbaye', decor: 'foret', vagues: [[['brigand', 3]], [['brigand', 4]]], boss: 'gautier' },
    hongrie: { titre: 'Les pillards de la plaine', decor: 'plaine', vagues: [[['noir', 3], ['noir_tir', 1]], [['noir', 3], ['noir_tir', 2]]], boss: 'hugues' },
    varegues: { titre: 'L\'épreuve des Varègues', decor: 'ville', vagues: [[['varegue', 2]], [['varegue', 3]]], boss: 'thorvald', amical: true },
    palais: { titre: 'Des tueurs aux Blachernes', decor: 'ville', vagues: [[['noir', 3]], [['assassin', 3], ['noir_tir', 1]]], boss: 'thorvald', amical: true },
    nicee: { titre: 'L\'armée de secours de Kılıç Arslan', decor: 'plaine', vagues: [[['seldjoukide', 4], ['cavalier_turc', 1]], [['seldjoukide', 4], ['cavalier_turc', 2], ['archer_turc', 1]]], alliesHisto: [['sergent', 3]] },
    dorylee: { titre: 'La bataille de Dorylée', decor: 'desert', vagues: [[['cavalier_turc', 4], ['seldjoukide', 2]], [['seldjoukide', 3], ['cavalier_turc', 2], ['noir', 2]]], boss: 'bertrand', alliesHisto: [['sergent', 2], ['skutatos', 2]] },
    antioche: { titre: 'Nuit de la tour des Deux-Sœurs', decor: 'nuit', vagues: [[['assassin', 3]], [['assassin', 3], ['noir', 2]]], boss: 'vipere' },
    kerbogha: { titre: 'La sortie contre Kerbogha', decor: 'plaine', ambiance: 'aube', vagues: [[['seldjoukide', 5], ['archer_turc', 2]], [['seldjoukide', 4], ['cavalier_turc', 3]], [['seldjoukide', 5], ['cavalier_fatimide', 2]]], alliesHisto: [['chevalier_monte', 3], ['sergent', 3]] },
    liban: { titre: 'Le Sanctuaire des Forgerons', decor: 'montagne', vagues: [[['golem', 2]], [['noir', 3], ['golem', 1]]], boss: 'golem_aube' },
    jerusalem: { titre: 'L\'assaut du 15 juillet 1099', decor: 'remparts', vagues: [[['fatimide', 4], ['fatimide_tir', 2]], [['noir', 4], ['noir_tir', 2]]], boss: 'raoul', alliesHisto: [['sergent', 3]] },
    aix: { titre: 'Les gardiens de Joyeuse', decor: 'crypte', vagues: [[['spectre', 3]]], boss: 'paladin' },
    valence: { titre: 'Le défi du Cid', decor: 'desert', vagues: [], boss: 'cid', amical: true },
    dublin: { titre: 'Le tertre de Cú Chulainn', decor: 'foret', vagues: [[['spectre', 3]]], boss: 'chulainn' },
    bagdad: { titre: 'L\'épreuve du Roi Singe', decor: 'ville', vagues: [], boss: 'roisinge', amical: true },
    // Combats navals
    durazzo: { mer: true, titre: 'Tempête et pirates devant Dyrrachium', ennemis: [['pirate', 3]] },
    ascanie: { mer: true, titre: 'Les bateaux du lac Ascanie', ennemis: [['pirate', 2], ['fatimide', 1]], lac: true },
    rhodes: { mer: true, titre: 'La flotte de Pise devant Rhodes', ennemis: [['pisane', 4]], allies: [['dromon', 1]] },
    jaffa: { mer: true, titre: 'Les navires génois de Jaffa', ennemis: [['fatimide', 4]], allies: [['genoise', 2]] }
  };
  // Rencontres sur la route (par région)
  var RENCONTRES = {
    occident: { nom: 'Des brigands', vagues: [[['brigand', 4]], [['brigand', 3], ['noir_tir', 1]]], decor: 'foret' },
    hongrie: { nom: 'Des mercenaires de Raoul', vagues: [[['noir', 3], ['brigand', 2]]], decor: 'plaine' },
    balkans: { nom: 'Des cavaliers petchénègues', vagues: [[['petchenegue', 4]]], decor: 'plaine', ennemiTroupe: true },
    anatolie: { nom: 'Des pillards turcs', vagues: [[['seldjoukide', 3], ['cavalier_turc', 2]]], decor: 'desert' },
    syrie: { nom: 'Des maraudeurs', vagues: [[['seldjoukide', 2], ['noir', 2], ['archer_turc', 1]]], decor: 'desert' },
    egypte: { nom: 'Une patrouille fatimide', vagues: [[['fatimide', 2], ['cavalier_fatimide', 2], ['fatimide_tir', 1]]], decor: 'desert' },
    orient: { nom: 'Des bandits du désert', vagues: [[['brigand', 3], ['archer_turc', 2]]], decor: 'desert' },
    mer: { nom: 'Des pirates', mer: true, ennemis: [['pirate', 2]] },
    nord: { nom: 'Des pillards du Nord', vagues: [[['brigand', 2], ['huscarl', 2]]], decor: 'foret', ennemiTroupe: true },
    est: { nom: 'Des cavaliers coumans', vagues: [[['coumane', 4]]], decor: 'plaine', ennemiTroupe: true },
    iberie: { nom: 'Une patrouille almoravide', vagues: [[['almoravide', 3], ['brigand', 2]]], decor: 'desert' }
  };

  // ---------- Histoire ----------
  // Chaque étape : lieu, titre, objectif, date, fait historique, dialogue avant, combat, dialogue après, récompense.
  // Dans les dialogues : D(qui, texte), C(choix...), { si: 'drapeau', alors: [...], sinon: [...] }.
  // Effets d'un choix (e) : aff (affection), fav (faveur Latins/Romains), drapeau, or, renom.

  var commun = {
    dorylee: {
      lieu: 'dorylee', titre: 'La bataille de Dorylée', objectif: 'Rejoins l\'armée à Dorylée.', date: '1er juillet 1097',
      fait: 'À Dorylée, l\'avant-garde de Bohémond est encerclée par les archers de Kılıç Arslan pendant des heures, jusqu\'à l\'arrivée de Godefroy et Raymond. C\'est la première grande victoire des croisés.',
      avant: [
        D('narrateur', 'L\'aube se lève sur une plaine sèche. Des milliers de cavaliers turcs encerclent le camp de Bohémond.'),
        D('yusuf', 'Pitié… Je ne suis qu\'un savant de Damas. Ce chevalier violet m\'a enlevé pour lire ses parchemins.'),
        D('heros', 'Un chevalier violet ? Au milieu des Turcs ?'),
        D('yusuf', 'Bertrand de Mauves. Il se bat pour celui qui paie. Et il porte une épée qui ne s\'ébrèche jamais.'),
        D('heros', 'Durandal… Le Codex parlait d\'elle. Reste derrière moi, Yusuf.')
      ],
      combat: 'dorylee',
      apres: [
        D('bertrand', 'Impossible… Durandal ne peut pas être vaincue !'),
        D('heros', 'L\'épée, non. Celui qui la tient, si.'),
        C({ t: 'L\'épargner : « Rends-toi, et tu vivras. »', e: { drapeau: 'bertrand_epargne', renom: 5, aff: { melisende: 1, zoe: 1 } } },
          { t: 'Le livrer aux barons pour qu\'il soit jugé.', e: { drapeau: 'bertrand_juge', fav: { latins: 1 } } }),
        { si: 'bertrand_epargne', alors: [D('bertrand', 'Tu es un drôle de chevalier. Je m\'en souviendrai… Raoul vous attendra à Antioche.')],
          sinon: [D('bertrand', 'Raoul me fera sortir. Il vous attendra à Antioche, et il aura d\'autres lames que celle-ci.')] },
        D('yusuf', 'Merci. Je ne suis pas de ton camp, chevalier… mais Raoul n\'est du camp de personne. Je vous aiderai à lire le Codex.')
      ],
      recompense: { or: 120, arme: 'durandal', renom: 15, compagnon: 'yusuf' }
    },
    antioche: {
      lieu: 'antioche', titre: 'La tour des Deux-Sœurs', objectif: 'Rejoins le siège d\'Antioche.', date: '3 juin 1098',
      fait: 'Après huit mois de siège, un officier de la ville, Firouz, ouvre une tour à Bohémond dans la nuit du 2 au 3 juin 1098. Quelques jours plus tard, la grande armée de Kerbogha de Mossoul encercle les croisés à leur tour.',
      avant: [
        D('narrateur', 'Huit mois de siège. La faim, la pluie, les maladies. Les murailles d\'Antioche sont immenses.'),
        D('firouz', 'Je garderai la tour ouverte cette nuit. Mais des tueurs rôdent : une femme verte, avec une épée venue de l\'Orient lointain.'),
        D('yusuf', 'Kusanagi ! L\'épée des empereurs du Japon. Raoul l\'a fait voler à une caravane de la route de la soie.'),
        { si: 'romains', alors: [D('tatikios', 'L\'empereur veut Antioche, c\'est le serment des barons. Ne l\'oublie pas, Nikolaos.')],
          sinon: [D('bohemond', 'Celui qui prendra la ville la gardera. C\'est moi qui ai trouvé Firouz. Ne l\'oublie pas, jeune homme.')] }
      ],
      combat: 'antioche',
      apres: [
        D('vipere', 'Raoul… avait dit… que tu étais un simple écuyer…'),
        D('yusuf', 'Kusanagi est à toi. Mais une question brûle déjà : à qui reviendra Antioche ?'),
        C({ t: 'Rendre Antioche à l\'empereur, comme promis par serment.', e: { drapeau: 'antioche_romaine', fav: { romains: 2, latins: -1 } } },
          { t: 'Laisser Antioche à Bohémond, qui l\'a conquise.', e: { drapeau: 'antioche_latine', fav: { latins: 2, romains: -1 } } }),
        { si: 'antioche_romaine', alors: [D('narrateur', 'Histoire alternative : grâce à toi, le serment est tenu. Antioche redevient romaine, et l\'empereur promet une flotte pour la suite de la croisade.')],
          sinon: [D('narrateur', 'Comme dans l\'Histoire, Bohémond garde Antioche. L\'empereur Alexis ne pardonnera jamais ce serment brisé.')] }
      ],
      recompense: { or: 150, arme: 'kusanagi', renom: 15 }
    },
    kerbogha: {
      lieu: 'antioche', titre: 'La sortie contre Kerbogha', objectif: 'Défends Antioche contre l\'armée de Kerbogha.', date: '28 juin 1098',
      fait: 'Assiégés et affamés, les croisés reprennent courage quand un pèlerin, Pierre Barthélemy, dit avoir trouvé la Sainte Lance dans une église. Le 28 juin 1098, ils sortent et battent l\'armée de Kerbogha, divisée par les rivalités entre émirs.',
      avant: [
        D('adhemar', 'Mes frères, la Lance a été trouvée ! Nous sortirons tous, à pied s\'il le faut, car nos chevaux sont morts de faim.'),
        D('yusuf', 'Les émirs de Kerbogha se détestent entre eux. Si vous tenez bon, ils partiront chacun de leur côté.'),
        C({ t: '« Ensemble, nous tiendrons ! » (encourager les troupes)', e: { renom: 5 } },
          { t: '« Yusuf, va parler aux émirs déserteurs. » (diplomatie)', e: { drapeau: 'diplomate', aff: { zoe: 1 } } })
      ],
      combat: 'kerbogha',
      apres: [
        D('narrateur', 'L\'armée de Kerbogha se disperse. Antioche est sauvée. Un mois plus tard, le légat Adhémar meurt de la maladie qui ravage la ville.'),
        D('yusuf', 'Le Codex parle d\'une forge dans les montagnes du Liban. C\'est là que Raoul cherche les dernières armes. Il faut y aller avant lui.')
      ],
      recompense: { or: 160, renom: 20 }
    },
    liban: {
      lieu: 'liban', titre: 'Le Sanctuaire des Forgerons', objectif: 'Trouve la forge cachée dans les montagnes du Liban.', date: 'Hiver 1099',
      fait: 'Les Forgerons de l\'Aube sont une invention du jeu. Mais le Liban était célèbre pour ses cèdres, et Damas pour son acier « damassé », recherché dans tout le monde médiéval.',
      avant: [
        D('narrateur', 'La neige recouvre des colonnes taillées dans la montagne. Des statues de pierre gardent une porte de bronze.'),
        D('yusuf', 'Les Forgerons de l\'Aube… Ils ont rassemblé les armes des légendes de tous les peuples, pour qu\'aucun roi ne les possède toutes.'),
        D('raoul', 'Trop tard, petit croisé ! Mes hommes sont déjà à l\'intérieur. Que les gardiens vous écrasent !')
      ],
      combat: 'liban',
      apres: [
        D('narrateur', 'Au cœur de la forge, une épée attend dans un rayon de lumière.'),
        D('yusuf', 'Excalibur… La légende bretonne dit que la Dame du Lac l\'a reprise. Les Forgerons l\'ont gardée ici. Mais regarde : deux socles sont vides.'),
        D('heros', 'Gungnir et Gáe Bolg… Raoul les a. Il nous attend à Jérusalem.')
      ],
      recompense: { or: 180, arme: 'excalibur', renom: 20 }
    },
    jerusalem: {
      lieu: 'jerusalem', titre: 'Jérusalem', objectif: 'Rejoins l\'armée devant Jérusalem.', date: '15 juillet 1099',
      fait: 'Le 15 juillet 1099, les croisés entrent dans Jérusalem par la tour de siège de Godefroy. Les chroniqueurs des deux camps racontent un massacre terrible des habitants, musulmans et juifs. Le gouverneur Iftikhar ad-Dawla négocie sa reddition avec Raymond de Toulouse et sauve sa garnison. Godefroy refuse le titre de roi et devient « avoué du Saint-Sépulcre ».',
      avant: [
        D('narrateur', 'Juillet 1099. Il fait une chaleur écrasante. Les tours de siège sont prêtes, construites avec le bois des navires génois.'),
        D('yusuf', 'Dans cette ville vivent des musulmans, des juifs, des chrétiens d\'Orient. Ils ne sont pour rien dans les guerres des princes.'),
        D('raoul', 'Viens donc, {heros} ! Avec Gungnir, Gáe Bolg et le chaos de la bataille, personne ne m\'arrêtera !'),
        C({ t: 'Protéger les habitants pendant l\'assaut.', e: { drapeau: 'protecteur', renom: 10, aff: { melisende: 1, zoe: 1 } } },
          { t: 'Aider Raymond à négocier avec Iftikhar ad-Dawla.', e: { drapeau: 'paix', fav: { latins: 1, romains: 1 } } },
          { t: 'Ne penser qu\'à Raoul et aux armes.', e: { drapeau: 'vengeur' } })
      ],
      combat: 'jerusalem',
      apres: [
        D('raoul', 'Les légendes… devaient m\'appartenir… toutes…'),
        D('heros', 'Elles n\'appartiennent à personne, Raoul. Ce sont les histoires des peuples.'),
        { si: 'paix', alors: [
          D('iftikhar', 'Ta parole a sauvé ma garnison et des milliers de vies. Je ne l\'oublierai pas.'),
          D('narrateur', 'Histoire alternative : la reddition négociée s\'étend à toute la ville. Le massacre du 15 juillet n\'a pas lieu.')
        ], sinon: [
          { si: 'protecteur', alors: [D('narrateur', 'L\'Histoire ne peut pas être effacée : la ville connaît un massacre terrible. Mais devant la maison que tu gardes, des familles survivent grâce à toi.')],
            sinon: [D('narrateur', 'Pendant que tu poursuivais Raoul, la ville a connu un massacre terrible, que les chroniqueurs des deux camps raconteront avec horreur.')] }
        ] },
        { si: 'bertrand_epargne', alors: [D('bertrand', 'Je t\'avais dit que je m\'en souviendrais. J\'ai retenu les hommes de Raoul à la porte de David. Nous sommes quittes.')] },
        D('gerard', 'Je suis Gérard, de l\'Hôpital Saint-Jean. Nous soignons tous les blessés, quelle que soit leur foi. Si tu cherches des frères pour te suivre, ils sont à toi.')
      ],
      recompense: { or: 300, arme: 'gungnir', renom: 40, fin: true }
    }
  };

  var HISTOIRE = {
    latins: [
      { lieu: 'bouillon', titre: 'Prologue : l\'abbaye en feu', objectif: 'Défends l\'abbaye de Bouillon.', date: 'Août 1096',
        fait: 'Godefroy de Bouillon, duc de Basse-Lotharingie, met son château de Bouillon en gage chez l\'évêque de Liège pour payer son départ. Il part en août 1096 avec son frère Baudouin.',
        avant: [
          D('narrateur', 'Ardennes, été 1096. Tout le pays ne parle que de la croisade.'),
          D('anselme', '{heros}, approche. Ce livre est le Codex des Lames. Il dit où sont cachées les armes des légendes : Excalibur, Durandal, Mjöllnir…'),
          D('heros', 'Des contes pour enfants, frère Anselme.'),
          D('anselme', 'Raoul le Noir ne pense pas comme toi. Ses brigands sont déjà dans la forêt. Prends l\'épée. Défends l\'abbaye !')
        ],
        combat: 'bouillon',
        apres: [
          D('anselme', 'Tu t\'es bien battu. Garde le Codex. Pars avec le duc Godefroy, et trouve les armes avant Raoul.'),
          D('godefroy', 'Écuyer ! On m\'a raconté ton courage. Ma route passe par la Hongrie et Constantinople. Rassemble des hommes et rejoins-moi.'),
          C({ t: '« Je vous suivrai jusqu\'à Jérusalem, monseigneur. »', e: { fav: { latins: 1 } } },
            { t: '« Je pars surtout pour arrêter Raoul. »', e: { renom: 3 } })
        ],
        recompense: { or: 80, arme: 'masse', renom: 10, tuto: true } },
      { lieu: 'hongrie', titre: 'Les pillards de Hongrie', objectif: 'Va à Esztergom, chez le roi Coloman.', date: 'Septembre 1096',
        fait: 'Après les pillages de la croisade populaire, le roi Coloman exige des otages : Baudouin, le frère de Godefroy, garantit que l\'armée traversera la Hongrie en paix. Ce fut le cas.',
        avant: [
          D('coloman', 'Les derniers pèlerins ont pillé mes villages. Et voilà que des hommes en noir brûlent mes fermes en criant le nom de Godefroy !'),
          D('melisende', 'Ce sont les hommes de Raoul, majesté. Ils veulent que la Hongrie attaque les croisés.'),
          D('heros', 'Et toi, qui es-tu ? Tu manies l\'épée mieux que la plupart des sergents.'),
          D('melisende', 'Mélisende, de Liège. Mon père ne voulait pas que je parte. Je suis partie quand même.'),
          C({ t: '« Bienvenue parmi nous, Mélisende. »', e: { aff: { melisende: 1 } } },
            { t: '« Une femme à la guerre ? Prouve-le. »', e: { aff: { melisende: -1 } } })
        ],
        combat: 'hongrie',
        apres: [
          D('coloman', 'Vous avez rendu justice à mon peuple. Vos armées traverseront la Hongrie en paix.'),
          D('melisende', 'Je viens avec toi. Raoul a brûlé une ferme où dormaient des enfants : j\'ai une dette envers eux.')
        ],
        recompense: { or: 100, arme: 'hache', renom: 10, compagnon: 'melisende' } },
      { lieu: 'constantinople', titre: 'Le serment de Constantinople', objectif: 'Rejoins Godefroy à Constantinople.', date: 'Avril 1097',
        fait: 'L\'empereur Alexis Ier exige que les barons lui jurent de rendre les villes autrefois romaines. Godefroy refuse longtemps ; ses troupes se battent même contre les Byzantins en avril 1097, avant de prêter serment.',
        avant: [
          D('alexis', 'Jurez-moi de rendre à l\'Empire les villes que vous prendrez, et mes navires vous feront passer en Asie.'),
          D('godefroy', '{heros}, qu\'en penses-tu ? Nos hommes grondent. Certains veulent se battre.'),
          C({ t: '« Jurons. Sans l\'empereur, pas de vivres ni de guides. »', e: { drapeau: 'serment', fav: { romains: 2 } } },
            { t: '« Ne jurons rien. Nous ne sommes pas ses vassaux. »', e: { drapeau: 'refus', fav: { latins: 1, romains: -2 } } }),
          D('zoe', 'Je suis Zoé Argyre, capitaine du dromon « Saint-Phocas ». L\'empereur m\'a chargée de vous surveiller. Ne le prenez pas mal.'),
          D('thorvald', 'Et moi, je suis Thorvald. Avant de jurer quoi que ce soit, petit Franc, viens donc dans l\'arène des Varègues. On verra ce que vaut ton bras.')
        ],
        combat: 'varegues',
        apres: [
          D('thorvald', 'Ha ! Ça faisait trente hivers qu\'on ne m\'avait pas fait plier le genou. Ce marteau vient du Nord. Mon grand-père disait que c\'était celui de Thor.'),
          D('thorvald', 'Il a besoin d\'un bras jeune. Prends Mjöllnir. Et ne le perds pas aux dés.'),
          { si: 'refus', alors: [D('narrateur', 'Comme dans l\'Histoire, Godefroy finit quand même par jurer, après quelques escarmouches.')] },
          D('zoe', 'Bon. Je crois que je vais aimer vous surveiller.')
        ],
        recompense: { or: 120, arme: 'mjollnir', renom: 15, compagnon: 'zoe' } },
      { lieu: 'nicee', titre: 'Le siège de Nicée', objectif: 'Rejoins le siège de Nicée.', date: 'Mai-juin 1097',
        fait: 'Les croisés assiègent Nicée et battent l\'armée de secours de Kılıç Arslan le 16 mai 1097. Mais la ville se rend en secret aux Byzantins, qui ont fait porter des bateaux jusqu\'au lac Ascanie.',
        avant: [
          D('raymond', 'Le sultan Kılıç Arslan revient avec son armée ! Tenez la ligne au sud de la ville !'),
          D('melisende', 'Ils sont rapides, et leurs archers ne s\'arrêtent jamais. Bouge, ne reste pas immobile !')
        ],
        combat: 'nicee',
        apres: [
          D('narrateur', 'Quelques jours plus tard, les croisés découvrent les drapeaux impériaux sur les murs : Nicée s\'est rendue aux Romains.'),
          D('zoe', 'Ne faites pas cette tête. L\'empereur a épargné la ville. Vous auriez préféré la piller ?'),
          C({ t: '« Tu as raison, c\'est mieux ainsi. »', e: { aff: { zoe: 1 }, fav: { romains: 1 } } },
            { t: '« Mes hommes voulaient leur butin. »', e: { fav: { latins: 1 } } })
        ],
        recompense: { or: 120, renom: 10 } },
      commun.dorylee,
      commun.antioche,
      commun.kerbogha,
      commun.liban,
      { lieu: 'jaffa', titre: 'Les navires de Jaffa', objectif: 'Protège les navires génois à Jaffa.', date: 'Juin 1099',
        fait: 'En juin 1099, une flotte génoise arrive à Jaffa. Les marins démontent leurs navires pour apporter le bois des tours de siège devant Jérusalem.',
        avant: [
          D('zoe', 'Des galères fatimides arrivent d\'Ascalon pour brûler les navires génois. Sans ce bois, pas de tours de siège.'),
          D('zoe', 'Tu sais tenir une barre ? Prends un navire. Je te montrerai.'),
          C({ t: '« Avec toi à mes côtés, je ne crains pas la mer. »', e: { aff: { zoe: 2 } } },
            { t: '« Allons-y. »', e: {} })
        ],
        combat: 'jaffa',
        apres: [
          D('narrateur', 'Les galères ennemies fuient. Les Génois déchargent poutres, cordes et clous.'),
          D('zoe', 'Pas mal, pour un Franc. Pas mal du tout.')
        ],
        recompense: { or: 150, renom: 15 } },
      commun.jerusalem
    ],
    romains: [
      { lieu: 'constantinople', titre: 'Prologue : des tueurs aux Blachernes', objectif: 'Défends le palais des Blachernes.', date: 'Décembre 1096',
        fait: 'L\'empereur Alexis Ier Comnène a demandé l\'aide du pape contre les Turcs. Mais il voit arriver des armées entières, et s\'en méfie : en 1081, le Normand Robert Guiscard avait attaqué l\'Empire.',
        avant: [
          D('narrateur', 'Constantinople, hiver 1096. Les armées franques campent devant les murailles.'),
          D('alexis', 'Nikolaos, tu es le plus loyal de mes officiers. Les Latins arrivent par milliers. Je veux que tu les accompagnes jusqu\'à Jérusalem, et que tu me rapportes tout.'),
          D('anne', 'Père, un homme masqué a été vu dans les jardins. On dit qu\'il cherche un vieux livre : le Codex des Lames.'),
          D('thorvald', 'Des tueurs dans le palais ! Nikolaos, à moi ! Montre-moi que les Romains savent encore se battre !')
        ],
        combat: 'palais',
        apres: [
          D('thorvald', 'Bah, je me suis fait vieux. Tu m\'as battu à l\'entraînement et tu as sauvé l\'empereur. Ce marteau vient du Nord : Mjöllnir, l\'arme de Thor.'),
          D('alexis', 'Ces tueurs portaient le sceau de Raoul le Noir, un chevalier latin maudit. Il veut ce Codex. Le voici : trouve les armes avant lui.'),
          D('zoe', 'Zoé Argyre, capitaine du « Saint-Phocas ». L\'empereur dit que tu auras besoin d\'un navire. Et peut-être d\'une amie.'),
          C({ t: '« Une amie ? Je ne dis jamais non. »', e: { aff: { zoe: 1 } } },
            { t: '« Un navire suffira, capitaine. »', e: {} })
        ],
        recompense: { or: 120, arme: 'mjollnir', renom: 10, compagnon: 'zoe', tuto: true } },
      { lieu: 'durazzo', titre: 'Le naufrage d\'Hugues', objectif: 'Sauve Hugues de Vermandois à Dyrrachium.', date: 'Novembre 1096',
        fait: 'Hugues de Vermandois, frère du roi de France, fait naufrage près de Dyrrachium. Les Byzantins le recueillent et l\'escortent, avec tous les honneurs… et sous bonne garde, jusqu\'à Constantinople.',
        avant: [
          D('zoe', 'Une tempête a jeté la flotte d\'Hugues de Vermandois sur la côte. Et des pirates rôdent autour des épaves.'),
          D('zoe', 'Écoute bien : Z et S pour la vitesse, Q et D pour tourner. Espace pour tirer. Et E pour le feu grégeois. Notre secret.')
        ],
        combat: 'durazzo',
        apres: [
          D('narrateur', 'Hugues est sauvé, trempé jusqu\'aux os, mais toujours fier comme un roi.'),
          D('melisende', 'Je suis Mélisende de Liège. J\'étais sur le navire d\'Hugues. Merci, Romain. Les Latins ne sont pas tous des brutes, tu sais.'),
          C({ t: '« Et les Romains ne sont pas tous des espions. »', e: { aff: { melisende: 1 } } },
            { t: '« On verra bien. »', e: {} })
        ],
        recompense: { or: 120, renom: 10, compagnon: 'melisende' } },
      { lieu: 'nicee', titre: 'Les bateaux du lac Ascanie', objectif: 'Fais naviguer la flotte sur le lac de Nicée.', date: 'Juin 1097',
        fait: 'Pour couper le ravitaillement de Nicée par le lac Ascanie, Alexis fait transporter des bateaux par voie de terre. Encerclée, la ville se rend en secret aux Byzantins le 19 juin 1097.',
        avant: [
          D('tatikios', 'L\'empereur a fait porter des bateaux sur des chariots jusqu\'au lac. Coupe le ravitaillement de Nicée et la ville se rendra à nous, pas aux Latins.'),
          D('melisende', 'Vous négociez dans le dos des barons ? Ce n\'est pas très honnête.'),
          C({ t: '« C\'est pour épargner la ville et ses habitants. »', e: { aff: { melisende: 1 }, fav: { romains: 1 } } },
            { t: '« C\'est la politique de l\'empereur. »', e: { fav: { romains: 1 } } })
        ],
        combat: 'ascanie',
        apres: [
          D('narrateur', 'Au matin, les drapeaux impériaux flottent sur Nicée. Les Latins sont furieux, mais la ville n\'est pas pillée.')
        ],
        recompense: { or: 140, renom: 10 } },
      commun.dorylee,
      commun.antioche,
      commun.kerbogha,
      { lieu: 'rhodes', titre: 'La flotte de Pise', objectif: 'Intercepte la flotte pisane devant Rhodes.', date: 'Printemps 1099',
        fait: 'En 1099, une flotte de Pise menée par l\'archevêque Daimbert pille les îles byzantines. La flotte impériale l\'attaque près de Rhodes avec des siphons à feu grégeois en forme de têtes de lion.',
        avant: [
          D('zoe', 'Les Pisans pillent nos îles en se disant croisés. L\'amiral veut qu\'on les arrête avant Chypre.'),
          D('zoe', 'Tu prends le commandement du « Saint-Phocas ». Je serai à ton côté. Ne gaspille pas le feu.'),
          C({ t: '« Je te confierais ma vie, Zoé. »', e: { aff: { zoe: 2 } } },
            { t: '« À vos ordres, capitaine. »', e: {} })
        ],
        combat: 'rhodes',
        apres: [D('narrateur', 'Les galères pisanes flambent sur l\'eau. La flotte romaine est maîtresse de la mer.')],
        recompense: { or: 160, renom: 15 } },
      commun.liban,
      commun.jerusalem
    ]
  };

  // Quêtes de légende (lieux à visiter librement, après le prologue)
  var LEGENDES = {
    aix: { titre: 'La crypte de Charlemagne', arme: 'joyeuse', combat: 'aix',
      avant: [D('narrateur', 'Sous la chapelle d\'Aix, une crypte oubliée. Des chevaliers fantômes montent la garde.'), D('heros', 'Si Joyeuse est ici… il faudra la mériter.')],
      apres: [D('narrateur', 'Le spectre s\'incline et disparaît. Joyeuse brille dans le noir, changeant de couleur à chaque souffle.')] },
    valence: { titre: 'Le défi du Cid', arme: 'tizona', combat: 'valence',
      avant: [D('cid', 'Un voyageur venu chercher Tizona ? Je suis vieux et malade, mais je ne la donne qu\'à celui qui me bat.'), D('heros', 'C\'est un honneur de croiser le fer avec le Cid.')],
      apres: [D('cid', 'Bien. Très bien. Garde-la, et sers-toi d\'elle avec justice. Moi, je n\'ai plus beaucoup de batailles devant moi.'), D('narrateur', 'Le Cid meurt quelques mois plus tard, en juillet 1099. Sa femme Chimène défendra encore Valence pendant trois ans.')] },
    dublin: { titre: 'Le tertre de Cú Chulainn', arme: 'gaebolg', combat: 'dublin',
      avant: [D('narrateur', 'Brouillard sur la colline. Une voix gronde : « Qui ose réveiller le chien de Culann ? »')],
      apres: [D('narrateur', 'Le géant vert se dissout dans la brume. Une lance aux mille pointes reste plantée dans la terre.'), D('heros', 'Gáe Bolg… mais Raoul en avait une copie ? Ou celle-ci est-elle la vraie ?')] },
    bagdad: { titre: 'Le marchand de Chang\'an', arme: 'ruyi', combat: 'bagdad',
      avant: [D('marchand', 'Ce bâton ? Il vient du fond des mers de l\'Est. Le Roi Singe lui-même le portait. Mais il refuse les maîtres trop lents.'), D('narrateur', 'Un rire aigu éclate. Un singe à la couronne d\'or bondit des toits !')],
      apres: [D('marchand', 'Le Roi Singe rit encore. Je crois qu\'il t\'aime bien. Le bâton est à toi.')] }
  };

  // ---------- Compagnons et romance ----------
  // Conversations à la taverne. min = étape minimum de l'histoire. La dernière ouvre la romance si affection >= 6.
  var COMPAGNONS = {
    melisende: { nom: 'Mélisende de Liège', unite: { nom: 'Mélisende', pv: 140, deg: 16, vit: 3.8, arme: 'epee', look: { peau: 0xffdbac, tunique: 0x1f618d, croix: 0xf4d03f, pantalon: 0x34495e, casque: 'aucun', cheveux: 0xd35400, bouclier: 'kite', bc: 0x1f618d }, garde: 0.45 },
      discussions: [
        { min: 1, d: [D('melisende', 'Mon père est drapier à Liège. Il voulait me marier à un vieux marchand de laine.'), D('melisende', 'Alors j\'ai pris l\'épée de mon frère et je suis partie. Tu me trouves folle ?'),
          C({ t: '« Je te trouve courageuse. »', e: { aff: { melisende: 2 } } }, { t: '« Un peu folle, oui. »', e: { aff: { melisende: 0 } } })] },
        { min: 4, d: [D('melisende', 'Les Turcs que nous avons combattus… ils prient, ils ont peur, comme nous. Tu y penses, parfois ?'),
          C({ t: '« Tout le temps. La guerre n\'a rien de saint. »', e: { aff: { melisende: 2 } } }, { t: '« Je préfère ne pas y penser. »', e: { aff: { melisende: 1 } } })] },
        { min: 7, romance: true, d: [D('melisende', 'Quand tout ça sera fini… je ne rentrerai pas à Liège. Je veux voir le monde.'), D('melisende', 'Et je crois que je voudrais le voir avec toi.'),
          C({ t: '« Alors nous le verrons ensemble. » (romance)', e: { aff: { melisende: 3 }, drapeau: 'romance_melisende' } }, { t: '« Tu es une amie précieuse, Mélisende. »', e: { aff: { melisende: 1 } } })] }
      ] },
    zoe: { nom: 'Zoé Argyre', unite: { nom: 'Zoé', pv: 130, deg: 15, vit: 4.2, arme: 'spathion', look: { peau: 0xe0ac69, tunique: 0x7d3c98, croix: 0xf1c40f, pantalon: 0x1b2631, casque: 'aucun', cheveux: 0x1c1c1c }, garde: 0.4 },
      discussions: [
        { min: 1, d: [D('zoe', 'Ma mère était capitaine avant moi. Les marins disaient qu\'une femme sur un pont porte malheur.'), D('zoe', 'Elle a coulé onze pirates. Ils ont arrêté de le dire.'),
          C({ t: '« Je comprends d\'où te vient ton caractère. »', e: { aff: { zoe: 2 } } }, { t: '« Onze seulement ? »', e: { aff: { zoe: 1 } } })] },
        { min: 4, d: [D('zoe', 'À la cour, tout le monde ment. Michel le logothète, Anne qui écrit tout… Avec toi, je n\'ai pas besoin de jouer.'),
          C({ t: '« Avec moi, tu peux toujours être toi-même. »', e: { aff: { zoe: 2 } } }, { t: '« Méfie-toi quand même de tout le monde. »', e: { aff: { zoe: 1 } } })] },
        { min: 7, romance: true, d: [D('zoe', 'Le « Saint-Phocas » a besoin d\'un second capitaine. Pour toujours, si possible.'), D('zoe', 'C\'est ma façon de te dire que je t\'aime. Je ne suis pas douée pour les poèmes.'),
          C({ t: '« Je serai ton second. Pour toujours. » (romance)', e: { aff: { zoe: 3 }, drapeau: 'romance_zoe' } }, { t: '« Tu es ma meilleure alliée, Zoé. »', e: { aff: { zoe: 1 } } })] }
      ] },
    yusuf: { nom: 'Yusuf ibn Rashid', unite: null, discussions: [
      { min: 4, d: [D('yusuf', 'À Damas, j\'enseignais l\'astronomie. Vos savants latins traduisent nos livres, tu sais : Avicenne, al-Khwarizmi… Le mot « algorithme » vient de son nom.'), D('heros', 'Je l\'ignorais.'), D('yusuf', 'Les guerres passent. Les livres restent.')] },
      { min: 6, d: [D('yusuf', 'Les gens de mon peuple appellent cette guerre l\'invasion des « Francs ». Pour eux, vous êtes des barbares venus de nulle part.'),
        C({ t: '« Et toi, que penses-tu de moi ? »', e: { renom: 2 } }), D('yusuf', 'Je pense que tu es un barbare qui écoute. C\'est déjà rare.')] }
    ] }
  };

  // ---------- Héros de taverne (compagnons à engager, personnages inventés) ----------
  // Ils changent de taverne tous les 10 jours (villes de leur liste). talent : voir TALENTS.
  var TALENTS = {
    guerrier: { nom: 'Guerrier', icone: '⚔️', desc: 'Très solide au combat.' },
    medecin: { nom: 'Médecin', icone: '🩺', desc: 'Soigne les blessés : un tiers de morts en moins après chaque combat.' },
    marchand: { nom: 'Marchand', icone: '⚖️', desc: 'Négocie : achats 8 % moins chers, ventes 6 % plus chères.' },
    instructeur: { nom: 'Maître d\'armes', icone: '🎯', desc: 'Entraîne tes troupes : +50 % d\'expérience.' },
    intendant: { nom: 'Intendant', icone: '🐴', desc: 'Organise les bagages : +15 de chargement.' },
    recruteur: { nom: 'Recruteuse', icone: '📯', desc: 'Connue partout : +2 volontaires dans chaque village.' },
    archer: { nom: 'Archère', icone: '🏹', desc: 'Tire de loin pendant les batailles.' }
  };
  var HEROS = [
    { id: 'ingrid', nom: 'Ingrid Haraldsdóttir', talent: 'guerrier', prix: 220, villes: ['bergen', 'roskilde', 'uppsala', 'novgorod', 'constantinople'],
      pres: 'Fille d\'un chef norvégien. Elle veut entrer dans la garde varègue de l\'empereur.',
      look: { peau: 0xffdbac, cheveux: 0xf4d03f, longs: true, casque: 0x95a5a6 },
      unite: { pv: 170, deg: 19, vit: 3.6, arme: 'hache', look: { peau: 0xffdbac, tunique: 0x5d6d7e, pantalon: 0x3e2723, casque: 'nasal', cheveux: 0xf4d03f, bouclier: 'rond', bc: 0xa93226 }, garde: 0.4 },
      d: ['Chez moi, on dit qu\'une hache bien tenue vaut dix prières. Les prêtres n\'aiment pas.', 'Mon grand-père a vu Miklagard, la grande ville des Grecs. Il disait que les toits étaient en or.'] },
    { id: 'salomon', nom: 'Salomon de Narbonne', talent: 'medecin', prix: 160, villes: ['toulouse', 'barcelone', 'genes', 'rome', 'alexandrie'],
      pres: 'Médecin juif, il a lu les livres d\'Avicenne. Il soigne tout le monde, sans demander la religion.',
      look: { peau: 0xe0ac69, cheveux: 0x3e2723, barbe: 0x5d4037, capuche: 0x1a5276 },
      unite: { pv: 95, deg: 9, vit: 3.6, arme: 'lance', look: { peau: 0xe0ac69, tunique: 0x1a5276, pantalon: 0x34495e, casque: 'capuche', cheveux: 0x3e2723 }, garde: 0.5 },
      d: ['Lave-toi les mains avant de toucher une plaie. Personne ne me croit, mais mes blessés survivent.', 'Mon père a traduit des livres arabes en latin. Le savoir voyage plus loin que les armées.'] },
    { id: 'berenger', nom: 'Bérenger le Catalan', talent: 'marchand', prix: 150, villes: ['barcelone', 'genes', 'venise', 'palerme', 'acre'],
      pres: 'Ancien marchand de sel. Il connaît le prix de tout, et la valeur de pas grand-chose.',
      look: { peau: 0xf1c27d, cheveux: 0x6e2c00, barbe: 0x6e2c00 },
      unite: { pv: 110, deg: 12, vit: 3.8, arme: 'epee', look: { peau: 0xf1c27d, tunique: 0xb7950b, pantalon: 0x641e16, casque: 'chapel', cheveux: 0x6e2c00, bouclier: 'kite', bc: 0xb7950b }, garde: 0.4 },
      d: ['Achète le sel à Venise, revends-le dans les montagnes. Voilà toute la science du commerce.', 'Un marchand sans escorte, c\'est un cadeau pour les brigands. Avec toi, je dors tranquille.'] },
    { id: 'vratislav', nom: 'Vratislav de Bohême', talent: 'instructeur', prix: 200, villes: ['prague', 'cracovie', 'ratisbonne', 'hongrie', 'cologne'],
      pres: 'Vieux maître d\'armes. Il a entraîné les gardes du duc de Bohême pendant vingt ans.',
      look: { peau: 0xffdbac, cheveux: 0xbdc3c7, barbe: 0xbdc3c7 },
      unite: { pv: 140, deg: 16, vit: 3.4, arme: 'epee', look: { peau: 0xffdbac, tunique: 0x922b21, pantalon: 0x1b2631, casque: 'heaume', cheveux: 0xbdc3c7, bouclier: 'kite', bc: 0xf4f6f6 }, garde: 0.55 },
      d: ['Un soldat qui transpire à l\'entraînement saigne moins à la guerre.', 'Le bouclier d\'abord, l\'épée ensuite. Les jeunes font toujours l\'inverse.'] },
    { id: 'olena', nom: 'Olena de Kiev', talent: 'recruteur', prix: 140, villes: ['kiev', 'novgorod', 'cracovie', 'hongrie', 'sofia'],
      pres: 'Messagère des princes de la Rus. Elle connaît chaque village entre Kiev et la mer Noire.',
      look: { peau: 0xffdbac, cheveux: 0x6e2c00, longs: true, bijou: 0xc0392b },
      unite: { pv: 115, deg: 12, vit: 4.4, arme: 'lance', look: { peau: 0xffdbac, tunique: 0xc0392b, pantalon: 0x1b4f72, casque: 'fourrure', cheveux: 0x6e2c00 }, garde: 0.35 },
      d: ['Dans un village, on ne commence pas par demander des hommes. On commence par manger le pain qu\'on t\'offre.', 'Les Coumans pillent nos villages chaque été. Ceux qui ont tout perdu suivront un chef juste.'] },
    { id: 'gerwin', nom: 'Gerwin le Frison', talent: 'intendant', prix: 130, villes: ['bruges', 'liege', 'cologne', 'londres', 'rouen'],
      pres: 'Il a mené des convois de laine de Flandre jusqu\'au Rhin. Aucun chariot ne s\'est jamais perdu.',
      look: { peau: 0xffdbac, cheveux: 0xd4ac0d, barbe: 0xd4ac0d },
      unite: { pv: 125, deg: 13, vit: 3.6, arme: 'hache', look: { peau: 0xffdbac, tunique: 0x1e8449, pantalon: 0x5d4037, casque: 'rond', cheveux: 0xd4ac0d, bouclier: 'rond', bc: 0x1e8449 }, garde: 0.4 },
      d: ['Une armée marche sur son ventre. Et sur ses chariots. Surtout sur ses chariots.', 'Trois mulets, deux charrettes et un âne têtu : avec ça, je porte une ville entière.'] },
    { id: 'nicephore', nom: 'Nicéphore le Vieux', talent: 'guerrier', prix: 210, villes: ['constantinople', 'thessalonique', 'andrinople', 'nicee', 'rhodes'],
      pres: 'Ancien officier de l\'armée romaine, blessé à Mantzikert en 1071. Il veut sa revanche sur les Turcs.',
      look: { peau: 0xe0ac69, cheveux: 0x7f8c8d, barbe: 0x7f8c8d, casque: 0xaab7b8 },
      unite: { pv: 160, deg: 17, vit: 3.3, arme: 'spathion', look: { peau: 0xe0ac69, tunique: 0x6c3483, pantalon: 0x1b2631, casque: 'rond', cheveux: 0x7f8c8d, bouclier: 'rond', bc: 0x6c3483 }, garde: 0.55 },
      d: ['À Mantzikert, j\'ai vu l\'empereur Romain Diogène tomber prisonnier. Je n\'oublierai jamais ce jour.', 'Les Latins chargent comme des taureaux. Courageux, mais les Turcs adorent les taureaux.'] },
    { id: 'ruggero', nom: 'Ruggero d\'Apulie', talent: 'guerrier', prix: 190, villes: ['bari', 'palerme', 'rome', 'durazzo', 'antioche'],
      pres: 'Cadet d\'une famille normande d\'Italie. Pas d\'héritage, alors il cherche fortune à l\'épée.',
      look: { peau: 0xf1c27d, cheveux: 0x1c1c1c, casque: 0xaab7b8 },
      unite: { pv: 150, deg: 18, vit: 3.9, arme: 'epee', look: { peau: 0xf1c27d, tunique: 0x2471a3, croix: 0xf4f6f6, pantalon: 0x34495e, casque: 'nasal', cheveux: 0x1c1c1c, bouclier: 'kite', bc: 0x2471a3 }, garde: 0.4 },
      d: ['Mon grand-père est parti de Normandie avec un cheval et une épée. Il est mort seigneur.', 'Bohémond paie bien. Mais il oublie vite ceux qui l\'ont servi.'] },
    { id: 'marta', nom: 'Marta d\'Édesse', talent: 'marchand', prix: 160, villes: ['edesse', 'antioche', 'alep', 'tripoli', 'chypre'],
      pres: 'Marchande arménienne de soie et d\'épices. Elle parle arménien, grec, arabe et un peu de latin.',
      look: { peau: 0xe0ac69, cheveux: 0x1c1c1c, longs: true, bijou: 0xf1c40f },
      unite: { pv: 105, deg: 11, vit: 4, arme: 'kilij', look: { peau: 0xe0ac69, tunique: 0x922b21, pantalon: 0x4a235a, casque: 'aucun', cheveux: 0x1c1c1c }, garde: 0.4 },
      d: ['La soie vient de très loin à l\'est. À chaque ville, son prix double. Devine qui gagne le plus ?', 'Les Arméniens étaient là bien avant les Turcs et les Francs. Nous serons encore là après.'] },
    { id: 'aysel', nom: 'Aysel la Turcopole', talent: 'archer', prix: 180, villes: ['nicee', 'dorylee', 'iconium', 'antioche', 'jaffa'],
      pres: 'Fille d\'un Turc et d\'une Grecque, elle tire à l\'arc depuis la selle. Elle se bat pour qui la paie bien.',
      look: { peau: 0xc68642, cheveux: 0x1c1c1c, longs: true },
      unite: { pv: 110, deg: 12, vit: 4.6, arme: 'kilij', tir: { deg: 14, cad: 1.8, portee: 24 }, look: { peau: 0xc68642, tunique: 0x117a65, pantalon: 0x3e2723, casque: 'aucun', cheveux: 0x1c1c1c }, garde: 0.35 },
      d: ['Mon père disait : un arc, un cheval et le vent. Le reste, c\'est pour les gens lents.', 'Chez les Turcs, on m\'appelle la Grecque. Chez les Grecs, la Turque. Alors je préfère « Aysel ».'] }
  ];
  HEROS.forEach(function (h) {
    PERSOS[h.id] = { nom: h.nom, look: h.look };
    h.unite.nom = h.nom.split(' ')[0];
    COMPAGNONS[h.id] = { nom: h.nom, taverne: true, talent: h.talent, prix: h.prix, villes: h.villes, pres: h.pres, unite: h.unite,
      discussions: h.d.map(function (t) { return { min: 0, d: [D(h.id, t)] }; }) };
  });

  // ---------- Cours et intrigues ----------
  var COURS = {
    constantinople: { titre: 'La cour impériale des Blachernes', courtisans: [
      { id: 'alexis', role: 'Empereur', desc: 'Rusé et patient, il veut récupérer l\'Anatolie sans perdre son armée.', rumeur: 'L\'empereur paie les Petchénègues pour surveiller les croisés… et les empêcher de piller.' },
      { id: 'anne', role: 'Princesse et historienne', desc: 'Fille de l\'empereur. Plus tard, elle écrira l\'Alexiade, la vie de son père.', rumeur: 'Anne trouve Bohémond « grand, beau et terrifiant ». Elle l\'écrira dans son livre.' },
      { id: 'tatikios', role: 'Général', desc: 'Il guidera les croisés jusqu\'à Antioche. Il porte un nez en or depuis une blessure.', rumeur: 'Tatikios pense que les Latins n\'iront jamais jusqu\'à Jérusalem.' },
      { id: 'michel', role: 'Logothète (ministre) — personnage inventé', desc: 'Il sourit beaucoup, et compte encore plus.', rumeur: 'Michel reçoit des lettres scellées de cire noire…' }
    ], intrigues: [
      { id: 'logothete', min: 1, titre: 'Les lettres de cire noire', d: [
        D('anne', 'J\'ai vu Michel le logothète brûler une lettre au sceau noir. Le sceau de Raoul. Que faire ?'),
        C({ t: 'Le dénoncer à l\'empereur (avec la preuve d\'Anne).', e: { fav: { romains: 2 }, or: 80, drapeau: 'michel_arrete', renom: 5 } },
          { t: 'Le faire suivre pour remonter jusqu\'à Raoul.', e: { drapeau: 'michel_suivi', renom: 3 }, combat: { titre: 'Le rendez-vous secret', decor: 'nuit', vagues: [[['assassin', 3], ['noir', 1]]] } },
          { t: 'Le faire chanter : son silence contre de l\'or.', e: { or: 200, fav: { romains: -2 } } }),
        { si: 'michel_suivi', alors: [D('anne', 'Les tueurs gardaient une carte : Raoul cherche une forge dans les montagnes du Liban.')] }
      ] }
    ] },
    antioche: { titre: 'Le conseil des barons à Antioche', min: 5, courtisans: [
      { id: 'bohemond', role: 'Prince normand', desc: 'Ambitieux et brillant, il veut Antioche pour lui seul.', rumeur: 'Bohémond a promis à Firouz une fortune pour ouvrir la tour.' },
      { id: 'raymond', role: 'Comte de Toulouse', desc: 'Le plus riche des barons, rival de Bohémond. Il tient à son serment envers l\'empereur.', rumeur: 'Raymond refuse de quitter la tour qu\'il occupe dans Antioche.' },
      { id: 'tancrede', role: 'Neveu de Bohémond', desc: 'Jeune, fougueux, il n\'a jamais prêté serment à l\'empereur.', rumeur: 'Tancrède a traversé le Bosphore déguisé pour éviter de jurer.' },
      { id: 'adhemar', role: 'Légat du pape', desc: 'Le seul que tous écoutent. Il essaie de garder les barons unis.', rumeur: 'Adhémar écrit au patriarche grec pour apaiser les tensions.' }
    ], intrigues: [
      { id: 'barons', min: 5, titre: 'La querelle de Bohémond et Raymond', d: [
        D('adhemar', 'Bohémond et Raymond vont en venir aux mains pour une tour. Si l\'armée se divise, Raoul gagnera.'),
        C({ t: 'Soutenir Bohémond.', e: { fav: { latins: 1 }, or: 100 } },
          { t: 'Soutenir Raymond et le serment.', e: { fav: { romains: 1, latins: 1 } } },
          { t: 'Proposer un tournoi pour les départager (combat).', e: { renom: 10 }, combat: { titre: 'Le tournoi des barons', decor: 'ville', vagues: [[['normand', 2]], [['chevalier', 2]]], amical: true } }),
        D('adhemar', 'Merci. Pour un temps, la paix est revenue sous les murs d\'Antioche.')
      ] }
    ] },
    jerusalem: { titre: 'La cour de l\'avoué du Saint-Sépulcre', min: 99, courtisans: [
      { id: 'godefroy', role: 'Avoué du Saint-Sépulcre', desc: 'Il refuse de porter une couronne d\'or là où le Christ a porté une couronne d\'épines.', rumeur: 'Godefroy mourra en 1100 ; son frère Baudouin deviendra le premier roi de Jérusalem.' },
      { id: 'gerard', role: 'Recteur de l\'Hôpital', desc: 'Il soigne pèlerins et blessés de toutes les religions.', rumeur: 'L\'Hôpital deviendra l\'ordre de Saint-Jean, les Hospitaliers. En 1119 naîtra un autre ordre : les Templiers.' }
    ], intrigues: [] }
  };

  // Recrutement par ville : unités de la ville (sans compter tes troupes de faction)
  var RECRUES = {
    bruges: ['milicien', 'sergent', 'arbaletrier'], bouillon: ['milicien', 'sergent', 'chevalier', 'chevalier_monte'], aix: ['sergent', 'chevalier'], cologne: ['milicien', 'sergent', 'arbaletrier'],
    clermont: ['milicien', 'sergent', 'chevalier', 'chevalier_monte'], ratisbonne: ['milicien', 'sergent'], hongrie: ['milicien', 'sergent', 'arbaletrier'],
    belgrade: ['skutatos', 'petchenegue'], nis: ['skutatos', 'petchenegue'], sofia: ['skutatos', 'petchenegue'], andrinople: ['skutatos', 'toxotes', 'petchenegue'],
    constantinople: ['skutatos', 'toxotes', 'varegue', 'turcopole', 'petchenegue', 'cataphracte'], durazzo: ['skutatos', 'toxotes'], thessalonique: ['skutatos', 'toxotes', 'cataphracte'],
    venise: ['arbaletrier', 'sergent'], genes: ['genois', 'arbaletrier'], rome: ['milicien', 'sergent', 'normand'], bari: ['normand', 'sergent'],
    valence: ['sergent', 'chevalier'], dublin: ['milicien'], rhodes: ['skutatos', 'toxotes'], chypre: ['skutatos', 'toxotes'],
    edesse: ['armenien'], antioche: ['turcopole', 'armenien'], lattaquie: ['skutatos', 'toxotes'], jaffa: ['genois'], jerusalem: ['hospitalier', 'turcopole'],
    liege: ['milicien', 'sergent', 'chevalier'], paris: ['milicien', 'sergent', 'chevalier'], rouen: ['sergent', 'normand', 'arbaletrier'], toulouse: ['milicien', 'sergent', 'chevalier'],
    londres: ['milicien', 'sergent', 'huscarl'], dunfermline: ['milicien'], tolede: ['sergent', 'chevalier', 'chevalier_monte'], barcelone: ['sergent', 'arbaletrier'], saragosse: ['turcopole'],
    palerme: ['normand', 'turcopole'], knin: ['milicien', 'sergent'], prague: ['milicien', 'sergent'], cracovie: ['milicien', 'sergent', 'coumane'],
    kiev: ['druzhinnik', 'coumane', 'varegue'], novgorod: ['druzhinnik', 'milicien'], roskilde: ['huscarl', 'milicien'], bergen: ['huscarl'], uppsala: ['huscarl', 'milicien'],
    mayence: ['milicien', 'sergent', 'chevalier', 'chevalier_monte'], pise: ['arbaletrier', 'sergent'], lisbonne: ['almoravide'], seville: ['almoravide', 'turcopole'], mahdia: ['turcopole'],
    caire: ['turcopole', 'armenien'], ascalon: ['turcopole'], tarse: ['armenien', 'turcopole'], mossoul: ['turcopole'], trebizonde: ['skutatos', 'toxotes', 'varegue'], smyrne: ['turcopole', 'petchenegue']
  };

  // ---------- Marchandises et commerce ----------
  // prix de base en or ; chaque lieu PRODUIT (prix bas) ou RECHERCHE (prix haut) certaines marchandises
  var MARCH = {
    ble: { nom: 'Blé', icone: '🌾', prix: 8 }, vin: { nom: 'Vin', icone: '🍷', prix: 16 }, poisson: { nom: 'Poisson séché', icone: '🐟', prix: 9 },
    sel: { nom: 'Sel', icone: '🧂', prix: 12 }, laine: { nom: 'Laine', icone: '🐑', prix: 14 }, huile: { nom: 'Huile d\'olive', icone: '🫒', prix: 17 },
    fer: { nom: 'Fer', icone: '⛓️', prix: 22 }, drap: { nom: 'Drap de Flandre', icone: '🧵', prix: 40 }, verre: { nom: 'Verrerie', icone: '🏺', prix: 36 },
    papier: { nom: 'Papier', icone: '📜', prix: 32 }, ambre: { nom: 'Ambre', icone: '🟠', prix: 45 }, sucre: { nom: 'Sucre', icone: '🍬', prix: 50 },
    fourrures: { nom: 'Fourrures', icone: '🦊', prix: 55 }, encens: { nom: 'Encens', icone: '🕯️', prix: 60 }, epices: { nom: 'Épices', icone: '🌶️', prix: 70 },
    soie: { nom: 'Soie', icone: '🧣', prix: 90 }
  };
  var COMMERCE = {
    bruges: ['drap laine', 'vin epices'], liege: ['fer', 'vin soie'], bouillon: ['fer laine', 'epices'], aix: ['ble', 'soie'], cologne: ['vin fer', 'epices soie'],
    paris: ['ble vin', 'soie epices'], rouen: ['poisson', 'vin'], clermont: ['laine', 'sel'], toulouse: ['vin ble', 'sel'], ratisbonne: ['sel', 'epices'],
    londres: ['laine', 'vin drap'], dunfermline: ['laine poisson', 'vin'], dublin: ['laine', 'vin'], bergen: ['poisson', 'ble'], roskilde: ['poisson ambre', 'drap'],
    uppsala: ['fer fourrures', 'drap'], novgorod: ['fourrures', 'ble drap'], kiev: ['ble fourrures', 'soie vin'], cracovie: ['sel', 'drap'], prague: ['fer', 'sel'],
    hongrie: ['ble', 'drap'], venise: ['verre sel', 'epices soie'], genes: ['verre', 'laine epices'], rome: ['vin', 'encens'], bari: ['huile', 'drap'], palerme: ['sucre huile', 'fer'],
    tolede: ['fer', 'papier'], cordoue: ['papier huile', 'fer'], saragosse: ['huile', 'drap'], barcelone: ['vin', 'ble'], valence: ['sucre', 'fer'], knin: ['sel', 'drap'],
    belgrade: ['ble', 'vin'], nis: ['ble', 'sel'], sofia: ['laine', 'vin'], andrinople: ['ble vin', 'fer'], constantinople: ['soie', 'fourrures ble'], durazzo: ['sel', 'verre'],
    thessalonique: ['vin', 'drap'], rhodes: ['vin', 'ble'], chypre: ['sucre vin', 'ble'], nicee: ['laine', 'fer'], dorylee: ['laine', 'ble'], iconium: ['laine', 'drap'],
    antioche: ['soie', 'fer'], edesse: ['laine', 'fer'], alep: ['epices', 'drap'], lattaquie: ['huile', 'ble'], tripoli: ['sucre papier', 'fer'], acre: ['epices', 'verre'],
    jaffa: ['huile', 'drap'], jerusalem: ['encens', 'ble'], damas: ['epices papier', 'drap fourrures'], alexandrie: ['epices encens', 'fer drap'], bagdad: ['papier soie', 'fer ambre'],
    vezelay: ['vin ble', ''], mosony: ['ble', ''], ochrid: ['poisson', ''], philippopolis: ['vin ble', ''], melfi: ['huile ble', ''], heraclee: ['laine', ''],
    marash: ['laine fer', ''], shaizar: ['ble huile', ''], tiberiade: ['poisson ble', ''],
    mayence: ['vin', 'epices'], pise: ['fer verre', 'laine'], lisbonne: ['sel poisson', 'drap'], seville: ['huile', 'fer drap'], mahdia: ['huile', 'fer ble'],
    caire: ['sucre papier', 'fer fourrures'], ascalon: ['vin', 'fer'], tarse: ['ble', 'drap'], mossoul: ['drap', 'fer'], trebizonde: ['soie', 'ble'], smyrne: ['huile vin', 'fer'],
    cluny: ['vin', ''], compostelle: ['poisson', ''], athos: ['vin huile', ''], sambie: ['ambre', ''], steppe: ['laine fourrures', ''], naplouse: ['huile', ''],
    byblos: ['huile', ''], hasbaya: ['huile ble', ''], midyat: ['vin', ''], natroun: ['sel', '']
  };
  // ---------- Diplomatie : capitales, guerres de 1096, rivalités ----------
  var CAPITALES = { france: 'paris', empire: 'aix', flandre: 'bruges', normandie: 'rouen', toulouse: 'toulouse', angleterre: 'londres', ecosse: 'dunfermline',
    castille: 'tolede', barcelone: 'barcelone', almoravides: 'cordoue', saragosse: 'saragosse', papaute: 'rome', normands: 'bari', sicile: 'palerme', croatie: 'knin',
    boheme: 'prague', pologne: 'cracovie', rus: 'kiev', danemark: 'roskilde', norvege: 'bergen', suede: 'uppsala', pise: 'pise', zirides: 'mahdia', mossoul: 'mossoul',
    prusses: 'sambie', coumans: 'steppe', hongrie: 'hongrie', venise: 'venise', genes: 'genes', seldjoukides: 'nicee', emirs: 'damas', fatimides: 'caire',
    armeniens: 'edesse', abbassides: 'bagdad', cid: 'valence', irlande: 'dublin' };
  // Guerres réelles en 1096
  var GUERRES = [
    ['castille', 'almoravides'],   // la Reconquista : les Almoravides ont battu Alphonse VI à Sagrajas (1086)
    ['empire', 'papaute'],         // la querelle des Investitures entre Henri IV et le pape
    ['fatimides', 'emirs'],        // Fatimides et Turcs se disputent la Palestine (Jérusalem reprise en 1098)
    ['rus', 'coumans'],            // Boniak attaque Kiev en 1096
    ['seldjoukides', 'armeniens'], // les Turcs contre les princes arméniens du Taurus
    ['angleterre', 'ecosse']       // Guillaume le Roux aide Edgar à chasser Donald III (1097)
  ];
  // Rivalités de l'époque qui peuvent tourner à la guerre pendant la partie
  var RIVAUX = [['france', 'normandie'], ['france', 'angleterre'], ['castille', 'saragosse'], ['barcelone', 'saragosse'], ['empire', 'boheme'], ['empire', 'pologne'],
    ['hongrie', 'croatie'], ['venise', 'normands'], ['genes', 'pise'], ['pise', 'zirides'], ['sicile', 'zirides'], ['danemark', 'norvege'], ['norvege', 'suede'],
    ['ecosse', 'norvege'], ['rus', 'pologne'], ['emirs', 'mossoul'], ['fatimides', 'abbassides'], ['seldjoukides', 'mossoul'], ['hongrie', 'coumans'],
    ['danemark', 'prusses'], ['pologne', 'prusses'], ['castille', 'almoravides'], ['cid', 'almoravides'], ['fatimides', 'emirs']];

  // Banquiers et changeurs (le même compte dans toutes les banques)
  var BANQUES = { constantinople: 'Trapézite (banquier)', venise: 'Banquier vénitien', genes: 'Banquier génois', bagdad: 'Sarraf (changeur)', alexandrie: 'Sarraf (changeur)',
    damas: 'Sarraf (changeur)', caire: 'Sarraf (changeur)', pise: 'Banquier pisan', paris: 'Changeur du Grand-Pont', londres: 'Changeur de Londres', cologne: 'Changeur de Cologne', kiev: 'Changeur de Kiev', palerme: 'Changeur de Palerme' };

  return {
    CHEVAUX: CHEVAUX,
    proj: proj, FACTIONS: FACTIONS, RELIGIONS: RELIGIONS, LIEUX: LIEUX, ROUTES: ROUTES, ARMES: ARMES, UNITES: U, PEAU: PEAU,
    NAVIRES: NAVIRES, PERSOS: PERSOS, COMBATS: COMBATS, RENCONTRES: RENCONTRES, HISTOIRE: HISTOIRE, LEGENDES: LEGENDES,
    COMPAGNONS: COMPAGNONS, HEROS: HEROS, CAPITALES: CAPITALES, GUERRES: GUERRES, RIVAUX: RIVAUX, TALENTS: TALENTS, COURS: COURS, RECRUES: RECRUES, MARCH: MARCH, COMMERCE: COMMERCE, BANQUES: BANQUES
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = FF;
