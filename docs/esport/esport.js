// CLUTCH, le mot du jour esport : une question esport par jour, la réponse est le mot à trouver.
// Même règles que le Mot Mystère classique (vert = bonne place, jaune = ailleurs dans le mot),
// mais le mot fait de 4 à 8 lettres et peut être un nom propre : tout essai de la bonne longueur est accepté.
import { QUESTIONS, DEBUT } from './questions.js';

const TRIES = 6;
const KEY = 'mm-esport:v1';
const URL_JEU = 'https://lesnaufrages-mc.github.io/esport/';

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
const Q = QUESTIONS[(NUM - 1) % QUESTIONS.length];
const ANSWER = Q.m, LEN = ANSWER.length;

// ---------- Sauvegarde (sur l'appareil) ----------
function charger() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.stats) return s; } catch {}
  return { stats: { joues: 0, gagnes: 0, serie: 0, meilleure: 0, dist: [0, 0, 0, 0, 0, 0], dernier: null } };
}
const S = charger();
if (S.jour !== dateLocale()) Object.assign(S, { jour: dateLocale(), essais: [], indice: false, fini: false, gagne: false });
function sauver() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

const maxEssais = () => TRIES - (S.indice ? 1 : 0);
let current = '';

// ---------- Affichage ----------
function renderQuestion() {
  $('num').textContent = 'ROUND #' + NUM;
  $('cat').textContent = Q.c;
  $('scene').textContent = Q.s;
  $('question').textContent = Q.q;
  $('longueur').textContent = LEN + ' lettres';
}

function renderBoard() {
  const board = $('board'); board.textContent = '';
  board.style.setProperty('--n', LEN);
  for (let r = 0; r < TRIES; r++) {
    const row = el('div', 'r');
    if (S.indice && r === TRIES - 1) row.classList.add('lost');
    const g = S.essais[r], cur = r === S.essais.length && !S.fini;
    const res = g ? evaluate(g, ANSWER) : null;
    for (let i = 0; i < LEN; i++) {
      const t = el('div', 't');
      if (g) { t.textContent = g[i]; t.classList.add(res[i]); t.style.animationDelay = (i * 0.08) + 's'; }
      else if (cur && current[i]) { t.textContent = current[i]; t.classList.add('full'); }
      else if (cur && S.indice && i === 0) { t.textContent = ANSWER[0]; t.classList.add('ghost'); }
      row.appendChild(t);
    }
    board.appendChild(row);
  }
  $('indice').disabled = S.indice || S.fini || S.essais.length >= maxEssais() - 1;
  $('indice').textContent = S.indice ? '💡 Première lettre : ' + ANSWER[0] : '💡 Indice : 1re lettre (-1 essai)';
  renderKeyboard();
}

const KB = ['AZERTYUIOP', 'QSDFGHJKLM', '>WXCVBN<'];
function renderKeyboard() {
  const best = {}, rank = { correct: 3, present: 2, absent: 1 };
  S.essais.forEach((g) => evaluate(g, ANSWER).forEach((r, i) => { if ((rank[r] || 0) > (rank[best[g[i]]] || 0)) best[g[i]] = r; }));
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
function secouer() { const r = $('board').children[S.essais.length]; if (r) { r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake'); } }

// ---------- Jouer ----------
function key(k) {
  if (S.fini) return;
  if (k === 'Enter') return valider();
  if (k === 'Backspace') { current = current.slice(0, -1); return renderBoard(); }
  const l = normalize(k);
  if (l.length === 1 && current.length < LEN) { current += l; renderBoard(); }
}

function valider() {
  if (current.length !== LEN) { toast('Le mot fait ' + LEN + ' lettres'); secouer(); return; }
  S.essais.push(current); current = '';
  if (S.essais[S.essais.length - 1] === ANSWER) finir(true);
  else if (S.essais.length >= maxEssais()) finir(false);
  sauver(); renderBoard();
  if (S.fini) setTimeout(renderFin, LEN * 80 + 450);
}

function finir(gagne) {
  S.fini = true; S.gagne = gagne;
  const st = S.stats;
  st.joues++;
  if (gagne) {
    st.gagnes++; st.dist[S.essais.length - 1]++;
    const hier = dateLocale(new Date(Date.now() - 86400000));
    st.serie = st.dernier === hier ? st.serie + 1 : 1;
    st.meilleure = Math.max(st.meilleure, st.serie);
    st.dernier = S.jour;
  } else st.serie = 0;
}

$('indice').onclick = () => {
  if (S.indice || S.fini) return;
  S.indice = true; sauver(); renderBoard();
  toast('Indice pris : ' + maxEssais() + ' essais restants au total');
};

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || !$('v-fin').classList.contains('hide')) return;
  if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zà-ÿ]$/i.test(e.key)) { e.preventDefault(); key(e.key); }
});

// ---------- Fin de partie ----------
function texteRes() {
  const e = { correct: '🟩', present: '🟨', absent: '⬛' };
  const score = S.gagne ? S.essais.length : 'X';
  return 'CLUTCH #' + NUM + ' ' + score + '/' + maxEssais() + (S.indice ? ' 💡' : '') + '\n' +
    S.essais.map((g) => evaluate(g, ANSWER).map((r) => e[r]).join('')).join('\n') + '\n' + URL_JEU;
}

function renderFin() {
  $('v-fin').classList.remove('hide');
  $('voir-res').classList.remove('hide');
  $('fin-titre').textContent = S.gagne ? (S.essais.length === 1 ? 'ACE ! Du premier coup' : 'VICTORY') : 'DEFEAT';
  const w = $('fin-mot'); w.textContent = '';
  [...ANSWER].forEach((l) => w.appendChild(el('div', 't correct', l)));
  $('fin-sous').textContent = S.gagne ? 'GG, trouvé en ' + S.essais.length + ' essai' + (S.essais.length > 1 ? 's' : '') + (S.indice ? ' (avec indice)' : '') : 'La réponse était :';
  $('v-fin').classList.toggle('lose', !S.gagne);
  $('fin-info').textContent = Q.i;
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
    const bar = el('b', S.gagne && S.essais.length === i + 1 ? 'on' : '', String(n));
    bar.style.width = Math.max(8, 100 * n / max) + '%';
    line.appendChild(bar); dist.appendChild(line);
  });
  compteARebours();
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

$('partager').onclick = async () => {
  const text = texteRes();
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Résultat copié !'); } catch { toast('Impossible de copier'); }
};
$('fermer').onclick = () => $('v-fin').classList.add('hide');
$('voir-res').onclick = renderFin;
$('regles-btn').onclick = () => $('regles').classList.toggle('hide');

renderQuestion();
renderBoard();
sauver();
if (S.fini) renderFin();
