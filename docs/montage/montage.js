/* Naufragés Studio : logiciel de montage vidéo dans le navigateur.
   Inspiré de Premiere Pro (pistes V1/V2/A1, outil Lame, moniteur avec poignées, options d'effet),
   Vegas Pro (fondu enchaîné en faisant chevaucher deux clips, poignées de fondu dans les coins),
   DaVinci Resolve (inspecteur, aimant) et CapCut (modèles de textes, sous-titres, formats Shorts).
   Tout reste sur l'ordinateur de l'utilisateur : rien n'est envoyé sur internet.
   Projets et médias : IndexedDB « naufrages-studio ». Dernier projet ouvert : localStorage « studio-dernier ».
   Export MP4 : WebCodecs (H.264 + AAC) + mp4-muxer (vendor/), sinon enregistrement en temps réel. */
(function () {
'use strict';

// ---------- Outils ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const copie = o => JSON.parse(JSON.stringify(o));
const pair = n => Math.max(2, Math.round(n / 2) * 2);
const attendre = ms => new Promise(r => setTimeout(r, ms));
function h(tag, attrs, ...enfants) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'style') e.style.cssText = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
  }
  for (const c of enfants.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
function tc(t, fps) {
  fps = fps || (P ? P.fps : 30);
  t = Math.max(0, t);
  const f = Math.floor((t * fps + 1e-6) % fps), s = Math.floor(t) % 60, m = Math.floor(t / 60) % 60, hh = Math.floor(t / 3600);
  const d = n => String(n).padStart(2, '0');
  return d(hh) + ':' + d(m) + ':' + d(s) + ':' + d(f);
}
function court(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + (Number.isInteger(Math.round(s * 100) / 100) ? Math.round(s) : s.toFixed(1));
}
function toast(msg, ms) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms || 3200);
}
function ls(cle, val) {
  try { if (val === undefined) return localStorage.getItem(cle); localStorage.setItem(cle, val); } catch (e) { return null; }
}

// ---------- Base de données locale (IndexedDB) ----------
const DB = {
  db: null,
  ouvrir() {
    return new Promise(ok => {
      try {
        const r = indexedDB.open('naufrages-studio', 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          d.createObjectStore('projets', { keyPath: 'id' });
          d.createObjectStore('medias', { keyPath: 'id' }).createIndex('projet', 'projet');
        };
        r.onsuccess = () => { DB.db = r.result; ok(true); };
        r.onerror = () => ok(false);
        r.onblocked = () => ok(false);
      } catch (e) { ok(false); }
    });
  },
  req(store, mode, fn) {
    if (!DB.db) return Promise.resolve(null);
    return new Promise(ok => {
      try {
        const t = DB.db.transaction(store, mode);
        const r = fn(t.objectStore(store));
        t.oncomplete = () => ok(r ? r.result : null);
        t.onerror = t.onabort = () => ok(null);
      } catch (e) { ok(null); }
    });
  },
  mettre: (s, v) => DB.req(s, 'readwrite', o => o.put(v)),
  lire: (s, k) => DB.req(s, 'readonly', o => o.get(k)),
  tous: s => DB.req(s, 'readonly', o => o.getAll()),
  effacer: (s, k) => DB.req(s, 'readwrite', o => o.delete(k)),
  mediasDe: pid => DB.req('medias', 'readonly', o => o.index('projet').getAll(pid))
};

// ---------- Données ----------
const FORMATS = {
  '1920x1080': '16:9 YouTube', '1080x1920': '9:16 Shorts / TikTok', '1080x1080': '1:1 Carré',
  '1080x1350': '4:5 Instagram', '1280x720': '16:9 léger'
};
const TRANSITIONS = [
  ['aucune', 'Aucune'], ['fondu', 'Fondu'], ['noir', 'Fondu au noir'], ['blanc', 'Flash blanc'],
  ['glisse-g', 'Glissement ←'], ['glisse-d', 'Glissement →'], ['glisse-h', 'Glissement ↑'], ['glisse-b', 'Glissement ↓'],
  ['zoom', 'Zoom'], ['volet', 'Volet'], ['flou', 'Flou'], ['pop', 'Pop (rebond)'], ['machine', 'Machine à écrire (texte)']
];
const ANIMS = [
  ['aucune', 'Aucun'], ['zoom-avant', 'Zoom avant lent'], ['zoom-arriere', 'Zoom arrière lent'],
  ['pan-gauche', 'Panoramique ←'], ['pan-droite', 'Panoramique →'], ['pan-haut', 'Panoramique ↑'], ['pan-bas', 'Panoramique ↓']
];
const FILTRES0 = { lum: 100, con: 100, sat: 100, nb: 0, sep: 0, teinte: 0, flou: 0 };
const LOOKS = {
  'Aucun': {}, 'Cinéma': { con: 115, sat: 85, lum: 96 }, 'Noir et blanc': { nb: 100, con: 112 },
  'Sépia': { sep: 85, con: 105 }, 'Vintage': { sep: 35, con: 90, sat: 80, lum: 106 }, 'Chaud': { sep: 25, sat: 120, lum: 103 },
  'Éclatant': { sat: 140, con: 110 }, 'Sombre': { lum: 78, con: 122 }, 'Délavé': { sat: 60, con: 85, lum: 110 }, 'Rêve': { flou: 2, lum: 110, sat: 115 }
};
const POLICES = ['Bricolage', 'Atkinson', 'Cinzel', 'Cormorant', 'Orbitron', 'Rajdhani', 'Pixelify', 'Impact', 'Arial', 'Georgia', 'Segoe UI', 'Comic Sans MS', 'Courier New'];
const TEXTE0 = { txt: 'Ton texte', police: 'Bricolage', taille: 90, coul: '#ffffff', gras: true, align: 'center', contour: '#000000', ep: 0, ombre: true, fond: false, fondCoul: '#000000', fondOp: 0.6, largeur: 0.9, inter: 1.15, maj: false };
// Modèles de textes (comme les « Graphiques essentiels » de Premiere ou les styles de CapCut). y en fraction de la hauteur.
const MODELES = [
  { nom: 'Grand titre', y: 0, t: { txt: 'GRAND TITRE', police: 'Cinzel', taille: 130, ombre: true } },
  { nom: 'Titre YouTube choc', y: 0, t: { txt: 'INCROYABLE !', police: 'Impact', taille: 150, coul: '#ffe94a', ep: 12, maj: true } },
  { nom: 'Sous-titre classique', y: 0.38, t: { txt: 'Le sous-titre de ta vidéo', police: 'Atkinson', taille: 58, fond: true, fondOp: 0.6, ombre: false } },
  { nom: 'Sous-titre Shorts', y: 0.18, t: { txt: 'Texte Shorts', police: 'Bricolage', taille: 88, ep: 9, maj: true } },
  { nom: 'Bandeau (nom, lieu)', y: 0.34, x: -0.22, t: { txt: 'Napoléon Bonaparte', police: 'Rajdhani', taille: 60, align: 'left', fond: true, fondCoul: '#7c5cff', fondOp: 0.92, ombre: false, largeur: 0.5 } },
  { nom: 'Date historique', y: -0.36, t: { txt: '2 décembre 1805', police: 'Cinzel', taille: 64, coul: '#f3e2b3', fond: true, fondOp: 0.5 } },
  { nom: 'Gaming néon', y: 0, t: { txt: 'GAME OVER', police: 'Orbitron', taille: 120, coul: '#2fd3c6', ep: 4, contour: '#ff5c8a' } },
  { nom: 'Rétro pixel', y: 0, t: { txt: 'NIVEAU 1', police: 'Pixelify', taille: 110, coul: '#ffc94a', ep: 6 } },
  { nom: 'Élégant', y: 0, t: { txt: 'Il était une fois…', police: 'Cormorant', taille: 110, gras: false, ombre: true } },
  { nom: 'Abonne-toi !', y: 0.3, t: { txt: '🔔 Abonne-toi !', police: 'Bricolage', taille: 80, fond: true, fondCoul: '#e03131', fondOp: 1, ombre: false } }
];

let P = null;                 // projet ouvert
const MEDIA = new Map();      // id -> média chargé
let selId = null;             // clip sélectionné
let T = 0;                    // tête de lecture (s)
let lecture = false;
let pxs = 60;                 // pixels par seconde dans la timeline
let outil = 'selection';
let aimant = true;
let pressePapier = null;
let CROIS = new Map();
let BBOX = null;              // cadre du clip sélectionné dans l'aperçu

function nouveauProjet(nom, w, hgt) {
  return {
    id: uid(), nom: nom || 'Mon montage', w: w || 1920, h: hgt || 1080, fps: 30, fond: '#000000',
    cree: Date.now(), modifie: Date.now(),
    pistes: [
      { id: uid(), type: 'v' }, { id: uid(), type: 'v' },
      { id: uid(), type: 'a' }, { id: uid(), type: 'a' }
    ],
    clips: [], reperes: []
  };
}
function nouveauClip(kind, piste, start, dur, extra) {
  return Object.assign({
    id: uid(), kind, piste, start, dur, src: 0, media: null, vitesse: 1, volume: 1,
    x: 0, y: 0, echelle: 1, rot: 0, opacite: 1, cadrage: 'contenir', filtres: copie(FILTRES0),
    anim: 'aucune', tin: { t: 'aucune', d: 0.5 }, tout: { t: 'aucune', d: 0.5 }, texte: null, couleur: '#1d1d26'
  }, extra || {});
}
const piste = id => P.pistes.find(p => p.id === id);
const clip = id => P.clips.find(c => c.id === id);
const typePiste = kind => kind === 'audio' ? 'a' : 'v';
const fin = c => c.start + c.dur;
const actif = (c, t) => t >= c.start - 1e-9 && t < fin(c) - 1e-9;
const tSource = (c, t) => c.src + (t - c.start) * c.vitesse;
function duree() { let d = 0; for (const c of P.clips) d = Math.max(d, fin(c)); return d; }
function nomPiste(p) {
  const meme = P.pistes.filter(q => q.type === p.type);
  const i = p.type === 'v' ? meme.length - meme.indexOf(p) : meme.indexOf(p) + 1;
  return (p.type === 'v' ? 'V' : 'A') + i;
}
function dureeMedia(c) { const m = MEDIA.get(c.media); return m && (m.type === 'video' || m.type === 'audio') ? m.duree : Infinity; }
function nomClip(c) {
  if (c.kind === 'text') return (c.texte && c.texte.txt || 'Texte').replace(/\s+/g, ' ');
  if (c.kind === 'color') return 'Fond de couleur';
  const m = MEDIA.get(c.media); return m ? m.nom : 'Média manquant';
}

// ---------- Historique (Annuler / Refaire) ----------
const HIST = { pile: [], refaire: [] };
function memo() {
  HIST.pile.push(JSON.stringify(P));
  if (HIST.pile.length > 150) HIST.pile.shift();
  HIST.refaire = [];
}
function annuler() {
  if (!HIST.pile.length) return toast('Rien à annuler');
  HIST.refaire.push(JSON.stringify(P)); P = JSON.parse(HIST.pile.pop()); apres(true);
}
function refaire() {
  if (!HIST.refaire.length) return toast('Rien à refaire');
  HIST.pile.push(JSON.stringify(P)); P = JSON.parse(HIST.refaire.pop()); apres(true);
}
// À appeler après chaque modification du projet.
function apres(inspecteur) {
  if (selId && !clip(selId)) selId = null;
  calculerCroisements();
  majTimeline();
  if (inspecteur !== false) majInspecteur();
  synchro(T); rendu();
  sauver();
}

// ---------- Sauvegarde automatique ----------
let minuteurSauv = 0;
function sauver() {
  $('#etat').textContent = 'Enregistrement…';
  clearTimeout(minuteurSauv);
  minuteurSauv = setTimeout(async () => {
    P.modifie = Date.now();
    const ok = await DB.mettre('projets', P);
    $('#etat').textContent = DB.db && ok !== null ? '✓ Enregistré sur cet ordinateur' : '⚠ Pas d\'enregistrement (navigation privée ?)';
  }, 500);
}

