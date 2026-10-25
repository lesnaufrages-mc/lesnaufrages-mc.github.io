// Mot Mystère – mode « entre amis ».
// Pas de serveur à nous : les navigateurs se parlent directement (WebRTC) grâce à PeerJS.
// Le serveur gratuit de PeerJS sert juste à se trouver avec le code du salon.
// Celui qui crée le salon (l'hôte) choisit le mot, vérifie les essais et compte les points.
import { WORDS } from './mots.js';

const LEN = 5, TRIES = 6, MAX_PLAYERS = 10;
const PREFIX = 'mot-mystere-naufrages-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I ni O pour éviter les confusions
const AVATARS = ['🦊','🐼','🐸','🐙','🦁','🐧','🐢','🦄','🐝','🐵','🐨','🦖','👻','🤖','👽','🏴‍☠️'];

const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- Logique du mot (identique à l'appli) ----------
function normalize(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, ''); }
function evaluate(guess, answer) {
  const res = Array(LEN).fill('absent'), left = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] !== 'correct' && left[guess[i]] > 0) { res[i] = 'present'; left[guess[i]]--; }
  }
  return res;
}

// ---------- Profil (gardé sur l'appareil) ----------
function loadProfile() {
  try { const p = JSON.parse(localStorage.getItem('mm-profil')); if (p && p.id && p.name) return p; } catch {}
  return null;
}
function saveProfile(p) { try { localStorage.setItem('mm-profil', JSON.stringify(p)); } catch {} }
let me = loadProfile();

// ---------- Écrans ----------
const VIEWS = ['profil', 'accueil', 'salon', 'jeu', 'scores'];
function show(v) {
  VIEWS.forEach((n) => $('v-' + n).classList.toggle('hide', n !== v));
  $('me').classList.toggle('hide', !me || v === 'profil');
  if (me) { $('me-av').textContent = me.avatar; $('me-name').textContent = me.name; }
  window.scrollTo(0, 0);
}
function toast(msg) {
  const t = el('div', 'toast', msg); document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

// ---------- Écran profil ----------
let pickedAvatar = me?.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)];
function renderAvatars() {
  const box = $('avatars'); box.textContent = '';
  AVATARS.forEach((a) => {
    const b = el('button', a === pickedAvatar ? 'on' : '', a);
    b.type = 'button'; b.setAttribute('aria-label', 'Avatar ' + a);
    b.onclick = () => { pickedAvatar = a; renderAvatars(); };
    box.appendChild(b);
  });
}
function openProfile() {
  $('pseudo').value = me?.name || '';
  renderAvatars(); show('profil'); $('pseudo').focus();
}
$('save-profil').onclick = () => {
  const name = $('pseudo').value.trim().replace(/\s+/g, ' ').slice(0, 16);
  if (name.length < 2) { $('err-profil').textContent = 'Il faut au moins 2 caractères.'; return; }
  me = { id: me?.id || crypto.randomUUID(), name, avatar: pickedAvatar };
  saveProfile(me); $('err-profil').textContent = '';
  if (room) { show(currentView()); return; }
  const code = new URLSearchParams(location.search).get('salon');
  if (code) { $('code').value = code.toUpperCase(); join(code); } else show('accueil');
};
$('pseudo').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('save-profil').click(); });
$('me').onclick = () => { if (!room) openProfile(); else toast('Change de pseudo en dehors d\'un salon'); };

// ---------- Réseau ----------
let peer = null, room = null; // room = { code, host: bool }
let hostConn = null;          // invité : connexion vers l'hôte
const conns = new Map();      // hôte : id joueur -> connexion

function newPeer(id) {
  return new Promise((resolve, reject) => {
    const opts = window.MM_PEER_OPTS || {}; // seulement pour les tests en local
    const p = id ? new Peer(id, opts) : new Peer(opts);
    p.on('open', () => resolve(p));
    p.on('error', (e) => reject(e));
  });
}
function randomCode() { let c = ''; for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; }
function inviteLink() { return location.origin + location.pathname + '?salon=' + room.code; }

