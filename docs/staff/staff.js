/* Page « Le staff » : les membres qui ont un grade, rangés du plus haut au plus bas. */
(function () {
  var C = window.Compte;
  var box = document.getElementById('equipe');
  var esc = C.esc;

  function vide() {
    box.innerHTML = '<p class="muted center pad">L\'équipe se présente très bientôt ici. En attendant, retrouve-la sur le Discord !</p>';
  }

  function affiche() {
    if (!C.actif) return vide();
    C.sb.from('profils').select('*').neq('role', 'membre').eq('banni', false).order('cree_le').then(function (r) {
      if (r.error || !r.data.length) return vide();
      box.innerHTML = C.GRADES.filter(function (g) { return g.rang; }).map(function (g) {
        var gens = r.data.filter(function (p) { return p.role === g.id; });
        if (!gens.length) return '';
        return '<div class="grade-bloc"><h2><span class="role ' + g.id + '">' + g.nom + '</span></h2><p class="muted small">' + esc(g.info) + '</p>' +
          '<div class="staff-grid">' + gens.map(function (p) {
            return '<button type="button" class="staff-card" data-profil="' + esc(p.id) + '">' + C.avatar(p, true) +
              '<b>' + esc(p.pseudo) + '</b><span>' + (p.bio ? esc(p.bio.length > 90 ? p.bio.slice(0, 90) + '…' : p.bio) : '&nbsp;') + '</span></button>';
          }).join('') + '</div></div>';
      }).join('');
    });
  }

  C.pret.then(affiche);
})();