// ---------- Médias ----------
function typeFichier(f) {
  const t = f.type || '';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('audio/')) return 'audio';
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (['mp4', 'webm', 'mov', 'mkv', 'm4v', 'ogv'].includes(ext)) return 'video';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba'].includes(ext)) return 'audio';
  return null;
}
function evenement(el, nom, ms) {
  return new Promise((ok, ko) => {
    const fini = e => { el.removeEventListener(nom, fini); el.removeEventListener('error', rate); clearTimeout(t); ok(e); };
    const rate = () => { el.removeEventListener(nom, fini); el.removeEventListener('error', rate); clearTimeout(t); ko(new Error('lecture')); };
    const t = setTimeout(() => { el.removeEventListener(nom, fini); el.removeEventListener('error', rate); ko(new Error('délai')); }, ms || 15000);
    el.addEventListener(nom, fini); el.addEventListener('error', rate);
  });
}
function vignette(src, w, hgt) {
  const c = document.createElement('canvas'); const r = w / hgt; c.width = 160; c.height = Math.round(160 / r) || 90;
  try { c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.7); } catch (e) { return ''; }
}
async function analyser(m) {
  m.url = URL.createObjectURL(m.blob);
  if (m.type === 'image') {
    const img = new Image(); img.src = m.url;
    await img.decode();
    m.img = img; m.w = img.naturalWidth || 1000; m.h = img.naturalHeight || 1000; m.duree = Infinity;
    m.vign = vignette(img, m.w, m.h);
  } else if (m.type === 'video') {
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = m.url;
    await evenement(v, 'loadeddata');
    m.duree = v.duration; m.w = v.videoWidth; m.h = v.videoHeight;
    if (!isFinite(m.duree)) { v.currentTime = 1e7; await evenement(v, 'seeked').catch(() => {}); m.duree = v.currentTime || 10; }
    v.currentTime = Math.min(1, m.duree / 3); await evenement(v, 'seeked').catch(() => {});
    m.vign = vignette(v, m.w, m.h);
    v.removeAttribute('src'); v.load();
  } else {
    const a = document.createElement('audio'); a.preload = 'metadata'; a.src = m.url;
    await evenement(a, 'loadedmetadata');
    m.duree = isFinite(a.duration) ? a.duration : 60;
  }
  if (m.type !== 'image') calculerOnde(m);
}
// Forme d'onde : 100 valeurs par seconde (sert aussi aux sous-titres automatiques).
async function decoderAudio(m) {
  try {
    const buf = await m.blob.arrayBuffer();
    return await new OfflineAudioContext(2, 1, 48000).decodeAudioData(buf);
  } catch (e) { return null; }
}
async function calculerOnde(m) {
  const b = await decoderAudio(m);
  if (!b) { m.sansSon = m.type === 'video'; m.pics = null; return; }
  const n = Math.ceil(b.duration * 100), pas = b.sampleRate / 100, pics = new Float32Array(n);
  const ch = [b.getChannelData(0), b.numberOfChannels > 1 ? b.getChannelData(1) : null];
  for (let i = 0; i < n; i++) {
    let mx = 0; const a = Math.floor(i * pas), z = Math.min(b.length, Math.floor((i + 1) * pas));
    for (let j = a; j < z; j += 4) { const v = Math.abs(ch[0][j]); if (v > mx) mx = v; if (ch[1]) { const w = Math.abs(ch[1][j]); if (w > mx) mx = w; } }
    pics[i] = mx;
  }
  let mx = 0; for (let i = 0; i < n; i++) if (pics[i] > mx) mx = pics[i];
  m.pics = pics; m.picMax = mx || 1; m.sansSon = false;
  majTimeline();
}
async function importer(fichiers, placer) {
  const liste = Array.from(fichiers || []);
  const ajoutes = [];
  for (const f of liste) {
    const type = typeFichier(f);
    if (!type) { toast('« ' + f.name + ' » : ce type de fichier n\'est pas pris en charge.'); continue; }
    const m = { id: uid(), projet: P.id, nom: f.name, type, blob: f, ajoute: Date.now() };
    $('#etat').textContent = 'Import de ' + f.name + '…';
    try { await analyser(m); }
    catch (e) {
      toast('« ' + f.name + ' » ne peut pas être lu par ton navigateur. Pour les vidéos, le MP4 (H.264) marche partout.', 6000);
      continue;
    }
    MEDIA.set(m.id, m); ajoutes.push(m);
    await DB.mettre('medias', { id: m.id, projet: m.projet, nom: m.nom, type: m.type, blob: m.blob, ajoute: m.ajoute });
  }
  afficherMedias(); sauver();
  if (ajoutes.length) toast(ajoutes.length + (ajoutes.length > 1 ? ' fichiers importés' : ' fichier importé') + (placer ? '' : ' : glisse-les dans la timeline ou clique sur +'));
  if (placer) {
    memo(); let t = placer.t;
    for (const m of ajoutes) { const c = creerClipMedia(m, placer.piste, t); if (c) t = fin(c); }
    apres();
  }
  return ajoutes;
}
function afficherMedias() {
  const box = $('#medias'); box.innerHTML = '';
  const liste = Array.from(MEDIA.values()).sort((a, b) => a.ajoute - b.ajoute);
  for (const m of liste) {
    const ico = { video: '🎬', image: '🖼', audio: '🎵' }[m.type];
    const v = h('div', { class: 'vign', style: m.vign ? 'background-image:url(' + m.vign + ')' : '' }, m.vign ? '' : ico);
    const el = h('div', { class: 'media', draggable: 'true', title: m.nom + ' : glisse-le dans la timeline' },
      v,
      m.type !== 'image' ? h('span', { class: 'dur' }, court(m.duree)) : h('span', { class: 'dur' }, 'photo'),
      h('button', { class: 'plus', title: 'Ajouter au bout du montage', onclick: e => { e.stopPropagation(); ajouterAuBout(m); } }, '+'),
      h('button', { class: 'moins', title: 'Retirer de la bibliothèque', onclick: e => { e.stopPropagation(); retirerMedia(m); } }, '✕'),
      h('div', { class: 'nom' }, ico + ' ' + m.nom));
    el.addEventListener('dragstart', e => { e.dataTransfer.setData('application/x-studio-media', m.id); e.dataTransfer.effectAllowed = 'copy'; });
    el.addEventListener('dblclick', () => ajouterAuBout(m));
    box.append(el);
  }
}
async function retirerMedia(m) {
  const n = P.clips.filter(c => c.media === m.id).length;
  if (n && !confirm('Ce média est utilisé ' + n + ' fois dans le montage. Le retirer quand même (les clips seront supprimés) ?')) return;
  memo();
  P.clips = P.clips.filter(c => c.media !== m.id);
  MEDIA.delete(m.id); URL.revokeObjectURL(m.url);
  await DB.effacer('medias', m.id);
  afficherMedias(); apres();
}
function creerClipMedia(m, pisteId, t) {
  let p = pisteId && piste(pisteId);
  const voulu = m.type === 'audio' ? 'a' : 'v';
  if (!p || p.type !== voulu) p = voulu === 'v' ? P.pistes.filter(q => q.type === 'v').pop() : P.pistes.find(q => q.type === 'a');
  if (!p) { p = { id: uid(), type: voulu }; P.pistes.push(p); }
  const d = m.type === 'image' ? 5 : m.duree;
  const c = nouveauClip(m.type, p.id, Math.max(0, t), d, { media: m.id });
  if (m.type === 'image' || m.type === 'video') c.cadrage = 'contenir';
  P.clips.push(c); selId = c.id;
  return c;
}
// Bouton + : met le média au bout de la piste principale (comme la piste principale de CapCut).
function ajouterAuBout(m) {
  memo();
  const voulu = m.type === 'audio' ? 'a' : 'v';
  const p = voulu === 'v' ? P.pistes.filter(q => q.type === 'v').pop() : P.pistes.find(q => q.type === 'a');
  let t = 0; for (const c of P.clips) if (c.piste === (p && p.id)) t = Math.max(t, fin(c));
  const c = creerClipMedia(m, p && p.id, t);
  apres(); voirTemps(c.start);
  toast('Ajouté à ' + nomPiste(piste(c.piste)) + ' à ' + court(c.start));
}

// ---------- Rendu de l'image ----------
function calculerCroisements() {
  CROIS = new Map();
  for (const p of P.pistes) {
    const cl = P.clips.filter(c => c.piste === p.id).sort((a, b) => a.start - b.start);
    for (const c of cl) {
      let xin = 0, xout = 0;
      for (const q of cl) {
        if (q === c) continue;
        if (q.start < c.start && fin(q) > c.start + 1e-6 && fin(q) < fin(c)) xin = Math.max(xin, fin(q) - c.start);
        if (q.start > c.start && q.start < fin(c) - 1e-6 && fin(q) > fin(c)) xout = Math.max(xout, fin(c) - q.start);
      }
      CROIS.set(c.id, { xin, xout });
    }
  }
}
function filtreCss(f, flouEnPlus, k) {
  const r = [];
  if (f.lum !== 100) r.push('brightness(' + f.lum + '%)');
  if (f.con !== 100) r.push('contrast(' + f.con + '%)');
  if (f.sat !== 100) r.push('saturate(' + f.sat + '%)');
  if (f.nb) r.push('grayscale(' + f.nb + '%)');
  if (f.sep) r.push('sepia(' + f.sep + '%)');
  if (f.teinte) r.push('hue-rotate(' + f.teinte + 'deg)');
  const fl = (f.flou + (flouEnPlus || 0)) * (k || 1);
  if (fl > 0.05) r.push('blur(' + fl.toFixed(1) + 'px)');
  return r.length ? r.join(' ') : 'none';
}
const sortie = p => 1 - Math.pow(1 - p, 3);
const rebond = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const policesChargees = new Set();
function police(t) {
  const f = (t.gras ? '700 ' : '400 ') + t.taille + 'px "' + t.police + '"';
  if (!policesChargees.has(f) && document.fonts) {
    policesChargees.add(f);
    document.fonts.load(f).then(() => rendu()).catch(() => {});
  }
  return f;
}
function lignesTexte(ctx, t, txt, largeurMax) {
  const lignes = [];
  for (const para of txt.split('\n')) {
    const mots = para.split(' '); let l = '';
    for (const m of mots) {
      const essai = l ? l + ' ' + m : m;
      if (l && ctx.measureText(essai).width > largeurMax) { lignes.push(l); l = m; } else l = essai;
    }
    lignes.push(l);
  }
  return lignes;
}
// Dessine le montage à l'instant t. source(clip) donne la vidéo ou l'image à dessiner.
function dessiner(ctx, t, Wsortie, Hsortie, source, avecCadre) {
  const W = P.w, H = P.h, k = Wsortie / W;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.fillStyle = P.fond; ctx.fillRect(0, 0, Wsortie, Hsortie);
  ctx.setTransform(k, 0, 0, Hsortie / H, 0, 0);
  if (avecCadre) BBOX = null;
  const vids = P.pistes.filter(p => p.type === 'v').reverse();
  for (const p of vids) {
    if (p.cache) continue;
    const cl = P.clips.filter(c => c.piste === p.id && actif(c, t)).sort((a, b) => a.start - b.start);
    for (const c of cl) dessinerClip(ctx, c, t, source, k, avecCadre);
  }
  ctx.restore();
}
function dessinerClip(ctx, c, t, source, k, avecCadre) {
  const W = P.w, H = P.h;
  let alpha = c.opacite, dx = 0, dy = 0, sc = 1, volet = null, flou = 0, voile = null, lettres = 1;
  const a = t - c.start, b = fin(c) - t;
  const X = CROIS.get(c.id);
  if (X && X.xin > 0 && a < X.xin) alpha *= clamp(a / X.xin, 0, 1);
  const trans = (tr, reste, entree) => {
    if (!tr || tr.t === 'aucune' || reste >= tr.d || tr.d <= 0) return;
    const p = clamp(reste / tr.d, 0, 1), e = sortie(p), sgn = entree ? 1 : -1;
    switch (tr.t) {
      case 'fondu': alpha *= p; break;
      case 'noir': voile = ['#000', Math.max(voile ? voile[1] : 0, 1 - p)]; break;
      case 'blanc': voile = ['#fff', Math.max(voile ? voile[1] : 0, 1 - p)]; break;
      case 'glisse-g': dx += sgn * (1 - e) * W; break;
      case 'glisse-d': dx -= sgn * (1 - e) * W; break;
      case 'glisse-h': dy += sgn * (1 - e) * H; break;
      case 'glisse-b': dy -= sgn * (1 - e) * H; break;
      case 'zoom': sc *= entree ? 0.6 + 0.4 * e : 1 + 0.5 * (1 - e); alpha *= p; break;
      case 'volet': volet = volet === null ? e : Math.min(volet, e); break;
      case 'flou': flou += (1 - p) * 30; alpha *= p; break;
      case 'pop': sc *= Math.max(0.01, rebond(p)); alpha *= Math.min(1, p * 3); break;
      case 'machine': if (entree) lettres = p; else alpha *= p; break;
    }
  };
  trans(c.tin, a, true); trans(c.tout, b, false);
  const q = clamp(a / c.dur, 0, 1);
  switch (c.anim) {
    case 'zoom-avant': sc *= 1 + 0.18 * q; break;
    case 'zoom-arriere': sc *= 1.18 - 0.18 * q; break;
    case 'pan-gauche': sc *= 1.14; dx += (0.5 - q) * 0.12 * W; break;
    case 'pan-droite': sc *= 1.14; dx -= (0.5 - q) * 0.12 * W; break;
    case 'pan-haut': sc *= 1.14; dy += (0.5 - q) * 0.12 * H; break;
    case 'pan-bas': sc *= 1.14; dy -= (0.5 - q) * 0.12 * H; break;
  }
  if (alpha <= 0.001 && !voile) return;
  ctx.save();
  if (volet !== null) { ctx.beginPath(); ctx.rect(0, 0, W * volet, H); ctx.clip(); }
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.filter = c.kind === 'text' ? (flou > 0.05 ? 'blur(' + (flou * k).toFixed(1) + 'px)' : 'none') : filtreCss(c.filtres, flou, k);
  const cx = W / 2 + c.x + dx, cy = H / 2 + c.y + dy;
  ctx.translate(cx, cy); ctx.rotate(c.rot * Math.PI / 180);
  let bw = 0, bh = 0;
  if (c.kind === 'video' || c.kind === 'image') {
    const s = source(c), m = MEDIA.get(c.media);
    if (s && m) {
      const sw = m.w || s.videoWidth || s.naturalWidth, sh = m.h || s.videoHeight || s.naturalHeight;
      const base = c.cadrage === 'remplir' ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
      const e = base * c.echelle * sc; bw = sw * e; bh = sh * e;
      try { ctx.drawImage(s, -bw / 2, -bh / 2, bw, bh); } catch (er) { /* image pas prête */ }
    }
  } else if (c.kind === 'color') {
    bw = W * c.echelle * sc; bh = H * c.echelle * sc;
    ctx.fillStyle = c.couleur; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  } else if (c.kind === 'text' && c.texte) {
    const tx = c.texte, e = c.echelle * sc;
    ctx.scale(e, e);
    ctx.font = police(tx); ctx.textBaseline = 'middle'; ctx.textAlign = tx.align;
    let texte = tx.maj ? tx.txt.toUpperCase() : tx.txt;
    const largeurMax = tx.largeur * W / Math.max(0.01, c.echelle);
    const lignes = lignesTexte(ctx, tx, texte, largeurMax);
    const lh = tx.taille * tx.inter;
    let maxw = 0; for (const l of lignes) maxw = Math.max(maxw, ctx.measureText(l).width);
    const total = lignes.length * lh, pad = tx.taille * 0.35;
    bw = (maxw + pad * 2) * e; bh = (total + pad * 1.2) * e;
    const xAncre = tx.align === 'left' ? -maxw / 2 : tx.align === 'right' ? maxw / 2 : 0;
    if (tx.fond) {
      ctx.save(); ctx.globalAlpha *= tx.fondOp; ctx.fillStyle = tx.fondCoul;
      const r = Math.min(18, pad);
      const rx = -maxw / 2 - pad, ry = -total / 2 - pad * 0.6, rw = maxw + pad * 2, rh = total + pad * 1.2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, r); else ctx.rect(rx, ry, rw, rh); ctx.fill(); ctx.restore();
    }
    let reste = lettres < 1 ? Math.floor(texte.replace(/\n/g, '').length * lettres) : Infinity;
    lignes.forEach((l, i) => {
      let s = l;
      if (reste !== Infinity) { s = l.slice(0, Math.max(0, reste)); reste -= l.length + 1; }
      if (!s) return;
      const y = -total / 2 + lh * (i + 0.5);
      if (tx.ombre) { ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = tx.taille * 0.18 * k; ctx.shadowOffsetY = tx.taille * 0.05 * k; }
      if (tx.ep > 0) {
        ctx.lineJoin = 'round'; ctx.miterLimit = 2; ctx.lineWidth = tx.ep * 2; ctx.strokeStyle = tx.contour;
        ctx.strokeText(s, xAncre, y);
        ctx.shadowColor = 'transparent';
      }
      ctx.fillStyle = tx.coul; ctx.fillText(s, xAncre, y);
      ctx.shadowColor = 'transparent';
    });
  }
  ctx.restore();
  if (voile) {
    ctx.save(); ctx.globalAlpha = voile[1]; ctx.fillStyle = voile[0]; ctx.filter = 'none'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (avecCadre && c.id === selId && bw) BBOX = { cx: W / 2 + c.x, cy: H / 2 + c.y, w: bw / sc, h: bh / sc, rot: c.rot };
}

