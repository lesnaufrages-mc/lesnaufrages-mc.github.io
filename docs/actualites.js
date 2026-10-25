/* LES ACTUALITÉS DU SITE
   Pour ajouter une actu : copie un bloc { ... }, colle-le en haut de la liste et change le texte.
   - date      : "AAAA-MM-JJ"
   - categorie : "discord", "minecraft", "appli", "bot" ou "site"
   - epingle   : true pour la garder tout en haut (facultatif)
   - lien / bouton : un lien et le texte du bouton (facultatifs)
   Attention : garde bien les guillemets "..." et la virgule entre chaque bloc. */
var ACTUALITES = [
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
