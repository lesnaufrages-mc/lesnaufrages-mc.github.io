/* Naufragés : Conquête — les campagnes historiques (700 → 1800).
   Pour chaque époque : les royaumes, leur couleur et leurs provinces (la 1re = capitale).
   Les provinces non citées sont tenues par des rebelles / seigneurs indépendants. */
var HISTOIRE = {
  FIN: 1800,
  OBJECTIF: 40, // provinces à posséder pour gagner

  EPOQUES: [
    {
      id: 'charlemagne', annee: 771, titre: "L'empire de Charlemagne",
      texte: "Les Francs dominent l'Occident, les Omeyyades tiennent l'Espagne, Byzance et les Abbassides se partagent l'Orient. Les Vikings s'éveillent.",
      factions: [
        ['francs', 'Royaume franc', '#3b82f6', ['paris', 'rouen', 'orleans', 'dijon', 'metz', 'bruges', 'cologne', 'lyon', 'marseille', 'toulouse', 'francfort', 'amsterdam', 'bordeaux']],
        ['lombards', 'Lombards', '#14b8a6', ['milan', 'venise', 'florence', 'genes']],
        ['papaute', 'États pontificaux', '#fde047', ['rome']],
        ['byzance', 'Empire byzantin', '#a855f7', ['constantinople', 'thessalonique', 'athenes', 'brousse', 'smyrne', 'ankara', 'konya', 'trebizonde', 'crete', 'palerme', 'naples', 'chypre']],
        ['omeyyades', 'Émirat de Cordoue', '#16a34a', ['cordoue', 'tolede', 'grenade', 'valence', 'saragosse', 'lisbonne']],
        ['asturies', 'Royaume des Asturies', '#f97316', ['leon', 'compostelle']],
        ['abbassides', 'Califat abbasside', '#57534e', ['bagdad', 'damas', 'jerusalem', 'antioche', 'mossoul', 'alexandrie', 'caire', 'tabriz', 'ispahan', 'bassora', 'medine', 'armenie', 'cyrene']],
        ['saxons', 'Saxons', '#84cc16', ['hambourg', 'saxe']],
        ['angles', 'Royaumes anglo-saxons', '#e5484d', ['londres', 'york']],
        ['vikings', 'Vikings', '#0ea5e9', ['copenhague', 'gothie', 'oslo']],
        ['khazars', 'Khazars', '#b45309', ['volga', 'don', 'crimee', 'steppe']],
        ['bulgares', 'Bulgares', '#be185d', ['bulgarie', 'valachie']],
        ['avars', 'Avars', '#78716c', ['bude', 'transylvanie']],
        ['idrissides', 'Idrissides', '#65a30d', ['fes', 'tlemcen']]
      ]
    },
    {
      id: 'conquete', annee: 1066, titre: 'Guillaume le Conquérant',
      texte: "Le duc de Normandie veut la couronne d'Angleterre. Le Saint-Empire domine l'Europe, les Seldjoukides surgissent en Orient.",
      factions: [
        ['normandie', 'Duché de Normandie', '#f59e0b', ['rouen', 'rennes']],
        ['angleterre', "Royaume d'Angleterre", '#e5484d', ['londres', 'york', 'galles']],
        ['france', 'Royaume de France', '#3b82f6', ['paris', 'orleans', 'dijon', 'bruges']],
        ['empire', 'Saint-Empire', '#facc15', ['francfort', 'cologne', 'baviere', 'saxe', 'metz', 'suisse', 'milan', 'florence', 'vienne', 'hambourg', 'amsterdam', 'lyon', 'marseille', 'prague']],
        ['venise', 'République de Venise', '#14b8a6', ['venise']],
        ['papaute', 'États pontificaux', '#fde047', ['rome']],
        ['normandssicile', 'Normands de Sicile', '#fb923c', ['naples', 'palerme']],
        ['byzance', 'Empire byzantin', '#a855f7', ['constantinople', 'thessalonique', 'athenes', 'brousse', 'smyrne', 'ankara', 'konya', 'trebizonde', 'crete', 'chypre', 'antioche', 'bulgarie', 'belgrade']],
        ['seldjoukides', 'Seldjoukides', '#0f766e', ['ispahan', 'tabriz', 'bagdad', 'mossoul', 'armenie', 'bassora']],
        ['fatimides', 'Califat fatimide', '#22c55e', ['caire', 'alexandrie', 'damas', 'jerusalem', 'medine', 'cyrene']],
        ['zirides', 'Zirides', '#65a30d', ['tunis', 'tripoli']],
        ['almoravides', 'Almoravides', '#15803d', ['marrakech', 'fes', 'tlemcen']],
        ['taifas', "Taïfas d'al-Andalus", '#4ade80', ['cordoue', 'grenade', 'tolede', 'valence', 'saragosse', 'lisbonne']],
        ['castille', 'Castille-León', '#dc2626', ['leon', 'compostelle']],
        ['danemark', 'Danemark', '#0ea5e9', ['copenhague']],
        ['norvege', 'Norvège', '#1d4ed8', ['oslo']],
        ['suede', 'Suède', '#38bdf8', ['stockholm', 'gothie']],
        ['pologne', 'Pologne', '#f43f5e', ['cracovie', 'varsovie']],
        ['hongrie', 'Hongrie', '#be123c', ['bude', 'transylvanie', 'croatie']],
        ['rus', 'Rus de Kiev', '#7c3aed', ['kiev', 'novgorod', 'smolensk', 'tver', 'riazan', 'galicie']],
        ['ecosse', 'Écosse', '#475569', ['edimbourg']],
        ['coumans', 'Coumans', '#b45309', ['don', 'steppe', 'crimee']]
      ]
    },
    {
      id: 'croisades', annee: 1190, titre: 'Le temps des croisades',
      texte: "Richard Cœur de Lion et Philippe Auguste partent en croisade contre Saladin. Les Almohades règnent sur l'Espagne et le Maghreb.",
      factions: [
        ['angleterre', 'Empire Plantagenêt', '#e5484d', ['londres', 'york', 'galles', 'rouen', 'rennes', 'bordeaux']],
        ['france', 'Royaume de France', '#3b82f6', ['paris', 'orleans', 'dijon', 'bruges']],
        ['empire', 'Saint-Empire', '#facc15', ['francfort', 'cologne', 'baviere', 'saxe', 'metz', 'suisse', 'milan', 'florence', 'vienne', 'hambourg', 'prague', 'lyon', 'marseille', 'amsterdam', 'genes']],
        ['sicile', 'Royaume de Sicile', '#fb923c', ['palerme', 'naples']],
        ['venise', 'République de Venise', '#14b8a6', ['venise']],
        ['papaute', 'États pontificaux', '#fde047', ['rome']],
        ['byzance', 'Empire byzantin', '#a855f7', ['constantinople', 'thessalonique', 'athenes', 'brousse', 'smyrne', 'crete']],
        ['roum', 'Sultanat de Roum', '#0f766e', ['konya', 'ankara', 'trebizonde']],
        ['ayyoubides', 'Ayyoubides (Saladin)', '#22c55e', ['caire', 'alexandrie', 'damas', 'jerusalem', 'mossoul', 'medine', 'cyrene']],
        ['croises', 'États latins d\'Orient', '#f8fafc', ['antioche', 'chypre']],
        ['abbassides', 'Califat abbasside', '#57534e', ['bagdad', 'bassora']],
        ['khwarezm', 'Khwarezmiens', '#0d9488', ['ispahan', 'tabriz']],
        ['georgie', 'Royaume de Géorgie', '#9f1239', ['tbilissi', 'armenie']],
        ['almohades', 'Almohades', '#15803d', ['marrakech', 'fes', 'tlemcen', 'alger', 'tunis', 'tripoli', 'cordoue', 'grenade', 'valence']],
        ['castille', 'Castille', '#dc2626', ['tolede', 'leon', 'compostelle']],
        ['portugal', 'Portugal', '#16a34a', ['lisbonne']],
        ['aragon', 'Aragon', '#eab308', ['saragosse', 'barcelone']],
        ['hongrie', 'Hongrie', '#be123c', ['bude', 'transylvanie', 'croatie', 'belgrade']],
        ['bulgarie', 'Empire bulgare', '#be185d', ['bulgarie', 'valachie']],
        ['pologne', 'Pologne', '#f43f5e', ['cracovie', 'varsovie']],
        ['danemark', 'Danemark', '#0ea5e9', ['copenhague', 'gothie']],
        ['suede', 'Suède', '#38bdf8', ['stockholm']],
        ['norvege', 'Norvège', '#1d4ed8', ['oslo']],
        ['ecosse', 'Écosse', '#475569', ['edimbourg']],
        ['kiev', 'Principauté de Kiev', '#7c3aed', ['kiev', 'smolensk', 'galicie']],
        ['vladimir', 'Vladimir-Souzdal', '#6d28d9', ['tver', 'moscou', 'riazan']],
        ['novgorod', 'République de Novgorod', '#8b5cf6', ['novgorod']],
        ['coumans', 'Coumans', '#b45309', ['steppe', 'don', 'crimee', 'volga']]
      ]
    },
    {
      id: 'constantinople', annee: 1453, titre: 'La chute de Constantinople',
      texte: "Les Ottomans de Mehmed II prennent Constantinople. La guerre de Cent Ans s'achève, la poudre à canon change la guerre.",
      factions: [
        ['ottomans', 'Empire ottoman', '#16a34a', ['constantinople', 'brousse', 'ankara', 'smyrne', 'thessalonique', 'bulgarie', 'konya']],
        ['france', 'Royaume de France', '#3b82f6', ['paris', 'orleans', 'rouen', 'bordeaux', 'toulouse', 'lyon']],
        ['bourgogne', 'État bourguignon', '#a16207', ['dijon', 'bruges', 'amsterdam']],
        ['angleterre', "Royaume d'Angleterre", '#e5484d', ['londres', 'york', 'galles']],
        ['ecosse', 'Écosse', '#475569', ['edimbourg']],
        ['castille', 'Castille', '#dc2626', ['tolede', 'leon', 'compostelle', 'cordoue']],
        ['aragon', "Couronne d'Aragon", '#eab308', ['saragosse', 'barcelone', 'valence', 'palerme', 'naples', 'sardaigne']],
        ['portugal', 'Portugal', '#22c55e', ['lisbonne']],
        ['grenade', 'Émirat de Grenade', '#4ade80', ['grenade']],
        ['empire', 'Saint-Empire', '#facc15', ['vienne', 'francfort', 'cologne', 'baviere', 'saxe', 'prague', 'hambourg', 'berlin']],
        ['milan', 'Duché de Milan', '#0369a1', ['milan', 'genes']],
        ['venise', 'République de Venise', '#14b8a6', ['venise', 'crete', 'raguse']],
        ['florence', 'Florence des Médicis', '#db2777', ['florence']],
        ['papaute', 'États pontificaux', '#fde047', ['rome']],
        ['hongrie', 'Hongrie', '#be123c', ['bude', 'transylvanie', 'croatie', 'belgrade']],
        ['valachie', 'Valachie', '#9a3412', ['valachie', 'moldavie']],
        ['pologne', 'Pologne-Lituanie', '#f43f5e', ['cracovie', 'varsovie', 'vilnius', 'kiev', 'galicie', 'smolensk']],
        ['teutonique', 'Ordre teutonique', '#e2e8f0', ['dantzig', 'riga']],
        ['moscovie', 'Moscovie', '#7c3aed', ['moscou', 'tver', 'riazan']],
        ['novgorod', 'République de Novgorod', '#8b5cf6', ['novgorod']],
        ['horde', "Horde d'or", '#b45309', ['volga', 'don', 'steppe', 'crimee']],
        ['mamelouks', 'Sultanat mamelouk', '#ca8a04', ['caire', 'alexandrie', 'damas', 'jerusalem', 'antioche', 'medine']],
        ['turcomans', 'Turcomans', '#0f766e', ['tabriz', 'bagdad', 'mossoul', 'ispahan', 'armenie']],
        ['trebizonde', 'Empire de Trébizonde', '#a855f7', ['trebizonde']],
        ['georgie', 'Géorgie', '#9f1239', ['tbilissi']],
        ['hafsides', 'Hafsides', '#65a30d', ['tunis', 'alger', 'tripoli']],
        ['maroc', 'Maroc mérinide', '#15803d', ['fes', 'marrakech', 'tlemcen']],
        ['kalmar', 'Union de Kalmar', '#0ea5e9', ['copenhague', 'oslo', 'stockholm', 'gothie']]
      ]
    },
    {
      id: 'rois', annee: 1700, titre: "L'âge des rois",
      texte: "Louis XIV règne sur la France, Pierre le Grand modernise la Russie, l'Empire ottoman est encore immense. Mousquets et canons décident des batailles.",
      factions: [
        ['france', 'Royaume de France', '#3b82f6', ['paris', 'orleans', 'rouen', 'rennes', 'bordeaux', 'toulouse', 'lyon', 'marseille', 'dijon', 'metz']],
        ['espagne', "Royaume d'Espagne", '#eab308', ['tolede', 'leon', 'compostelle', 'cordoue', 'grenade', 'valence', 'saragosse', 'barcelone', 'pampelune', 'naples', 'palerme', 'sardaigne', 'milan', 'bruges']],
        ['portugal', 'Portugal', '#22c55e', ['lisbonne']],
        ['bretagne', 'Grande-Bretagne', '#e5484d', ['londres', 'york', 'galles', 'edimbourg', 'dublin']],
        ['hollande', 'Provinces-Unies', '#f97316', ['amsterdam']],
        ['autriche', 'Autriche des Habsbourg', '#facc15', ['vienne', 'prague', 'bude', 'croatie', 'transylvanie']],
        ['prusse', 'Prusse', '#64748b', ['berlin']],
        ['baviere', 'Bavière', '#60a5fa', ['baviere']],
        ['saxe', 'Saxe', '#84cc16', ['saxe']],
        ['venise', 'République de Venise', '#14b8a6', ['venise', 'athenes']],
        ['papaute', 'États pontificaux', '#fde047', ['rome']],
        ['suede', 'Empire suédois', '#38bdf8', ['stockholm', 'gothie', 'riga']],
        ['danemark', 'Danemark-Norvège', '#0ea5e9', ['copenhague', 'oslo']],
        ['pologne', 'Pologne-Lituanie', '#f43f5e', ['varsovie', 'cracovie', 'vilnius', 'dantzig', 'galicie']],
        ['russie', 'Russie de Pierre le Grand', '#7c3aed', ['moscou', 'novgorod', 'smolensk', 'kiev', 'tver', 'riazan', 'volga', 'don']],
        ['ottomans', 'Empire ottoman', '#16a34a', ['constantinople', 'brousse', 'ankara', 'konya', 'smyrne', 'trebizonde', 'thessalonique', 'bulgarie', 'belgrade', 'valachie', 'moldavie', 'raguse', 'crete', 'chypre', 'antioche', 'damas', 'jerusalem', 'caire', 'alexandrie', 'bagdad', 'mossoul', 'bassora', 'medine', 'armenie', 'cyrene']],
        ['crimee', 'Khanat de Crimée', '#b45309', ['crimee', 'steppe']],
        ['perse', 'Perse safavide', '#0f766e', ['ispahan', 'tabriz', 'tbilissi']],
        ['barbaresques', 'Régences barbaresques', '#65a30d', ['alger', 'tunis', 'tripoli']],
        ['maroc', 'Maroc alaouite', '#15803d', ['fes', 'marrakech']]
      ]
    }
  ],

  EVENEMENTS: [
    { annee: 800, txt: "Noël 800 : Charlemagne est couronné empereur d'Occident à Rome." },
    { annee: 843, txt: "Traité de Verdun : l'empire franc est partagé entre les petits-fils de Charlemagne." },
    { annee: 1066, txt: 'Bataille de Hastings : Guillaume de Normandie devient roi d\'Angleterre.' },
    { annee: 1096, txt: 'La première croisade part vers Jérusalem.' },
    { annee: 1215, txt: 'La Magna Carta limite le pouvoir du roi d\'Angleterre.' },
    { annee: 1241, txt: 'Les Mongols ravagent la Pologne et la Hongrie !' },
    { annee: 1337, txt: 'Début de la guerre de Cent Ans entre la France et l\'Angleterre.' },
    { annee: 1347, txt: '☠️ La Peste noire ravage le monde : toutes les armées perdent beaucoup d\'hommes.', effet: 'peste' },
    { annee: 1429, txt: 'Jeanne d\'Arc délivre Orléans.' },
    { annee: 1453, txt: 'Constantinople tombe : la fin de l\'Empire byzantin.' },
    { annee: 1492, txt: 'Christophe Colomb atteint l\'Amérique. L\'or afflue : +200 or !', effet: 'or' },
    { annee: 1517, txt: 'Luther lance la Réforme protestante.' },
    { annee: 1571, txt: 'Bataille de Lépante : grande bataille navale en Méditerranée.' },
    { annee: 1618, txt: 'Début de la guerre de Trente Ans.' },
    { annee: 1648, txt: 'Traités de Westphalie : la paix revient en Europe… pour un temps.' },
    { annee: 1683, txt: 'Siège de Vienne par les Ottomans.' },
    { annee: 1709, txt: 'Poltava : la Russie bat la Suède.' },
    { annee: 1789, txt: '🇫🇷 Révolution française ! Le monde va changer.' }
  ]
};
if (typeof module !== 'undefined') module.exports = HISTOIRE;
