/* Page d'achat de l'Édition Couronne : selon le compte, propose de se connecter, de payer,
   ou confirme que l'édition est débloquée. Le paiement se fait chez Lemon Squeezy :
   on y ajoute l'identifiant du compte pour que l'édition s'active toute seule (supabase/functions/lemonsqueezy). */
(function () {
  var C = window.Compte, cfg = window.COURONNE || {}, box = document.getElementById('etat-achat');
  var esc = C.esc, merci = /[?&]merci=1/.test(location.search), essais = 0;
  document.querySelectorAll('[data-prix]').forEach(function (el) { if (cfg.PRIX) el.textContent = cfg.PRIX; });

  function verifier() {
    return C.sb.from('premium').select('id').eq('id', C.user.id).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      return !!r.data;
    });
  }
  function affiche() {
    if (!C.actif) { box.innerHTML = '<p class="muted">La boutique ouvre très bientôt.</p>'; return; }
    if (!C.user) {
      box.innerHTML = '<p>Connecte-toi d\'abord (ou crée ton compte gratuit) : l\'Édition Couronne est liée à ton compte, pour la retrouver sur tous tes appareils.</p>' +
        '<button type="button" class="btn btn-play" data-ouvrir="connexion">Se connecter</button> <button type="button" class="btn btn-ghost" data-ouvrir="inscription">Créer un compte</button>';
      return;
    }
    verifier().then(function (ok) {
      if (ok) {
        box.innerHTML = '<p class="cc-ok">✔ L\'Édition Couronne est débloquée sur le compte <b>' + esc(C.profil ? C.profil.pseudo : '') + '</b>. Merci pour ton soutien !</p>' +
          '<a class="btn btn-play" href="../strategie/">Jouer à Imperium of Wars</a>';
        return;
      }
      if (merci && essais < 20) {
        // Retour de la page de paiement : l'activation prend quelques secondes.
        essais++;
        box.innerHTML = '<p>Paiement reçu, activation en cours… <span class="muted">(' + essais + ')</span></p>';
        setTimeout(affiche, 3000);
        return;
      }
      if (merci) {
        box.innerHTML = '<p>L\'activation prend plus de temps que prévu. Recharge la page dans quelques minutes ; si rien ne change, écris-nous sur le <a href="https://discord.gg/Xdkzj8bZnk" target="_blank" rel="noopener">Discord</a> avec ton reçu.</p>';
        return;
      }
      // En mode test, seuls les admins voient le bouton (pour essayer avec la carte 4242…).
      if (!cfg.LIEN || (cfg.TEST && C.rang() < 4)) { box.innerHTML = '<p class="muted">La boutique ouvre très bientôt. Reviens dans quelques jours !</p>'; return; }
      box.innerHTML = '<form class="cc-form" data-payer>' +
        '<label><input type="checkbox" name="cgv" required> J\'ai lu et j\'accepte les <a href="../conditions.html#vente" target="_blank">conditions de vente</a>.</label>' +
        '<label><input type="checkbox" name="retract" required> Je demande l\'accès immédiat à l\'Édition Couronne et je reconnais que je perds mon droit de rétractation de 14 jours dès qu\'elle est débloquée.</label>' +
        '<p class="small muted">Moins de 18 ans ? Demande l\'accord d\'un parent.</p>' +
        (cfg.TEST ? '<p class="small muted">Mode test : paie avec la carte 4242 4242 4242 4242.</p>' : '') +
        '<button class="btn btn-play" disabled>Payer ' + esc(cfg.PRIX || '') + '</button></form>';
    }).catch(function (x) {
      box.innerHTML = '<p class="err">' + esc(C.erreur(x)) + '</p>';
    });
  }
  box.addEventListener('change', function (e) {
    var f = e.target.closest('form[data-payer]');
    if (f) f.querySelector('button').disabled = !(f.cgv.checked && f.retract.checked);
  });
  box.addEventListener('submit', function (e) {
    var f = e.target.closest('form[data-payer]');
    if (!f) return;
    e.preventDefault();
    if (!(f.cgv.checked && f.retract.checked) || !C.user || !cfg.LIEN || (cfg.TEST && C.rang() < 4)) return;
    var url = cfg.LIEN + (cfg.LIEN.indexOf('?') < 0 ? '?' : '&') +
      'checkout[custom][user_id]=' + encodeURIComponent(C.user.id) +
      (C.user.email ? '&checkout[email]=' + encodeURIComponent(C.user.email) : '') +
      '&checkout[custom][accord_retractation]=1';
    location.href = url;
  });
  C.pret.then(affiche);
  C.surChangement(affiche);
})();