// ---------- Aperçu (moniteur) ----------
const ecranCv = () => $('#apercu');
let actx = null, maitre = null;
const PREV = new Map(); // clipId -> { el, media, gain }
function audioCtx() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      maitre = actx.createGain(); maitre.connect(actx.destination);
    } catch (e) { return null; }
  }
  if (actx.state === 'suspended') actx.resume();
  PREV.forEach(brancher);
  return actx;
}
function brancher(e) {
  if (e.gain || !actx) return;
  try {
    const s = actx.createMediaElementSource(e.el);
    e.gain = actx.createGain(); e.gain.gain.value = 0; s.connect(e.gain); e.gain.connect(maitre);
  } catch (er) { /* déjà branché */ }
}
function elementApercu(c) {
  let e = PREV.get(c.id);
  if (e && e.media === c.media) return e;
  if (e) liberer(c.id);
  const m = MEDIA.get(c.media); if (!m) return null;
  const el = document.createElement(m.type === 'audio' ? 'audio' : 'video');
  el.preload = 'auto'; el.playsInline = true; el.src = m.url;
  if (!actx) el.muted = true;
  el.addEventListener('seeked', () => { if (!lecture) demanderRendu(); });
  el.addEventListener('loadeddata', () => { el.currentTime = clamp(tSource(c, T), 0, m.duree); demanderRendu(); });
  e = { el, media: c.media, gain: null };
  PREV.set(c.id, e);
  if (actx) { el.muted = false; brancher(e); }
  return e;
}
function liberer(id) {
  const e = PREV.get(id); if (!e) return;
  e.el.pause();
  try { if (e.gain) e.gain.disconnect(); } catch (er) {}
  e.el.removeAttribute('src'); e.el.load();
  PREV.delete(id);
}
function gainClip(c, t) {
  const p = piste(c.piste);
  if (!p || p.muet || (c.kind === 'video' && p.cache)) return 0;
  let g = c.volume;
  const a = t - c.start, b = fin(c) - t;
  if (c.tin.t !== 'aucune' && c.tin.d > 0 && a < c.tin.d) g *= clamp(a / c.tin.d, 0, 1);
  if (c.tout.t !== 'aucune' && c.tout.d > 0 && b < c.tout.d) g *= clamp(b / c.tout.d, 0, 1);
  const X = CROIS.get(c.id);
  if (X) { if (X.xin > 0 && a < X.xin) g *= clamp(a / X.xin, 0, 1); if (X.xout > 0 && b < X.xout) g *= clamp(b / X.xout, 0, 1); }
  return g;
}
function synchro(t) {
  if (!P) return;
  const vus = new Set();
  for (const c of P.clips) {
    if (c.kind !== 'video' && c.kind !== 'audio') continue;
    const m = MEDIA.get(c.media); if (!m) continue;
    const ici = actif(c, t), bientot = !ici && c.start > t && c.start - t < 2.5;
    let e = PREV.get(c.id);
    if (!ici && !bientot) { if (e) { if (Math.abs(t - fin(c)) > 6 && Math.abs(t - c.start) > 6) liberer(c.id); else if (!e.el.paused) e.el.pause(); } if (e) vus.add(c.id); continue; }
    e = elementApercu(c); if (!e) continue; vus.add(c.id);
    const el = e.el;
    if (bientot) { if (!el.paused) el.pause(); if (el.readyState >= 1 && Math.abs(el.currentTime - c.src) > 0.05) el.currentTime = c.src; if (e.gain) e.gain.gain.value = 0; continue; }
    const st = clamp(tSource(c, t), 0, m.duree);
    if (e.gain) e.gain.gain.value = gainClip(c, t);
    if (el.readyState < 1) continue;
    if (lecture) {
      if (el.playbackRate !== c.vitesse) el.playbackRate = c.vitesse;
      if (Math.abs(el.currentTime - st) > 0.25) el.currentTime = st;
      if (el.paused) el.play().catch(() => {});
    } else {
      if (!el.paused) el.pause();
      if (Math.abs(el.currentTime - st) > 0.015) el.currentTime = st;
    }
  }
  for (const id of Array.from(PREV.keys())) if (!vus.has(id)) liberer(id);
}
function sourceApercu(c) {
  const m = MEDIA.get(c.media); if (!m) return null;
  if (c.kind === 'image') return m.img;
  const e = PREV.get(c.id); return e && e.el.readyState >= 2 ? e.el : null;
}
function rendu() {
  if (!P) return;
  const cv = ecranCv();
  if (cv.width !== P.w || cv.height !== P.h) { cv.width = P.w; cv.height = P.h; placerEcran(); }
  dessiner(cv.getContext('2d'), T, P.w, P.h, sourceApercu, true);
  majPoignees();
}
let rafRendu = 0;
function demanderRendu() { if (rafRendu) return; rafRendu = requestAnimationFrame(() => { rafRendu = 0; rendu(); }); }
function placerEcran() {
  if (!P) return;
  const box = $('#ecran'), cv = ecranCv();
  const r = Math.min((box.clientWidth - 16) / P.w, (box.clientHeight - 16) / P.h);
  cv.style.width = Math.max(10, P.w * r) + 'px'; cv.style.height = Math.max(10, P.h * r) + 'px';
}
// Lecture
let t0perf = 0, t0 = 0;
function jouer() {
  if (lecture) return pause();
  audioCtx();
  if (T >= duree() - 0.02) T = 0;
  lecture = true; t0perf = performance.now(); t0 = T;
  $('#btn-lecture').textContent = '⏸';
  boucle();
}
function pause() {
  lecture = false; $('#btn-lecture').textContent = '▶';
  PREV.forEach(e => e.el.pause());
  synchro(T); rendu();
}
function boucle() {
  if (!lecture) return;
  T = t0 + (performance.now() - t0perf) / 1000;
  const D = duree();
  if (T >= D) { T = D; majTete(); pause(); if (finLecture) finLecture(); return; }
  synchro(T); rendu(); majTete(true);
  requestAnimationFrame(boucle);
}
let finLecture = null;
function allerA(t) {
  T = clamp(t, 0, Math.max(duree(), 0));
  if (lecture) { t0 = T; t0perf = performance.now(); }
  synchro(T); rendu(); majTete();
}
function voirTemps(t) {
  const d = $('#defile'), x = t * pxs;
  if (x < d.scrollLeft || x > d.scrollLeft + d.clientWidth - 40) d.scrollLeft = Math.max(0, x - d.clientWidth * 0.3);
}

// Poignées dans le moniteur pour déplacer / agrandir le clip sélectionné (comme le moniteur de programme de Premiere).
function majPoignees() {
  if (!P) return;
  const box = $('#poignees');
  const c = selId && clip(selId);
  if (!c || !BBOX || c.kind === 'audio' || lecture) { box.hidden = true; return; }
  const cv = ecranCv(), r = cv.getBoundingClientRect(), e = $('#ecran').getBoundingClientRect(), k = r.width / P.w;
  box.hidden = false;
  box.style.left = (r.left - e.left + (BBOX.cx - BBOX.w / 2) * k) + 'px';
  box.style.top = (r.top - e.top + (BBOX.cy - BBOX.h / 2) * k) + 'px';
  box.style.width = BBOX.w * k + 'px'; box.style.height = BBOX.h * k + 'px';
  box.style.transform = 'rotate(' + BBOX.rot + 'deg)';
  if (!box.firstChild) box.append(h('b', { title: 'Glisse pour déplacer' }), h('i', { class: 'd', title: 'Glisse pour agrandir' }));
}
function initPoignees() {
  const box = $('#poignees');
  box.addEventListener('pointerdown', ev => {
    const c = selId && clip(selId); if (!c) return;
    ev.preventDefault(); box.setPointerCapture(ev.pointerId);
    const k = ecranCv().getBoundingClientRect().width / P.w;
    const coin = ev.target.tagName === 'I';
    const o = { x: c.x, y: c.y, e: c.echelle, px: ev.clientX, py: ev.clientY };
    const r = box.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d0 = Math.hypot(ev.clientX - cx, ev.clientY - cy) || 1;
    let bouge = false;
    const mv = e2 => {
      if (!bouge) { memo(); bouge = true; }
      if (coin) c.echelle = clamp(o.e * Math.hypot(e2.clientX - cx, e2.clientY - cy) / d0, 0.05, 10);
      else {
        c.x = o.x + (e2.clientX - o.px) / k; c.y = o.y + (e2.clientY - o.py) / k;
        if (Math.abs(c.x) < 12 / k) c.x = 0;
        if (Math.abs(c.y) < 12 / k) c.y = 0;
      }
      rendu();
    };
    const up = () => { box.removeEventListener('pointermove', mv); box.removeEventListener('pointerup', up); if (bouge) { majInspecteur(); sauver(); } };
    box.addEventListener('pointermove', mv); box.addEventListener('pointerup', up);
  });
}

