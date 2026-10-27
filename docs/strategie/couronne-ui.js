/* Imperium of Wars — Édition Couronne : les écrans (Dynastie, Foi, Intrigues) et la boutique.
   Utilise les outils d'affichage de jeu.js (window.Imperium) et les règles de couronne.js. */
(function () {
  'use strict';
  var CR = window.Couronne, M = window.Moteur, I = window.Imperium;
  if (!CR || !M || !I) return;
  var $ = function (id) { return document.getElementById(id); };
  var REL = CR.RELIGIONS, TR = CR.TRAITS, HER = CR.HERITAGES, INT = CR.INTRIGUES;
  var PAGE = '../couronne/';

  function etat() { return I.etat(); }
  function moi() { return etat().joueur; }
  function J() { return etat().factions[moi()]; }
  function jeu() { var e = etat(); return !!(e && e.couronne && e.cou); }
  function apres(r, rouvrir) {
    var msg = r && r.msg ? r.msg : r;
    if (msg && !(r && r.ok)) { I.toast(msg); return; }
    if (msg) I.toast(msg);
    I.sauver(); I.dessiner(); rouvrir();
  }
  function barre(v, coul) { return '<i class="barreOrdre"><i style="width:' + Math.max(0, Math.min(100, v)) + '%;background:' + (coul || 'var(--or)') + '"></i></i>'; }

  // ---------- Petits morceaux affichés ailleurs dans le jeu ----------
  function badgesTraits(p) {
    if (!jeu() || !p) return '';
    return '<span class="traits">' + CR.traits(p).map(function (t) { return '<span class="trait" title="' + TR[t].txt + '">' + TR[t].ico + ' ' + TR[t].nom + '</span>'; }).join('') + '</span>';
  }
  function infoProvince(i) {
    if (!jeu()) return '';
    var e = etat(), p = e.provinces[i], R = REL[p.foi];
    if (!R) return '';
    var f = p.proprio, ec = f >= 0 ? CR.ecart(p.foi, e.factions[f].foi) : 0;
    return '<div class="tagFoi">' + R.ico + ' ' + R.nom + (ec ? ' · <span class="alerteFoi">' + (ec === 1 ? 'hérétique pour son seigneur' : 'autre religion que son seigneur') + '</span>' : '') +
      (e.cou.revs[i] ? ' · 📜 <b>Revendiquée par toi</b>' : '') + '</div>';
  }
  function etiquette(E) { return E.couronne ? ' <span class="tagCouronne">⚜️ Couronne</span>' : ''; }

  // ---------- Boutique ----------
  function boutique(raison) {
    var D = CR.D;
    I.feuille('<h2>⚜️ Édition Couronne</h2>' +
      (raison ? '<p class="alerteCouronne">' + raison + '</p>' : '') +
      '<p>Imperium of Wars devient un vrai jeu de dynastie, comme Crusader Kings. Un seul achat, pour toujours, lié à ton compte du site.</p>' +
      '<ul class="listeCouronne">' +
      '<li><b>3 nouvelles campagnes</b> : 867 La Grande Armée viking, 1337 La guerre de Cent Ans, 1519 Charles Quint et Soliman (90 souverains historiques en plus).</li>' +
      '<li><b>⛪ Religions</b> : piété, lieux saints, conversions, croisades et djihads avec des volontaires, pèlerinages, la Réforme protestante.</li>' +
      '<li><b>🕯️ Intrigues</b> : assassine un roi rival, fabrique des revendications, vole un trésor, sème la discorde… sans te faire prendre.</li>' +
      '<li><b>🏰 Dynastie</b> : la renommée de ta maison débloque 6 héritages (guerre, gouvernance, sang royal, piété, ombre, légitimité).</li>' +
      '<li><b>🎭 Traits de caractère</b> : brave, cruel, rusé, pieux… chaque souverain a sa personnalité, et tu choisis l\'éducation de ton héritier.</li>' +
      '<li><b>📜 4 quêtes en plus</b> et de nouveaux événements à la cour.</li></ul>' +
      '<p class="petitTxt">La version gratuite reste complète et jouable. Tes parties gratuites ne changent pas.</p>' +
      '<a class="btn or" href="' + PAGE + '">Débloquer pour ' + D.PRIX + '</a>' +
      '<a class="btn" href="' + PAGE + '#deja">J\'ai déjà l\'édition : me connecter</a>' +
      '<button class="btn" data-fermer>Plus tard</button>');
  }

  // ---------- Fenêtre principale ----------
  function ouvrir(onglet) {
    if (!jeu()) {
      boutique(CR.actif() ? 'Cette campagne a été lancée en mode gratuit. Lance une nouvelle campagne pour profiter de l\'Édition Couronne.' : '');
      return;
    }
    CR.assurer(etat());
    onglet = onglet || 'dynastie';
    var h = '<h2>⚜️ Couronne</h2><div class="onglets">' + [['dynastie', '🏰 Dynastie'], ['foi', '⛪ Foi'], ['intrigues', '🕯️ Intrigues']].map(function (o) {
      return '<button data-cog="' + o[0] + '"' + (o[0] === onglet ? ' class="on"' : '') + '>' + o[1] + '</button>';
    }).join('') + '</div>';
    h += ({ dynastie: dynastie, foi: foi, intrigues: intrigues })[onglet]();
    h += '<button class="btn" data-fermer>Fermer</button>';
    I.feuille(h);
    document.querySelectorAll('[data-cog]').forEach(function (b) { b.onclick = function () { ouvrir(b.getAttribute('data-cog')); }; });
    brancher(onglet);
  }

  function dynastie() {
    var e = etat(), F = J(), c = e.cou, h = M.heritier(F);
    var t = '<div class="lignes"><span>🏰 Dynastie</span><b>' + F.cour.dyn + '</b><span>✨ Renommée</span><b>' + c.renom + ' <small class="plus">+' + CR.gainRenom(e) + '/tour</small></b><span>👑 Prestige</span><b>' + (F.prestige || 0) + '</b></div>';
    t += '<h4 class="titreFam">🎭 ' + F.roi.nom + '</h4>' + CR.traits(F.roi).map(function (k) { return '<div class="ligneTrait"><b>' + TR[k].ico + ' ' + TR[k].nom + '</b><small>' + TR[k].txt + '</small></div>'; }).join('');
    if (h) t += '<p class="petitTxt">👑 Héritier : <b>' + h.nom + '</b> (' + M.age(e, h) + ' ans)' + (h.educ ? ' · éduqué pour être ' + TR[h.educ].ico + ' ' + TR[h.educ].nom.toLowerCase() : (M.age(e, h) < 6 ? ' · son éducation commencera vers 6 ans' : ' · ses précepteurs attendent tes ordres')) + '. Traits : ' + CR.traits(h).map(function (k) { return TR[k].ico + ' ' + TR[k].nom; }).join(', ') + '.</p>';
    t += '<h4 class="titreFam">Héritages de la dynastie</h4><p class="petitTxt">La renommée vient du prestige, des empires restaurés et de la taille du royaume. Les héritages restent pour tous tes successeurs.</p>';
    Object.keys(HER).forEach(function (k) {
      var H = HER[k], n = CR.niv(e, k), cout = CR.D.COUT_HERITAGE[n];
      t += '<div class="siege"><span class="sIco">' + H.ico + '</span><div><b>' + H.nom + ' <span class="tag">' + n + '/3</span></b>' +
        H.niveaux.map(function (x, j) { return '<small class="' + (j < n ? 'acquis' : '') + '">' + (j < n ? '✔ ' : '○ ') + x + '</small>'; }).join('') + '</div>' +
        (n < 3 ? '<button class="btn mini" data-her="' + k + '"' + (c.renom < cout ? ' disabled' : '') + '>' + cout + ' ✨</button>' : '') + '</div>';
    });
    return t;
  }

  function foi() {
    var e = etat(), F = J(), c = e.cou, R = REL[F.foi];
    var autres = [];
    e.provinces.forEach(function (p, i) { if (p.proprio === moi() && p.foi !== F.foi) autres.push(i); });
    var lieux = CR.lieuxTenus(e, moi());
    var t = '<div class="lignes"><span>' + R.ico + ' Religion</span><b>' + R.nom + '</b><span>🙏 Piété</span><b>' + c.piete + ' <small class="plus">+' + CR.gainPiete(e) + '/tour</small></b>' +
      '<span>🕍 Lieux saints tenus</span><b>' + lieux.length + ' / ' + R.lieux.length + '</b></div>' +
      '<p class="petitTxt">Lieux saints : ' + R.lieux.map(function (id) { var i = M.INDEX[id]; return '<button class="lienProv" data-cprov="' + i + '">' + (lieux.indexOf(id) >= 0 ? '✅ ' : '') + M.PROV[i].nom + '</button>'; }).join(', ') + ' (+2 piété par tour chacun).</p>';
    // Guerre sainte
    t += '<h4 class="titreFam">⚔️ ' + R.guerre + '</h4>';
    if (c.gs) t += '<p class="calme">En cours contre <b>' + e.factions[c.gs.f].nom + '</b> jusqu\'au tour ' + c.gs.fin + '. Les provinces prises se soumettent vite.</p>';
    else {
      var cibles = CR.ciblesGuerreSainte(e);
      t += '<p class="petitTxt">Déclare la guerre à un voisin d\'une autre foi : des volontaires rejoignent tes armées à la frontière, tes coreligionnaires t\'apprécient et les terres conquises ne se révoltent pas.</p>';
      t += cibles.length ? '<div class="diplo">' + cibles.map(function (x) {
        var G = e.factions[x.f], RG = REL[G.foi];
        return '<div class="ligneDiplo"><span class="pastille" style="background:' + G.coul + '"></span><span class="dNom"><b>' + G.nom + '</b><small>' + RG.ico + ' ' + RG.nom + ' · ' + M.nbProvinces(e, x.f) + ' provinces</small></span><button class="btn mini" data-gs="' + x.f + '"' + (c.piete < x.cout ? ' disabled' : '') + '>' + x.cout + ' 🙏</button></div>';
      }).join('') + '</div>' : '<p class="calme">Aucun voisin d\'une autre foi.</p>';
    }
    // Conversion
    t += '<h4 class="titreFam">🕊️ Missionnaires</h4>';
    t += autres.length ? '<p class="petitTxt">Ces provinces n\'ont pas ta foi (ordre public −5 ou −10). Elles se convertissent seules avec le temps, ou tout de suite avec des missionnaires.</p><div class="diplo">' + autres.map(function (i) {
      var p = e.provinces[i], cout = CR.coutConversion(e, i);
      return '<div class="ligneDiplo"><span class="dNom"><b>' + M.PROV[i].nom + '</b><small>' + REL[p.foi].ico + ' ' + REL[p.foi].nom + '</small></span><button class="btn mini" data-conv="' + i + '"' + (c.piete < cout ? ' disabled' : '') + '>' + cout + ' 🙏</button></div>';
    }).join('') + '</div>' : '<p class="calme">Toutes tes provinces partagent ta foi.</p>';
    t += '<div class="actions wrap"><button class="btn" id="cPele">🧭 Pèlerinage</button><button class="btn" id="cPreche">🔔 Prédication</button></div>' +
      '<p class="petitTxt">Pèlerinage (80 or) : +40 piété et +8 prestige, une fois tous les 10 tours (petit risque de maladie). Grande prédication (60 piété) : ordre public +10 partout.</p>';
    return t;
  }

  function intrigues() {
    var e = etat(), c = e.cou;
    var t = '<p class="petitTxt">Tes complots avancent à chaque tour. Plus ton 🕵️ maître espion est doué, plus ils vont vite et moins ils risquent d\'être découverts. Découvert : prestige −10 et la cible t\'en veut (parfois jusqu\'à la guerre).</p>';
    t += '<h4 class="titreFam">En cours (' + c.intrigues.length + ' / ' + CR.maxIntrigues(e) + ')</h4>';
    t += c.intrigues.length ? c.intrigues.map(function (s, k) {
      var T = INT[s.type];
      return '<div class="siege"><span class="sIco">' + T.ico + '</span><div><b>' + T.nom + '</b><small>Cible : ' + CR.nomCible(e, s) + ' · +' + CR.vitesse(e, s) + ' %/tour · risque ' + CR.risque(e, s) + ' %/tour</small>' + barre(s.prog) + '</div><button class="btn mini" data-annule="' + k + '">✖</button></div>';
    }).join('') : '<p class="calme">Aucune intrigue en cours.</p>';
    if (c.intrigues.length < CR.maxIntrigues(e)) {
      t += '<h4 class="titreFam">Lancer une intrigue</h4>';
      Object.keys(INT).forEach(function (k) {
        var T = INT[k];
        t += '<button class="carteChoix" data-int="' + k + '"><span class="an">' + T.or + ' 💰</span><b>' + T.ico + ' ' + T.nom + '</b><small>' + T.txt + '</small></button>';
      });
    }
    return t;
  }

  function choisirCible(type) {
    var e = etat(), T = INT[type], l = CR.ciblesIntrigue(e, type);
    var h = '<h2>' + T.ico + ' ' + T.nom + '</h2><p>' + T.txt + ' Coût : ' + T.or + ' or.</p><div class="diplo">';
    if (!l.length) h += '<p class="calme">Aucune cible possible.</p>';
    l.forEach(function (x) {
      if (T.cible === 'royaume') {
        var F = e.factions[x];
        h += '<button class="ligneDiplo" data-cible="' + x + '">' + I.portrait(F.roi, x, 34) + '<span class="dNom"><b>' + F.roi.nom + '</b><small>' + F.nom + ' · ' + M.nbProvinces(e, x) + ' provinces · ' + F.or + ' or</small></span></button>';
      } else if (T.cible === 'province') {
        var p = e.provinces[x];
        h += '<button class="ligneDiplo" data-cible="' + x + '"><span class="pastille" style="background:' + (p.proprio >= 0 ? e.factions[p.proprio].coul : '#9ca3af') + '"></span><span class="dNom"><b>' + M.PROV[x].nom + '</b><small>' + (p.proprio >= 0 ? e.factions[p.proprio].nom : 'Rebelles') + '</small></span></button>';
      } else {
        var n = J().cour.nobles.filter(function (q) { return q.id === x; })[0];
        h += '<button class="ligneDiplo" data-cible="' + x + '">' + I.portrait(n, moi(), 34) + '<span class="dNom"><b>' + n.nom + '</b><small>loyauté ' + n.loy + '</small></span></button>';
      }
    });
    h += '</div><button class="btn" id="cRetInt">← Intrigues</button>';
    I.feuille(h);
    document.querySelectorAll('[data-cible]').forEach(function (b) {
      b.onclick = function () {
        var err = CR.lancerIntrigue(e, type, +b.getAttribute('data-cible'));
        if (err) { I.toast(err); return; }
        I.toast(T.ico + ' Intrigue lancée.');
        I.sauver(); I.dessiner(); ouvrir('intrigues');
      };
    });
    $('cRetInt').onclick = function () { ouvrir('intrigues'); };
  }

  function brancher(onglet) {
    var e = etat(), re = function () { ouvrir(onglet); };
    document.querySelectorAll('[data-her]').forEach(function (b) { b.onclick = function () { var r = CR.heritage(e, b.getAttribute('data-her')); apres(r || { ok: true, msg: '🏰 Nouvel héritage pour ta dynastie !' }, re); }; });
    document.querySelectorAll('[data-gs]').forEach(function (b) { b.onclick = function () { apres(CR.guerreSainte(e, +b.getAttribute('data-gs')), re); }; });
    document.querySelectorAll('[data-conv]').forEach(function (b) { b.onclick = function () { var r = CR.convertir(e, +b.getAttribute('data-conv')); apres(r || { ok: true, msg: '🕊️ Province convertie.' }, re); }; });
    document.querySelectorAll('[data-cprov]').forEach(function (b) { b.onclick = function () { I.fermer(); I.allerA(+b.getAttribute('data-cprov')); }; });
    document.querySelectorAll('[data-int]').forEach(function (b) { b.onclick = function () { choisirCible(b.getAttribute('data-int')); }; });
    document.querySelectorAll('[data-annule]').forEach(function (b) { b.onclick = function () { CR.annulerIntrigue(e, +b.getAttribute('data-annule')); I.sauver(); re(); }; });
    if ($('cPele')) $('cPele').onclick = function () { apres(CR.pelerinage(e), re); };
    if ($('cPreche')) $('cPreche').onclick = function () { apres(CR.predication(e), re); };
  }

  window.CouronneUI = { ouvrir: ouvrir, boutique: boutique, badgesTraits: badgesTraits, infoProvince: infoProvince, etiquette: etiquette, jeu: jeu };
  I.majMenu();
})();
