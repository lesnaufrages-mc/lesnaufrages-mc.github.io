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

  C.pret.then(affiche);
})();