// ---------- Timeline ----------
const HV = 64, HA = 52, HREGLE = 28;
const hPiste = p => p.type === 'v' ? HV : HA;
function majTimeline() {
  if (!P) return;
  const D = duree(), def = $('#defile');
  const largeur = Math.max(def.clientWidth, (D + 30) * pxs);
  const pistesEl = $('#pistes'), ent = $('#entetes');
  pistesEl.innerHTML = ''; pistesEl.style.width = largeur + 'px';
  ent.innerHTML = ''; ent.append(h('div', { class: 'coin' }));
  $('#regle').style.width = largeur + 'px';
  for (const p of P.pistes) {
    const nom = nomPiste(p), hp = hPiste(p);
    const btns = [];
    if (p.type === 'v') btns.push(h('button', { title: p.cache ? 'Montrer la piste' : 'Cacher la piste', onclick: () => { memo(); p.cache = !p.cache; apres(false); } }, p.cache ? '🙈' : '👁'));
    btns.push(h('button', { title: p.muet ? 'Remettre le son' : 'Couper le son de la piste', onclick: () => { memo(); p.muet = !p.muet; apres(false); } }, p.muet ? '🔇' : '🔈'));
    btns.push(h('button', { title: 'Supprimer la piste', onclick: () => supprimerPiste(p) }, '✕'));
    ent.append(h('div', { class: 'entete ' + p.type, style: 'height:' + hp + 'px' }, h('b', null, nom),
      h('span', { class: 'nomp' }, p.type === 'v' ? 'Vidéo' : 'Audio'), ...btns));
    const row = h('div', { class: 'piste ' + p.type + (p.cache ? ' cache' : ''), style: 'height:' + hp + 'px', 'data-piste': p.id });
    const cl = P.clips.filter(c => c.piste === p.id).sort((a, b) => a.start - b.start);
    for (const c of cl) row.append(elementClip(c));
    // zones de fondu enchaîné (chevauchement)
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
      const a = cl[i], b = cl[j];
      const d0 = Math.max(a.start, b.start), d1 = Math.min(fin(a), fin(b));
      if (d1 - d0 > 0.01) row.append(h('div', { class: 'chevauche', style: 'left:' + d0 * pxs + 'px;width:' + (d1 - d0) * pxs + 'px', title: 'Fondu enchaîné automatique' }, h('span', null, '⨯')));
    }
    pistesEl.append(row);
  }
  $('#tete').style.height = (HREGLE + P.pistes.reduce((s, p) => s + hPiste(p), 0) + P.pistes.length) + 'px';
  majRegle(); majTete();
  $('#duree').textContent = tc(D);
}
function elementClip(c) {
  const el = h('div', { class: 'clip ' + c.kind + (c.id === selId ? ' sel' : ''), 'data-id': c.id, title: nomClip(c) });
  el.style.left = c.start * pxs + 'px'; el.style.width = Math.max(2, c.dur * pxs) + 'px';
  const m = MEDIA.get(c.media);
  if (m && m.vign && (c.kind === 'video' || c.kind === 'image')) el.append(h('div', { class: 'film', style: 'background-image:url(' + m.vign + ')' }));
  if (c.kind === 'color') el.style.background = c.couleur;
  if (m && m.pics && (c.kind === 'audio' || c.kind === 'video')) el.append(dessinerOnde(c, m));
  if (c.tin.t !== 'aucune') el.append(h('div', { class: 'rampe e', style: 'width:' + c.tin.d * pxs + 'px' }));
  if (c.tout.t !== 'aucune') el.append(h('div', { class: 'rampe s', style: 'width:' + c.tout.d * pxs + 'px' }));
  let lib = nomClip(c);
  if (c.vitesse !== 1) lib = '×' + c.vitesse + ' ' + lib;
  if (c.kind === 'video' && c.volume === 0) lib = '🔇 ' + lib;
  el.append(h('div', { class: 'lib' }, (c.kind === 'text' ? 'T  ' : '') + lib));
  el.append(h('div', { class: 'bord g', title: 'Glisse pour raccourcir le début' }), h('div', { class: 'bord d', title: 'Glisse pour raccourcir la fin' }));
  el.append(h('div', { class: 'fondu e', style: 'left:' + ((c.tin.t !== 'aucune' ? c.tin.d : 0) * pxs + 6) + 'px', title: 'Glisse pour faire un fondu d\'entrée' }));
  el.append(h('div', { class: 'fondu s', style: 'left:calc(100% - ' + ((c.tout.t !== 'aucune' ? c.tout.d : 0) * pxs + 6) + 'px)', title: 'Glisse pour faire un fondu de sortie' }));
  return el;
}
function dessinerOnde(c, m) {
  const w = Math.min(6000, Math.max(2, Math.round(c.dur * pxs))), hh = c.kind === 'audio' ? 44 : 22;
  const cv = h('canvas', { class: 'onde', width: w, height: hh });
  cv.style.height = hh + 'px';
  const ctx = cv.getContext('2d'); ctx.fillStyle = c.kind === 'audio' ? 'rgba(200,255,210,.85)' : 'rgba(210,225,255,.8)';
  const g = Math.min(2, c.volume);
  for (let x = 0; x < w; x++) {
    const s0 = c.src + (x / w) * c.dur * c.vitesse, s1 = c.src + ((x + 1) / w) * c.dur * c.vitesse;
    let mx = 0; for (let i = Math.floor(s0 * 100); i <= Math.floor(s1 * 100) && i < m.pics.length; i++) mx = Math.max(mx, m.pics[i]);
    const v = Math.min(1, mx / m.picMax * 0.95 * g) * (hh - 2);
    ctx.fillRect(x, (hh - v) / 2, 1, Math.max(1, v));
  }
  return cv;
}
function majRegle() {
  const regle = $('#regle'), def = $('#defile');
  regle.innerHTML = '';
  const pas = [1 / P.fps, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800].find(s => s * pxs >= 80) || 3600;
  const t0v = Math.max(0, Math.floor(def.scrollLeft / pxs / pas) * pas), t1v = (def.scrollLeft + def.clientWidth) / pxs + pas;
  const sous = pas >= 1 ? 5 : 4;
  for (let t = t0v; t <= t1v; t += pas) {
    const g = h('div', { class: 'grad g', style: 'left:' + t * pxs + 'px' }, h('span', null, pas < 1 ? court(t) : court(Math.round(t))));
    regle.append(g);
    for (let i = 1; i < sous; i++) regle.append(h('div', { class: 'grad', style: 'left:' + (t + pas * i / sous) * pxs + 'px' }));
  }
  for (const r of P.reperes) {
    const mk = h('div', { class: 'repere', style: 'left:' + r * pxs + 'px', title: 'Repère à ' + court(r) + ' (double-clic pour l\'enlever)' });
    mk.addEventListener('pointerdown', e => { e.stopPropagation(); allerA(r); });
    mk.addEventListener('dblclick', e => { e.stopPropagation(); memo(); P.reperes = P.reperes.filter(x => x !== r); apres(false); });
    regle.append(mk);
  }
}
function majTete(suivre) {
  $('#tete').style.left = T * pxs + 'px';
  $('#tc').textContent = tc(T);
  if (suivre) {
    const d = $('#defile'), x = T * pxs;
    if (x > d.scrollLeft + d.clientWidth - 30 || x < d.scrollLeft) d.scrollLeft = x - 60;
  }
}
function tempsDepuisX(clientX) {
  const d = $('#defile'), r = d.getBoundingClientRect();
  return Math.max(0, (clientX - r.left + d.scrollLeft) / pxs);
}
function pointsAimant(saufId) {
  const pts = [0, T, ...P.reperes];
  for (const c of P.clips) if (c.id !== saufId) pts.push(c.start, fin(c));
  return pts;
}
function aimanter(t, pts) {
  if (!aimant) return { t, p: null };
  const seuil = 9 / pxs; let best = null, bd = seuil;
  for (const p of pts) { const d = Math.abs(p - t); if (d < bd) { bd = d; best = p; } }
  return best === null ? { t, p: null } : { t: best, p: best };
}
function montrerAimant(p) {
  const l = $('#aimant-ligne');
  if (p === null || p === undefined) { l.hidden = true; return; }
  l.hidden = false; l.style.left = p * pxs + 'px'; l.style.height = $('#tete').style.height;
}
function selectionner(id) {
  if (selId === id) return;
  selId = id;
  $$('.clip.sel').forEach(e => e.classList.remove('sel'));
  if (id) { const el = document.querySelector('.clip[data-id="' + id + '"]'); if (el) el.classList.add('sel'); }
  majInspecteur(); rendu();
}
function initTimeline() {
  const def = $('#defile'), pistesEl = $('#pistes');
  def.addEventListener('scroll', () => { $('#entetes').scrollTop = def.scrollTop; majRegle(); });
  $('#entetes').addEventListener('wheel', e => { def.scrollTop += e.deltaY; e.preventDefault(); }, { passive: false });
  def.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const t = tempsDepuisX(e.clientX), x = e.clientX - def.getBoundingClientRect().left;
      changerZoom(pxs * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
      def.scrollLeft = t * pxs - x;
    } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { /* défilement horizontal normal */ }
  }, { passive: false });
  // Règle : déplacer la tête de lecture
  $('#regle').addEventListener('pointerdown', e => {
    if (e.target.classList.contains('repere')) return;
    const r = $('#regle'); r.setPointerCapture(e.pointerId);
    const go = ev => allerA(aimanter(tempsDepuisX(ev.clientX), [0, ...P.reperes, ...P.clips.flatMap(c => [c.start, fin(c)])]).t);
    go(e);
    const up = () => { r.removeEventListener('pointermove', go); r.removeEventListener('pointerup', up); };
    r.addEventListener('pointermove', go); r.addEventListener('pointerup', up);
  });
  // Clips : sélectionner, déplacer, raccourcir, fondus, couper
  pistesEl.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const cel = e.target.closest('.clip');
    if (!cel) { selectionner(null); allerA(tempsDepuisX(e.clientX)); return; }
    const c = clip(cel.dataset.id); if (!c) return;
    if (outil === 'lame') { selectionner(c.id); couperClip(c, aimanter(tempsDepuisX(e.clientX), [T, ...P.reperes]).t, true); return; }
    selectionner(c.id);
    e.preventDefault();
    const cls = e.target.classList;
    const mode = cls.contains('bord') ? (cls.contains('g') ? 'g' : 'd') : cls.contains('fondu') ? (cls.contains('e') ? 'fe' : 'fs') : 'deplacer';
    const o = { start: c.start, dur: c.dur, src: c.src, piste: c.piste, tin: c.tin.d, tout: c.tout.d, x: e.clientX, t: tempsDepuisX(e.clientX) };
    const pts = pointsAimant(c.id);
    const md = dureeMedia(c), fps = P.fps;
    let bouge = false;
    pistesEl.setPointerCapture(e.pointerId);
    const mv = ev => {
      const dt = (ev.clientX - o.x) / pxs;
      if (!bouge && Math.abs(ev.clientX - o.x) < 3) return;
      if (!bouge) { memo(); bouge = true; }
      let lp = null;
      if (mode === 'deplacer') {
        let s = Math.max(0, o.start + dt);
        const a1 = aimanter(s, pts), a2 = aimanter(s + c.dur, pts);
        if (a1.p !== null && (a2.p === null || Math.abs(a1.t - s) <= Math.abs(a2.t - s - c.dur))) { s = a1.t; lp = a1.p; }
        else if (a2.p !== null) { s = a2.t - c.dur; lp = a2.p; }
        c.start = Math.max(0, s);
        const sous = document.elementFromPoint(ev.clientX, ev.clientY);
        const row = sous && sous.closest && sous.closest('.piste');
        if (row && piste(row.dataset.piste) && piste(row.dataset.piste).type === typePiste(c.kind) && row.dataset.piste !== c.piste) {
          c.piste = row.dataset.piste; row.append(cel);
        }
      } else if (mode === 'g') {
        let s = aimanter(o.start + dt, pts); lp = s.p; s = s.t;
        s = Math.max(s, 0, o.start - o.src / c.vitesse);
        s = Math.min(s, o.start + o.dur - 1 / fps);
        c.start = s; c.dur = o.start + o.dur - s; c.src = o.src + (s - o.start) * c.vitesse;
      } else if (mode === 'd') {
        let f = aimanter(o.start + o.dur + dt, pts); lp = f.p; f = f.t;
        f = Math.max(f, c.start + 1 / fps);
        if (isFinite(md)) f = Math.min(f, c.start + (md - c.src) / c.vitesse);
        c.dur = f - c.start;
      } else if (mode === 'fe') {
        const d = clamp(tempsDepuisX(ev.clientX) - c.start, 0, c.dur);
        c.tin.d = Math.round(d * 100) / 100; if (c.tin.d < 0.04) c.tin.t = 'aucune'; else if (c.tin.t === 'aucune') c.tin.t = 'fondu';
      } else if (mode === 'fs') {
        const d = clamp(fin(c) - tempsDepuisX(ev.clientX), 0, c.dur);
        c.tout.d = Math.round(d * 100) / 100; if (c.tout.d < 0.04) c.tout.t = 'aucune'; else if (c.tout.t === 'aucune') c.tout.t = 'fondu';
      }
      montrerAimant(lp);
      cel.style.left = c.start * pxs + 'px'; cel.style.width = Math.max(2, c.dur * pxs) + 'px';
      if (mode === 'fe' || mode === 'fs') { calculerCroisements(); const n = elementClip(c); cel.replaceChildren(...n.childNodes); }
      calculerCroisements(); synchro(T); rendu();
    };
    const up = () => {
      pistesEl.removeEventListener('pointermove', mv); pistesEl.removeEventListener('pointerup', up); pistesEl.removeEventListener('pointercancel', up);
      montrerAimant(null);
      if (bouge) apres();
    };
    pistesEl.addEventListener('pointermove', mv); pistesEl.addEventListener('pointerup', up); pistesEl.addEventListener('pointercancel', up);
  });
  pistesEl.addEventListener('dblclick', e => {
    const cel = e.target.closest('.clip'); if (!cel) return;
    allerA(tempsDepuisX(e.clientX));
  });
  // Glisser-déposer depuis la bibliothèque ou depuis l'ordinateur
  pistesEl.addEventListener('dragover', e => {
    e.preventDefault();
    $$('.piste.cible').forEach(r => r.classList.remove('cible'));
    const row = e.target.closest('.piste'); if (row) row.classList.add('cible');
  });
  pistesEl.addEventListener('dragleave', e => { if (!pistesEl.contains(e.relatedTarget)) $$('.piste.cible').forEach(r => r.classList.remove('cible')); });
  pistesEl.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    document.body.classList.remove('glisse');
    $$('.piste.cible').forEach(r => r.classList.remove('cible'));
    const row = e.target.closest('.piste');
    const t = aimanter(tempsDepuisX(e.clientX), pointsAimant(null)).t;
    const id = e.dataTransfer.getData('application/x-studio-media');
    if (id && MEDIA.get(id)) { memo(); const c = creerClipMedia(MEDIA.get(id), row && row.dataset.piste, t); apres(); return c; }
    if (e.dataTransfer.files.length) importer(e.dataTransfer.files, { piste: row && row.dataset.piste, t });
  });
}
function changerZoom(v) {
  pxs = clamp(v, 2, 400);
  $('#zoom').value = pxs;
  majTimeline();
}

