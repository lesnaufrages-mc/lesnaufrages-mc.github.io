// CLUTCH, le mot du jour esport : chaque jour, 10 questions esport (les mêmes pour tout le monde),
// la réponse de chaque question est le mot à trouver. Même règles que le Mot Mystère classique
// (vert = bonne place, jaune = ailleurs dans le mot), mais le mot fait de 4 à 8 lettres et peut être
// un nom propre : tout essai de la bonne longueur est accepté.
// Round 1 = la question du jour de questions.js, rounds 2 à 10 = questions-libres.js, du facile au difficile.
// Après les 10 rounds, les « parties libres » permettent d'en enchaîner d'autres (30 parties par jour en tout).
// 2 minutes maximum par partie. Chaque partie rapporte de 0 à 1000 points.
import { QUESTIONS, DEBUT } from './questions.js';
import { LIBRES } from './questions-libres.js';

const TRIES = 6;
const KEY = 'mm-esport:v1';
const URL_JEU = 'https://lesnaufrages-mc.github.io/esport/';
const ROUNDS = 10; // questions du jour
const MAX_LIBRES = 20; // + les 10 du jour = 30 parties par jour
const CHRONO = 2 * 60000; // 2 minutes maximum par partie
const AUTO = 4; // secondes avant le lancement automatique de la partie suivante

const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- Logique du mot (identique à l'appli) ----------
function normalize(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, ''); }
function evaluate(guess, answer) {
  const n = answer.length, res = Array(n).fill('absent'), left = {};
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (res[i] !== 'correct' && left[guess[i]] > 0) { res[i] = 'present'; left[guess[i]]--; }
  }
  return res;
}

// ---------- Le jour (date locale de l'appareil, change à minuit) ----------
function dateLocale(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function numeroDuJour() {
  const [y, m, d] = DEBUT.split('-').map(Number);
  const now = new Date();
  const jours = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, d)) / 86400000);
  return Math.max(0, jours) + 1;
}
const NUM = numeroDuJour();
const IDX_JOUR = (NUM - 1) % QUESTIONS.length;

// ---------- Les questions ----------
// Identifiant d'une question : 'd' + n° dans QUESTIONS, ou 'x' + n° dans LIBRES.
// Chaque question a un niveau (1 débutant, 2 confirmé, 3 expert). Pour celles de questions.js,
// il est deviné d'après la catégorie : le lexique est facile, les noms de joueurs et de médias plus durs.
const NIVEAUX = ['', 'Débutant', 'Confirmé', 'Expert'];
function question(id) { return id[0] === 'x' ? LIBRES[+id.slice(1)] : QUESTIONS[+id.slice(1)]; }
function niveauDe(q) { return q.n || (q.c === 'Lexique' ? 1 : /Joueur|Personnalité|Média/.test(q.c) ? 3 : 2); }

// Les 10 questions du jour, les mêmes pour tout le monde : la question du jour,
// puis 3 faciles, 3 moyennes et 3 difficiles qui tournent d'un jour à l'autre.
function idsDuJour() {
  const ids = ['d' + IDX_JOUR];
  for (let n = 1; n <= 3; n++) {
    const liste = LIBRES.map((q, i) => (q.n === n ? 'x' + i : null)).filter(Boolean);
    for (let j = 0; j < 3; j++) ids.push(liste[((NUM - 1) * 3 + j) % liste.length]);
  }
  return ids;
}
const JOUR_IDS = idsDuJour();

// Parties libres : toutes les questions de LIBRES + les questions du jour déjà passées, sauf celles d'aujourd'hui.
function poolLibre() {
  const ids = LIBRES.map((_, i) => 'x' + i);
  for (let k = 0; k < Math.min(NUM - 1, QUESTIONS.length); k++) ids.push('d' + k);
  return ids.filter((id) => !JOUR_IDS.includes(id));
}

