/* Espace admin : signalements et derniers messages (modos), membres et actualités (admin). */
(function () {
  var C = window.Compte;
  var box = document.getElementById('admin');
  var esc = C.esc;
  var onglet = 'signalements';
  var PROFIL = 'profil:profils!auteur(*)';
  var CATS = { site: '🌐 Site', appli: '📱 Appli', discord: '💬 Discord', minecraft: '⛏️ Minecraft', bot: '🤖 Bot' };

  function verifie(r) { if (r.error) throw r.error; return r; }
  function oups(x) { alert(C.erreur(x)); }
  function extrait(t) { t = String(t || ''); return esc(t.length > 220 ? t.slice(0, 220) + '…' : t); }

  function affiche() {
    if (!C.actif) {
      box.innerHTML = '<div class="card pad"><h2>Le forum n\'est pas encore branché</h2>' +
        '<p class="muted">Crée le projet Supabase gratuit puis colle son adresse et sa clé publique dans <code>docs/supabase-config.js</code> ' +
        '(voir <code>supabase/LISEZMOI.md</code> dans le dépôt).</p></div>';
      return;
    }
    if (!C.user) {
      box.innerHTML = '<div class="card center pad narrow"><h2>Connexion requise</h2><p class="muted">Connecte-toi avec ton compte admin.</p>' +
        '<button type="button" class="btn btn-play" data-ouvrir="connexion">Se connecter</button></div>';
      return;
    }
    if (!C.estModo()) {
      box.innerHTML = '<div class="card center pad narrow"><h2>Accès réservé 🔒</h2><p class="muted">Cet espace est réservé aux admins et aux modérateurs.</p>' +
        '<a class="btn btn-ghost" href="../forum/">Aller au forum</a></div>';
      return;
    }
    var tabs = [['signalements', '🚩 Signalements'], ['messages', '💬 Derniers messages']];
    if (C.estAdmin()) tabs.push(['membres', '👥 Membres'], ['actus', '📰 Actualités']);
    if (!tabs.some(function (t) { return t[0] === onglet; })) onglet = 'signalements';
    box.innerHTML = '<p class="center muted">Connecté en tant que ' + C.badge(C.profil) + '</p>' +
      '<div class="filters tabs" role="tablist">' + tabs.map(function (t) {
        return '<button type="button" role="tab" data-onglet="' + t[0] + '" aria-pressed="' + (t[0] === onglet) + '">' + t[1] + '</button>';
      }).join('') + '</div><div id="panneau"><p class="muted center pad">Chargement…</p></div>';
    ({ signalements: signalements, messages: messages, membres: membres, actus: actus })[onglet]();
  }
  function panneau(html) { var p = document.getElementById('panneau'); if (p) p.innerHTML = html; }

  /* ---------- Signalements ---------- */
  function signalements() {
    C.sb.from('signalements').select('id, raison, cree_le, ' + PROFIL +
      ', sujet:sujets(id, titre, texte), reponse:reponses(id, sujet_id, texte)').order('cree_le', { ascending: false }).limit(100)
      .then(verifie).then(function (r) {
        panneau(r.data.map(function (s) {
          var cible = s.sujet ? { type: 'sujet', id: s.sujet.id, lien: s.sujet.id, texte: s.sujet.titre + ' — ' + s.sujet.texte }
            : s.reponse ? { type: 'reponse', id: s.reponse.id, lien: s.reponse.sujet_id, texte: s.reponse.texte } : null;
          return '<div class="card row-a"><div class="meta">🚩 Signalé par ' + C.badge(s.profil) + ' · ' + C.quand(s.cree_le) + '</div>' +
            '<p><b>Raison :</b> ' + esc(s.raison) + '</p>' +
            (cible ? '<blockquote>' + extrait(cible.texte) + '</blockquote>' : '<p class="muted">Message déjà supprimé.</p>') +
            '<div class="acts">' + (cible ? '<a class="btn btn-ghost btn-sm" href="../forum/#sujet-' + cible.lien + '" target="_blank">Voir</a>' +
              '<button type="button" class="btn btn-danger btn-sm" data-suppr="' + cible.type + '" data-id="' + cible.id + '" data-sig="' + s.id + '">Supprimer le message</button>' : '') +
            '<button type="button" class="btn btn-ghost btn-sm" data-ignorer="' + s.id + '">' + (cible ? 'Ignorer' : 'Retirer') + '</button></div></div>';
        }).join('') || '<p class="muted center pad">Aucun signalement 🎉 Tout est calme.</p>');
      }).catch(function (x) { panneau('<p class="err">' + esc(C.erreur(x)) + '</p>'); });
  }

  /* ---------- Derniers messages ---------- */
  function messages() {
    Promise.all([
      C.sb.from('sujets').select('id, titre, texte, cree_le, ' + PROFIL).order('cree_le', { ascending: false }).limit(20),
      C.sb.from('reponses').select('id, sujet_id, texte, cree_le, ' + PROFIL).order('cree_le', { ascending: false }).limit(30)
    ]).then(function (res) {
      verifie(res[0]); verifie(res[1]);
      var tout = res[0].data.map(function (s) { return { type: 'sujet', id: s.id, lien: s.id, t: '<b>' + esc(s.titre) + '</b> — ' + extrait(s.texte), p: s.profil, d: s.cree_le }; })
        .concat(res[1].data.map(function (r) { return { type: 'reponse', id: r.id, lien: r.sujet_id, t: extrait(r.texte), p: r.profil, d: r.cree_le }; }))
        .sort(function (a, b) { return a.d < b.d ? 1 : -1; });
      panneau(tout.map(function (m) {
        return '<div class="card row-a"><div class="meta">' + (m.type === 'sujet' ? '🆕 Sujet' : '↩️ Réponse') + ' de ' + C.badge(m.p) + ' · ' + C.quand(m.d) + '</div>' +
          '<p>' + m.t + '</p><div class="acts"><a class="btn btn-ghost btn-sm" href="../forum/#sujet-' + m.lien + '" target="_blank">Voir</a>' +
          '<button type="button" class="btn btn-danger btn-sm" data-suppr="' + m.type + '" data-id="' + m.id + '">Supprimer</button></div></div>';
      }).join('') || '<p class="muted center pad">Pas encore de message sur le forum.</p>');
    }).catch(function (x) { panneau('<p class="err">' + esc(C.erreur(x)) + '</p>'); });
  }

  /* ---------- Membres ---------- */
  var recherche = '';
  function membres() {
    var q = C.sb.from('profils').select('*').order('cree_le', { ascending: false }).limit(100);
    if (recherche) q = q.ilike('pseudo', '%' + recherche.replace(/[%_\\]/g, '\\$&') + '%');
    q.then(verifie).then(function (r) {
      panneau('<form class="search" data-recherche><input name="q" placeholder="Chercher un pseudo…" value="' + esc(recherche) + '"><button class="btn btn-ghost btn-sm">Chercher</button></form>' +
        '<p class="small muted"><b>Modo / Responsable</b> : suppriment les messages, épinglent et verrouillent les sujets. <b>Admin / Fondateur</b> : tout, y compris les membres, les grades et les actus. ' +
        '<b>Helper, Builder, Dev, Animateur</b> : badge staff (mêmes droits qu\'un membre sur le site). Tu ne peux gérer que les grades inférieurs au tien.</p>' +
        '<div class="card table"><table><thead><tr><th>Pseudo</th><th>Inscrit</th><th>Grade</th><th>Statut</th></tr></thead><tbody>' +
        r.data.map(function (p) {
          var moi = p.id === C.user.id;
          var monRang = C.rang(), fondateur = C.profil.role === 'fondateur';
          var gerable = !moi && C.grade(p.role).rang < monRang;
          return '<tr data-membre="' + p.id + '"><td><div class="m-nom">' + C.avatar(p) + '<b>' + esc(p.pseudo) + '</b>' + (moi ? ' <span class="small muted">(toi)</span>' : '') + '</div></td>' +
            '<td>' + C.quand(p.cree_le) + '</td>' +
            '<td><select data-role' + (gerable ? '' : ' disabled') + '>' + C.GRADES.filter(function (g) {
              return g.id === p.role || g.rang < monRang || fondateur;
            }).map(function (g) {
              return '<option value="' + g.id + '"' + (p.role === g.id ? ' selected' : '') + '>' + g.nom + '</option>';
            }).join('') + '</select></td>' +
            '<td>' + (!gerable ? '—' : '<button type="button" class="btn btn-sm ' + (p.banni ? 'btn-ghost' : 'btn-danger') + '" data-ban="' + !p.banni + '">' +
              (p.banni ? 'Débannir' : 'Bannir') + '</button>' + (p.banni ? ' <span class="role ban">Banni</span>' : '')) + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    }).catch(function (x) { panneau('<p class="err">' + esc(C.erreur(x)) + '</p>'); });
  }

  /* ---------- Actualités ---------- */
  function actus() {
    C.sb.from('actualites').select('*').order('date', { ascending: false }).order('id', { ascending: false }).then(verifie).then(function (r) {
      var auj = new Date().toISOString().slice(0, 10);
      panneau('<form class="card" data-actu><h2>Publier une actualité</h2>' +
        '<div class="row2"><div><label for="a-cat">Catégorie</label><select id="a-cat" name="categorie">' +
        Object.keys(CATS).map(function (c) { return '<option value="' + c + '">' + CATS[c] + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="a-date">Date</label><input id="a-date" type="date" name="date" value="' + auj + '" required></div></div>' +
        '<label for="a-tit">Titre</label><input id="a-tit" name="titre" required minlength="3" maxlength="120">' +
        '<label for="a-txt">Texte</label><textarea id="a-txt" name="texte" required maxlength="1000" rows="4"></textarea>' +
        '<div class="row2"><div><label for="a-lien">Lien (facultatif)</label><input id="a-lien" name="lien" placeholder="https://… ou forum/"></div>' +
        '<div><label for="a-btn">Texte du bouton</label><input id="a-btn" name="bouton" maxlength="40" placeholder="En savoir plus"></div></div>' +
        '<label class="check"><input type="checkbox" name="epingle"> 📌 Épingler tout en haut</label>' +
        '<p class="err" data-err></p><button class="btn btn-play">Publier sur le site</button></form>' +
        '<h2 class="h-list">Publiées depuis l\'admin</h2>' +
        (r.data.map(function (a) {
          return '<div class="card row-a"><div class="meta"><span class="tag ' + esc(a.categorie) + '">' + (CATS[a.categorie] || '') + '</span> ' +
            new Date(a.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + (a.epingle ? ' · 📌 Épinglée' : '') + '</div>' +
            '<p><b>' + esc(a.titre) + '</b><br>' + extrait(a.texte) + '</p><div class="acts">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-epingle-actu="' + a.id + '" data-val="' + !a.epingle + '">' + (a.epingle ? 'Désépingler' : 'Épingler') + '</button>' +
            '<button type="button" class="btn btn-danger btn-sm" data-suppr-actu="' + a.id + '">Supprimer</button></div></div>';
        }).join('') || '<p class="muted">Aucune pour l\'instant. Les anciennes actus restent dans <code>docs/actualites.js</code>.</p>'));
    }).catch(function (x) { panneau('<p class="err">' + esc(C.erreur(x)) + '</p>'); });
  }

  /* ---------- Clics ---------- */
  box.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-onglet')) { onglet = b.getAttribute('data-onglet'); return affiche(); }
    if (b.hasAttribute('data-suppr')) {
      if (!confirm('Supprimer ce message pour de bon ?')) return;
      var t = b.getAttribute('data-suppr') === 'sujet' ? 'sujets' : 'reponses';
      return C.sb.from(t).delete().eq('id', Number(b.getAttribute('data-id'))).then(verifie).then(affiche).catch(oups);
    }
    if (b.hasAttribute('data-ignorer')) {
      return C.sb.from('signalements').delete().eq('id', Number(b.getAttribute('data-ignorer'))).then(verifie).then(affiche).catch(oups);
    }
    if (b.hasAttribute('data-ban')) {
      var ban = b.getAttribute('data-ban') === 'true';
      var pseudo = b.closest('tr').querySelector('b').textContent;
      if (ban && !confirm('Bannir ' + pseudo + ' ? Il pourra lire le forum mais plus écrire.')) return;
      return C.sb.from('profils').update({ banni: ban }).eq('id', b.closest('tr').getAttribute('data-membre')).then(verifie).then(affiche).catch(oups);
    }
    if (b.hasAttribute('data-suppr-actu')) {
      if (!confirm('Supprimer cette actualité du site ?')) return;
      return C.sb.from('actualites').delete().eq('id', Number(b.getAttribute('data-suppr-actu'))).then(verifie).then(affiche).catch(oups);
    }
    if (b.hasAttribute('data-epingle-actu')) {
      return C.sb.from('actualites').update({ epingle: b.getAttribute('data-val') === 'true' }).eq('id', Number(b.getAttribute('data-epingle-actu')))
        .then(verifie).then(affiche).catch(oups);
    }
  });
  box.addEventListener('change', function (e) {
    if (!e.target.hasAttribute('data-role')) return;
    var tr = e.target.closest('tr');
    C.sb.from('profils').update({ role: e.target.value }).eq('id', tr.getAttribute('data-membre')).then(verifie).then(affiche)
      .catch(function (x) { oups(x); affiche(); });
  });
  box.addEventListener('submit', function (e) {
    var f = e.target;
    e.preventDefault();
    if (f.hasAttribute('data-recherche')) { recherche = f.elements.q.value.trim(); return membres(); }
    if (!f.hasAttribute('data-actu')) return;
    var err = f.querySelector('[data-err]'), btn = f.querySelector('button');
    var lien = f.elements.lien.value.trim();
    if (lien && (/^[a-z][a-z0-9+.-]*:/i.test(lien) && !/^https?:\/\//i.test(lien))) { err.textContent = 'Le lien doit commencer par https:// (ou être une page du site).'; return; }
    btn.disabled = true; err.textContent = '';
    C.sb.from('actualites').insert({
      categorie: f.elements.categorie.value, date: f.elements.date.value, titre: f.elements.titre.value.trim(),
      texte: f.elements.texte.value.trim(), lien: lien || null, bouton: f.elements.bouton.value.trim() || null,
      epingle: f.elements.epingle.checked
    }).then(verifie).then(affiche).catch(function (x) { err.textContent = C.erreur(x); btn.disabled = false; });
  });

  C.surChangement(affiche);
  C.pret.then(affiche);
})();