// ---------- Actions de montage ----------
function couperClip(c, t, seul) {
  if (!c || t <= c.start + 0.5 / P.fps || t >= fin(c) - 0.5 / P.fps) { if (seul) toast('Place la coupe à l\'intérieur du clip'); return null; }
  if (seul) memo();
  const d1 = t - c.start;
  const c2 = copie(c); c2.id = uid();
  c2.start = t; c2.dur = c.dur - d1; c2.src = c.src + d1 * c.vitesse; c2.tin = { t: 'aucune', d: 0.5 };
  c.dur = d1; c.tout = { t: 'aucune', d: 0.5 };
  P.clips.push(c2);
  if (seul) apres();
  return c2;
}
function couperTete() {
  const c = selId && clip(selId);
  if (c && actif(c, T)) { couperClip(c, T, true); return; }
  const sous = P.clips.filter(x => actif(x, T) && T > x.start + 0.5 / P.fps);
  if (!sous.length) return toast('Aucun clip sous la tête de lecture');
  memo(); sous.forEach(x => couperClip(x, T, false)); apres();
}
function supprimer(trou) {
  const c = selId && clip(selId); if (!c) return toast('Sélectionne d\'abord un clip');
  memo();
  P.clips = P.clips.filter(x => x !== c);
  if (trou) for (const x of P.clips) if (x.piste === c.piste && x.start >= fin(c) - 1e-6) x.start -= c.dur;
  selId = null; apres();
}
function dupliquer() {
  const c = selId && clip(selId); if (!c) return toast('Sélectionne d\'abord un clip');
  memo();
  const n = copie(c); n.id = uid(); n.start = fin(c);
  for (const x of P.clips) if (x.piste === c.piste && x.start >= fin(c) - 1e-6) x.start += c.dur;
  P.clips.push(n); selId = n.id; apres();
}
function coller() {
  if (!pressePapier) return;
  memo();
  const n = copie(pressePapier); n.id = uid(); n.start = T;
  if (!piste(n.piste)) n.piste = P.pistes.find(p => p.type === typePiste(n.kind)).id;
  if (n.media && !MEDIA.get(n.media)) return toast('Le média de ce clip n\'est plus dans le projet');
  P.clips.push(n); selId = n.id; apres();
}
function detacherSon() {
  const c = selId && clip(selId);
  if (!c || c.kind !== 'video') return toast('Sélectionne une vidéo pour détacher son son');
  const m = MEDIA.get(c.media);
  if (m && m.sansSon) return toast('Cette vidéo n\'a pas de son');
  memo();
  let p = P.pistes.find(q => q.type === 'a' && !P.clips.some(x => x.piste === q.id && x.start < fin(c) && fin(x) > c.start));
  if (!p) { p = { id: uid(), type: 'a' }; P.pistes.push(p); }
  const a = nouveauClip('audio', p.id, c.start, c.dur, { media: c.media, src: c.src, vitesse: c.vitesse, volume: c.volume || 1, tin: copie(c.tin), tout: copie(c.tout) });
  c.volume = 0;
  P.clips.push(a); apres();
  toast('Le son est maintenant sur ' + nomPiste(p) + ' : tu peux le couper ou le déplacer à part');
}
function ajouterPiste(type) {
  memo();
  if (type === 'v') P.pistes.unshift({ id: uid(), type: 'v' });
  else P.pistes.push({ id: uid(), type: 'a' });
  apres(false);
}
function supprimerPiste(p) {
  const n = P.clips.filter(c => c.piste === p.id).length;
  if (P.pistes.filter(q => q.type === p.type).length <= 1) return toast('Il faut garder au moins une piste ' + (p.type === 'v' ? 'vidéo' : 'audio'));
  if (n && !confirm('Cette piste contient ' + n + ' clip(s). La supprimer avec ses clips ?')) return;
  memo();
  P.pistes = P.pistes.filter(q => q !== p);
  P.clips = P.clips.filter(c => c.piste !== p.id);
  apres();
}
function ajouterTexte(modele, t) {
  memo();
  const tx = Object.assign(copie(TEXTE0), copie(modele.t));
  // Piste vidéo la plus haute libre à cet endroit, sinon une nouvelle piste
  const debut = t === undefined ? T : t, d = 4;
  const libres = P.pistes.filter(p => p.type === 'v' && !P.clips.some(c => c.piste === p.id && c.start < debut + d && fin(c) > debut));
  let p = libres[0];
  if (!p || P.pistes.indexOf(p) === P.pistes.filter(q => q.type === 'v').length - 1 && P.clips.some(c => c.piste === p.id)) {
    p = libres.find(q => P.pistes.indexOf(q) < P.pistes.filter(x => x.type === 'v').length - 1);
  }
  if (!p) { p = { id: uid(), type: 'v' }; P.pistes.unshift(p); }
  const c = nouveauClip('text', p.id, debut, d, { texte: tx, y: (modele.y || 0) * P.h, x: (modele.x || 0) * P.w, tin: { t: 'fondu', d: 0.3 }, tout: { t: 'fondu', d: 0.3 } });
  P.clips.push(c); selId = c.id; apres();
  setTimeout(() => { const ta = $('#insp textarea'); if (ta) { ta.focus(); ta.select(); } }, 30);
}
function ajouterCouleur() {
  memo();
  const p = P.pistes.filter(q => q.type === 'v').pop();
  let t = 0; for (const c of P.clips) if (c.piste === p.id) t = Math.max(t, fin(c));
  const c = nouveauClip('color', p.id, t, 3, { couleur: '#1b1b2a' });
  P.clips.push(c); selId = c.id; apres();
}
function ajouterRepere() {
  memo(); P.reperes = Array.from(new Set([...P.reperes, Math.round(T * P.fps) / P.fps])).sort((a, b) => a - b); apres(false);
  toast('Repère ajouté à ' + court(T));
}
function appliquer(type, valeur) {
  const c = selId && clip(selId); if (!c) return toast('Sélectionne d\'abord un clip dans la timeline');
  if (type !== 'tin' && type !== 'tout' && c.kind === 'audio') return toast('Cet effet est pour les images et les vidéos');
  memo();
  if (type === 'tin' || type === 'tout') { c[type].t = valeur; if (c[type].d < 0.1) c[type].d = 0.5; c[type].d = Math.min(c[type].d, c.dur / 2); }
  else if (type === 'anim') c.anim = valeur;
  else if (type === 'look') c.filtres = Object.assign(copie(FILTRES0), LOOKS[valeur]);
  apres();
}

// ---------- Sous-titres automatiques ----------
function zonesDeParole(c, m) {
  if (!m || !m.pics) return [[c.start, fin(c)]];
  const N = Math.floor(c.dur * 100), vals = new Float32Array(N);
  for (let i = 0; i < N; i++) { const k = Math.floor((c.src + i / 100 * c.vitesse) * 100); vals[i] = m.pics[k] || 0; }
  const tri = Array.from(vals).sort((a, b) => a - b), ref = tri[Math.floor(tri.length * 0.95)] || 0;
  if (ref <= 0) return [[c.start, fin(c)]];
  const seuil = ref * 0.12, zones = [];
  let debut = -1, silence = 0;
  for (let i = 0; i < N; i++) {
    if (vals[i] > seuil) { if (debut < 0) debut = i; silence = 0; }
    else if (debut >= 0) { silence++; if (silence > 25) { zones.push([debut, i - silence + 1]); debut = -1; silence = 0; } }
  }
  if (debut >= 0) zones.push([debut, N]);
  const r = zones.filter(z => z[1] - z[0] > 8).map(z => [c.start + Math.max(0, z[0] - 5) / 100, c.start + Math.min(N, z[1] + 5) / 100]);
  return r.length ? r : [[c.start, fin(c)]];
}
function creerSousTitres() {
  const texte = $('#st-texte').value.trim();
  if (!texte) return toast('Colle d\'abord le texte de ta voix off');
  let c = selId && clip(selId);
  if (!c || (c.kind !== 'audio' && c.kind !== 'video')) c = P.clips.filter(x => x.kind === 'audio').sort((a, b) => a.start - b.start)[0];
  if (!c) return toast('Ajoute la voix off dans la timeline puis sélectionne-la');
  const nm = clamp(parseInt($('#st-mots').value, 10) || 6, 1, 20);
  const morceaux = [];
  for (const ph of texte.replace(/\s+/g, ' ').split(/(?<=[.!?…;:])\s+/)) {
    const mots = ph.split(' ').filter(Boolean);
    const parts = [];
    for (let i = 0; i < mots.length; i += nm) parts.push(mots.slice(i, i + nm));
    if (parts.length > 1 && parts[parts.length - 1].length <= 2) { const d = parts.pop(); parts[parts.length - 1].push(...d); }
    parts.forEach(p => morceaux.push(p.join(' ')));
  }
  const zones = zonesDeParole(c, MEDIA.get(c.media));
  const total = zones.reduce((s, z) => s + z[1] - z[0], 0);
  const poids = morceaux.map(m => m.length + 4), somme = poids.reduce((a, b) => a + b, 0);
  const versTemps = f => {
    let r = f * total;
    for (const z of zones) { const l = z[1] - z[0]; if (r <= l + 1e-9) return z[0] + r; r -= l; }
    return zones[zones.length - 1][1];
  };
  memo();
  const p = { id: uid(), type: 'v' }; P.pistes.unshift(p);
  const modele = MODELES[parseInt($('#st-style').value, 10) || 0];
  let cum = 0; const crees = [];
  morceaux.forEach((txt, i) => {
    const s = versTemps(cum / somme); cum += poids[i]; const e = versTemps(cum / somme);
    const tx = Object.assign(copie(TEXTE0), copie(modele.t), { txt });
    crees.push(nouveauClip('text', p.id, s, Math.max(0.3, e - s), { texte: tx, y: (modele.y || 0) * P.h, x: (modele.x || 0) * P.w }));
  });
  for (let i = 0; i < crees.length - 1; i++) { const a = crees[i], b = crees[i + 1]; if (b.start - fin(a) < 0.5) a.dur = Math.max(0.2, b.start - a.start); }
  P.clips.push(...crees); selId = null; apres();
  toast(crees.length + ' sous-titres créés sur ' + nomPiste(p) + '. Tu peux corriger chacun en cliquant dessus.', 5000);
}