// ---------- Sauvegarde (sur l'appareil) ----------
const nouvellePartie = (id) => ({ id, essais: [], indice: false, fini: false, gagne: false, debut: 0, points: 0 });
function charger() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.stats) return s; } catch {}
  return { stats: { joues: 0, gagnes: 0, serie: 0, meilleure: 0, dist: [0, 0, 0, 0, 0, 0], dernier: null } };
}
const S = charger();
if (!S.libre) S.libre = { n: 0, vus: [], joues: 0, gagnes: 0, partie: null, pts: 0, record: 0, niveau: 1 };
if (S.jour !== dateLocale() || !S.rounds) {
  const rounds = JOUR_IDS.map(nouvellePartie);
  // Ancienne version (1 seule question par jour) : on garde la question du jour déjà jouée aujourd'hui.
  if (S.jour === dateLocale() && S.essais && S.essais.length) {
    Object.assign(rounds[0], { essais: S.essais, indice: S.indice, fini: S.fini, gagne: S.gagne, debut: Date.now() });
  }
  if (S.jour !== dateLocale()) Object.assign(S.libre, { n: 0, partie: null, pts: 0 });
  Object.assign(S, { jour: dateLocale(), rounds, mode: 'jour' });
  ['essais', 'indice', 'fini', 'gagne'].forEach((k) => delete S[k]);
}
function sauver() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

const roundEnCours = () => { const i = S.rounds.findIndex((r) => !r.fini); return i < 0 ? ROUNDS - 1 : i; };
const jourFini = () => S.rounds.every((r) => r.fini);
const resteLibres = () => Math.max(0, MAX_LIBRES - S.libre.n);

// G = la partie affichée : un round du jour ou la partie libre en cours.
let MODE = 'jour', G, Q, ANSWER, LEN, current = '', anim = -1; // anim = ligne qui vient d'être validée (la seule à animer)
function chargerPartie(mode) {
  MODE = mode;
  G = mode === 'libre' ? S.libre.partie : S.rounds[roundEnCours()];
  Q = question(G.id); ANSWER = Q.m; LEN = ANSWER.length;
  current = ''; anim = -1;
  if (!G.fini && !G.debut) G.debut = Date.now(); // le chrono démarre quand la question s'affiche
  S.mode = mode;
}
function nouvellePartieLibre() {
  const L = S.libre;
  if (L.n >= MAX_LIBRES) return false;
  const pool = poolLibre();
  let dispo = pool.filter((id) => !L.vus.includes(id));
  if (!dispo.length) { L.vus = []; dispo = pool; }
  // On prend une question du niveau du joueur, sinon du niveau le plus proche.
  const ecart = (id) => Math.abs(niveauDe(question(id)) - L.niveau);
  const mini = Math.min(...dispo.map(ecart));
  dispo = dispo.filter((id) => ecart(id) === mini);
  const id = dispo[Math.floor(Math.random() * dispo.length)];
  L.vus.push(id); L.n++;
  L.partie = nouvellePartie(id);
  return true;
}

const maxEssais = () => TRIES - (G.indice ? 1 : 0);
const resteChrono = () => Math.max(0, Math.ceil((G.debut + CHRONO - Date.now()) / 1000)); // en secondes
const mmss = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const ptsJour = () => S.rounds.reduce((t, r) => t + (r.points || 0), 0);

// ---------- Affichage ----------
function renderQuestion() {
  const libre = MODE === 'libre';
  $('num').textContent = libre ? 'LIBRE ' + S.libre.n + '/' + MAX_LIBRES : 'ROUND ' + (roundEnCours() + 1) + '/' + ROUNDS;
  $('live-txt').textContent = libre ? 'Partie libre' : roundEnCours() === 0 ? 'Question du jour #' + NUM : 'Questions du jour #' + NUM;
  $('m-jour').classList.toggle('on', !libre);
  $('m-libre').classList.toggle('on', libre);
  $('m-reste').textContent = jourFini() ? resteLibres() + ' restantes' : 'après les 10 rounds';
  $('m-tours').textContent = S.rounds.filter((r) => r.fini).length + '/' + ROUNDS + ' joués';
  $('niveau').textContent = '★'.repeat(niveauDe(Q)) + ' ' + NIVEAUX[niveauDe(Q)];
  $('pts').textContent = '🏆 ' + S.libre.pts + ' pts';
  $('cat').textContent = Q.c;
  $('scene').textContent = Q.s;
  $('question').textContent = Q.q;
  $('longueur').textContent = LEN + ' lettres';
  tickChrono();
}

