# Ouvrir la boutique de l'Édition Couronne (Lemon Squeezy)

L'Édition Couronne est la version payante d'Imperium of Wars (3 campagnes en plus, religions,
intrigues, dynastie, traits, événements). La version gratuite ne change pas.

**Comment ça marche :** le joueur se connecte sur le site, clique sur « Payer » dans
`/couronne/`, paie chez **Lemon Squeezy**, puis Lemon Squeezy prévient une petite fonction
Supabase (`lemonsqueezy`) qui ajoute le joueur dans la table `premium`. Le jeu voit cette ligne
et débloque l'édition. Un remboursement la retire.

**Pourquoi Lemon Squeezy :** c'est un « revendeur officiel » (Merchant of Record). C'est lui qui
vend, encaisse et paie la TVA de chaque pays d'Europe à ta place. Pas d'abonnement : environ
5 % + 0,50 $ par vente (donc environ 4,10 € te reviennent sur 4,99 €). Les virements arrivent sur
un compte bancaire (IBAN) ou PayPal.

> ⚠️ Il faut avoir **18 ans** pour ouvrir le compte vendeur. Si ce n'est pas ton cas, c'est un
> parent qui crée le compte, à son nom, avec son compte bancaire.

Tant que le lien de paiement n'est pas rempli (étape 4), la page `/couronne/` affiche
« La boutique ouvre très bientôt » : rien ne casse.

---

## 1. Créer la table `premium` (1 min)

Supabase → **SQL Editor** → **New query** → copie tout [`couronne.sql`](couronne.sql) → **Run**.

Dès maintenant, tu peux offrir l'édition à la main : **/admin/** → onglet **Membres** →
colonne **⚜️ Couronne** → **Offrir** (pratique pour tester, ou pour un gagnant de concours).

## 2. Créer le compte Lemon Squeezy (10 min)

1. Va sur [lemonsqueezy.com](https://www.lemonsqueezy.com) → **Get started** → crée ton compte
   et ta boutique (nom : *Les Naufragés*, devise : **EUR**).
2. **Settings → Payouts** : ajoute ton IBAN belge ou ton PayPal.
3. **Settings → General** : demande l'activation de la boutique (« Activate store »). Lemon
   Squeezy vérifie ton identité et ton site (`https://lesnaufrages-mc.github.io/couronne/`).
   En attendant, tout marche en **mode test** (interrupteur *Test mode* en bas à gauche).

## 3. Créer le produit (5 min)

**Store → Products → + New product**

- **Nom :** Imperium of Wars – Édition Couronne
- **Description :** copie le texte d'en haut de la page `/couronne/`
- **Prix :** 4,99 € · **Single payment** (paiement unique)
- **Tax category :** *Software / SaaS* (ou *Digital goods*)
- Section **Confirmation modal** : texte du bouton « Retour au jeu », lien du bouton :
  `https://lesnaufrages-mc.github.io/couronne/?merci=1`
- Pas de fichier à livrer : l'édition est débloquée sur le compte du joueur.

Enregistre (**Publish**).

## 4. Brancher le lien de paiement sur le site (1 min)

Products → ton produit → **Share** → copie le **Checkout URL**
(`https://lesnaufrages.lemonsqueezy.com/buy/xxxxxxxx-...`).

Colle-le dans [`docs/couronne/config.js`](../docs/couronne/config.js) :

```js
var COURONNE = {
  LIEN: 'https://lesnaufrages.lemonsqueezy.com/buy/xxxxxxxx-...',
  PRIX: '4,99 €'
};
```

Si tu changes le prix un jour : change-le dans Lemon Squeezy, dans `config.js` **et** dans
`docs/strategie/couronne-donnees.js` (`PRIX`, le prix affiché dans le jeu).

## 5. Installer la fonction Supabase `lemonsqueezy` (5 min)

1. Invente un mot de passe long (le « signing secret »), par exemple 30 lettres et chiffres au
   hasard. Garde-le pour l'étape 6. **Ne le mets jamais dans le site ni sur Discord.**
2. Supabase → **Edge Functions** → **Secrets** → **Add new secret** :
   - Nom `LEMONSQUEEZY_SECRET`, valeur : ton mot de passe.
3. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor** :
   - Nom de la fonction : `lemonsqueezy`
   - Remplace tout le code par celui de
     [`functions/lemonsqueezy/index.ts`](functions/lemonsqueezy/index.ts) → **Deploy**.
4. Dans la fonction → **Details** (ou Settings) → **désactive « Verify JWT »**
   (« Enforce JWT verification ») → Save. Sinon Lemon Squeezy reçoit une erreur 401.

L'adresse de la fonction est :
`https://updqdvsigqtsjddeshvi.supabase.co/functions/v1/lemonsqueezy`

## 6. Créer le webhook dans Lemon Squeezy (2 min)

Lemon Squeezy → **Settings → Webhooks → +** :

- **Callback URL :** `https://updqdvsigqtsjddeshvi.supabase.co/functions/v1/lemonsqueezy`
- **Signing secret :** le même mot de passe qu'à l'étape 5
- **Events :** coche `order_created` et `order_refunded`

Le webhook doit exister **en mode test et en mode réel** (refais-le une fois la boutique activée).

## 7. Tester (5 min)

1. Active **Test mode** dans Lemon Squeezy (le lien de paiement de test est différent : mets-le
   dans `config.js` le temps du test).
2. Connecte-toi sur le site avec un compte de test → `/couronne/` → coche les 2 cases → Payer.
3. Carte de test : `4242 4242 4242 4242`, date future, n'importe quel code.
4. De retour sur `/couronne/?merci=1`, la page doit dire « débloquée » en quelques secondes,
   et `/strategie/` affiche « ⚜️ Couronne débloquée ».
5. Si ça ne marche pas : Lemon Squeezy → Settings → Webhooks → ton webhook → regarde la réponse
   (401 = mauvais secret ou « Verify JWT » encore actif ; « Pas de compte joint » = paiement fait
   sans passer par le bouton du site).
6. Rembourse la commande de test : l'édition doit disparaître du compte.

Ensuite, remets le **vrai** lien dans `config.js`.

## 8. Avant la première vraie vente

- **Une adresse e-mail de contact** dans les conditions (`docs/conditions.html`, partie 13 « Contact ») : la loi l'exige pour vendre en ligne. Une adresse Gmail dédiée suffit.
- **Impôts :** Lemon Squeezy paie la TVA, mais ce qu'il te verse est un revenu. En Belgique, de
  petits revenus occasionnels peuvent être des « revenus divers » ; demande à un comptable ou au
  SPF Finances (ou à tes parents) comment les déclarer.
- **Remboursements :** si un joueur a un vrai problème qu'on n'arrive pas à réparer, rembourse-le
  dans Lemon Squeezy (Orders → la commande → Refund). L'édition se retire toute seule.
- **Paiement sans compte** (quelqu'un ouvre directement le lien Lemon Squeezy) : la fonction ne
  sait pas à qui donner l'édition. Retrouve le joueur grâce à son e-mail et clique **Offrir** dans
  `/admin/`.

## Bon à savoir

- La **version PC (Steam)** inclut l'Édition Couronne : pas d'achat en plus pour ceux qui
  ont payé le jeu.
- Les parties déjà commencées en gratuit restent gratuites ; l'édition s'applique aux nouvelles
  campagnes.
- Le jeu garde le déblocage en mémoire sur l'appareil (clé `imperium-couronne`) pour marcher
  hors ligne ; il revérifie dès qu'il y a internet.