// ---------- Inspecteur ----------
let saisie = false;
function controle(label, obj, cle, opt) {
  opt = opt || {};
  const c = selId && clip(selId);
  const ligne = h('div', { class: 'ligne' }, h('label', null, label));
  let input, aff = null;
  const lire = () => opt.lire ? opt.lire(obj[cle]) : obj[cle];
  const ecrire = v => { if (opt.ecrire) opt.ecrire(v); else obj[cle] = v; };
  const changer = v => {
    if (!saisie) { memo(); saisie = true; }
    ecrire(v); calculerCroisements(); synchro(T); rendu();
    if (aff) aff.textContent = opt.fmt ? opt.fmt(lire()) : lire();
    if (opt.timeline) majTimeline();
  };
  const fini = () => { saisie = false; sauver(); if (opt.timeline !== false) majTimeline(); };
  if (opt.type === 'select') {
    input = h('select', null, ...opt.choix.map(([v, n]) => h('option', { value: v }, n)));
    input.value = lire();
    input.addEventListener('change', () => { changer(opt.nombre ? parseFloat(input.value) : input.value); fini(); if (opt.recharger) majInspecteur(); });
  } else if (opt.type === 'color') {
    input = h('input', { type: 'color', value: lire() });
    input.addEventListener('input', () => changer(input.value)); input.addEventListener('change', fini);
  } else if (opt.type === 'check') {
    input = h('input', { type: 'checkbox' }); input.checked = !!lire();
    input.addEventListener('change', () => { changer(input.checked); fini(); if (opt.recharger) majInspecteur(); });
  } else if (opt.type === 'number') {
    input = h('input', { type: 'number', step: opt.step || 0.1, min: opt.min, max: opt.max, value: Math.round(lire() * 100) / 100 });
    input.addEventListener('change', () => { const v = parseFloat(input.value); if (!isNaN(v)) { changer(clamp(v, opt.min ?? -Infinity, opt.max ?? Infinity)); fini(); input.value = Math.round(lire() * 100) / 100; } });
  } else {
    input = h('input', { type: 'range', min: opt.min, max: opt.max, step: opt.step || 1, value: lire() });
    aff = h('span', { class: 'v' }, opt.fmt ? opt.fmt(lire()) : lire());
    input.addEventListener('input', () => changer(parseFloat(input.value)));
    input.addEventListener('change', fini);
    input.addEventListener('dblclick', () => { if (opt.defaut !== undefined) { changer(opt.defaut); input.value = lire(); fini(); } });
    input.title = 'Double-clic pour remettre à ' + (opt.defaut !== undefined ? (opt.fmt ? opt.fmt(opt.defaut) : opt.defaut) : 'zéro');
  }
  ligne.append(input); if (aff) ligne.append(aff);
  void c;
  return ligne;
}
function section(titre, ouvert, ...enfants) {
  const d = h('details', null, h('summary', null, titre), ...enfants);
  if (ouvert) d.open = true;
  return d;
}
const pct = v => Math.round(v * 100) + ' %';
function majInspecteur() {
  const box = $('#insp'), titre = $('#insp-titre');
  const c = selId && clip(selId);
  // garder les sections ouvertes
  const ouverts = new Set($$('#insp details').filter(d => d.open).map(d => d.firstChild.textContent));
  box.innerHTML = '';
  if (!c) {
    titre.textContent = 'Projet';
    box.append(
      h('div', { class: 'ligne' }, h('label', null, 'Nom'), (() => { const i = h('input', { type: 'text', value: P.nom }); i.addEventListener('change', () => { P.nom = i.value || 'Mon montage'; sauver(); }); return i; })()),
      controle('Couleur du fond', P, 'fond', { type: 'color' }),
      controle('Images par seconde', P, 'fps', { type: 'select', nombre: true, choix: [[24, '24 (cinéma)'], [25, '25'], [30, '30 (YouTube)'], [60, '60 (fluide)']] }),
      h('p', { class: 'astuce' }, 'Clique sur un clip de la timeline pour régler sa position, sa taille, ses couleurs, son volume, sa vitesse et ses transitions.'),
      h('p', { class: 'astuce' }, 'Durée du montage : ' + tc(duree()) + ' · ' + P.clips.length + ' clip(s)'));
    return;
  }
  const noms = { video: '🎬 Vidéo', image: '🖼 Image', audio: '🎵 Audio', text: 'T Texte', color: '🎨 Fond de couleur' };
  titre.textContent = noms[c.kind] + ' · ' + nomClip(c).slice(0, 28);
  const visuel = c.kind !== 'audio', media = c.kind === 'video' || c.kind === 'audio';
  const ouv = (n, d) => ouverts.size ? ouverts.has(n) : d;

  if (c.kind === 'text') {
    const tx = c.texte;
    const ta = h('textarea', { rows: 3 }); ta.value = tx.txt;
    ta.addEventListener('input', () => { if (!saisie) { memo(); saisie = true; } tx.txt = ta.value; rendu(); });
    ta.addEventListener('change', () => { saisie = false; sauver(); majTimeline(); });
    box.append(section('Texte', ouv('Texte', true), ta,
      controle('Police', tx, 'police', { type: 'select', choix: POLICES.map(p => [p, p]) }),
      controle('Taille', tx, 'taille', { min: 12, max: 400, defaut: 90, fmt: v => v + ' px' }),
      controle('Couleur', tx, 'coul', { type: 'color' }),
      controle('Gras', tx, 'gras', { type: 'check' }),
      controle('MAJUSCULES', tx, 'maj', { type: 'check' }),
      controle('Alignement', tx, 'align', { type: 'select', choix: [['left', 'À gauche'], ['center', 'Centré'], ['right', 'À droite']] }),
      controle('Largeur max', tx, 'largeur', { min: 0.1, max: 1, step: 0.01, defaut: 0.9, fmt: pct }),
      controle('Interligne', tx, 'inter', { min: 0.8, max: 2, step: 0.05, defaut: 1.15, fmt: v => v.toFixed(2) }),
      controle('Contour', tx, 'contour', { type: 'color' }),
      controle('Épaisseur contour', tx, 'ep', { min: 0, max: 30, defaut: 0, fmt: v => v + ' px' }),
      controle('Ombre', tx, 'ombre', { type: 'check' }),
      controle('Fond derrière', tx, 'fond', { type: 'check' }),
      controle('Couleur du fond', tx, 'fondCoul', { type: 'color' }),
      controle('Opacité du fond', tx, 'fondOp', { min: 0, max: 1, step: 0.01, defaut: 0.6, fmt: pct })));
  }
  if (c.kind === 'color') box.append(section('Couleur', true, controle('Couleur', c, 'couleur', { type: 'color' })));

  if (visuel) {
    const rangee = h('div', { class: 'rangee' },
      h('button', { onclick: () => { memo(); c.x = 0; c.y = 0; c.rot = 0; c.echelle = 1; apres(); } }, '⟲ Recentrer'),
      c.kind === 'video' || c.kind === 'image' ? h('button', { onclick: () => { memo(); c.cadrage = c.cadrage === 'remplir' ? 'contenir' : 'remplir'; c.echelle = 1; apres(); } }, c.cadrage === 'remplir' ? '⤡ Tout voir' : '⤢ Remplir l\'écran') : null);
    box.append(section('Disposition', ouv('Disposition', c.kind !== 'text'), rangee,
      controle('Position X', c, 'x', { min: -P.w, max: P.w, defaut: 0, fmt: v => Math.round(v) }),
      controle('Position Y', c, 'y', { min: -P.h, max: P.h, defaut: 0, fmt: v => Math.round(v) }),
      controle('Taille', c, 'echelle', { min: 0.05, max: 5, step: 0.01, defaut: 1, fmt: pct }),
      controle('Rotation', c, 'rot', { min: -180, max: 180, defaut: 0, fmt: v => v + '°' }),
      controle('Opacité', c, 'opacite', { min: 0, max: 1, step: 0.01, defaut: 1, fmt: pct })));
  }

  const temps = [
    controle('Début (s)', c, 'start', { type: 'number', min: 0, step: 0.1 }),
    controle('Durée (s)', c, 'dur', { type: 'number', min: 1 / P.fps, step: 0.1, ecrire: v => { const md = dureeMedia(c); c.dur = isFinite(md) ? Math.min(v, (md - c.src) / c.vitesse) : v; } })
  ];
  if (media) temps.push(controle('Vitesse', c, 'vitesse', {
    type: 'select', nombre: true, recharger: true,
    choix: [[0.25, '×0,25 (très lent)'], [0.5, '×0,5 (ralenti)'], [0.75, '×0,75'], [1, '×1 (normal)'], [1.25, '×1,25'], [1.5, '×1,5'], [2, '×2 (accéléré)'], [3, '×3'], [4, '×4']],
    ecrire: v => { const span = c.dur * c.vitesse; c.vitesse = v; c.dur = span / v; }
  }));
  box.append(section('Temps et vitesse', ouv('Temps et vitesse', false), ...temps));

  if (media) {
    const m = MEDIA.get(c.media);
    box.append(section('Son', ouv('Son', c.kind === 'audio'),
      m && m.sansSon ? h('p', { class: 'astuce' }, 'Cette vidéo n\'a pas de son.') : null,
      controle('Volume', c, 'volume', { min: 0, max: 2, step: 0.01, defaut: 1, fmt: pct, timeline: false }),
      h('div', { class: 'rangee' },
        h('button', { onclick: () => { memo(); c.volume = c.volume ? 0 : 1; apres(); } }, c.volume ? '🔇 Couper le son' : '🔈 Remettre le son'),
        c.kind === 'video' ? h('button', { onclick: detacherSon }, '🔊 Détacher') : null)));
  }

  const choixT = TRANSITIONS.filter(t => c.kind === 'audio' ? ['aucune', 'fondu'].includes(t[0]) : (c.kind === 'text' || t[0] !== 'machine'));
  box.append(section(c.kind === 'audio' ? 'Fondus du son' : 'Transitions', ouv(c.kind === 'audio' ? 'Fondus du son' : 'Transitions', false),
    controle('Entrée', c.tin, 't', { type: 'select', choix: choixT }),
    controle('Durée entrée (s)', c.tin, 'd', { type: 'number', min: 0.05, max: 10, step: 0.1 }),
    controle('Sortie', c.tout, 't', { type: 'select', choix: choixT.filter(t => t[0] !== 'machine') }),
    controle('Durée sortie (s)', c.tout, 'd', { type: 'number', min: 0.05, max: 10, step: 0.1 }),
    h('p', { class: 'astuce' }, 'Astuce : tire les petits ronds blancs en haut du clip pour régler les fondus, ou fais chevaucher deux clips pour un fondu enchaîné.')));

  if (c.kind === 'video' || c.kind === 'image') {
    box.append(section('Mouvement', ouv('Mouvement', c.kind === 'image'),
      controle('Animation', c, 'anim', { type: 'select', choix: ANIMS }),
      h('p', { class: 'astuce' }, 'Le zoom lent (effet Ken Burns) donne vie aux photos et aux tableaux.')));
  }
  if (c.kind !== 'audio' && c.kind !== 'text') {
    const f = c.filtres;
    box.append(section('Couleurs', ouv('Couleurs', false),
      h('div', { class: 'rangee' }, ...Object.keys(LOOKS).map(n => h('button', { onclick: () => appliquer('look', n) }, n))),
      controle('Luminosité', f, 'lum', { min: 0, max: 200, defaut: 100, fmt: v => v + ' %' }),
      controle('Contraste', f, 'con', { min: 0, max: 200, defaut: 100, fmt: v => v + ' %' }),
      controle('Saturation', f, 'sat', { min: 0, max: 300, defaut: 100, fmt: v => v + ' %' }),
      controle('Noir et blanc', f, 'nb', { min: 0, max: 100, defaut: 0, fmt: v => v + ' %' }),
      controle('Sépia', f, 'sep', { min: 0, max: 100, defaut: 0, fmt: v => v + ' %' }),
      controle('Teinte', f, 'teinte', { min: -180, max: 180, defaut: 0, fmt: v => v + '°' }),
      controle('Flou', f, 'flou', { min: 0, max: 40, step: 0.5, defaut: 0, fmt: v => v + ' px' })));
  }
  box.append(h('div', { class: 'rangee', style: 'margin-top:12px' },
    h('button', { onclick: couperTete }, '⫿ Couper ici'),
    h('button', { onclick: dupliquer }, '⧉ Dupliquer'),
    h('button', { onclick: () => supprimer(false) }, '🗑 Supprimer')));
}

