/* Forum Les Naufragés : liste des sujets (#), un sujet (#sujet-12), nouveau sujet (#nouveau). */
(function () {
  var C = window.Compte;
  var app = document.getElementById('app');
  var esc = C.esc;
  var PAR_PAGE = 25;
  var CATS = {
    general: '💬 Discussion', 'mot-mystere': '🟩 Mot Mystère', minecraft: '⛏️ Minecraft',
    discord: '🎮 Discord', aide: '🆘 Aide'
  };
  var PROFIL = 'profil:profils!auteur(pseudo, role)';
  var filtre = '';

  function catTag(c) { return '<span class="tag cat-' + esc(c) + '">' + (CATS[c] || CATS.general) + '</span>'; }
  function charge(msg) { app.innerHTML = '<p class="muted center pad">' + (msg || 'Chargement…') + '</p>'; }
  function oups(e) { app.innerHTML = '<div class="card center pad"><p>😕 ' + esc(C.erreur(e)) + '</p><a class="btn btn-ghost" href="#">Retour au forum</a></div>'; }
  function invite() {
    if (!C.user) return '<p class="invite">Pour participer, <a href="#" data-ouvrir="connexion">connecte-toi</a> ou <a href="#" data-ouvrir="inscription">crée un compte</a> (gratuit).</p>';
    if (!C.peutEcrire()) return '<p class="invite warn">Ton compte est banni : tu peux lire mais plus écrire.</p>';
    return '';
  }

  function route() {
    if (!C.actif) {
      app.innerHTML = '<div class="card center pad"><h2>Le forum ouvre très bientôt 🚧</h2>' +
        '<p class="muted">En attendant, viens discuter avec nous sur le Discord.</p>' +
        '<a class="btn btn-discord" href="https://discord.gg/Xdkzj8bZnk" target="_blank" rel="noopener">💬 Rejoindre le Discord</a></div>';
      return;
    }
    var h = location.hash;
    var m = /^#sujet-(\d+)/.exec(h);
    if (m) return sujet(Number(m[1]));
    if (h === '#nouveau') return nouveau();
    liste();
  }

  /* ---------- Liste des sujets ---------- */
  function liste(page) {
    page = page || 1;
    charge();
    var q = C.sb.from('sujets').select('id, categorie, titre, epingle, verrouille, nb_reponses, activite_le, ' + PROFIL)
      .order('epingle', { ascending: false }).order('activite_le', { ascending: false })
      .range(0, page * PAR_PAGE);
    if (filtre) q = q.eq('categorie', filtre);
    q.then(function (r) {
      if (r.error) return oups(r.error);
      var plus = r.data.length > page * PAR_PAGE;
      var lignes = r.data.slice(0, page * PAR_PAGE);
      app.innerHTML =
        '<div class="f-bar"><div class="filters" role="group" aria-label="Catégories">' +
          '<button type="button" data-cat="" aria-pressed="' + !filtre + '">Tout</button>' +
          Object.keys(CATS).map(function (c) { return '<button type="button" data-cat="' + c + '" aria-pressed="' + (filtre === c) + '">' + CATS[c] + '</button>'; }).join('') +
        '</div>' + (C.peutEcrire() ? '<a class="btn btn-play" href="#nouveau">＋ Nouveau sujet</a>' : '') + '</div>' +
        invite() +
        '<div class="topics">' + (lignes.map(function (s) {
          return '<a class="topic' + (s.epingle ? ' pin' : '') + '" href="#sujet-' + s.id + '">' +
            '<div class="t-main"><div class="t-title">' + (s.epingle ? '📌 ' : '') + (s.verrouille ? '🔒 ' : '') + esc(s.titre) + '</div>' +
            '<div class="meta">' + catTag(s.categorie) + ' par ' + C.badge(s.profil) + '</div></div>' +
            '<div class="t-side"><b>' + s.nb_reponses + '</b><span>' + (s.nb_reponses > 1 ? 'réponses' : 'réponse') + '</span>' +
            '<small>' + C.quand(s.activite_le) + '</small></div></a>';
        }).join('') || '<p class="muted center pad">Aucun sujet ici pour l\'instant. Lance la discussion !</p>') + '</div>' +
        (plus ? '<div class="more-row"><button type="button" class="btn btn-ghost" data-plus="' + (page + 1) + '">Voir plus de sujets</button></div>' : '');
    });
  }

  /* ---------- Un sujet et ses réponses ---------- */
  function sujet(id) {
    charge();
    Promise.all([
      C.sb.from('sujets').select('*, ' + PROFIL).eq('id', id).maybeSingle(),
      C.sb.from('reponses').select('*, ' + PROFIL).eq('sujet_id', id).order('cree_le').limit(500)
    ]).then(function (res) {
      var s = res[0].data;
      if (res[0].error || res[1].error) return oups(res[0].error || res[1].error);
      if (!s) return oups('Ce sujet n\'existe pas ou a été supprimé.');
      document.title = s.titre + ' – Forum Les Naufragés';
      var modo = C.estModo();
      var peutRepondre = C.peutEcrire() && (!s.verrouille || modo);
      app.innerHTML =
        '<p><a class="back" href="#">← Tous les sujets</a></p>' +
        '<h1 class="s-title">' + (s.epingle ? '📌 ' : '') + (s.verrouille ? '🔒 ' : '') + esc(s.titre) + '</h1>' +
        '<div class="meta">' + catTag(s.categorie) + '</div>' +
        (modo ? '<div class="modbar">🛡️ Modération : ' +
          '<button type="button" class="btn btn-ghost btn-sm" data-mod="epingle">' + (s.epingle ? 'Désépingler' : 'Épingler') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-mod="verrouille">' + (s.verrouille ? 'Déverrouiller' : 'Verrouiller') + '</button></div>' : '') +
        message(s, 'sujet') +
        res[1].data.map(function (r) { return message(r, 'reponse'); }).join('') +
        (s.verrouille ? '<p class="invite">🔒 Ce sujet est verrouillé : on ne peut plus y répondre.</p>' : '') +
        (peutRepondre ? '<form class="card reply" data-repondre><label for="rep">Ta réponse</label>' +
          '<textarea id="rep" name="texte" required maxlength="3000" rows="4" placeholder="Écris ton message…"></textarea>' +
          '<p class="err" data-err></p><button class="btn btn-play">Répondre</button></form>' : (s.verrouille ? '' : invite()));
      app.setAttribute('data-sujet', JSON.stringify({ id: s.id, epingle: s.epingle, verrouille: s.verrouille }));
    });
  }

  function message(m, type) {
    var moi = C.user && m.auteur === C.user.id;
    var actions = [];
    if (moi && C.peutEcrire()) actions.push('<button type="button" data-edit>Modifier</button>');
    if (moi || C.estModo()) actions.push('<button type="button" data-suppr>Supprimer</button>');
    if (C.peutEcrire() && !moi) actions.push('<button type="button" data-signal>Signaler</button>');
    return '<article class="msg-f" data-type="' + type + '" data-id="' + m.id + '" id="' + type + '-' + m.id + '">' +
      '<div class="av-l">' + esc((m.profil ? m.profil.pseudo : '?').charAt(0).toUpperCase()) + '</div>' +
      '<div class="msg-b"><div class="meta">' + C.badge(m.profil) + '<time datetime="' + esc(m.cree_le) + '">' + C.quand(m.cree_le) + '</time>' +
      (m.modifie_le ? '<span class="small">(modifié)</span>' : '') + '</div>' +
      '<div class="msg-t" data-brut="' + esc(m.texte) + '">' + C.texte(m.texte) + '</div>' +
      (actions.length ? '<div class="msg-a">' + actions.join('') + '</div>' : '') + '</div></article>';
  }

  /* ---------- Nouveau sujet ---------- */
  function nouveau() {
    if (!C.peutEcrire()) { app.innerHTML = '<p><a class="back" href="#">← Tous les sujets</a></p>' + (invite() || ''); return; }
    app.innerHTML = '<p><a class="back" href="#">← Tous les sujets</a></p><h1 class="s-title">Nouveau sujet</h1>' +
      '<form class="card" data-nouveau><label for="cat">Catégorie</label><select id="cat" name="categorie">' +
      Object.keys(CATS).map(function (c) { return '<option value="' + c + '"' + (c === (filtre || 'general') ? ' selected' : '') + '>' + CATS[c] + '</option>'; }).join('') +
      '</select><label for="tit">Titre</label><input id="tit" name="titre" required minlength="3" maxlength="100" placeholder="De quoi veux-tu parler ?">' +
      '<label for="txt">Message</label><textarea id="txt" name="texte" required maxlength="5000" rows="8"></textarea>' +
      '<p class="small muted">Reste respectueux : pas d\'insulte, de spam ni d\'infos personnelles. Les modos peuvent supprimer un message.</p>' +
      '<p class="err" data-err></p><button class="btn btn-play">Publier</button></form>';
  }

  /* ---------- Actions ---------- */
  function table(type) { return type === 'sujet' ? 'sujets' : 'reponses'; }
  function verifie(r) { if (r.error) throw r.error; return r; }

  app.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-cat]'))) { filtre = b.getAttribute('data-cat'); return liste(); }
    if ((b = e.target.closest('[data-plus]'))) return liste(Number(b.getAttribute('data-plus')));
    if ((b = e.target.closest('[data-mod]'))) {
      var s = JSON.parse(app.getAttribute('data-sujet')), champ = b.getAttribute('data-mod'), maj = {};
      maj[champ] = !s[champ];
      b.disabled = true;
      return C.sb.from('sujets').update(maj).eq('id', s.id).then(verifie).then(route).catch(function (x) { alert(C.erreur(x)); b.disabled = false; });
    }
    var art = e.target.closest('.msg-f');
    if (!art) return;
    var type = art.getAttribute('data-type'), id = Number(art.getAttribute('data-id'));
    if (e.target.closest('[data-suppr]')) {
      if (!confirm(type === 'sujet' ? 'Supprimer ce sujet et toutes ses réponses ?' : 'Supprimer ce message ?')) return;
      C.sb.from(table(type)).delete().eq('id', id).then(verifie).then(function () {
        if (type === 'sujet') location.hash = ''; else route();
      }).catch(function (x) { alert(C.erreur(x)); });
    } else if (e.target.closest('[data-signal]')) {
      var raison = prompt('Pourquoi signales-tu ce message ? (insulte, spam…)');
      if (!raison || !raison.trim()) return;
      var sig = { raison: raison.trim().slice(0, 300) };
      sig[type === 'sujet' ? 'sujet_id' : 'reponse_id'] = id;
      C.sb.from('signalements').insert(sig).then(verifie).then(function () { alert('Merci ! Un modérateur va regarder.'); })
        .catch(function (x) { alert(C.erreur(x)); });
    } else if (e.target.closest('[data-edit]')) {
      var t = art.querySelector('.msg-t');
      if (art.querySelector('textarea')) return;
      t.innerHTML = '<form data-modif><textarea name="texte" required rows="5" maxlength="' + (type === 'sujet' ? 5000 : 3000) + '"></textarea>' +
        '<p class="err" data-err></p><button class="btn btn-play btn-sm">Enregistrer</button> <button type="button" class="btn btn-ghost btn-sm" data-annule>Annuler</button></form>';
      t.querySelector('textarea').value = t.getAttribute('data-brut');
      t.querySelector('textarea').focus();
    } else if (e.target.closest('[data-annule]')) route();
  });

  app.addEventListener('submit', function (e) {
    var f = e.target;
    e.preventDefault();
    var err = f.querySelector('[data-err]'), btn = f.querySelector('button');
    var texte = f.elements.texte.value.trim();
    if (!texte) return;
    btn.disabled = true; err.textContent = '';
    var action;
    if (f.hasAttribute('data-nouveau')) {
      action = C.sb.from('sujets').insert({ categorie: f.elements.categorie.value, titre: f.elements.titre.value.trim(), texte: texte })
        .select('id').single().then(verifie).then(function (r) { location.hash = '#sujet-' + r.data.id; });
    } else if (f.hasAttribute('data-repondre')) {
      var s = JSON.parse(app.getAttribute('data-sujet'));
      action = C.sb.from('reponses').insert({ sujet_id: s.id, texte: texte }).select('id').single().then(verifie)
        .then(function (r) { return sujet(s.id), r; });
    } else if (f.hasAttribute('data-modif')) {
      var art = f.closest('.msg-f');
      action = C.sb.from(table(art.getAttribute('data-type'))).update({ texte: texte }).eq('id', Number(art.getAttribute('data-id')))
        .then(verifie).then(route);
    }
    action.catch(function (x) { err.textContent = C.erreur(x); btn.disabled = false; });
  });

  window.addEventListener('hashchange', function () { window.scrollTo(0, 0); route(); });
  C.surChangement(route);
  C.pret.then(route);
})();