function renderBoard() {
  const board = $('board'); board.textContent = '';
  board.style.setProperty('--n', LEN);
  for (let r = 0; r < TRIES; r++) {
    const row = el('div', 'r');
    if (G.indice && r === TRIES - 1) row.classList.add('lost');
    const g = G.essais[r], cur = r === G.essais.length && !G.fini;
    const res = g ? evaluate(g, ANSWER) : null;
    for (let i = 0; i < LEN; i++) {
      const t = el('div', 't');
      if (g) { t.textContent = g[i]; t.classList.add(res[i]); if (r === anim) { t.classList.add('flip'); t.style.animationDelay = (i * 0.08) + 's'; } }
      else if (cur && current[i]) { t.textContent = current[i]; t.classList.add('full'); }
      else if (cur && G.indice && i === 0) { t.textContent = ANSWER[0]; t.classList.add('ghost'); }
      row.appendChild(t);
    }
    board.appendChild(row);
  }
  $('indice').disabled = G.indice || G.fini || G.essais.length >= maxEssais() - 1;
  $('indice').textContent = G.indice ? '💡 Première lettre : ' + ANSWER[0] : '💡 Indice : 1re lettre (-1 essai)';
  renderKeyboard();
}

const KB = ['AZERTYUIOP', 'QSDFGHJKLM', '>WXCVBN<'];
function renderKeyboard() {
  const best = {}, rank = { correct: 3, present: 2, absent: 1 };
  G.essais.forEach((g) => evaluate(g, ANSWER).forEach((r, i) => { if ((rank[r] || 0) > (rank[best[g[i]]] || 0)) best[g[i]] = r; }));
  const kb = $('kb'); kb.textContent = '';
  KB.forEach((line) => {
    const row = el('div');
    [...line].forEach((k) => {
      const b = el('button', k === '>' || k === '<' ? 'wide' : (best[k] || ''), k === '>' ? 'ENTRER' : k === '<' ? '⌫' : k);
      b.type = 'button';
      b.onclick = () => key(k === '>' ? 'Enter' : k === '<' ? 'Backspace' : k);
      row.appendChild(b);
    });
    kb.appendChild(row);
  });
}

function toast(msg) { const t = el('div', 'toast', msg); document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }
function secouer() { const r = $('board').children[G.essais.length]; if (r) { r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake'); } }

// ---------- Jouer ----------
function key(k) {
  if (G.fini) return;
  if (k === 'Enter') return valider();
  if (k === 'Backspace') { current = current.slice(0, -1); return renderBoard(); }
  const l = normalize(k);
  if (l.length === 1 && current.length < LEN) { current += l; renderBoard(); }
}

function valider() {
  if (current.length !== LEN) { toast('Le mot fait ' + LEN + ' lettres'); secouer(); return; }
  G.essais.push(current); current = ''; anim = G.essais.length - 1;
  if (G.essais[G.essais.length - 1] === ANSWER) finir(true);
  else if (G.essais.length >= maxEssais()) finir(false);
  sauver(); renderBoard();
  if (G.fini) setTimeout(renderFin, LEN * 80 + 450);
}

// Points de 0 à 1000 : 1000 au 1er essai, -100 par essai en plus, -100 avec l'indice,
// et plus tu es lent, moins tu gagnes (jusqu'à la moitié en moins au bout des 2 minutes).
function calculPoints(p) {
  if (!p.gagne) return 0;
  const base = 1000 - 100 * (p.essais.length - 1) - (p.indice ? 100 : 0);
  const lenteur = Math.min(1, (Date.now() - p.debut) / CHRONO);
  return Math.max(0, Math.min(1000, Math.round(base * (1 - 0.5 * lenteur))));
}

// Termine la partie p (un round du jour ou une partie libre).
function terminer(p, libre, gagne, tempsEcoule) {
  p.fini = true; p.gagne = gagne; p.temps = !!tempsEcoule;
  p.points = calculPoints(p);
  const L = S.libre, st = S.stats;
  L.pts += p.points; L.record = Math.max(L.record || 0, L.pts);
  if (libre) {
    L.joues++; if (gagne) L.gagnes++;
    // Le niveau s'adapte : une belle victoire (600 pts ou plus) fait monter, une défaite fait descendre.
    const avant = L.niveau;
    if (gagne && p.points >= 600) L.niveau = Math.min(3, L.niveau + 1);
    else if (!gagne) L.niveau = Math.max(1, L.niveau - 1);
    p.niveau = L.niveau !== avant ? (L.niveau > avant ? '⬆ ' : '⬇ ') + 'Niveau ' + NIVEAUX[L.niveau] : '';
    return;
  }
  st.joues++;
  if (gagne) { st.gagnes++; st.dist[p.essais.length - 1]++; }
  // La série compte les jours d'affilée où les 10 rounds ont été joués.
  if (jourFini()) {
    const hier = dateLocale(new Date(Date.now() - 86400000));
    st.serie = st.dernier === hier ? st.serie + 1 : 1;
    st.meilleure = Math.max(st.meilleure, st.serie);
    st.dernier = S.jour;
  }
}
const finir = (gagne, tempsEcoule) => terminer(G, MODE === 'libre', gagne, tempsEcoule);

$('indice').onclick = () => {
  if (G.indice || G.fini) return;
  G.indice = true; anim = -1; sauver(); renderBoard();
  toast('Indice pris : ' + maxEssais() + ' essais restants au total');
};

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || !$('v-fin').classList.contains('hide') || !$('v-trailer').classList.contains('hide')) return;
  if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zà-ÿ]$/i.test(e.key)) { e.preventDefault(); key(e.key); }
});