// ---------- Export ----------
function fenetre(...contenu) {
  const corps = $('#fenetre-corps'); corps.innerHTML = ''; corps.append(...contenu);
  $('#fenetre').hidden = false;
}
function fermerFenetre() { if (exportEnCours) return; $('#fenetre').hidden = true; }
let exportEnCours = null;
function ouvrirExport() {
  if (!P.clips.length) return toast('Ton montage est vide : importe des médias et place-les dans la timeline');
  pause();
  const webcodecs = 'VideoEncoder' in window && 'VideoFrame' in window && window.Mp4Muxer;
  const res = h('select', null,
    h('option', { value: '1' }, 'Taille du projet (' + P.w + '×' + P.h + ')'),
    h('option', { value: String(Math.min(P.w, P.h) >= 1080 ? 2 / 3 : 0.75) }, 'Plus légère (' + pair(P.w * (Math.min(P.w, P.h) >= 1080 ? 2 / 3 : 0.75)) + '×' + pair(P.h * (Math.min(P.w, P.h) >= 1080 ? 2 / 3 : 0.75)) + ')'),
    h('option', { value: '0.5' }, 'Petite (' + pair(P.w / 2) + '×' + pair(P.h / 2) + ')'));
  const qual = h('select', null, h('option', { value: '1' }, 'Normale (conseillé pour YouTube)'), h('option', { value: '2' }, 'Haute (fichier plus gros)'), h('option', { value: '0.5' }, 'Légère (pour partager vite)'));
  const meth = h('select', null,
    webcodecs ? h('option', { value: 'rapide' }, 'Précise, image par image (conseillé)') : null,
    'MediaRecorder' in window ? h('option', { value: 'direct' }, 'En temps réel (le montage est joué)') : null);
  const nom = h('input', { type: 'text', value: (P.nom || 'montage').replace(/[\\/:*?"<>|]/g, '') });
  const barre = h('div', { class: 'barre-prog', hidden: true }, h('i'));
  const info = h('p', { class: 'astuce' }, 'Durée : ' + tc(duree()) + '. Ne change pas d\'onglet pendant l\'export, garde la fenêtre ouverte.');
  const go = h('button', { class: 'go' }, '⬇ Exporter en MP4');
  const stop = h('button', { hidden: true }, 'Annuler l\'export');
  if (!webcodecs) info.append(h('br'), 'Ton navigateur ne gère pas l\'export précis : utilise Chrome ou Edge pour un vrai MP4.');
  go.onclick = async () => {
    const opt = { k: parseFloat(res.value), q: parseFloat(qual.value), fps: P.fps, nom: nom.value || 'montage' };
    opt.W = pair(P.w * opt.k); opt.H = pair(P.h * opt.k);
    opt.debit = Math.round(opt.W * opt.H * opt.fps * 0.13 * opt.q);
    go.disabled = true; [res, qual, meth, nom].forEach(x => { x.disabled = true; }); barre.hidden = false; stop.hidden = false;
    const ctrl = { stop: false };
    exportEnCours = ctrl; stop.onclick = () => { ctrl.stop = true; };
    const debut = performance.now();
    const prog = f => {
      barre.firstChild.style.width = (f * 100).toFixed(1) + '%';
      const ecoule = (performance.now() - debut) / 1000, reste = f > 0.02 ? ecoule / f - ecoule : 0;
      info.textContent = 'Export : ' + Math.floor(f * 100) + ' %' + (reste ? ' · encore environ ' + (reste > 90 ? Math.ceil(reste / 60) + ' min' : Math.ceil(reste) + ' s') : '');
    };
    try {
      const blob = meth.value === 'rapide' ? await exporterMP4(opt, prog, ctrl) : await exporterDirect(opt, prog, ctrl);
      const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: opt.nom + '.' + ext, class: 'go', style: 'display:inline-block;padding:8px 16px;border-radius:8px;color:#fff;text-decoration:none;background:linear-gradient(90deg,#7c5cff,#ff5c8a);font-weight:700' }, '💾 Télécharger ' + opt.nom + '.' + ext);
      exportEnCours = null;
      fenetre(h('h2', null, '✅ Ta vidéo est prête !'),
        h('p', null, 'Taille du fichier : ' + (blob.size / 1048576).toFixed(1) + ' Mo · ' + opt.W + '×' + opt.H + ' · ' + tc(duree())),
        a,
        ext === 'webm' ? h('p', { class: 'astuce' }, 'Ton navigateur a fait un fichier WebM : YouTube l\'accepte aussi. Pour un MP4, utilise Chrome ou Edge.') : h('p', { class: 'astuce' }, 'Le fichier se trouve ensuite dans ton dossier Téléchargements. Tu peux l\'envoyer directement sur YouTube.'),
        h('video', { src: url, controls: '', style: 'width:100%;max-height:300px;margin-top:10px;background:#000;border-radius:8px' }));
      a.click();
    } catch (e) {
      exportEnCours = null;
      go.disabled = false; [res, qual, meth, nom].forEach(x => { x.disabled = false; }); stop.hidden = true;
      info.textContent = ctrl.stop ? 'Export annulé.' : '❌ L\'export a échoué : ' + (e && e.message || e) + '. Essaie la taille « Plus légère » ou l\'autre méthode.';
      console.error(e);
    }
  };
  fenetre(h('h2', null, '⬇ Exporter la vidéo'),
    h('div', { class: 'ligne' }, h('label', null, 'Nom du fichier'), nom),
    h('div', { class: 'ligne' }, h('label', null, 'Résolution'), res),
    h('div', { class: 'ligne' }, h('label', null, 'Qualité'), qual),
    h('div', { class: 'ligne' }, h('label', null, 'Méthode'), meth),
    barre, info, h('div', { class: 'actions' }, stop, go));
}
async function choisirCodecVideo(W, H, fps, debit) {
  const codecs = ['avc1.640033', 'avc1.640028', 'avc1.4d0033', 'avc1.4d0028', 'avc1.42e033', 'avc1.42e01f'];
  for (const accel of ['prefer-hardware', 'no-preference', 'prefer-software']) for (const codec of codecs) {
    const cfg = { codec, width: W, height: H, bitrate: debit, framerate: fps, hardwareAcceleration: accel, avc: { format: 'avc' } };
    try { const s = await VideoEncoder.isConfigSupported(cfg); if (s.supported) return cfg; } catch (e) { /* suivant */ }
  }
  return null;
}
async function mixerAudio(D, ctrl) {
  const sr = 48000, oc = new OfflineAudioContext(2, Math.max(1, Math.ceil(D * sr)), sr);
  const caches = new Map(); let rien = true;
  for (const c of P.clips) {
    if (ctrl.stop) throw new Error('annulé');
    if (c.kind !== 'video' && c.kind !== 'audio') continue;
    if (gainClip(c, c.start + c.dur / 2) === 0 && c.volume === 0) continue;
    const p = piste(c.piste); if (!p || p.muet || (c.kind === 'video' && p.cache)) continue;
    const m = MEDIA.get(c.media); if (!m || m.sansSon) continue;
    if (!caches.has(m.id)) caches.set(m.id, await decoderAudio(m));
    const buf = caches.get(m.id); if (!buf) continue;
    rien = false;
    const s = oc.createBufferSource(); s.buffer = buf; s.playbackRate.value = c.vitesse;
    const g = oc.createGain(); s.connect(g); g.connect(oc.destination);
    const n = Math.max(2, Math.ceil(c.dur * 100)), courbe = new Float32Array(n);
    for (let j = 0; j < n; j++) courbe[j] = gainClip(c, c.start + (j / (n - 1)) * c.dur * 0.9999);
    g.gain.setValueAtTime(courbe[0], 0);
    g.gain.setValueCurveAtTime(courbe, c.start, c.dur);
    s.start(c.start, c.src, c.dur * c.vitesse);
  }
  if (rien) return null;
  return oc.startRendering();
}
async function exporterMP4(opt, prog, ctrl) {
  const { W, H, fps } = opt, D = duree(), N = Math.max(1, Math.ceil(D * fps));
  const vcfg = await choisirCodecVideo(W, H, fps, opt.debit);
  if (!vcfg) throw new Error('ton ordinateur ne sait pas encoder en H.264 à cette taille');
  prog(0);
  const audio = await mixerAudio(D, ctrl);
  let acfg = null, acodec = null;
  if (audio && 'AudioEncoder' in window) {
    for (const [codec, mc] of [['mp4a.40.2', 'aac'], ['opus', 'opus']]) {
      const cfg = { codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 };
      try { if ((await AudioEncoder.isConfigSupported(cfg)).supported) { acfg = cfg; acodec = mc; break; } } catch (e) { /* suivant */ }
    }
  }
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H, frameRate: fps },
    audio: acfg ? { codec: acodec, numberOfChannels: 2, sampleRate: 48000 } : undefined,
    fastStart: 'in-memory', firstTimestampBehavior: 'offset'
  });
  let erreur = null;
  const venc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => { erreur = e; } });
  venc.configure(vcfg);
  let aenc = null;
  if (acfg) {
    aenc = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: e => { erreur = e; } });
    aenc.configure(acfg);
  }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { alpha: false });
  const EX = new Map();
  const src = c => { const m = MEDIA.get(c.media); if (!m) return null; if (c.kind === 'image') return m.img; const e = EX.get(c.id); return e && e.pret ? e.v : null; };
  if (document.fonts) await document.fonts.ready;
  const BLOC = 48000; let posAudio = 0;
  const L = audio && audio.getChannelData(0), R = audio && audio.getChannelData(1);
  try {
    for (let i = 0; i < N; i++) {
      if (ctrl.stop) throw new Error('annulé');
      if (erreur) throw erreur;
      const t = i / fps;
      await preparerVideos(t, EX);
      dessiner(ctx, t, W, H, src, false);
      const fr = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(fr, { keyFrame: i % (fps * 2) === 0 });
      fr.close();
      // le son avance avec l'image (le fichier reste bien entrelacé)
      while (aenc && posAudio < audio.length && posAudio / 48000 <= t + 1) {
        const len = Math.min(BLOC, audio.length - posAudio), data = new Float32Array(len * 2);
        data.set(L.subarray(posAudio, posAudio + len), 0); data.set(R.subarray(posAudio, posAudio + len), len);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round(posAudio / 48000 * 1e6), data });
        aenc.encode(ad); ad.close(); posAudio += len;
      }
      while (venc.encodeQueueSize > 6) await attendre(2);
      if (i % 3 === 0) prog(i / N);
    }
    while (aenc && posAudio < audio.length) {
      const len = Math.min(BLOC, audio.length - posAudio), data = new Float32Array(len * 2);
      data.set(L.subarray(posAudio, posAudio + len), 0); data.set(R.subarray(posAudio, posAudio + len), len);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round(posAudio / 48000 * 1e6), data });
      aenc.encode(ad); ad.close(); posAudio += len;
    }
    await venc.flush(); if (aenc) await aenc.flush();
    if (erreur) throw erreur;
    muxer.finalize();
    prog(1);
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  } finally {
    try { venc.close(); } catch (e) {}
    try { if (aenc) aenc.close(); } catch (e) {}
    EX.forEach(e => { e.v.removeAttribute('src'); e.v.load(); });
  }
}
// Pour chaque vidéo visible à l'instant t : se placer exactement sur la bonne image.
async function preparerVideos(t, EX) {
  const attente = [];
  for (const c of P.clips) {
    if (c.kind !== 'video') continue;
    const p = piste(c.piste);
    let e = EX.get(c.id);
    if (!actif(c, t) || !p || p.cache) {
      if (e && t > fin(c)) { e.v.removeAttribute('src'); e.v.load(); EX.delete(c.id); }
      continue;
    }
    const m = MEDIA.get(c.media); if (!m) continue;
    if (!e) {
      const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = m.url;
      e = { v, pret: false }; EX.set(c.id, e);
      attente.push(evenement(v, 'loadeddata', 20000).catch(() => {}));
    }
    attente.push((async () => {
      if (e.v.readyState < 2) await evenement(e.v, 'loadeddata', 20000).catch(() => {});
      const cible = clamp(tSource(c, t), 0, Math.max(0, m.duree - 0.001));
      if (Math.abs(e.v.currentTime - cible) > 0.0005 || !e.pret) {
        const s = evenement(e.v, 'seeked', 8000).catch(() => {});
        e.v.currentTime = cible;
        await s;
      }
      e.pret = true;
    })());
  }
  await Promise.all(attente);
}
// Méthode de secours : on joue le montage et on enregistre l'aperçu.
async function exporterDirect(opt, prog, ctrl) {
  const ac = audioCtx();
  const cv = ecranCv();
  const flux = cv.captureStream(opt.fps);
  let dest = null;
  if (ac) { dest = ac.createMediaStreamDestination(); maitre.connect(dest); dest.stream.getAudioTracks().forEach(t => flux.addTrack(t)); }
  const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const type = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: opt.debit, audioBitsPerSecond: 192000 });
  const morceaux = []; rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
  const selAvant = selId; selId = null; majPoignees();
  allerA(0); await attendre(600);
  const D = duree();
  return new Promise((ok, ko) => {
    let suivi = 0;
    const nettoyer = () => { clearInterval(suivi); finLecture = null; if (dest) try { maitre.disconnect(dest); } catch (e) {} selId = selAvant; };
    rec.onstop = () => { nettoyer(); if (ctrl.stop) return ko(new Error('annulé')); ok(new Blob(morceaux, { type: (type || 'video/webm').split(';')[0] })); };
    finLecture = () => setTimeout(() => rec.state !== 'inactive' && rec.stop(), 250);
    suivi = setInterval(() => { prog(Math.min(1, T / D)); if (ctrl.stop) { pause(); rec.stop(); } }, 250);
    rec.start(1000);
    jouer();
  });
}

// ---------- Projets ----------
async function ouvrirProjet(id) {
  if (P) pause();
  Array.from(PREV.keys()).forEach(liberer);
  MEDIA.forEach(m => URL.revokeObjectURL(m.url)); MEDIA.clear();
  const p = id && await DB.lire('projets', id);
  P = p || nouveauProjet('Mon premier montage');
  if (!p) await DB.mettre('projets', P);
  ls('studio-dernier', P.id);
  HIST.pile = []; HIST.refaire = []; selId = null; T = 0;
  $('#format').value = P.w + 'x' + P.h;
  if (!FORMATS[P.w + 'x' + P.h]) $('#format').append(h('option', { value: P.w + 'x' + P.h }, P.w + '×' + P.h));
  $('#format').value = P.w + 'x' + P.h;
  const medias = (await DB.mediasDe(P.id)) || [];
  for (const m of medias) {
    try { await analyser(m); MEDIA.set(m.id, m); } catch (e) { console.warn('média illisible', m.nom); }
  }
  afficherMedias();
  calculerCroisements(); majTimeline(); majInspecteur(); placerEcran(); synchro(0); rendu();
  $('#etat').textContent = '✓ ' + P.nom;
}
async function fenetreProjets() {
  const liste = ((await DB.tous('projets')) || []).sort((a, b) => b.modifie - a.modifie);
  let fmt = '1920x1080';
  const nom = h('input', { type: 'text', value: 'Nouveau montage', style: 'max-width:none' });
  const formats = h('div', { class: 'choix-format' }, ...Object.entries(FORMATS).map(([v, n]) => {
    const b = h('button', { class: v === fmt ? 'on' : '' }, n, h('br'), h('small', null, v.replace('x', '×')));
    b.onclick = () => { fmt = v; $$('.choix-format button').forEach(x => x.classList.remove('on')); b.classList.add('on'); };
    return b;
  }));
  const creer = h('button', { class: 'go' }, '✚ Créer le projet');
  creer.onclick = async () => {
    const [w, hh] = fmt.split('x').map(Number);
    const p = nouveauProjet(nom.value || 'Nouveau montage', w, hh);
    await DB.mettre('projets', p); $('#fenetre').hidden = true; await ouvrirProjet(p.id);
  };
  const lignes = liste.map(p => h('div', { class: 'projet' + (P && p.id === P.id ? ' actuel' : '') },
    h('div', { class: 'nom' }, p.nom, h('small', null, (FORMATS[p.w + 'x' + p.h] || p.w + '×' + p.h) + ' · ' + p.clips.length + ' clip(s) · modifié le ' + new Date(p.modifie).toLocaleString('fr-BE'))),
    h('button', { onclick: async () => { $('#fenetre').hidden = true; await ouvrirProjet(p.id); } }, 'Ouvrir'),
    h('button', { onclick: async () => { const n = prompt('Nouveau nom du projet :', p.nom); if (!n) return; p.nom = n; await DB.mettre('projets', p); if (P.id === p.id) P.nom = n; fenetreProjets(); } }, '✎'),
    h('button', { title: 'Supprimer', onclick: async () => {
      if (!confirm('Supprimer le projet « ' + p.nom + ' » et ses médias importés ? (Tes fichiers sur l\'ordinateur ne sont pas touchés.)')) return;
      const ms = (await DB.mediasDe(p.id)) || []; for (const m of ms) await DB.effacer('medias', m.id);
      await DB.effacer('projets', p.id);
      if (P.id === p.id) { const reste = ((await DB.tous('projets')) || []).sort((a, b) => b.modifie - a.modifie)[0]; await ouvrirProjet(reste && reste.id); }
      fenetreProjets();
    } }, '🗑')));
  fenetre(h('h2', null, '📁 Mes projets'),
    h('p', { class: 'astuce' }, 'Tes projets sont enregistrés automatiquement dans ce navigateur, sur cet ordinateur. Rien n\'est envoyé sur internet.'),
    h('div', { class: 'projets' }, ...lignes),
    h('h2', { style: 'margin-top:18px' }, 'Nouveau projet'),
    nom, formats, h('div', { class: 'actions' }, creer));
}
function changerFormat(v) {
  const [w, hh] = v.split('x').map(Number);
  if (w === P.w && hh === P.h) return;
  memo(); P.w = w; P.h = hh; apres(); placerEcran();
  toast('Format : ' + (FORMATS[v] || v) + '. Astuce : « Remplir l\'écran » dans l\'inspecteur recadre une vidéo 16:9 en vertical.');
}