async function create() {
  $('err-accueil').textContent = ''; $('creer').disabled = true;
  try {
    for (let i = 0; i < 4 && !peer; i++) {
      const code = randomCode();
      try { peer = await newPeer(PREFIX + code); room = { code, host: true }; }
      catch (e) { if (e.type !== 'unavailable-id') throw e; }
    }
    if (!peer) throw new Error('code');
    peer.on('connection', onGuestConnection);
    peer.on('error', (e) => console.warn('peer', e));
    peer.on('disconnected', () => peer.reconnect());
    H.reset();
    H.addPlayer(me, true);
    history.replaceState(null, '', '?salon=' + room.code);
    render();
  } catch (e) {
    console.error(e); leave(false);
    $('err-accueil').textContent = 'Impossible de créer le salon. Vérifie ta connexion et réessaie.';
  } finally { $('creer').disabled = false; }
}

async function join(raw) {
  const code = normalize(raw || '').slice(0, 5);
  $('err-accueil').textContent = '';
  if (code.length !== 5) { $('err-accueil').textContent = 'Le code fait 5 lettres.'; show('accueil'); return; }
  show('accueil'); $('rejoindre').disabled = true; $('rejoindre').textContent = 'Connexion…';
  try {
    peer = await newPeer();
    room = { code, host: false };
    await new Promise((resolve, reject) => {
      const c = peer.connect(PREFIX + code, { reliable: true });
      const timer = setTimeout(() => reject(new Error('timeout')), 12000);
      peer.on('error', (e) => { clearTimeout(timer); reject(e); });
      c.on('open', () => { clearTimeout(timer); hostConn = c; hostSeen = Date.now(); c.send({ t: 'hello', p: me }); resolve(); });
      c.on('data', onHostMessage);
      c.on('close', () => { if (room && !room.host && hostConn === c) rejoin(); });
    });
    history.replaceState(null, '', '?salon=' + code);
  } catch (e) {
    console.error(e); leave(false);
    $('err-accueil').textContent = e.type === 'peer-unavailable' || e.message === 'timeout'
      ? 'Salon introuvable. Vérifie le code (l\'hôte doit garder la page ouverte).'
      : 'Connexion impossible. Vérifie ta connexion et réessaie.';
    show('accueil');
  } finally { $('rejoindre').disabled = false; $('rejoindre').textContent = 'Rejoindre'; }
}

// Connexion coupée (réseau, veille du téléphone…) : on retente une fois avec le même code.
// L'hôte nous reconnaît grâce à notre identifiant et on garde nos points.
function rejoin() { const code = room.code; leave(false); toast('Reconnexion…'); join(code); }

function leave(goHome = true) {
  const old = peer;
  peer = null; room = null; hostConn = null;
  try { old?.destroy(); } catch {} conns.clear(); S = null; mine = null;
  clearInterval(H.tick); clearTimeout(H.timeout);
  history.replaceState(null, '', location.pathname);
  if (goHome) show('accueil');
}

// Envoyer une action à l'hôte (ou à soi-même si on est l'hôte)
function send(msg) {
  if (!room) return;
  if (room.host) H.handle(me.id, msg); else hostConn?.send(msg);
}