// Chrono : 2 minutes par partie, sinon elle est perdue.
function tickChrono() {
  const c = $('chrono');
  c.classList.toggle('hide', !G || G.fini);
  if (!G || G.fini) return;
  const r = resteChrono();
  c.textContent = '⏱ ' + mmss(r);
  c.classList.toggle('urgent', r <= 20);
  if (r <= 0) { finir(false, true); sauver(); renderBoard(); renderFin(); }
}
setInterval(tickChrono, 250);

// ---------- Fin de partie ----------
const carre = (r) => (!r.fini ? '⬛' : r.gagne ? '🟩' : '🟥');
function texteRes() {
  const gagnes = S.rounds.filter((r) => r.gagne).length;
  return 'CLUTCH #' + NUM + ' ' + gagnes + '/' + ROUNDS + ' · ' + ptsJour() + ' pts\n' +
    S.rounds.map(carre).join('') + '\n' + URL_JEU;
}

function renderFin() {
  const libre = MODE === 'libre', bilan = !libre && jourFini();
  $('v-fin').classList.remove('hide');
  $('voir-res').classList.remove('hide');
  $('fin-titre').textContent = G.gagne ? (G.essais.length === 1 ? 'ACE ! Du premier coup' : 'VICTORY') : G.temps ? 'TIME OUT' : 'DEFEAT';
  const w = $('fin-mot'); w.textContent = '';
  [...ANSWER].forEach((l) => w.appendChild(el('div', 't correct', l)));
  $('fin-sous').textContent = G.gagne ? 'GG, trouvé en ' + G.essais.length + ' essai' + (G.essais.length > 1 ? 's' : '') + (G.indice ? ' (avec indice)' : '')
    : G.temps ? 'Les 2 minutes sont passées. La réponse était :' : 'La réponse était :';
  $('v-fin').classList.toggle('lose', !G.gagne);
  $('fin-pts').textContent = '+' + (G.points || 0) + ' pts';
  $('fin-niveau').textContent = libre ? G.niveau || '' : '';
  $('fin-info').textContent = Q.i;

  // Bilan des 10 rounds du jour
  $('bilan').classList.toggle('hide', libre);
  $('bilan-carres').textContent = S.rounds.map(carre).join('');
  $('bilan-txt').textContent = S.rounds.filter((r) => r.gagne).length + '/' + ROUNDS + ' trouvés · ' + ptsJour() + ' pts';
  $('fin-jour').classList.toggle('hide', !bilan);
  $('fin-libre').classList.toggle('hide', !libre);
  $('retour-jour').classList.toggle('hide', !libre);
  const L = S.libre;
  $('li-pts').textContent = L.pts;
  $('li-record').textContent = L.record || 0;
  $('li-pct').textContent = L.joues ? Math.round(100 * L.gagnes / L.joues) : 0;
  $('li-reste').textContent = resteLibres();
  $('li-niveau').textContent = NIVEAUX[L.niveau || 1];
  const plusRien = (libre || bilan) && !resteLibres();
  $('limite').classList.toggle('hide', !plusRien);
  $('encore').classList.toggle('hide', plusRien);

  if (bilan) {
    const st = S.stats;
    $('st-joues').textContent = st.joues;
    $('st-pct').textContent = st.joues ? Math.round(100 * st.gagnes / st.joues) : 0;
    $('st-serie').textContent = st.serie;
    $('st-max').textContent = st.meilleure;
    const dist = $('dist'); dist.textContent = '';
    const max = Math.max(1, ...st.dist);
    st.dist.forEach((n, i) => {
      const line = el('div', 'd');
      line.appendChild(el('span', '', String(i + 1)));
      const bar = el('b', G.gagne && G.essais.length === i + 1 ? 'on' : '', String(n));
      bar.style.width = Math.max(8, 100 * n / max) + '%';
      line.appendChild(bar); dist.appendChild(line);
    });
    compteARebours();
    majEncore();
    return;
  }
  lancerAuto();
}