// ---------- Aide ----------
function aide(bienvenue) {
  const raccourcis = [
    ['Espace', 'Lecture / pause'], ['J / K / L', 'Reculer 1 s / pause / avancer 1 s'], ['← →', 'Image précédente / suivante'], ['Maj + ← →', 'Reculer / avancer d\'une seconde'],
    ['Origine / Fin', 'Aller au début / à la fin'], ['S ou Ctrl + K', 'Couper à la tête de lecture'], ['V', 'Outil Sélection'], ['C', 'Outil Lame (clic = coupe)'],
    ['Suppr', 'Supprimer le clip'], ['Maj + Suppr', 'Supprimer et boucher le trou'], ['Ctrl + Z / Ctrl + Y', 'Annuler / refaire'],
    ['Ctrl + C / Ctrl + V', 'Copier / coller un clip à la tête de lecture'], ['Ctrl + D', 'Dupliquer'], ['M', 'Ajouter un repère'],
    ['+ / −', 'Zoomer / dézoomer la timeline (ou Ctrl + molette)'], ['\\', 'Voir tout le montage'], ['Ctrl + I', 'Importer'], ['Ctrl + E', 'Exporter']
  ];
  fenetre(h('h2', null, bienvenue ? '🎬 Bienvenue dans Naufragés Studio !' : '❓ Mode d\'emploi'),
    h('p', null, 'Un logiciel de montage gratuit, dans le style de Premiere Pro et Vegas Pro, mais plus simple.'),
    h('ol', null,
      h('li', null, h('b', null, 'Importe'), ' tes vidéos, photos, musiques et voix off (bouton ➕ ou glisse-les dans la fenêtre).'),
      h('li', null, h('b', null, 'Glisse-les dans la timeline'), ' en bas (ou clique sur le + d\'un média pour le mettre au bout). Les pistes du haut passent devant celles du bas.'),
      h('li', null, h('b', null, 'Coupe'), ' avec S ou l\'outil Lame, raccourcis un clip en tirant ses bords, déplace-le en le glissant.'),
      h('li', null, h('b', null, 'Ajoute des textes'), ' (onglet Textes), des ', h('b', null, 'transitions'), ' et des couleurs (onglet Effets) et des ', h('b', null, 'sous-titres'), ' calés sur ta voix off.'),
      h('li', null, h('b', null, 'Exporte'), ' en MP4 et envoie ta vidéo sur YouTube.')),
    h('p', { class: 'astuce' }, 'Fondu enchaîné : fais chevaucher deux clips sur la même piste. Fondu d\'entrée / sortie : tire les petits ronds blancs en haut du clip. Dans l\'aperçu, déplace et agrandis le clip choisi avec la souris.'),
    h('p', { class: 'astuce' }, 'Ton travail est enregistré tout seul dans ce navigateur, sur ton ordinateur. Rien n\'est envoyé sur internet. Utilise Chrome ou Edge pour le meilleur résultat.'),
    h('h2', { style: 'margin-top:14px' }, '⌨ Raccourcis'),
    h('table', null, ...raccourcis.map(([k, d]) => h('tr', null, h('td', null, k), h('td', null, d)))),
    h('div', { class: 'actions' }, h('button', { class: 'go', onclick: () => { $('#fenetre').hidden = true; } }, bienvenue ? 'C\'est parti !' : 'Fermer')));
}

// ---------- Interface ----------
function initInterface() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    const A = {
      projets: fenetreProjets, importer: () => $('#fichiers').click(), annuler, refaire, aide: () => aide(false), exporter: ouvrirExport,
      fermer: fermerFenetre, couleur: ajouterCouleur, soustitres: creerSousTitres,
      debut: () => { allerA(0); voirTemps(0); }, fin: () => { allerA(duree()); voirTemps(duree()); },
      imgprec: () => allerA(T - 1 / P.fps), imgsuiv: () => allerA(T + 1 / P.fps), lecture: jouer,
      couper: couperTete, supprimer: () => supprimer(false), supprtrou: () => supprimer(true), dupliquer, detacher: detacherSon, marqueur: ajouterRepere,
      aimant: () => { aimant = !aimant; $('#btn-aimant').classList.toggle('on', aimant); },
      pistev: () => ajouterPiste('v'), pistea: () => ajouterPiste('a'),
      zoom: () => changerZoom(pxs * 1.4), dezoom: () => changerZoom(pxs / 1.4),
      ajuster: () => { changerZoom(($('#defile').clientWidth - 40) / Math.max(5, duree())); $('#defile').scrollLeft = 0; },
      mobileok: () => { $('#mobile').hidden = true; }
    };
    if (A[act]) A[act]();
  });
  $('#fenetre').addEventListener('click', e => { if (e.target.id === 'fenetre') fermerFenetre(); });
  $('#fichiers').addEventListener('change', e => { importer(e.target.files); e.target.value = ''; });
  $('#format').addEventListener('change', e => changerFormat(e.target.value));
  $('#zoom').addEventListener('input', e => changerZoom(parseFloat(e.target.value)));
  $$('.onglets button').forEach(b => b.addEventListener('click', () => {
    $$('.onglets button').forEach(x => x.classList.toggle('on', x === b));
    $$('.contenu').forEach(c => { c.hidden = c.dataset.page !== b.dataset.onglet; });
  }));
  $$('[data-outil]').forEach(b => b.addEventListener('click', () => choisirOutil(b.dataset.outil)));
  // modèles de textes
  const box = $('#modeles-textes');
  MODELES.forEach(m => {
    const t = Object.assign(copie(TEXTE0), m.t);
    const st = 'font-family:"' + t.police + '";font-weight:' + (t.gras ? 700 : 400) + ';color:' + t.coul + ';font-size:22px;' +
      (t.ep ? '-webkit-text-stroke:' + Math.min(2, t.ep / 5) + 'px ' + t.contour + ';paint-order:stroke fill;' : '') +
      (t.fond ? 'background:' + t.fondCoul + ';padding:2px 8px;border-radius:5px;' : '') + (t.maj ? 'text-transform:uppercase;' : '');
    const el = h('div', { class: 'modele', title: m.nom + ' : clique pour l\'ajouter' }, h('span', { style: st }, t.txt), h('div', { style: 'font-size:11px;color:#8d8da3;margin-top:4px' }, m.nom));
    el.onclick = () => ajouterTexte(m);
    box.append(el);
  });
  $('#st-style').append(...MODELES.map((m, i) => h('option', { value: i }, m.nom)));
  $('#st-style').value = '3';
  const puces = (id, liste, type) => $(id).append(...liste.map(([v, n]) => h('button', { onclick: () => appliquer(type, v) }, n)));
  puces('#liste-tin', TRANSITIONS, 'tin');
  puces('#liste-tout', TRANSITIONS.filter(t => t[0] !== 'machine'), 'tout');
  puces('#liste-anim', ANIMS, 'anim');
  puces('#liste-looks', Object.keys(LOOKS).map(n => [n, n]), 'look');
  // glisser des fichiers n'importe où
  let compteur = 0;
  window.addEventListener('dragenter', e => { if (e.dataTransfer.types.includes('Files')) { compteur++; document.body.classList.add('glisse'); } });
  window.addEventListener('dragleave', () => { compteur = Math.max(0, compteur - 1); if (!compteur) document.body.classList.remove('glisse'); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { e.preventDefault(); compteur = 0; document.body.classList.remove('glisse'); if (e.dataTransfer.files.length) importer(e.dataTransfer.files); });
  window.addEventListener('resize', () => { if (!P) return; placerEcran(); majTimeline(); rendu(); });
  new ResizeObserver(() => { placerEcran(); majPoignees(); }).observe($('#ecran'));
  window.addEventListener('beforeunload', () => { if (P) DB.mettre('projets', P); });
  document.addEventListener('keydown', clavier);
  initTimeline(); initPoignees();
}
function choisirOutil(o) {
  outil = o;
  $$('[data-outil]').forEach(b => b.classList.toggle('on', b.dataset.outil === o));
  document.body.classList.toggle('lame', o === 'lame');
}
function clavier(e) {
  if (!P) return;
  const cible = e.target;
  if (cible.closest && cible.closest('input,textarea,select,[contenteditable]')) { if (e.key === 'Escape') cible.blur(); return; }
  if (!$('#fenetre').hidden) { if (e.key === 'Escape') fermerFenetre(); return; }
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  let fait = true;
  if (ctrl && k === 'z' && !e.shiftKey) annuler();
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) refaire();
  else if (ctrl && k === 'c') { const c = selId && clip(selId); if (c) { pressePapier = copie(c); toast('Clip copié'); } }
  else if (ctrl && k === 'v') coller();
  else if (ctrl && k === 'x') { const c = selId && clip(selId); if (c) { pressePapier = copie(c); supprimer(false); } }
  else if (ctrl && k === 'd') dupliquer();
  else if (ctrl && k === 'k') couperTete();
  else if (ctrl && k === 'i') $('#fichiers').click();
  else if (ctrl && k === 'e') ouvrirExport();
  else if (ctrl) fait = false;
  else if (e.key === ' ') jouer();
  else if (k === 's') couperTete();
  else if (k === 'v') choisirOutil('selection');
  else if (k === 'c') choisirOutil('lame');
  else if (k === 'm') ajouterRepere();
  else if (e.key === 'Delete' || e.key === 'Backspace') supprimer(e.shiftKey);
  else if (e.key === 'ArrowLeft') allerA(T - (e.shiftKey ? 1 : 1 / P.fps));
  else if (e.key === 'ArrowRight') allerA(T + (e.shiftKey ? 1 : 1 / P.fps));
  else if (e.key === 'Home') { allerA(0); voirTemps(0); }
  else if (e.key === 'End') { allerA(duree()); voirTemps(duree()); }
  else if (k === 'j') allerA(T - 1);
  else if (k === 'k') { if (lecture) pause(); }
  else if (k === 'l') allerA(T + 1);
  else if (e.key === '+' || e.key === '=') changerZoom(pxs * 1.4);
  else if (e.key === '-') changerZoom(pxs / 1.4);
  else if (e.key === '\\') document.querySelector('[data-act="ajuster"]').click();
  else if (e.key === 'F1') aide(false);
  else if (e.key === 'Escape') selectionner(null);
  else fait = false;
  if (fait) e.preventDefault();
}

// ---------- Démarrage ----------
async function demarrer() {
  initInterface();
  if (window.innerWidth < 800 && !ls('studio-mobile')) { $('#mobile').hidden = false; ls('studio-mobile', '1'); }
  const ok = await DB.ouvrir();
  const dernier = ls('studio-dernier');
  let id = dernier;
  if (ok && !id) { const tous = (await DB.tous('projets')) || []; const r = tous.sort((a, b) => b.modifie - a.modifie)[0]; id = r && r.id; }
  const premiere = !id;
  await ouvrirProjet(id);
  if (!ok) toast('⚠ Ton navigateur bloque l\'enregistrement (navigation privée ?) : ton montage sera perdu en fermant la page.', 7000);
  if (premiere) aide(true);
  window.STUDIO = { get P() { return P; }, MEDIA, importer, allerA, rendu, exporterMP4, duree }; // pour les tests
}
demarrer();
})();
