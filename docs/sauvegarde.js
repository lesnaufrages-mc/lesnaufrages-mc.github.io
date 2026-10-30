/* Sauvegarde en ligne des parties, pour les joueurs connectés à leur compte du site.
   La progression reste dans le navigateur (localStorage) comme avant ; ce fichier en garde
   une copie dans Supabase (table « parties », voir supabase/amis-parties.sql) pour :
     · la retrouver sur un autre appareil ;
     · qu'un admin puisse la remettre à zéro depuis l'espace admin.
   À charger AVANT le jeu, après supabase-config.js et supabase-js :
     <script src="../sauvegarde.js" data-jeu="clutch"></script> */
(function (racine) {
  'use strict';
  // Clés du navigateur qui contiennent la partie de chaque jeu.
  var JEUX = {
    'mot-mystere': ['motmystere:v1'],
    clutch: ['mm-esport:v1'],
    imperium: ['strategie-partie-v2']
  };

  // Que faire en ouvrant le jeu ? info = ce que ce navigateur sait, ligne = la partie en ligne (ou null).
  //   'rien'     : déjà à jour ;
  //   'envoyer'  : la partie de ce navigateur est plus récente → on l'envoie ;
  //   'recuperer': la partie en ligne est plus récente (autre appareil) → on la copie ici ;
  //   'effacer'  : un admin a remis la partie à zéro → on l'efface ici.
  function decider(info, ligne, uid, localVide) {
    var memeCompte = info.uid === uid;
    if (!ligne) return localVide ? 'rien' : 'envoyer';
    var resetVu = memeCompte && info.reset === (ligne.reset_le || null);
    if (ligne.reset_le && !resetVu) return ligne.donnees ? 'recuperer' : 'effacer';
    if (!ligne.donnees) return localVide || (memeCompte && !info.sale) ? 'rien' : 'envoyer';
    // Autre compte (ou premier passage) : la partie du compte passe avant celle du navigateur.
    if (!memeCompte) return 'recuperer';
    if (ligne.maj === info.synchro) return info.sale ? 'envoyer' : 'rien';
    // Changée ailleurs. Si on a aussi joué ici sans connexion, la plus récente gagne.
    if (info.sale && info.local > Date.parse(ligne.maj)) return 'envoyer';
    return 'recuperer';
  }

  // Petite empreinte d'un texte (pour voir si la partie a changé sans la recopier en entier).
  function empreinte(t) {
    var h = 2166136261;
    for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36) + '.' + t.length;
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { decider: decider, empreinte: empreinte, JEUX: JEUX }; return; }

  var script = document.currentScript;
  var jeu = script && script.getAttribute('data-jeu');
  var cles = JEUX[jeu];
  if (!cles) return;
  var CLE_INFO = 'sauvegarde:' + jeu;
  var ls;
  try { ls = racine.localStorage; ls.getItem(CLE_INFO); } catch (e) { return; }

  function lireInfo() { try { return JSON.parse(ls.getItem(CLE_INFO)) || {}; } catch (e) { return {}; } }
  function ecrireInfo(i) { try { ls.setItem(CLE_INFO, JSON.stringify(i)); } catch (e) {} }
  function partieLocale() {
    var d = {}, vide = true;
    cles.forEach(function (k) { var v = ls.getItem(k); if (v != null) { d[k] = v; vide = false; } });
    return vide ? null : d;
  }

  // 1) Ce navigateur a-t-il joué depuis la dernière fois ? (aussi sans compte ni internet)
  var info = lireInfo();
  function verifierChangement() {
    var d = partieLocale(), e = d ? empreinte(JSON.stringify(d)) : '';
    if (e === (info.empreinte || '')) return false;
    info.empreinte = e; info.sale = true; info.local = Date.now();
    ecrireInfo(info);
    return true;
  }
  verifierChangement();

  // Message affiché après le rechargement de la page.
  var MSG = 'sauvegarde-msg';
  function bulle(txt) {
    var b = document.createElement('div');
    b.textContent = txt;
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99999;max-width:90vw;' +
      'background:#111827;color:#fff;border:1px solid #374151;border-radius:12px;padding:10px 16px;' +
      'font:600 14px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.45);text-align:center';
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 6000);
  }
  try {
    var m = racine.sessionStorage.getItem(MSG);
    if (m) {
      racine.sessionStorage.removeItem(MSG);
      if (document.body) bulle(m); else document.addEventListener('DOMContentLoaded', function () { bulle(m); });
    }
  } catch (e) {}

  var cfg = racine.SUPABASE || {};
  if (!cfg.URL || !racine.supabase) {
    setInterval(verifierChangement, 5000);
    return;
  }
  var sb = racine.supabase.createClient(cfg.URL, cfg.CLE);
  var uid = null, envoi = null, enCours = false;

  // Remplace la partie de ce navigateur, puis recharge la page pour que le jeu la relise.
  function remplacer(donnees, ligne, message) {
    var avant = info.empreinte;
    cles.forEach(function (k) {
      if (donnees && donnees[k] != null) ls.setItem(k, String(donnees[k])); else ls.removeItem(k);
    });
    var d = partieLocale();
    info = { uid: uid, reset: ligne.reset_le || null, synchro: ligne.maj, sale: false, local: Date.now(),
      empreinte: d ? empreinte(JSON.stringify(d)) : '' };
    ecrireInfo(info);
    if (info.empreinte === avant) return; // rien n'a changé ici : pas besoin de recharger
    try { racine.sessionStorage.setItem(MSG, message); } catch (e) {}
    racine.location.reload();
  }

  function envoyer() {
    if (!uid || enCours) return;
    var d = partieLocale();
    if (!d) return;
    enCours = true;
    var e = info.empreinte;
    sb.rpc('sauver_partie', { p_jeu: jeu, p_donnees: d, p_reset: info.uid === uid ? info.reset || null : null }).then(function (r) {
      enCours = false;
      if (r.error || !r.data || !r.data[0]) return;
      var x = r.data[0];
      if (x.refuse) return demarrer(); // remise à zéro pendant la partie : on relit tout
      info.uid = uid; info.reset = x.reset_le || null; info.synchro = x.maj;
      if (info.empreinte === e) info.sale = false;
      ecrireInfo(info);
    }, function () { enCours = false; });
  }
  function bientot() { clearTimeout(envoi); envoi = setTimeout(envoyer, 8000); }

  function demarrer() {
    if (!uid) return;
    sb.from('parties').select('donnees, maj, reset_le').eq('joueur', uid).eq('jeu', jeu).maybeSingle().then(function (r) {
      if (r.error) return; // table pas encore créée, ou pas d'internet : on reste comme avant
      var ligne = r.data;
      switch (decider(info, ligne, uid, !partieLocale())) {
        case 'effacer': return remplacer(null, ligne, '🔄 Ta partie a été remise à zéro par un admin.');
        case 'recuperer': return remplacer(ligne.donnees, ligne, '☁️ Ta partie a été récupérée depuis ton compte.');
        case 'envoyer': return envoyer();
        default:
          if (ligne) { info.uid = uid; info.reset = ligne.reset_le || null; info.synchro = ligne.maj; ecrireInfo(info); }
      }
    }, function () {});
  }

  sb.auth.getSession().then(function (r) {
    var s = r.data && r.data.session;
    uid = s ? s.user.id : null;
    demarrer();
  });
  sb.auth.onAuthStateChange(function (evt, s) {
    var avant = uid;
    uid = s ? s.user.id : null;
    if (uid && uid !== avant) demarrer();
  });

  // 2) Pendant la partie : on regarde toutes les 5 s, et on envoie 8 s après le dernier changement.
  setInterval(function () { if (verifierChangement() && uid) bientot(); }, 5000);
  function avantDePartir() { if (verifierChangement() || info.sale) { clearTimeout(envoi); envoyer(); } }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') avantDePartir(); });
  racine.addEventListener('pagehide', avantDePartir);
})(typeof window !== 'undefined' ? window : this);
