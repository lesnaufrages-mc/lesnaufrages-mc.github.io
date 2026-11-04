/* Ferrum et Fides : le moteur 3D commun (rendu, commandes, modèles en blocs, effets, décors).
   Les modes de jeu sont dans bataille.js (combats), naval.js (combats en mer) et ville.js (villes à visiter). */
var Moteur = (function () {
  'use strict';
  var T = window.THREE;
  var M = {};
  var R, scene, cam, soleil, hemi, canvas, mode = null, dernier = 0, enPause = false, raf = 0;
  var mobile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  M.mobile = mobile;

  // ---------- Hasard reproductible (même décor à chaque partie) ----------
  function rng(graine) {
    var s = graine >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  M.rng = rng;

  // ---------- Matériaux et formes ----------
  var MATS = {};
  function mat(c, o) {
    o = o || {};
    var k = c + '|' + (o.lueur || '') + '|' + (o.op || '') + '|' + (o.basic ? 1 : 0);
    if (MATS[k]) return MATS[k];
    var m;
    if (o.basic) m = new T.MeshBasicMaterial({ color: c, transparent: !!o.op, opacity: o.op || 1, depthWrite: !o.op });
    else m = new T.MeshLambertMaterial({ color: c, emissive: o.lueur || 0x000000, transparent: !!o.op, opacity: o.op || 1 });
    MATS[k] = m;
    return m;
  }
  var GEO_BOITE = new T.BoxGeometry(1, 1, 1);
  function boite(w, h, d, c, parent, x, y, z, o) {
    var m = new T.Mesh(GEO_BOITE, mat(c, o));
    m.scale.set(w, h, d);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = !o || o.ombre !== false;
    if (parent) parent.add(m);
    return m;
  }
  M.mat = mat; M.boite = boite;

  // ---------- Initialisation ----------
  M.init = function (c) {
    canvas = c;
    R = new T.WebGLRenderer({ canvas: canvas, antialias: !mobile, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    R.shadowMap.enabled = true;
    R.shadowMap.type = T.PCFSoftShadowMap;
    cam = new T.PerspectiveCamera(60, 1, 0.1, 600);
    M.cam = cam; M.R = R;
    window.addEventListener('resize', taille);
    taille();
    entrees();
  };
  function taille() {
    if (!R) return;
    var w = window.innerWidth, h = window.innerHeight;
    R.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }

  // Nouvelle scène vide avec ciel, brouillard et lumières
  M.nouvelleScene = function (o) {
    scene = new T.Scene();
    M.scene = scene;
    var haut = new T.Color(o.ciel || 0x87b5e0), bas = new T.Color(o.horizon || 0xdfe9f3);
    scene.background = bas.clone();
    scene.fog = new T.Fog(o.horizon || 0xdfe9f3, o.brouillard0 || 40, o.brouillard1 || 140);
    // Dôme du ciel en dégradé
    var g = new T.SphereGeometry(400, 16, 10);
    var cols = [], p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var t = Math.max(0, p.getY(i) / 400);
      var c = bas.clone().lerp(haut, Math.pow(t, 0.6));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    var dome = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
    scene.add(dome);
    hemi = new T.HemisphereLight(o.lumCiel || 0xffffff, o.lumSol || 0x6b5b45, o.hemi == null ? 0.75 : o.hemi);
    scene.add(hemi);
    soleil = new T.DirectionalLight(o.soleil || 0xfff1d6, o.forceSoleil == null ? 0.85 : o.forceSoleil);
    var sd = o.soleilDir || [30, 50, 20];
    soleil.position.set(sd[0], sd[1], sd[2]);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    var sc = soleil.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 140;
    soleil.shadow.bias = -0.0008;
    scene.add(soleil);
    scene.add(soleil.target);
    scene.userData.soleil = soleil;
    scene.userData.soleilDir = sd;
    // Disque du soleil (ou de la lune) bas sur l'horizon
    if (o.disque) {
      var n = Math.hypot(sd[0], sd[1], sd[2]);
      var astre = new T.Mesh(new T.SphereGeometry(o.disqueR || 14, 16, 12), new T.MeshBasicMaterial({ color: o.disque, fog: false }));
      astre.position.set(sd[0] / n * 380, sd[1] / n * 380, sd[2] / n * 380);
      var halo = new T.Mesh(new T.SphereGeometry((o.disqueR || 14) * 2.2, 16, 12), new T.MeshBasicMaterial({ color: o.disque, fog: false, transparent: true, opacity: 0.18, depthWrite: false }));
      halo.position.copy(astre.position);
      scene.add(halo); scene.add(astre);
    }
    return scene;
  };
  // Remet une scène déjà construite (retour d'un abordage)
  M._sceneActive = function (s) { scene = s; M.scene = s; soleil = s.userData.soleil; };
  // L'ombre suit le joueur
  M.suivreOmbre = function (x, z) {
    if (!soleil) return;
    var sd = (scene && scene.userData.soleilDir) || [30, 50, 20];
    soleil.position.set(x + sd[0], sd[1], z + sd[2]);
    soleil.target.position.set(x, 0, z);
  };

  // ---------- Boucle ----------
  M.lancer = function (m) {
    if (mode && mode.quitter) mode.quitter();
    mode = m;
    enPause = false;
    viderEntrees();
    dernier = performance.now();
    if (!raf) raf = requestAnimationFrame(boucle);
  };
  M.arreter = function () {
    if (mode && mode.quitter) mode.quitter();
    mode = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (document.pointerLockElement) document.exitPointerLock();
  };
  M.pause = function (p) { enPause = p; viderEntrees(); if (p && document.pointerLockElement) document.exitPointerLock(); };
  M.enPause = function () { return enPause; };
  // Pour enregistrer la bande-annonce image par image (pas fixe)
  var manuel = false;
  M._manuel = function (on) { manuel = !!on; };
  M._pas = function (dt, n, sansRendu) {
    for (var i = 0; i < (n || 1); i++) {
      if (!mode) return;
      mode.maj(dt);
      E.souris.acc.x *= Math.exp(-dt * 7); E.souris.acc.y *= Math.exp(-dt * 7);
      E.actions.length = 0;
    }
    if (scene && !sansRendu) R.render(scene, cam);
  };
  function boucle(t) {
    raf = requestAnimationFrame(boucle);
    var dt = Math.min(0.05, (t - dernier) / 1000);
    dernier = t;
    if (!mode || manuel) return;
    // Une erreur ne doit pas figer le jeu : on la signale une fois et on continue (l'image est toujours redessinée).
    try { if (!enPause) mode.maj(dt); } catch (err) { if (!boucle.vu) { boucle.vu = true; console.error(err); } }
    E.souris.acc.x *= Math.exp(-dt * 7); E.souris.acc.y *= Math.exp(-dt * 7);
    E.actions.length = 0;
    try { if (scene && mode) R.render(scene, cam); } catch (err) { if (!boucle.vr) { boucle.vr = true; console.error(err); } }
  }

  // ---------- Commandes (clavier AZERTY/QWERTY, souris, tactile) ----------
  var E = { touches: {}, souris: { acc: { x: 0, y: 0 }, gauche: false, droit: false }, joy: { x: 0, y: 0 }, camDx: 0, camDy: 0, actions: [], tenus: {} };
  M.E = E;
  function viderEntrees() { E.touches = {}; E.souris.gauche = E.souris.droit = false; E.joy.x = E.joy.y = 0; E.actions.length = 0; E.tenus = {}; E.camDx = E.camDy = 0; }
  M.action = function (a) { E.actions.push(a); };
  M.a = function (a) { return E.actions.indexOf(a) >= 0; };
  M.tenu = function (a) { return !!E.tenus[a]; };

  function entrees() {
    // e.code = position de la touche : KeyW est Z sur un clavier AZERTY. ZQSD et WASD marchent donc tous les deux.
    var ACT = { Space: 'esquive', KeyE: 'pouvoir', KeyX: 'changer', KeyF: 'interagir', KeyR: 'tir', KeyC: 'ordre', Digit1: 'ordre1', Digit2: 'ordre2', Digit3: 'ordre3', Escape: 'pause', KeyP: 'pause', Tab: 'changer' };
    window.addEventListener('keydown', function (e) {
      if (!mode || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      if (e.code === 'Tab' || e.code === 'Space' || /^Arrow/.test(e.code)) e.preventDefault();
      if (!e.repeat && ACT[e.code]) E.actions.push(ACT[e.code]);
      if (!e.repeat && e.code === 'KeyE' && mode && mode.type === 'ville') E.actions.push('interagir');
      E.touches[e.code] = true;
    });
    window.addEventListener('keyup', function (e) { E.touches[e.code] = false; });
    window.addEventListener('blur', viderEntrees);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('mousedown', function (e) {
      if (!mode || enPause) return;
      if (!mobile && !document.pointerLockElement && mode.verrou !== false && canvas.requestPointerLock) {
        try { var p = canvas.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (er) {}
      }
      if (e.button === 0) { E.souris.gauche = true; E.actions.push('attaque'); }
      if (e.button === 2) E.souris.droit = true;
    });
    window.addEventListener('mouseup', function (e) {
      if (e.button === 0) E.souris.gauche = false;
      if (e.button === 2) E.souris.droit = false;
    });
    document.addEventListener('mousemove', function (e) {
      if (!mode || enPause) return;
      var dx = e.movementX || 0, dy = e.movementY || 0;
      if (Math.abs(dx) > 200 || Math.abs(dy) > 200) return; // saut parasite du verrou de souris
      E.souris.acc.x += dx; E.souris.acc.y += dy;
      if (document.pointerLockElement === canvas) { E.camDx += dx; E.camDy += dy; }
    });
    canvas.addEventListener('wheel', function (e) { if (mode) { E.actions.push('changer'); e.preventDefault(); } }, { passive: false });
    document.addEventListener('pointerlockchange', function () {
      if (!document.pointerLockElement && mode && !enPause && mode.surPerteVerrou) mode.surPerteVerrou();
    });

    // Tactile : joystick à gauche, glisser à droite pour tourner la caméra
    var joyId = null, camId = null, j0 = { x: 0, y: 0 }, c0 = { x: 0, y: 0 };
    var zone = document.getElementById('zoneTactile') || canvas;
    var bouton = document.getElementById('joyBouton'), socle = document.getElementById('joySocle');
    zone.addEventListener('touchstart', function (e) {
      if (!mode || enPause) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.clientX < window.innerWidth * 0.45 && joyId === null) {
          joyId = t.identifier; j0 = { x: t.clientX, y: t.clientY };
          if (socle) { socle.style.display = 'block'; socle.style.left = (t.clientX - 55) + 'px'; socle.style.top = (t.clientY - 55) + 'px'; }
        } else if (camId === null) { camId = t.identifier; c0 = { x: t.clientX, y: t.clientY }; }
      }
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener('touchmove', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === joyId) {
          var dx = t.clientX - j0.x, dy = t.clientY - j0.y, d = Math.hypot(dx, dy), m = 50;
          if (d > m) { dx *= m / d; dy *= m / d; }
          E.joy.x = dx / m; E.joy.y = -dy / m;
          if (bouton) bouton.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        } else if (t.identifier === camId) {
          E.camDx += (t.clientX - c0.x) * 1.6; E.camDy += (t.clientY - c0.y) * 1.2;
          E.souris.acc.x += (t.clientX - c0.x); E.souris.acc.y += (t.clientY - c0.y);
          c0 = { x: t.clientX, y: t.clientY };
        }
      }
      e.preventDefault();
    }, { passive: false });
    function fin(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === joyId) { joyId = null; E.joy.x = E.joy.y = 0; if (bouton) bouton.style.transform = ''; if (socle) socle.style.display = 'none'; }
        if (t.identifier === camId) camId = null;
      }
    }
    zone.addEventListener('touchend', fin);
    zone.addEventListener('touchcancel', fin);

    // Boutons tactiles : data-action (appui) ou data-tenu (maintenu). Un glissé sur « attaque » choisit la direction.
    Array.prototype.forEach.call(document.querySelectorAll('[data-action],[data-tenu]'), function (b) {
      var x0 = 0, y0 = 0;
      b.addEventListener('touchstart', function (e) {
        e.preventDefault(); e.stopPropagation();
        var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY;
        if (b.dataset.tenu) E.tenus[b.dataset.tenu] = true;
        if (b.dataset.action && b.dataset.action !== 'attaque') E.actions.push(b.dataset.action);
        b.classList.add('appui');
      }, { passive: false });
      b.addEventListener('touchend', function (e) {
        e.preventDefault();
        var t = e.changedTouches[0];
        if (b.dataset.action === 'attaque') {
          var dx = t.clientX - x0, dy = t.clientY - y0;
          if (Math.hypot(dx, dy) > 18) { E.souris.acc.x = dx * 2; E.souris.acc.y = dy * 2; } else { E.souris.acc.x = 0; E.souris.acc.y = 0; }
          E.actions.push('attaque');
        }
        if (b.dataset.tenu) E.tenus[b.dataset.tenu] = false;
        b.classList.remove('appui');
      }, { passive: false });
      b.addEventListener('click', function () { if (!('ontouchstart' in window) && b.dataset.action) E.actions.push(b.dataset.action); });
    });
  }

  // Déplacement demandé (repère caméra) : {x, z} entre -1 et 1
  M.deplacement = function () {
    var x = 0, z = 0, k = E.touches;
    if (k.KeyW || k.ArrowUp) z += 1;
    if (k.KeyS || k.ArrowDown) z -= 1;
    if (k.KeyA) x -= 1;
    if (k.KeyD) x += 1;
    x += E.joy.x; z += E.joy.y;
    var l = Math.hypot(x, z);
    if (l > 1) { x /= l; z /= l; }
    return { x: x, z: z, l: Math.min(1, l) };
  };
  // Rotation de caméra demandée depuis la dernière image
  M.rotationCamera = function () {
    var dx = E.camDx, dy = E.camDy;
    E.camDx = 0; E.camDy = 0;
    if (E.touches.ArrowLeft) dx -= 9;
    if (E.touches.ArrowRight) dx += 9;
    if (E.touches.KeyQ && !mobile && mode && mode.type !== 'bataille') {} // Q sert à se déplacer
    return { dx: dx, dy: dy };
  };
  // Direction voulue par la souris (style Mount & Blade) : gauche, droite, haut, estoc ou null
  M.directionSouris = function () {
    var a = E.souris.acc;
    if (Math.hypot(a.x, a.y) < 5) return null;
    if (Math.abs(a.x) > Math.abs(a.y)) return a.x < 0 ? 'gauche' : 'droite';
    return a.y < 0 ? 'haut' : 'estoc';
  };

  // ---------- Modèles en blocs ----------
  // Arme : la lame pointe le long de +Y, la poignée est à l'origine.
  M.creerArme = function (id) {
    var A = FF.ARMES[id] || FF.ARMES.epee;
    var g = new T.Group();
    var lame = A.couleur, o = A.lueur ? { lueur: A.lueur } : null, bois = 0x6e4b2a, cuir = 0x4a2f1b, or = 0xd4ac0d;
    var f = A.forme;
    if (f === 'epee' || f === 'sabre') {
      boite(0.07, 0.26, 0.07, cuir, g, 0, 0.05, 0);
      boite(0.1, 0.08, 0.1, or, g, 0, -0.12, 0);
      boite(0.42, 0.06, 0.09, A.lueur ? or : 0x7f8c8d, g, 0, 0.2, 0);
      if (f === 'sabre') {
        boite(0.09, 0.55, 0.03, lame, g, 0, 0.5, 0, o);
        var b2 = boite(0.09, 0.5, 0.03, lame, g, 0.07, 0.98, 0, o); b2.rotation.z = -0.25;
      } else {
        boite(0.1, 1.05, 0.03, lame, g, 0, 0.75, 0, o);
        boite(0.06, 0.12, 0.03, lame, g, 0, 1.32, 0, o).rotation.z = Math.PI / 4;
      }
    } else if (f === 'dague') {
      boite(0.06, 0.18, 0.06, cuir, g, 0, 0.02, 0);
      boite(0.22, 0.05, 0.07, 0x7f8c8d, g, 0, 0.13, 0);
      boite(0.08, 0.46, 0.025, lame, g, 0, 0.4, 0, o);
      boite(0.05, 0.08, 0.025, lame, g, 0, 0.66, 0, o).rotation.z = Math.PI / 4;
    } else if (f === 'masse') {
      boite(0.07, 0.8, 0.07, bois, g, 0, 0.25, 0);
      boite(0.22, 0.26, 0.22, lame, g, 0, 0.72, 0, o);
      for (var i = 0; i < 4; i++) { var p = boite(0.06, 0.06, 0.32, lame, g, 0, 0.72, 0, o); p.rotation.y = i * Math.PI / 4; }
    } else if (f === 'hache') {
      boite(0.07, 1.25, 0.07, bois, g, 0, 0.45, 0);
      boite(0.05, 0.36, 0.3, lame, g, 0, 0.98, 0.16, o);
      boite(0.04, 0.46, 0.08, lame, g, 0, 0.98, 0.33, o);
    } else if (f === 'lance') {
      boite(0.06, 2.2, 0.06, A.lueur ? 0x8e5a2b : bois, g, 0, 0.6, 0);
      boite(0.1, 0.38, 0.03, lame, g, 0, 1.85, 0, o);
      boite(0.06, 0.12, 0.03, lame, g, 0, 2.08, 0, o).rotation.z = Math.PI / 4;
      if (A.lueur) boite(0.14, 0.06, 0.14, or, g, 0, 1.64, 0);
    } else if (f === 'marteau') {
      boite(0.08, 0.6, 0.08, cuir, g, 0, 0.15, 0);
      boite(0.5, 0.3, 0.3, lame, g, 0, 0.55, 0, o);
      boite(0.54, 0.06, 0.34, 0x5d6d7e, g, 0, 0.55, 0);
    } else if (f === 'baton') {
      boite(0.07, 2.4, 0.07, 0xa04000, g, 0, 0.4, 0, o);
      boite(0.1, 0.18, 0.1, or, g, 0, 1.55, 0, o);
      boite(0.1, 0.18, 0.1, or, g, 0, -0.75, 0, o);
    } else if (f === 'fleau') {
      boite(0.07, 0.6, 0.07, bois, g, 0, 0.15, 0);
      for (var k = 0; k < 3; k++) boite(0.05, 0.08, 0.05, 0x7f8c8d, g, 0, 0.5 + k * 0.1, 0);
      boite(0.24, 0.24, 0.24, lame, g, 0, 0.86, 0, o);
    } else if (f === 'arc') {
      boite(0.05, 1.2, 0.05, bois, g, 0, 0.3, 0);
    }
    if (A.lueur) {
      var halo = new T.Mesh(GEO_BOITE, mat(A.lueur, { basic: true, op: 0.25 }));
      halo.scale.set(0.24, f === 'lance' ? 0.6 : 1.1, 0.12);
      halo.position.y = f === 'lance' ? 1.85 : 0.75;
      g.add(halo);
    }
    return g;
  };

  // Personnage en blocs. look : peau, tunique, pantalon, casque, croix, bouclier, bc, cape, barbe, cheveux
  M.creerPerso = function (look, taille, o) {
    look = look || {};
    o = o || {};
    var idMod = o.modele || look.modele;
    if (idMod && MODELES[idMod]) { try { return persoModele(idMod, taille, o); } catch (e) { console.warn('modèle', idMod, e); } }
    var g = new T.Group();
    var corps = new T.Group(); g.add(corps);
    var peau = look.peau || 0xf1c27d, tun = look.tunique || 0x95a5a6, pant = look.pantalon || 0x34495e;
    var opt = o.spectre ? { op: 0.7, lueur: 0x1b4f72 } : null;
    var bottes = 0x3e2723;
    var P = { g: g, corps: corps };
    // Jambes
    P.jambeG = new T.Group(); P.jambeG.position.set(-0.17, 0.95, 0); corps.add(P.jambeG);
    P.jambeD = new T.Group(); P.jambeD.position.set(0.17, 0.95, 0); corps.add(P.jambeD);
    boite(0.3, 0.7, 0.32, pant, P.jambeG, 0, -0.35, 0, opt); boite(0.32, 0.26, 0.36, bottes, P.jambeG, 0, -0.82, 0.02, opt);
    boite(0.3, 0.7, 0.32, pant, P.jambeD, 0, -0.35, 0, opt); boite(0.32, 0.26, 0.36, bottes, P.jambeD, 0, -0.82, 0.02, opt);
    // Haut du corps (pivote pour les coups)
    P.haut = new T.Group(); P.haut.position.y = 0.95; corps.add(P.haut);
    boite(0.78, 0.86, 0.44, tun, P.haut, 0, 0.45, 0, opt);
    boite(0.8, 0.12, 0.46, 0x4a2f1b, P.haut, 0, 0.06, 0, opt); // ceinture
    if (look.croix) {
      boite(0.12, 0.5, 0.02, look.croix, P.haut, 0, 0.5, 0.23, opt);
      boite(0.4, 0.12, 0.02, look.croix, P.haut, 0, 0.58, 0.23, opt);
    }
    if (look.cape) { P.cape = boite(0.74, 1.0, 0.06, look.cape, P.haut, 0, 0.35, -0.26, opt); }
    // Tête
    P.tete = new T.Group(); P.tete.position.y = 0.9; P.haut.add(P.tete);
    boite(0.56, 0.56, 0.56, peau, P.tete, 0, 0.3, 0, opt);
    boite(0.08, 0.08, 0.02, 0x1c1c1c, P.tete, -0.13, 0.34, 0.285, { ombre: false });
    boite(0.08, 0.08, 0.02, 0x1c1c1c, P.tete, 0.13, 0.34, 0.285, { ombre: false });
    if (look.barbe) boite(0.5, 0.2, 0.1, look.barbe, P.tete, 0, 0.1, 0.27, opt);
    var c = look.casque || 'aucun';
    if (c === 'nasal') { boite(0.62, 0.3, 0.62, 0x95a5a6, P.tete, 0, 0.55, 0, opt); boite(0.3, 0.16, 0.3, 0x95a5a6, P.tete, 0, 0.76, 0, opt); boite(0.07, 0.24, 0.04, 0x95a5a6, P.tete, 0, 0.32, 0.3, opt); }
    else if (c === 'heaume') { boite(0.64, 0.66, 0.64, 0xaab7b8, P.tete, 0, 0.32, 0, opt); boite(0.5, 0.05, 0.02, 0x111111, P.tete, 0, 0.36, 0.325, { ombre: false }); boite(0.04, 0.2, 0.02, 0x111111, P.tete, 0, 0.22, 0.325, { ombre: false }); }
    else if (c === 'rond') { boite(0.62, 0.26, 0.62, 0xb7950b, P.tete, 0, 0.56, 0, opt); boite(0.12, 0.12, 0.12, 0xb7950b, P.tete, 0, 0.74, 0, opt); }
    else if (c === 'turban') { boite(0.64, 0.24, 0.64, 0xfdfefe, P.tete, 0, 0.58, 0, opt); boite(0.4, 0.14, 0.4, 0xfdfefe, P.tete, 0, 0.74, 0, opt); }
    else if (c === 'capuche') { boite(0.64, 0.42, 0.64, look.tunique || 0x5d4037, P.tete, 0, 0.48, -0.03, opt); boite(0.64, 0.5, 0.1, look.tunique || 0x5d4037, P.tete, 0, 0.3, -0.3, opt); }
    else if (c === 'chapel') { boite(0.6, 0.22, 0.6, 0x95a5a6, P.tete, 0, 0.58, 0, opt); boite(0.9, 0.05, 0.9, 0x95a5a6, P.tete, 0, 0.5, 0, opt); }
    else if (c === 'fourrure') { boite(0.64, 0.28, 0.64, 0x6e2c00, P.tete, 0, 0.6, 0, opt); boite(0.3, 0.2, 0.3, 0x117864, P.tete, 0, 0.78, 0, opt); }
    else if (c === 'couronne') { boite(0.6, 0.12, 0.6, 0xf1c40f, P.tete, 0, 0.62, 0, { lueur: 0x7d6608 }); }
    else if (look.cheveux) { boite(0.6, 0.16, 0.6, look.cheveux, P.tete, 0, 0.62, 0, opt); boite(0.6, 0.5, 0.12, look.cheveux, P.tete, 0, 0.35, -0.25, opt); }
    // Bras
    // Le personnage regarde vers +Z : sa main droite est du côté -X.
    P.brasG = new T.Group(); P.brasG.position.set(0.52, 0.8, 0); P.haut.add(P.brasG);
    P.brasD = new T.Group(); P.brasD.position.set(-0.52, 0.8, 0); P.haut.add(P.brasD);
    boite(0.25, 0.72, 0.27, tun, P.brasG, 0, -0.32, 0, opt); boite(0.22, 0.16, 0.22, peau, P.brasG, 0, -0.74, 0, opt);
    boite(0.25, 0.72, 0.27, tun, P.brasD, 0, -0.32, 0, opt); boite(0.22, 0.16, 0.22, peau, P.brasD, 0, -0.74, 0, opt);
    // Poignet : roulis (Y) puis tangage (X), l'arme y est accrochée
    P.roulis = new T.Group(); P.roulis.position.y = -0.76; P.brasD.add(P.roulis);
    P.poignet = new T.Group(); P.roulis.add(P.poignet);
    P.main = new T.Group(); P.main.rotation.x = Math.PI / 2; P.poignet.add(P.main);
    if (look.bouclier) {
      var bc = look.bc || 0x7f8c8d;
      P.bouclier = new T.Group(); P.bouclier.position.set(-0.1, -0.45, 0.05); P.brasG.add(P.bouclier);
      if (look.bouclier === 'kite') { boite(0.08, 0.95, 0.62, bc, P.bouclier, 0, 0, 0, opt); boite(0.09, 0.3, 0.42, bc, P.bouclier, 0, -0.55, 0, opt); boite(0.1, 0.1, 0.1, 0xd4ac0d, P.bouclier, -0.03, 0.05, 0); }
      else if (look.bouclier === 'pavois') { boite(0.1, 1.2, 0.75, bc, P.bouclier, 0, -0.05, 0, opt); boite(0.11, 0.6, 0.12, 0xc0392b, P.bouclier, -0.01, 0, 0); }
      else { boite(0.08, 0.78, 0.78, bc, P.bouclier, 0, 0, 0, opt); boite(0.1, 0.16, 0.16, 0xd4ac0d, P.bouclier, -0.03, 0, 0); }
      P.bouclier.rotation.y = Math.PI / 2;
      P.bouclier.position.set(0, -0.45, 0.2);
    }
    var s = taille || 1;
    g.scale.set(s, s, s);
    return P;
  };
  // Cheval en blocs (regarde vers +Z). o : robe, crin, caparacon (couleur), croix
  M.creerCheval = function (o) {
    o = o || {};
    var g = new T.Group(), robe = o.robe || 0x6e2c00, crin = o.crin || 0x1c1c1c;
    var H = { g: g, jambes: [] };
    H.corps = new T.Group(); g.add(H.corps);
    boite(0.78, 0.82, 2.1, robe, H.corps, 0, 1.5, 0);
    boite(0.7, 0.6, 0.5, robe, H.corps, 0, 1.62, -1.05); // croupe
    var queue = boite(0.18, 0.75, 0.18, crin, H.corps, 0, 1.35, -1.32); queue.rotation.x = -0.35;
    H.tete = new T.Group(); H.tete.position.set(0, 1.75, 0.95); H.corps.add(H.tete);
    var cou = boite(0.42, 1.05, 0.5, robe, H.tete, 0, 0.42, 0.18); cou.rotation.x = 0.55;
    boite(0.4, 0.42, 0.85, robe, H.tete, 0, 0.85, 0.55);
    boite(0.3, 0.3, 0.22, 0x3e2723, H.tete, 0, 0.78, 0.98); // museau
    boite(0.1, 0.18, 0.08, robe, H.tete, -0.13, 1.12, 0.32); boite(0.1, 0.18, 0.08, robe, H.tete, 0.13, 1.12, 0.32); // oreilles
    boite(0.08, 0.08, 0.04, 0x111111, H.tete, -0.21, 0.92, 0.62, { ombre: false }); boite(0.08, 0.08, 0.04, 0x111111, H.tete, 0.21, 0.92, 0.62, { ombre: false });
    var cr = boite(0.12, 0.85, 0.32, crin, H.tete, 0, 0.62, -0.08); cr.rotation.x = 0.55;
    // Selle, rênes
    boite(0.84, 0.14, 0.75, 0x5d4037, H.corps, 0, 1.97, -0.1);
    boite(0.88, 0.1, 0.12, 0x3e2723, H.corps, 0, 1.88, -0.45);
    boite(0.46, 0.05, 0.05, 0x3e2723, H.tete, 0, 0.75, 0.9);
    if (o.caparacon) {
      boite(0.92, 0.75, 1.9, o.caparacon, H.corps, 0, 1.38, 0.05);
      boite(0.46, 0.5, 0.9, o.caparacon, H.tete, 0, 0.95, 0.5);
      if (o.croix) { boite(0.94, 0.14, 0.5, o.croix, H.corps, 0, 1.45, 0.3); boite(0.94, 0.5, 0.14, o.croix, H.corps, 0, 1.45, 0.3); }
    }
    // Jambes : avant gauche, avant droite, arrière gauche, arrière droite
    [[-0.26, 0.78], [0.26, 0.78], [-0.26, -0.78], [0.26, -0.78]].forEach(function (p) {
      var j = new T.Group(); j.position.set(p[0], 1.12, p[1]); H.corps.add(j);
      boite(0.22, 0.62, 0.26, robe, j, 0, -0.3, 0);
      boite(0.18, 0.46, 0.2, robe, j, 0, -0.82, 0);
      boite(0.22, 0.1, 0.26, 0x2c2c2c, j, 0, -1.08, 0.02);
      H.jambes.push(j);
    });
    return H;
  };

  // ---------- Modèles faits dans Blockbench (modeles.js) ----------
  // Chaque modèle est une liste de cubes : [groupe, nom, x0, y0, z0, x1, y1, z1, couleur]. Le personnage regarde vers +Z,
  // sa droite est du côté -X. On range les cubes dans les mêmes articulations que les personnages en blocs,
  // pour garder toutes les animations (marche, coups, parade, cheval).
  var MODELES = window.FF_MODELES || {};
  var K_PERSO = 1.2, K_CHEVAL = 1.28;
  // Si une troupe montée doit se battre à pied, on prend le modèle à pied le plus proche
  var A_PIED = { chevalier_monte: 'chevalier', cataphracte: 'skutatos', cavalier_turc: 'archer_turc', cavalier_fatimide: 'fatimide', sergent_cheval: 'sergent', eclaireur: 'fantassin' };
  function aPieds(id) { return !MODELES[id].some(function (c) { return c[0].indexOf('cheval_') === 0; }); }
  M.aModele = function (id) { return !!(id && MODELES[id]); };
  M.modeleAPied = function (id) { return MODELES[id] && !aPieds(id) ? A_PIED[id] : id; };
  function boiteMod(c, parent, k, t, piv, opt) {
    if (c[8] < 0) return null;
    var w = Math.max((c[5] - c[2]) * k, 0.012), h = Math.max((c[6] - c[3]) * k, 0.012), d = Math.max((c[7] - c[4]) * k, 0.012);
    return boite(w, h, d, c[8], parent, (c[2] + c[5]) / 2 * k + t[0] - piv[0], (c[3] + c[6]) / 2 * k + t[1] - piv[1], (c[4] + c[7]) / 2 * k + t[2] - piv[2], opt);
  }
  function bornes(cs) {
    var b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    cs.forEach(function (c) { for (var i = 0; i < 3; i++) { b[i] = Math.min(b[i], c[2 + i]); b[3 + i] = Math.max(b[3 + i], c[5 + i]); } });
    return b;
  }
  function persoModele(id, taille, o) {
    var cubes = MODELES[id], k = K_PERSO, opt = o.spectre ? { op: 0.7, lueur: 0x1b4f72 } : null;
    var monte = !aPieds(id);
    if (monte) cubes = cubes.filter(function (c) { return c[0].indexOf('cavalier_') === 0; }).map(function (c) { var d = c.slice(); d[0] = d[0].slice(9); return d; });
    var gr = function (n) { return cubes.filter(function (c) { return c[0] === n; }); };
    // Hanches : haut des jambes (à pied) ou bas du torse (à cheval)
    var torse = cubes.filter(function (c) { return c[1] === 'torse'; });
    var hanche = monte ? bornes(torse.length ? torse : gr('corps'))[1] : bornes(gr('jambes'))[4];
    var t = [0, 0.95 - hanche * k, 0];
    var g = new T.Group(), corps = new T.Group(); g.add(corps);
    var P = { g: g, corps: corps, modele: id };
    var bJ = bornes(gr('jambes')), lx = monte ? 0.17 : Math.max(0.08, (bJ[3] - bJ[0]) / 4 * k);
    P.jambeG = new T.Group(); P.jambeG.position.set(lx, 0.95, 0); corps.add(P.jambeG);
    P.jambeD = new T.Group(); P.jambeD.position.set(-lx, 0.95, 0); corps.add(P.jambeD);
    P.haut = new T.Group(); P.haut.position.y = 0.95; corps.add(P.haut);
    var bT = bornes(gr('tete')), yTete = bT[1] * k + t[1];
    P.tete = new T.Group(); P.tete.position.y = yTete - 0.95; P.haut.add(P.tete);
    var brasG = gr('bras').filter(function (c) { return c[2] + c[5] > 0; }), brasD = gr('bras').filter(function (c) { return c[2] + c[5] <= 0; });
    var bG = bornes(brasG), bD = bornes(brasD);
    var epG = [(bG[0] + bG[3]) / 2 * k, bG[4] * k + t[1], (bG[2] + bG[5]) / 2 * k], epD = [(bD[0] + bD[3]) / 2 * k, bD[4] * k + t[1], (bD[2] + bD[5]) / 2 * k];
    if (!brasG.length) epG = [0.52, 1.75, 0]; if (!brasD.length) epD = [-0.52, 1.75, 0];
    P.brasG = new T.Group(); P.brasG.position.set(epG[0], epG[1] - 0.95, epG[2]); P.haut.add(P.brasG);
    P.brasD = new T.Group(); P.brasD.position.set(epD[0], epD[1] - 0.95, epD[2]); P.haut.add(P.brasD);
    P.roulis = new T.Group(); P.roulis.position.y = brasD.length ? (bD[1] * k + t[1]) - epD[1] : -0.76; P.brasD.add(P.roulis);
    P.poignet = new T.Group(); P.roulis.add(P.poignet);
    P.main = new T.Group(); P.main.rotation.x = Math.PI / 2; P.poignet.add(P.main);
    var pHaut = [0, 0.95, 0], pTete = [0, yTete, 0];
    cubes.forEach(function (c) {
      var n = c[0];
      if (n === 'arme' || n === 'epee' || n === 'arc') return; // le jeu met lui-même l'arme en main
      if (n === 'jambes') {
        if (monte) boiteMod(c, corps, k, t, [0, 0, 0], opt); // jambes pliées sur la selle, fixes
        else if (c[2] + c[5] > 0) boiteMod(c, P.jambeG, k, t, [lx, 0.95, 0], opt);
        else boiteMod(c, P.jambeD, k, t, [-lx, 0.95, 0], opt);
      } else if (n === 'tete') boiteMod(c, P.tete, k, t, pTete, opt);
      else if (n === 'bras') { if (c[2] + c[5] > 0) boiteMod(c, P.brasG, k, t, epG, opt); else boiteMod(c, P.brasD, k, t, epD, opt); }
      else if (n === 'bouclier') {
        if (!P.bouclier) { P.bouclier = new T.Group(); P.brasG.add(P.bouclier); }
        boiteMod(c, P.bouclier, k, t, epG, opt);
      } else boiteMod(c, P.haut, k, t, pHaut, opt); // corps, équipement (carquois, sacoche…)
    });
    var s = taille || 1;
    g.scale.set(s, s, s);
    return P;
  }
  // Cheval d'une troupe montée (même animation que le cheval en blocs)
  M.chevalModele = function (id) {
    if (!MODELES[id] || aPieds(id)) return null;
    var cubes = MODELES[id].filter(function (c) { return c[0].indexOf('cheval_') === 0 || c[0] === 'harnais'; }), k = K_CHEVAL, t = [0, 0, 0];
    var g = new T.Group(), H = { g: g, jambes: [], modele: id };
    H.corps = new T.Group(); g.add(H.corps);
    var enc = cubes.filter(function (c) { return c[1] === 'encolure_1'; }), bE = bornes(enc.length ? enc : cubes.filter(function (c) { return c[0] === 'cheval_tete'; }));
    var pT = [0, bE[1] * k, (bE[2] + bE[5]) / 2 * k];
    H.tete = new T.Group(); H.tete.position.set(pT[0], pT[1], pT[2]); H.corps.add(H.tete);
    var JAMBES = ['avant_d', 'avant_g', 'arriere_d', 'arriere_g'], pJ = [];
    JAMBES.forEach(function (n, i) {
      var cs = cubes.filter(function (c) { return c[0] === 'cheval_jambes' && c[1].slice(-n.length) === n; }), b = bornes(cs);
      pJ[i] = cs.length ? [(b[0] + b[3]) / 2 * k, b[4] * k, (b[2] + b[5]) / 2 * k] : [0, 1, 0];
      var j = new T.Group(); j.position.set(pJ[i][0], pJ[i][1], pJ[i][2]); H.corps.add(j); H.jambes.push(j);
    });
    var TETE = /^(muserolle|montant|frontal|chanfrein|bride|mors)/;
    cubes.forEach(function (c) {
      if (c[0] === 'cheval_tete' || (c[0] === 'harnais' && TETE.test(c[1]))) boiteMod(c, H.tete, k, t, pT);
      else if (c[0] === 'cheval_jambes') { var i = JAMBES.findIndex(function (n) { return c[1].slice(-n.length) === n; }); if (i < 0) i = (c[2] + c[5] > 0 ? 1 : 0) + (c[4] + c[7] < 0 ? 2 : 0); boiteMod(c, H.jambes[i], k, t, pJ[i]); }
      else boiteMod(c, H.corps, k, t, [0, 0, 0]);
    });
    return H;
  };

  // Objets de décor faits dans Blockbench (modeles-ville.js) : une seule géométrie par modèle (rapide à dessiner),
  // couleurs par sommet. Un groupe nommé (ex. « ailes » du moulin) peut être séparé pour être animé autour de son pivot.
  var VILLE_MOD = window.FF_VILLE || {}, VILLE_PIV = window.FF_VILLE_PIVOTS || {}, GEO_MOD = {};
  var FACES = [[0, 1, 2, -1], [0, -1, 2, 1], [1, 2, 0, 1], [1, 0, 2, -1], [2, 0, 1, 1], [2, 1, 0, -1]]; // axe normal, axes u, v, signe
  function geoCubes(cubes, piv) {
    var pos = [], nor = [], col = [], idx = [], c = new T.Color();
    cubes.forEach(function (q) {
      if (q[8] < 0) return;
      c.setHex(q[8]);
      var mn = [q[2] - piv[0], q[3] - piv[1], q[4] - piv[2]], mx = [q[5] - piv[0], q[6] - piv[1], q[7] - piv[2]];
      FACES.forEach(function (f) {
        var a = f[0], u = f[1], v = f[2], sg = f[3], base = pos.length / 3;
        var coin = [[mn[u], mn[v]], [mx[u], mn[v]], [mx[u], mx[v]], [mn[u], mx[v]]];
        coin.forEach(function (cv) { var p = [0, 0, 0]; p[a] = sg > 0 ? mx[a] : mn[a]; p[u] = cv[0]; p[v] = cv[1]; pos.push(p[0], p[1], p[2]); var n = [0, 0, 0]; n[a] = sg; nor.push(n[0], n[1], n[2]); col.push(c.r, c.g, c.b); });
        // Sens des triangles selon l'orientation de la face
        var dir = (u + 1) % 3 === v ? sg : -sg;
        if (dir > 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3); else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      });
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  var MAT_MOD = new T.MeshLambertMaterial({ vertexColors: true });
  M.aObjet = function (id) { return !!VILLE_MOD[id]; };
  // Renvoie un groupe ; les sous-groupes animables sont dans g.userData.pieces (ex. pieces.ailes)
  M.objetModele = function (id) {
    var cubes = VILLE_MOD[id]; if (!cubes) return null;
    var pivs = VILLE_PIV[id] || {};
    if (!GEO_MOD[id]) {
      GEO_MOD[id] = { reste: geoCubes(cubes.filter(function (c) { return !pivs[c[0]]; }), [0, 0, 0]), pieces: {} };
      Object.keys(pivs).forEach(function (n) { GEO_MOD[id].pieces[n] = geoCubes(cubes.filter(function (c) { return c[0] === n; }), pivs[n]); });
    }
    var G = GEO_MOD[id], g = new T.Group(), m = new T.Mesh(G.reste, MAT_MOD);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    g.userData.pieces = {};
    Object.keys(G.pieces).forEach(function (n) {
      var pg = new T.Group(); pg.position.set(pivs[n][0], pivs[n][1], pivs[n][2]); g.add(pg);
      var pm = new T.Mesh(G.pieces[n], MAT_MOD); pm.castShadow = true; pg.add(pm);
      g.userData.pieces[n] = pg;
    });
    return g;
  };
  M.equiper = function (P, id) {
    if (P.arme) P.main.remove(P.arme);
    P.arme = M.creerArme(id);
    P.main.add(P.arme);
    P.armeId = id;
  };

  // ---------- Effets ----------
  var FX = { parts: [], anneaux: [], textes: [], eclairs: [] };
  M.viderEffets = function () {
    FX.parts.forEach(function (p) { if (p.m.parent) p.m.parent.remove(p.m); });
    FX.anneaux.forEach(function (a) { if (a.m.parent) a.m.parent.remove(a.m); });
    FX.eclairs.forEach(function (a) { if (a.m.parent) a.m.parent.remove(a.m); });
    FX.textes.forEach(function (t) { t.el.remove(); });
    FX.parts = []; FX.anneaux = []; FX.textes = []; FX.eclairs = [];
  };
  // Étincelles / éclats
  M.eclats = function (pos, couleur, n, force, grav) {
    if (FX.parts.length > 260) return;
    for (var i = 0; i < n; i++) {
      var m = new T.Mesh(GEO_BOITE, mat(couleur, { basic: true }));
      var s = 0.06 + Math.random() * 0.1;
      m.scale.set(s, s, s);
      m.position.copy(pos);
      scene.add(m);
      var f = force || 4;
      FX.parts.push({ m: m, v: new T.Vector3((Math.random() - 0.5) * f, Math.random() * f * 0.9 + 1, (Math.random() - 0.5) * f), t: 0, vie: 0.4 + Math.random() * 0.4, g: grav == null ? 12 : grav });
    }
  };
  // Anneau au sol (zone d'attaque annoncée ou impact)
  var GEO_ANNEAU = new T.RingGeometry(0.85, 1, 32);
  var GEO_DISQUE = new T.CircleGeometry(1, 32);
  M.anneau = function (x, z, r, couleur, duree, plein) {
    var m = new T.Mesh(plein ? GEO_DISQUE : GEO_ANNEAU, new T.MeshBasicMaterial({ color: couleur, transparent: true, opacity: plein ? 0.3 : 0.8, depthWrite: false, side: T.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.06, z);
    m.scale.set(r, r, r);
    scene.add(m);
    var a = { m: m, t: 0, vie: duree, r: r, plein: plein };
    FX.anneaux.push(a);
    return a;
  };
  M.eclair = function (x, z, couleur) {
    var g = new T.Group();
    var y = 30, px = x, pz = z;
    while (y > 0) {
      var ny = Math.max(0, y - 3 - Math.random() * 3), nx = x + (Math.random() - 0.5) * 2 * (ny / 30), nz = z + (Math.random() - 0.5) * 2 * (ny / 30);
      var dx = nx - px, dy = ny - y, dz = nz - pz, l = Math.hypot(dx, dy, dz);
      var s = new T.Mesh(GEO_BOITE, mat(couleur || 0xd6eaf8, { basic: true }));
      s.scale.set(0.18, l, 0.18);
      s.position.set((px + nx) / 2, (y + ny) / 2, (pz + nz) / 2);
      s.lookAt(nx, ny, nz); s.rotateX(Math.PI / 2);
      g.add(s);
      px = nx; pz = nz; y = ny;
    }
    scene.add(g);
    FX.eclairs.push({ m: g, t: 0, vie: 0.25 });
    M.eclats(new T.Vector3(x, 0.3, z), 0xaed6f1, 10, 6);
  };
  // Texte flottant (dégâts, « PARADE ! »)
  var V = new T.Vector3();
  M.texte = function (pos, txt, classe) {
    var calque = document.getElementById('calqueTextes');
    if (!calque || FX.textes.length > 40) return;
    var el = document.createElement('div');
    el.className = 'flottant ' + (classe || '');
    el.textContent = txt;
    calque.appendChild(el);
    FX.textes.push({ el: el, p: pos.clone(), t: 0, vie: 0.9 });
  };
  M.projeter = function (p, el) {
    V.copy(p).project(cam);
    if (V.z > 1) { el.style.display = 'none'; return false; }
    el.style.display = '';
    el.style.transform = 'translate(-50%,-50%) translate(' + ((V.x + 1) / 2 * window.innerWidth) + 'px,' + ((1 - V.y) / 2 * window.innerHeight) + 'px)';
    return true;
  };
  M.majEffets = function (dt) {
    for (var i = FX.parts.length - 1; i >= 0; i--) {
      var p = FX.parts[i];
      p.t += dt;
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < 0.05) { p.m.position.y = 0.05; p.v.multiplyScalar(0.5); }
      if (p.t > p.vie) { scene.remove(p.m); FX.parts.splice(i, 1); }
    }
    for (i = FX.anneaux.length - 1; i >= 0; i--) {
      var a = FX.anneaux[i];
      a.t += dt;
      var k = a.t / a.vie;
      if (a.plein) a.m.material.opacity = 0.15 + 0.35 * k;
      else a.m.material.opacity = 0.9 * (1 - k * 0.5);
      if (k >= 1) { scene.remove(a.m); a.m.material.dispose(); FX.anneaux.splice(i, 1); }
    }
    for (i = FX.eclairs.length - 1; i >= 0; i--) {
      var e = FX.eclairs[i];
      e.t += dt;
      if (e.t > e.vie) { scene.remove(e.m); FX.eclairs.splice(i, 1); }
    }
    for (i = FX.textes.length - 1; i >= 0; i--) {
      var t = FX.textes[i];
      t.t += dt;
      t.p.y += dt * 1.4;
      M.projeter(t.p, t.el);
      t.el.style.opacity = String(1 - t.t / t.vie);
      if (t.t > t.vie) { t.el.remove(); FX.textes.splice(i, 1); }
    }
  };

  // Secousse de caméra
  var secousse = 0;
  M.secouer = function (f) { secousse = Math.max(secousse, f); };
  M.appliquerSecousse = function (dt) {
    if (secousse <= 0) return;
    cam.position.x += (Math.random() - 0.5) * secousse;
    cam.position.y += (Math.random() - 0.5) * secousse;
    secousse = Math.max(0, secousse - dt * 2.5);
  };

  // ---------- Sons (synthétisés, aucun fichier) ----------
  var AC = null, muet = false;
  M.muet = function (m) { if (m != null) muet = m; return muet; };
  function ac() {
    if (muet) return null;
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function bruit(duree, freq, type, vol, q) {
    var a = ac(); if (!a) return;
    var n = Math.floor(a.sampleRate * duree), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var s = a.createBufferSource(); s.buffer = buf;
    var f = a.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q || 1;
    var g = a.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  function bip(freq, duree, type, vol, glisse) {
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (glisse) o.frequency.exponentialRampToValueAtTime(glisse, a.currentTime + duree);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duree);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + duree);
  }
  M.son = function (nom) {
    try {
      if (nom === 'swing') bruit(0.18, 1800, 'bandpass', 0.25, 0.8);
      else if (nom === 'coup') { bruit(0.15, 500, 'lowpass', 0.6); bip(110, 0.12, 'square', 0.08, 60); }
      else if (nom === 'metal') { bip(1250, 0.25, 'triangle', 0.18, 900); bip(2100, 0.18, 'sine', 0.1); bruit(0.08, 3000, 'highpass', 0.2); }
      else if (nom === 'parade') { bip(1560, 0.5, 'sine', 0.22); bip(2340, 0.4, 'sine', 0.12); }
      else if (nom === 'tonnerre') { bruit(1.2, 300, 'lowpass', 0.9); bruit(0.3, 2000, 'highpass', 0.3); }
      else if (nom === 'or') { bip(988, 0.08, 'square', 0.06); setTimeout(function () { bip(1318, 0.12, 'square', 0.06); }, 70); }
      else if (nom === 'tir') bruit(0.12, 2500, 'bandpass', 0.2, 2);
      else if (nom === 'feu') bruit(0.8, 900, 'lowpass', 0.5);
      else if (nom === 'magie') { bip(660, 0.5, 'sine', 0.15, 1320); bip(990, 0.5, 'triangle', 0.08, 1980); }
      else if (nom === 'cor') { bip(220, 0.9, 'sawtooth', 0.08, 233); bip(330, 0.9, 'sawtooth', 0.05, 349); }
      else if (nom === 'victoire') { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { bip(f, 0.35, 'triangle', 0.15); }, i * 150); }); }
      else if (nom === 'defaite') { [392, 330, 262].forEach(function (f, i) { setTimeout(function () { bip(f, 0.5, 'triangle', 0.15); }, i * 250); }); }
      else if (nom === 'eau') bruit(0.6, 600, 'lowpass', 0.4);
      else if (nom === 'clic') bip(700, 0.05, 'square', 0.05);
      // Bruits de la ville et des villages
      else if (nom === 'enclume') { bip(1900, 0.14, 'triangle', 0.035, 1500); bip(2800, 0.08, 'sine', 0.02); }
      else if (nom === 'foule') { bruit(1.6, 420, 'bandpass', 0.05, 0.6); setTimeout(function () { bruit(1.2, 650, 'bandpass', 0.035, 0.8); }, 500); }
      else if (nom === 'cloche') { [0, 900].forEach(function (t) { setTimeout(function () { bip(392, 1.6, 'sine', 0.05); bip(784, 1.1, 'sine', 0.02); bip(1176, 0.7, 'sine', 0.012); }, t); }); }
      else if (nom === 'coq') { bip(700, 0.15, 'sawtooth', 0.02, 900); setTimeout(function () { bip(900, 0.5, 'sawtooth', 0.02, 650); }, 160); }
      else if (nom === 'luth') { var nl = [392, 440, 494, 587, 659, 784]; [0, 220, 440].forEach(function (t) { setTimeout(function () { bip(nl[Math.floor(Math.random() * nl.length)], 0.6, 'triangle', 0.025); }, t); }); }
      else if (nom === 'mouton') { bip(330, 0.5, 'sawtooth', 0.018, 300); }
    } catch (e) {}
  };

  // ---------- Décors ----------
  var DECORS = {
    foret: { ciel: 0x6fa8dc, horizon: 0xcfe2f3, sol: [0x5b8c3a, 0x4e7d32, 0x679c43], props: 'foret', soleil: 0xfff1d6 },
    plaine: { ciel: 0x7fb3e6, horizon: 0xe8eef2, sol: [0x8aa64a, 0x9cb556, 0x7d9a42], props: 'plaine' },
    desert: { ciel: 0x5dade2, horizon: 0xf6e7c8, sol: [0xd9b77e, 0xceaa6c, 0xe2c38e], props: 'desert', soleil: 0xffe9b8, forceSoleil: 0.82, hemi: 0.62 },
    ville: { ciel: 0x7fb3e6, horizon: 0xeaeaea, sol: [0xb8a888, 0xa89878, 0xc4b494], props: 'ville' },
    nuit: { ciel: 0x0b1530, horizon: 0x1c2b4a, sol: [0x5b5446, 0x4d473b, 0x635b4c], props: 'ville', soleil: 0x8fa8d8, forceSoleil: 0.45, hemi: 0.35, lumCiel: 0x8fa8d8, brouillard0: 20, brouillard1: 90, torches: true },
    montagne: { ciel: 0x85929e, horizon: 0xe5e8e8, sol: [0xf2f4f4, 0xe5e8e8, 0xd7dbdd], props: 'montagne', soleil: 0xeaf2f8, brouillard0: 25, brouillard1: 100 },
    remparts: { ciel: 0x5dade2, horizon: 0xf6e7c8, sol: [0xcdb48a, 0xbfa67c, 0xd6be94], props: 'remparts', soleil: 0xffe9b8, forceSoleil: 1 },
    crypte: { ciel: 0x111111, horizon: 0x1a1a22, sol: [0x4d4d55, 0x45454d, 0x55555e], props: 'crypte', soleil: 0x7fb3d5, forceSoleil: 0.35, hemi: 0.3, brouillard0: 12, brouillard1: 55, torches: true },
    pont: { ciel: 0x5d9bd5, horizon: 0xd6eaf8, sol: null, props: 'pont' }
  };
  M.DECORS = DECORS;
  // Heures du jour pour les batailles en plein air (même décor, autre lumière)
  var AMBIANCES = {
    crepuscule: { ciel: 0x34507f, horizon: 0xf4a261, soleil: 0xffa45c, forceSoleil: 1.05, hemi: 0.45, lumCiel: 0xffc59a, lumSol: 0x3d2f4f, brouillard0: 35, brouillard1: 150, soleilDir: [22, 11, -60], disque: 0xffb36b },
    aube: { ciel: 0x7d9fd6, horizon: 0xf9d3b4, soleil: 0xffd6ad, forceSoleil: 0.9, hemi: 0.6, lumCiel: 0xffe2c8, brouillard0: 30, brouillard1: 130, soleilDir: [-60, 18, 30], disque: 0xfff0d0 },
    nuit: { ciel: 0x070d22, horizon: 0x1f3158, soleil: 0x9fb8e8, forceSoleil: 0.5, hemi: 0.3, lumCiel: 0x8fa8d8, lumSol: 0x1a1a2a, brouillard0: 25, brouillard1: 110, soleilDir: [-22, 24, -60], disque: 0xe8eefc, disqueR: 9, feux: true }
  };
  M.AMBIANCES = AMBIANCES;

  // Sol en damier de couleurs, légèrement bosselé hors de l'arène
  function sol(couleurs, rayonPlat, graine) {
    var r = rng(graine);
    var g = new T.PlaneGeometry(260, 260, 52, 52);
    g.rotateX(-Math.PI / 2);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z);
      if (d > rayonPlat + 4) p.setY(i, (d - rayonPlat - 4) * 0.06 * r() * 3 + Math.sin(x * 0.1) * Math.cos(z * 0.13) * Math.min(3, (d - rayonPlat) * 0.05));
    }
    g = g.toNonIndexed();
    p = g.attributes.position;
    var cols = [];
    for (i = 0; i < p.count; i += 3) {
      var c = new T.Color(couleurs[Math.floor(r() * couleurs.length)]);
      for (var k = 0; k < 3; k++) cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    var m = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true }));
    m.receiveShadow = true;
    return m;
  }

  // Petits modèles de décor
  var P = {};
  P.arbre = function (x, z, s, r) {
    var g = new T.Group(); g.position.set(x, 0, z);
    boite(0.5, 2.2, 0.5, 0x6e4b2a, g, 0, 1.1, 0);
    var verts = [0x2e7d32, 0x388e3c, 0x1b5e20, 0x43a047];
    if (r() < 0.5) { // sapin
      for (var i = 0; i < 3; i++) boite(2.6 - i * 0.7, 1.1, 2.6 - i * 0.7, verts[i % 4], g, 0, 2.3 + i * 0.95, 0);
    } else {
      boite(2.4, 1.8, 2.4, verts[Math.floor(r() * 4)], g, 0, 3.0, 0);
      boite(1.6, 1, 1.6, verts[Math.floor(r() * 4)], g, 0.3, 4.1, -0.2);
    }
    g.scale.setScalar(s); g.rotation.y = r() * 6;
    return g;
  };
  P.palmier = function (x, z, s, r) {
    var g = new T.Group(); g.position.set(x, 0, z);
    for (var i = 0; i < 6; i++) boite(0.38, 0.75, 0.38, i % 2 ? 0x8d6e63 : 0x795548, g, i * 0.08, 0.38 + i * 0.72, 0);
    for (var k = 0; k < 5; k++) { var f = boite(2.4, 0.12, 0.6, 0x2e8b57, g, 0.5, 4.4, 0); f.rotation.y = k * 1.25; f.rotation.z = -0.35; f.position.x = 0.5 + Math.cos(k * 1.25) * 0.9; f.position.z = -Math.sin(k * 1.25) * 0.9; }
    g.scale.setScalar(s); return g;
  };
  P.rocher = function (x, z, s, couleur) {
    var m = new T.Mesh(new T.DodecahedronGeometry(1, 0), mat(couleur || 0x8c8c8c));
    m.position.set(x, s * 0.4, z); m.scale.set(s, s * 0.75, s); m.rotation.set(x, z, 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  P.maison = function (x, z, ang, style, r) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    var w = 4 + r() * 2, d = 4 + r() * 2, h = 3 + r() * 1.5;
    if (style === 'orient') {
      boite(w, h, d, [0xf4ecd8, 0xe8dcc0, 0xfaf3e3][Math.floor(r() * 3)], g, 0, h / 2, 0);
      boite(w + 0.2, 0.3, d + 0.2, 0xd8c8a8, g, 0, h, 0);
      boite(0.9, 1.6, 0.1, 0x5d4037, g, 0, 0.8, d / 2 + 0.03);
      if (r() < 0.35) { var dome = new T.Mesh(new T.SphereGeometry(1.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(r() < 0.5 ? 0xf4ecd8 : 0x3e8e9e)); dome.position.y = h; g.add(dome); }
    } else if (style === 'byzance') {
      boite(w, h, d, [0xe8d5b5, 0xd9c4a0, 0xc9a77c][Math.floor(r() * 3)], g, 0, h / 2, 0);
      for (var i = -1; i <= 1; i += 2) boite(w * 0.9, 0.25, 0.1, 0xa04000, g, 0, h * 0.4 + i * 0.4, d / 2 + 0.03);
      var toit = new T.Mesh(new T.ConeGeometry(Math.max(w, d) * 0.75, 1.6, 4), mat(0xb03a2e)); toit.position.y = h + 0.8; toit.rotation.y = Math.PI / 4; toit.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(toit);
      boite(0.9, 1.6, 0.1, 0x5d4037, g, 0, 0.8, d / 2 + 0.03);
    } else { // colombages d'Occident
      boite(w, h, d, 0xf5f0e1, g, 0, h / 2, 0);
      for (var k = -1; k <= 1; k++) boite(0.18, h, 0.05, 0x5d4037, g, k * w * 0.4, h / 2, d / 2 + 0.02);
      boite(w, 0.18, 0.05, 0x5d4037, g, 0, h * 0.55, d / 2 + 0.02);
      var t2 = new T.Mesh(new T.ConeGeometry(Math.max(w, d) * 0.8, 2.4, 4), mat(r() < 0.5 ? 0x6d4c41 : 0x8d3b2b)); t2.position.y = h + 1.2; t2.rotation.y = Math.PI / 4; t2.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(t2);
      boite(0.9, 1.6, 0.1, 0x4e342e, g, 0, 0.8, d / 2 + 0.04);
    }
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.userData.r = Math.max(w, d) * 0.6;
    return g;
  };
  P.tour = function (x, z, h, couleur) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var c = new T.Mesh(new T.CylinderGeometry(2.4, 2.7, h, 8), mat(couleur || 0xc8b48a)); c.position.y = h / 2; c.castShadow = true; c.receiveShadow = true; g.add(c);
    for (var i = 0; i < 8; i++) boite(0.8, 0.8, 0.8, couleur || 0xc8b48a, g, Math.cos(i * Math.PI / 4) * 2.3, h + 0.4, Math.sin(i * Math.PI / 4) * 2.3);
    return g;
  };
  P.muraille = function (x, z, longueur, ang, h, couleur) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    boite(longueur, h, 2.2, couleur || 0xc8b48a, g, 0, h / 2, 0);
    for (var i = -longueur / 2 + 0.6; i < longueur / 2; i += 1.6) boite(0.8, 0.8, 0.5, couleur || 0xc8b48a, g, i, h + 0.4, 0.85);
    g.traverse(function (o) { if (o.isMesh) o.receiveShadow = true; });
    return g;
  };
  P.tente = function (x, z, couleur) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var c = new T.Mesh(new T.ConeGeometry(2, 2.8, 6), mat(couleur)); c.position.y = 1.4; c.castShadow = true; g.add(c);
    boite(0.08, 1, 0.08, 0x5d4037, g, 0, 3.2, 0);
    boite(0.6, 0.35, 0.04, couleur === 0xf8f9f9 ? 0xc0392b : 0xf8f9f9, g, 0.3, 3.5, 0);
    return g;
  };
  P.colonne = function (x, z, h, cassee) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var c = new T.Mesh(new T.CylinderGeometry(0.55, 0.65, h, 8), mat(0xd5d8dc)); c.position.y = h / 2; c.castShadow = true; g.add(c);
    if (!cassee) boite(1.6, 0.4, 1.6, 0xd5d8dc, g, 0, h + 0.2, 0);
    return g;
  };
  P.torche = function (x, z, parent) {
    var g = new T.Group(); g.position.set(x, 0, z);
    boite(0.15, 2, 0.15, 0x4e342e, g, 0, 1, 0);
    boite(0.3, 0.35, 0.3, 0xffa726, g, 0, 2.15, 0, { basic: true, ombre: false });
    var l = new T.PointLight(0xffa040, 1.2, 14, 2); l.position.y = 2.6; g.add(l);
    parent.add(g);
    return g;
  };
  P.caisse = function (x, z, s) {
    var g = new T.Group(); g.position.set(x, 0, z);
    boite(s, s, s, 0x8d6e63, g, 0, s / 2, 0); boite(s * 1.02, 0.1, s * 1.02, 0x5d4037, g, 0, s * 0.9, 0);
    g.rotation.y = x * 3;
    return g;
  };
  M.PROPS = P;

  // Construit un décor de bataille. Renvoie { obstacles: [{x,z,r}], forme: {type:'cercle',r} | {type:'rect',w,h} }
  M.construireDecor = function (nom, graine, opt) {
    var D = DECORS[nom] || DECORS.plaine;
    if (opt && opt.ambiance && AMBIANCES[opt.ambiance] && ['plaine', 'desert', 'foret', 'montagne'].indexOf(nom) >= 0) D = Object.assign({}, D, AMBIANCES[opt.ambiance]);
    M.nouvelleScene(D);
    var r = rng(graine || 7);
    var obs = [], R0 = (opt && opt.rayon) || 22;
    var forme = { type: 'cercle', r: R0 };
    function ajout(o, ox, oz, rayon) { scene.add(o); if (rayon) obs.push({ x: ox, z: oz, r: rayon }); }
    function anneauProps(n, rmin, rmax, fabrique) {
      for (var i = 0; i < n; i++) {
        var a = r() * Math.PI * 2, d = rmin + r() * (rmax - rmin);
        fabrique(Math.cos(a) * d, Math.sin(a) * d, a);
      }
    }
    if (nom === 'pont') {
      // Deux navires côte à côte sur la mer : le combat d'abordage
      forme = { type: 'rect', w: 9, h: 22 };
      var eau = new T.Mesh(new T.PlaneGeometry(400, 400), mat(0x1f6fa3));
      eau.rotation.x = -Math.PI / 2; eau.position.y = -1.2; scene.add(eau);
      [-2.6, 2.6].forEach(function (x, i) {
        boite(4.8, 1.6, 22, 0x6e4b2a, scene, x, -0.8, 0, { ombre: false }).receiveShadow = true;
        var pont = boite(4.6, 0.1, 21.6, i ? 0xa1887f : 0x8d6e63, scene, x, 0, 0); pont.receiveShadow = true;
        boite(0.3, 1, 22, 0x5d4037, scene, x + (i ? 2.45 : -2.45), 0.5, 0);
        var mat2 = new T.Mesh(new T.CylinderGeometry(0.22, 0.28, 9, 6), mat(0x6e4b2a)); mat2.position.set(x, 4.5, 2); mat2.castShadow = true; scene.add(mat2);
        obs.push({ x: x, z: 2, r: 0.5 });
        boite(5, 3.4, 0.08, i ? 0x7d3c98 : 0xf8f9f9, scene, x, 5.8, 2.3);
      });
      boite(0.6, 0.15, 3, 0x5d4037, scene, 0, 0.05, -4); boite(0.6, 0.15, 3, 0x5d4037, scene, 0, 0.05, 5);
      P.caisse && ajout(P.caisse(-3.5, -8, 0.9), -3.5, -8, 0.7);
      ajout(P.caisse(3.6, 7.5, 0.9), 3.6, 7.5, 0.7);
      return { obstacles: obs, forme: forme };
    }
    scene.add(sol(D.sol, R0, graine || 7));
    var style = 'occident';
    if (nom === 'foret') {
      anneauProps(70, R0 + 2, 70, function (x, z) { scene.add(P.arbre(x, z, 0.9 + r() * 0.7, r)); });
      for (var i = 0; i < 5; i++) { var a = r() * 6.28, d = 7 + r() * 11; var x = Math.cos(a) * d, z = Math.sin(a) * d; ajout(P.arbre(x, z, 0.9, r), x, z, 0.7); }
      for (i = 0; i < 4; i++) { a = r() * 6.28; d = 6 + r() * 12; x = Math.cos(a) * d; z = Math.sin(a) * d; ajout(P.rocher(x, z, 0.8 + r() * 0.6), x, z, 0.9); }
    } else if (nom === 'plaine') {
      anneauProps(30, R0 + 4, 80, function (x, z) { scene.add(P.arbre(x, z, 0.8 + r() * 0.6, r)); });
      anneauProps(12, R0 + 2, 40, function (x, z) { scene.add(P.tente(x, z, r() < 0.5 ? 0xf8f9f9 : 0xc0392b)); });
      for (i = 0; i < 4; i++) { a = r() * 6.28; d = 6 + r() * 12; x = Math.cos(a) * d; z = Math.sin(a) * d; ajout(P.rocher(x, z, 0.7 + r() * 0.5), x, z, 0.8); }
    } else if (nom === 'desert') {
      anneauProps(18, R0 + 3, 70, function (x, z) { scene.add(P.palmier(x, z, 0.8 + r() * 0.5, r)); });
      anneauProps(25, R0 + 2, 80, function (x, z) { scene.add(P.rocher(x, z, 1 + r() * 2.5, 0xc19a6b)); });
      for (i = 0; i < 4; i++) { a = r() * 6.28; d = 6 + r() * 12; x = Math.cos(a) * d; z = Math.sin(a) * d; ajout(P.rocher(x, z, 0.8 + r() * 0.6, 0xb08d5f), x, z, 0.9); }
    } else if (nom === 'ville' || nom === 'nuit' || nom === 'remparts') {
      style = nom === 'remparts' ? 'orient' : (graine % 3 === 0 ? 'orient' : graine % 3 === 1 ? 'byzance' : 'occident');
      for (i = 0; i < 22; i++) {
        a = i / 22 * Math.PI * 2; d = R0 + 5 + r() * 6;
        var m = P.maison(Math.cos(a) * d, Math.sin(a) * d, -a - Math.PI / 2, style, r); scene.add(m);
      }
      for (i = 0; i < 6; i++) { a = r() * 6.28; d = 6 + r() * 12; x = Math.cos(a) * d; z = Math.sin(a) * d; ajout(P.caisse(x, z, 0.9 + r() * 0.4), x, z, 0.8); }
      if (nom === 'remparts') {
        for (i = 0; i < 10; i++) { a = i / 10 * Math.PI * 2; scene.add(P.muraille(Math.cos(a) * 36, Math.sin(a) * 36, 24, -a + Math.PI / 2, 9)); scene.add(P.tour(Math.cos(a + 0.31) * 36, Math.sin(a + 0.31) * 36, 12)); }
        var domeOr = new T.Mesh(new T.SphereGeometry(6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd4ac0d, { lueur: 0x3d2f05 })); domeOr.position.set(0, 9, -55); scene.add(domeOr);
        boite(13, 9, 13, 0x5d8aa8, scene, 0, 4.5, -55);
      }
      if (D.torches) for (i = 0; i < 4; i++) { a = i / 4 * Math.PI * 2 + 0.4; P.torche(Math.cos(a) * 19, Math.sin(a) * 19, scene); obs.push({ x: Math.cos(a) * 19, z: Math.sin(a) * 19, r: 0.3 }); }
    } else if (nom === 'montagne') {
      anneauProps(30, R0 + 3, 70, function (x, z) { scene.add(P.rocher(x, z, 2 + r() * 5, 0xdfe3e6)); });
      anneauProps(20, R0 + 2, 60, function (x, z) { var t = P.arbre(x, z, 1 + r() * 0.5, function () { return 0.2; }); scene.add(t); });
      for (i = 0; i < 8; i++) { a = i / 8 * Math.PI * 2; x = Math.cos(a) * 15; z = Math.sin(a) * 15; ajout(P.colonne(x, z, 4 + r() * 3, r() < 0.4), x, z, 0.7); }
      var porte = new T.Group(); boite(10, 12, 3, 0xa6acaf, porte, 0, 6, 0); boite(4, 7, 3.2, 0xb9770e, porte, 0, 3.5, 0, { lueur: 0x3d2f05 }); porte.position.set(0, 0, -30); scene.add(porte);
    } else if (nom === 'crypte') {
      forme = { type: 'cercle', r: 16 };
      for (i = 0; i < 14; i++) { a = i / 14 * Math.PI * 2; scene.add(P.colonne(Math.cos(a) * 18, Math.sin(a) * 18, 9)); }
      var plafond = new T.Mesh(new T.CylinderGeometry(22, 22, 1, 14), mat(0x2c2c34)); plafond.position.y = 9.5; scene.add(plafond);
      var murC = new T.Mesh(new T.CylinderGeometry(22, 22, 10, 14, 1, true), new T.MeshLambertMaterial({ color: 0x3a3a44, side: T.BackSide })); murC.position.y = 5; scene.add(murC);
      boite(3, 1.2, 1.6, 0x707b7c, scene, 0, 0.6, -12); obs.push({ x: 0, z: -12, r: 1.4 });
      for (i = 0; i < 5; i++) { a = i / 5 * Math.PI * 2 + 0.3; P.torche(Math.cos(a) * 15, Math.sin(a) * 15, scene); }
    }
    // Bataille de nuit en plein air : des feux de camp autour du champ
    if (D.feux) for (var f = 0; f < 6; f++) { var af = f / 6 * Math.PI * 2 + 0.2; P.torche(Math.cos(af) * (R0 - 0.5), Math.sin(af) * (R0 - 0.5), scene); obs.push({ x: Math.cos(af) * (R0 - 0.5), z: Math.sin(af) * (R0 - 0.5), r: 0.3 }); }
    return { obstacles: obs, forme: forme, style: style };
  };

  return M;
})();
