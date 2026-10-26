/* Page « Le staff » : tous les grades, du plus haut au plus bas, avec leurs membres. */
(function () {
  var C = window.Compte;
  var box = document.getElementById('equipe');
  var esc = C.esc;
  var POSTULABLES = ['modo', 'helper', 'builder', 'dev', 'animateur'];

  function dessine(staff) {
    box.innerHTML = C.GRADES.filter(function (g) { return g.rang; }).map(function (g) {
      var gens = staff.filter(function (p) { return p.role === g.id; });
      var cartes = gens.map(function (p) {
        return '<button type="button" class="staff-card" data-profil="' + esc(p.id) + '">' + C.avatar(p, true) +
          '<b>' + esc(p.pseudo) + '</b><span>' + (p.bio ? esc(p.bio.length > 90 ? p.bio.slice(0, 90) + '…' : p.bio) : '&nbsp;') + '</span></button>';
      }).join('');
      if (!gens.length) {
        cartes = POSTULABLES.indexOf(g.id) !== -1
          ? '<a class="staff-card libre" href="#recrutement"><span class="av-l av-xl">?</span><b>Poste à pourvoir</b><span>Postule sur le Discord →</span></a>'
          : '<div class="staff-card libre"><span class="av-l av-xl">?</span><b>Personne pour l\'instant</b><span>&nbsp;</span></div>';
      }
      return '<div class="grade-bloc"><h2><span class="role ' + g.id + '">' + g.nom + '</span></h2><p class="muted small">' + esc(g.info) + '</p>' +
        '<div class="staff-grid">' + cartes + '</div></div>';
    }).join('');
  }

  function affiche() {
    if (!C.actif) return dessine([]);
    C.sb.from('profils').select('*').neq('role', 'membre').eq('banni', false).order('cree_le').then(function (r) {
      dessine(r.error ? [] : r.data);
    });
  }

  // L'équipe du Discord (liste dans equipe-discord.js) : affichée même sans Supabase.
  var COULEURS = {
    'co-fondateur': 'fondateur', 'gérant serveur': 'responsable', 'directeur': 'responsable', 'admin': 'admin',
    'resp staff': 'responsable', 'resp modo': 'responsable', 'super modo': 'modo', 'modérateur': 'modo',
    'modo yt/twitch': 'modo', 'cm': 'animateur', 'dev bot discord': 'dev', 'helpeur': 'helper'
  };
  function equipeDiscord() {
    var zone = document.getElementById('equipe-discord');
    var liste = window.STAFF_DISCORD || [];
    if (!zone || !liste.length) return;
    zone.innerHTML = '<div class="staff-grid">' + liste.map(function (m) {
      var roles = (m.roles && m.roles.length ? m.roles : ['Staff']).map(function (r) {
        return '<span class="role ' + (COULEURS[String(r).toLowerCase()] || 'staff') + '">' + esc(r) + '</span>';
      }).join('');
      return '<div class="staff-card discord"><span class="av-l av-xl">' + esc(Array.from(String(m.nom))[0] || '?').toUpperCase() + '</span>' +
        '<b dir="auto">' + esc(m.nom) + '</b><div class="roles">' + roles + '</div></div>';
    }).join('') + '</div>';
  }

  equipeDiscord();
  C.pret.then(affiche);
})();
