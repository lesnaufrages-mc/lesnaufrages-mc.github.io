import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_TRIES, WORD_LENGTH, dayNumber, evaluate, keyboardStates, normalize, randomWord, shareText, wordOfTheDay,
} from './src/game';
import { initAds, showRewardedAd } from './src/ads';
import { PAGES, SAISON, pageDuJour } from './src/journal';
import {
  NIVEAUX, NIVEAU_DEFAUT, coutIndices, indicesDispo, lettresFilet, motifLettres, niveauValide, peutOuvrir, prochaineLettre,
} from './src/indices';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', '⌫WXCVBN↵'];
// Couleurs « Les Naufragés » : le gris des autres jeux devient le bleu de la mer.
const COLORS = { correct: '#3aa757', present: '#e2b93b', absent: '#1f4a5c', empty: '#0d1b21' };
const STORAGE_KEY = 'motmystere:v1';
// Sur le web il n'y a pas de pub dans le jeu : la page se repêche gratuitement.
const FISH_LABEL = Platform.OS === 'web' ? 'Repêcher la page' : 'Repêcher la page (pub)';

const emptyStats = { played: 0, wins: 0, streak: 0, best: 0, lastDay: 0 };

export default function App() {
  const day = dayNumber();
  const [mode, setMode] = useState('daily'); // 'daily' ou 'bonus'
  const [answer, setAnswer] = useState(wordOfTheDay());
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState('');
  const [stats, setStats] = useState(emptyStats);
  const [niveau, setNiveau] = useState(NIVEAU_DEFAUT); // mousse, matelot ou capitaine
  const [indices, setIndices] = useState([]); // indices ouverts, dans l'ordre (ex. ['bouteille', 'filet'])
  const [lettres, setLettres] = useState([]); // positions montrées par la longue-vue et la boussole
  const [filet, setFilet] = useState([]); // fausses lettres enlevées du clavier
  const [pages, setPages] = useState([]); // jours dont la page du journal est débloquée
  const [journal, setJournal] = useState(false); // écran « Mon journal » ouvert

  const page = mode === 'daily' ? pageDuJour(day) : null;
  const essaisIndices = coutIndices(niveau, indices.length);
  const maxTries = MAX_TRIES - essaisIndices;
  const won = guesses.includes(answer);
  const over = won || guesses.length >= maxTries;

  // Recharge la partie du jour et les stats.
  useEffect(() => {
    initAds();
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      setStats(saved.stats || emptyStats);
      setPages(saved.pages || []);
      if (saved.niveau) setNiveau(niveauValide(saved.niveau));
      if (saved.day === day) {
        setGuesses(saved.guesses || []);
        // Anciennes parties : la bouteille coûtait 1 essai, comme au niveau Capitaine.
        if (saved.bouteille && !saved.indices) {
          setIndices(['bouteille']);
          setNiveau(saved.niveau ? niveauValide(saved.niveau) : 'capitaine');
        }
        setIndices((v) => saved.indices || v);
        setLettres(saved.lettres || []);
        setFilet(saved.filet || []);
      }
    });
  }, []);

  function save(nextGuesses, nextStats, {
    nextIndices = indices, nextLettres = lettres, nextFilet = filet, nextPages = pages, nextNiveau = niveau,
  } = {}) {
    // Les pages du journal se gardent aussi après une partie bonus.
    const daily = mode === 'daily';
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const old = raw ? JSON.parse(raw) : {};
      const data = daily
        ? {
          day, guesses: nextGuesses, indices: nextIndices, lettres: nextLettres, filet: nextFilet,
          niveau: nextNiveau, stats: nextStats, pages: nextPages,
        }
        : { ...old, pages: nextPages, niveau: nextNiveau };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    });
  }

  function unlock(n) {
    if (pages.includes(n)) return pages;
    const next = [...pages, n].sort((a, b) => a - b);
    setPages(next);
    return next;
  }

  // Les indices s'ouvrent tout de suite. Selon le niveau, ils sont gratuits ou coûtent 1 essai.
  function openHint(id) {
    if (over || indices.includes(id) || !peutOuvrir(niveau, indices, guesses.length)) return;
    let nextLettres = lettres;
    let nextFilet = filet;
    if (id === 'longuevue' || id === 'boussole') {
      const pos = prochaineLettre(answer, guesses, lettres);
      if (pos === null) return;
      nextLettres = [...lettres, pos];
      setLettres(nextLettres);
    }
    if (id === 'filet') {
      nextFilet = lettresFilet(answer, guesses);
      setFilet(nextFilet);
    }
    const nextIndices = [...indices, id];
    setIndices(nextIndices);
    save(guesses, stats, { nextIndices, nextLettres, nextFilet });
  }

  // Le niveau se choisit avant de commencer la partie.
  function chooseLevel(n) {
    if (guesses.length || indices.length) return;
    setNiveau(n);
    save(guesses, stats, { nextNiveau: n });
  }

  // Page perdue (partie ratée ou jour manqué) : on la repêche avec une pub récompensée.
  async function fishPage(n) {
    const ok = await showRewardedAd();
    if (!ok) return;
    const nextPages = unlock(n);
    save(guesses, stats, { nextPages });
  }

  function submit() {
    if (current.length !== WORD_LENGTH) return Alert.alert('Il faut 5 lettres');
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent('');
    const finished = current === answer || next.length >= maxTries;
    let nextStats = stats;
    let nextPages = pages;
    if (finished && mode === 'daily') {
      const win = current === answer;
      const streak = win ? (stats.lastDay === day - 1 ? stats.streak + 1 : 1) : 0;
      nextStats = {
        played: stats.played + 1, wins: stats.wins + (win ? 1 : 0),
        streak, best: Math.max(stats.best, streak), lastDay: day,
      };
      setStats(nextStats);
      if (win && page) nextPages = unlock(day);
    }
    save(next, nextStats, { nextPages });
  }

  function press(key) {
    if (over || journal) return;
    if (key === '↵') return submit();
    if (key === '⌫') return setCurrent(current.slice(0, -1));
    if (current.length < WORD_LENGTH) setCurrent(normalize(current + key));
  }

  async function share() {
    const rows = guesses.map((g) => evaluate(g, answer));
    const emojis = indices.map((id) => indicesDispo(true).find((i) => i.id === id).emoji).join('');
    const marques = ` ${emojis}${emojis ? ' ' : ''}${NIVEAUX[niveau].emoji}`;
    const message = shareText(rows, won, day, { page, essaisIndices, marques });
    // Sur ordinateur, le navigateur ne sait souvent pas partager : on copie le texte à la place.
    if (Platform.OS === 'web' && !navigator.share) {
      await navigator.clipboard.writeText(message);
      window.alert('Résultat copié ! Colle-le où tu veux.');
      return;
    }
    await Share.share({ message });
  }

  // Sur le web, on peut aussi jouer avec le clavier de l'ordinateur.
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key === 'Enter' ? '↵' : e.key === 'Backspace' ? '⌫' : normalize(e.key);
      if (key.length === 1) pressRef.current(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Partie bonus débloquée par une pub récompensée : c'est la source de revenus principale.
  async function playBonus() {
    const ok = await showRewardedAd();
    if (!ok) return;
    setMode('bonus');
    setAnswer(randomWord());
    setGuesses([]);
    setCurrent('');
    setIndices([]);
    setLettres([]);
    setFilet([]);
  }

  const keys = keyboardStates(guesses, answer);
  filet.forEach((l) => { if (!keys[l]) keys[l] = 'absent'; });
  const rows = Array.from({ length: maxTries }, (_, i) => guesses[i] ?? (i === guesses.length ? current : ''));

  if (journal) {
    // « Mon journal » : toutes les pages de la saison jusqu'à aujourd'hui.
    const visibles = PAGES.slice(0, Math.max(0, Math.min(day, PAGES.length)));
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <Text style={styles.title}>MON JOURNAL</Text>
        <Text style={styles.subtitle}>
          Saison {SAISON} · {pages.length}/{PAGES.length} pages retrouvées
        </Text>
        <ScrollView style={styles.journal} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {visibles.map((p, i) => {
            const n = i + 1;
            const found = pages.includes(n);
            const today = n === day && mode === 'daily' && !over;
            return (
              <View key={n} style={[styles.page, !found && styles.pageLost]}>
                <Text style={styles.pageNum}>Page {n}</Text>
                {found ? (
                  <>
                    <Text style={styles.pageTitle}>{p.titre}</Text>
                    <Text style={styles.pageText}>{p.texte}</Text>
                  </>
                ) : today ? (
                  <Text style={[styles.pageText, styles.lostText]}>Trouve le mot du jour pour lire cette page.</Text>
                ) : (
                  <>
                    <Text style={[styles.pageText, styles.lostText]}>Cette page a été emportée par la marée…</Text>
                    <Pressable style={styles.small} onPress={() => fishPage(n)}>
                      <Text style={styles.smallText}>{FISH_LABEL}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })}
          {day > PAGES.length && (
            <Text style={styles.stats}>La saison {SAISON + 1} arrive bientôt. Le naufragé n'a pas dit son dernier mot.</Text>
          )}
        </ScrollView>
        <Pressable style={[styles.button, { marginBottom: 24 }]} onPress={() => setJournal(false)}>
          <Text style={styles.buttonText}>Retour au jeu</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const pageOuverte = page && pages.includes(day);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.title}>MOT MYSTÈRE</Text>
      <Text style={styles.subtitle}>
        {mode === 'daily'
          ? (page ? `Journal du naufragé · page ${day}` : `Mot du jour #${day}`)
          : 'Partie bonus'} · série {stats.streak}
      </Text>
      <Pressable style={styles.link} onPress={() => setJournal(true)}>
        <Text style={styles.linkText}>Mon journal ({pages.length}/{PAGES.length})</Text>
      </Pressable>
      <View style={styles.levels}>
        {Object.entries(NIVEAUX).map(([id, n]) => {
          const choisi = id === niveau;
          const bloque = !choisi && (guesses.length > 0 || indices.length > 0);
          return (
            <Pressable
              key={id}
              onPress={() => chooseLevel(id)}
              style={[styles.chip, choisi && styles.chipOn, bloque && styles.chipOff]}
            >
              <Text style={[styles.chipText, choisi && styles.chipTextOn]}>{n.emoji} {n.nom}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.grid}>
        {rows.map((word, r) => {
          const states = r < guesses.length ? evaluate(word, answer) : null;
          return (
            <View key={r} style={styles.row}>
              {Array.from({ length: WORD_LENGTH }, (_, c) => (
                <View
                  key={c}
                  style={[styles.cell, { backgroundColor: COLORS[states ? states[c] : 'empty'] },
                    !states && word[c] && styles.cellTyped]}
                >
                  <Text style={styles.cellText}>{word[c] || ''}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>

      {!over && (
        <View style={styles.hints}>
          <Text style={styles.hintsHead}>
            Indices · {NIVEAUX[niveau].aide}
          </Text>
          <View style={styles.levels}>
            {indicesDispo(!!page).map((i) => {
              const ouvert = indices.includes(i.id);
              const payant = coutIndices(niveau, indices.length + 1) > essaisIndices;
              const possible = !ouvert && peutOuvrir(niveau, indices, guesses.length)
                && (i.id === 'bouteille' || i.id === 'filet' || prochaineLettre(answer, guesses, lettres) !== null);
              return (
                <Pressable
                  key={i.id}
                  onPress={() => openHint(i.id)}
                  style={[styles.chip, ouvert && styles.chipOn, !ouvert && !possible && styles.chipOff]}
                >
                  <Text style={[styles.chipText, ouvert && styles.chipTextOn]}>
                    {i.emoji} {i.court}{ouvert ? ' ✓' : payant ? ' (−1 essai)' : ' (gratuit)'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {indices.includes('bouteille') && page && (
            <Text style={styles.hint}>
              🍾 « {page.indice} »{niveau === 'mousse' && page.facile ? `\n💡 Plus simple : ${page.facile}` : ''}
            </Text>
          )}
          {lettres.length > 0 && (
            <Text style={styles.hintLetters}>🔭 {motifLettres(answer, lettres)}</Text>
          )}
          {filet.length > 0 && (
            <Text style={styles.hint}>🎣 Pas dans le mot : {filet.join(' ')}</Text>
          )}
        </View>
      )}

      {over ? (
        <ScrollView style={styles.endScroll} contentContainerStyle={styles.end}>
          <Text style={styles.endText}>{won ? 'Bravo !' : `Le mot était ${answer}`}</Text>
          {page && (pageOuverte ? (
            <View style={styles.page}>
              <Text style={styles.pageNum}>Page {day} débloquée</Text>
              <Text style={styles.pageTitle}>{page.titre}</Text>
              <Text style={styles.pageText}>{page.texte}</Text>
              <Text style={styles.pageNext}>La suite demain…</Text>
            </View>
          ) : (
            <View style={[styles.page, styles.pageLost]}>
              <Text style={[styles.pageText, styles.lostText]}>La page {day} du journal a coulé avec ta partie…</Text>
              <Pressable style={styles.small} onPress={() => fishPage(day)}>
                <Text style={styles.smallText}>{FISH_LABEL}</Text>
              </Pressable>
            </View>
          ))}
          {mode === 'daily' && (
            <Pressable style={[styles.button, styles.share]} onPress={share}>
              <Text style={styles.buttonText}>Partager mon score</Text>
            </Pressable>
          )}
          <Pressable style={styles.button} onPress={playBonus}>
            <Text style={styles.buttonText}>Rejouer (partie bonus)</Text>
          </Pressable>
          <Text style={styles.stats}>
            {stats.played} parties · {stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}% gagnées · record {stats.best}
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.keyboard}>
          {KEY_ROWS.map((row) => (
            <View key={row} style={styles.row}>
              {[...row].map((k) => (
                <Pressable
                  key={k}
                  onPress={() => press(k)}
                  style={[styles.key, k === '↵' || k === '⌫' ? styles.keyWide : null,
                    keys[k] && { backgroundColor: COLORS[keys[k]] }]}
                >
                  <Text style={styles.keyText}>{k}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

// Couleurs du site « Les Naufragés » : nuit en mer, sable et corde.
const SAND = '#e3c98f';
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d1b21', alignItems: 'center', paddingTop: 20 },
  title: { color: '#f1ead8', fontSize: 30, fontWeight: '800', letterSpacing: 3 },
  subtitle: { color: '#9db1ae', marginTop: 4 },
  link: { paddingVertical: 8, paddingHorizontal: 12 },
  linkText: { color: SAND, fontWeight: '700', textDecorationLine: 'underline' },
  grid: { gap: 6 },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  cell: { width: 54, height: 54, borderWidth: 2, borderColor: '#22404a', alignItems: 'center', justifyContent: 'center' },
  cellTyped: { borderColor: SAND },
  cellText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  hints: { alignItems: 'center', marginTop: 8, paddingHorizontal: 8, maxWidth: 460 },
  hintsHead: { color: '#9db1ae', fontSize: 12, marginBottom: 4, textAlign: 'center' },
  hintLetters: { color: SAND, marginTop: 6, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 6 },
  chip: { borderWidth: 1, borderColor: '#22404a', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10 },
  chipOn: { backgroundColor: SAND, borderColor: SAND },
  chipOff: { opacity: 0.4 },
  chipText: { color: '#cfdad8', fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#0d1b21' },
  hint: { color: SAND, marginTop: 6, paddingHorizontal: 20, textAlign: 'center', maxWidth: 420, fontStyle: 'italic' },
  keyboard: { marginTop: 'auto', marginBottom: 24, gap: 8 },
  key: { backgroundColor: '#4a6a70', borderRadius: 4, minWidth: 32, height: 52, alignItems: 'center', justifyContent: 'center' },
  keyWide: { minWidth: 48 },
  keyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  endScroll: { marginTop: 16, alignSelf: 'stretch' },
  end: { alignItems: 'center', gap: 12, paddingBottom: 24, paddingHorizontal: 16 },
  endText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  page: { backgroundColor: '#f1e3bf', borderLeftWidth: 6, borderLeftColor: '#d9774b', borderRadius: 6, padding: 14, maxWidth: 420, alignSelf: 'center', width: '100%' },
  pageLost: { backgroundColor: '#142b33', borderLeftColor: '#22404a' },
  lostText: { color: '#9db1ae', fontStyle: 'italic' },
  pageNum: { color: '#b85f37', fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  pageTitle: { color: '#2a1d10', fontSize: 18, fontWeight: '800', marginTop: 2 },
  pageText: { color: '#3b2c1a', fontSize: 15, lineHeight: 21, marginTop: 4 },
  pageNext: { color: '#b85f37', fontStyle: 'italic', marginTop: 6 },
  small: { backgroundColor: '#d9774b', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, marginTop: 8, alignSelf: 'flex-start' },
  smallText: { color: '#fff', fontWeight: '700' },
  journal: { alignSelf: 'stretch', paddingHorizontal: 16, marginTop: 12 },
  button: { backgroundColor: '#1b3740', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, minWidth: 260, alignItems: 'center' },
  share: { backgroundColor: '#3aa757' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stats: { color: '#9db1ae', marginTop: 8, textAlign: 'center' },
});
