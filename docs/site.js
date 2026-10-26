/* Réglages du site Les Naufragés / Mot Mystère.
   GOATCOUNTER : le « code » choisi en créant ton compte sur goatcounter.com.
   DISCORD : le code de l'invitation (la fin de discord.gg/...). */
var SITE = {
  GOATCOUNTER: 'lesnaufrages',
  DISCORD: 'Xdkzj8bZnk',
  LANCEMENT: '2026-10-25' // jour du mot n°1
};

(function () {
  var gc = 'https://' + SITE.GOATCOUNTER + '.goatcounter.com';

  // 1. Mesure d'audience GoatCounter : sans cookie, sans donnée personnelle.
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', gc + '/count');
  document.head.appendChild(s);

  function $(sel) { return document.querySelectorAll(sel); }
  function fill(name, value) {
    $('[data-live="' + name + '"]').forEach(function (el) {
      el.textContent = value;
      var card = el.closest('.live-card');
      if (card) card.hidden = false;
    });
  }
  function nombre(n) { return Number(n).toLocaleString('fr-FR'); }

  document.addEventListener('DOMContentLoaded', function () {
    $('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    if ($('[data-live]').length) {
      // Numéro du mot du jour (calcul local, toujours dispo).
      var debut = new Date(SITE.LANCEMENT + 'T00:00:00');
      var auj = new Date(); auj.setHours(0, 0, 0, 0);
      fill('mot', '#' + (Math.round((auj - debut) / 864e5) + 1));

      // Visites réelles du site (compteur public GoatCounter).
      fetch(gc + '/counter/TOTAL.json')
        .then(function (r) { if (!r.ok) throw r; return r.json(); })
        .then(function (d) { fill('visites', nombre(String(d.count).replace(/[^\d]/g, '') || 0)); })
        .catch(function () {});

      // Membres du Discord et membres en ligne (API publique des invitations).
      fetch('https://discord.com/api/v10/invites/' + SITE.DISCORD + '?with_counts=true')
        .then(function (r) { if (!r.ok) throw r; return r.json(); })
        .then(function (d) {
          if (d.approximate_member_count != null) fill('membres', nombre(d.approximate_member_count));
          if (d.approximate_presence_count != null) fill('enligne', nombre(d.approximate_presence_count));
        })
        .catch(function () {});
    }

    // Actualités : la liste de actualites.js + celles publiées depuis l'espace admin.
    var box = document.querySelector('[data-news]');
    if (box && window.ACTUALITES) {
      var dessine = afficherActus(box, window.ACTUALITES);
      actusAdmin(function (liste) { dessine(liste.concat(window.ACTUALITES)); });
    }
  });

  var NOMS = { discord: 'Discord', minecraft: 'Minecraft', appli: 'Appli', bot: 'Bot', site: 'Site' };
  var ICONES = { discord: '💬', minecraft: '⛏️', appli: '📱', bot: '🤖', site: '🌐' };

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function dateFr(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Actus publiées depuis l'espace admin (table « actualites » de Supabase, lecture publique).
  function actusAdmin(fin) {
    var sb = window.SUPABASE;
    if (!sb || !sb.URL || !sb.CLE) return;
    var h = { apikey: sb.CLE };
    if (/^eyJ/.test(sb.CLE)) h.Authorization = 'Bearer ' + sb.CLE;
    fetch(sb.URL.replace(/\/$/, '') + '/rest/v1/actualites?select=date,categorie,titre,texte,lien,bouton,epingle&order=date.desc&limit=50', { headers: h })
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(fin)
      .catch(function () {});
  }
  // Un lien d'actu : https://… ou une page du site, jamais « javascript: ».
  // Lien web ou page du site seulement : pas de « javascript: » (même caché par un espace ou une tabulation).
  function lienSur(l) { return !/[\s\\\x00-\x1f]/.test(l) && (/^https?:\/\//i.test(l) || !/^[^\/?#]*:/.test(l)); }

  function afficherActus(box, actus) {
    var max = Number(box.getAttribute('data-news')) || 0;
    var cat = '';
    var tri = [];

    function trie(liste) {
      tri = liste.slice().sort(function (a, b) {
        if (!!b.epingle !== !!a.epingle) return b.epingle ? 1 : -1;
        return b.date < a.date ? -1 : b.date > a.date ? 1 : 0;
      });
    }

    function dessine() {
      var liste = tri.filter(function (a) { return !cat || a.categorie === cat; });
      if (max) liste = liste.slice(0, max);
      box.innerHTML = liste.map(function (a) {
        var c = NOMS[a.categorie] ? a.categorie : 'site';
        var lien = a.lien && lienSur(a.lien)
          ? '<a class="more" href="' + esc(a.lien) + '"' + (/^https?:/.test(a.lien) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(a.bouton || 'En savoir plus') + ' →</a>'
          : '';
        // Vidéo seulement depuis un fichier du site (pas de lien externe).
        var media = a.video && /^[\w\/.-]+\.(mp4|webm)$/i.test(a.video)
          ? '<video class="post-video" controls playsinline preload="none"' +
            (a.image && /^[\w\/.-]+\.(jpe?g|png|webp)$/i.test(a.image) ? ' poster="' + esc(a.image) + '"' : '') +
            '><source src="' + esc(a.video) + '" type="video/' + (/webm$/i.test(a.video) ? 'webm' : 'mp4') + '"></video>'
          : '';
        return '<article class="post' + (a.epingle ? ' pin' : '') + '">' +
          '<div class="meta"><span class="tag ' + c + '">' + ICONES[c] + ' ' + NOMS[c] + '</span>' +
          '<time datetime="' + esc(a.date) + '">' + dateFr(a.date) + '</time>' +
          (a.epingle ? '<span class="pin-mark">📌 Épinglé</span>' : '') + '</div>' +
          '<h3>' + esc(a.titre) + '</h3>' + media + '<p>' + esc(a.texte) + '</p>' + lien + '</article>';
      }).join('') || '<p class="news-empty">Aucune actualité dans cette catégorie pour le moment.</p>';
    }

    $('[data-filtre]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $('[data-filtre]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        cat = btn.getAttribute('data-filtre');
        dessine();
      });
    });
    trie(actus);
    dessine();
    return function (liste) { trie(liste); dessine(); };
  }
})();
