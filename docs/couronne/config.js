/* Boutique de l'Édition Couronne (version premium d'Imperium of Wars).
   LIEN : le lien de paiement de ton produit Lemon Squeezy
          (Lemon Squeezy > Products > ton produit > Share > « Checkout URL »),
          du style https://lesnaufrages.lemonsqueezy.com/buy/1234abcd-...
   Tant que LIEN est vide, la page affiche « La boutique ouvre très bientôt ».
   PRIX : le prix affiché sur la page (le vrai prix est celui réglé dans Lemon Squeezy).
   Pense à changer aussi PRIX dans strategie/couronne-donnees.js (prix affiché dans le jeu).
   TEST : true tant que LIEN est le lien du mode test de Lemon Squeezy. Le bouton « Payer »
          n'est alors montré qu'aux admins (les autres voient « bientôt »). Quand la boutique
          est validée : copie le produit en mode réel, mets son lien dans LIEN et TEST: false. */
var COURONNE = {
  LIEN: 'https://lesnaufrages.lemonsqueezy.com/checkout/buy/0eb9164a-84f5-47d4-b7c0-37a51bb91885',
  PRIX: '4,99 €',
  TEST: true
};
