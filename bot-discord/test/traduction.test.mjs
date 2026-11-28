import test from 'node:test';
import assert from 'node:assert/strict';
import { lireLangues, codeLangue, ciblesPour, estBruit, pcmVersWav, dureePcm, messageSousTitre, promptTraduction } from '../src/traduction.js';

test('langues du salon', () => {
  assert.deepEqual(lireLangues('fr, EN ,es'), ['fr', 'en', 'es']);
  assert.deepEqual(lireLangues(), ['fr', 'en']);
  assert.equal(lireLangues('fr'), null);
  assert.equal(lireLangues('fr,xx'), null);
  assert.deepEqual(lireLangues('fr,en,es,it,de'), ['fr', 'en', 'es', 'it']);
});

test('langue détectée par Whisper', () => {
  assert.equal(codeLangue('french'), 'fr');
  assert.equal(codeLangue('English'), 'en');
  assert.equal(codeLangue('es'), 'es');
  assert.equal(codeLangue('klingon'), null);
});

test('vers quelles langues traduire', () => {
  assert.deepEqual(ciblesPour('fr', ['fr', 'en', 'es']), ['en', 'es']);
  assert.deepEqual(ciblesPour(null, ['fr', 'en']), ['fr', 'en']);
  assert.deepEqual(ciblesPour('de', ['fr', 'en']), ['fr', 'en']);
});

test('les phrases inventées par Whisper sur du bruit sont ignorées', () => {
  assert.ok(estBruit('Sous-titres réalisés par la communauté d\'Amara.org'));
  assert.ok(estBruit('Merci.'));
  assert.ok(estBruit(' ... '));
  assert.ok(estBruit('push push', [{ no_speech_prob: 0.9 }]));
  assert.ok(!estBruit('Ennemi derrière toi !', [{ no_speech_prob: 0.05 }]));
});

test('PCM 48 kHz stéréo -> WAV 16 kHz mono', () => {
  const pcm = Buffer.alloc(48000 * 4); // 1 s
  for (let i = 0; i < 48000; i += 1) { pcm.writeInt16LE(1000, i * 4); pcm.writeInt16LE(3000, i * 4 + 2); }
  assert.equal(dureePcm(pcm), 1);
  const wav = pcmVersWav(pcm);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.length, 44 + 16000 * 2);
  assert.equal(wav.readInt16LE(44), 2000); // moyenne des 2 canaux
});

test('sous-titre affiché dans le salon', () => {
  const m = messageSousTitre('Hugo', 'Enemy behind you!', 'en', { fr: 'Ennemi derrière toi !' });
  assert.equal(m, '**Hugo** 🇬🇧 Enemy behind you!\n> 🇫🇷 Ennemi derrière toi !');
  const p = promptTraduction('salut', 'fr', ['en', 'es']);
  assert.match(p[1].content, /"en": "\.\.\.", "es": "\.\.\."/);
});
