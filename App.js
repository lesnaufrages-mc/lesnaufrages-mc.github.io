import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_TRIES, WORD_LENGTH, dayNumber, evaluate, keyboardStates, normalize, randomWord, shareText, wordOfTheDay,
} from './src/game';
import { initAds, showRewardedAd } from './src/ads';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', '⌫WXCVBN↵'];
const COLORS = { correct: '#3aa757', present: '#e2b93b', absent: '#3a3a3c', empty: '#121213' };
const STORAGE_KEY = 'motmystere:v1';

const emptyStats = { played: 0, wins: 0, streak: 0, best: 0, lastDay: 0 };

export default function App() {
  const day = dayNumber();
  const [mode, setMode] = useState('daily'); // 'daily' ou 'bonus'
  const [answer, setAnswer] = useState(wordOfTheDay());
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState('');
  const [stats, setStats] = useState(emptyStats);

  const won = guesses.includes(answer);
  const over = won || guesses.length >= MAX_TRIES;

  // Recharge la partie du jour et les stats.
  useEffect(() => {
    initAds();
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      setStats(saved.stats || emptyStats);
      if (saved.day === day) setGuesses(saved.guesses || []);
    });
  }, []);

  function save(nextGuesses, nextStats) {
    if (mode !== 'daily') return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ day, guesses: nextGuesses, stats: nextStats }));
  }

  function submit() {
    if (current.length !== WORD_LENGTH) return Alert.alert('Il faut 5 lettres');
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent('');
    const finished = current === answer || next.length >= MAX_TRIES;
    let nextStats = stats;
    if (finished && mode === 'daily') {
      const win = current === answer;
      const streak = win ? (stats.lastDay === day - 1 ? stats.streak + 1 : 1) : 0;
      nextStats = {
        played: stats.played + 1, wins: stats.wins + (win ? 1 : 0),
        streak, best: Math.max(stats.best, streak), lastDay: day,
      };
      setStats(nextStats);
    }
    save(next, nextStats);
  }

  function press(key) {
    if (over) return;
    if (key === '↵') return submit();
    if (key === '⌫') return setCurrent(current.slice(0, -1));
    if (current.length < WORD_LENGTH) setCurrent(normalize(current + key));
  }

  async function share() {
    const rows = guesses.map((g) => evaluate(g, answer));
    const message = shareText(rows, won, day);
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
  }

  const keys = keyboardStates(guesses, answer);
  const rows = Array.from({ length: MAX_TRIES }, (_, i) => guesses[i] ?? (i === guesses.length ? current : ''));

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.title}>MOT MYSTÈRE</Text>
      <Text style={styles.subtitle}>
        {mode === 'daily' ? `Mot du jour #${day}` : 'Partie bonus'} · 🔥 série {stats.streak}
      </Text>

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

      {over ? (
        <View style={styles.end}>
          <Text style={styles.endText}>{won ? 'Bravo ! 🎉' : `Le mot était ${answer}`}</Text>
          {mode === 'daily' && (
            <Pressable style={[styles.button, styles.share]} onPress={share}>
              <Text style={styles.buttonText}>Partager mon score</Text>
            </Pressable>
          )}
          <Pressable style={styles.button} onPress={playBonus}>
            <Text style={styles.buttonText}>🎬 Rejouer (partie bonus)</Text>
          </Pressable>
          <Text style={styles.stats}>
            {stats.played} parties · {stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}% gagnées · record {stats.best}
          </Text>
        </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121213', alignItems: 'center', paddingTop: 24 },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: 3 },
  subtitle: { color: '#aaa', marginTop: 4, marginBottom: 16 },
  grid: { gap: 6 },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  cell: { width: 58, height: 58, borderWidth: 2, borderColor: '#3a3a3c', alignItems: 'center', justifyContent: 'center' },
  cellTyped: { borderColor: '#777' },
  cellText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  keyboard: { marginTop: 'auto', marginBottom: 24, gap: 8 },
  key: { backgroundColor: '#818384', borderRadius: 4, minWidth: 32, height: 52, alignItems: 'center', justifyContent: 'center' },
  keyWide: { minWidth: 48 },
  keyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  end: { marginTop: 24, alignItems: 'center', gap: 12 },
  endText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  button: { backgroundColor: '#3a3a3c', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, minWidth: 260, alignItems: 'center' },
  share: { backgroundColor: '#3aa757' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stats: { color: '#aaa', marginTop: 8 },
});
