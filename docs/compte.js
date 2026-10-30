/* Comptes du site (forum + admin), via Supabase.
   Utilisé par forum/ et admin/. Les réglages sont dans supabase-config.js. */
(function () {
  // Anti « clickjacking » : le forum et l'admin refusent d'être affichés dans le cadre d'un autre site.
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    try { window.top.location = window.location.href; } catch (e) {}
    return;
  }
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
    return sb.from('profils').select('*').eq('id', C.user.id).maybeSingle()
      .then(function (r) { C.profil = r.data || null; }).then(compteDemandes);
  }

  // Grades du staff, du plus haut au plus bas (mêmes noms que les rôles Discord).
  // rang : 5-4 = gère tout, 3-2 = modération du forum, 1 = badge staff, 0 = membre.
  C.GRADES = [
    { id: 'fondateur', nom: 'Fondateur', rang: 5, info: 'A créé Les Naufragés. Tous les droits.' },
    { id: 'admin', nom: 'Admin', rang: 4, info: 'Gère les membres, les grades et les actualités.' },
    { id: 'responsable', nom: 'Responsable', rang: 3, info: 'Encadre l\'équipe de modération.' },
    { id: 'modo', nom: 'Modo', rang: 2, info: 'Veille au respect des règles sur le forum et le Discord.' },
    { id: 'helper', nom: 'Helper', rang: 1, info: 'Aide les nouveaux joueurs et répond aux questions.' },
    { id: 'builder', nom: 'Builder', rang: 1, info: 'Construit les spawns, maps et décors du serveur.' },
    { id: 'dev', nom: 'Dev', rang: 1, info: 'Développe les plugins, le bot et le site.' },
    { id: 'animateur', nom: 'Animateur', rang: 1, info: 'Organise les events et les giveaways.' },
    { id: 'membre', nom: 'Membre', rang: 0, info: '' }
  ];
  C.grade = function (id) {
    for (var i = 0; i < C.GRADES.length; i++) if (C.GRADES[i].id === id) return C.GRADES[i];
    return C.GRADES[C.GRADES.length - 1];
  };
  C.rang = function () { return C.profil && !C.profil.banni ? C.grade(C.profil.role).rang : 0; };
  C.estModo = function () { return C.rang() >= 2; };
  C.estAdmin = function () { return C.rang() >= 4; };
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
  // Photo de profil (ou l'initiale du pseudo si pas de photo).
  C.avatar = function (p, grand) {
    var cls = 'av-l' + (grand ? ' av-xl' : '');
    if (p && p.avatar) return '<img class="' + cls + '" src="' + C.esc(p.avatar) + '" alt="" loading="lazy">';
    return '<span class="' + cls + '">' + C.esc((p && p.pseudo ? p.pseudo : '?').charAt(0).toUpperCase()) + '</span>';
  };
  C.badge = function (p) {
    if (!p) return '<span class="who">Compte supprimé</span>';
    var g = C.grade(p.role);
    var nom = p.id ? '<button type="button" class="who" data-profil="' + C.esc(p.id) + '">' + C.esc(p.pseudo) + '</button>'
      : '<span class="who">' + C.esc(p.pseudo) + '</span>';
    return nom + (g.rang ? '<span class="role ' + g.id + '">' + g.nom + '</span>' : '');
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
      [/grade|propre grade/i, null],
      [/Failed to fetch|NetworkError|Load failed/i, 'Pas de connexion au serveur. Vérifie ton Internet.'],
      [/amis_paire|duplicate key/i, 'Une demande d\'ami existe déjà entre vous deux.'],
      [/check constraint/i, 'Texte trop court ou trop long.']
    ];
    for (var i = 0; i < T.length; i++) if (T[i][0].test(m)) return T[i][1] || m;
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
        C.avatar(p) +
        C.esc(p ? p.pseudo : 'Mon compte') + (C.demandes ? '<span class="nb" title="Demandes d\'ami">' + C.demandes + '</span>' : '') + '</summary><div class="menu-in">' +
        (p && p.banni ? '<p class="small warn">Ton compte est banni du forum.</p>' : '') +
        (C.estModo() ? '<a href="' + racine() + 'admin/">🛡️ Espace admin</a>' : '') +
        '<a href="' + racine() + 'staff/">⭐ Le staff</a>' +
        '<a href="' + racine() + 'forum/">💬 Forum</a>' +
        '<button type="button" data-ouvrir="amis">👥 Mes amis' + (C.demandes ? ' <span class="nb">' + C.demandes + '</span>' : '') + '</button>' +
        '<button type="button" data-ouvrir="mon-compte">⚙️ Mon compte</button>' +
        '<button type="button" data-deconnexion>🚪 Se déconnecter</button></div></details>';
    });
  }
  function racine() { return /\/(forum|admin|staff|couronne)\/[^/]*$/.test(location.pathname) ? '../' : './'; }

  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-ouvrir]');
    if (o) { e.preventDefault(); C.ouvrir(o.getAttribute('data-ouvrir')); }
    if (e.target.closest('[data-deconnexion]')) sb.auth.signOut();
    var pr = e.target.closest('[data-profil]');
    if (pr) {
      e.preventDefault();
      sb.from('profils').select('*').eq('id', pr.getAttribute('data-profil')).maybeSingle()
        .then(function (r) { if (r.data) C.ouvrir('profil', r.data); });
    }
    if (e.target.closest('[data-sans-photo]')) {
      photo = null; sansPhoto = true;
      var a = modal.querySelector('.pp-edit .av-l');
      if (a) a.outerHTML = C.avatar({ pseudo: C.profil.pseudo }, true);
      e.target.closest('[data-sans-photo]').remove();
    }
    if (e.target.closest('[data-fermer]') || e.target.classList.contains('modal')) fermer();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermer(); });

  // Photo choisie : recadrée en carré et réduite à 256 px (fichier WebP léger) avant l'envoi.
  var photo = null, sansPhoto = false;
  document.addEventListener('change', function (e) {
    if (e.target.name !== 'photo' || !e.target.files[0]) return;
    var err = modal.querySelector('[data-f="profil"] [data-err]');
    var img = new Image();
    img.onload = function () {
      var t = 256, c = document.createElement('canvas'), m = Math.min(img.width, img.height);
      c.width = c.height = t;
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, t, t);
      c.toBlob(function (b) {
        photo = b; sansPhoto = false;
        var a = modal.querySelector('.pp-edit .av-l');
        a.outerHTML = '<img class="av-l av-xl" src="' + URL.createObjectURL(b) + '" alt="">';
      }, 'image/webp', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = function () { err.textContent = 'Cette image ne peut pas être lue. Essaie un fichier JPG ou PNG.'; };
    img.src = URL.createObjectURL(e.target.files[0]);
  });
  document.addEventListener('DOMContentLoaded', function () { C.pret.then(function () { dessineBarre(); proposerProfil(); }); });
  C.surChangement(function () { setTimeout(proposerProfil, 0); });

  /* ---------- Amis (table « amis », voir supabase/amis-parties.sql) ---------- */
  // Une demande en attente reçue = petit chiffre rouge sur le bouton du compte.
  C.demandes = 0;
  function compteDemandes() {
    if (!C.user) { C.demandes = 0; return Promise.resolve(); }
    return sb.from('amis').select('demandeur', { count: 'exact', head: true }).eq('destinataire', C.user.id).eq('accepte', false)
      .then(function (r) { C.demandes = r.error ? 0 : r.count || 0; }, function () { C.demandes = 0; });
  }
  // liens[id de l'autre] = { accepte, recue (true si c'est lui qui a demandé), p (son profil) }
  var liens = {};
  var PROFIL_AMI = 'id, pseudo, avatar, role, banni';
  function chargerAmis() {
    return sb.from('amis').select('demandeur, destinataire, accepte, accepte_le, de:profils!demandeur(' + PROFIL_AMI + '), a:profils!destinataire(' + PROFIL_AMI + ')')
      .order('cree_le', { ascending: false }).then(function (r) {
        if (r.error) throw r.error;
        liens = {};
        r.data.forEach(function (l) {
          var recue = l.destinataire === C.user.id;
          var p = recue ? l.de : l.a;
          if (p) liens[p.id] = { accepte: l.accepte, recue: recue, p: p };
        });
        C.demandes = Object.keys(liens).filter(function (k) { return liens[k].recue && !liens[k].accepte; }).length;
        dessineBarre();
        dessineAmis();
      }).catch(function (x) {
        var b = modal && modal.querySelector('[data-amis-liste]');
        if (b) b.innerHTML = '<p class="err">' + C.esc(C.erreur(x)) + '</p>';
      });
  }
  function boutonsAmi(id, l) {
    var d = ' data-ami-id="' + C.esc(id) + '"';
    if (!l) return '<button type="button" class="btn btn-play btn-sm" data-ami="ajouter"' + d + '>➕ Ajouter en ami</button>';
    if (l.accepte) return '<span class="small ami-ok">✔ Amis</span><button type="button" class="btn btn-ghost btn-sm" data-ami="retirer"' + d + '>Retirer</button>';
    if (l.recue) return '<button type="button" class="btn btn-play btn-sm" data-ami="accepter"' + d + '>✔ Accepter</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-ami="retirer"' + d + '>Refuser</button>';
    return '<span class="small muted">Demande envoyée</span><button type="button" class="btn btn-ghost btn-sm" data-ami="retirer"' + d + '>Annuler</button>';
  }
  function ligneAmi(p, l) {
    return '<div class="ami-l">' + C.avatar(p) + '<div class="ami-n">' + C.badge(p) + '</div><div class="ami-acts">' + boutonsAmi(p.id, l) + '</div></div>';
  }
  function dessineAmis() {
    if (!modal) return;
    var zone = modal.querySelector('[data-ami-zone]');
    if (zone) { var id = zone.getAttribute('data-ami-zone'); zone.innerHTML = '<div class="ami-acts">' + boutonsAmi(id, liens[id]) + '</div><p class="err" data-ami-err></p>'; }
    var res = modal.querySelector('[data-resultats]');
    if (res) res.querySelectorAll('[data-ami-id]').forEach(function (b) {
      var id = b.getAttribute('data-ami-id');
      b.closest('.ami-acts').innerHTML = boutonsAmi(id, liens[id]);
    });
    var box = modal.querySelector('[data-amis-liste]');
    if (!box) return;
    var tous = Object.keys(liens).map(function (k) { return liens[k]; });
    var groupe = function (titre, liste, vide) {
      return '<h3 class="ami-h">' + titre + (liste.length ? ' (' + liste.length + ')' : '') + '</h3>' +
        (liste.length ? liste.map(function (l) { return ligneAmi(l.p, l); }).join('') : (vide ? '<p class="muted small">' + vide + '</p>' : ''));
    };
    var recues = tous.filter(function (l) { return !l.accepte && l.recue; });
    var envoyees = tous.filter(function (l) { return !l.accepte && !l.recue; });
    var amis = tous.filter(function (l) { return l.accepte; }).sort(function (a, b) { return a.p.pseudo.localeCompare(b.p.pseudo); });
    box.innerHTML = '<p class="err" data-ami-err></p>' + (recues.length ? groupe('Demandes reçues', recues) : '') +
      groupe('Mes amis', amis, 'Pas encore d\'amis. Cherche un pseudo ci-dessus, ou clique sur un pseudo du forum pour l\'ajouter.') +
      (envoyees.length ? groupe('Demandes envoyées', envoyees) : '');
  }
  function actionAmi(quoi, id) {
    var moi = C.user.id, a;
    if (quoi === 'ajouter') a = sb.from('amis').insert({ destinataire: id });
    else if (quoi === 'accepter') a = sb.from('amis').update({ accepte: true }).eq('demandeur', id).eq('destinataire', moi);
    else {
      var l = liens[id];
      if (l && l.accepte && !confirm('Retirer ' + l.p.pseudo + ' de tes amis ?')) return;
      a = sb.from('amis').delete().or('and(demandeur.eq.' + moi + ',destinataire.eq.' + id + '),and(demandeur.eq.' + id + ',destinataire.eq.' + moi + ')');
    }
    a.then(function (r) {
      if (r.error) throw r.error;
    }).catch(function (x) {
      var e = modal && modal.querySelector('[data-ami-err]');
      if (e) e.textContent = C.erreur(x); else alert(C.erreur(x));
    }).then(chargerAmis);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ami]');
    if (!b || !C.user) return;
    b.disabled = true;
    actionAmi(b.getAttribute('data-ami'), b.getAttribute('data-ami-id'));
  });

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
        '<label class="check"><input type="checkbox" required> J\'ai au moins 13 ans et j\'accepte les <a href="' + racine() + 'conditions.html" target="_blank">conditions d\'utilisation</a> (règles du forum) et la <a href="' + racine() + 'confidentialite.html#forum" target="_blank">politique de confidentialité</a>.</label>' +
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
    bienvenue: function () {
      return '<h2>Bienvenue ' + C.esc(C.profil.pseudo) + ' ! 🎉</h2><p class="muted">Ton compte est prêt. Ajoute une photo de profil et une petite bio pour que la communauté te reconnaisse.</p>' +
        formProfil('Enregistrer') + '<button type="button" class="btn btn-ghost full plus-tard" data-fermer>Plus tard</button>';
    },
    'mon-compte': function () {
      var p = C.profil || {};
      return '<h2>Mon compte</h2>' + formProfil('Enregistrer mon profil') +
        '<p class="muted small compte-info">Pseudo : <b>' + C.esc(p.pseudo) + '</b> · E-mail : ' + C.esc(C.user && C.user.email) + '</p>' +
        '<button type="button" class="btn btn-ghost full" data-ouvrir="nouveau-mdp">Changer de mot de passe</button>' +
        '<details class="danger"><summary>Supprimer mon compte</summary>' +
        '<p class="small">Ton compte, ta photo, tes sujets et tes réponses seront effacés pour de bon.</p>' +
        '<form data-f="supprimer"><label>Écris SUPPRIMER pour confirmer<input name="ok" required pattern="SUPPRIMER"></label>' +
        '<p class="err" data-err></p><button class="btn btn-danger full">Supprimer définitivement</button></form></details>';
    },
    profil: function (p) {
      var g = C.grade(p.role);
      return '<div class="pp-view">' + C.avatar(p, true) + '<h2>' + C.esc(p.pseudo) + '</h2>' +
        (g.rang ? '<span class="role ' + g.id + '">' + g.nom + '</span>' : '<span class="small muted">Membre</span>') +
        (p.banni ? ' <span class="role ban">Banni</span>' : '') +
        '<p class="bio">' + (p.bio ? C.texte(p.bio) : '<span class="muted">Pas encore de bio.</span>') + '</p>' +
        '<p class="small muted">Membre depuis le ' + new Date(p.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '</p>' +
        (C.user && C.user.id === p.id ? '' : '<div class="ami-zone" data-ami-zone="' + C.esc(p.id) + '">' +
          (C.user ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-ouvrir="connexion">Se connecter pour l\'ajouter en ami</button>') + '</div>') +
        '</div>';
    },
    amis: function () {
      return '<h2>👥 Mes amis</h2>' +
        '<form data-f="cherche-ami" class="ami-cherche"><label>Ajouter un ami<input name="pseudo" required minlength="2" maxlength="20" placeholder="Son pseudo…" autocomplete="off"></label>' +
        '<button class="btn btn-play btn-sm">Chercher</button><p class="err" data-err></p></form>' +
        '<div data-resultats></div><div data-amis-liste><p class="muted small">Chargement…</p></div>';
    },
    info: function (txt) { return txt; }
  };

  function formProfil(bouton) {
    var p = C.profil || {};
    return '<form data-f="profil"><div class="pp-edit">' + C.avatar(p, true) + '<div>' +
      '<label class="btn btn-ghost btn-sm">📷 ' + (p.avatar ? 'Changer la photo' : 'Ajouter une photo') + '<input type="file" name="photo" accept="image/*" hidden></label>' +
      (p.avatar ? ' <button type="button" class="btn btn-ghost btn-sm" data-sans-photo>Retirer</button>' : '') +
      '<p class="small muted">Image carrée conseillée, elle sera réduite automatiquement.</p></div></div>' +
      '<label>Bio<textarea name="bio" maxlength="300" rows="3" placeholder="Présente-toi en quelques mots (300 caractères max)">' + C.esc(p.bio || '') + '</textarea></label>' +
      '<p class="err" data-err></p><button class="btn btn-play full">' + bouton + '</button></form>';
  }

  // Nouveau compte (photo et bio vides) : on propose une fois de personnaliser son profil.
  function proposerProfil() {
    if (!C.profil || C.profil.avatar || C.profil.bio || modal || !('avatar' in C.profil)) return;
    var cle = 'profil-propose-' + C.profil.id;
    try { if (localStorage.getItem(cle)) return; localStorage.setItem(cle, '1'); } catch (e) { return; }
    C.ouvrir('bienvenue');
  }

  C.ouvrir = function (vue, html) {
    if (!actif) return;
    fermer();
    modal = document.createElement('div');
    modal.className = 'modal';
    if (vue === 'mon-compte' || vue === 'bienvenue') { photo = null; sansPhoto = false; }
    modal.innerHTML = '<div class="modal-in" role="dialog" aria-modal="true"><button type="button" class="x" data-fermer aria-label="Fermer">×</button>' +
      VUES[vue](html) + '</div>';
    document.body.appendChild(modal);
    var champ = modal.querySelector('input');
    if (champ) champ.focus();
    if (vue === 'amis') chargerAmis();
    if (vue === 'profil' && C.user) chargerAmis();
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
    var btn = f.querySelector('button:not([type=button])');
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
          if (r.data.session) { fermer(); setTimeout(function () { chargeProfil().then(proposerProfil); }, 300); }
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
      case 'profil':
        var dossier = C.user.id + '/';
        var envoi = !photo ? Promise.resolve(sansPhoto ? null : C.profil.avatar || null)
          : sb.storage.from('avatars').upload(dossier + 'photo.webp', photo, { upsert: true, contentType: 'image/webp', cacheControl: '3600' })
            .then(function (r) {
              if (r.error) throw r.error;
              return sb.storage.from('avatars').getPublicUrl(dossier + 'photo.webp').data.publicUrl + '?v=' + Date.now();
            });
        action = envoi.then(function (url) {
          if (sansPhoto) sb.storage.from('avatars').remove([dossier + 'photo.webp']);
          return sb.from('profils').update({ avatar: url, bio: v('bio') || null }).eq('id', C.user.id).select('avatar, bio').single();
        }).then(function (r) {
          if (r.error) throw r.error;
          C.profil.avatar = r.data.avatar; C.profil.bio = r.data.bio;
          previens();
          info('Profil enregistré ✅', 'Ta photo et ta bio sont à jour.');
        });
        break;
      case 'cherche-ami':
        var q = v('pseudo').replace(/[%_\\]/g, '\\$&');
        action = sb.from('profils').select('id, pseudo, avatar, role').ilike('pseudo', '%' + q + '%').neq('id', C.user.id)
          .order('pseudo').limit(8).then(function (r) {
            if (r.error) throw r.error;
            var box = modal && modal.querySelector('[data-resultats]');
            if (box) box.innerHTML = r.data.length ? '<h3 class="ami-h">Résultats</h3>' + r.data.map(function (p) { return ligneAmi(p, liens[p.id]); }).join('')
              : '<p class="muted small">Personne avec ce pseudo.</p>';
          });
        break;
      case 'supprimer':
        action = sb.storage.from('avatars').remove([C.user.id + '/photo.webp']).then(function () {
          return sb.rpc('supprimer_mon_compte');
        }).then(function (r) {
          if (r.error) throw r.error;
          return sb.auth.signOut({ scope: 'local' });
        }).then(function () { info('Compte supprimé', 'Ton compte et tes messages ont été effacés. À bientôt peut-être !'); });
        break;
    }
    action.catch(function (x) { err.textContent = C.erreur(x); }).then(function () { btn.disabled = false; });
  });
})();
