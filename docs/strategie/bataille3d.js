/* Imperium of Wars — rendu 3D des batailles (Three.js).
   La simulation reste celle de moteur.js (en 2D) : ce fichier ne fait que la montrer en 3D.
   Champ de simulation : x de 0 à 360, y de 0 à 520. Monde 3D : X = x − 180, Z = y − 260. */
(function (root) {
  'use strict';
  var T = root.THREE;

  function dispo() {
    if (!root.THREE) return false;
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }

  // Petit bruit pseudo-aléatoire stable.
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function texture(l, h, dessin, rep) {
    var c = document.createElement('canvas'); c.width = l; c.height = h;
    dessin(c.getContext('2d'), l, h);
    var t = new T.CanvasTexture(c);
    if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); }
    t.anisotropy = 4;
    return t;
  }

  function creer(conteneur, B, opts) {
    var U = opts.unites, L = opts.champ.l, H = opts.champ.h;
    var X = function (x) { return x - L / 2; }, Z = function (y) { return y - H / 2; };

    var rendu = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    rendu.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    rendu.shadowMap.enabled = true;
    rendu.shadowMap.type = T.PCFSoftShadowMap;
    rendu.domElement.className = 'vue3d';
    conteneur.appendChild(rendu.domElement);

    var scene = new T.Scene();
    var ciel = texture(4, 256, function (g, w, h) {
      var d = g.createLinearGradient(0, 0, 0, h);
      d.addColorStop(0, '#4f86c6'); d.addColorStop(0.55, '#a9cbe8'); d.addColorStop(1, '#e8d9b5');
      g.fillStyle = d; g.fillRect(0, 0, w, h);
    });
    scene.background = ciel;
    scene.fog = new T.Fog(0xb8cad8, 650, 1600);

    var camera = new T.PerspectiveCamera(45, 1, 2, 3000);
    scene.add(new T.HemisphereLight(0xdfefff, 0x4a5a2a, 0.6));
    var soleil = new T.DirectionalLight(0xfff0d0, 0.95);
    soleil.position.set(-160, 260, 120);
    soleil.castShadow = true;
    soleil.shadow.mapSize.set(1024, 1024);
    var sc = soleil.shadow.camera; sc.left = -260; sc.right = 260; sc.top = 320; sc.bottom = -320; sc.near = 10; sc.far = 700;
    soleil.shadow.bias = -0.0015;
    scene.add(soleil);

    // ---------- Terrain : champ plat au centre, collines autour ----------
    var herbe = texture(256, 256, function (g, w, h) {
      g.fillStyle = '#4f7a34'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) {
        var v = hash(i), u = hash(i + 99);
        g.fillStyle = 'rgba(' + (60 + v * 50 | 0) + ',' + (100 + u * 60 | 0) + ',' + (30 + v * 30 | 0) + ',.55)';
        g.fillRect(hash(i * 3) * w, hash(i * 7) * h, 2 + v * 3, 2 + u * 3);
      }
    }, 14);
    var solG = new T.PlaneGeometry(1400, 1400, 70, 70);
    solG.rotateX(-Math.PI / 2);
    var pos = solG.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var px = pos.getX(i), pz = pos.getZ(i);
      var hors = Math.max(0, Math.abs(px) - 230) + Math.max(0, Math.abs(pz) - 330);
      var hgt = hors > 0 ? Math.min(1, hors / 160) * (18 + 30 * Math.sin(px * 0.012) * Math.cos(pz * 0.015) + 20 * hash(i)) : 0;
      pos.setY(i, Math.max(0, hgt) - 0.05);
    }
    solG.computeVertexNormals();
    var sol = new T.Mesh(solG, new T.MeshLambertMaterial({ map: herbe }));
    sol.receiveShadow = true;
    scene.add(sol);
    // Chemin de terre au milieu.
    var chemin = new T.Mesh(new T.PlaneGeometry(26, H + 300), new T.MeshLambertMaterial({ color: 0x8a7552, transparent: true, opacity: 0.45 }));
    chemin.rotation.x = -Math.PI / 2; chemin.position.y = 0.02; chemin.receiveShadow = true;
    scene.add(chemin);

    // Arbres et rochers autour du champ.
    var nbArbres = 170;
    var feuilles = new T.InstancedMesh(new T.ConeGeometry(7, 20, 7), new T.MeshLambertMaterial({ color: 0x2f5a27 }), nbArbres);
    var troncs = new T.InstancedMesh(new T.CylinderGeometry(1.2, 1.5, 7, 6), new T.MeshLambertMaterial({ color: 0x5b3a1e }), nbArbres);
    var m4 = new T.Matrix4(), q = new T.Quaternion(), v3 = new T.Vector3(), s3 = new T.Vector3(1, 1, 1), e3 = new T.Euler();
    for (i = 0; i < nbArbres; i++) {
      var ang = hash(i * 13) * Math.PI * 2, r = 250 + hash(i * 17) * 380;
      var ax = Math.cos(ang) * r * 1.0, az = Math.sin(ang) * r * 1.25;
      if (Math.abs(ax) < 215 && Math.abs(az) < 320) { ax = ax < 0 ? -230 - hash(i) * 60 : 230 + hash(i) * 60; }
      var hgt2 = Math.max(0, Math.abs(ax) - 230) + Math.max(0, Math.abs(az) - 330);
      var base = hgt2 > 0 ? Math.min(1, hgt2 / 160) * 14 : 0;
      var k = 0.7 + hash(i * 5) * 0.8;
      s3.set(k, k, k);
      m4.compose(v3.set(ax, base + 3.5 * k, az), q.identity(), s3); troncs.setMatrixAt(i, m4);
      m4.compose(v3.set(ax, base + 15 * k, az), q.identity(), s3); feuilles.setMatrixAt(i, m4);
    }
    feuilles.castShadow = true; troncs.castShadow = true;
    scene.add(feuilles); scene.add(troncs);

    // ---------- Remparts et ville (sièges) ----------
    var murs = [];
    var pierre = texture(128, 64, function (g, w, h) {
      g.fillStyle = '#a39d93'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(60,55,50,.55)'; g.lineWidth = 2;
      for (var y = 0; y < h; y += 16) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
        for (var x = (y / 16) % 2 ? 16 : 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
      }
      for (var n = 0; n < 300; n++) { g.fillStyle = 'rgba(0,0,0,' + hash(n) * 0.12 + ')'; g.fillRect(hash(n * 3) * w, hash(n * 5) * h, 3, 3); }
    });
    pierre.wrapS = pierre.wrapT = T.RepeatWrapping;
    var matPierre = new T.MeshLambertMaterial({ map: pierre });
    var matBois = new T.MeshLambertMaterial({ color: 0x6b4423 });
    var matToit = new T.MeshLambertMaterial({ color: 0x9a3b26 });
    var matGravats = new T.MeshLambertMaterial({ color: 0x77706a });
    if (B.mur) {
      var m = B.mur, zM = Z(m.y), hMur = 12 + 4 * m.niveau;
      m.segs.forEach(function (s, idx) {
        var g = new T.Group(), larg = s.x1 - s.x0, cx = X((s.x0 + s.x1) / 2);
        if (s.porte) {
          [-1, 1].forEach(function (c) {
            var b = new T.Mesh(new T.BoxGeometry(larg / 2 - 12, hMur, 9), matPierre);
            b.position.set(c * (larg / 4 + 6), hMur / 2, 0); b.castShadow = b.receiveShadow = true; g.add(b);
          });
          var linteau = new T.Mesh(new T.BoxGeometry(24, 5, 9), matPierre); linteau.position.y = hMur - 2.5; g.add(linteau);
          var porte = new T.Mesh(new T.BoxGeometry(24, hMur - 5, 3), matBois); porte.position.y = (hMur - 5) / 2; porte.castShadow = true; g.add(porte);
        } else {
          var mur = new T.Mesh(new T.BoxGeometry(larg, hMur, 9), matPierre);
          mur.material.map.repeat.set(larg / 20, hMur / 10);
          mur.position.y = hMur / 2; mur.castShadow = mur.receiveShadow = true; g.add(mur);
        }
        for (var c2 = 3; c2 < larg; c2 += 7) { // créneaux
          if (s.porte && Math.abs(c2 - larg / 2) < 12) continue;
          var cr = new T.Mesh(new T.BoxGeometry(3.5, 3.5, 2.5), matPierre);
          cr.position.set(c2 - larg / 2, hMur + 1.7, m.dedans < 0 ? 3.5 : -3.5); cr.castShadow = true; g.add(cr);
        }
        g.position.set(cx, 0, zM);
        scene.add(g);
        var gravats = new T.Group();
        for (var k2 = 0; k2 < 14; k2++) {
          var gr = new T.Mesh(new T.BoxGeometry(3 + hash(k2 + idx * 20) * 5, 2 + hash(k2 * 3 + idx) * 4, 3 + hash(k2 * 7) * 5), matGravats);
          gr.position.set((hash(k2 * 11 + idx) - 0.5) * larg, 1.5, (hash(k2 * 13 + idx) - 0.5) * 12);
          gr.rotation.y = hash(k2) * 3; gr.castShadow = true; gravats.add(gr);
        }
        gravats.position.set(cx, 0, zM); gravats.visible = false; scene.add(gravats);
        murs.push({ seg: s, mesh: g, gravats: gravats });
      });
      for (var t = 0; t <= m.segs.length; t++) { // tours
        var tour = new T.Mesh(new T.CylinderGeometry(7, 8, hMur + 10, 10), matPierre);
        tour.position.set(X(t * L / m.segs.length), (hMur + 10) / 2, zM); tour.castShadow = true; scene.add(tour);
        var toit = new T.Mesh(new T.ConeGeometry(9, 10, 10), matToit);
        toit.position.set(X(t * L / m.segs.length), hMur + 15, zM); scene.add(toit);
      }
      // Maisons de la ville derrière les murs.
      for (var n2 = 0; n2 < 34; n2++) {
        var hx = (hash(n2 * 19) - 0.5) * (L + 120), loin = 30 + hash(n2 * 23) * 170;
        var hz = zM + m.dedans * (loin + 90);
        var lm = 10 + hash(n2) * 10, hm = 8 + hash(n2 * 2) * 8;
        var maison = new T.Mesh(new T.BoxGeometry(lm, hm, 10), new T.MeshLambertMaterial({ color: new T.Color().setHSL(0.09, 0.25, 0.65 + hash(n2 * 4) * 0.2) }));
        maison.position.set(hx, hm / 2, hz); maison.castShadow = maison.receiveShadow = true; scene.add(maison);
        var tt = new T.Mesh(new T.ConeGeometry(lm * 0.75, 7, 4), matToit);
        tt.position.set(hx, hm + 3.5, hz); tt.rotation.y = Math.PI / 4; tt.castShadow = true; scene.add(tt);
      }
      var eglise = new T.Mesh(new T.BoxGeometry(10, 40, 10), new T.MeshLambertMaterial({ color: 0xcfc6b4 }));
      eglise.position.set(30, 20, zM + m.dedans * 180); eglise.castShadow = true; scene.add(eglise);
      var fleche = new T.Mesh(new T.ConeGeometry(8, 18, 4), matToit);
      fleche.position.set(30, 49, zM + m.dedans * 180); fleche.rotation.y = Math.PI / 4; scene.add(fleche);
    }

    // ---------- Soldats (maillages instanciés) ----------
    var maxH = 0, nbCanons = 0;
    B.esc.forEach(function (e) {
      var Ue = U[e.t];
      maxH += Ue.hommes * (Ue.cat === 'cav' ? 2 : 1);
      if (Ue.cat === 'art') nbCanons += 3;
    });
    function inst(geo, mat, n, ombre, couleurs) {
      var im = new T.InstancedMesh(geo, mat, Math.max(1, n));
      im.instanceMatrix.setUsage(T.DynamicDrawUsage);
      if (couleurs) { // une couleur par soldat (créée avant la 1re image pour que le shader la prenne)
        var blanc = new T.Color(1, 1, 1);
        for (var k = 0; k < im.count; k++) im.setColorAt(k, blanc);
      }
      im.castShadow = !!ombre; im.count = 0; scene.add(im);
      return im;
    }
    var gCorps = new T.BoxGeometry(1.15, 2.3, 0.8); gCorps.translate(0, 1.25, 0);
    var gTete = new T.SphereGeometry(0.48, 8, 6); gTete.translate(0, 2.85, 0);
    var gArme = new T.BoxGeometry(0.14, 1, 0.14); gArme.translate(0, 0.5, 0);
    var gCheval = new T.BoxGeometry(1.2, 1.4, 3.4); gCheval.translate(0, 2.0, 0);
    var gJambes = new T.BoxGeometry(1.0, 1.4, 2.6); gJambes.translate(0, 0.7, 0);
    var gCou = new T.BoxGeometry(0.7, 1.5, 0.9); gCou.translate(0, 3.0, 1.7);
    var corps = inst(gCorps, new T.MeshLambertMaterial({ color: 0xffffff }), maxH, true, true);
    var tetes = inst(gTete, new T.MeshLambertMaterial({ color: 0xe0b48c }), maxH);
    var armes = inst(gArme, new T.MeshLambertMaterial({ color: 0x8d8d8d }), maxH);
    var chevaux = inst(gCheval, new T.MeshLambertMaterial({ color: 0xffffff }), maxH, true, true);
    var jambes = inst(gJambes, new T.MeshLambertMaterial({ color: 0x3b2a1a }), maxH);
    var cous = inst(gCou, new T.MeshLambertMaterial({ color: 0xffffff }), maxH, false, true);
    var morts = inst(new T.BoxGeometry(1.1, 0.5, 2.3), new T.MeshLambertMaterial({ color: 0xffffff }), 1600, false, true);
    var gFut = new T.CylinderGeometry(0.45, 0.6, 6, 10); gFut.rotateX(Math.PI / 2 - 0.15); gFut.translate(0, 2.2, 1.5);
    var futs = inst(gFut, new T.MeshLambertMaterial({ color: 0x2b2b2b }), nbCanons, true);
    var gAffut = new T.BoxGeometry(1.8, 1, 4); gAffut.translate(0, 1.3, 0);
    var affuts = inst(gAffut, matBois, nbCanons, true);
    var gRoue = new T.CylinderGeometry(1.4, 1.4, 0.4, 12); gRoue.rotateZ(Math.PI / 2); gRoue.translate(0, 1.4, 0);
    var roues = inst(gRoue, new T.MeshLambertMaterial({ color: 0x4a3018 }), nbCanons * 2, true);
    var nbMorts = 0;

    var cols = [new T.Color(opts.couleurs[0]), new T.Color(opts.couleurs[1])];
    var colTmp = new T.Color();
    var robes = [0x6b4a2b, 0x8b5a2b, 0x3a3a3a, 0xd8d0c0, 0x5c3b1e];

    // Drapeaux et étiquettes (icône + barre de vie) au-dessus de chaque unité.
    var infos = B.esc.map(function (e) {
      var g = new T.Group();
      var mat = new T.MeshLambertMaterial({ color: cols[e.camp], side: T.DoubleSide });
      var hampe = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 13, 5), matBois); hampe.position.y = 6.5; g.add(hampe);
      var flag = new T.Mesh(new T.PlaneGeometry(5, 3.4, 4, 1), mat); flag.position.set(2.5, 11, 0); g.add(flag);
      scene.add(g);
      var c = document.createElement('canvas'); c.width = 128; c.height = 72;
      var tex = new T.CanvasTexture(c);
      var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      sp.scale.set(19, 10.7, 1); sp.renderOrder = 10; scene.add(sp);
      return { e: e, drapeau: g, flag: flag, sprite: sp, canvas: c, tex: tex, cle: '', angle: e.camp === 0 ? Math.PI : 0,
        vus: Math.ceil(e.hp / U[e.t].pv), px: e.x, py: e.y, bouge: 0 };
    });
    function etiquette(inf, sel) {
      var e = inf.e, Ue = U[e.t], hp = Math.max(0, e.hp / e.hpMax);
      var cle = (e.fuite ? 'f' : '') + (sel ? 's' : '') + Math.round(hp * 20);
      if (cle === inf.cle) return;
      inf.cle = cle;
      var g = inf.canvas.getContext('2d');
      g.clearRect(0, 0, 128, 72);
      g.fillStyle = sel ? 'rgba(255,255,255,.95)' : 'rgba(15,23,42,.75)';
      g.beginPath(); g.arc(64, 28, 26, 0, 7); g.fill();
      g.lineWidth = 4; g.strokeStyle = '#' + cols[e.camp].getHexString(); g.stroke();
      g.font = '30px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(e.fuite ? '🏳️' : Ue.ico, 64, 30);
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(24, 60, 80, 9);
      g.fillStyle = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#fbbf24' : '#ef4444';
      g.fillRect(25, 61, 78 * hp, 7);
      inf.tex.needsUpdate = true;
    }

    // ---------- Effets : flèches, balles, boulets, fumée, marqueurs ----------
    var MAXF = 900;
    var flechesG = new T.BufferGeometry();
    flechesG.setAttribute('position', new T.BufferAttribute(new Float32Array(MAXF * 6), 3));
    var fleches = new T.LineSegments(flechesG, new T.LineBasicMaterial({ color: 0x2a2014 }));
    fleches.frustumCulled = false; scene.add(fleches);
    var ballesG = new T.BufferGeometry();
    ballesG.setAttribute('position', new T.BufferAttribute(new Float32Array(MAXF * 6), 3));
    var balles = new T.LineSegments(ballesG, new T.LineBasicMaterial({ color: 0xfff3a0 }));
    balles.frustumCulled = false; scene.add(balles);
    var boulets = inst(new T.SphereGeometry(0.9, 8, 6), new T.MeshLambertMaterial({ color: 0x111111 }), 60);
    var fumeeTex = texture(64, 64, function (g) {
      var d = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      d.addColorStop(0, 'rgba(235,235,235,.9)'); d.addColorStop(1, 'rgba(235,235,235,0)');
      g.fillStyle = d; g.fillRect(0, 0, 64, 64);
    });
    var fumees = [];
    for (i = 0; i < 70; i++) {
      var f = new T.Sprite(new T.SpriteMaterial({ map: fumeeTex, transparent: true, depthWrite: false, opacity: 0 }));
      f.visible = false; scene.add(f); fumees.push({ s: f, vie: 0 });
    }
    var iFumee = 0;
    function fumee(x, y, z, taille, gris) {
      var f = fumees[iFumee++ % fumees.length];
      f.vie = 1; f.taille = taille; f.s.position.set(x, y, z); f.s.visible = true;
      f.s.material.color.setScalar(gris || 1);
    }
    var anneau = new T.Mesh(new T.RingGeometry(15, 17.5, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    anneau.rotation.x = -Math.PI / 2; anneau.position.y = 0.3; anneau.visible = false; scene.add(anneau);
    var marques = [];
    for (i = 0; i < 4; i++) {
      var mq = new T.Mesh(new T.RingGeometry(4, 5.5, 32), new T.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, depthWrite: false }));
      mq.rotation.x = -Math.PI / 2; mq.position.y = 0.35; mq.visible = false; scene.add(mq);
      marques.push({ m: mq, vie: 0 });
    }
    var iMarque = 0;
    var lignesOrdre = [];
    B.esc.forEach(function (e) {
      if (e.camp !== 0) return;
      var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
      var ln = new T.Line(lg, new T.LineDashedMaterial({ color: 0xfbbf24, dashSize: 4, gapSize: 3, transparent: true, opacity: 0.85 }));
      ln.visible = false; ln.frustumCulled = false; scene.add(ln);
      lignesOrdre.push({ e: e, l: ln });
    });

    // ---------- Caméra : tourner au doigt, pincer pour zoomer ----------
    var cam = { yaw: 0, pitch: 0.68, dist: 290, cible: new T.Vector3(0, 0, 70) };
    var intro = 1;
    function placerCamera() {
      var k = intro > 0 ? 1 - Math.pow(1 - intro, 0) : 0;
      var p = cam.pitch + intro * 0.55, d = cam.dist + intro * 380, yaw = cam.yaw + intro * 0.9;
      camera.position.set(cam.cible.x + Math.sin(yaw) * Math.cos(p) * d, cam.cible.y + Math.sin(p) * d, cam.cible.z + Math.cos(yaw) * Math.cos(p) * d);
      camera.lookAt(cam.cible);
      return k;
    }
    var doigts = {}, geste = null, el = rendu.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', function (ev) {
      doigts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(doigts);
      if (ids.length === 1) geste = { type: 'tap', x0: ev.clientX, y0: ev.clientY, lx: ev.clientX, ly: ev.clientY, t: performance.now() };
      else if (ids.length === 2) {
        var a = doigts[ids[0]], b = doigts[ids[1]];
        geste = { type: 'pince', d0: Math.hypot(a.x - b.x, a.y - b.y), dist0: cam.dist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      }
      try { el.setPointerCapture(ev.pointerId); } catch (er) {}
    });
    el.addEventListener('pointermove', function (ev) {
      if (!doigts[ev.pointerId] || !geste) return;
      doigts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(doigts);
      if (geste.type !== 'pince' && ids.length === 1) {
        if (geste.type === 'tap' && Math.hypot(ev.clientX - geste.x0, ev.clientY - geste.y0) > 9) geste.type = 'tourne';
        if (geste.type === 'tourne') {
          cam.yaw -= (ev.clientX - geste.lx) * 0.006;
          cam.pitch = Math.max(0.22, Math.min(1.4, cam.pitch + (ev.clientY - geste.ly) * 0.004));
          geste.lx = ev.clientX; geste.ly = ev.clientY;
        }
      } else if (geste.type === 'pince' && ids.length >= 2) {
        var a = doigts[ids[0]], b = doigts[ids[1]];
        cam.dist = Math.max(70, Math.min(650, geste.dist0 * geste.d0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y))));
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = mx - geste.mx, dy = my - geste.my;
        geste.mx = mx; geste.my = my;
        var k = cam.dist / 500;
        cam.cible.x -= (Math.cos(cam.yaw) * dx + Math.sin(cam.yaw) * dy) * k;
        cam.cible.z -= (-Math.sin(cam.yaw) * dx + Math.cos(cam.yaw) * dy) * k;
        cam.cible.x = Math.max(-220, Math.min(220, cam.cible.x));
        cam.cible.z = Math.max(-300, Math.min(300, cam.cible.z));
      }
    });
    function fin(ev) {
      var g = geste;
      delete doigts[ev.pointerId];
      if (!Object.keys(doigts).length) {
        if (g && g.type === 'tap' && ev.type === 'pointerup' && opts.onTap) {
          var p = versChamp(ev.clientX, ev.clientY);
          if (p) opts.onTap(p.x, p.y);
        }
        geste = null;
      } else if (g && g.type === 'pince') geste = { type: 'fini' };
    }
    el.addEventListener('pointerup', fin);
    el.addEventListener('pointercancel', fin);
    el.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      cam.dist = Math.max(70, Math.min(650, cam.dist * (ev.deltaY > 0 ? 1.12 : 0.89)));
    }, { passive: false });

    var rayon = new T.Raycaster(), plan = new T.Plane(new T.Vector3(0, 1, 0), 0), souris = new T.Vector2(), pt = new T.Vector3();
    function versChamp(cx, cy) {
      var r = el.getBoundingClientRect();
      souris.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      rayon.setFromCamera(souris, camera);
      if (!rayon.ray.intersectPlane(plan, pt)) return null;
      return { x: pt.x + L / 2, y: pt.z + H / 2 };
    }

    function taille() {
      var w = conteneur.clientWidth, h = conteneur.clientHeight;
      rendu.setSize(w, h, false);
      rendu.domElement.style.width = w + 'px'; rendu.domElement.style.height = h + 'px';
      camera.aspect = w / Math.max(1, h);
      camera.fov = camera.aspect < 0.8 ? 58 : 45;
      camera.updateProjectionMatrix();
    }
    taille();

    // ---------- Mise à jour à chaque image ----------
    var temps = 0;
    function ennemiPour(e) { return e.cible != null ? B.esc[e.cible] : null; }

    function maj(Bn, dt, selection) {
      B = Bn; temps += dt;
      if (intro > 0) intro = Math.max(0, intro - dt / 2.4);
      var ease = intro * intro * (3 - 2 * intro);
      var sauve = intro; intro = ease; placerCamera(); intro = sauve;
      var iC = 0, iCh = 0, iCa = 0, iF = 0, iBa = 0, iBo = 0;
      var fa = flechesG.attributes.position.array, ba = ballesG.attributes.position.array;

      infos.forEach(function (inf) {
        var e = inf.e, Ue = U[e.t], vivant = e.hp > 0 && !e.sorti;
        var n = vivant ? Math.ceil(e.hp / Ue.pv) : 0;
        var cav = Ue.cat === 'cav', art = Ue.cat === 'art';
        var nc = cav ? 6 : art ? 3 : 8, pas = cav ? 4.6 : art ? 9 : 3.2;
        // Direction : vers la cible, sinon vers l'ennemi, ou vers l'arrière en fuite.
        var c = ennemiPour(e), dirX, dirZ;
        if (e.fuite) { dirX = 0; dirZ = e.camp === 0 ? 1 : -1; }
        else if (c && c.hp > 0) { dirX = c.x - e.x; dirZ = c.y - e.y; }
        else { dirX = 0; dirZ = e.camp === 0 ? -1 : 1; }
        var cible = Math.atan2(dirX, dirZ), da = cible - inf.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        inf.angle += da * Math.min(1, dt * 4);
        var fx = Math.sin(inf.angle), fz = Math.cos(inf.angle), rx = fz, rz = -fx;
        var vit = Math.hypot(e.x - inf.px, e.y - inf.py) / Math.max(dt, 0.001);
        inf.px = e.x; inf.py = e.y;
        inf.bouge += ((vit > 3 ? 1 : 0) - inf.bouge) * Math.min(1, dt * 5);
        var combat = c && c.hp > 0 && Math.hypot(c.x - e.x, c.y - e.y) < 24;
        var cx = X(e.x), cz = Z(e.y), rangs = Math.ceil(Math.max(n, 1) / nc);
        // Morts : quand le nombre d'hommes baisse, on laisse des corps au sol.
        if (n < inf.vus) {
          for (var d = n; d < inf.vus && nbMorts < 1600; d++) {
            var col0 = d % nc, rg0 = Math.floor(d / nc);
            var mx = cx + rx * (col0 - (nc - 1) / 2) * pas - fx * (rg0 - (rangs - 1) / 2) * pas;
            var mz = cz + rz * (col0 - (nc - 1) / 2) * pas - fz * (rg0 - (rangs - 1) / 2) * pas;
            e3.set(0, hash(nbMorts) * 6, 0); q.setFromEuler(e3);
            m4.compose(v3.set(mx + (hash(d) - 0.5) * 2, 0.25, mz + (hash(d * 3) - 0.5) * 2), q, s3.set(1, 1, cav ? 1.5 : 1));
            morts.setMatrixAt(nbMorts, m4);
            colTmp.copy(cols[e.camp]).multiplyScalar(0.55);
            morts.setColorAt(nbMorts, colTmp);
            nbMorts++;
          }
          morts.count = nbMorts; morts.instanceMatrix.needsUpdate = true;
          if (morts.instanceColor) morts.instanceColor.needsUpdate = true;
        }
        inf.vus = n;
        var visible = vivant;
        inf.drapeau.visible = visible; inf.sprite.visible = visible;
        if (!visible) return;
        var alpha = e.fuite ? 0.6 : 1;
        for (var h = 0; h < n; h++) {
          var col = h % nc, rg = Math.floor(h / nc);
          var jx = (hash(h * 7 + e.id * 31) - 0.5) * pas * 0.35, jz = (hash(h * 11 + e.id * 17) - 0.5) * pas * 0.35;
          var ox = (col - (nc - 1) / 2) * pas + jx, oz = -(rg - (rangs - 1) / 2) * pas + jz;
          var x = cx + rx * ox + fx * oz, z = cz + rz * ox + fz * oz;
          var ph = temps * 9 + h * 1.7;
          var saut = inf.bouge * Math.abs(Math.sin(ph)) * (cav ? 0.6 : 0.35);
          var poussee = combat && rg === 0 ? Math.sin(temps * 12 + h) * 0.6 : 0;
          x += fx * poussee; z += fz * poussee;
          q.setFromEuler(e3.set(0, inf.angle + (e.fuite ? Math.PI : 0), 0));
          if (art) {
            if (h % 4 === 0 && iCa < nbCanons) {
              var cnx = cx + rx * ((h / 4) - 1) * pas, cnz = cz + rz * ((h / 4) - 1) * pas;
              m4.compose(v3.set(cnx, 0, cnz), q, s3.set(1, 1, 1));
              futs.setMatrixAt(iCa, m4); affuts.setMatrixAt(iCa, m4);
              m4.compose(v3.set(cnx + rx * 1.3, 0, cnz + rz * 1.3), q, s3); roues.setMatrixAt(iCa * 2, m4);
              m4.compose(v3.set(cnx - rx * 1.3, 0, cnz - rz * 1.3), q, s3); roues.setMatrixAt(iCa * 2 + 1, m4);
              iCa++;
            }
            x -= fx * 4; z -= fz * 4;
          }
          if (cav) {
            m4.compose(v3.set(x, saut, z), q, s3.set(1, 1, 1));
            chevaux.setMatrixAt(iCh, m4); jambes.setMatrixAt(iCh, m4); cous.setMatrixAt(iCh, m4);
            colTmp.setHex(robes[(h + e.id) % robes.length]);
            chevaux.setColorAt(iCh, colTmp); cous.setColorAt(iCh, colTmp);
            iCh++;
            m4.compose(v3.set(x, 2.3 + saut, z), q, s3.set(0.9, 0.85, 0.9));
          } else {
            m4.compose(v3.set(x, saut, z), q, s3.set(1, 1, 1));
          }
          corps.setMatrixAt(iC, m4); tetes.setMatrixAt(iC, m4);
          colTmp.copy(cols[e.camp]).multiplyScalar(alpha * (0.85 + hash(h + e.id) * 0.25));
          corps.setColorAt(iC, colTmp);
          // Arme : longue pique, lance, épée, arme à feu…
          var lon = Ue.cat === 'pique' ? (e.t === 'piquier' ? 7.5 : 4.5) : cav ? 3.8 : Ue.portee ? 2.2 : 2.2;
          var incl = Ue.cat === 'pique' ? (combat || inf.bouge > 0.5 ? 1.25 : 0.15) : cav ? (combat ? 1.3 : 0.4) : Ue.portee ? 1.0 : (combat ? 0.5 + Math.abs(Math.sin(ph)) * 1.2 : 0.3);
          q.setFromEuler(e3.set(incl, inf.angle, 0, 'YXZ'));
          var hautMain = cav ? 3.9 : 1.6;
          m4.compose(v3.set(x + rx * 0.7, hautMain + saut, z + rz * 0.7), q, s3.set(1, lon, 1));
          armes.setMatrixAt(iC, m4);
          iC++;
        }
        // Drapeau à l'arrière de l'unité, étiquette au-dessus.
        var arr = (rangs / 2 + 0.8) * pas;
        inf.drapeau.position.set(cx - fx * arr, 0, cz - fz * arr);
        inf.drapeau.rotation.y = inf.angle - Math.PI / 2;
        inf.flag.rotation.y = Math.sin(temps * 3 + e.id) * 0.25;
        inf.sprite.position.set(cx, (cav ? 13 : 10) + 2, cz);
        inf.sprite.material.opacity = e.fuite ? 0.6 : 1;
        etiquette(inf, selection === e.id);

        // Tirs
        if (Ue.portee && !e.fuite) {
          var tx = null, tz = null, cibleMur = false;
          if (Ue.antiMur && B.mur && B.mur.camp !== e.camp && !B.mur.segs.some(function (s) { return s.hp <= 0; })) {
            var sg = B.mur.segs.filter(function (s) { return s.hp > 0; })[0];
            if (sg && Math.abs(B.mur.y - e.y) <= Ue.portee) { tx = X((sg.x0 + sg.x1) / 2); tz = Z(B.mur.y); cibleMur = true; }
          } else if (c && c.hp > 0 && Math.hypot(c.x - e.x, c.y - e.y) <= Ue.portee && Math.hypot(c.x - e.x, c.y - e.y) > 22) {
            tx = X(c.x); tz = Z(c.y);
          }
          if (tx != null) {
            var poudre = Ue.perce && e.t !== 'arbal';
            if (Ue.antiMur) {
              for (var b = 0; b < 3 && iBo < 60; b++) {
                var pp = (temps * 0.7 + b / 3 + e.id * 0.13) % 1;
                var bx = cx + (tx - cx) * pp, bz = cz + (tz - cz) * pp, by = 3 + Math.sin(pp * Math.PI) * 40;
                m4.compose(v3.set(bx, by, bz), q.identity(), s3.set(1, 1, 1)); boulets.setMatrixAt(iBo++, m4);
                if (pp < dt * 0.7 * 1.2) fumee(cx + fx * 6 + (b - 1) * pas * rx, 3, cz + fz * 6 + (b - 1) * pas * rz, 14, 0.85);
                if (pp > 1 - dt * 0.8) fumee(tx + (hash(temps) - 0.5) * 10, cibleMur ? 10 : 2, tz, 18, 0.7);
              }
            } else {
              var nbt = Math.min(Math.ceil(n / 3), 14);
              for (var a = 0; a < nbt; a++) {
                var p2 = (temps * (poudre ? 2.2 : 0.9) + hash(a + e.id * 9)) % 1;
                var ox2 = (hash(a * 5 + e.id) - 0.5) * 22, oz2 = (hash(a * 9 + e.id) - 0.5) * 14;
                var sx = cx + (hash(a) - 0.5) * 20, sz = cz + (hash(a * 2) - 0.5) * 8;
                var ex = tx + ox2, ez = tz + oz2, dd = Math.hypot(ex - sx, ez - sz);
                var hy = poudre ? 0 : Math.sin(p2 * Math.PI) * dd * 0.28;
                var hy2 = poudre ? 0 : Math.sin(Math.min(1, p2 + 0.03) * Math.PI) * dd * 0.28;
                var x1 = sx + (ex - sx) * p2, z1 = sz + (ez - sz) * p2, y1 = 2.5 + hy;
                var p3 = Math.min(1, p2 + (poudre ? 0.06 : 0.03));
                var x2 = sx + (ex - sx) * p3, z2 = sz + (ez - sz) * p3, y2 = 2.5 + hy2;
                var arr2 = poudre ? ba : fa, idx2 = poudre ? iBa++ : iF++;
                if (idx2 >= MAXF) continue;
                arr2.set([x1, y1, z1, x2, y2, z2], idx2 * 6);
                if (poudre && p2 < dt * 2.2 * 1.1 && a % 3 === 0) fumee(sx, 3, sz, 7, 0.95);
              }
            }
          }
        }
      });
      corps.count = tetes.count = armes.count = iC;
      chevaux.count = jambes.count = cous.count = iCh;
      futs.count = affuts.count = iCa; roues.count = iCa * 2;
      boulets.count = iBo;
      [corps, tetes, armes, chevaux, jambes, cous, futs, affuts, roues, boulets].forEach(function (im) {
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      });
      flechesG.setDrawRange(0, iF * 2); flechesG.attributes.position.needsUpdate = true;
      ballesG.setDrawRange(0, iBa * 2); ballesG.attributes.position.needsUpdate = true;

      murs.forEach(function (w) {
        var debout = w.seg.hp > 0;
        if (w.mesh.visible && !debout) { for (var k = 0; k < 5; k++) fumee(X((w.seg.x0 + w.seg.x1) / 2) + (k - 2) * 12, 8, Z(B.mur.y), 30, 0.75); }
        w.mesh.visible = debout; w.gravats.visible = !debout;
        if (debout) w.mesh.position.x = X((w.seg.x0 + w.seg.x1) / 2) + (w.seg.hp < w.seg.hpMax * 0.4 ? Math.sin(temps * 40) * 0.15 : 0);
      });
      fumees.forEach(function (f) {
        if (f.vie <= 0) { f.s.visible = false; return; }
        f.vie -= dt * 0.6;
        var t2 = 1 - f.vie;
        f.s.scale.setScalar(f.taille * (0.5 + t2 * 1.6));
        f.s.position.y += dt * 6;
        f.s.material.opacity = Math.max(0, f.vie) * 0.7;
      });
      // Sélection et ordres
      var sel = selection != null ? B.esc[selection] : null;
      anneau.visible = !!(sel && sel.hp > 0 && !sel.fuite);
      if (anneau.visible) { anneau.position.x = X(sel.x); anneau.position.z = Z(sel.y); anneau.material.opacity = 0.6 + Math.sin(temps * 6) * 0.3; }
      lignesOrdre.forEach(function (lo) {
        var e = lo.e, o = e.ordre, tx2 = null, ty2 = null;
        if (e.hp > 0 && !e.fuite && o) {
          if (o.cible != null && B.esc[o.cible].hp > 0) { tx2 = B.esc[o.cible].x; ty2 = B.esc[o.cible].y; lo.l.material.color.setHex(0xef4444); }
          else if (o.x != null) { tx2 = o.x; ty2 = o.y; lo.l.material.color.setHex(0xfbbf24); }
        }
        lo.l.visible = tx2 != null;
        if (!lo.l.visible) return;
        lo.l.geometry.attributes.position.array.set([X(e.x), 1, Z(e.y), X(tx2), 1, Z(ty2)]);
        lo.l.geometry.attributes.position.needsUpdate = true;
        lo.l.computeLineDistances();
      });
      marques.forEach(function (mk) {
        if (mk.vie <= 0) { mk.m.visible = false; return; }
        mk.vie -= dt * 1.6;
        mk.m.scale.setScalar(1 + (1 - mk.vie) * 2.5);
        mk.m.material.opacity = Math.max(0, mk.vie);
      });
      rendu.render(scene, camera);
    }

    function marquer(x, y, couleur) {
      var mk = marques[iMarque++ % marques.length];
      mk.vie = 1; mk.m.visible = true; mk.m.position.x = X(x); mk.m.position.z = Z(y);
      mk.m.material.color.set(couleur);
    }

    function detruire() {
      rendu.dispose();
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      });
      if (rendu.domElement.parentNode) rendu.domElement.parentNode.removeChild(rendu.domElement);
      try { rendu.forceContextLoss(); } catch (e) {}
    }

    return { maj: maj, taille: taille, detruire: detruire, marquer: marquer, versChamp: versChamp,
      recentrer: function () { cam.yaw = 0; cam.pitch = 0.68; cam.dist = 290; cam.cible.set(0, 0, 70); } };
  }

  root.Bataille3D = { dispo: dispo, creer: function (c, B, o) { T = root.THREE; return creer(c, B, o); } };
})(this);