function compteARebours() {
  const tick = () => {
    const now = new Date(), demain = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((demain - now) / 1000));
    if (s === 0) return location.reload();
    $('prochain').textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((x) => String(x).padStart(2, '0')).join(':');
  };
  tick(); clearInterval(compteARebours.t); compteARebours.t = setInterval(tick, 1000);
}

// Bouton « suivant ». Après un round ou une partie libre, la suite se lance toute seule après AUTO secondes.
function suivant() { return MODE === 'jour' && !jourFini() ? 'jour' : 'libre'; }
function majEncore(sec) {
  const txt = suivant() === 'jour' ? '▶ Round ' + (roundEnCours() + 1) + '/' + ROUNDS
    : MODE === 'jour' ? '🔁 Parties libres (' + resteLibres() + ' restantes)'
    : '▶ Partie suivante (' + resteLibres() + ' restantes)';
  $('encore').textContent = txt + (sec ? ' dans ' + sec : '');
}
function stopAuto() { clearInterval(lancerAuto.t); lancerAuto.t = null; }
function lancerAuto() {
  stopAuto();
  if (suivant() === 'libre' && !resteLibres()) return;
  let sec = AUTO; majEncore(sec);
  lancerAuto.t = setInterval(() => { if (--sec <= 0) { stopAuto(); afficher(suivant()); } else majEncore(sec); }, 1000);
}

$('partager').onclick = async () => {
  const text = texteRes();
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Résultat copié !'); } catch { toast('Impossible de copier'); }
};
$('fermer').onclick = () => { stopAuto(); $('v-fin').classList.add('hide'); };
$('voir-res').onclick = renderFin;
$('trailer-btn').onclick = () => $('v-trailer').classList.remove('hide');
$('trailer-fermer').onclick = () => { $('trailer-video').pause(); $('v-trailer').classList.add('hide'); };
$('regles-btn').onclick = () => $('regles').classList.toggle('hide');

// ---------- Changer de mode ----------
function afficher(mode) {
  if (mode === 'libre' && !jourFini()) { toast('Termine d\'abord les 10 rounds du jour !'); mode = 'jour'; }
  if (mode === 'libre' && (!S.libre.partie || S.libre.partie.fini)) {
    if (!nouvellePartieLibre()) {
      if (!S.libre.partie) return toast('Plus de parties aujourd\'hui, reviens demain !');
      if (MODE === 'libre') return renderFin();
    }
  }
  stopAuto();
  $('v-fin').classList.add('hide');
  chargerPartie(mode); sauver();
  renderQuestion(); renderBoard();
  $('voir-res').classList.toggle('hide', !G.fini);
  if (G.fini) renderFin();
}
$('m-jour').onclick = () => afficher('jour');
$('m-libre').onclick = () => {
  if (MODE === 'libre' && !G.fini) return;
  if (MODE === 'libre' && !resteLibres()) return renderFin();
  afficher('libre');
};
$('encore').onclick = () => afficher(suivant());
$('retour-jour').onclick = () => afficher('jour');

// Une partie commencée dont les 2 minutes sont passées pendant que la page était fermée compte comme perdue.
[...S.rounds.map((p) => [p, false]), [S.libre.partie, true]].forEach(([p, libre]) => {
  if (p && !p.fini && p.debut && Date.now() - p.debut >= CHRONO) terminer(p, libre, false, true);
});
sauver();
afficher(S.mode === 'libre' && S.libre.partie && jourFini() ? 'libre' : 'jour');