// ---------- Hôte : il fait tourner la partie ----------
const H = {
  answer: null, used: new Set(), guesses: {}, tick: null, timeout: null, startedAt: 0,
  reset() {
    S = { phase: 'lobby', players: [], round: 0, rounds: 5, duration: 120, remain: 0, progress: {}, done: {}, gain: {}, word: null };
    this.used.clear();
  },
  addPlayer(p, isHost = false) {
    const old = S.players.find((x) => x.id === p.id);
    if (old) { old.name = p.name; old.avatar = p.avatar; old.online = true; }
    else S.players.push({ id: p.id, name: String(p.name).slice(0, 16), avatar: String(p.avatar).slice(0, 8), score: 0, online: true, host: isHost });
  },
  broadcast() {
    if (S.phase === 'play') S.remain = Math.max(0, this.startedAt + S.duration * 1000 - Date.now());
    const pub = JSON.parse(JSON.stringify(S));
    for (const c of conns.values()) if (c.open) c.send({ t: 'state', s: pub });
    onState(pub);
  },
  sendTo(id, msg) {
    if (id === me.id) onHostMessage(msg); else conns.get(id)?.send(msg);
  },
  start(rounds, duration) {
    S.rounds = rounds; S.duration = duration; S.round = 0;
    S.players.forEach((p) => (p.score = 0));
    this.used.clear(); this.nextRound();
  },
  nextRound() {
    S.round++;
    let w; do { w = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (this.used.has(w) && this.used.size < WORDS.length);
    this.used.add(w); this.answer = w;
    S.phase = 'play'; S.word = null; S.progress = {}; S.done = {}; S.gain = {}; this.guesses = {};
    this.startedAt = Date.now();
    clearTimeout(this.timeout); clearInterval(this.tick);
    this.timeout = setTimeout(() => this.endRound(), S.duration * 1000);
    this.broadcast();
  },
  endRound() {
    if (S.phase !== 'play') return;
    clearTimeout(this.timeout);
    S.phase = S.round >= S.rounds ? 'end' : 'scores';
    S.word = this.answer;
    S.players.forEach((p) => { if (!S.gain[p.id]) S.gain[p.id] = 0; });
    this.broadcast();
  },
  checkAllDone() {
    const active = S.players.filter((p) => p.online);
    if (active.length && active.every((p) => S.done[p.id])) setTimeout(() => this.endRound(), 1200);
  },
  handle(id, m) {
    if (!m || typeof m !== 'object') return;
    const host = id === me.id;
    if (m.t === 'guess' && S.phase === 'play') {
      if (S.done[id]) return;
      const word = normalize(String(m.word || ''));
      if (word.length !== LEN) return this.sendTo(id, { t: 'bad', msg: 'Il faut 5 lettres' });
      const list = (this.guesses[id] ||= []);
      const states = evaluate(word, this.answer);
      list.push({ word, states });
      (S.progress[id] ||= []).push(states);
      const won = word === this.answer;
      if (won || list.length >= TRIES) {
        const secondsLeft = Math.max(0, S.duration - (Date.now() - this.startedAt) / 1000);
        const first = won && !Object.values(S.done).some((d) => d.won);
        const pts = won ? (TRIES + 1 - list.length) * 20 + Math.round((secondsLeft / S.duration) * 50) + (first ? 30 : 0) : 0;
        S.done[id] = { won, tries: list.length, first };
        S.gain[id] = pts;
        const p = S.players.find((x) => x.id === id); if (p) p.score += pts;
      }
      this.broadcast();
      this.sendTo(id, { t: 'result', round: S.round, word, states });
      this.checkAllDone();
    } else if (host && m.t === 'start' && S.phase === 'lobby') {
      this.start(Number(m.rounds) || 5, Number(m.duration) || 120);
    } else if (host && m.t === 'next' && S.phase === 'scores') {
      this.nextRound();
    } else if (host && m.t === 'again' && S.phase === 'end') {
      S.phase = 'lobby'; S.round = 0; S.players = S.players.filter((p) => p.online);
      S.players.forEach((p) => (p.score = 0)); this.broadcast();
    }
  },
};

function onGuestConnection(c) {
  let pid = null;
  c.lastSeen = Date.now();
  c.on('data', (m) => {
    c.lastSeen = Date.now();
    if (!m || typeof m !== 'object' || m.t === 'ping') return;
    if (m.t === 'hello' && !pid) {
      const p = m.p || {};
      if (typeof p.id !== 'string' || !p.name) return c.close();
      const known = S.players.some((x) => x.id === p.id);
      if (!known && S.players.filter((x) => x.online).length >= MAX_PLAYERS) { c.send({ t: 'full' }); return setTimeout(() => c.close(), 300); }
      pid = p.id;
      conns.get(pid)?.close();
      conns.set(pid, c);
      H.addPlayer(p);
      H.broadcast();
      // Quelqu'un qui revient en pleine manche retrouve ses essais
      if (S.phase === 'play' && H.guesses[pid]) c.send({ t: 'mine', round: S.round, list: H.guesses[pid] });
    } else if (pid) H.handle(pid, m);
  });
  c.on('close', () => {
    if (!pid || conns.get(pid) !== c) return;
    conns.delete(pid);
    const p = S.players.find((x) => x.id === pid);
    if (p) {
      if (S.phase === 'lobby') S.players = S.players.filter((x) => x.id !== pid);
      else p.online = false;
    }
    H.broadcast();
    if (S.phase === 'play') H.checkAllDone();
  });
}

// ---------- Côté joueur (hôte compris) ----------
let S = null;     // état public reçu de l'hôte
let mine = null;  // { round, list: [{word, states}], current }
let endsAt = 0;
let hostSeen = 0;

// Battement de cœur : une fenêtre fermée ou un téléphone en veille ne prévient pas toujours.
// Sans nouvelles pendant 15 s, on considère la personne comme partie.
setInterval(() => {
  if (!room) return;
  if (room.host) {
    for (const c of conns.values()) { if (Date.now() - c.lastSeen > 15000) c.close(); else if (c.open) c.send({ t: 'ping' }); }
  } else if (hostConn) {
    if (Date.now() - hostSeen > 15000) rejoin();
    else hostConn.send({ t: 'ping' });
  }
}, 4000);

function onHostMessage(m) {
  hostSeen = Date.now();
  if (!m || typeof m !== 'object' || m.t === 'ping') return;
  if (m.t === 'state') { if (!room.host) S = m.s; onState(S); }
  else if (m.t === 'result') {
    if (!mine || mine.round !== m.round) return;
    mine.list.push({ word: m.word, states: m.states }); mine.current = ''; mine.wait = false;
    renderGame(true);
  } else if (m.t === 'mine') { mine = { round: m.round, list: m.list, current: '' }; renderGame(); }
  else if (m.t === 'bad') { if (mine) mine.wait = false; toast(m.msg); }
  else if (m.t === 'full') { leave(false); $('err-accueil').textContent = 'Ce salon est plein (10 joueurs max).'; show('accueil'); }
}

function currentView() {
  if (!S) return 'accueil';
  return { lobby: 'salon', play: 'jeu', scores: 'scores', end: 'scores' }[S.phase];
}
function onState(s) {
  S = s;
  if (s.phase === 'play') {
    endsAt = Date.now() + s.remain;
    if (!mine || mine.round !== s.round) mine = { round: s.round, list: [], current: '' };
  }
  render();
}
function render() {
  if (!S) return;
  const v = currentView();
  show(v);
  if (v === 'salon') renderLobby();
  else if (v === 'jeu') renderGame();
  else renderScores();
}

function playerCard(p, extra) {
  const d = el('div', 'player' + (p.online ? '' : ' off'));
  d.appendChild(el('div', 'av', p.avatar));
  const t = el('div'); t.style.minWidth = '0';
  const b = el('b', '', p.name); t.appendChild(b);
  t.appendChild(el('small', p.host ? 'crown' : '', p.host ? '👑 Hôte' : (p.id === me.id ? 'Toi' : extra || 'Prêt')));
  d.appendChild(t);
  return d;
}

function renderLobby() {
  $('salon-code').textContent = room.code;
  $('nb').textContent = S.players.length;
  const box = $('players'); box.textContent = '';
  S.players.forEach((p) => box.appendChild(playerCard(p)));
  $('host-zone').classList.toggle('hide', !room.host);
  $('wait-host').classList.toggle('hide', room.host);
  $('lancer').disabled = S.players.length < 1;
  $('lancer').textContent = S.players.length < 2 ? '▶ Lancer (seul, en attendant les amis)' : `▶ Lancer la partie (${S.players.length} joueurs)`;
}

const KB = ['AZERTYUIOP', 'QSDFGHJKLM', '>WXCVBN<'];
function buildKeyboard() {
  const kb = $('kb'); kb.textContent = '';
  KB.forEach((row) => {
    const r = el('div');
    [...row].forEach((k) => {
      const b = el('button', k === '>' || k === '<' ? 'wide' : '', k === '>' ? 'ENTRER' : k === '<' ? '⌫' : k);
      b.type = 'button'; b.dataset.k = k;
      b.onclick = () => press(k === '>' ? 'Enter' : k === '<' ? 'Backspace' : k);
      r.appendChild(b);
    });
    kb.appendChild(r);
  });
}
buildKeyboard();

function press(k) {
  if (!S || S.phase !== 'play' || !mine || mine.wait) return;
  if (S.done[me.id] || mine.list.length >= TRIES) return;
  if (k === 'Enter') {
    if (mine.current.length !== LEN) { toast('Il faut 5 lettres'); shake(); return; }
    mine.wait = true; send({ t: 'guess', word: mine.current });
  } else if (k === 'Backspace') mine.current = mine.current.slice(0, -1);
  else if (/^[A-Z]$/.test(k) && mine.current.length < LEN) mine.current += k;
  renderGame();
}
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || document.activeElement?.tagName === 'INPUT') return;
  if (e.key === 'Enter' || e.key === 'Backspace') { e.preventDefault(); press(e.key); }
  else { const k = normalize(e.key); if (k.length === 1) press(k); }
});
function shake() { const rows = $('board').children; const r = rows[mine.list.length]; if (r) { r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake'); } }

function renderGame(justPlayed = false) {
  if (!S || S.phase !== 'play' || !mine) return;
  $('manche').textContent = `Manche ${S.round}/${S.rounds}`;
  const board = $('board'); board.textContent = '';
  for (let r = 0; r < TRIES; r++) {
    const row = el('div', 'r');
    const g = mine.list[r];
    const txt = g ? g.word : r === mine.list.length ? mine.current : '';
    for (let c = 0; c < LEN; c++) {
      const t = el('div', 't' + (txt[c] ? ' full' : ''), txt[c] || '');
      if (g) { t.classList.add(g.states[c]); if (!(justPlayed && r === mine.list.length - 1)) t.style.animation = 'none'; else t.style.animationDelay = c * 0.12 + 's'; }
      row.appendChild(t);
    }
    board.appendChild(row);
  }
  // Clavier coloré
  const rank = { absent: 1, present: 2, correct: 3 }, best = {};
  mine.list.forEach((g) => g.states.forEach((s, i) => { const L = g.word[i]; if (!best[L] || rank[s] > rank[best[L]]) best[L] = s; }));
  document.querySelectorAll('#kb button').forEach((b) => { b.classList.remove('correct', 'present', 'absent'); if (best[b.dataset.k]) b.classList.add(best[b.dataset.k]); });
  // Message
  const d = S.done[me.id];
  $('status').textContent = d ? (d.won ? `Bravo ! +${S.gain[me.id]} points${d.first ? ' (premier !)' : ''}. On attend les autres…` : 'Raté… on attend les autres.') : '';
  // Les autres joueurs : on voit leurs couleurs, jamais leurs lettres
  const box = $('others'); box.textContent = '';
  S.players.filter((p) => p.id !== me.id).forEach((p) => {
    const o = el('div', 'other' + (p.online ? '' : ' off'));
    o.appendChild(el('div', 'av', p.avatar));
    const info = el('div'); info.style.minWidth = '0';
    info.appendChild(el('div', 'nm', p.name));
    const dd = S.done[p.id];
    info.appendChild(el('div', dd ? 'done' : 'muted small', dd ? (dd.won ? `✓ trouvé en ${dd.tries}` : '✗ raté') : p.online ? 'cherche…' : 'déconnecté'));
    o.appendChild(info);
    const mini = el('div', 'mini');
    (S.progress[p.id] || []).forEach((states) => { const r = el('div', 'r'); states.forEach((s) => r.appendChild(el('i', s))); mini.appendChild(r); });
    o.appendChild(mini);
    box.appendChild(o);
  });
  if (!box.children.length) box.appendChild(el('p', 'muted small', 'Invite des amis avec le code ' + room.code + ' !'));
  updateTimer();
}

function updateTimer() {
  if (!S || S.phase !== 'play') return;
  const s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  $('timer').textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('timer').classList.toggle('low', s <= 15);
}
setInterval(updateTimer, 250);

function renderScores() {
  const end = S.phase === 'end';
  $('res-titre').textContent = end ? `Partie terminée ! Le dernier mot était :` : `Manche ${S.round}/${S.rounds} – le mot était :`;
  const w = $('res-mot'); w.textContent = '';
  [...(S.word || '')].forEach((L) => w.appendChild(el('div', 't correct', L)));
  $('res-classement').textContent = end ? '🏆 Classement final' : 'Classement';
  const rank = $('rank'); rank.textContent = '';
  rank.classList.toggle('podium', end);
  const sorted = [...S.players].sort((a, b) => b.score - a.score);
  sorted.forEach((p, i) => {
    const line = el('div', 'line');
    line.appendChild(el('div', 'pos', end && i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)));
    line.appendChild(el('div', 'av', p.avatar));
    line.appendChild(el('div', 'nm', p.name + (p.id === me.id ? ' (toi)' : '')));
    const pts = el('div', 'pts', p.score + ' pts');
    if (!end && S.gain[p.id]) pts.appendChild(el('span', 'plus', '+' + S.gain[p.id]));
    line.appendChild(pts);
    rank.appendChild(line);
  });
  $('suivant').classList.toggle('hide', end || !room.host);
  $('fin-zone').classList.toggle('hide', !end);
  $('rejouer').classList.toggle('hide', !room.host);
  $('res-wait').textContent = room.host ? '' : end ? 'L\'hôte peut relancer une partie.' : 'L\'hôte va lancer la manche suivante…';
}

// ---------- Boutons ----------
$('creer').onclick = create;
$('rejoindre').onclick = () => join($('code').value);
$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') join($('code').value); });
$('code').addEventListener('input', (e) => { e.target.value = normalize(e.target.value).slice(0, 5); });
$('lancer').onclick = () => send({ t: 'start', rounds: $('manches').value, duration: $('duree').value });
$('suivant').onclick = () => send({ t: 'next' });
$('rejouer').onclick = () => send({ t: 'again' });
$('quitter').onclick = () => leave();
$('copier').onclick = async () => {
  try { await navigator.clipboard.writeText(inviteLink()); toast('Lien copié !'); }
  catch { prompt('Copie ce lien :', inviteLink()); }
};
$('partager').onclick = async () => {
  const text = `Viens jouer à Mot Mystère avec moi ! Code : ${room.code}`;
  if (navigator.share) { try { await navigator.share({ title: 'Mot Mystère', text, url: inviteLink() }); } catch {} }
  else $('copier').click();
};
window.addEventListener('beforeunload', (e) => {
  if (room?.host && S && S.players.length > 1) { e.preventDefault(); e.returnValue = ''; }
});

// ---------- Démarrage ----------
if (typeof Peer === 'undefined') {
  show('accueil');
  $('err-accueil').textContent = 'Le mode multijoueur n\'a pas pu se charger. Recharge la page.';
} else if (!me) openProfile();
else {
  const code = new URLSearchParams(location.search).get('salon');
  if (code) { $('code').value = code.toUpperCase(); join(code); } else show('accueil');
}
