import { Alert, Platform } from 'react-native';

// ⚠️ À REMPLACER par tes identifiants AdMob (admob.google.com > Applis > Blocs d'annonces > Avec récompense).
// Tant que ce sont des 'xxx', l'appli affiche les pubs de test de Google (ça ne rapporte rien).
const REWARDED_UNIT_ID = Platform.select({
  android: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
  ios: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',
});

// Le module pub n'existe pas dans Expo Go ni sur le web : on retombe alors sur une simulation.
let Ads = null;
if (Platform.OS !== 'web') {
  try {
    Ads = require('react-native-google-mobile-ads');
  } catch {
    Ads = null;
  }
}

let rewarded = null;
let loaded = false;

function unitId() {
  return __DEV__ || REWARDED_UNIT_ID.includes('xxx') ? Ads.TestIds.REWARDED : REWARDED_UNIT_ID;
}

function preload() {
  loaded = false;
  rewarded = Ads.RewardedAd.createForAdRequest(unitId());
  rewarded.addAdEventListener(Ads.RewardedAdEventType.LOADED, () => { loaded = true; });
  rewarded.load();
}

// À appeler une fois au démarrage : demande le consentement RGPD (obligatoire en Europe), puis charge une pub.
export async function initAds() {
  if (!Ads) return;
  try {
    const { canRequestAds } = await Ads.AdsConsent.gatherConsent();
    if (!canRequestAds) return;
    await Ads.default().initialize();
    preload();
  } catch (e) {
    console.warn('Pubs indisponibles', e);
  }
}

// Montre une pub récompensée. Renvoie true si le joueur a gagné sa partie bonus.
export function showRewardedAd() {
  if (!Ads) return simulate();
  // Pas de pub prête (pas de réseau, pas de consentement…) : on laisse jouer, pour ne pas frustrer le joueur.
  if (!rewarded || !loaded) return Promise.resolve(true);
  return new Promise((resolve) => {
    let earned = false;
    const offReward = rewarded.addAdEventListener(Ads.RewardedAdEventType.EARNED_REWARD, () => { earned = true; });
    const offClose = rewarded.addAdEventListener(Ads.AdEventType.CLOSED, () => {
      offReward();
      offClose();
      preload();
      resolve(earned);
    });
    rewarded.show().catch(() => resolve(true));
  });
}

function simulate() {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') return resolve(true);
    Alert.alert('Pub (simulation)', 'Dans la vraie appli, une vidéo pub de 15 s s’affiche ici.', [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Regarder', onPress: () => resolve(true) },
    ]);
  });
}
