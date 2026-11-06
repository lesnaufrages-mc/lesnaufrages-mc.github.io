// Mots de 5 lettres (sans accents, en majuscules). Un mot par jour, dans cet ordre.
export const WORDS = `
ARBRE AVION BALLE CHIEN FLEUR TABLE VERRE PLAGE NUAGE POMME
SUCRE TIGRE ROUGE JAUNE LIVRE PORTE MONDE TERRE VILLE ROUTE
NEIGE PLUIE SOLEIL LAPIN SINGE ZEBRE PIANO RADIO VIDEO PHOTO
CRABE REINE PRINCE SABLE BRAVO CALME DROLE FORCE GLACE HERBE
IMAGE JOUER LAMPE MAGIE NUITS OCEAN PAPIER QUEUE RIRES SALON
TEMPS USINE VAGUE WAGON YACHT ZESTE BOIRE CRIER DORMIR ECRAN
FUSEE GARDE HOTEL JUPES KAYAK LITRE METRO NAGER ORAGE PIERRE
RUCHE SIROP TRAIN UNION VOILE BIJOU CADRE DANSE ETOILE FERME
GENOU HIVER ILOTS JARDIN LOUPE MIROIR NAVET OLIVE PARIS QUART
RAYON SOUPE TASSE VELOS BULLE CHAUD DOUCE EPICE FRAIS GRAIN
HONTE JOUET LUNDI MARDI PANDA RAPPEL SERRE TRESOR VAPEUR BOULE
CERFS DRAPS ENVIE FROID GOMME HOMME JOYAU LINGE MERLE NOIRS
`.split(/\s+/).filter((w) => w.length === 5);

// Parties libres (30 par jour au maximum) : les mots vont du facile au difficile.
// Parties 1 à 10 = FACILE, 11 à 20 = MOYEN, 21 à 30 = DIFFICILE.
// Chaque mot a sa phrase pour la bouteille à la mer. Ajoute des mots à la fin d'une liste si tu veux.
function liste(texte) {
  return texte.trim().split('\n').map((ligne) => {
    const [mot, indice] = ligne.split(':');
    return { mot: mot.trim(), indice: indice.trim() };
  });
}

export const FACILE = liste(`
CHIEN: Il aboie et remue la queue.
FLEUR: La rose et la tulipe en sont.
TABLE: On mange dessus.
VERRE: On boit dedans.
PLAGE: Sable, mer et serviette.
POMME: Fruit rouge ou vert, on la croque.
SUCRE: Il rend le café tout doux.
TIGRE: Gros chat sauvage avec des rayures.
ROUGE: La couleur d'une fraise.
JAUNE: La couleur d'une banane.
LIVRE: On le lit, il a des pages.
PORTE: On l'ouvre pour entrer.
VILLE: Paris ou Bruxelles en est une.
LAPIN: Il a de grandes oreilles et adore les carottes.
ZEBRE: Cheval rayé noir et blanc.
PIANO: Instrument avec des touches blanches et noires.
RADIO: On l'écoute dans la voiture.
PHOTO: On la prend avec un téléphone.
SABLE: Il y en a plein sur la plage.
GLACE: Dessert froid en cornet.
LAMPE: Elle éclaire la chambre.
TRAIN: Il roule sur des rails.
DANSE: On la fait sur de la musique.
NEIGE: Elle tombe en hiver, toute blanche.
SOUPE: On la mange chaude avec une cuillère.
TASSE: On boit le chocolat chaud dedans.
CHAUD: Le contraire de froid.
FROID: Le contraire de chaud.
LUNDI: Le premier jour de la semaine.
PANDA: Ours noir et blanc qui mange du bambou.
`);

