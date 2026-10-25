/* Comptes du site (forum + admin), via Supabase.
   Utilisé par forum/ et admin/. Les réglages sont dans supabase-config.js. */
(function () {
  var cfg = window.SUPABASE || {};
  var actif = !!(cfg.URL && cfg.CLE && window.supabase);
  var sb = actif ? window.supabase.createClient(cfg.URL, cfg.CLE) : null;
  var ecouteurs = [];

  var C = window.Compte = {
    actif: actif,
    sb: sb,
    user: null,
    profil: null,
    surChangement: function (fn) { ecouteurs.push(fn); }
  };

  function previens() { ecouteurs.forEach(function (fn) { fn(C); }); dessineBarre(); }

  function chargeProfil() {
    if (!C.user) { C.profil = null; return Promise.resolve(); }
    return sb.from('profils').select('id, pseudo, role, banni').eq('id', C.user.id).maybeSingle()
      .then(function (r) { C.profil = r.data || null; });
  }

  C.estModo = function () { return !!C.profil && !C.profil.banni && (C.profil.role === 'modo' || C.profil.role === 'admin'); };
  C.estAdmin = function () { return !!C.profil && !C.profil.banni && C.profil.role === 'admin'; };
  C.peutEcrire = function () { return !!C.profil && !C.profil.banni; };

  // Prêt quand la session (et un éventuel lien de confirmation reçu par e-mail) est lue.
  C.pret = !actif ? Promise.resolve(C) : sb.auth.getSession().then(function (r) {
    C.user = r.data.session ? r.data.session.user : null;
    return chargeProfil();
  }).then(function () {
    sb.auth.onAuthStateChange(function (evt, session) {
      if (evt === 'PASSWORD_RECOVERY') setTimeout(function () { C.ouvrir('nouveau-mdp'); }, 0);
      var avant = C.user && C.user.id;
      C.user = session ? session.user : null;
      if ((C.user && C.user.id) === avant && evt !== 'USER_UPDATED') return;
      setTimeout(function () { chargeProfil().then(previens); }, 0);
    });
    return C;
  });

  /* ---------- Petits outils partagés ---------- */
  C.esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  // Texte d'un message : échappé, retours à la ligne gardés, liens cliquables.
  C.texte = function (t) {
    return C.esc(t).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"&]/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener nofollow ugc">' + u + '</a>';
    }).replace(/\n/g, '<br>');
  };
  C.quand = function (iso) {
    var d = new Date(iso), s = (Date.now() - d) / 1000;
    if (s < 60) return 'à l\'instant';
    if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h';
    if (s < 172800) return 'hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  C.badge = function (p) {
    if (!p) return '<span class="who">Compte supprimé</span>';
    var b = p.role === 'admin' ? '<span class="role admin">Admin</span>'
      : p.role === 'modo' ? '<span class="role modo">Modo</span>' : '';
    return '<span class="who">' + C.esc(p.pseudo) + '</span>' + b;
  };
  C.erreur = function (e) {
    var m = (e && (e.message || e.error_description)) || String(e || '');
    var T = [
      [/Invalid login credentials/i, 'E-mail ou mot de passe incorrect.'],
      [/Email not confirmed/i, 'Confirme d\'abord ton adresse : clique sur le lien reçu par e-mail.'],
      [/already registered|already been registered/i, 'Un compte existe déjà avec cet e-mail.'],
      [/Password should be|weak.?password/i, 'Mot de passe trop faible : 8 caractères minimum.'],
      [/rate limit|too many|over_email_send_rate_limit/i, 'Trop d\'essais d\'un coup. Réessaie dans quelques minutes.'],
      [/invalid.*email|Unable to validate email/i, 'Adresse e-mail invalide.'],
      [/row-level security|permission denied/i, 'Tu n\'as pas le droit de faire ça (compte banni ou sujet verrouillé ?).'],
      [/Failed to fetch|NetworkError|Load failed/i, 'Pas de connexion au serveur. Vérifie ton Internet.'],
      [/check constraint/i, 'Texte trop court ou trop long.']
    ];
    for (var i = 0; i < T.length; i++) if (T[i][0].test(m)) return T[i][1];
    return m || 'Une erreur est survenue.';
  };

  /* ---------- Bouton « compte » dans la barre du haut ---------- */
  function dessineBarre() {
    document.querySelectorAll('[data-compte]').forEach(function (el) {
      if (!actif) { el.innerHTML = ''; return; }
      if (!C.user) {
        el.innerHTML = '<button type="button" class="btn btn-ghost btn-sm" data-ouvrir="connexion">Se connecter</button>';
        return;
      }
      var p = C.profil;
      el.innerHTML = '<details class="menu"><summary class="chip">' +
        '<span class="av-l">' + C.esc((p ? p.pseudo : '?').charAt(0).toUpperCase()) + '</span>' +
        C.esc(p ? p.pseudo : 'Mon compte') + '</summary><div class="menu-in">' +
        (p && p.banni ? '<p class="small warn">Ton compte est banni du forum.</p>' : '') +
        (C.estModo() ? '<a href="' + racine() + 'admin/">🛡️ Espace admin</a>' : '') +
        '<a href="' + racine() + 'forum/">💬 Forum</a>' +
        '<button type="button" data-ouvrir="mon-compte">⚙️ Mon compte</button>' +
        '<button type="button" data-deconnexion>🚪 Se déconnecter</button></div></details>';
    });
  }
  function racine() { return /\/(forum|admin)\/[^/]*$/.test(location.pathname) ? '../' : './'; }

  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-ouvrir]');
    if (o) { e.preventDefault(); C.ouvrir(o.getAttribute('data-ouvrir')); }
    if (e.target.closest('[data-deconnexion]')) sb.auth.signOut();
    if (e.target.closest('[data-fermer]') || e.target.classList.contains('modal')) fermer();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermer(); });
  document.addEventListener('DOMContentLoaded', function () { C.pret.then(dessineBarre); });

  /* ---------- Fenêtre connexion / inscription ---------- */
  var modal;
  function fermer() { if (modal) { modal.remove(); modal = null; } }

  var VUES = {
    connexion: function () {
      return '<h2>Se connecter</h2>' +
        '<form data-f="connexion"><label>E-mail<input type="email" name="email" required autocomplete="email"></label>' +
        '<label>Mot de passe<input type="password" name="mdp" required autocomplete="current-password"></label>' +
        '<p class="err" data-err></p><button class="btn btn-play full">Se connecter</button></form>' +
        '<p class="small center">Pas encore de compte ? <a href="#" data-ouvrir="inscription">Inscris-toi</a><br>' +
        '<a href="#" data-ouvrir="oubli">Mot de passe oublié ?</a></p>';
    },
    inscription: function () {
      return '<h2>Créer un compte</h2>' +
        '<form data-f="inscription"><label>Pseudo<input name="pseudo" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_\\-]{3,20}" autocomplete="nickname"></label>' +
        '<p class="small">3 à 20 caractères : lettres, chiffres, _ ou -. Il sera visible par tous.</p>' +
        '<label>E-mail<input type="email" name="email" required autocomplete="email"></label>' +
        '<p class="small">Ton e-mail reste privé : il sert seulement à te connecter.</p>' +
        '<label>Mot de passe<input type="password" name="mdp" required minlength="8" autocomplete="new-password"></label>' +
        '<label class="check"><input type="checkbox" required> J\'accepte de rester respectueux et la <a href="' + racine() + 'confidentialite.html#forum" target="_blank">politique de confidentialité</a>.</label>' +
        '<p class="err" data-err></p><button class="btn btn-play full">Créer mon compte</button></form>' +
        '<p class="small center">Déjà inscrit ? <a href="#" data-ouvrir="connexion">Connecte-toi</a></p>';
    },
    oubli: function () {
      return '<h2>Mot de passe oublié</h2><p class="muted">On t\'envoie un lien par e-mail pour en choisir un nouveau.</p>' +
        '<form data-f="oubli"><label>E-mail<input type="email" name="email" required autocomplete="email"></label>' +
        '<p class="err" data-err></p><button class="btn btn-play full">Envoyer le lien</button></form>' +
        '<p class="small center"><a href="#" data-ouvrir="connexion">Retour</a></p>';
    },
    'nouveau-mdp': function () {
      return '<h2>Nouveau mot de passe</h2>' +
        '<form data-f="nouveau-mdp"><label>Nouveau mot de passe<input type="password" name="mdp" required minlength="8" autocomplete="new-password"></label>' +
        '<p class="err" data-err></p><button class="btn btn-play full">Enregistrer</button></form>';
    },
    'mon-compte': function () {
      var p = C.profil || {};
      return '<h2>Mon compte</h2><p class="muted">Pseudo : <b>' + C.esc(p.pseudo) + '</b><br>E-mail : ' + C.esc(C.user && C.user.email) + '</p>' +
        '<button type="button" class="btn btn-ghost full" data-ouvrir="nouveau-mdp">Changer de mot de passe</button>' +
        '<details class="danger"><summary>Supprimer mon compte</summary>' +
        '<p class="small">Ton compte, tes sujets et tes réponses seront effacés pour de bon.</p>' +
        '<form data-f="supprimer"><label>Écris SUPPRIMER pour confirmer<input name="ok" required pattern="SUPPRIMER"></label>' +
        '<p class="err" data-err></p><button class="btn btn-danger full">Supprimer définitivement</button></form></details>';
    },
    info: function (txt) { return txt; }
  };

  C.ouvrir = function (vue, html) {
    if (!actif) return;
    fermer();
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = '<div class="modal-in" role="dialog" aria-modal="true"><button type="button" class="x" data-fermer aria-label="Fermer">×</button>' +
      VUES[vue](html) + '</div>';
    document.body.appendChild(modal);
    var champ = modal.querySelector('input');
    if (champ) champ.focus();
  };
  function info(titre, txt) {
    C.ouvrir('info', '<h2>' + titre + '</h2><p class="muted">' + txt + '</p><button type="button" class="btn btn-play full" data-fermer>OK</button>');
  }

  document.addEventListener('submit', function (e) {
    var f = e.target.closest('form[data-f]');
    if (!f || !modal || !modal.contains(f)) return;
    e.preventDefault();
    var v = function (n) { return f.elements[n] ? f.elements[n].value.trim() : ''; };
    var err = f.querySelector('[data-err]');
    var btn = f.querySelector('button');
    btn.disabled = true; err.textContent = '';
    var retour = location.origin + location.pathname;
    var action;
    switch (f.getAttribute('data-f')) {
      case 'connexion':
        action = sb.auth.signInWithPassword({ email: v('email'), password: f.elements.mdp.value })
          .then(function (r) { if (r.error) throw r.error; fermer(); });
        break;
      case 'inscription':
        action = sb.rpc('pseudo_disponible', { p: v('pseudo') }).then(function (r) {
          if (r.error) throw r.error;
          if (!r.data) throw new Error('Ce pseudo est déjà pris, choisis-en un autre.');
          return sb.auth.signUp({ email: v('email'), password: f.elements.mdp.value,
            options: { data: { pseudo: v('pseudo') }, emailRedirectTo: retour } });
        }).then(function (r) {
          if (r.error) throw r.error;
          if (r.data.session) fermer();
          else info('Vérifie tes e-mails 📬', 'On t\'a envoyé un lien à <b>' + C.esc(v('email')) + '</b>. Clique dessus pour activer ton compte, puis reviens ici. (Regarde aussi dans les spams.)');
        });
        break;
      case 'oubli':
        action = sb.auth.resetPasswordForEmail(v('email'), { redirectTo: retour }).then(function (r) {
          if (r.error) throw r.error;
          info('Lien envoyé 📬', 'Si un compte existe avec cette adresse, tu vas recevoir un e-mail.');
        });
        break;
      case 'nouveau-mdp':
        action = sb.auth.updateUser({ password: f.elements.mdp.value }).then(function (r) {
          if (r.error) throw r.error;
          info('C\'est fait ✅', 'Ton nouveau mot de passe est enregistré.');
        });
        break;
      case 'supprimer':
        action = sb.rpc('supprimer_mon_compte').then(function (r) {
          if (r.error) throw r.error;
          return sb.auth.signOut({ scope: 'local' });
        }).then(function () { info('Compte supprimé', 'Ton compte et tes messages ont été effacés. À bientôt peut-être !'); });
        break;
    }
    action.catch(function (x) { err.textContent = C.erreur(x); }).then(function () { btn.disabled = false; });
  });
})();
