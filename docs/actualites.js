/* LES ACTUALITÉS DU SITE
   Pour ajouter une actu : copie un bloc { ... }, colle-le en haut de la liste et change le texte.
   - date      : "AAAA-MM-JJ"
   - categorie : "discord", "minecraft", "appli", "bot" ou "site"
   - epingle   : true pour la garder tout en haut (facultatif)
   - lien / bouton : un lien et le texte du bouton (facultatifs)
   - video / image : une vidéo du dossier videos/ et son image d'aperçu (facultatifs)
   Attention : garde bien les guillemets "..." et la virgule entre chaque bloc. */
var ACTUALITES = [
  {
    date: "2026-10-28",
    categorie: "site",
    epingle: true,
    titre: "Nouveau jeu : CLUTCH, le mot du jour esport !",
    texte: "Une question esport par jour, la même pour tout le monde : LoL, CS2, Valorant, Dota 2, Fortnite, de la scène française à la Corée. La réponse est le mot à trouver, en 6 essais. Regarde le trailer, puis viens prouver que tu connais la scène.",
    video: "videos/clutch-trailer.mp4",
    image: "videos/clutch-trailer.jpg",
    lien: "esport/",
    bouton: "Jouer à CLUTCH"
  },
  {
    date: "2026-10-26",
    categorie: "site",
    epingle: true,
    titre: "Le trailer d'Imperium of Wars est sorti !",
    texte: "La vraie carte d'Europe, de 771 à 1700. Lève tes armées, assiège des villes et commande tes batailles en 3D et en temps réel. Un jeu de stratégie historique 100 % gratuit, directement dans ton navigateur.",
    video: "videos/imperium-trailer.mp4",
    image: "videos/imperium-trailer.jpg",
    lien: "strategie/",
    bouton: "Jouer à Imperium of Wars"
  },
  {
    date: "2026-10-25",
    categorie: "appli",
    epingle: true,
    titre: "Le trailer de Mot Mystère est sorti !",
    texte: "Un mot. Six essais. Le même pour tout le monde. Découvre le jeu en 27 secondes, puis partage la vidéo à tes amis et défie-les sur le mot du jour.",
    video: "videos/trailer.mp4",
    image: "videos/trailer.jpg",
    lien: "jouer/",
    bouton: "Jouer maintenant"
  },
  {
    date: "2026-10-25",
    categorie: "minecraft",
    epingle: true,
    titre: "Les Naufragés recrutent leur staff !",
    texte: "On cherche des joueurs motivés : Modo (veiller au respect des règles), Helper (aider et accueillir les nouveaux), Builder (spawns, events, décors), Dev (plugins, site et bot) et Animateur (events, faire vivre la commu). On attend que tu sois actif, respectueux, mature, à l'écoute, et que tu aies un peu de temps chaque semaine. Pour postuler : rejoins le Discord, va dans #recrutement et clique sur Postuler (ou tape /candidature). Le staff te répond en message privé.",
    lien: "staff/#recrutement",
    bouton: "Rejoindre le staff"
  },
  {
    date: "2026-10-25",
    categorie: "appli",
    epingle: true,
    titre: "On recherche des testeurs Android",
    texte: "L'appli Mot Mystère arrive bientôt sur Google Play. Avant la sortie, Google demande 12 testeurs pendant 14 jours. Tu as un téléphone Android ? Inscris-toi sur le Discord et joue avant tout le monde.",
    lien: "https://discord.gg/Xdkzj8bZnk",
    bouton: "Devenir testeur"
  },
  {
    date: "2026-10-25",
    categorie: "site",
    titre: "Nouveau site pour Les Naufragés",
    texte: "Le site déménage sur lesnaufrages-mc.github.io avec une page d'actualités et des chiffres en direct : visites du site, membres du Discord et joueurs en ligne.",
    lien: "index.html#direct",
    bouton: "Voir les chiffres"
  },
  {
    date: "2026-10-25",
    categorie: "appli",
    titre: "Mot Mystère est jouable dans ton navigateur",
    texte: "Un mot de 5 lettres par jour, le même pour tout le monde, et 6 essais pour le trouver. Pas besoin d'installer quoi que ce soit : ça marche sur ordi et sur téléphone.",
    lien: "jouer/",
    bouton: "Jouer maintenant"
  },
  {
    date: "2026-10-25",
    categorie: "bot",
    titre: "Naufragés Bot débarque sur le Discord",
    texte: "Le bot rappelle le mot du jour, compte les points quand tu colles ta grille et affiche le top 10 avec /classement. Il ne connaît jamais le mot : zéro spoiler.",
    lien: "index.html#bot",
    bouton: "Découvrir le bot"
  },
  {
    date: "2026-10-25",
    categorie: "minecraft",
    titre: "Le serveur semi-factions vous attend",
    texte: "Claims, guerres de factions, économie avec métiers et quêtes, giveaways réguliers et un staff actif. Toutes les infos pour rejoindre sont sur le Discord.",
    lien: "https://discord.gg/Xdkzj8bZnk",
    bouton: "Rejoindre"
  },
  {
    date: "2026-10-25",
    categorie: "discord",
    titre: "Un seul lien pour rejoindre le Discord",
    texte: "Tous les liens du site et du jeu mènent maintenant vers la même invitation : discord.gg/Xdkzj8bZnk. Partage-la à tes amis !",
    lien: "https://discord.gg/Xdkzj8bZnk",
    bouton: "Ouvrir le Discord"
  }
];