export const MOYEN = liste(`
NUAGE: Il flotte dans le ciel, blanc ou gris.
MONDE: La Terre entière, avec tous ses pays.
ROUTE: Les voitures roulent dessus.
REINE: La femme du roi.
CALME: Quand il n'y a aucun bruit.
DROLE: Une blague qui fait rire l'est.
HERBE: Elle pousse dans le jardin, verte.
IMAGE: Un dessin ou une photo.
MAGIE: Le métier des sorciers.
SALON: La pièce avec le canapé et la télé.
TEMPS: Il passe trop vite, l'horloge le compte.
USINE: Grand bâtiment où on fabrique des objets.
WAGON: Une voiture du train.
FUSEE: Elle part dans l'espace.
HOTEL: On y dort en vacances.
METRO: Train qui roule sous la ville.
NAGER: Ce qu'on fait à la piscine.
RUCHE: La maison des abeilles.
SIROP: On le met dans l'eau pour lui donner du goût.
BIJOU: Une bague ou un collier.
GENOU: Il plie au milieu de ta jambe.
HIVER: La saison du froid et de la neige.
LOUPE: Elle rend les choses plus grosses.
OLIVE: Petit fruit vert ou noir, on en fait de l'huile.
RAYON: Le soleil en envoie plein.
BULLE: On en fait avec du savon.
EPICE: Le poivre en est une.
JOUET: Un enfant joue avec.
MARDI: Le jour après lundi.
GOMME: Elle efface le crayon.
`);

export const DIFFICILE = liste(`
BRAVO: On le crie pour féliciter.
QUEUE: Le chien la remue… ou la file d'attente au magasin.
YACHT: Bateau de luxe des milliardaires.
ZESTE: Petit bout de peau de citron.
KAYAK: Petit bateau qu'on fait avancer avec une pagaie.
LITRE: Une bouteille d'eau en contient souvent un ou deux.
CADRE: Il entoure un tableau.
GRAIN: Petit morceau de riz, de sable ou de café.
HONTE: On la ressent quand on rougit d'avoir mal fait.
SERRE: Maison en verre pour faire pousser les plantes.
ENVIE: Le désir d'avoir quelque chose.
JOYAU: Un bijou très précieux.
LINGE: On le lave dans la machine.
MERLE: Oiseau noir au bec jaune.
NAVET: Légume blanc… ou un très mauvais film.
QUART: Un morceau sur quatre.
FRAIS: Un peu froid, comme l'air du matin.
DOUCE: Une peau de bébé l'est.
CRIER: Parler très, très fort.
BOIRE: Ce qu'on fait quand on a soif.
ECRAN: Celui de ta télé ou de ton téléphone.
UNION: Quand on se met ensemble, ça fait la force.
JUPES: Vêtements des filles, au pluriel.
BOULE: Ronde, comme une boule de neige.
DRAPS: On les met sur le lit.
CERFS: Animaux de la forêt avec de grands bois (au pluriel).
NOIRS: Comme la nuit (au masculin pluriel).
RIRES: Les « ha ha ha » (au pluriel).
NUITS: Le contraire des jours (au pluriel).
VELOS: On pédale dessus (au pluriel).
`);

export const LIBRES_MAX = 30;

// Liste de la partie libre n (1 à 30) : du facile au difficile.
export function listeLibre(n) {
  return n <= 10 ? FACILE : n <= 20 ? MOYEN : DIFFICILE;
}

export function nomListe(n) {
  return n <= 10 ? 'Facile' : n <= 20 ? 'Moyen' : 'Difficile';
}

// Mot de la partie libre n, sans reprendre un mot déjà joué aujourd'hui.
export function motLibre(n, dejaJoues = [], hasard = Math.random) {
  const liste = listeLibre(n);
  const restants = liste.filter((w) => !dejaJoues.includes(w.mot));
  const choix = restants.length ? restants : liste;
  return choix[Math.floor(hasard() * choix.length)];
}

// 1 minute de pause entre deux parties libres.
export const DELAI_LIBRE = 60 * 1000;

// Secondes à attendre avant la prochaine partie libre (0 = on peut jouer).
export function attenteLibre(fin, maintenant = Date.now()) {
  if (!fin) return 0;
  return Math.max(0, Math.ceil((fin + DELAI_LIBRE - maintenant) / 1000));
}
